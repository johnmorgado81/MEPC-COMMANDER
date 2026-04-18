# Setup Guide

---

## Part 1 — Supabase (database)

### 1.1 Create Account

Go to https://supabase.com — sign up, free tier is fine.

### 1.2 Create Project

Click **New Project**.
- Name: `mepc-commander`
- Region: Canada (Central)
- Note your database password

### 1.3 Run the Schema

1. Supabase → **SQL Editor** → **New Query**
2. Open `schema.sql` from this project, copy all contents, paste, click **Run**

### 1.4 Disable Row Level Security

In SQL Editor, run:

```sql
alter table buildings         disable row level security;
alter table equipment         disable row level security;
alter table proposals         disable row level security;
alter table pm_records        disable row level security;
alter table deficiencies      disable row level security;
alter table quotes            disable row level security;
alter table pricing_matrix    disable row level security;
alter table maintenance_items disable row level security;
alter table markup_matrix     disable row level security;
alter table user_settings     disable row level security;
alter table app_sequences     disable row level security;
```

### 1.5 Get API Keys

Supabase → **Project Settings** → **API** → copy:
- **Project URL** — `https://xxxxxx.supabase.co`
- **anon / public key** — long string starting with `eyJ`

### 1.6 Update App Config

Open `src/config/public-config.js` and confirm or replace:

```js
SUPABASE_URL:      'https://xxxxxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJ...',
```

---

## Part 2 — GitHub

1. Create a private repository at https://github.com
2. Upload the contents of the `frontend/` folder so that `index.html` is at the repo root inside a `frontend/` folder:
   ```
   frontend/index.html
   frontend/src/...
   frontend/schema.sql
   ```
3. Commit

---

## Part 3 — Cloudflare Pages

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select your repository
3. Build settings:

| Setting                | Value      |
|------------------------|------------|
| Production branch      | `main`     |
| Build command          | *(blank)*  |
| Build output directory | `frontend` |

4. Click **Save and Deploy**
5. Your URL: `https://your-project.pages.dev`

---

## Part 4 — First-Run Setup Inside the App

1. **Settings → Material Markup** → **Seed Defaults**
2. **Items Library** → **Seed from EQUIPMASTER**
3. **Pricing Matrix** → **Seed Defaults**
4. Add a building → add equipment → create a proposal

---

## Running Locally

ES modules require a server — can't open `index.html` directly.

```bash
cd frontend/
python3 -m http.server 8080
```
Open http://localhost:8080

Or use VS Code **Live Server** extension.

---

## Troubleshooting

**Dashboard shows errors** → Supabase URL or key wrong in `public-config.js`

**"Permission denied"** → RLS still enabled — run the disable commands in Step 1.4

**Stuck on "Loading…"** → F12 → Console — read the error

**Supabase project paused** → Free tier pauses after 1 week inactive — click **Restore** in Supabase dashboard
