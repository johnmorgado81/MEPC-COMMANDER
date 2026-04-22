export function setPageTitle(title) {
  const el = document.getElementById('topbar-title');
  if (el) el.textContent = title || 'MEPC Commander';
}
