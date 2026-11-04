// P166 —— O 类（Operations / 库存运营）主题「carrying-cost-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 一个总费率里五个成因同时不达标时先动哪一个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许写金额但必须带口径）：
//   · 金额一律 USD，且写明是「库存货值」还是「收入」
//   · 持有成本率一律指「占平均库存货值的百分比/年」，五项分项分别写明
//   · 平均库存一律用 12 个月月末余额的均值，不用时点余额
//   · 阈值一律引用指南里已经写死的那几个数（资金+机会 18% / 仓储 4% / 损耗 2% / 保险 1.5% / 费率 −2pp 每季）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A carrying rate of 30% means two different problems depending on which component dominates, and the five are not interchangeable. Capital plus opportunity above 18% points to over-stocking against your cash position; storage above 4% is a warehouse negotiation; shrinkage above 2% is a receiving and count problem.',
      rows: [
        {
          priority: 1,
          metric: 'Capital and opportunity cost combined (capital % + opportunity %, per year on average inventory value)',
          fixFirst:
            'Take capital and opportunity first, because between them they are usually the largest slice of the bill and they are the only slice you control end to end. Every point of capital cost is the cost of your own money sitting in a warehouse, and every point of opportunity cost is what that money could have earned in the business that actually moves it, so the two components are one quantity seen twice and the only thing that shrinks them is holding less stock. Decompose before you negotiate anything: a rate where capital and opportunity together exceed 18% of inventory value per year tells you the diagnosis is quantity relative to your cash position, not a supplier problem. Then decide which side of the ledger you are acting on, because there are two and they behave differently. You can reduce the stock, or you can change the financing structure so the same stock costs less to carry.',
          alsoMoves:
            'Cutting the quantity moves three other components with it, because every unit you remove stops paying storage, stops attracting shrinkage, and stops inflating the declared value the insurance is written against. That is why the total rate usually falls by more than the capital and opportunity points you removed, and it is why to do this before the 3PL negotiation rather than after: negotiating storage on stock you are about to liquidate buys you a rate you will not be paying in six months. It also frees the cash that lets you take the loss on a clearance without touching payroll.',
          backfire:
            'Cutting inventory purely to shrink the capital charge is the classic way to improve the rate and damage the business. Reduce units below what demand needs and the gap shows up as stockouts on the SKUs that carry the margin, while the emergency orders that replace them cost more per unit than the capital you saved. There is a second version that looks healthy on the rate: writing stock off lowers the inventory value, and a percentage measured on a smaller base can even stay flat while the cash release was real, so judge the fix on cash released and on stockout rate rather than on the rate alone. And if you take on 3PL credit or factoring to lower the capital charge, you have bought working capital at a spread, and that spread belongs in the comparison too.',
        },
        {
          priority: 2,
          metric: 'Over-stock held above policy (inventory value in SKUs above their reorder point, plus SKUs with zero sales in 90 days, ÷ total inventory value)',
          fixFirst:
            'Second, find the stock you hold above policy, because that is where the capital and opportunity points are actually trapped. Compare what you hold against what the reorder point says you need, and split the result into two populations: units sitting well above the reorder point because somebody padded the last order, and units with no sales at all in 90 days that no reorder point will ever justify. The second group is the one to remove outright; the first is the one to stop re-buying by tightening order quantity and the review cadence. Do this before the fee work, because it is the only lever here that needs no counterparty and it produces the cash that makes a clearance affordable.',
          alsoMoves:
            'Releasing over-stock changes the storage rate you negotiate, because a 3PL prices on the cube you actually give it, so a 20% cut in units changes the quote you receive without you having to argue harder. It also changes the shrinkage rate, because most shrinkage sits in the slow-moving part of the shelf where a receiving mistake goes unnoticed for months. And it is the step that makes the ABC work pay: re-tiering after the clean-up is what stops the same SKUs being classified as A simply because they were bought in quantity.',
          backfire:
            'Releasing over-stock backfires when the units above policy are actually a demand spike being absorbed and you cut them in a week that happens to be short. The visible symptom is a stockout on an A-class SKU right after the release, at exactly the moment you were trying to prove the rate had improved. The other failure is counting the same unit twice: a SKU with no sales in 90 days may also sit above its reorder point, so removing it once from the numerator while it stays in the replenishment plan means it comes back and the rate never improves. Fix the replenishment rule in the same change that writes the stock off.',
        },
        {
          priority: 3,
          metric: 'Storage and handling cost (per year as a percentage of average inventory value)',
          fixFirst:
            'Start the storage negotiation on day 1 even though it lands third, because the contract is the only item here on a calendar you do not control: most 3PL agreements renew about once every 12 months, and a quote request that starts after the quantity work is finished arrives too late to change the rate you pay this year. So the order in terms of cash landing is quantity first and storage second, while the order in terms of calendar time runs the two in parallel. Get two or three comparable quotes rather than one, and write the target compression into the renewal note, because a target that is not written down becomes whatever the incumbent asks for.',
          alsoMoves:
            'The storage rate is the component most sensitive to where you store, not just how much you store, so this lever also changes your delivery promise and therefore your lead time, which feeds the safety-stock calculation and the capital charge layered on top of it. It also sets the floor for the shrinkage rate, because a 3PL with tight receiving controls and reliable cycle counts shows up in your shrinkage number, so a storage renegotiation that includes operational asks can lower two components at once. And it changes how much the quantity work is worth, because a 3PL charging per pallet rather than per unit rewards consolidating orders.',
          backfire:
            'Storage backfires when the cheaper quote comes with a longer or less predictable inbound lead time, which pulls more safety stock into the system and adds capital cost on top of the storage saving you were chasing. A 3PL that stores your stock further from your customers also stretches the delivery promise, and the stockout rate shows that up before the rate does. The subtler failure is negotiating the storage line in isolation: the 3PL can give you a better storage rate and a worse handling rate, and the all-in cost can end up exactly where it started. Negotiate the all-in cost per unit, not the storage line.',
        },
        {
          priority: 4,
          metric: 'Shrinkage and obsolescence (per year as a percentage of average inventory value)',
          fixFirst:
            'Fourth, audit shrinkage, because it is the only component that is pure leakage: it never becomes revenue, it becomes a write-off. It is also the audit that improves the inventory accuracy every other measurement on this list depends on. A shrinkage rate above 2% of inventory value per year points at receiving, counting and packaging rather than at a supplier you can negotiate with, so the work is internal: reconcile what arrived against what was ordered, put a cycle count on the categories that move most, and review how damaged goods are handled. Do it after the quantity work, because a count taken on a bloated and mis-tiered shelf produces a number you will have to run again.',
          alsoMoves:
            'A clean shrinkage audit moves the insurance component too, because declared value is set from what you believe you hold, and a reliable count means the declaration matches reality. It also feeds the dead-stock work, because a SKU showing zero sales for 90 days is sometimes a SKU that was received but never put away, and separating those two cases changes how much you write off. And accurate counts are what make the over-stock number in row two trustworthy, because a shrinkage error and an over-stock error look identical in a stock record.',
          backfire:
            'Tightening receiving and count controls backfires on throughput. A verification step at the dock slows put-away, which lengthens the lead time the reorder point was built on, and the extra safety stock that forces can cost more than the shrinkage you removed. The second failure is a shrinkage number that improves because damage got reclassified as a write-off or as a return, which moves the loss off the line you are watching rather than out of the business. Keep shrinkage and write-offs on the same page when you report, and watch inbound lead time for two months before you conclude the audit worked.',
        },
        {
          priority: 5,
          metric: 'Insurance cost (per year as a percentage of average inventory value)',
          fixFirst:
            'Leave insurance until last, because it is the smallest line on the bill and the only one where being wrong is not symmetric. A policy audit that reclassifies SKUs by their real value can shave the premium, but under-declaring is not a saving, it is a transfer of risk to the moment you need it, and one theft on a mis-declared high-value SKU can exceed a year of premium on the whole book. So the correct order is to get the inventory records accurate and tiered first, because the policy is written against the declared value you can evidence, then audit the policy against those records, and only then consider whether the cover matches what you actually hold.',
          alsoMoves:
            'A correct declaration changes how you read the other components, because it puts a market value on the stock you are trying to shrink, which makes the cash released by the dead-stock work concrete rather than abstract. It also sharpens the over-stock argument, since if the insurance line is priced off declared value, the units you remove from the shelf are exactly the units you remove from the premium. And it can change your supplier terms, because a carrier who sees accurate values and a tight cycle count will quote better terms than one shown an inventory figure nobody can substantiate.',
          backfire:
            'Insurance backfires when the premium is cut and the coverage quietly narrows in the same conversation. Suppliers will offer a lower rate for lower declared value, and a policy with a higher per-claim excess looks identical in the premium line while making one incident far more expensive. Watch the exclusions as well: cover for high-value, easily sold electronics is priced and scoped differently from cover for slow-moving stock, so consolidating your lines into a few categories can leave a gap exactly where your A-tier items sit. Re-read the schedule of values after every audit, not just the rate.',
        },
      ],
    },
    zh: {
      intro:
        '持有成本率到 30% 时，是哪一种问题取决于哪个分项占主导，而五个分项之间并不能互相替代。资金加机会成本超过 18%，说明库存压在现金上太多；仓储超过 4%，那是仓库合同的事；损耗超过 2%，是收货和盘点的问题；保险超过 1.5%，该做保单审计。先修占主导的那一项，因为省下的仓储费救不了压在滞销库存上的资金。分项拆不出来，就先去把平均库存和 12 个月 COGS 对齐。有的仓库费下降看着漂亮，其实是把库存挪到了另一处仓库。',
      rows: [
        {
          priority: 1,
          metric: '资金成本与机会成本两项合计（占平均库存货值的百分比/年）',
          fixFirst:
            '把资金与机会放在第一位，因为这两项通常是账单上最大的一块，也是唯一一块你能从头到尾自己控制的部分。资金成本的每一个点，是你自己放在仓库里的钱的价格；机会成本的每一个点，是这笔钱留在原地而不是去那个真正会动的生意里能挣到的 —— 所以这两项其实是同一个数量被看了两遍，能压缩它们的只有「少压货」这一件事。谈任何东西之前先拆开：如果资金与机会合计超过库存货值的 18%，那诊断就是「库存量相对于你的现金头寸太多了」，不是供应商问题。然后要决定动哪一边，因为有两边且行为不同：你可以把货减掉，也可以改融资结构，让同样这批货的持有成本变低。',
          alsoMoves:
            '压库存会顺带拉动另外三个分项，因为每少一个单元，就少付一次仓储、少招一次损耗、也少撑高一分保险所依据的申报价值。这就是为什么总费率通常会比你砍掉的那几个「资金 + 机会」点降得更多 —— 也是为什么这件事要在 3PL 谈判之前而不是之后做：在你马上要清掉的库存上去谈仓储，买到的是一个六个月后你不会再付的费率。它还会释放出那笔现金，让你在不动工资的前提下承担一次清货的损失。',
          backfire:
            '纯粹为了压低资金成本而砍库存，是「费率变好、业务变坏」的标准做法。把数量压到需求以下，缺口就变成那些扛毛利的 SKU 的缺货，而补上的救急订单，单价往往高于你省下的那笔资金。还有第二个版本在费率上看还挺健康：核销让库存货值变小，占比分母变小之后，费率可能纹丝不动，尽管现金是真的释放了 —— 所以这件事要看「释放了多少现金 + 缺货率」，不能只看费率。另外，如果你用 3PL 信贷或保理来换更低的资金成本，你其实是按一个价差买回了营运资金，那个价差必须一起进比较。',
        },
        {
          priority: 2,
          metric: '超出政策持有的库存（高于再订货点的 SKU 货值 + 90 天零销售 SKU 货值 ÷ 库存总货值）',
          fixFirst:
            '第二步是找出你「压着但用不着」的那部分，因为资金与机会那两个点真正被困住的地方就在这里。拿你手上有的去比再订货点告诉你需要多少，然后把结果分成两类：一类是高于再订货点很多，很可能只是上一次有人把订单下大了；另一类是 90 天完全没卖动、任何再订货点都不会证明它合理的货。第二类直接清掉，第一类靠收紧订量和复盘节奏来别再补回来。放在费率谈判之前做，因为它是不需要对手方的那条杠杆，而且它产出的现金正好让清货这件事付得起。',
          alsoMoves:
            '释放掉超储会改变你能谈到的仓储费率，因为 3PL 是按你实际交出来的立方位收费的，件数少两成，你收到的报价就变了，不用多费口舌。它也会改变损耗率，因为大部分损耗藏在货架走得慢的那一段，收货出错几个月都发现不了。它还是让 ABC 分层真正兑付的那一步：清完之后重新分层，才能避免同一批 SKU 因为「当初买得多」而被反复标成 A 类。',
          backfire:
            '释放超储的反噬，是那些「高于政策」的货其实正在吸收一次需求尖峰，而你偏偏在一个偏短的周里把它们砍了。看得见的症状是释放之后紧接着 A 类 SKU 缺货 —— 正好撞上你要证明费率已经改善的那一刻。另一个失败是同一个单元被算两次：90 天零销售的 SKU 往往也高于自己的再订货点，你把它从分子里清掉了，补货计划却还留着它，于是它又回来了，费率始终不降。写核销的那一次改动里，必须同时改补货规则。',
        },
        {
          priority: 3,
          metric: '仓储与操作成本这一项（占平均库存货值的百分比/年）',
          fixFirst:
            '仓储谈判第 1 天就要启动，尽管它在钱上排第三，因为合同是这张表上唯一不由你控制的日历：多数 3PL 协议大约 12 个月续一次，报价请求如果等数量工作做完才发出去，今年的费率就已经改不了了。所以按落钱排是数量在前、仓储在后，按日历排这两件事要并行推进。要 2-3 家可比的报价，不要 1 家；并且把压缩目标写进续约备注里 —— 没有写下来的目标，最后就是对方开多少是多少。',
          alsoMoves:
            '仓储这一项对「货放在哪」比对「放多少」更敏感，所以这个杠杆还会改变你的交付承诺，从而改变前置期，前置期又进入安全库存的计算，于是额外压上一笔资金成本。它也决定损耗率的下限，因为收货管控严、盘点准的 3PL 会直接体现在你的损耗数上 —— 一场带上运营诉求的仓储重谈，有可能一次压低两个分项。它还决定数量那部分工作值多少钱：按托盘而不是按件收费的 3PL，会奖励你合并订单。',
          backfire:
            '仓储的反噬，是更便宜的报价带着更长或更不稳的前置期一起来，于是系统里被拉进更多安全库存，你想要的仓储节省上面又多付一笔资金成本。把货放得离客户更远的 3PL 也会拉长交付承诺，而这件事先在缺货率上冒头，费率上反而看不见。更隐蔽的失败是只谈仓储那一行：3PL 可以给你更好的仓储费率和更差的操作费率，算总价时可能原地不动。要谈的是每件货的全成本，不是仓储那一行。',
        },
        {
          priority: 4,
          metric: '损耗与报废这一项占平均库存货值的年化百分比',
          fixFirst:
            '第四步审损耗，因为它是唯一一个纯粹的漏损分项：它永远不会变成收入，只会变成核销。它也是唯一一件能同时修好「其它所有度量都依赖的库存准确度」的审计。损耗率超过库存货值的 2%，指向的是收货、盘点和包装，而不是一个能跟你谈判的供应商，所以活儿是内部的：把到货和订购对一遍，给动得最凶的品类上周期盘点，再审一遍残次品怎么处理。放在数量工作之后做，因为在臃肿又分层错误的货架上盘出来的数，你还得再盘一遍。',
          alsoMoves:
            '损耗审干净会带动保险那一项，因为申报价值是按「你以为你有多少」定的，盘点准了，申报才和现实一致。它也会喂给死库存那条线：一个显示 90 天零销售的 SKU，有时其实是收到了却没上架，把这两种情况分开，你该核销的金额就变了。而且准确的盘点正是第二行那个超储数字可信的前提 —— 在库存记录里，一个盘亏错误和一个超储错误长得一模一样。',
          backfire:
            '把收货和盘点管控收紧，反噬的是吞吐。在月台加一道验收会让上架变慢，于是拉长再订货点赖以成立的前置期，而被迫增加的安全库存，可能比省下的损耗还贵。第二个失败是损耗数字变好只是因为残次品被改记成核销或者退货 —— 那是把损失从你盯着的那一行挪走，不是把损失从生意里挪走。汇报时把损耗和核销放在同一页，并且在宣布审计见效之前，跟进两个月的入库前置期。',
        },
        {
          priority: 5,
          metric: '保险成本这一项（占平均库存货值的百分比/年）',
          fixFirst:
            '保险留到最后，因为它是账单上最小的一行，也是唯一一项出错时不对称的部分。按真实价值重分类 SKU 的保单审计确实能削掉一点保费，但低报不是省钱，是把风险推到最需要它的那一刻 —— 一只高价值 SKU 被偷一次，损失可能超过你整本库存一年的保费。所以正确的顺序是先把库存记录做准、分好层，因为保单是按你能举证出来的申报价值写的；然后拿保单去对记录；最后才考虑覆盖范围是否配得上你真正压着的货。',
          alsoMoves:
            '申报正确会改变你看另外几个分项的方式，因为它给你想压的库存标上了一个市场价值，于是「清死库存换回来的现金」从抽象变成具体。它也让超储那个论证更锋利：如果保险这一行是按申报价值计费的，你从货架上拿走的每个单元，正好就是你从保费里拿走的每个单元。它还可能改变你的供应商条款 —— 一个看到准确货值和干净盘点的承保人，给出的条款会好过那个拿到一个没人能举证的库存数字的承保人。',
          backfire:
            '保险的反噬，是保费被砍的同时保障范围在同一场谈话里悄悄变窄。保险公司愿意为更低的申报价值给更低的费率，而一份单次免赔额更高的保单，在保费那一行看起来完全一样，却会让一次事故贵出好几倍。免责条款同样要看：高价值、易出手的电子品，定价和承保范围跟慢动销库存不一样，把你的品类合并成几类，可能恰好在 A 类货所在的地方留出一个缺口。每次审计之后都要重读价值明细表，不能只看费率。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Seven steps take a carrying rate apart, and the first two decide whether the rest is worth it: average inventory taken as a twelve-month mean rather than a balance sheet snapshot, then the five components decomposed with one dominant driver named. Dead stock and over-stock are then valued against the balance sheet.',
      items: [
        {
          step: 1,
          label: 'Average inventory taken as a 12-month mean with COGS over 12 months',
          gate:
            'Average inventory is the mean of 12 month-end balances rather than one balance, COGS covers the same 12 months, and the resulting rate sits inside exactly one of the 4 health bands (<20% / 20-25% / 25-30% / 30% and above).',
          blockIf:
            'A point-in-time balance makes the rate a snapshot of one receiving day, and a snapshot cannot be compared with a peer band that was computed on a 12-month average. The cost is not only accuracy: with the denominator unstable, the four bands become arbitrary and you will argue with your own numbers instead of with the cost structure. Recompute on 12 balances before you classify anything.',
        },
        {
          step: 2,
          label: 'Five components decomposed and one dominant driver named',
          gate:
            'All 5 components carry a numeric rate, each is tested against its own threshold (capital + opportunity 18%, storage 4%, shrinkage 2%, insurance 1.5%), and the dominant component is written down with its share of the total rate.',
          blockIf:
            'Without the decomposition you cannot choose a lever, and each of the five has a different counterparty: quantity, a 3PL contract, receiving and counting, a broker, or your financing structure. Treating the total as one number is how a team ends up negotiating the smallest line because it is the easiest to get a meeting on. If no dominant component can be named, the step is not finished even if the total looks acceptable.',
        },
        {
          step: 3,
          label: 'ABC classification covering every SKU with tier policies attached',
          gate:
            '100% of SKUs are classified, the A tier is the top 20% by cumulative revenue, B the next 30% and C the remainder, and each of the 3 tiers carries one service level (95% / 90% / 85%) and one review cadence (weekly / bi-weekly / monthly).',
          blockIf:
            'A classification without a service level and a review cadence attached changes nothing, because the same 95% target then applies to the tail because that is what the ERP defaults to. The other block is coverage: an unclassified SKU still consumes capital and gets picked in a cycle count, so a partial classification quietly reintroduces the over-stock you were trying to find. If you cannot name the tier for every SKU, the concentration figures you will quote later are not defensible.',
        },
        {
          step: 4,
          label: 'Dead stock valued as a share of inventory with a clearance route',
          gate:
            'Every SKU with zero sales in the last 90 days is listed and valued, that value is written as a percentage of total inventory value, and a clearance plan with a 30-50% discount band exists for every unit if the percentage exceeds 5%.',
          blockIf:
            'The threshold only means something once the value is expressed as a percentage: an absolute number feels different depending on the size of the business, so the same list triggers a clearance on one week and none on the next. And a list without a route per unit is a report, not a plan, because liquidation channels clear at very different prices and the gap between the best and worst route is usually wider than the discount band being debated.',
        },
        {
          step: 5,
          label: '3PL quotes obtained and a compression target written down',
          gate:
            'At least 2 comparable 3PL quotes exist, dated within the last 12 months, and a rate-compression target of 0.5-1.5 percentage points is recorded in the renewal notes with the operational asks listed alongside it.',
          blockIf:
            'One quote is not a negotiation, it is a price list, and it gives the incumbent no reason to move. The target matters as much as the quotes because a target that exists only in your head gets conceded in the meeting: if nobody wrote 0.5-1.5 points down and the operational asks beside it, the renewal will settle on whatever is proposed and you will discover the new rate only when it lands on the invoice.',
        },
        {
          step: 6,
          label: 'EOQ and per-SKU safety stock computed for the top 20 A SKUs',
          gate:
            'EOQ is computed for all top-20 A SKUs, each planned order is capped at 30 days of forward demand, and safety stock uses the tier Z values (1.65 for A / 1.28 for B / 1.04 for C) with the square-root lead-time-to-review-period factor applied per tier.',
          blockIf:
            'Safety stock computed with one Z for every tier overstates the tail and understates the head, so the capital you release in one place is spent in another and the rate does not move. The order cap is the other half: an order above 30 days of forward demand is how the dead stock you just cleared comes back. If either is missing, you have modelled the rate but not changed the behaviour that produces it.',
        },
        {
          step: 7,
          label: 'Quarterly rate target with monthly tracking and a SKU-count trigger',
          gate:
            'A quarterly target of minus 2 percentage points is written down with a target band, the rate is tracked at least monthly for 3 months, and the quarter-over-quarter change in C-class SKU count is computed with a 10% growth threshold recorded as the ABC-not-landing trigger.',
          blockIf:
            'A target without a monthly reading is a wish, and the carrying-cost rate drifts on a monthly cycle that a quarterly review cannot see. The SKU-count trigger is the part people skip: if the C tier grows by 10% or more in a quarter, procurement is adding slow-moving stock faster than rationalisation removes it, and the rate will not reach the target no matter how good the negotiations were. Check that count before you accept the target as missed.',
        },
      ],
    },
    zh: {
      intro:
        '七步把一个持有成本率拆开，头两步就决定后面值不值得做：平均库存取 12 个月均值，而不是资产负债表上的时点数；接着把五个分项逐条拆开，并点名哪一项占主导。随后把死库存与超储按占资产负债表的比例估出金额，给 ABC 分层挂上服务水平与复盘节奏。最后用仓库重新议价与前 20 个 A 类 SKU 的 EOQ 订量收口——高周转与低持有，是 CFO 同时要跑的两条轴。季度目标写成 −2pp 的费率变化，并配上每月追踪记录，否则这轮优化撑不过一个季度。',
      items: [
        {
          step: 1,
          label: '五项拆解之后持有成本率究竟落在哪一行同行带',
          gate:
            '平均库存取 12 个月月末余额的均值而不是某一个余额，COGS 取同样这 12 个月，算出的费率落在 4 个健康带中的恰好一个（<20% / 20-25% / 25-30% / 30% 及以上）。',
          blockIf:
            '用时点余额算出来的费率，只是某一个收货日的快照，而快照没法跟用 12 个月均值算出的同行带比。代价不只是准确度：分母不稳定，四个健康带就成了随意的划分，你会和自己的数字吵架，而不是去和成本结构吵架。先用 12 个余额重算，再做任何分类。',
        },
        {
          step: 2,
          label: '五个分项各自有数并且点名了主导驱动是哪一项',
          gate:
            '5 个分项都有数值，每个都对照自己的阈值检验过（资金 + 机会 18%、仓储 4%、损耗 2%、保险 1.5%），并且主导项被写下来，附上它占总费率的份额。',
          blockIf:
            '不拆就选不出杠杆，而五个分项的对手方各不相同：库存量、一份 3PL 合同、收货与盘点、一个经纪人，或者你的融资结构。把总数当成一个数，结果往往是团队去谈最小的那一项，只因为那一家最容易约到见。如果连主导项都点不出来，这一步就不算完成，哪怕总数看起来还行。',
        },
        {
          step: 3,
          label: 'ABC 分层覆盖率与每层挂上的服务水平和复盘节奏',
          gate:
            '100% 的 SKU 完成分层，A 层是按累计收入排的前 20%，B 层是接下来 30%，C 层是其余，并且 3 个层各自挂了一个服务水平（95% / 90% / 85%）和一个复盘节奏（周 / 双周 / 月）。',
          blockIf:
            '只分层、不挂服务水平和复盘节奏，等于什么都没改，因为最后还是 95% 这个目标被套到尾部 —— 那正是 ERP 的默认值。另一个卡点是覆盖率：没分层的 SKU 一样占着资本、一样会被盘到，于是「部分分层」悄悄把你想找的超储又放了回来。如果你说不出每个 SKU 属于哪一层，之后要引用的集中度数字就站不住。',
        },
        {
          step: 4,
          label: '死库存清单、金额占比与折清渠道是否都已落定',
          gate:
            '最近 90 天零销售的 SKU 全部列出并估值，该金额写成库存总货值的百分比，并且当这个百分比超过 5% 时，每个单元都有一条 30-50% 折扣带的折清方案。',
          blockIf:
            '只有写成百分比，这个阈值才有意义：绝对金额的大小取决于生意有多大，同一份清单这周触发清货、下周就不触发。而没有逐单元路线的清单只是一张报表，因为不同清货渠道的成交价差得很远，最高与最低渠道之间的差额，通常比你正在争论的那个折扣带还宽。',
        },
        {
          step: 5,
          label: '3PL 续约报价与费率压缩目标的书面记录与对比',
          gate:
            '至少有 2 家可比的 3PL 报价，日期在过去 12 个月之内，且续约备注里写下了 0.5-1.5 个百分点的费率压缩目标，并列出了配套的运营诉求。',
          blockIf:
            '一份报价不是谈判，是价目表，它没有给在位供应商任何移动的理由。目标和报价一样重要，因为只存在你脑子里的目标在谈判桌上就会被让掉：如果没有人把 0.5-1.5 个点写下来、把运营诉求写在旁边，续约就会落在对方当场报的数上，而你只能等它出现在发票上时才发现。',
        },
        {
          step: 6,
          label: '前 20 个 A 类 SKU 的 EOQ 与逐 SKU 安全库存',
          gate:
            '前 20 个 A 类 SKU 全部算过 EOQ，每笔计划订单都卡在 30 天前瞻需求以内，安全库存用各层的 Z 值（A 类 1.65 / B 类 1.28 / C 类 1.04）并按各层复盘周期套用了「前置期 ÷ 复盘周期」开方因子。',
          blockIf:
            '所有层共用一个 Z 算出来的安全库存，会把尾部抬高、把头部压低，于是一个地方释放的资本在另一个地方被花掉，费率原地不动。订量上限是另一半：超过 30 天前瞻需求的订量，正是你刚清掉的死库存回来的方式。这两样缺一个，你只是建模了费率，并没有改变产生费率的那个行为。',
        },
        {
          step: 7,
          label: '季度 −2pp 目标与每月追踪记录的连续性',
          gate:
            '写下了每季 −2 个百分点的目标与目标带，费率至少按月追踪并连续 3 个月有记录，同时算出 C 类 SKU 数量的季度环比变化，并把 10% 的增长阈值记录为「ABC 没落地」的触发线。',
          blockIf:
            '有目标但没有每月读数，持有成本率是按月漂的，而季度复盘看不见月度的漂移。SKU 数量触发线是大家会跳过的那一半：如果某一季度 C 类增长 10% 以上，说明采购新增慢动销的速度快过精简的速度，那么无论谈得多好，费率都到不了目标。在接受「目标没达成」这个结论之前，先看这个数。',
        },
      ],
    },
  },
};
