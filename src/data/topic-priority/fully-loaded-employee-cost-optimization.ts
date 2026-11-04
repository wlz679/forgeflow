// P166 —— H 类（Hiring & Team）主题「fully-loaded-employee-cost-optimization」的新形态内容。
//
// ⭐ 这一层写的是什么（与既有散文的分工）
// --------------------------------------------
// · 既有 howToUse（基准页 8 行）说的是「选哪一行 → 单一动作」：倍数、福利构成、工资税、
//   股权、地域比、签字奖金摊销、医保通胀，各自对应一个动作。
// · 既有 howToApply（指南页 8 步）说的是「做什么」：列分项 → 算倍数 → 福利审计 → 工资税 →
//   管理费 → 地域变体 → 签字奖金摊销 → 每次续约重对。
// · 本文件的 fixPriority 说的是**分项之间的排序与联动**：多个分项同时超标时先动哪一个、
//   它顺带改变哪一个、以及在什么条件下这次调整会把另一个分项弄坏。
//   既有散文里没有这一层 —— howToApply 的分项顺序只是「做什么」，没有「先动谁」。
// · 本文件的 readinessChecklist 说的是**每一步的达标线**：howToApply 只说做什么，
//   不说什么算过了；这里给出今天就能核对的数量线，以及不达标时具体卡在哪一步。
//
// 口径纪律（本主题讲的是创始人自己的经营阈值，不是市场价 ⇒ 金额可手写，但必须带口径）：
//   · 金额一律 USD，且写明是「单岗位年成本」「奖金年摊销」还是「人均」
//   · 倍数一律写清公式：底薪 ×（1 + 福利% + 工资税% + 管理费%），并标明是单岗位还是公司加权
//   · 地域比一律写成分母形式：候选地区该岗位全负荷年成本 ÷ 当前基准地区同一岗位全负荷年成本
//   · 股权一律按授予日公允价值建模，并标明它是非现金但属于真实经济成本
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Each component of a fully-loaded stack moves on its own clock and is owned by a different person, which is why the multiplier drifts even when nobody touched a salary. Benefits at 25-35% of base is the biggest line and the most negotiable: an HDHP plus HSA design against PPO swings the health line by 8-15% on its own, a 401k match below the 3-6% mid-market norm is margin you already own, and PTO accrual checked against state law floors removes a whole compliance exposure. Payroll tax at 7-15% is mostly fixed, since FICA and FUTA are statutory, but the SUTA experience rating is yours: each quarter of low claims takes 0.1-0.3 points off the rate, and in the high-SUTA states such as California, New Jersey and New York the same headcount simply costs more. Overhead at 10-20% hides the easiest win, because 10-20% of SaaS licences typically go unused and moving to a 3-4 year hardware refresh cycle cuts 20-40% against a 2-year one. Then the two lines people model worst: a sign-on bonus belongs amortised across the 2-3 years you actually intend to pay it, not booked at full value in year one, and equity belongs at grant fair value, because a technical role carrying 20% or more in options changes what the loaded number means. Regional moves come last, because a loaded engineer at 1.0x in San Francisco costs about 0.65x in Shanghai and 0.50x in Bangalore, and that comparison only means something once it is written as a ratio of fully-loaded cost to your own current baseline rather than salary to salary.',
      rows: [
        {
          priority: 1,
          metric: 'Benefits load per role (health, 401k match, PTO accrual, workers comp, disability and life, and training, summed as a percentage of base salary)',
          fixFirst:
            'Fix the benefits load first because it is both the largest component and the only one with a fixed annual window: benefits renew in the fourth quarter for a 1 January effective date, so a renegotiation started after that date waits a full year. At 25-35% of base it is normally the biggest single line in the stack, and it is also the only component where a design change moves the number without touching pay. Audit it line by line rather than as a package: the health plan alone runs 8-12% of base, and the 8-15% premium swing between a PPO and an HDHP plus HSA design is larger than anything else you can negotiate this quarter. Check the plan against the actual employee mix, because a design that looks cheaper per head can cost more for the population you actually employ.',
          alsoMoves:
            'A corrected benefits load changes what every other percentage on this page is worth, because a saving of 10% of base is 10% of base and not 10% of the whole package. It also sets the headroom available for the other two negotiable lines: the payroll tax stack has a hard floor of 7.65% that no negotiation moves, and overhead has a practical floor set by the tools people need to work, so benefits decide whether the remaining levers can reach your target. And because benefits are the line employees feel, a well-designed plan tends to hold voluntary attrition down, which protects the recruiting spend you would otherwise pay a second time.',
          backfire:
            'The obvious way to cut the benefits load is the way that costs the most. Reducing the health contribution, raising deductibles or moving to an HDHP that employees cannot fund with an HSA pushes the number down and pushes real compensation down with it, and the bill returns as voluntary attrition and as a harder recruiting market — which lands on the ramp and attrition rows of the headcount plan instead of disappearing. A flat percentage cut across the whole package also hits the match and the accrual lines you never meant to touch, and it is hard to unwind once employees have made financial plans around the lower number. If the load is already between 25% and 30%, the honest answer is that this row is done and the remaining gap is in overhead.',
        },
        {
          priority: 2,
          metric: 'Overhead per full-time employee (equipment refresh, SaaS licences and management allocation, divided by base salary per FTE)',
          fixFirst:
            'Fix overhead second because it is entirely inside your control: no vendor renewal to negotiate, no employee conversation, no counterparty who can say no. At 10-20% of base it is the second largest component, and unlike benefits it can be reduced without touching anyone pay or benefits, which makes it the low-relation place to find the first real saving. Three sub-moves carry most of it: reclaim SaaS seats that nobody has logged into, which the Zylo 2024 management benchmarks put at 10-20% of a typical stack; move the hardware refresh from a 2-year cycle to a 3- or 4-year cycle, which cuts equipment cost by 20-40%; and re-allocate management cost using the span of control you actually have rather than the one still printed in last year org chart.',
          alsoMoves:
            'Cutting overhead also improves the ramp row of the headcount plan, because the tool stack and the machine a new hire inherits are part of why their first 90 days take the length they take. It also exposes the management allocation: once licences and equipment are separated out, the residual that is really managers and managers time becomes visible, and that number is usually carried at whatever percentage made the total look right. And because overhead is measured per FTE, reclaiming seats against a fixed licence count lowers the per-head cost of every existing and future hire without renegotiating anything with anyone.',
          backfire:
            'Overhead can be cut in a way that only moves the cost. Replacing machines less often than the 3- to 4-year standard, or stripping laptops from new hires to protect the equipment line, produces a smaller overhead number and a slower ramp, and the difference returns months later as ramp drag in the people budget. Reclaiming licences is only safe when you check usage rather than headcount: a seat with no logins in 60 days is waste, while a seat used once a quarter belongs to somebody whose work you have not noticed yet. And cutting the management allocation without changing the reporting structure produces a number that goes down while the managers still cost the same.',
        },
        {
          priority: 3,
          metric: 'Employer payroll tax load (FICA, FUTA and SUTA combined as a percentage of base salary, with the state experience rating recorded)',
          fixFirst:
            'Fix payroll tax third, and fix it for a reason that has nothing to do with negotiation: most of it is not negotiable. The federal stack has a floor of 7.65% that no benefit design and no accounting choice moves, so the only genuinely movable parts are the state unemployment rate, which follows your own claims experience, and the handling of the FUTA wage base, which is a mechanical detail that is wrong in a surprising number of companies. Confirm the SUTA experience rating with your state agency every quarter — a quarter with few claims reduces it, typically by 0.1-0.3 points — and verify that the wage base is applied correctly to every employee. The number is small, but it is permanent and it recurs every year, which is a different proposition from a one-off saving.',
          alsoMoves:
            'A verified payroll tax load also sets the floor for the regional decision further down the list, because a local cost model that omits employer social insurance is not comparable to a US baseline that includes it. And it is the line that most often reveals a compliance gap rather than a cost: an incorrect wage-base application or a missing state surcharge becomes retroactive liability with interest, which is a larger number than the rate you were trying to reduce. Getting this line right is also what lets you trust the rest of the stack, because it is the one component checked against an authority rather than against a vendor quote.',
          backfire:
            'The temptation on this row is to treat a legal classification as a cost lever. Reclassifying a worker as a contractor to remove the employer tax line is not a saving: it is a deferred liability with interest, it is the kind of thing an auditor finds, and it is one of the most common ways a small company turns a cost optimisation into a crisis. The other failure is optimising the wage base mechanically and getting it wrong in the direction that under-remits. Reporting the rate accurately has no backfire of its own, which is why this row is worth closing early even though it is worth little.',
        },
        {
          priority: 4,
          metric: 'Amortised annual cost of one-off hiring payments (signing bonus plus recruiting fee, spread over 2 or 3 years and expressed as a percentage of base salary)',
          fixFirst:
            'Fix the amortisation fourth because it is a bookkeeping rule, not a negotiation, so it costs nothing to correct and it changes decisions immediately. A signing bonus of USD 30,000-50,000 amortised over a 2-year term is USD 15,000-25,000 a year of real cost, and budgeting it as a single-year hit makes an excellent hire look poor when you compare first-year return against first-year cost. Apply the same normalisation to recruiting fees and to the training that happens during ramp, then average across a 3-year horizon before comparing two candidates or two roles. This is also where you check whether the amortisation horizon matches the expected tenure of the person: a 3-year spread for someone who leaves in 12 months understates nothing and overstates the cost.',
          alsoMoves:
            'Normalising one-off costs changes which hires look attractive and it makes the regional comparison honest, because an offshore hire usually carries a larger signing bonus and a longer ramp than a local one, so a comparison on salary alone flatters the remote option. It also protects a good decision from being reversed: when a strong candidate accepts, the bonus is usually the part that was still open, and a model that makes the hire look unaffordable is where that gets talked down. Amortised cost is also what lets the ROI comparison in the headcount plan use one denominator across every cohort instead of mixing single-year and multi-year figures.',
          backfire:
            'Amortising the bonus correctly can still lead you to cut it, and that is the backfire worth naming. If the amortised annual cost makes a signing bonus look like 15-20% of salary, the obvious response is to remove it from the offer, and the offer then loses to a competitor who keeps it — usually at the senior level, where the candidate had alternatives. The other version is amortising over a horizon longer than the person will stay, which flatters the number and then leaves you with a full payment and no retained employee. Keep the horizon at or below the expected tenure and check it against your own attrition record rather than against a standard.',
        },
        {
          priority: 5,
          metric: 'Regional total-cost ratio (fully-loaded annual cost of one role in a candidate region, divided by the fully-loaded annual cost of the same role at your current baseline region)',
          fixFirst:
            'Fix the regional ratio fifth, and only after the components above are settled, because this is a relocation decision rather than a rate negotiation and it takes months rather than a renewal cycle. The headline is large — the same role costs roughly 0.60-0.75x in a Chinese tier-1 city and 0.40-0.55x in India against a US tier-1 baseline — but the headline is salary, and salary is not what you pay. Build the comparison on total cost per role: base plus benefits plus employer payroll tax plus overhead, then add the employer-of-record fee, the tax and compliance obligations of employing in another jurisdiction, and the collaboration and time-zone cost you pay in attention rather than in currency. Only then does the saving become real, and only then is it worth moving a role.',
          alsoMoves:
            'A regional ratio modelled properly also changes what your per-head pricing and per-head revenue targets should be, because the cost of delivery changes even when the price to the customer does not. It changes how many managers you need: a team spread across six time zones needs more management span than a team in one office, and that span is a real line in your overhead allocation, which is why the ratio and the overhead row have to be decided together. And it changes the ramp arithmetic, because a replacement hired in the lower-cost region is not productive on the same schedule, so the ramp row moves as soon as the region moves.',
          backfire:
            'The regional comparison fails most often in one specific way: the salary ratio is treated as the total-cost ratio. A role at 0.65x of the US baseline still carries employer-of-record fees, cross-border tax compliance, the legal and HR handling of employing in a jurisdiction you do not know, and a collaboration overhead that appears on no invoice but shows up in delivery. Time-zone overlap loss is the hardest of these to measure and the easiest to ignore, and it lands on exactly the roles you wanted to move, because the work that is hardest to do asynchronously is the work that depends on judgement. A decision taken on the headline ratio before the components are settled will be reversed later at a cost that has nothing to do with the ratio.',
        },
        {
          priority: 6,
          metric: 'Equity add-on as a share of total compensation (grant-date fair value of equity divided by total compensation including base, benefits and employer taxes)',
          fixFirst:
            'Fix the equity add-on sixth, and treat it as a measurement rather than a negotiation. Equity is real economic cost even though it never appears as cash, and for technology roles at L4-L7 it runs 10-30% of total compensation with a median around 20% at L5 and L6 — large enough that leaving it out distorts every comparison you make, including the regional one above, because regional models usually carry cash only. Model it separately at grant-date fair value so that the headline multiplier you report and the economic cost you actually bear are both visible. This is the right order because equity is the component most often mis-modelled: once the cash layers are settled, adding the non-cash one is arithmetic, while getting it wrong earlier would have distorted the targets you set in rows one and two.',
          alsoMoves:
            'Modelling equity changes the cash multiplier you can actually operate on, which is usually lower than the headline, and that is useful information rather than bad news: it tells you which lever still has room. It also changes how you compare two candidates or two regions, because an offer with 20% equity in one place and an offer with 10% equity in another are not comparable on salary. And it forces the retention question to be asked in the right place, because equity is one of the few components that is simultaneously a cost and a retention instrument, and knowing its size is what lets you decide whether to fund it from the budget or to compensate elsewhere.',
          backfire:
            'Equity is where the most expensive kind of cost-cutting happens, because it is the one component that looks free until it is not. If a measured 20% equity add-on makes the role look expensive, the response is often to reduce the grant, and the senior engineer who was about to accept then takes the other offer: you have saved nothing and paid the full replacement cost of the person you were going to hire anyway. The other failure is modelling at a number that flatters, treating a grant as worth its eventual value rather than its grant-date fair value, or ignoring the vesting cliff, which makes the model look cheaper than the decision is. And because equity is a retention instrument, cutting it in the roles where regrettable attrition is already high removes the very thing that was keeping those people in place.',
        },
      ],
    },
    zh: {
      intro:
        '全负荷成本的四个分项各有各的周期、各有各的负责人，所以没有人动过工资，倍数也会自己漂。福利占底薪 25-35%，是最大也最可谈的一行：HDHP 加 HSA 与 PPO 两种设计，光医疗一项就能摆动 8-15%；401k 匹配低于中端市场 3-6% 的常规，那部分本来就是你的；PTO 累计去对州法底线，还能顺手消掉一整块合规敞口。工资税 7-15% 里有很大一部分是死的（FICA 和 FUTA 是法定的），但 SUTA 经验费率是你自己的：连续一个季度低理赔就能降 0.1 到 0.3 个百分点，而在加州、新泽西、纽约这类高 SUTA 州，同样一个人头就是实打实更贵。管理费 10-20% 里藏着最容易拿到的那笔，因为 SaaS 席位通常有 10-20% 没人在用，设备更换周期从 2 年拉到 3 到 4 年能砍 20-40%。然后是两行最常被算错的钱：签字奖金该按你真打算付的 2-3 年摊销，而不是首年按全额入账；股权该按授予公允价值算，因为技术岗给到 20% 以上的期权时，计入后的倍数已经换了含义。地域挪岗放在最后：旧金山 1.0x 的全负荷工程师，在上海约 0.65x、在班加罗尔约 0.50x，而这个比较只有写成「候选地区全负荷年成本 ÷ 你当前基准地区同一岗位全负荷年成本」才成立，拿薪资比薪资是不成立的。',
      rows: [
        {
          priority: 1,
          metric: '每岗位的福利负担（医保、401k 匹配、年假计提、工伤、残障与人寿、培训，合计占底薪的百分比）',
          fixFirst:
            '福利负担排第一，因为它既是最大的分项，又是唯一一个每年只有固定窗口的分项：福利在第四季度续约、次年 1 月 1 日生效，你在这个生效日之后才开始谈，就等于再等一整年。它通常占底薪的 25-35%，是整叠成本里最大的单项；同时它也是唯一一条「改设计就能改数字、且完全不碰薪资」的分项——医保方案在 PPO 与 HDHP 加 HSA 之间改、匹配比例在自己的区间内调、计提政策压到州法底线，都是这种改法。要逐行审，而不是当成一个打包方案审：医保单项通常就占底薪的 8-12%，而 PPO 与 HDHP 加 HSA 之间 8-15% 的保费差，比你这一季能谈成的其它任何东西都大。拿方案对着你实际的员工构成去比，因为按人头看更便宜的设计，对你真正雇的这批人可能更贵。',
          alsoMoves:
            '福利负担修正之后，本页上其它每一个百分比的含义都变了，因为省下的 10% 是底薪的 10%，不是整包薪酬的 10%。它同时决定了后两个可谈分项还剩多少空间：工资税那条有 7.65% 的硬底，任何谈判都动不了；管理费那条有一个由「员工真的需要的工具」定出来的实际底线——所以福利这条分项，决定了剩下两个杠杆够不够把你带到目标。而福利又是员工唯一感觉得到的分项，一个设计得好的方案通常能压住主动流失，从而保住你本来要再付一次的招聘支出。',
          backfire:
            '压福利负担最直觉的做法，恰好是最贵的那个。减少健康缴费、提高自付额，或者换成员工根本存不进去的 HSA 方案，会把数字压下去，也把实际报酬一起压下去，账单过两个季度以后以主动流失和招聘困难的形式回来，落到人头计划的爬坡与流失两行上，而不是消失。整体砍一个百分比还会误伤你根本没打算动的匹配与计提两行，而员工一旦按更低的数字做了财务安排，之后很难往回调。如果负担已经在 25%-30% 之间，诚实的结论是这一行做完了，剩下的差距在管理费里。',
        },
        {
          priority: 2,
          metric: '每全时当量的人均管理费（设备刷新、SaaS 许可、管理费分摊，除以该岗位的底薪）',
          fixFirst:
            '管理费排第二，因为它完全在你手里：没有合同续约、没有员工谈判、没有一方可以说不。它是第二大的分项，占底薪的 10-20%；而且和福利不同，它可以在不碰任何人薪资与福利的情况下压下来——这让它成为找到第一笔真实节省时关系最轻的地方。三个动作承担了其中大部分：回收没有人登录过的 SaaS 席位，Zylo 2024 的管理基准说这类闲置通常是 10-20%；把硬件刷新从 2 年周期改成 3-4 年周期，设备成本因此降 20-40%；以及按你实际的管理幅度重分摊管理成本，而不是沿用去年的组织架构图。',
          alsoMoves:
            '砍管理费同时会改善人头计划里的爬坡行，因为新人接手的那套工具和那台机器，正是他头 90 天要花多久的一部分原因。它也会把管理费分摊暴露出来：把许可与设备单列之后，剩下的那一块其实本来就是经理和经理的时间，而那个数字通常被记成「刚好让总数看起来合理」的百分比。而且管理费是按人头算的，所以对着固定数量的席位回收冗余，会降低现有和未来每个人的成本，不需要跟任何人重新谈判。',
          backfire:
            '管理费也能被「砍」成只是把成本挪了地方。把硬件刷新周期往反方向改——比 3-4 年的标准更久，或者为了省设备那项把新人的电脑配成旧款——会得到一个更小的管理费数字和一个更慢的爬坡，几个月后它以爬坡拖累的形式回到人力预算里。回收许可只在「查用量」而不是「查人头」时才安全：一个席位 60 天零登录是浪费，而每季度登录一次的人，是你还没注意到的工作。管理层分摊如果不动汇报结构就压数字，数字下去了，经理的成本还在。',
        },
        {
          priority: 3,
          metric: '雇主工资税负担（FICA、FUTA、SUTA 合计占底薪的百分比，并记录州经验费率）',
          fixFirst:
            '工资税排第三，而且排在这里的理由跟谈判无关：它大部分根本不可谈。联邦那一层的底线是 7.65%，任何福利设计和会计选择都动不了；真正能动的是州失业税率——它跟着你自己的理赔记录走——以及 FUTA 工薪基数的处理，这是一个机械细节，而它错的公司比想象中多。每个季度拿低理赔记录去跟州机构确认你的经验费率，一个季度通常能降 0.1-0.3 个百分点；同时核对工薪基数在每个员工身上都被正确应用。这数额不大，但它是永久性的、每年都会再发生的，这和一次性节省是两种性质。',
          alsoMoves:
            '被核实过的工资税负担，还为后面地域那一行设定了底线，因为一个漏掉雇主社保的地方成本模型，和一个含了社保的美国基线，是没法比对的。它也是最常暴露「合规缺口」而不是「成本」的一行：工薪基数用错或漏了州附加费，变成的是带利息的追溯补缴，金额比你想降的那个费率大。把税这一行做对，也是为了敢相信整叠成本——因为税这一行是唯一拿去向税务机关对账、而不是拿去向供应商报价对账的分项。',
          backfire:
            '这一行最容易出的事，是把一个法律上的分类当成成本杠杆。把员工改成分包以去掉雇主税这一行不是省钱：它是一笔递延的负债加利息，是审计一查就会发现的东西，也是小公司把一次成本优化变成一场危机最常见的方式。另一个失败是在工薪基数上做机械优化、并且错在少缴的方向。单纯把税率如实报对是没有反噬的——这正是这一行虽然收益不大、却值得排在前面做完的原因。',
        },
        {
          priority: 4,
          metric: '一次性招聘付款的年摊销成本（签字奖金加招聘费，按 2-3 年摊销后占底薪的百分比）',
          fixFirst:
            '摊销排第四，因为它是记账规则而不是谈判，改它不花任何代价，却立刻改变判断。一笔 USD 30,000-50,000 的签字奖金按 2 年摊销，是每年 USD 15,000-25,000 的真实成本；把它当成一次性支出记，会让一个优秀的人在「首年产出对比首年成本」里显得不划算。招聘费和爬坡期的培训要用同样的口径归一化，再按 3 年跨度平均，才去比较两个候选人或两个岗位。这一行还要顺手检查：摊销年限是否与这个人预计的在职时长一致——给一个只做 12 个月的人按 3 年摊销，什么都没少算，却把成本说小了。',
          alsoMoves:
            '把一次性成本归一化之后，「哪个候选人更划算」这个判断会变，而它也让地域比较变得诚实：远程招聘通常带着更大的签字奖金和更长的爬坡，只比薪资的话，远程方案会被算得过于好看。它还保护一个好决定不被推翻——候选人愿意来的时候，奖金往往就是那个还没谈拢的地方，一个让招聘看起来负担不起的模型，正是它被谈掉的地方。最后，摊销后的成本才是人头计划里那份 ROI 比较能对所有群体用同一个分母的原因，而不是把单年数字和多期数字混在一起。',
          backfire:
            '把奖金摊销算对之后仍然可能让你去砍它，这就是值得点名的反噬。如果摊销后的年度成本让签字奖金看起来像底薪的 15-20%，最顺手的反应就是把它从报价里拿掉，于是报价输给了保留奖金的竞争对手——而且通常发生在你正想要的那类资深候选身上。另一个版本是摊销年限比实际在职时长长，这会把数字弄好看，然后让你付了全额、却没留住人。把年限压在预计在职时长之内，并且用你自己的流失记录而不是行业标准来核。',
        },
        {
          priority: 5,
          metric: '地域总成本比（候选地区同一岗位的全负荷年成本 ÷ 你当前基准地区同一岗位的全负荷年成本）',
          fixFirst:
            '地域比排第五，而且只有在前面的分项都定下来之后才排——因为这是一个搬迁决定而不是一次费率谈判，它要几个月而不是一个续约周期。标题数字很大：同一个岗位在中国一线约是美国一线基线的 0.60-0.75x，在印度约 0.40-0.55x；但那个标题是薪资，而薪资不是你付出的数。要按每个岗位的总成本来建比较：底薪 + 福利 + 雇主工资税 + 管理费，再加雇主代表（EOR）费用、在另一个法域雇佣的税务与合规成本，以及你必须用「注意力」而不是「现金」支付的协作与时区成本。只有到了这一步，节省才是真的，也只有到了这一步，搬岗才值得做。',
          alsoMoves:
            '一个被认真建过模型的地域比，还会改变你的单人定价与单人营收目标，因为交付成本变了而对客户的价格没变。它会改变你需要多少经理：一个横跨六个时区的团队比一个坐在一个办公室的团队需要更多的管理幅度，而管理幅度是管理费分摊里真实的一行——所以地域比与管理费那两行必须一起定。它还会改变爬坡的算法，因为在低成本地区补位的人不是按同一套时间表进入产出的，所以地域一动，爬坡行就跟着动。',
          backfire:
            '地域比较最常见的失败方式只有一个：把薪资比当成总成本比。一个在美国基线 0.65x 的岗位，仍然要付雇主代表费用、跨境税务合规、在一个你不熟悉的法域雇佣的法律与人事手续，以及不出现在任何发票上、却体现在交付上的协作开销。时区重叠的损失是其中最难量、最容易被忽略的一项，而它恰恰打在你最想搬走的那类岗位上，因为最难异步完成的工作，恰恰是靠判断力的工作。而在分项还没定下来之前就按标题比做决定，后面一定会被推翻，而推翻的代价跟这个比值毫无关系。',
        },
        {
          priority: 6,
          metric: '股权附加占总额薪酬的比例（按授予日公允价值计的股权 ÷ 含底薪、福利与雇主税的总额薪酬）',
          fixFirst:
            '股权附加排第六，要把它当成一次测量而不是一次谈判。股权不是现金却是真实的经济成本，在 L4-L7 的技术岗位上它占总额薪酬的 10-30%、L5 与 L6 的中位数约 20%——大到不把它算进去就会扭曲你做的每一个比较，包括上面那一行的地域比较，因为地域模型通常只带现金。按授予日公允价值单独建模，这样你报的标题倍数和你实际承担的经济成本会同时可见。顺序放在这里是对的：股权是最常被建模错的分项，等现金那几层定下来之后，把非现金这一层加进去只是算术，而在前面就弄错会让你给第一、二行定的目标整个歪掉。',
          alsoMoves:
            '把股权建模进去，会改变你真正能操作的「现金倍数」——它通常低于标题倍数，而这是有用的信息而不是坏消息：它告诉你哪个杠杆还剩空间。它还改变两个候选人或两个地区之间的可比性，因为一边 20% 股权的报价和另一边 10% 股权的报价，不是可以按薪资直接比的。它也把留任这个问题逼到了正确的位置，因为股权是少数几个同时是成本、又是留任工具的分项，知道了它有多大，才决定它该从预算里出、还是从别处补偿。',
          backfire:
            '股权是最贵的那种成本削减发生的地方，因为它在暴露之前看起来是免费的。如果量出来的 20% 股权附加让这个岗位显得太贵，反应常常是把授予额度降下来，而那个本来快要接受的资深工程师转头接了别家：你什么也没省下，却照付了那个你本来就要招的人的替换成本。另一个失败是用一个对自己有利的数字建模：按最终价值而不是授予日公允价值算，或者干脆忽略归属期，于是模型显得比这个决定实际更便宜。而因为股权同时是留任工具，在遗憾性流失本来就已经高的岗位上砍它，等于拿掉了唯一让他们留下的东西。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Each layer of a fully-loaded stack is audited by a different owner on a different clock, and the lines below are ordered so that you never negotiate a percentage you have not yet built the base for. The component model comes first, and it has to list base salary, benefits, employer payroll tax and overhead separately, because a blended multiplier tells you nothing about which line to work on. Benefits come second and split into three separate audits: the health plan design, where HDHP plus HSA against PPO swings 8-15% on the health line alone, the 401k match against the 3-6% mid-market norm, and PTO accrual against state law floors, which is a compliance check rather than a savings opportunity. Payroll tax comes third, and the actionable part is narrow but reliable: confirm the SUTA experience rating, since every quarter of low claims drops it 0.1-0.3 points, check how the FUTA wage base applies, and look for state surcharges nobody modelled. Overhead comes fourth, and it pays fastest: licence utilisation, refresh cycles moved from 2 years to 3-4, and management cost re-allocated across span of control. Regional variants come fifth, because you cannot compare two locations until both have a decomposed model in the same order. Sign-on amortisation comes sixth, because a bonus booked in full in year one makes the first-year multiple wrong and the three-year plan right, which is exactly the direction that makes a budget look like a bargain. Re-benchmarking comes last, and it carries the number that ages every line: medical inflation at 5-7% a year means a benefits line not renegotiated for four years has drifted a long way from its band, and leverage is lowest on exactly the largest component.',
      items: [
        {
          step: 1,
          label: 'Four-line component sheet for every role in the plan',
          gate:
            'Every role in the plan has a four-line sheet — base salary, benefits percentage, employer payroll tax percentage and overhead figure — and the four lines reconcile to a per-role total that is within 2% of what payroll and the vendor invoices actually paid for that role in the last quarter.',
          blockIf:
            'While the components are mixed together in a single blended number you cannot tell which lever is worth pulling, and every renegotiation becomes a general argument about the size of the package rather than a specific conversation with a specific vendor. Reconciling to invoices matters for the same reason: an overhead figure nobody ties back to actual spend is an estimate wearing a percentage sign, and the 10-20% unused-licence move in step 5 only works if you know what you actually pay.',
        },
        {
          step: 2,
          label: 'Multiplier computed per role and the largest component named',
          gate:
            'Each role has its multiplier computed as base x (1 + benefits% + payroll tax% + overhead%), the largest component is named on every sheet, and at least 80% of roles share the same largest component so that one renegotiation covers the company instead of needing 20 separate conversations.',
          blockIf:
            'If the largest component differs from role to role, you are looking at 20 negotiations where you needed one, and a benefits vendor will happily hold your renewal open while you work out which roles to include. This is also where the numbers usually stop agreeing with each other: when a role sheet says 25-30% benefits and the invoice trail says something else, the percentage is usually the one that is wrong. Settle the identification before you spend a quarter negotiating.',
        },
        {
          step: 3,
          label: 'Benefits design audited line by line against a band',
          gate:
            'Health is compared as HDHP plus HSA against PPO on the same employee mix with the premium difference written down, the 401k match sits inside the 3-6% mid-market band, and every state you employ in has its PTO accrual checked against the statutory floor.',
          blockIf:
            'The renewal is the only moment this component can move, and it arrives once a year, so a benefits audit skipped this cycle costs a full year of the saving. The specific trap is comparing plan designs on the headline premium without checking the employee mix, because a plan that looks cheaper per head can cost more for your actual population. And an accrual policy below the state floor is a compliance exposure rather than a saving, however good the percentage looks.',
        },
        {
          step: 4,
          label: 'SUTA experience rating and wage base confirmed in writing',
          gate:
            'The current quarterly SUTA experience rating is confirmed in writing with the state agency, the FUTA wage base is verified as applied to every employee, and no role shows an employer payroll tax load above 15.3% of base, with the federal floor of 7.65% documented.',
          blockIf:
            'The experience rating only improves while your claims history is good, and it is only visible if you ask, so skipping this step means you keep paying a rate you have already earned the right to reduce. A wage-base application error is worse than a stale rate because it is retroactive and it is discovered by an authority rather than by you. This row is cheap to close and it is the row most often left open.',
        },
        {
          step: 5,
          label: 'Licence utilisation, hardware cycle and span of control audited',
          gate:
            'At least 15% of SaaS seats are identified as unused, every seat with no logins in 60 days is reclaimed or justified, the hardware refresh cycle is documented at 3 or 4 years rather than 2, and management allocation is recomputed from the current span of control with the per-head overhead figure at or below 20% of base.',
          blockIf:
            'If licences are counted by headcount instead of by usage, you will reclaim seats that people need and keep seats nobody touches, and the saving will not appear in the next invoice. And if the management allocation is inherited from an org chart that has changed, the overhead row is carrying a number that describes a company you no longer have, which means the 10-20% band cannot be tested. Audit usage and reporting lines separately, and only then judge whether overhead is above or below the band.',
        },
        {
          step: 6,
          label: 'Regional total-cost model written for each candidate location',
          gate:
            'Each candidate region has a written total-cost model — base, benefits, employer payroll tax, overhead, employer-of-record fee, cross-border tax and compliance, plus a stated collaboration and time-zone adjustment — and it shows a saving of at least 20% against the current baseline before any role is moved.',
          blockIf:
            'A model built on salary alone will recommend moving roles to a region where the employer-of-record fee, the compliance work and the collaboration overhead eat most of the gap, and you will discover that after the hires are made and the contracts signed. The collaboration adjustment is the part most often left out because it does not appear on an invoice, and it is the part that shows up in delivery. Model all three cost types or do not move anything yet.',
        },
        {
          step: 7,
          label: 'One-off hiring payments amortised over a stated horizon',
          gate:
            'Every signing bonus is spread over 2 or 3 years with the horizon no longer than the expected tenure of the role, the amortised annual cost is at or below 25% of base, and the first-year cost of each new hire is compared with that hire fully-loaded annual cost before the offer is approved.',
          blockIf:
            'Budgeting a bonus as a single-year hit makes a good hire look expensive and pushes you to cut the one component of the offer that wins the candidate. And a horizon longer than the person will stay flatters the number while leaving a full payment with no retained employee at the end. Write the horizon down next to the expected tenure from your own attrition record and the comparison becomes a decision rather than a formatting choice.',
        },
        {
          step: 8,
          label: 'Re-benchmark completed in the renewal cycle and after rollouts',
          gate:
            'The multiplier is recomputed in the fourth quarter before the 1 January effective date and again after any rollout that adds more than 5 SaaS seats per FTE, and the healthcare premium line is compared against the 5-7% annual inflation assumption used in the model.',
          blockIf:
            'Healthcare premiums move 5-7% a year, so a plan left alone costs 25-35% more over 4 years and the multiplier drifts upward with no decision being made anywhere. A rollout that adds seats is a change to the overhead component and has to be reflected in the same model, otherwise the re-benchmark is measuring the company you had last year. If the re-benchmark has been skipped for more than one cycle, treat the current multiplier as unverified until it is recomputed.',
        },
      ],
    },
    zh: {
      intro:
        '全负荷成本的每一层都由不同的人按不同的周期去审，而下面这些行的顺序是按「基础没建起来就不谈比例」排的。第一行是分项模型：底薪、福利、雇主工资税、管理费必须分开列，因为一个混在一起的倍数告诉不了你该动哪一行。第二行是福利，而且它其实是三次独立的审计：医疗方案（HDHP 加 HSA 对 PPO，光医疗一项就摆动 8-15%）、401k 匹配对中端市场 3-6% 的常规、PTO 累计对州法底线 —— 最后这一项是合规检查，不是省钱机会。第三行是工资税，能动的部分窄但可靠：确认 SUTA 经验费率（连续一个季度低理赔就降 0.1 到 0.3 个点）、核对 FUTA 工资基数怎么适用、再找没人建模过的州附加项。第四行是管理费，见效最快：席位使用率、设备更换周期从 2 年拉到 3-4 年、按管理跨度重新分摊管理成本。第五行是地域变体，因为两个地方都还没有按同样顺序拆出分项之前，比较是无意义的。第六行是签字奖金摊销，因为首年按全额入账会让第一年的倍数错、三年计划对，而那正是让预算看起来很便宜的方向。最后一行是重对基准，它带着每条线都会变老的那个数：医保每年 5-7% 的通胀意味着一行四年没重谈的福利已经离它的区间很远，而杠杆恰恰在最大的那一行上最小。',
      items: [
        {
          step: 1,
          label: '计划里每个岗位都有一张四行分项表并已与发票核对',
          gate:
            '计划里每个岗位都有一张四行表——底薪、福利百分比、雇主工资税百分比、管理费数字——四行合成的每岗位总额，与上个季度这个岗位实际支付的工资和供应商发票相差不超过 2%。',
          blockIf:
            '分项还混在一个平均数里的时候，你没法判断哪个杠杆值得拉，于是每一次谈判都变成关于「整包薪酬有多大」的泛泛争论，而不是跟某一个供应商谈某一项。与发票对账的理由是一样的：一个对不上实际支出的管理费数字，是一个穿着百分号的估算，而第五步里「10-20% 闲置席位」那一招，只有在你知道自己实际付了多少钱时才有效。',
        },
        {
          step: 2,
          label: '逐岗位算出全负担倍数并指出最大的那一个分项',
          gate:
            '每个岗位都按底薪 ×（1 + 福利% + 工资税% + 管理费%）算出了倍数，每张表都写明了最大的分项是哪一项，并且至少 80% 的岗位共享同一个最大分项——这样一次谈判就能覆盖全公司，而不是要做 20 场对话。',
          blockIf:
            '如果最大分项因岗而异，你面对的就是 20 场谈判而不是 1 场，而福利供应商很乐意在你还没想清楚把哪些岗位放进去的时候，把续约一直拖下去。这里也常常是数字开始互相打架的地方：当一张岗位表写着福利 25-30%、而发票线索指向的是另一个数时，通常是那个百分比错了。先把「哪个分项最大」定下来，再去花一个季度谈判。',
        },
        {
          step: 3,
          label: '福利设计已逐行审计并对到中端市场的基准区间',
          gate:
            '医保在同一个人群构成下把 HDHP 加 HSA 与 PPO 做了对比并写下保费差额，401k 匹配落在 3-6% 的中端市场区间内，并且你雇人的每个州都按州法底线核过年假计提。',
          blockIf:
            '续约是这一分项唯一能动的时刻，而它一年只有一次，这一轮跳过福利审计就等于把这一笔节省推迟整整一年。最具体的坑是只看标题保费、不看员工构成来比方案——按人头看更便宜的方案，对你实际的人口可能更贵。而计提政策低于州法底线，是合规敞口而不是节省，不管那个百分比看起来多好看。',
        },
        {
          step: 4,
          label: 'SUTA 经验费率与 FUTA 工薪基数都有书面确认',
          gate:
            '当季的 SUTA 经验费率已经从州机构拿到书面确认，FUTA 工薪基数在每个员工身上都核过，并且没有任何岗位的雇主工资税负担超过底薪的 15.3%，联邦 7.65% 的底线也记录在案。',
          blockIf:
            '经验费率只有在你自己的理赔记录干净时才会往下走，而它只有你去问才会浮现——所以跳过这一步，就等于继续付一个你早就挣到了降低幅度的费率。工薪基数用错比费率陈旧更糟，因为它是追溯的，而且它是被当局而不是被你发现的。这一行成本很低，却是最常被留空的一行。',
        },
        {
          step: 5,
          label: 'SaaS 许可用量、硬件刷新周期与管理幅度都已审计',
          gate:
            '至少 15% 的 SaaS 席位被识别为闲置，每一个 60 天零登录的席位已被回收或给出理由，硬件刷新周期被写成 3 年或 4 年而不是 2 年，管理费分摊按当前管理幅度重算，并且人均管理费不高于底薪的 20%。',
          blockIf:
            '如果按人头而不是按用量清点许可，你会回收别人真正需要的席位，同时保留没人碰的席位，节省不会出现在下一张发票里。如果管理费分摊是从一份已经改过、却没同步的架构图上继承来的，那么管理费这一行背的是一家你已经不是的公司——于是 10-20% 这个区间根本没法检验。用量与汇报线分开审，然后才判断管理费是高于还是低于区间。',
        },
        {
          step: 6,
          label: '每个候选地区都写了逐岗位的全负荷总成本模型并留痕',
          gate:
            '每个候选地区都有一份写下来的总成本模型——底薪、福利、雇主工资税、管理费、雇主代表费用、跨境税务与合规，外加一条写明的协作与时区调整——并且在搬动任何岗位之前，它显示出相对当前基准至少 20% 的节省。',
          blockIf:
            '只按薪资建的模型，会把你推向一个「雇主代表费、合规手续和协作开销吃掉大部分差距」的地区，而你会在这批人招完、合同签完之后才发现。协作调整是最常被漏掉的一块，因为它不出现在任何发票上——而它恰恰体现在交付上。三类成本都要建模，否则先别动。',
        },
        {
          step: 7,
          label: '一次性招聘付款按写明的年限摊销并核过在职时长',
          gate:
            '每一笔签字奖金都按 2 年或 3 年摊销，且摊销年限不超过该岗位预计在职时长，摊销后的年度成本不高于底薪的 25%，并且在批准报价之前，每个新人的首年成本都与该新人的全负荷年成本做过对比。',
          blockIf:
            '把奖金当成一次性支出记，会让一个好招聘看起来很贵，于是你会砍掉报价里唯一能赢下候选人的那一项。而摊销年限比实际在职时长长，会把数字弄好看，然后让你在最后付了全额、却没留住人。把年限写在你自己的流失记录旁边（而不是一个标准值旁边），这个比较才是一个决定，而不是一种格式选择。',
        },
        {
          step: 8,
          label: '每个福利续约周期与重大部署之后都完成了重对',
          gate:
            '倍数在第四季度、次年 1 月 1 日生效之前重算过一次，并且在任何新增超过人均 5 个 SaaS 席位的部署之后又重算了一次，医保保费那一行与模型里用的 5-7% 年通胀假设做了对比。',
          blockIf:
            '医保保费每年涨 5-7%，放任不管的话 4 年后就贵 25-35%，倍数就是在没有任何人做过任何决定的情况下自己往上漂的。新增席位的部署是对管理费分项的改变，必须体现在同一个模型里，否则重对量的是去年的你。如果重对已经漏掉一个周期，就把当前倍数当作未经核实，直到重算为止。',
        },
      ],
    },
  },
};


