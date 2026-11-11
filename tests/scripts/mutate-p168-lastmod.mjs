#!/usr/bin/env node
// P168 B3-6 -- sitemap lastmod 真实性守卫的变异台子
//
// 为什么需要它：断言存在 != 断言承重。B3-6 的根因（映射表 key 形态与调用形态不一致
// => 100% 回退构建时刻）正是那种存在性断言看不见的缺陷 => 必须用变异证明新守卫能杀掉它。
//
// 纪律（沿用 B3-4 / B3-5 的台子）:
//   · 快照 -> 每轮开头还原 -> 收尾无条件还原 + sha256 逐字节校验；
//   · 变异必须真的改变文件（否则判 INVALID，不算 SURVIVED）；
//   · 基线必须先绿，否则拒绝开跑；
//   · 每条变异只许红一条断言（核对失败断言的名字，不只是有东西红了）；
//   · 快照闸门：磁盘快照自愈会回滚上次跑台子之后的正常改动
//     => 发现旧快照且没有 P168_ALLOW_RECOVER => 拒绝开跑并打印指引；
//   · 写操作带重试（Windows 上刚被写过的文件会被系统索引短暂独占）。
//
// 本台子会临时改写源文件（src/integrations/last-modified.mjs）与构建产物
// （dist/sitemap-0.xml）=> 不要接进 pnpm check。
//
// 本台子故意不重建产物 —— 重建后再看哪条断言红会把源码层与产物层两条判据混在一起
// => 一条变异红两条 => 失去隔离意义。
// => 产物层变异（M1）直接改 dist/sitemap-0.xml；源码层变异（M2~M4）不重建。
//
// 跑法（从仓库根跑）:
//   node tests/scripts/mutate-p168-lastmod.mjs
//   node tests/scripts/mutate-p168-lastmod.mjs M2,M3
//   node tests/scripts/mutate-p168-lastmod.mjs --negative-control

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TMP = join(ROOT, 'tmp');
const SNAPSHOT = join(TMP, 'lastmod-harness-backup.json');
const GUARD_REL = 'tests/sitemap-lastmod-accuracy-guard.test.ts';
const GUARD = join(ROOT, GUARD_REL);
const SRC_REL = 'src/integrations/last-modified.mjs';
const SRC = join(ROOT, SRC_REL);
const ART_REL = 'dist/sitemap-0.xml';
const ART = join(ROOT, ART_REL);

// 还原目标清单：台子会临时改写的每一个文件都必须在这里
const TARGETS = [SRC_REL, ART_REL, 'package.json'];

const NEGATIVE = process.argv.includes('--negative-control');
const onlyArg = process.argv.find((a) => /^M\d+(,M\d+)*$/.test(a)) || '';
const only = onlyArg.split(',').filter(Boolean);

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

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
  } catch {
    return null;
  }
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
    console.log('     $env:P168_ALLOW_RECOVER=1; node tests/scripts/mutate-p168-lastmod.mjs');
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
    console.log('⛔ 目标文件不存在：' + rel + ' ⇒ 先跑 pnpm build');
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

// ⚠️ 纯字符串替换（不用 String.replace 的替换串语义 —— $ 会被解释）
function replaceOnce(src, needle, repl) {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error('锚点未命中：' + needle.slice(0, 70));
  return src.slice(0, i) + repl + src.slice(i + needle.length);
}

// 跑守卫（build-dep ⇒ 必须带 RUN_BUILD_TESTS=1 才会激活产物层断言）
function runGuard() {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', GUARD_REL],
      {
        encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, RUN_BUILD_TESTS: '1' },
      },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') };
  }
}

function failedAssertions(out) {
  const names = [];
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^not ok \d+ - (.+)$/);
    if (m) names.push(m[1].trim());
  }
  return names;
}

// 从守卫源码里解析断言名（不手抄 ⇒ 守卫改名时台子不会误判）
function guardAssertionNames() {
  const src = readFileSync(GUARD, 'utf8');
  const names = [];
  const re = /test\(\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) names.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  return names;
}

const ASSERTIONS = guardAssertionNames();
const MARK = { artifact: '产物层', address: '寻址层', truth: '真相源', build: '构建环境' };

function assertName(marker) {
  const hit = ASSERTIONS.filter((n) => n.indexOf(marker) >= 0);
  if (hit.length !== 1) {
    console.log('守卫里找不到唯一的断言 ' + marker + '（找到 ' + hit.length + ' 条）⇒ 台子停止。');
    for (const n of ASSERTIONS) console.log('  · ' + n);
    process.exit(1);
  }
  return hit[0];
}


// ============================================================
// 变异定义
// ============================================================

function applyM1() {
  const xml = readFileSync(ART, 'utf8');
  const buildTime = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const after = xml.replace(/<lastmod>[^<]*<\/lastmod>/g, '<lastmod>' + buildTime + '</lastmod>');
  if (after === xml) throw new Error('sitemap 里没找到 <lastmod> 锚点');
  writeWithRetry(ART, after);
}

function applyM2() {
  const src = readFileSync(SRC, 'utf8');
  const after = replaceOnce(src, "  n = n.replace(/\\/index\\.html$/, '');\n", '');
  writeWithRetry(SRC, after);
}

function applyM3() {
  const src = readFileSync(SRC, 'utf8');
  const after = replaceOnce(src, "  n = n.replace(/^\\/?dist\\//, '/');\n", '');
  writeWithRetry(SRC, after);
}

function applyM4() {
  const src = readFileSync(SRC, 'utf8');
  const needle = "    const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', relPath], {\n      cwd: _repoRoot,\n      encoding: 'utf8',\n      stdio: ['ignore', 'pipe', 'ignore'],\n    }).trim();";
  const repl = "    const out = String(Math.floor(fs.statSync(path.join(_repoRoot, relPath)).mtimeMs / 1000));";
  writeWithRetry(SRC, replaceOnce(src, needle, repl));
}

const MUTATIONS = [
  {
    id: 'M1',
    desc: '产物层：把 sitemap 里所有 lastmod 改成构建时刻（= 复现 B3-6 的线上症状）',
    layer: 'artifact',
    expect: MARK.artifact,
    apply: applyM1,
  },
  {
    id: 'M2',
    desc: '源码层：去掉「去 /index.html 后缀」的归一化（形态不匹配的半边）',
    layer: 'source',
    expect: MARK.address,
    apply: applyM2,
  },
  {
    id: 'M3',
    desc: '源码层：去掉「去 dist/ 前缀」的归一化（形态不匹配的另一半）',
    layer: 'source',
    expect: MARK.address,
    apply: applyM3,
  },
  {
    id: 'M4',
    desc: '源码层：真相源从 git 内容变更时间退回文件 mtime（mtime 会被 checkout/构建刷新）',
    layer: 'source',
    expect: MARK.truth,
    apply: applyM4,
  },
  {
    id: 'M5',
    desc: '构建层：把 ensure-git-history.mjs 从 build 脚本里摘掉（CF 浅克隆 ⇒ lastmod 全部退化成部署时间）',
    layer: 'build',
    expect: MARK.build,
    apply: () => {
      const p = join(ROOT, 'package.json');
      const src = readFileSync(p, 'utf8');
      const after = replaceOnce(src, 'node scripts/ensure-git-history.mjs && ', '');
      try {
        JSON.parse(after.replace(/^\uFEFF/, ''));
      } catch (err) {
        throw new Error('变异后 JSON 非法: ' + (err && err.message));
      }
      writeWithRetry(p, after);
    },
  },
];

// 负对照：故意让两条断言同时红 ⇒ 台子必须报 RED-BUT-NOT-ISOLATED
// ⇒ 该模式自身 exit 0 = 证明成立；exit 1 = 隔离判定不可信。
const COMBO = {
  id: 'NEG',
  desc: '负对照：同时施加 M2（形态）+ M4（真相源）⇒ 两条断言必须同时红',
  layer: 'source',
  expect: null,
  apply: () => { applyM2(); applyM4(); },
};

function passedAssertions(out) {
  let n = 0;
  for (const line of out.split(/\r?\n/)) {
    if (/^ok \d+ - /.test(line)) n++;
  }
  return n;
}

// ============================================================
// 基线：必须先绿
// ============================================================
console.log('-- 基线：守卫必须全绿 --');
const base = runGuard();
const baseFailed = failedAssertions(base.out);
const basePassed = passedAssertions(base.out);
if (baseFailed.length > 0 || basePassed !== ASSERTIONS.length) {
  console.log('⛔ 基线不绿（红 ' + baseFailed.length + ' 条 / 过 ' + basePassed + ' 条，应为 ' + ASSERTIONS.length + '）⇒ 台子拒绝开跑。');
  for (const n of baseFailed) console.log('  · ' + n);
  if (!baseFailed.length) console.log(base.out.slice(-2000));
  restoreAll();
  try { rmSync(SNAPSHOT, { force: true }); } catch { /* ignore */ }
  process.exit(1);
}
console.log('✔ 基线绿（' + ASSERTIONS.length + ' 条断言全过）');

const list = NEGATIVE ? [COMBO] : MUTATIONS.filter((m) => !only.length || only.includes(m.id));
const results = [];

for (const m of list) {
  restoreAll();
  const beforeSrc = readFileSync(SRC);
  const beforeArt = readFileSync(ART);
  const beforePkg = readFileSync(join(ROOT, 'package.json'));
  try {
    m.apply();
  } catch (e) {
    console.log('\n' + m.id + ' INVALID — 变异没有真的改变文件：' + (e && e.message));
    results.push({ id: m.id, status: 'INVALID' });
    continue;
  }
  const changed = !readFileSync(SRC).equals(beforeSrc) || !readFileSync(ART).equals(beforeArt) ||
    !readFileSync(join(ROOT, 'package.json')).equals(beforePkg);
  if (!changed) {
    console.log('\n' + m.id + ' INVALID — 文件内容没变');
    results.push({ id: m.id, status: 'INVALID' });
    continue;
  }
  const r = runGuard();
  const failed = failedAssertions(r.out);
  const passed = passedAssertions(r.out);
  if (passed + failed.length !== ASSERTIONS.length) {
    console.log('\n' + m.id + ' INVALID — 守卫没跑完（过 ' + passed + ' / 红 ' + failed.length + '）⇒ 测不出东西');
    results.push({ id: m.id, status: 'INVALID' });
    continue;
  }
  let status;
  if (failed.length === 0) status = 'SURVIVED';
  else if (m.expect === null) status = failed.length >= 2 ? 'RED-BUT-NOT-ISOLATED' : 'RED-BUT-NOT-ISOLATED';
  else {
    const expectedName = assertName(m.expect);
    status = failed.length === 1 && failed[0] === expectedName ? 'KILLED' : 'RED-BUT-NOT-ISOLATED';
    console.log('   期望只红: ' + expectedName);
  }
  results.push({ id: m.id, status, failed });
  console.log('\n' + m.id + ' ' + m.desc);
  console.log('   结果: ' + status + '（红了 ' + failed.length + ' 条断言）');
  for (const n of failed) console.log('     · ' + n);
}

// 收尾：无条件还原 + sha256 逐字节校验
const failedRestore = restoreAll();
const bad = verifyAll();
try { rmSync(SNAPSHOT, { force: true }); } catch { /* ignore */ }
console.log('\n-- 收尾 --');
console.log(failedRestore.length ? '⛔ 还原失败: ' + failedRestore.join(', ') : '✔ 全部还原');
console.log(bad.length ? '⛔ sha256 校验不一致: ' + bad.join(', ') : '✔ sha256 逐字节一致');

console.log('\n汇总: ' + results.map((r) => r.id + ' ' + r.status).join(' | '));

if (NEGATIVE) {
  const detected = results.length > 0 && results.every((r) => r.status === 'RED-BUT-NOT-ISOLATED');
  if (detected) {
    console.log('✔ 负对照成立：两条断言同时红被台子检出（RED-BUT-NOT-ISOLATED）');
    if (bad.length || failedRestore.length) process.exit(1);
    process.exit(0);
  }
  console.log('⛔ 负对照失败：台子没有检出多红 ⇒ 隔离判定不可信');
  process.exit(1);
}

const notKilled = results.filter((r) => r.status !== 'KILLED');
if (notKilled.length || bad.length || failedRestore.length) {
  console.log('⛔ 台子未全绿 ⇒ 有变异存活，或还原不干净');
  process.exit(1);
}
console.log('✔ ' + results.length + '/' + results.length + ' KILLED');
process.exit(0);
