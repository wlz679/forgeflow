// P150: tests/wrangler-bindings-contract.test.ts
//
// P153-E2: this file used to assert that wrangler.toml declares an
// `r2_buckets` and a `kv_namespaces` section. That contract was DELIBERATELY
// retired: declaring bindings with placeholder values (a bucket name that
// does not exist, a KV id like REPLACE_WITH_KV_NAMESPACE_ID) makes the
// Cloudflare Pages Function publish fail with Error 8000022 / "R2 bucket
// not found" — which broke the deploy three times (7f0ac94, 85621a3,
// d1250e2). The bindings are provisioned in the Cloudflare Dashboard
// (Pages → forgeflow → Settings → Functions → R2/KV bindings) instead.
//
// New contract:
//   - the binding NAMES are recorded in wrangler.toml, so whoever provisions
//     them in the Dashboard knows exactly what to create;
//   - wrangler.toml does NOT declare r2_buckets / kv_namespaces itself;
//   - no placeholder values sneak back in through any other key.
//
// If the resources ever become real and are moved into wrangler.toml, this
// file and the comment in wrangler.toml must be updated together.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const wranglerPath = resolve(root, "wrangler.toml");

/** The file's non-comment lines — comments legitimately mention the very
 *  placeholder tokens this guard rejects (as examples of what NOT to do). */
function configLines(): string {
  return readFileSync(wranglerPath, "utf-8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

test("wrangler.toml exists at project root", () => {
  assert.ok(existsSync(wranglerPath), "wrangler.toml missing");
});

test("wrangler.toml has compatibility_date", () => {
  const c = readFileSync(wranglerPath, "utf-8");
  assert.match(c, /compatibility_date/, "compatibility_date missing");
});

test("wrangler.toml 记录了 feedback API 的两个绑定名（供 Cloudflare Dashboard 配置）", () => {
  const c = readFileSync(wranglerPath, "utf-8");
  assert.match(c, /FEEDBACK_BUCKET/, "FEEDBACK_BUCKET binding name not documented");
  assert.match(c, /FEEDBACK_KV/, "FEEDBACK_KV binding name not documented");
});

test("wrangler.toml 不声明 r2_buckets / kv_namespaces 段（假绑定会让 CF Pages 部署失败）", () => {
  const c = configLines();
  // Both TOML spellings must be rejected: `[r2_buckets]` (a table) and
  // `[[r2_buckets]]` (an array of tables — the form Cloudflare actually
  // uses for R2 bindings). Matching only the single-bracket form let a
  // `[[r2_buckets]]` block through — caught by the mutation harness, not
  // by reading the test.
  assert.doesNotMatch(
    c,
    /^\s*\[\[?\s*r2_buckets\s*\]\]?/m,
    "r2_buckets section declared — CF Pages Function publish fails on a bucket that does not exist",
  );
  assert.doesNotMatch(
    c,
    /^\s*\[\[?\s*kv_namespaces\s*\]\]?/m,
    "kv_namespaces section declared — CF Pages Function publish fails with Error 8000022 on an invalid namespace id",
  );
});

test("wrangler.toml 的配置行里没有占位符标记", () => {
  const c = configLines();
  for (const marker of ["REPLACE_WITH", "CHANGEME", "YOUR_", "<your", "xxxx"]) {
    assert.ok(
      !c.includes(marker),
      `wrangler.toml 配置行里出现占位符 "${marker}" — 部署会失败`,
    );
  }
});
