# Setup Guide

Step-by-step. No development experience required.

---

## Part 1 — Supabase (your database)

### 1.1 Create Account

Go to https://supabase.com and sign up. Free tier is fine.

### 1.2 Create Project

Click **New Project**.
- Name: `mepc-commander`
- Database password: write this down, you'll need it
- Region: Canada (Central)

Wait about 2 minutes for it to start.

### 1.3 Run the Schema

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `docs/schema.sql` from this project (any text editor)
4. Copy the entire contents → paste into Supabase SQL Editor
5. Click **Run**

You should see green checkmarks for each table created.

### 1.4 Disable Row Level Security (single-user setup)

Still in SQL Editor, run this:

```sql
alter table buildings        disable row level security;
alter table equipment        disable row level security;
alter table proposals        disable row level security;
alter table pm_records       disable row level security;
alter table deficiencies     disable row level security;
alter table quotes           disable row level security;
alter table pricing_matrix   disable row level security;
alter table maintenance_items disable row level security;
alter table markup_matrix    disable row level security;
alter table user_settings    disable row level security;
alter table app_sequences    disable row level security;
```

### 1.5 Get Your API Keys

1. Click **Project Settings** (gear icon, bottom left)
2. Click **API**
3. Copy:
   - **Project URL** — looks like `https://xyzxyz.supabase.co`
   - **anon / public key** — a long string starting with `eyJ`

You will paste these into `js/config.js` in Part 3.

### 1.6 Enable Magic Link Email

1. In Supabase → **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication** → **Email Templates** → **Magic Link**
4. The default template is fine for internal use

### 1.7 Add Your Email as a User

1. Supabase → **Authentication** → **Users**
2. Click **Invite user** (or **Add user**)
3. Enter your work email
4. Repeat for anyone else who needs access

Only users added here can sign in. This is intentional — it's an internal tool.

---

## Part 2 — GitHub (file storage)

### 2.1 Create Account

Go to https://github.com and sign up if you don't have an account.

### 2.2 Create Repository

1. Click the **+** icon (top right) → **New repository**
2. Name: `mepc-commander`
3. Visibility: **Private**
4. Do NOT check "Initialize with README"
5. Click **Create repository**

### 2.3 Upload Files

1. In your new empty repo, click **Add file** → **Upload files**
2. Drag and drop the entire **contents** of the `mepc-commander/` folder
   - `index.html` must be at the root (not inside another folder)
3. Click **Commit changes**

The folder structure in GitHub must look like:
```
index.html
README.md
css/styles.css
js/app.js
js/config.js
...
```

---

## Part 3 — Configure the App

Before deploying, open `js/config.js` in a text editor and replace these two lines:

```js
SUPABASE_URL:      'YOUR_SUPABASE_URL',
SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
```

Paste the values you copied in Step 1.5. It should look like:

```js
SUPABASE_URL:      'https://xyzxyz.supabase.co',
SUPABASE_ANON_KEY: 'eyJhbGci...',
```

Also update the COMPANY block with your actual company details.

Save the file, then re-upload it to GitHub (or commit the change).

---

## Part 4 — Cloudflare Pages (hosting)

### 4.1 Create Account

Go to https://dash.cloudflare.com and sign up. Free.

### 4.2 Connect to GitHub

1. In Cloudflare → **Workers & Pages** (left sidebar)
2. Click **Create application** → **Pages** → **Connect to Git**
3. Sign in with GitHub → authorize Cloudflare
4. Select your `mepc-commander` repository

### 4.3 Build Settings

On the next screen:

| Setting            | Value         |
|--------------------|---------------|
| Production branch  | `main`        |
| Build command      | *(leave blank)* |
| Build output directory | `/`       |

Click **Save and Deploy**.

### 4.4 Your Live URL

After ~1 minute, you'll get a URL like:
```
https://mepc-commander.pages.dev
```

Every time you update files in GitHub, Cloudflare redeploys automatically.

### 4.5 Tell Supabase About Your URL

1. Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Cloudflare URL (e.g. `https://mepc-commander.pages.dev`)
3. Add the same URL to **Redirect URLs**

This is required so the magic link email sends users to the right place.

---

## Part 5 — First Sign-In

1. Open your Cloudflare URL
2. Enter your email → click **Send Sign-In Link**
3. Check your email → click the link
4. You're in

---

## Part 6 — First-Run Setup Inside the App

1. **Settings → Material Markup** → Click **Seed Defaults** to load markup matrix
2. **Items Library** → Click **Seed from EQUIPMASTER** to load 174 equipment types
3. **Pricing Matrix** → Click **Seed Defaults** to load default PM rates
4. Add your first building → add equipment → create a proposal

---

## Running Locally (for testing before deploy)

You can't open `index.html` directly in a browser (ES modules don't work on `file://`).

Use Python (built into macOS/Linux):
```bash
cd mepc-commander/
python3 -m http.server 8080
```
Open http://localhost:8080

Or install VS Code Live Server extension and click **Go Live**.

---

## Troubleshooting

**"Failed to load" on Dashboard**
→ Supabase URL or key is wrong in `js/config.js`. Double-check both values.

**"Permission denied" errors**
→ RLS is still enabled. Run the disable commands in Step 1.4.

**Magic link not arriving**
→ Check spam. Supabase free tier uses a shared email server — deliverability varies. For production, configure a custom SMTP in Supabase → Authentication → SMTP Settings.

**Stuck on "Loading…"**
→ Open browser developer tools (F12) → Console tab → look for error messages.

**Auth redirect not working**
→ Make sure your Cloudflare URL is added to Supabase Site URL and Redirect URLs (Step 4.5).
