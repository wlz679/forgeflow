// P150: tests/wrangler-bindings-contract.test.ts
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
