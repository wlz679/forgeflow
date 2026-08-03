---
slug: 'solopreneur-saas-pricing-planner-zh'
engine_ref: 'solopreneur-saas-pricing-planner'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'OpenView SaaS Benchmarks 2026 — Pricing & Packaging'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'Stripe Atlas — SaaS Pricing Models'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'Harvard Business Review — The Psychology of Pricing'
    url: 'https://hbr.org/topic/subject/pricing'
---

## 这个计算器衡量什么

本工具帮助独立创业者和 indie founder 为 SaaS、电子书、课程、模板、
newsletter 选定一套能站得住的定价模型。它把「**固定价 / 分层 / 用量 /
免费 + 付费**」之间的取舍拆开，呈现每层的毛利率、MRR 贡献、LTV 和
盈亏平衡所需客户数，让你在 12 个月内收得回产品成本、又不白白让利。
适用场景：定价页上线前、涨价前、评估 freemium-vs-paid 切分时。

## 计算方法

我们使用的 v3 标准公式：

```
basePrice    = max(competitorPrice, 29)
targetMargin = 0.70
assumedChurn = 3% 月流失

每层（Starter / Pro / Max / Enterprise）:
  monthlyMrr       = midPrice × customerCount
  costPerCustomer  = midPrice × (1 − tierMargin)
  ltv              = (midPrice − costPerCustomer) / assumedChurn
  breakEvenCount   = ceil(2,000 / (tierMargin × midPrice))
weightedMargin    = Σ(margin × monthlyMrr) / Σ monthlyMrr
```

| 变量              | 含义                                          |
| ----------------- | --------------------------------------------- |
| `competitorPrice` | 头部 3 家竞品平均月费（$/mo）                 |
| `productType`     | SaaS / ebook / course / template / newsletter |
| `targetCustomer`  | b2b / b2c / developers / creators             |
| `tierMargin`      | 每层毛利率（Starter 85% → Enterprise 65%）    |
| `assumedChurn`    | 3% 月流失 — $30-$100/mo SaaS 中位数（OpenView）|
| `ltv`             | 当前价格与毛利率下的客户终身价值              |
| `breakEvenCount`  | 覆盖 $2K/mo 固定成本所需客户数                |

LTV 公式 `(price × margin) / monthly churn` 是教科书级 SaaS 公式；
盈亏平衡客户数假设每层每月 $2,000 固定开销（托管、客服、支付手续费），
请按真实 overhead 调整。

## 局限性 / 何时不适用

本计算器假设**订阅型**业务。如果你卖一次性商品（实物、项目制咨询、
定制服务），LTV 数学坍塌 —— 流失未定义、盈亏平衡就是一次成交。它
默认嵌入了美式 margin 和 churn 基准；对于新兴市场 SaaS，乘数往往
更低（CAC 便宜）、流失更高。高接触 enterprise 销售带定制合约的
场景，请完全跳过 freemium / usage-based 输出 —— 它们并不适用。

## 案例走读

假设为开发者推一款 B2B SaaS，竞品均价 $29/mo：

1. `basePrice` = `competitorPrice` = **$29/mo**（Starter → Max 层围绕
   该锚点分层）。
2. **Pro 层** $38/mo、毛利 75%、400 客户 = **$15,200 MRR**。
3. **Enterprise 层** $499/mo、毛利 65%、12 客户 = **$5,988 MRR**
   （锚定层 —— 仅 4% 客户却占 ~14% MRR）。
4. 4 层 1,492 客户合计 **MRR = $44,508/mo**。
5. 3% 月流失 + 76.8% 加权毛利下的**平均 LTV ≈ $763**。
6. 定价健康度对加权毛利 ≥ 70% 目标亮绿灯，但提示 Pro 比 $29 竞品
   高出 30%+ —— 存在价格异议风险。What-If 段模拟降价 20%（拉成交）
   与涨价 20%（测付费意愿）。搭配 **MRR Calculator** 可在每个价格点
   推算 12 个月收入走势。