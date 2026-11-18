# Changelog

Todos los cambios relevantes del proyecto se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Planificado
- Checkout con datos del cliente, retiro o despacho, y resumen del pedido (0.7).

## [0.6.0] - 2026-11-18

### Agregado
- **Carrito persistente** guardado en `localStorage`: sobrevive a recargas y se sincroniza en vivo entre pestañas.
- **Panel lateral del carrito** con `<dialog>` nativo: foco atrapado, cierre con Esc o clic en el fondo, y animaciones que respetan `prefers-reduced-motion`.
- Selector de cantidad por producto con tope según stock y `maxQuantityPerItem`. El "−" se convierte en "quitar" en la última unidad.
- Quitar productos y vaciar el carrito con opción de **deshacer**.
- Totales con ahorro en ofertas y **barra de progreso hacia el envío gratis**.
- **Pedido rápido por WhatsApp**: el mensaje incluye productos, autores, cantidades, total y ahorro.
- Botones "Agregar" conectados: confirmación "¡Agregado!", burbuja con las unidades en el carrito y estado "Máximo" al llegar al stock.
- Ajuste automático del carrito guardado si un producto se agota o baja su stock, con aviso al cliente.
- Sistema de **avisos (toasts)** reutilizable: acción opcional, pausa con mouse o foco, máximo tres visibles y región `aria-live`.
- Estado vacío del carrito con acceso directo al catálogo, y contador del header con animación.
- `js/lib/cart.js` (modelo inmutable), `js/lib/order.js` (mensaje) y `js/core/cart-store.js` (estado y persistencia).
- `js/ui/`: iconos, portadas y avisos compartidos entre features.
- 23 tests nuevos (43 en total) para el carrito y el mensaje del pedido.
- Opciones `commerce.maxQuantityPerItem` y `commerce.freeShippingThreshold` en la configuración.

### Cambiado
- La portada y los iconos se movieron de `features/catalog.js` a `js/ui/` para reutilizarlos en el carrito.

## [0.5.0] - 2026-11-17

### Agregado
- Búsqueda en tiempo real desde el header: ignora tildes y mayúsculas, busca en título y autor y acepta palabras en cualquier orden.
- Barra de filtros combinables: chips de categoría, orden (destacados, recientes, precio, título), precio máximo y "Solo disponibles".
- Los filtros se reflejan en la URL (`?cat=manga&q=frieren&orden=precio-asc&max=20000&stock=1`). Un enlace compartido abre el catálogo con esos filtros, y los valores inválidos se ignoran.
- Contador de resultados ("3 de 24 títulos para «vol»") y botón "Limpiar filtros", también disponible en el estado sin resultados.
- `js/lib/filtering.js`: lógica de filtros pura, sin DOM.
- Tests con el test runner de Node (`npm test`), ejecutados también en el workflow de despliegue.
- Opción `catalog.priceFilterStep` en la configuración.

### Cambiado
- El orden por defecto muestra los productos agotados al final.
- La sección Novedades ya no incluye productos agotados.
- La barra de filtros reemplaza el indicador "Mostrando: categoría".
- El workflow de despliegue separa empaquetado y publicación en jobs distintos y usa actions con Node 24.

## [0.4.0] - 2026-11-15

### Agregado
- `config/store.config.js`: configuración central del negocio (marca, contacto, horario, moneda, categorías, modo demo y créditos).
- `js/core/config.js`: mezcla la configuración con valores por defecto, la valida con avisos en consola y la congela.
- `js/core/storage.js`: acceso seguro a `localStorage`.
- `css/tokens.css`: identidad visual aislada en variables, editable sin tocar el resto de los estilos.
- Barra de modo demo, configurable.
- Sección **Novedades** con carril horizontal y scroll-snap.
- Sección **Contacto** con WhatsApp, dirección y horario tomados de la configuración.
- Documentación: guía de personalización, arquitectura y despliegue.
- Workflow de GitHub Actions para publicar en GitHub Pages.
- `LICENSE` (código visible, uso comercial con licencia), `package.json` y `.editorconfig`.

### Cambiado
- JavaScript reorganizado en `core/`, `features/` y `lib/`, con `app.js` como punto de entrada.
- El HTML ya no contiene datos del negocio: nombre, contacto, horario y créditos se cargan desde la configuración.
- Claves de `localStorage` renombradas a `storefront.*`.

## [0.3.0] - 2026-11-15

### Agregado
- Catálogo dinámico desde `data/products.json` (24 productos de ejemplo).
- Carga de datos con límite de espera, validación y caché en memoria.
- Tarjetas de producto con badges, stock bajo, agotados y portada de respaldo generada con CSS.
- Skeletons de carga, estado vacío y estado de error con reintento.
- Tarjetas de categoría con contador y filtrado.

## [0.2.0] - 2026-11-15

### Agregado
- Header fijo y responsivo con navegación, buscador, carrito y menú móvil.
- Resaltado de la sección activa en la navegación.
- Hero con collage de portadas y footer en cuatro columnas.

## [0.1.0] - 2026-11-15

### Agregado
- Estructura base, HTML semántico y SEO básico.
- Design tokens y modo claro/oscuro persistente sin destello al cargar.

[Unreleased]: https://github.com/Nicolasdkr/libreria-online/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/Nicolasdkr/libreria-online/releases/tag/v0.6.0
[0.5.0]: https://github.com/Nicolasdkr/libreria-online/releases/tag/v0.5.0
[0.4.0]: https://github.com/Nicolasdkr/libreria-online/releases/tag/v0.4.0
[0.3.0]: https://github.com/Nicolasdkr/libreria-online/commit/035da45
[0.2.0]: https://github.com/Nicolasdkr/libreria-online/commit/c656eb7
[0.1.0]: https://github.com/Nicolasdkr/libreria-online/commit/0930caa
