/**
 * ui/icons.js — Iconos SVG de trazo, compartidos por toda la interfaz.
 * Heredan el color del texto (currentColor) y son decorativos (aria-hidden):
 * el texto accesible lo aporta siempre el botón o el elemento que los contiene.
 */
const PATHS = {
  bag: '<path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  chat: '<path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
};

const SIZES = { sm: ' icon--sm', md: '', lg: ' icon--lg' };

/**
 * @param {keyof PATHS} name
 * @param {'sm' | 'md' | 'lg'} [size]
 */
export function icon(name, size = 'md') {
  return `<svg class="icon${SIZES[size] ?? ''}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] ?? ''}</svg>`;
}
