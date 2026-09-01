// P150: tests/feedback-schema.test.ts
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
