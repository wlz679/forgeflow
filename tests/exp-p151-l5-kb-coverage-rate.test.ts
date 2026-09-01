import test from "node:test";
import assert from "node:assert/strict";
import "../src/engines/knowledge/kb-coverage-rate-calculator";
import { getEngine } from "../src/core/engines/registry";

test("P151 L5: kb-coverage-rate Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-kb-coverage-rate-calculator");
  assert.ok(engine, "engine must be registered");

  const out = engine.generate({
    monthly_tickets: "1000",
    tickets_with_kb_match: "450",
    total_articles: "100",
    industry_benchmark: "60",
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