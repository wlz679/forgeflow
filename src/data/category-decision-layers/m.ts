// P165 —— 分类 M（Marketing Analytics / 营销分析）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
// L1 选型链：先定渠道 → 找漏点 → 选杠杆 → 验回本；L2 对照表给的是每个工具的适用边界。
import type { CategoryDecisionLayer } from './types';

export const M: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Marketing numbers break in a predictable way: you optimise the channel you can see rather than the channel that earns its cost back. Work down this chain — each step hands the next one a number, and the last step decides whether the spend was worth repeating.',
    zh: '营销的数字出错是有固定套路的：你优化的是看得见的那个渠道，而不是真正能把成本挣回来的那个。按这条链往下走，每一步都会把一个数交给下一步；最后一步决定这笔钱值不值得继续花。',
  },
  chain: [
    {
      slugs: ['solopreneur-roas-calculator', 'solopreneur-ltv-by-channel-calculator'],
      purpose: {
        en: 'Start by asking which channel deserves the next unit of budget. The ROAS calculator prices the campaign you are actually running against your own margin; the channel comparison ranks up to five channels by what a customer is worth versus what you paid to get them. Both output a ranked answer, not a list of impressions, and that ranking is the input for everything after.',
        zh: '先回答一个问题：下一个单位的预算该给哪个渠道。ROAS 计算器用你自己的毛利去衡量正在跑的那个投放活动；分渠道 LTV 计算器把最多五个渠道按「一个客户值多少」对「你为他花了多少」排成一张表。两个工具给的都是一个排序，而不是一串曝光数字 —— 这个排序就是后面所有步骤的输入。',
      },
    },
    {
      slugs: ['solopreneur-funnel-value-calculator'],
      purpose: {
        en: 'Now take the channel you just cleared and find where inside it the traffic dies. This calculator splits impressions, clicks, leads and sales into separate stages and points at the single stage that leaks the most value. Work out that stage first: fixing the biggest absolute leak is worth more than tuning every stage at once, and the broken stage tells you which lever to pick next.',
        zh: '接下来把刚筛出来的渠道拆开，看流量是在哪一步漏掉的。这个计算器把展示、点击、潜客、销售分成独立的阶段，并指出漏掉价值最多的那一段。先把那一段修掉：修最大的绝对损失，比把每段都微调一遍更值 —— 而断在哪一段，正好决定了下一步该挑哪个杠杆。',
      },
    },
    {
      slugs: [
        'solopreneur-email-campaign-roi-calculator',
        'solopreneur-content-marketing-roi-calculator',
        'solopreneur-coupon-attribution-calculator',
        'solopreneur-cart-abandonment-cost-calculator',
      ],
      purpose: {
        en: 'Pick the one lever that matches the stage you found broken. Reach an existing list by email; buy compounding traffic with content; buy immediate volume with a discount; or recover the orders that were already started. Pick a single one — running three of these against the same leak is how a team spends a quarter and proves nothing about which change actually worked.',
        zh: '针对你找到的那一段断点，挑一个与之匹配的杠杆：用邮件触达已有的名单；用内容买会复利的流量；用折扣换即时的量；或者去挽回那些已经开了单却没付的订单。只挑一个 —— 同一个漏洞上同时上三个杠杆，就是团队花一个季度却证明不出哪个改动真正有效的原因。',
      },
    },
    {
      slugs: ['solopreneur-cohort-retention-calculator'],
      purpose: {
        en: 'Last, check whether the customers you bought stay long enough to pay for themselves. Cohort retention shows which month a monthly group fades in and how long it takes to earn back what that group cost. If the payback lands past the window your cash cycle can wait, no amount of funnel polishing rescues the decision — and this is the number that tells you whether the channel from step one deserves another round of budget.',
        zh: '最后确认你买来的客户是不是待得够久、自己能把自己赚回来。队列留存会显示每一批月度客户是在哪个月掉的，以及这批人成本要多长时间才能收回。如果回本点落在你的现金循环等不起的时间窗外，漏斗上再怎么打磨都救不回来 —— 而这个数，也正是判断第一步筛出的渠道该不该再投一轮预算的依据。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-roas-calculator',
      answers: {
        en: 'Is the ad campaign I am running actually making money once my own margin comes out of it?',
        zh: '我正在跑的这个广告活动，扣掉自己的毛利之后真的在赚钱吗？',
      },
      useWhen: {
        en: 'Use it when one paid campaign needs a verdict you can defend out loud to a partner. It prices spend against margin-aware net profit, so it is the right check for "should I keep bidding". Do not use it to rank channels — that is a different question and it needs customer-level value, not ad-attributed revenue.',
        zh: '当某一个投放活动需要一个你能对着合伙人心服口服说出来的结论时用它。它用扣掉毛利之后的净利去衡量，所以适合回答「这笔竞价该不该继续」。别拿它比较渠道 —— 那是另一个问题，需要的是客户层面的价值，不是广告归因到的收入。',
      },
    },
    {
      slug: 'solopreneur-ltv-by-channel-calculator',
      answers: {
        en: 'Which of my channels are worth more than what I paid for them, and which should be cut?',
        zh: '我的哪些渠道挣回来的比花出去的多，哪些该砍掉？',
      },
      useWhen: {
        en: 'Use it once you run more than one channel and the argument is about the budget split rather than a single campaign. It ranks channels by value against cost and suggests where to move money. Do not use it to judge one campaign in isolation, and do not trust it before you have a defensible retention number — a wrong lifetime value pushes money in exactly the wrong direction.',
        zh: '当你同时跑着不止一个渠道、争论的是预算怎么分而不是某一个活动时用它。它按价值与成本之比给渠道排序，并指出钱该往哪挪。不要拿它单独评判一个活动；在你还没有一个站得住的留存数字之前也别信它 —— 生命周期价值估错了，钱就会精准地流到反方向去。',
      },
    },
    {
      slug: 'solopreneur-funnel-value-calculator',
      answers: {
        en: 'Inside the channel that pays, which stage of the journey is actually leaking the most value?',
        zh: '在能赚钱的那个渠道里，这段路径的哪一步漏掉的价值最多？',
      },
      useWhen: {
        en: 'Use it when a channel works overall but growth feels flat, and you need to know where the next week of effort should go. It ranks stages by lost value rather than by rate, so the biggest absolute leak wins. Do not use it to compare channels, and do not use it to judge a feature — it needs stage-level traffic and revenue counts, not in-product events.',
        zh: '当你已经知道某个渠道整体有效、增长却上不去，想知道下一周的力气该花在哪时用它。它按损失的绝对值而不是按比例给阶段排序，所以漏得最多的那段会浮上来。不要拿它比较渠道，也不要拿它评判产品功能 —— 它需要的是阶段级的流量和收入计数，不是产品内的事件。',
      },
    },
    {
      slug: 'solopreneur-cohort-retention-calculator',
      answers: {
        en: 'Do the customers I acquired stay long enough to earn back what they cost?',
        zh: '我获取来的客户，待得够久、把成本赚回来了吗？',
      },
      useWhen: {
        en: 'Use it when you are close to scaling spend and need to know whether the payback horizon fits your cash cycle. It shows which month a cohort fades and how that decay compounds into projected lifetime value. Do not use it to judge acquisition efficiency in the short term — a product with no history yet has no cohort to measure, and the answer would be invented.',
        zh: '当你快要放量、需要知道回本周期撑不撑得住你的现金循环时用它。它会显示一批客户是在第几个月掉的，以及这个衰减怎么叠加成生命周期价值预测。不要拿它评判短期的获客效率 —— 还没有历史数据的产品根本没有队列可测，出来的答案只会是编的。',
      },
    },
    {
      slug: 'solopreneur-email-campaign-roi-calculator',
      answers: {
        en: 'Does one email campaign earn more than the time and money it takes to run it?',
        zh: '一封邮件带来的回报，能盖住运营它的时间与成本吗？',
      },
      useWhen: {
        en: 'Use it when you already own a list and the real question is what one send is worth. It separates gross from net revenue and prices the cost per click and per open. Do not use it to decide whether to grow the list in the first place, and do not treat a handful of sends as evidence — response rates swing hard with list size and send timing.',
        zh: '当你手上已经有一份名单、真正的问题是「发一次到底值多少钱」时用它。它把毛收入和净收入分开，也把每次点击、每次打开的单价算出来。不要拿它去决定要不要先扩名单；也别把少量发送的样本当证据 —— 响应率会随名单规模和发送时间大幅摆动。',
      },
    },
    {
      slug: 'solopreneur-content-marketing-roi-calculator',
      answers: {
        en: 'Is the content I publish turning into traffic and revenue, and how long does the ramp take?',
        zh: '我发出来的内容，有没有变成流量和收入？起量要多久？',
      },
      useWhen: {
        en: 'Use it when you are investing in search or long-form content and the hard question is timing rather than order size. It models a ramp period, then a steady state, and lets you choose how you credit the conversion. Do not use it for work that pays back inside the first week, and do not read its first-year number as a monthly promise.',
        zh: '当你往搜索或长内容上投钱、真正难的问题是时间而不是客单价时用它。它把起爬阶段建模出来，再给稳定态，并允许你选择用哪种归因口径。不要拿它去算那些一周之内就能见结果的事，也不要把它第一年的数字当成每个月的承诺。',
      },
    },
    {
      slug: 'solopreneur-coupon-attribution-calculator',
      answers: {
        en: 'How much of the revenue my coupon produced would have happened anyway?',
        zh: '我这张优惠券带来的收入里，有多少本来也会发生？',
      },
      useWhen: {
        en: 'Use it when a discount campaign looked successful and you want the honest version. It adjusts coupon revenue for cannibalization, so it can turn out that a campaign was profitable on the headline and negative once you account for what you gave away. Do not use it as a discount policy tool — it tells you what a past campaign really earned, not what rate to set next time.',
        zh: '当一场折扣活动看起来很成功、你想看真实版本时用它。它会按蚕食效应修正优惠券收入，所以完全可能出现「账面赚钱、算清代价之后反而亏」的活动。不要拿它当定价工具用 —— 它告诉你的是过去那场活动到底赚了多少，不是下一张该定多少折扣。',
      },
    },
    {
      slug: 'solopreneur-cart-abandonment-cost-calculator',
      answers: {
        en: 'What is the unfinished-order revenue actually costing us, and is a recovery push worth running?',
        zh: '那些没付完的订单，到底让我们损失了多少？做一次挽回值得吗？',
      },
      useWhen: {
        en: 'Use it when the store converts but leaves a visible pile of unfinished orders, and you want to size both the loss and a recovery campaign against it. It splits the loss into revenue and customer-value pieces and lets you price the recovery itself. Do not use it for a checkout that breaks technically — fix that bug first, because no email rescues a broken payment step.',
        zh: '当店铺转化还行、却明显堆着一堆没付完的订单时用它，你想同时看清损失规模以及一次挽回值不值。它把损失拆成收入与客户价值两块，并让你给挽回动作本身定价。不要拿它去对付技术性崩掉的结账流程 —— 先把那个 bug 修好，因为没有任何一封邮件能救一个坏掉的支付步骤。',
      },
    },
  ],
};
