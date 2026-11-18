/**
 * lib/order.js — Redacción del pedido que se envía por WhatsApp (puro).
 *
 * WhatsApp interpreta *texto* como negrita, así que el total se resalta así.
 */

/**
 * @param {ReturnType<import('./cart.js').summarize>} summary
 * @param {{ storeName: string, formatPrice: (n: number) => string }} options
 * @returns {string}
 */
export function buildOrderMessage(summary, { storeName, formatPrice }) {
  const units = summary.count === 1 ? '1 producto' : `${summary.count} productos`;

  const lines = summary.lines.map((line) => {
    const author = line.product.author ? ` (${line.product.author})` : '';
    return `• ${line.qty} × ${line.product.title}${author} — ${formatPrice(line.lineTotal)}`;
  });

  return [
    `¡Hola, ${storeName}! Quiero hacer este pedido:`,
    '',
    ...lines,
    '',
    `*Total: ${formatPrice(summary.subtotal)}* (${units})`,
    ...(summary.savings > 0 ? [`Ahorro en ofertas: ${formatPrice(summary.savings)}`] : []),
    '',
    '¿Me confirman disponibilidad y opciones de entrega? ¡Gracias!',
  ].join('\n');
}
