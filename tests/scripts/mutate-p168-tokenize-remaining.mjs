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
// ⭐⭐⭐ **M1/M2 的锚点必须从「当前台账」动态解析，不能写死 slug**（2026-11-19 Task 5 实测踩坑）
//   第一版把 M1/M2 写死在两个具体引擎上（meeting-cost / course-pricing）
//   ⇒ 本批把这 10 个引擎令牌化后**它们已从台账销账** ⇒ 锚点串不存在
//   ⇒ 变异「没打中」⇒ 台子报 SKIP（而 SKIP 会被算成「存活」⇒ exit 1 ⇒ 验收读起来像「守卫没牙」）。
//   ⚠️ 这是**同族教训的第三次复发**（P168 B3-4 / B3-8 的变异锚点过期各一次）
//   ⇒ **锚点必须锚在「一定会变的那部分结构」上**：台账**条目本身**（每销账一次就少一条 ⇒ 位置会变）
//   ⇒ 改为「解析当前台账 ⇒ 取第一条 / 最后一条 ⇒ 在它身上动手」⇒ 台账怎么变都不会过期。
//   （TOKENIZED 清单只增不减 ⇒ M4 的锚点不会过期。）
//
// ⚠️ M4 的隔离前提：只跑**本守卫这一个测试文件**
//   tests/calc-output-en-parity-guard.test.ts 里硬编码了 TOKENIZED.length === 55
//   ⇒ 从 TOKENIZED 删掉一个引擎会让**那个**套件也红 ⇒ 判定范围只限本守卫。
//   （M1/M2/M3 只改台账文件 ⇒ 不影响别的套件，但统一只跑一个文件更省时。）
//
// ⚠️ 纪律（照抄 B3-12 的 G6 台子）
//   · 还原**无条件执行**（finally）+ sha256 **逐字节**校验；
//   · 每条变异必须**真的改到文件**（写完校验 sha256 已变）——
//     否则「变异没打中」会被误报成「守卫没牙」⇒ 台子会让人去「修」一个根本没坏的守卫；
//   · **负对照**：未变异时守卫必须绿（绿了才说明下面的红是变异造成的）；
//   · ⭐ **期望标题的解析必须在任何写入之前** —— process.exit() 不展开调用栈 ⇒ finally 还原不执行
//     ⇒ 解析失败若发生在写入之后，工作区会留下被改坏的受版本控制文件（复审 Important）。
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
//   ⭐ **该模式自身 exit 0 = 证明成立**（与仓库既有台子同约定：B3-9 / B3-12 / title-seo /
//     decision-support 皆如此）—— 「成功识别出未隔离」是**预期结果**，不是失败。

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const LEDGER = resolve(ROOT, 'tests', 'scripts', 'p168-tokenize-remaining-ledger.ts');
// ⚠️ 调试/自检用：P168_GUARD_PATH 可让台子跑**别的**守卫文件
//   （例：验证「标题解析失败时工作区不被改坏」时，指向一个标题不匹配的临时副本）。
//   ⭐ 台子**只改写** LEDGER / TOKENIZED_LIST；GUARD 只被读取与还原 ⇒ 指到别处不会改坏任何文件。
const GUARD = process.env.P168_GUARD_PATH
  ? resolve(process.env.P168_GUARD_PATH)
  : resolve(ROOT, 'tests', 'tokenize-remaining-ledger-guard.test.ts');
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

/**
 * 解析**当前**台账的条目（slug + 登记行数）—— ⭐ 动态锚点。
 *
 * ⚠️ 为什么不能写死 slug（2026-11-19 Task 5 实测踩坑）：
 *   第一版把 M1/M2 的锚点写死在两个具体引擎上（meeting-cost / course-pricing）
 *   ⇒ 本批把这 10 个引擎令牌化后**它们已从台账销账** ⇒ 锚点串不存在
 *   ⇒ 变异「没打中」⇒ 台子报 SKIP（而 SKIP 会被算成「存活」⇒ 读起来像「守卫没牙」）。
 *   ⇒ 台账**每销账一次就少一条** ⇒ 锚点必须每轮**现取**，不能写死。
 *
 * 只解析 ZH_EN_DEBT 块（不扫全文）⇒ 不会误收别的数字字面量。
 */
function ledgerEntries(text) {
  const start = text.indexOf('export const ZH_EN_DEBT');
  if (start < 0) return [];
  const end = text.indexOf('};', start);
  if (end < 0) return [];
  const block = text.slice(start, end);
  const re = /^[ \t]*'([^']+)':[ \t]*(\d+),[ \t]*\r?$/gm;
  const out = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    out.push({ slug: m[1], n: parseInt(m[2], 10) });
  }
  return out;
}

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
/**
 * 取某个 id 对应的**唯一**断言标题（找不到或不唯一 ⇒ 台子停止，绝不猜）。
 *
 * ⚠️⚠️ **只能在「任何写入之前」调用**（复审 Important）：
 *   process.exit() **不会**展开调用栈 ⇒ 外层 try 的 finally 还原**不会**执行
 *   ⇒ 若在写入被改文件之后才解析失败，工作区会留下一个**被改坏的受版本控制文件**。
 *   ⇒ 唯一的调用点在下面的「预解析」里（早于任何 writeFileSync）。
 */
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
    // ⭐ 动态锚点：取**当前**台账的第一条 ⇒ 台账怎么变都不会打空
    apply: (t) => {
      const es = ledgerEntries(t);
      if (es.length === 0) return t;
      const e = es[0];
      const re = new RegExp("('" + e.slug + "':[ \\t]*)" + e.n + ',');
      return t.replace(re, '$1' + (e.n + 1) + ',');
    },
    expect: 'T2',
  },
  {
    id: 'M2',
    name: '删掉台账里一条（该引擎实测仍有欠账）',
    file: LEDGER,
    orig: LEDGER_ORIG,
    // ⭐ 动态锚点：删**当前**台账的最后一条（该引擎实测仍有欠账 ⇒ T1 红）
    apply: (t) => {
      const es = ledgerEntries(t);
      if (es.length === 0) return t;
      const e = es[es.length - 1];
      const re = new RegExp("^[ \\t]*'" + e.slug + "':[ \\t]*\\d+,[ \\t]*\\r?\\n", 'm');
      return t.replace(re, '');
    },
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

// ⭐⭐ 期望标题**必须在改任何文件之前**全部解析好（复审 Important —— 修复「exit 跳过 finally 还原」）。
//
//   事故形态：process.exit() **不展开调用栈** ⇒ try 的 finally 还原**不会**执行
//   ⇒ 若「标题解析失败」发生在**写入被改文件之后**（旧写法正是这样：正常模式在写完台账后才解析），
//      工作区会留下一个**被改坏的受版本控制文件**（例：台账里留着 `export const __BROKEN__ = ;`）
//      —— 那正是本台子「还原无条件执行（finally）」纪律存在的意义所在。
//   ⇒ 现在：解析全部提前到**任何 writeFileSync 之前** ⇒ 解析失败时**什么都没改** ⇒ exit 1 是安全的。
//   （失败依然很响：打印守卫的全部断言标题 + 找不到的 id。）
const EXPECTED_TITLES = new Map();
for (const v of variants) EXPECTED_TITLES.set(v.id, assertionTitle(v.expect));
/** 负对照用的名义期望标题（坏变异不该红任何一条断言；这里只作「对照」用） */
const NEG_EXPECTED_TITLE = assertionTitle('T2');

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');

let survived = 0;
let notIsolated = 0;
/** 负对照模式专用：「成功识别出未隔离」= 证明成立（该模式自身 exit 0） */
let negControlProved = false;

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
    const j = judge(r, NEG_EXPECTED_TITLE, 'T2');
    console.log('  实测红「' + (r.failed[0] || '(无)') + '」· 红 ' + r.failed.length + ' 条 / 绿 ' + r.passed + ' 条，退出码 ' + r.code);
    const detected = j.verdict === 'RED-BUT-NOT-ISOLATED';
    console.log('  判定：' + j.verdict + (j.reason ? ' —— ' + j.reason : ''));
    console.log(detected
      ? '  ✅ 负对照成立 —— 坏变异被判成 NOT-ISOLATED（**没有**被当成 KILLED）⇒ 检测本身有牙。'
      : '  ❌ 负对照失败 —— 坏变异被判成 ' + j.verdict + ' ⇒ 检测失效。');
    console.log('  ⇒ 本模式按设计 exit 0（成功识别出未隔离 = 证明成立；仓库既有台子同约定）。');
    // ⭐ 坏变异被判成 NOT-ISOLATED 是**预期结果** ⇒ 证明「检测本身有牙」
    //   ⇒ 该模式自身 exit 0（与 B3-9 / B3-12 / title-seo / decision-support 同约定）。
    //   ⚠️ 若台子把坏变异当成 KILLED ⇒ 检测失效 ⇒ 必须 exit 1。
    negControlProved = detected;
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
      const expectedTitle = EXPECTED_TITLES.get(v.id);
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
if (NEGATIVE_CONTROL) {
  console.log('负对照证明：' + (negControlProved ? '成立 ✓（坏变异被判成 NOT-ISOLATED）' : '失败 ✗（坏变异被当成 KILLED ⇒ 检测失效）'));
  // 负对照模式：exit 0 = 证明成立；exit 1 = 检测失效
  process.exit(negControlProved && survived === 0 ? 0 : 1);
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);
