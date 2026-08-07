// P140f-p3-T1 — Playbook 6 字段 zod schema (per P140f §4.3)
// Mirrors src/content/blog-schema.ts P140e pattern (zod schema 独立于 astro:content,
// 可被 tsx 测试直接 import)。
//
// 6 字段 hard schema (P140f §4.3 + v2.0 07 P6 Agent Design):
//   Goal / Input / Output / Constraint / Tool / Memory
//
// Goal 字段必填且含"决策"关键词 — 这是 v2.0 灵魂 Decision Support 落地的 first-class 体现。

import { z } from 'zod';

// "决策"关键词 regex — Goal 字段必须含以下任一关键词
const DECISION_KEYWORDS = /决策|decision|该不该|是否/;

const goalSchema = z.string()
  .min(10, 'Goal must be ≥ 10 字')
  .refine(
    (val) => DECISION_KEYWORDS.test(val),
    { message: 'Goal 必须含"决策/decision/该不该/是否"关键词 (P140f §4.3 v2.0 灵魂)' }
  );

const minimalFieldSchema = z.string()
  .min(1, '字段必填 (placeholder 需 ≥ 1 字)')
  .max(500, '字段 ≤ 500 字');

export const playbookMetadataSchema = z.object({
  goal: goalSchema,
  input: minimalFieldSchema,
  output: minimalFieldSchema,
  constraint: minimalFieldSchema,
  tool: minimalFieldSchema,
  memory: minimalFieldSchema,
});

export type PlaybookMetadata = z.infer<typeof playbookMetadataSchema>;
