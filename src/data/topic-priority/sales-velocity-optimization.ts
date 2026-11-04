// P166 —— S 类（Sales）主题「sales-velocity-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论：照搬既有散文 = 抄写自己）：
//   · 既有 howToUse（基准页）= 按细分选一行 → 单一动作（速度带 / 甜蜜点带 / 成交率档）
//   · 既有 howToApply（指南页）= Step 1…Step 6 编号链（按顺序做什么）
//   · 本文件 fixPriority = 四个杠杆同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是用户自己的经营阈值 ⇒ 允许手写金额，但必须带口径）：
//   · 速度一律 =（合格开放机会数 × 已成交 ACV × 成交率）÷ 周期长度，周期单位是「天」
//   · ACV 一律取已成交合同的合同额，不取标价、不取 ARR、不取合同总额（TCV）
//   · 成交率一律 = 已成交 ÷ 已关闭（已成交 + 关闭失败），开放机会不进分母
//   · 周期长度一律用「首次接触 → 已成交」的天数；分段口径一律写明是哪一段
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Velocity is one number built from four inputs, and when it sits below target those four inputs are usually below target at the same time, so which one you repair first decides which quarter pays the bill. Win rate comes first, because it is the highest-leverage quality lever and the one most often broken by pushing deal size upward without revising the close motion: win rate degrades 5 to 15 points per deal-size tier, from 30-40 percent at SMB down to 10-20 percent at enterprise, so a pricing push that lifts average contract value while win rate collapses produces a velocity number that looks improved and a pipeline that converts worse. Cycle length comes second and it has structural ceilings, since enterprise compresses perhaps 20-30 percent where self-serve SMB can compound 50-60 percent, so an enterprise cycle target copied from an SMB case study is a promise the legal and procurement queue cannot keep. Opportunity count comes third, the easiest to inflate and the slowest to convert, which is why adding leads to a broken funnel makes the funnel more broken. Contract value comes last and is sticky without a pricing change, because list price inflates velocity without any lever having improved. Velocity is always qualified open opportunities times closed-won contract value times win rate divided by cycle length in days, and all four inputs come from the same population: junk and disqualified opportunities excluded, win rate measured on opportunities that actually closed, contract value taken from signed contracts rather than list price.',
      rows: [
        {
          priority: 1,
          metric: 'Velocity measurement parity — velocity recomputed from raw CRM fields ÷ the velocity on your dashboard',
          fixFirst:
            'Establish parity first, because every other row on this table is judged against the velocity number, and velocity is a product: one wrong input multiplies through the whole thing. The failure is common and quiet — average contract value computed at list price instead of from signed contracts, win rate including opportunities that are still open, cycle measured from the last touch instead of the first. Each of those makes velocity look better than the business is, and a team that has been managing to an inflated number experiences the first honest recomputation as a collapse rather than as a correction. It is also a query-level fix: freeze the field definitions, recompute the trailing 90 days once, and write down what each of the four inputs is. That written definition is what every later row is measured against.',
          alsoMoves:
            'It determines what you are allowed to believe about the other three rows. Once the inputs are fixed, the win rate becomes a statement about deals that actually closed rather than about the ones that happened to be in the pipeline on the reporting day, and the cycle becomes a statement about your process rather than about your CRM hygiene. It also changes what the What-If branches in the next step are worth, because a branch computed on a wrong input set tells you the sensitivity of the model rather than the sensitivity of the business. And it gives you the honest baseline you need to judge whether a later fix actually worked.',
          backfire:
            'Rebaselining has a cost that gets misread as damage. The first honest number is usually lower than the number you have been quoting, because at least one input was flattering you, and any target that was set against the inflated figure now looks unreachable. The trap is to respond by tightening the definition further, or by quietly returning to the old one, which leaves the team chasing a number that cannot be reproduced on a different machine or by a different person. The second trap is freezing a definition that is wrong: better to freeze a consistent wrong definition and correct it deliberately than to keep a definition that changes whenever the result is uncomfortable.',
        },
        {
          priority: 2,
          metric: 'Cycle length — median days from first touch to closed-won, for the segment that produced most of last quarter’s bookings',
          fixFirst:
            'Rank cycle second even though it is the slowest lever, because it has the longest lead time of the four and that is exactly why it starts early. A change to how you run demos, how you qualify, or how you hand off to legal does not show up in the velocity number until a full cycle has elapsed — a quarter of your selling capacity is committed to the change before it produces its first data point, so a cycle project started late never produces any data at all. It sits above win rate because the two are the same surgery seen from different ends: the stage where your cycle is longest is the stage where win rate is being lost, so fixing cycle first tells you where to aim the qualification work in the row below. Fix cycle for the segment that actually pays your bills, not for the segment with the most interesting problem.',
          alsoMoves:
            'Compressing cycle changes the meaning of every other number on this table. A shorter cycle means the same opportunity count produces more bookings per month, so your coverage requirement falls without you touching win rate, and the pipeline you need to hold in front of the team shrinks at exactly the moment you are adding reps. It also moves the stage mix: when discovery is tightened, fewer opportunities enter the funnel, so the opportunity count falls while bookings hold — a change that looks like a funnel problem and is actually the cycle fix working. And it moves the win rate on its own whenever the removed time was the time where deals were quietly dying.',
          backfire:
            'Cycle compression has two predictable costs. The first is that the fast path is not the right path for every segment: an async demo and a self-serve trial can compress a small-business cycle by half, while an enterprise cycle capped by legal and procurement will only give you 20 to 30 percent no matter how you restructure it. Applying the small-business template to a large-deal motion produces a cycle number that looks excellent and a pipeline that stalls in compliance review. The second is compressing by removing the human step rather than by removing the wait: a deal that skips the scoping conversation moves faster and then gets reopened at the pricing stage, so cycle improves and bookings do not.',
        },
        {
          priority: 3,
          metric: 'Win rate on decided opportunities — closed-won ÷ closed-lost, trailing 90 days, in your primary segment',
          fixFirst:
            'Fix win rate third because it is the fastest of the four to respond and the only one that tells you whether the other three are being applied to the right opportunities. It is also the lever with the shortest feedback loop: a cohort decided 90 days ago is fully closed, so you learn within a quarter rather than within a year. Put it below cycle because win rate work is diagnosis-driven — you do not know which qualification rule to change until you know which stage your cycle is burning time in — and below the parity row because win rate on a shifting denominator is not a rate at all. Judge it on decided opportunities only, and split it by segment, because the guide puts small-business win rates at 30 to 40 percent against 10 to 20 percent for large deals and a blended figure hides both.',
          alsoMoves:
            'Win rate is the lever that makes opportunity volume worth paying for. Velocity is the product of all four inputs, so a 5-point gain in win rate lands on every future opportunity you add without any extra demand generation cost, which is why it is the input most worth repairing before you buy a single extra lead. It also changes how much coverage you need: the same booking number needs a smaller pipeline when more of the pipeline converts, which releases reps back into prospecting instead of leaving them working a coverage deficit. And it moves the cycle in the right direction, because the deals you stop disqualifying late are exactly the ones that were sitting in the funnel longest.',
          backfire:
            'Win rate can be improved in ways that shrink the business. Tightening qualification raises win rate and cuts the top of the funnel, so the velocity number can fall in the same quarter the win rate improves, and the natural reaction is to conclude the qualification change failed. The subtler version is survivorship: raising the bar until only the easy deals remain makes the rate look excellent while the pipeline quietly stops containing the deals that would have paid the most. And win rate is the input most easily inflated by discounting, which moves real value out of the revenue line — the reason it sits above the ACV row and below it in priority at the same time.',
        },
        {
          priority: 4,
          metric: 'ACV position versus the segment band — median closed-won contract value ÷ midpoint of that segment’s proven band',
          fixFirst:
            'Deal size comes fourth because it is the most sticky of the four inputs: it does not move on a process change, it moves on a pricing or packaging decision, and the guide puts realistic gain at 5 to 15 percent, which is smaller than what a cycle or win-rate fix can deliver in the same quarter. It also comes fourth because price and win rate are two ends of the same lever, and you cannot pull them apart until the parity row has fixed the denominator. Once that is done, read ACV against the band for your segment — a median contract value materially below the band usually means structural discounting, not a pricing opportunity, and a median above the band usually means you are selling to a segment whose win rate and cycle you have not revised. Find out which of the two you are before changing anything.',
          alsoMoves:
            'It re-prices the win-rate work directly. If your contract values sit below the band, then part of your win rate is being bought with discount, and the win-rate improvement you recorded in the row above is partly a margin transfer rather than a selling improvement. Correcting the discount structure therefore raises realized revenue without touching the close motion, and it usually improves win rate a second time because the discount conversation stops contaminating the qualification conversation. It also moves the coverage requirement in the row below: at the same booking number, a higher contract value needs fewer opportunities, which is the cheapest way to relieve a rep who is already at full coverage.',
          backfire:
            'Pushing contract value up is where velocity math most often breaks. Discounting to close a larger deal keeps velocity flat, because the larger size is cancelled by the lower realized price and the higher win rate, and the quarter looks like a success on the metric you chose while revenue lands short. Worse, moving out of the band damages the two levers that were working: the guide notes that pricing actions which push a segment outside its band destroy win rate and cycle together, so a deal that is too cheap for its segment gets easier to win and slower to close, and the velocity number can fall even as bookings rise. Fix the discount structure before you raise list price, and judge both on realized revenue per rep per month rather than on the velocity ratio alone.',
        },
        {
          priority: 5,
          metric: 'Per-rep coverage ceiling — weighted pipeline ÷ quota for the median rep, not for the book',
          fixFirst:
            'Look at per-rep coverage fifth because it is the constraint that decides whether any of the other repairs turn into bookings, and it is per-rep rather than per-book for a reason: the book can look covered while individual reps are not, and a team with one overloaded rep and three underloaded ones converts worse than the same total pipeline spread evenly. When a rep is already holding enough weighted pipeline to hit quota several times over, that rep is the constraint on everything: their good deals get crowded out by deals they cannot work, response times stretch, and your velocity per head is capped by a ceiling that no extra lead flow can lift. Measure it before you decide anything about hiring, because the two conclusions point in opposite directions and the number decides between them.',
          alsoMoves:
            'It decides what to do with reps and what to do with leads, which is why it sits above the fill row. A rep with room absorbs new opportunities without any change to the process and converts them at the current rate, so raising coverage at the margin is the cheapest possible source of growth. It also tells you which lever has the shortest path: where per-rep coverage is short, adding pipeline helps immediately; where it is already full, the only remaining levers are win rate, cycle and contract value, and money spent on lead generation for that rep will sit in the pipeline as noise. It also gives you the fair way to compare reps, since quota attainment differences usually track coverage differences rather than skill differences.',
          backfire:
            'Hiring ahead of coverage is the classic way to make velocity worse while believing you are growing. A new rep starts with no pipeline, so the denominator of your velocity calculation — reps — grows immediately while the numerator does not, and per-rep velocity falls for a quarter or more with no change in selling quality. The team experiences it as a bad quarter of hiring and refuses to hire again for two years. The other version is adding a second rep to a book with one healthy pipeline, which splits it below the coverage that lets a deal close comfortably and pushes both reps back to filling from scratch.',
        },
        {
          priority: 6,
          metric: 'Opportunity fill rate — qualified opportunities added per rep per week ÷ the weekly rate the plan needs',
          fixFirst:
            'Fill rate is last because it is the easiest input to inflate and the slowest to convert, and because it is the only one of the four that does not pay back inside the quarter you spend on it. New opportunities need a full cycle before they become bookings, so a fill push started this month shows up in bookings you have not forecast yet, while every leak in the rows above is costing you now. That said, it is the row that tells you whether the other three are worth scaling, and it is the one that turns into a real constraint once the funnel is clean: after parity, cycle, win rate and contract value are all in band, a thin top of the funnel is not a diagnosis but a demand problem, and no amount of process repair substitutes for it. Qualify the count, never the raw form fills.',
          alsoMoves:
            'Fill rate is what converts the other repairs into scale. A clean funnel with a fast cycle and a high win rate means each additional opportunity is worth more than it used to be, so the same demand generation budget now buys more bookings than it did two quarters ago. It also determines whether you should be buying leads or adding reps: at healthy per-rep coverage, extra opportunities go to the reps who have room; at full coverage, the same opportunities are noise and the money belongs somewhere else. And a rising fill rate with a flat win rate is one of the clearest signals that the source of those opportunities has changed who it brings.',
          backfire:
            'Buying volume to hit a fill target is the fastest way to make every other row on this table worse. Unqualified opportunities dilute response rates, lengthen the cycle for everyone because the discovery calendar fills up, and lower the win rate in the same quarter, so velocity falls on three inputs at once while the metric you were managing rises. The version that is harder to see is sourcing from a different buyer: the opportunity count meets the target, the win rate falls, and the contract mix shifts toward whatever that channel sells — so a single sourcing decision quietly invalidates the diagnosis you built in the earlier rows. Count opportunities that survived the first qualification gate.',
        },
      ],
    },
    zh: {
      intro:
        '速度是一个由四个输入乘出来的数，而不达标时这四个输入通常一起不达标，所以先修哪一个决定了哪个季度来付账。第一个是成交率，它是质量杠杆里最高的一根，也最常被「只推客单价、不改成交动作」弄坏：成交率每跨一档客单价就掉 5-15 个百分点，从 SMB 的 30-40% 一路降到企业级的 10-20%，所以一次提价如果让均价上去了而成交率塌了，速度这个数看着变好，实际是漏斗转得更差。第二个是周期，它有结构性天花板——大客户大概只能压 20-30%，而自助型 SMB 能复利出 50-60% 的压缩——所以拿 SMB 的案例去承诺大客户的周期，是法务与采购队列兑现不了的。第三个是机会数，它最容易灌水也最慢转化，往一个坏漏斗里加线索只会让它更坏。第四个是合同额，没有定价动作它就黏住不动，因为标价能把速度吹大而四根杠杆里并没有一根真的变好了。全表口径：速度 = 合格开放机会数 × 已成交合同额 × 成交率 ÷ 以天为单位的周期长度，四个输入必须取自同一个总体——垃圾机会与失格机会剔除，成交率只算真正关闭过的机会，合同额取已签合同而不是标价。',
      rows: [
        {
          priority: 1,
          metric: '速度度量一致性 —— 从 CRM 原始字段重算的速度 ÷ 你仪表盘上的速度',
          fixFirst:
            '第一个建一致性，因为这张表上其他每一行都要拿速度这个数来评判，而速度是一个乘积：一个输入错了，整条链都被放大。出错很常见也很安静 —— ACV 用标价而不是已签合同额、成交率把还没关闭的机会算进去、周期从最后一次接触开始算而不是第一次。每一种都会让速度比生意本身好看，于是一个靠虚数管理了几个月的团队，第一次诚实的重算感受到的不是纠正，是崩塌。这件事本身是查询级别的：把字段定义冻住，按滚动 90 天重算一次，把四个输入各自是什么写下来。那份写下来的定义，就是后面每一行的评判基准。',
          alsoMoves:
            '它决定了你有资格相信另外三行。输入定死之后，成交率才是「真正关掉的单子里赢了几成」而不是「报表那天恰好在管道里的单子如何」，周期才是关于你流程的陈述而不是关于 CRM 卫生的陈述。它也改变了下一步那些 What-If 分支值多少钱 —— 建立在错输入上的分支告诉你的是这个模型对什么敏感，不是这个生意对什么敏感。它还给了你一个诚实的基线，用来判断后面某个修复到底有没有用。',
          backfire:
            '重建基线有代价，而它常被误读成一次事故。第一次诚实的数字通常低于你一直在报的那个数，因为至少有一个输入在恭维你，于是所有按虚数设的目标都显得遥不可及。坑在于用「把定义再收紧一点」或者「悄悄换回旧定义」来回应，于是团队追一个换台机器、换个人就复现不出来的数字。第二个坑是把一个本身就错的定义冻住：一致的错定义也比一个随结果心情变动的定义强，但要改也得是主动改，不能靠结果难看时临时改。',
        },
        {
          priority: 2,
          metric: '销售周期长度 —— 首次接触到已成交的中位天数，按贡献了上季度多数签约额的那个细分',
          fixFirst:
            '周期排第二，哪怕它是最慢的杠杆 —— 原因是四个杠杆里它的回款期最长，而回款期最长恰恰是要早开始的原因。演示怎么做、资格怎么判、怎么交给法务，这些改动不会立刻出现在速度里，必须等一整个周期过去：你的销售能力要先被这个改动占掉一个季度，才拿到第一份数据。晚启动的周期项目，永远拿不到数据。它排在成交率前面，是因为两者是同一台手术的两端：周期最长的那一段，就是成交率正在流失的那一段，所以先把周期压下来，你就知道资格确认该往哪个环节打。要针对真正给你付钱的那个细分去压周期，而不是针对问题看起来最有趣的那个细分。',
          alsoMoves:
            '压周期会改变这张表上其他每一个数的含义。周期变短，同样数量的机会一个月能出的单就更多，于是你的覆盖率要求下降而你根本不用动成交率，你需要的管道规模缩小，恰好是在你要扩编销售的当口腾出产能。它还会推动阶段结构变化：发现环节收紧之后，进漏斗的机会变少，于是机会数下降而签约额持平 —— 这看起来像漏斗出了问题，其实是周期修复在生效。而且只要被砍掉的恰好是那些悄悄死掉的等待时间，成交率自己就会跟着动。',
          backfire:
            '压周期有两笔可预期的代价。第一笔是快路径并不适合每个细分：异步演示和自助试用能把小客户周期压掉一半，而被法务与采购卡住的大客户周期顶多给你 20-30%，再怎么重构流程也不行。把小客户那套模板套到大客户动作上，会得到一个漂亮得不像话的周期数和一个卡在合规评审里的管道。第二笔是砍掉的是等待而不是人：跳过需求澄清的单子跑得更快，然后在定价环节被重新打开，于是周期变好、签约没变。',
        },
        {
          priority: 3,
          metric: '已关闭机会的成交率 —— 已成交 ÷ 关闭失败，取滚动 90 天，按主力细分',
          fixFirst:
            '成交率排第三，因为它是四个输入里见效最快的，也是唯一一个能告诉你另外三个是不是用在了对的机会上的杠杆。它的反馈环也最短：90 天前关闭的那批早就关完了，一个季度内就能知道修没修成。排在周期之后，是因为成交率的活是诊断驱动的 —— 你不知道周期烧在哪一段，就不知道该改哪条资格确认规则；排在一致性之后，是因为分母在漂的成交率根本不叫比率。只看已关闭的机会，并且按细分拆开看：指南里写着小客户成交率 30-40%，大客户只有 10-20%，混在一起的数字把两边都盖住了。',
          alsoMoves:
            '成交率是让机会量值得花钱的那个杠杆。速度是四个输入的乘积，所以成交率每抬 5 个百分点，会落在你以后加进来的每一个机会上，而且不额外花一分钱的需求生成成本 —— 这就是它最值得在买任何一条线索之前先修的原因。它还改变你需要多少覆盖：同样的签约额，更高的转化需要更小的管道，于是销售从「补覆盖缺口」里被释放出来，回到找单子上。最后它也会把周期往对的方向带，因为那些被你拖到很晚才排除掉的单子，正是躺在漏斗里最久的那些。',
          backfire:
            '成交率可以在把生意做小的同时被提高。收紧资格确认会让成交率上去、漏斗顶变窄，于是同一个季度里速度数字反而下降，人自然会得出「资格收紧是失败的」这个结论。更隐蔽的版本是幸存者偏差：把门槛提到只剩容易的单子，于是比率很漂亮，而管道里悄悄不再装着那些本来最赚钱的单子。成交率也是最容易用折扣做高的那个输入 —— 那是把真实价值从收入里搬出去，所以它既排在 ACV 那行之前，也在优先级里压在 ACV 下面。',
        },
        {
          priority: 4,
          metric: 'ACV 在细分区间中的位置 —— 已成交合同额中位数 ÷ 该细分成熟区间的中点',
          fixFirst:
            '客单价排第四，因为它在四个输入里最黏：它不随流程改动而动，只随定价或打包决策而动，而指南给的现实增益是 5-15%，比同一季度里压周期或提成交率能拿到的都小。它也排在第四是因为价格与成交率是同一根杠杆的两头，在一致性那行把分母定死之前你没法把它们拆开看清。定死之后，拿 ACV 对比你所在细分的区间来看：中位数明显低于区间，通常说明是结构性打折而不是定价机会；明显高于区间，通常说明你在卖一个成交率和周期都还没重新校准过的细分。先弄清自己是哪一种，再动手。',
          alsoMoves:
            '它会给上一行的成交率工作重新定价。如果合同额落在区间下方，说明你的成交率有一部分是靠折扣买来的，于是上一行记下的成交率改善有一部分是毛利转移而不是销售改善。把折扣结构理顺，不用碰关单动作就能抬高实际收入，而且往往会让成交率第二次变好 —— 折扣话题不再污染资格确认话题。它也改变下面那行的覆盖要求：同样的签约额，客单价更高需要的机会更少，这是缓解一个已经满覆盖的销售最省钱的办法。',
          backfire:
            '把合同额推高，是速度数学最容易坏掉的地方。用折扣关掉一笔更大的单，速度基本不变 —— 更大的金额被更低的实收价和更高的成交率抵消掉了，这个季度在你选的那个指标上像成功，而收入其实没到。更糟的是跑出区间会同时毁掉本来在工作的两个杠杆：指南里明说把细分推出甜蜜点带的定价动作会同时摧毁成交率与周期，于是单子变得更好签也更难签，签约额涨了速度反而掉。先修折扣结构，再动标价，而且两个都要用「每位销售每月实际收入」而不是只用速度比值来评判。',
        },
        {
          priority: 5,
          metric: '人均覆盖天花板 —— 中位销售的名下加权管道 ÷ 其配额',
          fixFirst:
            '人均覆盖排第五，因为它是决定前面那些修复能不能兑现成签约额的约束，而且要看人均而不是看整本账，理由很直接：整本账看着够覆盖，个别销售可能根本不够；一个销售压满、三个人闲着的团队，转化比同样总量平均分配的团队更差。当一个销售手上的加权管道已经够打好几倍配额，他就是这个团队的天花板：好单子被挤掉，响应时间被拉长，人均速度卡在一个「再多线索也抬不动」的位置上。招不招人之前先量这个数，因为两种结论指向相反的方向，而这个数就是判据。',
          alsoMoves:
            '它决定你该拿人还是拿线索，所以它排在填充率上面。一个手里还有空间的销售，不用改任何流程就能多吸收机会，转化率照旧，于是「补覆盖」是成本最低的增长来源。它还告诉你哪条杠杆路径最短：人均覆盖不足的地方，加管道立刻见效；已经满了的地方，剩下的杠杆只有成交率、周期和合同额，给这个人买的线索只会躺在管道里当噪声。它也给了你一个公平比较销售的框架，因为业绩达成率的差异通常跟覆盖差异同源，而不是能力差异。',
          backfire:
            '在覆盖不足之前招人，是「以为自己在增长、其实把速度做差」的经典路径。新销售手上没有管道，于是速度计算的分母（人数）立刻变大、分子没变，人均速度在一个季度里往下滑，而销售质量毫无变化，团队把这体验成「招人招得很糟」，于是接下来两年都不招。另一个版本是给一本健康的管道再配一个销售，管道被切薄到低于能舒服关单的覆盖水平，两个销售都退回从零开始填的循环。',
        },
        {
          priority: 6,
          metric: '机会填充率 —— 每人每周新增的合格机会数 ÷ 计划所需的周速率',
          fixFirst:
            '填充率放最后，因为它是四个输入里最容易灌水、也转化最慢的一个，而且是唯一一个不会在花钱的那个季度里回本的。新机会要走完一整个周期才变成签约，所以这个月推的填充率，贡献的是你还没预测过的那个季度；而上面每一行的漏点每多放一周都在花钱。它同时也告诉你前面三行值不值得放大：管道干净、周期快、成交率高之后，多一个机会才比一个季度前更值钱。它也是那个「前面都干净之后，漏斗顶偏薄不再是诊断而是事实」的指标 —— 到那一步，管道生成不再是销售问题，而是要花钱的市场与渠道问题。数量只数过了第一道资格门的合格机会，不数原始表单。',
          alsoMoves:
            '填充率是前面那些修复转化为规模的那一步。管道干净、周期短、成交率高，意味着每多一个机会比过去更值钱，于是同样一笔需求生成预算买到的签约额比两个季度前更多。它也决定你该买线索还是该招人：人均覆盖健康时，新增机会交给手里有空间的销售；人均覆盖已满时，同样的机会就是噪声，那笔钱应该去别处。还有一条信号很干净 —— 填充率在涨、成交率在跌，几乎必然意味着这批新机会的来源变了、带来的是另一种买家。',
          backfire:
            '为了凑到填充目标而买量，是让这张表上其他每一行同时变差的最快办法。不合格机会会稀释回复率、因为发现日历被占满而让所有人的周期变长、并在同一个季度压低成交率 —— 你管理的那个指标在涨，速度在三个输入上一起掉。更难看出的是从另一个买家那里买量：机会数达标了，成交率掉下来，合同结构也滑向那个渠道卖的东西 —— 一次渠道决策就悄悄作废了你前面几行搭出来的诊断。所以只数过了第一道资格门的机会。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Pipeline velocity is easy to inflate and easy to misread, and six checks decide whether the baseline behind it is real. The four inputs are pulled from the CRM over the trailing 90 days, and each one has a definition that has to be pinned before any band is read: qualified open opportunities exclude junk and disqualified deals, average contract value comes from signed contracts rather than list price, win rate is closed-won divided by all closed, and cycle length runs from first touch to closed-won rather than from opportunity creation to a forecast date. Velocity is then computed as opportunities times contract value times win rate divided by cycle days, and the health band is read off that: above USD 5,000 a day healthy, USD 2,000 to USD 5,000 worth testing, USD 500 to USD 2,000 needing intervention, below USD 500 urgent. The what-if branches then model a win rate of 30 percent together with a 30-day cycle, and the lever with the largest percentage lift is the one worth a quarter of effort rather than the one that sounds biggest. Quarterly targets follow, anchored to what has actually moved before: win rate 2-5 points, cycle 10-20 percent, contract value 5-15 percent, opportunity count 15-25 percent. The dashboard then runs weekly on all four inputs plus velocity, and the quarterly diagnosis pairs velocity with pipeline value, because a healthy pipeline with stalling velocity is a conversion problem while a light pipeline is a fill problem.',
      items: [
        {
          step: 1,
          label: 'The four velocity inputs pulled on a fixed 90-day window with fixed definitions',
          gate:
            'All four inputs (qualified open opportunities, closed-won contract value, win rate on decided opportunities, median days from first touch to closed-won) are recomputed over the trailing 90 days, junk and disqualified opportunities are excluded, and the recomputed values match the dashboard figures within 5%.',
          blockIf:
            'If any input is computed over a different population than last run — contract value at list price instead of the signed amount, win rate counting opportunities that are still open — then the velocity number is not comparable with itself week over week, and every target built on it is fictional. Fix the definition before you read the band or change anything.',
        },
        {
          step: 2,
          label: 'Daily velocity computed and read against a named health band',
          gate:
            'Daily velocity is computed as opportunities multiplied by contract value and win rate, divided by cycle in days, and the result is recorded in a named band each week together with the 4 inputs that produced it and its move from the week before.',
          blockIf:
            'Without a named band, a number that moved less than last month gets read as fine, which is how a team at the bottom of the range ends up celebrating. If the four inputs come from mixed periods — one from this quarter, another from the trailing year — the ratio has a denominator nobody can defend and the band means nothing.',
        },
        {
          step: 3,
          label: 'What-If branches run on win rate and cycle, with the leading lever named',
          gate:
            'At least 2 What-If branches are run each quarter, one lifting win rate to 30% and one compressing cycle to 30 days, and the branch with the larger percentage lift is recorded as the leading lever with the lever named in writing.',
          blockIf:
            'A branch run against a single baseline tells you where the model is most sensitive, not where the business is most stuck, because cycle sits in the denominator and lifts easily while win rate is multiplied through. Without a named leading lever, Step 4 writes four targets and the team works on all four badly.',
        },
        {
          step: 4,
          label: 'Quarterly target for every lever, expressed as a number with an owner',
          gate:
            'Each of the 4 levers carries a quarterly target with a stated basis (win rate +2-5pp, cycle -10-20%, contract value +5-15%, opportunity count +15-25%), and every target names one owner and one review date.',
          blockIf:
            'Directions without numbers produce quarters in which nobody can say whether the quarter was won. And a target with no owner is a wish: without the name and the date next to the number, all four targets get worked on at once and all four get worked on badly.',
        },
        {
          step: 5,
          label: 'Weekly velocity dashboard with five series and eight readings on record',
          gate:
            'A weekly dashboard shows daily velocity, new opportunities added, deals closed won, average closed-won contract value and average cycle, all 5 refresh within 24 hours of the weekly run, and at least 8 weekly readings exist.',
          blockIf:
            'A dashboard that refreshes monthly shows you velocity after it has already moved, and coverage drifts inside a month. Fewer than 8 weekly readings also means you cannot separate a real trend from one good week, which is exactly the error that produces a wrong Step 6 diagnosis two months later.',
        },
        {
          step: 6,
          label: 'Velocity diagnosis paired with pipeline value, ending in one written conclusion',
          gate:
            'Each quarter the velocity diagnosis is paired with the pipeline value figure and ends with exactly 1 written conclusion: either pipeline value is healthy and velocity is stalling, so the bottleneck is conversion, or pipeline value is light, so the bottleneck is fill.',
          blockIf:
            'Without the pairing, a team with light pipeline tries to fix conversion and a team with a conversion problem hires reps, and both actions look reasonable while the diagnosis was never made. If the triggering number is not written next to the conclusion, you re-run this diagnosis every quarter and reach a different answer each time.',
        },
      ],
    },
    zh: {
      intro:
        '销售速度的基线真不真、能不能拿来做决策，看六件事，而它们每一件都能以一种看起来像进展的方式坏掉。四个输入从 CRM 拉近 90 天，每个都必须在读健康带之前把定义钉死：合格开放机会剔除垃圾与失格，客单价取已签合同而不是标价，成交率是已成交除以全部关闭，周期从首次触达算到成交而不是从建机会算到预测日。速度随后按机会数 × 合同额 × 成交率 ÷ 周期天数算出来，再读带：日均 5,000 美元以上健康，2,000 到 5,000 美元可测，500 到 2,000 美元要干预，500 美元以下紧急。分支建模要同时把成交率推到 30% 和周期压到 30 天，然后看哪根杠杆的百分比提升最大——那才是值得花一个季度的，而不是听起来最大的那根。季度目标接着按历史动过的幅度锚定：成交率 2-5 个百分点、周期 10-20%、合同额 5-15%、机会数 15-25%。看板随后每周跑四个输入加速度本身，而季度诊断要把速度与管道价值放一起读：管道健康但速度卡住是转化问题，管道偏薄则是填充问题。',
      items: [
        {
          step: 1,
          label: '四个速度输入在固定的 90 天窗口、按固定定义重算',
          gate:
            '四个输入（合格开放机会数、已成交合同额、已关闭机会的成交率、首次接触到已成交的天数中位数）都按滚动 90 天重算，垃圾与失格机会被剔除，且重算值与仪表盘数值相差在 5% 以内。',
          blockIf:
            '只要有一个输入的人口范围与上次不同 —— 合同额用标价而不是已签金额、成交率把还没关闭的机会算进去 —— 速度这个数就没法和自己比，所有建立在它上面的目标都是虚构的。先把定义修好，再去读健康带，再动任何东西。',
        },
        {
          step: 2,
          label: '日速度算出来，并读入一个写明名字的健康带',
          gate:
            '日速度按「机会数 × 合同额 × 成交率 ÷ 周期天数」计算，每周记录它落在哪一条带（绿色、黄色、橙色、红色），并同时记下产出这个数的 4 个输入。',
          blockIf:
            '没有写明名字的带，这个数只要比上个月低一点就会被读成「还行」，这正是已经掉在最低一档的团队还能庆祝的原因。而如果四个输入取自不同期间 —— 一个取自本季度、另一个取自滚动一年 —— 这个比值就没有一个站得住的分母，那个带也就没有意义。',
        },
        {
          step: 3,
          label: '对成交率与周期各跑 What-If 分支，并写出领先杠杆',
          gate:
            '每个季度至少跑 2 个 What-If 分支，一个把成交率抬到 30%、一个把周期压到 30 天，提升幅度更大的那个分支被记录为本季度的领先杠杆，杠杆名称要落到文字。',
          blockIf:
            '只对着一个基线跑的分支告诉你模型对什么最敏感，不是你的生意卡在哪 —— 周期在分母上，抬起来总是容易，成交率则是被乘进去的。没有写出唯一领先杠杆，步骤 4 就会一次写四条目标，然后团队把四条都做得很差。',
        },
        {
          step: 4,
          label: '每条杠杆一个季度目标，写成数字并带负责人',
          gate:
            '四条杠杆各自带一个季度目标并写明依据（成交率 +2-5pp、周期 -10-20%、合同额 +5-15%、机会数 +15-25%），每个目标都写上一个负责人和一个复盘日期。',
          blockIf:
            '只有方向没有数字，会产出那种谁也说不清赢没赢的季度。而没有负责人的目标只是愿望：名字和日期不写在数字旁边，四条目标就会一起被动手、一起被做差，而季度末复盘时你依然无法判定这个季度算赢还是算输，于是下一次目标又退回成一个方向，这个循环再来一遍。',
        },
        {
          step: 5,
          label: '周度速度仪表盘，五条序列并留有至少八次读数',
          gate:
            '周度仪表盘展示日速度、新增机会数、已成交数、已成交平均合同额、平均周期这 5 项，全部在周跑后 24 小时内刷新，且已经留存至少 8 次周读数。',
          blockIf:
            '按月刷新的仪表盘，是等速度已经动完了才让你看见，而覆盖率一个月内就会漂。少于 8 次周读数也意味着你分不清趋势和某一个好周 —— 而这恰好就是两个月后做出一个错误步骤 6 诊断的那个错误。',
        },
        {
          step: 6,
          label: '速度诊断与管道价值配对，收敛到一条写下来的结论',
          gate:
            '每个季度把速度诊断与管道价值数字配对，收敛到恰好 1 条写下来的结论：要么管道价值健康而速度停滞，瓶颈在转化；要么管道价值偏少，瓶颈在管道填充。',
          blockIf:
            '不做配对，管道偏少的团队会去修转化、转化有问题的团队会去招人 —— 两个动作看上去都合理，而诊断从头到尾就没做过。如果触发结论的那个数字没写在结论旁边，你每个季度都会重做一次诊断，并且每次得到不一样的答案。',
        },
      ],
    },
  },
};
