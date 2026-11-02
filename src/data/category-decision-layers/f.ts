// P165 —— 分类 F（Investment & Real Estate / 投资与不动产）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const F: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Investing and property decisions all start from one number: what you actually earn and what is left after tax. Work outward from there — savings first, then the home you live in, then property you let to somebody else.',
    zh: '投资和置业的决策都从同一个数字开始：你真正赚到多少、扣完之后还剩多少。从那里往外推 —— 先是储蓄，然后是你自己住的那套房，最后是租给别人住的房子。',
  },
  chain: [
    {
      slugs: [
        'solopreneur-time-value-calculator',
        'solopreneur-sponsorship-rate-calculator',
        'solopreneur-freelance-tax-calculator',
      ],
      purpose: {
        en: 'Establish the baseline before you move any money. Two of these price what you already sell — your hours, or the attention of your audience — so take the one that matches how you actually get paid, and let the third carry the result through tax, because the number that survives is the only one you can save, borrow against or commit to a loan.',
        zh: '在动钱之前先定基准。其中两个工具给你已经在卖的东西定价 —— 你的时间，或者你受众的注意力 —— 按你实际的赚钱方式挑一个；第三个负责把结果过一遍税，因为扣完之后剩下的那个数字，才是你能拿去储蓄、能拿去抵押、也能拿去承担贷款的数。',
      },
    },
    {
      slugs: ['solopreneur-compound-interest-calculator'],
      purpose: {
        en: 'With the net figure known, ask what the surplus does over time instead of where it sits this month. This step turns a monthly amount into a curve, and it is the only honest way to compare putting money away against spending it.',
        zh: '知道净收入之后，该问的是这笔结余放在时间里会怎么走，而不是这个月它停在哪。这一步把一个月度金额变成一条曲线，也只有这样，才谈得上把存起来和花掉它放在一起比。',
      },
    },
    {
      slugs: ['solopreneur-mortgage-calculator', 'solopreneur-rent-vs-buy-calculator'],
      purpose: {
        en: 'Next test the home you would live in. Size the loan against the income from the first step, then ask whether owning beats renting across the years you would actually stay — in that order, because affordability rules out more plans than the comparison ever does.',
        zh: '接下来测你自己会住的那套房。先用第一步的收入去量贷款扛不扛得住，再问在你真正会停留的那些年里，买房是否比租房划算 —— 顺序不能反，因为能负担与否淘汰掉的计划，比对比本身淘汰的多。',
      },
    },
    {
      slugs: [
        'solopreneur-cap-rate-calculator',
        'solopreneur-rental-yield-calculator',
        'solopreneur-dscr-calculator',
        'solopreneur-brrrr-calculator',
      ],
      purpose: {
        en: 'Finally, for property you let to somebody else, pick the lens that matches your plan: what the property earns relative to its price, what the rent returns, whether the debt gets covered, or how a buy-renovate-refinance sequence ends up. Use only the one your deal is actually built on.',
        zh: '最后，对租给别人住的房子，按你这笔交易的实际结构挑一个视角：房产相对价格能产出多少、租金本身回报多少、债务能不能被覆盖，或者一串买入翻新再融资之后最终剩下什么。只用你真正要走的那一条。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-time-value-calculator',
      answers: {
        en: 'What is one hour of my life worth, and what does a distracted afternoon actually cost me?',
        zh: '我一个小时的时间值多少？一个被打断的下午到底让我损失了什么？',
      },
      useWhen: {
        en: 'Use it when deciding whether a request is worth the hours it will eat, or when you want a rate below which you can refuse work without argument. It prices your own time, so it is not a source for quoting a client.',
        zh: '适合判断一个请求值不值得它要占掉的那些小时，或者想给自己定一条低于多少就理直气壮拒绝的线时使用。它算的是你自己的时间，不能拿来给别人报价。',
      },
    },
    {
      slug: 'solopreneur-sponsorship-rate-calculator',
      answers: {
        en: 'What would a brand pay to reach my audience, and does that beat what my hours would earn?',
        zh: '一个品牌愿意为触达我的受众付多少钱？这比我卖时间赚得多吗？',
      },
      useWhen: {
        en: 'Use it when you have a real audience of measurable size and you are weighing whether to take sponsorship work. Do not use it for a channel that is still growing, because the estimate inherits every weakness in your traffic numbers.',
        zh: '适合已经有规模可测的受众、正在掂量要不要接赞助时使用。别拿它算还在起步的频道 —— 这个估算会把你流量数字里的每一个水分都原样继承下来。',
      },
    },
    {
      slug: 'solopreneur-freelance-tax-calculator',
      answers: {
        en: 'Of what I earn, how much is actually mine after tax, and what should I set aside each quarter?',
        zh: '我赚到的钱里，扣完税之后真正属于我的是多少？每个季度该预留多少？',
      },
      useWhen: {
        en: 'Use it once your income is irregular, because a lumpy invoice is exactly what makes people miss a quarterly deadline. It is a planning estimate rather than tax advice, so a real filing still needs a local accountant.',
        zh: '适合收入不规则的时候用，因为忽高忽低的发票最容易让人错过季度节点。它是用来做规划的估算，不是税务意见 —— 真正的申报还是得找本地会计。',
      },
    },
    {
      slug: 'solopreneur-compound-interest-calculator',
      answers: {
        en: 'How does a surplus left invested behave over a horizon, and what do regular contributions add to it?',
        zh: '一笔结余投出去之后，在一个时间跨度里会怎么走？定期追加又加了多少？',
      },
      useWhen: {
        en: 'Use it when you have a monthly surplus and a horizon, and you want the shape of the whole curve rather than one year of it. It says nothing about which asset to hold, so pair it with research rather than treating it as a recommendation.',
        zh: '适合有月度结余、也有一个明确时间跨度，想看整条曲线而不是其中某一年时使用。它不回答该持有哪类资产，所以要配着研究看，别把它当成推荐。',
      },
    },
    {
      slug: 'solopreneur-mortgage-calculator',
      answers: {
        en: 'What does this loan cost me every month, and how much of what I pay never reaches me?',
        zh: '这笔贷款每个月要还多少？其中有多少永远到不了我手里？',
      },
      useWhen: {
        en: 'Use it when you are sizing an offer, comparing term lengths, or working out what a bigger down payment actually changes. It prices a property you occupy yourself, not one you intend to let out.',
        zh: '适合在看房定 offer、比较贷款期限、或者弄清多付首付到底改变了什么时使用。它算的是你自己住的这套房，不是准备出租的那套。',
      },
    },
    {
      slug: 'solopreneur-rent-vs-buy-calculator',
      answers: {
        en: 'If I stay put for a while, does buying still beat renting once everything is counted?',
        zh: '如果我会在一个地方住上几年，把所有东西都算进去，买房还比租房划算吗？',
      },
      useWhen: {
        en: 'Use it when you have a stable horizon and a realistic view of how long you will stay there. Do not use it for a short assignment or a job move in eighteen months, because the answer turns on the holding period rather than on the property.',
        zh: '适合在停留时间比较确定、也对自己会待多久有清醒判断时使用。别拿它算短期派驻或者一年半后要搬走的情况 —— 结论取决于持有时长，而不是房子本身。',
      },
    },
    {
      slug: 'solopreneur-cap-rate-calculator',
      answers: {
        en: 'What does this property earn relative to what it costs me, compressed into a single rate?',
        zh: '这套房产相对我的投入到底能赚多少？能不能压缩成一个比率来看？',
      },
      useWhen: {
        en: 'Use it when comparing properties against each other or against a different kind of asset, because it folds price and income into one comparable number. It assumes the income you state is the stabilised income, so a building still being renovated is the wrong input for it.',
        zh: '适合横向比较几套房、或者把房产跟另一种资产放在一起比，因为它把价格和收入压成了同一个可比的数。它假定你填的收入是稳定期收入，所以还在翻新的房子不适合拿它算。',
      },
    },
    {
      slug: 'solopreneur-rental-yield-calculator',
      answers: {
        en: 'What does the rent actually pay back, gross and then after the costs of running it?',
        zh: '房租到底回报了多少？毛口径是多少，扣掉运营成本之后又是多少？',
      },
      useWhen: {
        en: 'Use it when you want the return from the rent itself rather than from the whole business, and when vacancy and running costs are the shakiest parts of your model. For a building with a business inside it, the capitalisation lens is the cleaner one.',
        zh: '适合你想看的是租金本身的回报、而不是整个生意的回报，且空置率和运营成本是模型里最靠不住的部分时使用。如果是带商户的楼，资本化率那个视角更干净。',
      },
    },
    {
      slug: 'solopreneur-dscr-calculator',
      answers: {
        en: 'Does the income from this property comfortably cover what the lender will demand every year?',
        zh: '这套房产产生的收益，能不能稳稳覆盖贷款方每年要收的还款额？',
      },
      useWhen: {
        en: 'Use it before you apply for financing, because lenders underwrite on this measure and a thin ratio is the usual reason an otherwise sound deal gets repriced. It says nothing about whether the investment itself is worth doing.',
        zh: '适合在申请贷款之前使用，因为放贷方就是按这个口径评估，比例偏薄通常是一笔本来不错的交易被重新定价的原因。它不回答这笔投资本身值不值得做。',
      },
    },
    {
      slug: 'solopreneur-brrrr-calculator',
      answers: {
        en: 'If I buy, renovate, refinance and let it out, how much cash is left and what does the return look like?',
        zh: '如果我买入、翻新、再融资再出租，最后手里还剩多少现金？回报又是什么样的？',
      },
      useWhen: {
        en: 'Use it when you are running a value-add plan where the numbers move in stages and the refinance is part of the return rather than an afterthought. Do not use it for a buy-and-hold property, because there is no renovation stage to model.',
        zh: '适合做增值型交易：数字分阶段变化、再融资本身就是回报的一部分，而不是事后补的一步。别拿它算买入持有的房子 —— 那种没有翻修环节可建模。',
      },
    },
  ],
};
