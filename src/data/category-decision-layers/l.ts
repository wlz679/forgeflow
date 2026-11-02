// P165 —— 分类 L（Legal & Compliance / 法律与合规）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const L: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Compliance work is usually budgeted as a wall of unrelated line items. It is not: there is a worst case that sets the ceiling, a recurring cost that sets the floor, a revenue question hiding inside your consent banner, and a tail event that can cut through both. Read them in that order.',
    zh: '合规支出通常被当成一堆互不相干的条目来编预算。其实不是：有一个最坏情况划出上限，有一笔年年都要付的固定成本划出下限，还有同意横幅里藏着一个收入问题，以及一件能把上下限一起穿过去的尾部事件。按这个顺序读。',
  },
  chain: [
    {
      slugs: ['solopreneur-gdpr-fine-calculator'],
      purpose: {
        en: 'Put the worst case on the table first: what this violation tier would plausibly cost if a regulator came, and how much of that is your own doing versus the facts of your sector. This number is the ceiling every later decision gets measured against.',
        zh: '先把最坏情况摆上桌：如果监管真的来了，按这个违规档位可能要付出多少，其中多少是你自己造成的、多少是行业事实决定的。这个数是后面每个决定的天花板。',
      },
    },
    {
      slugs: [
        'solopreneur-dsar-cost-calculator',
        'solopreneur-dpa-cost-calculator',
      ],
      purpose: {
        en: 'Then measure the part you will pay every single year: the handling of individual access requests, and the legal time spent negotiating data processing agreements with vendors. One scales with request volume, the other with contract volume — start with the one that is actually growing for you.',
        zh: '然后量你每年都要付的那部分：单个访问请求的处理，以及和供应商谈数据处理协议花掉的法务工时。一个跟着请求量走，另一个跟着合同量走 —— 先算在你这儿真的在涨的那一个。',
      },
    },
    {
      slugs: [
        'solopreneur-consent-revenue-impact-calculator',
        'solopreneur-cmp-roi-calculator',
      ],
      purpose: {
        en: 'Next open the revenue question hiding inside the consent banner: the tracking and targeting you lose when people decline, priced as revenue. Then ask the follow-up, which is whether a consent platform can win enough of it back. Loss first, tool second — reverse that order and you are quoting a tool before you know what it has to recover.',
        zh: '接着打开同意横幅里藏着的那个收入问题：用户拒绝之后你丢掉的追踪与定向能力，折算成收入。然后再问后一句 —— 一套同意平台能不能把这份损失挣回来一些。先算损失，再谈工具；顺序反过来，你就变成在还不知道要挽回多少的情况下先报工具的价。',
      },
    },
    {
      slugs: ['solopreneur-breach-notification-cost-calculator'],
      purpose: {
        en: 'Finally size the tail event: one breach, notified to every affected person, with remediation and a possible regulatory action running at the same time. Set it against the annual figures from the earlier steps — that comparison, not the yearly budget, is what tells you how much insurance to buy, how tight to write a liability clause, and how long to keep logs.',
        zh: '最后给尾部事件定量级：一次泄露，要通知每一个受影响的人，修复和可能的监管动作同时开账。把它和前面几步的年度数字放在一起比 —— 决定保险买多少、合同里的责任条款卡多紧、日志留多久的，是这个对比，不是年度预算本身。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-gdpr-fine-calculator',
      answers: {
        en: 'If a regulator came after us, what would this violation tier plausibly cost us over a year?',
        zh: '如果监管找上门，按这个违规档位算，一年里可能要付出多少？',
      },
      useWhen: {
        en: 'Use it to size the worst case and to argue internally for compliance spend — it is the number that makes a control worth buying. Do not use it as a legal opinion on whether you are compliant: it prices a violation, it does not decide whether one happened.',
        zh: '用来给最坏情况定量级，也用它在内部为合规投入争预算 —— 是那个能让「买一道控制」变得好算的数。别拿它当「我们到底合不合规」的法律意见：它给违规定价，不判断违规有没有发生。',
      },
    },
    {
      slug: 'solopreneur-dsar-cost-calculator',
      answers: {
        en: 'What does handling one data subject request cost us, and what does a year of them add up to?',
        zh: '处理一个主体访问请求要花多少？一年下来累计是多少？',
      },
      useWhen: {
        en: 'Use it when request volume is rising or you are weighing a self-service portal — it is the clearest way to price the automation decision before you sign for a tool. Do not use it for a single manual request: fixed setup work dominates one case and the number will mislead you.',
        zh: '请求量在涨、或者你在掂量要不要上自助门户时用它 —— 这是签工具之前给自动化决策定价最清楚的方式。别拿它算零星的一次手动请求：单件案例里固定设置成本占大头，这个数会误导你。',
      },
    },
    {
      slug: 'solopreneur-consent-revenue-impact-calculator',
      answers: {
        en: 'What is the consent banner costing us each year in lost targeting accuracy?',
        zh: '同意横幅每年让我们损失多少定向精度带来的收入？',
      },
      useWhen: {
        en: 'Use it when a meaningful share of traffic comes from markets that require consent and someone wants the banner made friendlier. Do not use it for markets that do not require consent, and do not read it as a conversion metric — it captures tracking and targeting loss, which is a different question from checkout behaviour.',
        zh: '当相当一部分流量来自需要同意的市场、而有人在问要不要把横幅做友好一点时用它。别拿它用在不需要同意的市场，也不要把它当成转化指标 —— 它量的是追踪与定向的损失，跟结账行为是两个问题。',
      },
    },
    {
      slug: 'solopreneur-dpa-cost-calculator',
      answers: {
        en: 'What does negotiating data processing agreements cost us in legal time, and how much does a messy one multiply that?',
        zh: '谈判数据处理协议要花多少法务工时？协议改得越乱，这个数会放大多少？',
      },
      useWhen: {
        en: 'Use it when contract volume is the driver: many vendors, many small customers, or a sales team that keeps agreeing to bespoke clauses. Do not use it for one strategic customer negotiation, where the commercial value of the deal dwarfs the legal hours involved.',
        zh: '当合同数量是主要驱动时用它 —— 供应商很多、小客户很多，或者销售团队老是同意定制条款。别拿它算单个战略客户的谈判，那笔交易的商业价值远大于法务工时。',
      },
    },
    {
      slug: 'solopreneur-breach-notification-cost-calculator',
      answers: {
        en: 'If we had a breach, what would notifying everyone and fixing it actually cost?',
        zh: '如果真的发生泄露，通知所有受影响的人再加上修复，真实成本是多少？',
      },
      useWhen: {
        en: 'Use it to size insurance, contractual liability caps, and how much forensic effort you can justify before an incident. Do not fold it into a yearly operating budget as a recurring line — it is a tail event, and treating it as recurring is how small teams quietly talk themselves out of the controls they need.',
        zh: '用来定保险额度、合同里的责任上限，以及事到临头你愿意投入多少取证与修复。别把它当成年度运营预算里的一条常规支出 —— 它是尾部事件，把它当常规，正是小团队悄悄放弃该上的控制的方式。',
      },
    },
    {
      slug: 'solopreneur-cmp-roi-calculator',
      answers: {
        en: 'Does a consent management platform pay for itself once the extra consent it wins is priced in?',
        zh: '把多拿到的同意率折算成钱之后，同意管理平台还能回本吗？',
      },
      useWhen: {
        en: 'Use it when you are choosing between buying a consent platform and keeping the banner you have, and you want the revenue side of that argument on the table. Do not use it when most of your traffic does not need consent — the licence cost still arrives, the uplift it unlocks does not.',
        zh: '在「买一套同意平台」和「维持现在这个横幅」之间做选择、并且想把收入那半边也摆上桌时用它。别在大部分流量不需要同意的场景用它 —— 许可费照付，它带来的那点提升却不会出现。',
      },
    },
  ],
};
