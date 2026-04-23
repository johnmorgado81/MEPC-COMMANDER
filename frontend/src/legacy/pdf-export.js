import { CONFIG } from './config.js';
import { formatCurrency, formatDate } from './helpers.js';
import { buildProposalPayload } from './pm-engine.js';

function getjsPDF() { return window.jspdf.jsPDF; }
function getCompany() {
  try {
    const saved = localStorage.getItem('mepc_company_profile');
    if (saved) return { ...CONFIG.COMPANY, ...JSON.parse(saved) };
  } catch {}
  return { ...CONFIG.COMPANY };
}
export async function warmCompanyCache(UserSettingsModule) {
  try {
    const saved = await UserSettingsModule.get('company_profile');
    if (saved) localStorage.setItem('mepc_company_profile', JSON.stringify(saved));
  } catch {}
}

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:      [11, 18, 35],
  blue:      [37, 99, 235],
  blueLight: [219,234,254],
  charcoal:  [30, 41, 59],
  midgrey:   [100,116,139],
  lightgrey: [241,245,249],
  offwhite:  [248,250,252],
  white:     [255,255,255],
  text:      [15, 23, 42],
};
const sf = (d,c) => d.setFillColor(c[0],c[1],c[2]);
const sd = (d,c) => d.setDrawColor(c[0],c[1],c[2]);
const st = (d,c) => d.setTextColor(c[0],c[1],c[2]);
const pw = 215.9, ml = 14, mr = pw - ml;

// ─── Dual-logo helper ─────────────────────────────────────────────────────────
// variant: 'dark' = dark-background use (header), 'light' = light-background use
function drawLogo(doc, co, x, y, maxW, maxH, variant) {
  const src = variant === 'dark'
    ? (co.logo_dark || co.logo_light || co.logo_data)
    : (co.logo_light || co.logo_dark || co.logo_data);
  if (!src) return 0;
  try {
    const lt = src.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'PNG';
    let lw = maxW, lh = maxH;
    try {
      const lp = doc.getImageProperties(src);
      const r  = Math.min(maxW/lp.width, maxH/lp.height);
      lw = +(lp.width*r).toFixed(1); lh = +(lp.height*r).toFixed(1);
    } catch {}
    doc.addImage(src, lt, x, y + (maxH-lh)/2, lw, lh, undefined, 'FAST');
    return lw;
  } catch { return 0; }
}

// ─── Footer: minimal centered line, no background ────────────────────────────
function addFooter(doc, page, proposal) {
  const co = getCompany();
  const ph = co.contact_phone || co.phone || '604-298-8383';
  const em = co.email || 'john@mecmechanical.ca';
  const wb = co.website || 'www.mecmechanical.ca';
  st(doc, [160,160,160]);
  doc.setFontSize(7); doc.setFont('helvetica','normal');
  doc.text(`${co.name||'MEC Mechanical Inc.'}  ·  ${ph}  ·  ${em}  ·  ${wb}`, pw/2, 284, {align:'center'});
  if (proposal?.proposal_number) {
    doc.text(`Proposal #${proposal.proposal_number}  ·  Page ${page}`, mr, 288, {align:'right'});
  }
  st(doc, C.text);
}

// ─── Header: logo left | title centered | # right — slim navy bar ─────────────
function addHeader(doc, title, propRef) {
  const co = getCompany();
  const hh = 20; // height — ~15% slimmer than previous 24mm
  sf(doc, C.navy); doc.rect(0, 0, pw, hh, 'F');

  // Logo left — dark variant, up to 42×16mm
  const lw = drawLogo(doc, co, ml, 2, 42, 16, 'dark');
  if (!lw) {
    st(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text(co.name||'MEC Mechanical Inc.', ml, 13);
  }

  // Title centered
  st(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text(title, pw/2, 12, {align:'center'});

  // Proposal # right
  if (propRef) {
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
    st(doc, [160,180,220]);
    doc.text(propRef, mr, 16, {align:'right'});
  }

  st(doc, C.text);
  return hh + 8; // y start below header
}

// ─── Section heading ──────────────────────────────────────────────────────────
function secHead(doc, text, y, rgb) {
  const c = rgb || C.navy;
  sf(doc, c); doc.rect(ml, y-4, mr-ml, 8, 'F');
  st(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text(text, ml+5, y+1);
  st(doc, C.text);
  return y + 12;
}

// ─── Type sub-heading ─────────────────────────────────────────────────────────
function typeHead(doc, text, count, y) {
  sf(doc, C.blueLight); doc.rect(ml, y-3, mr-ml, 8, 'F');
  sf(doc, C.blue);      doc.rect(ml, y-3, 3, 8, 'F');
  st(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(text, ml+7, y+2);
  if (count) {
    st(doc, C.midgrey); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(`${count} unit${count!==1?'s':''}`, mr-2, y+2, {align:'right'});
  }
  st(doc, C.text);
  return y + 11;
}

// ─── Page guard ───────────────────────────────────────────────────────────────
function chk(doc, y, need, page, proposal, title) {
  if (y + need > 268) {
    addFooter(doc, page.n, proposal);
    doc.addPage(); page.n++;
    y = addHeader(doc, title||'PLANNED MAINTENANCE PROPOSAL', `#${proposal?.proposal_number||'DRAFT'}`);
  }
  return y;
}

// ─── Service area ─────────────────────────────────────────────────────────────
function saFull(t) {
  return {
    shared:           'Shared Residential & Commercial Common Areas',
    commercial:       'Commercial Common Areas',
    residential:      'Residential Common Areas',
    in_suite:         'Individual Residential Residences',
    commercial_units: 'Individual Commercial Units',
    mixed:            'Mixed — see equipment schedule',
  }[t] || 'Residential Common Areas';
}

// ─── Regimen wording ──────────────────────────────────────────────────────────
function regimenLines(qv, visitCount) {
  const lines = [];
  if (visitCount >= 3)      lines.push('Quarterly System Reviews');
  else if (visitCount === 2) lines.push('Semi-Annual System Reviews');
  else                       lines.push('Annual System Review');
  if (qv?.annual_clean)      lines.push('Annual Comprehensive Maintenance');
  return lines;
}

// ─── Annual tasks ─────────────────────────────────────────────────────────────
const ANNUAL_TASKS = [
  'Full teardown and internal cleaning of heating and cooling equipment',
  'Belt, bearing, and seal inspection and replacement where required',
  'Coil cleaning (chemical or pressure wash as applicable)',
  'Combustion analysis and burner tune-up',
  'Refrigerant charge verification and system leak check',
  'Full controls calibration and safety limit setpoint verification',
  'Strainer and filter media replacement (standard sizes)',
  'Full service report with equipment condition ratings and deficiency list',
];

// ─── Terms ────────────────────────────────────────────────────────────────────
function terms(co) {
  const n = co.name||'MEC Mechanical Inc.';
  return [
    ['PAYMENT TERMS', `Net 30 days from date of invoice. Accounts past due are subject to interest at 2% per month (24% per annum compounded monthly). ${n} reserves the right to suspend services on accounts more than 60 days overdue.`],
    ['SCOPE', `This agreement covers only the planned maintenance services described herein. Repairs, parts replacements, emergency callouts, and any work outside the described scope are not included and will be quoted separately prior to commencement.`],
    ['EXCLUSIONS', `Replacement parts and components; repairs beyond routine maintenance scope; emergency or after-hours labour; equipment commissioning or new installation; owner-caused damage; water treatment chemicals unless specified in writing.`],
    ['ACCESS', `Client shall provide reasonable and safe access to all equipment during scheduled visits, including physical access to mechanical rooms, rooftops, and penthouses, and remote access to any DDC building automation system with full operator-level user access rights. Inaccessible equipment may be deferred and may result in additional charges.`],
    ['CONTRACT TERM', `Initial term of three (3) years from the acceptance date. Following the initial term, this agreement automatically renews for successive one-year terms unless either party provides written notice of non-renewal not less than 60 days prior to the renewal date.`],
    ['RATE ADJUSTMENTS', `Labour and contract rates are subject to annual adjustment at the beginning of each contract year, with 30 days written notice. Adjustments will not exceed the greater of 5% or the prior-year BC CPI index.`],
    ['REPORTING', `${n} will deliver a written field service report within 5 business days of each scheduled visit covering work performed, equipment condition, and any deficiencies. Deficiencies will be quoted separately.`],
    ['LIMITATION OF LIABILITY', `In no event shall ${n} be liable for indirect, consequential, special, or punitive damages. Maximum liability is limited to the annual contract value.`],
    ['GOVERNING LAW', `This agreement is governed by the laws of British Columbia, Canada. The parties submit to the exclusive jurisdiction of the courts of British Columbia.`],
  ];
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════════
export function generateProposalPDFEnhanced(proposal, building, coverImageDataUrl) {
  let _pl = null;
  try { _pl = buildProposalPayload(proposal, building, null); } catch {}

  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit:'mm', format:'letter' });
  const co    = getCompany();
  const page  = { n:1 };

  const annual     = (_pl?.annual>0?_pl.annual:null)||Number(proposal.annual_value)||0;
  const monthly    = (_pl?.monthly>0?_pl.monthly:null)||Number(proposal.monthly_value)||annual/12;
  const items      = _pl?.scope_items||proposal.scope_items||[];
  const manItems   = (_pl?.manual_items||proposal.manual_items||[]).filter(m=>m.include!==false&&m.client_facing);
  const qv         = _pl?.quarter_visits||proposal.quarter_visits||{q1:true,q2:true,q3:true,q4:true,annual_clean:false};
  const visitCount = _pl?.visit_count||[qv.q1,qv.q2,qv.q3,qv.q4].filter(Boolean).length||4;
  const equipItems = items.filter(i=>i.category!=='Subcontracted Services'&&i.category!=='Manual Items');
  const subItems   = items.filter(i=>i.category==='Subcontracted Services');
  const coverImg   = coverImageDataUrl||building?.photo_url||_pl?.cover_image_url||null;
  const hasAnnual  = !!qv.annual_clean;
  const rLines     = regimenLines(qv, visitCount);
  const clientName = building?.client_name||building?.client_company||building?.name||'To Be Confirmed';
  const propNum    = proposal.proposal_number||'DRAFT';
  const salesRep   = proposal.owner||proposal.sales_rep||co.sales_person||null;
  const sigName    = co.signatory||co.signatory_name||co.sales_manager||null;
  const sigTitle   = (co.signatory_title||'Authorized Signatory').replace(/[,;]+$/,'');

  // ── PAGE 1: COVER ────────────────────────────────────────────────────────────
  sf(doc, C.white); doc.rect(0, 0, pw, 279, 'F');

  // Company band — slim, navy
  const brandH = 22;
  sf(doc, C.navy); doc.rect(0, 0, pw, brandH, 'F');

  // Logo left — dark variant, larger (55×18mm)
  const covLogoW = drawLogo(doc, co, ml, (brandH-18)/2, 55, 18, 'dark');
  if (!covLogoW) {
    st(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text(co.name||'MEC Mechanical Inc.', ml, 15);
  }

  // Photo — full width, 115mm max (~15% increase from 100)
  const photoStart = brandH;
  const photoMaxH  = 115;
  let photoH = 0;
  if (coverImg) {
    try {
      const it = coverImg.match(/data:image\/(\w+)/)?.[1]?.toUpperCase()||'JPEG';
      let iw = pw, ih = photoMaxH;
      try {
        const p = doc.getImageProperties(coverImg);
        const r = Math.min(pw/p.width, photoMaxH/p.height);
        iw = +(p.width*r).toFixed(1); ih = +(p.height*r).toFixed(1);
      } catch {}
      doc.addImage(coverImg, it, (pw-iw)/2, photoStart, iw, ih, undefined, 'FAST');
      photoH = ih;
    } catch {}
  }

  const stripeY = photoStart + photoH;
  sf(doc, C.blue); doc.rect(0, stripeY, pw, 1.5, 'F');

  // Content below stripe — two columns, tighter spacing
  const ctTop = stripeY + 3;
  const halfW = (mr-ml)/2 - 6;

  // Left col
  let ty = ctTop + 5;
  st(doc, C.navy);  doc.setFont('helvetica','bold'); doc.setFontSize(19);
  doc.text('PLANNED MAINTENANCE', ml, ty); ty += 9;
  st(doc, C.blue);  doc.setFontSize(23);
  doc.text('PROPOSAL', ml, ty); ty += 10;

  sf(doc, C.blue); doc.rect(ml, ty, halfW, 0.7, 'F'); ty += 4;

  st(doc, C.midgrey); doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
  doc.text('PREPARED FOR', ml, ty); ty += 4;
  st(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(12);
  const cl = doc.splitTextToSize(clientName, halfW);
  doc.text(cl, ml, ty); ty += cl.length * 6;
  st(doc, C.charcoal); doc.setFont('helvetica','normal'); doc.setFontSize(8);
  if (building?.client_company && building?.client_name) {
    const ccl = doc.splitTextToSize(building.client_company, halfW);
    doc.text(ccl, ml, ty); ty += ccl.length*4.5;
  }
  if (building?.name && building.name !== clientName) {
    const bnl = doc.splitTextToSize(building.name, halfW);
    doc.text(bnl, ml, ty); ty += bnl.length*4.5;
  }
  if (building?.strata_number) { doc.text('Strata Plan '+building.strata_number, ml, ty); ty += 4.5; }
  const addrL = [building?.address,building?.city,building?.province].filter(Boolean).join(', ');
  if (addrL) { const al=doc.splitTextToSize(addrL,halfW); doc.text(al,ml,ty); }

  // Right col
  const rx = ml + halfW + 12;
  let ry = ctTop + 3;

  // Value block — clean, no box
  st(doc, C.midgrey); doc.setFont('helvetica','bold'); doc.setFontSize(7);
  doc.text('ANNUAL CONTRACT VALUE', rx, ry); ry += 6;
  st(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(20);
  doc.text(formatCurrency(annual), rx, ry); ry += 9;
  st(doc, C.charcoal); doc.setFont('helvetica','normal'); doc.setFontSize(8);
  doc.text(formatCurrency(monthly)+' / month', rx, ry); ry += 7;

  sf(doc, C.blue); doc.rect(rx, ry, halfW, 0.6, 'F'); ry += 4;

  st(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
  doc.text('Service Programme:', rx, ry); ry += 4.5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  rLines.forEach(l => { doc.text('· '+l, rx, ry); ry += 4.5; }); ry += 2;

  st(doc, C.midgrey); doc.setFontSize(7);
  const drows = [['Proposal #',propNum],['Date',formatDate(proposal.created_date)],['Valid Until',formatDate(proposal.valid_until)],['Payment',proposal.payment_terms||'Net 30']].filter(r=>r[1]);
  drows.forEach(([k,v]) => {
    doc.setFont('helvetica','bold'); doc.text(k+':', rx, ry);
    doc.setFont('helvetica','normal');
    const vl = doc.splitTextToSize(v, halfW-28);
    doc.text(vl, rx+halfW-2, ry, {align:'right'}); ry += 4.5;
  });

  addFooter(doc, page.n, proposal);

  // ── PAGE 2: INTRO LETTER ─────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  let y = addHeader(doc, 'PLANNED MAINTENANCE PROPOSAL', `#${propNum}`);

  const dateStr = new Date().toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'});
  const attn    = building?.client_name||building?.client_company||'Property Manager';
  const bldAddr = [building?.address,building?.city,building?.province,building?.postal_code].filter(Boolean).join(', ');
  const reStr   = [building?.name, building?.strata_number?'Strata Plan '+building.strata_number:'', building?.address].filter(Boolean).join(' – ');

  st(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
  doc.text(dateStr, ml, y); y += 8;

  doc.text('Attn: '+attn, ml, y); y += 5;
  if (building?.client_company && building?.client_name) { doc.text(building.client_company, ml, y); y += 5; }
  if (bldAddr) { const bl=doc.splitTextToSize(bldAddr, mr-ml-20); doc.text(bl, ml, y); y += bl.length*5; }
  y += 4;

  doc.setFont('helvetica','bold');
  const reLbl = 'RE:  ';
  doc.text(reLbl, ml, y);
  doc.setFont('helvetica','normal');
  const reL = doc.splitTextToSize(reStr, mr-ml-doc.getTextWidth(reLbl)-2);
  doc.text(reL, ml+doc.getTextWidth(reLbl), y); y += reL.length*5+6;

  const firstName = (building?.client_name||'').split(' ')[0]||attn;
  doc.text(`Dear ${firstName},`, ml, y); y += 8;

  // Blurb — clean, strip markers, NO service list (letter only)
  const rawBlurb = co.company_blurb ||
    `Thank you for the opportunity to submit this Planned Maintenance proposal for ${building?.name||'your property'}. ${co.name||'MEC Mechanical Inc.'} provides comprehensive mechanical planned maintenance services for strata, commercial, and industrial properties throughout British Columbia.\n\nOur licensed technicians perform detailed inspections, cleaning, lubrication, and adjustments on all covered equipment at each scheduled visit. Each visit is followed by a written field service report identifying work performed, equipment condition, and any deficiencies requiring attention.\n\nWe are committed to protecting your mechanical assets, reducing unplanned failures, and ensuring full regulatory compliance throughout the term of this agreement.`;
  const cleanBlurb = rawBlurb.replace(/\[[A-Z]{1,4}\d+\.\d+\]/g,'').replace(/\[[^\]]{0,20}\]/g,'').trim();

  cleanBlurb.split('\n\n').forEach(para => {
    if (!para.trim()) return;
    y = chk(doc, y, 12, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
    const pl = doc.splitTextToSize(para.trim(), mr-ml);
    doc.text(pl, ml, y); y += pl.length*5.2+4;
  });

  // One sentence for annual if selected
  if (hasAnnual) {
    y = chk(doc, y, 10, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
    y += 2;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
    const annSentence = 'This proposal also includes an Annual Comprehensive Maintenance visit, providing a full equipment teardown, deep cleaning, combustion analysis, and controls calibration beyond the scope of routine quarterly visits.';
    const asl = doc.splitTextToSize(annSentence, mr-ml);
    doc.text(asl, ml, y); y += asl.length*5.2+4;
  }

  // Sign-off
  y = chk(doc, y, 28, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
  y += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
  doc.text('We look forward to the opportunity to serve your property. Please do not hesitate to contact us with any questions.', ml, y); y += 9;
  doc.text('Sincerely,', ml, y); y += 12;
  if (salesRep) {
    doc.setFont('helvetica','bold'); doc.text(salesRep, ml, y); y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); st(doc, C.midgrey);
    doc.text(co.sales_title||'Service Sales', ml, y); y += 5;
    doc.text(co.name, ml, y);
  } else {
    doc.text(co.name, ml, y);
  }

  addFooter(doc, page.n, proposal);

  // ── PAGE 3: PROPOSAL SUMMARY ─────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'PLANNED MAINTENANCE PROPOSAL', `#${propNum}`);

  // Title
  st(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('PROPOSAL SUMMARY', pw/2, y, {align:'center'}); y += 10;

  // Prepared-for block — flat, no box
  const prepOrg = building?.client_company||building?.name||'';
  const rows3 = [
    ['Prepared For', clientName + (prepOrg && prepOrg!==clientName ? '  —  '+prepOrg : '')],
    ['Property',     [building?.name, building?.strata_number?'Strata Plan '+building.strata_number:'', building?.address].filter(Boolean).join(', ')],
    ['Service Area', saFull(proposal.service_area_type)],
    ['Service Programme', rLines.join('  +  ')],
    ['Prepared By', salesRep||'—'],
  ].filter(r=>r[1]&&r[1]!=='—'||r[0]==='Service Programme');

  st(doc, C.text); doc.setFontSize(9);
  rows3.forEach(([k,v]) => {
    doc.setFont('helvetica','bold'); st(doc, C.charcoal); doc.text(k+':', ml, y);
    doc.setFont('helvetica','normal'); st(doc, C.text);
    const vl = doc.splitTextToSize(v, mr-ml-48);
    doc.text(vl, ml+48, y); y += Math.max(6, vl.length*5);
  });

  y += 4;
  sd(doc, [210,215,225]); doc.setLineWidth(0.3); doc.line(ml, y, mr, y); y += 10;

  // Annual contract value — CENTERED, largest text on page
  st(doc, C.midgrey); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('ANNUAL CONTRACT VALUE', pw/2, y, {align:'center'}); y += 9;
  st(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(28);
  doc.text(formatCurrency(annual), pw/2, y, {align:'center'}); y += 12;

  // Monthly below
  st(doc, C.charcoal); doc.setFont('helvetica','normal'); doc.setFontSize(11);
  doc.text('Monthly Billing', pw/2, y, {align:'center'}); y += 7;
  st(doc, C.blue); doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.text(formatCurrency(monthly), pw/2, y, {align:'center'}); y += 12;

  // Manual items if present
  const manSubtot = manItems.reduce((s,m)=>s+(Number(m.value)||0)*(Number(m.qty)||1),0);
  if (manSubtot > 0) {
    st(doc, C.midgrey); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text('Includes additional services: '+formatCurrency(manSubtot)+'/yr', pw/2, y, {align:'center'});
    y += 6;
  }

  y += 4;
  sd(doc, [210,215,225]); doc.line(ml, y, mr, y); y += 10;

  // Acceptance heading
  st(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('ACCEPTANCE & AUTHORIZATION', pw/2, y, {align:'center'}); y += 7;
  st(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  doc.text('By signing below, both parties agree to the terms and scope of work described in this proposal.', pw/2, y, {align:'center'}); y += 10;

  // Signature blocks — two columns, clean lines
  const sigW = (mr-ml)/2 - 8;
  const sigRx = ml + sigW + 16;

  // Customer column
  st(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('CUSTOMER', ml, y); y += 7;
  let cy = y;
  [['Signature',''],['Name & Title',''],['Organization', prepOrg],['Date','']].forEach(([lbl,pre])=>{
    sd(doc, C.charcoal); doc.setLineWidth(0.35);
    doc.line(ml, cy+9, ml+sigW, cy+9); doc.setLineWidth(0.1);
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); st(doc, C.midgrey);
    doc.text(lbl+':', ml, cy+3);
    if (pre) { doc.setFont('helvetica','normal'); doc.setFontSize(7.5); st(doc,C.text); doc.text(pre, ml, cy+7.5); }
    cy += 14;
  });

  // MEC column
  let my = y - 7;
  st(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text((co.name||'MEC MECHANICAL INC.').toUpperCase(), sigRx, my); my += 7;
  [['Signature',''],['Name', sigName||''],['Title', sigTitle],['Date','']].forEach(([lbl,pre])=>{
    sd(doc, C.blue); doc.setLineWidth(0.35);
    doc.line(sigRx, my+9, sigRx+sigW, my+9); doc.setLineWidth(0.1);
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); st(doc, C.midgrey);
    doc.text(lbl+':', sigRx, my+3);
    if (pre) { doc.setFont('helvetica','normal'); doc.setFontSize(7.5); st(doc,C.charcoal); doc.text(pre, sigRx, my+7.5); }
    my += 14;
  });

  addFooter(doc, page.n, proposal);

  // ── SCHEDULE A: EQUIPMENT LIST ───────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule A: Equipment List', `#${propNum}`);

  sf(doc, C.navy); doc.rect(ml, y-4, mr-ml, 8, 'F');
  st(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Tag', ml+2, y); doc.text('Type', ml+20, y);
  doc.text('Make / Model', ml+78, y); doc.text('Area', ml+134, y); doc.text('Qty', ml+163, y);
  st(doc, C.text); y += 9;

  const saS = {common_strata:'Common',commercial:'Commercial',residential_in_suite:'In-Suite',shared:'Shared',residential:'Residential'};
  const tGroups = {}, tOrder = [];
  equipItems.forEach(item => {
    const t = item.equipment_type||'Other';
    if (!tGroups[t]) { tGroups[t]=[]; tOrder.push(t); }
    tGroups[t].push(item);
  });

  tOrder.forEach(type => {
    const grp = tGroups[type];
    const tQty = grp.reduce((s,i)=>s+(Number(i.qty)||1),0);
    y = chk(doc, y, 14, page, proposal, 'Schedule A: Equipment List Contd.');
    y = typeHead(doc, type, tQty, y);
    grp.forEach((item, idx) => {
      y = chk(doc, y, 7, page, proposal, 'Schedule A: Equipment List Contd.');
      if (idx%2===0){sf(doc,C.offwhite);doc.rect(ml,y-3.5,mr-ml,6.5,'F');}
      doc.setFont('helvetica','bold'); doc.setFontSize(8); st(doc, C.charcoal);
      doc.text(item.tag||'—', ml+2, y);
      doc.setFont('helvetica','normal'); st(doc, C.text);
      doc.text(item.equipment_type||'', ml+20, y);
      const mm=[item.manufacturer||item.make,item.model].filter(Boolean).join(' ');
      if(mm){st(doc,C.midgrey);doc.text(mm,ml+78,y);st(doc,C.text);}
      doc.text(saS[item.service_area||'']||'—', ml+134, y);
      doc.text(String(item.qty||1), ml+165, y);
      y += 6;
    });
    y += 4;
  });

  // Count summary
  y = chk(doc, y, 14, page, proposal, 'Schedule A: Equipment List Contd.');
  y += 4;
  sd(doc, [200,210,225]); doc.setLineWidth(0.3); doc.line(ml, y, mr, y); y += 5;
  doc.setFont('helvetica','bold'); doc.setFontSize(8); st(doc, C.charcoal);
  doc.text('EQUIPMENT COUNT BY TYPE', ml, y); y += 6;
  const cW2 = (mr-ml)/3;
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); st(doc, C.text);
  tOrder.forEach((t,idx) => {
    const col=idx%3; const row=Math.floor(idx/3);
    const q=tGroups[t].reduce((s,i)=>s+(Number(i.qty)||1),0);
    const x=ml+col*cW2; const yy=y+row*5;
    if(col===0) y=chk(doc,yy,5,page,proposal,'Schedule A: Equipment List Contd.');
    doc.text(t+':', x, yy);
    st(doc,C.blue); doc.setFont('helvetica','bold');
    doc.text(q+' unit'+(q!==1?'s':''), x+cW2-6, yy, {align:'right'});
    st(doc,C.text); doc.setFont('helvetica','normal');
  });
  const totU = equipItems.reduce((s,i)=>s+(Number(i.qty)||1),0);
  y += Math.ceil(tOrder.length/3)*5+4;
  sf(doc, C.navy); doc.rect(ml, y-3, mr-ml, 7, 'F');
  st(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text(`Total: ${totU} units across ${tOrder.length} equipment type${tOrder.length!==1?'s':''}`, ml+4, y+1);

  addFooter(doc, page.n, proposal);

  // ── SCHEDULE B: SERVICES ─────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule B: Services', `#${propNum}`);

  // SERVICE VISITS section
  y = secHead(doc, 'Service Visits', y);

  // Quarterly heading + note
  y = chk(doc, y, 12, page, proposal, 'Schedule B: Services');
  st(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('Quarterly System Reviews', ml, y); y += 6;
  st(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  const qNote = `${visitCount} scheduled visits per year. Each visit includes a comprehensive inspection, lubrication, cleaning, adjustment, and safety testing of all covered equipment. A written field service report is delivered within 5 business days of each visit.`;
  const qNL = doc.splitTextToSize(qNote, mr-ml);
  doc.text(qNL, ml, y); y += qNL.length*4.8+8;

  if (hasAnnual) {
    y = chk(doc, y, 12, page, proposal, 'Schedule B: Services');
    st(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text('Annual Comprehensive Maintenance', ml, y); y += 6;
    st(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const aNote = 'One additional annual visit for full-depth maintenance, teardown, and servicing beyond the scope of quarterly visits:';
    const aNL = doc.splitTextToSize(aNote, mr-ml);
    doc.text(aNL, ml, y); y += aNL.length*4.8+4;
    ANNUAL_TASKS.forEach(t => {
      y = chk(doc, y, 6, page, proposal, 'Schedule B: Services');
      sf(doc, C.blue); doc.rect(ml+3, y-2, 2, 2, 'F');
      doc.text(t, ml+8, y); y += 5.2;
    });
    y += 6;
  }

  // Service area line
  st(doc, C.midgrey); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  doc.text('Service Area: '+saFull(proposal.service_area_type), ml, y); y += 10;

  // Equipment type scope blocks — with dividers, larger heading
  const typeScope = _pl?.type_scope || (() => {
    const ts = {};
    equipItems.forEach(item => {
      const t = item.equipment_type||'Other';
      if (!ts[t]) ts[t] = { lines: item.scope_lines||[], qty:0, tags:[] };
      ts[t].qty += Number(item.qty)||1;
      if (item.tag) ts[t].tags.push(item.tag);
    });
    return ts;
  })();

  Object.entries(typeScope).forEach(([type, data], idx) => {
    y = chk(doc, y, 24, page, proposal, 'Schedule B: Services');
    if (idx > 0) {
      sd(doc, [200,210,225]); doc.setLineWidth(0.3); doc.line(ml, y, mr, y); y += 6;
    }
    // Type heading — slightly larger, darker
    st(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(type, ml, y);
    st(doc, C.midgrey); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text('×'+data.qty+' unit'+(data.qty!==1?'s':''), mr, y, {align:'right'});
    y += 5;
    if (data.tags?.length) {
      st(doc, C.midgrey); doc.setFontSize(7.5);
      doc.text('Tags: '+data.tags.slice(0,10).join(', ')+(data.tags.length>10?' …':''), ml, y); y += 5;
    }
    y += 2;

    const lines = data.lines||[];
    st(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    if (!lines.length) {
      doc.setFont('helvetica','italic'); st(doc, C.midgrey); doc.text('Scope to be confirmed.', ml+4, y); y += 7;
    } else {
      lines.forEach(line => {
        y = chk(doc, y, 7, page, proposal, 'Schedule B: Services');
        const w = doc.splitTextToSize(line, mr-ml-12);
        sf(doc, C.blue); doc.rect(ml+3, y-1.5, 1.8, 1.8, 'F');
        doc.text(w, ml+8, y); y += w.length*4.8;
      });
    }
    y += 4;
  });

  if (subItems.length) {
    y = chk(doc, y, 14, page, proposal, 'Schedule B: Services');
    y = secHead(doc, 'Subcontracted & Specialized Services', y, C.charcoal);
    subItems.forEach(item => {
      y = chk(doc, y, 10, page, proposal, 'Schedule B: Services');
      st(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(9);
      doc.text(item.equipment_type, ml+3, y); y += 5;
      st(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      (item.scope_lines||[]).forEach(line => {
        const w=doc.splitTextToSize(line,mr-ml-8); doc.text(w,ml+6,y); y+=w.length*4.8;
      }); y+=3;
    });
  }

  addFooter(doc, page.n, proposal);

  // ── SCHEDULE C: TERMS ────────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule C: Terms and Conditions', `#${propNum}`);

  terms(co).forEach(([heading, body]) => {
    y = chk(doc, y, 14, page, proposal, 'Schedule C: Terms and Conditions');
    st(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    doc.text(heading+':', ml, y);
    st(doc, C.text); doc.setFont('helvetica','normal');
    const bl = doc.splitTextToSize(body, mr-ml);
    doc.text(bl, ml, y+5); y += bl.length*4.5+9;
  });

  addFooter(doc, page.n, proposal);

  // ── SCHEDULE D: RATE SHEET ───────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule D: Rate Sheet', `#${propNum}`);

  st(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(`${co.name||'MEC Mechanical Inc.'}  —  ${new Date().getFullYear()} Labour Rate Schedule`, ml, y); y += 6;
  st(doc, C.midgrey); doc.setFontSize(8);
  doc.text('All rates are exclusive of applicable taxes. Subject to annual review with 30 days written notice.', ml, y); y += 10;

  y = secHead(doc, 'Hourly Rate Pricing Guide', y);

  // Column headers
  sf(doc, C.navy); doc.rect(ml, y-3, mr-ml, 8, 'F');
  st(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
  const c1=ml+4, c2=ml+88, c3=ml+152;
  doc.text('Process', c1, y+1.5);
  doc.text('Weekdays (8AM – 5PM)', c2, y+1.5);
  doc.text('Evenings / Weekends / Holidays', c3, y+1.5);
  st(doc, C.text); y += 9;

  [['Callout Fee (Per Technician)', '$270.00', '$540.00'],['Hourly Rate', '$135.00', '$270.00']].forEach(([lbl,d,n],i)=>{
    if(i%2===0){sf(doc,C.lightgrey);doc.rect(ml,y-3,mr-ml,7,'F');}
    st(doc,C.charcoal); doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(lbl, c1, y);
    doc.setFont('helvetica','bold'); doc.text(d, c2, y); doc.text(n, c3, y);
    st(doc,C.text); y += 7;
  });

  y += 10;
  y = secHead(doc, 'Requested Separate Pricing', y);

  [
    ['Regular-time service call (2 hours, 1 technician)', '$270.00 plus tax'],
    ['Site / operations meeting attendance (2 hours per month)', '$270.00 plus tax'],
  ].forEach(([lbl,amt],i)=>{
    y = chk(doc, y, 12, page, proposal, 'Schedule D: Rate Sheet');
    if(i>0){sd(doc,[210,215,225]);doc.setLineWidth(0.2);doc.line(ml,y-2,mr,y-2);doc.setLineWidth(0.1);}
    st(doc,C.charcoal); doc.setFont('helvetica','normal'); doc.setFontSize(9);
    const ll=doc.splitTextToSize(lbl,mr-ml-50); doc.text(ll,c1,y);
    st(doc,C.blue); doc.setFont('helvetica','bold'); doc.text(amt, mr-2, y, {align:'right'});
    st(doc,C.text); y += Math.max(8,ll.length*5+2);
  });

  y += 8;
  if (co.tsb) {
    st(doc,C.midgrey); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text('TSBC Licence / Registration: '+co.tsb, ml, y);
  }

  addFooter(doc, page.n, proposal);

  doc.save(`Proposal-${propNum}.pdf`);
}

export function generateProposalPDF(proposal, building) {
  generateProposalPDFEnhanced(proposal, building, building?.photo_url||null);
}

export function generateQuotePDF(quote, building) {
  const jsPDF = getjsPDF();
  const doc = new jsPDF({ unit:'mm', format:'letter' });
  const co  = getCompany();
  sf(doc,C.navy); doc.rect(0,0,pw,20,'F');
  const qlw = drawLogo(doc,co,ml,2,42,16,'dark');
  if(!qlw){st(doc,C.white);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(co.name||'MEC Mechanical Inc.',ml,13);}
  st(doc,C.white);doc.setFont('helvetica','bold');doc.setFontSize(9.5);
  doc.text('DEFICIENCY QUOTE',pw/2,12,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);st(doc,[160,180,220]);
  doc.text(`#${quote.quote_number||'DRAFT'}`,mr,16,{align:'right'});
  st(doc,C.text);
  let y=28;
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  const cn=doc.splitTextToSize(building?.client_name||building?.name||'—',100);
  doc.text(cn,ml,y);y+=cn.length*5+2;
  if(building?.address){doc.text(building.address,ml,y);y+=5;}
  y+=5;
  const qi=quote.line_items||[];
  sf(doc,C.navy);doc.rect(ml,y-3,mr-ml,7,'F');
  st(doc,C.white);doc.setFont('helvetica','bold');doc.setFontSize(8);
  doc.text('Description',ml+3,y+1);doc.text('Total',mr-3,y+1,{align:'right'});
  st(doc,C.text);y+=8;
  qi.forEach((item,i)=>{
    if(i%2===0){sf(doc,C.lightgrey);doc.rect(ml,y-3,mr-ml,6.5,'F');}
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text(item.description||'—',ml+3,y);
    doc.setFont('helvetica','bold');doc.text(formatCurrency(item.total||0),mr-3,y,{align:'right'});
    st(doc,C.text);y+=7;
  });
  const tot=quote.subtotal||0,tax=tot*(CONFIG.TAX_RATE||0.05);
  y+=4;sd(doc,C.blue);doc.line(ml,y,mr,y);y+=5;
  [['Subtotal',formatCurrency(tot),false],['GST (5%)',formatCurrency(tax),false],['TOTAL',formatCurrency(tot+tax),true]].forEach(([l,v,b])=>{
    doc.setFont('helvetica',b?'bold':'normal');doc.setFontSize(b?11:9);
    doc.text(l,ml+100,y);doc.text(v,mr-3,y,{align:'right'});y+=b?8:6;
  });
  const pg=doc.getNumberOfPages();
  for(let p=1;p<=pg;p++){doc.setPage(p);addFooter(doc,p,quote);}
  doc.save(`Quote-${quote.quote_number||'Draft'}.pdf`);
}
