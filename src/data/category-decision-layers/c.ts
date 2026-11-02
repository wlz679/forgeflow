// P165 —— 分类 C（Valuation & Exit / 估值与退出）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const C: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Ten calculators that answer four questions about the same company: what a customer is really worth, when the business starts paying for itself, what a round takes away from you, and what the company is worth on the way out. Run them in that order and each answer feeds the next one.',
    zh: '这十个计算器回答的是同一家公司的四个问题：一个客户到底值不值、公司什么时候开始能自己养活自己、一轮融资会拿走你多少、以及将来卖掉能换回多少。按这个顺序走，前一个答案就是下一个的输入。',
  },
  chain: [
    {
      slugs: ['solopreneur-stripe-fee-calculator'],
      purpose: {
        en: 'Start with the money you actually collect. Processing fees quietly move every margin, payback period and multiple you compute later, so this step fixes the real number that everything downstream is built on — before anyone starts arguing about valuation.',
        zh: '先从你真正收到的那笔钱开始算。支付手续费会悄悄改变后面所有的毛利率、回本周期和估值倍数，这一步先把基准钉死 —— 在任何人开始讨论估值之前，先确认手里那个数字是真的。',
      },
    },
    {
      slugs: ['solopreneur-cac-calculator', 'solopreneur-ltv-calculator', 'solopreneur-unit-economics-calculator'],
      purpose: {
        en: 'Now price a single customer from both sides: what it costs to win them, what they hand back while you still own the revenue after fees, and whether those two meet. Take the acquisition calculator when you are setting a spend budget, the lifetime-value calculator when churn or pricing is what you are testing, and the unit-economics one when you want both combined into a payback period and a ratio.',
        zh: '接着从两头给一个客户定价：赢下他要花多少，留下他能带回多少，这两头对不对得上。预算还没定就用获客成本那个；想测的变量是流失和定价就用终身价值那个；想把两头合成回本周期和比率，就用单位经济学那个。',
      },
    },
    {
      slugs: ['solopreneur-break-even-calculator', 'solopreneur-burn-multiple-rule-of-40-calculator'],
      purpose: {
        en: 'Move from one customer to the whole company: how much revenue is needed to cover fixed costs, and how much capital does each new unit of recurring revenue consume on the way there. Use the break-even view when fixed costs and the revenue trajectory are the constraint, and the capital-efficiency view when you are raising money or answering someone who judges efficiency rather than raw growth.',
        zh: '从单个客户放大到整家公司：覆盖固定成本需要多少收入，路上每新增一块经常性收入又要吃掉多少资本。瓶颈在固定成本和收入曲线时用盈亏平衡那个；要融资、或者要回答那些看效率而不只看增速的人时，用烧钱倍数与 40 法则那个。',
      },
    },
    {
      slugs: [
        'solopreneur-safe-convertible-note-calculator',
        'solopreneur-equity-dilution-calculator',
        'solopreneur-saas-valuation-calculator',
        'solopreneur-arr-multiple-valuation-calculator',
      ],
      purpose: {
        en: 'Last come the money and the ownership. Work the instrument you would actually sign to see the cap, the discount and the shares you keep, then take the resulting recurring revenue base into the two valuation calculators to see what the company is worth on exit and how much of that survives the dilution you just modelled.',
        zh: '最后是钱和股权。先按你真会签的那份文件把估值上限、折扣和留下来的股份算清楚，再把由此得出的经常性收入基数放进两个估值计算器，看将来卖掉值多少，以及其中有多少能躲过你刚算出来的稀释。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-stripe-fee-calculator',
      answers: {
        en: 'What does each collected payment leave me once processing is taken out, and how does that change my margin?',
        zh: '每一笔收进来的钱，扣完处理手续费之后还剩多少？这会怎样改变我的毛利率和净收入？',
      },
      useWhen: {
        en: 'Use it first whenever your margin is built on headline revenue or your payment mix is changing — cards, bank transfers and international charges do not cost the same, and one flat assumption hides that. Do not use it to judge pricing or acquisition efficiency; it answers what you keep, not what a customer is worth.',
        zh: '只要你的毛利率是按账面收入算的、或者收款方式正在变，就先用它 —— 银行卡、银行转账和海外卡的费率并不一样，用一个平均假设会把差别藏起来。但别拿它判断定价或获客效率，它回答的是「你留下多少」，不是「客户值多少」。',
      },
    },
    {
      slug: 'solopreneur-cac-calculator',
      answers: {
        en: 'What does one new customer cost me to acquire, and how many months of gross profit does that spend take to come back?',
        zh: '拿下一个新客户到底要花多少？这些投入要靠多少个月的毛利才收得回来？',
      },
      useWhen: {
        en: 'Use it when you are deciding how much to spend on acquisition, or when you want to compare channels and spend levels against each other. Do not compare your company to published CAC benchmarks without separating sales-led spend from self-serve first, because a blended number hides the difference between the two motions.',
        zh: '决定该给获客留多少预算、或者要把不同渠道和不同投入档位横向比较的时候用它。但拿它跟公开的 CAC 基准对比之前，先把销售驱动的投入和自助获客拆开 —— 混在一起的数字会把两种获客方式的差别盖掉。',
      },
    },
    {
      slug: 'solopreneur-ltv-calculator',
      answers: {
        en: 'What is one customer worth over the whole time they stay, and how sensitive is that value to churn and to price?',
        zh: '一个客户在他留下的整段时间里值多少？这个价值对流失率和定价到底有多敏感？',
      },
      useWhen: {
        en: 'Use it when churn, pricing or retention is the variable you are testing — the same revenue behaves very differently at two different rates of attrition. Do not use it to set an acquisition budget, because the value it produces only becomes real if you can buy customers for less than it.',
        zh: '当你要测的变量是流失率、定价或留存时用它 —— 同样的收入，在两种流失速度下价值完全不同。但别拿它去定获客预算：它算出来的价值，只有在你能以低于它的成本买到客户时才成立。',
      },
    },
    {
      slug: 'solopreneur-unit-economics-calculator',
      answers: {
        en: 'Put the two sides on one page: what a customer brings in, what it cost to win them, and when that spend pays back.',
        zh: '把两头摊在同一页上：一个客户带进来多少，赢下他花了多少，这笔投入多久能回本？',
      },
      useWhen: {
        en: 'Use it once you have decided to run the business rather than to keep picking acquisition channels — it is the summary that tells you whether scaling volume helps you or hurts you. Do not use it as a substitute for the two source numbers: it cannot tell you which input to fix, only that the combination does not work yet.',
        zh: '当你已经决定要做这摊生意、而不是还在挑获客渠道时用它 —— 它是那个总账，告诉你放量到底是帮忙还是帮倒忙。但别拿它替代前面两个源头数字：它不会告诉你要改哪个输入，只会告诉你这个组合现在还不行。',
      },
    },
    {
      slug: 'solopreneur-break-even-calculator',
      answers: {
        en: 'How much revenue do I need to cover fixed costs, and when does that point arrive if growth continues?',
        zh: '要覆盖固定成本我需要多少收入？如果增长继续，这个交叉点会在什么时候到？',
      },
      useWhen: {
        en: 'Use it when the constraint is fixed cost — payroll, rent, tooling that does not scale with volume. It shows the crossing point with and without revenue growth, which is the honest version of when this business will work. Do not use it to judge whether one customer is worth acquiring; that is a payback question, not a fixed-cost question.',
        zh: '当你的瓶颈是固定成本时用它 —— 工资、房租、不会随用量缩小的工具。它给出有无增长两种情况下的交叉点，这才是「这摊生意什么时候能立住」的诚实答案。但别拿它判断单个客户值不值得获取，那是回本问题，不是固定成本问题。',
      },
    },
    {
      slug: 'solopreneur-burn-multiple-rule-of-40-calculator',
      answers: {
        en: 'How much capital does each unit of new recurring revenue consume, and is growth being funded by efficiency or by cash?',
        zh: '每新增一块经常性收入要吃掉多少资本？增长是靠效率撑起来的，还是靠现金堆出来的？',
      },
      useWhen: {
        en: 'Use it when you are raising, pitching, or defending your spending to people who judge efficiency rather than raw growth — it puts the capital question and the growth-plus-margin test in one place, so a fast-growing business with heavy spend is visible in a single number. Do not use it to price one customer or to set a monthly budget.',
        zh: '当你要融资、要去讲方案、或者要把花钱这件事解释给那些看效率而不只看增速的人时用它 —— 它把资本消耗和增长加毛利两个问题放在一起，于是「增长很快但烧得猛」这种公司一眼就能看出来。别拿它给单个客户定价，也别拿它定每月预算。',
      },
    },
    {
      slug: 'solopreneur-saas-valuation-calculator',
      answers: {
        en: 'What is this business worth if I sell it, given how fast it is growing and how profitable it already is?',
        zh: '如果我现在卖掉它值多少？在它现在的增速、毛利水平和这个阶段下？',
      },
      useWhen: {
        en: 'Use it when the question is an exit number and you want growth and margin to adjust the multiple rather than hand you one fixed figure. Do not use it to answer what a particular investor would offer, because an offer depends on who is buying and on the terms, and no multiple can predict that.',
        zh: '当问题是「卖掉能拿多少」，而且你希望增长和利润率去调整倍数、而不是只给你一个死数时用它。但别拿它回答「某个投资人具体会给多少」—— 报价取决于谁买、取决于什么条款，任何倍数都预测不了。',
      },
    },
    {
      slug: 'solopreneur-arr-multiple-valuation-calculator',
      answers: {
        en: 'How does the multiple move when growth and margin change, and what revenue level would a target valuation require?',
        zh: '增速和毛利一变，倍数会跟着怎么动？想要的那个估值又需要做到多少收入？',
      },
      useWhen: {
        en: 'Use it when you want to argue with the multiple itself: it lets you test what you would have to be growing at to justify a valuation you already have in mind, and it back-solves the revenue a target number needs. Do not use it for a business without recurring revenue, and do not read the peer comparison as a promise of what an acquirer will pay.',
        zh: '当你想和倍数本身较劲时用它：它能让你反推「要做到什么增速才配得上心里那个估值」，也能倒算出达到目标数字需要多少收入。没有经常性收入的业务别用它，也别把其中的同业对标当成收购方一定会给的价钱。',
      },
    },
    {
      slug: 'solopreneur-safe-convertible-note-calculator',
      answers: {
        en: 'If I sign this instrument, at what price does it convert and how much of the company does the investor end up owning?',
        zh: '如果我签了这份文件，它会按什么价格转股？转完之后投资人最终拿到多少？',
      },
      useWhen: {
        en: 'Use it when a financing offer is actually on the table in this form — it turns the cap, the discount and the most-favourable clause into the conversion price you really get and the ownership that follows. Do not use it to plan a priced round, where the dilution comes from the valuation instead, and do not treat the model as a promise of a future round.',
        zh: '当桌上真的摆着这样一份融资文件时用它：它把估值上限、折扣和最惠条款，换算成你实际拿到的转股价格，以及随之而来的持股比例。定价轮别用它 —— 那种稀释来自估值本身；也别把这个模型当成下一轮条款的承诺。',
      },
    },
    {
      slug: 'solopreneur-equity-dilution-calculator',
      answers: {
        en: 'After each round, how much of the company do I still own, and what did the new money actually buy the investor?',
        zh: '一轮一轮融下来之后我还剩多少？每一轮新进来的钱，到底换走了多少？',
      },
      useWhen: {
        en: 'Use it when you are planning the sequence of rounds and care about cumulative ownership rather than a single round — option pool refreshes and stacked rounds compound, and founders usually lose the most to the second one. Do not use it to price an instrument that has not converted yet, and check the assumed post-money valuation against the previous round before treating the output as a plan.',
        zh: '当你在规划几轮融资的顺序、关心的是累计持股而不是某一轮时用它 —— 期权池刷新和连续几轮会叠加，创始人通常是在第二轮掉得最多。别拿它给还没转股的工具定价，也别在把输出当成正式方案之前，先把假定的投后估值和上一轮的条款对一遍。',
      },
    },
  ],
};
