// P166 —— F 类（Investment & Real Estate）主题「cap-rate-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个等级/市场/业态行 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」—— howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不涉及模型单价，涉及资本化率、百分比与读者自己的资产规模）：
//   百分比与金额都是读者自己的经营阈值，不是随 bot 漂移的市场价 ⇒ 手写可以，但必须带口径。
//   本文件里的每个数字都自带：分子、分母、期间（年度 NOI vs 远期 NOI）、量级、单位。
//   NOI vs 总收益：资本化率的分子是 NOI = 有效毛收入 − 运营支出（**不含**按揭本息），
//     不是毛租金；用毛租金当分子会把收益率高估 5-10%。
//   名义 vs 实际：资本化率是名义收益率。实际 =（1 + 名义）÷（1 + 通胀）− 1；
//     6% 名义资本化率在 3% 通胀下只有约 2.9% 实际。
//   税前 vs 税后：NOI 是税前口径、且在融资之前；按揭利息与折旧在报税时抵扣，
//     所以「税后现金流」既不等于 NOI，也不等于 NOI − 年偿债。
//   无杠杆 vs 杠杆后：资本化率是无杠杆收益率（NOI ÷ 价值）；现金回报率是有杠杆收益率
//     （偿债后年现金流 ÷ 投入现金）。两者不可互换。
//   提前还款 vs 持续持有：负利差（债务成本 > 资本化率）时，每还一元本金都是在毁掉 NOI 收益；
//     是否提前还款取决于「边际债务成本 vs 边际无杠杆收益率」，不是取决于本金。
//   再融资风险 / 利率锁定 vs 浮动：5/1 ARM 重置 + 资本化率扩张会同时打击两端（现金流与估值）。
//   金额一律以美元计，示例量级写在行内（如 USD 400,000 房价、USD 60,000 NOI），
//     避免读者按自己的规模套错。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A property deal has four numbers that fail in a fixed order, and the failure rarely starts where people look. The first to break is the net operating income, because it is the numerator of everything downstream and the only one you can rebuild from your own rent roll: effective gross income is gross rent less a vacancy allowance of 5 percent for institutional stock, 8-10 percent for Class B and C, and 12-15 percent for Class D, and operating expenses then take property tax, insurance, maintenance, management and reserves but never the mortgage. The second is the price you pay relative to the band, where a going-in cap inside the band means you are paying market, below it means you are underwriting a premium, and above it means either a discount or trouble you have not seen. The third is the debt on top, since leverage is what turns an unlevered yield into a cash return and a 7 percent loan on a 5 percent property is a different asset from the same property unlevered. The fourth is the cash you actually put in, because cash-on-cash divides by the down payment plus closing plus reserves, not by the purchase price. The exit comes after, modelled with a cap 25-100 basis points above the entry for the conservative case and 25-50 below for the compression case, on forward NOI growing 2-4 percent a year. And the refinance is last, because a rate locked at entry that cannot survive to the refinance date is a promise the deal never made. The capitalisation rate is NOI divided by purchase price, unlevered and before tax, and a 6 percent going-in cap at 3 percent inflation is a 2.9 percent real yield.',
      rows: [
        {
          priority: 1,
          metric: 'NOI quality — the vacancy and expense assumptions behind the numerator',
          fixFirst:
            'Fix the NOI first, because the capitalisation rate is a ratio and this is its numerator: every assumption made here propagates into the yield, the exit valuation and the debt sizing, and it is the cheapest thing to verify because it comes off a rent roll rather than a market view. Rebuild it from gross annual rent: subtract vacancy at the rate that matches the asset class and the neighbourhood you actually have — 5% for institutional stock, 8-10% for Class B and C, 12-15% for Class D — then subtract property tax at 1-3% of value, insurance at 0.5-1%, maintenance at 5-10% of effective gross income, management at 6-10% of effective gross income, and reserves at 2-5%. Verify that the result is NOI and not gross rent, that no mortgage payment appears anywhere in the expense list, and that the resulting rate sits against the band before you look at anything else.',
          alsoMoves:
            'A disciplined NOI changes the size of the deal as well as its yield: it sets the loan amount the property can service, so a realistic vacancy assumption typically forces a smaller loan or a bigger down payment, which is a far better answer than discovering the shortfall at the refinance. It also sets the forward NOI used in the exit model, and since sale price is forward NOI divided by the exit cap, a 5 percentage point error in the exit year carries into the sale price at full weight. And because NOI is exactly what a buyer rebuilds in their own model, a NOI you cannot defend line by line is a NOI that gets re-underwritten at a lower price during the sale negotiation.',
          backfire:
            'The two standard errors pull in opposite directions. Optimistic NOI — a 5% vacancy on a Class C property in a tertiary market, or reserves left out entirely — inflates the yield and makes a marginal deal look like a good one, and the correction arrives at the refinancing or at the sale, when it is a price negotiation you have already lost. Conservative NOI is safer but not free: modelling 15% vacancy on a stabilised asset overstates the discount, so you either walk away from a good deal or under-size the loan and leave returns on the table. The trap that combines both is mixing bases: using gross rent in the numerator while computing maintenance against effective gross income produces a NOI that reconciles to nothing and hides the error inside the ratio instead of the inputs.',
        },
        {
          priority: 2,
          metric: 'Going-in capitalisation rate against the class and sub-market band',
          fixFirst:
            'Fix the entry rate second, once the NOI is defensible, because the band is what tells you what you are paying and for what risk. Compare your going-in rate — NOI divided by purchase price — against the band for your exact combination of class, market tier and sector: Class A in a gateway market is 4-5.5%, Class B 5.5-7%, Class C 7-9.5%, Class D above 10%, and a tertiary market should trade 75-150 basis points above the national median while a gateway market trades 50-100 below it. A rate inside the band means you are paying market and must be paid back by rent growth, operating leverage or leverage. A rate below the band means you are underwriting premium and have to believe in appreciation. A rate above the band means either a genuine discount or a problem the rate is pricing. Verify by writing the band, the market spread adjustment and your own rate on one line, with the band’s source and date attached.',
          alsoMoves:
            'The entry rate determines what the exit has to deliver and what the property can carry in debt service. It also tells you which of the three return drivers you are actually underwriting: cap rate compression, rent growth, or operating leverage. A deal bought 100 basis points below the band is underwriting compression, which is the driver you cannot control and the one that disappears first when the Fed turns. And the entry rate is the number that decides whether the refinance in row six releases more capital than you put in, because the cash-out is a function of appraised value, and appraised value is a function of the going-in rate you accepted.',
          backfire:
            'Buying below the band because the seller is motivated is the most common way this row sets up a failure that surfaces two years later: the deal pencils on rent and then depends on a cap rate that will not compress, so the return that justified the price never arrives and the only exit is a sale at the band rate you should have paid on day one. The opposite error is buying above the band and calling it a bargain — a rate 200 basis points above the band usually means deferred maintenance, a tenant rollover you have not modelled, or a market where you cannot sell in five years, and that discount is the market pricing a problem you have to fix with cash you have not budgeted. The subtle version is applying the wrong band: a national median applied to a tertiary-market Class C asset is a systematic 75-150 basis point understatement.',
        },
        {
          priority: 3,
          metric: 'Debt load — DSCR, interest coverage, and unlevered versus levered yield',
          fixFirst:
            'Fix the leverage third, because the capitalisation rate tells you what the asset earns before financing and says nothing about what it earns after — and a high cap rate with too much debt is negative cash flow wearing a good yield as a disguise. Model the loan at 65-75% LTV for conventional rentals or 70-80% for multifamily, on a 30-year amortising schedule, and compute debt service coverage as NOI divided by annual debt service. Treat anything below 1.25 times as the danger zone rather than as the target, and below 1.0 as a deal that does not service from its own income. Then compare the levered cash-on-cash against the unlevered cap rate: if the debt costs more than the asset yields, leverage is a negative spread and every dollar of debt reduces your return. Verify by writing the stressed rate — the fully indexed rate plus a 100 basis point cap breach — next to the payment and confirming coverage still clears 1.25.',
          alsoMoves:
            'Leverage is what converts a modest unlevered yield into a respectable levered one, and that conversion is why the cap rate alone will always understate the return on a good deal: a 7% cap at 70% LTV and a 6% rate produces roughly 12% cash-on-cash, while the same asset at 80% LTV produces roughly 17%. It also determines the equity multiple in row five, because both cash flow and sale proceeds scale with the leverage you chose. And it sets how much room you have to absorb the operating expense drift that the NOI in row one already flagged — a deal at 1.35 times coverage can absorb a bad year of expenses, and one at 1.10 times cannot.',
          backfire:
            'The classic over-leverage mistake is reaching for cash-on-cash by raising LTV without re-running the exit, and an 80% LTV deal is a bet that the exit cap will not expand: when it expands 100 basis points, the sale price falls 15-20% and the higher monthly payment does not fall with it. The second mistake is taking floating-rate debt on the strength of the current rate, so the debt service resets upward exactly when cap rates are expanding — the yield leg and the cost leg move against you at the same time. And the subtler version is measuring coverage on NOI that includes reserves, because a property paying its debt service out of reserves is not covered; it is liquidating its own balance sheet to make the payment.',
        },
        {
          priority: 4,
          metric: 'Cash-on-cash return measured against the full cash actually invested',
          fixFirst:
            'Fix the denominator fourth, because cash-on-cash is the number most often quoted with the wrong denominator and the wrong label. Cash-on-cash is the annual cash flow after debt service divided by the cash actually invested — the down payment, the closing costs at 2-5% of the loan amount, the reserves, and, if this is a renovation, the entire rehabilitation budget — not just the down payment. Divide by the down payment alone and you can report 30% on a deal that returns 12%. Then check the result against the target for what you are doing: 10% or better for a straight buy-and-hold, 15% or better for a renovation strategy you intend to refinance out of. Verify by listing every dollar that left your account before the property produced its first dollar of cash flow, and confirming that sum is the denominator in your formula.',
          alsoMoves:
            'Getting the denominator right is what tells you whether the strategy funds itself. A deal at 11% cash-on-cash on the full invested cash can be refinanced and repeated with the proceeds, which is the entire point of the renovation strategy, while the same deal at 11% on the down payment alone may leave nothing after a second round of transaction costs. It also interacts with row three: every extra dollar of cash you inject lowers the LTV, which lowers the debt service, which raises cash-on-cash — so the denominator and the coverage ratio move together. And the closing costs and reserves you add here are exactly the money that is unavailable to you if the market turns, which is why a high cash-on-cash on a fully loaded denominator is a different animal from the same number on a stripped one.',
          backfire:
            'Stripping the denominator is the easiest way to make a bad deal look good, and it hides precisely the costs that decide whether the strategy repeats. The second failure is counting the renovation budget as recoverable when it is not — money spent on the property is spent, and treating it as part of the equity you get back at the sale is the most common arithmetic error in the renovation strategy. And a third: quoting cash-on-cash as if it were the return, when it is a single-year figure that ignores the sale entirely, so a property with a strong first year and a weak exit can show 15% cash-on-cash and still destroy capital across the hold period.',
        },
        {
          priority: 5,
          metric: 'Exit capitalisation rate spread and the equity multiple it produces',
          fixFirst:
            'Fix the exit fifth, because the entry rate sets the unlevered yield and the exit rate sets everything you actually collect, and only one of them is known on day one. Model the sale explicitly: exit cap 25-100 basis points above the going-in rate as the conservative case and 25-50 below as the aggressive compression case, forward NOI growing 2-4% a year on rent, and sale price equal to forward NOI divided by the exit cap. Then compute the equity multiple as sale proceeds plus cumulative cash flow divided by cash invested, and hold it against the target for the hold period — 2.0 times or better over 5-7 years, and below 1.5 times means the deal does not pencil without aggressive rent growth or cap rate compression. Verify by re-running the whole model with the conservative exit case before you commit, not with the base case.',
          alsoMoves:
            'The exit model is where the three return drivers get separated and priced: cap rate compression, rent growth and operating leverage. Modelling it forces you to notice which one the deal actually depends on, and a deal that works only under compression is a bet on the interest-rate cycle, the one thing you cannot hedge. It also sets the refinance timeline, because the cash-out that funds the next deal depends on appraised value, which depends on the exit cap the lender’s appraiser applies. And the equity multiple is the number that tells you whether to repeat the strategy at all, so it is an input to the decision in row six rather than a report you produce afterwards.',
          backfire:
            'Underwriting the exit at the going-in cap is the standard failure, and it hides the risk rather than removing it: if cap rates expand 100 basis points by the exit, the sale price falls 15-20% and the deal flips from positive to negative while every operating assumption stayed true. The subtler version is assuming compression without asking who is buying: the buyer at the exit is underwriting their own rate environment, and if rates are higher than yours, the cap rate they require is higher, not lower. And modelling the exit on forward NOI growing 4% while the rent roll supports 2% is a way to invent 15-20% of the sale price — forward NOI is the most optimistic line in the model because it assumes every unit stays occupied and every expense stays flat.',
        },
        {
          priority: 6,
          metric: 'Refinance risk — rate lock versus floating debt on the refinance timeline',
          fixFirst:
            'Fix this last, because it is the point at which every assumption above has to become cashable rather than theoretical, and because it is the only row where a decision you make today can be undone by a rate cycle you do not control. Decide whether the plan actually depends on refinancing: if the strategy is a renovation play that pulls capital out at appraised value, the debt must survive a refinance at a rate 100 basis points above the going-in rate, with closing costs of 2-5% of the new loan amount deducted from the cash-out. Model the refinance at both a fixed rate and the fully indexed rate of a 5/1 ARM — a 6.0-6.5% start rate against a 6.8-7.2% fixed rate — and check the cash-out and the coverage ratio in both. Verify by writing the cash-out available at each of those three rates and confirming you could carry the property for 12 months without the refinance.',
          alsoMoves:
            'The refinance decision is what converts the capitalisation rate into a realised return, so it is where the valuation of the whole strategy is settled. Locking a fixed rate protects the spread between the cap rate and the debt cost, which is the spread that produces cash-on-cash, and it protects it against the exact cycle event that would also expand the exit cap — the two risks are correlated, so a floating-rate loan hedges you into the wrong direction. It also determines whether the renovation budget is recovered: the cash-out depends on appraised value, which depends on the exit cap the appraiser applies, so a refinance at a higher rate and a higher appraised cap can leave you with the same leverage and less cash.',
          backfire:
            'The dangerous version is assuming the refinance will be available on the terms you modelled. Refinance availability is a function of the credit cycle and of the property’s own value, and if cap rates have expanded 100 basis points the appraisal falls with them, so the lender lends against a lower value and the cash-out shrinks at the same time the rate is worse. The second failure is holding a 5/1 ARM on a property whose cash flow only works at the start rate, so the reset at year six removes the coverage the deal was underwritten on. And the third is treating the refinance as risk-free because the property is good: a property with a 7% cap and a 6.5% debt cost is fine, and the same property refinanced at 8.5% is a negative spread that the rent roll has to cover from then on.',
        },
      ],
    },
    zh: {
      intro:
        '一笔房产交易的四个数字按固定顺序坏，而坏的地方通常不是人们先看的地方。最先坏的是 NOI，因为它是下游所有数字的分子，也是唯一能靠自己的租约清单重建的一个：有效毛收入 = 毛租金 ×（1 − 空置率），空置率取机构级 5%、B/C 级 8-10%、D 级 12-15%，运营支出再扣房产税、保险、维护、管理与储备，但按揭永远不进这个减项。第二个坏的是你付出的价格相对区间的高低——入场资本化率落在区间内即按市价付，落在区间下即承销溢价，落在区间上要么是折价，要么是你还没看见的麻烦。第三个是压在上面的债，因为杠杆才是把无杠杆收益率变成现金回报的东西：5% 的资产配 7% 的贷款，和同一处资产不举债，是两个东西。第四个是你真正掏进去的现金，因为现金回报率的分母是首付加过户加储备，不是房价。退出随后才排，按高于入场 25-100 个基点的保守情形与低 25-50 个基点的压缩情形建模，用的是年增 2-4% 的远期 NOI。再融资放在最后，因为入场时锁定的利率撑不到再融资那天，这笔交易就从未做出过那个承诺。全篇：资本化率 = NOI ÷ 买入价，无杠杆、税前，6% 的入场资本化率在 3% 通胀下只有约 2.9% 实际。',
      rows: [
        {
          priority: 1,
          metric: 'NOI 的质量 —— 分子背后那些空置率与费用假设',
          fixFirst:
            '先修 NOI，因为资本化率是个比率，而这就是它的分子：这里做的每一个假设都会传导进收益率、退出估值和债务规模，而且这是最便宜的一项验证——它来自你自己的租约清单，而不是某个市场观点。从毛年租金重建：按与你实际持有的资产等级和街区相称的空置率扣减——机构级 5%，B/C 类 8-10%，D 类 12-15%——再扣房产税（价值的 1-3%）、保险（0.5-1%）、维护（有效毛收入的 5-10%）、管理（有效毛收入的 6-10%）和准备金（2-5%）。验证方式：确认算出来的是 NOI 而不是毛租金、费用清单里没有任何按揭项，然后再把得到的资本化率放到区间里看。',
          alsoMoves:
            '一个站得住的 NOI 不只改收益率，也改交易的规模：它决定这处房产能背多少贷款，所以一个现实的空置假设通常会逼你把贷款额调小或首付调大——这远好于在再融资时才发现缺口。它同时决定退出模型里的远期 NOI，而卖出价 = 远期 NOI ÷ 退出资本化率，所以退出年份上 5 个百分点的误差会原封不动地传导进卖价。而且因为 NOI 正是买方会在自己的模型里重建的东西，一个你无法逐行辩护的 NOI，到谈判时会被按更低的价格重新承销。',
          backfire:
            '两个标准错误方向相反。乐观的 NOI——三线市场的 C 类物业套 5% 空置率、或者干脆不算准备金——会把收益率吹高，把一笔边际交易装成好交易；而修正会在再融资或卖出时到达，那时它已经变成一场你输掉的议价。保守的 NOI 更安全但不免费：给一栋已经稳定的资产套 15% 空置率会高估折让，于是你要么放弃一笔好交易、要么把贷款压小而白白让出回报。把两者合在一起的陷阱是口径混用：分子用毛租金，维护费却按有效毛收入算，得到的 NOI 对不上任何东西，而错误被藏在比率里而不是藏在输入里。',
        },
        {
          priority: 2,
          metric: '入场资本化率 versus 资产等级与子市场区间',
          fixFirst:
            '第二项修入场资本化率，前提是 NOI 已经站得住，因为区间才是告诉你「你在为什么风险付多少钱」的东西。把你的入场率——NOI ÷ 买入价——和你这套等级 × 市场层级 × 业态组合的区间对照：门户市场的 A 类 4-5.5%，B 类 5.5-7%，C 类 7-9.5%，D 类 10% 以上，三线市场应当比全国中位高 75-150 个基点、门户市场低 50-100 个基点。落在区间内即按市价付，你必须靠租金增长、运营杠杆或加杠杆赚回来；落在区间下即承销溢价，你得相信增值；落在区间上要么是真折价，要么是有一个被这个利率定价出来的问题。验证方式：把区间、市场利差调整和你自己的入场率写在同一行上，并附上区间的来源与日期。',
          alsoMoves:
            '入场率决定了退出必须交付什么，也决定这处房产能背多少偿债。它同时告诉你这笔交易到底在承销三大回报引擎里的哪一个：资本化率压缩、租金增长，还是运营杠杆。一笔比区间低 100 个基点买入的交易，承销的就是压缩——那恰恰是你控制不了、而且联储一转向最先消失的那一个。入场率还决定了第六行的再融资能不能把你放进去的资本套回来，因为套现额是评估价的函数，而评估价又是你当初接受的入场率的函数。',
          backfire:
            '因为卖家急售就买在区间之下，是这一行最常见的失败铺垫：交易在租金上能过账，然后依赖一个不会压缩的资本化率，于是当初支撑价格的回报始终不来，而唯一的出口就是按你本该第一天就付的区间价卖掉。反方向的错误是买在区间之上还叫它便宜——高出区间 200 个基点通常意味着延期维护、你没建模的租户换租、或者一个你五年都卖不掉的市场；而那个折价正是市场在给一个你得用没预算到的现金去修的问题定价。更隐蔽的版本是套错区间：把全国中位套到三线市场的 C 类资产上，是一个 75-150 个基点的系统性低估。',
        },
        {
          priority: 3,
          metric: '债务负担 —— 偿债覆盖率、利息覆盖，以及无杠杆与杠杆后收益之差',
          fixFirst:
            '第三项修杠杆，因为资本化率告诉你的是融资前这处资产赚多少，对融资后赚多少一个字都没说——而高资本化率配高债务，是披着好收益率外衣的负现金流。按常规出租 65-75% LTV、多家庭 70-80% LTV、30 年摊销建模，用 NOI ÷ 年偿债算债务偿债覆盖率。把低于 1.25 倍当作危险区而不是目标，低于 1.0 倍就意味着这处房产没法靠自己的收入偿债。然后把有杠杆的现金回报率和无杠杆的资本化率放在一起比：如果债务成本高于资产收益率，杠杆就是负利差，每多借一元都在压低你的回报。验证方式：把压力利率——全额指数化利率再加 100 个基点的限额突破——写在月供旁边，确认覆盖率仍然高于 1.25。',
          alsoMoves:
            '杠杆是把温和的无杠杆收益率变成体面的有杠杆收益率的那一步，也正因如此，只看资本化率永远会低估一笔好交易的回报：7% 的资本化率配 70% LTV、6% 的利率，产出约 12% 的现金回报率；同一处资产放到 80% LTV，产出约 17%。它同时决定第五行的股权乘数，因为现金流与卖出收入都随你选的杠杆放大。它还决定你有多少余地去吸收第一行 NOI 里已经标出来的运营支出漂移——覆盖率 1.35 倍的交易能扛过一年的坏支出，1.10 倍的扛不过。',
          backfire:
            '经典的过度杠杆手法是为了追现金回报率而抬高 LTV 却不重跑退出，而 80% LTV 的交易就是赌退出资本化率不会扩张：一旦扩张 100 个基点，卖价跌 15-20%，而更高的月供不会跟着跌。第二个错误是按当前利率去接浮动利率债务，于是债务成本恰好在资本化率扩张时向上重置——收益端和成本端同时朝相反方向走。还有一个更隐蔽的版本：用在包含准备金的 NOI 上算覆盖率，因为用准备金去付月供的房产不是被覆盖，而是在变卖自己的资产负债表来付款。',
        },
        {
          priority: 4,
          metric: '现金回报率，以及它真正对应的全部投入现金',
          fixFirst:
            '第四项修分母，因为现金回报率是最常被用错分母、贴错标签的数。现金回报率 = 偿债后年现金流 ÷ 你真正投入的现金——首付、成交成本（贷款额的 2-5%）、准备金，以及如果是翻修交易，整个翻修预算——而不是只除以首付。只除以首付，你可以把一笔真实回报 12% 的交易报成 30%。然后把结果和你要做的事的目标比：纯持有收租要 10% 以上，翻修加再融资套现要 15% 以上。验证方式：列出在房产产生第一块钱现金流之前从你账户里流出的每一块钱，并确认这个合计就是公式里的分母。',
          alsoMoves:
            '分母算对，才知道这套策略能不能自我供血。一笔按全额投入现金算 11% 现金回报率的交易，可以在再融资后用套出的钱重复下一轮——这正是翻修策略的全部意义；而同样一笔交易，按首付算也是 11%，在第二轮交易成本之后可能什么都剩不下。它同时和第三行互相作用：你多注入的每一块现金都降低 LTV，降低 LTV 就降低偿债，降低偿债就抬高现金回报率——分母和覆盖率是一起动的。而你在这里加上的成交成本与准备金，恰恰是你在市场转向时用不上的钱，所以「全额分母下的高现金回报率」与「剥掉分母后的同一个数」是两种完全不同的动物。',
          backfire:
            '剥掉分母是让坏交易看起来好看的最省事办法，而它藏起来的正是决定这套策略能不能重复的那些成本。第二个失败是把翻修预算当成可回收的钱——花在房产上的钱就是花掉了，把它当成卖出时能回来的权益，是翻修策略里最常见的算术错误。第三个是把现金回报率当成回报本身来说——它只是一个年度数字，完全无视卖出，所以一处第一年很强、退出很弱的房产可以显示 15% 的现金回报率，而整个持有期仍然在毁灭资本。',
        },
        {
          priority: 5,
          metric: '退出资本化率利差，以及它最终产出的股权乘数',
          fixFirst:
            '第五项修退出，因为入场率定的是无杠杆收益率，退出率定的是你真正收到的一切，而两者只有一个在第一天是已知的。显式建模卖出：退出资本化率比入场高 25-100 个基点作为保守情形、低 25-50 个基点作为激进压缩情形，远期 NOI 按租金增长 2-4%/年，卖出价 = 远期 NOI ÷ 退出资本化率。然后算股权乘数 =（卖出收入 + 累计现金流）÷ 投入现金，并对照持有期的目标：5-7 年要 2.0 倍以上，低于 1.5 倍意味着没有激进租金增长或资本化率压缩就不划算。验证方式：承诺之前用保守退出情形重跑整个模型，而不是用基准情形。',
          alsoMoves:
            '退出模型是三大回报引擎被分开定价的地方：资本化率压缩、租金增长、运营杠杆。建模它会逼你看清这笔交易究竟依赖哪一个，而只靠压缩才成立的交易，就是押注利率周期——那是你唯一对冲不了的东西。它同时设定再融资时间表，因为支撑下一轮的套现额取决于评估价，而评估价取决于贷款人评估师采用的退出资本化率。股权乘数还告诉你这套策略到底该不该重复，所以它是第六行那个决策的输入，而不是事后才出的一份报告。',
          backfire:
            '用入场资本化率去承销退出是标准失败，而且它是把风险藏起来而不是消除掉：如果退出时资本化率扩张 100 个基点，卖价跌 15-20%，交易从正转负，而所有运营假设都还成立。更隐蔽的版本是假设压缩却不问谁在买：退出时的买方在承销他自己的利率环境，如果他的利率比你高，他要求的资本化率就更高而不是更低。还有一个版本是用远期 NOI 按 4% 增长去建模退出，而租约清单只支持 2%——那是在凭空造出 15-20% 的卖价，因为远期 NOI 是模型里最乐观的一行：它假设每个单元都住满、每项费用都不涨。',
        },
        {
          priority: 6,
          metric: '再融资风险 —— 再融资时间线上的利率锁定 versus 浮动利率',
          fixFirst:
            '最后修这一项，因为它是上面每一个假设从「理论」变成「能兑现成现金」的地方，也是唯一一行里「你今天做的决定可以被你控制不了的利率周期推翻」的地方。先判断这套计划是否真的依赖再融资：如果策略是翻修套现，那么债务必须扛得住按比入场高 100 个基点利率的再融资，并且要从套现金额里扣掉新贷款额 2-5% 的成交成本。把再融资分别按固定利率和 5/1 ARM 的全额指数化利率建模——6.0-6.5% 的起始利率对上 6.8-7.2% 的固定利率——两种情形下都检查套现额与覆盖率。验证方式：写出这三种利率下各自能套出多少现金，并确认即使没有再融资，你也能把这处房产扛过 12 个月。',
          alsoMoves:
            '再融资决策是把资本化率变成已实现回报的那一步，所以整个策略的估值在这里结账。锁定固定利率守住的是资本化率与债务成本之间的那个价差，而现金回报率正是由这个价差产生的；同时它守住的还是那个会同时推高退出资本化率的周期事件——两个风险是正相关的，所以浮动利率贷款把你对冲到了错误的方向。它还决定翻修预算能不能收回来：套现额取决于评估价，评估价取决于评估师采用的退出资本化率，所以一次「利率更高 + 评估资本化率更高」的再融资，可能让你在杠杆不变的同时现金更少。',
          backfire:
            '危险的版本是假设再融资会按你建模的条款出现。再融资的可得性是信贷周期和房产自身价值的函数，而如果资本化率已经扩张 100 个基点，评估价跟着跌，于是贷款人按更低的估值放贷，套现金额在利率更差的同时一起缩水。第二个失败是拿 5/1 ARM 去扛一笔只有在起始利率下现金流才成立的房产，于是第六年的重置直接抹掉了当初承销时赖以成立的那个覆盖率。第三个是因为「房子不错」就把再融资当成无风险：一处 7% 资本化率配 6.5% 债务成本没问题，同一处房产按 8.5% 再融资就是负利差，此后只能靠租金来补。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Every number in a property deal has to sit on the same NOI, the same loan and the same exit, and six conditions decide whether yours do. The NOI is rebuilt line by line from the rent roll, gross rent less a stated vacancy allowance less operating expenses that stop before the mortgage, because a NOI that quietly includes principal and interest is a levered number wearing an unlevered label and every yield computed from it is wrong. The going-in cap is then compared with the band for that asset class and sub-market, and a tertiary-market Class C deal is expected to trade 75-150 basis points above the national median to pay for liquidity, tenant concentration and deferred maintenance. Leverage is then layered on, at 65-75 percent loan-to-value for conventional rentals and 70-80 percent for multifamily, with the rate stated as a 30-year fixed near 6.8-7.2 percent or a 5/1 ARM near 6.0-6.5 percent, and the monthly debt service subtracted. Cash-on-cash then divides by cash invested, down payment plus closing plus reserves, not by the price. The exit scenario follows, with forward NOI grown 2-4 percent and an exit cap 25-100 basis points above entry in the conservative case. And the equity multiple and refinance are checked last, against a 2.0 times target and 15 percent internal rate of return for a five-year hold.',
      items: [
        {
          step: 1,
          label: 'Build NOI from the rent roll with every expense line itemised',
          gate:
            'Effective gross income equals gross annual rent multiplied by (1 − vacancy%), with vacancy inside the class band (5% institutional, 8-10% for Class B and C, 12-15% for Class D); operating expenses are itemised as property tax at 1-3% of value, insurance at 0.5-1%, maintenance at 5-10% of effective gross income, management at 6-10% of effective gross income and reserves at 2-5%; NOI equals effective gross income minus operating expenses, with no mortgage payment anywhere in the expense list.',
          blockIf:
            'A capitalisation rate built on gross rent overstates the yield by 5-10%, and every downstream number inherits that: the loan the property can service, the sale price at the exit, the equity multiple. If the vacancy assumption comes from the asset class rather than from this property’s own rent roll — a lease that will not renew, a tenant who leaves, a unit that sits empty two months between tenants — then the NOI describes a different building. And if reserves are missing, the property is not covered by its own cash flow, it is covered by the balance sheet, and the first bad year arrives as an unexpected capital call instead of a smaller distribution.',
        },
        {
          step: 2,
          label: 'Compute the going-in cap and place it in the class and market band',
          gate:
            'The going-in capitalisation rate equals NOI divided by purchase price, written as one percentage next to the band for the exact class, market tier and sector (Class A 4-5.5%, Class B 5.5-7%, Class C 7-9.5%, Class D 10%+, tertiary markets +75 to +150 basis points versus the national median, gateway −50 to −100); the band carries a source and a date.',
          blockIf:
            'A going-in rate without a band is a number rather than a judgement, and it cannot tell you what you are paying for what risk. If the band is a national median applied to a sub-market that trades 75-150 basis points away, you carry a systematic error of the same size into every downstream calculation — the yield, the exit price, the loan size. And if the band carries no date, it is a number from a cycle phase you have not identified, which is exactly how an entry priced for one cycle gets justified with a band from another.',
        },
        {
          step: 3,
          label: 'Layer the financing and prove the debt service coverage ratio',
          gate:
            'Loan amount, rate, amortisation and term are all stated (65-75% LTV for conventional rentals or 70-80% for multifamily; 30-year amortisation; 6.8-7.2% on a 30-year fixed or 6.0-6.5% on a 5/1 ARM), monthly debt service is computed, and annual cash flow after debt service equals NOI minus annual debt service; DSCR equals NOI divided by annual debt service and clears 1.25, with the coverage recomputed at the fully indexed rate.',
          blockIf:
            'Coverage is the test that tells you the property services its own debt, and 1.25 is the floor rather than the goal: below it, one bad year of vacancy or one uninsured repair breaks the debt service, and below 1.0 the property services its loan out of your pocket rather than out of its rent. If the coverage ratio is computed on NOI that includes reserves, the property is funding its own debt service by liquidating its balance sheet, which stops being possible in the year you need it most. And if the rate is not re-run at the fully indexed rate for an ARM, the ratio you are relying on is a number that expires in year six.',
        },
        {
          step: 4,
          label: 'Compute cash-on-cash against the full cash actually invested',
          gate:
            'Cash-on-cash equals annual cash flow after debt service divided by total cash invested, where the denominator lists the down payment plus closing costs at 2-5% of the loan amount plus reserves plus any rehabilitation budget; the result clears 10% for a straight buy-and-hold or 15% for a renovation strategy, and every dollar in the denominator is named.',
          blockIf:
            'Dividing by the down payment alone lets a deal that returns 12% report 30%, and the strategy then looks like it funds itself when it does not — the cash the full denominator absorbs is exactly the cash you need for the next deal or for the year the market turns. If the renovation budget is excluded, or counted as money you get back, the arithmetic is wrong in the direction that flatters. And without a named figure for reserves and closing costs, the denominator cannot be audited by anyone, including you at the next refinance.',
        },
        {
          step: 5,
          label: 'Model the exit at a wider exit cap and read the equity multiple',
          gate:
            'The exit case states an exit capitalisation rate (25-100 basis points above the going-in rate as the conservative case, 25-50 below as the compression case), forward NOI growing 2-4% a year, and sale price equal to forward NOI divided by the exit cap; the conservative case is run before the base case, and the resulting equity multiple is written next to the 2.0 times target for a 5-7 year hold.',
          blockIf:
            'An exit modelled at the going-in rate assumes away the only variable you do not control, and if cap rates expand 100 basis points the sale price falls 15-20% while every operating assumption stays true. If forward NOI grows faster than the rent roll supports, the difference is invented sale price, and forward NOI is the most optimistic line in the model because it assumes every unit stays occupied and every expense stays flat. And without the conservative case run first, the equity multiple you approve is the one case that happened to work, not the one you will be held to.',
        },
        {
          step: 6,
          label: 'Compute the equity multiple and confirm the refinance cash-out',
          gate:
            'The equity multiple equals sale proceeds plus cumulative cash flow divided by cash invested, and clears 2.0 times over a 5-7 year hold; the IRR is computed from the same cash flows; and the refinance cash-out is stated at three rates — the going-in rate, 100 basis points above it, and the fully indexed ARM rate — each after closing costs of 2-5% of the new loan amount, with each tested against a 1.25 DSCR.',
          blockIf:
            'An equity multiple below 1.5 times means the deal does not pencil without aggressive rent growth or cap rate compression, and a strategy built on repeated refinances needs at least 2.0 times to release enough capital to fund the next one. If the cash-out is quoted only at the going-in rate, you have not tested the case that matters, because the refinance rate and the appraisal move together — when cap rates expand, the value the lender lends against falls in the same quarter. And without a 12-month carrying test, a plan that depends on the refinance has no answer for the period when the refinance is simply unavailable.',
        },
      ],
    },
    zh: {
      intro:
        '一笔交易的资本化率分析够不够格据此行动，看六件事，而每一件都能产出一个看着完成、其实不能用的数字，因为一笔交易只有在所有数字都落在同一个 NOI、同一笔贷款、同一个退出假设上时才有意义。NOI 随后逐行从租约清单重建：毛租金减一个写明的空置率，再减运营支出，而减到按揭之前就停，因为一个悄悄把本息算进来的 NOI 是套着无杠杆标签的有杠杆数，从它算出来的每个收益率都是错的。入场资本化率随后对资产等级与子市场的区间；三线市场的 C 类交易预期要比全国中位高 75-150 个基点，用来补偿流动性、租户集中与递延维护。杠杆随后叠上，常规出租物业 65-75% 的贷款价值比、多户住宅 70-80%，利率写明是 30 年固定约 6.8-7.2% 还是 5/1 ARM 约 6.0-6.5%，然后减去月度偿债额。现金回报率随后用「投入的现金」做分母——首付加过户加储备——而不是房价。退出场景接着排，远期 NOI 按年增 2-4%，保守情形取高于入场 25-100 个基点的退出资本化率。股权乘数与再融资放在最后，对 5 年持有期核 2.0 倍与 15% 内部收益率。',
      items: [
        {
          step: 1,
          label: '从租约清单建出 NOI，并把每条费用都列出来',
          gate:
            '有效毛收入 = 毛年租金 ×（1 − 空置率%），空置率落在该等级区间内（机构级 5%，B/C 类 8-10%，D 类 12-15%）；运营支出逐项列出——房产税占价值 1-3%、保险 0.5-1%、维护占有效毛收入 5-10%、管理占有效毛收入 6-10%、准备金 2-5%；NOI = 有效毛收入 − 运营支出，费用清单里没有任何按揭项。',
          blockIf:
            '用毛租金算出来的资本化率会把收益率高估 5-10%，而下游每个数都会继承它——这处房产能背的贷款、退出时的卖价、股权乘数。如果空置假设取自资产等级而不是这处房产自己的租约清单——一份不会续约的租约、一个会搬走的租户、两个租客之间空置两个月的单元——那你算的 NOI 描述的是另一栋楼。如果准备金被漏掉，这处房产就不是靠自己的现金流覆盖，而是靠资产负债表覆盖，于是第一个糟糕的年头以一笔意外增资的形式到达，而不是一次更小的分配。',
        },
        {
          step: 2,
          label: '算出入场资本化率，并把它放进等级与市场区间',
          gate:
            '入场资本化率 = NOI ÷ 买入价，写成单一百分比，并紧挨着你的等级 × 市场层级 × 业态组合的区间（Class A 4-5.5%，Class B 5.5-7%，Class C 7-9.5%，Class D 10% 以上，三线市场相对全国中位 +75 到 +150 个基点，门户市场 −50 到 −100）；区间必须带来源与日期。',
          blockIf:
            '没有区间的入场率只是一个数，不是判断，它没法告诉你「你在为什么风险付多少钱」。如果区间是拿全国中位去套一个本身就偏离 75-150 个基点的子市场，你的每一项下游计算都带着同样大小的系统性误差——收益率、卖价、贷款规模。而如果区间没有日期，它就是一个你尚未识别的周期阶段的数字，这正是「用一个周期定价的入场」被拿另一个周期的区间来论证的方式。',
        },
        {
          step: 3,
          label: '叠加融资结构，并证明债务偿债覆盖率真的站得住',
          gate:
            '贷款额、利率、摊销方式与期限都写明（常规出租 65-75% LTV、多家庭 70-80%；30 年摊销；30 年固定 6.8-7.2% 或 5/1 ARM 6.0-6.5%），算出月供，偿债后年现金流 = NOI − 年偿债；DSCR = NOI ÷ 年偿债且高于 1.25，并用全额指数化利率重算一次覆盖率。',
          blockIf:
            '覆盖率是判断「这处房产能不能自己偿债」的检验，1.25 是底线而不是目标：低于它，一年的坏空置或一次没上保险的维修就能断掉偿债；低于 1.0，这处房产就是用你的口袋而不是用它的租金去还贷款。如果覆盖率是在包含准备金的 NOI 上算的，这处房产就是靠变卖自己的资产负债表来付月供，而这件事在你最需要它的那一年就做不到了。如果 ARM 没有按全额指数化利率重算，你依赖的那个覆盖率是一个第六年就过期的数。',
        },
        {
          step: 4,
          label: '用全额投入现金算出现金回报率，并点名每一项',
          gate:
            '现金回报率 = 偿债后年现金流 ÷ 投入现金总额，分母里列出首付 + 贷款额 2-5% 的成交成本 + 准备金 + 任何翻修预算；结果达到纯持有收租 10% 或翻修策略 15% 以上，并且分母里的每一块钱都被点名。',
          blockIf:
            '只除以首付，可以把一笔真实回报 12% 的交易报成 30%，于是这套策略看上去能自我供血、其实不能——全额分母吸走的那笔钱，恰恰是你支撑下一轮交易、或者撑过市场转向所必需的。如果翻修预算被排除在外、或者被当成卖出时能回来的钱，算术就会朝着对你有利的方向错。而如果准备金与成交成本没有写成具体数额，这个分母任何人都核不了——包括你在下一次再融资时核自己。',
        },
        {
          step: 5,
          label: '用更宽的退出资本化率建模退出，并读出股权乘数',
          gate:
            '退出情形写明退出资本化率（比入场高 25-100 个基点为保守情形、低 25-50 个基点为压缩情形）、远期 NOI 每年增长 2-4%、卖出价 = 远期 NOI ÷ 退出资本化率；保守情形必须先于基准情形跑一遍，得到的股权乘数写在 5-7 年持有期 2.0 倍的目标旁边。',
          blockIf:
            '用入场资本化率去建模退出，等于把唯一不由你控制的变量假设掉了：一旦退出时资本化率扩张 100 个基点，卖价跌 15-20%，而所有运营假设都还成立。如果远期 NOI 的增长快于租约清单支持的水平，多出来的那部分就是凭空造出来的卖价——远期 NOI 是模型里最乐观的一行，因为它假设每个单元都住满、每项费用都不涨。而如果保守情形没有先跑，你批准的那个股权乘数只是恰好成立的那一个情形，不是你事后要面对的那个。',
        },
        {
          step: 6,
          label: '算出股权乘数，并确认再融资时能套出多少现金',
          gate:
            '股权乘数 =（卖出收入 + 累计现金流）÷ 投入现金，在 5-7 年持有期上达到 2.0 倍以上；IRR 用同一套现金流算出；再融资套现额在三种利率下分别写明——入场利率、比它高 100 个基点、以及 ARM 的全额指数化利率——每一种都先扣掉新贷款额 2-5% 的成交成本，并且每一种都对照 1.25 的 DSCR 验过。',
          blockIf:
            '股权乘数低于 1.5 倍意味着没有激进租金增长或资本化率压缩就不划算，而一套靠反复再融资滚动的策略至少需要 2.0 倍才释放得出足够资金支撑下一轮。如果套现额只按入场利率报，你就没有测那个真正要紧的情形，因为再融资利率与评估价是一起动的——资本化率一扩张，贷款人据以放贷的估值就在同一个季度里下滑。而如果缺了「持有 12 个月」的测试，一份依赖再融资的计划，就对「再融资拿不到」的那段时间没有任何答案。',
        },
      ],
    },
  },
};
