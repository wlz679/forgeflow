// P165 —— 分类 T（Customer Support / 客户支持）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const T: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Support metrics get mixed up because two of them measure two different stretches of the same ticket. Work the clock in pieces first, then ask what the customer thought of it, and only then look at the money and the headcount.',
    zh: '客服的指标之所以总被搞混，是因为其中两个量的是同一张工单里的两段不同时间。先把时钟拆开量，再问客户自己怎么想，最后才谈钱和人。',
  },
  chain: [
    {
      slugs: ['solopreneur-first-response-time-calculator'],
      purpose: {
        en: 'Start with the first clock: how long before a person actually answers, and how often that answer lands inside the promised window. Acknowledgement and completion are separate measurements with separate clocks, because a ticket can be picked up instantly and still sit for days, so they have to be measured apart.',
        zh: '从第一只钟开始：人多久真正回话，以及有多少次落在承诺的窗口之内。「接住」和「做完」是两次测量、两口不同的钟 —— 一张工单可以秒回却挂了好几天，所以必须分开量。',
      },
    },
    {
      slugs: ['solopreneur-resolution-time-calculator'],
      purpose: {
        en: 'Now the second clock: how long the work actually takes once somebody owns the ticket, and how heavy the slow tail behind the median is. The average hides the tickets that hurt, so read the distribution rather than the summary number, and remember that a long tail is a staffing problem before it is a product problem.',
        zh: '接着是第二只钟：事情真正开始做之后要花多久，以及中位数后面拖着多重的尾巴。平均值会把真正吃亏的那批工单藏起来，所以要看分布而不是汇总值；同时记住，长尾首先是人力配置问题，其次才是产品问题。',
      },
    },
    {
      slugs: ['solopreneur-csat-calculator'],
      purpose: {
        en: 'Ask the customer, not the dashboard: what score do the people who wrote those tickets give, and how much does that score say about whether they stay. A good response time with a bad satisfaction score is a common and expensive combination, because it usually means you answered quickly and did not actually help.',
        zh: '问客户，别问看板：写下那些工单的人给出什么分？这个分对「他们会不会留下」有多大预测力？响应很快但满意度很差是常见且昂贵的组合 —— 通常意味着你回得快，却没有真的解决问题。',
      },
    },
    {
      slugs: [
        'solopreneur-deflection-rate-calculator',
        'solopreneur-cost-per-support-ticket-calculator',
        'solopreneur-support-capacity-planning-calculator',
      ],
      purpose: {
        en: 'Finally convert the workload into economics. Three questions live here: how many tickets never reached a person, what one handled ticket costs once people, tools and overhead are all loaded in, and how many agents that volume needs. Pick the one your decision needs, because the other two are downstream of it.',
        zh: '最后把工作量折成经济账。这里有三个问题：多少工单根本没进人工、一张真正被处理的工单在摊完人力、工具和管理费之后值多少、以及这个量需要几个人。按你眼下的决策选一个就够，其余的都建立在它之上。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-first-response-time-calculator',
      answers: {
        en: 'How quickly does a person first answer, and how often does that answer land inside the promised window?',
        zh: '人第一次回话要等多久？有多少次真的落在了承诺的窗口之内？',
      },
      useWhen: {
        en: 'Use it when the promise you make is that you will get back to someone, because then this is the number the customer actually experiences and the one your SLA is written against. Do not use it as proof the problem is solved: a fast acknowledgement with a slow fix is a worse experience than a slower but complete answer. And do not merge it with resolution time when you report, because the two clocks fail differently.',
        zh: '当你对客户的承诺是「我们会回你」时用它 —— 这时响应时间才是客户真正感受到的数，也是你的 SLA 对着写的那个。别拿它证明问题已经解决：秒回但拖着不解决，体验比回得慢但一次搞定更糟。而且汇报时别把它和解决时间并成一个数 —— 两只钟，坏法也不一样。',
      },
    },
    {
      slug: 'solopreneur-resolution-time-calculator',
      answers: {
        en: 'How long does the work take once someone owns the ticket, and how heavy is the slow tail behind the median?',
        zh: '有人接手之后，事情真正做完要多久？中位数后面拖着多重的尾巴？',
      },
      useWhen: {
        en: 'Use it when the promise is that it will be fixed, and you need to know whether the queue clears at a workable pace, including the tickets nobody likes to talk about. Do not use it to judge responsiveness, because a fast first answer with a slow fix is a completely different failure. Also read the tail rather than the average: one bad month can hide inside a comfortable median.',
        zh: '当承诺是「会被修好」、你需要知道队列是不是在以能接受的节奏清空时用它，包括那批没人愿意提的工单。别拿它评价响应速度 —— 回得快但修得慢，是完全另一种失败。另外要看尾部而不是平均：糟糕的一个月，很可能就藏在还过得去的中位数里面。',
      },
    },
    {
      slug: 'solopreneur-csat-calculator',
      answers: {
        en: 'How satisfied are the people who contacted us, and how well does that answer predict whether they stay with us?',
        zh: '来找过我们的客户有多满意？这个答案对「他们还会不会留下来」预测得有多准？',
      },
      useWhen: {
        en: 'Use it as the outcome the two clocks are supposed to produce, and whenever you need a customer-side signal rather than an internal one. Do not use it as a diagnostic: a low score tells you that customers are unhappy, not which clock failed, so pair it with response and resolution timing before you act. And watch the response rate, because a score collected from a narrow slice of tickets is not the customer base.',
        zh: '把它当作那两只钟本来该产出的结果来用；当你需要的是客户侧的信号而不是内部指标时用它。但别拿它当诊断：低分只说明客户不满意，不说明是哪只钟坏了 —— 动手之前先和响应、解决时间对起来。另外盯住问卷回收率，因为只从一小撮工单里收上来的分数，并不代表全部客户。',
      },
    },
    {
      slug: 'solopreneur-deflection-rate-calculator',
      answers: {
        en: 'How many tickets get answered without a person ever touching them, and which channel is doing that work?',
        zh: '有多少工单在没人碰过的情况下就解决了？是哪条渠道在干这个活？',
      },
      useWhen: {
        en: 'Use it when you want to shrink the workload rather than merely manage it, because it is the only number here that shows how much demand never became a ticket at all. Do not use it as a quality win: a ticket closed by self-service that comes back later is worse than one handled by a person, so watch what happens after the deflection. And do not quote it without the response volume, because a high rate on a small base proves very little.',
        zh: '当你想把工作量做小而不是管好时用它 —— 这是这一组里唯一一个能显示「有多少需求根本没变成工单」的数。但别把它当成质量成绩：自助关掉、之后又回来的工单，比人工处理完还糟糕，所以要看分流之后发生了什么。而且引用这个比率时必须带上响应总量 —— 小基数上的高比率说明不了什么。',
      },
    },
    {
      slug: 'solopreneur-cost-per-support-ticket-calculator',
      answers: {
        en: 'What does one handled ticket really cost once salaries, tooling and overhead are all loaded in?',
        zh: '把工资、工具和管理费都摊进去，一张真正被处理的工单实际成本是多少？',
      },
      useWhen: {
        en: 'Use it when the argument is about unit economics: a pricing change, a channel decision, or whether support is priced into the model at all. Do not use it to compare the efficiency of two teams, because different mixes of tier and channel make the two numbers incomparable unless you normalise first. And do not read it as a quality measure: the cheapest ticket is not necessarily the best-resolved one.',
        zh: '当争论点是单位经济时用它 —— 改定价、换渠道、或者「支持成本到底有没有算进模型里」。别拿它比较两个团队的效率：层级和渠道构成不同，不先归一化，这两个数没有可比性。也别把它当质量指标 —— 最便宜的那张工单未必是解决得最好的一张。',
      },
    },
    {
      slug: 'solopreneur-support-capacity-planning-calculator',
      answers: {
        en: 'How many agents does this ticket volume actually need, and how should they be split across the tiers?',
        zh: '这个工单量到底需要几个人？这些人该怎么在各个层级之间分配？',
      },
      useWhen: {
        en: 'Use it when the decision is about people — hiring, scheduling, or moving work between tiers — because it turns ticket volume and handle time into a headcount you can plan against. Do not use it to judge whether the team is doing well, since it assumes a target handle time and therefore inherits whatever you assume about productivity. And do not run it on a single busy week without smoothing the seasonality first.',
        zh: '当决策是关于人的时候用它 —— 招人、排班、或者把工作在不同层级之间重新分配 —— 因为它把工单量和单张处理时长换算成一个能拿来做规划的人数。别拿它评判团队干得好不好：它假定了一个目标处理时长，所以它继承了你对生产力的全部假设。而且别拿某一个忙的周直接算，先把季节性抹平。',
      },
    },
  ],
};
