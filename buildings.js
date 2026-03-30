// buildings.js — Building management with area-based PM model
import { setPageTitle }  from './app.js';
import { Buildings as DB, Equipment as EquipDB } from './db.js';
import { CONFIG }        from './config.js';
import { formatDate, statusBadge, exportCSV } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState, getFormData, selectOptions } from './ui.js';
import { navigate }      from './router.js';

const SERVICE_AREA_LABELS = {
  common_strata:        'Common Strata Areas',
  commercial:           'Commercial Areas',
  residential_in_suite: 'Residential / In-Suite',
};

export const Buildings = {

  async init(container) {
    setPageTitle('Buildings');
    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <input type="search" id="bld-search" class="input" placeholder="Search buildings…" style="max-width:280px">
        <div class="toolbar-right">
          <button class="btn btn-secondary" id="bld-export">Export CSV</button>
          <button class="btn btn-primary"   id="bld-add">+ Add Building</button>
        </div>
      </div>
      <div class="card"><div id="bld-table-wrap">${spinner()}</div></div>
    </div>`;

    await this.loadTable();
    document.getElementById('bld-add').onclick   = () => this.openForm();
    document.getElementById('bld-export').onclick = () => this.exportData();
    document.getElementById('bld-search').oninput = e => {
      const tbl = document.querySelector('#bld-table-wrap table');
      if (!tbl) return;
      const q = e.target.value.toLowerCase();
      tbl.querySelectorAll('tbody tr').forEach(tr => { tr.hidden = !tr.textContent.toLowerCase().includes(q); });
    };
  },

  async loadTable() {
    const wrap = document.getElementById('bld-table-wrap');
    if (!wrap) return;
    try {
      const rows = await DB.getAll();
      if (!rows.length) { wrap.innerHTML = emptyState('No buildings yet.'); return; }
      wrap.innerHTML = `<div class="table-scroll"><table class="table" id="bld-table">
        <thead><tr>
          <th>Name</th><th>Client</th><th>Company</th><th>City</th><th>Type</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${rows.map(b => `<tr>
          <td><a href="#/buildings/${b.id}" class="link-strong">${b.name}</a></td>
          <td>${b.client_name||'—'}</td>
          <td>${b.client_company||'—'}</td>
          <td>${b.city||'—'}</td>
          <td>${b.building_type||'—'}</td>
          <td>${statusBadge(b.status)}</td>
          <td class="actions">
            <a href="#/buildings/${b.id}" class="btn btn-xs btn-secondary">View</a>
            <button class="btn btn-xs btn-secondary" data-edit="${b.id}">Edit</button>
            <button class="btn btn-xs btn-danger" data-del="${b.id}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`;
      makeSortable(document.getElementById('bld-table'));
      wrap.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => this.openForm(b.dataset.edit));
      wrap.querySelectorAll('[data-del]').forEach(b  => b.onclick = () => this.deleteBuilding(b.dataset.del));
    } catch (err) {
      wrap.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading…');
    try {
      const b    = await DB.getById(id);
      const equip = (await EquipDB.getByBuilding(id)) || [];

      setPageTitle(b.name, [{ label: 'Buildings', href: '#/buildings' }, { label: b.name }]);

      // Group equipment by service area
      const areas = { common_strata: [], commercial: [], residential_in_suite: [] };
      equip.forEach(e => {
        const k = e.service_area || 'common_strata';
        if (!areas[k]) areas[k] = [];
        areas[k].push(e);
      });

      // Build enabled area badges
      const enabledAreas = CONFIG.SERVICE_AREAS.filter(a =>
        equip.some(e => (e.service_area || 'common_strata') === a.value)
      );

      // Subcontractor flags
      const subs = (b.subcontractor_scopes || []);

      container.innerHTML = `<div class="page-wrap">
        <div class="toolbar">
          <div class="toolbar-right">
            <button class="btn btn-secondary" id="edit-bld-btn">Edit Building</button>
            <button class="btn btn-primary"   id="add-equip-btn">+ Add Equipment</button>
          </div>
        </div>

        <div class="detail-grid-2">
          <div class="card">
            <div class="card-header"><h3>Building Info</h3></div>
            <div class="card-body detail-fields">
              ${F('Building Name', b.name)}
              ${F('Client', b.client_name)}
              ${F('Company / Strata', b.client_company)}
              ${F('Contact', b.contact_name)}
              ${F('Email', b.client_email)}
              ${F('Phone', b.client_phone)}
              ${F('Address', b.address)}
              ${F('City / Province', [b.city, b.province].filter(Boolean).join(', '))}
              ${F('Postal Code', b.postal_code)}
              ${F('Type', b.building_type)}
              ${F('Floors', b.floors)}
              ${F('Year Built', b.year_built)}
              ${F('Status', statusBadge(b.status), true)}
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>PM Configuration</h3></div>
            <div class="card-body">
              <div class="form-section-title">Service Areas</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                ${CONFIG.SERVICE_AREAS.map(a => {
                  const active = equip.some(e => (e.service_area||'common_strata') === a.value);
                  return `<span class="badge ${active ? 'badge-primary' : 'badge-muted'}">${a.label} (${areas[a.value]?.length||0})</span>`;
                }).join('')}
              </div>
              ${subs.length ? `<div class="form-section-title">Subcontractor Scopes</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                  ${subs.map(s => `<span class="badge badge-warn">${s}</span>`).join('')}
                </div>` : ''}
              ${b.building_notes ? `<div class="form-section-title">Building Notes</div><p style="font-size:13px">${b.building_notes}</p>` : ''}
              ${b.access_notes   ? `<div class="form-section-title">Access Notes</div><p style="font-size:13px">${b.access_notes}</p>` : ''}
              ${b.proposal_notes ? `<div class="form-section-title">Proposal Notes</div><p style="font-size:13px">${b.proposal_notes}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Equipment grouped by service area -->
        <div class="card" style="margin-top:1rem">
          <div class="card-header">
            <h3>Equipment (${equip.length})</h3>
            <button class="btn btn-sm btn-primary" id="add-equip-btn2">+ Add Equipment</button>
          </div>
          <div class="card-body" style="padding:0">
            ${equip.length === 0 ? `<div style="padding:1.5rem">${emptyState('No equipment yet.')}</div>` :
              CONFIG.SERVICE_AREAS.filter(a => areas[a.value]?.length)
                .map(a => `
                  <div class="equip-area-group">
                    <div class="equip-area-header">${a.label} <span class="badge badge-muted">${areas[a.value].length}</span></div>
                    <table class="table table-compact">
                      <thead><tr><th>Tag</th><th>Type</th><th>Category</th><th>Qty</th><th>Location</th><th>Qtly Hrs</th><th>Ann Hrs</th><th></th></tr></thead>
                      <tbody>${areas[a.value].map(e => `<tr>
                        <td><strong>${e.tag||'—'}</strong></td>
                        <td>${e.equipment_type||'—'}</td>
                        <td>${e.category||'—'}</td>
                        <td>${e.qty||1}</td>
                        <td>${e.location||'—'}</td>
                        <td>${e.override_quarterly_hours ?? e.quarterly_hours ?? '—'}</td>
                        <td>${e.override_annual_hours    ?? e.annual_hours    ?? '—'}</td>
                        <td><button class="btn btn-xs btn-secondary" data-edit-eq="${e.id}">Edit</button></td>
                      </tr>`).join('')}</tbody>
                    </table>
                  </div>`).join('')
            }
          </div>
        </div>
      </div>`;

      document.getElementById('edit-bld-btn').onclick  = () => this.openForm(id);
      document.getElementById('add-equip-btn').onclick  = () => navigate(`/equipment?building=${id}`);
      document.getElementById('add-equip-btn2').onclick = () => navigate(`/equipment?building=${id}`);
      container.querySelectorAll('[data-edit-eq]').forEach(btn => {
        btn.onclick = () => navigate(`/equipment?building=${id}#edit-${btn.dataset.editEq}`);
      });
    } catch (err) {
      container.innerHTML = `<div class="page-wrap error-state">${err.message}</div>`;
    }
  },

  openForm(id = null) {
    openModal(id ? 'Edit Building' : 'Add Building', `
      <form id="bld-form" class="form-grid">
        <div class="form-section-title">Identity</div>
        <div class="form-row">
          <div class="form-group"><label>Building Name *</label><input name="name" required class="input"></div>
          <div class="form-group"><label>Building Type</label>
            <select name="building_type" class="input">${CONFIG.BUILDING_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Client Name</label><input name="client_name" class="input"></div>
          <div class="form-group"><label>Company / Strata Plan</label><input name="client_company" class="input"></div>
          <div class="form-group"><label>Contact Name</label><input name="contact_name" class="input"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Email</label><input name="client_email" type="email" class="input"></div>
          <div class="form-group"><label>Phone</label><input name="client_phone" class="input"></div>
        </div>
        <div class="form-group full-width"><label>Street Address</label><input name="address" class="input"></div>
        <div class="form-row">
          <div class="form-group"><label>City</label><input name="city" class="input" value="Vancouver"></div>
          <div class="form-group"><label>Province</label><input name="province" class="input" value="BC"></div>
          <div class="form-group"><label>Postal Code</label><input name="postal_code" class="input"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Floors</label><input name="floors" type="number" class="input"></div>
          <div class="form-group"><label>Year Built</label><input name="year_built" type="number" class="input"></div>
          <div class="form-group"><label>Gross Area (sqft)</label><input name="gross_area_sqft" type="number" class="input"></div>
        </div>

        <div class="form-section-title">Subcontractor Scopes</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
          ${CONFIG.SUBCONTRACTOR_CATEGORIES.map(s => `
            <label style="display:flex;gap:.5rem;align-items:center;cursor:pointer">
              <input type="checkbox" name="sub_${s.replace(/[^a-z]/gi,'_')}" value="${s}" class="sub-chk">
              <span style="font-size:13px">${s}</span>
            </label>`).join('')}
        </div>

        <div class="form-section-title">Status & Notes</div>
        <div class="form-row">
          <div class="form-group"><label>Status</label>
            <select name="status" class="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="form-group full-width"><label>Building Notes</label><textarea name="building_notes" rows="2" class="input"></textarea></div>
        <div class="form-group full-width"><label>Access Notes</label><textarea name="access_notes" rows="2" class="input"></textarea></div>
        <div class="form-group full-width"><label>Proposal Notes</label><textarea name="proposal_notes" rows="2" class="input"></textarea></div>
      </form>
    `, [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: id ? 'Save Changes' : 'Add Building', class: 'btn-primary', onClick: () => this.saveBuilding(id) },
    ]);

    if (id) {
      DB.getById(id).then(b => {
        const f = document.getElementById('bld-form');
        if (!f) return;
        Object.entries(b).forEach(([k, v]) => {
          const el = f.elements[k];
          if (el && v !== null && v !== undefined) el.value = v;
        });
        // Restore subcontractor checkboxes
        const subs = b.subcontractor_scopes || [];
        f.querySelectorAll('.sub-chk').forEach(chk => {
          if (subs.includes(chk.value)) chk.checked = true;
        });
      });
    }
  },

  async saveBuilding(id) {
    const form = document.getElementById('bld-form');
    if (!form || !form.reportValidity()) return;

    const data = {};
    new FormData(form).forEach((v, k) => {
      if (!k.startsWith('sub_')) data[k] = v;
    });

    // Collect subcontractor scopes
    data.subcontractor_scopes = [];
    form.querySelectorAll('.sub-chk:checked').forEach(chk => {
      data.subcontractor_scopes.push(chk.value);
    });

    try {
      if (id) await DB.update(id, data);
      else    await DB.create(data);
      closeModal();
      notify.success(id ? 'Building updated.' : 'Building added.');
      if (document.getElementById('bld-table-wrap')) await this.loadTable();
      else navigate('/buildings');
    } catch (err) {
      notify.error(err.message);
    }
  },

  async deleteBuilding(id) {
    const ok = await confirm('Delete this building and all its equipment?');
    if (!ok) return;
    try {
      await DB.delete(id);
      notify.success('Building deleted.');
      await this.loadTable();
    } catch (err) {
      notify.error(err.message);
    }
  },

  async exportData() {
    const rows = await DB.getAll();
    exportCSV(rows.map(b => ({
      Name: b.name, Client: b.client_name, Company: b.client_company,
      Email: b.client_email, Phone: b.client_phone,
      Address: b.address, City: b.city, Type: b.building_type, Status: b.status,
    })), 'buildings.csv');
  },
};

function F(label, val, html = false) {
  if (!val && val !== 0) return '';
  return `<div class="detail-field">
    <span class="detail-label">${label}</span>
    <span class="detail-value">${html ? val : String(val)}</span>
  </div>`;
}
