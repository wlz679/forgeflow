# P3-2 Cross-Device Sync — Deployment Rollout

Operational steps to ship P3-2 sync to production. Assumes P3-1 (Clerk) is already live.

## 1. Configure Clerk JWKS in Supabase

1. Open Supabase Dashboard → your project → **Authentication** → **Sign In/Up** → **JWT Settings** (legacy) or **Providers** → **JWT template** for the current UI.
2. Set **Clerk issuer URL** to your Clerk Frontend API URL (e.g. `https://clerk.example.com/v1` — found in Clerk Dashboard under **API Keys** → **Show URLs**).
3. Save. Supabase will use this issuer to fetch the public JWKS and verify Clerk-issued JWTs against the `user_favorites / user_recent / user_history` tables.

## 2. Verify RLS

The `sql/sync-supabase-schema.sql` migration creates 3 tables with RLS enabled and policies that authorize only rows where `clerk_user_id = auth.jwt() ->> 'sub'`.

Smoke test:

```bash
# From a logged-in browser session on the deployed site, capture the Clerk JWT
# from the Network tab (any request to Supabase Authorization header).
curl -H "Authorization: Bearer $CLERK_JWT" \
     "$VITE_SUPABASE_URL/rest/v1/user_favorites?clerk_user_id=eq.user_xxx"
# Expected: 200 with 1 row (or []), not 401/403.

# Then probe a DIFFERENT user_id (should return [] and 200, never leak rows):
curl -H "Authorization: Bearer $CLERK_JWT" \
     "$VITE_SUPABASE_URL/rest/v1/user_favorites?clerk_user_id=eq.user_other_yyy"
# Expected: 200 with [], never the other user's data.
```

## 3. Set environment variables

Run `pnpm sync` (or update `.env` directly) to ensure these are set at build time:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Plus the P3-1 Clerk vars (`PUBLIC_CLERK_PUBLISHABLE_KEY`).

## 4. UI buttons gated on env

The Header sync menu (`Sync now`, `Export JSON`, `Delete cloud data`) only renders when **both** `hasClerkEnv()` and `hasSupabaseEnv()` are true. Click handlers are additionally gated on `getClerkInstance()?.user` — visitors who are not signed in see no menu and the buttons stay inert.

Manual smoke:

1. Sign in with a Clerk account.
2. Confirm the menu appears in the header (no `hidden` attribute).
3. Click "Sync now" → check DevTools Network for 6 Supabase calls (3 GET + 3 POST).
4. Click "Export JSON" → confirm JSON downloads.
5. Click "Delete cloud data" + confirm → confirm 3 DELETE requests fire and `data-sync-last` resets.
