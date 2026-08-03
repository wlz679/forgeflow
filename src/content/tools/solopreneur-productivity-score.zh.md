---
slug: 'solopreneur-productivity-score-zh'
engine_ref: 'solopreneur-productivity-score'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'Cal Newport — Deep Work (Rules for Focused Success)'
    url: 'https://calnewport.com/books/deep-work/'
  - name: 'Stack Overflow Developer Survey 2024 — Hours Worked'
    url: 'https://survey.stackoverflow.co/2024/work'
  - name: 'Asana Anatomy of Work Index 2024 — Tool Sprawl'
    url: 'https://asana.com/anatomy-of-work'
---

## 这个计算器衡量什么

独立创业者的生产力不看打卡时长 —— 看的是**深度工作与浅层工作的比例**，
以及**工具栈是放大还是割裂注意力**。本工具把每周深度工作小时数、
工具数量、会议数量汇成单一 0-100 分，再预测三项实操变化（+5 小时
深度工作、会议砍到 2/周、工具砍到 3-5 个）在 30 天窗口的影响。建议
每月跑一次，赶在会议膨胀或工具臃肿固化之前抓到苗头。

## 计算方法

我们使用的 v3 标准公式：

```
baseScore    = 50
deepWorkPts  = 0(<5h) | 5(5-9) | 10(10-19) | 20(20-29) | 25(30+)
toolPts      = 0(0 或 >8) | 8(1-2) | 15(3-5) | 5(6-8)
meetingPts   = 0(>10)     | 0(6-10) | 10(3-5) | 20(≤2)
score        = clamp(10, 100, baseScore + deepWorkPts + toolPts + meetingPts)
productivityTier = A(≥85) | B(70-84) | C(50-69) | D(30-49) | F(<30)
```

| 变量                  | 含义                                        |
| --------------------- | ------------------------------------------- |
| `weeklyDeepWorkHours` | 无干扰专注小时（无 Slack / 邮件 / 手机）    |
| `toolsUsed`           | 工作周内实际打开的不同 App 数               |
| `meetingsPerWeek`     | 日历上的同步会议                            |
| `deepWorkPts`         | Cal Newport 4 小时/日门槛 = 上限 +25        |
| `toolPts`             | 3-5 个工具 = "金发姑娘区" — 15 分           |
| `meetingPts`          | 保护 maker time：≤ 2/周 = +20 分            |
| `productivityTier`    | 综合分数的字母等级                          |

Cal Newport 的研究（《Deep Work》2016）显示每日 4 小时无干扰专注能
产出全职知识工作者的工作量。Stack Overflow 2024 报告显示开发者
中位数记录 6-8 小时，但自评实际深度工作仅 2-3 小时。工具甜区
（3-5 个）出自 Asana Anatomy of Work 2024 —— >6 个工具时上下文切
换成本开始超过自动化节省。

## 局限性 / 何时不适用

分数是**诊断工具，不是标杆** —— 情境决定一切。跑 $1M ARR 服务业务
的「会议密集型创始人」（60/100）可能比 95/100 的「理想独行侠」（做
没人买的产品）更有产出。模型也假设 1 人或极小团队；一旦你有 5+ 直
接下属，会议数合理上升 —— 因为 1:1 与招聘随 headcount 同步。客户
电话和销售 demo 不计入「会议」扣分 —— 真正的靶子是内部 status
会议。

## 案例走读

假设独立创业者：每周 15 小时深度工作、5 个工具、3 个会议：

1. `deepWorkPts` = 10（15 落在 10-19 段）。
2. `toolPts` = 15（5 个是金发姑娘区）。
3. `meetingPts` = 10（3 落在 3-5 段）。
4. `score` = 50 + 10 + 15 + 10 = **85/100** → **A — Elite**。
5. **深度工作占比** = 38%（目标 40%+）。
6. **会议 vs 深度比** = 20%（越低越好）。
7. **30 天预测** —— +5 小时深度工作 → **100/100**；会议砍到 2/周
   → **95/100**；工具砍到 3-5 → 无变化（已最优）。

工具的 Top Lever 会输出「你走在正轨。守住现有系统，下 5 分靠
深化而非扩张。」搭配 **Meeting Cost Calculator** 可把每周省下的 5
小时换算成 $75/hr 产值 ≈ **$18,000/年 释放**。