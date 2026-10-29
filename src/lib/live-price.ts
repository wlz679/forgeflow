// P158 — editorial content 的价格单一真相源。
//
// 为什么需要这个模块
// ------------------
// P156 把**工具页**的模型集口径统一了（静态正文 vs 交互态读同一份数据）。
// 但主题页的**编辑内容**里还有第二个真相源：手写的价格。
//
// 实测（2026-10-28）：`TOPIC_BENCHMARK_CONTENT` 里 16 条可核对的「每 1M token
// 输入/输出价」有 **6 条已经和实时数据集对不上**（37.5%），最严重的一条
// （Gemini 2.5 Flash）输出价差 **8.33 倍**；曝光最高的主题页
// `/en/ai-cost-tools/llm-provider-comparison-compare`（293 展示 / 排名 8.2）
// 的「旗舰定价」行 **4 个格全错**。
//
// 根因和 P156 一样：**同一个事实有两个真相源**，而其中一个每周只被 bot 更新一次。
//
// ⇒ 修法：**价格不再手写**。编辑内容里写 token，构建期从
//   `src/data/ai-pricing.json` 解析出真实价格。
//   bot 每周同步价格 ⇒ editorial content 自动跟随 ⇒ 漂移在结构上不可能发生。
//
// Token 一览
// ----------
//   {{liveDate}}                                  → 数据集的最后更新时间
//   {{live:provider/key}}                         → "$1.25 / $10.00"（每 1M token 输入 / 输出）
//   {{liveIn:provider/key}}                       → "$1.25"（只输入价）
//   {{liveOut:provider/key}}                      → "$10.00"（只输出价）
//   {{liveName:provider/key}}                     → "GPT 5"（数据集里的实时显示名）
//   {{liveMonthly:provider/key}}                  → 月支出（场景参数见 SCENARIO）
//   {{liveRatioIn:A|B}}                           → A 的输入价比 B 便宜多少倍（取整）
//   {{liveRatioOut:A|B}}                          → A 的输出价比 B 便宜多少倍（取整）
//   {{liveBandIn:A|B|C}}                          → "$0.15-$1.00"（这几个模型的输入价区间）
//   {{liveBandOut:A|B|C}}                         → "$0.60-$5.00"（这几个模型的输出价区间）
//   {{liveRatioBandIn:A|B|C}}                     → "2-5"（B/C 各自比 A 贵几倍的区间）
//   {{liveRatioBandOut:A|B|C}}                    → "2-5"（同上，按输出价）
//   {{liveBatch:provider/key}}                    → "$0.25 / $1.50"（批处理价）
//   {{liveBatchIn:provider/key}}                  → "$0.25"（只批处理输入价）
//   {{liveBatchOut:provider/key}}                 → "$1.50"（只批处理输出价）
//   {{liveShareIn:A|B}}                            → "60%"（A 的输入价是 B 的百分之多少）
//   {{liveShareOut:A|B}}                           → "90%"（同上，按输出价）
//   {{liveShareMix:A|B}}                           → "6%"（同上，按混合负载 1000 in + 500 out）
//   {{liveCostIn:provider/key|tokens}}             → "$0.60"（N 个 token 的输入成本）
//   {{liveCostOut:provider/key|tokens}}            → "$0.005"（N 个 token 的输出成本）
//   {{liveScaledIn:provider/key|factor}}           → "$0.30"（factor × 输入价，用于缓存折后价）
//   {{liveScaledOut:provider/key|factor}}          → "$2.50"（factor × 输出价）
//   {{liveMonthlyAt:provider/key|reqsPerDay}}      → "$1.35"（按 reqs/day 的月支出，1000 in + 500 out）
//
// 用 liveName 而不是手写模型名的原因：模型会改名（gpt-5 → gpt-6-sol、
// gemini-2.5-flash → gemini-4-argon …），手写的名字会悄悄过期。
//
// ⚠️ 边界：**只接管价格与模型名**。编辑性的判断（「哪家最适合编码」「上下文窗口
//   多大」「延迟多少」「质量分多少」）**不在这份数据里**，仍然是编辑内容 ——
//   它们不是价格数据集拥有的事实，不该由它推导。同理，**跨多个模型的价格倍数**
//   （例如「Haiku 与 Flash 便宜 5-20 倍」）无法用单一 token 表达，必须写成
//   定性表述，否则会和页面上的实时数字自相矛盾。
//
// P160 为什么用「占比」而不是「便宜百分之几」
// ------------------------------------------
// 直觉上应该让 token 返回「便宜 40%」这种带方向的短语（更符合中文/英文的
// 说法）。但试过之后有两个硬伤：
//
// 1. **语言**：token 的返回值是数据，不是模板 —— 同一份数据要同时喂 en 和 zh
//    两个页面。「40% cheaper」塞进中文句子会变成「便宜 40% cheaper」。
// 2. **方向**：裸数字 + 编辑写死的方向词（「A 比 B 便宜 40%」）在价格顺序反转
//    时会变成一句彻底错误却无人报错的话。
//
// 所以 liveShare* 返回**语言中立的方向安全**的占比：「A 的价格是 B 的 60%」。
// 这个句子在两种价格顺序下都成立、都通顺，而且中英文可以用同一个 token：
//   en: "costs 60% of GPT-4o's input price"
//   zh: "的价格是 GPT-4o 的 60%"

import PRICING from '../data/ai-pricing.json';

export interface LiveModel {
  provider: string;
  key: string;
  name: string;
  /** 每 1M token 的输入价（美元）—— 数据集里的 input 字段本身就是每 1M 的价 */
  inputPerMillion: number;
  /** 每 1M token 的输出价（美元） */
  outputPerMillion: number;
  /**
   * 批处理价（每 1M token）。数据集里**只有 39/245 个模型**带这两个字段
   * （其余是 0 或缺失 = 该模型没有批处理档）⇒ 没有就是 null，不许当成 0 显示。
   */
  batchInputPerMillion: number | null;
  batchOutputPerMillion: number | null;
}

/**
 * 月支出场景：每月 1 亿次请求、平均 1K 输入 + 500 输出 token。
 *
 * 这三个参数是**编辑场景**，写在这里是因为 token `{{liveMonthly:...}}` 要用它们，
 * 而页面正文里也写着同一组数字 —— 守卫会钉住两边一致。
 */
export const SCENARIO = {
  requestsPerMonth: 100_000_000,
  inputTokensPerRequest: 1_000,
  outputTokensPerRequest: 500,
} as const;

/** token 形态：{{kind:payload}}，payload 依 kind 而定 */
const TOKEN_RE =
  /\{\{(live|liveName|liveIn|liveOut|liveMonthly|liveRatioIn|liveRatioOut|liveBandIn|liveBandOut|liveRatioBandIn|liveRatioBandOut|liveBatch|liveBatchIn|liveBatchOut|liveShareIn|liveShareOut|liveShareMix|liveCostIn|liveCostOut|liveScaledIn|liveScaledOut|liveMonthlyAt|liveCostMix):([^{}]+)\}\}/g;

/** 无参 token：{{liveDate}} → 数据集的最后更新时间 */
const DATE_TOKEN_RE = /\{\{liveDate\}\}/g;

/** 数据集里没有的 key —— 解析时必须报错，不许静默留原文 */
export class UnknownLiveModelError extends Error {
  constructor(provider: string, key: string) {
    super(
      `Unknown live model "${provider}/${key}" — it is not in src/data/ai-pricing.json. ` +
        'Editorial content may reference a model the dataset no longer carries; ' +
        'pick the current key (or remove the reference) instead of leaving a stale token.',
    );
    this.name = 'UnknownLiveModelError';
  }
}

/** 模型存在但没有批处理档 —— 同样必须报错，不许显示 0 */
export class NoLiveBatchRateError extends Error {
  constructor(provider: string, key: string) {
    super(
      `Model "${provider}/${key}" has no batch rate in src/data/ai-pricing.json ` +
        '(batchInput/batchOutput are missing or 0). Do not quote a batch price for it.',
    );
    this.name = 'NoLiveBatchRateError';
  }
}

function lookup(provider: string, key: string): LiveModel | undefined {
  const bundle = (PRICING as any).llm?.[provider];
  const model = bundle?.models?.[key];
  if (!model) return undefined;
  const rawBatchIn = model.batchInput === undefined ? null : Number(model.batchInput);
  const rawBatchOut = model.batchOutput === undefined ? null : Number(model.batchOutput);
  const hasBatch = rawBatchIn !== null && rawBatchOut !== null && rawBatchIn > 0 && rawBatchOut > 0;
  return {
    provider,
    key,
    name: String(model.name ?? key),
    // 数据集里的 input / output **本身就是每 1M token 的价格**（不要再乘 1e6）
    inputPerMillion: Number(model.input),
    outputPerMillion: Number(model.output),
    batchInputPerMillion: hasBatch ? rawBatchIn : null,
    batchOutputPerMillion: hasBatch ? rawBatchOut : null,
  };
}

/** 取一个模型的实时信息；不存在就抛错（不静默） */
export function liveModel(provider: string, key: string): LiveModel {
  const found = lookup(provider, key);
  if (!found) throw new UnknownLiveModelError(provider, key);
  return found;
}

/** 把 "provider/key" 拆开 */
function splitRef(ref: string): { provider: string; key: string } {
  const trimmed = ref.trim();
  const slash = trimmed.indexOf('/');
  if (slash <= 0 || slash === trimmed.length - 1) {
    throw new Error(`Malformed live-model reference "${ref}" — expected "provider/key"`);
  }
  return { provider: trimmed.slice(0, slash), key: trimmed.slice(slash + 1) };
}

/**
 * 价格的显示格式：至少 2 位小数，最多 4 位（够放 $0.075 这类值），去掉多余的尾随 0。
 *
 *   10    → "10.00"      1.25   → "1.25"      0.3   → "0.30"     0.075 → "0.075"
 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`formatPrice received a non-finite value: ${value}`);
  }
  let s = value.toFixed(4).replace(/0+$/, ''); // "10." / "2.5" / "0.075" / "0.3"
  if (!s.includes('.')) {
    s = `${s}.00`;
  } else {
    const [intPart, fracPart] = s.split('.');
    s = `${intPart}.${fracPart.padEnd(2, '0')}`; // "5" → "50"，"075" → "075"
  }
  return s;
}

/** 一组整数字（美元）—— 月支出的显示格式 */
function formatMoney(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`formatMoney received a non-finite value: ${value}`);
  }
  return Math.round(value).toLocaleString('en-US');
}

/**
 * 精确金额的显示格式：至少 2 位小数，最多 6 位小数，去掉多余的尾随 0。
 *
 *   0.6      → "0.60"       0.003    → "0.003"     0.00125 → "0.00125"
 *   22.5     → "22.50"      0.0003   → "0.0003"
 *
 * 与 formatPrice 的区别：formatPrice 最多 4 位小数（只用于「每 1M token 的单价」），
 * 而**单次请求成本**可能是 $0.00125 这种 5 位小数的值（1000 token × $1.25/1M）。
 */
export function formatExact(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`formatExact received a non-finite value: ${value}`);
  }
  let s = value.toFixed(6).replace(/0+$/, '');
  if (s.includes('.')) {
    const [intPart, fracPart] = s.split('.');
    s = `${intPart}.${fracPart.padEnd(2, '0')}`;
  } else {
    s = `${s}.00`;
  }
  return s;
}

/** 按 SCENARIO 算一个模型的月支出（美元） */
export function monthlySpend(model: LiveModel): number {
  const inTokens = (SCENARIO.requestsPerMonth * SCENARIO.inputTokensPerRequest) / 1e6; // 单位：百万 token
  const outTokens = (SCENARIO.requestsPerMonth * SCENARIO.outputTokensPerRequest) / 1e6;
  return inTokens * model.inputPerMillion + outTokens * model.outputPerMillion;
}

/** 解析 "provider/key" 列表（token payload 用 | 分隔） */
function resolveRefs(payload: string): Array<{ provider: string; key: string }> {
  return payload.split('|').map((r) => splitRef(r));
}

/**
 * 解析 "provider/key|数字" 形态的 payload。
 * 例：liveCostIn 的 "anthropic/claude-sonnet-4-6|200000" → ref + 200000
 */
function splitRefParam(
  payload: string,
  kind: string,
): { ref: { provider: string; key: string }; param: number } {
  const parts = payload.split('|');
  if (parts.length !== 2) {
    throw new Error(`Malformed ${kind} token "${payload}" — expected "provider/key|number"`);
  }
  const param = Number(parts[1]);
  if (!Number.isFinite(param)) {
    throw new Error(`Malformed ${kind} token "${payload}" — "${parts[1]}" is not a number`);
  }
  return { ref: splitRef(parts[0]), param };
}

/** 混合负载下的单次请求成本（1000 in + 500 out，单位：美元） */
function mixedCostPerRequest(model: LiveModel): number {
  return (
    (SCENARIO.inputTokensPerRequest * model.inputPerMillion +
      SCENARIO.outputTokensPerRequest * model.outputPerMillion) /
    1e6
  );
}

/** 带千分位、至少 2 位小数的金额（$6,000.00 / $1.35 / $262.50） */
export function formatMoneyExact(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`formatMoneyExact received a non-finite value: ${value}`);
  }
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, fracPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value < 0 ? '-' : '';
  return `${sign}${grouped}.${fracPart}`;
}

/** 一组模型的某个价位（输入或输出）的最小值 / 最大值 */
function bandOf(
  models: LiveModel[],
  pick: (m: LiveModel) => number,
): { lo: number; hi: number } {
  if (models.length === 0) throw new Error('band token needs at least one model');
  const prices = models.map(pick);
  return { lo: Math.min(...prices), hi: Math.max(...prices) };
}

/**
 * 解析一段文本里的所有 token。
 * 未知的 provider/key 会**抛错** —— 构建期失败，而不是把 `{{live:...}}` 原样发到线上。
 */
export function resolveLiveTokens(text: string): string {
  if (!text || !text.includes('{{')) return text;
  const withDate = text.replace(DATE_TOKEN_RE, () => String((PRICING as any).lastUpdated ?? ''));
  return withDate.replace(TOKEN_RE, (_match, kind: string, payload: string) => {
    // —— 比值类（A 比 B 便宜几倍）——
    if (kind === 'liveRatioIn' || kind === 'liveRatioOut') {
      const refs = resolveRefs(payload);
      if (refs.length !== 2) {
        throw new Error(`Malformed ratio token "${kind}:${payload}" — expected "provider/keyA|provider/keyB"`);
      }
      const a = liveModel(refs[0].provider, refs[0].key);
      const b = liveModel(refs[1].provider, refs[1].key);
      const priceA = kind === 'liveRatioIn' ? a.inputPerMillion : a.outputPerMillion;
      const priceB = kind === 'liveRatioIn' ? b.inputPerMillion : b.outputPerMillion;
      if (priceB <= 0) throw new Error(`Ratio token references a zero-price model: ${payload}`);
      return String(Math.round(priceB / priceA));
    }

    // —— 区间类（一组模型的价位区间 / 相对第一个模型的倍数区间）——
    if (kind === 'liveBandIn' || kind === 'liveBandOut') {
      const refs = resolveRefs(payload);
      const models = refs.map((r) => liveModel(r.provider, r.key));
      const pick = kind === 'liveBandIn' ? (m: LiveModel) => m.inputPerMillion : (m: LiveModel) => m.outputPerMillion;
      const { lo, hi } = bandOf(models, pick);
      return `$${formatPrice(lo)}-$${formatPrice(hi)}`;
    }
    if (kind === 'liveRatioBandIn' || kind === 'liveRatioBandOut') {
      const refs = resolveRefs(payload);
      if (refs.length < 2) {
        throw new Error(`Malformed ratio-band token "${kind}:${payload}" — expected "provider/keyA|provider/keyB|..."`);
      }
      const a = liveModel(refs[0].provider, refs[0].key);
      const others = refs.slice(1).map((r) => liveModel(r.provider, r.key));
      const isIn = kind === 'liveRatioBandIn';
      const priceA = isIn ? a.inputPerMillion : a.outputPerMillion;
      const pick = isIn ? (m: LiveModel) => m.inputPerMillion : (m: LiveModel) => m.outputPerMillion;
      if (priceA <= 0) throw new Error(`Ratio-band token references a zero-price model: ${payload}`);
      const ratios = others.map((m) => Math.round(pick(m) / priceA));
      const lo = Math.min(...ratios);
      const hi = Math.max(...ratios);
      return lo === hi ? String(lo) : `${lo}-${hi}`;
    }

    // —— 占比比较类（A 的价格是 B 的百分之多少）——
    if (kind === 'liveShareIn' || kind === 'liveShareOut' || kind === 'liveShareMix') {
      const refs = resolveRefs(payload);
      if (refs.length !== 2) {
        throw new Error(`Malformed ratio token "${kind}:${payload}" — expected "provider/keyA|provider/keyB"`);
      }
      const a = liveModel(refs[0].provider, refs[0].key);
      const b = liveModel(refs[1].provider, refs[1].key);
      const priceOf = (m: LiveModel): number => {
        if (kind === 'liveShareIn') return m.inputPerMillion;
        if (kind === 'liveShareOut') return m.outputPerMillion;
        return mixedCostPerRequest(m);
      };
      const priceB = priceOf(b);
      if (priceB <= 0) throw new Error(`Comparison token references a zero-price model: ${payload}`);
      return `${Math.round((priceOf(a) / priceB) * 100)}%`;
    }

    // —— 派生价类（单次请求成本 / 按系数缩放 / 按 reqs/day 的月支出）——
    if (kind === 'liveCostIn' || kind === 'liveCostOut') {
      const { ref, param } = splitRefParam(payload, kind);
      const model = liveModel(ref.provider, ref.key);
      const price = kind === 'liveCostIn' ? model.inputPerMillion : model.outputPerMillion;
      return `$${formatExact((param * price) / 1e6)}`;
    }
    if (kind === 'liveCostMix') {
      const parts = payload.split('|');
      if (parts.length !== 3) {
        throw new Error(`Malformed ${kind} token "${payload}" — expected "provider/key|inTokens|outTokens"`);
      }
      const { provider, key } = splitRef(parts[0]);
      const inTokens = Number(parts[1]);
      const outTokens = Number(parts[2]);
      if (!Number.isFinite(inTokens) || !Number.isFinite(outTokens)) {
        throw new Error(`Malformed ${kind} token "${payload}" — token counts must be numbers`);
      }
      const model = liveModel(provider, key);
      return `$${formatExact((inTokens * model.inputPerMillion + outTokens * model.outputPerMillion) / 1e6)}`;
    }
    if (kind === 'liveScaledIn' || kind === 'liveScaledOut') {
      const { ref, param } = splitRefParam(payload, kind);
      const model = liveModel(ref.provider, ref.key);
      const price = kind === 'liveScaledIn' ? model.inputPerMillion : model.outputPerMillion;
      return `$${formatExact(param * price)}`;
    }
    if (kind === 'liveMonthlyAt') {
      const { ref, param } = splitRefParam(payload, kind);
      const model = liveModel(ref.provider, ref.key);
      const perRequest = mixedCostPerRequest(model);
      return `$${formatMoneyExact(param * perRequest)}`;
    }

    const { provider, key } = splitRef(payload);
    const model = liveModel(provider, key);
    switch (kind) {
      case 'liveName':
        return model.name;
      case 'liveIn':
        return `$${formatPrice(model.inputPerMillion)}`;
      case 'liveOut':
        return `$${formatPrice(model.outputPerMillion)}`;
      case 'liveMonthly':
        return `$${formatMoney(monthlySpend(model))}`;
      case 'liveBatch':
      case 'liveBatchIn':
      case 'liveBatchOut': {
        if (model.batchInputPerMillion === null || model.batchOutputPerMillion === null) {
          throw new NoLiveBatchRateError(provider, key);
        }
        if (kind === 'liveBatchIn') return `$${formatPrice(model.batchInputPerMillion)}`;
        if (kind === 'liveBatchOut') return `$${formatPrice(model.batchOutputPerMillion)}`;
        return `$${formatPrice(model.batchInputPerMillion)} / $${formatPrice(model.batchOutputPerMillion)}`;
      }
      case 'live':
      default:
        return `$${formatPrice(model.inputPerMillion)} / $${formatPrice(model.outputPerMillion)}`;
    }
  });
}

/** 深遍历一个结构，把所有字符串值里的 token 解析掉（其余原样返回） */
export function resolveLiveTokensDeep<T>(value: T): T {
  if (typeof value === 'string') return resolveLiveTokens(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => resolveLiveTokensDeep(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveLiveTokensDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}

/** 这段文本里还有没有没解析掉的 token（守卫用） */
export function hasUnresolvedToken(text: string): boolean {
  return (
    /\{\{\s*(live|liveName|liveIn|liveOut|liveMonthly|liveRatioIn|liveRatioOut|liveBandIn|liveBandOut|liveRatioBandIn|liveRatioBandOut|liveBatch|liveBatchIn|liveBatchOut|liveShareIn|liveShareOut|liveShareMix|liveCostIn|liveCostOut|liveScaledIn|liveScaledOut|liveMonthlyAt|liveCostMix)\s*:/.test(
      text,
    ) || /\{\{liveDate\}\}/.test(text)
  );
}

/** 找出这段文本里引用的所有 provider/key（守卫用） */
export function referencedModels(text: string): Array<{ provider: string; key: string; kind: string }> {
  const out: Array<{ provider: string; key: string; kind: string }> = [];
  const multiRefKinds = new Set([
    'liveRatioIn',
    'liveRatioOut',
    'liveBandIn',
    'liveBandOut',
    'liveRatioBandIn',
    'liveRatioBandOut',
    'liveShareIn',
    'liveShareOut',
    'liveShareMix',
  ]);
  // 「provider/key|数字」形态的 token：只有前一段是模型引用
  const refParamKinds = new Set([
    'liveCostIn',
    'liveCostOut',
    'liveScaledIn',
    'liveScaledOut',
    'liveMonthlyAt',
  ]);
  for (const m of text.matchAll(TOKEN_RE)) {
    const kind = m[1]!;
    if (multiRefKinds.has(kind)) {
      for (const ref of m[2]!.split('|')) {
        const { provider, key } = splitRef(ref);
        out.push({ provider, key, kind });
      }
      continue;
    }
    if (kind === 'liveCostMix') {
      const { provider, key } = splitRef(m[2]!.split('|')[0]!);
      out.push({ provider, key, kind });
      continue;
    }
    if (refParamKinds.has(kind)) {
      const { ref } = splitRefParam(m[2]!, kind);
      out.push({ provider: ref.provider, key: ref.key, kind });
      continue;
    }
    const { provider, key } = splitRef(m[2]!);
    out.push({ provider, key, kind });
  }
  return out;
}

/** 数据集的最后更新时间（守卫/文档用） */
export function liveDatasetDate(): string {
  return String((PRICING as any).lastUpdated ?? '');
}
