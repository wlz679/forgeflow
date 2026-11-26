# P168 批次 3 · B3-17：客户端动态卡片 v3 渲染不退化 + 浏览器守卫去假绿

> **状态：** **实施完成**（2026-11-26 · 控制器取证 → worker 实施 → 控制器独立复测 → 守卫覆盖补强 ⇒ 全部实测通过；待提交 + CI 核对）。
> **起点 commit：** `06a7ae5`（B3-16 收尾）· **G9 基线钉：** `361e6cc`（**不得用 HEAD**）。
> ⚠️ **本文档在实施中按实测订正过 3 条前提**（见 §2.1）—— 订正后的口径才是最终口径。

## 0. 一句话

用户点「计算」后看到的**客户端动态卡片**与**首屏的 SSR 静态卡片**形态分叉：
输出里同时含 `' → '` 与 `' | '` 的引擎，其动态卡片被渲染成「标题 + 一个「查看详情」折叠按钮」，
**正文（196~5187 字符）全被塞进折叠区** ⇒ 用户必须手动点「查看详情」才看得到。
⇒ 而现有浏览器守卫对这一整类缺陷报 **ALL OK（假绿）**。

**真实受损面 = 24/100 个引擎**（实测，见 §1）—— 不是「全部 v3 引擎」。

## 1. 实测证据（2026-11-26 · 无头 Chrome + 本地 dist + iframe 真执行客户端脚本）

### 1.1 受损面的确定方法（静态扫描，不靠猜）

服务端 SSR 卡片把 token 原文放在 `data-calc-output-raw` 属性里 ⇒ 扫 `dist/zh/*/index.html`，
找出该属性**同时**含 `' → '` 与 `' | '` 的页面 ⇒ **24/100 个引擎**在 HEAD（`06a7ae5`）上会被
客户端的 analysis-card 分支劫持。

⭐ **归属拆分（复审 2026-11-26 实测逐条核对）**：**AI cost 家族 6**（ai-image / claude / deepseek /
gemini / gpu-cloud / openai-token）+ **legacy 四家族 17**（BIZ_SAAS 2 / BIZ_VALUATION 5 /
BIZ_FREELANCE 5 / BIZ_COST 5）+ **BIZ_V3 1**（`solopreneur-safe-convertible-note-calculator`）= **24**。
⚠️ **BIZ_V3 也有 1 个受害引擎** ⇒ 原来写的「与 v3 无关」**不成立**（B3-17 复审 I-3）。

### 1.2 浏览器实测（回退态 = HEAD 的分支顺序）

| 引擎 | SSR 静态卡片 | 客户端动态卡片（修复前） | 折叠区藏了多少 |
|---|---|---|---|
| `solopreneur-claude-api-cost-calculator` | **106** 行 | **3** 行 | **5187** 字符 |
| `solopreneur-gemini-api-cost-calculator` | **73** 行 | **3** 行 | **4504** 字符 |
| `solopreneur-deepseek-api-cost-calculator` | **63** 行 | **3** 行 | **3454** 字符 |
| `solopreneur-ai-image-cost-calculator` | **77** 行 | **3** 行 | **3419** 字符 |
| `solopreneur-gpu-cloud-cost-calculator` | **59** 行 | **3** 行 | **2480** 字符 |

⇒ **内容并没有丢**，它被塞进了 analysis-card 的 `.detail` 折叠区（`display:none`）⇒ 用户必须点「查看详情」。

### 1.3 修复后（同一套守卫、同一批输入）

| 引擎 | 静态 | 动态（修复后） | `<h3>` | `.expand-btn` | 可见字符 |
|---|---|---|---|---|---|
| claude-api-cost | 106 | **125** | 有 | 0 | 4233 |
| gemini-api-cost | 73 | **108** | 有 | 0 | 3523 |
| deepseek-api-cost | 63 | **83** | 有 | 0 | 2705 |
| ai-image-cost | 77 | **75** | 有 | 0 | 2673 |
| gpu-cloud-cost | 59 | **57** | 有 | 0 | 1632 |
| nrr | 38 | 36 | 有 | 0 | 1195 |
| roas | 36 | 34 | 有 | 0 | 983 |
| kb-coverage | 14 | 12 | 有 | 0 | 442 |

（静态/动态行数天然有差：动态用 placeholder 示例值，静态用引擎默认示例值。）

## 2. 根因（源码定位 · `src/pages/[lang]/[slug].astro` 客户端内联脚本）

动态卡片的分支顺序（submit handler 内，**修复前**）：

```js
if (r.indexOf(' → ') > -1 && r.indexOf(' | ') > -1) {   // ← analysis-card 分支（排第一）
} else if (config.type === 'custom' && results.length === 1) {  // ← custom 卡片分支（排第二）
} else { /* 旧式 span 卡片 */ }
```

⚠️ **实测：`clientConfig.type` 在 100/100 个引擎上都是 `'custom'`**（`src/engines/**` 全扫，0 个非 custom）
⇒ 第一个条件只要命中就**劫持**该引擎 ⇒ 永远走不到 custom 分支 ⇒ **SSR 与客户端形态分叉**。

⇒ 服务端是对的：`ResultCard.astro` 用 `hideIndex={engine.clientConfig.type === 'custom'}`
⇒ **客户端必须以同一个 `config.type === 'custom'` 为准，而不是靠文本里有没有 `' → '` 去猜**。

⚠️ **第二处分叉（tip 行）**：服务端 `preserveTip={bizConfigKey === 'BIZ_V3'}`，**但页面上游还有一道结构性剥离**
`decisionRender ? stripDecisionTip(ex) : ex` ⇒ 卡片里**实际**保留 tip 的条件是
**`bizConfigKey === 'BIZ_V3' && !decisionRender`**。
客户端原来写死 `r.split('\n').filter(l => l.indexOf('💡 Tip:') === -1)` ⇒ ① **无条件剥掉**（v3 少一节）
② 过滤器**只认英文标记**（zh 页的「💡 提示:」失配）⇒ 与 SSR 行结构不一致 ⇒ 布局跳动。

### 2.1 ⚠️ 实施中按实测订正的 3 条前提（原计划口径已作废）

| # | 原计划口径 | 实测 | 订正 |
|---|---|---|---|
| **①** | 「token 语法天然含 `' | '` ⇒ v3 引擎普遍被劫持」（⇒ 68 个 BIZ_V3 全受影响） | **错**。token 语法分隔符是**裸 `|`**（`$code{params}|fallback|`），`' | '`（带空格）来自**引擎把多行拼成一行**的输出格式 | 受损面 = **24/100**，且**几乎与 v3 无关**（AI cost 6 + legacy 四家族 17 + **BIZ_V3 1** = safe-convertible-note） |
| **②** | 「nrr 38 → 3 / roas 36 → 3 ⇒ v3 引擎被劫持」 | **这是探针没填表造成的假象**：表单无默认值 ⇒ 提交后引擎走**全零输入短路分支**（`nrr-calculator.ts:68`）⇒ 只剩「📊 请输入起始 MRR、扩展收入 MRR…」提示行 | nrr / roas **从未**被劫持（回退态实测：36 行 / `<h3>` 有 / 折叠 0）。⇒ 守卫必须**先填表再点计算**（AGENTS.md「输入构造也会造假绿」同族坑） |
| **③** | 「tip 保留条件 = `bizConfigKey === 'BIZ_V3'`」 | 服务端上游还有 `decisionRender ? stripDecisionTip(ex) : ex` | 真实条件 = **`BIZ_V3 && !decisionRender`**（roas / funnel-step / kb-coverage 的 tip 是裸 JSON 且决策区块已接管 ⇒ 服务端剥掉；nrr / logo-churn 的 tip 是 token 且未接管 ⇒ 服务端保留） |

## 3. 为什么现有守卫看不见（**假绿的根因**）

`tests/scripts/p168-browser-verify.ts`（B3-9 入库的浏览器层验收工具）实测输出 **ALL OK**，但它有**两处结构性失明**：

| # | 失明点 | 后果 |
|---|---|---|
| **B-1** | 动态卡片的判据是 `visible = 可见行.join(' ').length + detail.length` ⇒ **折叠区内容被算成「可见」** ⇒ 3 行 + 4000 字符的折叠区 ⇒ 恒 ≥ 200 ⇒ **结构上不可能发现「内容被藏起来」** | 假绿 |
| **B-2** | `DYNAMIC` 清单 **7 个全是 AI cost 引擎、0 个 BIZ_V3** ⇒ 68 个 v3 引擎的动态卡片**从未**被浏览器验收覆盖；且 24 个受害引擎里有 **19 个也不在旧清单里** ⇒ 真实受损面只被覆盖到 **5** 个 | 覆盖缺失 |

⇒ 与 AGENTS.md「同族教训十：**SSR 层绿 ≠ 用户所见绿**」同族，但更狠：**用户所见层的守卫本身是绿的**。

## 4. 修法（4 步，缺一不可）

| 步 | 内容 | 文件 |
|---|---|---|
| **①** | **客户端动态卡片以 `config.type === 'custom'` 为准** ⇒ 把 custom 分支**提到 analysis-card 分支之前** ⇒ 与服务端 `hideIndex` 同一判据 | `src/pages/[lang]/[slug].astro` |
| **②** | **tip 行处理与服务端对齐**：保留条件 = `bizConfigKey === 'BIZ_V3' && !decisionRender`；过滤器**语言无关**且**单点** ⇒ 走仓库既有范式（`src/lib/calc-output-i18n.ts` 导出 JS 源码串 `CALC_OUTPUT_IS_TIP_LINE_JS` ⇒ `define:vars` 注入 ⇒ 页面 `new Function` 求值，与 `CALC_OUTPUT_SPLIT_V3_LINE_JS` 完全同款） | `src/lib/calc-output-i18n.ts` + `src/pages/[lang]/[slug].astro` |
| **③** | **浏览器守卫去假绿**：① 判据改成**结构性**（静态卡有 `<h3>` ⇒ 动态卡必须有 `<h3>`、**0 个 `.expand-btn`**、**0 字符 `.detail`**、可见行 ≥ 静态 50%、可见字符 ≥200）
  ⚠️ **复审实测（M-1）**：「可见行 ≥ 静态 50%」这条**基本不触发**（动态/静态行数差实测在 **−9**（revenue-projector 88→79）到 **+19**（claude 106→125）之间自由浮动 ⇒ kb-coverage 要掉到 ≤6 行、funnel-step 要掉到 ≤3 行才触发）⇒ 它是**兜底**，真正有牙的不变式是三条**结构**判据（`<h3>` 有 / `.expand-btn` = 0 / `.detail` = 0 字符）⇒ **文档不得把它写成「内容完整性判据」**。② **折叠区内容不再计入「可见」**（单列 `detailLen` 诊断字段）③ **先填表再点「计算」** ④ `DYNAMIC` 清单扩到 **34 个**（24 个受害引擎 ∪ 8 个 BIZ_V3 ∪ 2 个非受害 AI cost） | `tests/scripts/p168-browser-verify.ts` + `tests/scripts/p168-browser-harness.html` |
| **④** | **负对照**：把 ① 的分支顺序改回去 ⇒ 守卫必须**红**（点名受害引擎）⇒ 证明守卫有牙；还原后 sha256 **逐字节一致** | 同 ③ |

⭐ **另加一道源码级不变式（零浏览器成本 · 覆盖 100/100 引擎）**：
浏览器守卫只覆盖 34 个 slug，且**不在 CI 里** ⇒ 在 `tests/calc-output-i18n-guard.test.ts` 追加 **3 条** source-only 断言
（分支顺序 / 客户端必须用共享 tip 实现 / tip 保留条件与服务端一致）⇒ 任何引擎、任何 slug 的顺序回归都会当场红。

⚠️ **不做**：不改引擎（不碰 `src/engines/**` ⇒ **不需要 user 拍板**）· 不改 locale ·
不改 SSR（服务端是对的）· 不改 legacy（`config.type !== 'custom'`）引擎的 analysis-card 折叠形态（既有 UX，不是缺陷）。

## 5. 门禁（逐条实测结果）

| 门禁 | 命令 | 实测结果 |
|---|---|---|
| 浏览器层 | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-browser-verify.ts` | **ALL OK** · exit 0 · 49 页（15 静态 + 34 动态） |
| 负对照 | 把分支顺序改回去重跑 | **NOT YET** · exit 1 · 1 类问题 · 点名受害引擎 · 还原后 sha256 逐字节一致 |
| 源码级不变式 | `node --import tsx tests/calc-output-i18n-guard.test.ts` | 31 条断言全绿（28 → 31）· 3 次变异**各只红 1 条** |
| 类型 | `pnpm exec tsc --noEmit` | exit 0 |
| 构建 | `pnpm build:full` | **438 页** |
| 英文页 | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts` | 100 试点 · 未记录差异 **0**（基线 `361e6cc`） |
| zh 审计 | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-zh-remaining-audit.ts` | 0 引擎 · **0** 行 |
| 全量套件 | `set RUN_BUILD_TESTS=1&& pnpm test:unit` | 301 套件 · `# fail 0` × 11（**不新增 `.test.ts`** ⇒ 计数 301/68/233 不变） |

## 6. 边界（明确不做）

- 不改 `src/engines/**`（不碰引擎 ⇒ 无需 user 拍板）。
- 不改 legacy（`config.type !== 'custom'`）引擎的 analysis-card 折叠形态。
- 不做中英混排批次（785 行 ew≥1 / 146 行 ew≥3）—— **另立批次**。
- 不修 D-4（已知 · 当前不可达）。
- ⚠️ **客户端 legacy 分支当前不可达**（复审 M-3 实测：**100/100 个引擎的 `clientConfig.type` 都是 `'custom'`**）⇒ analysis-card 分支与末尾的 legacy `else` 分支**都是死代码** ⇒ 它们是「为将来引入 templates/combinations 类型保留」的防御分支，**不是**线上还在跑的 legacy UX ⇒ 源码注释的措辞留待下批一并订正（本批不动 `src/pages/[lang]/[slug].astro`，以保全负对照所用的 sha256 证据链）。
- ⚠️ **属性层 parity 的一处已知例外（复审 M-4）** —— 客户端 custom 卡片的正文 div **缺** `data-history-result` / `data-calc-output-raw`，也**缺「保存到历史」按钮**（服务端有）⇒ 当前无功能后果（`history-init.client.ts` 取**第一个** `[data-history-result]` = 静态卡）⇒ 本批只对齐**形态**（`<h3>` + `.font-mono` + 复制/导出按钮），**属性层留待下批**。
- ⚠️ **浏览器守卫不在 CI**（复审 M-5）—— CI 的 p168 步骤只有 `p168-locale-roundtrip-nonratio.ts --strict` ⇒ **形态类**判据（`<h3>` / 折叠 / 折叠区）只有本地跑浏览器层能查 ⇒ 本批用**源码级 3 条断言**补上「顺序 + tip 条件」的 CI 覆盖，但**形态类**的 CI 化留作后续（把浏览器守卫加进 CI 需要评估 runner 上的 Chrome 与时长）。
- ⚠️ **遗留缺陷（引擎层 · 本批不动）**：`solopreneur-openai-token-calculator` 的**客户端 customFn** 里
  投影表头硬编码 ASCII（`w("Month",6)` / `w("Cum. Diff",12)`）⇒ **SSR 静态卡片没有这一行、动态卡片有**
  ⇒ 一处 SSR ↔ 客户端英文行分叉。根因在引擎 ⇒ 修它要改 `src/engines/**` ⇒ **需 user 拍板** ⇒ 留作后续批次
  （浏览器守卫已把该行**逐条登记**进 `ENGLISH_DEBT` 台账，`why` 字段写明「引擎层缺口 · 需 user 拍板」；
  ⚠️ 旧口径的「AI cost 整族豁免」**已删除** ⇒ 族内**新增**英文行同样会红）。

- ⚠️ **页面体积余量极薄（复审轮实测）** —— 最大的非根页面（`solopreneur-gpu-cloud-cost-calculator` 的 **en** 页）实测 **199.70 KB** ⇒ 距 200 KB 阈值只剩 **0.30 KB** ⇒ **任何**往客户端内联脚本里加字节的改动都可能触发页面体积守卫（`tests/page-size-guard.test.ts`）⇒ **长解释一律放服务端模块**（`src/components/ResultCard.astro` / `src/lib/calc-output-i18n.ts`）**或计划文档**，不写进随页面下发的内联脚本；脚本内只留 2~3 行短指针。

## 7. 维度 3 scan 声明

- **本轮未做实时外部市场扫描** ⇒ 不含实时外部信号。
- **站内信号（本批新增，来源明确）**：
  ① **「用户所见层」的守卫本身可以是绿的** —— B3-9 的浏览器验收工具对这条**结构性失明**
     （折叠区算成可见 + DYNAMIC 清单只覆盖 6/24 个受害引擎）⇒ **判据要问「它测的那一层，用户真的看得到吗」**；
  ② **同一份「卡片形态」的判据必须在两端各有一份且互为镜像** —— 服务端用 `hideIndex` / `preserveTip`，
     客户端却靠 `' → '` 文本猜测 ⇒ **文本猜测必然与属性判据分叉**；
  ③ **被折叠起来的内容仍然在 DOM 里** ⇒ 「内容完整性」与「内容可见性」是两件事 ⇒ 判据必须分开量；
  ④ **测量的输入本身会造假绿** —— 空表单 ⇒ 引擎走短路分支 ⇒ 「动态卡片只有 3 行」是**输入构造的产物**而非渲染缺陷
     ⇒ **守卫必须先复现真实用户路径**（填表 → 点计算）；
  ⑤ **B3-7 ~ B3-16 六批优化的都是「卡片内容」** ⇒ 而**交互路径**上的卡片形态**从未被验收覆盖**
     ⇒ 「投入产出比最高的下一批」不是继续加内容，而是**把交互路径修对**。
  ⑥ **「相对基线」的判据会让「两边都坏」系统性逃逸** —— 复审 I-1 实测：用「相对静态卡」当英文基线
     ⇒ **基线本身坏时**（英文标题在静态卡里也是英文）就测不出 ⇒ 实测 49 行用户可见整行英文零守卫
     ⇒ 绝对判据 + 逐条台账才是可审计的写法。

## 8. 复审修复轮（I-1 / I-2 / M-1 / M-2）

> 复审结论：**0 Critical / 4 Important / 6 Minor** ⇒ 本轮修 **I-1 / I-2**（必须修）+ **M-1 / M-2**（Minor 中与判据正确性直接相关的两条）；
> I-3 / I-4 已在文档侧订正（§6 与本文件 §2.1）；M-3 / M-4 / M-5 登记在 §6。

### 8.1 I-1：英文判据从「相对」改「绝对」

- **旧口径**：英文行只在「静态卡没有、客户端才有」时报 ⇒ **两张卡都有的整行英文永远不报**。
- **实测**：浏览器层 49 页 / 12 个 slug / **49 行**用户可见整行英文（**27 行动态 + 22 行静态**）**零守卫**。
- **修法**：
  ① harness **逐条上报**整行英文（base64 编码；`S` 静态卡 / `V` 动态可见 / `D` 动态折叠区三类分开上报）；
  ② verify 侧用 **per-slug `ENGLISH_DEBT` 台账**逐条判定 ⇒ **未登记 ⇒ 红**；
  ③ 台账每条必须写清 `why`（**为什么允许是英文**）⇒ 否则台账只是「整族豁免」的换皮。

### 8.2 I-2：家族级豁免改逐条登记

- **旧口径**：`checkEn = !DYNAMIC_AI_COST.includes(slug)` ⇒ AI cost **整族**不判英文 ⇒ 族内新增英文同样不报。
- **修法**：**删除该豁免**；AI cost 家族的 6 条（型号名 / 价格表头）改为**逐条登记**（`why` 注明 P85a 设计意图）。
- **台账规模（实测）**：**25 条** = **19 条精确文本**（业务引擎硬编码的英文小节标题）
  + **6 条正则**（数据驱动行）。
  ⭐ 精确文本用于「行内没有随输入变化的数值」的行；正则用于**数据驱动**的行
  （型号名 / 价格随 `src/data/ai-pricing.json` 变 ⇒ 精确文本会随数据更新而失效）。

### 8.3 台账双向校验（可销账）

- **未登记 ⇒ 红**；**登记过但实际不再出现 ⇒ 提示「可销账」**（台账可以删条目了）⇒ 台账**双向**被校验。
- ⚠️ **「可销账」必须在三种来源的并集上算** —— 只在动态可见区出现的行（如 claude 的投影表头）
  在静态卡里本来就没有 ⇒ 若按 kind 分别算会**误报**。

### 8.4 M-1 / M-2

- **M-1**：「可见行 ≥ 静态 50%」实测**基本不触发**（行数差 −9 ~ +19 自由浮动）⇒ 已在代码里**注释化为兜底**，
  真正有牙的是三条**结构性**判据（`<h3>` / `.expand-btn` = 0 / `.detail` = 0 字符）。
- **M-2**：harness 填表的负值正则改成 `-?\d[\d,]*(?:\.\d+)?`（原先漏负号）
  + select 的取数口径注释订正（select 没有 placeholder ⇒ 取第一个非空 option）。

### 8.5 本轮实测（证据）

| 项 | 结果 |
| --- | --- |
| 修绿态浏览器守卫 | **49 页 · 0 类 0 处 · ALL OK · exit 0**（无「可销账」提示 ⇒ 台账与实际完全对齐） |
| 台账变异①（删 1 条登记） | **2 类 2 处 · NOT YET · exit 1**（静态卡 + 动态卡各 1 处） |
| 台账变异②（加 1 条不存在的登记） | **0 类 0 处 · exit 0** + 提示「可销账」 |
| 分支回退负对照（重建后） | 浏览器守卫 **1 类 · 24 处「动态卡片形态退化」· exit 1**；**源码级守卫同时 fail 1 / pass 30** |
| 还原 | `src/pages/[lang]/[slug].astro` sha256 **`43DE90D62B183151D2B341F3964ACA3595B2E7275A0166DADEBAACD5903B1A34`** 逐字节一致 |
| 页面体积守卫 | **exit 0 · 0 违规**（最大非根页 **199.70 KB** · 余量 0.30 KB）· 内联脚本 **75,722 → 73,941 字节（−1,781）** |
| tsc | exit 0 |

### 8.6 本轮新发现的盲区（已登记 · 未修）

⚠️ **zh 审计看不见小节标题里的英文** —— `p168-zh-remaining-audit.ts` 报 **0 引擎 · 0 行**，
但浏览器层实测 **12 个 slug 的卡片里有 19 行整行英文标题**（8 个业务引擎硬编码的小节标题）
⇒ 这 19 行是「中英混排」待办（785 / 146）的**实测入口**
⇒ 下一批做中英混排时可直接拿 `ENGLISH_DEBT` 台账当清单（台账已入库 ⇒ 可复算）。
