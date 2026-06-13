# Four Calculator Upgrades — SaaS Valuation / Break-Even / Churn Rate / Unit Economics

**日期:** 2026-06-13
**状态:** 实施中

## 1. SaaS Valuation Calculator（3→6 inputs）

新增：SDE 法、Rule of 40 因子、行业对标、退出场景

### 新 Inputs
| Name | Label | Type |
|------|-------|------|
| `founderSalary` | Founder Salary ($) | number |
| `discretionaryExpenses` | Discretionary Expenses ($) | number |
| `industryCategory` | Industry Category | select: B2B SaaS / B2C SaaS / eCommerce / Marketplace / Agency |

### 新输出
- 三方法估值对比表（Revenue Multiple / SDE Multiple / Public Comps）
- SDE = revenue × margin + founderSalary + discretionaryExpenses
- Rule of 40 调整（≥40% +1×, <20% −1×）
- 退出场景（战略/PE/个人）

## 2. Break-Even Calculator（4→6 inputs）

新增：变动成本、单价、敏感性矩阵、更多 P&L 节点

### 新 Inputs
| Name | Label | Type |
|------|-------|------|
| `variableCostPercent` | Variable Cost % of Revenue | number |
| `pricePerUnit` | Price Per Unit ($) | number |

### 新输出
- Revenue BE + Unit BE 双打平
- 敏感性矩阵（Bear/Base/Bull ±20%）
- 累计 P&L 扩展到 6 节点（1/3/6/12/18/24 月）

## 3. Churn Rate Calculator（4→5 inputs）

新增：收入流失 vs 客户流失 + NRR/GRR + 流失归因

### 新 Inputs
| Name | Label | Type |
|------|-------|------|
| `expansionRevenue` | Expansion Revenue ($) | number |

### 新输出
- Logo Churn vs Revenue Churn
- NRR / GRR
- 流失归因（自愿/非自愿估算）

## 4. Unit Economics Calculator（4→6 inputs）

新增：扩展收入、自定义留存月数、规模曲线、杠杆排序

### 新 Inputs
| Name | Label | Type |
|------|-------|------|
| `expansionRevenuePerCustomer` | Expansion Revenue / Customer ($) | number |
| `retentionMonths` | Avg Customer Lifetime (months) | number (optional) |

### 新输出
- 边际贡献含扩展收入
- 1K/10K/100K 规模曲线
- 优化杠杆排序（降低 churn vs 提高 expansion 的 $ 影响）

## 改动文件

每个计算器：engine.ts + tools.ts + translations.ts

---

## Self-Review

- Placeholder: 无 ✅
- Consistency: 每个计算器独立升级，不互相影响 ✅
- Scope: 4 计算器 × 3 文件 = 12 处改动，可控 ✅
