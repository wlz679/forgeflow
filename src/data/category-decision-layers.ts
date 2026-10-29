// P159 — 2.0「灵魂改造」批次 1：分类页的「决策层」（Category Decision Layer）。
//
// 这是 D6 拍板的批次 1（分类页 19 页）的内容形态。第一版只做 1 个类别
//（B / ai-cost-tools）做样板，跑通形态与验收判据后再铺其余 11 个类别。
//
// ── 这一层为什么必须存在 ──────────────────────────────────────────
//
// 实测（GSC 网页表，2026-07-26 → 2026-10-25）：
//   分类页 19 页 = 1,789 展示 = 全站 13.4%，**0 点击**，加权排名 38.6。
//   19 个分类页的正文词数中位只有 655（英文页 620）。
//   组内「模板词」占比 **12.6%** —— 19 个分类页共用同一副「描述骨架」，
//   是全站唯一带组内模板词的一类 ⇒ AdSense 最可能采样的那类页面。
//
// 所以分类页缺的不是「更多字」，而是**这一类工具该怎么组合使用**的答案。
// 下面这两层正是那个答案：
//
//   L1 选型链路（chain）——「先做 A，再做 B，最后校准 C」
//   L2 工具取舍对照（choices）——「每个工具回答什么问题、什么时候不该用它」
//
// ── 两条硬约束 ────────────────────────────────────────────────────
//
// 1. **不搬运主题页的基准表。** 那是站内自己制造重复内容，正是 §10.1【C】
//    刚证明要避开的那条线。分类页给的是**决策层**，主题页给的是**基准表**。
// 2. **不写价格。** 主题页基准表里的价格目前是手写的静态值，与实时数据集
//    已经漂移（实测 6 行漂移，最严重的一条输出价差 8.33 倍）⇒ 在价格改成
//    从 `src/data/ai-pricing.json` 派生之前，分类页**不发布任何价格**。
//    ⇒ L3「阈值速查」层被这项工作阻塞，暂不实现（见规格文档 §10.5）。
//
// ── 数据形状 ──────────────────────────────────────────────────────
//
// 每个 step 的 slugs 可以有多个 —— 表示「这一步按你实际情况选一个」，
// 不是「这些工具串起来都要跑一遍」。choices 必须覆盖该类别的**每一个**工具
// （守卫钉住），否则用户会在对照表里找不到自己的工具。

export type DecisionLang = 'en' | 'zh';

export interface DecisionChainStep {
  /**
   * 这一步用到的工具（≥ 1）。
   * 多个 = 「按你实际在用的那家 / 那类场景选一个」，不是「全部都要跑」。
   */
  slugs: string[];
  /** 这一步在回答什么问题（页面独有的决策说明，不是工具简介的复述） */
  purpose: Record<DecisionLang, string>;
}

export interface ToolChoiceRow {
  /** 工具 slug —— 必须存在于 src/data/tools 注册表且属于该类别 */
  slug: string;
  /** 它回答什么问题 */
  answers: Record<DecisionLang, string>;
  /** 什么时候该用它（而不是别的那个） */
  useWhen: Record<DecisionLang, string>;
}

export interface CategoryDecisionLayer {
  /** 选型链路的一句话导语 */
  chainIntro: Record<DecisionLang, string>;
  /** L1：选型链路 */
  chain: DecisionChainStep[];
  /** L2：工具取舍对照表 */
  choices: ToolChoiceRow[];
}

/**
 * 按类别 id 索引。目前只有 B —— 其余 11 个类别在样板形态确认后铺开。
 *
 * ⚠️ 类别 id 必须与 `src/data/categories.ts` 的 id 一致；
 *    守卫会穷举 tools 注册表核对「choices 覆盖该类别每一个工具」。
 */
export const CATEGORY_DECISION_LAYERS: Record<string, CategoryDecisionLayer> = {
  B: {
    chainIntro: {
      en: 'These eight calculators answer four different questions, and mixing them up is the most common way AI bills go wrong. Work down the path below — each step feeds the next.',
      zh: '这 8 个计算器回答的是四个不同的问题，把它们用混是 AI 账单算错最常见的原因。按下面的路径走，每一步的结果都是下一步的输入。',
    },
    chain: [
      {
        slugs: ['solopreneur-ai-api-cost-comparison'],
        purpose: {
          en: 'Turn your usage into a number first. One request shape (input tokens, output tokens, requests per day) priced against all four flagship models tells you whether this workload is cheap, normal, or expensive — before you optimise anything.',
          zh: '先把用量变成一个数字。同一份请求形态（输入 token、输出 token、每天请求数）在四家旗舰模型上的价格，会先告诉你这个负载到底是便宜、正常还是贵 —— 在你做任何优化之前。',
        },
      },
      {
        slugs: [
          'solopreneur-openai-token-calculator',
          'solopreneur-claude-api-cost-calculator',
          'solopreneur-gemini-api-cost-calculator',
          'solopreneur-deepseek-api-cost-calculator',
        ],
        purpose: {
          en: 'Now add the levers the comparison cannot see: cache hit rate, batch pricing and monthly growth. Pick the provider you actually run on — the comparison page prices standard requests, and caching is usually where the real saving lives.',
          zh: '现在把对比页看不到的杠杆加进去：缓存命中率、批处理价、月度增长。选你实际在用的那一家 —— 对比页算的是标准请求，而真正省钱的地方通常在缓存里。',
        },
      },
      {
        slugs: ['solopreneur-ai-api-cost-comparison'],
        purpose: {
          en: 'If that number is still above budget, the fix is a different model, not a smaller batch. Go back and check the same request shape against a cheaper tier — the cheapest model overall is usually not the flagship one.',
          zh: '如果这个数还是超预算，问题出在模型档位，不在批量。回到上一步，用同一份请求形态去比更便宜的档位 —— 整体最便宜的模型通常不是旗舰那个。',
        },
      },
      {
        slugs: [
          'solopreneur-ai-image-cost-calculator',
          'solopreneur-gpu-cloud-cost-calculator',
          'solopreneur-ai-training-cost-estimator',
        ],
        purpose: {
          en: 'Finally, check what the token bill is hiding. Generated images, rented GPUs and one-off fine-tuning are billed on completely different scales, and a team whose bill "is all API" often has most of its cost outside the API.',
          zh: '最后查一下 token 账单以外的部分。生成的图片、租的 GPU、一次性的微调，走的是完全不同的计价尺度；很多自认为「全是 API 花费」的团队，真正的大头其实在 API 之外。',
        },
      },
    ],
    choices: [
      {
        slug: 'solopreneur-ai-api-cost-comparison',
        answers: {
          en: 'What does one fixed request shape cost across OpenAI, Claude, Gemini and DeepSeek?',
          zh: '同一份请求形态，在 OpenAI、Claude、Gemini、DeepSeek 四家各要花多少钱？',
        },
        useWhen: {
          en: 'Use it when you have not picked a provider yet, or when you want to know whether a cheaper model would do the same job. Do not use it for cache savings — it prices standard requests.',
          zh: '还没定用哪家、或者想知道换个更便宜的模型够不够用的时候用它。别拿它算缓存能省多少 —— 它算的是标准请求。',
        },
      },
      {
        slug: 'solopreneur-openai-token-calculator',
        answers: {
          en: 'What will this OpenAI bill look like once caching, batch pricing and growth are counted?',
          zh: '算上缓存、批处理价和用量增长之后，OpenAI 这张账单会是什么样？',
        },
        useWhen: {
          en: 'Use it when OpenAI is your only provider and you are deciding between GPT tiers or turning on prompt caching. For multi-provider workloads, price the whole shape in the comparison page first.',
          zh: '只用 OpenAI、并且正在决定用哪一档 GPT 或要不要开提示缓存的时候用它。多家并用的话，先在对比页把整体形态算一遍。',
        },
      },
      {
        slug: 'solopreneur-claude-api-cost-calculator',
        answers: {
          en: 'How much does cache writes and cache reads change a Claude bill versus pay-per-token?',
          zh: '缓存写入和缓存读取会把 Claude 的账单改变多少（相对于纯按 token 计费）？',
        },
        useWhen: {
          en: 'Use it when your prompt prefix repeats across requests — that is exactly where Claude cache write and read pricing flips the answer. Use the OpenAI calculator for OpenAI-side caching instead.',
          zh: '当你的提示前缀在多次请求之间重复时用它 —— 那正是 Claude 的缓存写入/读取定价会翻转结论的场景。OpenAI 那边的缓存请用 OpenAI 的计算器。',
        },
      },
      {
        slug: 'solopreneur-gemini-api-cost-calculator',
        answers: {
          en: 'What does Gemini context caching and batch pricing save on a long-context workload?',
          zh: '在长上下文负载上，Gemini 的上下文缓存和批处理价能省多少？',
        },
        useWhen: {
          en: 'Use it when you pass large documents on every request — context caching is priced per cached token, so long context without caching is the expensive mistake here.',
          zh: '每次请求都要传大文档时用它 —— 上下文缓存按缓存 token 计价，所以「长上下文但不缓存」是这个工具里最贵的那个错法。',
        },
      },
      {
        slug: 'solopreneur-deepseek-api-cost-calculator',
        answers: {
          en: 'What does DeepSeek cost after automatic caching, and how far below the others does that land?',
          zh: '算上自动缓存之后 DeepSeek 多少钱？比别家低多少？',
        },
        useWhen: {
          en: 'Use it when high request volume matters more than frontier quality. DeepSeek auto-caches repeat prefixes, so the effective rate on a repeated-prompt workload is well below its headline price.',
          zh: '请求量比前沿质量更重要的时候用它。DeepSeek 会对重复前缀自动缓存，所以重复提示负载上的实际单价远低于它的表面价格。',
        },
      },
      {
        slug: 'solopreneur-ai-image-cost-calculator',
        answers: {
          en: 'What does one generated image cost, and is a subscription cheaper than per-image API billing?',
          zh: '生成一张图多少钱？订阅制比按张计费的 API 更便宜吗？',
        },
        useWhen: {
          en: 'Use it when images are a line item, not a rounding error — it covers 7 providers across per-image API and subscription tiers. It says nothing about token costs.',
          zh: '当图片是一笔真实开销而不是零头时用它 —— 它覆盖 7 家 provider 的按张 API 与订阅档位。它不涉及 token 成本。',
        },
      },
      {
        slug: 'solopreneur-gpu-cloud-cost-calculator',
        answers: {
          en: 'What does renting GPUs actually cost per hour across providers, and what do spot and reserved tiers change?',
          zh: '跨各家租 GPU 每小时到底多少钱？现货和预留档位会改变多少？',
        },
        useWhen: {
          en: 'Use it when you self-host inference or training. It compares on-demand, spot and reserved pricing across 6 clouds, plus storage and egress — the two costs that surprise GPU bills most.',
          zh: '自建推理或训练时用它。它跨 6 家云比对按需、现货、预留三档价格，还算存储与出口流量 —— 这两项才是 GPU 账单里最让人意外的开销。',
        },
      },
      {
        slug: 'solopreneur-ai-training-cost-estimator',
        answers: {
          en: 'What does one fine-tuning or pre-training run cost in total, including storage and data processing?',
          zh: '一次微调或预训练总共要花多少钱（含存储与数据处理）？',
        },
        useWhen: {
          en: 'Use it when you are about to train or fine-tune rather than call an API. It prices GPU hours, storage and processing together, and separates LoRA from full fine-tuning.',
          zh: '准备自己训或微调、而不是调 API 时用它。它把 GPU 小时、存储和数据处理合在一起算，并区分 LoRA 与全量微调。',
        },
      },
    ],
  },
};

/** 取某个类别的决策层；没有配置就返回 null（调用方据此不渲染该区块） */
export function getCategoryDecisionLayer(categoryId: string): CategoryDecisionLayer | null {
  return CATEGORY_DECISION_LAYERS[categoryId] ?? null;
}
