// settings.js — Admin settings: rate sheet, markup matrix, XLSX upload
// All changes persist to Supabase (markup_matrix + user_settings tables).

import { MarkupMatrix, UserSettings } from '../db.js';
import { CONFIG }                      from '../config.js';
import { notify }                      from '../components/ui.js';
import { formatCurrency }              from '../utils/helpers.js';

export const Settings = {
  async init(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1>Settings</h1>
        <p class="page-sub">Rate sheet, markup matrix, and company configuration.</p>
      </div>
      <div class="tab-bar mb-16">
        <button class="tab-btn active" data-tab="rates">Labour Rates</button>
        <button class="tab-btn" data-tab="markup">Material Markup</button>
        <button class="tab-btn" data-tab="company">Company Info</button>
      </div>
      <div id="settings-content"></div>
    `;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._loadTab(btn.dataset.tab);
      });
    });

    this._loadTab('rates');
  },

  _loadTab(tab) {
    const el = document.getElementById('settings-content');
    if (tab === 'rates')   this._renderRates(el);
    if (tab === 'markup')  this._renderMarkup(el);
    if (tab === 'company') this._renderCompany(el);
  },

  // ─── Labour Rates ─────────────────────────────────────────────────────────
  async _renderRates(el) {
    let saved = null;
    try { saved = await UserSettings.get('labour_rates'); } catch(e) {}
    const r = saved || CONFIG.LABOUR_RATES;

    el.innerHTML = `
      <div class="report-card">
        <h3>Labour Rate Sheet — from Schedule D (2024)</h3>
        <p class="text-muted mb-16" style="font-size:13px">
          These rates are used for deficiency quotes and service call estimates.
          PM hourly rate drives proposal pricing calculations.
        </p>
        <form id="rates-form">
          <div class="form-row">
            <div class="form-group">
              <label>Weekday Callout Fee ($)</label>
              <input type="number" step="0.01" name="weekday_callout" value="${r.weekday_callout}">
              <small class="text-muted">Includes 0.5hr + truck fee + fuel surcharge</small>
            </div>
            <div class="form-group">
              <label>Weekday Hourly Rate ($/hr)</label>
              <input type="number" step="0.01" name="weekday_hourly" value="${r.weekday_hourly}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Weekend/OT Callout Fee ($)</label>
              <input type="number" step="0.01" name="weekend_callout" value="${r.weekend_callout}">
            </div>
            <div class="form-group">
              <label>Weekend/OT Hourly Rate ($/hr)</label>
              <input type="number" step="0.01" name="weekend_hourly" value="${r.weekend_hourly}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>PM Labour Rate ($/hr)</label>
              <input type="number" step="0.01" name="pm_hourly" value="${r.pm_hourly}">
              <small class="text-muted">Used to price PM proposals from standard hours</small>
            </div>
            <div class="form-group">
              <label>Minimum Site Hours</label>
              <input type="number" step="0.5" name="minimum_hours" value="${r.minimum_hours}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>PM Overhead % <small>(on labour cost)</small></label>
              <input type="number" step="1" name="pm_overhead_pct" value="${Math.round((CONFIG.PM_OVERHEAD_PCT ?? 0.30) * 100)}">
            </div>
            <div class="form-group">
              <label>PM Margin % <small>(net, after overhead)</small></label>
              <input type="number" step="1" name="pm_margin_pct" value="${Math.round((CONFIG.PM_MARGIN_PCT ?? 0.20) * 100)}">
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Save Rates</button>
        </form>
      </div>
    `;

    document.getElementById('rates-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const rec = {
        weekday_callout:  parseFloat(fd.get('weekday_callout')),
        weekday_hourly:   parseFloat(fd.get('weekday_hourly')),
        weekend_callout:  parseFloat(fd.get('weekend_callout')),
        weekend_hourly:   parseFloat(fd.get('weekend_hourly')),
        pm_hourly:        parseFloat(fd.get('pm_hourly')),
        minimum_hours:    parseFloat(fd.get('minimum_hours')),
        pm_overhead_pct:  parseFloat(fd.get('pm_overhead_pct')) / 100,
        pm_margin_pct:    parseFloat(fd.get('pm_margin_pct'))   / 100,
      };
      try {
        await UserSettings.set('labour_rates', rec);
        // Also update CONFIG at runtime so rest of app picks up immediately
        Object.assign(CONFIG.LABOUR_RATES, rec);
        CONFIG.PM_OVERHEAD_PCT = rec.pm_overhead_pct;
        CONFIG.PM_MARGIN_PCT   = rec.pm_margin_pct;
        notify('Rates saved', 'success');
      } catch (err) {
        notify('Save failed: ' + err.message, 'error');
      }
    });
  },

  // ─── Markup Matrix ─────────────────────────────────────────────────────────
  async _renderMarkup(el) {
    el.innerHTML = `<div class="spinner">Loading…</div>`;
    let rows = [];
    try { rows = await MarkupMatrix.getAll(); } catch(e) { rows = []; }

    el.innerHTML = `
      <div class="report-card">
        <h3>Material Markup Matrix</h3>
        <p class="text-muted mb-16" style="font-size:13px">
          Sell price = cost × multiplier. Applied automatically when pricing deficiency quotes.
          Loaded from Material_Markup_Matrix.xlsx on initial setup.
        </p>
        <table class="data-table" id="markup-table">
          <thead>
            <tr>
              <th>Cost Range</th>
              <th class="text-right">Multiplier</th>
              <th class="text-right">Example: $50 cost → sell</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr data-id="${r.id}">
                <td>${r.label || (r.cost_to ? `$${r.cost_from} – $${r.cost_to}` : `$${r.cost_from}+`)}</td>
                <td class="text-right">
                  <input type="number" step="0.01" class="markup-mult-input"
                    value="${r.multiplier}" data-id="${r.id}" style="max-width:80px;text-align:right">
                </td>
                <td class="text-right text-muted markup-example" data-id="${r.id}">
                  ${formatCurrency(50 * r.multiplier)}
                </td>
                <td class="action-cell">
                  <button class="btn btn-sm btn-primary markup-save-btn" data-id="${r.id}">Save</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="form-section-title mt-16">Upload Markup Matrix from XLSX</div>
        <p class="text-muted mb-8" style="font-size:13px">
          Upload a spreadsheet with columns: <code>cost_from</code>, <code>cost_to</code>, <code>multiplier</code>, <code>label</code>
          — or in the same format as Material_Markup_Matrix.xlsx.
        </p>
        <label class="btn btn-secondary">
          Import XLSX
          <input type="file" id="markup-xlsx-input" accept=".xlsx,.csv" style="display:none">
        </label>
        <span id="markup-upload-status" class="text-muted" style="margin-left:12px;font-size:13px"></span>
      </div>
    `;

    // Live multiplier preview
    el.querySelectorAll('.markup-mult-input').forEach(input => {
      input.addEventListener('input', () => {
        const id   = input.dataset.id;
        const val  = parseFloat(input.value) || 0;
        const ex   = el.querySelector(`.markup-example[data-id="${id}"]`);
        if (ex) ex.textContent = formatCurrency(50 * val);
      });
    });

    // Save individual rows
    el.querySelectorAll('.markup-save-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id    = btn.dataset.id;
        const input = el.querySelector(`.markup-mult-input[data-id="${id}"]`);
        const mult  = parseFloat(input?.value);
        if (!mult || isNaN(mult)) return;
        try {
          await MarkupMatrix.update(id, { multiplier: mult });
          notify('Multiplier saved', 'success');
        } catch (err) {
          notify('Save failed: ' + err.message, 'error');
        }
      });
    });

    // XLSX upload
    document.getElementById('markup-xlsx-input')?.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      await this._importMarkupXLSX(file, el);
    });
  },

  async _importMarkupXLSX(file, el) {
    const status = document.getElementById('markup-upload-status');
    if (status) status.textContent = 'Parsing…';

    try {
      if (typeof XLSX === 'undefined') throw new Error('SheetJS not loaded');

      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Detect Material_Markup_Matrix.xlsx format (col A = range string, col B = multiplier)
      // vs column-header format
      const isMECFormat = rows.some(r => {
        const keys = Object.keys(r);
        return keys.length === 2 && keys.some(k => k.toLowerCase().includes('material'));
      });

      let parsed = [];
      if (isMECFormat) {
        // Original MEC format: "Material Cost" | "Multiplication Factor"
        let sortOrder = 1;
        for (const r of rows) {
          const vals = Object.values(r);
          const label = String(vals[0]).trim();
          const mult  = parseFloat(vals[1]);
          if (!mult || isNaN(mult) || !label.includes('$')) continue;

          // Parse range from label like "$5.00-$19.99" or "$3000.00 and up"
          const nums = label.match(/[\d,]+\.?\d*/g);
          const from = nums ? parseFloat(nums[0].replace(',','')) : null;
          const to   = nums && nums.length > 1 ? parseFloat(nums[1].replace(',','')) : null;
          if (!from) continue;

          parsed.push({ cost_from: from, cost_to: to, multiplier: mult, label, sort_order: sortOrder++ });
        }
      } else {
        // Standard column format
        for (const r of rows) {
          const from = parseFloat(r.cost_from ?? r['Cost From'] ?? r['from']);
          const to   = r.cost_to !== '' ? parseFloat(r.cost_to ?? r['Cost To'] ?? r['to']) : null;
          const mult = parseFloat(r.multiplier ?? r['Multiplier'] ?? r['Factor']);
          const label = r.label ?? r['Label'] ?? '';
          if (isNaN(from) || isNaN(mult)) continue;
          parsed.push({ cost_from: from, cost_to: isNaN(to) ? null : to, multiplier: mult, label });
        }
      }

      if (parsed.length === 0) throw new Error('No valid rows found. Check column format.');

      // Clear existing and insert new
      const existing = await MarkupMatrix.getAll();
      for (const row of parsed) {
        // Find matching row by cost_from and update
        const match = existing.find(e => e.cost_from === row.cost_from);
        if (match) {
          await MarkupMatrix.update(match.id, { multiplier: row.multiplier, label: row.label });
        }
      }

      if (status) status.textContent = `Imported ${parsed.length} tiers.`;
      notify(`Markup matrix updated from ${file.name}`, 'success');
      await this._renderMarkup(el.closest('#settings-content') || el);
    } catch (err) {
      if (status) status.textContent = 'Import failed: ' + err.message;
      notify('Import failed: ' + err.message, 'error');
    }
  },

  // ─── Company Info ──────────────────────────────────────────────────────────
  async _renderCompany(el) {
    const c = CONFIG.COMPANY;
    el.innerHTML = `
      <div class="report-card">
        <h3>Company Information</h3>
        <p class="text-muted mb-16" style="font-size:13px">
          Displayed on all PDF exports. Update <code>js/config.js</code> COMPANY block directly,
          then redeploy to Cloudflare Pages.
        </p>
        <div class="detail-grid">
          <div class="detail-field"><label>Company Name</label><div class="field-value">${c.name}</div></div>
          <div class="detail-field"><label>Address</label><div class="field-value">${c.address}, ${c.city}, ${c.province} ${c.postal}</div></div>
          <div class="detail-field"><label>Phone</label><div class="field-value">${c.phone}</div></div>
          <div class="detail-field"><label>Email</label><div class="field-value">${c.email}</div></div>
          <div class="detail-field"><label>Website</label><div class="field-value">${c.website}</div></div>
          <div class="detail-field"><label>GST Number</label><div class="field-value">${c.gst}</div></div>
        </div>
        <p class="text-muted mt-16" style="font-size:12px">
          To edit company details: open <code>js/config.js</code>, update the COMPANY block, commit to GitHub, Cloudflare will redeploy automatically.
        </p>
      </div>
    `;
  },
};
