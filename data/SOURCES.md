# Data Sources — Ecuador Coffee Sector (Globalization Impact Observatory)

Access date for all datasets below: **2026-07-28** (unless noted otherwise). All data was pulled programmatically from official public APIs/bulk downloads — no numbers in these files were fabricated or estimated by hand. Where a source could not be reached, that is stated explicitly rather than filled in with a guess.

---

## 1. ecuador_coffee_exports_total.csv

- **Source:** UN Comtrade (comtradeapi.un.org), public "preview" tier — no API key required.
- **Query:** Reporter = Ecuador (code 218), Partner = World (code 0), Flow = Exports (X), Commodity = HS 0901 (Coffee, whether or not roasted/decaffeinated), Classification H4 (2015-16) / H5 (2017-2022) / H6 (2023-24) as applicable per year, frequency Annual.
- **Endpoint pattern:** `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=218&period={YEAR}&partnerCode=0&cmdCode=0901&flowCode=X`
- **Coverage:** 2015–2024 (10 years, complete).
- **Caveats:**
  - `net_weight_kg` is missing (null) for **2023** — Ecuador did not report a net weight figure to Comtrade for that year even though the trade value (FOB USD) was reported. This is a genuine data gap in the source, not an omission on our part.
  - Values are FOB (free on board) in current USD, as reported by Ecuador's customs authority to UN Comtrade.
  - 2024 figures may still be subject to minor revision by Comtrade as more countries finalize annual submissions.

## 2. ecuador_coffee_exports_by_destination.csv

- **Source:** UN Comtrade, same public preview API, partner-disaggregated (no `partnerCode` filter, i.e. all partners returned, then filtered programmatically to non-aggregate country records).
- **Coverage:** Years with usable destination-level detail: 2015, 2019, 2021, 2022, 2023, 2024 (not all 10 years were pulled for destinations — only WLD totals were pulled for every year; destination breakdowns were pulled for a representative subset. Additional years can be added by repeating the query for 2016–2018 and 2020 if needed).
- **Fields:** year, partner_country, partner_iso3, export_value_usd, net_weight_kg.
- **Country name/ISO3 mapping** obtained from Comtrade's own official reference table: `https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json`.
- **Caveat:** Ranked by value descending; top destinations in 2024 were Chile, France, USA, Colombia, and Japan — notably USA's share is much smaller than in 2015 (when USA was Ecuador's #1 destination by a wide margin), reflecting the collapse in raw green bean export volumes. Zero/blank net_weight_kg rows exist for a small number of very minor destination countries.

## 3. ecuador_coffee_exports_by_hscode.csv

- **Source:** UN Comtrade, same public preview API, queried separately for each 6-digit HS subheading.
- **Codes covered:** 090111 (green, not decaf), 090112 (green, decaf), 090121 (roasted, not decaf), 090122 (roasted, decaf), 090190 (husks/substitutes), 210111 (coffee extracts/essences/concentrates — i.e., instant/soluble coffee), 210112 (preparations based on coffee extracts).
- **Coverage:** Sample years 2019, 2022, 2024 only (to conserve API rate-limit budget on the free preview tier; can be extended to all years 2015-2024 by re-running the same query pattern for the remaining years).
- **Key finding worth highlighting in the report:** HS 210111 (soluble/instant coffee extract, mostly produced by Ecuador's large-scale processors) is **far larger** than raw bean exports under HS 0901 — e.g., $122.1M (2024) vs. $12.2M (2024) for raw HS 0901. This shows Ecuador's coffee sector value is concentrated in industrial processing/instant coffee exports, not raw green bean exports, which matters a lot for framing "local Ecuadorian coffee firms" (smallholder/green-bean growers vs. large industrial processors face very different globalization exposure).

## 4. competitor_comparison.csv

- **Source:** UN Comtrade, same public preview API, reporter = each competitor country (Colombia=170, Brazil=76, Vietnam=704, Peru=604), partner=World, HS 0901, Flow=Exports.
- **Coverage:** 2015, 2019, 2022, 2023, 2024 for Colombia, Brazil, Peru; 2015–2023 for Vietnam (Vietnam had not yet submitted/aggregated 2024 HS 0901 export data to Comtrade as of the access date — genuinely missing, not fabricated).
- **Caveat:** Peru and other reporters occasionally have partial customs-office/partner-2 breakdowns before full annual aggregation is published; figures used here were filtered strictly to the single "World total" aggregate record (partnerCode=0, partner2Code=0, all modes of transport, general customs procedure) to avoid double-counting.

## 5. ecuador_coffee_production.csv

- **Source:** FAOSTAT (Food and Agriculture Organization of the United Nations), bulk data download, "Production: Crops and livestock products" domain.
- **Bulk file URL:** `https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data.zip`
- **Item:** Coffee, green (FAOSTAT item code 656 / CPC '01610), Area = Ecuador (FAOSTAT area code 58).
- **Coverage:** 2015–2024 (10 years, complete — FAOSTAT had already published 2024 figures at access time).
- **Fields:** year, area_harvested_ha, yield_kg_per_ha, production_tonnes.
- **Note:** FAOSTAT's interactive REST API (`fenixservices.fao.org/faostat/api/...`) was unreachable from this environment (connection timeouts / Cloudflare 521 errors on every attempt); the **bulk ZIP download** (a different, publicly documented FAOSTAT distribution channel) worked and was used instead. A trimmed raw extract (just the 3 matching Ecuador/coffee rows, all years, with FAOSTAT's original column headers) is saved at `raw_sources/faostat_ecuador_coffee_raw_extract.csv` for verification.
- **Key finding:** Area harvested fell from 44,027 ha (2015) to 18,533 ha (2024), a decline of ~58%. Production fluctuates but with no clear compensating yield trend that offsets the area loss in most years — consistent with the widely reported decline of Ecuador's coffee sector (aging farms, land conversion, low domestic profitability vs. other crops).

## 6. coffee_prices_ico_monthly.csv and coffee_prices_ico_annual.csv

- **Source:** World Bank "Pink Sheet" — Commodity Markets monthly price data, which itself sources its coffee series directly from the **International Coffee Organization (ICO)** indicator prices.
- **File used:** `CMO-Historical-Data-Monthly.xlsx`, sheet "Monthly Prices", columns "Coffee, Arabica" and "Coffee, Robusta" (units: US$/kg).
- **Series description (from the workbook's own "Description" sheet):** "Coffee, Arabica (ICO), International Coffee Organization indicator price, other mild Arabicas, average New York and Bremen/Hamburg markets, ex-dock" and "Coffee, Robusta (ICO), International Coffee Organization indicator price, Robustas, average New York and Le Havre/Marseilles markets, ex-dock."
- **Source page:** https://www.worldbank.org/en/research/commodity-markets (Pink Sheet, monthly data, updated by World Bank on 2026-01-03 per the file's own metadata).
- **Coverage:** 120 months, January 2015 – December 2024 (complete, no gaps). Annual file is a simple average of the 12 monthly observations per year.
- **Note on ico.org direct access:** The International Coffee Organization's own website (ico.org / icocoffee.org) was reachable, but its historical price/statistics database now requires an account login for the detailed "World Coffee Statistics Database" — the free public pages no longer expose a direct downloadable historical price file. The World Bank Pink Sheet republishes the same ICO indicator price series and was used as the citable, freely-downloadable substitute. **Recommendation:** if the team wants the ICO's own branded chart/table for the report, register a free account at https://icocoffee.org/ and check "Coffee Market Report – Statistics" section, or "World Coffee Statistics Database" for supplementary detail (e.g., by-origin breakdowns) not available in the Pink Sheet.

## 7. ecuador_macro_indicators.csv

- **Source:** World Bank Open Data API, `api.worldbank.org/v2/country/ECU/indicator/...` — no key required.
- **Indicators pulled:**
  - `NY.GDP.MKTP.KD.ZG` — GDP growth (annual %)
  - `FP.CPI.TOTL.ZG` — Inflation, consumer prices (annual %)
  - `PA.NUS.FCRF` — Official exchange rate (LCU per US$, period average) — returns 1.0 for all years because Ecuador is fully dollarized
  - `NY.GDP.MKTP.CD` — GDP (current US$)
  - `NE.EXP.GNFS.ZS` — Exports of goods and services (% of GDP)
  - `TX.VAL.MRCH.CD.WT` — Merchandise exports (current US$)
- **Coverage:** 2015–2024 (10 years, complete for all six indicators).
- **Important note for the report:** Ecuador has used the **US dollar as its official currency since 2000** (full dollarization, not a pegged/floating local currency). There is no separate exchange-rate risk for Ecuadorian exporters vis-à-vis the USD; FX risk in this sector instead shows up indirectly (e.g., competitiveness vs. countries with depreciating currencies, like Brazil's real or Colombia's peso, which can make their coffee cheaper in USD terms even if Ecuador's costs rise).

## 8. Raw source files (for citation/reproducibility), in `raw_sources/`

- `worldbank_pinksheet_CMO-Historical-Data-Monthly.xlsx` — original World Bank Pink Sheet Excel file as downloaded, untouched.
- `faostat_ecuador_coffee_raw_extract.csv` — the 3 raw rows (Area harvested, Yield, Production, all years 1961–2024) extracted directly from FAOSTAT's bulk file for Ecuador/Coffee-green, with FAOSTAT's original column headers, before any reshaping.

---

## What could NOT be obtained (be upfront about this in the report)

- **World Bank WITS SDMX API** (wits.worldbank.org) returned HTTP 403 (Forbidden) on every attempted query pattern from this environment — likely requires a browser session / is blocking automated access. UN Comtrade was used instead and provided equivalent (arguably better) trade-flow data, so this is not a real gap, just a note that WITS itself was inaccessible here.
- **FAOSTAT's interactive REST API** (fenixservices.fao.org) was unreachable (connection timeouts / HTTP 521 from Cloudflare) — worked around via FAOSTAT's bulk ZIP download instead, so production data was still obtained successfully.
- **ICO's own historical price database** (icocoffee.org) requires free registration for detailed statistics beyond the market report; the World Bank Pink Sheet (which republishes ICO's own indicator prices) was used as a fully public substitute — recommend the team also register on icocoffee.org if they want ICO-branded charts/tables or by-origin data for the final report.
- **ProEcuador / Banco Central del Ecuador (BCE)** sector-specific coffee export bulletins were not scraped in this pass (their sites present data mainly as PDF bulletins/dashboards, not machine-readable APIs). If the team wants BCE's own official Ecuador-sol trade statistics as an additional citation alongside Comtrade, recommend manually checking: https://www.bce.fin.ec/ (Estadísticas > Sector Externo > Balanza Comercial) and https://www.proecuador.gob.ec/ for sector profile PDFs on coffee.
- **INEC/MAG** (Ecuador's national statistics institute / Ministry of Agriculture) agricultural census data was not pulled — FAOSTAT's production series (which itself is compiled partly from MAG/INEC national reporting) was used instead. For hyper-local detail (by province, by smallholder vs. large farm), the team should check http://sipa.agricultura.gob.ec/ (MAG's agricultural information system) directly, which was not accessible via a simple API call in this session.

No numbers in any CSV in this folder were estimated, interpolated, or invented — every value traces to one of the API responses or bulk files described above.
