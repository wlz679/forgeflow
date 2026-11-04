// P166 —— C 类（Valuation & Exit）主题「unit-economics-optimization」的新形态内容。
//
// 与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选与你的阶段匹配的一行 → 算四个复合比 → 决定是否继续投钱
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序算）
//   · 本文件 fixPriority = 五个单位经济指标同时不达标时，先修哪个 → 它顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」（howToApply 只说做什么，不说什么算达标）
//
// 口径纪律（本主题讲的是用户自己的经营阈值，不是随定价 bot 漂移的市场价 ⇒ 允许写金额）：
//   金额一律以 USD 计价并写明口径，形状是 "USD 300-1,500 per customer" 这类
//   「区间 + 分母 + 期间」的结构，不写成裸 "$300" —— 读者要能看出这个数是
//   每客户每月还是每客户一年、含不含销售成本、算的是哪个季度。
//   百分比一律注明分母：毛利率除以 ACV、回本除以月 ARPU、LTV:CAC 的分子是群组毛利现值。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A respectable LTV to CAC ratio can hide a payback problem, so margin is checked before acquisition cost: unit gross profit per customer per month decides how fast CAC comes back, and a business under 60% gross margin cannot earn its way out of a stretched payback. CAC must be fully loaded and from one closed quarter.',
      rows: [
        {
          priority: 1,
          metric: 'Unit-level gross margin — gross profit per customer per month ÷ ACV (target 70-85%)',
          fixFirst:
            'Fix unit-level gross margin first, because it is the multiplier every other ratio runs through and because it is the only metric on this table that is a property of your product and your infrastructure rather than of your go-to-market. Compute it per customer per month as (ACV minus COGS, hosting, support, payment fees and allocated customer success) divided by ACV, and then decompose the gap: split hosting from support from payment fees from the cost you serve the smallest tier with, because each has a different owner and a different fix. A support cost that scales with tickets is a product problem; a payment fee that scales with transaction volume is a pricing or payment-method problem. Verify by recomputing the margin for the smallest customer cohort separately — the blended margin hides tier losses that the segment view exposes.',
          alsoMoves:
            'Margin repair moves three metrics without touching acquisition or retention. Payback months fall immediately, because the formula divides CAC by monthly ARPU times gross margin, so one point of margin is worth more to payback than one point of CAC. Cohort LTV rises with it, because LTV is a sum of gross profit contributions over the cohort lifetime — a margin gain is multiplied by the number of months the cohort is observed for, while a CAC gain is counted once. And the Magic Number improves for a different reason: net new ARR over prior-quarter S&M gets a smaller denominator when revenue is not being eaten by COGS, so the same spending looks more efficient at the revenue line and at the margin line at the same time.',
          backfire:
            'Margin repair backfires when it is achieved by degrading the service that produced the revenue. Cutting support headcount lifts the margin this quarter and lands the churn two quarters later, and because LTV is cohort-actual, the cohorts you are measuring during the fix are still the old ones — so the model will not show the damage until the cohorts you damaged have renewed. Moving revenue into a cheaper tier to lift the blended margin is the same trap in a different costume: the blended number rises while the tier that was paying gets worse, and the tier mix eventually shows up in the CAC number because the displaced customers cost more to acquire. And margin measured against a reclassified cost base is not a repair at all, it is a reclassification.',
        },
        {
          priority: 2,
          metric: 'Fully-loaded CAC — one closed quarter of S&M spend ÷ new paying customers acquired',
          fixFirst:
            'Fix fully-loaded CAC second, after the margin is known, because CAC is the divisor in both payback and LTV:CAC and because it is the metric most often computed in a way that flatters itself. Rebuild it from the finance ledger for one closed quarter: paid media, sales salaries, SDR and BDR commissions, marketing tools, content production and allocated overhead, divided by new paying customers acquired in that same quarter, excluding expansion revenue and reactivation. The two usual errors are excluding sales salaries and commissions (which understates CAC by 30-50% in an enterprise motion) and counting reactivated customers as new. Verify by checking that the numerator and the denominator come from the same closed quarter and that the customer count is the one the CRM calls new logo.',
          alsoMoves:
            'A correct CAC moves payback and LTV:CAC in the same direction, which is what makes it the right second move: the two ratios you would otherwise read as independent opinions are both moving because of one denominator correction. It also sets the ceiling on how much you can spend: with a real CAC, the marketing budget becomes a decision with a stated payback rather than a percentage of a plan. And it changes how you read churn — churn that is cheap to fix is worth more when the replacement cost is a real CAC, and churn that is expensive to replace stops looking like a retention problem and starts looking like an acquisition problem.',
          backfire:
            'CAC repair backfires in two common shapes. The first is cutting the top of the funnel to make the ratio look better while the pipeline goes dry: CAC falls because volume fell, and six months later there is no cohort left to compute an LTV for, so the metric you improved destroyed the input to the metric two rows below. The second is attributing spend to the wrong period — spending two quarters of acquisition cost against one quarter of customers gives a spectacularly low CAC that reverses as soon as the cohort is billed. And a CAC cut that comes from buying lower-intent traffic shows up first as a drop in conversion rate, so if you only track CAC you will celebrate it before the pipeline metric tells you it was a mistake.',
        },
        {
          priority: 3,
          metric: 'CAC payback months — CAC ÷ (monthly ARPU × unit-level gross margin %) (target 5-12 months)',
          fixFirst:
            'Fix payback third, because it is the cash gate: the number that tells you how long the company funds a customer before that customer pays back, and therefore how long you can keep spending without a financing event. Compute it from the two numbers above — CAC divided by monthly ARPU times unit-level gross margin — and then split it into its two drivers, because the fix is completely different depending on which one dominates: if CAC dominates, the lever is acquisition efficiency; if ARPU or margin dominates, the lever is pricing, packaging or cost-to-serve. For a capital-efficient SaaS business the band is 5-12 months, and late-stage enterprise can carry 18-24 months but not beyond. Verify by recomputing payback for the cohort acquired in the quarter, not for the blended book, because a blended number mixes a young cohort that has not paid back yet with an old one that has.',
          alsoMoves:
            'Payback is where the three rows above turn into a cash statement, so it is the first metric that tells you whether the fixes are bankable. It bounds the amount of spend the business can carry: at a 9-month payback and a given contribution margin, the working capital tied up in a cohort is a fixed multiple of that cohort size, so improving payback raises the ceiling on how many new customers you can onboard before cash becomes the constraint. It also changes what LTV means to you, because LTV over CAC is only worth optimising when the cash arrives inside a horizon you can fund. And a short payback makes the Magic Number more useful, since revenue that recycles quickly is what lets the same spend be run again.',
          backfire:
            'Payback repair backfires when the improvement comes from pushing revenue into the future. Cutting the onboarding friction to shorten the measured payback, deferring annual prepay collection into monthly billing, or recognising a deal in month zero that actually lands in month three all shorten the payback period without shortening the cash cycle. The number then looks excellent while the bank balance gets worse, and the gap shows up in the Rule of 40 rather than in the payback line. The other version is shortening payback by dropping the tail: excluding enterprise customers with longer cycles from the blended average makes the ratio look better precisely because they are the customers that pay for the whole model.',
        },
        {
          priority: 4,
          metric: 'LTV:CAC on cohort-actual gross profit — cohort LTV ÷ CAC for that same cohort (SMB 3:1)',
          fixFirst:
            'Fix the cohort ratio fourth, because it is the only ratio on this table that needs history rather than a model, and it is the number that decides whether the business is worth funding. For each monthly cohort, sum the gross profit contributions observed over that cohort lifetime, discount them if you need a present value, and divide by the CAC that cohort was bought with — never by a projected lifetime, and never by the blended CAC across cohorts of different ages. The band is 3:1 or better for SMB and mid-market and 4:1 or better for enterprise, and below 1:1 every paid channel is destroying value and the response is to stop the spend, not to optimise it. Verify by checking that each cohort has at least 12 months of observation before it is judged, and by keeping the under-1:1 cohorts visible instead of blending them away.',
          alsoMoves:
            'The cohort ratio is where the retention lever finally lands. LTV is the sum of monthly gross profit, so a cohort that churns in month 4 instead of month 14 contributes a third of what it could, and because CAC is counted once per cohort, the ratio moves almost one for one with retention. That is why a churn improvement of 25% on a mature cohort can add more to LTV than the same percentage cut in CAC, and it is also why price increases feed the ratio differently: they lift the numerator immediately but raise churn with a lag, so the ratio can rise before it falls. Closing the ratio to its band is what lets you treat growth spend as investment rather than as a cost centre, which is what changes the Magic Number two rows down.',
          backfire:
            'The cohort ratio backfires when the cohort window is chosen to flatter the answer. Judging a cohort at 6 months when your payback is 12 months rewards churn because churned customers contribute little LTV while their CAC is already fully loaded, so a deteriorating business shows an improving ratio for exactly the length of the window. The other version is cohort blending: mixing a healthy cohort with a reactivation cohort, or switching how churn is classified at the boundary, moves the ratio without any customer changing behaviour. And buying growth by discounting the first year raises LTV:CAC mechanically at the cost of the margin in row 1, which is a ratio improvement made with the metric three rows above.',
        },
        {
          priority: 5,
          metric: 'Magic Number and Rule of 40 — net new ARR ÷ prior-quarter S&M, and growth % + margin %',
          fixFirst:
            'Treat the last row as the scoreboard, not as a target. Magic Number is net new ARR added this quarter divided by last quarter S&M spend, and the Rule of 40 is ARR growth percentage plus EBITDA or FCF margin percentage; read them monthly, but judge them only after the four rows above are trustworthy, because both are computed from numbers that the earlier rows own. When the Rule of 40 sits below 30 and the Magic Number below 0.5, the engine is buying sub-scale return, and the fix is one of pricing, retention or sales productivity — not more spend. Verify by reconciling net new ARR to the billing system, excluding expansion revenue that came from a price change you had already counted as a margin improvement.',
          alsoMoves:
            'This row converts the four fixes into a single decision about money: it is the number that tells a board whether the next dollar of S&M spend is returning more than a dollar of ARR within a year, and it is what makes the CAC and payback fixes financeable instead of merely correct. It also re-reads the rows above under growth: a business can hold a good LTV:CAC and a good payback while the Magic Number falls, because growth stalled, and in that case the problem is volume rather than efficiency — a completely different repair order. And because ARR growth and margin percentage are the two terms of the Rule of 40, improving either one without the other can leave the score unchanged, which is the clearest signal that you fixed the wrong variable.',
          backfire:
            'Optimising the scoreboard backfires in the direction of deferred cost and early revenue. Holding the Rule of 40 by slowing hiring pushes payroll into the next period and flatters EBITDA margin, while the sales capacity that was not hired shows up two quarters later as a slower Magic Number. Pulling ARR forward with annual prepay deals inflates net new ARR for the quarter and then produces a weak quarter after, so the annual review of this row needs to read the rolling four quarters rather than the quarter. And cutting S&M to improve the Magic Number denominator is the same mistake as cutting the top of the funnel two rows up: the ratio improves and the machine stops.',
        },
      ],
    },
    zh: {
      intro:
        'LTV:CAC 好看也可能藏着回本问题，所以先查单位级毛利率，再查获客成本：单客户单月毛利决定 CAC 多快回来，毛利率低于 60% 的生意撑不过被拉长的回本周期。CAC 要全负荷，并取单个封闭季度，否则季度末的一次性投放会把比率拉低。LTV 必须用群组实际毛利算——投影出来的生命周期经不起尽调。低于 1:1 就该停掉付费投放，这一层不过，后面的杠杆都白搭。扩展收入能抬 LTV，但抬不了回本；回本看的是当期毛利。',
      rows: [
        {
          priority: 1,
          metric: '单位级毛利率 —— 单客户单月毛利 ÷ ACV（目标 70-85%）',
          fixFirst:
            '先修单位级毛利率，因为它既是后面每个比率的乘数，也是这张表上唯一一个由你的产品和基础设施决定、而不是由市场团队决定的指标。按单客户单月算：ACV 减去 COGS、托管、支持、支付费和分摊客成，再除以 ACV；算完把缺口拆开——托管、支持、支付费、以及服务最小档位客户的成本分开看，因为每项归属不同、修法也不同。支持成本随工单量走是产品问题，支付费随交易额走是定价或支付方式问题。验证方式：单独重算最小客户群组的毛利率——混合毛利率会把分档亏损藏在里面，而分档视图会把它翻出来。',
          alsoMoves:
            '毛利率修好会同时动三个指标，而且不需要动获客和留存。回本月数立刻下降，因为公式是 CAC ÷（月 ARPU × 毛利率），这里一个点的毛利率对回本的贡献大于一个点的 CAC。群组 LTV 跟着涨，因为 LTV 是群组生命周期内毛利贡献的加总——毛利率的收益会被观察月数乘一遍，而 CAC 的收益只算一次。Magic Number 也从另一个方向变好：净新增 ARR 除以上季 S&M，分子没被 COGS 吃掉，同样的花在收入行和毛利行上同时显得更有效率。',
          backfire:
            '毛利率修复的反噬，是靠损伤创造收入的那些服务把它修上去的。砍支持人力，本季度毛利率上升、两个季度后流失落地，而 LTV 用的是群组实际值，你修复期间看的还是旧群组，所以模型要等被你伤到的那批人续约才会显示问题。把收入挪进更便宜的档位来抬高混合毛利率是同一个陷阱换了个马甲：混合数上去了，付费档位变差了，而客群结构最终会体现在 CAC 上——被挤走的客户更难获客。另外，按重新分类的成本口径算出来的毛利率不是修复，只是换个名目记账。',
        },
        {
          priority: 2,
          metric: '全负荷 CAC —— 单个封闭季度 S&M 支出 ÷ 该季度新增付费客户',
          fixFirst:
            '毛利率清楚之后修全负荷 CAC，因为它是回本和 LTV:CAC 共同的分母，也因为它是最常被算得对自己有利的那个指标。从财务账上按一个封闭季度重建：付费媒体、销售工资、SDR/BDR 佣金、营销工具、内容制作、分摊管理费，除以同一季度新增的付费客户，不含扩展收入与重新激活。两个常见错误是漏掉销售工资和佣金（企业销售动线下 CAC 会因此少算 30-50%），以及把重新激活的客户算成新客。验证方式：确认分子分母来自同一个封闭季度，客户数用的是 CRM 口径里的 new logo。',
          alsoMoves:
            '算对的 CAC 会让回本和 LTV:CAC 往同一个方向动，这正是它适合排第二的原因：你原本读成两个独立意见的比率，其实是同一个分母被修正的结果。它同时给支出设了上限：有了真实的 CAC，市场预算就从「按计划的一个百分比」变成一个带明确回本期数的决策。它还会改变你对流失的读法——当替换成本是一个真实的 CAC 时，修复成本低的流失值得修，而替换成本高的流失就不再是留存问题，而是获客问题。',
          backfire:
            'CAC 修复有两种常见反噬。第一种是砍漏斗顶端让比值变好、而管道枯了：CAC 因为量掉了而下降，六个月后已经没有群组可以算 LTV，于是你改进的那个指标毁掉了下面两行那个指标的输入。第二种是归期错配——两个季度的获客成本压在同一个季度的客户上，CAC 会低得惊人，等群组开始计费就立刻反转。而靠买更浅意图流量得来的 CAC 下降，最先体现在转化率上：只盯 CAC 的人会先庆祝，之后才由管道指标告诉你这是个错误。',
        },
        {
          priority: 3,
          metric: 'CAC 回本月数 —— CAC ÷（月 ARPU × 单位级毛利率%）（目标 5-12 个月）',
          fixFirst:
            '第三步修回本，因为它是一道现金闸门：告诉你一个客户在被自己付清之前，公司要先垫多久，也因此决定你还能撑多久才需要一次融资。用上面两个数算——CAC 除以月 ARPU 乘单位级毛利率——然后把它拆成两个驱动因素，因为哪个占主导决定修法完全不同：CAC 占主导就修获客效率，ARPU 或毛利率占主导就修定价、打包或服务成本。资本效率型 SaaS 的区间是 5-12 个月，晚期大客户可以扛 18-24 个月但不能超过。验证方式：按当季获客群组重算，不要用全量混合，因为混合数把还没回本的新群组和早已回本的旧群组混在一起。',
          alsoMoves:
            '回本把上面三行换算成现金表，所以它是第一个告诉你这些修复能不能被融资的指标。它给业务的承压能力设了界：9 个月回本配上某个贡献毛利率，一批客户的在途资金就是那批客户规模的固定倍数，所以回本越好，能同时 onboard 的新客户数越高，直到现金变成约束。它还改变了你怎么理解 LTV：只有在你能出资的时间窗内收回来的钱，才值得用 LTV/CAC 去优化。而且回本短，Magic Number 才更有用，因为收得回来的钱才跑得动第二圈。',
          backfire:
            '回本修复的反噬，是把收入推向未来。用「缩短回本」的名义削 onboarding 摩擦、把年付预收挪成月付、或者把实际落在第三个月的单子记在第零个月，数字都会变好看，现金周期却没变短。于是回本极漂亮、账户余额更差，缺口最终出现在 40 法则上，而不是回本这一行。另一个版本是把长尾切掉：把周期更长的大客户从平均值里剔出去，比值立刻变好，而被剔掉的恰恰是付清整个模型的那类客户。',
        },
        {
          priority: 4,
          metric: '群组实际 LTV:CAC —— 群组 LTV ÷ 该群组自己的 CAC（SMB 目标 3:1）',
          fixFirst:
            '第四步修群组比值，因为它是这张表上唯一需要历史而不是模型的比率，也是决定这门生意值不值得投钱的那个数。每个月度群组，把观察到的生命周期内的毛利贡献加总（需要现值就折现），除以买下这个群组时用的 CAC——绝不用预测的 LTV，也绝不用不同账龄群组的混合 CAC。区间是 SMB 与中端 3:1 以上、大客户 4:1 以上；低于 1:1 时每个付费渠道都在毁灭价值，反应是停投而不是优化。验证方式：每个群组至少观察满 12 个月再判定，并且把低于 1:1 的群组单独摆出来，不要混掉。',
          alsoMoves:
            '群组比值是留存杠杆最终落地的地方。LTV 是每月毛利的加总，所以活到第 14 个月的群组如果第 4 个月就流失，只贡献了本可以做到的三分之一，而 CAC 每个群组只记一次，于是比值几乎跟着留存一比一地动。这就是为什么一个成熟群组流失率降 25% 对 LTV 的贡献，可能大于 CAC 砍同样的百分比；也是为什么涨价喂给这个比率的方式不一样：它立刻抬分子、却滞后地推高流失，所以比值会先涨后跌。把比值拉回区间，才谈得上把增长支出当投资而不是当成本中心，这也决定了下面那行的 Magic Number。',
          backfire:
            '群组比值的反噬，是拿观察窗口的选取来讨好答案。回本 12 个月的业务，用 6 个月窗口判定，等于奖励流失——流失客户几乎不贡献 LTV，而它们的 CAC 已经全额计过，于是一个正在恶化的业务反而会在窗口期内显示出更好的比值。另一个版本是群组混算：把健康群组和重新激活群组混在一起，或者改一改流失的分类口径，比值就会动，而客户行为一点没变。用首年折扣买增长则是在用上面第一行的毛利率换 LTV:CAC——这个比值的改善是从三行之外借来的。',
        },
        {
          priority: 5,
          metric: 'Magic Number 与 40 法则 —— 净新增 ARR ÷ 上季 S&M，以及增长率% + 利润率%',
          fixFirst:
            '最后一行当记分牌看，不要当目标。Magic Number 是本季净新增 ARR 除以上季 S&M 支出，40 法则 ARR 增长率加 EBITDA 或 FCF 利润率；两者按月读，但只有在上面四行都可信之后才值得判断，因为它们用的都是前面几行拥有的数字。当 40 法则低于 30 且 Magic Number 低于 0.5 时，说明这套引擎在用次规模的回报买增长，修法是定价、留存或销售人效三选一，不是加预算。验证方式：把净新增 ARR 与计费系统对平，并且排除掉「涨价带来的扩展收入」——那部分你已经在毛利率里记过一次。',
          alsoMoves:
            '这一行把前面四个修复换算成一个关于钱的决定：它告诉董事会下一个美元的 S&M 能不能在一年内换回超过一个美元的 ARR，也是让 CAC 和回本这两项修复从「算得对」变成「融得到资」的关键。它还会在增长视角下重读上面几行：一家公司可以同时拥有不错的 LTV:CAC 和不错的回本，而 Magic Number 却在掉——那是增长停了，属于完全不同的修复顺序——而效率问题。由于 ARR 增长率与利润率是 40 法则的两项，只改进其中一项往往让总分不动，这正是你修错了变量的信号。',
          backfire:
            '优化记分牌的反噬，是把成本推后、把收入提前。为了撑住 40 法则而暂缓招人，等于把工资挪到下一期、让 EBITDA 利润率变漂亮，而少掉的销售产能两个季度后表现为更慢的 Magic Number。用年付预收把 ARR 拉到本季，会让当季净新增虚高、下一个季度偏弱，所以这一行的年度复盘必须读滚动四季，而不是单季。而砍 S&M 来改善分母，和上面第二行砍漏斗顶端是同一个错误：比值变好，机器停了。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Seven figures have to agree before unit economics mean anything. CAC comes from one closed quarter of spend divided by new paying customers, excluding expansion. Margin is per customer per month, payback months convert the pair into cash timing, and cohort-actual LTV over that cohort own CAC gives the ratio.',
      items: [
        {
          step: 1,
          label: 'Rebuild fully-loaded CAC from one closed quarter of spend and new customers',
          gate:
            'One closed quarter of spend is itemised as paid media, sales salaries, SDR and BDR commissions, marketing tools, content production and allocated overhead, divided by new paying customers in that same quarter; the result is a single USD figure such as USD 900-1,500 per new customer per quarter.',
          blockIf:
            'If any component is missing or the period does not match, every ratio downstream is wrong in a way that is invisible: CAC is the denominator in the payback months in step 3 and in the cohort ratio in step 4, so an understated CAC makes the business look faster and richer than it is, and the error does not show up anywhere until the finance reconciliation. The most common missing line is sales compensation, which understates CAC by 30-50% in an enterprise motion.',
        },
        {
          step: 2,
          label: 'Compute unit-level gross margin per customer per month',
          gate:
            'Gross margin per customer per month is (ACV minus COGS, hosting, support, payment fees and allocated customer success) divided by ACV, and it lands in the 70-85% band; each of the five cost lines is itemised separately, and the smallest customer tier is computed on its own.',
          blockIf:
            'Without the split by cost line you cannot assign the problem to an owner, and a single blended number hides tier losses: a blended margin of 72% can be a healthy mid-market book subsidised by a loss-making SMB tier, and the tier view is what exposes it. And a margin below 60% is not a rounding problem — it means every ratio above it is multiplied by a number that does not support the model, so steps 3 and 4 would be reporting on a business that cannot exist at that margin.',
        },
        {
          step: 3,
          label: 'Convert CAC and margin into CAC payback months',
          gate:
            'Payback months equals CAC divided by monthly ARPU times unit-level gross margin, computed for the cohort acquired in the quarter rather than for the blended book; the figure sits inside 5-12 months for capital-efficient SaaS, or 18-24 months for late-stage enterprise with a named expiry date.',
          blockIf:
            'A blended payback mixes a young cohort that has not paid back yet with an old one that has, so it always looks better than reality and always looks worse next quarter for the same reason. If payback exceeds the band, that is a funding fact rather than a modelling detail: it sets the ceiling on how much spend the working capital can carry, and continuing past the band without a financing plan means the constraint will reappear as a cash crisis rather than as a number on a page.',
        },
        {
          step: 4,
          label: 'Build cohort-actual LTV and divide by that cohort own CAC',
          gate:
            'For each monthly cohort, observed gross profit contributions over its lifetime are summed and divided by the CAC paid for that same cohort; each judged cohort has at least 12 months of observation, the ratio is 3:1 or better for SMB and mid-market and 4:1 or better for enterprise, and no cohort below 1:1 is blended away.',
          blockIf:
            'A cohort with less than 12 months of history cannot be judged, because churned customers contribute almost nothing to LTV while their CAC is fully loaded, so a short window systematically flatters a deteriorating business. And if a cohort under 1:1 is hidden inside the average, the business is spending money to acquire customers it loses money on, which no amount of optimisation elsewhere repairs — the response there is to stop the channel, not to tune it.',
        },
        {
          step: 5,
          label: 'Set per-tier LTV:CAC targets and a stop-spend rule',
          gate:
            'Written per-tier targets exist (3:1 for SMB and mid-market, 4:1 for enterprise), a hard stop rule is written for any tier measuring below 1:1, and the current measurement for each tier is recorded with the cohort month it came from.',
          blockIf:
            'Without a written stop rule, a channel that measures below 1:1 keeps running because stopping it feels like retreating, and the loss compounds monthly. Without per-tier targets, one blended ratio hides the fact that enterprise can justify a different multiple than SMB, so the business either over-invests in small accounts or under-invests in large ones, and both errors are invisible in the blended number you are steering by.',
        },
        {
          step: 6,
          label: 'Model the optimisation levers and rank them by NPV impact',
          gate:
            'Each lever (churn down 25%, price up 20%, CAC down 30%) is modelled against payback months and cohort LTV on the same base, each has a signed NPV effect, and the ranking names the top lever explicitly with the cohort month it was measured on.',
          blockIf:
            'If the levers are modelled on different bases, the ranking is an artefact of the inputs and the most expensive lever often wins by default, because it carries the largest percentage. And the three levers are not independent: a price increase lifts the numerator immediately and raises churn with a lag, so ranking them without a churn response produces a recommendation that reverses within two quarters — which is exactly why the churn lever has to be modelled at the same time.',
        },
        {
          step: 7,
          label: 'Compute the Magic Number and Rule of 40 monthly on reconciled ARR',
          gate:
            'The Magic Number (net new ARR this quarter divided by last quarter S&M spend) and the Rule of 40 (ARR growth percentage plus EBITDA or FCF margin percentage) are recomputed every month from ARR that reconciles to billing, with price-driven expansion excluded from net new ARR.',
          blockIf:
            'If net new ARR is not reconciled to the billing system, the scoreboard can be moved by recognition choices rather than by business performance: a price change, an annual prepay or a reclassified contract all land in net new ARR without a new customer. And reviewing this row on a single quarter instead of a rolling four quarters produces exactly the wrong conclusion, because a pulled-forward quarter is followed by a weak one and the two look like a trend.',
        },
      ],
    },
    zh: {
      intro:
        '单位经济成立之前，七个数得先彼此对得上，而算错的地方通常就出在它们之间。CAC 取单个封闭季度的 S&M 支出除以新增付费客户，不含扩展收入；毛利率按单客户单月算；回本月数把这两个数换算成现金节奏；LTV 用群组实际毛利除以该群组自己的 CAC。Magic Number 与 40 法则再把花钱这一环合上——它们按月算，ARR 要对平。分层目标（SMB 3:1、大客户 4:1）和停投规则要写在同一张纸上，每个杠杆按 NPV 影响排序，而不是按感觉。',
      items: [
        {
          step: 1,
          label: '用单个封闭季度重建全负荷 CAC，并核对该季度新增客户数',
          gate:
            '一个封闭季度的支出被拆成付费媒体、销售工资、SDR/BDR 佣金、营销工具、内容制作、分摊管理费，除以同一季度新增的付费客户；结果是一个明确的美元数，形状像「每新增客户每季度 900-1,500 美元」。',
          blockIf:
            '少了任何一项、或者期间对不齐，后面每一个比率都会以一种看不见的方式错掉：CAC 是步骤 3 回本月数和步骤 4 群组比值的分母，低估的 CAC 会让业务显得更快更富，而这个错误在财务对平之前不会出现在任何地方。最常漏的一行是销售薪酬，在企业销售动线下它会让 CAC 少算 30-50%。',
        },
        {
          step: 2,
          label: '算出单客户单月的单位级毛利率，并把 5 项成本逐条拆开',
          gate:
            '单客户单月毛利率 =（ACV − COGS − 托管 − 支持 − 支付费 − 分摊客成）÷ ACV，落在 70-85% 区间；五项成本各自单列，并且最小客户档位单独算一遍。',
          blockIf:
            '不按成本线拆开就没法把问题指派给具体负责人，而一个混合数字会把分档亏损藏起来：混合毛利率 72% 完全可能是中端健康、靠 SMB 档位倒贴换来的，只有分档视图能翻出来。而且毛利率低于 60% 不是四舍五入问题——它意味着上面每个比率都乘在一个撑不住模型的数上，步骤 3 和步骤 4 报出来的会是一家在这个毛利率下不存在的公司。',
        },
        {
          step: 3,
          label: '把 CAC 与毛利率换算成回本月数，并按当季群组重算',
          gate:
            '回本月数 = CAC ÷（月 ARPU × 单位级毛利率%），按当季获客群组计算而不是全量混合；资本效率型 SaaS 落在 5-12 个月，大客户 18-24 个月并写明到期日。',
          blockIf:
            '混合回本把还没回本的新群组和早已回本的旧群组混在一起，所以它总是比现实好看，下一季度又因为同样的原因更难看。如果回本超出区间，那是一个融资事实而不是建模细节：它决定了在途资金能扛多大支出，超区间还继续花钱而没有融资计划，意味着这个约束会以现金危机的形式而不是以纸面数字的形式回来。',
        },
        {
          step: 4,
          label: '用群组实际毛利算 LTV，并除以该群组自己的 CAC',
          gate:
            '每个月度群组把观察到的生命周期毛利贡献加总，除以买下这个群组时付的 CAC；被判定为成熟的群组观察期至少满 12 个月，SMB 与中端比值 3:1 以上、大客户 4:1 以上，且没有任何低于 1:1 的群组被混掉。',
          blockIf:
            '观察不足 12 个月的群组没法判定，因为流失客户几乎不贡献 LTV 而它们的 CAC 却已全额计入，短窗口会系统性地美化一个正在恶化的业务。而低于 1:1 的群组一旦被平均数藏起来，公司就在花钱买亏钱的客户，这件事靠别处优化是修不好的——那里的反应是关掉渠道，不是调参。',
        },
        {
          step: 5,
          label: '设定分档 LTV:CAC 目标与停投规则',
          gate:
            '存在写下来的分档目标（SMB 与中端 3:1、大客户 4:1），存在一条硬规则：任一档位低于 1:1 即停投，并且每个档位的当前测量值连同它来自哪个群组月份一起被记录。',
          blockIf:
            '没有写下来的停投规则，测出低于 1:1 的渠道会因为「停掉像是认输」而继续跑，亏损按月复利。没有分档目标，一个混合比值会掩盖「大客户可以接受不同倍数」这件事，于是公司要么在小客户上投过头，要么在大客户上投不足，而这两种错误在你据以决策的那个混合数字里都看不见。',
        },
        {
          step: 6,
          label: '建模各个优化杠杆，并按 NPV 影响排出先后顺序',
          gate:
            '每个杠杆（流失降 25%、涨价 20%、CAC 降 30%）在同一套基数上对回本月数与群组 LTV 建模，每个都有带符号的 NPV 影响，排序结果明确点名第一名杠杆，并写明它测自哪个群组月份。',
          blockIf:
            '如果杠杆建在不同基数上，排序就只是你动了哪个输入的产物，而最贵的那个杠杆往往因为百分比最大而默认胜出。三个杠杆并不独立：涨价立刻抬分子、滞后地推高流失，所以不给流失反应就排序，得到的建议两个季度内就会反转——这正是必须同时建模流失杠杆的原因。',
        },
        {
          step: 7,
          label: '按月计算 Magic Number 与 40 法则，ARR 需对平',
          gate:
            'Magic Number（本季净新增 ARR ÷ 上季 S&M 支出）与 40 法则（ARR 增长率% + EBITDA 或 FCF 利润率%）按月重算，净新增 ARR 与计费系统对平，且涨价带来的扩展收入不计入净新增 ARR。',
          blockIf:
            '净新增 ARR 不与计费系统对平，记分牌就能被记账口径而不是业务表现推动：涨价、年付预收或合同重分类都会在没有新客户的情况下落进净新增 ARR。而用单季度而不是滚动四季来复盘这一行，会得到正好相反的结论——被提前的季度后面必然跟着一个弱季，两者看起来像一个趋势。',
        },
      ],
    },
  },
};
