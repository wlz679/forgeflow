---
slug: 'solopreneur-stickiness-calculator-zh'
engine_ref: 'solopreneur-stickiness-calculator'
category_id: 'P'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Mixpanel — 2024 产品基准报告'
    url: 'https://mixpanel.com/blog/2024-product-benchmarks/'
  - name: "Lenny's Newsletter — DAU/MAU 黏性"
    url: 'https://www.lennysnewsletter.com/p/dau-mau-stickiness'
  - name: 'Amplitude — 如何计算黏性'
    url: 'https://amplitude.com/blog/calculate-stickiness'
---

## 这个计算器衡量什么

黏性（DAU/MAU）衡量月活用户中有多少在某一天回来用——回答 PM
的疑问「这是用户习惯性打开的产品，还是只有想起时才打开？」
它是流失的领先指标：如果 MAU 用户不再每日回访，2–4 周后月留存
就会掉。该比例也反映产品-市场契合的深度：社交 App（Slack、
Discord）能维持 20%+；高黏性 B2B SaaS 在 13–20%；中位数 SaaS
约 5%。

## 计算方法

我们使用的 v3 标准公式：

```
黏性 = DAU / MAU
每周天数 = 黏性 × 7
```

| 变量       | 含义                                                            |
| ---------- | --------------------------------------------------------------- |
| `DAU`      | 今日去重活跃用户（或 7 天滚动平均，更稳定）                    |
| `MAU`      | 过去 30 天去重活跃用户                                          |
| `每周天数` | 每个 MAU 用户平均每周使用产品天数（黏性 × 7）                   |

社区基准下的健康带：绿 ≥20%（社交级，世界一流）· 黄 13–20%
（高黏性 SaaS）· 橙 5–13%（SaaS 中位数，流失风险信号）· 红 <5%
（极低黏性）。乘以 7 后，13% 的黏性 ≈ 每周 0.9 天——典型用户一周
才打开一次，而不是每天。

## 局限性 / 何时不适用

DAU/MAU 对「活跃」**怎么定义**很敏感——会话、页面浏览、关键
动作，定义不同比例就动，产品却没动。对 B2B 多席位产品，要先
决定 DAU 是按用户算还是按「有任何活动的账号」算（两种定义差别
很大）。DAU 也在动：周一拉和周日拉数据不同；做稳定对比请用
7 天滚动平均。低于 5% 不一定就是差产品——有些成功的 B2B SaaS
（项目管理、会计）天然就是周频而非日频，这时 WAU/MAU 或会话
质量指标更合适。

## 案例走读

某 B2B SaaS 数据平台拉今日 DAU：650 个去重用户。过去 30 天
MAU 是 5,000 去重用户。

1. `黏性` = 650 / 5,000 = **13.0%**（黄带——正好踩到 Good 阈值）。
2. `每周天数` = 0.13 × 7 ≈ **0.9 天/周**——典型用户大约每周打开一次，而不是每天。
3. What-If：上线一份每日数据摘要邮件，召回 5% 非日活的 MAU（约多 217 个 DAU），黏性可升至 17.3%（约每周 1.2 天），稳稳站到 Good 带中段。
4. Break-Even：13% 正好压线；冲 Excellent（20%）需要 5,000 MAU 中有 1,000 个 DAU。
5. Milestone：黏性很少不靠新手引导改善或核心循环加密就动起来。配合 **GRR Calculator**（R 类）确认黏性与留存的真实关系，**Time-to-Value Calculator**（P 类）加速首次会话到首次价值的转化。
