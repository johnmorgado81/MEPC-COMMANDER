// js/modules/dashboard.js
import { setPageTitle } from './app.js';
import { Stats, Equipment, Deficiencies, Quotes } from './db.js';
import { formatCurrency, formatDate, isOverdue, isDueSoon, statusBadge } from './helpers.js';
import { navigate } from './router.js';

export const Dashboard = {
  async init(container) {
    setPageTitle('Dashboard');
    container.innerHTML = `<div class="page-wrap" id="dash-content">
      <div class="kpi-grid" id="kpi-grid">
        ${[1,2,3,4].map(() => '<div class="kpi-card skeleton"></div>').join('')}
      </div>
      <div class="dash-grid">
        <div class="card" id="equip-due-card">
          <div class="card-header"><h3>Equipment Due for Service</h3></div>
          <div class="card-body" id="equip-due-body">Loading...</div>
        </div>
        <div class="card" id="deficiency-card">
          <div class="card-header"><h3>Open Deficiencies</h3></div>
          <div class="card-body" id="def-body">Loading...</div>
        </div>
        <div class="card" id="followup-card">
          <div class="card-header"><h3>Follow-Up Required</h3></div>
          <div class="card-body" id="followup-body">Loading...</div>
        </div>
      </div>
    </div>`;

    await Promise.all([
      this.loadKPIs(),
      this.loadEquipmentDue(),
      this.loadDeficiencies(),
      this.loadFollowUps(),
    ]);
  },

  async loadKPIs() {
    const grid = document.getElementById('kpi-grid');
    try {
      const s = await Stats.getSummary();
      grid.innerHTML = `
        ${kpiCard('Active Buildings', s.activeBuildings, '#2563eb', '/buildings')}
        ${kpiCard('Active Equipment', s.activeEquipment, '#7c3aed', '/equipment')}
        ${kpiCard('Pipeline Value', formatCurrency(s.pipelineValue), '#059669', '/quotes')}
        ${kpiCard('Open Deficiencies', s.openDeficiencies, '#dc2626', '/pm-records')}`;
    } catch (e) {
      grid.innerHTML = `<div class="error-state">Could not load KPIs: ${e.message}</div>`;
    }
  },

  async loadEquipmentDue() {
    const el = document.getElementById('equip-due-body');
    try {
      const equip = await Equipment.getDueForService(60);
      if (!equip.length) { el.innerHTML = '<p class="muted">No equipment due in next 60 days.</p>'; return; }
      el.innerHTML = `<table class="table table-compact">
        <thead><tr><th>Tag</th><th>Type</th><th>Building</th><th>Next Service</th><th></th></tr></thead>
        <tbody>${equip.slice(0, 10).map(e => `<tr>
          <td><strong>${e.tag || '—'}</strong></td>
          <td>${e.equipment_type}</td>
          <td>${e.buildings?.name || '—'}</td>
          <td class="${isOverdue(e.next_service_date) ? 'text-danger' : isDueSoon(e.next_service_date, 14) ? 'text-warning' : ''}">
            ${formatDate(e.next_service_date)}
          </td>
          <td><a href="#/equipment/${e.id}" class="btn btn-xs btn-secondary">View</a></td>
        </tr>`).join('')}</tbody>
      </table>
      ${equip.length > 10 ? `<p class="card-footer-link"><a href="#/equipment">View all ${equip.length} →</a></p>` : ''}`;
    } catch (e) {
      el.innerHTML = `<p class="error-state">${e.message}</p>`;
    }
  },

  async loadDeficiencies() {
    const el = document.getElementById('def-body');
    try {
      const defs = await Deficiencies.getOpen();
      if (!defs.length) { el.innerHTML = '<p class="muted">No open deficiencies.</p>'; return; }
      el.innerHTML = `<table class="table table-compact">
        <thead><tr><th>Priority</th><th>Description</th><th>Building</th><th>Status</th></tr></thead>
        <tbody>${defs.slice(0, 8).map(d => `<tr>
          <td>${statusBadge(d.priority)}</td>
          <td class="truncate" title="${d.description}">${d.description?.slice(0, 60)}${d.description?.length > 60 ? '…' : ''}</td>
          <td>${d.buildings?.name || '—'}</td>
          <td>${statusBadge(d.status)}</td>
        </tr>`).join('')}</tbody>
      </table>
      ${defs.length > 8 ? `<p class="card-footer-link"><a href="#/pm-records">View all ${defs.length} →</a></p>` : ''}`;
    } catch (e) {
      el.innerHTML = `<p class="error-state">${e.message}</p>`;
    }
  },

  async loadFollowUps() {
    const el = document.getElementById('followup-body');
    try {
      const quotes = await Quotes.getFollowUpDue();
      if (!quotes.length) { el.innerHTML = '<p class="muted">No follow-ups due.</p>'; return; }
      el.innerHTML = `<table class="table table-compact">
        <thead><tr><th>Quote #</th><th>Client</th><th>Value</th><th>Follow Up</th><th></th></tr></thead>
        <tbody>${quotes.map(q => `<tr>
          <td><strong>${q.quote_number}</strong></td>
          <td>${q.buildings?.client_name || q.buildings?.name || '—'}</td>
          <td>${formatCurrency(q.total)}</td>
          <td class="text-danger">${formatDate(q.follow_up_date)}</td>
          <td><a href="#/quotes/${q.id}" class="btn btn-xs btn-primary">View</a></td>
        </tr>`).join('')}</tbody>
      </table>`;
    } catch (e) {
      el.innerHTML = `<p class="error-state">${e.message}</p>`;
    }
  },
};

function kpiCard(label, value, color, route) {
  return `<div class="kpi-card" onclick="location.hash='#${route}'" style="cursor:pointer">
    <div class="kpi-value" style="color:${color}">${value}</div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-bar" style="background:${color}22"><div style="width:100%;background:${color};height:3px;border-radius:2px"></div></div>
  </div>`;
}
