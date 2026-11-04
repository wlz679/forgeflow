// P166 —— F 类（Investment & Real Estate）主题「compound-interest-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个基准行 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」—— howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不涉及模型单价，涉及收益率、百分比与读者自己的资产规模）：
//   百分比与金额都是读者自己的经营阈值，不是随 bot 漂移的市场价 ⇒ 手写可以，但必须带口径。
//   本文件里的每个数字都自带：分子、分母、期间（年化 vs 期间累计）、量级、单位。
//   名义 vs 实际：实际收益 =（1 + 名义）÷（1 + 通胀）− 1。10% 名义在 3% 通胀下是 6.8% 实际。
//   税前 vs 税后：应税券商账户每年因分红与换手损失 0.5-1.5%；传统 401(k) 积累期 0%；
//     Roth 合资格提取 0%。资产摆放（债券放递延账户、股票放 Roth/应税）值 0.2-0.5%/年。
//   CAGR vs 算术平均：一律用 CAGR（几何均值，永远 ≤ 算术平均）。
//   费率拖累：1.0% 管理费 vs 0.05% 指数基金 = 每年约 0.95% 逆风，40 年约等于终值的 25%。
//   机械杠杆：按月 vs 按年定投在 30 年 7% 计划上值终值 3-5%；按规则再平衡值 0.3-0.5%/年。
//   提取阶段：4% 法则反推（年支出 × 25）；安全提取率 3.5-4.0%；退休第 1-3 年出现 −20%
//     会让组合寿命缩短 5-10 年。
//   金额一律以美元计，示例量级写在行内（如 USD 1,500,000 目标、USD 500/月 定投），
//     避免读者按自己的规模套错。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A retirement plan fails on two different kinds of broken number, and the repair order is not the order the numbers appear on a statement. One kind is a wrong assumption: a nominal return where a real one is needed, an arithmetic average where a compound annual growth rate is needed, or a fee that quietly eats a quarter of the terminal value. A 10 percent nominal return at 3 percent inflation is a 6.8 percent real return, and a portfolio that gains 50 percent then loses 50 percent has a 0 percent average but a negative 13.4 percent compound rate, so the basis has to be settled before the projection is worth anything. The other kind is a decision already made badly and never measured. The sequence runs from the return you are leaving behind to the assumptions every dollar is multiplied by and then to the behavior that decides whether you stay in the plan at all. That means the employer match first, because an unmatched dollar is an instant 50-100 percent loss and match-capture failure is the single most expensive common mistake in this whole space, then the account order, then monthly contributions against annual ones, since monthly compounding adds roughly twelve periods a year and on a 30-year plan at 7 percent it moves the ending balance materially. Rebalancing comes on a rule, and the glidepath decides the stock-to-bond mix at each age rather than being set once. And the horizon matters more than the rate: the last decade of a 40-year plan typically produces more absolute dollars than the first three decades combined, so a year of delay removes a compounding period from the fattest part of the curve. Every figure is an annualised compound rate over a stated period, and every percentage carries its own denominator.',
      rows: [
        {
          priority: 1,
          metric: 'Employer match capture rate — the guaranteed return being left on the table',
          fixFirst:
            'Fix this first, because it is the only line in a retirement plan with a contractual, immediate and tax-free return attached, and because it reorders every dollar that follows: a match dollar is worth 50% back for every 1% you contribute, which beats every asset class in the benchmark table, and it starts compounding the day it lands. Pull your actual deferral from the last full pay period, divide it by your plan’s match formula, and correct the shortfall in the current cycle rather than at year end if your plan allows it. Verify by confirming the plan year shows a match paid equal to the formula on the corrected deferral, and that nothing was clawed back because the year ended short of the vesting schedule.',
          alsoMoves:
            'Capturing the match enlarges the tax-advantaged base that every later row sits on, so it moves the ending balance twice — once through the extra contribution and once through the years of tax deferral those contributions would not otherwise have had. It also frees the account-ordering logic in step 5, because the next-best dollar (an HSA contribution, then Roth space) only becomes available once the match is fully captured, and a missed match silently pushes everything down the priority list. And because the match is the only return in the plan that is contractually guaranteed, filling it reduces the share of your retirement outcome that depends on market performance, which matters most if your plan is young and your allocation is aggressive.',
          backfire:
            'There are two ways to over-do this row and damage a later one. First, maxing a 401(k) to the limit while funding it with debt or by cutting the emergency fund: the match is captured and the plan looks disciplined while the household has no buffer, and a forced sale at the bottom of a drawdown is exactly the behaviour that destroys compounding in the first place. Second, chasing the match with a contribution so large that it reduces your take-home pay every month and you end up borrowing to live — the interest on that borrowing can exceed the after-tax value of the contribution. The subtler failure is treating the match as the whole plan: a captured match sitting in a product with a 1.0% fee and a 15% tax drag still underperforms the same contribution held in a low-cost index fund outside the plan once your horizon is long.',
        },
        {
          priority: 2,
          metric: 'Return basis — nominal CAGR, real return, and the after-tax return you actually earn',
          fixFirst:
            'Fix the return basis second, because it is the single number every dollar in the model is multiplied by, and because the most common version of this mistake — modelling the nominal return and calling it the plan — overstates a 30-year outcome by more than 30%. Rebuild the projection on three lines: the nominal CAGR you expect from the benchmark table, the real return after inflation (real = (1 + nominal) divided by (1 + inflation) minus 1, so 10% nominal at 3% inflation is 6.8% real), and the after-tax return in the account type you will actually hold, which is the nominal return minus the 0.5-1.5% per year drag of a taxable brokerage account. Plan on the lowest of the three. Verify with the Rule of 72: at 7% the doubling time is 10.3 years, so a model claiming a doubling in 5 years has an input error rather than a good plan.',
          alsoMoves:
            'Choosing the right basis changes what you are allowed to do with the plan, not just what you report. A plan modelled on the real return forces you to inflate every future expense by the same inflation rate you assumed, so the 4% rule becomes a share of real spending rather than a nominal one and the target you set in step 1 stops drifting silently. It also changes the account-ordering decision in step 5: a taxable account is only sensible for assets where the tax drag is smallest, so the basis choice and the account choice have to be made together. And the spread between the three lines is the honest uncertainty band of the whole plan — a range rather than a number, which is what keeps a bad market year from turning into a change of strategy.',
          backfire:
            'The failure mode here is a plan that only works on the optimistic line. If the model clears its target at 7% real but breaks at 5.5% real after tax, the plan has been sized against a number that will not repeat, and the first genuinely bad year forces a contribution cut or a return-chasing decision at the worst possible moment. The other version is using an arithmetic average instead of a CAGR: a portfolio that gains 50% and then loses 50% has a 0% arithmetic average and a −13.4% CAGR, so averaging flatters exactly the high-volatility assets that most need to be modelled honestly. A subtle one is applying the inflation haircut twice, once in the return and again when deflating future spending, which quietly costs a point of real return per cycle and makes a sound plan look infeasible.',
        },
        {
          priority: 3,
          metric: 'Fee drag, tax drag and asset location — the leak between gross and net return',
          fixFirst:
            'Fix the drag third, because unlike a return assumption this one is measurable today, entirely under your control, and compounds against you for the whole horizon: the gap between a 1.0% expense ratio and a 0.05% index fund is roughly 0.95% a year, which is about 25% of ending value over 40 years. Audit every holding for its expense ratio and its turnover cost, then move the assets where the tax lands hardest into the tax-advantaged accounts — bonds into the tax-deferred account, equities into the Roth or the taxable account — which is worth 0.2-0.5% a year with no additional risk. Verify by writing the weighted average expense ratio and the weighted average tax drag on the first line of the model, and by confirming that no position in the taxable account is a high-turnover or high-dividend holding the account type is punishing.',
          alsoMoves:
            'Drag reduction is the one lever that improves the plan without requiring more risk or more money. Every point of net drag you remove lengthens the horizon by months and, in a time-constrained plan, can be the difference between reaching the target on schedule and reaching it two years late. It also interacts with rows one and two: a lower net return raises the case for the tax-advantaged accounts, and a larger tax-advantaged balance makes the asset-location split worth more. And because fees and tax are certain while returns are probabilistic, this is the part of the plan you can verify without waiting for a market outcome, which makes it the safest thing to act on in a bad year.',
          backfire:
            'The trap is that cutting fees usually means moving money, and moving money is where tax accidents happen. Selling a position inside a taxable account to buy a cheaper fund crystallises capital gains and can put a year of gains into the very bracket you were trying to avoid, so a 1% fee saving arrives with a 15-20% tax bill on the way and the net is negative in the year it happens. The other trap is chasing the fee cut by changing strategy: swapping a broad index for a cheaper concentrated fund looks like a saving and is really a risk increase. And the classic miss is leaving the expensive position in place because selling it is emotionally hard, which is precisely how a 1.0% product ends up being 25% of the terminal value you thought you had protected.',
        },
        {
          priority: 4,
          metric: 'Contribution rate, frequency and start date — the mechanical compounding levers',
          fixFirst:
            'Fix this fourth, because it is the lever with the shortest feedback loop: unlike returns, a change in contributions shows up in your balance within one pay cycle, and unlike fees it carries no downside. Convert the target into a required monthly amount by running the model backwards — the same 30-year plan at 7% that ends at USD 1,500,000 tells you the monthly contribution it demands — then automate it so it leaves on payday. Move from annual to monthly contributions as well, which on a 30-year 7% plan is worth roughly 3-5% of ending value purely from timing, and pull the start date forward if it has already passed, because every year of delay removes one compounding period from the fat end of the curve. Verify by confirming the automatic debit is dated at or before payday, and by re-running the model with the delay scenario so the cost of a future pause is a number you have already seen.',
          alsoMoves:
            'The contribution rate is the variable that keeps the plan on schedule when the market does not, which makes it the natural hedge against the return-basis risk in row two. Raising contributions also increases the tax-advantaged balance, which raises the value of asset location and of the match capture in row one. And because the contribution is a fixed amount against a variable balance, it also performs the rebalancing work in row five for you during the accumulation years, which is why a contribution-driven plan needs less frequent intervention than a market-driven one.',
          backfire:
            'Two failures here are common, and both show up as a plan that is abandoned rather than a plan that fails. The first is sizing the contribution to a good market year and treating it as permanent: a 12% return year is not a new baseline, and a contribution that assumed it would repeat gets cut in the first flat year, which is precisely when the money matters most. The second is raising contributions so far that the emergency fund is quietly emptied — a contribution plan with no buffer is a plan that breaks at the first job loss, and selling assets at that point is what converts a market drawdown into permanent loss. The subtler version is that monthly contributions only add value if the money is not sitting in cash in the meantime, so a monthly deposit that lands and immediately sits in a 0.4% savings account is a monthly deposit that never compounded.',
        },
        {
          priority: 5,
          metric: 'Asset allocation against the drawdown you can actually sit through',
          fixFirst:
            'Fix the allocation fifth, because it decides whether you stay in the plan, and staying in the plan is worth more than any single year’s return. Take the largest drawdown you could realistically tolerate without selling — for most households roughly 40% on the equity sleeve — and set the equity share at or below what that drawdown implies, using the glidepath bands as a starting point rather than a rule: 90/10 under 35, 70/30 in the 45-55 window, 50/50 to 60/40 at retirement. Then check the portfolio against real historical stress rather than a hypothetical one. Verify by writing the allocation as percentages with the date they were set, plus the specific scenario in which you would sell, and confirm your stated response to that scenario is to rebalance rather than to sell.',
          alsoMoves:
            'The allocation is what converts your return assumption into something you can hold, and holding it is what makes every other row count. It also sets the actual volatility of your ending balance, which changes how much of the target depends on sequence rather than on average returns — a 70/30 portfolio reaching the same number with far less year-to-year variance is a different plan even at the same CAGR. And because the allocation determines which asset sits in which account, it is the same decision as the asset-location work in row three; the two cannot be settled separately without one of them undoing the other.',
          backfire:
            'The failure is picking the allocation that produced the best historical return rather than the one you could live with. A 100% equity portfolio modelled at a 10% historical nominal return beats every cautious plan on paper and then delivers a 50% drawdown in its first bad decade, at which point the return assumption stops mattering because you are out of the plan. The subtler version is the glidepath: a portfolio that follows a mechanical glide path sells equities in a drawdown exactly when the alternative would have rebalanced into them, so the glide path is not neutral — it is a systematic decision to reduce risk into weakness. Over-correcting the other way, holding so much cash that a 20-year horizon cannot reach the target, is a risk decision dressed up as prudence.',
        },
        {
          priority: 6,
          metric: 'Withdrawal glidepath and sequence-of-returns risk — the phase where accumulation math stops applying',
          fixFirst:
            'Fix this last, and only if you are within 10 years of drawing down, because it is a different problem from accumulation and the accumulation model is invalid from the day you start withdrawing. Convert the target into a spending number first — annual spending multiplied by 25 is the first-pass 4% rule figure and 3.5-4.0% is the safer band — then build a withdrawal rule that survives a bad opening sequence rather than one that assumes smooth returns. The specific danger is a −20% year in the first three years of retirement, which can shorten portfolio longevity by 5-10 years versus the same loss arriving late, because early withdrawals sell more shares into a lower price. Model a first-year crash on the withdrawal plan and shift the glidepath toward 50/50 to 60/40 if it does not survive. Verify by recording the withdrawal rate, the cash buffer held outside the portfolio for 2 years of spending, and the plan for year 1 if the market falls 20%.',
          alsoMoves:
            'Solving the withdrawal problem early changes what you do during accumulation, not just afterwards: a portfolio that must fund spending in year 1 needs a cash buffer, and that buffer changes the allocation, because the bond sleeve providing it earns less than the equity sleeve that would have compounded. It also changes the target in step 1, because a 4% rule target and a 3.5% rule target differ by years of extra saving at the same spending. And it changes how you read row five, because a drawdown tolerance set for accumulation is often larger than one you can hold in retirement, and the same 40% fall is a very different event once the money has to pay a mortgage.',
          backfire:
            'The classic error is modelling the withdrawal phase with the accumulation arithmetic: a fixed return and a fixed contribution solve nothing once you are selling shares, so the projection looks comfortable and the first bad sequence breaks it. The second error is taking the first year of spending out of the portfolio instead of holding 2 years of spending outside it, which is precisely what turns a temporary fall into a permanent loss of principal. And the third is raising the withdrawal rate in a good market year to fund a spending increase, because recovering from a drawdown requires the same average return to do more work than it did before the loss, so an inflated withdrawal rate sets a target the portfolio cannot re-earn at the same pace.',
        },
      ],
    },
    zh: {
      intro:
        '退休计划栽在两种坏掉的数字上，而修复顺序并不是这些数字在账单上出现的顺序。第一种是假设本身错了：用名义收益当实际收益、用算术平均当年化复合收益、或者一份悄悄吃掉终值四分之一的费率。10% 名义在 3% 通胀下是 6.8% 实际，而一个先涨 50% 再跌 50% 的组合算术平均是 0%、复合年化是 −13.4%，所以口径不先定下来，投影就没什么意义。第二种是某个已经做坏、却从没被度量的决定。顺序从「你正在白白丢掉的确定性回报」开始，经过每一个美元都要乘上去的假设，最后落到决定你会不会留在计划里的行为。这份确定性回报就是雇主匹配：没被匹配上的每一美元是当场 50-100% 的损失，而漏掉匹配是这个领域里最贵的常见错误。账户顺序随后排定，按月缴对比按年缴也在这附近——按月复利一年多出大约 12 个周期，在 30 年 7% 的计划上对终值影响不小。再平衡按规则走，股债比例按年龄的滑翔路径逐段定，而不是一次定死。期限比利率更要紧：40 年计划里的最后十年，产出的绝对美元通常比前三十年加起来还多，所以晚一年开始，就是从曲线最肥的那一段上削掉一个复利周期。全篇收益率一律是给定期间的年化复合增长，每个百分比自带分母。',
      rows: [
        {
          priority: 1,
          metric: '雇主匹配领取率 —— 你正在白扔的那份确定性回报',
          fixFirst:
            '先修这一项，因为它是退休计划里唯一一条带合同属性、当下到账、且免税的回报，而且它会重排后面每一块钱的顺序：你每投 1% 就回 50% 的匹配，胜过基准表里的任何资产类别，而且从到账那天起就开始复利。拉上一个完整发薪周期的实际缴款，除以你计划的匹配公式，若计划允许就在当前周期内补上缺口，而不是等到年底。验证方式：确认计划年度显示的匹配支付等于公式在补缴后应得的数额，并且没有因为年度未达归属条件而被追回。',
          alsoMoves:
            '把匹配拿满会做大后面每一行所依附的免税账户基数，所以它对终值的影响是两次——一次是多出来的缴款，一次是这些缴款本来得不到的那些年税递延。它同时释放步骤 5 的账户排序逻辑：下一个最优的美元（HSA 缴款、然后 Roth 额度）只有在匹配拿满之后才可用，而漏掉的匹配会把后面所有项悄悄挤到优先级列表的下方。而且因为匹配是计划里唯一合同锁定的回报，拿满它就降低了你退休结果中依赖市场表现的比例——这一条在计划还年轻、配置还很激进的时候最要紧。',
          backfire:
            '这一行有两种「做过头」的路径，都会伤到后面的行。第一种是把 401(k) 顶到上限、用借款或者靠砍掉应急金来供款：匹配拿到了，计划看上去很自律，但家里没有任何缓冲，而在回撤底部被迫卖出，正是最先摧毁复利的那种行为。第二种是为了匹配把缴款拉到每月吃掉太多现金流、最后要靠借款过日子——这笔借款的利息完全可能超过缴款本身的税后价值。更隐蔽的失败是把匹配当成整个计划：一份拿满的匹配，如果放在 1.0% 费率加 15% 税收拖累的产品里，在长周期上仍然跑输同样一笔钱放在计划外的低费指数基金。',
        },
        {
          priority: 2,
          metric: '收益口径 —— 名义 CAGR、实际收益，以及你真正拿到的税后收益',
          fixFirst:
            '第二项修收益口径，因为它是模型里每一个美元都要乘上的那个数，而这里最常见的错误——用名义收益建模、把它当成计划——会让 30 年的结果高估三成以上。把投影重建在三行上：基准表给出的名义 CAGR、扣掉通胀后的实际收益（实际 =（1 + 名义）÷（1 + 通胀）− 1，10% 名义在 3% 通胀下是 6.8% 实际）、以及你真正会持有的那个账户类型的税后收益，也就是名义收益减去应税券商账户每年 0.5-1.5% 的拖累。按三者中最低的那条来规划。验证用 72 法则：7% 的翻倍时间是 10.3 年，所以一个说 5 年就翻倍的模型是输入错了，不是计划好。',
          alsoMoves:
            '选对口径改变的是你能拿这个计划做什么，而不只是你怎么汇报它。按实际收益建模的规划会逼你用同一个通胀率去膨胀每一笔未来支出，于是 4% 法则变成「实际支出的 4%」而不是名义的 4%，步骤 1 定下的目标也就不会悄悄漂移。它同时改变步骤 5 的账户排序：应税账户只有在税收拖累最小的资产上才说得通，所以口径选择和账户选择必须一起做。而三行之间的差额就是整个计划诚实的浮动区间——是一个区间而不是一个数，这正是让一个坏年份不至于变成一次策略切换的东西。',
          backfire:
            '这一行的失败模式是「只有乐观那一行能成立」的计划。如果模型在 7% 实际收益下达标，而在税后 5.5% 实际收益下崩掉，这个计划就是照着一个不会重复的数字定尺寸的，于是第一个真正糟糕的年份就逼你在最坏的时点削减缴款或去追收益。另一个版本是用算术平均代替 CAGR：一个先涨 50% 再跌 50% 的组合，算术平均是 0%，CAGR 却是 −13.4%，所以取平均恰好会美化那些最需要被诚实建模的高波动资产。还有一个隐蔽版本是把通胀折算做了两遍——收益里扣一次、未来支出贴现时又扣一次，悄悄每轮吃掉一个百分点的实际收益，让一个本来站得住的计划看起来无解。',
        },
        {
          priority: 3,
          metric: '费率拖累、税收拖累与资产摆放 —— 毛回报与净回报之间的漏斗',
          fixFirst:
            '第三项修拖累，因为跟收益假设不同，这一项今天就能测、完全由你掌控，而且在整个周期里一直对你反向复利：1.0% 管理费对 0.05% 指数基金是每年约 0.95% 的逆风，在 40 年上约等于终值的 25%。给每一笔持仓查清费率与换手成本，然后把税收最重的资产搬进免税账户——债券进递延账户、股票进 Roth 或应税账户——这一项每年值 0.2-0.5% 且不增加任何风险。验证方式：在模型第一行写下加权平均费率与加权平均税收拖累，并确认应税账户里没有任何被这个账户类型重罚的高换手或高分红持仓。',
          alsoMoves:
            '减少拖累是唯一一个「既不用多担风险、也不用多掏钱」就能改善计划的杠杆。每减掉一个百分点的净拖累，就相当于把期限拉长几个月；在时间紧张的计划里，这可能就是按时达标与两年后达标之间的差别。它同时与第一、二行互相作用：净收益越低，越该把钱放进免税账户；免税余额越大，资产摆放就越值钱。而且费率与税收是确定的、收益是概率的，所以这是计划里唯一一块不必等市场结果就能验证的部分——也正因为如此，坏年份里最安全的动作就是动它。',
          backfire:
            '这里的陷阱是：降费率通常意味着搬家，而搬家正是税务事故发生的地方。在应税账户里卖掉一只持仓去换更便宜的基金，会实现资本利得，可能把一整年的收益推进你本来想躲开的那一档，于是 1% 的费率节省到手时附了一张 15-20% 的税单——节省是真的，但当年净额是负的。另一个陷阱是为了降费率而改策略：把宽基指数换成更便宜更集中的基金，看起来是省钱，实际是加风险。最经典的疏漏是嫌卖出手疼，于是把 1.0% 的产品留着不动——这正是那只产品最后变成你以为早已防住的终值 25% 的过程。',
        },
        {
          priority: 4,
          metric: '缴款额、缴款频率与开始时点 —— 机械的复利杠杆',
          fixFirst:
            '第四项修缴款，因为它反馈最快的杠杆：收益要等市场给，费率是既成事实，而缴款改动一个发薪周期内就能在余额上看到，且没有下行面。把目标倒推成每月需要的金额——同一个 7%、30 年的计划，终点是 USD 1,500,000 时它会直接告诉你每月要投多少——然后把它自动化，设置在发薪日当天或之前扣。再把按年改成按月，在 30 年 7% 的计划上，光是时点就值终值的 3-5%；如果开始时点已经过了，就把它往前挪，因为每推迟一年就砍掉曲线最肥那一端的一个复利周期。验证方式：确认自动扣款日期在发薪日当天或之前，并跑一遍「推迟场景」，让未来任何中断的代价先变成一个你见过的数字。',
          alsoMoves:
            '缴款额是在市场不配合时让计划继续按轨走的那个变量，所以它天然是对冲第二行收益口径风险的工具。提高缴款同时抬高免税账户余额，这又让资产摆放更值钱、让第一行的匹配领取更值钱。而且因为缴款是固定金额、余额是变量，积累期里它顺手就把第五行的再平衡活干了——这就是为什么定投驱动的计划比市场驱动的计划需要更少的人工干预。',
          backfire:
            '这一行有两种常见失败，而且都表现为「计划被放弃」而不是「计划算错」。第一种是按一个好年份的收益定缴款额、再当成永久的：12% 的年份不是新基准，一笔假设它会重复的缴款会在第一个平淡年份被砍掉——而那恰恰是这笔钱最要紧的时候。第二种是把缴款提到把应急金悄悄掏空：没有缓冲的定投计划在第一次失业时就会断，而在那时卖出资产，就是把一次市场回撤变成永久损失。更隐蔽的版本是：按月缴款只有在钱不在现金里趴着的时候才创造价值——一笔到账后就躺在 0.4% 储蓄账户里的月度缴款，等于一笔从未复利的月度缴款。',
        },
        {
          priority: 5,
          metric: '资产配置 versus 你真正扛得住的那次回撤',
          fixFirst:
            '第五项修配置，因为它决定你会不会留在计划里，而留在计划里比任何单独一年的收益都值钱。先取你「不卖」也能扛住的最大回撤——多数家庭在股票部分大约是 40%——然后把股票占比设在这个回撤所允许的上限之内，滑翔路径的区间只当起点不当规则：35 岁前 90/10，45-55 岁 70/30，退休时 50/50 到 60/40。接着用真实的历史压力去检查，而不是用一个假想情景。验证方式：把配置写成带日期的百分比，再写出你会在哪个具体情景下卖出，并确认你对该情景的既定反应是再平衡而不是清仓。',
          alsoMoves:
            '配置是把你的收益假设变成「你拿得住的东西」的那一步，而拿住了才让其他每一行算数。它同时决定了终值余额的实际波动幅度，也就决定了你的目标里有多少依赖收益顺序、而不是依赖平均收益——一个用 70/30 走到同一个数字、但年度间波动小得多的组合，即便 CAGR 相同也是另一个计划。而且因为配置决定了哪类资产放进哪个账户，它和第三行的资产摆放本就是同一个决定：分开处理，必然有一方把另一方undo掉。',
          backfire:
            '失败方式是按「历史回报最好的那个配置」来选，而不是按「你住得下去的那个」。一个按 10% 历史名义收益建模的 100% 股票组合，在纸面上赢过所有保守方案，然后在第一个糟糕的十年里送来 50% 的回撤——那时收益假设已经不重要了，因为你已经不在计划里。更隐蔽的版本是滑翔路径：机械滑翔的组合恰好在回撤里卖出股票，而另一种做法会在同一个位置再平衡买进，所以滑翔路径不是中性的，它是一个「在弱势中系统性降低风险」的决定。反方向过度纠正——持有太多现金以至于 20 年期限根本达不到目标——则是把风险决策伪装成审慎。',
        },
        {
          priority: 6,
          metric: '提取期滑翔路径与收益序列风险 —— 积累期数学失效的那个阶段',
          fixFirst:
            '最后修这一项，而且只在你距离开始提取不到 10 年时才修，因为它和积累期是两个不同的问题，而积累期那套模型从你开始取钱那天起就失效。先把目标换算成支出数字——年支出 × 25 是 4% 法则的第一版，3.5-4.0% 是更稳的区间——然后设计一个能扛过糟糕开局序列的提取规则，而不是一个假设收益平滑的规则。具体危险在于退休头三年出现 −20%：同样幅度出现在晚期只会让组合寿命缩短 5-10 年，而出现在开头会让早期提取以更低价格卖出更多份额。对提取计划跑一遍「第一年崩盘」情景，如果撑不住，就把滑翔路径往 50/50 到 60/40 移。验证方式：写下提取率、放在组合外相当于 2 年支出的现金缓冲，以及市场跌 20% 时第一年的应对方案。',
          alsoMoves:
            '把提取期的问题提前解决，改变的是你在积累期的做法，不只是之后的事：一个第一年就要付账的组合需要现金缓冲，而这个缓冲会改变配置——提供缓冲的债券部分，收益低于本来会复利的股票部分。它也改变步骤 1 的目标，因为 4% 法则的目标和 3.5% 法则的目标，在同样的支出下差着好几年额外的储蓄。它还改变你读第五行的方式：积累期定下的回撤容忍度往往大于退休期你扛得住的度，而同样一次 40% 的下跌，在钱要付房贷的时候是完全不同的事件。',
          backfire:
            '经典错误是用积累期的算术去建模提取期：一旦你开始卖份额，「固定收益 + 固定缴款」这套解不了任何问题，于是投影看着很舒服，第一个糟糕序列就把它击穿。第二个错误是第一年的支出从组合里取，而不是在组合外留 2 年的支出缓冲——而这恰恰是把一次暂时下跌变成本金永久损失的原因。第三个是在好年份里提高提取率去支撑消费上涨，因为从回撤里恢复需要同样的平均收益做更多的活，所以被抬高的提取率会设定一个组合再也追不回来的目标速度。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A projection is only useful when every figure in it sits on the same basis, and seven conditions decide whether yours does. The target and the horizon come first, written as a figure and a year rather than as a wish, and the figure is checked against the 4 percent rule in reverse, because annual spending multiplied by 25 is a reasonable first pass and a wish is not. The allocation is then chosen from a glidepath that can be held through a 40 percent drawdown, with 90/10 stocks to bonds under 35, 70/30 around 45 to 55 and 50/50 to 60/40 into retirement, and the expected return comes from a benchmark band rather than from last year\'s result. The contribution schedule is then modelled with monthly and annual compounding side by side, so the timing effect is explicit rather than assumed, and the simple-interest line is read to see how much of the ending balance is compounding and how much is deposits. The tax-aware scenarios run next: the same plan at nominal return, at nominal minus the drag of a taxable account, and at the real return, and the spread between those three is the honest planning range. The account order follows, with the employer match taken first. Rebalancing runs on a rule, annually or at a fixed band. And the glidepath is re-checked as the horizon shortens, because a mix that survives accumulation is not a mix that survives the first year of withdrawals.',
      items: [
        {
          step: 1,
          label: 'Set a numeric target, a horizon year, and the spending it funds',
          gate:
            'The target is one dollar figure and one calendar year — for example USD 1,500,000 at age 65 — and its first-pass value equals annual spending multiplied by 25 under the 4% rule; the inflation rate used to grow that spending figure (2-3% a year) is written down beside it, and the spending number itself is stated in today’s dollars.',
          blockIf:
            'A target of "as much as possible" cannot be tested, and a target stated in today’s dollars without an inflation rate silently shrinks the spending it buys. Without the reverse 4% rule calculation you cannot tell whether the target is generous or impossible, because the same number is 25 times annual spending or 100 times your savings rate depending on which direction you solve from. And if the year is missing, every downstream number — the required contribution, the allocation, the withdrawal rate — is unfalsifiable, so there is nothing for the annual re-run in step 7 to check against.',
        },
        {
          step: 2,
          label: 'Bind the allocation to a drawdown you could actually sit through',
          gate:
            'The equity and bond shares are written as percentages with the date they were set, the equity sleeve is sized so that its worst historical drawdown (about 40% for a broad equity index) stays inside the tolerance you wrote down, and the allocation is mapped to an expected return band from the benchmark table rather than to last year’s return.',
          blockIf:
            'An allocation nobody could hold through its own stress test is a return assumption, not a plan: the portfolio that beats every cautious option on paper is also the one that sells at the bottom of a 40% drawdown, which is the single behaviour that turns a market loss into a permanent one. If the return band is taken from last year’s performance rather than from the long-run table, the plan is built on a number with a near-certainty of not repeating. And if the drawdown tolerance is not written as a number, there is no test to fail — the decision becomes a matter of nerve on the worst possible day.',
        },
        {
          step: 3,
          label: 'Model the contribution schedule and separate compounding from deposits',
          gate:
            'The model takes principal, monthly contribution, expected annual return, compounding frequency and years — for a 30-year plan that is 360 monthly compounding periods; the monthly and annual compounding cases are both run, and the simple-interest comparison line is read so that the share of ending value coming from compounding rather than from deposits is stated as a number.',
          blockIf:
            'Without the monthly-versus-annual pair you cannot see the timing effect, and without the simple-interest line you cannot tell how much of the balance is your money and how much is the compounding on it. Those two omissions together let a plan look successful because the contributions grew while the return assumption quietly did most of the work — or look hopeless for exactly the same reason in reverse. If the modelled contribution does not match your actual payroll deduction, the model describes a plan you have not started, and every number in it is fiction.',
        },
        {
          step: 4,
          label: 'Run the nominal, after-tax and real scenarios in one table',
          gate:
            'The same plan is modelled at the nominal return, at the nominal return minus the 1.0% taxable-account drag, and at the real return; all three ending values are written in the same table, and the planning range is stated as the spread between the highest and the lowest of the three, expressed both in dollars and in months of additional saving.',
          blockIf:
            'Running only one of the three lines is what produces a plan that fails for the wrong reason. The nominal line overstates a 30-year outcome by more than 30% in a taxable account, and the real line understates it if you also deflate the spending you plan to do. If the three numbers are not in one table, you cannot see which assumption is doing the damage, so the fix gets applied to the wrong variable. And if the spread is not converted into months of saving, the range stays abstract and the plan has no response attached to it.',
        },
        {
          step: 5,
          label: 'Fund the accounts in the written priority order, match first',
          gate:
            'Every dollar is assigned to a specific account in this order — employer 401(k) up to the full match, then the HSA if eligible, then the Roth IRA, then the remaining 401(k) space, then taxable — the deferral rate that captures 100% of the match is written next to it, and each account’s annual contribution limit is checked against the amount assigned to it.',
          blockIf:
            'The order is not a preference, it is a ranking by guaranteed return, and skipping it is the single most expensive common mistake: an unmatched dollar earns market returns while a matched dollar earns an immediate 50% on top of them. If the match is not at 100%, every later line in this checklist is being funded in the wrong sequence, and the tax-advantaged space you are saving for a Roth or an HSA is being spent on a return you could have had for free. If the amounts are not checked against the per-account limits, the overflow silently lands in the taxable account, which is the most heavily taxed of the five.',
        },
        {
          step: 6,
          label: 'Write the rebalancing rule down with its band and its date',
          gate:
            'The rule is stated in advance as either annual on a fixed date or a 5 percentage-point band breach from the target weights, the target weights themselves are written as percentages, and the trades are arranged not to trigger taxable gains in the taxable account unless the band breach is larger than the tax cost of the trade itself.',
          blockIf:
            'Rebalancing without a written rule is market timing with a better story: the drift that gets corrected is the drift you happened to notice. And a rule without the taxable-account tax check is a rule that quietly transfers money to the tax authority — in a taxable account, a 5-point band breach on a small allocation can cost more in capital gains than the drift was ever worth. Without the target weights written as numbers there is nothing to measure the drift against, so the rule cannot be followed even in principle.',
        },
        {
          step: 7,
          label: 'Re-run annually with actual balances and attribute the change',
          gate:
            'The model is re-run each year with the actual ending balance, the actual contributions made and the actual time elapsed; the difference between the projected and the actual ending value is attributed to contributions, to fees and tax drag, and to market return as 3 separate lines, and the resulting time-to-target figure is recomputed from the new balance.',
          blockIf:
            'Re-running the model with the same inputs produces the same number and tells you nothing, which is why actual balances and actual elapsed time have to replace the projections. Without the three-way attribution a shortfall looks like bad luck and gets answered by chasing return, when in fact the shortfall usually came from the fee and tax drag lines or from a contribution that lapsed. And without a recomputed time-to-target, the plan has no way to signal that it needs more contribution or less spending — the deviation is visible but not actionable.',
        },
      ],
    },
    zh: {
      intro:
        '一份复利计划值不值得跑，看七件事，而每一件都可能被一份算术上没问题、实际上没法用的投影蒙混过去。目标与期限排在最前，写成一个数字和一年，而不是一个愿望；这个数字再按 4% 法则反过来验，因为年支出乘 25 是个像样的初值，愿望不是。资产配置随后从一条扛得住 40% 回撤的滑翔路径里选——35 岁前 90/10、45 到 55 岁 70/30、退休时 50/50 到 60/40——预期收益取自基准区间，而不是去年的成绩。缴款计划随后把按月与按年复利并排放，让时点效应显式出现而不是被假设掉，同时读一遍单利对照线，看终值里多少来自复利、多少来自本金。税感场景接着跑：同一份计划跑名义收益、名义减去应税账户拖累、以及实际收益，三者之间的跨度才是诚实的规划区间。账户顺序随后排定，雇主匹配先拿。再平衡按规则走，年度执行或触到固定带宽就动手。滑翔路径随后随期限缩短重看一遍，因为扛得住积累期的配置，未必扛得住提取的第一年。',
      items: [
        {
          step: 1,
          label: '写下数字目标、目标年份，以及它要支撑的支出',
          gate:
            '目标是一个金额加一个年份——比如 65 岁时 USD 1,500,000——且它的第一版数值等于 4% 法则下的「年支出 × 25」；用来膨胀这笔支出的通胀率（每年 2-3%）写在旁边，支出金额本身以今天的美元口径陈述。',
          blockIf:
            '「越多越好」的目标无法被检验，而用今天的美元写目标却不给通胀率，会悄悄缩水这笔钱将来买得到的东西。没有用 4% 法则反推，你无法判断这个目标是宽裕还是不可能——同一个数字，视你从哪个方向解，是年支出的 25 倍，还是你现在储蓄率的 100 倍。如果年份缺失，后面每一个数——所需缴款、配置、提取率——都无法证伪，于是步骤 7 的年度重跑就没有任何东西可以对照。',
        },
        {
          step: 2,
          label: '把资产配置绑在你真扛得住的那次回撤上，并写下容忍度',
          gate:
            '股票与债券的占比写成带设定日期的百分比，股票部分的规模要保证其历史最差回撤（宽基股票指数约 40%）落进你写下的容忍度之内，且配置是从基准表的预期收益区间映射来的，不是用去年的收益。',
          blockIf:
            '没人能扛过自己压力测试的配置只是收益假设，不是计划：纸面上赢过所有保守方案的组合，恰恰就是那个在 40% 回撤底部卖出的组合，而卖在底部是把市场亏损变成永久损失的唯一行为。如果收益区间取自去年的表现而不是长期表，这个计划就是建在一个几乎确定不会重复的数上。如果回撤容忍度没有写成数字，就没有可以失败的检验——这个决定在最坏的那天变成了一场胆量考试。',
        },
        {
          step: 3,
          label: '建模缴款计划，并把复利贡献与本金投入分开看',
          gate:
            '模型输入初始本金、每月缴款额、预期年化收益、复利频率与年限（30 年计划对应 360 个月度复利周期）；按月复利与按年复利两种情形都要跑，再用单利对比行读出「终值中有多少来自复利而非缴款」并把它写成一个数。',
          blockIf:
            '没有按月与按年的对照，你看不到时点效应；没有单利那一行，你分不清余额里有多少是你自己的钱、有多少是这些钱的复利。这两个缺失叠在一起，会让一个计划因为缴款在长而看起来成功、而收益假设其实默默承担了大部分工作——或者反过来，看起来绝望的其实是同一个原因。如果模型里的缴款和你的实际工资扣款对不上，这个模型描述的是一个你还没开始的计划，里面每个数都是虚构的。',
        },
        {
          step: 4,
          label: '把名义、税后、实际三个情景放进同一张表对照',
          gate:
            '同一个计划分别按名义收益、按名义收益减 1.0% 的应税账户拖累、按实际收益各跑一次；三个终值写在同一张表里，规划区间用最高与最低两者的差额表示，并且同时用金额和「还需要多存多少个月」两种方式写下来。',
          blockIf:
            '只跑三行里的一行，正是计划「因为错误的原因而失败」的来源。名义那行会把应税账户 30 年的结果高估三成以上，而实际那行如果你又把计划中的支出贴现一次就会低估。三行不在一张表里，你就看不出到底是哪个假设在捣鬼，于是修复会打在错的变量上。如果差额没有换算成「多存多少个月」，这个区间就始终抽象，而计划也就没有配得上的应对动作。',
        },
        {
          step: 5,
          label: '按写好的账户优先级注资，先把雇主匹配额度拿满',
          gate:
            '每一块钱都被指派到具体账户，顺序是：雇主 401(k) 直到拿满匹配，其次是合资格时的 HSA，再是 Roth IRA，然后是 401(k) 的剩余额度，最后是应税账户；能拿到 100% 匹配的缴款率写在旁边，并且每个账户的年度缴款上限都与分配给它的金额核对过。',
          blockIf:
            '这个顺序不是偏好，是按确定性回报排的名次，跳过它是最昂贵的常见错误：没被匹配的美元只赚市场回报，而被匹配的美元在市场回报之上立刻多赚 50%。如果匹配没到 100%，这份清单后面的每一行都在按错误顺序被注资，而你原本留给 Roth 或 HSA 的免税额度，正被花在一份你本来可以免费拿到的回报上。如果金额没有跟各账户上限核对，超出部分会悄悄落进应税账户——五个账户里税务最重的那一个。',
        },
        {
          step: 6,
          label: '把再平衡规则连同触发区间和执行日期都写下来',
          gate:
            '规则事先写定：要么每年固定日期执行，要么偏离目标权重 5 个百分点触发；目标权重本身写成百分比，并且交易安排成在应税账户里不触发资本利得，除非偏离幅度大于这笔交易本身的税负成本。',
          blockIf:
            '没有书面规则的再平衡，只是故事讲得更好听的择时：被修正的漂移，只是你恰好注意到的那些漂移。而没有应税账户税务校验的规则，是一条悄悄把钱交给税务机关的规则——在应税账户里，一个小仓位上的 5 个百分点偏离，资本利得可能比那段漂移本身还贵。如果目标权重没有写成数字，就没有东西可以拿来量漂移，于是这条规则连原则上都无法执行。',
        },
        {
          step: 7,
          label: '每年用实际余额重跑模型，并把差异归因到三行',
          gate:
            '每年用实际期末余额、实际已缴金额与实际已过时间重跑模型；预测终值与实际终值之间的差额被拆成缴款、费率与税收拖累、市场收益 3 行分别归因，并据新的余额重算达标所需时间。',
          blockIf:
            '用同一组输入重跑模型只会得到同一个数，什么也说明不了——所以实际余额与实际已过时间必须替换掉投影值。没有这三行归因，一个缺口看起来像运气不好，于是被用「去追收益」来回应，而实际上缺口通常来自费率与税收拖累那两行，或者来自一笔中断过的缴款。如果没有重算达标所需时间，计划就没有办法告诉你它需要更多缴款还是更少支出——偏离看得见，却落不到行动上。',
        },
      ],
    },
  },
};
