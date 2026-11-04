// P166 —— L 类（Legal & Compliance）主题「consent-revenue-optimization」的新形态内容。
//
// 两种形态与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
//   · 本文件 fixPriority = 同意相关的多个指标同时不达标时，先修哪个 → 顺带带动谁 → 什么时候反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」——howToApply 只说做什么，不说什么算达标
//
// 口径纪律（本主题不是 B 类，讲的是你自己的经营阈值 ⇒ 金额可以手写，但必须带口径）：
//   · 同意率的分母一律是「合格会话」（eligible sessions），不是全部会话
//   · 转化率一律是「同意后转化」，不与整段会话混算
//   · 回收一律表达为「每 N 个合格会话的转化数」或百分点，绝不写成营收的百分比
//   · 金额用 USD，并写明是「每月」还是「每年」
//   · 只引用既有指南里的比例与区间（55-70%、50%、60%、10 个百分点、5-30%、30-45%、20-40%），不编法规条款编号
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Consent is a gate you can widen without changing anything about the business, and that is exactly the risk. The failure mode is specific: the team optimises the number it reports, the number turns green, and the thing the number was supposed to protect gets worse. Opt-in rate can be pushed up with friction nobody will accept, and pre-ticked boxes, a consent wall that requires scrolling, a cookie wall that blocks entry, or a reject button that is not the same weight as accept all are all non-binding under IAB TCF v2.2 while the legal exposure stays a full second-tier problem. CNIL fined Google 150M euros and Facebook 60M euros over reject-button friction in 2022, and EDPB Guidelines 03/2022 codified the bar, so this is no longer a design preference. The regional default comes first in the sequence because it decides what the banner even asks: opt-in with reject parity in the EU and EEA, opt-out with a Do Not Sell link in California, weaker enforcement in LGPD and PIPL jurisdictions. Then the banner itself, where button parity, copy and first-layer purpose granularity are the levers, because a rate below 50% is a banner problem and not a CMP problem, and the premium CMP band sits at 55-70%. Then geo-targeting so each visitor sees the right default. Then the reject flow, where a preference centre and contextual advertising recover a share of the 30-45% who refuse, and contextual CPM runs at roughly 30% of behavioural CPM.',
      rows: [
        {
          priority: 1,
          metric: 'Consent validity rate — (consents recorded with a reject option of equal visual weight, no pre-ticked purpose and no cookie wall) ÷ consents recorded, audited by replaying the banner as a first-time visitor',
          fixFirst:
            'Start with validity, before any rate, because every other line below is a business metric only if the consent underneath it can be relied on. An opt-in rate of 85 percent produced by a banner nobody could reject cleanly is not a better result than 62 percent produced by one they could, and it is worth less, because the downstream signal has no basis. Audit it by replaying the banner the way a first-time visitor sees it, on the devices and the browsers you actually serve, and write down the parity of the accept and reject controls before you open any dashboard. Once validity holds, the rest of this table becomes a set of numbers you can move.',
          alsoMoves:
            'It moves the opt-in rate row in the right direction even though it looks like it should lower it, because once you stop counting coerced consent the remaining consent is a real preference signal, and the recovery work further down stops being spent on people who never agreed. It also shifts the fine-exposure side of the picture, since the dark-pattern shortcut is the shortest route from a strong-looking rate to a finding on the higher turnover leg. And validity is what makes the modelled-recovery work worth doing, because modelled signal built on a consent record that cannot be trusted models the wrong thing very precisely.',
          backfire:
            'Making the reject path genuinely equal usually costs you opt-in points in the first two weeks, and if the metric on the weekly slide is the opt-in rate, the honest version is read as a regression and rolled back, leaving the team where it started and the exposure intact. The opposite direction fails too: pushing the rate up through pre-ticked purposes, a cookie wall or a reject control that takes two clicks produces a number inside the target band and an invalid consent record underneath it, so the metric that was supposed to improve is the one that was hiding the problem.',
        },
        {
          priority: 2,
          metric: 'Regime coverage of consent state — (sessions served the default that matches their regime) ÷ (sessions from the regions you cover), with EU, North America and the rest as three separate denominators',
          fixFirst:
            'Fix coverage second, because one banner cannot serve two legal regimes correctly, and until the right default is reaching the right session every rate you read is diluted by traffic that was never supposed to see that banner. Split the denominator into three groups — EU and EEA, California, and everyone else — and measure coverage inside each. The measurement usually exposes an addressable gap: app sessions that carry no location, corporate proxies that resolve to the wrong country, or a single global banner still being served to European traffic while you assumed the geo rules were live. Coverage is cheap to fix and it changes the meaning of everything downstream.',
          alsoMoves:
            'Removing the traffic that was never eligible for it also moves the opt-in rate row, which usually makes the EU rate higher and the blended rate lower at the same time — a divergence worth reporting rather than averaging away. It also moves the revenue row: an EU visitor served an opt-in wall with reject parity converts differently from a US visitor served a lightweight notice, and a blended conversion rate across the two hides both. And coverage is what makes the reject-flow work available, because the rejecters you want to re-engage are the ones you can only identify once the consent state is right.',
          backfire:
            'Geo coverage has a false-positive mode that is worse than no coverage at all: a visitor on a corporate proxy or a VPN can be served the wrong default, and a European visitor shown a United States notice is a consent state that does not match the regime they are in. More commonly, app and in-app sessions carry no location at all, so they fall into the everyone-else bucket and keep the lightest notice while carrying some of the highest-value consent. And a coverage metric that counts sessions only can look complete while the consent record for those sessions was never written, because the banner rendered and the state was never stored.',
        },
        {
          priority: 3,
          metric: 'Opt-in rate over eligible sessions — (sessions where a valid consent was recorded) ÷ (eligible sessions in that region), reported per regime rather than blended',
          fixFirst:
            'Fix the opt-in rate third, because once the banner is valid and correctly targeted this is a design problem rather than a legal or a data problem, and design problems are the ones you can move with copy, layout and the number of clicks on the accept path. Below 50 percent the banner is the cause rather than the platform, so the work is in the layout, the wording and the click count, not in changing vendors. Above 55 to 70 percent you are inside the band where the platform is not the constraint and further banner work has a smaller ceiling. Measure it over eligible sessions per regime, because a rate computed over all sessions looks healthy for the wrong reason whenever many of your sessions are returning visitors who consented weeks ago.',
          alsoMoves:
            'It moves the post-consent conversion row, because the accept path is the first thing an experiment touches and a shorter, clearer accept path tends to bring back not only the consent but the visit that produced it. It also sets the condition for the tool decision at the end of the sequence: the case for a premium consent platform only exists if the rate is still below 60 percent after the banner has been fixed and tested. And this rate is the denominator of the revenue model, so moving it changes the size of every recovery figure in the plan.',
          backfire:
            'Optimising this row is where dark patterns come from, because a pre-ticked purpose, a cookie wall or a reject button that requires two clicks all push the rate up and push validity down at the same time — the rate improves, the row above gets worse, and the ordering that makes this table work inverts. The subtler failure is the denominator: report the rate over all sessions rather than eligible ones and a growing stream of returning visitors who consented months ago keeps the number healthy while new visitors are being turned away, so the mix producing the rate is quietly deteriorating.',
        },
        {
          priority: 4,
          metric: 'Post-consent conversion rate — (conversions among consented sessions) ÷ (consented sessions), measured on the same variant and in the same window as the opt-in rate',
          fixFirst:
            'Fix the revenue half fourth, because a consent rate without a conversion rate attached is a compliance number wearing a revenue costume. The two must be read from the same variant over the same window, and the accept path and the reject path both have to be judged by what they produce downstream rather than by what they collect at the wall. If a variant lifts consent and drops conversion, whether the two cancel out is a question only a conversion count can answer, which is why the guide asks for both numbers and why the measurement has to survive the change. Track the revenue effect per 1,000 eligible sessions so two cohorts can be compared on the same scale.',
          alsoMoves:
            'It moves the size of the recovery in the revenue model, because the modelled gain from closing a consent gap is that gap multiplied by the conversion rate of the traffic it applies to, and the conversion rate is measured here rather than assumed from the site-wide average. It also moves the cost of the other rows, because a change to the banner that looks good on consent and bad on conversion will be reverted, and the work you have done on validity and coverage has to survive that. And it decides whether the reject flow deserves engineering time at all, or whether the volume simply is not there.',
          backfire:
            'Consented sessions can convert worse than unconsented ones, and that gap has little to do with how the banner is put together: the consented cohort is the one that receives the fuller marketing treatment, with more personalised ad exposure and more campaigns, and that treatment can depress measured conversion while the site is doing nothing wrong. Reading that as a banner problem leads you to strip the banner back and lose consent and revenue together. And when a variant changes which traffic consents, the consented cohort itself changes, so comparing two weeks of conversion without comparing the mix will tell you the banner got worse when the audience did.',
        },
        {
          priority: 5,
          metric: 'First-party re-engagement rate among rejecters — (rejecting sessions that leave contact details in exchange for something) ÷ (rejecting sessions), tracked as a percentage and as a list size',
          fixFirst:
            'Fix the reject flow fifth, because rejecting visitors are a large, identifiable and otherwise lost audience — typically a third to just under half of eligible sessions in an opt-in regime — and the moment of rejection is the only moment you are guaranteed they are reading. Make the exchange worth something to them: a preference centre that lets them choose what they receive, a lead magnet that solves a problem they have, a newsletter they would have wanted anyway. Ask for the address only as part of that exchange, and keep the reject itself a single equal-weight click, so that adding the capture step does not undo the validity work in the first row.',
          alsoMoves:
            'It moves the measurable-signal row, because a rejected session that leaves first-party contact can still be measured through channels that do not depend on the consent you did not get, and it converts a lost session into an owned audience that survives the next campaign. It also reduces the pressure to recover the same revenue through the banner itself, which is exactly what pushes teams towards the dark patterns in the first place. And a list size that grows is the argument that keeps the reject-flow investment alive when the quarterly re-baseline suggests the banner work has plateaued.',
          backfire:
            'Adding a field to the reject path is the fastest way to break the parity you built in the first row: a reject that now needs an address and a submit click is materially harder than the accept path, so the consent rate falls while your reject-flow list grows — a trade the compliance side will not approve and the growth side will want. The other failure is on the list itself: addresses captured in exchange for something and never followed up turn into a list that suppresses your own first-party campaigns, so the audience you rescued becomes the reason your email revenue drops.',
        },
        {
          priority: 6,
          metric: 'Measurable-signal recovery — (conversions you can still attribute after consent filtering, modelled conversions included) ÷ (conversions in a fully consented baseline), reported as a percentage',
          fixFirst:
            'Fix measurement recovery last, because this line settles whether the revenue you believe you lost was lost or merely became invisible. Much of the consent impact is attribution loss rather than buyer loss: the customer still bought, but the signal that would have told you which campaign did it was stripped at the wall. Delivering your analytics and advertising tags server-side, combined with consent-mode modelling, recovers a meaningful share of that signal without any change to the banner. Do it after the banner is valid and the coverage is right, because modelled recovery layered on an invalid consent models the wrong thing more precisely, and precisely wrong is worse than roughly right.',
          alsoMoves:
            'The revenue model itself moves with it, because the recoverable figure you take into the plan changes once you know how much of the loss was measurement rather than demand, and that changes which projects get budget. It also changes what the accept rate is worth: if a large share of non-consented traffic converts and is simply unmeasured, then the marginal value of another 5 points of opt-in is lower than the raw gap suggests, and the priority shifts towards the reject flow and the modelling. And a recovery number that is stable is what lets you set marketing budgets on the recovered view rather than on the consented view alone.',
          backfire:
            'Modelled conversions are estimates, and once they sit in the same report as observed ones the two become indistinguishable. If modelled revenue is reported as revenue, the loss looks smaller than it is, the fix gets deferred, and the gap between what the dashboard shows and what the bank received stays invisible for another quarter. The other version is cutting spend on channels whose conversions are simply unmeasured: attributed revenue falls because the signal fell, not because the customers did, and you cut acquisition on channels that were still working.',
        },
      ],
    },
    zh: {
      intro:
        '同意是一个可以变宽、却不必改动任何业务的闸门，而这正是它危险的地方。坏法是确定的：团队去优化它要报的那个数，数字变绿，而那个数本该保护的东西反而变坏。同意率可以靠没人会接受的摩擦堆上去 —— 预勾选的框、要滚到底才出现的同意层、不接受就不让进站的 cookie wall、以及与「全部接受」不同重量的拒绝按钮 —— 在 IAB TCF v2.2 下这些都构成不成立的同意，而法律敞口仍是完整的第二档问题。2022 年 CNIL 因为拒绝按钮的摩擦罚了 Google 1.5 亿欧元、Facebook 6000 万欧元，EDPB 03/2022 指引又把这根线写成了规范，所以这已经不是审美偏好。顺序上第一件事是法域默认态，因为它决定横幅到底在问什么：欧盟与欧洲经济区是带拒绝对等的 opt-in，加州是带 Do Not Sell 链接的 opt-out，LGPD 与 PIPL 法域执行较弱。然后是横幅本身：按钮对等、文案、首层用途分项粒度 —— 因为低于 50% 的同意率是横幅问题而不是 CMP 问题，而优质 CMP 的区间在 55-70%。再是地域定向，让每个访客看到该给他看的默认态。最后是拒绝流程：用偏好中心和上下文广告去捞回那 30-45% 拒绝掉的人，而上下文 CPM 大约只有行为广告的 30%。',
      rows: [
        {
          priority: 1,
          metric: '同意有效率 —— （记录到的同意中，拒绝选项与接受同等视觉权重、无预勾选目的、无 cookie 墙的那部分）÷ 记录到的同意总数；以首次访客视角重放横幅来审计',
          fixFirst:
            '先修有效性，再修任何比率，因为这张表里其他每一行要成为商业指标，前提都是底下那份同意靠得住。一个没人能干净地拒绝的横幅做出的 85% 同意率，并不比一个能拒绝的横幅做出的 62% 更好；它反而更不值，因为下游信号没有依据。审计的方式是像第一次来的访客那样重放你的横幅，在你真正在服务的设备与浏览器上跑一遍，并在打开任何仪表盘之前先把接受与拒绝两个控件的对等情况写下来。有效性一旦成立，这张表其余部分才变成一组你能推动的数。',
          alsoMoves:
            '它带动同意率那一行，方向是对的，尽管看起来它应该把同意率压低 —— 因为一旦你不再把被逼出来的同意算进去，剩下的同意才是真实的偏好信号，下游的挽回工作也不再浪费在从未同意过的人身上。它还带动画面里罚款敞口那一侧：暗黑模式是从一个看着漂亮的同意率通向较高营业额腿处罚事由的最短路径。而有效性正是让后面的建模回收值得做的前提，因为建在靠不住的同意之上的模型，会把错误的东西建模得格外精确。',
          backfire:
            '把拒绝路径真正做成对等，通常会在头两周付出几个百分点的同意率；如果你每周要交的数字就是同意率，这个诚实版本会被读成一次倒退而遭到撤回，于是团队回到原处，敞口却完好如初。反方向同样会失败：靠预勾选目的、cookie 墙或需要点两次的拒绝按钮把比率推高，产出的是一个落在目标区间内的数字，而底下的同意记录是无效的 —— 本该修好的那个指标，恰恰是一直在替问题打掩护的那个。',
        },
        {
          priority: 2,
          metric: '同意状态的法域覆盖率 —— （被给出与其法域相符默认值的会话）÷（你所覆盖地区的会话数），欧盟、北美与其余作为三个分开的分母',
          fixFirst:
            '第二条修覆盖率，因为一个横幅无法同时正确服务两套法律体制，而在正确的默认值还没送到正确的会话之前，你读到的每个比率都被「本来就不该看到那个横幅」的流量稀释了。把分母拆成三组 —— 欧盟与欧洲经济区、加州、其余地区 —— 分别在组内量覆盖率。这个测量通常会翻出一块可以补的缺口：没有位置信息的 App 会话、解析到错误国家的企业代理，或者你以为地理规则已经生效、实际上欧洲流量仍在看同一个全球横幅。覆盖率修起来很便宜，而它会改变下游每一个数字的含义。',
          alsoMoves:
            '它通过剔除「本来就不该计入」的流量来带动同意率那一行，通常结果是欧盟同意率变高、混合同意率变低 —— 这种背离值得单独报出来，而不是平均掉。它也带动营收那一行：一个看到带拒绝对等 opt-in 墙的欧盟访客，与一个看到轻量提示的美国访客，转化表现并不一样，而把两边的转化率混在一起会同时掩盖两者。覆盖率也是让拒绝流程那套活变得可用的前提 —— 你想再触达的那些拒绝者，只有在同意状态正确之后才认得出来。',
          backfire:
            '地理覆盖有一种比没有覆盖更糟的误判模式：走企业代理或 VPN 的访客可能被给出错误的默认值，一个欧洲访客看到美国口径的提示，就是一份与其身处法域对不上的同意状态。更常见的是 App 与应用内会话根本没有位置信息，于是落进「其余地区」那一桶，继续享受最轻的提示，而它们身上带的同意价值往往更高。还有一种：只数会话的覆盖率指标可以看起来是满的，而那些会话的同意记录其实从没落库 —— 横幅渲染了，状态却没存。',
        },
        {
          priority: 3,
          metric: '合格会话口径下的同意率 —— （记录到有效同意的会话）÷（该地区的合格会话数），按法域分别报出而不混合',
          fixFirst:
            '第三条修同意率，因为在横幅已经有效、也已经被正确定向之后，这就变成了一个设计问题而不是法律或数据问题 —— 而设计问题正是你能靠文案、版式和接受路径上的点击次数去动的那个。低于 50% 时问题在横幅而不在平台，活儿就落在版式、文案与点击数上，不是换供应商。高于 55-70% 则说明平台不是约束，继续在横幅上做文章的天花板已经很矮。按法域、用合格会话为分母来量 —— 用全部会话算出来的比率，在大量会话都是几周前就同意过的回访访客时，会因为错误的原因显得健康。',
          alsoMoves:
            '它带动同意后转化那一行，因为接受路径是任何实验最先碰到的东西，而一条更短更清楚的接受路径往往带回来的不只是同意，还有产生同意的那次访问。它也为序列末端那个工具决定划定了条件：只有当横幅已经改好并测过之后同意率仍低于 60%，买优质同意平台的论证才成立。而这个比率是营收模型的分母，所以它一动，计划里每一个回收数字的量级都跟着变。',
          backfire:
            '优化这一行正是暗黑模式的来源：预勾选目的、cookie 墙、需要点两次的拒绝按钮，都会同时把比率推高、把有效性压低 —— 比率变好，而上面那一行变坏，于是这张表赖以成立的顺序整个反转。更隐蔽的失败是分母选错：拿全部会话而不是合格会话来报，一批几个月前就同意过、如今又回访的访客会让数字一直健康，而新访客正在被挡在门外 —— 产生这个比率的构成正在悄悄劣化。',
        },
        {
          priority: 4,
          metric: '同意后转化率 —— （同意会话中的转化数）÷（同意会话数），与同意率取同一个变体、同一段窗口',
          fixFirst:
            '第四条修营收这一半，因为一个没有配转化率的同意率，是一个穿着营收外衣的合规数字。两者必须从同一个变体、同一段窗口里读出来，而接受路径与拒绝路径都得用它下游产生的东西来评判，而不是用它在那道墙上收回了什么来评判。如果某个变体把同意率抬上去而把转化压下去，这两个数是否相互抵消，只有数转化才能回答 —— 这正是指南要两个数的原因，也是这个度量必须扛过一次改动的理由。按每 1,000 个合格会话的转化数追踪营收效果，这样两个群体才能在同一个尺度上比较。',
          alsoMoves:
            '它带动营收模型里回收量的大小，因为关闭同意差距的建模收益，等于这个差距乘上它所适用流量的转化率，而转化率是在这里量出来的、不是拿全站平均假设的。它也带动其他各行的代价成本：一个在同意率上好看、在转化上难看的横幅改动会被撤回，而你在有效性与覆盖上做的活必须扛过这次撤回。它还决定了拒绝流程值不值得投工程量，或者那个量根本不够看。',
          backfire:
            '同意会话的转化可能低于未同意会话，而原因跟你的横幅毫无关系：同意的那一群人拿到的营销待遇更重，广告曝光更个性化、触达更多，而这种更重的待遇本身就能压低可测转化 —— 这时站点什么错都没犯。把这种下降读成横幅问题，会让你把横幅往回削，于是同意与营收一起丢。另一个陷阱是变体改变了谁同意：同意群体本身换了人，于是不比较构成就直接比两周转化，你会得出「横幅变差了」的结论，而变差的是受众。',
        },
        {
          priority: 5,
          metric: '拒绝者的一方再触达率 —— （在拒绝之后以某种交换留下了联系方式的会话）÷（拒绝会话数），同时按百分比与名单规模两项追踪',
          fixFirst:
            '第五条修拒绝流程，因为拒绝的访客是一大群可识别、且就此永久流失的受众 —— 在 opt-in 体制下通常占合格会话的三成到接近一半 —— 而拒绝的那一刻是你唯一确定他们正在看的时刻。把这场交换做得对他们有价值：能自选接收内容的偏好中心、能解决他们某个问题的引流资料、一份他们本来就想订阅的简报。联系方式只在这次交换里要，别的地方不要；并且把拒绝本身保持成一次同等权重的点击，这样加上抓取这一步才不会把第一行做的有效性工作抵消掉。',
          alsoMoves:
            '它带动可测量信号那一行，因为一个留下了一方联系方式的拒绝会话，仍然可以通过那些不依赖你「没拿到」的同意的渠道来度量，而它把一个流失会话变成了下一次活动还能触达的存量受众。它还减轻了「必须从横幅本身把那笔营收捞回来」的压力，而那种压力正是把人推向暗黑模式的原动力。而一份在增长的名单规模，是季度重新基线显示横幅工作已经见顶时，仍能保住拒绝流程这笔投入的理由。',
          backfire:
            '往拒绝路径里加一个输入框，是破坏你在第一行建好的对等性最快的办法：一个现在要填地址还要点提交的拒绝，明显比接受路径更难，于是同意率下降、拒绝流程名单却在涨 —— 这笔交易合规那侧不会批，增长那侧却想要。另一个失败出在名单本身：用交换换来的地址若从来不跟进，会变成一份开始退信的名单，最后抑制你自己的营销邮件，于是你救回来的受众反而成了邮件营收下滑的原因。',
        },
        {
          priority: 6,
          metric: '可测信号回收率 —— （同意过滤之后你仍能归因的转化数，含建模转化）÷（完全同意基线下的转化数），以百分比报出',
          fixFirst:
            '最后修测量回收，因为这一行才告诉你你以为丢掉的营收究竟是丢了，还是只是变得看不见了。同意的影响里很大一部分是归因损失而不是买家损失：客户照样买了，只是本该告诉你哪一场活动促成的那个信号被挡在了墙外。把分析与广告标签改为服务端下发，再叠上同意模式建模，可以在完全不碰横幅的前提下找回相当一部分信号。要在横幅有效、覆盖正确之后再做，因为把建模回收叠在一个无效的同意之上，只会把错的东西建模得更精确 —— 精确的错误比粗略的正确更糟。',
          alsoMoves:
            '它带动营收模型本身，因为一旦你知道那部分损失里有多少是测量而不是需求，你带进计划的「可回收」数字就变了，而这会改变哪些项目拿到预算。它也改变同意率本身值多少：如果非同意流量里有相当一部分其实会转化、只是没被度量到，那么再争取 5 个百分点的边际价值就低于原始差距所暗示的，优先级会转向拒绝流程与建模。而一个稳定的回收率，才让你能按回收后的视角而不是只按同意后的视角来定营销预算。',
          backfire:
            '建模转化是估算值，一旦它和真实观测值出现在同一张报表里，两者就再也分不出来。若把建模营收当营收报，损失看起来比实际小，修复被无限期推迟，而仪表盘上的数字与银行收到的钱之间的缺口，会在下一个季度继续隐形。另一个版本是砍掉那些转化只是没被度量的渠道：归因营收下降是因为信号掉了，不是因为客户不买了，于是你在还在赚钱的渠道上砍掉了获客。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A consent rate alone tells you nothing about whether the consent was worth anything, which is why the first line here is a paired measurement and the second is the legal floor underneath it. The baseline line reads eligible sessions rather than all sessions, because a stream of returning visitors who consented months ago will flatter any denominator you choose, and the target and conversion rates belong in that same line so recovered revenue can be computed rather than asserted. The CMP line then benchmarks your rate against the 55-70% band a premium platform delivers, and the banner line follows it, because below 50% the banner is the problem, and the experiment has to measure consent rate and post-consent conversion jointly over four weeks per variant, because a consent gain bought with a conversion drop is a loss. A test never counts if consent rises while conversion falls by 15% or more. Then geo-targeting, so each regime sees its own default rather than a global one, and the reject flow, where the preference centre, contextual advertising and server-side consent signalling recover part of the 30-45% who refuse. The last line is the platform decision, gated behind the cheap experiments on purpose, since buying a premium CMP before fixing banner parity buys the wrong thing more expensively.',
      items: [
        {
          step: 1,
          label: 'Consent impact baselined with the gap expressed in percentage points',
          gate: 'Monthly EU visitors, current consent rate, target consent rate and conversion rate all entered, the gap expressed in percentage points, and the recovered monthly and annual revenue written in USD against a named pre-change baseline window of at least 4 weeks.',
          blockIf:
            'A revenue figure without the percentage-point gap beside it cannot be argued about, because a 3 point gap on a large audience and a 20 point gap on a small one produce very different priorities and often the same headline number. Without a fixed baseline window you also cannot tell later whether revenue moved because of the banner or because the traffic mix changed, which is exactly the argument the first change will trigger.',
        },
        {
          step: 2,
          label: 'Consent rate pulled per regime and compared with the premium band',
          gate: 'The consent rate read from your consent platform dashboard, reported separately for the EU and EEA and for North America, compared against the 55-70 percent band, with a written banner diagnosis recorded whenever the rate is below 50 percent.',
          blockIf:
            'A blended rate across regions tells you nothing about which banner is failing, because the regimes have different defaults and different opt-in shares by design, and averaging them can hide an EU rate of 30 percent behind a healthy North American number. And without the written diagnosis you will skip to the tool decision and buy a platform to fix a layout problem that costs a day of work.',
        },
        {
          step: 3,
          label: 'Banner variants tested jointly on consent rate and conversion rate',
          gate: 'At least 2 variants plus a control, each running for at least 4 weeks, with consent rate and post-consent conversion measured together on the same variant and in the same window, and a written ship rule stating the consent-rate gain and the conversion-loss ceiling you will accept before rolling out.',
          blockIf:
            'Testing consent rate alone is the failure this step exists to prevent, because a variant that lifts consent and drops conversion looks like a win on the dashboard you happen to be watching and is a loss on the one that pays the bills. Without a ship rule written before the results arrive, the winning variant will be whichever one you liked on day 3, and the four-week window exists because banner effects do not settle faster than that.',
        },
        {
          step: 4,
          label: 'Geo rules live per regime, with a written default for each',
          gate: '3 defaults configured — opt-in with equal-weight reject for the EU and EEA, opt-out with a do-not-sell link for California, and a lightweight notice elsewhere — with coverage measured per regime as sessions served the correct default over sessions in that region, and app or non-geolocated sessions counted separately.',
          blockIf:
            'One global banner cannot be right for both an opt-in and an opt-out regime, and getting that wrong is a legal defect rather than a conversion defect. The gap the coverage measurement usually finds is app traffic and proxy traffic, which carry no location and fall into the lightest-notice bucket by default, so a coverage number counting only web sessions will look complete while the sessions carrying the highest consent value are being served the wrong default.',
        },
        {
          step: 5,
          label: 'Reject flow live, with one-click parity and an owned capture',
          gate: 'The reject path still a single click of equal visual weight to accept, a value exchange offered at the moment of rejection, capture measured as a percentage of rejecting sessions and as a list size with a 4 week follow-up cycle, and contextual advertising plus server-side tags with consent-mode modelling deployed for the non-consented traffic.',
          blockIf:
            'A capture step added to the reject path turns reject into the harder of the two buttons and undoes the parity work in the first step, so it has to be offered without adding a click to the reject itself. And capture without a follow-up is worse than no capture, because a list that is never contacted starts suppressing your own campaigns once the addresses begin bouncing.',
        },
        {
          step: 6,
          label: 'Consent platform upgrade modelled only after the banner is fixed',
          gate: 'A written payback model with your monthly platform fee, the opt-in points the upgrade is expected to add, and the number of months to payback, prepared only if the consent rate is still below 60 percent after the banner and copy work is done, with the decision recorded either way.',
          blockIf:
            'A platform upgrade is only worth it once the banner itself is sound, because a better platform rendering an invalid banner produces invalid consent with a smaller price tag. And the decision has to be recorded even when you do not buy, because the rate is re-measured every quarter and without the recorded reasoning the same upgrade gets re-proposed every quarter from a slightly different argument.',
        },
        {
          step: 7,
          label: 'Re-baseline scheduled quarterly and after every rollout or copy change',
          gate: 'A re-baseline every 1 quarter on the calendar with a named owner, plus a re-baseline after every consent platform rollout and every banner copy change, with the last re-baseline date and the next one both written down, and the vendor compliance patch version currently in place recorded.',
          blockIf:
            'Banner fatigue and regional rule changes both move the rate without anyone shipping anything, so a rate that was fine two quarters ago tells you nothing about today. The copy-change trigger matters just as much, because a rewrite that looks cosmetic in the repository is a new variant in the funnel, and it needs the same 4 weeks of data before anyone believes what it did.',
        },
      ],
    },
    zh: {
      intro:
        '同意率之外，得看转化率是否一起动，否则这个数说明不了任何事 —— 所以第一行是成对的量，第二行是它底下的法律底线。基线那一行读的是合格会话而不是全部会话，因为一批几个月前就同意过、如今又回访的访客会把你挑的任何分母都撑得很好看；目标同意率和转化率要放在同一行，回收的营收才算得出来而不是只能嘴上说。然后是 CMP 那行，把你的同意率对着优质平台 55-70% 的区间比；横幅那行排在它后面，因为低于 50% 时问题在横幅 —— 按钮对等、文案、首层用途粒度 —— 而这个实验要在每个变体上跑满四周、同意率与同意后转化一起量，因为用转化换来的同意是亏的。同意涨而转化跌 15% 以上的结果一律不算数。再往后是地域定向，让每个法域看到自己的默认态，而不是一个全球默认态；然后是拒绝流程，偏好中心、上下文广告和服务端同意信号去捞回那 30-45% 拒绝掉的人。最后一行是平台选型，它被刻意压在那些便宜实验后面 —— 在把按钮对等问题修好之前买优质 CMP，只是把买错东西这件事做得更贵。',
      items: [
        {
          step: 1,
          label: '同意影响已建立基线，差距表达为百分点并挂上期间',
          gate: '月度欧盟访客数、当前同意率、目标同意率与转化率全部录入，差距表达为百分点；挽回的月度与年度营收用 USD 写下来，并挂在一个写明期间、至少 4 周的改动前基线窗口上。',
          blockIf:
            '只有营收数字而旁边没有百分点差距，这笔账没法讨论：大流量上的 3 个百分点差距与小流量上的 20 个百分点差距，优先级完全不同，却常常得到同一个标题数字。而没有固定的基线窗口，之后你也分不清营收变动到底是横幅造成的还是流量构成变了 —— 而这正是第一次改动之后必然出现的那场争论。',
        },
        {
          step: 2,
          label: '同意率按法域分别拉取，并与优质平台区间对比',
          gate: '从同意平台仪表盘读出同意率，欧盟与欧洲经济区、北美分别报出，与 55-70% 区间对比；同意率低于 50% 时，写下一份横幅诊断结论。',
          blockIf:
            '跨地区混在一起的比率告诉不了你哪个横幅坏了，因为各法域的默认值与同意份额本来就不同，混在一起会把欧盟 30% 的同意率藏在一个健康的北美数字后面。而没有那份书面诊断，你会直接跳到买工具的决定上，用一个平台去解决一个本来一天就能改完的版式问题。',
        },
        {
          step: 3,
          label: '横幅变体同时测同意率与同意后转化率，并写放行规则',
          gate: '至少 2 个变体加一个对照，每个跑至少 4 周；同意率与同意后转化率在同一个变体、同一段窗口里一起测；并写下放行规则，指明你接受多大的同意率提升与多大的转化损失上限才上线。',
          blockIf:
            '只测同意率，正是这一步要防的失败：一个把同意率抬高、把转化压低的变体，在你恰好在看的仪表盘上是赢的，在付账的那张表上是亏的。而不在结果出来之前写下放行规则，胜出的变体就会是第 3 天你最喜欢的那个；四周这个长度存在，是因为横幅的效果不会比它更快稳定下来。',
        },
        {
          step: 4,
          label: '按法域的地理规则已生效，每个法域都有写下来的默认值',
          gate: '3 个默认值已配置 —— 欧盟与欧洲经济区是带同等权重拒绝按钮的 opt-in，加州是带 Do Not Sell 链接的 opt-out，其余地区是轻量提示；覆盖率按法域量测，即被给出正确默认值的会话除以该地区会话数；App 与无位置信息的会话单独计数。',
          blockIf:
            '一个全球横幅不可能同时适用于 opt-in 与 opt-out 两套体制，而搞错这一点是法律缺陷而不是转化缺陷。覆盖率的测量通常翻出的缺口在 App 流量与代理流量上 —— 它们没有位置信息，默认落进最轻提示那一桶，于是只数网页会话的覆盖率数字看起来是满的，而带着最高同意价值的那批会话正在被给出错误的默认值。',
        },
        {
          step: 5,
          label: '拒绝流程已上线，保持一次点击的对等与有人负责的抓取',
          gate: '拒绝路径仍是一次点击、且与接受视觉权重相等；在拒绝当场提供价值交换；抓取率按拒绝会话的百分比与名单规模两项追踪，且每 4 周跟进一次；非同意流量已部署上下文广告与服务端标签加同意模式建模。',
          blockIf:
            '往拒绝路径里加一个抓取步骤，就把拒绝变成了两个按钮里更难的那个，抵消掉第一步的对等工作，所以这个交换必须在不增加拒绝点击次数的前提下提供。而抓取之后不跟进，比不抓取更糟 —— 一份从来不联系的名单，会在地址开始退信之后开始抑制你自己的营销活动。',
        },
        {
          step: 6,
          label: '同意平台升级只在横幅修好之后建模回本周期',
          gate: '一份写下来的回本模型，含你的月度平台费用、这次升级预计带来的同意率提升点数、以及回本所需的月数；只在横幅与文案工作做完之后同意率仍低于 60% 的情况下才做，并把两种情况下的决定都记录在案。',
          blockIf:
            '只有横幅本身站得住，平台升级才值得 —— 一个更好的平台渲染出一个无效的横幅，产出的是带更小价签的无效同意。而决定必须两种情况都记录：不买的时候也要写，因为同意率每个季度都会重新量一次，没有记下的理由，同一笔升级每个季度都会换一个说法再被提出来。',
        },
        {
          step: 7,
          label: '季度以及每次平台上线或改文案后都要重新基线',
          gate: '日历上每 1 个季度重新基线一次并点名负责人；另有每次同意平台上线与每次横幅文案变更都触发一次重新基线；上一次与下一次的重新基线日期都写下来；供应商当前生效的合规补丁版本也记录在案。',
          blockIf:
            '横幅疲劳与区域规则变化都会在不发布任何东西的情况下把同意率挪走，所以两个季度前还不错的比率今天什么也说明不了。文案变更这个触发条件同样要紧，因为一次在代码仓库里看起来只是改改字的重写，在漏斗里就是一个新变体，它也需要同样 4 周的数据才有人肯相信它做了什么。',
        },
      ],
    },
  },
};
