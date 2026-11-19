#!/usr/bin/env node
// P168 B3-12 —— engine-input-declaration-guard 的变异台子（4 条变异，每条只红一条断言）
//
// 为什么需要它
// ------------
// 「断言存在」不等于「断言承重」。本守卫有 4 条断言：
//   T1 覆盖      每个引擎都定位得到计算函数（防「判据失效 ⇒ 真空绿」）
//   T2 正向      声明的输入都必须被读取（否则表单上是「改了没反应」的假字段）
//   T3 反向      读取的输入都必须被声明（否则用户给不了 ⇒ 引擎恒读 undefined）
//   T4 白名单自证 informational 白名单必须仍需要，且引擎源码确有 informational 措辞
// ⇒ 台子把源文件**真的改坏**，看守卫是否红，并要求**每条变异只红一条断言**
//   （核对失败断言的**名字**，不只是「有东西红了」）。
//
// 纪律（沿用 P166/P167/P168 的台子）
// ----------------------------------------
//   · 快照 → 每轮开头还原 → 收尾**无条件**还原 + sha256 逐字节校验；
//   · 变异必须真的改变文件（否则判 INVALID，不算 SURVIVED）；
//   · 基线必须先绿，否则拒绝开跑；
//   · ⭐ **快照闸门**：磁盘快照自愈会**回滚「上次跑台子之后的正常改动」**
//      ⇒ 发现旧快照且没有 P168_ALLOW_RECOVER ⇒ **拒绝开跑并打印指引**；
//   · ⭐ 写操作带**重试**（Windows 上刚被写过的文件会被系统索引短暂独占）。
//
// ⚠️ 本台子会**临时改写仓库里的源文件** ⇒ 不要接进 pnpm check。
//
// 跑法（从仓库根跑）：
//   node tests/scripts/mutate-p168-engine-input-declaration.mjs
//   node tests/scripts/mutate-p168-engine-input-declaration.mjs M1,M3   # 只跑指定变异
//   node tests/scripts/mutate-p168-engine-input-declaration.mjs --negative-control

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TMP = join(ROOT, 'tmp');
const SNAPSHOT = join(TMP, 'engine-input-declaration-harness-backup.json');
const GUARD_REL = 'tests/engine-input-declaration-guard.test.ts';
const GUARD = join(ROOT, GUARD_REL);

/** 台子会临时改写的**每一个**文件都必须在这里 —— 收尾的 sha256 逐字节校验
 *  是「这些文件一个都没被留下改动」的凭据。 */
const TARGETS = [
  'src/engines/real-estate/brrrr-calculator.ts',
  'src/engines/saas/mrr-calculator.ts',
  'src/engines/legal-compliance/gdpr-fine-calculator.ts',
  'src/engines/knowledge/kb-coverage-rate-calculator.ts'
];

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

/** ⭐⭐ 崩溃安全 + 快照闸门 */
function recoverFromDiskBackup() {
  if (!existsSync(SNAPSHOT)) return;
  if (process.env.P168_ALLOW_RECOVER !== '1') {
    console.log('⛔ 发现上次未跑完的台子快照：' + SNAPSHOT);
    console.log('   快照里存的是「上次跑台子那一刻」的内容 ⇒ 自动恢复会把之后的正常改动一起回滚。');
    console.log('   确认要恢复请设 P168_ALLOW_RECOVER=1；确认不需要恢复请**删掉该文件**。');
    process.exit(1);
  }
  const snap = readSnapshot();
  let restored = 0;
  if (snap) {
    for (const rel of Object.keys(snap)) {
      const p = join(ROOT, rel);
      if (!existsSync(p)) continue;
      const buf = Buffer.from(snap[rel], 'base64');
      if (sha256(readFileSync(p)) === sha256(buf)) continue;
      try { writeWithRetry(p, buf); restored++; } catch { }
    }
  }
  console.log(restored > 0 ? '⚠️ 已从快照恢复 ' + restored + ' 个文件。' : 'ℹ 快照与当前磁盘内容一致。');
}

recoverFromDiskBackup();

const backups = new Map();
for (const rel of TARGETS) backups.set(rel, readFileSync(join(ROOT, rel)));
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

function patchTarget(rel, transform) {
  const p = join(ROOT, rel);
  const before = readFileSync(p, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error('锚点未命中（文件内容没变）: ' + rel);
  writeWithRetry(p, after);
}

function runGuard() {
  try {
    const out = execFileSync('node', ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', GUARD_REL],
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
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

/** 从守卫源码里解析断言名（**不手抄** —— 守卫改名时台子不会误判） */
function guardAssertionNames() {
  const src = readFileSync(GUARD, 'utf8');
  const names = [];
  const re = /test\(\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) names.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  return names;
}

const ASSERTIONS = guardAssertionNames();

function assertionName(marker) {
  const hit = ASSERTIONS.filter((n) => n.indexOf(marker) >= 0);
  if (hit.length !== 1) {
    console.log('守卫里找不到唯一的断言 ' + marker + '（找到 ' + hit.length + ' 条）⇒ 台子停止。');
    for (const n of ASSERTIONS) console.log('  · ' + n);
    process.exit(1);
  }
  return hit[0];
}

const MUTATIONS = [
  {
    id: 'M1',
    desc: 'brrrr 引擎 inputs[] 加回「假字段」sellingCostsPct（声明了但引擎从不读）',
    marker: 'T2',
    apply: () => {
      patchTarget('src/engines/real-estate/brrrr-calculator.ts', (s) =>
        s.replace(
          "{ name: 'holdingMonths', label: 'Holding Period (months)', placeholder: 'e.g. 6', type: 'number' },",
          "{ name: 'holdingMonths', label: 'Holding Period (months)', placeholder: 'e.g. 6', type: 'number' },\n    { name: 'sellingCostsPct', label: 'Selling Costs if not held (%)', placeholder: 'e.g. 8', type: 'number' },"
        ));
    }
  },
  {
    id: 'M2',
    desc: 'mrr 引擎读一个**未声明**的输入（__undeclaredProbe）⇒ 用户在表单上给不了',
    marker: 'T3',
    apply: () => {
      patchTarget('src/engines/saas/mrr-calculator.ts', (s) =>
        s.replace(
          "function calculateMRR(inputs: Record<string, string>): string[] {",
          "function calculateMRR(inputs: Record<string, string>): string[] {\n  const __benchProbe = inputs.__undeclaredProbe;"
        ));
    }
  },
  {
    id: 'M3',
    desc: 'gdpr-fine 的 inputs[] 清空 + generate 改名 ⇒ 判据在该引擎身上失效（真空绿防线）',
    marker: 'T1',
    apply: () => {
      patchTarget('src/engines/legal-compliance/gdpr-fine-calculator.ts', (s) =>
        s
          .replace("  inputs: [", "  inputs: [],\n  __benchInputsUnused: [")
          .replace("  generate(inputs) {", "  generateBenchBroken(inputs) {")
      );
    }
  },
  {
    id: 'M4',
    desc: 'kb-coverage-rate 真去读 industry_benchmark ⇒ informational 白名单过期（养肥）',
    marker: 'T4',
    apply: () => {
      patchTarget('src/engines/knowledge/kb-coverage-rate-calculator.ts', (s) =>
        s.replace(
          "  generate(inputs) {",
          "  generate(inputs) {\n    const __benchBenchmark = inputs.industry_benchmark;"
        ));
    }
  }
];

const NEGATIVE_CONTROL_MUTATION = {
  desc: '同时触发两条断言（M1 假字段 + M2 读未声明输入）',
  apply: () => {
    MUTATIONS[0].apply();
    MUTATIONS[1].apply();
  }
};

const ONLY = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  : null;
const NEGATIVE_CONTROL = process.argv.includes('--negative-control') || process.env.P168_NEGATIVE_CONTROL === '1';

let killed = 0, survived = 0, invalid = 0, notIsolated = 0, exitCode = 0;
// ⭐ 负对照模式：「成功识别出未隔离」是**预期结果** ⇒ 该模式自身 exit 0
//   （仓库既有约定：负对照 exit 0 = 证明成立；exit 1 = 检测本身失效）
let negOk = false;

try {
  console.log('守卫断言（从 ' + GUARD_REL + ' 解析）：');
  for (const n of ASSERTIONS) console.log('  · ' + n);
  console.log('');
  const base = runGuard();
  if (!base.ok) {
    console.log('基线就没绿 —— 先修守卫。');
    console.log(base.out.slice(-2000));
    exitCode = 1;
  } else {
    console.log('基线绿 ✓');
    console.log('');
    if (NEGATIVE_CONTROL) {
      console.log('【负对照模式】故意让**两条**断言同时红 ⇒ 台子必须报 RED-BUT-NOT-ISOLATED 并把整轮 exitCode 置 1。');
      console.log('');
      try { NEGATIVE_CONTROL_MUTATION.apply(); }
      catch (e) { console.log('[NEG] INVALID — ' + e.message); exitCode = 1; }
      if (exitCode === 0) {
        const res = runGuard();
        const failed = res.ok ? [] : failedAssertions(res.out);
        if (!res.ok && failed.length >= 2) {
          notIsolated++;
          negOk = true;
          console.log('[NEG] RED-BUT-NOT-ISOLATED ✓ — ' + NEGATIVE_CONTROL_MUTATION.desc);
          console.log('        失败的断言（' + failed.length + ' 条）：' + failed.join(' / '));
          console.log('');
          console.log('✅ 负对照 OK —— 台子确实识别出了未隔离（并且会把整轮 exitCode 置 1）⇒ 隔离判定本身有效。');
        } else {
          console.log('[NEG] ❌ 负对照失败 —— 故意让两条断言同时红，台子却只看到 ' + failed.length + ' 条失败（期望 ≥ 2）');
          exitCode = 1;
        }
      }
    } else {
      for (const m of MUTATIONS) {
        if (ONLY && !ONLY.includes(m.id)) continue;
        const expect = assertionName(m.marker);
        const restoreErrs = restoreAll();
        if (restoreErrs.length) { console.log('还原失败，台子停止：' + restoreErrs.join(', ')); exitCode = 1; break; }
        try { m.apply(); }
        catch (e) { console.log('[' + m.id + '] INVALID — ' + e.message); invalid++; continue; }
        const res = runGuard();
        if (!res.ok) {
          const failed = failedAssertions(res.out);
          if (failed.length === 1 && failed[0] === expect) {
            killed++;
            console.log('[' + m.id + '] KILLED ✓ — ' + m.desc);
            console.log('        失败断言：' + failed[0]);
          } else {
            notIsolated++;
            console.log('[' + m.id + '] RED-BUT-NOT-ISOLATED — ' + m.desc + '（失败的断言：' + (failed.join(' / ') || '(未识别)') + '；期望：' + expect + '）');
          }
        } else {
          survived++;
          console.log('[' + m.id + '] ✗ SURVIVED — ' + m.desc + '（守卫没红 ⇒ 判据抓不到）');
        }
      }
    }
  }
} finally {
  const writeErrors = restoreAll();
  const bad = verifyAll();
  // ⭐ 收尾**删掉**快照文件（闸门判据是「文件存在」⇒ 留着它下次开跑会被拦住）
  try { unlinkSync(SNAPSHOT); } catch { }
  console.log('');
  console.log('—— KILLED ' + killed + ' · SURVIVED ' + survived + ' · INVALID ' + invalid + ' · RED-BUT-NOT-ISOLATED ' + notIsolated);
  if (writeErrors.length) { console.log('⚠️ 还原失败：' + writeErrors.join(', ')); exitCode = 1; }
  if (bad.length) { console.log('⚠️ 还原后 sha256 不一致：' + bad.join(', ')); exitCode = 1; }
  else console.log('✅ 还原校验：' + TARGETS.length + ' 个文件 sha256 逐字节一致');
  if (survived || invalid || (notIsolated && !negOk)) exitCode = 1;
}
process.exit(exitCode);

