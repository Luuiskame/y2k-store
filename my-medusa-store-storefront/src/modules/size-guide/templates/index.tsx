import { whatsappLink } from "@lib/config/brand"
import { listCatalogProducts } from "@lib/data/catalog"
import { getRegion } from "@lib/data/regions"
import { getFitProfile } from "@lib/util/fit-profile"
import { getProductStock } from "@lib/util/product-availability"
import { isBestSeller } from "@lib/util/product-tags"
import { serializeJsonLd } from "@lib/util/json-ld"
import { GarmentLine, LINES, rowsFor } from "@lib/util/size-guide"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import FitScale from "@modules/size-guide/components/fit-scale"
import LineExamples from "@modules/size-guide/components/line-examples"
import {
  JoggerDiagram,
  ShirtDiagram,
} from "@modules/size-guide/components/measure-diagram"
import SizeFinder, {
  LineAvailability,
} from "@modules/size-guide/components/size-finder"
import {
  JoggerTable,
  PremiumTable,
  ShirtTable,
} from "@modules/size-guide/components/size-tables"
import { ReactNode } from "react"

const H2_CLASS =
  "font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white"

const EXAMPLES_PER_LINE = 4

const LINE_IDS = Object.keys(LINES) as GarmentLine[]

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Qué talla pido si estoy entre dos tallas?",
    a: "Depende de la prenda. En las camisetas de calidad estándar elige la menor si quieres que marque más el músculo, o la mayor si prefieres comodidad. En las premium y en los joggers elige la mayor: la tela premium no cede igual y los joggers están hechos para quedar holgados.",
  },
  {
    q: "¿Qué significa Medium Muscle Fit?",
    a: "Es un corte que se ciñe al pecho, los hombros y los brazos y marca el músculo sin comprimirlo. Queda entre una camiseta suelta y una de compresión total.",
  },
  {
    q: "¿Qué es la alta elasticidad y cómo afecta mi talla?",
    a: "La tela estira bastante y vuelve a su forma, por eso se adapta a distintos pesos y cuerpos. En la práctica, si estás entre dos tallas cualquiera de las dos te sirve; lo que cambia es cuánto te marca.",
  },
  {
    q: "¿Por qué las camisetas premium piden una talla más?",
    a: "Son de tela gruesa de elastano, sin poliéster, y la compresión es mucho más fuerte que en la estándar. Con tu talla habitual quedan al límite; con una talla más tienes compresión firme pero cómoda para todo el día. Si buscas la máxima compresión, quédate en tu talla habitual.",
  },
  {
    q: "¿Los joggers y buzos son holgados?",
    a: "Sí, son baggy: pierna ancha de corte recto y cintura elástica con cordón. Tu talla habitual te da el look holgado; una talla menos lo hace menos suelto y una más lo vuelve oversize.",
  },
  {
    q: "¿Las medidas de la tabla son del cuerpo o de la prenda?",
    a: "Pecho, cintura y cadera son medidas de tu cuerpo. El largo es de la prenda. Cada línea ya trae su ajuste pensado (compresión, muscle fit o baggy), así que no tienes que sumar ni restar nada: sigue la recomendación de la línea.",
  },
  {
    q: "¿Cómo me mido si no tengo cinta métrica?",
    a: "Pasa un cordón o una cuerda por la parte más ancha del pecho, marca dónde se cruza y mídela contra una regla. También puedes usar la calculadora con tu estatura y peso, que da una estimación, o escribirnos por WhatsApp.",
  },
  {
    q: "¿Y si la talla no me queda?",
    a: "Aceptamos cambios de talla dentro de los 7 días posteriores a la entrega, siempre que la prenda esté sin usar y con etiqueta. Escríbenos por WhatsApp o Instagram para coordinarlo.",
  },
]

const CARDS: {
  line: GarmentLine
  title: string
  points: string[]
  sizes: string
  spot: string
}[] = [
  {
    line: "estandar",
    title: "Medium Muscle Fit",
    points: [
      "Se ciñe al pecho, hombros y brazos y marca el músculo sin comprimir.",
      "Tela de alta elasticidad (lycra y poliéster): se adapta a distintos pesos y cuerpos.",
    ],
    sizes: "XS a 2XL, según el modelo",
    spot: "Lleva la recomendación de talla junto al nombre del producto.",
  },
  {
    line: "premium",
    title: "Compresión ajustada",
    points: [
      "Tela gruesa de elastano, sin poliéster, con compresión firme y uniforme.",
      "Súper estirable, pero no cede como la estándar: por eso se pide una talla más.",
    ],
    sizes: "M, L y XL",
    spot: "Lleva el aviso de corte de compresión ajustado junto a las tallas.",
  },
  {
    line: "jogger",
    title: "Baggy",
    points: [
      "Pierna ancha de corte recto y cintura elástica con cordón.",
      "Algodón con muy poco poliéster: suave, con caída y hecho para quedar holgado.",
    ],
    sizes: "XS a XL, según el modelo",
    spot: "Están en la categoría Buzos / Joggers.",
  },
]

const SECTIONS = [
  { href: "#encuentra-tu-talla", label: "Calculadora" },
  { href: "#tipos-de-ajuste", label: "Tipos de ajuste" },
  { href: "#como-medirte", label: "Cómo medirte" },
  { href: `#${LINES.estandar.anchor}`, label: "Estándar" },
  { href: `#${LINES.premium.anchor}`, label: "Premium" },
  { href: `#${LINES.jogger.anchor}`, label: "Joggers" },
  { href: "#entre-tallas", label: "Entre tallas" },
  { href: "#preguntas", label: "Preguntas" },
]

const profiled = (products: HttpTypes.StoreProduct[], line: GarmentLine) =>
  products.filter((product) => getFitProfile(product) === line)

const newest = (product: HttpTypes.StoreProduct) =>
  product.created_at ? Date.parse(product.created_at) : 0

/** Best sellers first, then newest; sold-out models stay out of the examples. */
const examplesFor = (
  products: HttpTypes.StoreProduct[],
  line: GarmentLine
): HttpTypes.StoreProduct[] =>
  profiled(products, line)
    .filter((product) => getProductStock(product).status !== "sold_out")
    .sort(
      (a, b) =>
        Number(isBestSeller(b)) - Number(isBestSeller(a)) ||
        newest(b) - newest(a)
    )
    .slice(0, EXAMPLES_PER_LINE)

/**
 * How many models have each size in stock. Left out when it can't be known
 * (no models of the line, or the catalog came without stock levels): the
 * finder would otherwise tell someone their size is sold out on no evidence.
 */
const stockFor = (
  products: HttpTypes.StoreProduct[],
  line: GarmentLine
): Record<string, number> | undefined => {
  const ofLine = profiled(products, line)
  const stocks = ofLine.map((product) => getProductStock(product))

  if (!ofLine.length || stocks.some(({ status }) => status === "unknown")) {
    return undefined
  }

  const counts: Record<string, number> = {}

  stocks.forEach(({ sizes }) =>
    sizes.forEach(({ size, inStock }) => {
      if (inStock) counts[size] = (counts[size] ?? 0) + 1
    })
  )

  return counts
}

/** Jogger size whose waist range holds a pair of pants labelled in inches. */
const sizeForWaist = (inches: number): string => {
  const cm = Math.round(inches * 2.54)
  const row = rowsFor(LINES.jogger.sizes).find(
    ({ waist }) => cm >= waist[0] && cm <= waist[1]
  )

  return row ? row.size : "consúltanos"
}

const loadCatalog = async (
  countryCode: string
): Promise<{
  region: HttpTypes.StoreRegion | null
  products: HttpTypes.StoreProduct[]
}> => {
  try {
    const region = await getRegion(countryCode)

    if (!region) return { region: null, products: [] }

    return { region, products: await listCatalogProducts(region.id) }
  } catch {
    // The guide is useful with no catalog at all; examples are the extra.
    return { region: null, products: [] }
  }
}

const Heading = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) => (
  <header className="mb-6 max-w-3xl">
    {eyebrow && (
      <p
        className="mb-2 font-heading text-xs uppercase tracking-[0.25em]"
        style={{ color: "var(--brand-sacred-violet)" }}
      >
        {eyebrow}
      </p>
    )}
    <h2 className={H2_CLASS}>{title}</h2>
    {children && <div className="mt-4 leading-relaxed">{children}</div>}
  </header>
)

/** The one-line rule of a line, set apart so it is the thing that gets read. */
const Rule = ({ line, children }: { line: GarmentLine; children: ReactNode }) => (
  <p
    className="mb-6 max-w-3xl border-l-2 pl-4 leading-relaxed text-brand-ghost-white/90"
    style={{ borderColor: "var(--brand-sacred-violet)" }}
  >
    <strong className="font-semibold text-brand-ghost-white">
      {LINES[line].rule}.
    </strong>{" "}
    {children}
  </p>
)

const Notes = ({ items }: { items: string[] }) => (
  <ul className="mt-5 flex max-w-3xl flex-col gap-2 text-sm leading-relaxed">
    {items.map((item) => (
      <li key={item} className="flex gap-3">
        <span
          aria-hidden
          className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: "var(--brand-sacred-violet)" }}
        />
        <span>{item}</span>
      </li>
    ))}
  </ul>
)

const Steps = ({ items }: { items: { title: string; body: string }[] }) => (
  <ol className="flex flex-col gap-4">
    {items.map((item, i) => (
      <li key={item.title} className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-brand-ghost-white"
          style={{ backgroundColor: "var(--brand-violet-deep)" }}
        >
          {i + 1}
        </span>
        <p className="text-sm leading-relaxed">
          <strong className="font-semibold text-brand-ghost-white">
            {item.title}:
          </strong>{" "}
          {item.body}
        </p>
      </li>
    ))}
  </ol>
)

const COMPARISON: { when: string; cells: [string, string, string] }[] = [
  {
    when: "Estás entre dos tallas",
    cells: [
      "La menor marca más; la mayor es más cómoda.",
      "La mayor.",
      "La mayor, sobre todo si es por la cadera.",
    ],
  },
  {
    when: "Tienes mucho pecho, espalda o brazos",
    cells: [
      "Tu talla; sube una si te aprieta en los brazos.",
      "Ya pides una talla más. En XL ya estás en la mayor.",
      "Guíate por la cadera, no por la cintura.",
    ],
  },
  {
    when: "La quieres más ajustada",
    cells: ["Una talla menos.", "Tu talla habitual.", "Una talla menos."],
  },
  {
    when: "La quieres más suelta",
    cells: [
      "Una talla más.",
      "No lo recomendamos: pierde compresión.",
      "Una talla más: look oversize.",
    ],
  },
]

export default async function SizeGuideTemplate({
  countryCode,
}: {
  countryCode: string
}) {
  const { region, products } = await loadCatalog(countryCode)

  const availability = LINE_IDS.reduce<LineAvailability>((acc, line) => {
    const stock = stockFor(products, line)

    return stock ? { ...acc, [line]: stock } : acc
  }, {})

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  const waistEquivalents = [30, 32, 34, 38]
    .map((inches) => `${inches} pulgadas → ${sizeForWaist(inches)}`)
    .join(", ")

  const premiumLengths = rowsFor(LINES.premium.sizes)
    .map((row) => `${row.size} ${row.shirtLength} cm`)
    .join(", ")

  return (
    <section className="content-container py-16 small:py-24 text-brand-silver-ash">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />

      <header className="mb-8 max-w-3xl">
        <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white">
          Guía de tallas
        </h1>
        <p className="mt-6 text-base small:text-lg leading-relaxed">
          Cada línea de Y2K Fit se ajusta distinto: la compresión premium
          aprieta, la calidad estándar sigue tu cuerpo y los joggers van
          holgados. Aquí encuentras tu talla en cada una, con medidas en
          centímetros y pulgadas.
        </p>
      </header>

      <nav
        aria-label="Secciones de la guía"
        className="-mx-6 mb-14 overflow-x-auto px-6 no-scrollbar small:mx-0 small:px-0"
      >
        <ul className="flex gap-2">
          {SECTIONS.map((section) => (
            <li key={section.href} className="shrink-0">
              <a
                href={section.href}
                className="inline-flex min-h-[44px] items-center rounded-full border border-brand-amethyst bg-brand-abyss-purple px-4 font-heading text-[11px] uppercase tracking-[0.14em] text-brand-ghost-white hover:border-brand-sacred-violet small:text-xs"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-20 small:gap-24">
        <section id="encuentra-tu-talla" className="scroll-mt-24">
          <Heading
            eyebrow="En menos de un minuto"
            title="Encuentra tu talla"
          >
            <p>
              Elige la prenda, escribe tus medidas y te decimos qué talla
              pedir. La respuesta cambia según la línea: no es la misma talla
              en una camiseta premium que en un jogger.
            </p>
          </Heading>
          <SizeFinder availability={availability} />
        </section>

        <section id="tipos-de-ajuste" className="scroll-mt-24">
          <Heading
            title="Elige tu tipo de ajuste"
          >
            <p>
              Antes de mirar números, decide cómo quieres que te quede. Estas
              son las tres formas en que cortamos nuestras prendas.
            </p>
          </Heading>
          <ul className="grid gap-4 small:grid-cols-3 small:gap-6">
            {CARDS.map((card) => {
              const line = LINES[card.line]

              return (
                <li key={card.line} className="surface-card flex flex-col gap-5 p-6">
                  <div>
                    <p className="font-heading text-[11px] uppercase tracking-[0.25em] text-brand-silver-ash">
                      {line.eyebrow}
                    </p>
                    <h3 className="mt-2 font-heading text-lg uppercase tracking-[0.12em] text-brand-ghost-white">
                      {card.title}
                    </h3>
                  </div>
                  <FitScale level={line.fitLevel} />
                  <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                    {card.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <dl className="flex flex-col gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-brand-silver-ash">
                        Qué talla pedir
                      </dt>
                      <dd className="mt-1 font-semibold text-brand-ghost-white">
                        {line.rule}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-brand-silver-ash">
                        Tallas
                      </dt>
                      <dd className="mt-1">{card.sizes}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-brand-silver-ash">
                        Cómo reconocerla
                      </dt>
                      <dd className="mt-1">{card.spot}</dd>
                    </div>
                  </dl>
                  <a
                    href={`#${line.anchor}`}
                    className="mt-auto self-start font-heading text-[11px] uppercase tracking-[0.18em] underline underline-offset-4"
                  >
                    Ver tabla de medidas
                  </a>
                </li>
              )
            })}
          </ul>
        </section>

        <section id="como-medirte" className="scroll-mt-24">
          <Heading title="Cómo medirte">
            <p>
              Necesitas una cinta métrica flexible, la de costura. Pecho,
              cintura y cadera son medidas de tu cuerpo; el largo es el de la
              prenda.
            </p>
          </Heading>

          <div className="grid gap-6 small:grid-cols-2">
            <figure className="surface-card flex flex-col gap-6 p-6">
              <ShirtDiagram className="mx-auto h-auto w-full max-w-[220px]" />
              <figcaption>
                <h3 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-brand-ghost-white">
                  Camisetas
                </h3>
                <Steps
                  items={[
                    {
                      title: "Pecho",
                      body: "pasa la cinta por la parte más ancha del pecho, bajo las axilas y sobre los omóplatos. Mantenla horizontal, pegada al cuerpo y sin apretar, con los brazos relajados.",
                    },
                    {
                      title: "Largo",
                      body: "es de la prenda: del punto más alto del hombro, junto al cuello, al borde inferior. Compáralo con una camiseta tuya que termine donde te gusta.",
                    },
                  ]}
                />
              </figcaption>
            </figure>

            <figure className="surface-card flex flex-col gap-6 p-6">
              <JoggerDiagram className="mx-auto h-auto w-full max-w-[220px]" />
              <figcaption>
                <h3 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-brand-ghost-white">
                  Joggers y buzos
                </h3>
                <Steps
                  items={[
                    {
                      title: "Cintura",
                      body: "mide alrededor de la cintura natural, a la altura del ombligo, sin meter el abdomen.",
                    },
                    {
                      title: "Cadera",
                      body: "mide la parte más ancha de cadera y glúteos, con los pies juntos.",
                    },
                    {
                      title: "Largo",
                      body: "es de la prenda: de la cintura al borde por el costado. Si lo quieres a ras del tenis, compáralo con un pantalón tuyo.",
                    },
                  ]}
                />
              </figcaption>
            </figure>
          </div>

          <Notes
            items={[
              "Mide sobre piel o ropa muy ligera, de pie y relajado.",
              "Pide ayuda para el pecho: es difícil medirlo uno mismo con precisión.",
              "Mide dos veces y redondea al centímetro.",
              "¿Sin cinta? Usa la calculadora con tu estatura y peso, o escríbenos por WhatsApp.",
            ]}
          />
        </section>

        <section id={LINES.estandar.anchor} className="scroll-mt-24">
          <Heading
            eyebrow="Medium Muscle Fit · Alta elasticidad"
            title="Camisetas de calidad estándar"
          >
            <p>
              Pensadas para marcar el cuerpo sin apretarlo. La tela de alta
              elasticidad cede y vuelve a su forma, así que se adapta a
              distintos pesos. Busca tu pecho en la tabla y pide esa talla.
            </p>
          </Heading>
          <Rule line="estandar">
            Si estás entre dos tallas, la menor marca más el músculo y la mayor
            es más cómoda.
          </Rule>
          <ShirtTable />
          <p className="mt-3 text-xs text-brand-silver-ash/70">
            Las medidas pueden variar ±1 cm por la confección. Cada modelo se
            hace en las tallas que ves en su ficha; no todos llegan de XS a 2XL.
          </p>
          {region && (
            <LineExamples
              products={examplesFor(products, "estandar")}
              region={region}
            />
          )}
        </section>

        <section id={LINES.premium.anchor} className="scroll-mt-24">
          <Heading
            eyebrow="Compresión ajustada · Elastano"
            title="Camisetas premium"
          >
            <p>
              Tela gruesa de elastano, sin poliéster. La compresión es firme y
              no cede como la estándar, así que con tu talla habitual queda al
              límite. Con una talla más tienes compresión fuerte pero cómoda
              para todo el día.
            </p>
          </Heading>
          <Rule line="premium">
            ¿Quieres la máxima compresión? Quédate en tu talla habitual.
          </Rule>
          <PremiumTable />
          <Notes
            items={[
              "La premium se hace en M, L y XL. Si usas XL ya estás en la talla más grande: tendrás la máxima compresión.",
              "Si usas XS, la M te va a quedar suelta: la línea estándar te va a marcar mejor.",
              "Si usas 2XL, la XL va a quedar muy ajustada: la línea estándar llega hasta 2XL.",
              `El largo de la prenda es el de la tabla estándar: ${premiumLengths}.`,
            ]}
          />
          {region && (
            <LineExamples
              products={examplesFor(products, "premium")}
              region={region}
            />
          )}
        </section>

        <section id={LINES.jogger.anchor} className="scroll-mt-24">
          <Heading
            eyebrow="Baggy · Pierna ancha"
            title="Joggers y buzos"
          >
            <p>
              Cortados para quedar holgados: pierna ancha de corte recto y
              cintura elástica con cordón. Las medidas de la tabla son de tu
              cuerpo; el pantalón ya trae el espacio extra, así que no sumes
              nada.
            </p>
          </Heading>
          <Rule line="jogger">
            Una talla menos si lo quieres menos holgado; una más para un look
            oversize.
          </Rule>
          <JoggerTable />
          <Notes
            items={[
              "Si tu cintura y tu cadera caen en tallas distintas, elige por la cadera: la cintura se ajusta con el cordón, la cadera no.",
              `Si compras pantalones por pulgadas, guíate por la cintura: ${waistEquivalents}.`,
              "Los joggers se hacen de XS a XL; en cada modelo ves las tallas que quedan.",
            ]}
          />
          {region && (
            <LineExamples
              products={examplesFor(products, "jogger")}
              region={region}
            />
          )}
        </section>

        <section id="entre-tallas" className="scroll-mt-24">
          <Heading title="¿Entre dos tallas? Qué hacer en cada caso" />
          <div
            className="max-w-5xl overflow-x-auto [scrollbar-color:var(--brand-amethyst)_transparent] [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sacred-violet"
            tabIndex={0}
            role="region"
            aria-label="Qué hacer según tu caso"
          >
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">
                Qué talla elegir según tu caso y el tipo de prenda
              </caption>
              <thead>
                <tr className="border-b border-brand-amethyst/60">
                  {["Tu caso", "Estándar", "Premium", "Joggers"].map(
                    (label, i) => (
                      <th
                        key={label}
                        scope="col"
                        className={`py-3 pr-4 align-bottom font-heading text-xs uppercase tracking-widest text-brand-ghost-white ${
                          i === 0 ? "sticky left-0 bg-brand-void-black" : ""
                        }`}
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.when} className="border-b border-brand-amethyst/30">
                    <th
                      scope="row"
                      className="sticky left-0 bg-brand-void-black py-3 pr-4 text-left align-top text-sm font-semibold text-brand-ghost-white"
                    >
                      {row.when}
                    </th>
                    {row.cells.map((cell, column) => (
                      <td key={column} className="py-3 pr-4 align-top text-sm leading-relaxed">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="cambios" className="scroll-mt-24">
          <Heading title="Si la talla no te queda">
            <p>
              Aceptamos cambios de talla dentro de los 7 días posteriores a la
              entrega, siempre que la prenda esté sin usar y con etiqueta.
              Escríbenos por WhatsApp o Instagram y lo coordinamos.
            </p>
          </Heading>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappLink("Hola, necesito ayuda con mi talla.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Escribir por WhatsApp
            </a>
            <LocalizedClientLink href="/envios" className="btn-ghost">
              Ver cambios y envíos
            </LocalizedClientLink>
          </div>
        </section>

        <section id="preguntas" className="scroll-mt-24">
          <Heading title="Preguntas sobre tallas" />
          <div className="flex max-w-3xl flex-col">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group border-b border-brand-amethyst/40 py-4 first:border-t"
              >
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-heading text-sm uppercase tracking-[0.1em] text-brand-ghost-white small:text-base [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span
                    aria-hidden
                    className="shrink-0 text-xl leading-none transition-transform group-open:rotate-45"
                    style={{ color: "var(--brand-sacred-violet)" }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div>
          <LocalizedClientLink href="/store" className="btn-glow">
            Elegir tu prenda
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}
