// P166 —— H 类（Hiring & Team）主题「attrition-cost-optimization」的新形态内容。
//
// ⭐ 这一层写的是什么（与既有散文的分工）
// --------------------------------------------
// · 既有 howToUse（基准页 8 行）说的是「选哪一行 → 单一动作」：流失率、换人成本占比、
//   遗憾性流失、留任 ROI，各自对应一个动作。
// · 既有 howToApply（指南页 6 步）说的是「做什么」：拉数据 → 分类 → 算单人成本 → 年化对比预算
//   → 找飞险群体 → 设季度目标。
// · 本文件的 fixPriority 说的是**指标之间的排序与联动**：多个指标同时不达标时先修哪一个、
//   它顺带带动哪一个、以及在什么条件下这次修复会把另一个指标修坏。
//   既有散文里没有这一层 —— howToApply 只是顺序，不是「同时不达标时先动谁」。
// · 本文件的 readinessChecklist 说的是**每一步的达标线**：howToApply 只说做什么，
//   不说什么算过了；这里给出今天就能核对的数量线，以及不达标时具体卡在哪一步。
//
// 口径纪律（本主题讲的是创始人自己的经营阈值，不是市场价 ⇒ 金额可手写，但必须带口径）：
//   · 流失率一律写明分子与分母，且主动与被动分开；期间一律是滚动 12 个月
//   · 换人成本一律换算成「该离职者年薪的百分比」，并按离职群体与职级带分别给出
//   · 留任回报的分子是「因留任而避免的换人成本」，分母是留任项目支出（含经理时间）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Voluntary and involuntary turnover are two different budgets, and most companies pay for them with one number. Voluntary departures are the expensive ones, because they carry the deepest knowledge loss and the longest amortisation of ramp cost, while involuntary volume above a point is a hiring failure rather than a retention failure, and the answer to that is not a retention programme. Classify the second pair before you budget anything: regrettable against non-regrettable is judged on outcome, not on the reason in the exit interview, and a company losing 8% of its people but only 2% of them regrettably is in better shape than one at 4% voluntary with 6% regrettable. Per-leaver cost is then a decomposition rather than a percentage: the 50-200% band breaks into recruiting at 5-15% of salary, ramp at 30-50% and lost productivity at 50-150%, and when a manager at 1.5x leaves, the back half of that band compounds on itself. What makes a budget defensible is the annualised figure, per-leaver cost times leaver count times regrettable share, compared against a retention budget of 20-30% of that total, because spend above that ceiling is buying back people you were never going to lose. Flight-risk signals are leading indicators and have to be watched monthly rather than after a resignation: eNPS falling, a manager score under 3, a comp ratio under 0.95 and stalled mobility together flag someone well before they file.',
      rows: [
        {
          priority: 1,
          metric: 'Voluntary attrition rate (voluntary leavers divided by average headcount over the trailing 12 months, reported separately from involuntary terminations)',
          fixFirst:
            'Fix the rate first because it is the multiplier on everything else on this page. The per-leaver cost is a unit price and the annual turnover cost is that price multiplied by how many people actually left, so a company that halves its per-leaver cost and leaves the rate untouched saves almost nothing while feeling busy. The rate is also the first row where the fix depends on somebody other than you — a manager, a pay band, a career path — which is why it is worth starting while you work through the rows below it. Report it per team and per manager rather than company-wide, because a 15% headline can be 4% in engineering and 38% in support, and one company target will spend the retention budget on the team that was never leaving.',
          alsoMoves:
            'A lower voluntary rate moves the cost per leaver indirectly: the cheapest way to reduce total cost is to stop replacing people rather than to replace them more cheaply, because every rehire repeats the recruiting fee, the ramp and the lost productivity months. It also moves the flight-risk coverage row, since a team whose people stay is a team with fewer people in the bottom decile of any risk indicator. And it changes the denominator of the retention return, because a programme judged against a moving baseline cannot be read.',
          backfire:
            'Chasing the rate with money can improve the rate and worsen everything downstream. Retention bonuses paid at the door are cheaper than replacing a senior engineer, but once one team receives one, the next resignation in that team expects the same, and the per-leaver cost stops falling even as the headline rate does. The other failure is reading a suspiciously low rate as good news: voluntary attrition below the band for your industry usually means under-reporting, or that nobody is allowed to leave, and both hide a problem that appears later as a quality drop or a resignation cluster. Check the definition against the same one your benchmark uses before you act on it.',
        },
        {
          priority: 2,
          metric: 'Regrettable share of departures (leavers classified as regrettable divided by all leavers, with the classification recorded per leaver from the trailing 12-month review)',
          fixFirst:
            'Fix the classification second, because it decides whether the problem is retention or hiring. Regrettable departures are the ones where you would have fought to keep the person; non-regrettable departures are mostly the cost of clearing out low performers and poor fits. A company can run a high voluntary rate made mostly of non-regrettable exits and have a hiring problem rather than a retention problem, and buying retention bonuses there is paying to keep the wrong people. Classify every leaver of the trailing 12 months using the performance review plus manager judgement, written down per leaver, then compute the regrettable rate against average headcount with a target under 5%. The discipline that makes this work is classifying by outcome rather than by the reason given in the exit interview.',
          alsoMoves:
            'The classification converts a headline rate into an avoidable budget, because only the regrettable share is the spend you can avoid, and that number is what the retention budget in the guide is sized against. It also re-ranks where save plays should go: the expensive regrets are usually concentrated in two or three roles or in one manager, so a programme spread evenly across the company spends most of its money where nothing was going to be lost. And a per-leaver written classification is the evidence base for the flight-risk indicators later, because you can then test whether the indicators you are using actually predicted the departures you regret.',
          backfire:
            'Classification can be made to look good, and the cost of that shows up later. Reclassifying an unwanted departure as non-regrettable because the review was thin is the quiet version: the rate improves, the retention budget shrinks, and the person who would have been worth keeping leaves without a save play. The other version is the knowledge-transfer gap: the average window for handing over critical work is 2-4 weeks, and the exit often happens sooner, so the real cost of a regretted departure is understated even when the classification is honest. Record the classification at the time of departure, not when you write the review, because the evidence about the person is most accurate while you still have them.',
        },
        {
          priority: 3,
          metric: 'Replacement cost per leaver (recruiting cost plus ramp cost plus lost productivity, expressed as a percentage of the leaver annual salary and computed per cohort)',
          fixFirst:
            'Fix the per-leaver cost third because it is built from the two rows above and from the ramp assumption in your own hiring data, so it cannot be made cheaper in isolation: the recruiting fee is set by the market, the ramp component is set by how you onboard, and the lost productivity is set by how long the team takes to absorb the departure. What you can do is decompose it, and decomposition changes what you do next. A cost at 180% of salary is three separate problems: a recruiting fee above 20% means you are using agencies for roles you could fill internally, a ramp component above 40% means every backfill starts from zero, and lost productivity above 100% means the team is carrying the work while it waits. Compute it per cohort and per role band rather than as one company figure.',
          alsoMoves:
            'The per-leaver cost sets the ceiling on retention spend, because a retention programme has to be cheaper than the replacement it prevents — a 15% retention offer against a 150% replacement is obviously good, and against a 40% replacement it is a bad deal you should not make. It also re-ranks which roles deserve protection, because the same percentage of salary is worth far more on a manager than on a junior hire. And once every cohort has its own number, the annual figure becomes honest: it is the cohort cost multiplied by the cohort count, rather than a company-wide average multiplied by a headcount that left in a different mix.',
          backfire:
            'A per-leaver figure can be precise and still be wrong in the direction that hurts. The usual error is applying the same headline percentage to every role, which understates a senior departure by a factor of two or three while overstating an entry-level one, and the practical result is that retention money is spent on the cheap exits and withheld from the expensive ones. A second error is booking severance outside the cost, which makes involuntary departures look free and destroys the voluntary analysis that every retention decision depends on. And there is a version where the number improves because the ramp assumption was shrunk on paper rather than because the process changed, in which case the annual turnover cost is understated by exactly the amount you were hoping to find.',
        },
        {
          priority: 4,
          metric: 'Flight-risk coverage (employees with a documented save play divided by employees flagged at risk by any of the 4 leading indicators, reviewed monthly)',
          fixFirst:
            'Fix coverage fourth because it is the only row that acts before the departure rather than after it. Voluntary attrition shows up in your data when it has already happened; the leading indicators — an engagement score drop, a manager score below 3, a comp ratio below 0.95, mobility stalled for more than 24 months — move one to two quarters earlier, and a save play in that window is the only intervention that can still change the outcome. Score all 4 indicators monthly for everyone rather than waiting for a resignation, then give the bottom decile of each indicator a named save play within 30 days: a skip-level conversation, a compensation review, a role redesign. Coverage is the share of flagged people who actually have a play attached, which is what separates a programme from a list.',
          alsoMoves:
            'Coverage moves the voluntary attrition rate next quarter, which is the whole point of doing it before the rate moves. It also changes the value of a save, because a saved senior engineer is worth several times a saved junior hire, and a programme that only reaches the bottom decile of one indicator will consistently save the wrong people. It also makes the retention return measurable, because a documented play with a date and an owner is attributable, whereas a general goodwill programme can only be judged on the rate it happens to coincide with.',
          backfire:
            'Save plays fail when they are aimed by a badly calibrated indicator, and the most common version is saving the people who complain. An engagement score drop can reflect a reorganisation, a change in the survey population or a bad quarter rather than an intent to leave, and paying retention money on that basis buys loyalty you did not need while the person who was going to resign quietly — and expensively — resigns. Giving retention bonuses broadly creates an expectation that survives the incident. And the people who never score badly are the ones you lose: the quiet senior who is not unhappy, just done, is invisible to every one of these indicators until the resignation.',
        },
        {
          priority: 5,
          metric: 'Retention programme return (avoided replacement cost divided by retention programme spend, measured over a rolling 4 quarters)',
          fixFirst:
            'Fix the measurement last, because it is the scoreboard for the whole table and it cannot be read until the rate, the classification and the coverage are instrumented. Two rules make it readable. First, count only avoidable cost: a leaver you would have lost anyway is not a save, and counting them turns a 2x return into a number that looks like 4x. Second, keep the denominator honest — a retention programme includes the money, the manager time and the senior time that the save plays consume, not just the bonus cheques, and a programme that returns 2x on bonuses alone may return less than 1x once the manager hours are counted. Once the measurement holds up, the retention budget in the guide — 20-30% of annual turnover cost — becomes a ceiling you can defend rather than a round number.',
          alsoMoves:
            'A trustworthy return number changes the size of the budget, not just its justification: a programme genuinely returning above 3x can absorb a larger spend and cover more cohorts, while one returning under 1x should be stopped even if the voluntary rate improved, because the rate improved for another reason. It also tells you which of the save plays to keep, since the plays are cheap to compare once each carries a cost. And it is the number that survives a budget conversation, because it is expressed as avoided cost rather than as a feeling that things are better.',
          backfire:
            'The measurement backfires when it is used to justify the programme rather than to judge it. Attributing every departure in a quarter to the programme, when the departures were already committed before the programme started, produces a return that no amount of money could buy. Averaging across a year hides a programme that spent in Q1 and was credited in Q4, and hides one that was cut in the middle and judged on a half-year. And a threshold set as a target rather than as a floor turns the number into a reason to keep spending: once 3x is the line, a programme about to fall below it has an incentive to count harder rather than to stop.',
        },
      ],
    },
    zh: {
      intro:
        '主动流失和被动流失是两笔完全不同的账，而多数公司只用一个数去付这两笔。主动离职更贵：知识损失更深，爬坡成本的摊销更长；被动流失一高，暴露的其实是招聘失败而不是留任失败，这时候上留任项目是错的方向。第二组要先分类再谈预算：遗憾性与不可惜是按结果判的，不是按离职面谈里写的那句理由判的；主动流失 8% 但其中只有 2% 是遗憾性的公司，比主动流失 4%、遗憾性占 6% 的公司健康得多。然后单人成本不是一个百分比，而是一次拆解：50-200% 这条带子里，招聘占年薪 5-15%、爬坡占 30-50%、产能损失占 50-150%，经理再乘 1.5 倍，后半段就会自己叠起来。预算上真正站得住的是年化那一个数 —— 单人成本乘离职人数乘遗憾性占比 —— 再去对留任预算（通常取年化流动成本的 20-30%）：超过这条线的投入，买的是你本来就留不住的人。飞险信号是前瞻指标，必须按月看，不能等辞呈：eNPS 下滑、经理评分低于 3、薪酬对市场比低于 0.95、晋升停滞，这几条一起动，人在递辞呈之前就已经被标出来了。',
      rows: [
        {
          priority: 1,
          metric: '主动流失率（滚动 12 个月内主动离职人数 ÷ 平均在册人数，与被动终止分开报）',
          fixFirst:
            '流失率排第一，因为它是这一页上其它一切的乘数。单人成本是一个单价，年度流失成本是单价乘以真正走掉的人数——所以一家把单人成本砍掉一半、流失率原封不动的公司，几乎没省到任何东西，却忙得像在做事。流失率也是表上唯一一行「修它要靠别人」的数字：经理、薪酬带宽、晋升路径——正因如此，它值得在你还在处理下面几行的时候就开始启动。按团队和按经理报，而不是按公司报：15% 的标题数字可能是工程 4%、客服 38%，一个全公司统一目标会把留任预算花在本来就不会走的那个团队身上。',
          alsoMoves:
            '主动流失率下降会间接带动单人换人成本：降总成本最便宜的办法是不换人，而不是换得更便宜，因为每补一个位就要再付一遍招聘费、再跑一遍爬坡、再承受那几个月团队的生产力损失。它也会带动飞险覆盖那一行——留住人的团队，落在任何风险指标底部十分位的人就少。它还会改变留任回报的分母，因为一个分母在动的项目，回报是没法读的。',
          backfire:
            '用钱追流失率，可能让流失率好看而真实成本变差。离职门前的留任奖金比换掉一个高级工程师便宜，但某个团队发过一次之后，下一个离职的人会期待同样的东西，于是单人成本不再下降，尽管标题上的流失率在下降。另一个失败是把「低得可疑」的流失率当成好消息：低于行业区间通常意味着漏报，或者没人被允许离职，两者都会把问题藏起来，几个月后以质量下滑或集中离职的形式冒出来。动手之前，先确认你的口径和行业基准是同一套。',
        },
        {
          priority: 2,
          metric: '遗憾性离职占比（按离职结果分类为遗憾性的离职人数 ÷ 全部离职人数，分类依据滚动 12 个月的绩效评估逐人记录）',
          fixFirst:
            '分类排第二，因为它决定这个问题到底是留任还是招聘。遗憾性离职是你本来会拼命留住的人；非遗憾性离职大多是清掉低绩效者和不合适的人。一家公司可以主动流失率很高，但其中大部分是非遗憾性离职——那它的问题是招聘而不是留任，在那里买留任奖金等于花钱留错人。把滚动 12 个月里的每个离职者按「绩效评估 + 经理判断」逐人分类并写下来，然后用遗憾性离职人数除以平均在册人数算遗憾性流失率，目标低于 5%。让这件事可用的纪律是：按结果分类，不按离职面谈里给的理由分类。',
          alsoMoves:
            '分类把一个标题流失率变成可避免的预算，因为只有遗憾的那部分才是你能避免的支出，而指南里留任预算的规模正是对这个数定的。它也重排了「挽回动作该做在哪」：昂贵的遗憾通常集中在两三个岗位或一个经理身上，所以一个均匀铺开的项目，会把大部分钱花在本來也不会丢的人身上。而逐人写下的分类，是后面飞险指标能不能用的证据基础——因为你可以回头检验：你用的那些指标，是否真的预测了你后悔的那几次离职。',
          backfire:
            '分类是可以被做得好看的，而代价随后才出现。因为评估单薄，就把一个你本来不想要的离职重写成非遗憾性——这是安静的那种版本：指标变好、留任预算被缩小，而那个你本来值得留住的人在没有挽回动作的情况下走了。另一个版本是知识交接的空档：交接关键工作的平均窗口是 2-4 周，而离职往往比这更早，所以一次遗憾离职的真实成本即便在分类诚实的时候也是被低估的。分类要在离职当时记，而不是等你写回顾时再记——关于这个人的证据，在他还在的时候最准。',
        },
        {
          priority: 3,
          metric: '单人换人成本（招聘费 + 爬坡成本 + 生产力损失，换算成该离职者年薪的百分比，按离职群体分别计算）',
          fixFirst:
            '单人换人成本排第三，因为它由上面两行加上你自己招聘数据里的爬坡假设搭出来，没法单独压便宜：招聘费由市场定，爬坡分项由你怎么带新人定，生产力损失由团队吸收一次离职要多久定。你能做的是把它拆开，而拆开之后该做什么就变了。年薪 180% 的成本是三个不同的问题：招聘费超过 20% 说明你在用猎头招本该内部补的岗；爬坡分项超过 40% 说明每个补位都从零开始；生产力损失超过 100% 说明团队在等待期间还在扛活。要按群体、按职级带分别算，而不是一个公司数字。',
          alsoMoves:
            '单人成本决定了留任支出的上限，因为留任项目必须比它挡下的那一次替换便宜——15% 的留任报价对着 150% 的替换成本显然值得做，对着 40% 的替换成本就是一笔不该做的生意。它也重排了该保谁：同样的薪资百分比，在经理身上值到的钱远高于初级招聘。而且当每个群体都有自己的数字之后，年度数字才诚实：它是群体成本乘群体人数，而不是一个公司平均数乘上一个以另一种构成离开的人数。',
          backfire:
            '单人成本可以算得很精确，却精确地错在要命的方向。最常见的错是对所有人用同一个百分比，这会把高级岗位的离职低估两三倍、把初级岗位高估，实际结果就是留任的钱花在便宜的离职上、舍不得花在贵的那几次。第二个错是把遣散费记在成本之外，于是被动离职看起来是免费的，而依赖主动/被动拆分的每一个留任决策都失去意义。还有一种版本是数字变好是因为在纸面上把爬坡假设缩小了，而不是流程变了——这时年度流失成本正好被低估了你想找出来的那部分。',
        },
        {
          priority: 4,
          metric: '飞险覆盖率（拿到书面挽回动作的员工数 ÷ 被 4 个前瞻指标中任意一个标出的员工数，每月复核）',
          fixFirst:
            '覆盖排第四，因为它是表上唯一一行能在离职发生之前动手的。主动流失在你的数据里出现时，人已经走了；而前瞻指标——敬业度下滑、经理评分低于 3、薪酬比低于 0.95、流动停滞超过 24 个月——会提前一到两个季度移动，而挽回动作只有在这个窗口里还来得及改变结果。每月给所有人打这 4 个指标的分数，再让每个指标底部十分位的人在 30 天内拿到一个有名字的挽回动作：跨层谈话、薪酬复核、岗位重新设计。覆盖率指的是「被标出的人里有多少真的拿到了动作」，这是「一个项目」和「一张名单」的区别。',
          alsoMoves:
            '覆盖会带动下个季度的主动流失率，这正是要在流失率动之前做它的理由。它也会改变一次挽回的价值量：留住一个资深工程师值好几个初级招聘，一个只在某个指标底部十分位触达的项目，会系统性地救回最不该救的人。它还会让留任回报变得可测——一个有日期、有责任人的书面动作是可归因的，而一个笼统的善意项目只能靠「碰巧同期发生的流失率」来判断。',
          backfire:
            '挽回动作在指标校准不准时会失效，最常见的版本是「救那些会抱怨的人」。敬业度下滑可能反映的是一次重组、一次问卷人群变化或者一个糟糕的季度，而不是离职意图；照这个付钱，等于花钱买了你并不需要的忠诚，而那个你本来想拦住的离职会安静地、昂贵地发生。大范围发留任奖金会制造出一种持续的预期。而从不打低分的人恰恰是你会失去的人：那个不生气、只是想走的资深员工，在这 4 个指标上全都不显眼，直到他递辞呈。',
        },
        {
          priority: 5,
          metric: '留任项目回报（因留任而避免的换人成本 ÷ 留任项目支出，按滚动 4 个季度计）',
          fixFirst:
            '回报排最后，因为它是整张表的记分牌，而在流失率、分类和覆盖率都装好仪表之前它根本读不出来。让它可读要守两条规则。第一，只算可避免的成本：一个你本来就会失去的人，不算「救回来」，把它们算进去会让 2 倍的回报看起来像 4 倍。第二，分母要诚实——留任项目花的不只是奖金支票，还有挽回动作占用的经理时间和高管时间；一个在奖金口径上回报 2 倍的项目，把经理工时算进去可能不到 1 倍。一旦这个测量站得住，指南里「年度流失成本的 20-30%」这条留任预算就从随口说的一个数变成你可以拿出去守的 ceiling。',
          alsoMoves:
            '一个可信的回报数字，改变的是预算的规模，而不只是预算的正当性：真回报超过 3 倍的项目可以吸收更大的支出、覆盖更多群体，而回报低于 1 倍的项目应该停掉，哪怕主动流失率这段时间确实下降了——因为下降是别的原因带来的。它还告诉你哪些挽回动作该保留，因为在每个动作都带上成本之后，动作之间是可以比的。而这也是唯一能挺过一场预算讨论的数字，因为它表达的是「避免的成本」，不是「感觉变好了」。',
          backfire:
            '当这个测量被用来给项目背书、而不是评判项目时，它就会反噬。把一个季度里的每一次离职都算成项目的功劳——而这些离职在项目开始之前就已经注定了——会算出一个再多的钱也买不到的回报。按全年平均会把一个 Q1 花钱、Q4 记功的项目混过去，也会把一个中途砍掉、却只用半年评估的项目混过去。而把门槛设成目标而不是底线，会让这个数字变成继续花钱的理由：一旦 3 倍是那条线，一个快要跌破 3 倍的项目就有了「算得更狠一点」的动机，而不是停下来的动机。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Attrition cost is a mix rather than a rate, and the checklist below separates the two before it measures either. The first line is the split itself: voluntary and involuntary leavers counted apart, with the involuntary volume tested against your hiring funnel rather than against a retention target, because a company firing 30% of a team is looking at recruiting while a company losing 30% voluntarily is looking at something else entirely. The second line is the regrettable classification, judged on outcomes rather than a codification of exit reasons, so write down the evidence that made each leaver regrettable and keep that evidence. The third line is the per-leaver decomposition, and the bands matter because they are floors rather than averages: recruiting cost inside the 5-15% range, ramp cost inside the 30-50% range, and lost productivity inside the 50-150% range, with manager departures carrying their own multiplier on top. The fourth line is the annualised number, because that is the figure a retention budget is measured against, and the fifth holds that budget at 20-30% of annual turnover cost. The sixth and seventh lines exist because retention work that starts after someone resigns is a lagging programme: flight-risk cohorts get identified monthly from the leading indicators, and each one gets a specific save play rather than a survey.',
      items: [
        {
          step: 1,
          label: 'Trailing 12-month attrition pull reconciled to payroll',
          gate:
            'Voluntary and involuntary leavers for the trailing 12 months are split by role, team and manager, the two lists reconcile to within 2% of the headcount change recorded in payroll, and the headline voluntary rate is written down next to the JOLTS band for your industry.',
          blockIf:
            'If the leaver list and the payroll headcount do not agree, then the rate you are about to multiply everything by is wrong in an unknown direction, and every figure downstream inherits that error. The usual causes are terminations coded differently in the two systems and people who left in the last week of the period, both of which are cheap to fix once you know. Also check the direction of the gap: a rate below your industry band is more often under-reporting than excellence, and under-reporting hides exactly the regrettable departures you need to find.',
        },
        {
          step: 2,
          label: 'Every leaver classified regrettable or non-regrettable',
          gate:
            'Every leaver in the trailing 12 months has a written classification with the performance review and the manager as the evidence, the regrettable attrition rate = regrettable leavers divided by average headcount comes in under 5%, and no single manager accounts for more than 40% of the regrettable leavers.',
          blockIf:
            'Without a per-leaver classification the headline rate cannot be split into the part you can avoid and the part that is the cost of hiring well, and a retention programme aimed at the wrong one will spend money without moving the number. The concentration check matters for a different reason: if one manager accounts for most of the regrettable leavers, then the problem is a manager and a compensation band rather than a company-wide benefits gap, and a company-wide retention spend will not find it.',
        },
        {
          step: 3,
          label: 'Replacement cost computed for each leaver cohort',
          gate:
            'Each leaver cohort has a cost computed from annual salary, recruiting channel, ramp weeks and lost-productivity months, with the 1.5x multiplier applied to managers, and every cohort lands in a named band: at or below 50%, 50-100%, 100-200%, or above 200% of annual salary.',
          blockIf:
            'A single company-wide percentage applied to every cohort is the most common way this number goes wrong, and it goes wrong in the expensive direction: senior and manager cohorts carry the largest absolute cost and are the ones you most need to know. If the cohorts have not been separated, then the retention budget you set next will be sized off a midpoint that no individual departure actually costs, and the roles that matter will be under-funded.',
        },
        {
          step: 4,
          label: 'Annual turnover cost and the retention budget ceiling',
          gate:
            'Annual turnover cost is computed as average cost per leaver multiplied by annual leaver count multiplied by the regrettable share, the retention budget is set between 20% and 30% of it, and actual retention spend to date is within 5% of that ceiling.',
          blockIf:
            'If the budget is a percentage without the annual number underneath it, then there is no way to tell whether you are over-spending or under-spending, because the denominator moves with the rate you are trying to fix. And if the spend is tracked only annually, the moment you most need to intervene — a manager resigning in month two — arrives with no information about what has already been spent. Set the ceiling on the annual figure and track it monthly against it.',
        },
        {
          step: 5,
          label: 'Monthly flight-risk scoring with a dated save play',
          gate:
            'All 4 indicators are scored for every employee each month, the bottom decile of each indicator receives a named save play within 30 days, at least 30% of the people flagged are still there 2 quarters later, and the save rate is recorded per indicator rather than in aggregate.',
          blockIf:
            'Scoring the indicators but not acting on them produces a dashboard that looks like a programme: the bottom decile of an engagement drop is often a reorganisation rather than an intent to leave, and paying money against it spends the budget on loyalty you did not need while the resignation you were trying to prevent happens quietly. Recording the save rate per indicator is what tells you which of the 4 signals is worth keeping, and you cannot find that out from an aggregate.',
        },
        {
          step: 6,
          label: 'Four quarterly targets with current values on the dashboard',
          gate:
            'Regrettable attrition under 5%, replacement cost at or below 100% of salary for ICs and 150% for managers, retention return at or above 3x, and a flight-risk save rate at or above 30% are each shown with their current measured value and a named owner, recomputed monthly from the trailing 12-month data.',
          blockIf:
            'Four targets without current values are a list of intentions, and the quarterly review then becomes a conversation about sentiment instead of a decision. The monthly recomputation matters more than it sounds: engagement scores lead attrition by one to two quarters, so a target that is only read at the end of the quarter tells you about a problem that started while you were still able to act on it. Put the measured value next to each target and name who owns the movement.',
        },
      ],
    },
    zh: {
      intro:
        '先分遗憾性，再谈预算。这份清单的第一行就是把两种数拆开：主动与被动分开计，而且被动那部分要对着你的招聘漏斗去看，而不是对着留任目标看 —— 一个把 30% 的人直接辞退的公司，问题是招聘；一个主动流失 30% 的公司，问题完全在别处。第二行是遗憾性分类，它按结果判，不按离职面谈里那句写好的理由判，所以每一条判定都要写下让它成立的证据，并且把证据留下。第三行是单人成本的拆解，而这几条带子之所以要写死，是因为它们是底线不是均值：招聘成本落在 5-15%、爬坡成本落在 30-50%、产能损失落在 50-150%，经理离职还要再乘自己的倍数。第四行是年化数，因为留任预算是对着它量的；第五行把留任预算按年度流动成本的 20-30% 压住。第六、七行存在的原因很直接：等人递了辞呈才开始做的留任，是滞后动作 —— 飞险群体按月从那几个前瞻指标里找出来，并且每个人配一个具体动作，而不是发一份问卷。',
      items: [
        {
          step: 1,
          label: '滚动 12 个月的离职数据已与工资表对账',
          gate:
            '滚动 12 个月的主动与被动离职已按岗位、团队和经理拆开，两份名单与工资表记录的人数变动对账差异在 2% 以内，并且标题主动流失率被写在对应你行业的 JOLTS 区间旁边。',
          blockIf:
            '如果离职名单与工资表人数对不上，那你接下来要乘到所有东西上的那个流失率，方向不明地错了，下游每个数字都继承这个错。最常见的原因是两套系统里离职编码不同，以及期末那一周刚走的人——两个原因一旦知道都很容易修。另外要看清楚差额的方向：低于行业区间的流失率更可能是漏报而不是优秀，而漏报藏起来的恰恰是你要找的遗憾性离职。',
        },
        {
          step: 2,
          label: '每个离职者都已分类为遗憾性或非遗憾性并留下证据',
          gate:
            '滚动 12 个月内的每个离职者都有书面分类，证据是绩效评估与经理判断；遗憾性流失率（遗憾性离职人数 ÷ 平均在册人数）低于 5%；并且没有任何一个经理贡献了超过 40% 的遗憾性离职。',
          blockIf:
            '没有逐人分类，标题流失率就拆不成「你可以避免的部分」和「招好人本来就要付的成本」，于是瞄准错的那一半的留任项目会花钱却不移动数字。集中度检查为的是另一件事：如果一个经理贡献了大部分遗憾性离职，那么问题出在这个经理和对应的薪酬带宽上，而不是全公司福利缺口——而全公司的留任支出根本找不到它。',
        },
        {
          step: 3,
          label: '每个离职群体的单人换人成本都已按群体分别算出',
          gate:
            '每个离职群体都从年薪、招聘渠道、爬坡周数和生产力损失月数算出了成本，经理按 1.5 倍数计入，并且每个群体都落在一个写明名字的区间里：年薪的 50% 以内、50-100%、100-200%，或者高于 200%。',
          blockIf:
            '对所有群体用同一个公司百分比，是这个数字最常出错的方式，而且错在贵的方向：高级岗和经理岗的绝对成本最大，也正是你最需要知道的那几个。如果群体没拆开，你接下来设的留任预算就是按一个「没有任何一次真实离职正好等于它」的中位数定的，而真正要紧的岗位会缺钱。',
        },
        {
          step: 4,
          label: '年度流失成本与留任预算上限都已写下并可核对',
          gate:
            '年度流失成本按「单人平均成本 × 年度离职人数 × 遗憾性占比」算出，留任预算设在它的 20%-30% 之间，并且到今天为止的实际留任支出在这个上限的 5% 以内。',
          blockIf:
            '如果预算只是一个百分比而底下没有年度数字，你就无法判断自己超支还是不够，因为分母随着你正要修的那个流失率在动。而如果支出只按年追踪，你最需要介入的那一刻——一个经理在第二个月离职——到来时你没有任何关于「已经花了多少」的信息。先用年度数字定上限，再按月对着它记。',
        },
        {
          step: 5,
          label: '每月给全员打飞险分，每个挽回动作都带日期与责任人',
          gate:
            '4 个指标每月给每个人打分，每个指标底部十分位的人在 30 天内拿到一个有名字的挽回动作，被标出的人里至少 30% 在两个季度后仍然在职，并且挽回率是按指标分别记录、而不是只记一个总数。',
          blockIf:
            '打了分却不行动，会得到一个看起来像项目的看板：敬业度下滑的底部十分位往往是一次重组而不是离职意图，照着它付钱，是花钱买了你并不需要的忠诚，而你本来想拦下的离职会安静地发生。把挽回率按指标分开记，才知道这 4 个信号里哪一个值得留下——这个结论没法从总数里读出来。',
        },
        {
          step: 6,
          label: '四个季度目标在看板上都带当前测得值与责任人',
          gate:
            '遗憾性流失率低于 5%、IC 的换人成本不高于年薪 100% 而经理不高于 150%、留任回报不低于 3 倍、飞险挽回率不低于 30%——这四条各自显示当前测得的值和一个责任人，并按滚动 12 个月的数据每月重算。',
          blockIf:
            '四个没有当前值的目标是一张意图清单，季度复核于是变成一场关于氛围的谈话，而不是一个决定。每月重算比听起来更重要：敬业度分数领先流失一到两个季度，只在季度末读一次的目标，讲的其实是一个你本来还来得及处理、但那时已经来不及了的问题。把测得的值写到每条目标旁边，并写明谁负责让它动。',
        },
      ],
    },
  },
};


