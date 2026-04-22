// reporting.js — Revenue, Equipment, Deficiency, PM Compliance reports

import { Stats, Equipment, Deficiencies, Quotes, Proposals, PMRecords } from './db.js';
import { formatCurrency, formatDate } from './helpers.js';
import { emptyState, spinner } from './ui.js';

let revenueChart = null;
let conditionChart = null;

export async function renderReporting(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Reporting</h1>
      <div class="tab-bar">
        <button class="tab-btn active" data-tab="revenue">Revenue</button>
        <button class="tab-btn" data-tab="equipment">Equipment</button>
        <button class="tab-btn" data-tab="deficiencies">Deficiencies</button>
        <button class="tab-btn" data-tab="compliance">PM Compliance</button>
      </div>
    </div>
    <div id="report-content"></div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTab(btn.dataset.tab);
    });
  });

  loadTab('revenue');
}

function loadTab(tab) {
  const el = document.getElementById('report-content');
  el.innerHTML = spinner();
  const map = {
    revenue: renderRevenue,
    equipment: renderEquipment,
    deficiencies: renderDeficiencies,
    compliance: renderCompliance,
  };
  (map[tab] || renderRevenue)(el);
}

// --- Revenue ---
async function renderRevenue(el) {
  try {
    const [revenueData, quotes, proposals] = await Promise.all([
      Stats.getRevenueByMonth(),
      Quotes.getAll(),
      Proposals.getAll(),
    ]);

    const activeContracts = proposals.filter(p => p.status === 'active');
    const annualContractValue = activeContracts.reduce((s, p) => s + (p.annual_value || 0), 0);
    const openQuoteValue = quotes.filter(q => q.status === 'sent' || q.status === 'draft')
      .reduce((s, q) => s + (q.total || 0), 0);
    const wonQuotes = quotes.filter(q => q.status === 'accepted');
    const wonValue = wonQuotes.reduce((s, q) => s + (q.total || 0), 0);
    const allClosedQuotes = quotes.filter(q => ['accepted','declined','expired'].includes(q.status));
    const winRate = allClosedQuotes.length
      ? Math.round((wonQuotes.length / allClosedQuotes.length) * 100)
      : 0;

    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Annual Contract Value</div>
          <div class="kpi-value">${formatCurrency(annualContractValue)}</div>
          <div class="kpi-sub">${activeContracts.length} active contracts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Open Quote Pipeline</div>
          <div class="kpi-value">${formatCurrency(openQuoteValue)}</div>
          <div class="kpi-sub">Sent + draft quotes</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Quotes Won (All Time)</div>
          <div class="kpi-value">${formatCurrency(wonValue)}</div>
          <div class="kpi-sub">${wonQuotes.length} quotes accepted</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Win Rate</div>
          <div class="kpi-value">${winRate}%</div>
          <div class="kpi-sub">Closed quotes</div>
        </div>
      </div>
      <div class="report-card">
        <h3>Monthly Revenue (Last 12 Months)</h3>
        <canvas id="revenueChart" height="100"></canvas>
      </div>
      <div class="report-card">
        <h3>Quote Status Breakdown</h3>
        <canvas id="quoteStatusChart" height="80"></canvas>
      </div>
    `;

    buildRevenueChart(revenueData);
    buildQuoteStatusChart(quotes);
  } catch (e) {
    el.innerHTML = `<div class="error-msg">Failed to load revenue data: ${e.message}</div>`;
  }
}

function buildRevenueChart(data) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  if (revenueChart) revenueChart.destroy();

  const months = data.map(d => d.month);
  const values = data.map(d => d.total || 0);

  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Revenue ($)',
        data: values,
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: 'rgba(59,130,246,1)',
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => '$' + v.toLocaleString() } }
      }
    }
  });
}

function buildQuoteStatusChart(quotes) {
  const ctx = document.getElementById('quoteStatusChart');
  if (!ctx) return;

  const statusCounts = {};
  quotes.forEach(q => { statusCounts[q.status] = (statusCounts[q.status] || 0) + 1; });

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'],
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'right' } }
    }
  });
}

// --- Equipment ---
async function renderEquipment(el) {
  try {
    const equipment = await Equipment.getAll();
    const conditionMap = {};
    const typeMap = {};

    equipment.forEach(e => {
      conditionMap[e.condition || 'Unknown'] = (conditionMap[e.condition || 'Unknown'] || 0) + 1;
      typeMap[e.equipment_type || 'Other'] = (typeMap[e.equipment_type || 'Other'] || 0) + 1;
    });

    const now = new Date();
    const overdue = equipment.filter(e => e.next_service_date && new Date(e.next_service_date) < now);
    const dueSoon = equipment.filter(e => {
      if (!e.next_service_date) return false;
      const d = new Date(e.next_service_date);
      const diff = (d - now) / 86400000;
      return diff >= 0 && diff <= 30;
    });
    const underContract = equipment.filter(e => e.under_contract);

    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Equipment</div>
          <div class="kpi-value">${equipment.length}</div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-label">Overdue Service</div>
          <div class="kpi-value">${overdue.length}</div>
        </div>
        <div class="kpi-card kpi-warn">
          <div class="kpi-label">Due Within 30 Days</div>
          <div class="kpi-value">${dueSoon.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Under Contract</div>
          <div class="kpi-value">${underContract.length}</div>
        </div>
      </div>
      <div class="report-grid-2">
        <div class="report-card">
          <h3>Condition Summary</h3>
          <canvas id="conditionChart" height="160"></canvas>
        </div>
        <div class="report-card">
          <h3>Equipment by Type</h3>
          <canvas id="typeChart" height="160"></canvas>
        </div>
      </div>
      <div class="report-card">
        <h3>Overdue Service List</h3>
        ${overdue.length === 0 ? emptyState('All equipment is up to date') : `
        <table class="data-table">
          <thead><tr><th>Tag</th><th>Type</th><th>Building</th><th>Next Service</th><th>Days Overdue</th></tr></thead>
          <tbody>
            ${overdue.map(e => {
              const days = Math.floor((now - new Date(e.next_service_date)) / 86400000);
              return `<tr>
                <td>${e.tag || '—'}</td>
                <td>${e.equipment_type}</td>
                <td>${e.building_id}</td>
                <td>${formatDate(e.next_service_date)}</td>
                <td><span class="badge badge-danger">${days}d overdue</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`}
      </div>
    `;

    new Chart(document.getElementById('conditionChart'), {
      type: 'pie',
      data: {
        labels: Object.keys(conditionMap),
        datasets: [{ data: Object.values(conditionMap), backgroundColor: ['#10b981','#3b82f6','#f59e0b','#ef4444','#6b7280'] }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    new Chart(document.getElementById('typeChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(typeMap),
        datasets: [{ label: 'Count', data: Object.values(typeMap), backgroundColor: 'rgba(99,102,241,0.7)' }]
      },
      options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
  } catch (e) {
    el.innerHTML = `<div class="error-msg">Failed to load equipment data: ${e.message}</div>`;
  }
}

// --- Deficiencies ---
async function renderDeficiencies(el) {
  try {
    const deficiencies = await Deficiencies.getAll();
    const open = deficiencies.filter(d => d.status !== 'resolved');
    const now = new Date();

    const aging = { '0-7': 0, '8-30': 0, '31-90': 0, '90+': 0 };
    open.forEach(d => {
      const days = Math.floor((now - new Date(d.identified_date)) / 86400000);
      if (days <= 7) aging['0-7']++;
      else if (days <= 30) aging['8-30']++;
      else if (days <= 90) aging['31-90']++;
      else aging['90+']++;
    });

    const priorityMap = {};
    open.forEach(d => { priorityMap[d.priority || 'Unknown'] = (priorityMap[d.priority || 'Unknown'] || 0) + 1; });

    const totalEstCost = open.reduce((s, d) => s + (d.estimated_cost || 0), 0);
    const critical = open.filter(d => d.priority === 'Critical' || d.priority === 'High');

    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Open Deficiencies</div>
          <div class="kpi-value">${open.length}</div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-label">Critical / High Priority</div>
          <div class="kpi-value">${critical.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Estimated Repair Value</div>
          <div class="kpi-value">${formatCurrency(totalEstCost)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Resolved (All Time)</div>
          <div class="kpi-value">${deficiencies.filter(d => d.status === 'resolved').length}</div>
        </div>
      </div>
      <div class="report-grid-2">
        <div class="report-card">
          <h3>Aging Breakdown</h3>
          <canvas id="agingChart" height="160"></canvas>
        </div>
        <div class="report-card">
          <h3>By Priority</h3>
          <canvas id="priorityChart" height="160"></canvas>
        </div>
      </div>
      <div class="report-card">
        <h3>Open Deficiencies — Detail</h3>
        <table class="data-table">
          <thead><tr><th>Priority</th><th>Building</th><th>Description</th><th>Identified</th><th>Est. Cost</th><th>Status</th></tr></thead>
          <tbody>
            ${open.length === 0 ? '<tr><td colspan="6">No open deficiencies</td></tr>' :
              open.sort((a,b) => {
                const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
                return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
              }).map(d => `<tr>
                <td><span class="badge badge-${d.priority === 'Critical' ? 'danger' : d.priority === 'High' ? 'warn' : 'info'}">${d.priority}</span></td>
                <td>${d.building_id}</td>
                <td>${d.description}</td>
                <td>${formatDate(d.identified_date)}</td>
                <td>${d.estimated_cost ? formatCurrency(d.estimated_cost) : '—'}</td>
                <td>${d.status}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    new Chart(document.getElementById('agingChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(aging),
        datasets: [{ label: 'Days Open', data: Object.values(aging), backgroundColor: ['#10b981','#f59e0b','#f97316','#ef4444'] }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    new Chart(document.getElementById('priorityChart'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(priorityMap),
        datasets: [{ data: Object.values(priorityMap), backgroundColor: ['#ef4444','#f97316','#f59e0b','#10b981','#6b7280'] }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  } catch (e) {
    el.innerHTML = `<div class="error-msg">Failed to load deficiency data: ${e.message}</div>`;
  }
}

// --- PM Compliance ---
async function renderCompliance(el) {
  try {
    const [equipment, records] = await Promise.all([
      Equipment.getAll(),
      PMRecords.getAll(),
    ]);

    const now = new Date();
    const contractEquipment = equipment.filter(e => e.under_contract && e.status === 'active');
    const overdue = contractEquipment.filter(e => e.next_service_date && new Date(e.next_service_date) < now);
    const compliant = contractEquipment.filter(e => !e.next_service_date || new Date(e.next_service_date) >= now);
    const complianceRate = contractEquipment.length
      ? Math.round((compliant.length / contractEquipment.length) * 100)
      : 0;

    const recordsByMonth = {};
    records.forEach(r => {
      const m = r.service_date ? r.service_date.substring(0, 7) : 'Unknown';
      recordsByMonth[m] = (recordsByMonth[m] || 0) + 1;
    });

    const sortedMonths = Object.keys(recordsByMonth).sort().slice(-12);

    el.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Contract Equipment</div>
          <div class="kpi-value">${contractEquipment.length}</div>
        </div>
        <div class="kpi-card ${complianceRate >= 90 ? 'kpi-good' : complianceRate >= 70 ? 'kpi-warn' : 'kpi-danger'}">
          <div class="kpi-label">Compliance Rate</div>
          <div class="kpi-value">${complianceRate}%</div>
          <div class="kpi-sub">Up-to-date service</div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-label">Overdue (Under Contract)</div>
          <div class="kpi-value">${overdue.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total PM Records</div>
          <div class="kpi-value">${records.length}</div>
        </div>
      </div>
      <div class="report-card">
        <h3>PM Records per Month</h3>
        <canvas id="pmMonthChart" height="90"></canvas>
      </div>
      <div class="report-card">
        <h3>Overdue Contract Equipment</h3>
        ${overdue.length === 0 ? emptyState('All contract equipment is current') : `
        <table class="data-table">
          <thead><tr><th>Tag</th><th>Type</th><th>Next Service</th><th>Days Overdue</th></tr></thead>
          <tbody>
            ${overdue.map(e => {
              const days = Math.floor((now - new Date(e.next_service_date)) / 86400000);
              return `<tr>
                <td>${e.tag || '—'}</td>
                <td>${e.equipment_type}</td>
                <td>${formatDate(e.next_service_date)}</td>
                <td><span class="badge badge-danger">${days}d</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`}
      </div>
    `;

    new Chart(document.getElementById('pmMonthChart'), {
      type: 'line',
      data: {
        labels: sortedMonths,
        datasets: [{
          label: 'PM Records',
          data: sortedMonths.map(m => recordsByMonth[m] || 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.3,
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  } catch (e) {
    el.innerHTML = `<div class="error-msg">Failed to load compliance data: ${e.message}</div>`;
  }
}
