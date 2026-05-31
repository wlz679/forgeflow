# YouTube Creator Tools 实施计划

> **致执行代理:** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施。步骤使用 `- [ ]` checkbox 语法追踪。

**目标:** 构建 66 页 YouTube 创作者工具网站——30 个规则引擎工具、Blog、AdSense、移动端优先、SEO 优化。

**架构:** Astro SSG + Tailwind CSS + 原生 JavaScript。一条动态路由 `[slug].astro` 渲染全部 30 个工具页。引擎同时导出服务端元数据和 JSON `clientConfig` 供浏览器端生成。Blog 用 `blog/[slug].astro` + 模板内容。

**技术栈:** Astro 5、Tailwind CSS 4、TypeScript、原生 JavaScript。

---

## 文件地图

```
src/
├── pages/
│   ├── index.astro                    （首页）
│   ├── [slug].astro                   （工具页 — 30 条路由）
│   ├── about.astro
│   ├── contact.astro
│   ├── privacy-policy.astro
│   ├── terms.astro
│   ├── robots.txt.ts
│   └── blog/
│       ├── index.astro                （Blog 列表）
│       └── [slug].astro              （Blog 文章 — 30 条路由）
├── layouts/
│   └── BaseLayout.astro              （页面外壳：html head + header + <slot/> + footer）
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   ├── SearchBar.astro
│   ├── ToolCard.astro
│   ├── CategorySection.astro
│   ├── ResultCard.astro
│   ├── FAQ.astro
│   ├── HowToUse.astro
│   ├── RelatedTools.astro
│   ├── AdUnit.astro
│   └── CopyButton.astro
├── data/
│   ├── tools.ts                       （30 个工具元数据）
│   ├── categories.ts                  （6 个分类）
│   ├── internal-links.ts             （Related Tools 映射）
│   └── blog-posts.ts                 （30 篇 Blog 内容）
├── engines/
│   ├── types.ts                       （ToolEngine 接口）
│   ├── helpers.ts                     （randomPick、fillTemplate 等）
│   ├── client-generator.ts           （浏览器端 generateFromConfig）
│   ├── registry.ts                    （slug → engine 映射表）
│   ├── video-idea-generator.ts
│   ├── trending-ideas-finder.ts
│   ├── ...（共 30 个引擎文件）
│   └── growth-score-analyzer.ts
└── styles/
    └── global.css                     （Tailwind + 自定义主题变量）
```

---

## 引擎接口 (`src/engines/types.ts`)

```ts
export interface ToolInput {
  name: string;
  label: string;
  placeholder: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
}

export interface ClientConfig {
  type: 'templates' | 'combinations' | 'custom';
  templates?: string[];
  patterns?: string[];
  wordPools: Record<string, string[]>;
  customFn?: string; // type='custom' 时：JS 函数体字符串，参数为 (inputs, pick, fill)
}

export interface ToolEngine {
  slug: string;
  title: string;
  description: string;
  category: string;
  inputs: ToolInput[];
  clientConfig: ClientConfig;
  generate(inputs: Record<string, string>): string[];
  staticExamples: string[];
  faq: { q: string; a: string }[];
  howToUse: string[];
}
```

---

## 第一阶段：项目搭建

### 任务 1：初始化 Astro + Tailwind

**涉及文件:** `package.json`、`astro.config.mjs`、`tsconfig.json`、`src/styles/global.css`、`public/favicon.svg`

- [ ] **步骤 1：脚手架项目**

```bash
cd "d:/E/独立站/youtube-tools"
npm create astro@latest . -- --template minimal --typescript strict --install --no-git
npm install @tailwindcss/vite
```

- [ ] **步骤 2：配置 astro.config.mjs**

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://youtubetools.com',
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **步骤 3：写 global.css**

```css
@import "tailwindcss";

@theme {
  --color-brand: #dc2626;
  --color-primary: #374151;
  --color-primary-light: #4b5563;
  --color-border: #e5e7eb;
  --color-bg: #ffffff;
  --color-text: #111827;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
}
```

- [ ] **步骤 4：写 favicon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#dc2626"/>
  <text x="16" y="23" text-anchor="middle" font-size="22" fill="white" font-family="system-ui">▶</text>
</svg>
```

- [ ] **步骤 5：构建验证并提交**

```bash
npm run build
git add -A && git commit -m "feat: scaffold Astro + Tailwind project"
```

---

## 第二阶段：布局与组件

### 任务 2：BaseLayout（SEO head + 页面外壳）

**涉及文件:** `src/layouts/BaseLayout.astro`

```astro
---
export interface Props {
  title: string;
  description: string;
  ogImage?: string;
  schema?: string;
}
const { title, description, ogImage = '/og-default.png', schema } = Astro.props;
---

<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:type" content="website" />
  <meta name="robots" content="index, follow" />
  <link rel="sitemap" href="/sitemap-index.xml" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  {schema && <script type="application/ld+json" set:html={schema} />}
</head>
<body class="min-h-screen flex flex-col bg-white text-gray-900">
  <slot />
</body>
</html>
```

提交: `git add src/layouts/BaseLayout.astro && git commit -m "feat: add BaseLayout with SEO head"`

### 任务 3：Header

**涉及文件:** `src/components/Header.astro`

```astro
---
const navItems = [
  { href: '/blog/', label: 'Blog' },
  { href: '/about', label: 'About' },
];
---
<header class="border-b border-gray-200 sticky top-0 bg-white z-50">
  <nav class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
    <a href="/" class="text-lg font-bold text-gray-900 hover:text-red-600 transition-colors">YT Creator Tools</a>
    <div class="flex items-center gap-4 text-sm">
      {navItems.map(item => (<a href={item.href} class="text-gray-600 hover:text-red-600 transition-colors">{item.label}</a>))}
    </div>
  </nav>
</header>
```

提交: `git add src/components/Header.astro && git commit -m "feat: add Header component"`

### 任务 4：Footer

**涉及文件:** `src/components/Footer.astro`

```astro
---
const legalLinks = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About' },
];
---
<footer class="border-t border-gray-200 mt-auto bg-gray-50">
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="flex flex-wrap justify-center gap-4 text-sm mb-2">
      {legalLinks.map(link => (<a href={link.href} class="text-gray-500 hover:text-red-600 transition-colors">{link.label}</a>))}
    </div>
    <p class="text-center text-xs text-gray-400">&copy; {new Date().getFullYear()} YouTube Creator Tools. Not affiliated with YouTube.</p>
  </div>
</footer>
```

提交: `git add src/components/Footer.astro && git commit -m "feat: add Footer component"`

### 任务 5：小型共享组件

**涉及文件:** 在 `src/components/` 下创建所有组件文件

**AdUnit.astro** — AdSense 占位广告位：
```astro
---
export interface Props { slot: 'home-hero' | 'home-mid' | 'home-footer' | 'tool-result' | 'blog-mid' | 'blog-end' }
const h: Record<string, string> = {
  'home-hero': 'min-h-[90px]', 'home-mid': 'min-h-[90px]', 'home-footer': 'min-h-[90px]',
  'tool-result': 'min-h-[250px]', 'blog-mid': 'min-h-[250px]', 'blog-end': 'min-h-[250px]',
};
---
<div class={`my-6 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 ${h[Astro.props.slot]}`}>
  <span class="text-xs text-gray-400">AdSense — {Astro.props.slot.replace('-', ' ')}</span>
</div>
```

**CopyButton.astro** — 带 clipboard JS 的复制按钮：
```astro
---
export interface Props { text: string; }
---
<button type="button" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors" data-copy={Astro.props.text}>
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
  <span class="copy-label">Copy</span>
</button>
<script>
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = (btn as HTMLElement).dataset.copy!;
      navigator.clipboard.writeText(text).then(() => {
        const label = btn.querySelector('.copy-label')!;
        label.textContent = 'Copied!';
        setTimeout(() => { label.textContent = 'Copy'; }, 2000);
      });
    });
  });
</script>
```

**ResultCard.astro** — 单条结果卡片：
```astro
---
export interface Props { text: string; index: number; }
---
<div class="flex items-start justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
  <span class="text-xs text-gray-400 font-mono shrink-0 pt-0.5">#{Astro.props.index + 1}</span>
  <span class="text-sm text-gray-800 flex-1">{Astro.props.text}</span>
  <CopyButton text={Astro.props.text} />
</div>
```

**FAQ.astro** — FAQ 手风琴折叠区：
```astro
---
export interface Props { items: { q: string; a: string }[]; }
---
<div class="mt-8">
  <h2 class="text-lg font-bold mb-3">Frequently Asked Questions</h2>
  <div class="space-y-1">
    {Astro.props.items.map(item => (
      <details class="border border-gray-200 rounded-lg group">
        <summary class="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 select-none">{item.q}</summary>
        <p class="px-4 pb-3 text-sm text-gray-600 leading-relaxed">{item.a}</p>
      </details>
    ))}
  </div>
</div>
```

**HowToUse.astro** — 使用说明步骤列表：
```astro
---
export interface Props { steps: string[]; }
---
<div class="mt-6">
  <h2 class="text-lg font-bold mb-3">How to Use This Tool</h2>
  <ol class="space-y-2">
    {Astro.props.steps.map((step, i) => (
      <li class="flex gap-3 text-sm text-gray-700"><span class="font-bold text-red-600 shrink-0">{i + 1}.</span><span>{step}</span></li>
    ))}
  </ol>
</div>
```

**RelatedTools.astro** — 相关工具内链：
```astro
---
export interface Props { tools: { slug: string; title: string }[]; }
---
<div class="mt-6">
  <h2 class="text-lg font-bold mb-3">Related Tools</h2>
  <div class="flex flex-wrap gap-2">
    {Astro.props.tools.map(tool => (
      <a href={`/${tool.slug}`} class="inline-block px-3 py-1.5 text-sm bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">{tool.title}</a>
    ))}
  </div>
</div>
```

**SearchBar.astro** — 首页搜索框：
```astro
<search class="relative max-w-lg mx-auto">
  <input type="search" id="tool-search" placeholder='Search tools... (e.g. "title generator")' class="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" aria-label="Search tools" />
</search>
```

**CategorySection.astro** — 首页分类区块：
```astro
---
import ToolCard from './ToolCard.astro';
export interface Props { id: string; name: string; description: string; tools: { slug: string; title: string; description: string }[]; }
---
<section id={Astro.props.id} class="mb-8">
  <h2 class="text-lg font-bold text-gray-800 mb-1">{Astro.props.name}</h2>
  <p class="text-xs text-gray-500 mb-3">{Astro.props.description}</p>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
    {Astro.props.tools.map(tool => <ToolCard {...tool} />)}
  </div>
</section>
```

**ToolCard.astro** — 单个工具卡片：
```astro
---
export interface Props { slug: string; title: string; description: string; }
---
<a href={`/${Astro.props.slug}`} class="block p-3 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50/50 transition-colors">
  <h3 class="text-sm font-semibold text-gray-900">{Astro.props.title}</h3>
  <p class="text-xs text-gray-500 mt-1 line-clamp-2">{Astro.props.description}</p>
</a>
```

提交: `git add src/components/ && git commit -m "feat: add all shared UI components"`

---

## 第三阶段：数据层与引擎框架

### 任务 6：分类、工具元数据、内链数据

**涉及文件:** `src/data/categories.ts`、`src/data/tools.ts`、`src/data/internal-links.ts`

- `categories.ts`：定义 6 大分类 A-F，包含 id、name、slug、description
- `tools.ts`：全部 30 个工具的元数据（slug、title、description、categoryId、inputs 数组）。见设计文档第 7 节完整清单
- `internal-links.ts`：自动生成 Related Tools 映射——每个工具取 3 个同类 + 2 个跨分类

提交: `git add src/data/ && git commit -m "feat: add tool metadata, categories, and internal links"`

### 任务 7：引擎类型、辅助函数和客户端生成器

**涉及文件:** `src/engines/types.ts`、`src/engines/helpers.ts`、`src/engines/client-generator.ts`

**types.ts** — 类型定义（见上方接口定义）。

**helpers.ts** — 服务端生成辅助函数：

```ts
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomPickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function generateFromTemplates(
  templates: string[], wordPools: Record<string, string[]>,
  userInputs: Record<string, string>, count: number
): string[] {
  const vars: Record<string, string> = {};
  for (const [key, pool] of Object.entries(wordPools)) vars[key] = '';
  vars.topic = userInputs.topic || userInputs.niche || userInputs.keyword || userInputs.interest || userInputs.title || 'your video';
  vars.niche = userInputs.niche || userInputs.topic || 'your niche';
  vars.keyword = userInputs.keyword || userInputs.topic || 'your keyword';
  const results: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (results.length < count && attempts < count * 15) {
    attempts++;
    for (const key of Object.keys(wordPools)) vars[key] = randomPick(wordPools[key]);
    const result = fillTemplate(randomPick(templates), vars).trim();
    if (!seen.has(result)) { seen.add(result); results.push(result); }
  }
  return results;
}

export function generateCombinations(
  patterns: ((vars: Record<string, string>) => string)[],
  wordPools: Record<string, string[]>,
  userInputs: Record<string, string>, count: number
): string[] {
  const vars: Record<string, string> = { topic: userInputs.topic || userInputs.niche || 'your topic' };
  const results: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (results.length < count && attempts < count * 15) {
    attempts++;
    for (const key of Object.keys(wordPools)) vars[key] = randomPick(wordPools[key]);
    const result = randomPick(patterns)(vars).trim();
    if (!seen.has(result)) { seen.add(result); results.push(result); }
  }
  return results;
}
```

**client-generator.ts** — 浏览器端生成器（内嵌到工具页的 `<script>` 中）：

```ts
export function generateFromConfig(
  config: { type: string; templates?: string[]; patterns?: string[]; wordPools: Record<string, string[]>; customFn?: string },
  inputs: Record<string, string>,
  count = 10
): string[] {
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
  const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);
  
  // 自定义引擎：执行其 customFn
  if (config.type === 'custom' && config.customFn) {
    const fn = new Function('inputs', 'pick', 'fill', config.customFn);
    return fn(inputs, pick, fill);
  }
  
  const v: Record<string, string> = { topic: inputs.topic || inputs.niche || inputs.keyword || inputs.interest || inputs.title || 'your topic', niche: inputs.niche || inputs.topic || 'your niche', keyword: inputs.keyword || inputs.topic || 'your keyword' };
  const results: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (results.length < count && attempts < count * 15) {
    attempts++;
    for (const key of Object.keys(config.wordPools)) v[key] = pick(config.wordPools[key]);
    let result: string;
    if (config.type === 'templates') result = fill(pick(config.templates!), v).trim();
    else if (config.type === 'combinations') result = pick(config.patterns!)(v).trim();
    else result = '';
    if (result && !seen.has(result)) { seen.add(result); results.push(result); }
  }
  return results;
}
```

提交: `git add src/engines/types.ts src/engines/helpers.ts src/engines/client-generator.ts && git commit -m "feat: add engine types, helpers, and client generator"`

---

## 第四至九阶段：全部 30 个引擎

**模板引擎模式**（大多数工具）：使用 `clientConfig: { type: 'templates', templates, wordPools }`。浏览器端 `generateFromConfig()` 自动处理生成。

**自定义引擎模式**（有特殊生成逻辑的工具）：使用 `clientConfig: { type: 'custom', wordPools: {}, customFn: '<JS 函数体>' }`。customFn 参数为 `(inputs, pick, fill)`，返回 `string[]`。

自定义引擎包括：Content Planner、Description Generator、Script Generator、Shorts Hashtag Generator、Tag Generator、Hashtag Generator、Keyword Generator、SEO Title Analyzer、SEO Checklist、Thumbnail CTR Optimizer、Thumbnail A/B Title Tester、Channel Description Generator、Upload Time Optimizer、CPM Calculator、Growth Score Analyzer。

### 引擎文件模板

```ts
import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';

export const engineName: ToolEngine = {
  slug: 'youtube-xxx-xxx',
  title: 'YouTube Xxx Xxx',
  description: '...',
  category: 'A', // A-F
  inputs: [{ name: 'xxx', label: 'Xxx', placeholder: 'e.g. ...', type: 'text' }],
  clientConfig: { type: 'templates', templates, wordPools },
  generate(inputs) { return generateFromTemplates(templates, wordPools, inputs, 10); },
  staticExamples: ['...', '...', '...', '...', '...'],
  faq: [{ q: '...', a: '...' }, ...],
  howToUse: ['1. ...', '2. ...', '3. ...', '4. ...', '5. ...'],
};
```

### A 类：内容创意（Content Ideas）

**任务 8：Video Idea Generator** (`video-idea-generator.ts`) — 输入: topic。模板 20 个，词库 4 组。

**任务 9：Trending Ideas Finder** (`trending-ideas-finder.ts`) — 输入: niche。模板 15 个，词库 4 组。

**任务 10：Niche Ideas Generator** (`niche-ideas-generator.ts`) — 输入: interest。使用 generateCombinations，15 个 pattern，词库 8 组。

**任务 11：Content Planner** (`content-planner.ts`) — 输入: niche + duration。自定义引擎，按天数生成顺序计划。clientConfig 使用 type: 'custom'。

**任务 12：Viral Video Ideas** (`viral-video-ideas.ts`) — 输入: topic。模板 20 个，词库 3 组。

### B 类：标题与文案（Titles & SEO Copy）

**任务 13：Title Generator** (`title-generator.ts`) — 输入: topic + style。4 套模板（Clickbait / SEO / Emotional / How-To），按 style 选择或合并全部。

**任务 14：Clickbait Title Generator** (`clickbait-title-generator.ts`) — 输入: topic。合并 Title Generator 的 Clickbait 模板 + 额外极端模板。

**任务 15：Description Generator** (`description-generator.ts`) — 输入: topic + keywords。自定义引擎，构建结构化视频描述。

**任务 16：Hook Generator** (`hook-generator.ts`) — 输入: topic。模板 12 个，词库 4 组。

**任务 17：Script Generator** (`script-generator.ts`) — 输入: topic + style。自定义引擎，输出结构化脚本大纲（INTRO/BODY/OUTRO）。

### C 类：Shorts 增长（Shorts Growth）

**任务 18：Shorts Idea Generator** (`shorts-idea-generator.ts`) — 输入: niche。模板 15 个。

**任务 19：Shorts Hook Generator** (`shorts-hook-generator.ts`) — 输入: topic。模板 10 个。

**任务 20：Shorts Caption Generator** (`shorts-caption-generator.ts`) — 输入: topic。模板 10 个。

**任务 21：Shorts Title Generator** (`shorts-title-generator.ts`) — 输入: topic。模板 10 个。

**任务 22：Shorts Hashtag Generator** (`shorts-hashtag-generator.ts`) — 输入: niche。自定义引擎，合并 3 组标签。

### D 类：SEO 优化（SEO Optimization）

**任务 23：Tag Generator** (`tag-generator.ts`) — 输入: topic + category。自定义引擎，前缀/后缀组合。

**任务 24：Hashtag Generator** (`hashtag-generator.ts`) — 输入: topic。自定义引擎，3 组标签合并。

**任务 25：Keyword Generator** (`keyword-generator.ts`) — 输入: keyword。自定义引擎，修饰词 + 问题形式扩展。

**任务 26：SEO Title Analyzer** (`seo-title-analyzer.ts`) — 输入: title。自定义引擎，基于规则评分（长度/数字/情绪词/强动词）。

**任务 27：SEO Checklist** (`seo-checklist.ts`) — 无输入。自定义引擎，返回静态清单。

### E 类：缩略图优化（Thumbnail Optimization）

**任务 28：Thumbnail Text Generator** (`thumbnail-text-generator.ts`) — 输入: topic。使用 generateCombinations，10 个 pattern。

**任务 29：Thumbnail Idea Generator** (`thumbnail-idea-generator.ts`) — 输入: topic。模板 15 个。

**任务 30：Thumbnail CTR Optimizer** (`thumbnail-ctr-optimizer.ts`) — 输入: topic。自定义引擎，组合标题+缩略图文字。

**任务 31：Thumbnail A/B Title Tester** (`thumbnail-ab-title-tester.ts`) — 输入: title。自定义引擎，生成 3 个变体版本。

**任务 32：Thumbnail Emotion Generator** (`thumbnail-emotion-generator.ts`) — 输入: topic。模板 5 个，词库 3 组。

### F 类：频道增长（Channel Growth）

**任务 33：Channel Name Generator** (`channel-name-generator.ts`) — 输入: niche + style。使用 generateCombinations，多套 pattern。

**任务 34：Channel Description Generator** (`channel-description-generator.ts`) — 输入: niche + channelName。自定义引擎，段落模板。

**任务 35：Upload Time Optimizer** (`upload-time-optimizer.ts`) — 输入: niche + audience。自定义引擎，基于地区返回最佳时间。

**任务 36：CPM Calculator** (`cpm-calculator.ts`) — 输入: views + niche。自定义引擎，纯数学计算。

**任务 37：Growth Score Analyzer** (`growth-score-analyzer.ts`) — 输入: subscribers + uploads + niche。自定义引擎，评分 + 建议。

> **注意:** 每个引擎的完整模板、词库、FAQ、staticExamples 数据已在英文原版计划中详细列出。按引擎文件模板将数据填入即可。自定义引擎需提供 `customFn` 字符串（浏览器端可执行的 JS 函数体）。

每个引擎提交格式: `git add src/engines/<name>.ts && git commit -m "feat: add <Tool Name> engine"`

### 任务 38：引擎注册中心

**涉及文件:** `src/engines/registry.ts`

导入全部 30 个引擎，导出 `getEngine(slug: string)` 和 `getAllEngines()` 两个函数。

提交: `git add src/engines/registry.ts && git commit -m "feat: wire up engine registry with all 30 tools"`

---

## 第十阶段：页面模板

### 任务 39：工具页动态路由 [slug].astro

**涉及文件:** `src/pages/[slug].astro`

核心逻辑：`getStaticPaths()` 遍历全部 30 个 tool slug → 通过 `getEngine()` 获取引擎 → 渲染双栏布局（左：输入+FAQ，右：结果+Related Tools）→ 嵌入 `clientConfig` JSON → 浏览器端 `generateFromConfig()` 处理表单提交。

完整代码见英文原版计划。关键点：
- 静态示例结果预渲染（SEO 内容，不依赖 JS）
- 表单提交后动态结果替换静态示例
- 每条结果带独立 Copy 按钮，全局 Copy All 按钮
- JSON-LD Schema（FAQPage + SoftwareApplication + BreadcrumbList）

提交: `git add src/pages/\[slug\].astro && git commit -m "feat: add dynamic tool page template"`

### 任务 40：首页

**涉及文件:** `src/pages/index.astro`

结构：Hero 标题 + 搜索框 → AdSense 位 → 前 3 个分类区块（A-C）→ AdSense 位 → 后 3 个分类区块（D-F）→ AdSense 位 → Footer。

搜索功能：监听 input 事件，按文本筛选卡片和区块显示。

提交: `git add src/pages/index.astro && git commit -m "feat: add homepage with category sections and search"`

### 任务 41：Blog 列表页

**涉及文件:** `src/data/blog-posts.ts`、`src/pages/blog/index.astro`

- `blog-posts.ts`：30 篇 Blog 文章数据，每篇包含 slug、title、excerpt、toolSlug、toolName、content（~500 词英文模板内容）
- `blog/index.astro`：列表页，按标题+摘要展示所有文章，可点击进入文章页

提交: `git add src/data/blog-posts.ts src/pages/blog/ && git commit -m "feat: add blog listing page"`

### 任务 42：Blog 文章页

**涉及文件:** `src/pages/blog/[slug].astro`

核心逻辑：`getStaticPaths()` 遍历 30 篇 Blog → 渲染文章页（面包屑 + 标题 + 正文 + AdSense × 2 + CTA 按钮链回工具页）。

提交: `git add src/pages/blog/ && git commit -m "feat: add blog post template"`

### 任务 43：法律页面

**涉及文件:** `src/pages/about.astro`、`src/pages/contact.astro`、`src/pages/privacy-policy.astro`、`src/pages/terms.astro`

4 个静态 Astro 页面，均使用 BaseLayout + Header + Footer：
- About：项目介绍、技术栈、联系方式
- Contact：联系表单或邮箱
- Privacy Policy：AdSense 合规隐私政策（Google 要求模板）
- Terms：标准使用条款

提交: `git add src/pages/about.astro src/pages/contact.astro src/pages/privacy-policy.astro src/pages/terms.astro && git commit -m "feat: add legal pages"`

### 任务 44：robots.txt + Sitemap

**涉及文件:** `src/pages/robots.txt.ts`、更新 `astro.config.mjs`

1. 写 `robots.txt.ts`（API 路由，返回纯文本）
2. `npm install @astrojs/sitemap`
3. 在 `astro.config.mjs` 中添加 `integrations: [sitemap()]`

提交: `git add src/pages/robots.txt.ts astro.config.mjs && git commit -m "feat: add robots.txt and sitemap"`

---

## 第十一阶段：构建与验证

### 任务 45：构建并测试

- [ ] **步骤 1：构建项目**

```bash
npm run build
```

预期：构建成功，`dist/` 下生成全部 66 个页面。

- [ ] **步骤 2：验证输出**

```bash
ls dist/ | head -40
```

预期：`index.html`、`youtube-title-generator/index.html`、`blog/index.html`、`about/index.html` 等。

- [ ] **步骤 3：验证 SEO 元素**

```bash
grep -r '<title>' dist/ | head -10
grep -r '<meta name="description"' dist/ | head -10
grep -r 'application/ld+json' dist/ | head -5
```

预期：每个页面都有 title 和 meta description，工具页有 JSON-LD Schema。

- [ ] **步骤 4：启动开发服务器手动测试**

```bash
npm run dev
```

打开 http://localhost:4321，测试首页搜索、导航到 3-4 个工具页、测试 Generate 按钮、测试 Copy 按钮。

- [ ] **步骤 5：提交修复**

```bash
git add -A && git commit -m "chore: build verification fixes"
```

---

## 总览

| 阶段 | 任务 | 新建文件数 |
|------|------|-----------|
| 第一阶段：项目搭建 | 任务 1 | 5 |
| 第二阶段：布局与组件 | 任务 2-5 | 10 |
| 第三阶段：数据层与引擎框架 | 任务 6-7 | 6 |
| 第四至九阶段：30 个引擎 | 任务 8-38 | 31 |
| 第十阶段：页面模板 | 任务 39-44 | 10 |
| 第十一阶段：构建与验证 | 任务 45 | 0 |
| **合计** | **45 个任务** | **62 个文件** |
