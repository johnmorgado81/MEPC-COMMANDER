// settings.js — Admin settings: rate sheet, markup matrix, XLSX upload
// All changes persist to Supabase (markup_matrix + user_settings tables).

import { MarkupMatrix, UserSettings, EquipmentMasterSync } from './db.js';
import { EQUIPMASTER, EQUIPMASTER_MANUFACTURERS } from './equipmaster.js';
import { CONFIG }                      from './config.js';
import { notify }                      from './ui.js';
import { formatCurrency }              from './helpers.js';

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
        <button class="tab-btn" data-tab="equipmaster">Equipment Master</button>
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
    if (tab === 'rates')       this._renderRates(el);
    if (tab === 'markup')      this._renderMarkup(el);
    if (tab === 'company')     this._renderCompany(el);
    if (tab === 'equipmaster') this._renderEquipMaster(el);
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

  // ─── Equipment Master ─────────────────────────────────────────────────────────
  async _renderEquipMaster(el) {
    const cats = [...new Set(EQUIPMASTER.map(e => e.category))].sort();
    el.innerHTML = `
      <div class="report-card">
        <h3>Equipment Master Dataset</h3>
        <p class="text-muted mb-16" style="font-size:13px">
          ${EQUIPMASTER.length} types · ${EQUIPMASTER_MANUFACTURERS.length} manufacturers · ${cats.length} categories.
          Drives all dropdowns, auto-fill, and proposal calculations.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
          <button class="btn btn-secondary" id="em-seed-btn">↑ Seed Manufacturers to DB</button>
          <span id="em-seed-status" class="text-muted" style="line-height:2.2"></span>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>Category</th><th>Equipment Type</th><th>Tag</th>
              <th class="text-right">Qtly Hrs</th><th class="text-right">Ann Hrs</th>
              <th>Belt</th><th>Filter</th><th>Lubricant</th>
            </tr></thead>
            <tbody>
              ${EQUIPMASTER.map(e => `<tr>
                <td><span class="badge badge-muted">${e.category||'—'}</span></td>
                <td>${e.equipment_type}</td>
                <td class="text-muted">${e.tag_prefix||'—'}</td>
                <td class="text-right">${e.quarterly_hours != null ? e.quarterly_hours : '—'}</td>
                <td class="text-right">${e.annual_hours    != null ? e.annual_hours    : '—'}</td>
                <td class="text-muted">${e.belt_size  ||'—'}</td>
                <td class="text-muted">${e.filter_type||'—'}</td>
                <td class="text-muted">${e.lubricant_type||'—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('em-seed-btn')?.addEventListener('click', async () => {
      const btn    = document.getElementById('em-seed-btn');
      const status = document.getElementById('em-seed-status');
      btn.disabled = true; btn.textContent = 'Seeding…';
      try {
        const count = await EquipmentMasterSync.seedManufacturers(EQUIPMASTER_MANUFACTURERS);
        status.textContent = `✓ ${count} manufacturers seeded.`;
      } catch (err) {
        status.textContent = 'Failed: ' + err.message;
      } finally {
        btn.disabled = false; btn.textContent = '↑ Seed Manufacturers to DB';
      }
    });
  },

  // ─── Company Info ──────────────────────────────────────────────────────────
  async _renderCompany(el) {
    let saved = null;
    try { saved = await UserSettings.get('company_profile'); } catch {}
    const c = saved ? { ...CONFIG.COMPANY, ...saved } : { ...CONFIG.COMPANY };
    // Mirror to localStorage so pdf-export can read synchronously
    if (saved) { try { localStorage.setItem('mepc_company_profile', JSON.stringify(c)); } catch {} }

    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Company Profile</h3>
          <span style="font-size:11.5px;color:var(--text-dim)">Used on all PDF exports. Saved to Supabase — survives redeployments.</span>
        </div>
        <div class="card-body">
          <form id="company-form">
            <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:10px">Company</div>
            <div class="form-row">
              <div class="form-group">
                <label>Company Name</label>
                <input name="name" class="input" value="${c.name||''}">
              </div>
              <div class="form-group">
                <label>Division / Brand Name</label>
                <input name="division" class="input" value="${c.division||''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Street Address</label>
                <input name="address" class="input" value="${c.address||''}">
              </div>
              <div class="form-group">
                <label>City</label>
                <input name="city" class="input" value="${c.city||''}">
              </div>
              <div class="form-group">
                <label>Province</label>
                <input name="province" class="input" value="${c.province||'BC'}">
              </div>
              <div class="form-group">
                <label>Postal Code</label>
                <input name="postal" class="input" value="${c.postal||''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Phone</label>
                <input name="phone" class="input" value="${c.phone||''}">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input name="email" type="email" class="input" value="${c.email||''}">
              </div>
              <div class="form-group">
                <label>Website</label>
                <input name="website" class="input" value="${c.website||''}">
              </div>
            </div>

            <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin:16px 0 10px">Tax & Regulatory</div>
            <div class="form-row">
              <div class="form-group">
                <label>GST Number</label>
                <input name="gst" class="input" value="${c.gst||''}">
              </div>
              <div class="form-group">
                <label>PST Number</label>
                <input name="pst" class="input" value="${c.pst||''}">
              </div>
              <div class="form-group">
                <label>TSB / Trade Registration</label>
                <input name="tsb" class="input" value="${c.tsb||''}">
              </div>
              <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:6px">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                  <input type="checkbox" name="show_gst" ${c.show_gst!==false?'checked':''}>
                  Show GST on proposals
                </label>
              </div>
            </div>

            <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin:16px 0 10px">Team</div>
            <div class="form-row">
              <div class="form-group">
                <label>Sales Person</label>
                <input name="sales_person" class="input" value="${c.sales_person||''}">
              </div>
              <div class="form-group">
                <label>Sales Manager</label>
                <input name="sales_manager" class="input" value="${c.sales_manager||''}">
              </div>
              <div class="form-group">
                <label>Division Manager</label>
                <input name="division_manager" class="input" value="${c.division_manager||''}">
              </div>
              <div class="form-group">
                <label>Authorized Signatory</label>
                <input name="signatory" class="input" value="${c.signatory||''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Signatory Title</label>
                <input name="signatory_title" class="input" value="${c.signatory_title||''}">
              </div>
              <div class="form-group">
                <label>Contact Phone (for proposals)</label>
                <input name="contact_phone" class="input" value="${c.contact_phone||c.phone||''}">
              </div>
            </div>

            <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin:16px 0 10px">Company Blurb (shown on proposal intro page)</div>
            <div class="form-group">
              <textarea name="company_blurb" class="input" rows="4" placeholder="e.g. MEC Mechanical Inc. is a full-service mechanical contracting company serving the Lower Mainland since 1987...">${c.company_blurb||''}</textarea>
            </div>

            <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin:16px 0 10px">Company Logo (used on PDF cover)</div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              ${c.logo_data ? `<img src="${c.logo_data}" style="max-height:60px;max-width:180px;border:1px solid var(--border);border-radius:var(--radius)">` : '<span style="font-size:12px;color:var(--text-muted)">No logo uploaded</span>'}
              <label class="btn btn-sm btn-secondary" style="cursor:pointer">
                Upload Logo
                <input type="file" id="logo-upload-inp" accept="image/*" style="display:none">
              </label>
              ${c.logo_data ? '<button type="button" class="btn btn-sm btn-danger" id="logo-clear-btn">Remove</button>' : ''}
            </div>
            <input type="hidden" name="logo_data" id="logo-data-field" value="${c.logo_data||''}">

            <div style="margin-top:16px;display:flex;gap:8px">
              <button type="submit" class="btn btn-primary">Save Company Profile</button>
              <button type="button" class="btn btn-secondary" id="company-reset-btn">Reset to Config Defaults</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Logo upload
    document.getElementById('logo-upload-inp')?.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 2*1024*1024) { notify.warn('Logo must be under 2 MB.'); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('logo-data-field').value = ev.target.result;
        notify.success('Logo loaded. Save to persist.');
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('logo-clear-btn')?.addEventListener('click', () => {
      document.getElementById('logo-data-field').value = '';
      notify.info('Logo removed. Save to persist.');
    });
    document.getElementById('company-reset-btn')?.addEventListener('click', async () => {
      try { await UserSettings.set('company_profile', null); Object.assign(CONFIG.COMPANY, CONFIG.COMPANY); }
      catch {}
      notify.info('Reset to config.js defaults on next reload.');
    });

    document.getElementById('company-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target); const data = {};
      fd.forEach((v,k) => { data[k] = v; });
      data.show_gst = !!e.target.elements.show_gst?.checked;
      try {
        await UserSettings.set('company_profile', data);
        Object.assign(CONFIG.COMPANY, data);
        try { localStorage.setItem('mepc_company_profile', JSON.stringify(data)); } catch {}
        notify.success('Company profile saved.');
      } catch(err) { notify.error(err.message); }
    });
  },
};
