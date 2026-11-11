import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "../src/engines/hiring-team/comp-banding-calculator";
import { getEngine } from "../src/core/engines/registry";
import { L5_LAYERS } from "./l5-tags.ts";

const root = resolve(import.meta.dirname, "..");

test("P151 L5: comp-banding Decision Recommendation block has 4 sub-sections", () => {
  const engine = getEngine("solopreneur-comp-banding-calculator");
  assert.ok(engine, "engine must be registered");

  // 引擎冒烟检查（决策层本身已不在引擎输出里了 —— 见下面的口径说明）。
  const out = engine.generate({
    role_title: "Senior Engineer",
    base_salary: "150000",
    market_p25: "120000",
    market_p50: "150000",
    market_p75: "180000",
  }).join("\n");
  assert.ok(out.length > 0, "engine must still produce output");

  // ⭐ P168 B3-4：判据**只读页面 i18n**（决策层内容的唯一真相源）。
  //
  // comp-banding 的 🧭 四段已整段迁进页面 i18n（决策支持由区块独占）⇒
  // 「引擎输出里有没有那四个字符串」会把「迁走了」误判成「退化了」。
  //
  // ⚠️⚠️ 不要再引入「引擎输出里还有没有 🧭 段」当**条件分支**：
  //   那个条件式是**回归敏感**的 —— 引擎一旦把 🧭 段写回来，条件就翻转 ⇒
  //   链接检查源从 locale 切回引擎输出 ⇒ csat 引擎里的 `95% CI [68.1%, 75.9%]`
  //   被当成坏工具名 ⇒ **假红**；而且**一次变异会同时红两条断言**
  //   （实测 M31 RED-BUT-NOT-ISOLATED：P168「引擎输出不得再有 🧭 段」
  //     + 本文件的 L5 断言）。
  //   ⇒ 引擎那一侧由 decision-support-guard 的「引擎输出里**不得**再有 🧭 段」
  //      单独守 —— **一个不变量只守一处** ⇒ 一条变异只红一条断言。
  //
  //   ⭐ 去掉引擎分支**不是改松判据**（实测两件事）：
  //     ① **100 个引擎的运行时输出都不再带 🧭 标记**（0/100）⇒ 该分支已成死代码；
  //     ② 15 个工具的**跨工具引用全部在 locale 的 decision_next_tool 里**
  //        （locale 侧 44 个方括号引用**全部**命中真实 shortTitle，0 例外；
  //          引擎输出侧只有 csat 有方括号，其中 `[Resolution Time Calculator]`
  //          在 locale 里也有 ⇒ 覆盖不丢；另两个是 CI 区间 ⇒ 本来就该忽略）。
  const locale = JSON.parse(
    readFileSync(resolve(root, "src/i18n/locales/en.json"), "utf8").replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const slug = "solopreneur-comp-banding-calculator";

  const missing = L5_LAYERS.filter(
    (l) => typeof locale["tools." + slug + "." + l.key] !== "string",
  );
  assert.equal(
    missing.length,
    0,
    `comp-banding 缺失决策层: ${missing.map((m) => m.tag).join(", ")}`,
  );

  // 每个子段都要有**实质内容**（≥50 字符）—— 迁走后正文在页面 i18n 里。
  for (const layer of L5_LAYERS) {
    const prose = locale["tools." + slug + "." + layer.key] ?? "";
    assert.ok(
      prose.length >= 50,
      `${layer.key} must have ≥50 chars of substantive content (got ${prose.length})`,
    );
  }

  // 跨工具链接：**引用现在住在哪，就查哪** —— 迁移后工具引用搬进了 locale 的
  //   decision_next_tool ⇒ 只查引擎输出是查错了地方；而引擎输出里可能有**根本
  //   不是工具引用**的方括号（实测 csat 的 `95% CI [68.1%, 75.9%]`）⇒ 把引擎
  //   输出也塞进链接源 ⇒ 置信区间被当成坏工具名 ⇒ 假红。
  // ⭐⭐ 判据仍然是「**每一个**方括号引用都指向**真实存在**的工具」，不是「至少有一个链接」。
  //   ⚠️ 坑：抓链接的正则**不能**要求结尾是「Calculator」——
  //   实测拼错的 [CAC Calcluator] 会被整条跳过 ⇒ 守卫照样绿。
  //   ⇒ 先抓**所有**方括号引用，再逐个校验它是不是真实工具名。
  const linkSource = locale["tools." + slug + ".decision_next_tool"] ?? "";
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
