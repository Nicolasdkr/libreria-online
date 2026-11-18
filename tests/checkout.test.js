/**
 * Tests de las reglas del checkout (js/lib/checkout.js).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  DELIVERY,
  EMPTY_CHECKOUT,
  normalizeCheckout,
  enabledDeliveries,
  availablePayments,
  validateCheckout,
  deliveryCost,
  createOrderId,
} from '../js/lib/checkout.js';

const DELIVERY_OPTIONS = {
  pickup: { enabled: true, label: 'Retiro en tienda' },
  shipping: { enabled: true, label: 'Despacho a domicilio', cost: 3990 },
};
const PAYMENTS = [
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'efectivo', label: 'Efectivo', pickupOnly: true },
];
const RULES = { deliveryOptions: DELIVERY_OPTIONS, paymentMethods: PAYMENTS, notesMaxLength: 50 };

const valid = (overrides = {}) =>
  normalizeCheckout(
    { ...EMPTY_CHECKOUT, name: 'Ana Pérez', delivery: 'pickup', payment: 'transferencia', ...overrides },
    RULES,
  );

describe('normalizeCheckout', () => {
  test('quita espacios sobrantes en campos de una línea', () => {
    const data = normalizeCheckout({ name: '  Ana    Pérez ', city: ' Ñuñoa\n' });
    assert.equal(data.name, 'Ana Pérez');
    assert.equal(data.city, 'Ñuñoa');
  });

  test('conserva los saltos de línea de la nota y la recorta al máximo', () => {
    const data = normalizeCheckout({ notes: '  Hola\nes para regalo  ' }, { notesMaxLength: 10 });
    assert.equal(data.notes, 'Hola\nes pa');
  });

  test('descarta valores de entrega desconocidos y tipos inválidos', () => {
    const data = normalizeCheckout({ delivery: 'dron', payment: 42, remember: 'sí' });
    assert.deepEqual([data.delivery, data.payment, data.remember], ['', '', false]);
  });

  test('tolera datos ausentes', () => {
    assert.deepEqual(normalizeCheckout(undefined), { ...EMPTY_CHECKOUT });
  });
});

describe('opciones disponibles', () => {
  test('solo devuelve formas de entrega activas', () => {
    assert.deepEqual(enabledDeliveries(DELIVERY_OPTIONS), ['pickup', 'shipping']);
    assert.deepEqual(enabledDeliveries({ ...DELIVERY_OPTIONS, pickup: { enabled: false } }), ['shipping']);
  });

  test('los pagos "solo retiro" no aparecen con despacho', () => {
    assert.deepEqual(availablePayments(PAYMENTS, DELIVERY.PICKUP).map((p) => p.id), ['transferencia', 'efectivo']);
    assert.deepEqual(availablePayments(PAYMENTS, DELIVERY.SHIPPING).map((p) => p.id), ['transferencia']);
  });
});

describe('validateCheckout', () => {
  test('acepta un retiro completo', () => {
    assert.deepEqual(validateCheckout(valid(), RULES), { valid: true, errors: {} });
  });

  test('un formulario vacío informa todos los campos obligatorios', () => {
    const { valid: ok, errors } = validateCheckout(normalizeCheckout({}), RULES);
    assert.equal(ok, false);
    assert.deepEqual(Object.keys(errors).sort(), ['delivery', 'name', 'payment']);
  });

  test('el despacho exige dirección y comuna', () => {
    const { errors } = validateCheckout(valid({ delivery: 'shipping' }), RULES);
    assert.deepEqual(Object.keys(errors).sort(), ['address', 'city']);
  });

  test('detecta una dirección demasiado corta', () => {
    const { errors } = validateCheckout(valid({ delivery: 'shipping', address: 'Av', city: 'Santiago' }), RULES);
    assert.match(errors.address, /incompleta/);
  });

  test('rechaza un pago "solo retiro" combinado con despacho', () => {
    const data = valid({ delivery: 'shipping', address: 'Av. Siempre Viva 742', city: 'Santiago', payment: 'efectivo' });
    assert.deepEqual(Object.keys(validateCheckout(data, RULES).errors), ['payment']);
  });

  test('rechaza una forma de entrega desactivada', () => {
    const rules = { ...RULES, deliveryOptions: { ...DELIVERY_OPTIONS, shipping: { enabled: false } } };
    const data = valid({ delivery: 'shipping', address: 'Av. Siempre Viva 742', city: 'Santiago' });
    assert.ok(validateCheckout(data, rules).errors.delivery);
  });

  test('rechaza un nombre de una sola letra', () => {
    assert.match(validateCheckout(valid({ name: 'A' }), RULES).errors.name, /corto/);
  });
});

describe('deliveryCost', () => {
  const options = { deliveryOptions: DELIVERY_OPTIONS, freeShippingThreshold: 30000 };

  test('el retiro no tiene costo', () => {
    assert.equal(deliveryCost('pickup', 5000, options), 0);
  });

  test('el despacho cobra el costo configurado bajo el umbral', () => {
    assert.equal(deliveryCost('shipping', 29999, options), 3990);
  });

  test('el despacho es gratis desde el umbral', () => {
    assert.equal(deliveryCost('shipping', 30000, options), 0);
  });

  test('sin umbral, el despacho siempre se cobra', () => {
    assert.equal(deliveryCost('shipping', 999999, { ...options, freeShippingThreshold: null }), 3990);
  });
});

describe('createOrderId', () => {
  test('tiene el formato PREFIJO-AAMMDD-XXXX', () => {
    const id = createOrderId('TV', new Date(2026, 10, 18), () => 0);
    assert.equal(id, 'TV-261118-2222');
  });

  test('no usa caracteres ambiguos (0, O, 1, I)', () => {
    let seed = 0;
    const random = () => (seed = (seed + 0.137) % 1);
    for (let i = 0; i < 200; i++) {
      assert.doesNotMatch(createOrderId('X', new Date(), random).split('-')[2], /[01OI]/);
    }
  });
});
