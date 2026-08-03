---
engine_ref: 'solopreneur-cap-rate-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'BiggerPockets — Cap Rate Explained'
    url: 'https://www.biggerpockets.com/blog/cap-rate-explained/'
  - name: 'Bankrate — Cap Rate Calculator'
    url: 'https://www.bankrate.com/real-estate/cap-rate/'
  - name: 'CBRE — U.S. Real Estate Market Cap Rates'
    url: 'https://www.cbre.com/insights'
  - name: 'Federal Reserve — Commercial Real Estate Data'
    url: 'https://www.federalreserve.gov/data/commercial-real-estate.htm'
---

## 这个计算器衡量什么

资本化率（cap rate）是衡量租赁物业投资**与融资方式无关**的核心指标。它把物业的**净营业收入（NOI）**表示为房价的一个百分比——也就是每 1 美元房款能产生多少收入。用来对比克里夫兰的双拼房和坦帕的四单元楼、用来谈房价、用来识别挂价是高还是低。本计算器还做反向推算：给定你预期的 NOI，反算在目标 cap rate（5%、7%、8%、10%）下应该值多少钱。

## 计算方法

Cap rate = NOI ÷ 房价，乘 100：

```
Cap Rate = (NOI / 房价) × 100

其中：
  NOI = 有效毛收入 − 运营支出
  有效毛收入 = 总租金 × (1 − 空置率)
  运营支出 = 房产税 + 保险 + 维修 + 管理费
  （不含按揭还款）
```

以 $500,000 房价、$36,000 年毛租金、5% 空置率、$12,000 年运营支出为例，代入 `(36000 × 0.95 − 12000) / 500000 × 100 = 4.44%`。反向计算 `隐含价值 = NOI / 目标 cap rate`：NOI = $22,200，目标 7% 时隐含价值 = `$22,200 / 0.07 = $317,143`。

| 变量 | 含义 |
| --- | --- |
| `有效毛收入` | 年租金减去空置准备。 |
| `运营支出` | 物业运营所有成本，**不含按揭**。 |
| `NOI` | 物业在偿债前产生的真实收入。 |
| `Cap Rate` | NOI ÷ 房价——纯物业收益率，与融资无关。 |

**等级基准**（计算器会显示）：A 类都市（纽约、旧金山）3–5%；B 类中等城市 5–8%；C 类增值型 8–12%；困境资产 > 12%（需验证假设）；农村 / 低端市场 10–15%（涨幅通常有限）。曼哈顿 5% 是正常，曼哈顿 12% 通常意味着有问题。

## 局限性 / 何时不适用

Cap rate **不看融资**——全现金买房时，cap rate 等于你的现金回报率。杠杆交易下，你实际现金回报会比它高得多（或低得多），要视按揭条款而定；那种时候请用 **Cash-on-Cash / Rental Yield Calculator**。指标也默认**租金和支出稳定**——现实中租金随通胀上涨，支出波动，大修（屋顶、中央空调、热水器）不定期发生。筛选 cap rate 时务必从 NOI 中预留 5–10% 作为大修储备。低于 3% 的市场（高资产或极热门涨幅市场），指标意义有限，因为交易逻辑由资本利得驱动而非收益。

## 案例走读

你在评估一套 $500,000 的双拼房。卖家声称年毛租金 $36,000；你估计 5% 空置率，房产税 + 保险 + 维修 + 管理合计 $12,000/年：

1. 有效毛收入 = $36,000 × (1 − 0.05) = **$34,200**
2. NOI = $34,200 − $12,000 = **$22,200**
3. Cap Rate = $22,200 / $500,000 × 100 = **4.44%**

4.44% cap rate 提示这是 A 类或 B 类市场、有增值想象空间（沿海或高速增长的阳光带）。如果你要求最低 7% 收益率（你的门槛），隐含价值 = `$22,200 / 0.07 = $317,143`——卖家报价比你的 7% 基准高出约 $183K。要么往下谈、要么接受低价收益押涨幅、要么放弃。「空置率 +5pp」what-if 把指标降到 4.08%——敏感但不致命。搭配 **DSCR Calculator** 确认你的报价能拿到贷款。
