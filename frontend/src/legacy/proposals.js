// js/modules/proposals.js
import { setPageTitle }    from './app.js';
import { Proposals as DB, Buildings, Equipment, PricingMatrix, MaintenanceItems } from './db.js';
import { CONFIG, calcPMSellPrice } from './config.js';
import { getScopeText }    from './scope-library.js';
import { generateProposalPDF } from './pdf-export.js';
import { formatCurrency, formatDate, statusBadge, today, addDays, pad } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState } from './ui.js';
import { navigate }        from './router.js';
import { getStdHours }     from './equipmaster.js';
import { ProposalWizard }  from './proposal-wizard.js';

export const Proposals = {

  async init(container) {
    setPageTitle('PM Proposals');
    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <div class="toolbar-right">
          <button class="btn btn-primary" id="prop-new-btn">+ New Proposal</button>
        </div>
      </div>
      <div class="card"><div id="prop-table-wrap">${spinner()}</div></div>
    </div>`;
    await this.loadTable();
    document.getElementById('prop-new-btn').onclick = () => navigate('/proposals/new');
  },

  async loadTable() {
    const wrap = document.getElementById('prop-table-wrap');
    try {
      const rows = await DB.getAll();
      if (!rows.length) { wrap.innerHTML = emptyState('No proposals yet.'); return; }
      wrap.innerHTML = `<table class="table" id="prop-table">
        <thead><tr>
          <th>#</th><th>Building</th><th>Client</th><th>Frequency</th>
          <th>Annual Value</th><th>Status</th><th>Created</th><th>Valid Until</th><th></th>
        </tr></thead>
        <tbody>${rows.map(p => `<tr>
          <td><a href="#/proposals/${p.id}" class="link-strong">${p.proposal_number}</a></td>
          <td>${p.buildings?.name || '—'}</td>
          <td>${p.buildings?.client_name || '—'}</td>
          <td>${p.frequency || '—'}</td>
          <td>${formatCurrency(p.annual_value)}</td>
          <td>${statusBadge(p.status)}</td>
          <td>${formatDate(p.created_date)}</td>
          <td>${formatDate(p.valid_until)}</td>
          <td class="actions">
            <a href="#/proposals/${p.id}" class="btn btn-xs btn-secondary">View</a>
            <button class="btn btn-xs btn-danger" data-delete="${p.id}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table>`;
      makeSortable(document.getElementById('prop-table'));
      wrap.querySelectorAll('[data-delete]').forEach(btn =>
        btn.onclick = () => this.deleteProposal(btn.dataset.delete));
    } catch (e) {
      wrap.innerHTML = `<div class="error-state">${e.message}</div>`;
    }
  },

  async create(container) {
    setPageTitle('New PM Proposal', [{ label: 'Proposals', href: '#/proposals' }, { label: 'New' }]);
    await ProposalWizard.init(container);
    return; // rest of method replaced by wizard
    let buildings = [];
    try { buildings = await Buildings.getAll(); } catch {}

    container.innerHTML = `<div class="page-wrap">
      <div class="card">
        <div class="card-header"><h3>Step 1 — Select Building & Frequency</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Building *</label>
              <select id="prop-building" class="input">
                <option value="">— Select Building —</option>
                ${buildings.map(b => `<option value="${b.id}">${b.name} — ${b.client_name || 'No client'}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>PM Frequency *</label>
              <select id="prop-freq" class="input">
                ${CONFIG.FREQUENCIES.map(f => `<option value="${f.value}" data-visits="${f.visits}">${f.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Contract Start</label>
              <input type="date" id="prop-start" class="input" value="${today()}">
            </div>
          </div>
          <button class="btn btn-primary" id="prop-load-equip">Load Equipment →</button>
        </div>
      </div>

      <div id="prop-scope-section" hidden>
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Step 2 — Add Equipment to Scope</h3></div>
          <div class="card-body" id="prop-equip-list">Loading...</div>
        </div>

        <div class="card" style="margin-top:1rem">
          <div class="card-header">
            <h3>Step 3 — Scope Preview & Pricing</h3>
            <button class="btn btn-sm btn-secondary" id="prop-add-custom">+ Custom Line</button>
          </div>
          <div class="card-body" id="prop-scope-preview">
            <p class="muted">Select equipment above to build scope.</p>
          </div>
        </div>

        <div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Step 4 — Totals & Notes</h3></div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label>Proposal Title</label>
                <input id="prop-title" class="input" placeholder="e.g. Annual PM Agreement 2025">
              </div>
              <div class="form-group">
                <label>Payment Terms</label>
                <input id="prop-terms-pay" class="input" value="Net 30">
              </div>
            </div>
            <div class="form-group">
              <label>Special Notes</label>
              <textarea id="prop-notes" class="input" rows="3"></textarea>
            </div>
            <div id="prop-totals" class="totals-block"></div>
          </div>
        </div>
        <div class="toolbar" style="margin-top:1rem">
          <button class="btn btn-secondary" onclick="history.back()">Cancel</button>
          <button class="btn btn-primary" id="prop-save-btn">Save Proposal</button>
        </div>
      </div>
    </div>`;

    this._scopeItems = [];
    this._buildingId = null;

    document.getElementById('prop-load-equip').onclick = () => this.loadEquipmentForScope();
    document.getElementById('prop-add-custom').onclick = () => this.addCustomLine();
    document.getElementById('prop-save-btn').onclick   = () => this.saveProposal();
  },

  async loadEquipmentForScope() {
    const bid  = document.getElementById('prop-building').value;
    const freq = document.getElementById('prop-freq').value;
    if (!bid) { notify.warn('Select a building first.'); return; }

    this._buildingId = bid;
    this._scopeItems = [];
    document.getElementById('prop-scope-section').removeAttribute('hidden');

    const el = document.getElementById('prop-equip-list');
    el.innerHTML = spinner();

    try {
      const [equip, pricing] = await Promise.all([
        Equipment.getByBuilding(bid),
        PricingMatrix.getAll(),
      ]);
      this._pricingCache = pricing;
      this._frequency = freq;

      if (!equip.length) { el.innerHTML = '<p class="muted">No equipment found. Add equipment to this building first.</p>'; return; }

      el.innerHTML = `<table class="table">
        <thead><tr><th></th><th>Tag</th><th>Type</th><th>Location</th><th>Std Hrs/Visit</th><th>Suggested Price/yr</th></tr></thead>
        <tbody>${equip.map(e => {
          const price   = this.lookupPrice(e.equipment_type, freq, pricing);
          const stdHrs  = this._getStdHoursForDisplay(e.equipment_type, freq);
          return `<tr>
            <td><input type="checkbox" class="equip-check" data-id="${e.id}"
              data-tag="${e.tag || ''}" data-type="${e.equipment_type}"
              data-price="${price}" data-hrs="${stdHrs ?? ''}"></td>
            <td>${e.tag || '—'}</td>
            <td>${e.equipment_type}</td>
            <td>${e.location || '—'}</td>
            <td class="text-muted">${stdHrs != null ? stdHrs + ' hrs' : '—'}</td>
            <td>${price > 0 ? formatCurrency(price) + ' / yr' : '<span class="muted">No rate set</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <button class="btn btn-sm btn-primary" id="prop-add-selected" style="margin-top:.75rem">Add Selected to Scope →</button>`;

      document.getElementById('prop-add-selected').onclick = () => this.addSelectedToScope();
    } catch (e) {
      el.innerHTML = `<div class="error-state">${e.message}</div>`;
    }
  },

  // Price lookup: try EQUIPMASTER standard hours first, then DB pricing matrix, then 0.
  // Hours-based: sell = stdHours × pmHourlyRate × (1+overhead) / (1-margin)
  lookupPrice(equipType, freq, pricing) {
    // 1) Try standard hours from EQUIPMASTER (client-side data, no network)
    const stdHrs = getStdHours(equipType, freq);
    if (stdHrs) {
      return calcPMSellPrice(stdHrs);
    }
    // 2) Fall back to DB pricing matrix (manually entered rates)
    const row = pricing.find(p =>
      p.equipment_type === equipType && p.service_frequency === freq
    );
    return row ? Number(row.sell_price || row.base_price) : 0;
  },

  // Returns standard hours for display in scope items
  _getStdHoursForDisplay(equipType, freq) {
    return getStdHours(equipType, freq) ?? null;
  },

  addSelectedToScope() {
    const checks = document.querySelectorAll('.equip-check:checked');
    if (!checks.length) { notify.warn('Select at least one equipment item.'); return; }
    const freq = this._frequency;
    checks.forEach(chk => {
      const id = chk.dataset.id;
      if (!this._scopeItems.find(s => s.equipment_id === id)) {
        this._scopeItems.push({
          equipment_id: id,
          tag: chk.dataset.tag,
          equipment_type: chk.dataset.type,
          frequency: freq,
          annual_price: Number(chk.dataset.price),
          scope_lines: getScopeText(chk.dataset.type, freq),
        });
      }
    });
    this.renderScopePreview();
    notify.success(`${checks.length} item(s) added to scope.`);
  },

  addCustomLine() {
    this._scopeItems.push({
      equipment_id: null,
      tag: 'CUSTOM',
      equipment_type: 'Custom Item',
      frequency: this._frequency || 'annual',
      annual_price: 0,
      scope_lines: ['Scope to be defined.'],
    });
    this.renderScopePreview();
  },

  renderScopePreview() {
    const el = document.getElementById('prop-scope-preview');
    if (!this._scopeItems.length) { el.innerHTML = '<p class="muted">No items in scope.</p>'; this.renderTotals(); return; }

    el.innerHTML = this._scopeItems.map((item, idx) => `
      <div class="scope-item" id="scope-${idx}">
        <div class="scope-item-header">
          <div class="scope-item-title">
            <strong>${item.tag}</strong> — ${item.equipment_type}
          </div>
          <div class="scope-item-controls">
            <label>Annual Price: $</label>
            <input type="number" class="input input-sm scope-price" data-idx="${idx}"
              value="${item.annual_price}" style="width:90px">
            <button class="btn btn-xs btn-danger" data-remove="${idx}">✕</button>
          </div>
        </div>
        <div class="scope-lines">
          <textarea class="input scope-lines-text" data-idx="${idx}" rows="4"
            style="font-size:12px">${item.scope_lines.join('\n')}</textarea>
        </div>
      </div>`).join('');

    el.querySelectorAll('.scope-price').forEach(inp => {
      inp.oninput = (e) => {
        this._scopeItems[e.target.dataset.idx].annual_price = Number(e.target.value) || 0;
        this.renderTotals();
      };
    });
    el.querySelectorAll('.scope-lines-text').forEach(ta => {
      ta.oninput = (e) => {
        this._scopeItems[e.target.dataset.idx].scope_lines = e.target.value.split('\n').filter(l => l.trim());
      };
    });
    el.querySelectorAll('[data-remove]').forEach(btn => {
      btn.onclick = (e) => {
        this._scopeItems.splice(Number(e.target.dataset.remove), 1);
        this.renderScopePreview();
      };
    });
    this.renderTotals();
  },

  renderTotals() {
    const el = document.getElementById('prop-totals');
    if (!el) return;
    const annual   = this._scopeItems.reduce((s, i) => s + (Number(i.annual_price) || 0), 0);
    const tax      = annual * CONFIG.TAX_RATE;
    const monthly  = annual / 12;
    const freqObj  = CONFIG.FREQUENCIES.find(f => f.value === this._frequency);
    const visits   = freqObj?.visits || 1;
    el.innerHTML = `<div class="totals-grid">
      <div class="totals-row"><span>Subtotal (Annual)</span><strong>${formatCurrency(annual)}</strong></div>
      <div class="totals-row"><span>GST (5%)</span><strong>${formatCurrency(tax)}</strong></div>
      <div class="totals-row totals-row-bold"><span>Total (Annual + Tax)</span><strong>${formatCurrency(annual + tax)}</strong></div>
      <div class="totals-row"><span>Monthly Billing</span><strong>${formatCurrency((annual + tax) / 12)}</strong></div>
      <div class="totals-row"><span>Per Visit (${visits} visits/yr)</span><strong>${formatCurrency(visits > 0 ? annual / visits : 0)}</strong></div>
    </div>`;
  },

  async saveProposal() {
    if (!this._buildingId)       { notify.warn('Select a building.'); return; }
    if (!this._scopeItems.length){ notify.warn('Add at least one scope item.'); return; }

    const annual = this._scopeItems.reduce((s, i) => s + Number(i.annual_price || 0), 0);
    const freqObj = CONFIG.FREQUENCIES.find(f => f.value === this._frequency) || { visits: 1 };
    const num = 'P-' + pad(Date.now().toString().slice(-4));
    const start = document.getElementById('prop-start').value || today();

    const rec = {
      building_id:   this._buildingId,
      proposal_number: num,
      title:         document.getElementById('prop-title').value || 'PM Agreement',
      status:        'draft',
      created_date:  today(),
      valid_until:   addDays(today(), CONFIG.PROPOSAL_VALID_DAYS),
      contract_start: start,
      frequency:     this._frequency,
      visits_per_year: freqObj.visits,
      annual_value:  annual,
      monthly_value: annual / 12,
      payment_terms: document.getElementById('prop-terms-pay').value || 'Net 30',
      scope_items:   this._scopeItems,
      notes:         document.getElementById('prop-notes').value,
    };

    try {
      const saved = await DB.create(rec);
      notify.success('Proposal saved.');
      navigate(`/proposals/${saved.id}`);
    } catch (e) {
      notify.error(e.message);
    }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading proposal...');
    try {
      const p = await DB.getById(id);
      const b = p.buildings;
      setPageTitle(`Proposal ${p.proposal_number}`, [
        { label: 'Proposals', href: '#/proposals' },
        { label: p.proposal_number },
      ]);

      container.innerHTML = `<div class="page-wrap">
        <div class="toolbar">
          <div class="status-wrap">${statusBadge(p.status)}</div>
          <div class="toolbar-right">
            <select id="prop-status-sel" class="input input-sm" style="max-width:140px">
              ${CONFIG.PROPOSAL_STATUSES.map(s => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-secondary" id="prop-update-status">Update Status</button>
            <button class="btn btn-sm btn-primary" id="prop-pdf-btn">Export PDF</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Proposal Details</h3></div>
          <div class="card-body detail-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
            ${df2('Proposal #', p.proposal_number)} ${df2('Status', statusBadge(p.status), true)}
            ${df2('Building', b?.name)} ${df2('Client', b?.client_name)}
            ${df2('Frequency', p.frequency)} ${df2('Visits / Year', p.visits_per_year)}
            ${df2('Created', formatDate(p.created_date))} ${df2('Valid Until', formatDate(p.valid_until))}
            ${df2('Annual Value', formatCurrency(p.annual_value))} ${df2('Monthly Billing', formatCurrency(p.monthly_value))}
          </div>
        </div>

        <div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Scope of Work (${(p.scope_items || []).length} items)</h3></div>
          <div class="card-body">
            ${(p.scope_items || []).map(item => `
              <div class="scope-item-view">
                <div class="scope-item-header">
                  <strong>${item.tag} — ${item.equipment_type}</strong>
                  <span>${formatCurrency(item.annual_price)} / yr</span>
                </div>
                <ul class="scope-list">
                  ${(item.scope_lines || []).map(l => `<li>${l}</li>`).join('')}
                </ul>
              </div>`).join('')}
          </div>
        </div>

        <div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Pricing Summary</h3></div>
          <div class="card-body">
            <div class="totals-grid" style="max-width:360px">
              ${totRow('Subtotal (Annual)', formatCurrency(p.annual_value))}
              ${totRow(`GST (${(CONFIG.TAX_RATE*100).toFixed(0)}%)`, formatCurrency(p.annual_value * CONFIG.TAX_RATE))}
              ${totRow('Total Annual', formatCurrency(p.annual_value * (1 + CONFIG.TAX_RATE)), true)}
              ${totRow('Monthly Billing', formatCurrency(p.monthly_value * (1 + CONFIG.TAX_RATE)))}
            </div>
          </div>
        </div>
        ${p.notes ? `<div class="card" style="margin-top:1rem"><div class="card-header"><h3>Notes</h3></div><div class="card-body"><p>${p.notes}</p></div></div>` : ''}
      </div>`;

      document.getElementById('prop-pdf-btn').onclick = () => {
        if (!window.jspdf) { notify.error('jsPDF library not loaded.'); return; }
        generateProposalPDF(p, b);
      };
      document.getElementById('prop-update-status').onclick = async () => {
        const status = document.getElementById('prop-status-sel').value;
        try {
          await DB.update(id, { status });
          notify.success('Status updated.');
          navigate(`/proposals/${id}`);
        } catch (e) {
          notify.error(e.message);
        }
      };
    } catch (e) {
      container.innerHTML = `<div class="page-wrap error-state">${e.message}</div>`;
    }
  },

  async deleteProposal(id) {
    const ok = await confirm('Delete this proposal?');
    if (!ok) return;
    try {
      await DB.delete(id);
      notify.success('Proposal deleted.');
      await this.loadTable();
    } catch (e) {
      notify.error(e.message);
    }
  },
};

function df2(label, val, html = false) {
  return `<div class="detail-field"><span class="detail-label">${label}</span>
    <span class="detail-value">${html ? val : (val || '—')}</span></div>`;
}
function totRow(label, val, bold = false) {
  return `<div class="totals-row ${bold ? 'totals-row-bold' : ''}"><span>${label}</span><strong>${val}</strong></div>`;
}
