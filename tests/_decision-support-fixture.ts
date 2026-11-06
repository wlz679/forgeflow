// P168 —— 决策支持（批次 3）的**共享夹具**：谁是「已激活工具」、
// 激活的判定口径、以及占位模板的识别方式。
//
// ⭐ 为什么抽成共享模块
//   守卫与体检工具必须用**同一套**激活判定 ⇒ 否则会出现
//   「工具报 0 个问题、守卫却在红」或反过来的经典错位。
//   与 tests/_category-sections-metrics.ts 同一套路。
//
// ⭐ 引擎取的是**真值**（getAllEngines()）而不是源码解析
//   P164 的教训：守卫必须取浏览器/页面跑的那份东西，
//   自己从源码再解析一遍 = 测了一个假 body。
//
// ⚠️ 文件名不能带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites
//    只收 *.test.ts / *.test.mjs，带了会让套件计数漂移。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractDecisionLines } from '../src/lib/decision-support.ts';
import { L5_LAYERS } from './l5-tags.ts';
import { shingles } from './_category-sections-metrics.ts';

export const ROOT = resolve(import.meta.dirname, '..');

export const LANGS = ['en', 'zh'] as const;
export type Lang = (typeof LANGS)[number];

export interface Locale {
  [key: string]: string;
}

export function readLocale(lang: Lang): Locale {
  const raw = readFileSync(resolve(ROOT, 'src/i18n/locales', lang + '.json'), 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

/** 决策区块的四个静态文案键（缺一不可）—— 与 L5 契约**同源**（tests/l5-layers.json） */
export const DECISION_KEYS: readonly string[] = L5_LAYERS.map((l) => l.key);

/**
 * 占位模板的识别标记。
 *
 * ⭐ 与既有的 playbook 守卫同一套口径（engine playbook 的占位 goal 含
 *   「用此计算器」这五个字）⇒ 一个工具不可能「playbook 是真的、
 *   页面文案是占位」或反之。
 */
export const PLACEHOLDER_MARKER = '用此计算器';

/**
 * 文案长度下限（按**信息量**计：Latin word 记 1，CJK 字符记 0.5）。
 *
 * ⭐ 不要用「字符数」判正文长度：1 个汉字的信息量 ≈ 2 个英文字符，
 *   同一个字符数门槛对中英两种语言意味着完全不同的正文厚度
 *   ⇒ 会把中文文案**误判成太短**。口径与
 *   tests/category-decision-layer-guard.test.ts 保持一致（同一套算法）。
 *
 * ⭐⭐ 为什么**绝对下限**刻意定得不高，而另设一条「中英保真度」断言
 *   中文比英文紧凑：一段**忠实**的中文翻译，在「CJK 记 0.5」这套口径下
 *   天然只有英文原文的 **0.75 左右**（实测 burn-rate：en 63 → zh 48）。
 *   ⇒ 若把绝对下限定在英文的水平 ⇒ **每一段忠实的中文翻译都会被误判为太短**
 *   ⇒ 于是守卫会把编辑逼向「注水的中文」或「删掉英文才写得下」——两种都是错的形态。
 *   ⇒ 正确做法：**绝对下限只挡「明显不是成文内容」**，厚度由
 *     「中文信息量 ≥ 英文 × 0.7」这条**相对断言**来守（自校准，不靠魔法数）。
 */
export const MIN_GOAL_UNITS = 40;
/** 「据此该怎么定」层（阈值表 + 行动）比其它层长，下限也更高 */
export const MIN_RECOMMENDATION_UNITS = 70;
export const MIN_CONSTRAINT_UNITS = 60;
export const MIN_NEXT_TOOL_UNITS = 40;

/** 中文信息量相对英文原文的最低比例（忠实翻译实测约 0.75，留余量取 0.7） */
export const MIN_ZH_TO_EN_RATIO = 0.7;

/**
 * 决策区块与结果卡片的逐字重叠率上限（%）。
 *
 * ⭐ 实测基线（B3-0 收尾时量）：en **0.00%** / zh **0.00%**
 *   —— 修掉"MRR Growth Rate Calculator"这个悬空工具名之后，
 *   区块与卡片之间**一个共用的 5-gram 都不剩**。
 * ⇒ 上限取 **2%**：基线是 0.00%，留 2 个百分点的余量即可 ——
 *   任何「把卡片里的段落整段抄进区块」的行为都会立刻越过它。
 *   （第一版把区块三层与卡片 🧭 四段各说一遍，实测重叠 7.4%，
 *     其中一句话在同页出现 3 次 ⇒ 现在改成「区块独占决策支持」，
 *     引擎输出里不再有 🧭 段 ⇒ 重叠回到 0.00%。）
 */
export const MAX_BLOCK_CARD_OVERLAP = 2;

/**
 * 工具页两两相似度的上限（%）。
 *
 * ⭐ **不能用分类页的 10%**：分类页与工具页的基线差一个量级。
 *   工具页的实测基线（P168 批次 3 开工前）：en max **13.08%** /
 *   zh max **17.28%**（zh 天然比 en 更模板化）。
 *   ⇒ 上限取 **19%**（zh 基线 + 约 1.7 个百分点的余量，en 侧余量更大）
 *   ⇒ 判据是「**不得上升**」，不是「越低越好」—— 工具页的共性本来就多。
 */
export const MAX_TOOL_PAGE_SIMILARITY = 19;

/** 信息量：Latin word 记 1，CJK 字符记 0.5（与既有决策层守卫同口径） */
export function infoUnits(text: string): number {
  let latin = 0;
  let cjk = 0;
  for (const m of text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'\u2019\-]*/g)) {
    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/.test(m[0])) cjk += m[0].length;
    else latin += 1;
  }
  return latin + cjk / 2;
}

/** 载入全部引擎（取真值） */
export async function loadEngines(): Promise<any[]> {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  return getAllEngines() as any[];
}

/**
 * 「已激活工具」= 三个静态文案键在 **en 与 zh** 里都存在。
 *
 * ⭐ 必须与页面渲染条件**完全一致**：
 *   页面靠「i18n 键是否存在」判定要不要渲染这个区块
 *   （src/pages/[lang]/[slug].astro 的 decisionTextReady）
 *   ⇒ 守卫若用另一套清单 ⇒ 两边必然对不上。
 */
export function activatedSlugs(locales: Record<Lang, Locale>): string[] {
  const out: string[] = [];
  for (const slug of Object.keys(locales.en)) {
    if (!slug.startsWith('tools.')) continue;
    if (!slug.endsWith('.decision_goal')) continue;
    const toolSlug = slug.slice('tools.'.length, -'.decision_goal'.length);
    const ok = LANGS.every((lang) =>
      DECISION_KEYS.every((k) => {
        const v = locales[lang]['tools.' + toolSlug + '.' + k];
        return typeof v === 'string' && v.length > 0;
      }),
    );
    if (ok) out.push(toolSlug);
  }
  return out.sort();
}

/**
 * 页面真正会渲染区块的判定（与 [slug].astro 完全同口径）：
 *   ① 三个静态键都在  ② 引擎的示例输出里确实有决策建议
 */
export function rendersDecisionBlock(
  slug: string,
  locales: Record<Lang, Locale>,
  engineSample: string,
): boolean {
  const keysOk = LANGS.every((lang) =>
    DECISION_KEYS.every((k) => {
      const v = locales[lang]['tools.' + slug + '.' + k];
      return typeof v === 'string' && v.length > 0;
    }),
  );
  if (!keysOk) return false;
  return Boolean(extractDecisionLines(engineSample).tip);
}

/**
 * 决策区块与结果卡片的**逐字重叠率**（%）：区块的 5-gram 里，
 * 有多少比例已经原样出现在结果卡片里。
 *
 * ⭐ 为什么要有这条（"零重复"的完整版）
 *   P168 把 💡 Tip **搬**进了决策区块（结构性去重：卡片根本收不到那条）。
 *   但区块还有三层静态文案（决策问题 / 适用边界 / 下一步工具）——
 *   它们与引擎卡片里的 🧭 四段说的是同一类事（问题 / 边界 / 下一步工具）。
 *   ⇒ 逐字重复必须有一条**可复算**的判据，否则 B3-1/B3-2 铺 100 个工具时，
 *     某个工具的文案很容易写成卡片的复读（而且复读了也看不出来）。
 *
 * ⚠️ 这条只抓**逐字**重复（5-gram），抓不到"换个说法说同一件事"。
 *   语义层的重复靠分工设计来避免，不是靠这条断言。
 *
 * @returns 重叠率（%）；测不了时返回 -1（页面结构对不上，别当成 0）
 */
export function blockCardOverlap(html: string): number {
  // ⭐ 只量**静态层**：动态层（#decision-next-step，装的是引擎的 💡 Tip）
  //   不算在内 —— 它的零重复由「全页恰好出现一次决策建议」那条断言守。
  //   两层都算的话，「卡片不剥离 Tip」这个变异会同时触发两条断言
  //   ⇒ 违反「一条变异只红一条断言」的隔离纪律（变异台子会判 RED-BUT-NOT-ISOLATED）。
  const blk =
    html.match(/<section id="decision-support"[\s\S]*?(?=<div id="decision-next-step")/) ??
    html.match(/<section id="decision-support"[\s\S]*?<\/section>/);
  const card = html.match(/<div id="static-results"[\s\S]*?(?=<div id="dynamic-results")/);
  if (!blk || !card) return -1;
  const text = (s: string) =>
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
  const b = shingles(text(blk[0]));
  const c = new Set(shingles(text(card[0])));
  if (!b.length) return -1;
  const hit = b.filter((x) => c.has(x)).length;
  return (hit / b.length) * 100;
}
