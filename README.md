# MechanicsPM — v1.1

Mechanical contracting PM management. Vanilla JS SPA. No build step.

## What it does

- Buildings → Equipment → PM Proposals → Service Records → Deficiencies → Quotes
- Maintenance items library (174 types from EQUIPMASTER.xlsx)
- Proposal pricing from standard hours × labour rate
- Material markup matrix (from Material_Markup_Matrix.xlsx)
- Quote funnel with pending / approved / deferred / expired tracking
- Dispatch intake with screenshot OCR (Service Fusion / Jobber)
- Document parser: PDF, DOCX, XLSX with EQUIPMASTER-aware extraction
- Reporting: revenue, equipment, deficiencies, PM compliance
- Magic link authentication (no password)

## Quickstart

1. Create Supabase project → run `docs/schema.sql`
2. Put your Supabase URL + key in `js/config.js`
3. Configure magic link email in Supabase → Authentication → Email
4. Add your email as a user in Supabase → Authentication → Users
5. Push to GitHub → connect to Cloudflare Pages
6. Open app → enter email → click link in inbox

Full instructions: `docs/setup.md`

## Stack

| Layer    | Tech                               |
|----------|------------------------------------|
| Frontend | Vanilla JS ES Modules, HTML, CSS   |
| Database | Supabase (PostgreSQL)              |
| Hosting  | Cloudflare Pages                   |
| Auth     | Supabase Magic Link                |
| PDF gen  | jsPDF + autotable (CDN)            |
| Charts   | Chart.js (CDN)                     |
| OCR      | Tesseract.js (CDN)                 |
| Parsing  | PDF.js, SheetJS, Mammoth (CDN)     |

## File Tree

```
mechanicspm/
├── index.html
├── README.md
├── css/styles.css
├── js/
│   ├── app.js              ← bootstrap, auth guard, routing
│   ├── config.js           ← Supabase keys, company, rates, markup matrix
│   ├── db.js               ← all Supabase CRUD + MaintenanceItems, MarkupMatrix
│   ├── router.js
│   ├── components/ui.js
│   ├── data/
│   │   └── equipmaster.js  ← 174 equipment types with std hours (client-side)
│   ├── modules/
│   │   ├── auth.js         ← magic link sign-in, session, user badge
│   │   ├── dashboard.js
│   │   ├── buildings.js
│   │   ├── equipment.js
│   │   ├── maintenance-items.js  ← library browser, seed from EQUIPMASTER
│   │   ├── proposals.js    ← 3-step wizard, hours-based pricing
│   │   ├── pm-records.js
│   │   ├── quotes.js       ← pipeline, labour/material lines, markup calc
│   │   ├── pricing.js
│   │   ├── reporting.js
│   │   ├── dispatch-ocr.js ← Tesseract OCR, field extraction, draft record
│   │   ├── document-parser.js ← PDF/DOCX/XLSX parser, EQUIPMASTER vocab
│   │   ├── scope-library.js
│   │   └── settings.js     ← rate sheet, markup matrix editor + XLSX import
│   └── utils/
│       ├── helpers.js
│       └── pdf-export.js
└── docs/
    ├── schema.sql
    ├── setup.md
    └── deployment.md
```

## Limitations

- OCR accuracy depends on screenshot quality. Blurry or compressed images will give poor results.
- DWG/DXF not supported — drawings must be PDF.
- Auth is single-tenant. Users must be added manually in Supabase Dashboard.
- PDF export is functional, not print-shop quality.
- Document parser is heuristic — always review extracted equipment before importing.
- Supabase free tier has row limits and pauses after inactivity. Upgrade for production use.
