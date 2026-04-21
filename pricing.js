// js/utils/helpers.js — shared utility functions

export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(val));
}

export function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateInput(str) {
  // Returns YYYY-MM-DD for input[type=date]
  if (!str) return '';
  return str.slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < today();
}

export function isDueSoon(dateStr, days = 30) {
  if (!dateStr) return false;
  const diff = daysBetween(today(), dateStr);
  return diff >= 0 && diff <= days;
}

export function genId(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9).toUpperCase();
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function pad(n, len = 4) {
  return String(n).padStart(len, '0');
}

export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? 'Unknown';
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

export function sum(arr, key) {
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

export function statusBadge(status) {
  const map = {
    draft:       'badge-secondary',
    sent:        'badge-info',
    accepted:    'badge-success',
    declined:    'badge-danger',
    expired:     'badge-warning',
    active:      'badge-success',
    inactive:    'badge-secondary',
    open:        'badge-warning',
    quoted:      'badge-info',
    approved:    'badge-primary',
    'in-progress': 'badge-primary',
    complete:    'badge-success',
    critical:    'badge-danger',
    high:        'badge-orange',
    medium:      'badge-warning',
    low:         'badge-secondary',
    good:        'badge-success',
    fair:        'badge-warning',
    poor:        'badge-danger',
    excellent:   'badge-success',
  };
  const cls = map[status?.toLowerCase()] || 'badge-secondary';
  return `<span class="badge ${cls}">${sanitize(status || '—')}</span>`;
}

export function conditionBadge(cond) {
  return statusBadge(cond?.toLowerCase());
}

export function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escapeCSV(r[h])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
