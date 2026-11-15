/**
 * config.js — Configuración central de la tienda.
 * Para adaptar la demo a un cliente real, normalmente basta con editar este archivo.
 */
export const CONFIG = Object.freeze({
  storeName: 'Tinta & Viñeta',

  // Número de WhatsApp en formato internacional, solo dígitos (código país + número).
  // Es un número de DEMOSTRACIÓN: reemplázalo por el real del cliente.
  whatsappNumber: '56900000000',

  // Formato de moneda (Intl.NumberFormat)
  locale: 'es-CL',
  currency: 'CLP',

  // Crédito del desarrollador en el footer
  developer: {
    name: 'Tu Nombre',
    url: 'https://github.com/tu-usuario',
  },

  // Claves de localStorage (con prefijo para no chocar con otras apps en el mismo dominio)
  storageKeys: {
    theme: 'tv-theme',
    cart: 'tv-cart',
  },

  // Ruta del catálogo
  productsUrl: 'data/products.json',

  // Categorías de la tienda (el id coincide con "category" en products.json)
  categories: [
    { id: 'libros', label: 'Libros', description: 'Narrativa, clásicos y poesía', hue: 205 },
    { id: 'manga', label: 'Manga', description: 'Shōnen, seinen y lo último de Japón', hue: 350 },
    { id: 'comics', label: 'Cómics', description: 'Superhéroes, humor e historieta', hue: 42 },
    { id: 'novela-grafica', label: 'Novela gráfica', description: 'Historias de autor en viñetas', hue: 160 },
  ],
});
