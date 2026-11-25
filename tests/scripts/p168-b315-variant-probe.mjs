#!/usr/bin/env node
// P168 B3-15 —— **变体探针**（比例型 param 的兜底值随变体怎么变）。
//
// ⭐ 用途：把 article_freshness 的 tip 行 **stale_pct**（= stale/total，**比例型** param）
//       在每个变体下的**兜底值**直接算出来 ⇒ 用**数字**证明：
//         · 保比变体集（默认 + 全局×3+1）下 stale_pct **恒定**（分子分母同步放大）
//         · 逐参数变体集下 stale_pct **确实变化**
//       ⇒ 前者抓不到「模板冻结数值」逃逸，后者能抓到。
//
// ⭐ 变体集与 tests/scripts/p168-b315-params-coverage.mjs 的 variantsOf **同构**
//   （同一份 SCALES / scaleOne / 逐参数独立扰动逻辑）⇒ 两边口径一致。
//
// 跑法（cwd = 仓库根或 shadow repo 根）：
//      node --import tsx tests/scripts/p168-b315-variant-probe.mjs
// 输出：每行一个 JSON（{ variant, stale_pct, ratioPreserving, inputs }）
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
requireCjs('../../src/engines/index.ts');
const { getAllEngines } = requireCjs('../../src/core/engines/registry.ts');

const SLUG = 'solopreneur-article-freshness-calculator';
const CODE = 'calc_out.article_freshness.row.tip';
const NL = String.fromCharCode(10);
const SCALES = [7, 0.4];

/** 每个引擎的 defaultInputs（与 scripts/codegen-examples.mjs 同一份） */
function codegenDefaults() {
  const out = {};
  try {
    const src = readFileSync('scripts/codegen-examples.mjs', 'utf8');
    const i = src.indexOf('const ENGINES = [');
    if (i < 0) return out;
    const j = src.indexOf(NL + '];', i);
    if (j < 0) return out;
    const arr = new Function('return ' + src.slice(src.indexOf('[', i), j + 2))();
    for (const e of arr) out[e.slug] = e.defaultInputs;
  } catch {
    /* 回落 synthetic */
  }
  return out;
}

/** 只把一个输入按倍率改掉（其余原样）⇒ 分子分母不同步 */
function scaleOne(base, key, factor) {
  const out = { ...base };
  const n = Number(base[key]);
  if (!Number.isFinite(n) || n <= 0) return out;
  const v = Math.round(n * factor);
  if (!(v > 0)) return out;
  out[key] = String(v);
  return out;
}

/** 变体集：默认 + 全局保比 + 逐参数独立扰动（与 params-coverage.mjs 同构） */
function variantsOf(base) {
  const out = [{ name: '默认', inputs: { ...base } }];
  const all = {};
  for (const [k, val] of Object.entries(base)) {
    const n = Number(val);
    all[k] = Number.isFinite(n) && n > 0 ? String(n * 3 + 1) : val;
  }
  out.push({ name: '全局×3+1', inputs: all });
  for (const key of Object.keys(base)) {
    const n = Number(base[key]);
    if (!Number.isFinite(n) || n <= 0) continue;
    for (const f of SCALES) {
      const inputs = scaleOne(base, key, f);
      if (inputs[key] === base[key]) continue;
      out.push({ name: '仅' + key + '×' + f, inputs });
    }
  }
  return out;
}

/** 从 tip 行的兜底文本里挖出 stale_pct（形如「... - 35% of KB ...」） */
function stalePctOf(fallback) {
  const seg = fallback.split('- ')[1] || '';
  return seg.split('%')[0];
}

const engines = getAllEngines();
const e = engines.find((x) => x.slug === SLUG);
if (!e) {
  console.error('找不到引擎：' + SLUG);
  process.exit(1);
}
const base = codegenDefaults()[SLUG];
if (!base) {
  console.error('找不到 defaultInputs：' + SLUG);
  process.exit(1);
}

for (const v of variantsOf(base)) {
  let stalePct = null;
  let fb = '';
  try {
    const out = e.generate(v.inputs);
    const tip = (out || []).map(String).find((l) => l.includes(CODE));
    if (tip) {
      fb = tip.split('|')[1] || '';
      stalePct = stalePctOf(fb);
    }
  } catch (err) {
    fb = 'ERROR:' + String(err && err.message ? err.message : err);
  }
  const ratioPreserving = v.name === '默认' || v.name === '全局×3+1';
  console.log(JSON.stringify({ variant: v.name, stale_pct: stalePct, ratioPreserving, inputs: v.inputs }));
}
