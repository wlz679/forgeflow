#!/usr/bin/env node
// P168 B3-13 —— 「zh 整行英文」欠账台账**变异台子**（证明守卫有牙）。
//
// 为什么需要它
// -------------
//   守卫说「台账与现实一致」⇒ 但**守得住吗**？本台子用 4 条变异回答这个问题：
//   每条变异精确地破坏**一个**不变量 ⇒ 守卫必须精确地红 **1 条**断言（KILLED + 隔离）。
//   ⇒ 「红」说明有牙；「只红 1 条」说明不变量没有被别处重复守（否则一个变异红一片 ⇒ 变异台子
//     分不清是哪个不变量在起作用 ⇒ 台账规则会慢慢糊成一团）。
//
// ⭐⭐ **必须核对失败断言的「身份」，不只是「有几条红了」**（复审 Important 1）
//   旧写法只数 TAP 的 `not ok` 条数 ⇒ 两个后果：
//     ① brief 的映射（M1→T2 / M2→T1 / M3→T1 / M4→T4）**没被强制** —— 期望值只是被打印回来；
//     ② ⚠️ **假绿**：若某条变异把被改模块改成**语法错误** ⇒ 守卫文件根本加载不了
//        ⇒ TAP 给出的是**文件级** `not ok 1 - <文件路径>`（**0 条 `ok`**）
//        ⇒ 「恰好 1 条 not ok」成立 ⇒ 旧写法会把它当成「干净的隔离击杀」并 exit 0
//        ⇒ **一个坏变异被认证成好变异**。
//   ⇒ 现在：解析失败项的**标题**，要求它**就是**期望的那条断言；且另外三条必须**绿**
//     ⇒ 文件级失败（0 条 ok / 标题是文件路径）绝不可能冒充「隔离」。
//
// 四条变异（每条精确红 1 条断言）
//   M1 台账里某一条的行数 +1            → T2 红（逐条行数）
//   M2 删掉台账里一条（该引擎仍有欠账）  → T1 红（集合相等：实测有 / 台账无）
//   M3 塞一条幽灵 slug（不存在的引擎）   → T1 红（集合相等：台账有 / 实测无）
//   M4 从 TOKENIZED 里删掉一个引擎        → T4 红（源码含 token ≡ TOKENIZED）
//
// ⚠️ M4 的隔离前提：只跑**本守卫这一个测试文件**
//   tests/calc-output-en-parity-guard.test.ts 里硬编码了 TOKENIZED.length === 45
//   ⇒ 从 TOKENIZED 删掉一个引擎会让**那个**套件也红 ⇒ 判定范围只限本守卫。
//   （M1/M2/M3 只改台账文件 ⇒ 不影响别的套件，但统一只跑一个文件更省时。）
//
// ⚠️ 纪律（照抄 B3-12 的 G6 台子）
//   · 还原**无条件执行**（finally）+ sha256 **逐字节**校验；
//   · 每条变异必须**真的改到文件**（写完校验 sha256 已变）——
//     否则「变异没打中」会被误报成「守卫没牙」⇒ 台子会让人去「修」一个根本没坏的守卫；
//   · **负对照**：未变异时守卫必须绿（绿了才说明下面的红是变异造成的）。
//
// ⚠️ 本台子会**临时改写仓库里的文件** ⇒ 不要与全量套件并行跑，且别接进 pnpm check。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/mutate-p168-tokenize-remaining.mjs
//   node node_modules/tsx/dist/cli.mjs tests/scripts/mutate-p168-tokenize-remaining.mjs --negative-control
//
//   --negative-control：注入一条**坏变异**（把台账文件改成语法错误 ⇒ 守卫文件加载失败
//   ⇒ TAP 给出文件级 not ok / 0 条 ok）⇒ 台子必须把它判成 NOT-ISOLATED，
//   **绝不能**当成 KILLED。用来证明「检测本身有牙」（详见下面对应输出）。

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const LEDGER = resolve(ROOT, 'tests', 'scripts', 'p168-tokenize-remaining-ledger.ts');
const GUARD = resolve(ROOT, 'tests', 'tokenize-remaining-ledger-guard.test.ts');
const TOKENIZED_LIST = resolve(ROOT, 'tests', 'scripts', 'p168-tokenized-engines.mjs');

/** 逐字节 sha256（用 Buffer，不经过 utf-8 解码 ⇒ 行尾/字节差异都能看见） */
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const LEDGER_ORIG = readFileSync(LEDGER);
const GUARD_ORIG = readFileSync(GUARD);
const LIST_ORIG = readFileSync(TOKENIZED_LIST);
const L0 = sha(LEDGER);
const G0 = sha(GUARD);
const T0 = sha(TOKENIZED_LIST);

const NL = String.fromCharCode(10);

/** 从守卫源码里解析断言标题（**不手抄** —— 守卫改名时台子不会误判） */
function guardAssertionTitles() {
  const src = readFileSync(GUARD, 'utf-8');
  const names = [];
  const re = /test\(\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) names.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  return names;
}

/**
 * 断言 id —— 精确取标题里「P168 B3-13 T<n>：」那一段。
 *
 * ⚠️ 不用 `title.includes(marker)`：那是**子串**匹配 ⇒ 将来标题里出现别的「T1」就会误配
 *   （例：标题里若出现「TOKENIZED T1 清单」之类）。这里锚定「批次标签 + id + 冒号」。
 */
function assertionId(title) {
  const m = title.match(/P168 B3-13 (T[1-4])(?=[：:])/);
  return m ? m[1] : null;
}

const ASSERTIONS = guardAssertionTitles();
/** 取某个 id 对应的**唯一**断言标题（找不到或不唯一 ⇒ 台子停止，绝不猜） */
function assertionTitle(id) {
  const hit = ASSERTIONS.filter((t) => assertionId(t) === id);
  if (hit.length !== 1) {
    console.log('守卫里找不到唯一的断言 ' + id + '（找到 ' + hit.length + ' 条）⇒ 台子停止。');
    for (const t of ASSERTIONS) console.log('  · ' + t);
    process.exit(1);
  }
  return hit[0];
}

/** TAP 里失败的**标题**（不是条数）—— 文件级失败在这里是「文件路径」，不是断言标题 */
function failedAssertions(out) {
  const names = [];
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^not ok \d+ - (.+)$/);
    if (m) names.push(m[1].trim());
  }
  return names;
}

/**
 * 跑**只有**本守卫这一个文件的测试，返回失败**标题**与通过条数。
 *
 * ⚠️ 必须显式给子进程带上 RUN_BUILD_TESTS=1 —— 本守卫是 build-dep（读 dist/），
 *   没有这个变量时 T1/T2 会 t.skip ⇒ 变异 M1/M2 **不会被杀**（台子会误报「守卫没牙」）。
 */
function runGuard() {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(
      process.execPath,
      [
        resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
        '--test', '--test-concurrency=1', '--test-reporter=tap', GUARD,
      ],
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: ROOT,
        env: { ...process.env, RUN_BUILD_TESTS: '1' },
      },
    );
    code = 0;
  } catch (e) {
    const err = e;
    out = String(err.stdout || '') + String(err.stderr || '');
    code = err.status === undefined ? -1 : err.status;
  }
  // ⚠️ 用 TAP 报告器逐行取**标题**（spec 报告器只给汇总，定位不到是哪一条红了）
  const failed = failedAssertions(out);
  const passed = (out.match(/^ok \d+/gm) || []).length;
  return { out, code, failed, passed };
}

/** 期望「另外三条」必须绿 ⇒ 绿条数 = 断言总数 - 1 */
const EXPECTED_GREEN = ASSERTIONS.length - 1;

/**
 * 判定一次变异的结果 —— 三个条件**缺一不可**：
 *   ① 守卫真的红了（退出码非 0 且有失败项）
 *   ② **恰好红一条**，且那条的**身份**正是期望的那条断言（比较标题，不只数条数）
 *   ③ 另外几条必须**全绿** ⇒ 文件级失败（0 条 ok / 标题是文件路径）绝不可能冒充「隔离」
 */
function judge(r, expectedTitle, expectedId) {
  if (r.code === 0 || r.failed.length === 0) {
    return { verdict: 'SURVIVED', reason: '守卫没红 ⇒ 判据抓不到这条变异' };
  }
  if (r.failed.length > 1) {
    return { verdict: 'RED-BUT-NOT-ISOLATED', reason: '红了 ' + r.failed.length + ' 条（期望 1 条）' };
  }
  if (r.failed[0] !== expectedTitle) {
    return {
      verdict: 'RED-BUT-NOT-ISOLATED',
      reason: '红的是「' + r.failed[0] + '」而不是期望的 ' + expectedId + ' ⇒ 变异打歪了 / 文件级失败',
    };
  }
  if (r.passed !== EXPECTED_GREEN) {
    return {
      verdict: 'RED-BUT-NOT-ISOLATED',
      reason: '另外只绿 ' + r.passed + ' 条（期望 ' + EXPECTED_GREEN + ' 条）⇒ 不是「恰好红一条」',
    };
  }
  return { verdict: 'KILLED', reason: '' };
}

const variants = [
  {
    id: 'M1',
    name: '台账里某一条的行数 +1（数字与现实脱节）',
    file: LEDGER,
    orig: LEDGER_ORIG,
    apply: (t) => t.replace(
      "'solopreneur-meeting-cost-calculator': 41,",
      "'solopreneur-meeting-cost-calculator': 42,",
    ),
    expect: 'T2',
  },
  {
    id: 'M2',
    name: '删掉台账里一条（该引擎实测仍有欠账）',
    file: LEDGER,
    orig: LEDGER_ORIG,
    apply: (t) => t.replace(/  'solopreneur-course-pricing-calculator': 38,\r?\n/, ''),
    expect: 'T1',
  },
  {
    id: 'M3',
    name: '台账塞进一条不存在的引擎（幽灵欠账）',
    file: LEDGER,
    orig: LEDGER_ORIG,
    apply: (t) => t.replace(
      'export const ZH_EN_DEBT: Record<string, number> = {',
      'export const ZH_EN_DEBT: Record<string, number> = {' + NL
        + "  'solopreneur-ghost-engine-calculator': 3,",
    ),
    expect: 'T1',
  },
  {
    id: 'M4',
    name: '从 TOKENIZED 里删掉一个引擎（源码仍吐 token ⇒ 那几个守卫不再覆盖它）',
    file: TOKENIZED_LIST,
    orig: LIST_ORIG,
    apply: (t) => t.replace(/  \{ slug: 'solopreneur-gpu-cloud-cost-calculator'[^\n]*\r?\n/, ''),
    expect: 'T4',
  },
];

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');

let survived = 0;
let notIsolated = 0;

// ── 负对照：未变异时守卫必须绿（否则下面的红说明不了问题）────────────────
const control = runGuard();
const controlOk = control.code === 0 && control.failed.length === 0 && control.passed === EXPECTED_GREEN + 1;
console.log(
  '负对照（未变异）：' + (controlOk ? '绿 ✓' : '红 ✗')
    + '（红 ' + control.failed.length + ' 条 / 绿 ' + control.passed + ' 条，退出码 ' + control.code + '）',
);
if (!controlOk) {
  console.log(control.out);
  survived++;
}

try {
  if (NEGATIVE_CONTROL) {
    // ── 【负对照模式】注入一条「坏变异」：台账文件语法错误 ──────────────
    //   守卫 import 台账 ⇒ 台账语法错 ⇒ **守卫文件加载失败**
    //   ⇒ TAP 给出**文件级** not ok（0 条 ok）
    //   ⇒ 台子必须判成 NOT-ISOLATED，**绝不能**当成「干净的隔离击杀」。
    console.log('');
    console.log('【负对照模式】注入「台账语法错误」⇒ 守卫文件加载失败 ⇒ TAP 给出文件级 not ok（0 条 ok）');
    writeFileSync(LEDGER, 'export const __BROKEN__ = ;' + NL, 'utf-8');
    const r = runGuard();
    const j = judge(r, assertionTitle('T2'), 'T2');
    console.log('  实测红「' + (r.failed[0] || '(无)') + '」· 红 ' + r.failed.length + ' 条 / 绿 ' + r.passed + ' 条，退出码 ' + r.code);
    const detected = j.verdict === 'RED-BUT-NOT-ISOLATED';
    console.log('  判定：' + j.verdict + (j.reason ? ' —— ' + j.reason : ''));
    console.log(detected
      ? '  ✅ 负对照成立 —— 坏变异被判成 NOT-ISOLATED（**没有**被当成 KILLED）⇒ 检测本身有牙。'
      : '  ❌ 负对照失败 —— 坏变异被判成 ' + j.verdict + ' ⇒ 检测失效。');
    console.log('  ⇒ 本模式按设计 exit 1（台子确实判出了未隔离；正常模式下同一条变异同样 exit 1）。');
    // 坏变异本身就是「未隔离」⇒ 整轮必须非零退出（不管台子判得对不对）。
    notIsolated++;
  } else {
    for (const v of variants) {
      const origText = v.orig.toString('utf-8');
      const mutated = v.apply(origText);
      // ⚠️ 「变异有没有真的打中目标」的判据 = **改完的内容与原文不同**
      //   （否则「变异没打中」会被误报成「守卫没牙」⇒ 台子会误导人去修一个没坏的守卫）。
      if (mutated === origText) {
        console.log(v.id + ' SKIP：变异没有生效（目标串可能不存在）');
        survived++;
        continue;
      }
      writeFileSync(v.file, mutated, 'utf-8');
      // ⚠️ 必须真的改到文件（写完校验 sha256 已变）—— 否则文件没落盘 ⇒ 变异等于没做。
      if (sha(v.file) === (v.file === LEDGER ? L0 : T0)) {
        console.log(v.id + ' SKIP：写盘后 sha256 没变（文件没被改动？）');
        survived++;
        continue;
      }
      const r = runGuard();
      const expectedTitle = assertionTitle(v.expect);
      const j = judge(r, expectedTitle, v.expect);
      if (j.verdict === 'KILLED') { /* killed */ }
      else if (j.verdict === 'SURVIVED') survived++;
      else notIsolated++;
      console.log(
        v.id + ' ' + v.name + ' => ' + j.verdict
          + '（期望红 ' + v.expect + ' · 实测红「' + (r.failed[0] || '(无)') + '」'
          + ' · 红 ' + r.failed.length + ' 条 / 绿 ' + r.passed + ' 条，退出码 ' + r.code + '）'
          + (j.reason ? ' —— ' + j.reason : ''),
      );
      if (j.verdict === 'SURVIVED') console.log(r.out);
      writeFileSync(v.file, v.orig);
    }
  }
} finally {
  // ⭐ 还原**无条件执行**（finally）+ sha256 **逐字节**校验
  writeFileSync(LEDGER, LEDGER_ORIG);
  writeFileSync(GUARD, GUARD_ORIG);
  writeFileSync(TOKENIZED_LIST, LIST_ORIG);
  const okL = sha(LEDGER) === L0;
  const okG = sha(GUARD) === G0;
  const okT = sha(TOKENIZED_LIST) === T0;
  console.log('还原：台账 ' + (okL ? '一致 ✓' : '不一致 ✗')
    + ' · 守卫 ' + (okG ? '一致 ✓' : '不一致 ✗')
    + ' · 令牌化清单 ' + (okT ? '一致 ✓' : '不一致 ✗'));
  if (!okL || !okG || !okT) process.exit(1);
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);
