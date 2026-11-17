/**
 * Tests de la lógica de filtros (js/lib/filtering.js).
 * Usan el test runner integrado de Node, sin dependencias:  npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_FILTERS,
  applyFilters,
  hasActiveFilters,
  parseFilters,
  serializeFilters,
  priceBounds,
} from '../js/lib/filtering.js';

const PRODUCTS = [
  { id: 'a', title: 'Persépolis', author: 'Marjane Satrapi', category: 'novela-grafica', price: 21990, stock: 5, addedAt: '2026-04-22' },
  { id: 'b', title: 'One Piece Vol. 1', author: 'Eiichiro Oda', category: 'manga', price: 8990, stock: 25, addedAt: '2026-04-09' },
  { id: 'c', title: 'Berserk Maximum Vol. 1', author: 'Kentaro Miura', category: 'manga', price: 17990, stock: 0, addedAt: '2025-11-30' },
  { id: 'd', title: 'Ficciones', author: 'Jorge Luis Borges', category: 'libros', price: 13990, stock: 9, addedAt: '2026-01-20' },
  { id: 'e', title: 'Chainsaw Man Vol. 1', author: 'Tatsuki Fujimoto', category: 'manga', price: 9490, stock: 10, addedAt: '2026-11-02' },
];

const ids = (list) => list.map((product) => product.id);

describe('applyFilters', () => {
  test('sin filtros devuelve todo, con los agotados al final', () => {
    assert.deepEqual(ids(applyFilters(PRODUCTS)), ['a', 'b', 'd', 'e', 'c']);
  });

  test('no modifica la lista original', () => {
    const copy = [...PRODUCTS];
    applyFilters(PRODUCTS, { sort: 'precio-asc' });
    assert.deepEqual(PRODUCTS, copy);
  });

  test('filtra por categoría', () => {
    assert.deepEqual(ids(applyFilters(PRODUCTS, { category: 'manga' })), ['b', 'e', 'c']);
  });

  test('la búsqueda ignora tildes y mayúsculas', () => {
    assert.deepEqual(ids(applyFilters(PRODUCTS, { query: 'PERSEPOLIS' })), ['a']);
  });

  test('la búsqueda incluye al autor y acepta palabras en cualquier orden', () => {
    assert.deepEqual(ids(applyFilters(PRODUCTS, { query: 'oda piece' })), ['b']);
    assert.deepEqual(ids(applyFilters(PRODUCTS, { query: 'borges' })), ['d']);
  });

  test('una búsqueda sin coincidencias devuelve una lista vacía', () => {
    assert.deepEqual(applyFilters(PRODUCTS, { query: 'zzz' }), []);
  });

  test('filtra por precio máximo (inclusive)', () => {
    assert.deepEqual(ids(applyFilters(PRODUCTS, { maxPrice: 9490 })), ['b', 'e']);
  });

  test('"solo disponibles" oculta los agotados', () => {
    assert.ok(!ids(applyFilters(PRODUCTS, { inStock: true })).includes('c'));
  });

  test('combina varios filtros a la vez', () => {
    const result = applyFilters(PRODUCTS, { category: 'manga', inStock: true, maxPrice: 9000 });
    assert.deepEqual(ids(result), ['b']);
  });

  test('ordena por precio, título y novedad', () => {
    assert.deepEqual(ids(applyFilters(PRODUCTS, { sort: 'precio-asc' })), ['b', 'e', 'd', 'c', 'a']);
    assert.deepEqual(ids(applyFilters(PRODUCTS, { sort: 'precio-desc' })), ['a', 'c', 'd', 'e', 'b']);
    assert.deepEqual(ids(applyFilters(PRODUCTS, { sort: 'titulo' })), ['c', 'e', 'd', 'b', 'a']);
    assert.deepEqual(ids(applyFilters(PRODUCTS, { sort: 'novedad' })), ['e', 'a', 'b', 'd', 'c']);
  });

  test('un orden desconocido usa el orden por defecto', () => {
    assert.deepEqual(ids(applyFilters(PRODUCTS, { sort: 'inventado' })), ids(applyFilters(PRODUCTS)));
  });
});

describe('hasActiveFilters', () => {
  test('los valores por defecto no cuentan como filtros', () => {
    assert.equal(hasActiveFilters(DEFAULT_FILTERS), false);
    assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, query: '   ' }), false);
  });

  test('detecta cualquier filtro activo', () => {
    assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, category: 'manga' }), true);
    assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'titulo' }), true);
    assert.equal(hasActiveFilters({ ...DEFAULT_FILTERS, inStock: true }), true);
  });
});

describe('URL: parseFilters / serializeFilters', () => {
  const options = { categories: ['libros', 'manga'] };

  test('lee todos los parámetros válidos', () => {
    const filters = parseFilters('?cat=manga&q=one%20piece&orden=precio-asc&max=10000&stock=1', options);
    assert.deepEqual(filters, {
      category: 'manga',
      query: 'one piece',
      sort: 'precio-asc',
      maxPrice: 10000,
      inStock: true,
    });
  });

  test('ignora valores inválidos o manipulados', () => {
    const filters = parseFilters('?cat=inexistente&orden=hackeado&max=-5&stock=si', options);
    assert.deepEqual(filters, { ...DEFAULT_FILTERS });
  });

  test('limita el largo de la búsqueda', () => {
    const filters = parseFilters(`?q=${'a'.repeat(500)}`, options);
    assert.equal(filters.query.length, 100);
  });

  test('omite los valores por defecto al serializar', () => {
    assert.equal(serializeFilters(DEFAULT_FILTERS), '');
    assert.equal(serializeFilters({ ...DEFAULT_FILTERS, category: 'libros' }), 'cat=libros');
  });

  test('ida y vuelta conserva los filtros', () => {
    const original = { category: 'libros', query: 'año uno', sort: 'novedad', maxPrice: 15000, inStock: true };
    assert.deepEqual(parseFilters(`?${serializeFilters(original)}`, options), original);
  });
});

describe('priceBounds', () => {
  test('redondea al múltiplo del paso', () => {
    assert.deepEqual(priceBounds(PRODUCTS, 1000), { min: 8000, max: 22000 });
  });

  test('catálogo vacío', () => {
    assert.deepEqual(priceBounds([]), { min: 0, max: 0 });
  });
});
