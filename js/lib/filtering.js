/**
 * lib/filtering.js — Lógica de filtros del catálogo (pura, sin DOM).
 *
 * - applyFilters(): filtra y ordena una lista de productos.
 * - parseFilters() / serializeFilters(): convierten los filtros desde y hacia
 *   la query string, para que cualquier búsqueda se pueda compartir por enlace.
 *
 * Al no tocar el DOM, este módulo se prueba directamente con Node (tests/).
 */
import { normalizeText } from './utils.js';

export const SORT_OPTIONS = Object.freeze([
  { id: 'destacados', label: 'Destacados' },
  { id: 'novedad', label: 'Más recientes' },
  { id: 'precio-asc', label: 'Precio: menor a mayor' },
  { id: 'precio-desc', label: 'Precio: mayor a menor' },
  { id: 'titulo', label: 'Título (A–Z)' },
]);

export const DEFAULT_FILTERS = Object.freeze({
  category: null, // id de categoría o null para todas
  query: '', // texto libre: busca en título y autor
  sort: 'destacados',
  maxPrice: null, // número o null para sin límite
  inStock: false, // true = ocultar agotados
});

/** Nombres de los parámetros en la URL (?cat=manga&q=frieren&orden=precio-asc&max=20000&stock=1) */
const PARAMS = Object.freeze({
  category: 'cat',
  query: 'q',
  sort: 'orden',
  maxPrice: 'max',
  inStock: 'stock',
});

const MAX_QUERY_LENGTH = 100;

const isSoldOut = (product) => (product.stock ?? 1) <= 0;

const COMPARATORS = {
  // Orden original del catálogo, con los agotados al final (sort es estable)
  destacados: (a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)),
  novedad: (a, b) => String(b.addedAt ?? '').localeCompare(String(a.addedAt ?? '')),
  'precio-asc': (a, b) => a.price - b.price,
  'precio-desc': (a, b) => b.price - a.price,
  titulo: (a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }),
};

/** Divide la búsqueda en palabras normalizadas: "One  Piece" → ["one", "piece"] */
const tokenize = (query) => normalizeText(query).split(/\s+/).filter(Boolean);

/** Todas las palabras deben aparecer en el título o el autor, en cualquier orden. */
function matchesQuery(product, tokens) {
  if (!tokens.length) return true;
  const haystack = normalizeText(`${product.title} ${product.author ?? ''}`);
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Devuelve una NUEVA lista con los productos que cumplen los filtros, ya ordenada.
 * @param {Array<object>} products
 * @param {Partial<typeof DEFAULT_FILTERS>} filters
 */
export function applyFilters(products, filters = {}) {
  const { category, query, sort, maxPrice, inStock } = { ...DEFAULT_FILTERS, ...filters };
  const tokens = tokenize(query);

  const result = products.filter(
    (product) =>
      (!category || product.category === category) &&
      (maxPrice == null || product.price <= maxPrice) &&
      (!inStock || !isSoldOut(product)) &&
      matchesQuery(product, tokens),
  );

  const compare = COMPARATORS[sort] ?? COMPARATORS.destacados;
  return result.sort(compare);
}

/** ¿Hay algo distinto de los valores por defecto? */
export function hasActiveFilters(filters) {
  return (
    Boolean(filters.category) ||
    Boolean(filters.query?.trim()) ||
    filters.maxPrice != null ||
    Boolean(filters.inStock) ||
    filters.sort !== DEFAULT_FILTERS.sort
  );
}

/**
 * Lee los filtros desde una query string. Los valores inválidos se ignoran,
 * así un enlace manipulado o antiguo nunca rompe la página.
 * @param {string} search  ej. location.search
 * @param {{ categories?: string[] }} options  ids de categoría válidos
 */
export function parseFilters(search, { categories = [] } = {}) {
  const params = new URLSearchParams(search);
  const filters = { ...DEFAULT_FILTERS };

  const category = params.get(PARAMS.category);
  if (category && categories.includes(category)) filters.category = category;

  const query = params.get(PARAMS.query);
  if (query) filters.query = query.slice(0, MAX_QUERY_LENGTH);

  const sort = params.get(PARAMS.sort);
  if (SORT_OPTIONS.some((option) => option.id === sort)) filters.sort = sort;

  const maxPrice = Number(params.get(PARAMS.maxPrice));
  if (params.has(PARAMS.maxPrice) && Number.isFinite(maxPrice) && maxPrice > 0) {
    filters.maxPrice = maxPrice;
  }

  if (params.get(PARAMS.inStock) === '1') filters.inStock = true;

  return filters;
}

/** Convierte los filtros en query string, omitiendo los valores por defecto. */
export function serializeFilters(filters) {
  const params = new URLSearchParams();
  const query = filters.query?.trim();

  if (filters.category) params.set(PARAMS.category, filters.category);
  if (query) params.set(PARAMS.query, query);
  if (filters.sort && filters.sort !== DEFAULT_FILTERS.sort) params.set(PARAMS.sort, filters.sort);
  if (filters.maxPrice != null) params.set(PARAMS.maxPrice, String(filters.maxPrice));
  if (filters.inStock) params.set(PARAMS.inStock, '1');

  return params.toString();
}

/** Rango de precios del catálogo, redondeado al múltiplo de `step` más cercano. */
export function priceBounds(products, step = 1000) {
  if (!products.length) return { min: 0, max: 0 };
  const prices = products.map((product) => product.price);
  return {
    min: Math.floor(Math.min(...prices) / step) * step,
    max: Math.ceil(Math.max(...prices) / step) * step,
  };
}
