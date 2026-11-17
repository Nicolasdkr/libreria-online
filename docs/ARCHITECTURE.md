# Arquitectura

Este documento describe cómo está organizado el código, por qué, y cómo extenderlo sin romper lo existente.

## Principios

1. **Plataforma web estándar, sin build.** HTML, CSS y JavaScript (ES Modules) que el navegador ejecuta tal cual. No hay `node_modules`, ni bundler, ni versiones de framework que actualizar. Cualquier hosting estático sirve.
2. **Configuración separada del código.** Lo que cambia entre negocios (datos, catálogo, marca) vive en `config/`, `data/` y `css/tokens.css`. Lo que es igual para todos vive en `js/` y en el resto de `css/`.
3. **Capas con responsabilidades claras.** Datos, presentación y coordinación están separados, así cada parte se puede reemplazar sin tocar las demás.
4. **Mejora progresiva y robustez.** Si `localStorage` está bloqueado, el catálogo falla o una imagen no carga, la tienda sigue funcionando y muestra un estado comprensible.

## Mapa de módulos

```
config/store.config.js          Datos del negocio (editable por el cliente)
        │
        ▼
js/core/config.js               Mezcla con valores por defecto → valida → congela → CONFIG
        │
        ├──────────────► js/lib/*               Lógica pura, sin DOM (cubierta por tests/)
        │                  ├─ utils.js          Formato de precio, escape, normalización, debounce
        │                  └─ filtering.js      Filtrar, ordenar, leer y escribir filtros en la URL
        │
        ├──────────────► js/core/api.js         fetchProducts(): obtiene y valida el catálogo
        │
        └──────────────► js/features/*          Presentación e interacción
                           ├─ store-info.js     Vuelca nombre, contacto y horario en el DOM
                           ├─ theme.js          Modo claro/oscuro
                           ├─ nav.js            Menú móvil, sombra del header, sección activa
                           ├─ filters.js        Barra de filtros (chips, orden, precio, stock)
                           └─ catalog.js        Tarjetas, categorías, skeletons, estados

js/app.js                       Punto de entrada: inicializa features y guarda el estado compartido
```

### Reglas de dependencia

- `core/` y `lib/` **nunca** importan desde `features/`.
- Los módulos de `features/` **no se importan entre sí**: se comunican a través de `app.js`.
- Solo `core/config.js` importa `config/store.config.js`. El resto usa `CONFIG`.
- `catalog.js` y `filters.js` son presentación: dibujan y avisan de las interacciones con callbacks. Decidir *qué* productos mostrar es tarea de `lib/filtering.js`, y `app.js` lo coordina.

## Flujo de datos

```
 buscador · chips · orden · precio · tarjetas de categoría
                         │
                         ▼
                 setFilters(patch)                         (app.js)
                         │
           ┌─────────────┴──────────────┐
           ▼                            ▼
  state.filters ──► URL         applyFilters(products, filters)   (lib/filtering.js)
  (replaceState)                        │
                                        ▼
                         renderProducts(grid, lista)       (features/catalog.js)
                         filterBar.sync(filters)           (features/filters.js)
```

1. Al iniciar, `app.js` lee los filtros desde la URL con `parseFilters()`, muestra skeletons y llama a `fetchProducts()`.
2. `api.js` descarga el JSON con un límite de espera, descarta los productos inválidos y guarda el resultado en memoria.
3. Cada interacción llama a `setFilters()` con solo lo que cambió. `app.js` actualiza `state.filters`, lo escribe en la URL y vuelve a dibujar.
4. `applyFilters()` devuelve una lista nueva, ya filtrada y ordenada, sin modificar `state.products`.
5. Los controles no guardan estado propio: `filterBar.sync()` los alinea con `state.filters`, así nunca muestran algo distinto a lo filtrado.

### Filtros en la URL

| Parámetro | Ejemplo | Significado |
| --- | --- | --- |
| `cat` | `cat=manga` | Categoría (debe existir en la configuración) |
| `q` | `q=one%20piece` | Búsqueda por título o autor (máximo 100 caracteres) |
| `orden` | `orden=precio-asc` | `destacados`, `novedad`, `precio-asc`, `precio-desc` o `titulo` |
| `max` | `max=20000` | Precio máximo |
| `stock` | `stock=1` | Solo productos disponibles |

Los valores por defecto no se escriben en la URL, y los inválidos se ignoran. Se usa `history.replaceState` para no llenar el historial con cada tecla.

## Tests

La lógica pura de `js/lib/` se prueba con el test runner integrado de Node, sin dependencias:

```bash
npm test
```

Los tests están en `tests/` y se ejecutan en el workflow de despliegue antes de publicar: si alguno falla, la versión no se publica. Al agregar lógica nueva, conviene escribirla como función pura en `lib/` y testearla ahí; los módulos de `features/` deberían limitarse a conectar esa lógica con el DOM.

## Contrato de la capa de datos

`fetchProducts()` debe devolver una `Promise<Product[]>`:

```ts
interface Product {
  id: string;            // único y estable
  title: string;
  category: string;      // = id de una categoría en la configuración
  price: number;         // en la unidad de la moneda configurada, sin decimales para CLP
  author?: string;
  oldPrice?: number | null;
  stock?: number;
  cover?: string | null;
  hue?: number;
  tags?: Array<'nuevo' | 'mas-vendido'>;
  addedAt?: string;      // ISO 8601: AAAA-MM-DD
  description?: string;
}
```

### Cambiar la fuente de datos

Como solo `core/api.js` sabe de dónde vienen los productos, conectar un backend o un CMS headless se reduce a reescribir `fetchProducts()`:

```js
// core/api.js — ejemplo con una API REST
export async function fetchProducts() {
  const response = await fetch('https://api.mitienda.cl/products');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { items } = await response.json();
  return items.map((item) => ({
    id: String(item.sku),
    title: item.name,
    category: item.category_slug,
    price: item.price,
    stock: item.inventory,
    cover: item.image_url,
  }));
}
```

El resto de la aplicación no cambia.

## Convenciones

### HTML y JavaScript

- **Los ganchos de JavaScript son atributos `data-*`** (`data-product-grid`, `data-cart-open`), nunca clases. Así se pueden cambiar los estilos sin romper el comportamiento, y al revés.
- **Todo dato externo pasa por `escapeHTML()`** antes de insertarse con `innerHTML`.
- **Accesibilidad como parte del componente:** cada botón con solo icono tiene `aria-label`, los estados dinámicos usan `aria-live` o `aria-busy`, y los elementos decorativos llevan `aria-hidden="true"`.
- **Sin estado global implícito:** el estado compartido vive en el objeto `state` de `app.js`.

### CSS

- **Nombres BEM:** `.bloque__elemento--modificador`, por ejemplo `.product-card__title` o `.btn--primary`.
- **Sin valores de marca fuera de `tokens.css`:** colores, fuentes, radios y sombras se consumen como `var(--…)`.
- **Orden de carga:** `tokens` → `base` → `layout` → `components` → `catalog` → `utilities`. Las utilidades van al final para poder sobrescribir.
- **Responsivo:** media queries para el layout de la página y container queries para que los componentes se adapten a su propio espacio.

## Cómo agregar una funcionalidad

1. Crea `js/features/mi-feature.js` y exporta una función `initMiFeature()`.
2. Si necesita datos de la tienda, importa `CONFIG` desde `../core/config.js`. Si es configurable, agrega la clave con su valor por defecto en `DEFAULTS` y documéntala en `docs/CUSTOMIZATION.md`.
3. Conecta el HTML con atributos `data-*`.
4. Si tiene lógica no trivial, sepárala en una función pura dentro de `js/lib/` y agrega sus tests en `tests/`.
5. Inicialízala en `init()` de `app.js`.
6. Agrega los estilos en el archivo CSS que corresponda, usando solo variables de `tokens.css`.
7. Registra el cambio en `CHANGELOG.md`.

## Almacenamiento local

| Clave | Contenido | Módulo |
| --- | --- | --- |
| `storefront.theme` | `"light"` o `"dark"` | `features/theme.js` y el script inline de `index.html` |
| `storefront.cart` | Carrito (a partir de la 0.6) | — |

Todo acceso pasa por `core/storage.js`, que absorbe los errores del navegador.
