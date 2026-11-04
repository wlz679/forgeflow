// P166 —— P 类（Product Analytics）主题「funnel-conversion-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类 ⇒ 不写市场单价、不写 live token）：
//   · 每阶段计数单位统一为「去重用户」，不与会话数混用
//   · 所有比率与计数一律取最近 30 天窗口，并写明窗口长度
//   · 「最大流失步」按绝对流失人数排，不按百分比跌幅排；两者冲突时以绝对人数为准并写明
//   · 金额一律 USD、按月计，并标明是收入口径还是毛利口径
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'The biggest funnel leak is often the smallest step, which is why ranking by absolute user loss beats ranking by percentage drop-off. A step with a 60% drop on 200 people matters less than a 15% drop on 200,000, and for a SaaS product the signup-to-activation gap of 40% to 70% usually dwarfs everything upstream.',
      rows: [
        {
          priority: 1,
          metric: 'Instrumentation coverage — share of defined stages that emit their own countable event (stages with a distinct non-zero count ÷ stages defined)',
          fixFirst:
            'Start here because every other row in this table is arithmetic on stage counts. Pull each stage count for the trailing 30 days and check that the number comes from a named event you can point at in your tracking plan, not from a funnel report that infers one stage from the next. A stage has to be counted in unique users, not sessions: one person who opens a pricing page four times makes the session count larger than the signup count that came before it, and the leak you compute is then an artifact of the unit rather than a place where people leave. Also confirm the stages are nested, so that everybody who reaches stage four passed through stage three. Once each stage owns one event and one unit, the loss at each step becomes a subtraction you can defend in a review, and the gap between two percentages stops being a guess.',
          alsoMoves:
            'This row sets the denominator for every other row. The pass rate in row three is stage N plus one divided by stage N, and the biggest leak in row two is a subtraction of two counts, so one mis-instrumented stage corrupts both at once. It also decides whether the weekly experiment in the guide can be attributed: if two stages share one event, a change to the shared surface shows up in both rows and you cannot tell which step moved. And a clean 30-day window is what lets you compare this month against last month instead of re-deriving the funnel from scratch every time somebody asks for an answer.',
          backfire:
            'The failure mode here is changing the event definition while you are trying to fix the funnel. Renaming a stage event, changing its trigger condition, or moving a conversion from a client-side event to a server-side one restarts the count at zero, so the first 30 days of the new definition show a cliff that looks like a 90 percent leak and is really an artifact of when you started counting. The second failure is adding a stage mid-quarter to make the funnel more precise: every historical window is then short by one step, the old leak disappears from the comparison, and the biggest leak appears to move for structural reasons. Freeze the definitions for at least one full window before you act on any leak ranking, and write the definition date next to every number you quote.',
        },
        {
          priority: 2,
          metric: 'Biggest leak by absolute user loss — stage N entrants minus stage N plus one entrants, trailing 30-day window',
          fixFirst:
            'Rank the steps by how many users they lose, not by the percentage they drop. The guide makes this point for a reason: a 95 percent drop on a step that 200 people entered costs you 190 users, while a 40 percent drop on a step that 40,000 people entered costs you 16,000, and the second one is where a week of work pays for itself. Compute the loss for every step, write the count next to it, and only then convert the top step into money per month using your own average order value or your own value per conversion, so that the order reflects users you can win back at a price you can name. If two steps are within 20 percent of each other on absolute loss, treat them as tied and test both, because at that gap the measurement error is larger than the difference.',
          alsoMoves:
            'It tells you where the money actually is, which is what turns a stage count into a priority. The same ranking decides how many weeks the rest of the guide needs: the guide runs one experiment per week for four weeks on a single leak, so a product with two near-tied leaks needs eight weeks and one with a single dominant leak needs four. It also gives you the baseline you hold the experiment against, since row three tells you how much of the loss a single step change is expected to recover and how much of that recovery to believe.',
          backfire:
            'The absolute-loss ranking misleads in the opposite direction from the percentage ranking, and the two are not interchangeable. The biggest count sits at the widest stage, which is usually the top of a marketing funnel: ninety-five percent of a hundred thousand impressions is ninety-five thousand lost impressions, and no landing page change recovers impressions, because they were never qualified to begin with. Optimizing that row produces an impressive number and no customers. And on the revenue side, a recovery rate applied to the widest stage quietly assumes you can turn impressions into buyers, which is exactly the assumption the funnel value model refuses to make for you. Rank by loss, then check whether the step is a demand step or a product step before you spend a week on it.',
        },
        {
          priority:3,
          metric: 'Stage-to-stage pass rate at the chosen leak step (users entering stage N plus one ÷ users entering stage N, 30-day window)',
          fixFirst:
            'Now measure the chosen step as a rate, because a rate is the only number that stays comparable when your traffic moves week to week. This is the number your experiment in the guide moves, and the number you compare against the range for that stage. Record the rate together with the volume behind it, because a rate on a small denominator swings for reasons that have nothing to do with the page. The rate also tells you which lever to pull: a low rate at the awareness step is a targeting and creative problem, a low rate at the consideration step is a landing page and call-to-action problem, and a low rate at the activation step is an onboarding problem. Those three have almost nothing in common, so write the diagnosis down before you pick the experiment.',
          alsoMoves:
            'The pass rate is what converts the row two ranking into a weekly commitment, since the guide asks for one experiment per week against one step and this is the number that goes on the experiment card. It also links into the revenue model in the guide: three percentage points at the activation step and three percentage points at the checkout step are different numbers of users and different amounts of money, because the stages carry different volumes and different values. And the rate is what you re-read after four weeks to decide whether to stay on the step or move to the next one.',
          backfire:
            'A pass rate can be improved by narrowing the entrance rather than by improving the step, and the two look identical in the data. If you start qualifying traffic harder at the top of the funnel, the surviving users convert at a higher rate, the metric goes green, and the volume behind it falls far enough that total conversions end up lower than before you started. The same thing happens when you exclude users who failed a field validation: the failure moves upstream instead of disappearing. The other failure is reading a rate without its volume, which lets you declare victory on a step that has forty users in it. Display the rate next to the denominator every time, and judge the experiment on conversions rather than on the rate.',
        },
        {
          priority: 4,
          metric: 'Experiment read rate — share of shipped experiments that produced a readable result (experiments hitting a pre-declared threshold ÷ experiments shipped, per 30 days)',
          fixFirst:
            'Before you run another week of experiments, find out whether the last four weeks were readable at all. A funnel experiment needs enough traffic at the step to separate the change you expect from the noise you already live with, and a step that receives a few hundred visitors a week cannot show you a two-point move no matter how carefully you run it. Compute the read rate over your last three experiments: shipped, hit the threshold, or was inconclusive. If most were inconclusive, the bottleneck is not the page, it is the sample, and the fix is to widen the test to a bigger step, run it longer, or accept a directional metric instead of a decisive one. Write the threshold before the test, not after it.',
          alsoMoves:
            'A read rate tells you how long the queue in the guide really takes, because a guide that says four weeks per leak assumes the experiment can be read in four. It also tells you where to spend your own attention: if experiments on the checkout step read fine while experiments on the landing page never do, the landing page needs more traffic rather than more ideas. And a measured read rate keeps you from mistaking a lucky week for a win, which is what keeps the queue honest when you report results upward.',
          backfire:
            'Raising the read rate by shipping bigger changes is the obvious way to make it go up, and it is the most expensive way. A large redesign produces a visible move that you can read, but it changes several things at once, so when it works you cannot tell which part to keep, and when it fails you have burned four weeks of the queue. The other shortcut is declaring the threshold after the numbers arrive, which turns a read rate of 100 percent into a meaningless number. Keep the thresholds; if you need more power, change the sample or the duration rather than the size of the change.',
        },
        {
          priority: 5,
          metric: 'Post-conversion depth — converted accounts that return for a second session within 14 days ÷ converted accounts (30-day window)',
          fixFirst:
            'Look at this last, because it is only meaningful once you know how many accounts converted in the first place, and because it does not add anyone to the top of the funnel. For a SaaS product this is where a funnel gain either survives or quietly reverses: a signup that never turns into a second session is a conversion you bought, not a customer you made. Track the share of converted accounts that come back, and if it is low, the leak sits upstream of the page you were optimizing. The guide already points at the feature adoption calculator for this measurement, and it is the right instrument because it separates a user who touched the product once from a user who has a habit.',
          alsoMoves:
            'Depth is what makes the revenue model in the guide meaningful, because a conversion that never returns has a far smaller lifetime value than the model assumes, and the model will happily turn a leaky funnel into an attractive forecast. It also tells you whether the activation step is the real bottleneck: when depth is healthy and volume is not, the problem is reach at the top of the funnel rather than the product. And depth is the number that decides whether the next leak to attack is worth attacking at all.',
          backfire:
            'Optimizing depth directly turns into manufacturing engagement. Pushing notifications, daily summaries or mandatory prompts lifts the number of sessions per account without lifting the number of accounts that keep the product, so the ratio improves while the churn curve stays flat, which shows up two months later as a renewal problem nobody connects to the engagement push. The other version is counting sessions instead of returning accounts: a user who opens the app only to dismiss a push counts as active on both the depth metric and the headline ratio, so both look better while nothing changed. Keep the denominator as accounts that came back, not sessions.',
        },
      ],
    },
    zh: {
      intro:
        '漏斗最大的窟窿常常在体量最小的那一步，所以按绝对流失人数排序比按百分比流失率排序更有用。200 人里掉 60%，不如 20 万人里掉 15%；而在 SaaS 里，注册到激活之间那 40-70% 的断层通常盖过上游所有环节。埋点覆盖率决定你能不能看见这个窟窿——三分之一的阶段发不出可计数事件的漏斗，最糟的那一步恰好是隐形的。转化之后的深度也要量：14 天内回来开第二次会话的比例，才是这次转化有没有留下东西的证据。漏斗基准随季节和产品变动漂移，每月要重算一次。',
      rows: [
        {
          priority: 1,
          metric: '埋点覆盖率 —— 定义的阶段里各自发出独立可计数事件的比例（有独立非零计数的阶段数 ÷ 已定义阶段数）',
          fixFirst:
            '从这一行开始，因为表里其他每一行都是阶段计数上的算术。把最近 30 天每个阶段的计数拉出来，逐个确认这个数字来自一个你在埋点方案里能指名的事件，而不是某个漏斗报表从上一阶段推断出下一阶段。每个阶段必须用去重用户计数，不是会话：一个人开了四次定价页，会话数就会超过它前面的注册数，于是你算出的「流失」其实是单位的假象，而不是人真的离开的地方。还要确认阶段是嵌套的，也就是到达第四阶段的人一定经过第三阶段。等到每个阶段拥有一个事件、一种单位，每一步的损失就变成一次你能在评审里站得住脚的减法，两个百分比之间的差距也不再是猜的。',
          alsoMoves:
            '这一行决定了表里其他所有行的分母。第三行的通过率是第 N+1 阶段除以第 N 阶段，第二行的最大流失是两个计数相减，所以一个埋错的阶段会同时污染两者。它还决定指南里那个每周实验能不能归因：如果两个阶段共用一个事件，对共用表面的改动会同时出现在两行，你分不清是哪一步动了。而一个干净的 30 天窗口，才让你能拿这个月和上个月比，而不是每次有人问答案就从头把漏斗重推一遍。',
          backfire:
            '这一行的典型翻车，是在你想修漏斗的时候顺手改了事件定义。给阶段事件改名、改触发条件、或者把某个转化从前端事件挪到服务端事件，计数就从头开始，前 30 天的新定义会显示出一道看起来像 90% 的断崖，其实只是「你从哪天开始数的」。第二个翻车是季中加一个阶段让漏斗看起来更精确：所有历史窗口都少了一步，老的流失从对比里消失，最大流失步看上去「换了个地方」，其实是口径变了。至少冻结定义一个完整窗口再去动任何流失排序，并把定义日期写在每个数字旁边。',
        },
        {
          priority: 2,
          metric: '按绝对流失人数排的最大流失步 —— 第 N 阶段进入人数减去第 N+1 阶段进入人数，取最近 30 天窗口',
          fixFirst:
            '按每一步丢了多少人来排，不要按跌了百分之几来排。指南讲这一点是有道理的：200 人进入的一步跌 95%，损失 190 人；4 万人进入的一步跌 40%，损失 1.6 万人，而后者才是投一周实验能回本的地方。把每一步的损失都算出来、把人数写在旁边，然后再用你自己的客单价或你自己的每单转化价值，把候选的那一步折成每月金额，这样优先级排序反映的是「你能按你叫得出的价格找回的人」。如果两步的绝对损失相差不到 20%，就当作并列、两边都测，因为在这个差距上，测量误差比差距本身还大。',
          alsoMoves:
            '它告诉你钱到底在哪里，这才是把阶段计数变成优先级的关键。同一份排序还决定指南剩下的部分要花几周：指南是「一个流失步跑四周、每周一个实验」，所以有两个并列流失步的产品要八周，只有一个明显流失步的产品要四周。它还给了你对照实验的基线——第三行会告诉你一次单步改动预期能收回多少损失，以及其中有多少比例值得相信。',
          backfire:
            '绝对流失排序在百分比排序的相反方向上骗人，两者不能互换。最大的数字一定落在体量最宽的阶段，而那通常就是营销漏斗的顶端：十万次曝光的 95% 就是丢了九万五千次曝光，而改落地页救不回曝光，因为它们本来就从没被筛过。死磕这一行能做出一个漂亮的数字和零个客户。而且在金额一侧，把回收率套在最宽的阶段上，等于悄悄假设你能把曝光变成买家，而这恰恰是漏斗价值模型不会替你做的假设。先按损失排，再确认那一步是需求侧还是产品侧，然后才值得花一周。',
        },
        {
          priority: 3,
          metric: '选定流失步的阶段间通过率（进入第 N+1 阶段的人数 ÷ 进入第 N 阶段的人数，30 天窗口）',
          fixFirst:
            '然后把选定的那一步按比率来量，因为流量一周一变，只有比率还能横向比较。这个比率就是指南里那个实验要推动的数字，也是你拿它和该阶段基准区间对照的数字。记比率的同时必须记它背后的量，因为小分母上的比率会因为跟页面毫无关系的理由而摆动。这个比率还告诉你该拉哪根杆：认知阶段的低通过率是投放和素材问题，考虑阶段是落地页和 CTA 问题，激活阶段是入职问题——这三件事几乎没有共同之处，所以先写下诊断，再选实验。',
          alsoMoves:
            '通过率是把第二行的排序变成每周承诺的那座桥，因为指南要求每周对同一步跑一个实验，而实验卡上写的就是这个比率。它也接进指南里的营收模型：激活阶段提 3 个百分点和结账阶段提 3 个百分点，是不同的人数、不同的钱，因为各阶段的体量和价值都不同。而四周之后回头读的、决定「继续打这一步还是换下一步」的，也正是这个比率。',
          backfire:
            '通过率可以靠把入口收窄来变好看，而不是靠把这一步变好，而数据里这两种情况长得一模一样。如果你在漏斗顶端更用力地筛流量，留下的人的比率上升、指标变绿，而它背后的量掉得更狠，最后总转化比动手之前还低。把校验失败的字段直接排除掉是同一个坑：失败只是被挪到了上游，并没有消失。另一个坑是只看比率不看量，于是你可以在一个只有 40 个人的步骤上宣布胜利。每次都把比率和分母摆在一起看，实验要用转化数结账，不要用比率结账。',
        },
        {
          priority: 4,
          metric: '实验可读率 —— 跑过的实验里产生了可读结论的比例（达到事先声明阈值的实验数 ÷ 已上线实验数，每 30 天）',
          fixFirst:
            '在再跑一周实验之前，先弄清楚你过去四周到底有没有读出东西。漏斗实验需要那一步有足够流量，把你预期的变化和你本来就在承受的噪声分开；而一个每周只进来几百个访客的步骤，无论你跑得多认真，都读不出 2 个百分点的移动。把最近三次实验算一下可读率：上线了、达到了阈值、还是无法判定。如果大多数是无法判定，瓶颈就不在页面，而在样本——修法是把测试挪到一个体量更大的步骤、拉长周期，或者接受一个方向性指标而不是决定性指标。阈值要在实验之前写好，不是之后。',
          alsoMoves:
            '可读率告诉你指南里那条队列真实要排多久，因为一份说「每个流失步四周」的指南，前提是实验能在四周里被读出来。它也告诉你自己的注意力该放在哪：如果结账步骤的实验读得出、落地页的实验永远读不出，那落地页需要的是更多流量而不是更多点子。而一个量过的可读率，能防止你把走运的一周当成胜利，这正是你在向上汇报时队列不至于失真的原因。',
          backfire:
            '把可读率做上去最省事的办法是加大改动幅度，这也是最贵的办法。一次大改版会产生一个你读得出的明显移动，但它一次动了好几样东西，所以它成功时你不知道哪一部分值得留下，它失败时你已经烧掉了队列里的四周。另一个捷径是等数字出来再宣布阈值，那会把 100% 的可读率变成一个毫无意义的数字。守住阈值；需要更强的统计功效时，改样本或改时长，不要改改动幅度。',
        },
        {
          priority: 5,
          metric: '转化后深度 —— 转化账户中 14 天内回来开第二次会话的比例（回访账户数 ÷ 转化账户数，30 天窗口）',
          fixFirst:
            '这一行放最后，因为只有先知道你到底转化了多少账户，这一步才有意义；而且它不会给漏斗顶端加任何人。对 SaaS 产品来说，漏斗收益是活下来还是悄悄反转，就看这里：一个从来不会再开第二次会话的注册，是你买来的转化，不是你做出来的客户。跟踪转化账户里回来过的比例；如果这个比例低，说明漏点在你正在优化的那个页面的上游。指南本来就让你配合功能采用计算器来量这件事，它也确实是对的工具，因为它能把「只碰过一次」的用户和「已经形成习惯」的用户分开。',
          alsoMoves:
            '深度是让指南里那个营收模型有意义的前提，因为一个再也不回来的转化，其生命周期价值远低于模型的假设，而模型会欣然把一个漏水的漏斗变成一张好看的预测表。它也告诉你激活步是不是真正的瓶颈：深度健康而量不够时，问题在漏斗顶端的触达而不是产品本身。而深度这个数字，还决定下一个值得攻的流失步到底值不值得攻。里面还隐着一个时间问题：深度必须按周跟，而不是按月。一个月内只看一次深度，它反映的是这个月的全部新客加上旧客的混合，新客还没有走完第一个周期，而旧客可能已经漏掉，你会把一次真实的产品问题读成一次流量波动。',
          backfire:
            '直接优化深度会变成「制造互动」。推通知、推每日摘要、或者加强制提示，能把每账户会话数抬起来，却抬不起来继续用产品的账户数，于是比率变好而流失曲线不动，代价是两个多月以后以一次续约问题的面目出现，而没人把它和当初那次互动推送联系起来。另一个版本是拿会话数冒充回访账户：只为关掉一条推送而打开应用的人，在深度指标和整体比率上都被算成活跃，于是两个数都变好，而其实什么都没变。分母固定用「回来的账户」，不要用会话数。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Seven conditions stand between a funnel count and a decision. Stages must be numbered, named and observable; the thirty-day counts must come from one unit; revenue impact must be modelled from that same count set, not a separate dashboard, or the leak you rank and the leak you chase drift apart.',
      items: [
        {
          step: 1,
          label: 'Funnel stages written as numbered, named, observable events',
          gate: 'A written stage table with 4 to 6 stages for a marketing funnel or 2 to 5 for an in-product funnel, each stage carrying one event name, one trigger rule and one owner, and each event fired at least once in the last 7 days in a staging check.',
          blockIf:
            'Without one event per stage, the biggest leak in Step 4 is a guess, because you are subtracting counts that come from different places, and the 30-day pull in Step 2 returns a column nobody can reproduce. If any stage has no event at all, the funnel has a hole in the middle of it, and every rate below that hole is computed on a different population.',
        },
        {
          step: 2,
          label: 'Thirty-day stage counts pulled in one unit and verified',
          gate: 'Counts for every stage pulled for the trailing 30 days on the same day, in unique users rather than sessions, forming a monotonically non-increasing sequence, with the pull timestamp and the tool name recorded next to the table.',
          blockIf:
            'If sessions are mixed in with users, or two stages were pulled on different days, the leak ranking in Step 4 is wrong in a way you cannot see, because the counts still look plausible. A stage count of zero, or one larger than the stage before it, means the event definition is broken, and no downstream number means anything until that is fixed.',
        },
        {
          step: 3,
          label: 'Revenue impact modelled from the same counts that rank the leak',
          gate: 'The funnel value model run against the 30-day counts, with monthly revenue per stage and monthly revenue lost at the candidate leak step written in USD, and the average order value or per-conversion value you used stated as an assumption on the sheet.',
          blockIf:
            'Without this step you do not know which of two equal-sized leaks deserves a week of work, because the stages can carry very different values. Worse, a model run on blended or mis-pulled counts produces a revenue number that looks authoritative in a review and is wrong, and it will be the number you quote when you argue for the quarter plan.',
        },
        {
          step: 4,
          label: 'Biggest leak named by absolute loss and stable across two windows',
          gate: 'A ranked table of every step by absolute users lost in the 30-day window, the top step named with its count, and the same ranking recomputed on the previous 30-day window with the same step still on top, with any change explained in writing.',
          blockIf:
            'Ranking by percentage drop instead of absolute loss picks a 95 percent drop on a tiny step and sends your week of work after 190 users. If the top step changes every month, you have not found a leak, you have found noise, and running an experiment against it teaches you nothing while consuming the queue.',
        },
        {
          step: 5,
          label: 'One experiment per week with the threshold written before launch',
          gate: 'Each experiment on the chosen step carries exactly 1 primary metric, a stated minimum sample size, a decision threshold and a fixed end date, all written before launch, with no other change to that step surface during the test, and at most 1 experiment running in a week.',
          blockIf:
            'A threshold written after the numbers arrive turns every result into a win, and a test without a minimum sample will be declared on noise. If two experiments run against the same step at once, neither is readable, and the four weeks of Step 6 produce two data points instead of four.',
        },
        {
          step: 6,
          label: 'Four-week cycle closed and the funnel recomputed on a fresh window',
          gate: 'After 4 weeks of experiments on the leak, the stage counts recomputed for a fresh trailing 30-day window, the pass rate at that step compared with the pre-experiment figure, and either a written decision to move to the next biggest leak or a written reason to keep working the same step.',
          blockIf:
            'Closing the cycle without recomputing means you keep optimizing against a number from four weeks ago. If you move to the next leak while the current experiment is still inconclusive, the question stays open, and the same step will still be the biggest leak when you come back to it next quarter.',
        },
        {
          step: 7,
          label: 'Post-activation depth measured on the accounts you converted',
          gate: 'For a SaaS product, the activation event named, and the share of converted accounts returning for a second session within 14 days tracked weekly for at least 4 weeks, with the account count behind the ratio written next to it.',
          blockIf:
            'If depth is not measured, a funnel gain looks finished when it is only half real: signups rise and nobody notices that the accounts never come back until renewal. Tracking sessions instead of returning accounts makes this gate pass while engagement falls, so the denominator has to be accounts, and it has to be the same accounts you counted as conversions.',
        },
      ],
    },
    zh: {
      intro:
        '漏斗的一个计数要变成能执行的决定，中间隔着七个前提。阶段要有编号、有名字、可观测；30 天计数必须用同一种单位拉齐；营收影响必须用与流失排序完全同一份计数建模，否则你排出来的窟窿和你去堵的窟窿会分家。最大的流失步要在两个窗口里都排第一，才值得搭上一周的实验——每周只做一个实验，阈值在启动前就写好，四周一个周期收口后用新的时间窗口重算漏斗。百分比流失率在小体量那一步最容易骗人，所以绝对人数是第一排序键。',
      items: [
        {
          step: 1,
          label: '漏斗阶段写成有编号、有名字、可观测的事件清单',
          gate: '一份写下来的阶段表：营销漏斗 4 到 6 个阶段，产品内漏斗 2 到 5 个阶段，每个阶段配一个事件名、一条触发规则和一个负责人，并且每个事件在最近 7 天里至少在预发环境成功触发过一次。',
          blockIf:
            '一个阶段没有自己的事件，步骤 4 的最大流失就只是猜，因为你在拿来自不同地方的计数相减，而步骤 2 那次 30 天拉取会带回来一列谁也复现不出来的数字。如果中间某个阶段完全没有事件，你的漏斗中间就破了个洞，洞以下的每个比率算的都是另一批人。',
        },
        {
          step: 2,
          label: '30 天各阶段计数用同一种单位拉齐并核对过',
          gate: '在同一天把最近 30 天每个阶段的计数拉齐，全部用去重用户而不是会话，得到一条逐级不增的序列，并把拉取时间戳和所用工具写在表格旁边。',
          blockIf:
            '会话和用户混着算，或者两个阶段不是同一天拉的，步骤 4 的流失排序就会以一种你看不出来的方式错掉，因为计数看着仍然合理。某个阶段计数为 0、或者比上一个阶段还大，说明事件定义已经坏了，在修好之前，下面每一个数字都没有意义。',
        },
        {
          step: 3,
          label: '营收影响必须用与流失排序完全同一份计数来建模',
          gate: '漏斗价值模型跑在 30 天计数上，每阶段的月营收和候选流失步的月营收损失都用 USD 写出来，并把用到的客单价或每单转化价值作为假设写在表上。',
          blockIf:
            '少了这一步，你不知道两个损失差不多大的流失步里哪个更值得花一周，因为各阶段承载的价值可能差很多。更糟的是，用混合口径或拉错的计数跑出来的模型，会给出一个在评审里看着很权威、实际上是错的营收数字，而它正是你拿去论证季度计划的那个数。',
        },
        {
          step: 4,
          label: '最大流失步按绝对人数定名，并在两个窗口里稳定',
          gate: '一张按 30 天窗口内绝对流失人数排好序的步骤表，写明第一名及其人数；再用上一个 30 天窗口重算一遍同样的排序，第一名仍是同一步；排名发生变化的地方有书面解释。',
          blockIf:
            '用百分比跌幅代替绝对人数去排，会挑中一个极小步骤上的 95% 跌幅，然后让你一周的工作去追 190 个人。如果第一名每个月都在换，那你找到的不是漏点而是噪声，对着它做实验既学不到东西，还白白消耗队列。',
        },
        {
          step: 5,
          label: '每周只做一个实验，且判定阈值在启动之前就写好',
          gate: '在选定那一步上的每个实验都带一个主指标、一个最小样本量、一个判定阈值和一个固定结束日期，全部在上线前写定；测试期间该步骤表面没有其他改动；同一时间最多只有 1 个实验在跑。',
          blockIf:
            '阈值在数字出来之后再定，等于把每个结果都判成胜利；没有最小样本量的实验会被用噪声结案。如果同一个步骤上同时跑两个实验，两个都读不出来，步骤 6 的四周最后只剩两个数据点而不是四个。',
        },
        {
          step: 6,
          label: '四周实验周期正式收口，并用新的时间窗口重算漏斗',
          gate: '在该流失步上跑满 4 周实验之后，用新的最近 30 天窗口重算各阶段计数，把这一步的通过率和实验前的数字对照，并写下「转向下一个最大流失步」的决定，或者写下「继续打同一步」的理由。',
          blockIf:
            '不重算就收口，等于你继续在优化一个四周前的旧数字。在当前实验还没有结论时就换到下一个流失步，问题会一直悬着，而那个步骤下个季度回来时仍然是最大的漏点。还有一个更容易被忽略的后果：每一次收口都要重新跑一遍漏斗价值模型，而模型的输入又是刚听完的计数，所以一次不重算就收口，你得到的是一张旧照片加一个新的理由，而不是一份可以对外汇报的结论。',
        },
        {
          step: 7,
          label: '在你转化出来的账户上量激活之后的实际使用深度',
          gate: 'SaaS 产品要写明激活事件是什么，并把「转化账户中 14 天内回来开第二次会话的比例」按周跟踪至少 4 周，比率背后的账户数写在旁边。',
          blockIf:
            '不量深度，漏斗收益看起来已经收尾，其实只有一半是真的：注册数涨了，没人发现那些账户根本没回来，直到续约才暴露。拿会话数代替回访账户会让这条达标线在互动下降时依然通过，所以分母必须是账户，而且必须是你当初计入转化的那批账户。',
        },
      ],
    },
  },
};
