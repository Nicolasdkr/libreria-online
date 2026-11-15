/**
 * features/nav.js — Header: menú móvil, sombra al hacer scroll y resaltado de la sección activa.
 */
const MOBILE_QUERY = window.matchMedia('(max-width: 900px)');

function initMobileMenu(header) {
  const toggle = header.querySelector('[data-menu-toggle]');
  const nav = document.getElementById(toggle?.getAttribute('aria-controls'));
  if (!toggle || !nav) return;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Al elegir un enlace, cerramos el menú
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  // Esc cierra y devuelve el foco al botón
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Clic fuera del header
  document.addEventListener('click', (event) => {
    if (isOpen() && !header.contains(event.target)) setOpen(false);
  });

  // Al pasar a escritorio el menú deja de ser desplegable
  MOBILE_QUERY.addEventListener('change', (event) => {
    if (!event.matches) setOpen(false);
  });
}

function initScrollShadow(header) {
  let ticking = false;
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
  update();
}

/** Marca con aria-current el enlace de la sección que está en pantalla. */
function initScrollSpy(header) {
  const links = [...header.querySelectorAll('.main-nav a[href^="#"]')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    },
    // Una sección está "activa" cuando cruza la franja central de la pantalla
    { rootMargin: '-45% 0px -50% 0px' },
  );

  sections.forEach((section) => observer.observe(section));
}

export function initNav() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  initMobileMenu(header);
  initScrollShadow(header);
  initScrollSpy(header);
}
