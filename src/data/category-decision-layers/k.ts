// P165 —— 分类 K（Knowledge / 知识库）的决策层。
//
// 形态与分类 B（AI Cost Tools）完全一致 —— 见 src/data/category-decision-layers/index.ts 的设计说明。
import type { CategoryDecisionLayer } from './types';

export const K: CategoryDecisionLayer = {
  chainIntro: {
    en: 'A knowledge base fails in four different ways, and each one needs its own instrument: the content is missing, the content cannot be found, the content no longer holds up, or the content is there but nobody was really helped. Work down the chain in that order.',
    zh: '知识库有四种不同的坏法：内容缺失、内容搜不到、内容已经站不住、内容在却没人真被帮上。按这个顺序往下查，每种坏法配一把不同的尺子。',
  },
  chain: [
    {
      slugs: ['solopreneur-kb-coverage-rate-calculator'],
      purpose: {
        en: 'Start by finding the holes: how many incoming tickets have no article behind them, and which topics hold most of those tickets. That topic list is the work order for everything downstream — write, refresh or re-route, but the list has to come first.',
        zh: '先找洞：进来的工单里有多少背后没有对应文章，缺口又集中在哪几个主题。这份主题清单就是后面所有动作的工单 —— 补写、复核还是改路由，都得先有这份清单。',
      },
    },
    {
      slugs: ['solopreneur-search-effectiveness-calculator'],
      purpose: {
        en: 'Coverage is not findability. Next ask whether people who search actually land on something, and which queries come back empty — those empty queries often name the same topics your coverage list just flagged. When the article exists but nobody reaches it, the fix is titles, synonyms and ranking, not more writing.',
        zh: '有内容和找得到是两回事。接着问：搜了的人是不是真落到东西上，哪些词搜出来是空的 —— 这些空词常常正好点中第一步标出的那几个主题。文章已经写好却没人搜到，要修的是标题、同义词和排序，不是继续写新文章。',
      },
    },
    {
      slugs: [
        'solopreneur-article-freshness-calculator',
        'solopreneur-article-helpfulness-calculator',
      ],
      purpose: {
        en: 'Now judge the articles that survived those first two steps on their own terms: are they still accurate for a reader who lands today, and do the people who reach them find them useful? Pick the one your evidence points at — an old page on a policy topic is a trust problem, an article with nothing but negative votes is a rewrite problem.',
        zh: '接下来用文章自身的标准，量一量熬过前两步的那些内容：对今天点进来的读者还准不准，读者看完觉不觉得真有用。按证据指向的那一头选一支 —— 政策类页面过期是信任问题，投票一路走低的文章是重写问题。',
      },
    },
    {
      slugs: [
        'solopreneur-deflection-quality-calculator',
        'solopreneur-documentation-roi-calculator',
      ],
      purpose: {
        en: 'Finally price the whole thing, but price it honestly. Measure first what self-service deflection does to reopen rate and satisfaction, then set saved support cost against the cost of writing the articles: a saving that comes back as a reopened ticket is not a saving, and the money view without the quality view is how knowledge programmes talk themselves into a budget they never earned.',
        zh: '最后给整套东西定价，但要诚实地定。先量自助分流对重开率和满意度做了什么，再把省下的支持成本和写文章的投入摆在一起比 —— 省下来的钱以重开工单的形式回来，就不是省；只算钱不算质量，知识项目就会把自己说服成该拿一笔它没挣来的预算。',
      },
    },
  ],
  choices: [
    {
      slug: 'solopreneur-kb-coverage-rate-calculator',
      answers: {
        en: 'Which tickets have no article behind them, and which topics hold most of the gaps?',
        zh: '哪些工单背后没有文章，缺口最集中的主题是哪几个？',
      },
      useWhen: {
        en: 'Use it first, to turn "what should we write next" into a list instead of a hunch. Do not treat it as a quality score — a ticket can match a badly outdated article and still count as covered here, so check freshness and helpfulness before you call the library healthy.',
        zh: '先用它，把「接下来该写什么」从感觉变成一张清单。别把它当质量分 —— 一张过期的老文章也可能把工单对上，所以在宣布知识库健康之前，要把时效性和有用性一起看。',
      },
    },
    {
      slug: 'solopreneur-article-freshness-calculator',
      answers: {
        en: 'Which articles have gone past their refresh date, and how old is the library at its median?',
        zh: '哪些文章已经过了该复核的时候？这批文章的中位年龄有多大？',
      },
      useWhen: {
        en: 'Use it when your content is old enough that accuracy is the worry — policy, pricing, security and compliance pages age quietly and keep misleading people. Do not use its age ranking alone to order your writing queue; read volume and business criticality decide what gets rewritten first, not age on its own.',
        zh: '内容旧到让你担心准确性时用它 —— 政策、定价、安全和合规页面会悄悄过期，然后持续误导人。别只靠它排写作队列；先重写哪一篇，要看访问量和业务关键度，而不是单看年龄。',
      },
    },
    {
      slug: 'solopreneur-search-effectiveness-calculator',
      answers: {
        en: 'When people search, do they land on something — and which queries return nothing at all?',
        zh: '用户搜索时到底落没落到东西上？哪些词搜出来什么都没有？',
      },
      useWhen: {
        en: 'Use it when you suspect the library is fine but unreachable: good articles, a low hit rate, or a search box that shares no vocabulary with the people using it. Do not use it to judge article quality — an empty result tells you about retrieval and naming, and says nothing about whether the page that did come up was any good.',
        zh: '怀疑库里有内容却没人够得着时用它 —— 文章不少、命中率却低，或者搜索框跟用的人根本不是一个词库。别拿它判断文章质量：零结果说明的是检索和命名问题，搜出来的那一页好不好，它答不了。',
      },
    },
    {
      slug: 'solopreneur-deflection-quality-calculator',
      answers: {
        en: 'Does self-service actually solve the problem, or does it only postpone the ticket?',
        zh: '自助分流是真的把问题解决了，还是只是把工单往后拖？',
      },
      useWhen: {
        en: 'Use it as the guardrail on any push to deflect more — check it before you celebrate a higher deflection figure. Do not use it to size support headcount: it measures the quality of what you deflected, not the volume your team still has to absorb.',
        zh: '任何「多分流一点」的动作，都拿它当护栏 —— 在庆祝分流数字变好之前先看它。别拿它算支持团队要几个人：它量的是被分流出去那部分的质量，不是你团队还得扛多少量。',
      },
    },
    {
      slug: 'solopreneur-documentation-roi-calculator',
      answers: {
        en: 'Does the money spent on content come back, and how many articles does it take to break even?',
        zh: '花在内容上的钱回得回来吗？做到盈亏平衡要写多少篇文章？',
      },
      useWhen: {
        en: 'Use it when you are asking for a content budget, or deciding whether to keep funding a topic nobody reads but that quietly answers tickets. Do not use it as the whole argument for writing: return can look healthy because a few articles absorb many tickets while the long tail goes unmaintained.',
        zh: '要申请内容预算、或者决定要不要继续投一个「没人看但确实在挡工单」的主题时用它。别把它当成写作的全部理由：回报可能看起来很健康，只是因为少数几篇文章挡下了大量工单，而长尾悄悄没人维护。',
      },
    },
    {
      slug: 'solopreneur-article-helpfulness-calculator',
      answers: {
        en: 'Do the articles people actually read get marked as useful?',
        zh: '真正被人读到的那些文章，用户会标它有用吗？',
      },
      useWhen: {
        en: 'Use it when you already have vote data and want to know which existing articles to rewrite first — it is the cheapest signal available, because it comes from the readers themselves. Do not use it when few people vote; a low vote rate says more about the widget than about the article.',
        zh: '手里已经有投票数据、想知道现有文章先重写哪几篇时用它 —— 这是你能拿到的最便宜的信号，因为它来自读者本人。投票率低的时候别用它：那时候说明的是投票组件的问题，不是文章的问题。',
      },
    },
  ],
};
