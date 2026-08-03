---
slug: 'solopreneur-ai-image-cost-calculator-zh'
engine_ref: 'solopreneur-ai-image-cost-calculator'
category_id: 'B'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'LiteLLM — 统一图片生成定价'
    url: 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json'
  - name: 'OpenAI 图片生成定价'
    url: 'https://openai.com/api/pricing/'
  - name: 'Midjourney 订阅方案'
    url: 'https://docs.midjourney.com/docs/plans'
---

## 这个计算器衡量什么

这个计算器对比 7 家供应商的月度图片生成开销——DALL-E 4（$0.12/
张）、DALL-E 3（$0.08）、Midjourney V7（$10-120/月订阅）、Stable
Diffusion 4 API（$0.003）、Ideogram 3（$0.04）、Flux Pro（$0.05）
和 Leonardo AI（$12-49/月订阅）。它建模订阅制 vs 按张计费、保本
批量、批次大小经济学（大批次 = 更少 API 调用），以及质量模式乘
数（HD 1.3×、Ultra 1.8×）。

## 计算方法

按张计费的供应商：`图片数/月 × 单价 × 质量乘数`。订阅供应商收固定
月费，覆盖一个图片额度（$10 约 200 张，$30 约 1,000 张）。当用量
超过订阅额度，按张 API 更便宜；当用量较低，订阅就是浪费。

```
按张月成本 = 图片数 × 单价 × 质量乘数
订阅月成本 = 固定费（按用量选择档次）
最优选择   = min(按张月成本, 订阅月成本)
```

| 供应商           | 模型          | 定价             | 最适合场景                       |
| ---------------- | ------------- | ---------------- | -------------------------------- |
| OpenAI DALL-E 4  | dalle-4       | $0.12/张         | 复杂多对象 prompt                |
| OpenAI DALL-E 3  | dalle-3       | $0.08/张         | 通用商业用途                     |
| Midjourney V7    | midjourney-v7 | $10-120/月       | 艺术/美学品质                    |
| Stable Diffusion 4| sd-4 (api)   | $0.003/张        | 超低成本批量生成                 |
| Ideogram 3       | ideogram-3    | $0.04/张         | 图片内嵌文本（logo、标牌）       |
| Flux Pro         | flux-pro      | $0.05/张         | 高品质摄影风格                    |
| Leonardo AI      | leonardo      | $12-49/月        | 中等用量下的订阅制               |

质量模式乘数：standard 1.0×、HD 1.3×、Ultra 1.8×。更大批次不降低单
张成本，只是减少 API 调用次数。

## 局限性 / 何时不适用

定价基于各供应商公开 API 的标准费率。定制企业合约（Adobe Firefly
Enterprise、Microsoft Designer for Work）不在建模范围。分辨率不影
响 DALL-E 定价（1024×1024 和 2048×2048 同价），但其他供应商可能
按像素数计费。免费层（Leonardo 每日 token、Bing Image Creator）未
涵盖。自行托管的 CDN/egress 成本未捕获。一次性大单可能拿到团队计
划的额外折扣，使用前请核对最新费率——图片供应商的调价频次高于文
本 API。

## 案例走读

一个设计工作室，每月生成 1,000 张 1024×1024 标准质量图片：

1. `DALL-E 3 成本` = 1,000 × $0.08 = **$80/月**
2. `DALL-E 4 成本` = 1,000 × $0.12 = **$120/月**——高端档
3. `Midjourney Pro`（$30/月，1,000 张额度）= **$30/月**——本场景最优
4. `SD 4 API` = 1,000 × $0.003 = **$3/月**——便宜 10 倍，但质量较弱
5. `Ideogram 3` = 1,000 × $0.04 = **$40/月**——此档位图片内嵌文本最强
6. `Leonardo Pro`（$29/月，1,000 张）= **$29/月**——与 Midjourney 持平