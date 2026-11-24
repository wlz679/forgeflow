#!/usr/bin/env node
// P168 B3-15 Task 2 —— 结果卡片 token 的 **params 覆盖** 验收脚本。
//
// 用途（可复算报告 `.superpowers/sdd/2026-11-24-p168-b3-15-tokenize-batch3/task-2-report.md` ① 节的全部数字）：
//   对本批 12 个引擎的每个结果卡片 token 行，逐行核对三件事：
//     ① 每个 param 的值都出现在渲染后的英文兜底里（⇒ 没有「参数传了但没用上」）；
//     ② locale en/zh 两侧的占位符集合 == params 键集合（⇒ 模板没有冻结数值，也没有多余占位符）；
//     ③ en/zh 两侧该 code 都已落库（⇒ G2 模板表守恒的逐行体检）。
//
// 数据来源：引擎 `staticExamples[0]` 里的 token 载荷 `$calc_out.<code>{json}|<英文兜底>|`
//          （由 codegen 用真实 generate() 跑出来的产物 ⇒ 载荷里的值就是运行时值）+
//          `src/i18n/locales/{en,zh}.json`。
//
// ⚠️ **必须从仓库根运行**（脚本内 `src/` 相对路径按仓库根算）：
//      node tests/scripts/p168-b315-params-coverage.mjs
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。
//
// 退出码：0 = 全部通过；1 = 有违规。
import { readFileSync } from 'node:fs';

const EN = JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8'));
const ZH = JSON.parse(readFileSync('src/i18n/locales/zh.json', 'utf8'));

/** 本批 12 个引擎：[别名(= toolAlias(slug)), 引擎文件] */
const ENGINES = [
  ['article_freshness', 'src/engines/knowledge/article-freshness-calculator.ts'],
  ['article_helpfulness', 'src/engines/knowledge/article-helpfulness-calculator.ts'],
  ['deflection_quality', 'src/engines/knowledge/deflection-quality-calculator.ts'],
  ['documentation_roi', 'src/engines/knowledge/documentation-roi-calculator.ts'],
  ['search_effectiveness', 'src/engines/knowledge/search-effectiveness-calculator.ts'],
  ['kb_coverage_rate', 'src/engines/knowledge/kb-coverage-rate-calculator.ts'],
  ['breach_notification_cost', 'src/engines/legal-compliance/breach-notification-cost-calculator.ts'],
  ['cmp_roi', 'src/engines/legal-compliance/cmp-roi-calculator.ts'],
  ['consent_revenue_impact', 'src/engines/legal-compliance/consent-revenue-impact-calculator.ts'],
  ['dpa_cost', 'src/engines/legal-compliance/dpa-cost-calculator.ts'],
  ['dsar_cost', 'src/engines/legal-compliance/dsar-cost-calculator.ts'],
  ['gdpr_fine', 'src/engines/legal-compliance/gdpr-fine-calculator.ts'],
];

/** 英文兜底里的数字（用于识别「未参数化的运行时值」） */
const NUM_RE = /-?\d[\d,]*(?:\.\d+)?/g;

/** 取静态示例数组的内容（⚠️ 数组带尾逗号 ⇒ 闭引号后可能是 ',' 而非空白） */
function readStaticExample(src) {
  const m = src.match(/staticExamples:\s*\[\s*'([\s\S]*?)'\s*,?\s*\]/);
  return m ? m[1].replace(/\\n/g, '\n') : '';
}

/** 模板占位符集合（去重 + 排序） */
function placeholders(text) {
  return [...new Set([...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]))].sort();
}

let rows = 0;
let violations = 0;
const detail = [];

for (const [alias, file] of ENGINES) {
  const src = readFileSync(file, 'utf8');
  const example = readStaticExample(src);
  // ⚠️ params 组可选：纯静态文案的 tip 行不带 params（载荷形如 `$calc_out.x.row.tip|兜底|`）
  const re = /\$calc_out\.([a-z0-9_]+)\.row\.([a-z]+)(\{[^{}]*\})?\|([^|]*)\|/g;
  let mm;
  while ((mm = re.exec(example))) {
    const code = 'calc_out.' + mm[1] + '.row.' + mm[2];
    const params = mm[3] ? JSON.parse(mm[3]) : {};
    const english = mm[4];
    const keys = Object.keys(params).sort();
    const vals = Object.values(params).map(String);

    // ① 每个 param 值都出现在英文兜底里
    const missing = vals.filter((v) => v.length > 0 && !english.includes(v));
    // ② en/zh 占位符集合 == params 键集合
    const enPh = placeholders(EN[code] || '');
    const zhPh = placeholders(ZH[code] || '');
    const phOk =
      JSON.stringify(enPh) === JSON.stringify(keys) && JSON.stringify(zhPh) === JSON.stringify(keys);
    // ③ en/zh 都已落库
    const landed = Boolean(EN[code]) && Boolean(ZH[code]);

    // 英文兜底里未参数化的数字（正常应只剩字面量常量：月份换算 / 阈值 / 跨工具编号）
    const literals = [...new Set(english.match(NUM_RE) || [])].filter(
      (n) => !vals.some((v) => v.includes(n)),
    );

    const ok = missing.length === 0 && phOk && landed;
    if (!ok) violations++;
    rows++;
    detail.push(
      [
        ok ? 'OK  ' : 'FAIL',
        alias,
        mm[2],
        'params=' + keys.length,
        '未出现在英文兜底里的param=' + JSON.stringify(missing),
        '占位符一致=' + phOk,
        '已落库=' + landed,
        '字面量常量=' + JSON.stringify(literals),
      ].join(' | '),
    );
  }
}

for (const line of detail) console.log(line);
console.log('—— ' + rows + ' 行 · 违规 ' + violations + ' 条');
process.exit(violations === 0 ? 0 : 1);
