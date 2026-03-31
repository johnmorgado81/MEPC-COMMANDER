// buildings.js — PM Quote MVP
import { setPageTitle }   from './app.js';
import { Buildings as DB, Equipment } from './db.js';
import { CONFIG }         from './config.js';
import { formatDate, statusBadge, exportCSV, today, isOverdue, isDueSoon } from './helpers.js';
import { openModal, closeModal, confirm, notify, filterTable, makeSortable, getFormData, selectOptions, spinner, emptyState } from './ui.js';
import { navigate }       from './router.js';

export const Buildings = {

  async init(container) {
    setPageTitle('Buildings');
    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <input type="search" id="bld-search" class="input" placeholder="Search buildings…" style="max-width:280px">
        <div class="toolbar-right">
          <button class="btn btn-secondary" id="bld-export">Export CSV</button>
          <button class="btn btn-primary" id="bld-add">+ Add Building</button>
        </div>
      </div>
      <div class="card"><div id="bld-table-wrap">${spinner()}</div></div>
    </div>`;
    await this.loadTable();
    document.getElementById('bld-add').onclick = () => this.openForm();
    document.getElementById('bld-search').oninput = e => { const t = document.querySelector('#bld-table-wrap table'); if (t) filterTable(e.target, t); };
    document.getElementById('bld-export').onclick = () => this.exportData();
  },

  async loadTable() {
    const wrap = document.getElementById('bld-table-wrap');
    if (!wrap) return;
    try {
      const rows = await DB.getAll();
      if (!rows.length) { wrap.innerHTML = emptyState('No buildings yet.', '<button class="btn btn-primary" onclick="document.getElementById(\'bld-add\').click()">Add First Building</button>'); return; }
      wrap.innerHTML = `<table class="table" id="bld-table">
        <thead><tr>
          <th>Name</th><th>Strata #</th><th>Management Co.</th>
          <th>Type</th><th>City</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${rows.map(b => `<tr>
          <td><a href="#/buildings/${b.id}" class="link-strong">${b.name}</a></td>
          <td>${b.strata_number || '—'}</td>
          <td>${b.client_company || b.client_name || '—'}</td>
          <td>${b.building_type || '—'}</td>
          <td>${b.city || '—'}</td>
          <td>${statusBadge(b.status)}</td>
          <td class="actions">
            <a href="#/buildings/${b.id}" class="btn btn-xs btn-secondary">View</a>
            <button class="btn btn-xs btn-secondary" data-edit="${b.id}">Edit</button>
            <button class="btn btn-xs btn-danger" data-delete="${b.id}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table>`;
      makeSortable(document.getElementById('bld-table'));
      wrap.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => this.openForm(btn.dataset.edit));
      wrap.querySelectorAll('[data-delete]').forEach(btn => btn.onclick = () => this.deleteBuilding(btn.dataset.delete));
    } catch (e) { wrap.innerHTML = `<div class="error-state">${e.message}</div>`; }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading building...');
    try {
      const b = await DB.getById(id);
      setPageTitle(b.name, [{ label: 'Buildings', href: '#/buildings' }, { label: b.name }]);
      const equip = b.equipment || [];
      const due = equip.filter(e => e.next_service_date && (isOverdue(e.next_service_date) || isDueSoon(e.next_service_date, 30)));

      container.innerHTML = `<div class="page-wrap">
        <div class="detail-grid">
          <div class="card detail-info">
            <div class="card-header"><h3>Building Info</h3><button class="btn btn-sm btn-secondary" id="edit-bld-btn">Edit</button></div>
            <div class="card-body detail-fields">
              <div class="detail-section-label">Building</div>
              ${field('Building Name', b.name)}
              ${field('Strata Plan #', b.strata_number)}
              ${field('Building Type', b.building_type)}
              ${field('Address', [b.address, b.city, b.province, b.postal_code].filter(Boolean).join(', '))}
              ${field('Status', statusBadge(b.status), true)}

              <div class="detail-section-label" style="margin-top:.75rem">Management / Client</div>
              ${field('Management Company', b.client_company)}
              ${field('Primary Contact', b.client_name)}
              ${field('Email', b.client_email)}
              ${field('Phone', b.client_phone)}

              <div class="detail-section-label" style="margin-top:.75rem">Concierge</div>
              ${field('Name', b.concierge_name)}
              ${field('Phone', b.concierge_phone)}
              ${field('Email', b.concierge_email)}
              ${field('Coffee Order', b.concierge_coffee)}

              ${(b.building_notes || b.notes) ? `
                <div class="detail-section-label" style="margin-top:.75rem">Notes</div>
                ${field('Building Notes', b.building_notes || b.notes)}
              ` : ''}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3>Equipment (${equip.length})</h3>
              <div>
                ${due.length ? `<span class="badge badge-warning">${due.length} due soon</span>&nbsp;` : ''}
                <button class="btn btn-sm btn-primary" id="add-equip-btn">+ Add Equipment</button>
              </div>
            </div>
            <div class="card-body">
              ${equip.length ? `<table class="table table-compact">
                <thead><tr><th>Tag</th><th>Type</th><th>Make / Model</th><th>Next Service</th><th>Condition</th><th></th></tr></thead>
                <tbody>${equip.map(e => `<tr>
                  <td><strong>${e.tag || '—'}</strong></td>
                  <td>${e.equipment_type}</td>
                  <td>${[e.make || e.manufacturer, e.model].filter(Boolean).join(' ') || '—'}</td>
                  <td class="${isOverdue(e.next_service_date) ? 'text-danger' : isDueSoon(e.next_service_date, 30) ? 'text-warning' : ''}">${formatDate(e.next_service_date)}</td>
                  <td>${statusBadge(e.condition)}</td>
                  <td><a href="#/equipment/${e.id}" class="btn btn-xs btn-secondary">View</a></td>
                </tr>`).join('')}</tbody>
              </table>` : '<p class="muted">No equipment added yet.</p>'}
            </div>
          </div>
        </div>
      </div>`;

      document.getElementById('edit-bld-btn').onclick = () => this.openForm(id);
      document.getElementById('add-equip-btn').onclick = () => navigate(`/equipment?building=${id}`);
    } catch (e) { container.innerHTML = `<div class="page-wrap error-state">${e.message}</div>`; }
  },

  openForm(id = null) {
    openModal({
      title: id ? 'Edit Building' : 'Add Building',
      size: 'lg',
      body: `<form id="bld-form" class="form-grid">

        <div class="form-section-label">Building</div>
        <div class="form-row">
          <div class="form-group">
            <label>Building Name *</label>
            <input name="name" class="input" required placeholder="e.g. The Regent — 123 Main St">
          </div>
          <div class="form-group">
            <label>Strata Plan #</label>
            <input name="strata_number" class="input" placeholder="e.g. BCS1234">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Building Type</label>
            <select name="building_type" class="input">
              <option value="">— Select —</option>
              ${CONFIG.BUILDING_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status" class="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="form-group full-width">
          <label>Street Address</label>
          <input name="address" class="input">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>City</label>
            <input name="city" class="input" value="Vancouver">
          </div>
          <div class="form-group">
            <label>Province</label>
            <input name="province" class="input" value="BC">
          </div>
          <div class="form-group">
            <label>Postal Code</label>
            <input name="postal_code" class="input">
          </div>
        </div>

        <div class="form-section-label" style="margin-top:1rem">Management / Client</div>
        <div class="form-row">
          <div class="form-group">
            <label>Management Company</label>
            <input name="client_company" class="input" placeholder="e.g. FirstService Residential">
          </div>
          <div class="form-group">
            <label>Primary Contact Name</label>
            <input name="client_name" class="input">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Primary Contact Email</label>
            <input name="client_email" type="email" class="input">
          </div>
          <div class="form-group">
            <label>Primary Contact Phone</label>
            <input name="client_phone" class="input">
          </div>
        </div>

        <div class="form-section-label" style="margin-top:1rem">Concierge</div>
        <div class="form-row">
          <div class="form-group">
            <label>Concierge Name</label>
            <input name="concierge_name" class="input">
          </div>
          <div class="form-group">
            <label>Concierge Phone</label>
            <input name="concierge_phone" class="input">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Concierge Email</label>
            <input name="concierge_email" type="email" class="input">
          </div>
          <div class="form-group">
            <label>Coffee Order</label>
            <input name="concierge_coffee" class="input" placeholder="e.g. Large dark roast, black">
          </div>
        </div>

        <div class="form-section-label" style="margin-top:1rem">Additional Info</div>
        <div class="form-row">
          <div class="form-group">
            <label>Floors</label>
            <input name="floors" type="number" class="input">
          </div>
          <div class="form-group">
            <label>Year Built</label>
            <input name="year_built" type="number" class="input">
          </div>
          <div class="form-group">
            <label>Gross Area (sqft)</label>
            <input name="gross_area_sqft" type="number" class="input">
          </div>
        </div>
        <div class="form-group full-width">
          <label>Building Notes / Access Info</label>
          <textarea name="building_notes" class="input" rows="3" placeholder="Access codes, parking, key location, site-specific notes…"></textarea>
        </div>
      </form>`,
      footer: `<button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
               <button class="btn btn-primary" id="bld-save-btn">Save Building</button>`,
    });

    window.closeModal = closeModal;

    if (id) {
      DB.getById(id).then(b => {
        const f = document.getElementById('bld-form');
        Object.entries(b).forEach(([k, v]) => {
          if (f.elements[k]) f.elements[k].value = v ?? '';
        });
      });
    }

    document.getElementById('bld-save-btn').onclick = () => this.saveBuilding(id);
  },

  async saveBuilding(id) {
    const form = document.getElementById('bld-form');
    if (!form.reportValidity()) return;
    const data = getFormData(form);
    try {
      if (id) await DB.update(id, data);
      else await DB.create(data);
      closeModal();
      notify.success(id ? 'Building updated.' : 'Building added.');
      if (document.getElementById('bld-table-wrap')) await this.loadTable();
      else navigate('/buildings');
    } catch (e) { notify.error(e.message); }
  },

  async deleteBuilding(id) {
    const ok = await confirm('Delete this building? All associated equipment records will also be removed.');
    if (!ok) return;
    try {
      await DB.delete(id);
      notify.success('Building deleted.');
      await this.loadTable();
    } catch (e) { notify.error(e.message); }
  },

  async exportData() {
    const rows = await DB.getAll();
    exportCSV(rows.map(b => ({
      Name: b.name, 'Strata #': b.strata_number,
      'Mgmt Company': b.client_company, Contact: b.client_name,
      Email: b.client_email, Phone: b.client_phone,
      Address: b.address, City: b.city, Type: b.building_type, Status: b.status,
      Concierge: b.concierge_name, 'Concierge Phone': b.concierge_phone,
    })), 'buildings.csv');
  },
};

function field(label, val, html = false) {
  if (!val && val !== 0) return '';
  return `<div class="detail-field">
    <span class="detail-label">${label}</span>
    <span class="detail-value">${html ? val : String(val)}</span>
  </div>`;
}
