// P166 —— P 类（Product Analytics）主题「stickiness-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个粘性指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类 ⇒ 不写市场单价、不写 live token）：
//   · DAU 与 MAU 一律是「去重用户」，不许用会话数代替分子或分母
//   · 整体比与所有分段切分必须落在同一个 30 天窗口上，跨窗口比较一律无效
//   · 留存曲线按获取队列逐条画，不许把多个队列混成一条平均线
//   · 休眠口径固定为「最近 30 天内活跃、最近 7 天内未活跃」的月度活跃用户
//   · 扩展收入与流失金额一律 USD/月，并写明是月度口径还是滚动口径
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Frequency is the easy half of stickiness, and it is usually the half that gets quoted. The harder half is why a user with more sessions still leaves: the headline DAU/MAU reads fine while one paid channel sits at a third of it, a recent cohort decays faster every month, the notifications you send land on nobody, and the surface that actually carries the engagement was never measured at all. The sequence below starts where the sequence of most teams starts, in the wrong place. Begin with the definition of the headline ratio, because every percentage on the table is computed on it and two products behaving identically can report ratios several points apart purely through how they count. Segment dispersion comes after that, because an aggregate hides whether you have a structural engagement problem or one bad cohort. Then the decay curve, which names the day you are actually losing people, then trigger coverage on the core workflow, then the concentration of DAU across product surfaces, and the win-back number ends the list, being the only row that depends on all the others and the only one that can cost you subscribers. Every ratio here is unique users over a 30-day window, every retention curve is drawn per acquisition cohort, and every money figure on this table is USD per month.',
      rows: [
        {
          priority: 1,
          metric: 'Headline ratio integrity — unique-user DAU divided by unique-user MAU, both drawn from the identical 30-day window',
          fixFirst:
            'The definition row has to come first because every other row on this table is a number computed on top of it, and the two common ways of counting disagree by several points on the same product. Averaging daily DAU across the month and dividing by a rolling 30-day unique MAU produces a different figure from dividing a single day DAU by that MAU, and a third figure appears when MAU is taken as the union of 30 daily sets rather than as one rolling count. Pick one, write it in a sentence, and never change it mid-quarter, because a mid-quarter redefinition produces a step in your chart that looks like a product improvement and is pure arithmetic. Both sides have to be unique users: a denominator that counts sessions drifts as usage deepens, and a ratio that falls without anyone behaving differently will send you optimising the wrong thing.',
          alsoMoves:
            'A written definition is what lets you compare yourself with a category benchmark, because benchmarks are quoted under a specific counting convention and a mismatch of a few points is the difference between a healthy product and a structural problem. It also makes the cohort cut in the guide meaningful, since a segment with a 30-day tenure window is only comparable to the headline if the headline uses the same 30 days. And it is the precondition for the win-back row: recovering dormant users moves the numerator, and if you cannot reproduce the numerator you cannot tell a real recovery from a counting change.',
          backfire:
            'The definition backfires when it is changed to make a number look better. Re-basing MAU to exclude internal and test accounts raises the ratio with no change in user behaviour, and freezing the denominator while the numerator keeps growing produces a headline that improves weekly for reasons no product change explains. The other trap is switching units on one side only, where DAU counts unique users and MAU counts sessions: the ratio then falls as people use the product more, and a team that reacts to that will optimise for churn of usage instead of churn of users. Record the tool, the query and the pull date next to every headline number you publish.',
        },
        {
          priority: 2,
          metric: 'Segment dispersion — the best segment DAU/MAU divided by the worst segment DAU/MAU across acquisition cohort, channel, plan tier and tenure',
          fixFirst:
            'Dispersion comes second because it is the row that decides what kind of problem you have, and the headline ratio cannot tell you. The guide notes that the segments reveal five to ten times the variation the aggregate hides, and that gap is the whole triage: if every segment sits between 8 and 12 percent you have a structural engagement problem and no acquisition mix will fix it, while a paid channel at 4 percent against referral at 18 percent is a channel-quality problem that a retention programme will not touch. Compute the ratio per segment on the same 30-day window, write the segment definition next to it, and start from the worst segment that also has enough users to measure.',
          alsoMoves:
            'The dispersion ratio tells you which segment to fix and therefore which lever is available. A weak segment inside an otherwise healthy product usually means the segment is being counted wrong: trial accounts that never had a chance to habituate, or a plan tier whose usage is inherently weekly, will always look worse than a tier that opens the product daily. It also sizes the prize. If the worst segment is a third of your paid base, closing half the gap is a larger change to your headline than any trigger work on the whole base. And when you later run the win-back experiment, dispersion tells you whether a recovered cohort is a genuine improvement or one noisy segment moving.',
          backfire:
            'Dispersion backfires when a segment is too small to read. A cohort of 40 users in a product with 20,000 monthly actives produces a ratio that swings from 3 percent to 25 percent on a handful of accounts, and acting on it means rebuilding onboarding for three customers. It also backfires when the tenure windows overlap the cohort cut in a way that double-counts: a user who signed up in the 91-to-365-day band also appears in an acquisition-month cohort, so the same weakness is counted twice and the spread looks wider than it is. Require at least 500 active users in a segment before you name it a problem, and write that threshold next to the table.',
        },
        {
          priority: 3,
          metric: 'Cohort decay point and floor — the D30 retention level of a signup cohort and the day on which the curve falls hardest (users still active on day N ÷ users in the signup cohort)',
          fixFirst:
            'The curve comes third because it locates the leak, and every row after this one is a response to a specific point on that curve rather than to the product as a whole. Plot it by acquisition cohort over 6 to 12 months, then name two things on the chart: the decay point, which is the day the curve falls hardest, and the floor, which is where it settles after 90 to 180 days. The floor is the number that predicts next year, and the decay point is the number that tells you which day your trigger work has to land on. If the floor sits below 8 percent at day 30 you have a structural problem that no acquisition volume will fix, and that is a product decision rather than a growth decision.',
          alsoMoves:
            'The decay point turns the trigger audit from a checklist into a plan. The habit loop in the guide needs a trigger at the right moment, and the right moment is a number you now hold: a curve that falls hardest between day 3 and day 7 needs a trigger inside that window, while one that falls hardest after day 30 needs a re-engagement touch instead. It also tells you whether the problem is structural or acquisition-specific, because a cohort drawn from a bad month decays faster than its neighbours while a healthy cohort decays like every other, and the fix for the first one sits upstream of your product. And it gives the trigger work a baseline to be measured against.',
          backfire:
            'The curve backfires when the cohorts are not comparable. A week in which you changed the signup flow, ran a pricing experiment, or altered a tracking rule makes that cohort structurally different, and mixing it into the average moves the decay point for reasons that have nothing to do with engagement. It also backfires when you plot one blended average across cohorts instead of separate lines, because blending hides the cohort-specific decay that was the entire reason to plot by month. And a floor measured at day 30 for a product whose natural cycle is quarterly is a floor that keeps falling on its own, so the benchmark you compare against has to come from a product with the same cycle.',
        },
        {
          priority: 4,
          metric: 'Trigger coverage of the core workflow — core-workflow events with a trigger whose action-and-reward loop is intact (events covered ÷ core-workflow events mapped)',
          fixFirst:
            'Trigger coverage is fourth because it is the cheapest lift on this table, and it is gated by the three rows above: you cannot place a trigger before you know where the decay point is, and you should not build one for a surface that does not carry the engagement. Map the core workflow event by event, and for each one record whether a trigger exists, whether the action it asks for is low-friction, and whether the reward is repeatable rather than a one-off. A trigger that fires but points at an action requiring setup is a notification, not a habit. The five to fifteen point lift the guide describes is real, but only for the events where all three parts of the loop hold.',
          alsoMoves:
            'Trigger coverage decides whether the headline ratio can move at all, because a user with no reason to return is a monthly-active user by definition. It also tells you the order in which to spend: cover the workflow events that sit before the decay point first, and treat everything after that point as re-engagement rather than habit. And it sets the ceiling on the win-back row, because a dormant user brought back by a message with no trigger behind it returns once and then goes dormant again, which shows up as a recovery rate that falls every month you run the sequence.',
          backfire:
            'Trigger coverage backfires when you count a trigger that nobody receives. A push notification on a device where the user has denied notifications, or an email to an address that bounced, is an event in your code and a non-event in the user life, so the coverage map says the loop is closed while the lift is zero. The second failure is a trigger that fires more often than the reward is worth: frequency rises, the loop holds for a few weeks, and then the opt-out rate climbs past the point where the remaining triggers stop arriving, so a coverage map that improved this month lowers next month ratio. Measure delivery and opt-out rate for every trigger next to coverage.',
        },
        {
          priority: 5,
          metric: 'Pareto concentration across product surfaces — share of DAU attributable to the single core workflow that carries the most (DAU from that surface ÷ total DAU)',
          fixFirst:
            'Concentration comes fifth because it decides where a lift lands, and it is the check on whether the trigger work in the previous row was aimed at the right surface. The guide states the expectation plainly: one core workflow drives 60 to 80 percent of DAU. Attribute DAU to surfaces, covering the core workflow, notifications and content, and write the top share as a percentage. If the top surface carries far less than 60 percent, you have several middling habits rather than one strong one, and a trigger programme spread across all of them moves the headline less than a programme concentrated on the strongest. If one surface carries more than 80 percent, the product has a single point of engagement and the diversification risk is real.',
          alsoMoves:
            'Concentration tells you the ceiling of your trigger programme, since surfaces that carry little DAU cannot carry much of the headline improvement. It also decides the retirement order from the opposite direction: a surface with a small DAU share is cheap to keep and expensive to ignore only if it is where new users land, so measure it separately for new cohorts rather than for the whole base. And it changes what a win-back campaign should point at, because a dormant user is far likelier to return for the surface that carries 70 percent of DAU than for one that carries 3 percent, so the message and the destination follow the concentration.',
          backfire:
            'Concentration backfires when attribution is generous to the surface you are working on. Counting a session as belonging to the core workflow because the user opened it for two minutes, and then also counting it for notifications and for content, produces shares that sum to more than 100 percent and a top share that looks safely healthy. It also backfires when you attribute at session level instead of user level: the top workflow is often the one a user touches briefly before doing something else, so a session-based share rewards shallow interaction and the programme ends up optimising the surface users pass through rather than the one they depend on. Attribute each active user to the surface where the primary job happens.',
        },
        {
          priority: 6,
          metric: 'Dormant recovery rate — dormant monthly actives returned to daily actives within 7 days (dormant users reactivated ÷ dormant users targeted)',
          fixFirst:
            'The win-back number goes last because it is the only row that depends on every row above it and the only one that can cost you subscribers. The dormant base is defined as people active in the trailing 30 days and inactive in the latest 7, so a message to them goes to people who are not yet gone, and the three-touch sequence in the guide on days 3, 7 and 14 is paced to match that definition. Measure the recovery over 7 days rather than across the whole campaign, and report it as a percentage of the dormant base you actually targeted. A 5 percent target is meaningful on a base of a few thousand users and meaningless on a base of forty thousand, so always write the base next to the rate.',
          alsoMoves:
            'The recovery rate is the readout on the trigger work, because a win-back message is one more trigger and it inherits the same delivery and opt-out risks. It also moves the headline ratio twice: the recovered user joins the DAU numerator, and if the trigger behind them holds they also stop being dormant next month, which is what keeps the base from compounding upward. And it is where a win-back campaign shows its own cost, since a sequence that recovers 3 percent of a large dormant base on a product already near the notification fatigue limit can lift the ratio for one month and lose more subscribers than it recovered in the next.',
          backfire:
            'The win-back sequence has two separate ways to backfire. Targeting a dormant base that includes users who never activated properly sends reminders about features they have never used, which reads as noise and converts into unsubscribes rather than returns. And pacing the three touches too close, or repeating the same message three times, drives the monthly unsubscribe rate above 10 percent, which removes those users from every future trigger including the ones that were working, so the headline ratio falls over the following two months even though the campaign reported a win. Keep a holdout of about 10 percent of the dormant base un-contacted, or you have no way to tell recovery from a seasonal uptick.',
        },
      ],
    },
    zh: {
      intro:
        '频次是粘性里容易的那一半，而被引用的通常也正是这一半。难的那一半是：一个用得更多的人为什么还是会走——整体 DAU/MAU 看着没问题，但某个付费渠道只有它的三分之一，某一批新队列每个月都在加速衰减，你发的通知没有落到任何人身上，而真正承载参与的那个界面从来没被量过。下面的次序从大多数团队下手的地方开始，也就是从错的地方开始。先定整体比的定义，因为这份表上的百分比都建立在它之上，而两个行为完全一样的产品只因计数方式不同就能报出相差好几个点的比值。各分段之间的差距紧接着登场，因为整体数字会盖住你面对的到底是结构性参与问题还是一批坏队列。接着是队列衰减曲线，它点名你究竟在哪一天丢人；然后是核心工作流上的触发覆盖率；然后是 DAU 在各产品面上的集中度；最后收在召回数字上——全表只有它依赖上面所有行，也只有它可能让你付出订阅者代价。表里的比值一律按去重用户口径、30 天窗口来算，每个留存曲线按获取队列分别画，钱上的数字一律写成 USD/月。',
      rows: [
        {
          priority: 1,
          metric: '整体比的口径完整性 —— 去重用户 DAU ÷ 去重用户 MAU，分子分母取自同一个 30 天窗口',
          fixFirst:
            '定义这一行必须最先定下来，因为这张表上其它每一行都是建立在它之上的数字，而两种常见计数方式在同一个产品上就能差出好几个点。把整月的每日 DAU 取平均再除以滚动 30 天的去重 MAU，和用某一天的 DAU 除以这个 MAU，得到的不是同一个数；如果 MAU 取的是 30 天每日集合的并集而不是一个滚动计数，又会冒出第三个数。挑一种，用一句话写下来，并且一个季度里不要改——季度中途改定义，会在你的图上造出一个看起来像产品变好的台阶，而那纯粹是算术。两边都必须是去重用户：分母去数会话，会随着使用变深而漂移，一个在没有任何人行为改变的情况下自己往下走的比值，会把你引去优化错的东西。',
          alsoMoves:
            '一句写下来的定义，是你敢拿自己和品类基准对比的前提，因为基准都是在某一种特定计数约定下引用的，差几个点就是「健康产品」和「结构性问题」的分界。它也让指南里的队列切分真正有意义：一个任期 30 天窗口的分段，只有在整体比用同样这 30 天时才可比。它同时是召回那一行的前提：召回休眠用户动的是分子，如果你复算不出分子，就分不清一次真实召回和一次口径变化。',
          backfire:
            '定义的反噬，是把它改成一个看起来更好看的数。把 MAU 的口径改成剔除内部账号和测试账号，比值会在用户行为毫无变化的情况下上升；把分母冻住、而分子继续涨，头条数字就会每周改善一次，而那背后没有任何产品改动。另一个坑是只在一侧换单位——DAU 数去重用户、MAU 数会话——于是人们用得越多比值越低，团队若照着它反应，就会去优化「用得少」而不是「留得久」。每对外发布一个头条数字，就在旁边记下工具、查询语句和拉取日期。',
        },
        {
          priority: 2,
          metric: '分段离散度 —— 最好分段 DAU/MAU ÷ 最差分段 DAU/MAU（跨获取队列、渠道、套餐等级、任期四个切分）',
          fixFirst:
            '离散度之所以排第二，是因为它决定你面对的是哪一类问题，而整体比告诉不了你。指南提到分段会揭示 5 到 10 倍的、整体层看不见的变化，而这个差距就是整个分诊：如果所有分段都落在 8% 到 12% 之间，你面对的是结构性参与问题，换任何获客组合都救不了；而付费渠道 4%、转介绍 18%，那是渠道质量问题，留存项目根本碰不到它。在同一个 30 天窗口上按分段算这个比值，把分段定义写在旁边，然后从「最差且样本够大」的那个分段开始。',
          alsoMoves:
            '离散度告诉你该修哪个分段，也就告诉了你手上有哪根杠杆。一个整体健康的产品里出现弱分段，通常意味着这个分段被数错了：从来没机会形成习惯的试用账号、或者使用天然是周频的套餐等级，看上去永远比不上每天打开产品的那一档。它还决定了这笔赌注多大：如果最差分段占你付费基数的三分之一，把差距补掉一半，对头条比值的改变就大于在全基座上做任何触发工作。最后，当你后来跑召回实验时，离散度能告诉你被召回来的那一批是真的改善了，还是某个噪声分段在动。',
          backfire:
            '离散度会在分段小到读不出来时反噬。一个 2 万月活的产品里只有 40 人的队列，比值会在几个账号上就从 3% 摆到 25%，照着它行动等于为三个客户重做入职流程。另一个反噬是任期窗口与队列切分重叠而重复计数：一个在 91-365 天区间注册的用户，同时也出现在某个月份的获取队列里，同一处弱点被数了两遍，离散度看起来比实际更宽。低于 500 名活跃用户的分段不许判定为问题，并把这条门槛写在表格旁边。',
        },
        {
          priority: 3,
          metric: '队列衰减点与底 —— 某个注册队列的 D30 留存水平，以及曲线跌幅最大的一天（第 N 天仍活跃的用户数 ÷ 该注册队列用户数）',
          fixFirst:
            '衰减曲线要放在第三位，因为它定位漏点，后面每一行都是对曲线上某个具体位置的回应，而不是对整个产品的回应。按获取队列画过去 6 到 12 个月的曲线，然后在图上点名两件事：衰减点，也就是跌幅最大的那一天；以及底，也就是 90 到 180 天之后它稳定在哪儿。底是预测下一年的那个数，衰减点是告诉你触发工作必须落在哪一天的那个数。如果第 30 天的底低于 8%，你面对的是任何获客量都救不了的结构性问题，那是一个产品决策而不是增长决策。',
          alsoMoves:
            '衰减点把触发审计从清单变成计划。指南里的习惯循环需要在正确的时刻有触发，而正确的时刻现在是一个数字：跌得最狠在第 3 到 7 天之间的曲线，需要的是落在这个窗口里的触发；跌得最狠在第 30 天之后的，需要的则是再互动的触达。它还告诉你问题到底是结构性的还是获客质量带来的，因为一个来自糟糕月份的队列会比邻居衰减得更快，而健康的队列跟其它队列衰减得一样，前者的修法在你的产品上游。它同时给触发工作提供了可以对照的基线。',
          backfire:
            '曲线会在队列之间不可比时反噬。某一周你改了注册流程、跑了定价实验或动了追踪规则，这一批队列就结构性不同了，把它混进平均会让衰减点为与参与无关的原因移动。画一条跨队列的混合平均线也会反噬，因为混合正好抹掉了你按月份画图要找的那种队列特异衰减。另外，对一个自然周期是季度的产品，在第 30 天测出来的底本身还会继续往下走，所以拿来对照的基准必须来自使用周期相同的产品。',
        },
        {
          priority: 4,
          metric: '核心工作流的触发覆盖率 —— 带有完整「行动-奖励」循环的触发的核心工作流事件占比（已覆盖事件数 ÷ 已盘点核心工作流事件数）',
          fixFirst:
            '触发覆盖率之所以排在第四位，是因为它是这张表上最便宜的提升，而且它被上面三行卡着：在知道衰减点落在哪儿之前你没法摆触发，在承载参与的那个界面之外你也不该建触发。逐个事件盘点核心工作流，对每一个记下三件事：有没有触发、它要求的动作是否足够低摩擦、奖励是不是可重复而不是一次性。会触发、但指向一个需要配置的动作，那只是一条通知，不是一个习惯。指南所说的 5 到 15 个点的提升是真的，但它只对三个环节全部成立的那些事件有效。',
          alsoMoves:
            '触发覆盖率决定了头条比值有没有可能动，因为一个没有理由回来的用户，按定义就是个月度活跃用户。它还告诉你花钱的顺序：先把衰减点之前的那些工作流事件覆盖掉，衰减点之后的按再互动而不是按习惯来处理。它同时给召回那一行设了天花板——一个被消息唤醒、背后却没有触发的休眠用户，只会回来一次然后再次休眠，于是你每多跑一轮序列，召回率就往下掉一截。',
          backfire:
            '触发覆盖率会在你数了一个没人收到的触发时反噬。用户在设备上关掉了通知，那条推送就是代码里的一个事件、用户生活里的一个非事件，于是覆盖图显示循环已经闭合，而提升是零。第二个失败是触发频率超过了奖励本身的价值：频率上升，循环撑过几周，然后关闭率涨到剩下的触发也送不到的程度，于是这个月变好的覆盖图会在下个月拉低比值。给每一个触发同时量送达率与关闭率，和覆盖率放在一起看。',
        },
        {
          priority: 5,
          metric: '各产品面的帕累托集中度 —— 承载最多的那个核心工作流所贡献的 DAU 占比（该界面的 DAU ÷ 总 DAU）',
          fixFirst:
            '集中度该排在第五位，因为它决定一波提升落在哪里，也是对上一行触发工作有没有瞄准对界面的一次检验。指南把预期说得很直白：一个核心工作流驱动 60% 到 80% 的 DAU。把 DAU 归到各个产品面——核心工作流、通知、内容——把最大的那个占比写成百分比。如果头部界面远不到 60%，你手上是几个中等强度的习惯而不是一个强习惯，把触发项目摊到全部界面上，头条比值的改变会小于把项目压在最强的那一个上；如果某一个界面超过 80%，这个产品就只剩一个参与支点，分散风险是实打实的。',
          alsoMoves:
            '集中度告诉你触发项目的天花板，因为承载不了多少 DAU 的界面也承载不了多少头条改善。它还从相反方向决定退役顺序：DAU 占比小的界面留着很便宜，只有当它是新用户落地的地方时，忽略它才昂贵，所以要单独按新队列量它，而不是拿全基座看。它也改变召回该往哪儿发——一个休眠用户回到承载 70% DAU 的界面的可能性，远高于回到一个只占 3% 的界面，于是消息和落地页都要跟着集中度走。',
          backfire:
            '集中度会在归因偏袒你正在做的那个界面时反噬。因为用户打开了两分钟就计成核心工作流的会话、然后又同时计给通知和内容，占比加起来超过 100%，而头部占比看着还很健康。用会话而不是用用户归因也会反噬：头部工作流常常是用户在干别的事之前顺手碰一下的那个，所以会话口径的占比奖励浅层交互，项目最后优化的是用户路过的界面，而不是他们依赖的那个。把每个活跃用户归到主任务发生的那一个界面上。',
        },
        {
          priority: 6,
          metric: '休眠召回率 —— 7 天内回到日活的休眠月度活跃用户（被唤回并回到日活的休眠用户数 ÷ 被触达的休眠用户数）',
          fixFirst:
            '召回数字放到最后，因为它是唯一一行依赖上面所有行的，也是唯一一行可能让你付出订阅者代价的。休眠口径是最近 30 天内活跃、最近 7 天内没活跃的月度活跃用户，所以给他们发消息，消息发给的还是没走掉的人；指南里第 3、7、14 天三触点的节奏就是按这个口径排的。召回要在 7 天窗口里量，而不是横跨整场活动，并且写成「实际触达的休眠基数」的一个百分比。5% 的目标在几千人的基数上有意义，在四万人的基数上毫无意义，所以永远要把基数写在旁边。',
          alsoMoves:
            '召回率是触发工作的读数，因为召回消息本身就是又一个触发，继承同样的送达与关闭风险。它还会两次推动头条比值：被召回的用户进了 DAU 的分子，而如果他背后的触发还在，他下个月就不再是休眠用户了，这才是让休眠基数不再累积的那一部分。而且召回战役的代价在这里显形：在通知疲劳已经逼近上限的产品上，一个从庞大的休眠基里召回 3% 的序列，可能把比价抬高一个月，下个月流失的订阅者比召回的多。',
          backfire:
            '召回序列有两条各自独立的反噬路径。如果休眠基里混进了从未真正激活过的用户，你就等于在提醒他们那些从没用过的功能，这读起来像噪音，转化是退订而不是回来。而三个触点排得太密、或者同一条消息重复三次，会把月度退订率推过 10%，于是这些人被从之后所有触发里摘掉，包括那些本来有效的，于是头条比值在接下来两个月往下走，哪怕战役报告上是赢的。留出约 10% 的休眠基数作为不触达的对照组，否则你分不清召回和季节性回暖。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Stickiness projects fail quietly, because each step still produces a plausible output after its input was wrong: a headline ratio computed on two windows is still a ratio, and a win-back campaign with no holdout still reports a recovery figure. The six checks below are therefore written to expose inputs rather than outputs — whether the two sides of the headline ratio came from one query on one day, whether every segment held enough accounts to mean anything, whether the retention curves were drawn per cohort instead of blended, whether a trigger actually reached the user, whether DAU attribution sums to a hundred percent, and whether the dormant base had a group nobody contacted. The sequence matters for a practical reason: the first three produce the evidence the last three act on, and skipping one does not just delay the work, it makes the later figures unreadable.',
      items: [
        {
          step: 1,
          label: 'Headline DAU/MAU computed on one window in one unit',
          gate: 'Trailing-30-day unique-user DAU and unique-user MAU pulled on the same day from the same query, the ratio recomputed for the previous 30 days the same way, and both ratios plus the written definition kept together.',
          blockIf:
            'If the numerator averages daily DAU while the denominator is a rolling union of 30 daily sets, the headline drifts by several points without anyone changing behaviour, and every comparison against a category benchmark in Step 2 is made against the wrong number. If the two sides use different units, the ratio falls as usage deepens and you end up optimising for the wrong thing.',
        },
        {
          step: 2,
          label: 'Segment cuts computed on the same base above a minimum size',
          gate: 'At least 4 cuts (acquisition cohort, channel, plan tier, tenure) computed on the identical 30-day window, every reported segment holding at least 500 active users, and the best-to-worst spread written as a multiple.',
          blockIf:
            'A segment of 40 users produces a ratio that swings from 3 percent to 25 percent on a handful of accounts, and acting on it means rebuilding onboarding for three customers. If the cuts are computed on different windows, or if tenure bands overlap the cohort cut, the same weakness is counted twice and the spread looks wider than it is.',
        },
        {
          step: 3,
          label: 'Retention curve plotted with a named decay point and floor',
          gate: 'Cohort curves for the trailing 6 to 12 months drawn as separate lines for at least 3 acquisition cohorts, each with a named decay day and a floor value at day 90 or 180, compared against a benchmark with the same usage cycle.',
          blockIf:
            'Without a named decay point, the trigger audit in Step 3 stays a checklist instead of a plan, and the triggers land in the wrong week. If the cohorts are blended into a single average, the cohort-specific decay you were looking for is averaged away, and if a cohort spans a signup-flow change it is not comparable and drags the floor for the wrong reason.',
        },
        {
          step: 4,
          label: 'Core workflow mapped to trigger, action and reward with delivery checked',
          gate: 'At least 4 core-workflow events each mapped to a named trigger, a low-friction action and a repeatable reward, with the 30-day delivery count, the opt-out rate and the resulting repeat-action rate recorded for every trigger.',
          blockIf:
            'A trigger on a device where notifications are denied, or an email to a bounced address, closes the loop on paper and delivers nothing, so the map says the habit is covered while the lift is zero. Without the opt-out rate next to coverage, a frequency increase that improves this month can push unsubscribes past the limit next month and take the working triggers down with it.',
        },
        {
          step: 5,
          label: 'Product surfaces attributed to DAU with the shares summing to 100 percent',
          gate: 'Every surface with at least 1 percent of DAU attributed at user level, the top share written as a percentage, the shares summing to 100 percent within rounding, and the top surface at 60 percent or more.',
          blockIf:
            'If a session is credited to the core workflow for opening it and also to notifications and content, the shares exceed 100 percent and the top share looks healthy while nothing is really attributable. If the top surface sits far below 60 percent, spreading the optimisation budget across surfaces guarantees a small change and the quarter ends with no surface improved.',
        },
        {
          step: 6,
          label: 'Win-back run with a holdout and a 7-day recovery rate',
          gate: 'A 3-touch sequence on days 3, 7 and 14 of dormancy sent to a dormant base of at least 500 users, a holdout of about 10 percent left un-contacted, and a 7-day recovery rate of at least 3 percent recorded against that holdout.',
          blockIf:
            'Without a holdout you cannot separate a real recovery from a seasonal uptick, and a campaign that looks like a 5 percent win may have been 2 percent of noise. If the dormant base includes users who never activated, the reminders read as noise, unsubscribe rates climb past 10 percent, and the notifications that were working in Step 3 stop arriving.',
        },
      ],
    },
    zh: {
      intro:
        '粘性项目出问题的时候是没声音的：输入错了，每一步仍然会给你一个像模像样的结果——跨两个窗口算出的整体比仍然是个比值，没有对照组的召回战役依然会给出一个召回率。所以这六项检查刻意盯的是输入而不是输出：整体比的两侧是不是来自同一天的同一条查询、每个分段是不是都有足够多的账户可读、留存曲线是不是按队列分别画而不是混成一条、触发有没有送达用户手上、DAU 归因是不是加总到 100%、休眠基数里是不是留了没人联系的一组。次序在这里有个很实际的理由：前三项造出来的证据正是后三项要动手的对象，跳过任何一项不只是拖慢进度，而是让后面的数字读不出来。',
      items: [
        {
          step: 1,
          label: '整体 DAU/MAU 在同一个窗口、同一单位下算出',
          gate: '最近 30 天的去重用户 DAU 与去重用户 MAU 用同一条查询在同一天拉出，同样口径重算前一个 30 天，并把两个比值与写下来的口径定义放在一起。',
          blockIf:
            '如果分子是每日 DAU 的平均值、分母是 30 天每日集合的滚动并集，头条比值会在没有任何人改变行为的情况下漂好几个点，第二步里与品类基准的每一次对比都是在跟错误的数字比。如果两侧单位不一致，比值会随着人们用得更多而下降，你最后优化的是错的那个方向。',
        },
        {
          step: 2,
          label: '分段切分在同一基座上算出且样本量必须先达标',
          gate: '至少 4 个切分（获取队列、渠道、套餐等级、任期）在完全相同的 30 天窗口上算出，每个被报告的分段至少有 500 名活跃用户，最好与最差之间的倍数写成具体数字。',
          blockIf:
            '只有 40 人的分段，比值会在几个账号上就从 3% 摆到 25%，照着它行动等于为三个客户重做入职流程。如果各切分算在不同窗口上，或者任期区间与队列切分互相重叠，同一处弱点会被数两遍，离散度看起来比实际更宽。',
        },
        {
          step: 3,
          label: '留存曲线按获取队列分别画出来并点名衰减点与底',
          gate: '过去 6 到 12 个月的队列曲线按至少 3 个获取队列分别画成独立曲线，每条都写明衰减日与第 90 天或第 180 天的底，并对照一个使用周期相同的品类基准。',
          blockIf:
            '没有点名的衰减点，第三步的触发审计就只是一份清单而不是一个计划，触发会落在错误的那一周。如果把多个队列混成一条平均线，你本来要找的队列特异衰减正好被平均掉；如果某个队列跨过了注册流程的改动，它就不可比，会出于错误的原因把底拖低。',
        },
        {
          step: 4,
          label: '核心工作流映射到触发、行动与奖励并核对送达',
          gate: '至少 4 个核心工作流事件各映射到一个命名触发、一个低摩擦动作与一个可重复奖励，每个触发都记录最近 30 天送达量、关闭率以及由此产生的重复行为率。',
          blockIf:
            '在被关了通知的设备上发的推送，或者发往已退信地址的邮件，在纸面上闭合了循环、在用户生活里什么都没送到，于是覆盖图显示习惯已经养成而提升是零。没有把关闭率与覆盖率放在一起看，这个月靠加频率做好的覆盖图，下个月就可能把退订推过上限，把本来有效的触发一起带走。',
        },
        {
          step: 5,
          label: '各产品面归因到 DAU 且占比加总为 100%',
          gate: '每一个占比至少 1% 的界面都按用户级归因，头部占比写成百分比，各占比在四舍五入误差内加总到 100%，且头部界面占比达到 60% 以上。',
          blockIf:
            '如果一个会话因为被打开过就记给核心工作流、同时又记给通知和内容，占比会超过 100%，头部占比看着很健康，而实际上什么都没有被真正归因。如果头部界面远低于 60%，把优化预算摊到各个界面上注定只换来很小的变化，一个季度结束时没有任何一个界面被改善。',
        },
        {
          step: 6,
          label: '召回战役带着不触达的对照组跑出 7 天召回率',
          gate: '在休眠第 3、7、14 天发 3 个触点，触达基数至少 500 名休眠用户，留出约 10% 不触达作为对照组，并对照该组记录至少 3% 的 7 天召回率。',
          blockIf:
            '没有对照组，你分不清一次真实召回和一次季节性回暖，一个看上去 5% 的胜利可能只是 2% 的噪声。如果休眠基里混着从未激活过的用户，提醒读起来像噪音，退订率会涨过 10%，而第三步里本来就管用的那些通知也就不再送到了。',
        },
      ],
    },
  },
};
