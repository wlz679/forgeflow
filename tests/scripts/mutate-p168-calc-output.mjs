#!/usr/bin/env node
// P168 B3-7 —— 变异台子：验证 B3-7 的四条 source-only 判据**真的能挡住对应的缺陷**。
//
// ⭐ 纪律（沿用 tests/scripts/mutate-p168-lastmod.mjs 的现成范式）：
//   · 快照 → 每轮开头还原 → 收尾**无条件**还原 + **sha256 逐字节校验**；
//   · 变异必须**真的改变文件**（否则判 INVALID，不算 SURVIVED）；
//   · **基线必须先绿**，否则拒绝开跑；
//   · 每条变异只许红**一条断言** ⇒ 核对**失败断言的名字**，不只是「有东西红了」；
//   · 快照闸门：发现旧快照且没有 P168_ALLOW_RECOVER ⇒ 拒绝开跑；
//   · 写操作带重试（Windows 上刚被写过的文件会被系统索引短暂独占）；
//   · **不重建产物** ⇒ 源码层变异只跑 source-only 断言（产物层 G4 不参与）。
//
// 用法：
//   node tests/scripts/mutate-p168-calc-output.mjs
//   node tests/scripts/mutate-p168-calc-output.mjs P1,P3
//   node tests/scripts/mutate-p168-calc-output.mjs --negative-control
//
// ⚠️ 前置条件：locale 里已经有 calc_out.* 键、且引擎已 token 化
//   （那是 Task 16 之后的状态）⇒ 否则基线是红的 ⇒ 台子会拒绝开跑（这是对的）。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TMP = join(ROOT, 'tmp');
const SNAPSHOT = join(TMP, 'calc-output-harness-backup.json');
const GUARDS = [
  'tests/calc-output-i18n-guard.test.ts',
  'tests/calc-output-parity-guard.test.ts',
  'tests/calc-output-render-parity-guard.test.ts',
];
const ZH_REL = 'src/i18n/locales/zh.json';
const EN_REL = 'src/i18n/locales/en.json';
const ENGINE_REL = 'src/engines/saas/mrr-calculator.ts';
const GUARD_REL = 'tests/calc-output-i18n-guard.test.ts';
const LIB_REL = 'src/lib/calc-output-i18n.ts';
const TARGETS = [ZH_REL, EN_REL, ENGINE_REL, GUARD_REL, LIB_REL];

const NEGATIVE = process.argv.includes('--negative-control');
const only = (process.argv.find((a) => /^P\d+(,P\d+)*$/.test(a)) || '').split(',').filter(Boolean);

function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function writeWithRetry(p, data) {
  let lastErr;
  for (let i = 0; i < 25; i++) {
    try {
      if (typeof data === 'string') writeFileSync(p, data, 'utf8');
      else writeFileSync(p, data);
      return;
    } catch (e) {
      lastErr = e;
      const code = e && e.code;
      if (code !== 'UV_UNKNOWN' && code !== 'EBUSY' && code !== 'EPERM' && code !== 'EACCES') throw e;
      sleepSync(40);
    }
  }
  throw lastErr;
}
function readSnapshot() {
  if (!existsSync(SNAPSHOT)) return null;
  try {
    const obj = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    return obj;
  } catch { return null; }
}
function writeSnapshot(map) {
  const obj = {};
  for (const [rel, buf] of map) obj[rel] = buf.toString('base64');
  writeWithRetry(SNAPSHOT, JSON.stringify(obj));
}
function recoverFromDiskBackup() {
  if (!existsSync(SNAPSHOT)) return;
  if (!process.env.P168_ALLOW_RECOVER) {
    console.log('⛔ 发现上次的台子快照，但没有 P168_ALLOW_RECOVER ⇒ 拒绝自动恢复。');
    console.log('   原因：快照是「上次跑台子那一刻」的内容，自动恢复会把「上次跑台子之后的正常改动」一起回滚掉 ⇒ 必须由人拍板。');
    console.log('   ⇒ 先 git status 核对工作区；确认后再跑：');
    console.log('     $env:P168_ALLOW_RECOVER=1; node tests/scripts/mutate-p168-calc-output.mjs');
    console.log('   或确认无需恢复后删除该快照文件（台子成功收尾会自己删）。');
    console.log('     ' + SNAPSHOT);
    process.exit(1);
  }
  const snap = readSnapshot();
  if (!snap) { console.log('⚠️ 快照存在但内容不可读 ⇒ 跳过恢复（不猜内容）。'); return; }
  const entries = Object.entries(snap);
  if (entries.length === 0) { console.log('ℹ 快照是空的（明确无需恢复）⇒ 继续跑。'); return; }
  let restored = 0;
  for (const [rel, b64] of entries) {
    if (!TARGETS.includes(rel)) continue;
    try {
      const buf = Buffer.from(b64, 'base64');
      if (!readFileSync(join(ROOT, rel)).equals(buf)) { writeWithRetry(join(ROOT, rel), buf); restored++; }
    } catch { /* 逐文件容错 */ }
  }
  console.log(restored > 0
    ? '⚠️ 发现上次未完成的台子快照 ⇒ 已恢复 ' + restored + ' 个文件。'
    : 'ℹ 快照与当前磁盘内容一致 ⇒ 无需恢复。');
}
recoverFromDiskBackup();

const backups = new Map();
for (const rel of TARGETS) {
  if (!existsSync(join(ROOT, rel))) {
    console.log('⛔ 目标文件不存在：' + rel);
    process.exit(1);
  }
  backups.set(rel, readFileSync(join(ROOT, rel)));
}
mkdirSync(TMP, { recursive: true });
writeSnapshot(backups);

function restoreAll() {
  const failed = [];
  for (const [rel, buf] of backups) {
    try { writeWithRetry(join(ROOT, rel), buf); }
    catch (e) { failed.push(rel + ' (' + (e && e.code ? e.code : 'unknown') + ')'); }
  }
  return failed;
}
function verifyAll() {
  const bad = [];
  for (const [rel, buf] of backups) {
    try { if (sha256(readFileSync(join(ROOT, rel))) !== sha256(buf)) bad.push(rel); }
    catch { bad.push(rel + ' (读不出来)'); }
  }
  return bad;
}
function replaceOnce(src, needle, repl) {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error('锚点未命中：' + needle.slice(0, 70));
  return src.slice(0, i) + repl + src.slice(i + needle.length);
}
function runGuard() {
  let out = '';
  for (const rel of GUARDS) {
    try {
      out += execFileSync(
        'node',
        ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', rel],
        { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (e) {
      out += String(e.stdout ?? '') + String(e.stderr ?? '');
    }
  }
  return out;
}
function failedAssertions(out) {
  const names = [];
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^not ok \d+ - (.+)$/);
    if (m) names.push(m[1].trim());
  }
  return names;
}
function guardAssertionNames() {
  const names = [];
  for (const rel of GUARDS) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const re = /test\(\s*'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(src)) !== null) names.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
  return names;
}
const ASSERTIONS = guardAssertionNames();
function assertName(marker) {
  const hit = ASSERTIONS.filter((n) => n.indexOf(marker) >= 0);
  if (hit.length !== 1) {
    console.log('守卫里找不到唯一的断言 ' + marker + '（找到 ' + hit.length + ' 条）⇒ 台子停止。');
    for (const n of ASSERTIONS) console.log('  · ' + n);
    process.exit(1);
  }
  return hit[0];
}

// ── 工具：从 locale 文件里找一个 calc_out.label.* 键 ────────────────────
function findLabelKeyInZh() {
  const src = readFileSync(join(ROOT, ZH_REL), 'utf8');
  const re = /^  "(calc_out\.label\.[^"]+)": "(.*)",?$/m;
  const m = re.exec(src);
  if (!m) throw new Error('zh.json 里找不到 calc_out.label.* 键（locale 还没落库？）');
  return { key: m[1], value: m[2] };
}

// ── P1：把某个 zh 模板改短 ⇒ 中文信息量 < 英文 × 0.7 ⇒ G1 红 ──────────
// ⚠️ 2026-11-13 实测修正：原实现挑的是**第一个** calc_out.label.* 键（en = Activation，只有 1 个词）
//   ⇒ 把 zh 改成 1 个拉丁词后比值仍是 1.0 ⇒ **G1 抓不到**（变异存活）。
//   ⇒ 修法：挑 **en 最长**的那个键，并把 zh 改成**单个汉字**（0.5 单位）⇒ 比值必然 < 0.7。
function applyP1() {
  const NL = String.fromCharCode(10);
  const zh = readFileSync(join(ROOT, ZH_REL), 'utf8');
  const en = readFileSync(join(ROOT, EN_REL), 'utf8');
  let best = null;
  for (const line of en.split(NL)) {
    if (!line.startsWith('  ' + String.fromCharCode(34) + 'calc_out.')) continue;
    const q = line.indexOf(String.fromCharCode(34) + ': ' + String.fromCharCode(34));
    if (q < 0) continue;
    const key = line.slice(3, q);
    const value = line.slice(q + 4);
    if (!best || value.length > best.len) best = { key, len: value.length };
  }
  if (!best) throw new Error('P1：en.json 里找不到 calc_out.* 键');
  const target = '  ' + String.fromCharCode(34) + best.key + String.fromCharCode(34) + ': ' + String.fromCharCode(34);
  let zline = '';
  for (const line of zh.split(NL)) { if (line.startsWith(target)) { zline = line; break; } }
  if (!zline) throw new Error('P1：zh.json 里找不到 ' + best.key);
  const short = '字';
  const hasComma = zline.endsWith(',');
  const newLine = target + short + String.fromCharCode(34) + (hasComma ? ',' : '');
  const after = replaceOnce(zh, zline, newLine);
  writeWithRetry(join(ROOT, ZH_REL), after);
  console.log('    P1：' + best.key + ' 的 zh 改成单个汉字（en 值长度 ' + best.len + '）');
}

// ── P2：删一个 locale 模板键（zh 侧）⇒ 引擎声明了但 locale 没有 ⇒ G2 红 ──
function applyP2() {
  const src = readFileSync(join(ROOT, ZH_REL), 'utf8');
  const { key, value } = findLabelKeyInZh();
  const needle = '  "' + key + '": "' + value + '"' + ',\n';
  if (src.indexOf(needle) < 0) throw new Error('P2 锚点未命中（该键可能已是最后一行，没有尾逗号）');
  const after = replaceOnce(src, needle, '');
  writeWithRetry(join(ROOT, ZH_REL), after);
  console.log('    P2：删掉 zh.json 的 ' + key);
}

// ── P3：只改客户端 customFn 里的一个 token（换成另一个**已存在**的 code）──
// ⚠️ 2026-11-13 实测修正：原实现用 replaceOnce(src, ...) 在**整文件**里换首个匹配
//   ⇒ 首个匹配可能在**服务端** ⇒ 服务端+客户端一起改 ⇒ 红了 3 条（G3+G6+G8）而不是 1 条。
//   ⇒ 修法：只在**客户端区间内**替换。
// ⚠️ 本变异**合法地**红 2 条：G3（code 集合变了）+ G6（两侧输出不再一致）⇒ 期望集合写 2 条。
function applyP3() {
  const BS = String.fromCharCode(92);
  const src = readFileSync(join(ROOT, ENGINE_REL), 'utf8');
  const fnAt = src.indexOf('const customFn');
  const engineAt = src.indexOf('const engine', fnAt);
  if (fnAt < 0 || engineAt < 0) throw new Error('找不到 customFn 区间');
  const client = src.slice(fnAt, engineAt);
  const re = new RegExp('calc_out' + BS + '.[a-z0-9_]+(?:' + BS + '.[a-z0-9_]+)+(?![a-z0-9_.])', 'g');
  const codes = [...client.matchAll(re)].map((m) => m[0]);
  const uniq = [...new Set(codes)];
  if (uniq.length < 2) throw new Error('客户端区里找不到两个不同的 token code');
  let victim = null, repl = null;
  for (const c of uniq) {
    const n = codes.filter((x) => x === c).length;
    if (n !== 1) continue;
    const other = uniq.find((x) => x !== c);
    if (other) { victim = c; repl = other; break; }
  }
  if (!victim) throw new Error('客户端区里没有「只出现一次」的 token code');
  const idx = client.indexOf(victim);
  const nextClient = client.slice(0, idx) + repl + client.slice(idx + victim.length);
  const next = src.slice(0, fnAt) + nextClient + src.slice(engineAt);
  writeWithRetry(join(ROOT, ENGINE_REL), next);
  console.log('    P3：客户端 customFn 里 ' + victim + ' → ' + repl + '（只改客户端）');
}

// ── P4：服务端 + 客户端**两处**同时换成 locale 里没有的新 code ⇒ G2 红 ───
// ⚠️ 2026-11-13 实测修正 1：原实现用 while (after.indexOf(victim) >= 0) 循环替换，
//   而 NEW = victim + '_mutated' **仍然包含 victim** ⇒ indexOf 永远命中 ⇒ **死循环 + 字符串无限增长**。
//   ⇒ 修法：替换后**跳过已处理的那一段**，而不是从头再找。
// ⚠️ 2026-11-13 实测修正 2：原来的 code 正则 [a-z0-9_.]+ 会把**尾点**也算进去
//   ⇒ 抽到残缺 code「calc_out.label.」⇒ 一次替换 109 处 ⇒ 红了 4 条（G2+G2c+G3+G8）。
//   ⇒ 修法：code 必须是**完整**的 ≥2 段（每段非空）。
function applyP4() {
  const BS = String.fromCharCode(92);
  const src = readFileSync(join(ROOT, ENGINE_REL), 'utf8');
  const fnAt = src.indexOf('const customFn');
  const engineAt = src.indexOf('const engine', fnAt);
  if (fnAt < 0 || engineAt < 0) throw new Error('找不到 customFn 区间');
  const server = src.slice(0, fnAt);
  const re = new RegExp('calc_out' + BS + '.[a-z0-9_]+(?:' + BS + '.[a-z0-9_]+)+(?![a-z0-9_.])', 'g');
  const codes = [...new Set([...server.matchAll(re)].map((m) => m[0]))];
  if (!codes.length) throw new Error('服务端区里找不到 token code');
  const victim = codes[0];
  const NEW = victim + '_mutated';
  let out = '';
  let rest = src;
  let n = 0;
  for (;;) {
    const i = rest.indexOf(victim);
    if (i < 0) { out += rest; break; }
    out += rest.slice(0, i) + NEW;
    rest = rest.slice(i + victim.length);
    n++;
    if (n > 5000) throw new Error('P4：替换次数异常，已中止');
  }
  writeWithRetry(join(ROOT, ENGINE_REL), out);
  console.log('    P4：' + victim + ' → ' + NEW + '（服务端 + 客户端共 ' + n + ' 处，两份同步）');
}

// ── P5：把某个 zh 模板改成与 en **逐字相同**（等于没翻译）⇒ G1 红 ────────
function applyP5() {
  const zh = readFileSync(join(ROOT, ZH_REL), 'utf8');
  const en = readFileSync(join(ROOT, EN_REL), 'utf8');
  const { key } = findLabelKeyInZh();
  const enRe = new RegExp('^  "' + key.replace(/[.*+?^\()|[\]\\]/g, '\\$&') + '": "(.*)",?$', 'm');
  const em = enRe.exec(en);
  if (!em) throw new Error('en.json 里找不到 ' + key);
  const enVal = em[1];
  const zhRe = new RegExp('^  "' + key.replace(/[.*+?^\()|[\]\\]/g, '\\$&') + '": "(.*)",?$', 'm');
  const zm = zhRe.exec(zh);
  const after = replaceOnce(zh, '  "' + key + '": "' + zm[1] + '"', '  "' + key + '": "' + enVal + '"');
  writeWithRetry(join(ROOT, ZH_REL), after);
  console.log('    P5：' + key + ' 的 zh 改成与 en 逐字相同');
}

// ── P6：引擎里出现**缺收尾终止符 |** 的 token 字面量 ⇒ G2c 红 ────────────
// ⚠️ 2026-11-13 实测修正：**原实现的前提在新格式下已失效** ——
//   · 新格式的兜底以收尾 | 收住 ⇒ 去掉 | 只会让那个 token **没有兜底段**（整段保留裸 token）
//     ⇒ 但**所有守卫都跑 generate()、不读 staticExamples** ⇒ 改 staticExamples 对谁都不可见 ⇒ 变异存活。
//   · 而 makeToken/tk 构造器**永远自动补收尾 |** ⇒ 构造器写法也造不出这个缺陷。
//   ⇒ 真正能造出该缺陷的场景只有一个：**有人手写 token 字面量时忘了收尾 |**。
//   ⇒ 于是本变异改成：在引擎源码里**手写**一个缺收尾 | 的字面量。
//   ⚠️ 探针**必须复用两侧都已声明的 code** ⇒ 否则 G2（locale 没这个键）与 G3（两侧集合不等）会跟着红 ⇒ 失去隔离。
function applyP6() {
  const NL = String.fromCharCode(10);
  const Q = String.fromCharCode(39);
  const BS = String.fromCharCode(92);
  const src = readFileSync(join(ROOT, ENGINE_REL), 'utf8');
  const fnAt = src.indexOf('const customFn');
  const engineAt = src.indexOf('const engine', fnAt);
  if (fnAt < 0 || engineAt < 0) throw new Error('找不到 customFn 区间');
  const re = new RegExp('calc_out' + BS + '.[a-z0-9_]+(?:' + BS + '.[a-z0-9_]+)+(?![a-z0-9_.])', 'g');
  const clientCodes = new Set([...src.slice(fnAt, engineAt).matchAll(re)].map((m) => m[0]));
  const serverCodes = new Set([...src.slice(0, fnAt).matchAll(re)].map((m) => m[0]));
  let code = null;
  for (const c of clientCodes) { if (serverCodes.has(c)) { code = c; break; } }
  if (!code) throw new Error('P6：找不到两侧都声明的 code');
  const probe = 'const __P168_MUTATION_PROBE = ' + Q + '$' + code + '|probe' + Q + ';';
  const after = src.replace(/\s*$/, '') + NL + NL + probe + NL;
  writeWithRetry(join(ROOT, ENGINE_REL), after);
  console.log('    P6：在引擎里手写一个缺收尾终止符的 token 字面量（' + code + '）');
}

// ── P7：只改客户端 customFn 里的一处**文案** ⇒ 服务端↔客户端漂移 ⇒ G6 红 ──
// ⚠️ 2026-11-13 实测修正：原实现挑的是客户端区里**第一个 4 字母以上的英文词**
//   ⇒ 挑到了 JS 关键字「const」⇒ 改完 customFn **语法就坏了** ⇒ 守卫直接崩掉
//   ⇒ 报出来的是「not ok <文件路径>」而不是断言名 ⇒ 判成 RED-BUT-NOT-ISOLATED。
//   ⇒ 修法：只在**字符串字面量内部**找词（且排除 code 串与 JS 关键字）。
function applyP7() {
  const Q = String.fromCharCode(39);
  const DQ = String.fromCharCode(34);
  const src = readFileSync(join(ROOT, ENGINE_REL), 'utf8');
  const fnAt = src.indexOf('const customFn');
  const engineAt = src.indexOf('const engine', fnAt);
  if (fnAt < 0 || engineAt < 0) throw new Error('找不到 customFn 区间');
  const client = src.slice(fnAt, engineAt);
  const KEYWORDS = new Set(['const','let','var','function','return','if','else','for','while','true','false','null','undefined','Math','Number','String','JSON','Object','Array','new','this','typeof','length','push','slice','join','map','test','exec','indexOf','toString','replace','split','toFixed','toLocaleString']);
  const litRes = [
    new RegExp(Q + '([^' + Q + ']*)' + Q, 'g'),
    new RegExp(DQ + '([^' + DQ + ']*)' + DQ, 'g'),
  ];
  let chosen = null;
  for (const litRe of litRes) {
    for (const m of client.matchAll(litRe)) {
      const body = m[1] !== undefined ? m[1] : m[2];
      if (!body) continue;
      if (body.includes('calc_out')) continue;
      for (const w of body.match(/[A-Za-z]{4,}/g) || []) {
        if (KEYWORDS.has(w)) continue;
        const n = (body.match(new RegExp(w, 'g')) || []).length;
        if (n !== 1) continue;
        chosen = { word: w, at: m.index + m[0].indexOf(w) };
        break;
      }
      if (chosen) break;
    }
    if (chosen) break;
  }
  if (!chosen) throw new Error('P7：客户端区里找不到字符串字面量中的唯一英文词');
  const last = chosen.word.charCodeAt(chosen.word.length - 1);
  const mutated = chosen.word.slice(0, -1) + String.fromCharCode(last === 122 ? 121 : last + 1);
  const nextClient = client.slice(0, chosen.at) + mutated + client.slice(chosen.at + chosen.word.length);
  const next = src.slice(0, fnAt) + nextClient + src.slice(engineAt);
  writeWithRetry(join(ROOT, ENGINE_REL), next);
  console.log('    P7：客户端 customFn 字符串里的 ' + chosen.word + ' → ' + mutated + '（只改客户端）');
}

// ── P8：把 G3 的「服务端区」切分改回旧口径（customFn 声明之前）⇒ G3 红 ──
// ⚠️ 这是 2026-11-13 实测到的**真漏洞**：旧口径把 engine 对象里的 generate() 排除在外
//   ⇒ 服务端 token 集合恒为空 ⇒ 「空集 == 空集」⇒ G3 对绝大多数引擎**真空绿**。
//   ⇒ 本变异把旧口径装回去 ⇒ G3 必须立刻红（否则这条判据又被改回恒真式）。
function applyP8() {
  const src = readFileSync(join(ROOT, GUARD_REL), 'utf8');
  const needle = 'src.slice(0, fnAt) + src.slice(engineAt)';
  if (src.indexOf(needle) < 0) throw new Error('P8 锚点未命中（服务端区切分的源码形状变了？）');
  const after = replaceOnce(src, needle, 'src.slice(0, fnAt)');
  writeWithRetry(join(ROOT, GUARD_REL), after);
  console.log('    P8：服务端区切分改回「customFn 声明之前」（旧口径）');
}

// ── P9：删掉中文 tip 标记 ⇒ G11 红 ──
// ⚠️ 2026-11-13 实测的坑：zh 页 translateCalcOutput 把「💡 Tip:」改写成「💡 提示:」
//   ⇒ 过滤器只认英文标记 ⇒ zh 卡片多出一条 en 没有的 tip 行（实测 16 页），
//   且 SSR 与客户端 beautify 的行结构不一致。
//   ⇒ 本变异把中文标记删掉 ⇒ G11 必须立刻红。
function applyP9() {
  const SQ = String.fromCharCode(39);
  const src = readFileSync(join(ROOT, LIB_REL), 'utf8');
  const needle = SQ + '💡 提示:' + SQ;
  if (src.indexOf(needle) < 0) throw new Error('P9 锚点未命中（tip 标记清单的形状变了？）');
  const after = replaceOnce(src, needle, SQ + '💡 提示X:' + SQ);
  writeWithRetry(join(ROOT, LIB_REL), after);
  console.log('    P9：删掉中文 tip 标记（💡 提示:）⇒ 过滤器在 zh 上失配');
}

const MUTATIONS = [
  { id: 'P1', expect: 'G1：', apply: applyP1, note: 'zh 模板改短 ⇒ 信息量不足' },
  { id: 'P2', expect: 'G2：', apply: applyP2, note: '删 locale 键 ⇒ 模板表不守恒' },
  { id: 'P3', expect: ['G3：', 'G6：'], apply: applyP3, note: '客户端 token 漂移 ⇒ 两份实现不一致（G3 + G6 合法地同时红）' },
  { id: 'P4', expect: ['G2：', 'G8：'], apply: applyP4, note: '两份实现同步改成未登记的 code ⇒ G2（模板表不守恒）+ G8（locale 缺 code ⇒ 模板路径退化 ⇒ 防假绿断言）' },
  { id: 'P5', expect: 'G1：', apply: applyP5, note: 'zh 与 en 逐字相同 ⇒ 没翻' },
  { id: 'P6', expect: 'G2c：', apply: applyP6, note: 'token 字面量去掉收尾终止符 | ⇒ 兜底吃到行尾' },
  { id: 'P7', expect: 'G6：', apply: applyP7, note: '只改客户端文案 ⇒ 服务端↔客户端漂移' },
  { id: 'P8', expect: 'G3：', apply: applyP8, note: '服务端区切回旧口径 ⇒ G3 真空绿' },
  { id: 'P9', expect: 'G11：', apply: applyP9, note: '删掉中文 tip 标记 ⇒ zh 过滤器失配（G11）' },
];

// ── 基线必须先绿 ─────────────────────────────────────────────────────────
console.log('▶ 基线：跑 ' + GUARDS.join(', '));
const baseOut = runGuard();
const baseFails = failedAssertions(baseOut);
if (baseFails.length) {
  console.log('⛔ 基线不绿（' + baseFails.length + ' 条红）⇒ 台子拒绝开跑。');
  console.log('   红的是：');
  for (const f of baseFails) console.log('     · ' + f);
  console.log('   ⇒ 基线绿是台子的前提（变异台子量的是「缺陷能不能被抓住」，不是「现在有没有缺陷」）。');
  restoreAll();
  try { (await import('node:fs')).unlinkSync(SNAPSHOT); } catch {}
  process.exit(1);
}
console.log('  ✔ 基线全绿');

const list = only.length ? MUTATIONS.filter((m) => only.includes(m.id)) : MUTATIONS;
if (!list.length) {
  console.log('⛔ 没有匹配的变异（可用：' + MUTATIONS.map((m) => m.id).join(',') + '）');
  restoreAll();
  try { (await import('node:fs')).unlinkSync(SNAPSHOT); } catch {}
  process.exit(1);
}

const results = [];
for (const m of list) {
  console.log('\n▶ ' + m.id + '（' + m.note + '）');
  restoreAll();
  const before = new Map();
  for (const rel of TARGETS) before.set(rel, sha256(readFileSync(join(ROOT, rel))));
  let verdict = 'UNKNOWN';
  try {
    m.apply();
  } catch (e) {
    console.log('  ⚠️ 变异没能施加：' + (e && e.message ? e.message : e));
    verdict = 'INVALID';
  }
  if (verdict !== 'INVALID') {
    let changed = 0;
    for (const rel of TARGETS) if (sha256(readFileSync(join(ROOT, rel))) !== before.get(rel)) changed++;
    if (changed === 0) {
      console.log('  ⚠️ 变异没有真的改变文件 ⇒ INVALID');
      verdict = 'INVALID';
    } else {
      console.log('  · 改变了 ' + changed + ' 个文件');
      const out = runGuard();
      const fails = failedAssertions(out);
      // ⚠️ 2026-11-13 实测修正：一条变异**合法地**可能同时违反多条不变量
      //   （例：只改客户端的 token code ⇒ G3「code 集合变了」+ G6「两侧输出不再一致」）。
      //   ⇒ expect 允许写成**数组**；判定仍然是「红的条数与集合**完全一致**」
      //   （不是「只要红了一条就算」，也不是「红得越少越好」）。
      const wantList = (Array.isArray(m.expect) ? m.expect : [m.expect]).map(assertName);
      const wantSorted = wantList.slice().sort();
      const gotSorted = fails.slice().sort();
      const exact = gotSorted.length === wantSorted.length && gotSorted.every((f, i) => f === wantSorted[i]);
      if (fails.length === 0) {
        console.log('  ❌ 变异存活（没有任何断言红）⇒ SURVIVED');
        verdict = 'SURVIVED';
      } else if (exact) {
        console.log('  ✔ 被抓住，且精确红 ' + fails.length + ' 条：' + fails.join(' | '));
        verdict = 'KILLED';
      } else {
        console.log('  ❌ 红了 ' + fails.length + ' 条（期望恰好 ' + wantList.length + ' 条：' + wantList.join(' | ') + '）：');
        for (const f of fails) console.log('     · ' + f);
        verdict = 'RED-BUT-NOT-ISOLATED';
      }
    }
  }
  results.push({ id: m.id, verdict });
  restoreAll();
}

// ── 负对照 ───────────────────────────────────────────────────────────────
if (NEGATIVE) {
  console.log('\n▶ 负对照：不做任何改动，守卫必须全绿');
  restoreAll();
  const out = runGuard();
  const fails = failedAssertions(out);
  if (fails.length === 0) {
    console.log('  ✔ 负对照成立（不改任何东西 ⇒ 全绿）');
  } else {
    console.log('  ❌ 负对照失败：' + fails.join(' | '));
    results.push({ id: 'NEG', verdict: 'NEG-FAILED' });
  }
}

// ── 收尾：无条件还原 + 逐字节校验 ───────────────────────────────────────
const failedRestore = restoreAll();
const bad = verifyAll();
try { (await import('node:fs')).unlinkSync(SNAPSHOT); } catch {}

console.log('\n══ 台子结果 ══');
for (const r of results) console.log('  ' + r.id + '：' + r.verdict);
if (failedRestore.length) console.log('⚠️ 还原失败：' + failedRestore.join(', '));
if (bad.length) console.log('⚠️ sha256 校验不一致：' + bad.join(', '));
const survived = results.filter((r) => r.verdict !== 'KILLED');
if (survived.length || failedRestore.length || bad.length) {
  console.log('\n❌ 台子未通过（' + survived.length + ' 条变异未被精确杀死）');
  process.exit(1);
}
console.log('\n✔ 全部变异被精确杀死，且文件已逐字节还原');
