import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/cost/employee-cost-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: employee-cost Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-employee-cost-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    annualSalary: "100000",
    benefitsPercentage: "25",
    location: "US",
  }).join("\n");

  // Block header + 4 sub-sections
  assert.match(out, /🧭 Decision Recommendation/);
  assert.match(out, /🧭 Decision Question:/);
  assert.match(out, /🧭 Recommendation:/);
  assert.match(out, /🧭 Key Uncertainty:/);
  assert.match(out, /🧭 Next Action:/);

  // Each section has ≥50 chars of substantive content
  for (const marker of ["Decision Question:", "Recommendation:", "Key Uncertainty:", "Next Action:"]) {
    const rx = new RegExp(`🧭 ${marker}([^\\n]{50,})`);
    assert.match(out, rx, `${marker} must have ≥50 chars of substantive content`);
  }

  // At least one cross-link to another engine
  assert.match(out, /\[[\w\s-]+ Calculator\]/);
});