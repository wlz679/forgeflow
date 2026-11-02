// P165 —— 分类 S（Sales / 销售管理）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const S: CategoryDecisionLayer = {
  chainIntro: {
    en: 'Six calculators sit on the same funnel, but they answer different questions and are not interchangeable. Start from the size of one deal, find where the pipeline leaks, turn it into money, and only then ask whether you have enough of it.',
    zh: '这六个计算器都挂在同一条漏斗上，但回答的是不同的问题，不能互相替代。先定一笔单子的量级，再找管道漏在哪，然后把它折成钱，最后才问够不够。',
  },
  chain: [
    {
      slugs: ['solopreneur-acv-calculator'],
      purpose: {
        en: 'Set the unit of sale before anything else, because every ratio downstream — coverage, velocity, quota — is a multiple of what one deal is worth. ACV also tells you whether the motion sells many small things or a few large ones, and that changes which of the later tools you can trust.',
        zh: '先把「一笔单子值多少」定下来：往下所有倍数 —— 覆盖率、速度、指标达成 —— 都是拿它当基数乘出来的。ACV 同时还告诉你这门生意是靠很多小单还是少数大单在跑，而这会改变你后面该信哪个工具。',
      },
    },
    {
      slugs: ['solopreneur-win-rate-by-stage-calculator'],
      purpose: {
        en: 'Find where the pipeline actually leaks. Watching deals advance from one stage to the next, stage by stage, shows you which transition is throwing deals away, and that is the number you need before any weighting downstream is worth anything.',
        zh: '找管道到底漏在哪一格。一段一段看交易推进到下一段的比率，就能指出是哪一次转手把单子丢掉了 —— 而这个数正是你后面做加权的前提，加权做得再细也绕不开它。',
      },
    },
    {
      slugs: ['solopreneur-pipeline-value-calculator'],
      purpose: {
        en: 'Turn the funnel into a number you can forecast with: every open deal weighted by how likely it is to advance from the stage it sits in. This is the figure that belongs in a revenue forecast, and it is only as honest as the stage assumptions you feed into it.',
        zh: '把漏斗折成一个能拿去预测的数：每个在谈的单子，按它当前所处阶段推进的可能性加权。这就是应该放进收入预测里的那个数，而它有多诚实，完全取决于你喂进去的阶段假设。',
      },
    },
    {
      slugs: [
        'solopreneur-pipeline-coverage-calculator',
        'solopreneur-sales-velocity-calculator',
        'solopreneur-quota-attainment-calculator',
      ],
      purpose: {
        en: 'Close the loop with the three questions that only make sense once a pipeline exists behind them: is there enough open pipeline left to cover the part still unbooked, how fast the current pace turns pipeline into revenue, and whether the team actually landed what it was carrying. Pick the one your question is really about, but feed the attainment result back into your stage assumptions, because it is the only reality check you have on them.',
        zh: '最后用三个「身后有管道才能回答」的问题收口：还开着的管道够不够覆盖没签下的那部分、照现在的节奏管道能多快变成钱、以及团队到底把手上那部分做成了多少。按你当下被问到的那个选一个就够，但要把达成结果反哺回阶段假设 —— 那是唯一能校正它的现实检验。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-pipeline-value-calculator',
      answers: {
        en: 'What is my open pipeline actually worth once every deal is weighted by how likely it is to close from the stage it sits in?',
        zh: '手上这堆管道，按每笔所在阶段的成交可能性加权之后，到底值多少钱？',
      },
      useWhen: {
        en: 'Use it when you need a weighted forecast number for a revenue plan or a board update. Do not use it to answer whether you have enough, because weighting flatters a thin pipeline: a deal sitting at its first stage carries almost no weight even though it may be a real deal. For sufficiency, read the coverage tool instead, and keep the two numbers apart in your forecast.',
        zh: '你要给收入计划或对上汇报一个加权后的预测数时用它。但别拿它回答「够不够」—— 加权会让管道显得比实际厚：停在前期的单子权重几乎为零，可它依然是一笔真实的单子。要判断够不够，去看覆盖率那个工具；在预测里也别把这两个数混成一个。',
      },
    },
    {
      slug: 'solopreneur-pipeline-coverage-calculator',
      answers: {
        en: 'Is the pipeline still open enough to cover the part of the target I have not booked yet?',
        zh: '现在还开着的管道，够不够覆盖我还没签下来的那部分目标？',
      },
      useWhen: {
        en: 'Use it as the forward-looking check, because it tells you how much more pipeline you have to create rather than what you will close. Do not confuse it with the weighted pipeline number: coverage deliberately ignores how far along each deal is, since the point is volume rather than value timing. And do not run it without a stated remaining target, because the ratio is meaningless without that denominator.',
        zh: '把它当前瞻性的那把尺：它告诉你还得多造多少管道，而不是你最后会签下多少。别和加权管道那个数搞混 —— 覆盖率故意不看每笔单子走到哪一步，因为这里要的是量，不是落地的时间。而且没先说清「还剩多少目标」就别跑它，分母不明确时这个比率没有意义。',
      },
    },
    {
      slug: 'solopreneur-win-rate-by-stage-calculator',
      answers: {
        en: 'Which transition in the funnel is throwing away the most deals, and what share of the deals in each stage actually move forward?',
        zh: '漏斗里是哪一次转手丢单丢得最多？每一段里到底有多少交易真的往前走？',
      },
      useWhen: {
        en: 'Use it when pipeline is growing but bookings are not, because in that case the leak sits inside the funnel rather than at the top. Do not use it as your overall win rate: multiplying stage rates into a single number hides exactly which stage is broken, and that is the stage you need to fix. It also needs a reasonable number of deals per stage before the reading means anything.',
        zh: '管道在涨、签单却不涨时用它 —— 这种情况下漏点一定在漏斗内部，不在顶上。别拿它当整体赢率用：把各段比率乘成一个数，正好会把出问题的那一格盖掉，而那一格恰恰是你要修的。它还要求每段有足够的交易量，这个读数才值得当真。',
      },
    },
    {
      slug: 'solopreneur-sales-velocity-calculator',
      answers: {
        en: 'At the current pace, how much revenue does one rep turn out per day once pipeline, win rate and cycle length are combined?',
        zh: '按现在的节奏，一个销售每天能产出多少收入 —— 把管道、赢率和周期合起来算的结果？',
      },
      useWhen: {
        en: 'Use it when the question is throughput rather than stock, because it turns a pipeline snapshot into a daily rate, which is what you need to judge whether the current pace still reaches the target by the end of the period. Do not use it to decide whether the pipeline is big enough, since it is a rate and moves with cycle length. And it inherits whatever win rate you feed it, so it is never more trustworthy than that input.',
        zh: '当你问的是「流量」而不是「存量」时用它：它把管道的静态快照换算成日均产出，这正是你判断照这个节奏能不能在周期内达标要用的东西。但别拿它回答管道够不够大 —— 它是个速率，会跟着销售周期一起变。而且它继承你喂进去的赢率，所以它的可信度上限就是那个输入的可信度。',
      },
    },
    {
      slug: 'solopreneur-acv-calculator',
      answers: {
        en: 'What is one deal worth when spread across the term, and how does that size differ by tier and by customer segment?',
        zh: '把合同摊到整个期限里，一笔单子平均一年值多少钱？不同层级和客户分层之间差多少？',
      },
      useWhen: {
        en: 'Use it when the size of the sale, not just the count, drives your plan, and when you want to see whether one tier is carrying the whole book. Do not use it as a pricing decision on its own, because it describes what you closed rather than what you should charge next; a bigger deal usually has to come from packaging, term length or who you sell to. And do not mix it with ARR: ARR is the annualised total, ACV is per customer.',
        zh: '当生意是靠「单子多大」而不是「单子多少」驱动规划时用它，也用它看是不是某一档客户在撑着整本账。但别单靠它做定价决策 —— 它描述的是你已经签下来的，不是你下次该收多少；单子变大通常要靠打包、合同期限或者换对客户来实现。也别和 ARR 混：ARR 是年化总额，ACV 是单个客户。',
      },
    },
    {
      slug: 'solopreneur-quota-attainment-calculator',
      answers: {
        en: 'How much of the target did the team actually book, and where does each rep sit relative to the others?',
        zh: '团队实际签下了目标的多少？每个销售分别处在什么位置？',
      },
      useWhen: {
        en: 'Use it as the backward-looking check, in a review or a compensation conversation, where the question is about what happened rather than what is coming. Do not use it to judge pipeline quality, because a rep can hit the number with one large deal, which tells you nothing about whether the pipeline behind it is healthy. And do not read a low number as a motivation problem before checking territory and ramp.',
        zh: '拿它做回顾 —— 复盘、或者谈激励的时候，问的是已经发生的事，而不是将来会来的事。别拿它评判管道质量：一个销售可能靠一单大的把指标凑上了，这完全说明不了他后面的管道健不健康。也别在核对区域和新人爬坡之前，就把一个偏低的数字当成态度问题。',
      },
    },
  ],
};
