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
        ├──────────────► js/lib/utils.js        Funciones puras: formato de precio, escape, debounce
        │
        ├──────────────► js/core/api.js         fetchProducts(): obtiene y valida el catálogo
        │
        └──────────────► js/features/*          Presentación e interacción
                           ├─ store-info.js     Vuelca nombre, contacto y horario en el DOM
                           ├─ theme.js          Modo claro/oscuro
                           ├─ nav.js            Menú móvil, sombra del header, sección activa
                           └─ catalog.js        Tarjetas, categorías, skeletons, estados

js/app.js                       Punto de entrada: inicializa features y guarda el estado compartido
```

### Reglas de dependencia

- `core/` y `lib/` **nunca** importan desde `features/`.
- Los módulos de `features/` **no se importan entre sí**: se comunican a través de `app.js`.
- Solo `core/config.js` importa `config/store.config.js`. El resto usa `CONFIG`.
- `catalog.js` es presentación pura: recibe una lista y la dibuja. Decidir *qué* productos mostrar (filtros, orden) corresponde a `app.js` y, a partir de la versión 0.5, a un módulo de filtros.

## Flujo de datos

```
fetchProducts()  ──►  state.products  ──►  visibleProducts()  ──►  renderProducts(grid, lista)
                          (app.js)          (categoría activa)        (features/catalog.js)
                                                    ▲
                     clic en categoría ─────────────┘
```

1. `app.js` muestra skeletons y llama a `fetchProducts()`.
2. `api.js` descarga el JSON con un límite de espera, descarta los productos inválidos y guarda el resultado en memoria.
3. `app.js` guarda los productos en `state`, calcula la lista visible y se la pasa a `catalog.js`.
4. Cada interacción (por ejemplo, elegir una categoría) actualiza `state` y vuelve a llamar a la función de render.

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
4. Inicialízala en `init()` de `app.js`.
5. Agrega los estilos en el archivo CSS que corresponda, usando solo variables de `tokens.css`.
6. Registra el cambio en `CHANGELOG.md`.

## Almacenamiento local

| Clave | Contenido | Módulo |
| --- | --- | --- |
| `storefront.theme` | `"light"` o `"dark"` | `features/theme.js` y el script inline de `index.html` |
| `storefront.cart` | Carrito (a partir de la 0.6) | — |

Todo acceso pasa por `core/storage.js`, que absorbe los errores del navegador.
