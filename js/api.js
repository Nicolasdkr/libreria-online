/**
 * api.js — Capa de datos. Hoy lee un JSON estático; mañana podría ser una API real
 * sin cambiar el resto de la app (mismo contrato: devuelve un array de productos).
 */
import { CONFIG } from './config.js';

let cache = null;

function isValidProduct(product) {
  return (
    product &&
    typeof product.id === 'string' &&
    typeof product.title === 'string' &&
    typeof product.category === 'string' &&
    Number.isFinite(product.price)
  );
}

/**
 * Obtiene el catálogo. Cancela la petición si tarda más de `timeout` ms.
 * @returns {Promise<Array<object>>}
 */
export async function fetchProducts({ timeout = 8000 } = {}) {
  if (cache) return cache;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(CONFIG.productsUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Formato de catálogo inválido');

    cache = data.filter(isValidProduct);
    return cache;
  } finally {
    clearTimeout(timer);
  }
}
