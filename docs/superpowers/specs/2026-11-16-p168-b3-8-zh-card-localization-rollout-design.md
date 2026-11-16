# P168 批次 3 · B3-8：zh 页结果卡片本地化铺开（第一批 = 展示量 top 15 引擎）｜设计规格

> 状态：**2026-11-16 · 用户已批准**（范围 = top 15 引擎 / calc 层授权 / 设计批准 / rental-yield 数值裁定 = 改服务端）
> 前置：B3-7（`2026-11-12-p168-b3-7-zh-calc-output-i18n-design.md`）已上线 10 个试点，机制与守卫均已验证
> （CI run `43793880948` = success · 线上 10 个试点 zh 页模板键集合/取值逐项一致 · 字节差恒为 CF 注入的 +153 B）

---

## 0. 为什么是这一支（问题陈述）

### 0.1 缺陷

B3-7 把「zh 页结果卡片整段是英文」改成了「引擎吐语义码 + zh 侧查 locale 拼装」，但**只做了 10 个试点**。
剩下 **90 个引擎**的 zh 页结果卡片仍是整段英文 —— 中文用户点进 `/zh/<slug>/`，看到的是英文计算结果。

### 0.2 实测规模（2026-11-16，全部来自本仓库当前产物与源码，非推断）

| 指标 | 实测值 | 取数方式 |
|---|---|---|
| zh 工具页总数 | 100 | `dist/zh/**/index.html` |
| 已全中文（B3-7 试点） | **10** | 卡片 0 英文行 |
| 卡片仍有英文 | **90 页 / 1,427 行** | `tests/scripts/p168-card-text.mjs` 的 `staticCard` + `isEnglishLine` |
| 裸 token 泄漏 | **0** | 同上 |
| 这 90 页的 GSC 展示量 | **2,853** | `tmp/gsc-live-status.json`（GSC 真实导出） |
| top 15 页覆盖 | **2,096（73%）** | 同上排序 |
| top 20 页覆盖 | 2,307（81%） | 同上 |
| top 30 页覆盖 | 2,597（91%） | 同上 |
| G6 服务端↔客户端漂移 | 100 引擎 · 一致 50 · **漂移 50** | `tests/scripts/p168-server-client-parity.ts` |
| 可见双美元号（`$$`） | **136 处 / 14 页（7 引擎）** | `dist/**` 扫描（线上已确认可见）；**140 = 源码 20 处缺陷 × 每处在页面上出现多次**（卡片正文 + `data-export` + `data-calc-output-raw`） |
| 非工具 zh 页（about / terms / 主题 / 指南 / 对比页）同类缺陷 | **0** | 全量可见文本扫描 ⇒ **待办 #8 就此关闭** |

### 0.3 GSC 交叉证据（0 点击的 zh 页与英文卡片高度重合）

- 「有排名 0 点击」待铺页 **227** 个（zh 101 / en 126），其中 **zh 工具页 77** 个（2,403 展示）；
- 这 77 个里 **66 个卡片仍是英文**（**2,200 展示**）；
- ⭐ **已经铺过决策支持却仍然 0 点击的 4 个 zh 页**（burn-rate / cac / ltv-by-channel / gdpr-fine）
  **卡片全部是英文** ⇒ 决策支持铺开没有解决 0 点击，英文卡片是它们唯一还剩下的共同特征。

⚠️ **诚实边界**：以上是**相关不是因果**（0 点击也可能来自查询意图不匹配、SERP 摘要、排名位次）。
真实效果只能等 GSC 2~4 周窗口复审。本批的定位是「把已知缺陷修掉」，不是「保证 CTR 上涨」。

### 0.4 被实测否决的替代方案（先量覆盖率再评估，不凭直觉）

| 替代方案 | 实测 | 结论 |
|---|---|---|
| 渲染期「行表」覆盖（完全不改引擎） | 1,081 行里**唯一行 1,078**、数字掩码后**唯一骨架 983** ⇒ 几乎无复用 | **否决**：需写 1,078 条几乎不重复的映射，维护成本比改引擎更高 |
| 渲染期「只翻冒号前的标签」 | 匹配「静态标签: 值」的行 = **132 / 1,081 = 12%** | **否决**：只覆盖 12%，剩下 88% 仍是英文 ⇒ 半中半英的卡片比全英文更糟 |
| 改代码生成器批量生成 | `codegen-examples.mjs` 只重生成 `staticExamples[0]`（调用 `calculate()`），`codegen-customfn.mjs` 只重生成 pricing 数据表 | **否决**：英文文案是**每个引擎手写的**，没有生成器捷径 |

### 0.5 结论

必须逐引擎令牌化（B3-7 的机制），按 **GSC 真实展示量**分批收敛。**第一批 = top 15 引擎（73% 展示）**。

---

## 1. 目标与非目标

### 1.1 目标

1. 15 个引擎的 **zh 页结果卡片 0 整行英文**（248 行英文全部消失）；
2. **en 页逐字不变**（G9 钉死「token 化之前」的基线提交；仅 3 处**已登记**的有意改动除外）；
3. **服务端输出 ≡ 客户端 customFn 输出**（G6）；
4. 修掉 **7 引擎 20 处**可见 `$$` 双美元号缺陷；
5. 修掉 rental-yield 服务端「100% 全款」场景的**数值 bug**（1.08% → 6.89%）。

### 1.2 非目标（明确不做）

1. 剩余 75 个引擎（下一批，按同一流程）；
2. 决策支持铺开到 227 页（GSC 驱动，但 zh 侧要先有中文卡片才值得铺）；
3. **死键清理**（既有 B3-7 规格 §2.5 ③：与 `dead-i18n-keys-guard` 有依赖，风险外溢）；
4. GSC 2~4 周观察窗口复审（依赖时间）；
5. 其余 44 个漂移引擎的漂移修复；
6. `$$` 涉及的 3 处注释与 2 处合法 FAQ 示例（`"FREE"`、`"URGENT"`、`"$$$"` = 垃圾邮件敏感词示例，**必须保留**）。

---

## 2. 形态（完全复用 B3-7，不发明新机制）

### 2.1 token 协议

引擎两侧把「英文整行」改成「语义码 + 值」：

```ts
// 章节标题：整行包成一个码
result += makeToken('calc_out.section.time_value_snapshot', '💰 Time Value Snapshot') + '\n';

// 标签行：只包标签，冒号与对齐空格留在 token 之外（B3-7 的关键设计）
result += '• ' + makeToken('calc_out.label.annual_revenue', 'Annual Revenue') + ':      ' + fmt(v) + '\n';

// 整行码：数值抽成 params
result += makeToken('calc_out.time_value.row.total_interest', '(total ' + i + ')', { total: fmt(i) });
```

⛔ **禁止动态拼码**（B3-7 §10.2）：code 必须来自**字面量**，不得用变量拼出来
（否则 G2/G3 的「声明集合 == locale 键集合」判据无法静态提取）。

### 2.2 code 命名三族

| 族 | 形态 | 用途 |
|---|---|---|
| 章节 | `calc_out.section.<alias>_<section_slug>` | emoji 小节标题 |
| 共享标签 | `calc_out.label.<snake>` | 跨引擎复用的短标签（现有 142 个） |
| 工具独有行 | `calc_out.<alias>.row.<snake>` | 只属于本引擎的整行 |

⭐ **共享标签复用规则（防重复建键）**：新增标签前，**必须先在现有 `calc_out.label.*` 的 en 值集合里查有没有同文**
（同一英文文本 ⇒ 复用该键，不得新建）。审计工具会报出「同文多键」的重复。

### 2.3 locale 落库（文本插入，不是整文件重写）

- 落库只用 `scripts/write-calc-out-locale.mjs --src <file>`（**文本插入**）
  ⇒ `git diff` 只显示新增行 ⇒ 改动可审计（B3-7 教训：整文件 `JSON.stringify` 重排 = 不可审计）；
- 插入位置：紧跟 `decision_tip.*` 之后（locale 是**语义分组**不是字典序）；
- **en 值必须逐字等于源码原文**（G8）；**zh 值必须是中文**（G1）且占位符后的百分号不得丢失（G1b）。

### 2.4 与 legacy `translateCalcOutput` 的关系（自动降级，不需要分支逻辑）

既有 B3-7 规格 §2.5 已验证：渲染顺序是 **renderCalcOutput（token 替换）→ translateCalcOutput（legacy 整串替换）**。
token 化之后英文原文已从文本里消失 ⇒ legacy 整串替换对已 token 化的引擎**自动变成 no-op**
⇒ **不需要写任何分支逻辑**，也不需要为 legacy 机制加豁免。

### 2.5 注入子集自动裁剪

`src/lib/calc-output-templates.ts` 的 `codes` 参数按引擎声明的 code 集合裁剪注入表；
G12 / G12b / G4d 三条守卫读的是**引擎声明集合** ⇒ **自动扩展到新引擎，守卫本身不用改**。

---

## 3. 范围

### 3.1 15 个引擎（按 GSC 展示量降序）

| # | slug | 引擎文件 | alias | 展示 | 卡片行 | 英文行 | emoji 章节 | G6 漂移 |
|---|---|---|---|---|---|---|---|---|
| 1 | time-value | `src/engines/investment/time-value-calculator.ts` | time_value | 458 | 51 | 24 | 5 | — |
| 2 | freelance-rate | `src/engines/freelance/freelance-rate-calculator.ts` | freelance_rate | 320 | 51 | 17 | 6 | — |
| 3 | reorder-point | `src/engines/operations/reorder-point-calculator.ts` | reorder_point | 275 | 34 | 14 | 5 | — |
| 4 | feature-adoption | `src/engines/product-analytics/feature-adoption-calculator.ts` | feature_adoption | 189 | 5 | 5 | 0 | ✗ emoji + 措辞 |
| 5 | safe-convertible-note | `src/engines/valuation/safe-convertible-note-calculator.ts` | safe_convertible_note | 133 | 51 | 23 | 6 | ✗ emoji |
| 6 | stripe-fee | `src/engines/valuation/stripe-fee-calculator.ts` | stripe_fee | 111 | 52 | 24 | 6 | ✗ 对齐空格 |
| 7 | stockout-cost | `src/engines/operations/stockout-cost-calculator.ts` | stockout_cost | 107 | 33 | 12 | 5 | — |
| 8 | ai-api-cost-comparison | `src/engines/ai-cost/ai-api-cost-comparison.ts` | ai_api_cost_comparison | 84 | 40 | 20 | 7 | ✗ 缺 2 段 |
| 9 | rental-yield | `src/engines/real-estate/rental-yield-calculator.ts` | rental_yield | 70 | 51 | 22 | 6 | ✗ **数值** |
| 10 | sales-velocity | `src/engines/sales/sales-velocity-calculator.ts` | sales_velocity | 66 | 34 | 13 | 6 | — |
| 11 | freelance-tax | `src/engines/investment/freelance-tax-calculator.ts` | freelance_tax | 62 | 54 | 25 | 6 | — |
| 12 | quota-attainment | `src/engines/sales/quota-attainment-calculator.ts` | quota_attainment | 59 | 32 | 13 | 7 | — |
| 13 | burn-rate | `src/engines/saas/burn-rate-calculator.ts` | burn_rate | 57 | 18 | 7 | 4 | ✗ 缺 3 段 + 裸 JSON tip |
| 14 | cart-abandonment-cost | `src/engines/marketing/cart-abandonment-cost-calculator.ts` | cart_abandonment_cost | 53 | 45 | 18 | 6 | — |
| 15 | inventory-turnover | `src/engines/operations/inventory-turnover-calculator.ts` | inventory_turnover | 52 | 34 | 11 | 5 | — |
| | **合计** | **15 个文件** | | **2,096** | **585** | **248** | **80** | **6 个漂移** |

### 3.2 并行分工（4 个 worker，文件互不重叠）

按**英文行数**（真实工作量）而非引擎数均分：

| worker | 引擎 | 英文行 | 展示 |
|---|---|---|---|
| W1 | time-value · safe-convertible-note · feature-adoption · inventory-turnover | 63 | 780 |
| W2 | stripe-fee · rental-yield · ai-api-cost-comparison · stockout-cost | 78 | 417 |
| W3 | freelance-rate · freelance-tax · cart-abandonment-cost · burn-rate | 67 | 492 |
| W4 | reorder-point · sales-velocity · quota-attainment | 40 | 507 |

⭐ **单引擎作用域闸门**（B3-7 §10.5 教训：全局断言会让并行 agent 看到对方的红，
实测发生过 agent 去改**不属于自己**的引擎）⇒ 每个 worker 只跑 `tests/scripts/p168-engine-check.ts` 的**自己那几个引擎**。

### 3.3 附带项 A：G6 漂移裁定（6 个引擎，逐例已定）

默认原则：**服务端为准**（SSR、`staticExamples[0]`、引擎单测都指向服务端）。
⛔ 但**数值分歧不适用**这条默认 —— rental-yield 是反例。

| 引擎 | 实测差异 | 裁定 |
|---|---|---|
| stripe-fee | 服务端 `fee:       $2`（对齐空格）vs 客户端 `fee: $2` | 客户端补齐对齐空格 |
| burn-rate | 客户端**少 3 段**（Burn Health / What-If / Break-Even） | 客户端补齐 3 段（与服务端逐字相同、同样令牌化） |
| burn-rate | ⚠️ **原写「tip 是裸 JSON ⇒ 改成合规 token 形态」—— 本条已作废，见 §10.8**（那个 JSON 是 P168 决策建议 i18n 的既定形态，不是缺陷） | ⛔ **tip 行一个字都别改** |
| ai-api-cost-comparison | 客户端缺「📅 Pricing last updated」与「🩺 Cost Health」两段 | **只补「🩺 Cost Health」**；「📅 Pricing last updated」**不要补** —— `codegen-examples.mjs:316-317` 写 `staticExamples[0]` 时会**过滤掉**它（注释原文 "UI badge covers it"），页面用**徽章**「📅 Data updated:」显示同一个日期 ⇒ 补了会与徽章重复显示 |
| safe-convertible-note | 服务端 `🟡 standard cap` vs 客户端 `💡 standard cap` | 客户端改回 🟡（服务端用 health band emoji，客户端误用 💡） |
| feature-adoption | 客户端用**文字 YELLOW** 代替 emoji，且措辞不同（`if 10% of non-adopters convert` vs `...convert this quarter`） | 客户端改回服务端的 emoji 与措辞 |
| **rental-yield** | **服务端 1.08% vs 客户端 6.89%** | **改服务端**（见 §3.5） |

### 3.4 附带项 B：`$$` 双美元号（7 引擎 20 处可见缺陷）

实测：全仓 `src/engines` 有 **24 处** `$$`，其中 **20 处是可见缺陷**、**2 处**是解释该 bug 的注释（P163 D1）、
**2 处**是合法 FAQ 示例（`"FREE"`、`"URGENT"`、`"$$$"` = 垃圾邮件敏感词示例，**必须保留**）⇒ 20 + 2 + 2 = 24。
产物侧：**136 处 / 14 页**（7 引擎 × 2 语言），线上已确认可见。

| 引擎 | 处数 | 在 top15 内 | 备注 |
|---|---|---|---|
| saas-valuation | 8 | 否 | ⚠️ **B3-7 试点，昨天刚上线** ⇒ 线上正显示「ARR 翻倍: `$$1,000,000` → `$$2,000,000`」 |
| affiliate-income | 5 | 否 | `$$12,000/yr` 等 5 处 |
| freelance-rate | 3 | **是** | `$$90/hr` / `$$113/hr` / `$$150/hr` |
| course-pricing | 1 | 否 | `Price point $$111.11` |
| email-list-revenue | 1 | 否 | `$$0.60/sub/yr`（另有 1 处合法 FAQ 不改） |
| hourly-vs-fixed | 1 | 否 | `saves $$1,000/yr` |
| unit-economics | 1 | 否 | `Current CAC $$300` |

⚠️ **「📅 Pricing last updated」这一行不在卡片正文里** —— 它被 codegen 在写 `staticExamples[0]` 时过滤掉（注释原文 "UI badge covers it"），页面改用**徽章**「📅 Data updated:」显示同一个日期 ⇒ **令牌化清单里没有它，worker 也不要去改它**（改了会让动态卡片与徽章重复显示）。

### 3.5 附带项 C：rental-yield 服务端数值 bug（用户已裁定：改服务端）

根因（已定位到源码 `src/engines/real-estate/rental-yield-calculator.ts`）：

```ts
// 服务端（第 120-123 行）
const coc100Down = cashOnCashReturn({ ...args, downPayment: purchasePrice });  // 100% down

// cashOnCashReturn（第 68-72 行）
const tci = totalCashInvested(inputs.downPayment, inputs.purchasePrice);   // 分母：全款 ✓
return (annualCashFlow(inputs) / tci) * 100;
// annualCashFlow（第 41-47 行）用的是 inputs.loanAmount ⇒ 分子仍是**带杠杆**现金流 ✗
```

⇒ 算出的是「带杠杆现金流 ÷ 全款投资额」= **1.08%**（口径不一致，无业务含义）。
客户端把贷款置 0（`la=0`）⇒ 得无杠杆 CoC = NOI ÷ (房价×1.03) = **6.89%**（量级与房价/租金自洽）⇒ **客户端是对的**。

**修法**：`cashOnCashReturn({ ...args, downPayment: purchasePrice, loanAmount: 0 })`。
**影响面**：仅「100% 全款」这一行 what-if 场景；主指标 CoC 不变。

---

## 4. 文件改动清单

### 4.1 修改

| 文件 | 改什么 |
|---|---|
| 15 个引擎源文件（§3.1） | 两侧 token 化 + §3.3 漂移裁定 + §3.4 `$$` + §3.5 数值修复 |
| `src/i18n/locales/en.json` | 新增 `calc_out.*` 键（en 值 = 源码原文逐字） |
| `src/i18n/locales/zh.json` | 同键的 zh 值（中文） |
| `tests/scripts/p168-en-page-parity.ts` | **基线改按引擎分组**（见 §6.3）+ `ALLOWED_DIFFS` 新增 3 条 |
| `tests/calc-output-en-parity-guard.test.ts` | 覆盖范围扩到 25 个引擎 + 白名单条目数自检 |
| `tests/calc-output-render-guard.test.ts` | **G4 的「无整行英文」扩到「已令牌化的 25 个引擎」= G13**（与 G4 同文件 ⇒ 一处守一处） |
| `tests/calc-output-i18n-guard.test.ts` | G12 / G12b 覆盖范围扩到本批 15 引擎（自动，读引擎声明集合） |

### 4.2 新建

| 文件 | 作用 |
|---|---|
| `tests/calc-output-no-dd-guard.test.ts` | **G14**：产物层 0 处 `$$` |
| `tests/scripts/p168-b3-8-audit.ts` | 可复算体检：逐引擎卡片行 / 英文行 / 展示量 / 判定 |

⛔ 验收工具放 `tests/scripts/` 且名字**不带** `.test.ts`
（`walkTestSuites` 只收该后缀，否则套件计数漂移、meta-守卫变红）。

---

## 5. 执行顺序（依赖链）

```
Step 0  基线固化：BASELINE_SHA 改按引擎分组（试点 10 → d3b3c1d；本批 15 → 5c1c789）
        + 新增 G13 / G14 守卫（此时应红：G13 抓 248 行英文，G14 抓 140 处 $$）
Step 1  4 个 worker 并行令牌化（各自只碰自己的引擎文件 + 各自的 locale 条目）
        + §3.3 漂移裁定 + §3.4 $$ 修复 + §3.5 数值修复
Step 2  controller 合并 locale（文本插入工具）→ 跑全部守卫 → tsc → 构建
Step 3  全量 CI 等价套件（RUN_BUILD_TESTS=1 SKIP_INDEXNOW=1 node tests/run.mjs）
Step 4  提交（1 个 commit）→ push 双远端 → CI 绿 → 线上复验 15 个 zh 页
Step 5  CHANGELOG / AGENTS 同步 + 验收工具入库
```

---

## 6. 验收判据（全部可复算；一条不变量只守一处）

### 6.1 既有守卫（自动扩展到本批 15 引擎）

| 判据 | 含义 | 守卫 |
|---|---|---|
| G1 | `calc_out.*` 的 zh 译文不是英文原文 / 不是占位 / 厚度达标 | `tests/calc-output-i18n-guard.test.ts` |
| G1b | 占位符后的百分号不得在 zh 侧丢失 | 同上 |
| G2 | 模板表守恒（引擎声明的 token 集合 == locale 键集合，双向） | 同上 |
| G2c | token 字面量符合协议（code 合法、fallback 不含半角竖线） | 同上 |
| G3 | `customFn` 声明的 token 集合 == `calculate()` 声明的 token 集合 | 同上 |
| G6 | 服务端输出 ≡ 客户端 customFn 输出 | `tests/calc-output-parity-guard.test.ts` |
| G8 | 兜底渲染 ≡ locale.en 模板渲染 | `tests/calc-output-render-parity-guard.test.ts` |
| G9 | 英文页零变化（除已登记的有意改动） | `tests/calc-output-en-parity-guard.test.ts` |
| G12 | 注入的模板子集**恰好等于**本引擎声明的 code 集合（en/zh 都有值） | `tests/calc-output-i18n-guard.test.ts` |
| G12b | 页面必须真的把 code 集合传给模板函数 | 同上 |
| G4d | 产物层注入的模板表**恰好等于**引擎声明集合 | `tests/calc-output-render-guard.test.ts` |

### 6.2 新增两条守卫

**G13（zh 页 0 整行英文，产物层）** —— 实测依据：现 15 引擎 248 行违反。
把 B3-7 G4 的「无整行英文」从 10 个试点扩到**已令牌化的 25 个引擎**（试点 10 + 本批 15）。
⚠️ **不是全仓 100 个**：其余 75 个引擎尚未令牌化，卡片仍是英文 ⇒ 对它们不适用（那正是下一批的目标）。
⚠️ **与 G4 同文件、同断言**（一处守一处）⇒ 不新建第二个「无整行英文」守卫。
⚠️ 复用既有 `tests/scripts/p168-card-text.mjs` 的 `staticCard` / `isEnglishLine`（不另写一套判定）。

**G14（产物页 0 处 `$$`，产物层）** —— 实测依据：现 7 引擎 140 处违反。
⛔ 必须**排除**合法的 `"$$$"`（FAQ 里的垃圾邮件敏感词示例，2 处）⇒ 判据是「`$$` 后面不跟 `$`」，
即 `\$\$[\$\d]` 形态才算缺陷。

### 6.3 G9 基线改造（⭐ 本批的关键机制改动）

现状：`BASELINE_SHA` 是**单个全局 SHA**（`d3b3c1d` = B3-7 令牌化之前），且只测 10 个试点。
本批需要**两个不同基线**：

| 组 | 基线 | 理由 |
|---|---|---|
| B3-7 的 10 个试点 | `d3b3c1d`（不变） | 保持既有判据不变 |
| B3-8 的 15 个引擎 | `5c1c789`（本批令牌化之前的最后一个提交） | 基线必须钉在**该组令牌化之前** |

⇒ `BASELINE_SHA`（单值）改为**按 slug 分组的基线表**；
基线自检（「不得用 HEAD」+「基线里不得出现 token」）改为**按组判定**。

⭐ **有意改动白名单**（`ALLOWED_DIFFS`）新增 3 条，**每条必须写明理由**：

| 引擎 | 允许的差异 | 理由 |
|---|---|---|
| saas-valuation | 8 处 `$$` 相关 | 修 `$$` 双美元号缺陷（§3.4）⇒ en 页故意变 |
| freelance-rate | 3 处 `$$` 相关 | 同上 |
| rental-yield | `1.08%` 相关 | 修服务端数值 bug（§3.5）⇒ en 页故意变 |

⚠️ 白名单条目按**子串**匹配 diff 行（B3-7 实现语义）⇒ 必须写具体值（如 `CoC → 1.08%`），
⛔ **不得**写 `$$` 这种泛化子串（那会让任何 `$$` 差异都被放行 ⇒ G14 才是兜底）。
⚠️ 守卫里「白名单条目数 == 1」这种硬编码自检**必须**改成与实际条目数一致（否则每批都会漂）。

### 6.4 可复算工具

| 工具 | 作用 |
|---|---|
| `tests/scripts/p168-server-client-parity.ts` | G6（已有） |
| `tests/scripts/p168-render-parity.ts` | G8（已有） |
| `tests/scripts/p168-en-page-parity.ts` | G9（已有，本批扩范围 + 改基线机制） |
| `tests/scripts/p168-engine-check.ts` | **单引擎作用域闸门**（并行改造的必备件，B3-7 §10.5） |
| `tests/scripts/p168-injection-subset-audit.ts` | 注入子集裁剪体检（已有） |
| `tests/scripts/p168-b3-8-audit.ts` | **新建**：逐引擎卡片行 / 英文行 / 展示量 / 判定 |

---

## 7. 风险与缓解

| # | 风险 | 缓解 |
|---|---|---|
| 1 | 并行 agent 越界改别人的引擎（B3-7 实测发生过） | 文件所有权不重叠 + 单引擎作用域闸门 + worker 只报自己的引擎 |
| 2 | en 页意外变化 | G9 钉死基线；3 处有意改动登记在白名单 |
| 3 | locale 整文件重排导致 diff 不可审计 | 只用文本插入工具（`write-calc-out-locale.mjs`） |
| 4 | zh 译文质量（英文残留 / 占位符丢失） | G1（不是英文原文）+ G1b（百分号不丢）+ G13（0 整行英文） |
| 5 | ⚠️ **emoji 手打导致码位错位**（B3-7 实测图表 emoji 变 💢） | **zh 值的 emoji 从 en 值原样复制**，正文中文才由 worker 撰写 |
| 6 | 共享标签重复建键 | 复用规则（§2.2）+ 审计工具报「同文多键」 |
| 7 | 半中半英（部分行没令牌化） | G13 抓「整行英文」；worker 必须覆盖**全部**英文行（248 行有清单） |
| 8 | G9 基线改造引入真空绿 | 基线自检改为按组判定；G13 / G14 独立于 G9，互为兜底 |

---

## 8. 维度 3 scan

**基于信号 / ① GSC 真实导出（站外市场信号）** —— 2,853 展示的分布（top15 = 73%、top30 = 91%）直接决定了批次大小；
227 个「有排名 0 点击」待铺页里 zh 工具页 77 个、其中 66 个卡片仍是英文（2,200 展示）；
且**已铺决策支持仍 0 点击的 4 个 zh 页卡片全部是英文** ⇒ 本批优先修英文卡片，而非先铺决策支持。
**② 构建产物实测** —— 90 页 / 1,081 行英文 / 140 处 `$$` / 唯一行 1,078 / 标签形态覆盖 12%
⇒ 既定死了「必须逐引擎令牌化」，也否决了「渲染期行表」这条看似便宜的路。
**③ 源码级审计** —— `codegen-examples.mjs` 只重生成 `staticExamples[0]`、`codegen-customfn.mjs` 只重生成 pricing 数据表
⇒ 英文文案是手写的 ⇒ 无生成器捷径；G6 漂移逐例 diff 后发现 5 例是格式/缺失、**1 例是服务端真 bug**
⇒ 推翻了「服务端永远是真相源」这条默认规则（数值分歧必须逐例裁定）。
⚠️ **仍无实时外部网页扫描**（本批未做竞品/模型 release 扫描）—— 但 GSC 导出本身就是外部市场信号。

---

## 9. 未解决 / 下一批

1. 剩余 **75 个引擎**（展示量 top16~90）—— 同一流程，预计再 4~5 批；
2. 其余 **44 个漂移引擎**（本批只碰 6 个）—— 需逐例 diff 后裁定，**不能盲目「客户端对齐服务端」**；
3. **决策支持铺开到 227 页** —— zh 侧应在卡片中文化之后做；en 侧（105 个工具页有展示）可独立推进；
4. codegen 剩余 15 个引擎 `defaultInputs` 错配 —— 影响用户首次打开看到的默认值；
5. GSC **2~4 周观察窗口** —— 复审 zh 页 CTR / 索引率是否因本批回升（这是唯一能证实因果的环节）；
6. GSC 4 条孤儿查询 / 204 个 404 的 URL 级明细 / 21 个候选页逐 URL 数据 —— 依赖 GSC API 权限与窗口。

---

---

## 10. 实施期实测修正（2026-11-16 实施中补写）

### 10.1 ⭐⭐ `$$` 的根因不是「陈旧 staticExamples」，而是**真运行时缺陷**

| 项 | 计划原本的写法 | 实测 | 处置 |
|---|---|---|---|
| `$$` 出现在哪 | §0.6 说「修在输出字符串里」 | **只在 `staticExamples[0]` 里出现过一次**，差点误判成「重生成产物即可」 | 用 `node scripts/codegen-examples.mjs --check` 裁决 |
| 裁决证据 | — | saas-valuation / affiliate-income / course-pricing / email-list-revenue / hourly-vs-fixed / unit-economics **全部「in sync」** ⇒ `staticExamples[0]` 与运行时**一致** | ⇒ `$$` 是运行时**真的吐出来**的 |
| 真根因 | 未写 | `fmt()` / `fmt2()` / `fmt0()` **自带 `$`**，调用处又拼了一个字面量 `'$'` ⇒ `'$' + fmt(x)` = `$$x` | 去掉调用处多余的 `'$'`（**不改 `fmt()` 的行为**） |
| 两侧 | 未强调 | **服务端与客户端 customFn 各有一份镜像** ⇒ 两边都要改 | 实测服务端 **20** 处 / 客户端 **20** 处 |

⚠️ **处数更正**：Task 7（6 个非本批引擎）实际是 **17 处**（saas-valuation 8 · affiliate-income 5 · course-pricing 1 · email-list-revenue 1 · hourly-vs-fixed 1 · unit-economics 1），freelance-rate 的 **3 处**归 W3 ⇒ 合计 20 ✓ 与 §0.6 的总数一致。

⭐⭐ **判据教训**：「这个缺陷是陈旧产物还是真缺陷」**不能靠读源码时看见它在 `staticExamples` 里就下结论** —— 必须拿一个**独立的可复算判据**去裁决（这里是 `codegen-examples --check` 的「in sync / DRIFT」）⇒ 否则会把「真缺陷」当「产物陈旧」而漏修。

### 10.2 ⭐⭐ G14 的判据必须**两侧都看**：`(?<!\$)\$\$(?!\$)`

- 只看右侧（`\$\$(?!\$)`）时，合法字面量 `"$$$"`（垃圾邮件敏感词示例，FAQ 里的原文）会在**位置 1 再匹配一次** ⇒ 误报 2 处。
- ⇒ 判据 = `(?<!\$)\$\$(?!\$)`：**前后都不挨着 `$`** 才算缺陷。
- 实测（修复前）：**产物 14 页 / 136 处**；源码 24 处 = **20 缺陷 + 2 注释 + 2 合法 FAQ**。

### 10.3 ⭐⭐ locale 的英文模板必须从**源码**推导，不能只靠运行时求值

- 运行时求值（跑 `generate()` + 客户端 `customFn`）**只覆盖默认输入走到的分支** ⇒ 实测 **48 个 code 拿不到英文模板**（健康度档位 / 错误提示 / 分支提示）。
- ⇒ 若只靠运行时落库，这 48 个键会缺 ⇒ 用户换一组输入就会在 zh 页看到**裸 token**。
- 解法：新增 **`tests/scripts/p168-locale-source.ts`** —— 解析源码里的两种 token 形态：
  ① 字面量形态 `$code|英文原文|`（可选带 params 组）⇒ 英文 = 原文，params 取值换回 `{param}`；
  ② 构造器形态 `makeToken('code', <表达式>, {参数})` ⇒ 把参数的**源表达式**替换成 `'{param}'` 后再求值 ⇒ 英文模板。
- ⭐⭐ **自证机制**：源码推导的模板必须与运行时实测的模板**逐字相同**（两者都拿到的 code）⇒ 不一致就报 conflict。
  实测 **3 处 conflict**，全部是源码推导侧的问题（源码里 `\'` 转义没还原 / fallback 是变量求不出）⇒ **以运行时为准**（源码只负责补齐运行时覆盖不到的分支）。
- ⚠️ **提取器的 CLI 必须在「本文件是入口」时才跑** —— 否则被合并工具 `import` 时也跑 ⇒ 把 `tmp/p168-locale-extract.json` 覆盖成**空数据** ⇒ 翻译 worker 拿到空清单（已修：加入口判定 + 重新生成）。

### 10.4 ⭐⭐ 「对齐空格留在 token 之外」是硬要求 —— G9 会当场抓住

- W1 的 `inventory-turnover` 把 `Industry:` 的 **11 个对齐空格**并进了兜底 ⇒ G9 实测 **1 处未记录差异**：
  `• Industry:           general (benchmark 6x)` → `• Industry: general (benchmark 6x)`。
- 修法：拆成**标签键** `calc_out.label.industry`（原文 `Industry`）+ **值行** `calc_out.inventory_turnover.row.industry_benchmark_value`，**对齐空格留在 token 之外**。

### 10.5 ⭐⭐ token 必须是 `$code|英文原文|` **三段齐全** —— G9 也是「token 形态合法性」的守卫

- W2 的 `stripe_fee` 半成品写成 `$calc_out.label.fee|:       $2`（**缺 `|英文原文|` 段**）⇒ 渲染器拿不到兜底 ⇒ 页面会显示**裸 token** `$calc_out.label.fee` ⇒ G9 实测 **5 处未记录差异**。
- ⇒ **G9 的价值不止「英文页零变化」**：token 形态写错 ⇒ 英文页必然变 ⇒ G9 立刻红 ⇒ 它顺带成了 token 形态的守卫。

### 10.6 其余实测更正

| # | 计划原文 | 实测 | 处置 |
|---|---|---|---|
| 1 | Task 2 预期表写 G12b（服务端/客户端 code 集合）会红 | **实测是绿的** | 预期表更正（不影响实现） |
| 2 | 落库「文本插入，不是整文件重写」 | `JSON.stringify(obj, null, 2) + '\n'` 与现有 locale 文件**逐字节相同**（实测 en 1,091,401 B / zh 816,469 B 往返一致）⇒ 可以安全地整文件重写，但仍按「只插入、不重排既有键」实现（段内有 2 处 B3-7 留下的逆序 ⇒ 整段排序会产生无关 diff） | 落库工具 `tests/scripts/p168-locale-merge.ts` |
| 3 | zh 译文由人工逐条写 | **zh 值 = 「en 值的前导 emoji」+「中文正文」** ⇒ 中文正文**不手打 emoji**（手打 emoji 有被代理转义弄坏码位的风险）⇒ 由落库工具补前导 emoji；合成时若中文正文也以 emoji 开头 ⇒ 先剥掉（否则两个 emoji） | 同上 |
| 4 | AGENTS.md 套件计数 | 新增 1 个 **build-dep** 守卫（G14）⇒ **66 → 67** build-dep，总数 **291 → 292**（source-only **225** 不变） | 已与 commit A 同批更新 |
| 5 | 并行纪律 | 首次派发的 **4 个 worker 全部因上游 429（Token Plan 用量上限）中断** ⇒ 重派后正常 | ⇒ **派发前先确认配额**；且 **locale 这类共享文件绝不能放进并行 worker**（由控制器统一落库） |

### 10.7 本批的有意差异（`ALLOWED_DIFFS`）

| 引擎 | 差异 | 白名单标记 |
|---|---|---|
| `solopreneur-saas-valuation-calculator` | 双美元号修复（4 行：`$$1,000,000` → `$1,000,000` 等） | `['$$']` |
| `solopreneur-freelance-rate-calculator` | 双美元号修复（3 行） | `['$$']` |
| `solopreneur-rental-yield-calculator` | 服务端 CoC bug 修复（**1.08% → 6.89%**，1 行） | `['CoC → 6.89%']`（**整段短语**，不是光一个 `6.89%` ⇒ 这行将来因别的原因再变 ⇒ 白名单不匹配 ⇒ CI 变红 ⇒ 强制复审） |

⭐ **`$$` 作标记为什么安全**：修复后该页**已无任何 `$$`** ⇒ 未来任何含 `$$` 的差异**只能是「双美元号又回来了」** ⇒ 正是这条白名单要拦的 ⇒ 不会顺带放过别的改动。

### 10.8 `burn_rate` 的 tip JSON 形态**不是缺陷** —— 原计划「tip 改合规 token 形态」这条**作废**

**原计划原文**（spec §0.5 / plan §0.5 漂移裁定表 + W3 任务书）：
「burn-rate …… 且 tip 是裸 JSON `Tip: {"code":...}` 不合 token 协议 ⇒ 客户端补齐 3 段 + **tip 改合规 token 形态**」。

**实测复核（2026-11-16）**：这个 JSON 形态**是 P168 批次 3 第一阶段的既定成果**，**不是缺陷**：

| 证据 | 位置 |
|---|---|
| 决策层有专门解析器 `parseDecisionTip`（读 `code` + `params`） | `src/lib/decision-support.ts:91,100` |
| 英文句子在 `decision_tip.<code>` locale 模板里（zh 缺键自动回退 en） | `src/i18n/locales/{en,zh}.json` |
| 有守卫钉住这个形态（`parseDecisionTip('{"code":"burn_high_burn","params":{}}')`） | `tests/decision-tip-i18n-guard.test.ts:23,58,120` |
| 卡片正文里这一行**本来就不会显示** —— `isCalcOutputTipLine` 把含 `Tip:` 的行整条过滤，tip 由决策层单独渲染 | `src/lib/calc-output-i18n.ts:49-56` |

⇒ **改成 `$calc_out.*` token 会让 `decision-tip-i18n-guard` 变红**（它断言的正是这个 JSON 形态），而且会丢掉「改措辞不动引擎」这个能力。

⇒ **处置**：**burn_rate 的 tip 行一个字都不改**；只做「卡片 7 行令牌化 + 客户端补齐 3 段（与服务端逐字相同、同样令牌化）」。
⇒ 已写进 R 波 `brief-w4r.md` 的硬约束，并在 recipe.md / spec / plan 的 §0.5 行就地标注「本条已作废」。

⭐⭐ **可复用的判据**：看到「裸 JSON / 裸码 / 看起来不合协议」的输出，**先查它是不是另一个已落地机制的载体**，再决定要不要「统一」。
本批已有一个**同方向**的案例（`Pricing last updated` 那一行**不要补** —— 页面用徽章显示同一日期）⇒ **同一条判据，两个方向都成立**。


### 10.9 ⭐⭐ 提取器的两个**静默失败** —— 不报错、只是「推不出来」

Task 8 落库后重跑提取器得到 **newKeys = 0**（幂等达成），但 G3 报出 **25 个「分支专属 token 缺 locale 键」** ⇒ 两者矛盾 ⇒ 说明提取器**漏推**了。

**根因 ①：占位符被二次命中**
`p168-locale-source.ts` 的 `templateFromExpr` 先把 `pct` 替换成 `{pct}` 占位符，**随后**又去扫「标识符候选」⇒ `pct` 在 `'{pct}'` 里又被命中一次 ⇒ 生成 `'{ {pct} }'` 形态的非法 JS ⇒ 推导**静默失败**（异常被吞）⇒ 整条分支的模板推不出来。
**修法**：**哨兵两阶段替换**（U+0001 / U+0002 占位）—— 第一阶段把参数值换成哨兵，第二阶段才把哨兵换成 `{param}` ⇒ 参数值**不可能**再被当成标识符命中；字符串字面量**单独保护**，不参与标识符扫描。

**根因 ②：`splitCodeStrings` 的 off-by-one**
该函数用 `while` 循环逐字符扫字符串字面量，遇到**转义撇号**时 `continue` **跳过了 `i++`** ⇒ 下一次循环从撇号**之后**的字符重新开始 ⇒ 引号状态错乱 ⇒ 后面的字符串边界全乱。
**修法**：改成「向前找候选 + 验证配对」；`readArgs`（`for` 循环）**保持 `src[++i]` 语义不变**。

⭐⭐ **判据**：**「不报错」不等于「算对了」**。提取器的失败模式是「静默返回空」⇒ 必须有**独立信号**（G3 报缺键）与**它**对账 ⇒ 两者不一致就说明有一个在骗人。

### 10.10 ⭐⭐ 静态推导对三类 fallback **无能为力** ⇒ 必须上运行时探针

Task 8.5 实测：`p168-locale-extract.ts` 的**源码推导**对这三类**无解**：

| 类别 | 例子 | 为什么静态推不出来 |
|---|---|---|
| 运行时变量 | `params.initial` 的值来自 `PROVIDER_INITIAL[provider]` | 值不在源码里 |
| 含未定义函数的表达式 | `makeToken(code, fmt(x) + ' ' + y)` | 需要执行上下文 |
| 跨字符串拼接的 params | `params: { hours: loc(billableHrs) }` | params 的值是另一个表达式 |

**解法 = 运行时分支探针**（`tests/scripts/p168-locale-branch-probe.ts`，**已入库**）：

1. **fuzz 输入**（number 多量级 + select 全遍历 + 每个 number 单独取 0 + 全 0 组合）；
2. 跑服务端 `generate()` 与客户端 `customFn` ⇒ 捕获**默认路径走不到**的分支 token；
3. 用 `substituteAll` **反推英文模板**；
4. **round-trip 校验**（模板回填必须**逐字**等于 fallback）—— 反推错了就红；
5. **众数模式消歧**（同一 code 在不同输入下 fallback 不同 ⇒ 取众数）—— 冲突从 **79 → 1**。

⚠️ **死分支仍到不了**（`safe_convertible_note` 的 `postMoneyCap <= investment` 分支被上游守卫拦死，探针与静态推导都到不了）⇒ 手工补 2 条（`tests/scripts/p168-locale-manual.ts`）。
⚠️ **取值替换必须按词边界**（新增 `replaceWordValue`，extract/probe 共用）：`params.initial` 的值只有单字符 `'O'` ⇒ 朴素替换会把 `OpenAI` 里的 `O` 也换掉 ⇒ 模板污染 ⇒ 规则：**只有取值的首/尾字符是单词字符时，才要求该侧边界非单词字符**。
⚠️ **提取器的三来源合并顺序**：源码推导（结构化，最权威）> 默认运行时实测 > 分支探针 > 手工补（仅死分支）；merge 工具的 en 值取自提取器的 `newKeys` ⇒ **探针必须并入提取器**，否则并入的键会因「不在 newKeys 里」被丢弃。

### 10.11 ⭐ 守卫检测器的字面量边界必须「**配对**」而非「最近引号」

`tests/calc-output-i18n-guard.test.ts` 的 `enclosingLiteral` 原按「**最近的引号**」找边界 ⇒ 字面量**内含另一种引号**时找错边界 ⇒ **3 条假红**（`ai_api` 的 `health_tradeoffs` / `feature_adoption` 的 `tip_activation_pairing` / `burn_rate` 的 `insight_burning_faster`）。
**修法**：「向前找候选 + 验证 `pos` 落在区间内」；构造器分支**跳过位于 TS 字符串内部的调用**（客户端 `customFn` 的 JS 层转义层级与 TS 文件不同 ⇒ 实参会被切错几十行）；**收尾 `|` 判定改用行级**（协议规定 fallback 不跨行 ⇒ 这是协议自带约束，不依赖字面量边界算得准不准）；新增检测器自检 4（字面量内含另一种引号时边界仍配对）。
⚠️ 中间试过「全局扫描所有字面量区间」的方案 ⇒ **被正则字面量里的引号带偏** ⇒ 误报 `coupon_attribution` 3 条 ⇒ **否掉**。

### 10.12 ⭐⭐⭐ `customFn` 返回**多元素数组** ⇒ 动态卡片**只剩第一行**（真 bug，本批修）

**实测**：`solopreneur-ai-api-cost-comparison` 的 `customFn` 末行是 `return o;`（`o` 是 53 元素的**行数组**）⇒ 页面 `src/pages/[lang]/[slug].astro:2171-2172` 对 `type === 'custom'` 的引擎**只渲染 `results[0]`** ⇒ **用户在「计算」后看到的是一张空白卡片**（`results[0]` 是空串）。

⭐ **这个 bug 早于本批**（B3-7 试点就已存在）⇒ 本批因令牌化把它暴露出来：`customfn-contract-guard` 的 M4/M5 断言「`results[0]` 不得是空串」⇒ **真 bug 被守卫抓住**（这正是守卫的价值：它守的是**契约**不是**当前形态**）。

**修法**：`return [o.join('\n')];`（单元素数组 = 整份输出）⇒ 与全仓 **93 个业务引擎**的 `return [r]` 一致 ⇒ 动态卡片与静态卡片结构对齐。
⚠️ **G6 不受影响**：`o.join('\n')` 与服务端 `out.join('\n')` **逐字相同** ⇒ 「服务端输出 ≡ 客户端输出」仍成立（守卫已复验绿）。
⚠️ **另外 6 个 AI cost 引擎是同样的形态**（claude / gemini / deepseek / ai-image / ai-training / gpu-cloud，`return o;`）⇒ **同样的空白动态卡片** ⇒ **不在本批授权范围**（GSC top15 之外）⇒ 记入 §11 待办，**下一批带上**（改法同上，一行）。

### 10.13 ⭐⭐ zh 章节文案必须与**既有 legacy 键逐字对齐**，否则产物层守卫红

令牌化后，zh 页的章节标题改由 `calc_out.section.*` 提供 ⇒ 但**产物层**还有一条既有守卫（`tests/dead-i18n-keys-guard.test.ts` 的 `WORKING_KEY_REQUIRED`）要求**特定中文标题字符串出现在产物里** ⇒ 实测 **22 条缺失**。

**根因**：新写的 `calc_out.section.*` 中文值与**旧 legacy 键**（`engine_health.*` / `engine_snapshot.*` / `engine_projection.*` / `engine_break_even.*` / `engine_breakdown.*`）**措辞或标点不一致** —— 典型三种：

| 新键（落库时写） | 旧键（产物层期望） | 差异 |
|---|---|---|
| `🩺 烧钱健康度：` | `🩺 烧钱健康:` | 加了「度」+ **全角冒号** |
| `🎯 季度预缴计划：` | `🎯 季度付款计划:` | 改词 + 全角冒号 |
| `🎯 达成目标所需时间：` | `🎯 目标时间:` | 改词 + 全角冒号 |

**修法（24 键）**：**从仓库自己的 legacy 键反查**（按 **EN 值**匹配 + **冒号存在性**必须一致）⇒ 取 legacy 的**措辞**、取源头的 **emoji**、按源头的**冒号存在性**补冒号 ⇒ 落库（实测：改动 24 键 · 新增 0 · 删除 0）。

⭐⭐ **判据**：**新键的 zh 值不能「另起炉灶写文案」** ⇒ zh 页的章节标题是**跨引擎共享**的（`engine_health.*` 已被 **P111~P119** 铺到 60+ 引擎）⇒ 新旧两套键**必须逐字一致**，否则同一页的两处渲染会给出两个措辞。
⚠️ **emoji 必须从源 en 值取**（把 `legacyZh` 里的 emoji 剥掉再拼源头的）—— 否则 `ai_cost.section.cost_breakdown`（`💰 成本明细`）会把 `📐 成本拆解：` 的 emoji 换掉。
⚠️ **冒号存在性必须参与匹配**：不参与时会把 `⚖️ 盈亏平衡:` 误配到 `⚖️ 盈亏平衡`（无冒号）⇒ 产物层守卫照样红。
⚠️ **匹配必须「唯一」才改**：同一 EN 值若对应多个 legacy 键且**中文值不一致** ⇒ 判为**冲突**并跳过（实测本批冲突 0）。

### 10.14 ⭐ `tools.<slug>.decision_*` 键缺失**不是本批回归**

本批实测有 6 个引擎缺 `tools.<slug>.decision_{goal,recommendation,constraint,next_tool}` 4 个键（en + zh 都缺）⇒ 页面的 `decisionTextReady` 为 false ⇒ 「🧭 算完之后」区块不渲染。
**核对结论**：locale 里 `decision_*` 键共 **84** 个，**全部在基线 `5c1c789` 就存在**，本批**新增 0** ⇒ **不是本批回归**，而是「决策支持铺开到 227 页」这条**独立待办**的覆盖缺口。
⇒ **本批不动**（宪法：AI 不得擅自扩范围）⇒ 已记入 §11 待办。

### 10.15 ⭐⭐⭐ 「SSR 层绿」≠「用户所见绿」—— 客户端美化层会**自己造文案**

**实测（Task 10 浏览器目视验收，2026-11-16）**：zh 页的静态卡片上仍有一行**整行英文** ——「📊 Usage Scenarios (monthly costs)」。

⭐ **根因不在引擎，也不在 locale**：在 `src/pages/[lang]/[slug].astro` 的**客户端** `beautifySections()` 里 —— 它**自己写了面向用户的英文标题**：

| 位置 | 硬编码标题 |
|---|---|
| `1695` | `💰 Savings Insights` |
| `1721` | `📊 Usage Scenarios (monthly costs)` |

这两个标题**覆盖**了 token 渲染出来的中文标题。

⭐⭐⭐ **为什么产物层守卫抓不到（本轮最重要的判据教训）**：

- 产物层守卫（G4c / G13 等）读的是 **SSR 出来的 HTML**；
- beautify 是**浏览器里的后处理**（`staticMono.innerHTML = beautifySections(...)`，`[slug].astro:2073`）⇒ **SSR HTML 里根本没有这两行**；
- ⇒ 「zh 页 0 整行英文」在 SSR 层**是真的** ⇒ 守卫绿 ⇒ **用户却看到英文**。

⇒ ⭐⭐ **结论：SSR 层绿 ≠ 用户所见绿** ⇒ 必须有一条**能看见客户端插入内容**的判据。

⭐⭐ **修法**：**beautify 不再自己造文案** —— 标题改为**取原文那一行**（原文是 token 原文 ⇒ 保留 token ⇒ `src/scripts/calc-output.client.ts` 扫 DOM 时把它换成 zh 模板）。
这与同文件里**另外 5 处**标题（`esc(lines[0])` / `esc(cardLines[0].trim())` / `esc(blines[0])` / `esc(glines[0])` / `esc(titleLine)`）**本来的写法一致** ⇒ **那 5 处实测就是中文** ⇒ 这是「用既有的正确做法修」，不是新发明。

⭐⭐⭐ **新守卫（结构性判据，不是字符串黑名单）**：`tests/beautify-no-hardcoded-copy-guard.test.ts`

- 判据：**凡是把面向用户的文字直接写进 HTML 的地方，都必须来自原文**（可见文本含 ≥2 个英文词 ⇒ 违规）；
- 为什么阈值是 **2** 而不是产物层的 3：这里判的是「一段硬编码文案」不是「整行英文」——「💰 Savings Insights」只有 2 个词，但它是**面向用户的英文**；
- ⚠️ **变异台子当场抓到这个阈值错误**：第一版阈值 3 ⇒ M1（Savings Insights）**存活** ⇒ 收紧到 2 ⇒ **2/2 KILLED（精确红 1 条）**，还原 sha256 逐字节一致（台子入库：`tests/scripts/p168-beautify-copy-mutation.ts`）。

⚠️ **同族教训**：⭐⭐ **「守卫绿」必须追问一句「它测的那一层，用户真的看得到吗？」** —— 本轮之前 G4c 绿了 25 个引擎、「0 整行英文」，而用户在 ai-api 页看到的就是一行英文。
⭐⭐ **同族教训二**：⭐ **「同一个函数的 5 处写法对、第 6 处错」时，第 6 处几乎必然是「自己造文案」** ⇒ 审 beautify 这类**重排层**时，判据应该是「它有没有越过原文自己造字」。

⭐ **浏览器实测（Task 10，2026-11-16）**：本地 `dist` + `python -m http.server` + **iframe 批量加载**（iframe 里的页面脚本会真的执行 beautify ⇒ 测的是**用户所见**，不是 SSR HTML）：

| 批次 | 引擎 | 静态卡片整行英文 | 动态卡片整行英文 |
|---|---|---|---|
| 1 | time-value / freelance-rate / reorder-point / feature-adoption / safe-convertible-note | **0** | **0** |
| 2 | stripe-fee / stockout-cost / ai-api-cost-comparison / rental-yield / sales-velocity | **0** | **0** |
| 3 | freelance-tax / quota-attainment / burn-rate / cart-abandonment-cost / inventory-turnover | **0** | **0** |

⭐ **ai-api-cost-comparison 的动态卡片实测**：修复前 = **1 行空白**（`results[0]` 是空串 ⇒ 用户点「计算」后看到空卡片）；修复后 = **37 行完整报告 · 0 整行英文**。

### 10.16 ⭐⭐ 守卫的「子串匹配」会把 **token 名**误判成「建议码」—— 标识符必须按**词边界**匹配

**实测（全量套件第 3 批红）**：`decision-support-build-guard` 的「结果卡片里没有决策建议」判据红，报 en/zh 的 freelance-rate「结果卡片里还有建议码 `freelance_rate_market`」。

⭐ **根因不是「卡片里真的有建议码」** —— 实际查产物：`freelance_rate_market` 在 `static-results` 段里出现 **2 次**，两次都是 **token 名的一部分**：

- `data-calc-output-templates` 属性里的键 `"calc_out.section.freelance_rate_market_position"`
- `data-calc-output-raw` 属性里的 `$calc_out.section.freelance_rate_market_position|🩺 Market Position:|`

⇒ 判据用的是 `cardHtml.includes(tipCode)`（**子串**）⇒ 「**含建议码前缀的 token 名**」被误判 ⇒ **假红**。
⇒ 真正的建议码（`{"code":"freelance_rate_market"}`）在**段外**（customFn 源码里）⇒ 不构成「建议在卡片与决策区块各有一家」。

⭐ **修法**：按**词边界**匹配（标识符语义）：`(?<![A-Za-z0-9_])` + `(?![A-Za-z0-9_])`。

- `freelance_rate_market_position` ⇒ **不命中**（后面是 `_`）
- `{"code":"freelance_rate_market"}` ⇒ **命中**（前后是引号）

⚠️⚠️ **自检必须独立成 source-only 文件**（`tests/decision-tip-code-probe.test.ts`）：守卫文件是 **build-dep**（顶部 skip-guard ⇒ 无 build 时 `process.exit(0)`）⇒ 自检若放那里 ⇒ **source-only 模式下永远被跳过 ⇒ 真空绿** ⇒ 探针实现放共享夹具 `tests/_decision-support-fixture.ts`（无 skip-guard）+ 自检独立成套件。

⭐⭐ **判据**：⭐ **「这个字符串在页面里出现过」不等于「这个字符串是那个东西」** —— 子串匹配判**标识符**时，**必须带词边界**。
⭐ **同族教训**：⭐⭐ **B3-7 时这个守卫是绿的** —— 因为 10 个试点的 token 名里没有含建议码前缀的 ⇒ **同一段判据在不同的 token 命名下，结论相反** ⇒ 「守卫绿过」不等于「判据正确」。
