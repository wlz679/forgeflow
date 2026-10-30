#!/usr/bin/env node
// P162 — GPU 引擎 FAQ 的价格单一真相源守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// P161 把 **GPU 主题页 + 工具页 prose** 的价格改成了派生，但**引擎 FAQ** 这一层
// 还在手写 —— 而它是同一个工具的**第三个页面**（工具页的 <FAQ> + JSON-LD）。
//
// 实测（2026-10-30，`src/engines/ai-cost/gpu-cloud-cost-calculator.ts` 的 faq 数组，
// 16 条里 9 条带价格/折扣/型号）：
//   · **三条档位带全部写错**：Spot「40-60% cheaper」实为 30-60%；Reserved「15-30%
//     discount」实为 10-30%；「Reserved: 30-60% off」**把现货带写成了预留带**；
//     「Spot: 60-70% off」「Spot: 60-80% off」实为 30-60%。
//   · **三个型号数据集里根本没有**：A10G、L4、T4（还有 A100 40GB）。
//   · **三个实例价无真相源**：AWS p4d $32/hr、GCP a2-ultragpu $30/hr、Azure NDv5 $35/hr
//     —— 数据集只有 per-GPU-hour，没有实例级价。
//   · **两处 H100 区间漂了**：「H100 80GB ($3-5/hour)」实为 $1.69-$4.20。
//   · **CoreWeave** 出现在编辑口径里（数据集的 gpu.providers 没有它）。
//   · **存储/出口单价其实在数据集里**（gpu.storagePerGB = 0.1、gpu.egressPerGB = 0.08）
//     ⇒ P161 把 md 里的 $0.10/GB、$0.08/GB 当成「计算器自己的建模假设」放进白名单，
//     是**归因错误** ⇒ P162 一并改为派生。
//
// ⚠️ **覆盖面本身是缺陷**：P160 的 `engine-faq-live-price-guard` 只覆盖 5 个 LLM
//    引擎（`LLM_ENGINE_FILES` 写死）⇒ **GPU 引擎的 FAQ 在本守卫之前不在任何价格
//    守卫的覆盖内**。本守卫是它第一次被看住。
//
// 本守卫盯住十三条性质：
//
//   1. **无手写单价**：数据集拥有的单价形态（per-GPU-hour、per-GB）不许手写。
//   2. **无手写折扣带**：档位带必须来自 token（「数字区间 + %」且紧邻折扣词 = 违规）。
//   3. **无数据集没有的型号/供应商**：A10G / L4 / T4 / A100 40GB / CoreWeave。
//   4. **token 可解析**：FAQ 里每个 token 都能被解析（解析失败 = 构建期炸）。
//   5. **三处同步**：引擎源 / en.json / zh.json 逐条对齐 + **token 引用集一致** +
//      en.json 的问题不得重复（zh 页面按 index 取值 ⇒ 错位 = 问答配错）。
//   6. **token 数量下限**：防「把价格全删掉」钻空子。
//   7. **关键派生值 == 独立写死的字面量**。
//   8. **名实一致**：价格 token 的型号必须与同条里提到的型号对得上。
//   9. **每个 token 种类都真的被实现**（跑一次真实替换，断言 token 被吃掉）。
//  10. **白名单不腐烂**。
//  11. **派生月额被独立重算**（100GB/1TB 的月存储费 = 容量 × 数据集单价），且**逐来源**查。
//  12. **供应商名必须走 token**：数据集的 `gpu.providers[*].name` 是显示名的真相源，
//      FAQ 答案里不许再手写「Vast.ai / RunPod / AWS …」（问题 q 是标题，不参与审计 ——
//      与 P160 守卫「价格只扫答案」的惯例一致）。
//  13. **钉死表与 FAQ 的 token 用法完全一致**：FAQ 里不许出现表外的 token，
//      表里也不许躺着没人用的僵尸行（否则「把某个 token 的 payload 写反」这类
//      变异在抽查式表下是**看不见**的）。
//
// ⚠️ 两类「百分比」必须分清，否则守卫要么误红、要么有洞：
//   · **供应商折扣带**（现货 30-60% / 预留 10-30%）⇒ 数据集拥有（spotMult / reservedMult）
//     ⇒ 必须走 token，手写即违规。
//   · **用户侧优化估计**（FAQ 5 的「六项优化合计降本 70-90%」）⇒ 数据集**不建模**
//     （数据集建模的是供应商定价，不是你的优化收益）⇒ 走**锚定白名单**（见
//     ALLOWED_RAW_BANDS）：白名单锚在完整措辞上，所以「把现货带换成 70-90% cheaper」
//     这种变异**抓得到**（锚点不匹配 ⇒ 不被豁免 ⇒ 落回断言 2）。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//    数据集本身（`src/data/ai-pricing.json`）是真相源，直接读它比对 —— 而不是调
//    `live-price.ts` 的导出函数（那会让判据和实现同源）。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import { resolveLiveTokens, hasUnresolvedToken } from '../src/lib/live-price.ts';

const root = resolve(import.meta.dirname, '..');

const GPU_SLUG = 'solopreneur-gpu-cloud-cost-calculator';
const GPU_ENGINE_FILE = 'gpu-cloud-cost-calculator.ts';

const GPU_PROVIDERS = (PRICING as any).gpu.providers as Record<
  string,
  { name: string; spotMult: number; reservedMult: number; rates: Record<string, number>; order: number }
>;

/**
 * 白名单：FAQ 里**保留手写**的金额 —— 数据集推导不出来（或它是市场区间形态）。
 * 每条都写明理由，且必须仍然出现在文本里（腐烂 = 红）。
 *
 * ⚠️ 用**正则**而不是精确字符串：精确字符串会被更长的条目抢先命中
 * （"$0.05-0.12/GB" 里的 "0.05" 会把 "$0.05" 抢先拆掉）。
 */
const ALLOWED_RAW_PRICES: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\$0\.05-0\.12\/GB\b/,
    reason: '超大规模云出口流量的**市场区间** —— 数据集只给 $0.08 的点值，区间是市场形态',
  },
];

/**
 * 白名单：**编辑估计的百分比带**（不是供应商折扣带）。
 *
 * ⚠️ 必须锚在**完整措辞**上（不是裸的 "70-90%"）：裸数字的白名单会给变异开后门 ——
 * 把现货带改写成 "70-90% cheaper" 也会被豁免 ⇒ 守卫瞎掉。锚在措辞上则不行
 * （锚点不匹配 ⇒ 不被豁免 ⇒ 落回断言 2 被抓）。
 */
const ALLOWED_RAW_BANDS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /70-90% cost reduction/,
    reason:
      '编辑估计：六项优化手段（spot / 选型 / 混合精度 / 批处理 / 自动关机 / 量化）合计后的' +
      '**自建成本降幅** —— 数据集建模的是供应商定价，不建模用户侧优化收益',
  },
  {
    pattern: /降低 70-90% 成本/,
    reason: '同上（中文版）',
  },
];

/**
 * 「数据集拥有的单价」的手写形态：
 *   $A/hr · $A/hour · $A/小时      每 GPU 小时价
 *   $A/GB · $A/GB/month            每 GB 单价（存储 / 出口）
 * 刻意**不**匹配 $A/mo（那是「容量 × 单价」推出的月额）、$A-$B 区间（区间里两个
 * 数都可能带单位，交给区间形状的断言）、$2K/$50K 阈值（那是自建 vs API 的分界，
 * 与 GPU 单价无关）。
 */
const RAW_GPU_PRICE = /\$[\d,.]+(?:\s*[-–]\s*[\d,.]+)?\s*\/\s*(?:hr|hour|hours|小时|GB)\b/gi;

/**
 * 手写的**折扣带**形状：「数字区间 + %」且紧邻折扣词。
 *
 * ⚠️ 中文「低」**不能**进词表：它有歧义（低延迟 / 低于 / 最低）。实测 GPU 内容里
 * 合法的「热备溢价 5-15%」旁边就跟着「跨云低延迟」⇒ 「低」只认**紧邻**写法。
 */
const DISCOUNT_BAND_RE = /\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?\s*%/g;
const DISCOUNT_WORD_RE = /\boff\b|\bdiscount(?:s|ed)?\b|\bcheaper\b|\bsavings?\b|折扣|便宜|优惠/i;
const ZH_LOW_ADJACENT_RE = /低\s*$/;
const DISCOUNT_WINDOW = 16;

/** 数据集里**没有**的型号 / 供应商（GPU 引擎的 FAQ 里不许出现它们） */
const FORBIDDEN_TERMS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bA10G\b/, reason: '数据集的 gpu 段没有 A10G 这个型号' },
  { pattern: /\bL4\b/, reason: '数据集的 gpu 段没有 L4（是 L40S）' },
  { pattern: /\bT4\b/, reason: '数据集的 gpu 段没有 T4' },
  { pattern: /\bA100 40GB\b/, reason: '数据集的 gpu 段只有 A100 80GB' },
  { pattern: /\bCoreWeave\b/, reason: '数据集的 gpu.providers 没有 CoreWeave' },
];

/**
 * FAQ 里**必须**用到的 token 种类（钉死清单）。
 * ⚠️ 每一种都必须真的被实现 —— 少一种，编辑就会拿手写值补位。
 */
const REQUIRED_TOKEN_KINDS = [
  'liveGpuProviderRange',
  'liveGpuProviderName',
  'liveGpuRange',
  'liveGpuRate',
  'liveGpuOffSpot',
  'liveGpuOffReserved',
  'liveGpuRatio',
  'liveGpuStoragePerGB',
  'liveGpuEgressPerGB',
] as const;

/**
 * **完整钉死表**：FAQ 用到的**每一个** token 字面量 → 它必须解析成的值。
 *
 * ⚠️ 为什么是「完整」而不是抽查几条：抽查只能证明「那几个 token 对」，
 *    证明不了「FAQ 里没有别的 token 在乱指」。完整表带来两条额外的牙：
 *      · FAQ 里出现**表外**的 token ⇒ 红（编辑偷偷加了一个没人钉的 token）
 *      · 表里的 token **没人用** ⇒ 红（僵尸行 / token 被删了）
 *    ⇒ 「把 `{{liveGpuRatio:vastai|A100|on|aws|A100|on}}` 的 payload 顺序写反」
 *      这类变异，在抽查式表下是**看不见**的（抽查的那几个 token 根本没被改）。
 *
 * 期望值全部是**独立写死**的字面量（照数据集手算），不是从被测模块导出的。
 *
 *   vastai 跨型号区间     = A6000 $0.35 ~ H200 $2.20
 *   runpod 跨型号区间     = A6000 $0.39 ~ H200 $2.49
 *   lambdalabs 跨型号区间 = A6000 $0.50 ~ H200 $2.80
 *   H100 跨供应商按需区间 = Vast.ai $1.69 ~ GCP $4.20
 *   L40S 跨供应商按需区间 = Vast.ai $0.59 ~ AWS $1.20
 *   A100 跨供应商按需区间 = Vast.ai $0.69 ~ AWS $3.50
 *   RTX4090 跨供应商区间  = Vast.ai $0.44 ~ AWS $0.80
 *   AWS / Vast.ai (A100)   = 3.50 / 0.69 = 5.07 → 5.1
 *   GCP / Vast.ai (A100)   = 2.80 / 0.69 = 4.06 → 4.1
 *   Azure / Vast.ai (A100)= 3.00 / 0.69 = 4.35 → 4.3
 *   现货折扣带             = 30-60%（AWS 60% … Lambda 30%）
 *   预留折扣带             = 10-30%（AWS 30% … Lambda 10%）
 *   存储单价               = $0.10/GB · 出口单价 = $0.08/GB
 *   L40S 最低按需单价      = $0.59（Vast.ai）
 *   20×L40S 24/7 30 天    = 20 × 24 × 30 × $0.59 = $8,496.00
 */
const EXPECTED_VALUES: Array<{ token: string; expected: string; what: string }> = [
  { token: '{{liveGpuProviderRange:vastai}}', expected: '$0.35-$2.20', what: 'Vast.ai 跨型号按需区间' },
  { token: '{{liveGpuProviderRange:runpod}}', expected: '$0.39-$2.49', what: 'RunPod 跨型号按需区间' },
  { token: '{{liveGpuProviderRange:lambdalabs}}', expected: '$0.50-$2.80', what: 'Lambda Labs 跨型号按需区间' },
  { token: '{{liveGpuRange:H100}}', expected: '$1.69-$4.20', what: 'H100 跨供应商按需区间' },
  { token: '{{liveGpuRange:L40S}}', expected: '$0.59-$1.20', what: 'L40S 跨供应商按需区间' },
  { token: '{{liveGpuRange:A100}}', expected: '$0.69-$3.50', what: 'A100 跨供应商按需区间' },
  { token: '{{liveGpuRange:RTX4090}}', expected: '$0.44-$0.80', what: 'RTX 4090 跨供应商按需区间' },
  { token: '{{liveGpuRatio:vastai|A100|on|aws|A100|on}}', expected: '5.1', what: 'AWS / Vast.ai 的 A100 倍数' },
  { token: '{{liveGpuRatio:vastai|A100|on|gcp|A100|on}}', expected: '4.1', what: 'GCP / Vast.ai 的 A100 倍数' },
  { token: '{{liveGpuRatio:vastai|A100|on|azure|A100|on}}', expected: '4.3', what: 'Azure / Vast.ai 的 A100 倍数' },
  { token: '{{liveGpuOffSpot}}', expected: '30-60', what: '现货折扣带' },
  { token: '{{liveGpuOffReserved}}', expected: '10-30', what: '预留折扣带' },
  { token: '{{liveGpuStoragePerGB}}', expected: '$0.10', what: '存储单价' },
  { token: '{{liveGpuEgressPerGB}}', expected: '$0.08', what: '出口单价' },
  { token: '{{liveGpuRate:min|L40S}}', expected: '$0.59', what: 'L40S 最低按需单价' },
  { token: '{{liveGpuMonthly:min|L40S|on|20|24}}', expected: '$8,496.00', what: '20×L40S 24/7 30 天月账单' },
  { token: '{{liveGpuProviderName:vastai}}', expected: 'Vast.ai', what: '供应商显示名' },
  { token: '{{liveGpuProviderName:runpod}}', expected: 'RunPod', what: '供应商显示名' },
  { token: '{{liveGpuProviderName:lambdalabs}}', expected: 'Lambda Labs', what: '供应商显示名' },
  { token: '{{liveGpuProviderName:aws}}', expected: 'AWS', what: '供应商显示名' },
  { token: '{{liveGpuProviderName:gcp}}', expected: 'GCP', what: '供应商显示名' },
  { token: '{{liveGpuProviderName:azure}}', expected: 'Azure', what: '供应商显示名' },
];

// ─────────────────────────────────────────────────────────────
// 读取三处来源
// ─────────────────────────────────────────────────────────────

const FAQ_ENTRY_RE =
  /\{\s*q:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,\s*a:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,?\s*\}/g;

function unescapeTs(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/** 读引擎文件里 faq: [...] 数组的 {q,a} 条目（按源码顺序） */
function readEngineFaq(file: string): Array<{ q: string; a: string }> {
  const src = readFileSync(join(root, 'src/engines/ai-cost', file), 'utf-8');
  const howIdx = src.indexOf('\n  howToUse:');
  assert.ok(howIdx > 0, `${file}: cannot find howToUse: marker`);
  const start = src.lastIndexOf('faq: [', howIdx);
  assert.ok(start > 0, `${file}: cannot find faq: [ marker`);
  const block = src.slice(start, howIdx);
  const out: Array<{ q: string; a: string }> = [];
  let m: RegExpExecArray | null;
  FAQ_ENTRY_RE.lastIndex = 0;
  while ((m = FAQ_ENTRY_RE.exec(block)) !== null) {
    out.push({ q: unescapeTs(m[1]!.slice(1, -1)), a: unescapeTs(m[2]!.slice(1, -1)) });
  }
  return out;
}

function readLocale(locale: 'en' | 'zh'): Record<string, string> {
  return JSON.parse(
    readFileSync(join(root, 'src/i18n/locales', `${locale}.json`), 'utf-8'),
  ) as Record<string, string>;
}

interface FaqEntry {
  where: 'engine' | 'en' | 'zh';
  index: number;
  q: string;
  a: string;
}

/** GPU 引擎的 FAQ —— 引擎源 + en + zh 三处 */
function collectFaq(): FaqEntry[] {
  const en = readLocale('en');
  const zh = readLocale('zh');
  const entries = readEngineFaq(GPU_ENGINE_FILE);
  const out: FaqEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    out.push({ where: 'engine', index: i, q: entries[i]!.q, a: entries[i]!.a });
    out.push({
      where: 'en',
      index: i,
      q: en[`tools.${GPU_SLUG}.faq.${i}.q`] ?? '',
      a: en[`tools.${GPU_SLUG}.faq.${i}.a`] ?? '',
    });
    out.push({
      where: 'zh',
      index: i,
      q: zh[`tools.${GPU_SLUG}.faq.${i}.q`] ?? '',
      a: zh[`tools.${GPU_SLUG}.faq.${i}.a`] ?? '',
    });
  }
  return out;
}

/** 去掉白名单条目后的文本（用于扫手写价 / 手写带） */
function stripWhitelist(text: string): string {
  let out = text;
  for (const { pattern } of [...ALLOWED_RAW_PRICES, ...ALLOWED_RAW_BANDS]) {
    out = out.replace(new RegExp(pattern.source, 'g'), ' ');
  }
  return out;
}

/** 一段文本里用到的所有 GPU token 种类 */
function tokenKindsIn(text: string): Set<string> {
  const kinds = new Set<string>();
  for (const m of text.matchAll(/\{\{(liveGpu[A-Za-z]*)(?::[^{}]+)?\}\}/g)) {
    kinds.add(m[1]!);
  }
  return kinds;
}

/** 一段文本里所有 `{{liveGpu...}}` token 的完整字面量 */
function tokensIn(text: string): string[] {
  return [...text.matchAll(/\{\{liveGpu[A-Za-z]*(?::[^{}]+)?\}\}/g)].map((m) => m[0]);
}

/**
 * 一段文本里所有 token 的**完整字面量（含 payload）**，排序后返回。
 *
 * ⚠️ 排序 = 顺序不同不算违规；**重复保留** = 用一次 ≠ 用两次（zh 少写一个 token
 *    会让页面少渲染一个价格 ⇒ 算违规）。
 */
function tokenRefs(text: string): string[] {
  return tokensIn(text).slice().sort();
}

// ─────────────────────────────────────────────────────────────
// 1. 无手写单价
// ─────────────────────────────────────────────────────────────
test('P162: GPU 引擎 FAQ 里不再有手写的每 GPU 小时价 / 每 GB 单价', () => {
  const violations: string[] = [];
  for (const { where, index, a } of collectFaq()) {
    if (!a) continue;
    const text = stripWhitelist(a);
    for (const m of text.matchAll(RAW_GPU_PRICE)) {
      violations.push(`${where} FAQ[${index}]: 手写单价 ${m[0]}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    'GPU FAQ 里的每 GPU 小时价与每 GB 单价必须走 token（数据集拥有它们）：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 2. 无手写折扣带
// ─────────────────────────────────────────────────────────────
test('P162: GPU 引擎 FAQ 里没有手写的折扣带', () => {
  const violations: string[] = [];
  for (const { where, index, a } of collectFaq()) {
    if (!a) continue;
    const text = stripWhitelist(a);
    for (const m of text.matchAll(DISCOUNT_BAND_RE)) {
      const start = m.index!;
      const end = start + m[0].length;
      const window = text
        .slice(Math.max(0, start - DISCOUNT_WINDOW), Math.min(text.length, end + DISCOUNT_WINDOW))
        .replace(/\s+/g, ' ');
      const zhAdjacent = ZH_LOW_ADJACENT_RE.test(text.slice(Math.max(0, start - 6), start));
      if (DISCOUNT_WORD_RE.test(window) || zhAdjacent) {
        violations.push(`${where} FAQ[${index}]: "${m[0]}" — …${window}…`);
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    '档位带必须来自 {{liveGpuOffSpot}} / {{liveGpuOffReserved}} —— 手写的带会发布一个' +
      '数据集不认可的数字：\n' + violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 3. 无数据集没有的型号 / 供应商
// ─────────────────────────────────────────────────────────────
test('P162: GPU 引擎 FAQ 里不出现数据集没有的型号或供应商', () => {
  const violations: string[] = [];
  for (const { where, index, a } of collectFaq()) {
    if (!a) continue;
    for (const { pattern, reason } of FORBIDDEN_TERMS) {
      if (pattern.test(a)) {
        violations.push(`${where} FAQ[${index}]: ${pattern.source} — ${reason}`);
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    'FAQ 不得发布数据集不拥有的型号/供应商（它们没有真相源）：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 4. token 可解析
// ─────────────────────────────────────────────────────────────
test('P162: GPU 引擎 FAQ 里的每个 token 都能解析（且不残留）', () => {
  const violations: string[] = [];
  for (const { where, index, q, a } of collectFaq()) {
    for (const [field, text] of [['q', q], ['a', a]] as const) {
      if (!text) continue;
      try {
        const resolved = resolveLiveTokens(text);
        if (hasUnresolvedToken(resolved)) {
          violations.push(`${where} FAQ[${index}].${field}: 解析后仍有 token 残留`);
        }
      } catch (e) {
        violations.push(
          `${where} FAQ[${index}].${field}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    'FAQ token 解析失败（构建期会炸）：\n' + violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 5. 三处同步
// ─────────────────────────────────────────────────────────────
test('P162: GPU 引擎 FAQ 的三处来源逐条对齐，且 token 引用集一致', () => {
  const entries = readEngineFaq(GPU_ENGINE_FILE);
  const en = readLocale('en');
  const zh = readLocale('zh');
  const violations: string[] = [];

  const enQuestions = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    const engineQ = entries[i]!.q;
    const enQ = en[`tools.${GPU_SLUG}.faq.${i}.q`] ?? '';
    const zhQ = zh[`tools.${GPU_SLUG}.faq.${i}.q`] ?? '';
    if (!enQ) violations.push(`en.json 缺 FAQ[${i}].q`);
    if (!zhQ) violations.push(`zh.json 缺 FAQ[${i}].q`);
    if (enQ && engineQ !== enQ) {
      violations.push(`FAQ[${i}].q 引擎源与 en.json 不一致`);
    }
    if (enQuestions.has(enQ)) violations.push(`en.json 的问题重复：${enQ.slice(0, 40)}`);
    enQuestions.add(enQ);

    // token **引用集**（含 payload，不只是种类）必须一致 ——
    // zh 是翻译，文字可以不同，但价格 token 必须指向同一批型号/供应商/档位，
    // 否则 zh 页面会拿 en 页面的价格配另一个型号的文案（P160 的同款判据）。
    for (const field of ['q', 'a'] as const) {
      const engineRefs = tokenRefs(entries[i]![field]);
      const enRefs = tokenRefs(en[`tools.${GPU_SLUG}.faq.${i}.${field}`] ?? '');
      const zhRefs = tokenRefs(zh[`tools.${GPU_SLUG}.faq.${i}.${field}`] ?? '');
      for (const [name, refs] of [['en', enRefs], ['zh', zhRefs]] as const) {
        if (refs.join('|') !== engineRefs.join('|')) {
          violations.push(
            `FAQ[${i}].${field} ${name} 的 token 引用集与引擎源不一致\n` +
              `      引擎源: ${engineRefs.join(' ') || '(无)'}\n` +
              `      ${name}: ${refs.join(' ') || '(无)'}`,
          );
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    '引擎源 / en.json / zh.json 必须逐条对齐且 token 引用集一致（zh 按 index 取值 ⇒ 错位 = 问答配错）：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 6. token 数量下限
// ─────────────────────────────────────────────────────────────
test('P162: GPU 引擎 FAQ 的 token 数量有下限（不能靠删价格钻空子）', () => {
  const entries = readEngineFaq(GPU_ENGINE_FILE);
  const total = entries.reduce((n, e) => n + tokensIn(e.a).length, 0);
  assert.ok(
    total >= 20,
    `GPU FAQ 的 token 总数只有 ${total} —— 至少要 20 个（把价格删光不算修好）`,
  );
  const kinds = new Set(entries.flatMap((e) => [...tokenKindsIn(e.a)]));
  for (const kind of REQUIRED_TOKEN_KINDS) {
    assert.ok(
      kinds.has(kind),
      `FAQ 必须用到 ${kind}（钉死的清单里少了一种 ⇒ 编辑会拿手写值补位）`,
    );
  }
});

// ─────────────────────────────────────────────────────────────
// 7. 关键派生值 == 独立写死的字面量
// ─────────────────────────────────────────────────────────────
test('P162: GPU FAQ 的关键派生值等于独立写死的字面量', () => {
  const violations: string[] = [];
  for (const { token, expected, what } of EXPECTED_VALUES) {
    let actual: string;
    try {
      actual = resolveLiveTokens(token);
    } catch (e) {
      violations.push(`${token} 解析失败：${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (actual !== expected) {
      violations.push(`${token}（${what}）= ${actual}，期望 ${expected}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    '关键派生值必须等于本文件里独立写死的字面量：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

test('P162: FAQ 用到的每一个 token 都在钉死表里，且表里没有僵尸行', () => {
  const entries = readEngineFaq(GPU_ENGINE_FILE);
  const used = new Set(entries.flatMap((e) => tokensIn(e.a)));
  const pinned = new Set(EXPECTED_VALUES.map((v) => v.token));
  const violations: string[] = [];
  // ① FAQ 里出现表外的 token ⇒ 编辑偷偷加了一个没人钉的 token（可能是手写值伪装的）
  for (const token of used) {
    if (!pinned.has(token)) {
      violations.push(`FAQ 用到了钉死表之外的 token：${token}`);
    }
  }
  // ② 表里的 token 没人用 ⇒ 僵尸行（token 被删了，表该跟着删）
  for (const token of pinned) {
    if (!used.has(token)) {
      violations.push(`钉死表里的 token 没有被 FAQ 使用（僵尸行）：${token}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    '钉死表必须与 FAQ 的 token 用法**完全一致**（不多不少）：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 8. 名实一致
// ─────────────────────────────────────────────────────────────
test('P162: 价格 token 的型号与同条里提到的型号对得上', () => {
  const violations: string[] = [];
  const DISPLAY: Record<string, string> = { RTX4090: 'RTX 4090' };
  for (const { where, index, a } of collectFaq()) {
    if (!a) continue;
    for (const token of tokensIn(a)) {
      const m = /^\{\{liveGpu(?:Range|SpotRange|Rate|Spot|Reserved):(?:[^|}]+\|)?([A-Za-z0-9]+)(?:\|[^}]*)?\}\}$/.exec(
        token,
      );
      if (!m) continue;
      const type = m[1]!;
      const label = DISPLAY[type] ?? type;
      const mentioned =
        a.includes(type) || (label !== type && a.includes(label));
      if (!mentioned) {
        violations.push(`${where} FAQ[${index}]: ${token} 的型号 ${type} 没有在同一条里被提到`);
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    '「名说 A、价说 B」是最难用眼睛发现的漂移 ⇒ 价格 token 的型号必须被同一条提到：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 9. 每个 token 种类都真的被实现
// ─────────────────────────────────────────────────────────────
test('P162: FAQ 用到的每一种 GPU token 都真的被实现了', () => {
  const entries = readEngineFaq(GPU_ENGINE_FILE);
  const kinds = new Set(entries.flatMap((e) => [...tokenKindsIn(e.a)]));
  const violations: string[] = [];
  for (const kind of kinds) {
    // 用 FAQ 里真实出现的那个 token 跑一次替换
    let sample: string | undefined;
    for (const e of entries) {
      sample = tokensIn(e.a).find((t) => t.startsWith(`{{${kind}`));
      if (sample) break;
    }
    if (!sample) {
      violations.push(`${kind}: 找不到样本 token`);
      continue;
    }
    try {
      const resolved = resolveLiveTokens(sample);
      if (resolved === sample || hasUnresolvedToken(resolved)) {
        violations.push(`${kind}: ${sample} 没有被解析掉（token 原样留着 ⇒ 会印到页面上）`);
      }
    } catch (e) {
      violations.push(`${kind}: ${sample} 解析失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    '清单里的每一种 token 都必须真的被实现：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 10. 白名单不腐烂
// ─────────────────────────────────────────────────────────────
test('P162: 白名单没有腐烂', () => {
  const all = collectFaq()
    .map((e) => e.a)
    .join('\n');
  const missing: string[] = [];
  for (const { pattern, reason } of [...ALLOWED_RAW_PRICES, ...ALLOWED_RAW_BANDS]) {
    if (!pattern.test(all)) missing.push(`${pattern.source}（${reason}）`);
  }
  assert.deepEqual(
    missing,
    [],
    '这些白名单条目在 FAQ 里已经不存在了 ⇒ 把它删掉（或者把那句加回来）：\n' +
      missing.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 11. 派生月额被独立重算
// ─────────────────────────────────────────────────────────────
test('P162: FAQ 里由「容量 × 数据集单价」推出的月额是对的（逐来源）', () => {
  const storage = (PRICING as any).gpu.storagePerGB as number;
  const violations: string[] = [];
  // FAQ 3 写着「100GB = $10/mo、1TB = $100/mo」⇒ 守卫自己重算，不信文案。
  //
  // ⚠️ **逐来源**查：只查「三处合起来出现过」的话，zh 写错金额也能蒙混过关
  //    （en 有、zh 错 ⇒ 合起来仍然「有」⇒ 漏报）。
  // ⚠️ 形状要认全：「100GB = $10/mo」（en）与「100GB = $10/月」（zh）都算。
  const MONTHLY_CLAIM_RE = /(\d+)\s*(GB|TB)\s*=\s*\$(\d+(?:\.\d+)?)\/(?:mo|month|月)/gi;
  const claimed = new Map<string, Set<string>>();
  for (const { where, index, a } of collectFaq()) {
    if (!a) continue;
    for (const m of a.matchAll(MONTHLY_CLAIM_RE)) {
      const gb = Number(m[1]) * (m[2]!.toUpperCase() === 'TB' ? 1000 : 1);
      const stated = Number(m[3]);
      const expected = gb * storage;
      if (!claimed.has(where)) claimed.set(where, new Set());
      claimed.get(where)!.add(`${gb}GB`);
      if (Math.abs(stated - expected) > 1e-9) {
        violations.push(
          `${where} FAQ[${index}]: "${m[0]}" —— 但 ${gb}GB × $${storage}/GB = $${expected.toFixed(2)}`,
        );
      }
    }
  }
  // 每处来源都必须仍然写出这两个容量（防「把月额删光」也算修好）
  for (const where of ['engine', 'en', 'zh']) {
    for (const need of ['100GB', '1000GB']) {
      if (!claimed.get(where)?.has(need)) {
        violations.push(
          `${where}: 缺少 ${need} × $${storage}/GB 的月额声明（100GB → $10/mo、1TB → $100/mo）`,
        );
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    '由数据集单价推出的月额必须与独立重算的值一致（每处来源都要有）：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 12. 供应商名必须走 token
// ─────────────────────────────────────────────────────────────
test('P162: GPU 引擎 FAQ 答案里的供应商名必须走 token（不能手写）', () => {
  const violations: string[] = [];
  // 数据集里的显示名（gpu.providers[*].name）—— 这是显示名的真相源
  const names = Object.values(GPU_PROVIDERS).map((p) => p.name);
  for (const { where, index, a } of collectFaq()) {
    if (!a) continue;
    // 先把 token 去掉，剩下的才是「手写名字」
    const raw = a.replace(/\{\{[^{}]*\}\}/g, ' ');
    for (const name of names) {
      const re = new RegExp(`(?<![A-Za-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`);
      if (re.test(raw)) {
        violations.push(`${where} FAQ[${index}]: 手写供应商名 "${name}"（必须走 {{liveGpuProviderName:...}}）`);
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    '数据集的 gpu.providers[*].name 是显示名的真相源 ⇒ FAQ 答案里不许手写供应商名：\n' +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});
