// P166 —— A 类（SaaS Metrics）主题「burn-rate-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前已完整读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 按阶段选行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个燃烧/效率指标同时不达标时先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的达标线与卡点（howToApply 只说做什么，不说什么算达标）
//
// 口径纪律（本主题讲的是用户自己的经营阈值，不是数据集市场价 ⇒ 允许手写金额，但必须带口径）：
//   · 毛燃烧 = 团队 / 基础设施与 SaaS / 营销 / 运营四类月度实际支出合计（美元计），一次性项目剔除。
//   · 净燃烧 = 毛燃烧 − 已确认月度收入（美元计）；收入波动大时用过去 3 个月均值；收到的现金 ≠ 已确认收入。
//   · 跑道 = 现金余额（美元）÷ 净燃烧（美元/月），单位月；燃烧倍数 = 净燃烧（美元/月）÷ 本月净新增 ARR（美元）。
//   · 金额一律写成「USD 120K 毛燃烧」这种带口径的形式（分子分母 + 期间 + 量级 + 单位），不写孤零零的数。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Spend is a composition problem before it is a total. Split the month into team, infrastructure, marketing and operations, because a cut on the wrong bucket buys a month of runway. Net burn then subtracts recognised revenue, not cash collected: one prepaid annual contract can make an unprofitable quarter look funded.',
      rows: [
        {
          priority: 1,
          metric: 'Gross burn and its composition — the only spend number you fully control',
          fixFirst:
            'Start where you have control and where reversal is cheap. Pull the last three months of actuals, sort them into team, infrastructure and SaaS, marketing, and operations, and compare the total against your stage band — USD 20-50K a month pre-seed, USD 50-150K seed, USD 150-500K Series A, and USD 500K and above in growth. Above the band is overspending, below it is under-investing; the sequence of the fix is the same either way, and it lands in reverse order of reversibility: SaaS subscriptions first, contractor hours second, headcount last. Take the 10% scenario first and measure the runway extension it buys before deciding whether to go further.',
          alsoMoves:
            'Cuts in the two reversible buckets do not cost revenue in the same month, so the runway extension is real rather than deferred: net burn falls immediately and the burn multiple improves in the same month, because the numerator drops while net new ARR is unchanged. It also protects whatever programme you are running in parallel — every month you delay a decision is a month of gross burn with no offsetting revenue, and a company that cuts 20% and adds USD 15K of net new ARR sits in a different runway position than one that cuts nothing.',
          backfire:
            'The two buckets you cut first are often the ones the revenue engine runs on. SaaS subscriptions are frequently the customer-facing layer or the data pipeline, and contractors are frequently the delivery capacity that implements paid accounts, so a 10-20% cut in contractors in a services-heavy onboarding model shows up as fewer activated accounts two months later — which stalls the activation fix and the churn repair you were counting on. The accounting version of the same error is cancelling a SaaS contract in month 11 of an annual term: you save eleven months of cost and pay the full year anyway.',
        },
        {
          priority: 2,
          metric: 'Net burn and the revenue basis — recognised revenue, not cash collected',
          fixFirst:
            'Net burn is what actually depletes cash, and its volatility comes almost entirely from the revenue side, so fix the basis before you touch the number. Recognised monthly revenue, not cash collected: with annual prepay, usage spikes or one-off services in the mix, a single month is unreadable, so use a trailing three-month average of recognised revenue and carve one-time items out. Verify that the runway you compute from that trailing average is stable month to month — if it moves more than about 15% with nothing changing in the business, the denominator is still noisy.',
          alsoMoves:
            'A stable net burn turns runway from a scare number into a planning number, and that is what lets you time a raise instead of being forced into one: with the same cash balance, a reliable 14-month runway gives you two quarters to raise in good conditions, while a noisy one forces the decision in whichever month the number happens to look worst. It also repairs the burn multiple, because net new ARR is measured against a base whose size is decided by this same revenue basis.',
          backfire:
            'Treating cash collected as recognised revenue is the most flattering and the most expensive mistake available: prepay inflates the month, net burn appears at or below zero, runway reads as infinite, and the company looks default alive at the exact moment it is default dead. Concretely, a company that pre-sells 30% of next quarter as annuals receives a quarter of cash up front, and counting it as monthly revenue flatters runway by several months — enough to delay the raise until the cash is already spent.',
        },
        {
          priority: 3,
          metric: 'Burn multiple — net burn divided by net new ARR, the efficiency test',
          fixFirst:
            'The burn multiple is the only one of these numbers that says whether the cash is buying growth or buying a look, and above 2.0x it is a board conversation rather than an operating metric. Do not try to fix it by spending more; fix it with one of two levers — net new ARR per month, or net burn — and model which one is available to you in the next 90 days: given net burn of USD 60K a month, what monthly net new ARR brings the ratio under 1.5x, and is that reachable from your current sales capacity without adding headcount?',
          alsoMoves:
            'A burn multiple under 1.0x is the precondition the benchmark page sets before raising paid spend 20% over 30 days — it is what makes a marginal-spend test safe to run, because it shows the marginal dollar is replacing more than a dollar of churned MRR. It is also CAC payback seen from the company side, and it is the input a buyer discounts most heavily, so improving it raises what the business is worth without a single extra sale.',
          backfire:
            'The burn multiple can be "fixed" by shrinking both sides: cutting burn while net new ARR also falls keeps the ratio flat or makes it worse, and a board that watches only the ratio will approve that trade. The other version is buying net new ARR with discounts and marketplaces, which brings cash in fast and flatters the ratio for one quarter while NDR and CAC payback deteriorate — the ratio looks best exactly when the business is weakest, which is when the next raise is least likely to be priced well.',
        },
        {
          priority: 4,
          metric: 'Runway — cash on hand divided by net burn, in months',
          fixFirst:
            'Runway is the number that ends your optionality, so set it against a band — 18 months or more after a raise is the default-alive line, under 12 months is a fundraising trigger, under 6 months is an emergency — and then pick exactly one of three actions: cut burn, accelerate revenue, or raise capital. Choose on speed, not preference: cuts take weeks, revenue acceleration takes a quarter, and a raise takes three to six months, so the size of the gap decides which action is still available to you. Verify by projecting the runway under the chosen action, computed on the same trailing three-month net burn you used for the diagnosis.',
          alsoMoves:
            'The gap between your runway and your target band is the negotiating room you have. Raising while you still hold 18 months costs less dilution than raising at 9, and a company that reaches the band with a burn multiple under 1.0x can convert the same runway into growth investment instead — the benchmark page calls for investing more aggressively while the window is open, and the burn multiple is what proves the money is working. Runway and burn multiple together also give the board one defensible answer: runway says when, the burn multiple says whether.',
          backfire:
            'The fastest lever has the longest recovery. Cutting 20% of gross burn usually slows net new ARR one to two quarters later, so cutting before raising and then missing the raise date by one quarter leaves you with less burn and a weaker pipeline — the ratio and the runway both worsen, and the next raise is priced off a worse base. There is also a way to flatter the number without changing anything: pre-collecting annual prepay raises cash and lowers net burn for that month, so runway improves on the calendar rather than on the business.',
        },
        {
          priority: 5,
          metric: 'Default alive versus default dead — can the current plan reach profit on current cash?',
          fixFirst:
            'This is the synthesis, so it goes last, and it is the one that decides whether the other four matter. Ask the question YC asks: at the current growth rate and the current burn, can the company reach profitability on the cash it already holds? Model the monthly cash curve and find the month where recognised revenue crosses gross burn — that breakeven month is the verdict, and it is a month you can check rather than a feeling. If breakeven falls inside cash on hand you are default alive; if it falls beyond, you are default dead, and only the three actions in row 4 change the answer.',
          alsoMoves:
            'The breakeven month tells you which action is sufficient. If revenue can cross the burn line six months out at the current pace, a raise is unnecessary and the burn level can stay where it is; if it needs thirty months, cost cuts alone cannot save you and the raise has to start now. It also sets the pace of the whole programme — the burn rate you can afford is the burn rate consistent with that month — and it is the measure that tells you whether the aggressive revenue scenarios in Step 5 are load-bearing or decorative.',
          backfire:
            'The default-alive verdict is a statement about a company that keeps moving, and it flips within a single quarter when growth slows or costs creep — treating it as permanent is exactly how a healthy company wakes up default dead. The other failure is modelling it on the optimistic curve: running breakeven on the hyper-growth scenario as the base case makes every company default alive and turns the runway target into decoration. The base case must be current pace, with the aggressive scenario as a sensitivity rather than as the plan.',
        },
      ],
    },
    zh: {
      intro:
        '烧钱先看构成，再看总数。上月实际数要拆成团队、基础设施、市场、运营四类，因为砍错桶的省法只换来一个月的跑道。净燃烧要减已确认收入而不是收到的现金——一笔年付预收就能让亏损的季度看起来有钱。真正检验效率的是燃烧倍数而不是跑道：超过 2.0x 说明公司在用现金买增长，而不是用产品换增长；低于 1.0x 才叫资本高效。跑道要按 3 个月净燃烧均值算，单月波动不该让你做决定。砍成本的顺序也要跟着走：可逆性从高到低，先砍订阅，再砍外包，最后才动人头。',
      rows: [
        {
          priority: 1,
          metric: '毛燃烧与其构成 —— 唯一完全由你掌控的支出数字',
          fixFirst:
            '从你能完全掌控、且撤销代价最低的地方开始。把过去 3 个月的实际数归成团队、基础设施与 SaaS、营销、运营四类，合计出毛燃烧，再对阶段带——种子前每月 2 万-5 万美元、种子轮 5 万-15 万、A 轮 15 万-50 万、成长期 50 万美元以上。高于带是过度投入，低于带是投入不足，而修的顺序两者相同，且按可逆性反向排：先 SaaS 订阅、再外包工时、最后才动人头。先跑 10% 那一档，量出它买到的跑道延长月数，再决定要不要加码。',
          alsoMoves:
            '砍前两个可逆桶不会在同一个月损失收入，所以跑道延长是真实的、不是递延的：净燃烧立刻下降，燃烧倍数在同一个月改善，因为分子降了而净新增 ARR 没动。它还保护你并行推进的计划——每一个拖着不决的月份，都是没有对冲收入的毛燃烧；而砍掉 20% 又多出 1.5 万美元净新增 MRR 的公司，和什么都不砍的公司，跑道位置完全不同。',
          backfire:
            '你最先砍的那两个桶，常常正是收入引擎跑在上面的东西。SaaS 订阅往往就是面向客户的那一层或数据管道，外包往往就是交付付费账户的实施人力，所以在 onboarding 重服务的模型里砍 10-20% 外包，两个月后会表现为激活账户变少——正好卡住你指望的激活修复与流失修复。同一错误的会计版本是：年付 SaaS 合同砍在第 11 个月，你省下 11 个月的成本，年底照样付满一年。',
        },
        {
          priority: 2,
          metric: '净燃烧与收入口径 —— 按已确认收入算，不按收到的现金算',
          fixFirst:
            '净燃烧才是真正在消耗现金的数，而它的波动几乎全来自收入端，所以先修口径再修数字：用已确认的月度收入，不是收到的现金。收入里混了年付预收、用量尖峰或一次性服务时，单月根本读不出来，于是用过去 3 个月的已确认收入均值，并把一次性项目剔出来。验证方式：用这个均值算出的跑道逐月应当稳定——如果业务没变而数字波动超过约 15%，说明分母还没归一。',
          alsoMoves:
            '净燃烧稳定之后，跑道才从「吓人的数字」变成「计划用的数字」，而这正是你能挑融资时点、而不是被逼着融资的前提：同样一笔现金余额，可靠的 14 个月跑道给了你两个季度在好条件下融资，而一个抖动的数字会让你在它看起来最差的月份被迫决定。它还顺带修好了燃烧倍数——净新增 ARR 是在同一个收入口径决定的基数上量的。这一行修的其实是判断质量，不是数字本身。',
          backfire:
            '把收到的现金当成已确认收入，是最讨好自己也最贵的错误：预收会让那个月的净燃烧看起来小于等于零，跑道读起来是无限的，于是公司在最该喊救命的时候显示为默认存活。具体说，一家预卖下季 30% 为年付的公司会提前收到一个季度的现金，把它算作月度收入，能把跑道吹大出好几个月的错觉——足够把融资拖到钱已经花光。',
        },
        {
          priority: 3,
          metric: '燃烧倍数 —— 净燃烧 ÷ 净新增 ARR，效率的检验',
          fixFirst:
            '这四个数里，只有燃烧倍数能说明这笔现金是在买增长还是在买一个样子；而它高于 2.0x 时，是董事会议题，不是运营议题。修它不要靠多花钱，只能靠两个杠杆之一——每月净新增 ARR 或净燃烧——并建模未来 90 天你能动哪一个：净燃烧每月 6 万美元时，要让比值压到 1.5x 以下需要多少月度净新增 ARR，以你现在的销售产能、不加人头，够不够得着？',
          alsoMoves:
            '燃烧倍数低于 1.0x 正是基准页要求的「30 天加投 20% 付费投放」的前置条件——它说明边际那 1 美元能替代超过 1 美元的流失 MRR，所以增长实验才敢做。它同时是换个视角看的 CAC 回本，也是买家折价最狠的输入，所以把它做上去，不需要多卖一单就能抬高这门生意值多少。而且它是这几个数里唯一能同时被成本端和收入端推动的一个——当你问「这一块钱该省还是该花」时，比值本身就是答案。',
          backfire:
            '燃烧倍数可以靠「两边一起缩」被修好：砍燃烧的同时净新增 ARR 也掉，比值不变甚至更差，而只看这个比值的董事会会批准这笔交易。另一个版本是用打折和平台市场买净新增 ARR——现金进得快，比值漂亮一个季度，而 NDR 与 CAC 回本同时恶化——比值最好看的时候恰恰是生意最弱的时候，也正是下一轮最不可能拿到好价钱的时候。',
        },
        {
          priority: 4,
          metric: '跑道 —— 现金余额 ÷ 净燃烧，单位为月',
          fixFirst:
            '跑道是那个会终结你选择权的数字，所以要把它放在一条带上（融资后 18 个月以上是默认存活线；12 个月以下触发融资；6 个月以下属于紧急），然后在三选一里挑一个动作：砍燃烧、加速收入、或者融资。按速度挑，而不是按偏好——砍成本要几周，收入加速要一个季度，融资要三到六个月——所以缺口的尺寸决定哪个动作还来得及。验证方式：用你诊断时那个「过去 3 个月净燃烧均值」把所选动作下的跑道算出来。',
          alsoMoves:
            '你的跑道与目标带之间的差额，就是你手上的谈判空间。18 个月时融资，稀释成本低于 9 个月时融资；而带着低于 1.0x 的燃烧倍数走到目标带的公司，可以把同样的跑道换成增长投入——基准页说的就是在窗口开着时大胆加码，而燃烧倍数正是「这笔钱有效」的证据。跑道与燃烧倍数合在一起还给了董事会一个可辩护的答案：跑道说「什么时候」，燃烧倍数说「有没有用」。',
          backfire:
            '最快的杠杆，恢复期最长。砍掉 20% 毛燃烧通常会让净新增 ARR 一到两个季度后变慢，所以「先砍后融」一旦错过一轮的融资时点，剩下的是更低的燃烧和更弱的管道——比值与跑道同时变差，下一轮的定价基础也就更差。还有一种不动业务就能把数字做漂亮的方式：预收年付会让那个月现金上升、净燃烧下降，于是跑道按日历变好，而不是按生意变好。',
        },
        {
          priority: 5,
          metric: '默认存活 vs 默认死亡 —— 按现在的计划，现在的现金够不够走到盈利',
          fixFirst:
            '这是综合判断，所以放最后，但也是唯一决定前面四个值不值得修的一个。问 YC 那个问题：按当前增速与当前燃烧，公司能不能用手里的现金走到盈利？建模每月现金曲线，找出已确认收入穿过毛燃烧的那个月份——盈亏平衡月就是判决，而且是一个能查的月份，不是感觉。如果盈亏平衡落在现金余额之内，你默认存活；如果落在外面，你默认死亡，只有第 4 行那三个动作能改变答案。',
          alsoMoves:
            '盈亏平衡月告诉你哪个动作才够用。如果按当前节奏收入能在 6 个月后穿过燃烧线，就不需要融资，燃烧水平可以维持现状；如果需要 30 个月，光砍成本救不了你，融资必须现在开始。它还为整个计划定调——你负担得起的燃烧水平，就是与那个月份相容的燃烧水平——也是判断 Step 5 里那些激进收入场景到底是承重还是装饰的尺子。',
          backfire:
            '默认存活这个判决是对一家仍在移动的公司下的，增长一放缓或成本一爬升，一个季度内就能翻面——把它当永久状态，正是健康公司一觉醒来变默认死亡的方式。另一个失败是拿乐观曲线建模：把超速增长档当基准情形来算盈亏平衡，会让每家公司都默认存活，于是跑道目标变成装饰。基准情形必须是当前节奏，激进场景只能当敏感性分析，不能当计划。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Six checkpoints turn a runway number into a decision, each consuming the result before it. Categorise spend before dividing anything, hold revenue on a trailing three-month average, and keep prepay out of monthly revenue. Cost cuts land in reverse order of reversibility: subscriptions, then contractors, then headcount.',
      items: [
        {
          step: 1,
          label: 'Step 1 — Last month categorised into four buckets, gross burn computed',
          gate:
            'The last two months of actuals are sorted into team, infrastructure and SaaS, marketing, and operations, gross burn totals USD X per month, one-time items are listed separately, and team spend as a share of gross burn is compared with the 50-70% reference band.',
          blockIf:
            'Without the categorisation there is no gross burn, and every later number — runway, burn multiple, every cut scenario — has nothing to sit on. The quieter failure is leaving one-time costs inside the monthly figure: equipment purchases, legal settlements and tax true-ups make gross burn swing by three to five months of runway, so you panic-fundraise in the month the numbers look worst and relax in the month they look best.',
        },
        {
          step: 2,
          label: 'Step 2 — Runway computed on a trailing three-month net burn',
          gate:
            'Net burn equals gross burn minus recognised monthly revenue (trailing three-month average where revenue is irregular), runway equals cash on hand divided by net burn giving a single figure in months (USD cash ÷ USD per month), and that figure moves less than 15% against last month with no change in the business.',
          blockIf:
            'A runway computed on one month cannot be used for anything: one-time costs and revenue timing make it jump by three to five months, so you either discount at the wrong moment or, worse, relax when the cash is tight. If the swing exceeds 15%, the denominator is not yet normalised — fix the data before you take an action on it.',
        },
        {
          step: 3,
          label: 'Step 3 — Burn multiple computed monthly and tracked over three months',
          gate:
            'Net new ARR is computed as the change in ARR over the month, including expansion and reactivation and net of churn and contraction, the burn multiple equals net burn divided by net new ARR, and three consecutive months are on record with a band (below 1.0x, 1.0-2.0x, above 2.0x) attached to each.',
          blockIf:
            'If net new ARR is taken from new bookings instead of the change in ARR, the ratio is systematically understated — bookings exclude expansion on existing accounts and do not subtract churn — so you see the best-looking number exactly when efficiency is worst. Until this step passes, the decision in Step 6 to invest more aggressively has no evidence behind it.',
        },
        {
          step: 4,
          label: 'Step 4 — Cost-cut scenarios modelled in reverse order of reversibility',
          gate:
            'Three scenarios at 10%, 20% and 30% of gross burn are each converted into a runway extension in months, every scenario names the buckets it cuts, and the cut order is SaaS subscriptions first, contractor hours second, headcount last.',
          blockIf:
            'If the scenarios are modelled as pure percentages without naming the buckets, execution starts wherever it is easiest — usually headcount, which saves the most and reverses the worst. Get the order wrong and you cut the asset the business runs on: removing delivery and onboarding capacity rolls back the activation and churn fixes, so growth returns two quarters later and spends the runway you just bought.',
        },
        {
          step: 5,
          label: 'Step 5 — Revenue acceleration modelled, with prepay kept out of monthly revenue',
          gate:
            'Three scenarios — monthly revenue up 20%, prices up 15%, and 30% of next quarter pre-sold as annuals — each produce a net burn figure and a runway figure, and in the prepay scenario the cash received and the revenue recognised are recorded separately, with none of the prepay counted as monthly revenue.',
          blockIf:
            'Pre-selling 30% of next quarter as annuals is the easiest scenario to fake: the cash arrives in one go, net burn looks lower and runway looks longer, and if it is spread into monthly revenue the real cash burn of the next quarter stays hidden until the balance is spent. Until this step passes, the runway in Step 2 is not trustworthy.',
        },
        {
          step: 6,
          label: 'Step 6 — Target runway band set and exactly one action chosen',
          gate:
            'The target band (18 months or more after a raise) is written next to the current runway, exactly one of cut burn / accelerate revenue / raise capital is selected with a reason tied to the size of the gap, the projected runway under that action is stated in months, and if runway is well above 18 months with a burn multiple below 1.0x, the extra growth spend is given a figure and a month.',
          blockIf:
            'Setting a target without choosing an action pushes the decision into the worst month of the next quarter, because the three actions have very different speeds: cuts take weeks, revenue acceleration a quarter, a raise three to six months, and without choosing, the raise is always last — taken when the terms are worst. And spending more needs a ceiling, or the runway band you just protected gets spent inside one quarter.',
        },
      ],
    },
    zh: {
      intro:
        '六个检查点把一个跑道数字变成一个决定，先后顺序有意义，因为每一步都吃上一步的结果。先归类支出再做任何除法；收入用 3 个月均值，免得一个月的进账买来虚假的安心；预收完全不进月度收入。砍成本按可逆性反向落地：先订阅，再外包，最后才动人头——最后这一刀收不回来。默认存活不是跑道够长，而是按现在的计划、现在的现金能不能走到盈利；这个判断每年要重做一次。反过来，默认死亡也不是某一笔大额支出造成的，是毛燃烧结构一个月一个月拖垮的。',
      items: [
        {
          step: 1,
          label: '步骤 1 —— 上月实际数归成四类，算出毛燃烧',
          gate:
            '最近 2 个月实际数已归成团队 / 基础设施与 SaaS / 营销 / 运营四类，毛燃烧合计为每月 X 美元，一次性项目单独列出，团队占毛燃烧比例与 50-70% 参考带对照过。',
          blockIf:
            '不归类就没有毛燃烧，后面所有数——跑道、燃烧倍数、每一档砍成本场景——都没有落脚点。更隐蔽的错法是一次性支出混在月度数里：设备采购、法律和解、税务调整能让毛燃烧对应的跑道波动 3-5 个月，于是你在数字最差的月份慌着融资，在看起来最好的月份放松。',
        },
        {
          step: 2,
          label: '步骤 2 —— 用 3 个月净燃烧均值算跑道',
          gate:
            '净燃烧 = 毛燃烧 − 已确认月度收入（收入波动大时取过去 3 个月均值），跑道 = 现金余额 ÷ 净燃烧 得出一个以月为单位的数（美元现金 ÷ 美元/月），且业务无变化时它与上月相差不超过 15%。',
          blockIf:
            '单月净燃烧算出的跑道不能用来做任何决定：一次性成本与收入确认时点会让它跳 3-5 个月，你会在最不该折价融资的月份去折价，也会在现金最紧的月份放松。波动超过 15% 说明分母还没归一——先修数据，再谈动作。',
        },
        {
          step: 3,
          label: '步骤 3 —— 燃烧倍数按月计算并连续跟踪 3 个月',
          gate:
            '净新增 ARR 按本月 ARR 变化计算（含扩展与重新激活、扣除流失与降级），燃烧倍数 = 净燃烧 ÷ 净新增 ARR，且已有连续 3 个月的记录，每个月都标出档位（< 1.0x / 1.0-2.0x / > 2.0x）。',
          blockIf:
            '如果净新增 ARR 取自「新增合同额」而不是 ARR 的变化，比值会被系统性低估——合同额不含老客户扩展，也不减流失——于是效率最差的时候看到的却是最好看的数字。这一步不通过，Step 6 里「加码增长」的判断就没有证据。',
        },
        {
          step: 4,
          label: '步骤 4 —— 砍成本场景按可逆性反向建模',
          gate:
            '10% / 20% / 30% 三档砍成本场景各自换算成跑道延长月数，每个场景都写明被砍的桶，且顺序是先 SaaS 订阅、再外包工时、最后人头。',
          blockIf:
            '如果场景只写百分比、不写被砍的桶，执行时就会从最容易下手的地方开始——通常是人头，而它节省最大、撤销最难。顺序一错，你就砍掉了生意跑在上面的那块资产：交付与 onboarding 能力被砍之后，激活与流失修复一起被推翻，于是两个季度后增长回落，把你刚买回的跑道又烧掉。',
        },
        {
          step: 5,
          label: '步骤 5 —— 加速收入场景建模，预收不计入月度收入',
          gate:
            '三个场景（月度收入 +20%、提价 15%、下季 30% 预卖为年付）各自给出净燃烧与跑道数，且预付场景里收到的现金与已确认收入分开记账，预收一笔都不计入月度收入。',
          blockIf:
            '预卖下季 30% 为年付是最容易做假的一条：现金一次性进来，净燃烧显得更低、跑道显得更长，如果把它摊进月度收入，下季度真实的现金消耗会被盖住，直到账上钱花光才暴露。这一步不通过，Step 2 的跑道就不可信。',
        },
        {
          step: 6,
          label: '步骤 6 —— 定目标跑道带，并三选一动作',
          gate:
            '目标跑道带（融资后 ≥ 18 月）已与当前跑道并排写下，并在砍燃烧 / 加速收入 / 融资里三选一，理由与缺口大小绑定；所选动作下的预计跑道月数已写出；若跑道远高于 18 月且燃烧倍数 < 1.0x，加码增长的金额与月份都已写明。',
          blockIf:
            '只定目标不选动作，等于把决定推到下一个季度最坏的月份：三个动作的速度差很多——砍成本几周、收入加速一个季度、融资三到六个月——不先选，融资永远排在最后，而且是在条件最差的时候谈。加码增长也要有金额上限，否则你刚守住的跑道带一个季度就被自己花穿。',
        },
      ],
    },
  },
};
