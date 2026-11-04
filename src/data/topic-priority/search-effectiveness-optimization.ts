// P166 —— K 类（Knowledge / 知识库）主题「search-effectiveness-optimization」的新形态内容。
//
// ⭐ 这一层写的是什么（与既有散文的分工）
// -----------------------------------------------
// · howToUse（基准页）= 选哪一行 → 单一动作（一个指标 → 一件事）
// · howToApply（指南页）= Step 1…Step 8 编号链（按顺序做什么）
// · 本文件 fixPriority = 五个指标同时不达标时，先修哪个 → 它顺带带动谁 → 什么条件下它会把另一个指标修坏
// · 本文件 readinessChecklist = 每一步的达标线（今天就能核对的数量线 + 不达标具体卡在哪）
//
// 口径纪律（本主题不是 B 类，讲的是你自己查询日志里的运营比率，不讲市场价）：
//   · 每个比率都写明分子、分母与窗口（默认最近 90 天）
//   · 无结果率 = 零结果搜索次数 ÷ 总搜索次数；CTR = 结果页点击次数 ÷ 搜索次数
//   · 全文不出现任何手写单价（本主题的比率不是市场价，不会随外部定价漂移）
import type { TopicPriorityContent } from './types';

export const priority: TopicPriorityContent = {
  fixPriority: {
    en: {
      intro:
        'Nobody notices a good search result, which is why search quality degrades silently while the ticket queue keeps growing. The failure has a fixed order. A query that matches nothing is a certain miss, and no ranking rule, synonym list or editorial polish brings back a customer whose words hit an empty set, so the no-result rate is the first number that has to move. Synonym coverage is next because it is the least expensive structural repair available and it converts misses you already know about into hits. Typo tolerance usually comes after that and is often a switch that was turned off for no reason. Ranking is worth touching only once those three hold, because reordering a broken result set just promotes the wrong article higher up. The semantic layer sits last for two reasons: it is the most expensive change, and it will happily cover a structural gap with an answer that reads plausibly. Each of these rates is a share of searches on your own query logs over a closed 90-day window, so a traffic shift shows up as a change in mix rather than as a false improvement, and the reformulation and search-to-ticket rates are read as depth signals rather than as separate goals.',
      rows: [
        {
          priority: 1,
          metric: 'No-result rate — searches returning zero results ÷ total searches, 90-day window',
          fixFirst:
            'Fix the no-result rate first because it is the only metric in this table where the failure is certain rather than probable. Every other failure mode here still has a chance of being rescued by good ranking or a better synonym; a zero-result query has none, because the customer has been told the answer does not exist. It is also the cheapest place to find the content roadmap, since the top 20 zero-result queries account for roughly half of the content your library never reaches, and each one is a question a real customer typed. Compute it on the same 90-day window as everything else in this table, and keep the raw query list rather than only the rate: a rate of 12 percent tells you nothing about which 12 percent to fix, while the query list does. Split it by query length too, because short queries and long ones fail for different reasons and fixing them with the same lever is why the rate stops moving halfway.',
          alsoMoves:
            'The no-result rate sets the ceiling on CTR for the whole search surface, because clicks are counted against results and a search with no results produces no clicks at all. It also feeds the two depth signals: a customer who hits zero results either reformulates the query, which pushes the reformulation rate up, or gives up and files a ticket, which pushes the search-to-ticket rate up, and both are more expensive than the search itself. Fixing it also changes the synonym work, because the queries you see in the zero-result log are exactly the ones the synonym map is supposed to cover.',
          backfire:
            'The no-result rate backfires when you catch the misses without answering them. The cheap version routes every zero-result search to a generic hub article, which removes the zero result from the log while the question the customer actually asked stays unanswered, so the search-to-ticket rate climbs instead of the no-result rate falling. The second version is broad synonym expansion: adding distant equivalents until something matches drives the no-result rate down while the top hit becomes a vague overview, so CTR accuracy falls and pogo-sticking rises. Measure the no-result rate together with the pogo-stick rate on the same queries, because a no-result rate that fell while pogo-sticking rose means you traded a miss for a bounce.',
        },
        {
          priority: 2,
          metric: 'Synonym coverage on the top 200 queries — top-200 queries with a mapped user-language equivalent ÷ 200',
          fixFirst:
            'Fix synonym coverage second because it converts the misses you already know about into hits, and it costs editorial hours rather than an engineering sprint. Users and articles do not use the same words: delete against remove, signup against register, invoice against bill, workspace against team. Every gap you close is a query you stop losing, and the coverage target of 90 percent of repeated terms across the top 200 queries is achievable in a sitting rather than a quarter. Map terms to the article they should reach, not to a list of interchangeable words, because a synonym entry pointing at a category will surface a page that is close and wrong. Then check the map against the release notes: a synonym that was correct before a rename is now a trap that sends customers to a deprecated article.',
          alsoMoves:
            'Synonym coverage moves CTR directly, because a query that used to return nothing now returns a result, and it lowers the reformulation rate, because a customer whose first query worked has no reason to type a second one. It also decides what the typo-tolerance work can achieve, since a typo that is corrected into a term with no synonym entry simply becomes a different zero result. And the synonym map is the cheapest input to the semantic layer, because an embedding model has to learn the same vocabulary relationship you can write down in one sitting.',
          backfire:
            'Synonym coverage backfires when the map gets generous. A term mapped to six interchangeable words makes every query containing it return a generic page, so the mean position clicked rises above 5.0, the specific article is pushed below the fold, and the no-result rate falls while the customer experience gets worse — the metric that improved and the metric the customer feels move in opposite directions. The other failure is letting the map rot: a synonym that pointed at the right article before a product rename now points at a deprecated page, and because the term still matches something, the query never appears in your zero-result log and you never learn that it is broken.',
        },
        {
          priority: 3,
          metric: 'Typo-resolved queries — queries containing a typo that still returned a relevant result ÷ sampled typo queries',
          fixFirst:
            'Fix typo tolerance third, because it is usually a configuration switch that is already sitting off in the search engine and it removes a failure mode that no amount of content work will fix. Real customer queries contain typos, abbreviations and transpositions, and on a two-word query a single transposition is enough to produce a zero result. Edit distance 1 to 2 is the standard setting and the major engines ship it on by default, so this row usually closes in an afternoon rather than a quarter. Measure it on a fixed sample of at least 50 typo queries so the number means something: a typo-resolved rate computed once on whatever traffic happened to arrive is not a metric you can manage against. Measure it after the synonym map exists, because typo tolerance that corrects a misspelling into a word the library has no article for just moves the failure from one place to another.',
          alsoMoves:
            'Typo tolerance lowers the no-result rate on the short-query segment specifically, which is where the largest share of queries lives and where the keyword engine is weakest. It also protects CTR from a common misread: a low CTR on short queries is often a spelling problem being recorded as a relevance problem, and fixing it prevents a wasted rewrite of articles that were never the issue. And because it is a switch rather than a project, its effect on the other metrics shows up within the first week, which makes it the cheapest experiment available to you in this whole table.',
          backfire:
            'Typo tolerance backfires when the distance is too generous for the query length. Edit distance 2 on a one or two word query is effectively fuzzy matching against a large part of your library, so an unrelated article can be returned as the top hit, the customer reads the wrong page, and both CTR accuracy and the pogo-stick rate get worse even as the no-result rate improves. The other failure is enabling it before the synonym map exists: the engine silently corrects the typo to a word you have no article for, the query leaves the zero-result log, and the underlying vocabulary gap stops being visible in your metrics — the miss has been hidden rather than fixed.',
        },
        {
          priority: 4,
          metric: 'Ranking quality — mean position of the clicked result ÷ clicks on result pages, 90-day window',
          fixFirst:
            'Fix ranking fourth, once the result sets themselves are sound. Ranking is the last structural lever before the semantic layer, and it is worth doing properly because a well-placed correct article beats a badly placed one on every query that already works. The mean position clicked tells you whether the problem is what is on the page or what is in the wrong place: below 3.0 is healthy, above 5.0 means the right article is buried or the top results are the wrong ones. Work on the highest-traffic queries first, where one placement change moves the largest number of customers, and fix the specific query rather than the whole ranking model. A CTR target set without a relevance target teaches the engine to promote whatever gets clicked, which is a faster route to a satisfied customer and a slower route to a solved ticket.',
          alsoMoves:
            'Ranking is what moves the search-to-ticket rate, because a customer who finds the right answer on the first result does not file a ticket, and it moves the pogo-stick rate, since a correct first hit removes the click-and-go-back pattern. It also changes the value of the semantic layer: semantic search on top of a well-ranked keyword result set lifts long-tail queries, while the same layer on top of a badly ranked one adds confidence to the wrong article. And a measured mean position gives you the defensible baseline for that comparison, which is otherwise the easiest thing in this table to argue about.',
          backfire:
            'Ranking backfires when you optimise clicks instead of task completion. Promoting the highest-CTR article to the top raises CTR and lowers the search-to-ticket rate at the same time, because a popular page is often a popular overview that does not resolve the specific question — the click gets counted and the customer still ends up in a ticket. The second version is over-fitting to one segment: tuning for short high-volume queries lifts the overall CTR number while long-tail queries, which the semantic layer was meant to rescue, get worse. And a ranking change that ignores the synonym map can reorder pages the map was carefully pointing at, so a metric that was fixed reappears as a different symptom.',
        },
        {
          priority: 5,
          metric: 'Semantic-layer coverage — long-tail queries answered by the semantic layer ÷ total long-tail queries',
          fixFirst:
            'Add the semantic layer last, and only as a fallback rather than a replacement. It is the most expensive change in this table, and the ordering is right: semantic search on top of a broken synonym map hides the gap behind plausible-looking answers while inflating the cost of every search. Run it where the keyword engine is not confident — long-tail queries, natural-language phrasings, questions that share no vocabulary with your article titles — and keep keyword ranking as the default path so that the short specific queries which already work do not drift. Define the long-tail segment before you start, or you will not be able to tell whether the semantic layer helped or simply absorbed traffic that used to fail. Measure it against the keyword-only baseline over at least two weeks.',
          alsoMoves:
            'The semantic layer moves the long-tail CTR and the reformulation rate at the same time, because a natural-language question that used to be reformulated into keyword terms now matches directly. It also changes what the synonym map needs to cover: with semantic retrieval handling natural phrasings, the map can shrink toward the terms that genuinely differ in spelling rather than every user-language variant, which makes the map cheaper to maintain. And because semantic retrieval is the only mechanism here that can surface content nobody searches for by name, it changes which articles the zero-result routing should offer as its popular fallbacks.',
          backfire:
            'The semantic layer backfires in two directions at once. On long queries it can retrieve a plausible page that is not the right one, which is why the fallback should only fire below a confidence threshold and should still show keyword results underneath. On short specific queries it drifts: a one-word query has no context to embed meaningfully, so putting semantic retrieval on the default path lowers CTR on exactly the queries that were already working. And if you turn it on before the structural fixes land, the no-result rate and the reformulation rate both look better while the underlying vocabulary gap stays hidden, so the synonym work never gets done because the dashboard stopped complaining.',
        },
      ],
    },
    zh: {
      intro:
        '搜索的失败是静音的：没人会因为一次搜索结果好用而留言，但结果不好时，用户会直接放弃或者去开工单，而且不会告诉你为什么。这套坏法有固定次序。一个什么都没匹配上的查询是确定的失败——再好的排序规则、同义词表和编辑打磨也救不回一个「你的词什么都没命中」的用户，所以无结果率是第一个必须动的数字。同义词覆盖率排在后面，因为你手上最便宜的结构性修复就是它，也是把已经知道的漏接转成命中的一步。错字容忍通常紧随其后，它多半只是一个没理由被关掉的开关。只有这三样都站住了，才值得动排序：对一个坏的结果集重排，只是把错的文章排得更高。语义层放最后有两个原因——它最贵，而且它很乐意用一个读起来合理的答案把结构性缺口盖住。这里的比率都是在你自己查询日志上、封闭 90 天窗口里算出来的搜索份额，所以流量结构变化会体现为构成变化，而不是被误读成一次改善；改写率和搜索转工单率则当成深度信号读，而不是当成两个独立的目标。',
      rows: [
        {
          priority: 1,
          metric: '无结果率 —— 返回零结果的搜索次数 ÷ 总搜索次数，90 天窗口',
          fixFirst:
            '无结果率排第一，因为它是这张表里唯一「失败是确定的」指标。别的失败模式还有可能被好排序或同义词救回来，零结果查询没有这个可能——客户已经被告知答案不存在。它同时也是找内容路线图最便宜的地方，因为前 20 个零结果查询大约占了库里你从未触达内容的一半，而每一个都是真实客户亲手打出来的问题。算它的时候要和其他指标用同一个 90 天窗口，并且把原始查询清单留下来而不只是留一个比率：12% 这个数字不会告诉你要修哪 12%，查询清单才会。还要按查询长度分开看，短查询和长查询失败的原因不一样，用同一根杠杆去修，就是比率卡在一半不动的原因。',
          alsoMoves:
            '无结果率给整个搜索面的 CTR 设了上限，因为点击是记在结果上的，一个没有结果的搜索根本不产生点击。它也喂给两个深度信号：撞上零结果的客户要么改写查询（改写率上去），要么放弃去开工单（搜索转工单率上去），这两件事都比搜索本身更贵。修它还会改变同义词工作量，因为零结果日志里出现的查询，正是同义词映射本来就要覆盖的那批。',
          backfire:
            '无结果率会因为「把漏接藏起来而不是回答掉」而翻车。最省事的做法是把每个零结果搜索都路由到一篇通用聚合页——日志里的零结果消失了，客户问的那个问题还答不上，搜索转工单率反而上去。另一个版本是同义词大范围扩写：加到足够远，总能匹配上，于是无结果率下来了，首位命中变成一篇泛泛的综述，CTR 准确度下降、pogo-stick 上升。无结果率要和同一批查询上的 pogo-stick 率一起看：前者降、后者升，说明你把一次「没找到」换成了一次「点开又走」。',
        },
        {
          priority: 2,
          metric: '前 200 个查询的同义词覆盖率 —— 有对应用户语言写法的查询数 ÷ 200',
          fixFirst:
            '同义词覆盖率排第二，因为它把已经知道的漏接变成命中，而且花的是编辑工时而不是工程排期。用户用的词和文章用的词本来就不一样：删除对移除、注册对开户、发票对账单、工作区对团队。每补一个词，就是少丢一个查询，而「前 200 个查询里 90%+ 的重复词被覆盖」这个目标，一个下午就能做到，不是一个季度。注意映射要指向具体那篇文章，而不是指向一个可替换词表——指向类目的同义词映射会命中一篇「接近但不对」的文章。上线之后还要拿发布说明核对一遍：改名前是对的同义词，改名后就是一个会把客户送去废弃文章的陷阱。',
          alsoMoves:
            '同义词覆盖率直接推动 CTR——本来查不到的东西现在出结果了；它也压低改写率，因为第一次就查对的客户没有理由再打一次。它还决定错字容忍能做到什么程度：一个错字被「纠正」成一个没有同义词条目的词，只是把零结果搬了个地方。而同义词映射是语义层最便宜的输入——嵌入模型要学会的那层词义关系，你坐下来就能写下来。',
          backfire:
            '同义词覆盖率会因为映射变得慷慨而翻车。一个词被映射成六个可互换的词以后，凡是包含它的查询都会返回一篇泛泛的页面，点击位置均值升到 5.0 以上，真正对症的文章被挤出首屏——无结果率降了，客户体验却变差，改善的那个指标和客户感觉到的那个指标往相反方向走。另一个失败是放任映射腐烂：产品改名前指向正确文章的同义词，改名后指向一篇废弃页，而因为这个词仍然匹配得到东西，那个查询永远不会出现在你的零结果日志里，你也永远不知道它已经坏了。',
        },
        {
          priority: 3,
          metric: '错字修复率 —— 含错字但仍返回相关结果的查询数 ÷ 抽样错字查询数',
          fixFirst:
            '错字容忍排第三，因为它通常只是一个在搜索引擎里莫名其妙被关掉的配置开关，而它能消掉一类再多内容投入也修不掉的失败。真实查询里有错字、有缩写、有字母换位，在两个词的查询上，一次换位就足以造成零结果。编辑距离 1-2 是标准设置，主流引擎默认就是开的，所以这一行通常一个下午就关掉了，而不是一个季度。量它的时候至少固定抽样 50 条含错字的查询，这样数字才有意义：随手拿当时来的流量算一次，不是你能拿来管理的指标。而且要在同义词映射之后量——把错字纠正成一个库里根本没有文章的词，只是把失败从一边搬到另一边。',
          alsoMoves:
            '错字容忍专门压低短查询这一段的无结果率，而短查询恰恰是查询量最大、关键词引擎最弱的那一段。它也保护了 CTR 不被误读：短查询上 CTR 偏低，很多时候是被记成「相关性差」的拼写问题，修了它就避免了一次浪费在根本没问题的文章上的重写。而且因为它是开关而不是项目，别的指标上的效果第一周就能看到，这是整张表里最便宜的一次实验。',
          backfire:
            '错字容忍在距离放得太宽、而查询又太短时会翻车。编辑距离 2 用在一两个词的查询上，实际效果是对库里很大一部分做模糊匹配，一篇毫不相关的文章会被当作首位命中返回，客户读完点错的页面，CTR 准确度和 pogo-stick 率一起变差，尽管无结果率在改善。另一个失败是在同义词映射之前就打开：引擎默默把错字纠正成一个你没有文章的词，那个查询从零结果日志里消失了——缺口被藏起来了，不是被修好了。',
        },
        {
          priority: 4,
          metric: '排序质量 —— 点击结果所在的平均位置 ÷ 结果页上的点击次数，90 天窗口',
          fixFirst:
            '排序排第四，前提是结果集本身已经是对的。排序是上语义层之前最后一个结构性杠杆，值得好好做，因为一条排对位置的好文章，在每一个本来就能查对的查询上都赢过一条排错位置的好文章。点击位置均值能告诉你问题出在「页面上有什么」还是「顺序不对」：低于 3.0 健康，高于 5.0 意味对症文章被埋了，或者头部结果就是错的。先从流量最大的查询做起，那里一次位置调整影响到的客户最多，并且针对具体查询修，而不是去改整套排序模型。只设 CTR 目标而不设相关性目标，会教会引擎去推「谁被点了」，那是一条更快让客户满意、更慢让工单消失的路。',
          alsoMoves:
            '排序是推动搜索转工单率的那一环——第一次结果就找到答案的客户不会开工单；它也推动 pogo-stick 率，因为正确的首位命中会消掉「点一下再退回」的模式。它还改变语义层的价值：叠在一个排得好的关键词结果集上，语义检索能抬起长尾查询；叠在一个排坏的结果集上，它只是给错的文章加自信。而量出来的平均位置，就是做这个对比最站得住的基线——没别的数字比它更容易吵架。',
          backfire:
            '排序会因为优化点击而不是优化任务完成而翻车。把点击率最高的那篇推到首位，CTR 上去了，搜索转工单率同时下去——因为热门页往往是热门综述，解决不了具体问题，点击被记上了，客户最后还是来开工单。另一个版本是过度拟合某一段：只按短而高频的查询调，CTR 总体数字上去了，而本该由语义层救的长尾查询反而变差。而且改排序时如果无视同义词映射，会把映射辛辛苦苦指向的页面重新排乱，于是刚修好的指标换个症状又回来了。',
        },
        {
          priority: 5,
          metric: '语义层覆盖率 —— 由语义层应答的长尾查询数 ÷ 长尾查询总数',
          fixFirst:
            '语义层放最后，而且只做兜底、不做替换。它是这张表里最贵的一项改动，而指南给出的顺序是对的：语义搜索叠在一个坏掉的同义词映射上，会用看起来合理的答案把缺口盖住，同时把每次搜索的成本抬上去。它应该只跑在关键词引擎没把握的地方——长尾查询、自然语言表述、和文章标题没有任何词面重合的问题——同时保留关键词排序做默认路径，这样本来就工作得好好的短具体查询不会漂。开工之前先把「长尾」这个口径定义下来，否则你没法判断语义层到底是帮了忙，还是只是把以前失败的流量吸收了。要和纯关键词的基线对比，量至少两周。',
          alsoMoves:
            '语义层同时推动长尾 CTR 和改写率，因为一个以前需要被改写成关键词的自然语言问题，现在直接命中了。它也改变同义词映射需要覆盖的范围：语义检索接手自然表述之后，映射可以收缩到那些真正是拼写差异的词，而不用覆盖每一种用户说法，映射的维护成本因此下降。而且语义检索是这张表里唯一能把没人按名字搜到的内容挖出来的机制，它也改变零结果路由该把哪些文章当作热门兜底。',
          backfire:
            '语义层会同时在两个方向上翻车。长查询上它可能检索出一篇看起来合理、其实不对的页面——所以兜底只在置信度低于阈值时才触发，而且底下仍然要显示关键词结果。短具体查询上它会漂：一个词的查询根本没有上下文可嵌入，把语义检索放到默认路径上，恰好会把那些本来工作得好好的查询的 CTR 拉低。而如果在结构性修复落地之前就打开它，无结果率和改写率都会看起来更好，而底层词汇缺口被藏住了，于是同义词那一摊永远不会被做，因为仪表盘不再抱怨了。',
        },
      ],
    },
  },
  readinessChecklist: {
    en: {
      intro:
        'A search box can post excellent numbers and still fail the customer who typed a phrase your article title never used. The eight checks below are built around that gap, and around the sequence in which search problems actually surface: first the queries that returned nothing at all, then the vocabulary gap that produced them, then typo tolerance and result quality, and only then the pogo-sticking queries that mean the right article was shown and rejected. Two habits keep the read honest. Every rate is computed on a closed 90-day window, because the mix of queries moves with the product and a rate measured on half a quarter cannot be compared with one measured on a full quarter. And every rate sits on top of the query list that produced it, because the percentage tells you how bad the condition is while the query list tells you which synonym to add, which article to rewrite and which gap belongs on the content roadmap.',
      items: [
        {
          step: 1,
          label: 'Pull the four search metrics on one 90-day window',
          gate: 'CTR, no-result rate, reformulation rate and search-to-ticket rate all pulled for the same 90-day window, each of the four split into short queries of 1-2 words and long queries of 3 or more words, and the window dates written next to the numbers.',
          blockIf: 'If the four numbers come from four different windows, the pairing that drives every decision in this topic becomes unusable: a no-result rate that fell because traffic grew and a reformulation rate that rose because the window covered a launch week will be read as one story, and the repair will target the wrong layer.',
        },
        {
          step: 2,
          label: 'List the top ten zero-result queries by frequency',
          gate: 'A ranked list of the 10 highest-frequency zero-result queries, each labelled as either a content gap (no article exists) or a synonym gap (an article exists but uses other words), with their share of total zero-result searches written down.',
          blockIf: 'Without the content-gap and synonym-gap label, both fixes look identical from the outside and half the effort goes into mapping synonyms for questions that have no article to map to. Without the frequency ranking you will fix the top of the list by alphabet rather than by how many customers actually asked, and the rare but blocking question stays unanswered.',
        },
        {
          step: 3,
          label: 'Build the synonym map over the top 200 queries',
          gate: 'The map covers the top 200 queries with at least 90% of repeated user-language terms mapped, every entry points to a named article rather than to a category, and the map has been checked against the last product release for renamed or retired terms.',
          blockIf: 'A synonym entry pointing at a category surfaces a close-but-wrong page, which costs more than the zero result it replaced because the customer now believes they found the answer. A map that has not been checked against the last release keeps pointing customers at deprecated articles, and because the term still matches something, the broken queries never surface in your zero-result log.',
        },
        {
          step: 4,
          label: 'Turn on typo tolerance and measure it on a fixed sample',
          gate: 'Edit distance 1-2 confirmed enabled in the search engine configuration with the setting recorded, and the typo-resolved rate measured on a fixed sample of at least 50 typo queries with the sample written down so the next measurement is comparable.',
          blockIf: 'Typo tolerance measured on whatever traffic happened to arrive gives a number you cannot act on, and a configuration that was never written down gets reset the next time the search engine is upgraded. Without the fixed sample you cannot tell an improvement in typo handling from a quarter where simply more short queries arrived.',
        },
        {
          step: 5,
          label: 'Add zero-result routing and capture the queries',
          gate: 'Every zero-result search shows the 3 most popular articles and a contact-support link, and 100% of zero-result queries are captured into the content roadmap with a date and an owner, so the query list from the zero-result step is never lost.',
          blockIf: 'If the fallback pages are not shown, the customer meets a dead end and files a ticket instead of finding the adjacent article, which pushes the search-to-ticket rate up while the no-result rate stays flat. If the queries are not captured, the evidence disappears at the end of the week and the roadmap gets rebuilt from memory each quarter, losing the frequency ranking you just did.',
        },
        {
          step: 6,
          label: 'Layer semantic search on top of keyword ranking',
          gate: 'The semantic layer runs only where keyword search returns fewer than 3 confident results, keyword ranking remains the default path, and the long-tail CTR it touches is measured against the keyword-only baseline over at least 2 weeks with the long-tail definition written down first.',
          blockIf: 'Turning semantic retrieval on as the default path lets it drift on short specific queries, which have no context to embed, and it lowers CTR on exactly the queries that were already working. Without the long-tail definition written before the launch, you cannot tell whether the semantic layer helped or simply absorbed traffic that used to fail, and you will keep paying for it either way.',
        },
        {
          step: 7,
          label: 'Track pogo-sticking per query every week',
          gate: 'Pogo-stick rate tracked weekly for the top 100 queries by volume, and every query above the 40% threshold has either a rewrite task or a synonym mapping with a named owner and a date, so the list does not become a reading exercise.',
          blockIf: 'Without a named owner and a date per flagged query, the pogo-stick list becomes a report that everyone agrees with and nobody acts on, and the same ten queries appear every week for a year. Tracking it monthly instead of weekly turns a behaviour you can still intercept into a behaviour you can only measure after the customer has left.',
        },
        {
          step: 8,
          label: 'Re-benchmark against the table every quarter',
          gate: 'A quarterly re-benchmark scheduled with the 4 baseline numbers from the first step written next to the current quarter values, and the synonym map on a scheduled review tied to product release notes rather than to whoever remembers.',
          blockIf: 'Without the previous quarter written beside the new numbers, you cannot tell a real improvement from a mix change, and the team will either chase a problem that was fixed or relax on a problem that is not. A synonym map reviewed only when someone remembers decays quietly, and the symptom appears months later as zero-result queries with no identifiable cause.',
        },
      ],
    },
    zh: {
      intro:
        '搜索框的数字可以很漂亮，同时仍然在坑那个输入了你文章标题里根本没有的词的用户。下面八项检查围绕的正是那个落差，以及搜索问题真正冒出来的次序：先是那些什么都没返回的查询，再是造成它们的词汇缺口，然后是错字容忍与结果质量，最后才是那些点了又退回去的查询——那说明正确的文章被摆出来了，但用户没接受。两条习惯守住这份读数的可信度。每一项比率都在封闭 90 天窗口上算，因为查询结构会随产品变动，半个季度算出来的比率与整季算出来的比率根本不可比。各条比率背后都留着产生它的那份查询清单，因为百分比只告诉你情况有多糟，而查询清单才告诉你该补哪个同义词、该重写哪篇文章、哪个缺口该进内容路线图。',
      items: [
        {
          step: 1,
          label: '在同一个 90 天窗口上拉齐四个搜索指标，并按长短查询拆开',
          gate: 'CTR、无结果率、改写率、搜索转工单率都在同一个 90 天窗口上取到，每个再按短查询（1-2 词）和长查询（3 词以上）拆开，窗口日期写在数字旁边。',
          blockIf: '四个数字来自四个不同窗口，这个主题赖以决策的配对就没法用了：无结果率下降可能只是流量涨了，改写率上升可能只是窗口里含了发布周，两件事会被读成同一个故事，然后你去修错的那一层。',
        },
        {
          step: 2,
          label: '按频次排出前 10 个零结果查询，并标注缺口类型',
          gate: '频次最高的 10 个零结果查询排成清单，每个标注为内容缺口（根本没有对应文章）还是同义词缺口（有文章但用的是别的词），并写清这 10 个占总零结果搜索的比例。',
          blockIf: '不标内容缺口还是同义词缺口，两种修法从外面看一模一样，一半的力气会被花在给根本没有文章的问题配同义词上。不按频次排，你修的会是字母顺序而不是客户真的问得最多的那个，而那个少问但卡死人的问题一直没被回答。',
        },
        {
          step: 3,
          label: '在前 200 个查询上建好同义词映射，并逐条核对发布记录',
          gate: '映射覆盖前 200 个查询、其中重复出现的用户语言词至少 90% 被映射，每条都指向一篇具名文章而不是一个类目，并且已经拿上一次产品发布核对过改名和下线的词条。',
          blockIf: '指向类目的同义词会命中一篇「接近但不对」的页面，代价比原来的零结果更高，因为客户会以为自己找到答案了。没有拿上一次发布核对过的映射，会继续把客户指向废弃文章；而因为那个词仍然匹配得到东西，坏掉的查询永远不会出现在你的零结果日志里。',
        },
        {
          step: 4,
          label: '打开错字容忍开关，并在固定样本上量出错字修复率',
          gate: '搜索引擎配置里确认已开启编辑距离 1-2 并把设置记录下来，错字修复率在至少 50 条含错字查询的固定样本上量出，样本本身写下来，好让下一次测量可比。',
          blockIf: '拿当时随机来的流量量错字容忍，得到的数字没法据此行动；而没写进文档的配置，会在下次搜索引擎升级时被重置。没有固定样本，你分不清是错字处理真的变好了，还是这个季度碰巧短查询更多。',
        },
        {
          step: 5,
          label: '加上零结果路由展示兜底，并把查询收集进路线图',
          gate: '每个零结果搜索都展示 3 篇热门文章和一个联系客服入口；100% 的零结果查询带着日期和负责人被收集进内容路线图，前面排出的查询清单不会丢。',
          blockIf: '不展示兜底页面，客户撞到死路就会去开工单而不是找到相邻的文章，搜索转工单率上去，而无结果率纹丝不动。不把查询收集下来，证据在一周之后就散了，路线图每个季度只能靠回忆重建，连你刚排好的频次顺序也一起丢掉。',
        },
        {
          step: 6,
          label: '在关键词排序之上叠语义搜索，并且只做兜底不做替换',
          gate: '语义层只在关键词搜索返回少于 3 条可信结果时启用，关键词排序仍是默认路径；它影响到的长尾 CTR 与纯关键词基线对比至少 2 周，且「长尾」的口径在开工前先写下来。',
          blockIf: '把语义检索开成默认路径，它会在短具体查询上漂——一个词的查询根本没有上下文可嵌入——恰好把本来工作得好好的查询的 CTR 拉低。长尾口径不先定义清楚，你没法判断语义层到底是帮了忙，还是把以前失败的流量吸收了，而两种情况你都在付钱。',
        },
        {
          step: 7,
          label: '按查询逐周追踪 pogo-stick，并给超标查询派活',
          gate: '按浏览量前 100 个查询逐周跟踪 pogo-stick 率；超过 40% 阈值的每个查询，要么有改写任务、要么有同义词映射，且都有具名负责人和日期，这份清单才不会变成一份只读材料。',
          blockIf: '每个被标记的查询没有负责人和日期，pogo-stick 清单就变成一份大家都同意、但没人动手的报告，同样那十个查询能连着出现一年。改成按月而不是按周追，你就把一个还能拦下来的行为，变成了只能在客户离开之后才量到的行为。',
        },
        {
          step: 8,
          label: '每季度对照基准表重对，并把上一季度数字写在旁边',
          gate: '季度重对已排进日程，第一步的 4 个基准数写在本季度数值旁边；同义词映射挂在产品发布说明驱动的定期复审上，而不是挂在「谁记得谁做」上。',
          blockIf: '不把上一季度的数字写在新数字旁边，你分不清是真的改善还是结构变化，于是要么去追一个早就修好的问题，要么在一个没修的问题上松劲。只在有人想起来时才复审的同义词映射会悄悄腐烂，症状几个月后才以零结果查询的形式出现，而且找不到原因。',
        },
      ],
    },
  },
};
