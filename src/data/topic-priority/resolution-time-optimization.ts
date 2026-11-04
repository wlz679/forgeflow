// P166 —— T 类（Customer Support）主题「resolution-time-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= 步骤 1…步骤 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// ⭐ 与相邻两个 T 类主题的边界（三个主题都会说「工单」，口径必须互不串味）：
//   · 本主题 = 解决时长：算到**最终结案**，等待、升级、客户回复的时间全部计入，
//     按优先级分层给出中位数与 p90。
//   · first-response-time-optimization = 只算**首次人工响应**。
//   · support-cost-optimization = 含人力分摊的单位工单成本。
//   ⇒ 本文件不定义另外两个指标，只在「顺带影响」里点名。
//
// 口径纪律：
//   · 解决时长 = 工单创建 → 最终结案（含所有等待与升级时延）
//   · 重启率 = 结案后 14 天内被重开的工单 ÷ 同期结案工单数（分母是结案数，不是进线数）
//   · p90 按优先级分层给，基准带：P1 <4h、P2 <24h、P3 <72h、P4 <168h
//   · 升级率健康带 10-20%；FCR 目标带 70-80%（低于 70% 是分流缺口，高于 80% 是一线过度解决）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Resolution time is the metric most likely to improve on paper. It runs from ticket creation to a status change that some helpdesks set automatically once a fixed window elapses, it is blended across priorities so a fast tier-four queue hides a dead tier-one queue, and it is improved by pushing work down to the first line whether or not the first line can actually close it. The repair starts by testing whether the closures are real, and the test is the reopen rate over the following 14 days: a ticket that comes back was not resolved, it was abandoned, and every percentage computed on top of it is inflated. The second repair is first-contact resolution, the largest single lever on p90, because every escalation adds 4 to 24 hours of handoff latency and a first-contact rate under 70 percent points at triage or knowledge-base coverage rather than at agent speed. A rate above 80 percent is the opposite failure, a first line closing work that a specialist should have taken and starving tier two. The third repair is the hand-off design itself: criteria for moving from tier one to tier two to tier three, a stated service level per tier, and a named owner so no ticket ages without one. Only after that does intake volume matter. Resolution time here runs from ticket creation to final closure, waits, escalations and customer replies included, reported as median and p90 per priority tier and never blended.',
      rows: [
        {
          priority: 1,
          metric: 'Resolution time definition — ticket creation to final closure, including wait, escalation and customer-reply time, reported as median and p90 per priority tier',
          fixFirst:
            'Fix the definition first, because every row below is read off this number, and the two most common ways of counting it make the metric impossible to act on. The first counts a ticket that the helpdesk closed automatically on a timer as resolved: the moment the auto-close window expires, your p90 collapses to whatever that timer is set to, and the metric stops describing anything a customer experienced. The second stops the clock while the ticket waits for the customer to reply, which removes the longest single stretch of wait from a number whose whole purpose is to measure waiting. Write the rules down before you pull the data: the clock runs from creation to final closure, every wait counts, an auto-closed ticket counts only if the customer confirmed, and each priority tier gets its own median and p90.',
          alsoMoves:
            'A fixed definition is what makes the reopen audit in row two worth running, because a closure you cannot trust is exactly what that audit is designed to catch. It also settles what counts as a miss when you compare against the bands, and it stops the p90 in row three from being a median in disguise: with tiers mixed, one slow priority class drags the whole distribution, while per-tier percentiles show you which class broke. And a definition that includes customer wait time changes what you are allowed to do about it, because a number that excludes the wait invites you to work on the half of the delay you control and to ignore the half the customer complains about, which is usually the larger half.',
          backfire:
            'The definition can be tuned in the flattering direction, which is how a resolution number improves without a single ticket being handled better. Counting auto-closed tickets, restarting the clock at each hand-off, and excluding customer replies from the duration all shorten the measurement while the customer waits exactly as long as before. The subtle one is per tier versus blended: a blended median across priorities can look healthy because the volume sits in the slow tier while the fast tier carries a p90 nobody would accept, and it also lets you publish one number in a quarterly review instead of four. Fix the definition, report per tier, and refuse to publish a blended figure even when it is the tidier one.',
        },
        {
          priority: 2,
          metric: 'Reopen rate — tickets reopened within 14 days of a resolved status, divided by tickets closed in the same period',
          fixFirst:
            'Check whether your closures are real before you optimise them, because a resolution metric built on closures that do not hold sends you chasing the wrong thing. Pull every ticket closed in the last 90 days, look for any reopened within 14 days, and divide by the tickets closed in that window — the denominator is closed tickets, not created tickets, because the question you are asking is how trustworthy your closures are. The bands are tight: below 5 percent is the target, 10-20 percent is a warning, and above 20 percent means agents are closing tickets without finding the cause. Trace the result by agent, by issue type and by the knowledge base article that was cited, because the pattern is almost always one of those three rather than random. Read it as a quality signal rather than a discipline problem: a reopen means the fix did not hold, and the second attempt costs the full price of the first one plus the second.',
          alsoMoves:
            'The reopen rate decides whether the first-contact closure rate in row three is real. A high closure rate bought by closing tickets that cannot actually be closed shows up here first, and until this number is clean, pushing closure rate upward only moves the problem downstream. It also changes the volume arithmetic in every other row, because a reopened ticket is a second full handling cycle: it adds to the escalation count, to the resolution hours and to the cost of a resolved ticket, which is why a 15 percent reopen rate can dominate a 20 percent improvement somewhere else. It is also the fastest of these five signals to move, because it is a closure-quality fix rather than a routing or a staffing fix.',
          backfire:
            'The reopen rate backfires when you make the closures look better rather than the problems smaller. The two usual tricks are worse than the disease: reclassifying a reopened ticket as a new ticket resets its clock and hides the reopen entirely, and delaying the reopen past the 14-day window makes the number fall while the customer experience is unchanged. A third version closes tickets on a customer no-reply timer, which lowers the reopen count because the ticket was never really closed at all, and it pushes the same question back into the queue as a fresh ticket. Track the count of customers who arrive twice, not only the count of reopen events, so that reclassification cannot hide it.',
        },
        {
          priority: 3,
          metric: 'First contact resolution rate — tickets closed by the first line divided by tickets created, split by issue category',
          fixFirst:
            'Fix the first-contact closure rate third, because it is the largest single lever on the p90 in this table: every escalation between lines adds 4 to 24 hours of hand-off latency, so a 5 point gain in first-line closure removes hours from the worst tickets rather than minutes. Measure it by issue category rather than in aggregate, because the categories behave completely differently and an aggregate hides failures in both directions. Below 70 percent you have a triage or knowledge base coverage gap, and that work belongs to row five. Above 80 percent you have a different problem: the first line is over-resolving, second and third line specialists are starving, and the tickets they should be closing are piling up with nobody who can actually close them. Both ends of that band are worth acting on, and they are opposite repairs.',
          alsoMoves:
            'The first-line closure rate is what the hand-off design in row four has to serve, so it comes first: the escalation criteria are only worth writing once you know which categories the first line is supposed to close. It also feeds the resolution bands directly, because a p90 built out of escalations is a p90 made of hand-off latency, and removing hand-offs moves the number further than any handling-time improvement. And the categories where first-line closure is weak are the same categories that deserve the richest knowledge base articles, which is what makes row five a lever rather than a chore.',
          backfire:
            'The first-contact closure rate backfires when it is bought with closures rather than with capability. Pressing the first line to close ambiguous work, so that the metric rises and the work returns as a reopened ticket, moves row two in exactly the wrong direction and adds a full second handling cycle to the cost of every one of those tickets. The other failure is pushing past 80 percent in categories where a specialist is genuinely required, because the ticket then sits with the first line longer, which is worse for the customer than an honest escalation routed on day one. And a first line with no permission to escalate will always show a beautiful closure rate and a terrible resolution time, so the two numbers have to be read together.',
        },
        {
          priority: 4,
          metric: 'Escalation paths and ownership — escalations to tier two or three per 100 tickets, and the longest age at which a ticket has no named owner',
          fixFirst:
            'Design the hand-off and the ownership rules fourth, because a better first-line closure rate is worthless if the tickets that do escalate sit waiting for a person to pick them up. Write down three things: the criteria that move a ticket up (expertise required, customer tier, age of the ticket), the service level at each line (tier one under 4 hours, tier two under 24, tier three under 168), and the ownership rule that no ticket sits for more than X hours without a named person, with X set no larger than 4 hours. The ownership rule is the one that moves resolution time most, because the failure mode is not a slow expert, it is a ticket nobody admits, and such a ticket appears in no queue report until it is already overdue.',
          alsoMoves:
            'The ownership rule moves the p90 in every tier at once, because an unowned ticket is an unbounded wait no matter how fast the receiving line is. It also decides how much of the work in row three belongs to escalation at all: with a written criterion for what the first line must close, the residual escalations are the ones that genuinely need a specialist, and the escalation rate lands in the 10-20 percent band that means triage is working rather than failing. And a named owner on every escalated ticket is what makes the monthly targets in step 6 auditable, because an escalation rate with nobody attached cannot be followed up when it drifts.',
          backfire:
            'Escalation and ownership rules backfire in two directions. If the ownership window is set tighter than the receiving line can work, every escalated ticket bounces between queues while it waits for someone to accept it, and the p90 of the tier the rule was meant to protect gets worse rather than better. The other failure is routing everything up to protect a clock: tier two receives tickets the first line could have closed, the tier two queue grows, and first-line p90 improves while tier two and tier three resolution times deteriorate, one tier number bought with another tier number. Set the window against the receiving line service level, and read the p90 of every tier rather than only the one you were trying to protect.',
        },
        {
          priority: 5,
          metric: 'KB coverage against deflection — share of inbound questions that have a matching article, next to the share actually resolved through the knowledge base',
          fixFirst:
            'Work on intake volume last, because unlike the four rows above it does not shorten the resolution of any ticket that already exists: it removes questions before they become tickets, and its effect on the p90 is a queue effect rather than a handling effect. It is still worth doing, and worth doing properly, because the pairing tells you which project you are funding. High coverage with low deflection means the article exists and nobody finds it, so you fix search, titles and taxonomy. Low coverage with low deflection means there is no article, so you write one. The guide puts the achievable contributions at 15-25 percent from the knowledge base alone, 30-50 percent once an AI bot sits on top of it, and another 5-10 percent from a community forum, and it names article freshness as the most common silent drag, because a stale article reads as coverage and behaves like a dead end.',
          alsoMoves:
            'Deflection moves the first-contact closure rate in exactly the categories where it matters, because a question answered before it reaches an agent never becomes a candidate for escalation. It also shortens the queue that every other row is trying to shorten, so the same staffing and routing work buys more when there is less traffic on it, and a team that has just improved its first-line closure rate should check deflection before it concludes the rate is the limit. Deflection is also the only lever on this list that lowers support cost per ticket in the same period, because work that never arrives carries no handling time at all.',
          backfire:
            'Deflection backfires when the wrong tickets are intercepted. If a category that genuinely needs a person — outages, billing disputes, data exports — is deflected by a self-service flow that cannot close it, the customer contacts you a second time, so both the first-response metric and the resolution metric get worse while the deflection rate reads beautifully. The second failure is confusing coverage with deflection: rebuilding a large library that nobody can search raises coverage, leaves deflection flat, and costs months of writing for nothing. And deflecting a question the customer already escalated once gives away the trust that the second attempt was supposed to rebuild. Deflect only what your articles genuinely close.',
        },
      ],
    },
    zh: {
      intro:
        '解决时长是最容易「在纸面上改善」的指标：它常从工单创建算到一个状态变更，而有些 helpdesk 到点就自动改状态；它常按优先级混在一起算，于是四级的快队列盖住一级的死队列；它还常靠「把更多活压给一线」来改善，不管一线其实关不掉。修复的第一步是检验结案是不是真的，检验方法就是看 14 天内的重启率——又回来的工单没有被解决，它只是被放弃了，在它之上算出来的每个百分比都被抬高了。第二步是一线结案率，它是你 p90 上最大的一个杠杆，因为每一次升级都要加 4-24 小时的交接延迟，而一线结案率低于 70% 指向分流或知识库覆盖，不是 agent 手速；高于 80% 则是另一种毛病——一线把本该给专家的活关掉了，二线因此饿死。第三步是交接本身的设计：从一线到二线到三线的判据、每层写明的时限、以及一个明确归属人，好让任何工单都不会在无人认领的状态下变老。进线量排在这之后。全文口径：解决时长从工单创建算到最终结案，等待、升级与客户回复全部计入，按优先级分层给出中位数与 p90，绝不混算。',
      rows: [
        {
          priority: 1,
          metric: '解决时长口径 —— 从工单创建到最终结案，含等待、升级与客户回复的时间，按优先级分层给出中位数与 p90',
          fixFirst:
            '先修口径，因为下面每一行都从这个数字读出来，而最常见的两种算法会让这个指标根本没法行动。第一种是把到点自动关闭的工单算成已解决：自动关闭的窗口一到，你的 p90 就塌到那个计时器上，从此这个数字描述不了客户经历的任何东西。第二种是把"等客户回复"那段从时钟里抠掉，于是时延里最长的一块等待被拿走了。在拉数据之前先把规则写下来：时钟从创建走到最终结案；所有等待都算进去；自动关闭的工单只有客户确认过才算结案；每个优先级各自出中位数和 p90。',
          alsoMoves:
            '口径钉死了，第二行的重启率审计才值得跑——因为"不可信的结案"正是那次审计要抓的东西。它还决定第一步的"未达"怎么判，也防止第三行那个 p90 其实是伪装成 p90 的中位数：混层时某一个慢优先级会把整条分布拖走，分层之后你才看得见是哪一层坏了。最后，含客户等待时间的口径会改变你能做的事——一个把等待排除掉的数字，会诱使你只优化自己能控制的那半段，而忽略客户真正抱怨的那半段，而后者通常还更大。',
          backfire:
            '口径也可能被往好看的方向调，这就是解决时长变好而工单处理一点没变的那条路径：把自动关闭的工单算进去、每交接一次就把时钟重置、把客户回复时间排除在时长之外，三种做法都会让度量变短，而客户等的时间一点不变。更隐蔽的是分层与混层：按优先级混算出的中位数可能看起来很健康，因为量都压在慢的那一层，而快的那一层扛着一个没人会接受的 p90；混算还能让你在季度复盘里只报一个数，而不用报四个。先修口径，然后分层报，并且拒绝发布混在一起的数字，哪怕那个数字更整齐。',
        },
        {
          priority: 2,
          metric: '重启率 —— 结案后 14 天内又被重开的工单数 ÷ 同一期间结案的工单数',
          fixFirst:
            '在优化结案之前，先检验结案是不是真的，因为建立在"不成立的结案"上的解决指标，会把你引向错误的方向。把过去 90 天结案的每张工单查一遍，看有没有在 14 天内被重开，再除以同一个窗口里的结案工单数——分母是结案数不是进线数，因为你问的是"我的结案有多可信"。这几个带很紧：低于 5% 是目标，10-20% 是警告，超过 20% 说明你的 agent 是在没找到根因的情况下把单子关掉。结果要按 agent、按问题类型、按引用的知识库文章拆开，因为模式几乎总是这三者之一，而不是随机的。把它当质量信号读，不要当纪律问题读：一次重启意味着这次修复没站住，而第二次尝试要付第一次的全价加第二次。',
          alsoMoves:
            '重启率决定第三行那个一线结案率是不是真的——靠关掉根本关不掉的单子换来的高结案率，会最先在这里露馅，而在这个数干净之前，把结案率往上推只是把问题挪到下游。它还改变其余每一行的量纲算术：一张重启工单就是第二个完整处理周期，它会加进升级数、加进解决小时数、加进已解决工单的成本，所以 15% 的重启率完全可能盖过别处 20% 的改善。而且它是这五个信号里最快能动的，因为它是关闭质量的修法，不是路由或排班的修法。',
          backfire:
            '重启率会在你美化结案而不是缩小问题的时候反噬。常用的两个手法比病本身更糟：把重启的工单重新归类成新工单会把它的时钟重置、彻底藏掉重启；把重启推迟到 14 天窗口之后，数字就掉下来了，而客户体验一点没变。第三个版本是按客户不回信的超时把工单结掉，重启数于是变少——因为那张单子本来就没真正关过，于是同一个问题以新工单的形式回到队列。盯"来过两次的工单数"，而不只是盯"重启事件数"，重分类就藏不住。',
        },
        {
          priority: 3,
          metric: '一线结案率 —— 由一线关闭的工单 ÷ 进线工单数，按问题类别拆开',
          fixFirst:
            '第三个修一线结案率，因为它是你这张表里 p90 上最大的单一杠杆：每跨一级就加 4-24 小时的交接时延，一线结案率提升 5 个点，去掉的是最差那批工单上的几小时，不是几分钟。要按问题类别算，不要只算一个总数，因为不同类别的行为完全不同，总数会把两个方向的问题同时藏住。低于 70% 是分流或知识库覆盖缺口，那部分活属于第五行；高于 80% 则是另一个问题：一线在过度解决，二线三线专家正在饿死，本来该他们关的单子堆在那里没人能真正关掉。这条带的两端都值得动手，而且修法正好相反。',
          alsoMoves:
            '一线结案率正是第四行那条交接设计要服务的东西，所以它排在前面：只有先知道哪些类别该由一线关掉，升级标准才值得写。它也直接喂给解决时长那条带，因为一个 p90 如果是由升级堆出来的，那个 p90 就是交接时延的另一种写法，把交接拿掉对它的推动比任何处理时长改进都大。而一线结案薄弱的那几个类别，恰好就该配最厚的知识库文章，这正是第五行能成为杠杆而不只是杂活的原因。',
          backfire:
            '一线结案率会在它是靠"关单"而不是靠"能力"买到的时候反噬。压着一线去关那些说不清的活，指标涨了、活以重启工单的形式回来了，于是第二行朝着完全相反的方向动，每一张这种工单还要多付一整个处理周期。另一个失败是在确实需要专家的类别里冲过 80%，因为单子于是卡在一线更久，对客户来说比"第一天就诚实地升级"更糟。还有，一线如果没有升级权限，就永远会显示一个漂亮的结案率和一个糟糕的解决时长，所以这两个数必须一起读。',
        },
        {
          priority: 4,
          metric: '升级路径与所有权 —— 每 100 张工单的升级数，以及一张工单无主的最大滞留时长',
          fixFirst:
            '第四个设计交接与所有权规则，因为一线结案率再好，那些真的升级上去的单子如果还要等一个人来认领，那个率就一文不值。要写下来三件事：把工单往上级推的判据（需要的专长、客户等级、工单年龄）、每一级的服务等级（一线 4 小时内、二线 24 小时内、三线 168 小时内），以及"任何工单超过 X 小时必须有人认领"的所有权规则，X 不大于 4 小时。真正最能改变解决时长的是所有权规则，因为失效模式不是专家慢，而是没人接手，而这种工单不会出现在任何队列报表里，直到它已经超期。',
          alsoMoves:
            '所有权规则会同时动所有层级的 p90，因为一张无主的工单就是一段没有上界的等待，无论接收那一线多快。它也决定第三行里有多少活真的属于升级：有了"一线必须关掉什么"的成文判据，剩下的升级才是真的需要专家的那部分，升级率也就落在 10-20% 那个"分流在工作"而不是"分流失效"的带里。而每张工单都有一个具名负责人，是步骤 6 那个月度目标可被追责的前提，因为没有归属的升级率，在漂移的时候没人能跟进。',
          backfire:
            '升级与所有权规则会朝两个方向反噬。如果所有权窗口比接收线的服务等级还紧，每张升级工单就在队列之间来回弹，等着有人接手，结果它本该保护的那一层的 p90 反而更差。另一个失败是为了保住某个时钟而把活全往上推：二线收到本该一线关掉的活，二线队列涨起来，于是一线 p90 变好了，而二线三线的解决时长在恶化——用一个层级的数字换另一个层级的数字。窗口要对着接收线的服务等级来设，而且要读每一层的 p90，不要只读你本来想保护的那一层。',
        },
        {
          priority: 5,
          metric: '知识库覆盖率与拦截率配对 —— 进线问题中有对应文章的占比，旁边并排放上真正被知识库解决掉的占比',
          fixFirst:
            '最后才动进线量，因为和上面四行不同，它不缩短任何一张已存在工单的解决时长——它是在工单被创建之前就把问题拿掉，对 p90 的作用来自队列效应而不是处理效应。这件事仍然值得做，而且值得做对，因为配对才告诉你该为哪个项目付钱：覆盖率高、拦截率低说明文章在、用户找不到，该修搜索、标题和分类；覆盖率低、拦截率低说明根本没有文章，该写一篇。指南给出的可达区间是知识库单独贡献 15-25%、叠加 AI 机器人后 30-50%、社区论坛再加 5-10%，并且点名文章过期是最常见的隐形拖累，因为一篇过期文章读起来像"有覆盖"，用起来像死路。',
          alsoMoves:
            '拦截会动第三行那个一线结案率，而且动的正是最该动的那几类，因为一个在到达 agent 之前就被回答掉的问题，根本不会成为升级候选。它还会缩短所有其他行都在设法缩短的那个队列，所以同样的排班和路由工作在流量更少时能买到更多；而一个刚刚把一线结案率做上去的团队，应该先查拦截率，再宣布结案率就是天花板。最后，拦截是这张表上唯一一个在同一期间里同时降低单工单成本的杠杆，因为那些不再到达的活，根本没有处理时长。',
          backfire:
            '拦截会在拦错人群的时候反噬。如果一个真的需要人的类别——故障、账单争议、数据导出——被一个关不掉单的自助流程拦了，客户会再来一次，于是首响指标和解决指标一起变坏，而拦截率读起来漂亮得很。第二个失败是把覆盖当拦截：重建一个没人搜得到的巨大知识库会抬高覆盖率、拦截率原地不动，几个月写作换不到任何工单量变化。而把客户已经升级过一次的问题拦掉，等于毁掉了第二次尝试本该重建的信任。只拦那些你的文章真的关得掉的问题。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Six conditions decide whether a resolution-time program can move to its next stage, and the first of them is the one most programs never measure. A closure is real only if the ticket does not come back within 14 days, so the reopen rate is the first gate, tracked by agent, by issue type and by the knowledge-base article that was referenced, because a reopen rate above 10 percent is a closure-quality signal and not a customer-memory signal. Tiered resolution follows from it, with median and p90 per priority rather than one blended figure, and a p90 above 4 hours on P1 is the kind of breach an enterprise customer finds at the quarterly business review. First-contact resolution then separates two opposite failures: under 70 percent means escalation loops are eating 30-50 percent of first-line capacity on work that should have closed there, while above 80 percent means first-line agents are over-resolving and tier-two specialists are starved. Escalation paths need stated criteria, a per-tier service level, and an owner for every ticket that ages past a set number of hours. Knowledge-base deflection is then split into coverage and deflection, because low coverage with low deflection is a content gap and high coverage with low deflection is a search or taxonomy failure, and only the second one is fixed by renaming anything. The monthly targets close the sequence: first-contact resolution up 3-5 points, reopens under 5 percent, P1 p90 under 4 hours, P2 p90 under 24 hours, escalation rate held between 10 and 20 percent.',
      items: [
        {
          step: 1,
          label: 'Resolution time defined, clocked and reported per priority tier',
          gate: 'Written rules covering four cases, with the data pulled to match them: the clock runs from ticket creation to final closure, waiting time for the customer is inside the duration, auto-closed tickets are excluded unless the customer confirmed, and each of the four priorities reports its own median and p90 hours against the bands P1 under 4, P2 under 24, P3 under 72, P4 under 168, with the ticket count behind every percentile.',
          blockIf:
            'If the clock includes stretches where nobody was waiting on anybody, the p90 you publish is not a customer experience and you will optimise the wrong half of the process. If the tiers are blended into one percentile, the volume in the slow tier sets the headline number and the tier that is actually broken disappears from the report. And a percentile computed on 11 tickets is not a percentile, which is why the ticket count belongs beside it.',
        },
        {
          step: 2,
          label: 'Reopen rate audited against closed tickets and broken down by cause',
          gate: 'Every ticket closed in the last 90 days checked for a reopen within 14 days, the reopen count divided by tickets closed in that window, the result compared against the bands of under 5 percent target, 10-20 percent warning and above 20 percent critical, and the breakdown produced by agent, by issue type and by the knowledge base article cited, with a named list for every agent above 10 percent.',
          blockIf:
            'If reopens are counted against created tickets instead of closed tickets, rising volume quietly dilutes the rate and hides exactly the problem you are looking for, and if reopens are not traced to an agent, an issue type or an article, you have the number without the cause, which means step 3 receives a target with no lever under it. While this gate fails, every downstream percentage is measured on closures of unknown quality.',
        },
        {
          step:3,
          label: 'First-contact closure rate computed by issue category',
          gate: 'Closure computed per category rather than in aggregate, with at least 5 categories and at least 20 tickets in each, the overall first-contact closure rate reported next to them, the overall landing between 70 and 80 percent, and every category below 70 percent and every category above 80 percent listed separately with its ticket count.',
          blockIf:
            'An aggregate closure rate tells you nothing about where to work, because a strong category and a failing one average into a number that looks acceptable, and the two ends of the band need opposite repairs: below 70 percent is a triage or article gap, above 80 percent means the specialists are starving. If the categories are not separated, the escalation criteria you write in step 4 will be written against a picture that does not exist.',
        },
        {
          step: 4,
          label: 'Escalation criteria, per-line service levels and an ownership rule all written down',
          gate: 'Three written rules in place: the criteria that move a ticket up (expertise required, customer tier, ticket age), the service level at each line (tier one under 4 hours, tier two under 24, tier three under 168), and the ownership rule that no ticket sits more than 4 hours without a named person, with the escalation rate over the last 30 days reported against the healthy band of 10-20 percent.',
          blockIf:
            'Without written criteria, escalations become personal judgements and the rate drifts with whoever is on shift, so step 6 has no stable baseline to hold you to. Without a per-line service level you cannot tell a slow expert from an unowned ticket, and those two have completely different fixes. And an ownership window longer than the receiving line service level means the ticket is handed over and then waits, which lengthens the very number the rule was written to protect.',
        },
        {
          step: 5,
          label: 'KB coverage and deflection paired on the same inbound questions',
          gate: 'For the questions driving the top 20 percent of inbound volume, coverage (does an article exist) and deflection (did the customer find it) reported side by side, coverage at or above 80 percent and deflection at or above 25 percent for that group, and the two failure shapes listed separately: articles that exist but are not found, and questions with no article at all.',
          blockIf:
            'Coverage without deflection is a vanity metric, and building a large library that nobody can search raises coverage while deflection stays flat, which is months of writing for no change in ticket volume. If the two shapes are not separated, you will aim the whole program at the wrong one and the deflection rate will stay flat while the budget keeps being spent. And deflecting a category that needs a person creates second contacts, which pushes both the response metric and the resolution metric the wrong way.',
        },
        {
          step: 6,
          label: 'Monthly targets published with the previous month value and a quarterly re-benchmark',
          gate: 'Five numbers on one page, each with the previous month value beside it: first-contact closure rate up 3-5 percentage points, reopen rate under 5 percent, P1 p90 under 4 hours, P2 p90 under 24 hours, and escalation rate between 10 and 20 percent, plus one quarterly comparison against the Zendesk and ICMI bands and a written decision on whether any drift above 10 percent across two consecutive quarters triggers a triage-process review.',
          blockIf:
            'A target without the previous value attached is not a measurement, and at the end of the month you cannot tell whether you moved or merely changed the target. The five numbers only work when read together: closure can rise while reopens rise, and a p90 can improve while the escalation rate quietly doubles, so any one of them alone can be met by a change the others expose. And without a dated quarterly comparison, structural drift is never separated from a seasonal swing and the triage process never gets the review it has earned.',
        },
      ],
    },
    zh: {
      intro:
        '解决时长这套做法能不能往下走，看六件事，而第一件是大多数团队从来没量过的那件。结案是不是真的，只看 14 天内会不会又回来，所以重启率是第一道关，按 agent、按问题类型、按引用的知识库文章分开追，因为重启率超过 10% 是结案质量信号，不是客户记性差。分层解决时长从它出发，按优先级给中位数与 p90，而不是一个混在一起的数，P1 的 p90 超过 4 小时属于企业客户在季度业务回顾里会发现的那类违约。一线结案率接着把两种相反的毛病分开：低于 70% 说明升级循环在吃 30-50% 的一线产能，而那些活本该在一线关掉；高于 80% 则说明一线在过度结案，二线专家在饿死。升级路径要写明判据、每层时限，以及每张超龄工单的归属人。知识库拦截随后拆成覆盖与拦截两件事：覆盖低而拦截低是内容缺口，覆盖高而拦截低是搜索或分类问题，而只有后者是靠改分类能修的。每月目标收尾：一线结案率 +3-5 个百分点、重启率低于 5%、P1 p90 低于 4 小时、P2 p90 低于 24 小时、升级率守在 10-20%。',
      items: [
        {
          step: 1,
          label: '解决时长的口径写定，时钟规则与分层报告都到位',
          gate: '四条成文规则，并且数据按同样的口径拉出来：时钟从工单创建走到最终结案，等客户回复的时间算在时长之内，自动关闭的工单除非客户确认否则不计入，四个优先级各自给出中位数与 p90 小时数——对照基准带 P1 小于 4 小时、P2 小于 24 小时、P3 小于 72 小时、P4 小于 168 小时——每个分位数旁边还要标出背后的工单条数。',
          blockIf:
            '如果时钟里包含没人等任何人的那几段，你发布的 p90 描述的就不是客户体验，你会去优化流程里错误的那一半。如果把几个优先级混成一个分位数，慢的那一层会定下标题数字，而真正坏掉的那一层从报表里消失。还有，只有 11 张工单算出来的分位数不是分位数，所以条数必须和它放在一起。',
        },
        {
          step: 2,
          label: '重启率按结案工单审计，并拆到 agent 与成因',
          gate: '过去 90 天结案的每张工单都查一遍 14 天内有没有重启，重启数除以同一窗口的结案工单数，对照低于 5% 的目标带、10-20% 的警告带、超过 20% 的严重带，并按 agent、按问题类型、按引用的知识库文章各出一份拆分，任何超过 10% 的 agent 点名进清单。',
          blockIf:
            '如果重启数是拿进线工单数当分母，涨量会把比率稀释掉，恰好盖住你要找的那个问题；如果重启没有追到 agent、问题类型或文章上，你只有数字没有成因，步骤 3 就会拿到一个底下没有杠杆的目标。这一条不过，后面每个百分比都是建在质量不明的结案之上的。',
        },
        {
          step: 3,
          label: '一线结案率按问题类别算出来，两端分别列出清单',
          gate: '结案率按类别而不是按总数算出，至少拆出 5 个类别、每类至少 20 张工单，总的一线结案率与各类别并排给出，总值落在 70-80% 之间，低于 70% 的类别与高于 80% 的类别分别列出并带上各自的工单条数。',
          blockIf:
            '一个总的结案率不告诉你该往哪儿使劲，因为强的一类和坏的一类平均之后看起来还行，而这条带的两端需要相反的修法——低于 70% 是分流或文章缺口，高于 80% 是专家在饿死。类别没拆开，步骤 4 里那份升级标准就会对着一张根本不存在的图来写。',
        },
        {
          step: 4,
          label: '升级判据、每线服务等级与所有权规则都写下来了',
          gate: '三样成文规则到位：把工单往上级推的判据（所需专长、客户等级、工单年龄）、每一线的服务等级（一线 4 小时内、二线 24 小时内、三线 168 小时内），以及"任何工单超过 4 小时必须有人认领"的所有权规则；再加最近 30 天的升级率，对照 10-20% 这个健康带给出位置。',
          blockIf:
            '没有成文判据，升级就变成个人判断，升级率会随当天谁值班而漂，步骤 6 就没有一个稳定的基准来卡你。没有每线服务等级，你分不出"专家慢"和"没人接手"，而这两种的修法完全不同。而所有权窗口比接收线的服务等级还长，意味着工单被交接之后还要再等，那会把它本该保护的那个数字拖得更长。',
        },
        {
          step: 5,
          label: '知识库覆盖率与拦截率在同一批进线问题上配对',
          gate: '对造成进线量前 20% 的那些问题，覆盖率（有没有对应文章）与拦截率（客户有没有找到）并排给出，这一组的覆盖率不低于 80%、拦截率不低于 25%，并把两种失效形状分开列单：文章在但找不到、以及根本没有文章。',
          blockIf:
            '只有覆盖率没有拦截率就是虚荣指标：重建一个没人搜得到的知识库会把覆盖率抬高、拦截率原地不动，几个月写作换不到任何工单量变化。两种形状不分开，你会把整个专项投给错的那一个，拦截率一直不动而钱一直花。而把需要人的类别拦掉会制造二次联系，把首响指标和解决指标一起推向错的方向。',
        },
        {
          step: 6,
          label: '月度目标公布，每个数字带上月值，季度做一次基准重对',
          gate: '一页五个数字，每个旁边放上个月的值：一线结案率 +3-5 个百分点、重启率低于 5%、P1 p90 小于 4 小时、P2 p90 小于 24 小时、升级率落在 10-20% 之间；再加每季度一次对照 Zendesk / ICMI 基准带的比较，以及一条写下来的结论：连续两个季度超过 10% 的漂移是否触发分流流程复核。',
          blockIf:
            '没有上个月值的数字不是度量，月末你分不清是自己动了还是把目标挪了。这五个数字只有放在一起读才成立：结案率可以涨而重启率也在涨，p90 可以改善而升级率悄悄翻倍，所以任何单独一个都能被别的数字揭穿的改动"达成"。而没有带日期的季度对比，结构性漂移永远分不出季节性摆动，分流流程也就永远拿不到它早就该得的那次复核。',
        },
      ],
    },
  },
};
