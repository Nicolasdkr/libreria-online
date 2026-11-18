/**
 * features/cart.js — Interfaz del carrito.
 *
 *  - Botón del header con contador.
 *  - Panel lateral (<dialog> modal: atrapa el foco, cierra con Esc y deja el
 *    resto de la página inerte de forma nativa).
 *  - Botones "Agregar" de las tarjetas: cantidad en el carrito y tope de stock.
 *  - Pedido rápido por WhatsApp con el detalle redactado.
 *
 * El estado vive en core/cart-store.js; este módulo solo dibuja y traduce
 * interacciones en llamadas al store.
 */
import { CONFIG } from '../core/config.js';
import { itemCount, shippingProgress } from '../lib/cart.js';
import { buildOrderMessage } from '../lib/order.js';
import { escapeHTML, formatPrice, pluralize, whatsappUrl } from '../lib/utils.js';
import { icon } from '../ui/icons.js';
import { coverMarkup, bindCoverFallbacks } from '../ui/cover.js';
import { showToast, ensureToastRegion } from '../ui/toast.js';

const ADDED_FEEDBACK_MS = 1400;

/**
 * @param {{ store: ReturnType<import('../core/cart-store.js').createCartStore>,
 *           onBrowse: () => void }} options
 */
export function createCartUI({ store, onBrowse }) {
  const dialog = document.querySelector('[data-cart-drawer]');
  const els = {
    openButtons: document.querySelectorAll('[data-cart-open]'),
    count: document.querySelector('[data-cart-count]'),
    drawerCount: dialog.querySelector('[data-cart-drawer-count]'),
    shipping: dialog.querySelector('[data-cart-shipping]'),
    items: dialog.querySelector('[data-cart-items]'),
    footer: dialog.querySelector('[data-cart-footer]'),
    totals: dialog.querySelector('[data-cart-totals]'),
    checkout: dialog.querySelector('[data-cart-checkout]'),
    status: dialog.querySelector('[data-cart-status]'),
  };

  let lastCount = itemCount(store.getState().cart);
  ensureToastRegion(dialog);

  /* =============================== Drawer =============================== */

  function open() {
    if (dialog.open) return;
    renderDrawer(store.getState()); // se dibuja antes de abrir para no mostrar un panel vacío
    dialog.showModal();
  }

  function close() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    dialog.classList.add('is-closing');

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.classList.remove('is-closing');
      dialog.close(); // el navegador devuelve el foco al botón que abrió el panel
    };
    dialog.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 300); // respaldo si la animación no corre
  }

  /* ============================== Plantillas ============================== */

  function lineMarkup(line, max) {
    const { product, qty } = line;
    const title = escapeHTML(product.title);
    const atMax = qty >= max;
    const decrement = qty === 1
      ? `<button class="qty__btn" type="button" data-qty-dec aria-label="Quitar ${title} del carrito">${icon('trash', 'sm')}</button>`
      : `<button class="qty__btn" type="button" data-qty-dec aria-label="Quitar una unidad de ${title}">${icon('minus', 'sm')}</button>`;

    return `
      <li class="cart-line" data-line-id="${escapeHTML(line.id)}">
        <div class="cart-line__cover">${coverMarkup(product, { compact: true })}</div>
        <div class="cart-line__info">
          <p class="cart-line__title">${title}</p>
          <p class="cart-line__meta">${escapeHTML(product.author)}</p>
          <p class="cart-line__unit">${formatPrice(line.unitPrice)} c/u</p>
          <div class="qty" role="group" aria-label="Cantidad de ${title}">
            ${decrement}
            <span class="qty__value">${qty}</span>
            <button class="qty__btn" type="button" data-qty-inc aria-label="Agregar una unidad de ${title}" ${atMax ? 'disabled' : ''}>
              ${icon('plus', 'sm')}
            </button>
          </div>
          ${atMax ? '<p class="cart-line__limit">Máximo disponible</p>' : ''}
        </div>
        <div class="cart-line__side">
          <p class="cart-line__total">${formatPrice(line.lineTotal)}</p>
          ${line.lineSavings > 0 ? `<p class="cart-line__savings">-${formatPrice(line.lineSavings)}</p>` : ''}
          <button class="link-btn" type="button" data-line-remove>Quitar</button>
        </div>
      </li>`;
  }

  function emptyMarkup() {
    return `
      <div class="cart-empty">
        <span class="cart-empty__icon">${icon('bag', 'lg')}</span>
        <h3>Tu carrito está vacío</h3>
        <p class="text-muted">Explora el catálogo y agrega tus próximas lecturas.</p>
        <button class="btn btn--primary" type="button" data-cart-browse>Explorar catálogo</button>
      </div>`;
  }

  function loadingMarkup() {
    return `
      <div class="cart-empty" role="status">
        <p class="text-muted">Cargando tu carrito…</p>
      </div>`;
  }

  function shippingMarkup(progress) {
    if (!progress) return '';
    const text = progress.reached
      ? `${icon('check', 'sm')}<span><strong>¡Tienes envío gratis!</strong></span>`
      : `${icon('truck', 'sm')}<span>Te faltan <strong>${formatPrice(progress.remaining)}</strong> para el envío gratis</span>`;

    return `
      <div class="shipping${progress.reached ? ' is-reached' : ''}">
        <p class="shipping__text">${text}</p>
        <div class="shipping__bar" role="progressbar" aria-label="Progreso hacia el envío gratis"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.ratio * 100)}">
          <span class="shipping__fill" style="--progress: ${progress.ratio}"></span>
        </div>
      </div>`;
  }

  function totalsMarkup(summary) {
    return `
      <div class="cart-totals__row">
        <dt>Subtotal (${pluralize(summary.count, 'producto', 'productos')})</dt>
        <dd>${formatPrice(summary.subtotal)}</dd>
      </div>
      ${summary.savings > 0 ? `
      <div class="cart-totals__row cart-totals__row--savings">
        <dt>Ahorras en ofertas</dt>
        <dd>-${formatPrice(summary.savings)}</dd>
      </div>` : ''}
      <div class="cart-totals__row cart-totals__row--total">
        <dt>Total</dt>
        <dd>${formatPrice(summary.subtotal)}</dd>
      </div>`;
  }

  /* ================================ Render ================================ */

  /** Recuerda qué control tenía el foco para devolverlo tras volver a dibujar. */
  function captureFocus() {
    const active = document.activeElement;
    const line = active?.closest?.('[data-line-id]');
    if (!line || !els.items.contains(line)) return null;

    const control = ['data-qty-inc', 'data-qty-dec', 'data-line-remove'].find((attr) => active.hasAttribute(attr));
    const lines = [...els.items.querySelectorAll('[data-line-id]')];
    return { id: line.dataset.lineId, control, index: lines.indexOf(line) };
  }

  function restoreFocus(saved) {
    if (!saved) return;
    const line = els.items.querySelector(`[data-line-id="${CSS.escape(saved.id)}"]`);

    if (line) {
      // Si el control quedó deshabilitado (ej. "+" al llegar al máximo), usamos otro de la misma línea
      const target = [`[${saved.control}]`, '[data-qty-dec]', '[data-line-remove]']
        .map((selector) => line.querySelector(selector))
        .find((el) => el && !el.disabled);
      target?.focus();
      return;
    }

    // La línea se eliminó: foco en la línea que ocupó su lugar, o en el botón de cerrar
    const lines = els.items.querySelectorAll('[data-line-id]');
    const fallback = lines[Math.min(saved.index, lines.length - 1)];
    (fallback?.querySelector('[data-line-remove]') ?? dialog.querySelector('[data-cart-close]'))?.focus();
  }

  function renderDrawer({ summary, ready, cart }) {
    const units = itemCount(cart);
    els.drawerCount.textContent = units ? `(${units})` : '';

    if (!units) {
      els.items.innerHTML = emptyMarkup();
      els.shipping.innerHTML = '';
      els.footer.hidden = true;
      return;
    }

    if (!ready) {
      els.items.innerHTML = loadingMarkup();
      els.footer.hidden = true;
      return;
    }

    const saved = captureFocus();
    els.items.innerHTML = `<ul class="cart-lines" role="list">${summary.lines
      .map((line) => lineMarkup(line, store.maxFor(line.id)))
      .join('')}</ul>`;
    bindCoverFallbacks(els.items);
    restoreFocus(saved);

    els.shipping.innerHTML = shippingMarkup(
      shippingProgress(summary.subtotal, CONFIG.commerce.freeShippingThreshold),
    );
    els.totals.innerHTML = totalsMarkup(summary);
    els.footer.hidden = false;

    if (CONFIG.contact.whatsapp) {
      const message = buildOrderMessage(summary, { storeName: CONFIG.brand.name, formatPrice });
      els.checkout.href = whatsappUrl(CONFIG.contact.whatsapp, message);
      els.checkout.hidden = false;
    } else {
      els.checkout.hidden = true;
    }
  }

  function renderBadge(cart) {
    const units = itemCount(cart);
    els.count.textContent = units > 99 ? '99+' : String(units);
    els.count.hidden = units === 0;

    const label = units ? `Abrir carrito (${pluralize(units, 'producto', 'productos')})` : 'Abrir carrito (vacío)';
    els.openButtons.forEach((button) => button.setAttribute('aria-label', label));

    // Pequeño rebote cuando aumenta la cantidad
    if (units > lastCount) {
      els.count.classList.remove('is-bumping');
      void els.count.offsetWidth; // reinicia la animación
      els.count.classList.add('is-bumping');
    }
    lastCount = units;
  }

  /** Refleja en cada botón "Agregar" cuántas unidades hay en el carrito y si se llegó al tope. */
  function syncAddButtons(root = document) {
    root.querySelectorAll('[data-add-to-cart]').forEach((button) => {
      if (button.hasAttribute('data-sold-out') || button.classList.contains('is-added')) return;

      const id = button.dataset.addToCart;
      const qty = store.getQuantity(id);
      const atMax = qty > 0 && qty >= store.maxFor(id);
      const title = button.dataset.title;

      button.classList.toggle('is-in-cart', qty > 0);
      button.dataset.qty = qty > 99 ? '99+' : String(qty);
      button.disabled = atMax;
      button.querySelector('.add-btn__label').textContent = atMax ? 'Máximo' : 'Agregar';
      button.setAttribute(
        'aria-label',
        atMax
          ? `${title}: ya tienes el máximo disponible en el carrito`
          : `Agregar ${title} al carrito${qty ? ` (tienes ${qty})` : ''}`,
      );
    });
  }

  function render(state) {
    renderBadge(state.cart);
    syncAddButtons();
    if (dialog.open) renderDrawer(state);
  }

  /* ================================ Acciones ================================ */

  function addFromButton(button) {
    const id = button.dataset.addToCart;
    const title = store.getProduct(id)?.title ?? button.dataset.title;
    const { added, limited } = store.add(id);

    if (!added) {
      showToast({ message: `Ya tienes todas las unidades disponibles de «${title}».`, variant: 'warning' });
      return;
    }

    // Confirmación visual en el propio botón
    button.classList.add('is-added');
    button.querySelector('.add-btn__label').textContent = '¡Agregado!';
    setTimeout(() => {
      button.classList.remove('is-added');
      syncAddButtons(button.parentElement);
    }, ADDED_FEEDBACK_MS);

    showToast({
      message: limited
        ? `Agregaste la última unidad disponible de «${title}».`
        : `«${title}» se agregó al carrito.`,
      variant: 'success',
      actionLabel: 'Ver carrito',
      onAction: open,
    });
  }

  function removeWithUndo(id) {
    const title = store.getProduct(id)?.title ?? 'El producto';
    const snapshot = store.remove(id);
    els.status.textContent = `${title} se quitó del carrito.`;
    showToast({
      message: `Quitaste «${title}».`,
      actionLabel: 'Deshacer',
      onAction: () => store.restore(snapshot),
    });
  }

  function announceQuantity(id) {
    const product = store.getProduct(id);
    const qty = store.getQuantity(id);
    const { summary } = store.getState();
    if (product) {
      els.status.textContent = `${product.title}: ${pluralize(qty, 'unidad', 'unidades')}. Total ${formatPrice(summary.subtotal)}.`;
    }
  }

  /* ================================= Eventos ================================= */

  els.openButtons.forEach((button) => button.addEventListener('click', open));
  dialog.querySelector('[data-cart-close]').addEventListener('click', close);

  // Esc: cerramos con animación en lugar del cierre instantáneo nativo
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  // Clic en el fondo oscuro (fuera del panel)
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener('click', (event) => {
    const line = event.target.closest('[data-line-id]');
    const id = line?.dataset.lineId;

    if (event.target.closest('[data-cart-browse]')) {
      close();
      onBrowse();
    } else if (event.target.closest('[data-cart-clear]')) {
      const snapshot = store.clear();
      showToast({ message: 'Vaciaste el carrito.', actionLabel: 'Deshacer', onAction: () => store.restore(snapshot) });
    } else if (id && event.target.closest('[data-qty-inc]')) {
      store.setQuantity(id, store.getQuantity(id) + 1);
      announceQuantity(id);
    } else if (id && event.target.closest('[data-qty-dec]')) {
      const qty = store.getQuantity(id);
      if (qty <= 1) removeWithUndo(id);
      else {
        store.setQuantity(id, qty - 1);
        announceQuantity(id);
      }
    } else if (id && event.target.closest('[data-line-remove]')) {
      removeWithUndo(id);
    }
  });

  // Delegación: funciona con tarjetas creadas en cualquier momento (filtros, novedades)
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-to-cart]');
    if (button && !button.disabled) addFromButton(button);
  });

  store.subscribe(render);
  render(store.getState());

  return { open, close, syncAddButtons };
}
