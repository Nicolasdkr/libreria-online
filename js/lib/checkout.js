/**
 * lib/checkout.js — Reglas del checkout (puras, sin DOM): normalización,
 * validación, costo de despacho y número de pedido.
 */

export const DELIVERY = Object.freeze({ PICKUP: 'pickup', SHIPPING: 'shipping' });

/** Campos del formulario y su largo máximo. */
export const FIELD_LIMITS = Object.freeze({
  name: 80,
  address: 120,
  city: 60,
  reference: 120,
});

export const EMPTY_CHECKOUT = Object.freeze({
  name: '',
  delivery: '',
  address: '',
  city: '',
  reference: '',
  payment: '',
  notes: '',
  remember: false,
});

/** Campos que se guardan con "Recordar mis datos" (la nota es propia de cada pedido). */
export const REMEMBERED_FIELDS = Object.freeze(['name', 'delivery', 'address', 'city', 'reference', 'payment']);

const singleLine = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Limpia espacios y recorta largos. Acepta datos parciales o de origen no confiable. */
export function normalizeCheckout(raw = {}, { notesMaxLength = 300 } = {}) {
  return {
    name: singleLine(raw.name, FIELD_LIMITS.name),
    delivery: Object.values(DELIVERY).includes(raw.delivery) ? raw.delivery : '',
    address: singleLine(raw.address, FIELD_LIMITS.address),
    city: singleLine(raw.city, FIELD_LIMITS.city),
    reference: singleLine(raw.reference, FIELD_LIMITS.reference),
    payment: typeof raw.payment === 'string' ? raw.payment : '',
    // La nota conserva saltos de línea, pero sin espacios sobrantes al inicio o final
    notes: String(raw.notes ?? '').trim().slice(0, notesMaxLength),
    remember: raw.remember === true,
  };
}

/** Formas de entrega activas, en el orden de la configuración. */
export function enabledDeliveries(deliveryOptions) {
  return Object.values(DELIVERY).filter((id) => deliveryOptions[id]?.enabled);
}

/** Medios de pago disponibles para la forma de entrega elegida. */
export function availablePayments(paymentMethods, delivery) {
  return paymentMethods.filter((method) => !method.pickupOnly || delivery === DELIVERY.PICKUP);
}

/**
 * Valida los datos del checkout.
 * @returns {{ valid: boolean, errors: Record<string, string> }}  un mensaje por campo inválido
 */
export function validateCheckout(data, { deliveryOptions, paymentMethods, notesMaxLength = 300 }) {
  const errors = {};

  if (!data.name) errors.name = 'Ingresa tu nombre.';
  else if (data.name.length < 2) errors.name = 'El nombre es muy corto.';

  if (!enabledDeliveries(deliveryOptions).includes(data.delivery)) {
    errors.delivery = 'Elige cómo quieres recibir tu pedido.';
  }

  if (data.delivery === DELIVERY.SHIPPING) {
    if (!data.address) errors.address = 'Ingresa la dirección de despacho.';
    else if (data.address.length < 5) errors.address = 'Revisa la dirección: parece incompleta.';
    if (!data.city) errors.city = 'Ingresa tu comuna o ciudad.';
  }

  if (!availablePayments(paymentMethods, data.delivery).some((method) => method.id === data.payment)) {
    errors.payment = 'Elige un medio de pago.';
  }

  if (data.notes.length > notesMaxLength) {
    errors.notes = `La nota no puede superar los ${notesMaxLength} caracteres.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Costo de entrega: retiro sin costo; despacho gratis desde el umbral configurado. */
export function deliveryCost(delivery, subtotal, { deliveryOptions, freeShippingThreshold }) {
  if (delivery !== DELIVERY.SHIPPING) return 0;
  if (freeShippingThreshold && subtotal >= freeShippingThreshold) return 0;
  return Math.max(0, Number(deliveryOptions.shipping?.cost) || 0);
}

const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin 0/O ni 1/I para dictarlo sin errores

/**
 * Número de pedido legible, ej. "TV-261118-4K7Q" (prefijo · AAMMDD · 4 caracteres).
 * `date` y `random` se inyectan para poder testearlo.
 */
export function createOrderId(prefix = 'PED', date = new Date(), random = Math.random) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${pad(date.getFullYear() % 100)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const suffix = Array.from({ length: 4 }, () => ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)]).join('');
  return `${prefix}-${stamp}-${suffix}`;
}
