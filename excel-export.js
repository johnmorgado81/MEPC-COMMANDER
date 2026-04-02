// excel-export.js — PM Proposal Excel Export
// Uses pm-engine as single source of truth — no independent calculations here.
// Requires SheetJS (window.XLSX) loaded in index.html.

import { CONFIG } from './config.js';
import {
  buildScheduleARows, summarizeProposal, buildScheduleB,
  summarizeSubcontractPackages, formatAnnualWords,
  PM_QUARTERLY_VISITS, PM_SELL_RATE, PM_SUB_MARKUP,
} from './pm-engine.js';

// ─── Cell helpers ─────────────────────────────────────────────────────────────
function money(v) { return { v: +(Number(v)||0).toFixed(2), t:'n', z:'"$"#,##0.00' }; }
function num(v)   { return { v: Number(v)||0, t:'n' }; }
function hrs(v)   { return { v: +(Number(v)||0).toFixed(2), t:'n', z:'0.00' }; }
function pct(v)   { return { v: Number(v)||0, t:'n', z:'0%' }; }
function str(v)   { return String(v ?? ''); }

function sheet(headers, rows) {
  const data = [headers.map(h => ({ v: h, t:'s' })), ...rows];
  const ws   = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.min(Math.max(String(h).length + 2,
      ...rows.map(r => String(r[i]?.v ?? r[i] ?? '').length + 1)), 48),
  }));
  return ws;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function exportProposalExcel(proposal, building) {
  const wb        = XLSX.utils.book_new();
  const scope     = proposal.scope_items          || [];
  const subs      = proposal.subcontractor_items  || [];

  // All math flows through engine
  const summary   = summarizeProposal(scope, subs);
  const schedARows = buildScheduleARows(scope);
  const schedB    = buildScheduleB(scope, CONFIG.COMPANY);
  const subPkgs   = summarizeSubcontractPackages(subs);

  const co = building || {};

  // ── Tab 1: Summary ──────────────────────────────────────────────────────────
  const summaryData = [
    [{ v:'PREVENTIVE MAINTENANCE PROPOSAL', t:'s' }],
    [],
    ['Proposal #',         str(proposal.proposal_number)],
    ['Building',           str(co.name)],
    ['Client',             str(co.client_name || co.client_company)],
    ['Address',            str([co.address, co.city, co.province].filter(Boolean).join(', '))],
    ['Frequency',          str(proposal.frequency)],
    ['Service Visits/yr',  num(proposal.visits_per_year || PM_QUARTERLY_VISITS)],
    ['Created',            str(proposal.created_date)],
    ['Valid Until',        str(proposal.valid_until)],
    [],
    ['PRICING SUMMARY'],
    ['Equipment PM Labour (Annual)',     money(summary.equipAnnual)],
    ['Subcontracted Services (Annual)',  money(summary.subAnnual)],
    ['Recurring Annual Subtotal',        money(summary.recurring)],
    [`GST (${(CONFIG.TAX_RATE*100).toFixed(0)}%)`, money(summary.tax)],
    ['Total Annual (incl. GST)',         money(summary.total)],
    ['Monthly Billing (incl. GST)',      money(summary.monthly * (1 + CONFIG.TAX_RATE))],
    ['One-Time Charges (excl. GST)',     money(summary.oneTime)],
    ['Total Annual Hours (labour)',      hrs(summary.totalHours)],
    [],
    ['Annual Contract Value',            money(summary.recurring)],
    ['In Words',                         str(formatAnnualWords(summary.recurring))],
    [],
    ['NOTES'],
    [str(`Hour formula: (Quarterly Hours × 3) + Annual Hours per asset`)],
    [str(`Sell rate: $${PM_SELL_RATE.toFixed(2)}/hr (internal labour)`)],
    [str(`Subcontract markup: ${(PM_SUB_MARKUP*100).toFixed(0)}% on all subcontractor costs`)],
    [str('Subcontractor raw costs are internal only — not included in client-facing documents')],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{wch:38},{wch:30}];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ── Tab 2: Schedule A — Equipment Pricing ───────────────────────────────────
  const aHeaders = [
    'Tag','Equipment Type','System / Category','Qty',
    'QH / Unit','AH / Unit','Hour Formula','Annual Total Hrs',
    'Annual Sell','Monthly Allocation','Match Confidence','Override?','Review Flag',
  ];
  const aRows = schedARows.map(r => [
    str(r.tag),
    str(r.equipment_type),
    str(r.category),
    num(r.qty),
    hrs(r.qH),
    hrs(r.aH),
    str(`(${r.qH}×3)+${r.aH}×${r.qty}`),
    hrs(r.totH),
    money(r.annualPrice),
    money(r.monthly),
    str(r.conf),
    str(r.overridden ? 'YES — manual override' : ''),
    str(r.needsReview ? '⚠ Review required' : ''),
  ]);
  // Totals row
  aRows.push([
    str('TOTAL'), str(''), str(''), str(''), str(''), str(''), str(''),
    hrs(summary.totalHours),
    money(summary.equipAnnual),
    money(summary.equipAnnual / 12),
    str(''), str(''), str(''),
  ]);
  XLSX.utils.book_append_sheet(wb, sheet(aHeaders, aRows), 'Schedule A — Equipment');

  // ── Tab 3: Packages (Subcontractors) — internal use ─────────────────────────
  const pkgHeaders = [
    'Package / Vendor','Scope Category','Type',
    'Sub Cost/yr (Internal — DO NOT SHARE)','Markup %','Sell Price/yr','Monthly',
  ];
  const pkgRows = subPkgs.length
    ? subPkgs.map(s => [
        str(s.label), str(s.scope),
        str(s.recurring ? 'Annual Recurring' : 'One-Time'),
        money(s.sub_cost),
        pct(s.markup_pct),
        money(s.sell),
        s.recurring ? money(s.sell / 12) : str('One-Time'),
      ])
    : [['No subcontracted packages','','','','','','']];
  // Sub totals
  const subRecurring = subPkgs.filter(s=>s.recurring).reduce((t,s)=>t+s.sell,0);
  const subOneTime   = subPkgs.filter(s=>!s.recurring).reduce((t,s)=>t+s.sell,0);
  pkgRows.push([str('RECURRING TOTAL'),str(''),str(''),str(''),str(''),money(subRecurring),money(subRecurring/12)]);
  pkgRows.push([str('ONE-TIME TOTAL'), str(''),str(''),str(''),str(''),money(subOneTime),str('One-Time')]);
  XLSX.utils.book_append_sheet(wb, sheet(pkgHeaders, pkgRows), 'Packages (Internal)');

  // ── Tab 4: Schedule B text ──────────────────────────────────────────────────
  const bRows = [];
  schedB.forEach(sec => {
    bRows.push([{ v: sec.title, t:'s' }, str('')]);
    sec.items.forEach(item => bRows.push([str(''), str(item)]));
    bRows.push([str(''), str('')]);
  });
  const wsBSheet = XLSX.utils.aoa_to_sheet([[str('Section')],[str('Item')], ...bRows]);
  wsBSheet['!cols'] = [{wch:28},{wch:90}];
  XLSX.utils.book_append_sheet(wb, wsBSheet, 'Schedule B — Scope');

  // ── Tab 5: Mapping Logic ────────────────────────────────────────────────────
  const mapHeaders = [
    'Tag','Equipment Type','EQUIPMASTER Match','Confidence',
    'QH Source','AH Source','Override Applied','Review Required',
  ];
  const mapRows = schedARows.map(r => {
    const item = scope.find(i => i.tag === r.tag && i.equipment_type === r.equipment_type) || {};
    const qhSrc = item.override_quarterly_hours != null ? 'Override'
                : item.quarterly_hours          != null ? 'Equipment Record'
                : r.match                               ? 'EQUIPMASTER'
                : 'Default';
    const ahSrc = item.override_annual_hours != null ? 'Override'
                : item.annual_hours          != null ? 'Equipment Record'
                : r.match                            ? 'EQUIPMASTER'
                : 'Default';
    return [
      str(r.tag),
      str(r.equipment_type),
      str(r.match?.equipment_type || '— no match —'),
      str(r.conf),
      str(qhSrc), str(ahSrc),
      str(r.overridden ? 'Yes' : 'No'),
      str(r.needsReview ? 'YES' : 'No'),
    ];
  });
  XLSX.utils.book_append_sheet(wb, sheet(mapHeaders, mapRows), 'Mapping Logic');

  // ── Write ───────────────────────────────────────────────────────────────────
  const fname = `Proposal-${proposal.proposal_number||'Draft'}-${(co.name||'Building').replace(/[^a-zA-Z0-9]/g,'-')}.xlsx`;
  XLSX.writeFile(wb, fname);
}
