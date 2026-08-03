---
slug: 'solopreneur-time-to-value-calculator-zh'
engine_ref: 'solopreneur-time-to-value-calculator'
category_id: 'P'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Intercom — 新手引导基准'
    url: 'https://www.intercom.com/blog/onboarding-benchmarks/'
  - name: 'Buffer — Time-to-Value 框架'
    url: 'https://buffer.com/resources/time-to-value'
  - name: "Lenny's Newsletter — TTV 与新手引导"
    url: 'https://www.lennysnewsletter.com/p/onboarding'
---

## 这个计算器衡量什么

TTV（Time-to-Value，价值实现时间）衡量用户从注册到首次「aha」
——那个与长期留存最相关的行为——之间经过多少天。和激活率
（计算有多少人到达）不同，TTV 度量的是典型用户到达得**多快**。
越短越好：TTV 越快 → 同一激活窗口内能进入激活的用户越多 →
cohort 留存越好。健康带方向是**反向的**：绿 ≤1 天 · 黄 1–3 天
· 橙 3–7 天 · 红 >7 天。

## 计算方法

我们使用的 v3 标准公式：

```
TTV_p50 = 中位数(注册→aha的天数)
TTV_p90 = 90%分位数(注册→aha的天数)
长尾差距 = TTV_p90 − TTV_p50
```

| 变量         | 含义                                                         |
| ------------ | ------------------------------------------------------------ |
| `TTV_p50`    | 注册到 aha 的中位天数——典型用户的体验                       |
| `TTV_p90`    | 90 分位天数——慢的 10% 用户要多久                            |
| `长尾差距`   | `p90 − p50` 之差——被摩擦困住的用户有多少                    |

社区基准下的健康带：绿 ≤1 天（同会话，世界级 PLG）· 黄 ≤3 天
（B2B SaaS 健康）· 橙 ≤7 天（警示——新手引导需重构）· 红 >7
天（严重——多数注册在到达价值前就流失了）。最关键的是 `TTV_p50`，
它反映一半用户的真实体验。

## 局限性 / 何时不适用

TTV 受 aha 时刻定义影响——换 aha 时刻定义，TTV 就动，产品却没
动。对多步骤价值交付的产品（如数据工具，必须积累 2 周数据才
显出价值），按**天数**的 TTV 会低估真实摩擦；改用基于里程碑的
定义。TTV 也不测深度——用户可以快速击中 aha 然后再也不回。
配合黏性（DAU/MAU）和 30 天留存，确认价值时刻真转化为参与。
对低量 cohort（< 100 注册/月），p50 估计很噪——等攒到 500+ 注册
再下判断。

## 案例走读

某自助式 SaaS PM 发现激活率停滞。从 Mixpanel 的 cohort 报告
拉过去 90 天的 TTV：中位数 2.0 天（p50），90 分位 5.0 天（p90）。

1. `TTV_p50` = 2.0 天——**黄带（Good）**。一半注册在 2 天内达到 aha。
2. `TTV_p90` = 5.0 天 · `长尾差距` = 3.0 天——慢尾摩擦相当明显。
3. What-If：在 aha 前砍 1 天（比如把邮箱验证步骤后置），激活率通常能 +8 到 +12 个百分点。
4. Break-Even：下一档 Excellent（≤1 天）要求 p50 中位数 ≤1 天。当前 2.0 天正好压在 Good 阈值；推 ≤1 天意味着改造首次会话，让用户在关浏览器前就体会到 aha。
5. Milestone：先压 p50（影响面最大），再收敛 3 天的长尾差距（多半来自复杂首设或必做的集成）。配合 **Activation Rate Calculator** 跟踪 TTV 变化对激活率的提升，**Stickiness Calculator** 验证 aha 之后的留存。
