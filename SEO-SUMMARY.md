# SEO Summary — Y2K Fit Honduras

> Resumen estructurado de todo lo que cambió y se creó para SEO en el storefront.
> **Keyword principal:** `camisetas de compresión en Honduras`
> **Keywords complementarias:** estética gótica, alternativa a Breathe Divinity, activewear oscuro, Midnight Studios Honduras, ropa gym Tegucigalpa / San Pedro Sula.
> **Idioma del sitio:** `es-HN` (antes estaba en `en`, era un error grave de SEO local).

---

## Global / `src/app/layout.tsx`

**`<html lang="es-HN">`** — corregido desde `en`.

**Title (default):** Y2K Fit Honduras | Camisetas de Compresión Gótica · Activewear Oscuro
**Title template:** `%s | Y2K Fit Honduras` (todas las subpáginas heredan el sufijo de marca)
**Meta description:** Camisetas de compresión en Honduras con estética gótica. Activewear oscuro inspirado en Breathe Divinity — la primera marca de ropa deportiva alternativa hecha en Honduras. Envíos a todo el país.
**Keywords:** camisetas de compresión Honduras, ropa de compresión Honduras, ropa deportiva gótica, activewear gótico Honduras, alternativa Breathe Divinity, Midnight Studios Honduras, y2k streetwear Honduras, ropa gym Tegucigalpa, ropa gym San Pedro Sula.
**Open Graph / Twitter:** locale `es_HN`, siteName "Y2K Fit Honduras", card `summary_large_image`.
**Robots:** index/follow + `max-image-preview: large`.
**Structured data inyectado en `<body>`:**
- `Organization` (nombre, logo, país HN, descripción).
- `WebSite` con `SearchAction` apuntando a `/hn/store?q=…` (habilita el sitelinks search box de Google).

---

## Home — `src/app/[countryCode]/(main)/page.tsx` + Hero

### Hero (`src/modules/home/components/hero/index.tsx`)
- **h1:** Camisetas de Compresión Góticas en Honduras
- **p:** Y2K Fit Honduras — activewear oscuro inspirado en Breathe Divinity. Compresión técnica con estética gótica para los que entrenan distinto. La primera marca de su tipo, hecha en Honduras.
- Trust strip se mantiene: "Envío a toda Honduras · Drops Limitados · Único en Honduras".

### Metadata de home
- **title:** Camisetas de Compresión Góticas en Honduras | Y2K Fit Honduras
- **description:** Compra camisetas de compresión con estética gótica en Honduras. Activewear oscuro inspirado en Breathe Divinity — drops limitados, envíos a todo el país. Hecho en Honduras.
- **canonical:** `/`
- OG con `type: website`, mismo título/descripción.

> Antes: title `"Medusa Next.js Starter Template"`, descripción genérica de template. Era una bandera roja directa para Google.

---

## Tienda — `src/app/[countryCode]/(main)/store/page.tsx`

- **title:** Tienda · Camisetas de Compresión y Activewear Gótico
- **description:** Explora toda la tienda Y2K Fit Honduras: camisetas de compresión góticas, activewear oscuro y drops limitados. Inspirado en Breathe Divinity, hecho en Honduras.
- **canonical:** `/store`
- OG dedicado.

> Antes: `"Store"` / `"Explore all of our products."` — sin keywords, sin marca, sin país.

---

## Producto (PDP) — `src/app/[countryCode]/(main)/products/[handle]/page.tsx`

### Metadata
- **title:** `${product.title} · Camiseta de Compresión Gótica`
- **description:** primero usa `product.description` (160 chars), si no hay → fallback "{title} — camiseta de compresión gótica de Y2K Fit Honduras. Activewear oscuro inspirado en Breathe Divinity. Envíos a toda Honduras."
- **canonical:** `/products/{handle}`
- OG + Twitter con thumbnail real del producto.

### JSON-LD `Product` inyectado en runtime
- `name`, `description`, todas las `image`, `sku` de la primera variante.
- `brand`: "Y2K Fit Honduras".
- `category`: Apparel > Activewear > Compression Shirts.
- `offers` (variante más barata): `price`, `priceCurrency`, `availability: InStock`, `url`.

> Esto habilita rich snippets de producto (precio + disponibilidad en resultados de Google) y Google Shopping orgánico.

> Antes: title `"{title} | Medusa Store"`, sin schema.org, sin canonical.

---

## Colecciones — `src/app/[countryCode]/(main)/collections/[handle]/page.tsx`

- **title:** Colección {nombre} · Y2K Fit Honduras
- **description:** Descubre la colección {nombre} de Y2K Fit Honduras — camisetas de compresión góticas y activewear oscuro inspirado en Breathe Divinity. Envíos a toda Honduras.
- **canonical:** `/collections/{handle}`
- OG dedicado.

---

## Categorías — `src/app/[countryCode]/(main)/categories/[...category]/page.tsx`

- **title:** {nombre categoría} · Y2K Fit Honduras
- **description:** usa `category.description` si existe; si no → fallback con keywords ("Explora {nombre} en Y2K Fit Honduras — camisetas de compresión góticas y activewear oscuro hecho en Honduras…").
- **canonical:** `/categories/{slug}` (antes el canonical estaba mal formado — solo `category.join("/")` sin prefijo `/categories/`).
- OG dedicado.

---

## Sitemap — `src/app/sitemap.ts` (NUEVO)

Genera `sitemap.xml` dinámico:
- Páginas estáticas por país: `/`, `/store`, `/sobre-nosotros`, `/envios`, `/preguntas-frecuentes`, `/guia-de-tallas`.
- Todas las colecciones (`/collections/{handle}`).
- Todas las categorías (`/categories/{handle}`).
- Todos los productos (`/products/{handle}`) con `lastModified` real desde `updated_at`.
- `changeFrequency` y `priority` afinados por tipo de página.

---

## Robots — `src/app/robots.ts` (NUEVO)

- Permite indexar todo el sitio.
- Bloquea: `/account`, `/cart`, `/checkout`, `/order/`, `/maintenance` y sus variantes con prefijo de país.
- Declara `sitemap` y `host`.

---

## /sobre-nosotros (NUEVO)

- **h1:** La primera marca gótica de compresión en Honduras
- **p (intro):** Y2K Fit Honduras nace para llenar un vacío: en Centroamérica nadie estaba haciendo ropa de gym con estética oscura, sigilos y compresión técnica. Los que querían algo como Breathe Divinity o Midnight Studios tenían que pagar envío internacional y esperar semanas. Hoy ya no.
- **h2:** Qué hacemos — p: Diseñamos camisetas de compresión y activewear con identidad gótica…
- **h2:** Para quién es Y2K Fit — p: Audiencia 17–28, Tegucigalpa / San Pedro Sula / resto del país…
- **h2:** Drops limitados, no fast fashion — p: Trabajamos por drops. Cada colección es limitada, numerada…
- CTA: "Ver el drop actual" → `/store`.

---

## /envios (NUEVO)

- **h1:** Envíos a toda Honduras
- **p (intro):** Enviamos tus camisetas de compresión góticas a Tegucigalpa, San Pedro Sula, La Ceiba, Choluteca y cualquier rincón del país. Aquí están los tiempos, costos y la cobertura.
- **h2:** Tiempos de entrega — lista: Tegucigalpa/SPS 1–2 días, ciudades intermedias 2–4 días, resto del país 3–6 días.
- **h2:** Costos de envío — p: Calculado por dirección (Departamento, Colonia, referencias)…
- **h2:** Cobertura — p: Los 18 departamentos de Honduras enumerados (Francisco Morazán, Cortés, Atlántida, Yoro…).
- **h2:** Cambios y devoluciones — p: 7 días, prenda sin usar y con etiqueta.
- CTA: "Ir a la tienda".

> Mencionar los 18 departamentos por nombre genera long-tail SEO ("envío Choluteca", "envío Comayagua", etc.).

---

## /preguntas-frecuentes (NUEVO)

- **h1:** Preguntas frecuentes
- **p (intro):** Lo que la gente nos pregunta antes de comprar su primera camiseta de compresión gótica.
- 7 bloques **h2 + p** (cada pregunta es un h2, lo que ayuda al snippet "People also ask"):
  1. ¿Las camisetas de compresión sirven para entrenar?
  2. ¿Cómo se compara con Breathe Divinity o Midnight Studios?
  3. ¿Qué talla pido?
  4. ¿Cuánto tardan los envíos?
  5. ¿Aceptan cambios?
  6. ¿Por qué drops limitados?
  7. ¿Dónde están ubicados?
- **JSON-LD `FAQPage`** inyectado — eligible para mostrar acordeón directamente en SERP.

---

## /guia-de-tallas (NUEVO)

- **h1:** Guía de tallas
- **p (intro):** La compresión solo funciona si la talla es la correcta. Aquí están las medidas que usamos en Y2K Fit Honduras para todas las camisetas de compresión.
- **h2:** Cómo medirte — pasos: pecho, largo, regla de "si estás entre dos, elige la menor".
- **h2:** Tabla de medidas (cm) — tabla con S/M/L/XL: pecho, largo, altura referencial.
- CTA: "Elegir tu camiseta".

> Capta búsquedas como "talla camiseta compresión hombre Honduras", "guía tallas gym Honduras".

---

## Footer — `src/modules/layout/templates/footer/index.tsx`

- Headers en español: "Categorías" / "Colecciones" (antes "Categories"/"Collections" — incoherente con `lang=es-HN`).
- Nueva columna **"Y2K Fit Honduras"** con enlaces a `/sobre-nosotros`, `/envios`, `/guía-de-tallas`, `/preguntas-frecuentes` — esto da link juice interno a las nuevas landing pages y crea estructura crawlable desde toda página del sitio.

---

# Sugerencias adicionales (nuevas secciones / páginas que recomiendo agregar)

### 1. `/blog` o `/diario` (Editorial / Drops)
- **Por qué:** Es la palanca más fuerte para long-tail. Cada drop, lookbook o post sobre "rutina gym con compresión", "diferencia entre compresión y dry-fit", "cómo cuidar tu ropa de compresión" se convierte en una página indexada con su propia keyword. Además posiciona la marca para temas que el e-commerce no cubre.
- **Ejemplos de posts:** "Por qué entrenamos con compresión", "Significado de los sigilos del Drop 001", "Estética y2k en el gym: por qué funciona".

### 2. `/lookbook` o `/colecciones/[handle]/lookbook`
- **Por qué:** Página visual con foto editorial de cada drop. Capta "y2k outfit ideas Honduras", "ropa gótica gym lookbook" y es altamente compartible en redes (backlinks orgánicos). Schema.org `ImageGallery`.

### 3. `/tegucigalpa` y `/san-pedro-sula` (landing pages por ciudad)
- **Por qué:** Las búsquedas locales del tipo "ropa de gym en Tegucigalpa" o "compresión San Pedro Sula" son muy buscadas y poco competidas. Una landing dedicada por ciudad con copy "Envíos a Tegucigalpa en 1–2 días", testimonios locales, fotos urbanas, etc., gana esas búsquedas sin canibalizar la home.

### 4. `/comparativa/breathe-divinity`
- **Por qué:** Es la keyword complementaria que el dueño priorizó. Una página tipo "Y2K Fit vs Breathe Divinity: alternativa hondureña" capta intent de comparación directa, posiciona la marca como referente local y convierte muy bien (la gente que busca eso ya tiene budget y aesthetic resuelto).

### 5. `/colecciones` (índice de colecciones)
- **Por qué:** Hoy no hay un índice de `/collections` — solo se llega a una colección por slug. Una página índice con todas las colecciones agrupa autoridad y crea jerarquía clara para Google.

### 6. Reseñas / testimonios en PDP + schema `AggregateRating`
- **Por qué:** Hoy el `Product` schema sale sin `aggregateRating`. Agregar reseñas de clientes (aunque sea recopiladas de Instagram/WhatsApp al inicio) habilita estrellas en SERP, sube CTR ~20–30%.

### 7. `/maintenance` con `noindex`
- **Por qué:** Ya bloqueado en `robots.txt`, pero conviene también ponerle `<meta name="robots" content="noindex">` en su `Metadata` para garantizar que ningún índice histórico se quede pegado.

### 8. Imagen OG por colección / producto
- **Por qué:** Hoy el producto usa `thumbnail` como OG image, lo cual funciona. Pero generar OG dinámicos con `opengraph-image.tsx` (overlay con nombre del drop, logo, paleta violeta) eleva mucho la presencia en redes y CTR cuando comparten un link.

### 9. Microcopy en categorías
- **Por qué:** Hoy las categorías solo tienen título y grilla. Agregar 1–2 párrafos arriba de la grilla (editable desde Medusa Admin con `description`) le da contenido único a cada categoría — clave para que Google no las considere "thin content".

### 10. `hreflang` + ruta `/hn/` consolidada
- **Por qué:** El sitio usa `[countryCode]` pero hoy solo opera en Honduras. Conviene fijar `/hn` como canonical único y declarar `hreflang="es-HN"` explícito; cuando expandan a otros países, ya queda la base.

---

## Antes / Después rápido

| Item | Antes | Después |
|---|---|---|
| `<html lang>` | `en` | `es-HN` |
| Title home | "Medusa Next.js Starter Template" | "Camisetas de Compresión Góticas en Honduras \| Y2K Fit Honduras" |
| Title PDP | "{name} \| Medusa Store" | "{name} · Camiseta de Compresión Gótica" |
| Schema.org | ninguno | Organization + WebSite + Product + FAQPage |
| sitemap.xml | no existía | dinámico con productos/colecciones/categorías |
| robots.txt | no existía | bloquea cart/checkout/account/maintenance |
| Landing pages | 0 | 4 (sobre-nosotros, envíos, FAQ, guía de tallas) |
| Footer links a landing | 0 | 4 |
