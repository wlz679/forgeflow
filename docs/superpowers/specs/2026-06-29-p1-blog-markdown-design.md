# Spec 2/3: Blog Markdown 迁移（存储层）

**Date:** 2026-06-29
**Status:** Draft
**Plan:** 2 of 3 in P1 series (Schema Factory ✅ → **Blog Markdown** → Engine Factory)
**Branch:** `v2_20260626`

## Context

`src/data/blog-posts.ts` (55 行) 用 `tools.map()` 模板生成 32 条 blog post。每条字段：

```ts
export interface BlogPost {
  slug: string;          // 'best-${toolSlug}'
  title: string;
  toolSlug: string;
  toolName: string;
  excerpt: string;
  ogImage: string;
  content: string;       // template-string joined markdown text
}
```

**消费方（8 个文件）：**

| 文件 | 消费字段 |
|---|---|
| `src/pages/[lang]/blog/[slug].astro` | 全部 7 字段（content 用 `split('\n').map(p => <p>)` 渲染） |
| `src/pages/[lang]/blog/index.astro` | slug, title, excerpt |
| `src/pages/[lang]/{saas-metrics,valuation-exit,freelance-pricing,cost-efficiency,investment-roi,ai-cost-tools}.astro` × 5+1 | toolSlug（filter by category）, slug, title, excerpt |
| `src/components/CategoryGuides.astro` | slug, title, excerpt（卡片渲染） |
| `tests/blog-hero-image.test.ts` | 全部字段 |
| `tests/ab-split.test.ts` | 硬编码 `src/data/blog-posts.ts` 路径（line 64） |

**关键事实：** `post.content` 是模板拼接的 markdown **字符串**，但消费方**并未真解析 markdown**——只是按 `\n` split 成段，每段用 `<p>` 包起来。所以 `##`、`**bold**`、列表语法都作为字面字符串显示在 `<p>` 里。

## Goal

把 32 条 blog post 从内嵌 TS 数组迁到 `src/content/blog/best-*.md`（Astro Content Collections），用 **adapter 层** 维持消费方 API 不变。**渲染层零改动**——32 个 dist HTML 视觉与现状一致。

**Not in scope:** markdown 真解析（## → h2、** → strong 等）。

## Architecture

### 数据流

```
scripts/generate-blog-posts.mjs (Node ESM script)
  ↓ 读取 src/data/tools/index.ts
  ↓ 输出 32 个 .md
src/content/blog/best-${slug}.md (git tracked)
  ↓ Astro Content Collections 类型校验
  ↓ getCollection('blog')
src/lib/blog.ts (adapter)
  ↓ toBlogPost(entry) 拼 toolName
  ↓ getAllBlogPosts() / getBlogPostBySlug() / getBlogPostsByToolSlug()
src/{pages,components,tests}/... (消费方 8 个文件)
  ↓ import 源: blog-posts.ts → lib/blog.ts
```

### Astro Content Collection schema

`src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',  // markdown body
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    ogImage: z.string(),   // base slug; renders to /og/${ogImage}-${lang}.png
    toolSlug: z.string(),  // FK to tools[].slug
  }),
});

export const collections = { blog };
```

### Frontmatter（最小集，4 字段）

```yaml
---
title: 'Best MRR Calculator for Entrepreneurs (2026)'
excerpt: 'Discover the best mrr calculator to grow your solo business. ...'
ogImage: 'solopreneur-mrr-calculator'
toolSlug: 'solopreneur-mrr-calculator'
---
```

`slug` 和 `toolName` **不存 frontmatter**：
- `slug` = Astro Collection entry.id（= 文件名去 `.md`）= `best-${toolSlug}`
- `toolName` = adapter 运行时从 `tools[]` 查 `tool.title`

### Adapter (`src/lib/blog.ts`)

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import { tools } from '../data/tools';

export interface BlogPost {
  slug: string;
  title: string;
  toolSlug: string;
  toolName: string;
  excerpt: string;
  ogImage: string;
  content: string;  // raw markdown body string
}

function toBlogPost(entry: CollectionEntry<'blog'>): BlogPost {
  const toolSlug = entry.data.toolSlug;
  const tool = tools.find(t => t.slug === toolSlug);
  return {
    slug: entry.slug,
    title: entry.data.title,
    toolSlug,
    toolName: tool?.title ?? toolSlug,
    excerpt: entry.data.excerpt,
    ogImage: entry.data.ogImage,
    content: entry.body ?? '',
  };
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('blog');
  return entries.map(toBlogPost).sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const entries = await getCollection('blog', (e) => e.slug === slug);
  return entries[0] ? toBlogPost(entries[0]) : undefined;
}

export async function getBlogPostsByToolSlug(toolSlug: string): Promise<BlogPost[]> {
  const entries = await getCollection('blog', (e) => e.data.toolSlug === toolSlug);
  return entries.map(toBlogPost);
}
```

**注意：** Astro Collection API 是 **async**，所以 adapter 函数都是 async。这会传导到消费方——`getStaticPaths()` 也改成 async（已有先例，Astro 4.x 支持）。

### 生成器 (`scripts/generate-blog-posts.mjs`)

读取 `src/data/tools/index.ts`（动态 import），对每个 tool 输出一个 markdown 文件到 `src/content/blog/best-${slug}.md`：

```js
// scripts/generate-blog-posts.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const { tools } = await import('../src/data/tools/index.ts');

const outDir = resolve(process.cwd(), 'src/content/blog');
await mkdir(outDir, { recursive: true });

function generateBody(tool) {
  return [
    `## What is the ${tool.title}?`,
    ``,
    `The ${tool.title} is a free online tool designed to help entrepreneurs and indie makers ${tool.description.toLowerCase()}. It's part of our suite of 30 free business calculators, all built to help you build and grow your business without spending a dime.`,
    ``,
    // ... same 6-section template as blog-posts.ts lines 20-54
  ].join('\n');
}

for (const tool of tools) {
  const filename = `best-${tool.slug}.md`;
  const frontmatter = [
    `---`,
    `title: '${tool.title.replace(/'/g, "\\'")}'`,
    `excerpt: '${tool.description}'`,
    `ogImage: '${tool.slug}'`,
    `toolSlug: '${tool.slug}'`,
    `---`,
  ].join('\n');
  const body = generateBody(tool);
  const content = `${frontmatter}\n\n${body}\n`;
  await writeFile(resolve(outDir, filename), content, 'utf-8');
}

console.log(`Generated ${tools.length} blog posts to ${outDir}`);
```

**Frontmatter 字面量 vs Astro YAML 解析**：直接输出原始字符串而不通过 gray-matter 解析可以确保 round-trip 一致。**风险：** excerpt 里有撇号 `it's`——需要单引号包并 escape 内嵌撇号（用 `\\'`）。验证手段：第一次生成后跑 `pnpm build` 看 Astro 是否报错。

### `package.json` 新增

```json
"scripts": {
  "gen:blog": "node scripts/generate-blog-posts.mjs"
}
```

## File Structure

| 文件 | 操作 | 行数预估 |
|---|---|---|
| `src/content/config.ts` | Create | ~12 |
| `src/content/blog/best-*.md` | Create × 32 | ~17/篇，32 篇共 ~544 行（git tracked） |
| `src/lib/blog.ts` | Create | ~50 |
| `scripts/generate-blog-posts.mjs` | Create | ~70 |
| `src/data/blog-posts.ts` | **Delete** | -55 |
| `src/pages/[lang]/blog/[slug].astro` | Modify | import + async/await（~3 行净） |
| `src/pages/[lang]/blog/index.astro` | Modify | import + async/await（~3 行净） |
| `src/pages/[lang]/{5 category}.astro` | Modify | import + async/await（~3 行净 × 5） |
| `src/components/CategoryGuides.astro` | Modify | import 源换（~1 行净） |
| `tests/blog-hero-image.test.ts` | Modify | import 源换 + 改用 glob 读 md（~10 行净） |
| `tests/ab-split.test.ts` | Modify | line 64 import 源换（~1 行净） |
| `package.json` | Modify | +1 line (`gen:blog` script) |

**预计 commits:** 5（content config → 生成器 → md files（1 commit 32 files） → adapter → 消费方迁移）

## Consumer Migration 细节

### 8 个消费方逐一改造

| 文件 | 改动 |
|---|---|
| `pages/[lang]/blog/[slug].astro` | `getStaticPaths` 改 async、`const post = (await getBlogPostBySlug(slug))!`，删 import blogPosts |
| `pages/[lang]/blog/index.astro` | `getStaticPaths` 不动（不依赖 posts），`const posts = await getAllBlogPosts()`，删 import |
| `pages/[lang]/{5 category}.astro` | 每个 `const relatedBlogPosts = (await getBlogPostsByToolSlug(...))`，删 import |
| `components/CategoryGuides.astro` | props 类型不变（BlogPost），调用方传 `await getBlogPostsByToolSlug(...)` |

### Type Compatibility

`src/lib/blog.ts` 的 `BlogPost` 接口**逐字段匹配**原 `src/data/blog-posts.ts` 的 `BlogPost` 接口——所以 `CategoryGuides.astro` 的 props 类型无需改动。

### `tests/ab-split.test.ts` 改 line 64

从：
```ts
['src/data/blog-posts.ts', `from './tools'`],
```
改为：
```ts
['src/lib/blog.ts', `from './data/tools'`],
```

预期 import count 应该 -1（删 1 import）+1（新增 1 import）= 净 0。但整个 import-graph 数会有变化（`scripts/generate-blog-posts.mjs` 新增 1 个 import from tools）。需要实际跑 test 确认期望值。

### `tests/blog-hero-image.test.ts` 改造

从 `import('../src/data/blog-posts.ts')` 改成读 `src/content/blog/*.md`：

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const blogDir = resolve(process.cwd(), 'src/content/blog');
const files = readdirSync(blogDir).filter(f => f.endsWith('.md'));

const blogPosts = files.map(f => {
  const raw = readFileSync(resolve(blogDir, f), 'utf-8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`bad frontmatter in ${f}`);
  const fm: any = {};
  for (const line of m[1].split('\n')) {
    const [k, ...v] = line.split(':');
    fm[k.trim()] = v.join(':').trim().replace(/^['"]|['"]$/g, '');
  }
  return {
    slug: f.replace(/\.md$/, ''),
    title: fm.title,
    excerpt: fm.excerpt,
    ogImage: fm.ogImage,
    toolSlug: fm.toolSlug,
    content: m[2],
  };
});
```

## Error Handling

- **生成器跑失败**：单元测试可以加，但生成器是 dev-only 脚本，build 失败时已经在上游拦截（content collection Zod 校验会报错）。**简单 log + exit 1** 即可。
- **`getBlogPostBySlug` 返回 undefined**：`[slug].astro` 当前用 `if (!post) return Astro.redirect(...)` — 保留。
- **`tools.find(t => t.slug === toolSlug)` 返回 undefined**（理论不可能，所有 toolSlug 都从 tools 生成）：adapter 用 `?? toolSlug` fallback。
- **Astro Collection Zod 校验失败**（frontmatter 缺字段、类型错）：build 时 fail fast，CI 拦截。

## Testing

### 现有测试（必须全部 pass）

- `tests/blog-hero-image.test.ts` — 改造后 32 篇可读
- `tests/ab-split.test.ts` — line 64 import 源换 `lib/blog.ts`
- `tests/seo-schemas.test.ts` — 不受影响（无 blog 相关）
- `tests/classify-url.test.ts` — 不受影响

### 新增测试（可选，推荐加）

- `tests/blog-collection.test.ts` — 校验 32 个 md 存在 + 全部 frontmatter 必填字段 + slug 唯一 + toolSlug 都对应有效 tool
- 这个测试可以在生成器跑完后跑

### Build 验证

- `pnpm build` — 153 pages（blog 32 篇 × 2 lang = 64 不变）
- 抽样 `dist/en/blog/best-solopreneur-mrr-calculator/index.html` 与现状对比 — 主体内容应 byte-equivalent（除可能 Astro 注入的 microdata/hydration script）

## Acceptance Criteria

- [ ] `pnpm check` exit 0
- [ ] `pnpm build` 153 pages（不变）
- [ ] `tests/blog-hero-image.test.ts` 通过（32 篇可读）
- [ ] `tests/ab-split.test.ts` 通过
- [ ] 32 个 `src/content/blog/best-*.md` 全部存在 + frontmatter 4 字段完整
- [ ] `src/data/blog-posts.ts` 已删除
- [ ] 8 个消费方 import 源切换完毕
- [ ] 抽样 1 个 blog 页面 (`dist/en/blog/best-solopreneur-mrr-calculator/index.html`) 主体内容与现状 byte-equivalent（或仅有微小不可见差异如换行/空格）
- [ ] `pnpm gen:blog` 可重复运行生成同样 32 个 md（幂等）
- [ ] `git diff src/engines/ src/data/tools/ src/i18n/ astro.config.mjs` 空
- [ ] Pushed to `origin` (gitee/calcKit) + `github` (wlz679/forgeflow)
- [ ] `master` 未触碰

## Out of Scope

- Markdown 真渲染（## → h2、** → strong、列表 → ul）— 决策点 1 明确不做
- 新增人工 blog post（spec 只覆盖 32 篇机器生成内容）
- Blog 管理界面 / CMS
- 删除 `scripts/codegen-examples.mjs`（无 blog 关联）
- 改 blog 内容模板本身（仍是同样的 6 段模板）

## Risks

| Risk | Mitigation |
|---|---|
| Astro Collection Zod schema 拒绝 frontmatter（如 excerpt 有未转义引号） | 生成器用 single-quote 包字面量 + 转义内嵌 `'` 为 `\'`；首次生成后跑 `pnpm build` |
| `entry.body` 末尾多余 `\n` 导致渲染多一个空 `<p>` | 生成器 output 末尾不加额外 `\n`；首次 build 后 grep dist HTML 验证 |
| 32 篇同时进 git，diff 难审 | 用 `git add src/content/blog/` 后 `git log -p --stat` 看变化只是新增 |
| `tests/ab-split.test.ts` import count 期望值不准 | pre-flight 跑一遍看实际值，再设新期望 |
| Astro `getCollection('blog')` 性能（32 篇小文件） | 单 collection < 100 文件，build 性能影响 < 50ms |
| `scripts/generate-blog-posts.mjs` import `.ts` 文件需 tsx loader | 现有 `scripts/codegen-examples.mjs` 用同样模式（参考） |

## Rollback

```bash
git revert <spec2-first-sha>..<spec2-last-sha>  # 5 commits
```

Restores:
- `src/data/blog-posts.ts` 回 32 条 inline 数据
- `src/content/` 删除
- `src/lib/blog.ts` 删除
- 8 个消费方 import 回 `blog-posts.ts`
- 2 个测试 import 回原状

**注意：** rollback 不删除 `src/content/blog/*.md`（已 git tracked，需要单独 `git rm -r src/content/blog/`）。