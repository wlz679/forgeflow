import xlsx from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

// P141-B3-T7f: 清洗 — 绝对 Windows 路径与个人用户名已脱敏为占位符。
const SRC = '<redacted-gsc-source>/forgeflowkit-search-performance.xlsx';
const OUT = 'docs/superpowers/_research/p140e-blog-strategy/gsc-query-table.json';

const wb = xlsx.readFile(SRC);

function normalize(rows) {
  return rows.map(r => {
    const o = {};
    for (const [k, v] of Object.entries(r)) {
      const kk = k.trim().toLowerCase().replace(/\s+/g, '_');
      o[kk] = v;
    }
    return o;
  });
}

const queries = normalize(xlsx.utils.sheet_to_json(wb.Sheets['查询数'], { defval: '' }));
const pages = normalize(xlsx.utils.sheet_to_json(wb.Sheets['网页'], { defval: '' }));
const byDate = normalize(xlsx.utils.sheet_to_json(wb.Sheets['图表'], { defval: '' }));
const countries = normalize(xlsx.utils.sheet_to_json(wb.Sheets['国家_地区'], { defval: '' }));
const devices = normalize(xlsx.utils.sheet_to_json(wb.Sheets['设备'], { defval: '' }));

const cn = {
  热门查询: 'query',
  点击次数: 'clicks',
  展示: 'impressions',
  点击率: 'ctr',
  排名: 'position',
  排名靠前的网页: 'landing_page',
  日期: 'date',
  '国家_地区': 'country',
  '国家/地区': 'country',
  设备: 'device',
};

// rename to english keys
function rename(rows, sheetMap) {
  return rows.map(r => {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[sheetMap[k] || k] = v;
    return o;
  });
}

const output = {
  sourceFile: path.basename(SRC),
  totalClicksAll: queries.reduce((s, r) => s + (r['点击次数'] || 0), 0),
  totalImpressionsAll: queries.reduce((s, r) => s + (r['展示'] || 0), 0),
  totalQueries: queries.length,
  totalPages: pages.length,
  sheets: {
    queries: rename(queries, cn).sort((a, b) => (b.impressions || 0) - (a.impressions || 0)),
    pages: rename(pages, cn).sort((a, b) => (b.impressions || 0) - (a.impressions || 0)),
    byDate: rename(byDate, cn),
    countries: rename(countries, cn).sort((a, b) => (b.impressions || 0) - (a.impressions || 0)),
    devices: rename(devices, cn),
  },
};

fs.writeFileSync(OUT, JSON.stringify(output, null, 2));

console.log('=== SUMMARY ===');
console.log(`queries: ${output.totalQueries} | pages: ${output.totalPages} | countries: ${countries.length}`);
console.log(`total clicks (sum across queries sheet): ${output.totalClicksAll}`);
console.log(`total impressions: ${output.totalImpressionsAll}`);

console.log('\nTOP 15 QUERIES by impressions:');
output.sheets.queries.slice(0, 15).forEach((r, i) =>
  console.log(`  ${i + 1}. [${r.query}] imp=${r.impressions} clk=${r.clicks} pos=${r.position} ctr=${(r.ctr * 100).toFixed(2)}%`)
);

console.log('\nTOP 15 PAGES by impressions:');
output.sheets.pages.slice(0, 15).forEach((r, i) =>
  console.log(`  ${i + 1}. [${r.landing_page}] imp=${r.impressions} clk=${r.clicks} pos=${r.position}`)
);

console.log('\nWROTE:', OUT);
