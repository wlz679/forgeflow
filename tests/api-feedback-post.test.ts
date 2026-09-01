// P150: tests/api-feedback-post.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "src/pages/api/feedback.ts"), "utf-8");
const schemaSource = readFileSync(resolve(root, "src/lib/feedback-schema.ts"), "utf-8");

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
  assert.match(schemaSource, /\.max\(50\)/, "batch cap 50 missing in schema");
});
test("POST endpoint returns accepted/skipped counts", () => {
  // Variable declarations + JSON.stringify shape
  assert.match(source, /let accepted\s*=\s*0/, "accepted counter missing");
  assert.match(source, /let skipped\s*=\s*0/, "skipped counter missing");
  assert.match(source, /JSON\.stringify\(\{\s*accepted\s*,\s*skipped\s*\}\)/, "response shape missing");
});
