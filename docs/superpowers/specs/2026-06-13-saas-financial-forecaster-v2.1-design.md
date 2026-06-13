# SaaS Financial Forecaster v2.1 — CAC + Custom Growth + Monthly Breakdown

**日期:** 2026-06-13
**状态:** 设计中

## 背景

v2 升级后功能已完善，但存在 3 个缺口：
1. 自定义增长率场景是静态占位符，无对应 input
2. 缺 CAC（SaaS 铁三角 ARPU-Churn-CAC 的最后一角）
3. 无逐月 MRR 明细

## Inputs 新增（2 个，可选）

| # | Name | Label | Type | 说明 |
|---|------|-------|------|------|
| 8 | `customGrowthRate` | Custom Growth Rate (%) | number（可选） | 激活自定义场景行 |
| 9 | `cac` | Customer Acquisition Cost ($) | number（可选） | 获取一个付费客户的平均成本 |

## 输出变化

### 自定义场景（板块 3）

- `customGrowthRate` 有值时替换占位符为实际计算行
- 留空显示提示语 `🎯 Custom: enter a growth rate above to see your target`
- customNetRate = (customGrowthRate − churnRate) / 100

### CAC 指标（板块 5 尾部）

```
• CAC (Customer Acquisition Cost):  $200.00
• CAC Payback Period:               8.0 months  🟢
  = CAC ÷ (ARPU × (1 − churn rate/100)) | <12mo 🟢 | 12-24mo 🟡 | >24mo 🔴
• LTV:CAC Ratio:                    5.0×  🟢
  = LTV ÷ CAC | ≥3× 🟢 | 1-3× 🟡 | <1× 🔴
```

边界：
- cac=0 → 跳过整个 CAC 块
- ARPU=0 或 churn=0 → Payback 显示 "—"
- LTV=0 或 CAC=0 → LTV:CAC 跳过

### 逐月明细表（新板块，Milestones 之后）

仅 months=12 时完整显示 12 行（按月递增进 MRR 和增量）。
months=6/24 时显示首 6 行 + 末尾概览。

## 改动文件

| 文件 | 改动 |
|------|------|
| `src/engines/revenue-projector.ts` | inputs +2；customFn 同步；新板块；CAC 指标 |
| `src/data/tools.ts` | inputs 加 2 |
| `src/i18n/translations.ts` | input 翻译 +2；howToUse +2 步；FAQ +1 条 CAC |

## Self-Review

- Placeholder: 无 TODO/TBD ✅
- Consistency: 两个新 input 都是可选（留空=不参与），不破坏现有逻辑 ✅
- Scope: 3 文件，可控 ✅
- Edge cases: cac=0 / arpu=0 / churn=0 / LTV=0 / customGrowthRate 为空 全部明确 ✅
