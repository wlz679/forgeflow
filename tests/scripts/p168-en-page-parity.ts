#!/usr/bin/env node
// P168 B3-7 —— **英文页零变化**判据的可复算测量工具。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts              # 全部 25 个已令牌化引擎
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts mrr         # 只看一个
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts --allow-list # 允许「有意改动」清单
//
// ⭐⭐ 为什么需要它（B3-7 的产品承诺：zh 页改中文，**英文页一个字都不改**）：
//   · 静态卡片 = `engine.staticExamples[0]`（codegen 用**服务端 generate()** 生成）。
//   · **基线提交**版的 `staticExamples[0]` = **token 化之前**的英文输出。
//   · 现在版的 token 自带**英文兜底** ⇒ 兜底渲染 = token 化后的英文输出。
//   ⇒ **兜底渲染 == 基线的 staticExamples[0]** ⇒ 英文页逐字不变。
//
// ⭐⭐ 为什么基线必须钉在**固定 SHA** 而不是 HEAD（2026-11-13 实测踩坑）：
//   HEAD 会随本批提交前进 ⇒ 一提交，基线就变成「**已 token 化**的版本」
//   ⇒ 基线里全是 `$calc_out.…` token 原文 ⇒ 与「渲染后的英文」必然不等
//   ⇒ **G9 提交后必红**（本地未提交时反而绿 ⇒ 又一个「本地绿 ≠ CI 绿」）。
//   ⇒ 基线 = token 化**之前**的最后一个提交，并用「基线里不得出现 token」自证。
//
// ⚠️ 这条判据**补上了 G8 的盲区**：G8 只比「兜底渲染 vs locale.en 模板渲染」
//   ⇒ 两边一起错时它照样绿 ⇒ 它发现不了「兜底本身与源码原文不同」。
//   实测本工具当场抓到 rent_vs_buy 的两处真实回归：
//     ① `padEnd(10)` 的对齐空格被 token 化时丢弃（英文页的对齐变了）；
//     ② verdict 多出一个空格。
//   ⚠️ 已知**有意**的例外：mrr 的 `🔄 What-If Scenarios` → `🔄 What-If Scenarios:`
//     （全仓主流写法带冒号；已由计划记录）。

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput } from '../../src/lib/calc-output-i18n.ts';
import { PILOT_SLUGS, codegenDefaults } from './p168-server-client-parity.ts';
import { TOKENIZED, baselineFor } from './p168-tokenized-engines.mjs';

const NL = String.fromCharCode(10);

/** 已令牌化引擎的源文件（slug → 仓库路径）—— 工具自带，不依赖 tmp/ ⇒ CI 也能跑
 *  ⭐ P168 B3-8：清单改为从**单一真相源**派生（p168-tokenized-engines.mjs） */
export const PILOT_FILES: Record<string, string> = Object.fromEntries(TOKENIZED.map((e) => [e.slug, e.file]));

/** ⭐ 已记录的「有意改动」白名单（每条都要写明理由） */
export const ALLOWED_DIFFS: Record<string, string[]> = {
  // ⚠️ P168 B3-11：mrr 原先登记过「🔄 What-If Scenarios → 🔄 What-If Scenarios:」
  //   —— 那次**有意**的改动发生在 token 化期间 ⇒ 基线（token 化之前）不含冒号 ⇒ 差异成立。
  //   ⭐ B3-11 把 mrr 的基线**重钉**到已含冒号的提交 ⇒ 该差异**已不存在**
  //   ⇒ 条目变成「白名单养肥」⇒ 移除（G9 的「白名单不许养肥」自检也会要求移除它）。
  //   ⇒ 意图改由**基线**承载：此后任何人动那一行 ⇒ 与基线不等 ⇒ G9 变红。
  // P168 B3-8 Task 7：saas-valuation 的**双美元号**修复（`$$1,000,000` → `$1,000,000`，4 行）
  //   —— 根因：`fmt()` 自带 '$'，调用处又拼了一个 '$' ⇒ 页面出现 `$$`。
  //   ⚠️ 白名单用 `$$` 作标记：修复后该页**已无任何 `$$`** ⇒ 未来任何含 `$$` 的差异
  //      只能是「双美元号又回来了」，正是这条白名单要拦的 ⇒ 不会顺带放过别的改动。
  'solopreneur-saas-valuation-calculator': ['$$'],
  // P168 B3-8 Task 7：freelance-rate 的**双美元号**修复（`$$90/hr` → `$90/hr`，3 行）
  //   —— 同一根因（`fmt()` 自带 '$'，调用处又拼了一个 '$'）。
  //   ⚠️ 同样用 `$$` 作标记：修复后该页已无任何 `$$` ⇒ 未来含 `$$` 的差异只能是「双美元号又回来了」。
  'solopreneur-freelance-rate-calculator': ['$$'],
  // P168 B3-8 §0.5：**rental-yield 服务端数值 bug 修复**（用户 2026-11-16 拍板「改服务端」）。
  //   根因：`cashOnCashReturn` 的分子 `annualCashFlow(inputs)` 用的是 `inputs.loanAmount` ⇒
  //        「100% 全款」场景下**贷款没置零** ⇒ 算成「带杠杆现金流 ÷ 全款投资额」= 1.08%（口径不一致）。
  //   客户端把贷款置 0 ⇒ 无杠杆 CoC = NOI ÷ (房价×1.03) = 6.89% ⇒ **客户端是对的**。
  //   修法：`coc100Down` 补 `loanAmount: 0` ⇒ 服务端与客户端一致。
  //   ⚠️ 标记用整段短语 `CoC → 6.89%`（不是光一个 `6.89%`）⇒ 将来这行若因别的原因再变，白名单不匹配 ⇒ CI 变红 ⇒ 强制复审。
  'solopreneur-rental-yield-calculator': ['CoC → 6.89%'],
};

export interface EnParityRow {
  slug: string;
  same: boolean;
  allowed: boolean;
  headChars: number;
  nowChars: number;
  diffs: string[];
}

/**
 * ⭐⭐ 基线提交：**B3-7 引擎 token 化之前**的最后一个提交。
 *   ⚠️ 不得改成 HEAD —— 一提交，基线就变成「已 token 化」的版本
 *   ⇒ G9 变成「token 化 vs token 化」（真空绿）或「token 原文 vs 渲染后」（必然红）。
 *   ⚠️ 2026-11-13 实测：本地未提交时 G9 绿、**提交后立刻红** ⇒ CI 必红。
 */
export const BASELINE_SHA = 'd3b3c1d';

/** ⭐ B3-8：基线按 slug 分组（试点 d3b3c1d / 本批 5c1c789）
 *  ⇒ 单值 BASELINE_SHA 降级为「默认基线」，真正的基线由**每个引擎自己**决定
 *  ⇒ 保留单值导出是为了不破坏既有 import（p168-engine-check.ts 等） */
export function baselineShaFor(slug: string): string {
  return baselineFor(slug);
}

/**
 * ⭐⭐ P168 B3-11：基线可能是**已令牌化**的提交 —— 基线侧必须与「现在侧」
 *   用**同一个渲染器**处理，否则必然不等（结构不同 ⇒ 假红）。
 *
 *   背景：B3-11 修了 12 个引擎的 defaultInputs（此前键名与引擎 inputs[].name 对不上
 *   ⇒ staticExamples[0] 是「拿错输入算出来的」）⇒ 其中 8 个已令牌化引擎的英文页
 *   **合法地**变了 ⇒ 它们的基线**重钉**到 B3-11 提交（该提交的 staticExamples[0]
 *   已是 token 文本）⇒ 必须渲染成英文再比。
 *
 *   ⭐ 承重性不变：基线侧是 **git 里冻结的**内容，现在侧是**活的源码**
 *   ⇒ 之后任何人改了引擎的英文输出 ⇒ 两边不等 ⇒ G9 变红。
 *   （若基线也取自活的源码 ⇒ 两边恒等 ⇒ 真空绿 ⇒ 那样就没有守卫了。）
 */
export function baselineStaticExample(file: string, sha?: string): string | null {
  const use = sha ?? BASELINE_SHA;
  let src: string;
  try {
    src = execSync('git show ' + use + ':' + file, { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch {
    return null;
  }
  // ⭐ 2026-11-17 B3-9 实测修：`[` 与字符串字面量之间**可能夹着注释行**
  //   （实测 claude / gemini / deepseek 三个引擎的 staticExamples 里都有注释）
  //   ⇒ 旧正则 `\[\s*'` 匹配不到 ⇒ G9 报「基线取不到」⇒ **整条判据失效（真空绿）**。
  //   ⇒ 改成：`[` 之后**跳过注释与空白**，再取字符串字面量。
  const m = src.match(/staticExamples:\s*\[(?:[^'\]]*?)?'((?:[^'\\]|\\.)*)'/);
  if (!m) return null;
  const literal = m[1].replace(/\\n/g, NL).replace(/\\'/g, "'");
  // ⭐ 与「现在侧」用同一个渲染器：基线若是令牌化提交 ⇒ 渲染成英文兜底再比
  //   （令牌化前的基线是纯英文 ⇒ 渲染是恒等变换 ⇒ 旧行为不变）
  return renderCalcOutput(literal, {});
}

/**
 * ⭐ 日期归一化：`dateLabel()` 用**当前月份**推算里程碑日期
 *   （实测 mrr 的 `(~Sep 2026)` 现在是 `(~Jan 2027)`）
 *   ⇒ HEAD 的静态示例是**几个月前**生成的 ⇒ 这一项**必然**随时间变
 *   ⇒ 它不是「英文页被改了」，而是「时间在走」⇒ 归一化掉。
 */
export function normalizeDates(text: string): string {
  return text
    .replace(/\(~[A-Z][a-z]{2} \d{4}\)/g, '(~DATE)')
    // ⭐ P168 B3-11：burn-rate 的 run-out 日期也要归一化
    //   —— codegen 用 REFERENCE_DATE（2026-07-15）固化 ⇒ 产物里是「Feb 2027」，
    //      实时跑用当天日期 ⇒ 「Jun 2027」⇒ 必然差一个月份 ⇒ 不是「英文页被改了」，是「时间在走」。
    .replace(/(Est\. Cash Run-out:[ ]*)[A-Z][a-z]{2} \d{4}/g, '$1DATE');
}

/**
 * ⭐⭐ 产物层的**生成规则**（2026-11-16 实测踩坑）：静态卡片里**没有**「📅 Pricing last updated:」那一行。
 *
 *   · scripts/codegen-examples.mjs:316-317 写 staticExamples[0] 之前会**过滤掉**这一行
 *     （注释原文：'Strip the leading "📅 Pricing last updated:" + empty line (UI badge covers it)'）
 *   · 页面用**徽章**显示同一个日期：src/pages/[lang]/[slug].astro:1394-1395 →「📅 Data updated: {dataLastUpdated}」
 *   ⇒ 基线侧取的是 literal（本来就**没有**那一行）；
 *     现在侧若直接拿 generate() 的原始输出比 ⇒ **必然多一行** ⇒ 后面每行整体错位
 *     ⇒ 实测 ai-api-cost-comparison 53 行里 53 行全「不同」（假红），与基线分组机制无关。
 *   ⇒ **两边必须按同一条产物规则处理**。
 *
 * ⚠️ 为什么在**渲染之后**过滤（而不是渲染之前）：
 *   引擎令牌化之后，这一行会变成 token（$calc_out.…）⇒ 渲染前的前缀匹配认不出来；
 *   渲染后是英文兜底「📅 Pricing last updated: …」⇒ 前缀稳定 ⇒ 令牌化前后都认得出。
 */
export function stripPricingBanner(text: string): string {
  return text.split(NL).filter((l) => !l.startsWith('📅 Pricing last updated:')).join(NL);
}

export function measureEnParity(slugs: string[]): EnParityRow[] {
  const engines = getAllEngines() as any[];
  const defaults = codegenDefaults();
  const rows: EnParityRow[] = [];
  for (const slug of slugs) {
    const file = PILOT_FILES[slug];
    const e = engines.find((x) => x.slug === slug);
    if (!e || !file) continue;
    const sha = baselineShaFor(slug);
    const headRaw = baselineStaticExample(file, sha);
    if (headRaw === null) { rows.push({ slug, same: false, allowed: false, headChars: 0, nowChars: 0, diffs: ['基线取不到（浅克隆，或 ' + sha + ' 不在历史里）'] }); continue; }
    // ⭐ 两侧都按**产物规则**处理（去掉「📅 Pricing last updated:」那一行 —— 页面用徽章显示）
    const head = stripPricingBanner(headRaw);
    const raw = (e.generate ?? e.calculate).call(e, defaults[slug]);
    const text = Array.isArray(raw) ? raw.map(String).join(NL) : String(raw);
    const now = stripPricingBanner(renderCalcOutput(text, {}));
    // ⭐ P168 B3-11：判定与差异必须用**同一份归一化文本**
    //   —— 否则出现「原文不等、归一化后相等」的中间态 ⇒ diffs=0 却报「有 0 处未记录差异」。
    //   日期漂移是「时间在走」，不是「英文页被改了」⇒ 归一化后相等即视为未变。
    const normHead = normalizeDates(head);
    const normNow = normalizeDates(now);
    const A = normHead.split(NL), B = normNow.split(NL);
    const diffs: string[] = [];
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (A[i] !== B[i]) diffs.push('第 ' + (i + 1) + ' 行：HEAD ' + JSON.stringify(A[i]) + ' vs 现在 ' + JSON.stringify(B[i]));
    }
    const allow = ALLOWED_DIFFS[slug] ?? [];
    const allowed = diffs.length > 0 && diffs.every((d) => allow.some((a) => d.includes(a)));
    rows.push({ slug, same: normHead === normNow, allowed, headChars: head.length, nowChars: now.length, diffs });
  }
  return rows;
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-en-page-parity.ts')) {
  // ⭐ 别名用下划线、slug 用连字符 ⇒ 过滤两边都要归一化（否则「sales_velocity」匹配不到）
  const norm = (x: string) => x.replace(/^solopreneur-/, '').replace(/-calculator$/, '').replace(/-/g, '_');
  const args = process.argv.slice(2);
  const named = args.filter((a) => !a.startsWith('--'));
  const slugs = named.length
    ? PILOT_SLUGS.filter((s) => named.some((n) => norm(s).includes(norm(n))))
    : PILOT_SLUGS;
  const rows = measureEnParity(slugs);
  // ⭐ 防真空绿
  if (rows.length === 0) { console.log('没有匹配到任何引擎（过滤条件写错了？）· 期望至少 1 个'); process.exit(1); }
  let bad = 0;
  for (const r of rows) {
    if (r.same) { console.log('✔ ' + r.slug + ' ⇒ 英文页逐字不变（' + r.nowChars + ' 字符）'); continue; }
    if (r.allowed) { console.log('⊙ ' + r.slug + ' ⇒ 只有「已记录的有意改动」（' + r.diffs.length + ' 处）'); continue; }
    bad++;
    console.log('✗ ' + r.slug + ' ⇒ 英文页有 ' + r.diffs.length + ' 处未记录差异（' + r.headChars + ' → ' + r.nowChars + ' 字符）');
    for (const d of r.diffs.slice(0, 5)) console.log('    ' + d);
  }
  console.log('—— ' + rows.length + ' 个试点 · 未记录差异 ' + bad + ' 个');
  process.exitCode = bad === 0 ? 0 : 1;
}
