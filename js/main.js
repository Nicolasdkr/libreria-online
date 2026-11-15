/**
 * main.js — Punto de entrada. Inicializa los módulos y coordina el estado de la página.
 */
import { CONFIG } from './config.js';
import { initTheme } from './theme.js';
import { initNav } from './nav.js';
import { fetchProducts } from './api.js';
import {
  renderSkeletons,
  renderProducts,
  renderError,
  renderCategories,
  categoryLabel,
} from './catalog.js';
import { pluralize } from './utils.js';

const dom = {
  grid: document.querySelector('[data-product-grid]'),
  count: document.querySelector('[data-results-count]'),
  categories: document.querySelector('[data-category-grid]'),
  activeFilter: document.querySelector('[data-active-filter]'),
  activeFilterLabel: document.querySelector('[data-active-filter-label]'),
  catalogSection: document.getElementById('catalogo'),
};

const state = {
  products: [],
  category: null, // en el paso 4 este estado pasa a filters.js (categoría + búsqueda + orden)
};

/** Vuelca los datos de config.js en el HTML (nombre, año, enlaces). */
function applyConfig() {
  document.querySelectorAll('[data-store-name]').forEach((el) => {
    el.textContent = CONFIG.storeName;
  });

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  document.querySelectorAll('[data-whatsapp-link]').forEach((el) => {
    el.href = `https://wa.me/${CONFIG.whatsappNumber}`;
  });

  document.querySelectorAll('[data-dev-link]').forEach((el) => {
    el.href = CONFIG.developer.url;
    el.textContent = CONFIG.developer.name;
  });
}

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

async function loadCatalog() {
  renderSkeletons(dom.grid);
  dom.count.textContent = 'Cargando…';

  try {
    state.products = await fetchProducts();
    renderCategories(dom.categories, state.products, state.category);
    updateCatalog();
  } catch (error) {
    console.error('[catálogo]', error);
    dom.count.textContent = '';
    renderError(dom.grid, loadCatalog);
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

function init() {
  applyConfig();
  initTheme(document.querySelector('[data-theme-toggle]'));
  initNav();
  initCatalog();
}

// Los módulos se ejecutan con "defer" implícito: el DOM ya está listo.
init();
