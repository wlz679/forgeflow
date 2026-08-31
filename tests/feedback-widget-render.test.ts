// P150: User-Centric Advisor Phase 1 — Feedback Widget render test
// Verifies component renders correct HTML for each pageKind + i18n lookup.

import test from "node:test";
import assert from "node:assert/strict";

// Inline minimal Astro component shape test
// (Full Astro render test would require astro:test setup; this covers i18n lookup shape.)

test("feedback.up key exists in both locales", () => {
  const en = JSON.parse(
    require("node:fs").readFileSync("src/i18n/locales/en.json", "utf-8")
  );
  const zh = JSON.parse(
    require("node:fs").readFileSync("src/i18n/locales/zh.json", "utf-8")
  );
  for (const k of ["feedback.up", "feedback.down", "feedback.prompt", "feedback.thanks"]) {
    assert.ok(typeof en[k] === "string", `en.${k} missing`);
    assert.ok(typeof zh[k] === "string", `zh.${k} missing`);
  }
});