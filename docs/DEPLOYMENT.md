# Despliegue

La tienda es un sitio estático: se publica en cualquier hosting que sirva archivos. Las tres opciones siguientes son gratuitas.

## GitHub Pages (incluido)

El repositorio trae un workflow listo en [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) que publica la tienda en cada push a `main`.

1. En el repositorio, ve a **Settings → Pages**.
2. En **Source**, elige **GitHub Actions**.
3. Haz un push a `main`. La tienda queda en `https://<usuario>.github.io/<repositorio>/`.

El progreso de cada despliegue se ve en la pestaña **Actions**.

## Vercel

1. Importa el repositorio en [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Other**. Deja vacíos el comando de build y el directorio de salida.
3. Haz clic en **Deploy**. Cada push a `main` vuelve a publicar la tienda, y cada pull request genera una URL de vista previa.

## Netlify

1. En [app.netlify.com](https://app.netlify.com/), elige **Add new site → Import an existing project**.
2. Deja vacío el comando de build y usa `.` como directorio de publicación.

También puedes arrastrar la carpeta del proyecto a [app.netlify.com/drop](https://app.netlify.com/drop).

## Dominio propio

Los tres servicios permiten conectar un dominio, por ejemplo `www.mitienda.cl`:

- **GitHub Pages:** Settings → Pages → Custom domain, y en tu proveedor de dominio crea un registro `CNAME` que apunte a `<usuario>.github.io`.
- **Vercel / Netlify:** agrega el dominio en el panel del proyecto y sigue las instrucciones de DNS que te muestran.

En los tres casos el certificado HTTPS es automático.

## Después de publicar

- Abre la tienda desde un celular y envía un pedido de prueba a tu WhatsApp.
- Comparte el enlace en un chat para revisar la vista previa (imagen y descripción de las etiquetas `og:*`).
- Ejecuta Lighthouse (Chrome DevTools → Lighthouse) para verificar rendimiento y accesibilidad.
- Si actualizas el catálogo y no ves los cambios, recarga sin caché (`Ctrl + Shift + R`): algunos hostings guardan el JSON en caché unos minutos.
