/**
 * app.js — Punto de entrada de la aplicación.
 *
 * Inicializa cada feature y es la única fuente de verdad del estado compartido
 * (catálogo y filtros). Los módulos de features no se conocen entre sí: avisan
 * de los cambios con callbacks y este archivo decide qué volver a dibujar.
 *
 *   interacción ─► setFilters(patch) ─► state ─► URL + updateCatalog()
 */
import { CONFIG } from './core/config.js';
import { fetchProducts } from './core/api.js';
import { initStoreInfo } from './features/store-info.js';
import { initTheme } from './features/theme.js';
import { initNav } from './features/nav.js';
import { createFilterBar } from './features/filters.js';
import {
  renderSkeletons,
  renderProducts,
  renderError,
  renderCategories,
} from './features/catalog.js';
import {
  DEFAULT_FILTERS,
  applyFilters,
  hasActiveFilters,
  parseFilters,
  serializeFilters,
  priceBounds,
} from './lib/filtering.js';
import { debounce, pluralize } from './lib/utils.js';

const dom = {
  grid: document.querySelector('[data-product-grid]'),
  count: document.querySelector('[data-results-count]'),
  categories: document.querySelector('[data-category-grid]'),
  filterBar: document.querySelector('[data-filter-bar]'),
  searchForm: document.querySelector('[data-search-form]'),
  searchInput: document.querySelector('[data-search-input]'),
  newArrivals: document.querySelector('[data-new-arrivals]'),
  catalogSection: document.getElementById('catalogo'),
};

const CATEGORY_IDS = CONFIG.catalog.categories.map((category) => category.id);

const state = {
  status: 'loading', // 'loading' | 'ready' | 'error'
  products: [],
  filters: parseFilters(window.location.search, { categories: CATEGORY_IDS }),
};

let filterBar = null;

/* ------------------------------- Filtros ------------------------------- */

/** Refleja los filtros en la URL sin crear entradas nuevas en el historial. */
function writeFiltersToURL() {
  const query = serializeFilters(state.filters);
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}

function setFilters(patch) {
  state.filters = { ...state.filters, ...patch };
  writeFiltersToURL();
  updateCatalog();
}

function resetFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  dom.searchInput.value = '';
  writeFiltersToURL();
  updateCatalog();
}

function scrollToCatalog() {
  dom.catalogSection.scrollIntoView();
}

/** Lleva al catálogo solo si no está a la vista (evita saltos mientras se escribe). */
function revealCatalog() {
  const rect = dom.catalogSection.getBoundingClientRect();
  const visible = rect.top < window.innerHeight && rect.bottom > 0;
  if (!visible) scrollToCatalog();
}

/* ------------------------------ Catálogo ------------------------------ */

function resultsText(count) {
  const total = state.products.length;
  if (!hasActiveFilters(state.filters)) return pluralize(total, 'título', 'títulos');

  const query = state.filters.query.trim();
  const base = `${count} de ${pluralize(total, 'título', 'títulos')}`;
  return query ? `${base} para «${query}»` : base;
}

function updateCatalog() {
  filterBar?.sync(state.filters);

  dom.categories.querySelectorAll('[data-category]').forEach((card) => {
    card.setAttribute('aria-pressed', String(card.dataset.category === state.filters.category));
  });

  if (state.status !== 'ready') return;

  const list = applyFilters(state.products, state.filters);
  renderProducts(dom.grid, list, {
    emptyAction: { label: 'Limpiar filtros', onAction: resetFilters },
  });
  dom.count.textContent = resultsText(list.length);
}

/** Novedades: productos marcados como "nuevo", y si faltan, los agregados más recientemente. */
function renderNewArrivals() {
  if (!dom.newArrivals) return;

  const byDate = applyFilters(state.products, { sort: 'novedad', inStock: true });
  const isNew = (product) => product.tags?.includes('nuevo');
  const list = [...byDate.filter(isNew), ...byDate.filter((product) => !isNew(product))];

  renderProducts(dom.newArrivals, list.slice(0, CONFIG.catalog.newArrivalsLimit));
}

async function loadCatalog() {
  state.status = 'loading';
  renderSkeletons(dom.grid);
  if (dom.newArrivals) renderSkeletons(dom.newArrivals, 4);
  dom.count.textContent = 'Cargando…';

  try {
    state.products = await fetchProducts();
    state.status = 'ready';

    // El rango del slider depende del catálogo real
    const bounds = priceBounds(state.products, CONFIG.catalog.priceFilterStep);
    filterBar.setPriceBounds(bounds);
    if (state.filters.maxPrice != null && state.filters.maxPrice >= bounds.max) {
      state.filters = { ...state.filters, maxPrice: null };
      writeFiltersToURL();
    }

    renderCategories(dom.categories, state.products, state.filters.category);
    updateCatalog();
    renderNewArrivals();
  } catch (error) {
    console.error('[catálogo]', error);
    state.status = 'error';
    dom.count.textContent = '';
    renderError(dom.grid, loadCatalog);
    if (dom.newArrivals) dom.newArrivals.closest('section').hidden = true;
  }
}

/* ------------------------------ Inicializar ------------------------------ */

function initSearch() {
  dom.searchInput.value = state.filters.query;

  const search = debounce((value) => {
    setFilters({ query: value });
    if (value.trim()) revealCatalog();
  }, 250);

  dom.searchInput.addEventListener('input', (event) => search(event.target.value));

  // Enter: busca al instante, baja al catálogo y cierra el teclado en móvil
  dom.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setFilters({ query: dom.searchInput.value });
    scrollToCatalog();
    dom.searchInput.blur();
  });
}

function initCatalog() {
  if (!dom.grid) return;

  filterBar = createFilterBar(dom.filterBar, {
    onChange: setFilters,
    onReset: resetFilters,
  });

  // Las categorías se muestran al instante; las cantidades llegan con el catálogo
  renderCategories(dom.categories, [], state.filters.category);

  dom.categories.addEventListener('click', (event) => {
    const card = event.target.closest('[data-category]');
    if (!card) return;
    // Volver a pulsar la categoría activa la desactiva
    const category = card.dataset.category === state.filters.category ? null : card.dataset.category;
    setFilters({ category });
    scrollToCatalog();
  });

  initSearch();
  updateCatalog();

  // Un enlace compartido con filtros (?cat=manga…) lleva directo al catálogo
  const fromSharedLink = hasActiveFilters(state.filters);
  loadCatalog().then(() => {
    if (fromSharedLink && state.status === 'ready') scrollToCatalog();
  });
}

function init() {
  initStoreInfo();
  initTheme(document.querySelector('[data-theme-toggle]'));
  initNav();
  initCatalog();
}

// Los módulos se ejecutan con "defer" implícito: el DOM ya está listo.
init();
