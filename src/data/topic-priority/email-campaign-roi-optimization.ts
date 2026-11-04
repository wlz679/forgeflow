// P166 —— M 类（Marketing Analytics）主题「email-campaign-roi-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时先修哪个 → 它顺带带动谁 → 什么条件下它反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是自有渠道的单位经济学 ⇒ 不写市场单价）：
//   · 邮件 ROI 一律写清口径：邮件归因营收 ÷ 邮件总成本（含工具、创意、人力），或每位收件人营收
//   · 送达类指标写清分母：收件箱到达率的分母是实际投递数，不是发送数
//   · 列表与流的所有占比写明是「占发送量」还是「占营收」
//   · 打开率不可作为决策依据（Apple 邮件隐私保护自 2021 年起虚抬 5-15 个百分点）⇒ 一律以 CTR 与每位收件人营收为准
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Opens are the least trustworthy number in email marketing, and since 2021 Apple mail privacy protection has added 5 to 15 points of fiction to it, so a dashboard where opens climb while revenue per recipient slides describes a list that no longer wants your mail rather than a subject line that improved. Four failures travel together in one direction: where the messages land, how fast the list leaks, how finely you segment, and how much revenue comes from flows instead of broadcasts. Placement breaks first and hides, because every downstream rate is computed only on the messages that reached an inbox, and with 15 percent of sends in spam each number you report is computed on 85 percent of the audience while the denominator still says 100. Decay breaks second and is pure arithmetic, since a list losing 12 percent a month needs a permanently higher acquisition rate to hold its size and no creative work repairs that. Segmentation breaks third and is the only lever that adds revenue without adding sends: broadcast click rates of 1-2 percent become 3-5 percent once you segment and 5-10 percent once you trigger on behavior rather than demographics. Flow revenue breaks last, because it is the only income in the channel that survives you stopping. Revenue per recipient is measured on delivered messages, placement on actual sends, and every revenue share is labelled as a share of revenue rather than of sends.',
      rows: [
        {
          priority: 1,
          metric: 'Inbox placement rate — delivered-to-inbox messages divided by messages actually sent, over 30 days',
          fixFirst:
            'Placement comes first, because it is the only metric on this table that changes the size of every other metric. Open rate, click rate and revenue per recipient are all computed on the subset that reached an inbox, so if 15 percent of your messages land in spam, every rate you report is computed on 85 percent of your audience while your denominator still assumes all of it. Fix it before you touch content, because a subject line tested on a corrupted sample will pick the wrong winner and you will bake that mistake into every send afterwards. The work is authentication and reputation: confirm SPF, DKIM and DMARC, check Google Postmaster and Microsoft SNDS, and run a seed test before you change anything else.',
          alsoMoves:
            'Placement is the precondition for reading Step 1 hygiene numbers and for Step 4 test results at all, because both are computed over a delivered audience. It also protects the quarterly re-benchmark in Step 6: if a flow crosses a 0.5 percent click rate because it was throttled rather than because it stopped working, sunsetting it removes a revenue source that would have recovered the moment authentication was fixed.',
          backfire:
            'Placement backfires when the fix itself moves too much mail. Sunset campaigns sent to people who never asked for one raise complaint rates, and a complaint rate above 0.1 percent is exactly the threshold that triggers throttling from major providers, so a list-cleaning project can cost you placement while it is meant to restore it. The second trap is measuring engagement on opens when Apple mail privacy protection inflates opens by 5 to 15 points: subscribers who never engaged get topped up to the appearance of an engaged cohort, and a 180-day no-open rule then sunsets people who buy on a nine-month cycle.',
        },
        {
          priority: 2,
          metric: 'Net list decay — subscribers lost per month divided by average list size, over 3 months',
          fixFirst:
            'Decay comes second, because it sets the size of the audience every later metric is measured on, and because decay above 7 percent a month turns list growth into an acquisition treadmill: you are buying people to refill a container with a hole in it, and the cost of every email you send goes up with the replacement rate. Compute net loss per month over 3 months, separating unsubscribes from hard bounces and from spam complaints, because each one has a different fix. The repair is the Step 1 hygiene work: a 90-day re-engagement flow before any permanent sunset, suppression of hard bounces and complainers, and a review of what content is producing the churn.',
          alsoMoves:
            'Decay tells you whether the flows in Step 3 are worth building at volume, because a flow needs a reachable audience to run on and a list bleeding 12 percent a month delivers a smaller triggered cohort every month even as total sends hold steady. It also sets the ceiling on Step 4: testing subject lines on a list that shrank by a quarter during the test period means your lift is measured on two different audiences, and a 20 percent open lift can be produced purely by the audience getting more responsive.',
          backfire:
            'Aggressive sunsetting backfires in a way that looks like success: removing inactive subscribers raises open rate and click rate, because the dead weight is gone, and the per-recipient revenue looks better than it did, while the total email revenue falls. If you judge the hygiene work on engagement rates alone you will conclude the cleanup was a win and stop, and the list keeps shrinking underneath the improving rates. The second trap is a re-engagement flow that is too aggressive, since repeated mail to an unengaged audience is the fastest route to the complaint rate that ruins placement.',
        },
        {
          priority: 3,
          metric: 'Segmentation depth — email-attributed revenue from segmented and triggered sends divided by total email-attributed revenue',
          fixFirst:
            'Segmentation comes third, because it is the only lever in this table that adds revenue without adding sends, and because the gap is large enough to dominate everything else: broadcast click rates run 1-2 percent, segmented sends 3-5 percent, and behavioral, name-level, time-of-day sends 5-10 percent, so each tier is 2 to 3 times the one below it. The repair is to replace your most frequent broadcast with sends that depend on something you know about the recipient, and to define the trigger from a real event rather than from a demographic bucket. Do it after hygiene and placement, because segmentation works by delivering a relevant message to a smaller group, and it only pays when the message is actually delivered and the person is actually in that state.',
          alsoMoves:
            'Segmentation is what makes the Step 3 flow portfolio pay for itself, because most of the tier gain you can reach comes from triggering on behavior rather than on broadcast volume. It also changes the weekly subject-line test in Step 4: a test on a broadcast audience optimizes the weakest tier, while the same test inside a segmented tier starts from a different baseline and therefore a different winner.',
          backfire:
            'Segmenting on attributes that correlate with purchase timing, without triggering on the timing itself, produces the worst of both: people receive an offer for something they do not need yet, the frequency cap is effectively breached, and complaint rates rise, which costs you placement on the row above. A second trap is naming a segment rather than defining it, so that a broadcast to a hand-picked list counts as segmentation in your report while delivering exactly the lift of a broadcast. Require each segment to name the event that puts someone in it and the event that takes them out.',
        },
        {
          priority: 4,
          metric: 'Flow revenue share — email-attributed revenue from automated flows divided by total email-attributed revenue',
          fixFirst:
            'The flow portfolio comes fourth, because automated flows are where email economics live: they typically produce 30 to 50 percent of email-attributed revenue while representing less than 20 percent of sends, and they are the only part of the channel whose revenue does not fall when you stop sending. Build the set in Step 3 around the moments where intent is highest, which are the two windows that matter most for most businesses: a welcome series for people who just signed up, and a cart or browse recovery inside the first day. Then measure the share monthly, because a portfolio that is mostly broadcast and a few decorative flows will show a healthy total with an unhealthy structure underneath.',
          alsoMoves:
            'Flow share tells you whether Step 3 should add more flows or fix the ones you have, because a portfolio with few flows and a low share needs different work than a portfolio with many flows and a low share. It also decides how much of any forecast depends on trigger reliability, since flow revenue is conditional on the trigger firing, while broadcast revenue depends only on your list size and your inbox placement.',
          backfire:
            'Building flows backfires when the trigger fires on the wrong event. The classic failure is a post-purchase cross-sell triggered on delivery rather than on a placed order, which means the customer gets sold a second product before the first one has shipped, and the conversion is roughly three times worse than a triggered-on-order version of the same email. The second trap is adding flows without watching total sends: each new flow increases volume, and once the frequency cap is the binding constraint, more flows mean fewer emails per flow and the same revenue for a bigger send bill.',
        },
      ],
    },
    zh: {
      intro:
        '打开率是邮件里最不可信的数：2021 年 Apple 邮件隐私保护给每一次打开凭空加了 5 到 15 个百分点，所以「打开率在涨、每位收件人营收在跌」的看板，说的其实是名单不再想收你的信，而不是主题行变好了。邮件有四个故障会同时发生，而且有先后：信落在哪、名单漏多快、你分得多细、营收里有多少来自自动化流而不是广播。送达最先坏，也最隐蔽——下游每个率都只在真正进了收件箱的那部分消息上算，15% 的发送进了垃圾箱时，你报的每个数都在 85% 的受众上算，分母却还写着 100。名单衰减第二个坏，而且是纯算术：一个月漏掉 12% 的名单要靠永久更高的获客速率才能维持规模，创意工作修不了它。分层第三个坏，它是唯一不靠多发就能加营收的杠杆——广播点击率 1-2%，分层之后 3-5%，按行为触发之后 5-10%，每一层都是下一层的 2 到 3 倍。流营收最后坏，因为它是这个渠道里唯一你不发信也不会掉的收入。全篇口径：每位收件人营收按实际投递的消息算，送达率按实际发送数算，每一份营收占比都标明是「占营收」还是「占发送量」。',
      rows: [
        {
          priority: 1,
          metric: '收件箱到达率 —— 30 天内进入收件箱的消息数除以实际发送数',
          fixFirst:
            '先说送达率，因为它是这张表里唯一能改变其他所有指标大小的指标。打开率、点击率、每位收件人营收，全都是在「进了收件箱的那部分消息」上算的，所以如果 15% 的邮件进了垃圾箱，你报的每一个率都是在 85% 的受众上算出来的，而你的分母还假设着全部。必须在动内容之前修，因为在一个被污染的样本上测主题行，只会选出错误的赢家，而你之后每一次发送都会把这个错误固化下来。要做的是鉴权与信誉：确认 SPF、DKIM、DMARC，查 Google Postmaster 与 Microsoft SNDS，在改任何别的东西之前先跑一次种子测试。',
          alsoMoves:
            '送达率是读懂步骤 1 的卫生数字、以及步骤 4 的测试结果的前提，因为两者都是在一个真实投递到的受众上算的。它同时保护步骤 6 的季度重对：如果一条流是因为被节流而跌破 0.5% 点击率，而不是因为它不灵了，日落它等于删掉一个在鉴权修好之后就会回来的营收来源。它还是步骤 2 名单衰减的底噪：送达不稳的时候，你会把「信没送到」误读成「人不想收」，于是一份其实健康的名单被过度日落，而账面上只看到名单变小，看不到真正的原因是信根本没到。',
          backfire:
            '修送达率有一种翻车方式，正是这次「修复」本身发出的邮件太多。日落活动发给那些从没要求过的人，会推高投诉率，而 0.1% 以上的投诉率恰好是主流服务商启动节流的门槛，于是一个本该恢复送达率的名单清理项目，反而先把送达率弄丢。第二个坑是拿打开率当互动指标：Apple 邮件隐私保护把打开率虚抬 5 到 15 个百分点，从没互动过的人被补成了看起来活跃的样子，于是 180 天没打开就日落的规则会把那些九个月才买一次的客户清掉。',
        },
        {
          priority: 2,
          metric: '名单净衰减 —— 每月流失订阅者数除以平均名单规模，取近 3 个月',
          fixFirst:
            '接下来是名单衰减，因为它决定了后面每个指标所依附的受众规模，而且一个月衰减超过 7% 会把名单增长变成一台跑步机：你不断买人进来填补一个漏了底的容器，而每一封邮件的边际成本随着补员率一起上涨。算近 3 个月的每月净流失，把退订、硬退信和垃圾投诉分开，因为三者的修法完全不同。修法就是步骤 1 的卫生工作：永久日落之前先设 90 天再激活流，抑制硬退信与投诉者，并复盘到底是哪类内容在制造流失。',
          alsoMoves:
            '衰减告诉你步骤 3 的那些流值不值得按规模去建，因为一条流需要可触达的受众才能跑，而一个每月漏 12% 的名单，即使总发送量稳住，每月被触发的队列也在变小。它同时给步骤 4 设了上限：在名单一个月缩掉四分之一的测试期里测主题行，你量到的提升是在两个不同受众上量的，而受众变敏感本身就能造出 20% 的打开率提升。',
          backfire:
            '激进日落的翻车方式恰恰长得很像成功：把不活跃订阅者清掉之后，打开率和点击率都上去了，因为死重没了，于是每位收件人营收看起来比之前更好，而邮件总营收在掉。只用互动率来评判卫生工作，你会得出「清理是笔好买卖」的结论并就此收手，而名单在那些变好的比率底下继续缩小。第二个坑是再激活流太激进：反复给没互动的人发信，是最快毁掉送达率的投诉率来源。',
        },
        {
          priority: 3,
          metric: '分层深度 —— 分层与触发类发送带来的邮件归因营收除以邮件归因总营收',
          fixFirst:
            '第三件是分层深度，因为它是这张表里唯一不靠多发就能加营收的杠杆，而且差距大到能盖过其他一切：广播点击率 1-2%，分层发送 3-5%，行为触发且点名、按时段的发送 5-10%，每一层都是下一层的 2 到 3 倍。修法是把你发得最勤的那封广播换成一封取决于你确实知道的信息的发送，并把触发条件定义在真实事件上，而不是一个人口属性桶上。必须在卫生与送达之后做，因为分层是靠「把一条相关的消息送给一小群人」来起效的，只有消息真的送到了、那个人真的处在那个状态，它才兑现。',
          alsoMoves:
            '分层正是让步骤 3 那组自动化流回本的原因，因为你能拿到的层级收益，大部分来自按行为触发，而不是来自广播量。它也改变步骤 4 每周的主题行测试：在广播受众上测，你优化的是最弱的一层；同一个测试放进某个分层里，起跑线不同，赢家也不同。它还决定步骤 5 的送达监控要不要收紧：分层做得越细，触发邮件越集中，一旦送达率出问题，受影响的不是零散几封，而是整个高价值分层，而这种集中度会让一次事故比广播时代大得多。',
          backfire:
            '分层有一种翻车方式：按那些与购买时机相关、却不按时机触发的属性来分，等于两头不讨好——人在还不想要的时候收到相关的促销，频次上限实际上被突破，投诉率上升，于是反过来吃掉上面那一行的送达率。第二个坑是给分层改名而不是定义它：一封发给手工挑出名单的广播，在你的报表里算作分层，却只拿到广播的那点提升。要求每个分层都写明让人进去的事件，以及让人出来的事件。',
        },
        {
          priority: 4,
          metric: '自动化流的营收占比 —— 自动化流带来的邮件归因营收除以邮件归因总营收',
          fixFirst:
            '最后是自动化流组合，因为邮件的经济学就住在自动化流里：它们通常贡献 30-50% 的邮件归因营收，却只占不到 20% 的发送量，而且它们是整个渠道里唯一一部分「你不发信它也不掉」的营收。步骤 3 里那组流要围绕意图最高的时刻来建，对多数生意来说就两个窗口最重要：刚注册的人的欢迎系列，以及第一天之内的弃单或浏览挽回。然后每月量这个占比，因为一个「几场广播加几个装饰性流程」的组合，总量看着健康，结构却不健康。',
          alsoMoves:
            '流营收占比告诉你步骤 3 该继续加流还是该修现有的流：流很少且占比低的组合，与流很多但占比低的组合，需要做的是完全不同的功课。它还决定了你的预测里有多少依赖触发可靠性，因为流的营收取决于触发有没有发生，而广播营收只取决于名单规模和收件箱到达率。它也决定步骤 6 里日落一条流的代价：占比高的组合里，砍掉一条低点击率的流伤的是结构而不是总量；占比低的组合里同样一刀砍下去，砍掉的可能是你唯一的营收来源，而你在报表上只看到「下线了一条流」。',
          backfire:
            '建流有一种翻车方式：触发挂在错误的事件上。最经典的是购后交叉销售挂「已送达」而不是「已下单」，于是客户在第一单还没发货时就收到第二件商品的推销，同一封邮件的转化率会差到大约三倍。第二个坑是加流时不看总发送量：每加一条流，总量就涨，而一旦频次上限成为硬约束，加流的结果就是每条流能发的邮件变少，营收不变而发送账单变大。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Six checks decide whether an email program earns, and each of them can pass while the program still loses money. The first is the list: pull twelve months of opens and clicks, and treat a subscriber with zero engagement for 180 days as a candidate for a 90-day re-engagement sequence rather than as dead weight, because a buyer on a nine-month cycle looks exactly like a lapsed subscriber until you give that buyer three more months. The second is segmentation that names its own entry and exit events and carries a written frequency cap per stage, since a stage without an exit event keeps accumulating people who have moved on, and a cap tuned for the original population then becomes a violation for everyone still sitting in it. The third is live automation: four to six flows triggered on order data rather than on delivery status, because a post-purchase cross-sell triggered on delivery reaches people who have not bought anything. The fourth is a subject-line test judged on click rate over six runs, not on opens, which is the metric Apple inflates by 5 to 15 points. The fifth is authentication confirmed before any scale-up, with SPF, DKIM and DMARC passing, inbox placement above 95 percent on a seed test and a complaint rate under 0.1 percent, because an unaligned SPF record damages the engagement numbers of the first two checks rather than the deliverability report. The sixth is a quarterly re-benchmark that retires a flow on revenue per recipient as well as on click rate, so a small win-back sequence with a high per-recipient yield is not killed for having a 0.4 percent click rate.',
      items: [
        {
          step: 1,
          label: 'List hygiene audited with the permanent-sunset rule applied through a re-engagement flow',
          gate: 'Twelve months of open and click data pulled, every subscriber with zero engagement for 180 days routed through a 90-day re-engagement flow before any permanent sunset, hard bounces and spam complainers suppressed rather than mailed, and the resulting list size change reported as a net monthly decay rate.',
          blockIf:
            'If permanent sunset happens without the re-engagement flow, you delete people who were on a slow buying cycle rather than inactive, and the decay rate looks better for a quarter while revenue per recipient falls. If you cannot report the net decay rate, you cannot tell later whether a change in revenue came from the list or from the content.',
        },
        {
          step: 2,
          label: 'Lifecycle segments defined with an entry event, an exit event and a frequency cap',
          gate: 'Onboarding, active, at-risk, lapsed and win-back stages each defined by the event that enters a subscriber and the event that removes them, a written frequency cap per stage (active at most 4 per month, at-risk at most 2 per month, lapsed 1 win-back sequence), and each stage holding at least 5 percent of the list or an explicit note that it does not.',
          blockIf:
            'A stage with no exit event accumulates subscribers who have moved on, so the average stage size grows while the average age of the stage rises, and a frequency cap tuned for the original population becomes a violation for everyone still sitting in it. If no stage holds a meaningful share of the list, segmentation is a naming exercise and step 3 cannot be sized.',
        },
        {
          step: 3,
          label: 'Four to six automation flows live, each tied to a real intent moment',
          gate: 'At least 4 automation flows live and running (welcome series of 3-5 emails, cart or browse recovery within 24 hours, post-purchase cross-sell over 14 days, win-back at 30/60/90 days), each triggered on an event you can verify from order data rather than on delivery status, and each flow measured for revenue per recipient.',
          blockIf:
            'A flow triggered on delivery instead of a placed order mails customers who have not bought anything, and because the trigger fires for the whole list it inflates your send count while diluting the very segment it was meant to serve. If per-recipient revenue is not measured per flow, a flow with no revenue keeps running because nobody is accountable for turning it off.',
        },
        {
          step: 4,
          label: 'Weekly subject-line tests with a lift target and a fixed send-time rotation',
          gate: 'One subject-line or preview-text test per week, 6 tests running before you judge the result, a target of at least a 20 percent lift measured on click rate rather than on opens, and send times rotated across cohorts so that no single slot owns the audience.',
          blockIf:
            'Judging the test on opens is measuring the metric Apple mail privacy protection inflates, so you can win on a subject line that changes nobody behaviour. Fewer than 6 tests means you are reading noise, and rotating nothing means the same early-morning send reaches every subscriber on the same day, which concentrates the damage when placement slips.',
        },
        {
          step: 5,
          label: 'Deliverability monitored weekly with authentication confirmed before any scale-up',
          gate: 'SPF, DKIM and DMARC all passing and confirmed in Google Postmaster and Microsoft SNDS, inbox placement above 95 percent on a seed test over the last 30 days, spam complaint rate below 0.1 percent, bounce rate below 2 percent, and each of the four checked every week rather than at launch.',
          blockIf:
            'Sending more before authentication is confirmed is the cheapest way to lose a list: an unaligned SPF record or a missing DMARC policy makes every send more likely to land in spam, and the damage shows up in the engagement rates of steps 1 and 2 rather than in the deliverability report, so you will fix it in the wrong place. If placement is checked only at launch, a gradual decline over months goes unnoticed.',
        },
        {
          step: 6,
          label: 'A quarterly re-benchmark that sunsets flows on revenue, not on click rate alone',
          gate: 'A re-benchmark against the industry rows every 90 days, every flow measured on revenue per recipient as well as click rate, any flow under 0.5 percent click rate or 0.1 percent conversion retired with its revenue recorded, and the retired flow count and the revenue recovered both written down.',
          blockIf:
            'Retiring on click rate alone kills flows whose audience is small but whose revenue per recipient is high, which is exactly the profile of a win-back sequence. Without recording the revenue of retired flows, you cannot tell whether the quarterly cleanup created money or simply reduced sending, and the next quarter repeats the same cleanup on a different set of flows.',
        },
      ],
    },
    zh: {
      intro:
        '邮件这一行最常见的错觉，是发得多就算做得好。真正决定赚不赚钱的是六件事，而它们每一件都能「看起来通过」、结果仍然亏。名单要拉满 12 个月的打开与点击，180 天零互动的人先进 90 天再激活序列，而不是直接当死流量丢掉——九个月才买一次的人，和流失订阅者在数据上长得一模一样，得给他三个月再判。生命周期分层要写明让人进去的事件和让人出来的事件，并写死频次上限：没有退出事件的阶段会一直攒着已经往前走的人，当初按老名单调的频次上限对剩下的人全部变成违规。自动流要挂在订单数据能验证的事件上，而不是挂在「已送达」上，否则购后交叉销售会寄给根本没下单的人。主题行测试要看点击率、跑满六次，因为打开率正是 Apple 虚抬 5 到 15 个点的那个数。扩量前先确认 SPF、DKIM、DMARC 全部通过、种子测试收件箱到达率高于 95%、投诉率低于 0.1%——没对齐的 SPF 记录伤的是前两项的互动率，而不是送达报告。季度重对时，一条流要按每位收件人营收和点击率一起判，免得受众小但单收收益高的唤回序列因为 0.4% 的点击率被砍掉。',
      items: [
        {
          step: 1,
          label: '经过再激活流后才执行永久日落的名单卫生审计',
          gate: '拉取 12 个月的打开与点击数据，180 天零互动的订阅者全部先走 90 天再激活流再谈永久日落，硬退信与垃圾投诉者直接抑制而不是照发，并把结果报告为净月度衰减率。',
          blockIf:
            '不经再激活流就永久日落，删掉的是处在慢购买周期里的人而不是真正不活跃的人，于是衰减率会好看一个季度，而每位收件人营收在掉。如果你报不出净衰减率，之后就分不清营收的变化是来自名单还是来自内容。',
        },
        {
          step: 2,
          label: '带进入事件、退出事件与频次上限的生命周期分层定义',
          gate: '入职、活跃、风险、流失、唤回五个阶段各自写明让人进入的事件与让人离开的事件，每个阶段有书面频次上限（活跃每月不超过 4 封、风险不超过 2 封、流失仅 1 条唤回序列），并且每个阶段至少占名单的 5%，否则要明确写下它不占。',
          blockIf:
            '一个没有退出事件的阶段会不断积累已经往前走的人，于是这个阶段的平均规模在涨、平均年龄也在涨，而按最初那批人调的频次上限，对所有还留在里面的人都变成了违规。如果没有任何阶段占到名单的实质比例，分层就只是改名，步骤 3 也没法据此定规模。',
        },
        {
          step: 3,
          label: '四到六条已上线、且挂在真实意图时刻上的自动化流',
          gate: '至少有 4 条自动化流已上线运行（欢迎系列 3-5 封、24 小时内的弃单或浏览挽回、14 天内的购后交叉销售、30/60/90 天的唤回），每条都挂在能从订单数据验证的事件上而不是挂在「已送达」上，并且每条都量了每位收件人营收。',
          blockIf:
            '挂在「已送达」而不是「已下单」上的流，会给还没买过的人发信，而且因为触发条件对全名单生效，它一边抬高发送量，一边稀释了它本该服务的那群人。如果不逐条量每位收件人营收，一条零营收的流就会一直跑着，因为没人为关掉它负责。',
        },
        {
          step: 4,
          label: '每周的主题行测试，带提升目标与固定的发送时段轮换',
          gate: '每周 1 个主题行或预览文本测试，跑满 6 次再下结论，目标提升不低于 20%，且以点击率而非打开率衡量，同时按队列轮换发送时段，避免某个时段独占全部受众。',
          blockIf:
            '拿打开率评判测试，量的正是 Apple 邮件隐私保护虚抬的那个指标，于是你可以靠一个谁的行为都没改变的主题线「赢」。不足 6 次测试读的是噪声；而时段不轮换，意味着同一批人总在同一天同一个清晨收到信，一旦送达率出问题，损害是集中的。',
        },
        {
          step: 5,
          label: '每周监控的送达率，且任何扩量前先确认鉴权',
          gate: 'SPF、DKIM、DMARC 全部通过，并在 Google Postmaster 与 Microsoft SNDS 上确认；近 30 天种子测试收件箱到达率高于 95%，垃圾投诉率低于 0.1%，退信率低于 2%；这四项每周都查，而不是只在上线时查一次。',
          blockIf:
            '鉴权没确认就先加量，是丢名单最便宜的方式：SPF 没对齐或缺 DMARC 策略，会让每一封发出去的信更容易进垃圾箱，而损害体现在步骤 1 与步骤 2 的互动率上，不体现在送达报告里，于是你会去错的地方修。如果送达率只在上线时查，几个月里慢慢滑下去的过程根本不会被发现。',
        },
        {
          step: 6,
          label: '按营收而不是单看点击率做日落决策的季度重对',
          gate: '每 90 天按行业行重对一次，每条流除了点击率还量每位收件人营收，任何点击率低于 0.5% 或转化率低于 0.1% 的流都下线并记录其营收，同时把下线条数与回收的营收都写下来。',
          blockIf:
            '只按点击率下线，会杀掉受众小但每位收件人营收高的流，而唤回序列恰好就是这个特征。没有记录被下线流的营收，你就分不清这次季度清理是创造了钱还是单纯减少了发送量，下个季度就会在另一批流上重复同样的动作。',
        },
      ],
    },
  },
};
