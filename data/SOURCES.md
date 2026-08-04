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

No numbers in any CSV in this folder were estimated, interpolated, or invented — every value traces to one of the API responses or bulk files described above. The one partial exception is explicitly flagged below: `tariffs_and_trade_agreements.csv` relies on web-search snippets of official/secondary sources rather than direct database pulls, and every cell sourced this way is labeled inline as SECONDARY, INDIRECT, or a GAP where no figure could be found at all — nothing in that file was invented, but its confidence level is lower than datasets #1–7 above and this is stated explicitly rather than disguised.

## tariffs_and_trade_agreements.csv

- **Access date:** 2026-08-03. **Method:** this dataset was compiled differently from the datasets above — it was NOT pulled from a single programmatic API. Live database access to WTO Tariff Analysis Online (tariffdata.wto.org), ITC Market Access Map (macmap.org), USITC HTS (hts.usitc.gov), EU TARIC, Korea Customs Service (unipass.customs.go.kr), and China's customs tariff commission was attempted via web-fetch tooling, but direct page-fetching was blocked in this session's environment (permission denied on the WebFetch tool for every URL attempted, including hts.usitc.gov and taricsupport.com). As a fallback, **web search result snippets** (which surface short excerpts of these same official pages, plus secondary/reliable sources like national trade-promotion offices) were used instead. **This is a materially weaker sourcing method than the datasets above**, and every cell in the CSV that relies on a secondary or indirect source (rather than a primary tariff schedule pulled directly) is explicitly flagged as such inline in the CSV's own text. The team should treat this file as a well-researched starting point, not a substitute for a direct pull from the primary databases before final publication — see the "GAP"/"SECONDARY"/"NOT ESTABLISHED" flags in almost every cell.
- **Coverage:** Chile, EU (bloc covering France/Germany/Netherlands/Belgium — identical external tariff and trade-agreement network across all four), USA, Colombia, Japan, Republic of Korea, China — Ecuador's top coffee destination markets. HS 0901 (coffee, green/roasted) and HS 210111 (coffee extracts/instant) tariff lines, MFN and Ecuador-preferential rates, FTA/PTA status, and non-tariff-barrier notes (SPS, certification, EUDR, FDA/GACC requirements).
- **Key confirmed facts (higher confidence, cross-checked across multiple sources):**
  - USA: HS 0901 and HS 210111 are **already 0% MFN duty-free for all origins** (confirmed directly on USITC's own HTS search tool, hts.usitc.gov) — Ecuador does not need a preference for coffee to enter the US duty-free.
  - EU: green coffee (0901.11) is 0% MFN erga omnes (confirmed on TARIC-derived source); Ecuador gets 0% on all coffee lines via the **EU-Andean Multi-Party Trade Agreement** (Ecuador acceded 1-Jan-2017).
  - China: **China-Ecuador FTA has been in force since 1-May-2024**, and coffee is explicitly named as receiving immediate (not phased) zero-tariff treatment.
  - Colombia: Ecuador-Colombia coffee trade nominally has a long-standing 0% tariff via **Comunidad Andina (CAN)** membership, but **this was actively suspended in a real bilateral tariff war from Feb–Jun 2026** (Ecuador's "tasa de seguridad" up to 100% on Colombian goods; Colombia's retaliatory Decreto 0170 imposing 30–75% tariffs on 191 Ecuadorian products, explicitly including coffee) — both sides rolled back their measures around 1-Jun-2026 following a Comunidad Andina Tribunal ruling that the measures violated the Cartagena Agreement. This is a genuinely important, very recent example of trade-preference fragility for the report.
  - USA (second recent event): a 2025–2026 US "reciprocal tariff" (IEEPA) surcharge briefly threatened to add up to 15% (and, per industry trackers, spiked far higher for some countries at points in 2025) on top of Ecuador's 0% MFN coffee duty, but coffee was carved out/exempted, and the **US-Ecuador Agreement on Reciprocal Trade** (signed 13-Mar-2026, implementation targeted Aug-2026) formalizes MFN treatment for Ecuadorian coffee and removes the broader surcharge from ~$3.2bn of Ecuador's non-oil exports. This is fast-moving policy and should be re-verified close to the report's submission date.
  - Republic of Korea: the Ecuador-Korea **Strategic Economic Cooperation Agreement (SECA)** was signed 2-Sep-2025 and ratified on Ecuador's side (Decreto Ejecutivo 359, 15-Apr-2026), but as of the 2026-08-03 access date it is **not yet in force** — pending South Korea's own internal ratification, expected by the Korean ambassador in Quito to conclude by end of 2026. Marked `partial` in the CSV, not `yes`.
  - Japan: Ecuador has **no EPA/FTA with Japan** — pays full MFN (0% green, ~20% roasted per JETRO-derived secondary source), putting Ecuadorian roasted coffee at a disadvantage vs. competitor origins that do have a Japan EPA/CPTPP preference (e.g., Peru, Vietnam).
- **Explicit gaps/genuinely uncertain cells (do not present these as confirmed in the report without further verification):**
  - Korea's exact MFN rates for roasted coffee (0901.21) and coffee extract (210111) were not found.
  - China's exact MFN rate for coffee extract (210111) was not found; China's own 5–20% "pre-FTA" range (from press coverage) does not fully reconcile with the 8%/15% green/roasted figures found via a Costa Rican government secondary source — genuine ambiguity, not resolved here.
  - Japan's 210111 rate was not found (only that Japan uses distinct 2101.11-100/210 subheadings).
  - Colombia's own MFN/erga-omnes duty rate for non-CAN countries (context only, not applicable to Ecuador given CAN preference) was not found.
  - Chile's coffee-specific tariff line was not independently confirmed — inferred from Chile's well-documented near-uniform 6% MFN tariff policy applied to almost all tariff lines, and from ACE 65/75 covering 96.6% of tariff lines duty-free for Ecuador, but neither figure was verified against Chile's own Arancel Aduanero line item for HS 0901/210111 specifically.
  - Country-specific (France/Germany/Netherlands/Belgium) SPS or certification quirks beyond the general EU framework were not found for France specifically; Germany, Netherlands, and Belgium each have documented roles (Germany = largest Fairtrade coffee market; Belgium/Antwerp and Netherlands/Rotterdam = major green-coffee entry ports and organic/Rainforest-Alliance import hubs) sourced from CBI (Centre for the Promotion of Imports from developing countries, part of the Dutch government's enterprise agency).
- **Tools note:** WebFetch (direct page retrieval) was denied by the environment for this task; all findings rely on WebSearch result snippets, which is a strictly weaker evidentiary standard than a direct page pull. If the team has a session where WebFetch (or manual browsing of tariffdata.wto.org, macmap.org, hts.usitc.gov, TARIC, unipass.customs.go.kr, and China's tariff commission) is available, re-running this research would let every "SECONDARY"/"GAP" cell in the CSV be upgraded to a primary-source citation.

## Data-integrity fix log — ecuador_coffee_exports_by_hscode_destination_full.csv (2026-08-03)

- **What happened:** When building the full HS-code × destination × year breakdown (needed for the product-type filter / per-country map feature), a raw per-partner pull from the UN Comtrade preview API (`reporterCode=218`, `partnerCode` omitted, looped over 7 HS codes × 10 years) was aggregated by summing `fobvalue` per `(year, hs_code, partnerCode)`. A sanity check against the previously-validated world totals in `ecuador_coffee_exports_by_hscode.csv` showed the new per-partner sums were 2–8x too high for several HS210111 years (e.g., 2024: $976.8M summed vs. $122.1M validated world total).
- **Root cause (confirmed by inspecting raw JSON):** Comtrade's preview endpoint returns **multiple overlapping rows per partner** that represent different aggregation slices of the same trade flow — split by `motCode` (mode of transport: 0=all modes combined, plus separate rows for each individual mode e.g. 1000/2100/3200), `customsCode` (C00=all customs procedures combined, plus separate rows per procedure e.g. C03), and `partner2Code` (0=no second-partner breakdown, plus duplicate rows keyed to partner2Code=899 "Areas, nes"). Naively summing all rows per partner double-, triple-, or quadruple-counts the same shipments. The correct, non-duplicated "canonical" row per partner is the one where **`motCode==0` AND `customsCode=='C00'` AND `partner2Code==0`** (i.e., the most-aggregated slice with no further breakdown).
- **Second, independent bug found in the same investigation:** 17 of the original 70 raw JSON files (one per HS-code/year combination) had silently received an HTTP 429 "rate limit exceeded" **error response** from the Comtrade API instead of real data, because the original fetch script (`/tmp/fetch_comtrade.sh`) only checked "is the file non-empty" before skipping a re-fetch, and an error JSON is non-empty. This caused those HS-code/year combinations to be silently treated as "zero exports" when they were not (e.g., **HS090121 in 2024 was recorded as $0 but is actually $1,405,936.92** — confirmed independently via a direct `partnerCode=0` world-total query). All 17 affected files were re-fetched with retry logic and verified to contain valid `data` arrays before re-parsing.
- **Fix applied:** Re-wrote the parsing script to filter to the canonical `motCode=0 / customsCode=C00 / partner2Code=0` row per partner, excluding the `partnerCode=0` world-aggregate row itself, and re-fetched the 17 rate-limited files. The resulting `ecuador_coffee_exports_by_hscode_destination_full.csv` (710 rows, all 10 years 2015–2024, 70 distinct destination countries across the 7 HS codes) now reconciles exactly (to the cent) with a direct world-total (`partnerCode=0`) query for every HS-code/year combination checked. `ecuador_coffee_exports_by_hscode.csv` was regenerated from this corrected file (summed across destinations) so both files are now mutually consistent and both trace to the same corrected source pull. The one number that changed versus the original file: HS090121 (roasted, non-decaf) 2024 went from $0 (fetch-error artifact) to the correct $1,405,936.92.
- **Files touched:** `data/ecuador_coffee_exports_by_hscode_destination_full.csv` (rebuilt), `data/ecuador_coffee_exports_by_hscode.csv` (regenerated from the corrected full file — now covers all 10 years instead of the original 3 sample years 2019/2022/2024).

## top_markets_coffee_imports_hs0901.csv

- **Source:** UN Comtrade public preview API, `reporterCode={market}&period={year}&partnerCode=0&partner2Code=0&cmdCode=0901&flowCode=M` (import flow, world-partner total). Access date: 2026-08-03.
- **Markets covered:** Chile, USA, Colombia, Japan, Republic of Korea, China, France, Germany, Netherlands, Belgium (Ecuador's top actual/potential coffee export destinations) — 2015–2024, complete (100 rows).
- **Purpose:** import-side demand data for the new "international market" and "demand" dashboard sections (top importers, import growth trend) — this is the mirror-flow counterpart to Ecuador's own export data, sourced independently from each importing country's own reported statistics.
- **Methodology note (important):** the `partner2Code=0` parameter had to be added to the query (not just filtered client-side) because Comtrade's public preview API caps responses at 500 records per call, and large EU import markets (Germany, Netherlands, Belgium) report enough partner/partner2/transport-mode combinations to exceed that cap — without the query-level filter, the correct "all modes, all customs procedures, no re-export breakdown" aggregate row could be silently missing from the truncated response. Value used is `cifvalue` (imports are conventionally valued CIF, unlike exports which use FOB) from the canonical row where `motCode=0`, `customsCode='C00'`, `partner2Code=0`.
- **Caveat:** figures are HS 0901 (green + roasted coffee) only, not HS 2101 (extracts/instant) — consistent with the fact that "demand" for Ecuador's still-nascent value-added coffee-extract exports is best benchmarked against total bean-equivalent coffee imports of each market.

## country_risk_wgi.csv

- **Source:** World Bank Worldwide Governance Indicators (WGI), via `api.worldbank.org/v2/country/{ISO3};.../indicator/GOV_WGI_{CODE}` (note: WGI indicator codes require the `GOV_WGI_` prefix on this API, unlike standard WDI codes — the un-prefixed `PV.EST` etc. return "indicator not found"). Access date: 2026-08-03.
- **Indicators:** Political Stability and Absence of Violence/Terrorism (`PV.EST`), Government Effectiveness (`GE.EST`), Regulatory Quality (`RQ.EST`), Rule of Law (`RL.EST`) — each an estimate on an approx. -2.5 (weak) to +2.5 (strong) scale.
- **Coverage:** Ecuador + 13 comparison/market countries (Chile, USA, Colombia, Japan, Rep. of Korea, China, France, Germany, Netherlands, Belgium, Brazil, Vietnam, Peru), 2015–2024, 140 rows.
- **Use:** feeds the "political risk" leg of the country risk semaphore.

## logistics_performance_index.csv

- **Source:** World Bank Logistics Performance Index (LPI), `LP.LPI.OVRL.XQ` (score, 1=low to 5=high) and `LP.LPI.OVRL.RK` (global rank), same 14-country set as WGI above. Access date: 2026-08-03.
- **Coverage caveat:** the LPI is a **biennial/irregular** survey, not annual — the World Bank API only returns non-null values for 2016, 2018, and 2022 in this date range (2023's LPI report exists but has not been loaded into this WDI-mirror endpoint as of the access date; there is no LPI value for 2015, 2017, 2019–2021, 2023, or 2024). **Use the most recent available year (2022) as the current logistics-risk read for each market**, and note the data-vintage explicitly wherever it's displayed. Ecuador itself is missing a 2022 value (only 2016 and 2018 available).
- **Use:** feeds the "logistics risk" leg of the country risk semaphore, and directly informs the logistics section alongside the haversine-based `logistics_distances.csv`.

## market_population_gdppc.csv

- **Source:** World Bank Open Data API, indicators `SP.POP.TOTL` (population, total) and `NY.GDP.PCAP.CD` (GDP per capita, current US$), same 14-country set, 2015–2024. Access date: 2026-08-03.
- **Use:** denominator for import-per-capita demand-intensity calculations (import value ÷ population, computed in-browser, not pre-baked) and general market-sizing context. **Note:** a directly-sourced "per-capita coffee consumption" series was sought (ICO, USDA FAS PSD Online, Our World in Data) but could not be obtained — ICO's database requires registration, USDA FAS PSD's public API returned 404 on the endpoints tried, and no matching Our World in Data grapher slug was found for coffee consumption specifically (only production). **Import value/volume per capita from Comtrade is used as the demand-intensity proxy instead** — this is a reasonable and fully-traceable substitute (imports ≈ apparent domestic availability for net-importing markets) but is not the same thing as actual per-capita consumption (which would also net out re-exports and inventory changes); this substitution is stated explicitly in the dashboard, not disguised as a direct consumption figure.

## market_fx_volatility.csv

- **Source:** World Bank Open Data API, `PA.NUS.FCRF` (official exchange rate, LCU per US$, period average), same 13-market comparison set (excludes Ecuador, which is dollarized). Access date: 2026-08-03.
- **Methodology:** year-over-year % change in each country's LCU-per-USD rate computed for 2015–2024 (using 2014 as the base year for the 2015 change), then the population standard deviation of those 10 YoY changes taken as an "FX volatility" score — higher = more currency risk for an Ecuadorian (USD-based) exporter pricing into that market.
- **Note:** France, Germany, Netherlands, and Belgium share an identical series (all use the Euro), so their volatility score is identical (7.5%) — this is correct, not a data error. The United States shows exactly 0% by construction (USD vs. USD). Vietnam's very low volatility (0.8%) reflects its managed currency peg, not genuine economic stability — this nuance should be mentioned in the report if FX risk is discussed for Vietnam as a competitor.
- **Use:** feeds the "FX risk" leg of the country risk semaphore.

## logistics_distances.csv

- **Source:** Computed directly (not a downloaded dataset) using port coordinates (public/documented locations of major container ports) and the haversine great-circle distance formula.
- **Methodology:** Origin = Port of Guayaquil, Ecuador (Ecuador's main coffee export port). Destination = each top market's primary container port. Great-circle distance computed via haversine formula, then multiplied by a 1.15x routing factor to approximate real sea-lane routing (coastal routing, canal transits, etc. — real ships don't sail great-circle routes). Estimated transit days assume an average service speed of 18 knots including typical port-call time; this is an **estimate based on standard container-shipping speed, not live carrier schedule data** (e.g. not pulled from Maersk/MSC schedules or Freightos rates).
- **Caveat:** Actual transit times vary by carrier, routing (e.g. Panama Canal transit for Atlantic-side ports), and port congestion. Treat as directional/comparative (which markets are "near" vs "far"), not a booking-grade estimate. Freight cost is NOT included here — no free, reliable, citable source for current freight rates by lane was available; the dashboard should either omit freight cost or clearly label any figure as "indicative, not live rate."
