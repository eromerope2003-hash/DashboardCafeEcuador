// Ecuador Coffee — Market Entry Advisor
// A decision tool, not an analytical dashboard: it answers "which markets should we
// export to, and why" for the ten candidate destinations in data.js (TOP_MARKETS).
//
// Every number rendered here comes from docs/data/*.csv via data-loader.js — see
// data/SOURCES.md for the citation and confidence level of each dataset. Nothing is
// estimated or filled in: where a source could not confirm a figure it is rendered as
// "n/a" and listed explicitly in the data-gap box.

// ---------------------------------------------------------------------------
// 1. Tariff facts — transcribed from tariffs_and_trade_agreements.csv
// ---------------------------------------------------------------------------
// The CSV stores one free-text cell per (market x HS heading x MFN/preferential), and
// several of those cells contain TWO different rates in the same string — e.g. Japan's
// HS 0901 MFN cell reads "0% for green ... 12% for roasted". Reading such a cell with a
// "first percentage in the string" regex silently reports the green rate for roasted
// coffee, which produced impossible outputs (a preferential rate above the MFN rate).
//
// So each rate is transcribed once, explicitly, per product line, together with:
//   status  — how well sourced it is, using the CSV's own inline flags:
//             confirmed  = primary source confirmed in the CSV cell
//             secondary  = secondary/indirect source, flagged as such in the cell
//             unverified = inferred or "likely", explicitly flagged as unconfirmed
//             gap        = "NOT ESTABLISHED" / "GAP" — no figure exists, never guessed
//   cell    — the CSV column this rate was read from, so it can be traced back
//   note    — the caveat, paraphrased from that same cell
// verifyTariffFacts() below re-reads the CSV at runtime and asserts every transcribed
// number actually appears in the cell it claims to come from.

const F = (value, status, cell, note) => ({ value, status, cell, note });

const TARIFF_FACTS = {
  "Chile": {
    green:   { mfn: F(6, "secondary", "hs_0901_mfn_tariff_pct", "Chile's flat 6% general ad valorem rate, confirmed as policy by Servicio Nacional de Aduanas but not pulled line-by-line for HS 0901."),
               pref: F(0, "unverified", "hs_0901_preferential_tariff_pct", "0% under ACE N.65/75; coffee's inclusion in the agreement's 96.6% duty-free coverage is inferred, not verified line-by-line.") },
    roasted: { mfn: F(6, "secondary", "hs_0901_mfn_tariff_pct", "Same flat 6% general rate."),
               pref: F(0, "unverified", "hs_0901_preferential_tariff_pct", "Same ACE N.65/75 inference.") },
    instant: { mfn: F(6, "secondary", "hs_210111_mfn_tariff_pct", "Same flat 6% general rate; the 2101.11 line item was not pulled verbatim."),
               pref: F(0, "unverified", "hs_210111_preferential_tariff_pct", "Same ACE N.65/75 inference.") },
  },
  "EU (France, Germany, Netherlands, Belgium)": {
    green:   { mfn: F(0, "confirmed", "hs_0901_mfn_tariff_pct", "0% erga omnes third-country duty in TARIC — every origin enters duty-free."),
               pref: F(0, "confirmed", "hs_0901_preferential_tariff_pct", "0% on all HS 0901 lines under the EU-Andean Multi-Party Trade Agreement (Ecuador acceded 1-Jan-2017).") },
    roasted: { mfn: F(7.5, "secondary", "hs_0901_mfn_tariff_pct", "7.5% on roasted coffee — secondary source, not pulled from the live TARIC database."),
               pref: F(0, "confirmed", "hs_0901_preferential_tariff_pct", "0% on all HS 0901 lines under the EU-Andean agreement.") },
    instant: { mfn: F(9, "secondary", "hs_210111_mfn_tariff_pct", "9% erga omnes on coffee extracts — secondary source, not pulled from live TARIC."),
               pref: F(0, "unverified", "hs_210111_preferential_tariff_pct", "0% inferred from the EU-Andean agreement's tariff-elimination scope, not a line-by-line TARIC pull.") },
  },
  "USA": {
    green:   { mfn: F(0, "confirmed", "hs_0901_mfn_tariff_pct", "HTS 0901.11.00 General rate = Free, confirmed on USITC's own tool."),
               pref: F(0, "confirmed", "hs_0901_preferential_tariff_pct", "Already duty-free MFN, so no preference is needed.") },
    roasted: { mfn: F(0, "confirmed", "hs_0901_mfn_tariff_pct", "HTS 0901.21.00 General rate = Free, confirmed on USITC's own tool."),
               pref: F(0, "confirmed", "hs_0901_preferential_tariff_pct", "Already duty-free MFN.") },
    instant: { mfn: F(0, "confirmed", "hs_210111_mfn_tariff_pct", "HTS 2101.11.21 (unflavored instant) General rate = Free. Coffee preparations WITH additives (HTS 2101.12) can carry 8.5-10%+."),
               pref: F(0, "confirmed", "hs_210111_preferential_tariff_pct", "Already duty-free MFN.") },
  },
  "Colombia": {
    green:   { mfn: F(null, "gap", "hs_0901_mfn_tariff_pct", "Colombia's MFN rate for non-CAN origins was not established in the research pass. It does not apply to Ecuador, which trades under CAN."),
               pref: F(0, "confirmed", "hs_0901_preferential_tariff_pct", "0% intra-community under the Comunidad Andina (Acuerdo de Cartagena). Note: suspended in the Feb-Jun 2026 bilateral tariff dispute before being rolled back.") },
    roasted: { mfn: F(null, "gap", "hs_0901_mfn_tariff_pct", "Same gap as green."),
               pref: F(0, "confirmed", "hs_0901_preferential_tariff_pct", "Same CAN zero-tariff rule.") },
    instant: { mfn: F(null, "gap", "hs_210111_mfn_tariff_pct", "Same gap as HS 0901 MFN."),
               pref: F(0, "confirmed", "hs_210111_preferential_tariff_pct", "Same CAN zero-tariff rule applies to 2101.11.") },
  },
  "Japan": {
    green:   { mfn: F(0, "secondary", "hs_0901_mfn_tariff_pct", "No import tariff on green coffee, corroborated by a JETRO summary."),
               pref: F(0, "secondary", "hs_0901_mfn_tariff_pct", "Ecuador has no EPA/FTA with Japan, but green coffee is already 0% for every origin.") },
    roasted: { mfn: F(12, "unverified", "hs_0901_mfn_tariff_pct", "12% is Japan's WTO bound rate per customs.go.jp; the general applied rate was not isolated, so 12% is the conservative worst case."),
               pref: F(10, "unverified", "hs_0901_preferential_tariff_pct", "10% is Japan's GSP rate and Ecuador is a confirmed GSP beneficiary — but whether roasted coffee is on Japan's 431-item GSP list was NOT confirmed.") },
    instant: { mfn: F(null, "gap", "hs_210111_mfn_tariff_pct", "Japan Customs' 2101.11 line-item rate was not found in two research passes."),
               pref: F(null, "gap", "hs_210111_preferential_tariff_pct", "Same unresolved gap as the MFN rate.") },
  },
  "Republic of Korea": {
    green:   { mfn: F(2, "unverified", "hs_0901_mfn_tariff_pct", "~2% from a specialty-coffee trade blog citing Korea's standard duty — NOT Korea Customs Service's own schedule."),
               pref: F(2, "unverified", "hs_0901_mfn_tariff_pct", "Same as MFN: the Ecuador-Korea SECA is signed but not yet in force, so no preference applies today.") },
    roasted: { mfn: F(null, "gap", "hs_0901_mfn_tariff_pct", "Korea's roasted-coffee (0901.21) rate was not established."),
               pref: F(null, "gap", "hs_0901_preferential_tariff_pct", "No preference in force, and the underlying MFN rate is itself a gap.") },
    instant: { mfn: F(null, "gap", "hs_210111_mfn_tariff_pct", "Korea's 2101.11 rate was not found via public search."),
               pref: F(null, "gap", "hs_210111_preferential_tariff_pct", "No preference in force, and the underlying MFN rate is itself a gap.") },
  },
  "China": {
    green:   { mfn: F(8, "secondary", "hs_0901_mfn_tariff_pct", "8% applied MFN (15% WTO-bound) via a Costa Rican trade-office technical sheet, not China's own tariff commission."),
               pref: F(0, "secondary", "hs_0901_preferential_tariff_pct", "0% since the China-Ecuador FTA entered into force 1-May-2024, with coffee in the immediate zero-tariff category.") },
    roasted: { mfn: F(15, "secondary", "hs_0901_mfn_tariff_pct", "15% applied MFN on roasted coffee, same secondary source."),
               pref: F(0, "secondary", "hs_0901_preferential_tariff_pct", "Same China-Ecuador FTA immediate zero-tariff treatment.") },
    instant: { mfn: F(null, "gap", "hs_210111_mfn_tariff_pct", "China's MFN rate for coffee extract was not found."),
               pref: F(0, "unverified", "hs_210111_preferential_tariff_pct", "0% inferred from the FTA's immediate zero-tariff scope, not confirmed for the 2101.11 line specifically.") },
  },
};

const LINE_LABELS = {
  green: "Green beans (HS 0901.11/.12)",
  roasted: "Roasted beans (HS 0901.21/.22)",
  instant: "Instant extract (HS 2101.11)",
};

// Which tariff lines describe each product filter.
const PRODUCT_LINES = {
  all: ["green", "roasted", "instant"],
  green: ["green"],
  roasted: ["roasted"],
  instant: ["instant"],
  other: ["instant"], // HS 0901.90 husks & HS 2101.12 preparations have no separate researched rate
};

const STATUS_RANK = { confirmed: 0, secondary: 1, unverified: 2, gap: 3 };
const STATUS_LABEL = {
  confirmed: "Confirmed (primary source)",
  secondary: "Secondary source",
  unverified: "Unverified / inferred",
  gap: "No figure available",
};

// Runtime self-check: every transcribed rate must actually appear, as a percentage, in
// the CSV cell it claims to come from. Catches silent drift if the CSV is ever updated.
function verifyTariffFacts() {
  const problems = [];
  const pctsIn = (text) => {
    const out = [];
    const re = /(\d+(?:\.\d+)?)\s*%/g;
    let m;
    while ((m = re.exec(text || "")) !== null) out.push(Number(m[1]));
    return out;
  };
  Object.entries(TARIFF_FACTS).forEach(([market, lines]) => {
    const row = DATA.tariffs.find(r => r.market === market);
    if (!row) { problems.push(`No CSV row for "${market}"`); return; }
    Object.entries(lines).forEach(([line, kinds]) => {
      Object.entries(kinds).forEach(([kind, fact]) => {
        const text = row[fact.cell];
        if (text === undefined) { problems.push(`${market}/${line}/${kind}: column ${fact.cell} missing`); return; }
        if (fact.value === null) {
          if (!/NOT ESTABLISHED|GAP/i.test(text)) problems.push(`${market}/${line}/${kind}: marked as a gap but ${fact.cell} does not say so`);
        } else if (!pctsIn(text).includes(fact.value)) {
          problems.push(`${market}/${line}/${kind}: ${fact.value}% not found in ${fact.cell}`);
        }
      });
    });
  });
  return problems;
}

// ---------------------------------------------------------------------------
// 2. State + data access
// ---------------------------------------------------------------------------

let selectedProduct = "all";
let selectedMarket = null;
const charts = {};

const HS0901_CODES = ["090111", "090112", "090121", "090122", "090190"];

const activeHsCodes = () => PRODUCT_CATEGORIES[selectedProduct].hsCodes;
const activeLines = () => PRODUCT_LINES[selectedProduct];
const tariffFactsFor = (iso3) => TARIFF_FACTS[TARIFF_ROW_KEY[iso3]];
const tariffRowFor = (iso3) => DATA.tariffs.find(r => r.market === TARIFF_ROW_KEY[iso3]);

// Blended rate across the lines covered by the current product filter. With a single
// line this is just that line's rate; with "All coffee products" it is the plain average
// of the lines that have a figure, and the missing ones are named rather than assumed.
function tariffFor(iso3, kind) {
  const facts = tariffFactsFor(iso3);
  const lines = activeLines();
  const parts = lines.map(l => ({ line: l, ...facts[l][kind] }));
  const known = parts.filter(p => p.value !== null);
  const missing = parts.filter(p => p.value === null).map(p => p.line);
  const status = parts.reduce((worst, p) => (STATUS_RANK[p.status] > STATUS_RANK[worst] ? p.status : worst), "confirmed");
  return {
    value: known.length ? known.reduce((s, p) => s + p.value, 0) / known.length : null,
    status: known.length ? status : "gap",
    parts, missing,
    blended: lines.length > 1 && known.length > 1,
  };
}

function latestWith(rows, field) {
  const withVal = rows.filter(r => r[field] != null);
  return withVal.length ? withVal.reduce((a, b) => (b.year > a.year ? b : a)) : null;
}

const wgiLatest = (iso3) => latestWith(DATA.countryRiskWgi.filter(r => r.iso3 === iso3), "political_stability");
const lpiLatest = (iso3) => latestWith(DATA.lpi.filter(r => r.iso3 === iso3), "lpi_overall_score");
const fxVolFor = (iso3) => { const r = DATA.fxVolatility.find(x => x.iso3 === iso3); return r ? r.fx_yoy_volatility_stdev_pct_2015_2024 : null; };
const logisticsRowFor = (name) => DATA.logisticsDistances.find(r => r.market === name);
const importSeries = (iso3) => DATA.marketImports.filter(r => r.iso3 === iso3 && r.import_value_usd > 0).sort((a, b) => a.year - b.year);

function importCAGR(iso3) {
  const s = importSeries(iso3);
  if (s.length < 2) return null;
  const first = s[0], last = s[s.length - 1];
  const n = last.year - first.year;
  if (n <= 0 || first.import_value_usd <= 0) return null;
  return (Math.pow(last.import_value_usd / first.import_value_usd, 1 / n) - 1) * 100;
}

function ecuadorExports(iso3, year, codes) {
  return DATA.exportsFull
    .filter(r => r.year === year && r.partner_iso3 === iso3 && codes.includes(r.hs_code))
    .reduce((s, r) => s + (r.export_value_usd || 0), 0);
}

// Ecuador's share of the market. The import-side series covers HS 0901 only, so the
// numerator is restricted to HS 0901 too — comparing instant-coffee exports against
// bean imports would be meaningless, and for those filters the share is reported n/a.
function penetration(iso3, year = 2024) {
  const codes = activeHsCodes().filter(c => HS0901_CODES.includes(c));
  if (!codes.length) return null;
  const imports = DATA.marketImports.filter(r => r.iso3 === iso3).sort((a, b) => b.year - a.year)[0];
  if (!imports || !imports.import_value_usd) return null;
  return ecuadorExports(iso3, year, codes) / imports.import_value_usd;
}

function normalize(value, all, invert = false) {
  const vals = all.filter(v => v != null);
  if (value == null || !vals.length) return 50; // unknown -> neutral, never a guessed value
  const min = Math.min(...vals), max = Math.max(...vals);
  if (max === min) return 50;
  let score = ((value - min) / (max - min)) * 100;
  return invert ? 100 - score : score;
}

// ---------------------------------------------------------------------------
// 3. Scoring — same three pillars and weights as the full dashboard
// ---------------------------------------------------------------------------

function computeMarkets() {
  const metrics = TOP_MARKETS.map(m => {
    const wgi = wgiLatest(m.iso3);
    const lpi = lpiLatest(m.iso3);
    const log = logisticsRowFor(m.comtradeName);
    const imports = importSeries(m.iso3);
    return {
      iso3: m.iso3,
      name: m.name,
      comtradeName: m.comtradeName,
      governance: wgi ? (wgi.political_stability + wgi.government_effectiveness + wgi.regulatory_quality + wgi.rule_of_law) / 4 : null,
      governanceYear: wgi ? wgi.year : null,
      cagr: importCAGR(m.iso3),
      pref: tariffFor(m.iso3, "pref"),
      mfn: tariffFor(m.iso3, "mfn"),
      fx: fxVolFor(m.iso3),
      lpiScore: lpi ? lpi.lpi_overall_score : null,
      lpiYear: lpi ? lpi.year : null,
      transitDays: log ? log.estimated_transit_days : null,
      port: log ? log.destination_port : null,
      marketSize: imports.length ? imports[imports.length - 1].import_value_usd : null,
      marketSizeYear: imports.length ? imports[imports.length - 1].year : null,
      ecuValue: ecuadorExports(m.iso3, 2024, activeHsCodes()),
      share: penetration(m.iso3),
      tariffRow: tariffRowFor(m.iso3),
    };
  });

  const all = {
    governance: metrics.map(m => m.governance),
    cagr: metrics.map(m => m.cagr),
    tariff: metrics.map(m => m.pref.value),
    fx: metrics.map(m => m.fx),
    lpi: metrics.map(m => m.lpiScore),
    transit: metrics.map(m => m.transitDays),
    share: metrics.map(m => m.share),
  };

  return metrics.map(m => {
    const demandScore = normalize(m.cagr, all.cagr);
    const tariffScore = normalize(m.pref.value, all.tariff, true);
    const riskScore = normalize(m.governance, all.governance);
    const fxScore = normalize(m.fx, all.fx, true);
    const lpiNorm = normalize(m.lpiScore, all.lpi);
    const transitScore = normalize(m.transitDays, all.transit, true);
    const headroomScore = normalize(m.share, all.share, true);

    const analytical = 0.4 * demandScore + 0.3 * tariffScore + 0.3 * riskScore;
    const strategic = 0.5 * demandScore + 0.5 * headroomScore;
    const business = 0.3 * riskScore + 0.2 * fxScore + 0.25 * lpiNorm + 0.25 * transitScore;
    const overall = (analytical + strategic + business) / 3;

    const verdict = overall >= 60 ? "go" : overall >= 40 ? "watch" : "hold";
    const verdictLabel = { go: "Prioritise", watch: "Consider", hold: "Deprioritise" }[verdict];

    return { ...m, demandScore, tariffScore, riskScore, fxScore, lpiNorm, transitScore, headroomScore,
             analytical, strategic, business, overall, verdict, verdictLabel };
  }).sort((a, b) => b.overall - a.overall);
}

// ---------------------------------------------------------------------------
// 4. Formatting
// ---------------------------------------------------------------------------

// Whole numbers read cleaner at projector distance: 6% rather than 6.0%.
const pct = (v, d) => (v == null ? "n/a" : `${v.toFixed(d != null ? d : (v % 1 ? 1 : 0))}%`);
const signedPct = (v, d = 1) => (v == null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);

function money(v) {
  if (v == null) return "n/a";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}bn`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}m`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function tariffColor(t) {
  if (t.value == null) return "gap";
  if (t.value === 0) return "good";
  if (t.value <= 5) return "warn";
  return "bad";
}

const PALETTE = {
  ink: "#0f172a", inkSoft: "#475569", muted: "#64748b", line: "#e3e8ef",
  brand: "#2563eb", teal: "#0d9488", good: "#10b981", warn: "#f59e0b",
  bad: "#dc2626", gap: "#cbd5e1",
};

// ---------------------------------------------------------------------------
// 5. Chart helpers
// ---------------------------------------------------------------------------

// Draws the value (or "n/a") at the end of every bar — on a projected screen, reading
// numbers off an axis does not work, so each bar carries its own label.
const barValueLabels = {
  id: "barValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === "y";
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden || !ds.valueLabels) return;
      meta.data.forEach((el, i) => {
        const text = ds.valueLabels[i];
        if (!text) return;
        const isNull = ds.data[i] == null;
        ctx.save();
        ctx.font = "700 15px Inter, system-ui, sans-serif";
        ctx.fillStyle = isNull ? PALETTE.muted : PALETTE.ink;
        if (horizontal) {
          const zero = chart.scales.x.getPixelForValue(0);
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(text, (isNull ? zero : el.x) + 9, el.y);
        } else {
          const zero = chart.scales.y.getPixelForValue(0);
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(text, el.x, (isNull ? zero : el.y) - 7);
        }
        ctx.restore();
      });
    });
  },
};

// A market that is duty-free on every line draws an empty plot, which reads as a broken
// chart on a projector. Say the thing instead.
const emptyStateNote = {
  id: "emptyStateNote",
  afterDraw(chart, args, opts) {
    if (!opts || !opts.text) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#047857";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.text, (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2);
    ctx.restore();
  },
};

const bubbleLabels = {
  id: "bubbleLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      meta.data.forEach((el, i) => {
        const point = ds.data[i];
        if (!point || !point.label) return;
        ctx.save();
        ctx.font = "700 15px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        // White halo keeps the name legible where bubbles overlap.
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(point.label, el.x, el.y - el.options.radius - 6);
        ctx.fillStyle = PALETTE.ink;
        ctx.fillText(point.label, el.x, el.y - el.options.radius - 6);
        ctx.restore();
      });
    });
  },
};

function setupChartDefaults() {
  Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 15;
  Chart.defaults.color = PALETTE.inkSoft;
  Chart.defaults.plugins.legend.labels.boxWidth = 16;
  Chart.defaults.plugins.legend.labels.padding = 18;
  Chart.defaults.plugins.legend.labels.font = { size: 15, weight: "600" };
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.titleFont = { size: 16, weight: "700" };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 15 };
  Chart.defaults.maintainAspectRatio = false;
}

function render(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

// ---------------------------------------------------------------------------
// 6. Overview charts
// ---------------------------------------------------------------------------

function renderTariffChart(markets) {
  // Highest wall at the top: the story reads downwards from "expensive" to "free".
  const sorted = [...markets].sort((a, b) => {
    const av = a.mfn.value, bv = b.mfn.value;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });

  render("chart-tariff", {
    type: "bar",
    data: {
      labels: sorted.map(m => m.name + (m.mfn.status === "gap" || m.pref.status === "gap" ? "  ⚠" : "")),
      datasets: [
        {
          label: "MFN tariff — what any exporter pays",
          data: sorted.map(m => m.mfn.value),
          valueLabels: sorted.map(m => (m.mfn.value == null ? "n/a" : pct(m.mfn.value, m.mfn.value % 1 ? 1 : 0))),
          backgroundColor: "rgba(220, 38, 38, .85)",
          borderRadius: 4,
          barPercentage: .82,
          categoryPercentage: .74,
        },
        {
          label: "Ecuador's preferential tariff",
          data: sorted.map(m => m.pref.value),
          valueLabels: sorted.map(m => (m.pref.value == null ? "n/a" : pct(m.pref.value, m.pref.value % 1 ? 1 : 0))),
          backgroundColor: "rgba(16, 185, 129, .9)",
          borderRadius: 4,
          barPercentage: .82,
          categoryPercentage: .74,
        },
      ],
    },
    options: {
      indexAxis: "y",
      layout: { padding: { right: 56 } },
      scales: {
        x: {
          title: { display: true, text: "Ad valorem tariff (%)", font: { size: 15, weight: "600" } },
          grid: { color: PALETTE.line },
          ticks: { callback: v => v + "%" },
          suggestedMax: 8,
        },
        y: { grid: { display: false }, ticks: { font: { size: 16, weight: "600" }, color: PALETTE.ink } },
      },
      plugins: {
        legend: { position: "top", align: "start" },
        tooltip: {
          callbacks: {
            label: (c) => {
              const m = sorted[c.dataIndex];
              const t = c.datasetIndex === 0 ? m.mfn : m.pref;
              const head = `${c.dataset.label}: ${t.value == null ? "not established" : pct(t.value)}`;
              const detail = t.parts.filter(p => p.value !== null).map(p => `${LINE_LABELS[p.line].split(" (")[0]}: ${pct(p.value)}`);
              const gaps = t.missing.map(l => `${LINE_LABELS[l].split(" (")[0]}: n/a`);
              return [head, ...(t.parts.length > 1 ? [...detail, ...gaps] : []), `Sourcing: ${STATUS_LABEL[t.status]}`];
            },
          },
        },
      },
    },
    plugins: [barValueLabels],
  });

  const gapMarkets = markets.filter(m => m.mfn.status === "gap" || m.pref.status === "gap").map(m => m.name);
  const blended = markets[0].pref.blended;
  document.getElementById("tariff-note").innerHTML =
    (blended ? `<b>Rates shown are the average of the green, roasted and instant lines</b> for the "All coffee products" filter — pick a single product above to see that line's own rate. ` : "") +
    (gapMarkets.length ? `<b>⚠ ${gapMarkets.join(", ")}</b> have at least one tariff line that no source could confirm; those are shown as "n/a" and never estimated. ` : "") +
    `Tariff research is the weakest-sourced dataset in this project (web-sourced, not a primary tariff database) — see <code>data/SOURCES.md</code>.`;
}

// Snap a log-axis bound to the nearest 1/2/5 x 10^n so the end labels read as round
// numbers ($50m, $20bn) instead of whatever the data happened to produce.
function niceLog(v, dir) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const steps = [1, 2, 5, 10];
  const mantissa = v / exp;
  const step = dir === "up" ? steps.find(s => s >= mantissa) : [...steps].reverse().find(s => s <= mantissa);
  return step * exp;
}

function renderOpportunityChart(markets) {
  const usable = markets.filter(m => m.cagr != null && m.marketSize);
  const points = usable.map(m => ({
    x: m.cagr,
    y: m.marketSize,
    r: 9 + (m.headroomScore / 100) * 20,
    label: m.name,
    iso3: m.iso3,
  }));
  const colors = usable.map(m => ({ good: "rgba(16,185,129,.72)", warn: "rgba(245,158,11,.72)", bad: "rgba(220,38,38,.7)", gap: "rgba(148,163,184,.65)" }[tariffColor(m.pref)]));
  const borders = usable.map(m => ({ good: "#059669", warn: "#b45309", bad: "#b91c1c", gap: "#64748b" }[tariffColor(m.pref)]));

  render("chart-opportunity", {
    type: "bubble",
    data: { datasets: [{ label: "Candidate markets", data: points, backgroundColor: colors, borderColor: borders, borderWidth: 2 }] },
    options: {
      layout: { padding: { top: 28, right: 28, left: 8 } },
      scales: {
        x: {
          title: { display: true, text: "Import demand growth, CAGR 2015–2024 (%)", font: { size: 15, weight: "600" } },
          grid: { color: PALETTE.line },
          ticks: { callback: v => v + "%" },
        },
        y: {
          type: "logarithmic",
          // Explicit bounds: the auto-fitted maximum clipped the largest market off the
          // top of the plot, and unfiltered log ticks produce an unreadable label stack.
          min: niceLog(Math.min(...points.map(p => p.y)) / 2.2, "down"),
          max: niceLog(Math.max(...points.map(p => p.y)) * 2.2, "up"),
          afterBuildTicks: (axis) => {
            axis.ticks = axis.ticks.filter(t => {
              const mantissa = Math.round(t.value / Math.pow(10, Math.floor(Math.log10(t.value))));
              return mantissa === 1 || mantissa === 2 || mantissa === 5;
            });
          },
          title: { display: true, text: "Market size — coffee imports 2024 (US$, log scale)", font: { size: 15, weight: "600" } },
          grid: { color: PALETTE.line },
          ticks: { callback: v => money(v) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (c) => {
              const m = usable[c.dataIndex];
              return [
                `Imports ${m.marketSizeYear}: ${money(m.marketSize)}`,
                `Demand growth: ${signedPct(m.cagr)}/yr`,
                `Ecuador's tariff: ${m.pref.value == null ? "not established" : pct(m.pref.value)}`,
                `Ecuador's share: ${m.share == null ? "n/a (HS 0901 basis only)" : pct(m.share * 100, 2)}`,
              ];
            },
          },
        },
      },
      onClick: (evt, els) => {
        if (els.length) selectMarket(usable[els[0].index].iso3);
      },
    },
    plugins: [bubbleLabels],
  });

  document.getElementById("opportunity-note").innerHTML =
    `Bubble size = market headroom (how little of the market Ecuador holds today, scored against the other nine). Colour = Ecuador's tariff: <span class="chip good">0%</span> <span class="chip warn">up to 5%</span> <span class="chip bad">above 5%</span> <span class="chip gap">not established</span>. ` +
    `Demand is measured on HS 0901 imports — the only import-side series collected — so it is a bean-equivalent proxy for markets Ecuador serves with instant coffee. Click a bubble to open that market.`;
}

// ---------------------------------------------------------------------------
// 6b. Product-line comparison — deliberately NOT filtered
// ---------------------------------------------------------------------------
// The rest of the page answers "where do I sell THIS product". This block answers the
// question behind it: the same destination is a different market depending on whether you
// ship a bean or a jar, and the tariff wall is what makes it so. It always shows all three
// lines, whatever the filter says.

function renderTariffMatrix() {
  const lines = ["green", "roasted", "instant"];
  const rows = TOP_MARKETS.map(m => {
    const facts = TARIFF_FACTS[TARIFF_ROW_KEY[m.iso3]];
    return { iso3: m.iso3, name: m.name, cells: lines.map(l => ({ line: l, pref: facts[l].pref, mfn: facts[l].mfn })) };
  });

  const cellHtml = (c) => {
    const p = c.pref, mfnTxt = c.mfn.value == null ? "MFN n/a" : `MFN ${pct(c.mfn.value)}`;
    const tone = p.value == null ? "gap" : p.value === 0 ? "good" : p.value <= 5 ? "warn" : "bad";
    const title = `${LINE_LABELS[c.line]}\nEcuador: ${p.value == null ? "not established" : pct(p.value)} (${STATUS_LABEL[p.status]})\n${p.note}`;
    return `<td class="mx-cell mx-${tone}" title="${title.replace(/"/g, "&quot;")}">
      <span class="mx-main">${p.value == null ? "n/a" : pct(p.value)}</span>
      <span class="mx-sub">${mfnTxt}</span>
      ${p.status === "gap" || p.status === "unverified" ? '<span class="mx-flag" aria-label="unconfirmed">⚠</span>' : ""}
    </td>`;
  };

  document.getElementById("tariff-matrix").innerHTML = `
    <table class="matrix">
      <thead><tr><th class="mx-market">Market</th>${lines.map(l => `<th>${LINE_LABELS[l].split(" (")[0]}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr><th class="mx-market">${r.name}</th>${r.cells.map(cellHtml).join("")}</tr>`).join("")}</tbody>
    </table>
    <p class="matrix-legend">
      <span class="chip good">0% — duty-free</span>
      <span class="chip warn">up to 5%</span>
      <span class="chip bad">above 5%</span>
      <span class="chip gap">⚠ not established / unconfirmed</span>
    </p>`;
}

const MIX_LINES = [
  { key: "green",   label: "Green beans",     codes: ["090111", "090112"], color: "rgba(37,99,235,.9)" },
  { key: "roasted", label: "Roasted beans",   codes: ["090121", "090122"], color: "rgba(245,158,11,.9)" },
  { key: "instant", label: "Instant extract", codes: ["210111"],           color: "rgba(13,148,136,.9)" },
  { key: "other",   label: "Husks & prep.",   codes: ["090190", "210112"], color: "rgba(148,163,184,.9)" },
];

function renderMixChart() {
  const years = [...new Set(DATA.exportsByHsCode.map(r => r.year))].sort((a, b) => a - b);
  const sum = (year, codes) => DATA.exportsByHsCode
    .filter(r => r.year === year && codes.includes(r.hs_code))
    .reduce((s, r) => s + (r.export_value_usd || 0), 0);

  render("chart-mix", {
    type: "bar",
    data: {
      labels: years,
      datasets: MIX_LINES.map(l => ({
        label: l.label,
        data: years.map(y => sum(y, l.codes)),
        backgroundColor: l.color,
        borderRadius: 3,
        // Highlight the line(s) the current filter covers, so the tabs above and this
        // chart visibly refer to the same thing.
        borderColor: PALETTE.ink,
        borderWidth: activeLines().includes(l.key) || (selectedProduct === "other" && l.key === "other") ? 2 : 0,
      })),
    },
    options: {
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 14 } } },
        y: { stacked: true, grid: { color: PALETTE.line }, ticks: { callback: v => money(v) }, title: { display: true, text: "Export value (US$)", font: { size: 14, weight: "600" } } },
      },
      plugins: {
        legend: { position: "top", align: "start", labels: { boxWidth: 14 } },
        tooltip: { mode: "index", callbacks: { label: (c) => `${c.dataset.label}: ${money(c.parsed.y)}` } },
      },
    },
  });

  const last = years[years.length - 1];
  const totals = MIX_LINES.map(l => ({ label: l.label, v: sum(last, l.codes) }));
  const total = totals.reduce((s, t) => s + t.v, 0);
  const top = totals.slice().sort((a, b) => b.v - a.v)[0];
  document.getElementById("mix-note").innerHTML =
    `In ${last}, <b>${top.label.toLowerCase()} accounted for ${pct((top.v / total) * 100, 0)} of Ecuador's coffee export value</b> ` +
    `(${money(top.v)} of ${money(total)}). That is why this dashboard is built per product line and not on "coffee" as a single good: ` +
    `the tariff walls, the destinations and the competitors are not the same for a bean and for a soluble extract.`;
}

// ---------------------------------------------------------------------------
// 7. Ranking + recommendation
// ---------------------------------------------------------------------------

function tariffPhrase(m) {
  if (m.pref.value == null) return "tariff not established";
  if (m.pref.value === 0 && m.mfn.value != null && m.mfn.value > 0) return `duty-free, vs. ${pct(m.mfn.value)} for exporters without an agreement`;
  if (m.pref.value === 0) return "duty-free entry";
  return `${pct(m.pref.value)} tariff on Ecuador`;
}

function whySentence(m) {
  const demand = m.cagr == null ? "demand growth unknown"
    : m.cagr >= 8 ? `demand growing fast at ${signedPct(m.cagr)}/yr`
    : m.cagr >= 3 ? `demand growing ${signedPct(m.cagr)}/yr`
    : m.cagr >= 0 ? `flat demand (${signedPct(m.cagr)}/yr)`
    : `shrinking demand (${signedPct(m.cagr)}/yr)`;
  const room = m.share == null ? "share not comparable on this product"
    : m.share < 0.005 ? "almost no Ecuadorian presence yet"
    : `Ecuador already holds ${pct(m.share * 100, 2)}`;
  return `${tariffTitleCase(tariffPhrase(m))}; ${demand}; ${room}.`;
}
const tariffTitleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function renderPicks(markets) {
  const top = markets.slice(0, 3);
  document.getElementById("pick-grid").innerHTML = top.map((m, i) => `
    <article class="pick ${m.verdict}">
      <div class="pick-verdict">#${i + 1} · ${m.verdictLabel}</div>
      <div class="pick-name">${m.name}</div>
      <div class="pick-tariff"><b>${m.pref.value == null ? "n/a" : pct(m.pref.value)}</b> tariff for Ecuador</div>
      <p class="pick-why">${whySentence(m)}</p>
    </article>`).join("");
}

function renderRanking(markets) {
  document.getElementById("rank-list").innerHTML = markets.map((m, i) => `
    <button class="rank-row${m.iso3 === selectedMarket ? " active" : ""}" data-iso3="${m.iso3}">
      <span class="rank-num">#${i + 1}</span>
      <span class="rank-name">${m.name}</span>
      <span class="rank-metric"><span>Ecuador pays</span><strong class="t-${tariffColor(m.pref)}">${m.pref.value == null ? "n/a" : pct(m.pref.value)}</strong></span>
      <span class="rank-metric hide-sm"><span>Demand growth</span><strong>${m.cagr == null ? "n/a" : signedPct(m.cagr)}</strong></span>
      <span class="rank-bar-wrap"><span class="rank-bar"><i class="${m.verdict}" style="width:${m.overall.toFixed(0)}%"></i></span></span>
      <span class="rank-score">${m.overall.toFixed(0)}</span>
    </button>`).join("");

  document.querySelectorAll(".rank-row").forEach(btn => {
    btn.addEventListener("click", () => selectMarket(btn.dataset.iso3));
  });
}

// ---------------------------------------------------------------------------
// 8. Country detail
// ---------------------------------------------------------------------------

function renderDetail(markets) {
  const m = markets.find(x => x.iso3 === selectedMarket) || markets[0];
  selectedMarket = m.iso3;

  const fta = m.tariffRow ? m.tariffRow.has_fta_with_ecuador : null;
  const ftaChip = fta === "yes" ? `<span class="chip good">Trade agreement in force</span>`
    : fta === "partial" ? `<span class="chip warn">Agreement signed, not yet in force</span>`
    : `<span class="chip gap">No trade agreement with Ecuador</span>`;
  // Summary chip only — the full requirement list lives in its own panel further down.
  const certs = CERTIFICATIONS[m.iso3];
  const nM = certs ? certs.mandatory.length : 0;
  const certChips = !certs ? `<span class="chip gap">Certifications not researched</span>`
    : nM ? `<span class="chip info">${nM} mandatory requirement${nM === 1 ? "" : "s"} to comply with</span>`
         : `<span class="chip gap">No mandatory requirement identified</span>`;

  document.getElementById("detail-head").innerHTML = `
    <h2>${m.name}</h2>
    <span class="detail-verdict ${m.verdict}">${m.verdictLabel} · score ${m.overall.toFixed(0)}/100</span>
    <span class="chip-row">${ftaChip}${certChips}</span>`;

  renderDetailTariff(m);
  renderDetailDemand(m);
  renderDetailOps(m);
  renderDetailFacts(m);
  renderDetailCerts(m);
  renderDetailGaps(m);
}

function renderDetailTariff(m) {
  const facts = tariffFactsFor(m.iso3);
  const lines = ["green", "roasted", "instant"];
  const mfn = lines.map(l => facts[l].mfn.value);
  const pref = lines.map(l => facts[l].pref.value);

  render("chart-detail-tariff", {
    type: "bar",
    data: {
      labels: lines.map(l => LINE_LABELS[l].split(" (")[0]),
      datasets: [
        { label: "MFN (any exporter)", data: mfn, valueLabels: mfn.map(v => (v == null ? "n/a" : pct(v, v % 1 ? 1 : 0))), backgroundColor: "rgba(220,38,38,.85)", borderRadius: 4 },
        { label: "Ecuador pays", data: pref, valueLabels: pref.map(v => (v == null ? "n/a" : pct(v, v % 1 ? 1 : 0))), backgroundColor: "rgba(16,185,129,.9)", borderRadius: 4 },
      ],
    },
    options: {
      layout: { padding: { top: 26 } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 14, weight: "600" }, color: PALETTE.ink } },
        // Headroom above the tallest bar so its value label never collides with the legend.
        y: { title: { display: true, text: "Tariff (%)", font: { size: 14, weight: "600" } }, grid: { color: PALETTE.line }, ticks: { callback: v => v + "%" }, suggestedMax: Math.max(8, ...[...mfn, ...pref].filter(v => v != null).map(v => v * 1.25)) },
      },
      plugins: {
        emptyStateNote: { text: [...mfn, ...pref].every(v => v === 0) ? "Duty-free on every product line — no tariff barrier here" : null },
        legend: { position: "top", align: "start" },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const line = lines[items[0].dataIndex];
              const f = facts[line][items[0].datasetIndex === 0 ? "mfn" : "pref"];
              return [`Sourcing: ${STATUS_LABEL[f.status]}`, "", f.note];
            },
          },
        },
      },
    },
    plugins: [barValueLabels, emptyStateNote],
  });
}

function renderDetailDemand(m) {
  const imports = importSeries(m.iso3);
  const years = imports.map(r => r.year);
  const ecu = years.map(y => ecuadorExports(m.iso3, y, activeHsCodes()));

  render("chart-detail-demand", {
    data: {
      labels: years,
      datasets: [
        {
          type: "line",
          label: `${m.name} — total coffee imports (HS 0901)`,
          data: imports.map(r => r.import_value_usd),
          borderColor: PALETTE.brand,
          backgroundColor: "rgba(37,99,235,.10)",
          borderWidth: 3.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: true,
          tension: .25,
          yAxisID: "y",
        },
        {
          type: "bar",
          label: `Ecuador's exports to ${m.name} — ${PRODUCT_CATEGORIES[selectedProduct].label}`,
          data: ecu,
          backgroundColor: "rgba(13,148,136,.85)",
          borderRadius: 3,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 14 } } },
        y: { position: "left", title: { display: true, text: "Market imports (US$)", font: { size: 14, weight: "600" }, color: PALETTE.brand }, grid: { color: PALETTE.line }, ticks: { callback: v => money(v) }, beginAtZero: true },
        y1: { position: "right", title: { display: true, text: "Ecuador's exports (US$)", font: { size: 14, weight: "600" }, color: PALETTE.teal }, grid: { display: false }, ticks: { callback: v => money(v) }, beginAtZero: true },
      },
      plugins: {
        legend: { position: "top", align: "start", labels: { boxWidth: 14 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label.split(" — ")[0]}: ${money(c.parsed.y)}` } },
      },
    },
  });
}

function renderDetailOps(m) {
  const items = [
    ["Institutional stability (WGI)", m.riskScore, m.governance == null ? "n/a" : m.governance.toFixed(2) + " avg. WGI"],
    ["Currency stability", m.fxScore, m.fx == null ? "n/a" : pct(m.fx) + " FX volatility"],
    ["Logistics performance (LPI)", m.lpiNorm, m.lpiScore == null ? "n/a" : m.lpiScore.toFixed(1) + "/5"],
    ["Shipping proximity", m.transitScore, m.transitDays == null ? "n/a" : m.transitDays.toFixed(1) + " days from Guayaquil"],
  ];
  render("chart-detail-ops", {
    type: "bar",
    data: {
      labels: items.map(i => i[0]),
      datasets: [{
        label: "Score vs. the ten candidate markets",
        data: items.map(i => i[1]),
        valueLabels: items.map(i => i[2]),
        backgroundColor: items.map(i => (i[1] >= 66 ? "rgba(16,185,129,.85)" : i[1] >= 40 ? "rgba(245,158,11,.85)" : "rgba(220,38,38,.8)")),
        borderRadius: 4,
        barPercentage: .7,
      }],
    },
    options: {
      indexAxis: "y",
      layout: { padding: { right: 210 } },
      scales: {
        x: { min: 0, max: 100, grid: { color: PALETTE.line }, title: { display: true, text: "0 = weakest of the ten, 100 = strongest", font: { size: 14, weight: "600" } } },
        y: { grid: { display: false }, ticks: { font: { size: 15, weight: "600" }, color: PALETTE.ink } },
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.x.toFixed(0)}/100 — ${items[c.dataIndex][2]}` } } },
    },
    plugins: [barValueLabels],
  });
}

function renderDetailFacts(m) {
  const margin = (m.mfn.value != null && m.pref.value != null) ? m.mfn.value - m.pref.value : null;
  const facts = [
    ["Ecuador's tariff", m.pref.value == null ? "n/a" : pct(m.pref.value)],
    ["Preference margin", margin == null ? "n/a" : `${margin.toFixed(margin % 1 ? 1 : 0)} pts`],
    ["Market size " + (m.marketSizeYear || ""), money(m.marketSize)],
    ["Demand growth /yr", m.cagr == null ? "n/a" : signedPct(m.cagr)],
    ["Ecuador's exports 2024", money(m.ecuValue)],
    ["Ecuador's share (HS 0901)", m.share == null ? "n/a" : pct(m.share * 100, 2)],
    ["Transit from Guayaquil", m.transitDays == null ? "n/a" : `${m.transitDays.toFixed(1)} days`],
    ["Logistics (LPI " + (m.lpiYear || "n/a") + ")", m.lpiScore == null ? "n/a" : `${m.lpiScore.toFixed(1)}/5`],
  ];
  document.getElementById("detail-facts").innerHTML = facts.map(([k, v]) =>
    `<div class="fact${v === "n/a" ? " na" : ""}"><span>${k}</span><strong>${v}</strong></div>`).join("");
}

// Paying 0% duty does not mean you can ship. This panel is the non-tariff half of market
// access: the paperwork that legally gates entry, and the commercial certifications that
// decide whether a buyer will pay a premium once you are in.
function certsHtml(iso3, name, { compact = false } = {}) {
  const c = CERTIFICATIONS[iso3];
  const title = `<h3 class="panel-title">Requirements to export here — beyond the tariff</h3>`;

  if (!c) {
    return `<div class="certs${compact ? " compact" : ""}">
      ${title}
      <p class="cert-empty">${name} is outside the ten candidate markets, so no compliance research was carried out for it in this project. Treat that as an open gap, not as "no requirements".</p>
    </div>`;
  }

  const item = (x, kind) => `
    <li class="cert-item ${kind}">
      <div class="cert-head">
        <strong>${x.name}</strong>
        <span class="cert-tag ${kind}">${kind === "mandatory" ? "Legally required" : "Voluntary / commercial"}</span>
      </div>
      <p>${x.desc}</p>
    </li>`;

  const nM = c.mandatory.length, nV = c.voluntary.length;
  const counts = `<span class="cert-count"><b>${nM}</b> mandatory requirement${nM === 1 ? "" : "s"} identified</span>` +
                 `<span class="cert-count"><b>${nV}</b> voluntary certification${nV === 1 ? "" : "s"}</span>`;

  const listOrNone = (arr, kind, noneMsg) =>
    arr.length ? `<ul class="cert-list">${arr.map(x => item(x, kind)).join("")}</ul>`
               : `<p class="cert-empty">${noneMsg}</p>`;

  return `<div class="certs${compact ? " compact" : ""}">
    ${title}
    <p class="panel-sub">A 0% tariff is only half of market access. These are the non-tariff conditions identified for ${name}.</p>
    <div class="cert-counts">${counts}</div>
    <div class="cert-cols">
      <div>
        <h4 class="cert-col-title mandatory">Mandatory — you cannot ship without these</h4>
        ${listOrNone(c.mandatory, "mandatory", "No coffee-specific mandatory requirement was identified for this market in the research pass. This is a gap in the research, not evidence that none exist.")}
      </div>
      <div>
        <h4 class="cert-col-title voluntary">Voluntary — what buyers pay a premium for</h4>
        ${listOrNone(c.voluntary, "voluntary", "No market-preferred certification was documented for this market in the research pass.")}
      </div>
    </div>
    ${c.gapNote ? `<p class="cert-gap"><b>Caveat / gap:</b> ${c.gapNote}</p>` : ""}
  </div>`;
}

function renderDetailCerts(m) {
  document.getElementById("detail-certs").innerHTML = certsHtml(m.iso3, m.name);
}

function renderDetailGaps(m) {
  const facts = tariffFactsFor(m.iso3);
  const items = [];
  ["green", "roasted", "instant"].forEach(l => {
    ["mfn", "pref"].forEach(k => {
      const f = facts[l][k];
      if (f.status === "gap" || f.status === "unverified") {
        items.push(`<b>${LINE_LABELS[l]} — ${k === "mfn" ? "MFN" : "Ecuador's rate"}:</b> ${f.note}`);
      }
    });
  });
  if (m.share == null) items.push("<b>Ecuador's market share:</b> not shown for this product filter — the import-side series covers HS 0901 only, so it cannot be compared against instant-coffee exports.");
  if (m.lpiYear && m.lpiYear < 2023) items.push(`<b>Logistics:</b> LPI is a biennial survey; ${m.lpiYear} is the most recent value published on the World Bank API, and 2022 global ranks are not available.`);
  items.push("<b>Freight cost:</b> intentionally omitted — no free, citable source for current rates by lane. Transit days are distance-based estimates at 18 knots, not carrier schedules.");

  document.getElementById("detail-gaps").innerHTML =
    `<h3>What we could not confirm for ${m.name}</h3><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
}

// ---------------------------------------------------------------------------
// 8b. Destination map
// ---------------------------------------------------------------------------
// The ranking answers "where should we go". This answers the question a client asks right
// after: "where are we already, and what would it actually take to get in?". It is the only
// view that shows destinations OUTSIDE the ten candidates, which is what makes the ten look
// like a deliberate shortlist rather than an arbitrary one.

let advMap = null;
let advMarkers = [];
let selectedMapYear = null;
let selectedMapCountry = null;

const ISO3_BY_COMTRADE_NAME = Object.fromEntries(TOP_MARKETS.map(m => [m.comtradeName, m.iso3]));

// Ecuador's exports for a given year, aggregated by destination, for the active product.
function destinationRows(year) {
  const codes = activeHsCodes();
  const byPartner = {};
  DATA.exportsFull.forEach(r => {
    if (r.year !== year || !codes.includes(r.hs_code)) return;
    const k = r.partner_country;
    if (!byPartner[k]) byPartner[k] = { country: k, iso3: r.partner_iso3, value: 0, weightKg: 0 };
    byPartner[k].value += r.export_value_usd || 0;
    byPartner[k].weightKg += r.net_weight_kg || 0;
  });
  return Object.values(byPartner).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
}

const isCandidate = (iso3) => TOP_MARKETS.some(m => m.iso3 === iso3);

function renderMap() {
  const year = selectedMapYear;

  let firstDraw = false;
  if (!advMap) {
    firstDraw = true;
    advMap = L.map("map", { scrollWheelZoom: false, worldCopyJump: true }).setView([25, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors", maxZoom: 8,
    }).addTo(advMap);
    L.circleMarker(ECUADOR_COORDS, { radius: 8, color: "#b45309", fillColor: PALETTE.warn, fillOpacity: 1, weight: 3 })
      .addTo(advMap).bindTooltip("<b>Ecuador</b> — origin", { direction: "top" });
  }

  advMarkers.forEach(m => advMap.removeLayer(m));
  advMarkers = [];

  const rows = destinationRows(year).filter(r => COUNTRY_COORDS[r.country]);
  const total = destinationRows(year).reduce((s, r) => s + r.value, 0);
  const label = PRODUCT_CATEGORIES[selectedProduct].label;

  if (!rows.length) {
    document.getElementById("map-summary").innerHTML =
      `<b>No recorded exports</b> of ${label.toLowerCase()} to any destination in ${year}.`;
    document.getElementById("map-note").innerHTML =
      `An empty map is a real result, not a missing dataset: UN Comtrade records no Ecuadorian exports under these HS codes for ${year}.`;
    return;
  }

  const maxVal = Math.max(...rows.map(r => r.value));
  const candidates = rows.filter(r => isCandidate(r.iso3));
  const candidateValue = candidates.reduce((s, r) => s + r.value, 0);

  rows.forEach(r => {
    const cand = isCandidate(r.iso3);
    // sqrt so area, not radius, tracks value — a linear radius exaggerates the leader.
    const radius = 6 + Math.sqrt(r.value / maxVal) * 24;
    const marker = L.circleMarker(COUNTRY_COORDS[r.country], {
      radius,
      color: cand ? "#1d4ed8" : "#64748b",
      fillColor: cand ? PALETTE.brand : "#94a3b8",
      fillOpacity: cand ? .55 : .3,
      weight: cand ? 2.5 : 1.5,
    }).addTo(advMap);
    marker.bindTooltip(
      `<b>${r.country}</b><br/>${money(r.value)} in ${year}${cand ? "<br/><i>candidate market</i>" : ""}`,
      { direction: "top" }
    );
    marker.on("click", () => showMapCountry(r.country, r.iso3));
    advMarkers.push(marker);
  });

  // Fit once, on first draw only: Ecuador ships to Asia and Oceania, and a fixed centre at
  // world zoom clipped them off the right edge. Later redraws keep whatever view the
  // presenter has panned/zoomed to.
  if (firstDraw) {
    advMap.fitBounds(L.latLngBounds([ECUADOR_COORDS, ...rows.map(r => COUNTRY_COORDS[r.country])]),
                     { padding: [28, 28], maxZoom: 3 });
  }

  document.getElementById("map-summary").innerHTML =
    `<b>${rows.length} destination${rows.length === 1 ? "" : "s"}</b> · ${money(total)} exported in ${year} · ` +
    `the ten candidate markets take <b>${pct((candidateValue / total) * 100, 0)}</b> of it`;

  document.getElementById("map-note").innerHTML =
    `Marker area is proportional to export value for the selected year and product, so this map moves with the filter at the top of the page. ` +
    `Destinations are Ecuador's own reported exports (UN Comtrade, HS 6-digit); a country with no marker simply recorded no shipments of that product that year. ` +
    `Compliance research was only carried out for the ten candidate markets — grey markers open a panel that says so rather than implying there are no requirements.`;

  // Keep the open panel in sync when the year or product changes.
  if (selectedMapCountry) {
    const still = rows.find(r => r.country === selectedMapCountry);
    if (still) showMapCountry(still.country, still.iso3);
  }
}

function showMapCountry(country, iso3) {
  selectedMapCountry = country;
  const codes = activeHsCodes();

  const history = {};
  DATA.exportsFull.forEach(r => {
    if (r.partner_country !== country || !codes.includes(r.hs_code)) return;
    history[r.year] = (history[r.year] || 0) + (r.export_value_usd || 0);
  });
  const years = Object.keys(history).map(Number).sort((a, b) => a - b);
  const maxV = years.length ? Math.max(...years.map(y => history[y])) : 0;

  const rowsHtml = years.length
    ? years.map(y => `
        <tr class="${y === selectedMapYear ? "is-selected" : ""}">
          <td class="my-year">${y}</td>
          <td class="my-bar"><i style="width:${maxV ? (history[y] / maxV) * 100 : 0}%"></i></td>
          <td class="my-val">${money(history[y])}</td>
        </tr>`).join("")
    : `<tr><td colspan="3" class="my-none">No exports of this product recorded to ${country} in any year, 2015–2024.</td></tr>`;

  const cand = isCandidate(iso3);
  const market = cand ? computeMarkets().find(m => m.iso3 === iso3) : null;

  const banner = cand
    ? `<div class="map-banner cand">
         <span class="chip info">One of the ten candidate markets</span>
         <span>Ranked <b>#${computeMarkets().findIndex(m => m.iso3 === iso3) + 1}</b> · score <b>${market.overall.toFixed(0)}/100</b> · Ecuador pays <b>${market.pref.value == null ? "n/a" : pct(market.pref.value)}</b></span>
         <button class="map-openbtn" data-iso3="${iso3}">Open the full profile ↓</button>
       </div>`
    : `<div class="map-banner other">
         <span class="chip gap">Outside the ten candidate markets</span>
         <span>Ecuador already ships here, but this destination was not part of the tariff, risk and logistics study.</span>
       </div>`;

  document.getElementById("map-detail").innerHTML = `
    <h3 class="map-country">${country}</h3>
    ${banner}
    <h4 class="map-subhead">Ecuador's exports here — ${PRODUCT_CATEGORIES[selectedProduct].label}</h4>
    <table class="map-history"><tbody>${rowsHtml}</tbody></table>
    ${certsHtml(iso3, country, { compact: true })}`;

  const btn = document.querySelector(".map-openbtn");
  if (btn) btn.addEventListener("click", () => selectMarket(btn.dataset.iso3));
}

function populateMapYear() {
  const years = [...new Set(DATA.exportsFull.map(r => r.year))].sort((a, b) => a - b);
  const sel = document.getElementById("map-year");
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
  selectedMapYear = years[years.length - 1];
  sel.value = selectedMapYear;
  sel.addEventListener("change", () => {
    selectedMapYear = Number(sel.value);
    renderMap();
  });
}

// ---------------------------------------------------------------------------
// 9. Wiring
// ---------------------------------------------------------------------------

function selectMarket(iso3) {
  selectedMarket = iso3;
  const markets = computeMarkets();
  renderRanking(markets);
  renderDetail(markets);
  document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAll() {
  const markets = computeMarkets();
  if (!selectedMarket || !markets.some(m => m.iso3 === selectedMarket)) selectedMarket = markets[0].iso3;
  renderProductNote();
  renderPicks(markets);
  renderTariffChart(markets);
  renderTariffMatrix();
  renderMixChart();
  renderOpportunityChart(markets);
  renderRanking(markets);
  renderDetail(markets);
  renderMap();
  renderMethod(markets);
}

function renderMethod(markets) {
  const lines = activeLines().map(l => LINE_LABELS[l]).join(", ");
  document.getElementById("method-text").innerHTML =
    `Each market is scored 0–100 <em>relative to these ten candidates</em>, never against an absolute benchmark, as the average of three equally weighted pillars: ` +
    `<strong>Analytical</strong> (40% import-demand growth + 30% tariff burden, inverted + 30% governance), ` +
    `<strong>Strategic</strong> (50% demand growth + 50% market headroom, the inverse of Ecuador's current share), and ` +
    `<strong>Business environment</strong> (30% governance + 20% currency stability + 25% logistics performance + 25% transit time, inverted). ` +
    `Where an input is unknown it scores a neutral 50 rather than a guessed value. ` +
    `Tariffs for the current filter are read from ${lines}. ` +
    `Demand growth is the 2015–2024 CAGR of each market's own reported HS 0901 imports (UN Comtrade); governance is the four-indicator World Bank WGI average; ` +
    `logistics is the World Bank LPI; transit time is a haversine distance estimate from Guayaquil at 18 knots, not a carrier schedule. ` +
    `Every figure and its caveat is documented in <code>data/SOURCES.md</code>.`;
}

// Short tab labels — the full PRODUCT_CATEGORIES labels are too long to sit side by side
// at projector size. The HS codes stay on the tab so the professor can see exactly what
// each one covers without opening the methodology.
const PRODUCT_TABS = {
  all:     { short: "All coffee",   hs: "HS 0901 + 2101" },
  green:   { short: "Green beans",  hs: "HS 0901.11/.12" },
  roasted: { short: "Roasted",      hs: "HS 0901.21/.22" },
  instant: { short: "Instant",      hs: "HS 2101.11" },
  other:   { short: "Husks & prep", hs: "HS 0901.90 + 2101.12" },
};

function populateProductFilter() {
  const box = document.getElementById("product-filter");
  box.innerHTML = Object.keys(PRODUCT_CATEGORIES).map(k => `
    <button class="ptab${k === selectedProduct ? " active" : ""}" role="tab" data-product="${k}"
            aria-selected="${k === selectedProduct}">
      <span class="ptab-name">${PRODUCT_TABS[k].short}</span>
      <span class="ptab-hs">${PRODUCT_TABS[k].hs}</span>
    </button>`).join("");

  box.querySelectorAll(".ptab").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.product === selectedProduct) return;
      selectedProduct = btn.dataset.product;
      box.querySelectorAll(".ptab").forEach(b => {
        const on = b.dataset.product === selectedProduct;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", String(on));
      });
      renderAll();
    });
  });
}

// Restates the active filter in words, right under the tabs, so nobody in the audience has
// to work out which button is highlighted on a washed-out projector.
function renderProductNote() {
  const cat = PRODUCT_CATEGORIES[selectedProduct];
  const lines = activeLines().map(l => LINE_LABELS[l].split(" (")[0].toLowerCase());
  const tariffBasis = selectedProduct === "other"
    ? `No tariff line was researched for husks (0901.90) or preparations (2101.12), so the <b>instant extract</b> rate is shown as the closest available proxy.`
    : `Tariffs shown are the ${lines.join(", ")} line${lines.length > 1 ? "s" : ""}.`;
  document.getElementById("product-active-note").innerHTML =
    `Showing: <b>${cat.label}</b> — HS ${cat.hsCodes.map(c => c.slice(0, 4) + "." + c.slice(4)).join(", ")}. ${tariffBasis}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadAllData();
  setupChartDefaults();

  const problems = verifyTariffFacts();
  if (problems.length) {
    document.getElementById("integrity-warning").innerHTML =
      `<div class="integrity-warning">Data-integrity check failed — a displayed tariff no longer matches its source cell in <code>data/tariffs_and_trade_agreements.csv</code>: ${problems.join("; ")}. Treat the tariff figures on this page as unverified until this is resolved.</div>`;
    console.error("Tariff verification failed:", problems);
  }

  populateProductFilter();
  populateMapYear();
  renderAll();
});
