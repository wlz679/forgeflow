#!/usr/bin/env node
// P168 —— 决策建议「建议码 + locale 模板」的**主守卫**（批次：zh 动态层英文缺陷修复）。
//
// 本守卫守三条链：
//   ① 解析器：只认结构化 JSON，其它一律 null（不得「猜」）
//   ② 三集合守恒：引擎源码里的建议码 == locale 里的模板 == 探针跑出来的码
//   ③ 译文质量：zh 模板不是英文原文、不是占位、厚度达标、占位符对齐
//
// P153-G1: source-only guard —— 不需要 pnpm build。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  extractDecisionLines,
  fillTemplate,
  parseDecisionTip,
} from '../src/lib/decision-support.ts';

test('P168 建议码解析器：只认结构化 JSON，其它一律 null（不得「猜」）', () => {
  assert.deepEqual(parseDecisionTip('{"code":"burn_high_burn","params":{}}'), {
    code: 'burn_high_burn',
    params: {},
  });
  assert.deepEqual(
    parseDecisionTip('{"code":"ltv_strong_winner","params":{"winner":"Ch1","winnerRatio":"3.2"}}'),
    { code: 'ltv_strong_winner', params: { winner: 'Ch1', winnerRatio: '3.2' } },
  );
  // 旧式英文句子 ⇒ null
  assert.equal(parseDecisionTip('Team costs are typically 50-70% of gross burn.'), null);
  // JSON 但没有 code ⇒ null
  assert.equal(parseDecisionTip('{"params":{"a":"1"}}'), null);
  // code 不是字符串 ⇒ null
  assert.equal(parseDecisionTip('{"code":123,"params":{}}'), null);
  // 非法 JSON ⇒ null
  assert.equal(parseDecisionTip('{"code":'), null);
  // 数组 / 空 ⇒ null
  assert.equal(parseDecisionTip('[]'), null);
  assert.equal(parseDecisionTip(''), null);
});

test('P168 建议码解析器：参数值一律字符串化（避免 3.2 与 "3.2" 两种写法）', () => {
  const p = parseDecisionTip('{"code":"c","params":{"ratio":3.2,"n":2,"skip":null}}');
  assert.deepEqual(p, { code: 'c', params: { ratio: '3.2', n: '2' } });
});

test('P168 模板插值：{param} 全部出现都替换（与 translate-helper 同一口径）', () => {
  assert.equal(fillTemplate('Move {winner} to {loser}', { winner: 'Ch1', loser: 'Ch2' }), 'Move Ch1 to Ch2');
  // 同一个占位符出现两次 ⇒ 两处都替换
  assert.equal(fillTemplate('{winner} and {winner}', { winner: 'Ch1' }), 'Ch1 and Ch1');
  // 没有对应参数 ⇒ 占位符原样保留（不静默吞掉）
  assert.equal(fillTemplate('ratio {ratio}', {}), 'ratio {ratio}');
});

test('P168 提取器：结构化输出带上 tipCode / tipParams，旧式输出仍是空码', () => {
  const structured = extractDecisionLines('💡 Tip: {"code":"burn_high_burn","params":{}}');
  assert.equal(structured.tipCode, 'burn_high_burn');
  assert.deepEqual(structured.tipParams, {});
  const legacy = extractDecisionLines('💡 Tip: Team costs are typically 50-70% of gross burn.');
  assert.equal(legacy.tipCode, '');
  assert.deepEqual(legacy.tipParams, {});
  // ⭐ 向后兼容：tip 字段语义不变（marker 之后的原文）
  assert.equal(legacy.tip, 'Team costs are typically 50-70% of gross burn.');
});

test('P168 共享模块：不得 import locale（客户端 bundle 会被拖进 1.9MB）', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/decision-support.ts'), 'utf8');
  assert.doesNotMatch(src, /from '\.\.\/i18n/);
  assert.doesNotMatch(src, /locales\//);
});

import {
  DECISION_TIP_KEY_PREFIX,
  decisionTipTemplates,
  decisionTipTemplatesJson,
  renderDecisionTip,
} from '../src/lib/decision-tip-templates.ts';

test('P168 模板模块：键前缀与 locale 的 decision_tip.* 对齐', () => {
  assert.equal(DECISION_TIP_KEY_PREFIX, 'decision_tip.');
});

test('P168 模板模块：只挑出 decision_tip.* 前缀的键，且去掉前缀', () => {
  const tpls = decisionTipTemplates('zh');
  assert.ok(Object.keys(tpls).length > 0, 'zh 没有任何建议模板');
  for (const [code, text] of Object.entries(tpls)) {
    assert.ok(code.length > 0);
    assert.ok(!code.startsWith(DECISION_TIP_KEY_PREFIX), '前缀没去掉：' + code);
    assert.ok(text.length > 0);
  }
});

test('P168 模板模块：注入用的 JSON 串不含裸 <（防 </script> 截断）', () => {
  const json = decisionTipTemplatesJson('zh');
  assert.ok(!json.includes('<'), 'JSON 里出现裸 <');
  assert.doesNotThrow(() => JSON.parse(json));
});

test('P168 模板模块：renderDecisionTip 按 locale 取模板并插值', () => {
  const tpls = decisionTipTemplates('zh');
  const code = Object.keys(tpls)[0];
  const zh = renderDecisionTip(code, {}, 'zh');
  assert.ok(zh.length > 0, '渲染结果为空');
  assert.notEqual(zh, DECISION_TIP_KEY_PREFIX + code, '渲染回了原始键名（说明模板不存在）');
});

test('P168 模板模块：不存在的建议码返回空串（不得把键名渲染到页面上）', () => {
  assert.equal(renderDecisionTip('definitely_not_a_code', {}, 'zh'), '');
});

import { infoUnits, readLocale } from './_decision-support-fixture.ts';
import { TIP_PROBES, probeCodes } from './_decision-tip-probe.ts';
import { getAllEngines } from '../src/core/engines/registry.ts';

const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;

const TIP_CASES: { slug: string; codes: string[] }[] = [
  { slug: 'solopreneur-burn-rate-calculator', codes: ['burn_cashflow_positive', 'burn_high_burn', 'burn_positive_burn'] },
  { slug: 'solopreneur-gdpr-fine-calculator', codes: ['gdpr_escalate', 'gdpr_full_programme', 'gdpr_manageable', 'gdpr_mature'] },
  { slug: 'solopreneur-cac-calculator', codes: ['cac_no_revenue', 'cac_payback_fast', 'cac_payback_past_12', 'cac_payback_slow', 'cac_payback_within_12'] },
  { slug: 'solopreneur-ltv-by-channel-calculator', codes: ['ltv_both_healthy', 'ltv_no_data', 'ltv_no_green', 'ltv_similar_ratios', 'ltv_single_channel', 'ltv_strong_winner'] },
];

test('P168 建议码守恒（唯一不变量）：源码 == 探针 == 登记 == locale(en+zh)，且无死模板', () => {
  // ⭐⭐ **只留这一条守恒断言**（§19.26.9 的教训：同一个不变量被两处守
  //   ⇒ 一次变异必然红两条 ⇒ 隔离要拆）。
  //   这里把「源码 / 运行时探针 / 登记清单 / locale 模板」四个视角
  //   **合成一条** ⇒ 任何改动都只红这一条。
  const problems: string[] = [];
  const allCodes = new Set<string>();
  for (const c of TIP_CASES) {
    const probe = probeCodes(c.slug).sort();
    const src = sourceCodes(c.slug);
    const registered = [...c.codes].sort();
    if (JSON.stringify(probe) !== JSON.stringify(registered)) {
      problems.push(c.slug + '：探针跑出 ' + JSON.stringify(probe) + '，登记的是 ' + JSON.stringify(registered));
    }
    if (JSON.stringify(src) !== JSON.stringify(registered)) {
      problems.push(c.slug + '：源码里有 ' + JSON.stringify(src) + '，登记的是 ' + JSON.stringify(registered));
    }
    for (const code of registered) allCodes.add(code);
  }
  for (const lang of ['en', 'zh'] as const) {
    const loc = Object.keys(locales[lang])
      .filter((k) => k.startsWith('decision_tip.'))
      .map((k) => k.slice('decision_tip.'.length))
      .sort();
    const want = [...allCodes].sort();
    if (JSON.stringify(loc) !== JSON.stringify(want)) {
      problems.push(lang + '：模板集合 ' + JSON.stringify(loc) + ' != 码集合 ' + JSON.stringify(want));
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

const ENGINE_FILES: Record<string, string> = {
  'solopreneur-burn-rate-calculator': 'src/engines/saas/burn-rate-calculator.ts',
  'solopreneur-ltv-by-channel-calculator': 'src/engines/marketing/ltv-by-channel-calculator.ts',
  'solopreneur-gdpr-fine-calculator': 'src/engines/legal-compliance/gdpr-fine-calculator.ts',
  'solopreneur-cac-calculator': 'src/engines/valuation/cac-calculator.ts',
};

/** 引擎源码里出现的建议码字面量（'code': 'xxx' 形式，TS 侧与 customFn 侧都算） */
function sourceCodes(slug: string): string[] {
  const src = readFileSync(resolve(process.cwd(), ENGINE_FILES[slug]), 'utf8');
  const out = new Set<string>();
  for (const m of src.matchAll(/code:\s*'([a-z0-9_]+)'/g)) out.add(m[1]);
  return [...out].sort();
}

test('P168 接线：派给客户端的 raw 必须包含全部结果（gdpr 的 Tip 在最后一个元素里）', () => {
  // ⭐ 实测：solopreneur-gdpr-fine-calculator 的 generate() 返回 **6 个元素**，
  //   Tip 在**最后一个** ⇒ 只把 results[0] 派给客户端，客户端就永远抓不到 Tip
  //   ⇒ 用户点「计算」后动态层还停在示例内容（gdpr 的动态层形同虚设）。
  const src = readFileSync(resolve(process.cwd(), 'src/pages/[lang]/[slug].astro'), 'utf8');
  assert.match(
    src,
    /raw:\s*results && results\.length \? results\.join\(/,
    '客户端 raw 仍然只取 results[0] ⇒ 多元素引擎（gdpr）的 Tip 抓不到',
  );
});

test('P168 译文质量（一）：zh 模板不是英文原文、不是占位', () => {
  const problems: string[] = [];
  const zhCodes = Object.keys(locales.zh).filter((k) => k.startsWith('decision_tip.'));
  assert.ok(zhCodes.length >= 18, 'zh 的建议模板只有 ' + zhCodes.length + ' 条（期望 ≥ 18）');
  for (const key of zhCodes) {
    const en = locales.en[key];
    const zh = locales.zh[key];
    if (typeof en !== 'string' || typeof zh !== 'string') { problems.push(key + ' 缺失'); continue; }
    if (zh === en) problems.push(key + ' 的 zh 与 en 逐字相同（没翻）');
    if (zh.includes('用此计算器')) problems.push(key + ' 是占位模板');
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 译文质量（二）：zh 模板厚度达标（中文 ≥ 英文 × 0.55）', () => {
  const problems: string[] = [];
  for (const key of Object.keys(locales.zh).filter((k) => k.startsWith('decision_tip.'))) {
    const en = locales.en[key];
    const zh = locales.zh[key];
    if (typeof en !== 'string' || typeof zh !== 'string') continue;
    const enUnits = infoUnits(en);
    const zhUnits = infoUnits(zh);
    if (enUnits > 0 && zhUnits < enUnits * 0.55) {
      problems.push(key + ' 的中文只有英文的 ' + (zhUnits / enUnits).toFixed(2) + '（下限 0.55）');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 译文质量（三）：模板的占位符集合 == 引擎实际发出的参数键集合', () => {
  const problems: string[] = [];
  const engines = getAllEngines() as any[];
  for (const [slug, probes] of Object.entries(TIP_PROBES)) {
    for (const probe of probes) {
      const results = engines.find((e) => e.slug === slug)!.generate(probe.inputs);
      const joined = (Array.isArray(results) ? results : [results]).join('\n');
      const lines = extractDecisionLines(joined);
      if (!lines.tipCode) continue;
      const tmpl = locales.zh['decision_tip.' + lines.tipCode] ?? '';
      // ⭐ 模板整个缺失 ⇒ 归「守恒」那条断言管，这里跳过（否则一次变异红两条）
      if (!tmpl) continue;
      const tmplParams = new Set([...tmpl.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]));
      const sent = new Set(Object.keys(lines.tipParams));
      for (const p of sent) {
        if (!tmplParams.has(p)) problems.push(slug + '/' + lines.tipCode + '：模板没有占位符 {' + p + '}');
      }
      for (const p of tmplParams) {
        if (!sent.has(p)) problems.push(slug + '/' + lines.tipCode + '：模板多了占位符 {' + p + '}');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});