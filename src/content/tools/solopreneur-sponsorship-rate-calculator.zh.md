---
slug: 'solopreneur-sponsorship-rate-calculator-zh'
engine_ref: 'solopreneur-sponsorship-rate-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'IAB — U.S. Podcast Ad Revenue Report'
    url: 'https://www.iab.com/insights/podcast-ad-revenue/'
  - name: 'Backlinko — Influencer Marketing Cost'
    url: 'https://backlinko.com/influencer-marketing-cost'
  - name: 'Influencer Marketing Hub — Engagement Rate Calculator'
    url: 'https://influencermarketinghub.com/engagement-rate-calculator/'
---

## 这个计算器衡量什么

品牌赞助是创作者签署的合约：在内容里提及、评测或植入某款产品，换取
一笔固定费用。定价用 CPM（cost per mille，即每千次曝光的成本）乘以
你的受众规模、内容类型的溢价，以及这个受众的参与度。这个计算器横跨
播客、newsletter、YouTube、博客四类内容，估算单条价值、月度合约
（4 次/月）和年度收入。它套用行业 CPM 基准（播客 $25、newsletter $40、
YouTube $20、博客 $15），加入「受众规模对成交转化」的乘数，并在
1K、10K、100K 三档受众量级下做收入外推。

## 计算方法

```
CPM            = 按内容类型查表（播客 25 / newsletter 40 / YouTube 20 / 博客 15）
播客价值       = (月度下载 / 1000) × CPM
Newsletter 值  = (邮件订阅 / 1000) × CPM
社媒价值       = (社媒粉丝 / 1000) × CPM × 0.5     （社媒按 50% 权重计）
单条价值       = 播客价值 + Newsletter 值 + 社媒价值
打包价值       = 单条价值 × 4                          （典型 4 次/月）
月度价值       = 打包价值                              （打包 = 标准合约单元）
年度价值       = 月度价值 × 12
参与乘数       = clamp(0.5, 2.0, 总受众 / 50000)       （50K 受众为 1.0 锚点）
调整后报价     = 单条价值 × 参与乘数
```

| 变量            | 含义                                                            |
| --------------- | --------------------------------------------------------------- |
| `月度下载`      | 播客收听或 YouTube 每集观看（每 30 天）                         |
| `邮件订阅`      | newsletter 列表规模（打开率是真正的杠杆，这是底线）             |
| `社媒粉丝`      | Instagram / X / TikTok / LinkedIn 跨平台合计                    |
| `内容类型`      | `podcast` / `newsletter` / `youtube` / `blog` — 决定 CPM 查表   |
| `参与乘数`      | 受众对成交的比例；奖励高密度小受众、惩罚大而散的受众           |

CPM 基准来自 IAB 美国播客广告收入报告、Backlinko 影响者营销成本研究、
Influencer Marketing Hub 报价单。社媒 0.5 权重反映赞助社媒帖的转化率
约为口播或一手机邮件的一半。参与乘数奖励高密度的小而精受众，惩罚
大而散的被动受众 —— 直签赞助的 CPM 比程序化广告高 3-10 倍，因为
受众关系归创作者所有而非平台。

## 局限性 / 何时不适用

这个计算器用的是行业平均 CPM，不是你所在细分赛道的真实成交价。
B2B SaaS、金融科技、营销科技受众可拿 $50-80 CPM，因为客户 LTV 高；
生活类和泛娱乐受众通常只有 $5-15 CPM，因为品牌看到更弱的转化路径。
CPM 也随格式而变：口播广告比程序化前贴片多 2-3 倍，$50K/年细分赛道
的 newsletter 广告比展示广告多 5-10 倍。这个工具用于 pitch 时的
合理性检查，不用于最终谈判。如果是独家品类赞助（例如 6 个月金融
品类独家），品牌通常在 CPM 之上再加 20-40% 溢价，这部分溢价本计算器
没有建模。

## 案例走读

newsletter 运营者，邮件订阅 5,000，配套播客月度下载 10,000，社媒
粉丝 15,000：

1. `CPM` = $40（newsletter 溢价）
2. `播客价值` = (10,000 / 1,000) × $40 = **$400**
3. `Newsletter 值` = (5,000 / 1,000) × $40 = **$200**
4. `社媒价值` = (15,000 / 1,000) × $40 × 0.5 = **$300**
5. `单条价值` = $400 + $200 + $300 = **$900**
6. `月度打包`（4 条/月）= $900 × 4 = **$3,600/月**
7. `年度收入` = $3,600 × 12 = **$43,200/年**

同样参与度下，受众扩到 100K 时计算器外推 $192,000/年（按 $40 CPM
算）—— 这是中腰部 newsletter 收入的上限。4 条打包比单条高出 300% 的
溢价对应 4 倍的曝光量；多数品牌对打包合约给 10-15% 折扣以换取承诺。
搭配 **Time Value Calculator** 看单条收入能否覆盖生产工时，搭配
**Freelance Tax Calculator** 规划每笔赞助发票的预留税款。
