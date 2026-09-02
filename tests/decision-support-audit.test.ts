// P151: tests/decision-support-audit.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { scoreEngine } from "../tmp/audit-decision-support.cjs";

const L5_FULL = `
🧭 Decision Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🧭 Decision Question: What should you pay for SaaS?
• 🧭 Recommendation: We recommend Tier B for teams of 5-20 people.
• 🧭 Key Uncertainty: Net savings depend on utilization.
• 🧭 Next Action: Try the inputs above; next, compare.
`;

const L5_PARTIAL = `
🧭 Decision Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🧭 Decision Question: What does this calc do?
`;

const L5_EMPTY = `
This calculator has no L5 block at all.
Just plain output here.
`;

const L5_CASE = `
🧭 decision question: WHAT Should You DO?
🧭 recommendation: We Recommend Tier A.
🧭 key uncertainty: Depends on volume.
🧭 next action: Try this next.
`;

test("scoreEngine: all 4 L5 markers present in source -> score 4", () => {
  const r = scoreEngine(L5_FULL);
  assert.equal(r.score, 4);
  assert.equal(r.has_dq, true);
  assert.equal(r.has_rec, true);
  assert.equal(r.has_ku, true);
  assert.equal(r.has_na, true);
});

test("scoreEngine: only Decision Question present -> score 1", () => {
  const r = scoreEngine(L5_PARTIAL);
  assert.equal(r.score, 1);
  assert.equal(r.has_dq, true);
  assert.equal(r.has_rec, false);
  assert.equal(r.has_ku, false);
  assert.equal(r.has_na, false);
});

test("scoreEngine: no L5 markers -> score 0", () => {
  const r = scoreEngine(L5_EMPTY);
  assert.equal(r.score, 0);
  assert.equal(r.has_dq, false);
  assert.equal(r.has_rec, false);
  assert.equal(r.has_ku, false);
  assert.equal(r.has_na, false);
});

test("scoreEngine: case-insensitive matching", () => {
  const r = scoreEngine(L5_CASE);
  assert.equal(r.score, 4);
});

test("scoreEngine: accepts plain string input", () => {
  const r = scoreEngine(L5_FULL);
  assert.equal(r.score, 4);
});

test("scoreEngine: accepts object with .source field", () => {
  const r = scoreEngine({ source: L5_FULL });
  assert.equal(r.score, 4);
});