// P151: tests/decision-support-audit.test.ts
//
// P153-E2: this file used to import `scoreEngine` from
// `../tmp/audit-decision-support.cjs` — a file in the repo-root scratch
// directory, which .gitignore excludes (`tmp/`). The import therefore
// resolved on a developer machine and FAILED on CI, where the file does not
// exist: the test could never have been green in CI. The scratch script was
// also a third, drifted copy of the L5 marker contract (it matched
// case-sensitively by regex while this test asserted case-INSENSITIVE
// matching — a behaviour no implementation had).
//
// The contract now lives in tests/l5-tags.ts, imported by both this file and
// the decision-layer coverage guard, so the copies cannot drift.
//
// What this file guards: the scoring semantics of the L5 decision layer —
// how many of the four 🧭 sub-sections a block carries.
import test from "node:test";
import assert from "node:assert/strict";
import { L5_TAGS, scoreL5 } from "./l5-tags.ts";

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

const L5_CASE_VARIANT = `
🧭 decision question: WHAT Should You DO?
🧭 recommendation: We Recommend Tier A.
🧭 key uncertainty: Depends on volume.
🧭 next action: Try this next.
`;

test("scoreL5: all 4 L5 markers present in source -> score 4", () => {
  const r = scoreL5(L5_FULL);
  assert.equal(r.score, 4);
  assert.equal(r.has_dq, true);
  assert.equal(r.has_rec, true);
  assert.equal(r.has_ku, true);
  assert.equal(r.has_na, true);
});

test("scoreL5: only Decision Question present -> score 1", () => {
  const r = scoreL5(L5_PARTIAL);
  assert.equal(r.score, 1);
  assert.equal(r.has_dq, true);
  assert.equal(r.has_rec, false);
  assert.equal(r.has_ku, false);
  assert.equal(r.has_na, false);
});

test("scoreL5: no L5 markers -> score 0", () => {
  const r = scoreL5(L5_EMPTY);
  assert.equal(r.score, 0);
  assert.equal(r.has_dq, false);
  assert.equal(r.has_rec, false);
  assert.equal(r.has_ku, false);
  assert.equal(r.has_na, false);
});

// P153-E2: this used to be "case-insensitive matching" and expected 4. No
// implementation ever matched case-insensitively — the coverage guard uses
// an exact `includes()`. The marker is a rendering-format contract, so the
// guard's job is to confirm the canonical spelling is present, not to
// accept near-misses. The contract is now pinned to what actually ships.
test("scoreL5: marker matching is exact — a case variant does not count", () => {
  const r = scoreL5(L5_CASE_VARIANT);
  assert.equal(r.score, 0);
  assert.equal(r.has_dq, false);
  assert.equal(r.has_rec, false);
  assert.equal(r.has_ku, false);
  assert.equal(r.has_na, false);
});

test("scoreL5: accepts plain string input", () => {
  const r = scoreL5(L5_FULL);
  assert.equal(r.score, 4);
});

test("scoreL5: accepts object with .source field", () => {
  const r = scoreL5({ source: L5_FULL });
  assert.equal(r.score, 4);
});

test("L5 契约是 4 个标签，且与覆盖率守卫同源", () => {
  assert.equal(L5_TAGS.length, 4);
  assert.deepEqual(
    [...L5_TAGS],
    ['🧭 Decision Question', '🧭 Recommendation', '🧭 Key Uncertainty', '🧭 Next Action'],
  );
});
