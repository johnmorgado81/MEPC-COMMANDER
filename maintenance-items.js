// maintenance-items.js — Equipment type library with standard PM hours
// Drives proposal time estimates. Sourced from EQUIPMASTER.xlsx (174 types).

import { MaintenanceItems } from '../db.js';
import { EQUIPMASTER }      from '../data/equipmaster.js';
import { CONFIG }           from '../config.js';
import { notify, openModal, closeModal } from './ui.js';
import { formatCurrency }   from '../helpers.js';

export const MaintItems = {
  async init(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Maintenance Items Library</h1>
          <p class="page-sub">Equipment types with standard PM hours. Used to calculate proposal pricing.</p>
        </div>
        <div class="page-actions">
          <input type="search" id="mi-search" placeholder="Filter by type or category…" style="width:220px">
          <select id="mi-cat-filter"><option value="">All Categories</option></select>
          <button class="btn btn-secondary" id="mi-seed-btn">↻ Seed from EQUIPMASTER</button>
          <button class="btn btn-primary" id="mi-add-btn">+ Add Item</button>
        </div>
      </div>
      <div class="table-wrap" id="mi-table-wrap">
        <div class="spinner">Loading…</div>
      </div>
    `;

    this._data = [];
    await this._load();
    this._bindEvents(container);
  },

  async _load() {
    try {
      this._data = await MaintenanceItems.getAll();
      this._renderTable(this._data);
      this._populateCatFilter();
    } catch (e) {
      document.getElementById('mi-table-wrap').innerHTML =
        `<div class="error-msg">Failed to load: ${e.message}<br><br>
         If this is your first time, click <strong>Seed from EQUIPMASTER</strong> above.</div>`;
    }
  },

  _populateCatFilter() {
    const sel = document.getElementById('mi-cat-filter');
    if (!sel) return;
    const cats = [...new Set(this._data.map(d => d.category).filter(Boolean))].sort();
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  },

  _renderTable(data) {
    const wrap = document.getElementById('mi-table-wrap');
    if (!wrap) return;
    if (data.length === 0) {
      wrap.innerHTML = `<div class="empty-state">
        <p>No items loaded.</p>
        <p>Click <strong>Seed from EQUIPMASTER</strong> to load the full library (174 types).</p>
      </div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="table-scroll">
        <table class="data-table" id="mi-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Equipment Type</th>
              <th>Tag</th>
              <th class="text-right">Monthly hrs</th>
              <th class="text-right">Quarterly hrs</th>
              <th class="text-right">Semi-Ann hrs</th>
              <th class="text-right">Annual hrs</th>
              <th class="text-right">Qtly Sell</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => this._renderRow(item)).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-footer">${data.length} items</div>
    `;

    wrap.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this._openEditModal(btn.dataset.edit));
    });
  },

  _renderRow(item) {
    const qtlyHrs  = item.quarterly_std_hours ?? '—';
    const qSell    = item.quarterly_std_hours
      ? formatCurrency(this._calcSell(item.quarterly_std_hours))
      : '—';
    return `
      <tr>
        <td><span class="badge badge-muted">${item.category || '—'}</span></td>
        <td>${item.equipment_type}</td>
        <td class="text-muted">${item.tag_prefix || '—'}</td>
        <td class="text-right">${item.monthly_std_hours ?? '—'}</td>
        <td class="text-right">${qtlyHrs}</td>
        <td class="text-right">${item.semi_annual_std_hours ?? '—'}</td>
        <td class="text-right">${item.annual_std_hours ?? '—'}</td>
        <td class="text-right text-success">${qSell}</td>
        <td class="action-cell">
          <button class="btn btn-sm btn-secondary" data-edit="${item.id}">Edit</button>
        </td>
      </tr>`;
  },

  _calcSell(hours) {
    const labourCost   = hours * CONFIG.LABOUR_RATES.pm_hourly;
    const withOverhead = labourCost * (1 + CONFIG.PM_OVERHEAD_PCT);
    return withOverhead / (1 - CONFIG.PM_MARGIN_PCT);
  },

  _bindEvents(container) {
    container.getElementById?.('mi-seed-btn') ||
    document.getElementById('mi-seed-btn')?.addEventListener('click', () => this._seed());

    document.getElementById('mi-add-btn')?.addEventListener('click', () => this._openEditModal(null));

    document.getElementById('mi-search')?.addEventListener('input', e => this._filter());
    document.getElementById('mi-cat-filter')?.addEventListener('change', () => this._filter());
  },

  _filter() {
    const q   = (document.getElementById('mi-search')?.value || '').toLowerCase();
    const cat = document.getElementById('mi-cat-filter')?.value || '';
    const filtered = this._data.filter(d => {
      const matchQ   = !q   || d.equipment_type.toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q);
      const matchCat = !cat || d.category === cat;
      return matchQ && matchCat;
    });
    this._renderTable(filtered);
    // Rebind after re-render
    document.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this._openEditModal(btn.dataset.edit));
    });
  },

  async _seed() {
    const btn = document.getElementById('mi-seed-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Seeding…'; }

    try {
      const rows = EQUIPMASTER.map(e => ({
        equipment_type:        e.equipment_type,
        category:              e.category,
        tag_prefix:            e.tag_prefix || null,
        manufacturers:         e.manufacturers || null,
        monthly_std_hours:     e.monthly_std_hours    ?? null,
        quarterly_std_hours:   e.quarterly_std_hours  ?? null,
        semi_annual_std_hours: e.semi_annual_std_hours ?? null,
        annual_std_hours:      e.annual_std_hours      ?? null,
        belt_size:             e.belt_size     || null,
        filter_size:           e.filter_size   || null,
        filter_type:           e.filter_type   || null,
        lubricant_type:        e.lubricant_type || null,
        electrical_data:       e.electrical_data || null,
        description:           e.description   || null,
        active: true,
      }));

      // Batch in chunks of 50 to avoid payload limits
      const CHUNK = 50;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await MaintenanceItems.upsertMany(rows.slice(i, i + CHUNK));
      }
      notify(`Seeded ${rows.length} equipment types from EQUIPMASTER`, 'success');
      await this._load();
    } catch (e) {
      notify('Seed failed: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '↻ Seed from EQUIPMASTER'; }
    }
  },

  async _openEditModal(id) {
    const item = id ? this._data.find(d => d.id === id) : null;
    const title = item ? 'Edit Maintenance Item' : 'Add Maintenance Item';

    openModal(title, `
      <form id="mi-form">
        <div class="form-row">
          <div class="form-group">
            <label>Equipment Type *</label>
            <input name="equipment_type" required value="${item?.equipment_type || ''}">
          </div>
          <div class="form-group">
            <label>Category</label>
            <select name="category">
              <option value="">— Select —</option>
              ${CONFIG.EQUIPMENT_CATEGORIES.map(c =>
                `<option ${item?.category === c ? 'selected' : ''}>${c}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>Tag Prefix</label>
            <input name="tag_prefix" value="${item?.tag_prefix || ''}">
          </div>
          <div class="form-group">
            <label>Lubricant Type</label>
            <input name="lubricant_type" value="${item?.lubricant_type || ''}">
          </div>
          <div class="form-group">
            <label>Filter Type</label>
            <input name="filter_type" value="${item?.filter_type || ''}">
          </div>
        </div>
        <div class="form-section-title">Standard Hours Per Visit</div>
        <div class="form-row">
          <div class="form-group">
            <label>Monthly (hrs)</label>
            <input type="number" step="0.01" name="monthly_std_hours" value="${item?.monthly_std_hours ?? ''}">
          </div>
          <div class="form-group">
            <label>Quarterly (hrs)</label>
            <input type="number" step="0.01" name="quarterly_std_hours" value="${item?.quarterly_std_hours ?? ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Semi-Annual (hrs)</label>
            <input type="number" step="0.01" name="semi_annual_std_hours" value="${item?.semi_annual_std_hours ?? ''}">
          </div>
          <div class="form-group">
            <label>Annual (hrs)</label>
            <input type="number" step="0.01" name="annual_std_hours" value="${item?.annual_std_hours ?? ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Manufacturers</label>
          <input name="manufacturers" value="${item?.manufacturers || ''}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="3">${item?.description || ''}</textarea>
        </div>
      </form>
    `, [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: item ? 'Save Changes' : 'Add Item', class: 'btn-primary', onClick: async () => {
        const form = document.getElementById('mi-form');
        const fd   = new FormData(form);
        const rec  = {};
        for (const [k, v] of fd.entries()) {
          rec[k] = ['monthly_std_hours','quarterly_std_hours','semi_annual_std_hours','annual_std_hours']
            .includes(k) ? (v === '' ? null : parseFloat(v)) : (v || null);
        }
        try {
          if (item) {
            await MaintenanceItems.update(item.id, rec);
          } else {
            await MaintenanceItems.upsertMany([rec]);
          }
          notify('Saved', 'success');
          closeModal();
          await this._load();
        } catch (err) {
          notify('Save failed: ' + err.message, 'error');
        }
      }},
    ]);
  },
};
