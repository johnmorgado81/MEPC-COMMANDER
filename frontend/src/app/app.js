import { CONFIG, syncConfigFromEquipmaster } from '../legacy/config.js';
import { initDB } from '../legacy/db.js';
import { register, start } from './router.js';

const load = {
  Dashboard:   () => import('../legacy/dashboard.js').then(m => m.Dashboard),
  Buildings:   () => import('../legacy/buildings.js').then(m => m.Buildings),
  Equipment:   () => import('../legacy/equipment.js').then(m => m.Equipment),
  Proposals:   () => import('../legacy/proposals.js').then(m => m.Proposals),
  PMRecords:   () => import('../legacy/pm-records.js').then(m => m.PMRecords),
  Quotes:      () => import('../legacy/quotes.js').then(m => m.Quotes),
  Pricing:     () => import('../legacy/pricing.js').then(m => m.Pricing),
  Reporting:   () => import('../legacy/reporting.js').then(m => m.renderReporting),
  DocParser:   () => import('../legacy/document-parser.js').then(m => m.renderDocumentParser),
  MaintItems:  () => import('../legacy/maintenance-items.js').then(m => m.MaintItems),
  Settings:    () => import('../legacy/settings.js').then(m => m.Settings),
  DispatchOCR: () => import('../legacy/dispatch-ocr.js').then(m => m.DispatchOCR),
};

const NAV_ITEMS = [
  { route: '/',                label: 'Dashboard',       icon: '◼' },
  { route: '/buildings',       label: 'Buildings',       icon: '▣' },
  { route: '/equipment',       label: 'Equipment',       icon: '⚙' },
  { route: '/maint-items',     label: 'Items Library',   icon: '☰' },
  { route: '/proposals',       label: 'PM Proposals',    icon: '📋' },
  { route: '/pm-records',      label: 'Service Records', icon: '🔧' },
  { route: '/quotes',          label: 'Quote Funnel',    icon: '💲' },
  { route: '/pricing',         label: 'Pricing Matrix',  icon: '🏷' },
  { route: '/reporting',       label: 'Reporting',       icon: '📊' },
  { route: '/dispatch-ocr',    label: 'Dispatch OCR',    icon: '📷' },
  { route: '/document-parser', label: 'Doc Parser',      icon: '📂' },
  { route: '/settings',        label: 'Settings',        icon: '⚙' },
];

function syncNav() {
  const hash = window.location.hash.replace('#', '') || '/';
  const base = '/' + (hash.split('/')[1] || '');
  document.querySelectorAll('.nav-item').forEach(a =>
    a.classList.toggle('active', a.dataset.route === base || (base === '/' && a.dataset.route === '/'))
  );
  const title = NAV_ITEMS.find(n => n.route === base)?.label || CONFIG.APP_NAME;
  const t = document.getElementById('topbar-title');
  if (t) t.textContent = title;
}

function renderNav() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = NAV_ITEMS.map(n => `
    <a class="nav-item" href="#${n.route}" data-route="${n.route}" title="${n.label}">
      <span class="nav-icon">${n.icon}</span>
      <span class="nav-label">${n.label}</span>
    </a>`).join('');
}

function renderSidebarLogo() {
  const logo = document.getElementById('sidebar-logo');
  if (!logo) return;
  logo.innerHTML = `
    <div class="logo-name">${CONFIG.APP_NAME}</div>
    <div class="logo-sub">${CONFIG.COMPANY.name}</div>`;
}

function registerRoutes() {
  register('/', async (_, el) => { const M = await load.Dashboard(); M.init(el); });
  register('/buildings', async (_, el) => { const M = await load.Buildings(); M.init(el); });
  register('/buildings/:id', async (p, el) => { const M = await load.Buildings(); M.detail(p.id, el); });
  register('/equipment', async (_, el) => { const M = await load.Equipment(); M.init(el); });
  register('/equipment/:id', async (p, el) => { const M = await load.Equipment(); M.detail(p.id, el); });
  register('/maint-items', async (_, el) => { const M = await load.MaintItems(); M.init(el); });
  register('/proposals', async (_, el) => { const M = await load.Proposals(); M.init(el); });
  register('/proposals/new', async (_, el) => { const M = await load.Proposals(); M.create(el); });
  register('/proposals/:id', async (p, el) => { const M = await load.Proposals(); M.detail(p.id, el); });
  register('/pm-records', async (_, el) => { const M = await load.PMRecords(); M.init(el); });
  register('/pm-records/new', async (_, el) => { const M = await load.PMRecords(); M.create(el); });
  register('/pm-records/:id', async (p, el) => { const M = await load.PMRecords(); M.detail(p.id, el); });
  register('/quotes', async (_, el) => { const M = await load.Quotes(); M.init(el); });
  register('/quotes/new', async (_, el) => { const M = await load.Quotes(); M.create(el); });
  register('/quotes/:id', async (p, el) => { const M = await load.Quotes(); M.detail(p.id, el); });
  register('/pricing', async (_, el) => { const M = await load.Pricing(); M.init(el); });
  register('/reporting', async (_, el) => { const fn = await load.Reporting(); fn(el); });
  register('/dispatch-ocr', async (_, el) => { const M = await load.DispatchOCR(); M.init(el); });
  register('/document-parser', async (_, el) => { const fn = await load.DocParser(); fn(el); });
  register('/settings', async (_, el) => { const M = await load.Settings(); M.init(el); });
}

function wireTopbar() {
  document.getElementById('topbar-refresh')?.addEventListener('click', () => {
    const hash = window.location.hash;
    window.location.hash = '#/__refresh';
    setTimeout(() => { window.location.hash = hash || '#/'; }, 50);
  });
}

async function boot() {
  try { initDB(); } catch (e) { console.warn('DB init:', e.message); }
  try {
    const { EQUIPMASTER } = await import('../legacy/equipmaster.js');
    syncConfigFromEquipmaster(EQUIPMASTER);
  } catch (e) { console.warn('EQUIPMASTER:', e.message); }

  renderSidebarLogo();
  renderNav();
  registerRoutes();
  wireTopbar();
  start();
  syncNav();
  window.addEventListener('hashchange', syncNav);
}

document.addEventListener('DOMContentLoaded', boot);
