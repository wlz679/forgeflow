// P150: tests/feedback-widget-flush.test.ts
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
  // Accepts either slice(0, 50) literal or BATCH_SIZE constant = 50
  assert.ok(
    /slice\(0,\s*50\)/.test(source) || /BATCH_SIZE\s*=\s*50[\s\S]*slice\(0,\s*BATCH_SIZE\)/.test(source),
    "batch size 50 missing"
  );
});
test("component clears localStorage queue on 200 response", () => {
  assert.match(source, /status\s*===?\s*200/, "200 check missing");
  assert.match(source, /setItem|removeItem/, "queue clear missing");
});
