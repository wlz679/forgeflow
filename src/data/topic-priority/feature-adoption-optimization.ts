// P166 —— P 类（Product Analytics）主题「feature-adoption-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个采用指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类 ⇒ 不写市场单价、不写 live token）：
//   · 采用率一律是「最近 90 天内至少用过一次该功能的去重用户数 ÷ 同窗口内活跃去重用户数」
//   · 首次使用时间（TTFU）一律是从队列进入日到首次使用事件之间的自然日，取中位数不取均值
//   · 重复使用率的口径固定为 14 天窗口内「用过 2 次以上 ÷ 至少用过 1 次」
//   · 广度与深度必须同窗口、同基座（活跃用户）测量，不许跨窗口比较
//   · 扩展收入一律 USD/月，并写明是扩展收入口径（不是总营收、不是 ARR）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Adoption and habit are different problems, and the second one decides whether a feature is worth keeping. A feature can reach 40% of accounts and still be used once a month, a habit failure, not a discovery failure, and the fix is a surface in the workflow, not another email. Time to first use is the leading indicator.',
      rows: [
        {
          priority: 1,
          metric: 'Per-feature event coverage — share of shipped features with a dedicated event (features firing their own named event at least once a week ÷ features released in the trailing 90 days)',
          fixFirst:
            'Fix coverage first because every other number in this table is a ratio built on an event you can point at. A feature adopted by 12 percent of users is only meaningful if that 12 percent comes from a named event rather than from a page-view proxy that fires whenever anything renders, and a proxy quietly inflates the low-adoption features, which is exactly the set you are about to decide to surface or retire. Pull the event list for the trailing 90 days and mark each shipped feature against three questions: does it own an event, does that event fire for at least 1 percent of monthly actives, and can you reproduce the count on request? Only features that clear all three can be ranked. The rest go into a separate unmeasured pile and stay out of the quarter plan instead of getting a guessed number.',
          alsoMoves:
            'Coverage sets the denominator for everything downstream. Time-to-first-use is measured from the first firing of that event, so a feature instrumented last month has a time-to-first-use that is artificially short: the clock starts when you started watching. Coverage also decides which rows are worth arguing about. The guide treats 8 percent adoption as a retirement candidate, and 8 percent is only a signal when the event behind it was complete for the whole 90-day window. Once coverage is clean you can start separating features by first-use date, which is what makes the cohort cut in the audit meaningful rather than an artefact of when you added tracking.',
          backfire:
            'The way this fix backfires is by adding events while you are trying to compare features. Instrument a feature in the middle of the window and its adoption rate is measured over a shorter period than its neighbours, which reads as a collapse; rename an event to make a naming convention consistent and the count restarts at zero, so the feature looks like it was never used. Another trap is a single catch-all feature_clicked event with the feature name carried in a property: it always fires, so coverage looks perfect while per-feature counts split into a property value nobody validates, and the ratio you compute inherits whatever default that property carries. Freeze the event set for one full 90-day window before you rank anything, and write the instrumentation date next to every adoption number you quote.',
        },
        {
          priority: 2,
          metric: 'Time-to-first-use — median calendar days from cohort entry to the first recorded use of the feature (first-use event timestamp minus cohort entry date)',
          fixFirst:
            'Fix time-to-first-use second because it is the clock that decides whether the rest of your adoption work can start, and it is the one metric on this table you can move without shipping product behaviour. A user who discovers a feature on day 40 cannot have habituated on it by day 60, so a 30-day time-to-first-use on a feature your newest cohorts find late keeps the repeat-use rate low no matter how good the feature is. Pull the median per signup cohort rather than the mean: a handful of large accounts that onboard late will drag a mean past 40 days while the typical customer found it in three. Write the number next to the adoption rate, and treat the pairing of adoption below 20 percent with time-to-first-use above 30 days as the pair that identifies where this quarter goes.',
          alsoMoves:
            'Time-to-first-use is the input to the discovery work, and shortening it multiplies whatever you do afterwards. A feature found on day 2 gets three or four chances to be repeated inside the first week, while one found on day 30 gets one, so the same nudges produce a different repeat-use rate purely because of the delay. It also decides which cohort you are working with. If time-to-first-use is 45 days for the current signup month and 8 days for the cohort two months back, the problem is that you changed how you onboard rather than that the feature is hard, and no in-product surface will fix it. And it is what makes the 90-day adoption window fair: a feature that takes 40 days to find cannot show a meaningful 90-day adoption rate in a cohort that is only 45 days old.',
          backfire:
            'Time-to-first-use backfires when you shorten it by moving the event rather than the experience. Firing a feature-use event on hover, on render or on a tooltip open collapses the median to zero without a single person using anything, and the adoption rate that follows is then measuring curiosity rather than behaviour. Pushing discovery earlier backfires too: moving an email to day 0 to improve the median raises the unsubscribe and notification opt-out rates, and an opt-out removes that user from every later trigger, so repeat use falls while time-to-first-use looks fixed. And a time-to-first-use measured from feature release instead of cohort entry flatters long-lived features and punishes new ones, because a feature launched a year ago has twelve months of cohorts to average. State the start date you used next to the number.',
        },
        {
          priority: 3,
          metric: 'Repeat-use rate — users who used the feature on 2 or more separate days within 14 days ÷ users who used it at least once in the same window',
          fixFirst:
            'Fix repeat use third, after discovery is fast enough to produce users, because it separates the features you merely exposed from the features people actually kept. The gap between used once and used twice is where habituation dies, and it is invisible in the adoption rate the guide treats as the headline: 30 percent adoption where 25 of those 30 points came back is a very different product from 30 percent adoption where 6 points came back. Compute the ratio per feature per cohort, then split it by whether the second use happened inside 7 days or later, because a second use in week one is a habit forming while a second use in week three is usually a support ticket asking how to do it again.',
          alsoMoves:
            'Repeat use tells you whether the adoption number you are about to grow is durable, and it changes how you read the value cross-reference. A feature carrying 25 percent of expansion revenue with a 5 percent repeat-use rate is a sales-driven feature: the expansion conversation activates it, not the product. The same revenue share with a 40 percent repeat rate means the feature is a genuine habit and belongs in onboarding. It also sets the order between surface work and retirement. A feature that is used once and never again is a candidate for retirement even at 20 percent adoption, while a feature with a low first-use rate and a high repeat rate needs more surface, not a sunset plan.',
          backfire:
            'Repeat use backfires in two directions. If you define the second use as any interaction including a passive one, a weekly digest open or a passive screen refresh counts as the user coming back, the ratio inflates, and the actual habit stays absent. And if you push the second use through prompts that reward the metric rather than the job, nudges fired specifically to trigger a second session, you can manufacture repeat use without repeat value: the metric climbs, users receive more notifications, and the opt-out rate rises, quietly shrinking the active base that every other row on this table is computed against. Verify that the second use is a genuine task event, and check the opt-out rate in the same week.',
        },
        {
          priority: 4,
          metric: 'Low-adoption expansion revenue share — expansion revenue from features under 20 percent adoption ÷ total expansion revenue, in USD per month',
          fixFirst:
            'Fix the value cross-reference fourth because it is the row that tells you where the other rows should be aimed, and it is the only one that needs a number from outside analytics. The guide draws the line with an example: a feature at 8 percent adoption that drives a quarter of expansion-won deals is worth surfacing, while a feature at 8 percent adoption with no expansion signal is a retirement candidate. Those two features look identical in the adoption table and are opposites in the plan. Pull the last 6 months of expansion revenue, attribute it to the feature the deal actually turned on, and write the share in USD per month next to each adoption rate. A feature that carries revenue nobody has found is the cheapest growth you own, and it deserves the discovery budget before any feature already sitting at 30 percent.',
          alsoMoves:
            'This row tells you what the other rows are worth, so it changes their ordering for you. If one under-adopted feature carries most of the expansion revenue, the discovery loop in the guide should be rebuilt around that one feature and the nudges for everything else should wait; if no under-adopted feature carries revenue, your growth problem is not discovery but the value of the features themselves, and spending the quarter on tooltips buys nothing. It also sets the priority of the sunset queue: a feature with revenue behind it is never a pure retirement candidate, even when it is barely used, because the revenue belongs to a workflow you may have to rebuild rather than delete.',
          backfire:
            'The value cross-reference backfires when attribution follows what the deal mentions instead of what the user did. Sales notes list the feature the customer talked about, which is often the one configured during onboarding rather than the one that produced the second seat, so the table credits a feature that was merely present and ignores the one that carried the deal. It also backfires when a single expansion event is attributed to several features at once, so the shares sum to more than 100 percent, every feature looks essential, and the entire point of the cross-reference disappears. Attribute each expansion event to exactly one feature, write the attribution rule next to the table, and re-check the share after the rule changes rather than assuming the ranking survives.',
        },
        {
          priority: 5,
          metric: 'Breadth-to-depth ratio — distinct features used per active user ÷ uses per session per feature, both on the trailing 30-day base',
          fixFirst:
            'Fix the breadth-and-depth ratio fifth because it is the check on whether your discovery surface is working or merely crowding the product. A base with breadth around 5 and depth around 8 uses per session is a base that uses a handful of things properly; a base with breadth of 12 and depth of 1 is exploring, which usually means the surface offers too many options and users pick one and leave. Measure both halves on the same 30-day base and keep the pair on one chart, because either number alone is uninterpretable: a rising breadth number is the expected result of adding entry points, and it is only good news when depth holds. Fix this before you add anything else to the interface, since the cost of a crowded surface is paid in the depth column and in support tickets, not in the adoption column.',
          alsoMoves:
            'The ratio decides how much discovery surface you can still afford. Every new in-product entry point adds to breadth, so a base already at 12 is pushed further from a state where users finish a job, and the right move there is to remove surfaces rather than add them. It also re-frames the time-to-first-use row: in a crowded base, time-to-first-use improves because features are easier to find while depth collapses because each session touches one thing briefly, so the two rows have to be read together at every weekly check. And it is the row that tells you where the attention freed by the sunset queue should go: deepening existing features rather than another discovery campaign.',
          backfire:
            'Breadth and depth backfire as a target when you optimise the ratio instead of the two halves. A team that wants the ratio to look tidy can raise it by nudging users into one more feature per session, which buys breadth and costs depth, and by cutting a feature that only some users use, which raises depth on paper while removing the reason a third of the base upgraded. Breadth also inflates when a single session touches a feature incidentally, through a banner click or an auto-opened panel, so count the features a session deliberately uses rather than the ones the page rendered. Any change to the weekly measurement window makes the ratio jump for reasons that have nothing to do with behaviour, so keep the window fixed while you act.',
        },
        {
          priority: 6,
          metric: 'Sunset-eligible share — features under 5 percent adoption for 6 consecutive calendar months with no roadmap reason to keep ÷ features live in production',
          fixFirst:
            'Fix the sunset queue last, and treat it as the release of attention rather than a growth lever. Everything above it is a bet that a feature can be found and repeated; the sunset decision is the bet that it cannot, and it is the one you only make once the three earlier rows have told you which features are worth the odds. At that point the queue is a list of features you are maintaining, documenting and supporting without ever being adopted, and each one costs engineering attention that the discovery work in the guide needs. Take the features that failed on both adoption and value, write the migration plan, notify the users who used them, archive the docs, and record the creation date on each queue entry so the 6-month clock is auditable.',
          alsoMoves:
            'Retiring features changes the denominator of every adoption percentage you publish afterwards, because the active base on the remaining features shifts as the users of the retired ones leave or stay. It also frees the discovery surface: a retired feature removes an entry point from the command menu and a step from the onboarding checklist, and every surface you remove raises the depth half of the breadth-and-depth pair. And it changes the retirement-versus-surface decision for the next quarter, because a feature that was a surfacing candidate in one review may have zero users left by the next, so that decision has to be re-taken on current numbers rather than inherited from the previous review.',
          backfire:
            'The sunset queue backfires when the 6-month window is measured as low at some point in the last 6 months rather than low in every one of them. A feature that was adopted by 40 percent and now sits at 3 percent passes the second test and fails the first, and retiring it removes a working feature from a cohort that is quietly returning to it. It also backfires when the queue is used to hit a target: the fastest way to shrink the sunset share is to retire one popular feature that happens to sit under the threshold, and you lose the revenue and the adoption base of everything around it. A sunset without a data-migration path and a user notice breaks the promise the guide insists on, so the feature count falls and the support queue rises.',
        },
      ],
    },
    zh: {
      intro:
        '被用上和被养成习惯是两件事，后一件决定这个功能值不值得留。一个功能可以有 40% 的账户用上，却每月只用一次——那是习惯问题，不是发现问题，要改的是工作流里的入口，而不是再发一封邮件。首次使用时间是先行指标，优秀的 PLG 产品核心功能能压在 7 天内。只有广度没有深度，是发现混乱。广度是有多少人用过，深度是每个功能每次会话用几次；两者要配着看，单看一个都会得出相反的结论。退役要等：连续 6 个月采用率低于 5%，且没有 roadmap 理由。',
      rows: [
        {
          priority: 1,
          metric: '按功能的埋点覆盖率 —— 有独立事件的功能占比（每周至少触发一次自有命名事件的功能数 ÷ 最近 90 天上线的功能数）',
          fixFirst:
            '把覆盖率排在第一位，因为这张表上其它每一个数字都是建立在某个你能指出来的事件之上的比值。某功能 12% 的采用率，只有当这 12% 来自一个命名明确的事件、而不是来自「页面一渲染就触发」的代理事件时才有意义；而代理事件恰好会抬高那些低采用功能——那正是你马上要决定「推上桌面还是退役」的一批。拉出最近 90 天的事件清单，给每个已上线功能打三个勾：有没有自己的事件、这个事件有没有覆盖到至少 1% 的月活、以及你要人当场复算时能不能复算出来。只有三项全过的功能才进入排序；其余的单独放进「未测量」堆里，先从本季度的计划里剔出去，而不是猜一个数填上去。',
          alsoMoves:
            '覆盖率决定了下游所有指标的分母。首次使用时间是从该事件首次触发开始算的，所以上个月才补上埋点的功能，时间会被人为地缩短——时钟是从你开始看的那一刻才走的。它还决定这张表上哪些行值得争论：指南把 8% 采用率当作退役候选，而 8% 只有在它背后的事件在整个 90 天窗口里都完整的情况下才构成信号。覆盖率干净之后，你才能开始按首次使用日期给功能分层，而这正是队列切分有意义、而不只是「你什么时候加的追踪」造成假象的前提。',
          backfire:
            '这一项的反噬方式，是在你正要比较功能的时候去改埋点。如果你在窗口中间给某个功能补上事件，它的采用率就只在一个比同类更短的周期里被测量，读起来像一次崩塌；如果你为了命名规范去重命名一个事件，计数从零重新开始，这个功能看起来像从没被用过。还有一个陷阱是留一个 feature_clicked 大杂烩事件、把功能名塞进属性里：它永远会触发，于是覆盖率看起来完美，而每个功能的计数被切进一个没人校验过的属性值里，你算出来的比值继承的正是那个属性带着的默认值。排序任何东西之前，先把事件集合冻结一个完整的 90 天窗口，并且在你引用的每个采用率旁边写上埋点日期。',
        },
        {
          priority: 2,
          metric: '首次使用时间 —— 从队列进入日到首次使用该功能的中位自然日（首次使用事件时间戳减去队列进入日）',
          fixFirst:
            '把首次使用时间排在第二位，因为它是决定后面所有采用工作能不能开跑的那只钟，也是这张表上唯一一个不用改产品行为、就能直接动的指标。一个第 40 天才发现功能的用户，不可能在第 60 天之前对它形成习惯，所以只要新队列的首用时间还在 30 天附近，重复使用率就会一直低，跟功能本身好不好没关系。按注册队列取中位数，不要取均值：少数几个很晚才上手的大客户会把均值拉到 40 天以上，而典型客户第 3 天就找到了。把这个数写在采用率旁边，「采用率低于 20% 且首用时间超过 30 天」这个组合，才是这一季度该投哪儿。',
          alsoMoves:
            '首用时间是发现工作的输入，而把它缩短会让后面做的每一件事都成倍生效。第 2 天就发现功能的人，在第一周里有三四次机会重复使用它；第 30 天才发现的人只有一次，所以同样的提示动作，重复使用率会纯粹因为延迟而不同。它还决定你到底在动哪一批用户：如果当月队列的首用时间是 45 天、两个月前那批是 8 天，那问题出在你改了入职方式、而不是功能难用，再加产品内表面也解决不了。首用时间还决定 90 天采用窗口是否公平——一个要 40 天才能被找到的功能，在一个才 45 天大的队列里根本还来不及显示有意义的 90 天采用率。',
          backfire:
            '首用时间的反噬，是把事件挪动来制造改善，而不是真的改善体验。把「用过」事件挂在悬停、渲染或提示气泡展开上，中位数会塌到零，而没有一个人真的用了任何东西，后面算出来的采用率测的是好奇心而不是行为。把发现往前推也会反噬：把邮件挪到第 0 天以改善中位数，会推高退订率和通知关闭率，而关闭通知等于把这个用户从之后所有触发里摘掉，于是重复使用率下滑，首用时间看起来却被修好了。另外，用「功能上线日」而不是「队列进入日」做起点，会让老功能好看、新功能吃亏，因为上线一年的功能有十二个月的队列可以平均。把你用的那个起点日期写在数字旁边。',
        },
        {
          priority: 3,
          metric: '重复使用率（14 天内在不同日子用过该功能 2 次以上的用户数 ÷ 同一窗口内至少用过一次的用户数）',
          fixFirst:
            '把重复使用排在第三位，放在发现速度之后，因为发现够快才有用户可谈，它也把「你只是让人看见了」和「人们真的留下来了」这两个功能分开。指南把采用率当头条指标，而「用过一次」和「用过两次」之间的差就是习惯死掉的地方，在那个头条数字里完全看不见：30% 的采用率里如果只有 5 个百分点的人回来了，和 30% 的采用率里有 25 个百分点回来了，是两种完全不同的产品。按功能、按队列算出这个比值，再把它拆成「第二次使用发生在 7 天内」还是「更晚」——第一周内的第二次使用是习惯正在形成，第三周才有的第二次使用通常是一张「这个怎么再弄一次」的客服工单。',
          alsoMoves:
            '重复使用率告诉你即将放大的那个采用数字是不是耐用的，也改变你怎么读价值交叉比对。一个扩展收入占比 25%、重复使用率只有 5% 的功能，是靠销售对话激活的功能——推动它的是扩展收入这件事，不是产品本身；而同样收入占比、重复使用率 40% 的功能说明它是真习惯，值得放进入职流程去推。它还决定「推还是退役」的顺序：一个只用一次就不再回来的功能，即便采用率有 20%，也是退役候选；而首次使用率低但重复使用率高的功能，需要的是更多入口，不是一份日落计划。',
          backfire:
            '重复使用率会在两个方向上反噬。如果你把「第二次使用」定义成包含被动交互，一次周报打开或一次被动刷新就被算成用户回来了，比值被抬高，而实际习惯并没有出现。如果你用奖励指标而不是奖励任务本身的方式去推第二次使用——专门为了凑一次会话而发的提示——你可以造出重复使用却造不出重复价值：指标上去了，用户收到的通知变多了，而通知关闭率上升，这会悄悄缩小其它每一行都在用的活跃基数。验收时要确认第二次使用是真正的任务事件，并在同一周里核对关闭率。',
        },
        {
          priority: 4,
          metric: '低采用功能的扩展收入占比（采用率低于 20% 的功能带来的扩展收入 ÷ 扩展收入总额，口径 USD/月）',
          fixFirst:
            '把价值交叉比对放在第四位，因为这一行决定了其它各行该瞄准哪里，也是唯一一行需要拿出分析工具之外数字的。指南用例子划了线：一个采用率 8%、却驱动了四分之一扩展成交的功能值得推上桌面；一个采用率同样 8%、但没有任何扩展信号的功能是退役候选。这两个功能在采用率表里长得一模一样，在计划里却是两个相反的东西。把最近 6 个月的扩展收入拉出来，归因到成交时真正起作用的那个功能，把占比以 USD/月 的口径写在每个功能的采用率旁边。一个没人发现、却背着收入的功能，是你手上最便宜的增长，它比任何 30% 采用率的功能都更该拿这一季度的发现预算。',
          alsoMoves:
            '这一行告诉你其它行到底值多少钱，所以它会改变它们的排序。如果某一个低采用功能背着大部分扩展收入，发现闭环就该围着这一个功能重建，其它功能上的提示先放一放；如果没有任何低采用功能带来收入，那你的增长问题不是发现，而是这些功能本身不值钱，把这一季度花在气泡提示上什么也换不到。它还决定退役队列的优先级：一个背后有收入的功能即使几乎没人用，也从来不是纯粹的退役候选，因为那笔收入挂在一个你可能要重建、而不是删掉的流程上。',
          backfire:
            '价值交叉比对会在归因方式不对时反噬。如果按成交单上提到的功能归因，而不是按用户实际做过什么归因，销售备注记的往往是配置阶段聊到的那个功能，而不是真正带来第二个席位的那个，于是表格给一个只是「在场」的功能记了功，真正扛下成交的那个被忽略了。另一条反噬是同一个扩展事件被归给好几个功能，占比加起来超过 100%，每个功能看起来都不可或缺，交叉比对的意义被完全抹掉。每一个扩展事件只归一个功能，把归因规则写在表格旁边，规则改了就重算占比，而不是假设排序会自己保持不变。',
        },
        {
          priority: 5,
          metric: '广度与深度之比（每个活跃用户用过的不同功能数 ÷ 每个功能每会话的使用次数，同一个 30 天基座）',
          fixFirst:
            '把广度与深度之比排在第五位，因为它是用来检查你的发现入口到底在起作用，还是只是把产品塞满了。广度 5、深度约每会话 8 次的基座，是少数几个功能被用得很扎实的基座；广度 12、深度 1 的基座是在乱逛，通常说明入口给得太多、用户挑一个就走了。两个数必须在同一个 30 天基座上量，并且画在同一张图上，因为单看任何一个都没法解释：广度数字上升是加更多入口的必然结果，只有深度同时守住，广度上升才是好消息。在你往界面里再塞任何东西之前先修这一项，因为界面拥挤的代价记在深度那一栏和客服工单里，不记在采用率那一栏。',
          alsoMoves:
            '这个比值决定你还能负担多少发现入口。每一个新的产品内入口都会推高广度，一个已经到 12 的基座会被推得更远离「用户能把一件事做完」的状态，这时候该做的是撤入口而不是加入口。它还重新定义了首次使用时间那一行：在拥挤的基座里，首用时间会因为功能更好找而改善，而深度会塌，因为每个会话草草碰一个东西，所以每周复核时这两行必须一起读。它也是那个告诉你「退役队列释放出来的时间该投哪」的行——该加深现有功能，而不是再开一轮发现战役。',
          backfire:
            '广度与深度会在你把比值当目标而不是当两个分项看的时候反噬。想让比值好看，团队可以把用户往多碰一个功能上引，广度涨了、深度跌了；也可以把只有一部分人用的功能砍掉，纸面深度上去了，同时把三分之一基座升级的理由删掉。广度还会被「会话里顺带碰到」灌水：横幅点击、自动展开的面板都算，于是要数的是用户在会话里主动使用的功能，而不是页面渲染出来的功能。另外，每周窗口一改，比值就会为与行为无关的原因跳变，动手期间把窗口固定住。',
        },
        {
          priority: 6,
          metric: '可退役功能占比（采用率低于 5% 且连续 6 个自然月无 roadmap 保留理由的功能数 ÷ 生产环境在架功能数）',
          fixFirst:
            '把退役队列放在最后，并把它当成「注意力释放」而不是增长杠杆。前面每一行都是在赌一个功能能被找到、能被重复使用；退役决策赌的是它不能，而只有前三行告诉你哪些功能值得赌之后，这个赌才该下。到了那一步，这张队列就是一份你仍在维护、仍在写文档、仍在支持的清单，而它们从来没有被采用过；每一个都在消耗发现工作需要的工程注意力。把采用率和价值两头都不合格的功能挑出来，写好迁移方案、通知用过的用户、把文档归档，并记录队列条目的创建日期，这样那 6 个月的时钟是查得到账的。',
          alsoMoves:
            '下线功能会改变你之后发布的每一个采用百分比分母，因为留在架上的功能那一侧，活跃用户基数会随着被下线功能的用户离开或留下而变动。它还释放了发现入口：一个退役功能从命令菜单里拿掉一个条目、从入职清单里拿掉一步，而每撤掉一个入口都会抬高广度与深度那一对里的深度。它也改变下一个季度「退役还是推上桌面」的判断，因为一个本轮被判为「值得推」的功能，到下一轮可能已经零用户，所以这个判断必须基于当期数字重做，而不是从上轮继承。',
          backfire:
            '退役队列会在「最近 6 个月里曾经很低」被当成「6 个月里一直很低」时反噬。一个曾经 40% 采用、现在 3% 的功能，能通过第二种测法、过不了第一种，把正在回访的功能下线，等于删掉一个还在工作的事实。它还会在队列被当成指标时反噬：缩掉「可退役占比」最快的办法，是下线一个恰好低于阈值的热门功能，于是你赔上了它的收入和周边一切的采用基座。而没有数据迁移方案、没有用户公告的退役，会毁掉指南坚持的那条承诺，功能数降下去了，客服量却上去了。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Six audits decide what happens to a feature, and the first is a measurement problem: per-feature cohort data pulled on one window in one unit. Low-adoption features then split into a surface list and a retire list, because one that drives expansion revenue deserves a push while one with no signal deserves a sunset.',
      items: [
        {
          step: 1,
          label: 'Per-feature cohort audit pulled on one window in one unit',
          gate: 'Trailing-90-day adoption rate and median time-to-first-use pulled for every shipped feature, split by signup cohort, with at least 8 of 10 features carrying their own named event and the pull date recorded.',
          blockIf:
            'If a feature has no dedicated event, its adoption rate is computed from a proxy that fires on any render, so the low-adoption list in Step 2 is built on inflated counts and you may sunset a working feature. A time-to-first-use measured from a start date other than cohort entry also puts the pairing in this step wrong in a direction you cannot see, because the numbers still look plausible.',
        },
        {
          step: 2,
          label: 'Under-adopted features split into a surface list and a retire list',
          gate: 'A cross-reference table where every feature below 20 percent adoption carries either its share of expansion revenue in USD per month or a written no-signal note, with at least 1 feature on each of the two lists.',
          blockIf:
            'Without the cross-reference, the 8 percent adoption feature and the identical-looking 8 percent feature with no revenue behind it stay indistinguishable, and Step 3 spends a quarter of nudges on the one that was going to be retired. If attribution lets one expansion event count for two features, every share is too large and no feature clears the bar for surfacing.',
        },
        {
          step: 3,
          label: 'Discovery and activation loop shipped for the target cohort',
          gate: 'At least 3 discovery surfaces live for one target feature (in-product entry point, onboarding nudge, email trigger), a baseline adoption rate of 15 percent or lower recorded before launch, and a 30 percent quarter-end target written down.',
          blockIf:
            'If you ship the surfaces without recording the baseline first, the 15-to-30 percent target becomes unfalsifiable and the quarter ends with a claim nobody can check. If the surfaces fire for every cohort instead of the awareness-but-not-activated one, you are paying notification fatigue across the whole base for a lift the targeted cohort should have produced, and the opt-out rate rises.',
        },
        {
          step: 4,
          label: 'Breadth and depth measured weekly on a fixed base',
          gate: 'A weekly chart pairing breadth (distinct features per active user) with depth (uses per session per feature) for the trailing 30 days, run for 4 consecutive weeks, with the healthy band of about 5 and 8 marked on it.',
          blockIf:
            'If either half is measured alone, a breadth of 12 looks like discovery success while depth of 1 means users bounce, and the next round of surfaces makes the crowding worse. If the window shifts between weeks, the ratio moves for reasons that have nothing to do with behaviour, so the review ends up arguing about a change that never happened.',
        },
        {
          step: 5,
          label: 'Sunset queue reviewed with dated plans and named owners',
          gate: 'Every feature below 5 percent adoption for 6 consecutive calendar months has a written sunset plan with a notification draft, a data-migration owner and a target date, with no more than 5 entries left undecided.',
          blockIf:
            'If the queue is cleared without the 6-month evidence, you retire features that have recovered and Step 2 loses candidates you could have surfaced instead. If more than 5 entries stay undecided, the attention Step 3 needs is being spent on features nobody will adopt, and the review never reaches a decision on the ones that matter.',
        },
        {
          step: 6,
          label: 'Every live feature routed into exactly one playbook',
          gate: 'All features live in production carry exactly one of 4 labels (scale above 40 percent, activate 20 to 40 percent, discover 10 to 20 percent, retire below 10 percent), and no feature is assigned to two bands.',
          blockIf:
            'A feature assigned to both activate and discover splits the effort so neither playbook runs to completion, and a feature in no band at all is invisible for a whole quarter. If the bands are computed from a different window than the audit in Step 1, the labels contradict the numbers you are working from, and the plan gets built on the more flattering version.',
        },
      ],
    },
    zh: {
      intro:
        '六项审计决定一个功能的去向，第一项是测量问题：按功能的队列数据要在同一个 90 天窗口、同一单位下拉出。低采用功能随后分成「推上桌面」和「退役」两张清单——能带来扩展收入的值得推，没有信号的值得日落。广度与深度在固定的 30 天基座上每周配对测量，每一个在架功能都被路由进且仅进那四套剧本之一。退役不是删代码：要有书面日落方案、数据迁移和用户公告，再加 6 个月宽限期。推到桌面的那批要有负责人和上线日期，否则清单会一直躺在那儿。',
      items: [
        {
          step: 1,
          label: '按功能的队列审计在同一个 90 天窗口、同一单位下拉出',
          gate: '每个已上线功能都拉出最近 90 天的采用率与首用时间中位数并按注册队列拆分，其中至少 8 个功能带有自己的命名事件，同时记录拉取日期。',
          blockIf:
            '某个功能没有独立事件时，它的采用率是由「一渲染就触发」的代理算出来的，于是第二步里的低采用清单是建立在一组被抬高的计数上，你可能会把一个还在工作的功能退役掉。首用时间若不从队列进入日算起，比例就错在看不见的方向上——数字看起来仍然合理。',
        },
        {
          step: 2,
          label: '低采用功能被分成「推上桌面」与「退役」两张清单',
          gate: '一张交叉比对表：每个采用率低于 20% 的功能都要么写出它在 USD/月 口径下的扩展收入占比，要么写明「无信号」，并且两张清单里各至少有 1 个功能。',
          blockIf:
            '没有这张交叉比对表，采用率同为 8% 的那个功能和有收入背后那个功能就无法区分，第三步会把一整个季度的提示花在那个本来就要退役的功能上。如果归因允许一个扩展事件算给多个功能，占比会偏大，任何功能都够不上「值得推」的门槛。',
        },
        {
          step: 3,
          label: '针对「知道但没激活」队列的发现与激活闭环已上线',
          gate: '一个目标功能上至少 3 个发现入口已上线（产品内入口、入职提示、邮件触发），上线前记录了 15% 或更低的基线采用率，并把 30% 写成季度末目标。',
          blockIf:
            '上线时没有先记基线，15% 到 30% 这个目标就没法证伪，一个季度结束后你只剩一个谁也查不了的说法。如果这些入口对所有队列都发，而不是只发给「知道但没激活」那一批，你是在拿整个基座的关闭率去换一批本该由目标队列贡献的提升，关闭率会跟着上来。',
        },
        {
          step: 4,
          label: '广度与深度在固定的 30 天基座上每周配对测量',
          gate: '一张每周更新的图，把广度（每个活跃用户用过的不同功能数）与深度（每个功能每会话使用次数）配对，窗口固定为最近 30 天，连跑 4 周，并在图上标出约 5 与 8 的健康区间。',
          blockIf:
            '只测其中一个数，广度 12 看起来像发现成功，而深度 1 说明用户在进出之间跳了一下，下一轮入口只会更挤。如果每周的窗口在变，比值会为与行为无关的原因移动，复核最后争的是一次根本没有发生的变化。',
        },
        {
          step: 5,
          label: '退役队列带着日期化的日落方案与责任人被逐条复核',
          gate: '每个采用率低于 5% 且连续 6 个自然月都低的功能，都有一份写明通知稿、数据迁移责任人与目标日期的日落方案，未决条目不超过 5 条。',
          blockIf:
            '没有 6 个月的证据就清队列，你会把已经回暖的功能下线，而第二步就失去了本来可以推上桌面的候选。如果未决条目超过 5 条，第三步需要的注意力正被没人会用的功能占着，复核永远走不到那些真正要紧的条目的决定上。',
        },
        {
          step: 6,
          label: '每一个在架功能都被路由进且仅进那四套剧本之一',
          gate: '生产环境在架的全部功能都恰好带 4 套标签之一（扩展：高于 40%；激活：20-40%；发现：10-20%；退役：低于 10%），且没有任何功能同时落在两个区间。',
          blockIf:
            '一个功能既被标成「激活」又被标成「发现」，两份力气会被摊薄，两套剧本都跑不完；而完全没进任何区间的功能，整整一个季度都是隐形的。如果这些标签用的窗口和第一步的审计不是同一个，它们会和你正在用的那组数字自相矛盾，而计划最后是照着更好看的那一版建的。',
        },
      ],
    },
  },
};
