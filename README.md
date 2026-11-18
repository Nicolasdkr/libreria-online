<div align="center">

# 📚 Librería Online · Storefront

**Tienda online lista para usar para librerías, tiendas de cómics y negocios con catálogo, con pedidos directos por WhatsApp.**

Sin backend, sin comisiones por venta, sin dependencias. Se configura en tres archivos y se publica gratis.

[**Ver demo en vivo**](https://nicolasdkr.github.io/libreria-online/) · [Guía de personalización](docs/CUSTOMIZATION.md) · [Arquitectura](docs/ARCHITECTURE.md) · [Despliegue](docs/DEPLOYMENT.md)

![Versión](https://img.shields.io/badge/versión-0.7.0-c8402a)
![Licencia](https://img.shields.io/badge/licencia-uso%20comercial%20con%20permiso-1f4e79)
![Dependencias en producción](https://img.shields.io/badge/dependencias%20en%20producción-0-2f7d4f)
![Tests](https://img.shields.io/badge/tests-84-2f7d4f)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)

</div>

---

## ¿Qué es?

**Librería Online Storefront** es una base de tienda online pensada para negocios pequeños y medianos que venden por WhatsApp y necesitan una vitrina profesional sin pagar plataformas de e-commerce ni mantener un servidor.

El cliente final navega el catálogo, filtra, arma su carrito y envía el pedido ya redactado al WhatsApp del negocio. El negocio recibe el detalle completo y cierra la venta por chat, como ya lo hace hoy.

La demo usa la marca ficticia **Tinta & Viñeta**: todo su contenido (nombre, productos, contacto, colores) se reemplaza por configuración, sin tocar la lógica.

### Para quién es

| Perfil | Qué obtiene |
| --- | --- |
| **Librerías, tiendas de cómics, papelerías** | Catálogo online con su marca, listo en un día y con hosting gratuito. |
| **Freelancers y agencias** | Una base probada para entregar tiendas a clientes sin empezar desde cero. |
| **Equipos técnicos** | Código modular, sin framework y documentado, fácil de auditar y extender. |

## Características

- **Catálogo dinámico** desde un JSON: tarjetas con badges de oferta, novedad y más vendido, aviso de stock bajo y productos agotados.
- **Categorías configurables** con contador de títulos y filtrado inmediato.
- **Búsqueda en tiempo real** por título o autor que ignora tildes y mayúsculas y acepta palabras en cualquier orden.
- **Filtros combinables**: categoría, orden, precio máximo y solo disponibles, con contador de resultados.
- **Búsquedas compartibles**: los filtros viven en la URL (`?cat=manga&q=frieren`), así cualquier búsqueda se puede enviar por enlace.
- **Carrito persistente** en un panel lateral accesible: sobrevive a recargas, se sincroniza entre pestañas y respeta el stock disponible.
- **Edición del carrito sin fricción**: cambiar cantidades, quitar o vaciar con opción de **deshacer**, ahorro en ofertas y barra de progreso hacia el envío gratis.
- **Checkout en tres pasos** dentro del mismo panel: carrito → datos de entrega → revisión. Incluye retiro en tienda o despacho con costo, despacho gratis desde un monto, medios de pago según la forma de entrega y nota para la tienda.
- **Formulario accesible**: mensajes de error claros y enlazados a cada campo, resumen de errores con foco automático y validación que se actualiza mientras el cliente corrige.
- **Pedido por WhatsApp** con número de pedido, productos, desglose de totales y datos de entrega, listo para enviar.
- **Datos del cliente bajo su control**: el borrador se conserva mientras la pestaña está abierta, y los datos solo se recuerdan en el dispositivo si el cliente lo elige.
- **Carrito siempre al día**: si un producto guardado se agota o baja su stock, el carrito se ajusta solo y avisa al cliente.
- **Avisos no intrusivos** (toasts) con acciones, pausa al pasar el mouse y anuncio para lectores de pantalla.
- **Sección de novedades** en un carril horizontal con scroll-snap.
- **Modo claro y oscuro** que respeta la preferencia del sistema, recuerda la elección y no produce destello al cargar.
- **Diseño responsivo**: el header se adapta a móvil con menú hamburguesa y las tarjetas se ajustan a su propio ancho (container queries).
- **Portadas de respaldo** generadas con CSS: la tienda se ve completa aunque todavía no tengas imágenes.
- **Estados de carga, vacío y error** con skeletons y reintento.
- **Modo demo** activable desde la configuración, para mostrar la tienda a clientes antes de publicarla.
- **Accesibilidad**: HTML semántico, navegación por teclado, foco visible, textos para lectores de pantalla y soporte de `prefers-reduced-motion`.

**En desarrollo:** vista de detalle de producto y pulido final de accesibilidad. Ver el [roadmap](#roadmap).

## Inicio rápido

```bash
git clone https://github.com/Nicolasdkr/libreria-online.git
cd libreria-online
npm run dev        # o: npx serve .
```

Abre `http://localhost:3000`. La tienda no necesita instalación ni compilación.

### Tests

```bash
npm install        # solo instala jsdom, usado por los tests de integración
npm test           # los 84 tests (Node 22.22 o superior)
npm run test:unit  # 65 tests de lógica: filtros, carrito, checkout, pedido
npm run test:dom   # 19 tests de integración: el flujo completo sobre un DOM simulado
```

Los tests usan el test runner que trae Node. `jsdom` es la única dependencia y es solo de desarrollo: la tienda publicada no la usa.

> [!NOTE]
> El catálogo se carga con `fetch`, así que la tienda necesita un servidor HTTP. Abrir `index.html` con doble clic no funciona.

## Personalización

Adaptar la tienda a un negocio nuevo requiere editar **tres archivos**, sin tocar la lógica:

| Archivo | Qué defines |
| --- | --- |
| [`config/store.config.js`](config/store.config.js) | Nombre, WhatsApp, contacto, horario, moneda, categorías, modo demo |
| [`data/products.json`](data/products.json) | Productos: título, autor, precio, stock, categoría, portada |
| [`css/tokens.css`](css/tokens.css) | Colores de marca (claro y oscuro), tipografías, radios, sombras |

Los textos de SEO (título y descripción para Google y redes sociales) se editan en `index.html`.

La guía completa, con el esquema de productos y la lista de revisión previa a la publicación, está en **[docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md)**.

## Estructura del proyecto

```
├── index.html                 Página de la tienda
├── config/
│   └── store.config.js        ← Configuración del negocio
├── data/
│   └── products.json          ← Catálogo
├── css/
│   ├── tokens.css             ← Identidad visual (colores, fuentes)
│   ├── base.css               Reset y tipografía
│   ├── layout.css             Header, hero, contacto, footer
│   ├── components.css         Botones, badges, portadas
│   ├── catalog.css            Categorías, filtros, tarjetas, skeletons
│   ├── cart.css               Panel del carrito
│   └── utilities.css          Helpers de layout
├── js/
│   ├── app.js                 Punto de entrada y coordinación
│   ├── core/                  Configuración, datos, almacenamiento y estado del carrito
│   ├── features/              Catálogo, filtros, tema, navegación
│   │   └── cart/              Carrito y checkout (panel, vistas, formulario)
│   ├── ui/                    Piezas visuales compartidas: iconos, portadas, avisos
│   └── lib/                   Lógica pura: filtros, carrito, checkout, pedido, formato
├── tests/                     Tests de lógica con node:test
│   └── dom/                   Tests de integración con jsdom
├── assets/                    Favicon e imágenes
└── docs/                      Documentación técnica y de personalización
```

## Decisiones técnicas

- **Sin framework ni build.** HTML, CSS y JavaScript estándar con ES Modules. Carga rápido, se publica en cualquier hosting estático y cualquier desarrollador web puede mantenerlo.
- **Capas separadas.** `core` resuelve datos y configuración, `features` dibuja la interfaz y `app.js` las coordina. Cambiar la fuente de datos (API, CMS o planilla) implica modificar un solo archivo.
- **Lógica testeable.** Filtros, carrito, reglas del checkout y redacción del pedido son funciones puras en `js/lib/`, cubiertas por 65 tests unitarios. Además, 19 tests de integración recorren la tienda real de punta a punta sobre un DOM simulado. Todos corren en cada despliegue, y si alguno falla, no se publica.
- **El carrito guarda solo ids y cantidades.** Precios, títulos y stock siempre se leen del catálogo vigente, así un carrito guardado hace días nunca muestra un precio desactualizado.
- **Configuración validada.** `store.config.js` se mezcla con valores por defecto, se valida (con avisos claros en consola) y se congela para que ningún módulo la altere.
- **Seguro por defecto.** Todo dato del catálogo se escapa antes de insertarse en el HTML, y el acceso a `localStorage` está protegido para navegadores que lo bloquean.
- **Tokens de diseño.** Toda la identidad visual son variables CSS: cambiar la marca no requiere buscar colores en todo el código.

Más detalle en **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Compatibilidad

Navegadores modernos (últimas dos versiones de Chrome, Edge, Firefox y Safari, incluido Safari en iOS 16.4 o superior). Usa ES Modules, container queries y `color-mix()`.

## Roadmap

| Versión | Alcance | Estado |
| --- | --- | --- |
| 0.1 – 0.3 | Base, layout responsivo, catálogo dinámico, categorías | ✅ |
| 0.4 | Estructura de producto: configuración central, tokens, modo demo, documentación | ✅ |
| 0.5 | Búsqueda en tiempo real, filtros combinables, URL compartible y tests | ✅ |
| 0.6 | Carrito persistente, panel lateral, avisos con deshacer y pedido rápido por WhatsApp | ✅ |
| 0.7 | Checkout en tres pasos, validación accesible, número de pedido y tests de integración | ✅ |
| 0.8 | Modal de detalle de producto, toasts y pulido de accesibilidad | 🔜 |
| 1.0 | Auditoría de rendimiento y accesibilidad, capturas y primera versión estable | 🔜 |

Posibles extensiones después de la 1.0: pasarela de pago, catálogo desde Google Sheets o un CMS headless, panel de administración y soporte multi-idioma.

Historial de cambios: [CHANGELOG.md](CHANGELOG.md).

## Licencia

Este proyecto es **software de código visible, no de código abierto**. Puedes clonarlo, ejecutarlo y evaluarlo libremente. Usarlo en un proyecto comercial o para un cliente, redistribuirlo o revenderlo requiere una licencia del autor.

Ver los términos completos en [LICENSE](LICENSE).

## Licencias comerciales y servicios

¿Quieres usar esta base para tu negocio o para un cliente, o necesitas una versión a medida? Contáctame en GitHub: **[@Nicolasdkr](https://github.com/Nicolasdkr)**.

---

<sub>La tienda Tinta & Viñeta, sus datos de contacto y sus valoraciones son ficticios. Los títulos del catálogo de ejemplo pertenecen a sus respectivos autores y editoriales.</sub>
