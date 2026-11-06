// Canonical L5 decision-layer tag contract.
//
// P140f §15.2 / AGENTS.md 灵魂三维度: every engine's runtime output carries
// a "🧭 Decision Recommendation" block with four sub-sections.
//
// P153-E2: this contract used to be spelled out three times — in the
// decision-layer coverage guard, in the P151 audit script under tmp/ (which
// is gitignored, so the test that imported it could never run on CI), and
// in scripts/score-user-value.mjs. Three copies drifted: the audit script
// matched case-sensitively by regex, the guard matched by exact `includes`,
// and the test asserted case-INSENSITIVE matching — a contract no
// implementation ever had.
//
// One definition, imported by every TypeScript consumer. The marker is an
// exact, case-sensitive format contract: the L5 block is a rendering
// convention, and the guard's job is to confirm the canonical spelling is
// present, not to accept near-misses.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 决策层契约的一个层：**页面 i18n 键后缀** ↔ **引擎输出里的标记**。
 */
export interface L5Layer {
  /** 页面决策层的 i18n 键后缀（`tools.<slug>.<key>`） */
  key: string;
  /** 引擎输出里的标记（🧭 Xxx） */
  tag: string;
}

/**
 * ⭐ 决策层契约的**唯一真值**在 `tests/l5-layers.json` —— TS 守卫与 .mjs 脚本都读它。
 *
 * 为什么是 JSON 而不是 TS：`scripts/score-user-value.mjs` 是**纯 JS**
 * （用裸 node 跑，不能 import .ts）⇒ 契约放 TS 里它读不到 ⇒ 必然复制一份
 * ⇒ 必然漂。P153-E2 记过：契约抄三份、抄出三种匹配语义（大小写敏感 / 正则 / includes）。
 * ⇒ 一份 JSON + 两个读者 ⇒ 不可能对不上。
 */
const LAYER_FILE = resolve(import.meta.dirname, 'l5-layers.json');
export const L5_LAYERS: readonly L5Layer[] = JSON.parse(
  readFileSync(LAYER_FILE, 'utf8'),
).layers;

/** 引擎输出里的四个 L5 标记（顺序 == 契约顺序） */
export const L5_TAGS: readonly string[] = L5_LAYERS.map((l) => l.tag);

/** Does `text` carry the given L5 tag? Exact, case-sensitive match. */
export function hasL5Tag(text: string, tag: string): boolean {
  return text.includes(tag);
}

/**
 * Score an L5 block: how many of the four sub-sections are present.
 * `input` may be the raw text or an object with a `.source` field.
 */
export function scoreL5(input: string | { source: string }): {
  has_dq: boolean;
  has_rec: boolean;
  has_ku: boolean;
  has_na: boolean;
  score: number;
} {
  const text = typeof input === 'string' ? input : input.source;
  const [dq, rec, ku, na] = [
    hasL5Tag(text, L5_TAGS[0]),
    hasL5Tag(text, L5_TAGS[1]),
    hasL5Tag(text, L5_TAGS[2]),
    hasL5Tag(text, L5_TAGS[3]),
  ];
  return {
    has_dq: dq,
    has_rec: rec,
    has_ku: ku,
    has_na: na,
    score: (dq ? 1 : 0) + (rec ? 1 : 0) + (ku ? 1 : 0) + (na ? 1 : 0),
  };
}
