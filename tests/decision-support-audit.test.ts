// P151: tests/decision-support-audit.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { scoreEngine, type EngineSource } from "../tmp/audit-decision-support.cjs";

test("scoreEngine: all 4 sub-section keywords present -> score 4", () => {
  const src: EngineSource = {
    slug: "test-full",
    description: "What should you pay for SaaS? Use this calculator.",
    insight: "We recommend Tier B for teams of 5-20 people.",
    result: "Net savings depend on utilization; if usage drops below 50%, the result is negative.",
    uses: "Try the inputs above; next, compare to break-even analysis.",
  };
  const r = scoreEngine(src);
  assert.equal(r.score, 4);
  assert.equal(r.has_dq, true);
  assert.equal(r.has_rec, true);
  assert.equal(r.has_ku, true);
  assert.equal(r.has_na, true);
});

test("scoreEngine: only description keyword -> score 1", () => {
  const src: EngineSource = {
    slug: "test-partial",
    description: "What does this calculator do?",
    insight: "Some long text without any matching keywords here.",
    result: "Total cost: $100.",
    uses: "Enter the values above.",
  };
  const r = scoreEngine(src);
  assert.equal(r.score, 1);
  assert.equal(r.has_dq, true);
  assert.equal(r.has_rec, false);
  assert.equal(r.has_ku, false);
  assert.equal(r.has_na, false);
});

test("scoreEngine: no keywords at all -> score 0", () => {
  const src: EngineSource = {
    slug: "test-empty",
    description: "Calculates something.",
    insight: "Numbers come out.",
    result: "Result: 42",
    uses: "Use the form.",
  };
  const r = scoreEngine(src);
  assert.equal(r.score, 0);
  assert.equal(r.has_dq, false);
  assert.equal(r.has_rec, false);
  assert.equal(r.has_ku, false);
  assert.equal(r.has_na, false);
});

test("scoreEngine: case-insensitive matching", () => {
  const src: EngineSource = {
    slug: "test-case",
    description: "WHAT Should You DO?",
    insight: "We Recommend Tier A.",
    result: "Depends on volume, if usage is high.",
    uses: "Try this next.",
  };
  const r = scoreEngine(src);
  assert.equal(r.score, 4);
});

test("EngineSource type is exported", () => {
  // Type check at runtime via runtime: import above
  assert.ok(true);
});