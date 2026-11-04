// P166 —— A 类（SaaS Metrics）主题「arr-multiple-valuation」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前已完整读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 按阶段 / 增长档 / 垂直选行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 倍数偏低/偏高时先修哪个输入 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的达标线与卡点（howToApply 只说做什么，不说什么算达标）
//
// 口径纪律（本主题讲的是用户自己的经营画像，不是数据集市场价 ⇒ 允许手写金额，但必须带口径）：
//   · ARR = 订阅 MRR × 12（美元计），剔除一次性费用、专业服务、用量超额。
//   · 估值 = 最近一轮定价轮投后估值，或按 投后估值 ÷（1 − 稀释比例）反推的隐含投后估值。
//   · 增长 = ARR 同比增速；利润率 = EBITDA 或 FCF 利润率（可为负）；NDR = 滚动 12 个月净收入留存。
//   · 金额一律写成「USD 12M ARR」这种带口径的形式（分子分母 + 期间 + 量级 + 单位），不写孤零零的数。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A low multiple is a denominator problem before a market problem. Rebuild recurring revenue first — subscription MRR times twelve, minus one-time fees and usage overage — then net dollar retention: NDR under 100% pins you to the floor of your stage band, while NDR above 120% adds a premium growth cannot buy.',
      rows: [
        {
          priority: 1,
          metric: 'ARR — the denominator, rebuilt from billing on a recurring-only basis',
          fixFirst:
            'Rebuild ARR from the billing system before you compute anything else, because every number in a valuation conversation is a function of this one: the multiple divides by it, the growth rate is its year-over-year change, NDR is measured on it, and the heuristic baseline consumes it. Subscription MRR times twelve, with one-time implementation fees, professional services and usage overage excluded, each exclusion left on a visible line so the next reviewer can reproduce it. Verify by reconciling the ARR figure to the billing export line by line and confirming that the quarter-over-quarter and year-over-year growth rates match what the board has been shown.',
          alsoMoves:
            'A clean ARR base moves three things at once. It repairs the growth input, so the expected multiple computed as 5x plus growth over 10 plus margin over 5 stops being understated. It repairs NDR, because NDR is measured on ARR and a denominator inflated by one-off services makes retention look either better or worse than it really is. And it repairs the forward range in Step 6, because projected ARR is the number the 10x and 20x multiples are applied to — a denominator error scales the whole exit value, not just the headline multiple.',
          backfire:
            'The tempting direction is to inflate ARR — include overage, professional services, or the full value of a multi-year contract — because the multiple immediately looks 20-40% lower, which is exactly what you wanted before a raise. It is also the first thing diligence recomputes, and a restated ARR after a round poisons the comparison for the next round. The opposite error is over-correcting: excluding legitimate recurring usage overage from ARR in a usage-based pricing model understates ARR and can drop you out of your stage band entirely.',
        },
        {
          priority: 2,
          metric: 'Net dollar retention — the NDR tier that either caps the band or adds 1.5-2x',
          fixFirst:
            'Fix NDR before you work on growth, because NDR below 100% is a hard cap: no growth rate and no margin lifts a company out of the bottom of its band while its existing base shrinks. Cohort your ARR by start date, compute NDR per cohort over rolling twelve months, and find the cohort below 100% before looking at the aggregate — the aggregate hides the defect, the cohort shows it. The usual causes are a pricing change that broke renewals, an onboarding change that stopped activating accounts, or a segment sold to the wrong buyer. Verify on the next closed cohort rather than on total ARR churn, and check that logo count moved with the revenue.',
          alsoMoves:
            'NDR above 120% earns a 1.5-2x premium on top of the stage band, and because expansion revenue compounds without sales spend it also shortens CAC payback — which carries its own 1-3x premium once LTV to CAC is above 3x. So retention work raises three multiple inputs at once: the retention tier, the payback input, and the forward ARR the next round prices. That is why a company with strong NDR can defend the top of its band on a smaller revenue base than its peers.',
          backfire:
            'Buying NDR with a price increase on a fragile base converts downgrades into churn: an ARR-based NDR can look acceptable for one quarter because the uplift lands in the numerator, while the logo count collapses and the following year starts from a smaller base. The other version is NDR propped up by multi-year prepay — cash looks excellent, ARR growth does not move at all, and since growth is what the heuristic baseline pays for, your multiple moves in the wrong direction while your cash position improves.',
        },
        {
          priority: 3,
          metric: 'Year-over-year ARR growth — the tier that fixes your position inside the band',
          fixFirst:
            'If year-over-year growth sits below the tier your stage implies — a Series A company growing 12% a year is a Medium-tier business trading inside a Fast-tier band — the multiple has no reason to sit near the top of the band, and the fix is a growth plan rather than a better story. Build the bridge from the metric that actually produces growth: net new ARR per month against the churn it must replace, not the headline growth rate. Then set the 3-6 month targets from Step 5 and run one motion per quarter so the change can be attributed.',
          alsoMoves:
            'Growth is the linear premium: on the heuristic baseline every ten points of growth is worth about one turn of multiple, so a company moving from 30% to 60% growth gains several turns of expected multiple without changing anything else. Growth also compounds into next year\'s ARR, and it is the multiplier applied to that ARR in the forward valuation — so growth moves both the number you negotiate today and the number you argue for next year.',
          backfire:
            'Buying growth with discounts or low-quality channels — marketplaces, channel partners, heavy discounting — lifts year-over-year ARR growth fast enough to move your tier label, while NDR and CAC payback deteriorate. Two of the three premium inputs then move against you, which is the most dangerous kind of valuation progress: the slide improves, the underlying band does not, and the gap shows up as a worse multiple at the next round once the quality of that ARR is examined.',
        },
        {
          priority: 4,
          metric: 'Profit margin — EBITDA or free-cash-flow margin, and the Rule of 40',
          fixFirst:
            'If margin is negative, the heuristic baseline drops below your stage band floor and you have a choice to make explicitly: optimise for the multiple, or optimise for the size of the round. A credible path to positive margin inside 12-18 months is worth more to a lead investor than an extra turn of multiple on paper, because it is what converts an ARR number into cash. Model which levers move margin without stalling growth — pricing discipline, support headcount, infrastructure unit cost against usage, and the revenue mix between subscription and services — and put a monthly number on each.',
          alsoMoves:
            'Margin adds roughly one turn of multiple for every five points, and it is also cash work: cutting the cost that produces margin lowers net burn, which extends runway and lets you wait for a better round instead of accepting the current one. Margin also moves the Rule of 40 — growth plus margin — which is the anchor most public-market investors use, so it is the number that travels furthest beyond the private round.',
          backfire:
            'Cutting cost to hit margin can cut the growth engine with it: removing the team that ships onboarding damages NDR, and pausing the marketing that fills the pipeline damages growth — so margin improves for one quarter and the multiple compresses at the next round, because the inputs that justified the premium are gone. The quieter version is deferring a hire or a campaign to "start next quarter": that shows up as a margin improvement this quarter and a growth hole in the ARR line, which is exactly where the band comparison finds it.',
        },
        {
          priority: 5,
          metric: 'Your actual multiple against the stage band — the output you defend, not the input you fix',
          fixFirst:
            'This row is repaired last, by the four above. Compare your actual multiple against the stage band — pre-seed 5-10x, seed 10-15x, Series A 10-20x, Series B 12-25x, Series C and beyond 15-30x — and against the growth and retention tiers, then write the gap as a bridge plan with named owners and dates, exactly as Step 5 requires. If your multiple is above the band, the work runs the other way: you have been paid for upside that has not compounded yet, so strengthen the inputs that earn it before the next round rather than assuming it holds.',
          alsoMoves:
            'The band position decides the negotiation, the dilution math and the size of the round: at the same ARR, a company three turns inside its band must dilute more to fund the same runway. It also calibrates the forward range you show the board in Step 6, because 10x and 20x applied to the same projected ARR bracket a range that is only credible if today\'s multiple sits in a defensible place.',
          backfire:
            'Raising at the top of the band converts an unrealised multiple into realised dilution: 18x on a company whose inputs justify 12x means a third of your next ARR growth is already paid for, and if the market compresses by 30-50% — as it did in 2022-2023 — you are diluted into a down round. The other failure is sitting below the band while waiting for a better market: you pay a quarter of ARR growth for the privilege, and the price of waiting is the multiple itself, because that growth would have compounded at the multiple you refused to accept.',
        },
      ],
    },
    zh: {
      intro:
        '倍数偏低，先怀疑分母，再怀疑市场。ARR 要按订阅 MRR × 12 重算，剔掉一次性费用、专业服务与用量超额，每一项剔除都留一行说明，下一位复核者才复现得出来。接着看 NDR：低于 100% 会把你钉在阶段带的下限，高于 120% 则叠加 1.5-2x 溢价，这是增速买不到的东西。增长与利润率只决定你在区间内的位置；区间本身是要辩护的产出，不是要修的输入。在 1200 万美元 ARR 上，15x 对应 1.8 亿美元估值。',
      rows: [
        {
          priority: 1,
          metric: 'ARR —— 分母：从计费系统按「只含经常性」重算',
          fixFirst:
            '在算任何东西之前先把 ARR 从计费系统重算一遍，因为估值谈话里的每一个数都是它的函数：倍数除以它，增长率是它的同比变化，NRR 在它上面量，启发式基准也吃它。算法是订阅 MRR × 12，一次性实施费、专业服务、用量超额各自剔掉并留一行可见的说明，方便下一位复核者复现。验证方式：与计费导出逐行对平，并确认季度环比与同比增速与你之前给董事会看的数字一致。',
          alsoMoves:
            '干净的 ARR 基数会同时动三个东西。它修好了增长输入，5x + 增长/10 + 利润率/5 算出的预期倍数就不再被低估；它修好了 NDR，因为 NDR 是在 ARR 上量的，分母里混进一次性服务会让留存显得比实际更好或更差；它还修好了 Step 6 的远期区间，因为 10x 与 20x 倍数乘的就是投影 ARR——分母错了，等于把整笔退出价值一起缩小，不只是头条倍数。',
          backfire:
            '最容易走的方向是把 ARR 做大——把用量超额、专业服务或多年期合同的整笔金额算进去——倍数立刻显得低 20-40%，正好是你融资前想要的。可它也是尽调第一个重算的数，而且融资后改口 ARR 会让下一轮的对比基准被污染。反方向的过度纠偏同样麻烦：用量计费模式里把真实经常性超额踢出 ARR，会低估 ARR，甚至把你挤出所属的阶段带。这两种错误都会在下一次对账时暴露。',
        },
        {
          priority: 2,
          metric: '净收入留存 NDR —— 决定倍数触底还是叠加 1.5-2x 溢价',
          fixFirst:
            '先修 NDR 再谈增长，因为 NDR 低于 100% 是一道硬天花板：存量在缩，增长再快、利润率再好也把你从阶段带的下限里拉不出来。把 ARR 按签约起始日分队列，用滚动 12 个月逐队列算 NDR，先找到 NDR 低于 100% 的那一批，再看整体数——整体会掩盖缺陷，队列会暴露它。常见原因是改过价格导致续约崩了、改过 onboarding 让激活中断，或者把产品卖给了不匹配的采购方。验证要用下一个封闭队列，而不是总 ARR 的流失，还要看客户数是否与收入同向动了。',
          alsoMoves:
            'NDR 高于 120% 在阶段带之上再拿 1.5-2x 溢价；而因为扩展收入不需要销售投入就能复利，它还会缩短 CAC 回本——当 LTV:CAC 高于 3x 时，回本本身又值 1-3x 倍数溢价。于是一次留存修复同时抬三个倍数输入：留存档、回本输入，以及下一轮要定价的未来 ARR。这就是为什么 NDR 强的公司能在比同行更小的收入基数上守住区间上限。而且这三项是同一个动作带来的，不需要额外预算。',
          backfire:
            '用提价去买 NDR，在脆弱的基座上会把降级变成流失：按金额算的 NDR 那一季还能看，因为涨价进了分子；客户数却在塌，明年的起点更小。另一个版本是多付年预付把 NDR 撑起来——现金数字很漂亮，ARR 增长却完全没动，而增长正是启发式基准付钱的东西，于是你的现金变好、倍数反而往错的方向动。这两种做法都会在下一次董事会之前暴露。',
        },
        {
          priority: 3,
          metric: 'ARR 同比增长率 —— 决定你在阶段带内的位置',
          fixFirst:
            '如果你的同比增速低于所在阶段对应的档位——一家 A 轮公司一年只长 12%，本质是「中速」档的生意，却站在「高速」档的区间里——倍数就没有理由贴近区间上限，缺的是一份增长计划，不是一个更好的故事。桥接计划要从真正产生增长的指标搭：每月净新增 MRR 对上它必须替换掉的流失，而不是拿标题增速去搭。然后按 Step 5 的做法写 3-6 个月的目标，并且一个季度只做一个动作，才能归因。',
          alsoMoves:
            '增长是线性溢价：在启发式基准上，每 10 个百分点的增长大约值 1x 倍数，所以从 30% 走到 60% 的公司，不改任何别的东西也能多拿几档预期倍数。增长还会复利成明年的 ARR，而那正是远期估值里倍数要乘的数——于是增长既动你今天谈判的数，也动你明年要谈的数。这也是为什么「先做增长、再补留存」在倍数上是顺序颠倒的。',
          backfire:
            '用打折或低质量渠道买增长——平台市场、渠道合作、大额折扣——足以把同比 ARR 增长拉快到换一档标签，而 NDR 与 CAC 回本同时恶化。于是三个溢价输入里有两个反着走，这是估值进步里最危险的一种：幻灯片变好，区间没变，等到下一轮有人审视 ARR 的质量时，缺口才会显形。而在这一行被修好之前就定价的轮次，通常要为这笔低质量的增长付两次钱：一次在倍数上，一次在下一轮的议价上。',
        },
        {
          priority: 4,
          metric: '利润率 —— EBITDA 或自由现金流利润率，以及 40 法则',
          fixFirst:
            '利润率是负的时候，启发式基准会掉到阶段带下限以下，你必须做一个明说的选择：优化倍数，还是优化这一轮的规模。一条 12-18 个月内转正的可信路径，对领投的价值高于纸面上多出来的那 1x，因为它才是把 ARR 变成现金的东西。建模时挑那些能抬利润率又不熄增长水的杠杆——定价纪律、支持人效、按用量算的基础设施单位成本、以及订阅与服务的收入结构——并给每一条配上月度数字。',
          alsoMoves:
            '利润率每 5 个点大约换来 1x 倍数，而且它同时是现金工作：砍掉产生利润率的那笔成本会压低净燃烧、拉长跑道，于是你可以选择等一个更好的轮次，而不是接受眼前这个。利润率还会动 40 法则（增长 + 利润率），那是最多公开市场投资人使用的锚点，所以它是传得最远的一个数。而且它是你唯一能单方面决定的溢价来源。',
          backfire:
            '为了利润率砍成本，可能把增长引擎一起砍掉：裁掉负责 onboarding 的团队会伤 NDR，暂停填充管线的营销会伤增长——于是这个季度利润率变好，下一轮倍数反而压缩，因为当初支撑溢价的那几个输入已经不在了。更安静的一版是把某个招聘或投放推到「下个季度再说」：本季显示为利润率改善，ARR 那条线上则留下一个增长坑，而区间比较正是在那里发现它。',
        },
        {
          priority: 5,
          metric: '实际倍数对阶段带 —— 这是你要辩护的产出，不是你要修的输入',
          fixFirst:
            '这一行最后修，靠上面四行修。把实际倍数对上阶段带（pre-seed 5-10x、seed 10-15x、A 轮 10-20x、B 轮 12-25x、C 轮及以后 15-30x），再对上增长档与留存档，然后按 Step 5 的要求把差距写成带责任人和日期的桥接计划。如果你的倍数高于区间，工作方向相反：你在为尚未复利的上行拿了钱，于是要在下一轮前把赚到这个溢价的输入做实，而不是假设它会自己成立。',
          alsoMoves:
            '区间位置决定谈判、稀释算术和这一轮的大小：同样一份 ARR，落在区间里侧 3x 的公司要拿到同样长的跑道就得稀释更多。它也校准你在 Step 6 给董事会看的远期区间，因为同一个投影 ARR 上乘 10x 与 20x 得到的范围，只有当今天的倍数站得住时才可信。最后这一行还决定你什么时候去融资：同样落在区间里，位置靠上的人可以挑时点，位置靠下的人只能接受时点。',
          backfire:
            '在区间上限融资，等于把一个还没兑现的倍数变成真实稀释：一家输入只支撑 12x 的公司拿到 18x，意味着接下来的三分之一 ARR 增长已经被提前付掉了；而当市场整体压缩 30-50%（2022-2023 就是如此），你会被稀释进一轮下折。另一个失败是为了等更好的市场而停在区间之下：你要付出一个季度的 ARR 增长作为等待的代价，而等待的价格正是倍数本身，因为那段增长本来会按你当时不肯接受的倍数复利。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Six passes stand between a defensible multiple and a number that only looks right. ARR has to leave billing on a recurring-only basis before any division happens; the valuation must be pinned as a priced round or an implied post-money figure; the heuristic baseline has to be built from those same two numbers.',
      items: [
        {
          step: 1,
          label: 'Step 1 — ARR pulled from billing on a recurring-only basis',
          gate:
            'ARR equals subscription MRR times twelve, with one-time fees, professional services and usage overage each excluded on a visible line, and the last 4 quarters of the ARR series can each be reproduced from the billing export.',
          blockIf:
            'An unclean ARR denominator corrupts everything downstream at once: the multiple, the growth rate, NDR and CAC payback all read from it. ARR that includes one-off services depresses your multiple and your growth rate at the same time, so you will believe you are below the band when the real problem is an accounting one — and the cost of a restated number after a round is far higher than the difference you were trying to hide.',
        },
        {
          step: 2,
          label: 'Step 2 — The valuation established: priced round versus implied value',
          gate:
            '2 figures exist and the difference is explained: the actual post-money valuation of your most recent priced round in USD, and the implied post-money value derived as post-money divided by one minus the dilution ratio, with any note, convertible or option-pool change named.',
          blockIf:
            'With only one valuation number you cannot tell where you sit in the market, because it might be an old price, an implied price, or a price that includes debt. Until the difference is explained, the multiple is being compared against the wrong baseline, and the resulting gap is wrong in the one place where the next round will be negotiated.',
        },
        {
          step: 3,
          label: 'Step 3 — The multiple computed, and its caliber written down',
          gate:
            'Multiple equals valuation divided by ARR, and the note beside it names 3 things: which valuation, which month of ARR, and whether debt or unexercised options are included; the same-caliber multiple from your last round sits next to it with the difference explained.',
          blockIf:
            'Multiples computed on different calibers cannot be compared to a band: an implied valuation against a benchmark, or year-end ARR against a mid-year valuation, produces a number that looks reasonable and cannot be defended. The more common error is the denominator — treating revenue that includes one-off work as ARR puts the multiple 1-3 turns lower than it really is.',
        },
        {
          step: 4,
          label: 'Step 4 — The heuristic baseline computed from the same numbers',
          gate:
            'The four inputs — ARR, valuation, year-over-year growth, and EBITDA or FCF margin — all come from the same figures used in steps 1 to 3, the expected multiple of 5x plus growth over 10 plus margin over 5 is computed, and the deviation and tier (slow under 20%, medium 20-50%, fast 50-100%, hyper 100%+) are labelled.',
          blockIf:
            'A baseline built on mismatched calibers means nothing: ARR that includes professional services paired with a margin that excludes them understates both growth and margin, the baseline drops, and your actual multiple now looks above market. Then you take that conclusion into the round. The same set of numbers has to carry through to the forward range in step 6.',
        },
        {
          step: 5,
          label: 'Step 5 — Compared against the stage band, with a bridge plan',
          gate:
            'Your actual multiple is compared against the stage band (pre-seed 5-10x, seed 10-15x, Series A 10-20x, Series B 12-25x, Series C and beyond 15-30x) and against the growth and retention tiers, the gap is written as a number of turns, and a 3-6 month bridge plan names which input moves, by how much, and who owns it.',
          blockIf:
            'Writing "we are below the band" without a bridge plan means the step was not really done: nobody accepts a gap in a fundraising conversation without an owner and a timetable. And the gap has to be written in turns rather than percentages, because three turns cannot be bought with cash — only with growth, retention and margin, which is exactly what the bridge plan is for.',
        },
        {
          step: 6,
          label: 'Step 6 — The forward range computed and put in front of the board',
          gate:
            'Projected ARR in twelve months is derived from the bridge plan and applied at both 10x and 20x, producing two USD figures plus a third at your current multiple, and the range is documented with the assumptions it depends on.',
          blockIf:
            'Without the forward range your board and your lead investor are looking at a single point in time and cannot judge whether now is high or low. The more important failure is projecting at current pace when the plan is a bridge plan: that extrapolates the present rather than the plan, and the number you present turns out to be the one you actually hit instead of the one you intend.',
        },
      ],
    },
    zh: {
      intro:
        '六个步骤各自要立住不同的东西，缺一个，后面那个数就只是看着对。ARR 必须出自计费系统的经常性口径；估值要先说清是最近一轮定价价还是反推的投后值；启发式基准要用同一对数算出来，阶段带的对比才有意义。远期区间还得用同一份 ARR，否则董事会看到的区间没有任何算术支撑。每一步的达标线都压在这些输入上：输入错了，后面几步做得再细也只是把错误放大。把口径写在数字旁边，是为了让下一位复核者能复现，而不是为了排版好看。',
      items: [
        {
          step: 1,
          label: '步骤 1 —— 从计费系统按「只含经常性」取 ARR',
          gate:
            'ARR = 订阅 MRR × 12，一次性费用、专业服务、用量超额三项各自剔除并留可见行，最近 4 个季度的 ARR 序列都能从计费导出复算出来。',
          blockIf:
            'ARR 分母不干净，下游会同时坏掉：倍数、增长率、NRR、CAC 回本全从它读。含一次性服务的 ARR 会同时压低倍数与增长率，你会以为自己是低于区间，其实问题在会计口径——而融资后改口一个数字的代价，远高于你当时想藏起来的那个差额。',
        },
        {
          step: 2,
          label: '步骤 2 —— 估值定案：最近一轮定价价 vs 反推价',
          gate:
            '手里有两个数且差额有解释：最近一轮定价轮的实际投后估值（美元计价），以及按投后估值 ÷（1 − 稀释比例）反推的隐含投后估值；任何票据、可转债或期权池变动都写明。',
          blockIf:
            '只有一个估值数时，你无法判断自己在市场上的位置——它可能是老价、可能是反推价、也可能含债。差额没解释之前，倍数是在跟错误的基准比，比出来的差距也错，而下一轮谈判恰恰就发生在这个数上。',
        },
        {
          step: 3,
          label: '步骤 3 —— 算出倍数，并把口径写在旁边',
          gate:
            '倍数 = 估值 ÷ ARR 已算出，旁边注明 3 件事：用哪个估值、哪个月的 ARR、是否含债与未行权期权；并列出上轮同口径倍数并解释差异。',
          blockIf:
            '口径不同的倍数不能对区间：拿反推估值去比基准，或拿年末 ARR 去比年中估值，会得到一个看着合理却无法辩护的数。更常见的是分母错——把含一次性工作收入的 revenue 当 ARR，倍数会低 1-3x。',
        },
        {
          step: 4,
          label: '步骤 4 —— 用同一套数算出启发式基准',
          gate:
            '四个输入（ARR、估值、同比增长、EBITDA 或 FCF 利润率）全部来自步骤 1-3 的同一套数，预期倍数 = 5x + 增长/10 + 利润率/5 已算出，偏离度与档位（慢 <20% / 中 20-50% / 快 50-100% / 超速 100%+）已标注。',
          blockIf:
            '口径不一致时基准倍数没有意义：含专业服务收入的 ARR 配不含一次性费用的利润率，会同时低估增长与利润率，基准被压低，你的实际倍数于是看起来高于市场——然后你带着这个结论去谈下一轮。同一套数必须一路带到 Step 6 的远期区间。',
        },
        {
          step: 5,
          label: '步骤 5 —— 对标阶段带，并写出桥接计划',
          gate:
            '实际倍数已对上阶段带（pre-seed 5-10x / seed 10-15x / A 轮 10-20x / B 轮 12-25x / C 轮及以后 15-30x）与增长档、留存档，差距按 x 数（turns）写出，并有一份 3-6 个月桥接计划写明哪个输入、提多少、谁负责。',
          blockIf:
            '只写「我们低于区间」而不写桥接计划，等于这一步没做：融资谈判里没人接受一个没有责任人和时间表的差距。而且差距要按 x 数写而不是百分比——3x 的差距是现金补不回来的，只能靠增长、留存与利润率去补，那正是桥接计划要做的事。',
        },
        {
          step: 6,
          label: '步骤 6 —— 算出远期区间，并拿给董事会',
          gate:
            '12 个月投影 ARR 从桥接计划推导而来，并分别按 10x 与 20x 算出两个美元金额，再加上按当前倍数的第三个对照值；区间所依赖的假设已写明。',
          blockIf:
            '没有远期区间，董事会与领投看到的只是一个时点，无法判断现在到底是高点还是低点。更关键的失败是投影时仍用当前节奏——那外推的是现状而不是计划，于是你给出的数字会是你最后真正达到的那个，而不是你打算达到的那个。',
        },
      ],
    },
  },
};
