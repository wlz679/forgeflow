// P166 —— E 类（Cost & Efficiency）主题「productivity-score-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（写之前读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（单指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个维度同时不达标时先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的达标线与卡点
//
// 与两个相邻会议主题的分工（三个 E 类主题必须错开骨架）：
//   · meeting-cost-analysis 讲会议支出的归因与门槛（怎么算、怎么读）。
//   · meeting-cost-optimization 讲会议日历的干预动作（怎么砍、怎么改）。
//   · 本文件讲**个人时间分配**这一层：怎么量、哪个维度最不可见、哪个维度回报最慢、
//     综合分本身该怎么读、以及 85 分以上的天花板。
//
// 口径纪律（本主题讲「用户自己的经营阈值」——时间占比 / 产出，不是数据集单价）：
//   · 全文的比例只有一个分母：40 小时工作周（或写明的实际合同工时）。
//   · 角色带沿用既有基准表：IC 深度工作 40-60%、经理 25-40%、高管 15-25%；
//     综合分带 80+ 优、60-80 良、40-60 警戒、40 以下危急。
//   · 期间统一：至少连续 2 周的日志，月度复测用同一套 5 个类别与同一分母。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A composite productivity score fails in one specific way: it is a weighted average of ratios, so a dimension that never forms a block on your calendar can carry a quarter of your week without moving the number, while the loudest dimension can be cut for months and leave the score flat. Communication is usually that invisible dimension, because it arrives in fragments all day and people under-count it by 2-3 times. Switch density is the mechanism underneath it, because every meeting is also an interruption that costs 23 minutes of refocus, and 300-plus switches a day is what turns a schedule into noise. Deep work is simply what survives after the other four are paid for, which is why the sequence starts by measuring for two consecutive weeks and refuses to optimize a bad sample. Meetings come after the invisible drain, even though they are the loudest and the most contested, because cutting them first is what makes the communication count look better without changing it. Learning comes last among the drains, because its payoff arrives over quarters rather than weeks and cutting it in a hard quarter looks like a win. The composite score itself is a reading rather than a target. The caliber behind every ratio is a share of a stated 40-hour working week measured over at least two consecutive weeks, against role bands of 40-60 percent deep work for an IC, 25-40 percent for a manager and 15-25 percent for an executive, on a scale where 80 and above is excellent, 60-80 good, 40-60 warning and below 40 critical.',
      rows: [
        {
          priority: 1,
          metric: 'The measurement itself — whether the 2-week baseline you are optimising is real',
          fixFirst:
            'Measure before you change anything, and make the measurement survive a bad week. Tag every hour into 5 categories (deep work, meetings, communication, learning, admin) for at least 10 working days that include one ordinary week and one busy week, using the same tool and the same tagging rules both times. Compute the shares against a stated denominator, 40 hours unless you contract for something else, and check that the five percentages sum to 100% within 2 points. Verify by re-running the log after a week you already know was unusual: if the shares move more than 5 points when nothing about your job changed, the instrument is recording mood rather than allocation, and the redesign built on it will be judged against a baseline that never existed.',
          alsoMoves:
            'A baseline you can trust is what makes every later intervention readable, because without it a 30-point score move and a 3-point one look identical and the team cannot tell which lever worked. It also separates the two causes of a low score, too little deep work because other people fragmented your week, or too little deep work because you never protected it, and those two need opposite responses rather than the same tidying effort.',
          backfire:
            'Optimising from a 2-week sample that happened to contain a launch week gives you shares that will never repeat, so every redesign built on them looks like a failure when the ordinary week returns: the score falls back and the conclusion is that schedule redesign does not work, when in fact it worked and the baseline was wrong. The quieter failure is a log that is too tidy, with hours assigned to neat categories on the way into a meeting rather than as they happen, which overstates deep work and understates exactly the interruptions you were looking for.',
        },
        {
          priority: 2,
          metric: 'Communication share — Slack, email and chat as a share of the working week',
          fixFirst:
            'Audit communication before you cut anything else, because it is the drain people mis-count by 2-3×: it is fragmented across the entire day, so a week of small replies never shows up as a block on a calendar and nobody thinks of it as time spent. Pull the last 14 days from the tools themselves rather than from memory, add up the time in reply windows and scheduled senders, and compare that total with what the log says. The target is under 20% of the working week, and above 25% is an overload signal on its own. Fix it by batching rather than by trying to write less: 2-3 fixed check windows a day, notifications off outside them, and one place where a reply is expected to arrive.',
          alsoMoves:
            'Cutting communication pays back faster than any change to the calendar, because the hours return to you within the same week and are not contested by anybody else. It also stops the leak that makes meeting cuts look ineffective: if the minutes released by cancelling a meeting refill as chat, the meeting share improves while the maker hours never move. And a communication load held under 20% is the precondition for the deep-work blocks in the peak band to survive at all.',
          backfire:
            'Batch all communication into two windows and the work does not disappear, it queues: response latency to customers and teammates stretches from minutes to hours, and the chat you meant to remove reappears as an end-of-day burst that eats the evening and the start of the following morning. The other version measures communication as a count of messages instead of the hours it consumes, so a day with 20 short messages scores the same as a day with 4 long ones, and the cut lands on the wrong drain.',
        },
        {
          priority: 3,
          metric: 'Switch density — interruptions per day and the 23-minute refocus each one costs',
          fixFirst:
            'Count the interruptions, because they are the mechanism that decides whether any ratio cut turns into maker hours. The 23-minute average refocus after an interruption, with an average knowledge worker running 300+ switches a day, means the hours are lost in the recovery around the interruption rather than inside it. Pull the real count from your calendar and your communication tools across 5 working days, separate the scheduled interruptions from the unscheduled ones, and make the unscheduled ones the target: one instant message from a colleague during a deep-work block costs more than the minutes it occupies. The mechanism to fix is the unannounced one, not the meeting.',
          alsoMoves:
            'Switch density is the explanation for why an identical meeting cut sometimes works and sometimes does not: the same 8 meetings spread across a week leave the maker blocks intact, while the same 8 stacked into one afternoon generate a recovery cascade that consumes the entire day. It also tells you which lever is worth pulling, because if unscheduled interruptions dominate then notifications and expectations are the fix and the calendar can stay exactly as it is.',
          backfire:
            'Treating every switch as equal leads you to optimise the wrong target: trimming a 60-minute meeting to 45 minutes removes one switch but saves 15 minutes, while removing 6 instant-message interruptions removes 6 switches and can return up to 138 minutes of recovery, so the calendar work looks like the big win and the communication work is never attempted. The opposite error is protecting the block on paper only, so the block sits on the calendar and gets eaten anyway, and the recovery never arrives because the interruption was still permitted.',
        },
        {
          priority: 4,
          metric: 'Meeting share of the working week, measured against a role band rather than a universal target',
          fixFirst:
            'Judge the meeting share against a role band, not against a single number, because the bands differ by design: below 30% of the working week is healthy for an IC, while up to 50% is ordinary for an executive whose job is largely coordination. Start from the meetings that survive the decision test, then work the rest in order of pain — shrink the room first, because it is linear cost and sublinear value; reshape the slot second; change the cadence last, because that is where a deferred decision hides. Verify by re-reading the calendar after one cycle and confirming the share fell without a single meeting reappearing as a recurring side channel.',
          alsoMoves:
            'A meeting share inside the band clears the interruptions that make deep work possible, and it is usually the fastest visible win for anyone whose score sits in the warning band, because attendees can count their own calendar while nobody can count their own interruptions. It also reduces the number of people in the room, which raises decision velocity, and the drop in rework that follows shows up as throughput rather than as hours on a timesheet.',
          backfire:
            'Reduce the meeting share on a coordination-heavy team and the score may not move at all: an executive whose real problem is fragmented decision-making now has fewer meetings and slower decisions, so the number improves while the business slips. The far more common version is cutting the visible meetings and leaving the invisible ones, so an organisation can halve its scheduled meetings and still be interrupted 300 times a day by chat, the ratio looks fixed, and the maker hours never come back.',
        },
        {
          priority: 5,
          metric: 'Learning share — deliberate practice as a share of the working week',
          fixFirst:
            'Protect learning before you spend the last of the free hours, because it is the only dimension whose return arrives after the quarter that funded it. The target is 5-10% of the week for an IC and 10-15% for senior ICs and managers, and anything under 3% is compounding skill loss. Book it as fixed blocks with the same seriousness as deep work, and audit it as a measured quantity rather than an intention. Verify by looking back over the last 8 weeks rather than the last week, since a single good week of reading after a launch is not a practice — a pattern is.',
          alsoMoves:
            'Holding learning at its target is what lets the other gains compound instead of decaying: a schedule with 20 hours of deep work and no deliberate practice produces output that stays where it is, because the skill underneath the output is not being rebuilt. It also protects the ceiling on everything else you measure, because the deep-work hours you recovered are only worth their nominal value while the skill behind them keeps improving.',
          backfire:
            'Free the hours for deep work by cutting learning and the score can rise while the future gets worse, because the composite measures allocation rather than capability: a week spent entirely on delivery and none on practice can reach 80 points, and the shortfall only surfaces 18 months later, when the work that got faster has stopped compounding. The other version treats learning as a box you fill with passive consumption, which satisfies the ratio while producing none of the deliberate practice the dimension exists to measure.',
        },
        {
          priority: 6,
          metric: 'The composite score itself and the burnout ceiling above 85',
          fixFirst:
            'Read the composite last and read it as a temperature gauge rather than a goal, because it weights dimensions you have already examined one by one, and it has a ceiling you should not aim at. The bands are 80+ excellent, 60-80 good, 40-60 warning and below 40 critical, and a score under 50 means the schedule needs a structural redesign rather than a tweak. Recompute monthly with the same tool, the same 5 categories and the same 40-hour denominator, and pair the number with a throughput measure — work shipped, pieces published, deals closed — because a high score with flat output means the categories are being gamed rather than the work improved.',
          alsoMoves:
            'The composite is what makes the individual dimensions comparable across people and across months: it turns a 40% deep-work week and a 55% one into a single comparable reading, and a single reading is what a quarterly conversation can actually be about. It also supplies the seasonality context you need in order not to overreact, since swings of roughly 5 points within a month are ordinary and only a structural drift of more than 10 points across two consecutive quarters justifies a redesign.',
          backfire:
            'Optimising the number is the standard failure and it is available to everyone: the categories get gamed, deep work gets relabelled from the work that was never done, and the score climbs to 85 while output stays flat, which is exactly what the throughput pairing exists to catch. And the ceiling is a trap in the other direction, because a sustained 85 is burnout territory, so treating it as the target produces the highest-scoring and least sustainable schedule in the organisation, and the score keeps rewarding it until somebody resigns.',
        },
      ],
    },
    zh: {
      intro:
        '综合生产力评分只有一种失败方式：它是若干比例的加权平均，所以某个从不在日历上成块出现的维度，可以在不抬高分数的前提下吃掉你一周的四分之一；而最吵的那个维度，砍上几个月分数也可能纹丝不动。那个看不见的维度通常是沟通，因为它全天以碎片形式到达，人普遍低估它 2-3 倍。切换密度是它底下的机制：每场会议同时是一次打断，要付 23 分钟的重聚焦，而一天 300 多次切换会把日程变成噪声。深度工作不过是其余四项付清之后的余额，所以顺序从连续两周的测量开始，拒绝拿一个糟糕的样本去优化。会议排在这个看不见的漏损之后，哪怕它最吵、最容易被争，因为先把会议砍掉会让沟通那项数字好看，而沟通本身没变。学习排在这些漏损的最后，因为它的回报以季度而不是以周计，在紧的季度里砍掉它看起来像赢了。综合分本身是一个读数，不是一个目标。全篇占比一律对 40 小时工作周、至少连续 2 周，对照角色带是 IC 深度工作 40-60%、经理 25-40%、高管 15-25%，分数带 80+ 优、60-80 良、40-60 警戒、40 以下危急。',
      rows: [
        {
          priority: 1,
          metric: '测量本身——你要优化的那份两周基线到底是不是真的',
          fixFirst:
            '先量后改，而且要让这份测量扛得住一个糟糕的一周：至少 10 个工作日把每个小时打进 5 个类别（深度工作、会议、沟通、学习、行政），这 10 天里要包含一个平常周和一个忙周，两次都用同一个工具、同一套打标规则。然后对着写明的分母算占比——默认 40 小时，合同工时不同就写实际数——并核对五个百分比加起来在 100% 上下 2 个点以内。验证办法是在一个你明知不寻常的周之后再记一次：如果工作内容没变而占比移动超过 5 个点，那这台仪器量的是情绪而不是分配，后面建在它上面的重设计会被拿去和一份从未存在过的基线比较。',
          alsoMoves:
            '一份可信的基线是后面每一次干预能不能读懂的前提：没有它，涨 30 分和涨 3 分长得一模一样，团队无从判断是哪根杠杆起了作用。它还把低分的两个成因分开——深度工作少是因为被别人打碎了这一周，还是因为你从来没护住它——而这两种成因需要相反的动作，而不是同一种收拾。分开之后你才知道，该去跟人要回时间，还是该先去改自己的日程。',
          backfire:
            '拿一段恰好包含上线周的 2 周样本去做优化，你得到的是一份永远不会重现的占比，于是建在它上面的每一次重设计都会在平常周回来时被判为失败：分数回落，结论变成「日程重设计没用」，而真实情况恰恰相反——重设计是有效的，基线是错的。更安静的一种失败是记得太整齐：在走去开会之前就把小时分到好看的类别里，而不是按实际发生来记，这会高估深度工作、低估你真正要找的那些打断。',
        },
        {
          priority: 2,
          metric: '沟通占比——Slack、邮件与聊天占工作周的比例',
          fixFirst:
            '在动别的之前先审沟通，因为它是人普遍少算 2-3 倍的那个漏损：它全天碎着，一周的碎回复在日历上从来不成块，也没人把它当成「花掉的时间」。别靠回忆，去工具里拉最近 14 天的记录，把回复窗口与定时发送的时间加起来，再跟日志里的数对一遍。目标是工作周的 20% 以内，超过 25% 本身就是一条过载信号。修法是分批而不是少写：每天固定 2-3 个查看窗口，窗口之外关掉通知，并约定回复只从那一个地方来。',
          alsoMoves:
            '先砍沟通比动日历的任何改动回本更快，因为这些小时在同一周内就回到你手上，而且不跟任何人抢。它同时堵住了让会议削减看起来无效的那个漏口：如果取消会议腾出的分钟又以聊天的形式回流，会议占比变好而创造者小时从未移动。而把沟通负载压在 20% 以下，正是高峰带的深度工作块能够存活的前提。而且这一刀通常不需要任何人批准。',
          backfire:
            '把沟通全塞进两个窗口，工作没有消失，只是排起了队：客户与同事的响应延迟从几分钟拉长到几小时，而你想赶走的聊天又以收工前的一阵爆发回来，吃掉晚上和第二天早上。另一个版本是按消息条数而不是按它占掉的时长来量沟通，于是发 20 条短消息的一天和发 4 条长消息的一天得分一样，这一刀就砍错了漏损，而真正被浪费的是那段本可以做深度工作的时间。',
        },
        {
          priority: 3,
          metric: '切换密度——每天的打断次数与每次 23 分钟的重聚焦点',
          fixFirst:
            '把打断数出来，因为它是决定任何比例削减能否换成创造者小时的机制。一次打断后平均 23 分钟才能重新入戏，而普通知识工作者每天切换 300 次以上——这意味着损失不在会议里，而在会议四周那段恢复时间里。从日历与沟通工具里取 5 个工作日的真实次数，把「有安排的打断」和「没安排的打断」分开，然后拿没安排的那些当目标：深度工作块里来一条同事的即时消息，代价比它占掉的那几分钟大得多。要修的机制是那个没打招呼的，不是会议。',
          alsoMoves:
            '切换密度能解释为什么同样一刀会议削减有时有用有时没用：同样这 8 场会摊在一周里，制造者时间块完好；同样这 8 场堆在同一个下午，就会产生一场恢复级联，把整天吃掉。它同时告诉你该拉哪根杠杆：如果没安排的打断占大头，那么该修的是通知与预期，日历原样不动就行。这个数字常常比会议占比更能解释分数为什么不动——先修它，收益最直接。',
          backfire:
            '把每一次切换当成等价，就会优化错目标：把一场 60 分钟的会缩到 45 分钟，减少的是 1 次切换、省下的是 15 分钟；而去掉 6 条即时消息，减少 6 次切换，最多能带回 138 分钟恢复时间。于是日历上的工作看起来才是大动作，沟通那一条永远没被试过。反向的错误是只在纸面上保护时间块：块还在日历上，照样被吃掉，而打断仍然被允许，恢复时间自然回不来。',
        },
        {
          priority: 4,
          metric: '会议占工作周的比例——对照角色带，而不是对照一个通用目标',
          fixFirst:
            '会议占比要对照角色带来判，而不是对照某一个数，因为这些带是按设计就不同的：对 IC 来说低于工作周的 30% 是健康的，而对主要工作是协调的高管，30-50% 属于常态。先从通过决策测试的会议开始，再按「痛感顺序」处理剩下的——先减人，因为它是线性成本加次线性价值；再改时段形状；最后才动频率，因为推迟的决策藏在那里。验证方式是过一个周期后重读日历，确认占比降了，同时没有任何一场会变成新的常例侧信道。',
          alsoMoves:
            '把会议占比压进角色带，腾出的正是让深度工作成为可能的那部分打断，而这通常是分数落在警戒带的人最先看见的一笔收益——与会者能数清自己日历上有几场会，却没人能数清自己一天被打断了几百次。它同时减少房间里的人数，从而提高决策速度，随之而来的返工下降体现在交付量上，而不是体现在工时表上。而它也是三个维度里唯一一个对方可见的——同事能看见你的日历，看不见你走神。',
          backfire:
            '在一个协调占比很高的团队上压会议占比，分数可能一点都不动：一位真正的问题在于决策碎片化的高管，现在会开得更少而决策更慢，于是数字变好、生意却走样。更常见的是只砍看得见的会议、留下看不见的那些——一个组织可以把有安排的会议砍掉一半，却仍然每天被聊天打断 300 次，占比看起来修好了，创造者小时却始终没有回来。',
        },
        {
          priority: 5,
          metric: '学习占比——刻意练习占每周工作小时的比例',
          fixFirst:
            '在把最后的空闲时间花光之前先护住学习，因为它是唯一一个回报要等到下一个季度才到账的维度：IC 的目标是工作周的 5-10%，高级 IC 与经理是 10-15%，低于 3% 就是技能复利在流失。要像对待深度工作那样，把它排成固定整块时间，并且当成一个被度量的量而不是一个愿望来审。验证时看最近 8 周，而不是最近一周——上线之后读了一周书不等于刻意练习，有模式的才算。',
          alsoMoves:
            '把学习守在目标线上，是别处的收益得以复利而不是衰减的原因：一份有 20 小时深度工作、却没有任何刻意练习的日程，产出会停在原地，因为产出底下的那项技能没有被重建。它同时护住了你所度量的其他一切的上限——你收回的那些深度工作小时，只有在背后的技能还在进步时，才值它名义上的那个数。这也是为什么它排在这张表的后段而不是最前面。',
          backfire:
            '把小时腾给深度工作、代价是砍掉学习，分数可以上升而未来变差，因为综合分量的是分配而不是能力：整整一周全在交付、一点不在练习，可以打到 80 分，而这个缺口要到 18 个月后才浮现——那时原本变快的工作已经不再复利。另一个版本是把学习当成一个用被动内容填满的格子，比率达标了，而刻意练习一点都没发生，而综合分不会为它报警。',
        },
        {
          priority: 6,
          metric: '综合分本身，以及 85 分以上的倦怠天花板',
          fixFirst:
            '最后才读综合分，而且把它当温度计读，而不是当目标追——因为它只是把你已经逐项看过的那几个维度加权，而它有一道你不该瞄准的天花板。分数带是 80+ 优、60-80 良、40-60 警戒、40 以下危急，低于 50 分意味着日程需要结构性重设计，而不是微调。用同一个工具、同样 5 个类别、同一个 40 小时分母每月复算一次，并给这个数字配一个交付量指标——交付的东西、发布的文章、关掉的单子——因为分数高而交付不动，说明类别在被做手脚，而不是工作变好了。',
          alsoMoves:
            '综合分是让各个维度在人与人之间、月与月之间可比的那一层：它把深度工作 40% 的一周和 55% 的一周变成同一个可比的读数，而一个可比的读数才撑得起一次季度对话。它同时提供了你不去过度反应所需要的季节性背景——一个月内 5 分左右的波动属于常态，只有连续两个季度出现 10 分以上的结构性漂移，才值得启动重设计。',
          backfire:
            '优化数字是人人都会踩的标准失败：类别被动手脚，深度工作从根本没干的活儿里重新贴标签，分数爬到 85 而交付一动不动，而这正是配一个交付量指标要抓的东西。天花板在另一个方向上也是个陷阱：85 分持续挂着是倦怠区，把它当目标，就会造出全公司分数最高也最不可持续的日程，而分数会一直奖励它，直到有人离职，而在那之前所有报表都只会说一切正常。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A productivity score is only as honest as the two weeks behind it, and six conditions decide whether it is. Two consecutive weeks of time tracking on the same five categories, deep work, meetings, communication, learning and admin, against a 40-hour denominator, because a single busy week produces ratios that look like a finding and then evaporate. The composite score is then read on the same role band every time, since a score of 75 means something different for an IC, where 40-60 percent deep work is the target, and for a manager, who normally scores 50-70 because of meeting load. The weakest dimension is then named rather than the total, because the total hides which of the five needs work and the score alone sends people to cut the wrong one. The three largest drains follow, the categories consuming the most time and returning the least output, and each one gets a specific cut rather than a general intention. The schedule redesign is then concrete: two-to-three-hour deep-work blocks inside the 9 AM to noon peak, all meetings batched onto one day, Slack and email checked at two or three fixed times, and any meeting that fails the decision test removed. And the score is recomputed monthly on the same categories, with a drift of more than 10 points across two quarters treated as a structural problem rather than a seasonal one.',
      items: [
        {
          step: 1,
          label: 'Log 2 weeks of time across the 5 categories',
          gate:
            'At least 10 working days are logged with every hour tagged into deep work, meetings, communication, learning and admin, the sample includes 1 ordinary week and 1 busy week, and 0 days are left untagged.',
          blockIf:
            'A sample of 2 weeks that happens to contain a launch, an on-site or a deadline week produces shares that will not repeat, and every later decision inherits them. If a day is left untagged, the missing hours quietly reappear in whichever category has room, and because untagged time is usually meeting-heavy or message-heavy, the log understates the drain you were hunting. A log you never re-read for a month fails the same way, because the tracker becomes a receipt rather than an instrument.',
        },
        {
          step: 2,
          label: 'Turn the log into 5 shares on a 40-hour denominator',
          gate:
            'Five percentages are computed against a stated denominator of 40 hours a week (or the contracted hours, written down), and they sum to 100% within 2 percentage points; each share is written with the hour count it came from, not as a percentage alone.',
          blockIf:
            'If the denominator is unstated, the same week can be presented as 55% or 75% deep work depending on which total you divide by, and the band you end up in is an artefact of the arithmetic rather than of your week. If the shares do not sum to 100%, some hours are double-counted or some categories overlap, which usually means a meeting with a chat thread in it is being counted twice — and double-counting inflates exactly the two categories a redesign would target.',
        },
        {
          step: 3,
          label: 'Score the week and name the weakest dimension',
          gate:
            'The Productivity Score calculator returns a composite score together with 1 named weakest dimension, the role band used is recorded (IC, manager or executive) and the score is compared against that band rather than against a universal scale, with the resulting band written next to the number.',
          blockIf:
            'Without naming the weakest dimension you have a temperature with no pointer, and the next step hunts for the three biggest drains when the answer was already available. If the role band is not recorded, the score becomes meaningless as a comparison: 75 is a good result for an IC and an unusually high result for a manager whose ceiling sits at 50-70 because of meeting load, and treating the two the same leads to stripping a manager of coordination the job requires.',
        },
        {
          step: 4,
          label: 'Identify the top 3 drains with output attached',
          gate:
            'Exactly 3 categories are named as drains, each with its hours per week and one piece of output evidence showing what was actually produced, and each drain accounts for at least 5 hrs/wk or at least 10% of the week, with the hours traced back to the Step 2 shares.',
          blockIf:
            'Naming three drains without output evidence picks the loudest categories rather than the most wasteful ones, and a category that produces nothing visible is often already doing invisible work that keeps the week running. If the hours cannot be traced back to the logged shares, this step becomes a fresh estimate with a new error range, and the redesign that follows cannot be evaluated against the baseline you just built.',
        },
        {
          step: 5,
          label: 'Redesign the schedule around the peak band',
          gate:
            'A 2-3 hour deep-work block is booked in the peak band (9-12 AM for most chronotypes, or the band the individual actually peaks in) on at least 3 days a week, meetings are batched into no more than 2 days a week, and communication checks are set at no more than 3 fixed windows a day.',
          blockIf:
            'If the peak block is nominal rather than booked, it gets eaten the first time something urgent lands, and the score never moves while every one of your good intentions stays on the calendar. If meetings are batched without a cap on the batch, a Thursday can carry 12 hours of back-to-back meetings and fragment the entire week rather than create one deep block, so the hours fall even as the meeting count falls. And a chronotype ignored means the block is placed where the work cannot happen.',
        },
        {
          step: 6,
          label: 'Remeasure monthly on the same basis',
          gate:
            'The same calculator, the same 5 categories and the same 40-hour denominator are used for the monthly remeasurement, the target is written as +5-10 points per quarter and 70+ within 90 days, and any score above 85 sustained for 3 months or more is flagged as burnout risk rather than treated as a win.',
          blockIf:
            'Changing the tool, the categories or the denominator between rounds makes the two numbers incomparable, and the improvement people remember cannot be checked against the baseline they started from. Treating a sustained 85 as a success is the more dangerous version, because the score keeps rewarding a schedule that ends in attrition, and the numbers look best right before the cost arrives.',
        },
      ],
    },
    zh: {
      intro:
        '生产力评分到底量的是你的工作还是你的意愿，看六件事，而第一件是这份测量必须经得起复算。连续两周、同样五类（深度工作、会议、沟通、学习、行政）、对 40 小时分母做时间追踪，因为只量一个忙碌的周会产出一批看起来像发现的占比，下周就蒸发。综合分随后每次都按同一个角色带读——75 分对 IC 和对经理完全是两件事，IC 的目标是深度工作 40-60%，而经理因为会议负载通常落在 50-70。要点名的是最弱的那一维而不是总分，因为总分会掩盖五个维度里到底该修哪个，而只看分数的人会去砍错那一个。接着找最大的三个漏损——占时间最多、产出最少的类别——每个都要配一个具体动作，而不是一个笼统的决心。日程重设计随后要落到具体：上午 9 点到 12 点的峰值里塞 2-3 小时深度工作块，所有会议批量到同一天，Slack 与邮件固定每天两三次，任何过不了决策检验的会直接删。最后每月用同样的类别重算，连续两个季度漂移超过 10 分按结构问题处理，不按季节波动处理。',
      items: [
        {
          step: 1,
          label: '用时间追踪工具记满连续两周，五个类别逐小时覆盖',
          gate:
            '至少 10 个工作日被记录，每个小时都打进深度工作、会议、沟通、学习、行政五类；样本里既有 1 个平常周也有 1 个忙周；0 天的时长处于未标记状态。',
          blockIf:
            '如果这 2 周恰好套上了上线、驻场或交付冲刺期，得到的占比就不会重现，后面每一个决定都要继承它。有哪一天没标记，缺失的小时会悄悄填进还有余地的那个类别，而未标记的时间通常偏会议和偏消息，于是日志恰好低估了你要找的那个漏损。装上一个月不看的日志也是同一种失效：追踪器变成了收据，而不是仪器。',
        },
        {
          step: 2,
          label: '把日志换算成五项占比，分母写明 40 小时',
          gate:
            '五个百分比按写明的分母计算——默认每周 40 小时，合同工时不同则写实际数——加起来在 100% 上下 2 个百分点以内；每一项占比都连同它对应的小时数一起写出，不能只留百分比。',
          blockIf:
            '分母不写明，同一周可以因为除数不同被讲成深度工作 55% 或 75%，你最后落进哪一档就成了算法的产物，而不是你这一周的产物。五个百分比加不到 100%，说明有些小时被重复计入或类别之间有重叠，最常见的是「一场会 + 会里的聊天」被算了两次——而重复计入恰好会把重设计最想动的两个类别给吹大。',
        },
        {
          step: 3,
          label: '跑出综合分，并明确指认最弱的那一个时间维度',
          gate:
            '生产力评分计算器给出综合分并同时指认 1 个最弱维度；所用角色带（IC / 经理 / 高管）被记录下来，分数是对照这一档而不是对照通用刻度来读，得到的档位写在数字旁边。',
          blockIf:
            '不指认最弱维度，你拿到的就是一个没有指针的温度计，下一步只好去猜哪三项消耗最大，而答案其实已经摆在计算器里了。角色带不记录，分数作为对比就失去意义：75 分对 IC 是良好，对经理却是异常偏高——经理因会议负载通常落在 50-70，把两者同等对待，等于把这份工作本就需要的协调剥掉。',
        },
        {
          step: 4,
          label: '找出前 3 大时间消耗类别，并为每一项附上产出证据',
          gate:
            '恰好指认 3 个消耗类别，每一个都写明每周小时数与一条产出证据（这段时间到底产出了什么），且每个消耗至少占 5 小时/周或 10% 的工时；这些小时都能对回步骤 2 的占比。',
          blockIf:
            '只点名三个消耗却不附产出证据，挑出来的是最吵的类别，不是最浪费的类别——而一个看起来没有产出的类别，常常正在做着维持这一周运转的隐形工作。如果这些小时对不回步骤 2 的占比，这一步就变成了一次带着新误差区间的新估计，后面跟着的重设计也就没法对着你刚建好的基线来验收。',
        },
        {
          step: 5,
          label: '围绕高峰专注带重排一整周的日程与查看窗口',
          gate:
            '在高峰带（多数生物钟是上午 9-12 点，或你自己的实际高峰段）每周至少 3 天排入 2-3 小时的深度工作整块时间；会议被批量到不超过 2 天/周；沟通查看窗口设为每天不超过 3 次。',
          blockIf:
            '高峰块只是名义上存在而没有真正占住日历，第一个急事就会把它吃掉，分数从此不动，而你所有的好意都还留在日历上。批量开会却不给批量封顶，周四可以塞进 12 小时背靠背会议，把一整周碎掉而不是造出一块深度时间，于是会议数量下降的同时小时数也在下降。不看生物钟也是同一种错：块被排在本来就做不出活儿的时间段里。',
        },
        {
          step: 6,
          label: '用同一把尺（同样类别与同样分母）做月度复测',
          gate:
            '月度复测使用同一个计算器、同样 5 个类别、同一个 40 小时分母；目标写明为每季度 +5-10 分、90 天内达到 70+；任何连续 3 个月以上高于 85 分的读数都被标为倦怠风险，而不是当成胜利。',
          blockIf:
            '两轮之间换了工具、换了类别或换了分母，两个数就不可比，而人们记住的那个提升也无从对着起点核验。把持续 85 分当成成功是更危险的一种：分数会一直奖励一份最终通向离职的日程，而数字恰恰在代价到来之前看起来最好。',
        },
      ],
    },
  },
};
