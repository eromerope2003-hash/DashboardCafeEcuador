// Ecuador Coffee Sector — real data pulled from UN Comtrade, FAOSTAT, World Bank (WDI + Pink Sheet).
// Full source citations: ../data/SOURCES.md . Access date: 2026-07-28.

const EXPORTS_TOTAL = [
  { year: 2015, value: 19858013.0, weightKg: 6467643.0 },
  { year: 2016, value: 19020124.0, weightKg: 5289230.0 },
  { year: 2017, value: 17499466.26, weightKg: 5131569.07 },
  { year: 2018, value: 13956764.783, weightKg: 4624491.14 },
  { year: 2019, value: 9243351.32, weightKg: 1857587.97 },
  { year: 2020, value: 9914100.816, weightKg: 1954928.612 },
  { year: 2021, value: 16477139.46, weightKg: 4063316.671 },
  { year: 2022, value: 28354236.0, weightKg: 5663171.9 },
  { year: 2023, value: 12611113.0, weightKg: null, note: "net weight not reported by Ecuador for this year" },
  { year: 2024, value: 12198698.454, weightKg: 1832511.749 },
];

// Country coordinates (capital/major city, approximate) for the map.
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
};
const ECUADOR_COORDS = [-0.23, -78.52];

const EXPORTS_BY_DESTINATION = [
  { year: 2015, country: "USA", value: 9557655.0 }, { year: 2015, country: "Colombia", value: 4966488.0 },
  { year: 2015, country: "Cuba", value: 2220462.0 }, { year: 2015, country: "Japan", value: 964670.0 },
  { year: 2015, country: "Chile", value: 705202.0 }, { year: 2015, country: "France", value: 487922.0 },
  { year: 2015, country: "Germany", value: 432475.0 }, { year: 2015, country: "United Kingdom", value: 110830.0 },
  { year: 2015, country: "Canada", value: 104549.0 }, { year: 2015, country: "Argentina", value: 83794.0 },
  { year: 2019, country: "USA", value: 1913632.44 }, { year: 2019, country: "Germany", value: 1438207.08 },
  { year: 2019, country: "France", value: 1276081.25 }, { year: 2019, country: "Japan", value: 1256736.99 },
  { year: 2019, country: "Colombia", value: 1210459.25 }, { year: 2019, country: "Chile", value: 977999.97 },
  { year: 2019, country: "Cuba", value: 281279.4 }, { year: 2019, country: "China", value: 176906.68 },
  { year: 2021, country: "Colombia", value: 7461963.33 }, { year: 2021, country: "USA", value: 2083060.77 },
  { year: 2021, country: "Chile", value: 1722104.96 }, { year: 2021, country: "France", value: 1499997.99 },
  { year: 2021, country: "Germany", value: 1443942.33 }, { year: 2021, country: "Japan", value: 705073.65 },
  { year: 2022, country: "Colombia", value: 16005751.5 }, { year: 2022, country: "USA", value: 2411223.8 },
  { year: 2022, country: "Chile", value: 1987152.2 }, { year: 2022, country: "Belgium", value: 1630335.4 },
  { year: 2022, country: "France", value: 1593820.4 }, { year: 2022, country: "Japan", value: 1285503.0 },
  { year: 2022, country: "Germany", value: 907117.4 }, { year: 2022, country: "Australia", value: 562737.6 },
  { year: 2023, country: "Colombia", value: 2942871.6 }, { year: 2023, country: "USA", value: 2193058.6 },
  { year: 2023, country: "Germany", value: 1498649.6 }, { year: 2023, country: "France", value: 1449246.9 },
  { year: 2023, country: "Japan", value: 1380318.1 }, { year: 2023, country: "Chile", value: 1033848.8 },
  { year: 2023, country: "China", value: 505797.8 }, { year: 2023, country: "Canada", value: 243689.3 },
  { year: 2024, country: "Chile", value: 2911271.72 }, { year: 2024, country: "France", value: 1630748.9 },
  { year: 2024, country: "USA", value: 1571031.989 }, { year: 2024, country: "Colombia", value: 1367386.2 },
  { year: 2024, country: "Japan", value: 1276058.19 }, { year: 2024, country: "Rep. of Korea", value: 546362.22 },
  { year: 2024, country: "China", value: 473769.852 }, { year: 2024, country: "Germany", value: 462528.01 },
  { year: 2024, country: "Netherlands", value: 396631.48 }, { year: 2024, country: "Australia", value: 267310.213 },
  { year: 2024, country: "Belgium", value: 233155.52 }, { year: 2024, country: "Canada", value: 191666.14 },
  { year: 2024, country: "Russian Federation", value: 190510.5 }, { year: 2024, country: "United Kingdom", value: 150309.54 },
  { year: 2024, country: "China, Hong Kong SAR", value: 72528.64 }, { year: 2024, country: "Malaysia", value: 18480.0 },
  { year: 2024, country: "Spain", value: 17028.88 }, { year: 2024, country: "United Arab Emirates", value: 13200.0 },
];

// Green/roasted beans (0901) vs instant/soluble extract (210111) — the sector's real value story.
const HS_BREAKDOWN = {
  years: [2019, 2022, 2024],
  greenBeans0901: [7875922.18 + 0 + 1233502.34 + 93844.45 + 40082.35, 26947676.4 + 37980.0 + 1237234.2 + 34911.2 + 96434.2, 10630096.125 + 64349.68 + 0 + 2477.0 + 95838.73],
  extract210111: [70929142.91, 105676023.7, 122096108.5],
};

const COMPETITORS = {
  years: [2015, 2019, 2022, 2023, 2024],
  series: {
    Ecuador: [19858013.0, 9243351.32, 28354236.0, 12611113.0, 12198698.454],
    Colombia: [2576546111.0, 2363170296.96, 4108628844.15, 2914732640.71, 3545447941.32],
    Brazil: [5564990043.0, 4584848752.0, 8542533005.0, 7350813207.0, 11373030987.0],
    Vietnam: [2415422841.0, 2218821270.56, 2952034941.248, 3183873274.422, null],
    Peru: [613682907.26, 636834747.93, 1188902260.901, 829281631.89, 1101838799.279],
  },
};

const PRODUCTION = [
  { year: 2015, areaHa: 44027, yieldKgHa: 120.3, tonnes: 5297.44 },
  { year: 2016, areaHa: 29872, yieldKgHa: 130.7, tonnes: 3904.53 },
  { year: 2017, areaHa: 37260, yieldKgHa: 203.0, tonnes: 7564.0 },
  { year: 2018, areaHa: 31924, yieldKgHa: 158.7, tonnes: 5065.0 },
  { year: 2019, areaHa: 36047, yieldKgHa: 225.8, tonnes: 8140.98 },
  { year: 2020, areaHa: 26909, yieldKgHa: 196.2, tonnes: 5280.29 },
  { year: 2021, areaHa: 29481, yieldKgHa: 166.8, tonnes: 4916.87 },
  { year: 2022, areaHa: 29901, yieldKgHa: 266.4, tonnes: 7965.97 },
  { year: 2023, areaHa: 22373, yieldKgHa: 249.6, tonnes: 5584.19 },
  { year: 2024, areaHa: 18533, yieldKgHa: 294.9, tonnes: 5465.05 },
];

const MACRO = [
  { year: 2015, gdpGrowth: 0.12, inflation: 3.97, exportsPctGdp: 22.75 },
  { year: 2016, gdpGrowth: -0.69, inflation: 1.73, exportsPctGdp: 20.54 },
  { year: 2017, gdpGrowth: 5.97, inflation: 0.42, exportsPctGdp: 21.49 },
  { year: 2018, gdpGrowth: 1.04, inflation: -0.22, exportsPctGdp: 23.54 },
  { year: 2019, gdpGrowth: 0.17, inflation: 0.27, exportsPctGdp: 24.05 },
  { year: 2020, gdpGrowth: -9.25, inflation: -0.34, exportsPctGdp: 23.28 },
  { year: 2021, gdpGrowth: 9.42, inflation: 0.13, exportsPctGdp: 27.07 },
  { year: 2022, gdpGrowth: 5.87, inflation: 3.47, exportsPctGdp: 30.93 },
  { year: 2023, gdpGrowth: 1.83, inflation: 2.22, exportsPctGdp: 28.65 },
  { year: 2024, gdpGrowth: -1.94, inflation: 1.55, exportsPctGdp: 30.5 },
];

const PRICES = [
  { year: 2015, arabica: 3.5261, robusta: 1.9412 }, { year: 2016, arabica: 3.6111, robusta: 1.9531 },
  { year: 2017, arabica: 3.3232, robusta: 2.2255 }, { year: 2018, arabica: 2.926, robusta: 1.8693 },
  { year: 2019, arabica: 2.8798, robusta: 1.6218 }, { year: 2020, arabica: 3.3236, robusta: 1.5159 },
  { year: 2021, arabica: 4.5119, robusta: 1.9812 }, { year: 2022, arabica: 5.6304, robusta: 2.2851 },
  { year: 2023, arabica: 4.54, robusta: 2.6268 }, { year: 2024, arabica: 5.6221, robusta: 4.4143 },
];
