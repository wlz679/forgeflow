// P165 —— 分类 D（Freelance Pricing / 自由职业定价）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const D: CategoryDecisionLayer = {
  chainIntro: {
    en: 'These six calculators cover two different businesses: selling hours, and selling products that keep earning after you hand them over. Price the time-based half first, because that number becomes the yardstick every product price has to clear.',
    zh: '这 6 个工具对应的是两种不同的生意：卖时间，以及卖出交付之后还能继续产生收入的产品。先把卖时间这一半算清楚 —— 它的数字就是后面每个产品定价必须跨过的那道门槛。',
  },
  chain: [
    {
      slugs: ['solopreneur-freelance-rate-calculator'],
      purpose: {
        en: 'Start with what one hour of your work is worth, before any client or price is in the picture. The rate that comes out of this step is the floor under every quote you make later, and an hourly figure nobody has stress-tested is where most underpricing starts.',
        zh: '先在还没有任何客户和报价的情况下，算清你一小时的工作值多少。这一步得到的费率是后面所有报价的地板 —— 而一个从没被压力测试过的时薪数字，正是大多数定价过低的起点。',
      },
    },
    {
      slugs: ['solopreneur-hourly-vs-fixed-calculator'],
      purpose: {
        en: 'Now decide the shape of the deal, using that hourly figure as the input: bill by the hour, quote the whole project, or sell a monthly retainer. This step is where your rate becomes a number you can actually put in front of someone.',
        zh: '接下来用刚才那个费率作为输入，决定合作形态：按小时计、整包报价，还是按月收顾问费。这一步是把费率换算成真正能摆在客户面前的数字。',
      },
    },
    {
      slugs: ['solopreneur-project-profitability-calculator'],
      purpose: {
        en: 'Take the number from step two and test it against what the work really costs you. A fixed price that looked good on paper can still leave you under your own rate once unpaid hours and overhead are counted, and finding that out mid-project is far more expensive than finding it out here.',
        zh: '把第二步的报价拿去对冲这份工作的真实成本。就算纸面上看起来不错的固定报价，在算进无偿的加班和间接开销之后，也可能低于你自己的时薪；而在项目中途才发现这件事，代价远高于现在就算清楚。',
      },
    },
    {
      slugs: [
        'solopreneur-course-pricing-calculator',
        'solopreneur-email-list-revenue-calculator',
        'solopreneur-affiliate-income-calculator',
      ],
      purpose: {
        en: 'Finally price the assets that keep earning without your calendar: a course, an email list, or affiliate content. Use whichever stream you actually run, and then hold its returns against the hourly number from step one, because a product that earns less per hour of your work is not a better deal.',
        zh: '最后给那些不靠你日程表也能继续赚钱的东西定价：课程、邮件列表，或者联盟内容。选你实际在跑的那一个，再把它的收益和第一步的时薪摆在一起比 —— 每小时赚得更少的产品，并不是一笔更好的生意。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-freelance-rate-calculator',
      answers: {
        en: 'What should one hour of my work be sold for, given my skill, my experience and my market?',
        zh: '以我的技能、经验水平和所在市场来看，我一小时的工作到底该卖多少钱？',
      },
      useWhen: {
        en: 'Use it when you are setting a rate from scratch, moving to a different speciality, or entering a new market. Do not use it to price a specific project, because it produces a baseline to argue from rather than a number to send.',
        zh: '适合在从零定费率、换专业方向、或者进入新市场时使用。别拿它给具体项目定价 —— 它给你的是用来讲道理的基准，而不是可以直接发出去的数字。',
      },
    },
    {
      slug: 'solopreneur-hourly-vs-fixed-calculator',
      answers: {
        en: 'Which pricing shape reaches my annual target, and what does each shape look like per month or per project?',
        zh: '哪种收费形态才能达成我的年度目标？每种形态折算到每个月、每个项目又分别是多少？',
      },
      useWhen: {
        en: 'Use it when you know the income you need but not the structure of the deal. Do not use it once a scope is agreed, because it starts from the target and works backwards rather than from the work forwards.',
        zh: '适合已经知道目标收入、但还没定下合作形态时使用。不要等范围谈定了才用它 —— 它是从目标往回推，不是从工作往回推。',
      },
    },
    {
      slug: 'solopreneur-project-profitability-calculator',
      answers: {
        en: 'How much of this project actually stays with me, and what hourly rate is my client really paying me?',
        zh: '这个项目真正落到我手里的是多少？客户实际付给我的时薪又是多少？',
      },
      useWhen: {
        en: 'Use it after the deal is signed, or whenever you suspect a project is running underwater, especially with a fixed price and open-ended revisions. It is a review tool, not a way to set the price beforehand.',
        zh: '适合在合同签下之后，或者你怀疑某个项目正在水下的时候使用，尤其是固定报价加上开放式改稿的情况。它是复盘工具，不是事前定价的工具。',
      },
    },
    {
      slug: 'solopreneur-course-pricing-calculator',
      answers: {
        en: 'What price should my course carry so that enrollment and platform fees still leave me my income goal?',
        zh: '我的课程该定什么价，才能在扣掉平台费用、又按预期招生之后，依然达成我的收入目标？',
      },
      useWhen: {
        en: 'Use it when you sell a fixed-price course and can estimate how many people will buy. Do not use it for a cohort with live teaching, where the hours per student shift the arithmetic every single term.',
        zh: '适合卖固定价课程、且能大致估出购买人数时使用。别拿它算有真人授课的长期班 —— 每期的师生投入都在改变这笔账。',
      },
    },
    {
      slug: 'solopreneur-email-list-revenue-calculator',
      answers: {
        en: 'What does one send of my list actually earn, and what does that add up to over a quarter?',
        zh: '我的邮件列表发一次究竟能赚多少？按季度累计下来又是多少？',
      },
      useWhen: {
        en: 'Use it when you already own a list and want to know what a campaign is worth before you write it. It says nothing about list growth, so do not use it to decide how much to spend acquiring subscribers.',
        zh: '适合手上已经有一份订阅名单、想在动笔之前先知道这封信值多少钱时使用。它不涉及名单本身的增长，所以别拿它来定拉新预算。',
      },
    },
    {
      slug: 'solopreneur-affiliate-income-calculator',
      answers: {
        en: 'If this traffic converts at this rate, how much commission comes back to me each month?',
        zh: '如果这份流量按这个转化率转化，每个月能带回多少佣金收入？',
      },
      useWhen: {
        en: 'Use it when you already have traffic and want to sanity-check an affiliate offer against your own numbers. Do not use it to decide whether to start a content site, because it assumes the audience is already there.',
        zh: '适合已经有流量、想用自己的数据验证一个联盟方案时使用。别拿它来判断该不该开始做内容站 —— 它默认受众已经存在。',
      },
    },
  ],
};
