// P166 —— 新形态数据层的**价格纪律分档**（唯一真相源，共享 helper，不是测试套件）。
//
// 为什么要有这个文件
// ------------------
// P166 铺开试点时，价格纪律被写在了**两个地方**：
//   1. tests/scripts/p166-topic-priority-scan.ts —— 一张手写清单
//      `MODEL_PRICE_TOPICS = new Set(['llm-api-cost-optimization'])`
//   2. tests/topic-priority-content-guard.test.ts —— 只查「带 1M / per million /
//      每百万字样」的句子（更窄）
// ⇒ 两份口径、且**都是手工维护** ⇒ P164 抓过同一类缺陷（「唯一真相源只管住了
//    主数据文件，没管住脚本」⇒ 等于开了第二份清单 ⇒ 既有守卫当场变红）。
//
// 而这份清单**手写本身就是漏的入口**：B 分类（AI Cost Tools）下 tier-1 有 3 个主题
//   · llm-api-cost-optimization   （每 1M token 单价）
//   · ai-image-cost-optimization   （每图单价）
//   · gpu-cloud-cost-optimization  （每 GPU 小时单价）
// 三个的价格**全部**来自 src/data/ai-pricing.json、**全部**随每周 bot 漂移 ⇒ 三个都该
// 是严格档；但清单里只有第一个 ⇒ 下批铺开时，另两个的手写单价会静默通过。
//
// ⇒ 修法：**不手工维护清单**，从 topics.ts 的 letterId 派生。
//
// 分档的判据是什么（以及为什么这么分）
// ------------------------------------
// 严格档（讲「随 bot 漂移的市场价」）：任何手写单价都是缺陷 ⇒ 必须走 live token。
// 宽松档（讲「用户自己的经营阈值」：CAC / LTV / 回本周期 / NRR）：允许手写 ——
//   那是读者自己的数，不是数据集拥有的市场价 ⇒ 不会漂移 ⇒ 不需要派生。
// ⚠️ 规则比需求更严会把编辑逼向错误形态（P161 的教训）：把「任何 $ + 数字都判为手写
//   单价」套到所有主题上，会逼着内容把金额写成 "USD 300-1,500" 这种别扭写法。
//   ⇒ 判据要落在**要禁的那个形状**上。

import { TOPICS } from '../src/data/topics.ts';

/**
 * 讲「模型/服务市场价」的分类字母。B = AI Cost Tools，其价格全部来自
 * `src/data/ai-pricing.json` ⇒ 全部严格档。
 * ⚠️ 这是**唯一**一处定义；新增 B 类主题会自动进严格档，不需要在这里加一行。
 */
export const MODEL_PRICE_LETTERS = ['B'] as const;

/** 严格档主题 id 集合（从 topics.ts 派生，不是手写清单）。 */
export const MODEL_PRICE_TOPICS: ReadonlySet<string> = new Set(
  TOPICS.filter((t) => (MODEL_PRICE_LETTERS as readonly string[]).includes(t.letterId)).map((t) => t.id),
);

/** 该主题是否走「严格档」（市场价必须派生）。 */
export function isModelPriceTopic(topicId: string): boolean {
  return MODEL_PRICE_TOPICS.has(topicId);
}

/**
 * 手写单价的形状：**P158 的同一条约定**，逐字照抄，不发明新规则。
 * `$` + 数字，且**没有** K/M/B 后缀 = 手写的单价；
 * 带 K/M/B 后缀 = 聚合支出（年耗 / 月耗），是编辑场景，允许。
 *
 * 写法上刻意用 `[$]` 与 `[0-9]` 而不是 \$ 与 \\d —— 字符类里不需要转义，
 * 于是这个文件里一条反斜杠都没有（避免手写正则时被转义吃掉）。
 */
export const HAND_PRICE_RE = new RegExp('[$][ ]?[0-9]+(?:[.,][0-9]+)?([KMBkmb])?', 'g');

/** 去掉 {{live...}} token —— 用来判断「剩下的价格是不是手写的」。 */
export function stripLiveTokens(text: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('{{', i);
    if (start < 0) {
      out.push(text.slice(i));
      break;
    }
    const end = text.indexOf('}}', start + 2);
    if (end < 0) {
      out.push(text.slice(i));
      break;
    }
    out.push(text.slice(i, start));
    const body = text.slice(start + 2, end);
    // live token 整段丢弃；其它 {{...}}（未来可能有别的占位）原样保留
    if (!body.startsWith('live')) out.push(text.slice(start, end + 2));
    i = end + 2;
  }
  return out.join('');
}

/**
 * 一段文字里的**手写单价**（严格档专用）。
 * 返回形如 `$1.25` 的片段；带 K/M/B 后缀的聚合支出**不算**（已放行）。
 */
export function handTypedPrices(text: string): string[] {
  const withoutTokens = stripLiveTokens(text);
  const out: string[] = [];
  for (const m of withoutTokens.matchAll(HAND_PRICE_RE)) {
    if (m[1]) continue; // K/M/B 后缀 ⇒ 聚合支出，允许
    out.push(m[0]);
  }
  return out;
}
