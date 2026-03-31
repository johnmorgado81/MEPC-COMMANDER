/* MEPC Commander — Design System */

/* ─────────────────────────────────────────────
   CSS Variables
───────────────────────────────────────────── */
:root {
  --bg:          #0f172a;
  --bg2:         #1e293b;
  --bg3:         #273549;
  --border:      #334155;
  --text:        #e2e8f0;
  --text-muted:  #94a3b8;
  --primary:     #3b82f6;
  --primary-dk:  #2563eb;
  --success:     #10b981;
  --warn:        #f59e0b;
  --danger:      #ef4444;
  --info:        #6366f1;
  --sidebar-w:   240px;
  --topbar-h:    56px;
  --radius:      6px;
  --radius-lg:   10px;
  --shadow:      0 2px 8px rgba(0,0,0,0.3);
  --font:        'Inter', system-ui, -apple-system, sans-serif;
}

/* ─────────────────────────────────────────────
   Reset / Base
───────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.5;
}

a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }

h1 { font-size: 1.5rem; font-weight: 700; }
h2 { font-size: 1.2rem; font-weight: 600; }
h3 { font-size: 1rem; font-weight: 600; }

input, select, textarea {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  padding: 7px 10px;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
}
input:focus, select:focus, textarea:focus { border-color: var(--primary); }
input[type="checkbox"] { width: auto; }
select option { background: var(--bg2); }
textarea { resize: vertical; min-height: 80px; }

label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; font-weight: 500; }

/* ─────────────────────────────────────────────
   Layout
───────────────────────────────────────────── */
#app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
#sidebar {
  width: var(--sidebar-w);
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-logo {
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border);
}
.sidebar-logo .logo-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
.sidebar-logo .logo-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  color: var(--text-muted);
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s;
  font-size: 13.5px;
  font-weight: 500;
}
.nav-item:hover { color: var(--text); background: var(--bg3); }
.nav-item.active { color: var(--primary); background: rgba(59,130,246,0.08); border-left-color: var(--primary); }
.nav-icon { font-size: 16px; width: 20px; text-align: center; }

/* Main content */
#main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#topbar {
  height: var(--topbar-h);
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  flex-shrink: 0;
}
#topbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.topbar-spacer { flex: 1; }

#content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* ─────────────────────────────────────────────
   Page Header
───────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h1 { line-height: 1.2; }
.page-header .page-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.page-sub { color: var(--text-muted); font-size: 13px; margin-top: 4px; }

/* ─────────────────────────────────────────────
   Buttons
───────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius);
  border: none;
  cursor: pointer;
  font-family: var(--font);
  font-size: 13.5px;
  font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary   { background: var(--primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--primary-dk); }
.btn-secondary { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--border); }
.btn-danger    { background: var(--danger); color: #fff; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn-success   { background: var(--success); color: #fff; }
.btn-sm        { padding: 4px 10px; font-size: 12px; }
.btn-icon      { padding: 6px 8px; }

/* ─────────────────────────────────────────────
   Cards
───────────────────────────────────────────── */
.card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

/* KPI cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.kpi-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
}
.kpi-label { font-size: 12px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-value { font-size: 2rem; font-weight: 700; margin: 4px 0 2px; line-height: 1; }
.kpi-sub   { font-size: 12px; color: var(--text-muted); }
.kpi-card.kpi-danger .kpi-value { color: var(--danger); }
.kpi-card.kpi-warn   .kpi-value { color: var(--warn); }
.kpi-card.kpi-good   .kpi-value { color: var(--success); }

/* ─────────────────────────────────────────────
   Tables
───────────────────────────────────────────── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.data-table th {
  text-align: left;
  padding: 9px 12px;
  background: var(--bg3);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.data-table th:hover { color: var(--text); }
.data-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg3); }
.data-table .action-cell { text-align: right; white-space: nowrap; }
.table-wrap {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.table-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.table-toolbar input[type="search"] { max-width: 240px; }
.table-toolbar .spacer { flex: 1; }
.table-scroll { overflow-x: auto; }

/* ─────────────────────────────────────────────
   Badges
───────────────────────────────────────────── */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  text-transform: capitalize;
}
.badge-primary { background: rgba(59,130,246,0.15); color: #93c5fd; }
.badge-success { background: rgba(16,185,129,0.15); color: #6ee7b7; }
.badge-warn    { background: rgba(245,158,11,0.15); color: #fcd34d; }
.badge-danger  { background: rgba(239,68,68,0.15);  color: #fca5a5; }
.badge-info    { background: rgba(99,102,241,0.15); color: #a5b4fc; }
.badge-muted   { background: rgba(100,116,139,0.15); color: var(--text-muted); }

/* ─────────────────────────────────────────────
   Forms
───────────────────────────────────────────── */
.form-group { margin-bottom: 16px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-row-3  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.form-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 20px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.checkbox-group input[type="checkbox"] { width: 16px; height: 16px; }
.checkbox-group label { margin: 0; font-size: 14px; color: var(--text); }

/* ─────────────────────────────────────────────
   Modal
───────────────────────────────────────────── */
#modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 100;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
  overflow-y: auto;
}
#modal-overlay.open { display: flex; }
#modal-box {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 680px;
  box-shadow: var(--shadow);
  animation: slideIn 0.18s ease;
}
@keyframes slideIn { from { opacity: 0; transform: translateY(-16px); } }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}
.modal-header h2 { font-size: 1.05rem; }
.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.modal-close:hover { color: var(--text); }
.modal-body { padding: 24px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

/* ─────────────────────────────────────────────
   Toast
───────────────────────────────────────────── */
#toast-area {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.toast {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 16px;
  font-size: 13.5px;
  box-shadow: var(--shadow);
  animation: toastIn 0.2s ease;
  max-width: 320px;
}
@keyframes toastIn { from { opacity: 0; transform: translateX(16px); } }
.toast.success { border-left: 3px solid var(--success); }
.toast.error   { border-left: 3px solid var(--danger); }
.toast.info    { border-left: 3px solid var(--primary); }
.toast.warn    { border-left: 3px solid var(--warn); }

/* ─────────────────────────────────────────────
   Empty state / spinner
───────────────────────────────────────────── */
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted);
}
.empty-state p { margin-top: 8px; font-size: 13px; }
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-muted);
}

/* ─────────────────────────────────────────────
   Tab Bar
───────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 4px;
  background: var(--bg3);
  border-radius: var(--radius);
  padding: 3px;
}
.tab-btn {
  padding: 6px 14px;
  background: none;
  border: none;
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font);
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { background: var(--bg2); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }

/* ─────────────────────────────────────────────
   Pipeline Banner
───────────────────────────────────────────── */
.pipeline-banner {
  background: linear-gradient(135deg, var(--bg2), var(--bg3));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}
.pipeline-stat { }
.pipeline-stat .p-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px; }
.pipeline-stat .p-value { font-size: 1.6rem; font-weight: 700; margin-top: 2px; }
.pipeline-stat .p-sub   { font-size: 12px; color: var(--text-muted); }

/* ─────────────────────────────────────────────
   Scope Items (Proposal Builder)
───────────────────────────────────────────── */
.scope-item {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
}
.scope-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 12px;
}
.scope-item-title { font-weight: 600; font-size: 14px; }
.scope-item-price { display: flex; align-items: center; gap: 8px; }
.scope-item-price input { max-width: 100px; }
.scope-text { font-size: 12.5px; color: var(--text-muted); line-height: 1.6; }
.scope-text textarea { font-size: 12.5px; line-height: 1.6; }

/* Totals grid */
.totals-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg3);
  border-radius: var(--radius);
  padding: 16px;
  max-width: 360px;
  margin-left: auto;
}
.totals-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}
.totals-row.total-final {
  font-weight: 700;
  font-size: 1.1rem;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

/* ─────────────────────────────────────────────
   Detail View
───────────────────────────────────────────── */
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}
.detail-header .detail-title { font-size: 1.3rem; font-weight: 700; }
.detail-header .detail-meta  { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.detail-field label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
.detail-field .field-value { margin-top: 3px; font-size: 14px; }

/* ─────────────────────────────────────────────
   Steps (Proposal Wizard)
───────────────────────────────────────────── */
.step-indicators {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg3);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
}
.step-dot.active  { background: var(--primary); border-color: var(--primary); color: #fff; }
.step-dot.done    { background: var(--success); border-color: var(--success); color: #fff; }

/* ─────────────────────────────────────────────
   Reporting
───────────────────────────────────────────── */
.report-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 20px;
}
.report-card h3 { margin-bottom: 16px; color: var(--text-muted); font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px; }
.report-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
@media (max-width: 768px) { .report-grid-2 { grid-template-columns: 1fr; } }
.error-msg { background: rgba(239,68,68,0.1); border: 1px solid var(--danger); border-radius: var(--radius); padding: 14px; color: #fca5a5; }

/* ─────────────────────────────────────────────
   Document Parser
───────────────────────────────────────────── */
.parser-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.parser-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}
.parser-card:hover { border-color: var(--primary); background: var(--bg3); }
.parser-icon { font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-bottom: 10px; }
.parser-title { font-weight: 600; margin-bottom: 6px; }
.parser-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.parser-workspace { margin-top: 8px; }
.parser-ws-header { margin-bottom: 20px; }
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 48px;
  text-align: center;
  color: var(--text-muted);
  transition: all 0.15s;
  margin-bottom: 20px;
}
.drop-zone.drag-active { border-color: var(--primary); background: rgba(59,130,246,0.05); }
.drop-zone p { margin-bottom: 12px; }
.drop-hint { font-size: 12px; margin-top: 10px; }
.parse-result { }
.parse-section { margin-bottom: 20px; }
.parse-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.parse-text-preview {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 12px;
  resize: vertical;
}
.parse-list { padding-left: 20px; }
.parse-list li { margin-bottom: 6px; font-size: 13px; color: var(--text-muted); }
.parse-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.parse-hint { font-size: 12px; color: var(--text-muted); }
.parse-loading { padding: 24px; text-align: center; color: var(--text-muted); }
.drawing-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.drawing-canvas { max-width: 100%; border: 1px solid var(--border); border-radius: var(--radius); }
.hidden { display: none !important; }

/* ─────────────────────────────────────────────
   Deficiency Item (PM Records)
───────────────────────────────────────────── */
.deficiency-item, .part-item {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  margin-bottom: 8px;
}
.deficiency-item .di-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.remove-btn {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
}
.remove-btn:hover { opacity: 0.8; }

/* ─────────────────────────────────────────────
   Line items (Quotes)
───────────────────────────────────────────── */
.line-item {
  display: grid;
  grid-template-columns: 1fr 80px 100px 100px 32px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.line-item input { }
.li-total { text-align: right; font-size: 14px; font-weight: 600; padding: 0 4px; }

/* ─────────────────────────────────────────────
   Misc / Utilities
───────────────────────────────────────────── */
.text-muted  { color: var(--text-muted); }
.text-danger { color: var(--danger); }
.text-success{ color: var(--success); }
.text-warn   { color: var(--warn); }
.text-right  { text-align: right; }
.mb-0  { margin-bottom: 0; }
.mb-8  { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mb-24 { margin-bottom: 24px; }
.mt-8  { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.flex  { display: flex; }
.flex-center { display: flex; align-items: center; }
.gap-8 { gap: 8px; }
.gap-12 { gap: 12px; }
.w-full { width: 100%; }
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 16px;
}
.back-link:hover { color: var(--text); }

/* ─────────────────────────────────────────────
   Responsive
───────────────────────────────────────────── */
@media (max-width: 900px) {
  #sidebar { width: 200px; }
}
@media (max-width: 680px) {
  #app { flex-direction: column; }
  #sidebar { width: 100%; height: auto; flex-direction: row; overflow-x: auto; }
  .sidebar-nav { display: flex; flex-direction: row; padding: 0; }
  .nav-item { border-left: none; border-bottom: 3px solid transparent; padding: 12px 14px; }
  .nav-item.active { border-bottom-color: var(--primary); }
  .sidebar-logo { display: none; }
  #content { padding: 16px; }
  .form-row, .form-row-3 { grid-template-columns: 1fr; }
  .line-item { grid-template-columns: 1fr 60px 80px 80px 32px; }
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ─────────────────────────────────────────────
   Auth Overlay
───────────────────────────────────────────── */
.auth-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-overlay.hidden { display: none; }

.auth-box {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow);
}
.auth-logo { text-align: center; margin-bottom: 28px; }
.auth-logo-mark {
  width: 52px; height: 52px;
  background: var(--primary);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 800; color: #fff;
  margin: 0 auto 10px;
}
.auth-logo-name    { font-size: 1.25rem; font-weight: 700; }
.auth-logo-company { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.auth-heading { font-size: 1.1rem; margin-bottom: 6px; }
.auth-sub     { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5; }
.auth-note    { font-size: 11px; color: var(--text-muted); margin-top: 16px; text-align: center; }
.auth-msg     { font-size: 13px; margin-top: 10px; padding: 8px 12px; border-radius: var(--radius); }
.auth-error   { background: rgba(239,68,68,0.1); color: #fca5a5; }
.auth-sent    { text-align: center; padding: 8px 0; }
.auth-sent-icon { font-size: 2.5rem; margin-bottom: 12px; }
.auth-sent h2 { margin-bottom: 8px; }

/* User badge in topbar */
.user-badge {
  display: flex; align-items: center; gap: 6px;
  cursor: pointer; padding: 4px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  font-size: 13px;
  transition: background 0.15s;
}
.user-badge:hover { background: var(--bg3); }
.user-initial {
  width: 24px; height: 24px;
  background: var(--primary);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
}
.user-email-short { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-dropdown {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  min-width: 200px;
  box-shadow: var(--shadow);
  z-index: 300;
}
.user-dropdown-email { font-size: 12px; color: var(--text-muted); padding: 4px 8px; }
.user-dropdown-sep   { border: none; border-top: 1px solid var(--border); margin: 6px 0; }
.user-dropdown-btn {
  width: 100%; background: none; border: none; text-align: left;
  padding: 6px 8px; color: var(--danger); cursor: pointer; border-radius: var(--radius);
  font-size: 13px; font-family: var(--font);
}
.user-dropdown-btn:hover { background: rgba(239,68,68,0.08); }

/* ─────────────────────────────────────────────
   Pipeline banner extra states
───────────────────────────────────────────── */
.pipeline-warn    .p-value { color: var(--warn); }
.pipeline-success .p-value { color: var(--success); }
.pipeline-muted   .p-value { color: var(--text-muted); }
.pipeline-alert   .p-value { color: var(--danger); }

/* ─────────────────────────────────────────────
   OCR Module
───────────────────────────────────────────── */
.ocr-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .ocr-layout { grid-template-columns: 1fr; } }
.ocr-left {}
.ocr-right {}
.ocr-image-preview { margin-top: 12px; }
.ocr-preview-img { max-width: 100%; border: 1px solid var(--border); border-radius: var(--radius); }
.ocr-progress {
  height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; margin-bottom: 8px;
}
.ocr-progress-bar {
  height: 100%; background: var(--primary);
  transition: width 0.3s ease; border-radius: 3px;
}
.ocr-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.ocr-field       { transition: background 0.15s; }
.ocr-review      { border-left: 3px solid var(--warn); padding-left: 10px; }
.ocr-missing     { border-left: 3px solid var(--border); padding-left: 10px; opacity: 0.8; }
.ocr-flag        { font-size: 11px; color: var(--warn); margin-left: 8px; }
.input-missing   { border-color: var(--border) !important; opacity: 0.7; }
.ocr-actions     { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.ocr-tips {
  background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 12px 16px; font-size: 12px; color: var(--text-muted); margin-top: 20px; line-height: 1.6;
}

/* ─────────────────────────────────────────────
   Maintenance Items Library extras
───────────────────────────────────────────── */
.table-footer {
  padding: 10px 12px; font-size: 12px; color: var(--text-muted);
  border-top: 1px solid var(--border);
}

/* ─────────────────────────────────────────────
   Settings
───────────────────────────────────────────── */
.markup-mult-input { max-width: 90px; text-align: right; }
code {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 3px; padding: 1px 6px; font-size: 12px;
  font-family: 'Courier New', monospace; color: var(--primary);
}

/* ─────────────────────────────────────────────
   Proposal Wizard
───────────────────────────────────────────── */
.wiz-wrap { max-width: 960px; margin: 0 auto; padding: 24px; }
.wiz-steps {
  display: flex; align-items: center; margin-bottom: 28px; gap: 0;
}
.wiz-step-dot {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  flex-shrink: 0; position: relative;
}
.wiz-dot-num {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--bg3); border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: var(--text-muted);
}
.wiz-step-dot.active .wiz-dot-num  { background: var(--primary); border-color: var(--primary); color: #fff; }
.wiz-step-dot.done   .wiz-dot-num  { background: var(--success); border-color: var(--success); color: #fff; }
.wiz-dot-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.wiz-step-dot.active .wiz-dot-label { color: var(--primary); font-weight: 600; }
.wiz-step-line { flex: 1; height: 2px; background: var(--border); min-width: 24px; margin: 0 4px; margin-bottom: 18px; }

.wiz-card {
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 28px;
}
.wiz-card h3 { font-size: 1.15rem; margin-bottom: 6px; }

.wiz-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;
  padding-top: 16px; border-top: 1px solid var(--border);
}

/* Source grid */
.source-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 640px) { .source-grid { grid-template-columns: 1fr; } }
.source-opt {
  display: flex; flex-direction: column; gap: 4px;
  background: var(--bg3); border: 2px solid var(--border);
  border-radius: var(--radius); padding: 14px 16px; cursor: pointer;
  transition: all 0.15s; position: relative;
}
.source-opt input { position: absolute; top: 12px; right: 12px; }
.source-opt.active { border-color: var(--primary); background: rgba(59,130,246,0.08); }
.src-icon { font-size: 1.4rem; }
.src-label { font-weight: 600; font-size: 14px; }
.src-sub { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

/* Drop zones */
.drop-zone-sm {
  border: 2px dashed var(--border); border-radius: var(--radius);
  padding: 14px 16px; cursor: pointer; margin-bottom: 10px;
  transition: all 0.15s; display: flex; align-items: center; gap: 12px;
}
.drop-zone-sm:hover, .drop-zone-sm.drag-active { border-color: var(--primary); background: rgba(59,130,246,0.05); }
.dz-file { color: var(--success); font-size: 13px; }
.dz-hint { color: var(--text-muted); font-size: 12px; }

/* OCR status */
.ocr-status { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; margin-bottom: 16px; font-size: 13px; }
.spinner-inline { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 6px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Confidence badges */
.conf-badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; font-weight: 600; vertical-align: middle; }
.conf-high   { background: rgba(16,185,129,0.15); color: #6ee7b7; }
.conf-medium { background: rgba(245,158,11,0.15); color: #fcd34d; }
.conf-low    { background: rgba(239,68,68,0.15); color: #fca5a5; }
.input-review { border-color: var(--warn) !important; }

/* Normalize table */
.row-review { background: rgba(245,158,11,0.05); }

/* Review summary */
.review-summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px; }
@media (max-width: 640px) { .review-summary { grid-template-columns: 1fr; } }
.review-block {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
}
.review-block h4 { font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; letter-spacing: 0.5px; }
.price-big { font-size: 1.6rem; font-weight: 700; }
.text-warn { color: var(--warn); font-size: 13px; }

/* Cover image zone */
.cover-img-zone {
  border: 2px dashed var(--border); border-radius: var(--radius);
  padding: 20px; cursor: pointer; text-align: center;
  transition: all 0.15s; min-height: 60px; display: flex; align-items: center; justify-content: center;
}
.cover-img-zone:hover { border-color: var(--primary); }

/* ─── Equipment area grouping in building detail ───────────────── */
.equip-area-group { border-bottom: 1px solid var(--border); }
.equip-area-group:last-child { border-bottom: none; }
.equip-area-header {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; background: var(--bg3);
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.4px; color: var(--text-muted);
}
.table-compact td, .table-compact th { padding: 6px 10px; font-size: 12.5px; }
.detail-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
@media (max-width: 800px) { .detail-grid-2 { grid-template-columns: 1fr; } }

/* ── PM Quote MVP ────────────────────────────────────────────── */
.sub-slot { transition: background 0.15s; }
.sub-slot-active { background: rgba(59,130,246,0.04); }
.link-strong { font-weight: 600; color: var(--primary); }
.toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
.toolbar-right { display:flex; gap:8px; }
.eq-inp { background: var(--bg3); border: 1px solid var(--border); color: var(--text); border-radius: 4px; padding:4px 6px; font-size:13px; width:100%; }
.eq-inp:focus { outline:none; border-color:var(--primary); }
