// P166 —— F 类（Investment & Real Estate）主题「mortgage-strategy-comparison」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个利率/首付/资格行 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」—— howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不涉及模型单价，但涉及利率、百分比与借款人自己的现金流阈值）：
//   百分比与金额都是读者自己的经营阈值，不是随 bot 漂移的市场价 ⇒ 手写可以，但必须带口径。
//   本文件里的每个数字都自带：分子、分母、期间（合同期 vs 实际持有期）、量级、单位。
//   利率口径：名义年合同利率（contract rate），按 30 年摊销表计；ARM 用「指数 + 利差」的
//     全额指数化利率做压力测试；名义 ≠ 实际 —— 实际利率 =（1 + 名义）÷（1 + 通胀）− 1，
//     通胀没写进模型时，固定利率的长期成本被系统性低估。
//   现金流口径：除特别标注外均为**税前**口径；房贷利息税盾单独成行（24% 边际税率下
//     7% 名义房贷的税后成本约 5.3%，32% 边际税率下约 4.8%）—— 不扣税盾就比期限，会在
//     税率最高的人身上得出相反的结论。
//   NOI vs 总收益：出租分支的分子是 NOI（有效毛收入 − 运营支出，不含按揭本息），
//     不是毛租金；用毛租金当分子会把收益率高估 5-10%。
//   提前还款 vs 持续持有：提前还款的机会成本 = 这笔现金税后能拿到的回报，
//     不是「省下的利息」；两侧都要扣税。
//   再融资风险：利率锁定（固定）vs 浮动（ARM），以及未来再融资的成交成本 2-5% 贷款额。
//   金额一律以美元计，示例量级写在行内（如 USD 400,000 房款、USD 200/月 提前还款），
//     避免读者按自己的规模套错。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A mortgage decision is four numbers pulling against each other: the payment you qualify for, the payment you can still carry if the rate resets, the interest you pay over the tenure you actually keep, and the return you earn on the cash you would otherwise prepay. Repair them in the wrong order and each fix undoes the one before it, so the sequence starts with the constraint that cannot be negotiated, which is qualification: front-end debt-to-income of 28 percent and back-end of 36 percent on a conventional loan, 31 and 43 with compensating factors on an FHA loan, residual income on a VA loan. If you are over those limits, the loan amount is too high and the answer is a smaller price or a larger down payment, not a better rate. Then the structure comparison, where a 30-year fixed and a 15-year fixed are read on principal and interest, total interest, principal paid by year 5 and by year 10, and the break-even tenure at which the 15-year lifetime interest saving exceeds the higher monthly burden, typically 5 to 7 years, so a buyer who moves at year 4 was right to take the 30-year even though it costs twice the interest. Then the reset risk, since a 5/1 ARM year-6 rate is the index plus a lender margin of roughly 2.75-3.25 percent, which is 7.5 percent if the index is 4.5 percent and the margin 3 percent. Then the rent-versus-buy horizon, where round-trip transaction costs of 6-8 percent push the real break-even out to 5-7 years. And then the pure finance choices, prepay and refinance triggers, which are only worth taking once the other three are settled.',
      rows: [
        {
          priority: 1,
          metric: 'Front-end and back-end DTI — the loan amount you can actually qualify for',
          fixFirst:
            'Start here, because DTI is a qualification gate rather than a preference: no choice of term, rate structure or lender fixes a file that does not qualify. Compute both ratios on gross monthly income before taxes, put principal, interest, taxes and insurance in the front-end numerator and every monthly debt payment in the back-end numerator, and check them against the limit attached to your program — 28/36 for conventional, 31/43 for FHA, residual income for VA. If you are over, the only fixes are a smaller loan amount, a larger down payment, or a longer tenure that lowers the monthly payment; none of them is a negotiation with the rate desk. Verify by re-running the amortization on the reduced loan amount and confirming that both ratios sit at least 2 percentage points below their limits, because a file that qualifies exactly at the ceiling leaves no room for the escrow shock in year two.',
          alsoMoves:
            'Every number in the strategy inherits this ceiling, which is why it comes first. A 15-year term that clears 28/36 only at a smaller price also leaves more cash outside the loan, which changes the rent-versus-buy comparison at step 3 and the prepay-versus-hold arithmetic at step 5, because that cash stays available. Down payment size also sets your PMI exposure and how much of the asset you are not levered on, so a qualification-driven down payment bump is simultaneously a risk decision. And the back-end ratio is what the lender re-checks the moment you add any new debt, so clearing it with headroom now is what keeps the loan refinanceable in step 6.',
          backfire:
            'Borrowing the maximum the lender approves is the standard way this row makes the next five worse. Stretch to the ceiling on both ratios and you have optimised for approval rather than for affordability, so the first escrow reassessment, the first insurance renewal or the first tax-bill jump puts you over a limit you are already carrying — and the fix then is a refinance at a worse rate rather than a smaller loan you chose freely. The subtler version is correcting a DTI problem with a longer term: it lowers the monthly payment and clears the ratio, but it maximises the interest you pay over your real holding period and pushes your break-even tenure out, converting a qualification problem into a cost problem in row three.',
        },
        {
          priority: 2,
          metric: 'Rate structure — fixed lock against an ARM reset and the refinance it depends on',
          fixFirst:
            'Fix the rate structure second, once you know the payment ceiling from row one. Model the 30-year fixed, the 15-year fixed and the 5/1 or 7/1 ARM on the same purchase price and the same loan amount, then stress the ARM at the fully indexed rate at its first reset — the index plus the lender margin, for example 4.5% SOFR plus a 3.00% margin giving 7.5% — and again at the maximum the cap structure permits, typically a 2 percentage point annual cap and a 5 point lifetime ceiling over the start rate. Take the ARM only if the stressed payment still fits inside the front-end DTI headroom you proved in row one. Verify by writing the stressed payment next to the unstressed one and confirming that the difference is affordable from cash flow you could still pay with no income for six months.',
          alsoMoves:
            'The rate structure sets the whole interest sensitivity of the strategy. A fixed rate converts a future rate decision into a known monthly number, which lets you commit to a longer term and capture the interest savings in row three without carrying a reset; an ARM buys a lower starting payment and therefore a larger loan, and that larger loan is what makes the rent-versus-buy and cash-flow tests in steps 3 and 4 pass in the first place. It also decides whether the refinance in step 5 is a genuine option or a necessity, because a deal that only works at the ARM start rate has no refinancing flexibility at all.',
          backfire:
            'The classic error is taking the ARM because its start rate is lower and treating the cap structure as protection, when the caps limit only how fast the rate rises, not where it lands: a 2/2/5 ARM can still reach a fully indexed rate that breaks the payment. Worse, the ARM’s lower start payment usually unlocks a larger loan, so the strategy then fails on two axes at once — the payment resets upward and the asset was sized to the lower number. The other backfire is assuming you will refinance before the reset: refinancing needs the property to have appreciated or rates to have fallen, and if you needed the ARM because your cash flow was thin, you are the least able to absorb a refinance that carries closing costs of 2-5% of the loan amount.',
        },
        {
          priority: 3,
          metric: 'Loan term against the tenure you actually keep — the break-even year',
          fixFirst:
            'Fix the term third, because it is the one lever that trades lifetime interest against equity velocity, and it only has a right answer against a tenure you have actually decided on. Model the 30-year and the 15-year amortization on the same loan amount and the same rate basis, read the year at which the 15-year’s lifetime interest saving exceeds the extra payment you carry, and compare that year to the year you expect to sell or refinance. If your holding period is shorter than the break-even, the 15-year costs you more and builds you less equity; if it is longer, the 15-year is usually worth the payment. Verify by writing the break-even year next to your expected exit year, and if the gap is under 12 months, keep the 30-year — that gap is not worth spending your cash-flow cushion on.',
          alsoMoves:
            'Term is what makes the prepayment branch in step 5 and the rent-versus-buy branch in step 3 meaningful at all. A 15-year amortizes roughly three times faster, so the equity you build per month is a different number and the break-even horizon against renting moves with it; a 30-year keeps more of each payment as interest early, which is why a five-year horizon almost never favours the short term. Term also feeds the debt-service coverage test and the refinance trigger, because both the balance you would refinance and the payment you would carry change when the term changes.',
          backfire:
            'Picking the 15-year for the equity build alone is how a good decision turns into a cash-flow squeeze: the extra monthly payment is usually funded out of the same savings that step 5 wants to prepay with, so the two repairs compete for the same dollars. And the interest comparison itself misleads if you use the full amortization as the horizon when you will sell in year six — a 15-year loan paid for six years has cost less total interest than the 30-year at the same year, not more. The third trap is quoting the 15-year’s rate advantage as if it were free: the spread between a 15-year and a 30-year contract rate is roughly 100 basis points today, so that difference has to be priced into the comparison rather than assumed away.',
        },
        {
          priority: 4,
          metric: 'Prepayment versus continued holding — the opportunity cost of your own cash',
          fixFirst:
            'Fix the prepayment decision fourth, because once the payment ceiling, the rate structure and the term are set, the last free variable is the cash you are holding against the loan. Model the extra USD 200 a month principal-only payment on the loan from step 1 and recompute the payoff date — a 30-year at 7% typically falls from 30 years to roughly 22 — then price the alternative: what would that same USD 200 a month earn after tax if it stayed invested, and what would it earn if you needed it in year three. The comparison is a spread between two numbers you control. Verify by writing both sides on one line: the after-tax return on the cash you spend on prepayment, against the marginal after-tax cost of the debt you pay down, which is your mortgage rate net of the interest deduction.',
          alsoMoves:
            'Prepayment is the only mortgage decision that also changes the return on the cash you keep, so it links this row to every other strategy question. Because principal-only payments shorten the amortization, they also change the equity you hold at any future sale date and the balance you would refinance, which feeds the exit assumptions in step 5 and the rent-versus-buy horizon in step 3. And because extra principal shrinks the interest deduction, a prepayment made early in the tax year reduces that year’s benefit, which matters most in the first three years of the loan when the deduction is largest.',
          backfire:
            'Prepaying out of an emergency fund is the most common way this row breaks the plan underneath the other four. It looks like a win on the amortization schedule and leaves you with a thin buffer, and a thin buffer is what forces a distressed sale or a distressed refinance exactly when rates are high and your job is uncertain. The reverse error is just as damaging: prepaying a 7% mortgage with cash that could earn 7% after tax elsewhere is a negative-spread trade dressed up as discipline. The subtle version is the tax shield: at a 24% marginal rate the after-tax cost of mortgage debt is about 5.3%, so if your disciplined after-tax investment return is below that, prepaying is right — and if you model the mortgage rate without netting the deduction, you draw the wrong conclusion in the wrong direction.',
        },
        {
          priority: 5,
          metric: 'Holding horizon against the rent-versus-buy break-even and the exit assumption',
          fixFirst:
            'Close the chain on the horizon, because every row above is a rate and a payment, and only this one decides whether the strategy is the right strategy at all. Model the break-even against renting on your actual rent, your actual price, your actual carry costs and a round-trip transaction cost of 6-8% of price, then compare that break-even year to the year you would realistically sell. If you plan to move inside the break-even window, the arithmetic favours renting even when the monthly payment is lower than rent, and no rate structure changes that. For an income property the same horizon is the refinance timeline: model the refinance at a rate 100 basis points above your going-in rate and an exit capitalisation rate 100 basis points wider, and confirm the cash flow survives both.',
          alsoMoves:
            'The horizon decides whether the equity you built is realised or forfeited, and it sets the size of the transaction-cost drag you already paid: a 6-8% round-trip spread means a three-year hold gives back most of the down payment in cost, while a seven-year hold lets the rent you avoided accumulate against it. On the investment side the horizon is the same variable as the exit capitalisation rate assumption and the IRR window, and it is what tells you whether the refinance in step 5 has enough time to work before the loan resets.',
          backfire:
            'Running the break-even at your optimistic tenure is the standard way to talk yourself into a purchase: the same model with a five-year hold says renting is cheaper and with a ten-year hold says buying wins, so the assumption does the work instead of the arithmetic. The other backfire is holding a variable-rate loan into a rising-rate environment with a short horizon, because the payment resets in year six while your sale is planned for year five — you are forced to sell at the exact point where the market is worst. And a horizon computed on rent alone ignores that renting carries no exit cost: the 6-8% round-trip applies only to the buyer.',
        },
      ],
    },
    zh: {
      intro:
        '按揭决策其实是四个数字在互相拉扯：你能获批的月供、利率重置后你仍能扛住的月供、你实际持有期内要付的利息，以及那笔「本来可以提前还款」的现金本身能赚到的回报。顺序错了，前一步的效果会被后一步抵消。所以第一段从没有商量余地的约束开始——资格：常规贷款的前端负债收入比 28%、后端 36%，FHA 是 31/43 并可用补偿因素，VA 走剩余收入法。超了这些线，答案不是去找更低的利率，而是贷款额太高，于是要么降房价、要么多付首付。接着是结构对比：30 年固定与 15 年固定要同时读本金利息、总利息、第 5 年与第 10 年已还本金，以及 15 年的终身利息节省开始超过更高月供的那个回本年限——通常是 5 到 7 年，所以第 4 年就搬走的买家当初选 30 年是对的，哪怕它总利息多一倍。然后是重置风险：5/1 ARM 第 6 年的利率是指数加贷款人利差（约 2.75-3.25%），指数 4.5%、利差 3% 就是 7.5%。然后是租购临界，往返 6-8% 的交易成本会把真实临界推到 5-7 年。最后才是纯财务选择——提前还款与再融资触发点，而它们只有在前三项定下来之后才值得动。',
      rows: [
        {
          priority: 1,
          metric: '前端与后端 DTI —— 你实际能拿到的贷款额度上限',
          fixFirst:
            '先修这一项，因为 DTI 是资格闸门而不是偏好：贷款类型、年限、贷款机构都救不了一份根本不合规的申请。用税前月毛收入算两个比率，前端分子放本金、利息、税与保险，后端分子放所有债务月供，再对照你所属项目的上限——常规 28/36，FHA 31/43，VA 用剩余收入测试。超限只有三种修法：压低贷款额、提高首付、或者拉长年限压低月供，没有一种是和利率台谈出来的。验证方式：用调整后的贷款额重跑摊销表，确认两个比率都至少低于各自上限 2 个百分点，因为刚好卡在线上的档案扛不住第二年托管费的重估。',
          alsoMoves:
            '策略里其他每一个数字都继承这个上限，所以它必须排第一。一份只有把房价压低才能过 28/36 的 15 年贷款，同时也意味着你把更多现金留在了贷款之外——这会改变步骤 3 的租购对比，也会改变步骤 5 的提前还款与否，因为那笔钱还在你手上。首付规模同时决定你的 PMI 敞口和你没有加杠杆的那部分资产占比，所以「为了过资格而多付首付」本质上同时是一个风险决策。后端比率还是你新增任何一笔债务时贷款人要重新核的那个数，现在留出余量，才保得住步骤 6 里再融资的可能性。',
          backfire:
            '按贷款人能批的最高额度借满，是让这一行把后面五行都拖下水最常见的做法。两个比率都顶到线，你就优化的是「能批下来」而不是「扛得住」，于是第一次托管费重估、第一次保险续费、第一次税单跳涨，就会把你顶到已经背着的那条线之上——那时能修的只剩一次利率更差的再融资，而不是一笔你本来可以自由选择的小一点的贷款。更隐蔽的版本是用拉长年限来修 DTI：月供降下来了、比率过了，但你在真实持有期内付的利息被拉到最大、临界持有期被推远——你把一个资格问题换成了第三行里的成本问题。',
        },
        {
          priority: 2,
          metric: '利率结构 —— 固定锁定 versus ARM 重置，以及它依赖的再融资',
          fixFirst:
            '第二项修利率结构，前提是第一行已经给出月供上限。在同一个房价、同一个贷款额上把 30 年固定、15 年固定、5/1 或 7/1 ARM 各跑一遍，然后用「指数 + 利差」的全额指数化利率给 ARM 做首次重置的压力测试——例如 4.5% SOFR 加 3.00% 利差等于 7.5%——再按限额结构允许的最高值跑一次，常见是年度 2 个百分点、终生高于起始利率 5 个百分点。只有当压力月供仍落在第一行验证过的前端 DTI 余量里，才考虑 ARM。验证方式：把压力月供与原月供并排写出来，确认两者之差在你连续六个月没有收入的情况下也付得起。',
          alsoMoves:
            '利率结构决定了整个策略对利率的敏感度。固定利率把一次未来的利率决策换成一个已知的月供数字，于是你敢承诺更长的年限、不必背着重置风险把第三行的利息节省拿走；ARM 换来的是更低的起始月供，而更低的月供通常解锁更大的贷款额，而正是这个更大的额度让步骤 3 与步骤 4 的租购与现金流测试能过。它同时决定步骤 5 的再融资是真正的选项还是被迫的刚需——一笔只有在 ARM 起始利率下才成立的交易，根本没有再融资的腾挪空间。',
          backfire:
            '经典的错误是因为 ARM 起始利率更低就选了它，并把限额结构当成保护——可限额限制的是上涨的速度，不是终点：一个 2/2/5 的 ARM 完全可以重置到一个全额指数化利率、把月供压垮的价位。更糟的是，ARM 更低的起始月供往往会解锁更大的贷款，于是策略同时在两个轴上失败——月供向上重置，而当初买下的资产是按更小的数字定的尺寸。另一个反噬是假设自己能在重置前再融资：再融资需要房价涨了或利率跌了，而如果你当初选 ARM 就是因为现金流薄，你恰恰最承受不起一笔带 2-5% 贷款额成交成本的再融资。',
        },
        {
          priority: 3,
          metric: '贷款年限 versus 你实际持有的年限 —— 临界年份',
          fixFirst:
            '第三项修年限，因为它是唯一一个「终生利息对权益积累速度」的交易杠杆，而它只有在对照一个你已经决定好的持有期时才有正确答案。在同一个贷款额、同一利率口径上把 30 年与 15 年摊销表跑出来，读出「15 年的终生利息节省超过你多付的月供」那一年，再和你的预计卖出年或再融资年对照。持有期短于临界年，15 年既更贵、攒的权益又更少；持有期长于临界年，15 年通常值得那份月供。验证方式：把临界年写在预计退出年旁边，如果两者差距不到 12 个月，就留 30 年——这点差距不值得拿你的现金流缓冲去换。',
          alsoMoves:
            '年限是步骤 5 的提前还款分支与步骤 3 的租购分支得以成立的前提。15 年的摊销速度大约是 3 倍，所以你每月攒下的权益是完全不同的数字，对租的临界年限也随之移动；30 年在前期把月供的大部分都付成了利息，这就是为什么五年的持有期几乎从来不支持短年限。它同时喂给偿债覆盖率测试与再融资触发条件——你要再融资的余额和你要背的月供，都随年限而变。',
          backfire:
            '纯粹为了权益增速而选 15 年，是好决策变成现金流挤压的标准路径：多出来的月供通常正是步骤 5 想拿去提前还款的那笔储蓄，于是两个修复在抢同一笔钱。而且利息对比本身就误导人——如果你用完整摊销期当比较期，而你其实在第六年就卖，那么付了六年的 15 年贷款累计利息其实比同期的 30 年更少，不是更多。第三个陷阱是把 15 年相对 30 年的利率优势当成白拿的：今天两者合同利率大约差 100 个基点，这个差必须被算进比较，而不是当作不存在。',
        },
        {
          priority: 4,
          metric: '提前还款 versus 持续持有 —— 你自己那笔现金的机会成本',
          fixFirst:
            '第四项修提前还款，因为当月供上限、利率结构、年限都定下来之后，最后一个自由变量就是你手上对着贷款的这笔现金。在步骤 1 的贷款上跑每月额外 USD 200 只还本钱的分支，重算还清日期——30 年、7% 通常从 30 年缩到约 22 年——然后给替代方案定价：这笔 USD 200 每月如果留着投资，税后能赚多少；如果第三年急用，它又值多少。这个比较就是两个你都能控制的数之间的差额。验证方式：把两行写在同一行上——花掉它做提前还款的现金税后回报，对比你还掉的债的边际税后成本，也就是你的房贷利率扣掉利息抵扣之后的那个数。',
          alsoMoves:
            '提前还款是唯一一个「同时改变你手上那笔现金回报」的按揭决策，所以它把这一行和其余所有策略问题连在一起。因为只还本会缩短摊销期，它同时改变你未来任一卖出日上的权益，以及你要再融资时的余额——这又喂给步骤 5 的退出假设与步骤 3 的租购临界期。而且因为多还的本金会缩小利息抵扣，年初做的提前还款会压低当年的税盾，而这件事在前三年最重要，因为那正是抵扣额最大的时候。',
          backfire:
            '拿应急金去提前还款，是这一行把下面四行一起掀翻最常见的做法。它在摊销表上看着是赢的，却把你留成薄缓冲，而薄缓冲恰恰会在利率高、你的工作又不确定的时候，逼你低位卖出或低价再融资。反方向的错误同样致命：用一笔在别处税后能赚 7% 的现金去提前还 7% 的房贷，是一笔负利差交易，只是穿上了纪律的外衣。更隐蔽的版本是税盾：24% 边际税率下房贷的税后成本约 5.3%，所以只要你有纪律的税后投资回报低于这个数，提前还款就是对的——而如果你建模时没扣税盾，你会朝着相反的方向得出相反的结论。',
        },
        {
          priority: 5,
          metric: '持有期 versus 租购临界期，以及退出假设',
          fixFirst:
            '最后收口在持有期，因为上面每一行都是利率和月供，只有这一行决定这个策略本身对不对。用你实际的租金、实际的房价、实际的持有成本，加上往返 6-8% 的交易成本，把租购临界期算出来，再和现实中的卖出年对照。如果你打算在临界窗口之内搬家，算术会偏向租房，哪怕你的月供比租金还低，而换任何利率结构都改不了这个结论。对出租房来说，同一个持有期就是再融资时间线：按比入场高 100 个基点的利率、按比入场宽 100 个基点的退出资本化率各跑一遍，确认现金流两次都活得下来。',
          alsoMoves:
            '持有期决定你攒下的权益是被兑现还是被没收，也决定你已付出的交易成本拖累有多大：往返 6-8% 的价差意味着持有三年会把首付的大部分以成本形式吐回去，而持有七年则让你省下的租金有机会跟这部分成本对冲。在投资侧，持有期同时就是退出资本化率假设和 IRR 窗口本身，它还告诉你步骤 5 的再融资有没有足够时间在贷款重置之前跑完。',
          backfire:
            '用乐观的持有期去跑临界期，是说服自己买房的标准路径：同一个模型，持有五年说租房更划算，持有十年说买房更划算，于是干活的是假设而不是算术。另一个反噬是拿着浮动利率贷款、带着短持有期进入利率上行环境——月供在第六年重置，而你的卖出计划在第五年，等于被逼在市场最差的时点出场。还有一个常见错误是只用租金算临界期，忘了出租没有退出成本：6-8% 的往返价差只落在买方身上。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A mortgage comparison is only as good as the definitions behind it, and six conditions decide whether yours is. The three structures are modelled first on the same purchase price, a 30-year fixed, a 15-year fixed and the 5/1 or 7/1 ARM, and each is read on principal and interest, total interest, principal retired by year 5 and by year 10, and the tenure at which the shorter term lifetime interest saving overtakes its higher monthly burden. Debt-to-income comes next, both the front-end and the back-end, because a loan that exceeds the limit does not get a better rate, it gets a smaller loan, and the honest response is a lower purchase price or a larger down payment rather than a third application. The rent-versus-buy horizon is then run on the specific property, with the down payment, closing costs, principal and interest, tax, insurance and maintenance on one side and rent, renters insurance and the opportunity cost of the down payment on the other, because the round-trip transaction cost of 6-8 percent is what pushes the real break-even out to 5-7 years. For a rental purchase the renovation budget is then validated against the post-rehab valuation, since half a point of gross cap rate is the difference between positive and negative cash flow. And the financial levers come last, the extra monthly principal payment that turns a 30-year into roughly 22, the refinance trigger and the biweekly schedule, because they optimise a loan you have already decided to take.',
      items: [
        {
          step: 1,
          label: 'Model three loan structures on one price and one loan amount',
          gate:
            'The 30-year fixed, the 15-year fixed and the 5/1 or 7/1 ARM are each computed on the same purchase price and the same loan amount, and each row reports monthly principal and interest, lifetime interest, principal repaid by year 5 and by year 10, and the break-even tenure year — with the rate basis written down (contract rate on a 30-year amortizing schedule) so the three rows are genuinely comparable.',
          blockIf:
            'Three structures priced on different loan amounts or different rate bases are not a comparison, they are three separate deals. If the amortization schedules disagree on the purchase price, the shorter term looks cheaper or dearer for reasons that have nothing to do with the term, and every later step inherits the error. If the break-even year is missing, you cannot compare the term decision with the rent-versus-buy horizon in step 3 at all, and the strategy gets chosen on monthly payment alone — the number most likely to be wrong by the largest amount.',
        },
        {
          step: 2,
          label: 'Prove DTI headroom on the exact loan amount you will request',
          gate:
            'Front-end DTI at or below 28% and back-end DTI at or below 36% of gross monthly income for a conventional file, 31/43 for FHA, with taxes and insurance inside the front-end numerator and every monthly debt payment inside the back-end numerator; each ratio is written with at least 2 percentage points of headroom below its limit.',
          blockIf:
            'Qualification is binary and it is checked against your lender’s numbers, not yours. If the front-end ratio is computed on principal and interest alone, or the back-end ratio omits a car loan or a student payment, the file can be approved and then re-underwritten, and the correction arrives as a re-price or a decline after you have already signed the purchase contract. If there is no headroom below the limit, the escrow reassessment in year two has nowhere to go, and you end up solving a cash-flow problem under time pressure.',
        },
        {
          step: 3,
          label: 'Set the rent-versus-buy break-even against a stated holding period',
          gate:
            'The break-even year is computed from your actual rent, your actual price, principal and interest plus taxes, insurance and maintenance on the buy side, rent plus renters insurance on the rent side, and a round-trip transaction cost of 6-8% of the purchase price; the break-even year is written next to your expected sale year and falls at least 12 months before it.',
          blockIf:
            'A break-even computed without the round-trip transaction cost is optimistic by several years, and that optimism is what turns a marginal purchase into a bad one. If the break-even year is not stated as a single number, the comparison stays a feeling, and the feeling usually favours buying because the monthly payment feels smaller than rent. If your expected sale year falls inside the break-even window, then every upstream choice — term, rate structure, prepayment — is being optimised for an asset you plan to exit before it pays back.',
        },
        {
          step: 4,
          label: 'Validate the rental sequence on post-rehab numbers, or mark it not applicable',
          gate:
            'For an income property, the post-rehab capitalisation rate is at least 8% of the after-repair value, cash-on-cash after the refinance is at least 10%, and debt service coverage sits between 1.0 and 1.25 times; for an owner-occupier the step is marked not applicable in writing, with the ownership carry cost of 1-3% of value per year recorded as the substitute line.',
          blockIf:
            'Underwriting a rental on the as-is rent roll is how a 12% going-in capitalisation rate turns into negative cash flow once real vacancy and reserves are applied. If the rehabilitation budget is left out of the cash-invested denominator, cash-on-cash is overstated by the entire rehab cost and the deal never funds the next one. And if this step is skipped entirely for an owner-occupier, the ownership carry cost never enters the rent-versus-buy comparison, which quietly biases every horizon number in step 3.',
        },
        {
          step: 5,
          label: 'Run the prepayment and biweekly branches with an opportunity cost',
          gate:
            'The extra USD 200 a month principal-only branch is modelled on the loan from step 1, the payoff date is recomputed (a 30-year fixed at 7% falls to roughly 22 years), and the after-tax return on the same cash held outside the loan is written on the same line as the marginal after-tax cost of the debt being paid down.',
          blockIf:
            'Without the payoff date, an extra USD 200 a month looks like a rounding error against a 30-year schedule and the branch gets dismissed without being tested. Without the return on the cash side, the comparison is one-sided and every prepayment looks like a win, including the ones funded from an emergency fund. If the prepayment also shrinks your interest deduction and you have not noted that, the after-tax cost of the debt is overstated and you will systematically under-prepay.',
        },
        {
          step: 6,
          label: 'Stress the adjustable rate at the fully indexed rate and the cap breach',
          gate:
            'For any ARM, the payment at the first reset is computed as the index plus the lender margin — for example 4.5% SOFR plus a 3.00% margin giving 7.5% — and again at the maximum the cap structure permits, typically the 2 percentage point annual cap; both stressed payments stay inside the front-end DTI headroom proved in step 2, and the 2-5% of loan amount closing costs of a future refinance are reserved.',
          blockIf:
            'The caps limit the speed of the rate, not its destination: a fully indexed rate can sit well above the start rate even when no single adjustment exceeds 2 percentage points, so a file that survives only the start payment has no margin at all. If the refinance closing costs are not reserved, the exit in step 5 and the payoff in step 3 both assume a cheaper exit than actually exists. And if you cannot state the index and the margin from the loan estimate, you are not modelling the risk you signed up for.',
        },
      ],
    },
    zh: {
      intro:
        '按揭对比能不能撑起一个决定，看六件事，而每一件都可能成立、而结论仍然指向错误的结构。三种结构先在同一个房价上建模——30 年固定、15 年固定、5/1 或 7/1 ARM——每一种同时读本金利息、总利息、第 5 年与第 10 年已还本金，以及短期限的终身利息节省开始盖过它更高月供的那个年限。负债收入比紧随其后，前端与后端都要，因为超限的贷款不会拿到更好的利率，只会拿到更小的额度，而诚实的回应是降房价或多付首付，而不是第三次申请。租购临界随后按具体那套房子跑：一边是首付、过户成本、本金利息、税费、保险与维护，一边是租金、租客保险与首付的机会成本，而 6-8% 的往返交易成本正是把真实临界推到 5-7 年的东西。如果是买出租房，还要在承诺装修预算之前用装修后估值验证，其中半个百分点毛资本化率就是正现金流与负现金流的分界。最后才轮到纯财务杠杆——每月多还的本金把 30 年压到大约 22 年、再融资触发点、每周两次的还款节奏——因为它们优化的是一笔你已经决定要背的贷款。',
      items: [
        {
          step: 1,
          label: '在同一个房价、同一个贷款额上建模三种贷款结构',
          gate:
            '30 年固定、15 年固定、5/1 或 7/1 ARM 各自用同一个购买价、同一个贷款额算出来，每一行都给出月供本金与利息、终生利息、第 5 年与第 10 年已还本金、以及临界持有年；利率口径写在旁边（30 年摊销表上的名义合同利率），确保三行真的可比。',
          blockIf:
            '用不同贷款额或不同利率口径算出来的三种结构不是比较，是三笔独立的交易。如果摊销表对不上同一个房价，短年限就会因为与年限无关的原因显得更便宜或更贵，后面每一步都继承这个错误。如果临界年缺失，你根本没法把年限决策和步骤 3 的租购临界期放在一起看，整个策略就只能靠月供来选——而月供恰恰是最容易错、错得最多的那个数。',
        },
        {
          step: 2,
          label: '按你实际要申请的贷款额证明 DTI 有余量',
          gate:
            '常规档案前端 DTI 不高于 28%、后端 DTI 不高于 36%（税前月毛收入的比率），FHA 为 31/43；前端分子含税与保险，后端分子含所有债务月供；两个比率都要写在各自上限之下至少 2 个百分点的余量。',
          blockIf:
            '资格是二元的，而且是用贷款人的数、不是你的数来核的。前端比率如果只算了本金利息、或者后端比率漏了一笔车贷或助学贷款，档案可能先批后被重新承销，更正以重新定价或拒批的形式到达——那时你已经签了购房合同。如果上限之下没有余量，第二年托管费重估就无处可去，你会在时间压力下处理一个现金流问题。',
        },
        {
          step: 3,
          label: '把租购临界期对照一个写下来的持有期与卖出年',
          gate:
            '用你实际的租金、实际的房价、买房侧的月供本金利息加税加保险加维护、租房侧的租金加租客保险，加上房价 6-8% 的往返交易成本，算出临界年；临界年写在预计卖出年旁边，并且至少早 12 个月。',
          blockIf:
            '不把往返交易成本算进去的临界期会乐观好几年，而这份乐观正是把一笔边际的购买变成糟糕购买的原因。如果临界年没有落成一个具体数字，比较就还是一种感觉，而感觉通常偏向买房——因为月供看起来比租金小。如果你的预计卖出年落在临界窗口之内，那么上游每一个选择（年限、利率结构、提前还款）都在为一笔你打算在回本之前就退出的资产做优化。',
        },
        {
          step: 4,
          label: '用装修后的数字验证出租流程，或写明本步不适用',
          gate:
            '出租房：装修后 ARV 上的毛资本化率不低于 8%、再融资后现金回报率不低于 10%、偿债覆盖率在 1.0 到 1.25 倍之间；自住房：本步书面标注不适用，并以每年持有成本占价值 1-3% 作为替代行写下来。',
          blockIf:
            '用装修前的租约清单去承销出租房，真实的空置与准备金一上，12% 的入场资本化率就会变成负现金流。如果装修预算没进「投入现金」的分母，现金回报率会被整个装修成本高估，这笔交易就再也融不出下一笔的钱。而如果自住房干脆跳过这一步，持有成本就不会进入租购对比，于是步骤 3 里所有关于持有期的数字都被悄悄带偏。',
        },
        {
          step: 5,
          label: '跑提前还款与双周还款分支，并把机会成本算上',
          gate:
            '在步骤 1 的贷款上跑每月额外 USD 200 只还本钱的分支，重算还清日期（30 年固定、7% 通常缩到约 22 年），并在同一行写下这笔钱留在贷款外的税后回报，与被偿还债务的边际税后成本对照。',
          blockIf:
            '没有还清日期，每月额外的 USD 200 放在 30 年摊销表里就像个可忽略的零头，这个分支连试都不会被试。没有现金那侧的对等数字，比较就是单边的，于是每笔提前还款看起来都是赢家——包括那些拿应急金做的。如果你没有记录提前还款会缩小利息抵扣这件事，债务的税后成本就被高估，你会系统性地提前还款不足。',
        },
        {
          step: 6,
          label: '用全额指数化利率与限额突破值给 ARM 做压力测试',
          gate:
            '任何 ARM 都要算首次重置时的月供＝指数 + 利差（例如 4.5% SOFR 加 3.00% 利差等于 7.5%），再按限额结构允许的最高值算一次（常见为年度 2 个百分点）；两个压力月供都落在步骤 2 已证明的前端 DTI 余量之内，并且为未来再融资预留 2-5% 贷款额的成交成本。',
          blockIf:
            '限额限制的是利率上涨的速度，不是终点：即使每一次调整都没超过 2 个百分点，全额指数化利率也可能远高于起始利率，所以一份只扛得住起始月供的档案根本没有余量。如果再融资的成交成本没有预留，步骤 5 的退出与步骤 3 的还清都在假设一个并不存在的更便宜的退出。如果你连贷款预估单上的指数与利差都说不出来，那你建模的根本不是你签下的那个风险。',
        },
      ],
    },
  },
};
