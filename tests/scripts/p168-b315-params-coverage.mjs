#!/usr/bin/env node
// P168 B3-15 Task 2 / Task 3 —— 结果卡片 token 的 **params 覆盖** 验收脚本。
//
// 用途（可复算报告 `.superpowers/sdd/2026-11-24-p168-b3-15-tokenize-batch3/task-2-report.md` ① 节的全部数字）：
//   对 B3-15 三组共 24 个引擎的每个结果卡片 token 行（44 行）做**两段**体检：
//
//   【A 段 · 静态体检】（读引擎源码里的 staticExamples[0] 载荷 + locale 文件）
//     A1 每个 param 的值都出现在渲染后的英文兜底里（⇒ 没有「参数传了但没用上」）；
//     A2 locale en/zh 两侧的占位符集合 == params 键集合（⇒ 没有多余 / 缺失的占位符）；
//     A3 en/zh 两侧该 code 都已落库（⇒ G2 模板表守恒的逐行体检）。
//
//   ⭐⭐ **A 段看不见「模板冻结数值」**（2026-11-24 复审实测的假绿逃逸）：
//     占位符集合比对只看**占位符形态**的东西 ⇒ 模板里把 `{up12}` 写成字面量 `325`
//     时，占位符集合照样能对上（因为被删掉的那个占位符不在集合里、字面量也不是占位符）
//     ⇒ A 段假绿 ⇒ **必须靠 B 段**。
//
//   【B 段 · 扰动自检】（真跑引擎：默认输入 vs 数值 ×3+1 输入）
//     B1 同一 code 在每个变体下，**locale.en 模板渲染**必须与**token 英文兜底渲染**逐字相同；
//     B2 **兜底变了 ⇒ 模板渲染必须同步变**（模板冻结数值 ⇒ 兜底变、模板不变 ⇒ 判红）。
//     ⭐ 为什么必须扰动：「数值被冻结」这个缺陷在**默认输入**下常常看不出来
//       （冻结值恰好等于默认值）⇒ 只跑默认输入 ⇒ 缺陷被漏过。
//
//   数据来源：
//     · A 段：引擎源码里的 staticExamples[0] 载荷 `$calc_out.<code>{json}|<英文兜底>|`
//             （由 codegen 用真实 generate() 跑出来的产物 ⇒ 载荷里的值就是运行时值）
//             + `src/i18n/locales/{en,zh}.json`。
//     · B 段：`src/engines/index.ts` 注册的**真引擎**（经 registry 取）
//             + `scripts/codegen-examples.mjs` 里的 defaultInputs。
//
// ⚠️ **必须从仓库根运行**（脚本内 `src/` 相对路径按仓库根算）：
//      node --import tsx tests/scripts/p168-b315-params-coverage.mjs
//
// ⚠️ **必须用 `--import tsx`**：脚本是 .mjs（ESM），而引擎是 .ts；
//    直接 import .ts 会产生**双实例**（ESM 侧的 registry 与引擎内部 require 的 registry
//    不是同一个模块实例）⇒ getAllEngines() 返回 0 ⇒ B 段形同虚设。
//    ⇒ 统一走 createRequire 的 **CJS 桥**，让两边落在同一个实例上。
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。
//
// 退出码：0 = 全部通过；1 = 有违规。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { TOKENIZED } from './p168-tokenized-engines.mjs';

const requireCjs = createRequire(import.meta.url);
requireCjs('../../src/engines/index.ts');
const { getAllEngines } = requireCjs('../../src/core/engines/registry.ts');
const { renderCalcOutput, extractTokenCodes } = requireCjs('../../src/lib/calc-output-i18n.ts');

const EN = JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8'));
const ZH = JSON.parse(readFileSync('src/i18n/locales/zh.json', 'utf8'));

/**
 * B3-15 三组共 24 个引擎的别名清单（slug / 文件从 TOKENIZED 真相源取，避免手写漂移）。
 * · 组 1（B 档 3 个）：snapshot + tip 多行形态，**不在**本脚本口径内（多 bullet / v3 四段）
 * · 组 2（C 档组 A · K 知识库 6 + L 法律合规 6）：12 个
 * · 组 3（C 档组 B · T 客服 6 + H 招聘团队 6）：12 个
 */
const ALIASES = [
  // —— 组 2（C 档组 A）——
  'article_freshness', 'article_helpfulness', 'deflection_quality',
  'documentation_roi', 'search_effectiveness', 'kb_coverage_rate',
  'breach_notification_cost', 'cmp_roi', 'consent_revenue_impact',
  'dpa_cost', 'dsar_cost', 'gdpr_fine',
  // —— 组 3（C 档组 B · T 客服 6 + H 招聘团队 6）——
  'cost_per_support_ticket', 'deflection_rate', 'first_response_time',
  'resolution_time', 'support_capacity_planning', 'csat',
  'attrition_cost', 'equity_refresh', 'fully_loaded_employee_cost',
  'productivity_ramp_curve', 'time_to_productivity', 'comp_banding',
];

const ENGINES = ALIASES.map((alias) => {
  const hit = TOKENIZED.find((e) => e.alias === alias);
  if (!hit) throw new Error('TOKENIZED 里没有别名：' + alias);
  return { slug: hit.slug, alias, file: hit.file };
});

/** 英文兜底里的数字（**仅诊断**，不参与判定 —— 见文件头「A 段看不见冻结数值」） */
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

/** 每个引擎的 defaultInputs（与 scripts/codegen-examples.mjs 同一份） */
function codegenDefaults() {
  const out = {};
  try {
    const src = readFileSync('scripts/codegen-examples.mjs', 'utf8');
    const i = src.indexOf('const ENGINES = [');
    if (i < 0) return out;
    const j = src.indexOf('\n];', i);
    if (j < 0) return out;
    const arr = new Function('return ' + src.slice(src.indexOf('[', i), j + 2))();
    for (const e of arr) out[e.slug] = e.defaultInputs;
  } catch {
    /* 回落 synthetic */
  }
  return out;
}

/** 没有 defaultInputs 时的合成输入（与 p168-server-client-parity.ts 同款） */
function syntheticInputs(engine) {
  const out = {};
  for (const input of engine.inputs ?? []) {
    if (input.type === 'number') { out[input.name] = '1000'; continue; }
    if (input.type === 'select' && Array.isArray(input.options) && input.options.length > 0) {
      const first = input.options[0];
      out[input.name] =
        typeof first === 'object' && first !== null ? (first.value ?? first.label) : first;
    }
  }
  return out;
}

/** 扰动变体：所有正数输入 ×3+1（其余保持不变） */
function perturb(base) {
  const out = {};
  for (const [k, val] of Object.entries(base)) {
    const n = Number(val);
    out[k] = Number.isFinite(n) && n > 0 ? String(n * 3 + 1) : val;
  }
  return out;
}

// ── A 段：静态体检 ────────────────────────────────────────────────────────
const rows = [];
for (const { alias, file } of ENGINES) {
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

    // A1 每个 param 值都出现在英文兜底里
    const missing = vals.filter((v) => v.length > 0 && !english.includes(v));
    // A2 en/zh 占位符集合 == params 键集合
    const enPh = placeholders(EN[code] || '');
    const zhPh = placeholders(ZH[code] || '');
    const phOk =
      JSON.stringify(enPh) === JSON.stringify(keys) && JSON.stringify(zhPh) === JSON.stringify(keys);
    // A3 en/zh 都已落库
    const landed = Boolean(EN[code]) && Boolean(ZH[code]);

    // 诊断：英文兜底里未参数化的数字（**仅诊断**）：
    //   正常应只剩字面量常量（月份换算 / 阈值档位 / 跨工具编号），
    //   但「字面量常量」与「被冻结的运行时值」在单输入下**无法区分** ⇒ 不参与判定。
    const literals = [...new Set(english.match(NUM_RE) || [])].filter(
      (n) => !vals.some((v) => v.includes(n)),
    );

    rows.push({
      alias,
      code,
      kind: mm[2],
      keys,
      params,
      english,
      missing,
      phOk,
      landed,
      literals,
      staticOk: missing.length === 0 && phOk && landed,
    });
  }
}

// ── B 段：扰动自检 ────────────────────────────────────────────────────────
const targetCodes = new Set(rows.map((r) => r.code));
const allEngines = getAllEngines();
const defaults = codegenDefaults();
/** code -> { [variantName]: { fb, tp } } */
const observed = new Map();
const variantUsed = new Map();

for (const { slug, alias } of ENGINES) {
  const e = allEngines.find((x) => x.slug === slug);
  if (!e) continue;
  const base = defaults[slug] ?? syntheticInputs(e);
  const gen = e.generate ?? e.calculate;
  if (typeof gen !== 'function') continue;
  const variants = [
    { name: '默认', inputs: base },
    { name: '扰动', inputs: perturb(base) },
  ];
  for (const v of variants) {
    let out;
    try {
      out = gen.call(e, v.inputs);
    } catch {
      continue; // 该变体不可用（输入非法）⇒ 不计入覆盖
    }
    const lines = Array.isArray(out) ? out.map(String) : [String(out)];
    for (const line of lines) {
      for (const code of extractTokenCodes(line)) {
        if (!targetCodes.has(code)) continue;
        const fb = renderCalcOutput(line, {});
        const tp = renderCalcOutput(line, { [code]: EN[code] });
        if (!observed.has(code)) observed.set(code, {});
        observed.get(code)[v.name] = { fb, tp };
        variantUsed.set(code, (variantUsed.get(code) || 0) + 1);
      }
    }
  }
}

let staticViolations = 0;
let perturbViolations = 0;
let frozenViolations = 0;
let reached = 0;
const detail = [];

for (const r of rows) {
  const obs = observed.get(r.code) || {};
  const def = obs['默认'];
  const per = obs['扰动'];
  const variants = Object.keys(obs);

  // B1 每个变体下：模板渲染 === 兜底渲染
  const mismatch = variants.filter((v) => obs[v].fb !== obs[v].tp);
  // B2 兜底变了 ⇒ 模板渲染必须同步变（模板冻结数值 ⇒ 兜底变、模板不变）
  const frozen =
    def && per && def.fb !== per.fb && def.tp === per.tp ? true : false;
  const perturbReached = Boolean(def && per && def.fb !== per.fb);
  if (perturbReached) reached++;

  if (!r.staticOk) staticViolations++;
  if (mismatch.length) perturbViolations++;
  if (frozen) frozenViolations++;

  const ok = r.staticOk && mismatch.length === 0 && !frozen;
  detail.push(
    [
      ok ? 'OK  ' : 'FAIL',
      r.alias,
      r.kind,
      'params=' + r.keys.length,
      'A段(静态)=' + (r.staticOk ? 'OK' : 'FAIL'),
      'B段(扰动)=' + (mismatch.length || frozen ? 'FAIL' : 'OK'),
      '变体=' + (variants.length || 0),
      '扰动触达=' + (perturbReached ? '是' : '否'),
      '未出现在英文兜底里的param=' + JSON.stringify(r.missing),
      '占位符一致=' + r.phOk,
      '已落库=' + r.landed,
      '模板≠兜底的变体=' + JSON.stringify(mismatch),
      '模板冻结数值=' + frozen,
      '字面量常量(仅诊断)=' + JSON.stringify(r.literals),
    ].join(' | '),
  );
}

for (const line of detail) console.log(line);
console.log(
  '—— ' + rows.length + ' 行 · 违规 ' + (staticViolations + perturbViolations + frozenViolations) +
    ' 条（静态体检 ' + staticViolations + ' · 扰动自检 ' + perturbViolations +
    ' · 模板冻结数值 ' + frozenViolations + '）',
);
console.log(
  '扰动触达：' + reached + ' / ' + rows.length + ' 行在扰动输入下兜底发生变化' +
    '（其余为纯静态行 / 扰动未触达 ⇒ 这些行只有 A 段覆盖）',
);
process.exit(staticViolations + perturbViolations + frozenViolations === 0 ? 0 : 1);
