// P168 B3-4 —— 把 fragment 里的建议码 / 探针输入**同步进三份守卫清单**。
//
// 为什么要有这个工具：建议码守恒那条断言比的是四个视角
//   （源码 == 运行时探针 == 登记清单 == locale 模板），
//   而「登记清单」有**三份**（探针输入、守卫的 TIP_CASES、引擎文件映射）。
//   手工同步 15 个工具 × 3 份 ⇒ 必然漂 ⇒ 守恒断言会红成「工具坏了」而不是「清单没更新」。
// ⇒ 让 fragment 成为**唯一真相源**，本脚本负责把三份清单机械同步过来（幂等）。
//
// 跑法：node tests/scripts/b3-4-sync-decision-guard.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const FRAG_DIR = join(ROOT, 'tests', 'fixtures', 'b3-4');

function findObjectEnd(text, startIdx) {
  let depth = 0;
  let q = null;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '\\') { i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** 'key': [ ... ] 形态（TIP_PROBES / ENGINE_FILES） */
function parseKeyedArray(objText) {
  const out = new Map();
  const re = /'([^']+)'\s*:\s*\[/g;
  let m;
  while ((m = re.exec(objText))) {
    const bracket = objText.indexOf('[', m.index);
    const end = findObjectEnd(objText, bracket);
    if (end < 0) continue;
    out.set(m[1], objText.slice(bracket, end + 1));
    re.lastIndex = end;
  }
  return out;
}

/** { slug: 'x', codes: [...] } 形态（TIP_CASES） */
function parseSlugCases(arrText) {
  const out = new Map();
  const re = /\{\s*slug:\s*'([^']+)'\s*,\s*codes:\s*(\[[^\]]*\])\s*\}/g;
  let m;
  while ((m = re.exec(arrText))) out.set(m[1], m[2]);
  return out;
}

/** 'key': '字符串' 形态（ENGINE_FILES） */
function parseKeyedStrings(objText) {
  const out = new Map();
  const re = /'([^']+)'\s*:\s*('(?:[^'\\]|\\.)*')/g;
  let m;
  while ((m = re.exec(objText))) out.set(m[1], m[2]);
  return out;
}

/** 纯字符串数组形态（TARGET_CALCS） */
function parseStringArray(arrText) {
  const out = [];
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(arrText))) out.push(m[1]);
  return out;
}

function blockRange(text, header) {
  const h = text.indexOf(header);
  if (h < 0) throw new Error('找不到锚点：' + header);
  const open = text.indexOf('[', h + header.length - 1);
  const end = findObjectEnd(text, open);
  if (end < 0) throw new Error('锚点后的块没闭合：' + header);
  return { start: open, end: end };
}

function objectRange(text, header) {
  const h = text.indexOf(header);
  if (h < 0) throw new Error('找不到锚点：' + header);
  const open = text.indexOf('{', h + header.length - 1);
  const end = findObjectEnd(text, open);
  if (end < 0) throw new Error('锚点后的块没闭合：' + header);
  return { start: open, end: end };
}

function q(s) { return JSON.stringify(s).replace(/"/g, "'"); }

function engineFileOf(slug) {
  const stack = [join(ROOT, 'src', 'engines')];
  while (stack.length) {
    const cur = stack.pop();
    for (const name of readdirSync(cur)) {
      const p = join(cur, name);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { stack.push(p); continue; }
      if (!name.endsWith('.ts')) continue;
      const t = readFileSync(p, 'utf8');
      if (t.indexOf("slug: '" + slug + "'") >= 0) return relative(ROOT, p).split('\\').join('/');
    }
  }
  return null;
}

const fragFiles = existsSync(FRAG_DIR)
  ? readdirSync(FRAG_DIR).filter((f) => /^frag-.+\.json$/.test(f)).sort()
  : [];
if (!fragFiles.length) { console.log('❌ tests/fixtures/b3-4 下没有 fragment'); process.exit(1); }
const frags = fragFiles.map((f) => JSON.parse(readFileSync(join(FRAG_DIR, f), 'utf8')));

// ---------- ① tests/_decision-tip-probe.ts ----------
const probePath = join(ROOT, 'tests', '_decision-tip-probe.ts');
let probeText = readFileSync(probePath, 'utf8');
const PH = 'export const TIP_PROBES: Record<string, TipProbe[]> = ';
const pr = objectRange(probeText, PH);
const probes = parseKeyedArray(probeText.slice(pr.start, pr.end + 1));
for (const fr of frags) {
  const lines = (fr.probes ?? []).map((p) =>
    '    { code: ' + q(p.code) + ', inputs: ' + JSON.stringify(p.inputs) + ' },'
  );
  probes.set(fr.slug, '[\n' + lines.join('\n') + '\n  ]');
}
const probeBody = '\n' + [...probes.entries()]
  .map(([slug, arr]) => '  ' + q(slug) + ': ' + arr)
  .join(',\n') + '\n';
probeText = probeText.slice(0, pr.start) + '{' + probeBody + '}' + probeText.slice(pr.end + 1);

// ---------- ② tests/decision-tip-i18n-guard.test.ts ----------
const guardPath = join(ROOT, 'tests', 'decision-tip-i18n-guard.test.ts');
let guardText = readFileSync(guardPath, 'utf8');
const CH = 'const TIP_CASES: { slug: string; codes: string[] }[] = ';
const cr = blockRange(guardText, CH);
const cases = parseSlugCases(guardText.slice(cr.start, cr.end + 1));
const fileMap = new Map();
for (const fr of frags) {
  const codes = (fr.tips ?? []).map((t) => t.code);
  cases.set(fr.slug, JSON.stringify(codes));
  const f = engineFileOf(fr.slug);
  if (!f) { console.log('❌ 找不到 ' + fr.slug + ' 的引擎文件'); process.exit(1); }
  fileMap.set(fr.slug, f);
}
const casesBody = '\n' + [...cases.entries()]
  .map(([slug, codes]) => '  { slug: ' + q(slug) + ', codes: ' + codes + ' },')
  .join('\n') + '\n';
guardText = guardText.slice(0, cr.start) + '[' + casesBody + ']' + guardText.slice(cr.end + 1);

const FH = 'const ENGINE_FILES: Record<string, string> = ';
const fr2 = objectRange(guardText, FH);
const fileEntries = parseKeyedStrings(guardText.slice(fr2.start, fr2.end + 1));
for (const [slug, f] of fileMap) fileEntries.set(slug, JSON.stringify(f));
const filesBody = '\n' + [...fileEntries.entries()]
  .map(([slug, v]) => '  ' + q(slug) + ': ' + v)
  .join(',\n') + '\n';
guardText = guardText.slice(0, fr2.start) + '{' + filesBody + '}' + guardText.slice(fr2.end + 1);

// ---------- ③ tests/decision-layer-coverage-guard.test.ts ----------
const covPath = join(ROOT, 'tests', 'decision-layer-coverage-guard.test.ts');
let covText = readFileSync(covPath, 'utf8');
const TH = 'const TARGET_CALCS = ';
const tr = blockRange(covText, TH);
const calcs = parseStringArray(covText.slice(tr.start, tr.end + 1));
for (const f of fileMap.values()) if (!calcs.includes(f)) calcs.push(f);
const calcBody = '\n'
+ '  // P168 B3-1：迁出决策支持的工具也进清单（判据是「引擎输出 ∪ 页面 i18n 键」，\n'
+ '  //   所以迁出后仍然必须**齐** —— 迁走不等于可以少一层）\n'
+ '  // P168 B3-4：再迁 15 个工具（本批）\n'
+ calcs.map((f) => '  ' + q(f) + ',').join('\n') + '\n';
covText = covText.slice(0, tr.start) + '[' + calcBody + ']' + covText.slice(tr.end + 1);
covText = covText.replace(/assert\.equal\(TARGET_CALCS\.length, \d+\);/, 'assert.equal(TARGET_CALCS.length, ' + calcs.length + ');');

const outs = [[probePath, probeText], [guardPath, guardText], [covPath, covText]];
for (const [p, t] of outs) {
  const clean = t.replace(/\r\n/g, '\n');
  console.log((DRY ? '[dry] ' : '') + relative(ROOT, p) + '（' + clean.length + ' 字符）');
  if (!DRY) writeFileSync(p, clean, 'utf8');
}
console.log('');
console.log((DRY ? '[dry] ' : '') + '同步 ' + frags.length + ' 个工具；探针 ' + probes.size + ' 个 / 案件 ' + cases.size + ' 个 / L5 清单 ' + calcs.length + ' 个');
