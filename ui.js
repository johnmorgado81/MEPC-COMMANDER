// js/components/ui.js — toast, modal, confirm dialog

// ── Toast ──────────────────────────────────────────────────
let toastQ = [];
let toastTimer = null;

export function toast(msg, type = 'info', duration = 3500) {
  const area = document.getElementById('toast-area');
  if (!area) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  area.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-show'));
  setTimeout(() => {
    t.classList.remove('toast-show');
    setTimeout(() => t.remove(), 300);
  }, duration);
}

export const notify = {
  success: (m) => toast(m, 'success'),
  error:   (m) => toast(m, 'error', 5000),
  warn:    (m) => toast(m, 'warn'),
  info:    (m) => toast(m, 'info'),
};

// ── Modal ──────────────────────────────────────────────────
let modalCloseCallback = null;

export function openModal(titleOrOpts, bodyHtml, buttonsArr) {
  // Supports two call signatures:
  //   openModal({ title, body, footer, size, onClose })   — original object form
  //   openModal(title, bodyHtml, buttons[])                — new positional form
  let title = '', body = '', footer = '', onClose = null;
  if (typeof titleOrOpts === 'object' && !Array.isArray(titleOrOpts)) {
    ({ title = '', body = '', footer = '', onClose = null } = titleOrOpts);
  } else {
    title = titleOrOpts || '';
    body  = bodyHtml   || '';
    // buttonsArr: [{ label, class, onClick }]
    if (Array.isArray(buttonsArr)) {
      footer = buttonsArr.map((b, i) =>
        `<button class="btn ${b.class || 'btn-secondary'}" data-modal-btn="${i}">${b.label}</button>`
      ).join('');
    } else {
      footer = buttonsArr || '';
    }
  }

  const overlay = document.getElementById('modal-overlay');
  const box     = document.getElementById('modal-box');
  const head    = document.getElementById('modal-header');
  const bodyEl  = document.getElementById('modal-body');
  const footEl  = document.getElementById('modal-footer');

  if (!overlay || !box || !head || !bodyEl || !footEl) {
    console.error('openModal: required DOM elements missing. Check index.html for modal-overlay, modal-box, modal-header, modal-body, modal-footer.');
    return;
  }

  box.className = 'modal-box';
  head.innerHTML = `<span>${title}</span><button class="modal-close" id="modal-close-btn">&times;</button>`;
  bodyEl.innerHTML = body;
  footEl.innerHTML = footer;
  overlay.removeAttribute('hidden');
  modalCloseCallback = onClose || null;

  document.getElementById('modal-close-btn').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  // Wire positional-form button onClick handlers
  if (Array.isArray(buttonsArr)) {
    footEl.querySelectorAll('[data-modal-btn]').forEach(btn => {
      const idx = parseInt(btn.dataset.modalBtn, 10);
      if (buttonsArr[idx]?.onClick) btn.addEventListener('click', buttonsArr[idx].onClick);
    });
  }
}

export function closeModal() {
  document.getElementById('modal-overlay')?.setAttribute('hidden', '');
  if (modalCloseCallback) { try { modalCloseCallback(); } catch {} }
  modalCloseCallback = null;
}

export function getModalBody() {
  return document.getElementById('modal-body');
}

// ── Confirm Dialog ─────────────────────────────────────────
export function confirm(msg) {
  return new Promise(resolve => {
    openModal({
      title: 'Confirm',
      body:  `<p style="margin:0 0 1rem">${msg}</p>`,
      footer: `
        <button class="btn btn-secondary" id="conf-cancel">Cancel</button>
        <button class="btn btn-danger"    id="conf-ok">Confirm</button>`,
    });
    document.getElementById('conf-cancel').onclick = () => { closeModal(); resolve(false); };
    document.getElementById('conf-ok').onclick     = () => { closeModal(); resolve(true);  };
  });
}

// ── Sortable table ─────────────────────────────────────────
export function makeSortable(tableEl) {
  const headers = tableEl.querySelectorAll('th[data-sort]');
  let lastCol = null, dir = 1;
  headers.forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      dir = (lastCol === col) ? dir * -1 : 1;
      lastCol = col;
      headers.forEach(h => h.classList.remove('sort-asc','sort-desc'));
      th.classList.add(dir === 1 ? 'sort-asc' : 'sort-desc');
      sortTable(tableEl, col, dir);
    });
  });
}

function sortTable(table, col, dir) {
  const tbody = table.querySelector('tbody');
  const rows  = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a, b) => {
    const av = a.querySelector(`[data-val="${col}"]`)?.dataset.value ?? a.cells[col]?.textContent ?? '';
    const bv = b.querySelector(`[data-val="${col}"]`)?.dataset.value ?? b.cells[col]?.textContent ?? '';
    return av.localeCompare(bv, undefined, { numeric: true }) * dir;
  });
  rows.forEach(r => tbody.appendChild(r));
}

// ── Filter/search helper ───────────────────────────────────
export function filterTable(inputEl, tableEl) {
  const q = inputEl.value.toLowerCase();
  tableEl.querySelectorAll('tbody tr').forEach(tr => {
    tr.hidden = !tr.textContent.toLowerCase().includes(q);
  });
}

// ── Loading spinner ────────────────────────────────────────
export function spinner(msg = 'Loading...') {
  return `<div class="spinner-wrap"><div class="spinner"></div><span>${msg}</span></div>`;
}

// ── Empty state ────────────────────────────────────────────
export function emptyState(msg, action = '') {
  return `<div class="empty-state"><p>${msg}</p>${action}</div>`;
}

// ── Form helpers ───────────────────────────────────────────
export function getFormData(formEl) {
  const fd = new FormData(formEl);
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

export function setFormData(formEl, data) {
  Object.entries(data).forEach(([k, v]) => {
    const el = formEl.elements[k];
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  });
}

export function selectOptions(arr, valueKey, labelKey, selected = '') {
  return arr.map(item => {
    const v = typeof item === 'object' ? item[valueKey] : item;
    const l = typeof item === 'object' ? item[labelKey] : item;
    return `<option value="${v}" ${v == selected ? 'selected' : ''}>${l}</option>`;
  }).join('');
}
