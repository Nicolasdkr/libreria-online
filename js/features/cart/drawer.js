/**
 * features/cart/drawer.js — Panel lateral y navegación entre sus vistas.
 *
 * Vistas: cart (carrito) → details (datos de entrega) → review (revisión) → sent (listo).
 * Usa <dialog> modal: atrapa el foco, cierra con Esc y deja el resto de la página
 * inerte de forma nativa. Al cambiar de vista, el foco va al título para que los
 * lectores de pantalla anuncien el nuevo paso.
 */
const VIEWS = {
  cart: { title: 'Tu carrito', step: 1 },
  details: { title: 'Datos de entrega', step: 2 },
  review: { title: 'Revisa tu pedido', step: 3 },
  sent: { title: '¡Pedido listo!', step: null },
};

const TOTAL_STEPS = 3;

/**
 * @param {HTMLDialogElement} dialog
 * @param {{ onBack: (view: string) => void, onOpen?: () => void }} handlers
 */
export function createDrawer(dialog, { onBack, onOpen }) {
  const els = {
    title: dialog.querySelector('[data-drawer-title]'),
    titleText: dialog.querySelector('[data-drawer-title-text]'),
    count: dialog.querySelector('[data-drawer-count]'),
    step: dialog.querySelector('[data-drawer-step]'),
    back: dialog.querySelector('[data-drawer-back]'),
    views: Object.fromEntries([...dialog.querySelectorAll('[data-view]')].map((el) => [el.dataset.view, el])),
  };

  let current = 'cart';

  function show(view, { focus = true } = {}) {
    current = view;
    Object.entries(els.views).forEach(([name, el]) => (el.hidden = name !== view));

    const { title, step } = VIEWS[view];
    els.titleText.textContent = title;
    els.count.hidden = view !== 'cart';
    els.step.hidden = !step;
    els.step.textContent = step ? `Paso ${step} de ${TOTAL_STEPS}` : '';
    els.back.hidden = view === 'cart' || view === 'sent';
    dialog.dataset.view = view;

    if (focus && dialog.open) els.title.focus();
  }

  function open() {
    if (dialog.open) return;
    show('cart', { focus: false });
    onOpen?.();
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

  dialog.querySelector('[data-cart-close]').addEventListener('click', close);
  els.back.addEventListener('click', () => onBack(current));

  // Esc: cerramos con animación en lugar del cierre instantáneo nativo
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  // Clic en el fondo oscuro (fuera del panel)
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  return {
    dialog,
    open,
    close,
    show,
    get view() {
      return current;
    },
    get isOpen() {
      return dialog.open;
    },
    setCount(text) {
      els.count.textContent = text;
    },
  };
}
