// P166 —— A 类（SaaS Metrics）主题「mrr-growth-strategies」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前已完整读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 按 MRR 阶段选行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个增长指标同时不达标时先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的达标线与卡点（howToApply 只说做什么，不说什么算达标）
//
// 口径纪律（本主题讲的是用户自己的经营阈值，不是数据集市场价 ⇒ 允许手写金额，但必须带口径）：
//   · MRR = 月度经常性收入（美元计）；ARR = MRR × 12；两者都取封闭自然月口径。
//   · 留存类百分比的分母统一为「期初就存在的那批封闭队列」的期初 MRR，效率类分母为当月 MRR，两者不混用。
//   · 金额一律写成「USD 50K MRR」这种带口径的形式（分子分母 + 期间 + 量级 + 单位），不写孤零零的数。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Growth stops where churn says it stops. At constant churn, MRR approaches New MRR divided by churn, so a company adding USD 30K of new MRR every month at 3% monthly churn can never pass roughly USD 1.0M of MRR, however many logos it buys — every point of churn is subtracted from the size of the business you can ever reach, and any repair made above that ceiling is rented. Expansion comes next because it is the only revenue line that arrives without new sales spend attached; activation comes third because it decides whether acquisition money survives contact with a real customer; the growth rate itself comes last, because a growth rate is an output the rows above it produce rather than something ads can move. One caliber throughout: MRR is USD recurring revenue on the closed cohort that existed at period start, NRR is rolling twelve months for board reporting and one closed calendar month for operating review and never blended, and CAC payback is CAC divided by the gross profit new MRR produces, in months.',
      rows: [
        {
          priority: 1,
          metric: 'Monthly logo churn and GRR — the revenue leaking out of the base',
          fixFirst:
            'Fix churn before you spend another dollar on acquisition, because churn is the denominator of the growth ceiling: with monthly churn held constant, MRR approaches New MRR divided by churn, so at 3% churn a company adding USD 30K of new MRR every month can never pass roughly USD 1.0M of MRR no matter how many logos it buys. Work the account-level cause, not the headline rate. Pull the churned MRR for the last three closed months out of billing and split it by cause — champion left, use case ended, team shrank, a cheaper tier now covers the usage — then fix the biggest bucket, which is usually first-90-day onboarding rather than price. Verify on the next closed month against the cohort that existed at period start, not against this month\'s total MRR.',
          alsoMoves:
            'Three things move with it. Churned MRR sits in the denominator of the Quick Ratio, so a lower churn rate raises that ratio mechanically, with no change in acquisition at all. NRR recovers because GRR is NRR\'s floor: you cannot spend your way to a healthy retention number on a base that is shrinking. And every repair in the rows below is multiplied by the size of the base you kept, which is why retention is the highest-leverage variable in the whole model — the same USD 10K of net new MRR moves a USD 100K business twice as far as a USD 50K one.',
          backfire:
            'Two ways this repair turns into a different injury. Buying churn back with discounts converts churn into downgrade: the account stays, the churn line looks better for one quarter, but the account is anchored to a lower price for life, so NRR and ARPU fall and the Quick Ratio improves by far less than the churn rate suggests. The subtler version is cutting the support or onboarding capacity that was preventing churn — churn events fall this quarter because nobody is asking, and the retained cohort turns unhealthy and leaves in one large wave at its next renewal, costing you more NRR than the churn fix gained.',
        },
        {
          priority: 2,
          metric: 'Expansion MRR — expansion share of net new MRR, and the NRR-to-GRR gap',
          fixFirst:
            'Only attack expansion once gross retention holds, because expansion revenue raised on a leaking base is paid for twice — once to acquire, once to replace what leaked. Pick one expansion motion and run it for a full quarter: seat growth if usage is the binding constraint on an account, cross-sell if you own a second use case the account already needs, or a price increase if value is already proven. Target expansion at 25% of net new MRR, the level the guide uses to push NRR into the best-in-class tier, and run one source per quarter so the result is readable.',
          alsoMoves:
            'Expansion is the only revenue source that arrives without a sales rep attached, so NRR and CAC payback move in the same direction for once: spend stays flat while net new ARR rises, and payback falls even if your acquisition budget never changes. Because expansion lands inside accounts you already serve, it also carries your best delivery margin, which moves the Rule of 40 and, later, the multiple an acquirer will pay.',
          backfire:
            'Expansion pushed into a weak base books revenue now and produces churn two quarters later. Seat minimums a small team cannot use, cross-sell into a segment with poor product fit, and a price increase applied to accounts that were already churn-prone all show up as an NRR improvement first and a renewal wave afterwards — and because those accounts arrived mid-period, they never appear in the cohort you reviewed. There is a second version: expansion reported gross (free seats, onboarding credits, discounted multi-year ramps) lifts the expansion line without lifting net ARPU, so NRR improves while the economics get worse.',
        },
        {
          priority: 3,
          metric: 'Activation rate — share of new subscribers reaching first value inside 30 days',
          fixFirst:
            'Fix activation before you spend more on acquisition, because acquisition on an onboarding that drops most of its signups means paying CAC twice for every customer who survives. Measure activation on the last three cohorts as the share of new subscribers who hit your activation event within 30 days of signup, then find the single step where the drop is largest — usually data import, workspace setup, or the first integration. Fix that one step, then re-measure on the next closed cohort rather than on the blended base, because blended activation hides exactly the cohort defect you are looking for.',
          alsoMoves:
            'Activation is the strongest predictor of ninety-day retention, so fixing it raises GRR inside the same quarter — the accounts you keep stop leaking earlier — which lifts NRR and the Quick Ratio through the same mechanism. It also shortens CAC payback, because payback is measured against revenue that actually arrives rather than against contracts that were signed and never used.',
          backfire:
            'Activation can be raised by narrowing who you let in: the easiest segment always activates fastest, so net MoM growth falls as the top of the funnel shrinks, and you can hide the damage by redefining what activation means — the looser the event, the better the number and the shorter the runway. The other version is optimising a proxy event (three logins, one dashboard view) instead of a value event (a workflow running end to end): the metric improves, retention does not, and you will not know for two quarters.',
        },
        {
          priority: 4,
          metric: 'CAC payback months and the SaaS Quick Ratio — the gate on spending more',
          fixFirst:
            'Treat this row as a gate rather than a target. If CAC payback is above 18 months, no amount of funnel optimisation rescues the unit economics, so check gross margin first — below 70% gross margin, no acquisition fix survives — and then repair payback with the two levers that change its numerator and denominator together: churn (row 1) and expansion mix (row 2). Only when payback is under 12 months and the Quick Ratio is above 4 should you run the benchmark page\'s test of raising paid spend 20% over 30 days.',
          alsoMoves:
            'A Quick Ratio above 4 is the precondition for the marginal-spend test on the benchmark page: it tells you that a new dollar of paid spend is replacing more than four dollars of churned and contracted MRR, which is what makes a growth experiment safe to run. Good payback also shortens the window in which your cash is tied up, which raises what a buyer will pay, and it gives the board a clean answer to whether the next dollar should go to acquisition or to product.',
          backfire:
            'Improving payback by cutting acquisition inside a stage whose band is 7-10% net MoM growth trades efficiency for scale: the ratio improves, the company shrinks, and at the next raise you are asked to explain a shrinking top line with a healthy ratio. The other version is buying faster payback with worse customers — discounting, marketplaces and channel partnerships shorten the cycle but pull NDR down, so net new MRR rises while the base becomes less valuable, which is exactly the trade that shows up as a lower multiple at the next round.',
        },
        {
          priority: 5,
          metric: 'Net MoM growth rate against the stage band — the output, not the input',
          fixFirst:
            'This is the row you repair last, by repairing its inputs. Use the stage band to set the target rather than to set the effort: 15-20% net MoM while validating under USD 1K MRR, 7-10% at USD 1K-10K MRR, 5-7% at USD 10K-100K MRR, and 3-5% above USD 100K MRR. Before you spend to close the gap, check the ceiling: at 4% monthly churn and USD 3K of net new MRR a month, MRR approaches roughly USD 75K no matter how the acquisition budget is set, so no spend plan gets past it.',
          alsoMoves:
            'This is where the four repairs above show up as a number, and it is the number the twelve-month projection in Step 3 has to reproduce. Re-run that projection after each repair and the ordering becomes verifiable rather than arguable: if the projection does not move, the repair did not actually change the underlying flow, whatever the dashboard says.',
          backfire:
            'Buying the growth number with spend is the most direct and the most dangerous repair: a company at USD 50K MRR that chases the validation-stage target of 15% net MoM spends capital it does not have and buys growth it cannot service, and the downside test in Step 6 — minus 20% growth with 2 percentage points more churn — is what exposes it. Cutting discretionary spend to protect a growth target is the mirror failure: it removes exactly the onboarding, support and expansion work that rows one to three depend on, so growth falls two quarters later anyway, with less cash to meet it.',
        },
      ],
    },
    zh: {
      intro:
        '增长会在流失率说的地方停住。流失恒定时，MRR 渐近逼近「新 MRR ÷ 月流失率」，所以一家每月新增 3 万美元新 MRR、月流失 3% 的公司，无论买多少新 logo，都越不过大约 100 万美元的 MRR —— 每 1 个百分点的流失，都是从你终将到达的生意规模里扣掉的，在这条天花板之上做的修复都是租来的。扩展排第二，因为它是唯一一种不需要新增销售投入就能落地的收入；激活排第三，因为它决定你即将花掉的获客钱能不能扛住真实客户；增长率本身排最后，因为它是产出，是被上面几行修出来的，不是靠买广告挪动曲线出来的。口径固定：MRR 指美元计价的月度经常性收入，取期初就存在的那批封闭队列；NRR 在董事会口径下用滚动 12 个月 MRR，在运营口径下用单个封闭自然月，两种口径绝不混用；CAC 回本是 CAC 除以新 MRR 产生的毛利，单位为月。',
      rows: [
        {
          priority: 1,
          metric: '月度客户流失率与 GRR —— 每月从存量基座漏掉的收入',
          fixFirst:
            '在再花一分钱获客之前先修流失，因为流失是增长天花板的除数：月度流失恒定时，MRR 会渐近逼近「新 MRR ÷ 月流失率」，所以在 3% 月流失下，一家每月新增 3 万美元新 MRR 的公司，无论买进多少客户，MRR 都永远逼近 100 万美元封顶。修的是账户级原因，不是总数：把过去 3 个封闭月的流失 MRR 从计费系统拉出来，按原因拆开——冠军用户离职、用例结束、团队缩编、便宜档位刚好够用——先修占比最大的那一桶，而它通常是第一 90 天的 onboarding，不是价格。验证方式：下一个封闭月，对着期初就存在的那批封闭队列算，而不是对着本月总 MRR 算。',
          alsoMoves:
            '它会同时带动三件事。流失 MRR 落在 Quick Ratio 的分母上，所以流失率下降会机械地抬高这个比值，不需要动任何获客动作。NRR 会跟着回来，因为 GRR 是 NRR 的地板——你不可能靠花钱在一个正在缩小的基座上刷出健康留存。而下面每一行的修复成果，都要乘在你保住的基座上：同样 1 万美元的净新增 MRR，在 10 万美元 MRR 的公司里推动力是在 5 万美元公司里的两倍，这就是留存是整个模型里最高杠杆变量的原因。修流失的收益因此是后面所有修复的乘数，而不是并列的一项。',
          backfire:
            '修流失有两种会变成别的伤的方式。其一是用折扣把流失买回来——客户留下，流失率这一季变好，但账户被永久锚在更低的价格上，NRR 与 ARPU 双降，Quick Ratio 的改善远小于流失率表面显示的幅度。更隐蔽的一版是砍掉本可以防止流失的支持与 onboarding 容量：流失事件这个季度确实减少了，因为没人再问；留下来的那批客户却变得不健康，在下一次续约时集中流失，NRR 的损失大于流失修复带来的收益。',
        },
        {
          priority: 2,
          metric: '扩展 MRR —— 扩展占净新增 MRR 的比例，以及 NRR 与 GRR 的缺口',
          fixFirst:
            '毛留存守住之后再动扩展，因为在一个正在漏水的基座上做扩展，等于把同一笔钱花两遍——一遍买增长，一遍补漏掉的存量。挑一个扩展动作跑满一个季度：用量卡住了就做席位增长，你已经拥有客户需要的第二个用例就做交叉销售，价值已经被证明再做提价。目标定在扩展占净新增 MRR 的 25%，也就是指南里用来把 NRR 推进顶尖区间的那条线；一个季度只跑一个来源，结果才读得懂。',
          alsoMoves:
            '扩展是唯一一种「不需要配一个销售」就能落地的收入，于是 NRR 与 CAC 回本第一次朝同一个方向动：支出不变而净新增 ARR 上升，回本周期自然缩短，哪怕你的获客预算一分没加。扩展发生在你已经服务过的账户里，交付成本接近你的边际成本，因此它还会带动 40 法则，将来也会带动收购方愿意付的倍数。它也是唯一一种不靠新增销售就能把 MRR 基座做大的收入，因此在漏斗吃紧时，它是少数还能自己长出来的部分。',
          backfire:
            '在弱基座上强推扩展，是先记收入、两个季度后补流失的经典：客户团队用不上的席位下限、适配度差的交叉销售、落在本就脆弱账户上的提价，都会先表现为 NRR 变好、随后是续约潮；而这些客户是期中才进来的，压根不会出现在你复核过的那批队列里。还有第二个版本：扩展按毛口径记账（免费席位、上手额度、打了折的多年期套餐）能把扩展这行数字抬上去却抬不动净 ARPU，NRR 变好而经济性变差。',
        },
        {
          priority: 3,
          metric: '激活率 —— 新订阅者在 30 天内到达首次价值点的比例',
          fixFirst:
            '在加更多获客预算之前先修激活，因为在一个把大多数注册用户都漏掉的 onboarding 上买流量，等于为每一个活下来的客户付两次 CAC。用最近三批队列量激活——新订阅者中 30 天内触发你定义的激活事件的比例——然后找出掉得最狠的那一步，通常是数据导入、工作区初始化或第一次集成。只修这一步，并在下一批封闭队列上复量，不要用混合口径，因为混合激活率恰好会掩盖你要找的那个队列缺陷。',
          alsoMoves:
            '激活率是 90 天留存的最强预测项，所以修好它会在同一个季度抬高 GRR——被留下的账户更早停止漏损——于是 NRR 与 Quick Ratio 走的是同一条机制。回本周期也会缩短，因为回本是拿真正到账的收回来除的，不是拿签了约却从没被用过的合同来除。它也是少数几处「改一次、后面每个季度都受益」的修复：onboarding 改好之后，新进来的每一批客户都在同一个漏斗里被筛过一遍，不需要重复投资。',
          backfire:
            '激活率可以靠「只放容易的人进来」来抬高：最容易的那一段激活总是最快，于是净 MoM 增长会因为入口收窄而下滑，而且你还能靠重新定义「激活」把损伤藏起来——事件定义越松，数字越好看，跑道越短。另一个版本是把代理事件（登录三次、看过一次看板）当成价值事件（一条工作流真正跑通）来优化：指标改善，留存没动，两个季度后你才会知道。',
        },
        {
          priority:4,
          metric: 'CAC 回本月数与 SaaS Quick Ratio —— 加投之前的闸门',
          fixFirst:
            '这一行是闸门，不是目标。如果 CAC 回本超过 18 个月，再怎么优化漏斗也救不回单位经济学，所以先看毛利率——毛利率低于 70% 时，任何获客端的修复都活不下来——然后用能同时改分子和分母的两个杠杆去修回本：流失（第 1 行）与扩展占比（第 2 行）。只有当回本压到 12 个月以内、Quick Ratio 站上 4 以后，才值得跑基准页那个测试：30 天内把付费投放提高 20%。',
          alsoMoves:
            'Quick Ratio 高于 4，正是基准页里「边际加投测试」的前置条件：它告诉你新增的 1 美元付费投放能替代超过 4 美元的流失与降级 MRR，这才是敢做增长实验的前提。回本漂亮也会缩短现金被占住的时间窗口，从而抬高买家愿意付的倍数，还能在董事会上干净地回答下一个问题：这 1 美元该给获客还是给产品。它同时是压力期里唯一敢用的扩量开关：先有比值，再有加投，没有比值的加投只是把亏损速度提上去而已。',
          backfire:
            '靠砍获客来改善回本，会在你增长带要求 7-10% 净 MoM 的阶段，用效率换规模：比值变好，公司却在缩；到下一轮融资，你要解释的是一条下滑的收入曲线加一个健康的比值。另一个版本是用更差的客户买更快的回本——打折、平台市场、渠道合作能缩短周期，但会把 NDR 拉低，于是净新增 MRR 上升而基座贬值，正是下一轮倍数被压的那笔交易。',
        },
        {
          priority: 5,
          metric: '净 MoM 增长率对阶段带 —— 这是产出，不是输入',
          fixFirst:
            '这一行最后修，而且靠修上面几行来修。用阶段带来定目标，而不是用目标来定力气：验证期（MRR 低于 1 千美元）追 15-20% 净 MoM，早期（1 千-1 万美元）7-10%，规模化期（1 万-10 万美元）5-7%，增长期（超过 10 万美元）3-5%。但在花钱填差距之前先看天花板：月流失 4%、每月净新增 MRR 3 千美元时，MRR 会逼近 7.5 万美元就停住，获客预算怎么设都过不去。',
          alsoMoves:
            '这是前四行修复成果显形的地方，也是 Step 3 的 12 个月投影必须复现的数字。每修一行就重跑一次投影，顺序就从「有争议」变成「可验证」：如果投影没动，说明这次修复并没有真的改变流量本身，无论仪表盘怎么说。反过来，如果投影动了而实测没动，那说明改动落在了你还没量到的那一段——这就是为什么这一行必须最后看：它是前四行修复的验收面，而不是第五条待办。',
          backfire:
            '用花钱买增长数字，是最直接也最危险的一种修法：一家 5 万美元 MRR 的公司去追验证期的 15% 净 MoM，等于花掉自己没有的现金去买自己服务不了的增长，而 Step 6 的下行情景（增长 −20%、流失 +2pp）就是照出这件事的镜子。为了保住增长目标而砍非必要支出则是镜像失败：砍掉的恰恰是第 1-3 行依赖的 onboarding、支持与扩展投入，于是两个季度后增长照样掉，而且手里少了一半现金去接住它。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Churn comes first in this checklist because it is the denominator of the growth ceiling, and every later line is measured on a base that the earlier line establishes: an NRR you compute over a blended twelve-month and one-month window proves nothing, and a CAC payback check against a spend figure that excluded sales salaries is not a check at all. Every line names the number that must hold and the step where you are stuck when it does not, and the arithmetic is deliberately conservative so that a company with no cohort discipline still knows where it is not allowed to continue. Three numbers stay separate on purpose: net new MRR as the operational signal, NRR as the retention signal, and CAC payback as the efficiency signal, because a single blended growth target lets a churn problem hide inside an acquisition win.',
      items: [
        {
          step: 1,
          label: 'Step 1 — MRR decomposed into its five components, with NRR and Quick Ratio read first',
          gate:
            'The last three closed months reconcile: New MRR + Expansion MRR + Reactivation MRR − Contraction MRR − Churned MRR equals the change in total MRR within 1% in each month, and rolling twelve-month NRR plus this month\'s Quick Ratio have already been computed from those same figures.',
          blockIf:
            'If the waterfall does not reconcile, every later step is measured against a wrong base: the stage diagnosis uses the wrong denominator, the What-If branches change the wrong variable, and the twelve-month projection is built on a flow that never happened. Churned MRR is the dangerous one, because it is simultaneously the Quick Ratio denominator and the divisor of the growth ceiling — miscount it and you believe you are fixing growth while you are actually repairing a line that does not exist.',
        },
        {
          step: 2,
          label: 'Step 2 — Stage diagnosed from MRR scale, and the growth target matched to that band',
          gate:
            'The company is placed in exactly one of the four bands (validation under USD 1K MRR, early traction USD 1K-10K, scaling USD 10K-100K, growth above USD 100K) and the quarterly target sits inside that band\'s net MoM growth range of 15-20%, 7-10%, 5-7% or 3-5%.',
          blockIf:
            'A wrong stage makes the whole programme mis-aimed. A company at USD 2K MRR chasing 15% net MoM is using a validation-stage growth rate to hide a missing product-market-fit signal, and a company at USD 50K MRR chasing 15% is spending cash on a number its stage cannot buy. Set the band first, and only then decide whether the fix is activation or expansion.',
        },
        {
          step: 3,
          label: 'Step 3 — Twelve-month projection built, with all four scenarios bracketing the range',
          gate:
            'Conservative, Current Pace, Aggressive and Hyper-Growth are all run, each scenario ends with a terminal MRR and a terminal cash balance rather than MRR alone, and the terminal cash balance at month 12 is above zero in at least the Conservative case.',
          blockIf:
            'A single-scenario projection is not a projection. The terminal cash balance is the only output that shows in advance which scenario leaves you broke in month nine, and terminal MRR cannot show that at all. Skip one scenario and you will plan the budget against the Hyper-Growth result as if it were a commitment, which turns the downside test in Step 6 into a surprise instead of a check.',
        },
        {
          step: 4,
          label: 'Step 4 — What-If branches run for churn, expansion and gross growth',
          gate:
            'Three branches are modelled — churn minus 1 percentage point, expansion at 25% of net new MRR, and gross growth plus 2 percentage points — each with its own terminal MRR and net new MRR, and the churn branch moves terminal MRR by at least twice as much as the gross-growth branch.',
          blockIf:
            'If the churn branch does not beat the gross-growth branch by roughly two to three times, your churn estimate is optimistic — usually because the denominator is wrong or because reactivation is being counted as retention. Acting on that comparison mis-sets the quarterly targets in Step 5 and the stress test in Step 6, because both are built on the same inflated churn number.',
        },
        {
          step: 5,
          label: 'Step 5 — Three quarterly targets set, each with a number and a weekly owner',
          gate:
            'Three targets are written as numbers with a baseline and a weekly review: net new MRR in USD per month, rolling twelve-month NRR with a target at or above 105% as the healthy floor, and CAC payback with a target at or below 12 months.',
          blockIf:
            'One target is not enough to survive a pressure period. With only MRR growth on the dashboard, the first thing cut under stress is exactly the expansion and onboarding spend that produces NRR a quarter later — so retention collapses and growth collapses with it. The three targets map to operating, retention and efficiency, and dropping any one of them removes a whole dimension of judgement.',
        },
        {
          step: 6,
          label: 'Step 6 — Downside stress test run, with a runway threshold attached',
          gate:
            'The same projection is run with minus 20% growth and plus 2 percentage points of churn simultaneously, and the result carries a written decision: runway at or above 12 months means continue, below 12 months means raise now or cut discretionary spend this month.',
          blockIf:
            'Reach the runway breach without a decision attached and the decision gets made for you at the next board meeting, in the worst possible conditions. The subtler failure is testing one variable at a time: churn rising and growth slowing are the same event, so modelling minus 20% growth alone overstates your cash balance and makes the trigger fire late.',
        },
      ],
    },
    zh: {
      intro:
        '流失排在第一位，因为它是增长天花板的除数，后面每一条线又都建立在前一条线造出来的基数上：用滚动 12 个月和单个自然月混算出来的 NRR 证明不了任何事，用没算销售薪资的支出口径去核 CAC 回本也不是在核。每一条都写明要成立的那个数，以及它不成立时你卡在哪一步；数字刻意保守，让还没有队列纪律的公司知道自己被允许走到哪里。三个信号刻意分开：净新增 MRR 是运营信号，NRR 是留存信号，CAC 回本是效率信号 —— 只盯一个混合增长率，流失问题会藏在获客成绩里。',
      items: [
        {
          step: 1,
          label: '步骤 1 —— MRR 拆成五个分量，NRR 与 Quick Ratio 先读',
          gate:
            '过去 3 个封闭月对平：新 MRR + 扩展 MRR + 重新激活 MRR − 降级 MRR − 流失 MRR 等于总 MRR 的变动，每月误差 ≤ 1%，并且已经用同一套数算出滚动 12 个月 NRR 与本月 Quick Ratio。',
          blockIf:
            '瀑布流对不平，后面每一步都建立在错误的基数上：阶段判断用错分母，What-If 分支改错变量，12 个月投影建在一条根本没发生过的流量上。尤其危险的是流失 MRR——它同时是 Quick Ratio 的分母和增长天花板的除数，量错了，你会以为自己在修增长，其实在修一条不存在的线。',
        },
        {
          step: 2,
          label: '步骤 2 —— 按 MRR 规模定位阶段，并把增长目标映射到该阶段带',
          gate:
            '公司已被放进四档中的恰好一档（验证期 MRR 低于 1 千美元、早期 1 千-1 万、规模化 1 万-10 万、增长期高于 10 万），季度目标落在该档对应的净 MoM 增长带内（15-20% / 7-10% / 5-7% / 3-5%）。',
          blockIf:
            '阶段错位会让整个计划打偏。2 千美元 MRR 的公司去追 15% 净 MoM，是拿验证期的增长率掩盖 PMF 信号缺失；5 万美元 MRR 的公司去追 15%，则是拿现金去买这个阶段买不到的数。先定档，才知道该修激活还是该修扩展。',
        },
        {
          step: 3,
          label: '步骤 3 —— 建 12 个月投影，四档场景框出真实区间',
          gate:
            '保守 / 当前节奏 / 激进 / 超速增长四档全部跑完，每一档都给出期末 MRR 与期末现金余额（不只给 MRR），且至少在保守档里期末现金余额大于 0。',
          blockIf:
            '只跑一档等于没跑。期末现金余额是唯一能提前看见「哪一档会在第 9 个月让你没钱」的输出，期末 MRR 看不见这个。少跑一档，你会把超速增长档的结果当成承诺去排预算，于是 Step 6 的压力测试不是检查，而是意外。',
        },
        {
          step: 4,
          label: '步骤 4 —— What-If 分支：流失、扩展、毛增各跑一次',
          gate:
            '三条分支都建模——流失 −1pp、扩展占净新增 MRR 的 25%、毛增 +2pp——每条各自给出期末 MRR 与净新增 MRR，且流失分支带来的期末 MRR 变动 ≥ 毛增分支的 2 倍。',
          blockIf:
            '如果流失分支的收益达不到毛增分支的 2 倍，你的流失估计偏乐观——多半是分母用错，或把重新激活当成了留存。拿这个比较去决策，会同时误导 Step 5 的目标设定和 Step 6 的压力测试，因为两者都建立在同一个被吹大的流失数上。',
        },
        {
          step: 5,
          label: '步骤 5 —— 三个季度目标都写成数字，各有基线与周度责任人',
          gate:
            '三个目标都写成数值并带基线与周度复盘安排：净新增 MRR（美元/月）、滚动 12 个月 NRR（目标 ≥ 105%，即健康区下限）、CAC 回本（目标 ≤ 12 个月）。',
          blockIf:
            '只设一个目标就扛不过压力期。仪表盘上只有 MRR 增速，压力一来最先被砍的往往正是产出未来 NRR 的扩展与 onboarding 投入，于是留存塌了、增速跟着一起塌。三个目标分别对应运营、留存、效率三个信号，少一个就少一维判断力。',
        },
        {
          step: 6,
          label: '步骤 6 —— 下行情景压力测试，并挂上跑道阈值',
          gate:
            '同一套投影里同时跑 −20% 增长与 +2pp 流失，结果已挂上书面结论：跑道 ≥ 12 个月则继续，跌破 12 个月则本月就融资或砍非必要支出。',
          blockIf:
            '跑道已经破了却没有附带决定权，决定就会在下次董事会被动地变成坏消息。更隐蔽的错法是一次只测一个变量：流失上行和增长下滑本来就是同一件事，单跑 −20% 增长会高估现金余额，让触发器迟到才响。',
        },
      ],
    },
  },
};
