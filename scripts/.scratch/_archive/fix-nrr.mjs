// Fix the corrupted NRR faq.2.a line
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'D:/E/独立站/youtube-tools/src/i18n/translations.ts';
let src = readFileSync(path, 'utf-8');
const lines = src.split('\n');

// Look at lines around 1684
for (let i = 1680; i < 1688; i++) {
  console.log(i + 1, '|', lines[i].slice(0, 100));
}

// Build the correct line
const correctEn = "Top-quartile B2B SaaS achieves NRR ≥ 120% (OpenView / ICONIQ benchmarks for $10M-$50M ARR companies). Median is around 105-110%. Below 100% means you are shrinking your existing-customer revenue base — a critical red flag for board reporting.";
const correctZh = "顶级 B2B SaaS 达到 NRR ≥ 120%（OpenView / ICONIQ 对 $10M-$50M ARR 公司的基准）。中位数约 105-110%。低于 100% 意味着现有客户的收入基础在收缩——是董事会汇报中的严重红旗。";
const correctLine = `  'tools.solopreneur-nrr-calculator.faq.2.a': { en: '${correctEn}', zh: '${correctZh}' },`;

// Replace line 1684
lines[1683] = correctLine;
const newSrc = lines.join('\n');
writeFileSync(path, newSrc);
console.log('\nFixed line 1684.');