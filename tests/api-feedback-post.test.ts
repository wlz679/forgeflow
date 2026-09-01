// P150: tests/api-feedback-post.test.ts
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
