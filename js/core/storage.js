/**
 * core/storage.js — Envoltorio seguro sobre localStorage.
 *
 * localStorage puede lanzar excepciones (modo privado, cuota llena, cookies bloqueadas).
 * Este módulo las absorbe para que la tienda siga funcionando aunque no pueda persistir datos.
 * Los valores se guardan como JSON.
 */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* sin almacenamiento disponible: nada que borrar */
    }
  },
};
