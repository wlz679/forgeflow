// P150: src/lib/feedback-schema.ts
import { z } from "zod";

export const FeedbackEntrySchema = z.object({
  ts: z.number().int().positive(),
  vote: z.enum(["up", "down"]),
  slug: z.string().min(1).max(200),
  page_kind: z.enum(["calc", "topic", "blog"]),
  lang: z.enum(["en", "zh"]),
  text: z.string().max(2000).optional(),
});

export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;

export const FeedbackBatchSchema = z.object({
  entries: z.array(FeedbackEntrySchema).min(1).max(50),
});

export type FeedbackBatch = z.infer<typeof FeedbackBatchSchema>;
