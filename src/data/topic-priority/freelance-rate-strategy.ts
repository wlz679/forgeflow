// P166 —— D 类（Freelance Pricing）主题「freelance-rate-strategy」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许手写金额，但必须带口径）：
//   · 费率一律 USD/小时，且必须标明是名义价还是到手价 —— 两种坐标绝不混用
//   · 计费小时按 48 个工作周算，区间 1,000-1,400/年，不是 2,080
//   · 税负口径 = 自雇税 + 所得税 + 退休金 + 运营开销的合并负载率，区间 25-45%
//   · 每个金额都自带分子、分母、期间与量级，读者可按自己规模换算
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Your rate card and your income are two numbers, and comparing them is how freelancers stay stuck. The card shows a nominal rate; the take-home is what survives self-employment tax, income tax and business expenses, computed on 1,000 to 1,400 realistic billable hours a year, not 2,080. Utilisation decides the rest.',
      rows: [
        {
          priority: 1,
          metric: 'Effective take-home rate per hour after tax and business expenses (USD/hour)',
          fixFirst:
            'Start with the only number that is money. Rebuild it from filing-period numbers rather than from a rate card: take-home per hour = invoiced billings, minus business expenses, minus self-employment tax, minus income tax, minus retirement contributions, divided by the billable hours you actually invoiced. On a posted USD 100/hr with 1,000-1,400 billable hours a year that is USD 100,000-140,000 of billings, and a 30 percent combined load leaves USD 70/hr while a 45 percent load leaves USD 55/hr, so the same card can be two different businesses. If take-home sits below target, take the structural repairs first: expenses that are genuinely optional, retirement contribution timing, entity and invoice treatment. A rate raise is the slow, client-facing repair and it only compounds once rows two to five are clean. Verify by recomputing the same formula from the last four quarters of invoices and bank deposits rather than from a spreadsheet estimate.',
          alsoMoves:
            'It is the denominator every other row is judged against, and it decides which repairs are worth doing at all. On a USD 100 card a 20 percent headline increase adds USD 20/hr of billing but only USD 14/hr of take-home at a 30 percent load and USD 11/hr at a 45 percent load, so the tax and expense work in this row sets the value of the rate work in row two. It also prices the value-based tier in Step 5: 10-20 percent of client ROI has to clear your take-home rather than your invoice, and at a 45 percent load a 20 percent ROI premium leaves only USD 10 of take-home per ROI dollar. Finally it sets the cash buffer you can hold, which decides how long you can wait for a better project instead of taking a bad one.',
          backfire:
            'Optimizing take-home on the wrong side of the invoice is how this row makes the others worse. A client that looks like USD 150/hr but pays through a pass-through arrangement can net USD 70/hr once the pass-through is deducted, and chasing the headline figure then pushes you to strip costs you needed to deliver, so the next project lands worse than the last and the realized rate in row three falls. The other version is a tax or entity structure that only works while revenue is steady: a quarter without one large client then exposes the bill with no income to pay it, and the take-home you reported last quarter turns out to have been timing rather than earnings.',
        },
        {
          priority: 2,
          metric: 'Posted rate against the market tier band for your specialization (USD/hour, nominal)',
          fixFirst:
            'Only once you know what you need do you compare, and both numbers have to sit on the same axis: nominal against nominal, or take-home against take-home, never one against the other. Pick the band that matches the work you actually sell, roughly USD 50-100/hr junior, USD 75-150/hr mid, USD 150-300/hr senior, USD 300-600 and above for expert and productized work in the generic US freelance market. Then ask which rung you are selling into. If you are below the middle of the band, the repair is positioning rather than price: choose one niche with a measurable outcome such as AI implementation, security review, compliance work or fractional executive work, rewrite three case studies around that outcome, and quote against that band. If you are already at or above the band, the risk is channel and packaging rather than the rate, because commodity platforms price you down even when your work is worth more.',
          alsoMoves:
            'It sets the ceiling on every downstream lever: the rush multipliers in Step 5 (1.5x for one week, 2x for three days, 3x for 24 hours) and the value tier at 10-20 percent of client ROI are only credible because they start from a defensible base, and a card built on a band nobody pays turns both of them into a discount list. It also decides which clients you can decline, which changes the mix that fills your hours in row four. A band you can name out loud is what makes the Step 6 renewal conversation a price update instead of a re-bid.',
          backfire:
            'Quoting above the band without proof you can hold is the most common way this row makes take-home worse. A card at USD 260/hr with junior-grade delivery gets renegotiated at the first renewal, and you end up defending a discount instead of a rate, and that discount becomes the market price for you in every future negotiation, which is a permanent cut to rows one and three. The other failure is moving up the band while utilization is under 50 percent: you raise the price into a pipeline that cannot absorb it, win fewer clients, and the same fixed monthly expenses now spread over fewer billable hours, so take-home per hour falls even though the headline rate rose 40 percent.',
        },
        {
          priority: 3,
          metric: 'Realized rate per hour versus posted rate (invoiced revenue divided by actual hours)',
          fixFirst:
            'Fix leakage before you raise prices, because a rate increase applied to a leaky system leaks too. Compute realized rate = revenue invoiced divided by hours actually worked on client work, and compare it with the posted rate for the same period. Below 75 percent of posted, the gap is scope, discounting or write-offs rather than pricing power: log unbilled hours per project, route every change request through a written path with a fee attached, and stop absorbing hours to keep a client comfortable. Verify with the same ratio on the next three projects before you touch the card, and if the ratio does not move then the leak sits somewhere other than where you looked.',
          alsoMoves:
            'It is the number that proves rows two and five are real. A posted rate can be raised and the market can nod, but only the realized rate moves cash: a 15 percent card increase that is 60 percent collected is a 6 percent gain in money and a 15 percent gain on paper. It also sets the cost floor for fixed-price quotes in Step 7, because the same unbilled hours that depress the realized rate are what push a fixed-bid project under its margin, and it tells you which clients to re-price rather than to re-market.',
          backfire:
            'Leakage repairs can damage the client volume that row four depends on. When you start invoicing hours you used to write off, the client sees a bill 20-30 percent larger than last quarter with no new scope, and the usual response is to cut scope, pay late, or leave, which removes billable hours and can push utilization below the point where your fixed expenses are covered. The quieter version is defending the realized rate by dropping the low-value work that makes clients sticky: you keep the hours and lose the retainer that was paying for them.',
        },
        {
          priority: 4,
          metric: 'Billable hours a year and utilization (invoiced hours divided by available working hours)',
          fixFirst:
            'Work this row after the price and the leakage are settled, because filling idle capacity at the wrong rate is exactly how a freelancer ends up busy and underpaid. Divide the hours you invoiced last year by your real capacity of 48 working weeks rather than 52, and compare with the 60-75 percent sustainable band. Under 50 percent, the repair is pipeline rather than schedule: pick one acquisition channel, give it a fixed number of hours every week, and drop one client type that fits badly. Track booked-not-yet-invoiced hours weekly, and treat a week with two booked projects and none invoiced as a full-time job, because that is what it is.',
          alsoMoves:
            'It is the divisor on every take-home figure, and the two levers are the same size but opposite in risk: at 1,000 invoiced hours a year, 100 extra hours is USD 10,000 of billings on a USD 100 card, and a USD 10/hr cut on those same 1,000 hours is also USD 10,000, one earned by selling and the other conceded. It also changes what a rate rise is worth, because at 1,400 invoiced hours a 20 percent increase buys the option to work 200 fewer hours at the same income, which is the only version of a rate raise that produces rest.',
          backfire:
            'Filling capacity with the wrong work is how this row damages the others. Adding volume-tier clients to replace lost hours drags the blended rate down, so the posted rate holds, revenue rises, and take-home per hour falls, and the numbers look better on every line except the one that pays you. The reverse fails as well: protecting the 60-75 percent band by refusing lower-value work while your pipeline is thin leaves utilization under 40 percent, and the same fixed expenses then spread over fewer hours.',
        },
        {
          priority: 5,
          metric: 'Legacy price drift — share of trailing 12-month revenue still priced below your current card',
          fixFirst:
            'Run this last because it is the decay that undoes the other four. List every active contract with its start date and its current rate, then compute the share of trailing 12-month revenue still priced under your current card. Above 30 percent, the raise cadence has not been running: build the renewal calendar now, write the 30-60 day notices required in Step 6, and grandfather nothing beyond one cycle. Re-list the contracts every six months, because the metric only earns its place if the number keeps falling, and if it does not fall then the cadence in Step 6 is not running.',
          alsoMoves:
            'It separates a raise that compounds from a raise that lands once. A 15 percent increase applied to the whole book is worth 15 percent, while the same increase applied to a third of the book is worth about 5 percent this year and 15 percent next year, and the realized rate in row three only reaches its target once the legacy block has been repriced. It also buys tolerance for one lost client, because a book whose average contract price is still climbing can absorb a single churn while a book anchored to stale prices cannot.',
          backfire:
            'Raising legacy prices into a soft market trades row one for a pipeline. Where renewal and referral are the acquisition engine, a 20-30 percent increase on the legacy book can lose 15-25 percent of that volume, and the replacement clients arrive three to six months after the revenue you gave up. The other version is the quiet one: raising the rate through scope changes and invoice administration without ever sending a notice. It works for two or three quarters and then shows up as a churn spike in row five that nobody can trace back to a pricing decision.',
        },
      ],
    },
    zh: {
      intro:
        '报价卡上的费率和你真正到手的钱，是两个数，拿它们互相比较，人就一直卡在原地。卡上是名义费率，到手要扣掉自雇税、所得税和经营开销，而且要按一年 1,000-1,400 个真实可计费小时算，不是 2,080。利用率决定剩下的部分：60-75% 的工时花在可计费工作上，你才请得起假、养得起自己的获客；超过 85% 就没有余地了。涨价按 6-12 个月一轮走，更大的跳幅会被读成品牌重塑，要的是定位变化而不是单纯涨价。所以这张表要按目标到手收入倒推，而不是按同行报价往上加。',
      rows: [
        {
          priority: 1,
          metric: '税后与开销后的实际到手费率（USD/小时）',
          fixFirst:
            '从唯一等于钱的那个数开始。别拿报价卡推算，要拿申报期的真实数字倒推：到手费率 = 已开票账单收入，减运营开销，减自雇税，减所得税，减退休金，再除以你真正开票的计费小时。报价卡写着 USD 100/小时、每年计费 1,000-1,400 小时，就是 USD 100,000-140,000 的账单收入；合并负载 30% 时到手 USD 70/小时，负载 45% 时到手 USD 55/小时——同一张卡，可能是两门生意。如果到手低于目标，先做结构性的修复：真正可砍的开销、退休金的缴纳时点、主体与开票方式。涨价是慢的、要面对客户的修复，只有在第二到第五行都干净之后才复利。验证方式是用过去四个季度的发票与银行流水重算同一个公式，而不是用表格估一下。',
          alsoMoves:
            '它是其他每一行共同的判定分母，也决定哪些修复值得做。在 USD 100 的卡上，名义价涨 20% 是账单收入多 USD 20/小时，但负载 30% 时到手只多 USD 14/小时、负载 45% 时只多 USD 11/小时——所以这一行的税务与开销工作，直接决定第二行的涨价值多少钱。它还给步骤 5 的价值档定价：客户 ROI 的 10-20% 必须先过你的到手线，而不是你的开票价，负载 45% 时 20% 的 ROI 溢价里只剩 USD 10 是你的。它同时决定你能压多少现金储备，而这决定了你敢等多久去接一个更好的项目，而不是为了活命接一个烂单。',
          backfire:
            '把到手数优化在发票的错误一侧，是这一行把其他行搞坏的方式。看起来是 USD 150/小时、但通过代付通道结算的客户，扣掉通道后可能只净得 USD 70/小时；盯着名义数往下追，你会去砍交付必需的成本，于是下一个项目交付得更差，第三个行的实际到手率跟着掉。另一个版本是用一个只在收入平稳时成立的税务或主体结构：某个季度少了一个大客户，账单就裸露出来而没有收入去缴，上一季度你报的到手其实只是时点，不是收入。',
        },
        {
          priority: 2,
          metric: '报价卡费率对比你所在细分赛道的市场档位（USD/小时，名义价）',
          fixFirst:
            '先知道自己要多少，再去比，而且两个数必须同轴：名义对名义，或者到手对到手，绝不能一头对一头。选与你实际在卖的活相匹配的档位——通用美国自由职业市场里大致是初级 USD 50-100/小时、中级 USD 75-150/小时、高级 USD 150-300/小时、专家与产品化 USD 300-600 及以上。然后问自己实际在卖的是哪一档。如果低于档位中段，要修的是定位而不是价格：选一个能量化结果的细分（AI 落地、安全审查、合规、兼职高管），把三份案例围绕那个结果重写，然后对着那一档报价。如果已经在档位之上或之内，风险在渠道与包装而不在费率，因为商品化平台会把你的价压下来，哪怕你的活更值钱。',
          alsoMoves:
            '它给后面所有杠杆定了上限：步骤 5 的加急系数（1 周 1.5x、3 天 2x、24 小时 3x）和按客户 ROI 10-20% 计的价值档，只有建立在站得住的基准价上才可信；如果报价卡建在一个没人肯付的档位上，这两条会一起变成折扣清单。它还决定你能拒绝哪些客户，这会改变填满你工时的活的口径——也就是第四行。一个你能当场说出口的档位，才让步骤 6 的续约对话是「价格更新」而不是「重新竞标」。',
          backfire:
            '报价高于档位却拿不出撑得住的证据，是这一行让到手变差的最常见方式。报价卡写 USD 260/小时、交付还是初级水平，第一次续约就会被重新谈价，最后你守的是折扣而不是费率，而那个折扣从此成为市场上「你的价格」——对第一行和第三行都是永久性削减。另一个失败是利用率低于 50% 时往高档位爬：涨价涨进一个装不下的管道里，客户变少，原来那笔固定月开销摊到更少的计费小时上，于是名义价涨了 40%，到手费率反而掉了。',
        },
        {
          priority: 3,
          metric: '实际到手费率对比报价费率（已开票收入 ÷ 实际工时）',
          fixFirst:
            '先补漏，再涨价，因为加在漏水的系统上的涨价同样会漏。算实际费率 = 已开票收入 ÷ 真正花在客户工作上的工时，与同一期间你的报价费率比。低于报价的 75%，缺口就是范围、折扣或无偿投入，不是定价权：按项目记录未计费工时，把每一份变更请求走一条带费用的书面流程，别再用吞工时的方式维持客户关系。改报价卡之前，先用后三个项目的同一比值验证；如果比值没动，说明漏在别处而不在你查的地方。',
          alsoMoves:
            '它是证明第二行和第五行是否为真的那个数。报价卡可以涨、市场可以点头，但只有实际费率动的是钱：一次 15% 的涨卡如果只收到六成，钱上只多了 6%，纸面上却多了 15%。它同时给步骤 7 的固定价报价设了成本底线，因为压低实际费率的同一批未计费工时，正是把固定价项目推到毛利线以下的东西；它还告诉你该重新定价的是哪些客户，而不是该重新做营销的是哪些。',
          backfire:
            '补漏会伤到第四行依赖的客户量。开始把以前白干的工时开进账单，客户看到的是比上季度大 20-30% 的发票、而范围一点没变，常见反应是砍范围、拖付款或者直接不合作——这会削掉计费小时，利用率可能掉到连固定开销都覆盖不了的高度。更安静的一个版本是：为了守住实际费率而砍掉那些让客户留下来的低价值活——工时保住了，付这些工时的月费保住了。',
        },
        {
          priority: 4,
          metric: '年计费小时与利用率（已开票工时 ÷ 可用工时）',
          fixFirst:
            '这一行要等价格和漏损都理顺之后再动，因为用错价去填闲置产能，正是自由职业者忙了一整年却没挣到钱的路径。把去年开票的工时除以真实产能（48 个工作周，不是 52），与 60-75% 的可持续区间比。低于 50%，要修的是管道而不是日程：选一个获客渠道，每周固定给它几个小时，同时砍掉一类不合适的客户。每周盯「已签未开票」的工时；一周里接了两个项目却一个都没开票，就按全职算——它本来就是。',
          alsoMoves:
            '它是每个到手数字上的除数，而两个杠杆大小相同、风险相反：每年开票 1,000 小时时，多出 100 小时在 USD 100 卡上就是 USD 10,000 的账单收入，同样这 1,000 小时上砍 USD 10/小时也是 USD 10,000——一个靠卖，一个靠让。它还改变一次涨价的实际含义：每年开票 1,400 小时时，涨 20% 等于买到了用同样收入少干 200 小时的选择权，而这是涨价唯一能换来的休息。',
          backfire:
            '用错的活去填产能，是这一行伤害其他行的方式。用走量档客户补回丢掉的小时，混合费率被拉低，于是报价费率不动、营收上升、到手费率下降——每一行看起来都变好，除了付你钱的那一行。反过来也会失守：管道本来就薄的时候，为了守住 60-75% 的区间而拒绝低价值的活，利用率会掉到 40% 以下，同样的固定开销于是摊在更少的小时上。',
        },
        {
          priority: 5,
          metric: '老价漂移 —— 过去 12 个月收入里仍按旧价计费的比例',
          fixFirst:
            '这一行放最后，因为它就是抹掉前面四项的衰减。把每份在跑的合同列出来：起始日期 + 当前费率，然后算出过去 12 个月收入里仍低于现行报价卡的比例。超过 30%，说明涨价节奏压根没在跑：现在就建续约日历，按步骤 6 写 30-60 天的书面通知，超过一个周期的旧价一律不再豁免。每半年重列一次合同——这个指标只有数字一直往下走才值得留在表里；如果它不降，就是步骤 6 的节奏没在跑。',
          alsoMoves:
            '它把「复利的涨价」和「只生效一次的涨价」分开。同样涨 15%，覆盖全部存量的合同值 15%；只覆盖三分之一存量时，今年值约 5%、明年才值 15%，而第三行的实际费率要等旧价那批被重新定价之后才可能到目标。涨到手上的顺序是先新签、再续约、最后才是那批沉睡的老合同。它还买来容忍一个客户流失的余量：平均合同单价还在爬的书能扛住一次流失，锚在旧价上的书扛不住。',
          backfire:
            '在软市场里给老客户涨价，是拿第一行去换管道。若续约和转介绍就是你的获客引擎，对存量提 20-30% 可能砸掉 15-25% 的量，而替补客户要在你交出去的收入之后三到六个月才到。另一个版本是安静的那个：靠变更范围和开票口径把价涨上去，却从不发通知。这样能撑两三个季度，然后以第五行一次说不清来源的流失潮现形，事后没有任何一张报表能指出原因。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Seven numbers decide what your hour is worth, each on a different base than the last. Required rate comes from target take-home plus billable hours; the pricing model is compared against one income goal, not project by project; tax is reconciled against a filed period. Market position is then decided on one axis.',
      items: [
        {
          step: 1,
          label: 'Required rate computed from real billable hours and a loaded tax rate',
          gate: 'A required hourly rate in USD/hour derived from a full-year billings figure, using 1,000-1,400 billable hours rather than 2,080, and a combined tax-and-expense load of 25-45 percent, with the same number carried unchanged into Steps 2 and 3.',
          blockIf:
            'If the required rate was computed on a 2,080-hour year or on a marginal tax rate, every later figure is inflated, because the take-home you promise in Step 5 and the client budget you quote against in Step 4 are both derived from a base you can never invoice. Recompute before you build a card, since a rate you cannot invoice is a target rather than a price, and every quote you write on top of it will be wrong by the same factor.',
        },
        {
          step: 2,
          label: 'Pricing model compared against one income goal, not per project',
          gate: 'Hourly, fixed-price and retainer all modelled against the same target take-home, with 1 model chosen for the next 3 projects and a stated ceiling of 1 fixed-bid project per 3 months so no single contract can put the whole quarter at risk.',
          blockIf:
            'Choosing a pricing model per project without a single income target means Step 2 produces no comparison at all, because you cannot tell which model leaked money when each project used a different yardstick. Fix the target first and the model second, or the Step 4 tiering and the Step 6 raise cadence will both be built on an untested assumption about how you charge, and the first bad quote will confirm it.',
        },
        {
          step: 3,
          label: 'Take-home reconciled against an actual filing period, not an estimate',
          gate: 'Monthly take-home computed from invoiced revenue minus expenses minus self-employment tax minus income tax minus retirement, landing within 5 percent of the last filed quarter at the same revenue level, with any gap above 5 percent opened as a reconciliation item before the next quote goes out.',
          blockIf:
            'If take-home is still an estimate then the value-based tier in Step 5 is unpriceable: you would be quoting 10-20 percent of client ROI without knowing which share of it is yours after tax, so either the quote under-recovers your time or the client pays for a number they cannot audit. Reconcile against the filing first, because a card built on an unverified take-home moves every rate you quote by the same uncertainty.',
        },
        {
          step: 4,
          label: 'Market position decided on a single axis with one named niche',
          gate: '1 band chosen on 1 axis, headline to headline or take-home to take-home, with your required rate placed inside or below it, and if it sits below mid-tier then 1 niche is named and 3 case studies are rewritten around a measurable ROI outcome.',
          blockIf:
            'Comparing a take-home rate against a headline benchmark mixes two axes and can make you look 20-30 percent underpriced when you are merely taxed differently, which sends you into a rate war you do not need. Without a named niche and rewritten proof, the premium and rush tiers in Step 5 have no supporting story, so the market reads them as an unexplained increase and pushes back at renewal.',
        },
        {
          step: 5,
          label: 'Three-tier card published with multipliers and one proof each',
          gate: 'Standard tier at the market median, rush tier at 1.5x for one week, 2x for three days and 3x for 24 hours, value tier at 10-20 percent of a client ROI you can name in one sentence, and each of the three tiers backed by at least one delivered example you can show.',
          blockIf:
            'If the value tier cannot name a measurable client outcome then the 10-20 percent anchor becomes an opinion and the rush multipliers have nothing to be measured against, so clients negotiate all three down to the standard rate and the realized rate never improves no matter what you publish. Ship a tier only where you have proof of the outcome, and keep the other two tiers out of the card until you do.',
        },
        {
          step: 6,
          label: 'Raise cadence calendared with dated written notices',
          gate: 'Every active contract carries a renewal date and a notice date 30-60 days ahead of it, new contracts carry a 6-month review clause and legacy ones a 12-month clause, and the notice template states the new rate in USD/hour plus the date it takes effect.',
          blockIf:
            'Without a dated notice step the cadence is only an intention, and the legacy drift metric in the fix-priority table never falls: every legacy contract quietly renews at its old rate, so a 15 percent raise lands on new business only and the blended rate stays flat while your costs rise. Calendar the notice dates before the renewal dates, because a notice sent after the renewal conversation has already started is worth nothing.',
        },
        {
          step: 7,
          label: 'Project pricing model written on the quote and utilization modelled',
          gate: 'Each new project has a scope written clearly enough to fit in one sentence, and the what-if run shows the same gross billings at the current rate with billable hours cut by at least 200 a year, which is the 1,400-hour case proving the rate work is worth more than the hours.',
          blockIf:
            'If scope is fuzzy and you default to hourly you have chosen the model that punishes your efficiency, and if scope is clear and you stay on hourly you cap your income at the number of hours you can sell. Until one of the two models is written on the quote itself, the tiers from Step 5 cannot be applied to the project and the utilization improvement stays theoretical rather than billed.',
        },
      ],
    },
    zh: {
      intro:
        '决定你一小时值多少的有七个数，而且每个数都算在和上一个不同的基数上。必需要价率来自目标到手收入加真实可计费小时；定价模式要对着同一个收入目标比，不是逐个项目各比各的；税对着真实申报期逐项对账，不靠估算。市场定位随后在单一坐标上定下来，并点名一个细分赛道。三档价卡发布时，每一档都要写清倍数、实证与适用场景。急单、加急和价值定价是三档之外的另一种分层，别把它们混进标准报价里。老价漂移要看：过去 12 个月有多少收入还按旧价计费。',
      items: [
        {
          step: 1,
          label: '必需要价率用真实计费小时与含税负载率算出来',
          gate: '从全年账单收入推出一个 USD/小时 的必需要价率，计费小时用 1,000-1,400 而不是 2,080，合并税负与开销负载率取 25-45%，并且同一个数字要原样带进步骤 2 和步骤 3。',
          blockIf:
            '如果必需要价率是拿 2,080 小时或者边际税率算的，后面每一个数字都是虚高的——步骤 5 你承诺的到手价、步骤 4 你拿去跟客户预算比的数，都是从同一个你根本开不出票的基数上推出来的。报价卡之前必须重算，因为开不出票的费率是目标不是价格，而在它上面写的每一份报价都会按同一个比例错下去。',
        },
        {
          step: 2,
          label: '定价模式对比同一个收入目标，而不是逐个项目各比各的',
          gate: '时薪、固定价、月费 3 种模式都对着同一个目标到手收入建模，选定 1 种用于接下来 3 个项目，并写明固定价项目上限为每 3 个月 1 个，避免单个合同把整个季度押进去。',
          blockIf:
            '没有统一收入目标就逐个项目挑定价模式，步骤 2 根本产不出对比——每个项目用不同尺子，你无法判断是哪种模式在漏钱。先定目标再选模式，否则步骤 4 的分档和步骤 6 的涨价节奏都会建在一个没被验证过的收费假设上，而第一份错报价就会替你验证这个假设。',
        },
        {
          step: 3,
          label: '到手收入对着真实申报期逐项对账，而不是估算口径',
          gate: '月度到手收入按已开票收入减开销、减自雇税、减所得税、减退休金算出，在同等收入水平下与上一份申报季度的实际数相差不超过 5%，超过 5% 的缺口要在下一份报价发出去之前列为待对账项。',
          blockIf:
            '到手数还是估算，步骤 5 的价值档就没法定价：你会在不知道客户 ROI 里有多少归自己的情况下报客户 ROI 的 10-20%，结果要么报价收不回你的时间，要么客户付了一个自己也审不了的钱数。先拿申报期对账，因为建在没验证过的到手数上的报价卡，会让之后每一个费率都带上同样大的不确定度。',
        },
        {
          step: 4,
          label: '市场定位在单一坐标上定下来，并点名一个细分赛道',
          gate: '选 1 条坐标（名义对名义或到手对到手）定 1 个档位，把必需要价率放进这个档位里或它下方；若低于中段，则点名 1 个细分赛道，并把 3 份案例围绕 1 个可量化的 ROI 结果重写。',
          blockIf:
            '拿到手费率去比一个名义基准是两轴混用，会让你看起来低 20-30%，其实只是税不一样，然后你会被卷进一场根本不需要的价格战。没有点名的细分和重写过的证据，步骤 5 的溢价档与加急档就没有支撑故事，市场会把它读成一次没来由的涨价，在续约时整单压回来。',
        },
        {
          step: 5,
          label: '三档价卡发布，每一档都写清倍数、实证与适用场景',
          gate: '标准档对齐市场中位价，加急档 1 周 1.5x、3 天 2x、24 小时 3x，价值档取你一句话能说清的客户 ROI 的 10-20%，并且三档每一档背后都有至少一个你拿得出手的已交付案例。',
          blockIf:
            '价值档说不出可量化的客户结果，10-20% 这个锚就只是意见，加急档也没有可对比的对象，客户最后把三档一起谈到标准档上，于是实际到手费率无论你怎么发布都不会变。哪一档没有实证就先把哪一档撤下来，别让它留在卡上被当成折扣清单。',
        },
        {
          step: 6,
          label: '涨价节奏进日历，书面通知有明确日期与生效时点',
          gate: '每份在跑的合同都有续约日期，以及提前 30-60 天的通知日期；新合同带 6 个月复审条款、老合同带 12 个月条款；通知模板写明新的 USD/小时 费率与生效日期。',
          blockIf:
            '没有带日期的通知动作，节奏就只是一个意向，修复优先级表里的老价漂移也永远降不下来：每份老合同都按旧价安静续约，于是 15% 的涨价只落在新业务上，混合费率原地不动，而你的成本在涨。先把通知日期排进日历，再排续约日期，因为续约对话已经开始之后再发通知，等于没发。',
        },
        {
          step: 7,
          label: '项目定价模式写进报价单，利用率变化进 What-If',
          gate: '每个新项目的范围都写到能用一句话说清，并且 What-If 跑出同一个毛收入下、计费小时一年至少少 200 小时的方案，也就是 1,400 小时那档，用来证明涨价比多干小时更值钱。',
          blockIf:
            '范围模糊却默认按时薪，你就挑了那个惩罚你效率的模式；范围清楚却仍按时薪，你就把自己的收入封顶在能卖掉的工时数上。在报价单上没写明是哪一种之前，步骤 5 的分档落不到这个项目上，利用率的那点改善就只是纸面数字，开不成票。',
        },
      ],
    },
  },
};
