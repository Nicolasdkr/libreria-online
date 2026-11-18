/**
 * Tests del mensaje de pedido para WhatsApp (js/lib/order.js).
 */
import { test, describe } from 'node:test';
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

describe('pedido con datos del checkout', () => {
  const summary = summarize({ items: [{ id: 'a', qty: 1 }] }, products);
  const customer = {
    name: 'Ana Pérez',
    delivery: 'shipping',
    address: 'Av. Siempre Viva 742',
    city: 'Ñuñoa',
    reference: 'Depto. 3B',
    payment: 'transferencia',
    notes: 'Es para regalo',
  };
  const order = {
    id: 'TV-261118-4K7Q',
    customer,
    deliveryLabel: 'Despacho a domicilio',
    paymentLabel: 'Transferencia bancaria',
    deliveryCost: 3990,
  };

  test('incluye número de pedido, desglose y datos de entrega', () => {
    const message = buildOrderMessage(summary, { storeName: 'Tienda', formatPrice, order });
    assert.equal(
      message,
      [
        '¡Hola, Tienda! Quiero hacer este pedido:',
        '*Pedido N.º TV-261118-4K7Q*',
        '',
        '• 1 × Maus (Art Spiegelman) — $24990',
        '',
        'Subtotal: $24990',
        'Despacho a domicilio: $3990',
        '*Total: $28980* (1 producto)',
        '',
        '*Datos del pedido*',
        'Nombre: Ana Pérez',
        'Entrega: Despacho a domicilio',
        'Dirección: Av. Siempre Viva 742, Ñuñoa',
        'Referencia: Depto. 3B',
        'Pago: Transferencia bancaria',
        'Nota: Es para regalo',
        '',
        '¿Me confirman disponibilidad y el total final? ¡Gracias!',
      ].join('\n'),
    );
  });

  test('despacho gratis y retiro sin costo', () => {
    const free = buildOrderMessage(summary, { storeName: 'T', formatPrice, order: { ...order, deliveryCost: 0 } });
    assert.match(free, /Despacho a domicilio: ¡gratis!/);

    const pickup = buildOrderMessage(summary, {
      storeName: 'T',
      formatPrice,
      order: { ...order, deliveryCost: 0, deliveryLabel: 'Retiro en tienda', customer: { ...customer, delivery: 'pickup' } },
    });
    assert.match(pickup, /Retiro en tienda: sin costo/);
    assert.doesNotMatch(pickup, /Dirección/);
  });

  test('omite referencia y nota vacías', () => {
    const message = buildOrderMessage(summary, {
      storeName: 'T',
      formatPrice,
      order: { ...order, customer: { ...customer, reference: '', notes: '' } },
    });
    assert.doesNotMatch(message, /Referencia|Nota/);
  });
});

test('omite el autor cuando no existe', () => {
  const summary = summarize(
    { items: [{ id: 'x', qty: 1 }] },
    new Map([['x', { id: 'x', title: 'Agenda 2027', price: 5000 }]]),
  );
  assert.match(buildOrderMessage(summary, { storeName: 'Tienda', formatPrice }), /• 1 × Agenda 2027 — \$5000/);
});
