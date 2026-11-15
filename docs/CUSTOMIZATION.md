# Guía de personalización

Esta guía explica cómo convertir la demo en la tienda de un negocio real. Ninguno de estos pasos requiere modificar la lógica en `js/`.

**Contenido**

1. [Datos del negocio: `config/store.config.js`](#1-datos-del-negocio)
2. [Catálogo: `data/products.json`](#2-catálogo)
3. [Identidad visual: `css/tokens.css`](#3-identidad-visual)
4. [Textos de la página y SEO: `index.html`](#4-textos-de-la-página-y-seo)
5. [Revisión antes de publicar](#5-revisión-antes-de-publicar)

---

## 1. Datos del negocio

Archivo: [`config/store.config.js`](../config/store.config.js)

Todo valor que no definas toma un valor por defecto, y si algo está mal escrito (por ejemplo, un WhatsApp con espacios) verás un aviso en la consola del navegador, que empieza con `[store.config]`.

| Clave | Tipo | Descripción |
| --- | --- | --- |
| `brand.name` | texto | Nombre de la tienda. Se muestra en el header, el footer y el aviso de copyright. |
| `brand.tagline` | texto | Descripción corta que aparece en el footer. |
| `contact.whatsapp` | texto | Número en formato internacional, **solo dígitos**: código de país y número (Chile: `569XXXXXXXX`). |
| `contact.email` | texto | Correo de contacto. Si lo dejas vacío, se oculta. |
| `contact.address` | texto | Dirección física. Si la dejas vacía, se oculta. |
| `hours` | lista | Horario de atención: `{ days, time }` por fila. Se muestra tal cual. |
| `commerce.locale` | texto | Formato regional de los números: `es-CL`, `es-AR`, `es-MX`, `es-ES`… |
| `commerce.currency` | texto | Código ISO 4217 de la moneda: `CLP`, `ARS`, `MXN`, `EUR`, `USD`… |
| `commerce.lowStockThreshold` | número | Desde cuántas unidades se muestra el aviso "¡Quedan N!". |
| `catalog.productsUrl` | texto | Ruta o URL del catálogo en JSON. |
| `catalog.newArrivalsLimit` | número | Cantidad de productos en la sección Novedades. |
| `catalog.categories` | lista | Categorías de la tienda (ver más abajo). |
| `demo.enabled` | sí/no | Muestra la barra superior de demo. **Desactívala al publicar una tienda real.** |
| `credits.enabled` | sí/no | Muestra el crédito del desarrollador en el footer. |

### Categorías

```js
categories: [
  { id: 'libros', label: 'Libros', description: 'Narrativa, clásicos y poesía', hue: 205 },
]
```

- `id`: identificador interno. Debe coincidir **exactamente** con el campo `category` de los productos.
- `label` y `description`: lo que ve el cliente.
- `hue`: tono de color entre 0 y 360 ([selector de tonos](https://hslpicker.com/)). Define el color de la tarjeta de categoría.

Puedes tener de 1 a 6 categorías; la grilla se adapta sola.

---

## 2. Catálogo

Archivo: [`data/products.json`](../data/products.json)

Es una lista de productos. Cada uno tiene esta forma:

```json
{
  "id": "lib-001",
  "title": "Cien años de soledad",
  "author": "Gabriel García Márquez",
  "category": "libros",
  "price": 18990,
  "oldPrice": null,
  "stock": 12,
  "hue": 38,
  "cover": null,
  "tags": ["mas-vendido"],
  "addedAt": "2026-03-02",
  "description": "La saga de los Buendía y el pueblo de Macondo…"
}
```

| Campo | Obligatorio | Descripción |
| --- | --- | --- |
| `id` | ✅ | Identificador único. No lo cambies una vez publicado, porque los carritos guardados lo usan. |
| `title` | ✅ | Título del producto. |
| `category` | ✅ | Debe coincidir con el `id` de una categoría de la configuración. |
| `price` | ✅ | Precio como número, **sin puntos ni símbolo**: `18990`, no `"$18.990"`. |
| `author` | | Autor, autora o editorial. |
| `oldPrice` | | Precio anterior. Si es mayor que `price`, se muestra tachado con el porcentaje de descuento. |
| `stock` | | Unidades disponibles. Con `0` el producto aparece como **Agotado** y no se puede agregar al carrito. |
| `cover` | | Ruta de la imagen de portada, por ejemplo `assets/img/covers/lib-001.webp`. Con `null` se genera una portada con CSS. |
| `hue` | | Tono de la portada generada (0–360). |
| `tags` | | Etiquetas: `"nuevo"` y `"mas-vendido"`. La etiqueta de oferta se calcula sola a partir de `oldPrice`. |
| `addedAt` | | Fecha de ingreso (`AAAA-MM-DD`). Ordena la sección Novedades. |
| `description` | | Texto para la vista de detalle. |

Si un producto no tiene los campos obligatorios, se descarta y se muestra un aviso en la consola, en lugar de romper la página.

### Imágenes de portada

- Formato recomendado: **WebP**, proporción 2:3 (por ejemplo 400 × 600 px) y menos de 60 KB.
- Ubicación: `assets/img/covers/`.
- Si una imagen falla al cargar, la tienda muestra automáticamente la portada generada con CSS.

### Validar el JSON

Un error de sintaxis (una coma de más, por ejemplo) impide cargar el catálogo y la tienda muestra el estado de error. Antes de publicar, pega el contenido en un validador como [jsonlint.com](https://jsonlint.com/) o ábrelo en VS Code, que marca los errores.

---

## 3. Identidad visual

Archivo: [`css/tokens.css`](../css/tokens.css)

Todos los estilos consumen las variables de este archivo. Lo más común es cambiar:

```css
:root {
  --color-accent:       #c8402a;  /* color principal de la marca */
  --color-accent-hover: #a83421;  /* el mismo color, un poco más oscuro */
  --color-on-accent:    #ffffff;  /* texto sobre el color principal */
}
```

- **Tema oscuro:** está definido dos veces en el mismo archivo, una para la preferencia del sistema y otra para la elección manual. Si cambias un color oscuro, cámbialo en **ambos bloques**.
- **Contraste:** verifica que el texto sobre `--color-accent` cumpla la norma WCAG AA (relación de 4,5:1) con un [verificador de contraste](https://webaim.org/resources/contrastchecker/).
- **Tipografías:** cambia `--font-display` y `--font-body`, y actualiza el `<link>` de Google Fonts en `index.html`.
- **Favicon y logo:** el favicon está en `assets/favicon.svg`. El logo es un SVG en línea dentro del header y del footer de `index.html`.

---

## 4. Textos de la página y SEO

Archivo: [`index.html`](../index.html)

Hay textos que van directamente en el HTML porque los buscadores y las redes sociales los leen sin ejecutar JavaScript:

- `<title>` y `<meta name="description">`: lo que aparece en Google.
- Etiquetas `og:*`: la vista previa al compartir el enlace por WhatsApp o redes sociales. La imagen debería medir 1200 × 630 px.
- **Hero:** título, bajada y las tres cifras destacadas.
- **Contacto:** título y bajada de la sección.

> [!IMPORTANT]
> Las cifras del hero de la demo ("+1.200 títulos", "4,9 ★") son ficticias. Reemplázalas por datos reales del negocio o elimínalas.

---

## 5. Revisión antes de publicar

- [ ] `demo.enabled: false` en `store.config.js`.
- [ ] WhatsApp real, probado desde un celular.
- [ ] Correo, dirección y horario reales (o vacíos).
- [ ] Moneda y formato regional correctos.
- [ ] Productos de ejemplo reemplazados y JSON validado.
- [ ] Colores y tipografías de la marca en `tokens.css`, con contraste verificado.
- [ ] `<title>`, descripción e imagen Open Graph actualizados en `index.html`.
- [ ] Cifras del hero reales o eliminadas.
- [ ] Favicon propio.
- [ ] Probado en un celular real y en modo oscuro.

Para publicar la tienda, sigue [DEPLOYMENT.md](DEPLOYMENT.md).
