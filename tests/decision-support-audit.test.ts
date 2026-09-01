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