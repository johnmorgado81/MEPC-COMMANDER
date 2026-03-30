// js/utils/pdf-export.js — jsPDF document generation helpers
import { CONFIG } from './config.js';
import { formatCurrency, formatDate } from './helpers.js';

function getjsPDF() {
  const { jsPDF } = window.jspdf;
  return jsPDF;
}

// ── Shared header / footer ─────────────────────────────────
function addHeader(doc, title, subtitle = '') {
  const co = CONFIG.COMPANY;
  doc.setFillColor(24, 33, 47);
  doc.rect(0, 0, 215.9, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(co.name, 12, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${co.phone}  |  ${co.email}  |  ${co.website}`, 12, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 215.9 - 12, 12, { align: 'right' });
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 215.9 - 12, 18, { align: 'right' });
  }
  doc.setTextColor(0);
  return 28; // y after header
}

function addFooter(doc, pageCount) {
  const co = CONFIG.COMPANY;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`${co.name}  |  ${co.address}, ${co.city}, ${co.province}  |  GST ${co.gst}`, 12, 287);
  doc.text(`Page ${pageCount}`, 215.9 - 12, 287, { align: 'right' });
  doc.setTextColor(0);
}

// ── PM Proposal PDF ────────────────────────────────────────
export function generateProposalPDF(proposal, building) {
  const jsPDF = getjsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const co = CONFIG.COMPANY;
  let y = addHeader(doc, 'PREVENTIVE MAINTENANCE PROPOSAL', `#${proposal.proposal_number}`);

  // Client block
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared For:', 12, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(building.client_name || building.name, 12, y); y += 5;
  if (building.client_company) { doc.text(building.client_company, 12, y); y += 5; }
  doc.text(building.address || '', 12, y); y += 5;
  if (building.client_email) doc.text(building.client_email, 12, y);

  // Proposal info block (right side)
  const infoY = 28;
  doc.setFont('helvetica', 'bold');
  doc.text('Proposal Details', 215.9 - 70, infoY);
  const details = [
    ['Date:', formatDate(proposal.created_date)],
    ['Valid Until:', formatDate(proposal.valid_until)],
    ['Frequency:', proposal.frequency],
    ['Visits/Year:', String(proposal.visits_per_year || '')],
    ['Annual Value:', formatCurrency(proposal.annual_value)],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  details.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(k, 215.9 - 70, infoY + 6 + i * 5);
    doc.setFont('helvetica', 'normal');
    doc.text(v, 215.9 - 35, infoY + 6 + i * 5);
  });

  y += 10;
  doc.setDrawColor(200); doc.line(12, y, 203.9, y); y += 6;

  // Scope of work
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Scope of Work', 12, y); y += 6;

  const items = proposal.scope_items || [];
  items.forEach((item, idx) => {
    if (y > 250) { doc.addPage(); y = addHeader(doc, 'SCOPE OF WORK (cont.)', `#${proposal.proposal_number}`); addFooter(doc, doc.getNumberOfPages()); }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 244, 255);
    doc.rect(12, y - 4, 191.9, 7, 'F');
    doc.text(`${item.tag || ''}  ${item.equipment_type}`, 14, y);
    doc.text(formatCurrency(item.annual_price) + ' / yr', 203.9, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const scope = item.scope_lines || [];
    scope.forEach(line => {
      if (y > 255) { doc.addPage(); y = 20; }
      const wrapped = doc.splitTextToSize(`• ${line}`, 185);
      doc.text(wrapped, 16, y);
      y += wrapped.length * 4.5;
    });
    y += 3;
  });

  // Totals
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setDrawColor(200); doc.line(12, y, 203.9, y); y += 6;
  doc.setFontSize(10);
  const monthly = proposal.monthly_value || (proposal.annual_value / 12);
  const tax = proposal.annual_value * CONFIG.TAX_RATE;
  const totRows = [
    ['Subtotal (Annual)', formatCurrency(proposal.annual_value)],
    [`GST (${(CONFIG.TAX_RATE * 100).toFixed(0)}%)`, formatCurrency(tax)],
    ['Total (Annual)', formatCurrency(Number(proposal.annual_value) + tax)],
    ['Monthly Billing', formatCurrency(monthly)],
  ];
  totRows.forEach(([l, v], i) => {
    const isBold = i === totRows.length - 2 || i === totRows.length - 1;
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(l, 130, y);
    doc.text(v, 203.9, y, { align: 'right' });
    y += 6;
  });

  // Terms
  y += 5;
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Terms & Conditions', 12, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const terms = proposal.terms_text || defaultTerms();
  const termLines = doc.splitTextToSize(terms, 191.9);
  if (y + termLines.length * 4.5 > 270) { doc.addPage(); y = 20; }
  doc.text(termLines, 12, y);
  y += termLines.length * 4.5 + 10;

  // Signature block
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Acceptance', 12, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('By signing below the client accepts the terms of this proposal.', 12, y); y += 10;
  doc.line(12, y, 80, y);
  doc.line(100, y, 168, y);
  doc.line(175, y, 203.9, y);
  y += 4;
  doc.setFontSize(8);
  doc.text('Authorized Signature', 12, y);
  doc.text('Print Name / Title', 100, y);
  doc.text('Date', 175, y);

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) { doc.setPage(p); addFooter(doc, p); }

  doc.save(`Proposal-${proposal.proposal_number}.pdf`);
}

// ── Quote PDF ──────────────────────────────────────────────
export function generateQuotePDF(quote, building) {
  const jsPDF = getjsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  let y = addHeader(doc, 'QUOTATION', `#${quote.quote_number}`);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared For:', 12, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(building.client_name || building.name, 12, y); y += 5;
  doc.text(building.address || '', 12, y); y += 8;

  // Details
  doc.setFont('helvetica', 'bold');
  doc.text(`Quote #: ${quote.quote_number}`, 215.9 - 12, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${formatDate(quote.created_date)}`, 215.9 - 12, 34, { align: 'right' });
  doc.text(`Valid: ${formatDate(quote.valid_until)}`, 215.9 - 12, 39, { align: 'right' });
  doc.text(`Terms: ${quote.payment_terms || 'Net 30'}`, 215.9 - 12, 44, { align: 'right' });

  doc.setDrawColor(200); doc.line(12, y, 203.9, y); y += 5;

  if (quote.title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(quote.title, 12, y); y += 7;
  }

  // Line items table header
  doc.setFillColor(24, 33, 47);
  doc.setTextColor(255);
  doc.rect(12, y - 4, 191.9, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 14, y);
  doc.text('Qty', 140, y, { align: 'right' });
  doc.text('Unit Price', 165, y, { align: 'right' });
  doc.text('Total', 203.9, y, { align: 'right' });
  doc.setTextColor(0); y += 6;

  const items = quote.line_items || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  items.forEach((item, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, 252);
    doc.rect(12, y - 4, 191.9, 7, 'F');
    const descWrapped = doc.splitTextToSize(item.description || '', 115);
    doc.text(descWrapped, 14, y);
    doc.text(String(item.qty || 1), 140, y, { align: 'right' });
    doc.text(formatCurrency(item.unit_price), 165, y, { align: 'right' });
    doc.text(formatCurrency(item.total), 203.9, y, { align: 'right' });
    y += Math.max(7, descWrapped.length * 4.5);
  });

  y += 3;
  doc.setDrawColor(200); doc.line(130, y, 203.9, y); y += 4;

  [
    ['Subtotal', formatCurrency(quote.subtotal)],
    [`GST (${(quote.tax_rate * 100 || 5).toFixed(0)}%)`, formatCurrency(quote.tax_amount)],
    ['TOTAL', formatCurrency(quote.total)],
  ].forEach(([l, v], i) => {
    doc.setFont('helvetica', i === 2 ? 'bold' : 'normal');
    doc.setFontSize(i === 2 ? 11 : 9);
    doc.text(l, 165, y, { align: 'right' });
    doc.text(v, 203.9, y, { align: 'right' });
    y += 6;
  });

  if (quote.notes) {
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Notes:', 12, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const nl = doc.splitTextToSize(quote.notes, 191.9);
    doc.text(nl, 12, y);
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) { doc.setPage(p); addFooter(doc, p); }
  doc.save(`Quote-${quote.quote_number}.pdf`);
}

function defaultTerms() {
  return `This proposal is valid for ${CONFIG.PROPOSAL_VALID_DAYS} days from the date of issue. ` +
    `All preventive maintenance services are performed during regular business hours (Monday–Friday, 7:30am–4:30pm). ` +
    `Emergency or after-hours calls are billed separately at applicable rates. ` +
    `Deficiencies identified during service are not included in the preventive maintenance fee and will be quoted separately for approval. ` +
    `Payment terms: Net 30 from invoice date. Overdue balances are subject to 2% monthly interest. ` +
    `All prices are in Canadian Dollars and exclusive of applicable taxes.`;
}

// ── Enhanced multi-page Proposal PDF (used by proposal-wizard) ─────────────────
export function generateProposalPDFEnhanced(proposal, building, coverImageDataUrl) {
  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit: 'mm', format: 'letter' });
  const co    = CONFIG.COMPANY;
  const pw    = 215.9, ph = 279.4, ml = 14, mr = pw - ml;

  // ─── COVER PAGE ─────────────────────────────────────────────────────────────
  // Dark header band
  doc.setFillColor(15, 25, 45);
  doc.rect(0, 0, pw, 55, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 52, pw, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text(co.name, ml, 22);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`${co.phone}  ·  ${co.email}  ·  ${co.website}`, ml, 30);
  doc.setFontSize(9);
  doc.text(`${co.address}, ${co.city}, ${co.province}  ·  GST ${co.gst}`, ml, 37);
  doc.setTextColor(0);

  // Cover image
  let coverBottom = 58;
  if (coverImageDataUrl) {
    try {
      const imgType = coverImageDataUrl.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'JPEG';
      doc.addImage(coverImageDataUrl, imgType, 0, 55, pw, 75, undefined, 'FAST');
      coverBottom = 135;
    } catch {}
  }

  // Proposal title block
  let cy = coverBottom + 10;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('PREVENTIVE MAINTENANCE', ml, cy); cy += 9;
  doc.text('PROPOSAL', ml, cy); cy += 14;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

  const bldName = building.name || building.client_name || 'Draft';
  const cliName = building.client_name || '';
  const cliCo   = building.client_company || '';
  const addr    = [building.address, building.city, building.province].filter(Boolean).join(', ');

  doc.setFillColor(240, 245, 255);
  doc.roundedRect(ml, cy - 5, mr - ml, 50, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); cy += 2;
  doc.text('PREPARED FOR:', ml + 4, cy); cy += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(cliName || bldName, ml + 4, cy); cy += 6;
  if (cliCo) { doc.setFontSize(9); doc.text(cliCo, ml + 4, cy); cy += 5; }
  doc.setFontSize(9);
  if (addr) { doc.text(addr, ml + 4, cy); cy += 5; }
  if (building.client_email) { doc.text(building.client_email, ml + 4, cy); cy += 5; }
  if (building.client_phone) { doc.text(building.client_phone, ml + 4, cy); }

  // Right column on cover
  const rx = 130;
  let ry = coverBottom + 10;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  [
    ['Proposal #', proposal.proposal_number || '—'],
    ['Date', formatDate(proposal.created_date)],
    ['Valid Until', formatDate(proposal.valid_until)],
    ['Frequency', (proposal.frequency||'').charAt(0).toUpperCase()+(proposal.frequency||'').slice(1)],
    ['Annual Value', formatCurrency(proposal.annual_value)],
    ['Monthly Billing', formatCurrency(proposal.monthly_value)],
  ].forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(k + ':', rx, ry);
    doc.setFont('helvetica', 'normal'); doc.text(v, rx + 30, ry);
    ry += 7;
  });

  addFooter(doc, 1);

  // ─── SCOPE PAGES (grouped by category) ─────────────────────────────────────
  const items = proposal.scope_items || [];
  const grouped = {};
  items.forEach(item => {
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
    doc.setFillColor(15, 25, 45); doc.rect(ml, y - 5, mr - ml, 8, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(cat.toUpperCase(), ml + 3, y); doc.setTextColor(0);
    y += 8;

    grouped[cat].forEach(item => {
      checkPage(15);
      doc.setFillColor(245, 248, 255);
      doc.rect(ml, y - 4, mr - ml, 8, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
      const itemLabel = [item.tag, item.equipment_type].filter(Boolean).join(' — ');
      doc.text(itemLabel, ml + 3, y);
      if (item.annual_price) doc.text(formatCurrency(item.annual_price) + ' / yr', mr, y, { align: 'right' });
      if (item.qty > 1) doc.text(`×${item.qty}`, mr - 35, y);
      y += 7;

      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      const lines = item.scope_lines || [];
      lines.forEach(line => {
        checkPage(6);
        const wrapped = doc.splitTextToSize(`• ${line}`, mr - ml - 6);
        doc.text(wrapped, ml + 5, y);
        y += wrapped.length * 4.2;
      });
      y += 3;
    });
    y += 4;
  });

  // Equipment summary table
  checkPage(30);
  addFooter(doc, page);
  doc.addPage(); page++;
  y = addHeader(doc, 'EQUIPMENT SUMMARY', `#${proposal.proposal_number}`);

  doc.setFillColor(15,25,45); doc.rect(ml, y-5, mr-ml, 7, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Tag', ml+2, y); doc.text('Equipment Type', ml+22, y);
  doc.text('Qty', ml+105, y); doc.text('Frequency', ml+118, y); doc.text('Annual', mr, y, {align:'right'});
  doc.setTextColor(0); y += 7;

  let subtot = 0;
  items.forEach((item, idx) => {
    checkPage(7);
    if (idx % 2 === 0) { doc.setFillColor(248,250,255); doc.rect(ml, y-4, mr-ml, 6, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(item.tag || '—', ml+2, y);
    doc.text((item.equipment_type||'').slice(0, 40), ml+22, y);
    doc.text(String(item.qty||1), ml+107, y);
    doc.text(item.frequency || proposal.frequency || '—', ml+118, y);
    doc.text(formatCurrency(item.annual_price), mr, y, {align:'right'});
    subtot += Number(item.annual_price || 0);
    y += 6;
  });
  y += 4;
  doc.setDrawColor(150); doc.line(ml, y, mr, y); y += 5;

  // ─── PRICING PAGE ────────────────────────────────────────────────────────────
  checkPage(60);
  doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('Pricing Summary', ml, y); y += 8;
  const tax = subtot * CONFIG.TAX_RATE;
  [
    ['Subtotal — Annual Contract', formatCurrency(subtot), false],
    [`GST (${(CONFIG.TAX_RATE*100).toFixed(0)}%)`, formatCurrency(tax), false],
    ['Total Annual (incl. tax)', formatCurrency(subtot + tax), true],
    ['Monthly Billing (incl. tax)', formatCurrency((subtot + tax)/12), true],
  ].forEach(([label, val, bold]) => {
    doc.setFont('helvetica', bold?'bold':'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.text(label, ml, y);
    doc.text(val, mr, y, {align:'right'});
    y += bold ? 8 : 6;
  });

  // Inclusions / exclusions
  y += 8;
  const incl = [
    'All labour and materials required for routine preventive maintenance tasks',
    'Shop supplies (vacuum, cleaning supplies, lubricants)',
    'Scheduled task reports delivered within 30 days of each visit',
    'Annual performance review with property manager',
    '24-hour emergency line access (604-298-8383)',
  ];
  const excl = [
    'Replacement parts and components',
    'Repairs beyond routine maintenance scope',
    'Emergency or after-hours labour (billed at Schedule D rates)',
    'New equipment installation or commissioning',
  ];
  checkPage(40);
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('Inclusions', ml, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  incl.forEach(l => { doc.text(`• ${l}`, ml+4, y); y += 5; });
  y += 3;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('Exclusions', ml, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  excl.forEach(l => { doc.text(`• ${l}`, ml+4, y); y += 5; });

  // Notes
  if (proposal.notes) {
    y += 5; checkPage(20);
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Special Notes', ml, y); y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(proposal.notes, mr-ml), ml, y);
    y += doc.splitTextToSize(proposal.notes, mr-ml).length * 4.5;
  }

  // ─── TERMS & SIGNATURE PAGE ──────────────────────────────────────────────────
  addFooter(doc, page);
  doc.addPage(); page++;
  y = addHeader(doc, 'TERMS & ACCEPTANCE', `#${proposal.proposal_number}`);

  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  const terms = defaultTerms();
  const termLines = doc.splitTextToSize(terms, mr - ml);
  doc.text(termLines, ml, y); y += termLines.length * 4.3 + 10;

  doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('Acceptance', ml, y); y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  doc.text('By signing below, the Customer accepts the terms and scope of this proposal.', ml, y); y += 12;

  const sigCol = (mr - ml) / 3;
  ['Authorized Signature (Customer)', 'Print Name & Title', 'Date'].forEach((lbl, i) => {
    const x = ml + i * sigCol;
    doc.line(x, y, x + sigCol - 8, y);
    doc.text(lbl, x, y + 4);
  });
  y += 16;

  ['Authorized Signature (Contractor)', 'Print Name & Title', 'Date'].forEach((lbl, i) => {
    const x = ml + i * sigCol;
    doc.line(x, y, x + sigCol - 8, y);
    doc.text(lbl, x, y + 4);
  });

  addFooter(doc, page);

  doc.save(`Proposal-${proposal.proposal_number || 'Draft'}.pdf`);
}
