// P166 —— D 类（Freelance Pricing）主题「project-profitability-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许手写金额，但必须带口径）：
//   · 金额一律 USD；毛利用「(revenue − total cost) ÷ revenue」，分母是项目营收
//   · 人工成本用「小时成本率」= 你自己一小时真正值多少钱（机会成本），不是对外报价费率
//   · 文中那条贯穿示例固定为：固定价项目营收 USD 6,000，报价按 40 小时 × USD 150/小时，
//     实际干了 62 小时，小时成本率 USD 60，材料 USD 600，分包 USD 900
//     ⇒ 总成本 USD 5,220，毛利率 13%，实际时薪 USD 96.77，实现率 65%
//   · 期间口径：单项目 / 最近 5 个项目 / 滚动 6 个月 / 滚动 12 个月，按行标注
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Project profit leaks through estimation long before it leaks through pricing, and the evidence is actual hours against the hours bid on. An effective hourly rate below 75% of posted rate is an estimating problem, and no price rise fixes it. Unbilled scope creep is the second leak: uninvoiced hours over total hours.',
      rows: [
        {
          priority: 1,
          metric: 'Project gross margin — (revenue − total cost) divided by revenue, per project',
          fixFirst:
            'Start here because every other row in this table is a lever on this number, and a project you cannot margin is a project you cannot decide about. Compute margin per project as (revenue − total cost) ÷ revenue, where total cost includes your own hours at your real cost rate rather than your posted rate, plus materials, subcontractor, and the slice of overhead the project actually consumed. Then read the band: at or above 30 percent the pricing has room, 15-30 percent is workable, 5-15 percent is thin, and 0 percent or below means the project lost money. On the worked example, revenue USD 6,000 with 62 actual hours at a USD 60/hr cost rate, USD 600 of materials and USD 900 of subcontractor gives total cost USD 5,220 and a margin of 13 percent, which lands in the thin band no matter how good the work was.',
          alsoMoves:
            'It is the only row that tells you which of the others is worth fixing, because estimation bias, unbilled scope and a weak price all print the same thin margin, and only a per-project line lets you compare one project against another. It also sets the price floor for the fixed-bid work in Step 6: at USD 6,000 of revenue and a 50 percent margin target, the total cost you may absorb is USD 3,000, and that is the number you need in hand before you write the bid. A 6-month rolling margin is the compounding measure Step 5 asks for, because moving the rolling average from 25 percent to 40 percent at unchanged revenue is about 60 percent more annual net income.',
          backfire:
            'The obvious way to repair margin is to stop doing the work that produces it, and for a project business that cut can be the wrong one. A thin project that was a learning engagement with a strategic client is not the same as a thin project from a commodity client, and dropping the first can remove your pipeline two quarters later when the market turns. The subtler failure is a margin computed without overhead: it looks healthy, you quote more fixed-price work at the same thin real margin, and the overhead you excluded is exactly what pushes the business below breakeven at the end of the year.',
        },
        {
          priority: 2,
          metric: 'Estimation bias — actual hours divided by estimated hours at bid, per project type',
          fixFirst:
            'Once you know margin is broken, find out how much of the loss is the estimate rather than the price, because those two have completely different repairs. For every closed project divide actual hours by the hours you quoted and keep the ratio per project type rather than in one blended average: on the worked example, 62 actual hours against a 40-hour estimate is a 55 percent overrun. Rebuild the estimate from your own history, the last 10 projects of the same type rather than a rule of thumb, and re-quote fixed bids from total cost times two with a written contingency of 10-15 percent on top for anything that is not routine work.',
          alsoMoves:
            'It is the direct input to the pricing rule in Step 6 and to the realization read in row four, because a ratio above 1.25 means every future fixed bid you write is underpriced by roughly that same proportion, so correcting it moves the whole book of new bids at once. It also sharpens the scope-clarity rule, because the projects with the worst ratios are usually the ones whose scope was fuzzy at the quote, which tells you exactly where to tighten the written scope. And because a bad estimate repeats on the next project of the same type while a one-off does not, this row converts a single loss into a repairable rate.',
          backfire:
            'Rebuilding estimates from history without fixing how the estimate gets made just imports the bias forward. If the historical hours themselves include the scope creep you never invoiced, then the new estimate is inflated, your quotes look conservative, and you start losing work because you are no longer the cheapest bidder. And if you cover the overrun with a 20 percent price surcharge instead of an estimate fix, you have raised the price without adding value, which is the elasticity problem: on a market where a 10 percent raise costs 15-25 percent of volume, a 20 percent surcharge can lose the client outright.',
        },
        {
          priority: 3,
          metric: 'Unbilled scope creep — hours delivered but not invoiced, divided by total project hours',
          fixFirst:
            'Separate the overrun you caused from the overrun the client caused, because only the second one can be recovered in cash. For each closed project list the hours that trace to a change the client requested after the quote was signed, and divide by the total hours on the project: on the worked example, 14 of 62 hours were unbilled change requests, which is 23 percent of the project. Put a written change-order path in place — a request form, a price, and a signature — and make the first two change requests on every project free of charge, so the client keeps using the path instead of the inbox. Re-measure the same percentage on the next 5 projects.',
          alsoMoves:
            'It is the difference between a one-off loss and a repeatable one: an estimating error repeats on the next project of the same type, but a missing change-order process repeats on every project you will ever sign. It also frees the row two repair, because once the client-caused hours are separated out of the record, the remaining gap between estimate and actual is a genuine estimating bias you can train down. And it is what makes row five safe to act on, because you can finally tell a client who asked for extra work from a client who simply pays less per hour.',
          backfire:
            'Turning on change orders changes the client relationship, and that is where the cost lands. If the process appears without warning or without a free allowance, clients read the first invoice carrying a change fee as a retroactive surcharge, and the usual response is to dispute the final invoice, which turns a USD 600 scope item into a 60-day payment delay on a USD 6,000 project. The other failure is charging for changes the client believed were included, which is how you lose a repeat customer over an amount that is 10 percent of the project value.',
        },
        {
          priority: 4,
          metric: 'Realization ratio — effective hourly rate divided by posted rate, per project',
          fixFirst:
            'This is the read that tells you whether the problem is price or estimate, and it is cheaper to compute than either of them. Effective hourly rate = revenue ÷ actual hours; divide that by your posted rate and look at the number: on the worked example, USD 6,000 over 62 hours is USD 96.77/hr against a posted USD 150/hr, a realization of 65 percent, which is below the 75 percent line and therefore an estimation problem rather than a pricing problem. Below 75 percent, fix rows two and three and leave the price alone. Above 90 percent, the price is too low relative to what you deliver, and that is the moment to test a raise.',
          alsoMoves:
            'It turns the price question from opinion into arithmetic: on a project running at 65 percent realization, a 15 percent price increase buys you 9.75 percent of effective rate, while a 10 percent reduction in actual hours buys you 10 percent, and the second one costs you nothing in the market and nothing in goodwill. It is also what makes the Step 4 what-if scenarios comparable, because every scenario in that list is really a move on one of these two levers, and the ratio tells you which lever you are actually pulling before you spend a month on it.',
          backfire:
            'Reading a low realization as a pricing problem leads to the most expensive misdiagnosis available. You raise the bid by the shortfall, 35 percent on the worked example, and the quote stops winning outright; a market where a 10 percent raise costs 15-25 percent of volume reads a 35 percent raise as a disqualification, so you lose the work and the remaining book stays underpriced. The other failure is the reverse: one popular project type running at 95 percent realization can pull the blended number up while the type you are trying to grow is still underwater, and the average then hides the hole.',
        },
        {
          priority: 5,
          metric: 'Client margin concentration — share of trailing 12-month revenue from clients below 30% margin',
          fixFirst:
            'Only once the per-project numbers are trustworthy does the portfolio read mean anything, because until rows two and three are fixed a bad estimate looks exactly like a bad client. Take the trailing 12 months of revenue by client, attach the margin of every project each client bought, and compute the share of revenue coming from clients whose margin is below 30 percent: in a book where the bottom 20 percent of clients produce 40 percent of revenue, a third of the business is running below the healthy band. Rank clients by margin per hour rather than by invoice size, because a large invoice from a thin-margin client is worse than two small healthy ones, and write the ranked list down before you talk to anyone.',
          alsoMoves:
            'It is the row that decides whether your future revenue inherits the problem, because new work arrives from the same clients you keep. Replacing a client below 30 percent margin frees the hours they consume at a rate you already know, and those hours go to work carrying the 30 percent band from Step 2. It also turns the Step 7 quarterly audit into a decision rather than a report, and it locates the highest-value diversification: the clients whose problem is a scope you do not want are cheaper to replace than the ones whose problem is a rate they will never pay.',
          backfire:
            'Dropping the bottom of the book can cost more than it saves. If the thin-margin clients are also your referral sources, cutting them removes the channel that fills the pipeline, and with a 6-12 month sales cycle the replacement volume arrives long after the cash you gave up. The other failure is repricing instead of exiting: you raise the rate on a client who was never going to pay more, they leave anyway, and you have churned the relationship without having recovered a single point of margin.',
        },
      ],
    },
    zh: {
      intro:
        '项目利润先从估算漏出去，再从定价漏出去，证据是你实际花的工时对比报价时估的工时。实际时薪低于对外报价的 75% 属于估算问题，涨价解决不了。第二个漏点是未计费的范围蔓延，按已交付未开票工时占总工时算，10% 的蔓延就能吃掉 2-5 个毛利点。第三个漏点是客户集中度：太多收入来自毛利低于 30% 的客户。毛利率分四档——30% 以上是定价有力量，15-30% 还能做，5-15% 一次延期就吃掉利润。固定价新报价一律按总成本乘 2 出来，不要按小时乘报价费率。',
      rows: [
        {
          priority: 1,
          metric: '项目毛利率 —— (revenue − total cost) ÷ revenue，逐个项目算',
          fixFirst:
            '从这一行开始，因为表里其他每一行都是它的杠杆，而一个算不出毛利的项目是你没法做决定的项目。逐项目算毛利率 = (revenue − total cost) ÷ revenue，其中总成本要包含你自己工时按真实成本率计的部分（不是按对外报价费率）、材料、分包，以及这个项目实际吃掉的那一份运营开销。然后读分带：30% 及以上说明定价有余地，15-30% 可做，5-15% 偏薄，0% 或以下就是亏了。在那条示例里，营收 USD 6,000、实际 62 小时按 USD 60/小时的成本率、材料 USD 600、分包 USD 900，总成本 USD 5,220，毛利率 13%——不管活干得多好，它都落在偏薄这一档。',
          alsoMoves:
            '它是唯一能告诉你其他几行里哪一行值得修的数：估算偏差、未计费范围蔓延和定价偏弱，在毛利上都印出同一个偏薄的结果，只有逐项目的明细才能把一个项目跟另一个项目比。它同时给步骤 6 的固定价报价设了价格底线：USD 6,000 的营收配 50% 毛利目标，你能吸收的总成本上限是 USD 3,000，写报价之前这个数必须在手里。滚动 6 个月的毛利才是步骤 5 说的复利度量——在营收不变的情况下从 25% 走到 40%，约等于多出 60% 的年净收入。',
          backfire:
            '修毛利最顺手的做法是停掉产生它的活，而在项目制生意里这一刀可能砍错人。一个偏薄的项目如果是为战略客户做的学习性投入，它跟一个走量客户的偏薄项目根本不是一回事，砍掉前者会在市场转向时正好抽掉你的管道。更隐蔽的失败是算毛利时没算运营开销：数字看着很健康，于是你用同样偏薄的真实毛利去接更多固定价项目，而你排除掉的那份开销，恰恰是年底把生意压到盈亏线以下的东西。',
        },
        {
          priority: 2,
          metric: '估算偏差 —— 实际工时 ÷ 报价时的估算工时，按项目类型分别记',
          fixFirst:
            '知道毛利坏掉之后，先分清亏损里有多少是估算、有多少是价格，因为这两者的修法完全不同。逐个结项项目算实际工时除以报价工时，并且按项目类型分开记，不要混成一个平均数：示例里实际 62 小时对报价 40 小时，超了 55%。用你自己的历史重建估算——取同类型最近 10 个项目，而不是凭经验拍一个数；固定价报价改成按总成本 × 2 来出，非标准化的部分再单加一条写下来的 10-15% 应急金。',
          alsoMoves:
            '它直接喂给步骤 6 的定价规则和第四行的实现率读数：比值高于 1.25 意味着你接下来写的每一份固定价报价都会按差不多的比例少报，所以修一次就同时修好整本新报价。它还让范围清晰度的规则变得可操作，因为比值最差的项目通常正是报价时范围就模糊的那批，这就精确告诉了你该在哪里把书面范围收紧。而且因为糟糕的估算会在同类型下一个项目重演，而一次性意外不会，这一行把单次亏损变成了可修的比率。',
          backfire:
            '只拿历史重建估算，却不改「估算怎么做」，等于把偏差原样带进下一轮。如果历史工时里本身就含着那些你从来没开票的范围蔓延，那么新估算会偏保守，你的报价看起来更厚，却因为不再是最便宜的那家而开始丢活。另一个失败是用 20% 的价格附加费去覆盖超支，而不是去修估算：你涨了价却没加任何价值，而这就是弹性问题——在一个涨 10% 要丢 15-25% 销量的市场里，20% 的附加费可能直接把客户逼走。',
        },
        {
          priority: 3,
          metric: '未计费范围蔓延 —— 已交付但未开票的工时 ÷ 项目总工时',
          fixFirst:
            '把你造成的超支和客户造成的超支分开，因为只有后者能变成钱追回来。逐个项目列出「报价签字之后客户才提出、因而未被计费」的那些工时，除以项目总工时：示例里 62 小时中有 14 小时是未开票的变更请求，占项目的 23%。装一条写下来的变更流程——一张申请单、一个价格、一个签字——并且每个项目前两次变更免费，让客户继续走流程而不是继续发邮件。用接下来的 5 个项目重测同一个百分比。',
          alsoMoves:
            '它是「一次性损失」和「可重复损失」的分界：估算错误会在同类型的下一个项目重演，而缺失的变更流程会在你签下的每一个项目上重演。它还解放了第二行的修复——把客户造成的工时从记录里摘出去之后，估算与实际之间剩下的那段差距才是真正的估算偏差，练得下来。它也是第五行能安全动手的前提，因为到这一步你才分得清谁是要求了额外工作、谁只是每小时付得更少。',
          backfire:
            '把变更流程打开，改的是客户关系，成本就从这里落下来。如果流程没有预告、或者没有免费额度，客户会把第一张带变更费的发票读成事后加价，常见反应是拒付尾款，于是一笔 USD 600 的范围争议，变成一个 USD 6,000 项目上 60 天的回款延迟。另一个失败是去收那些客户以为本来就包含在内的变更费用——你会为了一个只有项目金额 10% 的差价丢掉一个复购客户。',
        },
        {
          priority: 4,
          metric: '实现率 —— 实际时薪 ÷ 对外报价费率，逐项目算',
          fixFirst:
            '这是判断问题是出在价格还是出在估算的读数，而且比这两种算法本身都便宜。实际时薪 = revenue ÷ 实际工时，再除以你的报价费率看结果：示例里 USD 6,000 除以 62 小时是 USD 96.77/小时，对报价的 USD 150/小时，实现率 65%，低于 75% 这条线，所以这是估算问题而不是定价问题。低于 75%，去修第二行和第三行，价格先别动；高于 90%，说明价格相对你交付的东西偏低，那才是试涨价的时点。',
          alsoMoves:
            '它把价格问题从感觉变成算术：在实现率 65% 的项目上，涨价 15% 只换来实际费率多 9.75%，而把实际工时压掉 10% 换来 10%，后者既不动市场也不动客户关系。它也是步骤 4 那些 What-If 场景能被横向比较的原因——那四个场景本质上都是在这两个杠杆上动，而实现率会告诉你你到底在拉哪一个，再决定要不要花一个月去做。',
          backfire:
            '把低实现率误读成定价问题，会导向最贵的一个误诊：按缺口抬价，示例上就是抬 35%，报价直接出局；在一个涨 10% 要丢 15-25% 销量的市场里，涨 35% 会被读成资格问题，于是活丢了，剩下的存量报价依然报低。另一个失败是反过来：某个热门项目类型跑在 95% 实现率上，把混合数拉高了，而你想扩的那类项目还在水下，平均数就把那个洞盖住了。',
        },
        {
          priority: 5,
          metric: '客户毛利集中度 —— 滚动 12 个月收入里，来自毛利低于 30% 客户的占比',
          fixFirst:
            '只有单项目的数字可信了，客户组合的读数才有意义，因为在第二、三行修好之前，糟糕的估算和糟糕的客户长得一模一样。把滚动 12 个月的收入按客户拆开，给每个客户买过的每个项目挂上毛利，再算来自毛利低于 30% 客户的收入占比：在一个「垫底 20% 的客户贡献 40% 收入」的书里，有三分之一的生意跑在健康带以下。按每小时的毛利给客户排名，而不是按发票金额，因为一个薄利客户的大额发票比两个健康客户的小额发票更糟；而且在跟任何人谈之前，先把这份排名写下来。',
          alsoMoves:
            '它是决定未来收入会不会继承问题的这一行，因为新活来自你留着的同一批客户。替换掉一个毛利低于 30% 的客户，能按你已经知道的费率释放出他占用的那些工时，而这些工时会流向带着步骤 2 那条 30% 健康带的工作。它也把步骤 7 的季度审计从一份报告变成一个决定，并且指出最高价值的多元化方向：问题出在你不想接的范围上的客户，比问题出在客户永远不肯付的费率上的客户，好换得多。',
          backfire:
            '砍掉书里垫底的那部分，可能比省下的更多。如果薄利客户同时是你的转介绍来源，砍掉他们就是砍掉了填管道的那个渠道，而在 6-12 个月的销售周期里，替代的量会在你交出现金很久之后才到。另一个失败是涨价而不是退出：给一个本来就不会多付的客户涨价，他照样走，于是你把关系搅黄了，却一个百分点的毛利也没捞回来，而这一行的代价通常要到两个季度之后才显形。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Every closed project gets the same seven checks, and the first decides most of the others: build the full profit and loss from actual hours, never from the estimate you bid on. Margin then lands in one of four bands, the effective hourly rate is compared against posted rate, and what-if scenarios run on real cost.',
      items: [
        {
          step: 1,
          label: 'Every closed project has a full P&L built from actual hours, not estimates',
          gate: 'A one-line P&L per project with revenue, actual hours, labor cost at your hourly cost rate, materials and subcontractor, covering at least the last 5 closed projects, with the original estimated hours retained alongside so the Step 2 bias can be computed.',
          blockIf:
            'If actual hours are missing then the margin in Step 2 is computed against a number that never existed, and every band you read off it is fiction. Estimated hours also quietly become the basis for the next quote, so a single unrecorded project keeps propagating the error into every future bid. Record the hours as you work them, weekly, rather than at the end of the project when memory has already edited them.',
        },
        {
          step: 2,
          label: 'Margin computed per project and placed in one of the four health bands',
          gate: 'Margin computed as (revenue − total cost) ÷ revenue for each of the last 5 projects, each landing in one of the four bands of 30 percent or above, 15-30 percent, 5-15 percent, or 0 percent or below, with the 6-month rolling average recorded next to it.',
          blockIf:
            'Without a per-project margin you cannot tell which lever to pull, because an estimating error, unbilled scope and a low price all produce the same thin result and only the per-project line tells them apart. The rolling average is also what makes the Step 5 compounding visible: moving 25 percent to 40 percent at the same revenue is about 60 percent more annual net income, and that only shows up if the number was written down each time.',
        },
        {
          step: 3,
          label: 'Effective hourly rate computed and compared against the posted rate',
          gate: 'Effective hourly rate calculated as revenue ÷ actual hours for each project with its ratio to the posted rate recorded, and at least 3 projects below 75 percent flagged as estimation problems rather than pricing problems before any price change is made.',
          blockIf:
            'Skipping this step is what produces a price rise that fixes nothing: if realization is 65 percent because the estimate was 55 percent light, a 15 percent price increase adds only about 10 percent to the effective rate while the hours stay wrong, and the real loss was never in the price. Compute the ratio before touching the card, or you will spend a quarter of goodwill on a number that was never the constraint.',
        },
        {
          step: 4,
          label: 'What-if scenarios run against real cost rather than posted rate',
          gate: 'At least 3 of the 4 scenarios run on real last-project numbers — 20 percent fewer hours, 15 percent higher price, 30 percent lower materials, and the combined case — each showing the resulting margin and effective hourly rate, with the combined case selected only if it beats the single levers.',
          blockIf:
            'A what-if modelled on posted rate times estimated hours will show a gain that evaporates on delivery, because the scenario inherits the very bias you are trying to correct. Run the model on real cost and you also learn which lever is largest in your own book, and that answer decides whether Step 6 pricing or Step 5 retrospectives is the better use of the next month.',
        },
        {
          step: 5,
          label: 'A one-page retrospective after each project and a rolling average',
          gate: 'A retrospective for each of the last 5 projects with all 4 fields filled in — actual margin, scope creep as a percentage of hours, one change for next time, and a yes or no on repeating the client — and the 6-month rolling margin computed from those records plus the prior month.',
          blockIf:
            'A retrospective written once at the end of the year cannot change anything that happens inside it, and the four questions only work when the first one is asked within days of delivery while the memory is accurate. Leaving out the scope creep field in particular keeps row three of the fix-priority table unmeasured, so the same client can quietly consume a quarter of your year again.',
        },
        {
          step: 6,
          label: 'New fixed-bid quotes priced from total cost times two',
          gate: 'Every new fixed-price quote built from total cost times 2, where total cost includes labor at your cost rate, materials, subcontractor and overhead allocation, with a 10-15 percent contingency written as its own line, and at least 1 of the last 3 quotes priced this way.',
          blockIf:
            'Quoting from hours times posted rate is what produces the 20-40 percent underbid, because overhead and contingency are the two lines that never appear on an hourly quote. If the bid is not built from cost, then the Step 2 margin bands are only being observed on work you already accepted, and the 50 percent target in Step 6 stays decoration until the first quote uses it.',
        },
        {
          step: 7,
          label: 'Quarterly client margin audit with a written exit or reprice decision',
          gate: 'Trailing 12-month revenue split by client with margin attached, the share of revenue from clients below 30 percent margin computed, and a written decision on the bottom 20 percent of clients to reprice, re-scope or exit, dated within the last 90 days.',
          blockIf:
            'An audit that produces a list but no decision leaves the same clients on the same terms, and because they are usually the ones consuming the most hours, the constraint in rows two and three never eases. Decide at the audit, in writing, with a date: the exit cost of one thin client is visible on a calendar while the hours it quietly takes up are not, which is why this is the step most often skipped.',
        },
      ],
    },
    zh: {
      intro:
        '每个结项项目都跑同样七个检查点，第一个基本决定其余六个：用实际工时而不是报价时的估算，拉出完整的一行损益。毛利随后落进四档分带，实际时薪与对外报价费率逐项目对比，What-If 场景必须跑在真实成本上。每个项目结束后的一页复盘，才把一个偶然的好季度变成会动的滚动均值——从 25% 提到 40%，在同样的收入下相当于年净收入多 60%。季度还要做一次客户毛利审计，对低于 30% 毛利的客户写下退出还是改价。实现率低于 70% 说明当初低估了 30%，下一单要改报价方式。',
      items: [
        {
          step: 1,
          label: '每个结项项目都有用实际工时算出来的完整损益行',
          gate: '每个项目一行损益，含营收、实际工时、按小时成本率计的人工、材料与分包，覆盖最近 5 个已结项项目，并保留原始估算工时以便步骤 2 算偏差。',
          blockIf:
            '实际工时一缺，步骤 2 的毛利就是拿一个从来没存在过的数算的，你读到的每个分带都是虚构的。而且估算工时会悄悄变成下一份报价的依据，于是只有一个项目没记这件事，就会一路传播到往后每一份报价。工时要按周随手记，而不是等项目结束再补——那时记忆已经被修过一遍了。',
        },
        {
          step: 2,
          label: '逐项目算出毛利，并落到四档健康分带里判定',
          gate: '最近 5 个项目各算一个 (revenue − total cost) ÷ revenue，每个都落在四档之一：30% 及以上、15-30%、5-15%、0% 或以下，并在旁边记下滚动 6 个月均值。',
          blockIf:
            '没有逐项目毛利，你就分不出该拉哪个杠杆，因为估算错、范围没开票、定价弱，在毛利上都印出同一个偏薄的结果，只有逐项目的明细能把它们分开。滚动均值也是步骤 5 那个复利看得见的地方：同样营收下从 25% 走到 40%，约等于多出 60% 年净收入——而这个只有每次都写下来才看得见。',
        },
        {
          step: 3,
          label: '实际时薪算出来，并与对外报价费率逐项目对比',
          gate: '每个项目算实际时薪 = revenue ÷ 实际工时，并记下它与报价费率的比值；在动任何价格之前，至少有 3 个低于 75% 的项目被标为估算问题而不是定价问题。',
          blockIf:
            '跳过这一步，就会出现那种「涨价了却什么都没修」的结果：如果实现率 65% 是因为估算少算了 55%，那涨价 15% 只给实际费率加约 10%，而工时照样是错的——真正的亏损从来不在价格里。先算比值再动报价卡，否则你会拿一个季度的口碑，去换一个本来就不是约束的数。',
        },
        {
          step: 4,
          label: 'What-If 场景跑在真实成本上，而不是报价费率上',
          gate: '4 个场景里至少跑 3 个、用上一个真实项目的数字——工时减 20%、价格加 15%、材料减 30%、以及综合方案——每个都给出新的毛利率与新的实际时薪，并且只有综合方案确实胜过单一杠杆时才选它。',
          blockIf:
            '跑在「报价费率 × 估算工时」上的 What-If，会显示一个交付时就蒸发的收益，因为这个场景把你正要修的那个偏差原样继承下来了。跑在真实成本上，你还能知道在自己这本书里哪个杠杆最大，而这个答案就决定了下个月该先做步骤 6 的定价，还是先做步骤 5 的复盘。',
        },
        {
          step: 5,
          label: '每个项目结束后做一页复盘，并维护滚动毛利均值',
          gate: '最近 5 个项目各有一页复盘且 4 个字段都填了——实际毛利、范围蔓延占工时百分比、下次改哪一条、以及这个客户要不要复购——并用这些记录加上上一个月算出滚动 6 个月毛利。',
          blockIf:
            '一年写一次复盘，改不动它里面发生过的任何事；而这四个问题只有在交付后几天内、记忆还准确的时候问第一个才有用。尤其别漏掉范围蔓延那一栏——漏了它，修复优先级表里的第三行就一直没有被测量，于是同一个客户可以再悄悄吃掉你一个季度。',
        },
        {
          step: 6,
          label: '新的固定价报价，一律按总成本乘 2 出来报价',
          gate: '每份新的固定价报价都按总成本 × 2 构建，总成本含按成本率计的人工、材料、分包与运营开销分摊，另有单独一行写明 10-15% 的应急金；最近 3 份报价里至少有 1 份是这样出的。',
          blockIf:
            '按「小时 × 报价费率」报价，正是少报 20-40% 的成因，因为运营开销和应急金这两行永远不出现在按小时算的报价上。如果报价不从成本出发，步骤 2 的毛利分带就只是在观察你已经接下的活，而步骤 6 的 50% 目标在第一份这样报价之前都只是装饰。',
        },
        {
          step: 7,
          label: '季度客户毛利审计，并且写下退出或改价的决定',
          gate: '滚动 12 个月收入按客户拆开并挂上毛利，算出毛利低于 30% 客户的收入占比，并对垫底 20% 的客户写下改价、改范围或退出的决定，决定日期在过去 90 天内。',
          blockIf:
            '只出名单不做决定的审计，等于让同一批客户按同样的条件继续合作，而他们通常正是吃掉最多工时的那批，于是第二、三行那个约束永远不会松动。审计当天就决定、写下来、落日期：一个薄利客户的退出成本在日历上看得见，而他们悄悄占掉的工时看不见——这就是这一步最常被跳过的原因。',
        },
      ],
    },
  },
};
