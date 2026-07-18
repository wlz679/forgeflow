// Per-line surgical fix for 5 corrupted lines
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'D:/E/独立站/youtube-tools/src/i18n/translations.ts';
let src = readFileSync(path, 'utf-8');
const lines = src.split('\n');

const fixes = [
  {
    lineIdx: 1716, // 0-indexed
    key: 'tools.solopreneur-expansion-revenue-calculator.faq.1.a',
    en: 'Top-quartile B2B SaaS achieves 15-25% expansion (OpenView/ICONIQ benchmarks for $10M-$50M ARR). Below 5% means no expansion motion — pure retention play. Above 25% is best-in-class mid-market motion.',
    zh: '顶级 B2B SaaS 达到 15-25% 的扩展率（OpenView/ICONIQ 对 $10M-$50M ARR 的基准）。低于 5% 意味着没有扩展动作——纯留存打法。高于 25% 属于最佳中型市场打法。',
  },
  {
    lineIdx: 1753,
    key: 'tools.solopreneur-renewal-rate-calculator.faq.3.a',
    en: 'Quarterly is standard for B2B SaaS with annual contracts — each quarter captures a new cohort of renewals. For monthly-billing businesses, monthly tracking works. Mid-market B2B SaaS ($10M-$50M ARR) typically reports renewal rates quarterly to align with board meetings.',
    zh: '按季度是年度合同 B2B SaaS 的标准做法——每季度捕捉一批新的续约群体。包月业务可按月追踪。中端市场 B2B SaaS（ARR $10M-$50M）通常按季度向董事会汇报续约率。',
  },
  {
    lineIdx: 1928,
    key: 'tools.solopreneur-cost-per-support-ticket-calculator.faq.3.a',
    en: 'TSIA (Technology & Services Industry Association) 2024 Support Operations Benchmark reports a median fully-loaded cost per ticket of $15.92 for B2B tech support and $4.59 for B2C. Your blended cost will vary based on tier mix, channel mix, and automation level.',
    zh: 'TSIA（技术服务业协会）2024 年支持运营基准报告显示，B2B 技术支持每工单完全加载成本中位数为 $15.92，B2C 为 $4.59。你的混合成本会因层级组合、渠道组合和自动化水平而异。',
  },
  {
    lineIdx: 2127,
    key: 'tools.solopreneur-documentation-roi-calculator.faq.0.a',
    en: 'ROI = (net savings / KB team cost) × 100, where net savings = (tickets deflected × cost per ticket) - KB team annual cost. A "good" ROI is ≥ 400% — meaning every $1 spent on docs deflects $4+ in support costs. Below 200% means your docs are not pulling their weight.',
    zh: 'ROI = (净节省 / 知识库团队成本) × 100，其中净节省 = (偏转工单 × 每工单成本) - 知识库团队年度成本。优秀 ROI ≥ 400%——意味着每投入 $1 文档可偏转 $4 以上支持成本。低于 200% 说明文档未充分发挥价值。',
  },
  {
    lineIdx: 2133,
    key: 'tools.solopreneur-documentation-roi-calculator.faq.3.a',
    en: 'Use your blended fully-loaded cost — agent salary + tooling + overhead divided by tickets handled. TSIA 2024 median is $15.92/ticket for B2B support, $4.59 for B2C. If you do not track this, start with $15 and refine quarterly.',
    zh: '使用你的混合完全加载成本——（客服薪资 + 工具 + 管理费用）÷ 处理的工单数。TSIA 2024 中位数：B2B 支持每工单 $15.92，B2C $4.59。如果你尚未追踪，可先用 $15 起算，按季度优化。',
  },
];

let fixed = 0;
for (const f of fixes) {
  const oldLine = lines[f.lineIdx];
  if (!oldLine || !oldLine.includes(f.key)) {
    console.log('SKIP line', f.lineIdx + 1, ': key not found');
    continue;
  }
  const escapedZh = f.zh.replace(/'/g, "\\'");
  const correctLine = `  '${f.key}': { en: '${f.en}', zh: '${escapedZh}' },`;
  lines[f.lineIdx] = correctLine;
  fixed++;
  console.log('Fixed line', f.lineIdx + 1, ':', f.key);
}

writeFileSync(path, lines.join('\n'));
console.log('\nTotal fixed:', fixed);