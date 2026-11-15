/**
 * core/api.js — Capa de datos del catálogo.
 *
 * Hoy lee un JSON estático. Para conectar un backend, un CMS headless o una
 * planilla, basta con reemplazar fetchProducts() respetando el mismo contrato:
 * devolver una Promise con un array de productos (ver docs/ARCHITECTURE.md).
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
    const response = await fetch(CONFIG.catalog.productsUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Formato de catálogo inválido');

    const valid = data.filter(isValidProduct);
    if (valid.length < data.length) {
      console.warn(`[catálogo] ${data.length - valid.length} producto(s) descartado(s) por datos incompletos.`);
    }

    cache = valid;
    return cache;
  } finally {
    clearTimeout(timer);
  }
}
