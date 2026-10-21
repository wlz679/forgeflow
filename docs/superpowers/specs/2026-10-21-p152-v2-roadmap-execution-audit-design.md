# P152 — v2.0 路线图执行审计与优化建议

> **For agentic workers:** This is an **audit + proposal** document, not an execution spec. It measures the shipped state of the P140f v2.0 roadmap (2026-08-05, user-approved Path C) as of **2026-10-21**, identifies the gap between planned and shipped, and proposes a re-sequenced action list. Per `AGENTS.md` §12.6 (维度 3: Proactive Co-Pilot), **AI 不允许擅自修改 Roadmap / Phase** — every item in §7 requires user sign-off before execution.
>
> **Status:** DRAFT — awaiting user 拍板 on §7 行动序列.
> **Date:** 2026-10-21
> **Author:** Mavis (agentic audit)
> **Scope:** `docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` 的执行状态盘点 + 后续排序建议.

> ⚠️ **更正声明(2026-10-21,同日由 P153 实测推翻 3 处结论)**
>
> 本文档的 **Phase 3 结论是错的** —— 探针形态用错了(量的是 `// Goal:` 注释,实现是 `playbook:` 元数据)。
> **Phase 3 实为 100/100 已完成**,真正缺的是「守卫休眠」+「User Value Score 不存在」。
> 同时 **Phase 2 重建成本被低估**(博客集合/路由/渲染依赖已随 `32a982e` 整体删除,重建=重开一个 URL 面)。
> 详见 **`2026-10-21-p153-user-value-score-and-guard-activation-design.md`** §2 / §6。
> **本节数字以 P153 为准。**

**Goal:** 把 2026-08-05 批准的 v2.0 路线图与 **2026-10-21 的仓库实际状态**对齐,回答三个问题:(a) 五个 Phase 各自落地到什么程度;(b) 「v2.0 灵魂三维度」的真实覆盖率是多少;(c) 下一个动作序列该怎么排。

**Method:** 全量仓库产物扫描(100 engine 源文件逐个正则匹配 + `scripts/` 清点 + 分支合并状态 + i18n/定价数据新鲜度)+ 线上抽查 + 维度 3 外部信号实测。**所有数字均为实测,非估算;估算处已显式标注。**

---

## Global Constraints

- **本文件不修改 Roadmap。** §7 是提案,不是指令。执行需用户拍板(§12.6 强制约束)。
- **不自动开分支。** §12.5 规定主 agent 必须先自问清单、再问用户拍板,才能创建 `feature/phase-N-*` 分支。
- **本文件不改动任何源码。** 纯审计文档。
- **数字必须可复测。** §8 给出了完整复测方法,后续 session 应能独立复现同样的数字。

---

## 1. 定位:路线图本体在哪

| 项 | 值 |
|---|---|
| **路线图正文** | `docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md`(891 行) |
| **状态** | APPROVED(user 2026-08-05 确认 Path C) |
| **宪法落点** | `AGENTS.md` §"Project Constitution (v2.0 灵魂三维度)"(L108-125) |
| **分支策略** | 同 spec §12.1(6 个 `feature/phase-N-*` 命名约定) |
| **索引** | `docs/superpowers/specs/INDEX.md` §7(P140+ 分类) |

**本 spec 之前没有做过执行状态审计** —— INDEX.md 只做目录导航,§「维护约定」明确写「INDEX 是 navigator,**不**追踪 spec 的 ship status」。ship log 分散在 `memory/pXXX-*-shipped.md`,但**没有一个视角把「v2.0 路线图」当作整体来对照实测**。P152 补这个缺口。

---

## 2. 原始路线图(逐字对照,不改写)

### 2.1 v1 / v2 / v3 三段定义

> 来源:p140f spec §11.1,user 2026-08-06 决策

| 版本 | 核心 | 用户角色 | 商业价值 |
|---|---|---|---|
| **v1**(当前) | Calculator Collection | 用户用工具 | 低(流量) |
| **v2.0**(Phase 1-5) | **Decision Support System** | 用户决策 | 中(订阅) |
| **v3.0**(Phase 5 后期触发) | **Autonomous Decision Platform** | AI 决策 + 用户审批 | 高(API + 企业) |

### 2.2 v2.0 灵魂原文

> p140f spec L7-17,user 2026-08-05 揭示

> **ForgeFlowKit 不是 Calculator Collection,是 Decision Support System。**
> 每个计算器的目标不是「输出数字」,是**「帮用户做出正确决策」**。

### 2.3 灵魂三维度(宪法级)

> `AGENTS.md` L108-125

| 维度 | 含义 | 来源 |
|---|---|---|
| 1. **Decision Support System** | 每个 calc = 帮用户决策,不是输出数字 | user 2026-08-05 |
| 2. **User-Centric Advisor** | 用户视角 5 问(功能价值 / UX / Advisor / Retention / Advocacy) | user 2026-08-06 |
| 3. **Proactive Co-Pilot** | AI 不是任务执行者,是项目合作伙伴 | user 2026-08-06 |

### 2.4 五阶段原定节奏

```
Day 1-7    Phase 1  KB4 ADR 模板 + 5 个决策支持示范工具
Day 7-21   Phase 2  P140e: 5 篇 ≥1500 字决策导向深度博客
Day 21-90  Phase 3  Playbook 6 字段标准化 × 100 calc
Day 90-365 Phase 4  主题簇方法论 + Decision Value Score + 100 新 calc
Day 365-730 Phase 5 v2.5 Enterprise AI Native + 200+ 新 calc
Day 730+   v3.0    Autonomous Decision Platform,500-1000/年
```

---

## 3. 实测:五个 Phase 的落地状况

> **方法:** 逐 Phase 检查对应的仓库产物是否存在且在 `master` 上。**全部为实测。**

| Phase | 计划 | 实测状态 | 证据 |
|---|---|---|---|
| **1** KB4 ADR | Day 1-7 | ✅ **完成** | `docs/superpowers/adrs/` 6 个文件:`0000-template` + `0001-csat` / `0002-roas` / `0003-cac` / `0004-churn-rate` / `0005-burn-rate` 决策 |
| **2** 5 篇决策博客 | Day 7-21 | ❌ **产物已不存在** | 5 篇(`best-solopreneur-{csat,roas,cac,churn-rate,project-profitability}-calculator.md`)在 `32a982e^` 中存在,已被 `32a982e` 删除 |
| **3** Playbook 6 字段 | Day 21-90 | ✅ **100 / 100**(⚠️ 更正,见 P153 §2) | 元数据以 `playbook: { goal, input, output, constraint, tool, memory }` 形态存在,100/100 引擎齐备;`tests/playbook-6-fields-coverage-guard.test.ts` 守卫也在 —— 但它带 `RUN_BUILD_TESTS` gate,**在 `pnpm check` 里从不执行断言** |
| **4** 主题簇 + Score | Day 90-365 | 🟡 **约一半** | ✅ 49 topics + 94 个 topic-content 条目;❌ 100 新 calc = 0;❌ 3 个 Score 公式在 `src/` 命中 **0** |
| **5** v2.5 AI Native | Day 365-730 | 🟡 **约 1/3** | ✅ P5A shipped 2026-08-26(Saved Scenarios / Decision Templates / Decision Reports);P5B / P5C **deferred** |
| **v3.0** | Day 730+ | ⏸ 按设计未启动 | — |

### 3.1 Phase 2 被删除的细节

那 5 篇深度博客的仓库路径(取自 `git ls-tree 32a982e^ -- src/content/blog/`):

```
best-solopreneur-csat-calculator.md
best-solopreneur-roas-calculator.md
best-solopreneur-cac-calculator.md
best-solopreneur-churn-rate-calculator.md
best-solopreneur-project-profitability-calculator.md
```

**它们与 99 篇模板博客共用同一命名形态**,因此在 AdSense「低价值内容」整改中被一并删除。

> **判断:当时的删除决策是正确的**(模板形态正是 2026-08-17 拒审的直接原因),但**路线图 Phase 2 的交付物需要以新形态重建** —— 见 §7.1。

### 3.2 Phase 4/5 的核心机制:AI 自动扩展 = 0 实现

p140f §13.2 设计的链条:

```
4 数据源采集 → Discovery Agent → Modeling Agent → Factory Agent → Portfolio Agent
                                              ↓
                              每周 ~25 新 Topic → 人类 1-click 批准
```

**实测:`scripts/` 下 24 个脚本全部是 codegen / check 类**(examples / customfn / i18n / og / pricing / indexnow / smoke),**没有任何一个属于 discovery / agent / intelligence-engine 类别。**

因此下列数字目前均为**纸面目标**:

- Phase 4「每周 ~25 新 Topic」
- Phase 5「每周 ~4 新 calc」
- v3.0「500-1000/年」

### 3.3 三个 Score 公式:闸门不存在

| 公式 | 定义位置 | `src/` 命中 |
|---|---|---|
| `User Value Score = (功能价值 × UX × Advisor × Retention × Advocacy) ÷ 5` | p140f §15.2 | **0** |
| `Topic Score = (Search × Biz × Intent × Expansion) ÷ Competition` | p140f §13.2 | **0** |
| `Decision Value Score` | p140f Phase 4 产出 | **0** |

`decision_output` / `decision_risks` 等 5 个灵魂字段:**0 命中**。

> **这不是「没做完」,是「准入闸门不存在」。** p140f §15.2 写明 `User Value Score < 0.7 → Topic 自动拒绝` —— 没有这个公式,Phase 4/5 的 AI 自动扩展**没有任何质量准入线**,会直接撞上导致 2026-08-17 拒审的同一个坑。

---

## 4. 灵魂三维度:实测覆盖率

| 维度 | 指标 | 实测值(2026-10-21) |
|---|---|---|
| **1. Decision Support** | engine 完整 L5 决策层(🧭 Decision Question / Recommendation / Key Uncertainty / Next Action,4 个标记全中) | **19 / 100** ✅;其余 81 个仅 1/4 |
| **2. User-Centric Advisor** | P150 Phase 1 + Phase 2 | 🟡 已 ship(feedback 后端 + UC advisor);**但反馈闭环的数据侧仍为空** —— R2 / KV binding 未在 Cloudflare Dashboard 创建 |
| **3. Proactive Co-Pilot** | AGENTS.md 宪法条款 | ✅ 已写入 L108-125;**但「AI 自动扩展」一行代码都没有**(§3.2) |

### 4.1 为什么 19/100 是个可行动的信号

`memory/p151-dimension-1-audit-report.md`(2026-09-02)记录的正是这个分布:

| Score | Count | % |
|---|---|---|
| 4/4(full L5) | 19 | 16.4% |
| 0-1/4 | 97 | 83.6% |

P151 随后做了 backfill batch 1 / 2 / 3(2026-09-01~02),**当前实测仍是 19/100** —— 说明 backfill 之后没有进一步推进,或 backfill 本身的产出已被计入这 19 个。**无论哪种,81% 的引擎离「输出决策建议」还差 3 个子段。**

---

## 5. 维度 3 scan(AGENTS.md 强制要求,实测不编)

```
维度 3 scan: 基于信号 2026-10 AI 模型价格表 + 2026 竞品格局
- AI 模型:  2026-10 新增 GPT-6 全家(Luna / 6.1 Sol / Astra)、Claude Haiku 5.5 / Opus 5.5 /
            Gemini 4 Argon(定价有效至 11/30)、Gemini 3.8 Flash、DeepSeek V4.1 / V4 Pro、Grok 4.7
            → 影响 B 类别 8 个 AI 成本引擎 → ai-pricing.json 已过期(见 §6.4)
- 搜索算法: 无新信号(GSC 报表正常,未见 Core Update 公告)
- 法规变化: 无新信号(GDPR / CCPA 无变化;CMP 已于 2026-06-26 发布并在运行)
- 关键库:   无新信号(未见 Astro 5 / Tailwind 5 正式 release)
- 竞品:     Desmos / Omni Calculator / Calculator Soup / SpeedCrunch / Soulver 格局未变;
            但「Topic-specific calculator pages with parameter inputs and verification steps」
            的行业定位正面印证了 v2.0 决策支持方向
```

来源:Codifly《AI API prices in October 2026》(codifly.co,2026-10);competitor landscape via wifitalents.com「Calculator Software: Top Picks (2026)」。

---

## 6. 优化项(按「价值 ÷ 成本」排序)

### 6.1 🥇 Phase 2 重建:5 篇决策博客(新形态)

**问题**:路线图 Phase 2 的核心交付物已不存在(§3.1)。

> ⚠️ **成本已上调(2026-10-21,P153 §6)**:本节原估「中」成本。实测 `32a982e` 删除的不只是文章文件 —— **博客集合定义 / 博客路由 / markdown 渲染依赖 / sitemap 与 llms.txt 的 `/blog/` 接线全部一起没了**,master 上零残留。重建 = **重开一整个 URL 面**。
> 另外 **AdSense 于 2026-10-19 09:40 送审、当前仍在审核中** —— 审核进行中重开刚被关掉的 `/blog/*`,**收益为零**(审核员看的是当前线上站点)、风险却是实的。
> **建议:Phase 2 推迟到 AdSense 批准之后**,按 §12.1 单开 `feature/phase-2-p140e-seo` + 单独 spec。
> **低成本的替代方案**:仓库里已有 prose 层(`src/content/tools/` 100 个 en 文件、**41,309 词**、均值 413 词;实测,不含 `_README.md`),5 个 ADR 对应的计算器都有 prose —— 改写成决策指南形态**零新管道、零新 URL**。独立文章 vs 升级 prose 是核心产品决策(P153 §7.2)。

**为什么值得重建(双重收益)**:

1. 补回路线图断层 —— Phase 1 的 5 个 ADR 已就位,但对应的「决策指南」层缺席
2. 给刚通过的 AdSense 补上**持续的原创深度内容信号** —— 索引里 195 条模板博客已清空,深度内容目前为 0

**关键约束:新形态必须是「决策指南」,不是「计算器介绍」。**

| | 模板博客(已删,不能再犯) | 决策博客(新形态) |
|---|---|---|
| 结构 | 标题 + 关键词堆砌 + 公式罗列 | 用户处境 → 判断依据 → 行动建议 → 何时不该用 |
| 主语 | 公式 | **用户的决策** |
| 举例 | `MRR = 客户数 × 单价` | 「你的 MRR 卡在 8000 且增速 <3%/月 —— 先动哪一头?」 |
| 对应 ADR | — | csat / roas / cac / churn / burn-rate 已有 ADR,直接对齐 |

**与 ADR 的对应关系**(Phase 1 已完成,直接复用):

| ADR | 决策问题 | 博客 |
|---|---|---|
| `0001-csat-decision` | CSAT 掉了要不要救 | CSAT 决策指南 |
| `0002-roas-decision` | 广告是否值得继续投 | ROAS 决策指南 |
| `0003-cac-decision` | 获客是否值得 | CAC 决策指南 |
| `0004-churn-rate-decision` | 客户是否值得留 | Churn 决策指南 |
| `0005-burn-rate-decision` | 赛道是否值得做 | 烧钱率决策指南 |

### 6.2 🥈 Phase 3:Playbook 6 字段(⚠️ 更正 —— 实为 100/100 已完成,不是 0/100)

> **本节原结论「0/100,只差 Goal 那一层」已被推翻。** 原探针量的是引擎头注释 `// Goal:`,而真实实现是 `playbook:` 元数据。实测 100/100 引擎六字段齐备,P153 §2 有完整证据。

**真实状态:**

| 项 | 实测 |
|---|---|
| 100 个引擎的 `playbook` 6 字段 | ✅ **100/100** |
| `goal` 是否为真决策问题(非 placeholder) | ✅ 100/100 含「决策/decision/该不该/是否」 |
| 5 个 demo(csat/roas/cac/churn-rate/burn-rate) 是否具体 | ✅ 全部具体(如 csat:`用户该不该信任自己的 CSAT 数字作为留存决策依据`) |
| CI 守卫 | ✅ 存在(`tests/playbook-6-fields-coverage-guard.test.ts`) |
| **守卫是否真的会跑** | ❌ **否** —— 它带 `RUN_BUILD_TESTS` gate,但只读 `.ts` 源码,根本不需要 build。`pnpm check` 不设该变量 → **从不执行断言** |

**所以 Phase 3 的真正缺口不是「补字段」,而是两件小事:**

1. **把守卫接上电**:去掉那两处不成立的 build 依赖(分钟级)
2. **补上真正缺的那道闸**:User Value Score(见 §6.3)

**成本**:从「100 个文件改造」降到「2 行 + 1 个新守卫」。**建议配 CI guard** 的原始设想已由仓库现有守卫实现,缺的只是让它生效。

### 6.3 🥉 User Value Score 公式 + CI guard

**问题**:见 §3.3。闸门不存在 = AI 扩展无护栏。**这条结论不变** —— 全仓 `User Value Score|userValueScore|user-value-score|Topic Score|Decision Value Score` 实测 **0 命中**。

**但「直接编码 §15.2 定义」是错的** —— p140f §15.2 的公式按字面**在数学上不可满足**:

```
User Value Score = (功能价值 × UX 易用性 × Advisor 关系 × Retention × Advocacy) ÷ 5
5 维各 ∈ [0,1] → 最大乘积 1 → 最大分 = 1 ÷ 5 = 0.2 < 0.7
→ 连最完美的工具都过不了闸门,恒被拒绝
```

**这大概就是它从没被实现的原因**(不是没人写,是写了必然全拒)。修正方向:把 `×` 读作 `+`,即算术平均 `(a+b+c+d+e) ÷ 5`,阈值 0.7 才可达。**这是 Roadmap 定义的改动,需 user 拍板**(P153 §7.1)。

**范围**:
- 先定公式(算术平均 vs 几何平均)—— **阻塞项**
- 实现 `User Value Score` + 5 维评分数据(`src/data/user-value-scores.json`)
- **评分方式**:LLM 批量 + 人工抽样复核 20 个(100 引擎 × 5 维 = 500 次判断,纯人工在等待窗口内做不完)
- CI guard:新 engine 缺评分 → build 失败;评分 < 0.7 → 不进候选池
- ⚠️ **期望值必须是独立写死的字面量**(阈值 0.7 不要从被测模块 import),且「分数存在 / 算法正确 / 阈值拦截」拆成 3 条断言 —— 一条判据只守一件事

**与 §6.2 的依赖关系(已更正)**:§6.2 原写「Phase 3 的 `Goal` 字段本质就是 User Value Score 的前两维输入,建议两者一起做」。**实测 Phase 3 已完成,所以不存在「一起做」的前提** —— 现在只剩 User Value Score 这一件事要落地。

### 6.4 维度 3 信号:AI 定价数据已过期

| 项 | 实测 |
|---|---|
| `src/data/ai-pricing.json` 的 `lastUpdated` | **2026-08-24**(审计日 2026-10-21,过期 58 天) |
| 已收录 | `gpt-5.6` ✅ / `claude-sonnet-5` ✅ / `claude-opus-5` ✅ / `claude-fable` ✅ / `deepseek-v4` ✅ |
| **缺失(2026-10 市场已有)** | **`gpt-6` 全家(Luna / 6.1 Sol / Astra)**、**`claude-haiku-5`**、**`gemini-4`**、**`gemini-3.8`** |

2026-10 实际市场参考:Claude Haiku 5.5 输入 $0.10/M、GPT-6 Luna 输入 $0.10/M、GPT-6 Astra 输出 $50/M、DeepSeek V4 Pro 混合 $1.98/M。

**影响**:8 个 B 类别 AI 成本引擎展示的是 8 月价格。对 E-E-A-T 而言,一个「AI 成本计算器」报出过时价格,比没有这个计算器更糟。

**成本最低** —— 项目已有 `scripts/sync-pricing.mjs` + GH Action cron(`sync-pricing.yml`),跑一次即可。

### 6.5 分支卫生

```
feat/ai-cost-preset-chip-unification   +11 commits 未进 master
feat/i18n-drift-fix                     +16 commits 未进 master
```

外加 `origin/` 与 `github/` 上 11 个 `feature/*` 分支从未合到各自 remote 的 master。

**`feat/i18n-drift-fix` 值得优先确认** —— i18n 漂移修复与「站点整改」直接相关,需确认是有意搁置还是遗漏。

> ⚠️ **2026-10-21 更正(P153 §8.6):这两个分支其实已经被 squash 合入 master 了。**
> `git cherry master <branch>` 判 `+` 只是因为 **squash 合并后 patch-id 变了**,不是「内容没进来」。实测证据:
> - `src/i18n/translations.ts` 在 master 上**已不存在**;`src/i18n/locales/{en,zh}.json`(910KB / 886KB)、`scripts/check-i18n-completeness.mjs`、`check:i18n` 接线、pre-commit 里的 i18n 检查 **master 上全都有**
> - `PresetChips` 组件与 `engine.presets` 字段在 master 上也都有(9 个引擎带 `presets:`)
>
> **真正没进 master 的只有 i18n 分支上的 2 个测试文件**(`tests/scripts/check-i18n-completeness.test.mjs`、`tests/build/no-raw-keys.test.mjs`)—— 而它们守的正是 master 上**已经生效**的漂移检测器。
> **建议:只补这 2 个测试,然后删掉两个分支指针。**

---

## 7. 建议行动序列(待用户拍板)

> 按「价值 ÷ 成本」排序。**执行需用户拍板**(§12.6)。
> ⚠️ **本序列已于 2026-10-21 按 P153 的实测结论重排**(见下方「重排后」)。

| | 动作 | 成本 | 收益 |
|---|---|---|---|
| **A** | 跑 `sync-pricing.mjs` 更新 AI 定价 + 重生成 8 引擎 | **分钟级** | 维度 3 信号已触发;E-E-A-T 准确性;仓库已有脚本 |
| **B** | 重建 Phase 2 的 5 篇决策博客(新形态,§6.1) | 中 | 补路线图断层 + 补 AdSense 后的持续内容信号 |
| **C** | Phase 3 + User Value Score 一起做(§6.2 + §6.3) | 中 | v3.0 硬前置;AI 扩展的质量闸门 |
| **D** | 确认两个悬空分支的归属(§6.5) | 小 | 技术债清理 |
| **E** | 可选:feedback R2/KV binding、`www → apex` 301 | 小 | 维度 2 数据侧;SEO 规范化 |

**推荐:B 优先,A 顺手做掉。** B 同时喂两件事 —— 路线图与刚通过的 AdSense。

### 7.0 重排后(2026-10-21,P153 实测后)

原推荐「B 优先」基于两个现已不成立的前提:① Phase 3 是 0/100(实为 100/100);② 博客重建是「中」成本、且能立刻补 AdSense 内容信号(实为需重开 URL 面,且审核中做收益为零)。

| | 动作 | 成本 | 收益 | 状态 |
|---|---|---|---|---|
| **A** | AI 定价全量刷新 + 新 family + 策展化 + 修 2 个红闸门 | 中 | 8 个引擎显示 2026-10 的真价格 | ✅ **已完成**(P153 §5) |
| **G1** | 激活两个休眠守卫(去掉不成立的 build 依赖) | **分钟级** | Phase 3 的质量线从「形同虚设」变真守 | 待执行 |
| **G2** | User Value Score + CI guard(先定公式) | 中 | Phase 4/5 扩量前唯一缺的那道闸 | 待执行(阻塞于公式) |
| **P2** | Phase 2 重建 5 篇决策博客 | **大** | 路线图断层 + 深度内容 | **等 AdSense 批准** |
| **E1** | 修 `tests/run.mjs` 的 Windows 命令行长度限制 | 小 | `pnpm check` 在 Windows 上能跑完 | 待执行 |
| **E2** | 补齐博客删除后遗留的 3 处测试 ENOENT | 小 | 消除永久红的测试 | 待执行 |
| **D** | 两个悬空分支:已确认被 squash 合入 master,只补 2 个测试后删分支 | 小 | 技术债清理 | 待执行 |

**推荐顺序:G1 → G2 → (等 AdSense)P2;E1/E2/D 顺手做掉。**

**理由:先把护栏修好,再扩内容。** 2026-08-17 拒审的本质就是「在没有质量准入线的情况下扩内容」;而 Phase 4/5 的 AI 自动扩展正要开始 —— 没有 User Value Score 闸门就扩,等于把同一个坑再踩一遍。

---

## 8. 复测方法(供后续 session 独立复现)

本 spec 的每个数字都可用以下方式复测,建议在 §7 任何一项执行后重跑:

```powershell
Set-Location 'D:\E\独立站\ForgeFlowKit'

# §3 Phase 3 覆盖率(应为 0/100)
Get-ChildItem src\engines -Recurse -Filter *.ts | Select-String -Pattern '(?m)^\s*//\s*Goal:'

# §4 维度 1 L5 覆盖率(应为 19/100)
$markers = @('Decision Question','Recommendation','Key Uncertainty','Next Action')
# 逐 engine 计命中数,分布应为 4/4:19  1/4:81

# §3.2 AI 自动扩展实现情况(应为 0)
Get-ChildItem scripts -File | Where-Object Name -match 'discover|agent|intelligen|autonom'

# §3.3 三个 Score 公式(应为 0 命中)
Get-ChildItem src -Recurse -Include *.ts,*.astro | Select-String -Pattern 'User Value Score|Topic Score|Decision Value Score'

# §6.4 定价新鲜度
Get-Content src\data\ai-pricing.json | ConvertFrom-Json | Select-Object lastUpdated, source

# §6.5 分支卫生
git branch --merged master; git branch -a --no-merged master
```

---

## 9. 外部背景:同期 AdSense 状态(供交叉参考)

| 报告日 | 数据日 | 已索引总数 | `/blog` 筛选命中 |
|---|---|---|---|
| 2026-09-29 | 09-21 | 620 | 195 |
| 2026-10-09 | 10-04 | 529 | 115 |
| 2026-10-19 | 10-14 | 485 | 待测(估算 48-60) |

> **均为 GSC 实测。** 站点侧整改已完成并上线(`32a982e` 删 100 篇模板博客,`d22735c` 清 `Category <字母>` 占位标签 + `llms.txt` 死链),`/blog/*` 全部返回 404。
> 2026-10-19 09:40 用户已重新提交 AdSense 审核,状态「正在准备」;**Ads.txt 状态由「未找到」自动翻转为「已授权」**。

**与路线图的关系**:索引残留**不是**路线图的阻塞项。审核员访问的是线上站点,`/blog/*` 返回 404 —— 看不到那些 URL。路线图的推进不依赖索引归零。

---

## 10. Open Questions(待用户拍板)

1. **§7 的 A-E 五项,是否按推荐顺序执行?** 是否需要先切 `feature/phase-N-*` 分支?(§12.5 要求先自问 + 用户拍板)
   > **2026-10-21 更新**:推荐顺序已按 P153 实测重排为 **G1 → G2 → (等 AdSense)P2**(见 §7.0);A 已完成。
2. **§6.1 的 5 篇博客的目标语言?** v2.0 §9.2 曾定「不做中文博客」(客户全海外),是否维持?
   > **2026-10-21 更新**:建议维持(只做英文)。**但形态待定** —— 独立文章 vs 升级既有 prose(P153 §7.2),且建议等 AdSense 批准后再动。
3. **§6.3 的 User Value Score 五维评分,谁来打分?** 人工 / LLM / 混合 —— 这决定 CI guard 的形态。
   > **2026-10-21 更新**:推荐 **LLM 批量 + 人工抽样复核 20 个**(P153 §4.3)。**且先要定公式** —— §15.2 按字面恒拒(P153 §7.1)。
4. **§6.5 的 `feat/i18n-drift-fix`(+16 commits)是搁置还是遗漏?**
   > **2026-10-21 已查明**:已被 squash 合入 master,真缺的只有 2 个测试文件 → 补测试后删分支(P153 §8.6)。
5. ~~**`docs/superpowers/specs/INDEX.md` 是否新增 P152 行 + 计数?**~~ —— **已按 INDEX 维护约定自动同步(2026-10-21)**,无需拍板:P152 归入 §7,连带补录 25 个此前漏登的 spec,总数 55 → 81。详见 §11。
6. **【新】P153 提案**:G1(激活两个休眠守卫)+ G2(User Value Score + CI guard)+ E1/E2(修 `tests/run.mjs` Windows 限制、补 3 处测试 ENOENT)—— 是否批准执行?分支按 §12.1 用 `feature/phase-3-playbook-6-fields`?
7. **【新】User Value Score 公式**:算术平均(推荐)还是几何平均?**改的是 p140f §15.2 原文,需明确点头。**
8. **【新】静态 137 模型 vs 交互 18 模型** —— 要不要统一?(统一则长尾模型名的 SEO 关键词面会缩)

---

## 11. 维护约定

按 `docs/superpowers/specs/INDEX.md` §「维护约定」:

- 新 spec 落盘后必须在本 INDEX 同步加一行 + 更新类别计数
- 本 spec 归入 §7「P140+ — AdSense Compliance + 2.0」分类
- INDEX 是 navigator,**不**追踪 ship status;P152 的执行状态由 `memory/p152-*-shipped.md` 负责

**INDEX 同步实测(2026-10-21):**

| 项 | 同步前 | 同步后 |
|---|---|---|
| spec 目录实际文件数 | 81(含本 spec) | 81 |
| INDEX 声明总数 | 55(漏 26 个) | 81 |
| §7 行数 / 计数格 | 4 行 / 计数格错记为 3 | 17 行 / 17 |
| §6 行数 / 计数格 | 15 行 / 15 | 25 行 / 25 |
| plans 计数(头部注释) | 52(实际 106) | 106 |
| 漏登 spec | 26 个(2026-07-19 ~ 2026-10-21) | 0 |

漏登的 26 个按内容归入既有分类:**9 个进 §6**(P42 / P48-P53 / header-mutex / tier2-r7)+ **1 个进 §6**(P149 last-modified,SEO)+ **13 个进 §7**(P140 / P140f×4 / P140g / P147 / Phase-5 / P150×2 / P151×3 / P152)+ **3 个新建 §8**「Retro — 流程复盘」。

**未改动任何既有 spec 行的标题 / 日期 / 状态值**;仅修正了 §7 计数格(3 → 实际值)与 §7 内 p140f 行的日期升序位置(2026-08-05 移到 08-18 之前)。

---

## 12. References

### 路线图本体

- `docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` —— P140f v2.0 Evolution Strategy(APPROVED Path C,891 行)
- `AGENTS.md` L108-125 —— Project Constitution (v2.0 灵魂三维度)
- `docs/superpowers/specs/2026-08-26-phase-5-v2.5-enterprise-design.md` —— Phase 5-A
- `docs/superpowers/specs/2026-10-21-p153-user-value-score-and-guard-activation-design.md` —— **本 spec 的更正文档**(Phase 3 实测 + User Value Score 公式 + 守卫激活 + Phase 2 真实成本)

### 审计用到的项目产物

- `docs/superpowers/adrs/0000-template.md` + `0001~0005` —— Phase 1 KB4 ADR 模板 + 5 个决策 ADR
- `src/engines/**/*.ts` —— 100 个 engine(L5 覆盖率 / Playbook 6 字段扫描源)
- `src/data/topics.ts`(49)+ `src/data/topic-content.ts`(94)—— Phase 4 主题层
- `src/data/ai-pricing.json` —— 8 个 B 类别引擎的价格源(**`lastUpdated` 已于 2026-10-21 更新至 2026-10-21**)
- `scripts/` —— 24 个 codegen/check 脚本(AI 自动扩展机制缺失证据)
- `memory/p151-dimension-1-audit-report.md` —— 19/100 的历史基线(2026-09-02)
- `tests/playbook-6-fields-coverage-guard.test.ts` + `tests/decision-layer-coverage-guard.test.ts` —— **Phase 3 的两个既有守卫(P153 §2.1 证实其存在但休眠)**
- `src/content/tools/*.md` —— prose 层(100 en / 41,309 词,实测)—— Phase 2 低成本替代方案的载体

### 外部

- Codifly《AI API prices in October 2026》(codifly.co,2026-10)—— 维度 3 AI 模型信号
- wifitalents.com《Calculator Software: Top Picks (2026)》—— 维度 3 竞品信号

### Git 状态(审计时)

- `master` HEAD = `d22735c`,`origin` / `github` 均 `0 ahead / 0 behind`
- `feat/ai-cost-preset-chip-unification`(+11)、`feat/i18n-drift-fix`(+16)未合入 master
