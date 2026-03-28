// js/modules/pricing.js
import { setPageTitle }   from '../app.js';
import { PricingMatrix }  from '../db.js';
import { CONFIG }         from '../config.js';
import { formatCurrency } from '../helpers.js';
import { confirm, notify, spinner } from './ui.js';

const FREQS = ['annual','semi-annual','quarterly','monthly'];

export const Pricing = {

  async init(container) {
    setPageTitle('Pricing Matrix');
    container.innerHTML = `<div class="page-wrap">
      <div class="card">
        <div class="card-header">
          <h3>PM Pricing Matrix</h3>
          <div>
            <button class="btn btn-sm btn-secondary" id="price-seed">Load Defaults</button>
            <button class="btn btn-sm btn-primary" id="price-add">+ Add Entry</button>
          </div>
        </div>
        <p style="padding:.5rem 1rem;margin:0;color:var(--text-secondary);font-size:13px">
          Prices shown are annual sell prices per equipment per year. Edit any cell inline and click Save.
        </p>
        <div id="price-matrix-wrap">${spinner()}</div>
      </div>
    </div>`;

    await this.loadMatrix();
    document.getElementById('price-add').onclick  = () => this.openForm();
    document.getElementById('price-seed').onclick = () => this.seedDefaults();
  },

  async loadMatrix() {
    const wrap = document.getElementById('price-matrix-wrap');
    try {
      const rows = await PricingMatrix.getAll();
      if (!rows.length) {
        wrap.innerHTML = `<div style="padding:2rem;text-align:center">
          <p class="muted">No pricing data yet.</p>
          <button class="btn btn-primary" id="seed-btn-empty">Load Default Pricing</button>
        </div>`;
        document.getElementById('seed-btn-empty')?.addEventListener('click', () => this.seedDefaults());
        return;
      }

      // Build pivot: equipment_type => { freq => row }
      const pivot = {};
      rows.forEach(r => {
        if (!pivot[r.equipment_type]) pivot[r.equipment_type] = {};
        pivot[r.equipment_type][r.service_frequency] = r;
      });

      const types = Object.keys(pivot).sort();

      wrap.innerHTML = `<div style="overflow-x:auto">
        <table class="table" id="price-table">
          <thead>
            <tr>
              <th style="min-width:220px">Equipment Type</th>
              ${FREQS.map(f => `<th style="text-align:right">${capitalize(f)}</th>`).join('')}
              <th>Margin %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${types.map(type => {
              const rowEntries = FREQS.map(f => pivot[type][f]);
              const firstRow = rowEntries.find(r => r);
              return `<tr data-type="${type}">
                <td><strong>${type}</strong></td>
                ${FREQS.map(f => {
                  const r = pivot[type][f];
                  return r
                    ? `<td style="text-align:right">
                        <input type="number" class="input input-sm price-cell"
                          data-id="${r.id}" data-type="${type}" data-freq="${f}"
                          value="${Number(r.sell_price || r.base_price).toFixed(2)}"
                          style="width:90px;text-align:right">
                       </td>`
                    : `<td style="text-align:right;color:#94a3b8">—</td>`;
                }).join('')}
                <td>${firstRow ? firstRow.margin_pct + '%' : '—'}</td>
                <td class="actions">
                  <button class="btn btn-xs btn-primary" data-type="${type}">Save</button>
                  <button class="btn btn-xs btn-danger" data-del-type="${type}">Del</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

      // Save row
      wrap.querySelectorAll('[data-type]').forEach(btn => {
        if (!btn.classList.contains('btn')) return;
        btn.onclick = async () => {
          const type = btn.dataset.type;
          const cells = wrap.querySelectorAll(`.price-cell[data-type="${type}"]`);
          const promises = Array.from(cells).map(inp =>
            PricingMatrix.upsert({
              equipment_type: inp.dataset.type,
              service_frequency: inp.dataset.freq,
              base_price: Number(inp.value),
              sell_price: Number(inp.value),
              active: true,
            })
          );
          try {
            await Promise.all(promises);
            notify.success('Pricing saved.');
          } catch (e) { notify.error(e.message); }
        };
      });

      wrap.querySelectorAll('[data-del-type]').forEach(btn => {
        btn.onclick = async () => {
          const ok = await confirm(`Delete all pricing for "${btn.dataset.delType}"?`);
          if (!ok) return;
          const type = btn.dataset.delType;
          const cells = wrap.querySelectorAll(`.price-cell[data-type="${type}"]`);
          try {
            await Promise.all(Array.from(cells).map(inp => PricingMatrix.delete(inp.dataset.id)));
            notify.success('Deleted.');
            await this.loadMatrix();
          } catch (e) { notify.error(e.message); }
        };
      });
    } catch (e) {
      wrap.innerHTML = `<div class="error-state">${e.message}</div>`;
    }
  },

  openForm() {
    const { openModal, closeModal, getFormData } = require('../components/ui.js');
    // Simple open — reuse inline since we're module-based
    const overlay = document.getElementById('modal-overlay');
    const box     = document.getElementById('modal-box');
    const head    = document.getElementById('modal-header');
    const body    = document.getElementById('modal-body');
    const foot    = document.getElementById('modal-footer');
    box.className = 'modal-box modal-md';
    head.innerHTML = `<span>Add Pricing Entry</span><button class="modal-close" onclick="document.getElementById('modal-overlay').setAttribute('hidden','')">✕</button>`;
    body.innerHTML = `<form id="price-form" class="form-grid">
      <div class="form-group full-width">
        <label>Equipment Type *</label>
        <select name="equipment_type" class="input" required>
          ${CONFIG.EQUIPMENT_TYPES.map(t => `<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Frequency *</label>
          <select name="service_frequency" class="input">
            ${FREQS.map(f => `<option>${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Sell Price (Annual $)</label>
          <input name="sell_price" type="number" class="input" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Overhead %</label>
          <input name="overhead_pct" type="number" class="input" value="20">
        </div>
        <div class="form-group">
          <label>Margin %</label>
          <input name="margin_pct" type="number" class="input" value="30">
        </div>
      </div>
    </form>`;
    foot.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modal-overlay').setAttribute('hidden','')">Cancel</button>
                      <button class="btn btn-primary" id="price-save-ok">Save</button>`;
    overlay.removeAttribute('hidden');

    document.getElementById('price-save-ok').onclick = async () => {
      const form = document.getElementById('price-form');
      const data = {};
      new FormData(form).forEach((v, k) => data[k] = v);
      data.base_price = Number(data.sell_price);
      data.active = true;
      try {
        await PricingMatrix.upsert(data);
        overlay.setAttribute('hidden', '');
        notify.success('Pricing entry saved.');
        await this.loadMatrix();
      } catch (e) { notify.error(e.message); }
    };
  },

  async seedDefaults() {
    const defaults = [
      ['Boiler — Hot Water',   'annual',      550, 20, 30],
      ['Boiler — Hot Water',   'semi-annual', 350, 20, 30],
      ['Boiler — Hot Water',   'quarterly',   200, 20, 30],
      ['Boiler — Steam',       'annual',      650, 20, 30],
      ['Boiler — Steam',       'semi-annual', 400, 20, 30],
      ['Chiller',              'annual',     1000, 20, 30],
      ['Chiller',              'semi-annual', 600, 20, 30],
      ['Cooling Tower',        'annual',      800, 20, 30],
      ['Cooling Tower',        'semi-annual', 500, 20, 30],
      ['AHU / RTU',            'annual',      450, 20, 30],
      ['AHU / RTU',            'semi-annual', 280, 20, 30],
      ['AHU / RTU',            'quarterly',   160, 20, 30],
      ['Make-Up Air Unit',     'annual',      600, 20, 30],
      ['Make-Up Air Unit',     'semi-annual', 380, 20, 30],
      ['Fan Coil Unit',        'annual',      180, 20, 30],
      ['Fan Coil Unit',        'semi-annual', 120, 20, 30],
      ['Water Source Heat Pump','annual',     220, 20, 30],
      ['Circulation Pump',     'annual',      200, 20, 30],
      ['Circulation Pump',     'semi-annual', 130, 20, 30],
      ['Plate Heat Exchanger', 'annual',      280, 20, 30],
      ['Expansion Tank',       'annual',      130, 20, 30],
      ['Backflow Preventer',   'annual',      200, 20, 30],
      ['Pressure Reducing Valve','annual',    150, 20, 30],
      ['Domestic Water Heater','annual',      280, 20, 30],
      ['Exhaust Fan',          'annual',      160, 20, 30],
      ['Split System / DX',    'annual',      320, 20, 30],
      ['Split System / DX',    'semi-annual', 200, 20, 30],
      ['VRF System',           'annual',      900, 20, 30],
    ];

    try {
      await Promise.all(defaults.map(([equipment_type, service_frequency, sell_price, overhead_pct, margin_pct]) =>
        PricingMatrix.upsert({ equipment_type, service_frequency, base_price: sell_price, sell_price, overhead_pct, margin_pct, active: true })
      ));
      notify.success('Default pricing loaded.');
      await this.loadMatrix();
    } catch (e) {
      notify.error(e.message);
    }
  },
};

function capitalize(s) {
  return s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('-');
}
