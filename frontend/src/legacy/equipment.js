import { setPageTitle } from './app.js';
import { Equipment as DB, Buildings } from './db.js';
import { CONFIG } from './config.js';
import { formatCurrency, formatDate, statusBadge, exportCSV, today } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState } from './ui.js';
import { navigate } from './router.js';
import { findEquipType, getEquipDefaults, EQUIPMASTER, EQUIPMASTER_MANUFACTURERS, EQUIPMASTER_CATEGORIES } from './equipmaster.js';
import { calcRow, sellFromHours, stdHours, deriveVisitCount } from './pm-engine.js';

const SA = { common_strata:'Common Strata', commercial:'Commercial', residential_in_suite:'Residential / In-Suite' };
const sal = v => SA[v] || v || '—';
const $id = id => document.getElementById(id);
// ── Hours engine — delegates to pm-engine.js ──────────────────────────────────
function rowAnnualHrs(e, qv) { return calcRow(e, qv).rowTotalHrs; }
function rowSell(e, qv)      { return calcRow(e, qv).rowSell; }

// ── Duplicate detection ────────────────────────────────────────────────────────
function flagDuplicates(rows) {
  const seen = {};
  rows.forEach(r => {
    const key = `${r.building_id}|${(r.tag||'').trim().toUpperCase()}|${(r.equipment_type||'').trim().toLowerCase()}`;
    if (!key.endsWith('||')) {
      seen[key] = (seen[key] || 0) + 1;
    }
  });
  return rows.map(r => {
    const key = `${r.building_id}|${(r.tag||'').trim().toUpperCase()}|${(r.equipment_type||'').trim().toLowerCase()}`;
    return { ...r, _isDup: (seen[key] || 0) > 1 };
  });
}

// ── Consumables helpers ────────────────────────────────────────────────────────
function parseConsumables(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export const Equipment = {

  // ── List view ──────────────────────────────────────────────────────────────
  async init(container) {
    const qs = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const buildingId = qs.get('building') || '';
    this._buildingId = buildingId;
    this._building = null;
    this._filter = 'all';
    this._dirty = {};

    if (buildingId) {
      try {
        const bl = await Buildings.getAll();
        this._building = bl.find(b => b.id === buildingId) || null;
      } catch {}
    }

    setPageTitle('Equipment' + (this._building ? ' — ' + this._building.name : ''));

    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        ${buildingId ? `<button class="btn btn-secondary btn-sm" id="eq-back">← ${this._building?.name||'Building'}</button>` : ''}
        <input type="search" id="eq-search" class="input input-sm" placeholder="Search…" style="max-width:180px">
        <select id="eq-filter-area" class="input input-sm" style="max-width:150px">
          <option value="">All Areas</option>
          ${CONFIG.SERVICE_AREAS.map(a=>`<option value="${a.value}">${a.label}</option>`).join('')}
        </select>
        <select id="eq-filter-flag" class="input input-sm" style="max-width:160px">
          <option value="all">All Records</option>
          <option value="missing">Missing Make/Model</option>
          <option value="edited">Edited Rows</option>
          <option value="unmatched">Unmatched Type</option>
          <option value="dup">Duplicates</option>
          <option value="review">Needs Review</option>
        </select>
        <div class="toolbar-right">
          <button class="btn btn-sm btn-secondary" id="eq-bulk-btn">Bulk Edit</button>
          <button class="btn btn-sm btn-secondary" id="eq-export">Export CSV</button>
          <button class="btn btn-sm btn-danger"    id="eq-clear-all">Clear All</button>
          <button class="btn btn-sm btn-primary"   id="eq-add">+ Add Equipment</button>
        </div>
      </div>

      <div id="eq-summary-bar" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);font-size:12px"></div>

      <div class="card"><div id="eq-table-wrap">${spinner()}</div></div>

      <div id="eq-registry-totals" style="margin-top:14px"></div>
    </div>`;

    await this.loadTable();

    $id('eq-add').onclick = () => this.openForm(null, buildingId);
    $id('eq-search').oninput = () => this._applyFilters();
    $id('eq-filter-area').onchange = () => this._applyFilters();
    $id('eq-filter-flag').onchange = () => { this._filter = $id('eq-filter-flag').value; this._applyFilters(); };
    $id('eq-export').onclick = () => this.exportData();
    $id('eq-bulk-btn').onclick = () => this.openBulkEdit();
    $id('eq-clear-all').onclick = () => this.clearAll();
    if (buildingId) $id('eq-back')?.addEventListener('click', () => navigate(`/buildings/${buildingId}`));
  },

  async loadTable() {
    const wrap = $id('eq-table-wrap');
    if (!wrap) return;
    try {
      const raw = this._buildingId ? await DB.getByBuilding(this._buildingId) : await DB.getAll();
      this._rows = flagDuplicates(raw || []);
      this._renderTable();
      this._renderSummary();
    } catch(err) {
      wrap.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
  },

  _renderTable() {
    const wrap = $id('eq-table-wrap');
    if (!wrap || !this._rows) return;
    if (!this._rows.length) { wrap.innerHTML = emptyState('No equipment. Click + Add Equipment.'); this._renderSummary(); return; }

    wrap.innerHTML = `<div class="table-wrap">
    <table class="table" id="eq-table">
      <thead><tr>
        <th style="width:28px"><input type="checkbox" id="eq-chk-all" title="Select all"></th>
        <th>Area</th><th>Tag</th><th>Type</th><th>Make / Model</th>
        <th title="Quantity">Qty</th>
        <th title="Std quarterly hrs/visit">Q.Hrs</th>
        <th title="Annual cleaning hrs (from EQUIPMASTER)">A.Hrs</th>
        <th title="Annual labour hours">Ann.Hrs</th>
        <th title="Annual sell price">Sell/yr</th>
        <th>Status</th>
        ${!this._buildingId ? '<th>Building</th>' : ''}
        <th style="width:90px"></th>
      </tr></thead>
      <tbody id="eq-tbody">${this._rows.map((e,i) => this._rowHTML(e,i)).join('')}</tbody>
    </table></div>`;

    this._wireTableEvents();
    this._applyFilters();
    this._renderSummary();
  },

  _rowHTML(e, i) {
    const std   = findEquipType(e.equipment_type);
    const qStd  = std?.quarterly_hours ?? '—';
    const aStd  = std?.annual_hours    ?? '—';
    const qEff  = effQtrHrs(e);
    const aEff  = effAnnHrs(e);
    const annHr = rowAnnualHrs(e);
    const sell  = rowSell(e);
    const isEdited   = (e.override_quarterly_hours != null || e.override_annual_hours != null);
    const isUnmatched = !std;
    const flags = [
      e._isDup      ? `<span title="Possible duplicate" style="color:var(--yellow)">⚠</span>` : '',
      e.review_status === 'needs-review' ? `<span title="Needs review" style="color:var(--orange)">!</span>` : '',
      isEdited      ? `<span title="Hours overridden" style="color:var(--blue)">✎</span>` : '',
      isUnmatched   ? `<span title="Type not in EQUIPMASTER" style="color:var(--text-muted)">?</span>` : '',
    ].filter(Boolean).join(' ');

    return `<tr data-id="${e.id}" data-idx="${i}"
      data-area="${e.service_area||''}" data-edited="${isEdited?1:0}"
      data-unmatched="${isUnmatched?1:0}" data-dup="${e._isDup?1:0}"
      data-review="${e.review_status||''}"
      style="${e._isDup?'background:rgba(245,158,11,.05)':''}">
      <td><input type="checkbox" class="eq-row-chk" data-id="${e.id}"></td>
      <td style="font-size:11px;color:var(--text-dim)">${sal(e.service_area)}</td>
      <td><strong style="font-family:var(--font-mono);font-size:12px">${e.tag||'—'}</strong></td>
      <td>
        <span style="font-size:12.5px">${e.equipment_type}</span>
        ${flags ? `<span style="margin-left:4px">${flags}</span>` : ''}
      </td>
      <td style="font-size:12px;color:var(--text-dim)">${[e.manufacturer||e.make,e.model].filter(Boolean).join(' / ')||'—'}</td>
      <td style="text-align:center">${e.qty||1}</td>
      <td>
        <input type="number" class="input input-sm eq-qhrs" data-id="${e.id}" step="0.25" min="0"
          value="${e.override_quarterly_hours ?? e.quarterly_hours ?? ''}"
          placeholder="${qStd}" title="Std: ${qStd} hrs/visit"
          style="width:56px;${e.override_quarterly_hours!=null?'border-color:var(--orange);':''}">
      </td>
      <td>
        <label title="Toggle annual cleaning from EQUIPMASTER (${aStd} hrs)" style="display:flex;align-items:center;gap:4px;cursor:pointer">
          <input type="checkbox" class="eq-acleaning" data-id="${e.id}" ${e.annual_cleaning_enabled?'checked':''}>
          <span style="font-size:11px;color:${e.annual_cleaning_enabled?'var(--orange)':'var(--text-muted)'}">${aStd}</span>
        </label>
      </td>
      <td style="font-family:var(--font-mono);font-size:12px;color:${annHr>0?'var(--text)':'var(--text-muted)'}">
        ${annHr > 0 ? annHr.toFixed(2) : '—'}
      </td>
      <td style="font-family:var(--font-mono);font-size:12px;color:${sell>0?'var(--green)':'var(--text-muted)'}">
        ${sell > 0 ? formatCurrency(sell) : '—'}
      </td>
      <td>${statusBadge(e.status||'active')}</td>
      ${!this._buildingId ? `<td style="font-size:12px">${e.buildings?.name||'—'}</td>` : ''}
      <td class="actions" style="white-space:nowrap">
        <button class="btn btn-xs btn-secondary" data-edit="${e.id}">Edit</button>
        <button class="btn btn-xs btn-secondary" data-cons="${e.id}" title="Consumables">🧰</button>
        <button class="btn btn-xs btn-danger"    data-del="${e.id}">✕</button>
      </td>
    </tr>`;
  },

  _wireTableEvents() {
    const tbody = $id('eq-tbody');
    if (!tbody) return;

    // Select all
    $id('eq-chk-all').onchange = e => tbody.querySelectorAll('.eq-row-chk').forEach(c => c.checked = e.target.checked);

    // Quarterly hours inline edit
    tbody.querySelectorAll('.eq-qhrs').forEach(inp => {
      inp.onblur = async e => {
        const id  = e.target.dataset.id;
        const val = e.target.value === '' ? null : parseFloat(e.target.value);
        const row = this._rows.find(r => r.id === id);
        if (!row) return;
        row.override_quarterly_hours = val;
        try {
          await DB.update(id, { override_quarterly_hours: val });
          this._refreshRow(id);
          this._renderSummary();
        } catch(err) { notify.error(err.message); }
      };
    });

    // Annual cleaning toggle
    tbody.querySelectorAll('.eq-acleaning').forEach(chk => {
      chk.onchange = async e => {
        const id  = e.target.dataset.id;
        const val = e.target.checked;
        const row = this._rows.find(r => r.id === id);
        if (!row) return;
        // Auto-fill annual hours from EQUIPMASTER if empty
        if (val && !row.override_annual_hours && !row.annual_hours) {
          const std = findEquipType(row.equipment_type);
          if (std?.annual_hours) {
            row.annual_hours = std.annual_hours;
            await DB.update(id, { annual_cleaning_enabled: true, annual_hours: std.annual_hours });
          } else {
            await DB.update(id, { annual_cleaning_enabled: true });
          }
        } else {
          await DB.update(id, { annual_cleaning_enabled: val });
        }
        row.annual_cleaning_enabled = val;
        this._refreshRow(id);
        this._renderSummary();
      };
    });

    // Buttons
    tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.openForm(b.dataset.edit, this._buildingId));
    tbody.querySelectorAll('[data-cons]').forEach(b => b.onclick = () => this.openConsumables(b.dataset.cons));
    tbody.querySelectorAll('[data-del]').forEach(b  => b.onclick = () => this.deleteEquipment(b.dataset.del));
  },

  _refreshRow(id) {
    const tbody = $id('eq-tbody');
    if (!tbody) return;
    const idx = this._rows.findIndex(r => r.id === id);
    if (idx < 0) return;
    const tr = tbody.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;
    const newTr = document.createElement('tbody');
    newTr.innerHTML = this._rowHTML(this._rows[idx], idx);
    const newRow = newTr.firstElementChild;
    tr.replaceWith(newRow);
    // Re-wire new row
    newRow.querySelectorAll('.eq-qhrs').forEach(inp => {
      inp.onblur = async e => {
        const rid = e.target.dataset.id;
        const val = e.target.value === '' ? null : parseFloat(e.target.value);
        const row = this._rows.find(r => r.id === rid);
        if (!row) return;
        row.override_quarterly_hours = val;
        await DB.update(rid, { override_quarterly_hours: val }).catch(err => notify.error(err.message));
        this._refreshRow(rid);
        this._renderSummary();
      };
    });
    newRow.querySelectorAll('.eq-acleaning').forEach(chk => {
      chk.onchange = async e => {
        const rid = e.target.dataset.id; const val = e.target.checked;
        const row = this._rows.find(r => r.id === rid);
        if (!row) return;
        if (val && !row.override_annual_hours && !row.annual_hours) {
          const std = findEquipType(row.equipment_type);
          if (std?.annual_hours) { row.annual_hours = std.annual_hours; await DB.update(rid, { annual_cleaning_enabled: true, annual_hours: std.annual_hours }); }
          else await DB.update(rid, { annual_cleaning_enabled: true });
        } else { await DB.update(rid, { annual_cleaning_enabled: val }); }
        row.annual_cleaning_enabled = val;
        this._refreshRow(rid);
        this._renderSummary();
      };
    });
    newRow.querySelector('[data-edit]').onclick = () => this.openForm(id, this._buildingId);
    newRow.querySelector('[data-cons]').onclick = () => this.openConsumables(id);
    newRow.querySelector('[data-del]').onclick  = () => this.deleteEquipment(id);
  },

  _applyFilters() {
    const q    = ($id('eq-search')?.value || '').toLowerCase();
    const area = $id('eq-filter-area')?.value || '';
    const flag = this._filter || 'all';
    $id('eq-tbody')?.querySelectorAll('tr').forEach(tr => {
      let show = true;
      if (q    && !tr.textContent.toLowerCase().includes(q)) show = false;
      if (area && tr.dataset.area !== area) show = false;
      if (flag === 'missing'  && !(tr.querySelector('td:nth-child(5)')?.textContent.trim() === '—')) show = false;
      if (flag === 'edited'   && tr.dataset.edited  !== '1') show = false;
      if (flag === 'unmatched'&& tr.dataset.unmatched!== '1') show = false;
      if (flag === 'dup'      && tr.dataset.dup      !== '1') show = false;
      if (flag === 'review'   && tr.dataset.review   !== 'needs-review') show = false;
      tr.style.display = show ? '' : 'none';
    });
  },

  _renderSummary() {
    const bar  = $id('eq-summary-bar');
    const totEl = $id('eq-registry-totals');
    if (!bar || !this._rows) return;

    const rows = this._rows;
    const totalQty    = rows.reduce((s,r) => s + (parseInt(r.qty)||1), 0);
    const totalAnnHrs = rows.reduce((s,r) => s + rowAnnualHrs(r), 0);
    const totalSell   = rows.reduce((s,r) => s + rowSell(r), 0);
    const dups        = rows.filter(r => r._isDup).length;
    const missing     = rows.filter(r => !r.manufacturer && !r.make).length;

    bar.innerHTML = [
      `<span style="color:var(--text-dim)">${rows.length} <span style="color:var(--text-muted)">types</span></span>`,
      `<span style="color:var(--text-dim)">${totalQty} <span style="color:var(--text-muted)">units</span></span>`,
      totalAnnHrs ? `<span style="color:var(--orange)">${totalAnnHrs.toFixed(1)} <span style="color:var(--text-muted)">ann.hrs</span></span>` : '',
      totalSell   ? `<span style="color:var(--green)">${formatCurrency(totalSell)} <span style="color:var(--text-muted)">/yr est.</span></span>` : '',
      dups        ? `<span style="color:var(--yellow)">⚠ ${dups} possible dup(s)</span>` : '',
      missing     ? `<span style="color:var(--text-muted)">⚑ ${missing} missing make/model</span>` : '',
    ].filter(Boolean).join('<span style="color:var(--border2)"> | </span>');

    if (!totEl) return;

    // Group by type
    const byType = {};
    rows.forEach(r => {
      const k = r.equipment_type || 'Other';
      if (!byType[k]) byType[k] = { qty: 0, annHrs: 0, sell: 0 };
      byType[k].qty    += parseInt(r.qty)||1;
      byType[k].annHrs += rowAnnualHrs(r);
      byType[k].sell   += rowSell(r);
    });

    const sorted = Object.entries(byType).sort((a,b) => b[1].sell - a[1].sell);

    totEl.innerHTML = `<div class="card">
      <div class="card-header"><h3>Registry Totals by Equipment Type</h3></div>
      <div class="card-body no-pad">
        <table class="table table-compact">
          <thead><tr><th>Type</th><th>Qty</th><th>Ann.Hrs</th><th>Est.Sell/yr</th></tr></thead>
          <tbody>${sorted.map(([t,v]) => `<tr>
            <td>${t}</td>
            <td style="text-align:center">${v.qty}</td>
            <td style="font-family:var(--font-mono)">${v.annHrs > 0 ? v.annHrs.toFixed(2) : '—'}</td>
            <td style="font-family:var(--font-mono);color:var(--green)">${v.sell > 0 ? formatCurrency(v.sell) : '—'}</td>
          </tr>`).join('')}
          <tr style="background:var(--bg3);font-weight:600;border-top:2px solid var(--border2)">
            <td>TOTAL</td>
            <td style="text-align:center">${totalQty}</td>
            <td style="font-family:var(--font-mono)">${totalAnnHrs.toFixed(2)}</td>
            <td style="font-family:var(--font-mono);color:var(--green)">${formatCurrency(totalSell)}</td>
          </tr></tbody>
        </table>
      </div>
    </div>`;
  },

  // ── Clear all ─────────────────────────────────────────────────────────────
  async clearAll() {
    const scope = this._buildingId ? `all equipment for this building` : `ALL equipment records`;
    if (!await confirm(`This will permanently delete ${scope}. This cannot be undone. Continue?`)) return;
    try {
      const rows = this._rows || [];
      for (const r of rows) { try { await DB.delete(r.id); } catch {} }
      notify.success(`${rows.length} record(s) deleted.`);
      await this.loadTable();
    } catch(err) { notify.error(err.message); }
  },

  // ── Bulk edit ──────────────────────────────────────────────────────────────
  openBulkEdit() {
    const checked = [...(document.querySelectorAll('.eq-row-chk:checked')||[])].map(c => c.dataset.id);
    if (!checked.length) { notify.warn('Select rows to bulk edit first.'); return; }
    openModal('Bulk Edit — ' + checked.length + ' rows', `
      <div class="form-group">
        <label>Service Area</label>
        <select id="bulk-area" class="input">
          <option value="">— No change —</option>
          ${CONFIG.SERVICE_AREAS.map(a=>`<option value="${a.value}">${a.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="bulk-status" class="input">
          <option value="">— No change —</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Override Quarterly Hrs</label>
          <input id="bulk-qhrs" type="number" step="0.25" class="input" placeholder="No change">
        </div>
        <div class="form-group">
          <label>Annual Cleaning</label>
          <select id="bulk-acleaning" class="input">
            <option value="">— No change —</option>
            <option value="1">Enable</option>
            <option value="0">Disable</option>
          </select>
        </div>
      </div>`,
      [
        { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
        { label: `Apply to ${checked.length} rows`, class: 'btn-primary', onClick: () => this._applyBulk(checked) },
      ]
    );
  },

  async _applyBulk(ids) {
    const area     = $id('bulk-area')?.value;
    const status   = $id('bulk-status')?.value;
    const qhrs     = $id('bulk-qhrs')?.value;
    const acleaning= $id('bulk-acleaning')?.value;
    closeModal();
    const patch = {};
    if (area)      patch.service_area = area;
    if (status)    patch.status = status;
    if (qhrs !== '') patch.override_quarterly_hours = qhrs === '' ? null : parseFloat(qhrs);
    if (acleaning !== '') patch.annual_cleaning_enabled = acleaning === '1';
    if (!Object.keys(patch).length) return;
    let ok = 0;
    for (const id of ids) {
      try { await DB.update(id, patch); ok++; } catch {}
    }
    notify.success(`Updated ${ok} row(s).`);
    await this.loadTable();
  },

  // ── Consumables modal ──────────────────────────────────────────────────────
  async openConsumables(id) {
    const row = this._rows?.find(r => r.id === id);
    if (!row) return;
    const items = parseConsumables(row.consumables);

    const render = () => {
      const body = $id('cons-body');
      if (!body) return;
      body.innerHTML = items.length ? items.map((c, i) => `
        <div style="display:grid;grid-template-columns:1fr 60px 80px 80px 100px 40px;gap:6px;align-items:center;margin-bottom:6px">
          <input class="input input-sm" placeholder="Label (e.g. 24x24x2 Filter)" data-ci="${i}" data-cf="label" value="${c.label||''}">
          <input class="input input-sm" type="number" placeholder="Qty" data-ci="${i}" data-cf="qty" value="${c.qty||''}">
          <input class="input input-sm" placeholder="Unit" data-ci="${i}" data-cf="unit" value="${c.unit||''}">
          <input class="input input-sm" type="number" placeholder="Unit$" data-ci="${i}" data-cf="unit_cost" value="${c.unit_cost||''}">
          <select class="input input-sm" data-ci="${i}" data-cf="visibility">
            <option value="internal" ${c.visibility!=='client'?'selected':''}>Internal only</option>
            <option value="client"   ${c.visibility==='client'?'selected':''}>Show client</option>
          </select>
          <button class="btn btn-xs btn-danger" data-crm="${i}">✕</button>
        </div>`).join('') : `<p class="muted" style="font-size:12px">No consumables. Click + Add.</p>`;

      body.querySelectorAll('[data-ci]').forEach(inp => {
        inp.oninput = e => {
          const i = parseInt(e.target.dataset.ci);
          items[i][e.target.dataset.cf] = e.target.value;
        };
        inp.onchange = e => {
          const i = parseInt(e.target.dataset.ci);
          items[i][e.target.dataset.cf] = e.target.value;
        };
      });
      body.querySelectorAll('[data-crm]').forEach(btn => {
        btn.onclick = () => { items.splice(parseInt(btn.dataset.crm), 1); render(); };
      });
    };

    openModal(`Consumables — ${row.tag || row.equipment_type}`, `
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">
        Internal tracking only. Consumables are hidden from client-facing outputs by default.
      </div>
      <div id="cons-body"></div>
      <button class="btn btn-sm btn-secondary" id="cons-add-btn" style="margin-top:10px">+ Add Item</button>`,
      [
        { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
        { label: 'Save', class: 'btn-primary', onClick: async () => {
          try {
            await DB.update(id, { consumables: JSON.stringify(items) });
            const r = this._rows?.find(r => r.id === id);
            if (r) r.consumables = items;
            closeModal();
            notify.success('Consumables saved.');
          } catch(err) { notify.error(err.message); }
        }},
      ]
    );

    render();
    $id('cons-add-btn').onclick = () => {
      items.push({ label: '', qty: 1, unit: 'ea', unit_cost: '', visibility: 'internal', notes: '' });
      render();
    };
  },

  // ── Add / Edit form ────────────────────────────────────────────────────────
  async openForm(id = null, buildingId = '') {
    let buildings = [];
    try { buildings = await Buildings.getAll(); } catch {}
    let e = null;
    if (id) { try { e = await DB.getById(id); } catch {} }

    const bid   = e?.building_id || buildingId || '';
    const std   = e ? findEquipType(e.equipment_type) : null;
    const qStd  = std?.quarterly_hours ?? '';
    const aStd  = std?.annual_hours    ?? '';

    openModal({ title: id ? 'Edit Equipment' : 'Add Equipment', size: 'lg', body: `
      <form id="eq-form">
        <div class="form-row">
          <div class="form-group">
            <label>Building *</label>
            <select name="building_id">
              <option value="">— Select —</option>
              ${buildings.map(b=>`<option value="${b.id}" ${b.id===bid?'selected':''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Service Area</label>
            <select name="service_area">
              ${CONFIG.SERVICE_AREAS.map(a=>`<option value="${a.value}" ${a.value===(e?.service_area||'common_strata')?'selected':''}>${a.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tag</label>
            <input name="tag" class="input" value="${e?.tag||''}" placeholder="e.g. B-1">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Equipment Type *</label>
            <input name="equipment_type" id="eq-form-type" class="input" list="eq-form-dl" value="${e?.equipment_type||''}" autocomplete="off">
            <datalist id="eq-form-dl">${EQUIPMASTER.map(x=>`<option value="${x.equipment_type}">`).join('')}</datalist>
          </div>
          <div class="form-group">
            <label>Category</label>
            <input name="category" class="input" list="eq-form-cat" value="${e?.category||''}" autocomplete="off">
            <datalist id="eq-form-cat">${(EQUIPMASTER_CATEGORIES||[]).map(c=>`<option value="${c}">`).join('')}</datalist>
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:2px">
            <button type="button" class="btn btn-sm btn-secondary" id="eq-autofill">↺ Auto-fill from Library</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Manufacturer</label>
            <input name="manufacturer" class="input" list="eq-form-mfr" value="${e?.manufacturer||e?.make||''}" autocomplete="off">
            <datalist id="eq-form-mfr">${(EQUIPMASTER_MANUFACTURERS||[]).slice(0,200).map(m=>`<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="form-group">
            <label>Model</label>
            <input name="model" class="input" value="${e?.model||''}">
          </div>
          <div class="form-group">
            <label>Serial Number</label>
            <input name="serial_number" class="input" value="${e?.serial_number||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Quantity</label>
            <input name="qty" type="number" min="1" class="input" value="${e?.qty||1}">
          </div>
          <div class="form-group">
            <label>Location</label>
            <input name="location" class="input" value="${e?.location||''}">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="active"   ${(e?.status||'active')==='active'   ?'selected':''}>Active</option>
              <option value="inactive" ${e?.status==='inactive'?'selected':''}>Inactive</option>
            </select>
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:12px">
          <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:8px">
            Hours — Standard: Q:${qStd||'?'} A:${aStd||'?'} hrs
          </div>
          <div class="form-row" style="margin-bottom:0">
            <div class="form-group">
              <label>Override Quarterly Hrs/Visit</label>
              <input name="override_quarterly_hours" id="eq-form-qhrs" type="number" step="0.25" class="input" value="${e?.override_quarterly_hours??''}" placeholder="${qStd||'auto'}">
            </div>
            <div class="form-group">
              <label>Override Annual Hrs</label>
              <input name="override_annual_hours" id="eq-form-ahrs" type="number" step="0.25" class="input" value="${e?.override_annual_hours??''}" placeholder="${aStd||'auto'}">
            </div>
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" name="annual_cleaning_enabled" ${e?.annual_cleaning_enabled?'checked':''}>
                Annual Cleaning Visit
              </label>
              <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Adds ${aStd||'EQUIPMASTER'} hrs/yr to total</div>
            </div>
          </div>
          <button type="button" class="btn btn-xs btn-ghost" id="eq-reset-hrs">↺ Reset to Standard</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Capacity / Size</label>
            <input name="capacity" class="input" value="${e?.capacity||''}">
          </div>
          <div class="form-group">
            <label>Refrigerant</label>
            <input name="refrigerant" class="input" value="${e?.refrigerant||''}">
          </div>
          <div class="form-group">
            <label>Review Status</label>
            <select name="review_status">
              <option value="ok"           ${(e?.review_status||'ok')==='ok'?'selected':''}>OK</option>
              <option value="needs-review" ${e?.review_status==='needs-review'?'selected':''}>Needs Review</option>
            </select>
          </div>
        </div>
        ${e?.ocr_raw ? `<div class="form-group"><label style="color:var(--text-muted)">Original OCR/Import Text</label><div style="font-size:11.5px;font-family:var(--font-mono);color:var(--text-muted);background:var(--bg);padding:8px 10px;border-radius:var(--radius);border:1px solid var(--border)">${e.ocr_raw}</div></div>` : ''}
        <div class="form-group">
          <label>Notes</label>
          <textarea name="notes" rows="2" class="input">${e?.notes||''}</textarea>
        </div>
      </form>`,
      footer: `<button class="btn btn-secondary" id="eq-form-cancel">Cancel</button>
               <button class="btn btn-primary"   id="eq-form-save">${id?'Save Changes':'Add Equipment'}</button>`,
    });

    $id('eq-form-cancel').onclick = closeModal;
    $id('eq-form-save').onclick   = () => this.saveEquipment(id);

    $id('eq-autofill').onclick = () => {
      const type = $id('eq-form-type')?.value;
      const defs = getEquipDefaults(type);
      if (!defs) { notify.warn('No EQUIPMASTER match for this type.'); return; }
      const f = $id('eq-form');
      if (!f) return;
      if (f.elements.category && !f.elements.category.value) f.elements.category.value = defs.category || '';
      $id('eq-form-qhrs').placeholder = defs.quarterly_hours || 'auto';
      $id('eq-form-ahrs').placeholder = defs.annual_hours    || 'auto';
      notify.info('Library defaults applied as placeholders.');
    };

    $id('eq-reset-hrs').onclick = () => {
      $id('eq-form-qhrs').value = '';
      $id('eq-form-ahrs').value = '';
      notify.info('Hours reset — will use library standard on next save.');
    };
  },

  async saveEquipment(id) {
    const form = $id('eq-form');
    if (!form) return;
    const data = {};
    new FormData(form).forEach((v,k) => { data[k] = v; });

    if (!data.building_id) { notify.warn('Select a building.'); return; }
    if (!data.equipment_type) data.equipment_type = 'Other';

    data.qty = parseInt(data.qty) || 1;
    data.override_quarterly_hours = data.override_quarterly_hours !== '' ? parseFloat(data.override_quarterly_hours) : null;
    data.override_annual_hours    = data.override_annual_hours    !== '' ? parseFloat(data.override_annual_hours)    : null;
    data.annual_cleaning_enabled  = !!data.annual_cleaning_enabled;

    // Auto-fill standard hours from EQUIPMASTER if not overridden
    if (!data.override_quarterly_hours || !data.override_annual_hours) {
      const std = findEquipType(data.equipment_type);
      if (std) {
        if (!data.override_quarterly_hours && !data.quarterly_hours) data.quarterly_hours = std.quarterly_hours || null;
        if (!data.override_annual_hours    && !data.annual_hours)    data.annual_hours    = std.annual_hours    || null;
      }
    }

    try {
      if (id) await DB.update(id, data);
      else    await DB.create(data);
      closeModal();
      notify.success(id ? 'Equipment updated.' : 'Equipment added.');
      await this.loadTable();
    } catch(err) { notify.error(err.message); }
  },

  // ── Pre-fill from doc parser ───────────────────────────────────────────────
  openFormPrefill(prefill, buildings) {
    const mockEquip = {
      building_id: prefill.building_id || '',
      tag: prefill.tag || '',
      equipment_type: prefill.equipment_type || '',
      manufacturer: prefill.make || '',
      model: prefill.model || '',
      serial_number: prefill.serial_number || '',
      qty: prefill.quantity || 1,
      location: prefill.location || '',
      capacity: prefill.capacity || '',
      notes: [prefill.filter_size, prefill.voltage, prefill.refrigerant, prefill.notes].filter(Boolean).join(' | '),
      ocr_raw: prefill.notes || '',
      annual_cleaning_enabled: false,
      review_status: 'needs-review',
    };
    this.openForm(null, prefill.building_id || '');
    // Inject values after modal renders
    setTimeout(() => {
      const f = $id('eq-form');
      if (!f) return;
      Object.entries(mockEquip).forEach(([k,v]) => {
        if (f.elements[k]) f.elements[k].value = v ?? '';
      });
    }, 50);
  },

  // ── Detail view ────────────────────────────────────────────────────────────
  async detail(id, container) {
    container.innerHTML = spinner('Loading…');
    try {
      const e = await DB.getById(id);
      setPageTitle(e.tag || e.equipment_type);
      const annHrs = rowAnnualHrs(e);
      const sell   = rowSell(e);
      const cons   = parseConsumables(e.consumables);
      container.innerHTML = `<div class="page-wrap">
        <div class="toolbar">
          <button class="btn btn-secondary" onclick="history.back()">← Back</button>
          <div class="toolbar-right">
            <button class="btn btn-secondary" id="eq-det-cons">🧰 Consumables</button>
            <button class="btn btn-secondary" id="eq-det-edit">Edit</button>
            <button class="btn btn-danger"    id="eq-det-del">Delete</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3>${e.tag||''} ${e.equipment_type}</h3>
            ${statusBadge(e.status||'active')}
          </div>
          <div class="card-body detail-fields">
            ${df('Building',e.buildings?.name)} ${df('Service Area',sal(e.service_area))}
            ${df('Manufacturer',e.manufacturer||e.make)} ${df('Model',e.model)}
            ${df('Serial',e.serial_number)} ${df('Quantity',e.qty)}
            ${df('Location',e.location)} ${df('Capacity',e.capacity)}
            ${df('Refrigerant',e.refrigerant)} ${df('Category',e.category)}
          </div>
        </div>
        <div class="card" style="margin-top:14px">
          <div class="card-header"><h3>Hours & Pricing</h3></div>
          <div class="card-body">
            <div class="form-row" style="margin-bottom:0">
              ${df3('Std Qtr Hrs', findEquipType(e.equipment_type)?.quarterly_hours ?? '—')}
              ${df3('Override Qtr Hrs', e.override_quarterly_hours ?? '—')}
              ${df3('Std Annual Hrs', findEquipType(e.equipment_type)?.annual_hours ?? '—')}
              ${df3('Override Annual Hrs', e.override_annual_hours ?? '—')}
              ${df3('Annual Cleaning', e.annual_cleaning_enabled ? '✔ Enabled' : 'Disabled')}
              ${df3('Eff. Annual Hrs', annHrs > 0 ? annHrs.toFixed(2) + ' hrs' : '—')}
              ${df3('Est. Sell/yr', sell > 0 ? formatCurrency(sell) : '—')}
            </div>
          </div>
        </div>
        ${cons.length ? `<div class="card" style="margin-top:14px">
          <div class="card-header"><h3>Consumables (${cons.length}) — Internal</h3></div>
          <div class="card-body no-pad">
            <table class="table table-compact">
              <thead><tr><th>Label</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Visibility</th></tr></thead>
              <tbody>${cons.map(c=>`<tr>
                <td>${c.label||'—'}</td><td>${c.qty||'—'}</td><td>${c.unit||'—'}</td>
                <td>${c.unit_cost ? formatCurrency(c.unit_cost) : '—'}</td>
                <td><span style="font-size:11px;color:var(--text-muted)">${c.visibility||'internal'}</span></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>` : ''}
        ${e.notes ? `<div class="card" style="margin-top:14px"><div class="card-header"><h3>Notes</h3></div><div class="card-body" style="font-size:13px">${e.notes}</div></div>` : ''}
        ${e.ocr_raw ? `<div class="card" style="margin-top:14px"><div class="card-header"><h3>Original Import Text</h3></div><div class="card-body" style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim)">${e.ocr_raw}</div></div>` : ''}
      </div>`;
      $id('eq-det-edit').onclick = () => this.openForm(id, e.building_id);
      $id('eq-det-del').onclick  = () => this.deleteEquipment(id).then(() => history.back());
      $id('eq-det-cons').onclick = () => this.openConsumables(id);
    } catch(err) {
      container.innerHTML = `<div class="page-wrap error-state">${err.message}</div>`;
    }
  },

  async deleteEquipment(id) {
    if (!await confirm('Delete this equipment record?')) return;
    try { await DB.delete(id); notify.success('Deleted.'); await this.loadTable(); }
    catch(err) { notify.error(err.message); }
  },

  async exportData() {
    const rows = this._buildingId ? await DB.getByBuilding(this._buildingId) : await DB.getAll();
    exportCSV((rows||[]).map(e => ({
      Tag: e.tag, Type: e.equipment_type, Area: sal(e.service_area),
      Qty: e.qty, Manufacturer: e.manufacturer||e.make, Model: e.model,
      Location: e.location, Building: e.buildings?.name,
      StdQtrHrs: findEquipType(e.equipment_type)?.quarterly_hours,
      OverrideQtrHrs: e.override_quarterly_hours,
      AnnualCleaning: e.annual_cleaning_enabled ? 'Y' : 'N',
      AnnualHrs: rowAnnualHrs(e).toFixed(2),
      EstSell: rowSell(e).toFixed(2),
      ReviewStatus: e.review_status, Status: e.status,
    })), 'equipment-registry.csv');
  },
};

function df(label, val) {
  if (val===null||val===undefined||val==='') return '';
  return `<div class="detail-field"><span class="detail-label">${label}</span><span class="detail-value">${val}</span></div>`;
}
function df3(label, val) {
  return `<div class="detail-field"><span class="detail-label">${label}</span><span class="detail-value">${val}</span></div>`;
}
