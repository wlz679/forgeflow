// P150: Feedback Widget — page-render guard
// Verifies built dist/ HTML pages contain the FeedbackWidget markup.
//
// P153-E2: this suite read dist/ with no build gate and no build of its
// own, so its result depended on whether a local build happened to be
// lying around: on a fresh clone it failed with "… missing — run pnpm
// build first", and in CI (unit-test step runs BEFORE the build step) it
// only passed because an earlier suite had produced dist/. Now it follows
// the repo's established pattern for build-dependent guards: skip unless
// RUN_BUILD_TESTS=1, and build dist/ itself if it is missing.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, "dist", "en", "about", "index.html");
  if (existsSync(probe)) return;
  console.log("[p150-feedback] dist/ missing — running pnpm build...");
  const r = spawnSync("pnpm", ["build"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test("dist/ HTML pages contain FeedbackWidget markup", () => {
  ensureBuilt();
  const samples = [
    "dist/en/solopreneur-mrr-calculator/index.html",
    "dist/zh/solopreneur-mrr-calculator/index.html",
    "dist/en/operations-inventory/inventory-turnover-optimization-guide/index.html",
  ];
  for (const sample of samples) {
    const full = resolve(root, sample);
    assert.ok(existsSync(full), `${sample} missing — run pnpm build first`);
    const content = readFileSync(full, "utf-8");
    assert.match(
      content,
      /data-feedback-widget/,
      `${sample} missing FeedbackWidget data-feedback-widget attribute`
    );
  }
});
