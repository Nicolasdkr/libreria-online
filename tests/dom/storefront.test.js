/**
 * Prueba de integración: ejecuta la tienda real (index.html + js/app.js) sobre un
 * DOM simulado con jsdom y recorre el flujo completo de un cliente:
 * catálogo → filtros → carrito → checkout → pedido por WhatsApp.
 *
 * jsdom no dibuja CSS ni ejecuta layout: esta prueba verifica comportamiento,
 * no apariencia. Los tests de un archivo comparten estado y corren en orden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/* ================================ Entorno ================================ */

const errors = [];
const virtualConsole = new VirtualConsole();
// jsdom no implementa la navegación (abrir WhatsApp en otra pestaña): se ignora a propósito
virtualConsole.on('jsdomError', (error) => {
  if (!/Not implemented: navigation/.test(error.message)) errors.push(error.message);
});

const dom = new JSDOM(readFileSync(`${ROOT}index.html`, 'utf8'), {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;

// FormData también se reemplaza: el nativo de Node no acepta formularios de jsdom
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'history', 'location', 'HTMLElement', 'Event', 'Node', 'FormData']) {
  globalThis[key] = window[key];
}

// APIs que jsdom no implementa
window.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.CSS = { escape: (value) => String(value).replace(/["\\]/g, '\\$&') };
window.Element.prototype.scrollIntoView = function () {};
window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
globalThis.fetch = async (url) => ({
  ok: true,
  status: 200,
  json: async () => JSON.parse(readFileSync(`${ROOT}${url}`, 'utf8')),
});
window.addEventListener('error', (event) => errors.push(event.message));

// Carrito de una visita anterior: Berserk (agotado), 4 Astérix (stock 1) y 1984
localStorage.setItem('storefront.cart', JSON.stringify({
  version: 1,
  items: [{ id: 'man-005', qty: 1 }, { id: 'com-006', qty: 4 }, { id: 'lib-004', qty: 1 }],
}));

/* =============================== Helpers =============================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const badge = () => ($('[data-cart-count]').hidden ? 0 : Number($('[data-cart-count]').textContent));
const savedCart = () => JSON.parse(localStorage.getItem('storefront.cart')).items.map((i) => `${i.id}×${i.qty}`);
const toasts = (root = document) => $$('.toast__message', root).map((el) => el.textContent);
const toastAction = (label, root = document) => $$('.toast__action', root).find((el) => el.textContent === label);
const addButton = (id, root = $('[data-product-grid]')) => $(`[data-add-to-cart="${id}"]`, root);
const drawer = () => $('[data-cart-drawer]');
const line = (id) => $(`[data-line-id="${id}"]`, drawer());
const visibleView = () => $$('[data-view]', drawer()).find((el) => !el.hidden)?.dataset.view;

function type(input, value) {
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function choose(name, value) {
  const radio = $(`[name="${name}"][value="${value}"]`, drawer());
  assert.ok(radio, `no existe la opción ${name}=${value}`);
  radio.checked = true;
  radio.dispatchEvent(new window.Event('change', { bubbles: true }));
}

/* ================================ Inicio ================================ */

await import(pathToFileURL(`${ROOT}js/app.js`));
await wait(50);

/* ================================ Tests ================================ */

test('carga el catálogo completo', () => {
  assert.equal($$('[data-product-grid] article').length, 24);
  assert.equal($('[data-results-count]').textContent, '24 títulos');
});

test('ajusta el carrito guardado al stock y avisa', () => {
  assert.deepEqual(savedCart(), ['com-006×1', 'lib-004×1']);
  assert.ok(toasts().some((text) => text.includes('Actualizamos tu carrito')));
  assert.equal(badge(), 2);
});

test('agregar desde una tarjeta suma unidades y da feedback', () => {
  click(addButton('man-001'));
  click(addButton('man-001'));

  assert.ok(savedCart().includes('man-001×2'));
  assert.equal(badge(), 4);
  assert.equal($('.add-btn__label', addButton('man-001')).textContent, '¡Agregado!');
  assert.ok(toastAction('Ver carrito'));
});

test('los botones respetan stock y productos agotados', async () => {
  assert.equal(addButton('com-006').disabled, true);
  assert.equal($('.add-btn__label', addButton('com-006')).textContent, 'Máximo');
  assert.equal($('.add-btn__label', addButton('man-005')).textContent, 'Agotado');

  await wait(1500); // termina el feedback "¡Agregado!"
  assert.ok(addButton('man-001').classList.contains('is-in-cart'));
  assert.equal(addButton('man-001').dataset.qty, '2');
});

test('el panel muestra líneas y totales', () => {
  click($('[data-cart-open]'));

  assert.ok(drawer().hasAttribute('open'));
  assert.equal(visibleView(), 'cart');
  assert.equal($$('.cart-line', drawer()).length, 3);
  assert.equal($('.cart-totals__row dd', drawer()).textContent, '$42.960'); // 11.990 + 12.990 + 2 × 8.990
  assert.match($('.shipping__text', drawer()).textContent, /despacho gratis/);
});

test('cambiar cantidades respeta el máximo', () => {
  click($('[data-qty-inc]', line('man-001')));
  assert.equal($('.qty__value', line('man-001')).textContent, '3');

  click($('[data-qty-dec]', line('man-001')));
  assert.equal($('.qty__value', line('man-001')).textContent, '2');

  assert.equal($('[data-qty-inc]', line('com-006')).disabled, true);
});

test('quitar un producto se puede deshacer desde el aviso del panel', () => {
  click($('[data-line-remove]', line('lib-004')));
  assert.equal(line('lib-004'), null);

  // El aviso debe estar DENTRO del panel: fuera, el <dialog> modal lo dejaría inerte
  click(toastAction('Deshacer', drawer()));
  assert.ok(line('lib-004'));
});

test('vaciar el carrito se puede deshacer', () => {
  click($('[data-cart-clear]', drawer()));
  assert.ok($('.cart-empty', drawer()));
  assert.equal(badge(), 0);

  click(toastAction('Deshacer', drawer()));
  assert.equal(badge(), 4);
});

test('checkout: enviar el formulario vacío muestra errores accesibles', () => {
  sessionStorage.clear();
  click($('[data-checkout-start]', drawer()));
  assert.equal(visibleView(), 'details');
  assert.equal($('[data-drawer-step]', drawer()).textContent, 'Paso 2 de 3');

  click($('[data-checkout-form] [type="submit"]', drawer()));

  const summary = $('[data-form-errors]', drawer());
  assert.equal(summary.hidden, false);
  assert.equal(document.activeElement, summary, 'el foco va al resumen de errores');
  assert.equal($('#co-name', drawer()).getAttribute('aria-invalid'), 'true');
  assert.equal($('#co-name-error', drawer()).textContent, 'Ingresa tu nombre.');
  assert.equal(visibleView(), 'details');
});

test('checkout: los errores se actualizan mientras se corrige', () => {
  type($('#co-name', drawer()), 'Ana Pérez');
  assert.equal($('#co-name-error', drawer()).hidden, true);
  assert.equal($('#co-name', drawer()).hasAttribute('aria-invalid'), false);
});

test('checkout: el despacho pide dirección y oculta pagos solo para retiro', () => {
  choose('delivery', 'pickup');
  assert.ok($('[name="payment"][value="efectivo"]', drawer()), 'efectivo disponible con retiro');
  assert.equal($('[data-shipping-fields]', drawer()).hidden, true);

  choose('payment', 'efectivo');
  choose('delivery', 'shipping');
  assert.equal($('[name="payment"][value="efectivo"]', drawer()), null, 'efectivo no disponible con despacho');
  assert.equal($('[name="payment"]:checked', drawer()), null, 'el pago inválido se deselecciona');
  assert.equal($('[data-shipping-fields]', drawer()).hidden, false);

  click($('[data-checkout-form] [type="submit"]', drawer()));
  assert.equal($('#co-address-error', drawer()).textContent, 'Ingresa la dirección de despacho.');
  assert.equal($('#co-city-error', drawer()).textContent, 'Ingresa tu comuna o ciudad.');
});

test('checkout: con datos válidos pasa a la revisión', () => {
  type($('#co-address', drawer()), 'Av. Siempre Viva 742');
  type($('#co-city', drawer()), 'Ñuñoa');
  choose('payment', 'transferencia');
  $('[name="remember"]', drawer()).checked = true;
  $('[name="remember"]', drawer()).dispatchEvent(new window.Event('change', { bubbles: true }));

  click($('[data-checkout-form] [type="submit"]', drawer()));

  assert.equal(visibleView(), 'review');
  assert.equal($('[data-drawer-step]', drawer()).textContent, 'Paso 3 de 3');
  assert.match($('[data-review-body]', drawer()).textContent, /Av\. Siempre Viva 742, Ñuñoa/);
  assert.match($('[data-order-id]', drawer()).textContent, /^TV-\d{6}-[2-9A-HJ-NP-Z]{4}$/);
});

test('checkout: el enlace de WhatsApp lleva el pedido completo', () => {
  const href = $('[data-checkout-send]', drawer()).href;
  const message = decodeURIComponent(href.split('?text=')[1]);

  assert.ok(href.startsWith('https://wa.me/56900000000?text='));
  assert.match(message, /\*Pedido N\.º TV-/);
  assert.match(message, /2 × One Piece Vol\. 1/);
  assert.match(message, /Despacho a domicilio: ¡gratis!/); // subtotal sobre $30.000
  assert.match(message, /Nombre: Ana Pérez/);
  assert.match(message, /Pago: Transferencia bancaria/);
});

test('checkout: "Recordar mis datos" guarda solo los datos de entrega', () => {
  const remembered = JSON.parse(localStorage.getItem('storefront.customer'));
  assert.equal(remembered.name, 'Ana Pérez');
  assert.equal(remembered.city, 'Ñuñoa');
  assert.equal('notes' in remembered, false);
});

test('checkout: "Volver" regresa al paso anterior con los datos intactos', () => {
  click($('[data-drawer-back]', drawer()));
  assert.equal(visibleView(), 'details');
  assert.equal($('#co-name', drawer()).value, 'Ana Pérez');

  click($('[data-checkout-form] [type="submit"]', drawer()));
  assert.equal(visibleView(), 'review');
});

test('checkout: enviar muestra la confirmación y "Ya lo envié" vacía el carrito', async () => {
  click($('[data-checkout-send]', drawer()));
  await wait(10);
  assert.equal(visibleView(), 'sent');

  click($('[data-checkout-finish]', drawer()));
  await wait(350);

  assert.equal(drawer().hasAttribute('open'), false);
  assert.equal(badge(), 0);
  assert.ok(toasts().some((text) => text.includes('Gracias por tu pedido')));
  assert.ok(localStorage.getItem('storefront.customer'), 'los datos recordados se conservan');
});

test('sincroniza el carrito con otra pestaña', () => {
  localStorage.setItem('storefront.cart', JSON.stringify({ version: 1, items: [{ id: 'ng-001', qty: 3 }] }));
  window.dispatchEvent(new window.StorageEvent('storage', { key: 'storefront.cart' }));
  assert.equal(badge(), 3);
});

test('la búsqueda filtra y conserva el estado del carrito en las tarjetas', async () => {
  type($('[data-search-input]'), 'maus');
  await wait(320);

  assert.equal($$('[data-product-grid] article').length, 1);
  assert.equal(location.search, '?q=maus');
  assert.equal(addButton('ng-001').dataset.qty, '3');
});

test('no hubo errores de JavaScript', () => {
  assert.deepEqual(errors, []);
});
