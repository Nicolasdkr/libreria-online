/**
 * lib/utils.js — Funciones puras y reutilizables (sin acceso al DOM).
 */
import { CONFIG } from '../core/config.js';

const priceFormatter = new Intl.NumberFormat(CONFIG.commerce.locale, {
  style: 'currency',
  currency: CONFIG.commerce.currency,
  maximumFractionDigits: 0,
});

/** 18990 → "$18.990" (según locale y moneda configurados) */
export const formatPrice = (value) => priceFormatter.format(value);

/** Escapa texto antes de insertarlo como HTML (evita inyección desde los datos). */
export function escapeHTML(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
}

/** "Persépolis " → "persepolis" (sin tildes ni mayúsculas, para búsquedas). */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Retrasa la ejecución hasta que pasen `wait` ms sin nuevas llamadas. */
export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** pluralize(1, 'título', 'títulos') → "1 título" */
export const pluralize = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;

/** Porcentaje de descuento redondeado, o 0 si no aplica. */
export function discountPercent(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}

/** Enlace de WhatsApp con mensaje opcional. */
export function whatsappUrl(number, message = '') {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}
