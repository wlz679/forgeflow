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
| 卡片仍有英文 | **90 页 / 1,081 行** | `tests/scripts/p168-card-text.mjs` 的 `staticCard` + `isEnglishLine` |
| 裸 token 泄漏 | **0** | 同上 |
| 这 90 页的 GSC 展示量 | **2,853** | `tmp/gsc-live-status.json`（GSC 真实导出） |
| top 15 页覆盖 | **2,096（73%）** | 同上排序 |
| top 20 页覆盖 | 2,307（81%） | 同上 |
| top 30 页覆盖 | 2,597（91%） | 同上 |
| G6 服务端↔客户端漂移 | 100 引擎 · 一致 50 · **漂移 50** | `tests/scripts/p168-server-client-parity.ts` |
| 可见双美元号（`$$`） | **140 处 / 14 页（7 引擎）** | `dist/**` 扫描（线上已确认可见）；**140 = 源码 20 处缺陷 × 每处在页面上出现多次**（卡片正文 + `data-export` + `data-calc-output-raw`） |
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
| burn-rate | 客户端**少 3 段**（Burn Health / What-If / Break-Even），且 tip 是裸 JSON `💡 Tip: {"code":...}` **不合 token 协议** | 客户端补齐 3 段 + tip 改成合规 token 形态 |
| ai-api-cost-comparison | 客户端缺「📅 Pricing last updated」与「🩺 Cost Health」两段 | 客户端补齐两段 |
| safe-convertible-note | 服务端 `🟡 standard cap` vs 客户端 `💡 standard cap` | 客户端改回 🟡（服务端用 health band emoji，客户端误用 💡） |
| feature-adoption | 客户端用**文字 YELLOW** 代替 emoji，且措辞不同（`if 10% of non-adopters convert` vs `...convert this quarter`） | 客户端改回服务端的 emoji 与措辞 |
| **rental-yield** | **服务端 1.08% vs 客户端 6.89%** | **改服务端**（见 §3.5） |

### 3.4 附带项 B：`$$` 双美元号（7 引擎 20 处可见缺陷）

实测：全仓 `src/engines` 有 **24 处** `$$`，其中 **20 处是可见缺陷**、**2 处**是解释该 bug 的注释（P163 D1）、
**2 处**是合法 FAQ 示例（`"FREE"`、`"URGENT"`、`"$$$"` = 垃圾邮件敏感词示例，**必须保留**）⇒ 20 + 2 + 2 = 24。
产物侧：**140 处 / 14 页**（7 引擎 × 2 语言），线上已确认可见。

| 引擎 | 处数 | 在 top15 内 | 备注 |
|---|---|---|---|
| saas-valuation | 8 | 否 | ⚠️ **B3-7 试点，昨天刚上线** ⇒ 线上正显示「ARR 翻倍: `$$1,000,000` → `$$2,000,000`」 |
| affiliate-income | 5 | 否 | `$$12,000/yr` 等 5 处 |
| freelance-rate | 3 | **是** | `$$90/hr` / `$$113/hr` / `$$150/hr` |
| course-pricing | 1 | 否 | `Price point $$111.11` |
| email-list-revenue | 1 | 否 | `$$0.60/sub/yr`（另有 1 处合法 FAQ 不改） |
| hourly-vs-fixed | 1 | 否 | `saves $$1,000/yr` |
| unit-economics | 1 | 否 | `Current CAC $$300` |

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

## 10. 实施期实测修正（实施时补写）

> 本节留空。实施过程中任何「计划与实测不符」的地方，**必须**在此记录并写明为什么改（沿用 B3-7 §10 的体例）。
