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
// P161 新增（GPU 段 —— 数据集 `gpu.providers`）
// ------------------------------------------
//   {{liveGpuProviderCount}}                       → "6"（数据集里的 GPU 云供应商家数）
//   {{liveGpuProviderList}}                        → "RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure"
//   {{liveGpuProviderName:provider}}               → "RunPod"（数据集里的显示名）
//   {{liveGpuTypeList}}                            → "H200, H100, A100, L40S, RTX 4090, A6000"
//   {{liveGpuTypeCount}}                           → "6"
//   {{liveGpuRate:provider|type}}                   → "$2.49"（按需 $/GPU-小时）
//   {{liveGpuSpot:provider|type}}                   → "$1.49"（现货 = rate × spotMult）
//   {{liveGpuReserved:provider|type}}               → "$2.24"（预留 1 年 = rate × reservedMult）
//   {{liveGpuRange:type}}                          → "$1.69-$4.20"（该型号按需价区间）
//   {{liveGpuSpotRange:type}}                      → "$0.85-$2.50"（该型号现货价区间）
//   {{liveGpuOffSpot}}                             → "30-60"（现货折扣 % 区间）
//   {{liveGpuOffReserved}}                         → "10-30"（预留折扣 % 区间）
//   {{liveGpuShare:A|type|tierA|B|type|tierB}}      → "10%"（A 的有效价是 B 的百分之多少）
//   {{liveGpuRatio:A|type|tierA|B|type|tierB}}      → "10.1"（B 是 A 的多少倍）
//
// ⚠️ share / ratio 的 payload 顺序恒为「**便宜方在前**」（A 便宜、B 贵）：
//    ratio 返回的是 **B ÷ A**（B 是 A 的多少倍），share 返回的是 **A ÷ B**（占 B 的百分之多少）。
//    两个方向相反 —— 写反了会得到一句彻底错误却无人报错的话（P160 的同一教训）。
//   {{liveGpuMonthly:provider|type|tier|gpus|hrs}} → "$7,171.20"（月账单）
//   {{liveGpuMonthlyBlend:provider|type|r|s|gpus|hrs}} → "$6,023.81"（预留/现货混合月账单）
//   {{liveGpuMonthlyRange:type|tier|gpus|hrs}}     → "$4,867.20-$12,096.00"
//   {{liveGpuMonthlyBlendRange:type|r|s|gpus|hrs}} → "$3,455.52-$7,027.20"
//   {{liveGpuBlendBand:type|r|s}}                  → "61-84"（混合档相对按需的 % 区间）
//   {{liveGpuCheapest:type|tier}}                  → "Vast.ai"（该型号/档位最便宜的供应商名）
//   {{liveGpuPriceiest:type|tier}}                 → "GCP"（该型号/档位最贵的供应商名）
//
// ⚠️ provider 位可以是 **min / max** 两个假名 —— 表示「该型号 + 该档位下
//    最便宜 / 最贵的供应商」。写死供应商名会在价格顺序反转后变成一句彻底错误
//    却无人报错的话（P160 的同一教训）。
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

/**
 * 全部 token 种类的**单一真相源**。
 *
 * ⚠️ 为什么不是手写两遍正则：`TOKEN_RE`（解析用）和 `hasUnresolvedToken`（守卫用）
 *   如果各写各的，少实现一种 token 时守卫会「看起来更绿」—— 这正是 P160 修过的
 *   覆盖盲区（窄正则让守卫看起来比实际更绿）。所以两处都从这一个数组生成。
 */
const TOKEN_KINDS = [
  'live',
  'liveName',
  'liveIn',
  'liveOut',
  'liveMonthly',
  'liveRatioIn',
  'liveRatioOut',
  'liveBandIn',
  'liveBandOut',
  'liveRatioBandIn',
  'liveRatioBandOut',
  'liveBatch',
  'liveBatchIn',
  'liveBatchOut',
  'liveShareIn',
  'liveShareOut',
  'liveShareMix',
  'liveCostIn',
  'liveCostOut',
  'liveCostMix',
  'liveScaledIn',
  'liveScaledOut',
  'liveMonthlyAt',
  // —— P161: GPU 段 ——
  'liveGpuProviderCount',
  'liveGpuProviderList',
  'liveGpuProviderName',
  'liveGpuTypeList',
  'liveGpuTypeCount',
  'liveGpuRate',
  'liveGpuSpot',
  'liveGpuReserved',
  'liveGpuRange',
  'liveGpuSpotRange',
  'liveGpuOffSpot',
  'liveGpuOffReserved',
  'liveGpuShare',
  'liveGpuRatio',
  'liveGpuMonthly',
  'liveGpuMonthlyBlend',
  'liveGpuMonthlyRange',
  'liveGpuMonthlyBlendRange',
  'liveGpuBlendBand',
  'liveGpuCheapest',
  'liveGpuPriceiest',
] as const;

const TOKEN_KIND_PATTERN = TOKEN_KINDS.join('|');

/**
 * token 形态：{{kind:payload}}。
 *
 * ⚠️ payload 对**参数类** token 是必填的，但**无参类**（{{liveGpuProviderCount}}）
 *   没有冒号 —— 所以这一段里 payload 整体是可选的；参数类 token 少写 payload
 *   会在解析时抛「Malformed」（而不是静默通过）。
 */
const TOKEN_RE = new RegExp(`\\{\\{(${TOKEN_KIND_PATTERN})(?::([^{}]+))?\\}\\}`, 'g');

/**
 * GPU 段的 token 种类（守卫用 —— 这些 token 的 payload 里**没有** provider/key，
 * 所以 `referencedModels` 必须跳过它们，否则 LLM 守卫的「两个观察器对齐」会误报）。
 */
export const GPU_TOKEN_KINDS = new Set<string>([
  'liveGpuProviderCount',
  'liveGpuProviderList',
  'liveGpuProviderName',
  'liveGpuTypeList',
  'liveGpuTypeCount',
  'liveGpuRate',
  'liveGpuSpot',
  'liveGpuReserved',
  'liveGpuRange',
  'liveGpuSpotRange',
  'liveGpuOffSpot',
  'liveGpuOffReserved',
  'liveGpuShare',
  'liveGpuRatio',
  'liveGpuMonthly',
  'liveGpuMonthlyBlend',
  'liveGpuMonthlyRange',
  'liveGpuMonthlyBlendRange',
  'liveGpuBlendBand',
  'liveGpuCheapest',
  'liveGpuPriceiest',
]);

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

// ---------------------------------------------------------------------------
// P161 —— GPU 段（数据集 `gpu.providers`）
// ---------------------------------------------------------------------------
//
// 为什么 GPU 也要派生
// ------------------
// 实测（2026-10-30）：GPU 主题页的编辑内容里同时存在**三套**供应商口径
// —— 正文列 10 家（6 专用 + 4 超大规模）、步骤写 7 家（多一个 CoreWeave）、
// 数据集只有 6 家；而**三套档位折扣区间**也彼此矛盾：
//
//   现货折扣   数据集 30-60%   工具页 md 40-60%   主题页 50-70%
//   预留折扣   数据集 10-30%   工具页 md 15-30%   主题页 30-60%
//
// 全部 GPU 单价区间也已脱节（H100 主题页写 $2.49-$12.40/hr，数据集是
// $1.69-$4.20/hr）。根因和 P158/P160 一样：**同一个事实两个真相源**，
// 而其中一个每周只被 bot 更新一次。
//
// ⇒ 修法：GPU 的供应商名单、单价、档位折扣、月账单全部从数据集派生。
//
// 档位语义（和数据集字段一一对应）：
//   rates                    = 按需（on-demand）$/GPU-小时
//   rates × spotMult         = 现货（spot / preemptible）
//   rates × reservedMult     = 预留 1 年（reserved）
//   blend(r, s)              = rates × (reservedMult × r + spotMult × s)
//
// ⚠️ `min` / `max` 是**假 provider 名**：表示该型号 + 该档位下最便宜 / 最贵的
//    供应商。编辑写「最低价是 AWS 的 60%」时，归属必须跟着数据集走 ——
//    写死供应商名会在价格顺序反转后变成一句彻底错误却无人报错的话。

export type GpuTier = 'on' | 'spot' | 'reserved';

export interface LiveGpuProvider {
  key: string;
  name: string;
  rates: Record<string, number>;
  spotMult: number;
  reservedMult: number;
  order: number;
}

/** 假 provider 名：该型号 / 该档位下最便宜 / 最贵的供应商 */
export const GPU_MIN = 'min';
export const GPU_MAX = 'max';

export class UnknownGpuProviderError extends Error {
  constructor(provider: string) {
    super(
      `Unknown GPU provider "${provider}" — it is not in src/data/ai-pricing.json (gpu.providers). ` +
        'Editorial content may name a provider the dataset no longer carries; use the current key ' +
        '(or {{liveGpuProviderList}}) instead of leaving a stale reference.',
    );
    this.name = 'UnknownGpuProviderError';
  }
}

export class UnknownGpuTypeError extends Error {
  constructor(provider: string, type: string) {
    super(
      `GPU type "${type}" is not offered by "${provider}" in src/data/ai-pricing.json ` +
        '(gpu.providers.rates). Use one of: ' +
        'H200 / H100 / A100 / L40S / RTX4090 / A6000.',
    );
    this.name = 'UnknownGpuTypeError';
  }
}

/** 型号显示名（数据集的 key 里没有空格：RTX4090 → "RTX 4090"） */
const GPU_TYPE_DISPLAY: Record<string, string> = { RTX4090: 'RTX 4090' };

/** 数据集里的 GPU 供应商（按 order 排序 —— 这是页面上展示的顺序） */
function gpuProviders(): LiveGpuProvider[] {
  const raw = (PRICING as any).gpu?.providers ?? {};
  return Object.entries(raw)
    .map(([key, value]: [string, any]) => ({
      key,
      name: String(value.name ?? key),
      rates: (value.rates ?? {}) as Record<string, number>,
      spotMult: Number(value.spotMult ?? 1),
      reservedMult: Number(value.reservedMult ?? 1),
      order: Number(value.order ?? 999),
    }))
    .sort((a, b) => a.order - b.order);
}

function gpuProvider(key: string): LiveGpuProvider {
  const found = gpuProviders().find((p) => p.key === key);
  if (!found) throw new UnknownGpuProviderError(key);
  return found;
}

/** 数据集里出现过的所有 GPU 型号（按供应商顺序的首次出现次序） */
function gpuTypes(): string[] {
  const out: string[] = [];
  for (const p of gpuProviders()) {
    for (const t of Object.keys(p.rates)) {
      if (!out.includes(t)) out.push(t);
    }
  }
  return out;
}

export function gpuTypeLabel(type: string): string {
  return GPU_TYPE_DISPLAY[type] ?? type;
}

/** 档位倍率 */
function tierMultiplier(
  provider: LiveGpuProvider,
  tier: GpuTier | { reserved: number; spot: number },
): number {
  if (tier === 'on') return 1;
  if (tier === 'spot') return provider.spotMult;
  if (tier === 'reserved') return provider.reservedMult;
  const sum = tier.reserved + tier.spot;
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(
      `Malformed GPU blend — reserved + spot shares must sum to 1, got ${tier.reserved}+${tier.spot}`,
    );
  }
  return provider.reservedMult * tier.reserved + provider.spotMult * tier.spot;
}

/** 某个供应商在某个型号 + 档位下的有效 $/GPU-小时 */
function gpuEffectiveRate(
  provider: LiveGpuProvider,
  type: string,
  tier: GpuTier | { reserved: number; spot: number },
): number {
  const base = provider.rates[type];
  if (base === undefined) throw new UnknownGpuTypeError(provider.key, type);
  return base * tierMultiplier(provider, tier);
}

/** 解析 provider 位：真实 key，或 min / max 两个假名 */
function resolveGpuProvider(
  key: string,
  type: string,
  tier: GpuTier | { reserved: number; spot: number },
): LiveGpuProvider {
  if (key !== GPU_MIN && key !== GPU_MAX) return gpuProvider(key);
  const candidates = gpuProviders().filter((p) => p.rates[type] !== undefined);
  if (candidates.length === 0) throw new UnknownGpuTypeError('*', type);
  const sorted = candidates.slice().sort((a, b) => {
    const ra = gpuEffectiveRate(a, type, tier);
    const rb = gpuEffectiveRate(b, type, tier);
    return key === GPU_MIN ? ra - rb : rb - ra;
  });
  return sorted[0]!;
}

/** 档位字符串 → 档位对象（只接受 on / spot / reserved） */
function parseTier(kind: string, raw: string): GpuTier {
  if (raw === 'on' || raw === 'spot' || raw === 'reserved') return raw;
  throw new Error(`Malformed ${kind} token — tier must be on | spot | reserved, got "${raw}"`);
}

/** 混合档位（预留 r + 现货 s） */
function parseBlend(kind: string, r: string, s: string): { reserved: number; spot: number } {
  const reserved = Number(r);
  const spot = Number(s);
  if (!Number.isFinite(reserved) || !Number.isFinite(spot)) {
    throw new Error(`Malformed ${kind} token — blend shares must be numbers, got "${r}" / "${s}"`);
  }
  return { reserved, spot };
}

/** 一组数字的区间（最小-最大；只有两个不同值时才带横杠） */
function formatBand(values: number[], formatter: (v: number) => string): string {
  if (values.length === 0) throw new Error('band token needs at least one value');
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return lo === hi ? formatter(lo) : `${formatter(lo)}-${formatter(hi)}`;
}

/** 百分数（整数，四舍五入） */
function formatPercent(value: number): string {
  return String(Math.round(value));
}

/** 倍数（保留一位小数 —— 和整数版的 liveRatioIn 不同，GPU 价差要看得见小数） */
function formatGpuRatio(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** 某个型号 + 档位下的供应商（按有效价排序） */
function gpuProvidersFor(type: string): LiveGpuProvider[] {
  return gpuProviders().filter((p) => p.rates[type] !== undefined);
}

/** 月账单：GPU 数 × 每天小时数 × 30 天 × 有效单价 */
function gpuMonthlyBill(
  provider: LiveGpuProvider,
  type: string,
  tier: GpuTier | { reserved: number; spot: number },
  gpus: number,
  hoursPerDay: number,
): number {
  const rate = gpuEffectiveRate(provider, type, tier);
  return gpus * hoursPerDay * 30 * rate;
}

function parseNumber(kind: string, raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Malformed ${kind} token — "${raw}" is not a number`);
  }
  return n;
}

function assertPartCount(kind: string, parts: string[], expected: number): void {
  if (parts.length !== expected) {
    throw new Error(
      `Malformed ${kind} token — expected ${expected} payload part(s), got ${parts.length} ("${parts.join('|')}")`,
    );
  }
}

/**
 * 解析一个 GPU token。抛错而不是静默留原文 —— 构建期失败比把
 * `{{liveGpuRate:...}}` 原样发到线上好得多。
 */
function resolveGpuToken(kind: string, payload: string): string {
  const parts = payload.split('|');

  // —— 无参 ——
  if (kind === 'liveGpuProviderCount') {
    assertPartCount(kind, parts, 1);
    return String(gpuProviders().length);
  }
  if (kind === 'liveGpuProviderList') {
    assertPartCount(kind, parts, 1);
    return gpuProviders().map((p) => p.name).join(', ');
  }
  if (kind === 'liveGpuTypeList') {
    assertPartCount(kind, parts, 1);
    return gpuTypes().map(gpuTypeLabel).join(', ');
  }
  if (kind === 'liveGpuProviderName') {
    assertPartCount(kind, parts, 1);
    return gpuProvider(parts[0]!).name;
  }
  if (kind === 'liveGpuTypeCount') {
    assertPartCount(kind, parts, 1);
    return String(gpuTypes().length);
  }
  if (kind === 'liveGpuOffSpot' || kind === 'liveGpuOffReserved') {
    assertPartCount(kind, parts, 1);
    const isSpot = kind === 'liveGpuOffSpot';
    const discountOf = (p: LiveGpuProvider) =>
      (isSpot ? 1 - p.spotMult : 1 - p.reservedMult) * 100;
    const key = parts[0] ?? '';
    // 无参 → 跨供应商的折扣区间（"30-60"）
    if (key === '') {
      return formatBand(gpuProviders().map(discountOf), formatPercent);
    }
    // 带 provider → 该供应商自己的折扣（min / max = 折扣最小 / 最大的那家）
    if (key === GPU_MIN || key === GPU_MAX) {
      const sorted = gpuProviders().slice().sort((a, b) => discountOf(a) - discountOf(b));
      const picked = key === GPU_MIN ? sorted[0]! : sorted[sorted.length - 1]!;
      return formatPercent(discountOf(picked));
    }
    return formatPercent(discountOf(gpuProvider(key)));
  }

  // —— 单价 / 单档位价 ——
  if (kind === 'liveGpuRate' || kind === 'liveGpuSpot' || kind === 'liveGpuReserved') {
    assertPartCount(kind, parts, 2);
    const tier: GpuTier = kind === 'liveGpuSpot' ? 'spot' : kind === 'liveGpuReserved' ? 'reserved' : 'on';
    const provider = resolveGpuProvider(parts[0]!, parts[1]!, tier);
    return `$${formatPrice(gpuEffectiveRate(provider, parts[1]!, tier))}`;
  }

  // —— 区间 ——
  if (kind === 'liveGpuRange' || kind === 'liveGpuSpotRange') {
    assertPartCount(kind, parts, 1);
    const tier: GpuTier = kind === 'liveGpuSpotRange' ? 'spot' : 'on';
    const type = parts[0]!;
    const providers = gpuProvidersFor(type);
    if (providers.length === 0) throw new UnknownGpuTypeError('*', type);
    return formatBand(
      providers.map((p) => gpuEffectiveRate(p, type, tier)),
      (v) => `$${formatPrice(v)}`,
    );
  }

  // —— 占比 / 倍数（两边各带型号 + 档位）——
  if (kind === 'liveGpuShare' || kind === 'liveGpuRatio') {
    assertPartCount(kind, parts, 6);
    const tierA = parseTier(kind, parts[2]!);
    const tierB = parseTier(kind, parts[5]!);
    const providerA = resolveGpuProvider(parts[0]!, parts[1]!, tierA);
    const providerB = resolveGpuProvider(parts[3]!, parts[4]!, tierB);
    const rateA = gpuEffectiveRate(providerA, parts[1]!, tierA);
    const rateB = gpuEffectiveRate(providerB, parts[4]!, tierB);
    if (rateB <= 0) throw new Error(`${kind} token references a zero-price provider: ${payload}`);
    if (kind === 'liveGpuShare') {
      return `${formatPercent((rateA / rateB) * 100)}%`;
    }
    return formatGpuRatio(rateB / rateA);
  }

  // —— 月账单 ——
  if (kind === 'liveGpuMonthly') {
    assertPartCount(kind, parts, 5);
    const tier = parseTier(kind, parts[2]!);
    const gpus = parseNumber(kind, parts[3]!);
    const hoursPerDay = parseNumber(kind, parts[4]!);
    const provider = resolveGpuProvider(parts[0]!, parts[1]!, tier);
    return `$${formatMoneyExact(gpuMonthlyBill(provider, parts[1]!, tier, gpus, hoursPerDay))}`;
  }
  if (kind === 'liveGpuMonthlyBlend') {
    assertPartCount(kind, parts, 6);
    const blend = parseBlend(kind, parts[2]!, parts[3]!);
    const gpus = parseNumber(kind, parts[4]!);
    const hoursPerDay = parseNumber(kind, parts[5]!);
    const provider = resolveGpuProvider(parts[0]!, parts[1]!, blend);
    return `$${formatMoneyExact(gpuMonthlyBill(provider, parts[1]!, blend, gpus, hoursPerDay))}`;
  }
  if (kind === 'liveGpuMonthlyRange') {
    assertPartCount(kind, parts, 4);
    const tier = parseTier(kind, parts[1]!);
    const gpus = parseNumber(kind, parts[2]!);
    const hoursPerDay = parseNumber(kind, parts[3]!);
    const type = parts[0]!;
    const providers = gpuProvidersFor(type);
    if (providers.length === 0) throw new UnknownGpuTypeError('*', type);
    return formatBand(
      providers.map((p) => gpuMonthlyBill(p, type, tier, gpus, hoursPerDay)),
      (v) => `$${formatMoneyExact(v)}`,
    );
  }
  if (kind === 'liveGpuMonthlyBlendRange') {
    assertPartCount(kind, parts, 5);
    const blend = parseBlend(kind, parts[1]!, parts[2]!);
    const gpus = parseNumber(kind, parts[3]!);
    const hoursPerDay = parseNumber(kind, parts[4]!);
    const type = parts[0]!;
    const providers = gpuProvidersFor(type);
    if (providers.length === 0) throw new UnknownGpuTypeError('*', type);
    return formatBand(
      providers.map((p) => gpuMonthlyBill(p, type, blend, gpus, hoursPerDay)),
      (v) => `$${formatMoneyExact(v)}`,
    );
  }

  // —— 混合档相对按需的 % 区间 ——
  if (kind === 'liveGpuBlendBand') {
    assertPartCount(kind, parts, 3);
    const blend = parseBlend(kind, parts[1]!, parts[2]!);
    const type = parts[0]!;
    const providers = gpuProvidersFor(type);
    if (providers.length === 0) throw new UnknownGpuTypeError('*', type);
    return formatBand(
      providers.map((p) => {
        const base = p.rates[type]!;
        const effective = gpuEffectiveRate(p, type, blend);
        return (effective / base) * 100;
      }),
      formatPercent,
    );
  }

  // —— 最便宜 / 最贵的供应商名 ——
  if (kind === 'liveGpuCheapest' || kind === 'liveGpuPriceiest') {
    assertPartCount(kind, parts, 2);
    const tier = parseTier(kind, parts[1]!);
    const provider = resolveGpuProvider(
      kind === 'liveGpuCheapest' ? GPU_MIN : GPU_MAX,
      parts[0]!,
      tier,
    );
    return provider.name;
  }

  throw new Error(`Unknown GPU token kind "${kind}"`);
}

/**
 * 解析一段文本里的所有 token。
 * 未知的 provider/key 会**抛错** —— 构建期失败，而不是把 `{{live:...}}` 原样发到线上。
 */
export function resolveLiveTokens(text: string): string {
  if (!text || !text.includes('{{')) return text;
  const withDate = text.replace(DATE_TOKEN_RE, () => String((PRICING as any).lastUpdated ?? ''));
  return withDate.replace(TOKEN_RE, (_match, kind: string, rawPayload?: string) => {
    // 无参类 token（{{liveGpuProviderCount}}）没有冒号 ⇒ payload 是 undefined
    const payload = rawPayload ?? '';

    // —— GPU 段（数据集 gpu.providers）——
    if (GPU_TOKEN_KINDS.has(kind)) {
      return resolveGpuToken(kind, payload);
    }

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
  // 无参类 token（{{liveGpuProviderCount}}）后面**没有冒号** —— 所以这里不能
  // 要求 `kind:`，否则无参 token 会从守卫的视野里消失（P160 的覆盖盲区同款）。
  return (
    new RegExp(`\\{\\{\\s*(${TOKEN_KIND_PATTERN})\\s*(?::[^{}]*)?\\}\\}`).test(text) ||
    /\{\{liveDate\}\}/.test(text)
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
    // GPU 段的 token 引用的是「供应商 + 型号」，不是模型 —— 不进这个列表。
    if (GPU_TOKEN_KINDS.has(kind)) continue;
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
