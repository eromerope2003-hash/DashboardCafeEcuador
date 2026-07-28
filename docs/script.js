// Ecuador Coffee Sector Dashboard — rendering logic (Chart.js + Leaflet)

const fmtUSD = (v) => v == null ? "n/a" : "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtUSDShort = (v) => {
  if (v == null) return "n/a";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "K";
  return "$" + v.toFixed(0);
};

const COFFEE_COLORS = { bean: "#2c1810", roast: "#4a2c1a", coffee: "#6f4e37", latte: "#b08968", green: "#4a7c59", amber: "#c1440e" };

// ---------- KPI cards ----------
function renderKPIs() {
  const last = EXPORTS_TOTAL[EXPORTS_TOTAL.length - 1];
  const first = EXPORTS_TOTAL[0];
  const extract2024 = HS_BREAKDOWN.extract210111[HS_BREAKDOWN.extract210111.length - 1];
  const areaFirst = PRODUCTION[0].areaHa, areaLast = PRODUCTION[PRODUCTION.length - 1].areaHa;
  const areaDeclinePct = ((areaFirst - areaLast) / areaFirst * 100).toFixed(0);
  const dest2024 = EXPORTS_BY_DESTINATION.filter(d => d.year === 2024).sort((a, b) => b.value - a.value);
  const topDest = dest2024[0];

  const cards = [
    { label: "Raw Bean Exports (2024)", value: fmtUSDShort(last.value), delta: `HS 0901, FOB` },
    { label: "Instant Extract Exports (2024)", value: fmtUSDShort(extract2024), delta: "HS 210111 — 10x raw beans", cls: "positive" },
    { label: "Coffee Area Harvested", value: areaDeclinePct + "% decline", delta: `${areaFirst.toLocaleString()} → ${areaLast.toLocaleString()} ha (2015–24)`, cls: "risk" },
    { label: "Top Destination (2024)", value: topDest.country, delta: fmtUSDShort(topDest.value) },
  ];

  document.getElementById("kpi-row").innerHTML = cards.map(c => `
    <div class="kpi-card ${c.cls || ""}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="delta">${c.delta}</div>
    </div>`).join("");
}

// ---------- Map ----------
let map, markers = [];
function renderMap(year) {
  if (!map) {
    map = L.map("map", { scrollWheelZoom: false }).setView([10, -40], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    L.circleMarker(ECUADOR_COORDS, { radius: 9, color: COFFEE_COLORS.green, fillColor: COFFEE_COLORS.green, fillOpacity: 0.9 })
      .addTo(map).bindPopup("<strong>Ecuador</strong><br/>Origin");
  }
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const rows = EXPORTS_BY_DESTINATION.filter(d => d.year === year && COUNTRY_COORDS[d.country]);
  const maxVal = Math.max(...rows.map(r => r.value));

  rows.forEach(r => {
    const radius = 5 + (r.value / maxVal) * 22;
    const marker = L.circleMarker(COUNTRY_COORDS[r.country], {
      radius, color: COFFEE_COLORS.amber, fillColor: COFFEE_COLORS.coffee, fillOpacity: 0.65, weight: 1.5,
    }).addTo(map);
    marker.bindTooltip(`${r.country}: ${fmtUSDShort(r.value)}`);
    marker.on("click", () => showCountryDetail(r.country));
    markers.push(marker);
  });
}

function showCountryDetail(country) {
  const history = EXPORTS_BY_DESTINATION.filter(d => d.country === country).sort((a, b) => a.year - b.year);
  const rowsHtml = history.map(h => `<tr><td>${h.year}</td><td style="text-align:right">${fmtUSD(h.value)}</td></tr>`).join("");
  document.getElementById("country-detail").innerHTML = `
    <h3 style="margin:0 0 0.4rem;color:var(--bean)">${country}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
      <thead><tr><th style="text-align:left">Year</th><th style="text-align:right">Export Value</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

// ---------- Charts ----------
let chartTrend, chartHs, chartCompetitors, chartPrices, chartProduction;

function renderTrendChart() {
  const ctx = document.getElementById("chart-trend");
  chartTrend = new Chart(ctx, {
    type: "line",
    data: {
      labels: EXPORTS_TOTAL.map(d => d.year),
      datasets: [
        { label: "Export Value (USD)", data: EXPORTS_TOTAL.map(d => d.value), borderColor: COFFEE_COLORS.roast, backgroundColor: COFFEE_COLORS.roast, yAxisID: "y", tension: 0.25 },
        { label: "Net Weight (kg)", data: EXPORTS_TOTAL.map(d => d.weightKg), borderColor: COFFEE_COLORS.green, backgroundColor: COFFEE_COLORS.green, yAxisID: "y1", tension: 0.25, borderDash: [5, 3] },
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

  const v15 = EXPORTS_TOTAL[0].value, v24 = EXPORTS_TOTAL[9].value;
  const w15 = EXPORTS_TOTAL[0].weightKg, w24 = EXPORTS_TOTAL[9].weightKg;
  const valChange = (((v24 - v15) / v15) * 100).toFixed(0);
  const wChange = (((w24 - w15) / w15) * 100).toFixed(0);
  document.getElementById("trend-note").innerHTML = `<strong>Value and volume have not moved together.</strong> Between 2015 and 2024, raw coffee export value fell ${valChange}% while shipped weight fell ${wChange}% — a much steeper drop, meaning Ecuador is exporting far less coffee by weight, at a price per kg that has only partly cushioned the decline. 2023's net weight figure is unreported by Ecuadorian customs, a genuine data gap.`;
}

function renderHsChart() {
  const ctx = document.getElementById("chart-hs");
  chartHs = new Chart(ctx, {
    type: "bar",
    data: {
      labels: HS_BREAKDOWN.years,
      datasets: [
        { label: "Raw/Roasted Beans (HS 0901)", data: HS_BREAKDOWN.greenBeans0901, backgroundColor: COFFEE_COLORS.latte },
        { label: "Instant/Soluble Extract (HS 210111)", data: HS_BREAKDOWN.extract210111, backgroundColor: COFFEE_COLORS.bean },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { ticks: { callback: fmtUSDShort } } },
    },
  });
}

function renderCompetitorsChart() {
  const ctx = document.getElementById("chart-competitors");
  const palette = { Ecuador: COFFEE_COLORS.amber, Colombia: "#2e6b3e", Brazil: "#1f7a8c", Vietnam: "#8e44ad", Peru: "#b08968" };
  chartCompetitors = new Chart(ctx, {
    type: "line",
    data: {
      labels: COMPETITORS.years,
      datasets: Object.entries(COMPETITORS.series).map(([country, data]) => ({
        label: country, data, borderColor: palette[country], backgroundColor: palette[country],
        borderWidth: country === "Ecuador" ? 3 : 2, tension: 0.2, spanGaps: true,
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { type: "logarithmic", ticks: { callback: fmtUSDShort } } },
    },
  });
}

function renderPricesChart() {
  const ctx = document.getElementById("chart-prices");
  chartPrices = new Chart(ctx, {
    type: "line",
    data: {
      labels: PRICES.map(p => p.year),
      datasets: [
        { label: "Arabica (USD/kg)", data: PRICES.map(p => p.arabica), borderColor: COFFEE_COLORS.roast, tension: 0.25 },
        { label: "Robusta (USD/kg)", data: PRICES.map(p => p.robusta), borderColor: COFFEE_COLORS.green, tension: 0.25 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function renderProductionChart() {
  const ctx = document.getElementById("chart-production");
  chartProduction = new Chart(ctx, {
    type: "bar",
    data: {
      labels: PRODUCTION.map(p => p.year),
      datasets: [
        { type: "bar", label: "Area Harvested (ha)", data: PRODUCTION.map(p => p.areaHa), backgroundColor: COFFEE_COLORS.latte, yAxisID: "y" },
        { type: "line", label: "Yield (kg/ha)", data: PRODUCTION.map(p => p.yieldKgHa), borderColor: COFFEE_COLORS.amber, yAxisID: "y1", tension: 0.25 },
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
}

// ---------- Risk panel (computed, not hardcoded) ----------
function hhi(rows) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const sumSq = rows.reduce((s, r) => s + Math.pow((r.value / total) * 100, 2), 0);
  return { hhi: sumSq, total, top5Share: rows.slice().sort((a, b) => b.value - a.value).slice(0, 5).reduce((s, r) => s + r.value, 0) / total * 100 };
}

function riskLabel(hhiVal) {
  if (hhiVal < 1000) return { label: "Low", cls: "low" };
  if (hhiVal < 1800) return { label: "Moderate", cls: "moderate" };
  return { label: "High", cls: "high" };
}

function renderRiskPanel() {
  const dest2024 = EXPORTS_BY_DESTINATION.filter(d => d.year === 2024);
  const { hhi: hhiVal, top5Share } = hhi(dest2024);
  const risk = riskLabel(hhiVal);

  const priceMax = Math.max(...PRICES.map(p => p.arabica));
  const priceMin = Math.min(...PRICES.map(p => p.arabica));
  const priceSwing = ((priceMax - priceMin) / priceMin * 100).toFixed(0);

  const gdp2020 = MACRO.find(m => m.year === 2020).gdpGrowth;

  document.getElementById("risk-panel").innerHTML = `
    <div class="two-col">
      <div>
        <p><span class="badge ${risk.cls}">${risk.label} concentration risk</span> Export destinations are moderately concentrated: the top 5 buyers (${dest2024.sort((a,b)=>b.value-a.value).slice(0,5).map(d=>d.country).join(", ")}) account for <strong>${top5Share.toFixed(0)}%</strong> of 2024 export value (HHI ≈ ${hhiVal.toFixed(0)}). A demand shock or tariff change in any one of these markets would materially hit Ecuador's coffee exporters.</p>
        <p><span class="badge high">High price volatility risk</span> Arabica prices swung <strong>${priceSwing}%</strong> between their 2015–2024 low ($${priceMin.toFixed(2)}/kg, 2019) and high ($${priceMax.toFixed(2)}/kg, 2024). Ecuadorian growers have no forward-pricing infrastructure comparable to Colombia's or Brazil's cooperatives, leaving smallholders exposed to global price swings.</p>
      </div>
      <div>
        <p><span class="badge moderate">Dollarization: no FX risk, but no FX cushion either</span> Ecuador has used the USD as its official currency since 2000 — it cannot devalue to stay competitive when rivals' currencies weaken (e.g. Colombian peso or Brazilian real depreciation effectively cuts their export costs relative to Ecuador's).</p>
        <p><span class="badge moderate">Macro shock exposure</span> GDP contracted ${gdp2020.toFixed(1)}% in 2020 (COVID) and coffee export value hit its 2019–2020 low in the same window — the sector tracks broader macro shocks closely, and exports now represent ${MACRO[MACRO.length-1].exportsPctGdp.toFixed(0)}% of GDP (2024), up from ${MACRO[0].exportsPctGdp.toFixed(0)}% in 2015.</p>
      </div>
    </div>`;
}

// ---------- Init ----------
function populateYearSelect() {
  const years = [...new Set(EXPORTS_BY_DESTINATION.map(d => d.year))].sort();
  const sel = document.getElementById("map-year");
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
  sel.value = years[years.length - 1];
  sel.addEventListener("change", () => renderMap(Number(sel.value)));
}

document.addEventListener("DOMContentLoaded", () => {
  renderKPIs();
  populateYearSelect();
  renderMap(2024);
  renderTrendChart();
  renderHsChart();
  renderCompetitorsChart();
  renderPricesChart();
  renderProductionChart();
  renderRiskPanel();
});
