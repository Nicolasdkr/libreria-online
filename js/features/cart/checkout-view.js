/**
 * features/cart/checkout-view.js — Vistas 2 a 4 del panel:
 *   details (datos de entrega) → review (revisión) → sent (pedido listo).
 *
 * Accesibilidad del formulario:
 * - Validación propia (novalidate) con mensajes en español, cada uno enlazado a su
 *   campo con aria-describedby y marcado con aria-invalid.
 * - Al enviar con errores, el foco va a un resumen con enlaces a cada campo.
 * - Tras el primer intento, los errores se actualizan mientras el cliente corrige.
 *
 * Privacidad: el borrador vive en sessionStorage (se borra al cerrar la pestaña) y
 * los datos solo se guardan en localStorage si el cliente marca "Recordar mis datos".
 * Nada sale del navegador salvo el mensaje que el propio cliente envía por WhatsApp.
 */
import { CONFIG, STORAGE_KEYS } from '../../core/config.js';
import { storage, sessionStore } from '../../core/storage.js';
import {
  DELIVERY,
  EMPTY_CHECKOUT,
  REMEMBERED_FIELDS,
  normalizeCheckout,
  enabledDeliveries,
  availablePayments,
  validateCheckout,
  deliveryCost,
  createOrderId,
} from '../../lib/checkout.js';
import { buildOrderMessage } from '../../lib/order.js';
import { itemCount } from '../../lib/cart.js';
import { escapeHTML, formatPrice, whatsappUrl } from '../../lib/utils.js';

const SETTINGS = CONFIG.checkout;
const RULES = {
  deliveryOptions: SETTINGS.delivery,
  paymentMethods: SETTINGS.paymentMethods,
  notesMaxLength: SETTINGS.notesMaxLength,
};
const FIELD_ORDER = ['name', 'delivery', 'address', 'city', 'payment', 'notes'];

const deliveryLabel = (id) => SETTINGS.delivery[id]?.label ?? '';
const deliveryNote = (id) =>
  id === DELIVERY.PICKUP ? SETTINGS.delivery.pickup.note || CONFIG.contact.address : SETTINGS.delivery.shipping.note;
const paymentLabel = (id) => SETTINGS.paymentMethods.find((method) => method.id === id)?.label ?? '';
const costFor = (delivery, subtotal) =>
  deliveryCost(delivery, subtotal, {
    deliveryOptions: SETTINGS.delivery,
    freeShippingThreshold: CONFIG.commerce.freeShippingThreshold,
  });

/** "$3.990", "Gratis" o "Sin costo", según la forma de entrega. */
function costText(delivery, subtotal) {
  const cost = costFor(delivery, subtotal);
  if (cost > 0) return formatPrice(cost);
  return delivery === DELIVERY.SHIPPING ? 'Gratis' : 'Sin costo';
}

/**
 * @param {{ roots: { details: HTMLElement, review: HTMLElement, sent: HTMLElement },
 *           store: object, goTo: (view: string) => void, onFinish: () => void }} options
 */
export function createCheckoutView({ roots, store, goTo, onFinish }) {
  const form = roots.details.querySelector('[data-checkout-form]');
  const els = {
    errors: form.querySelector('[data-form-errors]'),
    deliveryOptions: form.querySelector('[data-delivery-options]'),
    paymentOptions: form.querySelector('[data-payment-options]'),
    shippingFields: form.querySelector('[data-shipping-fields]'),
    notesCounter: form.querySelector('[data-notes-counter]'),
    preview: form.querySelector('[data-checkout-preview]'),
    reviewBody: roots.review.querySelector('[data-review-body]'),
    send: roots.review.querySelector('[data-checkout-send]'),
    noWhatsapp: roots.review.querySelector('[data-checkout-no-whatsapp]'),
    orderIds: [...roots.review.querySelectorAll('[data-order-id]'), ...roots.sent.querySelectorAll('[data-order-id]')],
    resend: roots.sent.querySelector('[data-checkout-resend]'),
  };

  form.elements.notes.maxLength = SETTINGS.notesMaxLength;

  let data = loadInitialData();
  let submitted = false;
  let orderId = null;

  /* ============================== Datos ============================== */

  /** Borrador de la sesión → datos recordados → vacío. Preselecciona opciones únicas. */
  function loadInitialData() {
    const draft = sessionStore.get(STORAGE_KEYS.checkoutDraft);
    const remembered = storage.get(STORAGE_KEYS.customer);
    const source = draft ?? (remembered ? { ...remembered, remember: true } : {});
    return withDefaults(normalizeCheckout({ ...EMPTY_CHECKOUT, ...source }, RULES));
  }

  function withDefaults(values) {
    const next = { ...values };
    const deliveries = enabledDeliveries(SETTINGS.delivery);
    if (!deliveries.includes(next.delivery)) next.delivery = deliveries.length === 1 ? deliveries[0] : '';

    const payments = availablePayments(SETTINGS.paymentMethods, next.delivery);
    if (!payments.some((method) => method.id === next.payment)) {
      next.payment = payments.length === 1 ? payments[0].id : '';
    }
    return next;
  }

  function readForm() {
    const fields = new FormData(form);
    const text = (name) => String(fields.get(name) ?? '');
    return {
      name: text('name'),
      delivery: text('delivery'),
      address: text('address'),
      city: text('city'),
      reference: text('reference'),
      payment: text('payment'),
      notes: text('notes'),
      remember: form.elements.remember.checked,
    };
  }

  function persist() {
    sessionStore.set(STORAGE_KEYS.checkoutDraft, data);

    if (data.remember) {
      const clean = normalizeCheckout(data, RULES);
      storage.set(STORAGE_KEYS.customer, Object.fromEntries(REMEMBERED_FIELDS.map((key) => [key, clean[key]])));
    } else {
      storage.remove(STORAGE_KEYS.customer);
    }
  }

  /* ============================ Formulario ============================ */

  function renderDeliveryOptions() {
    const { subtotal } = store.getState().summary;
    els.deliveryOptions.innerHTML = enabledDeliveries(SETTINGS.delivery)
      .map(
        (id) => `
        <label class="choice">
          <input type="radio" name="delivery" value="${id}" ${data.delivery === id ? 'checked' : ''}
                 aria-describedby="co-delivery-error" />
          <span class="choice__body">
            <span class="choice__title">${escapeHTML(deliveryLabel(id))}</span>
            <span class="choice__note">${escapeHTML(deliveryNote(id))}</span>
          </span>
          <span class="choice__price" data-delivery-price="${id}">${costText(id, subtotal)}</span>
        </label>`,
      )
      .join('');
  }

  /** Los medios de pago dependen de la entrega (ej. efectivo solo con retiro). */
  function renderPaymentOptions() {
    const methods = availablePayments(SETTINGS.paymentMethods, data.delivery);
    if (!methods.some((method) => method.id === data.payment)) {
      data.payment = methods.length === 1 ? methods[0].id : '';
    }

    els.paymentOptions.innerHTML = methods
      .map(
        (method) => `
        <label class="choice">
          <input type="radio" name="payment" value="${escapeHTML(method.id)}" ${data.payment === method.id ? 'checked' : ''}
                 aria-describedby="co-payment-error" />
          <span class="choice__body">
            <span class="choice__title">${escapeHTML(method.label)}</span>
            ${method.note ? `<span class="choice__note">${escapeHTML(method.note)}</span>` : ''}
          </span>
        </label>`,
      )
      .join('');
  }

  function syncShippingFields() {
    const shipping = data.delivery === DELIVERY.SHIPPING;
    els.shippingFields.hidden = !shipping;
    ['address', 'city'].forEach((name) => form.elements[name].setAttribute('aria-required', String(shipping)));
  }

  function updateNotesCounter() {
    els.notesCounter.textContent = `${data.notes.length}/${SETTINGS.notesMaxLength}`;
  }

  function updatePreview() {
    const { subtotal } = store.getState().summary;
    form.querySelectorAll('[data-delivery-price]').forEach((el) => {
      el.textContent = costText(el.dataset.deliveryPrice, subtotal);
    });

    const cost = data.delivery ? costFor(data.delivery, subtotal) : 0;
    const detail = !data.delivery
      ? 'Elige una forma de entrega'
      : cost > 0
        ? `Incluye ${deliveryLabel(data.delivery).toLowerCase()}: ${formatPrice(cost)}`
        : `${deliveryLabel(data.delivery)}: ${costText(data.delivery, subtotal).toLowerCase()}`;

    els.preview.innerHTML = `
      <span class="checkout-preview__label">Total</span>
      <strong class="checkout-preview__amount">${formatPrice(subtotal + cost)}</strong>
      <span class="checkout-preview__detail">${escapeHTML(detail)}</span>`;
  }

  function fillForm() {
    ['name', 'address', 'city', 'reference', 'notes'].forEach((name) => {
      form.elements[name].value = data[name];
    });
    form.elements.remember.checked = data.remember;
    renderDeliveryOptions();
    renderPaymentOptions();
    syncShippingFields();
    updateNotesCounter();
    updatePreview();
  }

  /* ============================== Errores ============================== */

  function focusField(field) {
    (form.querySelector(`[name="${field}"]:checked`) ?? form.querySelector(`[name="${field}"]`))?.focus();
  }

  function showErrors(errors, { focusSummary = false } = {}) {
    form.querySelectorAll('[data-error-for]').forEach((el) => {
      const message = errors[el.dataset.errorFor];
      el.textContent = message ?? '';
      el.hidden = !message;
    });

    FIELD_ORDER.forEach((field) => {
      form.querySelectorAll(`[name="${field}"]`).forEach((input) => {
        if (errors[field]) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
    });

    const invalid = FIELD_ORDER.filter((field) => errors[field]);
    els.errors.hidden = invalid.length === 0;
    els.errors.innerHTML = invalid.length
      ? `<p class="form-errors__title">${invalid.length === 1 ? 'Revisa este dato' : 'Revisa estos datos'} para continuar:</p>
         <ul>${invalid
           .map((field) => `<li><a href="#" data-error-link="${field}">${escapeHTML(errors[field])}</a></li>`)
           .join('')}</ul>`
      : '';

    if (focusSummary && invalid.length) els.errors.focus();
  }

  const currentErrors = () => validateCheckout(normalizeCheckout(data, RULES), RULES).errors;

  /* ============================== Revisión ============================== */

  function buildOrder(summary) {
    const customer = normalizeCheckout(data, RULES);
    return {
      id: orderId,
      customer,
      deliveryLabel: deliveryLabel(customer.delivery),
      paymentLabel: paymentLabel(customer.payment),
      deliveryCost: costFor(customer.delivery, summary.subtotal),
    };
  }

  function renderReview({ summary }) {
    const order = buildOrder(summary);
    const { customer } = order;
    const shipping = customer.delivery === DELIVERY.SHIPPING;
    const where = shipping
      ? [customer.address, customer.city].join(', ') + (customer.reference ? ` · ${customer.reference}` : '')
      : deliveryNote(DELIVERY.PICKUP);

    els.reviewBody.innerHTML = `
      <section class="review-block" aria-labelledby="review-products">
        <div class="review-block__head">
          <h3 id="review-products">Productos</h3>
          <button class="link-btn" type="button" data-checkout-edit="cart">Editar</button>
        </div>
        <ul class="review-lines" role="list">
          ${summary.lines
            .map((line) => `<li><span>${line.qty} × ${escapeHTML(line.product.title)}</span><span>${formatPrice(line.lineTotal)}</span></li>`)
            .join('')}
        </ul>
      </section>

      <section class="review-block" aria-labelledby="review-delivery">
        <div class="review-block__head">
          <h3 id="review-delivery">Entrega</h3>
          <button class="link-btn" type="button" data-checkout-edit="details">Editar</button>
        </div>
        <p><strong>${escapeHTML(customer.name)}</strong></p>
        <p>${escapeHTML(order.deliveryLabel)}</p>
        ${where ? `<p class="text-muted">${escapeHTML(where)}</p>` : ''}
      </section>

      <section class="review-block" aria-labelledby="review-payment">
        <div class="review-block__head">
          <h3 id="review-payment">Pago</h3>
          <button class="link-btn" type="button" data-checkout-edit="details">Editar</button>
        </div>
        <p>${escapeHTML(order.paymentLabel)}</p>
        ${customer.notes ? `<p class="review-note">${escapeHTML(customer.notes)}</p>` : ''}
      </section>

      <dl class="cart-totals">
        <div class="cart-totals__row"><dt>Subtotal</dt><dd>${formatPrice(summary.subtotal)}</dd></div>
        <div class="cart-totals__row"><dt>${escapeHTML(order.deliveryLabel)}</dt><dd>${costText(customer.delivery, summary.subtotal)}</dd></div>
        ${summary.savings > 0 ? `<div class="cart-totals__row cart-totals__row--savings"><dt>Ahorras en ofertas</dt><dd>-${formatPrice(summary.savings)}</dd></div>` : ''}
        <div class="cart-totals__row cart-totals__row--total"><dt>Total</dt><dd>${formatPrice(summary.subtotal + order.deliveryCost)}</dd></div>
      </dl>`;

    els.orderIds.forEach((el) => (el.textContent = orderId));

    const hasWhatsapp = Boolean(CONFIG.contact.whatsapp);
    els.send.hidden = !hasWhatsapp;
    els.noWhatsapp.hidden = hasWhatsapp;
    if (hasWhatsapp) {
      const message = buildOrderMessage(summary, { storeName: CONFIG.brand.name, formatPrice, order });
      els.send.href = whatsappUrl(CONFIG.contact.whatsapp, message);
      els.resend.href = els.send.href;
    }
  }

  /* ============================== Eventos ============================== */

  function onFieldChange(event) {
    const { type, name } = event.target;
    // Radios y casillas se procesan en "change"; los campos de texto, en "input"
    if (event.type === 'input' && (type === 'radio' || type === 'checkbox')) return;

    data = readForm();

    if (name === 'delivery') {
      renderPaymentOptions();
      syncShippingFields();
    }
    if (name === 'notes') updateNotesCounter();
    if (name === 'delivery' || name === 'payment') updatePreview();

    persist();
    if (submitted) showErrors(currentErrors());
  }

  form.addEventListener('input', onFieldChange);
  form.addEventListener('change', onFieldChange);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted = true;
    data = readForm();

    const clean = normalizeCheckout(data, RULES);
    const { valid, errors } = validateCheckout(clean, RULES);
    showErrors(errors, { focusSummary: true });
    if (!valid) return;

    data = clean;
    persist();
    orderId ??= createOrderId(SETTINGS.orderPrefix);
    goTo('review');
  });

  els.errors.addEventListener('click', (event) => {
    const link = event.target.closest('[data-error-link]');
    if (!link) return;
    event.preventDefault();
    focusField(link.dataset.errorLink);
  });

  roots.review.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-checkout-edit]');
    if (edit) {
      goTo(edit.dataset.checkoutEdit);
      if (edit.dataset.checkoutEdit === 'details') fillForm();
      return;
    }

    // El enlace abre WhatsApp en otra pestaña; aquí mostramos la confirmación
    if (event.target.closest('[data-checkout-send]')) setTimeout(() => goTo('sent'), 0);
  });

  roots.sent.addEventListener('click', (event) => {
    if (event.target.closest('[data-checkout-finish]')) {
      // Pedido enviado: carrito vacío, nota y borrador borrados (los datos recordados se mantienen)
      store.clear();
      sessionStore.remove(STORAGE_KEYS.checkoutDraft);
      data = withDefaults({ ...data, notes: '' });
      orderId = null;
      submitted = false;
      onFinish();
    } else if (event.target.closest('[data-checkout-back-to-cart]')) {
      goTo('cart');
    }
  });

  /* =============================== API =============================== */

  return {
    /** Abre el paso de datos de entrega con el borrador o los datos recordados. */
    start() {
      if (!itemCount(store.getState().cart)) return;
      submitted = false;
      showErrors({});
      fillForm();
      goTo('details');
    },

    /** Se llama en cada cambio del carrito mientras el panel está en una vista del checkout. */
    render(state, view) {
      if (view === 'sent') return;
      if (!itemCount(state.cart)) {
        goTo('cart'); // el carrito se vació (otra pestaña, deshacer, stock): volvemos al inicio
        return;
      }
      if (view === 'details') updatePreview();
      if (view === 'review') renderReview(state);
    },
  };
}
