#!/usr/bin/env node
// P168 B3-8 —— locale 落库工具：把提取器算出的新键写进 en.json / zh.json。
//
// ⭐ 为什么要单独一个工具（而不是手改 JSON）
//   · **插入位置**：`calc_out.*` 在 locale 里是**连续且内部按字典序**的一段 ⇒ 新键必须
//     插进这一段的正确位置 ⇒ 手改容易插错位置 / 破坏顺序。
//   · **emoji 规则**：zh 的值 = 「en 值的前导 emoji」+ 「中文正文」
//     ⇒ 中文正文里**不需要手打 emoji**（手打 emoji 有被代理转义弄坏码位的风险）。
//   · **占位符守恒**：zh 与 en 的 `{param}` 集合必须**完全一致** ⇒ 少一个就丢运行时数值。
//   · 落库后仍然能重跑提取器，得到 0 个新键 ⇒ 幂等。
//
// 用法（从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-merge.ts <zh.json> [--dry]
//   zh.json 形如 { "calc_out.x.row.y": "中文正文（不带前导 emoji）", ... }

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractAll } from './p168-locale-extract.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PREFIX = 'calc_out.';

/** 取 en 值的前导 emoji（含变体选择符/ZWJ 序列）+ 其后的空白 */
function leadingEmoji(s: string): { emoji: string; rest: string } {
  const m = /^([\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{2B50}\u{274C}\u{2705}\u{26A0}]+)\s*/u.exec(s);
  if (!m) return { emoji: '', rest: s };
  return { emoji: m[1], rest: s.slice(m[0].length) };
}

function placeholders(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\{(\w+)\}/g)) out.push(m[1]);
  return out.sort();
}

function readLocale(lang: string): Record<string, string> {
  return JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', lang + '.json'), 'utf8'));
}

function serialize(obj: Record<string, string>): string {
  return JSON.stringify(obj, null, 2) + '\n';
}

/** 把新键插进 calc_out.* 连续段（保持段内字典序，其余键的相对顺序不变） */
function insertCalcOut(obj: Record<string, string>, additions: Record<string, string>): Record<string, string> {
  const keys = Object.keys(obj);
  const idx = keys.map((k, i) => (k.startsWith(PREFIX) ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) throw new Error('locale 里没有 calc_out.* 段');
  const first = idx[0];
  const last = idx[idx.length - 1];
  if (last - first + 1 !== idx.length) throw new Error('calc_out.* 段不连续 ⇒ 插入策略要重做');
  const blockKeys = keys.slice(first, last + 1);
  const blockVals = new Map<string, string>();
  for (const k of blockKeys) blockVals.set(k, obj[k]);
  // ⚠️ **只插入、不重排既有键**（段内有 2 处 B3-7 留下的逆序 ⇒ 整段排序会产生无关 diff）
  for (const nk of Object.keys(additions).sort()) {
    let pos = blockKeys.length;
    for (let i = 0; i < blockKeys.length; i++) { if (blockKeys[i] > nk) { pos = i; break; } }
    blockKeys.splice(pos, 0, nk);
    blockVals.set(nk, additions[nk]);
  }
  const out: Record<string, string> = {};
  for (let i = 0; i < first; i++) out[keys[i]] = obj[keys[i]];
  for (const k of blockKeys) out[k] = blockVals.get(k)!;
  for (let i = last + 1; i < keys.length; i++) out[keys[i]] = obj[keys[i]];
  return out;
}

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const zhFile = args.filter((a) => !a.startsWith('--'))[0];
if (!zhFile) { console.error('用法：p168-locale-merge.ts <zh.json> [--dry]'); process.exit(2); }

const r = extractAll([]);
const en = readLocale('en');
const zh = readLocale('zh');
const translations: Record<string, string> = JSON.parse(readFileSync(resolve(zhFile), 'utf8'));

const enAdd: Record<string, string> = {};
const zhAdd: Record<string, string> = {};
const missing: string[] = [];
const badPlaceholder: string[] = [];
const extra: string[] = [];
for (const code of Object.keys(translations)) {
  if (!(code in r.newKeys)) { extra.push(code); continue; }
}
for (const code of Object.keys(r.newKeys)) {
  const enVal = r.newKeys[code];
  const t = translations[code];
  if (t === undefined) { missing.push(code); continue; }
  const pe = placeholders(enVal);
  const pt = placeholders(t);
  if (pe.join(',') !== pt.join(',')) { badPlaceholder.push(code + '  en=' + pe.join(',') + '  zh=' + pt.join(',')); continue; }
  const le = leadingEmoji(enVal);
  enAdd[code] = enVal;
  if (le.emoji) {
    // ⚠️ en 有**前导** emoji ⇒ 合并工具会补上它 ⇒ 中文正文若也以 emoji 开头 ⇒ 渲染出两个
    //    ⇒ 先把中文正文里的那个剥掉（en 里 emoji 在句中的不受影响：leadingEmoji 只看开头）
    const m = /^[\u{1F300}-\u{1FAFF}\u{2300}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}\u{2B50}\u{274C}\u{2705}\u{26A0}]+\s*/u.exec(t);
    const body = m ? t.slice(m[0].length) : t;
    zhAdd[code] = le.emoji + ' ' + body;
  } else {
    zhAdd[code] = t;
  }
}
console.log('待落库 ' + Object.keys(r.newKeys).length + ' 键 · 缺中文 ' + missing.length + ' · 占位符不一致 ' + badPlaceholder.length + ' · 中文文件里多余的键 ' + extra.length);
if (missing.length) { console.log('—— 缺中文翻译：'); for (const m of missing) console.log('  ' + m + '  <= ' + r.newKeys[m]); }
if (badPlaceholder.length) { console.log('—— 占位符不一致：'); for (const b of badPlaceholder) console.log('  ' + b); }
if (extra.length) { console.log('—— 中文文件里多余（本次不需要落库）：'); for (const e of extra) console.log('  ' + e); }
if (missing.length || badPlaceholder.length) { console.log('NOT YET'); process.exit(1); }
if (dry) { console.log('（--dry：不写盘）'); console.log('ALL OK'); process.exit(0); }
const enNext = insertCalcOut(en, enAdd);
const zhNext = insertCalcOut(zh, zhAdd);
writeFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'en.json'), serialize(enNext), 'utf8');
writeFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'zh.json'), serialize(zhNext), 'utf8');
console.log('已落库 ' + Object.keys(enAdd).length + ' 键（en.json + zh.json）');
console.log('ALL OK');