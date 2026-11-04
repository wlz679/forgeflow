// P166 —— C 类（Valuation & Exit）主题「equity-dilution-optimization」的新形态内容。
//
// 与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 选哪一行 → 单一动作（按融资阶段查区间 → 改一个条款）
//   · 既有 howToApply（指南页）= Step 1…Step 9 编号链（按顺序建模）
//   · 本文件 fixPriority = 四个指标同时不达标时，先修哪个 → 它顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」（howToApply 只说做什么，不说什么算达标）
//
// 口径纪律（本主题讲的是用户自己的经营阈值，不是随定价 bot 漂移的市场价 ⇒ 允许写金额）：
//   金额一律以 USD 计价并写明口径（pre-money / post-money / 每轮稀释 / 累计持股 / 退出倍数），
//   形如 "USD 5,000,000 pre-money"、"USD 300-1,500 per customer" —— 不写成裸 "$5M"，
//   避免读者把它当成一个可以直接引用的行业标准值。
//   百分比一律注明分母：占投后股本 / 占 fully-diluted 股本 / 占轮前持股。
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Dilution is a cap-table problem before a negotiation one, and the option pool hides inside it. Per-round founder dilution against a 25% guardrail comes first, then the pool refresh on the fully diluted base, then investor ownership as check size over post-money. Cumulative founder ownership decides board control.',
      rows: [
        {
          priority: 1,
          metric: 'Per-round founder dilution — this round dilution against the 25% guardrail, fully diluted',
          fixFirst:
            'Break this round dilution into its two sources before you argue about either one. Recompute on a fully-diluted basis: founder shares + new investor shares + option pool shares + every outstanding SAFE converted at this round price, then dilution = 100% minus founder ownership after the pool. Most rounds that look like 15% dilution are actually 25%, because the pool refresh is deducted from the pre-money and never shows up in the headline statement of "I raised X at Y". Write both numbers on one sheet — headline dilution and fully-diluted dilution — then work the larger one first, since the gap between them is almost always the pool, and the pool is the line still open to negotiation after the valuation is agreed. Verify by rebuilding the cap table and confirming the two numbers now differ by no more than the pool points you intend to grant.',
          alsoMoves:
            'Splitting the two sources repairs the two metrics that are usually argued about separately. Investor ownership (check divided by post-money) is unaffected by the pool, so once the pool is separated out you can see that a round dilutes you mostly through the pool and not through the check size, which is exactly the negotiable part. It also stabilises cumulative founder ownership, because pool shares dilute again at every future round when the pool is refreshed, so the pool is charged twice over your lifetime while investor shares are charged once. And a decomposition you can write down is a decomposition you can re-run at the next term sheet, which is where the compounding damage actually happens.',
          backfire:
            'The decomposition backfires when you use it to argue for a smaller pool at the cost of the same headline dilution. A 10% pool granted at this round gets refreshed to 15-20% at the next round to cover new hires, so the saving shows up only in the current model while the next model is worse: you take 5 points back now and give away more later. The other failure is skipping the fully-diluted basis. If your SAFEs and warrants are left out of the denominator, the dilution you report to your co-founders is 6-8 points lower than what the cap table will say at the next priced round, and the gap surfaces exactly when you can least afford a re-cut.',
        },
        {
          priority: 2,
          metric: 'Option pool refresh size — pool share of post-money, and which grants the shares belong to',
          fixFirst:
            'Take the pool off the table before you argue about valuation, because it is the one line that needs no permission from the investor to move: the size, the refresh mechanic and the split between existing employees and new hires are all negotiable, while the pre-money is not once it is written down. Push for a refresh expressed as a percentage of post-money rather than of the pre-money company, size the pool to the hiring plan you can actually fund over the next 18 months, and propose splitting it into a tranche for existing employees (refreshed, not topped up) and a tranche for new hires, so the next round refreshes only the second one. Verify by recomputing founder ownership after pool with the new number and confirming the delta equals the pool points you expect to save.',
          alsoMoves:
            'A smaller, better-shaped pool moves two metrics that look independent. Per-round dilution falls immediately, because pool shares come out of the founder denominator. Cumulative founder ownership improves more than per-round dilution does, because an oversized pool keeps diluting every future round when it is topped up. It also changes the fully-diluted cap table that investors and acquirers read: a pool sized to a real hiring plan reads as credible, while a pool at 20% on a company hiring four people reads as a round priced for a different company, which is the objection that shows up in diligence. A smaller pool also lowers the per-share price every future option grant has to start from.',
          backfire:
            'Pressing for a small pool backfires when a lead investor wants headroom and the refusal is not a smaller pool but a bigger one plus a worse pre-money: ask for 10% and get 20% with the dilution loaded into the valuation, and the round closes at the same headline dilution with a pool you did not choose and cannot redirect for two years. The subtler version is cutting the pool below what the team can grant from. Engineers who cannot be granted equity to stay will ask for cash, and cash compensation lands in COGS and hosting, showing up in your unit economics a year later, which is a more expensive way to pay the same people than a pool sized conservatively.',
        },
        {
          priority: 3,
          metric: 'Investor ownership share — the check size relative to post-money (check ÷ post-money)',
          fixFirst:
            'Once the pool is separated out, the check size against post-money is the next lever, and it is the one you control by how you structure the round rather than by what you negotiate. Model three shapes on the same cap table: raise the full amount now, raise half now and half on a milestone, or convert a SAFE now and price it at the next round. The milestone version trades dilution today for a trigger you have to hit, so it only works if the milestone is inside your control and inside the round timetable — a market-dependent trigger just moves the risk without moving the dilution. Verify by re-running the five scenarios in the calculator with the same pool size and the same pre-money, and confirm that the fully-diluted dilution improves in the shape you intend, not only in the headline.',
          alsoMoves:
            'This metric is the denominator of everything above it: investor ownership decides how much of the post-money each later round has to sell, so a 5-point difference here compounds into the cumulative founder ownership row and into the exit-proceeds row. It also moves the option pool indirectly, because a smaller check at the same valuation means a pool expressed as a percentage of pre-money covers a larger share of the company than the investor own stake — what you are actually negotiating is the pool-to-investor ratio. And it changes the cash runway per round, which decides whether the next round is one you choose or one you are forced into, and a forced round is the one that really destroys founder ownership.',
          backfire:
            'The check-size lever backfires in the classic case: you optimise the percentage and starve the company. Raising half now to keep dilution low is fine if the runway still covers the next milestone with 3 months of buffer, but if the half-round buys 8 months instead of 14 the company misses the milestone, and the next round happens at a lower valuation with a forced discount — total dilution across the two rounds can exceed the dilution you avoided. The second trap is comparing rounds at different prices: 15% dilution at a USD 10,000,000 post-money is not cheaper than 18% at a USD 4,000,000 post-money in cash terms, so the percentage only ranks rounds inside one company history, not across two unrelated market conditions.',
        },
        {
          priority: 4,
          metric: 'Cumulative founder ownership — founders share after the round against the stage band (Series A 40-60%)',
          fixFirst:
            'Check cumulative ownership after every round, not only the round you are closing, because the guardrail that protects you is a stock, not a flow. Founders holding 70% before a round and 45% after it have crossed two ownership bands in one event: board control at the company level, and the 40-60% band that keeps a Series A from creating founder-versus-investor deadlock. Rebuild the whole cap table — every round to date, every SAFE, every pool refresh — and compare the end state against the band for your stage rather than against the per-round number you negotiated. Verify by modelling the two next rounds you can actually see coming, not only this one, because the cumulative figure that matters is the one after round two.',
          alsoMoves:
            'This row is where the three above it land. It converts per-round dilution, pool size and check size into a single number that decides who controls the board and who can approve an exit, and it is also the denominator for the exit-proceeds calculation: a founder holding a smaller share of a larger company is not automatically worse off, and a founder holding a larger share of a smaller company is not automatically better off. Cumulative ownership also sets the price of a down round or an acqui-hire, because the founders voting block is the negotiating asset in both. And because it is the slowest-moving row on the table, it is the one that tells you whether you are on track: three rounds each inside the per-round guardrail can still leave you below the band.',
          backfire:
            'Optimising for the band backfires when it becomes a reason to refuse the round you need. If the band is the constraint you optimise, the rational response is to raise a smaller round or skip the round, and both can be worse than accepting a larger dilution that keeps the company funded through the next 18 months. The second failure is measuring cumulative ownership on the wrong basis: a founder who sold 30% of their shares to a co-founder or exercised options early has a smaller ownership number without either of you having been diluted by this round, so the metric then moves for reasons the priority table cannot fix. And the band itself drifts with market practice, so a band taken from a table two years ago stops being a guardrail and becomes a superstition.',
        },
        {
          priority: 5,
          metric: 'Break-even dilution at exit — the most dilution you can accept while the investor still clears 10x',
          fixFirst:
            'Finish by computing the break-even dilution at exit, because it converts every percentage point you negotiated into money and tells you which of them was worth fighting for. Project exit proceeds across the five valuation multiples from 0.5x to 10x pre-money, ask what founder proceeds look like at each, and solve for the dilution level at which the investor still returns 10x on their check. The result is normally far more forgiving than founders expect at the high end and far less forgiving at the low end, which means the negotiation priority usually sits in the downside case rather than in the headline. Verify by checking that the break-even number sits above the dilution your current term sheet implies, and re-run it whenever the round size changes.',
          alsoMoves:
            'This row re-ranks the rows above it. Exit proceeds are founder ownership multiplied by exit value, so the same dilution is cheap in a 10x outcome and expensive in a 0.5x outcome, and the break-even calculation tells you how much negotiating energy belongs on the downside. It also connects the round to the operating plan, because a bigger raise that extends runway raises the probability of reaching the higher multiples, while a smaller raise that keeps dilution low can push the exit into the band where break-even dilution is tight. And it gives the per-round guardrail a reason: the 25% dilution target is not a rule, it is the number that keeps you inside your own break-even at the multiple you believe is reachable.',
          backfire:
            'The break-even view backfires when it is used to justify accepting dilution the downside case cannot survive. Break-even at 10x says you could afford 40% dilution and still clear the investor multiple, but it says nothing about the case where the company exits at 1x — that is where a founder who accepted 40% has nothing left, and it is also the case that decides whether the next round happens at all. The other trap is anchoring on the multiple you expect rather than the one you can defend: modelling 10x on a USD 5,000,000 pre-money and treating the result as a plan means the model agrees with you by construction. Use the multiple you would sign an exit memo at, and keep the 0.5x case in the sheet even when it looks unflattering.',
        },
      ],
    },
    zh: {
      intro:
        '稀释先是 cap table 的问题，才是谈判的问题，而期权池刷新通常就藏在这条里。先算本轮创始人稀释率与 25% 护栏的差距，再把期权池按 fully diluted 口径叠上去，然后才是投资人持股比例（融资额 ÷ 投后估值）。真正决定董事会控制权的是本轮之后的累计持股——A 轮后 40-60% 是分水岭，低于这条线，条款再好也换不来董事席。退出时的盈亏平衡稀释率，才是你还能接受的真实上限。每次条款书改一个数，都要在这张表上重跑一遍。',
      rows: [
        {
          priority: 1,
          metric: '本轮创始人稀释率 —— 本轮稀释 vs 25% 护栏（fully-diluted 口径）',
          fixFirst:
            '先把这轮稀释拆成两个来源，再去谈其中任何一个。按 fully-diluted 口径重算：创始人股数 + 新增投资人股数 + 期权池股数 + 所有按本轮价格转换的未转 SAFE，然后稀释 = 100% − 加池后的创始人持股。看起来是 15% 稀释的轮次，大多数其实是 25%，因为期权池刷新是在 pre-money 上扣的，从不进入「我在 Y 估值融了 X」这句话里。把两个数写在同一张纸上——headline 稀释和 fully-diluted 稀释——然后先修大的那个，因为两者的差额几乎总是期权池，而期权池恰恰是估值谈定之后你还能动的那一条。验证方式：重建 cap table，确认两个数的差额不超过你打算授出的那点池子。',
          alsoMoves:
            '拆开两个来源，顺手修好了平时分开争论的两个指标。投资人持股（融资额 ÷ 投后）完全不受期权池影响，所以一旦把池子单拎出来，你就能看出这轮稀释你主要来自池子而不是融资额——而这正是可谈的部分。它还稳住了累计创始人持股：期权池股数会在之后每一轮刷新时被再稀释一次，等于在你的人生里被收两遍税，投资人股数只被收一遍。而且能写下来的拆解，才能在下一份条款书到来时重跑一遍，而复利式的伤害正是在那里发生的。',
          backfire:
            '这个拆解的反噬方式，是被你拿来支持「池子小一点、headline 稀释不变」。这一轮授 10% 的池子，到下一轮为了覆盖新入职会被刷新到 15-20%，于是节省只出现在当前模型里，下一个模型更难看：现在收回来 5 个点，之后赔进去更多。另一个失败是跳过 fully-diluted 口径：如果 SAFE 和认股权证没进分母，你告诉联合创始人的稀释比下一轮定价时 cap table 会说的低 6-8 个点，而这个缺口恰恰在你最经不起重谈的那一刻暴露出来。',
        },
        {
          priority: 2,
          metric: '期权池刷新规模 —— 池子占投后的比例，以及这些股份属于哪些授予',
          fixFirst:
            '先拿掉期权池，再去谈估值，因为这是唯一一条不需要投资人点头就能动的线：规模、刷新机制、存量员工与新员工的拆分，全都可谈，而 pre-money 一旦写下来就动不了了。争取把刷新写成占投后的百分比而不是占 pre-money 公司的百分比，按你未来 18 个月真正付得起的招聘计划来定池子，并提议拆成「存量员工（刷新，不补足）」和「新员工（下一轮只刷新这一段）」两段。验证方式：按新的池子比例重算加池后创始人持股，确认差额正好等于你预期省下的池子百分点。',
          alsoMoves:
            '一个更小、形状更好的池子会同时动两个看起来无关的指标。本轮稀释立刻下降，因为池子是从创始人分母里扣的。累计创始人持股的改善幅度比本轮稀释更大，因为过大的池子会在之后每一轮刷新时被再次稀释。它还改变了投资人和收购方会读的那份 fully-diluted cap table：按真实招聘计划定的池子读起来是可信的，而一家一年招四个人的公司挂着 20% 的池子，读起来就是「这轮是照着另一家公司定价的」，而这正是尽调时会冒出来的那个问题。池子小也让未来每一次期权授予的起始股价更低。',
          backfire:
            '死磕小池子的反噬，是在领投方要留空间、而拒绝的形式不是更小的池子而是更大的池子加更差的 pre-money 时发生：你提 10%、拿到 20% 并且稀释被塞进估值里，于是这轮以同样的 headline 稀释成交，但你多了一个自己没选、两年内改不动的池子。更隐蔽的版本是把池子砍到低于团队实际能授出的水平：拿不到期权的工程师会要求现金，而现金薪酬落在 COGS 和托管里，一年后出现在你的单位经济学里——用现金付同一批人，其实比保守地定一个池子更贵。',
        },
        {
          priority: 3,
          metric: '投资人持股比例 —— 本轮融资额相对投后估值的占比（融资额 ÷ 投后）',
          fixFirst:
            '把池子拆出来之后，下一个杠杆是融资额相对投后的占比，而这一条是你用轮次结构控制、不是用谈判控制不了的。同一份 cap table 上跑三种形状：一次融足、先融一半、里程碑后再融一半，或者先 SAFE 转换、下一轮再定价。里程碑版是用今天的稀释换未来一个触发条件，所以只有当触发条件既在你手里、又在这一轮的时间表里才成立——挂在市场行情上的触发条件只是挪了风险，没挪稀释。验证方式：用同样的池子规模和同样的 pre-money 把计算器里的 5 个场景重跑一遍，确认 fully-diluted 稀释确实在你想要的那个形状上改善，而不只是 headline 变好。',
          alsoMoves:
            '这个指标是上面所有指标的分母：投资人持股决定了之后每一轮要卖掉投后的多少，所以这里差 5 个点，会复利进累计创始人持股那一行，也会复利进退出收益那一行。它还会间接推动期权池——同样的估值下融资额更小，那么按 pre-money 百分比表达的池子占公司的份额就大于投资人的持股，你真正谈判的其实是「池子与投资人持股的比例」而不是池子本身。它也决定了每轮能换到的现金跑道长度，而跑道决定下一轮是你选择去融还是你被迫去融，被迫的那一轮才是真正吃掉创始人持股的那一轮。',
          backfire:
            '融资额这个杠杆的经典反噬是：你优化了百分比，却把公司饿死了。融一半来少稀释，前提是跑道仍能覆盖下一个里程碑并留 3 个月缓冲；如果半轮只买到 8 个月而不是 14 个月，公司就错过里程碑，下一轮在更低的估值上带着被迫折价发生——两轮累计的稀释可能超过你省下的那部分。第二个坑是拿不同价格的两轮做比较：在 10,000,000 美元投后上稀释 15%，并不比在 4,000,000 美元投后上稀释 18% 更便宜，换成现金算就清楚了，所以这个百分比只在同一家公司的历史里排序，不能横跨两种完全不同的市场环境。',
        },
        {
          priority: 4,
          metric: '累计创始人持股 —— 本轮之后的创始人份额 vs 阶段区间（A 轮后 40-60%）',
          fixFirst:
            '每一轮之后都查累计持股，而不只查你要签的这一轮，因为真正保护你的护栏是存量而不是流量。创始人轮前 70%、轮后 45%，一次事件里跨了两个区间：公司层面的董事会控制权，以及 A 轮后 40-60% 这条用来避免创始人与投资人互相卡死。把整份 cap table 重建一遍——历次轮次、每一个 SAFE、每一次池子刷新——然后用轮后的状态去比阶段区间，而不是比你这轮谈下来的那个百分比。验证方式：把未来你真正看得见的两轮也建出来，不要只建这一轮，因为真正要看的累计数字是第二轮之后的那个。',
          alsoMoves:
            '这一行是上面三行的落点。它把本轮稀释、池子规模和融资额换算成一个数字，这个数字决定董事会谁说了算、谁批退出，它同时也是退出收益计算的分母：创始人持更少比例但公司更大，未必更差；持更多比例但公司更小，也未必更好。累计持股还定下了 down round 和 acqui-hire 的价格，因为创始人投票块在这两种交易里都是谈判筹码。而且因为它是这张表上变动最慢的一行，它才是判断你有没有跑偏的那一行：三轮每轮都在单轮护栏之内，累计持股仍然可能掉到区间以下。',
          backfire:
            '把区间当成优化目标，会反噬成「因为你不想破区间，所以拒绝了真正需要的那一轮」。如果区间是你优化的约束，那理性反应就是融更小的一轮或者干脆不融，而这两者都可能比接受一次更大、但能让公司撑过未来 18 个月的稀释更糟。第二个失败是分母选错：把股份卖过给联合创始人、或提前行权过的创始人，累计持股数字天然更小，但他俩这轮都没被稀释，于是这个指标会为了优先级表修不了的原因而移动。而区间本身也会漂——投资人预期和授予惯例跟着市场走，两年前抄来的区间不再像护栏，更像迷信。',
        },
        {
          priority: 5,
          metric: '退出时的盈亏平衡稀释 —— 投资人仍能拿到 10x 回报时你能接受的最大稀释',
          fixFirst:
            '最后算退出时的盈亏平衡稀释，因为它把你谈下来的每一个百分点换算成钱，并告诉你哪几个值得争。跨 5 个估值倍数（0.5x / 1x / 2x / 5x / 10x pre-money）投影退出收益，看每个倍数下创始人能拿多少，再解出「投资人仍能拿 10x」对应的稀释上限。结果通常在高倍数端比创始人预期的宽松得多、在低倍数端紧得多，也就是说谈判重心一般在下行情形，而不在那个 headline 数字上。验证方式：确认这个盈亏平衡值高于当前条款书隐含的稀释；融资额一变就重算。',
          alsoMoves:
            '这一行会给上面几行重新排序。退出收益 = 创始人持股 × 退出价值，所以同一份稀释在 10x 的情形下很便宜、在 0.5x 的情形下很贵，盈亏平衡计算告诉你谈判精力该压在哪一侧。它还把这轮和经营计划连起来：融得多、跑道长，抵达高倍数的概率就高；融得少、稀释低，也可能把退出推进到盈亏平衡稀释变紧的那个区间。它同时给了单轮护栏一个理由——25% 这个目标不是规矩，而是让你在「你相信能达到的那个倍数」下仍然待在自己盈亏平衡线以内的那个数。',
          backfire:
            '盈亏平衡视角的反噬，是被用来给「下行情形撑不住的那种稀释」找理由。按 10x 算出的盈亏平衡说你可以接受 40% 稀释还让投资人全身而退，但它对「公司以 1x 卖掉」的情形一个字都没说——而那正是接受了 40% 的创始人一无所有的情形，也是决定下一轮还发不发生的情形。第二个坑是把锚点定在你期待的倍数，而不是你敢签字的倍数：在 5,000,000 美元 pre-money 上按 10x 建模、再把结果当计划，等于让模型按构造同意你。请用你敢写进 exit memo 的那个倍数，并把 0.5x 那一行留在表里，哪怕它不好看。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Nine cap-table passes stand between a first draft and a defensible term sheet, and each changes the denominator. Pre-money and check size define the round; post-money is what investors buy; ownership and dilution follow. The pool refresh changes the base again, so alternative round shapes must share one table.',
      items: [
        {
          step: 1,
          label: 'Define the round — pre-money, check size, cap table, pool size',
          gate:
            'Pre-money valuation, the USD check amount, the pre-round fully-diluted share count and the proposed pool percentage are all written as figures on one page, with no blanks and no "TBC" — a round counts as defined only when all 4 numbers exist.',
          blockIf:
            'Without those four figures every later step is arithmetic on guesses. The pool in particular has to be stated as a percentage now, because it is deducted from the pre-money, so leaving it as a later conversation changes the founder ownership computed in steps 3 and 4 and quietly invalidates every scenario modelled in step 5. It also means you cannot tell a 15% round from a 25% round, and that difference is the difference between keeping board control and needing a second negotiation.',
        },
        {
          step: 2,
          label: 'Compute post-money — the valuation the investors actually buy into',
          gate:
            'Post-money equals pre-money plus the check, and the check appears as a USD figure on the same line as the pre-money; the arithmetic closes exactly, with no rounding gap larger than 1 percentage point of the resulting ownership.',
          blockIf:
            'If post-money is not the pre-money plus the check, the ownership percentage in the next step is computed against a number the investors did not agree to, and the mismatch shows up as an unexplained difference between your model and the term sheet. It also hides the most common error in a round, which is whether the quoted valuation is pre-money or post-money: two rounds with identical headline numbers can differ by 4 percentage points of investor ownership, and only this line tells you which one you are looking at.',
        },
        {
          step: 3,
          label: 'Derive investor ownership and per-round founder dilution',
          gate:
            'Investor ownership equals check divided by post-money, founder post-round ownership is founder shares over founder plus investor shares, and the dilution between them is under 25% for this round; all three reconcile with the cap table to within 1 percentage point.',
          blockIf:
            'If the three numbers do not reconcile with the cap table, the dilution you are negotiating is not the dilution that will be recorded at closing, and every scenario in step 5 inherits the error. Dilution above the 25% guardrail at this point should send you back to step 1 rather than forward, because the only ways to bring it down are a smaller pool or a smaller check, and both are decisions that belong before the model is built rather than after it looks bad.',
        },
        {
          step: 4,
          label: 'Layer the option pool refresh onto the fully-diluted cap table',
          gate:
            'Pool shares are computed on the pre-money basis as existing shares times pool percentage over one minus pool percentage, founder ownership after the pool is recomputed on the enlarged denominator, and the pool percentage is at or below what you will actually grant over the next 18 months.',
          blockIf:
            'Skipping this step is the single most common way a round that looks like 15% dilution turns into 25%: the pool comes out of the pre-money, so it never appears in the headline statement and it is charged again at the next round. If the pool percentage exceeds what your hiring plan can use, the excess is not a rounding error but a permanent claim on the company that nobody is working for, and it is also the part of the dilution you could have negotiated down.',
        },
        {
          step: 5,
          label: 'Model the five alternative round shapes on the same cap table',
          gate:
            'All 5 scenarios from the guide — half-round, SAFE-then-priced, two smaller rounds, a higher pre-money and a smaller pool — are run on the same pre-money and the same pool assumption, and each reports fully-diluted founder dilution, not just the headline figure.',
          blockIf:
            'If the scenarios are run with different pool sizes or different valuations the comparison is meaningless, and the winning option on paper is an artefact of the assumptions you varied. This is also where teams discover that their best option is not any of the five but a combination — a smaller pool plus a milestone-based second raise — which only becomes visible when all five sit on one sheet with one set of inputs.',
        },
        {
          step: 6,
          label: 'Set and record the per-round dilution guardrail',
          gate:
            'A written per-round dilution target of under 25% exists, with the board-control consequence stated (the founders keep more than 75% of pre-round ownership), and the modelled figure for this round sits inside that target.',
          blockIf:
            'Without a written target the guardrail becomes whatever the last conversation implied, and each round inherits the previous ambiguity. It also removes the ability to negotiate: a founder who can say this structure is 28% against a 25% guardrail is negotiating, while one who only knows the headline number is accepting. If the modelled dilution exceeds the target, this is the point to go back to step 4 rather than forward to exit modelling.',
        },
        {
          step: 7,
          label: 'Project exit proceeds and solve for break-even dilution',
          gate:
            'Exit proceeds are computed at 5 valuation multiples (0.5x, 1x, 2x, 5x and 10x pre-money), and break-even dilution — the most you can dilute while the investor still clears a 10x return — is stated as one number that sits above the dilution in this term sheet.',
          blockIf:
            'Without the break-even number you cannot tell whether the dilution you are about to sign is comfortable at the multiple you believe is reachable or fatal at the multiple you are afraid of, and the two answers are wildly different. It also gives the exit conversation a shape: the 0.5x case is where the leverage sits, because that is where a round that looks generous on dilution quietly takes the founders proceeds to nearly nothing.',
        },
        {
          step: 8,
          label: 'Negotiate the pool structure — post-money sizing, split buckets, refresh terms',
          gate:
            'The pool has a written structure: post-money sizing or an existing-versus-new-employee split, with a refresh mechanism that tops up new hires only, and founder ownership after pool recomputed on that structure matches the model to within 1 percentage point.',
          blockIf:
            'If the pool is left as an undifferentiated percentage of the company, the next round will refresh it against a larger headcount plan and the founders will pay for hires they have not made yet. Locking the structure now costs nothing and is far easier than arguing for it after the round closes, when the pool is already an obligation in the charter and the founders have no leverage left.',
        },
        {
          step: 9,
          label: 'Re-model the cap table after every term-sheet revision',
          gate:
            'Every revision to the term sheet triggers a re-run within 1 business day, the versioned model shows the founder dilution delta in percentage points against the previous version, and no revision has moved the round by more than 2 points of dilution without an explicit decision to accept it.',
          blockIf:
            'Small revisions do not stay small across rounds: a modest pre-money swing on a mid-size round is several points of dilution, and each round re-applies the percentage to a smaller remaining founder share, so the effect is multiplicative rather than additive. Without a re-run after every revision, the first person to see the cumulative damage is the one doing the next raise, usually at a worse valuation and with less information.',
        },
      ],
    },
    zh: {
      intro:
        '从第一版到能扛复核的条款书，中间隔着九遍 cap table 运算，每一遍都会换掉上一遍的分母。pre-money 与融资额定义这一轮，投后估值是投资人真正买进去的数字，投资人持股与创始人稀释由此推出来；期权池刷新又把基数改一次。所以几种轮次形状必须在同一份不被改动的 cap table 上跑，才看得出哪个条款真的省下 5 个百分点。每一步都要写清用的是哪种口径——投前还是投后、有没有含期权池，条款书的歧义通常就藏在这种地方；每次条款书修订后重跑并记录稀释差值。',
      items: [
        {
          step: 1,
          label: '定义本轮 —— pre-money、融资额、cap table、池子规模',
          gate:
            'pre-money 估值、本轮美元融资额、轮前 fully-diluted 股数、拟定的期权池百分比，4 个数字都以明确数值写在一页纸上，没有空白、没有「待定」——4 个数都存在，这轮才算定义完成。',
          blockIf:
            '缺了这四个数，后面每一步都只是在猜测上做算术。尤其期权池必须现在就写成百分比，因为它是从 pre-money 里扣的，拖到后面再谈会直接改掉步骤 3 和步骤 4 算出来的创始人持股，也会悄悄作废步骤 5 里所有场景。它还意味着你分不清一轮是 15% 还是 25%，而这两者之差就是保不保得住董事会控制权、要不要再谈一次的差别。',
        },
        {
          step: 2,
          label: '算出投后估值 —— 投资人真正买进去的那个数字',
          gate:
            '投后 = pre-money + 融资额，且融资额以美元数值与 pre-money 写在同一行；算术精确闭合，误差不超过所得持股比例的 1 个百分点。',
          blockIf:
            '如果投后不是 pre-money 加融资额，步骤 3 的持股比例就是拿一个投资人没同意过的数字去除，误差会以「模型和条款书对不上」的形式出现。它还掩盖了轮次里最常见的错误：报出来的估值到底是 pre-money 还是 post-money。两轮 headline 数字完全相同，投资人持股可以差 4 个百分点，而只有这一行能告诉你手里那张是哪种。',
        },
        {
          step: 3,
          label: '推出投资人持股比例与本轮创始人稀释率，并核对 fully-diluted 口径',
          gate:
            '投资人持股 = 融资额 ÷ 投后，创始人投后持股 = 创始人股数 ÷（创始人股数 + 新增投资人股数），两者之差即本轮稀释且低于 25%；三个数与 cap table 的偏差不超过 1 个百分点。',
          blockIf:
            '三个数与 cap table 对不上，你正在谈的稀释就不是交割时会记在纸上的稀释，步骤 5 里每个场景都会继承这个误差。此时稀释超过 25% 护栏，应该退回步骤 1 而不是继续往下走——把它拉回护栏内的办法只有两个：池子更小或融资额更小，而这两件事都必须发生在建模之前，而不是在模型难看之后才回头谈。',
        },
        {
          step: 4,
          label: '把期权池刷新叠到 fully-diluted cap table 上',
          gate:
            '池子股数按 pre-money 口径算（现有股数 × 池子% ÷（1 − 池子%）），加池后的创始人持股在扩大后的分母上重算，且池子百分比不高于未来 18 个月真正授得出的数量。',
          blockIf:
            '跳过这一步，就是「看起来 15% 稀释的轮次变成 25% 稀释」最常见的路径：池子从 pre-money 里扣，从不出现在 headline 话术里，而且下一轮还要再被收一次。如果池子百分比超过你的招聘计划能消化的量，多出来的那部分不是四舍五入误差，而是一项没有人为之工作的永久股权主张，同时它也正是你本来能谈下来的那部分稀释。',
        },
        {
          step: 5,
          label: '在同一份 cap table 上跑 5 种轮次形状',
          gate:
            '指南里的 5 个场景——半轮、SAFE 转定价、两次小额、更高 pre-money、更小期权池——都在同一个 pre-money、同一套池子假设下跑完，且每个场景都报 fully-diluted 创始人稀释，而不只是 headline 数字。',
          blockIf:
            '如果每个场景用了不同的池子规模或不同的估值，比较就没有意义，纸上最优的那个方案只是你动了哪个假设的产物。这一步还会暴露一个事实：最优解常常不是 5 个里的任何一个，而是组合——更小的池子加上按里程碑走的第二轮——而这个结论只有当 5 个场景用同一套输入并排放在一张表上时才会浮出来。',
        },
        {
          step: 6,
          label: '设定并写死单轮稀释护栏，把董事会控制权写进目标里',
          gate:
            '存在一条写下来的单轮稀释目标：低于 25%，并且注明它对应的董事会后果（创始人保留轮前 75% 以上的持股），且本轮建模出的稀释落在这个目标之内。',
          blockIf:
            '没有写下来的目标，护栏就退化成上一场对话的潜台词，而每一轮都在继承上一轮的含混。它还让你失去了谈判能力：能说出「这个结构是 28%，我们的护栏是 25%」的创始人是在谈判，只知道 headline 数字的创始人是在接受。如果建模稀释超过目标，此刻该退回步骤 4，而不是继续去做退出建模。',
        },
        {
          step: 7,
          label: '跨 5 个倍数投影退出收益，并解出盈亏平衡稀释上限',
          gate:
            '退出收益在 5 个估值倍数（0.5x / 1x / 2x / 5x / 10x pre-money）上都算过，且「投资人仍拿 10x 时你能接受的最大稀释」是一个具体数字，并且高于当前条款书隐含的稀释。',
          blockIf:
            '没有这个盈亏平衡数，你无法判断即将签字的稀释在「你相信能达到的倍数」下是宽裕的、还是在「你害怕的倍数」下是致命的，而这两个答案差别极大。它同时把退出谈判变成有形状的：杠杆在 0.5x 那一行，因为一轮看起来稀释上很慷慨的交易，正是在那里悄悄把创始人的收益压到接近零。',
        },
        {
          step: 8,
          label: '谈定池子结构 —— post-money 计价、存量与新增拆分、刷新条款',
          gate:
            '池子有一份写下来的结构：要么按 post-money 计价，要么拆成存量员工与新员工两段，并写明「只给新员工补足」的刷新机制；按该结构重算的加池后创始人持股与模型的偏差不超过 1 个百分点。',
          blockIf:
            '如果池子只是公司的一个笼统百分比，下一轮会按更大的招聘计划去刷新它，创始人将为还没招到的人买单。现在锁死结构不花任何代价，远比等这轮结束、池子已经写进章程、而创始人手上已无筹码之后再谈要好。',
        },
        {
          step: 9,
          label: '每次条款书修订后重跑 cap table，并记录稀释差值',
          gate:
            '条款书的每一次修订都在 1 个工作日内触发重跑，版本化模型显示相对上一版的创始人稀释差值（百分点），且没有哪一次修订在未经明确拍板接受的情况下，把这一轮的稀释改动超过 2 个百分点。',
          blockIf:
            '小修订跨轮次不会一直小：在一轮中等规模融资上，pre-money 的轻微摆动就是好几个百分点的稀释，而每一轮都把这个百分比作用在已经更小的创始人份额上，所以效果是乘法而不是加法。缺了每次修订后的重跑，第一个看到累计伤害的人，就是下一次去融资的人——通常是在更差的估值上、手里信息更少的时候。',
        },
      ],
    },
  },
};
