import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/sales/acv-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: acv Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-acv-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    totalContractValue: "120000",
    contractLength: "12",
    numCustomers: "100",
    expansionRate: "15",
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