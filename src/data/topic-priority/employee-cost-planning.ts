// P166 —— H 类（Hiring & Team）主题「employee-cost-planning」的新形态内容。
//
// ⭐ 这一层写的是什么（与既有散文的分工）
// --------------------------------------------
// · 既有 howToUse（基准页 4 个指标）说的是「选哪一行 → 单一动作」：一个指标 → 一件事。
// · 既有 howToApply（指南页 6 步）说的是「做什么」：全负荷 → 爬坡 → 流失 → 加总 → 季度目标 → 压力测试。
// · 本文件的 fixPriority 说的是**指标之间的排序与联动**：多个指标同时不达标时，先修哪一个、
//   它顺带带动哪一个、以及在什么条件下这次修复会把另一个指标修坏。
//   既有散文里没有这一层 —— howToApply 的顺序只是「做什么」，没有「同时不达标时先动谁」。
// · 本文件的 readinessChecklist 说的是**每一步的达标线**：howToApply 只说做什么，
//   不说什么算过了；这里给出今天就能核对的数量线，以及不达标时具体卡在哪一步。
//
// 口径纪律（本主题讲的是创始人自己的经营阈值，不是市场价 ⇒ 金额可手写，但必须带口径）：
//   · 金额一律 USD，且标明是「底薪」「全负荷薪资」还是「年预算」
//   · 比率一律写明分子与分母，以及期间（滚动 12 个月实际值 / 本季度目标值）
//   · 行业基准只在必要处引用并标明来源方，不与自家实测值混算
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A hiring plan is three budgets wearing one number, and the arithmetic only works if you keep them apart. The fully-loaded multiplier is the layer most companies get closest to right, because benefits at 25-30% of base, payroll tax at 8-10% and overhead at 10-20% are all quotable: below 1.25x is excellent, and above 1.40x in the US or 1.50x in China usually points at a benefits vendor or a management layer nobody has audited. In China the statutory social-insurance and housing-fund stack plus supplementary benefits adds 40-50% above base on its own, so a 300K base salary loads to 420K-450K before you count equipment or management allocation. The ramp layer is where the spreadsheet lies to you: a new hire runs at roughly half productivity for three to six months, so an IC who needs eight weeks instead of four is a full quarter of output you budgeted as if it already existed, and a first-time manager runs about twice the IC ramp time. The attrition layer decides how much hiring you actually have to do, which makes a 15% voluntary rate not a culture metric alone but a second salary line. Sum the three for a 100-person company at 120K average base and you get 15.6M of payroll at a 1.30x multiplier, plus one and a half to three million of ramp drag on a quarter of turnover, plus 900K to 3.6M of attrition cost on 15% voluntary, for 18M to 22M in total — not the 12M a headcount spreadsheet shows. Read the rows as a dependency chain: a fully-loaded figure computed on a wrong base makes every percentage below it wrong in the same direction.',
      rows: [
        {
          priority: 1,
          metric: 'Fully-loaded cost multiplier per role (base salary x (1 + benefits% + payroll tax% + overhead%), computed per role and compared with the 1.30x company average)',
          fixFirst:
            'Fix the multiplier first because every other number in this plan is expressed as a percentage of base salary, so while it is wrong you are scaling a wrong unit: a 25-30% understatement of the multiplier turns a ramp or attrition figure that looks small into a budget miss that only surfaces at year-end close. It is also the only row on this table that depends on nobody else. Benefits vendors, payroll tax rates and equipment procurement all involve a counterparty who can say no; the multiplier is a decomposition you rebuild from your own payroll register and your own invoices. Rebuild it per role rather than company-wide, because a single blended average hides that one team carries a 1.55x load while another sits at 1.18x, and a company-wide renegotiation then either over-corrects the cheap team or under-corrects the expensive one.',
          alsoMoves:
            'A corrected multiplier changes what the other four rows are worth, because it converts each of them from a percentage into money. A 0.2x gap on a company whose annual base payroll is USD 12,000,000 is USD 2,400,000 of budget that either exists or does not, and that is the difference between a retention programme you can fund and one you have to argue for. It also resets the hiring ROI test: the usual rule is that a new hire has to return 3x their fully-loaded cost in year one, and at 1.50x that is 3x a number 20% larger than the founder had in mind. Finally, because overhead is one of the four components, decomposing the multiplier is what surfaces the equipment and licence spend that belongs with the people budget and usually sits in a technology budget instead.',
          backfire:
            'The multiplier can be moved in the wrong direction and every number on this table gets worse at the same time. Cutting benefits to bring the ratio down is the classic version: benefits are the component employees feel on every payday, healthcare premiums move with inflation rather than with cost discipline, and a benefits cut that removes the health contribution or raises deductibles shows up two quarters later as voluntary attrition, which is a far more expensive line to repair than the premium you saved. The quieter version is reclassifying a worker as a contractor to remove the employer payroll tax line; that is a tax exposure rather than a saving, and in an audit it becomes a retroactive liability with interest. If your multiplier is already between 1.25x and 1.35x, the honest answer is that this row is done and the money is elsewhere — do not cut a benefit to make a number look tidier.',
        },
        {
          priority: 2,
          metric: 'Voluntary attrition rate feeding the headcount plan (voluntary leavers ÷ average headcount over the trailing 12 months, with involuntary terminations counted separately rather than netted off)',
          fixFirst:
            'Fix the attrition rate second because it is the multiplier on every cost that follows it. One departure does not cost what five departures cost: the same per-leaver cost multiplied by the number of people who actually left, and each of those leavers also has to be re-onboarded, which is the ramp drag in row three arriving a second time. It is also the first row on this table whose remedy sits with other people — a manager, a compensation band, a career path — so it moves more slowly than the multiplier, which is why you start it while you are still working through the rows below. Split the rate by team before you set any target on it: one company-wide number of 15% can be 6% in engineering and 31% in support, and a single target of 13% for everybody will push the retention budget toward the team that was never going to leave.',
          alsoMoves:
            'A lower voluntary rate reaches back through the whole budget. It thins the attrition layer in row four simply because fewer people leave, and it thins the ramp layer in row three because ramp is paid per new hire and a team that retains people hires less. Most of all it changes the planning basis: at a 15% rate, net hiring is 85% of gross hiring, so a plan that forecasts 20 hires against a 100-person team is really planning for 17, and the gap between those two numbers is set by this row rather than by the recruiting plan. That is also why this row sits above the two that price a departure: they describe what one departure costs, this one describes how many there will be.',
          backfire:
            'Chasing the rate with cash can improve the rate and damage the budget it is supposed to protect. A retention bonus paid on the way out is cheap against a replacement, but the moment one team has taken one, the next resignation in that team prices the same bonus into its own exit, so the per-leaver number stops improving even while the headline rate does — the saving is real for one quarter and then it is payroll. The opposite error is believing a rate that is too low. A voluntary rate under the band for your industry usually means terminations are being coded differently, or that nobody is realistically able to leave, and either way the problem resurfaces later as a quality slide or a cluster of resignations. Before you act on the rate, compare your definition with the one behind your benchmark and check how many terminations are booked as involuntary.',
        },
        {
          priority: 3,
          metric: 'Ramp time to first full productivity (weeks from start date to the point where the role reaches full output, measured per role against the IC and Manager ceilings)',
          fixFirst:
            'Fix ramp third because it is the largest per-hire number in the plan and the only one you can change without negotiating with anybody. Recruiting fees are mostly fixed, benefits are mostly contractual and attrition is mostly a function of other people — but the first 90 days are yours: pre-onboarding, the scope of the first real deliverable, the 30/60/90 plan, the weekly manager one-to-one that starts on day one rather than week three. At the usual assumption of 50% productivity during ramp, every extra week of ramp is a week of salary paid for output that does not exist, and the guide puts the total drag at 50-100% of annual salary. Set the target before you look at the average, because an average hides the problem: a median of 6 weeks with a tail of 20 weeks means a handful of hires carry most of the drag, and those are the hires worth examining.',
          alsoMoves:
            'Shortening ramp moves the attrition cost per leaver, because replacement cost is built out of recruiting plus ramp plus lost productivity, and ramp is one of its three components: if your replacement starts producing in 6 weeks instead of 14, the ramp component of the next departure falls by more than half. It also moves the fully-loaded picture indirectly, because a hire who reaches output inside the first quarter is generating revenue against a cost that was already committed, which changes how long payback takes even though the multiplier itself does not move. And a shorter ramp reduces the second-order term nobody budgets: a manager who is not onboarding four people at once is spending the same attention on the people who are already employed.',
          backfire:
            'Ramp can be compressed in ways that make every other row worse. The fastest way to hit an 8-week ramp target is to lower the hiring bar and start people on tasks they are ready for, which produces a green ramp metric and a higher voluntary attrition rate two quarters later, because people who failed the real job leave in the first 6 months. The other version is measurement theatre: counting ramp as the point where the new hire ticks off their own onboarding checklist, rather than the point where they ship something a customer or a paying colleague depends on. If the ramp number improves while 90-day retention falls, the ramp metric was never measuring productivity. Judge it on output, and keep it paired with the 90-day survival rate.',
        },
        {
          priority: 4,
          metric: 'Cost of one departure inside the budget (recruiting plus ramp plus the productivity the team loses, all as a share of that leaver pay, worked out per cohort rather than as one company average)',
          fixFirst:
            'Fix the per-leaver cost fourth because it is an output of the three rows above rather than an input to them: you cannot make a replacement cheaper in isolation, because the recruiting fee depends on the market, the ramp component depends on row three, and the lost productivity depends on how long the team takes to absorb the departure. The number you can actually move sits inside it: which of the three components is doing the damage. A departure priced at 180% of pay is not a single problem, it is three stacked ones — a recruiting share above 20% says you are buying externally what you could staff internally, a ramp share above 40% says each backfill restarts from zero, and a productivity share above 100% says the team absorbs the vacancy while it waits. Squeezing a figure that mixes all three is why budgets stay wrong. Break it out by cohort and by role band, because one percentage spread across senior and junior roles hides the fact that your senior departures are the expensive ones.',
          alsoMoves:
            'This figure also sets what a retention spend is allowed to be. A save only makes sense if it costs less than the replacement it avoids — at 150% of pay a 15% offer is obviously worth making, at 40% the same offer is a giveaway. It re-ranks where a retention budget belongs: 50-100% of pay for an IC against 150-200% for a manager means the money should reach managers first, even though they are a small fraction of headcount. And it is what makes row five honest, because a bad quarter costs leavers multiplied by their cohort cost, not a single company percentage multiplied by a headcount.',
          backfire:
            'A per-leaver figure can look rigorous and still be wrong in the expensive direction. The usual mistake is to spread one headline percentage across every role: the SHRM 50-200% band is a range that varies by role, and its midpoint applied to everybody flatters the cheap departures and understates the senior ones several times over — which in practice means the retention budget lands where the money is not. Another mistake is keeping severance out of this number, which makes involuntary departures look free and quietly invalidates every voluntary-versus-involuntary split you rely on. And the number can improve on paper for the wrong reason: shrink the ramp assumption instead of improving the ramp, and the cost of a leaver falls while the real replacement still takes a year to become productive.',
        },
        {
          priority: 5,
          metric: 'Total annual people cost against the funded headcount plan (fully-loaded payroll plus ramp drag plus attrition cost, divided by the approved annual people budget)',
          fixFirst:
            'Do the sum last, because until each of the four rows above is measured separately, the total tells you only that something is wrong, not where. The failure mode this row prevents is the one where the overrun is discovered at the runway review: a founder who budgets base salary for 100 people finds that fully-loaded payroll, ramp drag and attrition together land 50% higher, and at that point the only available moves are a freeze or a fundraise, both of which cost far more than the sum of the four component fixes. Summing early is what makes the total actionable, because every row above now carries a number you can re-run after a change. The total also needs a period and a definition: trailing 12 months of actual payroll plus recruiting invoices plus a stated ramp assumption, compared with the same 12 months of budget, otherwise you are comparing a year of spend with a quarter of plan.',
          alsoMoves:
            'The total is what makes the stress test in the guide meaningful. A headcount plan that survives a 20% rise in attrition and a 50% slowdown in ramp is only trustworthy if the baseline it was stressed from was built up rather than assumed, and that baseline is this row. It also determines how many hires the runway supports, which is the number the board actually asks for — net hires after attrition, not gross hires — and gross-versus-net is exactly where a plan built without rows two and three overstates capacity by 15-20%. Finally, once the total is a single number, it can be compared with the revenue per FTE that the pricing decision assumed, which is where a people plan and a go-to-market plan usually quietly disagree.',
          backfire:
            'A total that is used as a trigger rather than as a measurement is how a hiring freeze causes more damage than the overrun it prevented. If the rule is that you freeze when the total exceeds budget, the freeze lands in the same quarter as a revenue dip and on the roles whose ramp you were counting on to fix the problems in rows two and three, so the overrun compounds rather than closes. There is also the sequencing error of freezing hiring on a number built with a single global ramp assumption and one blended attrition rate, in which case the freeze is aimed at the wrong people. And the clearest trap is forecasting on gross hires: a plan for 20 hires against a 100-person team at 15% attrition is a plan for 17 people, and treating it as 20 quietly removes three roles of capacity from the revenue model.',
        },
      ],
    },
    zh: {
      intro:
        '一份招人计划是三个预算穿着一件衣服，算得对的前提是把它们分开。全负荷倍数是大多数公司最接近算对的一层，因为福利占底薪 25-30%、工资税 8-10%、管理费 10-20%，都是可以逐项报出来的：1.25x 以下算优秀，而美国超过 1.40x、中国超过 1.50x，通常指向一个没人审过的福利供应商或者一层管理费。中国的社保和公积金加补充福利本身就能在底薪之上加 40-50%，所以 30 万底薪的全负荷成本是 42 万到 45 万，设备和分摊的管理费还得再加。爬坡这一层是表格骗你的地方：新人前 3 到 6 个月通常只有大约一半产出，所以一个本该 4 周到岗的 IC 用了 8 周，意味着你预算里有一整个季度的产出其实不存在；而首次带人的经理，爬坡时间大约是 IC 的两倍。流失率这层决定你到底还得招多少人，于是 15% 的主动流失率不只是文化指标，它是第二条薪资线。把三层加起来看：100 人、平均底薪 12 万的公司，1.30x 工资总额是 1,560 万，25% 流失对应 150 万到 300 万的爬坡拖累，15% 主动流失对应 90 万到 360 万的换人成本，合计 1,800 万到 2,200 万 —— 而不是人头表上写着的 1,200 万。请按依赖链读下面这些行：在算错了的底薪基数上算出来的倍数，会让下游所有百分比朝同一个方向错。',
      rows: [
        {
          priority: 1,
          metric: '每岗位的全负荷倍数（底薪 ×（1 + 福利% + 工资税% + 管理费%），逐岗位计算并与 1.30x 的公司均值对比）',
          fixFirst:
            '先把倍数修对，因为这张表上其它每一个数字都是底薪的百分比，倍数不对时你就是在用一个错误的单位去放大：低估 25-30% 会让本来看着不大的爬坡与流失数字变成一个只在年末结账时才现形的预算缺口。它也是表上唯一一行不依赖任何别人的——福利供应商、工资税率、设备采购都有一方可以说不；而倍数是你用自己的工资台账和发票就能重新拆出来的东西。逐岗位重算而不是算公司平均，因为一个平均数会把「某个团队背 1.55x、另一个团队 1.18x」这件事抹平，而按公司平均去谈判，结果要么把便宜的团队改贵，要么把贵的团队放过。',
          alsoMoves:
            '倍数修正之后，表上另外四个数字才有了金额意义——因为它们都从「底薪的百分之多少」变成了钱。一家年基本工资总额 USD 12,000,000 的公司，0.2x 的差距就是 USD 2,400,000 的预算：这笔钱存在与否，决定了留任项目是「有钱可花」还是「要靠说服」。它同时重置了招聘 ROI 的判断线：通常要求新人首年产出 3 倍全负荷成本，而在 1.50x 下那 3 倍对应的基数比创始人以为的大 20%。另外，管理费是倍数的四分项之一，拆倍数正好会把那些本该算在人头预算、实际躺在技术预算里的设备与软件费用暴露出来。',
          backfire:
            '倍数还能被往错的方向调，而那样会让表上每一个数字同时变坏。最经典的是砍福利来压比例：福利是员工每个月都能感觉到的分项，医保保费跟着通胀走而不是跟着节俭走，砍掉健康缴费或提高自付额，两个季度之后会以主动流失的形式还回来，而补一条流失比省下保费贵得多。更隐蔽的是把员工改成分包以去掉雇主工资税那一行——这不是省钱，是税务敞口，被查就是带利息的追溯补缴。如果你的倍数已经落在 1.25x-1.35x 之间，诚实的结论是这一行做完了、钱在别处：不要为了把数字弄好看去砍福利。',
        },
        {
          priority: 2,
          metric: '进入人头预算的主动流失率（主动离职人数 ÷ 平均在册人数，滚动 12 个月，被动离职单列而不做净额抵消）',
          fixFirst:
            '流失率排第二，因为它是后面所有成本的乘数。走一个人和走五个人不是一回事：单人成本不变，但人数一乘，再叠加每个补位的人都要重新爬坡一遍——也就是第三行的爬坡拖累要再付一次。它也是这张表上第一行「药方要开在别人身上」的数字：要动的是经理、薪酬带宽、晋升路径，所以它比倍数慢，正因为慢才要趁你还在处理下面几行的时候先启动它。定目标之前先按团队拆开看：一个全公司 15% 的数字可能意味着工程 6%、客服 31%，而一个对所有人都一样的 13% 目标，会把留任预算推向那个本来就不会走的团队。',
          alsoMoves:
            '主动流失率下降会往回影响整份预算：第四行的流失层因为走的人少而直接变薄，第三行的爬坡层也因为招人少而变薄——爬坡是按每个新人付钱的，而留住人就是少招人。最要紧的是它改变了规划口径：在 15% 的流失率下，净增员是毛增员的 85%，所以一个「100 人团队招 20 人」的计划其实是按 17 人在做，而这 3 个人的差额是流失率决定的，不是招聘计划决定的。',
          backfire:
            '用钱追流失率，可能让流失率好看而它本该保护的预算变坏。离职门前的留任奖金对着一次替换来说很便宜，但某个团队拿过一次之后，那个团队的下一个离职就会把同样的奖金算进自己的退出成本，于是单人数字不再改善，尽管标题上的流失率在降——这一季是真省了，之后它就是固定工资。另一个错误是把「低得可疑」的流失率当成好消息：低于行业区间通常意味着离职被换了编码，或者实际上没人能走，而问题会以质量下滑或成簇辞职的形式在后面冒出来。动手之前，先把你的口径和基准背后的口径对齐，再看有多少离职被记成被动。',
        },
        {
          priority: 3,
          metric: '达到完整产出的爬坡周数（从入职到该岗位达到满负荷输出的周数，按岗位分别对比 IC 与 Manager 的上限）',
          fixFirst:
            '爬坡排第三，因为它是计划里单人最大的一块，也是唯一一件你不用和任何人协商就能改的事。招聘费基本是固定的，福利基本是合同定的，流失基本取决于别人——但头 90 天是你自己的：入职前准备、第一个真正交付物的范围、30/60/90 计划、以及从第一周就开始的经理一对一。在爬坡期按 50% 生产力算的常见假设下，爬坡每多一周，就是多付一周没有对应产出的工资，指南把总拖累放在年薪的 50-100%。先定目标再看平均，因为平均数会盖住问题：6 周的中位数配上一个 20 周的尾巴，意味着少数几个新人扛着大部分拖累，而这些正是值得逐个看的。',
          alsoMoves:
            '缩短爬坡会带动单人换人成本，因为换人成本由招聘加爬坡加生产力损失三部分组成，爬坡是其中之一：补位的人 6 周能出活而不是 14 周，下一次离职的爬坡分项就少了一半以上。它也会间接影响全负荷口径——一个在第一个季度内就能出活的人，是在已经发生的成本上产出收入，这会改变回本周期，尽管倍数本身没动。它还减少了没人预算的那一项：同时带四个新人的经理不需要把同样的注意力分给四个，注意力本身是成本。',
          backfire:
            '爬坡也可能被「压」快，而那会让其它每一行都变差。最快做出一个 8 周爬坡数字的办法是降低招聘门槛、让新人先做他能力范围内的活，于是爬坡指标变绿，两个季度后主动流失率上升——因为没通过真实考验的人在头 6 个月离开。另一个版本是指标表演：把爬坡算成新人自己勾完入职清单的那天，而不是他交付了客户或同事依赖的东西的那天。如果爬坡数字在改善而 90 天留存在下降，说明这个指标从来没在量生产力。用产出验收，并且和 90 天存活率一起看。',
        },
        {
          priority: 4,
          metric: '一次离职在预算里的代价（招聘费 + 爬坡 + 团队损失掉的产能，全部折成该离职者薪资的份额，按群体分别算，而不是一个公司平均数）',
          fixFirst:
            '单人换人成本排第四，因为它是前三行的产出而不是输入：换人成本没法单独压便宜，招聘费由市场决定、爬坡分项取决于第三行、生产力损失取决于团队吸收一次离职要多久。你能动的，是弄清楚这三个分项里到底是哪一个在放血。一次离职按 180% 年薪计价，不是单一问题，而是三个叠在一起的问题——招聘占比超过 20% 说明你本可以内部补的岗在向外买，爬坡占比超过 40% 说明每个补位都从零重开，产能占比超过 100% 说明团队在等待期间还在扛活。盯着一个把三样混在一起的数字，预算就会一直错下去。按群体和按职级带分别拆，因为一个对所有岗位一刀切的百分比会盖住「高级岗位的离职才是贵的」这件事。',
          alsoMoves:
            '这个数字还规定了留任支出可以有多大。一次挽留只有在比它挡下的那次替换便宜时才成立——离职成本是年薪 150% 时，15% 的报价显然值得做，只有 40% 时同样的报价就是白送。它也重排了留任预算该先去哪儿：IC 是年薪的 50-100%、经理是 150-200%，同样的百分比对经理意味着大得多的钱，于是钱应该先给经理，哪怕经理只占很小一部分人头。它也是第五行能诚实的前提，因为一个糟糕季度的成本是「离职人数 × 该群体成本」，而不是一个公司平均百分比乘以一个头数。',
          backfire:
            '单人成本可以算得很精确，却精确地错在要命的方向。最常见的错是拿同一个百分比去套所有岗位：SHRM 的 50-200% 本来就是跨岗位的区间，把中位数套给所有人，会把高级岗位的离职低估两三倍、把初级岗位高估，落到操作上就是你在最贵的地方舍不得花钱、在便宜的地方多花钱。还有一种错是把遣散费留在这一行之外，于是被动离职看起来是免费的，你依赖主动/被动拆分做出的每一个留任决定都失去了依据。而这个数字也可能因为纸面原因变好：缩小了纸上的爬坡假设、而不是真的改进了带人流程，这时年流失成本正好被低估了你本来想找到的那一段。',
        },
        {
          priority: 5,
          metric: '年度人力总成本与已批人头预算之比（全负荷薪资 + 爬坡拖累 + 流失成本，再除以已批准的年度人力预算）',
          fixFirst:
            '加总放在最后，因为只要上面四行还没有分别被量出来，总数只会告诉你「有问题」，不会告诉你在哪。这一行要防的正是那个失败模式：超支是在跑道评审上才被发现的——一个只按底薪预算 100 人的创始人，发现全负荷薪资、爬坡拖累和流失加起来高出 50%，而那时能动的只有冻岗或融资，两者都比把四个分项修掉贵得多。早点加总才能让总数变得可执行，因为上面每一行现在都有一个你改完之后可以重跑的数。这个总数还要带期间和定义：滚动 12 个月的实付薪资加招聘发票加一条写明的爬坡假设，再和同样 12 个月的预算比，否则你是在拿一年的支出比一个季度的计划。',
          alsoMoves:
            '总数是让指南里那次压力测试有意义的东西。一个能扛住「流失 +20%、爬坡 +50%」的人头计划，只有在它被压测的那个基线是一层层搭出来而不是假设出来的时候才可信，而那个基线就是这一行。它也决定跑道能撑多少人，而董事会真正问的是净增员（扣掉流失之后）而不是毛增员，毛减净这个差额正是第二、三行决定而不是招聘计划决定的。最后，总数变成一个可以比较的数字之后，它就能和定价决策里假设的「每 FTE 收入」对齐——人头计划和获客计划通常就是在这一个地方悄悄地互相矛盾。',
          backfire:
            '把总数当成触发器而不是度量，就会让一次冻岗造成的伤害大于它要防掉的超支。如果规则是「总数超预算就冻岗」，那冻岗会正好落在营收下滑的同一个季度，而且落在你本来指望其爬坡去解决第二、三行问题的岗位上——于是超支不是被关上，而是被放大。另一个顺序错误是：在一个用「一个全局爬坡假设 + 一个混合流失率」搭出来的总数上冻岗，那说明你冻错了人。还有一个最典型的陷阱是按毛增员预测：100 人团队在 15% 流失率下「招 20 人」其实是招 17 人，按 20 人算就悄悄从收入模型里抹掉了三个人的产能。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Ramp time and attrition are the two layers a headcount plan usually carries without evidence, so the lines here start with what can actually be pulled out of a system. The fully-loaded multiplier needs a benefits percentage, a payroll tax percentage and an overhead figure attached to a named role, not a company average, because a company average hides exactly the roles running at 1.5x while the average stays respectable. Ramp time needs a start date and a definition of productive, and the two are where the usual argument lives: if one team counts a hire productive at first ticket and another counts it at full quota, the two numbers are not comparable and the spread between them is not performance. Attrition needs the voluntary and involuntary split separated, with the regrettable share identified, because a company that fires its low performers and loses its good ones can show a rate that looks average while being the most expensive place to work. Once those three are real, the annual people budget follows: payroll at the loaded multiplier, ramp drag on the incoming share of headcount, and attrition cost per leaver times the annual leaver count. The stress case is the last line and it is the one that changes decisions: a 20% jump in attrition or a 50% slowdown in ramp has to be survivable without a raise, or the plan was never a plan.',
      items: [
        {
          step: 1,
          label: 'Per-role fully-loaded cost model with every role computed',
          gate:
            'Every role in the plan has its own fully-loaded figure built from base salary plus a benefits percentage, a payroll tax percentage and an overhead figure, and the company-weighted result is within 0.05x of the 1.30x benchmark; at least 90% of payroll is covered by a role that has actually been computed, and the remainder is listed as an open item rather than rolled into the average.',
          blockIf:
            'If a meaningful share of the plan is still budgeted at base salary, then the ramp and attrition figures you compute next are percentages of an understated base, and every saving you forecast is measured against a number that was never true. Finish the decomposition per role first — it is a few hours of pulling the payroll register and the vendor invoices — because nothing downstream can be checked until it exists.',
        },
        {
          step: 2,
          label: 'Ramp weeks modelled per role with dated 90-day OKRs',
          gate:
            'Each role has a modelled ramp in weeks against a stated industry complexity assumption, with the median IC ramp at or below 8 weeks and the median manager ramp at or below 16 weeks; every new hire of the last 2 quarters has first-90-day OKRs written down with a week-12 landing date.',
          blockIf:
            'Without dated first-90-day OKRs you cannot tell a fast ramp from a slow one, because ramp is measured on output rather than on time served. When the OKRs are missing, the ramp average becomes an artefact of when people were hired, and the drag you are budgeting is the drag of an unmanaged first quarter rather than the ramp of a designed onboarding. Write the OKRs and the week-12 date before you rerun the ramp numbers.',
        },
        {
          step: 3,
          label: 'Attrition cost computed for every leaver of the trailing year',
          gate:
            'Each departure of the trailing 12 months carries a price built from that person pay, the channel you recruited through, the weeks before they produced, and the months the team carried the gap, with the 1.5x manager factor applied; the cohort median lands at or under 100% of pay and the priciest cohort is written down by name.',
          blockIf:
            'If some leavers have no cost attached, then the average is not an average of anything, and the annual turnover figure you build in the next step will understate the number of people you actually replaced. A cohort that was never computed usually turns out to be the expensive one, because the roles that are hard to replace are also the ones nobody bothers to price. Compute the whole trailing 12 months before you compute anything annualised.',
        },
        {
          step: 4,
          label: 'Three-layer people budget reconciled against four quarters of actuals',
          gate:
            'The annual people budget equals fully-loaded payroll plus ramp drag plus attrition cost, and the model reconciles to within 5% of what payroll plus recruiting plus backfill actually spent over the last 4 quarters, with every difference between model and actual explained in one line.',
          blockIf:
            'A model that misses actual spend by more than 5% has at least one fictional layer in it, and the usual culprit is a ramp assumption carried over from a model rather than from your own hires. Until the three layers reconcile against four quarters of actuals, the budget is a forecast with three decimals of false confidence, and every hiring decision taken against it inherits the error. Reconcile first, then re-forecast.',
        },
        {
          step: 5,
          label: 'Four quarterly targets with current values and named owners',
          gate:
            'The fully-loaded multiplier at or below 1.30x, voluntary attrition at or below 13%, median IC ramp at or below 8 weeks, and attrition cost per leaver at or below 100% of salary are each written down with the current measured value, a named owner and a review date inside the next 90 days.',
          blockIf:
            'A target without a current value is a wish, and a target without an owner is a wish that nobody checks. When the four lines are aspirational rather than measured, the quarterly review becomes a status meeting about sentiment, and the one quarter where attrition spikes gets explained away instead of acted on. Put the current value next to each target before you set the calendar, and only then decide which one you are chasing first.',
        },
        {
          step: 6,
          label: 'Attrition and ramp stress scenarios run against the plan',
          gate:
            'Two scenarios have been run on the same model: voluntary attrition 20% above plan and ramp 50% slower than plan, and after both are applied the runway still covers at least 6 months of fully-loaded payroll; if it does not, the hiring plan for the next 2 quarters has been revised.',
          blockIf:
            'If the plan does not survive a 20% attrition rise, then the headcount number on the roadmap was never funded and the company is one bad quarter away from a hiring freeze it cannot afford to take. Running the stress test late means finding this out during a revenue dip, when the only levers left are the ones that cost the most. Run both scenarios before the plan is committed, and write the freeze rule down while you are still calm.',
        },
      ],
    },
    zh: {
      intro:
        '爬坡时间和流失率通常是招人计划里唯二没有证据支撑的两层，所以这两条线要从系统里真正拉得出来的数开始。全负荷倍数要绑在一个具体岗位上：福利比例、工资税比例、管理费数字，而不是公司平均值 —— 公司平均值恰好会盖住那些实际跑在 1.5x 的岗位，而平均值本身看着还很体面。爬坡时间要有起始日和一个「算产出了」的定义，也正是争议住在的地方：如果一个团队把新人第一次处理工单就算有产出，另一个团队要算满配额，那两个数不可比，而它们之间的差也不是绩效。等这两条线有了真数，年度人力预算才成立：按全负荷倍数算工资总额，加上新人那部分的爬坡拖累，加上单人换人成本乘年度离职人数。压力情形是最后一条，也是唯一能改变决策的那条：流失率跳升 20% 或者爬坡慢一半，必须在不融资的前提下扛得住，否则那从来就不是一份计划。',
      items: [
        {
          step: 1,
          label: '逐岗位的全负荷成本模型，每个岗位都单独算过一遍',
          gate:
            '计划里每个岗位都有自己的全负荷数字，由底薪加福利百分比、工资税百分比和管理费数字构成，公司加权后的结果与 1.30x 基准相差不超过 0.05x；至少 90% 的薪资被「已经算过的岗位」覆盖，剩下的部分被单独列成待办，而不是被摊进平均数。',
          blockIf:
            '如果还有相当一部分计划只按底薪预算，那接下来算出来的爬坡与流失数字就是建立在一个被低估的基数上的百分比，你预测的每一点节省都是和一个从来不成立的数字在比。先把逐岗位的拆分做完——这只是几小时的工资台账加供应商发票，而在它存在之前，下游没有任何一步可以被核对。',
        },
        {
          step: 2,
          label: '按岗位建模的爬坡周数与带日期的首 90 天 OKR',
          gate:
            '每个岗位都有按周计的爬坡模型，对着一条写明的行业复杂度假设，中位 IC 爬坡不超过 8 周、中位经理爬坡不超过 16 周；最近 2 个季度的每个新人都写了首 90 天 OKR，并且标着第 12 周的落地日期。',
          blockIf:
            '没有标日期的首 90 天 OKR，你就分不清爬坡快还是慢，因为爬坡是按产出量的，不是按在职天数量。没有 OKR 时，爬坡平均值会变成「入职时间的长短」的假象，你预算的拖累其实是「没有设计的第一个季度」的拖累，而不是设计过的入职流程的拖累。先写 OKR 和第 12 周日期，再重跑爬坡数字。',
        },
        {
          step:3,
          label: '过去 12 个月每个离职者都有算出来的换人成本',
          gate:
            '滚动 12 个月内的每一次离职都带着一个价格：由该员工薪资、你走的招聘渠道、他出活之前的周数、以及团队扛着空缺的月数合成，经理按 1.5 倍数计入；群体中位数落在薪资的 100% 以内，最贵的那一个群体被单独写下名字。',
          blockIf:
            '如果有一部分离职者没挂上成本，那么那个平均值就不是任何东西的平均，你接下来在第四步年化的数字会低估你实际换掉的人数。没算的群体通常正好是最贵的那一个——难替换的岗位也是没人愿意定价的岗位。先把过去 12 个月全部算完，再做任何年化。',
        },
        {
          step: 4,
          label: '三层人力预算与过去四个季度的实际支出逐项对账',
          gate:
            '年度人力预算等于全负荷薪资加爬坡拖累加流失成本，并且模型与过去 4 个季度「实付薪资 + 招聘支出 + 补位支出」的对账差异在 5% 以内，模型与实际的每一处差异都用一行字说明。',
          blockIf:
            '模型与实际支出相差超过 5%，说明至少有一层是虚构的，最常见的元凶是从别的模型里搬过来、而不是从你自己招的人身上量出来的爬坡假设。在与四个季度实际对账之前，这份预算是一个带着三位小数假精度的预测，而每一个基于它做出的招聘决定都会继承这个误差。先对账，再重新预测。',
        },
        {
          step: 5,
          label: '四个季度目标都带当前测得值、责任人与复核日期',
          gate:
            '全负荷倍数 ≤1.30x、主动流失率 ≤13%、IC 爬坡中位数 ≤8 周、单人换人成本 ≤年薪 100%——这四条各自写下了当前测得的值、一个责任人，以及未来 90 天内的复核日期。',
          blockIf:
            '没有当前值的目标是愿望，没有责任人的目标是没人会看的愿望。这四条一旦停留在「期望」而不是「实测」，季度复核就变成一场关于氛围的会议，而真正需要处理的那个流失上升的季度，会被解释掉而不是被处理掉。先把当前值写到每条目标旁边，再决定你要先追哪一条。',
        },
        {
          step: 6,
          label: '流失与爬坡两种压力场景都在同一个模型上跑过',
          gate:
            '同一个模型上跑过两个场景：主动流失比计划高 20%、爬坡比计划慢 50%；两个都施加之后，跑道仍能覆盖至少 6 个月的全负荷薪资；若不能，未来 2 个季度的招聘计划已经改过。',
          blockIf:
            '如果计划扛不住「流失 +20%」，说明路线图上那个人头数字从来就没有被预算覆盖，公司离一次承受不起的冻岗只差一个坏季度。压力测试跑得太晚，意味着在营收下滑时才发现自己扛不住，那时剩下的杠杆都是最贵的。定方案之前就把两个场景跑完，并且趁你还冷静的时候把冻岗规则写下来。',
        },
      ],
    },
  },
};


