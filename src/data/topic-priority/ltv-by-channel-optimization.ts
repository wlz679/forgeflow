// P166 —— M 类（Marketing Analytics）主题「ltv-by-channel-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时先修哪个 → 它顺带带动谁 → 什么条件下它反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是自己各渠道的单位经济学 ⇒ 不写市场单价）：
//   · LTV 一律指「群组实际已实现营收」而非预测值，且必须写明观察了几个月（SaaS 6-12 个月；DTC 0-6 个月；订阅 12-24 个月）
//   · CAC = 该渠道同期支出 ÷ 该渠道新客数，分子分母取同一个 30-90 天窗口
//   · 首次触点与末次触点分开记，不混用；末次点击会高估底漏斗渠道 30-50%
//   · LTV:CAC 写清是单渠道口径还是综合口径，付费口径与综合口径分开报
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A young cohort flatters the channel that acquired it and nothing else, which is why per-channel LTV has to be read at a fixed cohort age or not read at all. A 3-month paid-social cohort and a 24-month organic cohort are not two channels, they are two different questions: paid social typically halves by month 3-4, organic search by month 6-9, referral holds past month 12, and the slope of that curve rather than its headline retention is what drives LTV. So capture comes first, because every number downstream divides by a count of customers and untracked customers do not appear as a gap, they redistribute into whichever channels do have data, which makes your weakest channel look stronger and erases your best one. Then equalise cohort age, then measure payback, which is the only row connecting a marketing decision to your bank balance, and where a high-LTV slow-payback channel gets correctly judged as still fundable. Then the ceiling of the channel you intend to fund, because the ceiling decides the shape of an allocation and not just its size. And only then split paid from blended, since that gap tells you how much of your growth you can actually buy. Last-click attribution overstates brand search, retargeting and direct by 30-50%, which is why first-touch and last-touch stay in separate columns rather than being averaged into one flattering number.',
      rows: [
        {
          priority: 1,
          metric: 'Origin capture coverage — new customers with a recorded source divided by all new customers acquired in the window',
          fixFirst:
            'Capture coverage comes first because every per-channel number in this table divides by a count of customers you can only attribute if you wrote down where they came from. Untracked customers do not appear as a gap in your report; they silently redistribute themselves into the channels that do have data, which makes your weakest channel look stronger than it is and hides your best one entirely. The repair is a field, not a campaign: require an origin value at signup or checkout, backfill from referral codes where you have them, and store first-touch and last-click as two separate columns so the gap between them is visible rather than assumed. Do this before the arithmetic in Steps 1 and 3, because spend is allocated against a denominator that changes the moment you start counting differently.',
          alsoMoves:
            'Capture coverage is what makes the CAC in Step 3 comparable across channels, since two channels now share one denominator instead of two different ones, and it is the precondition for the paid-versus-blended split that decides whether a channel can be scaled at all. It also changes the ranking in Step 4: last-click attribution overstates bottom-of-funnel channels such as brand search and retargeting by 30-50 percent, so once you keep both columns you can see whether the channel on top of your list is genuinely the strongest or simply the one everybody lands on last.',
          backfire:
            'Capture work backfires in two ways. Backfilling origin from last-click data imports the exact bias you were trying to remove, and a table that looks 95 percent complete is more dangerous than one that looks 60 percent complete, because you will quote the first one in a meeting. The second trap is the cost of the field itself: a mandatory source question at signup costs somewhere between 1 and 3 percent of new signups, and that drop lands in the same month as the improvement, so it will look like CAC got worse on every channel at once. Price the field and the backfill before switching it on, and give the field a sensible default so the form does not have to be rebuilt around it.',
        },
        {
          priority: 2,
          metric: 'Cohort age parity — months of realized revenue observed divided by the months your LTV model assumes for that channel',
          fixFirst:
            'Cohort age comes second, because comparing a 24-month organic cohort against a 3-month paid-social cohort is the most common way per-channel LTV ends up wrong by a factor of two. The repair is to truncate everyone to the same observation age: take the same number of months of realized revenue for every channel, report the ratio on that basis, and keep the longer curve for the channels that have one. Paid social typically halves by month 3-4, organic search by month 6-9 and referral by month 12 or later, so the slope and not the headline retention is what separates them. Do it before Step 4, because a ranking built on unequal ages is not a ranking you can defend when the budget meeting asks why one channel is on top.',
          alsoMoves:
            'Equal age turns the Step 4 ranking into one that survives the quarterly re-benchmark in Step 6, and it decides whether the Step 5 reallocation is a real improvement or an artifact of which channel happened to start earlier. It also makes the total honest: if every channel is truncated at 6 months, the sum of channel LTV is comparable to the blended figure you report elsewhere, which is what allows the reallocation model in Step 5 to be arithmetic rather than reassurance.',
          backfire:
            'Truncating every channel to the same age hides the reason the quiet channels win. Organic and referral keep paying well past the point where paid social stops, so a 6-month table makes them look mediocre and you cut exactly the channels with the best late-life value. The second trap is a channel that started mid-period: it has no cohort at that age at all, and quietly dropping it changes the denominator of your averages, which re-ranks everything else. Report the missing cohort as missing rather than dropping it, and write down the provisional rule for how a channel with no cohort gets a place.',
        },
        {
          priority: 3,
          metric: 'CAC payback period by channel — months of that channel contribution margin needed to recover the CAC',
          fixFirst:
            'Payback belongs third, because a high-LTV channel with a 30-month payback is not a win; it is a cash-flow trap that a healthy ratio disguises. Compute, per channel, how many months of that channel own contribution margin it takes to recover the CAC from Step 3, and treat anything under 12 months as the capital-efficient band. Do it before you reallocate anything, because payback is the only metric here that connects a marketing decision to your bank balance, and it is the metric that tells you whether a reallocation is affordable rather than merely attractive on a spreadsheet.',
          alsoMoves:
            'Payback sets the ceiling on the Step 5 reallocation, because you can only move a quarter of your budget into a channel that pays back inside the window your cash can carry, and it tells you which channel has to be the receiver. It also changes what you measure after the move: a channel whose ratio improved because its payback got shorter may simply have acquired cheaper but shorter-lived customers, and that shows up in the quarterly re-benchmark in Step 6 as a tier change you never intended.',
          backfire:
            'Payback guidance backfires when you use it to pick the fastest channel and ignore what fast actually means. Fast payback usually comes with fast decay, so moving budget there to relieve cash pressure raises churn and lowers LTV, and you have fixed the cash number while breaking the value number. Two smaller traps sit underneath: measuring payback on gross margin ignores the fixed-cost load that the money has to service, and a channel that is currently loss-making can show an artificially short payback because its contribution margin is negative, which is arithmetic nonsense rather than a signal.',
        },
        {
          priority: 4,
          metric: 'Volume ceiling of the winning channel — new customers per month from your best channel divided by all new customers',
          fixFirst:
            'The ceiling comes fourth, because Step 5 is a plan to move a quarter of a channel into another channel, and the receiving channel has a finite capacity that nobody has measured. Find the point where the best channel stop responding to more spend, and treat it as the ceiling. Do it before you model the reallocation, because a shift that pushes the receiver past its ceiling produces new customers who are worse than the average of the ones it already had, and the model in Step 5 will show you the blended ratio improving while cohort quality quietly degrades underneath it.',
          alsoMoves:
            'The ceiling decides the shape of the allocation, not only its size. When the receiver is close to its ceiling the right move is a 60/30/10 split between winner, second and experimental, and when it has real room you can concentrate rather than spread thin. It also tells you what to expect in Step 6: a channel that has been at its ceiling for two quarters will not be promoted further when its cohort matures, and knowing that in advance stops you from moving the same budget twice.',
          backfire:
            'The ceiling backfires when it is inferred from last month instead of tested. A winner riding a seasonal upswing shows a high volume number with no headroom left, and pushing into it produces a cohort with worse retention than the one you were copying. The second trap is treating organic reach as if it were purchasable: doubling organic traffic beyond what your content investment can support requires compounding the work, not just the budget, so a reallocation that assumes organic scales like a paid channel will produce numbers your team cannot reproduce.',
        },
        {
          priority: 5,
          metric: 'Blended-versus-paid LTV:CAC gap — the ratio you report upward divided by the ratio computed on paid-acquired customers only',
          fixFirst:
            'The blend goes last, because it is the only row that cannot be settled with the data you already have: it needs the other four stable first, and it is the row most often skipped because the blended number looks healthy. Compute both ratios side by side, one on every customer and one on customers you can pay to acquire, and the gap between them is the organic halo. That halo is real revenue but it is not something you can buy more of, so it has no place in a scaling decision. Do this after the ceiling work, because the size of the halo determines how much of your growth you can actually purchase, and that number is an input to every allocation you are about to model.',
          alsoMoves:
            'The gap sets the scaling decision itself: paid LTV:CAC is the number that decides whether to raise budgets, and blended LTV:CAC is the number you report upward. It also tells you which of the two belongs in the What-If model, because a model that compounds a halo across new cohorts keeps producing beautiful answers that your cash flow cannot fund. Finally it explains why Step 6 has to be quarterly rather than annual, since the halo shifts as mix shifts and a mix change you did not measure shows up as a channel that suddenly looks like it stopped working.',
          backfire:
            'Allocating on the blended ratio backfires in a specific way: you move money toward channels whose strength comes from customers you did not buy, and because you cannot buy more of them, the spend grows without the customers following, so the blended ratio stays flat while CAC rises. The other failure is reporting the paid ratio upward without stating the blend gap; the reader then sees a much worse number than your dashboards show, and the disagreement is about definitions rather than about performance. State both, on the same period, every time.',
        },
      ],
    },
    zh: {
      intro:
        '一个三个月群组和一个两年群组不是两个渠道，是两个不同的问题 —— 付费社交通常在第 3-4 个月腰斩，自然搜索撑到第 6-9 个月，转介绍能过第 12 个月，而决定 LTV 的是那条留存曲线的斜率，不是它的头条留存率。所以按渠道 LTV 必须固定群组年龄读，否则干脆别读。顺序上第一件是采集，因为后面每个数都要除以一个客户数，而没被记录的客户不会变成一个缺口：他们只是流进那些有数据的渠道，于是最弱的渠道看起来更强，最好的那个彻底消失。然后是拉平群组年龄，再算回本期 —— 那是唯一把营销决定连到你银行账户上的行，也是「LTV 高但回本慢」的渠道仍然值得投的那一行。再然后是你打算加码那个渠道的天花板，因为天花板决定分配方案的结构，不只是规模。最后才把付费口径和综合口径拆开，那条差距才告诉你增长里有多少是真正买得到的。末次点击归因会把品牌搜索、再营销和直接访问这几种底部渠道抬高 30-50%，所以首次触点与末次触点必须分两栏，不许平均成一个好看的数。',
      rows: [
        {
          priority: 1,
          metric: '来源采集覆盖率 —— 有记录来源的新客数除以窗口内全部新客数',
          fixFirst:
            '第一条是采集覆盖率，因为这条链上每个分渠道数字都要除以一个客户数，而你只有真的记下客户从哪来，才能把营收归到某个渠道。没被记录的客户不会在报表里变成一个缺口：他们悄悄流进那些有数据的渠道，于是你最弱的渠道看起来比实际更强，最好的那个彻底被藏起来。修法是一个字段，不是一次投放：在注册或结账时要求填来源，有转介码的用转介码回填，把首次触点和末次点击分成两栏存下来，这样两者之间的差距是看得见的，而不是假设出来的。必须在步骤 1 与步骤 3 的算术之前做，因为支出是摊在一个分母上的，而你一开始换一种数法，分母就变了。',
          alsoMoves:
            '采集覆盖率让步骤 3 的 CAC 在渠道之间可比，因为两个渠道从此共用一个分母，而不是两个不同的分母；同时它是「付费口径 vs 综合口径」这个拆分的前提，而那个拆分决定了某个渠道到底能不能扩量。它还改变步骤 4 的排名：末次点击会把品牌词、重定向这类底漏斗渠道高估 30-50%，所以一旦你两栏都留着，你就能看出排在最上面的那个渠道是真强，还是只是大家最后都落在它身上。',
          backfire:
            '采集工作有两种翻车。用末次点击数据回填来源，等于把你本来要除掉的偏差又请回来；而一张看起来 95% 完整的表比一张看起来 60% 完整的表更危险，因为你在会上会引用前者。第二个坑是字段本身的成本：注册时加一个必填来源问题，通常会损失 1% 到 3% 的新注册，而这笔损失和改善落在同一个月，所以你看到的效果像是所有渠道的 CAC 一起变坏了。上线前先把字段与回填的成本算清楚，并且给它一个合理默认值，免得整个表单围着它重建。',
        },
        {
          priority: 2,
          metric: '群组年龄齐平度 —— 实际观察到几个月的营收除以你的 LTV 模型为该渠道假设的月数',
          fixFirst:
            '其次是群组年龄，因为拿 24 个月的自然搜索群组去比 3 个月的付费社交群组，是分渠道 LTV 算错一倍以上的最常见原因。修法是把所有人截到同一个观察年龄：每个渠道都取同样月数的已实现营收，在这个基础上报比率，更长的曲线则留给那些已经有它的渠道。付费社交通常在第 3-4 月腰斩，自然搜索在第 6-9 月，转介绍在第 12 月之后，所以真正把渠道区分开的是斜率，而不是表观留存。必须在步骤 4 之前做，因为建立在不同年龄上的排名，在预算会上被问「为什么这个渠道排第一」时你答不上来。',
          alsoMoves:
            '年龄拉平之后，步骤 4 的排名才能扛得住步骤 6 的季度重对，也才决定步骤 5 的再分配是真改善，还是「谁开始得早」的假象。它还让总和变得诚实：如果每个渠道都截到 6 个月，各渠道 LTV 之和就能和你对外面报的综合口径对齐，步骤 5 的再分配模型才是算术，而不是宽慰。它也决定了步骤 3 里 CAC 该配多长的营收窗口：观察月数不足 6 个月的渠道，营收分母天然偏小，配出来的比率会系统性地偏向「越年轻越差」，而不是「真的差」。',
          backfire:
            '把每个渠道都截到同一个年龄，会掩盖那些安静渠道之所以赢的原因：自然与转介绍会在付费社交早已停下的地方继续付费，所以 6 个月的表让它们显得平庸，而你砍掉的恰恰是晚生命周期价值最好的渠道。第二个坑是期间中途才启动的渠道：它在那个年龄上根本没有群组，而悄悄把它剔除会改变你平均值的分母，进而把其他所有渠道重新排序。宁可把缺失的群组标注为缺失，也不要直接删掉，并写下「新渠道没有群组时如何给出临时位次」的规则。',
        },
        {
          priority: 3,
          metric: '分渠道 CAC 回本期 —— 收回该渠道 CAC 需要几个月该渠道的贡献毛利',
          fixFirst:
            '第三个是回本期，因为一个 LTV 很高但要 30 个月才回本的渠道不是胜利，而是被一个漂亮的比率掩盖掉的现金流陷阱。逐渠道算一算：用步骤 3 的 CAC，需要几个月该渠道自己的贡献毛利才能把它挣回来，12 个月以内算资本高效。必须在任何再分配之前做，因为回本是这张表里唯一能把营销决定连到你银行余额上的指标，它告诉你的是一次再分配「付得起」，而不只是「表格上好看」。',
          alsoMoves:
            '回本期给步骤 5 的再分配设了上限，因为你只能把钱挪进一个回本周期落在你现金能扛的窗口内的渠道，同时它也告诉你谁该当接收方。它还改变你搬完钱之后要量什么：一个因为回本变短而比率变好的渠道，可能只是买来了更便宜但活得更短的客户，这在步骤 6 的季度重对里会表现成一次你从没打算做的档位调整。它也决定了步骤 4 的档位该怎么读：一个 LTV:CAC 高达 5.0x 但要 24 个月才回本的渠道，在档位上算赢家，在现金流上算禁用，两个标签同时成立时先看回本。',
          backfire:
            '回本这条纪律的翻车方式，是把它当成「挑最快的渠道」却不看快意味着什么。回本快通常伴随衰减也快，所以为了缓解现金压力把钱挪过去，会抬高流失、拉低 LTV，你修好了现金那个数，却把价值那个数弄坏了。底下还有两个小坑：用毛利率算回本会忽略这笔钱要背的固定成本；而一个当前亏损的渠道，因为贡献毛利为负，反而会显示出短得离谱的回本期——那是算术荒谬，不是信号。',
        },
        {
          priority: 4,
          metric: '赢家的体量天花板 —— 最好那个渠道每月带来的新客数除以全部新客数',
          fixFirst:
            '再往下是天花板，因为步骤 5 是一份「把一个渠道的四分之一搬给另一个渠道」的计划，而接收方有一个没人量过的有限容量。找出最好的那个渠道从哪一点开始对追加预算不再有反应，把那一点当作天花板。必须在建模之前做，因为把接收方推过天花板的搬迁，会带来一批比它原有平均质量更差的新客，而步骤 5 的模型会给你看综合比率变好了，队列质量却在底下悄悄劣化。',
          alsoMoves:
            '天花板决定的是分配方案的结构，不只是规模。当接收方已经接近天花板，正确的动作是赢家 / 第二 / 实验的 60/30/10 配比；当它还有真实空间，你才可以集中而不是摊薄。它还告诉你步骤 6 该期待什么：一个已经贴着天花板跑了两个季度的渠道，不会在群组成熟时被进一步上调，而提前知道这一点，能避免你把同一笔钱搬两次。',
          backfire:
            '天花板如果是用上一个月的数据倒推出来的，就会翻车：一个正处在季节性上扬期的赢家会显示出很高的量，但其实已经没有空间了，而往里推只会得到一个比你正在复制的那个留存更差的队列。第二个坑是把自然触达当成可以购买的东西：超出内容投入支撑能力的自然流量翻倍，需要的是把工作量也叠上去，而不只是把钱叠上去，所以一个假设自然能像付费渠道那样扩张的再分配方案，会算出你的团队根本复现不出来的数字。',
        },
        {
          priority: 5,
          metric: '综合口径与付费口径的 LTV:CAC 差距 —— 你对外报的那个比率除以只用付费获客客户算出的比率',
          fixFirst:
            '最后才是综合口径，因为它是这张表里唯一没法用现成数据结清的行：它要求前四行先稳住，而且它是最常被跳过的一行，因为综合那个数看起来很健康。把两个比率并排算出来，一个用全部客户，一个只用你花钱买得到的客户，两者之差就是自然光环。这份光环是真收入，但不是你能再买一份的东西，所以它不该出现在扩量决策里。必须在天花板之后做，因为光环有多大决定了你真正买得到的增长有多少，而那个数是你接下来要建的所有分配方案的输入。',
          alsoMoves:
            '这条差距直接决定扩量决策本身：付费 LTV:CAC 是决定要不要加预算的那个数，综合 LTV:CAC 是你往上汇报的那个数。它也告诉你 What-If 模型里该放哪一个，因为一个把光环在未来的新队列上复利叠加的模型，会一直产出漂亮却无法被你现金流兑现的答案。最后它解释了为什么步骤 6 必须是季度而不是年度：光环会随渠道组合变化，而一个你没量过的组合变化，表现出来就是某个渠道突然像是不灵了。',
          backfire:
            '按综合口径分配会以一个具体的方式翻车：你把钱挪向那些力量来自「你没买到的客户」的渠道，而那种客户你买不到更多，于是支出涨了而客户没跟上，综合比率纹丝不动，CAC 却在涨。另一个失败是把付费口径的数字往上报却不交代口径差距，于是读者看到的数比你的仪表盘差得多，这场分歧就变成在争定义，而不是在争表现。每次都把两个数、同一期间、一起摆出来。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Before you rank channels, age them, and before you age them, make sure the origin field is trustworthy, because the two failure modes look identical on a dashboard and produce opposite decisions. The first line is capture: every channel in the mix has a tracked origin through UTM, referral code or a CRM attribution event, and untracked customers must be surfaced as an explicit gap rather than silently redistributed into the channels that do have data. The second is cohort age equalisation, since a 3-month and a 24-month cohort answer different questions and ranking across them rewards whoever recruited most recently. The third is cohort-actual LTV per channel on a stated window, months 6-12 for SaaS, 0-6 for DTC and 12-24 for subscription, never a projection, because a projection makes a weak channel look survivable. The fourth is the ratio band, with 3.0x and above funded and below 0.5x stopped. The fifth is payback by channel, under 12 months for capital-efficient growth, and it is allowed to overrule the ratio when a high-LTV channel is slow to repay. The sixth is reallocation modelled at the new spend level, because moving 25% of budget changes the ratio on both sides. And the seventh is the quarterly re-benchmark, which moves channels up and down tiers as their true LTV emerges and should never judge a channel on early data.',
      items: [
        {
          step: 1,
          label: 'Spend and new customer counts pulled per channel from one identical window',
          gate: 'For each of 2 to 5 channels, both spend and new customers acquired taken from the same 30 to 90 day window, no channel mixing a 30-day spend figure with a 90-day customer figure, and the window written down next to the table.',
          blockIf:
            'If the spend and the customer count come from different windows, the CAC you compute in step 3 is a ratio of two different periods and no amount of downstream modelling can repair it, because every LTV:CAC you later quote inherits the mismatch. Pull both halves again before anything else in this list is worth checking.',
        },
        {
          step: 2,
          label: 'A source-of-origin value recorded for every acquired customer, in two columns',
          gate: 'At least 95 percent of customers acquired in the window carry an origin value, first-touch and last-click stored as separate fields rather than one overwritten value, and referral codes reconciled against the channel field for at least the last 30 days.',
          blockIf:
            'Below 95 percent capture, the missing customers do not vanish from the denominator — they pile into whichever channels do have data, which makes the weakest channel look stronger and hides the best one. Until coverage is high enough to read, any ranking you produce describes your tagging, not your marketing.',
        },
        {
          step: 3,
          label: 'Per-channel CAC computed and paired with cohort-actual revenue at a stated age',
          gate: 'CAC computed as spend divided by new customers for every channel, and cohort-actual revenue pulled at a stated observation age (6 to 12 months for SaaS, 0 to 6 for DTC, 12 to 24 for subscriptions) rather than a projected LTV, with the age recorded beside each number.',
          blockIf:
            'If you substitute a projected LTV for realized revenue, the ranking becomes a comparison of your forecast assumptions instead of a comparison of channels, and it moves every time you revise the model. If the observation age differs between channels, the ratios are not comparable and every tier you assign in step 4 is built on the difference.',
        },
        {
          step: 4,
          label: 'Channels ranked by LTV:CAC with band assignment on equal-age data',
          gate: 'Every channel ranked on a single LTV:CAC figure computed at the same observation age, bands assigned with at least one channel above 3.0x and at least one below 0.5x identified, and each channel assigned a tier with the reason for that tier written next to it.',
          blockIf:
            'When the bands are assigned on mixed-age data, the channel at the top is usually the one with the oldest cohort rather than the best economics, and step 5 then moves a quarter of your budget toward a reading that will reverse as the young cohorts mature. Without a written reason per tier, the ranking also cannot be re-checked at the next re-benchmark.',
        },
        {
          step: 5,
          label: 'A modeled reallocation with ratios recomputed at the new spend levels',
          gate: 'One reallocation modeled shifting 25 percent of spend from the lowest-ratio channel to the highest, with the receiving channel CAC and LTV:CAC recomputed at the new spend level rather than held constant, and the cash cost of the shift stated alongside the return.',
          blockIf:
            'Holding the receiver CAC constant is the most common modeling error and it makes every reallocation look profitable, because the marginal customer you buy at a higher spend level is always worse than the average one. If the cash cost of the shift is missing, you will approve a move that improves a ratio and tightens the runway you need to survive the cohort maturing.',
        },
        {
          step: 6,
          label: 'A quarterly re-benchmark that moves tiers only when the cohort supports it',
          gate: 'A re-benchmark scheduled every 90 days, each channel re-tiered only when its cohort has reached the observation age used in step 3, at least 1 channel explicitly held below its apparent tier as a deliberate wait rather than an oversight.',
          blockIf:
            'Re-tiering a channel on a 3-month cohort in the same quarter it was created guarantees you will promote a channel that later demotes, and every demotion is read internally as a failed channel rather than an early call. Holding one channel deliberately also gives you the control sample you need to tell an ageing effect apart from a genuine change in channel quality.',
        },
      ],
    },
    zh: {
      intro:
        '按渠道排 LTV 之前，先把群组年龄拉平；在拉平之前，先确认来源字段可信 —— 这两种坏法在仪表盘里长得一模一样，却导向相反的决定。第一行是采集：这个渠道组合里每个渠道都要有可追溯的来源（UTM、推荐码或 CRM 归因事件），并且没被记录的客户必须作为一个显式的缺口被摆出来，而不是悄悄流进那些有数据的渠道。第二行是拉平群组年龄，因为 3 个月和 24 个月的群组回答的是不同的问题，跨年龄排序等于奖励「最近招得最勤」的那一方。第三行是分渠道的群组实际 LTV，写明观察窗口（SaaS 取 6-12 个月，DTC 取 0-6 个月，订阅取 12-24 个月），绝不用预测值 —— 预测值会让弱渠道看起来还撑得住。第四行是比率分档：3.0x 以上就加码，0.5x 以下就停。第五行是分渠道回本，资本效率的增长要求 12 个月以内，而它被允许推翻比率 —— LTV 高、回本慢的渠道仍然可以投。第六行是按新支出水平做的再分配建模，因为挪走 25% 的预算会同时改变两边的比率。第七行是按季度重对，随真实 LTV 浮现把渠道升档降档，而且绝不用早期数据评判一个渠道。',
      items: [
        {
          step: 1,
          label: '每个渠道都从同一个 30-90 天窗口拉出的支出与新客数',
          gate: '2 到 5 个渠道各自都从同一个 30 到 90 天窗口取支出与新客数，没有任何一个渠道把 30 天的支出和 90 天的客户数凑在一起，窗口长度写在这张表旁边。',
          blockIf:
            '如果支出和客户数来自不同窗口，步骤 3 算出的 CAC 就是两个不同时期的比值，之后任何建模都修不好，因为你后面引用的每个 LTV:CAC 都继承这个错位。在这张清单的其他项值得核对之前，先把两半数据重新拉一遍。',
        },
        {
          step: 2,
          label: '每个已获客客户都有来源值，且分成两栏记录',
          gate: '窗口内至少 95% 的新客带有来源值，首次触点与末次点击存为两个独立字段而不是一个被覆盖的值，并且最近 30 天的转介码与渠道字段做过对账。',
          blockIf:
            '覆盖率低于 95% 时，缺失的客户不会从分母里消失——他们会堆进有数据的那些渠道，于是最弱的渠道看起来更强，最好的那个被藏起来。覆盖率够高之前，你排出的任何名次描述的都是你的打标质量，而不是你的营销。',
        },
        {
          step: 3,
          label: '逐渠道算出的 CAC，并配上标明观察月数的群组实际营收',
          gate: '每个渠道都算出 CAC（支出除以新客数），并拉取标明观察月数的群组实际营收（SaaS 6 到 12 个月、DTC 0 到 6 个月、订阅 12 到 24 个月），而不是用预测 LTV，每个数字旁边记着它的观察月数。',
          blockIf:
            '一旦用预测 LTV 顶替已实现营收，排名就变成在比你的预测假设，而不是在比渠道，而且你每改一次模型它就动一次。如果各渠道的观察月数不一样，这些比率就不可比，步骤 4 里你分配的每一个档位都建在这个差异上。',
        },
        {
          step: 4,
          label: '按 LTV:CAC 排名，且档位在同龄数据上分配',
          gate: '每个渠道都在同一个观察月数上算出一个 LTV:CAC 并据此排名，分配档位时至少识别出 1 个高于 3.0x 的渠道和 1 个低于 0.5x 的渠道，并且每个渠道的档位旁边写明给出这个档位的理由。',
          blockIf:
            '档位建立在混合年龄的数据上时，排在最上面的通常只是群组最老的那个渠道，而不是经济性最好的；而步骤 5 于是把四分之一的预算搬向一个等年轻群组成熟就会翻转的读数。每个档位不写理由，下次重对时你也没法复核这个排名。',
        },
        {
          step: 5,
          label: '建模过的再分配方案：比率按新支出水平重算并写出现金成本',
          gate: '至少建了一个把 25% 支出从最低比率渠道挪向最高比率渠道的方案，接收方在新支出水平上重算了 CAC 与 LTV:CAC，而不是沿用原值，同时把这次调动的现金成本与回报并列写出。',
          blockIf:
            '把接收方的 CAC 当成常数是最常见的建模错误，它会让每一次再分配看起来都赚钱，因为你在更高支出下买到的边际客户永远比平均客户差。如果这次调动的现金成本没写出来，你会批准一个改善了比率、却压缩了你熬到群组成熟所需跑道数的方案。',
        },
        {
          step: 6,
          label: '季度重对，且只有在群组撑得住时才调整档位',
          gate: '每 90 天一次的重对已经排进日程，每个渠道只有在群组达到步骤 3 所用的观察月数时才重新定档，并且至少明确保留 1 个渠道停留在低于其表面档位的位置，且这是有意等待而非疏漏。',
          blockIf:
            '在渠道刚建的同一个季度就用 3 个月群组重新定档，等于保证你一定会把某个渠道先升后降，而每一次降档在内部都会被读成渠道本身失败了。有意保留一个渠道，也能给你一个对照样本，用来把「群组变老」和「渠道质量真的变了」分开。',
        },
      ],
    },
  },
};
