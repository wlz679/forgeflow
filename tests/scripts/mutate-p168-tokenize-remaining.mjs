#!/usr/bin/env node
// P168 B3-15 —— 「zh 整行英文」欠账台账**变异台子**（证明守卫有牙）。
//
// 它回答一个问题：守卫 tests/tokenize-remaining-ledger-guard.test.ts 说「台账与现实一致」，
// 它**守得住吗**？台子用 5 条变异回答：每条变异精确破坏**一个**不变量
// ⇒ 守卫必须精确地红**恰好 1 条**断言（KILLED + 隔离）。
//   ⇒ 「红」说明有牙；「只红 1 条」说明不变量没有被别处重复守
//     （否则一个变异红一片 ⇒ 分不清是哪个不变量在起作用）。
//
// ⭐⭐⭐ 2026-11-24 重写：空台账下旧版 M1/M2「打空 ⇒ SKIP ⇒ 被算成存活 ⇒ exit 1」
//   B3-15 把全站 100 个引擎全部令牌化 ⇒ 台账 `ZH_EN_DEBT = {}` 且 `DEBT_MAX = 0`
//   ⇒ 旧版 M1（改某一条的行数）/ M2（删台账里一条）**没有可操作对象**
//   ⇒ `apply()` 返回原文 ⇒ 变异打空 ⇒ 台子报 SKIP ⇒ 被计入 survived ⇒ exit 1
//   ⇒ 读起来像「守卫没牙」，实际是「变异没打中」。
//   （Task 3 只读复审在 TEMP 复刻实测：M1 applied=false（SKIP）· M2 applied=false（SKIP）
//     · M3 applied=true · M4 applied=true。）
//
// ⭐⭐⭐ 本版解法：**场景重建 + shadow repo**（不是放宽判据）
//   ① 「空台账 ⇒ T2/T3 结构性无法隔离」是**事实**（不是台子的缺陷），推法如下：
//      · T3 要求「台账 ∩ TOKENIZED = ∅」；B3-15 之后 **100 个引擎全部在 TOKENIZED 里**
//        ⇒ 台账里**任何真实引擎**都会让 T3 红
//        ⇒ 想让 T2（逐条行数相等）单独红，就必须让台账登记一个**不在 TOKENIZED 里**的引擎
//        ⇒ 而 T4（源码含 token ≡ TOKENIZED）又要求那个引擎**源码不吐 token**
//        ⇒ 两者只能靠「**造一个没令牌化的引擎**」来同时满足
//        ⇒ 也就是说：**只有「部分引擎未令牌化」的世界里，T2/T3 才是活的不变量**。
//   ② 所以台子把守卫搬进一个 **shadow repo**（TEMP 目录），在 shadow 里**造出那个世界**：
//      · 选一个引擎 X：把它从 TOKENIZED 清单里去掉（⇒ X ∉ TOKENIZED）
//        + 把它源码里的 token 全部摘掉（⇒ X 不再吐 token ⇒ T4 绿）
//        + 给它的 zh 产物页注入一行英文（⇒ 实测有欠账）
//        + 台账登记 X（行数 = 实测）+ `DEBT_MAX` 提到 1
//        ⇒ 这个场景里 **T1/T2/T3/T4 四个不变量同时是活的**，且**未变异时全绿**（负对照）。
//   ③ 然后在 shadow 里逐条注入 5 条变异，每条**只**破坏一个不变量 ⇒ 必须**恰好红 1 条**。
//      ⇒ 5 条变异 ⇒ 5/5 KILLED，且每条「红的是哪条断言」都被**核对身份**（不是只数条数）。
//      ⭐ M5 是**唯一一条攻击「场景合成本身」**的变异（M1–M4 攻击的是台账 / 清单两个数据文件）
//        ⇒ 证明台子测的不只是台账数字，也包括场景的合成前提（2026-11-25 复审 M-2 的建议）。
//
// ⛔ 本台子**不写真仓库的任何文件**（真仓库只被**读**）⇒
//   · 中途被会话中止也不会留下「被改坏的受版本控制文件」；
//   · 真仓库的台账 / 守卫 / 清单的 sha256 在运行前后**逐字节一致**（脚本自己验并打印）。
//
// ⛔ 绝不做的事（把假绿洗成假绿的三种姿势，本版一律禁止）：
//   · 把 exit 1 改成 exit 0；
//   · 把 SKIP / N-A 当成 KILLED；
//   · 放宽断言（改守卫判定逻辑 / 改 DEBT_MAX 让 T1 变绿 / 换更宽松的量法）。
//
// 用法（**必须从仓库根跑**；脚本要 import shadow 里的 TS 模块 ⇒ 必须走 tsx）：
//   cmd.exe /c "node node_modules/tsx/dist/cli.mjs tests/scripts/mutate-p168-tokenize-remaining.mjs"
//   cmd.exe /c "node node_modules/tsx/dist/cli.mjs tests/scripts/mutate-p168-tokenize-remaining.mjs --negative-control"
//
//   --negative-control：注入一条**坏变异**（把 shadow 台账改成语法错误 ⇒ 守卫文件加载失败
//   ⇒ TAP 给出**文件级** not ok / 0 条 ok）⇒ 台子必须判成 NOT-ISOLATED，**绝不能**当成 KILLED。
//   ⭐ 该模式自身 exit 0 = 证明成立（仓库既有台子 B3-9 / B3-12 同约定）。

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SHADOW = resolve(tmpdir(), 'ffk-p168-ledger-shadow');
const TSX_CLI = resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

/** 真仓库的三个文件（本台子**只读**它们） */
const REAL = {
  ledger: resolve(ROOT, 'tests', 'scripts', 'p168-tokenize-remaining-ledger.ts'),
  guard: resolve(ROOT, 'tests', 'tokenize-remaining-ledger-guard.test.ts'),
  list: resolve(ROOT, 'tests', 'scripts', 'p168-tokenized-engines.mjs'),
};
/** shadow repo 里的对应文件（本台子**只改**它们） */
const SH = {
  ledger: resolve(SHADOW, 'tests', 'scripts', 'p168-tokenize-remaining-ledger.ts'),
  guard: resolve(SHADOW, 'tests', 'tokenize-remaining-ledger-guard.test.ts'),
  list: resolve(SHADOW, 'tests', 'scripts', 'p168-tokenized-engines.mjs'),
  engine: null,
  distPage: null,
};

/** 逐字节 sha256（用 Buffer，不经过 utf-8 解码 ⇒ 行尾/字节差异都能看见） */
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const NL = String.fromCharCode(10);
const Q = String.fromCharCode(34);
const SQ = String.fromCharCode(39);

/** 替换且要求「恰好命中一次」（命中 0 次或 >1 次都报错 ⇒ 锚点过期必须立刻暴露） */
function replaceOnce(text, needle, replacement, label) {
  const n = text.split(needle).length - 1;
  if (n !== 1) throw new Error(label + ' 锚点命中 ' + n + ' 次（期望 1 次）：' + needle.slice(0, 70));
  return text.replace(needle, () => replacement);
}

/** 从守卫源码里解析断言标题（**不手抄** —— 守卫改名时台子不会误判） */
function guardAssertionTitles(guardPath) {
  const src = readFileSync(guardPath, 'utf-8');
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
 *   没有这个变量时 T1/T2 会 t.skip ⇒ 变异**不会被杀**（台子会误报「守卫没牙」）。
 */
function runGuard(cwd, guardPath) {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(
      process.execPath,
      [TSX_CLI, '--test', '--test-concurrency=1', '--test-reporter=tap', guardPath],
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd,
        env: { ...process.env, RUN_BUILD_TESTS: '1' },
      },
    );
    code = 0;
  } catch (e) {
    out = String(e.stdout || '') + String(e.stderr || '');
    code = e.status === undefined ? -1 : e.status;
  }
  // ⚠️ 用 TAP 报告器逐行取**标题**（spec 报告器只给汇总，定位不到是哪一条红了）
  const failed = failedAssertions(out);
  const passed = (out.match(/^ok \d+/gm) || []).length;
  return { out, code, failed, passed };
}

/**
 * 判定一次变异的结果 —— 三个条件**缺一不可**：
 *   ① 守卫真的红了（退出码非 0 且有失败项）
 *   ② **恰好红一条**，且那条的**身份**正是期望的那条断言（比较标题，不只数条数）
 *   ③ 另外几条必须**全绿** ⇒ 文件级失败（0 条 ok / 标题是文件路径）绝不可能冒充「隔离」
 */
function judge(r, expectedTitle, expectedId, expectedGreen) {
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
  if (r.passed !== expectedGreen) {
    return {
      verdict: 'RED-BUT-NOT-ISOLATED',
      reason: '另外只绿 ' + r.passed + ' 条（期望 ' + expectedGreen + ' 条）⇒ 不是「恰好红一条」',
    };
  }
  return { verdict: 'KILLED', reason: '' };
}

/**
 * 把 token 全部摘掉（让引擎「不再吐 token」）—— 只在 shadow 里做。
 *
 * ⚠️ 为什么连 `$` 也要去掉：`extractEngineTokenCodes` 扫的是 **token 形态**
 *   （`$code` 或裸 `'calc_out.x.y'` 字面量）⇒ 只把 `calc_out.` 改名成 `plain.`
 *   的话 `$plain.x.y` **仍然是合法 token** ⇒ 引擎照样被判「吐 token」⇒ T4 照样红
 *   ⇒ 必须连 `$` 一起去掉、且命名空间改掉（否则裸字面量扫描还会命中）。
 */
function stripTokens(srcText) {
  let out = srcText.split('$calc_out.').join('plain.');
  out = out.split('calc_out.').join('plain.');
  return out;
}

/**
 * 往 zh 产物页的**结果卡片**里注入一行英文（只改 shadow 的 dist）。
 *
 * ⚠️ 必须落在 `data-history-result` 那个元素的**正文**里（不是属性值里）
 *   ⇒ 测量口径（staticCard）与守卫用的是同一个函数 ⇒ 注入即被量到。
 */
function injectEnglishLine(html, line) {
  const i = html.indexOf('data-history-result');
  if (i < 0) throw new Error('zh 产物页里找不到 data-history-result');
  const lt = html.lastIndexOf('<', i);
  if (lt < 0) throw new Error('找不到 data-history-result 的开始标签');
  // ⭐ 按「引号状态」找标签结束位置（属性值里可能有 '>'）
  let k = lt + 1;
  let quote = '';
  let te = -1;
  while (k < html.length) {
    const c = html[k];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === Q || c === SQ) quote = c;
    else if (c === '>') {
      te = k;
      break;
    }
    k++;
  }
  if (te < 0) throw new Error('找不到开始标签的结束 >');
  let nameEnd = lt + 1;
  while (nameEnd < te && html[nameEnd] !== ' ' && html[nameEnd] !== '>') nameEnd++;
  const tagName = html.slice(lt + 1, nameEnd);
  const close = '</' + tagName + '>';
  const end = html.indexOf(close, te + 1);
  if (end < 0) throw new Error('找不到闭合标签 ' + close);
  return html.slice(0, end) + NL + line + NL + html.slice(end);
}

/** shadow repo 搭建（复制 src/ 与 dist/zh/，node_modules 用 junction 指回真仓库） */
function setupShadow() {
  if (!SHADOW.startsWith(resolve(tmpdir())) || !SHADOW.includes('ffk-p168-ledger-shadow')) {
    throw new Error('shadow 路径不安全：' + SHADOW);
  }
  if (!existsSync(resolve(ROOT, 'dist', 'zh'))) {
    throw new Error('dist/zh 不存在 ⇒ 先跑 pnpm build:full（守卫与台子量的是 dist 产物）');
  }
  if (existsSync(SHADOW)) rmSync(SHADOW, { recursive: true, force: true });
  mkdirSync(resolve(SHADOW, 'tests', 'scripts'), { recursive: true });
  mkdirSync(resolve(SHADOW, 'dist'), { recursive: true });
  cpSync(resolve(ROOT, 'src'), resolve(SHADOW, 'src'), { recursive: true });
  cpSync(resolve(ROOT, 'dist', 'zh'), resolve(SHADOW, 'dist', 'zh'), { recursive: true });
  for (const f of [
    'p168-tokenize-remaining-ledger.ts',
    'p168-zh-remaining-audit.ts',
    'p168-card-text.mjs',
    'p168-tokenized-engines.mjs',
  ]) {
    cpSync(resolve(ROOT, 'tests', 'scripts', f), resolve(SHADOW, 'tests', 'scripts', f));
  }
  cpSync(REAL.guard, SH.guard);
  for (const f of ['package.json', 'tsconfig.json']) {
    if (existsSync(resolve(ROOT, f))) cpSync(resolve(ROOT, f), resolve(SHADOW, f));
  }
  symlinkSync(resolve(ROOT, 'node_modules'), resolve(SHADOW, 'node_modules'), 'junction');
}

/**
 * 造场景：把守卫从「全站已令牌化」的世界，带回「部分引擎未令牌化」的世界。
 *
 * ⇒ 场景里 T1/T2/T3/T4 四个不变量**同时是活的**，且未变异时全绿。
 */
async function buildScenario() {
  const listMod = await import(pathToFileURL(SH.list).href);
  const TOKENIZED = listMod.TOKENIZED;
  if (!TOKENIZED || TOKENIZED.length < 3) throw new Error('TOKENIZED 清单读不到或太短');
  // X = 清单里的第一个引擎（拿它的 file 字段找源码）；Y = 第二个（M4 用，必须与 X 不同）
  const X = TOKENIZED[0];
  const Y = TOKENIZED[1];
  if (X.slug === Y.slug) throw new Error('X 与 Y 必须是不同引擎');

  // ① X 从 TOKENIZED 清单里去掉（⇒ T3 绿的前提：台账登记的引擎不在清单里）
  const listText = readFileSync(SH.list, 'utf8');
  const listLine = new RegExp('^[ \\t]*\\{ slug: ' + JSON.stringify(X.slug).replace(/"/g, "'") + '[^\\n]*\\r?\\n', 'm');
  if (!listLine.test(listText)) throw new Error('TOKENIZED 清单里找不到 ' + X.slug);
  writeFileSync(SH.list, listText.replace(listLine, ''), 'utf8');

  // ② X 的源码不再吐 token（⇒ T4 绿的前提）
  SH.engine = resolve(SHADOW, X.file);
  if (!existsSync(SH.engine)) throw new Error('shadow 里找不到引擎源码：' + X.file);
  const srcText = readFileSync(SH.engine, 'utf8');
  if (!srcText.includes('$calc_out.') && !srcText.includes('calc_out.')) {
    throw new Error(X.slug + ' 的源码里找不到 token（场景造不出来）');
  }
  const stripped = stripTokens(srcText);
  writeFileSync(SH.engine, stripped, 'utf8');
  // ⭐ 留一份**原文**：M5 要「撤销摘 token 这一步」⇒ 攻击**场景合成本身**（2026-11-25 复审 M-2）
  const XSourceOriginal = srcText;

  // ③ X 的 zh 产物页注入一行英文（⇒ 实测有欠账）
  SH.distPage = resolve(SHADOW, 'dist', 'zh', X.slug, 'index.html');
  if (!existsSync(SH.distPage)) throw new Error('shadow 里找不到 zh 产物页：' + X.slug);
  const pageText = readFileSync(SH.distPage, 'utf8');
  const injected = injectEnglishLine(pageText, 'Mutation harness injected English line for guard teeth verification');
  writeFileSync(SH.distPage, injected, 'utf8');

  // ④ 量出 X 的实测欠账行数（用**测量口径同源**的 card-text 模块）
  const cardText = await import(pathToFileURL(resolve(SHADOW, 'tests', 'scripts', 'p168-card-text.mjs')).href);
  const card = cardText.staticCard(readFileSync(SH.distPage, 'utf8'));
  const k = card.filter(cardText.isEnglishLine).length;
  if (k < 1) throw new Error('注入后仍量不到欠账行（k=' + k + '）⇒ 场景造不出来');

  // ⑤ 台账登记 X（行数 = 实测）+ DEBT_MAX 提到 1（⇒ 台账规模上限与场景一致）
  const ledgerText = readFileSync(SH.ledger, 'utf8');
  const ledgerNew = replaceOnce(
    replaceOnce(ledgerText, 'export const DEBT_MAX = 0;', 'export const DEBT_MAX = 1;', 'DEBT_MAX'),
    'export const ZH_EN_DEBT: Record<string, number> = {};',
    "export const ZH_EN_DEBT: Record<string, number> = {" + NL + "  '" + X.slug + "': " + k + "," + NL + '};',
    'ZH_EN_DEBT',
  );
  writeFileSync(SH.ledger, ledgerNew, 'utf8');

  // ⑥ 自证场景真的「X 不吐 token 了」（否则 T4 会红 ⇒ 场景基线不绿）
  const registry = await import(pathToFileURL(resolve(SHADOW, 'src', 'core', 'engines', 'registry.ts')).href);
  await import(pathToFileURL(resolve(SHADOW, 'src', 'engines', 'index.ts')).href);
  const i18n = await import(pathToFileURL(resolve(SHADOW, 'src', 'lib', 'calc-output-i18n.ts')).href);
  const engines = registry.getAllEngines();
  const ex = engines.find((e) => e.slug === X.slug);
  if (!ex) throw new Error('shadow 注册表里找不到 ' + X.slug);
  const codes = i18n.extractEngineTokenCodes(ex);
  if (codes.length !== 0) {
    throw new Error(X.slug + ' 摘 token 后仍吐 ' + codes.length + ' 个 code ⇒ 场景造不出来');
  }

  return { X, Y, k, XSourceOriginal };
}

// ── 五条变异（每条精确破坏一个不变量）────────────────────────────────
//   M1 台账登记的行数与实测差 1        → T2 红（逐条行数相等）
//   M2 台账漏登一个实测有欠账的引擎    → T1 红（集合相等：实测有 / 台账无）
//   M3 台账塞进一条不存在的引擎        → T1 红（集合相等：台账有 / 实测无）
//   M4 从 TOKENIZED 里删掉一个引擎      → T4 红（源码含 token ≡ TOKENIZED）
//   M5 **撤销「把 X 的源码 token 摘掉」这一步**（场景合成本身）
//      → T4 红（源码在吐 token 却不在 TOKENIZED 清单里）
//
// ⭐⭐ M5 为什么必须有（2026-11-25 复审 M-2 的方法论弱点）：
//   M1–M4 全部攻击「台账 / 清单」这两个**数据文件** ⇒ 台子证明的是
//   「台账数字与现实脱节会被抓住」，**没有**证明「场景的合成前提本身是承重的」。
//   M5 改的是**场景**（X 的源码不再被摘 token）⇒ 源码重新吐 token、而 X 仍不在 TOKENIZED
//   ⇒ T4 必须红 ⇒ 证明「T4 之所以活着，是因为场景把 X 摘出了 TOKENIZED 且摘掉了它的 token」
//   ⇒ **台子测的不只是台账数字，也包括场景的合成前提**。
//
// ⚠️ 为什么 M5 不选「把 X 放回 TOKENIZED 清单」（另一种「撤销合成」）：
//   那会让 **T3（台账 ∩ TOKENIZED ≠ ∅）与 T4 同时红** ⇒ 破坏「一条变异只红一条」的隔离纪律
//   ⇒ 本台子的隔离判据（红恰好 1 条、且按**标题身份**核对）就没法用了。
//   ⇒ 选「撤销摘 token」这一步：只破 T4 ⇒ 仍是精确红 1 条 ⇒ 隔离纪律保住。
const variants = [
  {
    id: 'M1',
    name: '台账登记的行数与实测差 1（数字与现实脱节）',
    expect: 'T2',
    file: 'ledger',
    apply: (t, ctx) => replaceOnce(t, "'" + ctx.X.slug + "': " + ctx.k + ',', "'" + ctx.X.slug + "': " + (ctx.k + 1) + ',', 'M1'),
  },
  {
    id: 'M2',
    name: '台账漏登一个实测有欠账的引擎（集合不再相等）',
    expect: 'T1',
    file: 'ledger',
    apply: (t, ctx) => {
      const re = new RegExp("^[ \\t]*'" + ctx.X.slug + "':[ \\t]*" + ctx.k + ',[ \\t]*\\r?\\n', 'm');
      if (!re.test(t)) throw new Error('M2 锚点不存在（台账里没有 ' + ctx.X.slug + '）');
      return t.replace(re, '');
    },
  },
  {
    id: 'M3',
    name: '台账塞进一条不存在的引擎（幽灵欠账）',
    expect: 'T1',
    file: 'ledger',
    apply: (t) => replaceOnce(
      t,
      'export const ZH_EN_DEBT: Record<string, number> = {',
      'export const ZH_EN_DEBT: Record<string, number> = {' + NL + "  'solopreneur-ghost-engine-calculator': 3,",
      'M3',
    ),
  },
  {
    id: 'M4',
    name: '从 TOKENIZED 里删掉一个引擎（那四个守卫不再覆盖它）',
    expect: 'T4',
    file: 'list',
    apply: (t, ctx) => {
      const re = new RegExp('^[ \\t]*\\{ slug: ' + "'" + ctx.Y.slug + "'" + '[^\\n]*\\r?\\n', 'm');
      if (!re.test(t)) throw new Error('M4 锚点不存在（清单里没有 ' + ctx.Y.slug + '）');
      return t.replace(re, '');
    },
  },
  {
    id: 'M5',
    name: '撤销「把 X 的源码 token 摘掉」这一步（**攻击场景合成本身**）',
    expect: 'T4',
    file: 'engine',
    // ⭐ 变异点 = **场景**（不是台账 / 清单）：X 的源码重新吐 token，
    //   而 X 仍不在 TOKENIZED 清单里 ⇒ T4「源码含 token ≡ TOKENIZED」必须红。
    apply: (t, ctx) => {
      if (!ctx.XSourceOriginal) throw new Error('M5 拿不到 X 的原始源码（场景没建好）');
      if (t === ctx.XSourceOriginal) throw new Error('M5 变异打空：X 的源码没被摘过 token');
      return ctx.XSourceOriginal;
    },
  },
];

// ⭐⭐ 期望标题**必须在改任何文件之前**全部解析好（复审 Important —— 修复「exit 跳过 finally 还原」）。
//
//   事故形态：process.exit() **不展开调用栈** ⇒ try 的 finally 还原**不会**执行
//   ⇒ 若「标题解析失败」发生在**写入被改文件之后** ⇒ 工作区会留下一个**被改坏的受版本控制文件**。
//   ⇒ 现在：解析全部提前到**任何 writeFileSync 之前** ⇒ 解析失败时**什么都没改** ⇒ exit 1 是安全的。
const ASSERTIONS = guardAssertionTitles(REAL.guard);
function assertionTitle(id) {
  const hit = ASSERTIONS.filter((t) => assertionId(t) === id);
  if (hit.length !== 1) {
    console.log('守卫里找不到唯一的断言 ' + id + '（找到 ' + hit.length + ' 条）⇒ 台子停止。');
    for (const t of ASSERTIONS) console.log('  · ' + t);
    process.exit(1);
  }
  return hit[0];
}

const EXPECTED_TITLES = new Map();
for (const v of variants) EXPECTED_TITLES.set(v.id, assertionTitle(v.expect));
/** 负对照用的名义期望标题（坏变异不该红任何一条断言；这里只作「对照」用） */
const NEG_EXPECTED_TITLE = assertionTitle('T2');

const NEGATIVE_CONTROL = process.argv.includes('--negative-control');
const REAL_SHA_BEFORE = { ledger: sha(REAL.ledger), guard: sha(REAL.guard), list: sha(REAL.list) };

let survived = 0;
let notIsolated = 0;
let negControlProved = false;
let killed = 0;

// ── ① 真仓库负对照（只读）：当前状态必须绿，否则下面的红说明不了问题 ──
console.log('【真仓库负对照】未变异时守卫必须绿（只读，不改真仓库任何文件）');
const realControl = runGuard(ROOT, REAL.guard);
const realControlOk = realControl.code === 0 && realControl.failed.length === 0;
console.log(
  '  ' + (realControlOk ? '绿 ✓' : '红 ✗')
    + '（红 ' + realControl.failed.length + ' 条 / 绿 ' + realControl.passed + ' 条，退出码 ' + realControl.code + '）',
);
if (!realControlOk) {
  console.log(realControl.out);
  survived++;
}

let ctx = null;
let scenarioBaseline = null;
try {
  // ── ② 造场景（shadow repo）────────────────────────────────────────
  setupShadow();
  ctx = await buildScenario();
  console.log('【场景】shadow = ' + SHADOW);
  console.log('  X = ' + ctx.X.slug + '（已从 TOKENIZED 摘掉 + 源码 token 摘掉 + zh 页注入英文）');
  console.log('  Y = ' + ctx.Y.slug + '（M4 用）');
  console.log('  X 的实测欠账行数 k = ' + ctx.k + ' · 台账登记 ' + ctx.k + ' 行 · DEBT_MAX = 1');

  // 场景基线：未变异时 **四条断言必须全绿**（否则「红」说明不了问题）
  const base = runGuard(SHADOW, SH.guard);
  const baseOk = base.code === 0 && base.failed.length === 0 && base.passed === ASSERTIONS.length;
  scenarioBaseline = { ok: baseOk, out: base.out, passed: base.passed, failed: base.failed };
  console.log(
    '  场景基线（未变异）：' + (baseOk ? '四条断言全绿 ✓' : '红 ✗')
      + '（红 ' + base.failed.length + ' 条 / 绿 ' + base.passed + ' 条，退出码 ' + base.code + '）',
  );
  if (!baseOk) {
    console.log(base.out);
    console.log('⛔ 场景基线不绿 ⇒ 四条不变量没有同时是活的 ⇒ 台子停下（不改真仓库）。');
    process.exitCode = 1;
  } else {
    if (NEGATIVE_CONTROL) {
      // ── 【负对照模式】注入一条「坏变异」：shadow 台账语法错误 ──────────────
      //   守卫 import 台账 ⇒ 台账语法错 ⇒ **守卫文件加载失败**
      //   ⇒ TAP 给出**文件级** not ok（0 条 ok）
      //   ⇒ 台子必须判成 NOT-ISOLATED，**绝不能**当成「干净的隔离击杀」。
      console.log('');
      console.log('【负对照模式】注入「台账语法错误」⇒ 守卫文件加载失败 ⇒ TAP 给出文件级 not ok（0 条 ok）');
      const orig = readFileSync(SH.ledger, 'utf8');
      writeFileSync(SH.ledger, 'export const __BROKEN__ = ;' + NL, 'utf8');
      const r = runGuard(SHADOW, SH.guard);
      const j = judge(r, NEG_EXPECTED_TITLE, 'T2', ASSERTIONS.length - 1);
      console.log('  实测红「' + (r.failed[0] || '(无)') + '」· 红 ' + r.failed.length + ' 条 / 绿 ' + r.passed + ' 条，退出码 ' + r.code);
      const detected = j.verdict === 'RED-BUT-NOT-ISOLATED';
      console.log('  判定：' + j.verdict + (j.reason ? ' —— ' + j.reason : ''));
      console.log(detected
        ? '  ✅ 负对照成立 —— 坏变异被判成 NOT-ISOLATED（**没有**被当成 KILLED）⇒ 检测本身有牙。'
        : '  ❌ 负对照失败 —— 坏变异被判成 ' + j.verdict + ' ⇒ 检测失效。');
      console.log('  ⇒ 本模式按设计 exit 0（成功识别出未隔离 = 证明成立；仓库既有台子同约定）。');
      writeFileSync(SH.ledger, orig, 'utf8');
      negControlProved = detected;
    } else {
      // ── ③ 五条变异（逐条注入 ⇒ 必须恰好红 1 条 ⇒ 还原后 sha256 逐字节一致）──
      const EXPECTED_GREEN = ASSERTIONS.length - 1;
      for (const v of variants) {
        const target =
          v.file === 'ledger' ? SH.ledger : v.file === 'list' ? SH.list : SH.engine;
        const origText = readFileSync(target, 'utf8');
        const origSha = sha(target);
        const mutated = v.apply(origText, ctx);
        // ⚠️ 「变异有没有真的打中目标」的判据 = **改完的内容与原文不同**
        //   （否则「变异没打中」会被误报成「守卫没牙」⇒ 台子会误导人去修一个没坏的守卫）。
        if (mutated === origText) {
          console.log(v.id + ' SKIP：变异没有生效（目标串可能不存在）');
          survived++;
          continue;
        }
        writeFileSync(target, mutated, 'utf8');
        const mutatedSha = sha(target);
        if (mutatedSha === origSha) {
          console.log(v.id + ' SKIP：写盘后 sha256 没变（文件没被改动？）');
          survived++;
          continue;
        }
        const r = runGuard(SHADOW, SH.guard);
        const expectedTitle = EXPECTED_TITLES.get(v.id);
        const j = judge(r, expectedTitle, v.expect, EXPECTED_GREEN);
        if (j.verdict === 'KILLED') killed++;
        else if (j.verdict === 'SURVIVED') survived++;
        else notIsolated++;
        console.log(
          v.id + ' ' + v.name + ' => ' + j.verdict
            + '（期望红 ' + v.expect + ' · 实测红「' + (r.failed[0] || '(无)') + '」'
            + ' · 红 ' + r.failed.length + ' 条 / 绿 ' + r.passed + ' 条，退出码 ' + r.code + '）'
            + ' · 变异前 sha256 ' + origSha.slice(0, 12) + ' → 变异后 ' + mutatedSha.slice(0, 12)
            + (j.reason ? ' —— ' + j.reason : ''),
        );
        if (j.verdict === 'SURVIVED') console.log(r.out);
        // 还原 + 逐字节校验
        writeFileSync(target, origText, 'utf8');
        const backSha = sha(target);
        console.log('  还原 ' + v.file + '：sha256 ' + backSha.slice(0, 12) + (backSha === origSha ? ' 与变异前逐字节一致 ✓' : ' **不一致 ✗**'));
        if (backSha !== origSha) {
          console.log('⛔ 还原校验失败 ⇒ 台子停下。');
          process.exitCode = 1;
        }
      }
    }
  }
} finally {
  // ⭐ 真仓库**只被读** ⇒ 逐字节核对它没被本台子碰过
  const realAfter = { ledger: sha(REAL.ledger), guard: sha(REAL.guard), list: sha(REAL.list) };
  const realOk = realAfter.ledger === REAL_SHA_BEFORE.ledger
    && realAfter.guard === REAL_SHA_BEFORE.guard
    && realAfter.list === REAL_SHA_BEFORE.list;
  console.log('真仓库未被改写：' + (realOk ? '台账 / 守卫 / 清单 sha256 逐字节一致 ✓' : '**被改动了 ✗**'));
  if (!realOk) process.exitCode = 1;
}

if (NEGATIVE_CONTROL) {
  console.log('负对照证明：' + (negControlProved ? '成立 ✓（坏变异被判成 NOT-ISOLATED）' : '失败 ✗（坏变异被当成 KILLED ⇒ 检测失效）'));
  // 负对照模式：exit 0 = 证明成立；exit 1 = 检测失效
  process.exit(negControlProved && survived === 0 ? 0 : 1);
}
console.log('—— KILLED ' + killed + ' / 存活 ' + survived + ' · 未隔离 ' + notIsolated + '（共 ' + variants.length + ' 条变异）');
process.exit(survived === 0 && notIsolated === 0 && killed === variants.length ? 0 : 1);
