// pdf-export.js — PM Quote MVP
// generateProposalPDFEnhanced: subcontractor sell prices roll into total; costs never exposed.
import { CONFIG } from './config.js';
import { formatCurrency, formatDate } from './helpers.js';

function getjsPDF() { return window.jspdf.jsPDF; }

function addHeader(doc, title, subtitle = '') {
  const co = CONFIG.COMPANY;
  doc.setFillColor(24, 33, 47);
  doc.rect(0, 0, 215.9, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(co.name, 12, 12);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${co.phone}  |  ${co.email}  |  ${co.website}`, 12, 18);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(title, 215.9 - 12, 12, { align: 'right' });
  if (subtitle) { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(subtitle, 215.9 - 12, 18, { align: 'right' }); }
  doc.setTextColor(0);
  return 28;
}

function addFooter(doc, pageNum) {
  const co = CONFIG.COMPANY;
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text(`${co.name}  |  ${co.address}, ${co.city}, ${co.province}  |  GST ${co.gst}`, 12, 287);
  doc.text(`Page ${pageNum}`, 215.9 - 12, 287, { align: 'right' });
  doc.setTextColor(0);
}

function defaultTerms() {
  return `This proposal is valid for ${CONFIG.PROPOSAL_VALID_DAYS} days from the date of issue. ` +
    `All preventive maintenance services are performed during regular business hours (Monday–Friday, 7:30am–4:30pm). ` +
    `Emergency or after-hours calls are billed separately at applicable rates. ` +
    `Deficiencies identified during service are not included in the preventive maintenance fee and will be quoted separately for approval. ` +
    `Payment terms: Net 30 from invoice date. Overdue balances are subject to 2% monthly interest. ` +
    `All prices are in Canadian Dollars and exclusive of applicable taxes unless otherwise stated.`;
}

// ── Basic PM Proposal PDF (legacy — used by proposals.js detail view) ──────
export function generateProposalPDF(proposal, building) {
  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit: 'mm', format: 'letter' });
  let y = addHeader(doc, 'PREVENTIVE MAINTENANCE PROPOSAL', `#${proposal.proposal_number}`);

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Prepared For:', 12, y);
  doc.setFont('helvetica', 'normal'); y += 5;
  doc.text(building.client_name || building.name, 12, y); y += 5;
  if (building.client_company) { doc.text(building.client_company, 12, y); y += 5; }
  if (building.address) { doc.text(building.address, 12, y); y += 5; }

  const details = [
    ['Date:', formatDate(proposal.created_date)],
    ['Valid Until:', formatDate(proposal.valid_until)],
    ['Frequency:', proposal.frequency],
    ['Annual Value:', formatCurrency(proposal.annual_value)],
  ];
  doc.setFontSize(9);
  details.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, 215.9 - 70, 34 + i * 5);
    doc.setFont('helvetica', 'normal'); doc.text(v, 215.9 - 35, 34 + i * 5);
  });

  y += 8; doc.setDrawColor(200); doc.line(12, y, 203.9, y); y += 6;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Scope of Work', 12, y); y += 6;

  (proposal.scope_items || []).forEach(item => {
    if (y > 250) { doc.addPage(); y = addHeader(doc, 'SCOPE OF WORK (cont.)', `#${proposal.proposal_number}`); addFooter(doc, doc.getNumberOfPages()); }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 244, 255); doc.rect(12, y - 4, 191.9, 7, 'F');
    doc.text(`${item.tag ? item.tag + '  — ' : ''}${item.equipment_type}${item.qty > 1 ? ' ×' + item.qty : ''}`, 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    (item.scope_lines || []).forEach(line => {
      if (y > 255) { doc.addPage(); y = 20; }
      const wrapped = doc.splitTextToSize(`• ${line}`, 185);
      doc.text(wrapped, 16, y); y += wrapped.length * 4.5;
    });
    y += 3;
  });

  if (y > 240) { doc.addPage(); y = 20; }
  doc.setDrawColor(200); doc.line(12, y, 203.9, y); y += 6;
  const annual = proposal.annual_value || 0;
  const tax = annual * CONFIG.TAX_RATE;
  [
    ['Subtotal (Annual)', formatCurrency(annual)],
    [`GST (${(CONFIG.TAX_RATE*100).toFixed(0)}%)`, formatCurrency(tax)],
    ['Total Annual', formatCurrency(annual + tax)],
    ['Monthly Billing', formatCurrency((annual + tax) / 12)],
  ].forEach(([l, v], i) => {
    doc.setFont('helvetica', i >= 2 ? 'bold' : 'normal');
    doc.setFontSize(i >= 2 ? 10 : 9);
    doc.text(l, 130, y); doc.text(v, 203.9, y, { align: 'right' }); y += 6;
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) { doc.setPage(p); addFooter(doc, p); }
  doc.save(`Proposal-${proposal.proposal_number}.pdf`);
}

// ── Enhanced multi-page Proposal PDF (used by proposal-wizard) ────────────────
export function generateProposalPDFEnhanced(proposal, building, coverImageDataUrl) {
  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit: 'mm', format: 'letter' });
  const co    = CONFIG.COMPANY;
  const pw    = 215.9, ph = 279.4, ml = 14, mr = pw - ml;

  // ─── COVER PAGE ──────────────────────────────────────────────────────────────
  doc.setFillColor(15, 25, 45);
  doc.rect(0, 0, pw, 48, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 45, pw, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text(co.name, ml, 18);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${co.phone}  ·  ${co.email}  ·  ${co.website}`, ml, 27);
  doc.text(`${co.address}, ${co.city}, ${co.province}  ·  GST ${co.gst}`, ml, 34);
  doc.setTextColor(0);

  let imgBottom = 50;
  if (coverImageDataUrl) {
    try {
      const imgType = coverImageDataUrl.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'JPEG';
      let imgW = pw, imgH = 70;
      try { const props = doc.getImageProperties(coverImageDataUrl); const ratio = Math.min(pw/props.width, 70/props.height); imgW = props.width*ratio; imgH = props.height*ratio; } catch {}
      doc.addImage(coverImageDataUrl, imgType, (pw-imgW)/2, 50, imgW, imgH, undefined, 'FAST');
      imgBottom = 50 + imgH;
    } catch { imgBottom = 50; }
  }

  const titleY = imgBottom + 6;
  doc.setFillColor(59, 130, 246);
  doc.rect(0, titleY - 1, pw, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.text('PREVENTIVE MAINTENANCE PROPOSAL', ml, titleY + 8);
  doc.setTextColor(0);

  const infoY = titleY + 20;
  const halfW = (mr - ml) / 2 - 4;

  // Left — client info
  doc.setFillColor(245, 248, 255);
  doc.rect(ml, infoY, halfW, 60, 'F');
  doc.setDrawColor(200); doc.rect(ml, infoY, halfW, 60);
  let ly = infoY + 7;
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(80,80,80);
  doc.text('PREPARED FOR', ml+4, ly); ly += 6;
  doc.setTextColor(0); doc.setFont('helvetica','bold'); doc.setFontSize(10);
  const cliName = building.client_name || building.name || 'To Be Confirmed';
  doc.text(cliName.slice(0,32), ml+4, ly); ly += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  if (building.client_company)    { doc.text(building.client_company.slice(0,38), ml+4, ly); ly += 5; }
  if (building.strata_number)     { doc.text('Strata Plan ' + building.strata_number, ml+4, ly); ly += 5; }
  if (building.name && building.name !== cliName) { doc.text(building.name.slice(0,38), ml+4, ly); ly += 5; }
  const addr = [building.address, building.city, building.province].filter(Boolean).join(', ');
  if (addr) { doc.text(addr.slice(0,45), ml+4, ly); ly += 5; }
  if (building.client_email) { doc.text(building.client_email.slice(0,35), ml+4, ly); ly += 5; }
  if (building.client_phone) { doc.text(building.client_phone, ml+4, ly); }

  // Right — proposal details
  const rx2 = ml + halfW + 8;
  doc.setFillColor(15, 25, 45);
  doc.rect(rx2, infoY, halfW, 60, 'F');
  let ry2 = infoY + 7;
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(160,180,220);
  doc.text('PROPOSAL DETAILS', rx2+4, ry2); ry2 += 6;
  const annual = Number(proposal.annual_value) || 0;
  const monthly = Number(proposal.monthly_value) || annual/12;
  [
    ['Proposal #', proposal.proposal_number || 'DRAFT'],
    ['Date',       formatDate(proposal.created_date)],
    ['Valid Until',formatDate(proposal.valid_until)],
    ['Frequency',  (proposal.frequency||'').charAt(0).toUpperCase()+(proposal.frequency||'').slice(1)],
    ['Annual Value', formatCurrency(annual)],
    ['Monthly',    formatCurrency(monthly*(1+CONFIG.TAX_RATE)) + ' incl. GST'],
  ].forEach(([k, v]) => {
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(140,160,200);
    doc.text(k, rx2+4, ry2);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(255,255,255);
    doc.text(v, rx2+halfW-4, ry2, { align: 'right' });
    ry2 += 7;
  });
  doc.setTextColor(0);

  addFooter(doc, 1);

  // ─── SCOPE PAGES ─────────────────────────────────────────────────────────────
  // Equipment scope items only — subcontracted services listed separately
  const allItems   = proposal.scope_items || [];
  const equipItems = allItems.filter(i => i.category !== 'Subcontracted Services');
  const subItems   = allItems.filter(i => i.category === 'Subcontracted Services');

  // Group equipment items by category
  const grouped = {};
  equipItems.forEach(item => {
    const cat = item.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const CAT_ORDER = ['HVAC','Hydronic','Plumbing','Drainage','Controls','Backup & Fuel',
    'Chemical Treatment','Pool','Irrigation','Compressed Air','Radiant / Snowmelt',
    'Meters & Gauges','Valves','Other'];
  const cats = CAT_ORDER.filter(c => grouped[c]).concat(Object.keys(grouped).filter(c => !CAT_ORDER.includes(c)));

  doc.addPage();
  let y = addHeader(doc, 'SCOPE OF WORK', `#${proposal.proposal_number}`);
  let page = 2;

  const checkPage = (need = 20) => {
    if (y + need > 270) { addFooter(doc, page); doc.addPage(); page++; y = addHeader(doc, 'SCOPE OF WORK (cont.)', `#${proposal.proposal_number}`); }
  };

  cats.forEach(cat => {
    checkPage(18);
    doc.setFillColor(15, 25, 45);
    doc.rect(ml, y-5, mr-ml, 8, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(cat.toUpperCase(), ml+3, y);
    doc.setTextColor(0); y += 8;

    grouped[cat].forEach(item => {
      checkPage(15);
      doc.setFillColor(245, 248, 255);
      doc.rect(ml, y-4, mr-ml, 8, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
      const itemLabel = [item.tag, item.equipment_type].filter(Boolean).join(' — ');
      doc.text(itemLabel, ml+3, y);
      if (item.qty > 1) doc.text(`×${item.qty}`, mr-35, y);
      y += 7;
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      (item.scope_lines || []).forEach(line => {
        checkPage(6);
        const wrapped = doc.splitTextToSize(`• ${line}`, mr-ml-6);
        doc.text(wrapped, ml+5, y);
        y += wrapped.length * 4.2;
      });
      y += 3;
    });
    y += 4;
  });

  // Subcontracted services section (sell price scope only — no costs)
  if (subItems.length > 0) {
    checkPage(18);
    doc.setFillColor(0, 85, 100);
    doc.rect(ml, y-5, mr-ml, 8, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text('SUBCONTRACTED SERVICES (INCLUDED)', ml+3, y);
    doc.setTextColor(0); y += 8;

    subItems.forEach(item => {
      checkPage(12);
      doc.setFillColor(245, 252, 255);
      doc.rect(ml, y-4, mr-ml, 7, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(9);
      doc.text(item.equipment_type, ml+3, y); y += 6;
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      (item.scope_lines || []).forEach(line => {
        checkPage(5);
        const wrapped = doc.splitTextToSize(`• ${line}`, mr-ml-6);
        doc.text(wrapped, ml+5, y); y += wrapped.length * 4.2;
      });
      y += 3;
    });
    y += 4;
  }

  // ─── EQUIPMENT SUMMARY TABLE ─────────────────────────────────────────────────
  checkPage(30);
  addFooter(doc, page);
  doc.addPage(); page++;
  y = addHeader(doc, 'EQUIPMENT SUMMARY', `#${proposal.proposal_number}`);

  doc.setFillColor(15,25,45); doc.rect(ml, y-5, mr-ml, 7, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Tag', ml+2, y); doc.text('Equipment Type', ml+22, y);
  doc.text('Qty', ml+120, y); doc.text('Frequency', ml+135, y);
  doc.setTextColor(0); y += 7;

  equipItems.forEach((item, idx) => {
    checkPage(7);
    if (idx % 2 === 0) { doc.setFillColor(248,250,255); doc.rect(ml, y-4, mr-ml, 6, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(item.tag || '—', ml+2, y);
    doc.text((item.equipment_type||'').slice(0,50), ml+22, y);
    doc.text(String(item.qty||1), ml+122, y);
    doc.text(item.frequency || proposal.frequency || '—', ml+135, y);
    y += 6;
  });
  y += 4;
  doc.setDrawColor(150); doc.line(ml, y, mr, y); y += 5;

  // ─── PRICING PAGE ─────────────────────────────────────────────────────────────
  checkPage(60);
  doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('Pricing Summary', ml, y); y += 8;

  // NOTE: annual_value already includes subcontractor sell prices (set in _saveProposal)
  const subtot = annual;
  const tax = subtot * CONFIG.TAX_RATE;

  [
    ['Preventive Maintenance Contract — Annual', formatCurrency(subtot), true],
    [`GST (${(CONFIG.TAX_RATE*100).toFixed(0)}%)`, formatCurrency(tax), false],
    ['Total Annual (incl. GST)', formatCurrency(subtot + tax), true],
    ['Monthly Billing (incl. GST)', formatCurrency((subtot + tax)/12), true],
  ].forEach(([label, val, bold]) => {
    doc.setFont('helvetica', bold?'bold':'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, ml, y); doc.text(val, mr, y, {align:'right'});
    y += bold ? 8 : 6;
  });

  y += 8;
  const incl = [
    'All labour and materials required for routine preventive maintenance tasks as itemized above',
    'Shop supplies (vacuum, cleaning supplies, lubricants, minor consumables)',
    'Scheduled task reports delivered within 30 days of each visit',
    'Annual performance review with property manager',
    '24-hour emergency line access (' + CONFIG.COMPANY.phone + ')',
  ];
  if (subItems.length > 0) incl.push('Subcontracted maintenance services as listed in scope above');

  const excl = [
    'Replacement parts and major components',
    'Repairs and work beyond routine maintenance scope (quoted separately)',
    'Emergency or after-hours labour (billed at Schedule D rates)',
    'New equipment installation or commissioning',
    'Work in suites or residential units unless otherwise stated',
  ];

  checkPage(40);
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('Inclusions', ml, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  incl.forEach(l => { checkPage(6); doc.text(`• ${l}`, ml+4, y); y += 5; });
  y += 3;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('Exclusions', ml, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  excl.forEach(l => { checkPage(6); doc.text(`• ${l}`, ml+4, y); y += 5; });

  if (proposal.notes) {
    y += 5; checkPage(20);
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Special Notes', ml, y); y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const nl = doc.splitTextToSize(proposal.notes, mr-ml);
    checkPage(nl.length * 4.5 + 5);
    doc.text(nl, ml, y); y += nl.length * 4.5;
  }

  // ─── TERMS & SIGNATURE PAGE ──────────────────────────────────────────────────
  addFooter(doc, page);
  doc.addPage(); page++;
  y = addHeader(doc, 'TERMS & ACCEPTANCE', `#${proposal.proposal_number}`);

  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  const terms = proposal.terms_text || defaultTerms();
  const termLines = doc.splitTextToSize(terms, mr-ml);
  doc.text(termLines, ml, y); y += termLines.length * 4.3 + 10;

  doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('Acceptance', ml, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  doc.text('By signing below, the Customer accepts the terms and scope of this proposal.', ml, y); y += 12;

  const sigCol = (mr - ml) / 3;
  ['Authorized Signature (Customer)', 'Print Name & Title', 'Date'].forEach((lbl, i) => {
    const x = ml + i * sigCol;
    doc.line(x, y, x + sigCol - 8, y); doc.text(lbl, x, y+4);
  });
  y += 16;
  ['Authorized Signature (Contractor)', 'Print Name & Title', 'Date'].forEach((lbl, i) => {
    const x = ml + i * sigCol;
    doc.line(x, y, x + sigCol - 8, y); doc.text(lbl, x, y+4);
  });

  addFooter(doc, page);
  doc.save(`Proposal-${proposal.proposal_number || 'Draft'}.pdf`);
}
