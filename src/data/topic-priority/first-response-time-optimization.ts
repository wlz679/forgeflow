// P166 —— T 类（Customer Support）主题「first-response-time-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= 步骤 1…步骤 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// ⭐ 与相邻两个 T 类主题的边界（三个主题都会说「工单」，口径必须互不串味）：
//   · 本主题 = 首响：**只算首次人工响应**（客户第一条消息 → 第一条由人写的回复）。
//     自动确认、机器人回复、IVR 确认一律不算首响。
//   · support-cost-optimization = 含人力分摊的单位工单成本（分母是已解决工单数）。
//   · resolution-time-optimization = 算到**最终结案**（含等待、升级与客户回复的时间）。
//   ⇒ 本文件不定义另外两个指标，只在"顺带影响"里点名，不给它们下口径。
//
// 口径纪律：
//   · 首响达成率 = 该优先级内按时拿到**人工**首次回复的工单数 ÷ 该优先级进线工单数，取过去 30 天
//   · 达成率按优先级分层给，等权综合只是整体健康色，不是决策依据
//   · 容量一律用 Erlang-C，占用率守在 75-85%，收缩率 25-35%
//   · 金额不出现（本主题不涉及成本数字）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'First response time breaks in a very specific place: it is measured on a definition nobody agreed on, averaged across channels, and then repaired by hiring people. The clock has three dials, and each can be set to flatter you without changing what the customer experiences: when it starts, what counts as a reply, and which channel it is measured on. So the first repair is the definition itself, a first reply written by a human and counted from the first message the customer sends, with automatic acknowledgements, bot replies and IVR prompts excluded, since counting those turns a 5-second system response into a 40-minute human response and makes staffing look adequate when it is not. The second is attainment read per priority tier rather than as one blended figure, because the tier that is failing is usually the tier the blend hides, and a P1 outage handled around the clock deserves a different target from a P3 question. The third is triage automation, deployed in the order of the four levers, instant acknowledgement, intent routing, knowledge-base deflection for the top 20 percent of repeated questions and AI-first response with a smart handoff, because each one is worth 5 to 15 percentage points of tier-one attainment without a single hire, and each one changes the arrival rate that the staffing model will later be solved against. Capacity is sized afterwards with Erlang-C at 75-85 percent occupancy. Escalation rules for the most urgent tier come last, because a rule that fires at the wrong threshold trains the team to ignore it.',
      rows: [
        {
          priority: 1,
          metric: 'First response definition — the first message from the customer to the first reply written by a human, measured per channel and per priority',
          fixFirst:
            'Fix the definition first, because every other row on this list is a number computed on top of it, and the two most common definitions both flatter you without improving anything. The first counts the automatic acknowledgement as the first response: the template fires within seconds, the median collapses to nearly zero, and the dashboard says the team is excellent while the customer is still waiting for a person. The second starts the clock when the ticket is created rather than when the customer wrote, which quietly removes the queue wait from the measurement. Write both rules down before you pull any history: the clock starts at the first customer message, a reply counts only if a person wrote it, and each channel keeps its own median, because a chat queue and an email queue are not the same measurement.',
          alsoMoves:
            'A fixed definition is what gives the tier attainment in row two a meaning. Without it, a 95 percent figure can be produced by nothing more than switching on an auto-reply, and you would close the project while the real wait stayed exactly where it was. It also decides whether the triage automation in row three is a genuine improvement or a relabelling: once the acknowledgement is excluded by definition, every point the automation delivers has to come from a real routing or deflection gain, and the lift you may honestly claim falls to the 5-15 point range the guide quotes. It also makes the escalation rules in row five measurable, because a miss has to be defined before a pager can be wired to it.',
          backfire:
            'The definition can be fixed in the flattering direction, and that is how a target gets met without touching the queue. Counting bot replies, counting an acknowledgement sent automatically on the customer behalf, or restarting the clock when a ticket moves to another queue all shorten the measured number while the customer waits as long as before. Blending the channels into one median is the quieter version: a chat median of 30 seconds and an email median of nine hours average into something that looks tolerable on a single dashboard, and the channel that is actually broken never appears in the report. Fix the definition, then repair one channel at a time, and keep the per-channel medians apart even after the definition is stable.',
        },
        {
          priority: 2,
          metric: 'In-SLA attainment per priority tier — tickets first answered by a human inside the tier target divided by tickets created in that tier, over the last 30 days',
          fixFirst:
            'Read attainment per tier next, and keep the tiers separate instead of blending them. The equal-weighted figure the guide describes, the average of the tier-one, tier-two and tier-three percentages, is useful for a single health colour and misleading for deciding what to repair: a healthy tier three at 97 percent and a broken tier one at 55 percent average into something in the yellow band that nobody has to act on. Pull the last 30 days, compute each tier on its own, and check the sample size per tier before you conclude anything, because a tier with 12 tickets produces a percentage that swings on a single late answer. Then read each tier against its own target, since the targets in step 1 differ by an order of magnitude and a tier can miss its target while still looking healthy against a flat one.',
          alsoMoves:
            'Per-tier attainment is the input that decides whether row three or row four is the right repair, and the blended average hides that decision. When the failing tier is the one whose volume is tiny but whose misses are expensive, the fix is routing and auto-acknowledgement, because the wait is not caused by workload. When the failing tier is the one carrying the most volume, the fix is capacity, because arrival rate is the problem. It also sets the review trigger in step 5: three consecutive days below 80 percent on tier one is a rule you can automate against one tier only, and it cannot be applied to a blend. And a per-tier series is the only form in which the monthly what-if is meaningful, because a plus-5-point scenario has to land on a named tier.',
          backfire:
            'Attainment can be improved by moving the target instead of the operation. Raising the email target to 24 hours because you cannot hold 1 hour turns the tier green and the customer experience worse, and it looks like a decision because the target line is under your control. The other version is blending: one fast tier and one slow tier averaging into a comfortable green is the single most common way a support dashboard hides a broken queue. And a percentage with a thin sample behaves like a coin flip: a tier with 8 tickets in the month can read 100 percent or 50 percent depending on when the last one arrived, which is enough to justify a restructuring the data never supported.',
        },
        {
          priority: 3,
          metric: 'Triage automation coverage — tickets receiving auto-acknowledgement, intent routing or knowledge base deflection divided by all tickets created, per channel',
          fixFirst:
            'Fix automation third and ahead of staffing, because it removes load before you size a team against it. The guide sets the order of the four levers for you: auto-acknowledgement first, then intent classification with tier routing, then knowledge base deflection for the top 20 percent of repeated questions, then an AI-first response with a clean handoff. Each lever is worth 5 to 15 percentage points of tier-one attainment without hiring, and each one changes the arrival rate the staffing model has to be built on, so the order of these two rows is not cosmetic. Automate the two levers that remove a human decision from the path before you automate anything that answers the customer, because a classification that routes wrongly sends a paying customer to a queue that cannot help them, which is slower than the manual triage it replaced.',
          alsoMoves:
            'Automation moves the capacity gap in row four, usually in the direction you hope and occasionally in the opposite one. Auto-acknowledgement cuts the wait without cutting the work, so attainment lifts while the queue behind it stays as long as it was; intent routing removes the triage step itself, so it shortens both the wait and the handling time; knowledge base deflection removes the ticket entirely. It also moves the escalation behaviour in row two indirectly, because a misrouted ticket does not merely arrive late, it arrives in the wrong queue and waits there. Once automation is in place, tier attainment becomes the thing that tells you whether to keep going, because every lever has a measurable point contribution you can add up.',
          backfire:
            'Automation backfires in three ways. An acknowledgement that answers nothing turns a waiting customer into a customer who has been answered once and is still waiting, so attainment improves while repeat contacts and satisfaction move the wrong way. A bot that grabs a conversation without a handoff rule is worse than no bot, because the customer has now been transferred by a machine and has to ask again. And deflecting the top 20 percent of questions by volume can deflect the top 20 percent by difficulty when the tags are wrong, which sends your hardest tickets into a self-service flow that cannot close them and returns them as second contacts. Judge automation on tier attainment plus repeat-contact rate, never on attainment alone.',
        },
        {
          priority: 4,
          metric: 'Capacity gap per channel — agents required by the Erlang-C solver minus agents rostered, per channel per shift, with occupancy held at 75-85 percent',
          fixFirst:
            'Size the team fourth, and size it against the arrival rate that survives automation rather than the one you started with. The model needs the peak-hour arrival rate, the average handle time, a target occupancy of 75-85 percent and a service-level target such as 80 percent answered within 30 seconds, and it returns required agents per channel per shift. Compare that with the roster you actually have: a gap above two agents on a channel is a capacity problem rather than a target-setting problem, which means the target is right and the roster is wrong. But the number you compare depends on what happened in row three, so re-run the model after every automation lever instead of setting the roster once at the start of the year. Staffing built on gross arrivals over-sizes the team by exactly the share your automation removes.',
          alsoMoves:
            'The capacity gap sets the cost line that the rest of this table is trying to protect, because rostered agents are the largest cost in a support operation and every point of occupancy above the middle of the band buys a shorter wait at a higher hourly cost. It also constrains row three, because the four automation levers need maintenance hours and a pilot window, and a team already running at 90 percent occupancy has no slack to run them in. And it changes what the escalation rules in row five can ask of people: a channel with two spare agents can absorb a surge of urgent tickets, and one with none has to let the priority order inside the escalation rule do the work instead.',
          backfire:
            'Hiring against a queue that automation would have fixed is the expensive way to buy attainment. If the delay comes from a routing rule that pushes every ticket through one approval, adding agents puts more people into the wrong queue, and the roster grows while the wait does not shrink. The second failure is occupancy: model the roster to 100 percent of paid time and there is no buffer, so a small spike in arrivals produces a wait far larger than the average suggests, and the average hides the shape of the day. Keep occupancy inside the 75-85 percent band even when the numbers look tight, and treat a gap below two agents as a question rather than a purchase.',
        },
        {
          priority: 5,
          metric: 'Urgent-tier escalation execution — misses that triggered an on-call alert and were answered by a person inside the target, divided by misses that triggered an alert',
          fixFirst:
            'Fix the escalation rules last, because they are the safety net for whatever the first four rows failed to catch, not the primary mechanism. The rules you want are already written in the guide: an urgent-tier miss beyond five minutes triggers an on-call alert, and tier-one attainment below 80 percent for three consecutive days triggers a triage-process review. What is missing is a measurement of whether the net catches anything. Track the share of paged misses that a person actually picked up inside the target, and read a low share as a rule problem rather than a people problem: an alert that goes to a channel nobody watches, or that fires three times a night for the same ticket, trains the team to ignore it, and then on the one night it mattered it does not fire at all.',
          alsoMoves:
            'Escalation execution is what keeps the tier attainment in row two honest under load, because it is the mechanism that turns a silent miss into a visible one. It also protects the priority inversion you are trying to avoid: if tier three is being served while tier one waits, the alerting path surfaces that ordering before the customer does. And a measured execution rate tells you where the next increment of effort belongs, because a rule that fires but is not picked up needs a different fix than a rule that never fires, and the two look identical if you only watch the attainment percentage.',
          backfire:
            'The escalation rule backfires when it becomes noise. A pager that fires on every urgent miss, including the same ticket every time it moves queue, produces alert fatigue within a week, and a team that has learned to dismiss the channel will also dismiss the case that mattered. The other failure is chasing the tier-one number so hard that agents abandon the urgent tier to pick up easy volume, which lifts attainment while your most expensive customers wait longest, the exact inversion the tiered targets exist to prevent. And a review rule that fires after three bad days but produces no documented decision is worse than no rule, because it consumes the meeting it was supposed to protect.',
        },
      ],
    },
    zh: {
      intro:
        '首响时长坏在一个很具体的地方：它建立在三个人没谈拢的定义上，被跨渠道平均掉，然后靠招人来修。这个钟有三个旋钮，每一个都能被调成让你好看的方向，而客户的实际体验一点没变：时钟从哪一刻起、什么算回复、量的是哪个渠道。所以第一件事是把定义钉死——首响指第一条由人写的回复，从客户第一条消息算起，自动确认、机器人回复与 IVR 提示一律不算；把它们算进去，一个 5 秒的系统应答会混进 40 分钟的人工回复里，让排班看起来够用而其实不够。第二件事是按优先级分层读达成率，而不是看一个混在一起的数，因为真正坏掉的那一层通常正是被平均藏起来的那一层，而 P1 故障要 24/7 值班，本来就该跟 P3 提问不是一个目标。第三件事是分流自动化，按四根杠杆的顺序上——即时确认、意图路由、针对占比前 20% 高频问题的知识库拦截、AI 优先响应加智能转人工——每根值 5-15 个百分点的首层达成率，一个都不用招人，而且每根都会改变后面排班模型要解的那个到达率。容量在之后用 Erlang-C、75-85% 占用率来配。最紧急那一层的告警规则放最后，因为阈值定错的规则只会训练团队忽略它。',
      rows: [
        {
          priority: 1,
          metric: '首响口径 —— 从客户第一条消息到第一条由人写的回复，按渠道与优先级分别计算',
          fixFirst:
            '先修口径，因为下面每一行都是在这个数字上算出来的，而最常见的两种口径都会让你好看、却什么也没改善。第一种是把自动确认算成首响：模板几秒就发出去，中位数直接塌到接近零，看板上写着团队优秀，而客户还在等一个真人。第二种是时钟从工单创建开始算，而不是从客户开口开始算，于是排队那段等待被悄悄从度量里拿掉了。在拉任何历史数据之前先把两条规则写下来：时钟从客户第一条消息起算；只有人写的回复才算数；每个渠道各算各的中位数，因为会话队列和邮件队列根本不是同一个度量。',
          alsoMoves:
            '口径钉死之后，第二行那个分层达成率才可能有意义。没有它，95% 这个数可以只靠开一个自动回复就产生，然后你在客户实际等待时间一点没变的情况下把项目结了。口径也决定第三行的分流自动化是真改进还是改标签：既然自动确认在定义上被排除，自动化带来的每个百分点都必须来自真实的路由或拦截提升，你能诚实宣称的幅度就落到指南写的 5-15 个点这一段。它同时让第五行的告警规则可度量——"未达"必须先被定义清楚，告警才接得上。',
          backfire:
            '口径也可能被往好看的方向"修"，这正是目标达成而队列纹丝不动的路径：把机器人回复算进去、把替客户自动发出的确认算进去、或者工单一转队列就把时钟重置，都会让度量变短而客户等的时间一点不变。把渠道混成一个中位数是更安静的那个版本——会话中位 30 秒和邮件中位 9 小时混在一起，单个看板上显示得还挺像样，真正坏掉的那个渠道根本不会出现在报告里。先修定义，然后一次只修一个渠道，即使定义稳了也要把各渠道的中位数分开留着。',
        },
        {
          priority: 2,
          metric: '分优先级 SLA 内达成率 —— 该优先级内按时拿到首次人工回复的工单数 ÷ 该优先级进线工单数，取过去 30 天',
          fixFirst:
            '第二个按优先级分层读达成率，并把各层分开，不要混。指南里那个等权综合数（三个层级的达成率取平均）用来给整体健康度一个颜色还可以，用来决定先修什么就会误导：一层 97% 的三级配上一层 55% 的一级，平均之后落在黄区，谁都不必动手。取过去 30 天，每层单独算，算之前先看样本量——只有 12 张工单的一层，迟回一张就能让百分比大幅跳动。然后拿每一层对各自的档位，因为步骤 1 里那些目标差了一个数量级，一个层即便没达标，对着一个"一刀切"的目标也可能看起来很健康。',
          alsoMoves:
            '分层达成率正是用来决定该走第三行还是第四行的输入，而混在一起的平均数把这个决定藏起来了：坏掉的那一层如果是量很小但每次未达都很贵的那层，该修的是路由和自动确认，因为等待不是负荷造成的；如果是量最大的那一层，该修的是容量，因为问题出在到达率。它同时设了步骤 5 的复核触发线——一级连续 3 天低于 80% 就复核分流流程，这条规则只对一层成立，混在一起的数上根本没法用。而月度 What-If 也只有落在分层的序列上才有意义，因为"提升 5 个点"必须加到具体某一层。',
          backfire:
            '达成率可以在不动运营的情况下变好，办法是把目标改掉，而不是把事情做好。把邮件目标从 1 小时抬到 24 小时，因为你守不住 1 小时，于是这一层变绿，客户体验变差，而它看起来像一次正常决策。另一个版本是混算：一快一慢两层平均出一个舒服的绿色，是支持看板藏住坏队列最常见的方式。还有，样本太薄时的百分比跟抛硬币差不多——一个月只有 8 张工单的一层，看最后一单什么时候到，就能读出 100% 或者 50%，这足以推动一次数据从来没支持过的重组。',
        },
        {
          priority: 3,
          metric: '分流自动化覆盖率 —— 拿到自动确认、意图路由或知识库拦截的工单 ÷ 进线工单总数，按渠道分列',
          fixFirst:
            '第三个修自动化，而且要排在给人配班之前，因为它在给人手配班之前就把负荷拿掉了。指南已经把四个杠杆排好序：先自动确认，再意图分类与级别路由，再对头部 20% 的重复问题做知识库拦截，最后是带清晰转人工的 AI 优先响应。每个杠杆值 5-15 个百分点的首层达成率，而且每个都改变着排班模型要依据的到达率，所以这两行的先后不是排版问题。先上那两个把人从链路里拿掉的杠杆——分类分错了，等于把付费客户送进一个帮不了他的队列，比它替代掉的人工分流还慢。',
          alsoMoves:
            '自动化会动第四行的容量缺口，通常往你希望的方向走，偶尔往相反的方向走。自动确认砍掉等待却没砍工作，于是达成率上去了、背后的队列还是原来那么长；意图路由拿掉的是分流这一步本身，等待和处理时长一起变短；知识库拦截把工单整个拿掉。它还会间接动第二行那个分层达成率：一张被分错的工单不只是来得晚，它是来了以后待在错的队列里等。自动化上线之后，分层达成率就变成"要不要继续做"的判断依据，因为每个杠杆都有可加总的百分点贡献。',
          backfire:
            '自动化有三种反噬。第一种是只确认、不回答的回复：客户从"在等"变成"已经回过一次还在等"，达成率变好，而重复联系与满意度往反方向走。第二种是没有转人工规则就抢下会话的机器人，它比没有机器人更糟，因为客户被机器转接过一次之后还得再问一遍。第三种是按量排头部 20% 的问题，结果标签错了，把最难的那些也拦进自助流程，而自助流程关不掉单子，于是它们以二次联系的形式回来。自动化只能用"分层达成率 + 重复联系率"一起判，绝不能只看达成率。',
        },
        {
          priority: 4,
          metric: '各渠道容量缺口 —— Erlang-C 求解的所需 agent 数减去实际排班人数，按渠道与班次分列，占用率按 75-85% 算',
          fixFirst:
            '第四个才配人，而且要对着"自动化之后仍然存在的到达率"配，而不是对着你一开始那个数。模型需要高峰小时到达率、平均处理时长、75-85% 的目标占用率，以及像"80% 在 30 秒内应答"这样的服务水平目标，它会返回每班次每渠道的所需 agent 数。拿它和你实际在岗的人数比：某个渠道缺口超过 2 个 agent，那是容量问题而不是目标设定问题，也就是目标是对的、排班是错的。但这个数取决于第三行发生了什么，所以每上一个自动化杠杆就重跑模型，而不是年初定一次排班就用一年。按毛到达率配出来的人，会多出正好一个自动化拦掉的比例那么多。',
          alsoMoves:
            '容量缺口决定着这张表其余部分要保住的成本，因为排班 agent 是支持运营里最大的一笔成本，而占用率从带宽中段往上每挪一点，买到的等待更短、花的钱更多。它同时约束第三行：四个自动化杠杆需要维护时间和试点窗口，而一个已经在 90% 占用率上运行的团队没有余量去跑它们。它也决定第五行的告警规则能对人多提什么要求——一个有两个机动人力的渠道能吸收一波紧急工单，一个没有的，就只能让规则里的优先级顺序去顶。',
          backfire:
            '拿招聘去修一个自动化本来就能修的队列，是买到达成率最贵的方式。如果延迟来自一条让每张工单都过同一个审批的路由规则，加人只是把更多人放进错的队列，人力涨了而等待没缩。第二个失败是占用率：按 100% 在岗工时排人，一点缓冲都没有，一次小的到达尖峰就会产生远超平均值的等待，而平均值把这个形状盖住了。即使数字看着紧，也把占用率守在 75-85% 这个带里，并且把 2 个 agent 以内的缺口当成一个待回答的问题，而不是一笔采购。',
        },
        {
          priority: 5,
          metric: '一级告警执行率 —— 触发值班提醒的紧急工单中，有人真在目标内接手并回复的占比',
          fixFirst:
            '最后修告警规则，因为它是前面四行没兜住时的安全网，不是主力机制。规则本身指南里已经写了：紧急层未达超过 5 分钟触发值班提醒，一级达成率连续 3 天低于 80% 触发分流流程复核。缺的是"这张网到底接住了没有"的度量——去统计被呼叫的未达里，有多少真的在目标内被人接起，把这个比例低读成规则问题而不是人的问题：提醒发到了一个没人盯的频道，或者同一张工单一晚上触发三次，团队很快就学会忽略它，于是真正要紧的那一晚它干脆不响。',
          alsoMoves:
            '告警执行率是负载之下还能让第二行那个分层达成率保持诚实的东西，因为它把一次静默的未达变成一次可见的未达。它还保护你想避免的那个优先级倒挂：如果三级在被服务而一级在等，告警路径就是在客户之前先把那个次序暴露出来的机制。而测出来的执行率又告诉你下一步的力气该放哪儿——一条响了却没人接的规则和一条从来不响的规则，所需修法完全不同，只盯着达成率百分比时它们长得一模一样。',
          backfire:
            '告警规则在变成噪声之后会反噬。一条每张紧急未达都呼叫、同一张工单每转一次队列就叫一次的规则，一周之内就会造成告警疲劳，而一个学会无视这个频道的团队，同样会无视那一单真正要紧的工单。另一个失败是为了追一级那个数字追得太紧，agent 放弃紧急层去抢容易的量，于是达成率上去了、而你最贵的客户等得最久——这恰恰是分档目标要防的那个倒挂。还有，复核规则在连续 3 天不达标时响了却不留下任何书面结论，比没有规则更糟，因为它消耗掉了它本该保护的那次会议。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Response time is the easiest metric in support to look finished and the easiest one to get wrong, and six conditions decide whether it is real. The target comes first, stated as a number per tier, T1 in minutes and T2 and T3 in hours, because a target written without a number cannot define attainment, and attainment is what every later step is measured against. Attainment is then read per tier from the ticketing system over the last 30 days, equal-weighted across tiers rather than blended by volume, so a high-volume P3 queue cannot bury a failing P1 queue. Staffing is solved with Erlang-C per channel per shift at 75-85 percent occupancy, with shrinkage of 25-35 percent removed before the agent count, and a gap wider than two agents per channel read as a capacity problem rather than a target problem. Triage automation follows in a fixed priority order, because auto-acknowledgement, intent classification, knowledge-base deflection of the top 20 percent of repeat questions and AI-first response with smart handoff are not interchangeable: the first removes waiting, the second removes the human triage step, the third removes the ticket entirely and the fourth removes the queue. Then daily monitoring by priority, tracking P1 attainment on its own because a P1 miss carries roughly ten times the satisfaction damage of a P3 miss, with an escalation rule for any P1 miss beyond five minutes. And the review cadence closes the sequence, because a definition that drifts is worse than a target that was never set.',
      items: [
        {
          step: 1,
          label: 'Channel and priority targets written down with real units attached to each',
          gate: 'One target per channel and priority combination, each written with its unit and its clock: urgent tier at 15 minutes, priority two at 1 hour in business hours and 4 hours globally, priority three at 4 hours in business hours and 24 hours globally, chat under 1 minute, email under 1 hour, with the coverage hours and the effective date recorded next to every line.',
          blockIf:
            'Without a number in the unit of the channel, attainment cannot be computed at all and every later conversation becomes a story about how busy you were. A target with no coverage hours attached is worse than no target, because overnight tickets get measured against a daytime promise, and the gap surfaces as a staffing complaint rather than as a scheduling decision. While this gate fails, step 2 produces a percentage with nothing to compare it against.',
        },
        {
          step: 2,
          label: 'Attainment pulled per tier over 30 days with the sample size shown',
          gate: 'The last 30 days of tickets carrying the first-reply timestamp and the priority tier, attainment computed separately for tier one, tier two and tier three, the equal-weighted overall calculated as the average of the three tier percentages, every tier showing its ticket count, and the result placed in one of four bands: at or above 90 percent, 80-90, 60-80, or below 60 percent.',
          blockIf:
            'A blended number with no per-tier breakdown cannot tell you whether to buy automation or to hire, and it cannot fire the three-consecutive-day rule in step 5, because that rule is written against one tier. A tier with fewer than 30 tickets in the window cannot carry a decision either: one late answer moves it by 8 points. While this gate fails, the pilots in step 4 have no stable baseline to measure a lift against.',
        },
        {
          step: 3,
          label: 'Capacity modelled per channel with the gap against the roster written down',
          gate: 'A model run for each channel with peak-hour arrival rate in tickets per hour, average handle time in minutes, occupancy between 75 and 85 percent, and a service-level target such as 80 percent answered within 30 seconds, producing required agents per shift, compared against the rostered headcount per channel with the gap recorded and any gap above 2 agents named.',
          blockIf:
            'If the model has not been run, you cannot tell a capacity shortage from a routing defect, and hiring is the default answer, which adds the largest cost in the operation while leaving the cause in place. If occupancy is modelled above 85 percent you are sizing a roster with no buffer, where one small arrival spike produces a wait the average will not show. And a model built before the automation in step 4 has settled will over-size every channel, because the arrival rate it used includes tickets that no longer reach a person.',
        },
        {
          step: 4,
          label: 'Triage automation live in the guide order with per-lever before-and-after readings kept',
          gate: 'Each lever live and dated, with a 30-day attainment reading before and after: auto-acknowledgement on every inbound ticket, intent classification with tier routing live on at least one channel, knowledge base deflection covering the top 20 percent of repeated questions by volume, and an AI-first response with a stated handoff rule, with the measured change in tier-one attainment recorded per lever against the expected 5-15 points.',
          blockIf:
            'Shipping all four levers at once leaves you unable to attribute the gain, and the one that does not work stays in place because the lift looks like it came from the bundle. An acknowledgement that only acknowledges also leaves attainment green while repeat contacts rise, which the attainment number alone will not show. Skipping the intent-routing step and going straight to a customer-facing bot puts the hard cases in a self-service flow that cannot close them, so the lift appears later as second contacts rather than as attainment.',
        },
        {
          step: 5,
          label: 'Daily tiered monitoring live with the escalation rules actually triggering',
          gate: 'A daily board showing first-response attainment for each priority tier separately, an on-call alert defined for an urgent-tier miss beyond 5 minutes and a review rule defined for tier-one attainment below 80 percent for 3 consecutive days, with at least 30 days of records showing how often each rule fired and what happened after it fired.',
          blockIf:
            'A rule that has never fired tells you nothing, so you discover during an incident that the path is empty or that the alert goes nowhere. Missing the daily board means misses accumulate into a monthly number, which is too late for the tier-one issues that cost the most. And if the board shows only the blended figure, the tier that is failing is invisible, and so is the moment it started failing.',
        },
        {
          step: 6,
          label: 'Monthly iteration with the what-if, the break-even and the weakest tier all written down',
          gate: 'Once a month, three outputs recorded: a what-if modelling a 5-point improvement in tier-one attainment, a break-even calculation of how many tier points are needed to reach the top band, and a named weakest tier with the stabilising action taken before any target is tightened, each carrying the date and the tier it applies to.',
          blockIf:
            'Without the weakest-tier step, the monthly cycle drifts towards whatever improved last month rather than towards whatever is broken, and the easy tier absorbs the attention while the failing one repeats for another quarter. A what-if without a break-even turns into a target set by optimism rather than by arithmetic. And if the iteration produces no dated record, the next quarter starts the discussion again from zero instead of from what was learned.',
        },
      ],
    },
    zh: {
      intro:
        '响应时长最容易「看起来做完」，也最容易算错，因为它有三个旋钮——时钟从哪一刻起、什么算回复、量的是哪个渠道——而每个旋钮都能被调成让你好看的方向，客户体验却一点没变。六件事决定这套响应机制往下走不走得通。目标要带数：T1 用分钟，T2 与 T3 用小时，没有数字的目标根本定义不出达成率，而后面每一步都是拿达成率来量的。达成率随后从工单系统拉近 30 天、按层等权，不按单量混合，否则单量大的 P3 队列会把坏掉的 P1 队列埋掉。人力用 Erlang-C 按渠道按班次解，占用率 75-85%，缩减率先扣 25-35% 再算人数，每渠道差两个人以上算容量问题而不是目标问题。分流自动化按固定顺序上：即时确认、意图分类、拦截占比前 20% 的重复问题、AI 优先响应加智能转人工——这四根不是同一件事，第一根消掉等待，第二根消掉人工分诊，第三根消掉工单本身，第四根消掉队列。之后按优先级每天盯，P1 单独跟踪，因为 P1 违约的满意度伤害大约是 P3 的十倍，任何 P1 超过 5 分钟未响应就触发告警。复盘节奏收尾，因为口径漂走比目标从没设过更糟。',
      items: [
        {
          step: 1,
          label: '渠道与优先级的目标写下来了，每个都带真实单位',
          gate: '每个渠道与优先级的组合都有一条目标，写明单位与时钟：紧急层 15 分钟、二层工作时间 1 小时 / 全球 4 小时、三层工作时间 4 小时 / 全球 24 小时、会话 1 分钟内、邮件 1 小时内，每条旁边还记着覆盖时段与生效日期。',
          blockIf:
            '目标里没有数字、也没写单位，达成率根本算不出来，后面所有讨论都会变成"我们最近有多忙"的讲故事。目标没带覆盖时段比没目标更糟，因为夜间工单会拿白天的承诺去量，那个缺口最后表现成一句关于人手的抱怨，而不是一个排班决定。这一条不过，步骤 2 产出的百分比就没有可比的基准。',
        },
        {
          step: 2,
          label: '各层达成率拉满 30 天，每层标出样本量与达成率',
          gate: '过去 30 天工单带首次回复时间戳与优先级，各层分别算达成率，等权综合按三个层级达成率取平均，每层标出工单条数，结果落在四档之一：90% 以上、80-90%、60-80%、60% 以下。',
          blockIf:
            '只有混在一起的总数、没有分层，就没法判断该买自动化还是该招人，也没法执行步骤 5 那条"连续 3 天"规则，因为那条规则是冲着某一层写的。某个层级在窗口内不足 30 张工单同样撑不起一个决定：迟回一张就能挪动 8 个点。这一条不过，步骤 4 的试点就没有稳定的基线来对比提升。',
        },
        {
          step: 3,
          label: '按渠道跑过容量模型，缺口与在岗人数的差写在纸上',
          gate: '每个渠道跑一次模型，填入高峰小时到达率（工单/小时）、平均处理时长（分钟）、75% 到 85% 之间的占用率，以及像"80% 在 30 秒内应答"这样的服务水平目标，算出每班次所需 agent 数，与各渠道在岗排班人数对比，差额记录在案，超过 2 人的渠道点名。',
          blockIf:
            '模型没跑，你没法把容量不足和路由缺陷分开，而默认反应是招人，那会在原因还在原处的同时给运营加上最大的一笔成本。占用率若按 85% 以上建模，你配出来的是一份没有缓冲的排班，一次小的到达尖峰就会产生平均值看不到的等待。而一份在步骤 4 的自动化落定之前跑出来的模型，会把每一个渠道都配大，因为它用的到达率里还含着根本不会再走到人那里的工单。',
        },
        {
          step: 4,
          label: '分流自动化按指南次序上线，每个杠杆的前后读数都留了档',
          gate: '四个杠杆逐个上线并记日期，每个都留 30 天的上线前与上线后读数：所有进线工单都有自动确认，至少一个渠道上了意图分类与级别路由，头部 20% 高频问题被知识库拦截覆盖，带明确转人工规则的 AI 优先响应上线，每个杠杆对一级达成率的实测变化对照 5-15 个点的预期分别记录。',
          blockIf:
            '四个杠杆一起上，你就无法归因，没用的那个会被留下，因为提升看起来像整包的效果。只确认不回答的自动回信也会让达成率保持绿色，而重复联系在涨，达成率这个数本身看不到这一点。跳过意图分类直接上对客机器人，则会把难处理的案子塞进一个关不掉单子的自助流程，提升最后以二次联系的形式出现，而不是以达成率的形式。',
        },
        {
          step: 5,
          label: '分层每日看板在线，告警规则真的触发过并留下记录',
          gate: '每日看板按优先级分层显示首响达成率，紧急层未达超过 5 分钟的值班呼叫已定义、一级达成率连续 3 天低于 80% 的复核规则已定义，并有至少 30 天记录显示每条规则触发过多少次、触发之后发生了什么。',
          blockIf:
            '一条从没响过的规则什么都证明不了，于是你会等到出事那天才发现路径是空的、或者提醒发去了没人看的频道。缺了每日看板，未达会攒成一个月底的数字，而对代价最高的一级问题来说那时候已经太晚了。板上如果只有混在一起的数，坏掉的那一层是看不见的，它开始坏的那个时刻也是看不见的。',
        },
        {
          step: 6,
          label: '月度迭代：What-If、Break-Even、最弱层三项都留了记录',
          gate: '每月产出三项记录：用一次 What-If 建模一级达成率提升 5 个点，用一次 Break-Even 算出达到最高一档还差几个层级百分点，并点名最弱的一层、在收紧任何目标之前先对它做稳定动作，每项都带日期与适用的层级。',
          blockIf:
            '少了"最弱层"这一步，月度循环就会滑向"上个月变好的那个"，而不是"现在坏掉的那个"，容易的层级吃掉注意力，坏的那一层再连着烂一个季度。只有 What-If 没有 Break-Even，目标就变成靠乐观定出来的数字，而不是靠算术定出来的。而如果迭代不留下带日期的记录，下个季度会从零重新讨论，而不是从学到的结论接着走。',
        },
      ],
    },
  },
};
