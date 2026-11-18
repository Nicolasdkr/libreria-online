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
| `commerce.maxQuantityPerItem` | número | Máximo de unidades de un mismo producto en el carrito (además del stock). |
| `commerce.freeShippingThreshold` | número o `null` | Monto desde el que el envío es gratis; muestra una barra de progreso en el carrito. Con `null` no se muestra. |
| `catalog.productsUrl` | texto | Ruta o URL del catálogo en JSON. |
| `catalog.newArrivalsLimit` | número | Cantidad de productos en la sección Novedades. |
| `catalog.priceFilterStep` | número | Salto del filtro de precio máximo: `1000` para CLP o ARS, `1` para USD o EUR. |
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

### Checkout: entrega, pago y número de pedido

```js
checkout: {
  orderPrefix: 'TV',
  delivery: {
    pickup:   { enabled: true, label: 'Retiro en tienda', note: '' },
    shipping: { enabled: true, label: 'Despacho a domicilio', cost: 3990, note: 'Región Metropolitana · 24 a 48 horas hábiles' },
  },
  paymentMethods: [
    { id: 'transferencia', label: 'Transferencia bancaria', note: 'Te enviamos los datos por WhatsApp' },
    { id: 'efectivo', label: 'Efectivo', note: 'Solo al retirar en tienda', pickupOnly: true },
  ],
  notesMaxLength: 300,
}
```

| Clave | Descripción |
| --- | --- |
| `orderPrefix` | Prefijo del número de pedido. Con `'TV'` los pedidos se ven como `TV-261118-4K7Q` (fecha y cuatro caracteres sin letras ambiguas, fáciles de dictar). |
| `delivery.pickup` | Retiro en tienda. Si `note` está vacío, se muestra `contact.address`. |
| `delivery.shipping` | Despacho. `cost` es un monto fijo; desde `commerce.freeShippingThreshold` el despacho es gratis. |
| `enabled` | Activa o desactiva cada forma de entrega. Si solo hay una activa, queda preseleccionada. |
| `paymentMethods` | Medios de pago en el orden en que se muestran. `pickupOnly: true` lo oculta cuando el cliente elige despacho. |
| `notesMaxLength` | Largo máximo de la nota opcional para la tienda. |

Debe haber al menos una forma de entrega y un medio de pago activos; si no, la consola muestra un aviso. El checkout no cobra: el mensaje de WhatsApp lleva el pedido y la tienda confirma el total y el pago por chat.

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
| `id` | ✅ | Identificador único. No lo cambies una vez publicado: los carritos guardados en el navegador de tus clientes lo usan, y un id nuevo los dejaría sin ese producto. |
| `title` | ✅ | Título del producto. |
| `category` | ✅ | Debe coincidir con el `id` de una categoría de la configuración. |
| `price` | ✅ | Precio como número, **sin puntos ni símbolo**: `18990`, no `"$18.990"`. |
| `author` | | Autor, autora o editorial. |
| `oldPrice` | | Precio anterior. Si es mayor que `price`, se muestra tachado con el porcentaje de descuento. |
| `stock` | | Unidades disponibles. Con `0` el producto aparece como **Agotado** y no se puede agregar al carrito. Si un cliente ya lo tenía en su carrito, se quita automáticamente con un aviso. |
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
- [ ] WhatsApp real, probado desde un celular con un pedido de prueba desde el carrito.
- [ ] Monto de envío gratis real, o `freeShippingThreshold: null` si no aplica.
- [ ] Formas de entrega, costo de despacho y medios de pago reales en `checkout`.
- [ ] Pedido de prueba completo: con retiro, con despacho y con un error a propósito en el formulario.
- [ ] Correo, dirección y horario reales (o vacíos).
- [ ] Moneda y formato regional correctos.
- [ ] Productos de ejemplo reemplazados y JSON validado.
- [ ] Colores y tipografías de la marca en `tokens.css`, con contraste verificado.
- [ ] `<title>`, descripción e imagen Open Graph actualizados en `index.html`.
- [ ] Cifras del hero reales o eliminadas.
- [ ] Favicon propio.
- [ ] Probado en un celular real y en modo oscuro.

Para publicar la tienda, sigue [DEPLOYMENT.md](DEPLOYMENT.md).
