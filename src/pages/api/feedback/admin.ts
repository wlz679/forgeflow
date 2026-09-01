// P150: src/pages/api/feedback/admin.ts - GET endpoint listing feedback from R2
import type { APIRoute } from "astro";
import { FeedbackEntrySchema } from "../../../lib/feedback-schema";

export const prerender = false;

interface R2BucketLike {
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    objects: Array<{ key: string; uploaded: Date; size: number; httpEtag: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env as
    | { FEEDBACK_BUCKET?: R2BucketLike }
    | undefined;
  if (!env?.FEEDBACK_BUCKET) {
    return new Response(
      JSON.stringify({ error: "Bindings not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const prefix = url.searchParams.get("slug") ?? undefined;

  const listed = await env.FEEDBACK_BUCKET.list({ prefix, limit });

  const entries: unknown[] = [];
  for (const obj of listed.objects) {
    const raw = await env.FEEDBACK_BUCKET.get(obj.key);
    if (!raw) continue;
    const text = await raw.text();
    const parsed = FeedbackEntrySchema.safeParse(JSON.parse(text));
    if (parsed.success) entries.push(parsed.data);
  }

  entries.sort((a, b) => (b as { ts: number }).ts - (a as { ts: number }).ts);

  return new Response(
    JSON.stringify({ entries, truncated: listed.truncated }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
