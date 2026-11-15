/**
 * main.js — Punto de entrada. Inicializa los módulos de la página.
 */
import { CONFIG } from './config.js';
import { initTheme } from './theme.js';

function applyStoreName() {
  document.querySelectorAll('[data-store-name]').forEach((el) => {
    el.textContent = CONFIG.storeName;
  });
}

function init() {
  applyStoreName();
  initTheme(document.querySelector('[data-theme-toggle]'));
}

// Los módulos se ejecutan con "defer" implícito: el DOM ya está listo.
init();
