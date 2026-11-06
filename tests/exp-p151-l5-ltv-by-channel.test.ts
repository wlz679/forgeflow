import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "../src/engines/marketing/ltv-by-channel-calculator";
import { getEngine } from "../src/core/engines/registry";
import { L5_LAYERS } from "./l5-tags.ts";

const root = resolve(import.meta.dirname, "..");

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

  // ⭐ P168 B3-1：判据是「**这个工具的决策建议层齐不齐**」，不是「引擎输出里
  //   有没有那四个字符串」—— ltv-by-channel 的 🧭 四段已**整段迁进页面 i18n**
  //   （决策支持由区块独占）⇒ 后者会把「迁走了」误判成「退化了」，
  //   而迁移正是我们要的形态。
  //   ⇒ 判据 = 引擎输出 ∪ 页面 i18n 键（与 decision-layer-coverage-guard 同一口径）。
  const locale = JSON.parse(
    readFileSync(resolve(root, "src/i18n/locales/en.json"), "utf8").replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const slug = "solopreneur-ltv-by-channel-calculator";

  const missing = L5_LAYERS.filter(
    (l) => !out.includes(l.tag) && typeof locale["tools." + slug + "." + l.key] !== "string",
  );
  assert.equal(
    missing.length,
    0,
    `ltv-by-channel 缺失决策层: ${missing.map((m) => m.tag).join(", ")}`,
  );

  // 每个子段都要有**实质内容**（≥50 字符）—— 迁移前查引擎输出的标记后缀，
  //   迁移后查页面 i18n 的正文长度。
  for (const layer of L5_LAYERS) {
    if (out.includes(layer.tag)) {
      const regex = new RegExp(`${layer.tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\n]{50,})`);
      assert.match(out, regex, `${layer.tag} must have ≥50 chars of substantive content`);
    } else {
      const prose = locale["tools." + slug + "." + layer.key] ?? "";
      assert.ok(
        prose.length >= 50,
        `${layer.key} must have ≥50 chars of substantive content (got ${prose.length})`,
      );
    }
  }

  // 跨工具链接：迁移后在页面的「下一步」层里。
  // ⭐⭐ 判据是「**每一个**方括号引用都指向**真实存在**的工具」，不是「至少有一个链接」。
  //   ⚠️ 坑：抓链接的正则**不能**要求结尾是「Calculator」——
  //   实测拼错的 [CAC Calcluator] 会被整条跳过 ⇒ 守卫照样绿。
  //   ⇒ 先抓**所有**方括号引用，再逐个校验它是不是真实工具名。
  const linkSource = out + "\n" + (locale["tools." + slug + ".decision_next_tool"] ?? "");
  const links = linkSource.match(/\[([^\]]+)\]/g) ?? [];
  assert.ok(links.length > 0, "must link to at least one other tool");
  const realTitles = new Set(
    Object.keys(locale)
      .filter((k) => k.endsWith(".shortTitle"))
      .map((k) => locale[k]),
  );
  for (const raw of links) {
    const title = raw.slice(1, -1);
    assert.ok(
      realTitles.has(title),
      `link [${title}] does not match any real tool shortTitle`,
    );
  }
});
