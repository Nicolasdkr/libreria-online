/**
 * features/catalog.js — Renderizado del catálogo: tarjetas, skeletons, estados y categorías.
 *
 * Es una capa de presentación pura: recibe datos y dibuja. No decide QUÉ productos
 * mostrar; esa lógica vive en app.js (y en el módulo de filtros).
 */
import { CONFIG } from '../core/config.js';
import { formatPrice, escapeHTML, discountPercent, pluralize } from '../lib/utils.js';

const LOW_STOCK = CONFIG.commerce.lowStockThreshold;

const ICONS = {
  bag: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>',
  alert: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
};

const TAGS = {
  nuevo: { label: 'Nuevo', className: 'badge--new' },
  'mas-vendido': { label: 'Más vendido', className: 'badge--hot' },
};

export const categoryLabel = (id) =>
  CONFIG.catalog.categories.find((category) => category.id === id)?.label ?? id;

/* ----------------------------- Plantillas ----------------------------- */

function coverMarkup(product) {
  const hue = Number(product.hue) || 20;
  const fallback = `
    <div class="cover" style="--h: ${hue}" aria-hidden="true" ${product.cover ? 'hidden' : ''}>
      <span class="cover__tag">${escapeHTML(categoryLabel(product.category))}</span>
      <span class="cover__title">${escapeHTML(product.title)}</span>
      <span class="cover__author">${escapeHTML(product.author)}</span>
    </div>`;

  if (!product.cover) return fallback;

  return `
    <img src="${escapeHTML(product.cover)}" alt="Portada de ${escapeHTML(product.title)}"
         width="400" height="600" loading="lazy" decoding="async" data-cover-img />
    ${fallback}`;
}

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
          <button class="btn btn--primary btn--sm" type="button"
                  data-add-to-cart="${escapeHTML(product.id)}"
                  aria-label="${soldOut ? `${title}: agotado` : `Agregar ${title} al carrito`}"
                  ${soldOut ? 'disabled' : ''}>
            ${ICONS.bag}<span>${soldOut ? 'Agotado' : 'Agregar'}</span>
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

/** Si una portada no carga, se reemplaza por la portada generada por CSS. */
function bindCoverFallbacks(root) {
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
      icon: ICONS.search,
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
    icon: ICONS.alert,
    title: 'No pudimos cargar el catálogo',
    text: 'Revisa tu conexión e inténtalo de nuevo.',
    actionLabel: 'Reintentar',
    onAction: onRetry,
  });
}

function renderState(grid, { icon, title, text, actionLabel, onAction }) {
  grid.innerHTML = `
    <div class="catalog-state" role="status">
      ${icon}
      <h3>${escapeHTML(title)}</h3>
      <p class="text-muted">${escapeHTML(text)}</p>
      ${actionLabel ? `<button class="btn btn--ghost" type="button" data-state-action>${escapeHTML(actionLabel)}</button>` : ''}
    </div>`;

  if (onAction) {
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
                data-category="${category.id}" aria-pressed="${category.id === activeId}">
          <span class="category-card__books" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="category-card__name">${escapeHTML(category.label)}</span>
          <span class="category-card__desc">${escapeHTML(category.description)}</span>
          <span class="category-card__count">${countText}</span>
        </button>`;
    })
    .join('');
}
