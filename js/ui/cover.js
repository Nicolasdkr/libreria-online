/**
 * ui/cover.js — Portada de producto: imagen real o portada generada con CSS.
 */
import { CONFIG } from '../core/config.js';
import { escapeHTML } from '../lib/utils.js';

export const categoryLabel = (id) =>
  CONFIG.catalog.categories.find((category) => category.id === id)?.label ?? id;

/**
 * Devuelve el markup de la portada. Si el producto tiene imagen, se incluye
 * también la portada CSS oculta como respaldo (ver bindCoverFallbacks).
 * @param {object} product
 * @param {{ compact?: boolean }} [options]  compact: sin textos (miniaturas)
 */
export function coverMarkup(product, { compact = false } = {}) {
  const hue = Number(product.hue) || 20;
  const text = compact
    ? ''
    : `
      <span class="cover__tag">${escapeHTML(categoryLabel(product.category))}</span>
      <span class="cover__title">${escapeHTML(product.title)}</span>
      <span class="cover__author">${escapeHTML(product.author)}</span>`;

  const fallback = `
    <div class="cover${compact ? ' cover--compact' : ''}" style="--h: ${hue}" aria-hidden="true" ${product.cover ? 'hidden' : ''}>${text}
    </div>`;

  if (!product.cover) return fallback;

  return `
    <img src="${escapeHTML(product.cover)}" alt="${compact ? '' : `Portada de ${escapeHTML(product.title)}`}"
         width="400" height="600" loading="lazy" decoding="async" data-cover-img />
    ${fallback}`;
}

/** Si una imagen de portada no carga, se reemplaza por la portada generada. */
export function bindCoverFallbacks(root) {
  root.querySelectorAll('img[data-cover-img]').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        img.nextElementSibling?.removeAttribute('hidden');
        img.remove();
      },
      { once: true },
    );
  });
}
