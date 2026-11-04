// P166 —— M 类（Marketing Analytics）主题「roas-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 5 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时先修哪个 → 它顺带带动谁 → 什么条件下它反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是自己的投放效率 ⇒ 不写市场单价）：
//   · 毛/净口径写清：毛 ROAS = 归因营收 ÷ 广告支出；净 ROAS =（归因营收 − COGS − 履约）÷ 广告支出
//   · 归因窗口写清天数与平台默认值（Meta 7 天点击 + 1 天浏览；Google 搜索 30 天点击）
//   · 一切期间写明：近 30 天 / 近 7 天 / 某个队列
//   · 金额一律 USD，并标明是 list 还是 net
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A window decides what a conversion is, and comparing two channels on two different windows produces a ROAS that is arithmetically correct and commercially meaningless. Meta counts a 7-day click plus a 1-day view by default and Google search counts a 30-day click, so a normalised comparison has to start there or every ratio you compute is a generous clock against a strict one. Then gross against net: gross ROAS counts all attributed revenue, and for DTC where COGS and fulfilment are real costs the gap between gross and net is often most of the apparent profit, so a target set on gross cannot be netted later without rewriting it. The sustainable line for DTC sits above 2.0x net, and the bands differ sharply by model: 2.0-3.0x net for DTC, 1.0-1.5x for B2B SaaS where a deal closes on a cycle rather than a click, and 3.0-5.0x for lead generation. Marginal ROAS is the number that decides whether to scale, and it is the one that degrades, because blended averages flatter a channel you are pushing into less responsive segments, so the test is incremental return on the next unit of spend. Creative fatigue comes last because it announces itself first: above roughly 3-5 impressions per user per week, ROAS falls off, and refreshing every 14-21 days is cheaper than any bid change.',
      rows: [
        {
          priority: 1,
          metric: 'Attribution window parity — the gap in days between each platform-reported conversion window and your one normalized window',
          fixFirst:
            'Window parity comes first because every ratio in this table is computed from attributed revenue, and the platforms do not count the same conversions. Meta reports a 7-day click plus 1-day view window, Google search reports 30 days of clicks, and comparing those two numbers raw means the channel with the widest window looks like the most efficient one, purely because it keeps credit longer. This is also the cheapest row on the table to fix, because it changes reporting and not spending: no budget, no creative, no audience is touched, so it cannot cost you revenue while you work out the truth. Set one window (7-day click is the practical default for most teams), apply it identically in every platform report, and keep the platform-default figure beside it so you can see exactly how much credit each channel was carrying before you touched it.',
          alsoMoves:
            'Aligned windows turn the blended number from Step 1 into a weighted average you can actually decompose, which is what makes the per-channel targets in Step 3 assignable rather than arbitrary. They also change what the pause rule in Step 5 means: a threshold set on mixed windows fires on the wrong campaigns, and a brand-search campaign counted on a 30-day window will keep looking healthy for weeks after it has stopped paying for itself. Once the windows match, the marginal test in Step 4 and the guardrail in Step 5 read the same signal instead of two different ones.',
          backfire:
            'Window parity backfires in two ways. Normalizing only one side inverts the bias instead of removing it: switching Meta to a 7-day click window while Google stays at 30 days makes paid social look worse than it is and brand search look better, and you will move budget on a gap you manufactured. The second failure is fixing the window but not the conversion event: if a platform counts a 30 USD add-on as a purchase while your analytics tool records only a 90 USD first order, you have two different denominators wearing one label, and the ratio stays meaningless however tight the window is. Change the window and the conversion event together, then re-pull Step 1 before you act on anything.',
        },
        {
          priority: 2,
          metric: 'Net ROAS by channel — (attributed revenue minus COGS and fulfillment) divided by ad spend, same window on both sides',
          fixFirst:
            'The net number comes second because the number most dashboards show you is gross, and gross systematically flatters any channel that sells a low-margin item. A channel at 4.0x gross can be 1.4x net, and if you read gross, that channel reads as your best performer while it is quietly the one destroying margin. The repair is arithmetic, not budget: for each channel subtract order-level COGS and fulfillment from attributed revenue over the same 30 days and divide by the same spend figure you used in Step 1. Do it before you set targets, because the band you are about to write down in Step 3 is a net band, and a target applied to a gross number is the kind of goal that lets a team cut the profitable half of the portfolio.',
          alsoMoves:
            'Net ROAS is the caliber that makes the Step 3 targets bind, because the break-even net ROAS comes straight out of your gross margin, so the target and the business model finally describe the same thing. It also decides whether the Step 4 scenarios are worth modeling: a scenario that lifts gross ROAS by expanding a low-margin bundle audience can look like a win on the gross number and lose money after fulfillment. And it changes the pause threshold in Step 5, because the number that matters on 3 consecutive declining days is the one that includes the cost of the goods you sold.',
          backfire:
            'Moving the headline metric from gross to net changes what the team optimizes every week, and the predictable reaction is to cut whatever looks worst on the new number, which is often right but sometimes means cutting the only channel feeding the rest of the funnel. Two specific traps sit underneath: computing COGS from a company-wide category average makes a channel that sells bundles and a channel that sells single units carry the same deduction, so the net ranking becomes an artifact of your cost allocation rather than a fact about the channel; and treating net ROAS as a ratio to maximize invites the classic shrink, where you cut spend and revenue together, the ratio rises, and the business gets smaller with a healthier-looking dashboard.',
        },
        {
          priority: 3,
          metric: 'Creative frequency — impressions per reached user per week, measured per campaign',
          fixFirst:
            'Creative fatigue comes third because frequency is the only metric in this table that predicts a ROAS collapse before it appears in the weekly number, and because the fix is cheap while it is still cheap. Measure impressions per user per week for each campaign: the ceiling sits around 3-5 impressions per user per week, above which efficiency falls off a cliff rather than sliding gently. Refresh when you approach that ceiling, on a 14-21 day cycle, and do it by introducing new angles rather than resizing the same asset. Do this before the Step 4 scenario work, because a fatigued creative makes every scenario look bad, so the model keeps recommending audience expansion and bid changes when the actual fix was a new piece of creative.',
          alsoMoves:
            'New creative resets the frequency counter, which restores the marginal return of the same spend and therefore changes the marginal ROAS that Step 4 measures: a channel that looked saturated in week 6 often returns a healthy marginal return in week 8 with fresh assets, and the budget you were about to pull becomes unnecessary. It also changes the pause rule in Step 5, because a fatigued campaign crosses a net ROAS threshold for reasons that have nothing to do with your bidding, and a rule that cannot tell those two apart will shut down campaigns that would have recovered on their own.',
          backfire:
            'Fixing fatigue backfires in a specific way: rotating assets before the frequency ceiling is reached trades a measurable loss for a hypothesis you cannot test, and every rotation resets the learning period the platform needs, so a campaign that was working at 1.8x can sit at 1.2x for three weeks while the new asset learns. The second trap is refreshing on a schedule without changing the angle, because two versions of the same concept saturate together: the frequency number looks reset and the drop returns on schedule. And if you refresh creative while your Step 2 net number is still wrong, you are refreshing against a target that does not describe your margin.',
        },
        {
          priority: 4,
          metric: 'Marginal ROAS — incremental revenue divided by incremental spend from a controlled 20 percent budget step over 7 days',
          fixFirst:
            'Marginal ROAS goes last, but do not skip it, because blended ROAS is an average and every average hides the answer you actually need: what the next unit of spend returns. Hold everything else fixed, step one campaign budget up by 20 percent for 7 days, and measure the incremental revenue against the incremental spend rather than the blended totals. Do it after the window, the net caliber and the creative state are settled, because a marginal test run on an unstable measurement returns a number you will believe for a year. Do it on the channel you plan to scale, not on your worst one, since a marginal result on a channel you intend to cut tells you nothing about scaling.',
          alsoMoves:
            'Marginal ROAS sets the ceiling on the Step 5 guardrail, because the pause threshold for a campaign you are scaling has to sit below the marginal return you measured, or the rule will kill the very campaigns that are working. It also re-prices the Step 3 targets: once you know that the marginal return at a 2.5x net level is materially worse than the blended 3.1x, the target you write becomes a planning number rather than a promise, and the Step 4 scenarios are judged against the marginal figure instead of the average one.',
          backfire:
            'Marginal tests backfire in two ways. Stepping budget up measures saturation, so a channel near its ceiling will look marginal while a channel with genuine headroom looks weak during the ramp before the platform has learned the new bids, which is exactly the week you would otherwise have been scaling. The reverse test is easy to misread: cutting spend by 20 percent and finding revenue fell by 30 percent means the channel was working, not that it was marginal, so treat a revenue drop larger than the spend drop as evidence of headroom rather than waste. Finally, a marginal test run inside a seasonal peak measures demand rather than the channel, so do not scale on a number taken during a promotion.',
        },
      ],
    },
    zh: {
      intro:
        '归因窗口决定什么算一次转化，而拿两个窗口去比两个渠道，会得到一个算术正确、商业上毫无意义的 ROAS。Meta 默认是 7 天点击加 1 天浏览，Google 搜索是 30 天点击，所以任何横向比较都得先归一化窗口，否则你算出的每个比率都是宽钟对严钟。接着是毛口径和净口径：毛 ROAS 计入全部归因营收，而在 COGS 和履约都是真成本的 DTC 里，毛净之间的差额常常就是看起来的利润的大部分，所以建在毛口径上的目标事后没法补成净口径，只能重写。DTC 可持续的那条线在净 2.0x 以上，各渠道差异也很大：DTC 净 2.0-3.0x，B2B SaaS 净 1.0-1.5x（成交按周期而不是按点击），线索型 3.0-5.0x。边际 ROAS 是决定要不要加码的那一个数，也是唯一会退化的那个：混合平均值会美化一个正被推进到响应更差人群的渠道，所以要测的是下一笔钱的增量回报。素材疲劳放最后，因为它最先开口 —— 每用户每周曝光超过大约 3-5 次，ROAS 就往下掉，而 14 到 21 天换一次素材比改出价便宜。',
      rows: [
        {
          priority: 1,
          metric: '归因窗口一致性 —— 各平台自带转化窗口与你统一后的那一个窗口之间的天数差',
          fixFirst:
            '把窗口一致性排在最前面，因为这张表里每一个比率都以归因营收为分子，而各平台对「什么算转化」的口径本来就不同：Meta 报的是 7 天点击加 1 天浏览，Google 搜索按 30 天点击计。直接拿这两个数比，宽窗口的渠道永远显得更强，只因为它把功劳留得更久。这也是这张表上最便宜的改动，因为它动的是报表而不是投放——预算、素材、人群一概不碰，所以在弄清真相之前它不会让你损失一分钱。做法是定死一个窗口（多数团队用 7 天点击就够），在每个平台的报表里改成同一口径，同时把平台默认值并排记下来，这样你能看清每个渠道原本背了多少功劳。',
          alsoMoves:
            '窗口对齐之后，步骤 1 的综合数字才变成一个你能拆开的加权平均，步骤 3 的分渠道目标才算「可指派」而不是拍脑袋。它同时改变了步骤 5 暂停规则的含义：阈值建立在混合窗口上，触发的一定是错误的广告；而一个按 30 天窗口计的品牌词广告，在它已经不再自付成本之后，还会继续看起来健康好几周。窗口一致之后，步骤 4 的边际测试与步骤 5 的护栏读的是同一个信号，而不是两个互相打架的信号。',
          backfire:
            '窗口一致性有两种翻车方式。只改一边不是消除偏差，而是把偏差翻转：把 Meta 改成 7 天点击而 Google 仍是 30 天，付费社交被低估、品牌搜索被高估，你会照着一个自己制造出来的缺口去调预算。第二种翻车是只改窗口不改转化事件：如果平台把一笔 30 USD 的加购算作 purchase，而你的分析工具只记 90 USD 的首单，你就有两个分母共用一个标签，窗口收得再紧，比率依然没有意义。窗口和转化事件必须一起改，改完重新拉一遍步骤 1，再决定动作。',
        },
        {
          priority: 2,
          metric: '分渠道净 ROAS ——（归因营收减去 COGS 与履约）除以广告支出，两边取同一窗口',
          fixFirst:
            '第二个要修的是净 ROAS，因为多数仪表盘给你看的是毛 ROAS，而毛口径会系统性地偏爱那些卖低毛利商品的渠道。一个毛 4.0x 的渠道净口径可能只有 1.4x；你盯着毛口径看，这个渠道就是你的最佳表现，实际上它正在悄悄吃掉毛利。修法是算术而不是砍预算：逐渠道用近 30 天归因营收减去订单级 COGS 与履约费用，再除以步骤 1 里同一笔广告支出。必须在写目标之前做，因为步骤 3 那条带是净带，把净目标套在毛数字上，等于给团队一个可以把组合里赚钱的那一半砍掉的指标。',
          alsoMoves:
            '净 ROAS 是让步骤 3 的目标真正咬得住的口径：盈亏平衡的净 ROAS 直接由你的毛利率决定，于是目标和业务模型终于说的是同一件事。它也决定步骤 4 的场景值不值得建模——一个靠扩低毛利组合装人群、把毛 ROAS 抬上去的场景，在扣掉履约之后可能是亏钱的。它还改变步骤 5 的暂停阈值，因为连续 3 天下滑时真正该看的，是那个把货品成本算进去的数。',
          backfire:
            '把主指标从毛换成净，会改变团队每周优化的对象，而可以预料的反应就是砍掉在新口径下最差的渠道——这通常是对的，但有时砍掉的恰恰是给漏斗其他环节供养的唯一渠道。两个更隐蔽的坑：COGS 用公司层面的品类平均值来摊，会让卖组合装的渠道和卖单品的渠道承担同一笔扣除，净排名就变成你分摊方式的产物，而不是渠道的性质；把净 ROAS 当成一个要最大化的比率，则会招来经典的收缩——支出和营收一起砍，比率上去了，业务却变小，仪表盘反而更健康。',
        },
        {
          priority: 3,
          metric: '创意频次 —— 每个活动里「单用户单周曝光次数」',
          fixFirst:
            '接着才轮到素材疲劳，因为这张表里只有频次能在 ROAS 崩掉之前就预警，而修它便宜的时候恰恰是它还便宜的时候。逐个活动量一量单用户单周曝光次数：天花板大约在 3-5 次，超过之后效率是断崖式下滑，而不是缓慢地滑下去。接近天花板就更新素材，周期 14-21 天，而且要换角度，而不是把同一张图改个尺寸。必须在步骤 4 建模之前做，因为素材疲劳会让每个场景看起来都很糟，于是模型一直建议你扩人群、换出价，而真正该修的只是一条新素材。',
          alsoMoves:
            '新素材会重置频次计数器，把同一笔支出的边际回报拉回来，于是步骤 4 量到的边际 ROAS 也会跟着变：一个第 6 周看起来已经饱和的渠道，换了素材之后到第 8 周可能恢复出健康的边际回报，你本来打算砍掉的预算就不必砍了。它还改变步骤 5 的暂停规则——疲劳的广告会越过净 ROAS 阈值，而原因跟出价毫无关系；一条分不清这两者的规则，会关掉本来能自己缓过来的广告。',
          backfire:
            '修疲劳有两种翻车。在还没到天花板时就轮换素材，是拿一个确定的损失去换一个你无法验证的假设，而每换一次就重置了平台需要的学习期，所以一条本来跑在 1.8x 的广告可能在换素材后三周都卡在 1.2x。第二个坑是照着日程换素材却不换角度：同一个概念的两个版本会一起饱和，频次数字看着被重置了，掉量却按原时间表回来。而且如果你步骤 2 的净口径还是错的，你就是在对着一个不描述毛利的目标换素材。',
        },
        {
          priority: 4,
          metric: '边际 ROAS —— 受控把预算加 20%、跑 7 天后的增量营收除以增量支出',
          fixFirst:
            '最后是边际 ROAS，但不要跳过它，因为综合 ROAS 是平均数，而每一个平均数都把真正的答案藏起来：下一笔钱能带回多少。固定其他一切，只对一个活动把预算加 20%、跑 7 天，用增量营收对增量支出，而不是用综合数相除。必须在窗口、净口径、素材状态都定下来之后再做，因为跑在不稳定测量上的边际测试会给你一个你会信一年的数。要在你打算扩量的那个渠道上做，而不是最差的那个——一个你准备砍掉的渠道的边际结果，对扩量决策没有任何信息量。',
          alsoMoves:
            '边际 ROAS 决定步骤 5 护栏的上限：一个正在被扩量的活动，它的暂停阈值必须低于你量到的边际回报，否则这条规则会亲手杀掉那些正在起效的广告。它也给步骤 3 的目标重新定价——一旦你知道在净口径 2.5x 处的边际回报明显差于 3.1x 的综合数，你写下的目标就从一句承诺变成一个规划数字，步骤 4 的场景也就该按边际数而不是平均数来评判。',
          backfire:
            '边际测试有两种翻车。加预算是在测饱和度，所以逼近天花板的渠道会显出边际差，而真有空间的渠道在新出价还没学完的那一周反而显弱——那恰好是你本来要扩量的那一周。反向测试也容易读错：把预算砍 20%、发现营收掉了 30%，说明这个渠道在干活而不是边际差，所以营收跌幅大于支出跌幅应视为「还有空间」的证据，而不是浪费。另一个坑是边际测试撞上季节性高峰，它量到的是需求而不是渠道，所以别拿促销期测出来的数去扩量。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Every platform counts conversions differently, so the first line is not a ratio at all, it is a written statement of which window each channel in your mix uses, because a target set on an unnormalised number is a target you will later discover was measuring a different channel. The second line is net ROAS on the same spend, after order-level COGS and fulfilment, since gross revenue cannot be converted into a margin decision after the fact. The third is a per-channel target drawn from your own unit economics, weighted by channel mix rather than averaged across it, because a 50/50 Meta and Google portfolio in early DTC lands around 3.5-5.0x gross and tells you nothing about either side. The fourth is the creative check, frequency per user against a 3-5 impression ceiling and a refresh inside 14-21 days, because fatigue is the failure mode that shows up in the weekly number after it has already cost you. The fifth is the marginal test, which is the only line that requires spending money to observe, and the sixth is the pause rule, which has to be calibrated on three consecutive days below threshold on net numbers from one window, or it will cut off the campaign that was only being flattered by a wide attribution setting.',
      items: [
        {
          step: 1,
          label: 'A blended ROAS baseline pulled over one fixed 30-day window from every ad account',
          gate: 'At least 2 full weeks of spend and revenue present for every channel with spend in the last 30 days, all attributed revenue and all spend taken from the same window, and the resulting blended gross ROAS written down as one number with its window labelled next to it.',
          blockIf:
            'If any channel is missing part of the window, the blended ratio mixes a 14-day numerator with a 30-day denominator and every number derived from it inherits the mismatch. Targets, scenarios and pause thresholds would all sit on a baseline that is not internally consistent, and the repair is to re-pull the data, not to argue about the result.',
        },
        {
          step: 2,
          label: 'Net ROAS computed per channel from order-level COGS and fulfillment',
          gate: 'For each channel, (attributed revenue minus order-level COGS minus fulfillment) divided by ad spend over the same 30 days, with COGS taken from the order record rather than a category average, and a net figure available for at least 90 percent of spend.',
          blockIf:
            'If COGS is still a blended company average, a channel selling bundles and a channel selling single units carry the same deduction and the net ranking becomes an artifact of how you allocated cost rather than a fact about the channel. A per-channel target written on that number then sends budget to whichever channel happened to receive the cheapest allocation.',
        },
        {
          step: 3,
          label: 'A written net ROAS target per channel, inside the band for your business model',
          gate: 'Every channel with more than 500 USD of spend in the month has a target inside the guide band for your model (DTC 2.0-3.0x net, B2B SaaS 1.0-1.5x net, lead gen 3.0-5.0x net), and your own break-even net ROAS computed from gross margin is at least 1.0x.',
          blockIf:
            'When the break-even figure sits above the band you copied, the target is unreachable by construction and the pause rules in step 5 will fire on every campaign in that channel. When no target exists at all, the only rule anyone applies is the ad platform default, which is written to protect the platform rather than your margin.',
        },
        {
          step: 4,
          label: 'At least two scenarios modeled, with spend and net revenue recomputed rather than assumed',
          gate: 'At least 2 scenarios modeled (audience expansion, creative refresh, bid strategy change), each stating the spend change, the projected net revenue change and the resulting net ROAS recomputed after that spend change rather than carried over from the baseline.',
          blockIf:
            'A scenario that reports only the revenue gain is a projection without a cost, and it will always favour the biggest audience expansion. If the recomputed net ROAS after the spend change is missing, you have no way to tell a revenue win from a margin loss, which is the one question step 4 exists to answer.',
        },
        {
          step: 5,
          label: 'Automatic pause rules with a channel-specific threshold and a review trail',
          gate: 'A rule per channel with a threshold tied to that channel step 3 target, a 3-consecutive-day confirmation window, and a weekly log of which campaigns were paused together with their net ROAS in the 7 days after each pause.',
          blockIf:
            'Without the 3-day confirmation the rule fires on a single noisy day inside a volatile week. Without the exception log you cannot tell a rule that saved money from a rule that killed working campaigns, and the second case usually ends with the whole rule quietly switched off and nobody left to reinstate it.',
        },
      ],
    },
    zh: {
      intro:
        '每个平台数转化的方式都不一样，所以第一行根本不是一个比率，而是一句写下来的话：你这个渠道组合里每个渠道用的是哪个归因窗口 —— 建在没归一化的数上的目标，是你后来才发现它量的是另一个渠道。第二行是同一个支出下的净 ROAS，扣掉订单级 COGS 与履约，因为毛营收没法事后折算成毛利决策。第三行是按你自己单位经济学给的单渠道目标，并且按渠道组合加权，而不是把几个渠道平均掉 —— 早期 DTC 一个 Meta 与 Google 各半的组合毛 ROAS 大约落在 3.5-5.0x，这个数对两边都没说明力。第四行是素材检查：每用户曝光频次对着 3-5 次的上限看，14 到 21 天内换新素材，因为疲劳是那种周报数字出来之前就已经先花了钱的坏法。第五行是边际测试，它是唯一要真花钱才能观测的一行；第六行是暂停规则 —— 它必须用同一个窗口里的净数、连续三天低于阈值才触发，否则被砍掉的会是那个只是被宽归因窗口抬起来的广告。',
      items: [
        {
          step: 1,
          label: '从每个广告平台按同一 30 天窗口拉出的综合 ROAS 基线',
          gate: '近 30 天内有支出的每个渠道都至少有连续 2 周的支出与营收数据，归因营收与广告支出取自同一个窗口，算出来的综合毛 ROAS 以单一数字写下来，旁边标注窗口。',
          blockIf:
            '只要有一个渠道缺了窗口里的一段时间，综合比率就会把 14 天的分子和 30 天的分母混在一起，之后所有派生数字都会继承这个错位——目标、场景、暂停阈值全部建在一个内部不自洽的基线上，而修法是重新拉数据，不是争论结果。',
        },
        {
          step: 2,
          label: '按订单级 COGS 与履约算出的分渠道净 ROAS',
          gate: '每个渠道都在同一个 30 天窗口上算（归因营收减去订单级 COGS 再减去履约）除以广告支出，COGS 取自订单记录而不是品类平均值，并且至少 90% 的支出都有对应的净口径数字。',
          blockIf:
            '如果 COGS 还是公司层面的平均值，卖组合装的渠道和卖单品的渠道就承担同一笔扣除，净排名就成了你分摊方式的产物，而不是渠道的事实——而建在这上面的分渠道目标，会把钱送进恰好分到最便宜成本的那个渠道。',
        },
        {
          step: 3,
          label: '写下来的、落在你业务模型带内的分渠道净 ROAS 目标',
          gate: '当月支出超过 500 USD 的每个渠道都有目标，且落在指南给出的对应带内（DTC 净 2.0-3.0x、B2B SaaS 净 1.0-1.5x、潜客获取净 3.0-5.0x），同时你用自己的毛利率算出的盈亏平衡净 ROAS 不低于 1.0x。',
          blockIf:
            '如果盈亏平衡值高于你抄来的那条带，这个目标从设计上就是够不着的，步骤 5 的暂停规则会对该渠道的每一个广告都开火；如果压根没写目标，团队实际执行的只有广告平台的默认规则，而那套规则保护的是平台，不是你的毛利。',
        },
        {
          step: 4,
          label: '至少两个场景，且支出与净营收是重算出来的而不是沿用的',
          gate: '建了 2 个或更多场景（受众扩展、素材更新、出价策略切换），每个都写明支出变化、预计净营收变化，以及在该支出变化之后重算出来的净 ROAS，而不是沿用基线上的那个数。',
          blockIf:
            '只报营收收益的场景是没有成本的项目，它总会偏向最大的受众扩展。如果重算后的净 ROAS 缺失，你就没有办法区分一次营收胜利和一次毛利亏损——而这恰恰是步骤 4 存在的理由。',
        },
        {
          step: 5,
          label: '按渠道各自设定阈值、带连续 3 天确认与每周复核记录的自动暂停规则',
          gate: '每个渠道一条规则，阈值挂在该渠道步骤 3 的目标上，带连续 3 天的确认窗口，并且每周留一份日志，记录暂停了哪些广告、以及每次暂停后 7 天它们的净 ROAS。',
          blockIf:
            '没有连续 3 天确认，规则会在波动周里的一个坏日子就开火；没有例外日志，你分不清这条规则是省了钱还是杀掉了本来在赚钱的广告，而后一种情况通常以整条规则被悄悄关掉、并且再没人把它打开收场。',
        },
      ],
    },
  },
};
