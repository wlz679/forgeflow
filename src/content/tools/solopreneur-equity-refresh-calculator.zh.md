---
slug: 'solopreneur-equity-refresh-calculator-zh'
engine_ref: 'solopreneur-equity-refresh-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Pave — 2024 薪酬基准（含股权刷新）'
    url: 'https://www.pave.com/compensation-benchmarks'
  - name: 'Carta — 2024 股权基准'
    url: 'https://carta.com/data/equity-benchmarks/'
  - name: 'Y Combinator — 人事运营手册'
    url: 'https://www.ycombinator.com/library/4A-handbook-for-people-operations'
---

## 这个计算器衡量什么

股权刷新（equity refresh）是发给已有员工的**新**一轮股权，常见于
vesting 周年（第 2–4 年），目的是抵消持续 vesting 带来的稀释、认可
持续贡献、并产生新的留任激励——刷新 grant **补充**而非替代原 grant。
本计算器根据公司的 refresh pool 大小、员工当前持股、自原 grant 起的
年限、以及岗位关键度，推荐出 grant 股数和 fully-diluted 占比。YC
People Ops playbook 和 Pave 2024 数据把岗位目标比例锚定在 High / Med
/ Low 的 15% / 8% / 3% 切分，以及 0.5–2.0% fully-diluted 的 refresh
pool 规模基线。

## 计算方法

```
poolSize      = 公司总股数 × 刷新池比例 / 100
roleTargetPct = 0.15（高） | 0.08（中） | 0.03（低）
yearsFactor   = 1.0                       如果 距原 grant 年数 ≥ 4
              = 1.0 + (4 − 年数) / 4     如果 距原 grant 年数 < 4

刷新股数      = round(poolSize × roleTargetPct × yearsFactor)
稀释百分比    = 刷新股数 / 公司总股数 × 100
```

| 变量              | 含义                                                            |
| ----------------- | --------------------------------------------------------------- |
| `当前持股`        | 员工现有股数（仅做上下文显示，不进入数学）                      |
| `距原 grant 年数` | 距原 grant 的年数（刷新通常在第 2–4 年）                        |
| `刷新池比例`      | 刷新池占 fully-diluted 比例（典型 0.5–2.0%）                    |
| `公司总股数`      | fully-diluted 股数（含全部期权、RSU、convert）                  |
| `岗位关键度`      | `High`（池子的 15%）/ `Med`（8%）/ `Low`（3%）                  |
| `年数因子`        | grant <4 年时 +0.25/年加成，上限 1.0                            |

区间（稀释越高，留任信号越强越好）：🟢 Excellent ≥0.20% — 顶四分位
刷新 · 🟡 Good 0.10–0.20% — 扎实，对标市场 · 🟠 Warning 0.05–0.10% —
低于市场，员工可能看不到对比原 grant 的有意义增量 · 🔴 Critical
<0.05% — 形同虚设，留任风险，员工大概率已在看新机会。
`公司总股数 = 0` 时返回 0% 稀释（除零保护）。

## 局限性 / 何时不适用

本工具只算 **grant 大小**——vesting schedule（典型 4 年 1 年 cliff，
与原 grant 一致；少数公司对高级岗位挂 OKR 兑现）是另一项独立决策。
业绩 vesting 的刷新（刷新挂在晋升周期或业务里程碑上）需要内嵌达成
概率的不同模型。`role_criticality` 是 3 档主观切分——一个不在营收
关键路径的 Staff Engineer 可能更适配 `Med` 而非 `High`。刷新的累计
稀释会复利：100 名员工 × 0.15%/年 ≈ 5 年 15% 稀释——这就是为什么
**refresh pool**（输入）是预算杠杆，而不是单人目标。

## 案例走读

假设中端 B2B SaaS 一位资深工程经理，第 3 年（已到刷新窗口）：
`当前持股 = 10,000`，`距原 grant 年数 = 3`，`刷新池比例 = 1.5`，
`公司总股数 = 10,000,000`，`岗位关键度 = Med`：

1. `poolSize` = 10,000,000 × 1.5 / 100 = **150,000 股**
2. `roleTargetPct`（Med）= **0.08**（池子的 8%）
3. `年数因子` = 1.0 + (4 − 3) / 4 = **1.25**（新 grant 加成）
4. `刷新股数` = round(150,000 × 0.08 × 1.25) = **15,000 股**
5. `稀释百分比` = 15,000 / 10,000,000 × 100 = **0.15%** → 🟡 Good

如果把 `岗位关键度` 从 Med 升到 High：
`刷新股数` = round(150,000 × 0.15 × 1.25) = **28,125 股** →
**0.28% 稀释** → 🟢 Excellent。差出来的 13,125 股就是「要不要投资
留任」的选择题——0.28% 让员工的薪酬包仍有真实上行空间；0.15% 虽
有竞争力但不出挑。搭配 **薪酬带计算器** 量 **现金** 的搭配，
搭配 **离职成本计算器** 算清失去这个员工的代价。
