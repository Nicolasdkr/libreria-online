/**
 * lib/order.js — Redacción del pedido que se envía por WhatsApp (puro).
 *
 * WhatsApp interpreta *texto* como negrita, así que se usa para destacar el
 * total y los títulos de sección.
 */
import { DELIVERY } from './checkout.js';

/**
 * @param {ReturnType<import('./cart.js').summarize>} summary
 * @param {{
 *   storeName: string,
 *   formatPrice: (n: number) => string,
 *   order?: {
 *     id: string,
 *     customer: ReturnType<import('./checkout.js').normalizeCheckout>,
 *     deliveryLabel: string,
 *     paymentLabel: string,
 *     deliveryCost: number,
 *   },
 * }} options  sin `order` se genera un pedido rápido (solo productos y total)
 * @returns {string}
 */
export function buildOrderMessage(summary, { storeName, formatPrice, order }) {
  const units = summary.count === 1 ? '1 producto' : `${summary.count} productos`;
  const total = summary.subtotal + (order?.deliveryCost ?? 0);

  const products = summary.lines.map((line) => {
    const author = line.product.author ? ` (${line.product.author})` : '';
    return `• ${line.qty} × ${line.product.title}${author} — ${formatPrice(line.lineTotal)}`;
  });

  const totals = order
    ? [
        `Subtotal: ${formatPrice(summary.subtotal)}`,
        `${order.deliveryLabel}: ${deliveryText(order, formatPrice)}`,
        `*Total: ${formatPrice(total)}* (${units})`,
      ]
    : [`*Total: ${formatPrice(total)}* (${units})`];

  if (summary.savings > 0) totals.push(`Ahorro en ofertas: ${formatPrice(summary.savings)}`);

  return [
    `¡Hola, ${storeName}! Quiero hacer este pedido:`,
    ...(order ? [`*Pedido N.º ${order.id}*`] : []),
    '',
    ...products,
    '',
    ...totals,
    ...(order ? ['', ...customerLines(order)] : []),
    '',
    order
      ? '¿Me confirman disponibilidad y el total final? ¡Gracias!'
      : '¿Me confirman disponibilidad y opciones de entrega? ¡Gracias!',
  ].join('\n');
}

function deliveryText(order, formatPrice) {
  if (order.deliveryCost > 0) return formatPrice(order.deliveryCost);
  return order.customer.delivery === DELIVERY.SHIPPING ? '¡gratis!' : 'sin costo';
}

function customerLines({ customer, deliveryLabel, paymentLabel }) {
  const lines = ['*Datos del pedido*', `Nombre: ${customer.name}`, `Entrega: ${deliveryLabel}`];

  if (customer.delivery === DELIVERY.SHIPPING) {
    lines.push(`Dirección: ${customer.address}, ${customer.city}`);
    if (customer.reference) lines.push(`Referencia: ${customer.reference}`);
  }

  lines.push(`Pago: ${paymentLabel}`);
  if (customer.notes) lines.push(`Nota: ${customer.notes}`);
  return lines;
}
