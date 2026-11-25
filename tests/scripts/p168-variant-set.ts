#!/usr/bin/env node
// P168 B3-16 —— **共享变体集**（G8 与诊断脚本的**唯一一份实现**）。
//
// ⭐⭐ 为什么抽成共享模块（2026-11-25 B3-16 T2）：
//   G8（tests/scripts/p168-locale-roundtrip.ts）原先只有「默认 / 全局 ×2 / 全局 ×3+1」
//   ⇒ **全部保比**（分子分母同步放大）⇒ 比例型 param（如 stale_pct = stale/total）
//   的兜底**恒定不变** ⇒ 「模板把数值冻死」这条逃逸在**全站 2,403 个 code** 上都看不见。
//   B3-16 修复轮在给 G8 加非等比变体时，**实测暴露了 3 条真实缺陷**
//   （其中 1 条是用户可见的错误数字）。
//   ⇒ 变体集必须升级为「保比 + **非等比**」；
//   ⇒ 而「变体集」有**三个消费者**（各自一份必然漂移 ⇒ **抽成这一份**，都 import）：
//     ① tests/scripts/p168-locale-roundtrip.ts          （G8 本体 · CI 守卫消费它）
//     ② tests/scripts/p168-locale-roundtrip-nonratio.ts （诊断脚本 · zh 侧 3 条判据）
//     ③ tests/scripts/p168-locale-token-parity.ts       （逐 token 校验）
//   ⚠️ **仓库里另有两份有意保留的副本**（不要去动它们）：
//     · tests/scripts/p168-b315-params-coverage.mjs（.mjs）
//     · tests/scripts/p168-b315-variant-probe.mjs（.mjs）
//     理由：p168-b315-ratio-escape-proof.mjs 要在 shadow repo 里**文本替换**
//     params-coverage 的 variantsOf 来复现「旧保比台子的盲区」⇒ 抽走会破坏
//     那条闭环证明（4 项判定里有 2 项依赖它）。
//     ⇒ 「只有一处实现」这句话的**准确范围**是「三个 TS 消费者」，
//        **不是**「全仓库」。
//   ⇒ 实测（2026-11-25 B3-16 T2）：三处共用同一份变体集后，
//     覆盖的 token 出现次数 20,578 → **74,708**、code 2,403 → **2,715**
//     （非等比变体触达了更多分支）⇒ 违规仍为 **0**。
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。

export interface Variant {
  /** 变体名（用于报告与诊断输出） */
  name: string;
  /** 该变体的输入 */
  inputs: Record<string, string>;
  /** 该变体是否**保比**（分子分母同步 ⇒ 比例型 param 恒定） */
  ratioPreserving: boolean;
}

/**
 * ⭐ 逐参数独立扰动的倍率（与 tests/scripts/p168-b315-params-coverage.mjs **同构**）
 *   · ×7   —— 把一个输入放大（可能被引擎 clamp ⇒ 与 ×0.4 互补）
 *   · ×0.4 —— 把一个输入缩小（放大被 clamp 时靠它仍能打破比例）
 */
export const SCALES: number[] = [7, 0.4];

/** 只把一个输入按倍率改掉（其余原样）⇒ 分子分母不同步 */
export function scaleOne(
  base: Record<string, string>,
  key: string,
  factor: number,
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  const n = Number(base[key]);
  if (!Number.isFinite(n) || n <= 0) return out;
  const v = Math.round(n * factor);
  if (!(v > 0)) return out;
  out[key] = String(v);
  return out;
}

/**
 * 变体集 —— **保比 + 非等比**（B3-16 起 G8 与诊断脚本共用这一份）：
 *   ① 默认
 *   ② 全局 ×2（保比）· ③ 全局 ×3+1（保比）   ← G8 原有的保比变体
 *   ④ 逐参数独立扰动（**破坏比例关系**）        ← B3-16 新增的那一块
 *
 * ⚠️ 判定口径**不在这里**：本模块只负责「要试哪些输入」；
 *   「什么算不一致」由各消费方自己的判据决定（G8 = 兜底渲染 ≡ locale.en 模板渲染）。
 */
export function variantsOf(base: Record<string, string>): Variant[] {
  const out: Variant[] = [{ name: '默认', inputs: { ...base }, ratioPreserving: true }];
  for (const [label, fn] of [
    ['全局×2', (n: number) => n * 2],
    ['全局×3+1', (n: number) => n * 3 + 1],
  ] as [string, (n: number) => number][]) {
    const inputs: Record<string, string> = {};
    for (const [k, val] of Object.entries(base)) {
      const n = Number(val);
      inputs[k] = Number.isFinite(n) && n > 0 ? String(fn(n)) : val;
    }
    out.push({ name: label, inputs, ratioPreserving: true });
  }
  // ④ 逐参数独立扰动（**只**改一个输入、其余原样 ⇒ 分子分母**不同步**）
  for (const key of Object.keys(base)) {
    const n = Number(base[key]);
    if (!Number.isFinite(n) || n <= 0) continue;
    for (const f of SCALES) {
      const inputs = scaleOne(base, key, f);
      if (inputs[key] === base[key]) continue;
      out.push({
        name: '仅' + key + '×' + f,
        inputs,
        ratioPreserving: false,
      });
    }
  }
  return out;
}
