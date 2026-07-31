# P140 — AdSense 「Low-Value Content」整改设计

| 字段       | 值                                                                  |
| ---------- | ------------------------------------------------------------------- |
| Date       | 2026-07-31                                                          |
| Status     | Approved (brainstorm ✓ 2026-07-31)                                  |
| Lead       | TBD (project owner assigns when entering writing-plans)             |
| Re-submit  | AdSense 重审提交前由人工触发（站外）                               |
| Stack      | Astro 4.16.19 + TypeScript 5.6 + Tailwind 4                         |
| 语言       | en + zh 双语同步                                                    |
| PR 拆解    | P140a (AdSense 骨架 + 内容 schema) → P140b (100×2 prose + FAQ + E-E-A-T) → P140c (about/contact + reviewer 模型) → P140d (CI 守卫 + 文档同步) |

## 1. 背景与触发

`forgeflowkit.com` Google AdSense 复核被驳回，标记 **「低价值内容」（Low-Value Content）** + **「您的网站尚未准备好展示广告」**。参考资源指向 *Minimum content requirements / Webmaster Quality Guidelines*。

自查发现一个直接红旗：**`src/components/AdUnit.astro`** 是字面虚线占位框，渲染「AdSense — tool result / home-hero / ...」文字标签，**全站没有任何 `<ins class="adsbygoogle">` 标签在请求真实广告单元**。BaseLayout 中 `<script async src="...pagead2.googlesyndication.com/...adsbygoogle.js?client=ca-pub-3420554170441272" crossorigin="anonymous"></script>` 已加载（Auto Ads 入口脚本），但因缺 ins 元素，AdSense 没有真实 ad 请求。同时站点 `about` / `contact` / `privacy-policy` / `terms` 内容深度偏薄，100 计算器页面虽有交互，但 prose 段落极少（h1 + 1-line description + form + result + 5 条 FAQ）。

整改目标：删占位 AdUnit + 改用 Google Auto Ads；为 100 个计算器页面扩充 Methodology panel 级别 prose；站点信任页（about/contact/privacy/terms）深化；加固 E-E-A-T 信号（author / reviewer / sources）；新增 4 个 CI 守卫确保整改不回流。

## 2. 设计决策（已确认）

| #  | 决策                                                                           | 取舍理由                                                   |
| -- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| D1 | **整改深度：选项 B 修订版**（intro + methodology + FAQ 12+，无 Common Mistake） | 兼顾 AdSense 复核与持续维护成本                            |
| D2 | **en + zh 双语同步**                                                           | 项目是两语架构，128×2 = 256 i18n key 余量可承担             |
| D3 | **prose 文本存 `src/content/tools/<slug>.{lang}.md`（Content Collections）**    | 段落级文档，非键值对属性                                   |
| D4 | **i18n 键继续承担结构性文本**（按钮、面包屑等）                                | 不动 `src/i18n/translations.ts` schema                      |
| D5 | **删 `src/components/AdUnit.astro`，改用 Google Auto Ads**                      | 占位文字本身是误导，删除最干净                             |
| D6 | **PR 拆解：P140a → b → c → d**（4 个小 PR，机械/集成混编）                      | 每 PR 可独立验证、回滚                                     |
| D7 | **新增 4 个 CI 守卫**                                                          | 防御回流（CLAUDE.md 表 41 → 53）                           |
| D8 | **保留 `ca-pub-3420554170441272`** 不动                                         | 16 位合法格式，疑为真实 ID（用户在 AdSense 控制台确认）    |
| D9 | **Auto Ads 控制台开启 = 站外动作**，文档化为 manual step                        | 代码库不能动 AdSense 后台                                  |

## 3. 内容模型（§ 1）

### 文件布局

```
src/content/tools/<slug>.md               ← en prose + frontmatter (mandatory)
src/content/tools/<slug>.zh.md            ← zh prose (mandatory, build-fail if absent when batch reaches P140d)

src/content/config.ts                     ← Astro Content Collections schema + zod 校验
```

### frontmatter schema（zod）

```ts
import { defineCollection, z } from 'astro:content';

const tools = defineCollection({
  type: 'content',
  schema: z.object({
    slug: z.string().regex(/^solopreneur-[a-z0-9-]+$/),
    engine_ref: z.string().regex(/^solopreneur-[a-z0-9-]+$/),
    category_id: z.enum(['A','B','C','D','E','F','H','K','L','M','O','P','R','S','T']),
    reviewed_by: z.array(z.string()),                 // → reviewers[].id
    author: z.string(),                               // → reviewers[].id (default 'wlz')
    data_reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).min(1),
  }),
});

export const collections = { tools };
```

### Markdown 正文必含 4 H2（顺序硬约束）

```
## What This Calculator Measures        — 3-5 句，扣业务问题
## How It Works (Methodology)           — 公式 + 变量 + 假设
## Limitations & When Not To Use        — 2-3 句负面空间
## Worked Example                       — 4-6 步具体场景走读
```

正文字数阈值（CI 守卫）：
- en：每 H2 ≥ 80 chars，全文 ≥ 400 chars
- zh：每 H2 ≥ 50 chars，全文 ≥ 250 chars

### zh fallback 策略

`getEntry('tools', slug + (lang === 'zh' ? '.zh' : ''))` 失败时 fallback 到 en 版本；P140b ship 时**只警告不报错**（en 优先、zh 渐进补齐）；P140d ship 时**强制 zh 缺位 = build fail**。

## 4. Calculator 页面 4 段 panel 模板（§ 2）

### 新组件

| 组件                                | 职责                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/components/CalculatorProse.astro` | 接收 Content Collection entry，渲染 4 H2 Markdown Content；样式按段位差异化（intro=紫 / methodology=素 / limitations=琥珀 / example=绿） |
| `src/components/MethodologyPanel.astro` | 占位（暂未启用 — Methodology 内容已经在 CalculatorProse.md 内 H2 段，避免组件化造成 prose 切分）                       |
| `src/components/AuthorsList.astro`  | `/about/authors.astro` 用，列出 `reviewers[]` + 头像 + role + expertise                                              |

### `[slug].astro` 渲染拓扑

```
┌──────────────────────────────────────────────────────────┐
│ 🧮 <h1> + toolDescription (1 行)                         │
├──────────────────────────────────────────────────────────┤
│ 📌 <CalculatorProse section="intro" />                   │ ←─ 新插入，What This Measures
├──────────────────────────────────────────────────────────┤
│ [Calculator Form]                                       │
│   ...inputs...                                           │
│   [Calculate]                                            │
├──────────────────────────────────────────────────────────┤
│ [Result Cards v3]                                        │
│   🩺 Health / 📊 Inputs / 🔄 What-If / ⚖️ Breakeven       │
├──────────────────────────────────────────────────────────┤
│ ⚙️ <CalculatorProse section="methodology" />             │ ←─ 新插入，How It Works
├──────────────────────────────────────────────────────────┤
│ ⚠️ <CalculatorProse section="limitations" />             │ ←─ 新插入，Limitations
├──────────────────────────────────────────────────────────┤
│ 📋 <CalculatorProse section="example" />                 │ ←─ 新插入，Worked Example
├──────────────────────────────────────────────────────────┤
│ 💬 <FAQ items={engine.faq} /> （12+ items，P140b 加密）  │
├──────────────────────────────────────────────────────────┤
│ 📎 <RelatedTools /> / <RelatedBlog />                    │
│ ✓ <EeatTrustBlock upgraded />                           │
└──────────────────────────────────────────────────────────┘
```

`<AdUnit slot="tool-result" />` 删（§ 4）。

### FAQ 加密（`engine.faq` schema 不变，仅扩 items）

每个 engine 文件现含 FAQ 3-5 条（codegen 产出 + 手工调整）。P140b 加 T5 任务：人工 + AI-draft review，每 engine 加 7-8 条新 FAQ，目标 12+。`FAQ.astro` 组件保持 schema 不变（`{q: string; a: string}[]`），仅由 `[slug].astro` 喂入更长数组。

100 × 12 = 1200 条 FAQ × 2 语 = 2400 条 i18n key 增量。其中 ~700 条新（其余 codegen 已存）。

## 5. Author / Reviewer 数据模型（§ 3）

### 新文件 `src/data/reviewers.ts`

```ts
export interface Reviewer {
  id: string;          // 'wlz' (founder)
  name: string;        // 公开姓名（可笔名）
  role: 'founder' | 'analyst' | 'expert' | 'engineer';
  bio: { en: string; zh: string };
  expertise: string[];
  linkedin?: string;
  twitter?: string;
  website?: string;
}

export const reviewers: Reviewer[] = [
  {
    id: 'wlz',
    name: 'ForgeFlowKit Editorial',
    role: 'founder',
    bio: { en: '...', zh: '...' },  // 60-100 字/语
    expertise: ['SaaS metrics', 'pricing', 'unit economics', 'financial modeling'],
    linkedin: 'https://www.linkedin.com/in/wlz-calc/',
  },
  // + 2-3 analyst / expert reviewer
];
```

### 升级 `src/data/tools.ts`

每个 `ToolMeta`：
```ts
author_id: string;             // → reviewers[].id (default 'wlz')
reviewers: string[];           // → reviewers[].id[]
data_reviewed_at: string;      // YYYY-MM-DD  (覆盖旧的同名字段)
sources: { name: string; url: string }[];  // 旧的 string[] 改 object[]
```

migration 路径：保留旧字段 `reviewedBy: string` 与 `author: string` 直到 P140d ship，P140d 同步删 deprecated 字段。

### `EeatTrustBlock.astro` 升级（P140b T6）

```astro
<aside class="mt-12 p-6 ...">
  <!-- Author 卡：头像 + 名字 + role + bio 第一句 -->
  <AuthorCard reviewerId={author} />
  <!-- Reviewer 列表：最多 2 个，每个 role + expertise tags -->
  <ReviewerList reviewerIds={reviewers} />
  <!-- Sources 列表：每条 name + url（rel=noopener, target=_blank）-->
  <SourcesList sources={sources} />
  <!-- Last reviewed: 相对时间 + 绝对日期 -->
  <p>Last reviewed: {relativeTime} ({data_reviewed_at})</p>
  <!-- Suggest improvement 邮件链接（保留） -->
</aside>
```

### `seo-factory.ts` 升级（P140b T7）

`createSoftwareApplication` 新增字段：
```ts
author: { '@type': 'Person', name: string, url?: string }
review: { '@type': 'Review', author: { '@type': 'Person', name: string } }[]
```

注入到 schema.org SoftwareApplication JSON-LD。Google 偏好结构化作者信号。

## 6. 站点信任页加深（§ 3）

| 页                  | 目标深度 (en)             | 目标深度 (zh)             |
| ------------------- | ------------------------- | ------------------------- |
| `/about/`           | 6 段 × 200-250 字（共 ~5500 chars / ~750 words） | 6 段 × 80-150 字（共 ~3300 chars） |
| `/about/authors/`   | 新页（列出 reviewers）    | 同 en                     |
| `/privacy-policy/`  | 当前已合规，保留          | 同 en                     |
| `/terms/`           | 当前已合规，保留          | 同 en                     |
| `/contact/`         | 加 form schema + 真实邮箱 + 响应时长承诺 | 同 en |

### `/about/` 6 段结构

1. Our Mission（保留）
2. Where Our Data Comes From（保留 + 扩）
3. How Often We Update（保留）
4. Editorial Standards（**新增**：reviewer cross-check、data sourcing、update cadence 流程）
5. Our Reviewers（**新增**：列 reviewers[] + role + expertise）
6. Roadmap / Contact（保留）

## 7. AdSense 基础设施清理（§ 4）

### 改动清单

```
删  src/components/AdUnit.astro
改  src/pages/[lang]/[slug].astro       ← 移除 <AdUnit slot="tool-result" />
改  src/pages/[lang]/index.astro        ← 移除 <AdUnit slot="home-*"/>
改  src/pages/[lang]/blog/[slug].astro  ← 移除 <AdUnit slot="blog-*"/>
改  src/components/INDEX.md             ← 删 AdUnit 行
留  src/layouts/BaseLayout.astro        ← 保留 adsbygoogle.js Auto Ads 入口脚本
保  src/i18n/translations.ts            ← 保留所有 adsense.* i18n 键（暂留，将来删）
```

### Auto Ads 启用方式

- AdSense 控制台 → Ads → Auto ads → Toggle ON
- 无须代码改动，BaseLayout 中的 `<script async src="...pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3420554170441272" crossorigin="anonymous">` 即可激活
- 站点级 manual step，文档化为 "P140 ship checklist"

## 8. CI 守卫（§ 5）

### 新增 4 个守卫

| Suite                                               | 类型       | 检查点                                                                                   |
| --------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `tests/content-prose-shape-guard.test.ts`           | build-dep  | `src/content/tools/*.md` frontmatter + 4 H2 + 词数阈值                                   |
| `tests/calc-page-content-depth-guard.test.ts`       | build-dep  | `dist/{en|zh}/[slug]/index.html` 含 prose/methodology 容器 + FAQ ≥ 8                      |
| `tests/no-adsense-placeholder-guard.test.ts`       | source-only | grep 确认无 `<AdUnit` 字面 import + `src/components/AdUnit.astro` 不存在                 |
| `tests/about-page-depth-guard.test.ts`              | source-only | `translations.ts` 中 `about.*.body` 各 key en ≥ 200 chars、zh ≥ 80 chars                  |

### CLAUDE.md Defense-in-Depth 表更新

- `41 build-dep suites + 8 source-only = 49` → `42 build-dep + 10 source-only = 52` (+3 来源 P140)
- 维度：现有 7 维度 + **新 AdSense Compliance 维度**（含 placeholder 守卫 + depth 守卫）
- 章节同步更新表（参考 P110 / P138 已有的表 layout）

## 9. P-series 任务拆解（§ 6）

### P140a — AdSense 骨架 + 内容 schema（5 commits 范围）

| 任务 | 类型         | 说明                                                                                       |
| ---- | ------------ | ------------------------------------------------------------------------------------------ |
| T1   | MECHANICAL   | 删 `src/components/AdUnit.astro` + 清理所有 `<AdUnit>` import                              |
| T2   | MECHANICAL   | `BaseLayout.astro`：保留 adsbygoogle.js 入口脚本，注释更新说明 Auto Ads 策略                |
| T3   | INTEGRATION  | 新建 `src/content/config.ts`：defineCollection + zod frontmatter schema                    |
| T4   | INTEGRATION  | 新建 `src/content/tools/` 目录骨架（README + 1 个示例 md，例如 MRR）                       |
| T5   | MECHANICAL   | 新建 `src/components/CalculatorProse.astro`（4 H2 渲染器）                                  |
| T6   | MECHANICAL   | 新建 `tests/no-adsense-placeholder-guard.test.ts`（source-only）                            |
| T7   | MECHANICAL   | 新建 `tests/content-prose-shape-guard.test.ts`（build-dep）                                 |

SHIP 前：`pnpm check` 过；`dist/` 仍为 314 pages（AdUnit 删了但占位空间被 prose 抵消，体积不变）。

### P140b — 核心内容填实：prose + FAQ + E-E-A-T（30-50 commits）

| 任务 | 类型         | 说明                                                                                       |
| ---- | ------------ | ------------------------------------------------------------------------------------------ |
| T1   | MECHANICAL   | MRR demo md 转正式（删除 P140a 占位注释）                                                  |
| T2   | MECHANICAL   | 100 engines × 2 langs = 200 md 文件批量写入（人工 + AI-draft 走查）                         |
| T3   | INTEGRATION  | `src/data/tools.ts` 升级：`author_id` / `reviewers[]` / `sources[]` 字段                    |
| T4   | INTEGRATION  | `[slug].astro`：`getEntry('tools', ...)` 注入 `CalculatorProse`                             |
| T5   | INTEGRATION  | `FAQ.astro` + 每 engine.faq：扩密到 12 条（人工加 7-8 条/引擎）                             |
| T6   | INTEGRATION  | `EeatTrustBlock.astro` 升级：作者头 + Reviewer 卡 + Sources 列表                            |
| T7   | INTEGRATION  | `seo-factory.ts`：`createSoftwareApplication` 加 `author` + `review` 结构化                 |
| T8   | MECHANICAL   | 收紧 `content-prose-shape-guard.test.ts` 阈值（en ≥ 400 chars、zh ≥ 250 chars 含 4 H2）   |

SHIP 前：`pnpm check + dist build` 双过；FAQ 总数 100×2×12 = 2400 条；200 md 文件全部到位（zh 渐进，缺位仅警告）。

### P140c — 站点信任页 + Reviewer 模型（8-10 commits）

| 任务 | 类型         | 说明                                                                                       |
| ---- | ------------ | ------------------------------------------------------------------------------------------ |
| T1   | MECHANICAL   | 新建 `src/data/reviewers.ts`（3-4 Reviewer：founder + 2 analyst + 1 engineer）              |
| T2   | MECHANICAL   | 新建 `src/pages/[lang]/about/authors.astro`                                                |
| T3   | INTEGRATION  | `about.astro` 深化：6 段各扩到 200-250 字 en / 80-150 字 zh                                 |
| T4   | INTEGRATION  | `contact.astro`：form schema + 邮箱响应时长 + schema.org Person                            |
| T5   | INTEGRATION  | `i18n translations.ts`：about 段扩充 + 新加 contact / authors i18n key                      |
| T6   | MECHANICAL   | 新建 `tests/about-page-depth-guard.test.ts`（source-only）                                  |

### P140d — Defense-in-Depth + Auto Ads 启用手顺（5-8 commits）

| 任务 | 类型         | 说明                                                                                       |
| ---- | ------------ | ------------------------------------------------------------------------------------------ |
| T1   | MECHANICAL   | 新建 `tests/calc-page-content-depth-guard.test.ts`（build-dep，walk 200 html）              |
| T2   | MECHANICAL   | `CHANGELOG.md` 加 M23.3 段（AdSense 重提审）                                                |
| T3   | MECHANICAL   | `CLAUDE.md` defense-in-depth 表 41→52；维度 7→8（+ Adsense Compliance）                     |
| T4   | MECHANICAL   | `MEMORY.md` 加 `p140a` / `p140b` / `p140c` / `p140d` ship memory 链                          |
| T5   | INTEGRATION  | doc drift guard：4 个 memory file 不能携带模糊 DEFER UNTIL 词                              |
| T6   | INTEGRATION  | pre-push：dist 里 0 个 `<ins class=adsbygoogle>` + 0 个 `<AdUnit` 占位                       |
| T7   | MANUAL       | 站点控制台开 Auto Ads（站外手顺）+ AdSense 重提交（站外手顺）                              |
| T8   | MECHANICAL   | 强制 zh 缺位 build fail（升级 `content-prose-shape-guard` 的 zh 行为）                      |

### 总体顺序

```
P140a (脚手架)
  ↓
P140b (内容填实，100×2 prose，最大批)
  ↓
P140c (站点信任页深耕)
  ↓
P140d (CI 守卫 + 文档同步 + Auto Ads 站外 manual step + AdSense 提交)
```

每个 PR 之间 `pnpm check` 双过 + dist build 314 pages 不动（保证每步可回滚）。

### 中段 holistic cross-cutting review

CLAUDE.md:Pre-merge 规则触发条件 — 多任务跨 5+ 文件相似 pattern 改动。本批 P140b T2（100 md 文件）符合，**P140b ship 前**跑一次 holistic review（验证 100 md 文件 frontmatter 一致性 / 4 H2 顺序 / sources 链接合法性 / 没有重复句子）。其他 3 个 PR 体量小，per-task review 足够。

## 10. 验证 / 重审清单（§ 7）

### Pre-resubmit 验证（AdSense 提交前）

| 检查项                                       | 方法                                                          | 期望                                               |
| -------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `dist/*` 0 个 `<AdUnit` 字面                 | `grep -rn '<AdUnit' dist/`                                   | 0 hits                                             |
| `dist/*` 0 个字面「AdSense — placeholder」框  | `grep -rE 'AdSense — ' dist/`                                | 0 hits                                             |
| 200 calc 页都有 4 H2 prose 段                | `calc-page-content-depth-guard`                              | pass                                               |
| FAQ ≥ 8 / calc 页                            | `calc-page-content-depth-guard`                              | pass                                               |
| 100 prose 文件都有合法 frontmatter           | `content-prose-shape-guard`                                   | pass                                               |
| 真人 prose 抽样检查                          | 人眼抽 5 个工具（建议 8 个 AI 工具 + 1 个高频 SaaS）         | 段位自然、无拼写错误、source 链接能打开             |
| `/about/` 现在 6 段达标                       | `about-page-depth-guard`                                     | pass                                               |
| `og:type=tool` 每页 has author + review schema | grep dist 里 JSON-LD `author` + `review` 字段              | pass                                               |
| Auto Ads 控制台开启                          | manual step in `docs/deploys/p140d-autoads-checklist.md`     | toggle ON                                          |
| AdSense 重审提交                             | manual step in 同上 checklist                                | submitted                                          |

### Re-submit 失败回退表

| 复核结果                 | 应对                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| 内容仍然不足             | prose 扩写、About 加深、Sources 质量                                       |
| Ads 疑似占位             | 已走 Auto Ads（无占位痕迹），概率近 0                                     |
| E-E-A-T 仍不足          | 工具页面头部加明显 「Reviewed by ...」区块，提升 tools.ts 中 reviewers 可见性 |
| 仍然误判                | 14 天后再次提交（AdSense 限制），并附申诉说明                              |

## 11. 风险与未决

| 风险                                                | 应对                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Auto Ads 启用后页面布局抖动（脚本插入段落间）       | CSS 已用 `prose prose-sm` 提供段落间距，不冲突；新组件 CalculatorProse 已有显式 margin |
| ca-pub-3420554170441272 不是真实 ID                 | 人工确认步骤；非真实则阻塞 P140d T7                                                  |
| 100×2 prose 写作耗时过长                           | 允许 AI-draft → 人工 review + 编辑模式；2 周内完成                                    |
| zh 翻译质量不如 en                                 | zh fallback 渐进策略；P140b 时只警告不强制；P140d 时强制                              |
| Reviewer Persona 现实性（linkedin 等）              | 至少 founder 'wlz' 公开 profile 要真实；其余 reviewer 可用团队 / 顾问                 |
| 4 个 sub-PR 互相冲突                                | 每个 PR 之间 `pnpm check` 双过 + dist build；holistic review in P140b ship 前        |
| Auto Ads 不慎开太多 / 太密导致布局差               | 控制台有 density 调节，文档化校准步骤                                                |

## 12. 不在范围（out of scope）

- 重写 `BaseLayout.astro` 脚本外的 SEO/head（hreflang / og / canonical 等已合规）
- 新增 marketplace / shop / paid tier 功能
- 重构 `src/engines/` 自注册机制
- 全站 SSR（继续 static）
- 跨语言深度模型（en ↔ zh 翻译对照系统）
- 视频/YouTube 嵌入（虽然 P-series 多次提及是 youtube-tools）

## 13. 文档同步

| 文档                                        | 同步点                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `docs/superpowers/specs/2026-07-31-adsense-...design.md`（本文） | 已 commit                                                                                       |
| `docs/superpowers/plans/2026-07-31-p140a-...md` | 由 writing-plans 产出，P140a sub-PR ship 时 commit                                                |
| `docs/superpowers/plans/2026-07-31-p140b-...md` | 同上                                                                                            |
| `docs/superpowers/plans/2026-07-31-p140c-...md` | 同上                                                                                            |
| `docs/superpowers/plans/2026-07-31-p140d-...md` | 同上                                                                                            |
| `CHANGELOG.md`                              | M23.3 — AdSense compliance pass（由 P140d T2 写入）                                              |
| `CLAUDE.md`                                 | Defense-in-depth 表 41→52 + 新 AdSense Compliance 维度（由 P140d T3 写入）                     |
| `MEMORY.md`                                 | 4 条 ship memory（p140a-d），由 P140d T4 链入                                                      |
| `memory/p140*.md`                           | 各 sub-PR ship 后新增                                                                            |
| `docs/deploys/p140d-autoads-checklist.md`   | P140d MANUAL step 文档                                                                          |

## 14. 开放问题 / 后续 batch 候选

- Reviewer 名单最终 3-4 人需用户确认（P140c T1 前）
- `ca-pub-3420554170441272` 是否真实 ID 需用户确认（P140a T2 前）
- Auto Ads 上线后真实 CTR / 视图监控策略（Q3 2026 候补）

---

END.
