# Cloudflare Pages Functions Setup - Phase 2

**Date**: 2026-08-31
**Owner**: P150 Phase 2 ship

## One-time setup

1. Create R2 bucket:
   ```
   wrangler r2 bucket create forgeflowkit-feedback
   wrangler r2 bucket create forgeflowkit-feedback-preview
   ```

2. Create KV namespace:
   ```
   wrangler kv namespace create FEEDBACK_KV
   wrangler kv namespace create FEEDBACK_KV --preview
   ```

3. Update wrangler.toml with the namespace IDs from step 2.

4. In Cloudflare dashboard, link R2 + KV bindings to Pages project
   (Settings -> Functions -> R2/KV bindings).

## Per-deploy

`pnpm build` produces `dist/_worker.js` (Cloudflare worker bundle).
Cloudflare Pages auto-deploys via GitHub integration.

## Manual test

```
curl -X POST https://forgeflowkit.com/api/feedback \
  -H "Content-Type: application/json" \
  -d "{\"entries\":[{\"ts\":1693000000000,\"vote\":\"up\",\"slug\":\"test\",\"page_kind\":\"calc\",\"lang\":\"en\",\"text\":\"hello\"}]}"
```

Expected: `{"accepted":1,"skipped":0}`

## Verification

Visit `https://forgeflowkit.com/admin/feedback` (Clerk-auth required).
Should show recent feedback entries.

## Rollback

```
git revert <commit>
pnpm build
git push
```

Cloudflare Pages auto-redeploys.