// js/app.js — application bootstrap
// BRANCH: PM Quote MVP — full platform modules disabled until further notice
import { CONFIG, syncConfigFromEquipmaster } from './config.js';
import { initDB }     from './db.js';
import { register, start, navigate } from './router.js';
import { Auth, showAuthScreen, hideAuthScreen, renderUserBadge } from './auth.js';

// Lazy-load PM-relevant modules only
// Full-platform modules (pm-records, quotes, reporting, dispatch-ocr, document-parser)
// are intentionally excluded from this branch.
const load = {
  Dashboard:   () => import('./dashboard.js').then(m => m.Dashboard),
  Buildings:   () => import('./buildings.js').then(m => m.Buildings),
  Equipment:   () => import('./equipment.js').then(m => m.Equipment),
  Proposals:   () => import('./proposals.js').then(m => m.Proposals),
  Pricing:     () => import('./pricing.js').then(m => m.Pricing),
  MaintItems:  () => import('./maintenance-items.js').then(m => m.MaintItems),
  Settings:    () => import('./settings.js').then(m => m.Settings),
};

const NAV_ITEMS = [
  { route: '/',            label: 'Dashboard',    icon: '◼' },
  { route: '/buildings',   label: 'Buildings',    icon: '▣' },
  { route: '/equipment',   label: 'Equipment',    icon: '⚙' },
  { route: '/maint-items', label: 'Items Library',icon: '☰' },
  { route: '/proposals',   label: 'PM Proposals', icon: '📋' },
  { route: '/pricing',     label: 'Pricing',      icon: '🏷' },
  { route: '/settings',    label: 'Settings',     icon: '⚙' },
];

// ─── Active nav highlight ───────────────────────────────────────────────────
function syncNav() {
  const hash  = window.location.hash.replace('#','') || '/';
  const base  = '/' + (hash.split('/')[1] || '');
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.route === base || (base === '/' && a.dataset.route === '/'));
  });
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

// ─── Route registration — PM Quote MVP only ─────────────────────────────────
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
  register('/pricing', async (_, el) => { const M = await load.Pricing(); M.init(el); });
  register('/settings', async (_, el) => { const M = await load.Settings(); M.init(el); });
}

export function setPageTitle(title, crumbs = []) {
  const t = document.getElementById('topbar-title');
  if (t) t.textContent = title;
}

// ─── Topbar refresh button ───────────────────────────────────────────────────
function wireTopbar() {
  document.getElementById('topbar-refresh')?.addEventListener('click', () => {
    const hash = window.location.hash;
    window.location.hash = '#/__refresh';
    setTimeout(() => { window.location.hash = hash || '#/'; }, 50);
  });
}

// ─── Auth guard + boot ──────────────────────────────────────────────────────
async function boot() {
  try { initDB(); } catch(e) { console.warn("DB init failed:", e.message); }
  try {
    const { EQUIPMASTER } = await import('./equipmaster.js');
    syncConfigFromEquipmaster(EQUIPMASTER);
  } catch(e) { console.warn("EQUIPMASTER sync failed:", e.message); }
  renderSidebarLogo();
  renderNav();
  registerRoutes();
  wireTopbar();

  let _routerStarted = false;
  Auth.onAuthChange((event, session) => {
    console.log('[auth] onAuthChange:', event, session ? 'session' : 'no session');
    if (session) {
      hideAuthScreen();
      renderUserBadge(session.user);
      if (!_routerStarted) {
        _routerStarted = true;
        start();
        syncNav();
        window.addEventListener('hashchange', syncNav);
      }
    } else {
      showAuthScreen();
    }
  });

  const session = await Auth.getSession();
  console.log('[auth] boot session:', session ? 'found' : 'none');

  if (session) {
    hideAuthScreen();
    renderUserBadge(session.user);
    start();
    syncNav();
    window.addEventListener('hashchange', syncNav);
  } else {
    showAuthScreen();
  }
}

document.addEventListener('DOMContentLoaded', boot);
