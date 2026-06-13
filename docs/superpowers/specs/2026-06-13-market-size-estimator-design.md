# Market Size Estimator — 设计规范

## 概述

将 `solopreneur-market-size-estimator` 从 `templates` 模式（10条随机拼句）升级为 `custom` 模式（单条结构化分析），采用自底向上（bottom-up）估算方法论。

## 引擎类型变更

- **旧**: `type: 'templates'` — 15个模板 + 6个词库，随机生成10条
- **新**: `type: 'custom'` — `customFn` 计算引擎，返回1条结构化结果

## 输入（4 个字段）

| name | label | placeholder | type |
|------|-------|-------------|------|
| `targetMarket` | 目标市场 | `e.g. US dental clinics` | text |
| `totalAddressableCustomers` | 总可寻址客户数 | `e.g. 30000` | number |
| `annualRevenuePerCustomer` | 年均客单价 ($) | `e.g. 5000` | number |
| `marketGrowthRate` | 行业年增长率 (%) | `e.g. 12` | number |

## 输出结构

单个结果，4 个模块：

### 模块 1: 📊 市场概览 (Market Overview)

显示基本计算：
- 总可寻址客户数
- 年均客单价
- TAM = 客户数 × 客单价
- 行业增长率
- 3年复利增长后的市场规模

### 模块 2: 💰 收入潜力矩阵 (Revenue Potential Matrix)

4 档渗透率下的年收入估算：

| 渗透率 | 客户数 | 年收入 | 可行性标签 |
|--------|--------|--------|-----------|
| 0.1% | 计算 | 计算 | 🟢 Attainable (solopreneur) |
| 0.5% | 计算 | 计算 | 🟢 Attainable (solopreneur) |
| 1% | 计算 | 计算 | 🟡 Requires a small team |
| 5% | 计算 | 计算 | 🔴 Requires funding/scale |

渗透率档位根据市场大小动态调整：
- 大市场 (>100K 客户): 0.1%, 0.5%, 1%, 3%
- 中等市场 (10K-100K): 0.2%, 1%, 2%, 5%
- 小市场 (<10K): 0.5%, 2%, 5%, 10%

### 模块 3: 📈 3年增长预测 (3-Year Growth Projection)

假设你的渗透率逐年翻倍 + 市场自身增长：

```
Year 1: Market $XM → Your X% = $XM
Year 2: Market $XM → Your X% = $XM
Year 3: Market $XM → Your X% = $XM
```

起始渗透率取"可实现的"第一档。

### 模块 4: 🎯 独立开发者现实检验 (Solopreneur Reality Check)

定性分析，根据数据给出判断：
- TAM > $1B: "市场巨大 — 你不需要很大市场份额就能做起来"
- TAM $100M-$1B: "市场体量不错 — 专注于一个细分领域"
- TAM < $100M: "市场较窄 — 需要高客单价或高渗透率来支撑"
- 客单价 < $500: "低客单价意味着你需要大量客户 — 考虑向上销售或提高价格"

末尾给出一条具体建议：要达到年收入 $100K，只需要 X 个客户（Y% 渗透率）

## 客户端渲染

使用已有的 custom 单结果卡片布局：标题行 + `border-b` 分隔 + `font-mono` 正文区。Copy/Export 按钮 hover 显示。

## 影响范围

| 层级 | 文件 | 变更 |
|------|------|------|
| Engine | `src/engines/market-size-estimator.ts` | 完全重写 |
| i18n | `src/i18n/translations.ts` | 更新 inputs(4个)、how_to_use(7-8条)、faq(5条)、description |
| 其他 | 无 | tools.ts 的 slug/category 不变 |

## 不变更

- slug: `solopreneur-market-size-estimator`
- category: `A` (Idea Validation)
- 全局 UI（[slug].astro, ResultCard.astro）— 无需改动
