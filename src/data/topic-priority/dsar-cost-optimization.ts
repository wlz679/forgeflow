// P166 —— L 类（Legal & Compliance）主题「dsar-cost-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个运营指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是你自己的经营阈值 ⇒ 金额可以手写，但必须带口径）：
//   · 工时一律指 DSAR 上的接触工时（touch time），不是历时、不是日历时间
//   · 成本一律全负荷（隐私与法务时薪 + 工程工时 + 工具与供应商），按单全负荷成本比，不比席位标价
//   · 请求量按类型（访问 / 删除 / 可携带 / 更正）统计，期间写明为滚动 12 个月
//   · 时限一律以「一个月法定期 + 60 天延期缓冲」为参照，延期只在首月内告知的前提下使用
//   · 金额用 EUR，并写明是「每单」还是「每年」
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'An access request and an erasure request look identical in a ticket queue and cost several times as much to complete, so a programme that watches one blended average keeps investing in the cheap path and leaves the expensive one running on a person. Article 15 access runs about 2-4 hours manually, Article 17 erasure runs 5-10 because it has to reach sub-processors and backups, and portability depends on the structured-format requirement you are held to. Volume therefore has to be tracked by type over a trailing 12 months, never as an aggregate. Then the automation stack, which is ordered by what each tier actually removes: identity verification ships in 2-4 weeks and takes 30-60 minutes of triage off every request, schema-aware data discovery takes 1-3 months and takes 60-120 minutes, templated redaction and delivery follow, and the self-service portal is a 3-6 month UX project that should not start until the first three are stable, because a portal built on unstable retrieval is decoration. Volume then decides build versus buy: past roughly 5,000 requests a year the marginal cost of building it yourself falls below a vendor, and below that a vendor is usually cheaper. Clocks differ by regime, with 30 days plus a 60-day extension in the EU and UK, 30 plus 30 under PIPL and 45 under CCPA, and a missed deadline is itself a breach that stacks on top of whatever triggered the request.',
      rows: [
        {
          priority: 1,
          metric: 'Type-weighted manual hours per request — (total touch hours spent on DSARs) ÷ (requests closed in the trailing 12 months), reported separately for access, erasure, portability and rectification',
          fixFirst:
            'Start with the hours, because the annual cost you are steering by is hours multiplied by a loaded rate, and the number everyone quotes is a blended average that hides the expensive half of the queue. Access runs a fraction of the hours of an erasure, because erasure has to propagate to sub-processors and backups, so a single average says almost nothing about where the queue actually goes. Break the trailing 12 months down by type, record the touch hours for each, and only then divide. You need this before anything else, because every cost figure, every automation target and every vendor comparison is a restatement of it, and because the type mix also tells you whether volume growth is a capacity problem or a composition problem.',
          alsoMoves:
            'It sets the order of the automation stack, since the tier that removes the most hours depends on which type dominates your hours rather than on which type dominates your count. It also moves the cost per closed request the moment the mix becomes visible, because work currently done once per request on every type can be split into a cheap path and a heavy path. And the type split tells you whether a 40 percent jump in volume means you need a data-discovery tool or a second pair of hands, which are very different purchases with very different lead times.',
          backfire:
            'Measuring by type only works if the type was recorded when the request arrived, and requests that come in through support or a social channel are frequently logged as a generic access request regardless of what the person actually asked for. Fixing the tagging retroactively is how you discover that a meaningful share of your access volume was erasure, which moves the cost of every downstream decision rather than merely correcting the record. The other trap is optimising for the worst type: if erasure dominates the hours, tooling aimed only at erasure can look like a win while the mix shifts back and you are left with instruments built for the previous year.',
        },
        {
          priority: 2,
          metric: 'Hours-based automation coverage — (touch hours handled end to end by a completed Tier 1, 2 or 3 control) ÷ (total touch hours on DSARs), weighted by hours rather than by request count',
          fixFirst:
            'Fix coverage second because identity verification and data discovery are the cheapest hours you will ever remove, and they are also the two controls that pay for the rest of the stack. Tier 1 identity verification ships fastest and takes the triage minutes off every request; Tier 2 data discovery is the highest-leverage tier and takes the manual hunting off every request; redaction and delivery close the loop afterwards. Weight the coverage by hours, not by requests. A request-count automation rate looks healthy when the automated requests are the cheap ones and the manual desk still carries the erasure queue, which is the most common way a DSAR programme reports progress that does not exist.',
          alsoMoves:
            'It moves the cost per closed request directly, because removing retrieval hours from the bulk of the requests removes the line item that makes the number large. It also moves the fulfilment rate, usually in the right direction, since the requests that used to jam were the ones needing the most manual care. And it changes what a self-service portal is worth: the portal is where the request begins, not where the data comes from, so it only pays off once retrieval and redaction are automatic.',
          backfire:
            'Data discovery has a side effect that lands in the same quarter it deploys: it finds the copies of a record you did not know you were keeping. A first schema-aware sweep routinely surfaces additional stores holding the same data subject, and every one of them is a new place to search on access and a new propagation step on erasure, so the discovery tier can raise the measured cost per request in the quarter you ship it. The other version is over-trusting Tier 1: a verification gate that rejects legitimate requests, with no appeal path behind it, pushes those requests onto the full manual path plus the appeal, which costs more than never having gated at all.',
        },
        {
          priority: 3,
          metric: 'Erasure propagation coverage — (sub-processors and backup stores confirmed as holding an erasure instruction) ÷ (erasure requests issued in the trailing 12 months), with a confirmation date recorded per store',
          fixFirst:
            'Fix propagation third because erasure is where the cost and the risk both live, and it is the one type where a partly completed job leaves you exposed rather than merely slow. An erasure that stops at your own database is an erasure you did not perform: the copy in the support tool, the backup snapshot and the analytics warehouse are all still there. Get a written confirmation back from each sub-processor rather than sending a fire-and-forget notice, and record the date, because an unconfirmed erasure is indistinguishable from an unperformed one when the question is asked later. Do this before adding any further tier, since each tier you add changes what the propagation instruction has to cover.',
          alsoMoves:
            'The cost of the erasure type comes down because of it, since propagation is where most of the erasure hours are actually spent: a defined sub-processor hand-off turns a bespoke email thread per request into a repeatable instruction with a deadline and an answer. It also moves the fulfilment rate on erasures specifically, which is the type most likely to run past the one-month clock. And the sub-processor list you build in order to propagate erasures is the same list that answers the processor-contract and transfer questions your compliance file has to close.',
          backfire:
            'Pushing propagation coverage toward 100 percent has a failure mode that looks like diligence: instructing every sub-processor to delete on every erasure can demand deletion of records you are actually required to retain, for example where a legal hold or a statutory retention rule applies to the same person. Confirming the retention position before you send the instruction is what keeps this from becoming a fresh finding somewhere else. And a per-request email to every sub-processor scales badly: the same hand-off that is right for 20 erasures a year becomes the bottleneck at 200.',
        },
        {
          priority: 4,
          metric: 'Fulfilment rate inside the statutory clock — (requests closed with a complete response inside the one-month deadline, extension used only where notified inside month one) ÷ (requests closed in the period)',
          fixFirst:
            'Fix fulfilment fourth, after the levers that create the capacity, because that is the measurement that decides whether your automation is worth having at all. A response that arrives on time and is missing a third-party redaction, a field from a second store or the portability export has not fulfilled the request, it has moved the complaint somewhere less visible. Measure completion and deadline together, request by request, rather than reporting the two separately: a programme that closes 100 percent of requests on time but reopens 15 percent of them has not improved anything, and a programme that reopens them silently is the reason your cost per closed request rose while volume looked flat.',
          alsoMoves:
            'It moves the cost per closed request in a way hours do not, because a reopened request costs the whole thing twice and the second pass is usually the more expensive one, since it is reactive. It also sets the extension discipline: keeping the 60-day buffer pre-approved and using it only where you notified inside the first month means you never spend the buffer on requests that should have closed on time. And a stable fulfilment rate is what lets you plan next quarter capacity, because a team running at 90 percent on time makes different staffing decisions from one at 99 percent.',
          backfire:
            'There are two ways to move this number without improving the programme. The first is to close faster and check later: requests marked closed on the day the first partial response was sent hit the deadline, and the missing parts arrive as a follow-up that never appears in the fulfilment metric. The second is to treat the extension buffer as a scheduling tool rather than a legal one, letting a steady stream of requests roll from month one into month two — the in-period rate stays high while the open backlog quietly becomes next quarter capacity problem.',
        },
        {
          priority: 5,
          metric: 'All-in cost per closed request — (privacy time + legal review + engineering time + tooling and vendor fees, amortised) ÷ (requests actually closed complete in the period), expressed in EUR',
          fixFirst:
            'Read the all-in number last, because it is the output of the four above and it cannot tell you which lever to pull — only that something moved. By the time it reads low, the hours split, the automation coverage, the propagation and the fulfilment rate have already told you what you changed. Its real job is to separate the two failures that look identical from the inside: if the cost per closed request is still high while the hours per request are already low, then the cost is not in the work, it is in tooling and vendor fees or in the volume you are paying to serve, and the fix is a commercial decision about the platform or a capacity plan rather than another workflow change.',
          alsoMoves:
            'The quarterly re-benchmark moves with it, because per-request all-in cost is the only figure comparable across vendors and across your own years, while per-seat list price compares nothing. It also changes how the self-service portal gets argued: the portal moves cost from touch time to build time, so its case has to be made on the all-in number over a year rather than on the hourly saving. And a falling all-in cost at flat volume is what funds the next tier of investment without a new budget request.',
          backfire:
            'This metric can be improved without anything improving at all. Reclassifying engineering time as platform work moves hours out of the numerator without removing any work, and the same trick works by moving a subscription across a budget line. The other version is quality drift: a response that is technically closed but unusable still counts in the denominator as a closed request, so the unit cost falls while complaints and repeat requests rise, and the true cost reappears one quarter later as higher volume on a larger denominator.',
        },
      ],
    },
    zh: {
      intro:
        '访问请求和删除请求在工单队列里长得一模一样，完成成本却能差好几倍 —— 这就是为什么盯着一个混在一起的平均数的项目，会一直往便宜的那条路投资，把贵的那条留在一个人身上扛。第 15 条访问人工大约 2 到 4 小时，第 17 条删除 5 到 10 小时（要找次级处理者，还要删备份），可携权则取决于你被要求交付的结构化格式。请求量因此必须按类型统计、期间取滚动 12 个月，绝不能用合计数。然后是自动化栈，顺序按每一层真正省掉的东西排：身份核验 2 到 4 周上线，每单省掉 30 到 60 分钟的分流；懂数据模式的自动发现要 1 到 3 个月，每单省 60 到 120 分钟；模板化脱敏与交付紧随其后；自助门户是 3 到 6 个月的 UX 工程，前三层没稳住之前不能开工 —— 检索不稳的门户只是装饰。请求量接着决定自建还是外采：年请求量过大约 5,000 单之后，自建的边际成本才低过供应商，低于这个量则通常外采更划算。时钟按法域不同：欧盟与英国 30 天加 60 天延期，PIPL 30 天加 30 天，CCPA 45 天；逾期本身就是违规，会叠加在触发这次请求的那个问题之上。',
      rows: [
        {
          priority: 1,
          metric: '类型加权后每单人工工时 —— （花在 DSAR 上的总接触工时）÷（滚动 12 个月内已结案请求数），并按访问、删除、可携带、更正四类分别报出',
          fixFirst:
            '从工时开始，因为你用来掌舵的年度成本就是工时乘以一个全负荷时薪，而所有人引用的那个数是把贵的那一半队列藏起来的混平均。删除类的工时是访问类的数倍甚至更多，因为它必须传导到次级处理者与备份，所以一个平均值几乎不告诉你队列到底积在哪。把滚动 12 个月按类型拆开，逐类记下接触工时，然后再做除法。你需要先有这个数，因为每一个成本数字、每一个自动化目标、每一次供应商比较都是它的换算，而类型构成还会告诉你，量涨了到底是产能问题还是结构问题。',
          alsoMoves:
            '它决定自动化栈的顺序，因为能省下最多工时的层级取决于哪种类型占了你最多工时，而不是哪种类型占了你最多单数。类型一旦看得见，全负荷单次成本也会立刻往下走，因为现在对每种请求都做一遍的活，可以拆成便宜路径与重路径两条。类型拆分还能告诉你量涨 40% 到底该买数据发现工具还是该再招一个人 —— 这两笔采购的交期与形态差别很大。',
          backfire:
            '按类型衡量只有在请求到达时就记下类型才成立，而经由客服或社交渠道进来的请求，经常被记成一条笼统的访问请求，不论对方实际要的是什么。事后回头补记标签，你就会发现「访问」量里有相当一部分其实是删除，这不只是纠正记录，而是把后面每一个决定的成本都挪动了位。另一个陷阱是只针对最贵的那类做优化：当删除类占了大半工时，只冲着删除去的工具看起来是赢的，可请求构成一旦变回去，你手上就只剩一套为去年那盘生意打造的工具。',
        },
        {
          priority: 2,
          metric: '按工时加权的自动化覆盖率 —— （由已完成的层级 1、2 或 3 控件端到端处理的接触工时）÷（DSAR 总接触工时），按工时加权而不是按请求数',
          fixFirst:
            '第二条修覆盖率，因为身份核验与数据发现是你能省掉的最便宜的两笔工时，同时也是支撑其余整个栈的两块地基。层级 1 身份核验上线最快，把每一单的核验分流分钟拿掉；层级 2 数据发现是最高杠杆的层级，把每一单的人工翻找拿掉；脱敏与交付随后把闭环合上。覆盖率必须按工时加权，不能按请求数：按请求数算的自动化率，在被自动化的都是便宜请求、人工桌上还堆着删除队列时，看上去依然健康 —— 这是 DSAR 项目汇报了并不存在的进展的最常见方式。',
          alsoMoves:
            '它直接带动全负荷单次成本，因为把大部分请求的取数工时拿掉，拿掉的就是让这个数字变大的那一项。它也带动完结率，方向通常是正的，因为过去卡住的都是最需要手工照顾的那些请求。它还改变了自助门户到底值不值：门户是请求的入口，不是数据的来源，所以只有在取数与脱敏都自动化之后，它才开始回本。顺带把这条覆盖率的算法也固定下来 —— 分母用工时还是用请求数、写进报表的是哪一版 —— 否则下个季度你会在两个口径之间来回切，看不出自己到底有没有进步。',
          backfire:
            '数据发现有一个副作用，会在它上线的同一个季度落地：它会找出你原本不知道自己在留着的那些副本。第一次跑一次模式感知的扫描，通常会翻出更多存放着同一数据主体的库，而每一处都是访问时多一个要找的地方、删除时多一道要传导的工序，于是发现层反而可能在你部署它的那个季度抬高单次成本。另一个版本是过度信任层级 1：一个会把合法请求误拒的核验闸门，后面又没有申诉路径，那些请求会被推回完整人工路径再加上申诉，比当初根本没设闸门更贵。',
        },
        {
          priority: 3,
          metric: '删除指令的传导覆盖率 —— （已确认收到删除指令的次级处理者与备份存储）÷（滚动 12 个月内发出的删除请求数），每个存储都记下确认日期',
          fixFirst:
            '第三条修传导，因为删除是成本与风险同时集中的那一类，也是唯一一种「只做了一半」的活会把你留在敞口里而不仅仅是变慢的类型。停在你自己数据库里的删除，不是一次你做过的删除：客服工具里的副本、备份快照、分析仓库里的那份都还在。要的是每个次级处理者回一份书面确认，而不是发一条不求回音的通知，并且把日期记下来 —— 因为一条没确认的删除，在事后被问到时，和一次没执行的删除没有区别。在加任何新层级之前先做这件事，因为每加一层，要传导的指令覆盖面就变一次。',
          alsoMoves:
            '它把删除类的成本压下去，因为删除的工时大头恰恰在传导上：一份写下来的次级处理者协同流程，把每单一封定制邮件变成一条可重复、有期限、有回音的指令。它也专门带动删除类的完结率，因为删除是最容易拖过一个月时钟的那一类。而你为了传导删除而建起来的次级处理者清单，正是你的合规档案要回答处理者合同与传输问题时唯一要用的那份名单。',
          backfire:
            '把传导覆盖率往 100% 推，有一种看起来很勤勉的失败方式：每发一次删除就要求每个次级处理者删，而同一个人身上若存在诉讼保全或法定留存义务，你其实被要求保留这些记录 —— 那条指令会把本该留的东西一起删掉。在发指令之前先确认留存立场，是避免在另一个地方制造新处罚事由的唯一办法。另外，给每个次级处理者逐单发邮件规模上会崩：一年 20 单删除时合适的做法，到 200 单就成了瓶颈。',
        },
        {
          priority: 4,
          metric: '法定期内完结率 —— （在一个月期限内以完整回复结案的请求数，延期仅用于首月内已告知的情形）÷（当期内结案的请求数）',
          fixFirst:
            '第四条修完结率，放在这些造出产能的杠杆之后，因为它才是决定你的自动化值不值的那一个指标。一份准时到达、却缺了第三方脱敏、缺了第二个库里的字段或缺了可携带导出的回复，不叫履行了请求，它只是把投诉挪到了更不容易被看见的地方。完结与期限要逐单一起量，而不是分开报：一个 100% 准时结案、却有 15% 被重新打开的项目，什么都没改善；而把重开的那部分悄悄咽下去的项目，正是为什么你的全负荷单次成本在请求量看着平稳时反而上升。',
          alsoMoves:
            '它带动全负荷单次成本的方式是工时做不到的：一份被重新打开的请求整件事要付两次钱，而第二遍通常比第一遍更贵，因为它是被动触发的。它也规范了延期纪律：把 60 天缓冲预批在手、只在首月内告知的前提下动用，就永远不会把缓冲浪费在本该按时结案的请求上。完结率稳定，才能规划下一季度的产能，因为一个准时率 90% 的团队和一个 99% 的团队，做出的排班决策完全不同。',
          backfire:
            '这个数字有两种不动项目的改法。第一种是更快结案、事后核对：在第一份不完整回复发出的当天就把请求标记为结案，期限自然达标，而缺失的部分以一次跟进的形式回来，从来不进入完结率这个指标。第二种是把延期缓冲当成排程工具而不是法律工具，让一股稳定的请求流从第一个月滚到第二个月 —— 当期内的比率依然漂亮，而那份未结积压悄悄变成下个季度的产能问题。',
        },
        {
          priority: 5,
          metric: '每单全负荷成本 —— （隐私工时 + 法务复核 + 工程工时 + 工具与供应商费用，摊销后）÷（当期内真正完整结案的请求数），以 EUR 表达',
          fixFirst:
            '全负荷单次成本放到最后读，因为它是上面四条的产出，它没法告诉你该拉哪个杠杆 —— 它只会告诉你有东西变了。等它读出来很低时，工时结构、自动化覆盖率、传导与完结率已经各自告诉过你改了什么。它真正的用处是分开两种从内部看一模一样的失败：如果每单成本仍然偏高而每单工时已经很低，那么成本就不在活儿里，而在工具与供应商费用里，或者在你付钱去服务的那部分量里，此时该做的是关于平台或产能的商业决定，而不是又一次流程改动。',
          alsoMoves:
            '它带动季度重对，因为每单全负荷成本是唯一既能跨供应商比、又能跟你自己的历年比的数字，而席位标价什么也比不了。它还改变了自助门户该怎么被论证：门户把成本从接触工时挪到建造工时，所以它的理由要建立在一年期的全负荷数字上，而不是建立在省下的每小时上。而在请求量持平的情况下全负荷成本下降，是不用再申请预算就能投下一层自动化的理由。',
          backfire:
            '这个数字可以在什么都没变好的情况下被改善。把工程工时重新归类成平台工作，就能把工时从分子里挪走而不减少任何工作量；把一项订阅挪到另一条预算科目，效果一样。另一个版本是质量滑坡：一份技术上已结案但没法用的回复，在分母里照样算一个已结案请求，于是单位成本下降，而投诉与重复请求上升，真正的成本要到下一个季度以更大分母上的更高请求量回来。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Request type decides the clock, the cost and the tier of automation you are allowed to attempt, and the lines below are ordered so each one is measurable before you spend on the next. The first line is type-level volume from your privacy ticketing system over the trailing 12 months, never an aggregate, because the aggregate is exactly what hides the expensive type. The second is manual hours per type against the 2-6 hour ICO reference, which produces the type-weighted automation gap you actually have rather than the one you wish you had. The third is the annual cost under current automation against the 60% target scenario, because that is the number that sizes the whole programme. The fourth is the stack order: identity verification, then data discovery, then redaction and delivery, then the self-service portal last. The fifth is the internal SLA, set tighter than the statute so that a 60-day extension is pre-approved rather than fought for at the deadline. The sixth is the three monthly KPIs, per-request cost, fulfilment inside the statutory clock and automation rate. The seventh is the re-baseline trigger, because a DSAR programme that is measured once a year is measuring a different company each time: any launch that adds a data-collection surface, any sub-processor change, any schema change, and any year-on-year volume growth above 50% that turns a 12-month capacity model into a 2-3 year one.',
      items: [
        {
          step: 1,
          label: 'Trailing 12-month volume counted by request type',
          gate: 'Access, erasure, portability and rectification counted separately over the last 12 months, at least 4 type buckets, with the count of requests that arrived outside the privacy inbox recorded separately so the total can be reconciled.',
          blockIf:
            'Aggregate volume hides the expensive types and hides the queue, so a programme that only knows it handled 300 requests a year cannot tell whether it needs a data-discovery tool or one more person. Unreconciled inbound volume is worse still: a request that arrived through support started the one-month clock regardless, so a backlog sitting in another queue is exposure your dashboard is not showing you at all.',
        },
        {
          step: 2,
          label: 'Touch hours per type measured against the 2-6 hour benchmark',
          gate: 'Manual touch hours recorded for at least 20 requests across the trailing 3 months, split by type, each type compared against the 2-6 hour benchmark range, and the type-weighted average hours per request computed from those measured numbers.',
          blockIf:
            'Hours estimated from memory or from a team member impression are the reason DSAR cost models miss by a factor of two, and the error lands on the optimistic side every time. Below 20 measured requests you do not have a benchmark, you have an anecdote, and every automation target you set from it will be reforecast in your first month of running it.',
        },
        {
          step: 3,
          label: 'Annual cost sized twice — as it is today and at 60 percent automation',
          gate: 'Annual DSAR cost computed under current automation and again under the 60 percent automation scenario, each built from the measured hours, your fully loaded rate and tooling cost, with both annual totals written down and the difference between them stated in EUR per year.',
          blockIf:
            'A single cost figure tells you where you are but not what any intervention is worth, so no business case for a tool or a hire can be made from it. And if the two scenarios are not built from the same measured hours, the gap between them is an assumption rather than a saving, which is the number that gets quoted upward and then has to be explained afterwards.',
        },
        {
          step: 4,
          label: 'Automation stack ordered by tier, with Tiers 1 and 2 live first',
          gate: 'Tier 1 identity verification and Tier 2 data discovery both live and measured, Tier 3 redaction and delivery either in build or scheduled with a date, and the self-service portal either not started or started only after Tiers 1-3 were stable for at least 1 quarter, with a named owner per tier.',
          blockIf:
            'Starting with the self-service portal is the most common and most expensive ordering error, because the portal is where the request begins rather than where the data comes from, and without retrieval and redaction automation it only moves the same manual work into a nicer interface. Tier 3 without Tier 2 has the same problem in miniature: delivery is faster, but the payload is still assembled by hand and the missing fields still have to be chased.',
        },
        {
          step: 5,
          label: 'Tier-based internal SLAs with the extension buffer pre-approved',
          gate: 'Internal clocks written down as 15 days for simple access, 30 days for erasure with a 60 day extension buffer pre-approved, and 30 days for portability, plus an appeal route for rejected identity verifications that the applicant can actually use, and a named owner per clock.',
          blockIf:
            'One clock for every request type is the trap, because erasure and access are different jobs, and an erasure forced onto the access clock produces either rushed work or a late response, both of which land in the same place. And an extension buffer that was never pre-approved is not available when you need it, because getting the approval takes longer than the notification window it was supposed to buy you.',
        },
        {
          step: 6,
          label: 'Three KPIs reported monthly with at least three months of history',
          gate: 'Per-request cost in EUR, fulfilment rate inside the statutory clock as a percentage, and hours-based automation coverage as a percentage, reported monthly with at least 3 consecutive months of history and each figure computed the same way every month.',
          blockIf:
            'Three months is the minimum that separates a one-off improvement from a change in the process, and a single good month is usually a backlog that was cleared rather than a process that was fixed. The larger risk is changing the definition between months, which makes the series unreadable and quietly turns the reporting into theatre; write the definition next to the first number and do not move it afterwards.',
        },
        {
          step: 7,
          label: 'Quarterly re-benchmark scheduled, with three re-baseline triggers',
          gate: 'A quarterly re-benchmark against the benchmark table on the calendar with a named owner, plus a re-baseline after each of 3 events — a product launch that adds a data-collection surface, a sub-processor change, and a reportable breach — with the last re-baseline date and the next one both written down.',
          blockIf:
            'A benchmark without a date is a document rather than a measurement, because the comparison set and the product surface both move, so a figure set six months ago describes a different company. The triggers are the ones that matter, because a launch that adds a new data surface changes both the discovery scope and the erasure propagation list, and re-benchmarking on the calendar alone will miss it until the next request exposes the gap.',
        },
      ],
    },
    zh: {
      intro:
        '请求类型同时决定了时钟、成本和你能尝试的自动化层级，而下面这些行的顺序是按「后一层可测了才投前一层」排的。第一行是隐私工单系统里 12 个月的分类型请求量，绝不能用合计数，因为合计数恰恰是把贵的那种藏起来的东西。第二行是分类型人工工时对着 ICO 认可的 2-6 小时区间比，比出来的结果是你今天真实的自动化缺口，而不是你希望自己有的那个。第三行是当前自动化与引擎内置的 60% 自动化情形下的年度成本，因为那个数才给整个项目定了尺寸。第四行是栈的顺序：身份核验、数据发现、脱敏与交付、最后才是自助门户。第五行是内部 SLA，要定得比法定期限更紧，好让 60 天延期是事先批好的，而不是到期那天去争的。第六行是按月看的三个 KPI：单次请求成本、法定期内完结率、自动化率。第七行是重设基线的触发条件，因为一年量一次的 DSAR 项目，每次量的其实是另一家公司：任何新增数据采集面的产品发布、任何次级处理者变更、任何数据模式变更，以及同比请求量增长超过 50% 时把 12 个月的容量模型换成 2 到 3 年的那种情形。',
      items: [
        {
          step: 1,
          label: '滚动 12 个月的请求量按类型分别计数并与总量对账',
          gate: '过去 12 个月内访问、删除、可携带、更正四类分别计数，至少 4 个类型桶；同时单独记录从隐私邮箱以外渠道进来的请求数，以便与总量对账。',
          blockIf:
            '聚合量会把昂贵的类型藏起来，也会把队列藏起来 —— 一个只知道一年处理了 300 单的项目，分不清自己该买数据发现工具还是该多招一个人。更糟的是没对账的入口量：经由客服进来的请求照样起算一个月时钟，所以另一条队列里压着的积压，是你的仪表盘根本没让你看见的敞口。',
        },
        {
          step: 2,
          label: '各类型接触工时与 2-6 小时人工基准逐类对比',
          gate: '过去 3 个月内至少 20 单的接触工时被记录下来并按类型拆分，每一类与 2-6 小时基准区间对比，类型加权后的每单平均工时由这些实测数算出。',
          blockIf:
            '凭印象或凭某个人的感觉估出来的工时，正是 DSAR 成本模型差一倍的来源，而且每次都偏向乐观。不到 20 单实测，你手上不是基准而是轶闻，用它设的每一个自动化目标，都会在跑起来的第一个月被重新预测一遍。',
        },
        {
          step: 3,
          label: '年度成本算两遍 —— 现状与 60% 自动化',
          gate: '在当前自动化与 60% 自动化两个场景下分别算出年度 DSAR 成本，两边都用实测工时、你的全负荷时薪与工具成本搭出来，两个年度总额都写下来，并把两者差额以 EUR/年 写明。',
          blockIf:
            '只有一个成本数字，你知道自己在哪，却不知道任何一项干预值多少钱，于是工具也好、人也好，都没法做商业论证。而两个场景若不是用同一批实测工时搭的，它们之间的差额就是假设而不是节省 —— 那个数字会被往上报，之后再回头解释。',
        },
        {
          step: 4,
          label: '自动化栈按层级排序，先上层级 1 与层级 2',
          gate: '层级 1 身份核验与层级 2 数据发现都已上线且有实测数据，层级 3 脱敏与交付要么在建、要么已有排期日期，自助门户要么未启动、要么只在层级 1-3 稳定至少 1 个季度之后才启动，每一层都点名负责人。',
          blockIf:
            '先做自助门户是最常见也最贵的排序错误，因为门户是请求的入口而不是数据的来源，没有取数与脱敏自动化时，它只是把同样的人工活搬进一个好看的界面。层级 3 没有层级 2 是同一个问题的缩小版：交付快了，可要组装的内容照样靠手工，缺的字段照样要人去追。',
        },
        {
          step: 5,
          label: '分层内部 SLA 写死，并预批 60 天延期缓冲',
          gate: '内部时钟写下来：简单访问 15 天、删除 30 天并预批 60 天延期缓冲、可携带 30 天；另有一条身份核验被拒后申请人真正用得上的申诉路径，每个时钟都点名负责人。',
          blockIf:
            '所有请求类型共用一个时钟是陷阱，因为删除和访问是两件不同的活，把删除压进访问的时钟里，做出来的要么是赶工、要么是逾期，而这两样最后落在同一个地方。而从没预批过的延期缓冲在你需要时并不存在 —— 走完审批的时间比它本来要替你换来的通知窗口还长。',
        },
        {
          step: 6,
          label: '三个 KPI 按月上报，且至少三个月历史',
          gate: '每单成本（EUR）、法定期内完结率（%）、按工时加权的自动化覆盖率（%）按月上报，至少连续 3 个月的历史，且每个数字每个月的算法一致。',
          blockIf:
            '三个月是把一次性改善与流程变化分开的最低长度 —— 一个漂亮的好月份通常是清掉了一次积压，而不是修好了一套流程。更大的风险是中途改口径：序列会变得没法读，报表也就悄悄变成了仪式；把定义写在第一个数字旁边，之后不要再动。',
        },
        {
          step: 7,
          label: '季度重对排进日历，并列明三类重新基线的触发事件',
          gate: '日历上有一个对着基准表做的季度重对（每 1 个季度 1 次）并点名负责人；另有 3 类事件各触发一次重新基线 —— 产品新增数据面、次级处理者变更、可报告泄露；上一次重新基线日期与下一次日期都写下来。',
          blockIf:
            '没有日期的对标是文档而不是度量：可比集合和产品数据面都在动，所以半年前定下的数字描述的是另一家公司。真正要紧的是触发事件，因为一次新增数据面的发布会同时改变发现范围与删除传导清单，只按日历重对会漏掉它，直到下一个请求把缺口暴露出来。',
        },
      ],
    },
  },
};
