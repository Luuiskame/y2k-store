/**
 * Destinos de entrega en Honduras (poblado / zona → municipio → departamento).
 *
 * Se usa en el checkout para que el cliente no escriba la ciudad a mano: elige
 * un poblado y de ahí salen el municipio y el departamento.
 *
 * Mapeo a los campos de dirección de Medusa:
 *   city     → "Poblado" (o "Poblado, Municipio" cuando son distintos)
 *   province → Departamento
 */

export type HondurasDestination = {
  poblado: string
  municipio: string
  departamento: string
}

// [poblado / zona, municipio, departamento]
const RAW: [string, string, string][] = [
  ["La Ceiba", "La Ceiba", "Atlántida"],
  ["El Porvenir", "El Porvenir", "Atlántida"],
  ["Jutiapa", "Jutiapa", "Atlántida"],
  ["La Masica", "La Masica", "Atlántida"],
  ["San Juan Pueblo", "La Masica", "Atlántida"],
  ["San Francisco", "San Francisco", "Atlántida"],
  ["Tela", "Tela", "Atlántida"],
  ["El Triunfo de la Cruz", "Tela", "Atlántida"],
  ["Pajuiles", "Tela", "Atlántida"],
  ["La Mulera", "Tela", "Atlántida"],
  ["San Alejo", "Tela", "Atlántida"],
  ["Zoilabe", "Tela", "Atlántida"],
  ["Guaymitas", "Tela", "Atlántida"],
  ["Mezapa", "Tela", "Atlántida"],
  ["Toyos", "Tela", "Atlántida"],
  ["Santiago", "Tela", "Atlántida"],
  ["Las Metalias", "Tela", "Atlántida"],
  ["Arizona", "Arizona", "Atlántida"],

  ["Trujillo", "Trujillo", "Colón"],
  ["Sabá", "Sabá", "Colón"],
  ["Sonaguera", "Sonaguera", "Colón"],
  ["Tocoa", "Tocoa", "Colón"],
  ["Bonito Oriental", "Bonito Oriental", "Colón"],

  ["Comayagua", "Comayagua", "Comayagua"],
  ["Ajuterique", "Ajuterique", "Comayagua"],
  ["Humuya", "Humuya", "Comayagua"],
  ["La Libertad", "La Libertad", "Comayagua"],
  ["Lamaní", "Lamaní", "Comayagua"],
  ["Lejamaní", "Lejamaní", "Comayagua"],
  ["San Jerónimo", "San Jerónimo", "Comayagua"],
  ["Siguatepeque", "Siguatepeque", "Comayagua"],
  ["Villa de San Antonio", "Villa de San Antonio", "Comayagua"],
  ["Taulabé", "Taulabé", "Comayagua"],

  ["Santa Rosa de Copán", "Santa Rosa de Copán", "Copán"],
  ["Cabañas", "Cabañas", "Copán"],
  ["Copán Ruinas", "Copán Ruinas", "Copán"],
  ["Corquín", "Corquín", "Copán"],
  ["Cucuyagua", "Cucuyagua", "Copán"],
  ["Dulce Nombre", "Dulce Nombre", "Copán"],
  ["El Paraíso", "El Paraíso", "Copán"],
  ["Florida", "Florida", "Copán"],
  ["La Jigua", "La Jigua", "Copán"],
  ["La Unión", "La Unión", "Copán"],
  ["Nueva Arcadia", "Nueva Arcadia", "Copán"],
  ["La Entrada", "Nueva Arcadia", "Copán"],
  ["Chalmeca", "Nueva Arcadia", "Copán"],
  ["San Antonio", "San Antonio", "Copán"],
  ["San Jerónimo", "San Jerónimo", "Copán"],
  ["San José", "San José", "Copán"],
  ["San Juan de Opoa", "San Juan de Opoa", "Copán"],
  ["San Nicolás", "San Nicolás", "Copán"],
  ["San Pedro", "San Pedro", "Copán"],
  ["Santa Rita", "Santa Rita", "Copán"],
  ["Trinidad de Copán", "Trinidad de Copán", "Copán"],

  ["San Pedro Sula", "San Pedro Sula", "Cortés"],
  ["Cofradía", "San Pedro Sula", "Cortés"],
  ["Naco", "San Pedro Sula", "Cortés"],
  ["Choloma", "Choloma", "Cortés"],
  ["Omoa", "Omoa", "Cortés"],
  ["Cuyamel", "Omoa", "Cortés"],
  ["Pimienta", "Pimienta", "Cortés"],
  ["Potrerillos", "Potrerillos", "Cortés"],
  ["Puerto Cortés", "Puerto Cortés", "Cortés"],
  ["San Antonio de Cortés", "San Antonio de Cortés", "Cortés"],
  ["San Francisco de Yojoa", "San Francisco de Yojoa", "Cortés"],
  ["Río Lindo", "San Francisco de Yojoa", "Cortés"],
  ["San Manuel", "San Manuel", "Cortés"],
  ["Santa Cruz de Yojoa", "Santa Cruz de Yojoa", "Cortés"],
  ["Peña Blanca", "Santa Cruz de Yojoa", "Cortés"],
  ["Villanueva", "Villanueva", "Cortés"],
  ["La Lima", "La Lima", "Cortés"],

  ["Choluteca", "Choluteca", "Choluteca"],
  ["El Triunfo", "El Triunfo", "Choluteca"],
  ["Marcovia", "Marcovia", "Choluteca"],
  ["Monjarás", "Marcovia", "Choluteca"],
  ["Pespire", "Pespire", "Choluteca"],
  ["San Antonio de Flores", "San Antonio de Flores", "Choluteca"],
  ["San Marcos de Colón", "San Marcos de Colón", "Choluteca"],
  ["Caserío El Puente de Yusguare", "Santa Ana de Yusguare", "Choluteca"],
  ["Santa Ana de Yusguare Centro", "Santa Ana de Yusguare", "Choluteca"],
  ["Barrio Tierras Morenas", "Santa Ana de Yusguare", "Choluteca"],
  ["Melón Export Santa Rosa", "Santa Ana de Yusguare", "Choluteca"],
  ["Eco Finca Chaparrosa", "Santa Ana de Yusguare", "Choluteca"],
  ["Colonia Montecarlos", "Santa Ana de Yusguare", "Choluteca"],
  ["Colonia Inmaculada Concepción", "Santa Ana de Yusguare", "Choluteca"],
  ["Residencial Villas El Dorado", "Santa Ana de Yusguare", "Choluteca"],
  ["Aldea Los Chaguites", "El Corpus", "Choluteca"],
  ["Entrada al Corpus", "El Corpus", "Choluteca"],
  ["El Corpus Centro", "El Corpus", "Choluteca"],
  ["Aldea La Esperanza", "Orocuina", "Choluteca"],
  ["Caserío La Barranca", "Orocuina", "Choluteca"],
  ["Malpaso", "Orocuina", "Choluteca"],
  ["Barrio La Estación", "Orocuina", "Choluteca"],
  ["Orocuina Centro", "Orocuina", "Choluteca"],
  ["Aldea El Cerro", "Orocuina", "Choluteca"],
  ["Residencial Villa Bertilia", "Orocuina", "Choluteca"],
  ["Ciudad Chorotega", "Orocuina", "Choluteca"],
  ["Colonia Hato Nuevo", "Orocuina", "Choluteca"],
  ["Colonia Arias Lagos", "Orocuina", "Choluteca"],
  ["Aldea La Troches", "Orocuina", "Choluteca"],
  ["Apacilagua Centro", "Apacilagua", "Choluteca"],
  ["Barrio El Cementerio", "Apacilagua", "Choluteca"],

  ["Yuscarán", "Yuscarán", "El Paraíso"],
  ["Danlí", "Danlí", "El Paraíso"],
  ["Jutiapa", "Danlí", "El Paraíso"],
  ["Jamastrán", "Danlí", "El Paraíso"],
  ["El Paraíso", "El Paraíso", "El Paraíso"],
  ["Las Manos", "El Paraíso", "El Paraíso"],
  ["Güinope", "Güinope", "El Paraíso"],
  ["Jacaleapa", "Jacaleapa", "El Paraíso"],
  ["Morocelí", "Morocelí", "El Paraíso"],
  ["Teupasenti", "Teupasenti", "El Paraíso"],
  ["Trojes", "Trojes", "El Paraíso"],

  ["Tegucigalpa D.C.", "Tegucigalpa D.C.", "Francisco Morazán"],
  ["Amarateca", "Tegucigalpa D.C.", "Francisco Morazán"],
  ["Zambrano", "Tegucigalpa D.C.", "Francisco Morazán"],
  ["Cedros", "Cedros", "Francisco Morazán"],
  ["El Porvenir", "El Porvenir", "Francisco Morazán"],
  ["Guaimaca", "Guaimaca", "Francisco Morazán"],
  ["La Venta", "La Venta", "Francisco Morazán"],
  ["Ojojona", "Ojojona", "Francisco Morazán"],
  ["Sabanagrande", "Sabanagrande", "Francisco Morazán"],
  ["San Antonio de Oriente", "San Antonio de Oriente", "Francisco Morazán"],
  ["El Zamorano", "San Antonio de Oriente", "Francisco Morazán"],
  ["San Buenaventura", "San Buenaventura", "Francisco Morazán"],
  ["San Juan de Flores", "San Juan de Flores", "Francisco Morazán"],
  ["Santa Ana", "Santa Ana", "Francisco Morazán"],
  ["Santa Lucía", "Santa Lucía", "Francisco Morazán"],
  ["Talanga", "Talanga", "Francisco Morazán"],
  ["Tatumbla", "Tatumbla", "Francisco Morazán"],
  ["Valle de Ángeles", "Valle de Ángeles", "Francisco Morazán"],
  ["Villa de San Francisco", "Villa de San Francisco", "Francisco Morazán"],

  ["La Esperanza", "La Esperanza", "Intibucá"],
  ["Intibucá", "Intibucá", "Intibucá"],
  ["Jesús de Otoro", "Jesús de Otoro", "Intibucá"],
  ["San Juan", "San Juan", "Intibucá"],
  ["Yamaranguila", "Yamaranguila", "Intibucá"],

  ["Roatán", "Roatán", "Islas de la Bahía"],

  ["La Paz", "La Paz", "La Paz"],
  ["Yarumela", "La Paz", "La Paz"],
  ["Cane", "Cane", "La Paz"],
  ["Chinacla", "Chinacla", "La Paz"],
  ["Marcala", "Marcala", "La Paz"],
  ["San Pedro de Tutule", "San Pedro de Tutule", "La Paz"],
  ["Santa María", "Santa María", "La Paz"],

  ["Gracias", "Gracias", "Lempira"],
  ["Belén", "Belén", "Lempira"],
  ["Las Flores", "Las Flores", "Lempira"],
  ["Lepaera", "Lepaera", "Lempira"],

  ["Nueva Ocotepeque", "Nueva Ocotepeque", "Ocotepeque"],
  ["Concepción", "Concepción", "Ocotepeque"],
  ["La Labor", "La Labor", "Ocotepeque"],
  ["Lucerna", "Lucerna", "Ocotepeque"],
  ["San Francisco del Valle", "San Francisco del Valle", "Ocotepeque"],
  ["San Marcos", "San Marcos", "Ocotepeque"],
  ["Santa Fé", "Santa Fé", "Ocotepeque"],
  ["Sensenti", "Sensenti", "Ocotepeque"],
  ["Sinuapa", "Sinuapa", "Ocotepeque"],

  ["Juticalpa", "Juticalpa", "Olancho"],
  ["Jutiquile", "Juticalpa", "Olancho"],
  ["San Nicolás", "Juticalpa", "Olancho"],
  ["Limones", "Juticalpa", "Olancho"],
  ["Campamento", "Campamento", "Olancho"],
  ["Catacamas", "Catacamas", "Olancho"],
  ["Concordia", "Concordia", "Olancho"],
  ["Dulce Nombre de Culmí", "Dulce Nombre de Culmí", "Olancho"],
  ["El Rosario", "El Rosario", "Olancho"],
  ["Gualaco", "Gualaco", "Olancho"],
  ["San Esteban", "San Esteban", "Olancho"],
  ["San Francisco de Becerra", "San Francisco de Becerra", "Olancho"],
  ["San Francisco de La Paz", "San Francisco de La Paz", "Olancho"],
  ["Santa María del Real", "Santa María del Real", "Olancho"],
  ["Patuca", "Patuca", "Olancho"],
  ["Palestina", "Patuca", "Olancho"],

  ["Santa Bárbara", "Santa Bárbara", "Santa Bárbara"],
  ["Arada", "Arada", "Santa Bárbara"],
  ["Azacualpa", "Azacualpa", "Santa Bárbara"],
  ["Ceguaca", "Ceguaca", "Santa Bárbara"],
  ["San José de Colinas", "Colinas", "Santa Bárbara"],
  ["Concepción del Norte", "Concepción del Norte", "Santa Bárbara"],
  ["Concepción del Sur", "Concepción del Sur", "Santa Bárbara"],
  ["Chinda", "Chinda", "Santa Bárbara"],
  ["Gualala", "Gualala", "Santa Bárbara"],
  ["Ilama", "Ilama", "Santa Bárbara"],
  ["Macuelizo", "Macuelizo", "Santa Bárbara"],
  ["Petoa", "Petoa", "Santa Bárbara"],
  ["Quimistán", "Quimistán", "Santa Bárbara"],
  ["San Luis", "San Luis", "Santa Bárbara"],
  ["San Marcos", "San Marcos", "Santa Bárbara"],
  ["San Nicolás", "San Nicolás", "Santa Bárbara"],
  ["San Pedro Zacapa", "San Pedro Zacapa", "Santa Bárbara"],
  ["Santa Rita", "Santa Rita", "Santa Bárbara"],
  ["San Vicente Centenario", "San Vicente Centenario", "Santa Bárbara"],
  ["Trinidad", "Trinidad", "Santa Bárbara"],
  ["Las Vegas", "Las Vegas", "Santa Bárbara"],

  ["Nacaome", "Nacaome", "Valle"],
  ["Jícaro Galán", "Nacaome", "Valle"],
  ["Alianza", "Alianza", "Valle"],
  ["Cubulero", "Alianza", "Valle"],
  ["Aramecina", "Aramecina", "Valle"],
  ["Goascorán", "Goascorán", "Valle"],
  ["Langue", "Langue", "Valle"],
  ["San Lorenzo", "San Lorenzo", "Valle"],

  ["Yoro", "Yoro", "Yoro"],
  ["El Negrito", "El Negrito", "Yoro"],
  ["El Progreso", "El Progreso", "Yoro"],
  ["Morazán", "Morazán", "Yoro"],
  ["Olanchito", "Olanchito", "Yoro"],
  ["Santa Rita", "Santa Rita", "Yoro"],
  ["Sulaco", "Sulaco", "Yoro"],
  ["Victoria", "Victoria", "Yoro"],
  ["Yorito", "Yorito", "Yoro"],
]

export const HONDURAS_DESTINATIONS: HondurasDestination[] = RAW.map(
  ([poblado, municipio, departamento]) => ({
    poblado,
    municipio,
    departamento,
  })
)

/** Valor que se guarda en `city`. Incluye el municipio cuando difiere del poblado. */
export const destinationCity = (d: HondurasDestination) =>
  d.poblado === d.municipio ? d.poblado : `${d.poblado}, ${d.municipio}`

/** Texto que ve el cliente dentro del optgroup del departamento. */
export const destinationLabel = (d: HondurasDestination) =>
  d.poblado === d.municipio ? d.poblado : `${d.poblado} — ${d.municipio}`

export type HondurasDestinationGroup = {
  departamento: string
  options: { index: number; label: string }[]
}

/** Agrupa índices de destinos por departamento, todo en orden alfabético. */
const groupByDepartment = (indexes: number[]): HondurasDestinationGroup[] => {
  const groups = new Map<string, { index: number; label: string }[]>()

  indexes.forEach((index) => {
    const d = HONDURAS_DESTINATIONS[index]
    const options = groups.get(d.departamento) ?? []
    options.push({ index, label: destinationLabel(d) })
    groups.set(d.departamento, options)
  })

  return Array.from(groups, ([departamento, options]) => ({
    departamento,
    options: options.sort((a, b) => a.label.localeCompare(b.label, "es")),
  })).sort((a, b) => a.departamento.localeCompare(b.departamento, "es"))
}

/** Todos los destinos agrupados por departamento. */
export const HONDURAS_DESTINATION_GROUPS: HondurasDestinationGroup[] =
  groupByDepartment(HONDURAS_DESTINATIONS.map((_, index) => index))

const ACCENTS: Record<string, string> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
  ü: "u",
  ñ: "n",
}

/** Minúsculas y sin tildes: nadie escribe "Intibucá" con acento al buscar. */
const stripAccents = (value: string) =>
  value.toLowerCase().replace(/[áéíóúüñ]/g, (char) => ACCENTS[char] ?? char)

const SEARCH_INDEX = HONDURAS_DESTINATIONS.map((d) =>
  stripAccents(`${d.poblado} ${d.municipio} ${d.departamento}`)
)

/**
 * Destinos que coinciden con la búsqueda, agrupados por departamento. Cada
 * palabra tiene que aparecer en algún lado ("juan masica" encuentra
 * "San Juan Pueblo — La Masica"). Sin búsqueda devuelve el listado completo.
 */
export const searchDestinationGroups = (
  query: string
): HondurasDestinationGroup[] => {
  const terms = stripAccents(query).split(/\s+/).filter(Boolean)

  if (!terms.length) {
    return HONDURAS_DESTINATION_GROUPS
  }

  const matches = SEARCH_INDEX.reduce<number[]>((acc, haystack, index) => {
    if (terms.every((term) => haystack.includes(term))) {
      acc.push(index)
    }
    return acc
  }, [])

  return groupByDepartment(matches)
}

/**
 * Encuentra el índice del destino que corresponde a una dirección ya guardada.
 * Devuelve "" cuando no hay coincidencia, para que el select muestre el placeholder.
 */
export const findDestinationIndex = (
  city?: string | null,
  province?: string | null
): string => {
  if (!city) return ""

  const index = HONDURAS_DESTINATIONS.findIndex(
    (d) => destinationCity(d) === city && (!province || d.departamento === province)
  )

  return index === -1 ? "" : String(index)
}
