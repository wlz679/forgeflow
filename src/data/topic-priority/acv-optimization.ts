// P166 —— S 类（Sales）主题「acv-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论：照搬既有散文 = 抄写自己）：
//   · 既有 howToUse（基准页）= 按分段 + ACV 指标选一行 → 单一动作
//   · 既有 howToApply（指南页）= Step 1…Step 8 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个 ACV 指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许手写金额，但必须带口径）：
//   · ACV 一律指年度化合同额：TCV ÷ 合同年限；比较任何两个数之前先年化
//   · 折扣一律是相对年付价的百分比，并写明它让掉的是现金还是毛利
//   · 占比一律写明期间与分母（存量客户 / 可升级客户 / 新签合同 / 全部新签）
//   · 多年合同占比一律按「新签合同笔数」而不是按金额算，避免一个大单改写整本账
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'ACV does not fail in one place. The tier ladder can be mispriced, the published price can leak away in negotiation, expansion can be absent, multi-year commitment can be missing, and bundles can go unbought, and each of those has a different cost of reversal. The ladder comes first because it is the cheapest audit and everything else is quoted relative to it: find the tier where adoption runs above 80 percent, which means that tier is underpriced, and the tier where adoption runs below 5 percent, which means the gate above it has friction. Only then can the capture rate be measured, because two of the levers here are discounts and a discount cannot be designed against an unknown baseline. Multi-year commitment follows, at 10-15 percent off annual for two years and 15-20 percent for three, with gross margin re-checked after the discount because multi-year customers churn less and the lifetime-value arithmetic survives it. Bundles come next, priced at roughly 1.5 to 2.5 times the most expensive module rather than the sum of the parts, since shared distribution cost is the reason a bundle is worth more than its parts. An annual prepay default captures cash earlier for a 10-15 percent discount. Expansion then needs a tier worth expanding into, with named CSM ownership over the top 30 percent of the book and usage-triggered upsell at 80 percent of the plan limit. Three calibers hold: average contract value is always annualised, every share states its period and denominator, and the multi-year share counts contracts rather than dollars so one whale cannot rewrite the book.',
      rows: [
        {
          priority: 1,
          metric: 'Tier-migration rate — accounts that moved up a tier in the trailing 12 months ÷ accounts eligible to move',
          fixFirst:
            'Audit the ladder first, because it is the cheapest thing on this list to check and everything else in it is quoted relative to it. A bundle priced at one and a half to two and a half times its most expensive module only makes sense if that module is priced sensibly; an expansion motion only works if there is a tier worth expanding into; and a multi-year discount is a discount on a list price you have not yet confirmed is right. The audit itself is a query over 12 months of tier changes, and it produces two findings worth more than the rate itself: the cheapest tier where adoption sits above 80% is a tier you are charging too little for, and the most expensive tier where adoption sits below 5% is a tier people cannot get into. Read those two before you read the rate, because they tell you whether the problem is price or friction.',
          alsoMoves:
            'It is the hinge for the row below it. A ladder with a hole in the middle — everyone on the cheap tier, nobody able to reach the top one — makes realized price capture look like a pricing strategy when it is really a packaging gap, because the only route to a bigger contract is a negotiated exception rather than an upgrade. A ladder that works does the opposite: customers move up on their own, the expansion motion has somewhere to send them, and the price they land on is one you published rather than one you invented in a deal review.',
          backfire:
            'Repricing the cheapest tier is the standard fix for under-priced adoption, and it is the fix that quietly breaks retention. The cheapest tier holds most of your logos, so raising its price moves the metric that looks best — contract value per customer — while logo churn rises in the same quarter, and net revenue retention follows two quarters later on the anniversary of the increase. By then the price rise reads as a success on ACV and a failure on retention, and the natural response is to discount it back, which restores the original problem with a discount attached. If adoption is already above 80%, the cheaper move is a limit or a feature gate rather than a reprice.',
        },
        {
          priority: 2,
          metric: 'Realized price capture — closed-won contract value ÷ list price at signing, across the trailing 12 months',
          fixFirst:
            'Measure capture before you create any discount, because two of the instruments in this table are discounts and a discount designed against an unknown baseline is a giveaway with a narrative. The guide asks for a multi-year incentive of 10-15% off annual for two years and 15-20% for three, and an annual prepay default with its own discount. Both are reasonable. Both are also meaningless unless you know how much of your published price you collect today: if you already lose 12% to negotiated exceptions and bundle giveaways, a further 15% is a third lever pulling in the same direction, and the accounting still shows revenue growing because average contract value per account grew. Compute capture per segment and per deal source, because a single blended number hides the fact that one source of bookings is priced properly and another is not.',
          alsoMoves:
            'It changes how the ladder row should be read. A capture gap of more than 10 points in the enterprise segment looks like a pricing problem when it is usually a mix of security-review scope creep, professional-services bundling and annual versus multi-year terms — and each of those has a different fix than a list-price change. It also gives the expansion row its denominator: an account that expands from a lower tier should show a higher captured price per seat or per unit than the one it came from, and when it does not, expansion is being sold at a discount and your expansion share is measuring a concession rather than a gain.',
          backfire:
            'Closing a capture gap by repricing existing contracts converts a pricing exercise into a renewal negotiation, and renewals are exactly where the expansion motion was supposed to land. A grandfather clause that lets old contracts keep their price while new ones pay more pushes the gap into a single cohort, and a change applied to live contracts with 60 days of notice invites churn exactly when you were counting on that cohort to expand. The other version is a stealth reprice — an added line on the invoice, a tightened limit, a renewal term that changed quietly — which shows up as revenue this quarter and as a retention problem two to four quarters later, long after anyone remembers the pricing decision.',
        },
        {
          priority: 3,
          metric: 'Expansion ACV share — new ACV from existing accounts ÷ total new ACV booked in the period',
          fixFirst:
            'Fix expansion third because it is the only lever in this table that does not require a new logo, and because the guide sets its bar high: 30-50% of new ACV coming from existing accounts is a world-class figure, and below 20% the motion is sales-led rather than customer-success-led. It needs three things that take time to install — a named owner for the top of the book, an automated trigger when a customer reaches 80% of their plan limit, and an executive sponsor conversation for the larger accounts — which is why it sits behind the two measurement rows and ahead of the two packaging rows. Build it after the ladder, because an expansion trigger that pushes a customer into a mispriced tier converts volume into discounted revenue, and after capture, because you need to know what an expansion is worth before you automate sending it.',
          alsoMoves:
            'Expansion is what makes the tier-migration rate move on its own. A customer who hits 80% of a plan limit and has somewhere obvious to go upgrades rather than capping usage, so usage-triggered expansion and tier migration are the same mechanism seen from two ends. It also changes the multiple you can use on the book: revenue that grows from existing accounts compounds differently from revenue that has to be replaced, so the same blended ACV growth rate is worth more when a larger share of it comes from expansion, and the price of that difference shows up in how long you can afford to keep paying for acquisition.',
          backfire:
            'An expansion motion built on triggers alone upsells into the wrong accounts and books revenue you will give back. A usage trigger at 80% of the plan limit fires hardest on accounts whose usage is erratic or whose team is about to consolidate, so the expansion lands and the account churns one quarter later, and you have converted a churn into a churn plus a discount. The other failure is expanding the wrong product: a customer who needs a second seat of the module they bought is handed a bundle with four modules they do not use, and the bundle cannot be unbundled at renewal, so the whole relationship has to churn rather than downgrade one part.',
        },
        {
          priority: 4,
          metric: 'Multi-year deal share — 2-3 year contracts as a share of new bookings, counted by number of contracts',
          fixFirst:
            'Do the multi-year work fourth, because it is the cheapest cash instrument you have and the easiest one to get wrong. The guide asks for 10-15% off annual on a two-year contract and 15-20% on a three-year one, with a margin check after the discount, because multi-year customers churn less and the lifetime-value math still works. Do it after the capture row so the discount is priced against what you actually collect, and after the expansion row so you are not locking a multi-year price on a book whose pricing you are still changing. Count the share by number of contracts rather than by dollars — otherwise one whale contract signed on three-year terms rewrites the ratio and you conclude that multi-year is working when it is a single deal.',
          alsoMoves:
            'Multi-year commitment changes churn, which changes what every renewal-quarter number means and therefore what the expansion motion is worth. A contracted account does not have to be renegotiated to be kept, so the customer-success capacity you would spend on renewal conversations can go into expansion conversations instead, and the two rows start compounding. It also pulls revenue forward into the quarter you close it, which is the actual point of the instrument: if your cash collection is the constraint, this row changes your position in a month, while the tier and expansion rows need quarters.',
          backfire:
            'A deep multi-year discount buys commitment that expires. A 20% concession that looks like two free months is closer to three once support load and onboarding are counted, and it only beats the alternative if the cohort renews or if the discount is smaller than the churn it avoided. The sharper failure is locking a price: a three-year contract signed this year cannot be repriced when the ladder gets fixed in year two, so your book ends up split into a legacy half that is under-priced and a current half that is not, and blended contract value stops describing either. Only commit on terms you would still sign after the ladder audit.',
        },
        {
          priority: 5,
          metric: 'Bundle attach rate — new bookings containing a bundled module set ÷ all new bookings in the period',
          fixFirst:
            'Bundling belongs fifth because it is the longest implementation lead time of any lever here — it needs a product decision, a packaging change, a pricing page, and a sales script, all in sequence — and because it is the lever most likely to be aimed at a number rather than at a customer. It also has the clearest precondition: the modules in a bundle must genuinely share distribution cost, because that shared cost is the only reason a customer prefers the bundle to buying the pieces. Price the bundle at one and a half to two and a half times its most expensive module, never at the sum of the parts, and only after the ladder row has told you what those modules are worth individually. With a reasonable attach rate, this row moves contract value more than any pricing change you can make without shipping something.',
          alsoMoves:
            'It replaces a negotiated discount with a published price, which is what makes it interact with the capture row. A customer who would have taken two modules with a 15% negotiated discount now takes the bundle at a listed multiple of the top module, so realized capture rises on that deal even though nothing was repriced. It also gives the expansion row a cheaper landing zone: a customer near the top of one module can be offered the bundle at a known price instead of an individually negotiated set of add-ons, which shortens the sales cycle on exactly the deals that were slowest.',
          backfire:
            'Bundling forces a customer to buy something they do not need in order to get the thing they do, and it cannot be undone at renewal: the customer has to churn the whole bundle rather than drop the module they never wanted. Bundle churn is therefore larger than module churn, and it lands on your highest-value accounts, because the accounts that buy bundles are the ones that were buying several things anyway. The second failure is margin-shaped: bundling a module that carries a higher marginal cost of support raises the cost of every dollar of contract value, so gross margin per dollar falls even as the contract value itself rises, and the ACV band looks healthier while the business gets less profitable.',
        },
        {
          priority: 6,
          metric: 'Blended ACV growth rate — trailing-12-month average contract value versus the prior 12 months, against the band for the maturity of the book',
          fixFirst:
            'Read the growth rate last, because it is the outcome and not a lever: it is the number the five rows above are supposed to move, and the point of reading it last is to check whether they actually did. The guide sets the band by maturity — 25-40% a year for an early-stage book, 10-15% for a mature one — and that band is a reasonable expectation, not a target to be forced. A blended rate below the band after a quarter of ladder work, capture measurement, expansion building, multi-year pricing and bundling means one of those five was measured rather than done, and the diagnosis is which one. Keep the rate annualised and keep it on the same population across quarters, because a book that grew by acquiring a competitor will show a growth rate that has nothing to do with any of your decisions.',
          alsoMoves:
            'It is the shared denominator that lets you compare the five levers to each other. Expansion share, tier-migration rate, multi-year share, bundle attach and captured price all move contract value, and only the growth rate tells you which of them actually converted into money in the period. It also disciplines the other five: when the band is respected, you know the levers are working and can push the next one harder, and when it is missed, the temptation to fix the gap by discounting is strongest — which is precisely the move that corrupts the capture row you carefully measured.',
          backfire:
            'The band is maturity-dependent, and holding a mature book to an early-stage number turns an ordinary year into a crisis. A 12% year on a book of 2,000 mature accounts is a good result, and if you treat it as a 30% shortfall, the response is discounting and hiring against a plan that was never built for that book. And a growth rate carried by one contract is not growth: a single large deal signed in a quarter lifts the blended rate, the following quarter looks like a decline, and the pricing decisions you make in reaction to that decline are made on an artifact.',
        },
      ],
    },
    zh: {
      intro:
        'ACV 不会只坏在一个地方。分层阶梯可能定错价，公开标价可能在谈判里漏掉，扩展可能压根没在做，多年承诺可能缺席，打包可能没人买——而每一项的回头成本都不一样。阶梯排在最前，因为它是最便宜的一次审计，而其他每一项都是相对它报价的：找出采用率超过 80% 的那一档（说明它定便宜了）和采用率低于 5% 的那一档（说明它上面那道门槛有摩擦）。只有把阶梯做完才能量实收率，因为这张表上有两个杠杆就是折扣，而折扣不能对着一个未知的基准设计。多年承诺随后上——2 年给 10-15% 折扣、3 年给 15-20%——并且要在折扣之后重新验毛利，因为多年客户流失更少，生命周期价值那笔账才还成立。打包接着来，定价大约是其中最贵那个模块的 1.5 到 2.5 倍而不是各部分相加，因为分摊分发成本正是打包比拆买更值的原因。年付默认用来提前收现金，代价是 10-15% 折扣。扩展随后需要一个值得升上去的档，以及对前 30% 账本指名的 CSM 归属和用量到 80% 上限触发的加售。全表三套口径：ACV 一律是年化后的数，每个占比都写明期间与分母，多年合同占比按笔数算不按金额算，免得一个大单改写整本账。',
      rows: [
        {
          priority: 1,
          metric: '分层升级率 —— 滚动 12 个月内升过档的客户数 ÷ 有资格升级的客户数',
          fixFirst:
            '第一个做阶梯审计，因为它是这张表上最便宜的检查，而其他每一项的报价都是相对它来的。一个按最高单模块 1.5-2.5 倍定价的打包，只有在那个模块本身定价合理时才成立；扩展动作只有在存在一个值得升上去的档时才成立；多年折扣则是对一个「你还没确认定对了」的标价打折。这个审计本身是对 12 个月档位变更的一次查询，而它产出的两个发现比升级率本身更值钱：采用率在 80% 以上的最便宜那一档，说明你收少了；采用率在 5% 以下的最贵那一档，说明别人进不来。先看这两个发现，再看升级率 —— 它们告诉你问题出在价格还是摩擦。',
          alsoMoves:
            '它是下一行的转轴。中间断了一层的阶梯 —— 全挤在最便宜的档、没人够得到最贵的那档 —— 会让实收率看起来像是一种定价策略，而它其实是包装缺口：想拿到更大的合同，唯一路径是谈判里临时开一个例外，而不是升级。一个真正在承重的阶梯恰恰相反：客户自己会往上走，扩展动作有地方可送，而他们落到的是你公开过的价格，不是你在评审会上临时想出来的一个数。',
          backfire:
            '给最便宜那一档重新定价，是「采用率过高」的标准修法，也正是会悄悄搞坏留存的那个修法。最便宜的档里装了你大部分客户数，所以提价会把最好看的那个指标（每客户合同额）推上去，同时同季度的客户流失在涨，而净收入留存会在两个季度后、提价周年那天跟着掉。到那时提价在 ACV 上读起来是成功、在留存上读起来是失败，人的自然反应是把它折回去 —— 于是原问题回来了，还附赠一个折扣。采用率已经超过 80% 时，更省的做法是加一个用量限制或功能门槛，而不是重新定价。',
        },
        {
          priority: 2,
          metric: '实收价格捕获率 —— 已成交合同额 ÷ 签约当时的标价，取滚动 12 个月',
          fixFirst:
            '先量实收，再去创造任何折扣，因为这张表上两个工具都是折扣，而对着未知基准设计的折扣等于一个带叙事的白送。指南要求多年激励给 2 年 10-15%、3 年 15-20%，年付默认也带它自己的折扣；两个都合理，两个也都只有在你知道自己今天实际收回多少公开标价之后才有意义 —— 如果你已经因为谈判例外和打包让利漏掉 12%，再让 15% 就是三个杠杆朝同一个方向拽，而账面上的收入还在涨，因为每客户合同额涨了。实收率要按分段、按来源分开算，因为一个混在一起的数字会掩盖「其中一种来源定价正常、另一种不正常」这件事。',
          alsoMoves:
            '它会改变上一行的读法。大客户段 10 个点以上的实收缺口，看起来像定价问题，实际通常是安全评审范围蔓延、专业服务被捆进合同、以及年付与多年条款混在一起 —— 每一种的修法都不是改标价。它同时给扩展那一行提供了分母：一个从低档升上来的客户，每席位或每单位的实收价应该高于它原来那一档；当它并不更高时，你所谓的扩展其实是在打折，扩展占比量到的是一次让价而不是一次增长。',
          backfire:
            '靠给存量合同重新定价来补实收缺口，等于把一次定价练习变成一场续约谈判，而续约恰恰是扩展动作原本要落地的地方。一条「老合同保留旧价、新合同按新价」的祖父条款会把缺口压到某一个群体上；而对在合同期内的客户提前 60 天通知改价，则会在你指望这个群体扩展的时候把他们逼走。另一个版本是暗改：发票上多一行、用量限制悄悄收紧、续约条款换了个说法 —— 本季度看起来是收入，两到四个季度之后是一道留存问题，而那时早就没人记得当初那个定价决定了。',
        },
        {
          priority: 3,
          metric: '扩展 ACV 占比 —— 来自存量客户的新 ACV ÷ 同期全部新签 ACV',
          fixFirst:
            '扩展排第三，因为它是这张表上唯一一个不需要新 logo 的杠杆，而指南给它的门槛很高：30-50% 的新 ACV 来自存量客户是世界级水平，低于 20% 说明这个动作还是销售在推、而不是 CSM 在推。它需要三样装起来都要时间的东西 —— 账上一部分客户有具名负责人、用量到计划上限 80% 时自动触发、以及大客户配高管赞助沟通 —— 所以它排在两个「量」的行后面、两个「打包」的行前面。先做阶梯，再做扩展：用量触发如果把客户推进一个定错价的档，量就变成了打折的收入；也要排在实收之后，因为自动化发出一个扩展邀约之前，你得先知道一次扩展值多少钱。',
          alsoMoves:
            '扩展正是让分层升级率自己动起来的机制。一个用量到 80% 上限、且有明确去处可去的客户会升级，而不是把用量卡住，所以用量触发式扩展和分层升级是同一个机制的两端。它也改变你能给整本书乘上的倍数：来自存量的收入和必须被替换掉的收入，复利方式不同，于是同样的综合 ACV 增长率，当其中更大比例来自扩展时更值钱，而这个差值体现为你还能撑多久的获客投入。',
          backfire:
            '只靠触发器搭起来的扩展动作，会把销售推给不该推的账户，并且记下一笔你之后要还回去的收入。用量到上限 80% 的触发，在用量忽高忽低、或团队即将整合的账户上触发得最凶，于是扩展刚落地，一个季度后账户就流失了，你等于把一次流失变成「流失 + 折扣」。另一个失败是扩展错了产品：一个本来只需要多买一个席位的客户，被塞了一个含四个模块的打包，而打包在续约时不能拆，于是他只能整本流失，而不是降掉一个用不上的模块。',
        },
        {
          priority: 4,
          metric: '多年合同占比 —— 2-3 年合同笔数占全部新签笔数的比例',
          fixFirst:
            '多年放第四，因为它是你手里最便宜的现金工具，也是最容易用错的一个。指南要求 2 年合同给年付 10-15%、3 年给 15-20%，并在折扣后做毛利校验，因为多年客户流失更少、LTV 数学仍然成立。要排在实收那行之后，这样折扣才是对着你实际收得到的数设计的；也要排在扩展之后，免得你在一本价格还要继续改的账上锁死多年价格。占比按笔数算而不是按金额算 —— 否则一笔签了三年的 whale 合同就改写了这个比率，你会得出「多年有效」的结论，而它只是一笔单子。',
          alsoMoves:
            '多年承诺改变流失，而流失改变每一个续约季度的数字含义，于是也改变扩展动作值多少钱。已经签下合同的客户不需要被重新谈才能留住，于是你原本花在续约谈话上的 CSM 产能可以挪去做扩展谈话，这两行就开始复利。它也把收入提前拉到成交的那个季度，而这正是这个工具的真正目的：如果现金回收是你的约束，这一行一个月内就改变你的处境，而阶梯和扩展那两行都要几个季度。',
          backfire:
            '过深的多年折扣买来的是会到期的承诺。一个看起来像让两个月、摊上支持与上手成本其实接近三个月的 20% 让利，只有在这个群体续约、或者让利小于它所避免的流失时才划算。更尖锐的失败是锁价：今年签的三年合同，在你第二年修好阶梯之后没法重新定价，于是你的账被切成「定价过低的老的一半」和「没被重新定价的新的一半」，综合合同额两边都不再描述任何一个。你只在修完阶梯审计之后仍然愿意签的条款上做承诺。',
        },
        {
          priority: 5,
          metric: '打包附加率 —— 含打包模块组合的新签合同笔数 ÷ 全部新签笔数',
          fixFirst:
            '打包放第五，因为它在这张表上实施周期最长 —— 需要依次做产品决策、包装改动、定价页和销售话术 —— 也因为它最容易变成「对着一个数字做」而不是「对着一个客户做」。它还有一个最清楚的前置条件：被打包进来的模块必须真的共享分发成本，因为那份共享的成本是客户觉得打包划算的唯一理由。打包价定在最高单模块的 1.5-2.5 倍，绝不按部件加总，而且要等阶梯那一行告诉你这些模块单独值多少钱之后再定。只要附加率站得住，这一行在不动产品的前提下，比任何一次纯定价调整更能推动合同额。',
          alsoMoves:
            '它把一次谈判出来的折扣换成一个有公开价的套餐，所以它与实收那一行直接互动。一个本来会买两个模块还砍掉 15% 的客户，现在按最高模块的公开倍数买打包，于是这笔单的实收率就上去了，尽管你什么都没重新定价。它也给扩展那一行提供更便宜的落点：一个用到某个模块上限的客户，可以被提供一个价格明确的打包，而不是一组要逐项谈的加购 —— 而这恰好是原本最慢的那批单子。',
          backfire:
            '打包等于逼客户为了得到想要的东西而买不想要的东西，而且它在续约时无法拆掉：他只能整本流失，而不是退掉那个从没用过的模块。于是打包的流失比单模块的流失更大，而且它落在你最值钱的客户上 —— 买打包的本来就是那些本来就买好几样的客户。第二个失败是毛利形状：把一个支持边际成本更高的模块打进包里，每一块合同额对应的成本就上去了，于是每美元合同额的毛利下降，合同额本身却在涨，ACV 带看着更健康，而生意变得更不赚钱。',
        },
        {
          priority: 6,
          metric: '综合 ACV 年增长率 —— 滚动 12 个月平均合同额对比上一个 12 个月，对照该成熟度下的区间',
          fixFirst:
            '增长率放最后读，因为它是结果而不是杠杆：它是上面五行应该推动的那个数，而放最后读，正是为了检查它们到底推动没有。指南按成熟度给了区间 —— 早期账本一年 25-40%，成熟账本 10-15% —— 而这个区间是一个合理预期，不是必须够到的目标。如果做了一整个季度的阶梯、实收度量、扩展建设、多年定价与打包之后，综合增长率仍低于区间，那么这五行里有一项是被「量了」而没有被「做掉」，而诊断就落在是哪一项上。增长率必须年化、必须在同一个总体上跨季度比较，因为一个靠收购长出来的账本会呈现一个与你的任何决定都无关的增长率。',
          alsoMoves:
            '它是那五个杠杆之间唯一共享的分母，让你能把它们互相比较。扩展占比、分层升级率、多年占比、打包附加率和实收价格都会推动合同额，而只有增长率告诉你其中哪几个真的在当期换成了钱。它也约束另外五个：区间被守住时，你就知道这些杠杆在起作用、可以推下一个更狠；区间被突破时，人最容易的做法是打折去补，而那正好会污染你刚刚仔细量过的实收率。',
          backfire:
            '区间是随成熟度变的，拿早期账本的标准去要求一本成熟账本，会把普通的一年变成危机。一本 2,000 个成熟客户的账本上一年涨 12% 是个好结果，如果你把它当成差了三成，反应就是打折和扩编，去追一个本来就不为这本账写的计划。还有一层：靠一笔合同撑起来的增长率不是增长 —— 单季度一笔大单把综合比率抬上去，下一季度看起来就是衰退，而你据此做出的定价决定是建立在一个假象上的。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Eight checks decide whether an ACV program has earned the right to change price, and each of them can be satisfied on paper while the book still does not move. The decomposition comes first and it separates segment, source and contract length, because an average contract value that mixes a three-year enterprise deal with a one-year SMB deal cannot be compared to a tier-migration rate, and the weighted figure only means something once expansion revenue and new-logo revenue sit on different lines. The tier-migration audit then runs over twelve months and records the cheapest tier where adoption is above 80 percent and the most expensive where it is below 5 percent, because those two numbers are the pricing diagnosis and everything later is a response to them. The multi-year incentive is then sized at 10-15 percent for two years and 15-20 percent for three, and validated against gross margin after the discount rather than before it. Bundles are priced at 1.5 to 2.5 times the highest single module, never the sum of parts, and the attach rate is measured per bundle rather than across the portfolio. The annual prepay default is then applied to the segment where cash timing matters most, and its effect on gross cash collection is written down. The expansion motion follows with CSM ownership for the top 30 percent of the book, usage-triggered upsell at 80 percent of plan limit, and executive reviews for enterprise accounts. The what-if branches then model the tier-migration lift, the multi-year shift, the bundle attach rate and expansion rising from 10 percent toward 30 percent, and the quarterly re-benchmark runs last, once the earlier rows hold.',
      items: [
        {
          step: 1,
          label: 'Every booking decomposed by segment, source and contract length',
          gate:
            'At least 95% of bookings in the trailing 12 months carry a segment tag, a source tag (new logo or expansion) and a contract-length tag (annual or multi-year), and weighted ACV is recomputed as segment ACV multiplied by customer count.',
          blockIf:
            'Below 95% tagged, you cannot separate expansion from new logos, and every later ratio on this list becomes ambiguous: a tier-migration rate that includes new accounts, an expansion share that includes renewals, and a multi-year share measured on dollars rather than contracts. Fix the tagging before any of the four levers is judged, because all four are measured on top of it.',
        },
        {
          step: 2,
          label: 'Tier-migration audit listing every upgrade path and its rate',
          gate:
            'All upgrade paths between tiers are listed, the upgrade rate over the trailing 12 months is computed as a share of accounts eligible to move, and both the cheapest tier with adoption above 80% and the most expensive tier with adoption below 5% are named in writing.',
          blockIf:
            'Without the two named tiers you have a rate but no diagnosis, and the rate alone can read as healthy while the ladder has a hole in the middle. If adoption is only measured on the tier with the most customers, the under-priced bottom tier and the unreachable top tier are exactly the two you will not see, and every price decision after this one inherits the blind spot.',
        },
        {
          step: 3,
          label: 'Multi-year incentive published and margin-checked after the discount',
          gate:
            'The two-year discount (10-15% off annual) and three-year discount (15-20%) are published in writing, gross margin per customer after the discount is computed on the trailing 12-month cohort, and it stays at least 5 points above the floor for each segment.',
          blockIf:
            'A discount that was never checked against margin is a giveaway with a narrative, and the damage is invisible in the revenue line because contract value per account rises while the margin on it falls. If the multi-year share is not counted by number of contracts, one whale deal can make the ratio look healthy, and you will commit more of the book to a term you have never priced.',
        },
        {
          step: 4,
          label: 'Bundle defined, priced against the top module, and given an attach target',
          gate:
            'At least 1 bundle of 2-3 modules is defined with the shared distribution cost documented, the price is set at 1.5-2.5x the highest single module rather than the sum of the parts, and a numeric attach-rate target for the first quarter is written down.',
          blockIf:
            'A bundle whose modules do not share distribution cost is a discount with extra steps, because the customer can still buy the two pieces separately and keep the difference. If the bundle price is the sum of the parts, you have launched packaging work and gained no revenue, and if no numeric attach target exists, nobody can tell whether the bundle worked.',
        },
        {
          step: 5,
          label: 'Annual prepay default live, with the cash effect measured not estimated',
          gate:
            'The monthly option is removed from the SMB tier, the 10-15% annual discount is published with a date, and the change in gross cash collected is measured over 2 consecutive quarters against the pre-change baseline rather than projected.',
          blockIf:
            'Removing the monthly option without a measurement turns a cash decision into an argument about churn, because the only evidence available is a revenue dip in the transition month. If the effect is projected rather than measured, the projection gets used as the baseline for the next pricing change, and any error in it is carried forward into every later quarter.',
        },
        {
          step: 6,
          label: 'Expansion motion running with named coverage on all three triggers',
          gate:
            'A named customer-success owner covers the top 30% of the book by revenue, the usage trigger fires at 80% of plan limit for every account above that limit, and the enterprise accounts have a scheduled executive review, each with an account count on record.',
          blockIf:
            'Expansion revenue without a named owner is revenue you cannot repeat, because it depends on one person noticing an account approaching its limit. If the trigger is not measured on a fixed percentage, it becomes a judgement call and fires on the accounts with the least reliable usage data. Without the account counts, you cannot tell whether the motion covers a tenth of the book or all of it.',
        },
        {
          step: 7,
          label: 'What-If branches modelled for all four levers with assumptions recorded',
          gate:
            'At least 4 What-If branches are run each quarter, covering tier-migration lift, multi-year adoption, bundle attach rate and expansion rate moving from 10% to 30%, and each branch records its blended ACV impact together with the assumption that produced it.',
          blockIf:
            'Running one branch at a time hides the interactions, and the interactions are where the risk lives: multi-year adoption and expansion move the same book in opposite directions on cash. If the assumptions are not written down next to each result, a branch cannot be re-run later to see which assumption was wrong, and the model becomes a set of numbers nobody trusts enough to act on.',
        },
        {
          step: 8,
          label: 'Quarterly re-benchmark with the band reset for the maturity of the book',
          gate:
            'Every 4 quarters the ACV growth rate is recomputed on the trailing 12 months, the band is reset for the maturity of the book (25-40% early stage, 10-15% mature), and at least 2 consecutive readings inside the band are recorded before any pricing action is taken on growth alone.',
          blockIf:
            'A book that matures while its band stays at the early-stage number produces a permanent shortfall that looks like a strategy failure, and the usual response is a discount that damages capture. Without 2 consecutive readings, a single quarter carried by one large contract is enough to trigger a pricing decision that the next quarter will prove wrong, and reversing a price change costs more than making one.',
        },
      ],
    },
    zh: {
      intro:
        'ACV 这套做法够不够格改价，看八件事，而每一件都能在纸面上通过、账本却不动。拆分排在最前，并且要把分段、来源与合同期限分开，因为把一份 3 年期企业合同和一个 1 年期 SMB 合同混在一起算出来的均值，没法和分层升级率比；加权口径只有在扩展营收与新 logo 营收分列之后才成立。分层升级审计随后覆盖近 12 个月，并记下采用率高于 80% 的最便宜那一档与低于 5% 的最贵那一档，因为这两个数就是定价诊断，后面的一切都是对它们的回应。多年激励随后定为 2 年 10-15%、3 年 15-20%，并且在折扣之后而不是之前验毛利。打包定价按其中最贵模块的 1.5 到 2.5 倍走，绝不是各部分相加，挂载率也要逐个打包量而不是在组合层平均。年付默认随后落在现金时点最要紧的那个分段上，并把对总回款的影响写下来。扩展动作接着上：对前 30% 账本指名的 CSM 归属、用量到上限 80% 触发的加售、企业客户的经营层复盘。分支随后建模分层升级的抬升、多年占比的迁移、打包挂载率，以及扩展从 10% 走向 30% 的路径；季度复盘放在最后，等前面几行成真再跑。',
      items: [
        {
          step: 1,
          label: '每一笔新签合同都按分段、来源与合同长度拆开',
          gate:
            '滚动 12 个月里至少 95% 的合同带齐分段标、来源标（新 logo 或扩展）与合同长度标（年付或多年），并且按「分段 ACV × 客户数」重算加权 ACV。',
          blockIf:
            '打标率低于 95%，你就分不开扩展与新 logo，这张清单后面每个比率都会变得含糊：一个把新客户算进去的升级率、一个把续约算进去的扩展占比、一个按金额而不是按笔数量出来的多年占比。先把标打完再评判四个杠杆，因为四个都是在它上面量的。',
        },
        {
          step: 2,
          label: '分层升级审计：列出每条升级路径与年度升级率',
          gate:
            '层与层之间的每条升级路径都被列出，滚动 12 个月的升级率按「有资格升级的客户数」为分母算出，并且采用率高于 80% 的最便宜档、采用率低于 5% 的最贵档，两者在文字里被点名。',
          blockIf:
            '没有点出那两个档，你手上只有一个比率、没有诊断，而这个比率在阶梯中间断了层时看起来还挺健康。如果采用率只在客户最多的那一档上量，那么定价最低的底档和进不去的顶档恰好是你看不见的两档 —— 而这之后每一个定价决定都会继承这个盲区。',
        },
        {
          step: 3,
          label: '多年激励已公开，且折扣之后做过毛利校验复核',
          gate:
            '2 年 10-15%、3 年 15-20% 的折扣以文字形式公开，按滚动 12 个月群体算出折扣后的每客户毛利，且每个分段都至少高出毛利底线 5 个百分点。',
          blockIf:
            '没做毛利校验就发出去的折扣，是一个带叙事的白送，而它的伤害在收入行里看不见 —— 因为每客户合同额涨了、它上面的毛利却掉了。如果多年占比不按笔数量，一笔 whale 合同就能把比率装得很健康，而你会把账上更多部分锁定在一个你从来没定价过的条款上。',
        },
        {
          step: 4,
          label: '打包已定义、按最高模块定价，并写下了附加率目标',
          gate:
            '至少 1 个由 2-3 个模块组成的打包被定义，并写明它共享的分发成本，定价为最高单模块的 1.5-2.5 倍而非部件加总，且第一个季度的附加率目标是一个具体数字。',
          blockIf:
            '模块不共享分发成本的打包等于绕了一圈的折扣，因为客户仍然可以分开买两块、把差价留下。如果打包价按部件加总，你上线了包装工作却没换到任何收入；而如果没有一个数字化的附加率目标，谁也判断不出这个打包到底有没有用。',
        },
        {
          step: 5,
          label: '年付默认已上线，现金效果是实测而不是估算',
          gate:
            'SMB 端的月付选项已被下架，10-15% 的年付折扣连同上架日期一并公开，且毛现金回收的变化在连续 2 个季度里对着变更前的基线被实测，而不是估算。',
          blockIf:
            '下架月付却不做度量，会把一个现金决定变成一场关于流失的争论，因为手上唯一的证据是过渡那个月的收入下滑。如果这个效果是估算出来的，那个估算就会被当成下一次定价决定的基线，于是它的误差被带进之后每一个季度。',
        },
        {
          step: 6,
          label: '扩展动作在跑，三类触发各自都有具名负责人覆盖',
          gate:
            '按收入排名前 30% 的客户有具名的客户成功负责人，用量触发在所有超过 80% 上限的账户上都会响，大客户账户有排期的高管复盘，三者都留有账户数记录。',
          blockIf:
            '没有具名负责人的扩展收入是收不回来的收入，因为它取决于某一个人恰好注意到某个账户快到上限了。如果触发点不按固定比例量，它就会变成一个判断题，于是它最先响的是用量数据最不可靠的那些账户。没有账户数，你就分不清这个动作覆盖了账本的十分之一还是全部。',
        },
        {
          step: 7,
          label: '四个杠杆都跑过 What-If 分支，并记录假设',
          gate:
            '每个季度至少跑 4 个 What-If 分支，覆盖分层升级提升、多年合同采用、打包附加率，以及扩展率从 10% 到 30%，每个分支都写下它的综合 ACV 影响以及产生这个结果的假设。',
          blockIf:
            '一次只跑一个分支会藏起那些相互作用，而相互作用正是风险所在：多年合同与扩展在现金流上是朝相反方向动的同一本书。如果假设不写在结果旁边，这个分支以后就无法重跑以判断是哪个假设错了，那个模型就变成一堆没人敢据以行动的数。',
        },
        {
          step: 8,
          label: '每季度复盘，并按账本成熟度重设增长率区间',
          gate:
            '每 4 个季度按滚动 12 个月重算 ACV 增长率，按账本成熟度重设区间（早期 25-40%、成熟 10-15%），并且至少有连续 2 次落在区间内的读数，才允许仅凭增长率动定价。',
          blockIf:
            '账本成熟了而区间还停在早期那个数上，会造出一个永久性的缺口，看起来像战略失败，而常见的反应是打折 —— 那正好会伤到实收率。如果只有 1 次读数，一个季度里的一笔大合同就足以触发一次定价决定，而下个季度会证明它是错的；改一次价比做一次价贵。',
        },
      ],
    },
  },
};
