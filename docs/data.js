// Ecuador Coffee Sector Dashboard — static reference data that doesn't come from a CSV.
// Everything else is loaded at runtime from docs/data/*.csv (see data-loader.js) —
// full source citations for every number: ../data/SOURCES.md . Access date: 2026-08-03.

// Country coordinates (capital/major city, approximate) for the map — keyed by the
// exact country-name string UN Comtrade returns for Ecuador's export partners.
const COUNTRY_COORDS = {
  USA: [38.9, -77.0], Colombia: [4.71, -74.07], Cuba: [23.13, -82.38], Japan: [35.68, 139.69],
  Chile: [-33.45, -70.67], France: [48.85, 2.35], Germany: [52.52, 13.4], "United Kingdom": [51.51, -0.13],
  Canada: [45.42, -75.7], Argentina: [-34.6, -58.38], Czechia: [50.08, 14.44], China: [39.9, 116.4],
  "Russian Federation": [55.75, 37.62], Australia: [-35.28, 149.13], Belgium: [50.85, 4.35],
  Netherlands: [52.37, 4.9], "Rep. of Korea": [37.57, 126.98], Spain: [40.42, -3.7], Italy: [41.9, 12.5],
  Mexico: [19.43, -99.13], "China, Hong Kong SAR": [22.32, 114.17], Qatar: [25.29, 51.53],
  "United Arab Emirates": [24.47, 54.37], Switzerland: [46.95, 7.45], "New Zealand": [-41.29, 174.78],
  Denmark: [55.68, 12.57], Bulgaria: [42.7, 23.32], Panama: [8.98, -79.52], Paraguay: [-25.3, -57.64],
  Finland: [60.17, 24.94], Singapore: [1.35, 103.82], "Türkiye": [39.93, 32.86], Greece: [37.98, 23.73],
  Peru: [-12.05, -77.04], Malaysia: [3.14, 101.69], Latvia: [56.95, 24.11], Ireland: [53.35, -6.26],
  "Saudi Arabia": [24.71, 46.68], Norway: [59.91, 10.75], Kuwait: [29.38, 47.98], Austria: [48.21, 16.37],
  Uruguay: [-34.9, -56.16], Poland: [52.23, 21.01], Kazakhstan: [51.17, 71.45], Thailand: [13.75, 100.5],
  "South Africa": [-25.75, 28.19], Kyrgyzstan: [42.87, 74.59], Georgia: [41.72, 44.79], Sweden: [59.33, 18.07],
  "Dem. Rep. of the Congo": [-4.32, 15.31], "Fmr Sudan": [15.5, 32.56], Ecuador: [-1.83, -78.18],
  Brazil: [-15.79, -47.88], "Viet Nam": [21.03, 105.85], Bolivia: [-16.5, -68.15],
  "Rep. of Moldova": [47.01, 28.86], Portugal: [38.72, -9.14], "Saint Lucia": [13.91, -60.98],
  Nicaragua: [12.11, -86.24], Guatemala: [14.63, -90.51], Honduras: [14.08, -87.2],
};
const ECUADOR_COORDS = [-1.83, -78.18];

// The 10 destination markets covered by the new decision-support sections
// (tariffs, risk, logistics, demand, recommendation) — chosen because they are
// Ecuador's largest current/emerging buyers per the Comtrade destination data.
// iso3 is the join key across every dataset fetched at runtime.
const TOP_MARKETS = [
  { iso3: "CHL", name: "Chile", comtradeName: "Chile" },
  { iso3: "USA", name: "United States", comtradeName: "USA" },
  { iso3: "COL", name: "Colombia", comtradeName: "Colombia" },
  { iso3: "JPN", name: "Japan", comtradeName: "Japan" },
  { iso3: "KOR", name: "Republic of Korea", comtradeName: "Rep. of Korea" },
  { iso3: "CHN", name: "China", comtradeName: "China" },
  { iso3: "FRA", name: "France", comtradeName: "France" },
  { iso3: "DEU", name: "Germany", comtradeName: "Germany" },
  { iso3: "NLD", name: "Netherlands", comtradeName: "Netherlands" },
  { iso3: "BEL", name: "Belgium", comtradeName: "Belgium" },
];

// tariffs_and_trade_agreements.csv keys the EU four under one shared row —
// map each of those iso3 codes to that row's "market" text.
const TARIFF_ROW_KEY = {
  CHL: "Chile", USA: "USA", COL: "Colombia", JPN: "Japan", KOR: "Republic of Korea", CHN: "China",
  FRA: "EU (France, Germany, Netherlands, Belgium)", DEU: "EU (France, Germany, Netherlands, Belgium)",
  NLD: "EU (France, Germany, Netherlands, Belgium)", BEL: "EU (France, Germany, Netherlands, Belgium)",
};

// Certifications / compliance requirements per market — structured directly from the
// `non_tariff_notes` free-text column of data/tariffs_and_trade_agreements.csv (same
// citations, see data/SOURCES.md). "mandatory" = legally required to import coffee into
// that market per the cited sources; "voluntary" = market-preferred/commercial certifications
// mentioned in the sources as boosting demand, not legally required. Where the underlying
// research pass did not turn up specific certification detail for a market, gapNote says so
// explicitly rather than guessing — per this project's no-fabricated-data rule.
const CERTIFICATIONS = {
  USA: {
    mandatory: [
      { name: "FDA Food Facility Registration", desc: "Registro obligatorio de la planta exportadora ante la FDA (bajo FSMA)." },
      { name: "FDA Foreign Supplier Verification Program (FSVP)", desc: "El importador en EE.UU. debe verificar que el proveedor ecuatoriano cumple los estándares de seguridad alimentaria de EE.UU." },
      { name: "FDA Prior Notice", desc: "Notificación previa obligatoria a la FDA antes de que el embarque llegue a puerto/aeropuerto de EE.UU." },
    ],
    voluntary: [],
    gapNote: null,
  },
  FRA: null, DEU: null, NLD: null, BEL: null, // filled below, all four share the EU row
  CHN: {
    mandatory: [
      { name: "Registro GACC", desc: "Registro obligatorio de la instalación exportadora de alimentos (incl. café) ante la Administración General de Aduanas de China." },
    ],
    voluntary: [],
    gapNote: "El IVA de importación (~13%) aplica sobre el arancel; no es una certificación pero sube el costo total de entrada.",
  },
  JPN: {
    mandatory: [],
    voluntary: [],
    gapNote: "La Food Sanitation Act y la Plant Protection Act de Japón aplican de forma general a todas las importaciones de café, pero esta investigación no encontró el detalle específico de trámites/certificados exigidos — ver data/SOURCES.md.",
  },
  CHL: {
    mandatory: [],
    voluntary: [],
    gapNote: "No se identificaron barreras SPS/fitosanitarias específicas para café en la investigación disponible (no verificado directamente con el SAG de Chile).",
  },
  COL: {
    mandatory: [],
    voluntary: [],
    gapNote: "No se identificaron requisitos SPS/fitosanitarios específicos para café en la investigación disponible para este mercado.",
  },
  KOR: {
    mandatory: [],
    voluntary: [],
    gapNote: "No se identificó el detalle de requisitos SPS/fitosanitarios para café en la investigación disponible. Sí existe una exención temporal del IVA (10%) para café verde hasta el 31-Dic-2027, que no es una certificación.",
  },
};
const EU_CERT = {
  mandatory: [
    { name: "EUDR — EU Deforestation Regulation (Reg. 2023/1115)", desc: "Declaración de debida diligencia + datos de geolocalización de las fincas de origen, obligatoria para todo el café que entra a la UE. Plazo: grandes operadores/comerciantes Dic-2026, micro/pequeñas empresas Jun-2027." },
  ],
  voluntary: [
    { name: "Certificación Orgánica (UE)", desc: "Demanda estructuralmente fuerte en Alemania (~49,000 t de café verde orgánico importado en 2024) y Bélgica (~30,000 t en 2023); no es obligatoria por ley, pero facilita el acceso a esos segmentos." },
    { name: "Fairtrade", desc: "Alemania es el mayor mercado Fairtrade de café del mundo por volumen (~5.3% del consumo alemán certificado Fairtrade, 2024)." },
    { name: "Rainforest Alliance", desc: "~15% de las importaciones de café certificado Rainforest Alliance de toda la UE pasan por Países Bajos (puerto de Róterdam)." },
  ],
  gapNote: "No se encontraron particularidades específicas de Francia en esta investigación (gap). Los cuatro países de la UE comparten el mismo arancel externo y el mismo marco regulatorio (EUDR).",
};
CERTIFICATIONS.FRA = EU_CERT; CERTIFICATIONS.DEU = EU_CERT; CERTIFICATIONS.NLD = EU_CERT; CERTIFICATIONS.BEL = EU_CERT;

// Product-type filter definition: each option maps to the HS code(s) it covers
// in ecuador_coffee_exports_by_hscode_destination_full.csv / ecuador_coffee_exports_by_hscode.csv,
// plus which tariff column in tariffs_and_trade_agreements.csv applies to it.
const PRODUCT_CATEGORIES = {
  all: { label: "All Coffee Products", hsCodes: ["090111", "090112", "090121", "090122", "090190", "210111", "210112"], tariffKind: "blend" },
  green: { label: "Green / Raw Beans (unroasted)", hsCodes: ["090111", "090112"], tariffKind: "0901" },
  roasted: { label: "Roasted Beans", hsCodes: ["090121", "090122"], tariffKind: "0901" },
  instant: { label: "Instant / Soluble Extract", hsCodes: ["210111"], tariffKind: "210111" },
  other: { label: "Husks, Substitutes & Other Preparations", hsCodes: ["090190", "210112"], tariffKind: "210111" },
};
