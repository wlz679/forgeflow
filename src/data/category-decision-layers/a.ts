// P165 —— 分类 A（SaaS Metrics / SaaS 指标）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const A: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Five calculators that belong in one sequence rather than on one shelf: size the opportunity, model the monthly revenue path, find the leak in that path, then check whether the cash survives the plan. The output of one step is the input of the next, and skipping a step just means you invented a number.',
    zh: '这五个计算器是一条链上的五段，不该并排摆着看：先估这块市场能撑起多大收入，再拆出每月经常性收入的走势，找出漏掉的那一块，最后确认账上的钱能不能撑到那天。每一步的产出就是下一步的输入，跳过任何一段，后面拿到的都只是自己编出来的数字。',
  },
  chain: [
    {
      slugs: ['solopreneur-market-size-estimator'],
      purpose: {
        en: 'Before you forecast anything, check that the prize is worth the effort. This step turns a price, a reachable customer count and a growth assumption into the revenue ceiling you could work toward and how many customers it actually takes to get there — the constraint every later number has to respect.',
        zh: '在做任何预测之前，先确认这件事到底值不值得做。这一步把定价、够得着的客户数和增长假设，换算成你可能做到的收入上限，以及要拿到这个数字究竟需要多少客户 —— 后面每一个数都得在这个约束之内。',
      },
    },
    {
      slugs: ['solopreneur-mrr-calculator'],
      purpose: {
        en: 'Now turn that customer count into a monthly revenue path and split it into three parts: new business, revenue lost to churn, and expansion from customers who stay but buy more. The net of those three is the growth rate that decides whether the ceiling from step one is reachable, and it is also the input step three needs.',
        zh: '接着把客户数变成一条每月的收入曲线，并把它拆成三段：新客户带来的、流失掉的，以及留下来的客户多买的那部分。这三段的净额就是增长率，它决定第一步那个上限够不够得着，同时也是第三步要吃的输入。',
      },
    },
    {
      slugs: ['solopreneur-churn-rate-calculator'],
      purpose: {
        en: 'With the monthly split in hand, work out which side is actually leaking and what that leak costs every month. This step puts a price on the churn you already used in the model and shows what a better retention number would buy you — usually a cheaper lever than buying more customers.',
        zh: '有了每个月的拆分，再看是哪一头在漏、漏掉一个月的代价是多少。这一步给你已经写进模型里的流失率标上价钱，也告诉你把留存做好一点能换回多少 —— 这通常比多买几个客户便宜得多。',
      },
    },
    {
      slugs: ['solopreneur-burn-rate-calculator', 'solopreneur-revenue-projector'],
      purpose: {
        en: 'Finally ask whether you can fund the path: how fast the money leaves, how long the balance lasts, and what happens to that picture if growth slows. Use the burn calculator for the cash question on its own — where the spending goes and how many months are left — and the revenue projector when you want the projection, the break-even point and a what-if on the same assumptions.',
        zh: '最后确认这条路上你带的钱够不够：钱出去得多快、余额还能撑多久、如果增长掉下来会怎样。只想回答现金问题时用烧钱率那个 —— 钱花在哪、还剩几个月；想同时看收入预测、打平点和假设情景，就用收入预测器。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-market-size-estimator',
      answers: {
        en: 'Is the segment I picked big enough to support the revenue I am planning for?',
        zh: '我挑的那块细分市场，按现在的定价和客单价，撑得起我打算做出来的那个收入吗？',
      },
      useWhen: {
        en: 'Use it at the very start, before you build a plan, to test that plan against the ceiling — and to see how many customers a given revenue target really demands. Do not use it as a top-down number to impress investors: the result is only as honest as the price and customer count you typed in, and it says nothing about whether you can win those customers.',
        zh: '放在最前面用，在动手做方案之前先拿方案去撞一下天花板，也顺手看清一个收入目标到底要多少客户。别把它当成一个自上而下的数字去糊弄投资人：算出来的东西只跟你输入的定价和客户数一样诚实，而且它完全不回答你能不能拿下这些客户。',
      },
    },
    {
      slug: 'solopreneur-mrr-calculator',
      answers: {
        en: 'Where did this month of recurring revenue come from, and what is the net growth once churn and expansion cancel out?',
        zh: '这个月的经常性收入到底是从哪来的？扣掉流失、再加上扩展之后，净增长还剩多少？',
      },
      useWhen: {
        en: 'Use it once you have a few months of history and want to see the three parts separately — that split is what tells you whether growth is real or merely bought. Do not use it to project several quarters ahead; for a forward view with scenarios, hand that to the revenue projector.',
        zh: '手里已经有几个月的历史、并且想把三段拆开看的时候用它 —— 是不是真增长，全看这个拆分。别拿它预测好几个季度：往前看的情景推演，交给收入预测器。',
      },
    },
    {
      slug: 'solopreneur-churn-rate-calculator',
      answers: {
        en: 'Which customers leave, what does that cost in revenue every month, and how long do the ones who stay actually last?',
        zh: '是哪一批客户在走？每个月因此少掉多少收入？留下来的那些平均又能待多久？',
      },
      useWhen: {
        en: 'Use it when retention is the thing you are trying to move, because it turns a rate into a monthly amount and then into customer lifetime. Do not judge the whole business from one blended number — a company can look calm in aggregate while a single segment does all the damage, so read it with the segment breakdown before you act.',
        zh: '当你要动的就是留存时用它，因为它能把一个比率换算成每个月的金额，再换算成客户能待多久。但别拿一个混在一起的总数去给整家公司下判断 —— 汇总看着平稳的公司，很可能是某一层客户在承担全部损失，动手之前先看分群拆解。',
      },
    },
    {
      slug: 'solopreneur-burn-rate-calculator',
      answers: {
        en: 'How fast is the cash leaving, how long does what is in the bank last, and which cost line is worth attacking first?',
        zh: '钱每个月出去得多快？账上这笔还能撑多久？先动哪一项成本最划算、最见效？',
      },
      useWhen: {
        en: 'Use it when you already know roughly what you earn each month and the real question is where the money goes — it breaks spending into lines so a cut can be priced in extra months of survival. Do not use it to judge whether the business is growing well: a balanced statement can hide a company that is losing customers while revenue holds.',
        zh: '已经大致知道每月赚多少、问题落在钱去哪了的时候用它：它把支出拆成一项一项，砍哪一刀就能直接换算成多活几个月。但别拿它判断这生意增长得好不好 —— 一份看起来平衡的报表，可能盖住一家收入还稳、但客户在流失的公司。',
      },
    },
    {
      slug: 'solopreneur-revenue-projector',
      answers: {
        en: 'If new business, churn and expansion keep moving as they have, where do revenue and cash land over the coming year?',
        zh: '如果新增、流失和扩展都按现在的样子继续、没有意外，往前一年收入和现金会走到哪一步？',
      },
      useWhen: {
        en: 'Use it when you need the whole picture in one place — projected revenue, runway, the break-even point, a what-if on your assumptions and what one customer is worth. Do not use it while you are still deciding which assumption to make; a projection only tells you as much as the growth and churn numbers you fed into it.',
        zh: '需要一屏看完整个画面时用它：收入预测、还能撑多久、什么时候打平、假设变一变会怎样，外加一个客户值多少。但别在你还没想好该用哪个假设的时候用：预测能告诉你的，充其量就是你喂进去的增长率和流失率那么多。',
      },
    },
  ],
};
