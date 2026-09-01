// P150: tests/api-feedback-admin.test.ts
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
