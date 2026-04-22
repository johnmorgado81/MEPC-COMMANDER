import { CONFIG } from './config.js';
import { formatCurrency, formatDate } from './helpers.js';
import { buildProposalPayload, calcProposalTotals } from './pm-engine.js';

// ─── jsPDF accessor ─────────────────────────────────────────────────────────────
function getjsPDF() { return window.jspdf.jsPDF; }
function getCompany() {
  try {
    const saved = localStorage.getItem('mepc_company_profile');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Full merge: saved profile takes priority, CONFIG fills any gaps
      return { ...CONFIG.COMPANY, ...parsed };
    }
  } catch {}
  return { ...CONFIG.COMPANY };
}

// Call this once at app startup or after settings save to warm the cache
export async function warmCompanyCache(UserSettingsModule) {
  try {
    const saved = await UserSettingsModule.get('company_profile');
    if (saved) localStorage.setItem('mepc_company_profile', JSON.stringify(saved));
  } catch {}
}

// ─── Color palette ──────────────────────────────────────────────────────────────
const C = {
  navy:     [11, 18, 35],
  blue:     [37, 99, 235],
  blueLight:[219, 234, 254],
  blueAcc:  [59, 130, 246],
  charcoal: [30, 41, 59],
  midgrey:  [100, 116, 139],
  lightgrey:[241, 245, 249],
  white:    [255, 255, 255],
  accent:   [37, 99, 235],
  text:     [15, 23, 42],
};

const setFill = (doc, rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const setDraw = (doc, rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
const setTxt  = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
const pw = 215.9, ml = 14, mr = pw - ml;

// ─── Shared footer ──────────────────────────────────────────────────────────────
function addFooter(doc, page, proposal) {
  const co = getCompany();
  setFill(doc, C.navy); doc.rect(0, 279, pw, 18, 'F');
  setTxt(doc, [160, 174, 192]);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(`${co.name}  ·  ${co.address}, ${co.city}, ${co.province}`, ml, 285);
  doc.text(`${co.phone}  ·  ${co.email}`, ml, 289);
  if (proposal?.proposal_number)
    doc.text(`Proposal #${proposal.proposal_number}  ·  Page ${page}`, pw - ml, 287, { align: 'right' });
  setTxt(doc, C.text);
}

// ─── Interior page header ────────────────────────────────────────────────────────
function addHeader(doc, title, sub) {
  const co = getCompany();
  setFill(doc, C.navy); doc.rect(0, 0, pw, 22, 'F');
  setFill(doc, C.blue); doc.rect(0, 22, pw, 2, 'F');
  setTxt(doc, C.white);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(co.name, ml, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text(`${co.phone}  ·  ${co.email}  ·  ${co.website || ''}`, ml, 19);
  // Logo on interior pages — right side, aspect-ratio safe
  const _logoRight = pw - ml;
  if (co.logo_data) {
    try {
      const _lt = co.logo_data.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'PNG';
      let _lw = 28, _lh = 10;
      try { const _lp = doc.getImageProperties(co.logo_data); _lh = Math.min(10, _lp.height * (28/_lp.width)); _lw = _lp.width * (_lh/_lp.height); } catch {}
      doc.addImage(co.logo_data, _lt, _logoRight - _lw, 5, _lw, _lh, undefined, 'FAST');
    } catch {}
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text(title, _logoRight, 13, { align: 'right' });
    if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(sub, _logoRight, 19, { align: 'right' }); }
  }
  if (co.logo_data) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(title, _logoRight - 32, 13, { align: 'right' });
    if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(sub, _logoRight - 32, 19, { align: 'right' }); }
  }
  setTxt(doc, C.text);
  return 30;
}

// ─── Section heading bar ─────────────────────────────────────────────────────────
function sectionHead(doc, text, y, accent) {
  const rgb = accent || C.navy;
  setFill(doc, rgb); doc.rect(ml, y - 4, mr - ml, 9, 'F');
  setFill(doc, C.blue); doc.rect(ml, y + 5, 32, 1.5, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(text.toUpperCase(), ml + 5, y + 1.5);
  setTxt(doc, C.text);
  return y + 13;
}

// ─── Sub-heading (equipment type grouping) ────────────────────────────────────────
function typeHead(doc, text, count, y) {
  setFill(doc, C.blueLight); doc.rect(ml, y - 3, mr - ml, 7.5, 'F');
  setFill(doc, C.blue); doc.rect(ml, y - 3, 2.5, 7.5, 'F');
  setTxt(doc, C.charcoal); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(text, ml + 6, y + 1.5);
  if (count) {
    setTxt(doc, C.midgrey); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`${count} unit${count !== 1 ? 's' : ''}`, pw - ml - 2, y + 1.5, { align: 'right' });
  }
  setTxt(doc, C.text);
  return y + 10;
}

// ─── Page guard ───────────────────────────────────────────────────────────────────
function chk(doc, y, need, page, proposal) {
  if (y + need > 270) {
    addFooter(doc, page.n, proposal);
    doc.addPage(); page.n++;
    y = addHeader(doc, 'PREVENTIVE MAINTENANCE PROPOSAL', `#${proposal?.proposal_number || 'DRAFT'}`);
  }
  return y;
}

// ─── Pill label ───────────────────────────────────────────────────────────────────
function pill(doc, text, x, y, fill, textCol) {
  const w = doc.getTextWidth(text) + 8;
  setFill(doc, fill || C.blueLight);
  doc.roundedRect(x, y - 4, w, 6, 1, 1, 'F');
  setTxt(doc, textCol || C.blue);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
  doc.text(text, x + 4, y);
  setTxt(doc, C.text);
}

// ─── Terms ────────────────────────────────────────────────────────────────────────
function defaultTerms(co) {
  return `PAYMENT TERMS: Net 30 days from invoice date. Accounts past due are subject to interest at 2% per month (24% per annum compounded monthly).

SCOPE: This agreement covers only the preventive maintenance services described herein. Repairs, parts replacements, emergency callouts, and work outside the described scope are quoted separately.

EXCLUSIONS: Replacement parts and components; repairs beyond routine maintenance; emergency or after-hours labour; equipment commissioning or new installation; work required due to owner-caused damage; water treatment chemicals unless specified.

ACCESS: Client agrees to provide reasonable access to equipment during scheduled visits. Inaccessible equipment may result in additional charges or rescheduling.

CONTRACT TERM: Initial term of one (1) year from acceptance date. Automatically renews for successive one-year terms unless either party provides 30 days written notice prior to renewal.

RATE ADJUSTMENTS: Labour rates are subject to annual adjustment with 30 days written notice.

LIMITATION OF LIABILITY: ${co.name || 'Contractor'} shall not be liable for consequential or indirect damages arising from the performance of this contract.

GOVERNING LAW: This agreement is governed by the laws of British Columbia, Canada. The parties agree to the exclusive jurisdiction of the courts of British Columbia.`;
}

// ─── Service area description ─────────────────────────────────────────────────────
function saDesc(type) {
  return {
    shared:      'Shared Residential & Commercial Common Areas',
    commercial:  'Commercial Common Areas',
    residential: 'Residential Common Areas',
    mixed:       'Mixed Areas — Commercial & Residential (see equipment schedule)',
  }[type] || 'Building Common Areas';
}

// ═══════════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Enhanced Proposal PDF
// ═══════════════════════════════════════════════════════════════════════════════════
export function generateProposalPDFEnhanced(proposal, building, coverImageDataUrl) {
  let _payload = null;
  try { _payload = buildProposalPayload(proposal, building, null); } catch {}

  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit: 'mm', format: 'letter' });
  const co    = getCompany();
  const page  = { n: 1 };

  const annual   = (_payload?.annual  > 0 ? _payload.annual  : null) || Number(proposal.annual_value)  || 0;
  const monthly  = (_payload?.monthly > 0 ? _payload.monthly : null) || Number(proposal.monthly_value) || annual / 12;
  const items    = _payload?.scope_items  || proposal.scope_items  || [];
  const manItems = (_payload?.manual_items || proposal.manual_items || []).filter(m => m.include !== false && m.client_facing);
  const qv       = _payload?.quarter_visits || proposal.quarter_visits || { q1:true,q2:true,q3:true,q4:true,annual_clean:false };
  const visitCount  = _payload?.visit_count  || [qv.q1,qv.q2,qv.q3,qv.q4].filter(Boolean).length || 4;
  const visitLabels = _payload?.regimen_label || ['Q1','Q2','Q3','Q4'].filter((_,i)=>[qv.q1,qv.q2,qv.q3,qv.q4][i]).join(', ');
  const equipItems  = items.filter(i => i.category !== 'Subcontracted Services' && i.category !== 'Manual Items');
  const subItems    = items.filter(i => i.category === 'Subcontracted Services');
  const coverImg    = coverImageDataUrl || building?.photo_url || _payload?.cover_image_url || null;

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 1 — COVER
  // Structure: [Company header band] [Photo] [Blue stripe] [Title + Client]
  // Company branding lives in its own clean band — never overlays photo
  // ─────────────────────────────────────────────────────────────────────────────
  setFill(doc, C.navy); doc.rect(0, 0, pw, 279, 'F');

  // ── COMPANY HEADER BAND (top 22mm, above photo) ───────────────────────────
  const brandH = 22;
  setFill(doc, C.navy); doc.rect(0, 0, pw, brandH, 'F');
  setFill(doc, C.blue);  doc.rect(0, brandH, pw, 1.5, 'F');

  // Logo: right side of brand band — aspect-ratio safe
  let logoEndX = pw - ml;
  if (co.logo_data) {
    try {
      const _clt = co.logo_data.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'PNG';
      let _clw = 44, _clh = 14;
      try {
        const _clp = doc.getImageProperties(co.logo_data);
        const _clr = Math.min(44/_clp.width, 14/_clp.height);
        _clw = +(_clp.width * _clr).toFixed(1); _clh = +(_clp.height * _clr).toFixed(1);
      } catch {}
      doc.addImage(co.logo_data, _clt, pw - ml - _clw, (brandH - _clh) / 2, _clw, _clh, undefined, 'FAST');
      logoEndX = pw - ml - _clw - 6;
    } catch {}
  }
  // Company name + contact left of logo
  setTxt(doc, C.white);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(co.name, ml, 10);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setTxt(doc, [190, 205, 225]);
  const coContact = [co.phone, co.email, co.website].filter(Boolean).join('  ·  ');
  if (coContact) doc.text(coContact, ml, 16);
  setTxt(doc, C.text);

  // ── BUILDING PHOTO — starts below brand band, no text overlay ────────────
  const photoStart = brandH + 1.5;
  const photoMaxH  = coverImg ? 95 : 0;
  let photoH = 0;
  if (coverImg) {
    try {
      const imgType = coverImg.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'JPEG';
      let iw = pw, ih = photoMaxH;
      try {
        const props = doc.getImageProperties(coverImg);
        const ratio = Math.min(pw / props.width, photoMaxH / props.height);
        iw = +(props.width * ratio).toFixed(1); ih = +(props.height * ratio).toFixed(1);
      } catch {}
      const ix = (pw - iw) / 2;
      doc.addImage(coverImg, imgType, ix, photoStart, iw, ih, undefined, 'FAST');
      photoH = ih;
      // Subtle dark fade at bottom of photo
      setFill(doc, C.navy);
      doc.setGState && doc.setGState(new doc.GState({ opacity: 0.45 }));
      doc.rect(0, photoStart + ih - 20, pw, 20, 'F');
      doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
    } catch {}
  }

  // ── BLUE ACCENT STRIPE (below photo) ───────────────────────────────────────
  const stripeY = photoStart + photoH;
  setFill(doc, C.blue); doc.rect(0, stripeY, pw, 2, 'F');

  // ── CONTENT AREA — fixed layout below stripe, above bottom 40mm ────────────
  // Two-column: left=title+client, right=pricing summary
  const contentTop = stripeY + 2;
  const contentH   = 279 - contentTop - 2;   // remaining page height
  const halfW      = (mr - ml) / 2 - 5;

  // Left column: title + prepared for
  let ty = contentTop + 8;
  setTxt(doc, C.white);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text('PREVENTIVE MAINTENANCE', ml, ty); ty += 9;
  setTxt(doc, C.blueAcc); doc.setFontSize(22);
  doc.text('PROPOSAL', ml, ty); ty += 9;
  setTxt(doc, [180, 196, 220]); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(proposal.title || (visitLabels + ' PM Agreement'), ml, ty); ty += 10;

  // Divider
  setFill(doc, C.blue); doc.rect(ml, ty, halfW, 0.8, 'F'); ty += 5;

  // PREPARED FOR block
  setTxt(doc, [140, 158, 185]); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
  doc.text('PREPARED FOR', ml, ty); ty += 5;
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  const clientName = building?.client_name || building?.client_company || building?.name || 'To Be Confirmed';
  const clines = doc.splitTextToSize(clientName, halfW);
  doc.text(clines, ml, ty); ty += clines.length * 6.5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, [200, 215, 235]);
  if (building?.client_company && building?.client_name) {
    const ccl = doc.splitTextToSize(building.client_company, halfW);
    doc.text(ccl, ml, ty); ty += ccl.length * 5;
  }
  if (building?.name && building.name !== clientName) {
    const bnl = doc.splitTextToSize(building.name, halfW);
    doc.text(bnl, ml, ty); ty += bnl.length * 5;
  }
  if (building?.strata_number) { doc.text('Strata Plan ' + building.strata_number, ml, ty); ty += 5; }
  const addrLine = [building?.address, building?.city, building?.province].filter(Boolean).join(', ');
  if (addrLine) { const al = doc.splitTextToSize(addrLine, halfW); doc.text(al, ml, ty); }

  // Right column: pricing + proposal details
  const rx = ml + halfW + 10;
  let ry = contentTop + 8;

  // Annual value box
  setFill(doc, [255,255,255]); doc.setGState && doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.rect(rx, ry - 4, halfW, 26, 'F');
  doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
  setTxt(doc, [140, 158, 185]); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('ANNUAL CONTRACT VALUE', rx + 4, ry); ry += 7;
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(formatCurrency(annual), rx + 4, ry); ry += 10;
  setTxt(doc, [180, 196, 220]); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(formatCurrency(monthly) + ' / month', rx + 4, ry); ry += 12;

  // Proposal detail rows
  const detailRows = [
    ['Proposal #', proposal.proposal_number || 'DRAFT'],
    ['Date', formatDate(proposal.created_date)],
    ['Valid Until', formatDate(proposal.valid_until)],
    ['Service Visits', visitLabels + ' (' + visitCount + '/yr)'],
    ['Payment', proposal.payment_terms || 'Net 30'],
  ].filter(r => r[1]);
  doc.setFontSize(8);
  detailRows.forEach(([k, v]) => {
    setTxt(doc, [140, 158, 185]); doc.setFont('helvetica', 'bold'); doc.text(k + ':', rx + 4, ry);
    setTxt(doc, C.white); doc.setFont('helvetica', 'normal');
    const vl = doc.splitTextToSize(v, halfW - 40);
    doc.text(vl, rx + halfW - 2, ry, { align: 'right' });
    ry += 5.5;
  });

  addFooter(doc, page.n, proposal);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 2 — COMPANY INTRODUCTION
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  let y = addHeader(doc, 'ABOUT US', `#${proposal.proposal_number || 'DRAFT'}`);

  // Company intro blurb
  const blurb = co.company_blurb ||
    `${co.name} is a full-service mechanical contracting company providing preventive maintenance, service, and installation for commercial, strata, and industrial properties throughout British Columbia. Our licensed mechanical technicians deliver scheduled maintenance programs designed to protect your building assets, reduce lifecycle costs, and ensure regulatory compliance.\n\nWith each visit our technicians complete a detailed inspection and service report, identifying deficiencies early — before they become costly failures.`;

  setFill(doc, C.blueLight); doc.rect(ml, y - 2, mr - ml, 1.5, 'F');
  y += 4;
  setTxt(doc, C.text); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  const bl = doc.splitTextToSize(blurb, mr - ml);
  doc.text(bl, ml, y); y += bl.length * 5.2 + 10;

  y = sectionHead(doc, 'What Is Included', y);

  const included = [
    'Scheduled preventive maintenance at agreed visit intervals (Q1, Q2, Q3, Q4 and/or Annual Cleaning)',
    'Comprehensive equipment inspection, lubrication, cleaning, and adjustment',
    'Safety control testing and function verification to applicable codes',
    'Deficiency identification with written report and cost estimate',
    'Equipment performance logging and trend monitoring',
    '24-hour emergency service line access',
    'Annual performance review with property management',
    'Detailed field service reports delivered within 5 business days of each visit',
  ];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
  included.forEach(s => {
    y = chk(doc, y, 6, page, proposal);
    setFill(doc, C.blue); doc.rect(ml + 1, y - 2.5, 2, 2, 'F');
    doc.text(s, ml + 7, y); y += 5.5;
  });

  // Sales/management contact
  y = chk(doc, y, 28, page, proposal);
  y += 6;
  setFill(doc, C.lightgrey); doc.rect(ml, y - 4, mr - ml, 24, 'F');
  setFill(doc, C.blue); doc.rect(ml, y - 4, 3, 24, 'F');
  setTxt(doc, C.charcoal);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('Your Account Team', ml + 8, y + 2); y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const teamLines = [
    co.sales_person      ? `Sales: ${co.sales_person}` : null,
    co.sales_manager     ? `Manager: ${co.sales_manager}` : null,
    co.division_manager  ? `Division: ${co.division_manager}` : null,
    co.contact_phone     ? `Direct: ${co.contact_phone}` : (co.phone ? `Phone: ${co.phone}` : null),
    co.email             ? `Email: ${co.email}` : null,
  ].filter(Boolean);
  const half = Math.ceil(teamLines.length / 2);
  teamLines.slice(0, half).forEach(l => { doc.text(l, ml + 8, y); y += 5; });
  // Second column
  let ty2 = y - (half * 5);
  teamLines.slice(half).forEach(l => { doc.text(l, ml + 100, ty2); ty2 += 5; });

  addFooter(doc, page.n, proposal);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 3 — PRICING & ACCEPTANCE
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'PROPOSAL — PRICING & ACCEPTANCE', `#${proposal.proposal_number || 'DRAFT'}`);

  // Building info bar
  setFill(doc, C.lightgrey); doc.rect(ml, y - 4, mr - ml, 18, 'F');
  setFill(doc, C.blue); doc.rect(ml, y - 4, 3, 18, 'F');
  y += 1;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setTxt(doc, C.charcoal);
  const bnFull = doc.splitTextToSize(building?.name || '—', (mr - ml) / 2 - 10);
  doc.text(bnFull, ml + 8, y);
  const cnFull = doc.splitTextToSize(building?.client_name || building?.client_company || '—', (mr - ml) / 2 - 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setTxt(doc, C.midgrey);
  doc.text(cnFull, ml + 8, y + 6);
  if (building?.strata_number) {
    doc.setFontSize(8.5); doc.text(`Strata Plan ${building.strata_number}`, ml + 100, y);
  }
  const a3 = [building?.address, building?.city, building?.province].filter(Boolean).join(', ');
  if (a3) { doc.setFontSize(8.5); setTxt(doc, C.midgrey); const a3l = doc.splitTextToSize(a3, (mr-ml)/2-6); doc.text(a3l, ml+100, y+6); }
  y += 22;

  // Service regimen bar
  setFill(doc, C.blueLight); doc.rect(ml, y - 4, mr - ml, 14, 'F');
  setFill(doc, C.blue); doc.rect(ml, y - 4, 3, 14, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('Service Visits:', ml + 8, y + 1);
  doc.setFont('helvetica', 'normal'); setTxt(doc, C.text);
  doc.text(`${visitLabels}${qv.annual_clean ? ' + Annual Cleaning' : ''} — ${visitCount} visit${visitCount !== 1 ? 's' : ''}/year`, ml + 38, y + 1);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('Service Area:', ml + 8, y + 7);
  doc.setFont('helvetica', 'normal'); setTxt(doc, C.text);
  doc.text(saDesc(proposal.service_area_type), ml + 38, y + 7);
  y += 18;

  // ── PRICING BOX ──────────────────────────────────────────────────────────────
  const boxTop = y;
  const manSubtot = manItems.reduce((s,m) => s + (Number(m.value)||0)*(Number(m.qty)||1), 0);
  const subSubtot = subItems.reduce((s,i) => s + Number(i.annual_price||0), 0);

  // Main pricing breakdown
  const pRows = [
    { label: 'Preventive Maintenance Labour',    val: annual - subSubtot - manSubtot },
    subSubtot > 0 ? { label: 'Subcontracted Services', val: subSubtot } : null,
    manSubtot > 0 ? { label: 'Additional Services',    val: manSubtot } : null,
  ].filter(Boolean);

  const boxH = 14 + pRows.length * 8 + 28 + (manItems.length * 5) + 4;
  setFill(doc, C.lightgrey); doc.rect(ml, boxTop, mr - ml, boxH, 'F');
  setDraw(doc, C.blueLight); doc.setLineWidth(0.4); doc.rect(ml, boxTop, mr - ml, boxH);
  doc.setLineWidth(0.2);

  let py = boxTop + 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setTxt(doc, C.midgrey);
  doc.text('CONTRACT BREAKDOWN', ml + 6, py); py += 6;

  pRows.forEach((row, i) => {
    if (i > 0) { setDraw(doc, [210,218,230]); doc.line(ml + 6, py - 2, mr - 6, py - 2); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setTxt(doc, C.charcoal);
    doc.text(row.label, ml + 6, py);
    doc.setFont('helvetica', 'bold'); doc.text(formatCurrency(row.val), mr - 6, py, { align: 'right' });
    py += 8;
  });

  // Manual items detail
  if (manItems.length) {
    manItems.forEach(m => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setTxt(doc, C.midgrey);
      doc.text(`  ·  ${m.description || 'Additional item'}`, ml + 10, py);
      doc.text(formatCurrency((Number(m.value)||0)*(Number(m.qty)||1)) + '/yr', mr - 6, py, { align: 'right' });
      py += 5;
    });
  }

  // Divider
  setDraw(doc, C.blue); doc.line(ml + 6, py, mr - 6, py); py += 5;

  // ANNUAL CONTRACT VALUE — large prominent
  setFill(doc, C.navy); doc.rect(ml, py - 2, mr - ml, 16, 'F');
  setTxt(doc, [160, 174, 192]); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('ANNUAL CONTRACT VALUE', ml + 6, py + 4);
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(formatCurrency(annual), mr - 6, py + 10, { align: 'right' });
  py += 20;

  // Monthly billing
  setFill(doc, C.blueLight); doc.rect(ml, py - 4, mr - ml, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setTxt(doc, C.charcoal);
  doc.text('Monthly Billing', ml + 6, py + 2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); setTxt(doc, C.blue);
  doc.text(formatCurrency(monthly), mr - 6, py + 3, { align: 'right' });
  py += 12;

  y = py + 8;

  // Customer notes/requests
  const noteText = [building?.notes, building?.building_notes, proposal?.notes].filter(Boolean).join('\n');
  if (noteText) {
    y = chk(doc, y, 20, page, proposal);
    setFill(doc, C.lightgrey); doc.rect(ml, y - 4, mr - ml, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setTxt(doc, C.charcoal);
    doc.text('Customer Notes / Special Requirements', ml + 4, y);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
    const nLines = doc.splitTextToSize(noteText, mr - ml - 8);
    doc.text(nLines, ml + 4, y); y += nLines.length * 5 + 6;
  }

  // ── PREPARED BY ──────────────────────────────────────────────────────────────
  const _salesRep  = proposal.owner || proposal.sales_rep || co.sales_person || co.default_sales_rep || null;
  const _salesTitle = co.sales_title || 'Service Sales';
  if (_salesRep) {
    y = chk(doc, y, 22, page, proposal);
    y += 2;
    setFill(doc, C.lightgrey); doc.rect(ml, y - 4, (mr - ml) / 2 - 4, 20, 'F');
    setFill(doc, C.blue); doc.rect(ml, y - 4, 3, 20, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setTxt(doc, C.midgrey);
    doc.text('PREPARED BY', ml + 8, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); setTxt(doc, C.charcoal);
    doc.text(_salesRep, ml + 8, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, C.midgrey);
    doc.text(_salesTitle, ml + 8, y + 11);
    doc.text(co.name, ml + 8, y + 16);
    setTxt(doc, C.text);
    y += 24;
  }

  // ── ACCEPTANCE / SIGNATURES ──────────────────────────────────────────────────
  y = chk(doc, y, 68, page, proposal);
  y += 4;
  y = sectionHead(doc, 'Acceptance & Signatures', y, C.charcoal);
  y += 2;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
  doc.text('By signing below, both parties agree to the terms and scope described in this proposal.', ml, y); y += 10;

  const colW    = (mr - ml) / 2 - 6;
  const leftX   = ml;
  const rightX  = ml + colW + 12;

  // ── Customer block ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('CUSTOMER / AUTHORIZED REPRESENTATIVE', leftX, y); y += 8;

  const custFields = [
    ['Signature', null],
    ['Name & Title', null],
    ['Company / Organization', building?.client_company || building?.name || null],
    ['Date', null],
  ];
  let custY = y;
  custFields.forEach(([lbl, prefill]) => {
    setDraw(doc, C.charcoal); doc.setLineWidth(0.4);
    doc.line(leftX, custY + 9, leftX + colW, custY + 9);
    doc.setLineWidth(0.1);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setTxt(doc, C.midgrey);
    doc.text(lbl + ':', leftX, custY + 3);
    if (prefill) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setTxt(doc, C.text);
      doc.text(prefill, leftX, custY + 7.5);
    }
    custY += 14;
  });

  // ── MEC / Contractor block ──────────────────────────────────────────────────
  const signatoryName  = co.signatory  || co.signatory_name  || co.sales_manager || co.division_manager || null;
  const signatoryTitle = co.signatory_title || 'Authorized Signatory';

  let mecY = y;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text(`${co.name}`.toUpperCase(), rightX, mecY - 8);
  const mecFields = [
    ['Signature', null],
    ['Name', signatoryName],
    ['Title', signatoryTitle],
    ['Date', null],
  ];
  mecFields.forEach(([lbl, prefill]) => {
    setDraw(doc, C.blue); doc.setLineWidth(0.4);
    doc.line(rightX, mecY + 9, rightX + colW, mecY + 9);
    doc.setLineWidth(0.1);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setTxt(doc, C.midgrey);
    doc.text(lbl + ':', rightX, mecY + 3);
    if (prefill) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setTxt(doc, C.charcoal);
      doc.text(prefill, rightX, mecY + 7.5);
    }
    mecY += 14;
  });

  y = Math.max(custY, mecY) + 4;

  addFooter(doc, page.n, proposal);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 4 — EQUIPMENT SCHEDULE
  // Grouped by equipment type with visual sub-headers; no per-item pricing
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'EQUIPMENT SCHEDULE', `#${proposal.proposal_number || 'DRAFT'}`);

  // Column header row
  setFill(doc, C.navy); doc.rect(ml, y - 4, mr - ml, 8, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('Tag',      ml + 2,   y);
  doc.text('Type',     ml + 20,  y);
  doc.text('Make / Model', ml + 78, y);
  doc.text('Area',     ml + 132, y);
  doc.text('Qty',      ml + 162, y);
  setTxt(doc, C.text); y += 9;

  const saShort = { common_strata: 'Common', commercial: 'Commercial', residential_in_suite: 'In-Suite', shared: 'Shared' };

  // Build type groups maintaining item order but visually grouped
  const typeGroups = {};
  const typeOrder  = [];
  equipItems.forEach(item => {
    const t = item.equipment_type || 'Other';
    if (!typeGroups[t]) { typeGroups[t] = []; typeOrder.push(t); }
    typeGroups[t].push(item);
  });

  typeOrder.forEach(type => {
    const group = typeGroups[type];
    const totalQty = group.reduce((s, i) => s + (Number(i.qty) || 1), 0);
    y = chk(doc, y, 14, page, proposal);
    y = typeHead(doc, type, totalQty, y);

    group.forEach((item, idx) => {
      y = chk(doc, y, 7, page, proposal);
      if (idx % 2 === 0) { setFill(doc, [249,250,252]); doc.rect(ml, y - 3.5, mr - ml, 6.5, 'F'); }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setTxt(doc, C.charcoal);
      doc.text(item.tag || '—', ml + 2, y);
      doc.setFont('helvetica', 'normal'); setTxt(doc, C.text);
      doc.text(item.equipment_type || '', ml + 20, y);
      const mm = [item.manufacturer || item.make, item.model].filter(Boolean).join(' ');
      if (mm) { setTxt(doc, C.midgrey); doc.text(mm, ml + 78, y); setTxt(doc, C.text); }
      doc.text(saShort[item.service_area || ''] || '—', ml + 132, y);
      doc.text(String(item.qty || 1), ml + 164, y);
      y += 6;
    });
    y += 3;
  });

  // Type count summary table
  y = chk(doc, y, 16 + typeOrder.length * 5, page, proposal);
  y += 4;
  setDraw(doc, C.blueLight); doc.line(ml, y, mr, y); y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('EQUIPMENT COUNT SUMMARY', ml, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setTxt(doc, C.text);
  const colW2 = (mr - ml) / 3;
  typeOrder.forEach((t, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const qty = typeGroups[t].reduce((s, i) => s + (Number(i.qty) || 1), 0);
    const x = ml + col * colW2;
    const yy = y + row * 5;
    if (col === 0) y = chk(doc, yy, 5, page, proposal);
    setFill(doc, C.blueLight); doc.setFontSize(7);
    doc.text(`${t}:`, x, yy);
    setTxt(doc, C.blue); doc.setFont('helvetica', 'bold');
    doc.text(`${qty} unit${qty !== 1 ? 's' : ''}`, x + colW2 - 8, yy, { align: 'right' });
    setTxt(doc, C.text); doc.setFont('helvetica', 'normal');
  });
  const totalUnits = equipItems.reduce((s, i) => s + (Number(i.qty) || 1), 0);
  y += Math.ceil(typeOrder.length / 3) * 5 + 4;
  y = chk(doc, y, 6, page, proposal);
  setFill(doc, C.navy); doc.rect(ml, y - 3, mr - ml, 7, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text(`Total Equipment: ${totalUnits} units across ${typeOrder.length} type${typeOrder.length !== 1 ? 's' : ''}`, ml + 4, y + 1);

  addFooter(doc, page.n, proposal);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 5 — MAINTENANCE SCOPE OF WORK
  // One scope block per equipment type — not per individual asset
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'MAINTENANCE SCOPE OF WORK', `#${proposal.proposal_number || 'DRAFT'}`);

  // Regimen summary banner
  setFill(doc, C.blueLight); doc.rect(ml, y - 4, mr - ml, 12, 'F');
  setFill(doc, C.blue); doc.rect(ml, y - 4, 3, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setTxt(doc, C.charcoal);
  doc.text('Service Schedule:', ml + 8, y + 2);
  doc.setFont('helvetica', 'normal'); setTxt(doc, C.text);
  doc.text(`${visitLabels}${qv.annual_clean ? ' + Annual Cleaning/Teardown' : ''} — ${visitCount} visit${visitCount !== 1 ? 's' : ''}/year`, ml + 48, y + 2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setTxt(doc, C.charcoal);
  doc.text('Service Area:', ml + 8, y + 8);
  doc.setFont('helvetica', 'normal'); setTxt(doc, C.text);
  doc.text(saDesc(proposal.service_area_type), ml + 40, y + 8);
  y += 16;

  // Scope grouped by type — one entry per type
  const typeScope = _payload?.type_scope || (() => {
    const ts = {};
    equipItems.forEach(item => {
      const t = item.equipment_type || 'Other';
      if (!ts[t]) ts[t] = { lines: item.scope_lines || [], qty: 0, make: '', tags: [], examples: [] };
      ts[t].qty  += Number(item.qty) || 1;
      ts[t].make  = ts[t].make || item.manufacturer || item.make || '';
      if (item.tag) { ts[t].tags.push(item.tag); ts[t].examples.push(item.tag); }
    });
    return ts;
  })();

  Object.entries(typeScope).forEach(([type, data]) => {
    y = chk(doc, y, 20, page, proposal);

    // Type header with unit count
    setFill(doc, C.blueLight); doc.rect(ml, y - 4, mr - ml, 12, 'F');
    setFill(doc, C.blue); doc.rect(ml, y - 4, 3, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); setTxt(doc, C.charcoal);
    doc.text(`${type}`, ml + 8, y + 2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setTxt(doc, C.blue);
    doc.text(`×${data.qty} unit${data.qty !== 1 ? 's' : ''}`, mr - 6, y + 2, { align: 'right' });

    // Asset tags below type name
    if (data.tags?.length) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setTxt(doc, C.midgrey);
      const tagStr = `Tags: ${data.tags.slice(0, 10).join(', ')}${data.tags.length > 10 ? ' …' : ''}`;
      doc.text(tagStr, ml + 8, y + 7);
    }
    setTxt(doc, C.text);
    y += 14;

    // Scope bullet lines
    const lines = data.lines || [];
    if (!lines.length) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); setTxt(doc, C.midgrey);
      doc.text('Scope to be confirmed.', ml + 6, y); y += 6;
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
      lines.forEach(line => {
        y = chk(doc, y, 7, page, proposal);
        const wrapped = doc.splitTextToSize(line, mr - ml - 12);
        setFill(doc, C.blue); doc.rect(ml + 4, y - 1.5, 1.5, 1.5, 'F');
        doc.text(wrapped, ml + 9, y);
        y += wrapped.length * 4.5;
      });
    }
    y += 5;
  });

  // Subcontracted services
  if (subItems.length) {
    y = chk(doc, y, 16, page, proposal);
    y = sectionHead(doc, 'Subcontracted & Third-Party Services', y, C.charcoal);
    subItems.forEach(item => {
      y = chk(doc, y, 12, page, proposal);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setTxt(doc, C.charcoal);
      doc.text(item.equipment_type, ml + 4, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
      (item.scope_lines || []).forEach(line => {
        const w = doc.splitTextToSize(`•  ${line}`, mr - ml - 8);
        doc.text(w, ml + 6, y); y += w.length * 4.5;
      });
      y += 3;
    });
  }

  addFooter(doc, page.n, proposal);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 6 — TERMS & CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'TERMS & CONDITIONS', `#${proposal.proposal_number || 'DRAFT'}`);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
  const termText  = defaultTerms(co);
  const termParts = termText.split('\n\n');
  termParts.forEach(para => {
    if (!para.trim()) return;
    y = chk(doc, y, 10, page, proposal);
    const colonIdx = para.indexOf(':');
    if (colonIdx > -1 && colonIdx < 25) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
      doc.text(para.slice(0, colonIdx + 1), ml, y);
      doc.setFont('helvetica', 'normal'); setTxt(doc, C.text);
      const rest = doc.splitTextToSize(para.slice(colonIdx + 1).trim(), mr - ml);
      doc.text(rest, ml, y + 5); y += rest.length * 4.5 + 7;
    } else {
      const lines = doc.splitTextToSize(para, mr - ml);
      doc.text(lines, ml, y); y += lines.length * 4.5 + 5;
    }
  });
  addFooter(doc, page.n, proposal);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 7 — RATE SHEET
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'SCHEDULE D — LABOUR RATES', `#${proposal.proposal_number || 'DRAFT'}`);

  const yr = new Date().getFullYear();
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setTxt(doc, C.text);
  doc.text(`${co.name} — Prevailing Labour Rates ${yr}`, ml, y); y += 8;
  doc.setFontSize(8.5);
  const rateNote = 'Rates apply to scheduled service visits and emergency work not covered under a maintenance contract. Subject to annual review with 30 days notice.';
  const rnl = doc.splitTextToSize(rateNote, mr - ml);
  setTxt(doc, C.midgrey); doc.text(rnl, ml, y); y += rnl.length * 4.5 + 8;

  const lr = CONFIG.LABOUR_RATES || {};
  const rateRows = [
    { label: 'Weekday Service Call (minimum)',  val: lr.weekday_callout || 145, note: 'includes 0.5 hr labour + travel allowance' },
    { label: 'Weekday Hourly Rate',             val: lr.weekday_hourly  || 115, note: 'per hour after minimum' },
    { label: 'Saturday / After-Hours Callout',  val: lr.weekend_callout || 260, note: 'minimum charge' },
    { label: 'Saturday / After-Hours Hourly',   val: lr.weekend_hourly  || 230, note: 'per hour' },
    { label: 'PM Contract Rate',                val: lr.pm_hourly       || 115, note: 'scheduled visit rate' },
    { label: 'Emergency / Holiday',             val: null,                      note: 'By quotation' },
  ];

  setFill(doc, C.navy); doc.rect(ml, y - 3, mr - ml, 8, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('Service Type', ml + 4, y + 1.5);
  doc.text('Rate', mr - 50, y + 1.5);
  doc.text('Notes', mr - 4, y + 1.5, { align: 'right' });
  setTxt(doc, C.text); y += 9;

  rateRows.forEach((row, idx) => {
    y = chk(doc, y, 8, page, proposal);
    if (idx % 2 === 0) { setFill(doc, C.lightgrey); doc.rect(ml, y - 3, mr - ml, 7, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setTxt(doc, C.charcoal);
    doc.text(row.label, ml + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.text(row.val != null ? formatCurrency(row.val) + '/hr' : row.note, mr - 50, y);
    if (row.val != null) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setTxt(doc, C.midgrey); doc.text(row.note, mr - 4, y, { align: 'right' }); }
    setTxt(doc, C.text); y += 7;
  });

  y += 6;
  if (co.tsb) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setTxt(doc, C.midgrey); doc.text(`BC Contractors Licence / TSB: ${co.tsb}`, ml, y); y += 5; }

  addFooter(doc, page.n, proposal);

  // ─────────────────────────────────────────────────────────────────────────────
  // Final page count pass — no additional content currently in Section 8 (optional)
  // ─────────────────────────────────────────────────────────────────────────────
  doc.save(`Proposal-${proposal.proposal_number || 'Draft'}.pdf`);
}

// ─── Backwards-compatible simple export ──────────────────────────────────────────
export function generateProposalPDF(proposal, building) {
  generateProposalPDFEnhanced(proposal, building, building?.photo_url || null);
}

// ─── Quote PDF ────────────────────────────────────────────────────────────────────
export function generateQuotePDF(quote, building) {
  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit:'mm', format:'letter' });
  const co    = getCompany();
  setFill(doc, C.navy); doc.rect(0, 0, pw, 22, 'F');
  setFill(doc, C.blue); doc.rect(0, 22, pw, 2, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(co.name, ml, 13);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('DEFICIENCY QUOTE', pw - ml, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text(`#${quote.quote_number || 'DRAFT'}`, pw - ml, 19, { align: 'right' });
  setTxt(doc, C.text);
  let y = 32;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const cn = doc.splitTextToSize(building?.client_name || building?.name || '—', 100);
  doc.text(cn, ml, y); y += cn.length * 5 + 2;
  if (building?.address) { doc.text(building.address, ml, y); y += 5; }
  y += 5;
  const items = quote.line_items || [];
  setFill(doc, C.navy); doc.rect(ml, y - 3, mr - ml, 7, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('Description', ml + 3, y + 1); doc.text('Total', pw - ml - 3, y + 1, { align: 'right' });
  setTxt(doc, C.text); y += 8;
  items.forEach((item, i) => {
    if (i % 2 === 0) { setFill(doc, C.lightgrey); doc.rect(ml, y - 3, mr - ml, 6.5, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(item.description || '—', ml + 3, y);
    doc.setFont('helvetica', 'bold'); doc.text(formatCurrency(item.total || 0), pw - ml - 3, y, { align: 'right' });
    setTxt(doc, C.text); y += 7;
  });
  const total = quote.subtotal || 0;
  const tax = total * (CONFIG.TAX_RATE || 0.05);
  y += 4;
  setDraw(doc, C.blue); doc.line(ml, y, pw - ml, y); y += 5;
  [['Subtotal', formatCurrency(total), false], ['GST (5%)', formatCurrency(tax), false], ['TOTAL', formatCurrency(total + tax), true]].forEach(([l, v, bold]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 11 : 9);
    doc.text(l, ml + 100, y); doc.text(v, pw - ml - 3, y, { align: 'right' }); y += bold ? 8 : 6;
  });
  const pg = doc.getNumberOfPages();
  for (let p = 1; p <= pg; p++) { doc.setPage(p); addFooter(doc, p, quote); }
  doc.save(`Quote-${quote.quote_number || 'Draft'}.pdf`);
}
