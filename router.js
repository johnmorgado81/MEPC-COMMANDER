// js/router.js — hash-based SPA router

const routes = new Map();
let current = null;

export function register(path, handler) {
  routes.set(path, handler);
}

export function navigate(path) {
  window.location.hash = path;
}

export function currentRoute() {
  return current;
}

function parse(hash) {
  // e.g. #/buildings/abc-123  => { path: '/buildings/:id', params: { id: 'abc-123' } }
  const raw = hash.replace(/^#/, '') || '/';
  for (const [pattern, handler] of routes) {
    const params = match(pattern, raw);
    if (params !== null) return { pattern, handler, params, raw };
  }
  return null;
}

function match(pattern, path) {
  const pParts = pattern.split('/');
  const rParts = path.split('/');
  if (pParts.length !== rParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(rParts[i]);
    } else if (pParts[i] !== rParts[i]) {
      return null;
    }
  }
  return params;
}

async function dispatch() {
  const hash = window.location.hash || '#/';
  const result = parse(hash);
  const content = document.getElementById('content');
  if (!content) return;

  // Update nav active state
  document.querySelectorAll('[data-route]').forEach(el => {
    const r = el.dataset.route;
    el.classList.toggle('active', hash.startsWith('#' + r) && r !== '/');
    if (r === '/' && hash === '#/') el.classList.add('active');
  });

  if (!result) {
    content.innerHTML = `<div class="page-wrap"><h2>Page not found</h2><p>Route: ${hash}</p></div>`;
    return;
  }

  current = result;
  content.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div><span>Loading...</span></div>';

  try {
    await result.handler(result.params, content);
  } catch (err) {
    console.error('Route error:', err);
    content.innerHTML = `<div class="page-wrap error-state"><h3>Error loading page</h3><pre>${err.message}</pre></div>`;
  }
}

export function start() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}
