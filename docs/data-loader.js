// Minimal RFC4180-ish CSV parser (handles quoted fields with embedded commas/newlines/escaped quotes).
// Used because several source files (tariffs, HS descriptions) have long free-text cells with commas.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip, \n follows */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const filtered = rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
  const header = filtered[0];
  return filtered.slice(1).map(r => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ""; });
    return obj;
  });
}

// Number coercion helper — CSVs store everything as text.
const num = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const DATA = {}; // populated by loadAllData(), keyed by short name below

const CSV_FILES = {
  exportsTotal: "data/ecuador_coffee_exports_total.csv",
  exportsByHsCode: "data/ecuador_coffee_exports_by_hscode.csv",
  exportsFull: "data/ecuador_coffee_exports_by_hscode_destination_full.csv",
  competitors: "data/competitor_comparison.csv",
  production: "data/ecuador_coffee_production.csv",
  macro: "data/ecuador_macro_indicators.csv",
  prices: "data/coffee_prices_ico_annual.csv",
  tariffs: "data/tariffs_and_trade_agreements.csv",
  logisticsDistances: "data/logistics_distances.csv",
  countryRiskWgi: "data/country_risk_wgi.csv",
  lpi: "data/logistics_performance_index.csv",
  popGdppc: "data/market_population_gdppc.csv",
  fxVolatility: "data/market_fx_volatility.csv",
  marketImports: "data/top_markets_coffee_imports_hs0901.csv",
};

async function loadAllData() {
  const entries = Object.entries(CSV_FILES);
  const results = await Promise.all(entries.map(([, path]) =>
    fetch(path).then(r => {
      if (!r.ok) throw new Error(`Failed to fetch ${path}: ${r.status}`);
      return r.text();
    }).then(parseCSV)
  ));
  entries.forEach(([key], i) => { DATA[key] = results[i]; });

  // Light numeric coercion on the fields we actually chart/compute with,
  // keeping free-text tariff/tariffs_notes fields as strings for display.
  DATA.exportsTotal.forEach(r => { r.year = num(r.year); r.export_value_usd = num(r.export_value_usd); r.net_weight_kg = num(r.net_weight_kg); });
  DATA.exportsByHsCode.forEach(r => { r.year = num(r.year); r.export_value_usd = num(r.export_value_usd); r.net_weight_kg = num(r.net_weight_kg); });
  DATA.exportsFull.forEach(r => { r.year = num(r.year); r.export_value_usd = num(r.export_value_usd); r.net_weight_kg = num(r.net_weight_kg); });
  DATA.competitors.forEach(r => { r.year = num(r.year); r.export_value_usd = num(r.export_value_usd); r.net_weight_kg = num(r.net_weight_kg); });
  DATA.production.forEach(r => { r.year = num(r.year); r.area_harvested_ha = num(r.area_harvested_ha); r.yield_kg_per_ha = num(r.yield_kg_per_ha); r.production_tonnes = num(r.production_tonnes); });
  DATA.macro.forEach(r => { r.year = num(r.year); r.gdp_growth_pct = num(r.gdp_growth_pct); r.inflation_cpi_pct = num(r.inflation_cpi_pct); r.exports_pct_gdp = num(r.exports_pct_gdp); });
  DATA.prices.forEach(r => { r.year = num(r.year); r.arabica_usd_per_kg = num(r.arabica_usd_per_kg_avg); r.robusta_usd_per_kg = num(r.robusta_usd_per_kg_avg); });
  DATA.logisticsDistances.forEach(r => { r.great_circle_km = num(r.great_circle_km); r.estimated_route_km = num(r.estimated_route_km); r.estimated_transit_days = num(r.estimated_transit_days); });
  DATA.countryRiskWgi.forEach(r => { r.year = num(r.year); r.political_stability = num(r.political_stability); r.government_effectiveness = num(r.government_effectiveness); r.regulatory_quality = num(r.regulatory_quality); r.rule_of_law = num(r.rule_of_law); });
  DATA.lpi.forEach(r => { r.year = num(r.year); r.lpi_overall_score = num(r.lpi_overall_score); r.lpi_overall_rank = num(r.lpi_overall_rank); });
  DATA.popGdppc.forEach(r => { r.year = num(r.year); r.population = num(r.population); r.gdp_per_capita_usd = num(r.gdp_per_capita_usd); });
  DATA.fxVolatility.forEach(r => { r.fx_yoy_volatility_stdev_pct_2015_2024 = num(r.fx_yoy_volatility_stdev_pct_2015_2024); });
  DATA.marketImports.forEach(r => { r.year = num(r.year); r.import_value_usd = num(r.import_value_usd); r.import_net_weight_kg = num(r.import_net_weight_kg); });

  return DATA;
}
