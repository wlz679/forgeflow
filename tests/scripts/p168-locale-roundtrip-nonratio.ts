#!/usr/bin/env node
// P168 B3-15 —— **locale 模板等价体检（非等比变体集）** —— ⭐ **诊断工具**。
//
// ============================================================================
// ① 为什么存在：G8 的**保比盲区**
// ============================================================================
//   G8（tests/scripts/p168-locale-roundtrip.ts，CI 守卫
//   tests/calc-output-template-parity-guard.test.ts 消费它的 measure()）的变体集是
//   **默认 / 全局 ×2 / 全局 ×3+1** ⇒ **全部保比**（分子分母**同步**放大）
//   ⇒ 比例型 param（如 stale_pct = stale/total）的兜底**恒定不变**
//   ⇒ 「模板把数值冻死」这条逃逸在 G8 下**完全看不见**
//   ⇒ 2026-11-25 复审实测：把 article_freshness 的 tip 行 {stale_pct} 冻成字面量
//      **并**删掉源码 param ⇒ G8 仍然 exit 0 · 2403 code · 不一致 0（**假绿逃逸**）。
//
//   本脚本 = **G8 的同一套测量口径 + 非等比变体集**
//   （默认 + 全局保比 + **逐参数独立扰动**〔只改一个输入、其余原样 ⇒ 分子分母不同步〕）
//   ⇒ 用来**找出 G8 看不见的真实缺陷**。
//
// ============================================================================
// ② 它**不是**守卫（但从 2026-11-25 第 2 轮起**进了 CI**，见 ⑤）
// ============================================================================
//   · **默认 exit 0**（哪怕报告出不一致也 exit 0）⇒ 不参与 CI 判定、不进套件计数。
//   · 文件名**不带 .test.ts** ⇒ 不进 walkTestSuites 的套件计数（AGENTS.md 的 68/233/301 不变）。
//   · 可选 --strict：**只在出现「未知的不一致」时 exit 1**（见 ⑤ 的语义）。
//   · 可选 --json：机器可读输出。
//
// ============================================================================
// ③ 它报告出的不一致 = **待修的真实缺陷清单**（不是噪音、不是豁免）
// ============================================================================
//   每条不一致都意味着：**locale 模板渲染出来的文本 ≠ token 自带的英文兜底渲染**
//   ⇒ 英文页与中文页展示的**数值/排版不一样** ⇒ 有的是**用户可见的错误数字**。
//   ⇒ 它们**照常被报告**，并与「已知缺陷登记表」逐条对账（见下方 KNOWN_DEFECTS）。
//
// ============================================================================
// ④ 修完这些缺陷之后 —— 下一步该做什么
// ============================================================================
//   把 **G8 本体**（tests/scripts/p168-locale-roundtrip.ts）的 variantsOf
//   升级成**本脚本这套非等比变体集**，并让 CI 守卫
//   （tests/calc-output-template-parity-guard.test.ts）重新变严。
//   ⚠️ 本轮（纯测试/文档修复轮）**不做**这一步：
//      · 升级 G8 本体 ⇒ 守卫立刻红（当前确有 3 条真实缺陷未修）
//      · 修 D-2 / D-3 ⇒ 要改 src/engines/**（AI cost 引擎的 params）
//        ⇒ 按项目宪法**必须 user 拍板** ⇒ 本轮**不得**擅自改引擎。
//   ⇒ 所以：G8 本体保持原样（守卫不红），增强能力放在本诊断脚本里（不藏发现、不越权）。
//
// ============================================================================
// ⑤ ⭐ 第 2 轮（2026-11-25 复审 M-B / M-F）：**补上 zh 侧** + **进 CI**
// ============================================================================
//   ⚠️ **G8 的既有口径是 en-only**（只读 en.json）⇒ 2026-11-25 复审实测：
//      在 shadow 里**只**修 en.json（zh.json 留着坏模板）⇒ 本脚本照样报
//      「✔ 已消失（可从登记表移除）」⇒ 下一批会以为 D-1 已修并销账，
//      **而 zh 页仍显示错误的跑道数字**。
//   ⇒ 本脚本从第 2 轮起**补上 zh 侧的三条判据**（对 G8 口径的**补强**，不是改判据）：
//
//     Z1 **占位符一致性**：en 模板与 zh 模板引用的占位符**多重集**必须相同
//        （zh 少引一个 param ⇒ zh 页丢信息；zh 多引一个 ⇒ zh 页多出信息）。
//        ⚠️ 半修状态的 D-1 就是**这一条**能抓：en「{from} → {to}」vs zh「{from} → {from}」。
//        实测（2026-11-25 全量 2,715 code）：**不一致 0 个**。
//
//     Z2 **载荷数字计数一致性**（= 任务书要求的「数字序列一致性」）：
//        同一个 token 的**同一份 payload**，en 模板片段与 zh 模板片段渲染出的
//        **数字 token 出现次数**必须**逐个相同**。
//        ⇒ 因为两个模板替进去的是**同一份 payload** ⇒ 数字必须一样多。
//        ⇒ 半修状态的 D-1：en 片段「60.0 → 150.0」有 1 个 "150.0"，
//          zh 片段「60.0 → 60.0」有 0 个 ⇒ 抓得到。
//        实测（2026-11-25 全量 76,165 次 token 出现 · 38,950 次带 params）：
//        **不一致 0 个**。
//
//     Z3 **词面数字差异**（诊断 + **显式 allowlist**）：
//        en 模板片段与 zh 模板片段的**整体数字多重集**差异。
//        ⚠️ **合法例外确实存在**（2026-11-25 全量实测 = 51 个 code）：
//           英文措辞里的字面数字在中文里会换一种写法（「top-quartile」→「前 25%」、
//           「2x」→「翻倍」、「$5M」→「500 万」、「50K」→「5 万」、「Q1 (Apr 15)」→「Q1（4 月 15 日）」…）
//           ⇒ 两侧数字**本就该不同** ⇒ 这不是缺陷。
//        ⇒ 这 51 个 code **逐条登记**在下方 ZH_WORDING_EXCEPTIONS（带理由），
//           **不在登记表里的差异 ⇒ 一律报成不一致**（防止有人偷偷改掉 allowlist 里的数字）。
//        实测：allowlist 51 条**全部命中**、allowlist 外 **0 条**。
//
//   ⇒ **「可从登记表移除」的判据随之变严**：须 **en + zh 两侧都不复现**才可移除。
//
//   ⚠️ **--strict 的语义（第 2 轮改）**：
//      · 实际集合 ⊋ 已知集合（= 出现**未知**的不一致）⇒ **exit 1**（新缺陷立刻挡路）。
//      · 实际集合 ⊂ 已知集合（= 某条已修）⇒ **醒目提示 + exit 0**（已修不挡路）。
//      ⇒ 已知欠账不挡路、新缺陷立刻挡路 ⇒ 已进 CI（见 .github/workflows/ci.yml）。
//
// 测量口径（**en 侧一字不改**，照抄 G8）
//   对每个 code：
//     renderCalcOutput(text, {})              ← 兜底路径（token 自带的英文兜底）
//     === renderCalcOutput(text, { code: tpl }) ← 模板路径（locale.en 现值）
//   ⇒ 逐 code 判定（不是整页比较 ⇒ 不掩盖其余同样出错的 code）。
//
// 跑法（**必须**用 tsx 跑 ⇒ 引擎注册表与引擎内部落在同一个模块实例上）：
//   cmd.exe /c "node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-roundtrip-nonratio.ts"
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput, CALC_OUTPUT_TOKEN_RE, decodeHtmlEntities } from '../../src/lib/calc-output-i18n.ts';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { codegenDefaults, syntheticInputs } from './p168-server-client-parity.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);
const JSON_OUT = process.argv.includes('--json');
const STRICT = process.argv.includes('--strict');

// ── 变体集：默认 + 全局保比 + **逐参数独立扰动**（非等比）─────────────────
/**
 * ⭐ 逐参数独立扰动的倍率（与 tests/scripts/p168-b315-params-coverage.mjs **同构**）
 *   · ×7   —— 把一个输入放大（可能被引擎 clamp ⇒ 与 ×0.4 互补）
 *   · ×0.4 —— 把一个输入缩小（放大被 clamp 时靠它仍能打破比例）
 */
const SCALES = [7, 0.4];

/** 只把一个输入按倍率改掉（其余原样）⇒ 分子分母不同步 */
function scaleOne(
  base: Record<string, string>,
  key: string,
  factor: number,
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  const n = Number(base[key]);
  if (!Number.isFinite(n) || n <= 0) return out;
  const v = Math.round(n * factor);
  if (!(v > 0)) return out;
  out[key] = String(v);
  return out;
}

interface Variant {
  name: string;
  inputs: Record<string, string>;
  /** 该变体是否**保比**（分子分母同步 ⇒ 比例型 param 恒定） */
  ratioPreserving: boolean;
}

/**
 * 变体集 —— 与 G8 的变体集**同构 + 追加非等比**：
 *   ① 默认
 *   ② 全局 ×2（保比）· ③ 全局 ×3+1（保比）  ← G8 原有的保比变体
 *   ④ 逐参数独立扰动（**破坏比例关系**）      ← G8 缺的那一块
 */
function variantsOf(base: Record<string, string>): Variant[] {
  const out: Variant[] = [{ name: '默认', inputs: { ...base }, ratioPreserving: true }];
  for (const [label, fn] of [
    ['全局×2', (n: number) => n * 2],
    ['全局×3+1', (n: number) => n * 3 + 1],
  ] as [string, (n: number) => number][]) {
    const inputs: Record<string, string> = {};
    for (const [k, val] of Object.entries(base)) {
      const n = Number(val);
      inputs[k] = Number.isFinite(n) && n > 0 ? String(fn(n)) : val;
    }
    out.push({ name: label, inputs, ratioPreserving: true });
  }
  // ④ 逐参数独立扰动（**只**改一个输入、其余原样 ⇒ 分子分母**不同步**）
  for (const key of Object.keys(base)) {
    const n = Number(base[key]);
    if (!Number.isFinite(n) || n <= 0) continue;
    for (const f of SCALES) {
      const inputs = scaleOne(base, key, f);
      if (inputs[key] === base[key]) continue;
      out.push({
        name: '仅' + key + '×' + f,
        inputs,
        ratioPreserving: false,
      });
    }
  }
  return out;
}

/** 该文本里出现的全部 token code */
function codesOf(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return [...new Set(out)];
}

// ── zh 侧判据用的几个小工具（第 2 轮新增）────────────────────────────────
/** 正则元字符转义（拼「按 code 定位 token」的 regex 用） */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^$()|\[\]\\{}]/g, '\\$&');
}

/**
 * 数字 token（**千分位 / 小数 / 百分号**）。
 * ⚠️ **不吞尾逗号** —— \d+(?:,\d{3})* 只会吃掉「1,000」这种成组千分位，
 *    不会把「400,」里的逗号一起吃掉（否则 en「400,」与 zh「400，」会被误判成两个数字）。
 */
function numTokens(s: string): string[] {
  const out: string[] = [];
  const re = /\d+(?:,\d{3})*(?:\.\d+)?%?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out.push(m[0]);
  return out;
}

/** 计数表（数字 → 出现次数） */
function tally(list: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of list) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

/** 两个多重集的**对称差**（en 独有 / zh 独有） */
function multisetDiff(a: string[], b: string[]): { enOnly: string[]; zhOnly: string[] } {
  const ta = tally(a);
  const tb = tally(b);
  const enOnly: string[] = [];
  const zhOnly: string[] = [];
  for (const [k, n] of ta) {
    const d = n - (tb.get(k) ?? 0);
    for (let i = 0; i < d; i++) enOnly.push(k);
  }
  for (const [k, n] of tb) {
    const d = n - (ta.get(k) ?? 0);
    for (let i = 0; i < d; i++) zhOnly.push(k);
  }
  return { enOnly, zhOnly };
}

/** 模板里的占位符名（多重集，排序后） */
function placeholdersOf(tpl: string): string[] {
  return (tpl.match(/\{(\w+)\}/g) ?? []).map((x) => x.slice(1, -1)).sort();
}

/** 模板 + payload ⇒ 片段（与 renderCalcOutput 的替换规则**逐字一致**） */
function fillTemplate(tpl: string, params: Record<string, string>): string {
  return tpl.replace(
    /\{(\w+)\}/g,
    (_, k: string) => (params[k] != null ? params[k] : '{' + k + '}'),
  );
}

/** 一个「命中实例」＝ 一次生成出来的、含该 code 的文本 */
interface Item {
  text: string;
  variant: string;
  ratioPreserving: boolean;
  source: 'server' | 'static' | 'client';
  inputs: Record<string, string> | null;
}

/** 一条「zh 侧不一致」的原因 */
type ZhReason = 'Z1 占位符不一致' | 'Z2 载荷数字计数不一致' | 'Z3 未登记的词面数字差异';

interface ZhFinding {
  reason: ZhReason;
  detail: string;
  variant: string;
  source: string;
}

interface Inconsistency {
  code: string;
  aliases: string[];
  landed: string;
  landedZh: string | null;
  /** 命中实例数（该 code 出现在多少份生成文本里） */
  instances: number;
  /** en 侧不一致实例数（兜底渲染 ≠ 模板渲染） */
  badInstances: number;
  /** zh 侧不一致实例数 */
  zhBadInstances: number;
  /** zh 侧「已登记的词面差异」实例数（**不是缺陷**，仅诊断计数） */
  zhAllowedWordingInstances: number;
  /** 首个 en 侧不一致实例 */
  first: {
    variant: string;
    ratioPreserving: boolean;
    source: string;
    inputs: Record<string, string> | null;
    line: number;
    fallbackLine: string;
    templateLine: string;
  } | null;
  /** 首个 zh 侧不一致 */
  zhFirst: ZhFinding | null;
  /** zh 侧全部原因（去重） */
  zhReasons: string[];
}

// ── 已知缺陷登记表（2026-11-25 实测得来；**只登记，本轮不修**）──────────────
interface KnownDefect {
  id: string;
  code: string;
  status: string;
  symptom: string;
  rootCause: string;
  fix: string;
  impact: string;
  repro: { slug: string; alias: string; override: Record<string, string> };
}

/**
 * ⚠️ **不得**把「已知缺陷」变成「豁免」：
 *   本脚本**照常报告**它们，并断言「实际不一致集合 == 已知缺陷集合」
 *   ⇒ 将来冒出第 4 条 ⇒ 脚本**必须报出来**（醒目提示行 + 可选非零退出码）。
 */
const KNOWN_DEFECTS: KnownDefect[] = [
  {
    id: 'D-1',
    code: 'calc_out.revenue_projector.row.whatif_runway',
    status: '待修 · 需 user 拍板',
    symptom:
      '兜底渲染「Runway: 60.0 mo → 150.0 mo」，模板渲染成「Runway: 60.0 mo → 60.0 mo」' +
      ' ⇒ **第二个数字被冻结成第一个** ⇒ 用户看到**错误的跑道数字**。',
    rootCause:
      'locale **模板笔误**：en.json / zh.json 里该行写成 {from} → {from}，' +
      '而引擎 src/engines/saas/revenue-projector.ts 的 params 明确是 { from: ..., to: ... }。',
    fix:
      '**只改 locale 模板**（en + zh **各一处**）：第二个 {from} 改成 {to}；' +
      '不动引擎 ⇒ 静态卡片不变 ⇒ G9 仍绿。' +
      '⚠️ **必须 en + zh 两侧同时改** —— 只修一侧的话，本脚本的 zh 侧判据' +
      '（Z1 占位符 / Z2 载荷数字计数 / Z3 词面数字差异）**立刻会报出来**，' +
      '而 zh 页仍在显示错误的跑道数字。',
    impact: 'zh / en 两侧都受影响；**用户可见的错误数字**（最高优先级）。',
    repro: {
      slug: 'solopreneur-revenue-projector',
      alias: 'revenue_projector',
      override: { currentMrr: '2000' },
    },
  },
  {
    id: 'D-2',
    code: 'calc_out.deepseek_api_cost.row.input_cost',
    status: '待修 · 需 user 拍板',
    symptom:
      '兜底渲染「Input:  400     tokens × …」（{tokens} 后 **5** 个空格），' +
      '模板渲染「Input:  400   tokens × …」（{tokens} 后 **3** 个空格）' +
      ' ⇒ **差 2 个空格**（列对齐被破坏）。' +
      '⚠️ 2026-11-25 复审更正：早先写的「模板 4 空格 / 差 1 个空格」是**数错了** —— ' +
      '实测模板 {tokens} 后是 **3** 个空格、兜底是 **5** 个空格 ⇒ **差 2**。',
    rootCause:
      '引擎兜底用 pad(lc(inTokens), 7) 对齐，而模板的 {tokens} 拿的是**未 pad** 的值；' +
      '旧变体集下 tokens 恰好 4 位（1000/2000/3001）⇒ pad 补的 3 格恰好等于模板的 3 格 ⇒ **旧台子盲区**。',
    fix:
      '**完整 4 步（漏一步就会 CI 红 ⇒ 见下面的「漏了哪一步会怎样」）**：' +
      '① **引擎 params 改传 pad 值** —— **照抄同文件 output_cost 的现成配方**即可' +
      '（input_cost 只是**漏了 pad**；同引擎 output_cost 的 params 已经是 ' +
      '{ tokens: pad(lc(outTokens), 7), ... } ⇒ **一致配方同引擎已有现成范式**，下一批不必重新发明）；' +
      '② **locale en + zh 模板** {tokens}   tokens → {tokens} tokens（**各 1 处**）；' +
      '③ **node scripts/codegen-examples.mjs**（重生成 staticExamples）；' +
      '④ **node scripts/codegen-customfn.mjs**（重生成客户端 customFn）。' +
      '⚠️ **漏了哪一步会怎样**（2026-11-25 复审实测）：' +
      '· 漏 ③ ⇒ 引擎 param 值会**直接进 staticExamples 载荷** ⇒ pnpm check:examples 报 ' +
      'DRIFT detected ⇒ **exit 1**；且不一致实例数从 2 涨到 **14**（首个不一致来源变成 static）。' +
      '· 漏 ④ ⇒ 客户端 customFn 块仍吐**未 pad** 的 {tokens: r(m)} ⇒ client 来源仍有 13 条不一致。' +
      '修完必须跑：pnpm check:examples + pnpm check:customfn + G8 + 本诊断脚本' +
      '（期望「实际不一致集合 == 已知缺陷集合」变空集）。',
    impact: 'zh / en 两侧都受影响（列对齐错位 **2** 个空格）。',
    repro: {
      slug: 'solopreneur-deepseek-api-cost-calculator',
      alias: 'deepseek_api_cost',
      override: { inputTokens: '400' },
    },
  },
  {
    id: 'D-3',
    code: 'calc_out.gemini_api_cost.row.input_cost',
    status: '待修 · 需 user 拍板',
    symptom:
      '同 D-2（gemini 与 deepseek 同族 ⇒ 同样的 **2** 空格列对齐偏差：模板 {tokens} 后 3 空格、兜底 5 空格）。',
    rootCause: '同 D-2（同一套 ai-cost 引擎骨架：input_cost 的 params 漏了 pad，output_cost 有 pad）。',
    fix:
      '同 D-2（同族 ⇒ 一并修；**同样要跑 node scripts/codegen-examples.mjs + ' +
      'node scripts/codegen-customfn.mjs 两步重生成**）—— 一致配方照抄同引擎 output_cost。',
    impact: 'zh / en 两侧都受影响（列对齐错位 **2** 个空格）。',
    repro: {
      slug: 'solopreneur-gemini-api-cost-calculator',
      alias: 'gemini_api_cost',
      override: { inputTokens: '400' },
    },
  },
];

// ── zh 侧「词面数字差异」显式 allowlist（第 2 轮新增 · 2026-11-25 全量实测）──
/**
 * ⭐ **这是「合法例外」的显式登记表**，不是「豁免」。
 *   · 触发条件：en 模板片段与 zh 模板片段的**整体数字多重集**不同（判据 Z3）。
 *   · 成因：**英文措辞里的字面数字在中文里换了一种写法** ⇒ 两侧数字**本就该不同**
 *     （「top-quartile」→「前 25%」·「2x」→「翻倍」·「$5M」→「500 万」·
 *      「50K」→「5 万」·「Q1 (Apr 15)」→「Q1（4 月 15 日）」·「#1」→「头号」…）
 *   · 实测：**2,715 个 code 里恰好 51 个命中**，且**全部**是这一类；
 *     allowlist 之外 **0 个** ⇒ 任何**新出现**的数字差异都会被报成不一致。
 *   · ⚠️ **不许养肥**：改 allowlist 条目的数字 = 改一个真实缺陷 ⇒ 下一批必须复核。
 */
const ZH_WORDING_EXCEPTIONS: Record<string, string> = {
  // —— A 组：英文的「分位词」在中文里写成数字 ——
  'calc_out.affiliate_income.row.health_epc_top': 'en「top-quartile」无数字 · zh「前 25%」多一个字面 25%',
  'calc_out.burn_multiple_rule_of_40.row.bench_a_great': 'en「top-quartile」· zh「前 25%」',
  'calc_out.burn_multiple_rule_of_40.row.bench_b_great': 'en「top-quartile」· zh「前 25%」',
  'calc_out.burn_multiple_rule_of_40.row.bench_seed_great': 'en「top-quartile」· zh「前 25%」',
  'calc_out.burn_multiple_rule_of_40.row.tip_healthy': 'en「top-quartile」· zh「前 25%」',
  'calc_out.burn_multiple_rule_of_40.row.tip_top_quartile': 'en「top-quartile」· zh「前 25%」',
  'calc_out.burn_multiple_rule_of_40.row.verdict_rule40_pass': 'en「top-quartile」· zh「前 25%」',
  'calc_out.carrying_cost.row.tip_critical': 'en「bottom-decile」无数字 · zh「后 10%」多一个字面 10%',
  'calc_out.expansion_revenue.row.tip_critical': 'en「top decile / 1 product」· zh「前 10% / 只用一个产品」',
  'calc_out.inventory_turnover.row.tip_good': 'en「bottom-decile」无数字 · zh「后 10%」多一个字面 10%',
  // —— B 组：英文写「倍数 / 翻倍」处的数字，中文改写成「翻倍」（无数字）——
  'calc_out.affiliate_income.row.whatif_double_traffic': 'en「2x traffic」· zh「流量翻倍」（无数字）',
  'calc_out.burn_multiple_rule_of_40.row.whatif_double_growth': 'en「2× growth」· zh「增长翻倍」（无数字）',
  'calc_out.funnel_value.row.milestone_scale_2x': 'en「Scale impressions 2x」· zh「曝光量翻倍」（无数字）',
  'calc_out.hourly_vs_fixed.row.whatif_two_sources': 'en「2 income sources」· zh「两个收入来源」（无数字）',
  'calc_out.safe_convertible_note.row.cap_sensitivity': 'en「at 2× cap」· zh「上限翻倍」（无数字）',
  'calc_out.sponsorship_rate.row.whatif_2x_audience': 'en「2x audience growth」· zh「受众翻倍」（无数字）',
  'calc_out.productivity_score.row.mix_workable': 'en「2x deep work」· zh「是会议的两倍」（无数字）',
  // —— C 组：「每千 / 1K」——
  'calc_out.affiliate_income.row.per_1k_visitors': 'en「Per 1K Visitors」· zh「每千访客」（无数字）',
  'calc_out.label.revenue_1000_clicks': 'en「Revenue/1000 Clicks」· zh「每千次点击收入」（无数字）',
  'calc_out.label.revenue_1000_opens': 'en「Revenue/1000 Opens」· zh「每千次打开收入」（无数字）',
  // —— D 组：「#1 / 头号 / 首要」——
  'calc_out.ai_image_cost.row.use_case_budget': 'en「#1 concern」· zh「排在第一位」（无数字）',
  'calc_out.mrr.row.monthly_churn_critical': 'en「#1 problem」· zh「头号问题」（无数字）',
  'calc_out.saas_valuation.row.health_mid_stage': 'en「#1 multiple driver」· zh「首要驱动因素」（无数字）',
  'calc_out.unit_economics.row.tip_payback_slow': 'en「#1 red flag」· zh「头号红旗」（无数字）',
  // —— E 组：英文用单词、zh 用数字 ——
  'calc_out.cart_abandonment_cost.row.break_even_explanation': 'en「one recovery dollar」· zh「每 1 元 … 换回 1 元」',
  'calc_out.coupon_attribution.row.break_even_one_dollar': 'en「one coupon dollar」· zh「每 1 元 … 换回 1 元」',
  'calc_out.course_pricing.row.hour_of_creation': 'en「per hour invested」· zh「每投入 1 小时」',
  'calc_out.roas.row.health_critical': 'en「per ad dollar」· zh「每花 1 美元」',
  'calc_out.equity_dilution.row.investor_per_pp': 'en「$/pp」· zh「每 1 个百分点」',
  // —— F 组：年份 / 季度 / 倍数（英文用词）——
  'calc_out.employee_cost.row.five_year_total': 'en「5-Year Total」· zh「五年合计」（无数字）',
  'calc_out.employee_cost.row.year1_premium': 'en「Year-1 Premium」· zh「首年溢价」（无数字）',
  'calc_out.label.q1_apr_15': 'en「Q1 (Apr 15)」· zh「Q1（4 月 15 日）」（月份英译中）',
  'calc_out.label.q2_jun_15': 'en「Q2 (Jun 15)」· zh「Q2（6 月 15 日）」',
  'calc_out.label.q3_sep_15': 'en「Q3 (Sep 15)」· zh「Q3（9 月 15 日）」',
  'calc_out.label.q4_jan_15': 'en「Q4 (Jan 15)」· zh「Q4（1 月 15 日）」',
  'calc_out.market_size_estimator.row.whatif_triple_pricing': 'en「Triple pricing」· zh「3 倍定价」',
  // —— G 组：金额单位换算（en 用 K/M · zh 用「万」）——
  'calc_out.affiliate_income.row.tip_conversion_leverage': 'en「50K visitors」· zh「5 万访客」',
  'calc_out.burn_multiple_rule_of_40.row.whatif_add_5m_arr': 'en「$5M ARR」· zh「500 万美元 ARR」',
  'calc_out.sponsorship_rate.row.scale_1k': 'en「At 1,000 audience」· zh「1000 受众时」（仅千分位写法不同）',
  'calc_out.sponsorship_rate.row.scale_10k': 'en「At 10,000 audience」· zh「1 万受众时」',
  'calc_out.sponsorship_rate.row.scale_100k': 'en「At 100,000 audience」· zh「10 万受众时」',
  'calc_out.sponsorship_rate.row.health_tier_micro': 'en「(10K+)」· zh「（1 万+）」',
  'calc_out.rental_yield.row.benchmark_sp500': 'en「S&P comparison」· zh「S&P 500 对比」（指数名）',
  // —— H 组：百分比 / 折扣 / 费率的措辞差异 ——
  'calc_out.churn_rate.row.whatif_combined': 'en「Cut churn 50% + add 50% more」· zh「流失减半 + 新增增加 50%」（en 多一个字面 50%）',
  'calc_out.ltv.row.whatif_v3_max_cac': 'en「Cut churn 50%」· zh「流失率减半」（en 多一个字面 50%）',
  'calc_out.saas_pricing_planner.row.whatif_cut_starter_50': 'en「Cut Starter by 50%」· zh「入门版减半」（en 多一个字面 50%）',
  'calc_out.openai_token.row.health_batch_tip': 'en「(50% discount)」· zh「（5 折）」',
  'calc_out.compound_interest.row.whatif_rate_plus_1': 'en「Increase rate by 1%」· zh「利率提高 1 个百分点」',
  'calc_out.course_pricing.row.whatif_self_host': 'en「(0% fee)」· zh「（0 平台费）」',
  'calc_out.funnel_step.row.break_even_final': 'en「e2e」含字面 2 · zh「端到端转化」（无数字）',
  'calc_out.funnel_step.row.whatif_drop_step': 'en「e2e」含字面 2 · zh「端到端转化」（无数字）',
};

// ── 测量 ────────────────────────────────────────────────────────────────────
const engines = getAllEngines() as any[];
const defaults = codegenDefaults();
const en = JSON.parse(readFileSync(resolve(ROOT, 'src/i18n/locales/en.json'), 'utf8'));
const zh = JSON.parse(readFileSync(resolve(ROOT, 'src/i18n/locales/zh.json'), 'utf8'));

// ⚠️ 防真空绿：引擎注册表返回 0 ⇒ 体检形同虚设（.mjs + tsx 双实例坑）
if (!Array.isArray(engines) || engines.length === 0) {
  console.error('🚨 引擎注册表返回 0 个引擎 ⇒ 体检形同虚设（请用 tsx 跑本脚本）');
  process.exit(1);
}

const agg = new Map<string, { items: Item[]; aliases: Set<string> }>();
for (const meta of TOKENIZED) {
  const e = engines.find((x) => x.slug === meta.slug);
  if (!e) continue;
  const base = (defaults[meta.slug] ?? syntheticInputs(e)) as Record<string, string>;
  const gen = e.generate ?? e.calculate;
  const items: Item[] = [];
  for (const v of variantsOf(base)) {
    try {
      items.push({
        text: (gen(v.inputs) || []).join(NL),
        variant: v.name,
        ratioPreserving: v.ratioPreserving,
        source: 'server',
        inputs: v.inputs,
      });
    } catch {
      /* 输入无效 ⇒ 跳过 */
    }
  }
  for (const ex of e.staticExamples ?? []) {
    items.push({ text: String(ex), variant: 'staticExample', ratioPreserving: true, source: 'static', inputs: null });
  }
  const cf = e.clientConfig && e.clientConfig.customFn;
  if (cf) {
    try {
      const fn = new Function('inputs', 'pick', 'fill', cf);
      for (const v of variantsOf(base)) {
        try {
          items.push({
            text: (fn(v.inputs ?? {}, (x: any) => x, (a: any, b: any) => b) || []).join(NL),
            variant: v.name,
            ratioPreserving: v.ratioPreserving,
            source: 'client',
            inputs: v.inputs,
          });
        } catch {
          /* 该变体在客户端侧不可用 ⇒ 跳过 */
        }
      }
    } catch {
      /* 忽略 */
    }
  }
  for (const it of items) {
    for (const code of codesOf(it.text)) {
      if (!agg.has(code)) agg.set(code, { items: [], aliases: new Set() });
      const g = agg.get(code)!;
      g.items.push(it);
      g.aliases.add(meta.alias);
    }
  }
}

/** 首个不同的行（兜底渲染 vs 模板渲染） */
function firstDiff(a: string, b: string): { line: number; a: string; b: string } {
  const la = a.split(NL);
  const lb = b.split(NL);
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) return { line: i + 1, a: la[i] ?? '', b: lb[i] ?? '' };
  }
  return { line: 0, a: '', b: '' };
}

const inconsistencies: Inconsistency[] = [];
let totalCodes = 0;
let noLocale = 0;
let noZhLocale = 0;
let zhTokenOccurrences = 0;
let zhTokenOccurrencesWithParams = 0;
let wordingAllowedHits = 0;

for (const [code, g] of agg) {
  totalCodes++;
  const landed = typeof en[code] === 'string' ? (en[code] as string) : null;
  if (landed === null) {
    noLocale++;
    continue; // 与 G8 同口径：locale 里没这个键 ⇒ 不算「不一致」（那是缺键，另一类问题）
  }
  const landedZh = typeof zh[code] === 'string' ? (zh[code] as string) : null;
  if (landedZh === null) noZhLocale++;

  // ── Z1：占位符一致性（en 模板 vs zh 模板，静态逐 code）────────────────────
  const enPlaceholders = placeholdersOf(landed);
  const zhPlaceholders = landedZh === null ? [] : placeholdersOf(landedZh);
  const z1Bad = landedZh !== null && enPlaceholders.join('|') !== zhPlaceholders.join('|');

  // ── 按 code 定位 token 出现（含 params 组）的 regex ──────────────────────
  const codeRe = new RegExp('\\$' + escapeRe(code) + '(\\{[^{}]*\\})?', 'g');

  let badInstances = 0;
  let first: Inconsistency['first'] = null;
  let zhBadInstances = 0;
  let zhAllowedWordingInstances = 0;
  let zhFirst: ZhFinding | null = null;
  const zhReasons = new Set<string>();

  for (const it of g.items) {
    // ── en 侧（G8 口径，一字不改）：兜底渲染 ≡ en 模板渲染 ──────────────────
    const fb = renderCalcOutput(it.text, {});
    const tp = renderCalcOutput(it.text, { [code]: landed });
    if (fb !== tp) {
      badInstances++;
      if (!first) {
        const d = firstDiff(fb, tp);
        first = {
          variant: it.variant,
          ratioPreserving: it.ratioPreserving,
          source: it.source,
          inputs: it.inputs,
          line: d.line,
          fallbackLine: d.a,
          templateLine: d.b,
        };
      }
    }

    if (landedZh === null) continue;

    // ── zh 侧：逐次 token 出现做「片段级」比较（同一份 payload）─────────────
    codeRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = codeRe.exec(it.text)) !== null) {
      zhTokenOccurrences++;
      let params: Record<string, string> = {};
      if (!m[1]) {
        // 无 params 的 token（纯文案）⇒ 片段 = 模板原文
      } else {
        zhTokenOccurrencesWithParams++;
        try {
          const parsed = JSON.parse(decodeHtmlEntities(m[1]));
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            params = parsed as Record<string, string>;
          }
        } catch {
          continue; // 畸形 params ⇒ 跳过（另一个问题：token 结构坏了）
        }
      }
      const enFrag = fillTemplate(landed, params);
      const zhFrag = fillTemplate(landedZh, params);

      // Z2：载荷数字计数一致性（同一份 payload ⇒ 数字必须一样多）
      const payloadNums: string[] = [];
      for (const v of Object.values(params)) payloadNums.push(...numTokens(String(v)));
      if (payloadNums.length) {
        const te = tally(numTokens(enFrag));
        const tz = tally(numTokens(zhFrag));
        const bad: string[] = [];
        for (const t of new Set(payloadNums)) {
          const a = te.get(t) ?? 0;
          const b = tz.get(t) ?? 0;
          if (a !== b) bad.push(t + '（en ' + a + ' 次 · zh ' + b + ' 次）');
        }
        if (bad.length) {
          zhBadInstances++;
          zhReasons.add('Z2');
          if (!zhFirst) {
            zhFirst = {
              reason: 'Z2 载荷数字计数不一致',
              detail: bad.join(' ; '),
              variant: it.variant,
              source: it.source,
            };
          }
          continue;
        }
      }

      // Z3：词面数字差异（整体数字多重集）—— allowlist 内的**不是缺陷**
      const diff = multisetDiff(numTokens(enFrag), numTokens(zhFrag));
      if (diff.enOnly.length || diff.zhOnly.length) {
        const allowed = Object.prototype.hasOwnProperty.call(ZH_WORDING_EXCEPTIONS, code);
        if (allowed) {
          zhAllowedWordingInstances++;
          wordingAllowedHits++;
        } else {
          zhBadInstances++;
          zhReasons.add('Z3');
          if (!zhFirst) {
            zhFirst = {
              reason: 'Z3 未登记的词面数字差异',
              detail:
                'en 独有 ' +
                JSON.stringify(diff.enOnly) +
                ' · zh 独有 ' +
                JSON.stringify(diff.zhOnly) +
                '（该 code 不在 ZH_WORDING_EXCEPTIONS 登记表里）',
              variant: it.variant,
              source: it.source,
            };
          }
        }
      }
    }
  }

  if (z1Bad) {
    zhBadInstances++;
    zhReasons.add('Z1');
    if (!zhFirst) {
      zhFirst = {
        reason: 'Z1 占位符不一致',
        detail:
          'en 占位符 ' +
          JSON.stringify(enPlaceholders) +
          ' · zh 占位符 ' +
          JSON.stringify(zhPlaceholders) +
          '（两侧引用的 param 不是同一个集合）',
        variant: '-',
        source: 'locale',
      };
    }
  }

  if (badInstances > 0 || zhBadInstances > 0) {
    inconsistencies.push({
      code,
      aliases: [...g.aliases],
      landed,
      landedZh,
      instances: g.items.length,
      badInstances,
      zhBadInstances,
      zhAllowedWordingInstances,
      first,
      zhFirst,
      zhReasons: [...zhReasons].sort(),
    });
  }
}
inconsistencies.sort((a, b) => a.code.localeCompare(b.code));

// ── 已知缺陷集合 vs 实际不一致集合（**对账**）─────────────────────────────
const actualSet = inconsistencies.map((r) => r.code).sort();
const knownSet = KNOWN_DEFECTS.map((d) => d.code).sort();
const unexpected = actualSet.filter((c) => !knownSet.includes(c));
const vanished = knownSet.filter((c) => !actualSet.includes(c));
const setMatch = unexpected.length === 0 && vanished.length === 0;

// ── 复现校验（用登记的复现输入实跑一遍 ⇒ 证明「现象」这一栏是真的）─────────
interface ReproResult {
  id: string;
  code: string;
  ok: boolean;
  note: string;
  fallbackLine: string;
  templateLine: string;
  zhTemplateLine: string;
  zhSideOk: boolean;
  inputs: Record<string, string> | null;
}
const repros: ReproResult[] = [];
for (const d of KNOWN_DEFECTS) {
  const r = d.repro;
  const e = engines.find((x) => x.slug === r.slug);
  if (!e) {
    repros.push({ id: d.id, code: d.code, ok: false, note: '找不到引擎 ' + r.slug, fallbackLine: '', templateLine: '', zhTemplateLine: '', zhSideOk: false, inputs: null });
    continue;
  }
  const base = (defaults[r.slug] ?? syntheticInputs(e)) as Record<string, string>;
  const inputs = { ...base, ...r.override };
  const gen = e.generate ?? e.calculate;
  let text = '';
  try {
    text = (gen(inputs) || []).join(NL);
  } catch (err) {
    repros.push({ id: d.id, code: d.code, ok: false, note: '复现输入跑挂了：' + String(err), fallbackLine: '', templateLine: '', zhTemplateLine: '', zhSideOk: false, inputs });
    continue;
  }
  const landed = typeof en[d.code] === 'string' ? (en[d.code] as string) : '';
  const landedZh = typeof zh[d.code] === 'string' ? (zh[d.code] as string) : '';
  const fb = renderCalcOutput(text, {});
  const tp = renderCalcOutput(text, { [d.code]: landed });
  const diff = firstDiff(fb, tp);
  // zh 侧复现：占位符一致性
  const enPh = placeholdersOf(landed);
  const zhPh = placeholdersOf(landedZh);
  const zhSideOk = landedZh !== '' && enPh.join('|') === zhPh.join('|');
  const zhLine = landedZh === '' ? '' : renderCalcOutput(text, { [d.code]: landedZh });
  const zhDiff = landedZh === '' ? { a: '', b: '' } : firstDiff(tp, zhLine);
  repros.push({
    id: d.id,
    code: d.code,
    ok: fb !== tp,
    note:
      fb !== tp
        ? '✔ 复现成功（en 侧：兜底 ≠ 模板）'
        : '⚠️ 复现输入下**没有**复现（登记表可能已过期）',
    fallbackLine: diff.a,
    templateLine: diff.b,
    zhTemplateLine: zhDiff.b,
    zhSideOk,
    inputs,
  });
}

const summary = {
  tool: 'p168-locale-roundtrip-nonratio.ts',
  role: '诊断工具（默认 exit 0；--strict 只对「未知的不一致」exit 1）',
  engines: engines.length,
  tokenizedEngines: TOKENIZED.length,
  totalCodes,
  codesWithoutLocaleEntry: noLocale,
  codesWithoutZhLocaleEntry: noZhLocale,
  zhTokenOccurrences,
  zhTokenOccurrencesWithParams,
  zhWordingAllowlistSize: Object.keys(ZH_WORDING_EXCEPTIONS).length,
  zhWordingAllowedHits: wordingAllowedHits,
  inconsistencyCount: inconsistencies.length,
  setMatch,
  unexpected,
  vanished,
  inconsistencies,
  knownDefects: KNOWN_DEFECTS,
  zhWordingExceptions: ZH_WORDING_EXCEPTIONS,
  repros,
};

if (JSON_OUT) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    '模板 code ' + totalCodes +
      ' 个（TOKENIZED ' + TOKENIZED.length + ' 引擎 × 变体集；引擎注册表 ' + engines.length + ' 个）' +
      ' · locale 现值与兜底渲染不一致 ' + inconsistencies.length + ' 个' +
      ' · locale 里无此键 ' + noLocale + ' 个（缺键类问题，不在本脚本口径内）' +
      ' · zh 侧无此键 ' + noZhLocale + ' 个',
  );
  console.log(
    'zh 侧测量：token 出现 ' + zhTokenOccurrences + ' 次（其中带 params ' + zhTokenOccurrencesWithParams +
      ' 次）· 词面差异命中 allowlist ' + wordingAllowedHits + ' 次（allowlist 共 ' +
      Object.keys(ZH_WORDING_EXCEPTIONS).length + ' 条）',
  );
  console.log('');
  console.log('—— 不一致清单（**待修的真实缺陷**）——');
  if (!inconsistencies.length) {
    console.log('  （无）');
  }
  for (const r of inconsistencies) {
    console.log(
      '### ' + r.code + ' | ' + r.aliases.join(',') +
        ' | 命中实例 ' + r.instances +
        ' · en 侧不一致实例 ' + r.badInstances +
        ' · zh 侧不一致实例 ' + r.zhBadInstances +
        (r.zhAllowedWordingInstances ? ' · 已登记词面差异实例 ' + r.zhAllowedWordingInstances : ''),
    );
    console.log('  locale.en 现值: ' + JSON.stringify(r.landed));
    console.log('  locale.zh 现值: ' + JSON.stringify(r.landedZh));
    if (r.first) {
      console.log(
        '  首个 en 侧不一致（第 ' + r.first.line + ' 行 · 变体「' + r.first.variant + '」' +
          (r.first.ratioPreserving ? '〔保比〕' : '〔**非等比**〕') +
          ' · 来源 ' + r.first.source + '）：',
      );
      console.log('    兜底: ' + JSON.stringify(r.first.fallbackLine));
      console.log('    模板: ' + JSON.stringify(r.first.templateLine));
      console.log('    输入(JSON): ' + JSON.stringify(r.first.inputs));
    }
    if (r.zhFirst) {
      console.log('  首个 zh 侧不一致（' + r.zhFirst.reason + ' · 变体「' + r.zhFirst.variant + '」· 来源 ' + r.zhFirst.source + '）：');
      console.log('    ' + r.zhFirst.detail);
    }
  }
  console.log('');
  console.log('—— 已知缺陷登记表（' + KNOWN_DEFECTS.length + ' 条 · **只登记，本轮不修**）——');
  for (const d of KNOWN_DEFECTS) {
    console.log('[' + d.id + '] ' + d.code + ' | ' + d.status);
    console.log('  现象: ' + d.symptom);
    console.log('  根因: ' + d.rootCause);
    console.log('  修法: ' + d.fix);
    console.log('  影响面: ' + d.impact);
    const rp = repros.find((x) => x.id === d.id);
    if (rp) {
      console.log('  复现校验: ' + rp.note);
      if (rp.fallbackLine || rp.templateLine) {
        console.log('    兜底: ' + JSON.stringify(rp.fallbackLine));
        console.log('    模板: ' + JSON.stringify(rp.templateLine));
        console.log('    复现输入(JSON): ' + JSON.stringify(rp.inputs));
      }
      console.log('    zh 侧占位符一致: ' + (rp.zhSideOk ? '✔ 是' : '✘ 否'));
      if (rp.zhTemplateLine) console.log('    zh 模板渲染: ' + JSON.stringify(rp.zhTemplateLine));
    }
  }
  console.log('');
  console.log('—— 实际不一致集合 vs 已知缺陷集合（对账）——');
  if (setMatch) {
    console.log('  ✔ 一致（' + actualSet.length + ' 条）：实际不一致集合 == 已知缺陷集合');
  } else {
    console.log('  🚨⚠️ **实际不一致集合 != 已知缺陷集合** ⇒ 必须人工确认');
    if (unexpected.length) {
      console.log('  🚨 新增（**不在登记表里** ⇒ 必须登记 + 修）：');
      for (const c of unexpected) console.log('     · ' + c);
    }
    if (vanished.length) {
      console.log('  ✔ 已消失（登记表里有、但这次**en + zh 两侧都不复现** ⇒ 可能已修）：');
      console.log('     ⚠️ **须 en + zh 两侧同时不复现才可从登记表移除** ⇒ 请同步更新 KNOWN_DEFECTS 登记表');
      for (const c of vanished) console.log('     · ' + c);
    }
  }
  console.log('');
  if (STRICT) {
    if (unexpected.length > 0) {
      console.log('退出码：1（--strict 已开 ⇒ 出现「未知的不一致」（实际集合 ⊋ 已知集合）⇒ exit 1）');
    } else {
      console.log(
        '退出码：0（--strict 已开 · 实际集合 ⊆ 已知集合 ⇒ 已修不挡路、仅提示' +
          (vanished.length ? '（有 ' + vanished.length + ' 条已修 ⇒ 请同步更新 KNOWN_DEFECTS 登记表）' : '') +
          '）',
      );
    }
  } else {
    console.log('退出码：0（诊断工具，不参与 CI 判定 · 加 --strict 只对「未知的不一致」exit 1）');
  }
}

// ⭐ --strict 的语义（第 2 轮）：**只在出现「未知的不一致」时 exit 1**。
//   已知欠账（实际集合 == 已知集合）不挡路；某条已修（实际集合 ⊂ 已知集合）也**不挡路**
//   ⇒ 已知 3 条在场时 CI 恒绿，而**新增第 4 条立刻挡路**。
if (STRICT && unexpected.length > 0) process.exit(1);
process.exit(0);
