/**
 * features/catalog.js — Renderizado del catálogo: tarjetas, skeletons, estados y categorías.
 *
 * Es una capa de presentación pura: recibe datos y dibuja. No decide QUÉ productos
 * mostrar (eso es lib/filtering.js) ni maneja el carrito (eso es features/cart/,
 * que lee los atributos data-add-to-cart de cada tarjeta).
 */
import { CONFIG } from '../core/config.js';
import { formatPrice, escapeHTML, discountPercent, pluralize } from '../lib/utils.js';
import { icon } from '../ui/icons.js';
import { coverMarkup, bindCoverFallbacks, categoryLabel } from '../ui/cover.js';

const LOW_STOCK = CONFIG.commerce.lowStockThreshold;

const TAGS = {
  nuevo: { label: 'Nuevo', className: 'badge--new' },
  'mas-vendido': { label: 'Más vendido', className: 'badge--hot' },
};

/* ----------------------------- Plantillas ----------------------------- */

function badgesMarkup(product) {
  const badges = [];
  const discount = discountPercent(product.price, product.oldPrice);

  if (product.stock <= 0) badges.push('<span class="badge badge--out">Agotado</span>');
  if (discount) badges.push(`<span class="badge badge--sale">-${discount}%</span>`);

  (product.tags ?? []).forEach((tag) => {
    const info = TAGS[tag];
    if (info) badges.push(`<span class="badge ${info.className}">${info.label}</span>`);
  });

  return badges.join('');
}

function stockMarkup(stock) {
  if (stock > 0 && stock <= LOW_STOCK) {
    const text = stock === 1 ? '¡Última unidad!' : `¡Quedan ${stock}!`;
    return `<p class="product-card__stock">${text}</p>`;
  }
  return '';
}

function productCard(product) {
  const title = escapeHTML(product.title);
  const soldOut = product.stock <= 0;

  const oldPrice = discountPercent(product.price, product.oldPrice)
    ? `<s class="price__old"><span class="sr-only">Antes: </span>${formatPrice(product.oldPrice)}</s>`
    : '';

  return `
    <article class="product-card${soldOut ? ' is-out' : ''}" data-product-id="${escapeHTML(product.id)}">
      <div class="product-card__media">
        ${coverMarkup(product)}
        <div class="product-card__badges">${badgesMarkup(product)}</div>
      </div>
      <div class="product-card__body">
        <p class="product-card__category">${escapeHTML(categoryLabel(product.category))}</p>
        <h3 class="product-card__title">${title}</h3>
        <p class="product-card__author">${escapeHTML(product.author)}</p>
        ${stockMarkup(product.stock)}
        <div class="product-card__footer">
          <p class="price">
            <span class="price__now"><span class="sr-only">Precio: </span>${formatPrice(product.price)}</span>
            ${oldPrice}
          </p>
          <button class="btn btn--primary btn--sm add-btn" type="button"
                  data-add-to-cart="${escapeHTML(product.id)}" data-title="${title}"
                  ${soldOut ? 'data-sold-out disabled' : ''}
                  aria-label="${soldOut ? `${title}: agotado` : `Agregar ${title} al carrito`}">
            ${icon('bag', 'sm')}<span class="add-btn__label">${soldOut ? 'Agotado' : 'Agregar'}</span>
          </button>
        </div>
      </div>
    </article>`;
}

function skeletonCard() {
  return `
    <div class="product-card is-skeleton" aria-hidden="true">
      <div class="product-card__media"><div class="skeleton skeleton--cover"></div></div>
      <div class="product-card__body">
        <div class="skeleton skeleton--line" style="width: 35%"></div>
        <div class="skeleton skeleton--line" style="width: 85%; height: 1.1rem"></div>
        <div class="skeleton skeleton--line" style="width: 55%"></div>
        <div class="product-card__footer">
          <div class="skeleton skeleton--line" style="width: 40%; height: 1.2rem"></div>
          <div class="skeleton skeleton--btn"></div>
        </div>
      </div>
    </div>`;
}

/* ---------------------------- Render público ---------------------------- */

export function renderSkeletons(grid, count = 8) {
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = Array.from({ length: count }, skeletonCard).join('');
}

/**
 * @param {HTMLElement} grid
 * @param {Array<object>} products
 * @param {{ emptyAction?: { label: string, onAction: () => void } }} [options]
 */
export function renderProducts(grid, products, { emptyAction } = {}) {
  grid.setAttribute('aria-busy', 'false');

  if (!products.length) {
    renderState(grid, {
      icon: icon('search'),
      title: 'No encontramos títulos',
      text: 'Prueba con otra búsqueda o quita algún filtro.',
      actionLabel: emptyAction?.label,
      onAction: emptyAction?.onAction,
    });
    return;
  }

  grid.innerHTML = products.map(productCard).join('');
  bindCoverFallbacks(grid);
}

export function renderError(grid, onRetry) {
  grid.setAttribute('aria-busy', 'false');
  renderState(grid, {
    icon: icon('alert'),
    title: 'No pudimos cargar el catálogo',
    text: 'Revisa tu conexión e inténtalo de nuevo.',
    actionLabel: 'Reintentar',
    onAction: onRetry,
  });
}

function renderState(grid, { icon: iconMarkup, title, text, actionLabel, onAction }) {
  grid.innerHTML = `
    <div class="catalog-state" role="status">
      ${iconMarkup}
      <h3>${escapeHTML(title)}</h3>
      <p class="text-muted">${escapeHTML(text)}</p>
      ${actionLabel ? `<button class="btn btn--ghost" type="button" data-state-action>${escapeHTML(actionLabel)}</button>` : ''}
    </div>`;

  if (actionLabel && onAction) {
    grid.querySelector('[data-state-action]').addEventListener('click', onAction, { once: true });
  }
}

/**
 * Dibuja las tarjetas de categoría. Sin productos muestra solo nombres;
 * al recibir el catálogo agrega la cantidad de títulos de cada una.
 */
export function renderCategories(container, products = [], activeId = null) {
  container.innerHTML = CONFIG.catalog.categories
    .map((category) => {
      const count = products.filter((p) => p.category === category.id).length;
      const countText = products.length ? pluralize(count, 'título', 'títulos') : '&nbsp;';

      return `
        <button class="category-card" type="button" style="--h: ${category.hue}"
                data-category="${escapeHTML(category.id)}" aria-pressed="${category.id === activeId}">
          <span class="category-card__books" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="category-card__name">${escapeHTML(category.label)}</span>
          <span class="category-card__desc">${escapeHTML(category.description)}</span>
          <span class="category-card__count">${countText}</span>
        </button>`;
    })
    .join('');
}
