// P167 —— 分类页三区块（介绍段 / 分类指南 / FAQ）的**唯一算法实现**。
//
// 为什么抽成共享模块
// ------------------
// P166 的教训之一：「同一件事写两遍，两遍迟早会漂」。
// 本批有两处要用同一套算法：
//   ① tests/scripts/p167-category-sections-measure.ts —— 体检工具（人工看数字）
//   ② tests/category-content-uniqueness-guard.test.ts —— 守卫（CI 卡红线）
// 如果两边各写一份 shingle / templateShare，某个时刻改了一边不改另一边
// ⇒ 工具报「通过」而守卫其实在测另一个阈值，或反之。
//
// ⭐ 因此：**上限也放在这里**。守卫和工具读同一组常量 ⇒ 不可能对不上。
//
// ⚠️ 文件名不能带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites
//    只收 *.test.ts / *.test.mjs，带了会让套件计数漂移。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');

export const LANGS = ['en', 'zh'] as const;
export type Lang = (typeof LANGS)[number];

/**
 * 上限：各区块的组内模板词份额（%）。
 *
 * ⭐ 来由（P167-1 取证）：现有 6 个「full」分类页的实测值 =
 *   en intro/guide/faq **0.00% / 0.00% / 0.00%**（一个共用 5-gram 都没有）
 *   zh intro/guide/faq **6.25% / 1.28% / 2.65%**
 * ⇒ 上限取 12%（en）/ 14%（zh），给「池子从 6 涨到 15」的池子效应留余量
 *   （池子效应本身会抬高份额，见 P166 的实测：池子 3→45 时份额 3.88%→11.04%）。
 */
export const MAX_SHARE: Record<Lang, number> = { en: 12, zh: 14 };

/**
 * 上限：**分类页与分类页**的页面级最大相似度（%）。
 *
 * ⭐ 这一条是「平台真正看到的数」：P166 实测过，主题页加新形态后
 *   与同类别其它页的相似度在 44/45 页上**上升**（+1.16 个百分点）⇒
 *   分类页补这三块**同样可能**把 9 个页面推得更像 ⇒ 必须守住上限。
 *
 * 基线（P167-1 取证，15 页 / 105 对）：en max **8.27%** / zh max **8.69%**。
 * ⇒ 上限 10%，留约 1.3 个百分点的余量。
 */
export const MAX_PAGE_SIMILARITY = 10;

/**
 * 上限：**同一个 5-gram 最多能被几个分类共用**。
 *
 * ⭐ 为什么要这一条：组内模板词份额是**比例**，
 *   一个分类写得特别长，就能把「复制同一句」的占比稀释掉。
 *   ⇒ 份额合格但某一句话被 8 个分类共用的情况，份额这一条抓不住。
 *
 * 基线（P167 实测）：en 最大组 **3**（「what is the difference between」，
 *   A/R/S —— 同一类 FAQ 句式）/ zh 最大组 **4**（「计 算 器 覆 盖」，A/B/D/F）。
 *   ⇒ 上限取 5：15 个分类里超过三分之一共用同一句才判模板。
 *
 * ⚠️ 阈值必须**分级**（P166 教训：命中 1 个就是「模板」会把编辑逼向错误形态）
 *   ⇒ 单个分类命中不算；必须 ≥6 个分类同时共用同一句才红。
 */
export const MAX_SHARED_GROUP = 5;

/** 中文按单字切、英文/数字按词切（与 P166 主题页体检同一套切法） */
export function shingles(text: string, n = 5): string[] {
  const tokens = [
    ...text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'\u2019\-]*/g),
  ].map((m) => m[0]!.toLowerCase());
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

/**
 * 一批文本里「出现在 >=2 个文本中的 n-gram」占全部 n-gram 的份额（%）。
 *
 * ⭐ 注意分母是**全部 n-gram（含重复）**，分子是**落在 >=2 个文本里的那些出现次数**
 *   —— 与 P166 的 p166-intro-variance 同一口径，两批可比。
 */
export function templateShare(texts: string[]): number {
  const counts = new Map<string, number>();
  const per = texts.map((t) => {
    const g = shingles(t);
    for (const x of g) counts.set(x, (counts.get(x) ?? 0) + 1);
    return g;
  });
  let total = 0;
  let shared = 0;
  for (const g of per) {
    for (const x of g) {
      total++;
      if ((counts.get(x) ?? 0) > 1) shared++;
    }
  }
  return total ? (shared / total) * 100 : 0;
}

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  let inter = 0;
  for (const g of a) if (sb.has(g)) inter++;
  return inter / (a.length + b.length - inter);
}

export function loadLocale(lang: string): Record<string, string> {
  return JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', lang + '.json'), 'utf-8')) as Record<
    string,
    string
  >;
}

export interface CategoryBlocks {
  letter: string;
  /** 介绍段：h2 + 3 段 */
  intro: string;
  /** 分类指南：3 张卡（标题 + 描述） */
  guide: string;
  /** FAQ：5 条（问 + 答） */
  faq: string;
  /** 三块合起来的全部文本 */
  all: string;
}

/**
 * 取出某个前缀下所有键的「序号部分」（如 `category.A.faq.q1.q` → `1`）。
 *
 * ⭐ 只收**键真正存在**的那些序号 ⇒ 调用方不必知道每个分类各有几条。
 */
export function indicesOf(locale: Record<string, string>, prefix: string): string[] {
  const out = new Set<string>();
  for (const k of Object.keys(locale)) {
    if (!k.startsWith(prefix)) continue;
    const m = k.slice(prefix.length).match(/^[A-Za-z0-9]+/);
    if (m) out.add(m[0]);
  }
  return [...out].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b));
}

/**
 * 从 locale 真值里取出某个分类的三块文本。
 *
 * ⭐ 真相源 = i18n JSON，**不是**手写清单：
 *   条数随分类变（A-E 是 5 条 FAQ、F 是 7 条），写死会误杀。
 */
export function blocksOf(locale: Record<string, string>, letter: string): CategoryBlocks | null {
  const introH2 = locale['category.' + letter + '.intro.h2'];
  if (!introH2) return null;
  const intro = [introH2];
  for (const n of [1, 2, 3]) intro.push(locale['category.' + letter + '.intro.' + n] ?? '');
  // FAQ / 指南的条数**从 locale 键派生**，不写死。
  // ⭐ 为什么：实测 **F 分类有 7 条 FAQ**，其余 14 个分类是 5 条
  //   ⇒ 写死 [1..5] 会让 F 的 q6/q7 **掉出测量池**
  //   ⇒ 守卫看起来比实际更绿（P160 记过的那条：窄正则让守卫看起来比实际更绿，
  //     而「覆盖了多少」本身也得有数字）。
  const guide: string[] = [];
  for (const n of indicesOf(locale, 'category.' + letter + '.guide.')) {
    guide.push(locale['category.' + letter + '.guide.' + n + '.title'] ?? '');
    guide.push(locale['category.' + letter + '.guide.' + n + '.desc'] ?? '');
  }
  const faq: string[] = [];
  for (const n of indicesOf(locale, 'category.' + letter + '.faq.q')) {
    faq.push(locale['category.' + letter + '.faq.q' + n + '.q'] ?? '');
    faq.push(locale['category.' + letter + '.faq.q' + n + '.a'] ?? '');
  }
  return {
    letter,
    intro: intro.join(' '),
    guide: guide.join(' '),
    faq: faq.join(' '),
    all: [intro.join(' '), guide.join(' '), faq.join(' ')].join(' '),
  };
}

/**
 * 找出**跨分类**共用的 n-gram：返回 n-gram -> 共用它的分类集合。
 *
 * ⭐ 与「分类内重复」严格区分：
 *   一个分类在三块里反复用「客户流失率」是**术语一致性**（好事），
 *   两个分类共用同一句话才是**模板化**（坏事）。
 *   P167 第一版的体检工具把两者混在一个计数器里 ⇒ T 分类显示 137，
 *   看起来像模板，实际全是它自己的术语 ⇒ 必须拆开。
 */
export function sharedGroups(
  textsByCategory: Map<string, string>,
): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const [letter, text] of textsByCategory) {
    for (const x of new Set(shingles(text))) {
      if (!groups.has(x)) groups.set(x, new Set());
      groups.get(x)!.add(letter);
    }
  }
  // 只留真正跨分类的（>=2 个分类）
  for (const [x, s] of [...groups]) {
    if (s.size < 2) groups.delete(x);
  }
  return groups;
}

/** 一个分类里，有多少个 5-gram 是跨分类共用的 */
export function crossCategoryCount(letter: string, groups: Map<string, Set<string>>): number {
  let n = 0;
  for (const s of groups.values()) if (s.has(letter)) n++;
  return n;
}
