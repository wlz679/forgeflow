// P166 —— T 类（Customer Support）主题「support-cost-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= 步骤 1…步骤 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// ⭐ 与相邻两个 T 类主题的边界（三个主题都会说「工单」，口径必须互不串味）：
//   · 本主题 = 支持总成本：口径是**含人力分摊的单位工单成本**，分母是当月已解决工单数。
//   · first-response-time-optimization = 只算**首次人工响应**（从客户第一条消息到第一条人工回复）。
//   · resolution-time-optimization = 算到**最终结案**（含等待、升级与客户回复的时间）。
//   ⇒ 本文件里提到首响/解决时长时，只作为「成本以外被顺带影响的东西」出现，不给它们下定义。
//
// 口径纪律：
//   · 金额一律 USD，且必须写成带口径的形式（如 USD 8-15 / 工单），不写裸单价
//   · 单工单成本 =（薪资 + 福利 + 薪资税 + 间接费用 + 工具 + 管理分摊）÷ 当月已解决工单数
//   · 分母口径（拦截工单算不算）在动手之前固定一次，跨月比较必须同口径
//   · 拦截率 = 无人工介入即结案的工单 ÷ 进线工单数，必须与 KB 覆盖率成对给出
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A support budget that looks fine on a dashboard can be wrong in three places at once, and the first of those is the denominator. A fully-loaded cost per resolved ticket built from base salary alone understates the truth by 20-30 percent, and every lever in this table is quoted as a percentage of that base, so a saving measured against an understated base is not a saving at all. Then come the two levers that remove work before a person consumes it. Deflection comes first of those, and it only works when coverage and deflection are read together: high coverage with low deflection is a search and taxonomy failure, while low coverage with high deflection is a content gap. Escalation comes next, because a first-contact resolution rate under 70 percent means second-line hours are being spent on tickets the first line should have closed. Capacity comes last, because it is the only repair that costs money, and it is sized with Erlang-C against peak-hour arrivals, average handle time and shrinkage rather than against the headcount that already exists. The band comparison closes the sequence, describing the result of the four repairs rather than causing one. Cost per ticket is agent pay, benefits, payroll tax, overhead, tooling and management allocation divided by tickets resolved in the same calendar month, and that denominator is fixed once, before any lever is measured, because a deflected ticket has to count the same way in every month you compare.',
      rows: [
        {
          priority: 1,
          metric: 'Fully-loaded cost per resolved ticket — (agent pay + benefits + payroll tax + overhead + tooling + management allocation) divided by tickets resolved in the same month',
          fixFirst:
            'Fix the costing base first, because the three levers below are all quoted as a percentage of this number, and a wrong base makes every one of them unreadable. Two mistakes account for most of the gap: counting base salary instead of fully-loaded cost, which means applying 1.30x in the US and 1.40-1.50x in China to cover benefits, payroll tax and overhead, and leaving management allocation out of the numerator altogether. Before you touch anything, write three conventions down: the numerator covers the support team only, the denominator is tickets resolved in the same calendar month, and a deflected ticket is excluded from the denominator because it consumed no agent time. Then recompute per tier, because a blended figure hides the fact that second-line handling time runs several times first-line handling time. If your number lands outside the band for your segment — SMB SaaS runs USD 8-15 per ticket, mid-market USD 15-30, enterprise USD 30-100 — you finally know whether you are expensive or whether you simply count differently from everyone else.',
          alsoMoves:
            'A trustworthy cost base decides which of the other three repairs is worth buying. The same 10 percent cost reduction is worth USD 0.8 on an SMB ticket and USD 3 on an enterprise ticket, so your lever order is a function of your denominator rather than a universal table. It also sets the exchange rate for every scenario in step 5: knowledge base expansion is quoted as a 10-15 percent cost cut and an AI bot as a 30-40 percent cut, and those percentages become money only once the base is right. Splitting the number per tier also tells you whether capacity, row four, is even the right lever — a cost driven by second-line escalation hours needs routing, while a cost driven by first-line minutes needs deflection or shorter handle time.',
          backfire:
            'The fast way to make cost per ticket look better is to change the definition rather than the operation, and that is the most common way this table gets gamed. Reclassifying a contractor invoice out of the numerator, moving management allocation to a different cost centre, or switching the denominator from tickets resolved to tickets created all produce a lower number without a single ticket being handled differently. The denominator switch is the nastiest: in a month where you deflect a third of the tickets, resolved tickets fall, the same agent payroll divides into fewer units, and the cost per ticket rises even though you saved money. Never compare a month whose denominator convention changed with a month it did not, and pin the convention before you act rather than after you have seen which way the number moved.',
        },
        {
          priority: 2,
          metric: 'Deflection rate — tickets closed without any human touch divided by tickets created, always reported next to KB coverage on the same ticket population',
          fixFirst:
            'Fix deflection second, because it is the only lever here that removes work before it consumes a person, and it is also the cheapest to try: content, not headcount. Measure it on the last 90 days of tickets, tag each one by resolution path, and pair the result with coverage, because the two together tell you which of two entirely different projects you are about to start. High coverage with low deflection is a findability problem — the article exists and nobody locates it, so you fix search, titles and taxonomy. Low coverage with low deflection is a content gap and you write the article. SaaS teams typically sit at 20-35 percent, 50-65 percent is world-class, and the guide attributes 15-25 points to a well-run knowledge base, a further 30-50 points to an AI bot layered on top of it, and 5-10 points to a community forum. Fix the tagging rule before you interpret the number, because an untagged deflection is counted as a ticket that consumed an hour, which is why most teams under-report their own deflection.',
          alsoMoves:
            'Deflection moves the escalation rate without anyone touching routing. A deflected ticket never reaches tier one, so it never becomes a candidate for escalation, and the volume entering the second line shrinks by roughly the share you added. It also moves capacity, because the arrival rate you feed into the Erlang-C model is the arrival rate after deflection rather than before it, and a model built on gross arrivals over-sizes the team by exactly what your deflection is worth. And on the cost base it moves in the opposite direction to what people expect: with the denominator fixed to resolved tickets, deflected tickets leave the denominator, so the cost per human-handled ticket rises while total support cost falls. That is why cost is read together with deflection and never alone.',
          backfire:
            'Deflection backfires when the tagging rule counts a deflected ticket that nobody actually resolved. The common rule — read a knowledge base article and send no reply within 24 hours — quietly converts unanswered customers into deflected tickets, so your deflection rate climbs while the real question rate stays flat. The damage surfaces later: those tickets either reopen or come back as new tickets with a fresh clock, so both the reopen rate and inbound volume move up while the metric you optimised looks excellent. The second failure is deflecting the wrong population: when your highest-volume questions are escalations in disguise — billing disputes, outages, data exports — a bot fields them, fails, and hands off to a human who has to rebuild the context, so first response improves and resolution gets worse.',
        },
        {
          priority: 3,
          metric: 'Escalation rate — tickets handed from tier one to tier two or three divided by tickets created, with avoidable hand-offs called out separately',
          fixFirst:
            'Fix escalation third, because this is where first-line work leaks into the most expensive hours on the roster. Second and third line handling time runs several times first line, so removing 15-25 percent of avoidable escalation is the largest per-hour saving available without writing a single new article. Separate avoidable from unavoidable before you act: avoidable means the first line lacked the context, the permission or the article, and the fix is a routing rule; unavoidable means the work genuinely needed a specialist, and the fix is hand-off quality rather than a staffing cut. Instrument the hand-off itself — which queue it went to, how long it waited before anyone owned it, which article or team was cited. A ticket that sat for 20 hours in an unowned queue and then escalated to tier two was not a specialist escalation, it was a routing accident you paid for twice.',
          alsoMoves:
            'Escalation control moves response time as well as cost. A hand-off adds minutes to hours before the first human reply, because the ticket sits unowned while it moves, and that waiting time lands directly in the response metric on every channel. It also breaks the cost base open by tier: a ticket that takes ten minutes on tier one and ninety on tier two is one unit of cost containing two very different costs, and separating them tells you whether the escalation is a routing decision or a competence gap. Because escalation volume is the most volatile line in a support cost sheet, controlling it is what turns the quarterly target in step 6 into something you can hit rather than something you can only forecast.',
          backfire:
            'Escalation control backfires when you push the work back onto a first line that cannot handle it. Raising the first-line closure rate by sending ambiguous work down instead of up improves the escalation rate on paper, while the work returns later as a reopened ticket that carries the full cost of the first attempt plus the second. The second version is a routing rule that dumps everything ambiguous on tier two, which meets your escalation target and quietly creates a queue: specialists spend the day on work tier one should have closed, total cost per ticket goes up, and the escalation rate reads healthy. Read the first-contact closure rate next to the escalation rate, never either one alone.',
        },
        {
          priority: 4,
          metric: 'Peak-hour capacity — agents required by the Erlang-C model minus agents actually rostered, computed per channel and per shift',
          fixFirst:
            'Fix capacity fourth, because it is the only row on this list where the repair costs money, and it should be the last lever you reach for. Run the model per channel with the peak-hour arrival rate, the average handle time, a target occupancy of 75-85 percent and a shrinkage allowance of 25-35 percent for breaks, training and leave, then compare the required headcount with the roster you actually have. The purpose of the model is not to justify a hire, it is to tell you whether you have a capacity problem at all — a queue that persists at 85 percent occupancy is a staffing problem, while a queue that appears only in the last two hours of the day is a scheduling problem that costs nothing but a roster edit. Channel mix matters as well: chat-led teams handle roughly 30-50 tickets per agent per day, email-led teams 15-25, and bot-assisted teams 50-80.',
          alsoMoves:
            'Capacity decisions move the cost base immediately, because headcount is the largest single line in the numerator, and they move the response metrics in both directions. A correctly sized roster shortens the wait and therefore the wait-driven share of every ticket, but a roster sized to the peak with no buffer pushes occupancy toward 90 percent, and at that level queueing theory says a small arrival spike produces a disproportionate wait. It also determines whether the other three repairs are real: deflection, escalation control and a correct costing base all change the load, so the staffing model has to be re-run after each one instead of being set once at the start of the year.',
          backfire:
            'Hiring against a broken process is the expensive way to fix a metric. If the queue comes from a routing rule that sends tickets to the wrong queue, or from tickets that wait 20 hours before anyone claims them, adding agents multiplies the cost of the same broken hand-off. The second failure is occupancy: staff to 100 percent of paid time and you hold no buffer, so response times that look fine on average fall off a cliff in the last hour of a shift, and the average hides that. Staff inside the 75-85 percent band, and if the gap between required and rostered headcount is small, the honest conclusion is that the process is the problem and not the roster.',
        },
        {
          priority: 5,
          metric: 'Distance from the industry band — your cost per resolved ticket against the band for your segment, tracked across consecutive quarters',
          fixFirst:
            'Compare against the industry band last, because it is the only row that describes the result of the four repairs above rather than causing one. Re-benchmark every quarter against the Zendesk and HubSpot Service Hub bands, and keep the segment fixed while you compare: SMB SaaS, mid-market and enterprise tickets differ by a factor of four, so a mid-market number measured against an SMB band reads as a catastrophe and produces a panic that wrecks the cost base. Two readings matter before you act on either. A single quarter moving 15 percent is seasonal and should be logged rather than fixed. Two consecutive quarters moving more than 10 percent in the same direction is structural, and that is the point where you stop tuning and re-examine the triage process itself, because a persistent drift that survives four targeted repairs is a structure problem.',
          alsoMoves:
            'The band comparison tells you which of the three repairs is still worth buying, and it is the only place where your segment affects a decision rather than just a target. If your cost is above the band but your deflection already sits at 50-65 percent, buying more deflection is money spent on a lever you have already pulled, and the gap must be in escalation or capacity instead. It also turns the quarterly targets in step 6 into absolute numbers, so a 10 percent cost reduction can be translated into the ticket price your segment expects, and it tells you when to stop: once you are inside the band, further cost cuts come out of service quality rather than out of waste.',
          backfire:
            'The band comparison backfires when it drives the target instead of describing the result. Moving your internal target to match the band, or redefining which segment you belong to so that the band moves with you, produces a green number without a single operational change, while the customer experiences exactly the same support. The other version is reacting to a seasonal swing: a quarter that drops 15 percent on a holiday or a launch week gets treated as structural drift, you cut the cost base just before volume returns, and the next quarter pays for it in response times. Act only on a drift that has survived two consecutive quarters, and record the seasonal explanation next to the number when you log it.',
        },
      ],
    },
    zh: {
      intro:
        '支持预算在一块看板上看不出问题，往往是三个地方同时错了，而第一个错的是分母。只用底薪算出来的单工单全负荷成本会低估 20-30%，而这张表上的每个杠杆都是按这个底座的百分比报价的——在低报的底座上省下来的钱，根本不是省下来的。接着是两个「在人被消耗之前就把活拿走」的杠杆。拦截先来，而且只有在覆盖与拦截被并排读时才成立：覆盖高而拦截低是搜索与分类的失败，覆盖低而拦截高是内容缺口。升级随后，因为一线结案率低于 70% 意味着二线的小时数花在了本该由一线关掉的工单上。容量排在最后，因为它是唯一要花钱的修法，而且应该用 Erlang-C 按高峰到达率、平均处理时长与缩减率来解，而不是按现有编制来解。行业带对比收尾，它描述的是前四项修复的结果，而不是原因。全篇口径：单工单成本 =（薪资 + 福利 + 薪资税 + 间接费用 + 工具费 + 管理分摊）÷ 同一自然月内已解决工单数，这个分母在动手测任何杠杆之前就固定一次，因为被拦截的工单必须在你比较的每个月里用同一种方式计数。',
      rows: [
        {
          priority: 1,
          metric: '单工单全负荷成本 ——（薪资 + 福利 + 薪资税 + 间接费用 + 工具费 + 管理分摊）÷ 同一自然月内已解决工单数',
          fixFirst:
            '先修成本底座，因为下面三个杠杆全都按这个数字的百分比报价，底座错了，每个杠杆都读不出来。最常见的两个错：一是只算底薪不算全负荷（美国按 1.30x 底薪、中国 1.40-1.50x 补上福利、薪资税与间接费用），二是把管理分摊整个漏在分子之外。在动任何东西之前，先把三条口径写下来：分子只覆盖支持团队；分母取同一个自然月内已解决的工单数；被拦截的工单不进分母，因为它没有消耗任何 agent 时间。然后按层级分开重算——一线和二线的处理时长差好几倍，混在一起的数字会把这件事藏起来。如果算出来落在你所在细分的区间之外（SMB SaaS 约 USD 8-15 / 工单，中端 USD 15-30，企业级 USD 30-100），你才知道自己到底是真贵，还是只是跟所有人算法不一样。',
          alsoMoves:
            '一个可信的底座决定另外三处修复值不值得做。同样的降本 10%，落在一个 SMB 工单上是 USD 0.8，落在一个企业级工单上是 USD 3，所以你的杠杆次序由你的分母决定，不存在一张通用次序表。它同时给出步骤 5 里每个场景的换算汇率：KB 扩展报价是降本 10-15%，AI 机器人报价是降本 30-40%，这些百分比只有落在正确的底座上才变成金额。按层级拆开还能告诉你容量（第四行）到底该不该动——成本高如果来自二线升级的小时数，该动的是路由；成本高如果来自一线每单耗时，该动的是拦截或者更短的处理时间。',
          backfire:
            '让单工单成本变好看的最快办法是改定义而不是改运营，这也是这张表最常被"做"出来的方式：把外包发票挪出分子、把管理分摊换一个成本中心挂、或者把分母从"已解决工单数"换成"进线工单数"，都能在不改变任何一张工单处理方式的前提下让数字变低。最阴的是换分母：那个月你拦截了三分之一的工单，已解决工单数就少了，同一份 agent 薪资除以更少的单位，单工单成本于是上升——而你其实省了钱。所以不要把换了分母口径的月份和没换的月份放在一起比，口径要在动手之前钉死，不是看到数字方向之后再定。',
        },
        {
          priority: 2,
          metric: '拦截率 —— 无任何人工介入即结案的工单 ÷ 进线工单数，且必须与同一批工单的 KB 覆盖率并排给出',
          fixFirst:
            '第二个修拦截率，因为它是这张表上唯一一个在人被消耗之前就把工作拿掉的杠杆，也是最便宜的一个——要的是内容，不是人头。取过去 90 天工单，逐单打解决路径标签，再和覆盖率配对，因为这两个数并排才告诉你接下来该开的是两个完全不同的项目之一：覆盖率高、拦截率低是找得到的问题——文章在、用户找不到，该修搜索、标题和分类；覆盖率低、拦截率低是内容缺口，该写文章。SaaS 团队通常落在 20-35%，50-65% 是世界级；指南里的归因是知识库贡献 15-25 点、AI 机器人在此之上再加 30-50 点、社区论坛再加 5-10 点。先把打标规则定下来：一条没打标的拦截会被按"消耗了一个小时"计入，所以大部分团队低报了自己的拦截率。',
          alsoMoves:
            '拦截会顺带把升级率压下去，而且不需要碰路由：被拦截的工单根本没进一线，就更不可能成为升级候选，二线接到的量按同样比例缩水。它也动容量——你喂进 Erlang-C 模型的到达率是拦截之后的到达率，不是之前的，用毛到达率建的模型会按你拦截率的那一部分把团队配大。在成本底座上它的方向还跟直觉相反：分母口径固定成"已解决工单数"之后，被拦截的工单离开分母，于是"每个由人处理的工单"成本在涨，总支持成本在跌。所以成本必须和拦截率一起读，绝不能单看。',
          backfire:
            '拦截会在打标规则把"没人真的解决"的工单也算成拦截的时候反噬。最常见的规则是"读了知识库文章、24 小时内没回复就算拦截"，它会把没人回复的客户悄悄算成拦截，于是拦截率一路涨、真实提问量一点没降。代价是延后出现的：那些工单要么重启，要么以新工单的形式回来重新起表，于是重启率和进线量一起上，而你在优化的那个指标漂亮得不像话。第二个失败是拦错了人群：如果你量最大的那些问题其实是伪装的升级——账单争议、故障、数据导出——AI 机器人会接、接不住、再转给一个还得重建上下文的人，于是首响变好了，解决时长反而变差。',
        },
        {
          priority: 3,
          metric: '升级率 —— 从一线转交到二线或三线的工单 ÷ 进线工单数，并把"可避免的升级"单独标出来',
          fixFirst:
            '第三个修升级率，因为一线的工作漏到排班表上最贵的那几个小时里，主要就是从这里漏的。二线和三线的处理时长是一线的数倍，所以砍掉 15-25% 的可避免升级，是不动一篇新文章能拿到的最大单时节省。动手前先把升级分成可避免与不可避免：可避免指一线缺上下文、缺权限或缺文章，该改的是路由规则；不可避免指这活真的需要专家，该改的是交接质量，不是砍人头。要给交接本身装上仪表——进了哪个队列、等了多久没人认领、引用了哪篇文章或哪个团队。一张在无主队列里躺了 20 小时、然后才升到二线的工单，不是专家级升级，它是付了两次钱的路由事故。',
          alsoMoves:
            '升级控制会连带动首响时长和成本。交接一次就加上几分钟到几小时的等待，因为工单在移动过程中没人认领，这段等待时间原样落进每个渠道的响应时间指标。它也把成本底座按层级拆开：同一张工单一线花 10 分钟、二线花 90 分钟，它是一个单位成本、里面装着两种成本，拆开才知道升级到底是路由决定还是能力缺口。还有，升级量是支持成本表上波动最大的一行，控住它之后步骤 6 的季度目标才可能"够得着"，而不只是能预测。',
          backfire:
            '升级控制会在"把升级压回一线"的时候反噬。如果一线本来就处理不了这种活，硬压着一线结案，升级率在纸面上变好，活的却以重启工单的形式回来，而重启工单要付第一次尝试的全额加第二次。第二个版本是路由规则把所有说不清的活都丢给二线：升级率达标了，二线悄悄堆起队列——专家整天在做本该一线关掉的事，总单工单成本反而上去了，而升级率那个指标读起来很健康。首触结案率要和升级率一起看，绝不能单看其中任何一个。',
        },
        {
          priority: 4,
          metric: '高峰容量 —— Erlang-C 模型算出的所需 agent 数减去实际排班人数，按渠道与班次分别算',
          fixFirst:
            '第四个才动容量，因为它是这张表上唯一一个修复要花钱的杠杆，也应该是最后才碰的。按渠道分别跑模型：高峰小时到达率、平均处理时长、75-85% 的目标占用率、以及 25-35% 的收缩率（休息、培训、休假），然后把算出来的所需人数和你实际在岗的人数对比。跑模型的目的不是给招人找理由，而是判断到底有没有容量问题——一个在 85% 占用率下依然持续存在的队列是人力问题；一个只在每天最后两小时出现的队列是排班问题，改排班表就行，一分钱不花。渠道组合也要看：以会话为主的团队每个 agent 每天处理约 30-50 张工单，邮件为主 15-25，机器人辅助 50-80。',
          alsoMoves:
            '容量决定立刻就动成本底座，因为人头是分子里最大的一行；它同时朝两个方向动响应时间。按峰值配足的人手能缩短等待，也就缩短了每张工单里由等待驱动的那部分处理时长；但按峰值零缓冲配人，会把占用率推到 90% 附近，而在那个水位上排队论告诉我们，一次小的到达尖峰会造成不成比例的等待。它也决定另外三处修复是不是真的：拦截、升级控制和底座口径都会改变负荷，所以排班模型应该在每一处改完之后重跑，而不是年初算一次就定一年。',
          backfire:
            '拿招聘去修一个坏掉的流程，是修指标最贵的办法。如果队列是因为路由规则把工单送错了队列，或者因为工单躺着 20 小时没人认领，那么加人只是把同一个坏交接的成本乘一个数。第二个失败是占用率：按 100% 在岗工时排人，等于一点缓冲都没有，平时平均看起来不错的首响会在每个班次最后一小时断崖式掉下去，而平均值把这个盖住了。按 75-85% 那个带排人；如果所需人数和在岗人数差得不多，老实的结论是你的流程有问题，不是你的排班表有问题。',
        },
        {
          priority: 5,
          metric: '与行业基准带的距离 —— 你的单工单成本对照所属细分的区间，并连续几个季度追踪',
          fixFirst:
            '把和行业基准带的对比放最后，因为它是上面四项修复的结果，而不是原因之一。每季度对照 Zendesk 与 HubSpot Service Hub 的基准带重算一次，并且比较期间把细分固定住：SMB SaaS、中端与企业级之间差着四倍，拿中端的数字去比 SMB 的带，会读成一场灾难，然后你会用一场恐慌把成本底座毁掉。动手之前有两个读数要分清：一个季度动 15% 是季节性的，记下来而不是修它；连续两个季度朝同一个方向移动超过 10% 才是结构性的，那才是你停止微调、回头检查分流流程本身的时候——因为一个躲过四次针对性修复仍然存在的漂移，是结构问题。',
          alsoMoves:
            '基准带告诉你三个修复里还有哪个值得买，而且是唯一一处"细分"会影响决策而不只是影响目标的地方。如果你的成本高于区间、而拦截率已经在 50-65%，那再买拦截就是把钱花在一个你已经拉满的杠杆上，缺口只能在升级或容量那边。它同时把步骤 6 的季度目标落成绝对值：降本 10% 可以换算成你的细分预期的单工单价格；它还告诉你什么时候该停——一旦进了带，进一步压成本就是从服务质量里出，而不是从浪费里出。',
          backfire:
            '基准对比会在它变成目标而不是描述的时候反噬。把内部目标改成和基准带一样，或者重新定义自己属于哪个细分好让带跟着你走，都能得到一个绿的数字，而没有一次运营改动发生——客户体验还是老样子。另一个版本是对季节性波动作出反应：假期或上线周掉 15% 的那个季度被当成结构性漂移，于是在量回来之前砍掉成本底座，下一季度用响应时间和满意度把它还回去。只有连续两个季度都出现的漂移才值得动手；记录季节性解释时，把它和数字写在同一行。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A helpdesk can be green on every panel and still be unable to take on more work, and seven conditions decide whether it can. The costing base has to be rebuilt from payroll rather than from a spreadsheet of base salaries, because the gap between the two is the 20-30 percent that every percentage-quoted saving is measured against. Deflection only counts when a resolution path is tagged rather than inferred: a ticket counts as deflected only when the resolution was a knowledge-base article read with no reply inside 24 hours, a bot resolution, or a community thread, and coverage is read beside deflection rather than instead of it. Capacity then needs Erlang-C output against actual headcount per channel per shift, with occupancy held at 75-85 percent and shrinkage of 25-35 percent removed before the agent count, because a shift roster built on gross headcount misses its own peak. First response and resolution are measured by channel and by priority separately, because a blended figure hides the one queue that is failing. A first-contact resolution rate under 70 percent points at triage or coverage rather than at agent skill, while a rate above 80 percent means the first line is closing work a specialist should have taken. Escalation paths need a named owner for every tier and no ticket may sit unowned beyond a stated number of hours. The optimization scenarios get modelled before anything is cancelled, so the cost of a bot is compared against the cost of the hours it replaces. And the band comparison runs last, on resolved tickets rather than on received ones.',
      items: [
        {
          step: 1,
          label: 'Costing base pinned: numerator scope, denominator convention and per-tier split all written down',
          gate: 'One written convention covering three things, recomputed this month: agent pay, benefits, payroll tax, overhead, tooling and management allocation in the numerator, the fully-loaded multiplier applied at 1.30x base in the US and 1.40-1.50x in China, tickets resolved in the same calendar month as the denominator, and the result computed separately for tier one and tier two.',
          blockIf:
            'If the denominator convention is not fixed, nothing downstream can be read: deflection reduces the number of resolved tickets and therefore raises your cost per ticket even when it saves money, so steps 2 and 5 will argue about the same saving from opposite directions. While the base is unstable, the cost target set in step 6 is a target against a moving definition, and part of the quarterly drift you will see in step 7 turns out to be arithmetic rather than operations.',
        },
        {
          step: 2,
          label: 'Deflection measured and paired with KB coverage on the same 90-day ticket population',
          gate: 'The last 90 days of tickets tagged by resolution path, the deflection rate reported next to KB coverage for the same population, the top 20 percent of issues by volume broken out on their own, the current rate placed against the 20-35 percent typical and 50-65 percent world-class bands, and every high-coverage-low-deflection and low-coverage-low-deflection segment listed separately.',
          blockIf:
            'Without coverage paired against deflection you cannot tell a content project from a findability project, and you will fund the wrong one: rewriting articles when the problem is search taxonomy leaves deflection flat and costs weeks. Without a written tagging rule, the deflection rate you report moves with your tagging, which makes the cost comparison in step 5 unreadable and the target in step 6 impossible to falsify.',
        },
        {
          step: 3,
          label: 'Capacity modelled per channel with peak arrival rate, handle time and shrinkage filled in',
          gate: 'A model run separately for each channel with the peak-hour arrival rate, the average handle time, a target occupancy of 75-85 percent and a shrinkage allowance of 25-35 percent, producing required agents per shift; the gap against rostered headcount recorded per channel, with any channel showing a gap above 2 agents named explicitly.',
          blockIf:
            'If the model has not been run, the queue you are complaining about cannot be separated from a routing defect, and the first response to it will be hiring, which adds the largest line in the numerator while leaving the cause untouched. If occupancy is modelled above 85 percent, the model describes a roster with no buffer, where a small arrival spike produces a wait far larger than the average implies, and you would size the team against a number your own arrival pattern will break.',
        },
        {
          step: 4,
          label: 'Response time and first-contact closure read per channel against their own targets',
          gate: 'Each channel with its own median first response time and first-contact closure rate, compared against the target set in step 1 and against the tier bands, every channel that misses recorded separately rather than averaged, and chat, email and ticket kept as three columns rather than one blended number.',
          blockIf:
            'A blended average across channels hides the one channel that is broken, because a fast chat queue and a slow email queue average into something that looks tolerable, and you end up repairing the channel that was never the problem. If this gate fails, the routing work assumed in step 3 was sized on a blended arrival rate, so the staffing numbers for every channel are wrong in opposite directions and the roster decision built on them is wrong too.',
        },
        {
          step: 5,
          label: 'Scenarios modelled with both the volume change and the cost change attached to each lever',
          gate: 'Each of the three levers on its own line with the volume and the cost attached: knowledge base expansion adding 10-15 percent deflection for a 10-15 percent cost reduction, an AI bot adding a further 30-40 percent deflection for a 30-40 percent reduction, and routing that removes 15-25 percent of avoidable escalation, with the resulting cost per ticket recomputed on the convention fixed in step 1.',
          blockIf:
            'If the levers are quoted only as percentages with neither a volume nor a cost attached, you cannot compare them with each other, because a 30-40 percent deflection gain and a 15-25 percent escalation cut land on different parts of the cost sheet and only one of them moves the per-ticket number. Step 6 then receives targets nobody can defend, and the overlap between scenarios stays hidden, since the same tickets can be counted as deflected and as escalated twice.',
        },
        {
          step: 6,
          label: 'Quarterly targets published with a baseline value and a re-computation date',
          gate: 'Four numbers on one page, each carrying the value it starts from and the date that baseline was computed: cost per resolved ticket down 10 percent, deflection rate up 5 percentage points, first-contact closure rate up 5 percentage points, and customer satisfaction above 85 percent, with the segment band each number is measured against written on the same page.',
          blockIf:
            'A target with no baseline value is an opinion, and at the end of a quarter you cannot tell whether you missed it or moved it. This gate also fails when the four numbers are not read together: cost can fall because tickets stopped being handled properly, deflection can rise because tagging changed, and satisfaction can hold while both move, so a target built on one number alone will be met by a change you would rather undo.',
        },
        {
          step: 7,
          label: 'Quarterly band comparison logged with seasonality and structural drift kept apart',
          gate: 'Your cost per resolved ticket compared against the band for your segment (SMB SaaS USD 8-15, mid-market USD 15-30, enterprise USD 30-100, consumer USD 3-8, e-commerce USD 4-10) once per quarter on the same segment, the seasonal band of plus or minus 15 percent marked beside each reading, and every drift above 10 percent carried forward until it appears again in a second consecutive quarter.',
          blockIf:
            'Without this gate, structural drift gets diagnosed on a single quarter, and a 15 percent seasonal swing triggers a cost cut that lands just before volume returns, so the next quarter pays for it in response times and satisfaction. Holding a drift for two quarters also blocks the opposite error: calling a one-quarter move in the right direction a success and closing the work while the process has not actually changed.',
        },
      ],
    },
    zh: {
      intro:
        '一个支持团队可能在每块看板上都是绿的，却仍然接不了更多活，能不能接得住取决于七件事。成本底座要按薪资表重算，而不是拿底薪拼一张表，因为两者那 20-30% 的差正是所有「按百分比省」的口径基准。拦截必须靠打标而不是靠推断才算数：只有当结案路径是「读了知识库文章且 24 小时内无回复」「机器人直接解决」或「社区帖子」时，这张工单才算被拦下，而且覆盖率要和拦截率并排读，不能互相替代。容量随后要拿 Erlang-C 的解去对每渠道每班次的实际编制，占用率压在 75-85%，缩减率按 25-35% 先扣掉再谈人数，因为按毛编制排的班表必然错在自己的高峰上。首响与解决时长随后按渠道、按优先级分开量，混在一起的数字会把唯一坏掉的那条队列藏起来。一线结案率低于 70% 指向分流或覆盖，而不是 agent 技能；高于 80% 则意味着一线在关本该由专家接的工单。升级路径要写明每层的归属人，且超过约定小时数不能没有负责人。优化方案在取消任何东西之前先建模，好让机器人的成本与它替代掉的人工小时成本可比。行业带对比放在最后，且按已解决工单而不是按收到的工单算。',
      items: [
        {
          step: 1,
          label: '成本底座钉死：分子范围、分母口径与分层级拆分都写下来',
          gate: '一条写下来的口径覆盖三件事，并且本月重算一次：分子含薪资、福利、薪资税、间接费用、工具费与管理分摊，按全负荷倍数折算（美国 1.30x 底薪、中国 1.40-1.50x），分母取同一自然月内已解决的工单数，一线与二线分别算出一条成本。',
          blockIf:
            '分母口径没固定，下面什么都读不出来：拦截会减少已解决工单数，于是单工单成本反而上升，哪怕你省了钱，步骤 2 和步骤 5 会从两个相反方向争论同一笔节省。底座不稳时，步骤 6 设的成本目标就是对着一个会动的定义设的，而步骤 7 的季度对比里，有一部分漂移其实是算术而不是运营。',
        },
        {
          step: 2,
          label: '拦截率已打标，并与同一批 90 天工单的 KB 覆盖率并排给出',
          gate: '过去 90 天工单逐条打了解决路径标签，拦截率与同一批工单的 KB 覆盖率并排给出，量最大的前 20% 问题单独拆出来，当前值对照 20-35% 的常见带与 50-65% 的世界级带标注位置，"高覆盖低拦截"与"低覆盖低拦截"两类分别列清单。',
          blockIf:
            '没有覆盖率配对，你分不清这是内容项目还是可发现性项目，最后会为错的那个付钱：文章写得够多但问题出在搜索分类时，改文章会让拦截率原地不动，还白花几周。没有写下来的打标规则，你报的拦截率就是跟着打标口径动的数，步骤 5 的成本对比读不懂，步骤 6 的目标也无法证伪。',
        },
        {
          step: 3,
          label: '按渠道跑过容量模型：高峰到达率、处理时长与收缩率都填了',
          gate: '每个渠道单独跑一次模型，填入高峰小时到达率、平均处理时长、75-85% 的目标占用率与 25-35% 的收缩率，算出每班次所需 agent 数；与在岗排班人数的差额逐渠道记录，任何缺口超过 2 人的渠道点名列出。',
          blockIf:
            '模型没跑，你抱怨的那个队列就没法和路由缺陷分开，而你对它的第一反应会是招人——那会在原因原封不动的同时，给分子加上最大的一行。占用率如果按 85% 以上建模，模型描述的就是一个没有缓冲的排班，一次小的到达尖峰就会产生远超平均值的等待，等于照着一个自己到达模式必然打破的数去配人。',
        },
        {
          step: 4,
          label: '各渠道的响应时长与首触结案率分别对各自目标读出来',
          gate: '每个渠道各自给出中位首响时长与首触结案率，分别对照步骤 1 设定的目标与各层级基准带，未达标的渠道逐个记下来而不是取平均；会话、邮件、工单三列分开，不合并成一个数。',
          blockIf:
            '跨渠道取平均会盖住真正坏掉的那一个——快的会话队列和慢的邮件队列平均之后看起来还行，于是你最后修的是从来就没坏过的那个渠道。这一条不过，就说明步骤 3 里的路由工作是用一个混在一起的到达率配的，每个渠道的人力数字都朝相反的方向错，架在它上面的排班决定也就一起错了。',
        },
        {
          step: 5,
          label: '每个杠杆的场景都同时挂上工单量变化与成本变化',
          gate: '三个杠杆各自一行，同时挂上量变与成本变：KB 扩展带来拦截 +10-15 个百分点与成本 -10-15%，AI 机器人在此基础上再加拦截 +30-40 个百分点与成本 -30-40%，路由改造消除 15-25% 的可避免升级；结果的单工单成本按步骤 1 固定的口径重算一遍。',
          blockIf:
            '只报百分比、不挂量也不挂成本，你就无法把几个杠杆互相比较，因为 30-40 个百分点的拦截和 15-25% 的升级削减落在成本表的不同部位，只有其中一个会改变单工单那个数字。步骤 6 于是拿到一组没人能辩护的目标，场景之间的重叠也继续藏着：同一批工单被同时算成"被拦截"和"已升级"两次。',
        },
        {
          step: 6,
          label: '季度目标公布，每个数字带基线值与复算日期',
          gate: '一页四个数字，每个都带起始值与基线计算日期：单工单成本降 10%、拦截率升 5 个百分点、首触结案率升 5 个百分点、客户满意度高于 85%；同一页写明每个数字对照的是哪个细分的基准带。',
          blockIf:
            '没有基线值的目标只是意见，季度末你无法分辨是自己没做到，还是把目标挪了。这一条还会在四个数字没有放在一起读时不过：成本可以因为工单没被好好处理而下降，拦截率可以因为打标变了而上升，满意度可以在前两者同时动的时候保持不变——只盯一个数字设的目标，会被一个你更想撤回的改动"达成"。',
        },
        {
          step: 7,
          label: '季度基准对比留痕，把季节性与结构性漂移分开记',
          gate: '每季度用同一细分把自己的单工单成本对照基准带比一次（SMB SaaS USD 8-15、中端 USD 15-30、企业级 USD 30-100、消费级 USD 3-8、电商 USD 4-10），每次读数旁标注 ±15% 的季节性区间，所有超过 10% 的漂移一直挂着，直到它在连续第二个季度里再次出现。',
          blockIf:
            '没有这一条，结构性漂移会被一个季度就诊断掉：一次 15% 的季节性摆动就会触发一次降本，而这个降本恰好发生在量回来之前——下一季度要用响应时间和满意度把它还回去。把漂移挂满两个季度也同时挡住另一个错误：把一个季度方向正确的波动当成成功，然后收工，其实流程一点没变。',
        },
      ],
    },
  },
};
