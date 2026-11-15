/**
 * core/config.js — Resuelve la configuración final de la app.
 *
 * Combina los valores por defecto con config/store.config.js, valida lo esencial
 * y congela el resultado para que ningún módulo pueda modificarlo en tiempo de ejecución.
 * El resto de la app importa CONFIG desde aquí, nunca el archivo de la tienda directamente.
 */
import storeConfig from '../../config/store.config.js';

const DEFAULTS = {
  brand: { name: 'Mi Librería', tagline: '' },
  contact: { whatsapp: '', email: '', address: '' },
  hours: [],
  commerce: { locale: 'es-CL', currency: 'CLP', lowStockThreshold: 3 },
  catalog: { productsUrl: 'data/products.json', newArrivalsLimit: 8, categories: [] },
  demo: { enabled: false, message: '', ctaLabel: '', ctaUrl: '' },
  credits: { enabled: false, label: '', name: '', url: '' },
};

/**
 * Claves de localStorage. Son fijas porque el script inline de <head>
 * (que evita el destello de tema) necesita conocer la del tema.
 */
export const STORAGE_KEYS = Object.freeze({
  theme: 'storefront.theme',
  cart: 'storefront.cart',
});

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Mezcla profunda: los objetos se combinan, los arrays y valores simples se reemplazan. */
function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override ?? {})) {
    result[key] = isPlainObject(value) && isPlainObject(base[key])
      ? deepMerge(base[key], value)
      : value;
  }
  return result;
}

function deepFreeze(object) {
  Object.values(object).forEach((value) => {
    if (value && typeof value === 'object') deepFreeze(value);
  });
  return Object.freeze(object);
}

/** Avisos en consola para errores de configuración frecuentes (no detienen la app). */
function validate(config) {
  const warn = (message) => console.warn(`[store.config] ${message}`);

  if (config.contact.whatsapp && !/^\d{8,15}$/.test(config.contact.whatsapp)) {
    warn('contact.whatsapp debe tener solo dígitos, con código de país (ej. 56912345678).');
  }
  if (!config.catalog.categories.length) {
    warn('catalog.categories está vacío: no se mostrarán categorías.');
  }
  try {
    new Intl.NumberFormat(config.commerce.locale, { style: 'currency', currency: config.commerce.currency });
  } catch {
    warn(`commerce.locale/currency inválidos: "${config.commerce.locale}" / "${config.commerce.currency}".`);
  }
}

const merged = deepMerge(DEFAULTS, storeConfig);
validate(merged);

export const CONFIG = deepFreeze(merged);
