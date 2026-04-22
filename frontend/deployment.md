# Deployment Reference

---

## Stack

| Component | Service          | Cost               |
|-----------|------------------|--------------------|
| Frontend  | Cloudflare Pages | Free               |
| Database  | Supabase         | Free (upgradeable) |
| Auth      | None             | —                  |
| Domain    | Optional         | ~$12/yr            |

---

## Current Auth Status

**Authentication is disabled.** The app opens directly to the dashboard.
No login screen, no magic link, no password.

This is intentional for the testing phase.
Authentication will be added before production/marketing launch.

---

## Deploy from Scratch

1. Run `schema.sql` in Supabase SQL Editor
2. Disable RLS on all tables (see setup.md Step 1.4)
3. Confirm Supabase URL + anon key in `src/config/public-config.js`
4. Commit to GitHub with `frontend/` folder at repo root
5. Connect repo to Cloudflare Pages — output dir: `frontend`, no build command
6. Done — opens straight to dashboard

---

## Update / Redeploy

Edit files → commit to GitHub → Cloudflare redeploys automatically (~60 seconds).

No build step. No npm. No CLI required.

---

## Custom Domain

Cloudflare Pages → your project → **Custom domains** → Add domain.

---

## Environment Variables

This app does not use environment variables. Supabase keys live in `src/config/public-config.js`.
The anon key is safe in frontend code — it is read-only by design.
Never put the Supabase **service_role** key in frontend code.

---

## Database Backups

Free tier: export tables as CSV from Supabase Table Editor.
Recommended: weekly CSV export of buildings, equipment, proposals, pm_records, quotes.

---

## Scaling

Free tier limits:
- 500 MB database
- 2 GB bandwidth/month

For a small mechanical contracting operation, free tier will last years.
Upgrade to Supabase Pro ($25/month) for automated backups and better uptime.

---

## Adding Auth Later

When ready to lock the app down:

1. In `src/features/auth/auth.client.js` and `src/legacy/auth.js` — replace the no-op stubs with real Supabase auth calls
2. In `src/app/app.js` — add auth gate to `boot()` before calling `start()`
3. In Supabase → Authentication → add users
4. Set Site URL and Redirect URLs in Supabase → Auth → URL Configuration
