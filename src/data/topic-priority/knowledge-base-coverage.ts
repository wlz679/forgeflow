// P166 —— K 类（Knowledge / 知识库）主题「knowledge-base-coverage」的新形态内容。
//
// ⭐ 这一层写的是什么（与既有散文的分工）
// --------------------------------------------
// · howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
// · howToApply（指南页）= Step 1…Step 7 编号链（按顺序做什么）
// · 本文件 fixPriority = 五个指标同时不达标时，先修哪个 → 它顺带带动谁 → 什么条件下它会把另一个指标修坏
// · 本文件 readinessChecklist = 每一步的达标线（今天就能核对的数量线 + 不达标具体卡在哪）
//
// 口径纪律（本主题不是 B 类，讲的是你自己的运营比率，不讲市场价）：
//   · 每个比率都写明分子、分母与窗口（默认最近 90 天）
//   · 覆盖率 = 匹配工单 ÷ 总工单；拦截率 = 被拦截工单 ÷ 总工单
//   · 有用性 = 有用票 ÷ 总反馈；回弹率 = 回弹工单 ÷ 被拦截工单（拦截后满 30 天）
//   · 全文不出现任何手写单价（本主题的比率不是市场价，不会随外部定价漂移）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Coverage without deflection is a search problem, and no amount of article writing fixes it. The five metrics on this page fail together because they are a funnel rather than a checklist: coverage sets the ceiling, since a customer cannot be deflected toward an article that does not exist; deflection only moves once the answer is both present and findable; and helpfulness is the cheapest signal you have, one vote per read, but also the easiest to fake by narrowing what counts as feedback. Reopen rate is the one that audits what you already booked: a deflected ticket that comes back, above the 8-15% band, was never a deflection but a delayed transfer to a human, and above 25% it is masking a product gap rather than a documentation gap. Article type mix sits last because it is structural, changing what you write next quarter rather than what you repair this week. Read the two main numbers as a pair, because the pairing is the diagnosis: high coverage with low deflection means the library has the answer and search cannot find it; low coverage with high deflection means the answer is wrong, or you are deflecting customers onto an article that does not solve their problem.',
      rows: [
        {
          priority: 1,
          metric: 'Coverage rate — tickets matched to an existing article ÷ total tickets, 90-day window',
          fixFirst:
            'Fix coverage breadth first because it is the ceiling on everything else in this table and the slowest of the five to move. A customer can only be deflected toward an article that exists, so a deflection rate of 20 percent is unreachable at 40 percent coverage no matter how good your search is. Coverage is also the only row here that requires net-new content rather than better behaviour from the content you already have, which means it carries the longest lead time; starting it last means you discover the gap in week nine instead of week one. Use the 90-day ticket pull, tag every ticket either against an existing article or with an explicit no-article-exists code, and treat the no-article code as the backlog itself. Do not pick your tagging rule from the number you want to reach: a loose rule that marks a ticket matched because a related article exists will inflate coverage while ticket volume stays exactly where it was.',
          alsoMoves:
            'Coverage sets the denominator for two of the other four metrics, so fixing it changes what they mean even when it does not change their value. Reopen rate divides by deflected tickets, and unmatched tickets never reopen, so a coverage rise mechanically dilutes the reopen rate and can make a quality problem look better than it is; judge reopen on the matched cohort only. It also reshapes the helpfulness sample, because articles that exist but never get read contribute no feedback at all, so raising coverage without raising traffic on those articles leaves the helpfulness denominator flat and the score unreadable. And coverage is what tells you which type mix to write next, because the no-article codes cluster by topic and the cluster holding the most unmatched tickets is the one your library is missing.',
          backfire:
            'Coverage backfires in three ways. First, breadth without depth: if you write one thin article per unmatched ticket phrasing, you fragment the library into near-duplicates, monthly traffic per article falls below the level where feedback accumulates, and the helpfulness score drops below 60 percent while the coverage number climbs. Second, tag drift: as the rule loosens to protect the coverage metric, agents mark tickets matched whenever anything adjacent exists, and the metric becomes self-reporting. Third, an off-season denominator: if your 90-day window includes a launch month or an outage, coverage is measured against an unusual ticket mix and the whole table gets re-ranked on a temporary baseline. Freeze the window, write down the tags you used, and re-pull on the same window before you compare anything.',
        },
        {
          priority: 2,
          metric: 'Deflection rate — tickets closed after a KB article view without an agent reply ÷ total tickets, 90-day window',
          fixFirst:
            'Fix deflection second, once coverage is known, because deflection is the only row that turns the library into a staffing decision. Every deflected ticket is a ticket you do not staff, and for a solo founder or a two-person team that is the difference between answering in an hour and answering in a day. It is also the metric that makes the coverage work worth paying for: coverage tells you the library could have answered the question, deflection tells you whether it actually did. Read it as a pair, never alone. High coverage with low deflection means the content exists and cannot be found or trusted, so the repair belongs to search, taxonomy and article placement, not to writing. Low coverage with high deflection means the articles people do reach are too broad to resolve the ticket, so the repair is content depth. Compute it from the analytics tool, and fix the instrumentation before you fix the content if the number came from a definition you cannot defend.',
          alsoMoves:
            'Deflection moves the search and taxonomy work, because the traffic it generates is the traffic that feeds your synonym map and your zero-result list: every deflected ticket that ended without a reply is a query that either matched or did not, and the ones that did not are the highest-value content gaps you will find this quarter. It also moves helpfulness, because articles that get read produce votes while articles nobody ever reads stay out of the feedback denominator, so a deflection rise usually pulls the bottom-20 percent audit list toward a different set of articles. And it sets the direction for article type mix, because the type of article that actually deflects is the type that earns the next quarter writing budget.',
          backfire:
            'Deflection backfires when the metric is reached by routing rather than by resolving. The cheap version attaches a suggested article to every ticket regardless of whether it matched, which lifts the deflection number while the reopen rate climbs, because customers are closing tickets they never actually solved. The subtler version is an inlined answer in the ticket or the email: the ticket closes without an article view, so deflection improves while the helpfulness denominator collapses to near zero and the article quality signal disappears entirely. Judge deflection only on tickets with a genuine article view, and always read it next to the reopen rate in the same window — if deflection rose and reopen rose with it, you have moved work rather than removed it.',
        },
        {
          priority: 3,
          metric: 'Article helpfulness — helpful votes ÷ total feedback events on articles read in the 90-day window',
          fixFirst:
            'Fix helpfulness third because it is the cheapest measurement in the table — one vote per read — and it is the first number that tells you which of the matched articles are actually answers rather than pages that merely existed. Run it before any rewrite work, because a library with a high coverage rate and a 45 percent helpfulness score is not under-covered, it is over-claimed, and those two problems get fixed in completely different ways. Audit the bottom 20 percent of articles by traffic and helpfulness together, not helpfulness alone: an article with three reads and one unhelpful vote is noise, while an article with eight hundred reads and a 40 percent score is a defect with reach. For each article in that list the decision is rewrite or retire, and the decision has to be recorded before the rewrite starts, because a rewrite with no prior decision is how a library grows without improving.',
          alsoMoves:
            'Helpfulness decides which articles carry the reopen rate, because an unhelpful article is one a customer reads and then reopens a ticket about, so fixing the bottom of the helpfulness list is the fastest way to move reopen rate down. It also sets the retirement list that feeds the coverage metric, because every article you retire removes a match target and pulls coverage down by a point or two in the short term, which is exactly why coverage and helpfulness have to be read in the same review cycle rather than in separate quarters. And a healthy helpfulness score is what tells you the traffic mix is right: a library whose reads are dominated by reference pages that nobody rates is telling you the type mix is wrong, not that the writing is bad.',
          backfire:
            'Helpfulness backfires when the sample is thin or the voting prompt is leading. Below roughly 200 feedback events a percentage moves in jumps of five points or more on a single vote, so ranking articles by a score built on nine votes produces a rewrite list that is mostly noise and burns your editor week on articles nobody reads. The other failure is retiring too much at once: pulling the bottom 20 percent removes real match targets, coverage drops several points, and if you then judge the retirement by the coverage number in the following month you will conclude it failed and put the articles back. Judge retirement on reopen rate and on ticket volume over the next two quarters, and retire in batches you can re-measure.',
        },
        {
          priority: 4,
          metric: 'Deflection quality — reopened tickets ÷ tickets that were deflected, measured 30 days after deflection',
          fixFirst:
            'Fix the reopen rate fourth because it is the only metric in this table that audits whether the deflection you already booked was real. Coverage, deflection and helpfulness are all inputs measured at the moment of the ticket; reopen rate is measured after the customer has had time to find out whether the answer worked, which is why it is the last word on quality rather than the first. It is also the metric that tells you where to look when a content programme stalls: a high reopen rate over a high-traffic article set almost always points at content that is present and current-looking but wrong for the situation the customer is actually in — a policy article that predates a product change, or a setup guide that assumes a screen the product no longer has. Set the measurement window explicitly at 30 days after deflection, because reopen behaviour inside the first week is usually an agent re-opening a related question rather than a failed self-service answer.',
          alsoMoves:
            'Reopen rate is the bridge between content work and the freshness programme: it turns a vague feeling that content is stale into a named list of articles with a measured defect, and it is the signal you hand to whoever owns freshness. It also re-ranks the coverage metric, because a matched ticket that reopens is a ticket that will be asked again, and it is the number you use when a stakeholder asks about ticket volume rather than about self-service and you need to show whether the deflection you claimed actually held.',
          backfire:
            'The reopen rate backfires when the definition drifts to flatter the number. Marking a ticket solved the moment the customer stops replying makes the reopen rate collapse while the underlying content is unchanged, and the flattening shows up later as a repeat-contact complaint with no metric attached to it. The other version is reclassifying reopens into a new ticket type so they leave the denominator — the ratio becomes unreadable and the same defect keeps producing tickets. And reopen rate is only meaningful against a matched cohort: unmatched tickets that went to an agent are excluded, so a coverage rise can lower the reopen rate with no change in content quality at all. Always state the denominator in the number you publish.',
        },
        {
          priority: 5,
          metric: 'Article type mix — share of article views by type (how-to, troubleshooting, reference) against the 60 / 25 / 15 target',
          fixFirst:
            'Fix the type mix last because it is structural, and because it only pays off once the other four metrics are steady enough to show you the effect. The mix decides what you write next quarter rather than what you repair this week, and it is the one row here that cannot be moved by effort applied to existing pages — it changes when you decide what to write, and then only over two or three quarters. Read the mix off views rather than off article count, because a library with 300 reference pages and 10 how-to pages has an article mix and a traffic mix that point in opposite directions. The reference target of 60 percent how-to, 25 percent troubleshooting and 15 percent reference holds for a mature self-service library; a young library with a narrow product legitimately sits elsewhere, so treat the target as a check on drift rather than a quota. When the mix is off, fix it through the writing plan and the cluster roadmap rather than a one-off sprint.',
          alsoMoves:
            'The type mix sets the ceiling on the coverage rate you can reach with the articles you already have: a library heavy on reference pages can answer reference questions and almost nothing else, so its coverage ceiling is lower than the article count suggests, and the no-article backlog from the ticket tagging step clusters in how-to and troubleshooting topics. It also changes what the helpfulness score means, because reference pages usually attract more views per read and fewer votes than step-by-step guides, so a rising reference share depresses the aggregate helpfulness score without any writing getting worse.',
          backfire:
            'The type mix backfires when you chase it with a quota instead of a diagnosis. Setting a target of 60 percent how-to and writing how-to articles to hit it produces traffic-light articles that inflate the share and dilute the helpfulness score, and the library gets worse while the metric gets better. The other failure is applying a mature-library mix to an early-stage product where the questions really are reference questions: that pushes your writers toward content nobody needs, and coverage on the topics customers actually ask about stops moving. Fix the mix only after the no-article backlog tells you which type is actually missing.',
        },
      ],
    },
    zh: {
      intro:
        '覆盖率低和拦截率低是两场不同的病，而这一页上的五个指标是一根漏斗上的五个点，不是五张独立成绩单。覆盖率是天花板 —— 客户不可能被引导到一篇不存在的文章上；拦截率只有在答案既存在又找得到时才会动；有用性是你手里最便宜的信号（每次阅读一票），但它也最容易被「把反馈口径收窄」做假。回弹率是唯一能审计你已经记在账上的那个指标：被拦截后又回到人工的工单从来没算过一次拦截，超过 8-15% 这条带子它就是一次延迟的人工转接，超过 25% 则是在盖住一个产品缺口而不是文档缺口。文章类型组合放最后，因为它是结构性的 —— 它改变你下季度写什么，而不是你这周修什么。读的时候要把两个主数配起来，因为配对本身就是诊断：高覆盖率配低拦截率，说明答案在库里、搜索找不到；低覆盖率配高拦截率，说明答案是错的，或者你正把客户引到一篇解决不了他问题的文章上。',
      rows: [
        {
          priority: 1,
          metric: '覆盖率 —— 匹配到现有文章的工单数 ÷ 总工单数，最近 90 天窗口',
          fixFirst:
            '先修覆盖率，因为它是这张表里所有指标的天花板，也是五个里动得最慢的一个。客户只可能被引导到存在的文章上，所以覆盖率停在 40% 时，拦截率无论搜索做得多好都够不到 20%。而且这一行是表里唯一需要「新建内容」而不是「让已有内容表现更好」的，前置时间最长；放到最后修，等于在第 9 周才发现缺口，第 1 周就能发现。做法是拉 90 天工单，逐条标成「匹配到某篇文章」或「明确无对应文章」，后者本身就是待办清单。不要为了让覆盖率好看去挑标注口径：如果规则松到「沾边就算匹配」，数字会涨，工单量一点不降。',
          alsoMoves:
            '覆盖率决定了另外两个指标的分母，所以修它会改变那两个数字的含义，哪怕数值没动。回弹率的分母是被拦截工单，而没匹配上的工单从不回弹——覆盖率一涨，回弹率就被机械地稀释，质量问题看起来比实际轻，所以回弹率只按匹配上的那一批来判。它也重塑有用性的样本：存在但没人读的文章完全不产生反馈，覆盖率涨了而这些文章的流量没涨，有用性的分母不动，分数就读不出来。覆盖率还告诉你下季度该写哪一类：没有对应文章的编码会按主题聚类，聚类里没匹配工单最多的那一簇，就是库里缺的那一块。',
          backfire:
            '覆盖率有三种翻车方式。第一种是只堆广度不堆深度：每条没匹配工单配一篇薄文章，库里被切成大量近似重复，月访问量掉到收不满反馈的水平，有用性跌破 60%，而覆盖率反而在涨。第二种是口径漂移：为了守住覆盖率把规则放松，客服只要看到沾边的文章就标匹配，这个指标就变成自己给自己打分。第三种是分母撞上异常期：如果 90 天窗口里含发布月或故障期，覆盖率就是拿一份特殊工单结构做基准，整张表的排序都被临时基准带偏。冻结窗口、把标注规则写下来、下次用同一个窗口重拉，再谈比较。',
        },
        {
          priority: 2,
          metric: '拦截率 —— 24 小时内浏览过文章且无人工回复即关闭的工单数 ÷ 总工单数，90 天窗口',
          fixFirst:
            '拦截率排第二，前提是覆盖率已经量出来，因为它才是把知识库变成编制决定的指标。每被拦截一张工单，就是一张你不用配人接的工单；对一个人干活的创始人或者两人小队，这是一小时回复和一天回复的差别。它也是让覆盖率这笔投入变得值得的那个指标：覆盖率告诉你库里本来能回答这个问题，拦截率告诉你它到底有没有回答。读它必须配对读，绝不能单看。高覆盖低拦截说明内容在但找不到或者不敢信，修复动作属于搜索、分类和文章位置，不是继续写；低覆盖高拦截说明文章被读了但太笼统，修复动作是内容深度。先确认这个数从分析工具里取的口径你能在被质疑时解释清楚，再去改内容。',
          alsoMoves:
            '拦截率会牵动搜索和分类的工作，因为被拦截的每一次阅读都产生查询——要么命中，要么没命中，而没命中的那批，就是本季度最值钱的内容缺口。它也影响有用性：被读到的文章才有票，从没被读过的文章根本不在反馈分母里，所以拦截率一涨，被审计的后 20% 文章清单通常会换成另一批。它还决定文章类型组合的方向：真正能拦得住工单的那类文章，就是下一季度写作预算该压的那一类。',
          backfire:
            '拦截率会因为「路由」而不是「解决」而翻车。最省事的做法是不管匹不匹配都给工单挂一个推荐文章，拦截率上去了，回弹率也跟着上去，因为客户关掉的是自己从没解决的工单。更隐蔽的是把答案直接内联在工单或邮件里：工单没经过文章阅读就关闭，拦截改善了，而有用性的分母直接塌到接近零，文章质量信号整个消失。拦截率只认真正发生过文章阅读的工单，并且必须和同一个窗口的回弹率一起读——两个一起涨，说明你只是把活挪走了。',
        },
        {
          priority: 3,
          metric: '文章有用性 —— 有用票数 ÷ 该文章的总反馈数，覆盖 90 天窗口内的阅读',
          fixFirst:
            '有用性排第三，因为它在这张表里测起来最便宜——每次阅读一票——而且它是第一个能告诉你「匹配上的文章里哪些是真答案、哪些只是恰好存在」的数字。任何改写工作之前先跑它，因为覆盖率很高但有用性只有 45% 的库不是覆盖不足，而是宣称过头，这两件事的修法完全不同。审计要按流量和有用性一起取后 20%，不要只看有用性：三次阅读里一票不有用的文章是噪声，八百次阅读里 40% 有用的文章是带影响面的缺陷。清单里每篇文章的结论只能是「重写」或「下线」，而且必须在动手前写下来——没有结论的重写，就是库在涨、但没在变好的那种涨。',
          alsoMoves:
            '有用性决定哪些文章在承担回弹率，因为不好用的文章正是客户读完又开一张工单的那批，把有用性榜单底部修好，是把回弹率压下去最快的路。它也定出下线清单，而下线清单会反过来喂给覆盖率——每下一线一篇，就少一个匹配目标，短期内覆盖率会掉一两个点，这正是覆盖率和有用性必须放在同一个复盘周期里看、而不是分两个季度看的原因。有用性分数健康还说明流量结构对了：一个阅读量被没人打分的参考页主导的库，问题在类型组合，不在写作。',
          backfire:
            '有用性有两个翻车方式。一是样本太薄：反馈数不到 200 条时，一条票就能让百分比跳 5 个点以上，按这个分数排出来的改写清单大半是噪声，会白白烧掉编辑一周去处理没人读的文章。二是下线下得太猛：把后 20% 一次性清掉会砍掉真实的匹配目标，覆盖率掉好几个点；如果接下来一个月用覆盖率去评价这次下线，你就会得出「下线失败」的结论把文章放回去。下线要用未来两个季度的回弹率和工单量来判，并且分批做，保证每一批都能重新量。',
        },
        {
          priority: 4,
          metric: '拦截质量 —— 回弹工单数 ÷ 被拦截工单数，按拦截后满 30 天统计',
          fixFirst:
            '回弹率排第四，因为它是表里唯一在复核「你已经记在账上的拦截是不是真的」的指标。覆盖率、拦截率、有用性都是在工单发生的那一刻测的输入，回弹率是等客户发现答案到底管不管用之后才测的，所以它是质量的最终结论而不是起点。它也是内容项目卡住时告诉你该往哪儿看的那根指针：高回弹率叠在高流量文章上，几乎总是指向「内容在、看起来也新，但不对着客户真正的处境」——一篇产品改版前的政策说明、一份假设了产品早已没有的界面的配置指南。测量窗口明确设成拦截后 30 天，因为第一周之内的回弹，通常是人工为了相关问题重开，而不是自助答案失败。',
          alsoMoves:
            '回弹率是内容工作和新鲜度项目之间的桥：它把「内容好像旧了」这种模糊感觉，变成一份有实测缺陷的具体文章清单，可以直接交给新鲜度的负责人。它也会重排覆盖率这个指标，因为一张被匹配上又回弹的工单，等于同一个问题还会被再问一遍；而当只关心工单量、不关心自助率的同事问起拦截率值不值得保住时，它也是你手上唯一一个能回答这个问题的数字。',
          backfire:
            '回弹率会因为定义漂移而变得好看。客户不再回复就立刻标记已解决，回弹率会塌，而内容一点没变；这种塌陷最后会以「重复联系」的投诉形式出现，却没有指标挂在它上面。另一个版本是给回弹工单换个新类型，把它移出分母——比率就读不出来了，同一个缺陷还在持续产单。而且回弹率只有对匹配队列才有意义：没匹配、直接转人工的工单被排除在外，所以覆盖率一涨，回弹率可能自己降下来，内容质量却毫无变化。任何对外发布的回弹率都必须把分母写出来。',
        },
        {
          priority: 5,
          metric: '文章类型组合 —— how-to / 故障排查 / 参考 三类文章的浏览量占比，对照 60 / 25 / 15 目标',
          fixFirst:
            '类型组合排最后，因为它既是结构性的，也是要等另外四个指标稳下来才看得出效果。这一行改变的是你下季度写什么，而不是你这周修什么；它是表里唯一不能靠对现有页面使劲就推动的行——它在你决定写什么的时候才变，然后还要两三个季度才显形。组合要看浏览量而不是文章篇数，因为一个库里有 300 篇参考文档、10 篇操作指南，篇数结构和流量结构会指向两个相反的结论。60% how-to、25% 故障排查、15% 参考 是成熟自助库的目标形态；产品线窄的早期库合理地不在这个位置上，所以把它当成漂移检查，而不是配额。组合不对时，靠写作计划和主题簇路线图修，不要靠一次冲刺修。',
          alsoMoves:
            '类型组合决定了你用现有文章最多能把覆盖率推到哪：参考文档为主的库能回答参考类问题，几乎回答不了别的，所以它的覆盖率上限比篇数看起来更低，标工单那一步的没匹配清单会集中在 how-to 和故障排查两个主题上。它也改变有用性分数的含义：参考页通常阅读次数更多但投票更少，参考占比一升，聚合有用性分数就会往下走，而写作质量并没有变差。',
          backfire:
            '类型组合一旦用配额去追就会翻车。定一个 60% how-to 的目标然后照着写，结果写出一堆凑数的操作指南，分享量上去了，好用性被稀释，库变差了而指标变好了。另一个失败是把成熟库的组合套到早期产品上——那时候客户问的确实就是参考类问题，这会把编辑推向没人需要的文章，客户真正会问的主题上的覆盖率反而不动。只有在没匹配清单告诉你到底缺哪一类之后，才动组合。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'Tag the tickets before you read any ratio off the tagger, because tagging rules drift silently and every denominator downstream inherits the drift. The first line is coverage measured on 90 days of real tickets, tagged for whether an existing article matches, because that tag rate is the only honest denominator you have and it is the first one to go stale. The second line is deflection from your analytics tool, defined as a customer who opened an article within 24 hours of closing without an agent reply, and it only counts if coverage can support it, which is why the two are read together rather than separately. The third line is helpfulness from the feedback votes, with the bottom 20% of articles by traffic and helpfulness flagged for rewrite or retirement, because a popular wrong article costs more than a rare right one. The fourth line is the reopen rate, which audits the second line and must be tracked on the same cohort, otherwise the two cancel each other out. The fifth is the modelled effect of moving coverage, because a coverage number nobody converts into ticket volume and per-tier cost has not changed anything. The sixth is freshness on the articles that carry the traffic, and the seventh is the quarterly target set: coverage up 5 points, deflection up 3, helpfulness up 5, freshness up 10, because a library with no targets gets rebuilt instead of improved.',
      items: [
        {
          step: 1,
          label: 'Tag the last 90 days of tickets and compute the coverage rate',
          gate: '90 days of tickets pulled and every ticket carries either an article match or an explicit no-article code; coverage rate = matched ÷ total computed and written against the bands of 40% critical, 40-60% needs work, 60%+ healthy, with the no-article count listed by topic cluster.',
          blockIf: 'If the tagging rule is not written down, coverage is a self-reported number and every later comparison inherits that drift: the deflection rate computed on the same ticket set will read low for reasons that have nothing to do with content, and the coverage roadmap set in the last step will be built on a baseline nobody can reproduce.',
        },
        {
          step: 2,
          label: 'Compute the deflection rate and pair it with coverage',
          gate: 'Deflection rate computed on the same 90-day window as coverage (tickets with an article view inside 24 hours and no agent reply ÷ total tickets), and the pair resolved to exactly one branch: high coverage with low deflection, or low coverage with high deflection, with one named owner per branch.',
          blockIf: 'Without the pairing, a single deflection number sends you to the wrong repair. If the branch is unresolved you will either rewrite content that customers never reach, or re-tune search for articles that do not exist yet, and the reopen rate measured in step four will keep climbing because the actual defect was never addressed.',
        },
        {
          step: 3,
          label: 'Score article helpfulness and list the bottom 20% for rewrite or retire',
          gate: 'Helpfulness computed as helpful votes ÷ total feedback over the 90-day window with at least 200 feedback events behind the percentage, and the bottom 20% of articles by traffic and helpfulness listed with a rewrite-or-retire decision and a named owner per article.',
          blockIf: 'A helpfulness percentage built on fewer than 200 feedback events moves five points on a single vote, so the audit list becomes mostly noise and your editor spends a week on articles nobody reads. Without a recorded decision per article, the rewrite work leaks into the next quarter with no owner, and no one can tell whether the bottom of the list actually moved.',
        },
        {
          step: 4,
          label: 'Measure the reopen rate on the deflected cohort over 30 days',
          gate: 'Reopen rate computed as reopened tickets ÷ deflected tickets on a cohort at least 30 days old, with at least 50 deflected tickets in the denominator, and every article above the 15% reopen threshold named with the specific defect that sends the ticket back.',
          blockIf: 'A reopen rate measured on a cohort younger than 30 days counts an agent opening a related question as a failed self-service answer, so the number overstates the defect. If the underlying articles are not named, the finding stays a statistic: nobody can hand the list to the freshness owner or to the writer who is able to fix it.',
        },
        {
          step: 5,
          label: 'Model what a 10 point coverage move does to ticket volume and cost',
          gate: 'The model run in both directions — coverage down 10 points and coverage up 10 points — reporting the resulting monthly ticket volume and the cost per ticket at your current agent cost, with the headcount the model implies written next to the result.',
          blockIf: 'If only the optimistic direction is modelled, the case for writing content is never tested against the possibility that coverage rises and ticket volume does not. Without the implied headcount the model produces a ticket forecast nobody can act on, and the quarterly targets get set from optimism rather than from the arithmetic you just ran.',
        },
        {
          step: 6,
          label: 'Audit article freshness and schedule the reviews by traffic tier',
          gate: 'Every article with no update in 12 months or more flagged, the top 20% of articles by traffic carrying a named owner and a review date inside 90 days, the remaining 80% carrying a review date inside 180 days, and the flag list attached to the review queue.',
          blockIf: 'Without owners and dates, the freshness list is a report rather than a queue and it decays into a document nobody opens. If the tail 80% has no scheduled review, you will re-flag the same long tail every quarter while the top 20% keeps consuming the editorial time that the tail quietly reserves, so the visible half stays fresh while the slow half rots.',
        },
        {
          step: 7,
          label: 'Set the quarterly targets and build the cluster coverage roadmap',
          gate: 'Four targets written with baseline and target date — coverage +5 points, deflection +3 points, helpfulness +5 points, freshness +10 points — and at least one named owner plus a quarter for each cluster in the roadmap, starting with the cluster holding the most no-article tickets.',
          blockIf: 'Targets without a baseline cannot be checked at the next quarter, so the whole table resets every quarter and no trend survives. If the roadmap is not ordered by the no-article backlog, the team writes about topics customers rarely ask about, coverage moves on the easy clusters, and the cluster that caused the original gap gets the same attention next quarter.',
        },
      ],
    },
    zh: {
      intro:
        '先把工单标出来，再去读任何比率，因为标注规则会自己悄悄漂，下游每一个分母都继承这个漂。第一行是 90 天真实工单的覆盖率，逐单标注是否命中已有文章 —— 这个标注率是你唯一诚实的分母，也是最先变旧的那个。第二行是拦截率，按客户关单前 24 小时内打开过文章、且没有人工回复来算，而它只有在覆盖率撑得住时才算数，所以这两个数要一起读。第三行是反馈票算出的有用性，按流量和有用性把后 20% 的文章标出来重写或下线 —— 一篇热门但写错的文章，比一篇冷门但写对的文章更贵。第四行是回弹率，它是第二行的审计，必须跑在同一批群组上，否则两个数会互相抵消。第五行是覆盖率移动之后的建模，因为一个换不成工单量和分层成本的覆盖率，等于什么都没变。第六行是承载流量的那批文章的新鲜度，第七行是季度目标：覆盖率 +5 点、拦截率 +3、有用性 +5、新鲜度 +10 —— 没有目标的库会被重建，而不是被改进。',
      items: [
        {
          step: 1,
          label: '标完最近 90 天的工单，算出覆盖率并按阶段分档',
          gate: '90 天工单已拉齐，每条工单要么标上匹配文章、要么标上「无对应文章」；覆盖率 = 匹配 ÷ 总已算出，并对着 40% 危急 / 40-60% 待改进 / 60%+ 健康三档写明结论，无对应文章的数量按主题簇列出。',
          blockIf: '标注口径没写下来，覆盖率就成了一份自报数字，后面所有对比都继承这份漂移：同一个工单集上算出的拦截率会因为与内容无关的原因显得偏低，而最后一步的覆盖路线图就会建在一个谁也复现不出来的基准上。',
        },
        {
          step: 2,
          label: '算出拦截率，并与覆盖率配对诊断出是哪一条分支',
          gate: '拦截率在和覆盖率同一个 90 天窗口上算出（24 小时内浏览过文章且无人工回复即关闭的工单 ÷ 总工单），配对结论落到唯一一条分支：高覆盖低拦截，或低覆盖高拦截，两条分支各写一个具名负责人。',
          blockIf: '不配对，一个孤立的拦截率只会把你送进错误的修复：客户根本没看到的文章被反复重写，或者根本还不存在的文章被拿去调搜索，而第四步量的回弹率会继续往上走，因为真正的缺陷从头到尾没被碰过。',
        },
        {
          step: 3,
          label: '打出文章有用性分数，并把后 20% 列成改写或下线清单',
          gate: '有用性按 有用票 ÷ 总反馈 算出，窗口同为 90 天，分母至少 200 条反馈；按流量和有用性同时排序的后 20% 文章列出，每篇写明改写还是下线、谁来改、什么时候改。',
          blockIf: '反馈不到 200 条时有用性百分比一条票就跳 5 个点以上，审计清单大半是噪声，编辑一周花在没人读的文章上。每篇的结论不写下来，这一步的改写工作就会漏到下个季度、没人认领，也没法判断榜单底部到底动没动。',
        },
        {
          step: 4,
          label: '在拦截后满 30 天的队列上量回弹率，并点名具体文章',
          gate: '回弹率 = 回弹工单 ÷ 被拦截工单，队列年龄至少 30 天、分母至少 50 张被拦截工单；回弹超过 15% 的文章逐篇点名，写清是哪个具体缺陷把工单弹回来。',
          blockIf: '队列不满 30 天就量，人工为了相关问题重开会被算成自助失败，数字会高估缺陷。缺陷不点名，结论就停在统计层面：没人能把这份清单交给新鲜度负责人，也没人能交给真正写得动它的作者。',
        },
        {
          step: 5,
          label: '建覆盖率 ±10 个百分点对工单体量与成本的模型',
          gate: '模型两个方向都跑了——覆盖率下调 10 个点与上调 10 个点——各自给出月度工单量与按当前人工成本折出的每张工单成本，并把模型隐含的人头数写在结果旁边。',
          blockIf: '只跑了乐观方向，内容投入就永远没被检验过「覆盖率涨了但工单量没降」这种可能。隐含人头数不写出来，模型就只产出一个没人能动的工单预测，季度目标会按乐观而不是按刚算出来的算术来定。',
        },
        {
          step: 6,
          label: '审计文章新鲜度，并按流量分层排定复审与负责人',
          gate: '12 个月及以上没更新的文章全部标出；流量前 20% 的文章有具名负责人、复审日期在 90 天内；其余 80% 的复审日期在 180 天内；标记清单已接到审查队列。',
          blockIf: '没有负责人和日期，新鲜度清单就只是一份报告、不会有人打开，队列会退化成一份没人读的文档。尾部 80% 排不进计划，你会每个季度重新标一遍同一批长尾，而前 20% 一直在跟尾部抢同一份编辑时间——看得见的一半保持新鲜，看不见的一半悄悄烂掉。',
        },
        {
          step: 7,
          label: '定下季度目标，并按主题簇排出覆盖路线图与负责人',
          gate: '四个目标都写了基线与目标日期——覆盖率 +5 个点、拦截率 +3 个点、有用性 +5 个点、新鲜度 +10 个点——路线图里至少一个主题簇有负责人和季度，并排在没匹配工单最多的那一簇前面。',
          blockIf: '目标不写基线，下个季度就没法核对，整张表每季重置，任何趋势都留不下来。路线图不按没匹配清单排序，团队就会去写客户很少问的主题，容易的簇上覆盖率动了，而当初造成缺口的那一簇下个季度还是同样的关注度。',
        },
      ],
    },
  },
};
