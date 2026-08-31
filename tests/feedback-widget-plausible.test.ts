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
  assert.match(src, /vote:\s*["'](up|down)["']/);
});