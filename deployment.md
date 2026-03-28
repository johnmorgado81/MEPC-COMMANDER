# Deployment Reference

Quick-reference version of the setup process for repeat deploys.

---

## Stack

| Component | Service      | Cost  |
|-----------|--------------|-------|
| Frontend  | Cloudflare Pages | Free |
| Database  | Supabase     | Free (upgradeable) |
| Auth      | Supabase Auth | Free |
| Domain    | Optional     | ~$12/yr |

---

## Deploy from Scratch

1. Run `docs/schema.sql` in Supabase SQL Editor
2. Disable RLS on all tables (see setup.md Step 1.4)
3. Add users in Supabase → Authentication → Users
4. Put Supabase URL + anon key in `js/config.js`
5. Set Site URL + Redirect URL in Supabase → Auth → URL Config
6. Commit to GitHub
7. Connect repo to Cloudflare Pages (no build command, output dir `/`)
8. Done

---

## Update / Redeploy

Edit files locally → commit to GitHub → Cloudflare redeploys automatically (~60 seconds).

No build step. No npm. No CLI required.

---

## Custom Domain

Cloudflare Pages → your project → **Custom domains** → Add domain.
Must be a domain managed by Cloudflare DNS, or you can add a CNAME to your existing DNS.

---

## Supabase Auth — Magic Link

- Users must be added manually: Supabase → Authentication → Users → Invite
- Default: Supabase shared SMTP (limited deliverability, fine for internal use)
- Production: Set up custom SMTP in Supabase → Authentication → SMTP Settings
  - Works with SendGrid, Mailgun, Postmark, Gmail SMTP, or any provider
  - Required fields: Host, Port, Username, Password, Sender email

Magic link tokens expire in **60 minutes**.
Sessions persist in the browser (`localStorage`) until the user signs out.

---

## Environment Variables

This app does NOT use environment variables — keys live in `js/config.js`.
The anon key is safe to ship in frontend code (it's read-only by design).
Never put the Supabase **service_role** key in frontend code.

---

## Database Backups

Supabase free tier: 7-day point-in-time recovery (pro tier).
Free tier: export tables as CSV manually from Table Editor.
Recommended: weekly CSV export of buildings, equipment, quotes, pm_records.

---

## Scaling

Free tier limits:
- 500 MB database
- 2 GB bandwidth / month
- 50,000 monthly active users

For a small mechanical contracting company, free tier will last years.
Upgrade to Pro ($25/month) when you need backups, larger DB, or better email delivery.

---

## Removing OCR / Tesseract

If Tesseract.js causes slow page loads, remove it from `index.html`:
```html
<!-- Remove this line: -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
```
The Dispatch OCR page will show an error but all other features work normally.
