/**
 * features/store-info.js — Vuelca los datos de la tienda (store.config.js) en el HTML.
 *
 * Usa atributos data-* como puntos de enlace, así el HTML queda libre de datos
 * del negocio y una misma plantilla sirve para cualquier tienda.
 */
import { CONFIG } from '../core/config.js';
import { escapeHTML, whatsappUrl } from '../lib/utils.js';

const $$ = (selector) => document.querySelectorAll(selector);

function bindBrand() {
  $$('[data-store-name]').forEach((el) => (el.textContent = CONFIG.brand.name));
  $$('[data-store-tagline]').forEach((el) => (el.textContent = CONFIG.brand.tagline));
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

function bindContact() {
  const { whatsapp, email, address } = CONFIG.contact;

  $$('[data-whatsapp-link]').forEach((el) => {
    if (whatsapp) el.href = whatsappUrl(whatsapp);
    else el.hidden = true;
  });

  const items = [
    whatsapp && `<li><a href="${whatsappUrl(whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></li>`,
    email && `<li><a href="mailto:${escapeHTML(email)}">${escapeHTML(email)}</a></li>`,
    address && `<li><address>${escapeHTML(address)}</address></li>`,
  ].filter(Boolean);

  $$('[data-store-contact]').forEach((el) => (el.innerHTML = items.join('')));
}

function bindHours() {
  const items = CONFIG.hours
    .map(({ days, time }) => `<li><span>${escapeHTML(days)}</span> <span>${escapeHTML(time)}</span></li>`)
    .join('');

  $$('[data-store-hours]').forEach((el) => (el.innerHTML = items));
}

function bindDemoBar() {
  const bar = document.querySelector('[data-demo-bar]');
  if (!bar || !CONFIG.demo.enabled) return;

  bar.querySelector('[data-demo-message]').textContent = CONFIG.demo.message;

  const cta = bar.querySelector('[data-demo-cta]');
  if (CONFIG.demo.ctaUrl) {
    cta.href = CONFIG.demo.ctaUrl;
    cta.textContent = CONFIG.demo.ctaLabel || 'Más información';
  } else {
    cta.remove();
  }

  bar.hidden = false;
}

function bindCredits() {
  const el = document.querySelector('[data-credits]');
  if (!el) return;

  const { enabled, label, name, url } = CONFIG.credits;
  if (!enabled || !name) {
    el.remove();
    return;
  }

  el.innerHTML = url
    ? `${escapeHTML(label)} <a href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(name)}</a>`
    : `${escapeHTML(label)} ${escapeHTML(name)}`;
}

export function initStoreInfo() {
  bindBrand();
  bindContact();
  bindHours();
  bindDemoBar();
  bindCredits();
}
