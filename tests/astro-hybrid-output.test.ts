// P150: tests/astro-hybrid-output.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const configPath = resolve(root, "astro.config.mjs");

test("astro.config.mjs uses @astrojs/cloudflare adapter", () => {
  const c = readFileSync(configPath, "utf-8");
  assert.match(c, /@astrojs\/cloudflare/, "cloudflare adapter missing");
});
test("astro.config.mjs sets output=hybrid", () => {
  const c = readFileSync(configPath, "utf-8");
  assert.match(c, /output:\s*.hybrid./, "output=hybrid missing");
});
