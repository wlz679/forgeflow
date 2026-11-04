// P166 试点 —— C 类（Valuation & Exit）主题「customer-acquisition-cost」 的新形态内容。
//
// 多指标天然共存（CAC / 回本 / LTV:CAC / 渠道结构）⇒ fixPriority 讲排序与联动。
//
// 与既有散文的分工（P165 取证结论）：
//   · 基准页 howToUse = 「选哪一行 → 单一动作」（一个指标 → 一件事）
//   · 指南页 howToApply = 「Step N 编号链」（按顺序做什么）
//   · 本文件 fixPriority = 「多个指标同时不达标 → 先修哪个 → 带动谁 → 什么时候反过来拖累谁」
//   · 本文件 readinessChecklist = 「每一步的达标线」（什么算过了 / 不达标卡在哪）
//
// 金额口径（统一声明，避免裸数字）：
//   · 单位 USD / 每客户 / 每季度窗口
//   · CAC 默认 = 全负荷综合 CAC（fully-loaded blended CAC）；写明 paid 时才是付费 CAC
//   · LTV 一律 = 群组实际已实现毛利（cohort-actual），不是预测终身价值
//   · 本主题不涉及模型单价 ⇒ 金额允许手写（不是随定价 bot 漂移的市场价）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Three CAC errors hide inside each other, and fixing them in the wrong order produces a quarter that looks cheaper without being cheaper. A blended number with no paid/blended split is the first: paid CAC usually runs two to three times blended, so a blended average flatters every decision you make with it, and the teams that quote blended are usually the teams whose sales salaries were never loaded into the numerator. The second is a channel average that mixes your best-performing source with a channel you have not touched since January, which is how a losing channel survives a budget review by hiding inside a healthy one. The third is a ratio computed on projected LTV, and it is the most expensive of the three because it turns every decision downstream into a bet on a retention curve nobody has observed yet. So the sequence below runs from the cheapest error to the most consequential: split blended from paid first, cut the channel average apart second, and only then divide by realised cohort gross profit. Below that sits the payback test, CAC divided by ARPU times gross margin, because payback is the number that connects a marketing decision to your bank balance, and an LTV:CAC ratio without payback next to it can be arithmetically correct and still describe a business that runs out of cash. Amounts are USD per customer over a quarterly window.',
      rows: [
        {
          priority: 1,
          metric: 'Fully-loaded CAC baseline: sales labour as a share of CAC (payroll, commission, tools, overhead)',
          fixFirst:
            'Fix this first because it is bookkeeping, not spending: no budget change is needed, and every other row is measuring off a wrong denominator until sales labour sits inside the numerator. When sales pay is excluded, fully-loaded CAC is commonly 2-3x the number on the dashboard, so LTV:CAC and payback months are both computed on a fictional denominator and every decision downstream inherits the gap. For a B2B SaaS SMB business the benchmark page lists blended CAC at USD 300-1,500 per customer, so a marketing-only CAC of USD 400 that turns out to exclude sales labour is really a fully-loaded CAC of USD 800-1,200, and every ratio built on the smaller number is wrong by the same factor. Load sales payroll, SDR/BDR commission, marketing tooling, content production, paid media and allocated overhead into one numerator, then split that same numerator across channels by new-logo hours logged. A defensible fully-loaded CAC is at least 1.5x the marketing-only CAC; a smaller gap means sales labour is still outside.',
          alsoMoves:
            'Loading sales payroll into the numerator raises measured CAC, which mechanically lowers LTV:CAC and lengthens payback months, so the quarter will look worse than the last one did - that is the correction showing up, not a regression. It also removes the false comfort of the 2-3x gap, which is what makes a channel cut look justified when it is not. In the other direction, a correctly loaded numerator is what makes the channel split defensible: until the numerator is fixed and shared, per-channel CAC is a split of a total nobody believes, and the dispersion row below has no trustworthy ranking to work from.',
          backfire:
            'The common backfire is allocating 100% of sales payroll to new business. Sales reps also renew and expand existing accounts, and those hours acquire no new logos, so loading all of it into CAC inflates CAC by roughly the non-new-logo share of sales time, which in an enterprise field-sales motion can exceed half of payroll. The fix that breaks the numerator is as bad as the error it replaced. Allocate on new-logo hours logged, keep renewal and expansion labour in a separate line outside CAC, and confirm that new-logo hours are above 60% of sales time before treating a high sales-labour share as a CAC problem at all.',
        },
        {
          priority: 2,
          metric: 'CAC dispersion across channels: worst channel CAC divided by best channel CAC',
          fixFirst:
            'Fix dispersion second because it separates a mix problem from a level problem, and the mix fix is the cheapest CAC improvement available: moving budget between channels buys no extra customers and costs no extra spend. When one channel costs 2.5x or more what the best channel costs, the blended average is describing a portfolio rather than a business, and negotiating with the expensive channel will not fix that, because the expensive channel is usually buying a different and dearer audience. Rank every channel that carries at least 5% of new customers by CAC, then shift spend toward the two cheapest until the spread is under 2.5x. Below 5% share a channel CAC is noise and does not belong in the ranking.',
          alsoMoves:
            'Reallocating spend toward the cheap channel lowers blended CAC, shortens payback months and lifts blended LTV:CAC in one move, because all three read the same numerator and the same customer count. The second-order effect lands on marginal CAC: the cheap channel has a finite pool of responsive prospects, so shifting 20 points of budget into it usually pushes its marginal CAC up toward its own average, and the blended gain shrinks every month you hold the shift. Expect the blended CAC improvement to be front-loaded and to decay over two to three quarters unless the mix is rebalanced on a schedule.',
          backfire:
            'Cutting the worst channel carries two costs the blended CAC does not show. First, that channel may be serving your most retentive cohort: if the high-CAC channel delivers customers at 90% logo retention while the cheap channel delivers 60%, cutting it removes gross profit along with the spend, and the cohort-actual LTV that drives LTV:CAC falls even as CAC falls. Second, concentration: if the cheap channel then carries more than 60% of new customers, its marginal CAC breaks and the CAC that was just optimised for returns at a higher level. Before cutting, check retention and average contract value for that channel cohort, not only its CAC.',
        },
        {
          priority: 3,
          metric: 'Marginal CAC: the cost of the last unit of spend, measured on the increment alone',
          fixFirst:
            'Fix marginal CAC third because it is the only metric that answers the spending question, and it can only be measured once the numerator is right (row 1) and the mix is understood (row 2). Blended CAC tells you what you paid on average; marginal CAC tells you what the next dollar costs, and the gap between the two is where growth decisions go wrong. Measure it directly: put one increment into one channel and compute CAC on the incremental customers only, not on the total. It passes only if marginal CAC sits below the payback limit, which is CAC divided by monthly ARPU times gross margin percent; above that line the extra dollar never comes back inside the acceptable window, no matter how good the blended average looks.',
          alsoMoves:
            'When marginal CAC is below blended CAC, the same spend buys more customers, so blended CAC stays flat or falls while new customer count rises, and payback months stay inside the ceiling because the incremental customers carry the same ARPU. The reason to fix this before the cash metrics is that the ceiling binds at the margin: once marginal CAC is above the payback limit, every extra dollar adds revenue that arrives after the cash is needed, and blended payback only reflects that with a lag of one to two quarters. Fixing marginal CAC first keeps the payback row honest instead of asking it to absorb a scaling mistake.',
          backfire:
            'The trap is improving marginal CAC by trimming the last slice of spend. Take 10% out of the worst-performing creative and the increment avoided was your least efficient 10%, so reported CAC improves for a quarter - but new customer count falls by the same slice, the cohort feeding your actual-LTV measurement gets thinner, and LTV:CAC becomes a ratio between two small numbers. The other direction is worse: scaling a channel because its marginal CAC looked good pulls blended CAC up toward that marginal CAC and pushes payback months up, while LTV:CAC still looks healthy on cohort-actual LTV. Treat marginal CAC as a spend-allocation input, never as the headline.',
        },
        {
          priority: 4,
          metric: 'CAC payback period in months: CAC divided by monthly ARPU times gross margin percent',
          fixFirst:
            'Fix payback fourth because it is a cash constraint rather than an efficiency metric: it tells you how long the money is locked up, and therefore how much runway you have to execute rows 1 to 3. It also sits downstream of two inputs you can move separately - the numerator you have just fixed, and ARPU times gross margin in the denominator, where pricing and cost of delivery both act. It passes when the payback period sits inside the band your cash cycle can carry: 12 months for SMB self-serve, 18 months for mid-market, 24 months for enterprise field sales, and under 3 months on a first order for DTC. Outside those bands the fix belongs in the denominator - price, packaging, or cost of delivery - and not in the ad auction.',
          alsoMoves:
            'Shortening payback frees cash, and that cash is what funds the cheap channel found in row 2 and the increments measured in row 3, so a payback improvement compounds back into CAC efficiency. It also sets the growth decision: with payback inside the band you can raise spend without raising the cost of capital, while at 24 months you need roughly twice the gross profit per customer before the same spend is fundable. Gross margin is the lever most founders skip here, because it does not show up in any CAC metric while it shortens payback in direct proportion.',
          backfire:
            'Payback is the easiest metric to improve for the wrong reason, and each wrong way makes CAC worse. Improving payback by cutting spend cuts new customers, so CAC rises as spend falls: payback improves and CAC degrades at the same time. Improving payback by discounting to raise volume raises ARPU but lengthens the sales cycle, which adds sales hours per deal and therefore raises the sales-labour share of CAC, so fully-loaded CAC goes up and the fix from row 1 is undone. The clean version raises gross margin or list price without adding sales hours; check that sales hours per closed deal stay flat while payback falls.',
        },
        {
          priority: 5,
          metric: 'LTV:CAC ratio on cohort-actual LTV: realised gross profit, not a modelled lifetime',
          fixFirst:
            'Fix the ratio fifth because it is a verdict, not a lever. With the numerator now real and the denominator cohort-actual, the ratio tells you whether the business is worth scaling, and if it is short the shortfall is almost always on the LTV side. A ratio below 1.5:1 means each new customer costs more than they return, and no amount of acquisition efficiency fixes that: you need more gross profit per customer, which comes from price, packaging, onboarding quality or retention, and each of those takes a quarter or more to verify. It passes at 3:1 or better on a cohort with at least 12 months of realised data and at least 30 customers; below that sample size the ratio is directional only.',
          alsoMoves:
            'Raising LTV through retention lengthens the payback window, which lowers payback months without touching CAC, and it widens the tolerance for CAC as well: at 4:1 a CAC 33% above today still holds 3:1, and that headroom is what makes a marginal CAC above blended CAC survivable. Raising LTV through price moves the same way, because ARPU times gross margin rises and payback shortens. Both actions also change how much you can afford to spend, which pulls marginal CAC back into the decision: the ratio is the constraint every spending decision has to live inside.',
          backfire:
            'There is a way to make LTV:CAC look better while the business gets worse, and it is usually accidental. Computing LTV on the median customer, or excluding the enterprise deals that dragged CAC up, lifts the ratio without touching either cash flow line. Extending the contract term to raise LTV adds discounting, which lengthens the sales cycle and adds sales hours per deal, so the sales-labour share of CAC rises and fully-loaded CAC gets worse: the ratio improved because the denominator moved while the numerator quietly worsened. If the ratio jumped by more than 0.5 in a quarter, ask what changed in the measurement before crediting the team.',
        },
        {
          priority: 6,
          metric: 'Paid CAC as a share of blended CAC: how much of the cost is scalable paid spend',
          fixFirst:
            'Fix this last because it is a measure of structure and cushion rather than of level: it tells you how much of CAC is bought and how much is organic, referral or word of mouth, and therefore whether growth has a non-paid engine. The measure only becomes actionable once rows 1 to 5 are honest, because a high paid share on a business that is simply young is not a defect, while a low paid share built on misclassified spend is worse than a high one. It passes when paid share sits below 70% of blended CAC for a business older than 18 months, with branded search and referral classified the same way every quarter. Above 70% growth consumes cash at the rate of paid spend, and there is no cushion when marginal CAC rises.',
          alsoMoves:
            'Raising the non-paid share lowers blended CAC without changing paid CAC, which flatters payback months and lifts LTV:CAC without a single extra customer - but it lowers the new customer denominator only if the referral flow is genuinely incremental. The linked effect is on channel dispersion: a growing referral or content channel changes the best-versus-worst spread that row 2 ranks, and it changes the marginal CAC of the paid channels because a warmer audience converts more cheaply. Treat this row as the scoreboard for whether the earlier fixes produced a business that can grow without buying every customer.',
          backfire:
            'The backfire here is misclassification. Paid campaigns that report as organic under last-click attribution, or branded search counted as a non-paid cushion, make blended CAC look better and paid CAC look worse than they are; the same misclassification hides marginal CAC, because the spend is already booked somewhere else. Lowering the paid share by moving budget to a referral program that is really a paid affiliate deal is the same error under a different name. Reclassify first: paid share has to be reproducible from the ad accounts and affiliate statements, and if it is not, this row is not yet measurable.',
        },
      ],
    },
    zh: {
      intro:
        'CAC 的三个错误互相遮掩，按错顺序修，会得到一个「看起来变便宜」的季度，而实际并没有变便宜。第一个是不拆综合与付费：付费 CAC 通常是综合的 2 到 3 倍，所以综合口径会把你的每一个决策都往乐观里带，而拿综合口径汇报的团队，多半是销售薪资根本没进过分母的团队。第二个是渠道均值把最有效的来源和一个从一月就没再碰过的渠道混在一起，于是亏钱渠道靠躲在健康渠道里活过了预算评审。第三个最贵：把比率算在预测 LTV 上，它会把后面每一个决定都变成一场对没人观测过的留存曲线的赌注。所以下面这组顺序从最便宜的错开始：先拆综合与付费，再把渠道均值拆开，最后才除以群组已实现的毛利。再往下压着回本测试 —— CAC 除以 ARPU 乘毛利率 —— 因为回本是把营销决定连到你银行账户上的那个数；一个旁边没有回本的 LTV:CAC 比率，可能算术正确，却描述着一家会没钱的生意。金额口径统一为美元 / 每客户 / 每季度窗口。',
      rows: [
        {
          priority: 1,
          metric: '全负荷 CAC 口径：销售人力在 CAC 中的占比（销售薪酬、佣金、工具、分摊管理费）',
          fixFirst:
            '第一个修它，因为它只动账不动钱：不用改任何预算，而只要销售人力没进分子，后面每一行都建立在一个错误的分母上。多数创始人报出的 CAC 之所以比全负荷口径低 2-3 倍，就是漏了销售薪酬，于是 LTV:CAC 和回本周期都算在一个虚构的分母上，下游所有决策一起继承这个偏差。拿 B2B SaaS SMB 举例：基准页列的该分段综合 CAC 是每客户 300-1,500 美元，如果你的 400 美元只含营销费、没算销售人力，全负荷其实是 800-1,200 美元，建在那个小数上的每个比例都按同样倍率错着。把销售薪酬、SDR/BDR 佣金、营销工具、内容制作、付费媒体和分摊管理费并进同一个分子，再按「新签 logo 投入工时」把这一个分子拆到各渠道。判断线：全负荷 CAC 至少要达到「只算营销费」的 1.5 倍；差距更小，说明销售人力还在分子外面。',
          alsoMoves:
            '把销售薪酬装进分子会抬高测出来的 CAC，于是 LTV:CAC 下降、回本月数变长 —— 报表会比上一季更难看，但那是真实的 2-3 倍缺口显出来，不是经营变差。反方向同样重要：口径一旦正确，渠道 CAC 拆分才站得住脚 —— 分子不可信时拆出来的渠道数字只是把一个没人相信的总数摊开，本该排到第二位的「渠道离散度」就没有可信的排序依据。',
          backfire:
            '最常见的反噬是把 100% 销售薪酬都算进获客。销售同时在做续费和扩展，这些工时并没有带来新 logo；把它们全计入 CAC，会按「非新签工时占比」把 CAC 灌水，驻外销售制的企业客户里这一比例可能超过全部薪酬的一半 —— 于是「销售人力占比高」这个结论是口径造成的，不是效率问题。正确做法是按新签 logo 工时归集，把续费与扩展工时单列在 CAC 之外；在把高销售占比当成 CAC 病去治之前，先确认新签工时占比是否高于 60%。',
        },
        {
          priority: 2,
          metric: '按渠道拆分的 CAC 离散度（最差渠道 CAC ÷ 最好渠道 CAC 的倍数）',
          fixFirst:
            '第二个修它，因为它把「结构问题」和「水平问题」分开，而结构问题是最便宜的 CAC 改善手段：在渠道之间挪预算既不多买客户、也不多花钱。当一个渠道的成本是最优渠道的 2.5 倍以上时，综合均值描述的是一篮子投放，而不是一门生意 —— 和贵渠道谈判基本没用，因为贵渠道买的是另一批更贵的人。把承担 5% 以上新增客户的渠道全部按 CAC 排名，然后把预算往最便宜的两个渠道挪，直到离散度压到 2.5 倍以内。占比不到 5% 的渠道，其 CAC 是噪声，不进这个排名。',
          alsoMoves:
            '往便宜渠道挪预算，会同时压低综合 CAC、缩短回本月数、抬高综合 LTV:CAC —— 三个指标读的是同一个分子和同一个客户数，所以一次调整动三个。但二阶效应落在边际 CAC 上：便宜渠道的响应人群有限，20 个百分点的预算挪过去通常会把它的边际 CAC 推向它自己的均值，于是综合 CAC 的改善是前置的、随后两三个季度逐步衰减，除非按周期重新平衡渠道结构。',
          backfire:
            '砍掉最差渠道有两笔成本是综合 CAC 看不见的。第一，那个渠道可能正好带来留存最好的群组：若高 CAC 渠道的 logo 留存 90%、便宜渠道只有 60%，砍掉它省了钱也砍了毛利，驱动 LTV:CAC 的群组实际 LTV 会跟着掉，CAC 降了比例反而更难看。第二是集中度：便宜渠道一旦承担超过 60% 的新增客户，它的边际 CAC 会爆掉，你刚优化出来的 CAC 会以更高的水平回来。动手前先看那个渠道群组的留存和合同均价，不要只看 CAC。',
        },
        {
          priority: 3,
          metric: '边际 CAC：最后一元投放的实际获客成本，按增量客户单独核算',
          fixFirst:
            '第三个修它，因为它是唯一回答「该不该加钱」的指标，而它只有在口径修对（第一行）、结构看懂（第二行）之后才量得准。综合 CAC 告诉你平均付了多少，边际 CAC 告诉你下一元要付多少，两者之间的差额就是增长决策翻车的地方。直接量：在一个渠道上加一笔增量支出，只用增量客户算 CAC，不要拿总数摊。达标线是边际 CAC 低于你的回本上限 —— CAC ÷（月 ARPU × 毛利率%）—— 超过这条线，这一元赚回来的钱永远等不到你需要的时点，再好看的综合均值也救不了它。',
          alsoMoves:
            '当边际 CAC 低于综合 CAC 时，同样的钱买到更多客户，综合 CAC 不升反降，回本仍守在上限内，因为增量客户带着同样的 ARPU。之所以把边际这一项排在现金类指标之前，是因为上限就是在边际上卡住的：边际 CAC 越线之后，每多花的一元带来的收入都在现金需要之后才到账，而综合回本要用一到两个季度才把这个错误显出来。先修边际，等于让回本那一行保持诚实，而不是让它替扩量失误买单。',
          backfire:
            '最容易把边际 CAC「修好」的方式是砍掉最后一刀投入。砍掉表现最差的那 10% 素材，你避开的正好是效率最低的 10%，当季报表 CAC 变好 —— 但新增客户同步减少，喂给「群组实际 LTV」的样本变薄，LTV:CAC 变成两个小数相除。反方向更糟：因为边际 CAC 好看就加量，综合 CAC 会向边际 CAC 靠拢，回本月数开始往上走，而基于群组实际 LTV 的 LTV:CAC 看起来仍然健康。把边际 CAC 当成预算分配输入，不要当头条数字。',
        },
        {
          priority: 4,
          metric: 'CAC 回本周期（月）：CAC ÷（月 ARPU × 毛利率%），即用毛利回收获客成本的月数',
          fixFirst:
            '第四个修它，因为它约束的是现金而不是效率：它回答「这笔钱被锁多久」，也就回答了你还有多少跑道去执行前三行。它同时位于两个可以分开拧的输入之下 —— 刚修好的分子，以及分母里的 ARPU × 毛利率，价格和交付成本都动得到。达标线是回本周期落在你现金周期扛得住的区间内：SMB 自助 12 个月以内、中端市场 18 个月以内、企业驻外销售 24 个月以内，DTC 首单 3 个月以内。超出这些区间，要修的是分母 —— 挂牌价、包装或交付成本 —— 不是广告竞价。',
          alsoMoves:
            '回本变快会释放现金，而这笔现金正是喂给第二行便宜渠道和第三行增量的本金，所以回本的改善会反哺回 CAC 效率。它同时决定增长决策：回本在区间内，你可以加预算而不抬高资金成本；回本拖到 24 个月，你需要每个客户多贡献接近一倍的毛利才扛得住同样的投放。毛利率是最常被跳过的那只手，因为它不出现在任何 CAC 指标里，却按比例直接缩短回本。',
          backfire:
            '回本是最容易用错方式改善的指标，而每一种错法都会让 CAC 变差。为了回本去砍投放：客户少了，CAC 反而上升 —— 回本变好、CAC 同时变坏。为了回本去打折拉量：ARPU 上去了，销售周期也拉长，每单销售工时增加，销售人力在 CAC 中的占比上升，全负荷 CAC 被抬回去，第一行的口径修复被推翻。干净的做法是提毛利（降交付成本）或提挂牌价而不加销售工时；一边缩短回本，一边确认「每单销售工时」保持不变。',
        },
        {
          priority: 5,
          metric: 'LTV:CAC 比例（LTV 取群组实际值，即已实现的毛利，不用预测终身价值）',
          fixFirst:
            '第五个修它，因为它是结论而不是杠杆：分子已经真实、分母换成群组实际值之后，比例才告诉你这门生意值不值得扩量；而一旦不达标，缺口几乎总在 LTV 那一侧。低于 1.5:1 意味着每收一个客户花的钱比他们回报的多，靠获客效率怎么优化都补不回来 —— 你要的是每个客户身上更多的毛利，来源是价格、包装、上手质量或留存，每一项都要一个季度以上才能验证。达标线：基于至少 12 个月已实现数据、至少 30 个客户的群组，比例达到 3:1；样本不足 30 个时，比例只能当方向参考。',
          alsoMoves:
            '用留存把 LTV 抬起来，会拉长回本窗口，在不碰 CAC 的前提下压低回本月数，同时也放宽了 CAC 的容忍度：4:1 时 CAC 比今天高 33% 仍能守住 3:1，这段余量正是「边际 CAC 高于综合 CAC」还能活的原因。用价格抬 LTV 也是同一个方向，因为 ARPU × 毛利率上升、回本缩短。两种做法同时改变了你能花多少钱，于是边际 CAC 又被拉回决策里 —— 比例是所有花钱决策必须待在里面那个约束。',
          backfire:
            '有一种做法能让 LTV:CAC 变好看而生意变差，而且多数时候是无心之失。用中位数客户算 LTV，或者把 CAC 拉高的企业单剔出群组，比例上去了，两条现金流却一动没动。为了抬 LTV 而延长合同期，往往伴随折扣，销售周期变长、每单销售工时增加，销售人力占比上升，全负荷 CAC 变差 —— 比例变好是因为分母动了，分子在暗地里更糟。如果某个季度比例跳了 0.5 以上，先问测量口径变了什么，再给团队记功。',
        },
        {
          priority: 6,
          metric: '付费 CAC 占综合 CAC 的比例（多少成本是买来的、也就是可扩量的部分）',
          fixFirst:
            '最后修它，因为它是结构与缓冲的度量，不是水平度量：它告诉你 CAC 里有多少是买来的、多少是自然流量、转介绍和口碑，也就是这门生意有没有非付费引擎。只有第一到第五行都诚实之后这一项才有意义 —— 一家刚起步的公司付费占比高不是缺陷，而建立在错配上的低付费占比比高付费占比更糟。达标线：成立超过 18 个月的业务，付费占比低于综合 CAC 的 70%，且品牌词与转介绍每个季度用同一套口径归类。高于 70%，增长就要按付费投放的速度吃现金，边际 CAC 一抬头就没有缓冲。',
          alsoMoves:
            '把非付费占比抬起来，可以在付费 CAC 不变的情况下压低综合 CAC，回本月数随之变短、LTV:CAC 上升 —— 而且不需要多买一个客户。但它同时会动分母（新增客户），前提是转介绍是真正增量的。联动点在渠道结构：一个正在长大的转介绍或内容渠道会改变第二行要排的「最好对最差」倍数，也会改变付费渠道的边际 CAC，因为受众更热时转化更便宜。把这一行当成记分牌：前面的修复有没有换来一门「不用每个客户都买」的生意。',
          backfire:
            '这里的反噬是归类错误。在 last-click 归因下把付费投放记成自然流量，或者把品牌词当成非付费缓冲，会让综合 CAC 看起来更好、付费 CAC 看起来更差；而付费占比一错，边际 CAC 就隐形了，因为钱已经记到别的账上。把预算挪到「转介绍」而它其实是付费联盟，同一个错误换个名字。归类先做对：付费占比必须能从广告账户和联盟结算单里复算出来；复算不出来，这一行就还没到可量的程度。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'The line that decides whether CAC work is real is not the CAC number but the numerator under it. Before any threshold here holds, sales salaries and commissions have to sit inside the denominator — exclude them and every ratio below flatters you by two to three times, which is the most common way a CAC dashboard stays green while the company loses money on each logo. Then the window has to be a closed quarter with a fixed spend base, because a CAC averaged over a period where spend and customer count came from different months is a ratio with no denominator. Next, paid and blended have to be reported separately, because scaling decisions apply to the paid number and only the paid number is comparable across periods. Only then does payback belong on the page: CAC divided by ARPU times gross margin, compared against the band that depends on your own gross margin rather than against a flat industry number. LTV belongs last and only as cohort-actual realised gross profit, never a projection, because a projected LTV will pass any ratio you set. And the quarterly re-benchmark is not a formality: category CAC drifts upward as a category matures, so a flat CAC is an efficiency win even when the absolute number looks worse than last year.',
      items: [
        {
          step: 1,
          label: 'Pull the quarterly sales and marketing spend base',
          gate: 'The quarter sales plus marketing spend reconciles to the finance ledger within 2%, and 6 cost lines sit inside the numerator: sales payroll, SDR/BDR commission, marketing tools, content production, paid media, allocated overhead - with only customer success and post-sale excluded.',
          blockIf: 'If the spend base is not reconciled, every number downstream inherits the gap: CAC is understated by the missing lines, LTV:CAC is overstated, and the channel split later on becomes a split of an unreconciled total. A 2% reconciliation gap is tolerable; a missing payroll line is not, because fully-loaded CAC is typically 2-3x the marketing-only figure.',
        },
        {
          step: 2,
          label: 'Count new paying customers in the same window',
          gate: 'The count ties to the billing system within 3%, at least 20 new paying customers fall inside the window, and 0 of them are reactivated churned accounts or expansion-only contracts booked as new logos.',
          blockIf: 'Fewer than 20 new customers in the quarter means CAC is one or two deals with no statistical meaning: a single enterprise deal can move CAC by more than half, and every comparison downstream inherits that noise. Counting reactivations and expansion contracts as new customers lowers CAC without any new acquisition spend, which makes the efficiency look better than the cash actually was, and both distortions corrupt payback and LTV:CAC downstream.',
        },
        {
          step: 3,
          label: 'Compute fully-loaded CAC on one 90-day window',
          gate: 'CAC equals the reconciled total spend divided by the new paying customers from the same 90 days, and the result is at least 1.5x your marketing-only CAC - a smaller gap means sales labour is still outside the numerator.',
          blockIf: 'If the fully-loaded number lands within 1.5x of the marketing-only number, sales effort is still missing from the numerator and every ratio built on it is optimistic by the same proportion. Freeze the formula here as well: one numerator definition, one window, no re-cutting mid-year, because the dispersion and marginal rows rank channels against this denominator, and a denominator that moves makes the ranking meaningless.',
        },
        {
          step: 4,
          label: 'Compute payback months from ARPU and gross margin',
          gate: 'Payback months equal CAC divided by monthly ARPU times gross margin percent, using net-of-discount ARPU from billing, and land at or under 12 months for SMB self-serve, 18 months for mid-market, and 24 months for enterprise field sales.',
          blockIf: 'Payback is the cash constraint on every spending decision that follows, so an overstated ARPU is not a small error: a 10% gap between billed and realised ARPU shifts payback by roughly a month and a half. If payback lands outside the band, the fix belongs in the denominator - list price, packaging, or cost of delivery - and not in the ad auction, because auction changes move CAC and payback in opposite directions and leave you solving the wrong problem.',
        },
        {
          step: 5,
          label: 'Compute LTV:CAC from cohort-actual gross profit',
          gate: 'LTV:CAC divides realised gross profit by cohort-actual LTV taken from at least 12 months of history and a cohort of at least 30 customers, never a projected lifetime value, and reads at least 3:1 to pass.',
          blockIf: 'A projected LTV is an assumption, and assumptions compound: at a true 1.5:1 a 30% overstatement of LTV turns a business that loses money into one that reads 2:1. Cohorts younger than 12 months and cohorts under 30 customers cannot produce a reliable actual LTV at all, so the ratio is directional only and must not be used to justify a spend increase or a channel cut.',
        },
        {
          step: 6,
          label: 'Model spend cuts, doubles and volume scenarios',
          gate: 'At least 3 scenarios are run on the CAC Calculator - spend at 50%, spend at 200%, and customers at 2x on the same spend - and each returns payback months, with the doubled-spend case staying inside the 12 / 18 / 24-month payback ceiling from the previous step.',
          blockIf: 'Modelling a single scenario produces a number with no range, and CAC decisions are range decisions: the same CAC can be fundable at 200 customers and ruinous at 2000, because fixed sales cost per customer falls as volume rises. If the model does not separate fixed from variable spend, the 200%-spend case will understate CAC and you will commit budget to a spend level the cash cycle cannot carry.',
        },
        {
          step: 7,
          label: 'Audit CAC by channel every month',
          gate: 'Every channel carrying 5% or more of new customers has its own CAC, LTV:CAC and payback on one normalised attribution window, the worst-to-best CAC spread is 2.5x or less, and no single channel carries more than 60% of new customers.',
          blockIf: 'A blended CAC with no channel split cannot be acted on: it hands you the portfolio average while hiding a channel costing 5x the others, and blended averages are exactly where a failing channel hides. If attribution windows are not normalised first - a 7-day click window against a 30-day click window is not a comparison - the ranking is an artefact of the reporting setup, and cutting the wrong channel is a 2-3x error in the wrong direction.',
        },
        {
          step: 8,
          label: 'Re-benchmark quarterly on one unchanged formula',
          gate: 'The series holds 4 consecutive quarters on one unchanged numerator definition, each quarter is matched to the same benchmark row rather than a mix of segments, and the quarter-on-quarter delta is split into price, volume and channel mix.',
          blockIf: 'A definitional change inside the series makes the trend unfalsifiable: if one quarter starts counting a cost line and the next does not, CAC appears to move for reasons that have nothing to do with acquisition. With fewer than 4 quarters on one formula you cannot separate a mix shift from an efficiency change, and you will credit or blame the wrong lever - remember that a flat CAC is an efficiency gain only against a benchmark that is itself drifting upward.',
        },
      ],
    },
    zh: {
      intro:
        'CAC 这条工作是不是真的，第一个要看的不是 CAC 本身，而是它下面的分子。任何达标线成立之前，销售薪资和佣金必须进分母 —— 把它们拿掉，下面每个比率都会往好里偏两到三倍，这正是 CAC 仪表盘一路绿着、公司却在每个 logo 上亏钱的常见原因。然后窗口要闭成一个季度、支出口径要固定，因为把支出的月份和客户数的月份混在一起平均，得到的比率没有分母。再下一步是把付费与综合分开报，扩量决策只对得上付费口径，而只有付费口径能跨期比较。然后才轮到回本登场：CAC 除以 ARPU 乘毛利率，且要跟随你自己毛利率变化的区间比，而不是跟一个平的行业数字比。LTV 放在最后，且只能取群组已实现的实际毛利，绝不用预测值 —— 预测 LTV 会让你设的任何比率都通过。最后那条季度重对也不是走过场：品类成熟时 CAC 会往上漂，所以持平的 CAC 本身就是效率上的胜利，哪怕绝对值看起来比去年更差。',
      items: [
        {
          step: 1,
          label: '拉取当季销售与营销支出基数，并核对到财务总账',
          gate: '当季销售加营销支出与财务总账的差异在 2% 以内，且分子里装进了 6 条成本线：销售薪酬、SDR/BDR 佣金、营销工具、内容制作、付费媒体、分摊管理费 —— 只有客成与售后被排除在外。',
          blockIf: '支出基数没对上，后面所有数都带着这个缺口走：CAC 会因为漏掉的成本线被低估，LTV:CAC 会被高估，之后的渠道拆分也只是把一个没对过账的总数摊开。2% 的对账差可以接受，漏一条销售薪酬不行 —— 全负荷 CAC 通常是只算营销费口径的 2-3 倍。',
        },
        {
          step: 2,
          label: '数出同一时间窗内新增付费客户，并剔除复购与二次激活',
          gate: '客户数与计费系统差异在 3% 以内，同一窗口内新增付费客户不少于 20 个，且其中 0 个是已流失客户的二次激活或仅扩展合同被当成了新 logo。',
          blockIf: '窗口内不足 20 个新增客户，CAC 就是一两单生意，没有统计意义 —— 一张企业单就能把 CAC 推动一半以上，后面每一次比较都继承这份噪声。把复购和扩展合同算成新客户，等于在没有新增投放的情况下压低 CAC，效率看起来比现金实际的样子好；这两个口径不先剔干净，回本周期和 LTV:CAC 都会跟着失真。',
        },
        {
          step: 3,
          label: '在同一 90 天窗口上算出唯一的全负荷 CAC 公式',
          gate: 'CAC 等于对过账的总支出除以同一 90 天内的新增付费客户，且结果至少是「只算营销费」口径的 1.5 倍 —— 差距更小就说明销售人力还在分子外面。',
          blockIf: '全负荷数字落在只算营销费口径的 1.5 倍以内，说明分子里仍然没有销售投入，建在它上面的每个比例都会乐观同一个幅度。这一步还要把公式钉死：一个分子定义、一个时间窗，年中不许重切 —— 后面要靠渠道离散度和边际 CAC 给渠道排序，分子会动的话排序没有意义。',
        },
        {
          step: 4,
          label: '用月 ARPU 与毛利率算出回本月数，并核对分母口径',
          gate: '回本月数 = CAC ÷（月 ARPU × 毛利率%），ARPU 取计费系统里扣完折扣的净额，且落在 SMB 自助 12 个月、中端市场 18 个月、企业驻外销售 24 个月以内。',
          blockIf: '回本周期是后面所有花钱决策的现金约束，ARPU 报高不是小错：账单 ARPU 与实际收进来的钱差 10%，回本大约差一个半月。回本超出区间时该动的是分母 —— 挂牌价、包装或交付成本 —— 不是广告竞价，因为竞价调整会让 CAC 和回本朝相反方向跑，你会一直在解错题。',
        },
        {
          step: 5,
          label: '用群组实际已实现毛利算出 LTV:CAC 比例',
          gate: 'LTV:CAC 用至少 12 个月已实现毛利算出的群组实际 LTV 除以 CAC，且群组客户数不少于 30 个；达标线是比例达到 3:1。',
          blockIf: '预测 LTV 是假设，假设会复利：真实只有 1.5:1 时，把 LTV 高估 30% 就能把一个亏钱的生意显示成 2:1。不足 12 个月的新群组和不到 30 个客户的群组根本算不出可信的实际 LTV，这种比例只能当方向参考，不能拿来支持加预算或砍渠道。',
        },
        {
          step: 6,
          label: '跑减半投放、加倍投放与客户量翻倍三档情景建模',
          gate: '至少跑 3 个情景：投放 50%、投放 200%、同样投放下客户量 2 倍，每个情景都要给出回本月数；投放翻倍那一档不得突破 12 / 18 / 24 个月的回本上限。',
          blockIf: '只跑一个情景得到的是一个没有区间的数，而 CAC 决策本质是区间决策：同样的 CAC，在 200 个客户时资金上可承受，在 2000 个客户时可能拖垮现金流，因为每个客户分摊的固定销售成本随量下降。模型里如果不区分固定成本与变动成本，投放翻倍那一档会低估 CAC，你会把预算押在一个现金周期扛不住的投放档位上。',
        },
        {
          step: 7,
          label: '每月做一次按渠道拆分的 CAC 审计，并统一归因窗口',
          gate: '承担 5% 以上新增客户的每个渠道都有各自的 CAC、LTV:CAC 与回本，归因窗口已归一；最差与最好渠道的 CAC 倍数不超过 2.5 倍，且没有任何单一渠道承担超过 60% 的新增客户。',
          blockIf: '只报综合 CAC 的仪表盘无法行动：它给你的是组合均值，却把成本高 5 倍的渠道藏在里面，而均值正是坏渠道藏身的地方。归因窗口没有先归一 —— 7 天点击窗口和 30 天点击窗口放在一起比不是比较，是设置差异 —— 排出来的名次就是报表设置的产物，砍错渠道的误差会朝错误方向放大 2-3 倍。',
        },
        {
          step: 8,
          label: '每季度用同一套未改动的公式重新对一次行业基准',
          gate: '序列里有连续 4 个季度使用同一套未改动的分子定义，每季度都对同一行基准而不是混合分段，并且把环比变化拆成价格、量与渠道结构三部分。',
          blockIf: '序列中途换口径会让趋势无法证伪：某个季度开始把一条成本线算进来、下个季度又不算，CAC 的变动与获客效率无关。同一公式下不足 4 个季度，分不出结构漂移和效率变化，你会把功劳或责任记到错误的杠杆上；还要记住，只有在基准本身也在往上漂的前提下，CAC 持平才算效率提升。',
        },
      ],
    },
  },
};
