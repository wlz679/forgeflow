// P166 试点 —— R 类（Retention & Customer Success）主题「net-revenue-retention」 的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不涉及模型单价，但涉及百分比与 MRR 金额）：
//   百分比与金额都是经营指标，不是随定价 bot 漂移的市场价 ⇒ 手写可以，但必须带口径。
//   本文件里的每个数字都自带：分子、分母、期间（滚动 12 个月 vs 单个封闭自然月）、队列、以及金额量级。
//   NRR =（期初 MRR + 扩张 MRR − 降级 MRR − 流失 MRR）÷ 期初 MRR
//   GRR =（期初 MRR − 降级 MRR − 流失 MRR）÷ 期初 MRR，永远 <= 100% 且 <= NRR
//   金额一律以美元计，示例量级写在行内（如 USD 50K / USD 2M 起算 MRR），避免读者按自己的规模套错。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Retention metrics do not fail independently, so they cannot be fixed independently. When NRR, GRR, logo churn, expansion share and health scores are all below target in the same cohort, the order you repair them in decides whether a month of work compounds or cancels itself out. The table below is ordered by dependency, not by severity: gross retention first, because every later gain is multiplied by it; then the customer-count leak; then the expansion engine; then the leading health signal; and finally the cohort curve, which is the only view that tells you whether the first four repairs actually stuck. Skip a row only when the row above it has passed its own gate. One caliber for every number: percentages are computed on rolling 12-month MRR for board reporting or on a single closed calendar month for operating review, never on a blend of the two, always on one closed cohort of accounts that existed at period start. Amounts are monthly recurring revenue in USD — a point of GRR on a USD 100,000 starting MRR base is USD 1,000 a month — so the ordering logic holds at any scale, but how many accounts you can afford to touch scales with the size of that base.',
      rows: [
        {
          priority: 1,
          metric: 'GRR — gross revenue retention (churned + downgraded MRR)',
          fixFirst:
            'Repair gross retention before anything else, because NRR is GRR plus expansion, and every percentage point of expansion is multiplied by the base you failed to keep. Work revenue, not logo count: pull the churned MRR and the downgraded MRR for the closed cohort out of billing and split them by cause — champion left, use case ended, team shrank, a cheaper tier now covers the usage — then fix the cause before you spend a discount to keep the account. A discount on an account that was going to leave converts churn into downgrade: the same money leaves, and the account is anchored to a lower price for life.',
          alsoMoves:
            'One point of GRR is worth one point of NRR in the same period, so NRR recovers alongside it rather than after it. The accounts that leaked are the ones sitting in the bottom decile of the health score, so GRR work also drains the CHS critical population and lifts the champion share. Logo churn falls with a one to two quarter lag as the repaired cohort renews, and next period starting MRR stops shrinking — that is the denominator every expansion target is measured against, so it stabilises your whole forecast, not just this number.',
          backfire:
            'Buying retention with discounts and price freezes is the classic way a GRR repair turns into an NRR injury. GRR improves at the next renewal because the account stayed, but expansion collapses because you just taught the market that your top price is negotiable; the NRR-minus-GRR gap narrows for the wrong reason and the account sits at its discounted price for life. The other version: save credits and service escalations spent on accounts whose product fit is gone hold GRR up this quarter and hand you a larger downgrade wave at the following renewal, because a retained-but-unhappy cohort churns at the same rate — only later.',
        },
        {
          priority: 2,
          metric: 'Logo churn — customer-count retention, tracked apart from revenue',
          fixFirst:
            'Once GRR is inside its tier floor, the next repair is the count side: logo churn on the same closed cohort, counted in logos rather than dollars. The gap between the two views is the diagnosis. If revenue churn is small while a large share of logos left, you are losing small and mid accounts while a few large renewals keep the GRR line healthy — that is a coverage and onboarding problem, and the fix is CSM coverage plus a renewal process, not discounting. If both views are bad, go back to row 1: the count loss is being driven by the revenue leak, not the other way round.',
          alsoMoves:
            'Keeping more logos widens the base every expansion play can work on, so logo retention raises the ceiling on expansion MRR even if you change no pricing motion at all. It also closes the holes in the tail of the cohort curve, and because health scores are computed on the surviving base, repairing or shedding critical accounts moves the champion and critical percentages as a side effect. Fewer logos lost means fewer replacement logos to acquire, so CAC payback and the Magic Number move in the same direction instead of fighting each other.',
          backfire:
            'Chasing logo count can quietly damage the metrics above it. Keep unprofitable small accounts alive with heavy service and you spend CSM capacity that expansion in retained accounts needed, so the expansion gap gets wider while the churn band looks better. Move the other way — pruning small accounts to make the count look clean — and near-term GRR rises because you shed the weakest revenue, but you shrink the very base your expansion plan runs on and the Magic Number worsens, because you now have to buy back the logos you dropped. Either way this is the easiest number to improve and the easiest to improve for the wrong reason.',
        },
        {
          priority: 3,
          metric: 'NRR minus GRR gap — expansion revenue share of starting MRR',
          fixFirst:
            'Only attack expansion once gross retention holds, because expansion revenue raised on a leaking base is spent twice: once buying growth and once replacing what you lost. Split the gap into its four sources — upsell, cross-sell, seat growth, price increase — and fix the one your customers will renew into. Price increase works when the account already sees value; cross-sell works when you own the second use case; seat growth works when the team is expanding and usage is the limit. Run one source per quarter so the result is readable, and set the expansion target against the cohort you kept rather than against the whole book.',
          alsoMoves:
            'Expansion lifts NRR one for one in revenue terms and carries better margin, so it moves the Rule of 40 and the Magic Number at the same time — that is what turns a retention programme from a defensive cost into a fundable growth engine. It also lengthens modelled LTV, which widens the CAC payback window and changes how much acquisition spend the business can carry. Operationally, a working expansion motion keeps account managers talking to customers who are still growing, and that conversation surfaces churn risk months before the renewal does.',
          backfire:
            'Pushing expansion while GRR is still below its floor is how NRR reports 120% while the business shrinks underneath: expansion revenue lands in the current period, but the cohort that was already weak churns at its next renewal and takes that expansion with it, so trailing-twelve-month NRR falls exactly when the expansion looked like it was working. The subtler version is expansion that churns — a seat minimum, or a cross-sell into a segment with poor product fit, books revenue now and produces churn two quarters later. Because those customers joined mid-period, they never appear in the cohort you reviewed.',
        },
        {
          priority: 4,
          metric: 'CHS critical accounts — health score below 40 on the top 50',
          fixFirst:
            'Score the fifty largest accounts on the same five signals — product usage, NPS, support tickets, engagement, contract value — and treat the bottom decile as a work queue, not a report. If the trailing numbers still look acceptable while the critical share sits above ten per cent, this row outranks everything above it: the score leads churn by three to six months, so you are looking at a leak that has not been booked yet. Fix it account by account with a named owner and a dated save play, and re-score monthly so you can see which plays actually moved the score rather than which ones were attempted.',
          alsoMoves:
            'A worked bottom decile is the cheapest source of future GRR, because the accounts you save are the ones that would have taken the biggest revenue with them, and it improves expansion too: a re-engaged account is an account that buys more. Repairing accounts at the bottom also corrects the health model itself, because a score that never flags anything produces no saves at all and quietly hides churn. Health score movement leads logo churn and GRR by one to two quarters, which makes it the earliest available lever on both of them.',
          backfire:
            'The way to make a health score look good is to make it meaningless. If you recalibrate the weights every quarter until the critical share falls under the threshold, you have removed the signal instead of the risk, and the score stays green precisely when churn is about to rise. The other failure is treating the score as the objective: a customer whose score improved because you handed over a discount is more expensive to keep than one you saved with product, so the score can improve while contribution margin falls. And pruning the critical accounts instead of saving them lifts near-term GRR by removing the weakest revenue, while shrinking the expansion base and the Magic Number in the same breath.',
        },
        {
          priority: 5,
          metric: 'Cohort retention curve — the newest cohort 12-month shape',
          fixFirst:
            'Read the newest cohort curve before you close out any of the work above, because it is the only view that shows whether your repairs were structural or cosmetic. If a cohort that signed after the change flattens by month four while older cohorts held, the leak sits in onboarding or activation for that cohort, not in the renewal motion you repaired, and rows one to four were aimed at the wrong stage of the customer life. If the newest cohort still tracks the old one, the repairs generalised, and next quarter can go to expansion instead of retention.',
          alsoMoves:
            'The cohort curve is what turns trailing twelve month metrics into a forward statement: it shows the revenue still arriving from a cohort you already fixed, which is the input to the gross retention times expansion rate forecast and to the 36 to 60 month cohort projection behind LTV over CAC. It also protects you from over-reading a single period, because a curve shows a trend while a trailing metric shows only an endpoint. And where the curve bends tells you which earlier row to reopen, which is exactly why it is read last rather than first.',
          backfire:
            'Fixing against the cohort curve has one dangerous version: reading the newest cohort early dip as a product problem when it is a mix problem. A cohort signed through a discount campaign looks like it churns faster for two quarters, so you spend a quarter rebuilding onboarding for customers whose real problem was which channel sold to them, while the genuine cohort defect stays untouched. The opposite error is waiting for the curve to prove the fixes worked — a curve needs four to six quarters to read, and by the time it confirms, the accounts you were trying to save have already renewed or left.',
        },
      ],
    },
    zh: {
      intro:
        '留存指标从来不是各自独立地坏的，所以也不能各自独立地修。当同一批队列里的 NRR、GRR、logo 流失、扩张占比和健康分同时不达标时，动手顺序就决定了这份工作是复利还是互相抵消。下面这张表按依赖关系排序，不按严重程度排序：先修毛留存，因为后面每一分收益都要乘在它上面；再修客户数漏损；再修扩张引擎；再修领先的健康信号；最后看队列曲线——它是唯一能告诉你前面四步到底有没有真的生效的视图。只有上一行先过了自己的达标线，才允许跳到下一行。全部数字统一一套口径：百分比都算在滚动 12 个月的 MRR 上（董事会口径）或单个封闭自然月（运营口径），两者绝不混用，且都锚定在期初就存在的那一批封闭队列上。金额一律是美元计价的月度经常性收入——在 10 万美元起算 MRR 的基数上，毛留存一个百分点就是每月 1000 美元——所以排序逻辑在任何量级都成立，但你能负担得起的账户数量随这个基数的大小变。',
      rows: [
        {
          priority: 1,
          metric: 'GRR —— 毛收入留存（流失 MRR + 降级 MRR）',
          fixFirst:
            '先修毛留存，而且先修金额而不是客户数：把同一批封闭队列的流失 MRR 与降级 MRR 从计费系统里拉出来，按原因拆开——冠军用户离职、用例结束、团队缩编、便宜档位刚好够用——先把原因修掉，再考虑用折扣把人买回来。给一个本来就要走的账户打折，只是把流失改写成降级：钱一样少，而且给这个账户永久留了一个价格锚点。',
          alsoMoves:
            '毛留存修好一个点，同一周期里 NRR 就跟着回一个点，因为 NRR 等于 GRR 加扩张，扩张那部分永远乘在你保住的基数上。漏掉的账户正是健康分排在底部十分位的那批，所以修 GRR 的同时也在抽干 CHS 的危急账户、抬高冠军占比。客户数流失会在一到两个季度后随队列续约回落；起算 MRR 也稳住了，而它是下一期所有扩张目标的分母。',
          backfire:
            '用折扣和冻结价格买回留存，是修 GRR 修成 NRR 伤害的经典路径。续约时账户留下了，GRR 数字变好，但扩张塌了，因为你刚刚教会市场你的最高价可以谈；NRR 与 GRR 的差值是因为错误的原因收窄，而账户余生都停在折扣价上。另一个版本：用服务升级和挽留额度去救那些产品已经不匹配的账户，本季度保住了 GRR，下一次续约却送来更大的降级潮——留住但不满的队列，流失率一样，只是来得更晚。',
        },
        {
          priority: 2,
          metric: 'Logo 流失 —— 按客户个数单算的账，别混进收入口径',
          fixFirst:
            'GRR 回到本档底线之后，下一个要修的是人数：同一批封闭队列上的 logo 流失，按客户个数算，不按金额算。两个口径的差就是诊断：金额流失很小但走了很多 logo，说明你在丢中小客户、靠少数大额续约把 GRR 撑着好看——这是覆盖与入职流程的问题，解法是配 CSM 覆盖加续约流程，不是打折。如果两个口径都很差，回到第一行：人数流失是被金额漏损带出来的。',
          alsoMoves:
            '留下更多客户，等于把扩张动作可以作用的面铺宽了，所以客户数留存会抬高扩张 MRR 的上限，哪怕你一分钱定价策略都没改。它同时补上队列曲线的尾部缺口；健康分是在留下来的客户上算的，清掉或修好危急账户，冠军占比与危急占比会跟着动。人少了要重新买回来的 logo 也少了，CAC 回收期与 Magic Number 因此朝同一个方向动。',
          backfire:
            '追客户个数最容易伤到上面的指标。用重服务把不赚钱的小账户养住，CSM 的精力就从留存账户的扩张里挪走了，扩张缺口反而更宽，而流失率那一格看着变好了。反方向也一样：为了把人数做干净而砍掉小客户，短期 GRR 会因为甩掉弱收入而变好，但你把扩张需要的基数砍小了，Magic Number 同时变差——你还得把刚砍掉的 logo 重新买回来。不管哪条路，客户数都是最容易改善、也最容易因为改错方向而改善的指标。',
        },
        {
          priority: 3,
          metric: 'NRR 与 GRR 的差 —— 扩张收入占起算 MRR 的比例',
          fixFirst:
            '只有毛留存站住了才动扩张，因为铺在漏水的基数上的扩张收入要花两次：一次买增长，一次补漏掉的。把差值拆成四个来源——升级、交叉销售、席位增长、涨价——去修客户愿意在续约时认下来的那一个：涨价要客户已经看到价值，交叉销售要你占住第二个用例，席位增长要团队在扩、而用量是瓶颈。一个季度只做一个来源，这样才读得出结果；扩张目标要挂在留住的那批队列上，不是整个客户盘上。',
          alsoMoves:
            '扩张在收入上是一比一地抬 NRR，又带来更高毛利，所以它同时拉动 40 法则和 Magic Number，这决定留存项目是能被融资的防御动作还是增长引擎。它同时抬高模型上的 LTV，把 CAC 回收窗口拉长，业务能承受的获客支出随之变化。运营上，跑通的扩张动作让客户经理继续跟还在长大的客户对话，而这类对话往往比续约更早暴露流失风险。',
          backfire:
            '在 GRR 还没到底的时候硬推扩张，正是 NRR 报 120% 而底下在缩水的成因：扩张收入落在当期，但本就已经虚弱的队列在下一期续约时流失，把扩张一并带走，于是滚动十二个月的 NRR 掉头，恰好落在扩张看起来见效的时候。更隐蔽的是会流失的扩张：席位下限，或者把交叉销售卖给产品适配差的那一段，收入现在入账，两个季度后变成流失；而这些客户是期中进来的，从不出现在你复核过的那条队列里。',
        },
        {
          priority: 4,
          metric: 'CHS 危急账户 —— 前 50 大账户里健康分低于 40 的那些',
          fixFirst:
            '用同样五个信号——产品用量、NPS、支持工单、参与度、合同价值——给前五十大账户打分，把底部十分位当成待办队列，而不是当成一份报告。如果滚动数字看着还过得去、危急占比却超过百分之十，那么这一行优先于上面所有行：健康分比流失早三到六个月，你现在看到的是一个还没入账的漏点。逐个账户处理，指定负责人、写下带日期的挽回动作，并每月重新打分，这样你才看得到哪些动作真的把分数推动了，而不是哪些动作被尝试过。',
          alsoMoves:
            '动底部十分位是未来 GRR 最便宜的来源，因为你要救的正是那些一走就会带走最大金额的账户，而且它同时改善扩张：被重新激活的账户本来就是更会买的账户。修底部账户也在纠正健康模型本身——一个从不报警的模型等于没在做任何挽回，只是把流失藏起来了。健康分的变动比 logo 流失和 GRR 早一到两个季度，所以它是你能拿到这两个指标的最早一个抓手。',
          backfire:
            '让健康分变好看的办法，是让它变得没有意义。如果你每个季度重新校准权重，直到危急占比压到阈值以下，你删掉的是信号，不是风险；恰恰在流失要起来的时候，分数一直是绿的。另一个失败是把分数当成目标本身：客户分数变好是因为你给了折扣，这种客户比用产品救回来的更贵，于是分数改善的同时贡献毛利在掉。还有一个是砍掉危急账户而不是救他们——短期 GRR 因为甩掉了最弱的收入而变好，扩张基数和 Magic Number 在同一口气里被削掉。',
        },
        {
          priority: 5,
          metric: '队列留存曲线 —— 最新一批队列十二个月的形状',
          fixFirst:
            '在上面所有活儿收尾之前先读最新队列的曲线，因为它是唯一能告诉你前面的修复是结构性的还是表面功夫的视图。如果改动之后进来的新队列在第四个月就走平，而老队列还在撑着，那说明漏点在队列的入职与激活环节，不在你修的续约动作上，第一到第四行全都瞄错了阶段。如果新队列仍然跟着老队列走，说明修复可复制，下一个季度就可以把预算放到扩张而不是留存上。',
          alsoMoves:
            '队列曲线是把滚动十二个月的指标翻译成前瞻陈述的那一层：它显示你修过的那批队列还在带来的收入，而这正是毛留存乘扩张率的预测、以及 LTV/CAC 背后那套三十六到六十个月队列投影的输入。它也保护你不被单个周期骗到，因为曲线给出的是趋势，而滚动指标只给出一个时点上的数。曲线在哪里弯，告诉你要退回前面哪一行，所以它放在最后读，而不是最先读。',
          backfire:
            '照着队列曲线修，有一个危险版本：把新队列早期的下探当成产品问题，而它其实是结构问题。通过折扣活动签进来的队列，看起来就是两个月内流失更快，于是你花一个季度重建 onboarding，去服务一批真正的问题是渠道卖错的客户，而真正的队列缺陷还在原地。反方向的错误是等曲线来证明修复有效——曲线要四到六个季度才读得出来，等它确认，你要救的客户早就续约或者走了。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'The seven steps of the retention workflow have one thing in common: every step can produce a number that looks finished while being unusable. A step is not done when the number exists; it is done when the number is comparable, reproducible and tied to one closed cohort. Use the gates below as stop-lines rather than as a scorecard: if a step fails its gate, the next step is measuring your assumptions instead of your business, so fix the gate first and only then move on. Every figure here is an operating metric rather than a market price, which is why each one carries its own definition — numerator, denominator, period, whether the window is a rolling twelve months or a single closed calendar month, which cohort it covers, and the dollar scale it assumes.',
      items: [
        {
          step: 1,
          label: 'Pull one closed cohort four MRR components',
          gate:
            'Starting MRR, expansion, downgrade and churn all come from one billing export for one fixed cohort, and they reconcile back to ending MRR within plus or minus 0.5%, with the period written down: 12 months trailing or one closed calendar month, never a blend of the two.',
          blockIf:
            'If the four components do not tie back to ending MRR, or the cohort shifted while you were extracting it, then NRR and GRR are computed from numbers that never sat in the same place, and every percentage downstream inherits the error. Comparisons against a benchmark row or against last quarter become meaningless, and the first thing the team does is argue about which number is right instead of fixing the cohort definition and re-extracting.',
        },
        {
          step: 2,
          label: 'Compute NRR once and label the band',
          gate:
            'NRR = (starting MRR + expansion - downgrade - churn) divided by starting MRR on the Step 1 cohort, and it lands in exactly 1 of the 4 bands in the Step 2 ladder - excellent, good, warning, critical - with the band written next to the number rather than the number alone.',
          blockIf:
            'A number without a band is not a diagnosis, it is a data point. Without the band, an 118% and a 96% read as two numbers to argue about instead of two different jobs to do, and the band is precisely what tells the team which row of the fix order to open. Stop as well if the cohort or the window changed after Step 1, because a band computed on a different cohort is a score from a different business.',
        },
        {
          step: 3,
          label: 'Compute GRR separately and read the gap',
          gate:
            'GRR = (starting MRR - downgrade - churn) divided by starting MRR, which is always at or below 100% and at or below NRR; the NRR minus GRR gap is written as a number of percentage points and compared against the 25-point threshold from Step 3, so a reader can see which repair the gap implies comes first.',
          blockIf:
            'GRR is the metric that decides whether your growth is real, and if it is computed on a different cohort or a different window than NRR, the gap between them is fiction — you cannot tell a genuine expansion engine from a leaky bucket. A gap over 25 points also sets the order of work: retention has to come before expansion. Without that record, teams open expansion targets while the floor is still broken, and NRR gets reported without the warning that belongs next to it.',
        },
        {
          step: 4,
          label: 'Score the top 50 accounts and queue the bottom decile',
          gate:
            'All 50 accounts carry a score built from the same 5 signals you selected in Step 4, weighted to a total of 100 on a 0-100 scale, and the model has been recalibrated within the last 90 days; the bottom decile - 5 accounts - is named, and each one has an owner and a dated save play.',
          blockIf:
            'If the model has not been recalibrated in 90 days, or the weights no longer total 100, the critical population is fiction and the score will not lead anything. If the bottom decile has no owner and no date, the score produced a report instead of a work queue, and the three-to-six month lead over churn gets spent on reading rather than on saving — the accounts you were supposed to catch have already rolled into the trailing numbers and can no longer be named as preventable.',
        },
        {
          step: 5,
          label: 'Set per tier NRR targets and GRR floors',
          gate:
            'Every tier you sell into carries its own NRR target and GRR floor from Step 5, and together those tiers must cover 100% of starting MRR so no revenue is left unassigned; each tier measured value is written next to its own pair, and the blended company number is never accepted as any tier number.',
          blockIf:
            'Blending tiers is the most common way this number becomes unusable: an enterprise book at 135% can carry an SMB book at 88% inside one impressive-looking 118%, and the SMB problem stays invisible until renewal season. If any tier has no floor written down, nobody owns the breach and the fix order cannot be handed to a team — a target with no owner and no floor is a preference, and preferences do not survive a difficult quarter.',
        },
        {
          step: 6,
          label: 'Track logo churn on its own count basis',
          gate:
            'Logo churn is counted as logos lost over logos starting, for the same 12-month window and the same cohort as the revenue metrics, and every logo counted as lost traces back to 1 account in the churned MRR line from Step 1 - 0 untraceable logos; the count is reported next to revenue churn in dollars, never merged into it.',
          blockIf:
            'Mixing a count with a currency is how a retention report ends up describing two different companies. If logo churn is quoted on a different window from revenue churn, a low count and a high dollar figure get read as one story about one set of customers, and the team picks the wrong repair for it. If logo data only exists for the accounts a CRM happens to track, the missing accounts have to be named as missing before any coverage decision is made on the strength of this number.',
        },
        {
          step: 7,
          label: 'Decompose NRR and project cohorts forward',
          gate:
            'NRR is decomposed into gross retention multiplied by expansion rate and the product reproduces the measured NRR within 1 percentage point; each cohort is then projected 36 to 60 months forward, with CAC and gross margin stated so that LTV over CAC resolves to a payback month rather than a ratio.',
          blockIf:
            'If the decomposition does not reproduce NRR within 1 point, the expansion rate you are carrying is not the expansion rate inside the accounts, and every forward number built on it shifts: the payback month, the cohort curve, the runway. If CAC or gross margin is left implicit, the projection produces a revenue curve with no decision attached to it, and the LTV over CAC you quote cannot later be checked against the CAC spend that was actually made.',
        },
      ],
    },
    zh: {
      intro:
        '留存流程的七步有一个共同点：每一步都能产出一个看起来完成、其实不能用的数字。一步算不算做完，不看数字有没有出来，而看它是否可比、可复现、并且挂在同一批封闭队列上。下面的达标线是停车线，不是记分卡：一步没达标，下一步量的是你的假设，不是你的生意——先把达标线修好，再往下走。这里写的都是经营指标而不是市场价，所以每个数字都自带定义：分子、分母、期间、窗口是滚动十二个月还是单个封闭自然月、覆盖哪一批队列，以及它假设的金额量级。',
      items: [
        {
          step: 1,
          label: '拉齐同一批封闭队列的期初、扩张、降级、流失四项 MRR',
          gate:
            '期初 MRR、扩张、降级、流失四项取自同一次计费导出、同一批固定队列，且能对回期末 MRR，误差在正负 0.5% 以内；期间写在纸上——12 个月滚动或单个封闭自然月，两者不能混着用。',
          blockIf:
            '四项对不回期末 MRR，或者取数过程中队列又动了，那 NRR 与 GRR 就是拿两个不在同一处口径的数字算出来的，后面每一个百分比都会继承这个错误。跟基准表某一行的对比、跟上一季度的对比都会失去意义，而团队第一反应会变成争论哪个数字对，而不是先把队列定义改清楚、重新取数。',
        },
        {
          step: 2,
          label: '算出 NRR，并把它写死落在哪一个档位上',
          gate:
            'NRR =（期初 MRR + 扩张 − 降级 − 流失）÷ 期初 MRR，用步骤 1 同一批队列算，且只落进步骤 2 那 4 个档里的 1 个；档位必须和数字一起写出来，不许只写数字。',
          blockIf:
            '只有数字没有档位不是诊断，只是数据点。没有档位，118% 和 96% 就变成两个可以吵的数字，而不是两件不同的事；而档位正是用来告诉你该打开修复顺序里哪一行的。如果从步骤 1 之后队列或窗口已经变了，也要停在这里——换队列算出来的档位，是另一家公司的成绩，不能拿来指导这批队列的修复顺序。',
        },
        {
          step: 3,
          label: '单独算 GRR，并把 NRR 与它的差值读出来',
          gate:
            'GRR =（期初 MRR − 降级 − 流失）÷ 期初 MRR，永远不超过 100% 且不超过 NRR；NRR 与 GRR 的差用百分点写下来，并和步骤 3 的 25 点阈值比一遍，让看的人能读出这个差指向先修哪一个。',
          blockIf:
            'GRR 决定你的增长是不是真的；一旦它和 NRR 用的是不同队列或不同窗口，两者之间的差值就是虚构的，你分不清自己是有扩张引擎，还是有个漏水的桶。差值超过 25 个百分点还直接决定顺序：留存必须排在扩张前面。没有这条记录，团队会在地板还没修好的时候先开扩张目标，于是 NRR 被报出来，却没带上本该跟在它旁边的预警。',
        },
        {
          step: 4,
          label: '给前 50 大账户打分，把底部十分位变成待办队列',
          gate:
            '50 个账户全部用步骤 4 选定的那同一套 5 个信号打分，权重合计 100，分值在 0-100 之间，模型在最近 90 天内重新校准过；底部十分位是 5 个账户，每个都写明负责人和带日期的挽回动作。',
          blockIf:
            '模型 90 天内没重新校准、或者权重加不到 100，危急名单就是虚构的，这个分数不会领先任何东西。底部十分位没有负责人也没有日期，说明分数产出的是一份报告而不是一份待办队列，比流失早三到六个月的那段提前量就花在读而不是救上——你本该抓住的账户，已经躺进滚动数字里了，再也说不清哪些流失是本可以避免的。',
        },
        {
          step: 5,
          label: '给每个客户分层写下 NRR 目标与 GRR 底线',
          gate:
            '你卖的每一层都要带着步骤 5 的 NRR 目标区间与 GRR 底线一起出现，而且这些层必须覆盖 100% 的起算 MRR——不能有收入没归层；每一层的实测值各自对号，公司级的混算数不作为任何一层的达标值。',
          blockIf:
            '把分层混算是这个数字最常见的失效方式：135% 的企业级可以拖着一个 88% 的 SMB 一起凑出一个好看的 118%，而 SMB 的问题在续约季之前根本看不见。哪一层没写底线，就没人对破线负责，修复顺序也无法落到具体团队身上——没有负责人也没有底线的目标只是偏好，而偏好熬不过一个难做的季度。',
        },
        {
          step: 6,
          label: '按客户个数单独跟踪 logo 流失，别混进收入口径',
          gate:
            'logo 流失按流失客户个数除以期初客户个数算，窗口与队列都和收入指标那 12 个月一致；每一个被记为流失的客户，都要能对回步骤 1 流失 MRR 里的 1 个账户——0 个对不上；这个计数与金额口径的流失并排呈现，不许合并成一个数。',
          blockIf:
            '把计数和金额混在一起，留存报告最后会变成在描述两家不同的公司。如果 logo 流失用的是另一个窗口，一个低计数和一个高金额会被读成同一个客户群的一段故事，团队就会选错修复方式。如果 logo 数据只覆盖 CRM 里跟得上的那些客户，缺口必须先被写成缺口，再拿这个数去决定覆盖策略，否则你会以为长尾已经稳住了。',
        },
        {
          step: 7,
          label: '拆解 NRR，并把每一批队列向前投影 36-60 个月',
          gate:
            'NRR 拆成毛留存乘扩张率，乘积要在 1 个百分点内还原实测 NRR；每一批队列再向前投影 36-60 个月，并写明 CAC 与毛利率，让 LTV/CAC 能落到一个回收月份，而不是停在一个比值上。',
          blockIf:
            '拆解还原不回 1 个百分点以内，说明你手里这个扩张率不是客户账户里的那个扩张率，所有基于它的前瞻数字都会跟着移位——回收月份、队列曲线、跑道都算错。CAC 或毛利率若不写实，投影出来只是一条收入曲线，底下没有可做的决策，你之后拿真实的 CAC 支出也核不了自己引用过的 LTV/CAC。',
        },
      ],
    },
  },
};
