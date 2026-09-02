import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/product-analytics/funnel-step-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: funnel-step Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-funnel-step-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    step1: "1000",
    step2: "500",
    step3: "200",
    step4: "80",
    step5: "30",
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