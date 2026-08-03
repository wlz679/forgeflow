---
engine_ref: 'solopreneur-productivity-ramp-curve-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Bersin by Deloitte — 招聘研究'
    url: 'https://www.bersin.com/research/talent-acquisition/'
  - name: 'Andrew Chen — 冷启动问题'
    url: 'https://andrewchen.co/the-cold-start-problem/'
  - name: 'Reforge — 增长环路与生产力曲线'
    url: 'https://www.reforge.com/blog/growth-loops'
---

## 这个计算器衡量什么

生产力 ramp 曲线（productivity ramp curve）建模**生产力随时间的成长
轨迹**——不只是「第一次产出在何时」。引擎会在三种典型形态中挑一种
拟合（`SlowStart` 适合 Sales 训练营或合规认证这类培训密集的岗位，
`Linear` 是最简单的基线，`S-Curve` 适合工程或 PM 这类知识工作——
前几周学得慢但中期会加速）。它返回的核心指标是 **P50 月**——生产力
首次达到 100% 满产 50% 的那个月——以 `months_to_full` 的百分比表示。
P50% 越低，曲线越陡，onboarding 信号越好。这条曲线与达成生产力时间
工具（P11-2）互为搭档：那个工具测**何时**；这个工具测**中间过程长
什么样**。

## 计算方法

```
生产力(t) = 起始百分比 + (100 − 起始百分比) × 形态(t)

形态(t):
  Linear:      t / months_to_full
  SlowStart:   (t / months_to_full)²
  S-Curve:     1 / (1 + e^(−k(t − t0))),  k = 12 / months_to_full, t0 = months_to_full / 2
```

| 变量            | 含义                                                          |
| --------------- | ------------------------------------------------------------- |
| `months_to_full`| 达到 100% 生产力所需月数（典型 3–9 月）                       |
| `起始百分比`    | 第 0 月的生产力（外招 0，内部转岗 20–40%）                    |
| `曲线形态`      | `SlowStart`、`Linear`、`S-Curve`                             |
| `每月成本`      | 完全装载月成本（年度完全装载 ÷ 12）                           |
| `P50 月`        | 生产力首次达 50% 的月份，用 0.1 月步长扫描得到                |

P50% 区间（越低越陡越好）：🟢 ≤30% — excellent，P50 在 30% 时长以内到
达 · 🟡 30–50% — healthy，典型 S-Curve 范围 · 🟠 50–70% — slow，
onboarding 大概率需要补 scope 或 buddy · 🔴 >70% — very slow，光走到
满产的一半就要花掉 70% 以上的 `months_to_full`。所有输入被截断非负；
`months_to_full = 0` 直接落到区间上限。

## 局限性 / 何时不适用

这是**单人模型**。它不捕捉 cohort 入职带来的放缓（5+ 人同时入职
通常让 P50% 后移 20pp，因为 mentor 注意力被分摊）。它也不建模**产出
质量**——一个「满产」的人如果只输出 P50 质量的活，仍然是留任风险。
应该用组织内的真实数据（HRIS 绩效评分、部署效率、OKR 完成率）去
**拟合**参数；默认参数只是合理起点，不是法律。本计算器输出的是曲线，
不是 ramp 总成本。要拿到 ramp 期间的美元负担，请搭配 **完全装载
成本计算器** 积分 `monthly_cost × (1 − productivity(t)/100)` over the
ramp period。

## 案例走读

假设招一名资深后端工程师，`months_to_full = 6`，`起始百分比 = 0`，
`曲线形态 = S-Curve`，`每月成本 = $14,833`：

1. `S-Curve` 参数：`k = 12/6 = 2.0`，`t0 = 6/2 = 3`
2. 逐月扫描：`生产力(3.0) ≈ 50%`（logistic 拐点）
3. `P50 月 = 3.0`，`P50% = 3.0 / 6 = 50.0%` → 🟡 Good（30–50% 区间）
4. 同 `months_to_full = 6` 下对比形态：Linear 同样在第 3 月撞到 P50；
   SlowStart 在第 4.3 月才到 P50（更慢——二次曲线把增量堆到后期）
5. 成本投影：第 3 月时员工约 50% 产出，整 6 个月 ramp 的累计非产出
   负担约 `$14,833 × 6 × (1 − ~0.45 平均产出) = ~$48,949`

要撞上 🟢 Excellent（P50 ≤ `months_to_full` 的 30%）：用更短的
`months_to_full`（3–4 月是 IC 工程师配合一周预训 bootcamp 可达到的）；
或者给曲线预热一个非零 `起始百分比`（内部转岗从 30% 起步）。
