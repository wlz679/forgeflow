import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/ai-cost/gpu-cloud-cost-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: gpu-cloud-cost Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-gpu-cloud-cost-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    provider: "runpod",
    gpuType: "A100",
    gpuCount: "4",
    hoursPerDay: "8",
    pricingTier: "on-demand",
    includeStorage: "yes",
  }).join("\n");

  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const regex = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, regex, `${marker} must have ≥50 chars of substantive content`);
  }

  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});