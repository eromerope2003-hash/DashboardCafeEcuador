// Ecuador Coffee — Simplified Market-Entry Decision Tool
// This page reuses the EXACT same underlying data and scoring methodology as the full
// dashboard (script.js / computeRecommendations()) — see data/SOURCES.md for citations.
// It just presents it in a simpler, recommendation-first format: "if you're a coffee
// exporter, where should you sell, and why?" — instead of every chart/table available.

let selectedProduct = "all";

// ---------- data-access helpers (same logic as script.js) ----------

function activeHsCodes() { return PRODUCT_CATEGORIES[selectedProduct].hsCodes; }

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

function latestYearWithValue(rows, field) {
  const withVal = rows.filter(r => r[field] != null);
  if (!withVal.length) return null;
  return withVal.reduce((a, b) => (b.year > a.year ? b : a));
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

function importCAGR(iso3) {
  const series = DATA.marketImports.filter(r => r.iso3 === iso3 && r.import_value_usd > 0).sort((a, b) => a.year - b.year);
  if (series.length < 2) return null;
  const first = series[0], last = series[series.length - 1];
  const n = last.year - first.year;
  if (n <= 0 || first.import_value_usd <= 0) return null;
  return (Math.pow(last.import_value_usd / first.import_value_usd, 1 / n) - 1) * 100;
}

function ecuadorExportValueToMarket(iso3, year = 2024) {
  const codes = activeHsCodes();
  return DATA.exportsFull
    .filter(r => r.year === year && r.partner_iso3 === iso3 && codes.includes(r.hs_code))
    .reduce((s, r) => s + (r.export_value_usd || 0), 0);
}

function normalize(value, all, invert = false) {
  const vals = all.filter(v => v != null);
  if (value == null || !vals.length) return 50; // neutral if unknown
  const min = Math.min(...vals), max = Math.max(...vals);
  if (max === min) return 50;
  let score = ((value - min) / (max - min)) * 100;
  if (invert) score = 100 - score;
  return score;
}

// ---------- scoring (identical weights/formula to script.js computeRecommendations) ----------

function computeMarketMetrics() {
  return TOP_MARKETS.map(m => {
    const wgi = wgiLatest(m.iso3);
    const governance = wgi ? (wgi.political_stability + wgi.government_effectiveness + wgi.regulatory_quality + wgi.rule_of_law) / 4 : null;
    const cagr = importCAGR(m.iso3);
    const tariff = tariffPrefPctFor(m.iso3);
    const mfn = tariffMfnPctFor(m.iso3);
    const fx = fxVolFor(m.iso3);
    const lpi = lpiLatest(m.iso3);
    const log = logisticsRowFor(m.comtradeName);
    const ecuValue = ecuadorExportValueToMarket(m.iso3, 2024);
    const latestImport = DATA.marketImports.filter(r => r.iso3 === m.iso3).sort((a, b) => b.year - a.year)[0];
    const penetration = latestImport && latestImport.import_value_usd ? (ecuValue / latestImport.import_value_usd) : 0;
    return {
      iso3: m.iso3, name: m.name, governance, cagr, tariff, mfn, fx,
      lpiScore: lpi ? lpi.lpi_overall_score : null,
      transitDays: log ? log.estimated_transit_days : null,
      ecuValue, penetration, tariffRow: tariffRowFor(m.iso3),
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
    const tier = overall >= 60 ? "low" : overall >= 40 ? "moderate" : "high"; // reuse badge color scale (low = green = good)
    const tierLabel = overall >= 60 ? "Recommended" : overall >= 40 ? "Consider with caution" : "Higher risk / lower priority";

    return { ...m, demandScore, tariffScore, riskScore, analytical, strategic, business, overall, tier, tierLabel };
  }).sort((a, b) => b.overall - a.overall);
}

// ---------- plain-English explanation text, built only from real numbers above ----------

const fmtPct = (v, d = 1) => v == null ? "n/a" : v.toFixed(d) + "%";
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const shorten = (s, n) => !s ? "" : (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

function tariffClause(m) {
  const row = m.tariffRow;
  const fta = row ? row.has_fta_with_ecuador : null;
  // If the MFN tariff itself is already ~0%, the trade-agreement status barely matters for cost —
  // lead with the fact that pays off for exporters, regardless of FTA fine print.
  if (m.mfn != null && m.mfn <= 1) {
    return `a tariff that's already at or near 0% for this product (${fmtPct(m.mfn)} MFN), independent of trade-agreement status`;
  }
  if (fta === "yes" && m.tariff != null && m.tariff <= 1) {
    return `duty-free (or near-zero) access under Ecuador's trade agreement${m.mfn != null ? ` (vs. ${fmtPct(m.mfn)} MFN for competitors without one)` : ""}`;
  }
  if (fta === "yes" && m.tariff != null) {
    return `a preferential ${fmtPct(m.tariff)} tariff under Ecuador's trade agreement${m.mfn != null ? ` (vs. ${fmtPct(m.mfn)} MFN for competitors without one)` : ""}`;
  }
  if (fta === "partial") {
    return `a trade agreement that's signed but not yet in force — for now Ecuador still pays the full ${fmtPct(m.mfn)} MFN tariff`;
  }
  if (m.mfn != null) {
    return `no trade agreement with Ecuador, so the full ${fmtPct(m.mfn)} MFN tariff applies`;
  }
  return `tariff data not available for this product`;
}

function demandClause(m) {
  if (m.cagr == null) return "import-demand growth data unavailable";
  if (m.cagr >= 5) return `fast-growing coffee import demand (+${fmtPct(m.cagr)}/yr, 2015–2024)`;
  if (m.cagr >= 0) return `modest but positive import demand growth (+${fmtPct(m.cagr)}/yr)`;
  return `shrinking coffee import demand (${fmtPct(m.cagr)}/yr)`;
}

function riskClause(m) {
  if (m.governance == null) return "institutional-risk data unavailable";
  if (m.governance >= 0.6) return "a stable, low institutional-risk business environment";
  if (m.governance >= -0.3) return "a moderate institutional-risk profile";
  return "a higher institutional-risk profile";
}

function headroomClause(m) {
  const pct = m.penetration * 100;
  if (pct < 0.5) return `Ecuador barely has a presence there today (~${fmtPct(pct, 2)} of the market) — mostly white space`;
  if (pct < 3) return `Ecuador already has a small foothold there (~${fmtPct(pct, 2)} of the market)`;
  return `Ecuador already has a meaningful foothold there (~${fmtPct(pct, 2)} of the market)`;
}

function oneLiner(m) {
  return `${cap(tariffClause(m))}; ${demandClause(m)}; ${riskClause(m)}.`;
}

function whyParagraph(m) {
  return `${m.name} offers ${tariffClause(m)}. Import demand here shows ${demandClause(m)}, and the market has ${riskClause(m)}. ${cap(headroomClause(m))}, and the estimated ocean transit from Guayaquil is ${m.transitDays != null ? m.transitDays.toFixed(1) + " days" : "unavailable"}${m.lpiScore != null ? ` (World Bank logistics score ${m.lpiScore.toFixed(1)}/5)` : ""}.`;
}

// Which of the 3 sub-scores is driving a market's ranking — used for the one-sentence "why" in the top banner.
function strongestFactor(m) {
  const opts = [["tariff access", m.tariffScore], ["import demand growth", m.demandScore], ["institutional stability", m.riskScore]];
  return opts.sort((a, b) => b[1] - a[1])[0][0];
}
function weakestFactor(m) {
  const opts = [["tariff barriers", m.tariffScore], ["weak demand growth", m.demandScore], ["institutional risk", m.riskScore]];
  return opts.sort((a, b) => a[1] - b[1])[0][0];
}

// ---------- rendering ----------

function renderBottomLine(recs) {
  const recommended = recs.filter(r => r.tier === "low");
  const caution = recs.filter(r => r.tier === "high");
  const top = (recommended.length ? recommended : recs).slice(0, 3);
  const topList = top.map(r => r.name).join(", ").replace(/,([^,]*)$/, " and$1");
  const topReasons = [...new Set(top.map(strongestFactor))].join(" and ");

  let html = `For <strong>${PRODUCT_CATEGORIES[selectedProduct].label}</strong>, the strongest opportunities right now are <strong>${topList}</strong> — driven mainly by ${topReasons}. `;

  if (caution.length) {
    const cautionList = caution.map(r => r.name).join(", ").replace(/,([^,]*)$/, " and$1");
    const cautionReasons = [...new Set(caution.map(weakestFactor))].join(" and ");
    html += `<strong>${cautionList}</strong> score lower and would need a longer-term strategy — mainly held back by ${cautionReasons}. `;
  }
  html += `Scores are relative to these 10 candidate markets, not an absolute benchmark — this is a starting point for prioritization, not a substitute for a full feasibility study.`;

  document.getElementById("bottom-line").innerHTML = html;
}

function renderRanking(recs) {
  const html = recs.map((r, i) => `
    <details class="dt-item"${i < 3 ? " open" : ""}>
      <summary class="dt-summary">
        <span class="dt-rank">#${i + 1}</span>
        <span class="dt-name-wrap">
          <span class="dt-name">${r.name}</span>
          <span class="dt-oneliner">${oneLiner(r)}</span>
        </span>
        <span class="badge ${r.tier}">${r.tierLabel}</span>
        <span class="dt-score-wrap" title="Overall score, 0–100, relative to these 10 candidate markets">
          <span class="dt-score-num">${r.overall.toFixed(0)}</span>
          <span class="dt-score-bar"><span style="width:${r.overall.toFixed(0)}%"></span></span>
        </span>
      </summary>
      <div class="dt-detail">
        <p class="dt-why">${whyParagraph(r)}</p>
        <div class="dt-fact-grid">
          <div class="dt-fact"><span>MFN tariff</span><strong>${fmtPct(r.mfn)}</strong></div>
          <div class="dt-fact"><span>Preferential tariff (Ecuador)</span><strong>${fmtPct(r.tariff)}</strong></div>
          <div class="dt-fact"><span>Trade agreement</span><strong title="${r.tariffRow ? r.tariffRow.fta_name.replace(/"/g, "&quot;") : ""}">${r.tariffRow ? shorten(r.tariffRow.fta_name, 70) : "n/a"}</strong></div>
          <div class="dt-fact"><span>Import demand growth (CAGR)</span><strong>${fmtPct(r.cagr)}</strong></div>
          <div class="dt-fact"><span>Ecuador's current market share</span><strong>${fmtPct(r.penetration * 100, 2)}</strong></div>
          <div class="dt-fact"><span>Governance/risk score<br/><small>(WGI, ‑2.5 to +2.5, higher = better)</small></span><strong>${r.governance != null ? r.governance.toFixed(2) : "n/a"}</strong></div>
          <div class="dt-fact"><span>Logistics (LPI score)</span><strong>${r.lpiScore != null ? r.lpiScore.toFixed(1) + "/5" : "n/a"}</strong></div>
          <div class="dt-fact"><span>Est. transit from Guayaquil</span><strong>${r.transitDays != null ? r.transitDays.toFixed(1) + " days" : "n/a"}</strong></div>
        </div>
        <p class="dt-caveat">Tariff figures come from public/secondary sources (not a primary tariff database), and a few product-specific lines remain unconfirmed — flagged in the source file. Logistics figures are distance-based estimates, not real carrier schedules. Full methodology, every chart and every citation: <a href="index.html">full dashboard</a> · <code>data/SOURCES.md</code>.</p>
      </div>
    </details>`).join("");
  document.getElementById("ranking-list").innerHTML = html;
}

function renderAll() {
  const recs = computeRecommendations();
  renderBottomLine(recs);
  renderRanking(recs);
}

function populateProductFilter() {
  const sel = document.getElementById("product-filter");
  sel.innerHTML = Object.entries(PRODUCT_CATEGORIES).map(([key, c]) => `<option value="${key}">${c.label}</option>`).join("");
  sel.value = selectedProduct;
  sel.addEventListener("change", () => {
    selectedProduct = sel.value;
    renderAll();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadAllData();
  populateProductFilter();
  renderAll();
});
