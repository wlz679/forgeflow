// P166 —— D 类（Freelance Pricing）主题「saas-pricing-strategy」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 8 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许手写金额，但必须带口径）：
//   · 金额一律 USD；月度/年度价与 ARPU 都标明是 list 还是 net（净额）口径
//   · ARR 一律指滚动 12 个月的经常性收入，且必须拆成「现行价 / 老价 / 议定价」三块再算占比
//   · 占比与转化率的期间一律写明：单个季度 / 滚动 12 个月 / 某一批新签（cohort）
//   · 弹性一律按「涨价 10% 会丢多少销量」表达，因为弹性系数在不同口径下不可比
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Pricing loses money in two directions at once, and most teams watch one. The value metric decides whether revenue scales with the customer outcome you create or with your own cost; tier distribution decides whether your middle tier carries the mix; legacy price realisation decides how much sold below your current list.',
      rows: [
        {
          priority: 1,
          metric: 'Value metric fit — the unit you charge on versus the unit value scales with',
          fixFirst:
            'Start here because every other row in this table is computed on top of it, and a price meter that does not scale with customer value turns the ladder in Step 2 into a guess. List the units your customers already use and can verify on their own invoice — seats, API calls, GB stored, transactions, monthly active workspaces — and apply the test that pricing research keeps repeating: the unit you charge on must be the unit whose growth tracks the customer getting more value, and it must be the unit the customer can forecast. Per-seat works for collaboration because a hire is a value event; per-call works for infrastructure because usage is the value; per-transaction works for vertical SaaS because the transaction is the job being done. Pick one, then find accounts using roughly twice the product and check whether they pay roughly twice the price. If they do not, the meter is charging you for something that is not their value.',
          alsoMoves:
            'It decides how much of the price change in Step 6 you can keep, because a meter tied to value converts a price change into a proportional revenue change rather than a demand shock. It also determines what the tier boundaries in Step 2 can be built on, because a tier only means something when it changes the quantity of the metering unit — a seat cap, a call quota, a storage limit. And a correct value metric is the precondition for the Step 4 elasticity test to be readable at all, since a conversion drop caused by an unpredictable bill tells you nothing about willingness to pay.',
          backfire:
            'The classic mistake is picking the meter that is easiest to bill rather than the one that tracks value, and it produces a revenue line that grows while the customer perceived value falls. Charging per seat in a product whose value comes from transactions makes every additional user a cost to the customer, so the account removes seats, revenue per customer falls, and the customer still gets the same outcome. The other version is a usage meter with no ceiling: the invoice becomes unpredictable, the customer caps usage below real need, and both expansion revenue and support load rise. Metering something customers cannot forecast is how you lose the annual prepay conversation in Step 3 before you ever have it.',
        },
        {
          priority: 2,
          metric: 'Tier distribution — share of paying accounts on Starter, middle and Enterprise',
          fixFirst:
            'Once the meter is right, check whether the ladder is doing any work: of paying accounts, roughly 60 percent should sit on the middle tier, 30 percent on Starter and 10 percent on Enterprise. Pull the trailing 12 months of accounts by tier and compute the three shares. If the middle tier holds under 40 percent, the ladder is mispriced rather than under-built: either Pro is not different enough from Starter to justify the step up, or the price gap between them is too small to bother with. The repair is packaging first — a limit or feature that only makes sense on Pro — and only then the gap of 2.5-3x between Starter and Pro. If the middle tier is above 80 percent, you have no enterprise motion and the top of the ladder is decorative.',
          alsoMoves:
            'It is the number that tells you whether the Step 4 price test is worth running at all, because elasticity measured on a segment whose tier distribution is broken measures the mix rather than the price. A healthy distribution also makes the Step 2 ratios testable, since Pro at 2.5-3x Starter and Enterprise at 5-10x Pro implies a specific revenue mix, and when actual mix diverges from that, the ratio is where the error sits. Finally a working middle tier is what makes the annual prepay discount in Step 3 cheap, because you are trading one month of revenue for twelve months of it.',
          backfire:
            'The tier distribution can be improved in a way that raises revenue and destroys the ladder. Moving accounts upward by stripping features out of Starter is the cheapest way to hit 60 percent on the middle tier, and it produces a customer base that resents the product and churns at the next renewal, which surfaces a quarter later as a retention problem that looks unrelated to pricing. The other failure is discounting Pro down into the range of Starter to push the mix: the share looks right, the anchor is gone, and Pro stops being worth upgrading to, so expansion revenue dries up while the distribution metric stays green.',
        },
        {
          priority: 3,
          metric: 'Annual prepay conversion and the discount depth paid for it',
          fixFirst:
            'Next, because commitment is the cheapest revenue you can buy and the easiest place to give margin away without noticing. Compute the share of new logos that take the annual plan at checkout, and the effective discount being paid against the monthly equivalent: the proven band is 10-20 percent, with roughly 1-2 months free equivalent as the opt-in incentive on top. Under 20 percent annual mix, the default is wrong rather than the price — make the annual plan the highlighted option at checkout, state the saving in USD per year, and treat that one page as the only thing you test for four weeks. If the mix is healthy but the discount is above 25 percent, you are buying twelve months of revenue for two months of give-away, and the break-even renewal rate on that cohort has to be written down.',
          alsoMoves:
            'It converts recurring monthly churn risk into a contracted base, which is the same effect the Step 6 cadence relies on when it reprices legacy accounts, because a customer who has already prepaid has to be renegotiated rather than cancelled. It also changes what the Step 4 test can tell you, since an annual cohort does not react to a new-customer price test the way a monthly cohort does. And a real annual mix is what makes the Step 7 what-if forecast meaningful, because the annual conversion rate is one of the inputs that turns a tier change into an ARPU projection.',
          backfire:
            'A deep annual discount buys commitment that expires. If you concede 25 percent to convert a monthly customer, the annual cohort only beats monthly if it renews or if the discount is smaller than the churn it avoided, and a 25 percent concession that looks like 2 free months is really a 3-month giveaway once ramp and support are counted. The subtler failure is making the discount so visible that the monthly price stops being credible: buyers learn to wait for the annual offer, so you have trained your best prospects to delay, and the pipeline you built in Step 4 now has a queue instead of a flow.',
        },
        {
          priority: 4,
          metric: 'Price elasticity by segment — volume lost per 10% price increase',
          fixFirst:
            'Only once the meter, the ladder and the commitment terms are stable do you measure what a price change costs in volume, because a test run on an unstable base cannot be read. Run a 4-week A/B test on new customers only, with legacy contracts protected, at a 5-10 percent increase, and track three numbers rather than one: conversion, ARPU and gross margin. The reason to run it per segment is that elasticity is not a company-level constant — the guide puts SMB volume loss at 15-25 percent for a 10 percent raise against 3-5 percent for enterprise, so a single blended test averages a very elastic segment with an inelastic one and lands on the worst of both. Write the ship rule before the test: at which ARPU and gross margin combination you roll the change out to that segment, and what you do if conversion falls more than the agreed threshold.',
          alsoMoves:
            'It tells you how much of the Step 6 raise is available and therefore how aggressive that cadence can be, since a segment with 3-5 percent elasticity can absorb roughly a 10 percent raise every 12 months while an SMB segment at 15-25 percent needs a smaller step more often. It also sets the ceiling on the Step 5 localization matrix, because a market priced at 60-80 percent of US list has less headroom before it becomes a discounting market. And the gross margin arm of the test matters as much as conversion, because a raise that survives on volume but destroys margin is not a price increase, it is a subsidy to your own cost base.',
          backfire:
            'Running the elasticity test across the whole book at once turns a price move into a churn event, because legacy accounts on annual contracts see their renewal invoice jump with no warning, and the annual cohort from Step 3 was explicitly protected in the design being abandoned. The other failure is testing conversion alone: if a 10 percent raise cuts conversion by 15 percent but the buyers who remain are the larger accounts, ARPU rises and you conclude the test passed, when gross margin per lead has actually fallen because you now pay acquisition cost for fewer, bigger and more expensive-to-serve customers.',
        },
        {
          priority: 5,
          metric: 'Legacy price realization — share of trailing 12-month ARR priced below current list',
          fixFirst:
            'Last, because this is the decay that turns a pricing system into a discount list. Take trailing 12-month ARR and split it into three blocks: revenue at the current list price, revenue at a legacy list price, and revenue at a bespoke negotiated price, then compute the share sitting below current list. Above 30 percent, the cadence in Step 6 is not running. Audit the top 20 accounts by ARR first, because that is where the drift concentrates, and write the 60-90 day notices the cadence requires. Grandfather nothing beyond the current contract term, and record the notice date so the renewal conversation starts from a schedule rather than from whoever remembers first.',
          alsoMoves:
            'It is what makes the ARPU in Step 7 mean something, because ARPU computed over a book that is 40 percent legacy is not the ARPU of your pricing — it is the average of two pricing systems, and every scenario you model on it inherits that average. It also sets the effective value of every raise you do land, since a 10 percent increase applied to 70 percent of ARR is a 7 percent company-wide increase. And repricing legacy accounts is what funds the discount discipline in rows three and four, because it is the only lever that raises price without touching demand.',
          backfire:
            'Repricing legacy accounts in a weak quarter converts a price decision into a churn event, and the churn lands in the same quarter as the revenue you were trying to protect, so the quarter looks worse than doing nothing would have. The other version is repricing by stealth — adding a line to the invoice, tightening a limit, or changing a renewal term — which raises real revenue while the relationship degrades, and that retention cost surfaces two to four quarters later, long after the price change has been forgotten. And the failure of failing to reprice is that the whole book converges on the oldest price, so the ladder designed in Step 2 stops existing in practice.',
        },
      ],
    },
    zh: {
      intro:
        '定价的漏钱发生在两个方向，多数团队只盯其中一个。价值指标决定收入是跟着你创造的客户价值走，还是跟着你的成本走——按席位收费利于续费扩容，按用量收费才能吃到客户自己长出来的价值。分层分布决定中间档有没有真的承住业务量：低于 10% 的入门转专业转化说明中间档定价错了。老价实现率则决定过去一年有多少还是按旧价成交。涨价的代价也按细分算：SMB 涨 10% 可能丢 15-25% 销量，大客户只丢 3-5%。这才是弹性该被测的地方，而不是笼统地问涨多少合适。',
      rows: [
        {
          priority: 1,
          metric: '价值指标匹配度 —— 你收费的单位 vs 客户价值扩张的单位',
          fixFirst:
            '从这一行开始，因为表里其他每一行都是建在它之上的，而一个不随客户价值扩张的计费单位，会让步骤 2 的阶梯变成猜。列出客户已经在用、并且能自己在发票上核对的单位——席位、API 调用、存储 GB、交易量、月活工作区——然后套那条被反复验证过的判据：你收费的单位，必须是「增长幅度与客户获得的价值同向」的那个单位，而且必须是客户能预测的那个单位。协同类按席位收费成立，因为加一个人就是一次价值事件；基础设施按调用收费成立，因为用量就是价值；垂直 SaaS 按交易收费成立，因为交易就是客户要办的那件事。选定一个之后，找出用量大约是别人两倍的账户，看他们付的钱是不是也大约是两倍。如果不是，那这个单位收的根本不是客户的价值。',
          alsoMoves:
            '它决定步骤 6 那次涨价你能保住多少，因为一个绑在价值上的单位，会把价格变化转换成收入的比例变化，而不是需求冲击。它同时决定步骤 2 的档位边界能建在什么上——一个档位只有当它改变了计费单位的数量时才有意义，比如席位上限、调用配额、存储上限。而价值指标选对，也是步骤 4 的弹性测试能被读懂的前提：一份不可预测的账单带来的转化率下滑，什么也说明不了客户的支付意愿。',
          backfire:
            '最经典的错，是选了最好计费的那个单位，而不是那个跟着价值走的单位，结果是收入线在涨、客户感知的价值在跌。在一个价值来自交易的产品里按席位收费，每多一个用户对客户就是多一份成本，于是账户会砍掉席位、你每个客户的收入在掉，而客户拿到的结果一点没变。另一个版本是加了封顶上限的用量计费：账单变得不可预测，客户会把用量压到低于真实需要的水平，于是扩张收入和支持负荷一起涨。把客户没法预测的东西拿来计费，就是你在还没开始谈年付之前就已经输掉了步骤 3 那场对话。',
        },
        {
          priority: 2,
          metric: '分层分布 —— 付费账户落在入门档 / 中间档 / 企业档的占比',
          fixFirst:
            '计费单位对了之后，看阶梯到底有没有在干活：付费账户里大约 60% 应该落在中间档、30% 在入门、10% 在企业。把滚动 12 个月的账户按档位拉出来，算这三个占比。如果中间档不到 40%，问题不是功能没做够，而是阶梯定价错了：要么专业档跟入门档的差别不足以让人愿意升级，要么两档的价差小到根本不值得跳。修法是先补包装——一个只有专业档才说得通的限制或功能——然后才把入门与专业之间的价差拉到 2.5-3x。如果中间档超过 80%，说明你没有企业侧的动作，阶梯顶端只是装饰。',
          alsoMoves:
            '它是判断步骤 4 那次价格测试值不值得做的那个数：在分层分布还坏着的时候测出来的弹性，测到的是产品结构而不是价格。健康的分布也让步骤 2 的倍率可被检验——专业档 2.5-3x 入门、企业 5-10x 专业，本来就隐含一个收入结构，实际结构一旦偏离，偏差就在倍率上。最后，一个真正在承重的中间档，才让步骤 3 的年付折扣变便宜，因为你用一个月的收入换来了十二个月。',
          backfire:
            '分层占比可以在涨收入的同时把阶梯毁掉。把入门档的功能抽走、把人往上赶，是凑到中间档 60% 最省事的办法，代价是造出一批怨恨产品、在下一次续约就流失的客户，两个季度之后它会以一个看起来跟定价无关的留存问题的面目出现。另一个失败是把专业档打折压进入门档的区间来推结构：占比看着对了，锚点没了，专业档不再值得升级，于是扩张收入枯了，而分层占比那个指标还是绿的。',
        },
        {
          priority: 3,
          metric: '年付转化率，以及你为它付出的折扣深度有多深',
          fixFirst:
            '接着做，因为承诺是你能买到的最便宜的收入，也是最容易不知不觉把毛利送出去的地方。算新签客户里在结账页选年付的占比，以及相对月付等价物你实际让掉的折扣：经验带是 10-20%，再加约 1-2 个月免费等值作为引导。年付占比低于 20%，问题在默认选项而不在价格——把年付做成结账页高亮的默认选项，把省下的钱按 USD/年写出来，并且只把这一页作为四周里唯一要测的东西。如果占比健康但折扣超过 25%，你等于用两个月的让利去买十二个月的收入，这一群体的盈亏平衡续费率必须写下来。',
          alsoMoves:
            '它把按月流失的风险换成一份有约束力的合同基础，而步骤 6 的涨价节奏在给老客户重新定价时靠的正是这个——已经预付过的客户只能被重新谈判，而不是直接取消。它也改变了步骤 4 的测试能读出什么，因为年付群体对「只针对新客户」的价格测试，反应跟月付群体不一样。而真实的年付比例，正是步骤 7 的 What-If 预测能成立的前提，因为年付转化率是把一次档位调整换算成 ARPU 预测的输入之一。',
          backfire:
            '过深的年付折扣买来的是会到期的承诺。如果你让 25% 去把一个月付客户转成年付，年付群体只有在续约、或者折扣小于它所避免的流失时才算划算，而一个看起来像 2 个月免费的 25% 让利，摊上爬坡与支持成本其实是 3 个月。更隐蔽的失败是把折扣做得太显眼，以至于月付价不再可信：买家学会等下一次年付促销，于是你训练出了最好的 prospects 去排队，而不是持续流入，步骤 4 建的管道就从流动变成了排队。',
        },
        {
          priority: 4,
          metric: '分细分定价弹性 —— 每涨价 10% 会丢掉多少销量',
          fixFirst:
            '只有计费单位、阶梯和承诺条款都稳了，才去测涨价要付出多少销量，因为跑在还在动的底座上的测试是读不出来的。对新客户跑 4 周的 A/B 测试，老客户保护起来，涨价幅度 5-10%，并且不要只测一个数：转化率、ARPU、毛利都要测。之所以要分细分跑，是因为弹性不是一个公司级常数——指南里写着 SMB 涨价 10% 要丢 15-25% 销量，而大客户只丢 3-5%，所以一个混在一起的测试等于把一个很弹的细分和一个很不弹的细分平均掉，结果落在两头最差的位置上。测试之前先把放行规则写好：ARPU 和毛利要达到什么组合才把这次涨价推给这个细分，转化率跌幅超过什么数就作废。',
          alsoMoves:
            '它告诉你步骤 6 那次涨价有多少余量，也因此决定那个节奏能有多激进：弹性 3-5% 的细分大概能每 12 个月吸收一次 10% 的涨价，而弹性 15-25% 的 SMB 细分需要更小、更频繁的步子。它同时给步骤 5 的本地化矩阵封了顶，因为一个按美国标价 60-80% 定价的市场，在变成打折市场之前余量更少。而测试里的毛利那一支和转化率一样重要：涨价在销量上活下来、却把毛利打穿，那不是涨价，那是你在补贴自己的成本结构。',
          backfire:
            '把弹性测试一次性铺到全量账本上，就等于把一次价格调整变成一次流失事件——按年付的老客户会在续约时看到账单跳涨而毫无预警，而步骤 3 里那个年付群体，本来正是被你在设计里保护起来的那批。另一个失败是只看转化率：如果涨价 10% 让转化率掉 15%，但留下来的恰好是更大的客户，ARPU 上升，你于是判定测试通过，而实际每个线索的毛利已经掉了——你只是用更少、更大、更难服务的客户去支付获客成本。',
        },
        {
          priority: 5,
          metric: '老价实现率 —— 滚动 12 个月 ARR 里按低于现行价成交的比例',
          fixFirst:
            '放最后，因为它是把一套定价体系慢慢变成折扣清单的衰减。把滚动 12 个月 ARR 拆成三块：按现行价、按老价、按单独议定的价格，然后算低于现行价那部分的占比。超过 30%，说明步骤 6 的节奏没有在跑。先审 ARR 排名前 20 的账户，因为漂移都集中在那里，然后按节奏要求发 60-90 天的书面通知。超过当前合同期限的一律不再豁免，并且把通知日期记下来，好让续约对话从一张时间表开始，而不是从谁先想起来开始。',
          alsoMoves:
            '它决定步骤 7 里的 ARPU 到底有没有意义：在 40% 还挂在老价上的账本上算出来的 ARPU，不是你定价的 ARPU，而是两套定价系统的平均，而你用这个平均去建模的每个场景都会把平均继承下来。它同时决定你落地的每次涨价到底值多少——一次 10% 的涨价落在 70% 的 ARR 上，公司层面就是 7%。而且给老客户重新定价，正是第三、四行那两条折扣纪律的资金来源，因为它是唯一一个不动需求就能把价提上去的杠杆。',
          backfire:
            '在弱季给老客户重新定价，会把一次价格决定变成一次流失事件，而流失就发生在你想保住收入的那个季度，于是这个季度看起来比什么都不做还差。另一个版本是暗着来涨价——发票上多一行、把限制收紧、改续约条款——真实收入涨了，客户关系却坏了，而这份留存成本会在两到四个季度之后才浮出来，那时早就没人记得那次改价。而如果根本不重新定价，失败的样子是整本账慢慢收敛到最老的价格，于是步骤 2 设计的阶梯在实践中就不存在了。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Eight pricing decisions have to hold together, because each constrains the next. Name the value metric and prove it on a double-usage account, then build a three-tier ladder where the middle tier carries most of the mix. Annual prepay discount, checkout default, localisation matrix and raise cadence all follow.',
      items: [
        {
          step: 1,
          label: 'Value metric named and validated on a double-usage account',
          gate: 'One billing unit named and written so a customer can verify it on their own invoice, plus evidence that an account using roughly twice the product pays roughly twice the price, measured on at least 5 accounts across the trailing 3 months with the price-to-usage ratio computed per account.',
          blockIf:
            'If price does not track usage of the chosen unit then the meter is charging for something that is not customer value, and every downstream number is distorted: the tier limits in Step 2 have no meaning, the mix in Step 2 reads as a pricing outcome rather than a mix effect, and the elasticity test in Step 4 will show you a response to a price change that is really a response to a bill nobody could predict.',
        },
        {
          step: 2,
          label: 'Three-tier ladder priced and the middle tier carrying the mix',
          gate: 'Three tiers live with the middle tier at 2.5-3x Starter and Enterprise at 5-10x Pro, and the trailing 12-month distribution of paying accounts within roughly 60 percent middle, 30 percent Starter and 10 percent Enterprise, with every departure of more than 10 percentage points explained in writing.',
          blockIf:
            'If the middle tier holds under 40 percent of accounts the ladder is mispriced or under-built, and no amount of Step 4 price testing will fix it because the test will be measuring mix rather than price. If the middle tier is above 80 percent then there is no enterprise motion and the top of the ladder is decoration. Fix the packaging and the price gap before running any test, or the test result will be thrown away with the experiment.',
        },
        {
          step: 3,
          label: 'Annual discount and checkout default set inside the proven band',
          gate: 'The annual discount sits between 10 and 20 percent of the monthly equivalent, the annual plan is the default highlighted option at checkout with the saving stated in USD per year, and the trailing 12-month share of new logos taking the annual plan recorded as the baseline for the next test.',
          blockIf:
            'A discount outside the 10-20 percent band either fails to convert, which leaves you carrying monthly churn risk for nothing, or gives away more than a year of churn is worth, which means the annual cohort has to renew at a rate you have never written down. Without the baseline mix recorded you cannot tell later whether a checkout change actually moved commitment or merely moved the traffic, which is the difference between a pricing win and a traffic win.',
        },
        {
          step: 4,
          label: 'Elasticity measured per segment on conversion, ARPU and margin',
          gate: 'A 4-week A/B test on new customers only at a 5-10 percent increase with legacy contracts untouched, with conversion, ARPU and gross margin all three measured per segment, and a written ship rule stating which ARPU and margin combination releases the change to that segment.',
          blockIf:
            'Without the ship rule written before the test you will read whatever you hoped for out of the numbers, and the usual mistake is watching conversion alone: a 15 percent conversion drop on SMB gets masked by ARPU rising on the few larger buyers, while gross margin per lead has quietly fallen. Per-segment testing matters because a blended number averages a 25 percent elastic segment with a 3 percent one and reports the average of two different businesses.',
        },
        {
          step: 5,
          label: 'Localization matrix built with review dates and triggers named',
          gate: 'A written matrix with the US list price as anchor, EMEA and APAC at 60-80 percent of it and Latin America at 50-70 percent, with each region carrying a named review date inside the next 12 months and a named trigger such as a currency move beyond 5 percent or a competitor price change.',
          blockIf:
            'A matrix without a review date becomes a permanent discount that nobody re-derives, and the regions priced lowest drift furthest from value over time. The trigger matters as much as the number: without one, a currency move of 8 percent is absorbed silently by your margin, and by the time it is noticed that region has been priced below cost for two quarters.',
        },
        {
          step: 6,
          label: 'Raise cadence calendarised with notice dates ahead of renewals',
          gate: 'Legacy accounts on a 12-18 month reprice cycle and new cohorts on a 6 month cycle, every renewal carrying a notice date 60-90 days ahead of it, and the notice template stating the new price, the effective date and the notice period in writing.',
          blockIf:
            'Notice dates scheduled after renewal conversations have already started are worth nothing, and the cadence then resets every year without ever repricing anything. The 60-90 day window exists because it is the shortest notice most enterprise procurement cycles accept, so a cadence built on 30 days will stall on exactly the accounts holding the most ARR.',
        },
        {
          step: 7,
          label: 'What-if scenario run to a forward ARPU forecast before rollout',
          gate: 'At least one scenario covering a tier change, a price move and the annual conversion rate run through the What-If branches, producing a forecast ARPU and gross margin for the next 4 quarters, with legacy and current-priced revenue computed as separate blocks.',
          blockIf:
            'A forecast computed on a blended book of legacy and current prices tells you the average of two pricing systems rather than what your new pricing earns, and that error compounds with every scenario added on top. Separating the book first also exposes whether the tier change you are modelling is realistic, because the legacy block moves on its own schedule and will not follow the model you just built.',
        },
        {
          step: 8,
          label: 'Comparable benchmark refreshed within the last 12 months',
          gate: 'A re-benchmark against comparable vendors completed in the last 12 months, with at least 3 comparables on price per unit and on packaging, and the gap recorded as a named reason to hold, raise or cut the list price before the next repricing cycle.',
          blockIf:
            'Benchmarking without a date becomes a ritual rather than an input: the comparable set changes every quarter, and a price set against a snapshot two years old is either obviously out of market or accidentally still right. Recording the gap as a specific decision also stops the benchmark from producing a number that sits in a slide without ever changing a price on the site.',
        },
      ],
    },
    zh: {
      intro:
        '八个定价决定要互相咬得住，因为每一个都限制着下一个。先给价值指标定名，并在用量翻倍的账户上验证过；再搭三档阶梯，让中间档承住大部分业务量。年付折扣、结账默认项、本地化矩阵与涨价节奏都从这个结构里长出来。弹性按细分分别测，每个 What-If 场景最终都要落到前瞻 ARPU 预测，而不是对新价格的感觉。涨价节奏要进日历：新客户每 6 个月一轮，老客户每 12-18 个月一轮，书面通知排在续约日之前。可比公司基准一年内要重新刷一次，否则比较的是去年的市场。',
      items: [
        {
          step: 1,
          label: '价值指标定名，并在双倍用量账户上验证过一遍',
          gate: '点名 1 个计费单位，写成客户能在自己发票上核对的形式；另有证据表明用量约为别人两倍的账户，付的钱也约为两倍，样本至少 5 个账户、覆盖滚动 3 个月，逐账户算出价格与用量的比值。',
          blockIf:
            '价格若不跟着所选单位的用量走，这个单位收的就不是客户的价值，后面每一个数都被扭曲：步骤 2 的档位限制失去意义，步骤 2 的产品结构读出来像是定价结果而其实是结构效应，而步骤 4 的弹性测试给你看到的会是对「涨价」的反应，其实是对一份谁也预测不了的账单的反应。',
        },
        {
          step: 2,
          label: '三档阶梯已定价，且中间档真的在承住业务量',
          gate: '三档已上线，专业档为入门档的 2.5-3x、企业档为专业档的 5-10x；滚动 12 个月付费账户分布落在约 60% 中间档、30% 入门档、10% 企业档，任何偏离超过 10 个百分点的部分都写下了原因。',
          blockIf:
            '中间档不到 40% 的账户，说明阶梯是定价错了或功能没做够，而这时步骤 4 的价格测试再怎么做都修不好，因为测到的是结构不是价格；中间档超过 80% 则说明你没有企业侧的动作，阶梯顶端只是装饰。先把包装和价差修好再开测，否则测试结果会跟着实验一起被丢掉。',
        },
        {
          step: 3,
          label: '年付折扣与结账默认项都落在已验证经验带内',
          gate: '年付折扣落在月付等价的 10-20% 之间，年付是结账页高亮的默认选项并按 USD/年 写明省下多少；滚动 12 个月新签里选择年付的占比被记下来，作为下一次测试的对照基线。',
          blockIf:
            '折扣跑出 10-20% 这条带，要么转化不动——于是你白白替客户扛了按月的流失风险；要么让得比一年流失还多——那么这个年付群体就得续约到一个你从没写下来的比率上。而基线占比不记下来，之后你根本分不清改结账页到底是提升了承诺，还是只是提升了流量。',
        },
        {
          step: 4,
          label: '按细分测弹性，同时测转化率、ARPU 与毛利',
          gate: '对新客户跑 4 周 A/B 测试、涨价 5-10%、老客户合同不动，转化率、ARPU、毛利三项在每个细分上都测到；并写下放行规则，指明 ARPU 与毛利达到什么组合才把这个细分放开。',
          blockIf:
            '测试前不写放行规则，你就会从数字里读出自己想听的，而最常见的错误是只盯转化率：SMB 转化率掉 15% 会被 ARPU 上升掩盖，因为留下来的是少数大客户，而每个线索的毛利其实已经掉了。分细分测之所以重要，是因为混在一起的数字等于把 25% 弹性的细分和 3% 弹性的细分平均，然后拿两个生意的平均当结论。',
        },
        {
          step: 5,
          label: '本地化矩阵建成，复审日期与触发条件都点名',
          gate: '一份写下来的矩阵，以美国标价为锚，EMEA 与 APAC 取其 60-80%、拉美取 50-70%；每个区域都有未来 12 个月内的明确复审日期，以及一个明确触发条件，例如汇率波动超过 5% 或竞品调价。',
          blockIf:
            '没有复审日期的矩阵会变成一个没人重新推导过的永久折扣，而定价最低的那些区域恰恰会随时间离价值越来越远。触发条件和数字一样重要：没有它，8% 的汇率变动会被毛利悄悄吃掉，等你发现时，那个区域已经按低于成本的价格跑了两个季度。',
        },
        {
          step: 6,
          label: '涨价节奏进日历，通知日期排在续约日期之前',
          gate: '老客户按 12-18 个月一个重定价周期，新群体按 6 个月一个；每次续约都提前 60-90 天排上通知日期；通知模板写明新价格、生效日期与通知期。',
          blockIf:
            '通知日期排在续约对话已经开始之后，等于没有通知，于是这个节奏每年重置一次却从来没有真的重定价过。60-90 天这个窗口是有原因的——它通常是多数企业采购流程能接受的最短通知期，所以按 30 天建的节奏，恰恰会卡在持有最多 ARR 的那批账户上。',
        },
        {
          step: 7,
          label: 'What-If 场景在上线前跑成前瞻 ARPU 预测',
          gate: '至少一个场景同时覆盖档位调整、价格变动与年付转化率，走 What-If 分支产出未来 4 个季度的 ARPU 与毛利预测；且老价收入与现行价收入分成两块单独计算。',
          blockIf:
            '在一本老价与现行价混在一起的账本上算出的预测，告诉你的不是新定价能赚多少，而是两套定价系统的平均，而你在这个平均上再叠每一个场景，误差都会继续放大。先把账本拆开，也顺便检验你建模的那次档位调整现不现实——老价那部分按自己的时间表走，不会跟着你刚建的模型动。',
        },
        {
          step: 8,
          label: '可比公司基准在过去 12 个月内重新刷新过一遍',
          gate: '过去 12 个月内完成一次与可比公司的重新对标，至少 3 家可比公司在单位价格与包装两个维度上有对比；并把差距写成一条明确理由——在下一次重定价周期之前保持、涨价还是降价。',
          blockIf:
            '没有日期的对标会变成仪式而不是输入：可比公司集合每个季度都在变，而拿两年前的快照定的价，不是明显脱离市场就是碰巧还准。把差距写成一条明确决定，也能防止对标变成一个只躺在幻灯片里、从来没有改过官网任何一个价的结果。',
        },
      ],
    },
  },
};
