// P165 —— 分类 P（Product Analytics / 产品分析）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
// L1 选型链：找断点 → 看激活 → 看时长 → 看使用形状；L2 对照表给的是每个工具的适用边界。
import type { CategoryDecisionLayer } from './types';

export const P: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Product teams drown in metrics and still cannot say where the journey breaks. The tools here are ordered by how early they answer that question: find the break, check whether new users reach value at all, measure how long value takes, then look at the shape of the usage that is left.',
    zh: '产品团队淹在指标里，却依然说不清用户在哪一步掉了。这几个工具是按「多早能回答这个问题」排的：先找断点，再看新用户到底有没有走到价值，然后量这个价值花了多久，最后看剩下的使用长什么形状。',
  },
  chain: [
    {
      slugs: ['solopreneur-funnel-step-calculator', 'solopreneur-feature-adoption-calculator'],
      purpose: {
        en: 'Locate the break first, and pick the granularity your data actually supports. The funnel step calculator walks a five-stage journey and names the stage that costs you the most people; the feature adoption calculator goes inside the product and measures how many active users ever touch a given feature. Use the first when you hold stage counts, the second when you hold per-feature usage events.',
        zh: '先定位断点，并按你手上的数据选粒度。漏斗步骤转化率计算器沿着五段路径走一遍，指出哪一段让你损失的人最多；功能采用率计算器钻进产品内部，量有多少活跃用户真正用过某个功能。手里有阶段计数就用前者，有功能级使用事件就用后者。',
      },
    },
    {
      slugs: ['solopreneur-activation-rate-calculator'],
      purpose: {
        en: 'Now zoom in on the newest cohort: of the people who just signed up, how many reach the behaviour that counts as value? An activation event is a definition you have to choose, and this step forces you to state it before measuring how many signups reach it. Whatever step one exposed as broken usually sits upstream of this number.',
        zh: '接着把镜头拉近到最新那一批人：刚注册的人里，有多少做到了那个「算数的」行为？激活事件是你自己下的定义，这一步会逼你先把这个定义写清楚，再去量有多少注册用户走到了那里。第一步暴露的断点，几乎总在这个数的前面。',
      },
    },
    {
      slugs: ['solopreneur-time-to-value-calculator'],
      purpose: {
        en: 'For the people who do get there, ask how long it took. The median tells you what a typical signup experienced, while the later percentiles tell you how many are still stuck after the median user has already succeeded. That gap is where onboarding work actually pays off, and it stays invisible for as long as you only look at the average.',
        zh: '对那些走到了的人，问一句「用了多久」。中位数告诉你一个典型注册用户的经历，而更靠后的百分位告诉你：当中位数用户已经用上的时候，还有多少人卡着。这个差就是新手引导的功夫真正兑现的地方，只看平均值的话，它会一直藏着。',
      },
    },
    {
      slugs: ['solopreneur-stickiness-calculator', 'solopreneur-power-user-curve-calculator'],
      purpose: {
        en: 'Last, ask whether usage is a habit or a handful of power users. Stickiness measures how many days a month your typical active user shows up; the power user curve measures how concentrated the activity is, which tells you whether revenue rests on a small group. Pick by the decision in front of you: cadence questions go to stickiness, concentration questions go to the curve.',
        zh: '最后问一句：使用到底是习惯，还是靠少数几个重度用户撑着。粘性衡量你的典型活跃用户一个月来几天；重度用户曲线衡量活跃度有多集中，从中能看出收入是不是压在一小群人身上。按你眼下要做的决定挑：要谈频率就选粘性，要谈集中度就选曲线。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-funnel-step-calculator',
      answers: {
        en: 'Which step of the journey is losing me the most people?',
        zh: '这段用户路径上，哪一步让我损失的人最多？',
      },
      useWhen: {
        en: 'Use it when you have counts at each stage and no idea where to look, because it ranks steps by people lost rather than by rate — a late step with a modest rate can still be the expensive one. Do not use it for in-product behaviour where you only hold feature events, and do not use it to compare acquisition channels, which is a marketing funnel question.',
        zh: '当你手上每一步都有计数、却不知道该从哪儿查时用它 —— 它按「掉了多少人」而不是按比例给步骤排序，所以一个比例不算低但位置靠后的步骤也可能才是真贵的那一步。没有功能级事件就别拿它看产品内行为，也别拿它比较获客渠道，那是营销漏斗的问题。',
      },
    },
    {
      slug: 'solopreneur-feature-adoption-calculator',
      answers: {
        en: 'Does anyone actually use the feature we shipped, and is it worth keeping?',
        zh: '我们做出来的东西，真的有人在用吗？还该不该留着它？',
      },
      useWhen: {
        en: 'Use it when a feature has been live for a while and the argument is about keeping it, pushing it or killing it. It measures adoption against active users, adds a stickiness view on top, and tells you what adoption would have to look like for the feature to earn its keep. Do not use it to judge a brand-new launch, because the audience has not had time to discover it.',
        zh: '当一个功能已经上线一段时间、争论的是留着它、推它还是砍掉它时用它。它用活跃用户做分母来量采用率，上面还叠了一层粘性视角，并告诉你采用率要达到什么水平这个功能才养得起自己。不要拿它评判刚上线的首发 —— 目标用户还没来得及发现它。',
      },
    },
    {
      slug: 'solopreneur-activation-rate-calculator',
      answers: {
        en: 'Of the people who sign up, how many ever reach the behaviour that makes them a customer?',
        zh: '注册的人里，有多少真的做出了那个「让他成为客户」的行为？',
      },
      useWhen: {
        en: 'Use it when a healthy-looking top of the funnel sits next to a product that feels empty, because activation is where signups get separated from people who might actually pay. It forces you to define the activation event before measuring it. Do not use it once you have a well-chosen event and a trend line — it will not tell you which onboarding change worked, only how many reached the bar.',
        zh: '当前端数字看着挺漂亮、产品却空空如也时用它 —— 激活正是把注册和「真的会付费的人」分开的地方。它会逼你先把激活事件定下来再去量。不要拿它去看那些已经选好事件、而且已经有趋势线的场景 —— 它不会告诉你新手引导的哪个改动有效，只告诉你有多少人达到了那条线。',
      },
    },
    {
      slug: 'solopreneur-stickiness-calculator',
      answers: {
        en: 'How often does my typical active user come back, and is that enough to grow without paid acquisition?',
        zh: '我的典型活跃用户多久回来一次？这够不够让我不靠付费投放自己长起来？',
      },
      useWhen: {
        en: 'Use it when you are deciding whether a product-led motion can carry growth on its own, because this ratio separates a habit from a one-off visit, and it lets you test what a better return frequency would do. Do not use it for a product whose users visit on a weekly or monthly schedule by nature — the ratio looks weak even when the product is excellent.',
        zh: '当你在判断产品自驱能不能不靠付费投放自己长起来时用它，因为这个比值能分清「习惯」和「一次性到访」，它也能让你试算回访频率改善之后会怎样。不要拿它去看那种天生按周或按月使用的产品 —— 即使产品很好，这个比值也会显得难看。',
      },
    },
    {
      slug: 'solopreneur-time-to-value-calculator',
      answers: {
        en: 'How long does a new user take to get their first real win, and how bad is the slow half?',
        zh: '新用户要多久才拿到第一次真正的价值？慢的那一半到底有多糟？',
      },
      useWhen: {
        en: 'Use it when activation numbers look acceptable but users keep saying the product was hard to get into, because an average hides the group that never arrives. It reports the median next to later percentiles, so you can see how concentrated the waiting is. Do not use it as a speed benchmark to publish — it is a tool for finding where onboarding stalls, not for comparing yourself to other products.',
        zh: '当激活数字看着还行、用户却一直说产品难用起来时用它，因为平均值把「根本没到」的那批人藏起来了。它在中位数之外还给出更靠后的百分位，你能看出等待有多集中。不要拿它当对外发布的速度基准 —— 它是用来找新手引导卡在哪里的工具，不是拿来跟别家比产品的。',
      },
    },
    {
      slug: 'solopreneur-power-user-curve-calculator',
      answers: {
        en: 'Is my usage base concentrated in a few people, and what happens to revenue if they leave?',
        zh: '我的使用是不是集中在少数人身上？他们走了收入会怎样？',
      },
      useWhen: {
        en: 'Use it when you are about to commit to a plan that quietly assumes broad usage, or when you notice revenue depends on a handful of accounts. It models how much activity comes from the top slice of users and lets you shift that distribution to see the effect. Do not use it for a product with a naturally narrow core audience, where concentration is the design rather than a defect.',
        zh: '当你准备做的计划默认了「大家都在用」，或者发现收入压在少数几个账户上时用它。它建模头部那一小撮用户贡献了多少活跃度，并允许你调整这个分布去看结果。不要拿它去看核心用户天然很窄的产品 —— 那里的集中是设计，不是缺陷。',
      },
    },
  ],
};
