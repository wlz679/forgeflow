// P166 —— B 类（AI Cost Tools）主题「gpu-cloud-cost-optimization」的新形态内容。
//
// ⭐ 严格档：本主题讲的是**随定价 bot 每周漂移的市场价**（每 GPU 小时单价、预留/现货折扣、
//   存储与出口单价）⇒ 本文件里任何单价都走 live token，一个字的手写价格都不许出现。
//   聚合量级用「GPU 小时数 / TB / 百分比 / 倍数」表达，不用美元数字。
//
// 与既有散文的分工（P165 取证结论，写之前先读过 topic-content.ts 的 en+zh 全文）：
//   · 既有 howToUse（基准页）= 识别负载档 → 横向比价 → 建模混合档 → 审计出口 → 验证可买 → 重对基准
//   · 既有 howToApply（指南页）= Step 1…Step 7 编号链（定规模 → 比供应商 → 建混合档 → 算总成本 → 审计出口 → 跑现货试点 → 设预留）
//   · 本文件 fixPriority = 五个成本指标同时不达标时，先修哪个 → 它顺带带动谁 → 什么条件下反过来拖累另一个
//   · 本文件 readinessChecklist = 每一步的「什么算过了」（howToApply 只说做什么，不说什么算达标）
//
// live token 用法说明：
//   · {{liveDate}} → 价格数据集最后更新时间
//   · {{liveGpuProviderCount}} / {{liveGpuProviderList}} / {{liveGpuTypeList}} → 供应商与型号
//   · {{liveGpuRate:<provider>|<type>}} / {{liveGpuSpot:…}} / {{liveGpuReserved:…}} → 三档位单价
//   · {{liveGpuRange:<type>}} / {{liveGpuSpotRange:<type>}} → 跨供应商区间
//   · {{liveGpuShare:A|type|tierA|B|type|tierB}} → A 的有效价是 B 的百分之几
//   · {{liveGpuBlendBand:<type>|<reserved>|<spot>}} → 混合档相对按需的百分比区间
//   · {{liveGpuMonthly:<provider>|<type>|<tier>|<gpus>|<hoursPerDay>}} → 月账单
//   · {{liveGpuStoragePerGB}} / {{liveGpuEgressPerGB}} → 存储与出口单价
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'The cheapest GPU hour is frequently the one you cannot use, which is why a rate comparison on its own settles nothing. A GPU bill is really four decisions multiplied together: how many GPU hours you genuinely need, what each of them costs, how long your training runs take, and what the surrounding storage and egress add. An expensive hourly rate on an over-provisioned cluster and a cheap rate on a perfectly sized one are not comparable, and neither is a cheap rate that comes with rebuild time you have not counted. Start with effective utilisation, because every hour you pay for and do not use is pure waste that no negotiation recovers. The effective per-hour rate comes second, because a price comparison means nothing until you know your utilisation. Cost per training run comes third, because that is where the rate meets your wall-clock reality, and a spot price that looks generous becomes expensive once checkpoint rebuild time enters it. Egress and storage come fourth, since they can rival the compute line on data-heavy workloads, and the remedy is a same-region layout or smaller checkpoints rather than a better rate. Reserved commitment sizing sits at the end, because it is the slowest-moving and most binding decision you make. Rates in the live table (refreshed {{liveDate}}) cover {{liveGpuProviderCount}} providers — {{liveGpuProviderList}} — and on-demand, spot and reserved prices drift apart from one another, so a comparison has to be re-made rather than remembered.',
      rows: [
        {
          priority: 1,
          metric: 'Effective utilisation — useful GPU hours ÷ billed GPU hours, on the cluster you actually run',
          fixFirst:
            'Fix effective utilisation first, because it is the one lever that reduces spend without changing a single price, and because no rate comparison is meaningful until you know the denominator. Compute billed GPU hours from the invoice and useful GPU hours from what the job needed, then split the gap into three causes: the cluster is larger than the job, the job waits for input and the GPU sits idle, or the job is killed and restarted. The first is a sizing decision, the second is a data-pipeline problem, the third is a checkpointing problem, and they have completely different fixes. Verify by measuring utilisation per job and per cluster over one week, not per account, because a 90% average across a fleet of mixed workloads can hide a cluster running at half the time.',
          alsoMoves:
            'Utilisation repair changes what every other metric on this list is worth. It moves the effective per-hour rate, because the same rate applied to fewer billed hours produces a lower cost per useful hour, and it moves the per-run cost, because a job that waits less for input finishes sooner and consumes fewer billed hours for the same result. It also changes the reserved commitment decision in row 5: a cluster that is only 40% utilised is not a candidate for a reserved commitment at all, because you would be reserving capacity you cannot fill, and a commitment made on an unmeasured cluster is how teams end up paying for two years of idle GPUs.',
          backfire:
            'Utilisation repair backfires when it is achieved by making jobs wait somewhere cheaper instead of making them run where they run. Moving data preprocessing to a cheaper instance and calling that a utilisation win leaves the GPU idle for exactly as long as before while adding a new machine to the bill, and the number you improved is now measured on a smaller denominator that no longer represents the workload. The other version is shrinking the cluster without shrinking the demand: a job that used to run in 4 hours on 8 GPUs now runs in 6 hours on 4, so the per-run cost rises even though utilisation doubles, and if the team measures success by utilisation rather than by cost per run, the project misses its deadline.',
        },
        {
          priority: 2,
          metric: 'Effective per-GPU-hour price — blended rate across on-demand, spot and reserved mix',
          fixFirst:
            'Fix the effective per-hour price second, now that you know how many hours you actually need. Start from the per-hour rate for your GPU type on every provider you could use — the live table tracks {{liveGpuProviderCount}} suppliers for types including {{liveGpuTypeList}} — and note that the spread is wide: for one tracked type, the cheapest provider on-demand rate is {{liveGpuShare:min|H100|on|max|H100|on}} of the most expensive one. Then apply the tier discounts to your actual mix rather than to a headline: reserved and spot multipliers run {{liveGpuOffReserved}}% and {{liveGpuOffSpot}}% off across the tracked providers, and a 70/30 reserved-spot blend lands at {{liveGpuBlendBand:H100|0.7|0.3}}% of on-demand cost. Verify by recomputing the blended rate with your own tier mix and confirming it against one invoice line.',
          alsoMoves:
            'A settled rate re-prices the commitment decision in row 5: the wider the gap between your current provider and the cheapest one, the more of your capacity belongs off your current provider, and the narrower the gap, the more of the saving has to come from utilisation and from the mix instead. It also moves the per-run cost in row 3, because a run that takes the same wall-clock time on a cheaper rate is simply cheaper. And the price spread is what makes a multi-provider strategy worth operating at all — if the spread were small, running two providers would cost more in operational overhead than it saves, and the right answer would be one provider plus good utilisation.',
          backfire:
            'Chasing the lowest headline rate backfires in three ways. Tokenizer-style mismatch is the general case: two providers measure the same GPU-hour differently in what they reserve for you, so a cheaper rate can deliver a smaller effective share of the hour. Workload fit is the second: the cheapest price for a type is often on a host with slower interconnect, and a multi-GPU training job is bottlenecked by interconnect rather than by raw price, so the cheaper cluster takes longer and costs more per run. Availability is the third: supply of the newest types is constrained, so a rate you can read is not a rate you can buy, and a team that switches providers on price alone discovers the waitlist during a deadline rather than during planning.',
        },
        {
          priority: 3,
          metric: 'Cost per training run — GPU hours per run × effective rate, including rebuild time after interruption',
          fixFirst:
            'Fix the per-run cost third, because it is where the rate meets your wall-clock reality and it is the number that decides whether the training programme is viable at all. Compute it as useful GPU hours per run times the effective rate, and then add the cost of interruption: if a spot instance is reclaimed mid-run and the job restarts from the last checkpoint, the rebuild hours are real GPU hours you pay for and produce no new model. So reduce them before you reduce anything else — shorten the checkpoint interval for expensive jobs, make the data pipeline restartable so a job does not need to re-read the whole dataset, and make the checkpoint format half the size so the restart itself is fast. Verify by running one real job end to end and comparing wall-clock hours billed against wall-clock hours useful.',
          alsoMoves:
            'The per-run cost moves the commitment decision in row 5 more directly than the rate does, because reserved commitments are sized against a run schedule: if a run cycle shortens, the same cluster serves more cycles per month, and the utilisation that justified the commitment changes with it. It also moves the spot decision, because a short run with frequent checkpoints has a small rebuild penalty and can live on spot, while a long run with infrequent checkpoints has a rebuild penalty large enough to cancel the {{liveGpuOffSpot}}% spot discount entirely. And per-run cost is the unit the research team actually budgets against, so improving it changes what the team asks for.',
          backfire:
            'Per-run cost repair backfires when checkpointing is treated as free. Writing a checkpoint every few minutes to survive spot kills costs storage, costs the time to write it, and adds a serialisation step to a distributed job that was previously embarrassingly parallel — so the run gets slower and the rebuild risk drops, and if the spot discount does not cover the slowdown the whole spot strategy loses money. The opposite error is over-committing: shortening the run to fit a reserved window means the last hours of the run land on a different, more expensive instance type, and the blended rate for that run is worse than the one your spreadsheet modelled.',
        },
        {
          priority: 4,
          metric: 'Egress and storage share — peripheral bytes cost ÷ total workload cost, per month',
          fixFirst:
            'Fix egress and storage fourth, because on data-heavy workloads these costs can rival the compute line and they are invisible in a per-GPU-hour comparison. Audit where the bytes move: checkpoints written to one region and read in another, datasets copied per experiment, model outputs pushed to object storage across providers. The rates are small per unit and large in aggregate — storage runs {{liveGpuStoragePerGB}} per GB and egress {{liveGpuEgressPerGB}} per GB, so a few terabytes a month of cross-region transfer is a line item that rivals the compute. The fix is mostly locality — keep the compute, the checkpoint store and the dataset in one region on one provider, and shrink the checkpoint itself, since half-precision checkpoints are roughly half the bytes. Verify by pulling the previous month of egress charges and dividing by the compute charges; anything above a tenth of the total is a modelling problem, not a rounding problem.',
          alsoMoves:
            'Cutting egress and storage changes the shape of the commitment decision in row 5, because a reserved instance is bound to a provider and a region, so a workload that currently moves bytes across regions cannot actually be consolidated until the transfer cost is counted. It also changes the per-run cost in row 3, because checkpoint frequency and checkpoint size sit directly on top of the compute cost of a run. And it feeds the provider decision in row 2: the cheapest GPU rate is irrelevant if the pipeline around it charges for every byte, so the comparison has to be on total cost per run rather than on the rate alone.',
          backfire:
            'Egress reduction backfires when locality is bought with fragility. Keeping the dataset and the checkpoints on the same provider means a provider outage takes out both the training and the recovery, while a replicated copy elsewhere was the thing that let you resume at all. The second failure is shrinking checkpoints to save storage without checking what they cost elsewhere: a half-precision checkpoint may be unusable for the evaluation you run on it, so the saved bytes reappear as a rerun of the evaluation, which is more expensive than the storage ever was.',
        },
        {
          priority: 5,
          metric: 'Reserved commitment sizing — committed share of baseline hours, and the term you are locked into',
          fixFirst:
            'Size the reserved commitment last, because it is the only decision on this list you cannot undo cheaply and because it must be made on top of a settled utilisation, rate and run schedule. Commit only the hours you can predict will be used in every month — the flat floor of your training schedule — and leave the variable part on spot or on-demand. Look at the utilisation number from row 1 rather than at the invoice: a cluster that runs flat at 70% utilisation is a good commitment candidate, and one that alternates between 100% and 10% is not, no matter how attractive the discount looks. Verify by checking that the committed hours are below the 3-month average of actually-used hours, with a margin, and that the instance type you are reserving is on your roadmap rather than on last quarter spike.',
          alsoMoves:
            'The commitment decision is where the other four rows cash out, because the reserved discount is a percentage of a rate that rows 1 and 2 established and a base of hours that row 3 established. It also moves the egress decision in row 4, since a reserved commitment binds provider and region and therefore forces the storage layout you are allowed to use. And a correct commitment changes the effective per-hour rate permanently in a way the other rows cannot: it is the only lever whose benefit persists after you stop working on it, and the only one whose mistake also persists.',
          backfire:
            'The commitment decision backfires in two directions. Over-committing pays for hours you never use, and because the contract binds you to a term, the loss is locked in for the whole term while the workload that would have used it migrates to a newer GPU type — so you end up holding discounted capacity for a card that is no longer on your roadmap. Under-committing is the quieter version: you stay on on-demand and spot, and when a supply crunch hits the exact type you need during your deadline, the price you pay is the worst price available and there is no alternative at all, because everyone else in the same crunch is buying the same thing at the same moment.',
        },
      ],
    },
    zh: {
      intro:
        '最便宜的 GPU 小时往往是你用不上的那个，所以单看费率什么也定不下来。一张 GPU 账单其实是四个决策相乘的结果：你真正需要多少 GPU 小时、每个小时多少钱、你的训练跑多久、以及周边的存储与出口加了多少。在超配的集群上用一个很贵的小时价，和在刚好够用的集群上用一个便宜的小时价，这两件事没法比；而一个便宜的小时价如果带着你还没算进去的重建时间，同样没法比。先算有效利用率，因为你付了钱却没用掉的那部分时间是纯浪费，任何价格谈判都收不回来。每 GPU 小时的有效价排在第二位，因为只有先知道自己利用率，价格比较才有意义。单次训练运行的成本是第三个，因为那是单价与你真实墙钟时间相撞的地方，而一个看上去慷慨的现货价，在检查点重建时间算进来之后就不慷慨了。出口与存储是第四项，因为在数据量大的负载上它们能与算力账单抗衡，而修法是同区域布局或更小的检查点，不是更好的费率。预留承诺量是最后一项，因为它的变动最慢、约束也最强。随 {{liveDate}} 更新的价格表覆盖 {{liveGpuProviderCount}} 家供应商（更新于 {{liveDate}}）——{{liveGpuProviderList}}——按需价、现货价与预售价彼此不会同步移动，所以比价得重做，不能靠记忆。',
      rows: [
        {
          priority: 1,
          metric: '有效利用率 —— 有效 GPU 小时 ÷ 计费 GPU 小时（按你真正在跑的那个集群算）',
          fixFirst:
            '先修有效利用率，因为它是唯一一条不动价格就能降支出的杠杆，也是任何比价有意义之前必须先有分母的东西。计费 GPU 小时从账单上取，有效 GPU 小时从任务真正需要的量取，然后把缺口拆成三种成因：集群比任务大、任务在等输入而 GPU 空转、以及任务被杀后重启。第一种是规格决策，第二种是数据管线问题，第三种是检查点问题，三者修法完全不同。验证方式：按任务、按集群量一周的利用率，不要按账号量——一个混合负载机群上的 90% 平均值，足以盖住一个有一半时间在跑的集群。',
          alsoMoves:
            '利用率修复会改变这张表上其他每一个数字的价值。它推动每 GPU 小时有效价，因为同一个价作用在更少的计费小时上，每有效小时的成本就低了；它推动单次运行成本，因为少等输入的任务更早结束、消耗更少的计费小时。它还改变第五行的预留决策：一个只有 40% 利用率的集群根本不该进预留候选名单，因为你是在预留一个填不满的容量，而在一台没量过的集群上做承诺，正是团队最后为两年的闲置 GPU 付钱的原因。',
          backfire:
            '利用率修复的反噬，是把等待挪到更便宜的地方去充数，然后宣称那是利用率胜利。把数据预处理搬到更便宜的实例上，算是一台新机器进了账单，而 GPU 空等的时长一点没变；而你改进的那个数现在挂在一个不再代表负载的、更小的分母上。另一个版本是不缩需求只缩集群：原来 8 张卡跑 4 小时的活儿，现在 4 张卡跑 6 小时，利用率翻倍而单次成本上升；如果团队用利用率而不是单次成本来衡量成功，项目就会错过截止日。',
        },
        {
          priority: 2,
          metric: '每 GPU 小时有效价 —— 按需 / 现货 / 预留混合后的加权单价',
          fixFirst:
            '第二步修每 GPU 小时有效价，此时你已经知道自己真正需要多少小时。先把你这个 GPU 型号在所有可用供应商上的每小时价列出来——实时价格表覆盖 {{liveGpuProviderCount}} 家供应商、型号包括 {{liveGpuTypeList}}——并注意价差很大：在被跟踪的某个型号上，最便宜的按需价是最贵的 {{liveGpuShare:min|H100|on|max|H100|on}}。然后把档位折扣套在你真实的档位结构上，而不是套在 headline 上：预留与现货折扣在跟踪的供应商之间分别是 {{liveGpuOffReserved}}% 与 {{liveGpuOffSpot}}%，而 70% 预留 + 30% 现货的混合落在按需成本的 {{liveGpuBlendBand:H100|0.7|0.3}}%。验证方式：用你自己的档位结构重算加权单价，并拿账单上的某一行对平。',
          alsoMoves:
            '单价定下来之后，第五行的承诺决策会被重新定价：你现在的供应商与最便宜那家之间价差越大，你的容量就越应该挪到便宜那家；价差越小，节省就越只能来自利用率和档位结构。它也推动第三行的单次运行成本，因为同样墙钟时间跑在更便宜的单价上就是更便宜。而价差本身就是「双供应商策略值不值得运维」的决定因素：价差小的时候，跑两家供应商的操作成本会超过它省下的钱，正确答案是一家供应商加上好的利用率。',
          backfire:
            '追最低 headline 价有三种反噬。第一种是「分母口径」不匹配：两家供应商对同一个 GPU 小时的口径不同，替你预留的时长也不同，于是更便宜的单价可能只买到更小的一份有效时长。第二种是负载不匹配：某个型号最便宜的价格往往在互联更慢的机器上，而多卡训练任务的瓶颈是互联而不是裸算力，于是更便宜的集群跑得更久，单次成本反而更高。第三种是可买性：最新型号供给紧张，你能读到的价不是你买得到的价，团队只看价格切供应商，往往是在截止日而不是在规划期才发现等待队列。',
        },
        {
          priority: 3,
          metric: '单次训练运行成本 —— 单次 GPU 小时 × 有效单价，含中断后的重建成本',
          fixFirst:
            '第三步修单次运行成本，因为它是单价与你真实墙钟时间相撞的地方，也是决定整个训练计划是否可行的那个数。算法是：单次任务的有效 GPU 小时 × 有效单价，再加上中断成本——现货实例在跑到一半被回收、任务从上一个检查点重启时，重建的几个小时是你照付钱、却没产出新模型的真实 GPU 小时。所以先减重建时间，再减别的：给贵任务缩短检查点间隔、让数据管线可重启以免整份数据集重读一遍、把检查点格式改成一半大小好让重启本身更快。验证方式：真跑一次完整任务，比较计费墙钟小时与有效墙钟小时。',
          alsoMoves:
            '单次成本比单价更直接地推动第五行的承诺决策，因为预留承诺是按运行排期来定的：运行周期缩短，同一个集群每月多跑几轮，而当初支撑那份承诺的利用率也就跟着变了。它也推动第四行的现货决策，因为检查点频繁、运行短的任务重建惩罚很小，可以活在现货上；而检查点稀疏、运行很长的任务，重建惩罚大到足以把 {{liveGpuOffSpot}}% 的现货折扣整个抵消掉。而单次成本是研究团队真正做预算的单位，改动它会改变团队接下来提出的需求。',
          backfire:
            '单次成本修复的反噬，是把检查点当成免费的。为了扛住现货被杀而每几分钟写一次检查点，代价是存储、写盘时间，以及给一个本来是完美并行的分布式任务加上一道串行化的步骤——于是任务变慢、重建风险下降，而如果现货折扣补不上这份变慢，整个现货策略就是亏的。反过来是过度承诺：为了塞进预留窗口而缩短运行，最后几个小时落在另一个更贵的实例类型上，于是这次运行的加权单价比你表格里算的更差。',
        },
        {
          priority: 4,
          metric: '出口与存储占比 —— 周边字节成本 ÷ 负载总成本（按月）',
          fixFirst:
            '第四步修出口与存储，因为在数据量大的负载上它们能与算力账单抗衡，而且在「每 GPU 小时单价」这种比较里完全看不见。审计字节往哪儿走：检查点写在一个区域却在另一个区域读、每次实验都复制一份数据集、模型产物被推到跨供应商的对象存储。单看单位它很小，聚合起来就不小——存储是 {{liveGpuStoragePerGB}} 每 GB、出口是 {{liveGpuEgressPerGB}} 每 GB，所以每月几 TB 的跨区域传输就是一条能与算力账单抗衡的账。修法主要是「就近」：把算力、检查点存储和数据集放在同一区域的同一家供应商上，并缩小检查点本身，因为半精度检查点的字节大约只有一半。验证方式：把上个月的出口账单拉出来除以算力账单，任何超过总成本十分之一的部分都是建模问题，不是四舍五入问题。',
          alsoMoves:
            '砍掉出口与存储会改变第五行承诺决策的形状，因为预留实例绑定供应商和区域，所以一个现在跨区域搬字节的负载，在把传输成本算进来之前根本无法真正整合。它也改变第三行的单次成本，因为检查点的频率与体积直接压在单次算力成本之上。它还进入第二行的供应商决策：算力最便宜的那家，如果管线周边按字节收费，那这个比较就不成立——比的是单次运行总成本，而不是单价。',
          backfire:
            '压出口的反噬，是用脆弱换就近。把数据集和检查点都放在同一家供应商，意味着那家一挂，训练和恢复一起停；而你原本在别处留的那份副本，恰恰是让你能接着跑的东西。第二个失败是为了省存储而缩小检查点，却不看它会不会在别处变贵：半精度检查点可能没法用于你要跑的评估，于是省下的字节以「把评估重跑一遍」的形式回来，那比存储本身贵得多。',
        },
        {
          priority: 5,
          metric: '预留承诺规模 —— 承诺占基线小时的比例，以及你被锁定的期限',
          fixFirst:
            '最后才定预留承诺，因为它是这张表上唯一不能便宜地撤销的决定，而且必须建立在已经定下来的利用率、单价和运行排期之上。只承诺你敢保证每个月都会用到的那部分——训练排期里的那条平底线——把变动的那部分留在现货或按需上。看第一行的利用率数字而不是账单：一个稳定跑在 70% 利用率的集群是好候选，一个在 100% 与 10% 之间摆动的则不是，无论折扣看起来多诱人。验证方式：确认承诺小时数低于过去 3 个月实际使用小时数的平均值并留出余量，同时确认你预留的实例类型在路线图上，而不是上季度的那个尖峰。',
          alsoMoves:
            '承诺决策是前面四行兑现收益的地方：预留折扣是第 1、2 行定下来的单价的百分比，也是第 3 行定下来的小时基数的百分比。它还推动第四行的出口决策，因为预留承诺绑定供应商和区域，也就限定了你能用的存储布局。承诺做对之后，每 GPU 小时有效价会被永久改变，这是其他几行都做不到的：它是唯一一件你停止折腾之后仍然生效的事，也是唯一一件做错之后同样会长期留存的错。',
          backfire:
            '承诺决策在两个方向上反噬。承诺过头就是为你不会用的那部分付钱，而合同把你锁在一个期限里，期间负载却迁走了——于是你握着的是一个已经不在路线图上的型号的折扣容量。承诺不足是更安静的那个版本：你继续用按需和现货，而当你的截止日撞上正好缺的那种型号的供给紧张时，你付到的是当时最差的价格，而且完全没有替代品——因为同一场紧张里所有买家都在同一时刻买同一样东西。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A GPU savings claim that never reaches the invoice is a spreadsheet fantasy, so the seven checks below must be auditable against a bill. The utilisation figure comes first because it becomes the denominator behind every rate comparison that follows, and a rate comparison built on an unmeasured utilisation is meaningless no matter how good it looks. The run duration measured from job logs comes next, because it is what tells you how many hours a reserved commitment actually needs to cover and whether a spot reclaim costs you more wall-clock than it saves in rate. Egress and storage are checked separately from compute, since they sit on a different invoice and a same-region layout or a smaller checkpoint format moves them without touching the rate card at all. The pilot that proves a spot reclaim is survivable belongs before any reserved commitment, and the commitment itself belongs last, because it locks instance type and region for a year. The rate card behind these checks is refreshed {{liveDate}}, and because a reserved quote, a spot rate and an on-demand rate do not move together, every comparison has to be re-run on one date.',
      items: [
        {
          step: 1,
          label: 'Size the workload with real numbers, split training from inference',
          gate:
            'Your workload is recorded as GPU type (from {{liveGpuTypeList}}), GPU count, hours per day at each utilisation level, and a training versus inference split, and the total reconciles with the previous month invoice to within 5% of billed GPU hours.',
          blockIf:
            'If the sizing does not reconcile with the invoice, every later number is a model of a workload you do not have, and the errors compound in a direction you will not notice: the rate in step 2 is applied to hours that were never billed, and the commitment in step 7 is sized against fiction. The training versus inference split matters specifically because the two have opposite commitment profiles — inference wants on-demand or reserved for latency, while training tolerates spot and can be checkpointed.',
        },
        {
          step: 2,
          label: 'Compare every tracked provider for your GPU type at your utilisation',
          gate:
            'You have a written per-hour comparison across all {{liveGpuProviderCount}} tracked providers for your GPU type, the cheapest and most expensive entries are named, and the spread is recorded as a number rather than a feeling — for example the cheapest provider on-demand rate sitting at {{liveGpuShare:min|H100|on|max|H100|on}} of the most expensive one.',
          blockIf:
            'Comparing only two providers, or comparing providers at different utilisation assumptions, produces a ranking that reverses when the real mix is applied. And a rate you have read is not a rate you can buy: supply of the newest types is constrained and waitlists are common, so a provider that wins on price but has a 3-week wait is not a candidate for a deadline-bound workload, and step 7 will inherit that mistake as a committed hour on a card you could not actually obtain.',
        },
        {
          step: 3,
          label: 'Model the reserved, spot and on-demand mix that fits your utilisation',
          gate:
            'A blend is written for each workload class, the reserved and spot multipliers are applied to the correct share of GPU hours (currently {{liveGpuOffReserved}}% and {{liveGpuOffSpot}}% off across tracked providers), and the modelled blended cost lands at {{liveGpuBlendBand:H100|0.7|0.3}}% of on-demand cost for the 70/30 mix.',
          blockIf:
            'If the mix is applied to the wrong share of hours, the modelled saving is fiction — the classic error is applying the spot discount to the whole fleet while only the interruptible jobs can actually run on spot. This step also depends on step 1: a workload with no useful hours at 3am is not a spot candidate no matter how large the spot discount is, and mixing it in produces a blend that cannot be executed and a commitment in step 7 that prices capacity you will not use.',
        },
        {
          step: 4,
          label: 'Compute total cost including egress, storage and observability',
          gate:
            'Total monthly cost equals the sum of GPU hours times the effective rate, plus egress bytes times the egress rate ({{liveGpuEgressPerGB}} per GB), plus stored GB times the storage rate ({{liveGpuStoragePerGB}} per GB), plus observability, and each of the 4 lines is reported separately rather than as one number.',
          blockIf:
            'Reporting one blended total hides exactly the line that decides whether the consolidation you are about to do in step 5 is worth it: if egress and storage together are a large share of the bill, then moving compute to a cheaper provider adds transfer cost and the bill gets worse, not better. It also blocks step 5, because an egress audit needs a byte count to target, and it blocks step 7, because a commitment binds provider and region and therefore decides which storage layout you are allowed to use.',
        },
        {
          step: 5,
          label: 'Audit egress and reduce bytes moved between regions or providers',
          gate:
            'Monthly transferred bytes across regions and providers are counted, the cross-region share is below 15% of total bytes, and checkpoints are stored in the same region and provider as the compute that produced them; checkpoint format is half precision where the pipeline allows it.',
          blockIf:
            'Egress charges are per byte and recomputed monthly, so an unaudited transfer is a recurring line that grows with every new experiment rather than a one-off. And the same-region rule interacts with reliability: consolidating everything onto one provider removes the copy that let you resume when that provider had an incident, so the audit must produce a recovery path as well as a byte count, otherwise a cheaper bill is bought with a longer outage.',
        },
        {
          step: 6,
          label: 'Run a 1-week spot pilot on the training workload before committing',
          gate:
            'A pilot of at least 7 days ran on real training work with spot, the measured restart count and rebuild hours are recorded, rebuild hours are below 20% of total billed hours in the pilot, and the effective saving after rebuild is at least half of the raw {{liveGpuOffSpot}}% rate discount.',
          blockIf:
            'This is the step that stops a paper strategy from becoming a real cost. A spot discount that is consumed by rebuild time is not a saving, and the failure is invisible until the pilot: reclaim latency arrives at an unpredictable moment, the job restarts, and if the checkpoint interval is long the rebuild hours are large enough to cancel the discount. Skipping the pilot means you learn this from the invoice, at a scale, and usually during the run you needed to deliver.',
        },
        {
          step: 7,
          label: 'Set reserved commitment only after 3 stable months, on the roadmap GPU type',
          gate:
            'At least 3 consecutive months of stable usage are recorded, the committed hours are below the 3-month average of actually-used hours with at least 20% margin, the reserved instance type appears on your 12-month roadmap rather than on last quarter spike, and the commitment term matches the roadmap horizon.',
          blockIf:
            'A commitment made on unstable usage is the most expensive mistake in this guide, because the contract binds both the hours and the term: you pay for the floor whether or not the work arrives, and the discount you bought is on a card that may leave your roadmap while the contract runs. And a commitment larger than your 3-month usage baseline is a bet on a workload you have not proven, which is why the gate requires a margin below the observed baseline rather than a target above it.',
        },
      ],
    },
    zh: {
      intro:
        '在账单上落不了地的 GPU 省钱只是一张表格上的幻想，所以这七项检查都写成能被账单审计的样子。利用率排在最前，因为它是后面每一次比价的分母，而拿没量过的利用率去做比价，不管看起来多漂亮都没有意义。接着是从任务日志里量出的运行时长，因为它是「预留承诺到底要覆盖多少小时」的依据，也决定一次现货回收到底有没有比它省下的费率更费墙钟时间。出口与存储要和算力分开查，因为它们在另一张账单上，而同区域布局或更小的检查点格式不动费率卡就能把它们压下去。证明现货回收扛得住的试点要在任何预留承诺之前，而承诺本身排在最后，因为它会把实例类型和区域锁一年。检查所依据的费率卡是随 {{liveDate}} 更新的，而预报价、现货价与按需价并不会一起动，所以每一次比价都得在同一天重跑。',
      items: [
        {
          step: 1,
          label: '用真实数字定负载规模，并把训练与推理拆成两段',
          gate:
            '负载被记录为 GPU 型号（取自 {{liveGpuTypeList}}）、GPU 数量、每个利用率档位下每天的小时数，以及训练与推理的拆分；总量与上个月账单的计费 GPU 小时偏差在 5% 以内。',
          blockIf:
            '规模与账单对不平，后面每个数字都是对你并没有的那个负载建模，而误差会沿着一个你察觉不到的方向累积：步骤 2 的单价被乘在从未计费的时数上，步骤 7 的承诺也按虚构的量来定。训练与推理的拆分之所以单独重要，是因为两者的承诺形态相反——推理要按需或预留来保延迟，训练能吃现货、也能被打断后重建。',
        },
        {
          step: 2,
          label: '在你的利用率下横向比较所有被跟踪的供应商',
          gate:
            '对 {{liveGpuProviderCount}} 家被跟踪的供应商都有你这个 GPU 型号的每小时候意对比表，最便宜与最贵的条目都点名写出，价差是一个记录下来的数字而不是一种感觉——例如最便宜的按需价是最贵的 {{liveGpuShare:min|H100|on|max|H100|on}}。',
          blockIf:
            '只比两家、或者在不同利用率假设下比，得出的排名会在套上真实档位结构后反转。而且你读到的价不是你买得到的价：最新型号供给紧张、等待队列常见，所以「价格赢但要等 3 周」的供应商，对有截止日的负载根本不是候选；步骤 7 会把这个错误继承成一张你其实拿不到的卡上的承诺小时。',
        },
        {
          step: 3,
          label: '建模匹配你利用率的预留 / 现货 / 按需混合档',
          gate:
            '每一类负载都写了一份混合档结构，预留与现货倍数套在正确的 GPU 小时份额上（当前跟踪供应商之间分别是 {{liveGpuOffReserved}}% 与 {{liveGpuOffSpot}}% 折扣），且 70/30 混合的建模成本落在按需成本的 {{liveGpuBlendBand:H100|0.7|0.3}}%。',
          blockIf:
            '档位套错份额，建模出来的节省就是虚构——最经典的错误是把现货折扣套给整个机群，而实际只有可中断的任务能跑在现货上。这一步还依赖步骤 1：凌晨三点没有有效工作时间的负载，无论现货折扣多大都不是现货候选，把它混进来会得到一份无法执行的混合结构，并在步骤 7 里变成一份你根本用不上的容量承诺。',
        },
        {
          step: 4,
          label: '算出含出口、存储与可观测性的月度总成本，并分 4 行报出',
          gate:
            '月度总成本 = GPU 小时 × 有效单价 + 出口字节 × 出口单价（{{liveGpuEgressPerGB}} 每 GB）+ 存储 GB × 存储单价（{{liveGpuStoragePerGB}} 每 GB）+ 可观测性成本，且这 4 行分开报出，而不是合成一个数。',
          blockIf:
            '合成一个总数，恰好会盖掉那个决定「你要不要做整合」的关键项：如果出口与存储合计占比很大，把算力搬到更便宜的供应商反而会加上传输成本，账单不是变好而是变坏。这一步同时卡住步骤 5（出口审计需要字节数才知道该打哪儿）和步骤 7（承诺绑定供应商与区域，也就决定了你能用哪种存储布局）。',
        },
        {
          step: 5,
          label: '审计出口，并把跨区域 / 跨供应商的字节降下来',
          gate:
            '跨区域与跨供应商的月度传输字节数被统计，跨区域部分低于总字节的 15%，检查点与产生它的算力存在同一区域同一家供应商；在管线允许的情况下，检查点格式为半精度。',
          blockIf:
            '出口费是按字节逐月重算的，所以没被审计过的传输不是一次性开销，而是随每个新实验持续变长的固定行。而「同区域同供应商」这条规则和可靠性互相牵制：把所有东西并到一家供应商，也同时抹掉了那家出问题时让你能接着跑的那份副本，所以审计必须同时产出恢复路径，而不只是字节数，否则你是用更长的故障时间换来一张更便宜的账单。',
        },
        {
          step: 6,
          label: '承诺之前，先在训练负载上跑 1 周现货试点',
          gate:
            '在真实训练任务上用现货跑了至少 7 天，重启次数与重建小时数被记录，重建小时低于试点期计费总小时的 20%，且扣除重建之后的实际节省至少是原始 {{liveGpuOffSpot}}% 折扣的一半。',
          blockIf:
            '这一步是防止纸面策略变成真实成本的关口。被重建时间吃掉的折扣不是节省，而这个失败在试点之前根本看不见：回收延迟在不可预测的时刻到来，任务重启，如果检查点间隔又长，重建小时足以把折扣整个吃掉。跳过试点，就意味着你从账单上、在规模化之后、而且通常是在你必须交付的那一次运行上，才学会这件事。',
        },
        {
          step: 7,
          label: '3 个月稳定用量之后才设预留承诺，且只预留路线图上的型号',
          gate:
            '连续至少 3 个月的用量被记录为稳定，承诺小时数低于过去 3 个月实际使用小时数的平均值并留出至少 20% 余量，预留的实例型号出现在未来 12 个月路线图上而不是上季度的尖峰上，且承诺期限与路线图周期匹配。',
          blockIf:
            '在不稳定的用量上做承诺，是这份指南里最贵的错误，因为合同同时绑住小时与期限：活儿来不来你都得为那条底线付钱，而你买到的折扣是在一张可能在合同期内就离开你路线图的卡上。而承诺量大于 3 个月基线，则是在赌一个你还没证明过的负载，所以这条达标线要求的是「低于已观察基线并留余量」，而不是「高于某个目标」。',
        },
      ],
    },
  },
};
