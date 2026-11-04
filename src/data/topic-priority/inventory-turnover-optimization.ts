// P166 —— O 类（Operations / 库存运营）主题「inventory-turnover-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 8 编号链（按顺序做什么）
//   · 本文件 fixPriority = 周转不达标时多个指标同时坏掉，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许写金额但必须带口径）：
//   · 金额一律 USD，且写明是「库存货值」还是「收入」
//   · 周转率一律用滚动 12 个月 COGS ÷ 12 个月月末库存均值（不用时点余额）
//   · 持有成本率一律指「占平均库存价值的百分比/年」，且写明是年化口径
//   · 库存天数一律写明是「按 COGS 口径」还是「按收入口径」
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Turnover and stockouts pull against each other, so turnover alone rarely answers it. Dead stock as a share of inventory value shows what capital stopped moving, and safety stock as a share of average inventory shows what sits there only to absorb noise. A-class stockout rate is the price you pay for the rest.',
      rows: [
        {
          priority: 1,
          metric: 'Dead-stock share of inventory value (SKUs with zero sales in the last 90 days ÷ total inventory value at cost)',
          fixFirst:
            'Clear the dead stock first because it is the only item on this table that improves the ratio without any change in purchasing behaviour, and because it corrects the denominator that every later number is divided by. Inventory that has not sold in 90 days generates no demand, so removing it lifts the turnover ratio in the same quarter you take the write-off, and it stops paying the capital charge plus the storage, insurance and shrinkage charges that those same dead units are generating right now. It also needs no negotiation with a supplier and no revision to a forecast, so it is the one lever you can finish inside a quarter and confirm from a single figure the month after. Keep the recovered capital on its own line instead of letting it disappear into the operating account, because the entire point is being able to see whether it stayed out of slow-moving stock.',
          alsoMoves:
            'Removing dead stock moves the carrying-cost rate further than any fee negotiation you can win, because those units were paying all five components at once: capital on money that is not turning, storage on cube that could have been sold, insurance on declared value nobody will ever claim, and shrinkage on goods that get written off eventually regardless. It also moves the replenishment inflow ratio, because a smaller base makes the same weekly purchase order a larger share of inventory, which is precisely the signal you want to read in the next step. And it resets the ABC tiers, because SKUs parked in the tail stop distorting the concentration figures you use to set service levels.',
          backfire:
            'Dead-stock clearance backfires when the write-off is funded by a discount that steals demand from the SKUs you needed to sell. Clearing at 40 percent off in a week when demand is healthy teaches buyers to wait for the next event, and the margin you gave away on the dead units reappears as a second loss on the healthy side. The other version is mislabelling: a SKU with zero sales often has a broken channel mapping, a suppressed listing, or an upstream stockout behind it, and clearing those at 30-50 percent off turns a demand problem into a permanent price reset on a product that still sells. Compare the last 90 days against the 90 days before that before any SKU enters the list. If the earlier period had sales, you have a stockout artefact, not dead stock.',
        },
        {
          priority: 2,
          metric: 'Replenishment inflow ratio (inventory added by purchase orders ÷ inventory consumed by cost of goods sold, trailing 12 months)',
          fixFirst:
            'Stop the inflow second, because a clean-up that is not followed by a change in what you order simply regenerates within 90 days, and a turnover gain that decays was a one-off event rather than an operating improvement. Compute the inflow ratio over a trailing 12 months and compare it with 1.0: above 1.0 means you are adding more capital to the shelf than sales are taking off it, which is the mechanical definition of falling turnover. Fixing it means changing order quantity and review cadence by tier rather than clearing one more SKU list, and it is the only row here that changes what happens every week from now on. Do it after the dead stock is out, because until the base is clean you cannot tell whether a given order is oversized or the base was simply bloated.',
          alsoMoves:
            'A controlled inflow ratio is what makes the dead-stock work permanent, and it also pulls the safety-stock share down: a smaller order quantity on a tier reviewed weekly means you hold less between reviews as well as less at each one. It changes the working-capital conversation with your lender or your 3PL, because inventory financed on a line that replenishes at 1.0 times consumption is a line that stops growing on its own, and that is usually the difference between needing more capital and not needing it. It also makes the order-size cap in the guide enforceable, because a cap only means something when the average order was already close to it.',
          backfire:
            'Tightening the inflow without touching safety stock is the standard way to convert a turnover problem into a stockout problem. If you cut order quantities on a tier whose service level was never actually met, the gap shows up as missed deliveries on exactly the SKUs that were paying for the working capital you were trying to release. The subtler version is refusing replenishment on slow-moving SKUs while the real leak sits on fast-moving ones: you trim the tail, the head still runs short, and the ratio improves while revenue falls. Measure this row in units per line rather than in order value, because one large order can make the value look controlled while the unit flow is not.',
        },
        {
          priority:3,
          metric: 'Safety-stock share of average inventory (safety-stock units ÷ average inventory units)',
          fixFirst:
            'Look at the safety-stock layer third, because it is the part of your inventory that no forecast justifies and every buyer will defend. Under the tiered service policy described in the guide, a B or C tier reviewed weekly carries safety stock scaled by the square root of the lead-time-to-review-period ratio, so moving a tier from daily to weekly review cuts the safety-stock dollars materially without touching the service promise. Setting the targets by ABC tier is where most of the recoverable working capital in a reorder-point model sits, and it is a policy change you can make in the ERP this month. Do it after the inflow is under control, because safety stock is computed from lead-time demand, and a base that is still moving gives you a number that describes a month you have already left behind.',
          alsoMoves:
            'Reducing the safety-stock share moves the average inventory that the turnover ratio divides by, and it moves it without a single sale changing, which makes it the cleanest way to improve the headline number without touching demand. It also frees the capital that the capital-cost component of the carrying-cost rate is charging on, so the rate falls without a 3PL conversation. And it reallocates: the cash you take out of the safety stock on C-tier SKUs is exactly the cash you can put into the A tier where the service level is supposed to sit at 95 percent or better.',
          backfire:
            'Safety stock is the buffer that absorbs the bad weeks, and cutting it on a tier whose service level was never met just moves the loss to a later column. Lead-time variability is the multiplier here: a supplier whose lead time stretches from 12 to 30 days turns a lean buffer into a stockout on every single cycle, and the emergency order that replaces it costs more per unit than the buffer you removed. The other failure is applying one service target everywhere because the ERP makes it easy, which over-serves the tail and under-serves the head at the same time. Track stockout rate by tier for at least 2 months before you cut, and cut the tier that has never missed rather than the one carrying the biggest buffer.',
        },
        {
          priority: 4,
          metric: 'Carrying-cost rate as a percentage of average inventory value per year (five components summed)',
          fixFirst:
            'Measure the rate fourth, on the same peer row you used for turnover, because it is a separate axis and a good turnover number can hide an expensive rate. Two businesses with identical turnover can sit 8 to 10 percentage points apart in what they pay to hold stock, and the gap comes from components you negotiate rather than from how fast the stock moves. Decompose it into capital, storage, insurance, shrinkage and opportunity before touching anything: a rate made of 15 points of opportunity cost and 15 points of storage is a financing problem and a warehouse contract problem, and no amount of SKU rationalisation moves it. Do this after the inventory clean-up, so the rate you measure belongs to the inventory you intend to keep rather than to the pile you are about to liquidate.',
          alsoMoves:
            'A decomposed rate tells you which of your earlier fixes was actually the expensive one. If capital and opportunity dominate, rows one to three were the right work; if storage dominates, the fix is a 3PL negotiation that has nothing to do with how many SKUs you buy; if shrinkage dominates, it is a receiving and cycle-count problem. It also prices the delay, because every extra month of excess inventory is charged at this rate, and it is the number that lets a lender see your working capital improving even while the turnover figure is still noisy.',
          backfire:
            'Optimising the rate instead of the inventory can make the business look better without making it healthier. A 3PL that quotes a lower storage rate per pallet but stores your stock further from the customer lengthens the delivery promise and pulls more safety stock into the system, and the capital cost on that extra stock can exceed the storage saving you were quoted. Writing stock off to shrink the capital charge can push units below the reorder point, so the rate improves and revenue falls in the same quarter. Judge this rate against the same peer row, and read it together with the stockout tripwire rather than on its own.',
        },
        {
          priority: 5,
          metric: 'Stockout rate on A-class SKUs (stockout order lines ÷ total A-class order lines, trailing 90 days)',
          fixFirst:
            'Read the last row as a guardrail rather than as a target to improve. Every fix above can create it, and the quickest way to raise turnover is to stop ordering, which is also the quickest way to lose the revenue that funds the whole inventory programme. If this rate climbs above 1 percent on A-class lines while turnover is improving, revert the most recent change to order quantity or safety stock before you bank any further gain, because a working-capital win that came with lost A-class revenue is not a win and it will not show up in next quarter turnover either. Only once the rate is back inside its band should the sequence resume.',
          alsoMoves:
            'It also calibrates the targets in the rows above. Turnover and stockout are the two ends of one trade, so any change to safety stock or order size has to be judged on both, and this row tells you whether the buffer you kept was doing its job. It is also the metric that exposes a forecast error the average hides: a SKU with a healthy ratio and a rising stockout count has demand trending up faster than a 90-day window can show.',
          backfire:
            'Treating this row as a trailing report backfires, because the failures it catches are the expensive ones. A stockout on an A-class line loses the sale, the repeat purchase and the basket around it, and the replacement order usually arrives at a premium freight rate with the cost already sunk. And when the stockouts concentrate on the SKUs you cut hardest, the ratio that looked best on the dashboard is the metric that produced the damage. If the rate breaches its band, stop the sequence rather than running the same change again in a different order.',
        },
      ],
    },
    zh: {
      intro:
        '周转率和缺货率是互相拉扯的两个力，所以真正要紧的从来不只是周转率。死库存占库存货值的比重说明有多少钱已经不动了，补货流入比说明进货比销售快了多少，安全库存占平均库存的比例告诉你资产负债表上有多少只是用来吸收前置期噪声。而 A 类缺货率就是其余部分要付的价钱：安全库存压得越低，缺货越贵。基准要按自己的品类比：杂货 14-18 次、服饰 4-6 次、汽配 3-4 次，套全行业平均等于什么都没比。结构性漂移超过 10% 且连续两个季度，就要动 SKU 精简。',
      rows: [
        {
          priority: 1,
          metric: '死库存占库存货值的比重（最近 90 天零销售的 SKU 货值 ÷ 库存总货值）',
          fixFirst:
            '把死库存放在第一位，因为它是这张表上唯一一个不动采购行为就能改善周转率的动作，也是它修正了后面所有指标都要用的那个分母。90 天没卖动的库存不产生需求，把它处理掉，当季的周转率就上去了；而这些单元现在正同时付着资金、仓储、保险和损耗四项费用。因为它不需要跟供应商谈判、不需要改预测，所以也是这里唯一能在一个季度内做完、下个月用单一数字就能确认的动作。回收的资本请单独记一条线，不要让它消失在日常运营账户里 —— 这一步的全部意义就是看清它有没有又流回慢动销库存。',
          alsoMoves:
            '清掉死库存对持有成本率的影响，比任何一次费率谈判都大，因为这些呆滞单元本来就在同时付五项费用：占着不动的资金、占着本可以拿去卖的库容、占着没人会索赔的申报价值，以及迟早要核销的损耗。它同时会改变补货流入比：分母变小之后，同一笔周采购订单占库存的份额就变大了 —— 这正好是你下一步要读的信号。它还会重置 ABC 分层：原先堆在尾部的 SKU 不再扭曲你用来设定服务水平的集中度指标。',
          backfire:
            '死库存清货的反噬，是折扣把本来要赚的钱也带走了。在需求本来健康的周里打 4 折清货，会让买家学会等下一场活动，你让掉的毛利会掉到健康 SKU 的那一边。另一个版本是判错：显示零销售的 SKU 常常是渠道映射断了、listing 被下架，或者上游长期缺货造成的；这些货以 30-50% 折清掉，等于把一个需求问题变成一个还在卖的产品的永久价格重置。进清单之前，先把最近 90 天和前 90 天对一下：如果前一期有销售，那是缺货假象，不是死库存。',
        },
        {
          priority: 2,
          metric: '补货流入比（采购订单入库的库存 ÷ 同期销售消耗的库存，滚动 12 个月）',
          fixFirst:
            '第二步是止住流入。只做清理而不改以后买什么，死库存 90 天内就会重新长出来，那你的周转改善只是一次性事件，不是经营能力。滚动 12 个月算出流入比并跟 1.0 比：大于 1.0 就是你往货架上加的资本比销售拿走的还多，这正是周转下滑的机械定义。要修它就得改分层下的订量与复盘节奏，而不是再清一张 SKU 清单；这也是表上唯一一个改变「从这周往后每周发生什么」的动作。放在死库存之后做，是因为基数没干净之前，你分不清某笔订单是下大了，还是基数本来就虚胖。',
          alsoMoves:
            '把流入比控住，死库存那份成果才立得住；它同时会压低安全库存占比，因为周复盘那一层订量变小，意味着两个复盘点之间占的量更少、复盘那一刻占的量也更少。它也改变你跟资金方或 3PL 谈营运资金的方式：按 1.0 倍消耗节奏补货的库存，是一条自己就不增长的额度，这通常就是「要不要再融一笔」和「不用」之间的差别。它还让指南里的订量上限真正可执行 —— 只有平均订单本来就贴着上限走，那个上限才有约束力。',
          backfire:
            '只收紧流入、不动安全库存，是把周转问题换成缺货问题的标准做法。如果你在一个服务水平本来就达不到的层上砍订量，缺口就变成那些 SKU 的交付失败 —— 而它们正是替你赚回营运资金的那些 SKU。更隐蔽的版本是：真正漏的地方在快动销 SKU 上，你却在慢动销那头少补，于是尾部分变好，头部继续缺货，占比改善的同时收入在掉。这一行要看单位件数，不要看订单金额，因为一笔大订单能让金额看起来受控，而件数流向并没有受控。',
        },
        {
          priority: 3,
          metric: '安全库存占平均库存的比例（安全库存件数 ÷ 平均库存件数）',
          fixFirst:
            '第三步看安全库存这一层，因为它是你库存里任何预测都证明不了、但每个采购都会替你保住的部分。按指南里的分层服务水平，B 类或 C 类在周复盘下安全库存按「前置期 ÷ 复盘周期」开方来缩，把某一层从每日复盘改成周复盘，安全库存金额会明显下降，而服务承诺不用动。按 ABC 分层设定目标，是再订货点模型里可回收营运资金最集中的地方，而这是你这个月就能在 ERP 里改完的政策动作。放在流入受控之后做，因为安全库存是由前置期需求算出来的，基数还在动的时候，你算出的数字属于一个已经过去的月份。',
          alsoMoves:
            '压低安全库存占比，会直接改变周转率的分母（平均库存），而且不依赖任何一笔销售变化 —— 这是改善这个头条数字而不碰需求的最干净办法。它同时释放出被资金成本这一项持有成本收费的资本，于是费率会下降，不需要跟 3PL 谈一轮。它还是一次再分配：你从 C 类安全库存里拿出来的现金，正是可以补进 A 类、用来把服务水平顶到 95% 以上的那笔现金。',
          backfire:
            '安全库存是用来吸收坏周的缓冲，在服务水平本来就达不到的层上砍掉它，只是把损失挪到了后面一列。前置期波动是这里的乘数：一家前置期从 12 天拉到 30 天的供应商，会让本来就不厚的安全库存每个周期都变成一次缺货，而救急订单的单价通常高于你省下的那块缓冲。另一个失败是因为 ERP 改起来容易就一刀切统一目标，结果尾部被过度服务、头部同时被服务不足。砍缓冲之前先按层跟踪 2 个月缺货率，砍那个从未缺过的层，而不是缓冲最大的那个。',
        },
        {
          priority: 4,
          metric: '持有成本率（资金、仓储、保险、损耗、机会五项合计，占平均库存货值百分比/年）',
          fixFirst:
            '第四步量费率，而且要用你量周转时用的同一行同行基准，因为它是另一根轴，周转数字好看可能盖住一个很贵的费率。两家周转完全一样的公司，持有费率可以差 8 到 10 个百分点，差额来自可以谈判的分项，而不是来自货转得多快。动手之前先拆成资金、仓储、保险、损耗、机会五项：如果是 15 个点的机会成本加 15 个点的仓储费，那是融资问题和仓库合同问题，做多少 SKU 精简都动不了它。放在库存清理之后量，是因为量到的是你要留下的那部分库存的费率，而不是你马上要清掉的那堆的费率。',
          alsoMoves:
            '拆开的费率会告诉你前面几次修复里到底哪一次是最贵的那个：如果资金与机会主导，说明第 1 到 3 行的动作做对了；如果仓储主导，修复动作是一次 3PL 谈判，跟你买多少 SKU 无关；如果损耗主导，问题在收货与周期盘点。它也标出了拖延的价格：你多放的每一个月库存都在按这个费率被收费；而它也是唯一一个能让资金方相信你的营运资本在改善的数字，哪怕周转数字本身还在抖。',
          backfire:
            '优化费率而不是优化库存，会让企业看起来更好而实际没变好。一家按托盘报出更低仓储费的 3PL，如果把你的货放得离客户更远，就会拉长交付承诺、把更多安全库存拉进系统，而这部分多出来的库存所付的资金成本，可能超过你拿到的仓储节省。为了压低资金成本而核销库存，同样可能把库存压到再订货点以下，于是费率变好、收入在同一个季度里掉。用同一行同行基准来判这个费率，并且把它和缺货那条护栏一起看，不要单独读。',
        },
        {
          priority: 5,
          metric: 'A 类 SKU 缺货率（缺货订单行 ÷ A 类总订单行，滚动 90 天）',
          fixFirst:
            '最后一行请当成护栏读，而不是当成一个要去改善的目标。上面每一项修复都可能造出它，而改善周转最快的办法就是停止订货，那也正是最快丢掉收入的办法。如果 A 类缺货率升到 1% 以上而周转同时在改善，先回退最近一次对订量或安全库存的改动，再去算任何进一步的收益 —— 一份用丢失的 A 类收入换来的营运资金胜利不是胜利，而且下一季度的周转数字里根本看不到它。只有当这条率回到区间内，这个顺序才继续往下走。',
          alsoMoves:
            '它同时校准上面几行的验收口径。周转和缺货是同一笔取舍的两端，所以改安全库存或订量时两个数都要看；这一行告诉你留的缓冲到底有没有在干活。它还是那个能揭出均值掩盖的预测错误的指标：一个比率看起来健康、而缺货次数在涨的 SKU，说明它的需求上行速度已经超过 90 天窗口能反映的程度。这一行同时决定你能不能把前面省下来的钱投回 A 类：缓冲从 C 类挪到 A 类之后，得有一个数证明 A 类没在漏。',
          backfire:
            '把这一行当成事后报表看会反噬，因为它检出的失败恰恰是最贵的那种。A 类缺货会丢掉这一单、丢掉复购、也丢掉连带销售，而补上的那一单通常还带着更贵的运费和已经沉掉的成本。而且当缺货集中在你砍得最狠的那批 SKU 上时，看板里最好看的那个比率就是制造损失的那个。一旦这条率越界，就停下这个顺序，而不是把同一个改动换个顺序再做一遍。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Eight inventory checks, and the denominator goes wrong most often: turnover on a point-in-time balance instead of a twelve-month average reads high in a growing season. The carrying cost rate must be split into five components, and ABC tiers earn their service levels only once safety stock and an order size attach.',
      items: [
        {
          step: 1,
          label: 'Turnover ratio computed on a 12-month average denominator',
          gate:
            'Turnover is recomputed from trailing 12-month COGS divided by the mean of the 12 month-end inventory balances, and the point-in-time balance differs from that mean by less than 5%.',
          blockIf:
            'With a single month-end balance as the denominator, the ratio inherits the purchase calendar instead of the business: a heavy receiving month reads as a turnover collapse and a quiet month as a win, so every threshold in the guide gets judged against a number that can move twofold without a single unit changing hands. Rebuild the denominator from 12 balances before you compare against any peer row.',
        },
        {
          step: 2,
          label: 'Five-component carrying cost rate placed in its peer band',
          gate:
            'Each of the 5 components carries its own rate as a percentage of inventory value per year, the 5 sum to one number, and that number lands inside exactly one named band from the benchmark table.',
          blockIf:
            'A single blended rate hides the only information that decides what to do: whether capital and opportunity dominate (an inventory quantity problem), storage dominates (a 3PL contract problem) or shrinkage dominates (a receiving and cycle-count problem). Until the 5 numbers are separate you cannot choose a lever, and every later action is a guess about where the cost actually sits.',
        },
        {
          step: 3,
          label: 'Modelled rate-reduction scenarios with their cash impact',
          gate:
            'At least 3 scenarios are modelled (3PL renegotiation, dead-stock write-off, SKU consolidation), each with its annual cash impact stated, and the accepted scenario shows at least 2 percentage points of modelled rate reduction.',
          blockIf:
            'A modelled rate change with no cash impact attached gives you a percentage nobody can act on, because 2 points on a large inventory base and 2 points on a small one are different decisions for a cash-constrained founder. If the scenarios cannot produce a cash number, the modelling has not reached the point where it can be accepted or rejected, and the step cannot be called done.',
        },
        {
          step: 4,
          label: 'ABC tiers with a service level and review cadence attached',
          gate:
            'Every SKU carries an A, B or C label, the A tier holds roughly 20% of the SKU count and about 80% of value, and each of the 3 tiers has one service level (95% / 90% / 85%) and one review cadence written against it.',
          blockIf:
            'A tier with no service level and no review cadence attached is a label rather than a policy, and it changes nothing: the 95% target ends up applied to the tail because that is what the ERP defaults to. The concentration check is also the early warning. If the A tier is not carrying roughly 80% of value, the tiers do not reflect where the money is, and the service levels get set against the wrong SKUs.',
        },
        {
          step: 5,
          label: 'Per-SKU safety stock using the Z score of its tier',
          gate:
            'Every SKU in the top 20 by revenue has a safety stock computed in the Z x sigma x root(LT/RP) form, and the Z value used matches the service level of its tier for at least 95% of those SKUs.',
          blockIf:
            'A single Z applied to the whole catalogue looks consistent and is not: the whole point of tiering is that a C-tier SKU reviewed weekly carries a materially smaller buffer than an A-tier SKU reviewed daily. If the Z values do not match the tiers you are holding one uniform buffer and paying uniform capital for it, which means the tiering work in the previous step bought nothing.',
        },
        {
          step: 6,
          label: 'EOQ for the top 20 A SKUs with the order cap enforced',
          gate:
            'EOQ is computed for all top-20 A SKUs, and every planned order in the last 30 days sat at or below 30 days of forward demand, with each exception written down and explained.',
          blockIf:
            'An order size above the forward-demand cap is how new dead stock is created: it converts a 12-month problem into a 30-day one on every cycle. The formula itself is not the risk, the variance around it is, so if more than 2 of the 20 SKUs breached the cap you are running on a formula that does not match your demand pattern and the EOQ needs recalculating rather than re-excusing.',
        },
        {
          step: 7,
          label: 'Dead stock identified, valued and given a clearance route',
          gate:
            'All SKUs with zero sales in the last 90 days are listed and valued, that value is written as a percentage of total inventory value, and a clearance plan covers 100% of it with a 30-50% discount band per channel.',
          blockIf:
            'A clearance plan that does not name the channels and the discount per channel is an intention. Liquidation routes clear at very different prices, and the gap between the highest and lowest route is usually wider than the discount band you are arguing about. If you cannot say which route each unit takes, the write-off gets booked at whatever price the day offers, which is the most expensive way to do it.',
        },
        {
          step:8,
          label: 'Monthly re-benchmark with a structural-drift trigger written down',
          gate:
            'Turnover is recomputed at least once per month for 3 consecutive months, the drift test compares the averages of 2 consecutive quarters, and a SKU-rationalization review is triggered when that difference exceeds 10%.',
          blockIf:
            'Monthly re-benchmarking is what stops a seasonal business cutting stock in the wrong month: a 20% swing is normal and a structural drift is not, but you can only tell them apart with the monthly series rather than a quarter-end snapshot. Without the series, a two-quarter drift reads as one bad month, and the review that should have started in month 4 starts in month 9.',
        },
      ],
    },
    zh: {
      intro:
        '库存八项检查，最容易错的是分母：拿时点余额算周转率而不是 12 个月均值，旺季会算高、清库存时又算低。持有成本率随后必须拆成五个分项，才好建模费率下降；ABC 分层只有在每个 SKU 都挂上安全库存和 EOQ 订量之后，才配得上它那档服务水平。结构性漂移超过 10% 且连续两个季度，就要动 SKU 精简。清货要排进季度日程，不是库存难看时才想起来做。订量上限卡在 30 天前瞻需求，是为了不再造出一批新的死库存。',
      items: [
        {
          step: 1,
          label: '用 12 个月月末余额均值做分母算出的周转率',
          gate:
            '周转率由滚动 12 个月 COGS 除以 12 个月月末库存余额的均值算出，且时点余额与这个均值相差不到 5%。',
          blockIf:
            '分母只取某一个月末余额，周转率继承的就是采购日历而不是生意本身：收货重的那个月读起来像周转崩了，安静的那个月读起来像赢了，于是指南里每一条阈值都在用一个不动一件货也能翻倍变化的数字去判断。先把分母用 12 个余额重建起来，再去跟任何一行同行基准比。',
        },
        {
          step: 2,
          label: '五项拆解后的持有成本率以及它落在基准表的哪个同行带',
          gate:
            '5 个分项各自有一个「占库存货值百分比/年」的费率，5 个相加得到一个数，且这个数落在基准表里某一个具名的带内。',
          blockIf:
            '只有一个混合费率，就等于把唯一能决定动作的信息藏起来了：到底是资金与机会主导（库存数量问题）、仓储主导（3PL 合同问题）还是损耗主导（收货与周期盘点问题）。五个数没分开之前你没法选杠杆，后面每一次动作都是在猜成本坐在哪里。',
        },
        {
          step: 3,
          label: '三个已建模型的费率下降情景与各自的年度现金影响',
          gate:
            '至少建 3 个情景（3PL 重谈、死库存核销、SKU 整合），每个都写出年度现金影响，且被采纳的那个情景显示建模费率下降至少 2 个百分点。',
          blockIf:
            '只建模费率变化却不给年度现金影响，等于给出一个没人能据以行动的百分比：2 个百分点的下降落在大库存基数上还是小库存基数上，对现金紧张的创始人来说是两个完全不同的决定。如果情景里出不来现金数字，这个建模就还没到能被采纳或否决的地步，这一步就不能算完成。',
        },
        {
          step: 4,
          label: '挂上服务水平与复盘节奏之后的 ABC 分层结果',
          gate:
            '每个 SKU 都有 A / B / C 标签，A 层大约占 20% 的 SKU 数与约 80% 的价值，并且 3 个层各自写清了一个服务水平（95% / 90% / 85%）和一个复盘节奏。',
          blockIf:
            '没有挂上服务水平和复盘节奏的层只是一个标签，不是政策，什么都不会改变：最后还是 95% 这个目标被原样套到尾部，因为那正是 ERP 的默认值。集中度这一项检查还是早期预警：如果 A 层没有扛住约 80% 的价值，说明你的分层没有反映钱在哪里，服务水平就会被设到错的 SKU 上。',
        },
        {
          step: 5,
          label: '按层配好 Z 分数之后每个 SKU 的安全库存',
          gate:
            '收入前 20 的每个 SKU 都用「Z × σ × √(LT/RP)」的形式算出安全库存，且其中至少 95% 的 SKU 所用 Z 值与所属层的服务水平一致。',
          blockIf:
            '全目录用一个 Z 算出来的安全库存看起来很统一，其实不是：分层的全部意义就在于，周复盘的 C 类 SKU 背着明显更小的缓冲，而每日复盘的 A 类背着大的那个。如果 Z 值没跟层对齐，你就是在为一份统一缓冲付统一的钱，上一步的分层工作等于白做。',
        },
        {
          step: 6,
          label: '前 20 个 A 类 SKU 的 EOQ 结果与订量上限的执行情况',
          gate:
            '前 20 个 A 类 SKU 全部算了 EOQ，且最近 30 天里每一笔计划订单都没有超过 30 天前瞻需求，任何例外都写下了原因。',
          blockIf:
            '超过前瞻需求上限的订量，是新死库存的生成方式：它把一个 12 个月的问题，每个周期都变成一个 30 天的问题。真正有风险的不是公式本身而是公式周围的波动，所以如果 20 个里有超过 2 个越线，说明你的公式跟真实需求模式不匹配，EOQ 需要重算，而不是重找理由。',
        },
        {
          step: 7,
          label: '死库存清单、估值结果与每个渠道的清货路线',
          gate:
            '最近 90 天零销售的 SKU 全部列出并估值，该金额写成库存总货值的百分比，并且清货计划覆盖其中 100%，每个渠道写清 30-50% 的折扣带。',
          blockIf:
            '没写清渠道和每个渠道折扣的清货计划只是一个意向。不同清货渠道的成交价差得远，而最高与最低渠道之间的差额，通常比你正在争论的那个折扣带还大。说不出每个单元走哪条路，核销就只会按当天能拿到的价格入账 —— 那是最贵的做法。',
        },
        {
          step: 8,
          label: '连续 3 个月的周转重对记录与结构性漂移触发线',
          gate:
            '周转率连续 3 个月每月至少重算一次，漂移测试比较连续两个季度的平均值，且当差值超过 10% 时触发 SKU 精简审查。',
          blockIf:
            '每月重对基准是防止季节性生意在错误的月份砍库存的关键：20% 的摆动是正常的、结构性漂移不是，但只有手里有月度序列而不是季度末快照，你才分得出这两者。没有序列，连续两个季度的漂移会被读成某一个坏月份，本该在第 4 个月启动的审查就拖到了第 9 个月。',
        },
      ],
    },
  },
};
