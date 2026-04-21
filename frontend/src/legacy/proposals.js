import { setPageTitle }    from './app.js';
import { Proposals as DB, Buildings, Equipment, PricingMatrix } from './db.js';
import { CONFIG, calcPMSellPrice } from './config.js';
import { getScopeText }    from './scope-library.js';
import { generateProposalPDF } from './pdf-export.js';
import { formatCurrency, formatDate, statusBadge, today, addDays, pad } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState } from './ui.js';
import { navigate }        from './router.js';
import { getStdHours, findEquipType } from './equipmaster.js';
import { ProposalWizard }  from './proposal-wizard.js';

const SA = { common_strata:'Common Strata', commercial:'Commercial', residential_in_suite:'Residential / In-Suite' };
const sal = v => SA[v] || v || '—';

// Hours engine (mirrors equipment.js)
function rowAnnualHrs(e) {
  const qty = parseInt(e.qty)||1;
  const qh  = parseFloat(e.override_quarterly_hours ?? e.quarterly_hours ?? 0) || 0;
  const ah  = e.annual_cleaning_enabled ? (parseFloat(e.override_annual_hours ?? e.annual_hours ?? 0)||0) : 0;
  return ((qh * 3) + ah) * qty;
}

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
      wrap.innerHTML = `<div class="table-wrap"><table class="table" id="prop-table">
        <thead><tr>
          <th>#</th><th>Building</th><th>Client</th><th>Frequency</th>
          <th>Annual Value</th><th>Status</th><th>Created</th><th>Valid Until</th><th></th>
        </tr></thead>
        <tbody>${rows.map(p => `<tr>
          <td><a href="#/proposals/${p.id}" class="link-strong">${p.proposal_number}</a></td>
          <td>${p.buildings?.name||'—'}</td>
          <td>${p.buildings?.client_name||'—'}</td>
          <td>${p.frequency||'—'}</td>
          <td>${formatCurrency(p.annual_value)}</td>
          <td>${statusBadge(p.status)}</td>
          <td>${formatDate(p.created_date)}</td>
          <td>${formatDate(p.valid_until)}</td>
          <td class="actions">
            <a href="#/proposals/${p.id}" class="btn btn-xs btn-secondary">View</a>
            <button class="btn btn-xs btn-danger" data-delete="${p.id}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`;
      makeSortable(document.getElementById('prop-table'));
      wrap.querySelectorAll('[data-delete]').forEach(btn =>
        btn.onclick = () => this.deleteProposal(btn.dataset.delete));
    } catch(e) {
      wrap.innerHTML = `<div class="error-state">${e.message}</div>`;
    }
  },

  async create(container) {
    setPageTitle('New PM Proposal');
    await ProposalWizard.init(container);
  },

  // ── Detail view (editable saved proposal) ─────────────────────────────────
  async detail(id, container) {
    container.innerHTML = spinner('Loading proposal...');
    try {
      const p = await DB.getById(id);
      const b = p.buildings;
      setPageTitle(`Proposal ${p.proposal_number}`);

      const scope = p.scope_items || [];
      const annual = scope.reduce((s,i) => s + (Number(i.annual_price)||0), 0);
      const tax    = annual * (CONFIG.TAX_RATE || 0.05);
      const freqObj = CONFIG.FREQUENCIES?.find(f => f.value === p.frequency) || { visits: 4 };

      // Readiness check
      const checks = [];
      if (!b?.client_name)    checks.push({ ok: false, msg: 'No client name on building' });
      if (!b?.address)        checks.push({ ok: false, msg: 'No address on building' });
      if (!scope.length)      checks.push({ ok: false, msg: 'No scope items' });
      if (!annual)            checks.push({ ok: false, msg: 'All scope items are $0' });
      if (!p.frequency)       checks.push({ ok: false, msg: 'No service frequency set' });
      const missing = scope.filter(s => !s.annual_price || s.annual_price <= 0);
      if (missing.length)     checks.push({ ok: false, msg: `${missing.length} scope item(s) with $0 price` });
      const ready = checks.filter(c => !c.ok).length === 0;

      // Group scope by area / type for output display
      const grouped = {};
      scope.forEach(item => {
        const area = item.service_area || 'general';
        if (!grouped[area]) grouped[area] = [];
        grouped[area].push(item);
      });

      // Type counts
      const typeCounts = {};
      scope.forEach(item => {
        typeCounts[item.equipment_type] = (typeCounts[item.equipment_type]||0) + 1;
      });

      container.innerHTML = `<div class="page-wrap">
        <div class="toolbar">
          <button onclick="history.back()" class="btn btn-secondary btn-sm">← Back</button>
          ${!ready ? `<span class="ai-badge" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);color:var(--red)">⚠ ${checks.filter(c=>!c.ok).length} issue(s)</span>` : `<span class="ai-badge" style="background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.25);color:var(--green)">✔ Ready</span>`}
          <div class="toolbar-right">
            <select id="prop-status-sel" class="input input-sm" style="max-width:140px">
              ${(CONFIG.PROPOSAL_STATUSES||[]).map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-secondary" id="prop-update-status">Update Status</button>
            <button class="btn btn-sm btn-secondary" id="prop-edit-scope-btn">✎ Edit Scope</button>
            <button class="btn btn-sm btn-primary" id="prop-pdf-btn">Export PDF</button>
          </div>
        </div>

        ${!ready ? `<div class="alert alert-warning" style="margin-bottom:14px">
          <strong>Readiness issues:</strong>
          <ul style="margin:6px 0 0 16px">${checks.filter(c=>!c.ok).map(c=>`<li style="font-size:12.5px">${c.msg}</li>`).join('')}</ul>
        </div>` : ''}

        <div class="card">
          <div class="card-header"><h3>Proposal ${p.proposal_number}</h3>${statusBadge(p.status)}</div>
          <div class="card-body detail-fields">
            ${df2('Building',b?.name)} ${df2('Client',b?.client_name)}
            ${df2('Address',[b?.address,b?.city,b?.province].filter(Boolean).join(', '))}
            ${df2('Frequency',p.frequency)} ${df2('Visits / Year',p.visits_per_year)}
            ${df2('Contract Start',formatDate(p.contract_start))} ${df2('Valid Until',formatDate(p.valid_until))}
            ${df2('Payment Terms',p.payment_terms)}
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card-header"><h3>Pricing Summary</h3></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
              <div class="totals-grid">
                ${totRow('Subtotal (Annual)',formatCurrency(annual))}
                ${totRow('GST (5%)',formatCurrency(tax))}
                ${totRow('Total Annual + Tax',formatCurrency(annual+tax),true)}
                ${totRow('Monthly Billing',formatCurrency((annual+tax)/12))}
                ${totRow(`Per Visit (${freqObj.visits} visits/yr)`,formatCurrency(freqObj.visits>0?annual/freqObj.visits:0))}
              </div>
              <div>
                <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Equipment Count</div>
                ${Object.entries(typeCounts).map(([t,n])=>`
                  <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;border-bottom:1px solid var(--border)">
                    <span>${t}</span><strong>${n}</strong>
                  </div>`).join('')}
                <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:6px 0;font-weight:700">
                  <span>Total</span><strong>${scope.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3>Scope of Work (${scope.length} items)</h3>
          </div>
          <div class="card-body" id="prop-scope-view">
            ${scope.length ? Object.entries(grouped).map(([area, items]) => `
              <div style="margin-bottom:18px">
                <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--orange);margin-bottom:8px">${sal(area)}</div>
                ${items.map(item => `
                  <div class="scope-item-view">
                    <div class="scope-item-header">
                      <div>
                        <strong>${item.tag||''} ${item.tag?'—':''} ${item.equipment_type}</strong>
                        ${item.make||item.manufacturer ? `<span style="font-size:11.5px;color:var(--text-muted);margin-left:6px">${[item.make||item.manufacturer,item.model].filter(Boolean).join(' ')}</span>` : ''}
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${p.frequency} — ${item.qty||1} unit(s)</div>
                      </div>
                      <strong style="color:var(--green)">${formatCurrency(item.annual_price)}/yr</strong>
                    </div>
                    <ul class="scope-list">
                      ${(item.scope_lines||[]).map(l=>`<li>${l}</li>`).join('')}
                    </ul>
                  </div>`).join('')}
                <div style="text-align:right;font-size:12px;color:var(--text-dim);padding:4px 0 8px;border-top:1px solid var(--border)">
                  ${sal(area)} subtotal: <strong>${formatCurrency(items.reduce((s,i)=>s+(Number(i.annual_price)||0),0))}/yr</strong>
                </div>
              </div>`).join('') : '<p class="muted">No scope items.</p>'}
          </div>
        </div>

        ${(p.manual_items||[]).length ? `<div class="card" style="margin-top:14px">
          <div class="card-header"><h3>Additional Line Items (${(p.manual_items||[]).length})</h3></div>
          <div class="card-body no-pad">
            <table class="table table-compact">
              <thead><tr><th>Description</th><th>Qty</th><th>Value/yr</th><th>Notes</th><th>Client-Facing</th></tr></thead>
              <tbody>${(p.manual_items||[]).map(m=>`<tr>
                <td>${m.description||'—'}</td><td>${m.qty||1}</td>
                <td>${m.value>0?formatCurrency(m.value*(m.qty||1)):m.value===0?'$0':'—'}</td>
                <td style="font-size:11.5px;color:var(--text-muted)">${m.notes||''}</td>
                <td>${m.client_facing?'<span style="color:var(--green);font-size:11px">✔ Yes</span>':'<span style="color:var(--text-muted);font-size:11px">Internal</span>'}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>` : ''}
        ${p.notes ? `<div class="card" style="margin-top:14px"><div class="card-header"><h3>Notes</h3></div><div class="card-body"><p>${p.notes}</p></div></div>` : ''}
      </div>`;

      document.getElementById('prop-pdf-btn').onclick = () => {
        if (!window.jspdf) { notify.error('jsPDF library not loaded.'); return; }
        generateProposalPDF(p, b);
      };
      document.getElementById('prop-update-status').onclick = async () => {
        const status = document.getElementById('prop-status-sel').value;
        try { await DB.update(id, { status }); notify.success('Status updated.'); navigate(`/proposals/${id}`); }
        catch(e) { notify.error(e.message); }
      };
      document.getElementById('prop-edit-scope-btn').onclick = () => this.openScopeEditor(id, p);

    } catch(e) {
      container.innerHTML = `<div class="page-wrap error-state">${e.message}</div>`;
    }
  },

  // ── Scope editor modal (editable saved proposal) ──────────────────────────
  openScopeEditor(id, p) {
    let items = JSON.parse(JSON.stringify(p.scope_items || []));

    const render = () => {
      const body = document.getElementById('scope-edit-body');
      if (!body) return;
      body.innerHTML = `
        <div style="margin-bottom:10px;display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" id="scope-add-custom-btn">+ Add Custom Item</button>
          <span style="font-size:12px;color:var(--text-dim);align-self:center">
            Subtotal: <strong>${formatCurrency(items.reduce((s,i)=>s+(Number(i.annual_price)||0),0))}</strong>/yr
          </span>
        </div>
        ${items.map((item, idx) => `
          <div style="border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;overflow:hidden">
            <div style="background:var(--bg3);padding:8px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <input class="input input-sm" data-si="${idx}" data-sf="tag" value="${item.tag||''}" placeholder="Tag" style="width:70px">
              <input class="input input-sm" data-si="${idx}" data-sf="equipment_type" value="${item.equipment_type||''}" placeholder="Type" style="flex:1;min-width:120px">
              <input class="input input-sm" data-si="${idx}" data-sf="make" value="${item.make||item.manufacturer||''}" placeholder="Make" style="width:90px">
              <input class="input input-sm" data-si="${idx}" data-sf="qty" type="number" min="1" value="${item.qty||1}" placeholder="Qty" style="width:50px">
              <span style="color:var(--text-muted);font-size:11px">$</span>
              <input class="input input-sm" data-si="${idx}" data-sf="annual_price" type="number" value="${item.annual_price||0}" style="width:90px" title="Annual price">
              <span style="font-size:11px;color:var(--text-muted)">/yr</span>
              <button class="btn btn-xs btn-ghost" data-si="${idx}" data-sregen="1" title="Regenerate scope text from library">↺</button>
              <button class="btn btn-xs btn-danger" data-si-rm="${idx}">✕</button>
            </div>
            <div style="padding:8px 12px">
              <textarea class="input" data-si="${idx}" data-sf="scope_text" rows="3" style="font-size:12px;line-height:1.5">${(item.scope_lines||[]).join('\n')}</textarea>
            </div>
          </div>`).join('')}`;

      body.querySelectorAll('[data-si]').forEach(el => {
        const handler = e => {
          const i = parseInt(e.target.dataset.si);
          const f = e.target.dataset.sf;
          if (f === 'scope_text') items[i].scope_lines = e.target.value.split('\n').filter(l=>l.trim());
          else items[i][f] = e.target.type === 'number' ? Number(e.target.value)||0 : e.target.value;
          // Update subtotal display
          const sub = body.querySelector('strong');
          if (sub) sub.textContent = formatCurrency(items.reduce((s,i)=>s+(Number(i.annual_price)||0),0));
        };
        el.oninput = handler;
        el.onchange = handler;
      });

      body.querySelectorAll('[data-si-rm]').forEach(btn => {
        btn.onclick = () => { items.splice(parseInt(btn.dataset.siRm), 1); render(); };
      });

      body.querySelectorAll('[data-sregen]').forEach(btn => {
        btn.onclick = () => {
          const i = parseInt(btn.dataset.si);
          const lines = getScopeText(items[i].equipment_type, p.frequency || 'quarterly');
          items[i].scope_lines = lines;
          render();
        };
      });

      document.getElementById('scope-add-custom-btn').onclick = () => {
        items.push({ tag:'CUSTOM', equipment_type:'Custom Item', annual_price:0, qty:1, scope_lines:['Scope to be defined.'] });
        render();
      };
    };

    openModal({ title: 'Edit Scope — ' + p.proposal_number, size: 'xl', body: `
      <div id="scope-edit-body"></div>`,
      footer: `<button class="btn btn-secondary" id="scope-edit-cancel">Cancel</button>
               <button class="btn btn-secondary" id="scope-edit-recalc">Recalculate Totals</button>
               <button class="btn btn-primary"   id="scope-edit-save">Save & Update Proposal</button>`,
    });
    render();

    document.getElementById('scope-edit-cancel').onclick = closeModal;
    document.getElementById('scope-edit-recalc').onclick = () => {
      const sub = document.querySelector('#scope-edit-body strong');
      if (sub) sub.textContent = formatCurrency(items.reduce((s,i)=>s+(Number(i.annual_price)||0),0));
      notify.info('Totals refreshed.');
    };
    document.getElementById('scope-edit-save').onclick = async () => {
      const annual = items.reduce((s,i) => s+(Number(i.annual_price)||0), 0);
      const freqObj = CONFIG.FREQUENCIES?.find(f=>f.value===p.frequency)||{visits:4};
      try {
        await DB.update(id, {
          scope_items:   items,
          annual_value:  annual,
          monthly_value: annual / 12,
          visits_per_year: freqObj.visits,
          updated_at: new Date().toISOString(),
        });
        closeModal();
        notify.success('Proposal updated.');
        navigate(`/proposals/${id}`);
      } catch(e) { notify.error(e.message); }
    };
  },

  async deleteProposal(id) {
    if (!await confirm('Delete this proposal?')) return;
    try { await DB.delete(id); notify.success('Deleted.'); await this.loadTable(); }
    catch(e) { notify.error(e.message); }
  },
};

function df2(label, val, html = false) {
  return `<div class="detail-field"><span class="detail-label">${label}</span><span class="detail-value">${html?val:(val||'—')}</span></div>`;
}
function totRow(label, val, bold = false) {
  return `<div class="totals-row${bold?' totals-row-bold':''}"><span>${label}</span><strong>${val}</strong></div>`;
}
