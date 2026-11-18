/**
 * core/storage.js — Envoltorio seguro sobre localStorage y sessionStorage.
 *
 * El almacenamiento del navegador puede lanzar excepciones (modo privado, cuota
 * llena, cookies bloqueadas). Este módulo las absorbe para que la tienda siga
 * funcionando aunque no pueda persistir datos. Los valores se guardan como JSON.
 *
 *  · storage         → localStorage: persiste entre visitas (tema, carrito, datos recordados)
 *  · sessionStorage  → solo mientras la pestaña está abierta (borrador del checkout)
 */
function createStorage(getBackend) {
  return {
    get(key, fallback = null) {
      try {
        const raw = getBackend().getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        getBackend().setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      try {
        getBackend().removeItem(key);
      } catch {
        /* sin almacenamiento disponible: nada que borrar */
      }
    },
  };
}

export const storage = createStorage(() => window.localStorage);
export const sessionStore = createStorage(() => window.sessionStorage);
