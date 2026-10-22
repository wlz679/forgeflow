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
export const L5_TAGS = [
  '🧭 Decision Question',
  '🧭 Recommendation',
  '🧭 Key Uncertainty',
  '🧭 Next Action',
] as const;

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
