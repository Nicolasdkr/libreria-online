/**
 * features/filters.js — Barra de filtros del catálogo (interfaz).
 *
 * Dibuja los controles y avisa de los cambios mediante callbacks. No guarda
 * estado propio: app.js es la fuente de verdad y llama a sync() para reflejarlo.
 */
import { CONFIG } from '../core/config.js';
import { SORT_OPTIONS, hasActiveFilters } from '../lib/filtering.js';
import { escapeHTML, formatPrice, debounce } from '../lib/utils.js';

/**
 * @param {HTMLElement} root  contenedor [data-filter-bar]
 * @param {{ onChange: (patch: object) => void, onReset: () => void }} handlers
 */
export function createFilterBar(root, { onChange, onReset }) {
  const els = {
    categories: root.querySelector('[data-filter-categories]'),
    sort: root.querySelector('[data-filter-sort]'),
    price: root.querySelector('[data-filter-price]'),
    priceOutput: root.querySelector('[data-filter-price-output]'),
    stock: root.querySelector('[data-filter-stock]'),
    reset: root.querySelector('[data-filter-reset]'),
  };

  let bounds = null;

  /* ---------- Contenido inicial ---------- */
  const chips = [{ id: '', label: 'Todos' }, ...CONFIG.catalog.categories];
  els.categories.innerHTML = chips
    .map(
      (category) => `
        <button class="chip" type="button" data-filter-category="${escapeHTML(category.id)}" aria-pressed="false">
          ${escapeHTML(category.label)}
        </button>`,
    )
    .join('');

  els.sort.innerHTML = SORT_OPTIONS.map(
    (option) => `<option value="${option.id}">${escapeHTML(option.label)}</option>`,
  ).join('');

  // Hasta conocer el rango de precios del catálogo, el slider queda deshabilitado
  els.price.disabled = true;

  /* ---------- Helpers ---------- */
  const priceLabel = (value) =>
    value == null || (bounds && value >= bounds.max) ? 'Sin límite' : `Hasta ${formatPrice(value)}`;

  function showPrice(value) {
    const label = priceLabel(value);
    els.priceOutput.textContent = label;
    els.price.setAttribute('aria-valuetext', label);
  }

  // Con catálogos grandes, filtrar en cada pixel del slider sería costoso
  const emitPrice = debounce((value) => {
    onChange({ maxPrice: value >= bounds.max ? null : value });
  }, 120);

  /* ---------- Eventos ---------- */
  root.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-filter-category]');
    if (chip) onChange({ category: chip.dataset.filterCategory || null });

    if (event.target.closest('[data-filter-reset]')) onReset();
  });

  els.sort.addEventListener('change', () => onChange({ sort: els.sort.value }));
  els.stock.addEventListener('change', () => onChange({ inStock: els.stock.checked }));

  els.price.addEventListener('input', () => {
    const value = Number(els.price.value);
    showPrice(value);
    emitPrice(value);
  });

  /* ---------- API pública ---------- */
  return {
    /** Configura el slider con el rango real del catálogo. */
    setPriceBounds(next) {
      bounds = next;
      els.price.min = String(next.min);
      els.price.max = String(next.max);
      els.price.step = String(CONFIG.catalog.priceFilterStep);
      els.price.disabled = next.max <= next.min;
    },

    /** Refleja el estado actual en los controles. */
    sync(filters) {
      els.categories.querySelectorAll('[data-filter-category]').forEach((chip) => {
        const active = (chip.dataset.filterCategory || null) === filters.category;
        chip.setAttribute('aria-pressed', String(active));
      });

      els.sort.value = filters.sort;
      els.stock.checked = filters.inStock;

      if (bounds) els.price.value = String(filters.maxPrice ?? bounds.max);
      showPrice(filters.maxPrice);

      els.reset.hidden = !hasActiveFilters(filters);
    },
  };
}
