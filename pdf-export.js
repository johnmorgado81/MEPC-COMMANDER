// js/utils/pdf-export.js — jsPDF document generation helpers
import { CONFIG } from '../config.js';
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
