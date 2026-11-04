// P166 —— E 类（Cost & Efficiency）主题「meeting-cost-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（写之前读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（单指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 8 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个杠杆同时不达标时先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的达标线与卡点
//
// 与相邻主题「meeting-cost-analysis」的分工（两个必须错开的骨架）：
//   · meeting-cost-analysis 讲**怎么算、怎么读**：归因、三个时间维度、人时 vs 美元、
//     全组织汇总、排名基准、2x ROI 门槛、季度漂移。
//   · meeting-cost-optimization 讲**怎么改**：先砍谁、人数怎么封顶、时段怎么重塑、
//     频率怎么改、异步替代怎么落地、收回的深度工作小时怎么验证。
//
// 口径纪律（本主题讲「用户自己的经营阈值」——会议成本 / 时薪 / 产出，不是数据集单价）：
//   · 允许手写金额，但每个数字自带：分子、分母、期间（48 个工作周）、量级、单位。
//   · 一律写成「USD 50-90/小时」这种带口径的形式，不写成只有一个美元符号加数字的孤零零写法。
//   · 全文只用一套费率：中型 SaaS 团队知识工作者的全负荷美元/参与人·小时。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A meeting calendar fails as a system rather than as a list, because attendee count, slot length, recurrence, the async artifact that replaces the meeting, and the maker hours you actually recover are five dials wired into each other. Shrink one and leave the others alone, and either the saving leaks into chat or a cheap meeting becomes an expensive decision delay. The sequence follows the dependency rather than the severity. What produces no decision goes first, because that is the only cut that removes time without spending decision quality, and a recurring meeting where nothing is decided this week is replaced by a written doc and a quarterly review. The room is capped next, because every seat beyond seven adds linear cost and sublinear value, and the attendee list is cut to the people who would otherwise decide something. The slot shape follows: 25 or 50 minutes with a 5-minute buffer, because a box that ends before fatigue arrives keeps the next hour usable and a 60-minute block scheduled back-to-back does not. Cadence changes after that, since recurrence is the one lever that cuts cost while keeping the content, and a weekly sync that only needs to be monthly is the cheapest cut on the calendar. The recovered hours come last, because a cut that never appears as protected maker time has not happened, and the target is 20 hours a week of deep work retained after each round. Fully-loaded dollars per attendee-hour for a mid-market SaaS knowledge worker set every figure: USD 50-90 for an IC, USD 80-150 for a senior IC, USD 120-200 for a manager, USD 300-500 for an executive, with durations in calendar minutes, frequency in meetings per week and annualisation over 48 working weeks.',
      rows: [
        {
          priority: 1,
          metric: 'Meetings that produce no decision in a given week — the unproductive share of the calendar',
          fixFirst:
            'Start here, because every other cut is a partial substitute for this one: a meeting with no decision to make needs no attendees, no slot and no recurrence, so deleting it removes all four costs at once instead of negotiating three of them separately. Work the recurring list row by row and write the decision each meeting owes this week before you touch a single invite — a standup that cannot name one is a status broadcast, so replace it with a written digest that a named person owns, and a review that cannot name one is a recurring ritual, so move it to a quarterly slot. Verify by re-reading the calendar four weeks later: the share of slots that contain a named decision must have gone up, and the count of surviving meetings must have gone down rather than merely changed shape.',
          alsoMoves:
            'Deleting the meetings that decide nothing is what creates the room for every later row: the freed attendee-hours are the budget you cap the seats and reshape the slots with, and the freed slots on the calendar are what you protect a deep-work block with. It also lowers interruption density on its own, because a person interrupted twelve times a day refocuses twelve times, so removing three interruptions a week returns roughly 69 minutes of recovery time before any further cut is made. Decision quality is protected rather than sacrificed here, since the meetings that survive are exactly the ones carrying a decision somebody actually owns.',
          backfire:
            'Two ways this cuts the wrong thing. Delete the meetings that carried alignment instead of decisions and the cost line improves while the work slows: the misalignment surfaces two weeks later as rework, and rework is invisible to every meeting metric you are tracking, so the saving is real and the damage lands somewhere else entirely. And replace a meeting with an async document nobody owns and the hours do not disappear, they migrate into chat and email, where they are harder to see and still destroy maker time — that is the standard way a meeting diet ends up making the communication load worse rather than better.',
        },
        {
          priority: 2,
          metric: 'Attendees per recurring meeting — the size of the room measured against the two-pizza cap',
          fixFirst:
            'After the meetings that decide nothing are gone, cap the room on what the meeting owes rather than on who is usually invited. For each survivor, list the decision owner, the person who must supply an input, and everyone else as optional; the invited set should be the first two groups, and the third group should receive the written output instead of the room. Aim for no more than 7 seats, and where a meeting is structurally larger — an all-hands, an incident review, a customer escalation — split it into a decision group of 4 to 6 plus a written broadcast. Verify two cycles later by checking the seat count per meeting and the names that appear on every single invite, because the repeated names are the ones doing no work in that meeting.',
          alsoMoves:
            'Removing a seat cuts both cost and person-hours linearly while adding decision value only sublinearly, so in most calendars the cheapest meaningful cut is a seat rather than a meeting. It also reduces the interruption load for the people who stay: each remaining attendee absorbs one fewer recovery cycle, and their 23-minute refocus cost returns to their own deep work instead of to the meeting block. Over a year, one seat removed from a 48-week weekly meeting returns 48 attendee-hours, which at a USD 120-200/hr manager band is USD 5.8K-9.6K of pure capacity handed back to the team.',
          backfire:
            'Drop the person who owns the follow-up and the decision still happens, but it happens in the hallway, in chat, or in a second meeting nobody costed — so the meeting line falls while the communication load and the decision latency both rise, which is the most common way a well-meant attendee cut makes a team slower. The subtler version is cutting the expert who supplies the input while keeping the senior who only listens: the room gets cheaper and the decision gets worse, because the information that justified the meeting was in the head of the person you removed, so the meeting now has to be repeated once the missing input arrives.',
        },
        {
          priority: 3,
          metric: 'Slot length and slot shape — 25 or 50 minutes against a 30 or 60 minute default',
          fixFirst:
            'Reshape slots only on meetings that survived the decision test, because a shorter slot on a meeting that should not exist merely spreads a bad meeting over less time. Set the calendar default to 25 or 50 minutes instead of 30 or 60, and make the box fit the agenda rather than the agenda fit the box: write the agenda first, then drop the items that will not fit rather than overrunning. The five-minute buffer at the end is not padding, it is where people get back to their own work, and keeping it is what stops the following meeting from eating the recovery window. Verify by checking the ratio of slots that end on time to slots that run over — if overruns stay above one in ten, the agenda is too big and the slot is not the thing to change.',
          alsoMoves:
            'A tighter box with a real buffer is what converts a cut on paper into protected maker time, because the recovery minutes land outside the meeting instead of inside it, and that is the difference between saving an hour and saving an hour plus half. Back-to-back fatigue drops as well: consecutive 60-minute blocks leave no transition at all, while a 50-minute box followed by a 5-minute buffer returns people to a clean state, so the deep-work block after a meeting survives intact instead of starting 20 minutes late.',
          backfire:
            'Compress a meeting whose agenda genuinely needs 90 minutes and you do not save time, you split it: the overflow becomes a second meeting with a similar attendee list, so the meeting count rises while the cost line looks flat, and the decision now lands a week later than it did. The second failure is skipping the buffer to squeeze in one more item — every meeting then bleeds into the next one, the recovery time is paid inside the following slot, and the deep-work block you protected gets eaten by the meetings that surround it.',
        },
        {
          priority: 4,
          metric: 'Recurrence — meetings per week for the same recurring purpose',
          fixFirst:
            'Change the cadence last among the cuts, because recurrence is the only lever that reduces cost while keeping the content, and it also carries the most risk of a deferred decision. For each surviving meeting, write the natural decision interval from the underlying work: a weekly review of a fast-moving pipeline stays weekly, a monthly business review usually survives as quarterly with a written pre-read, and a status meeting that survived the decision test at all usually turns out to be monthly. Verify by checking the interval against the rate at which the underlying facts change — if those facts move weekly, halving the cadence is a deferral rather than a saving, and you need a written artifact to carry the interim changes.',
          alsoMoves:
            'Reducing recurrence is what turns a live meeting into a written artifact, and a written artifact is the only form that scales without anyone having to attend: the marginal cost of one more reader is 10-20% of the cost of one more attendee. It also caps the interruption budget, because a decision you read before it is discussed needs no recovery cycle at all, and in a calendar built out of short recurring syncs this is usually the single largest line.',
          backfire:
            'Cut the cadence on a workstream where problems escalate quickly and you get the classic deferral cost: the meeting that would have caught the problem in week one runs in week six, by which point the fix is a rewrite rather than a patch, so the money saved on the meeting reappears as rework on the product. The mirror-image failure is moving to a written pre-read with no owner and no deadline — the reading never happens, the meeting happens on the old cadence anyway, and you have added a document nobody reads to a meeting you meant to reduce.',
        },
        {
          priority:5,
          metric: 'The substitute installed in place of a meeting — an owned async output and its adoption',
          fixFirst:
            'Treat the replacement as a deliverable with an owner and a deadline, not as a link dropped in a message. Every meeting you remove leaves a hole, and the hole gets filled either by a written decision record with a named owner and a date or by nothing at all, in which case the work quietly returns to chat. For status, a shared dashboard or a three-minute recorded walkthrough carries the information at 10-20% of the synchronous cost, but only while somebody is accountable for keeping it fresh. Verify by checking adoption: the share of recipients who acknowledge or act on the written output within 2 working days should be at least 80%, and any output nobody opens within a week is a meeting waiting to be reinstated.',
          alsoMoves:
            'A written substitute changes what the surviving meetings are for: once status leaves the room, the remaining slots can carry decisions and the difficult reviews, which raises the decision yield of every meeting you keep without adding any. It is also the only substitute that scales with headcount, since the marginal cost of one more reader is a few minutes of reading against 60 minutes of attendance, and it leaves behind an audit trail of decisions that no meeting minutes ever produced.',
          backfire:
            'Replace a meeting with an async thread and the meeting becomes a forum for the exceptions only, which attracts exactly the people with the least context and the most opinions, and the thread grows longer than the meeting would have been: you get a 40-message debate where a 25-minute call would have closed it. The other failure is a substitute nobody maintains — a stale dashboard is worse than no dashboard, because people act on it.',
        },
        {
          priority: 6,
          metric: 'Recovered maker time — deep-work hours per week after the cuts actually land',
          fixFirst:
            'This is the row that tells you whether the other five worked, so it comes last: measure deep-work hours per week, not meeting hours, after each round of cuts. Hold a 2-3 hour block in the peak band, 9-12 AM for most chronotypes, and protect it the way you would protect a booked customer call. For a solopreneur the bar is 15-25 hrs/wk of focused work; for an IC the deep-work share should sit at 40-60% of a 40-hour week, which is 16-24 hours. Verify by re-running the productivity score on the same five categories and the same 40-hour denominator, because a score computed on a different week or a different denominator is not comparable to the last one.',
          alsoMoves:
            'Recovered maker hours are the only outcome that ties meeting cuts back to output instead of to a savings line, and they are the leading indicator for the composite productivity score, which usually moves 10-15 points within 30 days once the peak window is genuinely protected. They also set the stopping rule: once a role sits inside its deep-work band, further meeting cuts begin trading coordination for concentration, and the next hour removed from the calendar costs more than the one before it did.',
          backfire:
            'Batch every meeting into one day to make the maker hours look tidy and the destruction concentrates instead: a Thursday carrying 12 hours of back-to-back meetings fragments the whole week rather than creating one deep block, so the count of deep-work hours can fall even as the meeting count falls, and the number reads as if the cuts did not work. The other version is failing to protect the block at all: the freed hours refill with chat and email, so the calendar is cleaner while the score does not move, and you conclude that meetings were never the problem.',
        },
      ],
    },
    zh: {
      intro:
        '会议日历是作为一个系统失灵的，不是一份清单失灵的。与会人数、时段长度、重复频率、顶替会议的异步产物、以及你真正收回的深度工作小时，这五个旋钮是彼此接线的：只动其中一个而不动其余，要么把省下来的时间漏进聊天窗口，要么把一场便宜的会议变成一次昂贵的决策延迟。顺序跟着依赖走，而不是跟着严重程度走。不产出决策的先砍，因为那是唯一一种不花任何决策质量就能拿走时间的削减——一场这周什么都没定下来的常例会，换成一份书面文档加一次季度复盘。会议室随后封顶，因为七个座位以后每多一个都是线性成本配次线性价值，与会名单按「不来的话就没人拍板」裁。时段形状排在后面：25 或 50 分钟加 5 分钟缓冲，因为在疲劳到来前就结束的盒子能保住下一小时，而连着排的 60 分钟不能。节奏随后再改，因为重复频率是唯一一个在保住内容的前提下还能降本的旋钮，周会其实只需月会的那一步是最便宜的削减。收回的工作小时放最后，因为没有体现在受保护创造者时间上的削减等于没发生，每轮之后的目标是保住每周 20 小时深度工作。全篇费率取中型 SaaS 团队知识工作者的全负荷美元/参与人·小时（IC 50-90、高级 IC 80-150、经理 120-200、高管 300-500），时长按日历分钟，频率按每周场次，年度按 48 个工作周折算。',
      rows: [
        {
          priority: 1,
          metric: '每周不产出任何决策的会议占整份日历的比例',
          fixFirst:
            '从这一行开始，因为其余每一刀都只是这一刀的替代品：一场没有决策要做的会议不需要与会者、不需要时段、也不需要重复频率，删掉它一次拿走四项成本，而不必分头去谈三项。逐行过常例清单，在碰任何一份邀请之前先写下这场会议本周欠下的那个决策——说不出决策的站会就是状态广播，换成由某个具名的人维护的书面摘要；说不出决策的评审就是例行仪式，挪到季度档期。四周后回头核对：含有具名决策的时段占比应当上升，留下的会议数量应当下降，而不只是换了形状。',
          alsoMoves:
            '砍掉不产出决策的会议，才腾得出后面每一刀所需的余量：释放出来的参与人·小时，就是你给人数封顶、给时段重塑用的预算；日历上空出来的时段，就是你用来保护深度工作块的空位。它还会顺带压低打断密度——一个人一天被打断十二次就要重聚焦点十二次，所以每周少三次打断，大约会带回 69 分钟的恢复时间，这还没算后续任何一刀。决策质量在这里不是被牺牲的，因为活下来的恰好是有人真正负责决策的那批会议。',
          backfire:
            '这一刀有两个砍错方向。删掉承担的是「对齐」而不是「决策」的会议，成本曲线变好而工作变慢：对齐缺口两周后以返工的形式冒出来，而返工对你正在追踪的任何会议指标都是隐形的，于是省下的钱是真的，砸掉的代价却落在别处。另一个是换成没人负责的异步文档——时间没有消失，它迁移进了聊天和邮件，在那里更难看见，却照样摧毁创造者时间，这正是「戒会议」最后变成沟通负载更重的标准路径。',
        },
        {
          priority: 2,
          metric: '每场常例会议的与会人数——会议室规模对两个披萨上限',
          fixFirst:
            '把不产出决策的会议清掉之后，按这场会议「欠着什么」来给人数封顶，而不是按「平时都请了谁」。对每一场活下来的会议，列出决策负责人、必须提供输入的那个人，其余全部算可选：受邀集合应当是前两拨人，第三拨人拿书面产出即可，不必占一个座位。目标是每场不超过 7 人；当会议本身结构上就大（全员会、故障复盘、客户升级处理），就拆成 4-6 人的决策组加一份书面广播。两个周期后核对每场座位数，以及那些每次邀请都出现的名字——重复出现的那几个，就是在会里没干活的那几个。',
          alsoMoves:
            '减掉一个座位，在成本和人数上是线性下降，在决策价值上却只是次线性增加，所以多数日历里最便宜的有效削减是减一个座位，而不是减一场会议。它同时降低留下来的人的打断负担：每位在场者少吸收一次恢复周期，那 23 分钟的重聚焦点成本就回到他们自己的深度工作里，而不是耗在会议时段上。按年看，从一场 48 周的周会上拿掉一个座位就是 48 个参与人·小时，按经理段 120-200 美元/小时算，等于把 5.8K-9.6K 美元的纯粹产能还给团队。',
          backfire:
            '减掉负责收尾的那个人，决策照样会发生，只是换了个地方发生——在走廊里、在聊天里，或者在一场没人算过成本的补充会上，于是会议账单下去了，沟通负载和决策延迟同时上来，这是好意的人数削减反而让团队变慢的最常见路径。更隐蔽的一种是砍掉提供输入的专家、留下只旁听的高管：房间变便宜了，决策却变差了，因为当初证明这场会议值得开的那份信息就在被删掉的人脑子里，于是等那份输入到位，会议还得重开一次。',
        },
        {
          priority: 3,
          metric: '时段长度与时段形状——25 或 50 分钟对 30 或 60 分钟默认值',
          fixFirst:
            '只对通过了决策测试的会议重塑时段，因为给一场本就不该存在的会议缩短时长，只是把一场坏会议摊到更少的时间里。把日历默认值设成 25 或 50 分钟而不是 30 或 60，并让盒子去适配议程、而不是议程去适配盒子：先写议程，再删掉塞不进去的条目，而不是靠超时来兜。末尾那 5 分钟缓冲不是凑数的填充，它是人回到自己工作里的时间，留住它才能防止下一场会议吃掉恢复窗口。验证方式是数「准时结束」与「拖堂」的场次比例——如果拖堂仍高于十分之一，问题在议程太大，而不是时段该改。',
          alsoMoves:
            '一个真正带缓冲的紧盒子，才把纸面上的削减变成受保护的创造者时间：恢复用的那几分钟落在会议之外而不是里面，差别就是省下一小时和省下一小时半之间。背靠背疲劳同样下降——连续的 60 分钟块之间没有任何过渡，而 50 分钟盒子加 5 分钟缓冲把人交还时是干净的，于是会议之后的深度工作块保持完整，而不是迟到 20 分钟才开始。',
          backfire:
            '把一场议程真的需要 90 分钟的会议压短，你省下的不是时间，而是把会议劈开了：溢出部分变成第二场、与会名单差不多的会，于是会议数量上升而成本曲线看起来是平的，决策还比原来晚了一周。第二个失败是为了多塞一项而砍掉缓冲——每场会议于是都渗进下一场，恢复时间被付在后面那个时段里，你辛苦保护下来的深度工作块被周围的会议吃掉。',
        },
        {
          priority: 4,
          metric: '重复频率——同一项常例用途每周开几场、一个季度开几次',
          fixFirst:
            '频率放在所有削减的最后动手，因为它是唯一一个在保住内容的同时还能降本的旋钮，同时也是「决策被推迟」风险最高的那一个。对每一场活下来的会议，从底层工作的变化节奏反推它天然的决策间隔：快速变动流水线的周评审就该是周度；月度经营评审通常能活成季度加一份书面预读；而一场能通过决策测试的状态会，最后往往会发现它其实是月度。验证方式是拿间隔去对底层事实的变动速度——如果事实每周都在动，把频率砍半就是推迟而不是节省，这时你需要一份书面产物去承接中间的变动。',
          alsoMoves:
            '降频是把一场现场会议变成一份书面产物的开关，而书面产物是唯一一种不需要任何人到场就能扩张的形式：多一个读者的边际成本只有多一个参会人的 10-20%。它同时给打断预算封了顶，因为一份你会在讨论前先读过的决策记录，压根不需要任何恢复周期；在由短常例同步撑起来的日历里，这通常就是最大的一行。而且降频之后，单场成本不再随着人数与时长叠加，它变成了一份可以被更多人异步消费的产物——这正是会议支出在降频之后仍然可控的原因。',
          backfire:
            '在问题升级很快的工作流上砍频率，你得到的是教科书式的推迟代价：本来第 1 周就能抓住问题的会拖到第 6 周开，届时补丁已经得改成重写，省下的会议钱又以产品返工的形式冒出来。镜像式的失败是换成一份没有负责人也没有截止时间的书面预读——没人读，会照旧按原频率开，于是你给一场本来要减少的会议，又加了一份没人读的文档。',
        },
        {
          priority: 5,
          metric: '顶替会议的那个异步替代物——有人负责的书面产出与它的采纳率',
          fixFirst:
            '把替代物当成一件「有负责人、有截止时间」的交付物，而不是消息里丢的一个链接。你删掉的每一场会议都留下一个洞，这个洞要么被一份「有具名负责人和日期」的书面决策记录填上，要么什么都不填——后一种情况下活儿悄悄回到聊天里。对状态类内容，一块共享看板或一段三分钟的录屏能用同步成本 10-20% 的代价把信息送到，但前提是有人对它的新鲜度负责。验证方式是看采纳：2 个工作日内有回应或有动作的收件人占比应当不低于 80%，一周内没人打开的产出，就是一场等着被恢复的会议。',
          alsoMoves:
            '一份书面替代物会改变留下来那些会议的用途：状态一旦离开房间，剩下的时段就能装决策和难啃的评审，于是你保住的每一场会议决策产出都变高，却不用多开一场。它也是唯一一种能随人头一起扩张的替代形式——多一个读者的边际成本是几分钟阅读，对着 60 分钟在场时间——并且它留下了一份会议纪要从来看不会留下的决策审计痕迹。',
          backfire:
            '用一条异步讨论串顶替一场会议，会议就变成了只处理例外情况的论坛，而它吸引来的恰恰是上下文最少、意见最多的那批人，讨论串最后长得比原会议还久：于是一个 25 分钟电话能收尾的事，变成了一场 40 条消息的辩论。另一个失败是替代物没人维护——过期的看板比没有看板更糟，因为人会照着它行动，而按错误信息做出的决定，要到下一个季度才会被发现。',
        },
        {
          priority: 6,
          metric: '收回的创造者时间——削减真正落地后每周的深度工作小时数',
          fixFirst:
            '这一行回答的是前面五刀有没有效，所以放在最后：每一轮削减之后要量的是每周深度工作小时，而不是会议小时。在高峰带（多数生物钟是上午 9-12 点）守住 2-3 小时整块时间，用你保护一个已付费客户电话的力度去保护它。独立创业者的底线是每周 15-25 小时专注工作；IC 的深度工作占比应落在 40 小时工作周的 40-60%，也就是 16-24 小时。验证方式是拿同样的五个类别、同样的 40 小时分母重跑生产力评分，因为换了周次或换了分母的分数跟上一次不可比。',
          alsoMoves:
            '收回的创造者小时，是唯一能把会议削减连回产出的东西，而不是连回一条省钱数字；它也是综合生产力评分的领先指标——高峰窗口一旦真被保住，通常 30 天内分数会动 10-15 分。它同时给出停止规则：一旦某个角色进入自己的深度工作带，继续砍会议就开始拿协同换专注，被拿走的那一个小时会比上一个更贵。这也让「这一轮削减值不值」有了一个可复算的判据，而不是靠感觉。',
          backfire:
            '为了好看把所有会议堆到同一天，结果是破坏被集中而不是被消除：塞满 12 小时背靠背会议的周四，会碎掉你的一整周，而不是造出一块深度时间，于是会议数量下降了，深度工作小时数却也降了，这个数字看起来就像「削减没生效」。另一个版本是根本没护住那块时间：释放出来的小时被聊天和邮件填回去，日历变干净了而分数不动，于是你得出结论「会议本来就不是问题」。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Eight conditions decide whether a meeting-calendar change has actually landed, and the failure mode is the same for all of them: a number comes out that looks finished while the change it was supposed to buy never happened. The rate behind every figure is the loaded hourly cost of a mid-market SaaS knowledge worker, USD 50-90 for an IC, USD 80-150 for a senior IC, USD 120-200 for a manager and USD 300-500 for an executive, and the cost of a session is those attendees multiplied by duration, then multiplied by 1.5 to 2 times for context-switch overhead, because a 23-minute refocus is a real cost even when nobody is in the room. Annualising at 48 working weeks puts a six-person 60-minute weekly standup somewhere between USD 25,000 and USD 60,000 a year depending on seniority mix, which is why the standup is the first thing most teams cut and the first thing most teams should not. Each remaining meeting then passes a decision test: if nothing is decided this week, it becomes a written document or a quarterly review. The remaining ones are capped at seven attendees and boxed into 25 or 50 minutes. Scenarios are modelled before anything is cancelled, so the annual impact of cutting people, minutes or frequency is compared rather than guessed. The fully-loaded rate is then verified against actual payroll, and a solopreneur values their own hours at USD 75-200 depending on industry stage. And the maker hours are re-measured after each round, because a calendar that looks cheaper and a calendar that leaves twenty hours of deep work are two different outcomes.',
      items: [
        {
          step: 1,
          label: 'Build a loaded rate for every recurring meeting',
          gate:
            'One rate per attendee exists for 100% of the recurring meetings, each rate written in the USD 50-90/hr IC, USD 80-150/hr senior IC, USD 120-200/hr manager or USD 300-500/hr executive band, and 0 entries use base salary on its own.',
          blockIf:
            'If any meeting still carries a base-salary-only rate, or an attendee has no rate at all, the annual drag you compute next is wrong by 30-50% and every cut is chosen from a ranking that points at the wrong meetings. The failure then looks like a failed optimisation rather than a bad input, so the team debates which meeting to cancel instead of correcting the rate table, and the first round of cuts removes the cheap rooms while the expensive one survives.',
        },
        {
          step: 2,
          label: 'Cost each meeting including the interruption multiplier',
          gate:
            'A per-meeting cost is written for every recurring meeting as attendees x loaded rate x duration in hours x a stated 1.5-2.0 context-switch multiplier, and the multiplier actually used (1.5 or 2.0) is recorded next to the number.',
          blockIf:
            'Without the multiplier every meeting is priced at roughly half its true cost, and the ranking collapses toward the longest meetings while the short frequent ones look free — which is exactly the pattern that destroys maker time. A cost table without it also cannot justify an async replacement, because the comparison between a 60-minute sync and a written digest has no common basis, so the substitution argument never gets made.',
        },
        {
          step: 3,
          label: 'Annualise every meeting over 48 working weeks',
          gate:
            'Each meeting carries an annual figure computed as per-meeting cost x verified weekly frequency x 48, with the frequency read off the calendar rather than remembered, and the 48-week assumption is stated on the same sheet.',
          blockIf:
            'If the frequency is guessed rather than read, the annualisation inherits that guess, and a meeting that happens twice a month is silently priced as if it happened every week — a 4x error on the line you are about to act on. If only per-meeting costs exist at this point, there is nothing to prioritise with either: without the annual number a 25-minute standup and a 60-minute review have no ordering, and the cut list becomes a matter of opinion.',
        },
        {
          step: 4,
          label: 'Run the decision test on every recurring meeting',
          gate:
            'Every meeting still on the calendar names the decision it must produce this week and the person accountable for it, in one sentence each; meetings replaced by an async output instead carry an owner and a deadline, and at least 1 meeting per surviving row has a named decision.',
          blockIf:
            'A meeting with no named decision is the expensive kind that looks harmless: it recurs, it fills the slots of the good meetings, and it carries no output anyone can point to. If this test is skipped, the next step trims the shape of meetings that should not exist at all, so you spend political capital on a 50-minute slot when a 25-minute decision on a different meeting would have paid back more.',
        },
        {
          step: 5,
          label: 'Cap the room and reshape the slot on every survivor',
          gate:
            'Every surviving meeting has 7 or fewer attendees, sits in a 25 or 50-minute slot, and 0 meetings remain on a 30 or 60 minute default; meetings that are structurally larger carry a split decision group of 4-6 plus a written broadcast.',
          blockIf:
            'If the seat cap and the timebox are applied to only some meetings, the savings are not measurable because the untouched meetings grow to compensate, and the calendar audit later cannot tell which change did anything. The 30/60 default is the quieter version of the same problem: a 60-minute hold invites a 60-minute discussion, so the shape of the slot quietly sets the shape of the work.',
        },
        {
          step: 6,
          label: 'Model each candidate change before cancelling anything',
          gate:
            'For every candidate cut, the Meeting Cost Calculator is run on at least 3 scenarios — fewer attendees, shorter slot, lower frequency — and the annual impact of each is written down next to the decision before the cancellation is announced.',
          blockIf:
            'Cancel first and model afterwards, and you discover the trade only after the calendar has been broken: a cut that saved 40 hours of seat time but cost a week of decision latency looks like a success in the cost column and a failure in the delivery column. Without the written comparison there is also no baseline to check against later, so the next round of cuts has nothing to be measured against and the whole exercise becomes a series of anecdotes.',
        },
        {
          step: 7,
          label: 'Re-verify the loaded rate against the cost model',
          gate:
            'The rates in the table are cross-checked with the Employee Cost Calculator and differ from it by no more than 10%; a solopreneur states a self-rate of USD 75-200/hr with the basis written down (industry stage, current revenue) rather than picking a number silently.',
          blockIf:
            'If the rate is inherited from the benchmark table instead of being verified against the cost model, the meeting cost is a benchmark rather than your business, and a solopreneur who values their own time at zero or at a client rate is measuring a completely different thing from a team measuring loaded payroll. The variance check is also what catches a stale table: rates that drift more than 10% from the model have usually not been updated in a year, and every annual figure built on them is a year out of date.',
        },
        {
          step: 8,
          label: 'Re-measure deep-work hours after every round of cuts',
          gate:
            'Deep-work hours per week are re-measured with the Productivity Score calculator after each round, on the same 5 categories and the same 40-hour denominator as the previous round, and the round is not counted as complete below 20 hrs/wk of maker time for a solopreneur.',
          blockIf:
            'If the freed hours are not re-measured, a cut that saved only cost on paper and a cut that actually returned maker time look identical in the report, and the team keeps the version that is easier to defend rather than the version that worked. Without the re-measurement there is also no stopping rule: you cannot tell a schedule that has reached its deep-work band from one that still needs work, so the cuts continue until somebody misses a decision.',
        },
      ],
    },
    zh: {
      intro:
        '一次会议日历的调整有没有真的落地，看八件事，而它们的失效方式完全一样：数字出来了，看着像做完了，而它本来要买的那次改变并没有发生。每个数字背后的费率是中型 SaaS 知识工作者的全负荷小时成本（IC 50-90、高级 IC 80-150、经理 120-200、高管 300-500 美元/小时），单场成本等于人数乘时长，再乘 1.5 到 2 倍的上下文切换开销，因为 23 分钟的重聚焦是真成本，哪怕那会儿没人在屋里。按 48 个工作周年度化之后，一个 6 人、60 分钟的周会落在每年 25,000 到 60,000 美元之间，取决于职级构成——这正是周会最常被第一个砍掉、也最不该第一个被砍掉的原因。留下的每场会随后要过决策检验：这周没定任何事，就换成书面文档或季度复盘。剩下的会再按七人封顶、按 25 或 50 分钟装盒。取消任何东西之前先把场景建模，把砍人、砍时长、砍频率的年度影响算出来而不是猜。费率随后对着真实薪资表验一次，独立创业者把自己的小时按 75 到 200 美元估值。最后每轮之后重测创造者时间，因为「日历变便宜」和「日历留下 20 小时深度工作」是两个不同的结果。',
      items: [
        {
          step: 1,
          label: '为每一场常例会议建一份按人挂的全负荷小时工资表',
          gate:
            '100% 的常例会议都有「按人」的费率，每人一条，写明落在 50-90 美元/小时的 IC 段、80-150 的高级 IC 段、120-200 的经理段还是 300-500 的高管段；0 条只写底薪。',
          blockIf:
            '只要还有一场会议只留了底薪、或有与会者根本没有费率，接下来算出的年耗就偏低 30-50%，而每一次削减都是从一份指错方向的排名里挑出来的。这个失效看起来像「优化失败」而不是「输入错了」，于是团队开始争论该取消哪场会，而不是先把费率表改正——第一轮砍掉的通常是便宜的那几间会议室，最贵的那场安然无恙。',
        },
        {
          step: 2,
          label: '给每一场会议的单场成本带上上下文切换乘数',
          gate:
            '每一场常例会议都写出单场成本 = 与会人数 × 全负荷费率 × 时长（小时）× 一个写明的 1.5-2.0 倍上下文切换乘数，并且实际用的是 1.5 还是 2.0 就记在数字旁边。',
          blockIf:
            '少了这个乘数，每场会议都只按真实成本的一半定价，排名会向最长的会议塌缩，而那些又短又频繁的会看起来免费——而后者恰恰是摧毁创造者时间的形态。没有它，60 分钟同步会与一份书面摘要之间也没有共同基准，异步替代的论证永远做不出来，替代动作也就永远排在最后。',
        },
        {
          step: 3,
          label: '按 48 个工作周把每一场常例会议的支出年化',
          gate:
            '每场会议都有年化数 = 单场成本 × 已核实的每周频次 × 48，频次是从日历上读出来的而不是凭印象填的，同一张表上写明「48 个工作周」这个假设。',
          blockIf:
            '频次靠猜，年化就把这个猜测一起继承下来：一个月开两次的会被悄悄按每周开定价——你要动的那条线上直接错了 4 倍。如果到这一步手里只有单场成本，那更是没有排序依据：没有年化数，一场 25 分钟站会和一场 60 分钟评审无法比较，砍谁就变成谁嗓门大的事。',
        },
        {
          step: 4,
          label: '对每一场常例会议跑一遍「本周有决策」测试',
          gate:
            '留在日历上的每一场会议都写得出它本周必须产出的那个决策，以及对此负责的人，各一句话；被异步产出替代的会议则写明负责人和截止时间，且活下来的每一行里至少有 1 场带具名决策。',
          blockIf:
            '说不出决策的会议是最贵的那一种，因为它看起来无害：它照常重复、占掉好会议的时段，还拿不出任何人指得着的产出。跳过这一步，下一步就去修剪那些本就不该存在的会议的形状，于是你把政治资本花在一个 50 分钟的时段上，而另一场会上一个 25 分钟的决策本该回报更多。',
        },
        {
          step: 5,
          label: '给活下来的会议同时封顶与会人数并重塑时段形状',
          gate:
            '每一场活下来的会议与会人数不超过 7 人、落在 25 或 50 分钟的时段里，0 场还留在 30 或 60 分钟的默认值上；结构上就大的会议则拆成 4-6 人的决策组加一份书面广播。',
          blockIf:
            '人数封顶和时长盒只改了一部分会议，省下来的量就量不出来——没动的会议会补回来，日历审计之后也说不清是哪次改动起了作用。30/60 分钟默认值是同一个问题的安静版本：60 分钟的日程邀请出 60 分钟的讨论，于是时段的形状悄悄决定了工作的形状。',
        },
        {
          step: 6,
          label: '在取消任何一场会之前，先给候选改动建三个场景模型',
          gate:
            '每一项候选削减都用会议成本计算器至少跑 3 个场景（减人数、缩时长、降频率），每个场景的年化影响写在决定旁边，然后才宣布取消。',
          blockIf:
            '先取消后建模，你只能在日历已经拆坏之后才发现那个交换：砍掉 40 个席位小时、却换了一周决策延迟的改动，在成本列上是成功、在交付列上是失败。没有写下来的对比，下一轮削减也就没有基线可比，整件事退化成一串轶事。',
        },
        {
          step: 7,
          label: '用员工成本模型回校这份全负荷小时工资表与偏差',
          gate:
            '表里的费率与员工成本计算器交叉核对，偏差不超过 10%；独立创业者写出自己的 USD 75-200/小时定价，并写明依据（行业阶段、当前营收），而不是默默挑一个数。',
          blockIf:
            '费率是从基准表里继承来的、而不是对成本模型校过的，会议成本就只是基准而不是你的生意；把自己时间估成 0 或者估成客户价的人，量的其实是另一回事，和用全负荷人力成本衡量的团队不是同一个口径。偏差校验还能抓出过期表：跟模型差过 10% 的费率通常是一年多没更新，基于它的年化数字也整整旧了一年。',
        },
        {
          step: 8,
          label: '每一轮削减之后，重新量一次每周深度工作小时数',
          gate:
            '每一轮之后都用生产力评分计算器复测深度工作小时，沿用与上一轮相同的 5 个类别和同一个 40 小时分母；独立创业者低于 20 小时/周的创造者时间，这一轮就不算完成。',
          blockIf:
            '不复测，纸面上省了钱的削减和真正收回创造者时间的削减在报告里长得一模一样，团队保住的会是更容易辩护的那一版，而不是真正有效的那一版。没有复测也就没有停止规则：你分不清一份日程是已经到达深度工作带，还是仍然需要动刀，于是削减一路持续，直到有人漏掉一个决策。',
        },
      ],
    },
  },
};
