# MRR Calculator v2 — 行业完整版设计

**日期:** 2026-06-13
**状态:** 等待审核

## 背景

MRR 计算器 v1 刚完成升级，从 3 input（subs, price, discount）扩展到 5 input（+churnRate, +expansionMRR, +newSubsPerMonth），输出从 1 段扩展为 4 板块（Snapshot / Movement / Churn / Milestones）。

对照 Baremetrics、ChartMogul、Churnkey 等行业标准，当前仍缺少：Contraction MRR、Reactivation MRR、NRR、GRR、Quick Ratio、Max MRR、What-if 情景分析。

## 目标

将 MRR 计算器提升为同类中最专业的 SaaS 收入健康诊断工具，完整覆盖 MRR 五要素分解、四大核心指标、三个情景分析。

---

## 设计

### Input（7 个）

| # | Name | Label | Type | 说明 |
|---|------|-------|------|------|
| 1 | `subscriberCount` | Current Subscribers | number | 已有 |
| 2 | `monthlyPrice` | Monthly Price ($) | number | 已有 |
| 3 | `monthlyChurnRate` | Monthly Churn Rate (%) | number | 已有 |
| 4 | `expansionMRR` | Expansion MRR ($/mo) | number | 已有（升级/增值） |
| 5 | `newSubsPerMonth` | New Subscribers / Month | number | 已有 |
| 6 | `contractionMRR` | Contraction MRR ($/mo) | number | **新增** — 降级/减购导致的收入减少 |
| 7 | `reactivationMRR` | Reactivation MRR ($/mo) | number | **新增** — 流失后回流的客户收入 |

### 计算逻辑

```
startingMRR    = subs × price
newMRR         = newSubs × price
churnedMRR     = subs × (churnRate/100) × price
expansionMRR   = 用户输入
contractionMRR = 用户输入
reactivationMRR = 用户输入

endingMRR      = startingMRR + newMRR + expansionMRR + reactivationMRR − contractionMRR − churnedMRR
netChange      = endingMRR − startingMRR
growthRate     = netChange / startingMRR × 100  (startingMRR>0 时)

// Key Metrics（注：NRR 按行业标准不含 Reactivation — 回流算新获客，不算留存）
NRR            = (startingMRR + expansionMRR − contractionMRR − churnedMRR) / startingMRR × 100
GRR            = (startingMRR − contractionMRR − churnedMRR) / startingMRR × 100
quickRatio     = (newMRR + expansionMRR + reactivationMRR) / (contractionMRR + churnedMRR)  // 分母=0 时显示 ∞
maxMRR         = newMRR / (churnRate / 100)  // churnRate=0 时显示 ∞
```

### NRR / GRR 边界说明

- 当 startingMRR = 0 时，NRR 和 GRR 无意义，显示 "— (enter subscribers and price)"
- NRR 可以超过 100%（扩展收入超过流失是好事），可以低于 0（极端流失）
- GRR 最高为 100%（只减不加），最低为 0%

### 输出结构（6 板块）

#### 1. 💰 MRR Snapshot（5 行）
```
Starting MRR:       $14,500.00
Ending MRR:         $17,715.00  (after 1 month)
ARR (×12):          $174,000.00
Subscribers:        500  @  $29.00/mo
Monthly Growth:     +22.2%
```

#### 2. 📈 MRR Waterfall（8 行）
用 waterfall 格式展示从起始到期末的 MRR 变动路径：
```
Starting MRR:       $14,500.00
  + New MRR:        +$2,900.00  (100 new subs × $29.00)
  + Expansion MRR:  +$800.00   (upgrades & add-ons)
  + Reactivation:   +$100.00   (returned customers)
  − Contraction:    −$150.00   (downgrades)
  − Churn:          −$435.00   (3.0% of 500 subs)
  = Ending MRR:     $17,715.00
Net Change:         +$3,215.00  (+22.2% MoM)
```
增长率颜色评级: >=10% 🟢 Excellent, >=5% 🟡 Healthy, >=0% 🟠 Slow, <0% 🔴 Shrinking

#### 3. 📐 Key SaaS Metrics（6 行）
```
Net Revenue Retention (NRR):  101.5%  🟡 Positive — existing base growing slightly
Gross Revenue Retention (GRR):  95.9%  🟢 >90% is healthy
SaaS Quick Ratio:               6.5x   🟢 >4 is highly efficient
Growth Ceiling (Max MRR):      $96,667/mo  at 3.0% churn
```

NRR 颜色: >=120% 🟢 Exceptional, >=110% 🟢 Best-in-class, >=100% 🟡 Positive, <100% 🟠 Shrinking
GRR 颜色: >=90% 🟢 Healthy, 80-90% 🟡 Watch, <80% 🟠 At risk
Quick Ratio: >=4 🟢 Efficient, 2-4 🟡 OK, 1-2 🟠 Weak, <1 🔴 Shrinking

#### 4. 🩺 Churn & Contraction Health（6 行）

流失部分（已有）：
- 月流失率分色评估
- 月流失人数
- 年留存率

新增收缩预警：
```
Contraction MRR:        $150.00  —  🟢 Contraction is well-managed.
Contraction/Expansion:  18.8%   —  🟢 Under 50% of expansion — healthy.
```
- `contractionToExpansion = expansionMRR>0 ? contractionMRR/expansionMRR×100 : null`
- 如果 expansionMRR=0 且 contractionMRR>0 → 🔴 "Contraction with no expansion — investigate immediately."
- 如果 contraction > expansion → 🔴 "Contraction exceeds expansion — your value delivery has a problem."
- 如果 contraction > 50% of expansion → 🟠 "Contraction is eating >50% of expansion gains — watch closely."
- 否则 → 🟢 "Contraction is well-managed relative to expansion."

#### 5. 🎯 MRR Milestone Projections（~5 行）

已有逻辑，保持。如果是负增长则只显示低于当前 MRR 的里程碑（向下预警）。

#### 6. 🔄 What-If Scenarios（3 个情景，~10 行）

**Scenario A — Reduce Churn:**
```
• If churn drops 3.0% → 2.0%:
  Max MRR: $96,667 → $145,000 (+$48,333)
  Annual revenue potential gain: +$580,000
```

**Scenario B — Boost Expansion to 25% of New MRR:**
```
• If expansion grows to 25% of new MRR:
  Target Expansion: $725/mo. Already at $800/mo (27.6% of new) — ✅ exceeding target.
```

如果 expansion 已 >=25% new MRR，显示确认信息而非建议。如果不足，显示：
```
• Target Expansion: $725/mo (+$225 needed)
  NRR would rise: 101.5% → 103.1%
  Additional monthly revenue: +$225/mo
```

**Scenario C — Halve Contraction:**
```
• If contraction is cut by 50%:
  Savings: +$75/mo
  Net Change improves: $3,215 → $3,290/mo (+2.3%)
  NRR improves: 101.5% → 102.5%
```

如果 contractionMRR 为 0，跳过 Scenario C。如果 expansion 已经 >=25% new MRR，跳过或调整 Scenario B。

---

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/engines/mrr-calculator.ts` | 重写 calculateMRR + customFn；新增 2 个 input；更新 staticExamples/faq/howToUse |
| `src/data/tools.ts` | 更新 inputs 列表（7 个 input） |
| `src/i18n/translations.ts` | 新增 contractionMRR、reactivationMRR 翻译；补充 Key Metrics 板块可能需要的 section header 翻译 |

### 不需要改动

- 首页渲染逻辑（按 categoryId 过滤，不变）
- 其他计算器
- 分类配置
- Engine 注册机制

---

## 翻译计划

新增翻译 key：

```
# Inputs
tools.solopreneur-mrr-calculator.input.contractionMRR.label
tools.solopreneur-mrr-calculator.input.contractionMRR.placeholder
tools.solopreneur-mrr-calculator.input.reactivationMRR.label
tools.solopreneur-mrr-calculator.input.reactivationMRR.placeholder
```

输出文本全部是英文字符串拼接到结果中，不通过翻译系统，因为计算结果在运行时动态生成。与现有 burn-rate / churn-rate 等计算器一致。

FAQ 和 howToUse 需要更新或新增条目。

---

## Self-Review（第二轮 — 已修正）

- **Placeholder scan:** 无 TODO/TBD ✅
- **Internal consistency:** NRR 公式已修正为不含 reactivation（行业标准：回流算新获客非留存）；所有示例数字基于同一组输入推导，各板块数字一致 ✅
- **Scope:** 3 文件，改动可控 ✅
- **Ambiguity:** 边界条件（zero values, zero denominators, 负增长里程碑, expansion 已达标时 Scenario B 的分支处理）全部明确 ✅
- **Edge cases covered:**
  - startingMRR=0: NRR/GRR 显示 "—"
  - churnRate=0: Max MRR 显示 "∞"，跳过 Scenario A
  - contractionMRR=0: 跳过 Scenario C
  - expansionMRR=0 且 contractionMRR>0: 特殊预警
  - denominator=0 (Quick Ratio): 显示 "∞ (no losses)"
  - expansion 已 >=25% new MRR: Scenario B 显示确认信息
  - 负 netChange: 里程碑只显示低于当前 MRR 的目标（向下预警）
