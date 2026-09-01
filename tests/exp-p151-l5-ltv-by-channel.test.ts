import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/marketing/ltv-by-channel-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: ltv-by-channel Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-ltv-by-channel-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    ch1_spend: "10000",
    ch1_conv: "100",
    ch1_ltv: "500",
    ch2_spend: "5000",
    ch2_conv: "50",
    ch2_ltv: "600",
    ch3_spend: "8000",
    ch3_conv: "40",
    ch3_ltv: "400",
    ch4_spend: "3000",
    ch4_conv: "20",
    ch4_ltv: "300",
    ch5_spend: "2000",
    ch5_conv: "10",
    ch5_ltv: "200",
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