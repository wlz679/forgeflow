# ForgeFlowKit ZH Terminology Glossary

> **Single source of truth** for technical term ZH translation across all 100 engines, blog posts, and UI strings.
> Updated: 2026-07-26 (P78) — extended with calculator name patterns + blog templates + brand preservation rules.
> Originally created: 2026-07-18 (P18-3).

| EN | ZH | Domain | Notes |
|---|---|---|---|
| pipeline | 销售渠道 | Sales | NOT 管线 |
| pipeline coverage | 销售渠道覆盖 | Sales | |
| pipeline value | 销售渠道价值 | Sales | |
| cohort | 同期群 | Retention / Marketing | NOT 同期组 / 同类群 |
| cohort retention | 同期群留存 | Retention | |
| churn | 流失 | Retention | NOT 客户流失 (unless explicitly "customer churn") |
| churn rate | 流失率 | Retention | |
| logo churn | 客户流失率 | Retention | OK to specify 客户 here |
| NRR | 净收入留存率 | Retention | First occurrence: 净收入留存率 (NRR); later: NRR |
| GRR | 总收入留存率 | Retention | |
| expansion revenue | 扩展收入 | Retention | |
| CAC | 客户获取成本 | Marketing / SaaS | NOT 用户获取成本 |
| LTV | 客户生命周期价值 | Marketing / SaaS | |
| ROAS | 广告投资回报率 | Marketing | |
| ARR | 年度经常性收入 | SaaS / Retention | |
| MRR | 月度经常性收入 | SaaS | |
| retention | 留存 | General | NOT 保留 (means "preserve") |
| retention rate | 留存率 | Retention | |
| funnel | 漏斗 | Marketing / Product | NOT 销售漏斗 (unless explicit) |
| conversion rate | 转化率 | Marketing / Product | |
| SLA | 服务等级协议 | Customer Support | |
| CSAT | 客户满意度 | Customer Support | |
| deflection | 偏转 | Knowledge / Support | deflection rate = 偏转率 |
| first response time | 首次响应时间 | Customer Support | |
| resolution time | 解决时间 | Customer Support | |
| breach | 数据泄露 | Legal / Security | NOT 违反 (means "violation") |
| GDPR | 通用数据保护条例 | Legal | |
| DSAR | 数据主体访问请求 | Legal | |
| DPA | 数据处理协议 | Legal | |
| CMP | 同意管理平台 | Legal / Privacy | |
| ePrivacy | 电子隐私条例 | Legal | |
| knowledge base (KB) | 知识库 | Knowledge | |
| article freshness | 文章新鲜度 | Knowledge | NOT 时效性 (means "timeliness") |
| documentation ROI | 文档投资回报率 | Knowledge | |
| employee cost | 员工成本 | Hiring | |
| ramp time | 磨合期 | Hiring | NOT 爬坡时间 |
| productivity ramp | 生产力爬升 | Hiring | OK 爬升 here |
| equity dilution | 股权稀释 | Investment | |
| valuation | 估值 | Investment | |
| mortgage | 按揭贷款 | Real Estate | NOT 抵押贷款 (means "collateral loan") |
| cap rate | 资本化率 | Real Estate | |
| DSCR | 偿债覆盖率 | Real Estate | |
| BRRR | 买入-翻新-出租-再融资 | Real Estate | |
| rental yield | 租金收益率 | Real Estate | |
| rent vs buy | 租购对比 | Real Estate | |
| AI training | AI 训练 | AI Cost | |
| token | Token | AI Cost | Keep English (no canonical ZH) |

---

## Calculator Name Patterns

Naming convention for all 100 calculator names. Used in tool titles (`tools.${slug}.title`), blog titles (`blog.${slug}.title`), blog excerpts, and template body text.

### Pattern: Bilingual in parens

Calculator names that include English acronyms use **Chinese (full) + (English acronym)** pattern on first occurrence, then may shorten to just the Chinese term:

```
EN: "Customer Acquisition Cost (CAC)"
ZH: "客户获取成本（CAC）" → later: "CAC 客户获取成本" or "CAC"

EN: "Debt Service Coverage Ratio (DSCR)"
ZH: "DSCR 计算器（偿债覆盖率）"

EN: "Average Contract Value (ACV)"
ZH: "平均合同金额（ACV）计算器"
```

### Pattern: Pure Chinese (no English acronym)

Calculator names without English acronyms translate directly:

```
EN: "Cart Abandonment Cost" → ZH: "购物车放弃成本"
EN: "Activation Rate" → ZH: "激活率"
EN: "Burn Rate" → ZH: "烧钱率" / "烧钱速度"
EN: "Churn Rate" → ZH: "流失率"
EN: "Employee Cost" → ZH: "员工成本"
EN: "Meeting Cost" → ZH: "会议成本"
```

### Pattern: Keep English (no canonical ZH)

Some tech terms have no widely-accepted Chinese translation — keep English:

```
"Token" → "Token" (NOT 代币)
"LoRA" → "LoRA" / "LoRA/全量微调"
"GPU" → "GPU"
"OpenAI / Claude / GPT-5 / DeepSeek / Gemini" → keep English
"ARR" / "MRR" / "CAC" / "LTV" / "ROAS" / "ACV" / "DSCR" / "BRRRR" / "CMP" / "GDPR" / "DSAR" / "DPA" → keep English
```

### Calculator name suffix

All calculators use "计算器" suffix in zh (never "工具" or "器" alone):

```
EN: "MRR Calculator" → ZH: "MRR 计算器"
EN: "Burn Rate Calculator" → ZH: "烧钱率计算器"
EN: "AI Training Cost Estimator" → ZH: "AI 训练成本估算器" / "AI 训练成本计算器"
```

---

## Blog Body Template Phrases

All 100 blog posts use a 5-section template (en + zh). Translations mirror each section heading consistently:

| EN | ZH | Notes |
|---|---|---|
| `## What is the X?` | `## X 是什么？` | X = calculator name |
| `## Why Entrepreneurs Need This Tool` | `## 为什么创业者需要这个工具` | |
| `## How to Use the X` | `## 如何使用 X` | Note: space between Chinese and English |
| `## Tips and Best Practices` | `## 技巧与最佳实践` | |
| `## Get Started Now` | `## 立即开始` | |

### Common body phrases (template-level)

| EN | ZH |
|---|---|
| "is a free online tool designed to help entrepreneurs and indie makers" | "是一款免费在线工具，旨在帮助创业者和独立开发者" |
| "It's part of our suite of 100 free business calculators" | "它是 ForgeFlowKit 100 款免费商业计算器之一" |
| "Every successful business owner knows that the right tools make a huge difference" | "每一位成功的经营者都知道，合适的工具能带来显著差异" |
| "saves you time and helps you make better decisions" | "可节省时间，并根据成熟的创业公司和独立开发者最佳实践提供即时、可执行的结果" |
| "Whether you're validating your first SaaS idea or scaling your existing business" | "无论你是在验证第一个 SaaS 创意，还是在扩展现有业务" |
| "this tool gives you professional-level assistance in seconds — no experience required" | "这款工具都能在几秒内提供专业级辅助，无需任何经验" |
| "Using this tool is simple and takes less than a minute" | "使用这款工具很简单，不到一分钟即可完成：" |
| "Visit the X page on our website" | "访问网站上的 X 页面" |
| "Click the Generate button" | "点击「生成」按钮" |
| "Click the Copy button on any result" | "点击任一结果的「复制」按钮进行保存" |
| "Use the Copy All to grab everything at once" | "使用「复制全部」一次获取所有内容" |
| "Be specific with your inputs" | "输入尽量具体" |
| "Generate multiple times" | "多生成几次" |
| "Combine with other tools" | "搭配其他工具" |
| "Save your favorites" | "保存优选结果" |
| "Test and iterate" | "测试并迭代" |
| "Ready to level up your business journey?" | "准备好让业务更进一步了吗？" |
| "Try the X now" | "立即试用 X" |
| "it's completely free, requires no signup, and works instantly in your browser" | "完全免费、无需注册，并可直接在浏览器中使用" |

---

## Brand Name Preservation

Brand names are **NEVER translated** — always appear in English regardless of lang:

| Brand | Usage |
|---|---|
| `ForgeFlowKit` | Company name, footer copyright |
| `ForgeFlowKit Blog` / `ForgeFlowKit 博客` | Blog title (zh translation alongside English brand) |
| `Launch Checklist Generator` | Specific tool name kept as-is |

---

## UI String Conventions

Standard UI labels with bilingual translations:

| EN | ZH | Source |
|---|---|---|
| `Privacy Policy` | `隐私政策` | `footer.privacy` |
| `Terms & Conditions` | `服务条款` | `footer.terms` |
| `Contact` | `联系我们` | `footer.contact` |
| `About` | `关于` | `footer.about` |
| `Read the Full Guide` | `阅读完整指南` | `related_blog.title` |
| `Free tools for entrepreneurs. No signup required.` | `ForgeFlowKit 免费工具。无需注册。` | `footer.copyright` |
| `Last updated: 2026` | `最后更新：2026` | `legal.{privacy,terms}.last_updated` |

---

## Cross-References

This glossary is the single source of truth. Translation batches that follow:

- **P18-3 (2026-07-18)** — initial glossary creation with 53 term mappings
- **P69 (2026-07-23)** — added 100 blog title translations (`blog.*.title` keys)
- **P72 T2-A (2026-07-25)** — added 2 keys (`category.guides_heading`, `category.related_articles`)
- **P73 (2026-07-25)** — added 22 legal page keys (`legal.privacy.*`, `legal.terms.*`)
- **P75 (2026-07-26)** — added 100 blog body translations via `bodyZh` frontmatter
- **P76 (2026-07-26)** — review pass; no changes needed

When extending this glossary, follow the existing format (table with EN/ZH/Domain/Notes columns).