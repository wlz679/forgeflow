// P166 —— O 类（Operations / 库存运营）主题「reorder-point-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 8 编号链（按顺序做什么）
//   · 本文件 fixPriority = 几个服务水平 / 缺货指标同时不达标时先动哪一个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许写金额但必须带口径）：
//   · 金额一律 USD，且写明是「库存货值」还是「COGS」
//   · 前置期变异一律写成「前置期标准差 ÷ 前置期均值」的百分比，按供应商分别算
//   · 服务水平一律写成「配置目标 Z 值」与「实际履约率」两件事，不混用
//   · 引用既有公式与 Z 值时口径与指南一致（SS = Z × √(σ_d² × L + d² × σ_L²)；Z = 2.33 / 1.65 / 1.28 / 1.04）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Reorder points fail on variance, not on averages, and the variance that matters most is usually upstream. Cross-border suppliers routinely run a lead-time standard deviation at 30% to 50% of the mean, which moves safety stock more than any demand forecast. Service level then follows the SKU tier, not one house policy.',
      rows: [
        {
          priority: 1,
          metric: 'Lead-time spread ratio (standard deviation of actual lead time ÷ mean lead time, measured per supplier)',
          fixFirst:
            'Measure the lead-time spread first, because it is the input with the largest controllable effect on safety stock and the one most often taken from a promise rather than from a record. Pull at least 20 completed orders per supplier, compute the mean and the standard deviation of the actual receipt dates, and express the spread as a percentage of the mean. A supplier who promises 12 days and delivers somewhere between 12 and 30 is not a 12-day supplier: the safety-stock formula multiplies that spread by the demand rate, so a buffer built on the promise is roughly half of what reality needs, and the shortfall lands in the cycle you were least prepared for. Measure this before you touch any Z value, because every number downstream is scaled by it.',
          alsoMoves:
            'Measured lead-time spread also moves the order-size decision, because a supplier with a wide spread needs a larger buffer and a smaller lot: you buy less often and hold more safety stock instead, and the two together determine the average inventory that working capital is charged on. It changes which SKUs need a second source at all, since the vendors with the worst spread are usually the ones where a single delay becomes a stockout rather than a late delivery. And it re-prices the multi-supplier work, because qualifying a second vendor is worth a great deal on a 40% spread supplier and almost nothing on a 12% one.',
          backfire:
            'The classic failure here is measuring the mean and calling it the spread. A supplier with a mean of 14 days and a standard deviation of 6 is a very different planning input from one with a mean of 14 and no spread at all, and averaging the two hides exactly the weeks you cannot plan around. The second failure is squeezing the spread out through pressure rather than structure: asking a vendor to commit harder can shorten the mean while the tail stays wide or simply moves to customs delays, and safety stock built on the shorter mean is now wrong in a new direction. Fix the contract, the pack size or the route before you treat a spread number as final.',
        },
        {
          priority: 2,
          metric: 'Service-level target compliance (SKUs whose configured Z score matches their ABC tier policy ÷ total SKUs)',
          fixFirst:
            'Second, check that the service-level targets are actually differentiated by tier, because a uniform 99% is the most expensive default in this model. The guide sets A at 99%, B at 95% and C at 90% or 85%, and the difference between those Z values is where most of the recoverable working capital sits: over-serving the tail by a wide margin and under-serving the head at the same time is precisely what a single global target produces. Pull the configured Z per SKU out of the ERP, compare it with the tier policy, and let the tier set the number rather than letting the ERP default set it. Do this after the lead-time measurement, because the Z value is multiplied by a lead-time input that has to be real first.',
          alsoMoves:
            'Correct tiering moves the average inventory and the capital charge on it at the same time, and it changes what you can spend on the SKUs that matter: capital released from the tail is capital you can put into deeper stock on the head, which is where the revenue is. It also changes the reordering rhythm, because a tier reviewed weekly needs a smaller buffer than the same tier reviewed daily, so the target and the cadence have to be decided together. And it makes the next row measurable, because an order-size cap only means something when the buffer underneath it was set deliberately.',
          backfire:
            'Tightening the service-level target backfires on the tail when the demand behind that tail is not intermittent but structurally declining: a C-tier SKU with no sales in six months does not need a tighter service level, it needs to be de-listed or made to order, and a thin buffer on a SKU you still advertise creates a permanent out-of-stock on your own storefront. The other failure is moving the target without moving the cadence, so a tier carrying a 99% target is still reviewed monthly and therefore holds a buffer sized for a daily review. Change the target and the review period in the same edit, and hold the A tier at 99% while you do it.',
        },
        {
          priority: 3,
          metric: 'Order size against the forward-demand cap (A-tier order value above 30 days of forward demand ÷ total A-tier order value)',
          fixFirst:
            'Third, pair the reorder point with an order quantity, because a trigger without a quantity only relocates the problem. The point of firing a reorder point is that you then buy one sensible lot instead of topping up in dribs and drabs all week, and the guide caps that lot at 30 days of forward demand for the A tier. Compute the lot from the economic order formula, then check it against the cap and against the actual forward demand, because a formula built on a 12-month average will happily recommend a lot that covers a seasonal peak it cannot see. Do this after the service level and the lead time are right, since a quantity computed on the wrong inputs is just a larger wrong answer.',
          alsoMoves:
            'The order size is where the buffer and the cycle stock meet: a lot covering 60 days instead of 30 puts twice the cycle stock on the shelf at once, which is the difference between a stockout risk and a cash lock-up. It also sets how often your lead-time risk has to be re-measured, because a large lot bought infrequently means each delivery matters more and a single delay hurts more. And it is the main lever on dead stock, since a lot sized on a trailing average carries the peak of the last season into the next order.',
          backfire:
            'Capping the order quantity backfires when the cap is applied below the minimum order quantity your suppliers accept, because the smaller lots get refused, surcharged, or shipped on a slower service tier. The subtle version is that the cap gets honoured in the buying system while the supplier quietly consolidates your orders into one larger shipment, and the stock arrives in a lump anyway. It also breaks on seasonal SKUs, where 30 days of forward demand at the trough is not enough to cover the ramp. Apply the cap to the A tier, keep the seasonal adjustment visible, and check the quantities actually received rather than the ones ordered.',
        },
        {
          priority: 4,
          metric: 'Formula ordering on high-variance SKUs (A-class SKUs whose demand σ exceeds 30% of mean demand and still run on the formula ÷ total A-class SKUs)',
          fixFirst:
            'Fourth, separate the SKUs where the formula stops working, because the economic order quantity assumes demand is roughly steady and a meaningful share of any catalogue is not. Where the demand standard deviation runs above 30% of the mean, the average hides everything that matters: two units a day on average can be one unit a day for a month and then fifteen in a launch week, and the lot size the formula returns will be wrong in both directions. Those SKUs need a human decision on quantity and a shorter review, not a spreadsheet. Do this after the order-quantity work, because the override list is easier to write once you can see which SKUs are already outside the cap.',
          alsoMoves:
            'Marking the noisy SKUs changes the safety-stock policy too, because a high-variance SKU needs either a bigger buffer or a shorter lead time, and that choice interacts directly with what you do about lead-time spread. It also changes the supplier conversation: a SKU whose demand you cannot predict is a SKU where a smaller lot delivered more often usually beats a large lot, which makes the order cadence a negotiated term rather than an output of your spreadsheet. And it makes the per-tier review cadence meaningful, because the SKUs you review weekly are then the ones whose forecast is stable enough to review.',
          backfire:
            'Overriding the formula everywhere backfires, because you replace a computed number with a judgement that is not recorded and cannot be reviewed, and that judgement tends to drift toward whatever closes the week most easily. The opposite failure is applying the formula to a launch SKU with a planned spike: the order lands in the wrong week and you are out of stock for the demand you were preparing for. Keep the override list explicit, write the reason beside each SKU, and re-check it quarterly, because a noisy SKU that has stabilised should go back onto the formula.',
        },
        {
          priority: 5,
          metric: 'Realised service level against target (fulfilled A-class order lines ÷ total A-class order lines, compared with the configured 99% target)',
          fixFirst:
            'Read the last row as the verdict on everything above, because it is the only line that tells you whether the buffer you built was the right size and whether the input you measured was the input that mattered. If the realised service level on A-class lines sits below the 99% you wrote down, then one of three things is true: the demand forecast was wrong, the lead time is worse than you measured, or the reorder point was never actually in the system. Find out which before changing anything else, because each has a different fix and two of them are not solved by adding stock. Only once the realised level is at or above the target should the rest of the sequence resume.',
          alsoMoves:
            'It also calibrates the Z values in row two, because a service level you have never realised is a number you cannot spend capital against: the gap between the configured target and the realised rate tells you how much of the buffer is actually being consumed, which is a direct read on whether the forecast or the lead time is the weak input. It is also the number that decides whether the capital released from the tail is worth anything, because capital freed from the C tier means nothing if the A tier is quietly failing and you are buying emergency cover for it.',
          backfire:
            'Treating this row as a monthly report backfires, because the failures it catches are the ones you have already paid for: a missed delivery on an A-class line costs the sale, the repeat purchase and the reputation on a product you have already spent marketing money on. And the metric is easy to move by loosening the definition of fulfilled, since a line that ships late and complete is not the same as a line that was never short. If the realised level has improved while A-tier revenue per order line has fallen, the definition moved rather than the operation.',
        },
      ],
    },
    zh: {
      intro:
        '再订货点坏在波动上，不是坏在均值上，而最要命的波动往往在上游。跨境供应商的前置期标准差常在均值的 30-50%，这比任何需求预测都更能改变安全库存——安全库存只随前置期的平方根增长，所以前置期翻一倍，库存只多 41%，不是 100%。服务水平随后要跟着 SKU 分层走，而不是全店一个标准：统一 99% 会过度服务长尾，同时饿着真正贡献收入的那些 SKU。按层配安全库存周覆盖：A 类 4-8 周，C 类 1-2 周。供应商资质数量是前置期翻倍情景下真正的缓冲。',
      rows: [
        {
          priority: 1,
          metric: '前置期变异比（前置期标准差 ÷ 前置期均值，按供应商分别算）',
          fixFirst:
            '先把前置期波动量出来，因为它是安全库存里你能改变、且影响最大的那个输入，也是最常被当成「供应商承诺」而不是「真实到货记录」的那一项。每家供应商拉至少 20 笔已完成订单，用实际到货日期算出均值和标准差，再把波动写成占均值的百分比。一家承诺 12 天、实际在 12 到 30 天之间到货的供应商，不是 12 天供应商：安全库存公式要把这个波动乘上需求速率，所以按承诺建出来的缓冲大约只有现实需要的一半，缺口正好落在你最没准备的那个周期里。这一项要在动任何 Z 值之前量完，因为下游每个数字都要被它缩放。',
          alsoMoves:
            '量出来的前置期波动还会改变订量决策，因为波动大的供应商需要更大的缓冲和更小的批量：你改成更少次数地买、一次买更少，于是缓冲替你扛住了风险。这两件事合起来决定了营运资本要按多少天的平均库存收费。它还决定哪些 SKU 需要第二家供应商，因为波动最差的那几家，往往是「一次延误就从晚到变成缺货」的那几家。它也重新标定了多供应商这项工作的价值：在波动 40% 的供应商上做第二家资质很值，在 12% 的供应商上几乎不值。',
          backfire:
            '这里最经典的错误是量了均值就把它当波动。均值 14 天、标准差 6 天的供应商，和均值 14 天、毫无波动的供应商，是两个完全不同的计划输入，把两者平均掉，恰好抹掉了你根本没法围绕它做计划的那几周。第二个失败是靠施压而不是靠结构来压波动：让供应商承诺更硬，可能把均值缩短了，而尾部没变，或者只是挪到了清关上，于是按更短均值建的安全库存换了个方向继续错。在把某个波动值当最终结论之前，先把合同、装箱量或运输路线修掉。',
        },
        {
          priority: 2,
          metric: '服务水平目标的按层落实率（配置 Z 值与所属 ABC 层策略一致的 SKU 数 ÷ SKU 总数）',
          fixFirst:
            '第二件事是核对服务水平目标有没有真的按层区分，因为「全公司统一 99%」是这个模型里最贵的默认设置。指南给的是 A 类 99%、B 类 95%、C 类 90% 或 85%，而这几个 Z 值之间的差距，就是可回收营运资金最集中的地方：把尾部过度服务、同时把头部服务不足，正是单一全局目标造出来的结果。从 ERP 里把每个 SKU 配的 Z 值导出来，跟分层策略逐个对，让分层来决定这个数，而不是让 ERP 的默认值来决定。放在前置期测量之后做，因为 Z 值是要乘在前置期输入上的，那个输入得先是真的。',
          alsoMoves:
            '按层配对之后，平均库存和压在它上面的资金成本会同时变化，你也能重新决定把资本花在哪里：从尾部释放出来的资本，正好可以拿去把头部的备货做深，而收入都在头部。它还会改变补货节奏，因为周复盘那一层需要的缓冲比同样目标下每日复盘的那一层小，所以目标和复盘周期必须一起决定。它也让下一行变得可量：一个订量上限只有在它底下的缓冲是被刻意设定的前提下才有意义。',
          backfire:
            '收紧服务水平目标，会在尾部的需求不是「间歇」而是「结构性下滑」时反噬：一个六个月没卖动的 C 类 SKU 需要的不是更紧的服务水平，而是下架或者改成按需生产；在你还在主推的 SKU 上留一个很薄的缓冲，等于在自家店面上挂出一个长期缺货。另一个失败是改了目标却没改周期，于是挂着 99% 目标的那一层仍然按月复盘，拿着的是按每日复盘才需要的缓冲。改目标的时候把复盘周期一起改，并且在改动期间把 A 类守在 99%。',
        },
        {
          priority: 3,
          metric: '订量与前瞻需求上限之比（超过 30 天前瞻需求的 A 类订单货值 ÷ A 类订单总货值）',
          fixFirst:
            '第三步是给再订货点配上一个订量，因为只有触发器没有订量，只是把问题挪了个位置。触发再订货点的意义就在于：触发之后你一次买一个合理的批量，而不是整周零零碎碎地补；指南给 A 类定的上限是 30 天前瞻需求。用经济订货量公式算出批量之后，要拿它对照上限，也对照真实的前瞻需求 —— 用 12 个月均值建出来的公式，会心安理得地推荐一个覆盖了它看不见的季节峰值的批量。放在服务水平和前置期都对之后做，因为建立在错输入上的订量，只是一个更大的错答案。',
          alsoMoves:
            '订量正是缓冲与周期库存相遇的地方：一个覆盖 60 天而不是 30 天的批量，会让货架上同时多出两倍的周期库存，这就是缺货风险和现金锁死之间的差别。它还决定你得多频繁地重测前置期风险 —— 大批量、买得少，意味着每一次到货都更重要，一次延误伤得也更重。它也是压住死库存的主要杠杆，因为按滑动均值定出来的批量，会把上一季的峰值带进下一次订单。',
          backfire:
            '订量上限的反噬，是它被压到了供应商最小起订量以下：太小的批量会被拒单、被加收小批附加费，或者被丢到更慢的服务档。有一个更隐蔽的版本 —— 上限在采购系统里被遵守了，而供应商悄悄把你的订单合并成一次更大的发货，货最后还是一坨到。它在季节性 SKU 上也会失灵，因为谷底的 30 天前瞻需求根本不够覆盖上坡。给上限只套在 A 类，把季节性调整显性化，并且核对实际收货数量，而不是下单数量。',
        },
        {
          priority: 4,
          metric: '高方差 SKU 仍在用公式的比例（需求 σ 超过均值 30% 却仍按公式下单的 A 类 SKU 数 ÷ A 类 SKU 总数）',
          fixFirst:
            '第四步是把公式不再适用的 SKU 分出来，因为经济订货量假设需求大致平稳，而任何一份目录里都有相当一部分不是这样。需求标准差超过均值 30% 时，均值把真正要紧的东西全藏起来了：平均每天两件，可能是连着一个月每天一件，然后在发布周来十五件，公式给出的批量在两个方向上都会错。这类 SKU 需要的是人对批量的一次判断加上更短的复盘周期，而不是一张表。把这一步放在订量工作之后，因为当你已经能看到哪些 SKU 本来就超出上限时，这份人工覆盖清单更容易写出来。',
          alsoMoves:
            '把高方差 SKU 标出来，安全库存的政策也跟着变：这类 SKU 要么需要更大的缓冲，要么需要更短的前置期，而这个选择和你对前置期波动做的处理直接互相影响。它还改变了跟供应商谈的内容：一个需求你预测不了的 SKU，通常是「小批量、多频次」优于「大批量」的那一个，于是订货节奏变成一个谈判条款，而不是你表格里的输出结果。它也让分层的复盘周期变得有实际意义，因为你按周复盘的那批 SKU，正好是预测足够稳、值得复盘的那批。',
          backfire:
            '到处都人工覆盖会反噬，因为你是用一次没有记录、没法复核的判断，换掉了一个算出来的数，而这个判断往往会慢慢漂向「怎么让这周最容易收尾」的那一边。反过来的失败是把这套公式用在有计划峰值的发布 SKU 上：订单落在错误的那一周，而你恰好是为那次需求备的货，于是缺货了。把覆盖清单写明，每一项旁边写下原因，并且每个季度复查 —— 一个已经稳下来的高方差 SKU 应该回到公式上。',
        },
        {
          priority: 5,
          metric: '实际服务水平与目标的差距（A 类订单行履约数 ÷ A 类订单行总数，对照配置的 99% 目标）',
          fixFirst:
            '最后一行请当成对上面所有动作的判决来读，因为只有它能告诉你：你建的缓冲大小对不对，你量的那个输入是不是真的那个要紧的输入。如果 A 类订单行的实际服务水平低于你写下来的 99%，那么只有三种可能：需求预测错了、前置期比你量的更差、或者再订货点根本没进系统。在动任何别的东西之前先查清是哪一种，因为三者的修法完全不同，其中两种不是靠加库存能解决的。只有当实际水平回到目标之上，剩下的顺序才继续往下走。',
          alsoMoves:
            '它同时校准第二行里的那些 Z 值，因为你从来没兑现过的服务水平，是一笔没法拿来做资本决策的数：配置目标与实际履约率之间的差距，告诉你缓冲里有多少真的被消耗掉了，这直接读出弱的那个输入究竟是预测还是前置期。它也是那个能决定「从尾部释放出来的资本到底值不值」的数 —— 如果 A 类在悄悄失守、而你正用救急采购为它买单，那么从 C 类省下来的资本并没有真的省下来。',
          backfire:
            '把这一行当成每月报表看会反噬，因为它检出的失败恰恰是你已经付过钱的那些：A 类订单行的一次交付失败，赔掉的是这一单、复购，以及你在一个已经花过推广费的产品上的口碑。而且这个指标很容易靠放松「履约」的定义来做漂亮 —— 一行迟发但送全的订单，跟一行从来没短过的订单不是一回事。如果实际服务水平变好了、而 A 类每订单行收入在跌，那说明是定义动了，不是运营动了。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Eight fields have to be right before a reorder point can be trusted. The demand forecast states its variance method, lead-time spread comes from twenty real orders per supplier, and the safety stock formula uses both. Service level is set per tier, and the reorder point is written per SKU and tagged in the system.',
      items: [
        {
          step: 1,
          label: 'Per-SKU demand forecast with a stated variance method',
          gate:
            'At least 90 days of unit sales are pulled for every SKU, average daily demand and its standard deviation are computed, and every seasonal SKU is split into at least 3 month buckets with the method written down.',
          blockIf:
            'A 90-day window on a seasonal business is not a forecast, it is a memory: the SKU was low in February because the season had not started, and the safety stock built on that number is wrong in both directions. And a standard deviation computed across a whole year mixes seasonal swing with noise, so it inflates the buffer on everything including the SKUs that are genuinely stable. If the variance method is not written down, nobody can tell later whether a number changed because the business changed or because the formula did.',
        },
        {
          step: 2,
          label: 'Lead-time mean and spread from at least 20 real orders per supplier',
          gate:
            'For each supplier, at least 20 completed orders are measured, with the mean lead time and its standard deviation computed and the spread expressed as a percentage of the mean (under 15% / 15-30% / 30-50% / above 50%).',
          blockIf:
            'Without 20 real receipts you are planning on a supplier promise, and a promise is a different distribution from a delivery record: it has a mean and no tail, which is exactly the shape that produces a buffer that is too small and a stockout in the month you had budgeted for nothing. The percentage bands also tell you which vendors need a second source, so a shortage of order history here quietly delays a decision that has a lead time of its own.',
        },
        {
          step: 3,
          label: 'Service-level target set per ABC tier and written per SKU',
          gate:
            'Every SKU carries one Z value (2.33 for A / 1.65 for B / 1.28 or 1.04 for C), and the configured Z matches the tier policy for at least 90% of SKUs, with the exceptions listed by name.',
          blockIf:
            'One global service level across the whole catalogue over-serves the tail and under-serves the head at the same time, and the over-served part is exactly where the working capital hides. The 10% exception allowance exists so that a handful of genuinely special SKUs do not block the rollout, not so that the catalogue quietly returns to one number. If the exceptions are not named, nobody can tell later whether the tier policy is being applied or overridden.',
        },
        {
          step: 4,
          label: 'Safety stock computed with the tier Z and the tier review period',
          gate:
            'Safety stock is computed for every SKU using Z times the root of (demand variance times lead time plus mean demand squared times lead-time variance), with the review period applied per tier (1 day for A, 7 days for B and C) and the resulting weeks of cover recorded.',
          blockIf:
            'Applying the full lead time to every tier inflates the buffer on the SKUs you review weekly and leaves the daily-reviewed head short, and the two errors cancel out into a portfolio that looks right and behaves wrong. Recording weeks of cover is what makes the number comparable: a buffer expressed only as a unit count cannot be compared with a reorder point, so a reviewer cannot tell whether it is large or small. If the review period is not applied per tier, the square-root factor never earns its keep.',
        },
        {
          step: 5,
          label: 'Reorder point written per SKU and tagged in the system',
          gate:
            'Every SKU has a reorder point equal to lead-time demand plus safety stock, rounded up to the next orderable unit, and 100% of reorder points carry a service-level tag in the ERP or MMS that the next purchase order reads.',
          blockIf:
            'A reorder point computed in a spreadsheet and not written back into the system is a number nobody acts on: the next purchase order still fires on the old rule, and the measured service level will drift away from the target for reasons that look like demand. The tag is the part that matters, because it is what pulls the right service level when the SKU is reordered, and a rule that depends on the buyer remembering which tier a SKU is in is not a policy.',
        },
        {
          step: 6,
          label: 'EOQ paired with the reorder point and a named override list',
          gate:
            'EOQ is computed for all top-20 A SKUs, every planned order is capped at 30 days of forward demand, and every A SKU whose demand σ exceeds 30% of its mean demand appears on a written override list with a reason.',
          blockIf:
            'The order cap without the override list creates two errors that cancel: the formula quietly orders too much on the noisy SKUs while the cap quietly cuts the seasonal ones. And an override without a recorded reason becomes permanent, because the next person cannot tell whether the override was a considered decision or a leftover. If the list is empty but you know you have launch and promo SKUs, the variance threshold is not being applied to the numbers you actually have.',
        },
        {
          step: 7,
          label: 'Lead-time risk mitigation with a doubled-lead-time scenario run',
          gate:
            'A-class SKUs have at least 3 qualified vendors each, B-class SKUs carry a documented buffer, and the calculator What-If branch at 2 times the mean lead time has been run with the resulting reorder-point increase recorded.',
          blockIf:
            'Qualifying a vendor that has never been asked to deliver is a plan, not a mitigation: the second source only counts once it has a measured lead time and a measured spread, and without those it is a name on a list. The doubled-lead-time branch is the single-point-of-failure test, and skipping it means you discover the exposure during a disruption rather than during the What-If, when the only available action is to pay for expedited freight.',
        },
        {
          step: 8,
          label: 'Monthly review with quarterly tier movement decisions recorded',
          gate:
            'Reorder points are reviewed at least monthly for 3 consecutive months with the stockout count attached to each review, ABC tier movement is reviewed quarterly, and every promotion or demotion has a written new service-level target.',
          blockIf:
            'A monthly review without the stockout count attached is a ceremony: you can look at the numbers and still not know whether the buffer was consumed or the buffer was never needed. And a tier change without a written new target leaves the SKU carrying its old Z value, so the reclassification never reaches the reorder point and the capital it was supposed to free stays on the shelf. If tier movement happens but the target does not change with it, the policy is not in force.',
        },
      ],
    },
    zh: {
      intro:
        '再订货点要可信，八个字段得先各自站得住，而且它们互不独立。需求预测要写明 σ 的算法与季节性拆分方式，前置期均值与变异要来自每家供应商 20 笔以上真实订单，安全库存公式同时吃这两个波动。服务水平按层设定，逐 SKU 写下再订货点并在系统里打上分层标签，EOQ 与它配对并留一份人工覆盖清单。最后用前置期翻倍情景测一次：合资格供应商不够时，先补供应商再降服务水平。每月复盘要记录，季度还要写下 ABC 分层升降的决定。',
      items: [
        {
          step: 1,
          label: '每个 SKU 的需求预测口径、σ 的算法与季节性拆分方式',
          gate:
            '每个 SKU 都拉了至少 90 天的单量销售，算出平均日需求及其标准差，并且每个季节性 SKU 至少拆成 3 个月度区间，算法写在记录里。',
          blockIf:
            '对季节性生意来说，90 天窗口不是预测，是记忆：2 月的 SKU 之所以低，是因为旺季还没开始，而按那个数建的安全库存在两个方向上都会错。而横跨全年算出来的标准差，会把季节摆动和噪声混在一起，于是连真正稳定的 SKU 也被抬高了缓冲。如果 σ 的算法没有写下来，你以后就无法分辨某个数字变了是因为生意变了，还是因为算法变了。',
        },
        {
          step: 2,
          label: '每家供应商 20 笔以上订单的前置期均值与变异',
          gate:
            '每家供应商至少量了 20 笔已完成订单，算出前置期均值与标准差，并把变异写成占均值的百分比（<15% / 15-30% / 30-50% / >50%）。',
          blockIf:
            '没有 20 笔真实到货，你规划的就是一个供应商承诺，而承诺和到货记录是两种分布：它有均值、没有尾部，而这恰好是「缓冲建小了、然后在哪个你一分钱都没预算的月份里缺货」的那种形状。这几个百分比分带还决定了你该给哪些供应商找第二来源，所以这里历史数据不够，会悄悄拖慢一个本身就要花时间的决定。',
        },
        {
          step: 3,
          label: '每个 SKU 配置的 Z 值是否与所属 ABC 层策略一致',
          gate:
            '每个 SKU 有一个 Z 值（A 类 2.33 / B 类 1.65 / C 类 1.28 或 1.04），其中至少 90% 的 SKU 配置值与分层策略一致，所有例外都按名称列出。',
          blockIf:
            '整个目录共用一个服务水平，会同时把尾部过度服务、把头部服务不足，而被过度服务的那部分正是营运资本藏身之处。留 10% 的例外额度，是为了不让少数真正特殊的 SKU 卡住推行，不是为了让目录悄悄退回成一个数。如果例外没有被点名，你以后无法判断分层策略到底是在被执行，还是被绕过去了。',
        },
        {
          step: 4,
          label: '逐 SKU 安全库存所用的公式与各层复盘周期的取值',
          gate:
            '每个 SKU 都用「Z × √(需求方差 × 前置期 + 日均需求² × 前置期方差)」算安全库存，并按层套用复盘周期（A 类 1 天、B/C 类 7 天），同时记录下它对应几周的覆盖。',
          blockIf:
            '所有层都套完整前置期，会把每周复盘那批 SKU 的缓冲抬高，同时让每日复盘的头部偏薄，两个错误互相抵消，最后是一份看着对、行为错的组合。把周覆盖写下来，这个数才可以比：一个只用件数表达的缓冲，没法和再订货点对照，审核的人也就判断不出它是大了还是小了。如果复盘周期没有按层套用，那个开方因子就永远没兑现价值。',
        },
        {
          step: 5,
          label: '逐 SKU 的再订货点数值与其在 ERP 中打上的分层标签',
          gate:
            '每个 SKU 都有一个「前置期需求 + 安全库存」的再订货点，向上取整到可下单单位，且 100% 的再订货点都在 ERP 或 MMS 里带着一个服务水平标签，供下一张采购订单读取。',
          blockIf:
            '在表格里算出来、却没有写回系统的再订货点，是一个没人会执行的数字：下一张采购订单仍然按老规则触发，实测服务水平就会因为看似「需求变了」的原因一路偏离目标。而标签才是关键，因为它是重订时把正确服务水平拉出来的那个东西 —— 一条要靠采购员自己记得某个 SKU 属于哪一层的规则，不叫政策。',
        },
        {
          step: 6,
          label: '前 20 个 A 类 SKU 的 EOQ 结果与人工覆盖清单',
          gate:
            '前 20 个 A 类 SKU 全部算了 EOQ，每笔计划订单都卡在 30 天前瞻需求以内，且每一个需求 σ 超过均值 30% 的 A 类 SKU 都出现在一份写明原因的人工覆盖清单上。',
          blockIf:
            '有订量上限却没有人工覆盖清单，会造出两个互相抵消的错误：公式在高方差 SKU 上悄悄订多了，上限又在季节性 SKU 上悄悄砍少了。而没有写下原因的覆盖会变成永久的，因为下一个人无法分辨这个覆盖是有意决策还是遗留物。如果清单是空的、但你知道自己有首发和促销 SKU，说明方差阈值没有用在你真实的数据上。',
        },
        {
          step: 7,
          label: 'A 类 SKU 的合资格供应商数量与前置期翻倍情景结果',
          gate:
            'A 类 SKU 各自有至少 3 家合资格供应商，B 类 SKU 有写明依据的缓冲，并且已经跑过计算器里前置期翻倍的 What-If 分支，把再订货点的增幅记录下来。',
          blockIf:
            '一家从没被要求交付过的合资格供应商只是一个计划，不是缓解措施：第二来源只有在它有自己的前置期均值和变异之后才算数，没有这两个数它只是名单上的一个名字。而前置期翻倍那个分支就是你的单点故障测试；跳过它，意味着你要在真的出事时才发现敞口，那时唯一可用的动作是花钱买加急运费。',
        },
        {
          step: 8,
          label: '每月复盘记录以及季度 ABC 分层升降的书面决定',
          gate:
            '再订货点连续 3 个月每月至少复盘一次，且每次复盘都附上缺货次数，ABC 分层流动按季度复审，每一次升级或降级都写下了新的服务水平目标。',
          blockIf:
            '每月复盘却不附缺货次数，就是走个形式：数字照看，人还是不知道那个缓冲是被消耗掉了，还是根本没用上。而分层变动却没写新的目标，会让那个 SKU 继续背着旧的 Z 值，于是重分类永远到不了再订货点上，本来该释放的资本就还压在货架上。如果分层一直在动、而目标没跟着动，这条政策就没有真正落地。',
        },
      ],
    },
  },
};
