// P166 —— R 类（Retention & Customer Success）主题「customer-health-score-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= 步骤 1…步骤 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// ⭐ 与相邻主题的边界（写之前对过 topic-content.ts 的 en+zh 全文）
//   · 本主题讲的是**模型本身**：信号覆盖、权重、回测提升、阈值容量、剧本成效。
//   · 相邻的 net-revenue-retention 讲的是**留存结果**：GRR、NRR、logo 流失、扩张。
//   · 两者在本文件里只通过「健康分喂给挽回动作」这一条接口相接，不重复对方的口径。
//   · 本文件里的 90 天流失率、回测提升倍数，都是**模型度量**，不是留存结果度量。
//
// 口径纪律：
//   · 流失窗口一律写 90 天，回测窗口一律写 6 个月（信号 → 流失的领先期上限）
//   · 提升倍数（lift）= 低分位 90 天流失率 ÷ 高分位 90 天流失率，分位以打分当天的分数切
//   · 区间权重一律用**标准化系数**；等权预设只作为「还没有相关数据时」的起点，并必须挂上复算日期
//   · 金额只用 USD，且必须写成带口径的形式（如 USD 4,000 a month 的 MRR），不写裸单价
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A health score is a model wearing dashboard clothing, and the disguise is why so many teams spend a quarter tuning weights and end up with nothing. Five numbers tend to go red together: how many accounts genuinely have fresh data behind their score, whether the score separates churners from retainers at all, how the weight is distributed across the signals, how many accounts land in the red band, and whether the play that ran against them saved anything. Fixing them out of order is the usual mistake — retuning weights against a score that is mostly imputed values, or resizing the red band before knowing whether the score ranks accounts in the first place. Signal coverage belongs first, because it decides whether this score measures anything or merely averages guesses. The backtest belongs second, because it decides whether this score is a model or a decoration. Weights come third, because you tune a weighting you have already proven separates churners from retainers. Red-band size is fourth, because that is a capacity decision rather than a modelling one: it determines how many accounts the playbooks can actually absorb. Intervention lift goes last, since it is the single number that depends on every layer above it being real.',
      rows: [
        {
          priority: 1,
          metric: 'Signal coverage — accounts with every selected signal present and refreshed within 7 days, divided by accounts scored',
          fixFirst:
            'Fix coverage first, because a score built from half of its inputs is not a model you can repair, it is a number nobody can audit. Count it per signal, not in aggregate: for each of the 4 to 6 signals, the share of scored accounts where the value exists and was refreshed in the last 7 days. Hold 90 percent as the working line for every signal. A signal sitting below 80 percent coverage is not describing your weak accounts, it is describing your strong ones, because the accounts that stop logging in are exactly the accounts whose signal stops updating. Leave that signal in the weighted sum and it will drag the score upward for precisely the accounts you need to catch, and no amount of weight tuning will undo a bias that comes from who is missing.',
          alsoMoves:
            'Coverage decides whether the threshold bands and the red-zone share in step 3 are measurable at all, because two accounts can only be compared on a score if they were scored on the same inputs. It also decides whether the backtest in step 5 measures prediction or measures completeness: if the low scores are simply the accounts with missing fields, the bottom quartile churns more for reasons that have nothing to do with the signals, and the lift you compute is a data-quality artifact wearing a model costume. Fixing coverage therefore moves three downstream numbers at once, which is why it goes first and why it is cheap.',
          backfire:
            'The fast way to close the coverage gap is to fill the missing values with defaults, zeros or cohort averages, and that makes the score worse in a way no threshold work will reveal. Imputing zero usage for an account that never logged in converts a missing signal into a real low score, coverage looks perfect, and the accounts whose data was absent are now confidently ranked as the worst in the book. Lift collapses, and because the imputed accounts look like the highest-priority saves, the whole retention motion spends its capacity on accounts that were never at risk. Do not impute a behavioural signal. Exclude an account with missing inputs from the score, and count it as unscored rather than as low.',
        },
        {
          priority: 2,
          metric: 'Backtest lift — 90-day churn rate of the bottom score quartile divided by that of the top quartile, on a closed cohort',
          fixFirst:
            'Fix the lift second, because it is the only number that says whether you are running a model or a decoration. Score every account on a fixed day, hold that score, and look at what each quartile did over the following 90 days on a closed cohort that no one touched. Read the result in bands: under 3x means the score does not separate churners from retainers, and every threshold, band and playbook built on it is theatre that will be defended in a QBR as if it were working. Between 3x and 6x means the ranking works but the cut points are mistuned, which is a threshold problem, not a weight problem. Above 6x means the score is earning its place, and the only defensible next move is to leave the model alone and fix the operations around it.',
          alsoMoves:
            'Lift is what converts the score from a report into a planning input: it is the number that lets you promise a CSM that working the red band pays, and it is the number that survives the question of why the retention team deserves more headcount. It also bounds what threshold work can achieve, because a 2x model cannot be cut into a 10-15 percent red band that captures most of the churn, and it sets a ceiling on how much the red-zone share can be tuned. Finally, lift measures how far ahead the score sees: if the bottom quartile only separates at month 2 rather than inside the 90-day window, you are running a lagging indicator dressed as a leading one.',
          backfire:
            'Measure lift on the accounts you are actively saving and you will contaminate the one number you need clean. The accounts your team worked churn less because the team worked them, so the bottom quartile performs better than it should, the lift drops, and the natural reaction is to retune the model that was working fine. Measure on accounts where no play ran. The mirror failure is measuring only on accounts with complete data, which inflates lift by removing exactly the hard cases. And a score that ranks well on one segment can show a healthy lift while producing a red band that contains almost no churners, because the accounts that churn are the ones your signals never see.',
        },
        {
          priority: 3,
          metric: 'Weight calibration — share of the composite score carried by signals that survived the p > 0.10 filter, weighted by standardized coefficient',
          fixFirst:
            'Fix calibration third, once coverage and lift are proven, because re-weighting a model you have not validated only produces a different unvalidated model. Run the correlation on the prior 6-month cohort against 90-day churn, keep the signals whose p-value clears 0.10, drop the rest, and weight what remains by standardized coefficient rather than by equal 20 percent shares. Equal-weight presets almost never beat outcome-validated weights, so if you are still on a preset, the honest reason is that you have not run the correlation yet, not that the preset was better. Recalibrate only when the population you fitted on still resembles the population being scored, and record the fit date next to the weights so you know when the argument expired.',
          alsoMoves:
            'Re-weighting changes which accounts fall into red, so it moves the red-zone share and the CSM load that step 4 has to absorb, and it changes the lead time of the warning: if the signal that carries the new weight is the one that moves earliest, the score warns you sooner, and if it is the one that is merely loudest, the warning arrives later but louder. Weights also change the save rate, because a score that flags accounts for the right reason sends your plays to accounts that actually respond to them. And the weight vector is what a future backtest has to be compared against, so keeping it documented is what makes the next recalibration a controlled change rather than another guess.',
          backfire:
            'Refitting the weights on whatever cohort is most recent is how a good score gets worse on purpose. Your newest cohort has a different mix, a different onboarding ramp and a different product surface than the cohort you fitted on, so a quarterly re-fit chases the mix and shifts the score for accounts that were about to churn in exactly the wrong direction. The second failure is dropping a signal because its p-value missed 0.10 on a small sample: the noisy but genuinely leading signal is the one most likely to fall out on sample size, and removing it leaves you with the signals that describe what already happened rather than what is about to. Keep the p-value filter, but apply it to a cohort large enough to survive it, and keep the dropped signal visible until the next fit.',
        },
        {
          priority: 4,
          metric: 'Red-band share — accounts scoring in the red zone divided by accounts scored, against a 10-15 percent capacity band',
          fixFirst:
            'Fix the red band fourth, because after this point the number stops being a model question and becomes a capacity decision. Start from the calculator defaults of 80, 60 and 40, then check the share of accounts that fall below the red line against the share of accounts your team can actually work in a week. If you can hold 20 accounts per week, the red band should be about 20 accounts per week. Below 5 percent and the band is narrower than the leak, so real churners never get flagged; above 25 percent and the band is a queue nobody works, the CSM day is consumed by triage, and the 48-hour escalation in step 4 becomes a formality. Resize the threshold, not the model: the score is already earning its keep by this point, and a threshold you moved to match reality is a capacity decision you can defend.',
          alsoMoves:
            'Red-band size sets the load on every playbook in step 4 and therefore sets the response time you can honestly promise: a band of 15 percent with a working motion is a 48-hour SLA you can keep, a band of 40 percent is a SLA you will break in the first busy week. It also decides whether the score is used at all, because a dashboard that flags more accounts than the team can touch is one that gets switched off within a quarter. And the red-band share is the cleanest number for a capacity conversation with whoever funds the team, since it converts directly into accounts per week rather than into an abstract risk score.',
          backfire:
            'Moving the red threshold to make the metric look better breaks the motion from either end. Tightening it so fewer accounts land in red leaves the leak where it was but moves those accounts out of sight into the orange band, where they get a scheduled engagement review instead of an executive escalation, and the churn arrives anyway with no trace in the red-zone metric. Loosening it does the opposite: red inflates to 30 percent of the book, executive escalation becomes routine, the retention committee that meets inside 48 hours turns into a queue nobody prioritises, and the strongest accounts get the same treatment as the weakest. When the red-zone number starts to be a target rather than a measurement, it stops being either.',
        },
        {
          priority: 5,
          metric: 'Intervention lift — accounts saved after a zone play divided by accounts that received it, against the same cohort with no play',
          fixFirst:
            'Fix intervention lift last, because it is the only number that assumes every layer above it is real. Measure it per play and against a baseline of accounts that were eligible for the same play and did not receive it, because save rate on its own cannot tell you whether the play did anything. Below 2x the play is reactive, cancelling the signal after the customer has already left, rather than preventive, cancelling it before; between 2x and 3x the motion is worth running but not worth more people. Judge the play on revenue retained, not on accounts saved: a play that saves small accounts because they are easy costs more CSM time than letting a large account go, and it flatters the score while destroying the margin. And if an account is saved but its score does not move, the score and the play disagree, which is a finding worth more than the save.',
          alsoMoves:
            'Intervention lift is what makes the whole chain worth maintaining, because it is the only layer that touches revenue: a healthy score with a play that does nothing produces churn with extra dashboard steps. A play that raises the score of the accounts it rescues also moves the champion share and the critical share for the following quarter, which is what the score itself is for, so lift connects the model to the money instead of leaving the model as a reporting exercise. It also sets the priority order inside step 4: playbooks with lift above 3x get the sponsor time, playbooks below 2x get retired, and without that comparison you will keep running three motions and measuring none of them.',
          backfire:
            'The way to inflate intervention lift is to choose your cases. If the accounts you enter into the save play are the ones whose signals already look weak but whose usage is still high, you will save most of them, and the lift you report will say nothing about the play, because the play was never what determined the outcome. And a save that holds the account for 90 days is counted as a win even when the account churns in month 6, so the lift number quietly rewards buying time rather than keeping the customer. Track the saved cohort for a full year, and keep a no-play control even when the team is busy, because a lift without a control is a story.',
        },
      ],
    },
    zh: {
      intro:
        '健康分是一个穿着看板外衣的模型，而这层伪装正是很多团队调了一个季度权重、最后什么也没得到的原因。通常同时飘红的是这五个数：有多少账户的分数背后真的有新鲜数据；这个分数究竟能不能把会流失的和会留下的分开；权重在各个信号之间怎么分；有多少账户掉进红区；以及针对他们跑的那个动作到底有没有救回什么。顺序错了是常态：在一份大半靠补值撑起来的分数上重新调权重，或者在还不知道这个分数能不能排序账户的时候就去改红区大小。信号覆盖排第一，它决定这个分数是一次度量还是一堆猜测的平均。回测排第二，它决定了模型这件事成不成立。权重列第三，因为你要调的是一个已经被证明能把会流失的和会留下的分开的加权。红区规模排第四，因为那是一个产能决定而不是建模决定：它决定那些剧本到底能吸收多少账户。干预提升排在末尾，因为只有它需要上面每一层都成立才有意义的数字。',
      rows: [
        {
          priority: 1,
          metric: '信号覆盖率 —— 每个已选信号都在 7 天内有值的已打分账户 ÷ 已打分账户',
          fixFirst:
            '先修覆盖，因为一份只由一半输入拼出来的分数不是一个你可以修的模型，而是一个谁都无法审计的数字。覆盖要按信号分别数，不要看总的：对那 4 到 6 个信号里的每一个，数一数已打分账户中这个值存在、且在最近 7 天内刷新过的比例。每个信号的工作线定在 90%。某个信号如果低于 80%，它描述的根本不是你的弱账户，而是你的强账户——因为不再登录的账户，恰恰就是那个信号不再更新的账户。把这样的信号留在加权和中，它会把分数往上拉，而且拉高的正好是你需要抓到的那些账户；这种来自「谁缺席」的偏差，不是调权重能撤销的。',
          alsoMoves:
            '覆盖决定第三步的阈值带和红区规模到底测不测得出来，因为两个账户只有在输入相同的情况下才能被拿来比分数。它也决定第五步的回测量的是预测力还是完整度：如果低分那一档其实只是缺字段的账户，那么底四分位流失更多跟信号本身毫无关系，你算出来的提升倍数就是一个穿了模型外衣的数据质量问题。所以修覆盖会一次带动下游三个数字，这也是它排第一、且它便宜的原因。',
          backfire:
            '把覆盖率快速补上去的捷径是用默认值、零值或群组均值去填缺失值，这样分数会以一种阈值工作永远看不出来的方式变差。把从未登录过的账户的用量补成零，等于把一个缺失信号变成了一个真实的低分：覆盖率看着完美，而那些数据缺失的账户现在被自信地排成了全书中最低分。提升倍数随之塌掉，而且由于补出来的账户看起来像最高优先级的挽回对象，整套留存动作会把产能全花在本来就没有风险的账户上。行为类信号不要补值：把缺输入的账户排除在分数之外，把它记成「未打分」，而不是记成「低分」。',
        },
        {
          priority: 2,
          metric: '回测提升倍数 —— 底四分位 90 天流失率 ÷ 顶四分位 90 天流失率（封闭队列口径）',
          fixFirst:
            '第二个修提升倍数，因为它是唯一能说明你跑的是模型还是装饰的数字。挑一个固定的日子给所有账户打分，把分数存住，然后看接下来 90 天每一个四分位实际发生了什么，队列必须是没有人干预过的封闭队列。读结果要分档看：低于 3x 说明这个分数分不开会流失和会留下的人，那么建在它上面的每一个阈值、区段和剧本都是戏，却会在业务回顾里被当成有效的东西拿出去讲；3x 到 6x 之间说明排序是有效的、切点是歪的，那是阈值问题不是权重问题；高于 6x 说明这个分数挣到了自己的位置，此时唯一站得住的下一步是别动模型，去修它周围的运营。',
          alsoMoves:
            '提升倍数是把分数从一份报表变成一个规划输入的那个数：它是你能对客户成功团队承诺「去处理红区是划算的」的唯一依据，也是有人问「凭什么给留存团队加人」时唯一扛得住的数字。它也限定了阈值工作能做到什么程度——一个 2x 的模型没法被切成一个能抓住大部分流失者的 10-15% 红区，它同时给红区规模的可调空间画了上限。最后，提升倍数还量的是这个分数能提前多久看见：如果底四分位要到第 2 个月才分得开，那你跑的是一个伪装成先行的滞后指标。',
          backfire:
            '在你自己正在救的账户上测提升倍数，会污染你最需要干净的那一个数。团队动过的账户流失得少，是因为团队动了，于是底四分位表现得比它该有的好，提升倍数掉下来，然后最自然的反应是去调一个本来没问题的模型。要在没有跑过任何动作的账户上量。反方向的失败是只在数据完整的账户上量，这会把提升倍数抬高，因为恰恰把难啃的案例剔掉了。还有一种情况：某个客群段上分数排得很好、整体提升倍数健康，但红区里几乎没有会流失的人——因为真正流失的那批正是你的信号看不见的那批。',
        },
        {
          priority: 3,
          metric: '权重校准 —— 通过 p > 0.10 过滤的信号在综合分里承担的比重（按标准化系数加权）',
          fixFirst:
            '第三个修权重校准，而且要等覆盖和提升倍数都验过之后再动，因为去调一个还没验证过的模型，只会换来另一个没验证过的模型。在前 6 个月的队列上跑相关分析，目标变量是 90 天流失，保留 p 值过 0.10 的信号、剔掉其余的，剩下的按标准化系数加权，而不是每个信号各占 20% 的等权。等权预设几乎从来跑不赢用结果验证过的权重，所以如果你还在用某个预设，真正的原因多半是还没跑过相关分析，而不是预设更好。只有当你拟合时用的人群和现在被打分的人群还像，才做重新校准；并且把拟合日期写在权重旁边，这样你才知道这个论证什么时候过期了。',
          alsoMoves:
            '重新加权会改变哪些账户掉进红区，于是它会带动红区规模、带动客户成功团队要扛的产能，也会改变预警提前多久：如果你把权重压在最早动的那类信号上，分数就提醒得更早；压在只是最吵的那类信号上，提醒来得更晚但更响。权重还改变挽回率，因为一个把账户标对了的分数，会把你的动作送到真的会有反应的那些账户上。权重向量也是下一次回测要对照的东西，所以把它记下来，才能让下一次校准是一次受控的改动，而不是又一次猜。',
          backfire:
            '拿最新一期队列去重拟合，是把一个好分数故意做坏的常见路径。新队列的客群结构、入职爬坡和产品形态，都和你当初拟合的那批不一样，于是季度重拟合其实是在追结构，顺带把分数挪向了那些正要流失的账户，方向正好相反。第二个失败是拿小样本把某个信号以 p 值不过 0.10 为由剔掉：又噪但真的领先的那个信号，恰恰是最容易在小样本上掉出去的，剔掉它之后，剩下的信号描述的是已经发生的事，而不是即将发生的事。p 值过滤要保留，但要用一个足够大的队列来承受它，并且把被剔掉的信号记下来，标到下一次拟合为止。',
        },
        {
          priority: 4,
          metric: '红区规模 —— 落在红区的账户 ÷ 已打分账户，对照 10-15% 的产能带',
          fixFirst:
            '第四个修红区，因为到这里这个数已经不再是模型问题，而是一个产能决定。先用计算器默认的 80、60、40 起步，然后拿落在红线以下的账户占比，对照你团队一周真正处理得过来的账户数。如果一周能扛 20 个账户，红区就应该是一周 20 个账户的规模。低于 5%，这个带比漏损本身还窄，真正的流失者根本不会被标出来；高于 25%，这个带就变成没人处理的队列，客户成功的一整个工作日都耗在分诊上，第四步那个 48 小时升级随之变成走过场。要调的是阈值而不是模型：到这一步分数已经挣到自己的位置了，而一个按现实调过的阈值，是你能在预算讨论里解释清楚的产能决定。',
          alsoMoves:
            '红区规模决定第四步每一份剧本要扛的负载，因此也决定你能诚实承诺的响应时间：15% 的红区配上跑得动的动作，48 小时服务承诺守得住；40% 的红区，忙碌的第一周就会破。它还决定这个分数会不会被用起来，因为一个标出来的账户比团队能处理的还多的仪表盘，一个季度内就会被关掉。而红区规模是跟批预算的人谈产能时最干净的数字，因为它直接换算成每周账户数，而不是一个抽象的风险分。',
          backfire:
            '为了把红区指标调好看而挪动红线，会从两头把整套动作拆断。收紧红线让更少账户落进红区，漏损原地不动，但那些账户从视线里挪走了——它们掉进橙区，拿到的是一次定期参与度回顾，而不是高管升级，流失照样发生，而红区指标里一点痕迹都没有。放松红线则是反过来的：红区膨胀到账本的 30%，高管升级变成例行公事，48 小时内开的那个留存委员会变成没人排序的队列，最强的账户和最弱的账户拿到同样的待遇。红区这个数一旦开始被当成目标而不是度量，它就两者都不是了。',
        },
        {
          priority: 5,
          metric: '干预提升 —— 跑了某个区段动作后被救回的账户 ÷ 收到该动作的账户，对照未动作的同批队列',
          fixFirst:
            '最后一个修干预提升，因为它是唯一一层默认上面每层都成立的数字。要按动作分别量，并且对照一批「本来符合条件但没收到这个动作」的账户，因为单看挽回率，你无法知道这个动作到底有没有起作用。低于 2x 说明这套动作是反应式的——在客户已经走了之后才取消信号——而不是预防式的，在流失之前取消；2x 到 3x 之间说明这套动作值得跑，但不值得加人。判断动作要落在保留下来的收入上，而不是保留下来的账户数上：一个小账户因为好救而被救回来，花掉的客户成功工时可能比放走一个大账户还贵，它还会让分数变好看、让毛利变难看。还有一点：如果账户被救回来了但分数没动，说明分数和动作各说各话，这个发现比这次挽回本身更值钱。',
          alsoMoves:
            '干预提升是让整条链值得维护的理由，因为它是唯一一层碰到收入的：一个健康的分数配上没用的动作，产出的是加了看板步骤的流失。一个动作如果能把被救账户的分数也拉上去，下一个季度的冠军占比和危急占比会跟着动，而这正是这个分数存在的意义——所以提升是把模型和钱连起来的那一环，而不是让模型停在汇报层面。它还决定第四步内部的优先级：提升高于 3x 的剧本拿赞助人时间，低于 2x 的剧本退役；没有这个比较，你会一直跑着三套动作、一套都不量。',
          backfire:
            '把干预提升撑大的办法是挑案例。如果进挽回流程的账户是那些信号看着弱、但用量其实还很健康的账户，你救回的大多数会是这样，于是你报出来的提升根本没在说动作的事，因为动作从来就不是结果的决定因素。还有一种是把「撑住 90 天」算成赢，哪怕账户在第 6 个月还是走了——提升倍数于是悄悄奖励「买时间」而不是「留住客户」。把被救回的那批账户跟满一年，并且团队再忙也要留一个不动作的对照组，因为没有对照的提升只是一个故事。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Nobody can tell a working health score from a decorative one by looking at the dashboard, so the six checks below exist to separate the two with evidence. A correlation run across accounts your team never scored proves nothing about the accounts you care about. A threshold chosen without checking what share of accounts lands in the red band produces an alert volume nobody can work through. A backtest computed on the very accounts your team was already saving inflates the lift it reports. What makes a score usable is a specific set of facts: which signals are actually populated for how many accounts, how the weights were fitted and on which cohort, what share of the base the red zone holds, and how far the churn rate of the top quartile differs from that of the bottom quartile over the following 90 days. All of it is measured on a closed cohort, and a model metric is not a retention result — the score tells you where to look, and only the churn outcome tells you whether you were right to look there.',
      items: [
        {
          step: 1,
          label: 'Signals chosen, sourced, and measured for weekly coverage',
          gate:
            'Between 4 and 6 signals selected with a named source system for each, every signal refreshing at least once per 7 days, every signal independently shown to predict 90-day churn in at least 1 prior cohort, and per-signal coverage of at least 90 percent of scored accounts measured over a rolling 30-day window.',
          blockIf:
            'A signal that refreshes monthly cannot carry a 90-day churn warning, and a signal with no prior cohort evidence is a guess that will be weighed like a fact. Coverage below 90 percent biases the score upward for exactly the accounts that stopped using the product, and that bias is invisible in the aggregate number because the missing accounts are precisely the ones nobody is looking at.',
        },
        {
          step: 2,
          label: 'Weights derived from cohort correlation, with the fit date recorded',
          gate:
            'Correlation run against 90-day churn on the prior 6-month cohort, standardized coefficients recorded as the weights, every signal with p above 0.10 dropped and listed rather than deleted, weights summing to 1.0, and the fit date written next to them. If a preset is still in use, the preset name is recorded and a correlation run is scheduled within 90 days.',
          blockIf:
            'Equal weights of 20 percent each are a starting point, not a finding, and shipping them unweighted means every downstream number rests on an untested ranking. Dropping a signal on a small sample removes the noisy leading signal first, and deleting it rather than listing it means the next fit cannot tell whether the signal stopped working or simply stopped being sampled.',
        },
        {
          step: 3,
          label: 'Threshold band set and red-zone size matched to weekly capacity',
          gate:
            'Thresholds set with 80, 60 and 40 used as the starting points, the red band verified to hold 10 to 15 percent of scored accounts on a closed cohort, that share written next to the team capacity it consumes, and the red threshold re-checked every quarter against the same cohort definition.',
          blockIf:
            'A red band below 5 percent is narrower than the leak and the churners never get flagged. A band above 25 percent is a queue nobody works, so the 48-hour escalation in step 4 breaks in the first busy week and the score gets switched off. Without the number written next to capacity, the band drifts toward whatever makes the dashboard look calmest.',
        },
        {
          step: 4,
          label: 'One named play per zone, wired into the daily CSM workflow',
          gate:
            'A distinct play written for each of the 4 zones, each with a named owner, a trigger condition and at least 1 action recorded in the account system, the red zone carrying a 48-hour retention-committee SLA and the green zone a 30-day expansion cadence, and every zone action measurable within 7 days of running.',
          blockIf:
            'Without a named owner, the same alert lands on whoever is least busy, and the accounts that score worst are the ones whose sponsor is hardest to reach. If actions are not recorded in the account system, step 5 has no baseline to measure against and step 6 has nothing to time, which means the score becomes a report that reads as a model and behaves as a decoration.',
        },
        {
          step: 5,
          label: 'Backtest validated on an untouched cohort with lift above 6x',
          gate:
            'Backtest run on a closed cohort of at least 200 accounts that received no play during the window, scores frozen on day 0, actual 90-day churn compared across quartiles, top-quartile churn below 5 percent and bottom-quartile churn above 30 percent, and the resulting lift above 6x recorded with the cohort and date.',
          blockIf:
            'Lift below 3x means the score does not rank, and every threshold and playbook above it is theatre. A backtest on accounts that were saved contaminates the result, because they churned less due to the play and the model gets blamed for the wrong number. A cohort under 200 accounts cannot survive the p-value filter in step 2, so the two gates have to be sized together.',
        },
        {
          step: 6,
          label: 'Score in the daily dashboard with transition alerts and a QBR leading KPI',
          gate:
            'The score published in the daily CSM dashboard for every scored account, automatic alerts on green-to-yellow and orange-to-red transitions, alert-to-action time tracked with a target under 24 hours for orange-to-red, and CHS drift reported in the QBR as a leading KPI that moves 30 to 90 days before NRR and GRR.',
          blockIf:
            'Without transition alerts the score only moves once a quarter, which is too late for a 90-day churn window. If alert-to-action time is not tracked, a red band that no one works looks identical to one that is worked, and the measurement in step 5 cannot distinguish a working model from an ignored one.',
        },
      ],
    },
    zh: {
      intro:
        '看板看不出健康分是真模型还是装饰，所以下面六项检查是用证据把两者分开。在一批你团队根本没打过分的账户上跑相关分析，对你真正关心的账户一点也说明不了。定了阈值却不看红区会装下多少账户，会产出一份没人处理得完的告警量。在你团队正在救的那批账户上做回测，会把报出来的提升倍数吹大。健康分能不能用，取决于一组具体事实：哪些信号对多少账户真的有数据、权重是怎么拟的、在哪批队列上拟的、红区装下了基座的多少、以及顶四分位的流失与底四分位相差多少（按之后的 90 天算）。所有这些都算在同一批签约账户上，而且模型度量不等于留存结果——分数告诉你该往哪看，只有真实的流失结果才能证明你看得对不对。',
      items: [
        {
          step: 1,
          label: '信号已选定、已接上数据来源，并量过每周覆盖率',
          gate:
            '选出 4 到 6 个信号，每个都写明来源系统，每个至少每 7 天刷新一次，每个都在至少 1 个历史队列里被证明能预测 90 天流失；按信号分别统计覆盖率，在滚动 30 天窗口里每个信号的覆盖率不低于 90%。',
          blockIf:
            '一个月才刷一次的信号撑不起 90 天的流失预警，而没有任何历史队列证据的信号只是一个猜测，却要和有证据的信号一样被加权。覆盖率低于 90% 会把分数往上偏，而且偏偏偏在那些不再用产品的账户上，这个偏差在总数里看不见，因为缺的正是没人盯的那批账户。',
        },
        {
          step: 2,
          label: '权重来自队列相关分析，拟合日期写在权重旁边',
          gate:
            '在前 6 个月队列上对 90 天流失跑相关分析，按标准化系数记录权重，p 值大于 0.10 的信号被剔除但仍留档而不是删除，权重合计为 1.0，拟合日期写在权重旁边；若仍在用某个预设，则写明预设名称，并在 90 天内排定一次相关分析。',
          blockIf:
            '每个 20% 的等权只是起点不是结论，未经验证就用它，等于下游每个数都压在一套没被证明过的排序上。在小样本上把一个信号剔掉，最先掉出去的往往是又噪但真正领先的那个；而删掉而不是留档，意味着下次拟合时你分不清它是失效了还是只是没被采到。',
        },
        {
          step: 3,
          label: '阈值已定，红区规模与客户成功团队的每周产能对得上',
          gate:
            '阈值已定并以 80、60、40 为起点；在同一批封闭队列上核到红区装下已打分账户的 10-15%；这个占比写在与它对应的团队产能旁边；红区阈值每个季度按同一队列定义复核一次。',
          blockIf:
            '红区低于 5% 就比漏损本身还窄，会流失的账户根本不会被标出来；高于 25% 就是没人处理的队列，第四步那个 48 小时升级在忙碌的第一周就破，评分随后被整个关掉。数字不写在产能旁边，这个带就会朝着「看板看着最平静」的方向漂。',
        },
        {
          step: 4,
          label: '每个区有各自的动作，并接进客户成功的日常工作流',
          gate:
            '四个区各有一份明确不同的剧本，每个剧本有指定负责人、触发条件，以及至少 1 个记进账户系统的动作；红区带 48 小时留存委员会的服务承诺，绿区带 30 天一次的扩展节奏；每个区的动作都能在跑完后 7 天内被度量。',
          blockIf:
            '没有指定负责人，同一个告警就落到当天最闲的人手上，而分数最差的账户恰恰是最难找到赞助人的那批。如果动作不记进账户系统，第五步就没有基线可比、第六步也没有东西可以计时，于是这个分数变成一份读起来像模型、跑起来像装饰的报表。',
        },
        {
          step: 5,
          label: '在没被干预的封闭队列上回测，提升倍数高于 6x',
          gate:
            '在至少 200 个账户的封闭队列上回测，且该窗口内这些账户没有接受任何动作；打分固定在第 0 天；对比四分位真实的 90 天流失；顶四分位流失低于 5%、底四分位流失高于 30%；得到的提升倍数高于 6x，并记录队列与日期。',
          blockIf:
            '提升低于 3x 说明分数排不出顺序，而建在它上面的每一个阈值和剧本都是戏。在被你救过的账户上做回测会污染结果——他们流失少是因为被救了，于是模型替一个错的数字背锅。少于 200 个账户的队列撑不住第二步里的 p 值过滤，所以这两条达标线必须一起定尺寸。',
        },
        {
          step: 6,
          label: '分数进每日看板，带转换告警与季度回顾的领先 KPI',
          gate:
            '分数出现在客户成功的每日看板里，覆盖每一个已打分账户；绿转黄、橙转红自动告警；告警到动作的耗时被跟踪，橙转红以 24 小时内为达标线；CHS 漂移在季度回顾里作为领先 KPI 汇报，且比 NRR 与 GRR 早 30-90 天动。',
          blockIf:
            '没有转换告警，分数一个季度才动一次，而流失窗口只有 90 天。如果不跟踪告警到动作的耗时，没人处理的红区和有人在处理的红区看起来一模一样，于是第五步那个度量分不清模型是有效的还是被忽略的。',
        },
      ],
    },
  },
};
