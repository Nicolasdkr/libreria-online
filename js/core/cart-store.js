/**
 * core/cart-store.js — Estado del carrito: persistencia, sincronización y suscripción.
 *
 * Envuelve el modelo puro de lib/cart.js y le agrega:
 *  - Persistencia en localStorage (sobrevive a recargas y cierres del navegador).
 *  - Sincronización entre pestañas mediante el evento `storage`.
 *  - Ajuste automático al stock del catálogo cuando este se carga.
 *  - Suscripción: la interfaz se entera de cada cambio sin acoplarse al store.
 */
import { CONFIG, STORAGE_KEYS } from './config.js';
import { storage } from './storage.js';
import {
  createCart,
  parseCart,
  serializeCart,
  addItem,
  setQuantity,
  removeItem,
  getQuantity,
  maxQuantity,
  reconcile,
  summarize,
} from '../lib/cart.js';

export function createCartStore() {
  const maxPerItem = CONFIG.commerce.maxQuantityPerItem;
  const listeners = new Set();

  let cart = parseCart(storage.get(STORAGE_KEYS.cart));
  let productsById = new Map();

  const ready = () => productsById.size > 0;

  /** Unidades máximas permitidas (antes de cargar el catálogo solo se aplica el límite general). */
  const maxFor = (id) => (ready() ? maxQuantity(productsById.get(id), maxPerItem) : maxPerItem);

  function getState() {
    return { cart, summary: summarize(cart, productsById), ready: ready() };
  }

  function notify(meta) {
    const state = getState();
    listeners.forEach((listener) => listener(state, meta));
  }

  function commit(next, meta) {
    cart = next;
    storage.set(STORAGE_KEYS.cart, serializeCart(cart));
    notify(meta);
  }

  // Otra pestaña modificó el carrito: lo recargamos sin volver a escribirlo
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEYS.cart) return;
    const incoming = parseCart(storage.get(STORAGE_KEYS.cart));
    cart = ready() ? reconcile(incoming, productsById, maxPerItem).cart : incoming;
    notify({ type: 'sync' });
  });

  return {
    getState,
    maxFor,
    getQuantity: (id) => getQuantity(cart, id),
    getProduct: (id) => productsById.get(id) ?? null,

    /** @returns {() => void} función para cancelar la suscripción */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Entrega el catálogo al store y ajusta el carrito guardado a su stock. */
    setProducts(products) {
      productsById = new Map(products.map((product) => [product.id, product]));
      const { cart: next, changes } = reconcile(cart, productsById, maxPerItem);
      commit(next, { type: 'reconcile', changes });
      return changes;
    },

    add(id, amount = 1) {
      const result = addItem(cart, id, amount, maxFor(id));
      if (result.added > 0) commit(result.cart, { type: 'add', id, added: result.added });
      return result;
    },

    setQuantity(id, qty) {
      commit(setQuantity(cart, id, qty, maxFor(id)), { type: 'update', id });
    },

    /** Quita un producto. Devuelve el carrito anterior para poder deshacer. */
    remove(id) {
      const snapshot = cart;
      commit(removeItem(cart, id), { type: 'remove', id });
      return snapshot;
    },

    /** Vacía el carrito. Devuelve el carrito anterior para poder deshacer. */
    clear() {
      const snapshot = cart;
      commit(createCart(), { type: 'clear' });
      return snapshot;
    },

    /** Restaura un carrito anterior (deshacer), revalidado contra el stock actual. */
    restore(snapshot) {
      const next = ready() ? reconcile(snapshot, productsById, maxPerItem).cart : snapshot;
      commit(next, { type: 'restore' });
    },
  };
}
