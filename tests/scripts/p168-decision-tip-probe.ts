#!/usr/bin/env node
// P168 —— 决策建议**分支探针**的可复算工具。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules\tsx\dist\cli.mjs tests\scripts\p168-decision-tip-probe.ts
//   node node_modules\tsx\dist\cli.mjs tests\scripts\p168-decision-tip-probe.ts --strict
//
// 用途：
//   ① 打印每个工具的「建议码 → 实测输入」，供人工核对与规格回填；
//   ② 任何探针跑出的码与登记不符、或 locale 有死模板 ⇒ exit 1。
//
// ⚠️ 只读：不写任何文件（只 readFileSync / import）。

import { getAllEngines } from '../../src/core/engines/registry.ts';
import '../../src/engines/index.ts';
import { extractDecisionLines } from '../../src/lib/decision-support.ts';
import { TIP_PROBES } from '../_decision-tip-probe.ts';
import { readLocale } from '../_decision-support-fixture.ts';

const STRICT = process.argv.includes('--strict');
const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
const engines = getAllEngines() as any[];

let problems = 0;
for (const [slug, probes] of Object.entries(TIP_PROBES)) {
  const engine = engines.find((e) => e.slug === slug);
  if (!engine) { console.error('✗ 找不到引擎 ' + slug); problems++; continue; }
  console.log('=== ' + slug + ' ===');
  const seen = new Set<string>();
  for (const probe of probes) {
    const results = engine.generate(probe.inputs);
    const joined = (Array.isArray(results) ? results : [results]).join('\n');
    const lines = extractDecisionLines(joined);
    const code = lines.tipCode || ('LEGACY:' + lines.tip.slice(0, 40));
    const hit = code === probe.code;
    if (!hit) problems++;
    console.log(
      '  ' + (hit ? '✓' : '✗') + ' ' + probe.code +
      ' → 实测 ' + code +
      ' | params ' + JSON.stringify(lines.tipParams),
    );
    seen.add(code);
  }
  console.log('  探针覆盖 ' + seen.size + ' 个码');
}

const templateKeys = Object.keys(locales.zh).filter((k) => k.startsWith('decision_tip.'));
for (const key of templateKeys) {
  const code = key.slice('decision_tip.'.length);
  const owner = Object.values(TIP_PROBES).some((ps) => ps.some((p) => p.code === code));
  if (!owner) { console.error('✗ 死模板 ' + key); problems++; }
}
console.log('\n[decision-tip-probe] locale 模板 ' + templateKeys.length + ' 条 | ' + (problems === 0 ? 'PASSED' : 'problems=' + problems));
if (problems > 0) process.exit(1);
if (STRICT) console.log('[decision-tip-probe] --strict 通过');