---
name: p147-followup-shipped
description: P147 followup — close 2 fable Important test design findings on comparison-cross-link-guard.test.ts (precise invariant + i18n-sourced markers). 1 atomic commit on master (`147d070`). Test-only commit, no new pages, no behavior change.
metadata:
  type: project
  shipped: 2026-08-25
  scope: minimal (1 commit, 1 file, +21/-10)
  parent: p147-quick-wins-shipped
---

# P147 Followup — Test Design Quality — SHIPPED

**Date:** 2026-08-25
**Scope:** Minimal test-quality cleanup (1 atomic commit on master)
**Trigger:** Fable review of P147 found 2 Important test design issues on `tests/comparison-cross-link-guard.test.ts`

---

## Why this batch exists

P147 ship record promised to leave 2 remaining fable findings for followup:
- **Important #1** (Test 4): The page-render test used `COMPARISON_TOPICS.some(...)` across all comparison topics — a deletion in ONE page's `relatedTopicIds` would be masked by links in OTHER pages' relatedTopicIds. False-positive guarantee.
- **Important #2** (Test 5): Hardcoded literal en/zh marker strings (`'X vs Y comparisons'` / `'对比专题'`) would silently drift if `translations.ts` `letter.compare.section` key changed.

Both findings are non-blocking but important enough to fix in a tight 1-commit followup rather than letting the guard degrade to false-negative over time.

---

## Change Summary

| Metric | Value |
|---|---|
| Files modified | 1 (`tests/comparison-cross-link-guard.test.ts`) |
| LOC delta | +21 / −10 |
| Atomic commits on master | +1 |
| Master HEAD | `147d070` (was `ca5c972`) |
| Branch | master direct-to-master (CLAUDE.md hotfix mode + P147 cadence) |
| Pre-commit hook | auto-passed (codegen-examples.mjs --check, no engine touched) |
| pnpm check | 1261/0/0 (preserved baseline) |
| 3-way divergence | 0/0 (origin + github both at `147d070`) |

---

## Commit

| SHA | Description |
|---|---|
| `147d070` | fix(guard): P147-followup close fable Important test design findings |

---

## Specific Edits (3 changes in 1 commit)

### Edit 1 — Test 4 precise invariant (lines 96-121)

**Was (loose-by-design)**:
```typescript
const hasRelatedLink = COMPARISON_TOPICS.some((t) => {
  return t.relatedTopicIds.some((rid) => html.includes(`/${rid}/`));
});
assert.ok(hasRelatedLink, `${pagePath} has no cross-link to any relatedTopicId`);
```

**Now (precise — verify THIS page links to its OWN relatedTopicIds)**:
```typescript
const match = pagePath.match(/[/\\]([^/\\]+)-compare[/\\]index\.html$/);
assert.ok(match, `Cannot parse topic ID from ${pagePath}`);
const topicId = match[1];
const topic = TOPICS.find((t) => t.id === topicId);
assert.ok(topic, `No TOPICS entry for ${topicId} (parsed from path)`);
const ownRelatedLinks = topic.relatedTopicIds.filter((rid) => html.includes(`/${rid}/`));
assert.ok(
  ownRelatedLinks.length >= 1,
  `${pagePath} (${topicId}) has no cross-link to its own relatedTopicIds: ${topic.relatedTopicIds.join(', ')}`
);
```

### Edit 2 — Add translations import (line 15)

```typescript
import { translations } from '../src/i18n/translations.ts';
```

### Edit 3 — Test 5 markers from translations (lines 128-132)

**Was (hardcoded literals)**:
```typescript
const enMarker = 'X vs Y comparisons';
const zhMarker = '对比专题';
```

**Now (sourced from translations.ts)**:
```typescript
const sectionKey = 'letter.compare.section' as const;
const enMarker = translations[sectionKey].en;
const zhMarker = translations[sectionKey].zh;
```

---

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `comparison-cross-link-guard` isolation | 5/5 pass (481ms) |
| `pnpm check` | 1261/0/0 (preserved baseline) |
| Pre-commit hook | auto-passed |
| 3-way divergence | 0/0 after push |

---

## Why Master Direct-to-Master (Not Feature Branch)

Consistent with P147 main + Phase 4 + Phase 2 cadence:
- Single-file change, lowest risk
- Test-only commit (no production code touched)
- CLAUDE.md hotfix mode applicable
- 1-commit revert possible if regression surfaces
- No coordination needed across branches

---

## Closes

- ✅ Fable Important #1 — Test 4 loose-by-design invariant
- ✅ Fable Important #2 — Test 5 hardcoded marker strings

---

## Related

- [[p147-quick-wins-shipped]] — P147 main ship record (parent)
- [[p140f-phase4-comparison-pages-shipped]] — Phase 4 (origin of the comparison-tier Topic pattern)
- `tests/comparison-cross-link-guard.test.ts` — the fixed file
- `tests/comparison-shape-guard.test.ts` — companion guard (P147 C3 sibling, unchanged)
- `src/i18n/translations.ts` — source of truth for `letter.compare.section` key
- [[adsense-resubmit-window]] — AdSense trigger ~2026-09-15
