// P166 —— S 类（Sales）主题「pipeline-value-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论：照搬既有散文 = 抄写自己）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许手写金额，但必须带口径）：
//   · 覆盖率一律 = 阶段加权管道 ÷ 剩余期配额；加权概率固定 20/40/60/80%
//   · 「剩余期配额」不是整季配额；用整季配额会把缺口读小约三分之一
//   · 转化率一律取滚动 90 天**已关闭** cohort；开放机会不进分母
//   · 「组合偏移」= 开放管道里 SMB 占比 − 计划里 SMB 占比
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A fat pipeline is not the same as a covered one, and the quarter can be missed with a full board of opportunities sitting on it. The reason is that the weighted pipeline you compute counts things that are not really pipeline: opportunities tagged to the wrong stage, deals that die in the last mile, and deals from a segment your team has quietly stopped selling into. The rows below are a repair order for a month like that. Open with the stage probabilities themselves, because coverage is only meaningful if they reflect what your own win rates do, and a team that copied 20/40/60/80 percent from a benchmark is measuring the funnel of somebody else. Then the tagging quality underneath those stages, since every rate you read is computed over the population tagging defines. Then the stage-by-stage conversion itself, which splits into three different problems that need three different fixes: too few opportunities being created, opportunities being created and then dying at proposal, and commit-to-close slipping on deals that were already won in substance. Deal mix comes before quota attainment, because SMB deals close faster but are worth less each, so the same coverage number buys a different amount of bookings when the mix moves.',
      rows: [
        {
          priority: 1,
          metric: 'Stage-tagging completeness — open opportunities carrying a stage, a deal size and an expected close date ÷ all open opportunities',
          fixFirst:
            'Repair tagging first, because every number in this table is computed over the population that tagging defines. Weighted pipeline, coverage, stage conversion and mix share all share the same denominator, and that denominator is your open opportunity list. When a quarter of the list carries no stage tag, the weighting step in Step 2 spreads probability across deals you have no forecast for, and the coverage ratio in Step 3 becomes a number you cannot move by selling. It is also the cheapest row on the table to close: it is a query plus a cleanup of stale records, not a programme, and it can be finished in a day. Do it before you set any coverage target, because a target measured on a mis-staged book is a target you will miss for reasons unrelated to the team.',
          alsoMoves:
            'It changes what the rest of the table measures, and usually in a direction that feels like bad news. Stale and mis-tagged deals cluster in the late stages, because nobody re-tags a deal that stopped moving and nobody downgrades a deal they are still hoping to close. Clearing that backlog therefore lowers reported late-stage coverage first, then lowers the blended coverage number, and only later do the real stage conversion rates settle into readable bands. It also stabilises the denominators of the conversion rates in the audit step, because a stage transition counted from a mis-tagged origin has no meaningful rate to begin with.',
          backfire:
            'Cleaning the tags can look like a collapse, and that is the trap. The stale backlog you remove does not disappear; it is either reclassified into Discovery or closed-lost, and in the week you clean it the weighted pipeline drops, so measured coverage falls below its band and the forecast you already committed to looks wrong. If the cleanup lands in the same week as a forecast review, you will be asked to explain a number that fell because the previous number was inflated. Clean the tags, then re-baseline the coverage number, then report it. The second backfire is more permanent: once the pipeline is honest, it is usually smaller than the pipeline you were managing against, and the gap between them is real revenue that was never coming — hiding that gap is the thing tagging was supposed to stop.',
        },
        {
          priority: 2,
          metric: 'Late-stage coverage — stage-weighted pipeline in Negotiation and Closing ÷ remaining-period quota',
          fixFirst:
            'Fix late-stage coverage second because it is the gap you can close inside this quarter without buying demand. Deals in Negotiation and Closing are already in motion, so what you are missing there is qualification, pacing and a next meeting on the calendar, not market. It is also the band where a small absolute change flips the outcome: the difference between 2x and 3x of quota is a few deals, not a few campaigns, which is why a coverage target set at 3x that sits at 2.1x fails while the pipeline looks busy. Rank it above the top of the funnel because the top is a purchase decision with a long lead time, whereas the late stage is a scheduling decision you control this week. The trap to avoid is chasing the blended ratio, which can be healthy while the late stage is empty.',
          alsoMoves:
            'Lifting the late stage moves the blended coverage figure with it and shrinks the top-of-funnel target you have to hit, because a healthy late stage lets you feed fewer fresh opportunities and still hold the same booking number. It also exposes the cheapest win-rate improvement in the book: a deal that has been parked in Negotiation for more than 30 days is usually missing one artifact — a security review, a procurement contact, a signed scope — and clearing that single blocker converts a deal that was already counted in the pipeline but was never going to be booked. That is why late-stage coverage work tends to pull the Commit-to-Close rate up as a side effect rather than as a second project.',
          backfire:
            'The usual way to lift late-stage coverage is to discount, and discounting moves a deal into Closing while pulling blended deal value down. If your quota is set in booked value, a coverage ratio that looks healthy can be carrying a book that books 15 percent less per deal, and you will celebrate a coverage number while the bookings number stalls. Always read late-stage coverage next to realized average contract value, never on its own. The second backfire is treating the stage label as the lever: an opportunity moved from Negotiation to Closing jumps from 60 to 80 percent probability and adds weighted pipeline without a single new meeting happening. If you cannot name the event that moved the deal, you did not improve the pipeline, you improved the weighting, and the next month the number falls back on its own.',
        },
        {
          priority: 3,
          metric: 'Commit-to-Close conversion rate — deals closed won ÷ deals that reached Commit, trailing 90 days',
          fixFirst:
            'Fix this third because a slipping commit-to-close rate is the most expensive leak in the funnel: those deals already consumed the discovery, the demo and the proposal, and they die in the last mile — procurement, legal, or a price gap nobody was authorised to close. It is also the quickest of the three to measure, because a 90-day cohort has fully resolved by now, so you do not wait a quarter to learn whether the fix worked. Rank it below the two rows above for one reason: you cannot interpret the rate until the stage labels are trustworthy, and you should not chase it until you know whether the coverage gap is real. Once both of those hold, this rate is the check on everything else, because it is the only metric that tells you whether a deal that reached the finish line actually finished.',
          alsoMoves:
            'It recalibrates the stage probabilities you weight with, which means it changes the accuracy of every coverage number in the table. If only 60 percent of committed deals close, then 80 percent is not a probability, it is optimism, and every weighted pipeline figure is inflated by roughly that gap — so fixing this rate moves measured coverage down toward reality while making it more useful. It also sets the band you should be defending in the late-stage row: a 60 percent close rate and an 80 percent close rate need different late-stage coverage for the same booking number, so the target in Step 7 is downstream of this rate and should not be set before it.',
          backfire:
            'Pushing the close rate with discounts and friendly paperwork inflates the rate now and produces a hole in the next quarter, because a deal signed at an approval level nobody signed for gets renegotiated or cancelled on procurement review. That hole lands straight in the late-stage coverage band as a sudden drop you will misread as a coverage problem and try to fix with more pipeline. The other version is reclassifying stalled commits as closed-lost to keep the rate tidy: the customer is still live, still in your funnel, and still consumes selling time, so the rate looks fixed while the underlying motion is unchanged and the churn shows up later as an unexplained re-entry. Judge this rate on bookings that survived to invoicing, not on deals marked won.',
        },
        {
          priority: 4,
          metric: 'Deal-mix drift — share of open pipeline in SMB deals ÷ share of SMB deals in the plan',
          fixFirst:
            'Address mix fourth because it is the only coverage lever that does not require spending money or waiting for a new lead source: it works on the deals you already own. The arithmetic favours it — SMB deals carry less value each and close faster, so they recover coverage sooner — which means a pipeline weighted toward SMB needs a smaller absolute pipeline to hit the same booking number. But it ranks fourth because mix is a lever you can only pull on what is already in the book: it does nothing for demand, and if the real problem is that the funnel top is empty, no reallocation fixes that. Check the drift before you change anything, because a mix that has drifted because enterprise deals stalled is a conversion problem wearing a mix problem costume, and reallocating attention to SMB will hide the stall rather than repair it.',
          alsoMoves:
            'A deliberate mix shift changes the win rate and cycle length you should expect from every other row, so it re-prices the targets in the guide. SMB wins far more often than enterprise and closes in a fraction of the time, so a shift toward SMB lifts blended win rate and shortens blended cycle, which in turn lets you defend a lower coverage requirement for the same bookings number. Read the other way, it is a diagnostic: if the enterprise share of open pipeline has fallen to almost nothing while your plan assumes enterprise revenue, the enterprise motion is not a pipeline problem, it is a process that no longer exists.',
          backfire:
            'Mix can be improved by dropping the enterprise deals you were never going to close, and that raises blended win rate and blended cycle speed in the same quarter while quietly shrinking the highest-value part of the book. Two quarters later, when a strategic account shows up, there is no enterprise motion left to catch it: no executive sponsor, no security review path, no reference customer. The metric stays green and the ceiling on your pricing power has fallen. A mix shift is a decision to sell a different product, so write down the segment you are choosing and the segment you are declining — and if the answer is that you are declining enterprise, price that decision into the plan rather than discovering it through a coverage gap.',
        },
        {
          priority: 5,
          metric: 'Top-of-funnel fill — qualified opportunities entering Discovery per week ÷ the weekly rate the plan requires',
          fixFirst:
            'Fix top-of-funnel fill last, and the reason is about lead time rather than about importance. New opportunities take a full sales cycle to become bookings, so a top-of-funnel push started this month contributes to a quarter you have not forecast yet, while the leaks in rows one to four are costing you money every week you leave them open. Repair the cheaper and faster leaks first, then feed the top. Do not skip this row, though: once tagging is clean, the late stage is covered, the close rate is honest and the mix is deliberate, a thin funnel top is no longer a diagnosis but a fact — it means demand, and no amount of pipeline hygiene substitutes for it. At that point, pipeline generation stops being a sales problem and becomes a marketing and channel problem with a budget attached.',
          alsoMoves:
            'It is what makes the weekly cadence worth keeping, because the per-stage coverage targets in the guide are only reachable if the top is fed at the rate those targets assume. Feed rate multiplied by coverage is the real capacity of the team, and showing both together is what stops a quota being set that the structure of the funnel cannot deliver. It also moves the value of the rows above: a healthy top of funnel makes the late-stage gap smaller, because you are no longer trying to cover the quarter with the handful of deals that happen to be in motion. And when you finally rebuild the funnel top, keeping the other four rows clean is what lets you tell whether the new lead source works.',
          backfire:
            'Inflating the funnel top to reach a coverage target is the easiest way to make a coverage metric look healthy while the book gets worse. Unqualified opportunities dilute response rates, fill the discovery calendar with deals that will not convert, and pull stage conversion down on every stage at once, so the coverage ratio improves while the underlying motion degrades — you have bought denominator with numerator quality. The subtler version is buying volume from a channel with a different buyer: opportunity count rises, the win rate falls in the same quarter, and the mix row drifts at the same time, which means one bad sourcing decision damages three rows of this table at once. Measure fill on qualified opportunities that survive the first qualification gate, never on raw form submissions.',
        },
      ],
    },
    zh: {
      intro:
        '管道厚不等于管道够，桌上一堆机会的情况下，季度照样可能打不中。原因在于你算出来的那个加权管道可能装着根本不是管道的东西：阶段打错标的机会、死在最后一公里的单子，以及团队其实已经不再卖的那一类客群的单子。下面几行是那种月份的修复顺序。先定阶段概率本身，因为覆盖率只有在这些概率反映你自己真实赢率时才有意义，而照抄 20/40/60/80 这套外部基准的团队，量的是别人的漏斗。接着是打标质量，因为后面每个转化率都算在打标定义的总体上。然后是逐阶段的转化本身，它其实是三类各自独立的问题、需要三类各自的修法：机会创造得不够多、机会造出来了却死在提案、以及实质上已经赢了却在 commit 到 close 掉档。成交组合排在配额达成之前，因为 SMB 的单子关得快但每单价值低，组合一变，同一个覆盖率数字换回来的订量就不同。',
      rows: [
        {
          priority: 1,
          metric: '阶段打标完整率 —— 带阶段、客单价与预期成交日期的开放机会数 ÷ 全部开放机会数',
          fixFirst:
            '第一个修打标，因为这张表上每个数字都建立在打标定义的那个总体之上。加权管道、覆盖率、阶段转化率、组合占比，共用同一份开放机会清单当分母。当清单里有四分之一没打阶段标，步骤 2 的加权就是把概率摊在一批你根本没有预测依据的单子上，步骤 3 的覆盖率就变成一个你靠卖不动、改销售也难改的数。这也是全表最便宜的一行：它是一条查询加一次陈旧记录清理，不是一个项目，一天能收工。要在任何覆盖率目标定下来之前做完 —— 用一本标错的账量出来的目标，你会因为跟团队无关的原因没打中。',
          alsoMoves:
            '它会改变这张表其余各行量到的东西，而且方向通常让人不舒服。打错标的单子会扎堆在末段，因为没人会去给一个早就停住的单子重新打标，也没人愿意把还指望成的单子往下调。清掉这批陈旧积压之后，报出来的末段覆盖率会先掉，然后是综合覆盖率也掉，最后才是真实的阶段转化率落进可读的区间。它同时稳住了阶段审计里那些转化率的分母 —— 从一个打错标的起点去数的阶段迁移，本身就没有有意义的比率可言。',
          backfire:
            '清理打标可能看起来像崩盘，这就是坑所在。被清掉的陈旧单子不会凭空消失，它要么被改判到 Discovery，要么被判为关闭失败；如果清理和一次预测评审落在同一周，加权管道当周就掉，量出来的覆盖率跌破区间，你承诺过的预测看起来就错了。要么先清标、重设覆盖率基线、再对外报，要么这一周就别动数字。第二个反噬更持久：管道变诚实之后，它通常比你一直在管理的那本管道小 —— 中间那道差是本来就到不了的收入，而把差藏起来正是打标本来要解决的事。',
        },
        {
          priority: 2,
          metric: '末段覆盖率 —— 谈判与关单阶段的加权管道 ÷ 剩余期配额',
          fixFirst:
            '末段覆盖率排第二，因为这是你在这个季度内不花钱、不等新线索就能补上的缺口。谈判和关单里的单子已经在推进，缺的是资格确认、节奏和日历上下一次会面，缺的不是市场。它也是那个「绝对量一动、结果就翻面」的区间：2 倍和 3 倍配额之间差的是几单，而不是几场活动，所以定 3 倍目标而实际只有 2.1 倍，管道看着很忙照样没打中。把它排在漏斗顶之前，是因为漏斗顶是一个带回款期的采购决定，末段是你这周就能排期的调度决定。要避免的是追综合覆盖率：综合数可以很漂亮，而末段是空的。',
          alsoMoves:
            '把末段抬起来，会带着综合覆盖率一起动，也会把你需要在漏斗顶完成的量压下去 —— 末段健康时，你少喂一些新机会也能撑住同一个签约额。它还会把整本管道里最便宜的成交率改善暴露出来：在谈判里躺了超过 30 天的单子，通常只差一样东西 —— 一次安全审查、一个采购联系人、一份双方签字的范围说明 —— 把那一个卡点清掉，一个本来就计在管道里、却根本没打算开的单就真的开了。这就是为什么末段的工作往往会把「进入关单 → 真正开单」的比率顺手带起来，而不是变成第二个项目。',
          backfire:
            '抬末段覆盖率最常见的做法是降价，而降价会把单子推进关单阶段，同时把整本管道的单均价值拉低。如果你的配额是以签约额定的，一个看着健康的覆盖率背后可能是一本单均少 15% 的账 —— 你在庆祝覆盖率，签约额却卡住不动。末段覆盖率一定要和实际落袋的平均合同额一起看，绝不能单看。第二个反噬是把阶段标签当成杠杆：一个从谈判挪到关单的单子，加权概率从 60% 跳到 80%，管道凭空多出一截，中间没有开过一次会。如果你说不清是什么事件推动它挪的位，那你改善的是加权，不是管道 —— 下个月这个数自己就掉回去。',
        },
        {
          priority: 3,
          metric: '进入关单阶段的成交率 —— 关单阶段赢下的单数 ÷ 曾到达关单阶段的单数，取滚动 90 天',
          fixFirst:
            '这一项排第三，因为「进入关单 → 真的开单」的比率一旦松动，是整条漏斗里最贵的漏点：这些单子已经把发现、演示和方案的钱花掉了，却死在最后一公里 —— 采购、法务，或者一个没人被授权拍板的价差。它也是三项里最快量到的一个，因为 90 天的 cohort 现在已经全部关闭，你不用等一个季度才知道修没修成。排在前面两行之后的理由只有一个：阶段标还不可信时，这个比率读不出来；覆盖率缺口是真是假你还不知道时，也别急着追它。这两件事站住之后，它才是对其他所有动作的检查项 —— 因为它是唯一一个能告诉你「跑到终点的单子到底有没有到终点」的指标。',
          alsoMoves:
            '它会重新校准你用来加权的阶段概率，也就等于改掉这张表里每一个覆盖率数字的准确性。如果只有六成的关单单子真能开成，那 80% 根本不是概率，是乐观 —— 所有加权管道都因此虚高了一截左右，所以修这个比率会把量出来的覆盖率拉回真实，同时让它变得更有用。它也决定末段那一行该守什么区间：六成成交率和八成成交率，要拿到同样的签约额需要不同的末段覆盖率，所以步骤 7 的目标在它之后，不该在它之前定。',
          backfire:
            '用折扣和宽松的手续去推成交率，会把比率抬高、同时在下一个季度留一个洞 —— 一个在没人真正签批的层级上签下来的单子，到采购复核时会重新谈或者被取消。那个洞会直接砸进末段覆盖率那一行，变成一个突然的下滑，而你会把它误读成覆盖率问题，然后试图用加更多管道来修。另一个版本是把卡住不动的关单单子改判成「关闭失败」来让比率好看：客户还活着、还在你的漏斗里、还在消耗销售时间，比率看着修好了，底下的动作一点没变，流失会在后面以「莫名其妙又回来了」的形式出现。这个比率要看活到开票的单子，不看标记为赢的单子。',
        },
        {
          priority: 4,
          metric: '成交组合偏移 —— 开放管道里 SMB 单的占比 − 计划里 SMB 单的占比',
          fixFirst:
            '组合放第四，因为它是唯一一个不花钱、不等新线索来源就能动的覆盖率杠杆：它作用在你已经拥有的那批单子上。算术上是偏向它的 —— SMB 单值更低但成交更快，所以一份偏 SMB 的管道需要更小的绝对金额就能打到同样的签约额。但它排第四，是因为组合这个杠杆只能在你手上已有的范围里拉：它对需求毫无作用，如果真正的问题是漏斗顶是空的，怎么重新分配都补不上。所以先量偏移再动手 —— 如果组合之所以偏，是因为大客户那批单子卡住了，那么这是一个穿着组合问题外衣的转化问题，把注意力挪到 SMB 只会把那个卡点藏起来而不是修好它。',
          alsoMoves:
            '一次有意识的组合调整会改变你在其余每一行上应该预期的成交率与周期长度，于是它把指南里的那些目标重新定价。SMB 的成交频率远高于大客户、周期只是零头，所以往 SMB 偏会抬高综合成交率、缩短综合周期，反过来又让你能用更低的覆盖率守住同一个签约额。反过来读，它也是一个诊断器：如果开放管道里大客户的占比已经掉到几乎为零，而你的计划里还压着大客户收入，那问题不是管道，是那套大客户动作已经不存在了。',
          backfire:
            '组合可以通过把本来就开不成的大客户单子丢掉来变好看，于是同一个季度里综合成交率上去了、综合周期也变短了，而整本账里最值钱的那部分被悄悄缩掉了。两个季度之后，当一个战略型客户出现，你已经没有大客户动作去接它：没有高管赞助、没有安全评审路径、没有可引用的标杆客户。指标还是绿的，而你定价权的上限已经降下来了。组合调整等于决定改卖另一种产品，所以要把你选的客群和你放弃的客群都写下来 —— 如果答案是放弃大客户，那就把这个决定写进计划，而不是从一个覆盖率缺口里慢慢发现它。',
        },
        {
          priority: 5,
          metric: '漏斗顶填充率 —— 每周进入 Discovery 的合格机会数 ÷ 计划所需的周速率',
          fixFirst:
            '漏斗顶填填充放最后，理由是回款期而不是重要性。新机会要走完一整个销售周期才能变成签约，所以这个月开始推的漏斗顶，贡献的是你还没预测过的那个季度；而前四行那些漏点，每多放一周都在花钱。先修便宜且见效快的漏点，再喂顶端。这一行不能跳过：一旦打标干净、末段覆盖到位、成交率诚实、组合有意，此时漏斗顶偏薄就不再是一个诊断，而是一个事实 —— 它意味着需求，而任何管道卫生都替代不了需求。到了这一步，管道生成不再是销售问题，而是一个要花钱的市场与渠道问题。',
          alsoMoves:
            '它是周度节奏值得保留的原因 —— 指南里那套分阶段覆盖率目标，只有在顶端按目标假设的速率被喂养时才够得着。喂养速率乘以覆盖率，才是团队的真实产能，把两者并排放，正是它阻止你定出一个漏斗结构根本交付不了的配额。它也会改变上面几行的价值：漏斗顶健康之后，末段缺口会变小，因为你不必再拿少数几个恰好在推进的单子去撑整个季度。而等你真的重建漏斗顶时，把前四行保持干净，就是你能判断新线索来源到底管不管用的前提。',
          backfire:
            '为了凑到覆盖率目标而把漏斗顶灌水，是让覆盖率指标好看、同时让整本账变差的最省事的办法。不合格的机会会稀释回复率、把发现日历塞满根本不会转化的单子，于是每个阶段的转化率一起下滑 —— 覆盖率改善了，底下的动作却退化了，等于拿分子质量去换分母。更隐蔽的版本是从一个买家完全不同的渠道买量：机会数上去了，成交率同一个季度掉下来，组合那一行同时漂移 —— 一次糟糕的渠道决策同时伤到这张表上的三行。所以填充率要按「过了第一道资格门的合格机会」来量，绝不能按表单提交数来量。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Pipeline reporting fails at the tagging step far more often than at the arithmetic, so these seven checks start where the population is defined. Coverage is stage-weighted pipeline divided by the quota for the remaining period of the quarter, never the full-quarter quota, and a coverage number computed the other way reads healthy in the last week of a quarter while the pipeline was never there. The stage conversion rates carry the same constraint: they are measured on deals that actually closed inside a trailing 90-day window, because an open opportunity has neither been won nor lost and folding it into a rate flatters whichever side of it sits next to. Every figure has to survive a mix shift as well, since coverage and win rate move in opposite directions when the book tilts from enterprise toward SMB, and a stage target written for one mix quietly becomes wrong for another.',
      items: [
        {
          step: 1,
          label: 'CRM hygiene: stage, deal size and close date on every open opportunity',
          gate:
            'At least 95% of open opportunities carry a stage tag, a deal size and an expected close date, and no opportunity has stayed in the same stage for more than 90 days without its close date being updated.',
          blockIf:
            'Below 95% completeness, the stage-weighted pipeline in Step 2 is a weighted average over an unknown population, so the coverage ratio in Step 3 can be moved by tagging rather than by selling. You will spend the quarter tuning coverage against a denominator that is missing deals. Finish the tagging and clear the stale backlog before setting any coverage target.',
        },
        {
          step: 2,
          label: 'Stage-weighted pipeline computed at fixed 20/40/60/80 percent weights',
          gate:
            'Weighted pipeline is recomputed from stage weights of 20% for Discovery, 40% for Proposal, 60% for Negotiation and 80% for Closing, and it moves less than 15% week over week unless a change in stage mix is recorded in writing.',
          blockIf:
            'When the weekly weighted figure swings by more than 15% with no stage-mix explanation, one of two things is true: the weights are being adjusted to fit the forecast, or deals are being re-staged to move the number. Either way the denominator behind Step 3 drifts underneath you and the coverage band stops meaning what it says.',
        },
        {
          step: 3,
          label: 'Coverage ratio measured against the remaining-period quota',
          gate:
            'Coverage equals weighted pipeline divided by the remaining-period quota, computed on a weekly run, with the result banded at 4x and above strong, 3x healthy, 2x warning and below 2x danger.',
          blockIf:
            'Coverage measured against the full-quarter quota after two months have already gone understates the gap by roughly a third, so a book that will miss still reads as comfortable. If the remaining-period quota is not broken out, the band you are reading is the wrong band and every target set in Step 7 inherits the error.',
        },
        {
          step: 4,
          label: 'Deal-mix scenarios modelled in both directions, not assumed',
          gate:
            'At least 2 mix scenarios are modelled in the Pipeline Coverage Calculator each quarter, one shifting toward SMB and one toward enterprise, and each is written down with its resulting coverage, win rate and cycle length before any of them is acted on.',
          blockIf:
            'Modelling only the scenario you want is not modelling. Without win rate and cycle attached to each mix, the coverage figure in the model is a single-variable calculation that always favours the mix you assumed. Without both directions on the record, Step 5 has nothing to compare the projection against.',
        },
        {
          step: 5,
          label: 'Monthly bookings projection compared against the run-rate target',
          gate:
            'Monthly bookings projected from current opportunities multiplied by win rate and divided by cycle length land within 10% of your run-rate target, or the residual is attributed to a named stage rather than left unexplained.',
          blockIf:
            'When the projection misses by more than 10% and no stage is named, the residual is usually sitting inside one of the three Step 6 branches, and you will spend a quarter adding pipeline to a funnel that is leaking at the close. If you cannot point at the stage where the money is lost, the fix list is guesswork.',
        },
        {
          step: 6,
          label: 'Stage-by-stage conversion audit ending in one named branch',
          gate:
            'Conversion is measured for at least 3 stage transitions over a trailing 90 days, each against its band, and the audit closes with exactly 1 named branch — top-of-funnel, mid-funnel or closing — carrying a single owner and a date.',
          blockIf:
            'An audit that concludes all three stages need work produces three workstreams and no forecast. If one branch and one owner are not written down, the fixes land on the stage that is easiest to measure rather than the stage losing the money, and Step 7 then sets per-stage targets against the wrong leak.',
        },
        {
          step: 7,
          label: 'Per-stage coverage targets tracked weekly, not quarterly',
          gate:
            'Per-stage coverage targets of 5-7x for top-of-funnel, 3-4x for mid-funnel and 2-3x for late-stage are recorded per stage, the weekly run date is fixed, and at least 8 consecutive weekly readings exist for one stage before the targets count as settled.',
          blockIf:
            'Coverage drifts inside a month, so a quarterly review catches the drift after the quarter is already missed, and a target set from a single reading is a target set from noise. Without 8 weekly readings you do not know whether a stage is genuinely under-covered or simply moving with the season.',
        },
      ],
    },
    zh: {
      intro:
        '管道报表坏在打标那一步的次数，远多于坏在算术的次数，所以那七条检查从定义总体的地方开始。覆盖率是阶段加权管道除以季度剩余期的配额，绝不是除以整季配额；用错分母算出来的覆盖率，会在季度最后一周看起来很健康，而那批管道从来就没存在过。阶段转化率受同一条约束：只在滚动 90 天里真正关闭过的单子上量，因为开放机会还没赢也没输，把它折进某个比率会悄悄抬高它旁边的那一侧。每个数字还得扛得住一次组合偏移——当账面从大客户往 SMB 倾斜时，覆盖率和成交率会朝相反方向动，而照某一个组合写出来的阶段目标，换个组合就悄悄变成了错的。',
      items: [
        {
          step: 1,
          label: 'CRM 卫生：每个开放机会都带阶段、客单价与预期成交日期',
          gate:
            '至少 95% 的开放机会同时带阶段标、客单价与预期成交日期，且没有任何一个机会在同一个阶段里待过超过 90 天而成交日期从未更新。',
          blockIf:
            '完整率低于 95%，步骤 2 的阶段加权管道就是对一份构成不明的总体做加权，步骤 3 的覆盖率于是可以被「改标」而不是被「卖单」推动，你会花一整个季度去调一个分母里缺了单子的覆盖率目标。先把标打完、把陈旧积压清掉，再定任何覆盖率目标。',
        },
        {
          step: 2,
          label: '按固定 20/40/60/80% 权重算出的阶段加权管道',
          gate:
            '加权管道按 Discovery 20%、Proposal 40%、Negotiation 60%、Closing 80% 重算，且在没有记录阶段结构变化原因的情况下，周对周波动不超过 15%。',
          blockIf:
            '加权数周对周摆动超过 15% 又没有阶段结构说明时，只有两种可能：权重在被调去迁就预测，或者单子在被重新打标来推数字。无论哪一种，步骤 3 背后的分母都在你脚下漂移，覆盖率的区间也就失去了它本来代表的意思。',
        },
        {
          step: 3,
          label: '用剩余期配额算出的覆盖率（不是整季配额）',
          gate:
            '覆盖率 = 加权管道 ÷ 剩余期配额，按周运行计算，并按 4 倍以上强壮、3 倍健康、2 倍警戒、低于 2 倍危险四档读数。',
          blockIf:
            '已经过去两个月还拿整季配额当分母，缺口会被读小约三分之一，明明打不中的那本账也会显示得很宽裕。剩余期配额没有单独拆出来之前，你读的是错误的区间，步骤 7 设的每一个目标都会把这个错误继承下去。',
        },
        {
          step: 4,
          label: '成交组合要双向建模，而不是只假设一种方向',
          gate:
            '每个季度在 Pipeline Coverage Calculator 里至少建 2 个组合情景，一个偏 SMB、一个偏大客户，且每个情景在执行之前都写下它对应的覆盖率、成交率与周期长度。',
          blockIf:
            '只建你想要的那个情景不叫建模。没有把成交率与周期挂到每个组合上，模型里的覆盖率就是一个单变量计算，而它总会偏向你假设的那个组合。两个方向都没有落到纸面，步骤 5 的投影就没有可比的对象。',
        },
        {
          step: 5,
          label: '月度签约投影与运行率目标之间的差距要归因到阶段',
          gate:
            '用当前机会数 × 成交率 ÷ 周期长度投影出的月度签约额，落在运行率目标的 10% 以内；超出部分的差额被归到某个具名阶段，而不是留成 unexplained 的残差。',
          blockIf:
            '投影差过 10% 又指不出是哪个阶段时，残差通常就藏在步骤 6 的三个分支之一里，而你会花一个季度往一个在关单处漏水的漏斗里加管道。指不出钱是在哪一段丢的，那份修复清单就是猜的。',
        },
        {
          step: 6,
          label: '阶段转化审计，最后收敛到唯一一个具名分支与负责人',
          gate:
            '滚动 90 天里至少量了 3 个阶段迁移的转化率、每个都对比了区间，审计以唯一一个具名分支收尾 —— 漏斗顶、中段或关单 —— 并带上一个负责人和一个日期。',
          blockIf:
            '审计结论是「三段都要改」，结果是三条工作流和零个预测。不写下一个分支和一个负责人，修复就会落在最好量的那一段，而不是在真正丢钱的那一段，步骤 7 于是照着错误的漏点去设分阶段目标。',
        },
        {
          step: 7,
          label: '分阶段覆盖率目标按周追踪，而不是按季度复盘',
          gate:
            '漏斗顶 5-7 倍、中段 3-4 倍、末段 2-3 倍这组分阶段覆盖率目标被逐阶段记录，周跑日期固定，且至少有一段阶段存在连续 8 次周读数之后，这些目标才算定下来。',
          blockIf:
            '覆盖率一个月内就会漂，按季度复盘等于在季度已经没打中之后才发现漂移，而凭单次读数设的目标是从噪声里设出来的。没有 8 次周读数，你分不清这一段是真的覆盖不足，还是只是跟着季节在动。',
        },
      ],
    },
  },
};
