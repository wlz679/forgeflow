import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/legal-compliance/gdpr-fine-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: gdpr-fine Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-gdpr-fine-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    annual_revenue_global: "25000000",
    max_fine_pct: "4%",
    violations_per_year: "2",
    industry_risk_multiplier: "SaaS (0.8×)",
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