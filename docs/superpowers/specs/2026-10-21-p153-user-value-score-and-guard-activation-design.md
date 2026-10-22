# P153 — User Value Score 闸门 + Phase 3 守卫激活

> **For agentic workers:** This is a **design spec**, not an execution log. It corrects P152's Phase 3 measurement and specifies the two remaining Phase 3 gaps. Per `AGENTS.md` §12.6 (维度 3: Proactive Co-Pilot), **AI 不允许擅自修改 Roadmap / Phase** — §7 的每一项都需要 user 拍板后才能执行。
>
> **Status:** **已实施(G1 + G2,2026-10-21)** —— §7.1 公式、§7.3 评分方式已由 user 拍板并落地;§7.2 Phase 2 形态与 §8.4 仍未拍板,等 AdSense 结果。
> **Date:** 2026-10-21
> **Author:** Mavis (agentic audit + spec)
> **Supersedes:** P152 §3「Phase 3 = 0/100」与 §6.2「Phase 3 Playbook 6 字段」两条结论（**结论错误，见 §2**）。
> **Scope:** `AGENTS.md` L108-125 灵魂三维度之**维度 2 准入闸门** + Phase 3 质量守卫的生效性。

**Goal:** 把 v2.0 路线图里**唯一还缺的那道质量闸门**（User Value Score）落成可执行的代码与 CI 守卫，并把两个**已存在但从不生效**的 Phase 3 守卫激活。

**Method:** 源码逐个实测 + 控制实验（stash 对照）+ 上游数据实测。**所有数字均为实测。**

---

## Global Constraints

- **本文件不改动任何 Phase 范围。** §7 是提案,执行需 user 拍板(§12.6)。
- **本文件不修改 Roadmap / Phase 定义。** 只补实现缺口。
- **公式歧义必须由 user 拍板**（§7.1)—— p140f §15.2 的公式**按字面实现会让所有 Topic 恒被拒绝**,这不是 AI 能自行拍板的改动。
- **不得在页面上展示自评分数。** User Value Score 是**内部准入闸门**,不是营销素材(见 §4.4)。

---

## 1. 定位:Phase 3 到底做没做

| 项 | 值 |
|---|---|
| **路线图正文** | `docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` §11.4(Phase 3)、§15.2(5 问与 User Value Score) |
| **宪法落点** | `AGENTS.md` L108-125 |
| **分支约定** | 同 spec §12.1 → `feature/phase-3-playbook-6-fields` |

---

## 2. 🔴 对 P152 的更正:Phase 3 已完成,P152 的探针打偏了

P152 §3 写「Phase 3 Playbook 6 字段 = **0 / 100**」,§6.2 写「**只差 Goal 那一层**」。

**这两条都是错的。P152 的测量探针用错了形态。**

| | P152 的探针 | 真实实现形态 | 结果 |
|---|---|---|---|
| Phase 3 字段 | 引擎头注释 `// Goal:` | `playbook: { goal: '…', input: '…', output: '…', constraint: '…', tool: '…', memory: '…' }` | **100/100 已有** |

**实测(2026-10-21,`src/engines/**/*.ts` 117 个文件,其中 100 个引擎 + 17 个 `index.ts` 桶文件):**

```
with playbook:      100/100 engines
with goal:          100/100
with input/output:  100/100
with constraint:    100/100
with tool:          100/100
with memory:        100/100
```

样例(`src/engines/customer-support/csat-calculator.ts`):

```js
playbook: {
  goal: '用户该不该信任自己的 CSAT 数字作为留存决策依据',
  input: 'csat_pct (0-100) + response_rate (0-100) + sample_size (≥0) + target_csat (0-100)',
  output: '健康带 🟢≥90 / 🟡80-90 / 🟠70-80 / 🔴<70 + 95% CI 边界 + 响应率偏差警告',
  constraint: '样本 < 100 视为低置信; 响应率 < 20% 视为有偏样本; CSAT 是滞后指标',
  tool: 'Phase 1 csat-calculator.ts 🧭 Decision Recommendation (4 子段镜像)',
  memory: 'CustomerGauge 2024 + Gainsight CS Benchmarks + Zendesk CX 2024',
},
```

**而且 CI 守卫早就存在**:`tests/playbook-6-fields-coverage-guard.test.ts` 断言的正是 `playbook:` + 6 字段 + `goal` 含「决策/decision/该不该/是否」。

> **教训(写给未来的自己):** 「某功能不存在」的结论,**必须先问「我的探针在目标条件下会不会被触发」**。
> 同一份 P152 里我因为探针形态错,得出「Phase 3 = 0/100」;而同一份文档里 `User Value Score` 的 0 命中**是对的** —— 因为它用 `User Value Score|Topic Score|Decision Value Score` 全文匹配,不存在形态歧义。
> **判据:同一组指标里,有的用全文匹配量、有的用注释形态量 —— 后者必须先找实现样例再下结论。**

### 2.1 Phase 3 真正的两个缺口

Phase 3 的**元数据已完成**,但**两个缺口**让它无法真正守住质量:

| # | 缺口 | 证据 | 后果 |
|---|---|---|---|
| **G1** | **守卫处于休眠状态** | `tests/playbook-6-fields-coverage-guard.test.ts` L26-28 与 `tests/decision-layer-coverage-guard.test.ts` L21-23 都有 `if (!process.env.RUN_BUILD_TESTS) { process.exit(0); }` | 这两个守卫**只读 `.ts` 源码**,根本不需要 build。`pnpm check` 不设 `RUN_BUILD_TESTS` → **两个守卫从不执行任何断言**。删掉一个引擎的 `playbook:` 块,`pnpm check` 依然绿 |
| **G2** | **User Value Score 不存在** | 全仓 `User Value Score` / `userValueScore` / `user-value-score` / `Topic Score` / `Decision Value Score` = **0 命中** | p140f §15.2 的准入线(`< 0.7 → 自动拒绝`)**没有实现** → Phase 4/5 的 AI 自动扩展**没有质量准入线** |

**实测:两个守卫今天真跑起来是绿的**(强制 `RUN_BUILD_TESTS=1`):

```
playbook-6-fields-coverage-guard:  # pass 3  # fail 0
decision-layer-coverage-guard:      # pass 2  # fail 0
```

→ **G1 是「把已有守卫接上电」,不是「补实现」,成本极低、收益立竿见影。**

---

## 3. 维度 3 scan(AGENTS.md 强制要求,实测不编)

```
维度 3 scan: 基于信号 2026-10 AI 模型价格表 + 2026 竞品格局 + 仓库自身 gate 实测
- AI 模型:  2026-10 上游(LiteLLM 4245 条)实测含 GPT-6 全家(Luna/Sol/Astra/6.1 Sol)、
            Claude Opus 5.5 / Haiku 5.5 / Sonnet 5.5、Gemini 4 Argon、Gemini 3.8 Flash、
            DeepSeek V4 Pro
            → 影响 B 类 8 个 AI 成本引擎 → 已于 2026-10-21 全量同步(见 P153-A,§5)
- 搜索算法: 无新信号(GSC 报表正常,未见 Core Update 公告)
- 法规变化: 无新信号(GDPR / CCPA 无变化;CMP 已于 2026-06-26 发布并在运行)
- 关键库:   无新信号(未见 Astro 5 / Tailwind 5 正式 release)
- 竞品:     Desmos / Omni Calculator / Calculator Soup / SpeedCrunch / Soulver 格局未变;
            「Topic-specific calculator pages with parameter inputs and verification steps」
            的行业定位正面印证 v2.0 决策支持方向
- 仓库自身: **3 个既有 gate 在 master 上是红的**(见 §3.1)—— 本轮已修 2 个,第 3 个属 Windows 环境问题
```

来源:Codifly《AI API prices in October 2026》(codifly.co,2026-10);competitor landscape via wifitalents.com「Calculator Software: Top Picks (2026)」。

### 3.1 顺带实测出的三个既有红闸门(全部在 master 上,与本 spec 无关但已修)

| 闸门 | HEAD 上的状态 | 根因 | 本轮处理 |
|---|---|---|---|
| `check-engine-count-by-category --check` | **红** | 逐字符比较 AGENTS.md 快照 vs 脚本输出;AGENTS.md 表格是对齐排版(每格两侧补空格),脚本输出是紧凑排版 → **仅排版差异**。自 `24ca554`(CLAUDE.md→AGENTS.md 迁移)起永久失效 | **已修**:改为按行/单元格归一化比较,并排除分隔行(横线数量也不同)。**负向对照已验**:改错计数 / 改错类名 → 仍然红 |
| `codegen-examples --check` | **红**(14 个引擎漂移) | P151 L5 backfill 改了引擎的 `calculate()` 但没重生成 `staticExamples[0]` | **已修**:重生成 14 个引擎的 staticExamples,使其与引擎实际输出一致 |
| `tests/run.mjs` | **红**(Windows) | 一次性把所有测试文件塞进一条命令行;注释写明「190 files ≈ 4400 chars」,现在 **235 个套件**超了 cmd.exe 的 8191 上限 | **未修**(环境问题):本轮改用分批跑(35 个/批,7 批)完成验证。长期修法见 §7.4 |

> **这三条合起来说明一件事:仓库的「自检绿灯」此前并不可信。**
> 在把任何 Phase 判为「完成 / 未完成」之前,**必须先确认判据本身是通的**——这与 §2 是同一个教训的两次现身。

---

## 4. G2 设计:User Value Score 闸门

### 4.1 公式歧义 —— 🔴 必须 user 拍板

p140f §15.2 原文:

> User Value Score = (功能价值 × UX 易用性 × Advisor 关系 × Retention × Advocacy) ÷ 5
> User Value Score ≥ 0.7 → Topic 进入候选池
> User Value Score < 0.7 → Topic 自动拒绝

**按字面(乘法)实现,这条公式在数学上不可满足:**

```
5 个维度各 ∈ [0, 1]
最大乘积 = 1 × 1 × 1 × 1 × 1 = 1
最大 User Value Score = 1 ÷ 5 = 0.2
0.2 < 0.7  →  永远拒绝
```

**「连最完美的工具都过不了闸门」** —— 这大概率就是它从未被实现的原因(不是没人写,是写了必然全拒)。

**推荐修正:改成算术平均(把 `×` 读作 `+`)。**

```
User Value Score = (功能价值 + UX 易用性 + Advisor 关系 + Retention + Advocacy) ÷ 5
```

- 与同句的 `÷ 5` 语义自洽(「÷ 5」本来就是求平均的除数)
- 阈值 0.7 变得有意义:「五维平均 ≥ 0.7」
- 与 p140f §15.2 的表格语义一致(五问各自是 0–1 的满足度)

**备选(不推荐):几何平均** `(a×b×c×d×e)^(1/5)` —— 数学上同样可达 1.0,但一个维度为 0 就全线归零,对「某一项暂时没做」过于严苛。

> **本条是 Roadmap 定义的改动(§12.6),AI 不自行拍板。** §7.1 列为例行确认项。

### 4.2 五个维度的可判定定义

| 维度 | 0 分 | 1 分 | 评分依据(可从仓库内证据判定) |
|---|---|---|---|
| **功能价值** | 只输出数字,不解决任何决策 | 输出明确「该做什么」的决策建议 | 是否有 🧭 Decision Recommendation 4 子段 + `playbook.goal` 是否指向真实决策 |
| **UX 易用性** | 参数含义靠猜,无边界提示 | 输入有边界/单位/默认值说明,结果有解读 | `inputs` 是否有 placeholder/label;输出是否有解读段 |
| **Advisor 关系** | 纯工具,无建议 | 有「什么时候不该用它」的反向建议 | 输出里是否有边界/警示(如 Key Uncertainty) |
| **Retention** | 一次即走 | 有复访理由(保存/场景/对比) | 是否有 Saved Scenario / Decision Template 入口 |
| **Advocacy** | 无 | 输出可被分享/引用,或能指向相关工具 | 是否有跨工具链接 / 可分享报告 |

**评分刻度:每维 0 / 0.5 / 1.0 三档**(不要假装有连续精度)。

### 4.3 数据来源与打分方式(推荐:LLM 批量 + 人工抽样复核)

| 方案 | 成本 | 一致性 | 可复现 | 结论 |
|---|---|---|---|---|
| 全人工 | 100 引擎 × 5 维 = 500 次判断 | 高 | 高 | **不可行**(等待窗口内做不完) |
| **LLM 批量评分 + 人工抽样复核** | 分钟级 | 中高 | 中高(需固定 prompt + 固定输入快照) | ✅ **推荐** |
| 纯 LLM、不复核 | 分钟级 | 中 | 中 | ❌ 无校准,分数会漂 |

**推荐流程:**

1. `src/data/user-value-scores.json` —— 单一真相源,结构:
   ```json
   {
     "version": 1,
     "threshold": 0.7,
     "scores": {
       "solopreneur-csat-calculator": {
         "functionalValue": 1, "ux": 0.5, "advisor": 1,
         "retention": 0.5, "advocacy": 0.5, "score": 0.7,
         "reviewedAt": "2026-10-21", "reviewer": "Mavis+user-spotcheck"
       }
     }
   }
   ```
2. **一次 LLM 批量评分**,输入固定为「引擎的 `playbook` 6 字段 + `inputs` + 输出模板」—— **不喂引擎源码全文**(噪声大且不可复现)。
3. **人工抽样复核 20 个引擎**(含 5 个 demo),校准 LLM 的档位;不一致处改评分规则而不是改单个分数。
4. 分数**只作为准入闸门**,不上页面(§4.4)。

### 4.4 🚫 不得在页面展示自评分数

User Value Score 是**内部准入闸门**,不是用户可见内容。

**理由(与 2026-08-17 拒审直接相关):** 一个「我们的工具自评 0.9 分」的自夸区块,放在 AdSense 刚复审通过的站点上,是典型的低价值/自证内容信号。**分数只进仓库数据文件,不进任何渲染路径。**

### 4.5 CI 守卫设计

新建 `tests/user-value-score-guard.test.ts`:

| 断言 | 期望值来源 |
|---|---|
| 每个引擎 slug 在 `scores` 里有条目 | 引擎注册表(独立来源) |
| 每条 5 维分值 ∈ {0, 0.5, 1} | 字面量集合,**不从被测模块 import** |
| `score` 等于 5 维平均(重算,不信任存储值) | 公式在**测试里**独立实现一次 |
| 低于阈值的引擎**被拒绝**(即不在候选池) | 阈值 **0.7 写成字面量**,不从 JSON 的 `threshold` 字段读 |
| 新增引擎但无评分 → 失败 | 引擎数 ≠ 评分数即失败 |

> ⚠️ **两条铁律(来自本项目既有教训):**
> 1. **期望值必须是独立写死的字面量**,不能从被测模块 import 常量 —— 否则「把常量从 0.7 改成 0.5」这种变异照样绿。
> 2. **一条判据只守一件事**:「分数存在」「分数算法对」「阈值拦截」要拆成 3 条断言,不要合成一条 —— 名字叫「阈值拦截」的判据,不能顺带负责验证分数算法。

### 4.6 落地实况(2026-10-21,G2 已实施)

**产物三件:**

| 文件 | 作用 |
|---|---|
| `scripts/score-user-value.mjs` | 机械信号评分脚本;`--check` 模式断言 JSON 与引擎源码未漂移 |
| `src/data/user-value-scores.json` | 单一真相源(100 引擎) |
| `tests/user-value-score-guard.test.ts` | CI 守卫(5 条断言) |

**守卫的 5 条断言(各自只守一件事):**

| # | 断言 | 期望值来源 |
|---|---|---|
| 1 | 每个注册表 slug 都有评分条目,且没有多余条目 | `src/data/tools/index.ts` 的 100 个 slug(**独立于被测脚本**) |
| 2 | 每条 5 维分值 ∈ {0, 0.5, 1} | 字面量集合 |
| 3 | `formula` 字段 = 算术平均公式 | 字面量字符串 |
| 4 | `score` = 5 维算术平均 | **测试内独立重算**,不信任存储值 |
| 5 | `threshold` 字段 = 0.7 且每条 `admitted` = 「重算分数 ≥ 0.7」 | 阈值**字面量 0.7** |

**设计要点:`admitted` 字段是必需的。** 若 JSON 只存 `score` 而不存准入判定,「低于阈值的引擎被拒绝」就退化成**同义反复**——测试用它自己刚算出来的谓词去验证自己。存下 `admitted` 之后,「闸门决策」才成为**可观测事实**,测试才能拿字面量 0.7 去核它。

**评分方式(§7.3 拍板结果):机械信号 + 人工抽检,不是 LLM 打分。** 理由(实测驱动):

- 100 引擎 × 5 维 = 500 次判断,纯人工在审核等待窗口内做不完;
- LLM 打分**不可复现**——同一份输入两次跑可能给不同分,分数漂移就无法区分「引擎变好了」和「模型心情变了」;
- 机械信号可复现:重跑必得同一组数字,JSON 一有 diff 就一定意味着某个信号变了。

**advisor 维度的标记集必须严格。** 最初把 `不是` / `而非` 也算作边界标记,结果 **100/100 全部得 1 分**——该维度**零区分度**,等于不存在。最终标记集:`不该用` / `陷阱` / `局限` / `不建议` / `⚠️` / `不要用` / `慎用` / `caveat`。

**当前实测分布(100 引擎):** ≥0.7 共 **49** 个,<0.7 共 **51** 个。
维度分布:`functionalValue` 0.5:81 / 1:19;`ux` 0.5:22 / 1:78;`advisor` 0:1 / 0.5:69 / 1:30;`retention` 0:2 / 0.5:19 / 1:79;`advocacy` 0:51 / 0.5:19 / 1:30。

**判据有效性:9 条变异全部被「指定的那条断言」杀掉**(非「有断言红了」就算数):

| 变异 | 被谁杀掉 |
|---|---|
| JSON `threshold` 0.7→0.5 | 断言 5 |
| 存储 `score` 手改成 0.99 | 断言 4 |
| 某维分值改成 0.3(越档) | 断言 2 |
| 删掉一整条评分 | 断言 1 |
| 篡改 `admitted` 标记 | 断言 5 |
| `formula` 改成乘法公式 | 断言 3 |
| 加一条注册表里没有的幽灵条目 | 断言 1 |
| **脚本** THRESHOLD 0.7→0.5 后重生成 | 断言 5 |
| **脚本** 公式 /5→/4 后重生成 | 断言 4 |

> 变异台子的三条硬纪律被遵守:还原放在 `finally` 无条件执行、还原后逐字节比对(不一致即停)、基线不绿即停。**「变异存活」与「needle 过期」在退出码上同形**,所以台子报告 `SURVIVED` / `WRONG-KILLER` / `BROKE` 三种,而不是一个布尔值。

**闸门已接进 `pnpm check`:** `node scripts/score-user-value.mjs --check` 已加入 `check` 脚本(并新增 `check:user-value` 快捷命令)。否则「新增引擎但忘了评分」只有守卫的注册表比对能发现,**引擎文件与注册表同时漂移**的情形无人发现。

---

## 5. P153-A(已完成,2026-10-21):AI 定价全量刷新

> 这部分在 P153 写 spec 的同日完成并已上线,记录在此以便 P153 整体自洽。

### 5.1 做了什么

| 项 | 内容 |
|---|---|
| **数据** | `src/data/ai-pricing.json` 重新同步:`lastUpdated` 2026-08-24 → **2026-10-21**;新增 32 个模型、更新 44 个模型的价格/上下文窗口 |
| **新增旗舰** | `gpt-6.1-sol` / `gpt-6-astra` / `gpt-6-sol` / `gpt-6-luna`(in $2 / $10 / $0.1,out $10 / $50 / $0.5,ctx 922K)、`claude-opus-5-5` / `claude-sonnet-5-5` / `claude-haiku-5-5`(ctx 1M)、`gemini-4-argon`(★ 新 family)、`gemini-3.8-flash` |
| **新 family** | `gpt6`(🔷)、`claude5x`(★)、`gem4`(★) —— 否则新旗舰会落进 `legacy` 桶,而 `legacy` **被「best value」推荐排除** |
| **策展化** | 策展旗舰(display order + batch 折扣 + icon + cache/batch 能力位 + maxOutput)搬进 `scripts/sync-pricing.mjs` 的 `CURATED`,`pnpm sync` 每次都会重建 → 不再靠手改 JSON |
| **文案** | 4 个工具的 description 去掉易腐的「across N models」硬数字,改为家族/lineup 表述 —— 实测对比引擎实际渲染 **121 个模型**而文案写「15 models」,且那串字就在用户可见的 howToUse 里;`data_reviewed_at` / `dataReviewedAt` 更新到 2026-10-21(10 个 prose 文件 + 5 个 tools 条目) |
| **修正的既有缺陷** | ① `Cost Comparison (14 Models)` 硬编码 —— 实测静态图实际画 **127 行**,标签却是 14 → 改为动态取各自真实模型数;② §3.1 的两个红闸门 |

### 5.2 留档的已知不一致(不在本轮修)

**静态路径与交互路径的模型集不同:**
- SSR 首屏(`staticExamples[0]`,由 TS `calculate()` 生成)= **137** 个模型
- 交互态(`customFn` 压缩表)= **18** 个策展模型

标签已各自改为真实值(137 / 18),但**同一个页面首屏和点「Generate」后行数不同**。这是既有设计(`codegen-customfn` 的 bundle-size 权衡),修它需要决定「长尾模型名要不要留作 SEO 关键词面」——**属产品决策,留给 user**。

### 5.3 复测方法

```powershell
Set-Location 'D:\E\独立站\ForgeFlowKit'
node scripts/sync-pricing.mjs          # 数据 + 策展
node scripts/codegen-customfn.mjs      # 引擎压缩表
node scripts/codegen-examples.mjs      # staticExamples
node scripts/check-engine-count-by-category.mjs --check   # 已修的闸门
```

---

## 6. Phase 2 的真实成本(更正 P152 §6.1)

P152 §6.1 把「重建 5 篇决策博客」估为「中」成本。**实测后必须上调。**

`32a982e` 删除博客时,删掉的不只是文章文件:

| 被删的东西 | master 上的现状 |
|---|---|
| `src/content/blog/`(100 篇) | ❌ 不存在 |
| 博客集合定义(独立于 `src/content/config.ts` 的 `tools` 集合) | ❌ 不存在 |
| 博客路由(`/en/blog/*`、`/zh/blog/*`) | ❌ 零路由 |
| markdown 渲染依赖 | ❌ 无(仅 `src/content/tools/` 的 prose 走 Astro 内置) |
| sitemap / `llms.txt` / 导航里的 `/blog/` 链接 | ❌ 已清(整改时移除的) |

**重开 `/blog/*` 这个 URL 面 = 重建一整套内容管道 + 5 篇 1500+ 词文章 + 重新接 sitemap / llms.txt / 内部链接。**

**而且时机不好:** AdSense 于 2026-10-19 09:40 送审,当前状态「正在准备」。**在审核进行中重开刚被关掉的 URL 面,收益为零**(审核员看的是当前线上站点,新内容赶不上这次审核),风险却是实的(半成品的 `/en/blog/` 可能被爬虫或审核员看到)。

→ **建议:Phase 2 重建放到 AdSense 批准之后**,并按 §12.1 单独开 `feature/phase-2-p140e-seo` 分支 + 单独 spec。

**替代方案(成本低得多,值得 user 考虑):** 仓库里**已经有** prose 层 —— `src/content/tools/` 下 100 个 en 文件、**41,309 词**、均值 413 词(实测,不含 `_README.md`),由 `CalculatorProse.astro` 渲染进 `[lang]/[slug].astro`。5 个 ADR 对应的计算器(csat / roas / cac / churn-rate / burn-rate)**都有 prose 文件**。

> 把这 5 个 prose 改写成「决策指南」形态,**零新管道、零新 URL、零 sitemap 风险**。代价是它不是独立文章(没有独立 URL 与独立的 SEO 入口)。

**这一条(独立文章 vs 升级既有 prose)是 Phase 2 的核心产品决策,列在 §7.2。**

---

## 7. 建议行动序列(待 user 拍板)

| | 动作 | 成本 | 收益 | 依赖 |
|---|---|---|---|---|
| **G1** | ✅ **已完成(2026-10-21)**:去掉 5 个只读源码守卫里**不成立的** build 依赖 | 分钟级 | Phase 3 的质量线**从「形同虚设」变成真守** | 无 |
| **G2** | ✅ **已完成(2026-10-21)**:User Value Score 落地(脚本 + JSON + 5 条断言的守卫) | 中 | p140f §15.2 的准入线落地 → **Phase 4/5 扩量前唯一缺的那道闸** | 公式已拍板(7.1) |
| **P2** | Phase 2 重建 5 篇决策博客 | **大**(管道 + 文章 + 接线) | 路线图断层 + 深度内容 | 等 AdSense 批准 + 7.2 决策 |
| **E1** | ✅ **已完成(2026-10-21)**:修 `tests/run.mjs` 的 Windows 命令行长度限制(分批 spawn) | 小 | `pnpm check` 在 Windows 上能跑完 | 无 |
| **E2** | ✅ **已完成(2026-10-21)**:补齐博客删除后遗留的测试引用 —— 实测范围比预估大(7 套件 / 10 条断言,根因是「博客删除没做收尾」) | 小→中 | 消除 10 个永久红的测试 | 无 |
| **E4** | ✅ **已完成(2026-10-22)**:把 **CI-mode**(RUN_BUILD_TESTS=1 + 无预建 dist/)跑成 **0 失败 / 0 跳过**(完整清单是 **12 条断言 / 10 个套件**,不是先前报的 7/6 —— 那次统计来自被截断的 artifact),其中**一条是线上真实缺陷**(中文页漏原始 i18n 键名) | 中 | CI 真正第一次能跑绿;**顺带修掉一个正在生产环境暴露给 AdSense 审核员看的破损文本** | 无 |
| **E3** | 静态 / 交互模型集不一致(§5.2) | 中 | 首屏与交互一致 | 需产品决策 |
| **E5** | ✅ **已完成(2026-10-22)**:CI run #290 **第一次跑到 Unit tests 步骤** ⇒ 发现「本地绿 ≠ CI 绿」的**第三种形态**(**gitignore 的生成物不在仓库里**),并给 `tests/run.mjs` 加 `::error::` 标注 | 小 | **CI 的失败从「不可见」变成「可见」**(此前 100 次红运行没人发现,是因为 TAP 输出根本不被 GitHub 解析) | 无 |
| **E6** | ⏸ **待 user 拍板**:线上 og:image 全面修复 = **A**(CF Pages 构建命令 `pnpm build` → `pnpm build:full`,覆盖 200 个工具页)+ **B′**(生成一张真正的 1200×630 默认卡替换 1×1 占位符,覆盖 237 个非工具页)(§7.17;**原 B 案作废** —— `/og-default.png` 是 1×1 透明 PNG) | 小 | 全站 437 个页面的社交分享预览从坏变可看 | 产品决策(默认卡版式) + Dashboard 一个字段 |
| **E7** | ❌ **作废(2026-10-22 12:45)**:原条目「sync-pricing 只推 GitHub ⇒ 线上定价不刷新」的前提是错的 —— 实测 **CF Pages 的部署源就是 GitHub**,定价刷新本来就会上线(§7.18 证据 ①②③) | — | — | 已作废,勿再捡起 |
| **E8** | ⏸ **待 user 拍板**:在 `ci.yml` 加 `fetch-depth: 0`,让「CHANGELOG 提交计数」不变量在 CI 里**真的**把关(需同时把阈值从 `> 1` 放宽到 `> 5`,否则「两个 commit 不碰 CHANGELOG」就红)(§7.18) | 中 | 一条只在本机偶尔响的假闸门变成真闸门 | 工程决策:收紧 CI 失败语义 |
| **E9** | ⏸ **待 user 拍板**:`sync-pricing.yml` 现在是**直推 master**,而 bot 用 `GITHUB_TOKEN` 推的提交**不触发 CI 却照样触发 CF 部署**(§7.18)⇒ 每周有一次「未经 CI 验证就上线」。可选:① 改成提 PR(需装 `gh` + 开 PR 权限);② 推完由人手动推一次拿判决;③ 接受现状(定价数据每周自动更新,风险低) | 中 | 消除「未经 CI 验证就上线」的窗口 | 工程决策 |

**推荐顺序:G1 → G2 → (等 AdSense)P2;E1/E2 顺手做掉。**

**理由:G1/G2 是「先把护栏修好,再扩内容」的顺序。** 2026-08-17 的拒审本质就是「在没有质量准入线的情况下扩内容」;而现在 Phase 4/5 的 AI 自动扩展正要开始 —— 没有 User Value Score 闸门就扩,等于把同一个坑再踩一遍(§2.2 的 G2)。

### 7.5 G1 落地实况(2026-10-21)

**解除休眠门的 5 个守卫(只读源码,build 门不成立):**

| 守卫 | 断言数 | 解除后实测 |
|---|---|---|
| `playbook-6-fields-coverage-guard` | 3 | pass |
| `decision-layer-coverage-guard` | 2 | pass |
| `content-prose-shape-guard` | 7 | pass |
| `sources-quality-guard` | 1 | pass |
| `topic-content-coverage-guard` | 1 | pass |

> `no-adsense-placeholder-guard` **本来就没有门**(它显式声明 source-only),不是「解除」而是「确认无需解除」——原先的 todo 把它算进 6 个是笔误。

**顺带修正的既有漂移:`tests/run.mjs` 的 skip-mode 清单是硬编码的,已经漂了。** 原清单列了 4 个**已删除**的 blog-* 守卫、4 个**其实没有门**的守卫(含本次解除门的 3 个),同时**漏列** 8 个真正带门的守卫(实测带门套件 **47** 个)。改为**从测试源码动态计算**(`process.env.RUN_BUILD_TESTS` 出现即算带门,注释先剥离),**清单从此不可能再漂**。

### 7.6 E2 落地实况(2026-10-21):把「博客删除的收尾」做完

**为什么先做这个:** master 的 CI 本来就是**红的** —— 那 10 个失败**不是** build-gated,Linux CI 上照样红。在一个红灯基线上继续叠加改动,等于每层楼都建在坏地基上。而审核窗口正好是修护栏的窗口。

**根因只有一个:** `32a982e` 删掉博客集合/路由/渲染依赖时**没做收尾** —— 守卫还在读已删的文件、i18n 留下了死 key、判据还在断言一个**已经被故意废弃**的契约。

| 套件 | 失败数 | 根因 | 新契约 |
|---|---|---|---|
| `a11y-scattered` | 1 | 手抄的 9 个组件清单里有已删的 `RelatedBlog.astro` → ENOENT | **全量扫描** `src/components/*.astro`:每个含 `<svg>` 的组件都要有 `aria-hidden` |
| `ab-split` | 1 | 手抄的 4 个消费者里有已删的 `src/lib/blog.ts` → ENOENT | **从源码推导**:每个 import tools 注册表的模块都必须用规范相对路径 |
| `last-modified-guard` | 1 | 硬编码 5 个抽查路径,含 2 个已删的博客 URL | **全量扫描** `dist/**/*.html` |
| `translation-glossary-guard` | 2 | ① 断言 `src/content/blog` 存在 ② 8 个真孤儿 key | ① 博客 post 集合**从实际存在的 md 推导**(博客回来时自动重新要求 key)② 删掉 8 个死 key |
| `translate-helper` | 2 | 测试键 `blog.try_now` 随博客一起消失,`translate()` 落到「返回 key 本身」兜底 | 改用真实存在、带具名占位符的 key `topic.guide.h2.what_is` |
| `decision-support-audit` | 1 | import `../tmp/audit-decision-support.cjs` —— `tmp/` 被 gitignore ⇒ **CI 上必然缺** | L5 契约抽到 `tests/l5-tags.ts` 单一真相源,守卫与审计测试共用 |
| `wrangler-bindings-contract` | 2 | 断言的 `r2_buckets`/`kv_namespaces` 段是**当初为解锁 CF Pages publish 而故意删掉的** | 新契约:绑定名必须在 wrangler.toml 里被记录(供 Dashboard 配置),但**段不能存在**、配置行不许有占位符 |

**三条通用手法(全部用上了):**

1. **别抄,去算。** 4 处手抄清单(组件 9 项 / 消费者 4 个 / dist 抽查 5 个 / 博客 slug 列表)全部改成从真相源推导。收益不只是「不再腐烂」,覆盖面同时变大了:a11y 从 9 个文件 → **全部 23 个组件**(含 `<svg>` 的 8 个);消费者从 4 个 → **全部 24 个**;Last-Modified 从 5 个 → **全部 438 个页面**。
2. **判据要写清新契约,不能只把否定翻成肯定。** 例如 wrangler 那条不是「不要 `r2_buckets`」就完事,而是拆成三条各自独立的:绑定名要被记录 / 段不能存在 / 配置行不许有占位符。
3. **变异台子验证。** **10 条变异全被指定的那条断言**杀掉。台子还揪出了台子作者自己的**两个真 bug**:① `[[r2_buckets]]` 是 TOML 的数组表语法,而第一版正则只认单括号 `[r2_buckets]` ⇒ **漏检**;② robots 的 wildcard 断言写成了全 body 正则,body 里还有 5 个爬虫各自的 `Allow: /` ⇒ 把 wildcard 换成 `Disallow: /` 它照样绿。**这两条靠「读测试」都读不出来 —— 只有问「这条断言能不能杀掉它声称要杀的东西」才会暴露。**

**8 个真孤儿 key(逐个查证 0 引用后删除;其中 5 个同时还在另一份契约清单里,见 §7.8):**
`nav.blog` / `breadcrumb.blog` / `related_blog.title` / `favorites.saved_count` / `eeat.reviewed_by` / `eeat.team` / `eeat.author_label` / `eeat.publisher_label`

两个 locale 文件各删 8 行,5128 → 5120 键,en/zh 键集仍完全同步。删后**重建产物确认 8 个 key 一个都没漏进页面**(否则页面上会露出 key 字面量)。

### 7.7 E2 顺带挖出的第 11 个失败:「半门」套件(2026-10-21)

修完上表 10 个之后,全量复跑只剩 **1 个**失败:`privacy-policy: Chinese Supabase section present in dist` —— 而且它是**修完之后才出现**的。

**根因不是我的改动,是这个套件自己漏了 P23b 的 skip-guard。** `tests/privacy-policy-sync.test.ts` 有两个测试:第一个带 `if (skipIfNoBuildTests()) return;`,**第二个没有** ⇒ 它在默认模式下照样执行,去读磁盘上**碰巧存在**的 `dist/`。于是:

| dist/ 是谁构建的 | 结果 |
|---|---|
| 早先某次带 Supabase 环境变量的构建 | 通过(旧产物里有「数据同步（Supabase）」段) |
| 本轮不带环境变量的 `astro build` | **失败**(没有 Supabase 段) |

**「测试结果」取决于「上一次构建是谁做的」—— 这是非确定性,不是内容缺陷。** 修法:给第二个测试补上与第一个相同的 skip-guard(默认跳过;`RUN_BUILD_TESTS=1` 时读第一个测试用正确 env 构建出的产物)。

**顺手全仓扫了同类缺陷**(扫描器:先剥注释,再找「文件级门」与「测试级门」的差集):

> **半门套件:一个文件有 `RUN_BUILD_TESTS` 门,但只有部分 `test(...)` 块被门覆盖。**

实测 47 个 build 依赖套件里**只有 1 个是半门**,就是上面这个;其余要么是**文件级** `process.exit(0)`(覆盖全部测试),要么每个测试各自带门。修完后复扫 = **0**。

> 扫描器本身也返工了两次:第一版把「文件级门」误判成「无门」(42 个假阳性);第二版被注释里的 `test(` 和 `RegExp.prototype.test(` 骗到(`\btest\s*\(` 会匹配 `.test(`)。**每一次「扫描结果异常」都先怀疑扫描器** —— 这条已经吃过两次亏(见 agent memory「自建的校验器报 0 条时先怀疑解码器」)。

### 7.8 E2 的连锁发现:失败的数量和位置 ≠ 原因的数量和位置 (2026-10-21)

修完上两节,全量复跑从 10 个失败降到 1 个(robots + privacy-policy)。但**再跑一次,变成 6 个**,而且其中 3 个是我上一轮刚改的测试。追下去发现的是一条**三层因果链**:

| 层 | 现象 | 真正的原因 |
|---|---|---|
| 1 | 6 个测试失败:robots ×2 / feedback-widget / last-modified / sitemap ×2 | —— |
| 2 | `dist/ missing — run pnpm build first` | 构建**失败**了,`cleanDist()` 已把 dist/ 删掉却没重建 |
| 3 | `build failed: ❌ i18n completeness check failed. Missing 5 key(s)` | **`pnpm build` 的 prebuild 步骤挂了** |

**第 3 层才是根因,而它是我自己造成的:** 我删掉 8 个 i18n key 时,只问了一个守卫(孤儿 key 守卫说它们没人引用),**没问第二个守卫** —— `scripts/check-i18n-completeness.mjs` 的 `REQUIRED_KEYS` 硬编码清单里,其中 5 个还在:

```
eeat.reviewed_by / eeat.team / eeat.author_label / eeat.publisher_label / favorites.saved_count
```

逐个查证后确认:**这 5 个确实无人渲染**(EEAT 组件直接输出作者名 + `eeat.author_role.${role}`,从不打印「Author / Publisher / Reviewed by」标签;favorites 页也从不显示 saved-count)。**所以过时的是那份硬编码契约清单,不是数据。** 修法:从 `REQUIRED_KEYS` 里删掉这 5 条,并在脚本里写明原因。

> **两个闸门对同一批 key 给出相反结论时,不能只信一个。** 而且**删数据之前必须先问:还有没有别的闸门依赖它。** 孤儿守卫只覆盖了「被引用」这一个维度,prebuild 的完整性检查覆盖的是「被声明为必需」—— 两者是**不同契约**,不是同一个真相源。

**另一条独立发现:robots 守卫的源码解析器是坏的。**

`ai-crawler-robots-txt-guard` 在 `dist/robots.txt` 不存在时(常态:该路由是 hybrid 模式的按需端点,`public/robots.txt` 也不存在),会退回去**用正则扫源码里的 `BODY` 数组**。而源码注释里有一个撇号:

```js
// crawlers, and any new AI crawler we haven't enumerated yet).
```

这个撇号被当成字符串引号,**吞掉了后面真正的 `'User-agent: *'` 和 `'Allow: /'` 两行** ⇒ 解析出的 body 悄悄少了 wildcard 规则 ⇒ 守卫对一份**完全正确**的 robots.txt 报红。修法:**不再解析源码,直接调用真实的路由处理器**(`GET()` 返回的 Response 就是线上吐出的字节)—— 没有解析、没有 dist/ 依赖、结果不取决于本地有没有残留构建。

> **改完又被变异台子抓了一次:** 新写的「wildcard 有 `Allow: /`」断言用的是**全 body 正则**,而 body 里还有 5 个爬虫各自的 `Allow: /` ⇒ 把 wildcard 的 `Allow` 换成 `Disallow: /` 之后,这条断言**照样通过**。**断言的名字说的是「wildcard」,实际守的是「body 里任意一处」。** 改成块级判定(`isCrawlerAllowed(body, '*')` 解析 `User-agent: *` 自己的规则段)。
>
> 这就是台子的价值:它验证的是「**这个断言能不能杀掉它声称要杀的东西**」,而不是「这个测试现在是绿的」。

**第三类:「读 dist/ 却不拥有 dist/」的测试。**

系统扫了一遍:读 dist/ 的套件里,还有两个既**没有 build 门**、也**不自己构建** —— `feedback-widget-guard` 与 `last-modified-guard`。它们的结果取决于「本地碰巧有没有一份构建产物」:全新克隆上直接报 `dist/ missing — run pnpm build first`;CI 里因为 unit-test 步骤跑在 build 步骤**之前**,能不能过全看**排在它前面的套件有没有顺手构建过**。两个都改成仓库既有模式:**无 `RUN_BUILD_TESTS` 则跳过,需要时自己构建**。

扫完的结论:**读 dist/ 的套件要么有门、要么自建**,不再有第三种。

**遗留待拍板项(本轮未自行决定):**
- **L5 标记目前是精确大小写匹配**(`decision-layer-coverage-guard` 用 `src.includes('🧭 Decision Question')`)。原审计脚本的测试断言的是「大小写不敏感」,而**没有任何实现曾是不敏感的** —— 那是草稿脚本与守卫之间的漂移。现在契约被钉死为精确匹配。若认为「引擎里写成小写也应被检出」(即守卫应更宽松),需要**同时**改 `tests/l5-tags.ts` 与守卫语义 —— 属产品决策,留给 user。

### 7.9 🔴 更正:「master 的 CI 由红转绿」是错的 —— 它从未绿过 (2026-10-22)

> **🟢 2026-10-22 12:24 更新:本节的第一句结论已被推翻,现在是绿的。**
> CI run **`39721264626`**(head = `ff291f6`)= **success**,**11/11 步全绿**(Install / staticExamples / customFn / engine-coverage / tsc / **Unit tests ✅** / **Build ✅**)。这是 master 历史上第一次完整跑完全部步骤并成功。
> 紧接着的 run **`39722688254`**(head = `9a01716`)= **success**,同样 11/11 全绿 ⇒ **连续两次绿**;同一天同 commit 树上的本地 CI-mode 复现也 0 失败(8 批 / 237 套件 / 1375 断言)。
> 下面这段「它从未绿过」的记录保留,因为它记的是**那一刻的真实状态**与**为什么会红**;而「怎么修好的」见 §7.18(含一个必须知道的坑:run `39721264626` 绿,靠的是一条**在 CI 里结构性空转**的不变量没有被触发)。
> **教训仍然成立且更重要:** 在拿到真实 CI 判决之前,任何「CI 绿了」的断言都不该写进 commit message —— 上一轮就是写了才被 §7.9 更正。

E2 的 commit message 与本 spec §7 的动作表都写了「CI 已从红转绿 / master 的 CI 第一次是绿的」。**这句断言是错的**,2026-10-22 实测更正:

| 事实 | 实测 |
|---|---|
| GitHub Actions 上 master 的**最近 100 次 CI 运行,成功 0 次** | `workflows/ci.yml/runs?branch=master&per_page=50` 两页全查 |
| 2026-10-22 run `39707689461` | Install ✅ / staticExamples ✅ / customFn ✅ / engine-coverage ✅ / tsc ✅ / **Unit tests ❌** / Build skipped |
| 历史运行(#275–#288)的失败步骤 | 全部是 `Install`(1 次)或 `Drift check (staticExamples)`(其余) |
| ⇒ 推论 | **CI 的 Unit tests 步骤从来没有被跑到过** ⇒ 所有 build-dep 守卫的失败在 CI 上从没有人看见 |

**我上一轮错在哪:** 我验证的是**本地** `node tests/run.mjs`,而且**没有设 `RUN_BUILD_TESTS`** ⇒ 49 个 build-dep 套件全部 early-return,「1354 条断言 / 0 失败」是**跳过态**的数字,不是覆盖态的数字。

**本地「全绿」有两种形态,只有一种等价于 CI:**

| 形态 | 命令 | 等价于 CI? |
|---|---|---|
| skip-mode | `node tests/run.mjs` | ❌ build-dep 套件静默跳过,断言数偏少 |
| **CI-mode** | 移走 `dist/` + `$env:RUN_BUILD_TESTS='1'` + `node tests/run.mjs` | ✅ 与 CI 同条件(全新 checkout ⇒ 首个 build-dep 套件自己构建) |

CI-mode 下实测 **7 条断言失败 / 6 个套件**,全部是这次才暴露的(之前被 staticExamples 挡在后面)。其中一条是**线上真实缺陷**(§7.10)。

> **教训:** 「本地全绿」不蕴含「CI 全绿」。断言总数是判断自己在哪种形态的**最快信号** —— 同一个套件集合,skip-mode 与 CI-mode 的断言数不同。仓库自己的 `tests/run.mjs` 早就把这件事打印出来了(`[skip-mode] RUN_BUILD_TESTS not set — N build-dependent suites skipped.`),**那一行当时就在输出里,我没读**。

### 7.10 线上真实缺陷:P150 迁移丢掉 9 个 i18n 键,中文页正在印原始键名 (2026-10-22)

**线上实测**(`https://forgeflowkit.com/zh/solopreneur-claude-api-cost-calculator/`,SSR 部分):

```
engine_cost.comparison_title (100engine_cost.reqs_per_day)
engine_cost.cheapest_prefixClaude Haiku 55engine_cost.at_per_month$1.05/mo
```

每页 12 处。这不是测试问题 —— **这是 AdSense 审核员打开中文页就能看到的破损文本**,而且发生在 2026-10-19 送审之后。

| 层 | 事实 |
|---|---|
| 现象 | `translate()` 的兜底是 `locales[lang]?.[key] ?? locales.en?.[key] ?? key` ⇒ **缺键不报错,直接把键名印到页面上** |
| 根因 | P150 迁移(c16322b)把 `src/i18n/translations.ts` 拆成 per-locale JSON 时**丢掉了 9 个 `engine_cost.*` 键**。迁移后的 zh.json 里 0 命中;迁移前的 translations.ts 里 9 个都在,值完整 |
| 为什么没人发现 | 两个守卫**早就看见了它**:`dead-i18n-keys-guard` 的 WORKING_KEY_REQUIRED 清单点名 9 个;`ai-cost-t2-7` 的 zh-output 守卫点名 4 个 composite 行 —— **但两者都是 build-dep,CI 从没跑到过**(§7.9) |

**修法:** 从迁移前的 `translations.ts` 取回原值,按原位置(两个 locale 文件里 `ai_cost.section.usage_scenarios_openai` 与 `saas.section.dashboard` 之间的那个空档)补回。**逐字节核对:9/9 与迁移前完全一致**;en/zh 键集 5129 对齐;新文件 no-BOM / LF / 无 U+FFFD。

**补一个 source-only 守卫**(`tests/i18n-key-existence-guard.test.ts`):扫描 `src/` 里所有 `t('…')` / `translate('…')` **字面量**调用点,要求每个键在 en+zh 都存在;外加「两个 locale 键集相同」。它不带 build 门 ⇒ **`pnpm check` 每次都跑**。变异验证:从 zh.json 删掉一个被引用的键 ⇒ 守卫报错并点名该键 ⇒ **杀掉**;还原后基线绿。

> **教训:** 「缺键」这件事最难的地方在于它**不抛异常**。迁移类改动的验收清单里必须包含「**旧文件里有的键，新文件里还在吗**」—— 而且是**逐个**比对，不是看键集总数(总数相等也可能一边多一边少)。

### 7.11 另外 5 条失败:3 个指向已删除/已改名文件的守卫 + 1 个 JSON-LD 缺字段 + 1 个档位分区被破坏 (2026-10-22)

| # | 套件 | 根因 | 修法 |
|---|---|---|---|
| 1 | `claude-md-invariant-guard` | 读 `CLAUDE.md` —— 该文件已被 CLAUDE.md→AGENTS.md 迁移**改名**,不存在 ⇒ 每次必挂;而且它的「build-dep 套件数」靠**解析 `tests/run.mjs` 打印的 skip 清单**,E1 已把那份清单改成**实算** ⇒ 它读到 0 | 改读 `AGENTS.md`;抽出 `tests/build-dep-suites.mjs` 作单一真相源,`run.mjs` 与守卫共用(「别抄,去算」);AGENTS.md 的数字同步为真实值(49 build-dep + 188 source-only = 237) |
| 2 | `input-labels-i18n-audit` | 读已删除的 `src/i18n/translations.ts` ⇒ ENOENT ⇒ **这个守卫自 P150 起就没检查过任何东西** | 改读两个 locale JSON |
| 3 | `json-ld-field-guard` | 98 个 guide/compare 页的 Article JSON-LD **从来没有 `image` 字段**(`git log -S 'image'` 查不到任何历史) | 补 `image: ${SITE_URL}/og-default.png` —— 与 BaseLayout 的 `og:image`/`twitter:image` 同一个 URL(结构化数据与 meta 一致) |
| 4 | `tier-prose-completeness-guard`(档位数) | `TIER_2_SLUGS` 只剩 5 条:15 个 P140f-B2 提交各删 2 条(**从不加回 TIER_1**),三表并集只剩 70/100 | 恢复 `a41008e` 的权威 35 条分配。**先量后改**:实测这 30 个 slug 里 29 个本来就满足 tier-2 门槛,只有 1 个差 3 个字符 |
| 5 | `tier-prose-completeness-guard`(正文长度) | 3 段中文偏薄:`roas-calculator.zh` H2[3] 151 < 255、H2[4] 204 < 255;`email-campaign-roi-calculator.zh` H2[3] 147 < 150 | 补写这 3 段(归因模型/增量 ROAS、边际效率、币种税费),不是放宽门槛 |

> **教训:** 守卫指向**已删除或已改名的文件**时,它不会「自动失效」,它会**每次都红**。而如果 CI 前面还有别的红步骤,这条红就永远排在后面 —— 于是它看起来像「已知的既有红闸门」,而不是缺陷。**「已知红」和「一直没人跑到」是同一种现象。**

### 7.12 Sync AI Pricing 工作流从 2026-10-05 起一直红:浮动 pnpm major (2026-10-22)

失败步骤恒为 `Install deps`(`pnpm install --frozen-lockfile`):10-05(run 37320094551)、10-19(run 39251857722)、10-22(run 39707689389)三次同样。

**根因(隔离目录里复现,不是推测):**

```
ERR_PNPM_IGNORED_BUILDS
Ignored build scripts: browser-tabs-lock@1.3.0, bufferutil@4.1.0, core-js@3.47.0,
esbuild@0.17.19/0.19.12/0.21.5/0.28.1, sharp@0.33.5, utf-8-validate@6.0.6, workerd@1.20250718.0
```

工作流用 `npm install -g pnpm` ⇒ 拿到 **latest = 12.14.0**。pnpm ≥10 默认不跑依赖的构建脚本,**pnpm ≥12 把「被拦截」变成安装硬失败**。而 `ci.yml` 用 `pnpm/action-setup@v4` + `version: 9`,它的 Install 步骤历史上一直成功 —— **同一个仓库,两个工作流,一个被钉住、一个漂移。**

**排除项(都实测过):** pnpm 12 能装这份 lockfile(隔离目录 exit 0);Node 版本要求满足(pnpm 12 engines = `node >=18.*`,CI 是 Node 20);registry 可达。

**修法:** 改用 `pnpm/action-setup@v4` + `version: 9`,与 `ci.yml` 一致。**去掉那一个浮动依赖。**

> **教训:** 工具链里**浮动的 major**(`npm install -g pnpm`)等于把构建结果交给别人的发布节奏 —— 一次 pnpm 的行为变更就能让一个每周定时任务连续红三周,而仓库本身一行没动。

### 7.13 CI-mode 全量清单的完整版:12 条失败 / 10 个套件(更正 §7.9 的「7 条 / 6 个套件」) (2026-10-22)

§7.9 记的「CI-mode 下实测 7 条断言失败 / 6 个套件」**统计不完整** —— 当时读的是被截断的 artifact,**没读到 batch 3 / batch 4 的汇总行**。完整跑完 8 个批次后的实际清单:

| # | 套件 | 断言数 | 根因 |
|---|---|---|---|
| 1 | `engine-descriptions-i18n-guard` | 2 | 读**已删除**的 `src/i18n/translations.ts` ⇒ ENOENT |
| 2 | `engine-en-faq-i18n-guard` | 1 | 同上 |
| 3 | `engine-en-howto-i18n-guard` | 1 | 同上 |
| 4 | `engine-en-input-i18n-guard` | 1 | 同上 |
| 5 | `engine-titles-i18n-guard` | 2 | 同上 |
| 6 | `engine-zh-faq-i18n-guard` | 1 | 同上 |
| 7 | `engine-zh-howto-i18n-guard` | 1 | 同上 |
| 8 | `engine-zh-input-i18n-guard` | 1 | 同上 |
| 9 | `enterprise-i18n-coverage-guard` | 1 | 12 个 `enterprise.*` 键在 P150 迁移时丢失 |
| 10 | `translation-glossary-guard`(孤儿键) | 1 | 5 个 `engine_cost.*` 键**无人引用**(见 §7.13.3:它们是「模式未实现的预留键」,不是死键) |
| | **合计** | **12** | **10 个套件** |

> **教训(关于「计数」本身):** 失败的**清单**可以靠不完整的输出重建,但**计数**不能 —— 「7 条」和「12 条」都是真的,取决于读到几批。**报表类数字必须标注它的覆盖面**(读到哪一批、artifact 是否截断)。这与「CLEAN 和算出来的数字都先问它看了多少」是同一条。

#### 7.13.1 8 个引擎守卫读的是一个已删除的文件 ⇒ 它们的契约自 P150 起一直是空转

§7.11 的 `input-labels-i18n-audit` 是同一个毛病的**单例**;这次量出是 **8 个套件 / 10 条断言**。它们做的是同一件事:用正则从 `translations.ts` 里刨 `{ en, zh }` 对。

**修法(别抄,去算):** 8 个守卫各写一份「怎么读翻译」就是 8 份会漂移的真相源副本 ⇒ 新建 **`tests/_locale-json.ts`** 作**单一真相源**(`getTranslation(lang, key)` / `getEngineSlugsFromLocales()` / `getEngineSlugsFromEnginesDir()`),8 个守卫全部改为调用它;同时**删掉** `_composite-i18n-walkers.ts` 里已无人使用的 `buildTranslationKeyRegex()` 与 `extractAllEngineSlugs()` —— 留着就等于留了第二种读翻译的方式。

**换 slug 来源之前先量:** locale 派生 / `src/engines` 目录派生 / 旧 TS 派生,三者**实测是同一组 100 个 slug,双向零差异** ⇒ 换源不会让守卫变弱。

#### 7.13.2 🔴 旧的孤儿键守卫是**自指的** —— 它从来不可能发现孤儿

`translation-glossary-guard` 的「孤儿键」断言逻辑是:扫 `src/` 里出现的键字面量,与字典求差集。但 **P150 之前,字典 `src/i18n/translations.ts` 自己就躺在 `src/` 里** —— 每个键都以字面量出现在自己身上 ⇒ **每个键都算「被引用」** ⇒ 这条断言**结构上不可能失败**。

P150 把字典搬成 `src/i18n/locales/{en,zh}.json`(扫描正则只覆盖 `.astro/.ts/.tsx/.js/.jsx/.mjs`,**不含 `.json`**)⇒ 自指消失 ⇒ 守卫**第一次真正生效**,立刻抓出 5 个真孤儿。

> **这是 §7.11 那条失效模式的另一面:** 一个守卫可以因为「**读不到**」而失效(ENOENT 直接崩),也可以因为「**读到的是自己**」而失效。两种都表现为「它一直在跑、一直是绿的」。

#### 7.13.3 「恢复键」这一步踩了两次:先误判成死键,再被另一个闸门推翻

恢复 9 个 `engine_cost.*` 键时,孤儿键守卫立刻指出其中 5 个「无人引用」。**我第一轮的结论是「真死键,删掉」** —— 依据是全仓搜不到引用,且对应的输出形状(💡 Saving vs / 🎨 Cheapest provider / 💰 Total / 💼 Training total)**没有任何引擎在输出**,模板里也没有对应分支。

**这个结论被随后的全量复跑推翻了。** 删掉那 5 个键之后,CI-mode 从 12 条失败降到 **1 条**,而这条正是:

```
not ok 90 - working i18n keys translate on their target pages
  - engine_cost.saving_prefix: WORKING_KEY_REQUIRED entry references missing i18n locale key
  - engine_cost.saving_suffix: ... (其余 3 个同形)
```

`dead-i18n-keys-guard` 的 `WORKING_KEY_REQUIRED` 清单里**也挂着这 9 个键** —— 它的注释写明:这 9 条是「P137 T2.7 composite 行的键名条目」,**契约要求它们存在**。两个闸门对同一批键给出相反结论:一个说「没人用,删掉」,一个说「必须存在」。

**正解不是删键,也不是削弱守卫,而是弄清键的真实身份:** 它们是 **P137 T2.7 规划了 9 个 composite 本地化键、其中 4 个已实现、另 5 个对应的输出形状还没有引擎在产出**的**预留键**。

| 键 | 身份 | 依据 |
|---|---|---|
| `engine_cost.{comparison_title, reqs_per_day, cheapest_prefix, at_per_month}` | **在用** | `[slug].astro` 的 4 个 `compositePatterns` 分支直接引用,且**线上中文页正在漏它们的原始键名**(§7.10) |
| `engine_cost.{saving_prefix, saving_suffix, image_cheapest, gpu_total, training_total}` | **预留键(模式未实现)** | 契约要求它们存在(`WORKING_KEY_REQUIRED`);但没有任何引擎输出对应形状 ⇒ 现阶段没有分支会匹配到它们 |
| 12 个 `enterprise.{scenario,template,report}.*` | **预留键(组件 deferred)** | 对应 3 个 **deferred 组件**(`SaveScenarioModal` / `TemplatePicker` / `ReportGenerator`),它们是空 div,注释写明 *reserved for the v2 UX upgrade*;工具栏的 `data-i18n` 属性在 `public/` 里**没有任何消费脚本** ⇒ 属性当前是惰性的,工具栏文本恒为英文 |

**处置(两处都是同一个手法):** 把键从迁移前的 `translations.ts` 取回原值补进两个 locale 文件(值逐字节核对),**并把「这批键归我」写进将要消费它们的文件**:

- 12 个 enterprise 键 → 各自的 owning 组件里声明 `RESERVED_I18N_KEYS`
- 5 个 engine_cost 键 → `[slug].astro` 的 `compositePatterns` 旁边声明 `RESERVED_COMPOSITE_KEYS`

孤儿守卫的规则是「键必须在源码里出现过」,**声明本身就是出现** —— 不需要额外白名单。owner 被删 ⇒ 键变孤儿 ⇒ 守卫变红 ⇒ 行为正确。**两个闸门于是同时成立,而不是互相抵消。**

最终:两个 locale 文件 5120 → **5141** 键(+4 在用 +5 预留 +12 预留),en/zh 键集同步,no-BOM / LF / 无 U+FFFD。

> **教训(这是 §7.8 的重演,值得单独记):**
> **删数据之前必须先问:还有没有别的闸门依赖它。** 孤儿守卫只覆盖「被引用」这一个维度,`WORKING_KEY_REQUIRED` 覆盖的是「被声明为必需」—— 两者是**不同契约**,不是同一个真相源。
> 更要注意的是**中间结论**:我基于「搜不到引用 + 没有引擎输出」判定了「死键」,这个推理**每一步都成立**,结论却是错的 —— 因为还有第三个维度(**某份契约清单要求它存在**)。
> **「证据充分」不等于「结论正确」;判据的覆盖面决定了结论的覆盖面。**

#### 7.13.4 补一条 source-only 判据:6 个 composite 守卫只看 locale 侧

那 6 个 composite 守卫(faq / how_to_use / input × en+zh)的 slug 列表来自 **locale 的 `tools.<slug>.` 前缀** ⇒ **新加一个引擎却没写翻译时,这 6 个守卫根本不会看它**(标题/描述守卫会看,但它们是 build-dep,CI 从没跑到)。

新增判据(source-only,`pnpm check` 每次都跑):**`src/engines` 的 slug 集合 == locale 的 `tools.<slug>.` 前缀集合**,双向。缺一边都报。

#### 7.13.5 工具层面:变异台子**自己**先坏了一次 —— 「报全杀」时先怀疑观察器

变异台子跑 4 条变异(分别抽掉 en/zh 里的 faq / title / how_to_use / description 键),**第一轮报「4/4 全杀」**,但打印出来的是 `suite exit=null`。

`spawnSync('tsx.cmd')` 在 Windows 上不加 `shell: true` 会 EINVAL(**Node 拒绝直接 spawn `.cmd` shim** —— 仓库自己的 `tests/run.mjs` 就为此写了注释),`r.status` 返回 `null`,而我写的是 `status !== 0` ⇒ **null 被当成了「KILLED」**。**4 条变异「全杀」其实是「全没跑起来」。**

修法:`shell: true` + **spawn 失败直接抛异常**(不让 `null` 参与判定)。修好后重跑:**4/4 被指定的那条守卫杀掉、错误信息点名了键、还原后 sha256 逐字节一致、基线全绿**。

> **同族:** 「自建的校验器报 0 条时先怀疑解码器」的**孪生形态**是「自建的校验器报『全绿』时先怀疑它到底跑没跑」。判定条件必须**显式区分**「被杀掉」与「没跑起来」。

### 7.14 最终验证(2026-10-22)

CI-mode 全量复跑(dist 移走 + `RUN_BUILD_TESTS=1` + `SKIP_INDEXNOW=1` + `node tests/run.mjs`):

| 批次 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 合计 |
|---|---|---|---|---|---|---|---|---|---|
| 断言数 | 182 | 178 | 199 | 59 | 230 | 159 | 233 | 135 | **1375** |
| 失败 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |

- 退出码 **0**;**0 skipped** —— build-dep 套件全部真跑了(不是跳过态的数字,§7.9 的教训)
- `npx tsc --noEmit` exit 0;8 个 check 脚本全绿
- 产物复核:438 页 HTML 的**可见文本**里 **0 个原始 i18n 键名**(扫出来的 5 个 token 全是误报:`data-i18n="..."` 的**属性值** ×4 与路径里的文件名 ×1)
- 4 条变异台子:4/4 被指定守卫杀掉、点名了键、还原后 sha256 逐字节一致、基线全绿

> **这一轮 CI-mode 从 12 条失败到 0 条,中间只错了 1 次** —— 我把 5 个 `engine_cost.*` 键判成「死键」删掉,而 `dead-i18n-keys-guard` 的 `WORKING_KEY_REQUIRED` 要求它们存在(§7.13.3)。**判据的覆盖面决定结论的覆盖面**:「搜不到引用 + 没有引擎输出」这两条证据都成立,却漏了第三个维度(**某份契约清单要求它存在**)。

### 7.15 CI 真跑到 Unit tests 了 —— 然后发现「本地绿 ≠ CI 绿」的**第三种**形态 (2026-10-22)

推送后 CI run #290(真实 GitHub Actions / ubuntu-latest / Node 20 / pnpm 9):

| 步骤 | 结果 |
|---|---|
| Install / staticExamples / customFn / engine-coverage / tsc | ✅ |
| **Unit tests** | ❌ |
| Build | skipped |

**这是 master 的 CI 历史上第一次跑到 Unit tests 步骤** —— 此前 100 次运行都死在 `Install` 或 `Drift check (staticExamples)`。而同一份代码的本地 CI-mode 是 **0 失败 / 1375 断言**。**同一份代码,两个环境,两个结论。**

差异定位(本地 vs CI):

| 项 | 本地 | CI(全新 checkout) |
|---|---|---|
| `public/og/`(200 张 OG 图,46.6 MB) | 存在(之前跑过 `pnpm build:og`) | **不存在** —— `public/og/` 在 .gitignore 里,进不了仓库 |
| ⇒ `dist/og/` | 200 张 | **空** |
| ⇒ `image-size-guard` 的两条断言 | 过 | **必红** |

**这不是「测试写错了」,是「守卫假设了一个仓库里根本不存在的东西」。** 而且旧失败信息还指错了 remedy:「Expected at least one OG image in dist/og/. **Run pnpm build first**」—— `pnpm build` 根本不生成 OG 图,`pnpm build:og` 才生成。

新契约(两半都强制,**没有一半是悄悄跳过**):

- 本 checkout **有**生成物(`public/og/` 非空)⇒ 构建必须把它们**全部**拷进 `dist/og/`(数量一致),且每一条预算都要成立;
- 本 checkout **没有** ⇒ **明说**「SKIP: this checkout has no generated OG bundle (public/og/ is empty — the images are gitignored build artifacts, produced by `pnpm build:og`). **Nothing was measured.**」并通过。

实测两态都验证过:有生成物 ⇒ 两条预算断言真跑;把 `public/og/` 移走 ⇒ 两条都打印 SKIP 且通过;`public/og/` 已还原。

> **教训:** 「本地全绿」与「CI 全绿」之间还有**第三种**差异:**仓库里没有的生成物**。本地有 `public/og/`、`scripts/.twemoji-cache/`、`node_modules/`、`.astro/` —— 它们**都不在 git 里**;CI 的全新 checkout 只有 git 里的东西。**「守卫读的文件在我机器上存在」不等于「它在 CI 里存在」。**
> 查法:凡是守卫读的是**生成目录**(而不是源码或已跟踪资源),都要先问一句「它在仓库里吗」。

### 7.16 CI 的失败必须**可见**:`::error::` 标注 (2026-10-22)

GitHub **不解析 TAP 输出** —— 一个失败的测试在 run 列表里只表现为「Process completed with exit code 1」,而 job log 需要**登录**才能看。**这就是「100 次连续红运行没人看见」的机制性原因:不是没人看,是看不见。**

`tests/run.mjs` 现在在批次失败时输出 GitHub 工作流命令 `::error::`,内容是失败测试名 + 断言详情。这既是拿到「CI 到底哪条红」的钥匙(公开 API 可匿名读 annotations),也是一道**该早就有的护栏**:下一次有人把 CI 弄红了,失败原因会直接出现在 PR 的检查列表里。

实测:从 `en.json` 抽掉 `eeat.title` ⇒ 3 条 `::error::` 标注,含失败测试名与「missing in en.json (referenced in src/components/EeatTrustBlock.astro)」;还原后 sha256 逐字节一致。

### 7.17 生产站点的 og:image:200 页 404 + 237 页是 **1×1 占位图**(既有缺陷;未在本轮擅自修改)

> **🟡 2026-10-22 12:45 更正本节(本节原先的标题与 B 案描述都不准确,见下)。**

实测(2026-10-22,**线上 + 本地产物双向**):

| 项 | 实测值 | 证据 |
|---|---|---|
| 线上 per-page 图 | **404** | `GET /og/solopreneur-openai-token-calculator-en.png` → `404` |
| 线上 `/og-default.png` | **200,但只有 68 字节** | `GET /og-default.png` → `200 bytes=68` |
| `/og-default.png` 真实尺寸 | **1×1 像素**透明 PNG | PNG IHDR:width=`0x00000001`、height=`0x00000001`;仓库副本 `public/og-default.png` 同样是 68 字节 |
| 构建产物里 og:image 的分布 | **438 个 HTML**:200 个指向 `/og/<slug>-<lang>.png`、**237 个指向 `/og-default.png`**、1 个(404.html)没有 og:image | 扫 `dist` 全部 438 个 HTML 的 `og:image` |
| per-page 图为什么没有 | 它们是 gitignore 的生成物(`public/og/`),而 CF Pages 的构建命令只跑了 `pnpm build`,**没跑 `pnpm build:og`** | `.gitignore` 有 `public/og/`;`package.json` 的 `build` ≠ `build:full` |
| `/og-default.png` 为什么是 1×1 | 它是 2026-06-25 SEO 那轮**刻意造的占位符** | `docs/superpowers/specs/2026-06-25-seo-overhaul-design.md:481`「新建(占位 1×1 透明 PNG,避免 Phase 1 时 404)」;`2026-06-25-seo-schema-sitemap.md:398-414` 写明「1×1 transparent PNG placeholder (BaseLayout default ogImage **until Plan B ships real images**)」——**Plan B 一直没做** |

**所以「全站 og:image 404」这个描述是错的。真实状况是分成两半:**

- **200 个工具页**:og:image 指向 per-page 图 ⇒ 线上 **404** ⇒ 社交平台完全拿不到预览图。
- **237 个非工具页**(home / category / guide / compare / about / terms 等):og:image 指向 `/og-default.png` ⇒ 线上 **200** ⇒ 但那是 **1×1 透明像素**,社交平台会渲染成一张**空白卡片**(而 404 至少是明确失败)。**「不 404」不等于「能看」** —— 这 237 页的分享预览同样是坏的,只是坏得更隐蔽。

> ⚠️ **本节原先的 B 案是无效的。** 它写的是「工具页的 `ogImage` 改用仓库里已跟踪的 `/og-default.png`」—— 那张图是 1×1 占位符,改了以后 200 个工具页会从「404」变成「一张空白图」。**B 案必须先补一张真正的默认 OG 卡**(见 B′)。

**三个可选修法(属产品决策,留给 user,本轮不自行决定):**

| | 做法 | 覆盖 | 代价 |
|---|---|---|---|
| **A(推荐,必做)** | 把 CF Pages 的构建命令从 `pnpm build` 改成 `pnpm build:full`(= `build:og && build`) | 200 个工具页 | Dashboard 一个字段;meta 不用改;构建变慢(多生成 200 张图)。**可行性已实测**:`scripts/fonts/*.otf`(4 个,约 10 MB)是**已提交**的,runner 上不缺字体;`scripts/.twemoji-cache/` 是 gitignored,首次构建需访问 jsDelivr 拉 9 张 twemoji PNG(CF runner 有外网即可) |
| **B′(推荐,配合 A)** | 用现成的 satori + resvg 管线**生成一张真正的 1200×630 默认 OG 卡**,替换掉 `public/og-default.png` 这个 1×1 占位符(可提交进仓库) | 237 个非工具页 | 要设计一张默认卡的版式(标题/品牌/渐变),并决定它进不进仓库(进仓库 ⇒ 不依赖构建) |
| **C** | 非工具页也按页生成专属 OG 图(按 category / guide / compare 分) | 237 个非工具页 | 工作量最大,收益与 B′ 重叠 |

> 注:topic guide / compare 页的 Article JSON-LD `image` 本轮加的就是 `${SITE_URL}/og-default.png`,与**它们** BaseLayout 的默认 og:image 一致 ✓(那两页没有 per-page OG 图)。工具页走的是 `ogImage={`/og/${slug}-${lang}.png`}`,所以只影响 200 个工具页。
> **连带提醒**:上轮给 98 个 guide/compare 页补的 Article JSON-LD `image` 现在指向的正是那个 1×1 占位图 ⇒ 补 `image` 字段这件事**结构上是对的**(schema.org 要求 Article 有 image),但**指向的资产是占位符**,要在 B′ 里一并换掉。

### 7.18 合并 bot 自动提交打断「CHANGELOG 提交计数」不变量;且该不变量**在 CI 里结构性空转**

实测(2026-10-22):

| 事实 | 值 | 证据 |
|---|---|---|
| `git rev-list --count HEAD`(合并后 `ff291f6`) | **1316** | 本地全历史 |
| CHANGELOG 头声明 | **1314** | 合并前写的 |
| 合并带入的 commit 数 | **2**(`b8cd076` bot 提交 + `ff291f6` merge commit) | `git log --oneline` |
| meta-guard 判红阈值 | forward drift **> 1** | `tests/claude-md-invariant-guard.test.ts:251` |
| 实际 drift | **2** ⇒ 判红 | 本地 CI-mode 复现(1375 断言 / 1 失败) |
| 真实 CI run `39721264626` | **success**(11/11 步绿) | GitHub API |

**同一棵树,两个环境两个结论** —— 这就是矛盾点。

#### 为什么 CI 没红:那条不变量在 CI 里从来没被检查过

`actions/checkout@v4` 默认 **`fetch-depth: 1`(浅克隆)**,于是:

```
$ git -C <depth-1 clone> rev-parse --is-shallow-repository   →  true
$ git -C <depth-1 clone> rev-list --count HEAD                →  1
$ git -C <full repo>       rev-list --count HEAD               →  1316
```

guard 算的是 `commitDrift = actual − stated`,**只在 `drift > 1` 时判红**。CI 里 `actual = 1`、`stated = 1314` ⇒ `drift = −1313` ⇒ **恒过**。也就是说:

> **这条不变量在 CI(唯一需要它把关的地方)是结构性空转的 —— 它只在一台有完整历史的开发机上才偶尔响。**

它**看起来**在核对「CHANGELOG 写的提交总数 = 仓库真实提交总数」,实际在 CI 里核对的是「1 ≤ 1316」。

#### 本轮的修法:让它说「未测量」,而不是假装通过

沿用本轮 `image-size-guard` 刚立的契约(有生成物就查、没有就明说 SKIP):

```ts
const isShallowRepo = git('git rev-parse --is-shallow-repository') === 'true';
if (isShallowRepo) {
  console.log(`[claude-md-invariant-guard] SKIP commit-count invariant — shallow checkout ... Nothing was measured.`);
} else if (commitDrift > 1) { violations.push(...); }
```

**判红条件一字未改** —— 全历史下它仍然杀掉它声称要杀的东西;变的只是「没法测」时不再装作「测过了」。

双路证明(`%TEMP%/ffk-verify-count-guard.mjs`,4/4 通过):

| 路径 | 场景 | 期望 | 实测 |
|---|---|---|---|
| A | depth-1 克隆(= CI 的形状),CHANGELOG 写 1314(错的) | 不判红,但必须**显式 SKIP** | `status=0` + 打印 `SKIP commit-count invariant` + `Nothing was measured.` ✅ |
| B | 全历史,CHANGELOG 写 1317(对的) | 绿,且**不**走 SKIP | `status=0` + `# pass 1` ✅ |
| C | 全历史,CHANGELOG 改成 1310(变异) | **被杀掉**,且点名是提交计数不变量 | `status=1` + `CHANGELOG total commit count drift: says 1310 … forward drift 6` ✅ |
| — | 还原纪律 | 变异后逐字节还原 | sha256 一致 ✅ |

#### 若要让它在 CI 里**真的**把关(留给 user 决策)

在 `ci.yml` 里加 `fetch-depth: 0` 即可让计数变真。但那会把失败条件从「drift > 1」变成「**每 ≤2 个 commit 必须碰一次 CHANGELOG**」——对一个日常会做批量提交的仓库,这条会变成新的日常噪声源。较合理的配套是同时把阈值放宽到 `> 5`(当初这条不变量就是为了抓 P130→P131 那种 off-by-5)。**本轮未擅自改**:一是这会把 CI 的失败语义整体收紧(属于工程决策),二是它会让「两个 commit 不碰 CHANGELOG」这种常态直接变红。

#### 另外两个本轮实测到的部署链路事实

1. **CF Pages 的部署源是 GitHub,不是 Gitee。** ⚠️ 本条**推翻了本节初稿的假设**(初稿写的是「CF Pages 从 Gitee 部署 ⇒ sync-pricing 只推 GitHub ⇒ 线上定价不刷新」)。实测证据三条,互相独立:

   | 证据 | 内容 |
   |---|---|
   | ① | `b8cd076`(bot 用 `GITHUB_TOKEN` 推的提交,**GitHub Actions 没有为它触发任何 CI run**)却有 `Cloudflare Pages — Deployed successfully` 的 check-run(03:43:02Z)⇒ 部署由 **GitHub push webhook** 驱动,与 workflow 无关 |
   | ② | `2a8f779`(当时只推了 Gitee,**从未上过 GitHub**)在 GitHub 上**没有任何** CF 部署记录 |
   | ③ | 线上页面 `<meta http-equiv="last-modified" content="Thu, 22 Oct 2026 04:30:38 GMT">` 正好是 `9a01716` 那次 **GitHub** push 的 CF 部署时刻 |

   ⇒ **推论:`sync-pricing.yml` 只推 GitHub 并不是缺陷** —— 它推的正是部署源,每周的定价刷新**会**上线(本轮 b8cd076 已于 03:43 部署)。初稿那个「线上定价不刷新」的结论**作废**。

   ⇒ **反过来,真正要注意的是 Gitee 这条腿**:项目的 3-way push 约定里 Gitee 是 primary,但从**生产**角度看 GitHub 才是唯一要紧的那一路。任何「只推 Gitee 忘了推 GitHub」的提交**根本没上线过**。本轮第二轮的 3 个 commit(`6a1e75d` / `42d7e05` / `2a8f779`)就属于这种 —— 在 GitHub 上滞留了 2 个多小时才上线。

2. **bot 用 `GITHUB_TOKEN` 推的 commit 不会触发新的 workflow run。** 实测:`b8cd076`(2026-10-22T03:41:34Z 推入)之后,GitHub 上**没有任何**以该 sha 为 head 的 CI run(最新 run 仍是 03:41:11 那个,head = `f749633`)。所以「Sync AI Pricing 绿了」**不等于**「那棵树被 CI 验证过」——bot 的提交需要**人**再推一次才拿到 CI 判决。本轮正是手动合并 + 手动推送才拿到 run `39721264626`。
   —— 但注意:它**照样触发了 CF 部署**(见上一条证据①)。也就是说 **bot 的提交是「未经 CI 验证就上线」的**。这条对发布安全性有意义,已并入 E9。

### 7.1 公式歧义(必须拍板) —— ✅ 已拍板(2026-10-21)

- **推荐:** `User Value Score = (功能价值 + UX + Advisor + Retention + Advocacy) ÷ 5`(算术平均)
- **理由:** 与同句 `÷ 5` 自洽;阈值 0.7 可达;`×` 读作 `+` 几乎肯定是原意(否则公式恒拒)
- **改的是 p140f §15.2 的原文** → 属 Roadmap 改动,需 user 明确点头

> **拍板结果(user,2026-10-21):采纳算术平均。**
> 已落地:`docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` §15.2 原文已改写,并附 2026-10-21 修正说明(含「为何乘法形式不可满足」的推导)与三档刻度。
> 脚本实现:`scripts/score-user-value.mjs` 的 `score = sum / 5`;`src/data/user-value-scores.json` 的 `formula` 字段写死同一公式;守卫断言 3 / 4 独立核验该公式。

### 7.2 Phase 2 形态(必须拍板)

- **选项 A(推荐):** 升级既有 5 个 prose 为决策指南 —— 零新管道、零新 URL,当天可完成
- **选项 B:** 重建独立博客管道 + 5 篇独立文章 —— 真正的 P140e 交付物,但成本大、且要等 AdSense 批准
- **选项 C:** 先 A 后 B(A 立刻提升内容质量,B 排期做)

### 7.3 评分方式 —— ✅ 已拍板(2026-10-21)

- **原推荐:** LLM 批量 + 人工抽样 20 个(§4.3)
- **拍板结果:** 改为**机械信号 + 人工抽检**(§4.6),理由见该节:LLM 打分不可复现,分数漂移无法区分「引擎变好」与「模型心情变了」;机械信号重跑必得同一组数字。
- 人工抽检仍保留 —— 用于校准**标记集与档位规则**,而不是校准单个引擎的分数。**规则不一致时改规则,不改分数。**

### 7.4 `tests/run.mjs` 修法 —— ✅ 已实施(2026-10-21)

- 原推荐:分批 spawn(35 个/批),与本轮验证时用的方法一致;或把路径写进临时响应文件
- **实际采用:分批 spawn(30 个/批)。** 单次 spawn 携带 236 条测试路径会超 Windows cmd.exe 的 8191 字符上限,`pnpm check` 在 Windows 上**一条断言都跑不到**就死在 "The command line is too long."。分批后:
  - 每批一条命令行,长度远低于上限;
  - 语义不变:所有套件仍**全部跑完**、**串行**(`spawnSync` 阻塞,批次之间不会交错,不会互相踩 `dist/`),任一批失败 → 进程非零退出;
  - 每批打印一行 `[run] batch N (M suites, …)` 便于观察进度。

---

## 8. Open Questions(2026-10-21 拍板后)

1. ~~**§7.1 公式**改成算术平均?~~ → ✅ **已拍板:算术平均**(2026-10-21)。p140f §15.2 原文已改写并附修正说明(§4.6)。
2. **§7.2 Phase 2 形态**:A(升级 prose)/ B(重建博客)/ C(先 A 后 B)? → ⏸ **仍未拍板**。取舍:**A 零新管道、零新 URL,当天可完成**;**B 是真正的 P140e 交付物,但成本大、且要等 AdSense 批准**。P152 §6.1 的成本估计已被实测上调(A 实际是「中等」,Phase 2 重建是「大」)。
3. ~~**§7.3 评分方式**~~ → ✅ **已拍板:机械信号 + 人工抽检**(2026-10-21),非 LLM 批量打分(理由见 §4.6)。
4. **§5.2** 静态 137 模型 vs 交互 18 模型 —— 要不要统一?统一的话长尾模型名的 SEO 关键词面会缩 → ⏸ 未拍板。
5. **分支命名** → ✅ **已定**:`feature/phase-3-playbook-6-fields` 承载 G1+G2+E1,按 §12.2「Phase 3 内的工作算小更新」直接 commit 在该分支上,不开 sub-branch。P2 另开 `feature/phase-2-p140e-seo`。
6. `feat/i18n-drift-fix` / `feat/ai-cost-preset-chip-unification` 两个悬空分支 → ⏸ 未拍板。事实:**已被 squash 合入 master**(JSON 迁移 + 漂移检测 + pre-commit 接线都在 master 上),`git cherry` 判 `+` 只因 squash 后 patch-id 变了。真正没进 master 的只有 i18n 分支上的 2 个测试文件 → **建议只补这 2 个测试,然后删掉两个分支指针**。
7. **L5 标记的大小写语义**(2026-10-22 新增)—— `tests/l5-tags.ts` 现钉死为**精确大小写**匹配,与 `decision-layer-coverage-guard` 的 `src.includes()` 一致。原审计脚本的测试断言「大小写不敏感」,而**没有任何实现曾是不敏感的**。若要让守卫更宽松(引擎里写成 `🧭 decision question:` 也算命中),需**同时**改 `tests/l5-tags.ts` 与守卫语义 → 属产品决策,留给 user。
8. ~~**`sync-pricing.yml` 要不要也推 Gitee**~~ → ❌ **前提错误,作废**(2026-10-22 12:45)。实测 **CF Pages 的部署源就是 GitHub**(三条独立证据见 §7.18),所以 `sync-pricing` 只推 GitHub **不是缺陷**,每周定价刷新本来就会上线。**原第 8 条作废。**
9. **`ci.yml` 要不要 `fetch-depth: 0`**(2026-10-22 新增,§7.18)—— 加了之后「CHANGELOG 提交计数」不变量才在 CI 里真的把关,但要把阈值从 `> 1` 放宽到 `> 5`,否则「连续两个 commit 没碰 CHANGELOG」就红。⏸ 未拍板。
10. **bot 提交「未经 CI 验证就上线」要不要堵**(2026-10-22 新增,§7.18 / E9)—— `sync-pricing` 直推 master,而 `GITHUB_TOKEN` 推的提交不触发 CI、却照样触发 CF 部署。⏸ 未拍板。
11. **非工具页的默认 OG 卡长什么样**(2026-10-22 新增,§7.17 / E6 的 B′)—— `public/og-default.png` 是 2026-06-25 造的 1×1 透明占位符,从未被替换;237 个页面用它。⏸ 未拍板(版式属产品决策)。

---

## 9. 复测方法

```powershell
Set-Location 'D:\E\独立站\ForgeFlowKit'

# Phase 3 字段覆盖率(应为 100/100)
Get-ChildItem src\engines -Recurse -Filter *.ts | Where-Object Name -ne 'index.ts' |
  Select-String -Pattern 'playbook\s*:' | Measure-Object

# 守卫激活后,应在不带 RUN_BUILD_TESTS 的情况下仍然执行断言
node_modules\.bin\tsx.cmd --test tests/playbook-6-fields-coverage-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/decision-layer-coverage-guard.test.ts

# User Value Score(应 > 0 命中)
Get-ChildItem src,tests -Recurse -Include *.ts,*.json,*.astro |
  Select-String -Pattern 'user-value-score|userValueScore|User Value Score'

# 两个红闸门(应 PASS)
node scripts/check-engine-count-by-category.mjs --check
node scripts/codegen-examples.mjs --check

# User Value Score 闸门(2026-10-21 新增)
node scripts/score-user-value.mjs --check          # JSON 与引擎源码未漂移
node_modules\.bin\tsx.cmd --test tests/user-value-score-guard.test.ts   # 5 条断言

# G1 激活后的守卫(不带 RUN_BUILD_TESTS 也必须真跑断言)
node_modules\.bin\tsx.cmd --test tests/playbook-6-fields-coverage-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/decision-layer-coverage-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/content-prose-shape-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/sources-quality-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/topic-content-coverage-guard.test.ts

# 全量(Windows 下已修:分批 spawn,不再超命令行长度上限)
node tests/run.mjs

# E2 修完后:这 7 个套件必须全绿,且不再依赖任何 gitignored 文件
node_modules\.bin\tsx.cmd --test tests/a11y-scattered.test.ts tests/ab-split.test.ts `
  tests/last-modified-guard.test.ts tests/translation-glossary-guard.test.ts `
  tests/translate-helper.test.ts tests/decision-support-audit.test.ts `
  tests/wrangler-bindings-contract.test.ts

# 8 个孤儿 key 删除后:两个 locale 键集仍同步,且没有漏进产物
node -e "const en=require('./src/i18n/locales/en.json'),zh=require('./src/i18n/locales/zh.json');"
node scripts/check-i18n-completeness.mjs

# AI 定价新鲜度
Get-Content src\data\ai-pricing.json | ConvertFrom-Json | Select-Object lastUpdated, source
```

---

## 10. References

### 路线图 / 宪法

- `docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` §11.4 / §12.1 / §15.2 —— Phase 3、5 问与 User Value Score
- `AGENTS.md` L108-125 —— Project Constitution (v2.0 灵魂三维度)
- `docs/superpowers/specs/2026-10-21-p152-v2-roadmap-execution-audit-design.md` —— 本 spec 更正其 §3 / §6.1 / §6.2

### 审计用到的仓库产物

- `tests/playbook-6-fields-coverage-guard.test.ts` —— Phase 3 守卫(P153-G1 已激活)
- `tests/decision-layer-coverage-guard.test.ts` —— L5 决策层守卫(P153-G1 已激活)
- `tests/content-prose-shape-guard.test.ts` / `tests/sources-quality-guard.test.ts` / `tests/topic-content-coverage-guard.test.ts` —— 另外 3 个已激活的 source-only 守卫
- `tests/user-value-score-guard.test.ts` —— **P153-G2 新建**:User Value Score 闸门守卫(5 条断言)
- `scripts/score-user-value.mjs` —— **P153-G2 新建**:机械信号评分脚本(`--check` 模式)
- `src/data/user-value-scores.json` —— **P153-G2 新建**:100 引擎的评分单一真相源
- `src/engines/**/*.ts` —— 100 个引擎(playbook 6 字段 / L5 决策层)
- `src/data/tools/index.ts` —— 工具注册表(100 slug,守卫断言 1 的**独立来源**)
- `src/content/tools/*.md` —— prose 层(100 en / 41,309 词,实测)
- `src/data/ai-pricing.json` + `scripts/sync-pricing.mjs` + `scripts/codegen-customfn.mjs` —— AI 定价链路
- `tests/run.mjs` —— 测试 runner(P153-E1 已修:分批 spawn + 动态 skip 清单)

### 外部

- Codifly《AI API prices in October 2026》(codifly.co,2026-10)—— 维度 3 AI 模型信号
- wifitalents.com「Calculator Software: Top Picks (2026)」—— 维度 3 竞品信号
- LiteLLM `model_prices_and_context_window.json`(4245 条,2026-10-21 实测)—— 定价源头
