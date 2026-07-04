# og:image Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 64 tool og:image cards (32 tools × 2 languages) automatically at build time using satori (JSX→SVG) + @resvg/resvg-js (SVG→PNG), committed as static files in `public/og/`. Replace the current `/og-default.png` placeholder with per-tool, per-language cards.

**Architecture:** Build script reads `og-samples.json` (32 hardcoded samples × 2 lang), `tools.ts` (titles), `categories.ts` (palette), and a React JSX template (`og-card.tsx`). For each (tool, lang) pair, satori renders an SVG, resvg renders it to a 1200×630 PNG, written to `public/og/<slug>-<lang>.png`. Run as a `prebuild` + `predev` hook. Tool/blog pages point to the per-page image; blog pages reuse the tool image (1:1 mapping from `blog-posts.ts`).

**Tech Stack:**
- `satori` 0.10+ — JSX → SVG (no Chromium, no DOM)
- `@resvg/resvg-js` 2.6+ — SVG → PNG (pure Rust, prebuilt binaries)
- `react` 18 — for createElement runtime
- Fonts: Inter (Latin) + Noto Sans SC (CJK) + Noto Color Emoji — committed to `scripts/fonts/` (git-tracked; CI reproducible)
- `tsx` 4.22 (already a devDep) — runs `.ts`/`.tsx` scripts without build step

**Scope:**
- 32 tool og:images × 2 lang = 64 PNG files in `public/og/` (gitignored, generated)
- 3 font files in `scripts/fonts/` (git-tracked)
- 1 React JSX template
- 1 build script
- 1 sample data JSON
- 1 category palette TS
- 1 download-fonts script (one-time, idempotent)
- `package.json` scripts (`prebuild`, `predev`, `build:og`, `check:og`)
- `.gitignore` (exclude `public/og/`)
- Wire og:image in tool pages (32 × 2 = 64)
- Wire og:image in blog pages (32 × 2 = 64, reuse tool)

**Out of scope:**
- Blog-specific og:images (1:1 with tool via `blog-posts.ts` — reuse)
- Per-blog custom layouts
- Dynamic og:image generation at runtime (static only)

**Pre-flight note (drift from design doc):** Design stated "blog 不存在" — incorrect. User confirmed: blogs reuse tool og:image (1:1 mapping exists). No scope expansion needed in Plan B.

**Execution order dependency:** This plan MUST run after [`2026-06-25-seo-schema-sitemap.md`](./2026-06-25-seo-schema-sitemap.md) (Plan A) Task 3 completes — `scripts/build-og-images.ts` imports `tools` from `src/data/tools.ts`, which gains a required `applicationCategory` field in Plan A Task 3. If executed standalone before Plan A, the build script fails typecheck. PR sequencing: Plan A ships first (PR1), Plan B ships second (PR2).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `scripts/fonts/Inter-Regular.otf` | **NEW** (git-tracked) | Latin regular weight |
| `scripts/fonts/Inter-Bold.otf` | **NEW** (git-tracked) | Latin bold weight |
| `scripts/fonts/Inter-Black.otf` | **NEW** (git-tracked) | Latin black weight (display) |
| `scripts/fonts/NotoSansSC-Regular.otf` | **NEW** (git-tracked) | CJK regular |
| `scripts/fonts/NotoColorEmoji.ttf` | **NEW** (git-tracked) | Color emoji rendering |
| `scripts/download-og-fonts.mjs` | **NEW** | One-time downloader; idempotent |
| `scripts/templates/og-card.tsx` | **NEW** | React JSX template (1200×630) |
| `scripts/templates/category-palette.ts` | **NEW** | 6-category color palette + emoji |
| `scripts/build-og-images.ts` | **NEW** | Main renderer: satori + resvg batch |
| `src/data/og-samples.json` | **NEW** | 32 tools × `{inputs, headline, headlineUnit, headlineLabel, trend}` (en+zh fields) |
| `src/pages/[lang]/[slug].astro` | Modify | Add `ogImage` prop to BaseLayout |
| `src/pages/[lang]/blog/[slug].astro` | Modify | Add `ogImage` prop pointing to tool image |
| `package.json` | Modify | Add deps + scripts |
| `.gitignore` | Modify | Add `public/og/` |

**Not touched:** existing engines, schemas, layouts, or other plans.

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add production deps**

The satori + resvg stack has no transitive deps that conflict with Astro 4. Run:
```bash
pnpm add satori @resvg/resvg-js react react-dom
```
Expected: package.json `dependencies` block now includes all 4.

- [ ] **Step 2: Add `@types/react` and `@types/react-dom` as devDeps**

```bash
pnpm add -D @types/react @types/react-dom
```
Expected: `devDependencies` block gains the two @types packages.

- [ ] **Step 3: Verify install**

Run: `pnpm install`
Expected: 0 errors. `node_modules/satori/`, `node_modules/@resvg/`, `node_modules/react/` exist.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add satori + @resvg/resvg-js + react for og:image generation"
```

---

## Task 2: Download fonts (git-tracked)

**Files:**
- Create: `scripts/download-og-fonts.mjs`
- Create: `scripts/fonts/Inter-Regular.otf`
- Create: `scripts/fonts/Inter-Bold.otf`
- Create: `scripts/fonts/Inter-Black.otf`
- Create: `scripts/fonts/NotoSansSC-Regular.otf`
- Create: `scripts/fonts/NotoColorEmoji.ttf`

Fonts are committed to git (~6MB total) so CI doesn't need network at build time. Download from stable GitHub raw URLs.

- [ ] **Step 1: Create `scripts/download-og-fonts.mjs`**

```js
// Idempotent font downloader. Safe to re-run.
// Downloads og:image fonts to scripts/fonts/. Committed to git so CI is offline-safe.

import { mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, 'fonts');

// Stable GitHub raw URLs. Update only if upstream repos move.
const FONTS = [
  { name: 'Inter-Regular.otf',     url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.otf' },
  { name: 'Inter-Bold.otf',        url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.otf' },
  { name: 'Inter-Black.otf',       url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Black.otf' },
  { name: 'NotoSansSC-Regular.otf', url: 'https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf' },
  { name: 'NotoColorEmoji.ttf',    url: 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf' },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const stream = createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => stream.close(resolve));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  mkdirSync(FONTS_DIR, { recursive: true });
  for (const { name, url } of FONTS) {
    const dest = join(FONTS_DIR, name);
    if (existsSync(dest)) {
      console.log(`✓ ${name} already exists, skipping`);
      continue;
    }
    console.log(`↓ Downloading ${name}...`);
    await download(url, dest);
    console.log(`✓ ${name}`);
  }
  console.log('\nAll fonts ready in scripts/fonts/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run downloader**

Run: `node scripts/download-og-fonts.mjs`
Expected: 5 lines `✓ <name>`. If running for the first time, downloads all 5 files. Re-running should print "already exists, skipping" for all.

If a download fails (network block, repo moved), the script exits 1 with a clear message. Re-run later when network is restored.

- [ ] **Step 3: Verify all 5 files exist**

Run: `ls -lh scripts/fonts/`
Expected: 5 files, total ~6MB. Inter files ~300KB each, Noto Sans SC ~5MB, Noto Color Emoji ~400KB.

- [ ] **Step 4: Commit fonts**

```bash
git add scripts/download-og-fonts.mjs scripts/fonts/
git commit -m "chore(og-image): add Inter + Noto Sans SC + Noto Color Emoji fonts (committed for CI)"
```

---

## Task 3: Category palette

**Files:**
- Create: `scripts/templates/category-palette.ts`

Pure constant module. No tests needed (just data).

- [ ] **Step 1: Create `scripts/templates/category-palette.ts`**

```ts
// 6-category color palette for og:image gradient backgrounds.
// Color hex codes match design doc §4.4.1.

export interface CategoryPalette {
  primary: string;
  secondary: string;
  emoji: string;
}

export const CATEGORY_PALETTE: Record<string, CategoryPalette> = {
  A: { primary: '#7C3AED', secondary: '#F97316', emoji: '📊' },  // SaaS Metrics
  B: { primary: '#0EA5E9', secondary: '#06B6D4', emoji: '🤖' },  // AI Cost Tools
  C: { primary: '#10B981', secondary: '#84CC16', emoji: '💎' },  // Valuation & Exit
  D: { primary: '#EC4899', secondary: '#F43F5E', emoji: '💼' },  // Freelance Pricing
  E: { primary: '#F59E0B', secondary: '#EF4444', emoji: '⚡' },  // Cost & Efficiency
  F: { primary: '#6366F1', secondary: '#8B5CF6', emoji: '📈' },  // Investment & ROI
};

export function getCategoryPalette(categoryId: string): CategoryPalette {
  return CATEGORY_PALETTE[categoryId] ?? CATEGORY_PALETTE.A;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/templates/category-palette.ts
git commit -m "feat(og-image): add 6-category color palette"
```

---

## Task 4: og-samples.json — sample data for 32 tools

**Files:**
- Create: `src/data/og-samples.json`

Hardcoded sample inputs + headline/unit/label/trend for each tool. Bilingual (en + zh fields).

- [ ] **Step 1: Create `src/data/og-samples.json`**

```json
{
  "solopreneur-mrr-calculator": {
    "headline": { "en": "$73,500", "zh": "$73,500" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Monthly Recurring Revenue", "zh": "月度经常性收入" },
    "trend": { "en": "▲ +12% MoM", "zh": "▲ 月环比 +12%" }
  },
  "solopreneur-burn-rate-calculator": {
    "headline": { "en": "$42,500", "zh": "$42,500" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Monthly Burn Rate", "zh": "月度烧钱速度" },
    "trend": { "en": "⚠️ 14mo runway", "zh": "⚠️ 14 个月跑道" }
  },
  "solopreneur-churn-rate-calculator": {
    "headline": { "en": "3.2%", "zh": "3.2%" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Monthly Churn Rate", "zh": "月度流失率" }
  },
  "solopreneur-market-size-estimator": {
    "headline": { "en": "$1.5B", "zh": "$15亿" },
    "headlineUnit": { "en": "TAM", "zh": "TAM" },
    "headlineLabel": { "en": "Total Addressable Market", "zh": "可触达市场总量" },
    "trend": { "en": "▲ 12% CAGR", "zh": "▲ 年复合增长 12%" }
  },
  "solopreneur-revenue-projector": {
    "headline": { "en": "$156K", "zh": "$156K" },
    "headlineUnit": { "en": "in 12mo", "zh": "12 个月内" },
    "headlineLabel": { "en": "Projected MRR", "zh": "预测 MRR" },
    "trend": { "en": "▲ from $5K", "zh": "▲ 从 $5K 起步" }
  },
  "solopreneur-cac-calculator": {
    "headline": { "en": "$215", "zh": "$215" },
    "headlineUnit": { "en": "/customer", "zh": "/客户" },
    "headlineLabel": { "en": "Customer Acquisition Cost", "zh": "获客成本" }
  },
  "solopreneur-ltv-calculator": {
    "headline": { "en": "$2,400", "zh": "$2,400" },
    "headlineUnit": { "en": "LTV", "zh": "LTV" },
    "headlineLabel": { "en": "Customer Lifetime Value", "zh": "用户终身价值" },
    "trend": { "en": "▲ LTV:CAC 11x", "zh": "▲ LTV:CAC 11 倍" }
  },
  "solopreneur-unit-economics-calculator": {
    "headline": { "en": "$48", "zh": "$48" },
    "headlineUnit": { "en": "/customer", "zh": "/客户" },
    "headlineLabel": { "en": "Avg Margin per Customer", "zh": "单客户平均利润" },
    "trend": { "en": "✅ healthy", "zh": "✅ 健康" }
  },
  "solopreneur-saas-valuation-calculator": {
    "headline": { "en": "$24M", "zh": "$2400万" },
    "headlineUnit": { "en": "valuation", "zh": "估值" },
    "headlineLabel": { "en": "Estimated SaaS Valuation", "zh": "SaaS 公司估值" },
    "trend": { "en": "▲ 12x multiple", "zh": "▲ 12 倍倍数" }
  },
  "solopreneur-equity-dilution-calculator": {
    "headline": { "en": "18.5%", "zh": "18.5%" },
    "headlineUnit": { "en": "dilution", "zh": "稀释" },
    "headlineLabel": { "en": "Founder Dilution", "zh": "创始人股权稀释" }
  },
  "solopreneur-break-even-calculator": {
    "headline": { "en": "8", "zh": "8" },
    "headlineUnit": { "en": "months", "zh": "个月" },
    "headlineLabel": { "en": "Time to Break-Even", "zh": "回本周期" }
  },
  "solopreneur-freelance-rate-calculator": {
    "headline": { "en": "$95", "zh": "$95" },
    "headlineUnit": { "en": "/hour", "zh": "/小时" },
    "headlineLabel": { "en": "Recommended Hourly Rate", "zh": "推荐时薪" }
  },
  "solopreneur-course-pricing-calculator": {
    "headline": { "en": "$199", "zh": "$199" },
    "headlineUnit": { "en": "/course", "zh": "/课程" },
    "headlineLabel": { "en": "Optimal Course Price", "zh": "课程定价" }
  },
  "solopreneur-time-value-calculator": {
    "headline": { "en": "$48", "zh": "$48" },
    "headlineUnit": { "en": "/hour", "zh": "/小时" },
    "headlineLabel": { "en": "Time Value", "zh": "时间价值" }
  },
  "solopreneur-sponsorship-rate-calculator": {
    "headline": { "en": "$3,500", "zh": "$3,500" },
    "headlineUnit": { "en": "/episode", "zh": "/单期" },
    "headlineLabel": { "en": "Sponsorship Rate", "zh": "赞助费率" }
  },
  "solopreneur-affiliate-income-calculator": {
    "headline": { "en": "$4,200", "zh": "$4,200" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Monthly Affiliate Income", "zh": "月度联盟营销收入" },
    "trend": { "en": "▲ +20% growth", "zh": "▲ 增长 20%" }
  },
  "solopreneur-email-list-revenue-calculator": {
    "headline": { "en": "$12K", "zh": "$12K" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Email List Revenue", "zh": "邮件列表营收" }
  },
  "solopreneur-hourly-vs-fixed-calculator": {
    "headline": { "en": "$105", "zh": "$105" },
    "headlineUnit": { "en": "/hour", "zh": "/小时" },
    "headlineLabel": { "en": "Break-Even Hourly Rate", "zh": "平衡时薪" }
  },
  "solopreneur-project-profitability-calculator": {
    "headline": { "en": "$2,400", "zh": "$2,400" },
    "headlineUnit": { "en": "profit", "zh": "利润" },
    "headlineLabel": { "en": "Project Profit", "zh": "项目利润" },
    "trend": { "en": "▲ 48% margin", "zh": "▲ 利润率 48%" }
  },
  "solopreneur-employee-cost-calculator": {
    "headline": { "en": "$104K", "zh": "$104K" },
    "headlineUnit": { "en": "/year", "zh": "/年" },
    "headlineLabel": { "en": "True Employee Cost", "zh": "真实员工成本" }
  },
  "solopreneur-meeting-cost-calculator": {
    "headline": { "en": "$1,125", "zh": "$1,125" },
    "headlineUnit": { "en": "/week", "zh": "/周" },
    "headlineLabel": { "en": "Weekly Meeting Cost", "zh": "周会议成本" }
  },
  "solopreneur-productivity-score": {
    "headline": { "en": "78", "zh": "78" },
    "headlineUnit": { "en": "/100", "zh": "/100" },
    "headlineLabel": { "en": "Productivity Score", "zh": "生产力分数" },
    "trend": { "en": "✅ strong", "zh": "✅ 优秀" }
  },
  "solopreneur-saas-pricing-planner": {
    "headline": { "en": "$49", "zh": "$49" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Recommended Price Point", "zh": "推荐定价点" }
  },
  "solopreneur-freelance-tax-calculator": {
    "headline": { "en": "$31,500", "zh": "$31,500" },
    "headlineUnit": { "en": "/year", "zh": "/年" },
    "headlineLabel": { "en": "Estimated Tax Owed", "zh": "应缴税款" }
  },
  "solopreneur-openai-token-calculator": {
    "headline": { "en": "$42", "zh": "$42" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "OpenAI API Cost", "zh": "OpenAI API 成本" }
  },
  "solopreneur-claude-api-cost-calculator": {
    "headline": { "en": "$58", "zh": "$58" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Claude API Cost", "zh": "Claude API 成本" }
  },
  "solopreneur-deepseek-api-cost-calculator": {
    "headline": { "en": "$7", "zh": "$7" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "DeepSeek API Cost", "zh": "DeepSeek API 成本" },
    "trend": { "en": "▲ 8x cheaper", "zh": "▲ 便宜 8 倍" }
  },
  "solopreneur-gemini-api-cost-calculator": {
    "headline": { "en": "$35", "zh": "$35" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Gemini API Cost", "zh": "Gemini API 成本" }
  },
  "solopreneur-ai-image-cost-calculator": {
    "headline": { "en": "$120", "zh": "$120" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Image Generation Cost", "zh": "AI 图像生成成本" }
  },
  "solopreneur-ai-training-cost-estimator": {
    "headline": { "en": "$48K", "zh": "$48K" },
    "headlineUnit": { "en": "training", "zh": "训练" },
    "headlineLabel": { "en": "70B Model Training Cost", "zh": "70B 模型训练成本" }
  },
  "solopreneur-gpu-cloud-cost-calculator": {
    "headline": { "en": "$2.40", "zh": "$2.40" },
    "headlineUnit": { "en": "/hour", "zh": "/小时" },
    "headlineLabel": { "en": "H100 Cloud Cost", "zh": "H100 云端时租" }
  },
  "solopreneur-ai-api-cost-comparison": {
    "headline": { "en": "$42", "zh": "$42" },
    "headlineUnit": { "en": "saved/mo", "zh": "/月节省" },
    "headlineLabel": { "en": "Cheapest Provider Found", "zh": "最便宜厂商" },
    "trend": { "en": "▲ vs $58 baseline", "zh": "▲ 对比 $58 基线" }
  }
}
```

- [ ] **Step 2: Verify JSON parses**

Run: `node -e "const d = require('./src/data/og-samples.json'); console.log('Slugs:', Object.keys(d).length); console.log('Has translations:', !!d['solopreneur-mrr-calculator'].headline.en && !!d['solopreneur-mrr-calculator'].headline.zh);"`
Expected: `Slugs: 32`, `Has translations: true`.

If count is not 32, re-check the JSON above — most likely cause is a stray comma or missing entry.

- [ ] **Step 3: Verify each entry has the required shape**

Run:
```bash
node -e "
const d = require('./src/data/og-samples.json');
const required = ['headline', 'headlineUnit', 'headlineLabel'];
let bad = 0;
for (const [slug, s] of Object.entries(d)) {
  for (const k of required) {
    if (!s[k] || !s[k].en || !s[k].zh) { console.log('MISSING', slug, k); bad++; }
  }
  if (s.trend && (!s.trend.en || !s.trend.zh)) { console.log('BAD TREND', slug); bad++; }
}
console.log('Bad fields:', bad);
"
```
Expected: `Bad fields: 0`.

- [ ] **Step 4: Commit**

```bash
git add src/data/og-samples.json
git commit -m "feat(og-image): add bilingual sample data for 32 tools"
```

---

## Task 5: og-card React template

**Files:**
- Create: `scripts/templates/og-card.tsx`

React JSX template. Satori-compatible (flex-only, no grid/transform). Uses `import React from 'react'` (classic JSX) so no tsconfig change needed.

- [ ] **Step 1: Create `scripts/templates/og-card.tsx`**

```tsx
import React from 'react';
import { CATEGORY_PALETTE } from './category-palette';

export interface OgCardProps {
  title: string;
  categoryId: string;
  categoryName: string;
  lang: 'en' | 'zh';
  headline: string;
  headlineUnit: string;
  headlineLabel: string;
  trend?: string;
  url: string;
}

export function OgCard(props: OgCardProps) {
  const { title, categoryId, categoryName, lang, headline, headlineUnit, headlineLabel, trend, url } = props;
  const palette = CATEGORY_PALETTE[categoryId] ?? CATEGORY_PALETTE.A;

  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
        padding: '80px',
        color: 'white',
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {/* Left column: title block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '24px',
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            🎬
          </div>
          ForgeFlowKit
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '56px',
            fontWeight: 800,
            marginTop: '60px',
            lineHeight: 1.1,
            maxWidth: '600px',
            display: 'flex',
          }}
        >
          {title}
        </div>

        {/* Category badge */}
        <div
          style={{
            fontSize: '24px',
            opacity: 0.9,
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{palette.emoji}</span>
          <span>{categoryName}</span>
        </div>

        {/* URL footer */}
        <div
          style={{
            fontSize: '20px',
            opacity: 0.7,
            position: 'absolute',
            bottom: 0,
            display: 'flex',
          }}
        >
          {url}
        </div>
      </div>

      {/* Right column: result card */}
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          color: '#1F2937',
          borderRadius: '24px',
          padding: '40px',
          width: '460px',
          height: '360px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            fontSize: '80px',
            fontWeight: 900,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'baseline',
            color: palette.primary,
          }}
        >
          <span>{headline}</span>
          <span style={{ fontSize: '32px', fontWeight: 600, marginLeft: '8px', color: '#6B7280' }}>
            {headlineUnit}
          </span>
        </div>
        <div
          style={{
            fontSize: '24px',
            color: '#6B7280',
            marginTop: '16px',
            display: 'flex',
          }}
        >
          {headlineLabel}
        </div>
        {trend && (
          <div
            style={{
              fontSize: '20px',
              color: '#10B981',
              marginTop: '16px',
              fontWeight: 600,
              display: 'flex',
            }}
          >
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify template is syntactically valid**

Run: `npx tsx --eval "import('./scripts/templates/og-card.tsx').then(m => console.log('exports:', Object.keys(m)))"`
Expected: `exports: [ 'OgCard', 'CATEGORY_PALETTE' ]` (or similar — both `OgCard` function and `CATEGORY_PALETTE` constant).

If you get "Cannot find module", run from project root.

- [ ] **Step 3: Commit**

```bash
git add scripts/templates/og-card.tsx
git commit -m "feat(og-image): add 1200x630 og-card JSX template"
```

---

## Task 6: Build script (satori + resvg)

**Files:**
- Create: `scripts/build-og-images.ts`

Main renderer. Reads tools/samples/categories/fonts, iterates 32 × 2 lang, renders SVG → PNG.

- [ ] **Step 1: Create `scripts/build-og-images.ts`**

```ts
// Build 64 og:image cards (32 tools × 2 lang) into public/og/.
// Run via `pnpm build:og` (manual) or `prebuild`/`predev` (automatic).

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

import { tools } from '../src/data/tools';
import { categories } from '../src/data/categories';
import ogSamples from '../src/data/og-samples.json' with { type: 'json' };
import { OgCard } from './templates/og-card';
import { CATEGORY_PALETTE } from './templates/category-palette';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FONTS_DIR = join(ROOT, 'scripts', 'fonts');
const OUT_DIR = join(ROOT, 'public', 'og');

const LANGS = ['en', 'zh'] as const;
type Lang = (typeof LANGS)[number];

// CLI flags
const args = new Set(process.argv.slice(2));
const devMode = args.has('--dev');      // only render 1 image
const checkMode = args.has('--check');  // verify all 64 exist, don't write
const slugArg = [...args].find(a => a.startsWith('--slug='))?.split('=')[1];

interface Sample {
  headline: Record<Lang, string>;
  headlineUnit: Record<Lang, string>;
  headlineLabel: Record<Lang, string>;
  trend?: Record<Lang, string>;
}

function loadFont(filename: string): Buffer {
  const p = join(FONTS_DIR, filename);
  if (!existsSync(p)) throw new Error(`Font not found: ${p}. Run: node scripts/download-og-fonts.mjs`);
  return readFileSync(p);
}

async function renderOne(slug: string, lang: Lang): Promise<Buffer> {
  const tool = tools.find(t => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  const cat = categories.find(c => c.id === tool.categoryId);
  if (!cat) throw new Error(`Unknown category for ${slug}: ${tool.categoryId}`);

  const sample = (ogSamples as Record<string, Sample>)[slug];
  if (!sample) throw new Error(`Missing og-sample for ${slug}`);

  // Translated tool title (no async — we use English-only here; og-samples already bilingual
  // for headline. The tool title is read from tools.ts which is English-only in data;
  // we render it as-is. For zh og:images, accept English title for v1; can localize later.)
  const title = tool.title;
  const categoryName = cat.name;
  const url = `forgeflowkit.com/${lang}/${slug}`;

  const element = React.createElement(OgCard, {
    title,
    categoryId: tool.categoryId,
    categoryName,
    lang,
    headline: sample.headline[lang],
    headlineUnit: sample.headlineUnit[lang],
    headlineLabel: sample.headlineLabel[lang],
    trend: sample.trend?.[lang],
    url,
  });

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter',         data: loadFont('Inter-Regular.otf'),     weight: 400, style: 'normal' },
      { name: 'Inter',         data: loadFont('Inter-Bold.otf'),        weight: 700, style: 'normal' },
      { name: 'Inter',         data: loadFont('Inter-Black.otf'),       weight: 900, style: 'normal' },
      { name: 'Noto Sans SC',  data: loadFont('NotoSansSC-Regular.otf'), weight: 400, style: 'normal' },
      { name: 'Noto Color Emoji', data: loadFont('NotoColorEmoji.ttf'),  weight: 400, style: 'normal' },
    ],
    embedFont: true,
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { loadSystemFonts: false },
  }).render().asPng();

  return Buffer.from(png);
}

function buildTargets(): Array<{ slug: string; lang: Lang }> {
  if (slugArg) {
    return LANGS.map(lang => ({ slug: slugArg, lang }));
  }
  const toolsList = devMode ? tools.slice(0, 1) : tools;
  const out: Array<{ slug: string; lang: Lang }> = [];
  for (const t of toolsList) {
    for (const lang of LANGS) {
      out.push({ slug: t.slug, lang });
    }
  }
  return out;
}

async function main() {
  if (checkMode) {
    // Verify all 64 exist with size > 10KB
    let missing = 0;
    let small = 0;
    for (const { slug, lang } of buildTargets()) {
      const p = join(OUT_DIR, `${slug}-${lang}.png`);
      if (!existsSync(p)) { console.log(`MISSING: ${slug}-${lang}.png`); missing++; continue; }
      const sz = statSync(p).size;
      if (sz < 10000) { console.log(`TOO SMALL: ${slug}-${lang}.png (${sz}b)`); small++; }
    }
    console.log(`\n${tools.length * LANGS.length} target images. Missing: ${missing}, TooSmall: ${small}`);
    if (missing || small) process.exit(1);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const targets = buildTargets();
  console.log(`Rendering ${targets.length} og:images to ${OUT_DIR}/ ...`);
  let i = 0;
  for (const { slug, lang } of targets) {
    const png = await renderOne(slug, lang);
    const dest = join(OUT_DIR, `${slug}-${lang}.png`);
    writeFileSync(dest, png);
    i++;
    if (i % 8 === 0 || i === targets.length) {
      console.log(`  ${i}/${targets.length}`);
    }
  }
  console.log(`Done. ${i} images written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Type-check the script**

Run: `npx tsc --noEmit --moduleResolution bundler --module esnext --target es2022 --jsx react-jsx --esModuleInterop --skipLibCheck scripts/build-og-images.ts`
Expected: 0 errors. (Using `tsc --noEmit` against just this file avoids scanning the entire project.)

If `tsx` flag is missing, add `--jsx react-jsx`. If `with { type: 'json' }` import fails, use:
```ts
import ogSamplesRaw from '../src/data/og-samples.json';
const ogSamples = ogSamplesRaw as Record<string, Sample>;
```

- [ ] **Step 3: Smoke-test in `--dev` mode (1 image)**

Run: `npx tsx scripts/build-og-images.ts --dev`
Expected: "Rendering 2 og:images to .../public/og/ ..." (dev mode = first tool × 2 lang = 2 images). Files written: `public/og/solopreneur-burn-rate-calculator-en.png` and `-zh.png`.

- [ ] **Step 4: Verify dev-mode images**

Run: `ls -lh public/og/`
Expected: 2 PNG files, each 50-200KB.

Run: `file public/og/solopreneur-burn-rate-calculator-en.png`
Expected: `PNG image data, 1200 x 630, 8-bit/color RGBA, non-interlaced`.

- [ ] **Step 5: Visual sanity (open one image)**

If on macOS/Linux with a viewer, open one image and confirm:
- Background gradient is visible
- Title text is readable (English)
- Right card shows headline + label
- No text overflow / truncation
- No "missing glyph" boxes (□) for any character

If on Windows headless (CI), skip — task 7's check + manual review later suffices.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-og-images.ts
git commit -m "feat(og-image): add satori + resvg build script for 32x2 cards"
```

---

## Task 7: Wire `og:image` into tool pages

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:112` (BaseLayout call)

- [ ] **Step 1: Add `ogImage` prop to BaseLayout call in tool pages**

In `src/pages/[lang]/[slug].astro`, replace line 112:

```astro
<BaseLayout title={metaTitle} description={toolDescription} schema={schema} pageType="tool">
```

with:

```astro
<BaseLayout title={metaTitle} description={toolDescription} schema={schema} pageType="tool" ogImage={`/og/${slug}-${lang}.png`}>
```

- [ ] **Step 2: Build to confirm og:image tag rendered**

Run: `pnpm build`
Expected: 0 errors. Each tool page HTML now contains `<meta property="og:image" content="/og/solopreneur-mrr-calculator-en.png" />` (or -zh.png for zh).

Run: `grep 'og:image' dist/en/mrr-calculator/index.html`
Expected: `<meta property="og:image" content="/og/solopreneur-mrr-calculator-en.png" />`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro
git commit -m "feat(seo): wire per-tool og:image in tool pages"
```

---

## Task 8: Wire `og:image` into blog pages (reuse tool images)

**Files:**
- Modify: `src/pages/[lang]/blog/[slug].astro:27` (BaseLayout call)

`blog-posts.ts:12` confirms each post is `tools.map(...)`, so `post.toolSlug === tools[i].slug`. Reuse `/og/<toolSlug>-<lang>.png`.

- [ ] **Step 1: Add `ogImage` to blog post BaseLayout**

In `src/pages/[lang]/blog/[slug].astro`, replace line 27:

```astro
<BaseLayout title={metaTitle} description={metaDescription} schema={articleSchema} pageType="article">
```

with:

```astro
<BaseLayout title={metaTitle} description={metaDescription} schema={articleSchema} pageType="article" ogImage={`/og/${post.toolSlug}-${lang}.png`}>
```

- [ ] **Step 2: Build + verify blog page references valid image**

Run: `pnpm build`
Run: `grep 'og:image' dist/en/blog/best-solopreneur-mrr-calculator/index.html`
Expected: `<meta property="og:image" content="/og/solopreneur-mrr-calculator-en.png" />`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/\[lang\]/blog/\[slug\].astro
git commit -m "feat(seo): wire og:image in blog posts (reuses tool image)"
```

---

## Task 9: Add package.json scripts and gitignore

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add npm scripts**

In `package.json`, add to the `scripts` block:

```json
"prebuild": "tsx scripts/build-og-images.ts",
"predev": "tsx scripts/build-og-images.ts --dev",
"build:og": "tsx scripts/build-og-images.ts",
"check:og": "tsx scripts/build-og-images.ts --check"
```

- [ ] **Step 2: Verify scripts parse**

Run: `pnpm run build:og`
Expected: full build of 64 images takes 30-90s. Outputs `Done. 64 images written.`

(Note: `pnpm run` is required when invoking scripts directly; `pnpm prebuild` would not work standalone — use `pnpm run build:og`. The `prebuild` hook fires automatically before `pnpm build`.)

- [ ] **Step 3: Add `public/og/` to `.gitignore`**

Append to `.gitignore`:

```
public/og/
```

- [ ] **Step 4: Verify gitignore works**

Run: `git status`
Expected: `public/og/` does not appear in untracked files. Generated PNGs are gitignored.

Run: `ls public/og/ | wc -l`
Expected: `64`.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore
git commit -m "chore(og-image): add build scripts + gitignore public/og/"
```

---

## Task 10: End-to-end validation

**Files:** none (validation only)

- [ ] **Step 1: Clean build from scratch**

Run: `rm -rf public/og dist && pnpm build`
Expected: 0 errors. 64 PNGs generated in `public/og/`. Build completes in <2 min total (og-image adds 30-90s).

- [ ] **Step 2: Verify image count**

Run: `ls public/og/ | wc -l`
Expected: 64.

- [ ] **Step 3: Verify all images are valid PNGs of correct size**

Run:
```bash
for f in public/og/*.png; do
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")
  if [ "$size" -lt 10000 ]; then echo "TOO SMALL: $f ($size b)"; fi
done
file public/og/solopreneur-mrr-calculator-en.png public/og/solopreneur-mrr-calculator-zh.png
```
Expected: no "TOO SMALL" lines. `file` output: `1200 x 630` PNG for both.

- [ ] **Step 4: Run `--check` mode**

Run: `pnpm run check:og`
Expected: "64 target images. Missing: 0, TooSmall: 0". Exit 0.

- [ ] **Step 5: Sample-build a page and verify og:image wiring**

Run: `pnpm preview &` (or run dev: `pnpm dev`).
In another terminal:
```bash
curl -s http://localhost:4321/en/mrr-calculator/ | grep 'og:image'
curl -s http://localhost:4321/en/blog/best-solopreneur-mrr-calculator/ | grep 'og:image'
```
Expected:
- Tool page: `og:image content="/og/solopreneur-mrr-calculator-en.png"`
- Blog page: `og:image content="/og/solopreneur-mrr-calculator-en.png"` (reuses tool)

Stop the preview server.

- [ ] **Step 6: HTTP-fetch an og:image and verify Content-Type**

Run:
```bash
curl -sI http://localhost:4321/og/solopreneur-mrr-calculator-en.png | head -3
```
Expected: `HTTP/1.1 200 OK`, `Content-Type: image/png`.

(Or test via `pnpm preview` and `curl` against the preview port.)

- [ ] **Step 7: Visual spot-check (manual)**

Open these PNGs locally and confirm they render correctly:
- `public/og/solopreneur-mrr-calculator-en.png` — English MRR card
- `public/og/solopreneur-mrr-calculator-zh.png` — Chinese MRR card (verify 月度经常性收入 renders, no □ boxes)
- `public/og/solopreneur-ai-image-cost-calculator-en.png` — different category color (blue/cyan)
- `public/og/solopreneur-freelance-tax-calculator-en.png` — indigo/purple gradient

Expected: each card shows tool title, category name + emoji, URL footer, right card with headline + label. No truncation. No missing glyphs.

- [ ] **Step 8: Confirm git status clean**

Run: `git status`
Expected: `public/og/` is ignored. No untracked PNGs.

---

## Acceptance Criteria (mirror design §6 Phase 2)

- [ ] `pnpm build:og` exit 0, all 64 images generated
- [ ] All 64 PNGs are 1200×630
- [ ] `pnpm run check:og` exit 0 (no missing, no undersized)
- [ ] All 64 PNGs > 10KB
- [ ] Tool pages (64) have `og:image="/og/<slug>-<lang>.png"`
- [ ] Blog pages (64) have `og:image="/og/<toolSlug>-<lang>.png"` (1:1 reuse)
- [ ] HTTP-fetched og:image returns 200 with `Content-Type: image/png`
- [ ] Chinese og:images render CJK without missing-glyph boxes
- [ ] Different categories show different gradient colors
- [ ] `git status` shows `public/og/` is ignored
- [ ] Fonts committed to git (offline build works)

## Rollback Plan

| Failure mode | Rollback |
|---|---|
| satori crashes at build | `git revert <last-commit>` — `prebuild` hook bypassed with `pnpm build --ignore-scripts` (or remove `prebuild` script temporarily); site still builds with `/og-default.png` |
| Image visually broken | Regenerate that single slug: `pnpm build:og --slug=<slug>`. No full rebuild needed. |
| Font missing | Re-run `node scripts/download-og-fonts.mjs` (downloads to `scripts/fonts/`, gitignored only the build output) |
| CJK missing glyphs | Verify `NotoSansSC-Regular.otf` exists in `scripts/fonts/`; re-download if corrupt |
| Resvg binary missing on arm64 CI | `@resvg/resvg-js` ships prebuilt binaries for all common platforms; if CI fails, check `node_modules/@resvg/resvg-js-*/` for native binary. Falls back: `pnpm add --save-optional @resvg/resvg-js-linux-arm64-gnu` (etc.) |
| Build time too slow | Use `--dev` mode for `predev` (already set); if `prebuild` is too slow, add a hash-based incremental check in `build-og-images.ts` (out of scope for this plan) |

## Risk & Mitigations

| Risk | Mitigation |
|---|---|
| satori breaks on complex flex layouts | Template is flex-only by design; tested in Task 6 Step 5 |
| Chinese text not rendered | Noto Sans SC font is in `scripts/fonts/` and passed to satori; Task 4 Step 7 verifies CJK samples |
| Emoji not rendered | Noto Color Emoji font passed; emoji uses Unicode codepoints that satori passes through |
| Color hex mismatch | Template uses 6-digit hex; satori supports 8-digit hex with alpha if needed |
| `og-samples.json` schema drift | Task 4 Step 3 verifies shape |
| Build script can't import `.ts` files | Used `tsx` (already a devDep); Task 6 Step 2 typechecks standalone |
| Long Chinese strings overflow card | Card has fixed 460px width; samples kept short. If overflow occurs, reduce font size or wrap in container with `display:flex` (satori doesn't support text wrapping natively — keep strings short) |