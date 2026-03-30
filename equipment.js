// equipment.js — Equipment management with service area, hours, building context
import { setPageTitle }   from './app.js';
import { Equipment as DB, Buildings } from './db.js';
import { CONFIG }         from './config.js';
import { formatDate, statusBadge, exportCSV, today, addMonths, isOverdue, isDueSoon } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState, getFormData, selectOptions } from './ui.js';
import { navigate }       from './router.js';
import { getStdHours, findEquipType } from './equipmaster.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SERVICE_AREA_LABELS = {
  common_strata:        'Common Strata',
  commercial:           'Commercial',
  residential_in_suite: 'Residential / In-Suite',
};

function saLabel(val) { return SERVICE_AREA_LABELS[val] || val || '—'; }

function combo(name, options, selectedVal = '', placeholder = '— Select or type —') {
  // Renders a datalist-backed input for select-or-type behavior
  const id = 'dl-' + name + '-' + Math.random().toString(36).slice(2,6);
  return `<input name="${name}" class="input" list="${id}" value="${selectedVal || ''}" placeholder="${placeholder}" autocomplete="off">
    <datalist id="${id}">${options.map(o => `<option value="${o}">`).join('')}</datalist>`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export const Equipment = {

  async init(container) {
    const qs = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const buildingId = qs.get('building') || '';
    this._buildingId = buildingId;
    this._building   = null;

    if (buildingId) {
      try {
        const buildings = await Buildings.getAll();
        this._building = buildings.find(b => b.id === buildingId) || null;
      } catch {}
    }

    const bldTitle = this._building ? ` — ${this._building.name}` : '';
    setPageTitle('Equipment' + bldTitle);

    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        ${buildingId ? `<button class="btn btn-secondary btn-sm" onclick="navigate('/buildings/${buildingId}')">← ${this._building?.name || 'Building'}</button>` : ''}
        <input type="search" id="eq-search" class="input" placeholder="Search…" style="max-width:200px">
        <select id="eq-filter-area" class="input" style="max-width:180px">
          <option value="">All Areas</option>
          ${CONFIG.SERVICE_AREAS.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
        </select>
        <select id="eq-filter-cat" class="input" style="max-width:160px">
          <option value="">All Categories</option>
          ${CONFIG.EQUIPMENT_CATEGORIES.map(c => `<option>${c}</option>`).join('')}
        </select>
        <div class="toolbar-right">
          <button class="btn btn-secondary" id="eq-export">Export CSV</button>
          <button class="btn btn-primary"   id="eq-add">+ Add Equipment</button>
        </div>
      </div>
      <div class="card"><div id="eq-table-wrap">${spinner()}</div></div>
    </div>`;

    await this.loadTable();

    document.getElementById('eq-add').onclick        = () => this.openForm(null, buildingId);
    document.getElementById('eq-search').oninput     = () => this._filter();
    document.getElementById('eq-filter-area').onchange = () => this._filter();
    document.getElementById('eq-filter-cat').onchange  = () => this._filter();
    document.getElementById('eq-export').onclick     = () => this.exportData();
  },

  _filter() {
    const q    = document.getElementById('eq-search')?.value.toLowerCase() || '';
    const area = document.getElementById('eq-filter-area')?.value || '';
    const cat  = document.getElementById('eq-filter-cat')?.value || '';
    const tbl  = document.querySelector('#eq-table-wrap table');
    if (!tbl) return;
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const txt = tr.textContent.toLowerCase();
      let show = txt.includes(q);
      if (area && tr.dataset.area !== area) show = false;
      if (cat  && tr.dataset.cat  !== cat)  show = false;
      tr.hidden = !show;
    });
  },

  async loadTable() {
    const wrap = document.getElementById('eq-table-wrap');
    if (!wrap) return;
    try {
      const rows = this._buildingId
        ? ((await DB.getByBuilding(this._buildingId)) || [])
        : ((await DB.getAll()) || []);

      if (!rows.length) {
        wrap.innerHTML = emptyState('No equipment yet. Click + Add Equipment to start.');
        return;
      }

      wrap.innerHTML = `<div class="table-scroll"><table class="table" id="eq-table">
        <thead><tr>
          <th>Service Area</th><th>Tag</th><th>Type</th><th>Category</th>
          <th>Qty</th><th>Location</th><th>Qtly Hrs</th><th>Ann Hrs</th>
          ${this._buildingId ? '' : '<th>Building</th>'}
          <th>Status</th><th></th>
        </tr></thead>
        <tbody>${rows.map(e => `<tr data-area="${e.service_area||''}" data-cat="${e.category||''}">
          <td><span class="badge badge-muted">${saLabel(e.service_area)}</span></td>
          <td><strong>${e.tag||'—'}</strong></td>
          <td>${e.equipment_type||'—'}</td>
          <td>${e.category||'—'}</td>
          <td>${e.qty||1}</td>
          <td>${e.location||'—'}</td>
          <td>${e.override_quarterly_hours ?? e.quarterly_hours ?? '—'}</td>
          <td>${e.override_annual_hours    ?? e.annual_hours    ?? '—'}</td>
          ${this._buildingId ? '' : `<td>${e.buildings?.name||'—'}</td>`}
          <td>${statusBadge(e.status||'active')}</td>
          <td class="actions">
            <button class="btn btn-xs btn-secondary" data-edit="${e.id}">Edit</button>
            <button class="btn btn-xs btn-danger"    data-del="${e.id}">Del</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`;

      makeSortable(document.getElementById('eq-table'));
      wrap.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.openForm(b.dataset.edit, this._buildingId));
      wrap.querySelectorAll('[data-del]').forEach(b  => b.onclick = () => this.deleteEquipment(b.dataset.del));
    } catch (err) {
      wrap.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading…');
    try {
      const e = await DB.getById(id);
      setPageTitle(e.tag || e.equipment_type, [
        { label: 'Equipment', href: '#/equipment' },
        { label: e.buildings?.name || '', href: `#/buildings/${e.building_id}` },
        { label: e.tag || e.equipment_type },
      ]);
      container.innerHTML = `<div class="page-wrap">
        <div class="toolbar">
          <button class="btn btn-secondary" onclick="history.back()">← Back</button>
          <div class="toolbar-right">
            <button class="btn btn-secondary" id="eq-edit-btn">Edit</button>
            <button class="btn btn-danger"    id="eq-del-btn">Delete</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>${e.tag||''} ${e.equipment_type}</h3>
            <span class="badge badge-muted">${saLabel(e.service_area)}</span>
          </div>
          <div class="card-body detail-fields" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem">
            ${df('Tag', e.tag)} ${df('Equipment Type', e.equipment_type)} ${df('Class', e.equipment_class)}
            ${df('Category', e.category)} ${df('Service Area', saLabel(e.service_area))} ${df('Qty', e.qty)}
            ${df('Manufacturer', e.manufacturer)} ${df('Model', e.model)} ${df('Serial', e.serial_number)}
            ${df('Location', e.location)} ${df('Description', e.description)} ${df('Status', e.status)}
            ${df('Quarterly Hrs', e.override_quarterly_hours ?? e.quarterly_hours)}
            ${df('Annual Hrs',    e.override_annual_hours    ?? e.annual_hours)}
            ${df('Match Confidence', e.match_confidence)}
            ${df('Notes', e.notes)}
          </div>
        </div>
      </div>`;
      document.getElementById('eq-edit-btn').onclick = () => this.openForm(id, e.building_id);
      document.getElementById('eq-del-btn').onclick  = () => this.deleteEquipment(id).then(() => history.back());
    } catch (err) {
      container.innerHTML = `<div class="page-wrap error-state">${err.message}</div>`;
    }
  },

  async openForm(id = null, buildingId = '') {
    let buildings = [];
    try { buildings = await Buildings.getAll(); } catch {}

    let existing = null;
    if (id) { try { existing = await DB.getById(id); } catch {} }

    const bid   = existing?.building_id || buildingId || '';
    const sArea = existing?.service_area || 'common_strata';
    const eType = existing?.equipment_type || '';
    const eCls  = existing?.equipment_class || '';
    const eCat  = existing?.category || '';
    const qHrs  = existing?.override_quarterly_hours ?? existing?.quarterly_hours ?? '';
    const aHrs  = existing?.override_annual_hours    ?? existing?.annual_hours    ?? '';

    openModal(id ? 'Edit Equipment' : 'Add Equipment', `
      <form id="eq-form" class="form-grid">
        <div class="form-row">
          <div class="form-group">
            <label>Building *</label>
            <select name="building_id" required>
              <option value="">— Select —</option>
              ${buildings.map(b => `<option value="${b.id}" ${b.id===bid?'selected':''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Service Area *</label>
            <select name="service_area">
              ${CONFIG.SERVICE_AREAS.map(a => `<option value="${a.value}" ${a.value===sArea?'selected':''}>${a.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Tag</label>
            <input name="tag" class="input" placeholder="e.g. B-1, P-3" value="${existing?.tag||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Equipment Type *</label>
            ${combo('equipment_type', CONFIG.EQUIPMENT_TYPES, eType, 'Select or type type…')}
          </div>
          <div class="form-group">
            <label>Equipment Class</label>
            ${combo('equipment_class', CONFIG.EQUIPMENT_CLASSES, eCls, 'Select or type class…')}
          </div>
          <div class="form-group">
            <label>Category</label>
            ${combo('category', CONFIG.EQUIPMENT_CATEGORIES, eCat, 'Select or type category…')}
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Manufacturer</label>
            <input name="manufacturer" class="input" value="${existing?.manufacturer||''}">
          </div>
          <div class="form-group">
            <label>Model</label>
            <input name="model" class="input" value="${existing?.model||''}">
          </div>
          <div class="form-group">
            <label>Serial Number</label>
            <input name="serial_number" class="input" value="${existing?.serial_number||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Quantity</label>
            <input name="qty" type="number" min="1" value="${existing?.qty||1}" class="input">
          </div>
          <div class="form-group">
            <label>Location</label>
            <input name="location" class="input" placeholder="e.g. Penthouse MER" value="${existing?.location||''}">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="active"   ${(existing?.status||'active')==='active'?'selected':''}>Active</option>
              <option value="inactive" ${existing?.status==='inactive'?'selected':''}>Inactive</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Quarterly Hours <span class="text-muted">(per visit)</span></label>
            <input name="override_quarterly_hours" id="eq-qhrs" type="number" step="0.25" class="input" value="${qHrs}" placeholder="auto from library">
          </div>
          <div class="form-group">
            <label>Annual Hours <span class="text-muted">(per visit)</span></label>
            <input name="override_annual_hours" id="eq-ahrs" type="number" step="0.25" class="input" value="${aHrs}" placeholder="auto from library">
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:2px">
            <button type="button" class="btn btn-secondary btn-sm" id="eq-autofill-btn">↺ Auto-fill from Library</button>
          </div>
        </div>
        <div class="form-group full-width">
          <label>Description / Notes</label>
          <textarea name="notes" rows="2" class="input">${existing?.notes||''}</textarea>
        </div>
      </form>
    `, [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: id ? 'Save Changes' : 'Add Equipment', class: 'btn-primary', onClick: () => this.saveEquipment(id) },
    ]);

    // Auto-fill hours from EQUIPMASTER when type/class changes
    const fillHours = () => {
      const typeVal = document.querySelector('[name="equipment_type"]')?.value;
      const clsVal  = document.querySelector('[name="equipment_class"]')?.value;
      const match   = findEquipType(clsVal || typeVal);
      if (match) {
        const qEl = document.getElementById('eq-qhrs');
        const aEl = document.getElementById('eq-ahrs');
        if (qEl && !qEl.value) qEl.value = match.quarterly_std_hours || '';
        if (aEl && !aEl.value) aEl.value = match.annual_std_hours    || '';
      }
    };

    document.getElementById('eq-autofill-btn').onclick = () => {
      const typeVal = document.querySelector('[name="equipment_type"]')?.value;
      const clsVal  = document.querySelector('[name="equipment_class"]')?.value;
      const match   = findEquipType(clsVal || typeVal);
      if (match) {
        document.getElementById('eq-qhrs').value = match.quarterly_std_hours || '';
        document.getElementById('eq-ahrs').value = match.annual_std_hours    || '';
        notify.info(`Hours loaded: ${match.equipment_type}`);
      } else {
        notify.warn('No library match found for this equipment type.');
      }
    };

    document.querySelector('[name="equipment_class"]')?.addEventListener('change', fillHours);
    document.querySelector('[name="equipment_type"]')?.addEventListener('change', fillHours);
  },

  async saveEquipment(id) {
    const form = document.getElementById('eq-form');
    if (!form) return;

    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });

    // Coerce numerics
    data.qty                     = parseInt(data.qty)     || 1;
    data.override_quarterly_hours = data.override_quarterly_hours !== '' ? parseFloat(data.override_quarterly_hours) : null;
    data.override_annual_hours    = data.override_annual_hours    !== '' ? parseFloat(data.override_annual_hours)    : null;

    // Also store non-override hours for display
    if (data.override_quarterly_hours) data.quarterly_hours = data.override_quarterly_hours;
    if (data.override_annual_hours)    data.annual_hours    = data.override_annual_hours;

    // Trim tag
    if (data.tag) data.tag = data.tag.trim();

    if (!data.building_id) { notify.warn('Select a building.'); return; }
    if (!data.equipment_type) { notify.warn('Equipment type is required.'); return; }

    try {
      if (id) await DB.update(id, data);
      else    await DB.create(data);
      closeModal();
      notify.success(id ? 'Equipment updated.' : 'Equipment added.');
      await this.loadTable();
    } catch (err) {
      notify.error(err.message);
    }
  },

  async deleteEquipment(id) {
    const ok = await confirm('Delete this equipment record?');
    if (!ok) return;
    try {
      await DB.delete(id);
      notify.success('Deleted.');
      await this.loadTable();
    } catch (err) {
      notify.error(err.message);
    }
  },

  async exportData() {
    const rows = this._buildingId
      ? ((await DB.getByBuilding(this._buildingId)) || [])
      : ((await DB.getAll()) || []);
    exportCSV(rows.map(e => ({
      Tag: e.tag, Type: e.equipment_type, Class: e.equipment_class,
      Category: e.category, 'Service Area': saLabel(e.service_area),
      Qty: e.qty, Manufacturer: e.manufacturer, Model: e.model,
      Location: e.location, Building: e.buildings?.name,
      'Qtr Hrs': e.override_quarterly_hours ?? e.quarterly_hours,
      'Ann Hrs': e.override_annual_hours    ?? e.annual_hours,
      Status: e.status,
    })), 'equipment.csv');
  },
};

function df(label, val) {
  if (val === null || val === undefined || val === '') return '';
  return `<div class="detail-field">
    <span class="detail-label">${label}</span>
    <span class="detail-value">${val}</span>
  </div>`;
}
