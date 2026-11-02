// P165 —— 分类 O（Operations & Inventory / 运营与库存）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
// L1 选型链：看现状 → 给反向错误定价 → 定触发点 → 查执行端；L2 对照表给的是每个工具的适用边界。
import type { CategoryDecisionLayer } from './types';

export const O: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Inventory work fails at the seams: the spreadsheet says the stock level is right and the customer still cannot buy the thing. Follow the order below — each step takes the previous answer as its input and turns a number into a decision somebody can act on this week.',
    zh: '库存工作出问题，通常就出在接缝处：表格说库存是对的，客户却买不到。按下面的顺序走，每一步都拿上一步的答案当输入，把一个数字变成一个这周就能动手的决定。',
  },
  chain: [
    {
      slugs: ['solopreneur-inventory-turnover-calculator', 'solopreneur-carrying-cost-calculator'],
      purpose: {
        en: 'Open with the state of what you are holding, read from whichever end is hurting. Turnover tells you whether the stock you paid for is moving at the speed the business assumes; carrying cost tells you what that same stock costs per year to keep on the shelf, including the money locked up inside it. Both read the same inventory snapshot, so take the one that matches your symptom.',
        zh: '先看你手上这些东西的状态，从真正在痛的那一端读。周转率告诉你花钱买来的货，是不是按生意假设的那个速度在卖掉；持有成本告诉你这些货放在货架上一年要花多少钱，包括压在里面的那部分资金。两者读的是同一份库存快照，所以挑那个对得上你症状的。',
      },
    },
    {
      slugs: ['solopreneur-stockout-cost-calculator'],
      purpose: {
        en: 'Now price the opposite mistake. If step one said you are holding too much, the obvious response is to hold less — and what you need then is what running out will cost in lost revenue and in customers you hand to a competitor for good. This step converts a leaner target into a budget you can spend on safety stock.',
        zh: '接着给相反的那个错误定价。如果第一步告诉你压得太多，最顺手的反应就是少压一点；这时你需要的是缺一次货要赔多少 —— 丢掉的收入，加上就此送到竞品手里的客户。这一步把「更精简的目标」换算成一份你可以花在安全库存上的预算。',
      },
    },
    {
      slugs: ['solopreneur-reorder-point-calculator'],
      purpose: {
        en: 'Turn that budget into a trigger. Lead-time demand plus a safety-stock allowance gives the level at which you reorder and tells you how often you will have to place one, so you can judge whether the answer is something a person can actually execute on time. Almost everything downstream depends on this number being right rather than merely plausible.',
        zh: '把这份预算变成一个触发点。提前期内的需求加上安全库存余量，得出该在什么水位补货，也告诉你大概多久要下一次 —— 这样你才能判断这个答案是不是一个人真能按时做到的事。后面几乎所有环节都建立在这个数是对、而不只是看起来合理上。',
      },
    },
    {
      slugs: ['solopreneur-fulfillment-cost-calculator', 'solopreneur-supplier-scorecard-calculator'],
      purpose: {
        en: 'Finally, check the execution side, because a correct reorder point does not make getting an order out of the door any cheaper. Fulfillment cost breaks down what one order really costs to pick, pack and ship plus its share of storage; the supplier scorecard tells you whether the upstream you buy from delivers on time and ships sound parts. Take whichever one your operation is actually bleeding from.',
        zh: '最后查执行端这一侧 —— 补货点算对了，也不会让「把一单发出去」这件事变便宜。履约成本拆开一单真正花在拣货、打包、发货和仓储分摊上的钱；供应商评分卡告诉你上游能不能按时交货、交来的货有没有毛病。挑运营真正在流血的那一端先算。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-inventory-turnover-calculator',
      answers: {
        en: 'Am I holding stock longer than this business should have to?',
        zh: '我的库存是不是压得比这门生意该压的时间更久？',
      },
      useWhen: {
        en: 'Use it when the question is volume: cash is tied up on shelves, aged stock is piling up, or you simply want to know how many times a year you turn. It converts that into days of inventory on hand and shows what a markdown or a stockout would do. Do not use it to price the cost of holding stock — it treats that money as a ratio, not as a cost you can cut.',
        zh: '当问题是「量」的时候用它：现金压在货架上、库龄越积越长，或者你只是想知道一年能转多少遍。它会换算成库存天数，也告诉你降价清货或缺货会怎样。不要拿它给持有成本定价 —— 它把那段钱当成一个比率，而不是一项你能动手削减的开销。',
      },
    },
    {
      slug: 'solopreneur-carrying-cost-calculator',
      answers: {
        en: 'What does the inventory sitting on my shelf cost me every year, including the money locked inside it?',
        zh: '货架上这些库存，一年到底要花我多少钱，包括压在里面的那部分？',
      },
      useWhen: {
        en: 'Use it when the money is the issue: your working capital is tied up and someone is arguing that a slow-moving line is harmless because "it is already paid for". It separates capital, storage, insurance, shrinkage and obsolescence, so you can see which component is actually the expensive one. Do not use it to judge whether you hold too much stock — that is a volume decision and belongs to the turnover calculator.',
        zh: '当问题在「钱」的时候用它：营运资金被占住了，有人在说某个慢销的品类无所谓，因为「钱都付过了」。它把资金、仓储、保险、损耗和过期风险分开，你能看出真正贵的是哪一项。不要拿它判断自己压的货是不是太多 —— 那是量的决策，属于周转率计算器。',
      },
    },
    {
      slug: 'solopreneur-stockout-cost-calculator',
      answers: {
        en: 'What does running out actually cost, in lost sales and in customers I will not get back?',
        zh: '断货一次到底要付多少代价 —— 丢掉的销售，和再也回不来的客户？',
      },
      useWhen: {
        en: 'Use it before you cut inventory or switch on backorders, because the saving and the loss sit on opposite sides of the same decision. It separates the revenue you miss from the customer lifetime value you hand to a competitor. Do not use it for a one-off delay you can cover by shipping a few days late — that is an operational nuisance, not a stockout pattern.',
        zh: '在削减库存或开启缺货接单之前用它，因为省下的和赔上的在同一个决定的两边。它把错过的收入和你送到竞品手里的客户终身价值分开。不要拿它去算那种晚发几天就能补上的偶发延迟 —— 那是运营上的小麻烦，不是缺货模式。',
      },
    },
    {
      slug: 'solopreneur-reorder-point-calculator',
      answers: {
        en: 'At what level should I reorder, and how much safety stock does that need given how unreliable my supply is?',
        zh: '我该在什么水位补货？考虑到上游有多不稳，这需要多少安全库存？',
      },
      useWhen: {
        en: 'Use it when you have decided how lean to run and now need the actual trigger, because a target is not a purchase order. It turns lead-time demand and variability into the reorder level and how often you will reorder. Do not use it before you know what a stockout costs you — without that number, safety stock is only a guess about how much risk you can carry.',
        zh: '当你已经决定要多精简、现在需要真正的触发点时用它，因为「目标」不是「采购单」。它把提前期内的需求和波动转成补货水位与补货频率。在你弄清楚缺货要赔多少之前不要用它 —— 没有那个数，安全库存就只是对「我能扛多大风险」的猜测。',
      },
    },
    {
      slug: 'solopreneur-fulfillment-cost-calculator',
      answers: {
        en: 'What does it really cost me to get one single order out of the door?',
        zh: '把单独一单真正发出去，这件事到底花我多少钱？',
      },
      useWhen: {
        en: 'Use it when you suspect the order itself is unprofitable, because per-order handling and shipping numbers often hide the real problem behind a healthy-looking margin. It separates fixed cost from volume-dependent cost, so you can see what order volume the current setup needs before it pays off. Do not use it to compare carriers or negotiate rates — it models your operation, not their pricing.',
        zh: '当你怀疑「单子本身不赚钱」时用它 —— 每单的拣货打包与运费数字，常常会把一个看起来健康的毛利背后的真问题藏起来。它把固定成本和随量变动的成本分开，你能看出要多少单量这个配置才划算。不要拿它比较承运商或去谈费率 —— 它建模的是你自己的运营，不是对方的定价。',
      },
    },
    {
      slug: 'solopreneur-supplier-scorecard-calculator',
      answers: {
        en: 'Is my supplier as reliable as the plan assumes, and what would fixing the weakest dimension be worth?',
        zh: '我的供应商有计划里假设的那么可靠吗？只把最弱的那一项修好值多少？',
      },
      useWhen: {
        en: 'Use it when the root cause of stockouts or late deliveries sits upstream rather than in your own counts. It scores delivery reliability, defect rate, lead time and price stability in one weighted view, then shows what improving a single dimension would change. Do not use it as a general supplier ranking for a procurement process — the weights matter, and a score built for your bottleneck will not match a committee score.',
        zh: '当缺货或延迟交付的根因在上游、而不是在自己的账上时用它。它把交付可靠性、缺陷率、提前期和价格稳定性加权成一个视图，并显示只改一项会发生什么。不要拿它当采购流程里的通用供应商排名 —— 权重是有意义的，为你那个瓶颈建出来的分数和委员会那份不会是一回事。',
      },
    },
  ],
};
