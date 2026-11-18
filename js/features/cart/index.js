/**
 * features/cart/index.js — Punto de entrada de la feature del carrito.
 *
 * Compone las piezas de la carpeta y conecta todo con el store:
 *  - drawer.js         panel lateral y navegación entre vistas
 *  - cart-view.js      vista 1: líneas, cantidades, totales
 *  - checkout-view.js  vistas 2–4: datos de entrega, revisión, pedido listo
 *  - este archivo      contador del header y botones "Agregar" de las tarjetas
 *
 * El estado vive en core/cart-store.js; esta feature solo dibuja y traduce
 * interacciones en llamadas al store.
 */
import { itemCount } from '../../lib/cart.js';
import { pluralize } from '../../lib/utils.js';
import { showToast, ensureToastRegion } from '../../ui/toast.js';
import { createDrawer } from './drawer.js';
import { createCartView } from './cart-view.js';
import { createCheckoutView } from './checkout-view.js';

const ADDED_FEEDBACK_MS = 1400;
const BACK_TO = { details: 'cart', review: 'details' };

/**
 * @param {{ store: ReturnType<import('../../core/cart-store.js').createCartStore>,
 *           onBrowse: () => void }} options
 */
export function createCartUI({ store, onBrowse }) {
  const dialog = document.querySelector('[data-cart-drawer]');
  const view = (name) => dialog.querySelector(`[data-view="${name}"]`);
  const els = {
    openButtons: document.querySelectorAll('[data-cart-open]'),
    count: document.querySelector('[data-cart-count]'),
    status: dialog.querySelector('[data-cart-status]'),
  };

  let lastCount = itemCount(store.getState().cart);
  ensureToastRegion(dialog);

  /* ============================ Composición ============================ */

  const drawer = createDrawer(dialog, {
    onBack: (current) => goTo(BACK_TO[current] ?? 'cart'),
    onOpen: () => renderDrawer(store.getState()),
  });

  const cartView = createCartView({
    root: view('cart'),
    store,
    status: els.status,
    onBrowse: () => {
      drawer.close();
      onBrowse();
    },
    onCheckout: () => checkout.start(),
  });

  const checkout = createCheckoutView({
    roots: { details: view('details'), review: view('review'), sent: view('sent') },
    store,
    goTo,
    onFinish: () => {
      drawer.close();
      showToast({ message: '¡Gracias por tu pedido! Te responderemos por WhatsApp.', variant: 'success' });
    },
  });

  function goTo(name) {
    drawer.show(name);
    renderDrawer(store.getState());
  }

  function renderDrawer(state) {
    const units = itemCount(state.cart);
    drawer.setCount(units ? `(${units})` : '');
    if (drawer.view === 'cart') cartView.render(state);
    else checkout.render(state, drawer.view);
  }

  /* ========================= Contador del header ========================= */

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

  /* ======================== Botones "Agregar" ======================== */

  /** Refleja en cada botón cuántas unidades hay en el carrito y si se llegó al tope. */
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
      onAction: drawer.open,
    });
  }

  /* ============================== Eventos ============================== */

  els.openButtons.forEach((button) => button.addEventListener('click', drawer.open));

  // Delegación: funciona con tarjetas creadas en cualquier momento (filtros, novedades)
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-to-cart]');
    if (button && !button.disabled) addFromButton(button);
  });

  store.subscribe((state) => {
    renderBadge(state.cart);
    syncAddButtons();
    if (drawer.isOpen) renderDrawer(state);
  });

  renderBadge(store.getState().cart);

  return { open: drawer.open, close: drawer.close, syncAddButtons };
}
