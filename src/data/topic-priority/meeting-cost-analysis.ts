// P166 —— E 类（Cost & Efficiency）主题「meeting-cost-analysis」的新形态内容。
//
// 两种形态与既有散文的分工（写之前读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（单指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个成本信号同时不达标时先修哪个 → 顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的达标线与卡点
//
// 与相邻主题「meeting-cost-optimization」的分工（两个必须错开的骨架）：
//   · 本文件讲**怎么算、怎么读**：归因、三个时间维度、人时 vs 美元、全组织汇总、
//     排名基准、2x ROI 门槛、季度漂移。
//   · meeting-cost-optimization 讲**怎么改**：先砍谁、人数怎么封顶、时段怎么重塑、
//     频率怎么改、异步替代怎么落地、收回的深度工作小时怎么验证。
//   · ⭐ 本文件不写「怎么减」，只写「哪个数错了、错了会污染谁」。
//
// 口径纪律（本主题讲「用户自己的经营阈值」——会议成本 / 时薪 / 产出，不是数据集单价）：
//   · 允许手写金额，但每个数字自带：分子、分母、期间（48 个工作周）、量级、单位。
//   · 一律写成「USD 50-90/小时」这种带口径的形式，不写成只有一个美元符号加数字的孤零零写法。
//   · 全文只用一套费率：中型 SaaS 团队知识工作者的全负荷美元/参与人·小时。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Meeting cost analysis is attribution, not advocacy: its job is to put a defensible figure on every recurring slot, read that figure across three horizons, and test it against what the meeting actually decides. The defects are specific and they stack, because each one contaminates the next. A rate table built from base salary understates every downstream figure by 30-50 percent, so the whole exercise inherits a discount it never declared. A report that stops at one horizon hides a habit that is compounding, since a meeting that costs little per session can consume a quarter of the calendar. A view that counts dollars but not person-hours cannot see the capacity damage of a small daily meeting, which on an individual contributor calendar is often the larger problem. A roll-up assembled from remembered recurring meetings misses the calendar that actually happens, including the ones nobody owns. And a worklist sorted on the wrong denominator sends the intervention at the wrong target, usually the largest room rather than the most expensive hour. Repair them in that order. The caliber behind every number here is fully-loaded dollars per attendee-hour for a knowledge worker on a mid-market SaaS team, USD 50-90 for an IC, USD 80-150 for a senior IC, USD 120-200 for a manager, USD 200-350 for a director, USD 300-500 for a VP and USD 400-800 for a C-level executive, with duration in hours, frequency in meetings per week, and annualisation over 48 working weeks.',
      rows: [
        {
          priority: 1,
          metric: 'The loaded rate table — base salary against the fully-loaded multiplier',
          fixFirst:
            'Rebuild the rate table before computing anything else, because every figure in this analysis is a product of it, and a base-salary table understates the entire study by 30-50%. Compose each rate as base × (1 + benefits + employer payroll tax + overhead): roughly 1.30× base for US private industry, 1.25-1.40× for mid-market SaaS benefit packages, and 1.40-1.50× for a China five-insurances-and-one-fund package plus supplemental benefits. Attach one rate per attendee rather than one rate per meeting, and write down the provenance of each band (BLS ECEC, PayScale, Levels.fyi) so a later reader can re-derive it rather than trust it.',
          alsoMoves:
            'Once the table is real, the composition of a room changes its verdict: eight ICs cost more per attendee-hour than three ICs and two VPs, so the person who most deserves to leave the room is often the most junior person in it, and the meeting you assumed was expensive turns out to be the cheap one. It also makes aggregation legitimate, because the org-wide total becomes a sum of comparable rows instead of an average of incompatible ones, and it lets a quarterly drift line carry information, because a change in the mix of attendees can now be told apart from a change in the number of meetings.',
          backfire:
            'Loading overhead onto every seat without asking what the seat is for inverts the ranking: a large IC-only meeting looks catastrophic while a three-person executive decision session looks free, so the worklist points at the room that was actually deciding things. The other version is holding one blended rate for the whole organisation because it is easier to type — and then the analysis can no longer distinguish a room that needs five people from a room that needs thirty, which was the only reason to compute a rate at all.',
        },
        {
          priority: 2,
          metric: 'Horizon coverage — one meeting priced per session, per quarter and per year',
          fixFirst:
            'Publish all three horizons for every meeting instead of whichever one the audience in front of you prefers. Per session is the scheduling figure: weighted rate × attendees × hours. Per quarter multiplies that by weekly frequency × 13. Per year multiplies by weekly frequency × 48 working weeks. Put the three on the same row, because each answers a different question and each is the only one that can trigger a different decision: per session decides whether the slot earns its place, per quarter reveals whether the pattern is compounding, per year is the only figure that belongs inside a budget.',
          alsoMoves:
            'The three horizons together give a meeting a rate of change rather than just a size, which is what a quarterly review actually needs: a meeting costing USD 225 per session and USD 10,800 per year is a different proposal from one costing USD 225 per session and USD 2,700 per year, and the entire difference is recurrence. The annual figure also converts a scheduling habit into an owner-level item, because a recurring meeting has a sponsor, and a sponsor who sees USD 60K a year behaves differently from one who sees USD 60.',
          backfire:
            'Reporting only the annual figure hides drift until the year closes: a calendar that grew 30% in the third quarter still shows an annual total similar to last year, because the extra meetings bunch into the new quarters, and the audit that would have caught it arrives at year-end reconciliation when nothing can still be changed. The mirror error is publishing only the per-session figure, which makes a weekly 25-minute standup look like a rounding error while it quietly consumes 240 person-hours a year.',
        },
        {
          priority: 3,
          metric: 'Person-hours per year and the FTE equivalent behind each meeting',
          fixFirst:
            'Compute the capacity view next, because it is the only one that catches the pattern the dollar view hides. For every meeting: person-hours per year = attendees × duration in hours × weekly frequency × 48. Then read it against the FTE scale of 2,080 person-hours a year, where above 500 is roughly a quarter of one person consumed by that meeting alone and above 2,000 is a whole person. Flag every meeting past 500 for senior review, and name the ones past 2,000 outright instead of leaving them buried in a table.',
          alsoMoves:
            'The person-hour view changes what counts as expensive, because a USD 50 meeting burning 6 person-hours destroys as much maker capacity as a USD 300 meeting, so a calendar made of cheap-and-frequent slots is often the real problem and the fix set shifts from cancelling events to changing cadence. It also converts the meeting line into a capacity budget you can plan against, since the number you can defend to leadership is expressed in people rather than in dollars, and it is the number that survives a budget freeze.',
          backfire:
            'Attack the largest person-hour line first and you will often pick wrong, because the meeting with the most person-hours is frequently a short daily standup or a wide status review that is cheap per person but present every day, while the quarterly planning session that consumes a genuine FTE is buried underneath it. The other trap is mixing units, adding a dollar column and a person-hour column and then ranking on the combined total, which means nothing, since one is money and the other is capacity.',
        },
        {
          priority: 4,
          metric: 'The org-wide roll-up — whether the total actually covers the calendar',
          fixFirst:
            'Assemble the total from the calendar rather than from the list of recurring meetings you happen to remember. Pull every recurring slot with its attendees, then carry ad-hoc and one-off meetings as a separate line so the two are never confused: recurring cost is a policy problem you can change by rule, while ad-hoc cost is a behaviour problem you can change by approval. Add organizer preparation time, typically 30-60 minutes per meeting, as its own line, because it is invisible in every per-meeting figure and it belongs to the same person who is also sitting in the meeting.',
          alsoMoves:
            'The roll-up is the only view that puts meeting spend next to payroll, and that ratio is what a leadership conversation can actually act on: once meeting spend is a defined share of loaded payroll, a cap becomes a policy, and the cap is what stops the line from regrowing after a cut. It also produces the concentration statistic, because the top 10 meetings by annual cost typically account for 60-80% of the total, which turns a broad complaint into a short worklist.',
          backfire:
            'Aggregate only the recurring meetings and the total understates real spend, yet it still looks actionable, so the intervention lands on the recurring ones while the ad-hoc requests keep arriving and the total barely moves; the next reporting cycle then shows the savings were illusory. The opposite failure is folding preparation time into the per-meeting figure without saying so, which makes an attendee reduction look as though it saved organizer time when the meeting itself is unchanged.',
        },
        {
          priority: 5,
          metric: 'The ranking basis — what the top-10 worklist is actually sorted by',
          fixFirst:
            'Sort the worklist by annual cost and by person-hours, and keep those two columns side by side instead of collapsing them into a single score. Annual cost tells you where the money sits; person-hours tell you where the capacity sits; a meeting high on both is the obvious target, while one high on only one deserves a deliberate judgement rather than an accidental one. Verify by checking that the ten meetings you publish are the ten a colleague would pick from the same data, which only holds when the sort key is written down next to the list.',
          alsoMoves:
            'Ranking on annual cost is what makes the intervention cheap, because the same proportional reduction applies to whichever meeting you choose, and the choice between a USD 60K/year meeting and a USD 900/year meeting is not a close call. It also exposes the seniority asymmetry that per-meeting analysis conceals, because one executive seat at USD 300-500/hr can cost more than three IC seats at USD 50-90/hr, which makes removing that single seat the highest-return change available in many rooms.',
          backfire:
            'Ranking purely on dollars systematically buries the meetings that destroy capacity, because a daily 15-minute standup with eight people is a small dollar line and a large person-hour line; a team that follows the dollar ranking cancels the quarterly offsite and leaves the daily standup in place, then discovers that the maker schedule is exactly as damaged as before. Collapsing the two columns into one composite score is the same failure in a prettier form, because the weights silently decide which dimension gets traded away.',
        },
        {
          priority: 6,
          metric: 'The decision-value test — whether a meeting clears twice its own cost',
          fixFirst:
            'Attach to each meeting at the top of the worklist the decision or alignment it is expected to produce, written in a single sentence, and price that against the annual cost of the meeting: the value has to reach at least 2× the annual cost, or the meeting fails on paper and is either restructured or removed. Write the sentence before the meeting happens rather than reconstructing it from memory afterwards, because remembered value is always larger than booked value. Apply the same test to cheap-but-frequent slots: 2× a USD 900 per year standup is a low bar, and clearing it is still worth knowing.',
          alsoMoves:
            'The gate changes the default for every new request, because a proposed recurring meeting now arrives carrying its decision sentence and its cost instead of a calendar hold, and that is what stops the line from regrowing after a successful cut. It also re-prices the meetings that look expensive: a USD 50K/year executive review can clear a 2× bar on a single decision worth USD 120K, which is a far better use of that hour than the same money spent on recurring status, and the gate is what tells those two apart.',
          backfire:
            'Apply a pure 2× dollar gate and the cheapest thing on the calendar dies every time: a 25-minute daily sync with a small dollar cost but genuine alignment value fails the test on paper, while a larger meeting with a vague but valuable purpose passes because nobody wrote down its cost properly. The other version is pricing value from the organiser’s own estimate of a decision they care about, which is a standing incentive to write large numbers next to meetings they convened.',
        },
      ],
    },
    zh: {
      intro:
        '会议成本分析是做归因，不是做主张：它的活儿是给日历上每一个常例时段安上一个经得起追问的数字，在三个时间维度上读它，再拿它去对这场会议实际做出的决策。会毁掉这件事的缺陷是具体的，而且一层压一层。用底薪搭出来的费率表，会让下游每一个数字偏低 30-50%，整份分析于是继承了一个从未声明的折扣。只报一个时间维度的报告，会把一个正在复利的习惯藏起来——单场不贵，但一个季度能占掉很大一块日历。只数美元不数人时的视角，看不见一场小型日常会议对产能的破坏，而这在个人贡献者的日历上往往才是更大的问题。用「记得住的常例会议」拼出来的汇总，漏掉的恰恰是真实发生的那份日历，包括那些没人认领的会。用错分母排出来的名单，则会把干预送到错误的目标上——通常是最大的会议室，而不是最贵的那一小时。按这个顺序修。全篇口径：中型 SaaS 团队知识工作者的全负荷美元/参与人·小时（IC 50-90、高级 IC 80-150、经理 120-200、总监 200-350、VP 300-500、C 级 400-800），时长以小时计，频率按每周场次，年度按 48 个工作周折算。',
      rows: [
        {
          priority: 1,
          metric: '全负荷费率表——底薪与全负荷乘数之间的差别',
          fixFirst:
            '在算任何东西之前先把费率表重建一遍，因为这份分析里的每个数字都是它乘出来的，而一张底薪表会让整份研究偏低 30-50%。每条费率按 底薪 ×（1 + 福利 + 雇主工资税 + 管理费）合成：美国私营行业约 1.30 倍底薪，中端市场 SaaS 福利包约 1.25-1.40 倍，中国五险一金加补充福利约 1.40-1.50 倍。费率要按「人」挂，不是一场会挂一条；同时把每个区间的来源写下来（BLS ECEC、PayScale、Levels.fyi），好让后来的读者能自己复算，而不是只能选择相信。',
          alsoMoves:
            '费率表一旦是真的，房间的构成就会改变结论：8 个 IC 的每参与人·小时成本，高于 3 个 IC 加 2 个 VP，于是最该离开房间的那个人往往恰是里面最年轻的那个，而你原本以为贵的那场会其实才是最便宜的。它同时让汇总变得合法——组织级总额变成若干可比行相加，而不是若干不可比行的平均——也让季度漂移线开始携带信息，因为「与会者构成变了」现在可以和「会议数量变了」分开来看。',
          backfire:
            '把管理费摊到每个座位上却不问这个座位在这场会里干什么，排名会整个反过来：一场全是 IC 的大会看起来触目惊心，而三人高管决策会看起来几乎免费，于是名单指向的正是那间真正在做决定的会议室。另一个版本是全组织只用一条混合费率，因为打字省事——而后这份分析再也无法区分「需要 5 个人的会」和「需要 30 个人的会」，而这恰恰是算费率唯一的存在理由，于是你也永远不知道该请谁来。',
        },
        {
          priority: 2,
          metric: '时间维度覆盖——同一场会的单场价、季度价与年度价',
          fixFirst:
            '把三个维度都发布出来，而不是只发布眼前这位听众恰好想要的那一个。单场是排程数：加权费率 × 与会人数 × 小时数。季度价 = 单场价 × 每周频次 × 13。年度价 = 单场价 × 每周频次 × 48 个工作周。三个数写在同一行，因为它们各自回答不同的问题，也各自只能触发不同的决定：单场回答这个时段值不值，季度回答这个模式在不在复利，年度则是唯一能进预算的那个数。',
          alsoMoves:
            '三个维度合在一起，给出的是一场会的「变化率」而不只是体量，而这正是季度评审真正需要的：单场 225 美元、年耗 10,800 美元的会，与单场 225 美元、年耗 2,700 美元的会是两个不同的提案，而全部差别都来自重复频率。年度数还把一个排程习惯变成了一件落到人身上的事——常例会议是有主赞助人的，而一个看到年耗 60K 美元的赞助人，与一个看到 60 美元的赞助人，行为不是一回事。',
          backfire:
            '只报年度数，就会把漂移藏到年底：第三季度涨了 30% 的日历，年度总额看上去和去年差不多，因为多出来的会全挤在新季度，而本该抓住它的审计要等到年末对账才来，那时已经什么都改不了了。反向的错误是只报单场价——每周 25 分钟站会看着像四舍五入的零头，却在悄悄吃掉每年 240 个人时，而这一整年里没有任何一个季度的数字提醒过你。',
        },
        {
          priority: 3,
          metric: '每年人时，以及每场会背后的 FTE 等价消耗量',
          fixFirst:
            '接着算产能这一层，因为它是唯一能看见美元视角所掩盖的形态的那一层。每一场会：每年人时 = 与会人数 × 时长（小时）× 每周频次 × 48。然后拿它对 2,080 人时/年 = 1 个 FTE 这个刻度去读：超过 500 大约是四分之一个人被这一场会单独吃掉，超过 2,000 就是整整一个人。凡是超过 500 的都标出来送上级审阅，超过 2,000 的直接点名，不要让它埋在表里。',
          alsoMoves:
            '人时视角会改变「什么算贵」：一场 50 美元、烧掉 6 个人时的会议，对创造者产能的破坏等同于一场 300 美元的会，所以由「便宜但频繁」堆出来的日历往往才是真问题，修复动作也会从「取消某一场」转向「改节奏」。它同时把会议这条线变成一份能对着规划的产能预算，因为能拿到管理层面前的那个数是用「人」而不是用「美元」表达的，而且它是在预算冻结时唯一还站得住的数。',
          backfire:
            '先动人数时最大的那一条，往往会挑错：人时最多的一般是短促的每日站会或宽口径的状态会，每场对每个人都不贵，却天天都在；而真正吃掉一个 FTE 的季度规划会，反而被压在下面。另一个陷阱是单位混用——把美元列和人时列并排，再按合计排序，这毫无意义，因为一个量的是钱，一个量的是产能，更谈不上按产能去排优先级。',
        },
        {
          priority: 4,
          metric: '组织级汇总——这个总额是否真的覆盖了日历',
          fixFirst:
            '总额要从日历上拼出来，而不是从你恰好记得的那几场常例会拼出来。把每一个常例时段连同与会者拉出来，再把临时会、一次性会议单独列一行，让两类永远不混：常例成本是能靠规则改掉的政策问题，临时成本是能靠审批改掉的行为问题。再把组织者的准备时间（通常每场 30-60 分钟）单列一行，因为它在任何一个单场数字里都看不见，而它属于那个同时坐在会里的人。',
          alsoMoves:
            '汇总是唯一能把会议支出放到工资旁边看的视角，而那个比例才是管理层对话真正能下手的东西：一旦会议支出占全负荷人力成本的比例被写成一条线，设定上限就变成一条政策，而这条上限正是削减之后它不再长回来的原因。它同时产出集中度这个统计——按年耗排出的前 10 场通常占总消耗的 60-80%，于是一句笼统的抱怨变成了一份短名单。',
          backfire:
            '只汇总常例会议，总额会低估真实支出，可它看上去仍然可执行，于是干预落在常例上，而临时申请照旧涌来，总额几乎不动；下一轮汇报就会显示「省的全是幻觉」。反向的失败是把准备时间悄悄折进单场数字里且不作说明，这会让一次减员看起来像省下了组织者的时间，而会议本身一点没变，于是汇报里少掉的恰恰是那部分从未被记录的消耗。',
        },
        {
          priority: 5,
          metric: '排名基准——前 10 名名单到底按什么排序',
          fixFirst:
            '按年耗和人时两个键排，并且把这两列并排放着，不要合成一个总分。年耗告诉你钱在哪儿，人时告诉你产能在哪儿；两样都高的会才是显然的目标，只高一样的那场值得有意识地判断一次，而不是让它偶然被处理。验证方式是看你发布的这 10 场，是不是同一位同事拿着同一份数据会挑出的同样 10 场——只有把排序键写在名单旁边，这件事才成立。',
          alsoMoves:
            '按年耗排，是让干预变便宜的关键：不管你挑哪一场，同样的比例削减都落在同样的位置上，而「一场年耗 60K 美元的会」和「一场年耗 900 美元的会」之间根本不是一道难题。它同时揭示了单场分析掩盖的资历不对称——按 300-500 美元/小时算，一个高管座位可能比按 50-90 美元/小时算的三个 IC 座位还贵，于是拿掉那一个座位往往是房间里回报最高的改动。',
          backfire:
            '纯按美元排，会系统性地埋掉那些正在摧毁产能的会议：8 个人、每天 15 分钟的站会是一行小美元和大行人时；跟着美元排名走的团队会取消季度团建，把每日站会原样留下，然后发现创造者日程的破坏程度和之前一模一样。把两列合成一个综合分是同一个失败的精致版本——权重悄悄替你决定了牺牲哪一维，而你自己甚至看不见它被牺牲了。',
        },
        {
          priority: 6,
          metric: '决策价值测试——这场会是否够到了自己成本的两倍',
          fixFirst:
            '给名单最前面的每一场会写下一句话，说明它预期产出的决策或对齐，再拿这句话去对这场会的年耗：价值必须达到年耗的 2 倍，否则这场会纸面不及格，要么重构要么取消。写这句话要发生在会议之前，而不是事后凭记忆回忆，因为回忆里的价值永远比登记的价值大。对「便宜但高频」的时段也照用同一把尺：2 倍于 900 美元/年的门槛很低，过了线也依然值得知道。',
          alsoMoves:
            '这道门槛改变了每一个新请求的默认状态，因为一个提议中的常例会议现在是带着它的决策句和它的成本来的，而不再只是一条日历占用，这正是成功削减之后那条支出不再长回来的机制。它同时给那些看起来很贵的会议重新定价：一场年耗 50K 美元的高管评审，只要一个价值 120K 美元的决策就能过 2 倍门槛，而同样的钱花在常例状态汇报上则过不了，门槛正是用来把这两者分开的。',
          backfire:
            '把 2 倍美元门槛机械地套上去，每次被砍掉的都是日历上最便宜的那件东西：一场 25 分钟、美元成本很小却有真实对齐价值的每日同步，纸面上过不了关；而一场更大、目的含糊但价值真实的会却过关了，因为没人把它的成本写清楚。另一个版本是用组织者本人对某场自己召集的会的估价来标价值，这等于长期激励他给自己召集的会写大数字。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Attributing the cost of a recurring meeting is harder than counting it, and seven conditions decide whether the attribution holds up. A step counts as finished only when someone else can re-derive the number from the same source, so the attendee list, the role band behind each rate and the duration in hours are all written down rather than remembered. The three horizons are then read in one pass: cost per session answers whether the slot is worth it, cost per quarter whether the pattern is growing, cost per year whether it belongs in the budget, and reporting only one of them hides the compounding. Person-hours are tracked beside dollars, because a meeting with a modest dollar figure can still burn hundreds of hours a year, and flagging anything above 500 person-hours a year catches roughly a quarter of one full-time equivalent. The annual ranking then surfaces the ten most expensive recurring slots, which is where the audit goes, not the largest room. The return test is applied to each of them: a meeting must be forecast to produce decisions or alignment worth at least twice its annual cost, and a meeting with no forecastable decision fails that test however cheap it is. And the quarterly report ends the sequence, because a cost trend with no named intervention attached to it is only a number that moved.',
      items: [
        {
          step: 1,
          label: 'List attendees and their loaded rate for each meeting',
          gate:
            'Every recurring meeting carries its attendee list with one loaded rate per attendee, and the weighted-average rate for the meeting is computed and written down; the rates come from the bands USD 50-90/hr IC, USD 80-150/hr senior IC, USD 120-200/hr manager, USD 200-350/hr director, USD 300-500/hr VP, USD 400-800/hr C-level.',
          blockIf:
            'Without an attendee-level rate list you cannot tell a room of juniors from a room of executives, so the per-meeting figure hides who is actually driving the cost and the next step produces a ranking with no explanation behind it. If a weighted average is used but the underlying rates are not retained, the average cannot be audited later, and the usual result is an argument about whose salary band was applied rather than a decision about which meeting to change.',
        },
        {
          step: 2,
          label: 'Compute per session, per quarter and per year for each meeting',
          gate:
            'Each meeting shows three figures side by side: per session = weighted rate × attendees × hours, per quarter = per session × weekly frequency × 13, and per year = per session × weekly frequency × 48 working weeks, with the frequency taken from the calendar and the 48-week basis stated.',
          blockIf:
            'A single horizon collapses three different decisions into one number, and the decision taken from it is usually the one the horizon cannot support: a per-session figure makes a weekly slot look negligible, and an annual figure makes a fast-growing calendar look stable until the year closes. If the frequency behind the quarterly and annual figures is not read off the calendar, both of them inherit a guess, and the 13-versus-48 relationship stops reconciling.',
        },
        {
          step: 3,
          label: 'Roll every meeting up into one org-wide line',
          gate:
            '1 quarterly total and 1 annual total are produced from every recurring meeting on the calendar, with ad-hoc and one-off meetings carried on a separate line rather than merged, and the two totals are reconciled against the meeting count itself — 24 recurring meetings on the calendar must appear as 24 in the roll-up.',
          blockIf:
            'An aggregate assembled from remembered recurring meetings understates the true spend while still looking precise, so the intervention is aimed at the recurring line while the ad-hoc requests keep arriving, and the next reporting cycle shows the savings were illusory. If the totals are not reconciled against the meeting count, a missing meeting is indistinguishable from a genuine reduction, and the trend line records a change that never happened.',
        },
        {
          step: 4,
          label: 'Rank the top 10 meetings by annual cost',
          gate:
            'Exactly 10 meetings are ranked by annual cost, each carrying its share of the total (typically 60-80%), and every meeting outside those 10 has a written reason for staying on the calendar rather than a default of never having been looked at.',
          blockIf:
            'If the worklist is assembled by memory or by asking which meetings people dislike, it will not match the cost data, and the highest-stakes candidates get skipped while the most visible or most resented meeting gets cut — a selection bias that is invisible in the report because the report does not say how the list was chosen. Without the concentration share written down, nobody can tell whether the worklist is a short list or a re-ranking of the whole calendar.',
        },
        {
          step: 5,
          label: 'Convert each meeting into person-hours and FTE equivalents',
          gate:
            'Person-hours per year = attendees × duration in hours × weekly frequency × 48 is computed for every meeting, and the two thresholds are applied explicitly: above 500 person-hours (about 0.25 FTE) is flagged for senior review and above 2,000 person-hours (1 full FTE) is named.',
          blockIf:
            'Without the person-hour view the analysis is denominated in money alone, and a calendar made of small frequent slots — the exact pattern that destroys maker time — shows up as a trivial dollar line that nobody schedules against. If the thresholds are not written onto the sheet, the flag becomes a matter of taste, and the meetings that consume a quarter of a person or a whole person stay in the calendar indefinitely because no one was asked to decide about them.',
        },
        {
          step: 6,
          label: 'Apply the 2x decision-value gate to the worklist',
          gate:
            'For every meeting on the worklist, the expected decision or alignment is written in one sentence before it happens, and its value is at least 2x that meeting\'s annual cost, or the meeting is explicitly marked as failing the gate with a named owner and a date for the restructure or the removal.',
          blockIf:
            'Without a written expected decision, the value column becomes an opinion, and the gate passes or fails on who estimates highest — which turns the test into an argument rather than a filter. If the meeting is not marked as failing with an owner attached, the gate produces a list nobody acts on, so the worklist stays on the report and the annual cost never moves even though the analysis identified it perfectly.',
        },
        {
          step: 7,
          label: 'Report the quarterly total with a drift trigger attached',
          gate:
            'Total meeting cost is reported each quarter against the prior quarter with the trend written on the report, and the trigger is explicit: drift above 10% quarter over quarter opens a calendar audit with a date and an owner, and the percentage is computed from the same roll-up used in Step 3.',
          blockIf:
            'If the trigger has no date and no owner, a 30% drift produces a note in a deck rather than an audit, and the same drift compounds for another quarter before anyone acts — at which point the remediation is a structural change rather than a calendar tidy. If the quarterly report is assembled from a different source than the original roll-up, the trend compares two different definitions of a meeting, and the drift you are chasing turns out to be a change in methodology.',
        },
      ],
    },
    zh: {
      intro:
        '一份会议成本分析能不能拿到管理层面前站住，看七件事，而每一件都可能留下一个看起来完整的数字，而它本该支撑的分析并不成立。一步算不算做完，不看有没有数，而看别人能不能从同一个来源把它复算出来——与会名单、每个人背后的职级区间、时长折成小时，都写下来而不是靠记。三个时间维度要在同一轮里读：单场回答这个时段值不值，季度回答这个模式在不在变大，全年回答它该不该进预算——只报一个维度，就把复利藏起来了。人时要与美元并排记，因为一场美元数字不高的会，一年仍可能烧掉几百个人时，而超过 500 人时/年的会议正好等于四分之一个全职。年度排名随后把最贵的十个常例时段挑出来，那才是审计要去的地方，不是最大的会议室。回报检验随后逐个套上去：一场会议必须能预测出至少两倍于其年度成本的决策或对齐价值，而一场预测不出决策的会，无论多便宜都过不了关。季度报告收尾，因为一条没有挂上具体干预动作的成本趋势，只是一个动了一下的数。',
      items: [
        {
          step: 1,
          label: '为每场会列出与会者名单与各自的全负荷费率',
          gate:
            '每一场常例会议都带着一份与会者名单，每人一条全负荷费率，并算出这场会的加权平均费率写下来；费率取自 50-90 美元/小时的 IC 段、80-150 的高级 IC 段、120-200 的经理段、200-350 的总监段、300-500 的 VP 段、400-800 的 C 级段。',
          blockIf:
            '没有按人的费率清单，你就分不清一间全是 junior 的房间和一间全是高管的房间，单场数字于是把「到底是谁推高了成本」藏了起来，下一步产出的排名也就没有了背后的解释。如果只留下加权平均、却不保留底层费率，这个平均事后无法复核，最常见的结局是大家开始争论该用哪一档薪资，而不是讨论该改哪一场会。',
        },
        {
          step: 2,
          label: '给每场会算出单场价、季度价与年度价三个数',
          gate:
            '每场会并排给出三个数：单场价 = 加权费率 × 与会人数 × 小时数，季度价 = 单场价 × 每周频次 × 13，年度价 = 单场价 × 每周频次 × 48 个工作周；频次取自日历，并且写明 48 周这个年度基准。',
          blockIf:
            '只有一个维度，就把三个不同的决定压成了一个数，而从它身上做出的决定通常是那个维度支撑不了的那个：单场价让每周例会显得微不足道，年度价让一个正在快速膨胀的日历显得平稳，直到年底。季度价与年度价背后的频次若不是从日历上读的，这两个数就一起继承了一个猜测，13 与 48 之间的关系也不再对得上。',
        },
        {
          step: 3,
          label: '把日历上所有常例会议汇总成一条组织级明细条目',
          gate:
            '从日历上每一场常例会议汇出 1 个季度总额和 1 个年度总额，临时会与一次性会议单独一行而不合并，并且这两个总额能与会议场次本身对账（日历上共 24 场常例会议，汇总里就必须是 24 场）。',
          blockIf:
            '用「记得住的常例会议」拼出来的汇总会低估真实支出，可它看上去依然精确，于是干预打在常例上，临时申请照旧涌来，总额几乎不动，下一轮汇报就会显示省的全是幻觉。如果总额不与场次对账，漏掉一场会和真实减掉一场会就分不出来，趋势线上记录的那次变化根本没发生过。',
        },
        {
          step: 4,
          label: '按年耗排出一份前 10 名会议的高利害工作清单',
          gate:
            '按年耗排出正好 10 场会，每场写明它占总消耗的份额（通常 60-80%）；名单之外的每一场会都写得出留在日历上的理由，而不是默认「从没被看过」。',
          blockIf:
            '名单如果是凭记忆拼的、或者靠问「大家最讨厌哪些会」拼出来的，它就不会和成本数据一致，于是利害最大的那几场被跳过，最显眼或最招人烦的那场反而被砍掉——这种选择偏差在报告里完全看不见，因为报告没说名单是怎么来的。不把集中度份额写下来，也没人分得清这是一份短名单，还是把整份日历重新排了一遍。',
        },
        {
          step: 5,
          label: '把每一场会议换算成每年人时与 FTE 等价消耗量',
          gate:
            '每一场会都算出 每年人时 = 与会人数 × 时长（小时）× 每周频次 × 48，并且明确套用两条阈值：超过 500 人时（约 0.25 个 FTE）标出来送上级审阅，超过 2,000 人时（整整 1 个 FTE）直接点名。',
          blockIf:
            '没有人时视角，这份分析就只用美元做分母，而由「小而频繁」堆起来的日历——恰恰是那种正在摧毁创造者时间的形态——会显示成一行微不足道的美元，从没有人拿它去排日程。如果阈值不写在表上，标记就变成凭感觉的事，而那些吃掉四分之一个人或整整一个人的会议就会一直留在日历里，因为从来没有人被要求就它们做决定。',
        },
        {
          step: 6,
          label: '给工作清单套上 2 倍决策价值的 ROI 门槛',
          gate:
            '名单上每一场会都在开会之前用一句话写下预期产出的决策或对齐，其价值至少要达到该会年耗的 2 倍；达不到的，明确标为未过门槛，并写明负责重构或取消的人与日期。',
          blockIf:
            '没有写下来的预期决策，价值那一列就变成意见，门槛的通过与否取决于谁的估值最高——这把筛子就变成了吵架工具。如果未过门槛的会没有被连同负责人一起标出来，门槛只会产出一张没人执行的名单，于是工作清单一直躺在报告里，而年耗纹丝不动，哪怕分析已经把问题指得清清楚楚。',
        },
        {
          step: 7,
          label: '按季度汇报会议成本总额，并挂上漂移触发器',
          gate:
            '每季度把会议成本总额与上一季度对比汇报，趋势写在报告上，触发器明确：季环比漂移超过 10% 就启动一次日历审计，审计要有日期和负责人；这个百分比必须用步骤 3 那份同一份汇总来算。',
          blockIf:
            '触发器没有日期也没有负责人，30% 的漂移就只会变成 PPT 上的一句备注，而不是一次审计，同样的漂移再复利一个季度才有人动手——那时补救动作已经得是结构性改造，而不是整理日历。如果季度报告和最初的汇总不是同一个来源，趋势就是在比较两种不同的「一场会」的定义，最后你追的那个漂移其实是口径改了。',
        },
      ],
    },
  },
};
