# P168 批次 3 · B3-8：zh 页结果卡片本地化铺开（第一批 = 展示量 top 15 引擎）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 B3-7 的「引擎吐语义码 + zh 侧查 locale 拼装」铺开到 GSC 展示量 top 15 的引擎，让这 15 个 zh 页的结果卡片 **0 整行英文**，同时修掉 6 个引擎的 G6 漂移、7 个引擎 20 处双美元号、1 处服务端数值 bug。

**Architecture:** **完全复用 B3-7 已上线的机制**（`makeToken` / `CALC_OUTPUT_MAKE_TOKEN_JS` / `calc_out.*` 三族命名 / 文本插入式 locale 落库），本批**不新增任何核心模块**。新增的是三样东西：① 「已令牌化引擎清单」抽成单一真相源并扩到 25 个；② G9 基线改为**按引擎分组**（试点 `d3b3c1d` / 本批 `5c1c789`）以容纳本批的有意改动；③ 两条新守卫 G13（zh 页 0 整行英文，落在 G4 同文件）/ G14（产物页 0 处双美元号）。

**Tech Stack:** TypeScript · Node 20 · tsx（`node node_modules/tsx/dist/cli.mjs`）· node:test · Astro 5 · pnpm

## Global Constraints

- **宪法（AGENTS.md）**：本批已获用户授权改 `src/engines/**`（calc 层）；**除 §0.5 逐例裁定表里明确列出的 6 个引擎外，不改任何引擎的计算逻辑 / 阈值 / 输入定义**；不改 Roadmap / Phase。
- **判据落在不变量上**：代理指标 ≠ 真效果（禁止用「大部分翻译了」当判据）。
- **一个不变量只守一处**：G13 落在 G4 同文件（G4c 断言扩范围），**不新建第二个「无整行英文」守卫**。
- **产物层 ≠ 源码层**：源码层变异**不重建产物** ⇒ 源码层变异只跑 source-only 断言。
- **验收数字必须入库为可复算工具**（`tests/scripts/`，文件名**不能**带 `.test.ts`，否则 `walkTestSuites` 计数漂移、meta-守卫变红）。
- **用户规则**：完成改动后**先询问是否 commit/push**；push 前 `git fetch` + 确认 **0 behind**；**禁止 force-push**。
- **编码**：文件无 BOM、全 LF；commit 信息用 `git commit -F <utf8file>`（PowerShell `>` 会写 UTF-16LE+BOM）。
- **commit 信息**：`type(scope): 中文标题` + 正文含**实测数字** + **维度 3 scan 声明**；**绝不能**含 `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`。
- **Windows**：PowerShell 没有 `head`；`Get-ChildItem -Path 'src\pages\[lang]'` 的通配符要用 `-LiteralPath`；内联 `node -e` 会被引号规则打爆 ⇒ 一律写成 `tmp/*.mjs` 再跑；`git` 远端操作要在**同一条命令**里设 `$env:GIT_SSH_COMMAND`。
- **并行纪律**：4 个 worker **只改自己那几个引擎文件**；**并行阶段 subagent 不做任何 git 操作**（git index 是共享资源）⇒ 控制器在全部 Task 完成后统一提交。
- **并行阶段不跑 `codegen-examples.mjs`**（它会同时重写全部 100 个引擎的 `staticExamples[0]` ⇒ 并行会互相覆盖）。
- **emoji 不得手打**：zh 值的 emoji **从 en 值原样复制**（B3-7 实测手打 emoji 被代理对转义成了别的码位）。
- **`bing-block-urls.csv` 保持未跟踪**，不得提交。

---

## 0. 执行前必读

### 0.1 本批要解决的缺陷（实测规模，spec §0.2）

- zh 工具页 100 个，B3-7 试点 10 个已全中文，**其余 90 个卡片仍是英文**，共 **1,081 行**；裸 token 泄漏 0。
- 这 90 页的 GSC 展示量 **2,853**；**top 15 覆盖 2,096（73%）**，top20 = 81%，top30 = 91%。
- 本批 15 个引擎的英文行合计 **248 行**（逐行清单见 §0.9）。
- G6 漂移：100 引擎 · 一致 50 · 漂移 50；**本批 15 个里有 6 个漂移**（逐例裁定见 §0.5）。
- 可见双美元号：源码 24 处 = **20 缺陷 + 2 注释 + 2 合法 FAQ 示例**；产物 **140 处 / 14 页**。
- 非工具 zh 页（about / terms / 主题 / 指南 / 对比页）同类缺陷 **0** ⇒ 待办 #8 关闭。

### 0.2 本批的边界（明确不做）

1. 剩余 75 个引擎（下一批）；
2. 决策支持铺开到 227 页（zh 侧应在卡片中文化之后做）；
3. 死键清理（与 `dead-i18n-keys-guard` 有依赖，风险外溢）；
4. GSC 2~4 周观察窗口复审；
5. 其余 44 个漂移引擎；
6. 双美元号里的 2 处注释与 2 处合法 FAQ 示例（`"FREE"`、`"URGENT"`、`"$$$"` = 垃圾邮件敏感词示例，**必须保留**）。

### 0.3 ⭐ 施工配方（**B3-7 已验证，逐字复用**）

对目标引擎的**每一行**输出，按下面的顺序判定：

1. **章节标题行**（整行就是一个 emoji 标题，如 `💰 MRR Snapshot`）
   ⇒ token：`$calc_out.section.<alias>_<section_slug>`
   - ⚠️ **中文译文必须保留行首 emoji**（从 en 值原样复制）
2. **标签行**（`• 标签: 值` 或 `  标签:  值`，**值里没有自然语言句子**）
   ⇒ token：`$calc_out.label.<key>`，**只替换标签部分，值原样留在行里**
   - ⚠️ **对齐空格留在 token 之外** —— 例：`• $calc_out.label.starting_mrr|Starting MRR      $12,000`
   - ⭐ **共享标签复用规则**：新增标签前**必须先查现有 `calc_out.label.*` 的 en 值集合有没有同文**；有同文 ⇒ **复用该键**，不得新建。
3. **整行结论句 / 判定句**（含自然语言 + 运行时数值）
   ⇒ token：`$calc_out.<alias>.row.<key>`，**整行替换**
   - ⚠️ **运行时数值必须同时进 `params` 和 fallback**（同一个变量 ⇒ 两侧不可能漂）
4. **纯结构性行**（空行、分隔符）⇒ 不动
5. **💡 Tip 行** ⇒ 按 B3-7 的做法**令牌化**（tip 正文也要 token 化；tip 标记必须语言无关）

⚠️ **fallback 里不得出现 `|`**（`beautifySections` 用 ` | ` 分隔维度行）。
⚠️ **params 的值里不得出现 `{` `}`**（`makeToken` 会在 JSON 文本层转义成 `\u007b`/`\u007d`）。
⚠️ **一行里可以有多个 token** ⇒ 正则逐个替换 ✔。
⚠️ **禁止动态拼码**：code 必须来自**字面量**（否则 G2/G3 无法静态提取）。

### 0.4 locale 键命名（三层）

| 族 | 形态 | 例 |
|---|---|---|
| 章节 | `calc_out.section.<alias>_<slug>` | `calc_out.section.time_value_snapshot` |
| 共享标签 | `calc_out.label.<snake>` | `calc_out.label.annual_revenue` |
| 工具独有行 | `calc_out.<alias>.row.<snake>` | `calc_out.time_value.row.total_interest` |

alias 见 §0.9 清单表。**en 值必须逐字等于源码原文**（G8）；**zh 值必须是中文**（G1）且占位符后的百分号不得丢失（G1b）。

### 0.5 ⭐ 漂移裁定表（**逐例已定，用户已拍板；不要自行发挥**）

默认原则：**服务端为准**（SSR、`staticExamples[0]`、引擎单测都指向服务端）。
⛔ **数值分歧不适用**这条默认 —— rental-yield 是反例。

| 引擎 | 实测差异 | 裁定 | 由谁做 |
|---|---|---|---|
| stripe-fee | 服务端 `fee:       $2`（对齐空格）vs 客户端 `fee: $2` | **客户端**补齐对齐空格 | W2 |
| burn-rate | 客户端少 3 段（Burn Health / What-If / Break-Even），且 tip 是裸 JSON `💡 Tip: {"code":...}` 不合 token 协议 | **客户端**补齐 3 段 + tip 改合规 token 形态 | W3 |
| ai-api-cost-comparison | 客户端缺「📅 Pricing last updated」与「🩺 Cost Health」两段 | **客户端**补齐两段 | W2 |
| safe-convertible-note | 服务端 `🟡 standard cap` vs 客户端 `💡 standard cap` | **客户端**改回 🟡 | W1 |
| feature-adoption | 客户端用文字 `YELLOW` 代替 emoji，且措辞不同 | **客户端**改回服务端的 emoji 与措辞 | W1 |
| **rental-yield** | **服务端 1.08% vs 客户端 6.89%** | **改服务端**（见下） | W2 |

**rental-yield 服务端数值 bug（用户 2026-11-16 拍板：改服务端）**

`src/engines/real-estate/rental-yield-calculator.ts` 第 120-123 行：

```ts
const coc100Down = cashOnCashReturn({
  ...args,
  downPayment: purchasePrice,  // 100% down
});
```

`cashOnCashReturn`（第 68-72 行）的分母用 `downPayment`（全款 ⇒ 对），但分子 `annualCashFlow(inputs)`（第 41-47 行）用的是 `inputs.loanAmount` ⇒ **贷款没置零**，算出「带杠杆现金流 ÷ 全款投资额」= 1.08%（口径不一致）。
客户端把贷款置 0（`la=0`）⇒ 无杠杆 CoC = NOI ÷ (房价×1.03) = 6.89% ⇒ **客户端是对的**。

**修法**（只改服务端一处）：

```ts
const coc100Down = cashOnCashReturn({
  ...args,
  downPayment: purchasePrice,  // 100% down
  loanAmount: 0,               // ⭐ 修 bug：全款场景必须把贷款置零（否则分子分母口径不一致）
});
```

⚠️ 这一处会改变 en 页可见数字 ⇒ **必须登记进 `ALLOWED_DIFFS`**（见 Task 8）。

### 0.6 ⭐ 双美元号修复清单（**20 处可见缺陷；3 处注释与 2 处合法 FAQ 不改**）

| 引擎 | 处数 | 由谁做 |
|---|---|---|
| saas-valuation | 8 | Task 7（**B3-7 试点，已令牌化** ⇒ 改的是 token 之间的纯文本，不动 fallback） |
| affiliate-income | 5 | Task 7 |
| freelance-rate | 3 | **W3**（该引擎在本批 15 个里） |
| course-pricing | 1 | Task 7 |
| email-list-revenue | 1 | Task 7（**另有 1 处合法 FAQ `\"$$$\"` 不改**） |
| hourly-vs-fixed | 1 | Task 7 |
| unit-economics | 1 | Task 7 |

⚠️ 判定口径：**`$$` 后面不跟 `$`** 才算缺陷（`$$$` 是合法示例）。
⚠️ 修在**输出字符串**里（`'$$12,000/yr'` ⇒ `'$12,000/yr'`），不要改 `fmt()` 的行为。

### 0.7 全局约束（每个 Task 都隐含包含）

见文首 **Global Constraints** 一节。

### 0.8 依赖链（**顺序不能反**）

```
① Task 1  单一真相源 + 15 引擎纳入（G9 基线分组）
   ↓
② Task 2  G13 / G14 两条守卫（此时应红）
   ↓
③ Task 3~6  4 个 worker 并行令牌化（文件互不重叠）+ 漂移裁定 + 双美元号
   ↓
④ Task 7  非本批 6 个引擎的双美元号修复
   ↓
⑤ Task 8  locale 统一落库 + ALLOWED_DIFFS 登记 + codegen 重生成
   ↓
⑥ Task 9  全量验收（tsc / 构建 / 守卫 / 全量套件）
   ↓
⑦ Task 10 线上复验（15 个 zh 页逐项一致）
   ↓
⑧ Task 11 文档同步（CHANGELOG / AGENTS / spec §10 / plan 实施期修正 / INDEX）
   ↓
⑨ Task 12 提交与推送（**必须先问用户**）
```

⚠️ **③⑤ 的顺序不能反**：引擎改完必须先落 locale 再重生成 `staticExamples`，否则产物是陈旧的 ⇒ G4/G4d 会误红。

---

### 0.9 本批 15 个引擎的英文行清单（逐行照着改）

> 取数：`tests/scripts/p168-b3-8-audit.ts`（Task 2 建）· 源：`dist/zh/<slug>/index.html` 的卡片正文
> 每一行 = 卡片里**必须令牌化**的一行（整行无中文）⇒ 判据 `isEnglishLine`
> ⚠️ 清单来自**产物**，源码还有分支里没走到的行 ⇒ 令牌化时以**源码的全部输出行**为准，本清单是**下限不是上限**。
> ⚠️ 行内的对齐空格是原样的 —— 令牌化时**不要动对齐空格**（它们留在 token 之外）。

#### W1（4 引擎 · 63 行）

**solopreneur-time-value-calculator**（alias `time_value` · `src/engines/investment/time-value-calculator.ts` · 24 行）

```
• Daily Rate (8 hrs):    $416.67/day
• Cost per 15-min interruption:  $13.02
• Cost per context switch:  $26.04 (30 min refocus)
• 🟡 $52/hr is average. Solid baseline; raise rate or reduce wasted hours.
• 🟡 40 hrs/wk — standard, watch for creep.
• 🟢 48 wks/yr — standard full-time.
• Target $200K/yr income:  Need $104.17/hr at current hours
• Years to $200K at current pace:  1.0 yrs (after raises)
⚖️ Work vs Leisure Break-Even:
• 1 hr wasted daily costs:     $520.83/wk in productivity
• Yearly waste @2 hrs/day:  $25,000.00/yr in lost productivity
• Break-even: work 1 hr earns $52.08 — guard this hour.
• 4-day workweek equivalent: same income in 38 wks  (cut 1 day/wk)
• Cut 1 hr/day wasted:  Save $12,500.00/yr in productivity
• Cut all meetings (5/wk @ 1hr):  Save $12,500.00/yr
• Raise hourly rate by 25%:  Annual income $100,000.00 → $125,000.00
• Add $500/mo passive income:  Annual $106,000.00/yr  (saves 6% of working time)
• Move to 4-day workweek:  Same $100,000.00/yr in 38 weeks
Comparison: $30,000/yr → $15.63/hr | $0.26/min | $0.00/sec | Yearly waste @2hrs/day: $7,500.00
Comparison: $60,000/yr → $31.25/hr | $0.52/min | $0.01/sec | Yearly waste @2hrs/day: $15,000.00
Comparison: $100,000/yr → $52.08/hr | $0.87/min | $0.01/sec | Yearly waste @2hrs/day: $25,000.00
Comparison: $150,000/yr → $78.13/hr | $1.30/min | $0.02/sec | Yearly waste @2hrs/day: $37,500.00
Comparison: $250,000/yr → $130.21/hr | $2.17/min | $0.04/sec | Yearly waste @2hrs/day: $62,500.00
Comparison: $500,000/yr → $260.42/hr | $4.34/min | $0.07/sec | Yearly waste @2hrs/day: $125,000.00
```

**solopreneur-safe-convertible-note-calculator**（alias `safe_convertible_note` · `src/engines/valuation/safe-convertible-note-calculator.ts` · 23 行）

```
• Effective Pre-Money: $4,500,000  (cap − investment)
• SAFE Type:           Post-Money SAFE (YC Standard)
• Cap Price:           $4.50 per share  (post-money cap / (existing + SAFE shares))
• Conversion Price:    $4.50 per share  ← CAP GOVERNS
• 🟡 standard cap (cap is 10.0× investment)
• 🟢 no discount (post-money standard)
• Conversion trigger:  whichever is lower (cap or discount) at next priced round
• Existing Pool (founder + prior investors + options):
• SAFE Holder: 10.0%  (111,111 shares at conversion)
• Existing pool dilution: −10.0%  (from 100% to 90.0%)
• Effective post-money at conversion: $5,000,000  (cap governs)
• Cap sensitivity: at 2× cap ($10,000,000), SAFE holder would get 5.0% instead of 10.0%
• Double the SAFE ($1,000,000):            existing pool drops to 80.0%, SAFE holder rises to 20.0%
• Lower cap to $3,000,000:                SAFE holder gets 16.7%, existing pool drops to 83.3%
• Add 20% discount:                conversion at $4.00 per share, SAFE holder gets 11.1%
• No cap (cap = $100M):            effectively discount-only, SAFE holder gets 0.5%
• Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership 15.1%
💡 提示: Post-money SAFE (YC standard) protects founders by fixing SAFE holder’s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.
Comparison: $1,000,000 cap on $500,000 SAFE → SAFE holder gets 50.0% (1,000,000 shares)
Comparison: $3,000,000 cap on $500,000 SAFE → SAFE holder gets 16.7% (200,000 shares)
Comparison: $5,000,000 cap on $500,000 SAFE → SAFE holder gets 10.0% (111,111 shares)
Comparison: $10,000,000 cap on $500,000 SAFE → SAFE holder gets 5.0% (52,632 shares)
Comparison: $20,000,000 cap on $500,000 SAFE → SAFE holder gets 2.5% (25,641 shares)
```

**solopreneur-feature-adoption-calculator**（alias `feature_adoption` · `src/engines/product-analytics/feature-adoption-calculator.ts` · 5 行）

```
Snapshot: 750 of 3,000 WAU users used this feature. Non-adopters: 2,250
What-If: if 10% of non-adopters convert this quarter, adoption rises to 32.5%
Break-Even: to hit Good (20.0% adoption), need at least 600 feature users (currently 750)
Milestone: lifting adoption by +10 percentage points requires 300 more feature users (target 1,050 from 750)
Tip: Pair with the Activation Rate Calculator to distinguish adopted-but-inactive users from non-adopted — both look &quot;stuck&quot; but require different interventions.
```

**solopreneur-inventory-turnover-calculator**（alias `inventory_turnover` · `src/engines/operations/inventory-turnover-calculator.ts` · 11 行）

```
• 🟢 Excellent — inventory cycles ≥ 6x/year; capital is working efficiently
• Turnover ratio: 6.00x/year  ·  Days to sell: 60.8 days
• Industry benchmark: general = 6x/year  ·  Your status: above benchmark
• COGS −10% (slower sales): turnover = 5.40x · days to sell = 67.6
• COGS +10% (faster sales): turnover = 6.60x · days to sell = 55.3
• Target inventory for 🟢: $40,000  (at 6x benchmark)
• Action: inventory is already below 🟢 target
• Improve ratio by +1: target inventory = $34,286
• Capital freed if ratio +1: $5,714 (one-time working-capital release)
• 12-mo operating impact: every $1 of inventory reduction = ~$0.15–0.25 of annual carrying-cost savings (use P7-2 to size)
💡 提示: Excellent turnover — capital is working efficiently. Watch for stockout risk as turnover rises; pair this metric with a stockout cost tracker (P7-3) to ensure fast turn is not buying you lost sales.
```

#### W2（4 引擎 · 78 行）

**solopreneur-stripe-fee-calculator**（alias `stripe_fee` · `src/engines/valuation/stripe-fee-calculator.ts` · 24 行）

```
• Net Received:         $97   ← what hits your bank
📊 Provider Comparison (for $100 charge, sorted by total fee):
• Stripe (US) (selected)  fee:       $3  (2.90 + 0.30)  net: $97 ← selected
• Stripe (International)  fee:       $5  (4.40 + 0.30)  net: $95
• Industry average: ~2.9% + 30¢ (Stripe US standard)
• On $100 charge: fixed fee is 0.3% of total fee.
• Vs average: 🟠 worse than average
• Monthly:  $10,000 gross  →  $320 fees  →  $9,680 net
• Yearly:   $120,000 gross  →  $3,840 fees  →  $116,160 net
• Annualized impact: fees cost $3,840/yr — could fund ~77 extra transactions at your average ticket.
• Cheapest provider: Wise ($2 per $100 charge)
• Most expensive:    Stripe (International) ($5 per $100 charge)
• Switching friction: Stripe ↔ PayPal takes 1-2 weeks; Wise requires account setup + payout delays.
• Raise price by $1:                 $101 charge → net $98 (+$1 vs current)
• Pass fees to customer:            charge $103 instead of $100 (add $3) to net the same amount
• Switch to annual billing:         save $3,960/yr in fixed fees (11 fewer transactions × 0.30)
• Negotiate 0.5% volume discount:   save $300/yr (volume below $50K MRR — partial credit)
• Bundle 12 transactions:           fee on $1,200 single charge ($35) vs 12× current ($38) — save $3
💡 提示: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves $384/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+$3 to cover $100), or compare Wise for international.
Comparison: $1 charge via Stripe (US) → fee $0 (32.9%), net $1
Comparison: $10 charge via Stripe (US) → fee $1 (5.9%), net $9
Comparison: $100 charge via Stripe (US) → fee $3 (3.2%), net $97
Comparison: $1,000 charge via Stripe (US) → fee $29 (2.9%), net $971
Comparison: $10,000 charge via Stripe (US) → fee $290 (2.9%), net $9,710
```

**solopreneur-rental-yield-calculator**（alias `rental_yield` · `src/engines/real-estate/rental-yield-calculator.ts` · 22 行）

```
• Total cash invested:   $84,000  (down + 3% closing)
• Effective rent (post-vacancy): $28,500
• Net annual cash flow:  $3,337
• 🟠 outlier — cash-on-cash outside 4-15% range; verify assumptions
• Gross yield:           10.00%  (annual rent / price)
• Net yield:             1.11%  (cash flow / price)
• Cash-on-cash return:   3.97%  (cash flow / cash invested)
• Gross yield:    &lt;8% low · 8-10% typical · &gt;12% high
• Cash-on-cash:   &lt;6% low · 8-12% strong · &gt;15% high-yield (verify)
• S&amp;P comparison: ~7-10% historical avg with zero work
• Goal threshold:  Aim for CoC ≥ 8% AND gross ≥ 8%
• Yield component:       3.97% CoC annually
• Principal paydown:     ~1-3% annual equity build (mortgage dependent)
• Total estimated return: 7.0% (sum of components)
• 100% down (vs current LTV):   CoC → 1.08% (no leverage)
💡 提示: Cash-on-cash below 8% lags S&amp;P 500 historical return (~7-10%). Either negotiate a lower price, increase rent, or reduce expenses to reach 8%+ threshold.
Comparison: target 4% CoC on $84,000 cash invested → annual cash flow $3,360
Comparison: target 6% CoC on $84,000 cash invested → annual cash flow $5,040
Comparison: target 8% CoC on $84,000 cash invested → annual cash flow $6,720
Comparison: target 10% CoC on $84,000 cash invested → annual cash flow $8,400
Comparison: target 12% CoC on $84,000 cash invested → annual cash flow $10,080
Comparison: target 15% CoC on $84,000 cash invested → annual cash flow $12,600
```

**solopreneur-ai-api-cost-comparison**（alias `ai_api_cost_comparison` · `src/engines/ai-cost/ai-api-cost-comparison.ts` · 20 行）

```
Input: 1,000 tokens/req | Output: 500 tokens/req | Volume: 100 reqs/day (3,000 reqs/month)
Comparing 4 models across 4 providers
[G] Gemini 1.5 Flash (Google) — $0.67/month
Rate: $0.07/$0.30 per 1M tokens | Context: 1M
Per request: $0.0002 | Daily: $0.02 | Monthly: $0.67
Savings vs GPT 5 Mini: $3.08/month (82% cheaper)
📊 Full Model Comparison (100 reqs/day)
[O] OpenAI: GPT 5 Mini (cheapest) at $3.75/month | Range: $3.75 – $3.75/month
[A] Anthropic: Claude Haiku 3 (cheapest) at $2.63/month | Range: $2.63 – $2.63/month
[G] Google: Gemini 1.5 Flash (cheapest) at $0.67/month | Range: $0.67 – $0.67/month
[D] DeepSeek: Deepseek V4.1 Flash 1017 (cheapest) at $1.35/month | Range: $1.35 – $1.35/month
📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes
Model                  | 50 reqs/day      | 100 reqs/day      | 500 reqs/day      | 1,000 reqs/day      | 5,000 reqs/day      | 10,000 reqs/day
Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek
• 💸 Most expensive in this comparison: GPT 5 Mini at $3.75/mo
• ℹ️ Each model has trade-offs (context window, speed, capabilities). Don&#39;t pick purely on price.
• Switch all workloads to cheapest:  save vs current $0.67/mo (already optimal)
• Double volume to 200 reqs/day:  cheapest becomes $1.35/mo
• Halve volume to 50 reqs/day:  save proportionally
• If you only need cheap inference: pick Gemini 1.5 Flash (cheapest) and route 80% of traffic there
```

**solopreneur-stockout-cost-calculator**（alias `stockout_cost` · `src/engines/operations/stockout-cost-calculator.ts` · 12 行）

```
• 🔴 Critical — ≥ 15% of revenue lost; urgent: switch to multi-supplier
• Total stockout cost: $275,000/year  ·  45.83% of annual revenue
• Lost immediate: $5,000  ·  Lost LTV: $270,000  ·  Recovery captures: $30,000
• Lost sales per day:       $1,000
• Stockout duration:        5 days  ·  cumulative: $5,000
• Customer loss rate:       30.0%  ·  applies to $5,000 = $1,500 lost-customers
• Cut stockout days by 50%: total cost = $137,500 (22.92%)  ·  annual savings = $137,500
• Raise recovery rate to 25%: total cost = $230,000  ·  additional savings = $45,000
• Combined (50% less days + 25% recovery): see Milestone below
• Max stockout days for 🟢 (&lt; 5% of revenue): 0.5 days
• Current vs target: reduce stockout days by 4.5 to hit 🟢
• Compounded over 3 years: $33,000 (vs $0 reinvested)
```

#### W3（4 引擎 · 67 行）

**solopreneur-freelance-rate-calculator**（alias `freelance_rate` · `src/engines/freelance/freelance-rate-calculator.ts` · 17 行）

```
• 1.25x skilled:       $94/hr  (proven track record)
• 2x expert:           $150/hr  (top-tier authority)
• Daily Rate (8 hrs):   $600/day
• 🟢 Market-rate — competitive for your skill level.
• 🟡 Billable utilization: 1,200 hrs/yr  (industry: 900-1,400)
• 🟢 Expenses at 12.5% of income — lean operation.
• 🟡 Profit margin 25.0% — workable, room to grow.
• Junior:       $45/hr  (entry, building portfolio)
• Mid-Level:    $75/hr  (3-5 yrs, market median)
• Expert:       $188/hr  (10+ yrs, top authority)
• Your rate:    $75/hr  (100.0% of market median)
• Break-even (expenses only): $8.33/hr
• Break-even + profit:        $75.00/hr  (your required rate)
• At current billable hrs (1,200), every $10/hr raise adds $12,000/yr
• Cut expenses 25%:  Save $2,500/yr → break-even drops to $6.25/hr
• +200 billable hrs/yr:  Same rate → $105,000/yr gross (was $90,000)
• Move to expert tier (2x):  $$150/hr → $180,000/yr gross
```

**solopreneur-freelance-tax-calculator**（alias `freelance_tax` · `src/engines/investment/freelance-tax-calculator.ts` · 25 行）

```
🌍 Country: US (Self-Employed, approx)  |  Filing: SINGLE
• Retirement Deduction:  -$10,000  (SEP-IRA / Solo 401k)
• Effective Tax Rate:    36.8%  (after all deductions)
• Marginal Tax Rate:    35.0%  (rate on next dollar earned)
• Monthly Tax Savings:  $3,070.60/mo  (set this aside!)
• Self-Employment Tax:  $10,597  (15.3% on 92.35% of net)
• 🟠 Effective rate 36.8% is high. Look for more deductions.
• 🟢 Business expenses are 15.0% of income — solid deduction rate.
• 🟢 Contributing $10,000/yr to retirement — reduces taxable income now.
• Set Aside Per Month:  $3,070.60
• 🟢 Self-employment still beats W-2 at this income. Tax savings from deductions outweigh SE tax.
• SE Tax Burden:        $10,597/yr  (only paid by self-employed)
• Equivalent W-2 Salary: $78,000  (typical 22% total W-2 tax + benefits)
• Net Tax Savings:       $-14,847/yr  vs W-2 equivalent
• Raise retirement to max (25% of net):  Save $7,500/yr in taxes
• Switch to married filing:  Standard deduction doubles to $29,200
• Track $5K more in expenses:  Save $1,500/yr  (at 30.0% rate)
• Form S-Corp (US):  Save ~$5,299/yr  once net income exceeds $60-80K
• Track mileage (~$0.67/mi):  Save $1-3K/yr for active freelancers
📌 Set This Aside Monthly: $3,070.60  (transfer on the 1st of each month to a separate account)
Comparison: $30,000/yr → Tax: $2,456 | Effective rate: 8.2% | Take-home: $2,295.29/mo
Comparison: $60,000/yr → Tax: $17,195 | Effective rate: 28.7% | Take-home: $3,567.05/mo
Comparison: $100,000/yr → Tax: $36,847 | Effective rate: 36.8% | Take-home: $5,262.74/mo
Comparison: $150,000/yr → Tax: $61,412 | Effective rate: 40.9% | Take-home: $7,382.34/mo
Comparison: $250,000/yr → Tax: $110,541 | Effective rate: 44.2% | Take-home: $11,621.54/mo
```

**solopreneur-cart-abandonment-cost-calculator**（alias `cart_abandonment_cost` · `src/engines/marketing/cart-abandonment-cost-calculator.ts` · 18 行）

```
* 🟢 Good — recovery ROI ≥ 300%; recovery spend is highly profitable
* Recovery ROI: 1280%  *  Net gain: $41,300
* Abandonment rate: 70%  *  Recovery rate: 8%
* Recovery cost per send:    $0.5
* Cart creations:       10,000  (traffic x 20% add rate)
* Abandoned carts:      7,000  (cart creations x 70%)
* Lost revenue:         $560,000  (abandoned x AOV)
* Recoverable revenue:  $44,800  (lost x 8% recovery)
* Recovery cost:        $3,500  (abandoned x cost/send)
* +50% recovery rate: recovery ROI = 1920% * net gain = $63,700
* -25% cost per send: recovery ROI = 1707% * net gain = $42,175
* -10pp abandonment:  recovery ROI = 1280% * net gain = $35,400
* Minimum recovery rate for 100% ROI: 0.63%  (cost/send / AOV)
* Headroom: 7.38pp before recovery ROI hits 100%
* At break-even, every recovery dollar returns exactly one recovery dollar in recovered revenue
* Annualized net gain:    $495,600  (at current monthly run-rate)
* (Assumes constant traffic + rates — refresh quarterly with new funnel data)
💡 提示: Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.
```

**solopreneur-burn-rate-calculator**（alias `burn_rate` · `src/engines/saas/burn-rate-calculator.ts` · 7 行）

```
• Net Burn:      $-20,000/mo  (Gross − Revenue)
• Status:            ✅ Cash-flow positive! No burn concern.
💀 Default Alive/Dead Status
• Status:  ✅ Default Alive: cash-flow positive
• 🟢 Default alive — revenue ≥ expenses. No burn. Focus on growth and reinvestment.
• ⚠️ Cannot model — ensure cash &gt; 0 and net burn &gt; 0.
• 🟢 Already at break-even — revenue ≥ expenses. Focus on reinvestment.
```

#### W4（3 引擎 · 40 行）

**solopreneur-reorder-point-calculator**（alias `reorder_point` · `src/engines/operations/reorder-point-calculator.ts` · 14 行）

```
• 🟢 Excellent — service level ≥ 95%; reorder point accounts for demand variability
• Service level: 95%  ·  Z-score: 1.65  ·  Reorder point: 723 units
• Lead-time demand: 700 units  ·  Safety stock: 23 units
• Avg daily demand:        50 units/day
• Supplier lead time:      14 days
• Demand std deviation:    10 units/day
• Lead-time demand:        700 units
• Lead time doubles: ROP = 1433 units  ·  safety stock grows by 10 units (√2 factor)
• Service level raised to 99% (Z=2.33): ROP = 733 units  ·  safety stock grows by 10 units
• Min service level for 🟢: 95%
• Inventory headroom (safety stock): 23 units above lead-time demand
• Order frequency: ~4.3 orders/month  ·  ~51 orders/year
• Annual stockout risk avoided: 1200 units not stocked out
💡 提示: 95% service level is the recommended baseline. Reorder quarterly to match demand variability shifts (seasonal products may need SL tuning). Pair with stockout cost (P7-3) to verify safety-stock investment pays off.
```

**solopreneur-sales-velocity-calculator**（alias `sales_velocity` · `src/engines/sales/sales-velocity-calculator.ts` · 13 行）

```
• 🟡 Good — productive sales engine; room to compress cycle or lift win rate
• Daily velocity: $2,777.78/day  ·  Monthly: $83,333.33  ·  Annual: $1,013,888.89
• Formula: (opps × deal size × win rate) ÷ cycle = (20 × $25,000 × 25%) ÷ 45 days
• Daily / Monthly / Annual velocity: $2,777.78 / $83,333.33 / $1,013,888.89
• Win rate 25%→30%: $3,333/day (+20.0% lift)
• Cycle 45→30 days: $4,167/day (+50.0% lift)
• Combined (win rate 30% AND cycle 30d): $5,000/day
• Target for 🟢 Excellent: $5,000/day
• Path A — lift win rate to 45.0% (cycle unchanged)
• Path B — compress cycle to 25 days (win rate unchanged)
• Path C — add 16 more open opps (everything else unchanged)
• At current pace: ~$1,013,888.89/year revenue contribution
💡 提示: Daily velocity $2,000–$5,000 is productive. To reach Excellent, identify the weakest of the four levers (opps × size × win rate ÷ cycle) and invest there. Often cycle compression (e.g. self-serve trial, async demos) gives 1.5–2× lift without more headcount. Pair with pipeline value to make sure velocity growth is not masking deteriorating deal size.
```

**solopreneur-quota-attainment-calculator**（alias `quota_attainment` · `src/engines/sales/quota-attainment-calculator.ts` · 13 行）

```
• 🔴 Critical — &lt; 50% of quota; urgent catch-up needed
• Projected year-end: $1,000,000  ·  Gap to quota: $600,000
• Annual quota: $1,000,000  ·  Months elapsed: 6 of 12
• Revenue closed: $400,000  ·  Remaining: 6 months
• Expected at-pace: $500,000  ·  Behind/ahead: $100,000 (behind)
• Current pace: $67K/mo  ·  Required pace: $100K/mo  ·  Gap: $-16,667/mo (-20%)
• If maintain current pace ($67K/mo) for 6 mo: +$400,000 → $800K total = 80% (good)
• If hit required pace ($100K/mo) for 6 mo: +$600,000 → $1M total = 100% (excellent, onTrack)
• If accelerate 20% to $120K/mo for 6 mo: +$720,000 → $1.12M total = 112% (excellent)
• Target for on-track at month 6: $500,000 closed (expected at-pace)
• Target for full quota: $1,000,000  ·  Required: $100K/mo for 6 remaining months
• At current pace, year-end: $1.20M (120%)
💡 提示: Attainment &lt; 50% means you are at serious risk of missing quota. This is the urgent-action band — pull every lever: emergency top-of-funnel push (cold outreach, paid lead-gen, partnerships), pricing/discount review to close existing pipeline faster, and a 30-day deal-desk review of every late-stage opportunity. If the gap to 🟠 is &gt; 30pp, consider a quota reset conversation with leadership now — not at year-end. A pipeline review is overdue.
```

合计 **248 行**（zh 侧）⇒ 令牌化后 zh 侧英文行必须是 **0**。
## Task 1: 「已令牌化引擎清单」抽成单一真相源 + 15 个引擎纳入

**Files:**
- Create: `tests/scripts/p168-tokenized-engines.mjs`
- Modify: `tests/scripts/p168-card-text.mjs`（`PILOT` 改为从真相源派生）
- Modify: `tests/scripts/p168-server-client-parity.ts`（`PILOT_SLUGS` 改为从真相源派生）
- Modify: `tests/scripts/p168-en-page-parity.ts`（`PILOT_FILES` 改为从真相源派生 + **基线按 slug 分组**）
- Modify: `tests/calc-output-i18n-guard.test.ts`（`PILOT_SLUGS` Set 改为从真相源派生）

**Interfaces:**
- Produces: `tests/scripts/p168-tokenized-engines.mjs` 导出
  - `TOKENIZED`: `Array<{ slug: string; file: string; alias: string; baseline: string }>`（**25 条**：B3-7 试点 10 + 本批 15）
  - `B3_7_PILOTS` / `B3_8_BATCH`: 两个分组（各自 10 / 15 条）
  - `baselineFor(slug): string` —— 按 slug 返回基线 SHA
- Consumes: 无（这是链条起点）

**为什么必须先做这一步**：现在「已令牌化的引擎」这个清单散在 **4 个文件**里（`p168-card-text.mjs` 的 `PILOT`、`p168-server-client-parity.ts` 的 `PILOT_SLUGS`、`p168-en-page-parity.ts` 的 `PILOT_FILES`、`tests/calc-output-i18n-guard.test.ts` 的 `PILOT_SLUGS` Set）。本批要把 15 个引擎加进**全部**守卫 ⇒ 散着加必然漏 ⇒ 抽成单一真相源。

### Step 1: 写失败的测试

在 `tests/calc-output-en-parity-guard.test.ts` 末尾追加：

```ts
test('P168 B3-8 真相源自检：TOKENIZED 必须覆盖 25 个引擎且分组基线不同', () => {
  assert.equal(TOKENIZED.length, 25, 'TOKENIZED 应有 25 个引擎，实际 ' + TOKENIZED.length);
  const b37 = TOKENIZED.filter((e) => e.baseline === 'd3b3c1d');
  const b38 = TOKENIZED.filter((e) => e.baseline === '5c1c789');
  assert.equal(b37.length, 10, 'B3-7 试点应为 10 个，实际 ' + b37.length);
  assert.equal(b38.length, 15, 'B3-8 本批应为 15 个，实际 ' + b38.length);
  assert.equal(new Set(TOKENIZED.map((e) => e.slug)).size, 25, 'TOKENIZED 里有重复 slug');
  // 基线不得用 HEAD（一提交就失去意义）
  for (const e of TOKENIZED) assert.notEqual(e.baseline, 'HEAD', e.slug + ' 的基线不得用 HEAD');
});
```

并在文件顶部加 import：

```ts
import { TOKENIZED } from './scripts/p168-tokenized-engines.mjs';
```

### Step 2: 跑测试，确认失败

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-en-parity-guard.test.ts"
```
Expected: FAIL —— `Cannot find module './scripts/p168-tokenized-engines.mjs'`。

### Step 3: 创建真相源文件

`tests/scripts/p168-tokenized-engines.mjs`：

```js
// P168 B3-8 —— 「已令牌化引擎」的**单一真相源**。
//
// 为什么抽出来（2026-11-16 实测）
//   本批要把 15 个新引擎加进**全部**守卫（G4/G13 · G6 · G8 · G9 · G12/G12b · G4d），
//   而清单此前散在 4 个文件里（p168-card-text.mjs 的 PILOT、p168-server-client-parity.ts
//   的 PILOT_SLUGS、p168-en-page-parity.ts 的 PILOT_FILES、calc-output-i18n-guard.test.ts
//   的 PILOT_SLUGS Set）⇒ 散着加必然漏 ⇒ 抽成一处。
//
// ⭐ baseline 字段：B3-8 的 G9 需要**按引擎分组**的基线
//   · B3-7 的 10 个试点 → d3b3c1d（B3-7 令牌化之前，不变）
//   · B3-8 的 15 个     → 5c1c789（B3-8 令牌化之前的最后一个提交）
//   ⇒ 基线必须钉在**该组令牌化之前**（G9 工具的自检会验这一点）。

/** @type {{slug:string,file:string,alias:string,baseline:string}[]} */
export const B3_7_PILOTS = [
  { slug: 'solopreneur-mrr-calculator', file: 'src/engines/saas/mrr-calculator.ts', alias: 'mrr', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-rent-vs-buy-calculator', file: 'src/engines/real-estate/rent-vs-buy-calculator.ts', alias: 'rent_vs_buy', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-brrrr-calculator', file: 'src/engines/real-estate/brrrr-calculator.ts', alias: 'brrrr', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-project-profitability-calculator', file: 'src/engines/freelance/project-profitability-calculator.ts', alias: 'project_profitability', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-coupon-attribution-calculator', file: 'src/engines/marketing/coupon-attribution-calculator.ts', alias: 'coupon_attribution', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-saas-valuation-calculator', file: 'src/engines/valuation/saas-valuation-calculator.ts', alias: 'saas_valuation', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-acv-calculator', file: 'src/engines/sales/acv-calculator.ts', alias: 'acv', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-funnel-step-calculator', file: 'src/engines/product-analytics/funnel-step-calculator.ts', alias: 'funnel_step', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-activation-rate-calculator', file: 'src/engines/product-analytics/activation-rate-calculator.ts', alias: 'activation_rate', baseline: 'd3b3c1d' },
  { slug: 'solopreneur-stickiness-calculator', file: 'src/engines/product-analytics/stickiness-calculator.ts', alias: 'stickiness', baseline: 'd3b3c1d' },
];

/** @type {{slug:string,file:string,alias:string,baseline:string}[]} */
export const B3_8_BATCH = [
  { slug: 'solopreneur-time-value-calculator', file: 'src/engines/investment/time-value-calculator.ts', alias: 'time_value', baseline: '5c1c789' },
  { slug: 'solopreneur-freelance-rate-calculator', file: 'src/engines/freelance/freelance-rate-calculator.ts', alias: 'freelance_rate', baseline: '5c1c789' },
  { slug: 'solopreneur-reorder-point-calculator', file: 'src/engines/operations/reorder-point-calculator.ts', alias: 'reorder_point', baseline: '5c1c789' },
  { slug: 'solopreneur-feature-adoption-calculator', file: 'src/engines/product-analytics/feature-adoption-calculator.ts', alias: 'feature_adoption', baseline: '5c1c789' },
  { slug: 'solopreneur-safe-convertible-note-calculator', file: 'src/engines/valuation/safe-convertible-note-calculator.ts', alias: 'safe_convertible_note', baseline: '5c1c789' },
  { slug: 'solopreneur-stripe-fee-calculator', file: 'src/engines/valuation/stripe-fee-calculator.ts', alias: 'stripe_fee', baseline: '5c1c789' },
  { slug: 'solopreneur-stockout-cost-calculator', file: 'src/engines/operations/stockout-cost-calculator.ts', alias: 'stockout_cost', baseline: '5c1c789' },
  { slug: 'solopreneur-ai-api-cost-comparison', file: 'src/engines/ai-cost/ai-api-cost-comparison.ts', alias: 'ai_api_cost_comparison', baseline: '5c1c789' },
  { slug: 'solopreneur-rental-yield-calculator', file: 'src/engines/real-estate/rental-yield-calculator.ts', alias: 'rental_yield', baseline: '5c1c789' },
  { slug: 'solopreneur-sales-velocity-calculator', file: 'src/engines/sales/sales-velocity-calculator.ts', alias: 'sales_velocity', baseline: '5c1c789' },
  { slug: 'solopreneur-freelance-tax-calculator', file: 'src/engines/investment/freelance-tax-calculator.ts', alias: 'freelance_tax', baseline: '5c1c789' },
  { slug: 'solopreneur-quota-attainment-calculator', file: 'src/engines/sales/quota-attainment-calculator.ts', alias: 'quota_attainment', baseline: '5c1c789' },
  { slug: 'solopreneur-burn-rate-calculator', file: 'src/engines/saas/burn-rate-calculator.ts', alias: 'burn_rate', baseline: '5c1c789' },
  { slug: 'solopreneur-cart-abandonment-cost-calculator', file: 'src/engines/marketing/cart-abandonment-cost-calculator.ts', alias: 'cart_abandonment_cost', baseline: '5c1c789' },
  { slug: 'solopreneur-inventory-turnover-calculator', file: 'src/engines/operations/inventory-turnover-calculator.ts', alias: 'inventory_turnover', baseline: '5c1c789' },
];

export const TOKENIZED = [...B3_7_PILOTS, ...B3_8_BATCH];

/** 按 slug 取基线 SHA（未知 slug 回落到 B3-8 的基线） */
export function baselineFor(slug) {
  const hit = TOKENIZED.find((e) => e.slug === slug);
  return hit ? hit.baseline : '5c1c789';
}
```

### Step 4: 把 4 个散落的清单改成从真相源派生

**`tests/scripts/p168-card-text.mjs`** —— 现在的 `PILOT` 是一个手写的 `[slug, file, alias]` 元组数组。改成：

```js
import { TOKENIZED } from './p168-tokenized-engines.mjs';

/** 已令牌化的引擎（slug, file, alias）—— 真相源在 p168-tokenized-engines.mjs */
export const PILOT = TOKENIZED.map((e) => [e.slug, e.file, e.alias]);
```

⚠️ 保留导出名 `PILOT` ⇒ 现有 import 全部不用改。

**`tests/scripts/p168-server-client-parity.ts`** —— 它的 `PILOT_SLUGS` 是**自己手写的数组**（**不是**从 card-text 派生的）⇒ 必须改。改成：

```ts
import { TOKENIZED } from './p168-tokenized-engines.mjs';
export const PILOT_SLUGS = TOKENIZED.map((e) => e.slug);
```

⚠️ 该文件现有的 `PILOT_SLUGS` 若是从 `p168-card-text.mjs` 派生的，保持同样的来源即可（**只有一个来源**）。

**`tests/scripts/p168-en-page-parity.ts`** —— `PILOT_FILES` 改成：

```ts
import { TOKENIZED, baselineFor } from './p168-tokenized-engines.mjs';
export const PILOT_FILES: Record<string, string> = Object.fromEntries(TOKENIZED.map((e) => [e.slug, e.file]));
```

**基线分组**（本 Task 的核心机制改动）：

```ts
// 旧的单值基线（B3-7 时期）—— 保留导出名，但不再是唯一真相
export const BASELINE_SHA = 'd3b3c1d';

/** ⭐ B3-8：基线按 slug 分组（试点 d3b3c1d / 本批 5c1c789） */
export function baselineShaFor(slug: string): string {
  return baselineFor(slug);
}

/** 取基线提交里该引擎的 staticExamples[0]（token 化之前的英文输出） */
export function baselineStaticExample(file: string, sha?: string): string | null {
  const use = sha ?? BASELINE_SHA;
  let src: string;
  try {
    src = execSync('git show ' + use + ':' + file, { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch {
    return null;
  }
  const m = src.match(/staticExamples:\s*\[\s*'((?:[^'\\]|\\.)*)'/);
  if (!m) return null;
  return m[1].replace(/\\n/g, NL).replace(/\\'/g, "'");
}
```

`measureEnParity` 内部改成用 `baselineShaFor(slug)` 取基线：

```ts
const head = baselineStaticExample(file, baselineShaFor(slug));
```

**`tests/calc-output-i18n-guard.test.ts`** —— 文件中部的 `const PILOT_SLUGS = new Set([...])`（**注意是 Set 不是数组**）改成：

```ts
import { TOKENIZED } from './scripts/p168-tokenized-engines.mjs';
const PILOT_SLUGS = new Set(TOKENIZED.map((e) => e.slug));
```

⚠️ 该文件里用到 `PILOT_SLUGS.size` 的地方**不用改**（Set 语义不变）。

### Step 5: 跑测试，确认**该绿的全绿、该红的精确红**

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-en-parity-guard.test.ts tests\calc-output-i18n-guard.test.ts tests\calc-output-parity-guard.test.ts"
```
Expected:
- **G9（en-parity）全绿** —— 15 个引擎尚未令牌化 ⇒ 兜底渲染 == 基线 `staticExamples[0]` ⇒ 逐字不变 ✔（这是 Task 1 的**关键验收点**：机制改对了）
- **G12/G12b 红**（15 个引擎还没令牌化 ⇒ locale 缺键）—— **预期红**
- **G6 红**（6 个引擎漂移）—— **预期红**

⚠️ **若 G9 不绿 ⇒ 基线分组机制写错了 ⇒ 停下来查，不要往下走。**

⚠️ **另有 2 个工具也遍历 `PILOT`** ⇒ 扩到 25 条后它们会自动覆盖本批 15 个：
- `tests/scripts/p168-card-parity.mjs --check`（产物层「zh 卡片 vs en 卡片」结构 parity，**有不合格 ⇒ exit 1**）⇒ Task 1 之后应报 15 个引擎不合格，Task 8 之后应转绿；
- `tests/scripts/p168-calc-output-audit.mjs`（B3-7 的体检脚本）⇒ 覆盖 25 个引擎后，它的外推数字更准。
⇒ **不要**因为它们变红就回退 `PILOT` 的扩展。

### Step 6: 跑 `git show` 验证基线可达

```
cmd.exe /c "git show 5c1c789:src/engines/investment/time-value-calculator.ts"
```
Expected: 输出该引擎在 B3-8 之前的源码（**里面应当没有 `$calc_out.` token** —— 那是「基线在令牌化之前」的自证）。

### Step 7: Commit

```bash
git add tests/scripts/p168-tokenized-engines.mjs tests/scripts/p168-card-text.mjs tests/scripts/p168-server-client-parity.ts tests/scripts/p168-en-page-parity.ts tests/calc-output-i18n-guard.test.ts tests/calc-output-en-parity-guard.test.ts
git commit -F tmp/commit-msg-b3-8-task1.txt
```

commit 信息（写进 `tmp/commit-msg-b3-8-task1.txt`，**UTF-8 无 BOM**）：

```
refactor(guard): P168 B3-8 —— 「已令牌化引擎清单」抽成单一真相源 + G9 基线按引擎分组

- 新增 tests/scripts/p168-tokenized-engines.mjs：TOKENIZED 25 条（B3-7 试点 10 + B3-8 本批 15）
- 清单此前散在 4 个文件（card-text.mjs / server-client-parity.ts / en-page-parity.ts /
  calc-output-i18n-guard.test.ts）⇒ 散着加必然漏 ⇒ 抽成一处
- G9 基线改为按 slug 分组：试点 d3b3c1d（B3-7 令牌化之前）/ 本批 5c1c789（B3-8 令牌化之前）
  ⇒ 容纳本批的有意改动（双美元号修复 + rental-yield 数值修复）而不放松判据
- 实测：G9 全绿（15 个引擎尚未令牌化 ⇒ 兜底渲染 == 基线 staticExamples[0]）
  · G12/G12b 红（locale 缺键，预期）· G6 红（6 个引擎漂移，预期）

维度 3 scan: 基于信号 / GSC 真实导出的展示量分布决定批次大小 / 构建产物实测的
90 页 1,081 行英文与 140 处双美元号 / 源码级逐例 diff 暴露 1 例服务端数值 bug
```

---

## Task 2: 两条新守卫（G13 zh 页 0 整行英文 · G14 产物页 0 处双美元号）

**Files:**
- Modify: `tests/calc-output-render-guard.test.ts`（**G13 落在 G4 同文件 ⇒ 一处守一处**）
- Create: `tests/calc-output-no-dd-guard.test.ts`（G14）
- Create: `tests/scripts/p168-b3-8-audit.ts`（可复算体检工具）

**Interfaces:**
- Consumes: `TOKENIZED`（Task 1）、`staticCard` / `isEnglishLine` / `hasBareToken`（`tests/scripts/p168-card-text.mjs`）
- Produces: G13 / G14 两条断言 + 体检工具 `p168-b3-8-audit.ts`

### Step 1: 写 G13（扩 G4 的覆盖范围）

`tests/calc-output-render-guard.test.ts` 里现有的 G4 测试遍历 `PILOT`（来自 `p168-card-text.mjs`）⇒ **Task 1 已经把 `PILOT` 扩到 25 条** ⇒ G4 的「无整行英文」断言自动覆盖 15 个新引擎 = **G13 生效，无需新写断言**。

⚠️ **验证它真的是红的**（而不是真空绿）：

Run:
```
$env:RUN_BUILD_TESTS='1'; cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-render-guard.test.ts"
```
Expected: **红**，且失败信息里应列出本批 15 个引擎的英文行（例如 `time-value` / `stripe-fee` / `rental-yield` …）。

⚠️ **若这里不红** ⇒ 说明 `PILOT` 没被正确扩展，或产物是陈旧的 ⇒ **停下来查**。

### Step 2: 写 G14（新建文件）

`tests/calc-output-no-dd-guard.test.ts`：

```ts
#!/usr/bin/env node
// P168 B3-8 G14：产物页不得残留双美元号（$$）。
//
// ⭐ 为什么需要它（2026-11-16 实测）
//   `fmt()` 已带 '$'，调用处再拼一个就成 '$$'（P163 D1 的注释只提醒了，没拦住）。
//   ⇒ 实测 src/engines 有 24 处 '$$'，其中 20 处是**可见缺陷**
//   （产物层 140 处 / 14 页；线上已确认可见，其中 saas_valuation 32 处/页）。
//   ⇒ G9（英文页零变化）**抓不到**它：那 20 处是「一直就有的」，不在本批的基线差异里。
//
// ⭐ 判据：'$$' 后面**不跟** '$' 才是缺陷
//   · '$$12,000/yr'  → 缺陷（后面是数字）
//   · '\"$$$\"'       → 合法（垃圾邮件敏感词示例，FAQ 里的字面量）⇒ 后面跟 '$' ⇒ 放行
//
// source-only 做不到（产物层），故本守卫自建 dist。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');

function ensureBuilt(): void {
  const probe = resolve(ROOT, 'dist', 'zh', 'solopreneur-mrr-calculator', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p168-b3-8] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  assert.equal(r.status, 0, 'pnpm build failed with status ' + r.status);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

// '$$' 后面不跟 '$' ⇒ 缺陷；'$$$'（后面跟 '$'）⇒ 合法字面量，放行
const DD_DEFECT = /\$\$(?!\$)/g;

test('P168 B3-8 G14：产物页不得残留双美元号（$$）', () => {
  if (!process.env.RUN_BUILD_TESTS) {
    test.skip('build-dep：需要 RUN_BUILD_TESTS=1 与已构建的 dist/');
    return;
  }
  ensureBuilt();
  const files = walk(resolve(ROOT, 'dist'));
  assert.ok(files.length >= 50, 'dist/ 只有 ' + files.length + ' 个 HTML —— 构建可能不完整');
  const offenders: string[] = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const hits = html.match(DD_DEFECT);
    if (!hits || hits.length === 0) continue;
    const rel = f.slice(resolve(ROOT, 'dist').length + 1).replace(/\\/g, '/');
    offenders.push(rel + '  x' + hits.length);
  }
  assert.deepEqual(offenders, [], '产物页残留双美元号（' + offenders.length + ' 个文件）：\n  ' + offenders.slice(0, 25).join('\n  '));
});
```

### Step 3: 跑 G14，确认红

Run:
```
$env:RUN_BUILD_TESTS='1'; cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-no-dd-guard.test.ts"
```
Expected: **红**，报出 14 个文件（7 引擎 × 2 语言）。

### Step 4: 写可复算体检工具

`tests/scripts/p168-b3-8-audit.ts`：

```ts
#!/usr/bin/env node
// P168 B3-8 —— 可复算体检：逐引擎列出「卡片行 / 英文行 / 展示量 / 判定」。
//
// 用法（从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b3-8-audit.ts            # 全部 25 个已令牌化引擎
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b3-8-audit.ts time_value # 只看一个 alias
//
// ⭐ 它是「验收数字」的可复算来源（不依赖 tmp/ 里的临时文件 —— B3-7 教训）。

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { staticCard, isEnglishLine, hasBareToken } from './p168-card-text.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);

function distCard(lang: string, slug: string): string[] | null {
  const p = resolve(ROOT, 'dist', lang, slug, 'index.html');
  if (!existsSync(p)) return null;
  return staticCard(readFileSync(p, 'utf8'));
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const rows = TOKENIZED.filter((e) => only.length === 0 || only.some((n) => e.alias.includes(n) || e.slug.includes(n)));

let bad = 0;
let totalEn = 0;
console.log('alias'.padEnd(26) + 'lang  card  en  bare  判定');
for (const e of rows) {
  for (const lang of ['zh', 'en'] as const) {
    const card = distCard(lang, e.slug);
    if (!card) { console.log(e.alias.padEnd(26) + lang + '  产物不存在'); bad++; continue; }
    const en = card.filter(isEnglishLine);
    const bare = card.filter(hasBareToken);
    totalEn += en.length;
    const ok = en.length === 0 && bare.length === 0;
    if (!ok) bad++;
    console.log(e.alias.padEnd(26) + lang + '  ' + String(card.length).padStart(4) + '  ' + String(en.length).padStart(3) + '  ' + String(bare.length).padStart(4) + '  ' + (ok ? 'OK' : '待修'));
  }
}
console.log('—— ' + rows.length + ' 个引擎 · 英文行合计 ' + totalEn + ' · 不合格 ' + bad);
console.log(bad === 0 ? 'ALL OK' : 'NOT YET');
process.exitCode = bad === 0 ? 0 : 1;
```

⚠️ **文件名不能带 `.test.ts`**（否则 `walkTestSuites` 计数漂移、meta-守卫变红）。

### Step 5: 跑体检工具，确认它报出准确数字

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts"
```
Expected: 25 个引擎 × 2 语言 = 50 行；**英文行合计 248**（zh 侧；en 侧本来就该是英文 ⇒ 上面工具会把 en 侧的英文行也算进 totalEn ⇒ 预期 en 侧数字更大 ⇒ **只把 zh 侧当判据**）。

⚠️ 上面工具的 `totalEn` 同时累加了 en 侧 ⇒ 数字会大于 248。**这是有意的**（en 侧整行英文是正常的）⇒ 判据只看 `lang === 'zh'` 那些行的 `en` 数字。

### Step 6: Commit

```bash
git add tests/calc-output-no-dd-guard.test.ts tests/scripts/p168-b3-8-audit.ts
git commit -F tmp/commit-msg-b3-8-task2.txt
```

commit 信息：

```
test(guard): P168 B3-8 —— 新增 G14（产物页 0 处双美元号）+ 可复算体检工具

- G14（tests/calc-output-no-dd-guard.test.ts）：产物页不得残留 '$$'
  · 判据 '$$' 后面不跟 '$' ⇒ '$$12,000/yr' 是缺陷、'\"$$$\"' 是合法 FAQ 字面量
  · 实测：现 7 引擎 14 页共 140 处违反（源码 20 处缺陷 × 每处在页面出现多次）
- G13 落在 G4 同文件（G4c 断言扩到 25 个已令牌化引擎）⇒ 一处守一处
  · 实测：本批 15 个引擎 248 行英文违反
- 新增 tests/scripts/p168-b3-8-audit.ts：逐引擎卡片行 / 英文行 / 裸 token / 判定
  · 文件名不带 .test.ts（walkTestSuites 只收该后缀，否则套件计数漂移）

维度 3 scan: 基于信号 / 构建产物实测的 140 处双美元号（线上已确认可见）/
GSC 真实导出的 2,853 展示分布 / 源码级 24 处 '$$' 的 20/2/2 拆分
```

---

## Task 3: W1 —— time-value · safe-convertible-note · feature-adoption · inventory-turnover

**Files:**
- Modify: `src/engines/investment/time-value-calculator.ts`
- Modify: `src/engines/valuation/safe-convertible-note-calculator.ts`
- Modify: `src/engines/product-analytics/feature-adoption-calculator.ts`
- Modify: `src/engines/operations/inventory-turnover-calculator.ts`
- Create: `tmp/locale-w1.json`（**不入库**，工作笔记；Task 8 统一落库）

**Interfaces:**
- Consumes: `makeToken(code, fallback, params?)` / `CALC_OUTPUT_MAKE_TOKEN_JS`（`src/lib/calc-output-i18n.ts`）
- Produces: 4 个引擎的令牌化输出（服务端 `calculate()` 与客户端 `customFn` **两份同步**）+ `tmp/locale-w1.json`

### Step 1: 确认你的引擎清单（**不要凭印象改**）

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts time_value"
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts safe_convertible_note"
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts feature_adoption"
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts inventory_turnover"
```
Expected: 4 个引擎各自的**卡片行数 / 英文行数**，与 §0.9 的清单一致（24 / 23 / 5 / 11 行英文）。

### Step 2: 读引擎源码，逐行定 code

对每个引擎：
1. 读 `src/engines/<...>/<file>.ts`，找出**全部**输出行（含分支）；
2. 按 §0.3 的配方给每一行定 code；
3. **共享标签先查重**：在 `src/i18n/locales/en.json` 的 `calc_out.label.*` 值集合里找同文 ⇒ 有则复用。

### Step 3: token 化服务端实现（`calculate()`）

两种写法：

⭐ **写法 A（无 params）** —— 直接写 token 字面量：

```ts
result += '$calc_out.section.time_value_snapshot|💰 Time Value Snapshot' + '\n';
```

⚠️ token 里已经有 emoji ⇒ 不要再额外拼 emoji。

⭐⭐ **写法 B（有 params）** —— 用 `makeToken`：

```ts
import { makeToken } from '../../lib/calc-output-i18n';
...
result += '• ' + makeToken('calc_out.time_value.row.interest_total',
  'Total interest: ' + fmt(totalInterest),
  { total: fmt(totalInterest) }) + '\n';
```

⚠️ fallback 里不能有 `|`；⚠️ params 的值不能有 `{}`。

### Step 4: 同步 token 化客户端实现（`customFn`）

⚠️ `customFn` 是一段 **JS 源码字符串** ⇒ 它**不能 import** `makeToken` ⇒ token 构造器必须**前置**进函数体。

- 引擎文件顶部加 import：

```ts
import { CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';
```

- customFn 的第一段拼上这个常量：

```ts
const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var cnn=function(x){return Math.max(0,x)};" +
  ...
  "r+='• '+tk('calc_out.time_value.row.interest_total','Total interest: '+fmt(totalInterest),{total:fmt(totalInterest)})+'\n';" +
  ...
```

⭐ **前置为什么安全**：`new Function('inputs','pick','fill', body)` 的 body 里 `function tk(...){...}` 是**函数声明** ⇒ 被提升（hoisted）⇒ 正文任何位置都能调用 `tk` ✔。
⭐ **`new Function` 的签名不变**（仍是 3 个参数）⇒ `customfn-contract-guard` / `decision-support-guard` 零改动、继续绿 ✔。
⚠️ **`customfn-contract-guard` 会用空输入执行 customFn** ⇒ 令牌化后也必须正常返回 ✔（token 只是字符串）。

### Step 5: 按 §0.5 裁定表修漂移（W1 负责两个）

**safe-convertible-note** —— 客户端 emoji `💡` 改回服务端 `🟡`（health band）。
**feature-adoption** —— 客户端把文字 `YELLOW` 改回服务端用的 emoji，并让措辞与服务端一致（`if 10% of non-adopters convert this quarter` / `BREAKEVEN` / `MILESTONE` / `TIP` 的完整句子都要对齐服务端）。

⚠️ **只对齐措辞与 emoji，不改任何数值**。

### Step 6: 输出 locale 键清单（**不直接改 locale 文件**）

创建 `tmp/locale-w1.json`：

```json
{
  "calc_out.section.time_value_snapshot": { "en": "💰 Time Value Snapshot", "zh": "💰 时间价值快照" },
  "calc_out.label.annual_revenue": { "en": "Annual Revenue", "zh": "年收入" },
  "calc_out.time_value.row.total_interest": {
    "en": "Total interest: {total}",
    "zh": "利息合计：{total}"
  }
}
```

⚠️ **共享 label 在多个 worker 里出现时，en/zh 值必须逐字相同** ⇒ Task 8 合并时会检测冲突并报错。
⚠️ **zh 的 emoji 从 en 原样复制**（不要手打）。
⚠️ **en 值必须逐字等于源码原文**（含 emoji、空格、大小写）。

### Step 7: 跑 source-only 守卫（此时应红）

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-i18n-guard.test.ts"
```
Expected: **红**（locale 还没落库 ⇒ G2 缺键）—— **这是预期的**。

### Step 8: ⚠️ 收尾检查（确认没有越界）

Run:
```
git status --short
```
Expected: **只有你负责的 4 个引擎文件**被修改（+ `tmp/locale-w1.json` 未跟踪）。若出现别的引擎文件 ⇒ 立刻 `git checkout -- <那些文件>` 还原并报告。

### Step 9: ⚠️ **不 commit**（并行阶段 subagent 不做 git 操作）

控制器在 Task 3~7 全部完成后统一提交。

---

## Task 4: W2 —— stripe-fee · rental-yield · ai-api-cost-comparison · stockout-cost

**Files:**
- Modify: `src/engines/valuation/stripe-fee-calculator.ts`
- Modify: `src/engines/real-estate/rental-yield-calculator.ts`
- Modify: `src/engines/ai-cost/ai-api-cost-comparison.ts`
- Modify: `src/engines/operations/stockout-cost-calculator.ts`
- Create: `tmp/locale-w2.json`

**Interfaces:** 同 Task 3

### Step 1: 确认引擎清单

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts stripe_fee"
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts rental_yield"
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts ai_api_cost_comparison"
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts stockout_cost"
```
Expected: 英文行 **24 / 22 / 20 / 12**。

### Step 2~4: 读源码 → 定 code → 令牌化两侧

同 Task 3 的 Step 2~4。

⚠️ **ai-api-cost-comparison 是 AI cost 引擎** ⇒ 它的 `customFn` 由 `scripts/codegen-customfn.mjs` 生成（**model-shard 渲染**）⇒ 令牌化时**只改引擎文件里 customFn 那一段**，**不要跑 codegen**（并行阶段禁止）。

### Step 5: 按 §0.5 裁定表修漂移（W2 负责三个）

**stripe-fee** —— 客户端补齐对齐空格（服务端是 `fee:       $2`，客户端是 `fee: $2`）⇒ **对齐空格必须在 token 之外**（§0.3 配方第 2 条）。

**ai-api-cost-comparison** —— 客户端补齐两段：「📅 Pricing last updated: ...」与「🩺 Cost Health:」段（含分隔线与那两条 bullet）。

**rental-yield** —— ⭐ **改服务端**（§0.5 的代码片段）：给 `cashOnCashReturn({...args, downPayment: purchasePrice})` 加 `loanAmount: 0`。
⚠️ **客户端不用改**（客户端已经是对的）。
⚠️ 这一处会改变 en 页可见数字 ⇒ Task 8 要登记 `ALLOWED_DIFFS`。

### Step 6: 输出 locale 键清单 → `tmp/locale-w2.json`

同 Task 3 Step 6。

### Step 7: 跑 source-only 守卫（应红）

### Step 8: 收尾检查（`git status --short` 只有你的 4 个文件）

### Step 9: ⚠️ **不 commit**

---

## Task 5: W3 —— freelance-rate · freelance-tax · cart-abandonment-cost · burn-rate

**Files:**
- Modify: `src/engines/freelance/freelance-rate-calculator.ts`
- Modify: `src/engines/investment/freelance-tax-calculator.ts`
- Modify: `src/engines/marketing/cart-abandonment-cost-calculator.ts`
- Modify: `src/engines/saas/burn-rate-calculator.ts`
- Create: `tmp/locale-w3.json`

**Interfaces:** 同 Task 3

### Step 1: 确认引擎清单

Expected: 英文行 **17 / 25 / 18 / 7**。

### Step 2~4: 读源码 → 定 code → 令牌化两侧

### Step 5: 按 §0.5 裁定表修漂移（burn-rate）

**burn-rate** —— 客户端补齐 3 段（`🩺 Burn Health:` / `🔄 What-If Scenarios:` / `⚖️ Break-Even`），且 tip 现在是**裸 JSON** `💡 Tip: {"code":"burn_cashflow_positive","params":{}}` ⇒ **改成合规 token 形态**：
- 服务端与客户端都吐 `$calc_out.burn_rate.row.tip_cashflow_positive|<英文原文>|`
- ⚠️ **不要**把裸 JSON 留在输出里（G4 会抓裸 token；G2c 会抓不合协议的 code）。

### Step 6: ⭐ 顺带修 freelance-rate 的 3 处双美元号

`src/engines/freelance/freelance-rate-calculator.ts` 里 `$$90/hr` / `$$113/hr` / `$$150/hr` ⇒ 改成 `$90/hr` / `$113/hr` / `$150/hr`。
⚠️ 这是**输出字符串**里的字面量 ⇒ 直接改字符串内容，**不要改 `fmt()` 行为**。
⚠️ 这 3 处会改变 en 页可见文本 ⇒ Task 8 要登记 `ALLOWED_DIFFS`。

### Step 7: 输出 locale 键清单 → `tmp/locale-w3.json`

### Step 8: 跑 source-only 守卫（应红）

### Step 9: 收尾检查（只有你的 4 个文件）

### Step 10: ⚠️ **不 commit**

---

## Task 6: W4 —— reorder-point · sales-velocity · quota-attainment

**Files:**
- Modify: `src/engines/operations/reorder-point-calculator.ts`
- Modify: `src/engines/sales/sales-velocity-calculator.ts`
- Modify: `src/engines/sales/quota-attainment-calculator.ts`
- Create: `tmp/locale-w4.json`

**Interfaces:** 同 Task 3

### Step 1: 确认引擎清单

Expected: 英文行 **14 / 13 / 13**。

### Step 2~4: 读源码 → 定 code → 令牌化两侧

### Step 5: 输出 locale 键清单 → `tmp/locale-w4.json`

### Step 6: 跑 source-only 守卫（应红）

### Step 7: 收尾检查（只有你的 3 个文件）

### Step 8: ⚠️ **不 commit**

---

## Task 7: 非本批 6 个引擎的双美元号修复

**Files:**
- Modify: `src/engines/freelance/affiliate-income-calculator.ts`（5 处）
- Modify: `src/engines/freelance/course-pricing-calculator.ts`（1 处）
- Modify: `src/engines/freelance/email-list-revenue-calculator.ts`（1 处，**另有 1 处合法 FAQ 不改**）
- Modify: `src/engines/freelance/hourly-vs-fixed-calculator.ts`（1 处）
- Modify: `src/engines/valuation/unit-economics-calculator.ts`（1 处）
- Modify: `src/engines/valuation/saas-valuation-calculator.ts`（8 处，**已令牌化** ⇒ 改的是 token 之间的纯文本）

**Interfaces:**
- Consumes: 无
- Produces: 20 处双美元号全部修完（freelance-rate 的 3 处由 Task 5 / W3 负责）

⚠️ **为什么这 6 个引擎不在本批 15 个里也要修**：它们和 top15 是同一类缺陷（用户看到 `$$1,000/mo`），且每个都是 1 个字符的改动 ⇒ 成本近零。而 **saas-valuation 是 B3-7 昨天刚上线的试点页**（线上 32 处/页）⇒ 留着更刺眼。

### Step 1: 定位每一处（**逐处看上下文，不要盲改**）

Run（把探针写成文件再跑，⛔ 不要内联 `node -e`）：
```
cmd.exe /c "node tmp\probe-dollars.mjs"
```
Expected: 列出全部 24 处 `$$` 的上下文（文件:行号 + ±45 字符），其中 2 处标 `[COMMENT]`、2 处是合法 FAQ（`\"$$$\"`）。

⚠️ 若 `tmp/probe-dollars.mjs` 不存在，写一个（**不入库**）：

```js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
function walk(d, out) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.ts')) out.push(p); } return out; }
let n = 0;
for (const f of walk('src/engines', [])) {
  const src = readFileSync(f, 'utf8');
  let idx = src.indexOf('$$');
  while (idx >= 0) {
    const line = src.slice(0, idx).split('\n').length;
    const ctx = src.slice(Math.max(0, idx - 45), idx + 45).replace(/\n/g, ' ');
    const before = src.slice(Math.max(0, idx - 3), idx);
    const isComment = before.trim().endsWith('//') || before.indexOf('* ') >= 0;
    n++;
    console.log(f.replace(/\\/g, '/') + ':' + line + (isComment ? '  [COMMENT]' : '') + '  ...' + ctx + '...');
    idx = src.indexOf('$$', idx + 2);
  }
}
console.log('TOTAL $$ occurrences in src/engines: ' + n);
```

### Step 2: 改（**只改输出字符串里的字面量**）

例（affiliate-income）：
```ts
// 改前
'• 1K visitors/mo:  $1,000/mo  ($$12,000/yr)\n'
// 改后
'• 1K visitors/mo:  $1,000/mo  ($12,000/yr)\n'
```

⚠️ **不要改 `fmt()` / `money()` 的实现** —— 那些函数本来就带 `$`，是**调用处**多拼了一个。
⚠️ **不要改 2 处注释**（它们是解释这个 bug 的说明）与 **2 处合法 FAQ**（`\"FREE\"`, `\"URGENT\"`, `\"$$$\"`）。

### Step 3: 验证没有漏也没有多改

Run:
```
cmd.exe /c "node tmp\probe-dollars.mjs"
```
Expected: 剩余 **4 处**（2 注释 + 2 合法 FAQ）⇒ 缺陷 **24 → 0**（含 W3 修的 3 处）。

### Step 4: 跑 G14（此时应绿）

Run:
```
$env:RUN_BUILD_TESTS='1'; cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-no-dd-guard.test.ts"
```
Expected: **PASS**（产物要重建过才准 ⇒ 先跑 Task 8 的 codegen + 构建，或先手动构建一次）。

⚠️ 若红 ⇒ 检查是不是有 `$$` 落在**产物属性的 JSON 转义**里（`&dollar;` 之类）⇒ 把探针的判据改成 `\$\$(?!\$)` 再确认。

### Step 5: 收尾检查

```
git status --short
```
Expected: 只有上列 6 个引擎文件被修改。

---

## Task 8: locale 统一落库 + `ALLOWED_DIFFS` 登记 + 重生成 `staticExamples`

**Files:**
- Create: `tmp/canonical-b3-8.json`（**不入库**，落库中间产物）
- Modify: `src/i18n/locales/en.json` / `src/i18n/locales/zh.json`（**文本插入**）
- Modify: `tests/scripts/p168-en-page-parity.ts`（`ALLOWED_DIFFS` 新增 3 条）
- Modify: `src/engines/**`（codegen 重生成的 `staticExamples[0]`）

**Interfaces:**
- Consumes: `tmp/locale-w1.json` · `tmp/locale-w2.json` · `tmp/locale-w3.json` · `tmp/locale-w4.json`
- Produces: locale 里的新 `calc_out.*` 键 + `ALLOWED_DIFFS` 的 3 条有意改动登记

### Step 1: 合并 4 份 locale 清单（**并检测冲突**）

写 `tmp/merge-b3-8-locale.mjs`（**不入库**）：

```js
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = ['tmp/locale-w1.json', 'tmp/locale-w2.json', 'tmp/locale-w3.json', 'tmp/locale-w4.json'];
const merged = {};
const conflicts = [];
const byEn = new Map();

for (const f of FILES) {
  let obj;
  try { obj = JSON.parse(readFileSync(f, 'utf8')); }
  catch (e) { console.error('读不到 ' + f + '：' + e.message); process.exit(2); }
  for (const [k, v] of Object.entries(obj)) {
    if (merged[k]) {
      if (merged[k].en !== v.en || merged[k].zh !== v.zh) {
        conflicts.push(k + '\n  A: ' + JSON.stringify(merged[k]) + '\n  B: ' + JSON.stringify(v));
      }
      continue;
    }
    merged[k] = v;
    // 同文多键检测（共享标签复用规则的体检）
    if (k.startsWith('calc_out.label.')) {
      const prev = byEn.get(v.en);
      if (prev && prev !== k) {
        console.log('⚠️ 同文多键（应复用同一键）：' + prev + '  与  ' + k + '   en=' + JSON.stringify(v.en));
      }
      byEn.set(v.en, k);
    }
  }
}

if (conflicts.length) {
  console.error('❌ 键值冲突 ' + conflicts.length + ' 处：\n' + conflicts.join('\n'));
  process.exit(1);
}

const out = {};
for (const k of Object.keys(merged).sort()) out[k] = merged[k];
writeFileSync('tmp/canonical-b3-8.json', JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('合并 ' + Object.keys(out).length + ' 个键 → tmp/canonical-b3-8.json');
console.log('  label.*  = ' + Object.keys(out).filter((k) => k.startsWith('calc_out.label.')).length);
console.log('  section.*= ' + Object.keys(out).filter((k) => k.startsWith('calc_out.section.')).length);
console.log('  row.*    = ' + Object.keys(out).filter((k) => k.startsWith('calc_out.') && !k.startsWith('calc_out.label.') && !k.startsWith('calc_out.section.')).length);
```

Run:
```
cmd.exe /c "node tmp\merge-b3-8-locale.mjs"
```
Expected: 无冲突 ⇒ 打印合并键数与三族分布。若有「同文多键」警告 ⇒ **回到对应 worker 改成复用同一键**（不要合并成新键）。

### Step 2: 落库（**文本插入，不是整文件重写**）

Run:
```
cmd.exe /c "node scripts\write-calc-out-locale.mjs --src tmp\canonical-b3-8.json"
```
Expected: 打印插入的键数。

⚠️ **落库后必须验证 `git diff` 只显示新增行**：
```
git diff --stat src/i18n/locales/en.json src/i18n/locales/zh.json
```
Expected: 只有新增（`+N / -0`）⇒ 若出现大量 `-`，说明有人整文件重排了 ⇒ `git checkout -- src/i18n/locales/` 还原后重做。

⚠️ **插入位置**：紧跟 `decision_tip.*` 之后（locale 是语义分组，不是字典序）。

### Step 3: 登记 `ALLOWED_DIFFS` 的 3 条有意改动

`tests/scripts/p168-en-page-parity.ts`：

```ts
/** ⭐ 已记录的「有意改动」白名单（每条都要写明理由） */
export const ALLOWED_DIFFS: Record<string, string[]> = {
  // mrr：`🔄 What-If Scenarios` → `🔄 What-If Scenarios:`（全仓主流写法带冒号；计划已记录）
  'solopreneur-mrr-calculator': ['🔄 What-If Scenarios:'],
  // ⭐ B3-8（2026-11-16）：修双美元号缺陷（'$$' → '$'）⇒ en 页故意变（G14 保证彻底消失）
  'solopreneur-saas-valuation-calculator': ['$$1,000,000', '$$2,000,000', '$$4,000,000', '$$13,000,000', '$$15,000,000', '$$20,000,000', '$$30,000,000', '$$40,000,000'],
  'solopreneur-freelance-rate-calculator': ['$$90/hr', '$$113/hr', '$$150/hr'],
  // ⭐ B3-8（2026-11-16）：修服务端「100% 全款」场景的数值 bug（贷款未置零）⇒ en 页故意变
  'solopreneur-rental-yield-calculator': ['1.08%'],
};
```

⚠️ **白名单按子串匹配 diff 行** ⇒ 必须写**具体值**。
⛔ **不得写 `$$` 这种泛化子串**（会让任何 `$$` 差异都被放行 ⇒ G14 才是兜底）。
⚠️ saas-valuation 的 8 个值以**实测**为准 ⇒ 跑 G9 时看它报出的实际 diff 文本，逐个补进白名单（不要凭猜）。

### Step 4: 跑 G9，看它是否只剩「已登记的有意改动」

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-en-page-parity.ts"
```
Expected: 每行是 `✔`（逐字不变）或 `⊙`（只有已登记的有意改动）⇒ **绝不能有 `✗`**。
⚠️ 若有 `✗` ⇒ 是**未登记**的 en 页变化 ⇒ **停下来查**（多半是令牌化时丢了空格 / 改了措辞）。

### Step 5: 重生成 `staticExamples[0]`

Run:
```
cmd.exe /c "node scripts\codegen-examples.mjs"
cmd.exe /c "node scripts\codegen-examples.mjs --check"
```
Expected: 两条都 exit 0（`--check` 无漂移）。

⚠️ **这一步会重写全部 100 个引擎的 `staticExamples[0]`** ⇒ 只有在 4 个 worker 全部完成后才能跑（并行阶段禁止）。

### Step 6: 跑全部 source-only 守卫（此时应全绿）

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-i18n-guard.test.ts tests\calc-output-en-parity-guard.test.ts tests\calc-output-parity-guard.test.ts tests\calc-output-render-parity-guard.test.ts"
```
Expected: **全绿**。

⚠️ 若 G6 仍红 ⇒ 某个引擎两侧仍不一致 ⇒ 用 Task 4/5 的裁定表再核一遍。

---

## Task 9: 全量验收

**Files:** 只读（不产生改动）

### Step 1: 类型检查

Run:
```
npx tsc --noEmit
```
Expected: exit 0。

### Step 2: 构建

Run:
```
$env:SKIP_INDEXNOW='1'; pnpm build
```
Expected: **438 页**（`injected=438 skipped=0 failed=0`），exit 0。

### Step 3: 全部守卫

Run:
```
$env:RUN_BUILD_TESTS='1'; $env:SKIP_INDEXNOW='1'; cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-i18n-guard.test.ts tests\calc-output-render-guard.test.ts tests\calc-output-en-parity-guard.test.ts tests\calc-output-parity-guard.test.ts tests\calc-output-render-parity-guard.test.ts tests\calc-output-no-dd-guard.test.ts tests\dead-i18n-keys-guard.test.ts tests\page-size-guard.test.ts"
```
Expected: **全绿**。

⚠️ `page-size-guard` 是体积守卫 ⇒ 注入子集裁剪后每页应更小 ⇒ **不得因此调高阈值**。

⚠️ **另跑两个可复算工具**（它们不在 CI 套件里 ⇒ 要手动跑）：
```
cmd.exe /c "node tests\scripts\p168-card-parity.mjs --check"
cmd.exe /c "node tests\scripts\p168-calc-output-audit.mjs"
```
Expected: `p168-card-parity.mjs --check` **exit 0**（25 个引擎的 zh 卡片结构全部合格）；`p168-calc-output-audit.mjs` 的「zh 卡片英文行」一列**全为 0**。

### Step 4: 体检工具（**验收数字的可复算来源**）

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-b3-8-audit.ts"
```
Expected: **zh 侧英文行 = 0**；末行 `ALL OK`，exit 0。

⚠️ **en 侧整行英文是正常的** ⇒ 只看 zh 侧那一列。

### Step 5: 双美元号最终核对

Run:
```
cmd.exe /c "node tmp\probe-dollars.mjs"
```
Expected: 剩余 **4 处**（2 注释 + 2 合法 FAQ）⇒ 缺陷 0。

### Step 6: 全量套件（**CI 等价**）

Run:
```
$env:RUN_BUILD_TESTS='1'; $env:SKIP_INDEXNOW='1'; node tests/run.mjs
```
Expected: **10 批 / 291 套件 / 全部 `# fail 0`**，exit 0。

⚠️ 这一步约 20~30 分钟 ⇒ 放后台跑。

### Step 7: 记录验收数字（**写进 CHANGELOG 与本计划 §10**）

至少记录：locale 新增键数（三族分布）· 守卫条数 · 体检工具的 zh 英文行数 · 双美元号剩余数 · 构建页数 · 全量套件套件数与 tests 数 · 每个引擎省下的字节数（注入子集裁剪前后）。

---

## Task 10: 浏览器目视验收（**不可省**）

**Files:** 无改动

⚠️ 守卫只证明「机器可判的」；**人眼必须确认 zh 页的卡片读起来是中文、格式没塌**。

### Step 1: 起本地静态服务

Run（后台）：
```
cmd.exe /c "node tmp\static-server.mjs"
```
若 `tmp/static-server.mjs` 不存在，写一个（**不入库**）：

```js
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOT = 'dist';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(ROOT, p);
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(4321, () => console.log('http://127.0.0.1:4321'));
```

### Step 2: 逐个看这 15 个 zh 页（用 `browse` skill 或 Chrome DevTools MCP）

页 URL 形如 `http://127.0.0.1:4321/zh/<slug>/`。

重点检查：
1. **卡片整段是中文**（不是「中文标签 + 英文句子」）；
2. **数值没消失**（令牌化最容易犯的错：标签模板把数值一起替换掉 ⇒ 页面数字空了）；
3. **对齐没塌**（`fee:       $2` 这类对齐空格还在）；
4. **emoji 颜色没串**（🟢🟡🟠🔴 的位置对）；
5. **tip 行还在**（且是中文）；
6. **章节标题是中文**（不是英文标题）。

### Step 3: 对照 en 页（英文页应与改动前逐字相同）

挑 3 个引擎（time-value / stripe-fee / rental-yield）对比 en 页：
- en 页应与本批改动前**完全一致**（除已登记的 3 处有意改动）；
- ⚠️ **rental-yield 的「100% 全款」行应显示 6.89%**（不是 1.08%）—— 这是**预期变化**。

### Step 4: 把目视结论写进本计划 §10

---

## Task 11: 文档同步

**Files:**
- Modify: `CHANGELOG.md`（头部「最后更新」+ 「Total commits」+ 「验证:」行 + 新增 B3-8 段落）
- Modify: `AGENTS.md`（B3-8 note + 同族教训）
- Modify: `docs/superpowers/specs/2026-11-16-p168-b3-8-zh-card-localization-rollout-design.md`（**§10 实施期实测修正**）
- Modify: `docs/superpowers/plans/2026-11-16-p168-b3-8-zh-card-localization-rollout.md`（本文件 §10 实施期实测修正）
- Modify: `docs/superpowers/plans/INDEX.md`（登记本计划）

### Step 1: 写 CHANGELOG 的 B3-8 段落

必须含：**实测数字** + **同族教训** + **维度 3 scan 声明**。
同族教训至少写这三条（本批真正学到的）：
1. ⭐ **「渲染期行表」看着便宜，实测覆盖率 12% ⇒ 比全英文更糟** —— 评估替代方案先量覆盖率；
2. ⭐ **G6 漂移不能一律「客户端对齐服务端」** —— 逐例 diff 发现 rental-yield 是**服务端**的 bug（贷款未置零）⇒ 数值分歧必须逐例裁定；
3. ⭐ **G9 需要按引擎分组的基线** —— 一批引入「有意改动」时，单值基线会逼你放松判据；正确做法是分组基线 + 白名单逐条写理由。

### Step 2: 写 AGENTS.md 的 B3-8 note

挂在 B3-7 note 之后，沿用既有格式。

### Step 3: 回填两份文档的 §10 实施期实测修正

把实施中「计划与实测不符」的地方写进去（没有就写「本批无偏离」）。

### Step 4: 登记 plans INDEX

Run:
```
cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p167-index-regen.ts"
```
Expected: 打印本计划该补的那一行 ⇒ **人工归组**到 P168 段并粘贴；同时把计数表与「最后更新」行更新。

⚠️ INDEX 的分组需要人判断 ⇒ 工具只给行，**粘贴与计数由你做**。

### Step 5: 跑文档守卫

Run:
```
$env:RUN_BUILD_TESTS='1'; cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\doc-freshness-guard.test.ts tests\claude-md-invariant-guard.test.ts"
```
Expected: **全绿**。

⚠️ `claude-md-invariant-guard` 会核对 CHANGELOG 的 `Total commits`（容差 5）与「最后更新」日期（容差 7 天）⇒ **提交前**先把这两个值回填好。

---

## Task 12: 提交与推送（**必须先问用户**）

**Files:** 全部待提交文件

### Step 1: 确认工作区只含预期改动

```
git status --short
```
Expected: 15 个引擎文件 + `src/i18n/locales/{en,zh}.json` + `tests/scripts/p168-tokenized-engines.mjs` + `tests/scripts/p168-b3-8-audit.ts` + `tests/calc-output-no-dd-guard.test.ts` + `tests/scripts/p168-{card-text,server-client-parity,en-page-parity}.*` + `tests/calc-output-{i18n,en-parity}-guard.test.ts` + `CHANGELOG.md` + `AGENTS.md` + 两份 docs。
⚠️ `bing-block-urls.csv` 必须**保持未跟踪**。

### Step 2: **问用户**（带选项 + 推荐 + 理由）

⛔ **不允许自动 commit / push**。

### Step 3: 回填 CHANGELOG 的 `Total commits`

提交后 `git rev-list --count HEAD` 会 +1 ⇒ 把 CHANGELOG 的 `Total commits` 改成实际值（容差 5 ⇒ 不改也不会红，但**要改**）。

### Step 4: 提交

⚠️ commit 信息必须用 `git commit -F <utf8file>`（PowerShell `>` 会写 UTF-16LE+BOM）。
⚠️ commit 信息**绝不能**含 `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`。

```
git add <Step 1 列出的文件>
git commit -F tmp/commit-msg-b3-8.txt
```

### Step 5: 提交后**重跑守卫**（G9 同族教训：断言在提交前后含义不同）

```
$env:RUN_BUILD_TESTS='1'; cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-en-parity-guard.test.ts tests\doc-freshness-guard.test.ts tests\claude-md-invariant-guard.test.ts"
```
Expected: **全绿**。

### Step 6: push 前先 fetch + 确认 0 behind

```
$env:GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe'; $env:GIT_SSH_VARIANT='external'
git fetch 'ssh://git@ssh.github.com:443/wlz679/forgeflow.git' master:refs/remotes/github/master
$env:GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe -o StrictHostKeyChecking=accept-new'
git fetch origin master
git rev-list --left-right --count origin/master...HEAD
git rev-list --left-right --count github/master...HEAD
```
Expected: 两个都是 **0<TAB>N**（behind=0）。⛔ **behind > 0 时禁止 push** ⇒ 先 `git pull --rebase` 同步，冲突则停下报告。

### Step 7: push 双远端

```
git push 'ssh://git@ssh.github.com:443/wlz679/forgeflow.git' master
git push origin master
```
⚠️ **禁止 force-push**。

### Step 8: 等 CI 绿

用公开 API（`gh` 未登录也能查）：
```
https://api.github.com/repos/wlz679/forgeflow/actions/runs?branch=master&per_page=3
```
再用 `.../actions/runs/<run_id>/jobs` 确认 `Unit tests` / `Build` 两步都 success（不是整段 skip）。

### Step 9: ⭐ 线上复验（**push 到 GitHub master ≈ 上线**，CF Pages 部署约 4 分钟）

⚠️ **边缘缓存会伪装成「没部署」** ⇒ 必须带随机 cache-buster 重取：

```js
const res = await fetch('https://forgeflowkit.com/zh/' + slug + '/?cb=' + Date.now(), { headers: { 'cache-control': 'no-cache' } });
```

逐项比对（**不要只看字节数**）：
1. 状态码 200；
2. 注入模板的**键集合与取值**与本地 build 逐项相同；
3. `data-calc-output-raw` / `data-export` 的**属性长度**与本地逐字节相等；
4. 字节差 **恒定 +153 B**（Cloudflare 注入的 `data-cfasync` 属性）⇒ 差值在阈值内即同版；
5. zh 页**无整行英文**、**无 `$$`**。

15 个页面全过 ⇒ 收尾。

---

## 维度 3 scan

**基于信号 / ① GSC 真实导出（站外市场信号）** —— 2,853 展示的分布（top15 = 73%、top20 = 81%、top30 = 91%）直接决定了批次大小；227 个「有排名 0 点击」待铺页里 zh 工具页 77 个、其中 66 个卡片仍是英文（2,200 展示）；且**已铺决策支持仍 0 点击的 4 个 zh 页卡片全部是英文** ⇒ 本批优先修英文卡片，而非先铺决策支持。
**② 构建产物实测** —— 90 页 / 1,081 行英文 / 140 处 `$$` / 唯一行 1,078 / 标签形态覆盖 12% ⇒ 既定死了「必须逐引擎令牌化」，也否决了「渲染期行表」这条看似便宜的路。
**③ 源码级审计** —— `codegen-examples.mjs` 只重生成 `staticExamples[0]`、`codegen-customfn.mjs` 只重生成 pricing 数据表 ⇒ 英文文案是手写的 ⇒ 无生成器捷径；G6 漂移逐例 diff 后发现 5 例是格式/缺失、**1 例是服务端真 bug** ⇒ 推翻了「服务端永远是真相源」这条默认规则（数值分歧必须逐例裁定）。
⚠️ **仍无实时外部网页扫描**（本批未做竞品/模型 release 扫描）—— 但 GSC 导出本身就是外部市场信号。
⚠️ **本批的效果指标本地测不出来** —— zh 页 CTR 是否回升只能等 GSC 2~4 周窗口。

---

## 未解决（本批不做）

1. 剩余 **75 个引擎**（展示量 top16~90）—— 同一流程，预计再 4~5 批；
2. 其余 **44 个漂移引擎** —— 需逐例 diff 后裁定，**不能盲目「客户端对齐服务端」**；
3. **决策支持铺开到 227 页** —— zh 侧应在卡片中文化之后做；en 侧（105 个工具页有展示）可独立推进；
4. codegen 剩余 15 个引擎 `defaultInputs` 错配；
5. GSC **2~4 周观察窗口** —— 复审 zh 页 CTR / 索引率（唯一能证实因果的环节）；
6. GSC 4 条孤儿查询 / 204 个 404 的 URL 级明细 / 21 个候选页逐 URL 数据。

---

## 实施期实测修正（实施时补写）

> 本节留空。实施过程中任何「计划与实测不符」的地方，**必须**在此记录并写明为什么改（沿用 B3-7 §10 的体例）。
> 同时在 `docs/superpowers/specs/2026-11-16-p168-b3-8-zh-card-localization-rollout-design.md` 的 §10 同步记录。
