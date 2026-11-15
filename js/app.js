/**
 * app.js — Punto de entrada de la aplicación.
 *
 * Inicializa cada feature y coordina el estado compartido (catálogo cargado,
 * categoría activa). Los módulos de features no se conocen entre sí: se
 * comunican a través de este archivo.
 */
import { CONFIG } from './core/config.js';
import { fetchProducts } from './core/api.js';
import { initStoreInfo } from './features/store-info.js';
import { initTheme } from './features/theme.js';
import { initNav } from './features/nav.js';
import {
  renderSkeletons,
  renderProducts,
  renderError,
  renderCategories,
  categoryLabel,
} from './features/catalog.js';
import { pluralize } from './lib/utils.js';

const dom = {
  grid: document.querySelector('[data-product-grid]'),
  count: document.querySelector('[data-results-count]'),
  categories: document.querySelector('[data-category-grid]'),
  activeFilter: document.querySelector('[data-active-filter]'),
  activeFilterLabel: document.querySelector('[data-active-filter-label]'),
  newArrivals: document.querySelector('[data-new-arrivals]'),
  catalogSection: document.getElementById('catalogo'),
};

const state = {
  products: [],
  category: null,
};

/* ------------------------------ Catálogo ------------------------------ */

function visibleProducts() {
  return state.category
    ? state.products.filter((product) => product.category === state.category)
    : state.products;
}

function updateCatalog() {
  const list = visibleProducts();
  renderProducts(dom.grid, list);
  dom.count.textContent = pluralize(list.length, 'título', 'títulos');

  dom.activeFilter.hidden = !state.category;
  if (state.category) dom.activeFilterLabel.textContent = categoryLabel(state.category);

  dom.categories.querySelectorAll('[data-category]').forEach((card) => {
    card.setAttribute('aria-pressed', String(card.dataset.category === state.category));
  });
}

function setCategory(category, { scroll = false } = {}) {
  // Volver a pulsar la categoría activa la desactiva
  state.category = state.category === category ? null : category;
  updateCatalog();
  if (scroll) dom.catalogSection.scrollIntoView();
}

/** Novedades: productos marcados como "nuevo", y si faltan, los agregados más recientemente. */
function renderNewArrivals() {
  if (!dom.newArrivals) return;

  const byDate = [...state.products].sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)));
  const tagged = byDate.filter((product) => product.tags?.includes('nuevo'));
  const rest = byDate.filter((product) => !product.tags?.includes('nuevo'));

  renderProducts(dom.newArrivals, [...tagged, ...rest].slice(0, CONFIG.catalog.newArrivalsLimit));
}

async function loadCatalog() {
  renderSkeletons(dom.grid);
  if (dom.newArrivals) renderSkeletons(dom.newArrivals, 4);
  dom.count.textContent = 'Cargando…';

  try {
    state.products = await fetchProducts();
    renderCategories(dom.categories, state.products, state.category);
    updateCatalog();
    renderNewArrivals();
  } catch (error) {
    console.error('[catálogo]', error);
    dom.count.textContent = '';
    renderError(dom.grid, loadCatalog);
    if (dom.newArrivals) dom.newArrivals.closest('section').hidden = true;
  }
}

function initCatalog() {
  if (!dom.grid) return;

  // Las categorías se muestran al instante; las cantidades llegan con el catálogo
  renderCategories(dom.categories);

  dom.categories.addEventListener('click', (event) => {
    const card = event.target.closest('[data-category]');
    if (card && state.products.length) setCategory(card.dataset.category, { scroll: true });
  });

  dom.activeFilter.querySelector('[data-clear-filter]').addEventListener('click', () => {
    setCategory(null);
  });

  loadCatalog();
}

/* -------------------------------- Inicio -------------------------------- */

function init() {
  initStoreInfo();
  initTheme(document.querySelector('[data-theme-toggle]'));
  initNav();
  initCatalog();
}

// Los módulos se ejecutan con "defer" implícito: el DOM ya está listo.
init();
