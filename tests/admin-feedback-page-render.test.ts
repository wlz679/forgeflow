// P150: tests/admin-feedback-page-render.test.ts
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
