/**
 * main.js — Punto de entrada. Inicializa los módulos de la página.
 */
import { CONFIG } from './config.js';
import { initTheme } from './theme.js';
import { initNav } from './nav.js';

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

function init() {
  applyConfig();
  initTheme(document.querySelector('[data-theme-toggle]'));
  initNav();
}

// Los módulos se ejecutan con "defer" implícito: el DOM ya está listo.
init();
