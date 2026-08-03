---
engine_ref: 'solopreneur-time-to-productivity-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LinkedIn 人才博客 — 岸上/驻场/上手周期'
    url: 'https://www.linkedin.com/business/talent/blog/talent-acquisition/onshore-onsite-and-ramp-up-time'
  - name: 'HBR — 最初的 90 天（Watkins 2009）'
    url: 'https://hbr.org/2009/04/leading-change-when-business-is-good'
  - name: 'Pave — 2024 薪酬基准'
    url: 'https://www.pave.com/compensation-benchmarks'
---

## 这个计算器衡量什么

达成生产力时间（time to productivity）是新员工入职到首次有「有意义产出」
之间的**调整后**上手周期，以周为单位。它会把管理者给的「基准上手周数」
按**行业复杂度**乘子折弯，再叠一层**岗位级别**的门槛：IC 的判定线是
4/8/16 周，Manager 是 8/16/26 周（Manager 转型需要熟悉 1:1、团队氛围
和跨职能买进，按 HBR 最初 90 天的框架大致是 IC 曲线的 **2 倍**）。
这是你的 People Ops 用来定招聘 ROI 目标、规划 onboarding cohort 容量、
以及避免 IC 升 Manager 时没有足够准备缓冲期的核心计算器。

## 计算方法

```
调整后周数 = 基准上手周数 × 复杂度乘子

复杂度乘子 = 0.75（低） | 1.00（中） | 1.40（高）
```

| 变量              | 含义                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `岗位级别`        | `IC` 或 `Manager`（Manager 的优秀线是 IC 的 2 倍）               |
| `基准上手周数`    | 基准估计（典型 IC 4–12w，Manager 8–26w）                        |
| `行业复杂度`      | `Low`（消费/通用）· `Med`（SaaS）· `High`（受监管、垂直 B2B）   |
| `复杂度乘子`      | 0.75 / 1.00 / 1.40 — 把基准上下折弯                              |
| `调整后周数`      | 最终上手周数，对照岗位级别门槛                                   |

区间表（越短越好）。**IC：** 🟢 Excellent ≤4w · 🟡 Good 4–8w ·
🟠 Warning 8–16w · 🔴 Critical >16w（需重做 onboarding）。
**Manager：** 🟢 Excellent ≤8w · 🟡 Good 8–16w · 🟠 Warning 16–26w ·
🔴 Critical >26w（继任风险，团队脱离风险高）。`调整后周数 = 0` 直接落到
`Critical`（上手数据本身没填就是危险信号——永远别从 0w 开始招聘规划）。

## 局限性 / 何时不适用

复杂度乘子是粗粒度的 3 档分类——它装不下每一种岗位细节（例如合规培训
重的销售岗即使在「中」复杂度也值得给自定义 1.6x）。Cohort 式入职
（同时 5+ 人）通常在本模型上还要再加 20–30%——mentor 注意力被分散，
所以 cohort 场景把 `调整后周数` × 1.25。本计算器默认你的基准估计已经
包含任何正式培训、shadow 或认证时间；**不要**单独再加培训再去叠加，
那会双计。本计算器也不建模上手末端的**产出质量**——6 周上手但只有
P50 质量以下的新人，净贡献仍可能是负的。

## 案例走读

假设给一家受监管的 FinTech 招 2 名资深客户成功经理，`岗位级别 = Manager`，
`基准上手周数 = 12`，`行业复杂度 = High`：

1. `复杂度乘子`（高）= **1.40**
2. `调整后周数` = 12 × 1.40 = **16.8 周** → 🟡 Good 的 Manager 上限是 16w，16.8 刚跨入 🟠 Warning
3. 要到 🟢 Excellent（≤8w）：需要 `基准上手周数` = `8w ÷ 1.40 = 5.7w`，即当前 12w 基准的 0.48 倍。把 12w 基准压到 ~6w 需要缩减 onboarding 范围或把正式培训前移。

如果 `行业复杂度` 降到 `Low`：`调整后周数` = 12 × 0.75 = **9 周** →
🟡 Good（Manager 段）。搭配 **生产力 Ramp 曲线计算器** 可投影 9 周内
累计产出，再搭配 **完全装载成本计算器** 算上手期内的非生产力成本负担。
