# SEO Overhaul — Schema 全套 + 自动化 og:image

**Date:** 2026-06-25
**Status:** Approved (brainstorming complete)
**Scope:** ForgeFlowKit 全站 32 计算器 × 2 语言 + 静态页 + 站点级
**Out of scope:** 外链建设、页面速度优化、AI 爬虫屏蔽、IndexNow
**Scope note:** 博客实装 — page rendering 已存在（`src/pages/[lang]/blog/`）；本次仅扩 Article + Blog schema（user-confirmed in pre-flight 2026-06-25）
**Bonus:** 顺手把 og:type 从 `website` 改按页类型分（product/article/website）

## 1. Problem

ForgeFlowKit 当前 SEO 基础设施处于"半搭好"状态。摸底后实际缺口：

| 现状 | 真实情况 | 影响 |
|---|---|---|
| ❌ "32 计算器缺 SoftwareApplication schema" | **已实现**（`[slug].astro:95-100`） | — |
| ❌ "engine FAQ 没渲染 FAQPage" | **已实现**（`[slug].astro:87-93`） | — |
| ❌ "缺 BreadcrumbList" | **已实现**（`[slug].astro:101-107`） | — |
| ✅ "og:type 硬编码 website" | **是真缺口** | 社交卡片权重低 |
| ✅ "og:image 复用默认图" | **是真缺口**，且 `public/` 根本无任何图 | 社交分享千篇一律，CTR 低 |
| ✅ "缺 WebSite + SearchAction" | **是真缺口**（仅页面级 schema） | sitelinks searchbox 拿不到 |

**额外发现的隐性缺口**：
- 静态页（about/contact/privacy/terms）**零 schema**
- 首页（`[lang]/index.astro`）**零 schema**，32 个工具的 ItemList 也没结构化
- sitemap 全站统一 `priority: 0.7` `changefreq: weekly`，没按页面类型分级
- `applicationCategory: 'Multimedia'` 对所有 32 个计算器硬编码——SaaS/Finance 类其实更精准

**为什么现在做**：ForgeFlowKit 刚完成一批清理性 commit（`0efdf6c` 删 25 个 stale plan，`a07bea9`/`1e99bc6`/`ddd23a1` customFn 健壮性，`f7b014d` PR 归档），代码处于干净态。SEO 是直接驱动搜索流量的杠杆——在业务冷启动窗口期每晚一周就少一周爬升。

## 2. Goals

1. **站点级 schema 注入**：所有页面获得 `WebSite` + `SearchAction`（独立于页面 schema），首页额外获得 `Organization`
2. **SoftwareApplication schema 精细化**：32 计算器的 `applicationCategory` 按 6 个分类精确映射，加 `offers`、`featureList`、`isAccessibleForFree`、`provider`
3. **静态页 schema 完整化**：about/contact/privacy/terms 各自获得 `AboutPage`/`ContactPage`/`WebPage` schema
4. **首页 ItemList 结构化**：32 个工具作为 `ItemList` 列出，让搜索引擎抓取工具清单
5. **og:type 按页类型分**：工具页 = `product`，博客 = `article`，其他 = `website`
6. **sitemap 分级策略**：首页 priority=1.0，工具页=0.9，博客=0.7，静态页=0.5
7. **64 张 og:image 自动生成**：32 工具 × 2 语言，模板化设计 + 真实示例数据
8. **零引擎业务逻辑改动**：`calculate()` / `customFn` / `staticExamples` 完全不动
9. **两阶段独立 ship**：Phase 1（schema）和 Phase 2（og:image）解耦，任一阶段出问题不影响另一阶段

## 1.1 Pre-flight drift (2026-06-25)

During plan writing, pre-flight discovered:
- `src/pages/[lang]/blog/[slug].astro` and `src/pages/[lang]/blog/index.astro` already exist (53-line BlogPost generator in `src/data/blog-posts.ts`).
- Design doc said "blog doesn't exist" — incorrect.

User confirmed (via AskUserQuestion): expand scope to include Article + Blog schema for blog pages.

Implications:
- Plan A grew from "32 tool pages + 8 static + 2 home" to include "64 blog pages + 2 blog index".
- Plan B unchanged (blogs reuse tool og:image — 1:1 mapping via `blog-posts.ts: tools.map(...)`).
- Total pages now: 141 (vs design's original 138 estimate).

## 3. Non-Goals

- **博客实装**：page rendering 已存在（`src/pages/[lang]/blog/`）；本次仅扩 Article + Blog schema（user-confirmed in pre-flight 2026-06-25）
- **外链建设 / 内容营销**：off-page SEO，非代码改造
- **页面速度优化**：Astro 静态 + Tailwind + Plausible（轻量），Core Web Vitals 已合格
- **AI 爬虫屏蔽**：当前流量阶段，开放反而可能有引用收益
- **IndexNow / Bing Webmaster**：Bing 在 ForgeFlowKit 流量占比小，post-MVP 再做
- **AMP / PWA**：边际收益过低
- **Hreflang 扩展**：en/zh/x-default 已正确
- **分类重新平衡**：6 个分类语义清晰，重组破坏 URL + 内部链接
- **重写 schema 块**：原 `[slug].astro:83-109` 的 FAQPage + SoftwareApplication + BreadcrumbList 块**保留**，本次只**扩展**

## 4. Design

### 4.1 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                       ForgeFlowKit SEO 层                         │
│                                                                  │
│  src/layouts/BaseLayout.astro  ◄── 全站 meta/og/schema 注入点    │
│         │                          (接受 pageType + schema prop) │
│         │                                                       │
│         ├──► site-level schema: WebSite + SearchAction          │
│         ├──► (home only): Organization                          │
│         ├──► og:type 按 pageType 分                             │
│         └──► 接受 schema prop 透传到 <script type="ld+json">     │
│                                                                  │
│  src/pages/[lang]/[slug].astro  ◄── 工具页（现有，扩展）          │
│       └──► pageType='tool', ogImage='/og/<slug>-<lang>.png'     │
│                                                                  │
│  src/pages/[lang]/{index,about,contact,privacy,terms}.astro     │
│       └──► 新增 schema 注入                                     │
│                                                                  │
│  astro.config.mjs  ◄── sitemap 分级策略                          │
│                                                                  │
│  scripts/build-og-images.mjs  ◄── Phase 2: 64 张图生成           │
│       └──► satori (JSX→SVG) + @resvg/resvg-js (SVG→PNG)         │
│                                                                  │
│  data/og-samples.json  ◄── 32 个工具的硬编码默认输入              │
│                                                                  │
│  public/og/  ◄── 生成产物 (git-ignored, build 时生成)             │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 关键决策表

| 决策 | 选择 | 备选 | 理由 |
|---|---|---|---|
| og:image 存储位置 | `public/og/` | `src/assets/` (Astro Image) | 纯静态服务，无需 Image 处理 |
| og:image 是否入 git | **不入** (`.gitignore`) | 入 git | 64 张 PNG ≈ 几 MB；build 时按需生成；版本差异无意义 |
| Schema 构造位置 | 维持现状（页面级构造 → `@graph` → BaseLayout 透传） | 全部集中 BaseLayout | 已工作良好；不重构 |
| 站点级 schema 位置 | `BaseLayout.astro` 内部构造 | 页面层重复 | 唯一来源，避免漏写 |
| `applicationCategory` 数据归属 | **`ToolMeta`（`tools.ts`）** | `ToolEngine`（`engines/*.ts`） | schema 字段是页面消费元数据；engines 是业务逻辑 |
| og:image 生成器栈 | satori + @resvg/resvg-js | puppeteer / playwright | 不需 Chromium；纯 Node；构建快 |
| 字体策略 | Inter (Latin) + Noto Sans SC (CJK) | 仅 Inter / 思源黑体 | 5MB；覆盖中英文；satori 必需字体文件 |
| 字体文件管理 | 提交到 git (`scripts/fonts/`) | 每次构建下载 | CI 不需网络；build 可复现 |
| 工具示例数据 | 硬编码 JSON (`og-samples.json`) | 调 `engine.calculate()` | 一致性、可控、零引擎改动风险 |
| 阶段切分 | Phase 1 (schema) + Phase 2 (og:image) | 一锅端 | 独立 ship、独立回滚、独立 review |

### 4.3 Phase 1 — Schema & Sitemap

#### 4.3.1 `ToolMeta` 数据模型扩展（`src/data/tools.ts`）

```ts
export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;       // A/B/C/D/E/F
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
  applicationCategory: string;   // 新增 — 见 4.3.2 映射表
  offers: {
    price: '0';
    priceCurrency: 'USD';
    availability: 'https://schema.org/InStock';
  };                            // 新增 — 全部工具免费
  featureList?: string[];       // 新增 — 取自 howToUse 前 3 条
}
```

#### 4.3.2 `applicationCategory` 分类映射

| categoryId | 分类名 | applicationCategory | schema.org 类型 |
|---|---|---|---|
| A | SaaS Metrics | `BusinessApplication` | 通用业务 |
| B | AI Cost Tools | `DeveloperApplication` | AI/开发向 |
| C | Valuation & Exit | `FinanceApplication` | 估值/财务 |
| D | Freelance Pricing | `BusinessApplication` | 自由职业/财务 |
| E | Cost & Efficiency | `BusinessApplication` | 通用业务 |
| F | Investment & ROI | `FinanceApplication` | 投资回报 |

**实现**：新建 `src/data/application-categories.ts`：

```ts
export const CATEGORY_TO_APPLICATION: Record<string, string> = {
  A: 'BusinessApplication',
  B: 'DeveloperApplication',
  C: 'FinanceApplication',
  D: 'BusinessApplication',
  E: 'BusinessApplication',
  F: 'FinanceApplication',
};

export function categoryIdToApplicationCategory(id: string): string {
  return CATEGORY_TO_APPLICATION[id] || 'BusinessApplication';
}
```

#### 4.3.3 站点级 schema（注入到 `BaseLayout.astro`）

所有页面都注入（首页额外加 `Organization`）：

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://forgeflowkit.com/#website",
      "url": "https://forgeflowkit.com",
      "name": "ForgeFlowKit",
      "description": "Free business calculators for solopreneurs and SaaS founders",
      "inLanguage": ["en", "zh"],
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://forgeflowkit.com/en/?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://forgeflowkit.com/#org",
      "name": "ForgeFlowKit",
      "url": "https://forgeflowkit.com",
      "logo": "https://forgeflowkit.com/favicon.svg",
      "sameAs": []
    }
  ]
}
```

**注入策略**：
- `WebSite` + `SearchAction`：所有页面（BaseLayout 默认）
- `Organization`：仅 `pageType === 'home'`（首页）
- 页面级 schema（SoftwareApplication、FAQPage 等）：通过现有 `schema` prop 透传

#### 4.3.4 BaseLayout Props 扩展

```ts
export interface Props {
  title: string;
  description: string;
  ogImage?: string;
  schema?: string;
  pageType?: 'home' | 'tool' | 'article' | 'static';  // 新增
}

const ogType = {
  home: 'website',
  tool: 'product',
  article: 'article',
  static: 'website',
}[pageType ?? 'static'];
```

#### 4.3.5 工具页 SoftwareApplication schema 扩展

现有块（`[slug].astro:95-100`）扩展为：

```json
{
  "@type": "SoftwareApplication",
  "@id": "https://forgeflowkit.com/<lang>/<slug>/#app",
  "name": "<toolTitle>",
  "applicationCategory": "<实际值来自 ToolMeta.applicationCategory，渲染期由工具页注入；例：'BusinessApplication' / 'FinanceApplication' / 'DeveloperApplication'>",
  "operatingSystem": "Web",
  "description": "<toolDescription>",
  "url": "https://forgeflowkit.com/<lang>/<slug>/",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "featureList": ["<实际值来自 engine.howToUse 前 3 条，i18n 由 translatedHowToUse 注入；本字段是页面构造期填入的，非 ToolMeta 静态数据>", "<同上>", "<同上>"],
  "isAccessibleForFree": true,
  "inLanguage": "<lang>",
  "provider": { "@id": "https://forgeflowkit.com/#org" }
}
```

**FAQPage 和 BreadcrumbList 块保持不变**（不重构）。

#### 4.3.6 静态页 schema 注入

| 页面 | schema 类型 | 关键字段 |
|---|---|---|
| `[lang]/index.astro` | `Organization` + `ItemList`（32 工具） | name, url, itemListElement |
| `[lang]/about.astro` | `AboutPage` | name, url, description, isPartOf: `#website` |
| `[lang]/contact.astro` | `ContactPage` | name, url, publisher: `#org` |
| `[lang]/privacy-policy.astro` | `WebPage` | name, url, dateModified |
| `[lang]/terms.astro` | `WebPage` | name, url, dateModified |

**ItemList 构造**（首页）：遍历 `tools` 数组，每项 `{ '@type': 'ListItem', position: i+1, name: tool.title, url: '/<lang>/<slug>/' }`。

#### 4.3.7 Sitemap 分级策略

```js
// astro.config.mjs
sitemap({
  entryLimit: 45000,
  serialize(item) {
    const isHome = /\/(en|zh)\/?$/.test(item.url);
    const isTool = /^\/(en|zh)\/[^/]+\/?$/.test(item.url)
                   && !['about','contact','privacy-policy','terms'].some(s => item.url.endsWith(s + '/'));
    const isBlog = /^\/(en|zh)\/blog\//.test(item.url);

    if (isHome) return { ...item, changefreq: 'daily', priority: 1.0 };
    if (isTool) return { ...item, changefreq: 'monthly', priority: 0.9 };
    if (isBlog) return { ...item, changefreq: 'weekly', priority: 0.7 };
    return { ...item, changefreq: 'monthly', priority: 0.5 };
  },
});
```

### 4.4 Phase 2 — og:image 自动生成

#### 4.4.1 视觉设计（1200×630）

```
┌────────────────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░ 紫→橙渐变背景 (按分类 6 色) ░░░░░░░░░░░░░░░░░░░░░ │
│                                                                        │
│  ┌─────────┐                                          ┌──────────────┐│
│  │ 🎬 播放 │                                          │              ││
│  │  LOGO   │                                          │   $73,500    ││
│  └─────────┘                                          │     /month   ││
│                                                       │              ││
│  MRR Calculator                                       │ ▲ Monthly    ││
│  ─────────────                                        │   Recurring  ││
│  📊 SaaS Metrics                                      │   Revenue    ││
│                                                       └──────────────┘│
│                                                                        │
│  forgeflowkit.com/en/mrr-calculator                                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**6 个分类色板**：

| categoryId | 主色 | 副色 | emoji |
|---|---|---|---|
| A SaaS Metrics | `#7C3AED` 紫 | `#F97316` 橙 | 📊 |
| B AI Cost Tools | `#0EA5E9` 蓝 | `#06B6D4` 青 | 🤖 |
| C Valuation & Exit | `#10B981` 绿 | `#84CC16` 黄绿 | 💎 |
| D Freelance Pricing | `#EC4899` 粉 | `#F43F5E` 玫红 | 💼 |
| E Cost & Efficiency | `#F59E0B` 琥珀 | `#EF4444` 红 | ⚡ |
| F Investment & ROI | `#6366F1` 靛 | `#8B5CF6` 紫 | 📈 |

#### 4.4.2 数据结构：`src/data/og-samples.json`

```json
{
  "solopreneur-mrr-calculator": {
    "inputs": {
      "subscriberCount": "1500",
      "monthlyPrice": "49",
      "monthlyChurnRate": "3",
      "expansionMrr": "500",
      "newSubsPerMonth": "50",
      "contractionMrr": "100",
      "reactivationMrr": "50"
    },
    "headline": { "en": "$73,500", "zh": "$73,500" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": {
      "en": "Monthly Recurring Revenue",
      "zh": "月度经常性收入"
    },
    "trend": { "en": "▲ +12% MoM", "zh": "▲ 月环比 +12%" }
  }
}
```

**32 工具全覆盖**。挑选规则：
- MRR/LTV/CAC/估值类：中等 SaaS 公司典型值
- Burn Rate：早期 startup 场景
- 自由职业：不同等级的独立工作者
- AI 成本：中型规模 + 主流模型
- 数量级合理（避免 100M MRR 或 $5/mo 极端值）
- `trend` 字段仅在 MRR/Burn Rate/Revenue 类有；Churn/CAC 不出现

#### 4.4.3 模板（`scripts/templates/og-card.tsx`）

React JSX 描述卡片布局（1200×630 flex 布局）。**关键约束**：
- 只用 flex（satori 不完全支持 grid）
- 字体显式通过 `fonts` prop 传给 satori
- 中文字符自动用 Noto Sans SC 回退
- 颜色用 hex，satori 不支持 `rgba()` 但支持 `rgb()` 和 8 位 hex

```tsx
export function OgCard({ tool, category, sample, lang }: Props) {
  const palette = CATEGORY_PALETTE[category.id];
  return (
    <div style={{
      width: 1200, height: 630, display: 'flex',
      background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
      padding: 80, color: 'white', fontFamily: 'Inter',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
        <LogoBlock />
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 60 }}>{tool.title}</div>
        <div style={{ fontSize: 22, opacity: 0.9, marginTop: 12 }}>
          {palette.emoji} {category.name[lang]}
        </div>
        <div style={{ fontSize: 22, opacity: 0.7, position: 'absolute', bottom: 0 }}>
          forgeflowkit.com/{lang}/{tool.slug}
        </div>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.95)', color: '#1F2937', borderRadius: 24,
        padding: 40, width: 460, height: 360, display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 1 }}>
          {sample.headline[lang]}
          <span style={{ fontSize: 32, fontWeight: 600 }}>{sample.headlineUnit[lang]}</span>
        </div>
        <div style={{ fontSize: 24, color: '#6B7280', marginTop: 16 }}>
          {sample.headlineLabel[lang]}
        </div>
        {sample.trend && (
          <div style={{ fontSize: 20, color: '#10B981', marginTop: 12 }}>
            {sample.trend[lang]}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 4.4.4 构建脚本（`scripts/build-og-images.mjs`）

```
入口：node scripts/build-og-images.mjs (--check | --dev | --slug=<slug>)

读:
  - src/data/tools.ts → 转 JSON（用 tsx loader 或正则）
  - src/data/og-samples.json
  - src/i18n/translations.ts → 提取 tool title/description
  - src/data/categories.ts

遍历 32 工具 × 2 语言 = 64 张:
  - satori(<OgCard JSX>, { width: 1200, height: 630, fonts: [Inter*, Noto*] })
  - @resvg/resvg-js(SVG).render().asPng() → Buffer
  - 写 public/og/<slug>-<lang>.png

--check 模式: 仅校验（sampled），不写文件
--dev 模式: 只生成 1 张 (MRR en)，避免 dev 启动慢
--slug=<slug> 模式: 只生成指定工具的 2 张图
```

#### 4.4.5 字体管理

- `scripts/fonts/Inter-Regular.ttf`、`Inter-Bold.ttf`、`Inter-Black.ttf`：~400KB 合计
- `scripts/fonts/NotoSansSC-Regular.ttf`：~5MB
- `scripts/fonts/NotoColorEmoji.ttf`：~400KB（仅 emoji 字符需要）
- `scripts/download-og-fonts.mjs`（一次性脚本，从 Google Fonts 下载，可重跑）
- 字体文件**提交到 git**，CI 不需网络下载

#### 4.4.6 依赖与脚本

```json
// package.json
{
  "devDependencies": {
    "satori": "^0.10.13",
    "@resvg/resvg-js": "^2.6.2",
    "react": "^18.3.1"
  },
  "scripts": {
    "prebuild": "node scripts/build-og-images.mjs",
    "predev": "node scripts/build-og-images.mjs --dev",
    "build:og": "node scripts/build-og-images.mjs",
    "check:og": "node scripts/build-og-images.mjs --check"
  }
}
```

#### 4.4.7 工具页 og:image 接入

```ts
// [slug].astro
const ogImage = `/og/${slug}-${lang}.png`;
// ...
<BaseLayout title={...} description={...} schema={schema} pageType="tool" ogImage={ogImage}>
```

#### 4.4.8 `.gitignore`

```gitignore
public/og/
```

## 5. Files Touched

### Phase 1 — Schema & Sitemap

| 文件 | 操作 |
|---|---|
| `src/data/tools.ts` | ToolMeta 加 applicationCategory、offers、featureList；32 工具逐个填入 |
| `src/data/application-categories.ts` | 新建（categoryId → applicationCategory 映射 + helper） |
| `src/layouts/BaseLayout.astro` | +pageType prop；注入 WebSite+SearchAction；home 时加 Organization；og:type 按 pageType 分 |
| `src/pages/[lang]/[slug].astro` | schema 里 SoftwareApplication 扩展（applicationCategory 真值、offers、featureList、@id、provider）；pageType='tool'；ogImage prop 暂用 `/og-default.png` 占位（Phase 2 替换） |
| `src/pages/[lang]/index.astro` | +schema prop（Organization + ItemList 32 工具）；pageType='home' |
| `src/pages/[lang]/about.astro` | +schema（AboutPage）；pageType='static' |
| `src/pages/[lang]/contact.astro` | +schema（ContactPage）；pageType='static' |
| `src/pages/[lang]/privacy-policy.astro` | +schema（WebPage）；pageType='static' |
| `src/pages/[lang]/terms.astro` | +schema（WebPage）；pageType='static' |
| `astro.config.mjs` | sitemap 分级策略（按页面类型 priority/changefreq） |
| `public/og-default.png` | 新建（占位 1×1 透明 PNG，避免 Phase 1 时 404） |

### Phase 2 — og:image 管线

| 文件 | 操作 |
|---|---|
| `scripts/build-og-images.mjs` | 新建：satori + resvg 批量渲染 64 张 |
| `scripts/templates/og-card.tsx` | 新建：React JSX 模板 |
| `scripts/templates/category-palette.ts` | 新建：6 分类色板常量 |
| `scripts/download-og-fonts.mjs` | 新建：一次性字体下载（提交到 git 后可重跑） |
| `scripts/fonts/Inter-{Regular,Bold,Black}.ttf` | 新建（git tracked） |
| `scripts/fonts/NotoSansSC-Regular.ttf` | 新建（git tracked） |
| `scripts/fonts/NotoColorEmoji.ttf` | 新建（git tracked） |
| `src/data/og-samples.json` | 新建：32 工具 × 2 语言的硬编码默认输入 + headline + label |
| `src/pages/[lang]/[slug].astro` | ogImage prop 改用 `/og/<slug>-<lang>.png`（覆盖 Phase 1 占位） |
| `package.json` | +deps: satori, @resvg/resvg-js, react；+scripts: prebuild, predev, build:og, check:og |
| `.gitignore` | +public/og/ |
| `tsconfig.json` 或新建 `tsconfig.scripts.json` | satori 模板需 React JSX 类型 |

### 不在本次改动

- `src/engines/*.ts`（32 个）：**零改动**（业务逻辑冻结）
- `src/i18n/translations.ts`：本次不需新增 key（og-samples.json 自带双语）
- `src/pages/[lang]/blog/`：page rendering 已存在，本次**扩展** Article + Blog schema；blog 数量 64 篇 + 1 个 index（详情见 §1.1）
- 原 `[slug].astro:83-109` 的 FAQPage + BreadcrumbList 块：**保持不动**

## 6. Acceptance Criteria

### Phase 1 完工标准（PR1 可合并）

- [ ] `pnpm check` 0 错误
- [ ] `pnpm test:run` 全绿
- [ ] `pnpm build` 成功，141 页生成
- [ ] Schema Markup Validator 抽样 5 个工具页：FAQPage + SoftwareApplication + BreadcrumbList 全绿
- [ ] Schema Markup Validator 抽样 about / contact / privacy / terms：对应页面 schema 全绿
- [ ] View Source 任意页：站点级 WebSite + SearchAction 出现
- [ ] View Source 首页：Organization + ItemList(32 工具) 出现
- [ ] View Source 工具页：`applicationCategory` 等于 ToolMeta 中填入的真值（不再硬编码 Multimedia）
- [ ] View Source 工具页：`offers`、`featureList`、`isAccessibleForFree`、`provider` 字段出现
- [ ] 访问 `/sitemap-0.xml`：首页 priority=1.0，工具页=0.9，静态页=0.5
- [ ] View Source 工具页：`og:type=product`；首页/静态页：`og:type=website`
- [ ] 32 个工具的 `tools.ts` 全部填入 applicationCategory / offers / featureList
- [ ] 现有 32 计算器页面渲染无视觉/交互退化

### Phase 2 完工标准（PR2 可合并）

- [ ] `node scripts/build-og-images.mjs` 退出码 0，64 张图全部生成
- [ ] `find public/og -size +300k` 返回空
- [ ] sharp info 抽样 5 张图：尺寸 = 1200×630
- [ ] View Source 工具页：`og:image` URL = `/og/<slug>-<lang>.png`
- [ ] `pnpm preview` 后 curl 抽样 5 个 og URL：HTTP 200，Content-Type=image/png
- [ ] Twitter Card Validator：抽 1 张图，预览正确显示样例结果
- [ ] Facebook OG Debugger：抽 1 张图，og:image 抓取成功
- [ ] GitHub Actions ubuntu-latest：CI build step 成功（验证字体 + 二进制兼容）
- [ ] `pnpm predev` 在 dev 启动时跑通（生成至少 1 张 MRR en 图）
- [ ] 抽样 3 张中文 og:image：中文不方框、不截断
- [ ] `git status` 干净（public/og/ 在 .gitignore）

## 7. Risks & Mitigations

| 风险 | 阶段 | 缓解 |
|---|---|---|
| 字体下载被墙（CI 在 GFW 内） | Phase 2 | 字体文件**提交到 git**，CI 无需网络 |
| satori 不支持 grid / transform | Phase 2 | 模板只用 flex；实施前做 1 张样例验证 |
| 中文截断 | Phase 2 | 模板用 flexShrink + maxWidth；保留中文测试用例 |
| resvg 渲染 emoji 颜色不对 | Phase 2 | Noto Color Emoji 字体 + `emoji: true` 声明 |
| sharp/resvg 二进制在 arm64 runner 缺失 | Phase 2 | 用 `@resvg/resvg-js`（纯 Rust + prebuilt）；不依赖 sharp |
| CJK 字体缺失 | Phase 2 | Inter + Noto Sans SC 双字体；提交到 git |
| 64 张图生成耗时 | Phase 2 | `--dev` 模式只生 1 张；build 增量（hash 比对） |
| sitemap serialize 函数正则误判 | Phase 1 | 抽样 5 个不同类型 URL 人工核对；单元测试覆盖 serialize |
| `tools.ts` 32 个工具逐个填字段漏填 | Phase 1 | 实施后 grep 检查所有 32 个都有 `applicationCategory`；缺失则 CI 失败 |
| `og-samples.json` 32 个工具硬编码数据有错 | Phase 2 | PR review + 抽样人工目检 5 张图 |
| Phase 2 阻塞 Phase 1 | — | 完全解耦：Phase 1 上线时 ogImage 用 `/og-default.png` 占位，Phase 2 替换 |

## 8. Rollback Plan

| 阶段 | 回滚动作 | 影响 |
|---|---|---|
| Phase 1 出问题 | `git revert <phase1-commit>` | 站点级 schema 消失；工具页回到旧 schema（FAQPage/SoftwareApplication/BreadcrumbList 仍存在） |
| Phase 2 出问题 | `git revert <phase2-commit>` | og:image URL 不再有效，社交分享回到无图状态；搜索引擎不受影响 |
| og:image 单张图问题 | 删该图，临时回退 ogImage prop | 单页受影响 |

**关键不变量**：原 `[slug].astro:83-109` 的 schema 块保留，本次只扩展不替换。

## 9. Open Assumptions

| 假设 | 不成立的影响 |
|---|---|
| 所有 32 个工具有可读的英文/中文名 | 缺失时 fallback 英文 + 标注 |
| Inter + Noto Sans SC 覆盖中英文 | 罕见字符补 Noto Color Emoji |
| 每工具能挑出"合理默认输入" | 开放性输入（如 startup idea validator）用占位符 |
| 搜索功能确实存在（SearchAction 才有效） | Phase 1 SearchAction 退化为单纯 WebSite schema |
| GitHub Actions ubuntu-latest 有完整 prebuilt | 需装系统字体或切到其他工具 |
| Plausible 不采集 og:image URL 参数 | 不影响 |

## 10. Bonus Items

- **顺手修 og:type**：从 `website` 改按页类型分（product/article/website），社交分享卡片权重提升
- **顺手加 Organization schema**：首页之前零 schema，加 Organization 后品牌搜索结果更完整
- **顺手加 ItemList**：首页 32 工具结构化，搜索引擎可抓工具清单
- **顺手清理 sitemap 策略**：统一 0.7 priority 不合理，分级后搜索引擎更准确判断页面价值

## 11. Notes

- 本次设计阶段明确**不对 engines 目录做改动**（业务逻辑冻结）
- 本次设计阶段**不实装新博客页**（page rendering 已存在）；仅扩 Article + Blog schema 注入（pre-flight 2026-06-25 决定）
- 后续如需博客实装，应作为独立 spec 处理；本 spec 预留 blog schema helper 但不写代码
- 字体文件大小（~6MB）增加仓库体积，但带来 CI 可复现性，权衡可接受