// P150: Feedback Widget — page-render guard
// Verifies built dist/ HTML pages contain the FeedbackWidget markup.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("dist/ HTML pages contain FeedbackWidget markup", () => {
  const samples = [
    "dist/en/solopreneur-mrr-calculator/index.html",
    "dist/zh/solopreneur-mrr-calculator/index.html",
    "dist/en/operations-inventory/inventory-turnover-optimization-guide/index.html",
  ];
  for (const sample of samples) {
    const full = resolve(root, sample);
    if (!existsSync(full)) {
      assert.fail(`${sample} missing — run pnpm build first`);
      return;
    }
    const content = readFileSync(full, "utf-8");
    assert.match(
      content,
      /data-feedback-widget/,
      `${sample} missing FeedbackWidget data-feedback-widget attribute`
    );
  }
});