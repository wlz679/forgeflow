// P166 —— R 类（Retention & Customer Success）主题「grr-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= 步骤 1…步骤 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// ⭐ 口径纪律（本主题讲毛留存，不是净留存）
//   · GRR =（期初 MRR − 降级 MRR − 流失 MRR）÷ 期初 MRR，**永远 <= 100%，且不含任何扩张收入**
//   · 因此本文件里「扩张」只能作为**别的指标的副作用**出现，不能被算作 GRR 的补偿项
//   · 所有比率都锚定在同一批「期初就存在」的封闭队列上，期间写明（滚动 12 个月 / 单个封闭自然月）
//   · 金额一律 USD，且只用于给读者一个量级感（起点 MRR × 差距百分点），不用于任何单价主张
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A leaky bucket has a shape, and the shape is measurable before any customer service play is written. Five things can pull a gross retention rate down at the same time: a renewal that failed on a stale card and was never retried, accounts that quietly stepped down one tier, a cohort that was sold the wrong way, an early-warning list nobody works, and a segment sitting below its own floor. Each carries its own owner, its own price of undoing it and its own lead time before the number moves, so the sequence you repair them in decides whether a month of work compounds. Mechanical leaks are handled first because they are cheap to fix and impossible to argue with: a payment-failure split shows what share of the churn was never a customer decision, and dunning on that portion is a billing-ops task rather than a product one. Structural drift waits until the end, because churn that stays high after the dunning is fixed points at the onboarding or the ideal customer profile, and that diagnosis needs the earlier numbers to be trustworthy. Every figure here is gross revenue on one closed cohort, so expansion never offsets a loss inside the same period and a downgrade lands as a loss the day it happens.',
      rows: [
        {
          priority: 1,
          metric: 'Involuntary churn share — payment-failure MRR divided by total churned MRR, on the closed cohort',
          fixFirst:
            'Repair the involuntary share first because it is the only row on this table you can fix without touching a single customer relationship: a renewal that failed on a stale card, a dunning sequence that stopped after the first email, a payment method that expired in the middle of a prepaid term. Recovering those accounts moves GRR in the same month, requires no discount, no executive sponsor and no product change, so it carries no downside risk to the rest of the book. The guide puts involuntary churn at 20 to 40 percent of total churn, which on most books means a tenth to a fifth of the entire leak is sitting inside a billing system one engineer can change in a sprint. Repair it ahead of the voluntary work because a churn number that mixes the two causes is not a diagnosis: while you cannot tell which part of the churn was a card problem, every conclusion you draw about product, pricing or ICP is guesswork.',
          alsoMoves:
            'Dunning recovery removes accounts from the churn numerator and also removes them from the save queue, which hands the CSM hours back to row four to spend, so this repair releases capacity instead of consuming it. It also cleans the cohort curve that step three reads: a book where a tenth of the churn is a billing artefact has a decay slope that is not a product signal, and once those accounts are recovered the slope starts describing something real. Because GRR contains no expansion term at all, this row also cannot hide a pricing problem behind an upsell — whatever you recover here appears in the gross number at full size, with no offsetting credit from accounts that happened to grow.',
          backfire:
            'Dunning pushed too hard turns a billing fix into the opposite of a relationship fix: pushing collection past the renewal date converts a recoverable renewal into a hard cancellation, so the involuntary share falls, the voluntary share rises, and GRR does not move at all while your customer success team takes calls from people who were happy last week. The other version is collecting from accounts that had already decided to leave — the recovery fails, you spent collection effort on a churn that was going to happen anyway, and the refunds and chargebacks that follow pollute the next quarter. The third failure is classification: if involuntary churn is booked at the moment of the failed payment rather than at the moment the account was actually cancelled, the recovery rate looks better than the money you actually collected back.',
        },
        {
          priority: 2,
          metric: 'Contraction rate — downgraded MRR divided by starting MRR, booked on the day the downgrade happens',
          fixFirst:
            'Fix contraction second because it is the earliest revenue loss you can still influence, and because on a gross metric it lands un-netted. A downgrade is booked the day it happens: GRR drops immediately, while the churn it predicts arrives 60 to 90 days later, and the guide puts the 90-day churn probability of a downgraded account at roughly three times that of a stable one. That ordering is why contraction is a better lever than churn even when both look equally bad — you are pulling the same money back earlier, before the renewal conversation has hardened. Diagnose it by cause rather than by account type: a seat true-down after a reorg, a use case that ended, a team that consolidated onto one workspace, a cheaper tier that now covers the usage. A right-sizing conversation fixes the account at a price it can sustain, while a package push only moves the number. Never use a discount to stop a downgrade; that converts the downgrade into a permanent lower price and the loss reappears at renewal.',
          alsoMoves:
            'Contraction and churn are the same money on two different dates, so fixing contraction moves the churn rate with a lag of one to two quarters and it changes the shape of the cohort curve, which is where step three looks for the cause of the decay. It also gives your early-warning rules a second, earlier trigger: a downgrade is usually preceded by a usage drop that the login-frequency threshold already sees, so a working contraction diagnosis arms the alert list weeks before the renewal instead of at it. Because GRR has no expansion side, a downgrade can never be offset inside the same period by an account that upgraded, which means this repair reaches the gross number at full size and nothing quietly cancels it.',
          backfire:
            'Reversing a downgrade by pushing an upgrade is the shortest path from a good metric to a bad business. The downgrade stops being a downgrade, GRR improves, and the account renews at a price it never agreed to pay, then cancels at the next renewal anyway, so the loss simply moves to a later line. The subtler version is a seat freeze or a temporary hold that keeps MRR flat while usage quietly falls: the metric looks clean, the account renews smaller, and next quarter the starting MRR for that cohort is lower, so the curve bends for a reason that will be misread as churn. Offering a retention discount to stop a downgrade has the same defect as every other discount: the account is retained at a permanently lower price, and since gross retention is capped at 100 percent with no expansion term, the revenue you gave away never appears in this metric at all.',
        },
        {
          priority: 3,
          metric: 'Voluntary churn in the newest cohorts — voluntary churned MRR divided by starting MRR for accounts acquired in the last 6 months',
          fixFirst:
            'Repair new-cohort voluntary churn third because this is the only structural row on the table: it means the product no longer fits the customer you are selling to, or onboarding no longer sets up the use case you promised, and no amount of billing hygiene or save plays will hold a book that is being sold the wrong way. Do it after rows one and two so the cohort numbers are clean enough to separate a mix change from a product fault — a book where a tenth of churn is a failed card has a decay slope that says nothing about ICP. Work it as a diagnosis before touching anything: split the newest cohorts by channel, tier and first-90-day activation and find the segment decaying faster than the cohort before it, because the repair is specific (the onboarding sequence, the qualification criteria, the feature the sales motion promised) while the temptation is general (change the product, or change who you sell to).',
          alsoMoves:
            'This row sets the floor for every future measurement, because the newest cohort becomes the starting MRR of the next period — a cohort that churns at 30 percent in its sixth month hands the next period a base 30 percent smaller, and every ratio you publish afterwards is computed on that smaller base. Fixing it also turns the cohort decay slope in step three from a symptom into a lever: once the newest cohort tracks the one before it, you know the repair generalised rather than papering over a single bad quarter. And because it acts at the front of the funnel, it works on the denominator of acquisition economics rather than on revenue you already booked, which is why it takes two to four quarters to reach the headline number.',
          backfire:
            'The dangerous version of this repair is tightening who you sell to while leaving the underlying mismatch in place. Win rate and demo-to-close improve and the pipeline looks cleaner, but you have only removed the accounts that were going to churn from the population — the ones that would have paid and stayed are still there, and the accounts you turned away would have been fine in year two. The second version is dropping the offending cohort out of the measurement: excluding a channel because it performed badly lifts reported GRR without changing one customer experience and destroys the evidence you needed to find the real cause. The third is a product change taken on the strength of one cohort: shipping a fix for a six-month-old cohort that was shaped by a pricing test you ran two quarters ago makes the next cohort worse and leaves you comparing two different products.',
        },
        {
          priority: 4,
          metric: 'Early-warning coverage — at-risk accounts actually worked in the week divided by at-risk accounts flagged',
          fixFirst:
            'Fix coverage before save rate, because coverage is where the early-warning thresholds in step five actually turn into revenue. A flag that lands in a list nobody opens is a dashboard, not a retention system. Measure it as the share of flagged accounts that received a named owner, a dated play and a logged outcome within five business days of the flag, and treat anything under 60 percent as a workflow defect rather than a signal-quality problem. Do this row after the churn decomposition, because until you know which churn was voluntary you cannot tell whether a flagged account needs a save play at all or simply a working card. The thresholds themselves — a login-frequency drop of more than half week over week, support tickets above twice the baseline, a departed champion — are cheap to run and cheap to ignore. Coverage is the part that needs a person and a slot in the CSM day.',
          alsoMoves:
            'Coverage is the denominator of every lift number you will report: a save rate of 25 percent against a no-intervention baseline means something only if that baseline is the accounts you would have flagged but did not work. It also sets the size of the queue that step four draws its top 20 from and that the zone playbooks in the neighbouring health-score topic have to absorb, so coverage moving from 40 to 90 percent doubles the workload on the same CSM headcount in the same week. And because early warning fires 60 to 90 days ahead of the renewal, covered accounts are the ones with the largest MRR still at risk: the same coverage percentage protects more revenue on a healthy book than on one that is already bleeding.',
          backfire:
            'Coverage can be raised by flagging more accounts, and that is the failure mode to watch. Loosening the thresholds until the queue is three times larger looks like better coverage in the count and is worse coverage in the outcome: the same CSM hours spread over more accounts means fewer accounts receive a real play, the save rate falls, and you conclude that the early-warning system does not work. The opposite manipulation is flagging only the accounts you can save easily, which improves the save rate and the reported lift while abandoning the accounts that were going to churn. And a flag that triggers an automatic offer teaches every customer that asking for help is cheap: renewal discounts spread across the book, and because a gross metric contains no expansion term, the revenue you gave away is invisible in GRR and shows up only in revenue per account.',
        },
        {
          priority: 5,
          metric: 'Gap to the tier floor — actual GRR minus the floor for that tier, computed per tier on the same closed cohort',
          fixFirst:
            'Read the floor gap last, because it is the composite outcome of the four repairs above rather than a cause of them. Once rows one through four have run, compute actual GRR per tier on the same closed cohort and subtract the floor: enterprise 95 percent, mid-market 90 percent, SMB 85 percent. Use the largest remaining gap to decide where the next quarter of CSM hours go, not to decide what to fix inside a tier. It also has a reporting job: this is the number you put beside the OpenView, Bessemer and SaaS Capital benchmarks in step seven, and it can only be compared to theirs if the definition and the cohort window match, which is why the floors are written per tier instead of as one company-wide target. A tier sitting within one point of its floor is done; a tier three or more points below is still a live problem no matter how good the portfolio average looks.',
          alsoMoves:
            'The floor gap is what sizes the rebuilt save motion in step six: the gap is the distance the motion has to travel, so a 2 point gap and a 9 point gap do not get the same number of plays, and a motion sized to the gap is the difference between a programme and a habit. It also sets how often you re-benchmark — a tier more than three points below its floor needs the quarterly comparison in step seven to tell whether the market moved or you moved, while a tier within one point can wait two quarters. And because the gap is computed per tier, it stops a healthy enterprise segment from masking an SMB segment that is bleeding, which is the standing failure mode of any single blended GRR number.',
          backfire:
            'The gap is the easiest number on this table to close for the wrong reason. A discount, a price freeze or a renewal concession moves an account back onto its old price at renewal, so the gap closes on the next cohort without a single customer being more satisfied — and because GRR excludes expansion and is capped at 100 percent, that concession is completely invisible in this metric. The other version is moving the floor: redefining enterprise at 97 percent makes the gap smaller without changing the business, and it invalidates every benchmark you ever ran against a published band. The third is fixing the cohort: computing the gap on the accounts that survived last quarter removes the losses from the denominator, so the gap closes while churn carries on.',
        },
      ],
    },
    zh: {
      intro:
        '漏桶是有形状的，而且在写出任何挽回动作之前，这个形状就能被量出来。同时把毛留存拉低的有五件事：一笔没人重试的过期卡支付失败、一批悄悄降了一档的账户、一批被以错误方式卖进来的队列、一张没人真正动手的预警名单，以及一个低于自己地板线的分层。五件事的责任人不同、回头成本不同、数字动起来需要的提前量也不同，所以同一个月里动手的先后，决定这份工作最后是叠加上来还是彼此抹平。机械性的漏损先修，因为它修起来便宜而且吵不赢：把流失拆成主动和被动，被动那部分根本不是客户做的决定，对它加一套催缴和重试是账务工作而不是产品工作。结构性的漂移放到最后，因为催缴修完之后流失仍然高，才说明问题在入职流程或者理想客群画像上，而那个诊断要靠前面几个数字站得住才做得出来。这一个表的数字全都按同一组账户队列上的毛口径收入算，同一期内扩张永远抵不掉损失，降级在发生的当天就记成损失。',
      rows: [
        {
          priority: 1,
          metric: '非自愿流失占比 —— 支付失败 MRR ÷ 当期流失 MRR（封闭队列口径）',
          fixFirst:
            '先修非自愿占比，因为它是这张表里唯一一件不用碰任何客户关系就能修的事：续费时卡过期了、催缴序列发完第一封就停了、年付还没到期但支付方式先失效了。这类账户当月就能救回来，既不用打折、也不用高管赞助、也不用改产品，所以它对其他行的风险是零。指南把非自愿流失放在总流失的 20-40%，多数账本上这就是漏损里的十分之一到五分之一，而它藏在一次迭代就能改完的计费逻辑里。放在自愿流失前面修，还有一个理由：两种成因混在一起的数量不是诊断，只是猜测——你分不清哪个季度的流失其实是卡片问题，关于产品、定价、客群的任何结论都站不住。',
          alsoMoves:
            '催缴救回来的账户会同时离开流失分子和挽回队列，把原本占用的 CSM 工时还给第四行去用，所以这项修复是释放产能而不是消耗产能。它还洗干净了第三行要读的队列曲线：一本书里如果十分之一的流失是计费故障，那条衰减斜率根本不是产品信号，把这些账户救回来之后，斜率才开始描述真实的东西。又因为毛留存完全不含扩张项，这一行也藏不住定价问题——你救回多少，就原封不动地进到毛数字里，没有哪个恰好在涨的账户来抵扣。',
          backfire:
            '催缴催过头，会把计费修复变成关系修复的反面：把催收推过续约日，本来能救回来的续约变成硬性取消——非自愿占比降了，自愿占比升了，毛留存一点没动，客户经理却接到上周还挺满意的人的投诉。另一个版本是对着本来就打算走的账户催收：钱没回来，你把催收力气花在一笔注定要发生的流失上，随后的退款和拒付又污染下一季度的数。第三个问题是口径：如果非自愿流失按支付失败那一刻归类，而不是按账户真正取消那一刻归类，回收率会比你实际收回的钱好看。',
        },
        {
          priority: 2,
          metric: '降级率 —— 降级 MRR ÷ 期初 MRR（按降级发生当日记）',
          fixFirst:
            '第二个修降级，因为这是你还能施加影响的、最早发生的收入损失，而且在毛口径下它不被打包抵消。降级在发生当天就入账：毛留存立刻下降，而它预示的流失要 60-90 天后才出现，指南说降级账户的 90 天流失概率大约是稳定账户的三倍。正是这个先后顺序让降级比流失更值得先动——同一笔钱，你只是把它提前挪回来，而且是在续约对话还没变僵之前。诊断要按原因分，不要按账户类型分：缩编后的席位缩量、用例结束、团队合并到一个工作区、更便宜的档位现在够用了。因为「把账户调回可持续的价格」的对话能真正修好账户，而「推升级」只是把数字挪了个位置。绝不用折扣去拦降级：那会把降级变成永久降价，损失在续约时原样再来一次。',
          alsoMoves:
            '降级和流失是同一笔钱在两个日期上的样子，所以修降级会以一到两个季度的滞后带动流失率，也会改变队列曲线的形状，而第三行正是在曲线里找衰减的原因。它还给早期预警多出一个更早的触发条件：降级之前通常先有用量下滑，而登录频率阈值本来就看得见这个下滑，所以一套跑通的降级诊断，等于给你的预警清单加了第二个、更早的触发点，而不是只剩续约前那一个信号。因为毛留存没有扩张这一侧，同期内别的账户升级也抵不掉这次降级，所以这项修复会以满额出现在毛数字里。',
          backfire:
            '用「推升级」去逆转降级，是把这项指标做好、把生意做坏的最短路径：降级不再是降级，毛留存变好，而这个账户是以它从没同意过的价格续约的，到下一次续约照样走，于是损失只是挪到后面那一行去了。更隐蔽的版本是冻结席位或临时保留：MRR 平了，用量悄悄掉下去，指标干净，账户却以更小的规模续约，于是下个季度这批队列的期初 MRR 更低，曲线弯下去的原因会被误读成流失。用留存折扣去拦降级，缺陷和其他任何折扣一样：账户以永久更低的价留下，而毛留存封顶在 100% 且不含扩张项，你让掉的那部分收入在这个指标上完全看不见。',
        },
        {
          priority: 3,
          metric: '新群组的自愿流失 —— 近 6 个月获取账户的自愿流失 MRR ÷ 它们的期初 MRR',
          fixFirst:
            '第三个修新群组自愿流失，因为这是整张表里唯一的结构性那一行：它意味着产品已经不再匹配你卖给的客户，或者入职流程没有把当初承诺的用例搭起来，而计费卫生和挽回动作都托不住一本「卖错了方式」的账。放在前两行之后修，是为了等队列数字干净到能区分「客群结构变了」和「产品坏了」——一本十分之一流失来自卡片故障的账，衰减斜率对 ICP 一点说明都没有。动手时先做诊断：把最近几批群组按渠道、分层和前 90 天激活情况拆开，找出比前一批衰减更快的那一段，因为修法是具体的（入职序列、资格标准、销售当时承诺的那个功能），而诱惑是笼统的（改产品，或者改卖给谁）。',
          alsoMoves:
            '这一行决定了以后所有度量的地板，因为最新一批群组会成为下一期的期初 MRR——一个在第六个月流失 30% 的群组，交给下一期的基数就小了 30%，你之后发布的每个比率都算在这个更小的基数上。修好它也会让第三行里的队列衰减斜率从症状变成抓手：一旦新群组跟上上一批，你就知道这次修复是可复制的，而不是糊弄过了一个坏季度。因为它作用在漏斗前端，它动的是获客经济学的分母，而不是你已经入账的收入——这也正是它需要两到四个季度才反映到头牌数字上的原因。',
          backfire:
            '这次修复最危险的版本是收紧「卖给谁」，而把底下那个不匹配留在原地。赢单率和 demo 到成交的转化变好，管线看着更干净，但你只是把注定要流失的账户从人群里剔走了——那些本来会付费并留下来的账户还在，而被你拒掉的那批在第二年本来也没问题。第二个版本是把出问题的群组从度量里剔掉：因为某个渠道表现差就把它排除，报出来的毛留存立刻变好，而客户体验一点没变，同时你毁掉了找到真因的证据。第三个版本是凭一批群组去改产品：针对一个六个月前的群组做修改，而那个群组其实是被你两个季度前的一次定价实验塑造出来的，于是新群组更差，你比较的其实已经是两个不同的产品了。',
        },
        {
          priority: 4,
          metric: '早期预警覆盖率 —— 本周真正动手处理的高风险账户 ÷ 被标记的高风险账户',
          fixFirst:
            '覆盖先于挽回率，因为第五步那套预警阈值到底能不能变成收入，就卡在覆盖率这一步。一个标记落进没人打开的清单里，那不是挽留系统，是一块仪表盘。口径是：被标记的账户里，有多少在五个工作日内拿到了指定负责人、带着日期的挽回动作、以及一条已记录的结果；低于 60% 就当成流程缺陷，而不是信号质量问题来查。放在流失拆解之后做，是因为在你分清哪些流失是自愿之前，你没法判断这个被标记的账户到底需不需要挽回动作，还是只需要换张卡。阈值本身很便宜——登录频率环比掉一半、工单超基线两倍、冠军用户离职——跑起来便宜，忽略掉也便宜；覆盖率要的是一个人和一个 CSM 日程里的固定位置。',
          alsoMoves:
            '覆盖是所有挽回数字的分母：所谓 25% 的挽回率、相对不干预基线的提升，只有在「基线」等于你本来会标记但没动手的那批账户时才有意义。它也决定了第四步前 20 账户挑选、以及邻居那个健康分主题里的分区域剧本要吸收多大的工作量——覆盖率从 40% 跳到 90%，同一周里同一个 CSM 人头的工作量直接翻倍。还有，因为早期预警比续约早 60-90 天触发，被覆盖的账户正是那些还没流失但金额最大的账户；在同样 60% 的覆盖率下，一本健康的账比一本已经在流失的账护住的收入多得多。',
          backfire:
            '覆盖率可以靠「多标一些」做出来，而这正是要盯的失败模式。把阈值放松到队列大三倍，计数上看着覆盖率上去了，结果反而更差：同样的 CSM 工时摊到更多账户，真正拿到挽回动作的账户变少，挽回率下降，于是你得出「早期预警系统没用」的反向结论。反方向的操纵是只挑容易救的账户来标记，挽回率和提升倍数都好看，而那些真正会流失的账户被你放弃了。还有一种标记一触发就自动发优惠，等于教会所有客户「开口就有便宜」：续约折扣扩散到整本书，而毛口径里不含扩张项，你让掉的那部分收入在毛留存上完全看不见，只在每账户收入上出现。',
        },
        {
          priority: 5,
          metric: '到分层地板线的差距 —— 该分层的实际毛留存减去它自己的地板线（同一封闭队列口径）',
          fixFirst:
            '地板差距放在最后读，因为它是上面四项修复的结果，不是原因。前面四项跑完之后，按同一批封闭队列算出每个分层的实际毛留存，再减掉地板线：企业 95%、中端 90%、SMB 85%。用最大的那个剩余差距来决定下一个季度把 CSM 工时放到哪，而不是用它来决定分层内部先修什么。它还有一份汇报工作：这个数字要放到第七步里跟 OpenView、Bessemer、SaaS Capital 的基准并排放，只有口径和队列窗口都对得上才能比，所以地板线是按分层写的，而不是一条公司统一的目标。离地板线不到一个点的分层算做完了；低三个点以上的分层，不管组合平均数多好看，都还是活的。',
          alsoMoves:
            '地板差距是第六步重建挽回动作时的尺寸：差距就是这段动作要走的距离，所以两个点的差距和九个点的差距不该配同样多的挽回动作，按差距配动作是「一个项目」和「一个习惯」的分界。它还决定你多久重新对标一次：低于地板线三个点以上的分层，需要第七步那个季度对标才能分清是市场动了还是你动了，而差一个点以内的分层可以等两个季度。因为差距是分层算的，它能挡住一个健康的企业分层把正在流血的 SMB 分层盖住——这正是任何单一混合毛留存数字的失败模式。',
          backfire:
            '差距是这张表里最容易用错误方式关掉的数字。折扣、冻结价格、续约让步，都能在续约日把账户放回旧价，于是差距在下一批队列上关掉了，而没有一个客户变得更满意——而且因为毛留存不含扩张项又封顶在 100%，这个让步在这个指标上完全隐形。另一个版本是挪地板线：把企业的定义改成 97%，差距就小了，生意没变，而你和已发布基准做过的每一次比较全部作废。第三个版本是修队列：在上一季度活下来的账户上算差距，就把损失从分母里拿掉了，于是差距关掉了，流失还在继续。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A gross retention number is easy to produce and hard to trust, and the checks below are aimed at the second problem. Every one of the seven steps in the retention workflow ends in a figure that can look complete while being unusable: a rate computed on a moving window, a churn split that mixes two causes, a cohort drawn across a change in how you sell, an early-warning rule that fires into an unattended queue, a save play with no baseline to beat. What makes the difference is whether the figure is comparable, reproducible and anchored to one closed cohort, and that is what each check pins down. Two habits keep the reading honest across quarters. Churn has to be split into voluntary and involuntary before anything is concluded from it, because a payment failure and a customer who chose to leave demand opposite responses. And the rate must be re-benchmarked every quarter against the bands the market is holding, because a flat gross retention number is a relative regression once the whole category tightens.',
      items: [
        {
          step: 1,
          label: 'GRR computed on one closed cohort with a named denominator',
          gate:
            'GRR computed on a closed cohort of accounts that existed at period start, with starting MRR, downgraded MRR and churned MRR pulled from the billing system for the same rolling 12-month window, the cohort segmented by acquisition month, tier and channel, and numerator and denominator drawn from that identical window.',
          blockIf:
            'If the cohort, the window or the denominator moves between periods, the number cannot be compared with the one before it and every later row loses its baseline: a GRR that rises because the window was widened to exclude a bad month reads as a repair when nothing changed, and a contraction rate computed on a different population than the churn rate cannot be reconciled with it. Redefining the metric is cheap; unlearning a quarter of decisions taken on a moving base is not.',
        },
        {
          step: 2,
          label: 'Churn split into voluntary and involuntary with the recoverability band',
          gate:
            'Every churned MRR classified as voluntary (customer-initiated) or involuntary (payment failure, failed renewal), computed on the same closed cohort and window as step 1, with the involuntary share recorded against the 20 to 40 percent band and the retry and dunning sequences verified against at least 20 real failed-renewal cases.',
          blockIf:
            'A churn number that mixes a card failure with a customer who decided to leave is not a diagnosis: the save plays in step 4 get aimed at accounts that only needed a payment retry, CSM hours are spent on accounts that were never going to leave anyway, and the structural cause in step 3 stays invisible underneath the noise. Without the split you also cannot size the recoverability, so you cannot even tell whether the first row deserves a sprint.',
        },
        {
          step: 3,
          label: 'Six-month cohort decay curve computed by acquisition month',
          gate:
            'A 6-month cohort GRR trend computed by acquisition month for at least the last 6 acquisition months, the decay slope recorded per cohort, and any cohort decaying more than 2 points faster than the cohort before it flagged for drift with the responsible segment named (channel, tier or first-90-day activation).',
          blockIf:
            'A single blended GRR line hides the very thing this step exists to find: a flat headline can sit on top of a decaying new cohort propped up by a healthy old one. Reading the curve late means you blame a product fault on the wrong cohort, rebuild the wrong part of onboarding, and the genuinely drifting segment stays in place for two more quarters. The drift threshold also has to be set before the curve is read, otherwise every bend in the line gets explained away.',
        },
        {
          step: 4,
          label: 'Save plays measured on the top 20 at-risk accounts',
          gate:
            'Save plays run on the top 20 at-risk accounts by customer health score, at least 3 named plays in use (executive sponsor pairing, usage review, custom training), save rate measured as saved accounts divided by 20 and landing in the 20 to 30 percent band, and intervention lift of at least 2x against the no-intervention baseline for each play.',
          blockIf:
            'A save rate with no baseline is an anecdote: if the accounts you happened to work were the ones already trending healthy, the number tells you nothing about the play, and the same motion gets relaunched for another quarter with a different set of accounts. The baseline also has to be built from accounts you flagged but did not work, which means the flagging in step 5 has to be running before step 4 can be measured at all. A quarter out of order and you are measuring your own selection.',
        },
        {
          step: 5,
          label: 'Early-warning thresholds live with owners and dated plays',
          gate:
            'At least 3 flag rules in production (login frequency down more than 50 percent week over week, support tickets above 2x baseline, champion departure), each flag generating an owner and a dated play within 5 business days, and weekly coverage measured as worked flags divided by all flags with a floor of 60 percent.',
          blockIf:
            'A threshold that fires into a list nobody opens produces alerts, not retention, and the likely outcome is that the rule gets retired as noise while the behaviour it was watching for keeps happening. The measurement window matters as well: a flag worked in the same week it fires cannot be separated from the save play, so the coverage figure needs at least 1 full week of history before any lift number attached to it means anything.',
        },
        {
          step: 6,
          label: 'GRR floor set per tier with the gap to floor recorded',
          gate:
            'A minimum GRR floor written for each tier (enterprise 95 percent, mid-market 90 percent, SMB 85 percent), actual GRR computed per tier on the same closed cohort and window as step 1, the gap to floor recorded for every tier, and the save motion sized against the largest remaining gap.',
          blockIf:
            'One blended target hides the segment that is bleeding: an enterprise book at 97 percent will carry an SMB book at 82 percent for several quarters before anyone looks, and by then the SMB cohort is the majority of your logo count. Setting floors without recording the gap also leaves nothing to size the motion against, and a motion built for a 2 point gap is badly mis-sized for a 9 point one.',
        },
        {
          step: 7,
          label: 'Quarterly re-benchmark against three published GRR bands',
          gate:
            'A re-benchmark against OpenView, Bessemer and SaaS Capital completed within the last 90 days, GRR compared on the same gross-revenue definition against at least 3 published benchmarks, the gap recorded as a named reason to hold, tighten or reset the tier floor, and the next comparison date already booked.',
          blockIf:
            'The bands tighten as the market matures, so a flat GRR is a relative regression even when the absolute number never moved, and you only notice that by comparing on a fixed schedule. A benchmark run against a different definition is worse than none: gross and net are routinely mixed in published figures, and a comparison against a net band either flatters you or frightens you for no reason.',
        },
      ],
    },
    zh: {
      intro:
        '毛留存这个数很容易算出来，却很难让人信得过，这七条检查要解决的就是后面这件事。留存流程的七步，每一步结束时会报出一个值，而这个值可能在「看起来完成了」的状态下毫无用处：算在滑动窗口上的比率、两种成因混作一团的流失、跨过一次销售方式变更的队列、报警却落不到任何人队列里的预警规则、没有基线可比的挽回动作。真正让这些数字有区别的，是它们是否可比、可复现，并且锚在期初就锁定的那一组账户队列上——这正是每一项检查钉住的东西。两个习惯守住跨季度的读数。流失必须先拆成主动与被动再下任何结论，因为支付失败和客户主动离开要的应对正好相反。比率每个季度都要重新对着市场正在守住的区间校准，因为整个品类一起收紧时，一个纹丝不动的毛留存数字其实是一次相对退步。',
      items: [
        {
          step: 1,
          label: '毛留存算在同一批封闭队列上，分子分母都写明',
          gate:
            '毛留存算在一批期初就存在的封闭账户上，起始 MRR、降级 MRR、流失 MRR 三个数都从计费系统里取同一个滚动 12 个月窗口；队列按获取月、分层、渠道三个维度拆分；分子和分母必须来自同一个窗口。',
          blockIf:
            '队列、窗口、分母只要有一个在期间之间动过，这个数就没法和上一个期间比，于是后面每一行都失去基线——因为窗口被放宽、把坏掉的月份排除在外而变好的毛留存，会被读成一次修复，而其实什么都没改；降级率和流失率如果算在不同人群上，两个数根本对不上。改口径很便宜，基于一个会动的基数做出的一个季度的决策要撤回才贵。',
        },
        {
          step: 2,
          label: '流失拆成自愿与非自愿，可挽回比例落在已知区间',
          gate:
            '每一笔流失 MRR 都归到自愿（客户主动）或非自愿（支付失败、续约失败）之一，与步骤 1 同一批封闭队列、同一窗口；非自愿占比对着 20-40% 这条区间记录；重试与催缴序列至少在 20 个真实失败续约案例上验证过。',
          blockIf:
            '把卡失败和客户主动离开混在一起的数量不是诊断：步骤 4 的挽回动作会被瞄向那些只需要重试一次的账户，CSM 的工时花在本来就留不住的账户上，而步骤 3 里那个结构性原因被噪声盖住。没有这个拆分，可挽回比例也无从估算，于是你连第一行值不值得一个迭代都判断不了。',
        },
        {
          step: 3,
          label: '六个月队列衰减曲线按获取月算出来并标出漂移群组',
          gate:
            '按获取月算出最近至少 6 个获取月的 6 个月群组毛留存趋势，每批群组的衰减斜率都记录下来；比前一批快衰减超过 2 个点的群组被标为漂移，并点名负责的那一段（渠道、分层或前 90 天激活情况）。',
          blockIf:
            '一条混合后的毛留存曲线正好盖住这一步要找的东西：平稳的头条数字，可能压在一批正在衰减的新群组上，而它靠的是一批健康的老群组撑着。曲线读晚了，就会把产品缺陷算到错误的群组头上，重建错的那部分入职流程，真正漂移的那一段再拖两个季度。而且漂移阈值必须在读曲线之前定好，否则每一处弯折都会有一个现成的解释。',
        },
        {
          step: 4,
          label: '挽回动作在前 20 个高风险账户上被量化并留有基线',
          gate:
            '按客户健康分取前 20 个高风险账户跑挽回动作，至少 3 个明确命名的动作在用（高管赞助配对、使用回顾、定制培训）；挽回率按保住账户数 ÷ 20 算，并落在 20-30% 区间；每个动作相对不干预基线的提升至少 2x。',
          blockIf:
            '没有基线的挽回率只是一个故事：如果这批账户恰好是你挑中的、本来就走势健康的那些，这个数对动作本身什么都没说，而这套动作换个账户名单再来一季度。没有基线还意味着基线必须来自「你标记了但没动手」的账户，所以第五步的标记必须先于第四步跑起来——顺序差一个季度，你量到的就是自己的选择偏差。',
        },
        {
          step: 5,
          label: '早期预警阈值在线运行，每个标记都有负责人和带日期的动作',
          gate:
            '至少 3 条标记规则在生产环境运行——登录频率环比跌超过 50%、工单超基线 2 倍、冠军用户离职——每个标记在 5 个工作日内生成负责人和带日期的挽回动作；覆盖率按「已动手标记数 ÷ 全部标记数」每周计算，下限 60%。',
          blockIf:
            '只报警不落地的阈值产出的是提醒，不是留存，而真正的风险是这条规则被当成噪声撤掉，被它盯着的那个行为却还在继续。测量窗口也很要紧：标记当周就动手，两者分不开，于是任何挂在它上面的提升数字都得不出结论；覆盖率这个数至少要攒够 1 周历史才读得出。',
        },
        {
          step: 6,
          label: '按分层写下毛留存地板线，并记录到地板的差距',
          gate:
            '每个分层都写下最低毛留存地板线（企业 95%、中端 90%、SMB 85%）；实际毛留存按与步骤 1 相同的封闭队列和窗口分分层算出；到地板的差距逐分层记录；挽回动作的规模按最大的剩余差距来定。',
          blockIf:
            '只有一个混合目标，就会盖住真正在流血的那一段：企业做到 97% 的账可以把 SMB 82% 的账扛好几个季度，直到有人去看，而那时 SMB 群组已经是你 logo 数的大头。写下地板线却不记差距，就等于没有可依循的尺寸；按 2 个点的差距配出来的动作，用在 9 个点的差距上会严重失准。',
        },
        {
          step: 7,
          label: '每季度与三份已发布基准重新对标并写下差距用途',
          gate:
            '过去 90 天内完成一次与 OpenView、Bessemer、SaaS Capital 的重新对标，至少 3 份已发布基准按同一毛口径定义比较；差距记成一条明确理由——保持、收紧还是重设分层地板线；下一次对标日期已经排进日历。',
          blockIf:
            '市场越成熟，毛留存区间越收，所以毛留存持平本身就是相对退步，哪怕绝对数一动没动——只有固定节奏地比较才会发现这一点。对标时口径不一致比不对标更糟：已发布的数字里毛口径和净口径经常混着，用净口径的区间来比，要么让你白高兴，要么让你白慌一场。',
        },
      ],
    },
  },
};
