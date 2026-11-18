/**
 * Tests del mensaje de pedido para WhatsApp (js/lib/order.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildOrderMessage } from '../js/lib/order.js';
import { summarize } from '../js/lib/cart.js';

// Formato fijo para que el test no dependa del locale del sistema
const formatPrice = (value) => `$${value}`;

const products = new Map([
  ['a', { id: 'a', title: 'Maus', author: 'Art Spiegelman', price: 24990, stock: 7 }],
  ['b', { id: 'b', title: 'Arrugas', author: 'Paco Roca', price: 18990, oldPrice: 21990, stock: 8 }],
]);

test('incluye saludo, líneas, total y ahorro', () => {
  const summary = summarize({ items: [{ id: 'a', qty: 2 }, { id: 'b', qty: 1 }] }, products);
  const message = buildOrderMessage(summary, { storeName: 'Tinta & Viñeta', formatPrice });

  assert.equal(
    message,
    [
      '¡Hola, Tinta & Viñeta! Quiero hacer este pedido:',
      '',
      '• 2 × Maus (Art Spiegelman) — $49980',
      '• 1 × Arrugas (Paco Roca) — $18990',
      '',
      '*Total: $68970* (3 productos)',
      'Ahorro en ofertas: $3000',
      '',
      '¿Me confirman disponibilidad y opciones de entrega? ¡Gracias!',
    ].join('\n'),
  );
});

test('usa singular con un producto y omite el ahorro si no hay ofertas', () => {
  const summary = summarize({ items: [{ id: 'a', qty: 1 }] }, products);
  const message = buildOrderMessage(summary, { storeName: 'Tienda', formatPrice });

  assert.match(message, /\(1 producto\)/);
  assert.doesNotMatch(message, /Ahorro/);
});

test('omite el autor cuando no existe', () => {
  const summary = summarize(
    { items: [{ id: 'x', qty: 1 }] },
    new Map([['x', { id: 'x', title: 'Agenda 2027', price: 5000 }]]),
  );
  assert.match(buildOrderMessage(summary, { storeName: 'Tienda', formatPrice }), /• 1 × Agenda 2027 — \$5000/);
});
