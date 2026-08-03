---
slug: 'solopreneur-brrrr-calculator-zh'
engine_ref: 'solopreneur-brrrr-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'BiggerPockets — BRRRR Calculator Guide'
    url: 'https://www.biggerpockets.com/blog/brrrr-calculator/'
  - name: 'BiggerPockets — BRRRR Investing Strategy'
    url: 'https://www.biggerpockets.com/real-estate-investing/brrrr-investing/'
  - name: 'Fannie Mae — Cash-Out Refinance Guidelines'
    url: 'https://www.knowyouroptions.com/buy/refinance-options'
  - name: 'HUD — 203(k) Rehab Lending Reference'
    url: 'https://www.hud.gov/program_offices/housing/sfh/203k'
---

## 这个计算器衡量什么

本计算器模拟 **BRRRR 投资策略**——买、修、租、再融资、循环（Buy Rehab Rent Refinance Repeat）——跟踪投资人在 5 个阶段里的现金走向，回答核心问题：这单是否达成**现金全部回笼**（再融资返回 ≥ 100% 投入资本）还是**仍然套牢**（钱还砸在项目里）？同时校验经典的**70% 规则**（成交价 + 翻修 ≤ 修复后价值 ARV 的 70%），跑强制增值的敏感性，并预测再融资后的现金回报率。签合同前用它来压力测试卖房-转租 pipeline。

## 计算方法

模型把投资人的现金账本串成一条线穿过 5 个阶段：

```
第 1 阶段（买）：
  initialOutlay = 首付 + 3% 成交费
  initialLoan   = 房价 − 首付

第 2 阶段（修）：
  holdingCost = (初始贷款 × 月利率 + $200 月度水电) × 持有月数
  totalStage2 = 翻修总额 + 持有成本

第 3 阶段（租）：
  interimRent = 月租金 × min(2, 持有月数 − 1)   （装修期普遍空置）

第 4 阶段（再融资）：
  refiLoan = ARV × 0.75         （标准 75% LTV）
  cashOutFromRefi = refiLoan − initialLoan   （正数 = 现金回流给投资人）

第 5 阶段（循环）：
  cashOut（投入现金） = 阶段 1 + 阶段 2 + 持有
  cashIn （回流现金） = 期间租金 + 再融资返现
  cashLeftInDeal     = cashOut − cashIn
  现金层面判定：  ≤ 0 → 🟢 现金全部回笼；> 15% → 🟠 套牢
```

**70% 规则**是初筛闸门：`最高可接受报价 = (ARV × 0.7) − 翻修成本`。超过这个范围，无论执行多好这单大概率亏。**强制增值**才是 BRRRR 的核心技术——它是你一次翻修带来的 `(ARV − 成交价 − 翻修)` 美元涨价，叠在市场涨幅之上。

| 变量 | 含义 |
| --- | --- |
| `ARV` | 修复后价值——装修完成后的评估价。 |
| `强制增值` | 翻修带来的价值增量。BRRRR 盈利的核心驱动力。 |
| `70% 规则` | (ARV × 0.7) ≥ 成交价 + 翻修。最重要的初筛。 |
| `Left-in-Deal` | 还没通过再融资回收的资本。目标 ≤ 0 才算成功。 |
| `再融资后 CoC` | 年现金流 ÷ 剩余在 deal 里的现金。现金全部回笼时为 ∞。 |

再融资后现金流用和 **Mortgage Calculator** 一样的 PMT 公式（月供 = 新贷款，rate 不变）。租金一侧遵循 **Cap Rate Calculator** 的逻辑。

## 局限性 / 何时不适用

模型假设**再融资评估价恰好等于你的 ARV 估计**——现实中评估价经常低 5–15%，每 10% 偏差对应 ARV 每 $100K 就少 $10K+ 返现。签合同前务必跑「ARV −$20K」what-if。期间租金捕获上限 2 个月（装修期基本空置）。使用**硬资金**（短期、高利率、仅付息）的 deal，持有成本要用硬资金实际利率而非再融资后利率建模。BRRRR 在加息周期（2026 年的 6.5–7.5% 区间）很脆弱——再融资抽出来的钱被压缩；需要更短的装修周期 + 更大的强制增值才能撑住。

## 案例走读

你看中一套 $150,000 的困境资产。ARV（类比成交分析后）$220,000。承包商报价装修 $30,000。25% 首付，按 ARV 后 75% LTV 7.5% 30 年再融资，预期租金 $1,800/月 OpEx $400/月：

1. **买**：$37,500 首付 + $4,500 成交费 = **$42,000 出去**（初始贷款 $112,500）
2. **修**：$30,000 + $5,419 持有（利息 + $200/月 × 6 月） = **$35,419 出去**
3. **租**：$1,800 × 1 月 = **$1,800 进来**（仅 1 个月）
4. **再融资**：$220,000 × 0.75 = $165,000 refi 贷款；扣 $112,500 初始贷款 = **$52,500 现金回流**
5. **总账**：流出 $77,419，流入 $54,300 → **$21,119 留在 deal** 🟠 大量现金被套

70% 规则不通过（最高报价 $124,000，你给 $150,000，差 $26K）。要救这单必须：(1) 至少砍价 $26K，或者 (2) 削减装修范围，或者 (3) 把 ARV 推到 $250K 以上（+$30K 涨幅刚好填补缺口）。6 行 ARV 敏感性显示 **$250K ARV** 跨过全回笼临界点（留在 deal 变负）。搭配 **Rental Yield Calculator** 看再融资后的持有经济，**DSCR Calculator** 在申请再融资前先过一遍贷款资质。
