---
engine_ref: 'solopreneur-safe-convertible-note-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Y Combinator — Post-Money SAFE Standard'
    url: 'https://www.ycombinator.com/documents'
  - name: 'Y Combinator Library — SAFE Mechanics'
    url: 'https://www.ycombinator.com/library'
  - name: 'Fenwick & West — SAFE vs Convertible Note'
    url: 'https://www.fnv.com/blog/safe-vs-convertible-note'
---

## 这个计算器衡量什么

SAFE（Simple Agreement for Future Equity，未来股权简单协议）是 Y Combinator 推出的早期创业融资标准化合同 —— 签署时无固定股价，在未来定价融资时转换为股权。本计算器建模 **转换机制**：估值上限（valuation cap）与折扣率如何相互作用、SAFE 投资人转换时拿到多少持股比例、现有股东被稀释多少。覆盖 YC 的 post-money SAFE（2018 起的现行标准）、带折扣的 pre-money SAFE、以及纯折扣结构。签 SAFE 之前用它来建模不同未来轮次估值下的稀释结果。

## 计算方法

转换价格算法：

```
有效 pre-money = post-money 上限 − 投资额
cap 价       = 有效 pre-money ÷ 现有股数
折扣价       = （下一轮估值 ÷ 现有股数） × （1 − 折扣率 ÷ 100）
转换价       = min（cap 价，折扣价） ← 取较低者
SAFE 股数    = 投资额 ÷ 转换价
SAFE 持股    = SAFE 股数 ÷（现有股数 + SAFE 股数）
```

| 变量           | 含义                                          |
| -------------- | --------------------------------------------- |
| `投资额`       | SAFE 投资人出资金额                            |
| `Post-money 上限`| 投后估值上限（如 $500 万）                   |
| `折扣率`       | 相对下一轮价格的折扣（YC 标准 0%）            |
| `现有股数`     | 完全摊薄股数（创始人 + 早期投资人 + 期权）    |
| `下一轮估值`   | 转换轮次的预期估值                            |

「cap 或折扣，取较低者」规则是 SAFE 持有人的保护：他们拿更好的那一边。对 YC post-money SAFE（0% 折扣），cap 永远主导 → SAFE 持有人转换时 % 在 `投资额 ÷ post-money 上限` 处固定。

## 局限性 / 何时不适用

本计算器建模在 **一次定价轮次上的单次 SAFE 转换事件**。它不建模：（1）带 MFN（最惠国）条款的堆叠 SAFE —— 后续 SAFE 可升级早期 SAFE 的条款；（2）利息累积（SAFE 不计息，但可转债计息）；（3）到期触发（通常 10 年 —— 实际很少达到）；（4）SAFE 持有人在后续轮次的 pro-rata 权利；（5）定价轮次后续期权池扩张的影响（稀释所有人包括 SAFE 持有人）。要建模定价轮次 + 多笔堆叠 SAFE + 新投资人 + 期权池刷新同时发生的场景，用完整 cap table 模拟器（Carta、Capshare）。5 行对比展示 $100 万-$2,000 万上限的敏感性 —— 区间外的上限，稀释数学显著变化。

## 案例走读

假设一家初创公司：$50 万 SAFE、$500 万 post-money 上限、0% 折扣（YC 标准）、100 万现有完全摊薄股。

1. **Cap 价** = （$500 万 − $50 万）÷ 100 万 = **$4.50 / 股**
2. **转换价** = $4.50（cap 主导，无折扣）= **$4.50 / 股**
3. **SAFE 发行股数** = $50 万 ÷ $4.50 = **111,111 股**
4. **SAFE 转换时持股** = 111,111 ÷ 1,111,111 = **10.0%**
5. **现有池稀释** = −10.0%（从 100% 到 90.0%）

What-If 场景：如果上限是 $300 万（更低 → 更多稀释），SAFE 持有人得 **16.7%**。如果有 20% 折扣，转换价为 $4.00/股，SAFE 得 **11.1%**。如果融 $100 万而非 $50 万在同一上限下，SAFE 得 **20%** —— 稀释翻倍。这就是为什么 **cap** 是 SAFE 条款里最大单一杠杆；折扣率对 post-money SAFE 不太重要。