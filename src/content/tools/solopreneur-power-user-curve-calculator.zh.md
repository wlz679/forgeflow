---
slug: 'solopreneur-power-user-curve-calculator-zh'
engine_ref: 'solopreneur-power-user-curve-calculator'
category_id: 'P'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Andrew Chen — 冷启动问题'
    url: 'https://andrewchen.co/the-cold-start-problem/'
  - name: "Lenny's Newsletter — Power Users"
    url: 'https://www.lennysnewsletter.com/p/power-users'
  - name: 'a16z — Power User Curve'
    url: 'https://a16z.com/power-user-curve/'
---

## 这个计算器衡量什么

Power-user 帕累托曲线衡量使用集中度——头部 X% 用户驱动了多少
比例的总使用量。经典形态是 70/20（头部 20% 用户贡献 70% 使用量），
帕累托比是 3.5x。比值更高（80/15 = 5.3x，90/10 = 9x）说明
集中度更强，你可借此做 VIP 项目、内测招募、推荐种子。集中度过
低（不到 50/20）说明没有涌现出真正的 power user 群体。

## 计算方法

我们使用的 v3 标准公式：

```
帕累托比 = 头部使用占比 / 头部用户占比
```

| 变量           | 含义                                                          |
| -------------- | ------------------------------------------------------------- |
| `头部用户占比` | 按活跃度排序后的头部用户占比（通常 20% / 10% / 5%）           |
| `头部使用占比` | 这部分头部用户贡献的总使用量占比（事件、会话、时长）          |
| `帕累托比`     | `头部使用占比 ÷ 头部用户占比 × 100`（如 70/20 = 3.50x）       |

社区基准下的健康带：绿 ≥3.5x（强集中，经典 70/20 或更好）·
黄 ≥3.0x（健康帕累托）· 橙 ≥2.5x（使用分散）· 红 <2.5x（无明显
power user 群体——要排查）。解读有时相反——集中度高是**好事**，
因为 power user 是推荐的种子、最可靠的留存 cohort、产品反馈的
最优来源。

## 局限性 / 何时不适用

集中度对选择的活跃指标非常敏感——事件数、会话数、使用分钟数
三个指标给出的比值完全不同。挑与留存相关性最高的那个，跨报告
周期保持口径一致。B2B 产品按席位定价时，按**账号维度**而非用户
维度排序，避免把一个超大账号当作用户深度使用。Power user 计划
**不一定总是正解**——对每个用户都同等重要的横向产品（即时通讯、
搜索），人为拉高集中度反而可能说明多数人体验糟糕。低于 2.5x 的
比值往往先是埋点问题（混了匿名和识别用户、机器人重复计数），
再是产品现象。

## 案例走读

某 B2B SaaS 拉过去 90 天所有分析事件，按总事件数给用户排序，
找出头部 20% 活跃用户。这 20% 用户贡献了 70% 事件。

1. `帕累托比` = 70 / 20 = **3.50x**——**绿带（Excellent）**，经典 power-user 集中度。
2. `头部使用占比` = 70% · 其余 80% 用户贡献 30% 使用量。
3. What-If：把 10% 中段用户升级到 power 用户（游戏化、徽章、「试用高级功能」提示），头部占比可拉到约 73%，比值 3.65x。
4. Break-Even：3.0x 的 Good 阈值（60/20）已超出 10 个百分点。下一里程碑是冲到 4.0x（80/20）——通常靠 power-user-only 功能（高级自动化、API 权限）。
5. Milestone：上线 power-user 计划（VIP 群组、抢先体验功能、专属 CSM 联系人）——社区数据显示这能在 1 个季度内把现有集中度再放大 +5 到 +15 个百分点的使用占比。配合 **NRR Calculator**（R 类）测算高粘 power-user 群带来的收入影响，**Feature Adoption Calculator** 看 power user 是否带动新功能渗透。
