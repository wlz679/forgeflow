#!/usr/bin/env node
// P168 B3-9 —— customFn 返回数组长度守卫（source-only）。
//
// 页面只渲染 results[0]（src/pages/[lang]/[slug].astro:2186：results = [results[0]]）
// ⇒ customFn 返回多元素数组时，第 2 行起的内容被静默丢弃（静态示例却是完整的）。
// P164 的 customfn-contract-guard 断言的是「非空字符串数组」，多元素数组同样满足
// ⇒ 它结构上看不见这个缺陷；这里守独立的不变量：返回数组长度必须为 1。
//
// DEBT = 当前欠账清单（**58 个** · 2026-11-18 实测）：不得新增；修好必须销账；每条必须真的丢内容。
// 台账只能变小不能变大，每次变动都在 diff 里看得见。
//
// ⚠️⚠️ 2026-11-18 **修正漏账**（54 → 58，**这 4 条不是新增欠账，而是原来漏测的**）：
//   原探针只用 synthetic 输入 ⇒ **测量口径 ≠ 页面真实场景**（页面静态卡片用的是 codegen 默认输入）
//   ⇒ 实测这 4 个引擎在 codegen 默认输入下返回 **6~7 个元素**、在 synthetic 下只返回 1 个（走了别的分支）：
//   safe-convertible-note / mortgage / brrrr / power-user-curve
//   ⇒ 探针改成**两种口径都测**（见下方 probe()）⇒ 台账覆盖真实场景。
//   ⭐ 判据：**守卫的取样口径必须与页面真实使用的输入一致**，否则台账会静默漏账。

import { test } from 'node:test';
import { codegenDefaults } from './scripts/p168-server-client-parity.ts';
import { strict as assert } from 'node:assert';

const NL = String.fromCharCode(10);

const DEBT = new Set<string>([
  // ↓ 2026-11-18 修正漏账（codegen 默认口径下才多元素，synthetic 口径漏测）
  'solopreneur-safe-convertible-note-calculator',
  'solopreneur-mortgage-calculator',
  'solopreneur-brrrr-calculator',
  'solopreneur-power-user-curve-calculator',
  'solopreneur-project-profitability-calculator',
  'solopreneur-openai-token-calculator',
  'solopreneur-time-value-calculator',
  'solopreneur-freelance-tax-calculator',
  'solopreneur-rent-vs-buy-calculator',
  'solopreneur-freelance-rate-calculator',
  'solopreneur-activation-rate-calculator',
  'solopreneur-feature-adoption-calculator',
  'solopreneur-rental-yield-calculator',
  'solopreneur-funnel-step-calculator',
  'solopreneur-meeting-cost-calculator',
  'solopreneur-stickiness-calculator',
  'solopreneur-stripe-fee-calculator',
  'solopreneur-breach-notification-cost-calculator',
  'solopreneur-cmp-roi-calculator',
  'solopreneur-saas-pricing-planner',
  'solopreneur-consent-revenue-impact-calculator',
  'solopreneur-dpa-cost-calculator',
  'solopreneur-article-helpfulness-calculator',
  'solopreneur-dsar-cost-calculator',
  'solopreneur-documentation-roi-calculator',
  'solopreneur-affiliate-income-calculator',
  'solopreneur-saas-valuation-calculator',
  'solopreneur-gdpr-fine-calculator',
  'solopreneur-deflection-quality-calculator',
  'solopreneur-course-pricing-calculator',
  'solopreneur-deflection-rate-calculator',
  'solopreneur-resolution-time-calculator',
  'solopreneur-search-effectiveness-calculator',
  'solopreneur-first-response-time-calculator',
  'solopreneur-article-freshness-calculator',
  'solopreneur-cost-per-support-ticket-calculator',
  'solopreneur-csat-calculator',
  'solopreneur-support-capacity-planning-calculator',
  'solopreneur-time-to-value-calculator',
  'solopreneur-productivity-ramp-curve-calculator',
  'solopreneur-equity-refresh-calculator',
  'solopreneur-attrition-cost-calculator',
  'solopreneur-kb-coverage-rate-calculator',
  'solopreneur-fully-loaded-employee-cost-calculator',
  'solopreneur-remote-vs-office-calculator',
  'solopreneur-time-to-productivity-calculator',
  'solopreneur-comp-banding-calculator',
  'solopreneur-employee-cost-calculator',
  'solopreneur-renewal-rate-calculator',
  'solopreneur-ltv-calculator',
  'solopreneur-burn-multiple-rule-of-40-calculator',
  'solopreneur-compound-interest-calculator',
  'solopreneur-hourly-vs-fixed-calculator',
  'solopreneur-equity-dilution-calculator',
  'solopreneur-productivity-score',
  'solopreneur-arr-multiple-valuation-calculator',
  'solopreneur-sponsorship-rate-calculator',
  'solopreneur-dscr-calculator',
]);

function pick(a: unknown[]): unknown {
  return a[Math.floor(Math.random() * a.length)];
}
function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '{' + k + '}');
}
function syntheticInputs(engine: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of engine.inputs ?? []) {
    if (i.type === 'number') { out[i.name] = '1000'; continue; }
    if (i.type === 'select' && Array.isArray(i.options) && i.options.length > 0) {
      const f = i.options[0];
      out[i.name] = typeof f === 'object' && f !== null ? (f.value ?? f.label) : f;
      continue;
    }
    out[i.name] = 'SaaS';
  }
  return out;
}

let enginesPromise: Promise<any[]> | null = null;
function loadEngines(): Promise<any[]> {
  if (!enginesPromise) {
    enginesPromise = (async () => {
      await import('../src/engines/index.ts');
      const { getAllEngines } = await import('../src/core/engines/registry.ts');
      return getAllEngines() as any[];
    })();
  }
  return enginesPromise;
}

/**
 * 探针：**两种输入口径**都要测。
 *
 * ⭐⭐ P168 B3-10 实测修正（2026-11-18）：原探针只用 `syntheticInputs(e)` ⇒
 *   **测量口径 ≠ 页面真实场景** —— 页面静态卡片用的是 **codegen 默认输入**
 *   （codegen 用它生成 `staticExamples[0]`），而用户点「计算」时用的是他填的值。
 *   实测有 **4 个引擎**在 codegen 默认输入下返回 **6~7 个元素**、在 synthetic 输入下只返回 **1 个**
 *   （走的是另一个分支）⇒ 只测 synthetic ⇒ 台账**少算了 4 条真欠账**。
 * ⇒ 现在两种口径都测，取「元素数更多 / 丢字符更多」的那次 ⇒ 台账覆盖真实场景。
 */
async function probe(): Promise<Map<string, { elements: number; lost: number }>> {
  const engines = await loadEngines();
  const defaults = codegenDefaults();
  const lostOf = new Map<string, { elements: number; lost: number }>();
  for (const e of engines) {
    const body = e.clientConfig?.customFn;
    if (typeof body !== 'string' || !body.length) continue;
    let fn: any;
    try { fn = new Function('inputs', 'pick', 'fill', body); } catch { continue; }
    const inputSets: Record<string, string>[] = [];
    const d = defaults[e.slug];
    if (d) inputSets.push(d);
    inputSets.push(syntheticInputs(e));
    let bestElements = 0;
    let bestLost = 0;
    for (const inputs of inputSets) {
      let out: unknown;
      try { out = fn(inputs, pick, fill); } catch { continue; }
      if (!Array.isArray(out) || out.length <= 1) continue;
      const first = typeof out[0] === 'string' ? out[0] : '';
      const joined = out.filter((x: unknown) => typeof x === 'string').join(NL);
      bestElements = Math.max(bestElements, out.length);
      bestLost = Math.max(bestLost, joined.length - first.length);
    }
    if (bestElements > 1) lostOf.set(e.slug, { elements: bestElements, lost: bestLost });
  }
  return lostOf;
}

test('G15: 每个 customFn 都必须返回单元素数组（页面只渲染 results[0]）', async () => {
  const lostOf = await probe();
  const actual = new Set(lostOf.keys());
  const newly = [...actual].filter((s) => !DEBT.has(s));
  const fixed = [...DEBT].filter((s) => !actual.has(s));
  assert.deepEqual(newly, [], 'these engines now return more than one element - the page renders results[0] only, so every element after the first is dropped. Fix the engine and remove it from DEBT. ' + newly.join(' | '));
  assert.deepEqual(fixed, [], 'these DEBT entries no longer describe a multi-element return - remove them from DEBT (the ledger may shrink, it may never drift). ' + fixed.join(' | '));
});

test('G15b: 台账里的每一条欠账都必须真的丢内容（lost > 0）', async () => {
  const lostOf = await probe();
  const empty: string[] = [];
  for (const slug of DEBT) {
    const v = lostOf.get(slug);
    if (v === undefined) { empty.push(slug + ' (not multi-element any more)'); continue; }
    if (v.lost <= 0) empty.push(slug + ' (loses nothing)');
  }
  assert.deepEqual(empty, [], 'these DEBT entries do not describe a real truncation.\n' + empty.join('\n'));
});

test('G15c: 防真空绿 —— 台账非空', () => {
  assert.ok(DEBT.size > 0, 'DEBT must not be empty: an empty ledger would make G15 vacuous.');
});
