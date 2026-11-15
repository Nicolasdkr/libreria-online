/**
 * features/theme.js — Modo claro/oscuro.
 *
 * - Sin elección guardada: sigue la preferencia del sistema (y reacciona si cambia).
 * - Con elección manual: se guarda en localStorage y tiene prioridad.
 * El tema inicial lo aplica un script inline en <head> para evitar el destello.
 */
import { STORAGE_KEYS } from '../core/config.js';
import { storage } from '../core/storage.js';

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const isTheme = (value) => value === 'dark' || value === 'light';

/** Tema que se está viendo realmente (elección manual o, si no hay, el del sistema). */
export function getEffectiveTheme() {
  return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
}

function updateToggle(button) {
  const isDark = getEffectiveTheme() === 'dark';
  button.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  button.setAttribute('aria-pressed', String(isDark));
}

export function initTheme(button) {
  if (!button) return;

  updateToggle(button);

  button.addEventListener('click', () => {
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    storage.set(STORAGE_KEYS.theme, next);
    updateToggle(button);
  });

  // Si el usuario nunca eligió, seguimos al sistema en vivo.
  systemDark.addEventListener('change', () => {
    if (!isTheme(storage.get(STORAGE_KEYS.theme))) updateToggle(button);
  });
}
