// js/modules/equipment.js
import { setPageTitle }   from '../app.js';
import { Equipment as DB, Buildings } from '../db.js';
import { CONFIG }         from '../config.js';
import { formatDate, statusBadge, exportCSV, today, addMonths, isOverdue, isDueSoon } from '../utils/helpers.js';
import { openModal, closeModal, confirm, notify, filterTable, makeSortable, getFormData, selectOptions, spinner, emptyState } from '../components/ui.js';
import { navigate }       from '../router.js';

export const Equipment = {

  async init(container) {
    setPageTitle('Equipment');
    // Check for pre-filter by building
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const buildingFilter = params.get('building') || '';

    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <input type="search" id="eq-search" class="input" placeholder="Search equipment…" style="max-width:220px">
        <select id="eq-filter-type" class="input" style="max-width:200px">
          <option value="">All Types</option>
          ${CONFIG.EQUIPMENT_TYPES.map(t => `<option>${t}</option>`).join('')}
        </select>
        <select id="eq-filter-status" class="input" style="max-width:160px">
          <option value="">All Status</option>
          <option value="overdue">Overdue</option>
          <option value="duesoon">Due in 30 days</option>
        </select>
        <div class="toolbar-right">
          <button class="btn btn-secondary" id="eq-export">Export CSV</button>
          <button class="btn btn-primary" id="eq-add">+ Add Equipment</button>
        </div>
      </div>
      <div class="card">
        <div id="eq-table-wrap">${spinner()}</div>
      </div>
    </div>`;

    this._buildingFilter = buildingFilter;
    await this.loadTable();

    document.getElementById('eq-add').onclick = () => this.openForm(null, buildingFilter);
    document.getElementById('eq-search').oninput = () => this.applyFilters();
    document.getElementById('eq-filter-type').onchange = () => this.applyFilters();
    document.getElementById('eq-filter-status').onchange = () => this.applyFilters();
    document.getElementById('eq-export').onclick = () => this.exportData();
  },

  applyFilters() {
    const q      = document.getElementById('eq-search')?.value.toLowerCase() || '';
    const type   = document.getElementById('eq-filter-type')?.value || '';
    const status = document.getElementById('eq-filter-status')?.value || '';
    const tbl = document.querySelector('#eq-table-wrap table');
    if (!tbl) return;
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const text = tr.textContent.toLowerCase();
      const rowType = tr.dataset.type || '';
      const rowDue  = tr.dataset.due || '';
      let show = text.includes(q);
      if (type && rowType !== type) show = false;
      if (status === 'overdue' && rowDue !== 'overdue') show = false;
      if (status === 'duesoon' && rowDue !== 'duesoon') show = false;
      tr.hidden = !show;
    });
  },

  async loadTable() {
    const wrap = document.getElementById('eq-table-wrap');
    try {
      const rows = await DB.getAll();
      if (!rows.length) { wrap.innerHTML = emptyState('No equipment records yet.'); return; }
      wrap.innerHTML = `<table class="table" id="eq-table">
        <thead><tr>
          <th>Tag</th><th>Type</th><th>Make / Model</th>
          <th>Building</th><th>Location</th>
          <th>Next Service</th><th>Condition</th><th></th>
        </tr></thead>
        <tbody>${rows.map(e => {
          const due = isOverdue(e.next_service_date) ? 'overdue' : isDueSoon(e.next_service_date, 30) ? 'duesoon' : '';
          return `<tr data-type="${e.equipment_type}" data-due="${due}">
            <td><a href="#/equipment/${e.id}" class="link-strong">${e.tag || '—'}</a></td>
            <td>${e.equipment_type}</td>
            <td>${[e.make, e.model].filter(Boolean).join(' ') || '—'}</td>
            <td>${e.buildings?.name || '—'}</td>
            <td>${e.location || '—'}</td>
            <td class="${due === 'overdue' ? 'text-danger fw-bold' : due === 'duesoon' ? 'text-warning' : ''}">
              ${formatDate(e.next_service_date)}
              ${due === 'overdue' ? ' ⚠' : ''}
            </td>
            <td>${statusBadge(e.condition)}</td>
            <td class="actions">
              <a href="#/equipment/${e.id}" class="btn btn-xs btn-secondary">View</a>
              <button class="btn btn-xs btn-secondary" data-edit="${e.id}">Edit</button>
              <button class="btn btn-xs btn-danger" data-delete="${e.id}">Delete</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
      makeSortable(document.getElementById('eq-table'));
      wrap.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => this.openForm(btn.dataset.edit));
      wrap.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = () => this.deleteEquipment(btn.dataset.delete));
    } catch (e) {
      wrap.innerHTML = `<div class="error-state">${e.message}</div>`;
    }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading equipment...');
    try {
      const e = await DB.getById(id);
      setPageTitle(`${e.tag || e.equipment_type}`, [
        { label: 'Equipment', href: '#/equipment' },
        { label: e.buildings?.name || '', href: `#/buildings/${e.building_id}` },
        { label: e.tag || e.equipment_type },
      ]);
      container.innerHTML = `<div class="page-wrap">
        <div class="detail-grid">
          <div class="card detail-info">
            <div class="card-header"><h3>Equipment Details</h3>
              <button class="btn btn-sm btn-secondary" id="eq-edit-btn">Edit</button>
            </div>
            <div class="card-body detail-fields">
              ${df('Tag',             e.tag)}
              ${df('Type',            e.equipment_type)}
              ${df('Make',            e.make)}
              ${df('Model',           e.model)}
              ${df('Serial Number',   e.serial_number)}
              ${df('Year Installed',  e.year_installed)}
              ${df('Location',        e.location)}
              ${df('Capacity',        e.capacity)}
              ${df('Fuel / Refrigerant', e.fuel_type || e.refrigerant)}
              ${df('Service Interval', e.service_interval_months ? e.service_interval_months + ' months' : null)}
              ${df('Last Service',    formatDate(e.last_service_date))}
              ${df('Next Service',    formatDate(e.next_service_date))}
              ${df('Warranty Expiry', formatDate(e.warranty_expiry))}
              ${df('Condition',       statusBadge(e.condition), true)}
              ${df('Under Contract',  e.under_contract ? 'Yes' : 'No')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Notes</h3></div>
            <div class="card-body"><p>${e.notes || '<span class="muted">No notes.</span>'}</p></div>
          </div>
        </div>
      </div>`;
      document.getElementById('eq-edit-btn').onclick = () => this.openForm(id);
    } catch (err) {
      container.innerHTML = `<div class="page-wrap error-state">${err.message}</div>`;
    }
  },

  async openForm(id = null, buildingId = '') {
    let buildings = [];
    try { buildings = await Buildings.getAll(); } catch {}

    openModal({
      title: id ? 'Edit Equipment' : 'Add Equipment',
      size: 'lg',
      body: `<form id="eq-form" class="form-grid">
        <div class="form-row">
          <div class="form-group">
            <label>Building *</label>
            <select name="building_id" class="input" required>
              <option value="">— Select —</option>
              ${buildings.map(b => `<option value="${b.id}" ${b.id === buildingId ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Equipment Tag</label>
            <input name="tag" class="input" placeholder="e.g. B-1, AHU-3">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group full-width">
            <label>Equipment Type *</label>
            <select name="equipment_type" class="input" required>
              <option value="">— Select —</option>
              ${CONFIG.EQUIPMENT_TYPES.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Make</label><input name="make" class="input"></div>
          <div class="form-group"><label>Model</label><input name="model" class="input"></div>
          <div class="form-group"><label>Serial Number</label><input name="serial_number" class="input"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Year Installed</label><input name="year_installed" type="number" class="input"></div>
          <div class="form-group"><label>Location</label><input name="location" class="input" placeholder="e.g. Penthouse MER"></div>
          <div class="form-group"><label>Capacity</label><input name="capacity" class="input" placeholder="e.g. 500 MBH"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fuel Type</label><input name="fuel_type" class="input" placeholder="Natural Gas / Electric"></div>
          <div class="form-group"><label>Refrigerant</label><input name="refrigerant" class="input" placeholder="e.g. R-410A"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Service Interval (months)</label>
            <input name="service_interval_months" type="number" class="input" value="12">
          </div>
          <div class="form-group"><label>Last Service Date</label><input name="last_service_date" type="date" class="input"></div>
          <div class="form-group"><label>Next Service Date</label><input name="next_service_date" type="date" class="input"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Condition</label>
            <select name="condition" class="input">
              ${selectOptions(CONFIG.CONDITION_OPTIONS, null, null, 'Good')}
            </select>
          </div>
          <div class="form-group"><label>Warranty Expiry</label><input name="warranty_expiry" type="date" class="input"></div>
          <div class="form-group">
            <label>Under Contract</label>
            <select name="under_contract" class="input">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
        <div class="form-group full-width">
          <label>Notes</label>
          <textarea name="notes" class="input" rows="3"></textarea>
        </div>
      </form>`,
      footer: `<button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="eq-save-btn">Save</button>`,
    });
    window.closeModal = closeModal;

    // Auto-calculate next service date when last service + interval changes
    const form = document.getElementById('eq-form');
    const calcNext = () => {
      const last = form.elements['last_service_date']?.value;
      const interval = parseInt(form.elements['service_interval_months']?.value) || 12;
      if (last) form.elements['next_service_date'].value = addMonths(last, interval);
    };
    form.elements['last_service_date'].onchange = calcNext;
    form.elements['service_interval_months'].onchange = calcNext;

    if (id) {
      const eq = await DB.getById(id);
      Object.entries(eq).forEach(([k, v]) => {
        if (form.elements[k]) form.elements[k].value = v ?? '';
      });
      if (eq.under_contract != null) form.elements['under_contract'].value = String(eq.under_contract);
    }

    document.getElementById('eq-save-btn').onclick = () => this.saveEquipment(id);
  },

  async saveEquipment(id) {
    const form = document.getElementById('eq-form');
    if (!form.reportValidity()) return;
    const data = getFormData(form);
    data.under_contract = data.under_contract === 'true';
    try {
      if (id) await DB.update(id, data);
      else await DB.create(data);
      closeModal();
      notify.success(id ? 'Equipment updated.' : 'Equipment added.');
      if (document.getElementById('eq-table-wrap')) await this.loadTable();
      else navigate('/equipment');
    } catch (e) {
      notify.error(e.message);
    }
  },

  async deleteEquipment(id) {
    const ok = await confirm('Delete this equipment record?');
    if (!ok) return;
    try {
      await DB.delete(id);
      notify.success('Equipment deleted.');
      await this.loadTable();
    } catch (e) {
      notify.error(e.message);
    }
  },

  async exportData() {
    const rows = await DB.getAll();
    exportCSV(rows.map(e => ({
      Tag: e.tag, Type: e.equipment_type, Make: e.make, Model: e.model,
      Serial: e.serial_number, Building: e.buildings?.name,
      'Last Service': e.last_service_date, 'Next Service': e.next_service_date,
      Condition: e.condition,
    })), 'equipment.csv');
  },
};

function df(label, val, html = false) {
  if (!val && val !== 0) return '';
  return `<div class="detail-field">
    <span class="detail-label">${label}</span>
    <span class="detail-value">${html ? val : val}</span>
  </div>`;
}
