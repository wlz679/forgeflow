// P150: src/pages/api/feedback.ts - POST endpoint for feedback batch
import type { APIRoute } from "astro";
import { FeedbackBatchSchema } from "../../lib/feedback-schema";

export const prerender = false;

interface R2BucketLike {
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>;
}

function getClientIp(request: Request): string {
  const cf = (request as Request & { cf?: { clientIp?: string } }).cf;
  if (cf?.clientIp) return cf.clientIp;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env as
    | { FEEDBACK_BUCKET?: R2BucketLike; FEEDBACK_KV?: KVNamespaceLike }
    | undefined;
  if (!env?.FEEDBACK_BUCKET || !env?.FEEDBACK_KV) {
    return new Response(
      JSON.stringify({ error: "Bindings not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = FeedbackBatchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid batch", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = getClientIp(request);
  let accepted = 0;
  let skipped = 0;

  for (const entry of parsed.data.entries) {
    const rlKey = `rl:${ip}:${entry.slug}`;
    const countStr = await env.FEEDBACK_KV.get(rlKey);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= 10) {
      skipped++;
      continue;
    }
    const key = `${entry.slug}/${entry.ts}.json`;
    await env.FEEDBACK_BUCKET.put(key, JSON.stringify(entry), {
      httpMetadata: { contentType: "application/json" },
    });
    await env.FEEDBACK_KV.put(rlKey, String(count + 1), { expirationTtl: 3600 });
    accepted++;
  }

  return new Response(
    JSON.stringify({ accepted, skipped }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
