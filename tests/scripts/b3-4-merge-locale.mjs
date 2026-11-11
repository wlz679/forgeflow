// P168 B3-4 —— Wave B：fragment 校验 + locale 落盘（单一写者）
// 跑法：node tests/scripts/b3-4-merge-locale.mjs [--check]
//   --check 只校验不写盘；默认先校验，全绿才写盘。
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FRAG_DIR = join(ROOT, 'tests', 'fixtures', 'b3-4');
const CHECK_ONLY = process.argv.includes('--check');
const LAYERS = ['decision_goal', 'decision_recommendation', 'decision_constraint', 'decision_next_tool'];

function infoUnits(text) {
  let latin = 0, cjk = 0;
  for (const m of String(text).matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'\u2019\-]*/g)) {
    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/.test(m[0])) cjk += m[0].length;
    else latin += 1;
  }
  return latin + cjk / 2;
}
const FLOORS = { decision_goal: 40, decision_recommendation: 70, decision_constraint: 60, decision_next_tool: 40 };
const MIN_ZH_TO_EN = 0.7;

const problems = [];
const fragFiles = existsSync(FRAG_DIR)
  ? readdirSync(FRAG_DIR).filter((f) => /^frag-.+\.json$/.test(f)).sort()
  : [];
console.log('fragment 文件 = ' + fragFiles.length + ' 个');
if (fragFiles.length === 0) { console.log('❌ 没有 fragment（worker 还没产出？）'); process.exit(1); }
const frags = [];
for (const f of fragFiles) {
  try { frags.push(JSON.parse(readFileSync(join(FRAG_DIR, f), 'utf8'))); }
  catch (e) { problems.push(f + '：JSON 解析失败：' + e.message); }
}
const readLocale = (lang) => JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales', lang + '.json'), 'utf8'));
const en = readLocale('en');
const zh = readLocale('zh');

const allCodes = new Map();
for (const fr of frags) {
  const slug = fr.slug ?? '(无 slug)';
  if (!fr.layers) { problems.push(slug + '：缺 layers'); continue; }
  for (const k of LAYERS) {
    const v = fr.layers[k];
    if (!v || typeof v.en !== 'string' || typeof v.zh !== 'string' || !v.en.trim() || !v.zh.trim()) {
      problems.push(slug + '：层 ' + k + ' 缺 en/zh'); continue;
    }
    if (v.en.includes('**') || v.zh.includes('**')) problems.push(slug + '/' + k + '：含 markdown 粗体 **（locale 值是纯文本）');
    if (v.en.includes('{{') || v.zh.includes('{{')) problems.push(slug + '/' + k + '：含未解析 token');
    const enU = infoUnits(v.en), zhU = infoUnits(v.zh);
    if (enU < FLOORS[k]) problems.push(slug + '/' + k + '：en 信息量 ' + enU.toFixed(1) + ' < 下限 ' + FLOORS[k]);
    if (zhU < FLOORS[k]) problems.push(slug + '/' + k + '：zh 信息量 ' + zhU.toFixed(1) + ' < 下限 ' + FLOORS[k]);
    if (enU > 0 && zhU < enU * MIN_ZH_TO_EN) problems.push(slug + '/' + k + '：zh 只有 en 的 ' + (zhU / enU).toFixed(2) + '（下限 ' + MIN_ZH_TO_EN + '）');
    for (const m of v.en.matchAll(/\[([^\]]+)\]/g)) {
      const ref = m[1];
      const ok = Object.keys(en).some((k) => k.endsWith('.shortTitle') && en[k] === ref);
      if (!ok) problems.push(slug + '/' + k + '：en 跨工具引用 [' + ref + '] 不是任何工具的 shortTitle');
    }
    for (const m of v.zh.matchAll(/\[([^\]]+)\]/g)) {
      const ref = m[1];
      const ok = Object.keys(zh).some((k) => k.endsWith('.shortTitle') && zh[k] === ref);
      if (!ok) problems.push(slug + '/' + k + '：zh 跨工具引用 [' + ref + '] 不是任何工具的 shortTitle');
    }
  }
  const vals = LAYERS.map((k) => fr.layers[k]?.en ?? '');
  if (new Set(vals).size !== vals.length) problems.push(slug + '：四层的 en 文本有重复');
  if (!Array.isArray(fr.tips) || fr.tips.length === 0) { problems.push(slug + '：没有 tips'); continue; }
  for (const t of fr.tips) {
    if (!t.code || !t.en || !t.zh) { problems.push(slug + '：有 tip 缺 code/en/zh'); continue; }
    if (allCodes.has(t.code)) problems.push('建议码重复：' + t.code + '（' + allCodes.get(t.code) + ' 与 ' + slug + '）');
    else allCodes.set(t.code, slug);
    const tmplPh = new Set([...(t.en + ' ' + t.zh).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]));
    const sent = new Set(Object.keys(t.params ?? {}));
    for (const p of tmplPh) if (!sent.has(p)) problems.push(slug + '/' + t.code + '：模板占位符 {' + p + '} 没在 params 里声明');
    for (const p of sent) if (!tmplPh.has(p)) problems.push(slug + '/' + t.code + '：params 里的 ' + p + ' 在模板里没用到');
  }
}
console.log('');
if (problems.length) {
  console.log('❌ 校验未通过（' + problems.length + ' 项）：');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('✅ 校验通过：' + frags.length + ' 个工具 · ' + allCodes.size + ' 个建议码 · ' + (frags.length * 4) + ' 个四层键');
if (CHECK_ONLY) { console.log('（--check：未写盘）'); process.exit(0); }

const esc = (s) => JSON.stringify(s);
function q(s) { return s.replace(/[.*+?^$()|[\]{}]/g, '\\$&'); }
function insertAfterKey(text, anchorKey, newLines) {
  const re = new RegExp('^(\\s*)"' + q(anchorKey) + '"\\s*:.*$', 'm');
  const m = re.exec(text);
  if (!m) throw new Error('锚点未找到：' + anchorKey);
  const indent = m[1];
  const insert = newLines.map((l) => indent + l).join('\n');
  const at = m.index + m[0].length;
  return text.slice(0, at) + '\n' + insert + text.slice(at);
}

for (const lang of ['en', 'zh']) {
  const p = join(ROOT, 'src/i18n/locales', lang + '.json');
  let text = readFileSync(p, 'utf8');
  const loc = lang === 'en' ? en : zh;
  const tipLines = [];
  for (const fr of frags) {
    const anchor = 'tools.' + fr.slug + '.shortTitle';
    if (!(anchor in loc)) { problems.push(lang + '：找不到锚点 ' + anchor); continue; }
    if (('tools.' + fr.slug + '.decision_goal') in loc) { problems.push(lang + '：' + fr.slug + ' 的 decision_goal 已存在（重复插入？）'); continue; }
    const lines = LAYERS.map((k) => '"tools.' + fr.slug + '.' + k + '": ' + esc(fr.layers[k][lang]) + ',');
    text = insertAfterKey(text, anchor, lines);
    for (const t of fr.tips) tipLines.push('"decision_tip.' + t.code + '": ' + esc(t[lang]) + ',');
  }
  if (tipLines.length) text = insertAfterKey(text, 'decision.next_step_pending', tipLines);
  // ⭐ 先解析再落盘（JSON 非法就不写，别把文件写坏）
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (e) { problems.push(lang + '：插入后 JSON 非法（未写盘）：' + e.message); continue; }
  for (const fr of frags) {
    for (const k of LAYERS) {
      const key = 'tools.' + fr.slug + '.' + k;
      if (!(key in parsed)) problems.push(lang + '：写入后缺 ' + key);
      else if (parsed[key] !== fr.layers[k][lang]) problems.push(lang + '：写入后 ' + key + ' 与 fragment 不一致');
    }
    for (const t of fr.tips) {
      const key = 'decision_tip.' + t.code;
      if (!(key in parsed)) problems.push(lang + '：写入后缺 ' + key);
      else if (parsed[key] !== t[lang]) problems.push(lang + '：写入后 ' + key + ' 与 fragment 不一致');
    }
  }
  if (problems.length) continue;
  writeFileSync(p, text, 'utf8');
  console.log('  ' + lang + '.json 已写入：' + (frags.length * 4) + ' 个四层键 + ' + tipLines.length + ' 个建议码模板');
}
if (problems.length) {
  console.log('');
  console.log('❌ 落盘校验失败：');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('');
console.log('✅ 落盘完成并复核通过');
