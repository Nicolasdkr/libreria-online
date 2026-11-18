/**
 * ui/toast.js — Avisos breves no bloqueantes, con acción opcional (ej. "Deshacer").
 *
 * Accesibilidad:
 * - Se anuncian en una región aria-live="polite" que existe antes del primer aviso
 *   (si se creara junto con el aviso, algunos lectores de pantalla no lo leerían).
 * - El temporizador se pausa con el mouse encima o con el foco dentro del aviso.
 * - Si hay un <dialog> modal abierto, el aviso se muestra dentro de él; fuera
 *   quedaría inerte (no se podría pulsar "Deshacer").
 */
import { icon } from './icons.js';

const DEFAULT_DURATION = 5000;
const MAX_VISIBLE = 3;

/** Crea (una sola vez) la región de avisos dentro de `host`. */
export function ensureToastRegion(host = document.body) {
  let region = host.querySelector(':scope > .toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-relevant', 'additions');
    host.append(region);
  }
  return region;
}

function currentRegion() {
  const host = document.querySelector('dialog[open]') ?? document.body;
  return ensureToastRegion(host);
}

/**
 * @param {{ message: string, actionLabel?: string, onAction?: () => void,
 *           variant?: 'default' | 'success' | 'warning', duration?: number }} options
 * @returns {{ dismiss: () => void }}
 */
export function showToast({ message, actionLabel, onAction, variant = 'default', duration = DEFAULT_DURATION }) {
  const region = currentRegion();
  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.innerHTML = `
    <p class="toast__message"></p>
    ${actionLabel ? '<button class="toast__action" type="button"></button>' : ''}
    <button class="toast__close" type="button" aria-label="Cerrar aviso">${icon('close', 'sm')}</button>`;

  // textContent: el mensaje puede incluir títulos del catálogo
  toast.querySelector('.toast__message').textContent = message;
  if (actionLabel) toast.querySelector('.toast__action').textContent = actionLabel;

  /* ---------- Temporizador con pausa ---------- */
  let timer = null;
  let remaining = duration;
  let startedAt = 0;
  let paused = false;
  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timer);
    toast.classList.add('is-leaving');
    const remove = () => toast.remove();
    toast.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 400); // respaldo si la animación no corre
  }

  function start() {
    startedAt = Date.now();
    timer = setTimeout(dismiss, remaining);
  }

  function pause() {
    if (paused || dismissed) return;
    paused = true;
    clearTimeout(timer);
    remaining = Math.max(1000, remaining - (Date.now() - startedAt));
  }

  function resume() {
    if (!paused || dismissed) return;
    paused = false;
    start();
  }

  toast.addEventListener('mouseenter', pause);
  toast.addEventListener('mouseleave', resume);
  toast.addEventListener('focusin', pause);
  toast.addEventListener('focusout', (event) => {
    if (!toast.contains(event.relatedTarget)) resume();
  });

  toast.querySelector('.toast__close').addEventListener('click', dismiss);
  toast.querySelector('.toast__action')?.addEventListener('click', () => {
    onAction?.();
    dismiss();
  });

  region.append(toast);
  while (region.children.length > MAX_VISIBLE) region.firstElementChild.remove();
  start();

  return { dismiss };
}
