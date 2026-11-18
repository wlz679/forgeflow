#!/usr/bin/env node
// P168 B3-9 —— locale「有序插入」共享实现（en.json / zh.json 用同一套规则）。
//
// ⭐ 为什么要抽成共享模块（本批实测教训）
//   · locale 是**有序 JSON**（人读 + diff 友好）⇒ 新键必须插到正确位置。
//   · 直接 `obj[k] = v` 再 `JSON.stringify(obj)` 写盘，会把新键**追加到文件末尾**
//     ⇒ 把 calc_out.* 段撕成两段（本批实测：en/zh 各 9 个 calc_out 键被甩到文件尾部
//     ⇒ merge 工具直接抛「calc_out.* 段不连续 ⇒ 插入策略要重做」）。
//   · 落库工具有两个（merge / repair）⇒ 插入规则必须**只有一处** ⇒ 否则两个工具行为会漂移。
//
// ⭐ 三条不变量（守在这里，不在调用方）
//   ① 只插入、不重排既有键（calc_out 段内有 2 处 B3-7 留下的逆序 ⇒ 整段排序会产生无关 diff）。
//   ② calc_out.* 恒为**连续一段**（落库前先归一化）。
//   ③ 非 calc_out 键的相对顺序不变。

export const CALC_OUT_PREFIX = 'calc_out.';

export interface Segment { start: number; end: number }

/** locale 里 calc_out.* 键所在的连续段（闭区间下标） */
export function calcOutSegments(obj: Record<string, string>): Segment[] {
  const keys = Object.keys(obj);
  const segs: Segment[] = [];
  let cur: Segment | null = null;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].startsWith(CALC_OUT_PREFIX)) {
      if (cur !== null && cur.end === i - 1) cur.end = i;
      else { cur = { start: i, end: i }; segs.push(cur); }
    } else {
      cur = null;
    }
  }
  return segs;
}

/** calc_out.* 是否恰好构成一段（连续） */
export function isCalcOutContiguous(obj: Record<string, string>): boolean {
  return calcOutSegments(obj).length === 1;
}

/**
 * 把分散的 calc_out.* 段并成一段（相对顺序全保留）。
 * · calc_out 键之间：保持文件里的相对顺序（**不重排**）
 * · 非 calc_out 键之间：保持文件里的相对顺序
 * · 结果形状 = 仓库既有形状（HEAD 里 calc_out 就是第 372 个键之后的连续一段）
 */
export function normalizeCalcOut(obj: Record<string, string>): Record<string, string> {
  const keys = Object.keys(obj);
  const segs = calcOutSegments(obj);
  if (segs.length <= 1) return { ...obj };
  const first = segs[0];
  const last = segs[segs.length - 1];
  const out: Record<string, string> = {};
  for (let i = 0; i < first.start; i++) out[keys[i]] = obj[keys[i]];
  const calcKeys: string[] = [];
  for (let i = first.start; i <= last.end; i++) {
    const k = keys[i];
    if (k.startsWith(CALC_OUT_PREFIX)) calcKeys.push(k);
  }
  for (const k of calcKeys) out[k] = obj[k];
  for (let i = first.start; i <= last.end; i++) {
    const k = keys[i];
    if (!k.startsWith(CALC_OUT_PREFIX)) out[k] = obj[k];
  }
  for (let i = last.end + 1; i < keys.length; i++) out[keys[i]] = obj[keys[i]];
  return out;
}

/**
 * 把新键插进 calc_out.* 段（段内字典序；既有键相对顺序不变）。
 * · 落库前先 normalizeCalcOut ⇒ 结果里 calc_out.* 恒为连续一段。
 * · 已存在的键：**不移动**，只按需改值。
 */
export function insertCalcOut(
  obj: Record<string, string>,
  additions: Record<string, string>,
): Record<string, string> {
  const base = normalizeCalcOut(obj);
  const keys = Object.keys(base);
  const positions = keys.map((k, i) => (k.startsWith(CALC_OUT_PREFIX) ? i : -1)).filter((i) => i >= 0);
  if (positions.length === 0) throw new Error('locale 里没有 calc_out.* 段');
  const first = positions[0];
  const last = positions[positions.length - 1];
  if (last - first + 1 !== positions.length) throw new Error('normalizeCalcOut 之后 calc_out.* 仍不连续 ⇒ 归一化逻辑坏了');
  const blockKeys = keys.slice(first, last + 1);
  const blockVals = new Map<string, string>();
  for (const k of blockKeys) blockVals.set(k, base[k]);
  for (const nk of Object.keys(additions).sort()) {
    if (!nk.startsWith(CALC_OUT_PREFIX)) throw new Error('新键不在 calc_out.* 命名空间：' + nk);
    if (blockVals.has(nk)) { blockVals.set(nk, additions[nk]); continue; }
    let pos = blockKeys.length;
    for (let i = 0; i < blockKeys.length; i++) { if (blockKeys[i] > nk) { pos = i; break; } }
    blockKeys.splice(pos, 0, nk);
    blockVals.set(nk, additions[nk]);
  }
  const out: Record<string, string> = {};
  for (let i = 0; i < first; i++) out[keys[i]] = base[keys[i]];
  for (const k of blockKeys) out[k] = blockVals.get(k)!;
  for (let i = last + 1; i < keys.length; i++) out[keys[i]] = base[keys[i]];
  return out;
}

/** locale 文件的统一序列化（2 空格缩进 + 末尾换行；无 BOM） */
export function serializeLocale(obj: Record<string, string>): string {
  return JSON.stringify(obj, null, 2) + String.fromCharCode(10);
}
