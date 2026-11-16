#!/usr/bin/env node
// P168 B3-7 —— 「注入子集裁剪」+ 「zh 章节文案回退」的**可复算体检工具**。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-injection-subset-audit.ts
//
// 它量三件事：
//   ① 每个试点引擎注入的模板子集 == 引擎声明的 code 集合（不多不少）
//   ② 裁剪省了多少字节（注入表 + 整页）
//   ③ zh 章节标题是否仍与「旧 zh 文案」逐字一致
//
// ⭐⭐ 为什么要单独写一个工具（2026-11-13 实测踩坑）
//   数字写在 CHANGELOG 里 = 「作者说过」，别人 checkout 后没法复算
//   ⇒ 验收数字必须是「工具的输出」而不是「文档里的声明」。
//
// ⭐ 退回口径（不硬编任何字段）
//   「旧 zh 文案」 = 把英文标题行拿去跑过旧机制（headerKeys 逐个 split/join 替换）。
//   但只有「旧键覆盖**整个**标题」时才算「专属翻译」
//   （否则是前缀巧合，例如 ai_cost.section.break_even 命中「⚤️ Break-Even Growth」）
//   ⇒ 旧 zh 本来就是英文 / 半英文的标题 ⇒ 保留完整中文（不退回半英文）。

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import enRaw from '../../src/i18n/locales/en.json';
import zhRaw from '../../src/i18n/locales/zh.json';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { extractEngineTokenCodes } from '../../src/lib/calc-output-i18n.ts';
import { calcOutputTemplates, toolAlias } from '../../src/lib/calc-output-templates.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const EN = enRaw as Record<string, string>;
const ZH = zhRaw as Record<string, string>;

const PILOT = [
  'solopreneur-mrr-calculator',
  'solopreneur-rent-vs-buy-calculator',
  'solopreneur-brrrr-calculator',
  'solopreneur-project-profitability-calculator',
  'solopreneur-coupon-attribution-calculator',
  'solopreneur-saas-valuation-calculator',
  'solopreneur-acv-calculator',
  'solopreneur-funnel-step-calculator',
  'solopreneur-activation-rate-calculator',
  'solopreneur-stickiness-calculator',
];

/** slug → 引擎源文件（扫 src/engines/**，不硬编码路径表） */
function engineFileBySlug(): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.isFile() || !e.name.endsWith('.ts') || e.name === 'index.ts') continue;
      const src = readFileSync(full, 'utf8');
      const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(src);
      if (m) map.set(m[1] || m[2], full);
    }
  };
  walk(resolve(ROOT, 'src', 'engines'));
  return map;
}

/** 去掉标题行开头的 emoji（用来判旧键是否覆盖**整个**标题） */
const core = (s: string): string => (/^[^\x00-\x7F]/.test(s) ? s.slice(s.indexOf(' ') + 1) : s);

const astro = readFileSync(resolve(ROOT, 'src/pages/[lang]/[slug].astro'), 'utf8');
const s0 = astro.indexOf('const headerKeys = [');
const s1 = astro.indexOf('];', s0);
const headerKeys = Array.from(astro.slice(s0, s1).matchAll(/'([a-z0-9_.]+)'/g)).map((m) => m[1]);
const pairs = headerKeys
  .map((k) => ({ k, e: EN[k], z: ZH[k] }))
  .filter((p) => typeof p.e === 'string' && typeof p.z === 'string' && p.e !== p.z);

/** 旧机制的翻译：逐个旧键把英文拿来替换 */
const oldRender = (fb: string): string => {
  let out = fb;
  for (const p of pairs) if (out.includes(p.e)) out = out.split(p.e).join(p.z);
  return out;
};

/** 是否存在「专属」旧翻译（覆盖整个标题，而不是前缀巧合） */
const hasDedicatedOld = (fb: string): boolean =>
  pairs.some((p) => fb.includes(p.e) && core(p.e) === core(fb));

const engines = getAllEngines() as any[];
const files = engineFileBySlug();
const totalCalcOut = Object.keys(EN).filter((k) => k.startsWith('calc_out.')).length;
const problems: string[] = [];

console.log('== ① ② 注入子集裁剪（全仓 calc_out.* = ' + totalCalcOut + ' 条）==');
console.log('alias'.padEnd(24) + 'codes'.padStart(6) + 'trim(en)'.padStart(10) + 'full(en)'.padStart(10) + 'page(en)'.padStart(10) + 'saved'.padStart(9));

for (const slug of PILOT) {
  const engine = engines.find((x) => x.slug === slug);
  if (!engine) { problems.push(slug + '：引擎没注册'); continue; }
  const alias = toolAlias(slug);
  const codes = extractEngineTokenCodes(engine);
  if (codes.length === 0) { problems.push(slug + '：提取到 0 个 code'); continue; }
  const trimmed = calcOutputTemplates('en', alias, codes);
  const full = calcOutputTemplates('en', alias, Object.keys(EN).filter((k) => k.startsWith('calc_out.')));
  const trimmedBytes = JSON.stringify(trimmed).length;
  const fullBytes = JSON.stringify(full).length;
  for (const c of codes) {
    if (typeof EN[c] !== 'string') problems.push(slug + '：' + c + ' 在 en.json 缺值');
    if (typeof ZH[c] !== 'string') problems.push(slug + '：' + c + ' 在 zh.json 缺值');
  }
  const got = Object.keys(trimmed).sort();
  const want = [...codes].sort();
  const missing = want.filter((c) => !got.includes(c));
  const extra = got.filter((c) => !want.includes(c));
  if (missing.length) problems.push(slug + '：注入表少了 ' + missing.join(', '));
  if (extra.length) problems.push(slug + '：注入表多了 ' + extra.join(', '));
  const pageEn = resolve(ROOT, 'dist', 'en', slug, 'index.html');
  const pageBytes = existsSync(pageEn) ? statSync(pageEn).size : 0;
  console.log(
    alias.padEnd(24) +
    String(codes.length).padStart(6) +
    String(trimmedBytes).padStart(10) +
    String(fullBytes).padStart(10) +
    String(pageBytes).padStart(10) +
    String(fullBytes - trimmedBytes).padStart(9),
  );
}

console.log('');
console.log('== ③ zh 章节标题 vs 旧 zh 文案 ==');
let same = 0;
let diff = 0;
let noOld = 0;
for (const slug of PILOT) {
  const file = files.get(slug);
  if (!file) { problems.push(slug + '：找不到引擎源文件'); continue; }
  const alias = toolAlias(slug);
  const src = readFileSync(file, 'utf8');
  const codes = new Map<string, string>();
  for (const m of src.matchAll(/calc_out\.section\.([a-z0-9_]+)\|([^|\n]*)\|/g)) codes.set(m[1], m[2]);
  for (const [code, fb] of codes) {
    const key = 'calc_out.section.' + code;
    const cur = ZH[key];
    if (typeof cur !== 'string') { problems.push(alias + '.' + code + '：zh.json 缺这个键'); continue; }
    if (!hasDedicatedOld(fb)) { noOld++; console.log('  NO-OLD ' + alias + '.' + code + '（旧 zh 本来就是英文→保留完整中文）'); continue; }
    const expected = oldRender(fb);
    if (expected === cur) { same++; continue; }
    diff++;
    problems.push(alias + '.' + code + '：zh 值与旧文案不一致 —— 应为 ' + JSON.stringify(expected) + ' 实为 ' + JSON.stringify(cur));
  }
}
console.log('  一致 ' + same + ' / 不一致 ' + diff + ' / 旧本来就是英文 ' + noOld);
console.log('');
console.log(problems.length === 0 ? 'ALL OK' : 'PROBLEMS: ' + problems.length);
for (const p of problems) console.log('  - ' + p);
process.exitCode = problems.length === 0 ? 0 : 1;
