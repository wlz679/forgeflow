# P168 批次 3 B3-2 —— 工具页 `<title>` 瘦身 + 中文保留审计

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 100 个工具页新增 `tools.<slug>.seoTitle`（en + zh 各 100 条 = 200 条）并让 `<title>` 改用它（≤ 60 字符、保留功能关键词段、去掉年份与品牌后缀），同时交付一个可复算的中文页质量审计工具。

**Architecture:** 沿用 P167 的「短名 / 长名 / SEO 名」三层分工 —— 新增第三层 `seoTitle` 专供 `<title>`。**`title` 一字不动**（P167 守卫硬断言 `shortTitle` 是 `title` 的前缀）；`og:title` / `twitter:title` / JSON-LD `name` / h1 / 面包屑 / RelatedTools **全部继续用长名** ⇒ 「只改 `<title>`」这条边界由守卫钉住。

**Tech Stack:** Astro 5 · TypeScript · `node:test`（tsx 运行）· JSON locale · 纯 JS 生成脚本

## Global Constraints

- 规格：`docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md` §19.27（已提交 `83fa9c6`）
- **`title` 一字不动** —— P167 的 `tool-card-title-guard` 硬断言「`shortTitle` 必须是 `title` 的前缀」（100 工具 × 2 语言）⇒ 改 `title` 的关键词段会集体破守卫。
- **只改 `<title>`** —— `og:title` / `twitter:title` / JSON-LD `name` / h1 / 面包屑 / RelatedTools 继续用长名（`${toolTitle} — ForgeFlowKit`）。
- **`seoTitle` ≤ 60 字符**（写死字面量，不写「尽量短」）；**不得**含 `(2026)` / `（2026）` / ` — ForgeFlowKit`。
- **术语括号必须保留**：`（NRR）` `（GRR）` `（DAU/MAU）` `（CSAT）` `（ACV）` `（买翻新租再融重复）` `（偿债覆盖率）` ⇒ 剥年份**只认 4 位数字**，不是「剥所有括号」。
- **en 侧关键词段只删词、不改写** ⇒ 拼写天然正确；只有 15 条人工稿需人工核。
- **zh 侧只删年份**，关键词段一字不动（zh 侧中位 21、最长 29 ⇒ 无长度压力）。
- 期望值**独立写死**（不可从同一份真值派生 ⇒ 同义反复）。
- 一条变异只红一条断言；还原无条件执行 + sha256 逐字节校验。
- 提交前必须 `git fetch` + 确认 0 behind；**禁止** force-push；commit 信息不得含 `[CI Skip]` 类标记。
- ⛔ `bing-block-urls.csv` 是用户的无关文件，**不得提交**。
- ⚠️ **本批只改代码不上线** —— CI（`.github/workflows/ci.yml`）**没有**部署步骤（实测：无 wrangler / cloudflare / pages）⇒ push 不会自动部署 ⇒ 上线时机由用户另行决定。
- ⚠️ **zh 去留已拍板：保留全部中文**（GSC 实测 zh 贡献 63.6% 点击 / 40.3% 展示 / CTR 是 en 的 2.7 倍）⇒ 本批**不删任何 zh 内容**，只交付审计工具。

---

### Task 1: 生成 200 条 seoTitle 候选（规则 + 15 条人工精调）

**Files:**
- Create: `scripts/generate-seo-titles.mjs`（**可重复执行**的生成器，输出候选 JSON 到 stdout）
- Create: `tmp/seo-title-candidates.json`（生成产物，**不入库** —— 它只是 Task 2 的输入草稿）

**Interfaces:**
- Consumes: `src/i18n/locales/en.json` + `src/i18n/locales/zh.json` 的 `tools.<slug>.title`
- Produces: stdout 上的 JSON `{ en: Record<slug, string>, zh: Record<slug, string>, manual: Record<slug, {en, zh}> }`

- [ ] **Step 1: 写生成器（规则部分）**

```js
// scripts/generate-seo-titles.mjs
// P168 B3-2 —— 规则生成 seoTitle 候选（85 条自动 + 15 条人工覆盖）。
// ⚠️ 只做**机械派生**：剥年份 → 剥低检索价值前缀词 → 按 ' + ' 分组累加到 ≤60。
//    拼写一个字都不改 ⇒ 不会有错别字。
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
const strip = (s) => s.replace(/^\uFEFF/, '');
const readJson = (p) => JSON.parse(strip(readFileSync(ROOT + p, 'utf8')));
const en = readJson('src/i18n/locales/en.json');
const zh = readJson('src/i18n/locales/zh.json');

const SEP = ' \u2014 ';
const LOW_VALUE_PREFIX = ['Free ', 'Online ', 'Instant '];
const MAX_LEN = 60;

// ⚠️ 只剥**4 位年份**（术语括号如（NRR）必须保留）
function stripYear(s) {
  return s.replace(/\s*[（(]\d{4}[）)]\s*$/, '');
}

function enDraft(title) {
  const s = stripYear(title);
  const i = s.indexOf(SEP);
  if (i < 0) return s;                       // 本来就没有关键词段
  const head = s.slice(0, i);
  let kw = s.slice(i + SEP.length);
  for (const lv of LOW_VALUE_PREFIX) {
    if (kw.startsWith(lv)) { kw = kw.slice(lv.length); break; }
  }
  const parts = kw.split(/\s*\+\s*/);
  const kept = [];
  for (const p of parts) {
    const cand = head + SEP + [...kept, p].join(' + ');
    if (cand.length > MAX_LEN) break;
    kept.push(p);
  }
  return kept.length ? head + SEP + kept.join(' + ') : head;
}

function zhDraft(title) {
  return stripYear(title);                    // ⚠️ zh 只删年份，关键词段一字不动
}

const slugs = Object.keys(en)
  .filter((k) => /^tools\.[^.]+\.title$/.test(k))
  .map((k) => k.split('.')[1])
  .sort();

const out = { en: {}, zh: {}, manual: {} };
for (const slug of slugs) {
  out.en[slug] = enDraft(en['tools.' + slug + '.title']);
  out.zh[slug] = zhDraft(zh['tools.' + slug + '.title']);
}
process.stdout.write(JSON.stringify(out, null, 2));
```

- [ ] **Step 2: 跑生成器并确认全部 ≤ 60**

Run: `node scripts/generate-seo-titles.mjs > tmp/seo-title-candidates.json`
Expected: 无报错，文件是 100 个 slug 的 JSON

- [ ] **Step 3: 长度体检（写进验收工具的同一段逻辑）**

Run: `node -e "const c=require('./tmp/seo-title-candidates.json');const L=Object.values(c.en).map(s=>s.length).sort((a,b)=>a-b);console.log('en max='+L[L.length-1]+' over60='+L.filter(x=>x>60).length);const Z=Object.values(c.zh).map(s=>s.length).sort((a,b)=>a-b);console.log('zh max='+Z[Z.length-1]+' over60='+Z.filter(x=>x>60).length)"`
Expected: `en max=60 over60=0` · `zh max=29 over60=0`

- [ ] **Step 4: 找出需要人工精调的 15 条**

Run: `node -e "const c=require('./tmp/seo-title-candidates.json');const en=require('./src/i18n/locales/en.json');for(const [s,v] of Object.entries(c.en)){const t=en['tools.'+s+'.title'];const oi=t.indexOf(' — ');if(oi<0)continue;const okw=t.slice(oi+3).replace(/\s*\(\d{4}\)\s*$/,'');const di=v.indexOf(' — ');const dkw=di<0?'':v.slice(di+3);const a=okw.split(/\s*\+\s*/),b=dkw.split(/\s*\+\s*/);if(b.length<a.length)console.log(s+'\t'+okw+'\t=>\t'+dkw)}"`
Expected: 输出 15 行（`\t` 分隔的三列）

- [ ] **Step 5: 写 15 条人工覆盖表（`scripts/seo-title-overrides.json`）**

⭐ **取舍原则**：保留**有检索价值**的那组，而不是机械保留第一组 —— 「Revenue Churn Tracker」有检索价值，「Free Customer」没有。

```json
{
  "solopreneur-churn-rate-calculator": {
    "en": "Churn Rate Calculator — Customer + Revenue Churn Tracker",
    "zh": "流失率计算器 — 免费追踪客户与收入流失"
  },
  "solopreneur-equity-dilution-calculator": {
    "en": "Equity Dilution Calculator — Pre-Money + Post-Money Ownership",
    "zh": "股权稀释计算器 — 测算融资前后持股比例"
  },
  "solopreneur-email-list-revenue-calculator": {
    "en": "Email List Revenue Calculator — Subscriber + Conversion Forecast",
    "zh": "邮件列表收入计算器 — 测算订阅者与转化收入"
  },
  "solopreneur-cap-rate-calculator": {
    "en": "Cap Rate Calculator — NOI ÷ Property Value + Investment Yield",
    "zh": "资本化率计算器 — 测算 NOI、投资收益与物业价值"
  },
  "solopreneur-affiliate-income-calculator": {
    "en": "Affiliate Income Calculator — Commission + Conversion Forecast",
    "zh": "联盟营销收入计算器 — 测算佣金与转化收入"
  },
  "solopreneur-freelance-tax-calculator": {
    "en": "Freelance Tax Calculator — Tax Estimate + Quarterly Set-Aside",
    "zh": "自由职业者税务计算器 — 测算预估税与季度预留"
  },
  "solopreneur-sponsorship-rate-calculator": {
    "en": "Sponsorship Rate Calculator — CPM + Audience Value Pricing",
    "zh": "赞助报价计算器 — 测算 CPM 与受众价值定价"
  },
  "solopreneur-content-marketing-roi-calculator": {
    "en": "Content Marketing ROI Calculator — SEO Ramp + Attributed Revenue",
    "zh": "内容营销 ROI 计算器 — 追踪 SEO 起量周期与收入"
  },
  "solopreneur-coupon-attribution-calculator": {
    "en": "Coupon Attribution Calculator — Incremental Revenue + True ROI",
    "zh": "优惠券归因计算器 — 测算增量收入与真实 ROI"
  },
  "solopreneur-cart-abandonment-cost-calculator": {
    "en": "Cart Abandonment Cost Calculator — Lost Revenue + Recovery ROI",
    "zh": "购物车放弃成本计算器 — 测算流失收入与挽回 ROI"
  },
  "solopreneur-feature-adoption-calculator": {
    "en": "Feature Adoption Calculator — Active User + Usage Tracker",
    "zh": "功能采纳率计算器 — 追踪活跃用户与使用情况"
  },
  "solopreneur-activation-rate-calculator": {
    "en": "Activation Rate Calculator — Aha-Moment + Onboarding Tracker",
    "zh": "激活率计算器 — 追踪首次价值时刻与新手引导"
  },
  "solopreneur-time-to-productivity-calculator": {
    "en": "Time to Productivity Calculator — Ramp Weeks + Role Complexity",
    "zh": "解决时间计算器 — 追踪上手周期与岗位复杂度"
  },
  "solopreneur-comp-banding-calculator": {
    "en": "Compensation Banding Calculator — Salary Percentile + Market Band",
    "zh": "薪酬区间计算器 — 测算薪资分位与市场带宽"
  },
  "solopreneur-kb-coverage-rate-calculator": {
    "en": "KB Coverage Rate Calculator — Content Gap + Deflection Tracker",
    "zh": "知识库覆盖率计算器 — 测算内容缺口与 deflection"
  },
  "solopreneur-gdpr-fine-calculator": {
    "en": "GDPR Fine Risk Calculator — Revenue-Tier Penalty + Compliance Cost",
    "zh": "GDPR 罚款风险计算器 — 按收入档测算罚款与成本"
  }
}
```

⚠️ **实施时以 Step 4 的实际输出为准**：若条目数或 slug 与上表不一致，**以 Step 4 的输出为准**调整覆盖表（覆盖表是**手工维护的**，必须逐条与实际候选对齐）。

- [ ] **Step 6: 生成器读覆盖表并合并**

在 `scripts/generate-seo-titles.mjs` 末尾加：

```js
// ⭐ 人工覆盖表优先（15 条：规则会砍掉整个检索意图的那些）
let overrides = {};
try {
  overrides = JSON.parse(strip(readFileSync(ROOT + 'scripts/seo-title-overrides.json', 'utf8')));
} catch {
  console.error('[seo-titles] 找不到 scripts/seo-title-overrides.json（人工覆盖表）');
  process.exit(1);
}
for (const [slug, v] of Object.entries(overrides)) {
  if (!out.en[slug] || !out.zh[slug]) {
    console.error('[seo-titles] 覆盖表里的 slug 不存在: ' + slug);
    process.exit(1);
  }
  out.en[slug] = v.en;
  out.zh[slug] = v.zh;
}
```

⚠️ **覆盖表的 slug 必须真实存在** ⇒ 加一条「slug 不存在就退出」的检查（避免覆盖表里写错 slug 却静默通过）。

- [ ] **Step 7: 重跑生成器 + 长度体检**

Run: `node scripts/generate-seo-titles.mjs > tmp/seo-title-candidates.json`（然后重跑 Step 3 的体检命令）
Expected: `en max=60 over60=0` · `zh max=29 over60=0`

- [ ] **Step 8: 检查人工稿的关键词组完整**

Run: `node -e "const c=require('./tmp/seo-title-candidates.json');const en=require('./src/i18n/locales/en.json');let bad=0;for(const [s,v] of Object.entries(c.en)){const t=en['tools.'+s+'.title'];const oi=t.indexOf(' — ');if(oi<0)continue;const di=v.indexOf(' — ');if(di<0){console.log('NO-KEYWORD '+s);bad++;continue}const groups=t.slice(oi+3).replace(/\s*\(\d{4}\)\s*$/,'').split(/\s*\+\s*/).filter(g=>!/^Free /.test(g));const kept=v.slice(di+3).split(/\s*\+\s*/);if(groups.length&&!groups.some(g=>kept.includes(g))){console.log('LOST '+s+' :: '+groups.join(' | ')+' => '+kept.join(' | '));bad++}}console.log('bad='+bad)"`
Expected: `bad=0`（每个工具至少保留了原关键词段里**一组完整的非 Free 词组**）

- [ ] **Step 9: 提交生成器与覆盖表**

```bash
git add scripts/generate-seo-titles.mjs scripts/seo-title-overrides.json
git commit -m "feat(seo): P168 B3-2 —— seoTitle 生成器 + 15 条人工覆盖表"
```


### Task 2: 把 200 条 seoTitle 写进 locale

**Files:**
- Modify: `src/i18n/locales/en.json`（+100 键）
- Modify: `src/i18n/locales/zh.json`（+100 键）
- Create: `tmp/merge-seo-titles.cjs`（合并脚本，**可重复执行**，不入库）

**Interfaces:**
- Consumes: `tmp/seo-title-candidates.json`（Task 1 产出）
- Produces: locale 里的 `tools.<slug>.seoTitle` 键（en + zh 各 100）

- [ ] **Step 1: 写合并脚本**

```js
// tmp/merge-seo-titles.cjs —— 把候选 seoTitle 合并进 locale（可重复执行）
const fs = require('fs');
const strip = (s) => s.replace(/^\uFEFF/, '');
const cands = JSON.parse(strip(fs.readFileSync('tmp/seo-title-candidates.json', 'utf8')));

for (const lang of ['en', 'zh']) {
  const path = 'src/i18n/locales/' + lang + '.json';
  const obj = JSON.parse(strip(fs.readFileSync(path, 'utf8')));
  let added = 0;
  for (const [slug, value] of Object.entries(cands[lang])) {
    const key = 'tools.' + slug + '.seoTitle';
    if (obj[key] !== undefined) continue;
    obj[key] = value;
    added++;
  }
  // ⭐ 键插在该 slug 第一个 input.* 键之前（与 B3-1 的做法一致）
  const out = {};
  const bySlug = new Map();
  for (const [k, v] of Object.entries(obj)) {
    const m = /^tools\.([^.]+)\./.exec(k);
    if (!m) { out[k] = v; continue; }
    const slug = m[1];
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push([k, v]);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (/^tools\.[^.]+\.seoTitle$/.test(k)) out[k] = v;
  }
  fs.writeFileSync(path, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(lang + ': added ' + added + ' keys');
}
```

⚠️ **更稳的键排序做法**（不要重排整个文件 —— 重排会产生巨大的无意义 diff）：⭐ **只把每个 slug 的 `seoTitle` 插到该 slug 第一个键之前**，其余键的相对顺序**一字不动**。

- [ ] **Step 2: 跑合并脚本**

Run: `node tmp/merge-seo-titles.cjs`
Expected: `en: added 100 keys` · `zh: added 100 keys`

- [ ] **Step 3: 确认 diff 是纯新增（没有重排）**

Run: `git diff --numstat src/i18n/locales/en.json src/i18n/locales/zh.json`
Expected: 两个文件都是 `100  0`（**0 删除** ⇒ 没有重排）

⚠️ 若删除行数 ≠ 0 ⇒ **键排序逻辑有问题** ⇒ 停下来修脚本，不要继续。

- [ ] **Step 4: 确认格式（无 BOM、全 LF、末尾换行）**

Run: `node -e "const fs=require('fs');for(const f of ['src/i18n/locales/en.json','src/i18n/locales/zh.json']){const b=fs.readFileSync(f);const t=b.toString('utf8');console.log(f,'BOM='+(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF),'CRLF='+t.includes('\r\n'),'endsLF='+t.endsWith('\n'))}"`
Expected: 两行都是 `BOM=false CRLF=false endsLF=true`

- [ ] **Step 5: 跑 i18n 完整性检查**

Run: `node scripts/check-i18n-completeness.mjs`
Expected: exit 0（新增键不影响必需键检查）

- [ ] **Step 6: 提交 locale**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json
git commit -m "feat(i18n): P168 B3-2 —— 新增 200 个 tools.<slug>.seoTitle"
```

---

### Task 3: 让 `<title>` 用 seoTitle（2 个文件）

**Files:**
- Modify: `src/pages/[lang]/[slug].astro:58`（`metaTitle` 改读 `seoTitle`）+ `:571`（BaseLayout 调用加 `ogTitle`）
- Modify: `src/layouts/BaseLayout.astro:8-22`（Props 加 `ogTitle?`）+ `:26`（解构）+ `:170,176`（og:title / twitter:title 用 `ogTitle ?? title`）

**Interfaces:**
- Consumes: `tools.<slug>.seoTitle`（Task 2 产出）
- Produces: `BaseLayout` 的新可选 prop `ogTitle?: string`（缺省时回落 `title` ⇒ 其它页面零影响）

- [ ] **Step 1: 改 `BaseLayout.astro` 的 Props**

```astro
export interface Props {
  title: string;
  description: string;
  ogImage?: string;
  schema?: string;
  pageType?: 'home' | 'tool' | 'article' | 'static';
  // P168 B3-2：社交卡片的标题**独立于** <title>。
  // 工具页的 <title> 换成了短版 seoTitle（≤60 字符，SEO 友好），
  // 但 og:title 保留**长名** —— 分享卡片不会截断，长名信息量更大。
  // ⭐ 缺省时回落 title ⇒ 其它页面（分类页/主题页/静态页）零影响。
  ogTitle?: string;
  robots?: string;
}
```

- [ ] **Step 2: 改解构**

```astro
const { title, description, ogImage = defaultOgImage(lang), schema, pageType = 'static', ogTitle, robots = 'index, follow' } = Astro.props;
```

- [ ] **Step 3: 改 og:title / twitter:title**

```astro
  <meta property="og:title" content={ogTitle ?? title} />
  <meta name="twitter:title" content={ogTitle ?? title} />
```

- [ ] **Step 4: 改 `[slug].astro` 的 metaTitle**

```astro
const toolTitle = t(`tools.${slug}.title`, lang);
const toolDescription = t(`tools.${slug}.description`, lang);
// ⭐ P168 B3-2：<title> 用**短版 seoTitle**（≤60 字符）⇒ 全部落在 SERP 展示区内。
//   ⚠️ 缺键时**回落长名**（t() 缺键返回键名本身 ⇒ 必须判等）——
//   否则缺一个键就会让页面标题变成字面量 "tools.xxx.seoTitle"。
const seoTitleKey = `tools.${slug}.seoTitle`;
const seoTitleRaw = t(seoTitleKey, lang);
const seoTitle = seoTitleRaw === seoTitleKey ? toolTitle : seoTitleRaw;
// og:title 保留**长名**（分享卡片不截断 ⇒ 长名的检索面更完整）
const ogTitle = `${toolTitle} — ForgeFlowKit`;
```

- [ ] **Step 5: 改 BaseLayout 调用**

```astro
<BaseLayout title={seoTitle} ogTitle={ogTitle} description={toolDescription} schema={schema} pageType="tool" ogImage={`/og/${slug}-${lang}.png`}>
```

- [ ] **Step 6: 跑 tsc**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0

- [ ] **Step 7: 重建产物并肉眼验证一个页面**

Run: `$env:SKIP_INDEXNOW='1'; pnpm build`
Expected: exit 0

然后 Run: `node -e "const fs=require('fs');const h=fs.readFileSync('dist/en/solopreneur-burn-rate-calculator/index.html','utf8');console.log('title:',(h.match(/<title>([^<]*)<\/title>/)||[])[1]);console.log('og:',(h.match(/og:title\" content=\"([^\"]*)\"/)||[])[1]);console.log('h1 present:',h.includes('Burn Rate Calculator — Free Monthly Cash + Runway + Breakeven (2026)'))"`
Expected: `title:` 长度 ≤ 60 · `og:` 含 ` — ForgeFlowKit` · `h1 present: true`

⭐ **这三条同时验证了「只改 `<title>`」的边界**：`<title>` 短了、`og:title` 没短、h1 没短。

- [ ] **Step 8: 提交**

```bash
git add src/pages/[lang]/[slug].astro src/layouts/BaseLayout.astro
git commit -m "feat(seo): P168 B3-2 —— <title> 改用 seoTitle，og:title 保持长名"
```


---

### Task 4: 新守卫 `title-seo-guard`（source-only）

**Files:**
- Create: `tests/title-seo-guard.test.ts`

**Interfaces:**
- Consumes: `src/i18n/locales/{en,zh}.json` 的 `tools.<slug>.title` + `tools.<slug>.seoTitle`
- Produces: 6 条断言（① 键齐全 ② ≤60 ③ 无年份/品牌后缀 ④ 条件式关键词段完整 ⑤ en/zh 结构对齐 ⑥ 边界：og:title 仍是长名）

- [ ] **Step 1: 写守卫**

```ts
// P168 B3-2 —— 工具页 <title> 瘦身的守卫（source-only）。
//
// 这个守卫守的是**不变量**：
//   ① 每个工具都有 seoTitle（en + zh）—— 缺键 ⇒ 回落长名 ⇒ 静默失去瘦身效果
//   ② seoTitle ≤ 60 字符 —— SERP 桌面展示上限（写死的字面量，不写「尽量短」）
//   ③ seoTitle 不含年份（97% 进不了 SERP）与品牌后缀（Google 自己替换）
//   ④ ⭐ 条件式：原 title 有关键词段的 ⇒ seoTitle 也必须含**一组完整词组**
//      （判据落在**词组完整性**上，不是「长度 ≥ N」——
//        「把 Time to Breakeven 砍成 Time to」必须被判失败）
//   ⑤ en / zh 结构对齐（两侧都有或都没有「 — 」分段）
//   ⑥ 边界：og:title 与 JSON-LD name 仍是**长名** ——
//      防将来有人「顺手把 og:title 也改了」而无声破坏「只改 <title>」的边界

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { tools } from '../src/data/tools/index.ts';

const root = resolve(import.meta.dirname, '..');
const SEP = ' \u2014 ';
const MAX_LEN = 60;
const LANGS = ['en', 'zh'] as const;

function locale(lang: string): Record<string, string> {
  return JSON.parse(
    readFileSync(resolve(root, 'src/i18n/locales/' + lang + '.json'), 'utf8').replace(/^\uFEFF/, ''),
  ) as Record<string, string>;
}

const locales = Object.fromEntries(LANGS.map((l) => [l, locale(l)])) as Record<string, Record<string, string>>;

/** 原 title 的关键词段拆成词组（剥掉 4 位年份，保留术语括号） */
function keywordGroups(title: string): string[] {
  const i = title.indexOf(SEP);
  if (i < 0) return [];
  const kw = title.slice(i + SEP.length).replace(/\s*[（(]\d{4}[）)]\s*$/, '');
  return kw.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
}

test('P168 B3-2：每个工具都有 seoTitle（en + zh 各 100）', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const v = locales[lang]['tools.' + tool.slug + '.seoTitle'];
      if (typeof v !== 'string' || !v.length) {
        problems.push(lang + '/' + tool.slug + ' 缺 seoTitle');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2：seoTitle ≤ 60 字符（SERP 桌面展示上限）', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const v = locales[lang]['tools.' + tool.slug + '.seoTitle'] ?? '';
      if (v.length > MAX_LEN) {
        problems.push(lang + '/' + tool.slug + ' = ' + v.length + ' 字符：' + v);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2：seoTitle 不得含年份或品牌后缀', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const v = locales[lang]['tools.' + tool.slug + '.seoTitle'] ?? '';
      if (/[（(]\d{4}[）)]/.test(v)) problems.push(lang + '/' + tool.slug + ' 含年份：' + v);
      if (v.includes('ForgeFlowKit')) problems.push(lang + '/' + tool.slug + ' 含品牌后缀：' + v);
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2：⭐ seoTitle 必须保留原 title 的**一组完整词组**（不退化成只剩工具名）', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const full = locales[lang]['tools.' + tool.slug + '.title'] ?? '';
      const seo = locales[lang]['tools.' + tool.slug + '.seoTitle'] ?? '';
      const groups = keywordGroups(full);
      if (!groups.length) continue;              // 本来就没有关键词段（B 类）⇒ 不强求
      const seoGroups = keywordGroups(seo);
      if (!seoGroups.length) {
        problems.push(lang + '/' + tool.slug + ' 的 seoTitle 丢掉了整个关键词段：' + seo);
        continue;
      }
      // ⭐ 判据落在**词组完整性**：至少一组**原样**保留（不许部分匹配）
      const kept = groups.some((g) => seoGroups.includes(g));
      if (!kept) {
        problems.push(
          lang + '/' + tool.slug + ' 的 seoTitle 没有保留任何一组完整词组\n' +
            '        原: ' + groups.join(' | ') + '\n' +
            '        新: ' + seoGroups.join(' | '),
        );
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('P168 B3-2：en / zh 结构对齐（两侧都有或都没有「 — 」分段）', () => {
  const problems: string[] = [];
  for (const tool of tools) {
    const en = locales.en['tools.' + tool.slug + '.seoTitle'] ?? '';
    const zh = locales.zh['tools.' + tool.slug + '.seoTitle'] ?? '';
    if (en.includes(SEP) !== zh.includes(SEP)) {
      problems.push(tool.slug + ' 结构不对齐：en=' + JSON.stringify(en) + ' zh=' + JSON.stringify(zh));
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 B3-2：⭐ 边界 —— og:title 仍是长名（只改 <title>）', () => {
  const src = readFileSync(resolve(root, 'src/layouts/BaseLayout.astro'), 'utf8');
  assert.ok(
    /og:title\" content=\{ogTitle \?\? title\}/.test(src),
    'BaseLayout 的 og:title 没有独立字段（ogTitle ?? title）⇒ og:title 会跟着 <title> 变短 ⇒ 破坏「只改 <title>」的边界',
  );
  const page = readFileSync(resolve(root, 'src/pages/[lang]/[slug].astro'), 'utf8');
  assert.ok(
    /const ogTitle = `\$\{toolTitle\} — ForgeFlowKit`/.test(page),
    '[slug].astro 的 ogTitle 不再是长名 ⇒ og:title 会跟着 <title> 变短',
  );
});
```

- [ ] **Step 2: 跑守卫（应全绿）**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\title-seo-guard.test.ts`
Expected: `# pass 6` · `# fail 0`

- [ ] **Step 3: ⭐ 确认守卫不是空转（故意改坏一个）**

Run: `node -e "const fs=require('fs');const p='src/i18n/locales/en.json';let c=fs.readFileSync(p,'utf8');c=c.replace(/\"tools\.solopreneur-cac-calculator\.seoTitle\": \"[^\"]*\"/,'\"tools.solopreneur-cac-calculator.seoTitle\": \"' + 'X'.repeat(80) + '\"');fs.writeFileSync(p,c,'utf8')"` 然后重跑 Step 2
Expected: `# fail 1`，失败的是「≤ 60 字符」那条 ⇒ **只红一条**（其它断言不依赖长度）

- [ ] **Step 4: 还原**

Run: `git checkout -- src/i18n/locales/en.json` 然后重跑 Step 2
Expected: `# pass 6`

- [ ] **Step 5: 提交守卫**

```bash
git add tests/title-seo-guard.test.ts
git commit -m "test(seo): P168 B3-2 —— title-seo-guard（6 条断言）"
```


---

### Task 5: 变异台子 `mutate-p168-title-seo.mjs`

**Files:**
- Create: `tests/scripts/mutate-p168-title-seo.mjs`

**Interfaces:**
- Consumes: `tests/title-seo-guard.test.ts`（Task 4）
- Produces: 4 条变异，每条只红一条断言；收尾无条件还原 + sha256 逐字节校验

- [ ] **Step 1: 写台子（照 `tests/scripts/mutate-p168-decision-support.mjs` 的形状）**

台子的骨架（还原 / 校验 / 跑守卫 / 断言名提取）与 P168 B3-1 的台子**完全同款**，直接照抄改：

```js
// P168 B3-2 —— title-seo-guard 的变异台子。
//
// ⚠️ 借用的三条纪律（来自 P168 B3-1 的台子）：
//   ① 每条变异**只许红一条断言**（核对失败断言的**名字**，不只是「有东西红了」）
//   ② 收尾**无条件还原** + sha256 **逐字节**校验（Windows 上刚被写过的文件会被索引独占）
//   ③ 快照**闸门**：磁盘快照自愈会**回滚「上次跑台子之后的正常改动」**
//      ⇒ 发现旧快照且无 P168_ALLOW_RECOVER ⇒ **拒绝开跑并打印指引**
//      （宁可停下报告，也不要静默回滚用户的改动）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SNAPSHOT = join(ROOT, 'tmp', 'title-seo-harness-backup.json');
const GUARD = 'tests/title-seo-guard.test.ts';
const EN = join(ROOT, 'src/i18n/locales/en.json');

function sha(p) { return createHash('sha256').update(readFileSync(p)).digest('hex'); }

const TARGETS = [EN];
const ORIGINAL = new Map(TARGETS.map((p) => [p, readFileSync(p, 'utf8')]));
const ORIGINAL_HASH = new Map(TARGETS.map((p) => [p, sha(p)]));

function writeWithRetry(p, content) {
  for (let i = 0; i < 25; i++) {
    try { writeFileSync(p, content, 'utf8'); return; }
    catch (e) {
      if (e.code !== 'UV_UNKNOWN' && e.code !== 'EBUSY' && e.code !== 'EPERM') throw e;
      const until = Date.now() + 40;
      while (Date.now() < until) { /* Windows 上刚被写过的文件会被系统索引短暂独占 ⇒ 退避重试 */ }
    }
  }
  throw new Error('写入失败（重试 25 次后仍被占用）: ' + p);
}

function restore() {
  const errs = [];
  for (const [p, content] of ORIGINAL) {
    try { writeWithRetry(p, content); }
    catch (e) { errs.push(p + ': ' + e.message); }
  }
  return errs;
}

function restoreAndVerify() {
  const writeErrors = restore();
  const bad = [];
  for (const [p, h] of ORIGINAL_HASH) {
    if (sha(p) !== h) bad.push(p);
  }
  return { writeErrors, bad };
}

function runGuard() {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', GUARD],
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') };
  }
}

function failedAssertions(out) {
  const names = [];
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^not ok \d+ - (.+)$/);
    if (m) names.push(m[1].trim());
  }
  return names;
}
```

**变异定义（4 条）与主循环**：

```js
const MUTATIONS = [
  {
    id: 'T1',
    desc: 'seoTitle 被改成长 80 字符（超出 SERP 展示上限）',
    expect: 'P168 B3-2：seoTitle ≤ 60 字符（SERP 桌面展示上限）',
    apply: () => {
      const s = readFileSync(EN, 'utf8');
      const re = /(\"tools\.solopreneur-cac-calculator\.seoTitle\": \")[^\"]*(\")/;
      if (!re.test(s)) throw new Error('锚点未命中');
      writeWithRetry(EN, s.replace(re, '$1' + 'X'.repeat(80) + '$2'));
    },
  },
  {
    id: 'T2',
    desc: 'seoTitle 加回年份 (2026)（97% 进不了 SERP）',
    expect: 'P168 B3-2：seoTitle 不得含年份或品牌后缀',
    apply: () => {
      const s = readFileSync(EN, 'utf8');
      const re = /(\"tools\.solopreneur-burn-rate-calculator\.seoTitle\": \")([^\"]*)(\")/;
      if (!re.test(s)) throw new Error('锚点未命中');
      writeWithRetry(EN, s.replace(re, '$1$2 (2026)$3'));
    },
  },
  {
    id: 'T3',
    desc: 'seoTitle 的关键词段被整段删掉（退化成只剩工具名）',
    expect: 'P168 B3-2：⭐ seoTitle 必须保留原 title 的**一组完整词组**（不退化成只剩工具名）',
    apply: () => {
      const s = readFileSync(EN, 'utf8');
      const re = /(\"tools\.solopreneur-churn-rate-calculator\.seoTitle\": \")[^\"]*(\")/;
      if (!re.test(s)) throw new Error('锚点未命中');
      writeWithRetry(EN, s.replace(re, '$1Churn Rate Calculator$2'));
    },
  },
  {
    id: 'T4',
    desc: '一个 seoTitle 键被删掉（页面会静默回落长名）',
    expect: 'P168 B3-2：每个工具都有 seoTitle（en + zh 各 100）',
    apply: () => {
      const s = readFileSync(EN, 'utf8');
      const re = /^\s*\"tools\.solopreneur-gdpr-fine-calculator\.seoTitle\":.*\r?\n/m;
      if (!re.test(s)) throw new Error('锚点未命中');
      writeWithRetry(EN, s.replace(re, ''));
    },
  },
];

// ⭐ 快照闸门：旧快照会**回滚「上次跑台子之后的正常改动」**
if (existsSync(SNAPSHOT) && !process.env.P168_ALLOW_RECOVER) {
  console.log('⚠️ 发现上次的台子快照，但本次没有设 P168_ALLOW_RECOVER。');
  console.log('   快照存的是「上次跑台子那一刻」的内容 ⇒ 自动恢复会把之后的正常改动一起回滚。');
  console.log('   ⇒ **拒绝开跑**。');
  console.log('   若确认要恢复：设置 P168_ALLOW_RECOVER=1 后重跑；');
  console.log('   若确认不要恢复：先手动清空 ' + SNAPSHOT + '（覆盖写 {} 即可）。');
  process.exit(1);
}

const ONLY = process.argv[2]
  ? process.argv[2].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  : null;

let killed = 0, survived = 0, invalid = 0, notIsolated = 0;

try {
  const base = runGuard();
  if (!base.ok) {
    console.log('基线就没绿 —— 先修守卫。');
    console.log(base.out.slice(-2000));
    process.exit(1);
  }
  console.log('基线绿 ✓');
  console.log('');

  for (const m of MUTATIONS) {
    if (ONLY && !ONLY.includes(m.id)) continue;
    const restoreErrs = restore();
    if (restoreErrs.length) {
      console.log('还原失败，台子停止：' + restoreErrs.join(', '));
      process.exitCode = 1;
      break;
    }
    try { m.apply(); }
    catch (e) {
      console.log('[' + m.id + '] INVALID — ' + e.message);
      invalid++; survived++;
      continue;
    }
    const res = runGuard();
    if (!res.ok) {
      const failed = failedAssertions(res.out);
      const isolated = failed.length === 1 && failed[0] === m.expect;
      if (isolated) {
        killed++;
        console.log('[' + m.id + '] KILLED ✓ — ' + m.desc);
      } else {
        notIsolated++; survived++;
        console.log('[' + m.id + '] RED-BUT-NOT-ISOLATED — ' + m.desc +
          '（失败的断言：' + (failed.join(' / ') || '(未识别)') + '）');
      }
    } else {
      survived++;
      console.log('[' + m m.id + '] ✗ SURVIVED — ' + m.desc);
    }
  }
} finally {
  const { writeErrors, bad } = restoreAndVerify();
  if (writeErrors.length) {
    console.log('');
    console.log('还原时写入失败：' + writeErrors.join(', '));
    process.exitCode = 1;
  }
  if (bad.length) {
    console.log('');
    console.log('还原校验失败（sha256 不一致）：' + bad.join(', '));
    process.exitCode = 1;
  }
  if (!writeErrors.length && !bad.length) {
    console.log('');
    console.log('还原校验 ✓ 逐字节一致');
  }
}

console.log('');
console.log('KILLED ' + killed + ' · SURVIVED ' + survived + ' · INVALID ' + invalid + ' · 未隔离 ' + notIsolated);
```

⚠️ **注意上面代码里 `console.log('[' + m m.id + ']` 是笔误** —— 实施时写成 `console.log('[' + m.id + '] ✗ SURVIVED — ' + m.desc);`。

- [ ] **Step 2: 跑台子**

Run: `node -e "require('fs').writeFileSync('tmp/title-seo-harness-backup.json','{}')"` 然后 `node tests/scripts/mutate-p168-title-seo.mjs`
Expected: `KILLED 4 · SURVIVED 0 · INVALID 0 · 未隔离 0` + `还原校验 ✓ 逐字节一致`

- [ ] **Step 3: 确认仓库已还原**

Run: `git status --short src/i18n/locales/en.json`
Expected: **无输出**（文件已还原）

- [ ] **Step 4: 提交台子**

```bash
git add tests/scripts/mutate-p168-title-seo.mjs
git commit -m "test(seo): P168 B3-2 —— title-seo 变异台子（4 条）"
```


---

### Task 6: 验收测量工具 `p168-title-measure.ts`（入库）

**Files:**
- Create: `tests/scripts/p168-title-measure.ts`

**Interfaces:**
- Consumes: `src/i18n/locales/{en,zh}.json` + `dist/` 产物（可选，缺失时降级）
- Produces: stdout 上的测量报告（长度分布 / SERP 截断模拟 / 边界核验）

- [ ] **Step 1: 写测量工具**

```ts
// P168 B3-2 —— 标题瘦身的验收测量（入库 —— 验收数字必须可复算）。
//
// 测三件事：
//   ① 200 条 seoTitle 的长度分布（改前 vs 改后）
//   ② ⭐ SERP 截断模拟：按词边界切到 60 字符 ⇒ 关键词段是否完整保留
//   ③ ⭐ 边界核验：og:title / JSON-LD name / h1 **仍是长名**
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const strip = (s: string) => s.replace(/^\uFEFF/, '');
const locale = (l: string) =>
  JSON.parse(strip(readFileSync(resolve(root, 'src/i18n/locales/' + l + '.json'), 'utf8'))) as Record<string, string>;

const en = locale('en');
const zh = locale('zh');
const slugs = Object.keys(en)
  .filter((k) => /^tools\.[^.]+\.title$/.test(k))
  .map((k) => k.split('.')[1])
  .sort();

const SEP = ' \u2014 ';
const stat = (lens: number[]) => {
  const s = [...lens].sort((a, b) => a - b);
  return `min ${s[0]} / med ${s[Math.floor(s.length / 2)]} / max ${s[s.length - 1]}`;
};

for (const [lang, o] of [['en', en], ['zh', zh]] as const) {
  const full = slugs.map((s) => o['tools.' + s + '.title'].length);
  const seo = slugs.map((s) => (o['tools.' + s + '.seoTitle'] ?? '').length);
  console.log(`[${lang}] title    长度：${stat(full)}  · 超 60：${full.filter((x) => x > 60).length}/${full.length}`);
  console.log(`[${lang}] seoTitle 长度：${stat(seo)}  · 超 60：${seo.filter((x) => x > 60).length}/${seo.length}`);
}

// ⭐ SERP 截断模拟：按词边界切到 60 字符
function truncateAtWordBoundary(s: string, limit: number): string {
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit);
  const sp = cut.lastIndexOf(' ');
  return sp > 0 ? cut.slice(0, sp) : cut;
}

let truncated = 0;
const lostKeywords: string[] = [];
for (const s of slugs) {
  for (const lang of ['en', 'zh'] as const) {
    const o = lang === 'en' ? en : zh;
    const seo = o['tools.' + s + '.seoTitle'] ?? '';
    const shown = truncateAtWordBoundary(seo, 60);
    if (shown.length < seo.length) truncated++;
    const full = o['tools.' + s + '.title'] ?? '';
    const fi = full.indexOf(SEP);
    if (fi < 0) continue;
    const groups = full.slice(fi + SEP.length).replace(/\s*[（(]\d{4}[）)]\s*$/, '').split(/\s*\+\s*/).filter(Boolean);
    const si = shown.indexOf(SEP);
    const shownGroups = si < 0 ? [] : shown.slice(si + SEP.length).split(/\s*\+\s*/);
    if (groups.length && !groups.some((g) => shownGroups.includes(g))) {
      lostKeywords.push(`${lang}/${s}: 原「${groups.join(' | ')}」⇒ SERP 里剩「${shownGroups.join(' | ')}」`);
    }
  }
}
console.log(`\n[SERP 模拟] 被截断的标题：${truncated}/200`);
console.log(`[SERP 模拟] 截断后丢失全部关键词组的：${lostKeywords.length}`);
for (const x of lostKeywords.slice(0, 10)) console.log('  ' + x);

// ⭐ 边界核验：og:title / JSON-LD name / h1 仍是长名
const probe = resolve(root, 'dist', 'en', 'solopreneur-burn-rate-calculator', 'index.html');
if (!existsSync(probe)) {
  console.log('\n[边界核验] dist/ 缺失 —— 跳过（先跑 pnpm build）');
} else {
  const html = readFileSync(probe, 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? '';
  const og = (html.match(/og:title\" content=\"([^\"]*)\"/) || [])[1] ?? '';
  const long = en['tools.solopreneur-burn-rate-calculator.title'];
  console.log(`\n[边界核验] <title>  = ${title}  (${title.length})`);
  console.log(`[边界核验] og:title = ${og}`);
  console.log(`[边界核验] h1 含长名：${html.includes(long)}`);
  console.log(`[边界核验] og:title 含长名 + 品牌后缀：${og.includes(long) && og.includes('ForgeFlowKit')}`);
  const ok = title.length <= 60 && og.includes(long) && og.includes('ForgeFlowKit') && html.includes(long);
  console.log(ok ? '\n✓ 边界达标：只有 <title> 变短' : '\n✗ 边界被破坏');
}
```

---

### Task 7: zh 页质量审计工具 `p168-zh-audit.ts`（入库）

**Files:**
- Create: `tests/scripts/p168-zh-audit.ts`

**Interfaces:**
- Consumes: GSC 导出（`~/Downloads/gsc/_extracted/`，**外部输入，可缺失**）+ `dist/` 产物
- Produces: stdout 上的「zh 页决策表」+ 汇总结论

⭐ **用户拍板「保留全部中文，先做审计再决定删哪部分」** ⇒ 本工具是那「再决定」的依据。

- [ ] **Step 1: 写审计工具**

```ts
// P168 B3-2 —— 中文页质量审计（入库 —— 验收数字必须可复算）。
//
// ⚠️ 判据不能只看 zh 页自己 —— 「重复」的判据是**跨语言重复**
//   （zh 页与 en 对应页内容雷同），不是单页质量。
// ⇒ 工具**成对比较**：每个 zh 页 ↔ en 对应页。
//
// 回答三个问题：
//   ① zh 侧哪些页真在带来点击/排名？
//   ② 哪些 zh 页零展示（纯吃索引）？
//   ③ 哪些 zh 页与 en 对应页内容高度重复？
// ⇒ 三者交叉 ⇒ **真该删的** = 零展示 ∩ 高重复
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const GSC_DIR = resolve(process.env.USERPROFILE || '', 'Downloads', 'gsc', '_extracted');

// ── GSC 侧（外部输入，缺失时降级）──────────────────────────────
interface GscRow { url: string; clicks: number; impr: number; pos: number }
function readGsc(): Map<string, GscRow> | null {
  const dirs = existsSync(GSC_DIR)
    ? readFileSync(GSC_DIR, 'utf8') === '' ? [] : []
    : [];
  void dirs;
  // GSC 导出目录里是「forgeflowkit.com-Performance-on-Search-<日期>/网页.csv」
  let found = '';
  try {
    const { readdirSync } = require('node:fs');
    const entries = readdirSync(GSC_DIR);
    const perf = entries.filter((e: string) => e.startsWith('forgeflowkit.com-Performance-on-Search'));
    if (!perf.length) return null;
    found = resolve(GSC_DIR, perf[0], '网页.csv');
  } catch {
    return null;
  }
  if (!existsSync(found)) return null;
  const raw = readFileSync(found, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.length);
  const parse = (l: string): string[] => {
    const out: string[] = []; let cur = ''; let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
    }
    out.push(cur);
    return out;
  };
  const head = parse(lines[0]);
  const map = new Map<string, GscRow>();
  for (const line of lines.slice(1)) {
    const cells = parse(line);
    const row = Object.fromEntries(head.map((h, i) => [h, cells[i]]));
    const url = row['排名靠前的网页'] ?? '';
    if (!url) continue;
    const num = (s: string) => Number(String(s ?? '').replace(/[,%]/g, '')) || 0;
    map.set(url, { url, clicks: num(row['点击次数']), impr: num(row['展示']), pos: num(row['排名']) });
  }
  return map;
}

// ── 页面侧：zh 页 ↔ en 对应页的可见正文 5-gram 重叠 ──────────────
function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function overlapRatio(a: string, b: string): number {
  const grams = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i + 5 <= s.length; i++) out.add(s.slice(i, i + 5));
    return out;
  };
  const ga = grams(a);
  if (!ga.size) return 0;
  const gb = grams(b);
  let hit = 0;
  for (const g of ga) if (gb.has(g)) hit++;
  return (hit / ga.size) * 100;
}
```

**主流程与输出（续写同一个文件）**：

```ts
const gsc = readGsc();
if (!gsc) {
  console.log('⚠️ 找不到 GSC 导出目录（' + GSC_DIR + '）⇒ 只跑页面侧的比对，不报 GSC 数字。');
}

interface Row {
  slug: string;
  clicks: number;
  impr: number;
  pos: number;
  overlap: number | null;
  verdict: string;
}

const rows: Row[] = [];
for (const [url, g] of gsc ?? []) {
  const m = /^https?:\/\/[^/]+\/zh\/([^/]+)\/?$/.exec(url);
  if (!m) continue;
  const slug = m[1];
  const zhPage = resolve(root, 'dist', 'zh', slug, 'index.html');
  const enPage = resolve(root, 'dist', 'en', slug, 'index.html');
  let overlap: number | null = null;
  if (existsSync(zhPage) && existsSync(enPage)) {
    overlap = overlapRatio(
      visibleText(readFileSync(zhPage, 'utf8')),
      visibleText(readFileSync(enPage, 'utf8')),
    );
  }
  const zeroImpr = g.impr === 0;
  const highDup = overlap !== null && overlap >= 30;
  const verdict = zeroImpr && highDup ? '**可删候选**' : g.clicks > 0 ? '保留（有点击）' : zeroImpr ? '待定（零展示）' : '保留';
  rows.push({ slug, clicks: g.clicks, impr: g.impr, pos: g.pos, overlap, verdict });
}

rows.sort((a, b) => b.clicks - a.clicks || a.slug.localeCompare(b.slug));

console.log('\n| zh 页 | 展示 | 点击 | 排名 | 与 en 重叠 | 建议 |');
console.log('|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| /zh/${r.slug}/ | ${r.impr} | ${r.clicks} | ${r.pos} | ${r.overlap === null ? '—' : r.overlap.toFixed(1) + '%'} | ${r.verdict} |`);
}

const del = rows.filter((r) => r.verdict.startsWith('**'));
const clicked = rows.filter((r) => r.clicks > 0);
const zero = rows.filter((r) => r.impr === 0);
console.log('\n=== 汇总结论 ===');
console.log(`zh 页总数（有 GSC 数据）：${rows.length}`);
console.log(`有点击的：${clicked.length}（共 ${clicked.reduce((a, b) => a + b.clicks, 0)} 次点击）`);
console.log(`零展示的：${zero.length}`);
console.log(`**可删候选**（零展示 ∩ 与 en 高重复）：${del.length}`);
if (del.length === 0) {
  console.log('\n⭐ 结论：当前**没有一页该删** ⇒ 保留全部中文是有据可依的决定。');
} else {
  console.log('\n⚠️ 可删候选（逐条复核后再删 —— 每删一页都在丢一个索引位）：');
  for (const r of del) console.log(`  /zh/${r.slug}/  展示 ${r.impr} · 重叠 ${r.overlap?.toFixed(1)}%`);
}
```

⚠️ **实测基线（2026-11-06）**：zh 侧 **283 个 URL 进入 GSC、零展示 = 0** ⇒ 工具的预期结论很可能是「**当前没有一页该删**」⇒ 这本身就是**有价值的结论**（把「要不要删中文」从反复纠结变成有据可依的判断）。

- [ ] **Step 2: 跑审计工具**

Run: `node node_modules\tsx\dist\cli.mjs tests\scripts\p168-zh-audit.ts`
Expected: 输出一张决策表 + 汇总结论（`可删候选` 数量那一行是重点）

- [ ] **Step 3: 验证工具不是空转**

⚠️ **「检查违规」的断言在没有违规时本来就绿** ⇒ 必须造一个已知违规样本，断言检测器看得见它。

Run: `node -e "const fs=require('fs');const p='tests/scripts/p168-zh-audit.ts';let c=fs.readFileSync(p,'utf8');c=c.replace('const zeroImpr = g.impr === 0;','const zeroImpr = g.impr === 0 || true;');fs.writeFileSync(p,c,'utf8')"` 然后重跑 Step 2
Expected: `可删候选` 数量 > 0（检测器能看见违规）

- [ ] **Step 4: 还原并重跑**

Run: `git checkout -- tests/scripts/p168-zh-audit.ts` 然后重跑 Step 2
Expected: `可删候选` 数量回到 0

- [ ] **Step 5: 提交**

```bash
git add tests/scripts/p168-zh-audit.ts
git commit -m "test(seo): P168 B3-2 —— zh 页质量审计工具（成对比较 + 决策表）"
```

---

### Task 8: 全量验证 + 文档同步 + 提交询问

**Files:**
- Modify: `AGENTS.md`（P168 note 追加 B3-2 的验收数字与新教训；维度表新增「Title Slimming」维度）
- Modify: `CHANGELOG.md`（B3-2 条目 + 头部「最后更新」日期 + Total commits +1）
- Modify: `docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md`（追加 §19.28 实测结果）
- Modify: `docs/superpowers/plans/INDEX.md`（登记本 plan 文件 + 更新计数）

- [ ] **Step 1: 跑全部验证**

```bash
pnpm exec tsc --noEmit
node scripts/codegen-examples.mjs --check
node scripts/codegen-customfn.mjs --check
node scripts/check-i18n-completeness.mjs
node scripts/check-engine-count-by-category.mjs --check
node scripts/score-user-value.mjs --check
node scripts/codegen-review-dates.mjs --check
$env:SKIP_INDEXNOW='1'; pnpm build
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/title-seo-guard.test.ts
$env:RUN_BUILD_TESTS='1'; $env:SKIP_INDEXNOW='1'; node tests/run.mjs
```
Expected: 全部 exit 0 · 全量 280 套件 0 失败

- [ ] **Step 2: 跑测量工具并记录数字**

Run: `node node_modules\tsx\dist\cli.mjs tests\scripts\p168-title-measure.ts`
Expected: 输出长度分布 + SERP 模拟 + 边界核验（`✓ 边界达标：只有 <title> 变短`）

- [ ] **Step 3: 跑 zh 审计并记录结论**

Run: `node node_modules\tsx\dist\cli.mjs tests\scripts\p168-zh-audit.ts`
Expected: 决策表 + 汇总结论

- [ ] **Step 4: 同步文档**

⭐ **文档里的每个数字都要用 Step 2/3 的实测输出**（不写「约」「大概」）。

- [ ] **Step 5: 跑漂移体检**

Run: `node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\doc-freshness-guard.test.ts`
Expected: `# pass 7` · `# fail 0`

- [ ] **Step 6: 提交文档**

```bash
git add AGENTS.md CHANGELOG.md docs/superpowers/plans/INDEX.md docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md
git commit -m "docs: P168 B3-2 —— 标题瘦身 + zh 审计的验收数字与教训"
```

- [ ] **Step 7: ⭐ 询问用户是否 commit + 推送**

⚠️ **按用户规则：完成代码改动后先询问是否需要 commit，明确同意再 `git add` + `git commit`**。
⇒ 本 plan 的 Task 1–6 已各自 commit（它们是**可独立复核的原子步**）；Task 7 的文档 commit 之后，**再问用户是否推送两端**。

⚠️ **推送前必须**：`git fetch` 两个远端 + 确认 0 behind + `$env:GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe'` + `$env:GIT_SSH_VARIANT='external'` + 推完用 `git ls-remote` **复核远端真实 HEAD**（push 到 URL 不会更新本地 remote-tracking ref ⇒ 「未同步」可能是假象）。

⚠️ **上线时机**：CI 无部署步骤（实测）⇒ push 不会自动上线 ⇒ **上线与否由用户另决定**（SEO 改动有不可逆的线上影响）。
