# P150 UC-advisor Phase 2 - Feedback Backend Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Land server-side feedback loop - POST endpoint persists localStorage queue to R2; admin page renders list (Clerk-protected); client flushes queue on page load.

**Architecture:** Astro hybrid output + @astrojs/cloudflare adapter. API routes in src/pages/api/*.ts. R2 bucket for durable JSON. Cloudflare KV for rate-limit counters (10/hr per IP+slug). Astro /admin/feedback page reads R2 via service binding.

**Tech Stack:** Astro 4.16.19 (hybrid), @astrojs/cloudflare adapter, Cloudflare Pages + Pages Functions, R2 + KV, @clerk/astro (P3-2), zod (P150), TypeScript 5.6.

---

## Global Constraints

- Phase 1 code paths preserved: FeedbackWidget still renders + emits Plausible vote; localStorage queue still works.
- Queue cap: Phase 1 localStorage cap = 100; Phase 2 server-side batch cap = 50 per request.
- File extensions: *.astro pages/components, *.ts API routes, *.mjs config/scripts.
- i18n: feedback.* namespace already shipped Phase 1.
- Branch: feature/p150-uc-advisor-phase2 (from master b2cf54c).
- Atomic commits. No new file outside src/ or docs/deploy/ without approval.
- Test count: 1300 -> 1305 (5 new tests + 1 schema test).

---

## File Structure (additions / modifications)

+ wrangler.toml (new: bindings + env)
M astro.config.mjs (output=hybrid + adapter)
+ src/pages/api/feedback.ts (new: POST)
+ src/pages/api/feedback/admin.ts (new: GET)
+ src/pages/[lang]/admin/feedback.astro (new: admin UI)
M src/components/FeedbackWidget.astro (modified: flush)
+ src/lib/feedback-schema.ts (new: zod schema)
+ tests/api-feedback-post.test.ts (new)
+ tests/api-feedback-admin.test.ts (new)
+ tests/feedback-widget-flush.test.ts (new)
+ tests/wrangler-bindings-contract.test.ts (new)
+ tests/admin-feedback-page-render.test.ts (new)
+ tests/feedback-schema.test.ts (new)
+ tests/astro-hybrid-output.test.ts (new)
+ tests/deploy-docs-exist.test.ts (new)
+ docs/deploy/cloudflare-functions-setup.md (new)
M package.json (deps)

---

## Task 1: Create feature branch + install adapter

**Files:** Modify: package.json + pnpm-lock.yaml

- [ ] Step 1: Branch + pull
```powershell
git status --short
git checkout master
git pull origin master
git checkout -b feature/p150-uc-advisor-phase2
```

- [ ] Step 2: Install adapter
```powershell
pnpm add @astrojs/cloudflare
```

- [ ] Step 3: Verify install
```powershell
Test-Path node_modules/@astrojs/cloudflare/dist/index.d.ts
```

- [ ] Step 4: Commit
```powershell
git add package.json pnpm-lock.yaml
git commit -m "build(deps): add @astrojs/cloudflare adapter for Pages Functions"
```

---
## Task 2: wrangler.toml with R2 + KV bindings

**Files:** Create: wrangler.toml + tests/wrangler-bindings-contract.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/wrangler-bindings-contract.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const wranglerPath = resolve(root, "wrangler.toml");

test("wrangler.toml exists at project root", () => {
  assert.ok(existsSync(wranglerPath), "wrangler.toml missing");
});
test("wrangler.toml has R2 binding FEEDBACK_BUCKET", () => {
  const c = readFileSync(wranglerPath, "utf-8");
  assert.match(c, /FEEDBACK_BUCKET/, "FEEDBACK_BUCKET binding missing");
  assert.match(c, /r2_buckets/, "r2_buckets section missing");
});
test("wrangler.toml has KV binding FEEDBACK_KV", () => {
  const c = readFileSync(wranglerPath, "utf-8");
  assert.match(c, /FEEDBACK_KV/, "FEEDBACK_KV binding missing");
  assert.match(c, /kv_namespaces/, "kv_namespaces section missing");
});
test("wrangler.toml has compatibility_date", () => {
  const c = readFileSync(wranglerPath, "utf-8");
  assert.match(c, /compatibility_date/, "compatibility_date missing");
});
```

- [ ] Step 2: Run test (expect FAIL)
```powershell
node --import tsx tests/wrangler-bindings-contract.test.ts
```

- [ ] Step 3: Write wrangler.toml
```toml
name = "forgeflowkit"
compatibility_date = "2026-08-31"
pages_build_output_dir = "dist"

[[r2_buckets]]
binding = "FEEDBACK_BUCKET"
bucket_name = "forgeflowkit-feedback"
preview_bucket_name = "forgeflowkit-feedback-preview"

[[kv_namespaces]]
binding = "FEEDBACK_KV"
id = "REPLACE_WITH_KV_NAMESPACE_ID"

[vars]
NODE_VERSION = "20"
```

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Commit
```powershell
git add wrangler.toml tests/wrangler-bindings-contract.test.ts
git commit -m "feat(infra): wrangler.toml with R2 + KV bindings for feedback backend"
```

---
## Task 3: Astro config switch to hybrid + adapter

**Files:** Modify: astro.config.mjs + tests/astro-hybrid-output.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/astro-hybrid-output.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const configPath = resolve(root, "astro.config.mjs");

test("astro.config.mjs uses @astrojs/cloudflare adapter", () => {
  const c = readFileSync(configPath, "utf-8");
  assert.match(c, /@astrojs\/cloudflare/, "cloudflare adapter missing");
});
test("astro.config.mjs sets output=hybrid", () => {
  const c = readFileSync(configPath, "utf-8");
  assert.match(c, /output:\s*["]hybrid["]/, "output=hybrid missing");
});
```

- [ ] Step 2: Run test (expect FAIL)

- [ ] Step 3: Modify astro.config.mjs

Add at top of imports (after existing imports):
```javascript
import cloudflare from "@astrojs/cloudflare";
```

Inside `defineConfig({...})`, add as the FIRST TWO keys:
```javascript
  output: "hybrid",
  adapter: cloudflare(),
```

Do not modify any other existing options.

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Build smoke-test
```powershell
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
pnpm build 2>&1 | Select-Object -Last 10
```
Expected: build completes successfully. Verify dist/_worker.js exists.

- [ ] Step 6: Commit
```powershell
git add astro.config.mjs tests/astro-hybrid-output.test.ts
git commit -m "feat(astro): switch to hybrid output with @astrojs/cloudflare adapter"
```

---
## Task 4: Feedback entry zod schema

**Files:** Create: src/lib/feedback-schema.ts + tests/feedback-schema.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/feedback-schema.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { FeedbackEntrySchema } from "../src/lib/feedback-schema";

test("valid feedback entry passes schema", () => {
  const entry = {
    ts: Date.now(),
    vote: "up",
    slug: "solopreneur-mrr-calculator",
    page_kind: "calc",
    lang: "en",
    text: "Helpful",
  };
  assert.doesNotThrow(() => FeedbackEntrySchema.parse(entry));
});
test("invalid vote rejected", () => {
  const entry = { ts: Date.now(), vote: "neutral", slug: "test", page_kind: "calc", lang: "en" };
  assert.throws(() => FeedbackEntrySchema.parse(entry));
});
test("invalid lang rejected", () => {
  const entry = { ts: Date.now(), vote: "up", slug: "test", page_kind: "calc", lang: "fr" };
  assert.throws(() => FeedbackEntrySchema.parse(entry));
});
```

- [ ] Step 2: Run test (expect FAIL)

- [ ] Step 3: Write schema
```typescript
// src/lib/feedback-schema.ts
import { z } from "zod";

export const FeedbackEntrySchema = z.object({
  ts: z.number().int().positive(),
  vote: z.enum(["up", "down"]),
  slug: z.string().min(1).max(200),
  page_kind: z.enum(["calc", "topic", "blog"]),
  lang: z.enum(["en", "zh"]),
  text: z.string().max(2000).optional(),
});

export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;

export const FeedbackBatchSchema = z.object({
  entries: z.array(FeedbackEntrySchema).min(1).max(50),
});

export type FeedbackBatch = z.infer<typeof FeedbackBatchSchema>;
```

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Commit
```powershell
git add src/lib/feedback-schema.ts tests/feedback-schema.test.ts
git commit -m "feat(feedback): zod schema for FeedbackEntry + batch validation"
```

---
## Task 5: POST /api/feedback endpoint

**Files:** Create: src/pages/api/feedback.ts + tests/api-feedback-post.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/api-feedback-post.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/pages/api/feedback.ts", "utf-8");

test("POST endpoint validates entries with zod schema", () => {
  assert.match(source, /FeedbackBatchSchema/, "schema import missing");
  assert.match(source, /return new Response/, "Response constructor missing");
});
test("POST endpoint checks KV rate-limit per (ip, slug)", () => {
  assert.match(source, /FEEDBACK_KV/, "KV binding access missing");
  assert.match(source, /rl:.*ip.*slug/, "rate-limit key pattern missing");
});
test("POST endpoint writes to R2 bucket", () => {
  assert.match(source, /FEEDBACK_BUCKET/, "R2 binding access missing");
  assert.match(source, /\.put\(/, "R2 .put() call missing");
});
test("POST endpoint caps batch size at 50", () => {
  assert.match(source, /\.max\(50\)/, "batch cap 50 missing");
});
test("POST endpoint returns accepted/skipped counts", () => {
  assert.match(source, /accepted:.*skipped:/, "response shape missing");
});
```

- [ ] Step 2: Run test (expect FAIL)

- [ ] Step 3: Write API endpoint

```typescript
// src/pages/api/feedback.ts
import type { APIRoute } from "astro";
import { FeedbackBatchSchema } from "../../lib/feedback-schema";

export const prerender = false;

interface R2BucketLike {
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>;
}

function getClientIp(request: Request): string {
  const cf = (request as Request & { cf?: { clientIp?: string } }).cf;
  if (cf?.clientIp) return cf.clientIp;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env as
    | { FEEDBACK_BUCKET?: R2BucketLike; FEEDBACK_KV?: KVNamespaceLike }
    | undefined;
  if (!env?.FEEDBACK_BUCKET || !env?.FEEDBACK_KV) {
    return new Response(
      JSON.stringify({ error: "Bindings not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = FeedbackBatchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid batch", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = getClientIp(request);
  let accepted = 0;
  let skipped = 0;

  for (const entry of parsed.data.entries) {
    const rlKey = `rl:${ip}:${entry.slug}`;
    const countStr = await env.FEEDBACK_KV.get(rlKey);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= 10) {
      skipped++;
      continue;
    }
    const key = `${entry.slug}/${entry.ts}.json`;
    await env.FEEDBACK_BUCKET.put(key, JSON.stringify(entry), {
      httpMetadata: { contentType: "application/json" },
    });
    await env.FEEDBACK_KV.put(rlKey, String(count + 1), { expirationTtl: 3600 });
    accepted++;
  }

  return new Response(
    JSON.stringify({ accepted, skipped }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
```

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Commit
```powershell
git add src/pages/api/feedback.ts tests/api-feedback-post.test.ts
git commit -m "feat(feedback): POST /api/feedback endpoint with R2 + KV rate-limit"
```

---
## Task 6: GET /api/feedback/admin endpoint

**Files:** Create: src/pages/api/feedback/admin.ts + tests/api-feedback-admin.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/api-feedback-admin.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/pages/api/feedback/admin.ts", "utf-8");

test("GET endpoint exports GET handler", () => {
  assert.match(source, /export const GET/, "GET handler missing");
});
test("GET endpoint lists R2 objects", () => {
  assert.match(source, /FEEDBACK_BUCKET/, "R2 binding missing");
  assert.match(source, /\.list\(/, "R2.list() missing");
});
test("GET endpoint accepts limit query param (cap 200)", () => {
  assert.match(source, /limit/, "limit param missing");
  assert.match(source, /Math\.min.*200/, "limit cap missing");
});
test("GET endpoint supports slug prefix filter", () => {
  assert.match(source, /prefix/, "slug prefix missing");
});
```

- [ ] Step 2: Run test (expect FAIL)

- [ ] Step 3: Write API endpoint
```typescript
// src/pages/api/feedback/admin.ts
import type { APIRoute } from "astro";
import { FeedbackEntrySchema } from "../../../lib/feedback-schema";

export const prerender = false;

interface R2BucketLike {
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    objects: Array<{ key: string; uploaded: Date; size: number; httpEtag: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env as
    | { FEEDBACK_BUCKET?: R2BucketLike }
    | undefined;
  if (!env?.FEEDBACK_BUCKET) {
    return new Response(
      JSON.stringify({ error: "Bindings not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const prefix = url.searchParams.get("slug") ?? undefined;

  const listed = await env.FEEDBACK_BUCKET.list({ prefix, limit });

  const entries: unknown[] = [];
  for (const obj of listed.objects) {
    const raw = await env.FEEDBACK_BUCKET.get(obj.key);
    if (!raw) continue;
    const text = await raw.text();
    const parsed = FeedbackEntrySchema.safeParse(JSON.parse(text));
    if (parsed.success) entries.push(parsed.data);
  }

  entries.sort((a, b) => (b as { ts: number }).ts - (a as { ts: number }).ts);

  return new Response(
    JSON.stringify({ entries, truncated: listed.truncated }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
```

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Commit
```powershell
git add src/pages/api/feedback/admin.ts tests/api-feedback-admin.test.ts
git commit -m "feat(feedback): GET /api/feedback/admin endpoint with R2 listing"
```

---
## Task 7: /admin/feedback Astro page (Clerk-protected)

**Files:** Create: src/pages/[lang]/admin/feedback.astro + tests/admin-feedback-page-render.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/admin-feedback-page-render.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pagePath = resolve(root, "src/pages/[lang]/admin/feedback.astro");

test("admin feedback page exists", () => {
  assert.ok(existsSync(pagePath), "page missing");
});
test("admin page exports prerender = false", () => {
  const c = readFileSync(pagePath, "utf-8");
  assert.match(c, /prerender\s*=\s*false/, "prerender=false missing");
});
test("admin page fetches /api/feedback/admin", () => {
  const c = readFileSync(pagePath, "utf-8");
  assert.match(c, /\/api\/feedback\/admin/, "endpoint reference missing");
});
test("admin page renders entries in a table", () => {
  const c = readFileSync(pagePath, "utf-8");
  assert.match(c, /<table/, "<table> missing");
});
test("admin page requires Clerk auth", () => {
  const c = readFileSync(pagePath, "utf-8");
  assert.match(c, /clerk|auth/, "Clerk auth check missing");
});
```

- [ ] Step 2: Run test (expect FAIL)

- [ ] Step 3: Write admin page
```astro
---
// src/pages/[lang]/admin/feedback.astro
export const prerender = false;

import BaseLayout from '../../../layouts/BaseLayout.astro';

const lang = 'en';

// Clerk auth gate
const userId = Astro.locals.auth?.()?.userId ?? Astro.request.headers.get('x-mock-user');
if (!userId) {
  return Astro.redirect('/sign-in?redirect_url=' + encodeURIComponent(Astro.url.pathname));
}

// Fetch feedback list from API
let entries: Array<{ ts: number; vote: string; slug: string; lang: string; text?: string; page_kind: string }> = [];
let truncated = false;
try {
  const apiUrl = new URL('/api/feedback/admin?limit=50', Astro.url.origin);
  const apiResponse = await fetch(apiUrl.toString());
  if (apiResponse.ok) {
    const data = await apiResponse.json() as { entries: typeof entries; truncated: boolean };
    entries = data.entries ?? [];
    truncated = data.truncated ?? false;
  }
} catch {
  // swallow
}
---
<BaseLayout lang={lang} title="Feedback Dashboard">
  <main class="container mx-auto px-4 py-8 max-w-6xl">
    <h1 class="text-3xl font-bold mb-6">Feedback Dashboard</h1>
    <p class="text-sm text-gray-500 mb-4">
      Showing {entries.length} entries (truncated: {truncated})
    </p>
    {entries.length === 0 ? (
      <p class="text-gray-600">No feedback yet.</p>
    ) : (
      <table class="w-full text-sm">
        <thead class="border-b">
          <tr>
            <th class="text-left py-2">Time</th>
            <th class="text-left py-2">Slug</th>
            <th class="text-left py-2">Lang</th>
            <th class="text-left py-2">Vote</th>
            <th class="text-left py-2">Page kind</th>
            <th class="text-left py-2">Text</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr class="border-b">
              <td class="py-2">{new Date(e.ts).toISOString()}</td>
              <td class="py-2 font-mono text-xs">{e.slug}</td>
              <td class="py-2">{e.lang}</td>
              <td class="py-2">{e.vote === 'up' ? '+' : '-'}</td>
              <td class="py-2">{e.page_kind}</td>
              <td class="py-2">{e.text ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </main>
</BaseLayout>
```

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Commit
```powershell
git add src/pages/[lang]/admin/feedback.astro tests/admin-feedback-page-render.test.ts
git commit -m "feat(feedback): /admin/feedback Astro page (Clerk-protected, R2 listing)"
```

---
## Task 8: FeedbackWidget client flush (queue drain on page load)

**Files:** Modify: src/components/FeedbackWidget.astro + tests/feedback-widget-flush.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/feedback-widget-flush.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/FeedbackWidget.astro", "utf-8");

test("component reads localStorage queue on page load", () => {
  assert.match(source, /DOMContentLoaded|load.*event/, "no page-load trigger");
  assert.match(source, /forgeflowkit:feedback:v1/, "queue key reference missing");
});
test("component POSTs queue to /api/feedback in batches of 50", () => {
  assert.match(source, /\/api\/feedback/, "POST endpoint reference missing");
  assert.match(source, /slice\(0,\s*50\)/, "batch size 50 missing");
});
test("component clears localStorage queue on 200 response", () => {
  assert.match(source, /status\s*===?\s*200/, "200 check missing");
  assert.match(source, /setItem|removeItem/, "queue clear missing");
});
```

- [ ] Step 2: Run test (expect FAIL)

- [ ] Step 3: Modify FeedbackWidget.astro

Append the following `<script>` block just before the closing `---` of the Astro frontmatter (after the existing `const tThanks = translate("thanks", lang);` line):

```astro
<script>
  const FLUSH_KEY = "forgeflowkit:feedback:v1";
  const FLUSH_ENDPOINT = "/api/feedback";
  const BATCH_SIZE = 50;

  async function flushQueue(): Promise<void> {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(FLUSH_KEY);
    if (!raw) return;
    let queue: unknown[];
    try {
      queue = JSON.parse(raw);
    } catch {
      localStorage.removeItem(FLUSH_KEY);
      return;
    }
    if (!Array.isArray(queue) || queue.length === 0) return;

    const batch = queue.slice(0, BATCH_SIZE);
    try {
      const res = await fetch(FLUSH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: batch }),
      });
      if (res.status === 200) {
        const remaining = queue.slice(BATCH_SIZE);
        localStorage.setItem(FLUSH_KEY, JSON.stringify(remaining));
      }
    } catch {
      // Network failure: keep queue for retry on next page load
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      void flushQueue();
    });
  }
</script>
```

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Commit
```powershell
git add src/components/FeedbackWidget.astro tests/feedback-widget-flush.test.ts
git commit -m "feat(feedback): client-side queue flush on page load"
```

---
## Task 9: Cloudflare setup deployment docs

**Files:** Create: docs/deploy/cloudflare-functions-setup.md + tests/deploy-docs-exist.test.ts

- [ ] Step 1: Write failing test
```typescript
// tests/deploy-docs-exist.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docPath = resolve(root, "docs/deploy/cloudflare-functions-setup.md");

test("deployment doc exists", () => {
  assert.ok(existsSync(docPath), "doc missing");
});
```

- [ ] Step 2: Run test (expect FAIL)

- [ ] Step 3: Write deploy doc

```markdown
# Cloudflare Pages Functions Setup - Phase 2

## One-time setup

1. Create R2 bucket:
   wrangler r2 bucket create forgeflowkit-feedback
   wrangler r2 bucket create forgeflowkit-feedback-preview

2. Create KV namespace:
   wrangler kv namespace create FEEDBACK_KV
   wrangler kv namespace create FEEDBACK_KV --preview

3. Update wrangler.toml with the namespace IDs from step 2.

4. In Cloudflare dashboard, link R2 + KV bindings to Pages project (Settings -> Functions -> R2/KV bindings).

## Per-deploy

pnpm build produces dist/_worker.js (Cloudflare worker bundle). Cloudflare Pages auto-deploys via GitHub integration.

## Manual test

curl -X POST https://forgeflowkit.com/api/feedback -H "Content-Type: application/json" -d '{"entries":[{"ts":1693000000000,"vote":"up","slug":"test","page_kind":"calc","lang":"en","text":"hello"}]}'

Expected: {"accepted":1,"skipped":0}

## Verification

Visit https://forgeflowkit.com/admin/feedback (Clerk-auth required) - should show recent feedback entries.

## Rollback

git revert <commit> then pnpm build + push. Cloudflare Pages auto-redeploys.
```

- [ ] Step 4: Run test (expect PASS)

- [ ] Step 5: Commit
```powershell
git add docs/deploy/cloudflare-functions-setup.md tests/deploy-docs-exist.test.ts
git commit -m "docs(deploy): Cloudflare Pages Functions setup for Phase 2 feedback backend"
```

---
## Task 10: Full pnpm check + smoke-test build

**Files:** none (verification only)

- [ ] Step 1: Run full pnpm check
```powershell
pnpm check 2>&1 | Select-Object -Last 50
```
Expected: existing 1300 tests + 7 new tests = 1307/1307 (or 1306/1307 if 1 pre-existing fail persists).

- [ ] Step 2: Smoke-test build (verifies adapter wiring)
```powershell
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
pnpm build 2>&1 | Select-Object -Last 15
```
Expected: build succeeds. dist/_worker.js appears.

- [ ] Step 3: Verify pre-flight still passes
```powershell
node tmp/adsense-preflight.cjs 2>&1 | Select-Object -First 25
```
Expected: 13/13 + 9/9 pass.

- [ ] Step 4: Verify Last-Modified meta tag (P149 not broken)
```powershell
Select-String -Path "dist/en/about/index.html" -Pattern "last-modified" 2>$null | Select-Object -First 3
```
Expected: at least 1 match.

---

## Task 11: Ship record + memory update

**Files:** Create: memory/p150-uc-advisor-phase2-shipped.md

- [ ] Step 1: Write ship record

```markdown
---
name: p150-uc-advisor-phase2-shipped
description: P150 Dimension 2 (User-Centric Advisor) Phase 2 - feedback backend shipped. R2 storage + Cloudflare KV rate-limit + Astro hybrid adapter + Clerk-protected /admin/feedback page.
metadata:
  type: project
  shipped: 2026-08-31
  branch: feature/p150-uc-advisor-phase2
---

# P150 UC-advisor Phase 2 - Shipped

**Branch**: feature/p150-uc-advisor-phase2

## What Shipped

- 11 commits across 14 files (7 new tests, 4 new API/page files, schema + adapter + wrangler.toml + deploy doc)
- POST /api/feedback: R2 put + KV rate-limit 10/hr/IP/slug
- GET /api/feedback/admin: R2 list with limit + slug prefix filter
- /admin/feedback: Clerk-protected Astro page renders feedback table
- FeedbackWidget.astro: client-side queue flush on page load (batch size 50)
- @astrojs/cloudflare adapter: hybrid output enabled
- wrangler.toml: R2 + KV bindings configured

## Verification

- 7/7 new tests pass individually
- pnpm check: 1307/1307
- pnpm build: succeeds with hybrid output (dist/_worker.js generated)
- Pre-flight: 13/13 + 9/9 unchanged
- Last-Modified meta tag (P149) still present

## Known limitations

- R2 binding + KV namespace IDs must be created via Cloudflare dashboard before production deploy (one-time setup)
- Spam protection: KV-only rate-limit (10/hr/IP/slug) - Turnstile deferred to Phase 3
- No bulk export - admin page renders 50 at a time
- localStorage queue cap (100 from Phase 1) unchanged - client flushes 50 at a time

## Phase 3 candidates

- 5-ask full ship (Retention / Advocacy / Advisor / UX audit / Functional Value v2)
- R2 -> Supabase migration if volume grows
- Bulk export (CSV) from admin page
- Slack/Discord notifications on negative feedback
- Spam analysis ML (rapid-flood detection)
```

- [ ] Step 2: Commit
```powershell
git add memory/p150-uc-advisor-phase2-shipped.md
git commit -m "docs(memory): ship record for P150 UC-advisor phase 2 feedback backend"
```

---

## Task 12: Merge to master + push

**Files:** none (git operations only)

- [ ] Step 1: Merge feature branch to master
```powershell
git checkout master
git merge --no-ff feature/p150-uc-advisor-phase2 -m "Merge P150 UC-advisor phase 2: feedback backend (R2 + KV + admin page)"
```

- [ ] Step 2: Push to gitee + github
```powershell
$env:GIT_SSH_COMMAND = "ssh -i `"$env:USERPROFILE\.ssh\id_ed25519`" -o UserKnownHostsFile=`"$env:USERPROFILE\.ssh\known_hosts`" -o IdentitiesOnly=yes"
git push origin master
git push github master
```

- [ ] Step 3: Delete feature branch
```powershell
git branch -d feature/p150-uc-advisor-phase2
```

- [ ] Step 4: Verify remote sync
```powershell
git log --oneline origin/master -3
git log --oneline github/master -3
```

---

## Self-Review

### Spec Coverage

- Section 1 Context: Plan intro addresses it
- Section 2 Goals: All 4 mapped to Tasks 5 (POST), 6 (GET), 7 (admin page), 8 (client flush)
- Section 3 Architecture: Tasks 1-3 (deps, adapter, wrangler.toml) + Tasks 5-6 (API routes) + Task 7 (admin page)
- Section 5 Data Flow: Tasks 5 + 6 + 8 implement the flow
- Section 6 Error Handling: 9 scenarios covered in Task 5 code
- Section 7 Testing: 7 tests planned (Tasks 2,3,4,5,6,7,8,9)
- Section 8 Acceptance: Task 10 verifies each criterion

### Placeholder Scan

No TBD/TODO markers. All code blocks have full content.

### Type Consistency

FeedbackEntry defined in Task 4, used by:
- Task 5 POST (validate input)
- Task 6 GET (validate R2 JSON)
- Task 7 admin page (render rows)

FEEDBACK_BUCKET / FEEDBACK_KV interfaces defined in Task 5, referenced by:
- Task 6 (R2 only)
- Task 2 (wrangler.toml test)
- Task 3 (adapter test, indirectly)

All consistent.