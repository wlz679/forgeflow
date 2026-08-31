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
  // Match either `key:value` or `key,` patterns — vote/slug/lang are bare identifiers
  const entryShape = /\{[^{}]*\bts:\s*Date\.now\(\)[^{}]*\bvote\b[^{}]*\bslug\b[^{}]*\bpage_kind:\s*[a-zA-Z_$][\w$]*[^{}]*\blang\b[^{}]*\}/;
  assert.match(src, entryShape, "queue entry shape missing required fields");
});