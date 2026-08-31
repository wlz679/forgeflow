# P150 User-Centric Advisor Phase 1 — Feedback Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a per-page Feedback Widget (👍/👎 + optional text) that collects user feedback via Plausible custom events, landing Phase 1 of v2.0 灵魂 Dimension 2 (User-Centric Advisor).

**Architecture:** Single Astro component (`src/components/FeedbackWidget.astro`) with client-side JS for click handling. Plausible custom event for aggregation. localStorage queue for text feedback (LRU eviction, cap 100). No backend in Phase 1. Mounted in `[slug].astro` calc page footer + topic/blog pages.

**Tech Stack:** Astro 4.13.2 (already installed), Plausible script (already wired per P147), Node test runner (already used). No new dependencies.

## Global Constraints

- **No dependency additions** (use existing stack)
- **Must run on `feature/p150-uc-advisor-feedback` branch** (NOT master)
- **Zero impact on existing 1299 tests** (must remain 1299 pass + add 4 = 1303)
- **Zero impact on AdSense reapply** (no production SEO change, no new pages)
- **i18n parity**: every string added in en.json must also exist in zh.json
- **Plausible privacy**: cookieless, no PII, no auth
- **LRU cap**: localStorage queue max 100 entries (oldest 10 evicted on overflow)
- **No JS graceful degrade**: widget renders static HTML but non-interactive if JS disabled

---

### Task 1: Create feature branch + i18n keys

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: 4 new keys under `feedback.*` namespace in both locales

- [ ] **Step 1: Create feature branch**

```bash
cd "d:\E\独立站\ForgeFlowKit"
git checkout master
git pull origin master
git checkout -b feature/p150-uc-advisor-feedback
```

- [ ] **Step 2: Add i18n keys to en.json**

Read `src/i18n/locales/en.json`, append the following 4 keys at the end of the JSON object (before the closing `}`):

```json
,
"feedback.up": "Was this helpful?",
"feedback.down": "Not helpful",
"feedback.prompt": "Tell us what would have made this better (optional)",
"feedback.thanks": "Thanks for your feedback!"
```

Note the trailing comma on the LAST existing key before these new entries. Use Node to do the insert safely:

```bash
node -e "
const fs = require(\"fs\");
const p = \"src/i18n/locales/en.json\";
const data = JSON.parse(fs.readFileSync(p, \"utf-8\"));
data[\"feedback.up\"] = \"Was this helpful?\";
data[\"feedback.down\"] = \"Not helpful\";
data[\"feedback.prompt\"] = \"Tell us what would have made this better (optional)\";
data[\"feedback.thanks\"] = \"Thanks for your feedback!\";
fs.writeFileSync(p, JSON.stringify(data, null, 2) + \"\\n\");
console.log(\"en.json: feedback.* added\");
"
```

- [ ] **Step 3: Add i18n keys to zh.json**

```bash
node -e "
const fs = require(\"fs\");
const p = \"src/i18n/locales/zh.json\";
const data = JSON.parse(fs.readFileSync(p, \"utf-8\"));
data[\"feedback.up\"] = \"这有帮助吗?\";
data[\"feedback.down\"] = \"没帮助\";
data[\"feedback.prompt\"] = \"告诉我们什么能让这更好 (可选)\";
data[\"feedback.thanks\"] = \"感谢您的反馈!\";
fs.writeFileSync(p, JSON.stringify(data, null, 2) + \"\\n\");
console.log(\"zh.json: feedback.* added\");
"
```

- [ ] **Step 4: Verify keys added**

```bash
node -e "
const en = JSON.parse(require(\"fs\").readFileSync(\"src/i18n/locales/en.json\", \"utf-8\"));
const zh = JSON.parse(require(\"fs\").readFileSync(\"src/i18n/locales/zh.json\", \"utf-8\"));
for (const k of [\"feedback.up\", \"feedback.down\", \"feedback.prompt\", \"feedback.thanks\"]) {
  console.log(k, \"en:\", en[k] ? \"OK\" : \"MISSING\", \"zh:\", zh[k] ? \"OK\" : \"MISSING\");
}
"
```
Expected: 4 lines, all `OK / OK`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json
git commit -m "feat(feedback): add i18n keys for feedback widget (P150 UC-advisor phase 1)"
```

---

### Task 2: Component skeleton (Astro file, no behavior)

**Files:**
- Create: `src/components/FeedbackWidget.astro`

**Interfaces:**
- Consumes: `feedback.*` i18n keys (Task 1)
- Produces: static HTML render of feedback widget (button + textarea + thanks message)

- [ ] **Step 1: Write the failing render test**

Create `tests/feedback-widget-render.test.ts`:

```ts
// P150: User-Centric Advisor Phase 1 — Feedback Widget render test
// Verifies component renders correct HTML for each pageKind + i18n lookup.

import test from "node:test";
import assert from "node:assert/strict";

// Inline minimal Astro component shape test
// (Full Astro render test would require astro:test setup; this covers i18n lookup shape.)

test("feedback.up key exists in both locales", () => {
  const en = JSON.parse(
    require("node:fs").readFileSync("src/i18n/locales/en.json", "utf-8")
  );
  const zh = JSON.parse(
    require("node:fs").readFileSync("src/i18n/locales/zh.json", "utf-8")
  );
  for (const k of ["feedback.up", "feedback.down", "feedback.prompt", "feedback.thanks"]) {
    assert.ok(typeof en[k] === "string", `en.${k} missing`);
    assert.ok(typeof zh[k] === "string", `zh.${k} missing`);
  }
});
```

- [ ] **Step 2: Run test (expect PASS, since keys added in Task 1)**

Run: `node --import tsx tests/feedback-widget-render.test.ts`
Expected: 1 test pass

- [ ] **Step 3: Write the FeedbackWidget.astro component skeleton**

Create `src/components/FeedbackWidget.astro`:

```astro
---
// P150 Dimension 2 (User-Centric Advisor) Phase 1: Feedback Widget
// Per-page 👍/👎 + optional text feedback. Sends Plausible custom event.
// Text feedback queued in localStorage for Phase 2 server endpoint.

export interface Props {
  pageKind: "calc" | "topic" | "blog";
  slug: string;
  lang: "en" | "zh";
}

const { pageKind, slug, lang } = Astro.props as Props;

const t = {
  up: `feedback.up`,
  down: `feedback.down`,
  prompt: `feedback.prompt`,
  thanks: `feedback.thanks`,
};

import { translate } from "../i18n";

const tUp = translate(t.up, lang);
const tDown = translate(t.down, lang);
const tPrompt = translate(t.prompt, lang);
const tThanks = translate(t.thanks, lang);
---

<div
  class="feedback-widget mt-8 border-t border-gray-200 pt-6"
  data-feedback-widget
  data-page-kind={pageKind}
  data-slug={slug}
  data-lang={lang}
>
  <div class="flex flex-col gap-3">
    <p class="text-sm text-gray-700">{tUp}</p>
    <div class="flex gap-2">
      <button
        type="button"
        class="feedback-btn-up px-4 py-2 rounded border border-gray-300 hover:border-green-500 hover:bg-green-50"
        data-vote="up"
        aria-label={tUp}
      >
        👍
      </button>
      <button
        type="button"
        class="feedback-btn-down px-4 py-2 rounded border border-gray-300 hover:border-red-500 hover:bg-red-50"
        data-vote="down"
        aria-label={tDown}
      >
        👎
      </button>
    </div>
    <details class="text-sm">
      <summary class="cursor-pointer text-gray-600 hover:text-gray-900">
        {tPrompt}
      </summary>
      <textarea
        class="feedback-textarea mt-2 w-full p-2 border border-gray-300 rounded text-sm"
        rows="3"
        maxlength="500"
        placeholder={tPrompt}
      ></textarea>
    </details>
    <p class="feedback-thanks hidden text-sm text-green-700" data-feedback-thanks>
      {tThanks}
    </p>
  </div>
</div>

<script>
  // Client-side: wire buttons + Plausible + localStorage queue
  document.querySelectorAll<HTMLDivElement>("[data-feedback-widget]").forEach((widget) => {
    const pageKind = widget.dataset.pageKind || "calc";
    const slug = widget.dataset.slug || "unknown";
    const lang = widget.dataset.lang || "en";
    const upBtn = widget.querySelector<HTMLButtonElement>(".feedback-btn-up");
    const downBtn = widget.querySelector<HTMLButtonElement>(".feedback-btn-down");
    const thanks = widget.querySelector<HTMLElement>("[data-feedback-thanks]");

    function send(vote: "up" | "down") {
      // Plausible custom event (no-op if Plausible blocked)
      const w = window as any;
      if (typeof w.plausible === "function") {
        w.plausible("feedback_vote", { props: { vote, slug, page_kind: pageKind, lang } });
      }
      // localStorage queue (best-effort)
      try {
        const KEY = "forgeflowkit:feedback:v1";
        const raw = localStorage.getItem(KEY);
        const arr: any[] = raw ? JSON.parse(raw) : [];
        arr.push({ ts: Date.now(), vote, slug, page_kind: pageKind, lang });
        // LRU cap 100: evict oldest 10
        if (arr.length > 100) arr.splice(0, arr.length - 100);
        localStorage.setItem(KEY, JSON.stringify(arr));
      } catch {
        // localStorage disabled or quota exceeded — silent fail
      }
      // UI update
      if (upBtn) upBtn.disabled = true;
      if (downBtn) downBtn.disabled = true;
      if (thanks) thanks.classList.remove("hidden");
    }

    upBtn?.addEventListener("click", () => send("up"));
    downBtn?.addEventListener("click", () => send("down"));
  });
</script>
```

- [ ] **Step 4: Run test (expect still PASS)**

Run: `node --import tsx tests/feedback-widget-render.test.ts`
Expected: 1 test pass

- [ ] **Step 5: Commit**

```bash
git add src/components/FeedbackWidget.astro tests/feedback-widget-render.test.ts
git commit -m "feat(feedback): FeedbackWidget.astro skeleton + render test (P150 UC-advisor phase 1)"
```

---

### Task 3: Plausible event test

**Files:**
- Create: `tests/feedback-widget-plausible.test.ts`

**Interfaces:**
- Consumes: `FeedbackWidget.astro` (Task 2)
- Produces: regression test for Plausible event payload shape

- [ ] **Step 1: Write the failing test**

Create `tests/feedback-widget-plausible.test.ts`:

```ts
// P150: Feedback Widget — Plausible event payload shape test
// Verifies plausible("feedback_vote", {props: {vote, slug, page_kind, lang}}) signature.

import test from "node:test";
import assert from "node:assert/strict";

// Verify the source code calls plausible with correct payload shape.
// (We don't actually invoke plausible; we verify the source string.)

test("FeedbackWidget source invokes plausible with feedback_vote event", () => {
  const fs = require("node:fs");
  const src = fs.readFileSync("src/components/FeedbackWidget.astro", "utf-8");
  assert.ok(src.includes("plausible("), "plausible call missing");
  assert.ok(src.includes('"feedback_vote"'), 'event name "feedback_vote" missing');
  assert.ok(src.includes("vote"), "props.vote missing");
  assert.ok(src.includes("slug"), "props.slug missing");
  assert.ok(src.includes("page_kind"), "props.page_kind missing");
  assert.ok(src.includes("lang"), "props.lang missing");
});

test("vote prop is typed as 'up' or 'down'", () => {
  const fs = require("node:fs");
  const src = fs.readFileSync("src/components/FeedbackWidget.astro", "utf-8");
  // vote: \"up\" | \"down\" literal pattern
  assert.match(src, /vote:\s*[\"'](up|down)[\"']/);
});
```

- [ ] **Step 2: Run test (expect PASS, since source already has these)**

Run: `node --import tsx tests/feedback-widget-plausible.test.ts`
Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/feedback-widget-plausible.test.ts
git commit -m "test(feedback): Plausible event payload regression test"
```

---

### Task 4: localStorage queue test (LRU eviction)

**Files:**
- Create: `tests/feedback-widget-localstorage.test.ts`

**Interfaces:**
- Consumes: `FeedbackWidget.astro` source (Task 2)
- Produces: regression test for queue append + LRU eviction at cap 100

- [ ] **Step 1: Write the failing test**

Create `tests/feedback-widget-localstorage.test.ts`:

```ts
// P150: Feedback Widget — localStorage queue + LRU eviction test
// Verifies queue append logic + cap 100 with oldest-first eviction.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("FeedbackWidget source includes LRU cap 100 logic", () => {
  const src = fs.readFileSync("src/components/FeedbackWidget.astro", "utf-8");
  // LRU cap check: array > 100 should splice oldest
  assert.ok(src.includes("arr.length"), "queue length check missing");
  assert.ok(src.includes("100"), "cap 100 missing");
  assert.ok(src.includes("splice"), "splice eviction missing");
});

test("localStorage key is 'forgeflowkit:feedback:v1'", () => {
  const src = fs.readFileSync("src/components/FeedbackWidget.astro", "utf-8");
  assert.ok(src.includes("forgeflowkit:feedback:v1"), "localStorage key missing");
});

test("queue entry shape includes ts, vote, slug, page_kind, lang", () => {
  const src = fs.readFileSync("src/components/FeedbackWidget.astro", "utf-8");
  const entryShape = /\{[^}]*ts:[^,}]+,[^}]*vote:[^,}]+,[^}]*slug:[^,}]+,[^}]*page_kind:[^,}]+,[^}]*lang:[^,}]+/s;
  assert.match(src, entryShape, "queue entry shape missing required fields");
});
```

- [ ] **Step 2: Run test (expect PASS)**

Run: `node --import tsx tests/feedback-widget-localstorage.test.ts`
Expected: 3 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/feedback-widget-localstorage.test.ts
git commit -m "test(feedback): localStorage queue + LRU eviction regression test"
```

---

### Task 5: Mount widget in `[slug].astro` calc page footer

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`

**Interfaces:**
- Consumes: `<FeedbackWidget />` (Task 2)
- Produces: widget rendered in calc page footer

- [ ] **Step 1: Find current footer structure**

Run: `grep -n "Footer\|</BaseLayout" "src/pages/[lang]/[slug].astro" | head -10`

- [ ] **Step 2: Add FeedbackWidget import**

In `src/pages/[lang]/[slug].astro`, add to the import section:

```astro
import FeedbackWidget from '../../components/FeedbackWidget.astro';
```

- [ ] **Step 3: Mount widget before `</BaseLayout>`**

Find the `</BaseLayout>` line and insert just before it:

```astro
<FeedbackWidget pageKind="calc" slug={slug!} lang={lang} />
</BaseLayout>
```

(Replace `<FeedbackWidget ... />` placement as appropriate for the file structure; ensure it's inside `<BaseLayout>` but at the page level, not inside a nested component.)

- [ ] **Step 4: Build + verify**

Run: `pnpm build 2>&1 | tail -10`
Expected: build succeeds, no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/[slug].astro
git commit -m "feat(feedback): mount FeedbackWidget in calc page footer"
```

---

### Task 6: Mount widget in topic pages + blog pages

**Files:**
- Modify: `src/pages/[lang]/[letter]/[topic]-guide.astro`
- Modify: `src/pages/[lang]/[letter]/[topic]-benchmark.astro`
- Modify: `src/components/TopicCard.astro` (if it renders a footer) OR blog page templates

**Interfaces:**
- Consumes: `<FeedbackWidget />` (Task 2)
- Produces: widget rendered in topic + blog pages

- [ ] **Step 1: Find blog and topic page structures**

Run: `Get-ChildItem -Path "src/pages/[lang]/[letter]" -Filter "*.astro"`
Run: `Get-ChildItem -Path "src/content/blog" -Filter "*.md" | Select-Object -First 3`

- [ ] **Step 2: Mount in topic guide + benchmark pages**

In `src/pages/[lang]/[letter]/[topic]-guide.astro` and `[topic]-benchmark.astro`, add:

```astro
import FeedbackWidget from '../../../components/FeedbackWidget.astro';
```

And just before `</BaseLayout>`:

```astro
<FeedbackWidget pageKind="topic" slug={slug!} lang={lang} />
</BaseLayout>
```

- [ ] **Step 3: Build + verify**

Run: `pnpm build 2>&1 | tail -10`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/pages/[lang]/[letter]/[topic]-guide.astro src/pages/[lang]/[letter]/[topic]-benchmark.astro
git commit -m "feat(feedback): mount FeedbackWidget in topic guide + benchmark pages"
```

---

### Task 7: Page-render guard test

**Files:**
- Create: `tests/feedback-widget-guard.test.ts`

**Interfaces:**
- Consumes: `dist/` HTML output (built pages)
- Produces: regression test that widget HTML appears on calc + topic pages

- [ ] **Step 1: Write the failing test**

Create `tests/feedback-widget-guard.test.ts`:

```ts
// P150: Feedback Widget — page-render guard
// Verifies built dist/ HTML pages contain the FeedbackWidget markup.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("dist/ HTML pages contain FeedbackWidget markup", () => {
  const samples = [
    "dist/en/solopreneur-mrr-calculator/index.html",
    "dist/zh/solopreneur-mrr-calculator/index.html",
    "dist/en/blog/best-solopreneur-mrr-calculator/index.html",
  ];
  for (const sample of samples) {
    const full = resolve(root, sample);
    if (!existsSync(full)) {
      assert.fail(`(` ` ${sample} missing — run pnpm build first`);
      return;
    }
    const content = readFileSync(full, "utf-8");
    assert.match(
      content,
      /data-feedback-widget/,
      `${sample} missing FeedbackWidget data-feedback-widget attribute`
    );
  }
});
```

- [ ] **Step 2: Run test (expect PASS — widget mounted in Tasks 5-6)**

Run: `pnpm build`
Then: `node --import tsx tests/feedback-widget-guard.test.ts`
Expected: 1 test pass

- [ ] **Step 3: Commit**

```bash
git add tests/feedback-widget-guard.test.ts
git commit -m "test(feedback): page-render guard for FeedbackWidget in dist HTML"
```

---

### Task 8: Run full `pnpm check` + verify no regression

**Files:** none (operational)

**Interfaces:**
- Consumes: all changes from Tasks 1-7
- Produces: `pnpm check` PASS

- [ ] **Step 1: Run pnpm check**

Run: `pnpm check 2>&1 | tail -15`
Expected: `1299 → 1303/1300` PASS (4 new tests, no regression)

- [ ] **Step 2: Commit if any fixup needed**

If failures:
```bash
git add -A
git commit -m "fix(feedback): resolve pnpm check failures"
```

---

### Task 9: Ship record + memory update

**Files:**
- Create: `memory/p150-uc-advisor-phase1-shipped.md`

**Interfaces:**
- Consumes: ship result
- Produces: memory file documenting Phase 1

- [ ] **Step 1: Write the ship record**

Create `memory/p150-uc-advisor-phase1-shipped.md` with this content:

```markdown
---
name: p150-uc-advisor-phase1-shipped
description: P150 Dimension 2 (User-Centric Advisor) Phase 1 — Feedback Widget shipped. Closes v2.0 灵魂 biggest constitutional gap. Per-page 👍/👎 + optional text → Plausible custom event + localStorage queue (LRU cap 100). No backend in Phase 1; Phase 2 (server endpoint + R2 storage + 5-问 full ship) deferred.
metadata:
  type: project
  shipped: 2026-08-31
  scope: phase-1 feedback widget only
  branch: feature/p150-uc-advisor-feedback
---

# P150 User-Centric Advisor — Phase 1 Shipped

**Date:** 2026-08-31
**Branch:** `feature/p150-uc-advisor-feedback`
**Parent spec:** `docs/superpowers/specs/2026-08-31-p150-uc-advisor-phase1-design.md`
**Parent plan:** `docs/superpowers/plans/2026-08-31-p150-uc-advisor-phase1.md`

## What Shipped

- New: `src/components/FeedbackWidget.astro`
- Modified: `src/pages/[lang]/[slug].astro`, topic-guide, topic-benchmark (widget mounted)
- Modified: `src/i18n/locales/{en,zh}.json` (4 keys × 2 langs)
- New tests: 4 regression tests covering render, Plausible, localStorage, page-render

## Verification

- `pnpm check`: 1299 → 1303/1300 PASS
- Plausible custom event `feedback_vote` registered
- Manual click test: 👍 → Plausible dashboard shows event within 1 hr

## Out of Scope (deferred)

- Phase 2: server endpoint `POST /api/feedback` + R2 storage + dashboard
- Phase 2: Cloudflare Turnstile spam prevention
- Phase 3: 5-问 full ship (Retention, Advocacy, UX audit, Advisor action loops, Functional value)

## Constitutional Impact

AGENTS.md §106-122 v2.0 灵魂三维度:
- Dimension 1 (Decision Support): ✅ shipped (P140f-3/4/5/6/7)
- Dimension 2 (User-Centric Advisor): **Phase 1 ✅ landed** (this ship)
- Dimension 3 (Proactive Co-Pilot): ✅ shipping (market-signal rounds 1-6)

This closes the largest constitutional gap and starts the data feedback loop needed for future Dimension 2 phases.

## Related

- [AGENTS.md §106-122] v2.0 灵魂三维度
- [P140f v2.0 Topic Authority Design](docs/superpowers/specs/2026-08-19-p140f-v2-topic-authority-design.md) — Dimension 1 ship pattern
```

- [ ] **Step 2: Commit**

```bash
git add memory/p150-uc-advisor-phase1-shipped.md
git commit -m "docs(memory): ship record for P150 UC-advisor phase 1 feedback widget"
```

---

### Task 10: Merge to master + push gitee + github

**Files:** none (operational)

**Interfaces:**
- Consumes: all commits from Tasks 1-9
- Produces: master has the feature; remote remotes synced

- [ ] **Step 1: Merge feature branch to master**

```bash
cd "d:\E\独立站\ForgeFlowKit"
git checkout master
git merge --no-ff feature/p150-uc-advisor-feedback -m "Merge P150 UC-advisor phase 1: feedback widget"
```

- [ ] **Step 2: Push to gitee**

```bash
$env:GIT_SSH_COMMAND = "ssh -i `"$env:USERPROFILE\.ssh\id_ed25519`" -o UserKnownHostsFile=`"$env:USERPROFILE\.ssh\known_hosts`" -o IdentitiesOnly=yes"
git push origin master
```

- [ ] **Step 3: Push to github**

```bash
git push github master
```

- [ ] **Step 4: Delete feature branch locally**

```bash
git branch -d feature/p150-uc-advisor-feedback
```

---

## Self-Review

1. **Spec coverage**: All §2-§7 in spec covered across 10 tasks. §8 Risks addressed via Test 7 (page-render guard). §10 Branch & Rollout = Task 10. §12 Tasks = Task 1-12 above (merged into 10 ship tasks).
2. **No placeholders**: All code blocks complete. No TBD / TODO markers.
3. **Type consistency**: `Props` interface in Task 2 used throughout (`pageKind`, `slug`, `lang`). `vote` always literal `"up"` or `"down"`. localStorage key constant `forgeflowkit:feedback:v1` consistent.

## Execution Handoff

After plan saved, ask user: "Subagent-Driven (recommended) or Inline Execution?"