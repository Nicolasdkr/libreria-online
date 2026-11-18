/**
 * Tests del modelo del carrito (js/lib/cart.js).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  CART_VERSION,
  createCart,
  addItem,
  setQuantity,
  removeItem,
  getQuantity,
  itemCount,
  maxQuantity,
  reconcile,
  summarize,
  shippingProgress,
  serializeCart,
  parseCart,
} from '../js/lib/cart.js';

const PRODUCTS = new Map(
  [
    { id: 'a', title: 'One Piece Vol. 1', price: 8990, stock: 25 },
    { id: 'b', title: 'Spy x Family Vol. 1', price: 8990, oldPrice: 10990, stock: 8 },
    { id: 'c', title: 'Astérix el galo', price: 11990, stock: 1 },
    { id: 'd', title: 'Berserk', price: 17990, stock: 0 },
  ].map((product) => [product.id, product]),
);

const cartOf = (...items) => ({ items: items.map(([id, qty]) => ({ id, qty })) });

describe('operaciones básicas', () => {
  test('agrega un producto nuevo y suma al existente', () => {
    let { cart } = addItem(createCart(), 'a');
    ({ cart } = addItem(cart, 'a', 2));
    assert.equal(getQuantity(cart, 'a'), 3);
    assert.equal(cart.items.length, 1);
  });

  test('no modifica el carrito original', () => {
    const original = cartOf(['a', 1]);
    addItem(original, 'a');
    setQuantity(original, 'a', 5);
    removeItem(original, 'a');
    assert.deepEqual(original, cartOf(['a', 1]));
  });

  test('respeta el máximo e informa cuánto agregó realmente', () => {
    const result = addItem(cartOf(['c', 0]), 'c', 3, 1);
    assert.equal(result.added, 1);
    assert.equal(result.limited, true);
    assert.equal(addItem(result.cart, 'c', 1, 1).added, 0);
  });

  test('cantidad 0 o negativa quita el producto', () => {
    assert.deepEqual(setQuantity(cartOf(['a', 2]), 'a', 0), createCart());
    assert.deepEqual(setQuantity(cartOf(['a', 2]), 'a', -4), createCart());
  });

  test('las cantidades se redondean hacia abajo', () => {
    assert.equal(getQuantity(setQuantity(createCart(), 'a', 2.9), 'a'), 2);
  });

  test('mantiene el orden en que se agregaron los productos', () => {
    const cart = setQuantity(cartOf(['a', 1], ['b', 1]), 'a', 3);
    assert.deepEqual(cart.items.map((item) => item.id), ['a', 'b']);
  });

  test('cuenta las unidades totales', () => {
    assert.equal(itemCount(cartOf(['a', 2], ['b', 3])), 5);
  });

  test('el máximo es el menor entre stock y límite por producto', () => {
    assert.equal(maxQuantity(PRODUCTS.get('a'), 10), 10);
    assert.equal(maxQuantity(PRODUCTS.get('b'), 10), 8);
    assert.equal(maxQuantity({ id: 'x', price: 1 }, 10), 10); // sin stock definido
  });
});

describe('reconcile (ajuste al catálogo)', () => {
  test('quita productos agotados o inexistentes y recorta al stock', () => {
    const { cart, changes } = reconcile(cartOf(['a', 2], ['c', 4], ['d', 1], ['zzz', 1]), PRODUCTS, 10);
    assert.deepEqual(cart, cartOf(['a', 2], ['c', 1]));
    assert.deepEqual(
      changes.map(({ id, from, to }) => ({ id, from, to })),
      [
        { id: 'c', from: 4, to: 1 },
        { id: 'd', from: 1, to: 0 },
        { id: 'zzz', from: 1, to: 0 },
      ],
    );
  });

  test('sin cambios no informa nada', () => {
    assert.deepEqual(reconcile(cartOf(['a', 1]), PRODUCTS, 10).changes, []);
  });

  test('aplica también el límite por producto', () => {
    assert.equal(getQuantity(reconcile(cartOf(['a', 20]), PRODUCTS, 10).cart, 'a'), 10);
  });
});

describe('summarize', () => {
  test('calcula subtotal, unidades y ahorro con los precios del catálogo', () => {
    const summary = summarize(cartOf(['a', 2], ['b', 1]), PRODUCTS);
    assert.equal(summary.count, 3);
    assert.equal(summary.subtotal, 8990 * 2 + 8990);
    assert.equal(summary.savings, 2000);
    assert.equal(summary.lines[0].lineTotal, 17980);
  });

  test('omite productos que no están en el catálogo', () => {
    const summary = summarize(cartOf(['zzz', 3]), PRODUCTS);
    assert.deepEqual([summary.lines.length, summary.count, summary.subtotal], [0, 0, 0]);
  });
});

describe('shippingProgress', () => {
  test('sin umbral configurado no aplica', () => {
    assert.equal(shippingProgress(5000, null), null);
    assert.equal(shippingProgress(5000, 0), null);
  });

  test('calcula lo que falta y el avance', () => {
    assert.deepEqual(shippingProgress(15000, 30000), { reached: false, remaining: 15000, ratio: 0.5 });
  });

  test('al superar el umbral el avance queda en 100 %', () => {
    assert.deepEqual(shippingProgress(45000, 30000), { reached: true, remaining: 0, ratio: 1 });
  });
});

describe('persistencia', () => {
  test('ida y vuelta conserva el carrito', () => {
    const cart = cartOf(['a', 2], ['b', 1]);
    assert.deepEqual(parseCart(serializeCart(cart)), cart);
  });

  test('guarda la versión del formato', () => {
    assert.equal(serializeCart(createCart()).version, CART_VERSION);
  });

  test('descarta datos ausentes, de otra versión o corruptos', () => {
    assert.deepEqual(parseCart(null), createCart());
    assert.deepEqual(parseCart({ version: 999, items: [{ id: 'a', qty: 1 }] }), createCart());
    assert.deepEqual(parseCart({ version: CART_VERSION, items: 'hola' }), createCart());
  });

  test('ignora líneas inválidas y une ids repetidos', () => {
    const raw = {
      version: CART_VERSION,
      items: [{ id: 'a', qty: 1 }, { id: 'a', qty: 2 }, { id: '', qty: 1 }, { qty: 3 }, { id: 'b', qty: 'x' }, null],
    };
    assert.deepEqual(parseCart(raw), cartOf(['a', 3]));
  });
});
