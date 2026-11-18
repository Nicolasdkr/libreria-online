/**
 * lib/cart.js — Modelo del carrito (puro, inmutable, sin DOM ni almacenamiento).
 *
 * Un carrito es { items: [{ id, qty }] }. Solo guarda ids y cantidades: los
 * precios, títulos y stock siempre se leen del catálogo vigente, así un carrito
 * guardado hace días nunca muestra un precio desactualizado.
 *
 * Todas las funciones devuelven un carrito NUEVO; nunca modifican el recibido.
 */

export const CART_VERSION = 1;
const MAX_LINES = 100; // protección ante datos corruptos o manipulados en el almacenamiento

export const createCart = () => ({ items: [] });

const toQuantity = (value) => Math.max(0, Math.floor(Number(value) || 0));

/** Unidades máximas de un producto: su stock, sin superar el límite por producto. */
export function maxQuantity(product, maxPerItem = Infinity) {
  if (!product) return maxPerItem;
  const stock = Number.isFinite(product.stock) ? Math.max(0, product.stock) : Infinity;
  return Math.min(stock, maxPerItem);
}

export const getQuantity = (cart, id) => cart.items.find((item) => item.id === id)?.qty ?? 0;

export const itemCount = (cart) => cart.items.reduce((total, item) => total + item.qty, 0);

/** Fija la cantidad de un producto (0 lo quita). Respeta `max`. */
export function setQuantity(cart, id, qty, max = Infinity) {
  const next = Math.min(toQuantity(qty), max);
  const exists = cart.items.some((item) => item.id === id);

  if (next <= 0) return { items: cart.items.filter((item) => item.id !== id) };
  if (exists) return { items: cart.items.map((item) => (item.id === id ? { ...item, qty: next } : item)) };
  return { items: [...cart.items, { id, qty: next }] };
}

/**
 * Suma unidades de un producto.
 * @returns {{ cart: object, added: number, limited: boolean }}
 *   `added`: unidades realmente agregadas · `limited`: se topó con el máximo
 */
export function addItem(cart, id, amount = 1, max = Infinity) {
  const requested = toQuantity(amount);
  const current = getQuantity(cart, id);
  const next = setQuantity(cart, id, current + requested, max);
  const added = getQuantity(next, id) - current;
  return { cart: next, added, limited: added < requested };
}

export const removeItem = (cart, id) => setQuantity(cart, id, 0);

/**
 * Ajusta el carrito al catálogo vigente: quita productos que ya no existen o
 * están agotados, y recorta cantidades que superan el stock.
 * @param {Map<string, object>} productsById
 * @returns {{ cart: object, changes: Array<{ id, product, from, to }> }}
 */
export function reconcile(cart, productsById, maxPerItem = Infinity) {
  const changes = [];
  const items = [];

  for (const item of cart.items) {
    const product = productsById.get(item.id) ?? null;
    const qty = product ? Math.min(item.qty, maxQuantity(product, maxPerItem)) : 0;

    if (qty !== item.qty) changes.push({ id: item.id, product, from: item.qty, to: qty });
    if (qty > 0) items.push({ id: item.id, qty });
  }

  return { cart: { items }, changes };
}

/**
 * Calcula líneas y totales con los precios del catálogo.
 * Los productos que no están en el catálogo se omiten.
 */
export function summarize(cart, productsById) {
  const lines = cart.items
    .map((item) => {
      const product = productsById.get(item.id);
      if (!product) return null;

      const regular = product.oldPrice > product.price ? product.oldPrice : product.price;
      return {
        id: item.id,
        product,
        qty: item.qty,
        unitPrice: product.price,
        lineTotal: product.price * item.qty,
        lineSavings: (regular - product.price) * item.qty,
      };
    })
    .filter(Boolean);

  return {
    lines,
    count: lines.reduce((total, line) => total + line.qty, 0),
    subtotal: lines.reduce((total, line) => total + line.lineTotal, 0),
    savings: lines.reduce((total, line) => total + line.lineSavings, 0),
  };
}

/**
 * Progreso hacia el envío gratis.
 * @returns {null | { reached: boolean, remaining: number, ratio: number }}  null si no aplica
 */
export function shippingProgress(subtotal, threshold) {
  if (!threshold || threshold <= 0) return null;
  return {
    reached: subtotal >= threshold,
    remaining: Math.max(0, threshold - subtotal),
    ratio: Math.min(1, subtotal / threshold),
  };
}

/* ----------------------------- Persistencia ----------------------------- */

/** Forma que se guarda en localStorage (versionada para poder migrar en el futuro). */
export const serializeCart = (cart) => ({
  version: CART_VERSION,
  items: cart.items.map(({ id, qty }) => ({ id, qty })),
});

/** Lee un carrito guardado. Cualquier dato inválido se descarta en silencio. */
export function parseCart(raw) {
  if (!raw || raw.version !== CART_VERSION || !Array.isArray(raw.items)) return createCart();

  const quantities = new Map();
  for (const item of raw.items.slice(0, MAX_LINES)) {
    if (typeof item?.id !== 'string' || !item.id) continue;
    const qty = toQuantity(item.qty);
    if (qty > 0) quantities.set(item.id, (quantities.get(item.id) ?? 0) + qty);
  }

  return { items: [...quantities].map(([id, qty]) => ({ id, qty })) };
}
