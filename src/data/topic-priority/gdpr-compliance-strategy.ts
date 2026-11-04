// P166 —— L 类（Legal & Compliance）主题「gdpr-compliance-strategy」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 多个成本中心同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一条
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是你自己的经营阈值 ⇒ 金额可以手写，但必须带口径）：
//   · 罚款上限一律写成「固定欧元项与上一财年全球集团营业额百分比的较高者」，不给固定项的具体数额
//   · 营业额 = 上一财年全球集团营收，不是欧盟区营收
//   · 成本一律全负荷（隐私与法务工时 + 工程工时 + 工具），不是负责人的薪资行
//   · 每个比率都写明期间与分母
//   · 只引用可自查的比例、时限与既有指南里的阈值（2% / 4% 营业额腿、30 天法定时钟、60 天延期缓冲、
//     10 个百分点的差距、40-70% 的自动化降幅、2-6 小时人工基准），不写法律意见、不编条款编号
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'A fine is a ceiling on what a violation can cost, not an expected expense, and treating it as an expense is how compliance budgets get built backwards. Read the two Art. 83 tiers and take the higher leg for your own worldwide group revenue for the preceding financial year, never EU-only revenue, then multiply by an honest probability, which for most B2B SaaS with a lawful basis, a signed DPA chain and no cross-border gap sits well under 5% a year, and treat that product as a risk budget rather than a forecast. The other three lines are recurring costs, and they usually dominate: a DSAR priced at 1,400-3,000 fully loaded per request, a consent banner whose opt-in rate is high because it leans on friction a regulator does not accept, and a contracting process that costs more per vendor than the vendor is worth. Below a certain scale the recurring costs exceed the risk-weighted fine line, which means automation and consent UX repay faster than additional legal headcount. Industry profile matters too: AdTech and HealthTech attract materially more scrutiny than B2B SaaS for identical behaviour, so the probability estimate is the one number on this page that is genuinely yours rather than derived.',
      rows: [
        {
          priority: 1,
          metric: 'DSAR unit cost, fully loaded — (privacy time + legal review + engineering data pull + tooling) ÷ requests closed in the trailing 12 months',
          fixFirst:
            'Start here because it is the largest recurring line for most companies below enterprise scale, and because it is the line most often measured wrong. The privacy owner hour is what people count; the engineering data pull and the legal review of redactions are real cost that sits in somebody else budget and never shows up next to the DSAR line. The four numbers in the guide are only comparable once each is fully loaded, and until then a DSAR line that omits engineering time makes the consent line look expensive by comparison and pushes the quarter spend into legal review hours. Write the per-request figure next to the volume behind it, because a low unit cost on 40 requests a year is a different problem from a high unit cost on 400.',
          alsoMoves:
            'It moves the annual run-rate in one stroke, because this is the line that scales with volume rather than with a hiring decision, and it is the line that decides whether the answer in Step 6 is automation or more counsel. It also moves the fine-exposure row indirectly: a smaller manual load means the same volume is served by fewer people, so a lapse in process is less likely to be caught, and a slower but documented process protects the mitigation argument better than a fast undocumented one. And a fully loaded unit cost gives you a clean denominator for the consent line, because both are then measured against the same revenue figure rather than against whatever finance allocated.',
          backfire:
            'Cutting this number has one dangerous version: reaching a low unit cost by dropping the edge cases. Joint accounts, minor data subjects, deceased data subjects and third-party references needing redaction all land on the manual desk, and if the unit-cost target is met by refusing or deferring them, the one-month clock still runs and a late response is itself a finding on the lower turnover leg — a cost line traded for exposure. The other version ships the response faster without checking it, so a request is marked closed while fields are missing; unit cost improves immediately and the rework hides until the next request arrives.',
        },
        {
          priority: 2,
          metric: 'Banner parity and validity — (consent records where the reject control matches the accept control in size, colour and click count, with no pre-ticked purpose) ÷ consent records, with the opt-in rate reported separately',
          fixFirst:
            'Fix validity before you fix opt-in, because opt-in rate is the one metric in this set that can be made to look good by the very thing that makes the consent worthless. The guide already puts a compliant banner in a specific opt-in band; if your number sits above that band, the extra consent is coming from friction rather than from preference, and the measurement is measuring the banner instead of the customer. Read the banner once the way a first-time visitor sees it: is the reject button the same size, the same colour, the same number of clicks? Once validity holds, opt-in rate becomes a business metric you can move, and until then any revenue you recover from consent work is revenue you may have to unwind.',
          alsoMoves:
            'It moves the revenue side of the consent line at the same time, because an honest reject flow produces a measurable audience you can still work with, whereas a banner that only produces acceptances leaves you with a rate and no audience. It also moves the fine-exposure row: the dark-pattern shortcut is the shortest route from a good-looking opt-in number to a finding on the 4 percent turnover leg rather than the 2 percent leg, so the distance between those two legs is the price of the shortcut. And validity is the precondition for the recovery modelled in Step 3, because a recovery figure computed on an unreliable consent record models the wrong thing entirely.',
          backfire:
            'Honesty has a cost that shows up before the benefit does. Making the reject path genuinely equal usually lowers the opt-in rate in the first two weeks, and if the number you report weekly is the opt-in rate, the change reads as a regression and gets reverted, leaving you where you started with the exposure intact. The opposite direction fails too: pushing opt-in rate up through pre-ticked purposes, a cookie wall or a buried reject control produces a rate inside the target band and an invalid consent record underneath it, so the metric that was supposed to improve is the one that was hiding the problem.',
        },
        {
          priority: 3,
          metric: 'DPA cost per counterparty — (legal hours per DPA × loaded rate + redline handling + sub-processor flow-down work) ÷ DPAs signed in the trailing 12 months',
          fixFirst:
            'Fix contracting third because it is the only line here that does not scale with traffic and does not move the top line, which is exactly why it gets deferred and then crowds out everything else. When DPAs per quarter and negotiation rounds rise together, cost per DPA is the one figure in the set a decision can move without engineering time, without a UX project, and without waiting on a vendor. Standardise the template and pre-approve a fallback position; that is a week of work. The counterparties who will not accept the fallback are the ones worth spending legal hours on. Measure cost per signed DPA and the count of counterparties still open at the same time, because a per-DPA cost that looks fine while the open count climbs is a queue, not a price.',
          alsoMoves:
            'It moves the fine-exposure row more than its size suggests, because a missing or unsigned processor contract sits on the lower turnover leg, and every counterparty you have not signed with is an open question in the file you would hand to an authority. The run-rate in Step 5 moves as well, in a way the other lines cannot: a standardised template is a fixed piece of work that does not recur per request, so it lowers the annual figure without lowering the volume behind it. And the sub-processor list you build while standardising is the same artefact you need for the transfer leg, so the hours here are not overhead — they are the record that keeps the exposure row honest.',
          backfire:
            'Standardising the template can harden a weak position. A pre-approved fallback decides in advance which clauses you give up, and if the fallback was set by whoever was most available on the day it was written, the terms you concede across 40 counterparties are the terms you agreed to in one negotiation you did not prepare for. The other failure is speed: closing the open count by accepting the last redline converts a visible backlog into invisible obligations — bespoke sub-processor commitments you must honour at every future sub-processor change, which lands on the run-rate two quarters later.',
        },
        {
          priority: 4,
          metric: 'Probability-weighted fine exposure — (statutory ceiling computed from worldwide group turnover) × (your written annual probability estimate per violation class), set against the annual recurring run-rate',
          fixFirst:
            'Fix the exposure row fourth because the ceiling itself is not a lever — it moves with your revenue, not with your behaviour — so what you can actually work on is the probability term, and that is where your four triggers in Step 7 live. A new sub-processor, a new transfer destination, a product launch that changes the lawful basis, a reportable breach: each is a probability event first and a fine event second. Compare the expected figure against the recurring run-rate before doing anything else, because if the recurring lines are larger then the right spend on this row is the cheap probability reduction — a signed processor contract, a documented lawful basis, a transfer basis written down — and not a large retainer bought out of fear of a ceiling you never approach.',
          alsoMoves:
            'It is the row that makes the ranking in Step 6 meaningful, because ranking four numbers requires the same denominator and the same period on all four, and the probability estimate is where that discipline usually breaks first. The run-rate moves with it: a documented lawful basis and a signed transfer basis cost a fraction of a quarter of external counsel, and they reduce the probability term without touching the ceiling. And because the ceiling runs on worldwide group revenue for the preceding financial year, this row tells you what the recurring lines cannot — whether your exposure is driven by scale, which is a board conversation, or by your own process, which is a sprint.',
          backfire:
            'A probability estimate is the easiest number in this table to flatter and the hardest to defend. Write 2 percent instead of 5 percent because it looks more manageable and the comparison in Step 6 inverts, sending budget toward a retainer and away from the request handling that was actually costing you money. The other failure is optimising the wrong side of the ceiling: where the fixed leg dominates, percentage-driven probability work moves nothing at all, while a company with one unsigned processor contract is exposed on a much smaller number that is entirely within your control.',
        },
        {
          priority: 5,
          metric: 'Annual compliance run-rate against the band for your revenue tier — (DSAR + consent + contracting + tooling + people) for one year ÷ annual revenue, compared with the published band for your size',
          fixFirst:
            'Close with the run-rate because it is the only row that is not an input — every other row feeds it — and because the decision it supports is an allocation decision rather than a spending decision. Once the four numbers are fully loaded and comparable, the question is no longer whether compliance costs money but where the next unit of budget goes: into request handling and consent UX, or into review hours and retainers. For most companies below enterprise scale the answer is the former, and the run-rate band is what tells you when the exception applies. Track it as a ratio to revenue with the period written down, so next quarter the conversation is about a number that moved rather than a number quoted once.',
          alsoMoves:
            'It moves every row above it, because a run-rate out of band is almost always a composition problem rather than a size problem — one line is disproportionate and the rest are fine. Reading the ratio against revenue also tells you which lever to pull next: a run-rate that shrinks as revenue grows belongs to a business that has scale, while a flat run-rate under flat revenue belongs to a business that accumulated process without removing any. And because the run-rate is the number that survives a budget review, it is the one that keeps the quarterly re-run in Step 7 funded.',
          backfire:
            'Squeezing the run-rate into the band is easy in ways that damage every metric above it. The classic version defers DSAR capacity and lets the one-month clock absorb the backlog: the annual figure drops in the period you cut it, and the exposure surfaces as late responses rather than as a cost line. The other version reuses the numbers you already have — a run-rate that reuses last quarter hours and last quarter headcount can be made to look on-band while the underlying work stays exactly as heavy, and the gap reappears as a surprise the next time volume moves.',
        },
      ],
    },
    zh: {
      intro:
        '第 83 条那两行给的是上限，不是预期账单，而合规预算最常见的错法就是从账单那头往回倒着编。先按你上一财年的全球集团营收取更高的那一档 —— 绝不用欧盟区营收 —— 再乘一个诚实的概率。对多数具备合法性基础、DPA 链完整、没有跨境缺口的 B2B SaaS，这个年概率远低于 5%，所以相乘之后那是风险预算，不是预测。另外三条是经常性成本，通常才是真正压人的那部分：单次 DSAR 全负荷成本 1,400 到 3,000 美元；一个同意率很高、但靠的是监管不接受的摩擦堆出来的同意横幅；以及一个每家供应商签约成本比供应商本身还贵的谈判流程。在一定规模以下，经常性成本会高过风险加权后的罚款线，也就是说自动化和同意 UX 的回报快于追加法务人手。行业画像也要算：同样的行为，在 AdTech 和 HealthTech 招来的审视明显比 B2B SaaS 重，所以概率估计是这张表里唯一一个真正属于你、而不是从规则里推出来的数。',
      rows: [
        {
          priority: 1,
          metric: 'DSAR 单次全负荷成本 —— （隐私工时 + 法务复核 + 工程取数 + 工具成本）÷ 过去 12 个月已结案请求数',
          fixFirst:
            '从这一行开始，因为它对多数企业级规模以下的公司来说是最大的经常性支出，也是最常被算错的一条线。大家习惯数的是隐私负责人自己的工时，而工程取数与脱敏的法务复核是真金白银的成本，只是记在别的预算里，从来没跟 DSAR 这条线放在一起看。指南里的四个数字只有在都算全负荷之后才可比；在那之前，一条漏掉工程工时的 DSAR 会让同意那条线在对比里显得很贵，于是本季度的预算被推去做法务复核工时。把单次成本写在它背后的请求量旁边 —— 一年 40 单的低单次成本，和一年 400 单的高单次成本，是两个完全不同的问题。',
          alsoMoves:
            '它一步就能带动年度运行成本，因为这是唯一一条随请求量缩放、而不是随招人决定缩放的成本线，也正是它决定了步骤 6 的答案是「上自动化」还是「加律师工时」。它还会间接带动罚款敞口那条线：手工负荷变小意味着同样的请求量由更少的人处理，流程出纰漏被发现的概率随之上升 —— 一个慢但有文档的流程，比一个快但没文档的流程更能保住「已采取补救措施」这一条抗辩理由。而一个全负荷的单次成本，还给了同意那条线一个干净的分母，因为两条线于是都能对着同一个营收数字量，而不是对着财务随手分下来的预算量。',
          backfire:
            '压这个数字有一个危险版本：靠丢掉边缘情形把单次成本做低。联名账户、未成年人数据主体、已故人士的请求、需要脱敏的第三方引用，这些全部落在人工桌上；如果单次成本目标是靠拒收或推迟它们达成的，一个月法定时钟照样在走，而逾期本身在较低那条营业额腿上就是一项处罚事由 —— 你等于用成本换成了敞口。另一个版本是更快交付但不核对，请求被标记为已结案而字段其实缺失；单次成本立刻变好，而返工要到下一个请求来的时候才暴露。',
        },
        {
          priority: 2,
          metric: '横幅对等与同意有效性 —— （拒绝控件与接受控件在尺寸、颜色与点击次数上对等，且没有预勾选目的的同意记录数）÷ 同意记录总数；同意率单独另报',
          fixFirst:
            '先修有效性，再修同意率，因为同意率是这张表里唯一一个「靠让同意变得无效的动作也能变好看」的指标。指南已经把合规横幅落在某个同意率区间里；如果你的数字高于那个区间，多出来的那部分同意来自摩擦而不是偏好，于是这个度量度的是横幅，而不是访客。像一个第一次来的访客那样读一次横幅：拒绝按钮是否同样大小、同样颜色、同样点击次数？有效性一旦成立，同意率就变成一个你能推动的商业指标；在它成立之前，你在同意这件事上找回的任何营收，都可能要再退回去。',
          alsoMoves:
            '它同时带动同意那条线的营收侧，因为一个诚实的拒绝流程会产出一群仍可触达的可测量受众，而一个只会产出「同意」的横幅只给你一个数字、没给你受众。它还带动罚款敞口那条线：暗黑模式是从一个好看的同意率通向 4% 营业额腿处罚事由的最短路径，而 2% 腿与 4% 腿之间的差额就是走捷径的价钱。有效性还是步骤 3 里做营收回收建模的前提，因为在一个靠不住的同意之上算出来的回收数字，建模的是完全错误的东西。',
          backfire:
            '诚实是有成本的，而且成本比收益先出现。把拒绝路径真正做成对等，通常会在头两周把同意率压低；如果你每周要报的数字就是同意率，这个改动会被读成一次倒退而被撤回，于是你回到原处，敞口却还在。反方向同样会失败：靠预勾选目的、cookie 墙或把拒绝控件藏起来把同意率推高，产出的是一个落在目标区间内的数字，而底下的同意记录是无效的 —— 本来该修好的那个指标，恰恰是一直在替问题打掩护的那个。',
        },
        {
          priority: 3,
          metric: '单家对手方 DPA 成本 —— （每份 DPA 的法务工时 × 全负荷时薪 + 红线处理 + 次级处理者义务传导工作）÷ 过去 12 个月签署的 DPA 份数',
          fixFirst:
            '第三条修签约，因为它是在这张表里唯一一条既不随流量缩放、又不影响营收的线 —— 也正因为如此它总被往后拖，最后把别的东西全挤掉。当每季度 DPA 数与谈判轮次一起涨时，单份 DPA 成本是这张表里唯一一个不靠工程工时、不靠 UX 项目、不用等供应商就能靠决策动的数字。把模板标准化、把退让立场预先批准，这是一周的工作量；不接受退让立场的那些对手方，才是值得花律师工时去谈的。单份签署成本与仍未签的对手方数量要一起看 —— 单份成本看着漂亮而未签数量在涨，那叫排队，不叫价格。',
          alsoMoves:
            '它带动罚款敞口那条线的程度超出它自身的量级，因为一份缺失或没签的处理者合同落在较低的营业额腿上，而每一个没签下的对手方，都是你交给监管的那份档案里的一个悬而未决的问题。它也以其他几条线做不到的方式带动步骤 5 的运行成本：标准化模板是一块固定工作，不会按请求重复发生，所以它能在请求量不变的前提下压低年度数字。而你标准化时顺手建起来的次级处理者清单，正是处理传输那条腿所需要的同一份材料 —— 所以这里的工时不是合规开销，而是让敞口那条线保持诚实的那份记录。',
          backfire:
            '标准化模板可能把一个软弱的立场固化下来。预先批准的退让立场等于提前决定了哪些条款你肯让，而如果这份立场是写它那天刚好最闲的人定的，那么你在 40 家对手方上让掉的条款，就是你在一次没准备的谈判里答应下来的条款。另一个失败是求快：靠接受对方最后一条红线来清掉未签数量，等于把一个看得见的积压换成一堆看不见的义务 —— 那些定制的次级处理者承诺，你此后每换一次次级处理者都得兑现，而它的成本要到两个季度之后才落回运行成本。',
        },
        {
          priority: 4,
          metric: '概率加权后的罚款敞口 —— （按全球集团营收算出的法定上限）×（你为每类违规写下的年度概率估计），再与年度经常性运行成本对比',
          fixFirst:
            '罚款敞口这条线排第四，因为上限本身不是杠杆 —— 它跟着你的营收走，不跟着你的行为走 —— 你真正能动的其实是概率那一项，而步骤 7 的四个触发事件恰好全都长在概率这一项上。新的次级处理者、新的传输目的地、改变合法性基础的产品发布、发生可报告泄露：这四件事首先都是概率事件，其次才可能是罚款事件。在做任何别的事情之前，先把这个期望值与经常性运行成本对比：如果经常性那几条线更大，那么这条线上正确的投入是那种便宜的概率削减 —— 一份签好的处理者合同、一条写下来的合法性基础、一套成文的传输依据 —— 而不是因为怕一个你根本够不着的上限而去买大额外部顾问。',
          alsoMoves:
            '它是让步骤 6 的排序真正成立的那一行，因为给四个数字排序，前提是四个数字在同一个分母、同一个期间上，而纪律最先崩掉的地方通常就是这个概率估计。它也带动运行成本：一条写下来的合法性基础和一套签好的传输依据，成本远低于一个季度的外部顾问，而它们削的是概率那一项、没碰上限。而且因为上限是按上一财年全球集团营收算的，这一行能告诉你经常性那几条线永远告诉不了你的事 —— 你的敞口到底是被规模驱动（那是董事会的议题），还是被自己的流程驱动（那是这个冲刺的议题）。',
          backfire:
            '概率估计是这张表里最容易自我美化、也最难自证的一个数。把 5% 写成 2% 只因为它看起来更可控，步骤 6 的比较就会整个反过来，预算被推向外部顾问，而不是推向那个真正在花你钱的请求处理。另一个失败是优化了上限的错误一侧：固定项占主导的区间里，围绕百分比做的概率工作一点都推不动，而一家只差一份没签的处理者合同的公司，敞口落在一个小得多的数字上，而且完全在你手里。',
        },
        {
          priority: 5,
          metric: '年度合规运行成本对营收层级的区间 —— （DSAR + 同意 + 签约 + 工具 + 人力）一年的总额 ÷ 年营收，再与你这个规模的已公布区间对比',
          fixFirst:
            '运行成本放到最后，因为它不是输入 —— 其他每一行都在喂它 —— 也因为它支持的决定是「钱分到哪里」而不是「要不要多花钱」。当四个数字都算全负荷且口径可比之后，问题就不再是合规要不要花钱，而是下一个单位预算去哪儿：是投到请求处理与同意 UX，还是投到复核工时与常年顾问。对多数企业级规模以下的公司，答案是前者；而运行成本区间就是告诉你何时例外成立的那个数。把它按占营收的比例来追踪并写明期间，这样下个季度的讨论是关于一个动了的数字，而不是关于一个被引用过一次就再没出现过的数字。',
          alsoMoves:
            '它带动上面每一行，因为一个跑出区间的运行成本几乎总是构成问题而不是规模问题 —— 某一条线占了过大的比重，其余几条都是好的。把这个比例对着营收读，还能告诉你下一个杠杆该拉哪个：营收在涨而运行成本在缩，说明这家公司有规模；营收不动运行成本也不动，说明这家公司攒了一堆流程却从来没拆过。而且因为运行成本是唯一能熬过预算评审的数字，它也是让步骤 7 那个季度重跑有钱做的那个数。',
          backfire:
            '把运行成本挤进区间，有很多种做法，每一种都会破坏上面那些指标。最经典的版本是推迟 DSAR 产能、让一个月的法定时钟去吸收积压 —— 你砍成本的那个季度年度数字确实降了，而敞口以逾期响应的形式出现，根本不体现在成本线上。另一个版本是复用你手上已有的数字 —— 用上季度的工时加上季度的编制拼出来的运行成本，可以被做成正好落在区间里，而底下的活一点没少，直到流量变动时那个缺口才炸出来。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Size each cost centre before you rank it, because the ranking is only as good as the comparability of the four lines it sorts. The fine exposure comes first and it is a ceiling: pick the Art. 83 tier that matches your most likely violation class, 4% for lawful-basis, consent or transfer failures and 2% for records, security or processor-contract failures, enter worldwide group revenue for the last financial year, and read the result as a budget to be compared against the three recurring lines rather than in isolation. The DSAR line comes next, and it is usually the half-measured one: monthly request volume, manual hours per request, a loaded DPO hourly rate and the current automation percentage, benchmarked against the 2-6 hours per request the ICO code of practice treats as manual. The consent line is third, and its threshold is about the banner rather than the tool: a gap under 10 points between your rate and the target means layout, reject-button parity and purpose granularity are the problem, and rewriting the banner recovers more than changing vendor. The contracting line is fourth, priced per DPA including negotiation rounds, legal hours per round and redlines, and once a DPA costs more than roughly 3,000 dollars the fix is templates and an approval path rather than a better negotiator.',
      items: [
        {
          step: 1,
          label: 'Fine ceiling computed on the higher leg, with a written probability estimate',
          gate: 'One ceiling computed from the preceding financial year worldwide group revenue, taking the higher of the fixed euro leg and the 2 percent or 4 percent turnover leg, plus a written annual probability estimate per violation class, with both numbers on the same line and the turnover figure shown.',
          blockIf:
            'If the ceiling was computed on EU-only revenue, or read off the fixed euro leg without comparing, then the number you are budgeting against is not your ceiling and every comparison in Step 6 is built on top of it. And with no probability estimate written down, the ceiling is being used as an expected loss, which is a claim you cannot support in a budget review and will not survive being read aloud.',
        },
        {
          step: 2,
          label: 'DSAR cost measured fully loaded and split by request type',
          gate: 'Annualised DSAR cost computed with privacy time, legal review, engineering data pull and tooling all included, per-request cost compared against the 100-300 euro manual band and the 10-30 euro mid-automation band, and the request mix split into access, erasure, portability and rectification before any average is taken.',
          blockIf:
            'A DSAR line that counts only privacy owner hours will always look cheap, and cheap here means the money is still being spent somewhere else in the company, which is why a mis-scoped DSAR budget keeps returning as an unfunded request from engineering. Splitting by type matters separately: erasure runs a multiple of access, so a blended average understates the cost of the requests that are actually expensive and sends you to automate the cheap ones first.',
        },
        {
          step: 3,
          label: 'Consent impact modelled in percentage points against a named target',
          gate: 'Monthly EU traffic, current opt-in rate, target opt-in rate and conversion rate all entered, the gap expressed in percentage points and compared against the 10 percentage point threshold from the guide, the baseline window fixed at 4 weeks, and the recovered monthly and annual revenue written in USD with CMP and server-side tagging cost subtracted to give a net figure.',
          blockIf:
            'A revenue figure without the percentage-point gap next to it cannot be argued about, because a 3 point gap on a large audience and a 20 point gap on a small one produce very different priorities and often the same headline number. If the CMP and tagging cost is not subtracted you will compare gross recovery against net cost and conclude every banner rewrite needs a new tool, when a gap under 10 percentage points is usually a copy and layout problem.',
        },
        {
          step: 4,
          label: 'DPA cost per counterparty measured next to the unsigned count',
          gate: 'DPAs per quarter, negotiation rounds, legal hours per round, loaded rate and redlines per DPA all entered, cost per signed DPA computed in USD and compared against the 3,000 USD per-DPA threshold in the guide, and the number of counterparties still unsigned written next to it, with a standard template and a written fallback position in place.',
          blockIf:
            'Per-DPA cost on its own is misleading while the unsigned count is climbing, because the easy counterparties get done and the difficult ones queue, so the average improves and the exposure does not. And a fallback position that was never written down is not a fallback: without one, every negotiation starts from scratch and the per-DPA cost you measured is the cost of the easy counterparties only.',
        },
        {
          step: 5,
          label: 'One annual run-rate assembled from four fully loaded lines',
          gate: 'A single annual figure combining DSAR handling, consent tooling and lost conversions, DPA contracting, and people and external advice, divided by annual revenue, compared against the published band for your revenue tier, with the period stated as 1 full financial year of 12 months.',
          blockIf:
            'A run-rate assembled from parts measured on different definitions is a total nobody can act on — if one line includes engineering time and the next does not, the comparison in Step 6 ranks noise. And a run-rate with no period attached gets compared against last quarter or next quarter without noticing, which is how a compliance programme appears flat while it is actually moving in the wrong direction.',
        },
        {
          step: 6,
          label: 'Spend ranked by expected-value reduction, with the allocation decision written',
          gate: 'Expected fine exposure computed as the ceiling times the probability estimate and compared against each of the 4 recurring lines over the same 12 month period, the ranking written down, and one sentence naming which line receives the next unit of budget and which line is explicitly deferred.',
          blockIf:
            'Ranking four numbers without putting them on one page and one period produces an argument about which line feels most urgent rather than which line moves total cost most. If the allocation sentence is missing, the ranking is a document nobody acts on, and the recurring lines keep absorbing the budget by default because they bill every month while the exposure line bills nothing until something goes wrong.',
        },
        {
          step: 7,
          label: 'Quarterly re-run scheduled, with the four triggers and a named owner',
          gate: 'A quarterly re-run on the calendar with a named owner, plus a re-run triggered by each of 4 events — a new sub-processor, a new transfer destination, a product launch that changes the lawful basis, and a reportable breach — with the last run date and the next one both written down.',
          blockIf:
            'A re-run nobody owns is a re-run that happens after the deadline, and by then the numbers describe a quarter that has already ended. The triggers matter more than the cadence because each one changes an input the whole model rests on: a new sub-processor adds contracting work and moves the probability estimate, and a product launch can change the lawful basis without editing a single existing document.',
        },
      ],
    },
    zh: {
      intro:
        '先给四个成本中心定尺寸，再排序，因为排序的好坏只取决于被排的四条线可不可比。罚款敞口排第一，它是上限：按你最可能犯的那类违规选 83 条的档 —— 合法性基础、同意或跨境传输失败是 4%，记录、安全或处理者合同失败是 2% —— 填上一财年的全球集团营收，把结果当预算读，然后与另外三条经常性成本对照，而不是孤立地看。DSAR 那条排第二，而且通常是唯一被量了一半的：月度请求量、每单人工工时、全负荷 DPO 时薪和当前自动化比例，对着 ICO 实务守则认定的 2-6 小时人工区间比。同意那条排第三，门槛其实落在横幅而不是工具上：当前同意率与目标差不到 10 个点时，问题在版式、拒绝按钮对等和用途分项粒度，改文案的回收大于换供应商。签约那条排第四，按每份 DPA 计价，计入谈判轮次、每轮法务工时和红线数；一旦单份 DPA 超过大约 3,000 美元，该做的就是模板加审批路径，而不是换一个更会谈的人。',
      items: [
        {
          step: 1,
          label: '罚款上限按较高项算出来，并写下每类违规的概率估计',
          gate: '用上一财年全球集团营收算出唯一一个上限，取固定欧元项与 2% 或 4% 营业额腿的较高者；再为每类违规写下年度概率估计；两个数写在同一行，并把营收口径一并标出。',
          blockIf:
            '如果上限是拿欧盟区营收算的，或者根本没比对就直接引用了固定欧元项，那你用来编预算的这个数就不是你的上限，步骤 6 的每一项比较都建在它上面。而没有写下概率估计，上限就被当成了期望损失 —— 这是你在预算评审里撑不住、当众念一遍也站不住的论断。',
        },
        {
          step: 2,
          label: 'DSAR 成本按全负荷测算，并按请求类型分轨',
          gate: '年化 DSAR 成本算上隐私工时、法务复核、工程取数与工具成本；单次成本与 100-300 欧元的人工区间、10-30 欧元的中等自动化区间对比；在取任何平均之前，先把请求量拆成访问、删除、可携带、更正四类。',
          blockIf:
            '只数隐私负责人工时的 DSAR 预算永远显得便宜，而这里的便宜意味着钱在公司的别处照样花掉了 —— 这也是 DSAR 预算算错之后，工程那边一次次来要一笔没人认领的钱的原因。分轨还单独重要：删除类的工时是访问类的数倍，混在一起的平均会低估真正昂贵的那类请求，于是你先去自动化便宜的那一半。',
        },
        {
          step: 3,
          label: '同意影响按百分点建模，并对准写下来的目标',
          gate: '月度欧盟流量、当前同意率、目标同意率、转化率全部录入，差距表达为百分点并与指南里 10 个百分点的阈值对比；基线窗口固定为 4 周；挽回的月度和年度营收用 USD 写下来，并扣掉 CMP 与服务端打点的成本得出净额。',
          blockIf:
            '只有营收数字而旁边没有百分点差距，这笔账就没法讨论：大流量上的 3 个百分点差距和小流量上的 20 个百分点差距，优先级完全不同，却常常得到同一个标题数字。若不把 CMP 与打点成本扣掉，你会拿毛回收去比净成本，于是得出「每次改横幅都得配新工具」的结论 —— 而差距不到 10 个百分点时，问题通常在文案和版式。',
        },
        {
          step: 4,
          label: '单家对手方 DPA 成本与未签数量并排看',
          gate: '每季度 DPA 数、谈判轮次、每轮法务工时、全负荷时薪与每份 DPA 的红线数全部录入，算出单份签署 DPA 成本并用 USD 表达、与指南里约 3,000 USD 的阈值对比，同时把仍未签署的对手方数量写在旁边；同时有一份标准模板和一份写下来的退让立场。',
          blockIf:
            '未签数量在涨的时候，单看单份 DPA 成本会被误导：容易签的先签掉了，难签的排起队，平均数因此变好而敞口一点没变。而一份从没写下来的退让立场不算立场：没有它，每次谈判都从头开始，你量到的单份成本只是那些容易签的对手方的成本。',
        },
        {
          step: 5,
          label: '四条全负荷的成本线汇成一个年度合规运行成本',
          gate: '把 DSAR 处理、同意工具与流失转化、DPA 签约、人员与外部顾问四块合成一个年度数字，除以年营收，与你营收层级对应的已公布区间对比，并写明期间为 1 个完整财年（12 个月）。',
          blockIf:
            '用不同口径量出来的零件拼成的运行成本，是一个没人能据以行动的总数 —— 如果一条线含工程工时而下一条不含，步骤 6 的排序排的是噪声。而没有标注期间的运行成本，会在无人察觉的情况下被拿去和上季度或下季度比，这就是合规项目看起来持平、实际在往错的方向走的原因。',
        },
        {
          step: 6,
          label: '按期望值削减排序投入，并写下一句明确的分配决定',
          gate: '期望罚款敞口按「上限 × 概率估计」算出，并在同一个 12 个月期间上与 4 条经常性线逐条对比；把排序写下来；再用一句话点名下一个单位预算给哪条线、哪条线被明确推迟。',
          blockIf:
            '不把四个数字摊在同一页、同一个期间上就排序，产出的是「哪条线感觉更急」的争论，而不是「哪条线最能压低总成本」的结论。分配那句话如果不写，排序就只是一份没人执行的文档；而经常性那几条线会默认继续吃掉预算，因为它们每月都发生，而敞口那条线在出事之前一分钱都不花。',
        },
        {
          step: 7,
          label: '季度重跑排进日历，四个触发事件与负责人都点名',
          gate: '日历上有一个季度重跑并点名负责人；另有 4 类事件各触发一次重跑 —— 新增次级处理者、新增传输目的地、改变合法性基础的产品发布、发生可报告泄露；上一次重跑日期与下一次日期都写下来。',
          blockIf:
            '没有人的重跑就是期限到了才发生的重跑，而那时这些数字描述的是一个已经结束的季度。触发事件比日历本身更要紧，因为每一个都改动了整个模型所依赖的某个输入：新增次级处理者既加签约工作量又改概率估计；而一次产品发布可以在不改动任何既有文件的前提下换掉合法性基础。',
        },
      ],
    },
  },
};
