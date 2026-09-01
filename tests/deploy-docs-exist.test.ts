// P150: tests/deploy-docs-exist.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const docPath = resolve(root, "docs/deploy/cloudflare-functions-setup.md");

test("deployment doc exists", () => {
  assert.ok(existsSync(docPath), "doc missing");
});
