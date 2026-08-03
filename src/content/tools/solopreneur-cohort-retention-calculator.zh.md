---
slug: 'solopreneur-cohort-retention-calculator-zh'
engine_ref: 'solopreneur-cohort-retention-calculator'
category_id: 'M'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ProfitWell — 同期群分析'
    url: 'https://www.profitwell.com/blog/cohort-analysis'
  - name: 'Amplitude — 同期群分析指南'
    url: 'https://amplitude.com/blog/cohort-analysis'
  - name: 'Help Scout — 客户留存率'
    url: 'https://www.helpscout.com/blog/customer-retention-rate'
  - name: 'Mixpanel — 同期群分析'
    url: 'https://mixpanel.com/blog/cohort-analysis/'
---

## 这个计算器衡量什么

Cohort Retention（同期群留存）计算器取经典的 5 点月度留存曲线
（M1 / M2 / M3 / M6 / M12），预测出 12 个月累计的 LTV/人。它会定位
**最大流失月**（流失最陡的点）和 M6 健康分带（投资人看同期群时第一
眼就看的指标）。与获客成本数据配对，还能算出 CAC 回本月数。在需要预
测订阅基础收入、建模 SaaS 调价、或论证"投留存还是投拉新"时使用。

## 计算方法

输入：`cohortSize`（同期群规模）+ M1/M2/M3/M6/M12 各月留存率（%）+
每月人均收入。

```
留存(t)  = 在两个已知月份间做线性插值
        = R(m_lower) + (R(m_higher) - R(m_lower)) × (t - m_lower)
                                                   / (m_higher - m_lower)
累计 LTV = Σ (留存(m) × 人均月收入)，m = 1..12
M6 健康带 = 🟢 ≥ 90% · 🟡 70–90% · 🟠 50–70% · 🔴 < 50%
CAC 回本(月) ≈ CAC / (留存(M1) × 人均月收入)
```

| 变量          | 含义                                                              |
| ------------- | ----------------------------------------------------------------- |
| `同期群规模`  | 在该统计周期内新增的客户数（如 1,000）                            |
| `M1..M12`     | 该同期群在第 1/2/3/6/12 月时仍活跃的百分比                        |
| `人均月收入`  | **活跃**用户的人均月收入（不是初始同期群人均）                  |

第 4、5、7、8、9、10、11 月在相邻两个已知月份间做线性插值填充。引擎
会输出**最大流失月**——即相邻已知月份之间绝对变化最大的那一个。

## 局限性 / 何时不适用

在已知月份间做线性插值是有意为之的简化。如果你的真实留存曲线有
已知的"微笑"形态（第 6 个月因再营销邮件出现小幅回升），插值出来的
M4–M5 会低估留存。本计算器也是单同期群——如果你的多个定价档有差异
很大的留存形态，做平均会平滑掉档位信号。多同期群分析请导出到
Amplitude / Mixpanel 或 Looker 的同期群视图。

## 案例走读

假设某 B2B SaaS 在 1 月新增 1,000 注册。留存曲线：M1 80%，M2 60%，
M3 45%，M6 30%，M12 20%。ARPU = 30 元/月。

1. `留存(1)` = 80%，`(2)` = 60%，`(3)` = 45%
2. 插值：M4 ≈ 40%，M5 ≈ 35%，M6 = 30%，M7–M11 ≈ 25%，M12 = 20%
3. `累计 LTV` = 30 × (0.80 + 0.60 + 0.45 + 0.40 + 0.35 + 0.30 + 0.28
   + 0.26 + 0.24 + 0.22 + 0.21 + 0.20) ≈ 30 × 4.31 = **129.30 元**
4. **最大流失月** = M1 → M2（80% → 60% = −20 pp）
5. **M6 健康带** = 30% → 🔴 危险（要跨进 🟢 需跳 60 pp）

Dashboard 的 What-If 会建模："如果 M3 留存从 45% 提到 60%（+15 pp），
12 个月累计 LTV 上升约 45 元/人——按 1,000 人同期群算，多出 45,000 元
收入，而且**不用多花一分钱获客**。" 验证这部分增量是真正的留存
（而非扩展收入）时，请搭配 **NRR / GRR** 工具。
