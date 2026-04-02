// proposals.js — PM Quote MVP
import { setPageTitle }   from './app.js';
import { Proposals as DB, Buildings, Equipment } from './db.js';
import { CONFIG } from './config.js';
import { getScopeText }   from './scope-library.js';
import { generateProposalPDFEnhanced } from './pdf-export.js';
import { formatCurrency, formatDate, statusBadge, today, addDays } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState } from './ui.js';
import { navigate }       from './router.js';
import { EQUIPMASTER, EQUIPMASTER_MANUFACTURERS, CATEGORIES, findEquipType } from './equipmaster.js';
import { ProposalWizard } from './proposal-wizard.js';
import { exportProposalExcel } from './excel-export.js';
import {
  resolveItemHours, resolveItemPrice, summarizeProposal,
  buildSavePayload, buildScheduleARows, renderScheduleBHTML,
  subcontractSell, annualSell, annualHours, formatAnnualWords,
  PM_QUARTERLY_VISITS,
} from './pm-engine.js';

// ─── Display helpers ──────────────────────────────────────────────────────────
function df2(l, v, html=false) {
  return `<div class="detail-field"><span class="detail-label">${l}</span>
    <span class="detail-value">${html?v:(v||'—')}</span></div>`;
}
function totRow(l, v, bold=false) {
  return `<div class="totals-row ${bold?'totals-row-bold':''}"><span>${l}</span><strong>${v}</strong></div>`;
}

// ─── List page ────────────────────────────────────────────────────────────────
export const Proposals = {

  async init(container) {
    setPageTitle('PM Proposals');
    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar"><div class="toolbar-right">
        <button class="btn btn-primary" id="prop-new-btn">+ New Proposal</button>
      </div></div>
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
        <thead><tr><th>#</th><th>Building</th><th>Client</th><th>Frequency</th>
          <th>Annual Value</th><th>Status</th><th>Created</th><th>Valid Until</th><th></th></tr></thead>
        <tbody>${rows.map(p=>`<tr>
          <td><a href="#/proposals/${p.id}" class="link-strong">${p.proposal_number}</a></td>
          <td>${p.buildings?.name||'—'}</td>
          <td>${p.buildings?.client_name||p.buildings?.client_company||'—'}</td>
          <td>${p.frequency||'—'}</td>
          <td>${formatCurrency(p.annual_value)}</td>
          <td>${statusBadge(p.status)}</td>
          <td>${formatDate(p.created_date)}</td>
          <td>${formatDate(p.valid_until)}</td>
          <td class="actions">
            <a href="#/proposals/${p.id}" class="btn btn-xs btn-secondary">View</a>
            <button class="btn btn-xs btn-danger" data-delete="${p.id}">Delete</button>
          </td></tr>`).join('')}</tbody></table>`;
      makeSortable(document.getElementById('prop-table'));
      wrap.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>this.deleteProposal(b.dataset.delete));
    } catch(e) { wrap.innerHTML=`<div class="error-state">${e.message}</div>`; }
  },

  async create(container) {
    setPageTitle('New PM Proposal');
    await ProposalWizard.init(container);
  },

  // ─── Detail / Edit ────────────────────────────────────────────────────────
  async detail(id, container) {
    container.innerHTML = spinner('Loading proposal...');
    let p, b, bEquip=[];
    try {
      p = await DB.getById(id); b = p.buildings||{};
      if (p.building_id) try { bEquip=(await Equipment.getByBuilding(p.building_id))||[]; } catch{}
    } catch(e) { container.innerHTML=`<div class="page-wrap error-state">${e.message}</div>`; return; }

    setPageTitle(`Proposal ${p.proposal_number}`);
    this._scope    = JSON.parse(JSON.stringify(p.scope_items||[]));
    this._subs     = JSON.parse(JSON.stringify(p.subcontractor_items||[]));
    this._id       = id; this._p=p; this._b=b; this._bEquip=bEquip;
    this._freq     = p.frequency||'quarterly';

    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <div class="status-wrap">${statusBadge(p.status)}</div>
        <div class="toolbar-right">
          <select id="prop-status-sel" class="input input-sm" style="max-width:140px">
            ${(CONFIG.PROPOSAL_STATUSES||[]).map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-secondary" id="prop-update-status">Update Status</button>
          <button class="btn btn-sm btn-secondary" id="prop-excel-btn">↓ Excel</button>
          <button class="btn btn-sm btn-secondary" id="prop-pdf-btn">↓ PDF</button>
          <button class="btn btn-sm btn-primary"   id="prop-save-btn">💾 Save Changes</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Proposal Details</h3></div>
        <div class="card-body detail-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          ${df2('Proposal #',p.proposal_number)} ${df2('Status',statusBadge(p.status),true)}
          ${df2('Building',b.name)} ${df2('Client',b.client_name||b.client_company)}
          <div class="detail-field"><span class="detail-label">Frequency</span>
            <select id="prop-freq-sel" class="input input-sm" style="max-width:180px">
              ${(CONFIG.FREQUENCIES||[]).map(f=>`<option value="${f.value}" ${f.value===p.frequency?'selected':''}>${f.label}</option>`).join('')}
            </select></div>
          ${df2('Created',formatDate(p.created_date))} ${df2('Valid Until',formatDate(p.valid_until))}
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header"><h3>Schedule A — Equipment Pricing</h3>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-secondary" id="prop-from-bldg">+ From Building</button>
            <button class="btn btn-sm btn-secondary" id="prop-add-row">+ Manual Row</button>
            <button class="btn btn-sm btn-secondary" id="prop-recalc">↻ Recalculate</button>
          </div>
        </div>
        <div class="card-body" id="sched-a-wrap">${this._renderSchedA()}</div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header"><h3>Subcontracted Packages</h3>
          <button class="btn btn-sm btn-secondary" id="prop-add-sub">+ Add Package</button>
        </div>
        <div class="card-body" id="sched-sub-wrap">${this._renderSubTable()}</div>
        <div style="font-size:11px;color:var(--text-muted);padding:.5rem 1rem">
          Internal sub costs never appear on client-facing PDF. Client sees sell price only (cost × 1.25).
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header"><h3>Pricing Summary</h3></div>
        <div class="card-body" id="totals-wrap">${this._renderTotals()}</div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header"><h3>Schedule B — Scope of Work</h3>
          <span style="font-size:11px;color:var(--text-muted)">Auto-generated from equipment present</span>
        </div>
        <div class="card-body" id="sched-b-wrap" style="font-size:13px;line-height:1.75">${this._renderSchedB()}</div>
      </div>
    </div>`;

    this._bindSchedA();
    this._bindSubTable();
    this._wireButtons();
  },

  // ─── Schedule A render + bind ─────────────────────────────────────────────
  _renderSchedA() {
    const items = this._scope.filter(i=>i.category!=='Subcontracted Services');
    if (!items.length) return `<p class="text-muted">No scope items yet. Add from building or manually.</p>`;
    const typeOpts = (EQUIPMASTER||[]).map(e=>`<option value="${e.equipment_type}">`).join('');
    const catOpts  = (CATEGORIES||[]).map(c=>`<option value="${c}">`).join('');
    return `<datalist id="s-type-dl">${typeOpts}</datalist>
      <datalist id="s-cat-dl">${catOpts}</datalist>
      <div class="table-scroll"><table class="table" id="sched-a-tbl">
        <thead><tr>
          <th>Tag</th><th>Equipment Type</th><th>System</th><th style="width:48px">Qty</th>
          <th style="width:70px">QH/unit</th><th style="width:70px">AH/unit</th>
          <th style="width:80px">Total Hrs</th><th style="width:95px">Annual $</th>
          <th style="width:82px">Monthly $</th><th style="width:32px"></th>
        </tr></thead>
        <tbody>${this._scope.map((item,i)=>{
          if (item.category==='Subcontracted Services') return '';
          const match = findEquipType(item.equipment_type);
          const qH    = Number(item.override_quarterly_hours??item.quarterly_hours??match?.quarterly_hours??1);
          const aH    = Number(item.override_annual_hours??item.annual_hours??match?.annual_hours??4);
          const totH  = annualHours(qH,aH,Number(item.qty)||1);
          const annV  = Number(item.annual_price)||annualSell(totH);
          const flag  = !match&&!item._manual;
          return `<tr data-i="${i}" style="${flag?'background:#fffbeb;':''}">
            <td><input class="sc-inp input" data-i="${i}" data-f="tag" value="${(item.tag||'').replace(/"/g,'&quot;')}" style="width:62px" placeholder="B-1"></td>
            <td>${flag?'<span style="font-size:10px;color:#b45309">⚠ </span>':''}
              <input class="sc-inp input" data-i="${i}" data-f="equipment_type" value="${(item.equipment_type||'').replace(/"/g,'&quot;')}" list="s-type-dl" autocomplete="off" style="min-width:145px"></td>
            <td><input class="sc-inp input" data-i="${i}" data-f="category" value="${(item.category||'').replace(/"/g,'&quot;')}" list="s-cat-dl" autocomplete="off" style="width:90px"></td>
            <td><input class="sc-inp input" type="number" data-i="${i}" data-f="qty" value="${item.qty||1}" min="1" style="width:46px"></td>
            <td><input class="sc-inp input" type="number" step="0.25" data-i="${i}" data-f="override_quarterly_hours" value="${qH}" min="0" style="width:62px"></td>
            <td><input class="sc-inp input" type="number" step="0.25" data-i="${i}" data-f="override_annual_hours" value="${aH}" min="0" style="width:62px"></td>
            <td class="sc-hrs-${i}" style="font-size:12px;font-weight:600;padding-top:.6rem">${totH.toFixed(2)}</td>
            <td><input class="sc-inp sc-price input" type="number" step="1" data-i="${i}" data-f="annual_price" value="${annV.toFixed(0)}" style="width:87px"></td>
            <td class="sc-mon-${i}" style="font-size:12px;padding-top:.6rem">${formatCurrency(annV/12)}</td>
            <td><button class="btn btn-xs btn-danger sc-del" data-i="${i}">✕</button></td>
          </tr>`;
        }).join('')}</tbody></table></div>`;
  },

  _bindSchedA() {
    document.querySelectorAll('.sc-inp').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const i=Number(inp.dataset.i), f=inp.dataset.f;
        if (!this._scope[i]) return;
        const numF=['qty','annual_price','override_quarterly_hours','override_annual_hours'];
        this._scope[i][f] = numF.includes(f)?Number(inp.value)||0:inp.value;
        if (f==='equipment_type') {
          const m=findEquipType(inp.value);
          if (m&&!this._scope[i].category) {
            this._scope[i].category=m.category||'';
            inp.closest('tr')?.querySelector('[data-f="category"]')?.setAttribute('value',m.category||'');
          }
        }
        if (['qty','override_quarterly_hours','override_annual_hours'].includes(f)) {
          const it=this._scope[i];
          const totH=annualHours(it.override_quarterly_hours??1,it.override_annual_hours??4,it.qty||1);
          it.annual_total_hours=totH;
          it.annual_price=annualSell(totH);
          const row=inp.closest('tr');
          const pi=row?.querySelector('.sc-price'); if(pi) pi.value=it.annual_price.toFixed(0);
          const hc=document.querySelector(`.sc-hrs-${i}`); if(hc) hc.textContent=totH.toFixed(2);
          const mc=document.querySelector(`.sc-mon-${i}`); if(mc) mc.textContent=formatCurrency(it.annual_price/12);
        }
        this._rt();
      });
    });
    document.querySelectorAll('.sc-del').forEach(btn=>{
      btn.onclick=()=>{ this._scope.splice(Number(btn.dataset.i),1); this._rerA(); };
    });
  },

  _rerA() {
    const w=document.getElementById('sched-a-wrap');
    if(w){w.innerHTML=this._renderSchedA();this._bindSchedA();}
    this._rt();
  },

  // ─── Subcontractor table ─────────────────────────────────────────────────
  _renderSubTable() {
    if (!this._subs.length) return `<p class="text-muted" style="font-size:13px">No packages. Click + Add Package to add OEM or subcontract services.</p>`;
    return `<div class="table-scroll"><table class="table" id="sub-tbl">
      <thead><tr><th>Package / Vendor</th><th>Scope Category</th><th>Type</th>
        <th style="width:110px">Sub Cost/yr</th><th style="width:100px">Sell (×1.25)</th>
        <th style="width:80px">Monthly</th><th style="width:32px"></th></tr></thead>
      <tbody>${this._subs.map((s,i)=>{
        const sell=subcontractSell(Number(s.sub_cost)||0);
        return `<tr>
          <td><input class="sub-inp input" data-i="${i}" data-f="label" value="${(s.label||'').replace(/"/g,'&quot;')}" placeholder="e.g. Daikin OEM Chiller" style="min-width:140px"></td>
          <td><input class="sub-inp input" data-i="${i}" data-f="scope" value="${(s.scope||'').replace(/"/g,'&quot;')}" placeholder="Chiller Maintenance" style="width:120px"></td>
          <td><select class="sub-inp input" data-i="${i}" data-f="recurring" style="width:90px">
            <option value="annual" ${s.recurring!=='onetime'?'selected':''}>Annual</option>
            <option value="onetime" ${s.recurring==='onetime'?'selected':''}>One-Time</option>
          </select></td>
          <td><input class="sub-inp input" type="number" step="10" data-i="${i}" data-f="sub_cost" value="${s.sub_cost||''}" placeholder="0.00" style="width:100px"></td>
          <td class="sub-sell-${i}" style="font-weight:600;padding-top:.6rem">${formatCurrency(sell)}</td>
          <td style="font-size:12px;padding-top:.6rem">${s.recurring==='onetime'?'One-Time':formatCurrency(sell/12)}</td>
          <td><button class="btn btn-xs btn-danger sub-del" data-i="${i}">✕</button></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  },

  _bindSubTable() {
    document.querySelectorAll('.sub-inp').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const i=Number(inp.dataset.i),f=inp.dataset.f;
        if (!this._subs[i]) return;
        this._subs[i][f]=f==='sub_cost'?Number(inp.value)||0:inp.value;
        const sell=subcontractSell(Number(this._subs[i].sub_cost||0));
        const sc=document.querySelector(`.sub-sell-${i}`); if(sc) sc.textContent=formatCurrency(sell);
        this._rt();
      });
    });
    document.querySelectorAll('.sub-del').forEach(btn=>{
      btn.onclick=()=>{ this._subs.splice(Number(btn.dataset.i),1); this._rerSub(); };
    });
  },

  _rerSub() {
    const w=document.getElementById('sched-sub-wrap');
    if(w){w.innerHTML=this._renderSubTable();this._bindSubTable();}
    this._rt();
  },

  // ─── Totals via engine ────────────────────────────────────────────────────
  _renderTotals() {
    const s = summarizeProposal(this._scope, this._subs);
    return `<div class="totals-grid" style="max-width:460px">
      ${totRow('Total Annual Hours (internal labour)', s.totalHours.toFixed(2)+' hrs')}
      ${totRow('Equipment PM — Annual Labour', formatCurrency(s.equipAnnual))}
      ${totRow('Subcontracted Services — Annual', formatCurrency(s.subAnnual))}
      ${totRow('Recurring Annual Subtotal', formatCurrency(s.recurring), true)}
      ${totRow(`GST (${(CONFIG.TAX_RATE*100).toFixed(0)}%)`, formatCurrency(s.tax))}
      ${totRow('Total Annual (incl. GST)', formatCurrency(s.total), true)}
      ${totRow('Monthly Billing (incl. GST)', formatCurrency(s.monthly*(1+CONFIG.TAX_RATE)), true)}
      ${s.oneTime > 0 ? totRow('One-Time Charges (excl. GST)', formatCurrency(s.oneTime)) : ''}
    </div>
    <div style="margin-top:1rem;padding:.75rem 1rem;background:var(--bg);border:1px solid var(--border);border-radius:6px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:.3rem">Annual Contract Value</div>
      <div style="font-size:1.4rem;font-weight:700">${formatCurrency(s.recurring)}</div>
      <div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-top:.2rem">${formatAnnualWords(s.recurring)}</div>
    </div>`;
  },

  _rt() {
    const tw=document.getElementById('totals-wrap'); if(tw) tw.innerHTML=this._renderTotals();
    const bw=document.getElementById('sched-b-wrap'); if(bw) bw.innerHTML=this._renderSchedB();
  },

  // ─── Schedule B ───────────────────────────────────────────────────────────
  // ─── Schedule B via engine
  _renderSchedB() {
    return renderScheduleBHTML(this._scope, CONFIG.COMPANY);
  },

  // ─── Wire buttons ─────────────────────────────────────────────────────────
  _wireButtons() {
    document.getElementById('prop-freq-sel').onchange=e=>{
      this._freq=e.target.value;
      this._scope.forEach(i=>{ i.frequency=this._freq; });
      this._rt();
    };

    document.getElementById('prop-recalc').onclick=()=>{
      this._scope.forEach(item=>{
        if (item.category==='Subcontracted Services') return;
        const { totH } = resolveItemHours(item);
        item.annual_total_hours = totH;
        item.annual_price = annualSell(totH);
      });
      this._rerA();
      notify.info('Recalculated — (QH×3)+AH × $152/hr');
    };

    document.getElementById('prop-add-row').onclick=()=>{
      this._scope.push({ equipment_type:'', tag:'', category:'', qty:1,
        frequency:this._freq, override_quarterly_hours:1, override_annual_hours:4,
        annual_total_hours:7, annual_price:annualSell(7), scope_lines:[], _manual:true });
      this._rerA();
    };

    document.getElementById('prop-add-sub').onclick=()=>{
      this._subs.push({ label:'', scope:'', sub_cost:0, recurring:'annual' });
      this._rerSub();
    };

    document.getElementById('prop-from-bldg').onclick=()=>{
      if (!this._bEquip.length) { notify.warn('No equipment on file for this building.'); return; }
      openModal('Add from Building Equipment', `
        <div style="max-height:380px;overflow-y:auto">
          <table class="table table-compact">
            <thead><tr><th></th><th>Tag</th><th>Type</th><th>Location</th><th>QH</th><th>AH</th></tr></thead>
            <tbody>${this._bEquip.map(e=>{
              const already=this._scope.some(s=>s.equipment_id===e.id||(s.tag===e.tag&&s.equipment_type===e.equipment_type));
              const m=findEquipType(e.equipment_type);
              const qH=Number(e.override_quarterly_hours??e.quarterly_hours??m?.quarterly_hours??1);
              const aH=Number(e.override_annual_hours??e.annual_hours??m?.annual_hours??4);
              return `<tr>
                <td><input type="checkbox" class="bld-chk" data-id="${e.id}" ${already?'checked':''}></td>
                <td>${e.tag||'—'}</td><td>${e.equipment_type}</td><td>${e.location||'—'}</td>
                <td>${qH}</td><td>${aH}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`, [
        {label:'Cancel',class:'btn-secondary',onClick:closeModal},
        {label:'Add Selected',class:'btn-primary',onClick:()=>{
          document.querySelectorAll('.bld-chk:checked').forEach(chk=>{
            const eq=this._bEquip.find(e=>e.id===chk.dataset.id);
            if (!eq||this._scope.some(s=>s.equipment_id===eq.id)) return;
            const m=findEquipType(eq.equipment_type);
            const qH=Number(eq.override_quarterly_hours??eq.quarterly_hours??m?.quarterly_hours??1);
            const aH=Number(eq.override_annual_hours??eq.annual_hours??m?.annual_hours??4);
            const totH=annualHours(qH,aH,eq.qty||1);
            this._scope.push({ equipment_id:eq.id, tag:eq.tag||'', equipment_type:eq.equipment_type,
              category:eq.category||'', qty:eq.qty||1, frequency:this._freq,
              override_quarterly_hours:qH, override_annual_hours:aH,
              annual_total_hours:totH, annual_price:annualSell(totH),
              scope_lines:getScopeText(eq.equipment_type,this._freq)||[] });
          });
          closeModal(); this._rerA(); notify.success('Equipment added.');
        }},
      ]);
    };

    document.getElementById('prop-save-btn').onclick=()=>this._save();

    document.getElementById('prop-update-status').onclick=async()=>{
      const status=document.getElementById('prop-status-sel').value;
      try { await DB.update(this._id,{status}); notify.success('Status updated.'); }
      catch(e) { notify.error(e.message); }
    };

    document.getElementById('prop-pdf-btn').onclick=()=>{
      if (!window.jspdf){notify.error('jsPDF not loaded.');return;}
      const annual=this._scope.reduce((s,i)=>s+(Number(i.annual_price)||0),0)
        +(this._subs||[]).filter(s=>s.recurring!=='onetime').reduce((s,i)=>s+subcontractSell(Number(i.sub_cost)||0),0);
      generateProposalPDFEnhanced(
        {...this._p, scope_items:this._scope, subcontractor_items:this._subs, annual_value:annual, monthly_value:annual/12},
        this._b, null);
    };

    document.getElementById('prop-excel-btn').onclick=()=>{
      if (!window.XLSX){notify.error('SheetJS not loaded.');return;}
      const annual=this._scope.reduce((s,i)=>s+(Number(i.annual_price)||0),0)
        +(this._subs||[]).filter(s=>s.recurring!=='onetime').reduce((s,i)=>s+subcontractSell(Number(i.sub_cost)||0),0);
      exportProposalExcel(
        {...this._p, scope_items:this._scope, subcontractor_items:this._subs, annual_value:annual, monthly_value:annual/12},
        this._b);
    };
  },

  async _save() {
    const frequency = document.getElementById('prop-freq-sel')?.value || this._freq;
    const payload = buildSavePayload(
      { ...this._p, frequency },
      this._scope,
      this._subs
    );
    try {
      await DB.update(this._id, payload);
      notify.success('Proposal saved.');
    } catch(e) { notify.error(e.message); }
  },

  async deleteProposal(id) {
    if (!await confirm('Delete this proposal?')) return;
    try { await DB.delete(id); notify.success('Deleted.'); await this.loadTable(); }
    catch(e){notify.error(e.message);}
  },
};
