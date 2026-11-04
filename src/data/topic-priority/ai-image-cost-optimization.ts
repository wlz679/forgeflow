// P166 —— B 类（AI Cost Tools）主题「ai-image-cost-optimization」的新形态内容。
//
// ⭐ 严格档：本主题讲的是**随定价 bot 每周漂移的市场价**（每张图的单价、订阅档位月费）
//   ⇒ 本文件里任何单价都走 live token，一个字的手写价格都不许出现。
//   聚合量级用「张数 / 次数 / 百分比 / 带宽」表达，不用美元数字。
//
// 与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一档 → 算月成本 → 算订阅盈亏平衡 → 叠隐藏成本
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（清点 → 算单张 → 算订阅 → 匹配供应商 → What-If → 设预算）
//   · 本文件 fixPriority = 五个成本指标同时不达标时，先修哪个 → 它顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」（howToApply 只说做什么，不说什么算达标）
//
// live token 用法说明：
//   · {{liveDate}} → 价格数据集最后更新时间
//   · {{liveImagePerImageTrim:<provider>}} → 该供应商的单张价（去尾零）
//   · {{liveImageSubRange:<provider>}} / {{liveImageSubTier:<provider>|<idx>}} → 订阅档位区间 / 档位月费
//   · {{liveImageAdvMult:<mode>}} → 画质模式倍率（standard / hd / ultra）
//   · {{liveImageMonthly:<provider>|<images>}} → 按张计费的月额
//   · {{liveImageCheapest:<provider>}} → 显示名
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Teams read their image bill from the wrong line, and the line they read is the per-image rate. What you actually buy is a usable image, and a usable image is what survives content-filter rejections, retries, and the attempt you discard because it missed the brief. Five numbers sit under every image bill, and they belong to different owners: how much of your volume is routed to the cheapest tier that still meets its quality bar, what you pay per accepted image rather than per attempt, how many generations die before one is accepted, whether a subscription beats pay-per-image at your volume, and how much of the invoice is per-call overhead rather than per-pixel work. Routing leads, because it cuts cost without cutting quality and nothing downstream can be read until the mix it sets is known. Subscription break-even comes next, but only once volume is known, since a flat monthly fee overtakes per-image pricing above a crossover that sits an order of magnitude apart between tiers. Provider fit and quality multipliers follow, because a thumbnail rendered at 2048 by 2048 in ultra mode costs several times what the same thumbnail costs at a sensible tier. The per-image rates, subscription tiers and quality multipliers all move independently — that table is refreshed {{liveDate}}, so an old number quietly becomes a wrong one.',
      rows: [
        {
          priority: 1,
          metric: 'Scenario routing coverage — share of images sent to the cheapest tier that meets their brief',
          fixFirst:
            'Fix routing coverage first, because it is the only lever on this list that reduces cost without reducing quality, and because it costs nothing but inventory work. List your images by use case — blog hero, social post, ad creative, product photo, UI mockup — and for each one name the resolution tier and the quality bar it actually needs, then send it to the cheapest provider that clears that bar. Most teams are overpaying because a single default provider handles every use case, and the gap between the bulk tier and the premium tier is large: {{liveImagePerImageTrim:stable-diffusion-4}} per image against {{liveImagePerImageTrim:dalle-4}} per image on the same job. Verify by regenerating one week of traffic through the new routing and measuring accepted images per generated image, not just the bill.',
          alsoMoves:
            'Routing changes the mix every other metric is computed on, which is why it has to come first. It moves the effective per-image cost directly, because a thumbnail that used to be generated on a premium model now costs the bulk rate. It also changes the subscription break-even: once cheap traffic is routed away from the subscription provider, the provider you subscribe to is the one carrying only the images that genuinely need it, so the break-even volume drops and the comparison is made on the right traffic. And it moves the rejection rate, because content-filter and instruction-following failures cluster in the premium and mid tiers, so a sensible routing table usually reduces wasted generations at the same time.',
          backfire:
            'Routing backfires when the quality bar is written as a preference rather than as a requirement. A product photo that needs legible text, or a hero image that has to match a brand system, will not survive a downgrade: the cheap model returns an image that looks finished and is unusable, so the accepted rate collapses, the per-accepted-image cost rises even though the per-generated-image cost fell, and the team concludes the routing table is fine because the bill went down. The second failure is routing on resolution alone while ignoring that a cheap tier delivers a different aspect ratio or a different file format, which pushes a conversion step into the pipeline that cost per image never showed.',
        },
        {
          priority: 2,
          metric: 'Effective cost per accepted image — total image spend ÷ images actually used downstream',
          fixFirst:
            'Fix the effective per-image metric second, because until the denominator is "images that survived" every other number on the bill is a rate applied to a count you did not need. Rebuild it from the same period as the routing change: total spend on generation, divided by the images that were shipped, published or used, not the images returned. The gap between this and the per-generated-image cost is the total cost of rejection, retry and waste, and it is usually where most of the money is. Verify by splitting the numerator into API spend, subscription fees and any human review or reshoot labour, because the third component is the one that a vendor invoice will never show you.',
          alsoMoves:
            'This metric is what makes the rest of the table measurable. It converts the rejection and retry rate from a quality complaint into a money number, so a 1-point improvement in acceptance is worth a specific amount instead of a vague sense that things are wasteful. It also re-bases the subscription break-even in row 4, because a subscription is only cheaper if it covers the images you actually needed, not the ones you generated and threw away. And it is the metric that the budget cap in the final step should be written against, since a cap on generation spend alone rewards teams for generating more and keeping less.',
          backfire:
            'Measuring effective cost against accepted images backfires when acceptance becomes the thing being optimised rather than a quality signal. A workflow can raise the accepted rate simply by loosening what counts as accepted, so the metric improves while the output quality falls, and the quality cost surfaces later as a brand or conversion problem that no image metric captures. The other failure is allocating the subscription fee across the images you used while ignoring the images the subscription let you generate for free and waste: if the waste is 40% of volume, the effective cost per used image carries that 40% and the per-generated rate looks artificially good in every dashboard.',
        },
        {
          priority: 3,
          metric: 'Rejection and retry rate — generations that fail or are re-issued ÷ generations requested',
          fixFirst:
            'Fix the rejection and retry rate third, because it is the largest multiplier on everything upstream: every rejected generation is billed and delivered nothing, and every retry bills a second generation for the same intent. Split it into two causes before fixing either, because they have opposite fixes. Content-policy rejections are a prompt and provider problem, and the fix is a different prompt, a different provider or a different subject matter. Truncation and partial-output failures are a resolution and duration problem, and the fix is the quality mode and the step budget. Measure the rate per provider and per use case, not as a blended number, because a provider that rejects 12% of ad creatives and 1% of thumbnails is a perfectly good thumbnail provider.',
          alsoMoves:
            'A falling rejection rate lifts the effective per-image cost in row 2 without a single price change, because the same budget buys more usable images. It also raises the value of routing in row 1: once acceptance is measured per provider, you can move a use case to the provider that actually accepts it, and the routing decision stops being a guess based on sticker price. And it feeds the subscription decision directly, because a subscription that buys a fixed number of generations has its real capacity determined by acceptance rate — a 30% rejection rate means a subscription pays for 30% fewer deliverables than its tier suggests.',
          backfire:
            'Cutting the rejection rate backfires when it is done by changing the subject matter rather than the pipeline. A prompt that avoids the content filter produces a blander image that passes review and fails the brief, and because the filter rejection rate drops to zero, the quality metric that was supposed to catch this reads green. The other version is retry suppression: a retry limit set low enough to protect the bill also converts failures into silently missing assets, so the rejection rate improves because fewer failures are recorded rather than because fewer happen, and the gap reappears as a missed deadline in the campaign calendar.',
        },
        {
          priority: 4,
          metric: 'Subscription break-even — subscription monthly fee vs pay-per-image spend at your accepted volume',
          fixFirst:
            'Fix the subscription break-even fourth, because it is the largest single line on the bill and it is the one that keeps costing you money in both directions at once. Compute it on accepted images rather than generated ones: the subscription is only worth it if the fee is below what the equivalent volume would have cost at per-image rates, using the per-image rate of the provider the subscription actually replaces. The subscription tiers in the live table run from {{liveImageSubRange:midjourney-v7}}, with individual tiers such as {{liveImageSubTier:midjourney-v7|0}} and {{liveImageSubTier:midjourney-v7|2}} per month. Verify by writing down, for each tier you hold, the volume at which the fee equals the per-image alternative — and cancelling or downgrading any tier where your volume has fallen below that line.',
          alsoMoves:
            'The break-even calculation is what tells you how much headroom the subscription gives you before it becomes waste. It also moves the routing table, because once you know which tier your volume supports, you know which use cases the subscription can carry and which must go to per-image providers — the two decisions become one instead of competing. And it changes the budget cap in the final step, because a subscription is a fixed monthly commitment that does not scale down with a traffic drop, so the cap has to be expressed as a volume commitment rather than as a spend limit if you hold one.',
          backfire:
            'The subscription decision backfires when you hold several tiers at once, because each one looks cheap against per-image pricing for its own use case, while their sum is what the business actually pays. Holding a standard tier for thumbnails and a premium tier for heroes can cost several times what a single tier plus a small per-image allowance would cost, and the per-tier view never shows it. The second trap is annual pre-commitment against a shrinking program: a subscription locks in a monthly fee, so when the campaign calendar shrinks the fee does not, and you end up paying for capacity you no longer generate against.',
        },
        {
          priority: 5,
          metric: 'Per-call overhead share — API overhead and batch inefficiency as a share of the image bill',
          fixFirst:
            'Fix the per-call overhead last, because after the first four rows it is usually the smallest line, and because it is the one that moves only when the call pattern changes. Batch the calls, raise the batch size until the provider limit, and separate the interactive path from the batch path so that a single hero image never waits in a queue behind a thousand thumbnails. Measure the overhead share directly as the difference between what you would pay at the per-image rate for the same accepted volume and what you actually paid, after removing the routing, rejection and subscription effects you already fixed. Verify by re-running one batch of production traffic with a larger batch size and comparing accepted images per call.',
          alsoMoves:
            'The overhead metric is also the last remaining lever on latency and throughput, so fixing it usually improves the experience of the people waiting on images rather than only the bill. It interacts with routing, because a tier that receives hundreds of scattered calls behaves differently from the same tier receiving them in batches: the effective rate per accepted image changes with the call pattern even when the per-image rate is identical. And it is the metric that tells you whether the remaining cost is a price problem or a plumbing problem — after routing, acceptance and subscription are handled, whatever is left here is what is left to negotiate with the vendor.',
          backfire:
            'Batch optimisation backfires when interactivity is batched by accident. A hero image that a marketer needs to iterate on cannot sit behind a batch of a thousand thumbnails, and when it is queued behind them the deadline is missed, the retry is manual, and the manual retry is billed twice — so the overhead share improves and the cost per accepted image gets worse. The other version is batching at the cost of the prompt: batching forces one prompt across many images, which raises the rejection rate on the images that needed individual direction, so the acceptance improvement you were counting on does not materialise.',
        },
      ],
    },
    zh: {
      intro:
        '图像账单几乎都被从错误的那一行读起，而大家读的那一行是单张价。你真正买到的是一张能用的图，而能用的图是熬过内容过滤、熬过重试、熬过那张因为不满足需求被丢掉的图之后剩下的东西。每一张图像账单底下都坐着五个数，而它们分属不同的负责人：多少流量被路由到仍然满足其质量门槛的最便宜档位、你每张真正被采纳的图付了多少钱（而不是每次尝试）、多少次生成在成功之前就死了、订阅在你这个量级上是不是比按张计费更划算、以及账单里有多少属于每次调用的固定开销而不是真正的画面工作。路由排在第一位，因为它不牺牲质量就能降成本，而它定下的那套流量结构不清楚，后面任何数字都读不出来。订阅那条交叉线紧随其后，但前提是先知道量，因为一个月费能压过按张计费的那个交叉点，在不同档位之间差着整整一个数量级。然后是供应商匹配与画质倍率：一张缩略图被渲染成 2048×2048 的 ultra 模式，成本是同一张缩略图在合理档位上的好几倍。价格表里的单张价、订阅档位和画质倍率是各自独立地在动的（更新于 {{liveDate}}），所以旧数字会悄悄变成错数字。',
      rows: [
        {
          priority: 1,
          metric: '场景路由覆盖率 —— 被送到「仍能满足其需求的最便宜档位」的图像占比',
          fixFirst:
            '先修路由覆盖率，因为它是这张表上唯一一条不降低质量就能降成本的杠杆，而且它只需要清点工作，不花钱。按使用场景清点：博客头图、社交帖、广告创意、产品图、UI 模型图；为每一类写清楚它真正需要的分辨率档和质量门槛，然后交给能过这道门槛的最便宜供应商。多数团队之所以多付钱，是因为所有场景都由同一个默认供应商处理，而批量档与高端档之间的差距很大：同一件活儿在 {{liveImagePerImageTrim:stable-diffusion-4}} 与 {{liveImagePerImageTrim:dalle-4}} 之间差了不止一个量级。验证方式：用新路由重跑一周流量，量的是「被采纳图 ÷ 生成图」，而不只是看账单。',
          alsoMoves:
            '路由改变了后面每个指标赖以计算的结构，所以它必须排第一。它直接压低有效每图成本，因为以前用高端模型生成的缩略图现在按批量价走。它也改变订阅盈亏平衡：便宜的活儿被路由走之后，你订阅的那家供应商只剩下真正需要它的图，盈亏平衡的量下降，比较也就落在正确的流量上。它还会改变拒绝率，因为内容过滤和指令跟随的失败集中在高端档和中端档，所以一张合理的路由表通常同时减少废图。',
          backfire:
            '路由的反噬，是把质量门槛写成偏好而不是要求。需要文字可读的产品图、或者必须匹配品牌系统的主视觉，降档之后活不下来：便宜模型返回一张看起来完成度很高、实际不能用的图，采纳率崩掉，每张被采纳图的成本反而上升，而团队看账单降了就断定路由表没问题。第二个失败是只按分辨率路由，忽略便宜档会给不同的画面比例或文件格式，于是管线里多出一步格式转换，而这一步从来不体现在单图成本里。',
        },
        {
          priority: 2,
          metric: '有效每图成本 —— 图像总支出 ÷ 真正被下游用掉的图',
          fixFirst:
            '第二步修「有效每图成本」，因为在分母换成「活下来的图」之前，账单上所有其他数字都只是把你不需要的次数乘上了一个单价。用与路由改动相同的期间重建：生成总支出除以真正发布、投放或使用的图，而不是返回的图。两者之差就是拒绝、重试与废弃的总成本，钱通常就在这里。验证方式：把分子拆成 API 支出、订阅费用、以及人工审图或重拍的人工成本——第三项是供应商发票永远不会告诉你的那一块。',
          alsoMoves:
            '这个指标让表上其他所有数变得可测。它把拒绝率和重试率从一句质量抱怨换算成一个金额，于是「采纳率提升 1 个点」值多少钱是具体的，而不是一种模糊的浪费感。它也重设了第四行的订阅盈亏平衡：订阅只有在覆盖你真正需要的那些图时才更便宜，而不是覆盖了你生成又扔掉的那些图。它还是最后一步预算上限该对着写的那个指标——只给生成支出设上限，会奖励那些「生成更多、留下更少」的团队。',
          backfire:
            '用「被采纳的图」当分母的反噬，是采纳率本身变成了被优化的对象，而不是一个质量信号。工作流可以把「什么算被采纳」放松，于是这个指标变好、产出质量变差，而这份质量成本日后会以品牌或转化问题的形式出现，任何图像指标都测不到。第二个失败是分摊：把订阅费摊到用掉的图上，却忽略订阅让你免费生成又扔掉的那部分——如果浪费占 40%，有效每图成本就得背着这 40%，而每张生成图的价在任何看板里都显得漂亮得过分。',
        },
        {
          priority: 3,
          metric: '拒绝率与重试率 —— 失败或被重新发起的生成次数 ÷ 请求的生成次数',
          fixFirst:
            '第三步修拒绝率与重试率，因为它是上游所有数字的最大乘数：每一次被拒的生成都照付钱、什么也没产出，每一次重试都为同一个意图再付一次钱。修之前先把它拆成两类成因，因为两类的修法正相反。内容策略拒绝是提示词和供应商的问题，修法是换提示词、换供应商或换题材；输出截断和不完整是分辨率与时长问题，修法是画质模式和步数预算。按供应商和按使用场景分别量，不要用混合数——一个在广告创意上拒 12%、在缩略图上拒 1% 的供应商，作为缩略图供应商完全合格。',
          alsoMoves:
            '拒绝率下降会在不动任何价格的前提下抬高第二行的有效每图成本，因为同一笔预算买到了更多能用的图。它也抬高第一行路由的价值：一旦按供应商量出采纳率，你就能把某个场景挪到真正接得住它的供应商手里，路由决策也就不再是照着标价瞎猜。它还直接影响订阅决策，因为订阅买的是固定次数的生成，而它的真实容量由采纳率决定——30% 的拒绝率意味着一个订阅档实际交付的成果比标称少 30%。',
          backfire:
            '压拒绝率的反噬，是用改题材而不是改管线来达成。一个绕开内容过滤的提示词会产出一张更平庸但能过审的图，而它确实没被过滤掉——于是本该抓到这个问题的质量指标显示绿灯。另一个版本是压重试：把重试次数上限调得够低以保护账单，于是失败变成静默缺失的素材，拒绝率因为「失败没被记录」而改善，而缺口以活动日历上错过截止日的形式回来。',
        },
        {
          priority: 4,
          metric: '订阅盈亏平衡 —— 订阅月费 vs 在你实际采纳量上的按张计费支出',
          fixFirst:
            '第四步修订阅盈亏平衡，因为它是账单上最大的一行，而且它同时在两个方向上持续浪费钱。先按被采纳的图算，而不是按生成的图算：只有当订阅费低于同等数量按单张价购买的成本时，订阅才划算，而要比的必须是「订阅真正替代掉的那家供应商」的单张价。实时价格表里的订阅档从 {{liveImageSubRange:midjourney-v7}} 起，各档月费如 {{liveImageSubTier:midjourney-v7|0}} 与 {{liveImageSubTier:midjourney-v7|2}}。验证方式：为每个你持有的档位写下「费用等于按张替代成本的那个量」，把量已经跌到这条线以下的档位降档或退掉。',
          alsoMoves:
            '盈亏平衡计算告诉你订阅在变成浪费之前还有多少余量。它也改变路由表：一旦知道哪个档位是你当前量级撑得起的，你就知道哪些场景可以交给订阅、哪些必须走按张计费供应商——两个决策从互相竞争变成同一件事。它还改变最后一步的预算上限，因为订阅是固定月度承诺，不会随流量下降而下降，所以只要持有订阅，上限就得写成量的承诺而不是支出限额。',
          backfire:
            '订阅决策的反噬，是同时持有好几个档位：每个档位对着自己的使用场景看起来都比按张计费便宜，而业务实际付的是它们的总和。为缩略图持一个标准档、为头图持一个高端档，总成本可能是「一个档加少量按张额度」的好几倍，而逐档看永远看不出来。第二个陷阱是拿年度预付去对冲一个正在收缩的项目：订阅锁死的是月费，所以当活动日历缩了，费用不会跟着缩，于是你为已经不再生产的容量付钱。',
        },
        {
          priority: 5,
          metric: '每次调用开销占比 —— API 固定开销与批量效率不足占图像账单的比例',
          fixFirst:
            '最后修每次调用开销，因为走过前面四行之后它通常是最小的一行，而且只有调用方式变了它才会动。把调用批处理化，把批大小加到供应商上限，并把交互式路径与批量路径分开，让一张要人等的主视觉不会排在上千张缩略图后面。直接量这一块：先用「同样采纳量按单张价本该花多少」减去「实际花了多少」，再剔除你已经修好的路由、拒绝率与订阅效应。验证方式：拿一批生产流量用更大的批大小重跑一遍，比较每次调用产出的被采纳图数。',
          alsoMoves:
            '开销这个指标同时是最后一道关于延迟和吞吐的杠杆，所以修它通常改善的是等图的人的体验，而不只是账单。它和路由互相作用：同一个档位，收到几百次零散调用和收到批量调用，行为不同——调用模式一变，即使单张价一样，每张被采纳图的实际成本也会变。而且它是判断「剩下的到底是价格问题还是管子问题」的指标：路由、采纳率和订阅都处理完之后，剩下的这一点，就是你还能跟供应商谈的全部。',
          backfire:
            '批量优化的反噬，是把交互式需求意外批量化。营销同事要迭代的主视觉不能排在上千张缩略图后面，一旦被排上，截止日错过，人工重试，而人工重试要付两次钱——于是开销占比改善了，每张被采纳图的成本反而更差。另一个版本是为了批量而批量：批量意味着一条提示词出很多图，于是那些本该单独指导的图拒绝率上升，你指望的采纳率改善并不会发生。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'An image saving that cannot be found on the invoice is not a saving, and these six checks exist to stop exactly that. The route each use case takes to a provider is the first thing to establish, because it decides the volume mix that the per-accepted-image figure is computed over, and that figure in turn decides where the subscription crossover falls. Provider fit comes next, and it is a quality decision as much as a cost one: text-heavy artwork, brand hero images, precise product shots and bulk thumbnails have different requirements, and routing a thumbnail through a premium model is a cost error that also produces a worse asset. Rejections, retries and the discard rate then have to be counted rather than estimated, since they are the difference between the rate on the pricing page and the rate you actually pay. Budget caps and their alerts close the list, expressed per use case rather than per provider, because the two rarely agree. Every rate quoted in these checks comes from the live pricing table, refreshed {{liveDate}}, and the subscription crossover is the one that moves most easily: a vendor changing its tiers shifts that threshold without changing a single per-image rate.',
      items: [
        {
          step: 1,
          label: 'Inventory image volume by use case with a resolution tier and quality bar',
          gate:
            'Every use case in your pipeline — blog hero, social post, ad creative, product photo, UI mockup — has a monthly image count, a named resolution tier and a one-line quality bar, and the per-scene counts sum to the total images your team generated in the last month, within 5% of the generation logs.',
          blockIf:
            'Without the split by use case you cannot route anything, because routing needs a destination and a requirement, and a company-wide average provides neither. It also means step 2 has no denominator you can defend: a blended per-image cost hides exactly the high-cost scenes the routing table is supposed to fix, and the budget in step 6 then locks in a bill nobody chose. If the counts do not reconcile with generation logs, the inventory is an opinion rather than a measurement.',
        },
        {
          step: 2,
          label: 'Assign each use case to the cheapest tier that meets its quality bar',
          gate:
            'Every use case has a named provider and mode, the per-image rate for that provider is taken from the live table (for example {{liveImagePerImageTrim:ideogram-3}} for text-heavy work or {{liveImagePerImageTrim:stable-diffusion-4}} for bulk), and no use case is still routed to a default provider by default.',
          blockIf:
            'Leaving scenes on a default provider is the single largest waste on this list, and it is invisible because the invoice is plausible: a team can spend most of its budget on images that a bulk tier would have produced for a fraction of the cost. It also poisons step 4, because the subscription break-even is computed on the mix that actually runs, and a mix you never routed is the mix you will never be able to compare honestly against a per-image alternative.',
        },
        {
          step: 3,
          label: 'Measure accepted images, rejections and retries per provider and use case',
          gate:
            'For each provider and use case you record accepted images, policy rejections and retries as counts over the same month, and the acceptance rate is above 85% for the bulk tier and above 70% for the premium tier; any provider below 60% acceptance has an owner and a cause recorded.',
          blockIf:
            'If acceptance is not measured per provider, step 1 routing is a guess, and step 2 effective cost is uncomputable because the denominator is missing. A provider rejecting a large share of generations is the most expensive per-image price on the table, since every rejection is billed and delivers nothing — and until it is separated out, the cheap provider always looks like the good one.',
        },
        {
          step: 4,
          label: 'Solve subscription break-even on accepted volume and cancel the tiers below it',
          gate:
            'For every subscription tier you hold, the break-even volume is written down as a count of accepted images per month, the fee for the tier is below the per-image alternative at that volume, and no tier is still active if your last 2 months of accepted volume sit below its line.',
          blockIf:
            'A subscription kept alive below its break-even is a fixed monthly cost that does not shrink when the program does, and it is usually invisible because the per-use-case view looks healthy: each tier pays for itself against per-image pricing for its own use case while their sum is what the company actually pays. Leaving them in place also distorts step 6, where a budget cap written against generation spend will keep funding waste that the cap cannot see.',
        },
        {
          step: 5,
          label: 'Run the What-If branches on volume, provider and batch size',
          gate:
            'At least 4 What-If branches are modelled — double volume for subscription headroom, cut volume for subscription waste, switch provider for the cheapest alternative, and change batch size for per-call overhead — and each branch reports both spend per accepted image and the acceptance rate it assumes.',
          blockIf:
            'If a branch reports only spend, it is optimising the number that got you into trouble in the first place: a provider switch that lowers spend while raising rejections raises cost per accepted image. Reporting the acceptance rate alongside is what stops the analysis from recommending a branch that is cheaper only because it produces more unusable output, and it is the only way to see the volume threshold at which a subscription flips from saving to wasting.',
        },
        {
          step: 6,
          label: 'Set budget caps per use case and per provider with a 20% alert',
          gate:
            'Every use case has a monthly spend cap expressed per accepted image and per provider has a monthly total cap, the alert fires at 20% over budget, and at least 1 full billing cycle has passed with actual spend inside those caps.',
          blockIf:
            'A cap written against generation spend rather than accepted images rewards waste: the team stays under budget by generating less and keeping more of it, and the business quietly runs out of assets for the campaign it budgeted for. And a cap with no alert only fires after the month closes, which is too late to act on. If a cycle has not yet closed inside the caps, the caps are untested assumptions, and the subscription commitments in step 4 are already locked in against an untested volume.',
        },
      ],
    },
    zh: {
      intro:
        '在发票上找不到的省，不算省，所以这几项检查就是为拦住这件事而存在的。第一件要定的是每种用途分别路由到哪个供应商，因为它决定了「每张被采纳的图」那个数字所除的量结构，而它又决定订阅交叉点落在哪里。接着是供应商匹配，这既是成本决定也是质量决定：带文字的画面、品牌头图、精确的产品图和批量缩略图要求不同，把缩略图丢进高端模型既是成本错误，也会产出更差的资产。然后是拒绝率、重试次数和丢弃量——这些必须数出来，不能靠估，因为它们就是定价页上的单价与你实际付的钱之间的差距。最后是按用途而不是按供应商设的预算上限与告警，因为这两者很少一致。检查里引用的每一个费率都来自实时价格表（更新于 {{liveDate}}），其中订阅交叉点最容易漂：供应商一改档位，这个阈值就挪了，而单张价一个都没变。',
      items: [
        {
          step: 1,
          label: '按使用场景清点图像量，写清分辨率档与质量门槛',
          gate:
            '管线里的每个使用场景——博客头图、社交帖、广告创意、产品图、UI 模型图——都有每月张数、写明的分辨率档和一行质量门槛，且各场景张数加起来等于上个月团队实际生成的图像总数，与生成日志的偏差在 5% 以内。',
          blockIf:
            '不按场景拆开就无从路由，因为路由既需要目的地也需要需求，而公司级的平均数两样都不提供。它也让步骤 2 没有可辩护的分母：混合单图成本恰好会盖住路由表本该修掉的高成本场景，于是步骤 6 的预算把一份没人选过的账单锁死。如果张数与生成日志对不平，这份清点就是意见而不是测量。',
        },
        {
          step: 2,
          label: '给每个场景指定仍能满足质量门槛的最便宜供应商与档位',
          gate:
            '每个场景都有写明的供应商与模式，该供应商的单张价取自实时价格表（例如文字密集用 {{liveImagePerImageTrim:ideogram-3}}、批量用 {{liveImagePerImageTrim:stable-diffusion-4}}），且没有任何场景还靠默认供应商兜着。',
          blockIf:
            '把场景留在默认供应商上，是这张表上最大的一处浪费，而且看不见，因为那张发票看起来完全合理：一个团队可以把大部分预算花在批量档本来就能以零头成本产出的图上。它也会毒化步骤 4——订阅盈亏平衡是在真实跑起来的流量结构上算的，而你从没路由过的结构，永远没法和按张替代方案做诚实的比较。',
        },
        {
          step: 3,
          label: '按供应商与使用场景分别量采纳、拒绝与重试',
          gate:
            '对每个供应商与使用场景，记录同一个月的被采纳图数、策略拒绝数与重试数；批量档采纳率高于 85%、高端档高于 70%，任何采纳率低于 60% 的供应商都有负责人与成因记录。',
          blockIf:
            '不按供应商量采纳，步骤 1 的路由就还是猜，步骤 2 的有效成本也算不出来——因为分母根本不存在。拒绝掉很大比例生成的那个供应商才是这张表上最贵的单张价，每一次拒绝都照付钱、什么也不产出；在它被单独拆出来之前，便宜的供应商永远看起来是好的那个。',
        },
        {
          step: 4,
          label: '按采纳量解出订阅盈亏平衡，退掉跌破线的档位',
          gate:
            '每个持有的订阅档都写下了以「每月被采纳图数」计的盈亏平衡点，该档位的费用在这个量上低于按张替代成本，并且最近 2 个月的采纳量若都跌在盈亏平衡线以下、该档位仍处于启用状态的项目数为 0。',
          blockIf:
            '低于盈亏平衡还留着的订阅，是一笔不会随项目收缩而缩小的固定月费，而且它通常是隐形的：逐场景看每个档位对着自己的场景都比按张计费便宜，而公司实际付的是它们的总和。把它们留着还会扭曲步骤 6——按生成支出写的预算上限会继续供养一份上限看不见的浪费。',
        },
        {
          step: 5,
          label: '对月量、供应商与批大小跑 What-If 分支',
          gate:
            '至少跑了 4 个 What-If 分支——翻倍月量测订阅余量、砍月量测订阅浪费、切供应商测最便宜替代、改批大小测每次调用开销——且每个分支同时报出「每张被采纳图的支出」与它所假设的采纳率。',
          blockIf:
            '只报支出的分支，就是在优化把你走进今天这个局面的那个数字：一次降价的供应商切换如果同时抬高了拒绝率，每张被采纳图的成本是上升的。把采纳率一起报出来，才拦得住那种「只是因为产出更多没法用的东西才显得更便宜」的建议；它也是唯一能看出订阅从省钱翻成浪费的那个量阈值。',
        },
        {
          step: 6,
          label: '按使用场景与供应商设预算上限，并配 20% 告警',
          gate:
            '每个使用场景有以「每张被采纳图」计的月度支出上限、每个供应商有月度总额上限，超预算 20% 触发告警，并且至少有 1 个完整账期在上限之内实际跑完过。',
          blockIf:
            '按生成支出而不是按采纳图写的上限会奖励浪费：团队靠少生成多留下把预算守住，而业务悄悄耗尽了它本来为活动准备的素材量。没有告警的上限要到月底才响，那时已经来不及动了。如果还没有一个账期在上限内跑完，这些上限就是未经检验的假设，而步骤 4 里的订阅承诺已经按这个未检验的量锁死了。',
        },
      ],
    },
  },
};
