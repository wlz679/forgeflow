---
slug: 'solopreneur-mortgage-calculator-zh'
engine_ref: 'solopreneur-mortgage-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Consumer Financial Protection Bureau — Loan Estimate'
    url: 'https://www.consumerfinance.gov/owning-a-home/loan-estimate/'
  - name: 'Bankrate — Mortgage Calculator'
    url: 'https://www.bankrate.com/mortgages/mortgage-calculator'
  - name: 'Fannie Mae — Loan-to-Value (LTV) Ratios'
    url: 'https://www.knowyouroptions.com/buy/mortgage-options/loan-to-value'
  - name: 'Federal Reserve — Mortgage Interest Rates'
    url: 'https://www.federalreserve.gov/releases/h15/'
---

## 这个计算器衡量什么

本计算器把房价、首付、贷款年限和按揭利率，换算成你每月需还给银行的本息（principal-and-interest, P&I）金额，以及整个贷款周期付的总利息。它同时输出摊销里程碑（每月还款里本金 vs 利息的比例变化）和 LTV 比率——后者决定你是否会触发私人按揭保险（PMI）。看房前用来定预算；出价后用来对比 15 年 vs 30 年的总成本。

## 计算方法

使用美国所有贷款机构生成按揭报价的**标准摊销公式（PMT）**：

```
月供 P&I = P × r / (1 − (1 + r)^−n)

其中：
  P = 本金（房价 − 首付款）
  r = 月利率（年利率 ÷ 12 ÷ 100）
  n = 还款总月数（贷款年限 × 12）
```

以 $400,000 贷款、6.5% 利率、30 年期为例，代入即 `400000 × 0.005417 / (1 − 1.005417^−360) = $2,528/月`。整个贷款期内总利息 = `月供 × 月数 − 本金`，约 `$510,178`。LTV = `本金 ÷ 房价 × 100`；超过 80% 会被强制要求 PMI。

| 变量 | 含义 |
| --- | --- |
| `P`（本金） | 实际向银行借的钱 = 房价 − 首付款。 |
| `r`（月利率） | 年利率 ÷ 12 ÷ 100（如 6.5% → 0.005417）。 |
| `n`（总月数） | 贷款年限 × 12（30 年 → 360 期）。 |
| `LTV`（贷款房价比） | 贷款 ÷ 房价。> 80% 通常触发 PMI。 |

LTV 触发 PMI 这一点是唯一重要的二级信号：每 1% PMI 约等于年还款额增加 0.5–1.5%，该溢价会持续到 LTV 降到约 78% 以下（30 年贷款通常要 5–7 年）。

## 局限性 / 何时不适用

本计算器**只算本金和利息**。不含房产税、房屋保险、HOA 费、洪水险——这些加起来视地区和房价，每月可能再加 $300–$1,500。模型也默认**固定利率贷款**；若你选的是 ARM（5/1、7/1 等可调利率），优惠期结束后月供会重置。ARM、FHA 贷款（带 upfront MIP）、VA 贷款（带 funding fee）或非标准大额贷款，请直接用贷款机构的报价。

## 案例走读

你看到一套 $500,000 的房子，计划付 20% 首付款，剩余部分以 6.5% 分 30 年还清：

1. 本金 `P` = $500,000 − $100,000 = **$400,000**
2. 月利率 `r` = 6.5% ÷ 12 ÷ 100 = **0.005417**
3. 月数 `n` = 30 × 12 = **360**
4. 月供 P&I = `400000 × 0.005417 / (1 − 1.005417^−360)` ≈ **$2,528**
5. 30 年总利息 = `$2,528 × 360 − $400,000` ≈ **$510,178**
6. LTV = $400,000 / $500,000 = **80%**——刚好临界，不触发 PMI

同样贷款改成 15 年，月供跳到约 $3,484，但总利息仅约 $227,000，整笔贷款省下 $283,000。搭配 **Rent-vs-Buy Calculator** 判断在你预设的居住年限内买房是否真的比租房便宜；如果你打算出租，则搭配 **DSCR Calculator** 看贷款资质。
