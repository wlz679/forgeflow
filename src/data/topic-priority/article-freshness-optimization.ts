// P166 —— K 类（Knowledge / 知识库）主题「article-freshness-optimization」的新形态内容。
//
// ⭐ 这一层写的是什么（与既有散文的分工）
// ----------------------------------------------
// · howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
// · howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
// · 本文件 fixPriority = 六个指标同时不达标时，先修哪个 → 它顺带带动谁 → 什么条件下它会把另一个指标修坏
// · 本文件 readinessChecklist = 每一步的达标线（今天就能核对的数量线 + 不达标具体卡在哪）
//
// 口径纪律（本主题不是 B 类，讲的是你自己库里的运营比率，不讲市场价）：
//   · 每个比率都写明分子、分母与窗口
//   · 新鲜率 = 窗口内更新过的文章数 ÷ 文章总数；12 个月率与 6 个月率必须成对出现
//   · 层（P0/P1/P2/P3）的划分规则与审查节奏沿用既有指南，优先级表只管「先动哪一层」
//   · 全文不出现任何手写单价（本主题的比率不是市场价，不会随外部定价漂移）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A stale knowledge base has two separate diseases, and they need opposite cures. One is a prioritisation failure: hundreds of articles are out of date and nobody can say which ones are costing you. The other is a capacity failure: everyone agrees which articles are wrong, and the rewrites never happen. The rows below separate them. Tier P0 leads, because it is a small set of articles whose errors carry legal, pricing and billing exposure beyond a support ticket, and it is the cheapest per article to correct while the context is still fresh. P1 follows, because that is where traffic and decay actually intersect. The decay-score queue sits next, since it is the only mechanism that catches articles the calendar will never reach. Automated triggers come after that, because they keep the queue sustainable and they also amplify whatever priority rule you configured. Editor capacity closes the list, because whether the other four rows are a plan or a habit depends on it. Each rate is a share of your own article count; the ratios worth tracking are internal ones — articles per reviewer, reviews closed per month, and the gap between the 12-month and 6-month freshness rates, which widens long before the headline rate looks alarming.',
      rows: [
        {
          priority: 1,
          metric: 'P0 review currency — P0 articles re-confirmed inside their 30-day cadence ÷ total P0 articles',
          fixFirst:
            'Start with the P0 layer because it is the smallest population with the largest consequence per article, and because it is the only layer where being wrong costs you something outside support. P0 is defined by tag: compliance, security, pricing, and billing or refund content. A stale P0 article does not merely produce a ticket; on a pricing page it produces a chargeback, and on a compliance page it produces a legal question you cannot answer with a link. It is also cheap in absolute terms, because P0 is typically under 10 percent of a mid-market library, so a full pass is roughly one week of one person rather than a quarter of the team. Do the re-confirmation against the live product and the current pricing, not against a checklist. These articles go stale because they were written when a policy was different, and a reviewer who confirms that the article still exists will happily confirm the wrong number.',
          alsoMoves:
            'Fixing P0 moves the 12-month rate by less than a percentage point or two, because P0 is a sliver of the library, and that is exactly why it is a trap to judge P0 work on the headline rate. The number it moves fastest is the 6-month rate, since anything re-confirmed inside 30 days is also inside 6 months. It also shortens the decay-score queue, because criticality weight multiplies the decay score for P0 articles, so a clean P0 layer removes several items from the top decile without anyone reviewing them twice. And it changes the capacity model: a library that is genuinely P0-heavy needs about 1.5 times the reviewer density, so the P0 pass has to be re-costed before you promise the quarterly target.',
          backfire:
            'P0 work backfires when the 30-day cadence becomes a rubber stamp. If the reviewer confirms the article exists rather than re-verifying the facts, the P0 currency rate reaches 100 percent while the actual defect — a refund window that changed, a compliance date that moved — survives in the text, and your compliance exposure becomes invisible because the dashboard says the layer is clean. The second failure is a saturation sweep: pulling the same two people onto P0 for two weeks pushes the P1 traffic articles out of their 90-day cadence, so the 6-month rate on the articles customers actually read falls while the P0 numbers improve. Keep the P0 pass small, keep the verification in writing, and do not let it run longer than a week.',
        },
        {
          priority: 2,
          metric: 'P1 review currency — top-20%-traffic articles reviewed inside their 90-day cadence ÷ total P1 articles',
          fixFirst:
            'Fix P1 second because P1 is where staleness turns into cost: it is the top 20 percent of articles by views, so a quarter of neglect there is felt by nearly every customer, and P1 articles are the ones that carry reopen spikes once they drift out of date. It is also the largest layer where your editorial hour still returns a result, because refreshing P1 is not work you do for a metric, it is work that removes tickets you already have the data for. The operational question is coverage against the cadence, not freshness: you want 90 percent of P1 articles inside their window, and when one misses you want it identified by the release-note trigger rather than by the quarterly audit, because the trigger fires in days and the audit fires in weeks. Do not let a P1 refresh become a rewrite of the article structure, because a rewrite that changes the article identity resets its traffic and leaves you with a lower-traffic article sitting in a higher tier.',
          alsoMoves:
            'P1 currency moves the 12-month rate more than any other single layer, because P1 is 20 percent of articles but a much larger share of monthly views, and the reviewers you spend on it are the ones with the shortest cycle. It also feeds the deflection quality metric you already track, since P1 staleness is the most common upstream cause of a reopen-rate climb, so a clean P1 layer is what lets you keep deflecting tickets instead of taking them back. And it is the layer where the traffic-drop trigger becomes genuinely useful, because a P1 article losing more than 40 percent of its views quarter over quarter is usually a product change that nobody reflected in the article.',
          backfire:
            'P1 work backfires when the queue is ordered by views instead of by decay. The popular but stable article gets refreshed while the fast-decaying, moderately trafficked one does not, and you spend a quarter of reviewer time on pages whose content never really changed. The second version is refreshing the content but leaving the metadata and the ticket-linking behind, so the article still fails to match the way customers phrase the question and the coverage rate keeps drifting down even as freshness climbs. And refreshing P1 in one concentrated sweep creates a cliff later: the 90-day window for the whole layer expires in the same quarter, so the following quarter your currency rate collapses for a reason that has nothing to do with the content.',
        },
        {
          priority: 3,
          metric: 'Top-decile decay score review coverage — top-decile decay-score articles reviewed in the last 30 days ÷ total top-decile articles',
          fixFirst:
            'Fix the decay-score queue third, because it is the only mechanism in the programme that catches the articles the calendar will never schedule. The tier cadence assumes that content in a tier ages at the same rate, which is wrong for exactly the articles that hurt most: a pricing page that quietly stops matching how customers ask, or an integration guide for a partner whose API changed. Decay score mixes age with traffic weight and criticality weight, so the top decile is the small set where freshness loss costs the most, and reviewing it monthly catches the articles that would otherwise sit in a P2 or P3 bucket until their 180-day or 365-day date arrives. Treat this as the optimisation layer on top of the cadence layer, never a replacement for it: the cadence covers the library, the decay queue covers concentrated risk.',
          alsoMoves:
            'The decay queue moves the 6-month rate directly, because a monthly review of the top decile is by definition a review inside 6 months, and it shrinks the manual audit workload, since the quarterly sweep can then be restricted to the tiers rather than the whole library. It also reorders the editorial queue in a way that protects P0 and P1: those two layers sit at the top of the decay score by construction, so once you schedule by decay score you stop double-reviewing them and start covering the neglected traffic that happened to sit in a low tier.',
          backfire:
            'Decay-score scheduling backfires when the score is treated as an objective ranking instead of a triage hint. Traffic weight is a logarithm of monthly views, so an old article with nine views a month can outrank a heavily read one that is only moderately stale, and reviewers end up spending a week on pages nobody opens while the articles with real traffic wait. The other failure is reviewing more of the top decile without adding reviewer hours: the extra reviews come out of the P2 and P3 cadence, so the 12-month rate stalls and the top-decile coverage looks fine while nothing actually improved. When the top-decile coverage number is high and the freshness rate is not moving, the queue is long and the capacity is short.',
        },
        {
          priority: 4,
          metric: 'Automated trigger coverage — of the 5 review triggers, how many are wired end to end and firing owner-assigned tasks',
          fixFirst:
            'Wire the triggers fourth, after the cadence exists and after the decay queue has told you what is genuinely worth reviewing, because triggers are a delivery mechanism and they faithfully deliver whatever priority rule you gave them. Start with the two that require no judgement: the age trigger that fires when an article passes its tier cadence, and the product-release trigger that fires when release notes mention a related feature. Both are cheap and both remove the most manual work. Add the escalation trigger once ticket escalation counts are reliable, and treat the helpfulness and traffic-drop triggers as the last two, because they need a baseline to compare against and they will produce false positives until the library has a season of data behind it. Every trigger must create a task with a named owner, not a row in a spreadsheet.',
          alsoMoves:
            'Trigger coverage is what makes the programme self-sustaining, and it is the single biggest reduction in manual audit work available here: a library where all five triggers fire on their own needs far less of the quarterly sweep, because the detection is no longer a human memory task. It also gives you the leading indicator, because the age and release triggers fire before a customer asks rather than after, so you can see the 12-month rate moving before the reopen rate does. And it changes what your reviewer capacity buys, because automated detection moves the job from finding to deciding, which is the part that actually needs a human.',
          backfire:
            'Triggers backfire when they are wired on a library whose tiering is out of date. The age trigger alone can then generate more review tasks in a quarter than the team can close, the tasks age out unanswered, and the trigger coverage metric reads 100 percent while the 12-month rate never moves. The false-positive version comes from the traffic-drop trigger: an article that was merged into a new hub page loses more than 40 percent of its views without becoming wrong, and the trigger sends it to a reviewer as if it were a trust problem. Wire one trigger, watch the task volume for a month, then wire the next.',
        },
        {
          priority: 5,
          metric: 'Reviewer capacity — articles per editorial FTE, adjusted for the P0 share of the library',
          fixFirst:
            'Take the capacity number last in the repair order but first in the business case, because it decides whether the other four fixes are a programme or a quarter of good intentions. The steady-state ratio is one FTE per 500 to 1,000 articles, and a P0-heavy library in health, fintech or legal needs roughly 1.5 times that density because P0 articles carry a 30-day cadence rather than a 180-day one. Multiply that ratio by your tier mix before you promise any target: the raw article count is a misleading denominator, because half of a typical mid-market library sits in P3 where the cadence is a full year and the real work is a small fraction of the reviews. Then audit the cadence itself. If the 12-month rate is climbing while the 6-month rate is flat, you have a throughput problem rather than a prioritisation problem, and no amount of re-ordering the queue will fix it.',
          alsoMoves:
            'Capacity sets the achievable quarterly target, and the target is therefore a function of this row: a 5-point gain per quarter on the 12-month rate is credible at one FTE per 1,000 articles and not credible at one FTE per 2,000, so writing the target before writing the capacity number is how programmes end up in the red. Capacity also decides how many of the five triggers you can afford to wire, because every trigger converts into review hours that a reviewer has to spend, and it sets the size of the monthly decay-decile review you can actually sustain.',
          backfire:
            'Capacity backfires when you hire to the freshness target without changing the tier mix. A bigger team working the same queue reviews the same 2,000-plus P3 evergreen articles that almost nobody opens, the rate goes up because volume went up, and the cost per article goes up faster than the rate did, while the P0 and P1 defects that actually matter are still sitting there. The other failure is modelling capacity from total article count: it assumes every article needs the same attention, overstates the load by a wide margin, and produces a headcount that looks conservative on paper and then gets spent on articles the guide itself says nobody reads.',
        },
      ],
    },
    zh: {
      intro:
        '知识库变旧有两种完全不同的病，而它们的药方正好相反。一种是排序失败：几百篇文章已经过时，却没人说得清是哪几篇在坑你；另一种是产能失败：大家都知道哪几篇是错的，改写却始终排不上。下面的表把这两件事拆开。P0 打头，因为它条目最少、每篇改起来最便宜，而且这一层的错误会带上定价、计费、合规方面的敞口，远超一张工单的代价。P1 紧随其后，因为流量与陈旧真正相遇的地方就在这里。接着是衰减评分队列，整个表里只有它能把日历永远排不到的文章捞回来。自动化触发器排在后面：它让队列可持续，同时也会把一个配错了的优先级规则成倍放大。编辑产能放在最后收尾，因为前面四行到底是一个计划还是一个习惯，取决于它。表里的比率是你库里文章总数的份额；真正值得盯的是内部比率——每位审核人对应多少篇文章、每月关掉多少次审查，以及 12 个月率与 6 个月率之间那道正在变宽的差，那道差比头条新鲜度率更早报警。',
      rows: [
        {
          priority: 1,
          metric: 'P0 复核及时率 —— 在 30 天节奏内重新确认过的 P0 文章数 ÷ P0 文章总数',
          fixFirst:
            '先做 P0 层，因为它人数最少、单篇出错的代价最大，也是唯一一层「写错了」的代价会溢出支持工单之外。P0 是按标签划的：合规、安全、定价、计费与退款。一篇过期的 P0 文章不只产生一张工单：在定价页上它产生一次拒付，在合规页上它产生一个你没法用链接回答的法律问题。而且它绝对量上很便宜：P0 通常不到中型库文章的 10%，全过一遍是一个人一周的事，而不是全队一个季度。复核要对着线上产品和当前价目做，不是对着一张清单打勾——这类文章过期的根因通常就是写它的时候政策还不同，而一个只确认「文章还在」的复核人，会把错的数字原样确认一遍。',
          alsoMoves:
            '修 P0 会让 12 个月率只动一两个点，因为 P0 只是库的一小片，这正是「拿头条率评价 P0 的工作」会掉进去的坑。它动得最快的是 6 个月率，因为 30 天内重新确认过的东西必然也在 6 个月以内。它还会缩短衰减评分队列——关键度权重会把 P0 文章乘进衰减分数，所以清干净的 P0 层会让前 10% 里少掉好几篇，不需要谁审两遍。它也改变产能模型：一个真的 P0 偏重的库需要大约 1.5 倍的审核密度，所以在承诺季度目标之前，P0 这一轮的成本必须重算一遍。',
          backfire:
            'P0 的活会因为 30 天节奏变成橡皮章而翻车。如果审核人只确认文章还在、而不是重新核实事实，P0 及时率会到 100%，而真正的缺陷——退款窗口变了、合规日期挪了——还留在正文里，你的合规敞口就此隐形，因为仪表盘说这一层是干净的。第二个失败是搞饱和式扫库：同样两个人连着两周扑 P0，P1 的流量文章就被挤出 90 天节奏，客户真正会读的那批文章 6 个月率反而掉了，而 P0 的数字在变好。P0 这一轮要小、要快、要留下核实记录，别让它跑满一周以上。',
        },
        {
          priority: 2,
          metric: 'P1 复核及时率 —— 在 90 天节奏内审过的流量前 20% 文章数 ÷ P1 文章总数',
          fixFirst:
            'P1 排第二，因为陈旧在 P1 上会直接变成成本：它是浏览量前 20% 的文章，一整个季度不管它几乎每个客户都感觉得到，而 P1 文章一旦超出节奏就会带来回弹飙升。它也是编辑工时还能有回报的最大一层：刷新 P1 不是你为了指标干的活，是你能拿现成数据把已经在发生的工单拿掉。运营上要盯的是「按节奏的覆盖率」而不是新鲜度本身：目标是 90% 的 P1 文章在自己的窗口内，而 P1 漏窗时，希望是发布说明触发器发现的，不是季度审计发现的——触发器几天就响，审计要几周。也不要把 P1 刷新做成结构重写：一次改了文章身份的重写会重置它的流量，最后变成一篇流量更低却还在高层的文章。',
          alsoMoves:
            'P1 及时率比任何单独一层都更能推动 12 个月率，因为 P1 只占 20% 的篇数却占了高得多的月浏览量，而花在它上面的审核人也是周转最快的那个。它还喂给你已经在量的拦截质量：高流量文章的陈旧是回弹率爬升最常见的上游原因，所以干净的 P1 层是让你继续把工单拦下来、而不是被弹回人工的那件事。它也是流量下滑触发器真正有用的那一层——P1 文章的浏览量季度环比掉 40% 以上，通常就是产品改了而文章没跟上。',
          backfire:
            'P1 的活会因为队列按浏览量排序而不是按衰减排序而翻车。热但稳定的文章被刷新了，而衰减快、流量中等的那篇没有，季度审核时间花在内容其实没怎么变的页面上。另一个版本是内容刷新了、元数据和工单关联没刷，于是文章照样匹配不上客户的问法，覆盖率继续往下漂，而新鲜度在涨。还有，集中式扫一遍 P1 会造出后面的悬崖：整层的 90 天窗口在同一个季度到期，下个季度你的及时率就崩了，而原因和内容毫无关系。',
        },
        {
          priority: 3,
          metric: '前 10% 衰减评分月度审查覆盖率 —— 最近 30 天审过的前 10% 衰减评分文章数 ÷ 前 10% 文章总数',
          fixFirst:
            '衰减评分队列排第三，因为它是整个项目里唯一能抓住日历永远排不到的文章的机制。分层节奏假设同一层的文章以同样的速度变旧，而对那些最伤人的文章来说这个假设恰好是错的：一篇悄悄不再匹配客户问法的定价页，或者某家把 API 改了的合作方的集成指南。衰减分数把年龄、流量权重和关键度权重混在一起，前 10% 就是「新旧损失代价最大」的那一小撮，每月审一次就能抓到那些本来会被塞进 P2 或 P3、一直躺到 180 天或 365 天到期才动的文章。把它当成节奏层之上的优化层，不是替代：节奏层覆盖全库，衰减队列覆盖集中风险。',
          alsoMoves:
            '衰减队列直接推动 6 个月率，因为前 10% 的月度审查按定义就在 6 个月以内，它也把手工审计的工作量降下来——季度审计可以缩到只扫分层，而不用再扫全库。它还会以一种保护 P0 和 P1 的方式重排编辑队列：这两层按构造就在衰减分数顶部，所以当你开始按衰减分数排期，就不会重复审它们，转而覆盖那些被塞在低层、却真有人读的文章。',
          backfire:
            '衰减评分排期一旦被当成客观排名而不是分诊提示就会翻车。流量权重是月浏览量的对数，所以一篇月访问 9 次的老文章可能排到一篇只是有点旧的高阅读文章前面，审核人于是花一周在没人看的页面上，真正有流量的文章在等。另一个失败是不加审核人力就扩大前 10% 的审查量：多出来的审查是从 P2 和 P3 的节奏里挪来的，于是 12 个月率走平，而前 10% 覆盖率看起来很漂亮，实际上什么都没改善。前 10% 覆盖率很高而新鲜度率不动，就是队列太长、人手太短。',
        },
        {
          priority: 4,
          metric: '自动化触发器覆盖率 —— 5 个审查触发器里，有几个已经端到端接上并能派发带负责人的任务',
          fixFirst:
            '触发器排第四，前提是节奏已经建好、衰减队列也已经告诉你什么才真的值得审——因为触发器只是一个投递机制，它会忠实地把你给的优先级规则照单执行。先接两个不需要判断的：超过本层节奏就触发的年龄触发器，以及发布说明提到相关特性就触发的发布触发器。两者都便宜，去掉的机械工作也最多。等工单升级数可靠了再接升级触发器；有用性触发器和流量下滑触发器放最后两位，它们需要基线做对比，库没有一段时间的数据之前会一直误报。每个触发器都必须生成一条带具名负责人的任务，而不是表格里的一行。',
          alsoMoves:
            '触发器覆盖率是整个项目能自我维持的原因，也是这里能拿到的最大一项手工审计工作量削减：五个触发器都自己响的库，季度横扫需要的投入小得多，因为「找到待审文章」不再是靠人记的事。它还给你指南里要的那个领先指标——年龄和发布这两个触发器是在客户开口之前响，不是之后，所以你能在回弹率动之前先看到 12 个月率在动。它也改变了审核人力的产出结构，因为自动化把工作从「找」变成「判断」，而判断才真正需要人。',
          backfire:
            '触发器在分层已经过时的时候接上去会翻车。光是年龄触发器就可能在一个季度里生成比团队能关掉的还多的审查任务，任务放着没人结，于是触发器覆盖率读出来是 100%，而 12 个月率一动不动。误报那一版来自流量下滑触发器：被并进新聚合页的文章浏览量掉了 40% 以上却并没有写错，触发器却把它当成信任问题送给审核人。一次接一个触发器，观察一个月的任务量，再接下一个。',
        },
        {
          priority: 5,
          metric: '审核产能 —— 每位编辑全职人力对应的文章数，并按 P0 占比调整',
          fixFirst:
            '产能这个数字在修复顺序上排最后，但在商业论证上排第一，因为它决定前面四项是一次项目还是几个季度的良好意愿。稳态比是每位 FTE 对应 500-1,000 篇文章，而 P0 偏重的库——医疗、金融、法律——需要大约 1.5 倍密度，因为 P0 走的是 30 天节奏而不是 180 天。承诺任何目标之前，先把这个比率乘上你的分层构成：原始文章数是个误导性的分母，因为典型中型库有一半落在 P3，节奏是整整一年，真实工作量只是审查量里的一小截。然后审计节奏本身：12 个月率在涨而 6 个月率走平，说明这是吞吐问题，不是优先级问题，再怎么重排队列也修不好。',
          alsoMoves:
            '产能决定可达到的季度目标，而目标本身也是这一行的函数：12 个月率每季度 +5 个点，在每位 FTE 对应 1,000 篇时可信，在 2,000 篇时不可信——先写目标再写产能，就是项目做到一半变赤字的路径。产能也决定你能负担接几个触发器，因为每个触发器最终都变成审核工时，以及每月前 10% 衰减审查你能真正撑住多大的量。',
          backfire:
            '产能会因为「只按新鲜度目标加人、不动分层构成」而翻车。更大的团队做同一份队列，把同样那 2,000 多篇几乎没人看的 P3 常青文章审一遍，率之所以涨是因为量涨了，而每篇文章的成本涨得比率更快，真正要紧的 P0 和 P1 缺陷还原地不动。另一个失败是拿文章总数做产能模型：它假设每篇文章需要同样的关注，大幅高估了工作量，算出来的人头在纸面上偏保守，然后被花在指南自己都说没人读的篇目上。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Stale content does not announce itself, so these seven checks are written to catch a library that looks maintained from a distance. A quarterly pass of green marks proves nothing if the tiering was built once and never revisited, because a P0 article nobody re-tagged after a product change keeps its old priority while its error compounds. The checks read in the order the maintenance actually happens: whether the tier is still right, whether the cadence calendar is running, whether the decay-score queue is being cleared, whether the automated triggers fire on real events, and whether the editor capacity can absorb what the first four produce. The numbers are deliberately dull — counts of articles per reviewer, reviews closed per month, the gap between the 12-month and 6-month freshness rates — because a cadence that cannot be measured on a spreadsheet will not survive a busy quarter. Expect the freshness check to fail in months where nothing changed in the product; that is exactly why it is re-read every quarter.',
      items: [
        {
          step: 1,
          label: 'Pull the article inventory and read the freshness band',
          gate: 'Total article count, updated-in-12-months count and updated-in-6-months count all pulled from the KB admin view, with the 12-month rate, the 6-month rate, the stale count and the gap to the internal target computed, and the four-band reading written down (80% / 55-80% / 40-55% / below 40%).',
          blockIf: 'If the internal target percentage is not written next to the measured rate, the band tells you whether you are healthy but not whether you are done, and the programme has no finish line. Without the 6-month count the diagnostic in the last step is impossible, because a rising 12-month rate and a flat 6-month rate are the two signals that separate a prioritisation problem from a throughput problem.',
        },
        {
          step: 2,
          label: 'Classify every article into a P0-P3 tier',
          gate: 'Every article carries a tier under a written rule — P0 by tag (compliance, security, pricing, billing or refund), P1 = top 20% by monthly views, P2 = the next 30%, P3 = the remaining 50% — and the four counts add up to the library total, with P0+P1 confirmed to be under 30% of the count.',
          blockIf: 'An unclassified article inherits the longest cadence by accident, which is how a pricing page ends up on a 365-day review. If the counts do not reconcile to the library total, the remaining articles are silently sitting in the default tier, and both the capacity model in the last step and the trigger rules in the fifth step are computed against a fiction.',
        },
        {
          step: 3,
          label: 'Set the per-tier review cadence and schedule it',
          gate: 'Cadence written per tier (P0 30 days, P1 90 days, P2 180 days, P3 365 days) and stored as a next-review date on 100% of articles, with the review queue driven by the calendar so that reviews are assigned rather than remembered.',
          blockIf: 'Without a stored next-review date, the cadence is a policy rather than a schedule, and the articles that need review are found by a quarterly audit instead, which is how you end up reviewing the same long tail every quarter while the 12-month rate stalls. If the queue is not calendar-driven, reviews happen when a reviewer remembers them, and the volume becomes whatever is left over after the incidents.',
        },
        {
          step: 4,
          label: 'Build the review dashboard and sort it by decay score',
          gate: 'The dashboard shows all six fields for every article — last reviewed date, tier, monthly traffic, decay score, helpfulness score, and linked ticket escalation count — and the monthly target of reviewing the top 10% by decay score appears as a number on the dashboard rather than as a statement of intent.',
          blockIf: 'If decay score is not one of the sort keys, the queue is ordered by views or by age and the top-decile work is invisible, so the one mechanism that catches unplanned staleness quietly does not happen. Without the monthly number on the dashboard, top-decile coverage cannot be checked at all and nobody can tell whether the queue is being worked or ignored.',
        },
        {
          step: 5,
          label: 'Wire the automated review triggers',
          gate: 'At least 3 of the 5 triggers wired end to end, each one creating a task with a named owner, the remaining 2 recorded as not yet wired with the reason stated, and at least 90% of the tasks created in the last month closed inside their target window.',
          blockIf: 'Wiring all five triggers before the tiering is trustworthy floods the queue with tasks nobody can close, and the tasks age out unanswered, so the trigger coverage looks complete while the 12-month rate does not move. If a trigger creates a spreadsheet row instead of an owned task, it has moved the work rather than removed it, and the manual audit stays exactly as large.',
        },
        {
          step: 6,
          label: 'Set the quarterly freshness targets and pair them with reopen rate',
          gate: 'Four targets written with baseline and target date — 12-month rate +5 points per quarter until at least 80%, 6-month rate at least 40% within 4 quarters, top-decile decay reviewed every month — plus the deflection quality reopen rate tracked alongside as the paired quality signal.',
          blockIf: 'Targets written without a baseline cannot be checked at the next quarter, so the programme resets every quarter and no trend survives. Leaving out the reopen rate turns freshness into an end in itself: the rate can be met by reviewing articles nobody was ever asking about, while the reopen rate that customers actually feel climbs.',
        },
        {
          step: 7,
          label: 'Budget reviewer capacity and diagnose the bottleneck',
          gate: 'Capacity stated as articles per editorial FTE against the 500-1,000 band, with the 1.5x multiplier applied for a P0-heavy library, and the diagnostic rule written down: a 12-month rate that rises while the 6-month rate stays flat means review throughput is the bottleneck, not prioritisation.',
          blockIf: 'Without the tier-mix adjustment the headcount is planned on total article count, which overstates the work and produces a team that is either oversized or permanently behind. Without the diagnostic rule the flat-6-month signal gets misread as a prioritisation failure, and you will reorder the queue repeatedly while the actual constraint is reviewer hours.',
        },
      ],
    },
    zh: {
      intro:
        '内容变旧不会自己报警，因此这七道检查是为了抓那些远看像在维护、其实已经停摆的库。一个季度全绿什么都证明不了：如果分层只建过一次、之后再没重排过，那么一篇因为产品改动而过时的 P0，会继续挂着旧优先级，而它的错误在继续累积。检查项按维护真实发生的顺序排列：分层还准不准、日历式审查有没有在跑、衰减评分队列有没有被清空、自动化触发器会不会在真实事件上触发、以及编辑产能到底吸收得了前面四项产出什么。数字都刻意选得很枯燥——每位审核人对应多少篇文章、每月关掉多少次审查、12 个月率与 6 个月率之间的差——因为一张没法在表格里量的节奏，经不起一个忙的季度。要预期的是：产品什么都没变的那几个月，新鲜度这关照样会红；这正是每个季度重读一次它的理由。',
      items: [
        {
          step: 1,
          label: '拉出文章清单，并读出 12 个月新鲜度所处档位',
          gate: '文章总数、12 个月内更新数、6 个月内更新数三项都从 KB 后台视图取到，12 个月率、6 个月率、陈旧数、与内部目标的差距全部算出，四档读数写下来（80% / 55-80% / 40-55% / 低于 40%）。',
          blockIf: '内部目标百分比不写在实测率旁边，档位只能告诉你健康不健康，告诉不了你做没做完，项目就没有终点线。没有 6 个月那一项，最后一步的诊断根本做不了——因为「12 个月率在涨、6 个月率走平」正是区分「优先级问题」和「吞吐问题」的那两个信号。',
        },
        {
          step: 2,
          label: '把每一篇文章分到 P0-P3 层，并让四个计数对得上总数',
          gate: '每一篇文章都按写下来的规则落层——P0 按标签（合规、安全、定价、计费或退款），P1 = 浏览量前 20%，P2 = 接下来的 30%，P3 = 其余 50%——四个计数加起来等于库总数，并且确认 P0+P1 少于篇数的 30%。',
          blockIf: '没分类的文章会不知不觉继承最长的节奏，这就是定价页最后落到 365 天复审上的原因。四个计数对不上库总数，剩下的文章就默认躺在默认那一层，而最后一步的产能模型和第五步的触发规则，都是在拿一份虚构的构成算账。',
        },
        {
          step: 3,
          label: '定下分层审查节奏，并作为下次复审日期排进日历',
          gate: '每层的节奏写成明文（P0 30 天、P1 90 天、P2 180 天、P3 365 天），并作为「下次复审日期」存到 100% 的文章上；审查队列由日历驱动，任务是派出来的，不是靠人记得。',
          blockIf: '没有存下来的下次复审日期，节奏就只是一条政策而不是一张排期表，需要复审的文章只能靠季度审计去找——而这正是长尾每季度被重审一遍、12 个月率却卡住的原因。队列不由日历驱动时，复审的时机取决于审核人记不记得，量就变成了处理完突发之后剩下的部分。',
        },
        {
          step: 4,
          label: '搭好审查仪表盘，六个字段齐全并按衰减评分排序',
          gate: '仪表盘为每篇文章显示六个字段——上次复审日期、层、月浏览量、衰减评分、有用性评分、关联工单升级数——并且「每月审前 10% 衰减评分」这个目标是以数字出现在仪表盘上，而不是一句打算。',
          blockIf: '衰减分数不是排序键之一，队列就只会按浏览量或年龄排，前 10% 这块工作就看不见了，唯一能抓到计划外陈旧的机制悄悄就没发生。每月那个数字不上仪表盘，前 10% 覆盖率根本没法核对，也没人能分辨队列是在被处理还是在被忽略。',
        },
        {
          step: 5,
          label: '接上自动化审查触发器，并逐个确认任务有负责人',
          gate: '5 个触发器里至少 3 个端到端接上，每个都生成一条带具名负责人的任务；剩下 2 个写明「尚未接入」及原因；上个月生成的触发任务至少 90% 在目标时限内关闭。',
          blockIf: '分层还没可信就接满五个触发器，队列会被团队根本关不完的任务淹掉，任务放着过期不结——触发器覆盖率看着做完了，12 个月率一动不动。触发器如果只在表格里加一行而不是生成带负责人的任务，它只是把活搬了个地方，手工审计量一点没少。',
        },
        {
          step: 6,
          label: '定下季度新鲜度目标，并配上回弹率作为质量信号',
          gate: '四个目标都写了基线与目标日期——12 个月率每季度 +5 个点直到至少 80%、4 个季度内 6 个月率达到 40%、前 10% 衰减评分每月审完——并且把拦截质量的回弹率作为配套质量信号一起跟踪。',
          blockIf: '目标不写基线，下个季度就没法核对，项目每季重置，任何趋势都留不下来。不带回弹率，新鲜度就变成了目的本身：这个率可以靠审那些根本没人问的文章达成，而客户真正感觉得到的回弹率却在往上走。',
        },
        {
          step: 7,
          label: '做编辑产能预算，并写清吞吐瓶颈的诊断规则',
          gate: '产能写成「每位编辑全职人力对应多少篇文章」，对照 500-1,000 的区间并对 P0 偏重的库乘上 1.5 倍；诊断规则写下来：12 个月率上涨而 6 个月率走平，说明瓶颈是审查吞吐，不是优先级。',
          blockIf: '不做分层构成的调整，人头就是按文章总数规划的，工作量被大幅高估，队伍要么超配要么永远欠账。没有这条诊断规则，6 个月率走平这个信号会被误读成优先级失败，你会一遍遍重排队列，而真正的约束是审核工时。',
        },
      ],
    },
  },
};
