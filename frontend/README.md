# MEPC Commander — v1.2

Mechanical contracting PM management. Vanilla JS SPA. No build step.

## What it does

- Buildings → Equipment → PM Proposals → Service Records → Deficiencies → Quotes
- Maintenance items library (174 types from EQUIPMASTER)
- Proposal pricing from standard hours × labour rate ($152/hr sell)
- Material markup matrix
- Quote funnel with pending / approved / deferred / expired tracking
- Dispatch intake with screenshot OCR (Service Fusion / Jobber)
- Document parser: PDF, DOCX, XLSX, CSV, image scans — AI-assisted equipment extraction
- Address autocomplete on building forms (OpenStreetMap, no API key)
- Reporting: revenue, equipment, deficiencies, PM compliance

## Access

No login. No password. Opens directly to dashboard.

Authentication will be added in a future release prior to production launch.

## Quickstart

1. Create Supabase project → run `schema.sql` in SQL Editor
2. Disable RLS on all tables (see setup.md)
3. Confirm Supabase URL + anon key in `src/config/public-config.js`
4. Push to GitHub → connect to Cloudflare Pages (output dir: `frontend`)
5. Open URL — app loads immediately, no sign-in required

## Stack

| Layer    | Tech                               |
|----------|-------------------------------------|
| Frontend | Vanilla JS ES Modules, HTML, CSS   |
| Database | Supabase (PostgreSQL)              |
| Hosting  | Cloudflare Pages                   |
| Auth     | None (unlocked for testing)        |
| AI       | Claude API (document parser)       |
| PDF gen  | jsPDF + autotable (CDN)            |
| Charts   | Chart.js (CDN)                     |
| OCR      | Tesseract.js (CDN)                 |
| Parsing  | PDF.js, SheetJS, Mammoth (CDN)     |
| Geocoding| OpenStreetMap Nominatim (free)     |

## File Structure

```
frontend/
├── index.html
├── src/
│   ├── app/
│   │   ├── app.js          ← bootstrap, routing (no auth gate)
│   │   └── router.js
│   ├── config/
│   │   └── public-config.js ← Supabase URL + key
│   ├── lib/
│   │   └── supabase-client.js
│   ├── legacy/             ← all feature modules
│   │   ├── buildings.js    ← address autocomplete
│   │   ├── equipment.js
│   │   ├── proposals.js
│   │   ├── document-parser.js ← AI extraction, → intake form
│   │   ├── dashboard.js
│   │   ├── db.js
│   │   ├── config.js
│   │   └── ...
│   └── styles/
│       └── styles.css
├── schema.sql
├── setup.md
└── deployment.md
```

## Limitations

- No authentication — do not expose to public internet until auth is added
- OCR accuracy depends on image quality
- DWG/DXF not supported — drawings must be PDF or image
- PDF export is functional, not print-shop quality
- Document parser: always review extracted equipment before importing
- Supabase free tier pauses after 1 week inactivity — upgrade for production
