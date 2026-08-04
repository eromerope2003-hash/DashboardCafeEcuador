// Ecuador Coffee Sector Dashboard — rendering logic (Chart.js + Leaflet)
// Data is loaded at runtime from docs/data/*.csv by data-loader.js (see loadAllData()).
// Static config (TOP_MARKETS, PRODUCT_CATEGORIES, TARIFF_ROW_KEY, COUNTRY_COORDS) lives in data.js.

const fmtUSD = (v) => v == null ? "n/a" : "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtUSDShort = (v) => {
  if (v == null) return "n/a";
  const sign = v < 0 ? "-" : "";
  v = Math.abs(v);
  if (v >= 1e9) return sign + "$" + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return sign + "$" + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return sign + "$" + (v / 1e3).toFixed(0) + "K";
  return sign + "$" + v.toFixed(0);
};
const fmtPct = (v, d = 1) => v == null ? "n/a" : v.toFixed(d) + "%";
const fmtNum = (v) => v == null ? "n/a" : Number(v).toLocaleString("en-US");

// Renders a short, always-visible bold headline + a collapsible <details> block for the
// longer methodology/caveat text. Keeps the dashboard readable at a glance while still
// making the full sourcing/caveat detail one click away. `tag` (optional) is a small
// pill label, e.g. "No cambia con el filtro" for sections that use product-invariant data.
function noteHTML(headlineHtml, detailHtml, tag) {
  const tagHtml = tag ? `<span class="tag">${tag}</span>` : "";
  return `<p class="note-headline">${tagHtml}${headlineHtml}</p><details class="note-detail"><summary>Ver metodología y fuentes</summary><p>${detailHtml}</p></details>`;
}

const COFFEE_COLORS = { bean: "#2c1810", roast: "#4a2c1a", coffee: "#6f4e37", latte: "#b08968", green: "#4a7c59", amber: "#c1440e" };
const MARKET_PALETTE = ["#c1440e", "#2e6b3e", "#1f7a8c", "#8e44ad", "#b08968", "#4a2c1a", "#6f4e37", "#9a4b0a", "#2c6e49", "#5c4b8a"];

let selectedProduct = "all";
let selectedMapYear = 2024;

// ============================================================
// Data-access helpers (all filtered by the currently selected product)
// ============================================================

function activeHsCodes() { return PRODUCT_CATEGORIES[selectedProduct].hsCodes; }

// World totals per year for the selected product, summed across its HS codes
// (uses the authoritative per-HS-code world totals file, not the per-destination file).
function trendByYear() {
  const codes = activeHsCodes();
  const byYear = {};
  DATA.exportsByHsCode.forEach(r => {
    if (!codes.includes(r.hs_code)) return;
    if (!byYear[r.year]) byYear[r.year] = { year: r.year, value: 0, weightKg: 0 };
    byYear[r.year].value += r.export_value_usd || 0;
    byYear[r.year].weightKg += r.net_weight_kg || 0;
  });
  return Object.values(byYear).sort((a, b) => a.year - b.year);
}

// Per-destination export rows for the selected product, aggregated by (year, partner).
function destinationRowsByYear(year) {
  const codes = activeHsCodes();
  const byPartner = {};
  DATA.exportsFull.forEach(r => {
    if (r.year !== year || !codes.includes(r.hs_code)) return;
    if (!byPartner[r.partner_country]) byPartner[r.partner_country] = { country: r.partner_country, iso3: r.partner_iso3, value: 0, weightKg: 0 };
    byPartner[r.partner_country].value += r.export_value_usd || 0;
    byPartner[r.partner_country].weightKg += r.net_weight_kg || 0;
  });
  return Object.values(byPartner).filter(r => r.value > 0);
}

function ecuadorExportValueToMarket(iso3, year = 2024) {
  const codes = activeHsCodes();
  return DATA.exportsFull
    .filter(r => r.year === year && r.partner_iso3 === iso3 && codes.includes(r.hs_code))
    .reduce((s, r) => s + (r.export_value_usd || 0), 0);
}

function latestYearWithValue(rows, field) {
  const withVal = rows.filter(r => r[field] != null);
  if (!withVal.length) return null;
  return withVal.reduce((a, b) => (b.year > a.year ? b : a));
}

function extractPct(text) {
  if (!text) return null;
  const m = String(text).match(/(\d+(\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
}

function tariffRowFor(iso3) {
  const key = TARIFF_ROW_KEY[iso3];
  return DATA.tariffs.find(r => r.market === key);
}

function tariffPrefPctFor(iso3) {
  const row = tariffRowFor(iso3);
  if (!row) return null;
  const kind = PRODUCT_CATEGORIES[selectedProduct].tariffKind;
  if (kind === "210111") return extractPct(row.hs_210111_preferential_tariff_pct);
  if (kind === "0901") return extractPct(row.hs_0901_preferential_tariff_pct);
  // "blend" (All Coffee Products): average the two if both available
  const a = extractPct(row.hs_0901_preferential_tariff_pct);
  const b = extractPct(row.hs_210111_preferential_tariff_pct);
  if (a != null && b != null) return (a + b) / 2;
  return a != null ? a : b;
}

function tariffMfnPctFor(iso3) {
  const row = tariffRowFor(iso3);
  if (!row) return null;
  const kind = PRODUCT_CATEGORIES[selectedProduct].tariffKind;
  if (kind === "210111") return extractPct(row.hs_210111_mfn_tariff_pct);
  if (kind === "0901") return extractPct(row.hs_0901_mfn_tariff_pct);
  const a = extractPct(row.hs_0901_mfn_tariff_pct);
  const b = extractPct(row.hs_210111_mfn_tariff_pct);
  if (a != null && b != null) return (a + b) / 2;
  return a != null ? a : b;
}

function wgiLatest(iso3) {
  const rows = DATA.countryRiskWgi.filter(r => r.iso3 === iso3);
  return latestYearWithValue(rows, "political_stability");
}

function lpiLatest(iso3) {
  const rows = DATA.lpi.filter(r => r.iso3 === iso3);
  return latestYearWithValue(rows, "lpi_overall_score");
}

function fxVolFor(iso3) {
  const row = DATA.fxVolatility.find(r => r.iso3 === iso3);
  return row ? row.fx_yoy_volatility_stdev_pct_2015_2024 : null;
}

function logisticsRowFor(marketName) {
  return DATA.logisticsDistances.find(r => r.market === marketName);
}

function importSeriesFor(iso3) {
  return DATA.marketImports.filter(r => r.iso3 === iso3).sort((a, b) => a.year - b.year);
}

function importCAGR(iso3) {
  const series = importSeriesFor(iso3).filter(r => r.import_value_usd > 0);
  if (series.length < 2) return null;
  const first = series[0], last = series[series.length - 1];
  const n = last.year - first.year;
  if (n <= 0 || first.import_value_usd <= 0) return null;
  return (Math.pow(last.import_value_usd / first.import_value_usd, 1 / n) - 1) * 100;
}

function popGdppcLatest(iso3) {
  const rows = DATA.popGdppc.filter(r => r.iso3 === iso3);
  return latestYearWithValue(rows, "population");
}

// ============================================================
// KPI cards
// ============================================================
function renderKPIs() {
  const trend = trendByYear();
  const last = trend[trend.length - 1];
  const first = trend[0];
  const dest = destinationRowsByYear(2024).sort((a, b) => b.value - a.value);
  const topDest = dest[0];
  const changePct = first && last && first.value ? (((last.value - first.value) / first.value) * 100).toFixed(0) : "n/a";

  const cards = [
    { label: `${PRODUCT_CATEGORIES[selectedProduct].label} — 2024 Export Value`, value: fmtUSDShort(last ? last.value : null), delta: `${changePct}% vs 2015` },
    { label: "Top Destination (2024)", value: topDest ? topDest.country : "n/a", delta: topDest ? fmtUSDShort(topDest.value) : "" },
    { label: "Markets Reached (2024)", value: dest.length, delta: "distinct destination countries" },
    { label: "Coffee Area Harvested", value: (() => { const a0 = DATA.production[0], a1 = DATA.production[DATA.production.length - 1]; return ((a0.area_harvested_ha - a1.area_harvested_ha) / a0.area_harvested_ha * 100).toFixed(0) + "% decline"; })(), delta: `${fmtNum(DATA.production[0].area_harvested_ha)} → ${fmtNum(DATA.production[DATA.production.length - 1].area_harvested_ha)} ha (2015–24)`, cls: "risk" },
  ];

  document.getElementById("kpi-row").innerHTML = cards.map(c => `
    <div class="kpi-card ${c.cls || ""}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="delta">${c.delta}</div>
    </div>`).join("");
}

// ============================================================
// Map + country detail
// ============================================================
let map, markers = [];
function renderMap(year) {
  selectedMapYear = year;
  if (!map) {
    map = L.map("map", { scrollWheelZoom: false }).setView([10, -40], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
    L.circleMarker(ECUADOR_COORDS, { radius: 9, color: COFFEE_COLORS.green, fillColor: COFFEE_COLORS.green, fillOpacity: 0.9 })
      .addTo(map).bindPopup("<strong>Ecuador</strong><br/>Origin");
  }
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const rows = destinationRowsByYear(year).filter(r => COUNTRY_COORDS[r.country]);
  if (!rows.length) {
    document.getElementById("map-empty-note").textContent = `No recorded exports of "${PRODUCT_CATEGORIES[selectedProduct].label}" to any destination in ${year}.`;
    return;
  }
  document.getElementById("map-empty-note").textContent = "";
  const maxVal = Math.max(...rows.map(r => r.value));

  rows.forEach(r => {
    const radius = 5 + (r.value / maxVal) * 22;
    const marker = L.circleMarker(COUNTRY_COORDS[r.country], {
      radius, color: COFFEE_COLORS.amber, fillColor: COFFEE_COLORS.coffee, fillOpacity: 0.65, weight: 1.5,
    }).addTo(map);
    marker.bindTooltip(`${r.country}: ${fmtUSDShort(r.value)}`);
    marker.on("click", () => showCountryDetail(r.country, r.iso3));
    markers.push(marker);
  });
}

// Certifications block shown in the map's country-detail panel. Data comes straight from
// CERTIFICATIONS in data.js, which is itself structured from the already-cited non_tariff_notes
// column of tariffs_and_trade_agreements.csv — nothing invented here. Markets outside the
// 10 priority markets simply don't have this research, and we say so instead of guessing.
function certificationsHtml(iso3) {
  const cert = CERTIFICATIONS[iso3];
  if (!cert) {
    return `<div class="cert-block"><h4 style="margin:0.9rem 0 0.3rem;color:var(--bean);font-size:0.92rem">Certificaciones / requisitos para exportar aquí</h4>
      <p style="font-size:0.8rem;color:var(--muted)">No hay investigación de certificaciones para este mercado — el detalle de cumplimiento solo se levantó para los 10 mercados prioritarios del dashboard (ver Capítulo 3, "Tariffs &amp; Market Access").</p></div>`;
  }
  const item = (c, kind) => `<li><strong>${c.name}</strong> <span class="cert-tag ${kind}">${kind === "mandatory" ? "Obligatoria" : "Voluntaria/comercial"}</span><br/><span style="color:var(--muted)">${c.desc}</span></li>`;
  const items = [...cert.mandatory.map(c => item(c, "mandatory")), ...cert.voluntary.map(c => item(c, "voluntary"))];
  const n = cert.mandatory.length;
  return `
    <div class="cert-block">
      <h4 style="margin:0.9rem 0 0.3rem;color:var(--bean);font-size:0.92rem">Certificaciones / requisitos para exportar aquí</h4>
      <p style="margin:0 0 0.4rem;font-size:0.8rem;color:var(--muted)">${n} requisito${n === 1 ? "" : "s"} obligatorio${n === 1 ? "" : "s"} identificado${n === 1 ? "" : "s"}${cert.voluntary.length ? ` + ${cert.voluntary.length} certificación${cert.voluntary.length === 1 ? "" : "es"} voluntaria${cert.voluntary.length === 1 ? "" : "s"}` : ""} en la investigación disponible.</p>
      ${items.length ? `<ul class="cert-list">${items.join("")}</ul>` : ""}
      ${cert.gapNote ? `<p style="font-size:0.78rem;color:var(--muted);font-style:italic">${cert.gapNote}</p>` : ""}
    </div>`;
}

function showCountryDetail(country, iso3) {
  const codes = activeHsCodes();
  const history = {};
  DATA.exportsFull.filter(r => r.partner_country === country && codes.includes(r.hs_code)).forEach(r => {
    history[r.year] = (history[r.year] || 0) + (r.export_value_usd || 0);
  });
  const rowsHtml = Object.entries(history).sort((a, b) => a[0] - b[0])
    .map(([y, v]) => `<tr><td>${y}</td><td style="text-align:right">${fmtUSD(v)}</td></tr>`).join("");
  const isTopMarket = TOP_MARKETS.some(m => m.iso3 === iso3);
  document.getElementById("country-detail").innerHTML = `
    <h3 style="margin:0 0 0.4rem;color:var(--bean)">${country}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
      <thead><tr><th style="text-align:left">Year</th><th style="text-align:right">Export Value</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="2" style="color:var(--muted)">No data for this product filter</td></tr>'}</tbody>
    </table>
    ${isTopMarket ? `<p style="margin-top:0.6rem;font-size:0.82rem;color:var(--muted)">This market has a full decision-support profile below — see Tariffs, Country Risk, Logistics and the "Should Ecuador Export Here?" sections.</p>` : ""}
    ${certificationsHtml(iso3)}`;
}

function populateYearSelect() {
  const years = [...new Set(DATA.exportsFull.map(d => d.year))].sort();
  const sel = document.getElementById("map-year");
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
  sel.value = years[years.length - 1];
  sel.addEventListener("change", () => renderMap(Number(sel.value)));
}

// ============================================================
// Product filter
// ============================================================
function populateProductFilter() {
  const sel = document.getElementById("product-filter");
  sel.innerHTML = Object.entries(PRODUCT_CATEGORIES).map(([key, c]) => `<option value="${key}">${c.label}</option>`).join("");
  sel.value = selectedProduct;
  sel.addEventListener("change", () => {
    selectedProduct = sel.value;
    renderAll();
  });
}

// ============================================================
// Charts: trend / HS breakdown / competitors / prices / production
// ============================================================
let chartTrend, chartHs, chartCompetitors, chartPrices, chartProduction, chartTopImporters, chartTariffs, chartDemandGrowth, chartImportPerCapita;

function destroy(chart) { if (chart) chart.destroy(); }

function renderTrendChart() {
  const trend = trendByYear();
  destroy(chartTrend);
  const ctx = document.getElementById("chart-trend");
  chartTrend = new Chart(ctx, {
    type: "line",
    data: {
      labels: trend.map(d => d.year),
      datasets: [
        { label: "Export Value (USD)", data: trend.map(d => d.value), borderColor: COFFEE_COLORS.roast, backgroundColor: COFFEE_COLORS.roast, yAxisID: "y", tension: 0.25 },
        { label: "Net Weight (kg)", data: trend.map(d => d.weightKg), borderColor: COFFEE_COLORS.green, backgroundColor: COFFEE_COLORS.green, yAxisID: "y1", tension: 0.25, borderDash: [5, 3] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { position: "left", title: { display: true, text: "USD" }, ticks: { callback: fmtUSDShort } },
        y1: { position: "right", title: { display: true, text: "kg" }, grid: { drawOnChartArea: false } },
      },
    },
  });

  const v15 = trend[0].value, v24 = trend[trend.length - 1].value;
  const w15 = trend[0].weightKg, w24 = trend[trend.length - 1].weightKg;
  const valChange = v15 ? (((v24 - v15) / v15) * 100).toFixed(0) : "n/a";
  const wChange = w15 ? (((w24 - w15) / w15) * 100).toFixed(0) : "n/a";
  document.getElementById("trend-note").innerHTML = noteHTML(
    `${PRODUCT_CATEGORIES[selectedProduct].label}: entre 2015 y 2024 el valor exportado cambió ${valChange}% mientras que el peso embarcado cambió ${wChange}%.`,
    `Valor = FOB en USD (UN Comtrade). Peso = kg netos. ${selectedProduct === "all" ? "El peso neto 2023 de grano verde no fue reportado por la aduana ecuatoriana — un vacío real de datos que se ve como una caída en la línea de volumen, no un error de cálculo." : "Cifras filtradas a las categorías HS del tipo de café seleccionado arriba."}`
  );
}

const HS_LABELS = {
  "090111": "Green Arabica/Robusta unspecified (090111)", "090112": "Green, other (090112)",
  "090121": "Roasted, not decaf (090121)", "090122": "Roasted, decaf (090122)",
  "090190": "Husks/skins/substitutes (090190)", "210111": "Instant/soluble extract (210111)",
  "210112": "Other extract preparations (210112)",
};
const HS_ALL_CODES = Object.keys(HS_LABELS);

function renderHsChart() {
  const years = [2015, 2019, 2022, 2024];
  const active = activeHsCodes();
  const byCode = {};
  DATA.exportsByHsCode.forEach(r => { if (years.includes(r.year)) { byCode[r.hs_code] = byCode[r.hs_code] || {}; byCode[r.hs_code][r.year] = r.export_value_usd; } });

  destroy(chartHs);
  const ctx = document.getElementById("chart-hs");
  chartHs = new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: HS_ALL_CODES.map(c => ({
        label: HS_LABELS[c],
        data: years.map(y => byCode[c]?.[y] || 0),
        backgroundColor: active.includes(c) ? COFFEE_COLORS.amber : "#e4d5bd",
        borderColor: COFFEE_COLORS.bean, borderWidth: active.includes(c) ? 1.5 : 0,
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { ticks: { callback: fmtUSDShort } } },
      plugins: { legend: { labels: { boxWidth: 11, font: { size: 10 } } } },
    },
  });

  const latestYear = years[years.length - 1];
  const totalLatest = HS_ALL_CODES.reduce((s, c) => s + (byCode[c]?.[latestYear] || 0), 0);
  const selLatest = HS_ALL_CODES.filter(c => active.includes(c)).reduce((s, c) => s + (byCode[c]?.[latestYear] || 0), 0);
  const share = totalLatest ? (selLatest / totalLatest * 100) : null;
  const beanCodes = ["090111", "090112", "090121", "090122", "090190"], extractCodes = ["210111", "210112"];
  const g24 = beanCodes.reduce((s, c) => s + (byCode[c]?.[latestYear] || 0), 0);
  const e24 = extractCodes.reduce((s, c) => s + (byCode[c]?.[latestYear] || 0), 0);
  const ratio = g24 ? (e24 / g24).toFixed(1) : "n/a";
  document.getElementById("hs-note").innerHTML = noteHTML(
    `Las barras ámbar (${PRODUCT_CATEGORIES[selectedProduct].label}) representaron ${fmtPct(share, 0)} del valor exportado en las 7 categorías HS en ${latestYear}.`,
    `Para contexto: en ${latestYear}, el café instantáneo/soluble exportó ${fmtUSDShort(e24)} — <strong>${ratio}x</strong> el valor de todos los granos verdes/tostados/otros (${fmtUSDShort(g24)}) combinados. Esto confirma que "empresas cafetaleras locales" son en realidad dos poblaciones muy distintas: pequeños productores expuestos al clima, y un puñado de grandes procesadoras industriales expuestas al riesgo comercial global.`
  );
}

function renderCompetitorsChart() {
  const years = [...new Set(DATA.competitors.map(r => r.year))].sort();
  const countries = [...new Set(DATA.competitors.map(r => r.country))];
  const palette = { Ecuador: COFFEE_COLORS.amber, Colombia: "#2e6b3e", Brazil: "#1f7a8c", Vietnam: "#8e44ad", Peru: "#b08968" };
  destroy(chartCompetitors);
  const ctx = document.getElementById("chart-competitors");
  chartCompetitors = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: countries.map(c => ({
        label: c,
        data: years.map(y => { const r = DATA.competitors.find(x => x.country === c && x.year === y); return r ? r.export_value_usd : null; }),
        borderColor: palette[c] || "#999", backgroundColor: palette[c] || "#999",
        borderWidth: c === "Ecuador" ? 3 : 2, tension: 0.2, spanGaps: true,
      })),
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { type: "logarithmic", ticks: { callback: fmtUSDShort } } } },
  });

  // Ecuador's global export share among these 5 competitor countries (HS0901 basis, as reported in competitor_comparison.csv)
  const latestYear = years[years.length - 1];
  const rowsLatest = DATA.competitors.filter(r => r.year === latestYear && r.export_value_usd != null);
  const totalLatest = rowsLatest.reduce((s, r) => s + r.export_value_usd, 0);
  const ecu = rowsLatest.find(r => r.country === "Ecuador");
  const share = ecu ? (ecu.export_value_usd / totalLatest * 100) : null;
  document.getElementById("competitors-note").innerHTML = noteHTML(
    `Ecuador es un jugador marginal: entre estos 5 exportadores, tuvo apenas <strong>${fmtPct(share, 2)}</strong> del valor combinado de HS 0901 en ${latestYear}.`,
    `Brasil, Colombia, Vietnam y Perú solo tienen datos públicos comparables de café verde (HS 0901) — no existe una serie de "exportaciones de café instantáneo de Brasil" con el mismo nivel de detalle público, así que este gráfico no cambia con el filtro de tipo de café de arriba. Ecuador no puede competir en volumen de grano — su oportunidad está en procesamiento de valor agregado (café instantáneo, nichos especiales/tostados) más que en exportar la materia prima.`,
    "No cambia con el filtro"
  );
}

function renderPricesChart() {
  // Ecuador's implied unit price for whichever product is selected — every HS code in
  // exportsByHsCode.csv has both value and net weight, so this works for any category,
  // not just green/roasted beans (previous version hardcoded beans only).
  const codes = activeHsCodes();
  const byYear = {};
  DATA.exportsByHsCode.forEach(r => {
    if (!codes.includes(r.hs_code)) return;
    byYear[r.year] = byYear[r.year] || { value: 0, weight: 0 };
    byYear[r.year].value += r.export_value_usd || 0;
    byYear[r.year].weight += r.net_weight_kg || 0;
  });
  const years = DATA.prices.map(p => p.year);
  const rawUnitPrice = years.map(y => (byYear[y] && byYear[y].weight > 0) ? byYear[y].value / byYear[y].weight : null);
  // Outlier guard: UN Comtrade occasionally reports a year with a clearly wrong net-weight
  // figure (e.g. HS 210111 / 2023: $118M in value against only 102,646 kg of weight — vs.
  // ~10-19M kg every other year — a ~1000x drop that is almost certainly a reporting error
  // in the source, not a real price). Rather than plot the resulting absurd $/kg spike (or
  // silently "fix" the number ourselves, which would be fabrication), we exclude points that
  // are >5x the median of the other valid years for this same product filter and disclose it.
  const validPrices = rawUnitPrice.filter(v => v != null).sort((a, b) => a - b);
  const median = validPrices.length ? validPrices[Math.floor(validPrices.length / 2)] : null;
  let excludedYear = null;
  const ecuUnitPrice = rawUnitPrice.map((v, i) => {
    if (v != null && median && v > median * 5) { excludedYear = years[i]; return null; }
    return v;
  });

  destroy(chartPrices);
  const ctx = document.getElementById("chart-prices");
  chartPrices = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        { label: "Arabica mundial (USD/kg)", data: DATA.prices.map(p => p.arabica_usd_per_kg), borderColor: COFFEE_COLORS.roast, tension: 0.25 },
        { label: "Robusta mundial (USD/kg)", data: DATA.prices.map(p => p.robusta_usd_per_kg), borderColor: COFFEE_COLORS.green, tension: 0.25 },
        { label: `Ecuador implícito — ${PRODUCT_CATEGORIES[selectedProduct].label}`, data: ecuUnitPrice, borderColor: COFFEE_COLORS.amber, borderDash: [6, 3], tension: 0.25, spanGaps: true },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  const validYears = Object.keys(byYear).map(Number).filter(y => byYear[y].weight > 0);
  const latestYear = validYears.length ? Math.max(...validYears) : null;
  const unitPrice = latestYear ? byYear[latestYear].value / byYear[latestYear].weight : null;
  const worldArabica = latestYear ? DATA.prices.find(p => p.year === latestYear)?.arabica_usd_per_kg : null;
  const diff = (unitPrice != null && worldArabica) ? ((unitPrice - worldArabica) / worldArabica * 100) : null;
  const isBeanCategory = ["090111", "090112", "090121", "090122"].some(c => codes.includes(c));
  document.getElementById("price-note").innerHTML = noteHTML(
    unitPrice != null
      ? `Precio implícito de Ecuador (${PRODUCT_CATEGORIES[selectedProduct].label}, ${latestYear}): <strong>${unitPrice.toFixed(2)} USD/kg</strong>${isBeanCategory && diff != null ? ` vs. ${worldArabica.toFixed(2)} USD/kg de la referencia mundial Arabica (${fmtPct(diff, 0)} de diferencia).` : "."}`
      : `No hay datos de peso neto suficientes para calcular un precio implícito de Ecuador en "${PRODUCT_CATEGORIES[selectedProduct].label}".`,
    `Precio implícito = valor FOB exportado ÷ peso neto, para las categorías HS del filtro seleccionado — no es un precio certificado por calidad, es un proxy aproximado. ${isBeanCategory ? "Comparable de forma aproximada con la referencia mundial de grano verde." : "El café instantáneo/soluble y otras preparaciones no son directamente comparables con las referencias mundiales de Arabica/Robusta (que son precios de grano verde) — se incluye solo como referencia de valor agregado, normalmente varias veces más alto por kg."}${excludedYear ? ` <strong>Nota de calidad de datos:</strong> se excluyó el año ${excludedYear} de esta línea porque UN Comtrade reporta un peso neto anómalo para esa categoría/año (órdenes de magnitud por debajo de los demás años), lo que produciría un precio implícito no realista — no se corrigió ni se inventó un valor, solo se omitió el punto.` : ""}`
  );
}

function renderProductionChart() {
  destroy(chartProduction);
  const ctx = document.getElementById("chart-production");
  chartProduction = new Chart(ctx, {
    data: {
      labels: DATA.production.map(p => p.year),
      datasets: [
        { type: "bar", label: "Area Harvested (ha)", data: DATA.production.map(p => p.area_harvested_ha), backgroundColor: COFFEE_COLORS.latte, yAxisID: "y" },
        { type: "line", label: "Yield (kg/ha)", data: DATA.production.map(p => p.yield_kg_per_ha), borderColor: COFFEE_COLORS.amber, yAxisID: "y1", tension: 0.25 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { position: "left", title: { display: true, text: "ha" } },
        y1: { position: "right", title: { display: true, text: "kg/ha" }, grid: { drawOnChartArea: false } },
      },
    },
  });

  document.getElementById("production-note").innerHTML = noteHTML(
    `Área cosechada cayó ${(((DATA.production[0].area_harvested_ha - DATA.production[DATA.production.length - 1].area_harvested_ha) / DATA.production[0].area_harvested_ha) * 100).toFixed(0)}% entre 2015 y ${DATA.production[DATA.production.length - 1].year}.`,
    "FAOSTAT no reporta producción agrícola por producto final (grano vs. instantáneo) — el café verde cosechado es la materia prima de <em>todas</em> las categorías exportadas, así que este gráfico no cambia con el filtro de tipo de café de arriba a propósito: es el mismo campo, sin importar en qué se procese después.",
    "No cambia con el filtro"
  );
}

// ============================================================
// International market section: top world importers (HS0901 benchmark)
// ============================================================
function renderTopImportersChart() {
  const latestYear = Math.max(...DATA.marketImports.map(r => r.year));
  const rows = DATA.marketImports.filter(r => r.year === latestYear).sort((a, b) => b.import_value_usd - a.import_value_usd);
  const iso3ByMarketName = {}; TOP_MARKETS.forEach(m => { iso3ByMarketName[m.comtradeName] = m.iso3; });
  const ecuValues = rows.map(r => { const iso3 = iso3ByMarketName[r.market]; return iso3 ? ecuadorExportValueToMarket(iso3, latestYear) : 0; });

  destroy(chartTopImporters);
  const ctx = document.getElementById("chart-top-importers");
  chartTopImporters = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map(r => r.market),
      datasets: [
        { label: `Tamaño del mercado — importaciones mundiales HS 0901, ${latestYear}`, data: rows.map(r => r.import_value_usd), backgroundColor: "#e4d5bd" },
        { label: `Ecuador exportó aquí — ${PRODUCT_CATEGORIES[selectedProduct].label}, ${latestYear}`, data: ecuValues, backgroundColor: COFFEE_COLORS.amber },
      ],
    },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { callback: fmtUSDShort } } }, plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } } },
  });

  document.getElementById("top-importers-note").innerHTML = noteHTML(
    `La barra clara es el tamaño total del mercado; la ámbar es lo que Ecuador realmente exportó ahí en ${PRODUCT_CATEGORIES[selectedProduct].label} — la brecha entre ambas es el espacio que Ecuador todavía no ocupa.`,
    `El benchmark de tamaño de mercado (barra clara) usa solo HS 0901 (café verde/tostado) porque no existe una serie pública comparable de importaciones mundiales de café instantáneo por país — no es directamente comparable si tu selección es instantáneo/soluble, pero sigue dando una idea del tamaño relativo de cada mercado. La barra ámbar de Ecuador sí es exacta para el producto seleccionado (UN Comtrade, exports).`
  );
}

// ============================================================
// Tariffs & market access
// ============================================================
function renderTariffsSection() {
  const rows = TOP_MARKETS.map(m => ({ ...m, mfn: tariffMfnPctFor(m.iso3), pref: tariffPrefPctFor(m.iso3) }));
  destroy(chartTariffs);
  const ctx = document.getElementById("chart-tariffs");
  chartTariffs = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map(r => r.name),
      datasets: [
        { label: "MFN tariff", data: rows.map(r => r.mfn), backgroundColor: "#d8a48f" },
        { label: "Preferential (Ecuador) tariff", data: rows.map(r => r.pref), backgroundColor: COFFEE_COLORS.green },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { title: { display: true, text: "%" } } } },
  });

  const ftaIcon = (v) => v === "yes" ? '<span class="badge low">FTA / preference</span>' : v === "partial" ? '<span class="badge moderate">Signed, not in force</span>' : '<span class="badge high">No FTA</span>';
  const tableRows = TOP_MARKETS.map(m => {
    const row = tariffRowFor(m.iso3);
    return `<tr>
      <td>${m.name}</td>
      <td>${ftaIcon(row.has_fta_with_ecuador)}</td>
      <td style="font-size:0.82rem">${row.fta_name}</td>
      <td style="font-size:0.8rem;color:var(--muted)">${row.non_tariff_notes.length > 220 ? row.non_tariff_notes.slice(0, 220) + "…" : row.non_tariff_notes}</td>
    </tr>`;
  }).join("");
  document.getElementById("tariff-table").innerHTML = `
    <table class="data-table">
      <thead><tr><th>Market</th><th>Trade Agreement Status</th><th>Agreement</th><th>Non-tariff / SPS notes</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
  document.getElementById("tariff-note").innerHTML = noteHTML(
    `Este gráfico y esta tabla sí cambian con el filtro de producto — muestran el arancel específico para ${PRODUCT_CATEGORIES[selectedProduct].label}.`,
    `<strong>Advertencia de fuentes:</strong> los aranceles de esta tabla se recopilaron de fragmentos de búsqueda web de fuentes oficiales/secundarias (no hubo acceso a bases de datos arancelarias primarias en esta sesión de investigación) — las celdas marcadas SECONDARY, INDIRECT o GAP en los datos subyacentes deben re-verificarse contra WTO Tariff Analysis Online, ITC Market Access Map, o el arancel de aduanas de cada país antes de la entrega final. Detalle completo: <code>data/SOURCES.md</code>.`
  );
}

// ============================================================
// Demand section
// ============================================================
function renderDemandSection() {
  const growthRows = TOP_MARKETS.map(m => ({ name: m.name, cagr: importCAGR(m.iso3) })).sort((a, b) => (b.cagr || -999) - (a.cagr || -999));
  destroy(chartDemandGrowth);
  const ctxG = document.getElementById("chart-demand-growth");
  chartDemandGrowth = new Chart(ctxG, {
    type: "bar",
    data: { labels: growthRows.map(r => r.name), datasets: [{ label: "Coffee (HS0901) import CAGR, 2015–2024", data: growthRows.map(r => r.cagr), backgroundColor: growthRows.map(r => (r.cagr || 0) >= 0 ? COFFEE_COLORS.green : COFFEE_COLORS.amber) }] },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: "% per year" } } }, plugins: { legend: { display: false } } },
  });

  const perCapitaRows = TOP_MARKETS.map(m => {
    const imp = DATA.marketImports.filter(r => r.iso3 === m.iso3).sort((a, b) => b.year - a.year)[0];
    const pop = popGdppcLatest(m.iso3);
    return { name: m.name, value: imp && pop ? imp.import_value_usd / pop.population : null };
  }).sort((a, b) => (b.value || 0) - (a.value || 0));
  destroy(chartImportPerCapita);
  const ctxP = document.getElementById("chart-import-per-capita");
  chartImportPerCapita = new Chart(ctxP, {
    type: "bar",
    data: { labels: perCapitaRows.map(r => r.name), datasets: [{ label: "Coffee (HS0901) import value per capita (USD)", data: perCapitaRows.map(r => r.value), backgroundColor: COFFEE_COLORS.latte }] },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });

  document.getElementById("demand-note").innerHTML = noteHTML(
    `Proxy de intensidad de demanda, no consumo directo — ambos gráficos usan solo datos de importación de HS 0901 (café verde/tostado), por lo que no cambian con el filtro de producto.`,
    `Se buscó un dataset real de consumo de café per cápita (ICO, USDA FAS, Our World in Data) pero no se pudo obtener en esta investigación — ICO exige registro de cuenta y no se encontró una API/descarga pública funcional para las otras fuentes. Se usa <strong>importación per cápita como el mejor proxy disponible</strong> de intensidad de demanda (importaciones ≈ disponibilidad aparente de mercado para estos países netamente importadores). También se buscó un mapa de calor de estacionalidad, pero no se encontró un dataset citable de estacionalidad mensual de importaciones para estos mercados — se omitió en vez de estimarlo.`,
    "No cambia con el filtro"
  );
}

// ============================================================
// Country risk semaphore
// ============================================================
function riskDot(value, thresholds, invert = false) {
  // thresholds = [lowCut, highCut] on the raw value; invert=true means higher raw value = worse
  if (value == null) return { cls: "unknown", label: "n/a" };
  const [lo, hi] = thresholds;
  let level;
  if (!invert) level = value >= hi ? "low" : value >= lo ? "moderate" : "high";
  else level = value <= lo ? "low" : value <= hi ? "moderate" : "high";
  const labels = { low: "Low risk", moderate: "Moderate risk", high: "High risk" };
  return { cls: level, label: labels[level] };
}

function renderRiskSemaphore() {
  const rows = TOP_MARKETS.map(m => {
    const wgi = wgiLatest(m.iso3);
    const political = wgi ? wgi.political_stability : null;
    const govReg = wgi ? (wgi.government_effectiveness + wgi.regulatory_quality) / 2 : null;
    const fx = fxVolFor(m.iso3);
    const lpi = lpiLatest(m.iso3);
    const tariffRow = tariffRowFor(m.iso3);
    const pref = tariffPrefPctFor(m.iso3);
    const politicalDot = riskDot(political, [-0.3, 0.6]);
    const economicDot = riskDot(govReg, [0.2, 0.8]);
    const fxDot = riskDot(fx, [5, 10], true);
    const logisticsDot = riskDot(lpi ? lpi.lpi_overall_score : null, [3.2, 3.8]);
    const tariffDot = tariffRow?.has_fta_with_ecuador === "yes" && (pref || 0) <= 1 ? { cls: "low", label: "Low risk" }
      : tariffRow?.has_fta_with_ecuador === "no" ? { cls: "high", label: "High risk" }
      : { cls: "moderate", label: "Moderate risk" };
    return { name: m.name, politicalDot, economicDot, fxDot, logisticsDot, tariffDot };
  });

  const dotHtml = (d) => `<span class="risk-dot ${d.cls}" title="${d.label}"></span>`;
  document.getElementById("risk-semaphore-table").innerHTML = `
    <table class="data-table semaphore">
      <thead><tr><th>Market</th><th>Political</th><th>Economic/Regulatory</th><th>FX</th><th>Logistics</th><th>Tariff</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r.name}</td><td>${dotHtml(r.politicalDot)}</td><td>${dotHtml(r.economicDot)}</td><td>${dotHtml(r.fxDot)}</td><td>${dotHtml(r.logisticsDot)}</td><td>${dotHtml(r.tariffDot)}</td></tr>`).join("")}</tbody>
    </table>`;
  document.getElementById("risk-note").innerHTML = noteHTML(
    `Solo la columna <strong>Tariff</strong> cambia con el filtro de producto — las demás son riesgo a nivel país, no dependen de qué tipo de café se exporte.`,
    `Political/Economic = World Bank Worldwide Governance Indicators (último año disponible por mercado). FX = volatilidad interanual del tipo de cambio 2015–2024 (los mercados de la UE comparten un solo puntaje basado en el Euro, por construcción). Logistics = World Bank Logistics Performance Index, puntaje general (último disponible: 2022 para la mayoría de mercados). Tariff = estado actual de TLC/preferencia y arancel preferencial para el producto seleccionado. Los umbrales son cortes relativos elegidos para este dashboard, no la metodología de una agencia externa de calificación de riesgo — ver <code>data/SOURCES.md</code> para cifras y años exactos.`
  );
}

// ============================================================
// Logistics section
// ============================================================
function renderLogisticsSection() {
  const rows = TOP_MARKETS.map(m => {
    const log = logisticsRowFor(m.comtradeName);
    const lpi = lpiLatest(m.iso3);
    return { name: m.name, log, lpi };
  });
  document.getElementById("logistics-table").innerHTML = `
    <table class="data-table">
      <thead><tr><th>Market</th><th>Destination Port</th><th>Distance (est. route, km)</th><th>Est. Transit (days)</th><th>LPI Score (2022)</th><th>LPI Global Rank</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${r.name}</td>
        <td>${r.log ? r.log.destination_port : "n/a"}</td>
        <td>${r.log ? fmtNum(r.log.estimated_route_km) : "n/a"}</td>
        <td>${r.log ? r.log.estimated_transit_days : "n/a"}</td>
        <td>${r.lpi ? r.lpi.lpi_overall_score : "n/a"}</td>
        <td>${r.lpi && r.lpi.lpi_overall_rank ? "#" + r.lpi.lpi_overall_rank : "n/a"}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  document.getElementById("logistics-note").innerHTML = noteHTML(
    `Esta tabla no cambia con el filtro de producto: puerto, distancia y tiempo de tránsito dependen del país destino, no del tipo de café.`,
    `Distancias/tiempos de tránsito son estimados desde Guayaquil vía distancia de círculo máximo × un factor de ruteo marítimo de 1.15 a una velocidad promedio asumida de 18 nudos — son direccionales/comparativos, no datos de itinerario real de navieras. <strong>El costo de flete se omite intencionalmente</strong>: no se encontró una fuente citable, confiable y gratuita de tarifas de flete actuales; presentar un número aquí violaría el estándar de este proyecto de no usar datos inventados. Metodología: <code>data/SOURCES.md</code>.`,
    "No cambia con el filtro"
  );
}

// ============================================================
// "Should Ecuador export here?" composite recommendation
// ============================================================
function normalize(value, all, invert = false) {
  const vals = all.filter(v => v != null);
  if (value == null || !vals.length) return 50; // neutral if unknown
  const min = Math.min(...vals), max = Math.max(...vals);
  if (max === min) return 50;
  let score = ((value - min) / (max - min)) * 100;
  if (invert) score = 100 - score;
  return score;
}

function computeMarketMetrics() {
  return TOP_MARKETS.map(m => {
    const wgi = wgiLatest(m.iso3);
    const governance = wgi ? (wgi.political_stability + wgi.government_effectiveness + wgi.regulatory_quality + wgi.rule_of_law) / 4 : null;
    const cagr = importCAGR(m.iso3);
    const tariff = tariffPrefPctFor(m.iso3);
    const fx = fxVolFor(m.iso3);
    const lpi = lpiLatest(m.iso3);
    const log = logisticsRowFor(m.comtradeName);
    const ecuValue = ecuadorExportValueToMarket(m.iso3, 2024);
    const latestImport = DATA.marketImports.filter(r => r.iso3 === m.iso3).sort((a, b) => b.year - a.year)[0];
    const penetration = latestImport && latestImport.import_value_usd ? (ecuValue / latestImport.import_value_usd) : 0;
    return {
      iso3: m.iso3, name: m.name, governance, cagr, tariff, fx,
      lpiScore: lpi ? lpi.lpi_overall_score : null,
      transitDays: log ? log.estimated_transit_days : null,
      ecuValue, penetration,
    };
  });
}

function computeRecommendations() {
  const metrics = computeMarketMetrics();
  const all = {
    governance: metrics.map(m => m.governance), cagr: metrics.map(m => m.cagr), tariff: metrics.map(m => m.tariff),
    fx: metrics.map(m => m.fx), lpiScore: metrics.map(m => m.lpiScore), transitDays: metrics.map(m => m.transitDays),
    penetration: metrics.map(m => m.penetration),
  };

  return metrics.map(m => {
    const demandScore = normalize(m.cagr, all.cagr);
    const tariffScore = normalize(m.tariff, all.tariff, true);
    const riskScore = normalize(m.governance, all.governance);
    const analytical = 0.4 * demandScore + 0.3 * tariffScore + 0.3 * riskScore;

    const growthScore = normalize(m.cagr, all.cagr);
    const headroomScore = normalize(m.penetration, all.penetration, true);
    const strategic = 0.5 * growthScore + 0.5 * headroomScore;

    const stabilityScore = normalize(m.governance, all.governance);
    const fxScore = normalize(m.fx, all.fx, true);
    const lpiNormScore = normalize(m.lpiScore, all.lpiScore);
    const transitScore = normalize(m.transitDays, all.transitDays, true);
    const business = 0.3 * stabilityScore + 0.2 * fxScore + 0.25 * lpiNormScore + 0.25 * transitScore;

    const overall = (analytical + strategic + business) / 3;
    const label = overall >= 62 ? "High" : overall >= 42 ? "Medium" : "Low";
    const cls = overall >= 62 ? "low" : overall >= 42 ? "moderate" : "high"; // reuse badge color scale (low-risk color = green = good)

    return { ...m, demandScore, tariffScore, riskScore, analytical, growthScore, headroomScore, strategic, stabilityScore, fxScore, lpiNormScore, transitScore, business, overall, label, cls };
  }).sort((a, b) => b.overall - a.overall);
}

function renderRecommendations() {
  const recs = computeRecommendations();
  const cardHtml = (r) => `
    <div class="rec-card">
      <div class="rec-head">
        <h3>${r.name}</h3>
        <span class="badge ${r.cls}">${r.label} attractiveness</span>
      </div>
      <div class="rec-score">Overall score: <strong>${r.overall.toFixed(0)}/100</strong> (relative ranking across these 10 candidate markets, ${PRODUCT_CATEGORIES[selectedProduct].label})</div>
      <div class="rec-bars">
        <div class="rec-bar-row"><span>Analytical</span><div class="rec-bar"><div style="width:${r.analytical.toFixed(0)}%"></div></div><span>${r.analytical.toFixed(0)}</span></div>
        <div class="rec-bar-row"><span>Strategic</span><div class="rec-bar"><div style="width:${r.strategic.toFixed(0)}%"></div></div><span>${r.strategic.toFixed(0)}</span></div>
        <div class="rec-bar-row"><span>Business/Investment</span><div class="rec-bar"><div style="width:${r.business.toFixed(0)}%"></div></div><span>${r.business.toFixed(0)}</span></div>
      </div>
      <p class="rec-rationale">
        <strong>Analytical:</strong> import demand ${r.cagr != null ? (r.cagr >= 0 ? "growing" : "shrinking") + " at " + fmtPct(Math.abs(r.cagr), 1) + "/yr" : "growth rate unavailable"}; preferential tariff ${r.tariff != null ? fmtPct(r.tariff, 1) : "unavailable"}; governance composite ${r.governance != null ? r.governance.toFixed(2) : "n/a"} (WGI, ~-2.5 to +2.5 scale).
        <strong>Strategic:</strong> Ecuador currently holds ~${fmtPct(r.penetration * 100, 3)} of this market's HS0901 import value — ${r.penetration < 0.01 ? "substantial white-space" : "an existing but small"} foothold.
        <strong>Business perception:</strong> FX volatility ${r.fx != null ? fmtPct(r.fx, 1) : "n/a"}, logistics score ${r.lpiScore != null ? r.lpiScore.toFixed(1) + "/5" : "n/a"}, ~${r.transitDays != null ? r.transitDays.toFixed(1) : "n/a"} days transit from Guayaquil.
      </p>
    </div>`;
  document.getElementById("recommendations-grid").innerHTML = recs.map(cardHtml).join("");
  document.getElementById("recommendations-note").innerHTML = noteHTML(
    `Estos puntajes sí cambian con el filtro de producto (el arancel y el "market headroom" de Ecuador se recalculan para ${PRODUCT_CATEGORIES[selectedProduct].label}); el resto de los insumos (crecimiento de demanda, riesgo-país, logística) son a nivel país y no varían por producto.`,
    `Cada mercado se puntúa de 0 a 100 <em>en relación con los otros 9 mercados candidatos de este conjunto</em> (normalización min-max), no contra un benchmark global absoluto. <em>Analítico</em> = 40% crecimiento de demanda + 30% carga arancelaria (invertida) + 30% gobernanza/riesgo compuesto. <em>Estratégico</em> = 50% crecimiento de demanda + 50% espacio de mercado (inverso de la penetración actual de Ecuador). <em>Percepción de negocio/inversión</em> = 30% estabilidad de gobernanza + 20% estabilidad FX + 25% desempeño logístico (LPI) + 25% tiempo de tránsito (invertido). Este es un indicador compuesto simplificado y transparente para priorización ilustrativa — no reemplaza un estudio formal de factibilidad de entrada a mercado.`
  );
}

// ============================================================
// Legacy macro/concentration risk panel (kept from v1, product-aware)
// ============================================================
function hhi(rows) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return { hhi: 0, total: 0, top5Share: 0 };
  const sumSq = rows.reduce((s, r) => s + Math.pow((r.value / total) * 100, 2), 0);
  return { hhi: sumSq, total, top5Share: rows.slice().sort((a, b) => b.value - a.value).slice(0, 5).reduce((s, r) => s + r.value, 0) / total * 100 };
}

function riskLabel(hhiVal) {
  if (hhiVal < 1000) return { label: "Low", cls: "low" };
  if (hhiVal < 1800) return { label: "Moderate", cls: "moderate" };
  return { label: "High", cls: "high" };
}

function renderMacroPanel() {
  const dest2024 = destinationRowsByYear(2024);
  const { hhi: hhiVal, top5Share } = hhi(dest2024);
  const risk = riskLabel(hhiVal);
  const top5 = dest2024.slice().sort((a, b) => b.value - a.value).slice(0, 5).map(d => d.country).join(", ") || "n/a";

  const priceMax = Math.max(...DATA.prices.map(p => p.arabica_usd_per_kg));
  const priceMin = Math.min(...DATA.prices.map(p => p.arabica_usd_per_kg));
  const priceSwing = ((priceMax - priceMin) / priceMin * 100).toFixed(0);
  const gdp2020 = DATA.macro.find(m => m.year === 2020).gdp_growth_pct;
  const macroFirst = DATA.macro[0], macroLast = DATA.macro[DATA.macro.length - 1];

  document.getElementById("risk-panel").innerHTML = `
    <div class="two-col">
      <div>
        <p><span class="badge ${risk.cls}">${risk.label} concentration risk</span> Export destinations (${PRODUCT_CATEGORIES[selectedProduct].label}) are concentrated: the top 5 buyers (${top5}) account for <strong>${fmtPct(top5Share, 0)}</strong> of 2024 export value (HHI ≈ ${hhiVal.toFixed(0)}). A demand shock or tariff change in any one of these markets would materially hit Ecuador's coffee exporters.</p>
        <p><span class="badge high">High price volatility risk</span> Arabica prices swung <strong>${priceSwing}%</strong> between their 2015–2024 low ($${priceMin.toFixed(2)}/kg) and high ($${priceMax.toFixed(2)}/kg). Ecuadorian growers have no forward-pricing infrastructure comparable to Colombia's or Brazil's cooperatives, leaving smallholders exposed to global price swings.</p>
      </div>
      <div>
        <p><span class="badge moderate">Dollarization: no FX risk, but no FX cushion either</span> Ecuador has used the USD as its official currency since 2000 — it cannot devalue to stay competitive when rivals' currencies weaken (e.g. Colombian peso or Brazilian real depreciation effectively cuts their export costs relative to Ecuador's).</p>
        <p><span class="badge moderate">Macro shock exposure</span> GDP contracted ${gdp2020.toFixed(1)}% in 2020 (COVID) and coffee export value hit its 2019–2020 low in the same window — the sector tracks broader macro shocks closely, and total merchandise exports now represent ${macroLast.exports_pct_gdp.toFixed(0)}% of GDP (2024), up from ${macroFirst.exports_pct_gdp.toFixed(0)}% in 2015.</p>
      </div>
    </div>`;
}

// ============================================================
// Init
// ============================================================
function renderAll() {
  renderKPIs();
  renderMap(selectedMapYear);
  renderTrendChart();
  renderHsChart();
  renderCompetitorsChart();
  renderPricesChart();
  renderProductionChart();
  renderTopImportersChart();
  renderTariffsSection();
  renderDemandSection();
  renderRiskSemaphore();
  renderLogisticsSection();
  renderRecommendations();
  renderMacroPanel();
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadAllData();
  populateProductFilter();
  populateYearSelect();
  renderAll();
});
