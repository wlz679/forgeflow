# P168 批次 3 · B3-4 —— 15 个残留中文 🧭 决策段迁出 + 建议码化（实施计划）

> **批次**：批次 3 的**第五批**。B3-0（burn-rate 试点）/ B3-1（3 个异类引擎）/ B3-2（标题瘦身）/
> B3-3（本批的前身：zh 动态层英文缺陷修复 —— 建议码 + locale 模板，已上线）之后，
> 继续收掉**最后一批仍在英文页泄漏中文决策段**的工具。
>
> **用户拍板**：2026-11-10 —— 「下一批做 B3-4：15 个残留中文决策段迁出」+「GSC 导出现在就导」。
> **执行方式**：并行分波（provider 已恢复健康，实测 probe 通过）。

---

## 1. 目标与验收

### 目标

1. ⭐⭐ **英文页零中文泄漏** —— 15 个工具页的 🧭 决策段迁进 locale（en + zh）⇒ en 页不再出现中文段。
2. ⭐ **决策支持覆盖 4/100 → 19/100** —— 迁出的 15 个工具同时获得「🧭 算完之后」区块（静态 4 层 + 动态建议）。
3. ⭐ **动态层在 zh 页是中文** —— 这 13 个引擎的 Tip 目前是**英文写死**（有的还是常量）⇒ 一并改**建议码 + locale 模板**，
   沿用 B3-3 已上线的形态 A。
4. ⭐ **补上守卫盲区** —— 现有「英文页不得含中文」断言**只遍历已激活的 4 个工具** ⇒ 这 15 页对守卫**完全隐形**
   ⇒ 本批把该断言扩到**全部 100 个工具页**（用产物级扫描）。

### 范围外

- zh 页**结果卡片正文整段英文**（92 个引擎）—— 用户已拍板独立排期（量级远大于本批）。
- 决策支持铺开到 71 页（67 个工具 × 8 键 = 536 条手写文案）—— 需先有 GSC 查询词才能排优先级。
- 2 个 B3-2 Minor（seoTitle 键位置 / generate-seo-titles.mjs 无 --check）—— 与本批无关，另行处理。

### 验收（一句话）

**英文页零中文 + 19 个工具的决策层齐 + 守恒不变量覆盖 19 个工具 + 变异台子全 KILLED + 全量套件 0 失败。**

---

## 2. 存量清单（实测，不是估计）

取证脚本：`tmp/b3-4-recon.ts` / `tmp/b3-4-recon2.ts` / `tmp/b3-4-dump.ts`
素材导出：`tmp/b3-4-decision-text.md`（15 引擎 × 四层原文 + Tip 行 + 跨工具引用）

| # | 引擎 | 分类 | 四层长度 Q/Rec/Unc/Next | 跨工具引用 | Tip | Tip 形态 |
|---|---|---|---|---|---|---|
| 1 | churn-rate | A SaaS | 65/142/138/**615** | 1 | 有 | ⚠️ **常量** |
| 2 | gpu-cloud-cost | B AI Cost | 102/194/183/190 | 3 | **无** | — 需补 |
| 3 | saas-valuation | C | 110/173/167/443 | 3 | 有 | ⚠️ **常量** |
| 4 | freelance-rate | D | 123/219/180/197 | 3 | 有 | ⚠️ **常量** |
| 5 | employee-cost | E | 128/219/154/200 | 3 | 有 | ⚠️ **常量** |
| 6 | equity-dilution | F | 116/182/186/**621** | 3 | 有 | ⚠️ **常量** |
| 7 | rent-vs-buy | F | 145/234/154/183 | 3 | 有 | 动态（探针未测出） |
| 8 | roas | M | 62/168/129/99 | 0 | 有 | 动态（探针未测出） |
| 9 | stockout-cost | O | 115/271/174/213 | 3 | 有 | 动态（探针未测出） |
| 10 | acv | S | 94/189/113/170 | 3 | 有 | ⚠️ **常量** |
| 11 | customer-health-score | R | 82/183/128/166 | 3 | 有 | 动态（探针未测出） |
| 12 | funnel-step | P | 92/176/170/206 | 3 | **无** | — 需补 |
| 13 | comp-banding | H | 131/191/185/206 | 3 | 有 | ⚠️ **常量** |
| 14 | csat | T | 99/188/156/175 | 3 | 有 | ⚠️ **常量** |
| 15 | kb-coverage-rate | K | 126/218/142/199 | 3 | 有 | ⚠️ **常量** |

**合计**：15 引擎 · 四层 **60 条**中文（× 2 语言 = **120 个 locale 键**）· 跨工具引用 **40** ·
Tip 源码行 29（多数是「运行时 + customFn 镜像」各 1 行）· **8 个 Tip 是常量** · **2 个引擎没有 Tip**。

⚠️ **探针的坑**：「动态（探针未测出）」= 我的探针用 placeholder 当输入 ⇒ 被清洗成 ..1000 ⇒ NaN
⇒ **探针没测到 ≠ Tip 不存在**（B3-1 的老教训）。本批必须用**真实输入**的探针（照 `tests/_decision-tip-probe.ts` 的做法）。

---

## 3. 形态定案

沿用 B3-0/B3-1 的「**迁出 = 三件事**」+ B3-3 的「**建议码 + locale 模板**」：

| # | 做什么 | 为什么不能少 |
|---|---|---|
| ① | 四层文本搬进 locale（tools.<slug>.decision_{goal,recommendation,constraint,next_tool}） | 不搬 ⇒ en 页继续显示中文 |
| ② | 从引擎里**删掉**那段中文（运行时输出 + customFn 镜像，**两侧都要**） | 不删 ⇒ 同页重复（区块一份 + 卡片一份） |
| ③ | **补真动态 Tip**（常量 Tip 要改成随输入分支；无 Tip 的要补） | 迁出后 decisionRender=true ⇒ Tip 从卡片移进区块 ⇒ 常量 Tip ⇒ 区块名不副实 |

⚠️ **Tip 必须建议码化**（B3-3 的形态 A）：这 13 个 Tip 是**英文写死**的 ⇒ 迁出后动态层在 zh 页会显示英文
⇒ 正好把 B3-3 刚修好的缺陷**在这 15 个工具上重新引入** ⇒ 必须一并改码 + 写 zh 模板。

⚠️ **文案形态口径（照 B3-1 已上线的 4 个工具）**：

- **纯散文文本，不要 markdown 粗体 `**`**（locale 的值会被直接渲染成纯文本 ⇒ 星号会原样显示）；
- **en 与 zh 语义对等**（不是逐字互译，各自读得通）⇒ 守恒的「zh 信息量 ≥ en × 0.7」才成立；
- **阈值 / 数字 / 条件一个都不能丢**（例如 cac 的「LTV:CAC < 2 = 停投；2-3 = 谨慎；3-5 = 扩量；> 5 = 抢窗口」）；
- **跨工具引用写成 `[真实 shortTitle]`**（en 用英文 shortTitle / zh 用中文 shortTitle）。

⭐ exemplar（B3-1 已上线的 cac `decision_goal`）：

> en：A CAC figure on its own does not tell you whether acquisition was worth paying for. …
> zh：单看一个 CAC 数字，回答不了「这次获客到底值不值」。……

⚠️ **四层与 L5 契约的映射**（tests/l5-layers.json）：

| 引擎里的子层 | locale 键 | 含义 |
|---|---|---|
| 🧭 Decision Question | decision_goal | 这个数字该用来做什么决策 |
| 🧭 Recommendation | decision_recommendation | 据此该怎么定 |
| 🧭 Key Uncertainty | decision_constraint | 什么情况下别信它 |
| 🧭 Next Action | decision_next_tool | 下一步用哪个工具 |

⚠️ **跨工具引用必须逐个校验**（B3-1 的教训）：方括号引用**拼错就被整条跳过**
⇒ 守卫照样绿 ⇒ 本批 40 处引用逐个比对真实 tools.<slug>.shortTitle（en 用英文名、zh 用中文名）。

---

## 4. 分波与并行写者归属

⚠️ **写者必须文件不相交**（硬规则）：locale 只有 en.json / zh.json 两个文件 ⇒ **locale 由单一写者串行写**；
引擎文件之间互不相交 ⇒ **可并行**。

### Wave A（每个工具一个 worker · 15 个并行 · 每人 2 个不相交文件）

⭐ **写者归属按「工具」切，而不是按「阶段」切** —— 一个工具的 locale 文案与它的引擎改动**必须同一个人**
（建议码要同时出现在引擎输出与 locale 模板里 ⇒ 拆给两个人必然对不上）。

每个 worker 拥有 **2 个文件**（互不相交）：

1. `src/engines/<cat>/<name>.ts`（该引擎文件）
2. `tmp/b3-4/frag-<slug>.json`（该工具的 locale 片段：4 层 × en/zh + 建议码 × en/zh）

做三件事：

1. 删掉四层中文段（**运行时输出 + customFn 镜像两侧**）
2. Tip 改成建议码（💡 Tip: {"code":"...","params":{...}}）· 常量 Tip 改成**按输入分支**
3. 无 Tip 的 2 个引擎补一条**真动态** Tip

⚠️ **双写必须原子**：同一文件里的 TS 侧与 customFn 侧由**同一个 worker** 改 ⇒ 不会半改。
⚠️ **锚点必须唯一**：改之前先确认要替换的字面量在该文件里**只出现一次**（B3-3 的 M12 教训）。

### Wave B（locale 落盘 + 复核 · 单一写者 · 我）

把 15 个 fragment **逐个复核后**合并进 en.json / zh.json（**文本插入，不重新序列化**，避免重排 5600+ 键）·
并把 15 个建议码的 en/zh 模板插进 decision_tip.* 区块。

### Wave 4（同族测试 · 15 个并行 worker · 每人一个测试文件）

每个 exp-p151-l5-<slug>.test.ts 断言「引擎输出里有那 4 段」⇒ 迁出后必红 ⇒
**改判据到更高的抽象层**（引擎输出 ∪ 页面 i18n 键，与 decision-layer-coverage-guard 同一口径）——
**不是把守卫改松**（B3-1 的教训）。

### Wave 5（守卫 + 台子 + 生成物 · 我）

- codegen-examples / codegen-customfn 重新生成并提交
- decision-tip-i18n-guard 的守恒断言扩到 **19 个工具**（源码 == 探针 == 登记 == locale en+zh）
- ⭐ **新断言：英文页零中文（产物级，扫全部 100 个工具页）** —— 补上「未激活工具对守卫隐形」的盲区
- ⭐ 新断言：**跨工具引用必须指向真实工具**（40 处逐个比对 shortTitle）
- 变异台子加本批变异（每条只红一条断言）

---

## 5. 已知坑清单（每一条都来自实测或本项目老教训）

| # | 坑 | 出处 | 对策 |
|---|---|---|---|
| 1 | **13 个 exp-p151-l5-* 会一起红**（不是 15 个） | 实测：15 个同族测试文件里 `ltv-by-channel` / `gdpr-fine` 是 B3-1 已迁移的；本批 15 个引擎里 **`churn-rate` 与 `roas` 没有 L5 同族测试** ⇒ 实际要改判据的是 **13 个** | Wave 4 改判据到更高抽象层（不改松） |
| 2 | customFn 是**手写镜像**，不会被任何脚本自动生成 | 实测 | Wave 2 双写原子（同 worker 同文件） |
| 3 | staticExamples[0] 由 codegen-examples 生成 | 实测 | 改完引擎必须跑生成器并提交；--check 必须 exit 0 |
| 4 | 跨工具引用拼错 ⇒ 守卫**整条跳过** ⇒ 假绿 | B3-1 教训 | 逐个比对真实 shortTitle，并加「悬空引用」断言 |
| 5 | decisionRender 变 true ⇒ Tip 从卡片**移进区块** ⇒ 卡片少一行 | 机制 | 预期行为；零重复断言随之覆盖 |
| 6 | 迁出后守恒断言的**码集合**从 4 变 19 | B3-3 机制 | 守恒断言按 19 个工具重算（一条，仍只红一条） |
| 7 | **常量 Tip** ⇒ 「决策建议必须随输入变化」那条断言红 | B3-1 教训 | Wave 2 把常量 Tip 改成按输入分支 |
| 8 | 「英文页不得含中文」只守**已激活**工具 ⇒ 15 页隐形 | 本批取证 | Wave 5 加产物级「全 100 工具页零中文」断言 |
| 9 | 探针用 placeholder ⇒ NaN ⇒ **测不到** | B3-1 教训 | 探针输入用**真实数值**（照 tests/_decision-tip-probe.ts） |
| 10 | locale 用 JSON.parse/stringify 重序列化 ⇒ 重排 5600+ 键 ⇒ diff 爆掉 | 实测 | **文本插入** + 补行间逗号 |
| 11 | 只改 TS 侧不改 customFn ⇒ parity 断言红 | B3-1 教训 | Wave 2 同 worker 双写 |
| 12 | 「搬进 locale」到底搬成什么样 | ⭐ **实测 B3-1 的先例：不是逐字搬，是改写成散文**（cac 迁移前的中文是 `(1) **LTV:CAC ≥ 3.0**…` 这种带 markdown 的结构化写法 ⇒ 迁移后的 zh locale 值是**去粗体的散文**）⇒ 本批沿用：**去 `**`、融成自然散文、但一个阈值/数字/条件都不能丢**；en 与 zh 语义对等 |

---

## 6. 验收清单（可执行 + 期望值）

```bash
# 静态检查
pnpm exec tsc --noEmit                                    # exit 0
node scripts/codegen-examples.mjs --check                 # exit 0（19 工具的 staticExamples 已同步）
node scripts/codegen-customfn.mjs --check                 # exit 0
node scripts/check-i18n-completeness.mjs                  # exit 0
node scripts/check-engine-count-by-category.mjs --check   # exit 0
node scripts/score-user-value.mjs --check                 # exit 0
node scripts/codegen-review-dates.mjs --check             # exit 0

# 守卫（源码级）
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 \
  tests/decision-tip-i18n-guard.test.ts \
  tests/decision-support-guard.test.ts                    # 全绿
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 \
  tests/exp-p151-l5-acv.test.ts ...（15 个同族）           # 全绿

# 守卫（产物级）
$env:RUN_BUILD_TESTS='1'; pnpm build
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 \
  tests/decision-support-build-guard.test.ts               # 全绿 + 新增「全 100 工具页零中文」

# 变异台子
node tests/scripts/mutate-p168-decision-support.mjs        # 全部 KILLED
node tests/scripts/mutate-p168-decision-support.mjs --negative-control   # RED-BUT-NOT-ISOLATED 且自身 exit 0

# 全量
node tmp/run-full-with-log.cjs                             # 0 失败
```

**验收数字（收尾时填）**：迁移工具数 / 新增 locale 键数 / 建议码数 / 守卫条数 / 台子条数 / 全量套件数 / 产物实测。

---

## 7. 维度 3 scan 声明

> **维度 3 scan: 基于信号 ① 站内专项扫描**（15 个引擎的决策段四层原文 + Tip 分支 + 跨工具引用全量导出；
> 4 个已迁工具的守恒/建议码机制作为同族范式）**② 站内源码取证**（15 个 exp-p151-l5-* 同族测试的存在与断言口径；
> stripDecisionTip 与 decisionRender 的耦合点；liveDate 那类「可见变化面可静态算出来」的做法）
> **③ 本轮仍无法做实时外部市场扫描**（web_search 额度耗尽，HTTP 402）⇒ **不含实时外部信号**。
>
> ⚠️ 另记一条**本批新发现的市场事实**：这 15 个工具的决策段**只有中文版** ⇒ **英文页从来没给过用户可读的决策建议**
> ⇒ 迁出时英文是**新写**（不是翻译一份已有的英文）⇒ 工作量比「翻译」大，验收时要按「英文可读性」而不是「字数」判。

---

## 8. 执行差异记录

> 执行时填（实际与本计划的出入）。

| # | 计划写的 | 实际做的 | 为什么 |
|---|---|---|---|
| 1 | 「15 个 exp-p151-l5-* 同族测试一起红」 | **13 个**（ltv/gdpr 是 B3-1 的；churn-rate 与 roas 没有 L5 测试） | 实测枚举 `tests/exp-p151-l5-*.test.ts` 得 15 个文件，减去 B3-1 已迁移的 2 个 = 13 |
| 2 | 「worker 自检用 `tmp/b3-4-check-tool.ts`」 | **工具本身有 2 个 bug，先修了才发给 worker**：① 输入提取把 `'e.g. 7'` 解析成 `Number('.')` = NaN ⇒ 所有引擎走早退分支 ⇒ **测不到任何分支**（与本计划坑 #9 同源）；② Tip 提取用 `/💡 Tip: (\{[^\n]*?\})/` ⇒ 遇嵌套 `params` 会截断成非法 JSON ⇒ 恒红/恒绿 | ⭐ 这正是「坑 #9：探针用 placeholder ⇒ NaN ⇒ 测不到」的**实例化**。修法：输入改从 `scripts/codegen-examples.mjs` 解析**默认输入**，Tip 改用仓库同款 `extractDecisionLines` |
| 3 | 「15 个建议码的 locale 模板由 worker 写」 | 片段改由 `tmp/b3-4/frag-<slug>.json` 承载 → 主控用 `tests/scripts/b3-4-merge-locale.mjs` **单一写者**落盘 | 建议码必须同时出现在**引擎输出**与**locale 模板**里 ⇒ 拆给两个人必然对不上 |
| 4 | 「守恒断言扩到 19 个工具」 | 新增 `tests/scripts/b3-4-sync-decision-guard.mjs`：从 fragment **机械同步**三份清单（探针输入 / TIP_CASES / ENGINE_FILES / L5 清单） | 15 个工具 × 4 份清单手工同步必然漂 ⇒ 守恒断言会红成「工具坏了」而不是「清单没更新」 |
| 5 | （计划外） | ⭐ **发现既有缺陷（不在本批范围）**：`scripts/codegen-examples.mjs` 的 `defaultInputs` 有 **17 个引擎的字段名与引擎 `inputs[].name` 对不上**（burn-rate / cac / churn-rate / market-size / mrr / revenue-projector / 4 个 AI cost / ltv / saas-valuation / break-even / dpa / breach-notification / cmp-roi）⇒ 它们的 staticExamples 是**拿错输入算出来的** | 实测 `tmp/codegen-defaults-audit.ts` 逐个比对。**但实测 codegen 漂移只有 7 个**（正是本批已迁移的引擎）⇒ 那 17 个的 staticExamples 与错误默认值**自洽** ⇒ 本批重跑 codegen 不会产生它们的 diff ⇒ **不污染本批**。⇒ 另立批次处理，需用户拍板 |
| 6 | 「Wave A：5 组 worker 并行迁移 15 个引擎」 | ⛔ **3 个 worker 被中途取消**，留下 2 个**半成品引擎**：acv（worker 把 `tip` 改名成 `tipJson` 却没改输出行 ⇒ 引擎引用未定义变量）、roas（customFn 丢了字符串拼接的 `+` 且把 `\\n` 写成真换行 ⇒ **源码语法都过不了**） | ⇒ 半成品**不能**直接进 Wave B（自检器会红）⇒ 主控亲手收尾这 2 个（`tmp/b3-4-fix-acv-roas.mjs`，4 处定点替换）⇒ 另 3 个（comp-banding / stockout-cost / gpu-cloud-cost）重新派出 |
| 7 | 「计划外：codegen 17 个引擎 defaultInputs 错配，另立批次」 | ⚠️ **本批内必须先修 2 个**：churn-rate + saas-valuation。理由有两条：① 这 2 个引擎的 staticExamples **线上现在就是全 0**（`Customers at Start: 0` / `$0`）—— 错误默认值早已把它们烤坏；② Wave D 跑 codegen 是**必须的**（staticExamples 里还留着 🧭 中文块 ⇒ 直接打脸「卡片无 🧭 段」守卫）⇒ 不修就等于把「全 0」再烤一遍 | 已改 `scripts/codegen-examples.mjs` 这 2 条 defaultInputs（churn-rate → `customersStart/customersLost/newCustomers/avgRevenuePerCustomer/expansionRevenue`；saas-valuation → `annualRevenue/growthRate/profitMargin`）⇒ 顺带把两个页面的静态示例从全 0 修成有意义的数字。新增 `tmp/b3-4-codegen-defaults-audit.mjs`（本批 15 个工具全对得上）。**剩余 15 个引擎仍待用户拍板** |
| 8 | 「locale 一次性落盘」 | ✅ **先演练再正式写**：locale 只能落盘一次（`decision_goal` 已存在 ⇒ 脚本 exit 1）⇒ 先用 12 个 fragment 真跑一次写盘验证（48 四层键 + 46 码模板、双语、**无 BOM / 无 CRLF**），再 `git checkout` 还原 ⇒ 正式那一次用 15 个 fragment 干净写入 | 单写者 + 幂等键 ⇒ 落盘失败无法重来 ⇒ 必须先在可还原的状态下验一遍写盘路径 |
| 9 | 「四层文案按 B3-1 先例改写成散文」 | ⚠️ **中文信息量下限在实操中会卡人**：acv/roas 首稿 4 项不过（zh/en 比 0.61~0.68 < 0.7 下限；roas `decision_recommendation` 中文只有 51 单位 < 70 下限）⇒ 中文必须**逐层写足**，不能把英文翻短 | 「中文 ≥ 英文 × 0.7」这条下限会逼着人把中文写厚 —— 正好治「中文就是英文的短版」这个病 |
| 10 | （计划外） | ⭐ **引擎里的 shortTitle typo 被守卫当场抓住**：comp-banding 的 🧭 段写的是 `[Fully Loaded Employee Cost Calculator]`，真实 shortTitle 是 `Fully-Loaded Employee Cost Calculator`（带连字符） | L5 测试的链接校验报「does not match any real tool shortTitle」⇒ 说明「跨工具引用必须逐字等于某个 shortTitle」这条守卫**是承重的**（不是摆设） |
| 11 | 「跑变异台子」 | ⛔ **台子的磁盘快照把刚落的 locale 吞掉了**：上一次台子被硬杀 ⇒ 留下 `tmp/decision-support-harness-backup.json`（**24 个文件**，含 `en.json`/`zh.json`）⇒ 本次开跑时台子按设计「先自愈」⇒ 用**旧快照**覆盖两个 locale ⇒ **Wave B 刚落盘的 60 个四层键 + 57 个建议码模板被回滚** ⇒ 基线直接红 14 项 | 台子自带快照闸门（无 `P168_ALLOW_RECOVER` 就拒绝恢复并退出 1）—— 但**闸门只防「误恢复」，不防「该恢复、而快照是旧的」**⇒ 正确修法是 **先修源码 → 再清空/刷新快照 → 才开跑**（本批：重跑 `b3-4-merge-locale.mjs` 重新落盘 → **独立复算**键数 76 四层键 / 75 tips / 无 BOM / 无 CRLF → 把快照覆写成 `{}`（＝明确「无需恢复」）→ 才开跑）⇒ 复核时**独立复算**，不采信台子自述 |
| 12 | （计划外） | ⛔ **变异台子首跑 M31 未隔离**（RED-BUT-NOT-ISOLATED）：csat 引擎里写回 🧭 段 ⇒ 同时红了「P168 激活工具：引擎输出里**不得**再有 🧭 段」与「P151 L5: csat … 4 sub-sections」两条 | 根因**不是守卫松**，而是 **L5 测试里那个条件式是回归敏感的**：`engineStillHasBlock`（引擎输出里还有没有 🧭 段）在变异下**翻转** ⇒ 链接检查源从 locale 切回引擎输出 ⇒ csat 引擎里的 `95% CI [68.1%, 75.9%]` 被当成坏工具名 ⇒ **假红**。修法**不是放水**，而是把判据**收敛到内容真正的家**：L5 判据**只读 locale**（实测 **100 个引擎的运行时输出 0 个**还带 🧭 标记 ⇒ 引擎分支已成**死代码**；15 个工具的跨工具引用**全部**在 locale 的 `decision_next_tool`，locale 侧 **44** 个方括号引用**全部**命中真实 shortTitle ⇒ **覆盖不丢**）⇒ 引擎那侧由 decision-support-guard **单独守** ⇒ **一个不变量只守一处** ⇒ 一次变异只红一条断言。改法落在**模板**（`exp-p151-l5-gdpr-fine.test.ts`）上，再由 `b3-4-migrate-l5-tests.mjs` 重生成 13 个同族（ltv-by-channel 是独立文件，同步改）⇒ 仍可复算 |

---

## 9. Self-Review（写完计划后的自检）

**1. 规格覆盖**

- 缺陷本体（英文页中文决策段）→ Wave 1 + Wave 2 + Wave 3 ✔
- 迁出三件事 → Wave 1/2/3 逐条 ✔
- 建议码化（zh 动态层不退回英文）→ Wave 1 + Wave 2 ✔
- 同族测试 → Wave 4 ✔
- 守卫盲区（未激活工具隐形）→ Wave 5 ✔
- 跨工具引用悬空 → Wave 5 ✔
- 变异台子 + 负对照 → Wave 5 ✔
- 范围外项 → `1 范围外 ✔

**2. 会不会做过头**

- 只动 15 个引擎的**决策段与 Tip** ⇒ **不改计算逻辑、不改阈值**；文案按 B3-1 先例改写成散文（阈值与语义逐条保留，不丢信息）✔
- 建议码的新增是**必要成本**（否则 zh 动态层退回英文 = 把刚修好的缺陷带回来）✔

**3. 最大风险**

- 英文文案是**新写**的 ⇒ 质量风险在「英文可读性」⇒ 收尾必须人工逐条过一遍 15 × 4 条。
- 15 个同族测试的判据迁移 ⇒ 改判据不是改松 ⇒ 收尾要看每处 diff。
