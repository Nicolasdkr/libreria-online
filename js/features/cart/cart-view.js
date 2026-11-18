/**
 * features/cart/cart-view.js — Vista 1 del panel: líneas, cantidades y totales.
 */
import { CONFIG } from '../../core/config.js';
import { itemCount, shippingProgress } from '../../lib/cart.js';
import { escapeHTML, formatPrice, pluralize } from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { coverMarkup, bindCoverFallbacks } from '../../ui/cover.js';
import { showToast } from '../../ui/toast.js';

/**
 * @param {{ root: HTMLElement, store: object, status: HTMLElement,
 *           onBrowse: () => void, onCheckout: () => void }} options
 */
export function createCartView({ root, store, status, onBrowse, onCheckout }) {
  const els = {
    shipping: root.querySelector('[data-cart-shipping]'),
    items: root.querySelector('[data-cart-items]'),
    footer: root.querySelector('[data-cart-footer]'),
    totals: root.querySelector('[data-cart-totals]'),
  };

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

  const emptyMarkup = () => `
    <div class="cart-empty">
      <span class="cart-empty__icon">${icon('bag', 'lg')}</span>
      <h3>Tu carrito está vacío</h3>
      <p class="text-muted">Explora el catálogo y agrega tus próximas lecturas.</p>
      <button class="btn btn--primary" type="button" data-cart-browse>Explorar catálogo</button>
    </div>`;

  const loadingMarkup = () => `
    <div class="cart-empty" role="status">
      <p class="text-muted">Cargando tu carrito…</p>
    </div>`;

  function shippingMarkup(progress) {
    if (!progress) return '';
    const text = progress.reached
      ? `${icon('check', 'sm')}<span><strong>¡Tienes despacho gratis!</strong></span>`
      : `${icon('truck', 'sm')}<span>Te faltan <strong>${formatPrice(progress.remaining)}</strong> para el despacho gratis</span>`;

    return `
      <div class="shipping${progress.reached ? ' is-reached' : ''}">
        <p class="shipping__text">${text}</p>
        <div class="shipping__bar" role="progressbar" aria-label="Progreso hacia el despacho gratis"
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
      <div class="cart-totals__row cart-totals__row--note">
        <dt>Entrega</dt>
        <dd>Se calcula en el siguiente paso</dd>
      </div>`;
  }

  /* ================================ Foco ================================ */

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

    // La línea se eliminó: foco en la que ocupó su lugar, o en el título del panel
    const lines = els.items.querySelectorAll('[data-line-id]');
    const fallback = lines[Math.min(saved.index, lines.length - 1)];
    (fallback?.querySelector('[data-line-remove]') ?? root.closest('dialog').querySelector('[data-drawer-title]'))?.focus();
  }

  /* ================================ Render ================================ */

  function render({ summary, ready, cart }) {
    if (!itemCount(cart)) {
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

    const shippingEnabled = CONFIG.checkout.delivery.shipping.enabled;
    els.shipping.innerHTML = shippingEnabled
      ? shippingMarkup(shippingProgress(summary.subtotal, CONFIG.commerce.freeShippingThreshold))
      : '';
    els.totals.innerHTML = totalsMarkup(summary);
    els.footer.hidden = false;
  }

  /* ================================ Acciones ================================ */

  function removeWithUndo(id) {
    const title = store.getProduct(id)?.title ?? 'El producto';
    const snapshot = store.remove(id);
    status.textContent = `${title} se quitó del carrito.`;
    showToast({ message: `Quitaste «${title}».`, actionLabel: 'Deshacer', onAction: () => store.restore(snapshot) });
  }

  function announceQuantity(id) {
    const product = store.getProduct(id);
    if (!product) return;
    const qty = store.getQuantity(id);
    const { summary } = store.getState();
    status.textContent = `${product.title}: ${pluralize(qty, 'unidad', 'unidades')}. Subtotal ${formatPrice(summary.subtotal)}.`;
  }

  root.addEventListener('click', (event) => {
    const id = event.target.closest('[data-line-id]')?.dataset.lineId;

    if (event.target.closest('[data-cart-browse]')) {
      onBrowse();
    } else if (event.target.closest('[data-checkout-start]')) {
      onCheckout();
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

  return { render };
}
