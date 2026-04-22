// js/modules/quotes.js
import { setPageTitle }   from './app.js';
import { Quotes as DB, Buildings, Deficiencies, MarkupMatrix } from './db.js';
import { CONFIG, applyMarkup, getMarkupMultiplier } from './config.js';
import { generateQuotePDF } from './pdf-export.js';
import { formatCurrency, formatDate, statusBadge, today, addDays, pad, isOverdue } from './helpers.js';
import { openModal, closeModal, confirm, notify, makeSortable, spinner, emptyState } from './ui.js';
import { navigate }       from './router.js';

export const Quotes = {

  async init(container) {
    setPageTitle('Quote Funnel');
    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <select id="q-filter-status" class="input" style="max-width:180px">
          <option value="">All Status</option>
          ${CONFIG.QUOTE_STATUSES.map(s => `<option>${s}</option>`).join('')}
        </select>
        <div class="toolbar-right">
          <button class="btn btn-primary" id="q-new-btn">+ New Quote</button>
        </div>
      </div>
      <div id="q-pipeline-banner"></div>
      <div class="card"><div id="q-table-wrap">${spinner()}</div></div>
    </div>`;
    await this.loadTable();
    document.getElementById('q-new-btn').onclick = () => navigate('/quotes/new');
    document.getElementById('q-filter-status').onchange = (e) => this.filterByStatus(e.target.value);
  },

  filterByStatus(status) {
    const tbl = document.querySelector('#q-table-wrap table');
    if (!tbl) return;
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      tr.hidden = status ? !tr.dataset.status?.includes(status) : false;
    });
  },

  async loadTable() {
    const wrap = document.getElementById('q-table-wrap');
    try {
      const rows = await DB.getAll();
      if (!rows.length) { wrap.innerHTML = emptyState('No quotes yet.'); return; }

      // Pipeline summary — track all active statuses
      const openStatuses   = ['draft','sent','pending-approval'];
      const pipelineRows   = rows.filter(q => openStatuses.includes(q.status));
      const pipelineVal    = pipelineRows.reduce((s, q) => s + Number(q.total || 0), 0);
      const pendingAppr    = rows.filter(q => q.status === 'pending-approval');
      const approved       = rows.filter(q => q.status === 'approved');
      const deferred       = rows.filter(q => q.status === 'deferred');
      const followupDue    = rows.filter(q => q.status === 'sent' && q.follow_up_date && isOverdue(q.follow_up_date));
      const banner = document.getElementById('q-pipeline-banner');
      if (banner) {
        banner.innerHTML = `<div class="pipeline-banner">
          <div class="pipeline-stat">
            <span class="pipeline-val">${formatCurrency(pipelineVal)}</span>
            <span class="pipeline-label">Open Pipeline</span>
          </div>
          <div class="pipeline-stat">
            <span class="pipeline-val">${pipelineRows.length}</span>
            <span class="pipeline-label">Open Quotes</span>
          </div>
          <div class="pipeline-stat ${pendingAppr.length ? 'pipeline-warn' : ''}">
            <span class="pipeline-val">${pendingAppr.length}</span>
            <span class="pipeline-label">Pending Approval</span>
          </div>
          <div class="pipeline-stat pipeline-success">
            <span class="pipeline-val">${approved.length}</span>
            <span class="pipeline-label">Approved</span>
          </div>
          <div class="pipeline-stat ${deferred.length ? 'pipeline-muted' : ''}">
            <span class="pipeline-val">${deferred.length}</span>
            <span class="pipeline-label">Deferred</span>
          </div>
          <div class="pipeline-stat ${followupDue.length ? 'pipeline-alert' : ''}">
            <span class="pipeline-val">${followupDue.length}</span>
            <span class="pipeline-label">Follow-Ups Due</span>
          </div>
        </div>`;
      }

      wrap.innerHTML = `<table class="table" id="q-table">
        <thead><tr>
          <th>#</th><th>Building</th><th>Client</th><th>Title</th>
          <th>Total</th><th>Status</th><th>Sent</th><th>Follow Up</th><th></th>
        </tr></thead>
        <tbody>${rows.map(q => `<tr data-status="${q.status}">
          <td><a href="#/quotes/${q.id}" class="link-strong">${q.quote_number}</a></td>
          <td>${q.buildings?.name || '—'}</td>
          <td>${q.buildings?.client_name || '—'}</td>
          <td>${q.title || '—'}</td>
          <td><strong>${formatCurrency(q.total)}</strong></td>
          <td>${statusBadge(q.status)}</td>
          <td>${formatDate(q.sent_date)}</td>
          <td class="${q.status === 'sent' && isOverdue(q.follow_up_date) ? 'text-danger fw-bold' : ''}">
            ${formatDate(q.follow_up_date)}
            ${q.status === 'sent' && isOverdue(q.follow_up_date) ? ' ⚠' : ''}
          </td>
          <td class="actions">
            <a href="#/quotes/${q.id}" class="btn btn-xs btn-secondary">View</a>
            <button class="btn btn-xs btn-danger" data-delete="${q.id}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table>`;
      makeSortable(document.getElementById('q-table'));
      wrap.querySelectorAll('[data-delete]').forEach(btn =>
        btn.onclick = () => this.deleteQuote(btn.dataset.delete));
    } catch (e) {
      wrap.innerHTML = `<div class="error-state">${e.message}</div>`;
    }
  },

  async create(container) {
    setPageTitle('New Quote', [{ label: 'Quotes', href: '#/quotes' }, { label: 'New' }]);
    let buildings = [];
    try { buildings = await Buildings.getAll(); } catch {}

    container.innerHTML = `<div class="page-wrap">
      <div class="card">
        <div class="card-header"><h3>Quote Details</h3></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Building *</label>
              <select id="q-building" class="input">
                <option value="">— Select —</option>
                ${buildings.map(b => `<option value="${b.id}">${b.name} — ${b.client_name || ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Quote Title</label>
              <input id="q-title" class="input" placeholder="e.g. Boiler Repair — B-1">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Payment Terms</label>
              <input id="q-pay-terms" class="input" value="Net 30">
            </div>
            <div class="form-group">
              <label>Valid Until</label>
              <input type="date" id="q-valid" class="input" value="${addDays(today(), CONFIG.QUOTE_VALID_DAYS)}">
            </div>
            <div class="form-group">
              <label>Follow-Up Date</label>
              <input type="date" id="q-followup" class="input" value="${addDays(today(), 7)}">
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header">
          <h3>Line Items</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" id="q-add-labour">+ Labour</button>
            <button class="btn btn-sm btn-secondary" id="q-add-material">+ Material (with markup)</button>
            <button class="btn btn-sm btn-secondary" id="q-add-line">+ Custom Line</button>
          </div>
        </div>
        <div class="card-body" id="q-lines-wrap">
          <p class="muted">No line items yet.</p>
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header"><h3>Totals</h3></div>
        <div class="card-body">
          <div id="q-totals" class="totals-block"></div>
          <div class="form-group" style="margin-top:.75rem">
            <label>Notes (visible on quote)</label>
            <textarea id="q-notes" class="input" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Internal Notes</label>
            <textarea id="q-int-notes" class="input" rows="2"></textarea>
          </div>
        </div>
      </div>

      <div class="toolbar" style="margin-top:1rem">
        <button class="btn btn-secondary" onclick="history.back()">Cancel</button>
        <button class="btn btn-primary" id="q-save-btn">Save Quote</button>
      </div>
    </div>`;

    this._lines = [];
    document.getElementById('q-add-line').onclick     = () => this.addLine();
    document.getElementById('q-add-labour').onclick   = () => this.addLabourLine();
    document.getElementById('q-add-material').onclick = () => this.addMaterialLine();
    document.getElementById('q-save-btn').onclick     = () => this.saveQuote();
  },

  addLabourLine() {
    const rates = CONFIG.LABOUR_RATES;
    openModal('Add Labour Line', `
      <div class="form-row">
        <div class="form-group">
          <label>Description</label>
          <input id="lab-desc" class="input" value="Labour — ">
        </div>
        <div class="form-group">
          <label>Hours</label>
          <input type="number" id="lab-hrs" class="input" step="0.5" value="2">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Rate Type</label>
          <select id="lab-rate-type" class="input">
            <option value="${rates.weekday_hourly}">Weekday — $${rates.weekday_hourly}/hr</option>
            <option value="${rates.weekend_hourly}">Weekend/OT — $${rates.weekend_hourly}/hr</option>
          </select>
        </div>
        <div class="form-group">
          <label>Include Callout?</label>
          <select id="lab-callout" class="input">
            <option value="0">No callout</option>
            <option value="${rates.weekday_callout}" selected>Weekday callout — $${rates.weekday_callout}</option>
            <option value="${rates.weekend_callout}">Weekend callout — $${rates.weekend_callout}</option>
          </select>
        </div>
      </div>
      <div id="lab-preview" class="text-muted" style="margin-top:8px;font-size:13px"></div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: 'Add Line', class: 'btn-primary', onClick: () => {
        const desc     = document.getElementById('lab-desc')?.value || 'Labour';
        const hrs      = parseFloat(document.getElementById('lab-hrs')?.value || 2);
        const rate     = parseFloat(document.getElementById('lab-rate-type')?.value || rates.weekday_hourly);
        const callout  = parseFloat(document.getElementById('lab-callout')?.value || 0);
        const billHrs  = Math.max(hrs, rates.minimum_hours);
        const total    = callout + (billHrs * rate);
        this.addLine({ description: desc, qty: 1, unit: 'ls', unit_price: total, total });
        closeModal();
      }},
    ]);

    // Live preview
    const updatePreview = () => {
      const hrs     = parseFloat(document.getElementById('lab-hrs')?.value || 2);
      const rate    = parseFloat(document.getElementById('lab-rate-type')?.value || rates.weekday_hourly);
      const callout = parseFloat(document.getElementById('lab-callout')?.value || 0);
      const billHrs = Math.max(hrs, rates.minimum_hours);
      const total   = callout + (billHrs * rate);
      const prev    = document.getElementById('lab-preview');
      if (prev) prev.textContent = `Estimated: ${formatCurrency(callout)} callout + ${billHrs} hrs × $${rate} = ${formatCurrency(total)}`;
    };
    setTimeout(() => {
      ['lab-hrs','lab-rate-type','lab-callout'].forEach(id =>
        document.getElementById(id)?.addEventListener('input', updatePreview)
      );
      updatePreview();
    }, 50);
  },

  addMaterialLine() {
    openModal('Add Material with Markup', `
      <p class="text-muted mb-8" style="font-size:13px">
        Enter your cost (what you pay). Sell price is calculated using the markup matrix.
      </p>
      <div class="form-row">
        <div class="form-group">
          <label>Material Description</label>
          <input id="mat-desc" class="input" placeholder="e.g. Ball valve 1½″">
        </div>
        <div class="form-group">
          <label>Qty</label>
          <input type="number" id="mat-qty" class="input" value="1" min="1">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Your Cost per Unit ($)</label>
          <input type="number" id="mat-cost" class="input" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Sell Price per Unit ($) <small class="text-muted">auto-calculated</small></label>
          <input type="number" id="mat-sell" class="input" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div id="mat-preview" class="text-muted" style="font-size:13px;margin-top:4px"></div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: 'Add Line', class: 'btn-primary', onClick: () => {
        const desc  = document.getElementById('mat-desc')?.value || 'Material';
        const qty   = parseFloat(document.getElementById('mat-qty')?.value || 1);
        const sell  = parseFloat(document.getElementById('mat-sell')?.value || 0);
        const total = +(qty * sell).toFixed(2);
        this.addLine({ description: desc, qty, unit: 'ea', unit_price: sell, total });
        closeModal();
      }},
    ]);

    setTimeout(() => {
      const updateMarkup = () => {
        const cost = parseFloat(document.getElementById('mat-cost')?.value || 0);
        const qty  = parseFloat(document.getElementById('mat-qty')?.value || 1);
        if (cost > 0) {
          const sell   = applyMarkup(cost);
          const prev   = document.getElementById('mat-preview');
          const sellEl = document.getElementById('mat-sell');
          if (sellEl) sellEl.value = sell;
          if (prev) prev.textContent = `Cost $${cost} × ${getMarkupMultiplier(cost)} = sell $${sell} | Line total: ${formatCurrency(qty * sell)}`;
        }
      };
      ['mat-cost','mat-qty'].forEach(id =>
        document.getElementById(id)?.addEventListener('input', updateMarkup)
      );
    }, 50);
  },

  addLine(item = null) {
    this._lines.push(item || { description: '', qty: 1, unit: 'ls', unit_price: 0, total: 0 });
    this.renderLines();
  },

  renderLines() {
    const wrap = document.getElementById('q-lines-wrap');
    if (!this._lines.length) { wrap.innerHTML = '<p class="muted">No line items.</p>'; this.renderTotals(); return; }
    wrap.innerHTML = `<table class="table">
      <thead><tr><th style="min-width:300px">Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
      <tbody>${this._lines.map((l, i) => `<tr>
        <td><input class="input ql-desc" data-i="${i}" value="${l.description}"></td>
        <td><input type="number" class="input input-sm ql-qty" data-i="${i}" value="${l.qty}" style="width:60px"></td>
        <td><input class="input input-sm ql-unit" data-i="${i}" value="${l.unit}" style="width:60px"></td>
        <td><input type="number" class="input input-sm ql-price" data-i="${i}" value="${l.unit_price}" style="width:90px"></td>
        <td><strong class="ql-total-${i}">${formatCurrency(l.total)}</strong></td>
        <td><button class="btn btn-xs btn-danger ql-del" data-i="${i}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table>`;

    const recalc = (i) => {
      const q = Number(document.querySelector(`.ql-qty[data-i="${i}"]`)?.value) || 0;
      const p = Number(document.querySelector(`.ql-price[data-i="${i}"]`)?.value) || 0;
      this._lines[i].total = q * p;
      const el = document.querySelector(`.ql-total-${i}`);
      if (el) el.textContent = formatCurrency(this._lines[i].total);
      this.renderTotals();
    };
    wrap.querySelectorAll('.ql-desc').forEach(el => el.oninput  = (e) => { this._lines[e.target.dataset.i].description = e.target.value; });
    wrap.querySelectorAll('.ql-qty').forEach(el  => el.oninput  = (e) => { this._lines[e.target.dataset.i].qty = Number(e.target.value); recalc(e.target.dataset.i); });
    wrap.querySelectorAll('.ql-unit').forEach(el => el.oninput  = (e) => { this._lines[e.target.dataset.i].unit = e.target.value; });
    wrap.querySelectorAll('.ql-price').forEach(el=> el.oninput  = (e) => { this._lines[e.target.dataset.i].unit_price = Number(e.target.value); recalc(e.target.dataset.i); });
    wrap.querySelectorAll('.ql-del').forEach(btn => btn.onclick = (e) => { this._lines.splice(Number(e.target.dataset.i), 1); this.renderLines(); });
    this.renderTotals();
  },

  renderTotals() {
    const sub = this._lines.reduce((s, l) => s + l.total, 0);
    const tax = sub * CONFIG.TAX_RATE;
    const total = sub + tax;
    const el = document.getElementById('q-totals');
    if (!el) return;
    el.innerHTML = `<div class="totals-grid" style="max-width:320px">
      ${tr2('Subtotal', formatCurrency(sub))}
      ${tr2(`GST (${(CONFIG.TAX_RATE*100).toFixed(0)}%)`, formatCurrency(tax))}
      ${tr2('TOTAL', formatCurrency(total), true)}
    </div>`;
    this._totals = { subtotal: sub, tax_amount: tax, total };
  },

  async saveQuote() {
    const bid = document.getElementById('q-building').value;
    if (!bid)             { notify.warn('Select a building.'); return; }
    if (!this._lines.length) { notify.warn('Add at least one line item.'); return; }

    const num = 'Q-' + pad(Date.now().toString().slice(-4));
    const rec = {
      building_id:   bid,
      quote_number:  num,
      title:         document.getElementById('q-title').value,
      status:        'draft',
      created_date:  today(),
      valid_until:   document.getElementById('q-valid').value,
      follow_up_date: document.getElementById('q-followup').value,
      payment_terms: document.getElementById('q-pay-terms').value || 'Net 30',
      line_items:    this._lines,
      subtotal:      this._totals?.subtotal || 0,
      tax_rate:      CONFIG.TAX_RATE,
      tax_amount:    this._totals?.tax_amount || 0,
      total:         this._totals?.total || 0,
      notes:         document.getElementById('q-notes').value,
      internal_notes: document.getElementById('q-int-notes').value,
    };

    try {
      const saved = await DB.create(rec);
      notify.success('Quote saved.');
      navigate(`/quotes/${saved.id}`);
    } catch (e) {
      notify.error(e.message);
    }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading...');
    try {
      const q = await DB.getById(id);
      const b = q.buildings;
      setPageTitle(`Quote ${q.quote_number}`, [{ label: 'Quotes', href: '#/quotes' }, { label: q.quote_number }]);
      container.innerHTML = `<div class="page-wrap">
        <div class="toolbar">
          ${statusBadge(q.status)}
          <div class="toolbar-right">
            <select id="q-status-sel" class="input input-sm" style="max-width:130px">
              ${CONFIG.QUOTE_STATUSES.map(s => `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-secondary" id="q-update-status">Update Status</button>
            <button class="btn btn-sm btn-primary" id="q-pdf-btn">Export PDF</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Quote ${q.quote_number}</h3></div>
          <div class="card-body detail-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
            <div class="detail-field"><span class="detail-label">Building</span><span>${b?.name || '—'}</span></div>
            <div class="detail-field"><span class="detail-label">Client</span><span>${b?.client_name || '—'}</span></div>
            <div class="detail-field"><span class="detail-label">Title</span><span>${q.title || '—'}</span></div>
            <div class="detail-field"><span class="detail-label">Created</span><span>${formatDate(q.created_date)}</span></div>
            <div class="detail-field"><span class="detail-label">Valid Until</span><span>${formatDate(q.valid_until)}</span></div>
            <div class="detail-field"><span class="detail-label">Follow-Up</span><span class="${isOverdue(q.follow_up_date) && q.status === 'sent' ? 'text-danger' : ''}">${formatDate(q.follow_up_date)}</span></div>
          </div>
        </div>
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><h3>Line Items</h3></div>
          <div class="card-body">
            <table class="table">
              <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
              <tbody>${(q.line_items || []).map(l => `<tr>
                <td>${l.description}</td>
                <td>${l.qty}</td>
                <td>${formatCurrency(l.unit_price)}</td>
                <td>${formatCurrency(l.total)}</td>
              </tr>`).join('')}</tbody>
            </table>
            <div class="totals-grid" style="max-width:300px;margin-top:.75rem">
              ${tr2('Subtotal', formatCurrency(q.subtotal))}
              ${tr2(`GST (${((q.tax_rate || CONFIG.TAX_RATE)*100).toFixed(0)}%)`, formatCurrency(q.tax_amount))}
              ${tr2('TOTAL', formatCurrency(q.total), true)}
            </div>
          </div>
        </div>
        ${q.notes ? `<div class="card" style="margin-top:1rem"><div class="card-header"><h3>Notes</h3></div><div class="card-body"><p>${q.notes}</p></div></div>` : ''}
        ${q.internal_notes ? `<div class="card" style="margin-top:1rem;border-left:3px solid var(--warning)"><div class="card-header"><h3>Internal Notes</h3></div><div class="card-body"><p>${q.internal_notes}</p></div></div>` : ''}
      </div>`;

      document.getElementById('q-pdf-btn').onclick = () => {
        if (!window.jspdf) { notify.error('jsPDF not loaded.'); return; }
        generateQuotePDF(q, b);
      };
      document.getElementById('q-update-status').onclick = async () => {
        const status = document.getElementById('q-status-sel').value;
        const upd = { status };
        if (status === 'sent' && !q.sent_date) upd.sent_date = today();
        try {
          await DB.update(id, upd);
          notify.success('Status updated.');
          navigate(`/quotes/${id}`);
        } catch (e) { notify.error(e.message); }
      };
    } catch (e) {
      container.innerHTML = `<div class="page-wrap error-state">${e.message}</div>`;
    }
  },

  async deleteQuote(id) {
    const ok = await confirm('Delete this quote?');
    if (!ok) return;
    try {
      await DB.delete(id);
      notify.success('Quote deleted.');
      await this.loadTable();
    } catch (e) {
      notify.error(e.message);
    }
  },
};

function tr2(l, v, bold = false) {
  return `<div class="totals-row ${bold ? 'totals-row-bold' : ''}"><span>${l}</span><strong>${v}</strong></div>`;
}
