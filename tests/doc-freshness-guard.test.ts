#!/usr/bin/env node
// P167 —— 文档新鲜度守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// 用户 2026-11-04 问「是不是还有一些过期无用的文档？」⇒ 实测发现：
//   · README 的**分类表整张是错的** —— 列了 17 个分类，其中 **I / V / AI** 是现实里
//     **不存在**的幽灵字母（P46 审计早已判定它们是幻影），且**漏了真实存在的 A**；
//     每个分类的描述也错位（B 写成「Business」，真 B 是 AI Cost Tools）。
//     ⇒ README 是**人类读者与新 AI session 的入口**，教错站点结构比不写更糟。
//   · README 的 4 个数量断言全部漂移（页数 313→437 / spec 44→83 / plan 51→108 /
//     memory 41→179）；
//   · 四层 INDEX（「navigator pyramid」）全部漂移：plans 漏 **38**、specs 漏 **1**、
//     memory 漏 **138**；外加 1 个**从未存在过的 plan 文件**（P141h）。
//
// ⭐ 这些漂移**静默存在了 3 个月**（INDEX 最后更新停在 2026-07-19 / 08-26）——
//   因为**没有任何守卫在看它们**。本守卫就是那道缺失的防线。
//
// 守卫守六件事（每个函数一条断言，断言按**失败模式**枚举）：
//   ① **README 分类表 == 真实分类**（字母集合与名称逐条相等）
//      —— 幽灵分类与漏列分类都会红；
//   ② **README 不得写死「会随批次漂移」的数量**（页数 / spec 数 / plan 数 /
//      memory 数）—— 它们每批次都会变 ⇒ 正确的做法是指向 INDEX 的指针；
//   ③ **docs/INDEX.md 同样不得写死会漂的文件数**（顶层 navigator 与 README 同病）；
//   ④ **README 里的链接与路径都必须存在**（坏链会让读者按图索骥却找不到）；
//   ⑤ **README 分类表的算子数 == 真实引擎数**（第三列是手写的，同样会漂）；
//   ⑥ **四层 INDEX 的覆盖完整**：每个 .md 都要被登记，且不得有幽灵条目。
//
// ⚠️ 判据要落在**要禁的那个形状**上：
//   ② 不是「README 必须写对数字」，而是「**README 不该写会漂的数字**」——
//      后者不会因为下个批次加一个文件就红（前者会）；
//   幽灵判定必须排除**通配符**（`*-series-shipped.md` 是一类文件的说明）
//      与**指向仓库外的引用**（user-global memory 的同名文件）。
//
// ⭐ **规则实现在 `tests/_doc-freshness-checks.ts`**（与体检工具共用同一份）
//   —— 两边各写一份迟早会对不上 ⇒ 工具报「0 个问题」而守卫在红 ⇒ 体检数字会误导人。
//
// 体检工具（人看）：tests/scripts/p167-doc-drift-scan.ts
// 补登记生成器：tests/scripts/p167-index-regen.ts

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  checkReadmeCategoryTable,
  checkReadmeDriftNumbers,
  checkDocsIndexDriftNumbers,
  checkReadmeLinks,
  checkReadmeEngineCounts,
  checkIndexCoverage,
  checkIndexCounts,
} from './_doc-freshness-checks.ts';

const CHECKS: { name: string; run: () => { kind: string; detail: string }[] }[] = [
  {
    name: 'P167 文档新鲜度：README 的分类表 == 真实分类（幽灵 / 漏列都会红）',
    run: checkReadmeCategoryTable,
  },
  {
    name: 'P167 文档新鲜度：README 不得写死「会随批次漂移」的数量',
    run: checkReadmeDriftNumbers,
  },
  {
    name: 'P167 文档新鲜度：docs/INDEX.md 也不得写死会漂的文件数',
    run: checkDocsIndexDriftNumbers,
  },
  {
    name: 'P167 文档新鲜度：README 里的链接与路径都必须存在',
    run: checkReadmeLinks,
  },
  {
    name: 'P167 文档新鲜度：README 分类表的算子数 == 真实引擎数',
    run: checkReadmeEngineCounts,
  },
  {
    name: 'P167 文档新鲜度：四层 INDEX 覆盖完整（无漏登记、无幽灵）',
    run: checkIndexCoverage,
  },
  {
    name: 'P167 文档新鲜度：INDEX 的类别计数表 == 各段实际登记数',
    run: checkIndexCounts,
  },
];

for (const c of CHECKS) {
  test(c.name, () => {
    const problems = c.run();
    assert.deepEqual(
      problems.map((p) => p.detail),
      [],
      '文档漂移：' + problems.map((p) => '[' + p.kind + '] ' + p.detail).join(String.fromCharCode(10)),
    );
  });
}
