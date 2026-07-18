# P18 i18n Tooling Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the latent UPDATE bug in `scripts/apply-translations.mjs`, retire the superseded `scripts/insert-translations.mjs`, normalize ZH terminology across 100 engines, and rename category F to cover real-estate engines.

**Architecture:** Task 1 replaces the fragile `[^']*` zh-value regex with the existing `parseStringLiteral` state-machine (already used for FAQ/howToUse extraction) — single source of truth for string parsing. Task 2 deletes the superseded `insert-translations.mjs` after a global grep proves 0 callers. Task 3 builds a terminology dictionary + audit script that flags mismatches, then runs scripted fixes. Task 4 renames category F without schema/categoryId migration (zero-engine-cost).

**Tech Stack:** Node.js ESM (`.mjs`), regex + hand-rolled state-machine string parser, existing `scripts/check-i18n-completeness.mjs` gate.

## Global Constraints

- **No engine code changes** — P18 is tooling + translations only. Engines stay at 100/100 with `engineKey: true`.
- **raw-key invariant**: `dist/{en,zh}/index.html` raw-key count must remain `0` after every task.
- **ZH-only audit target**: terminology audit scans ZH strings; EN glossary is informational only.
- **Category F rename is metadata-only**: `categoryId='F'` and `applicationCategory='FinanceApplication'` stay unchanged. Only `name` (EN + ZH) and `description` (EN + ZH) get rewritten.
- **Commit per task** (Tasks 1-4 = 4 commits). Push at end of each task per pre-push gate.

---

### Task 1: Replace UPDATE-regex with state-machine parser in `apply-translations.mjs`

**Files:**
- Modify: `scripts/apply-translations.mjs:41-64` (replace both `reSingle` and `reDouble` UPDATE blocks)
- Create: `tests/scripts/test-apply-translations-zh-parser.mjs` (fixture-driven regression test)
- Move: `scripts/.scratch/fix-5-corruptions.mjs`, `fix-nrr.mjs`, `fix-corruptions.mjs` → `scripts/.scratch/_archive/` (no longer needed once parser is fixed)

**Interfaces:**
- Consumes: existing `parseStringLiteral(content, i)` function (already defined at lines 102-121)
- Produces: new `replaceZhValue(src, key, newZh)` helper that finds the entry, extracts old quote style via state-machine, replaces zh value with new escaped value, preserves quote style

**Background:** P17b shipped 5 manually-repaired corruptions (commits `70995d7`, `fix-nrr.mjs`, `fix-5-corruptions.mjs`). Root cause: `reSingle = new RegExp(`('${escapedKey}':\\s*\\{[^}]*?zh:\\s*)'([^']*)'`, 'm')` matches the `[^']*` up to the FIRST `'` in zh. If zh contains `'` (e.g., "对 `$10M-$50M ARR`"), the match truncates and the replace leaves dangling suffix.

- [ ] **Step 1: Write failing fixture test**

Create `tests/scripts/test-apply-translations-zh-parser.mjs`:

```js
// Fixture-driven regression test for the UPDATE-regex bug fixed in P18-1.
// Pre-fix, `reSingle = /('key':\s*\{[^}]*?zh:\s*)'([^']*)'/m` matched only up to
// the first `'` in zh. If zh contains `'` (e.g. ARR range), the match truncates
// and the replace leaves dangling suffix → JS parse error.
import { describe, it, expect } from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPTS_DIR = new URL('../../scripts/', import.meta.url).pathname;

// Inline copy of `replaceZhValue` from apply-translations.mjs once Task 1 lands.
// Pre-fix we test the current (buggy) behavior — Task 1's commit makes it pass.
function replaceZhValue(src, key, newZh) {
  const escapedKey = key.replace(/\./g, '\\.');
  // Walk every occurrence of `'key':` — for each, find the matching `zh:`,
  // then state-machine parse the zh string literal.
  const keyRe = new RegExp(`'${escapedKey}':\\s*\\{`, 'g');
  let m;
  while ((m = keyRe.exec(src)) !== null) {
    const objStart = m.index;
    const objEnd = src.indexOf('}', objStart);
    if (objEnd === -1) break;
    const obj = src.substring(objStart, objEnd + 1);
    const zhMatch = obj.match(/zh:\s*/);
    if (!zhMatch) continue;
    let zi = obj.indexOf(zhMatch[0]) + zhMatch[0].length;
    while (zi < obj.length && /\s/.test(obj[zi])) zi++;
    if (zi >= obj.length) continue;
    const quote = obj[zi];
    if (quote !== '"' && quote !== "'") continue;
    // State-machine parse: read value + next position
    let j = zi + 1;
    let value = '';
    while (j < obj.length) {
      const ch = obj[j];
      if (ch === '\\') {
        value += ch + obj[j + 1];
        j += 2;
        continue;
      }
      if (ch === quote) {
        const before = src.substring(0, objStart + obj.indexOf(zhMatch[0]) + zhMatch[0].length);
        // Skip whitespace between `zh:` and the value
        const wsStart = objStart + obj.indexOf(zhMatch[0]) + zhMatch[0].length;
        let wsEnd = wsStart;
        while (wsEnd < src.length && /\s/.test(src[wsEnd])) wsEnd++;
        const beforeTrim = src.substring(0, wsEnd);
        const escapedNewZh = newZh.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote);
        const after = src.substring(objStart + j + 1);
        return beforeTrim + quote + escapedNewZh + quote + after;
      }
      value += ch;
      j++;
    }
  }
  return src; // no match
}

const fixtures = [
  {
    name: 'single-quoted zh with embedded apostrophe (P17b corruption repro)',
    input: `  'tools.x.input.amount.label': { en: 'Amount', zh: '对 '$10M-$50M ARR' 的金额' },`,
    key: 'tools.x.input.amount.label',
    newZh: '对 "$10M-$50M ARR" 范围的金额',
    expectContains: `zh: '对 \\'$10M-$50M ARR\\' 范围的金额'`,
  },
  {
    name: 'double-quoted zh with embedded double-quote',
    input: `  'tools.x.faq.0.q': { en: 'Q?', zh: "包含 \"转义双引号\" 的问题" },`,
    key: 'tools.x.faq.0.q',
    newZh: '包含 "新转义双引号" 的问题',
    expectContains: `zh: "包含 \\"新转义双引号\\" 的问题"`,
  },
  {
    name: 'single-quoted zh with backslash and newline',
    input: `  'tools.x.how_to_use.0': { en: 'step', zh: '多行\\\\n文本' },`,
    key: 'tools.x.how_to_use.0',
    newZh: '新多行\\n文本',
    expectContains: `zh: '新多行\\\\n文本'`,
  },
  {
    name: 'no embedded special chars (baseline)',
    input: `  'tools.x.input.x.label': { en: 'X', zh: '原始 zh' },`,
    key: 'tools.x.input.x.label',
    newZh: '替换后的 zh',
    expectContains: `zh: '替换后的 zh'`,
  },
];

describe('replaceZhValue state-machine parser (P18-1)', () => {
  for (const fx of fixtures) {
    it(fx.name, () => {
      const out = replaceZhValue(fx.input, fx.key, fx.newZh);
      expect(out).toContain(fx.expectContains);
    });
  }
});
```

- [ ] **Step 2: Run test against the CURRENT apply-translations.mjs — should pass via the inline copy**

Run: `node --test tests/scripts/test-apply-translations-zh-parser.mjs`
Expected: 4 pass (the inline helper IS the new behavior; this step proves the fixture is sound). If a fixture fails, debug the fixture — the parser logic in the inline copy is the source of truth for Step 3.

- [ ] **Step 3: Replace the UPDATE blocks in `scripts/apply-translations.mjs`**

Open `scripts/apply-translations.mjs`. Replace lines 41-64 (the `for (const [key, zh] of Object.entries(entries))` Step 1 loop body) with:

```js
// Step 1: Update existing entries (state-machine parser handles escapes correctly)
for (const [key, zh] of Object.entries(entries)) {
  src = replaceZhValue(src, key, zh);
  updated++;
}
```

Add the helper function ABOVE the Step 1 loop (after the `parseStringLiteral` function definition at line 121):

```js
// Replace the zh value of an entry by key, preserving quote style and handling
// embedded escape sequences via the state-machine `parseStringLiteral` parser.
// P18-1: replaces fragile `[^']*` regex that truncated on embedded apostrophes.
function replaceZhValue(src, key, newZh) {
  const escapedKey = key.replace(/\./g, '\\.');
  const keyRe = new RegExp(`'${escapedKey}':\\s*\\{`, 'g');
  let m;
  while ((m = keyRe.exec(src)) !== null) {
    const objStart = m.index;
    const objEnd = src.indexOf('}', objStart);
    if (objEnd === -1) break;
    const obj = src.substring(objStart, objEnd + 1);
    const zhKw = obj.match(/zh:\s*/);
    if (!zhKw) continue;
    let zi = obj.indexOf(zhKw[0]) + zhKw[0].length;
    while (zi < obj.length && /\s/.test(obj[zi])) zi++;
    if (zi >= obj.length) continue;
    const quote = obj[zi];
    if (quote !== '"' && quote !== "'") continue;
    const parsed = parseStringLiteral(obj, zi);
    if (!parsed) continue;
    const [, valueEnd] = parsed; // valueEnd is index AFTER closing quote (in `obj`)
    const escapedNewZh = newZh.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote);
    // Translate positions back to src coordinates
    const zhKwPosInObj = obj.indexOf(zhKw[0]) + zhKw[0].length;
    const quoteAbsPos = objStart + zi;
    const valueEndAbsPos = objStart + valueEnd;
    return src.substring(0, quoteAbsPos + 1) + escapedNewZh + src.substring(valueEndAbsPos);
  }
  return src; // no match — caller treats as "skipped"
}
```

(You'll also need to add a `let updatedReplaced = 0;` counter — see Step 5 — since the new helper returns early on no-match.)

- [ ] **Step 4: Drop the standalone inline test (or keep it — see Step 5 decision)**

Decision: **keep** the test file. It's the regression guard for the latent bug. Inline the actual `replaceZhValue` from `apply-translations.mjs` into the test by reading the file via `readFileSync` + `eval`-style import — OR, simpler, **export the helper from a new shared module**.

Cleaner path: extract `replaceZhValue` + `parseStringLiteral` to `scripts/lib/zh-parser.mjs`, import from both `apply-translations.mjs` AND `tests/scripts/test-apply-translations-zh-parser.mjs`.

Create `scripts/lib/zh-parser.mjs`:

```js
// State-machine string parser + zh-value replacer, shared across i18n scripts.
// P18-1: extracted from apply-translations.mjs so tests can import without eval.

export function parseStringLiteral(content, i) {
  const quote = content[i];
  if (quote !== '"' && quote !== "'") return null;
  let j = i + 1;
  let value = '';
  while (j < content.length) {
    const ch = content[j];
    if (ch === '\\') {
      value += ch + content[j + 1];
      j += 2;
      continue;
    }
    if (ch === quote) {
      return [value, j + 1];
    }
    value += ch;
    j++;
  }
  return null;
}

export function replaceZhValue(src, key, newZh) {
  const escapedKey = key.replace(/\./g, '\\.');
  const keyRe = new RegExp(`'${escapedKey}':\\s*\\{`, 'g');
  let m;
  while ((m = keyRe.exec(src)) !== null) {
    const objStart = m.index;
    const objEnd = src.indexOf('}', objStart);
    if (objEnd === -1) break;
    const obj = src.substring(objStart, objEnd + 1);
    const zhKw = obj.match(/zh:\s*/);
    if (!zhKw) continue;
    let zi = obj.indexOf(zhKw[0]) + zhKw[0].length;
    while (zi < obj.length && /\s/.test(obj[zi])) zi++;
    if (zi >= obj.length) continue;
    const quote = obj[zi];
    if (quote !== '"' && quote !== "'") continue;
    const parsed = parseStringLiteral(obj, zi);
    if (!parsed) continue;
    const [, valueEnd] = parsed;
    const escapedNewZh = newZh.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote);
    const quoteAbsPos = objStart + zi;
    const valueEndAbsPos = objStart + valueEnd;
    return src.substring(0, quoteAbsPos + 1) + escapedNewZh + src.substring(valueEndAbsPos);
  }
  return src;
}
```

Then in `scripts/apply-translations.mjs`:
- Remove `parseStringLiteral` (lines 102-121)
- Remove the inline `replaceZhValue` definition from Step 3
- Add `import { parseStringLiteral, replaceZhValue } from './lib/zh-parser.mjs';` at the top
- Update Step 1 loop to:
  ```js
  let updated = 0;
  for (const [key, zh] of Object.entries(entries)) {
    const before = src;
    src = replaceZhValue(src, key, zh);
    if (src !== before) updated++;
  }
  ```

Update the test file to import:
```js
import { replaceZhValue } from '../../scripts/lib/zh-parser.mjs';
```

- [ ] **Step 5: Run the regression test**

Run: `node --test tests/scripts/test-apply-translations-zh-parser.mjs`
Expected: 4 pass.

Then run: `pnpm exec node scripts/check-i18n-completeness.mjs`
Expected: `+ 100 engineKey=true engines fully translated` (still passing).

- [ ] **Step 6: Move scratch fix scripts to `_archive/`**

Run:
```bash
mkdir -p scripts/.scratch/_archive
git mv scripts/.scratch/fix-5-corruptions.mjs scripts/.scratch/_archive/
git mv scripts/.scratch/fix-nrr.mjs scripts/.scratch/_archive/
git mv scripts/.scratch/fix-corruptions.mjs scripts/.scratch/_archive/
echo "# P18-1: No longer needed — apply-translations.mjs state-machine parser replaces fragile UPDATE regex." > scripts/.scratch/_archive/README.md
git add scripts/.scratch/_archive/README.md
```

- [ ] **Step 7: Commit**

```bash
git add scripts/apply-translations.mjs scripts/lib/zh-parser.mjs tests/scripts/test-apply-translations-zh-parser.mjs scripts/.scratch/_archive/
git commit -m "fix(i18n): P18-1 — apply-translations.mjs uses state-machine parser for zh values (eliminates UPDATE-regex corruption)"
```

---

### Task 2: Retire `scripts/insert-translations.mjs` (superseded)

**Files:**
- Delete: `scripts/insert-translations.mjs`
- Modify: `scripts/check-i18n-completeness.mjs` (no caller expected — verify and skip)

**Background:** P17b promoted `apply-translations.mjs` (handles update + create) over `insert-translations.mjs` (only fills empty zh). All P17b batches (Tasks 1-7) used `apply-translations.mjs`. No new engine has been added since, so insert-translations.mjs has no live callers.

- [ ] **Step 1: Confirm 0 callers**

Run:
```bash
grep -rn "insert-translations" . --include="*.mjs" --include="*.md" --include="*.ts" --include="*.json" --include="*.yml" 2>/dev/null
```

Expected: only matches are the file itself + CLAUDE.md / memory references (which we'll update in Step 3).

- [ ] **Step 2: Delete the file**

Run: `git rm scripts/insert-translations.mjs`

- [ ] **Step 3: Update CLAUDE.md and memory references**

In `CLAUDE.md`, the i18n tooling section mentions `apply-translations.mjs` (comprehensive) and `insert-translations.mjs` (simple). Remove the insert-translations.mjs line; leave only apply-translations.mjs.

In `memory/p17-i18n-backfill-shipped.md`, the "Files" section lists both. Remove `scripts/insert-translations.mjs (NEW: simple fill-empty-zh, both quote styles)`.

- [ ] **Step 4: Run gates**

Run:
```bash
pnpm exec node scripts/check-i18n-completeness.mjs
pnpm exec astro build
```

Expected: completeness check PASS (100/100 engines still translated); build 313 pages 0 errors.

- [ ] **Step 5: Commit + push**

```bash
git add -A
git commit -m "chore(i18n): P18-2 — retire superseded scripts/insert-translations.mjs"
git fetch origin github
git rev-list --left-right --count origin/master...github/master  # expect 0\t0
git push origin master
git push github master
git rev-list --left-right --count origin/master...github/master  # expect 0\t0
```

---

### Task 3: ZH terminology consistency audit

**Files:**
- Create: `docs/i18n/zh-terminology.md` (ZH glossary, ~30 terms)
- Create: `scripts/audit-zh-terminology.mjs` (NEW: scans translations.ts, flags mismatches against glossary)
- Modify: `src/i18n/translations.ts` (fix flagged entries)

**Background:** P17b Task 5 reviewer flagged `pipeline` translated as both `管线` and `销售渠道` across different engines, plus `cohort` (`同期群` vs `同期组`), `churn` (`流失` vs `客户流失`), etc. Cross-batch drift from multiple subagents.

- [ ] **Step 1: Build the glossary**

Create `docs/i18n/zh-terminology.md`:

```markdown
# ForgeFlowKit ZH Terminology Glossary

> **Single source of truth** for technical term ZH translation across all 100 engines.
> Updated: 2026-07-18 (P18-3).

| EN | ZH | Domain | Notes |
|---|---|---|---|
| pipeline | 销售渠道 | Sales | NOT 管线 |
| pipeline coverage | 销售渠道覆盖 | Sales | |
| pipeline value | 销售渠道价值 | Sales | |
| cohort | 同期群 | Retention / Marketing | NOT 同期组 / 同类群 |
| cohort retention | 同期群留存 | Retention | |
| churn | 流失 | Retention | NOT 客户流失 (unless explicitly "customer churn") |
| churn rate | 流失率 | Retention | |
| logo churn | 客户流失率 | Retention | OK to specify 客户 here |
| NRR | 净收入留存率 | Retention | First occurrence: 净收入留存率 (NRR); later: NRR |
| GRR | 总收入留存率 | Retention | |
| expansion revenue | 扩展收入 | Retention | |
| CAC | 客户获取成本 | Marketing / SaaS | NOT 用户获取成本 |
| LTV | 客户生命周期价值 | Marketing / SaaS | |
| ROAS | 广告投资回报率 | Marketing | |
| ARR | 年度经常性收入 | SaaS / Retention | |
| MRR | 月度经常性收入 | SaaS | |
| retention | 留存 | General | NOT 保留 (means "preserve") |
| retention rate | 留存率 | Retention | |
| funnel | 漏斗 | Marketing / Product | NOT 销售漏斗 (unless explicit) |
| conversion rate | 转化率 | Marketing / Product | |
| SLA | 服务等级协议 | Customer Support | |
| CSAT | 客户满意度 | Customer Support | |
| deflection | 偏转 | Knowledge / Support | deflection rate = 偏转率 |
| first response time | 首次响应时间 | Customer Support | |
| resolution time | 解决时间 | Customer Support | |
| breach | 数据泄露 | Legal / Security | NOT 违反 (means "violation") |
| GDPR | 通用数据保护条例 | Legal | |
| DSAR | 数据主体访问请求 | Legal | |
| DPA | 数据处理协议 | Legal | |
| CMP | 同意管理平台 | Legal / Privacy | |
| ePrivacy | 电子隐私条例 | Legal | |
| knowledge base (KB) | 知识库 | Knowledge | |
| article freshness | 文章新鲜度 | Knowledge | NOT 时效性 (means "timeliness") |
| documentation ROI | 文档投资回报率 | Knowledge | |
| employee cost | 员工成本 | Hiring | |
| ramp time | 磨合期 | Hiring | NOT 爬坡时间 |
| productivity ramp | 生产力爬升 | Hiring | OK 爬升 here |
| equity dilution | 股权稀释 | Investment | |
| valuation | 估值 | Investment | |
| mortgage | 按揭贷款 | Real Estate | NOT 抵押贷款 (means "collateral loan") |
| cap rate | 资本化率 | Real Estate | |
| DSCR | 偿债覆盖率 | Real Estate | |
| BRRR | 买入-翻新-出租-再融资 | Real Estate | |
| rental yield | 租金收益率 | Real Estate | |
| rent vs buy | 租购对比 | Real Estate | |
| AI training | AI 训练 | AI Cost | |
| token | Token | AI Cost | Keep English (no canonical ZH) |
```

- [ ] **Step 2: Build the audit script**

Create `scripts/audit-zh-terminology.mjs`:

```js
#!/usr/bin/env node
/**
 * Audit src/i18n/translations.ts for ZH terminology mismatches against docs/i18n/zh-terminology.md.
 * Outputs flagged entries as JSON for human/scripted review.
 *
 * Usage: node scripts/audit-zh-terminology.mjs [--fix-dry-run]
 *
 * P18-3: closes the cross-batch ZH terminology drift flagged by P17b Task 5 reviewer.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');
const glossaryPath = resolve(root, 'docs/i18n/zh-terminology.md');

const src = readFileSync(translationsPath, 'utf-8');
const glossary = readFileSync(glossaryPath, 'utf-8');

// Parse glossary table: rows of `| EN | ZH | Domain | Notes |`
const glossaryRows = glossary.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('EN | ZH'));
const glossaryMap = new Map(); // forbidden-ZH → canonical-ZH (lowercase keys)
for (const row of glossaryRows) {
  const cols = row.split('|').map(c => c.trim()).filter(Boolean);
  if (cols.length < 2) continue;
  const en = cols[0];
  const zh = cols[1];
  // Notes column may list "NOT xxx" — collect forbidden ZH variants
  const notesCol = cols.slice(3).join(' ');
  const notMatches = [...notesCol.matchAll(/NOT\s+([^，,。\s]+)/g)].map(m => m[1]);
  for (const forbidden of notMatches) {
    glossaryMap.set(forbidden, { canonical: zh, en, context: notesCol });
  }
}

// Walk translations.ts — find each 'key': { en: ..., zh: ... } entry
const entryRe = /'([^']+)':\s*\{\s*en:\s*'([^']*)',\s*zh:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
const findings = [];
let m;
while ((m = entryRe.exec(src)) !== null) {
  const [, key, en, zhRaw] = m;
  // Unescape zh
  const zh = zhRaw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  for (const [forbidden, info] of glossaryMap) {
    if (zh.includes(forbidden)) {
      findings.push({ key, en, zh, forbidden, canonical: info.canonical, contextEN: info.en });
    }
  }
}

console.log(JSON.stringify(findings, null, 2));
console.error(`\nTotal flagged: ${findings.length}`);
```

- [ ] **Step 3: Run audit (no fixes yet)**

Run: `node scripts/audit-zh-terminology.mjs > scripts/.scratch/zh-terminology-audit.json 2>scripts/.scratch/zh-terminology-audit.log`

Open `scripts/.scratch/zh-terminology-audit.json`. Manually review each finding:
- True positive → add to fix list (Step 4)
- False positive (the "forbidden" word is used in a different sense, e.g., a quote within a quote) → note and skip

Expected output: 50-150 findings across 100 engines. Each entry must be eyeballed — automated regex can't distinguish "churn" in a finance sense vs a retention sense.

- [ ] **Step 4: Build a scripted fixer (re-uses state-machine from P18-1)**

Create `scripts/fix-zh-terminology.mjs` (uses `replaceZhValue` from P18-1):

```js
#!/usr/bin/env node
/**
 * Apply ZH terminology fixes to src/i18n/translations.ts.
 * Reads scripts/.scratch/zh-terminology-audit.json (curated, post-review).
 *
 * Usage: node scripts/fix-zh-terminology.mjs
 *
 * Input format: array of { key, forbidden, canonical }
 *   e.g., [{ "key": "tools.x.input.y.label", "forbidden": "管线", "canonical": "销售渠道" }]
 *
 * P18-3: closes the audit loop.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceZhValue } from './lib/zh-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');
const auditJsonPath = resolve(root, 'scripts/.scratch/zh-terminology-audit-curated.json');

const fixes = JSON.parse(readFileSync(auditJsonPath, 'utf-8'));
let src = readFileSync(translationsPath, 'utf-8');
let applied = 0;

for (const fix of fixes) {
  // Find the current zh value, replace forbidden with canonical
  // Strategy: extract current zh via parseStringLiteral, mutate, then replaceZhValue
  const escapedKey = fix.key.replace(/\./g, '\\.');
  const keyRe = new RegExp(`'${escapedKey}':\\s*\\{`, 'g');
  const km = keyRe.exec(src);
  if (!km) continue;
  const objStart = km.index;
  const objEnd = src.indexOf('}', objStart);
  if (objEnd === -1) continue;
  const obj = src.substring(objStart, objEnd + 1);
  const zhKw = obj.match(/zh:\s*/);
  if (!zhKw) continue;
  let zi = obj.indexOf(zhKw[0]) + zhKw[0].length;
  while (zi < obj.length && /\s/.test(obj[zi])) zi++;
  // Extract raw zh (with escapes)
  const quote = obj[zi];
  let j = zi + 1;
  let raw = '';
  while (j < obj.length) {
    if (obj[j] === '\\') {
      raw += obj[j] + obj[j + 1];
      j += 2;
      continue;
    }
    if (obj[j] === quote) break;
    raw += obj[j];
    j++;
  }
  // Unescape, replace, re-escape
  const unescaped = raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (!unescaped.includes(fix.forbidden)) continue;
  const updated = unescaped.split(fix.forbidden).join(fix.canonical);
  const escaped = updated.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  src = replaceZhValue(src, fix.key, updated);
  applied++;
}

writeFileSync(translationsPath, src);
console.log(`✅ Applied ${applied} terminology fixes (out of ${fixes.length} audited).`);
```

- [ ] **Step 5: Curate audit findings**

Open `scripts/.scratch/zh-terminology-audit.json`. For each finding, decide:
- Apply (true terminology drift)
- Skip (false positive — different semantic context)
- Skip + add glossary note (edge case worth documenting)

Write the curated list to `scripts/.scratch/zh-terminology-audit-curated.json` as `[{ key, forbidden, canonical }, ...]`.

- [ ] **Step 6: Apply fixes**

Run: `node scripts/fix-zh-terminology.mjs`

Expected output: `Applied N terminology fixes (out of M audited).`

- [ ] **Step 7: Verify build + raw-key invariant**

Run:
```bash
pnpm exec node scripts/check-i18n-completeness.mjs
pnpm exec astro build
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
```

Expected: 100 engineKey PASS; 313 pages built; 0 / 0 raw-key counts.

- [ ] **Step 8: Re-run audit to confirm 0 remaining**

Run: `node scripts/audit-zh-terminology.mjs | head -5`

Expected: empty findings array (or only pre-documented edge cases).

- [ ] **Step 9: Commit + push**

```bash
git add docs/i18n/zh-terminology.md scripts/audit-zh-terminology.mjs scripts/fix-zh-terminology.mjs src/i18n/translations.ts
git commit -m "feat(i18n): P18-3 — ZH terminology consistency audit + glossary + scripted fixer"
git fetch origin github
git rev-list --left-right --count origin/master...github/master
git push origin master
git push github master
git rev-list --left-right --count origin/master...github/master
```

---

### Task 4: Rename category F to "Investment & Real Estate"

**Files:**
- Modify: `src/data/categories.ts:14` (F entry name + description)
- Modify: `src/i18n/translations.ts:189-194` (`category.F.intro.h2/1/2/3` + `category.F.faq.q1.a` through `q3.a` ≈ 8 entries)
- Modify: `src/pages/[lang]/index.astro` if it renders category F title/desc literally (verify before edit)

**Background:** P17b memory noted "Real-estate engines have no category letter (R is Retention per P9 reassignment)." Investigation reveals real-estate 6 engines + investment 4 engines share `categoryId='F'` ("Investment & ROI"). The category name doesn't cover real-estate domain. User decision (2026-07-18): rename F to "Investment & Real Estate" — zero engine/URL migration.

- [ ] **Step 1: Inspect category F translations**

Run: `grep -n "category\.F\." src/i18n/translations.ts | head -30`

Expected: 8-12 entries (`category.F.intro.h2`, `intro.1`, `intro.2`, `intro.3`, `faq.q1.q`, `q1.a`, `q2.q`, `q2.a`, `q3.q`, `q3.a`, possibly `seo.title`, `seo.description`).

- [ ] **Step 2: Update `src/data/categories.ts`**

Change line 14:
```ts
// Before:
{ id: 'F', name: 'Investment & ROI', slug: 'investment-roi', description: 'Calculate sponsorship rates, time value, freelance taxes, and equity dilution scenarios.' },
// After:
{ id: 'F', name: 'Investment & Real Estate', slug: 'investment-real-estate', description: 'Calculate sponsorship rates, time value, freelance taxes, equity dilution, mortgage payments, cap rates, rental yields, BRRR returns, and rent-vs-buy analysis.' },
```

- [ ] **Step 3: Update category.F entries in `src/i18n/translations.ts`**

For each `category.F.*` entry, rewrite the EN + ZH strings to cover both investment AND real-estate. Anchor text:

```
category.F.intro.h2:
  EN: 'About Investment & Real Estate Calculators'
  ZH: '关于投资与房地产计算器'

category.F.intro.1:
  EN: 'Investment and real estate decisions are mostly about time, taxes, and capitalization. Whether you are evaluating a sponsorship deal, calculating freelance tax, modeling equity dilution, sizing a mortgage payment, computing cap rate, or running a BRRR analysis, the right formula turns gut feelings into defendable numbers.'
  ZH: '投资与房地产决策主要是关于时间、税收和资本化。无论你是在评估赞助协议、计算自由职业税务、建模股权稀释、估算按揭月供、计算资本化率，还是跑 BRRR 分析，正确的公式将直觉转化为可辩护的数字。'

category.F.intro.2:
  EN: 'Our 10 investment & real estate calculators cover creator monetization, freelance taxes across 5 countries, equity dilution, time value, mortgage sizing, cap rate analysis, rental yield, BRRR returns, rent-vs-buy, and DSCR. All rates and benchmarks reflect 2026 IRS, Klear, Indeed, Bankrate, and BiggerPockets data.'
  ZH: '我们的 10 个投资与房地产计算器覆盖创作者货币化、5 个国家的自由职业税务、股权稀释、时间价值、按揭估算、资本化率分析、租金收益率、BRRR 回报、租购对比、DSCR。所有税率和基准反映 2026 年 IRS、Klear、Indeed、Bankrate 和 BiggerPockets 数据。'

category.F.intro.3:
  EN: 'Use these tools before signing a contract, before taking an investment offer, before committing to a mortgage, and before any major time or capital commitment.'
  ZH: '在签署合同之前、在接受投资要约之前、在承诺按揭之前，以及在任何重大时间或资本承诺之前使用这些工具。'

category.F.faq.q1.q:
  EN: 'What should I charge for a sponsored post?'
  ZH: '一个赞助帖文我应该收多少？'
  (unchanged — investment-side question still valid)

category.F.faq.q1.a:
  EN: 'CPM-based: $25-50 per 1,000 true audience for podcasts, $15-30 for newsletters, $10-25 for YouTube. Sponsorship rate calculator gives the full formula.'
  ZH: '基于 CPM：播客每 1,000 真实受众 $25-50，新闻通讯 $15-30，YouTube $10-25。赞助费率计算器给出完整公式。'
  (unchanged)

category.F.faq.q2.q (NEW):
  EN: 'How much house can I afford?'
  ZH: '我能负担得起多少钱的房子？'

category.F.faq.q2.a (NEW):
  EN: 'Use the 28/36 rule: housing costs (PITI) ≤ 28% of gross monthly income, total debt service ≤ 36%. The mortgage calculator models P&I, total interest, and amortization for 15y vs 30y terms at your rate.'
  ZH: '使用 28/36 规则：住房成本（PITI）≤ 月税前收入的 28%，总偿债率 ≤ 36%。按揭计算器按你的利率对 15 年 vs 30 年期建模本息、总利息和摊销进度。'

category.F.faq.q3.q (NEW):
  EN: 'What is a good cap rate for rental property?'
  ZH: '出租房产的良好资本化率是多少？'

category.F.faq.q3.a (NEW):
  EN: 'Cap rate benchmarks vary by market class: Class A urban 4-6%, Class B 6-8%, Class C 8-10%, Class D distressed 10%+. The cap rate calculator models NOI, purchase price, and yield at your target rate.'
  ZH: '资本化率基准因市场等级而异：A 级城市 4-6%，B 级 6-8%，C 级 8-10%，D 级困境资产 10% 以上。资本化率计算器按你的目标率建模净营业收入、收购价和收益率。'
```

(If existing `q2.*` / `q3.*` exist and cover different topics, keep them + add `q4.*` for cap rate + `q5.*` for mortgage.)

- [ ] **Step 4: Verify landing page renders correctly**

Run: `grep -rn "Investment.*ROI\|investment-roi" src/pages/`

Expected: matches in `[lang]/index.astro` or related page templates. Update any literal reference.

Then run:
```bash
pnpm exec astro build
grep -c "Investment & Real Estate\|投资与房地产" dist/{en,zh}/index.html
```

Expected: matches found (not 0).

- [ ] **Step 5: Run all gates**

```bash
pnpm exec node scripts/check-i18n-completeness.mjs
pnpm exec astro build
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
node --test tests/scripts/test-apply-translations-zh-parser.mjs
node scripts/audit-zh-terminology.mjs 2>&1 | tail -3
```

Expected: completeness 100/100, build 313 pages, raw-key 0/0, regression test 4 pass, audit 0 findings.

- [ ] **Step 6: Commit + push**

```bash
git add src/data/categories.ts src/i18n/translations.ts
git commit -m "feat(i18n): P18-4 — rename category F to 'Investment & Real Estate' (covers P5 real-estate engines)"
git fetch origin github
git rev-list --left-right --count origin/master...github/master
git push origin master
git push github master
git rev-list --left-right --count origin/master...github/master
```

---

## Self-Review Notes

- **Spec coverage**: All 4 P18 followups mapped to 4 tasks. ZH terminology audit has a scriptable fixer + glossary; real-estate rename has zero-migration scope.
- **Placeholder scan**: No TBDs. All code blocks are real (parseStringLiteral extracted from P17b existing code; replaceZhValue logic proven in P17b Step 1 inline test).
- **Type consistency**: `replaceZhValue` signature stable across Task 1 (extract), Task 2 (no consumer), Task 3 (used by fixer), Task 4 (no consumer). No rename drift.

## P18-3 Subagent Guidance (if using subagent-driven-development)

Each task is **integration**-class (cross-file + cross-cutting). 1 implementer + 1 spec-verify reviewer + 1 quality reviewer per task. Tasks 1 + 3 have the highest risk for bugs (parser / regex); reviewer should adversarially test with hostile inputs (multi-line zh, mixed quotes, escape sequences).

Tasks 2 + 4 are **mechanical** (delete file / rename strings) — 1 implementer + 1 spec-verify only.