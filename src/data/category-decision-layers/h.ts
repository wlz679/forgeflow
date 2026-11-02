// P165 —— 分类 H（Hiring & Team / 招聘与团队）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const H: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Hiring hides four different numbers: what a role really costs, how long it takes to earn that back, what the market will pay for it, and what a departure takes with it. Run them in that order and each answer becomes the input to the next.',
    zh: '招人这件事背后藏着四个不同的数：一个岗位真实要花多少、多久能赚回来、市场愿意为它付多少、人走了要赔掉多少。按这个顺序算，每一步的答案都是下一步的输入。',
  },
  chain: [
    {
      slugs: ['solopreneur-fully-loaded-employee-cost-calculator'],
      purpose: {
        en: 'Start with the denominator every other number here divides by: what one hire really costs each month once benefits, payroll taxes, equipment and overhead are counted, and what rate that head has to bill to break even. Nothing downstream means much until this is on the table.',
        zh: '先算这一页其它数字都要除的那个分母：算上福利、工资税、设备和管理费之后，养一个 head 每个月真实要花多少，以及这个 head 要对外做到什么费率才不亏。下面所有步骤都拿这个数当底，先把它摆上桌。',
      },
    },
    {
      slugs: [
        'solopreneur-time-to-productivity-calculator',
        'solopreneur-productivity-ramp-curve-calculator',
      ],
      purpose: {
        en: 'Now ask when the hire starts paying that cost back. One tool gives you the ramp duration for the level you are hiring, the other gives the week-by-week output underneath it — which is what you need when the question is capacity or a delivery deadline rather than a single number. Pick the one that matches the question in front of you.',
        zh: '接着问这个人什么时候开始把成本赚回来。一支给出你所招职级的爬坡时长，另一支给出这段时间里逐周累积的产出曲线 —— 当你要回答的是产能排布或交付节点，而不是一个孤立数字时，用后面这支。两支对应两种问法，按你手上的问题选一支。',
      },
    },
    {
      slugs: ['solopreneur-comp-banding-calculator'],
      purpose: {
        en: 'With the cost of the role known, decide what the role should be paid. A band built by level and location turns "what do we offer" into a position against the market, which is the only version of that question you can defend to a candidate, to a board, or to your own finance lead.',
        zh: '知道了这个岗位的成本，再决定它该拿多少薪酬。按职级和地区做出来的区间，把「我们给多少」变成一个在市场里的位置 —— 只有这种问法，你才能拿去对候选人、对老板、或者对自家的财务负责人讲清楚。',
      },
    },
    {
      slugs: [
        'solopreneur-attrition-cost-calculator',
        'solopreneur-equity-refresh-calculator',
      ],
      purpose: {
        en: 'Close the loop on the people you already have. One tool measures what a departure really takes from you, the other sizes the refresh equity it takes to keep the people who matter — and the cost of that equity feeds back into the first step, because it belongs to the same total. You do not need both today: run the one that is actually blocking you.',
        zh: '最后把已经在你手上的人这件事收口：一支量走一个真实要从你这儿拿走什么，另一支算留住关键的人要刷多少股权。股权本身的成本再回到第一步 —— 它和别的成本是同一个总数里的两块。两支不必同时跑，先跑卡住的那支。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-fully-loaded-employee-cost-calculator',
      answers: {
        en: 'What does one hire really cost each month once benefits, payroll taxes, equipment and overhead are counted?',
        zh: '算上福利、工资税、设备和管理费之后，养一个 head 每个月真实要花多少？',
      },
      useWhen: {
        en: 'Use it as the denominator for every other figure on this page — pricing, ramp payback and attrition all divide by it. Do not use it to set an offer: it tells you what a role costs you, not what the market will pay for it.',
        zh: '把它当这一页其它数字的分母 —— 定价、爬坡回本、离职成本都要除以它。别拿它定 offer：它算的是这个岗位对你值多少，不是市场愿意为它付多少。',
      },
    },
    {
      slug: 'solopreneur-time-to-productivity-calculator',
      answers: {
        en: 'How many days before a new hire at this level is carrying a full workload?',
        zh: '这个职级的新人，要多少天才能顶上一个完整的工作量？',
      },
      useWhen: {
        en: 'Use it when you are setting a deadline for a backfill, or deciding whether a role can be hired now rather than next quarter. Do not use it for weekly capacity planning — a single ramp duration cannot tell you how output accumulates in between.',
        zh: '补人的截止时间、或者「这个岗位现在招还是下个季度招」的时候用它。别拿它做每周的产能排布 —— 一个爬坡总时长没法告诉你中途的产出是怎么累积的。',
      },
    },
    {
      slug: 'solopreneur-productivity-ramp-curve-calculator',
      answers: {
        en: 'How does output accumulate week by week from day one, and where does the ramp start paying for itself?',
        zh: '从第一天起，产出是怎么按周累积的？爬坡到哪一步开始回本？',
      },
      useWhen: {
        en: 'Use it when you need the shape of the curve rather than only its length — quarterly capacity plans, or a fast ramp set against a slow one. Do not use it when a rough figure in a headcount plan is enough; the weekly detail costs more attention than that call deserves and invites false precision.',
        zh: '需要的是曲线的形状而不只是长度时用它 —— 季度产能规划，或者把快的爬坡和慢的放在一起比。只在人数规划里填一个大概数的时候别用它：周度细节消耗的注意力超过这次决策该给的，还容易给人虚假的精确感。',
      },
    },
    {
      slug: 'solopreneur-comp-banding-calculator',
      answers: {
        en: 'What pay range should this level in this market be offered, and where does that range sit against competitors?',
        zh: '这个职级在这个市场该给到什么区间？和竞争对手比落在哪儿？',
      },
      useWhen: {
        en: 'Use it when you are setting an offer for a role you have never hired before, or when you suspect your own bands have drifted from the market. Do not use it to judge whether an individual is underpaid — it works at the band level, not person by person.',
        zh: '招一个以前没招过的岗位、或者怀疑自己的薪酬带已经脱离市场时用它。别拿它判断某个人是不是被亏待了 —— 它作用在区间层面，不作用在个人身上。',
      },
    },
    {
      slug: 'solopreneur-equity-refresh-calculator',
      answers: {
        en: 'How much refresh grant keeps a key person here, and how much does that grant dilute?',
        zh: '刷多少股权能把关键的人留住？这些股权会稀释掉多少？',
      },
      useWhen: {
        en: 'Use it when equity is part of the package and you are a few quarters away from the next vesting date, or when a senior person is showing signs of leaving. Do not use it as a retention plan for a whole team you have not sized — dilution scales with headcount, and for junior roles cash is usually the cheaper lever.',
        zh: '股权是薪酬包的一部分、你离下一个归属节点只剩几个季度，或者某个资深的人已经露出离职信号时用它。别拿它当全员留任方案 —— 稀释随人数放大，初级岗位用现金通常更划算。',
      },
    },
    {
      slug: 'solopreneur-attrition-cost-calculator',
      answers: {
        en: 'If someone leaves tomorrow, what does that cost us over the following year?',
        zh: '如果明天有人要走，这件事在未来一年里让我们付出多少代价？',
      },
      useWhen: {
        en: 'Use it when someone has already resigned and you are deciding whether to backfill, or when you need to justify retention spend to whoever owns the budget. Do not use it to price the next raise — that is a compensation decision, and this tool answers a different question.',
        zh: '已经有人提离职、你要决定补不补人时用它，或者要跟预算负责人论证留人投入时用它。别拿它给下一次加薪定价 —— 那是薪酬决策，这个工具回答的不是那个问题。',
      },
    },
  ],
};
