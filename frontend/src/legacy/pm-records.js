// js/modules/pm-records.js
import { setPageTitle }    from './app.js';
import { PMRecords as DB, Buildings, Equipment, Proposals, Deficiencies } from './db.js';
import { formatDate, statusBadge, today, pad, addMonths } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState, getFormData } from './ui.js';
import { navigate }        from './router.js';

export const PMRecords = {

  async init(container) {
    setPageTitle('Service Records');
    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <div class="toolbar-right">
          <button class="btn btn-primary" id="pm-new-btn">+ New Service Record</button>
        </div>
      </div>
      <div class="card"><div id="pm-table-wrap">${spinner()}</div></div>
    </div>`;
    await this.loadTable();
    document.getElementById('pm-new-btn').onclick = () => navigate('/pm-records/new');
  },

  async loadTable() {
    const wrap = document.getElementById('pm-table-wrap');
    try {
      const rows = await DB.getAll();
      if (!rows.length) { wrap.innerHTML = emptyState('No service records yet.'); return; }
      wrap.innerHTML = `<table class="table" id="pm-table">
        <thead><tr>
          <th>#</th><th>Date</th><th>Building</th><th>Technician</th>
          <th>Type</th><th>Status</th><th>Deficiencies</th><th></th>
        </tr></thead>
        <tbody>${rows.map(r => {
          const defs = (r.deficiencies || []).length;
          return `<tr>
            <td><a href="#/pm-records/${r.id}" class="link-strong">${r.record_number || '—'}</a></td>
            <td>${formatDate(r.service_date)}</td>
            <td>${r.buildings?.name || '—'}</td>
            <td>${r.technician || '—'}</td>
            <td>${r.service_type || 'pm'}</td>
            <td>${statusBadge(r.status)}</td>
            <td>${defs > 0 ? `<span class="badge badge-warning">${defs} found</span>` : '—'}</td>
            <td class="actions">
              <a href="#/pm-records/${r.id}" class="btn btn-xs btn-secondary">View</a>
              <button class="btn btn-xs btn-danger" data-delete="${r.id}">Delete</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
      makeSortable(document.getElementById('pm-table'));
      wrap.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => this.deleteRecord(b.dataset.delete));
    } catch (e) {
      wrap.innerHTML = `<div class="error-state">${e.message}</div>`;
    }
  },

  async create(container) {
    setPageTitle('New Service Record', [{ label: 'Service Records', href: '#/pm-records' }, { label: 'New' }]);
    let buildings = [], proposals = [];
    try { [buildings, proposals] = await Promise.all([Buildings.getAll(), Proposals.getAll()]); } catch {}

    container.innerHTML = `<div class="page-wrap">
      <div class="card">
        <div class="card-header"><h3>Service Record</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Building *</label>
              <select id="pm-building" class="input">
                <option value="">— Select —</option>
                ${buildings.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Service Date *</label>
              <input type="date" id="pm-date" class="input" value="${today()}">
            </div>
            <div class="form-group">
              <label>Technician</label>
              <input id="pm-tech" class="input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Service Type</label>
              <select id="pm-type" class="input">
                <option value="pm">Preventive Maintenance</option>
                <option value="service-call">Service Call</option>
                <option value="inspection">Inspection</option>
                <option value="commissioning">Commissioning</option>
              </select>
            </div>
            <div class="form-group">
              <label>Associated Proposal</label>
              <select id="pm-proposal" class="input">
                <option value="">None</option>
                ${proposals.map(p => `<option value="${p.id}">${p.proposal_number} — ${p.buildings?.name || ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Total Hours</label>
              <input type="number" id="pm-hours" class="input" step="0.25" placeholder="0.00">
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:1rem" id="pm-equip-section">
        <div class="card-header">
          <h3>Equipment Serviced</h3>
          <button class="btn btn-sm btn-secondary" id="pm-add-equip">+ Add Equipment</button>
        </div>
        <div class="card-body" id="pm-equip-list">
          <p class="muted">Select a building first, then add equipment serviced.</p>
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header">
          <h3>Deficiencies Found</h3>
          <button class="btn btn-sm btn-secondary" id="pm-add-def">+ Add Deficiency</button>
        </div>
        <div class="card-body" id="pm-def-list">
          <p class="muted">No deficiencies recorded.</p>
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header">
          <h3>Parts & Materials Used</h3>
          <button class="btn btn-sm btn-secondary" id="pm-add-part">+ Add Part</button>
        </div>
        <div class="card-body" id="pm-parts-list">
          <p class="muted">No parts recorded.</p>
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header"><h3>General Notes</h3></div>
        <div class="card-body">
          <textarea id="pm-notes" class="input" rows="4" placeholder="General site notes, access issues, follow-up required…"></textarea>
        </div>
      </div>

      <div class="toolbar" style="margin-top:1rem">
        <button class="btn btn-secondary" onclick="history.back()">Cancel</button>
        <button class="btn btn-primary" id="pm-save-btn">Save Record</button>
      </div>
    </div>`;

    this._equipServiced = [];
    this._deficiencies  = [];
    this._parts         = [];
    this._equipCache    = [];

    document.getElementById('pm-building').onchange = (e) => this.loadBuildingEquipment(e.target.value);
    document.getElementById('pm-add-equip').onclick  = () => this.pickEquipment();
    document.getElementById('pm-add-def').onclick    = () => this.addDeficiency();
    document.getElementById('pm-add-part').onclick   = () => this.addPart();
    document.getElementById('pm-save-btn').onclick   = () => this.saveRecord();
  },

  async loadBuildingEquipment(bid) {
    if (!bid) return;
    try {
      this._equipCache = await Equipment.getByBuilding(bid);
    } catch {}
  },

  pickEquipment() {
    const cache = this._equipCache;
    if (!cache.length) { notify.warn('Select a building first — no equipment loaded.'); return; }
    openModal({
      title: 'Select Equipment Serviced',
      size: 'md',
      body: `<div style="max-height:340px;overflow-y:auto">
        ${cache.map(e => `<label class="check-row">
          <input type="checkbox" value="${e.id}" data-tag="${e.tag}" data-type="${e.equipment_type}">
          <span><strong>${e.tag || '—'}</strong> ${e.equipment_type} — ${e.location || ''}</span>
        </label>`).join('')}
      </div>`,
      footer: `<button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="equip-pick-ok">Add Selected</button>`,
    });
    window.closeModal = closeModal;
    document.getElementById('equip-pick-ok').onclick = () => {
      document.querySelectorAll('.check-row input:checked').forEach(chk => {
        if (!this._equipServiced.find(e => e.equipment_id === chk.value)) {
          this._equipServiced.push({ equipment_id: chk.value, tag: chk.dataset.tag, type: chk.dataset.type, work_performed: '', hours: 0 });
        }
      });
      closeModal();
      this.renderEquipList();
    };
  },

  renderEquipList() {
    const el = document.getElementById('pm-equip-list');
    if (!this._equipServiced.length) { el.innerHTML = '<p class="muted">None selected.</p>'; return; }
    el.innerHTML = this._equipServiced.map((e, i) => `
      <div class="service-item">
        <div class="service-item-header">
          <strong>${e.tag || '—'} — ${e.type}</strong>
          <button class="btn btn-xs btn-danger" onclick="PMR.removeEquip(${i})">✕</button>
        </div>
        <div class="form-row" style="margin-top:.5rem">
          <div class="form-group" style="flex:3">
            <label>Work Performed</label>
            <textarea class="input eq-work" data-idx="${i}" rows="2">${e.work_performed}</textarea>
          </div>
          <div class="form-group" style="flex:1">
            <label>Hours</label>
            <input type="number" class="input eq-hrs" data-idx="${i}" value="${e.hours}" step="0.25">
          </div>
        </div>
      </div>`).join('');

    el.querySelectorAll('.eq-work').forEach(ta => {
      ta.oninput = (e) => { this._equipServiced[e.target.dataset.idx].work_performed = e.target.value; };
    });
    el.querySelectorAll('.eq-hrs').forEach(inp => {
      inp.oninput = (e) => { this._equipServiced[e.target.dataset.idx].hours = Number(e.target.value); };
    });
    window.PMR = { removeEquip: (i) => { this._equipServiced.splice(i, 1); this.renderEquipList(); } };
  },

  addDeficiency() {
    const equipOpts = this._equipCache.map(e => `<option value="${e.id}">${e.tag || '—'} ${e.equipment_type}</option>`).join('');
    openModal({
      title: 'Add Deficiency',
      body: `<div class="form-grid">
        <div class="form-group full-width">
          <label>Description *</label>
          <textarea id="def-desc" class="input" rows="3" required></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Priority</label>
            <select id="def-pri" class="input">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div class="form-group">
            <label>Equipment</label>
            <select id="def-equip" class="input">
              <option value="">— None —</option>
              ${equipOpts}
            </select>
          </div>
        </div>
        <div class="form-group full-width">
          <label>Estimated Cost</label>
          <input type="number" id="def-cost" class="input" placeholder="0.00">
        </div>
      </div>`,
      footer: `<button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="def-add-ok">Add</button>`,
    });
    window.closeModal = closeModal;
    document.getElementById('def-add-ok').onclick = () => {
      const desc = document.getElementById('def-desc').value.trim();
      if (!desc) { notify.warn('Description required.'); return; }
      this._deficiencies.push({
        description: desc,
        priority: document.getElementById('def-pri').value,
        equipment_id: document.getElementById('def-equip').value || null,
        estimated_cost: Number(document.getElementById('def-cost').value) || 0,
        status: 'open',
      });
      closeModal();
      this.renderDefList();
    };
  },

  renderDefList() {
    const el = document.getElementById('pm-def-list');
    if (!this._deficiencies.length) { el.innerHTML = '<p class="muted">No deficiencies recorded.</p>'; return; }
    el.innerHTML = `<table class="table table-compact">
      <thead><tr><th>Priority</th><th>Description</th><th>Est. Cost</th><th></th></tr></thead>
      <tbody>${this._deficiencies.map((d, i) => `<tr>
        <td>${statusBadge(d.priority)}</td>
        <td>${d.description}</td>
        <td>${d.estimated_cost > 0 ? '$' + d.estimated_cost.toFixed(2) : '—'}</td>
        <td><button class="btn btn-xs btn-danger" onclick="PMR.removeDef(${i})">✕</button></td>
      </tr>`).join('')}</tbody>
    </table>`;
    window.PMR = window.PMR || {};
    window.PMR.removeDef = (i) => { this._deficiencies.splice(i, 1); this.renderDefList(); };
  },

  addPart() {
    openModal({
      title: 'Add Part / Material',
      body: `<div class="form-grid">
        <div class="form-group full-width">
          <label>Part Description *</label>
          <input id="part-desc" class="input" required>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Quantity</label><input type="number" id="part-qty" class="input" value="1"></div>
          <div class="form-group"><label>Unit Cost ($)</label><input type="number" id="part-cost" class="input" placeholder="0.00"></div>
        </div>
      </div>`,
      footer: `<button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="part-add-ok">Add</button>`,
    });
    window.closeModal = closeModal;
    document.getElementById('part-add-ok').onclick = () => {
      const desc = document.getElementById('part-desc').value.trim();
      if (!desc) { notify.warn('Description required.'); return; }
      this._parts.push({
        part: desc,
        quantity: Number(document.getElementById('part-qty').value) || 1,
        cost: Number(document.getElementById('part-cost').value) || 0,
      });
      closeModal();
      this.renderPartsList();
    };
  },

  renderPartsList() {
    const el = document.getElementById('pm-parts-list');
    if (!this._parts.length) { el.innerHTML = '<p class="muted">No parts recorded.</p>'; return; }
    el.innerHTML = `<table class="table table-compact">
      <thead><tr><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th></th></tr></thead>
      <tbody>${this._parts.map((p, i) => `<tr>
        <td>${p.part}</td><td>${p.quantity}</td>
        <td>$${p.cost.toFixed(2)}</td>
        <td>$${(p.quantity * p.cost).toFixed(2)}</td>
        <td><button class="btn btn-xs btn-danger" onclick="PMR.removePart(${i})">✕</button></td>
      </tr>`).join('')}</tbody>
    </table>`;
    window.PMR = window.PMR || {};
    window.PMR.removePart = (i) => { this._parts.splice(i, 1); this.renderPartsList(); };
  },

  async saveRecord() {
    const bid  = document.getElementById('pm-building').value;
    const date = document.getElementById('pm-date').value;
    if (!bid || !date) { notify.warn('Building and service date are required.'); return; }

    const rec = {
      building_id:       bid,
      proposal_id:       document.getElementById('pm-proposal').value || null,
      record_number:     'SR-' + pad(Date.now().toString().slice(-4)),
      service_date:      date,
      technician:        document.getElementById('pm-tech').value,
      service_type:      document.getElementById('pm-type').value,
      equipment_serviced: this._equipServiced,
      deficiencies:      this._deficiencies,
      parts_used:        this._parts,
      total_hours:       Number(document.getElementById('pm-hours').value) || 0,
      notes:             document.getElementById('pm-notes').value,
      status:            'complete',
    };

    try {
      // Save PM record
      const saved = await DB.create(rec);

      // Save deficiencies as standalone records
      if (this._deficiencies.length) {
        await Promise.all(this._deficiencies.map(d =>
          Deficiencies.create({ ...d, building_id: bid, pm_record_id: saved.id })
        ));
      }

      // Update next service date on serviced equipment
      for (const eq of this._equipServiced) {
        if (eq.equipment_id) {
          try {
            const equip = await Equipment.getById(eq.equipment_id);
            const interval = equip.service_interval_months || 12;
            await Equipment.update(eq.equipment_id, {
              last_service_date: date,
              next_service_date: addMonths(date, interval),
            });
          } catch {}
        }
      }

      notify.success('Service record saved.');
      navigate(`/pm-records/${saved.id}`);
    } catch (e) {
      notify.error(e.message);
    }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading...');
    try {
      const r = await DB.getById(id);
      setPageTitle(`Record ${r.record_number || id}`, [
        { label: 'Service Records', href: '#/pm-records' },
        { label: r.record_number || 'Detail' },
      ]);
      const equip = r.equipment_serviced || [];
      const defs  = r.deficiencies || [];
      const parts = r.parts_used || [];

      container.innerHTML = `<div class="page-wrap">
        <div class="card">
          <div class="card-header"><h3>Record ${r.record_number}</h3></div>
          <div class="card-body detail-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
            <div class="detail-field"><span class="detail-label">Building</span><span>${r.buildings?.name || '—'}</span></div>
            <div class="detail-field"><span class="detail-label">Service Date</span><span>${formatDate(r.service_date)}</span></div>
            <div class="detail-field"><span class="detail-label">Technician</span><span>${r.technician || '—'}</span></div>
            <div class="detail-field"><span class="detail-label">Type</span><span>${r.service_type || '—'}</span></div>
            <div class="detail-field"><span class="detail-label">Total Hours</span><span>${r.total_hours || '—'}</span></div>
            <div class="detail-field"><span class="detail-label">Status</span><span>${statusBadge(r.status)}</span></div>
          </div>
        </div>

        ${equip.length ? `<div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Equipment Serviced</h3></div>
          <div class="card-body">
            ${equip.map(e => `<div class="service-item-view">
              <strong>${e.tag || '—'} — ${e.type}</strong> &nbsp;(${e.hours || 0} hrs)
              <p style="margin:.25rem 0 0">${e.work_performed || '<span class="muted">No notes.</span>'}</p>
            </div>`).join('')}
          </div>
        </div>` : ''}

        ${defs.length ? `<div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Deficiencies Found (${defs.length})</h3></div>
          <div class="card-body">
            <table class="table table-compact">
              <thead><tr><th>Priority</th><th>Description</th><th>Est. Cost</th></tr></thead>
              <tbody>${defs.map(d => `<tr>
                <td>${statusBadge(d.priority)}</td>
                <td>${d.description}</td>
                <td>${d.estimated_cost > 0 ? '$' + Number(d.estimated_cost).toFixed(2) : '—'}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>` : ''}

        ${parts.length ? `<div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Parts Used</h3></div>
          <div class="card-body">
            <table class="table table-compact">
              <thead><tr><th>Part</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
              <tbody>${parts.map(p => `<tr>
                <td>${p.part}</td><td>${p.quantity}</td>
                <td>$${Number(p.cost).toFixed(2)}</td>
                <td>$${(p.quantity * p.cost).toFixed(2)}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>` : ''}

        ${r.notes ? `<div class="card" style="margin-top:1rem"><div class="card-header"><h3>Notes</h3></div><div class="card-body"><p>${r.notes}</p></div></div>` : ''}
      </div>`;
    } catch (e) {
      container.innerHTML = `<div class="page-wrap error-state">${e.message}</div>`;
    }
  },

  async deleteRecord(id) {
    const ok = await confirm('Delete this service record?');
    if (!ok) return;
    try {
      await DB.delete(id);
      notify.success('Deleted.');
      await this.loadTable();
    } catch (e) {
      notify.error(e.message);
    }
  },
};
