/**
 * ============================================================================
 *  store.config.js — Configuración de la tienda
 * ============================================================================
 *  Este es el ÚNICO archivo JavaScript que necesitas editar para adaptar el
 *  storefront a un nuevo negocio. Todo lo que no definas aquí toma un valor
 *  por defecto (ver js/core/config.js).
 *
 *  · Catálogo de productos ......... data/products.json
 *  · Colores y tipografías ......... css/tokens.css
 *  · Guía completa ................. docs/CUSTOMIZATION.md
 * ============================================================================
 */
export default {
  /** Identidad de la tienda */
  brand: {
    name: 'Tinta & Viñeta',
    tagline:
      'Librería independiente de libros, manga y cómics. Elegimos cada título como si fuera para nuestra propia estantería.',
  },

  /** Datos de contacto (se usan en el footer, la sección de contacto y el checkout) */
  contact: {
    // Formato internacional, solo dígitos: código de país + número. Ej. Chile: 569XXXXXXXX
    whatsapp: '56900000000',
    email: 'contacto@example.com',
    address: 'Av. Ficticia 123, Santiago, Chile',
  },

  /** Horario de atención (se muestra tal cual) */
  hours: [
    { days: 'Lunes a viernes', time: '10:00 – 19:00' },
    { days: 'Sábado', time: '10:00 – 14:00' },
    { days: 'Domingo', time: 'Cerrado' },
  ],

  /** Moneda y reglas comerciales */
  commerce: {
    locale: 'es-CL', // formato de números y fechas (BCP 47)
    currency: 'CLP', // código ISO 4217
    lowStockThreshold: 3, // desde cuántas unidades se muestra "¡Quedan N!"
    maxQuantityPerItem: 10, // tope de unidades por producto en el carrito (además del stock)
    freeShippingThreshold: 30000, // monto para envío gratis (barra de progreso). null = no mostrar
  },

  /** Catálogo */
  catalog: {
    productsUrl: 'data/products.json',
    newArrivalsLimit: 8, // productos en la sección "Novedades"
    priceFilterStep: 1000, // salto del filtro de precio (ej. 1000 para CLP, 1 para USD/EUR)

    // El `id` debe coincidir con el campo `category` de cada producto.
    // `hue` (0–360) define el color de la tarjeta y de las portadas generadas.
    categories: [
      { id: 'libros', label: 'Libros', description: 'Narrativa, clásicos y poesía', hue: 205 },
      { id: 'manga', label: 'Manga', description: 'Shōnen, seinen y lo último de Japón', hue: 350 },
      { id: 'comics', label: 'Cómics', description: 'Superhéroes, humor e historieta', hue: 42 },
      { id: 'novela-grafica', label: 'Novela gráfica', description: 'Historias de autor en viñetas', hue: 160 },
    ],
  },

  /** Checkout: formas de entrega, medios de pago y número de pedido */
  checkout: {
    orderPrefix: 'TV', // los pedidos se numeran como TV-261118-4K7Q

    delivery: {
      // `note` vacío en retiro = se muestra contact.address
      pickup: { enabled: true, label: 'Retiro en tienda', note: '' },
      shipping: {
        enabled: true,
        label: 'Despacho a domicilio',
        cost: 3990, // costo fijo; es gratis desde commerce.freeShippingThreshold
        note: 'Región Metropolitana · 24 a 48 horas hábiles',
      },
    },

    // `pickupOnly: true` = solo disponible con retiro en tienda
    paymentMethods: [
      { id: 'transferencia', label: 'Transferencia bancaria', note: 'Te enviamos los datos por WhatsApp' },
      { id: 'tarjeta', label: 'Tarjeta de débito o crédito', note: 'Te enviamos un link de pago' },
      { id: 'efectivo', label: 'Efectivo', note: 'Solo al retirar en tienda', pickupOnly: true },
    ],

    notesMaxLength: 300,
  },

  /**
   * Modo demostración: muestra una barra superior avisando que los datos son ficticios.
   * Pon `enabled: false` al publicar una tienda real.
   */
  demo: {
    enabled: true,
    message: 'Demo de Librería Online Storefront · Productos y datos de contacto ficticios.',
    ctaLabel: 'Ver en GitHub',
    ctaUrl: 'https://github.com/Nicolasdkr/libreria-online',
  },

  /** Crédito en el pie de página. Pon `enabled: false` para ocultarlo. */
  credits: {
    enabled: true,
    label: 'Desarrollado por',
    name: 'Nicolasdkr',
    url: 'https://github.com/Nicolasdkr',
  },
};
