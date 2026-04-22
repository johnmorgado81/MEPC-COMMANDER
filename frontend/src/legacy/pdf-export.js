import { CONFIG } from './config.js';
import { formatCurrency, formatDate } from './helpers.js';
import { buildProposalPayload, calcProposalTotals } from './pm-engine.js';

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

// ─── Palette ────────────────────────────────────────────────────────────────────
const C = {
  navy:      [11,  18,  35],
  blue:      [37,  99, 235],
  blueLight: [219,234, 254],
  blueAcc:   [59, 130, 246],
  charcoal:  [30,  41,  59],
  midgrey:   [100,116, 139],
  lightgrey: [241,245, 249],
  offwhite:  [248,250, 252],
  white:     [255,255, 255],
  text:      [15,  23,  42],
};
const setFill = (d,c) => d.setFillColor(c[0],c[1],c[2]);
const setDraw = (d,c) => d.setDrawColor(c[0],c[1],c[2]);
const setTxt  = (d,c) => d.setTextColor(c[0],c[1],c[2]);
const pw = 215.9, ml = 14, mr = pw - ml;

// ─── Logo helper — aspect-ratio safe ────────────────────────────────────────────
function drawLogo(doc, co, x, y, maxW, maxH) {
  if (!co.logo_data) return 0;
  try {
    const lt = co.logo_data.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'PNG';
    let lw = maxW, lh = maxH;
    try {
      const lp = doc.getImageProperties(co.logo_data);
      const r  = Math.min(maxW/lp.width, maxH/lp.height);
      lw = +(lp.width*r).toFixed(1); lh = +(lp.height*r).toFixed(1);
    } catch {}
    doc.addImage(co.logo_data, lt, x, y, lw, lh, undefined, 'FAST');
    return lw;
  } catch { return 0; }
}

// ─── Footer: fixed MEC contact line ─────────────────────────────────────────────
function addFooter(doc, page, proposal) {
  const co = getCompany();
  const footerPhone = co.contact_phone || co.phone || '604-298-8383';
  const footerEmail = co.email || 'john@mecmechanical.ca';
  const footerWeb   = co.website || 'www.mecmechanical.ca';
  setFill(doc, C.navy); doc.rect(0, 277, pw, 18, 'F');
  setFill(doc, C.blue); doc.rect(0, 277, pw, 1, 'F');
  setTxt(doc, [160,174,192]);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text(`${co.name || 'MEC Mechanical Inc.'}  ·  ${footerPhone}  ·  ${footerEmail}  ·  ${footerWeb}`, pw/2, 283, { align: 'center' });
  if (proposal?.proposal_number)
    doc.text(`Proposal #${proposal.proposal_number}  ·  Page ${page}`, pw - ml, 287, { align: 'right' });
  setTxt(doc, C.text);
}

// ─── Interior header: logo left, title centred, # right ─────────────────────────
function addHeader(doc, title, sub) {
  const co = getCompany();
  setFill(doc, C.navy); doc.rect(0, 0, pw, 24, 'F');
  setFill(doc, C.blue); doc.rect(0, 24, pw, 1.5, 'F');

  // Logo — left side, up to 38×16mm
  const logoW = drawLogo(doc, co, ml, 4, 38, 16);

  // If no logo, company name text left
  if (!logoW) {
    setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(co.name || 'MEC Mechanical Inc.', ml, 15);
  }

  // Title — centred
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(title, pw/2, 13, { align: 'center' });
  if (sub) {
    setTxt(doc, [180,196,220]); doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
    doc.text(sub, pw/2, 19, { align: 'center' });
  }

  // Proposal # — right
  if (sub && sub.startsWith('#')) {
    // sub IS the proposal #, already centred above
  }
  setTxt(doc, C.text);
  return 30;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function sectionHead(doc, text, y, accent) {
  const rgb = accent || C.navy;
  setFill(doc, rgb); doc.rect(ml, y-4, mr-ml, 9, 'F');
  setFill(doc, C.blue); doc.rect(ml, y+5, 32, 1.5, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(text.toUpperCase(), ml+5, y+1.5);
  setTxt(doc, C.text);
  return y + 13;
}

function typeHead(doc, text, count, y) {
  setFill(doc, C.blueLight); doc.rect(ml, y-3, mr-ml, 7.5, 'F');
  setFill(doc, C.blue);      doc.rect(ml, y-3, 2.5,   7.5, 'F');
  setTxt(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(text, ml+6, y+1.5);
  if (count) {
    setTxt(doc, C.midgrey); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(`${count} unit${count!==1?'s':''}`, mr-2, y+1.5, { align:'right' });
  }
  setTxt(doc, C.text);
  return y + 10;
}

// chk() uses a schedule letter so continuation headers are named correctly
function chk(doc, y, need, page, proposal, schedTitle) {
  if (y + need > 270) {
    addFooter(doc, page.n, proposal);
    doc.addPage(); page.n++;
    const t = schedTitle || 'PLANNED MAINTENANCE PROPOSAL';
    y = addHeader(doc, t, `#${proposal?.proposal_number||'DRAFT'}`);
  }
  return y;
}

function saFull(type) {
  return {
    shared:               'Shared Residential & Commercial Common Areas',
    commercial:           'Commercial Common Areas',
    residential:          'Residential Common Areas',
    in_suite:             'Individual Residential Residences',
    commercial_units:     'Individual Commercial Units',
    mixed:                'Mixed — see equipment schedule',
  }[type] || 'Residential Common Areas';
}

// ─── Client-facing regimen wording ───────────────────────────────────────────────
function regimenWording(qv, visitCount) {
  const hasAnnual = qv?.annual_clean;
  const lines = [];
  if (visitCount >= 3) lines.push('Quarterly System Reviews (four visits per year)');
  else if (visitCount === 2) lines.push('Semi-Annual System Reviews (two visits per year)');
  else if (visitCount === 1) lines.push('Annual System Review');
  if (hasAnnual) lines.push('Annual Comprehensive Maintenance');
  return lines;
}

// ─── Annual comprehensive maintenance tasks ───────────────────────────────────────
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

// ─── Terms ────────────────────────────────────────────────────────────────────────
function defaultTerms(co) {
  const coName = co.name || 'MEC Mechanical Inc.';
  return `PAYMENT TERMS: Net 30 days from date of invoice. Accounts past due are subject to interest at 2% per month (24% per annum compounded monthly). ${coName} reserves the right to suspend services on accounts more than 60 days overdue.

SCOPE: This agreement covers only the planned maintenance services described herein. Repairs, parts replacements, emergency callouts, and any work outside the described scope are not included and will be quoted separately prior to commencement.

EXCLUSIONS: Replacement parts and components; repairs beyond routine maintenance scope; emergency or after-hours labour; equipment commissioning or new installation; work required as a result of owner-caused damage, vandalism, or Acts of God; water treatment chemicals unless otherwise specified in writing.

ACCESS: Client shall provide reasonable and safe access to all equipment covered under this agreement during scheduled visits, including physical access to mechanical rooms, rooftops, and penthouses, and remote access to any DDC building automation system with full operator-level user access rights. Inaccessible equipment may be deferred and may result in additional charges. Restricted access due to tenants or third parties will not constitute a reason for service credit.

CONTRACT TERM: Initial term of three (3) years from the acceptance date. Following the initial term, this agreement automatically renews for successive one-year terms unless either party provides written notice of non-renewal not less than 60 days prior to the renewal date.

RATE ADJUSTMENTS: Labour and contract rates are subject to annual adjustment at the beginning of each contract year, with 30 days written notice. Adjustments will not exceed the greater of 5% or the prior-year BC CPI index.

REPORTING: ${coName} will deliver a written field service report within 5 business days of each scheduled visit. Reports will identify equipment serviced, work performed, equipment condition, and any deficiencies observed. Deficiencies will be quoted separately.

LIMITATION OF LIABILITY: In no event shall ${coName} be liable for indirect, consequential, special, or punitive damages arising from the performance or non-performance of this agreement, whether foreseeable or not. Maximum liability is limited to the annual contract value.

GOVERNING LAW: This agreement is governed by the laws of British Columbia, Canada. The parties submit to the exclusive jurisdiction of the courts of British Columbia for any dispute arising under this agreement.`;
}

// ════════════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════════════
export function generateProposalPDFEnhanced(proposal, building, coverImageDataUrl) {
  let _payload = null;
  try { _payload = buildProposalPayload(proposal, building, null); } catch {}

  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit:'mm', format:'letter' });
  const co    = getCompany();
  const page  = { n:1 };

  const annual    = (_payload?.annual  > 0 ? _payload.annual  : null) || Number(proposal.annual_value)  || 0;
  const monthly   = (_payload?.monthly > 0 ? _payload.monthly : null) || Number(proposal.monthly_value) || annual/12;
  const items     = _payload?.scope_items  || proposal.scope_items  || [];
  const manItems  = (_payload?.manual_items||proposal.manual_items||[]).filter(m=>m.include!==false&&m.client_facing);
  const qv        = _payload?.quarter_visits||proposal.quarter_visits||{q1:true,q2:true,q3:true,q4:true,annual_clean:false};
  const visitCount = _payload?.visit_count || [qv.q1,qv.q2,qv.q3,qv.q4].filter(Boolean).length || 4;
  const equipItems = items.filter(i=>i.category!=='Subcontracted Services'&&i.category!=='Manual Items');
  const subItems   = items.filter(i=>i.category==='Subcontracted Services');
  const coverImg   = coverImageDataUrl || building?.photo_url || _payload?.cover_image_url || null;
  const hasAnnual  = !!qv.annual_clean;
  const regimenLines = regimenWording(qv, visitCount);
  const clientName   = building?.client_name || building?.client_company || building?.name || 'To Be Confirmed';
  const propNum      = proposal.proposal_number || 'DRAFT';

  // ─── PAGE 1: COVER ────────────────────────────────────────────────────────────
  // Printer-friendly: white background with navy/blue accents, clean bands
  // Company band (top) → photo → info band (bottom) — no text over photo
  setFill(doc, C.white); doc.rect(0, 0, pw, 279, 'F');

  // Company header band — 26mm, white-on-navy
  const brandH = 26;
  setFill(doc, C.navy); doc.rect(0, 0, pw, brandH, 'F');
  setFill(doc, C.blue); doc.rect(0, brandH, pw, 1.5, 'F');

  // Logo left — larger (50×20mm max)
  const logoW = drawLogo(doc, co, ml, (brandH - 18)/2, 50, 18);
  if (!logoW) {
    setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text(co.name || 'MEC Mechanical Inc.', ml, 16);
  }

  // Building photo — full width, 110mm tall
  const photoStart = brandH + 1.5;
  const photoMaxH  = 110;
  let photoH = 0;
  if (coverImg) {
    try {
      const imgType = coverImg.match(/data:image\/(\w+)/)?.[1]?.toUpperCase() || 'JPEG';
      let iw = pw, ih = photoMaxH;
      try {
        const props = doc.getImageProperties(coverImg);
        const ratio = Math.min(pw/props.width, photoMaxH/props.height);
        iw = +(props.width*ratio).toFixed(1); ih = +(props.height*ratio).toFixed(1);
      } catch {}
      doc.addImage(coverImg, imgType, (pw-iw)/2, photoStart, iw, ih, undefined, 'FAST');
      photoH = ih;
    } catch {}
  }

  // Blue stripe below photo
  const stripeY = photoStart + photoH;
  setFill(doc, C.blue); doc.rect(0, stripeY, pw, 2, 'F');

  // Content area below stripe: two columns
  const ctTop  = stripeY + 4;
  const halfW  = (mr - ml) / 2 - 6;

  // Left col: title + client
  let ty = ctTop + 6;
  setTxt(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(22);
  doc.text('PLANNED MAINTENANCE', ml, ty); ty += 10;
  setTxt(doc, C.blue); doc.setFontSize(26);
  doc.text('PROPOSAL', ml, ty); ty += 12;

  setFill(doc, C.blue); doc.rect(ml, ty, halfW, 0.8, 'F'); ty += 5;

  setTxt(doc, C.midgrey); doc.setFont('helvetica','bold'); doc.setFontSize(7);
  doc.text('PREPARED FOR', ml, ty); ty += 5;
  setTxt(doc, C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  const cl = doc.splitTextToSize(clientName, halfW);
  doc.text(cl, ml, ty); ty += cl.length * 6.5;
  setTxt(doc, C.charcoal); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  if (building?.client_company && building?.client_name) {
    const ccl = doc.splitTextToSize(building.client_company, halfW); doc.text(ccl, ml, ty); ty += ccl.length*5;
  }
  if (building?.name && building.name !== clientName) {
    const bnl = doc.splitTextToSize(building.name, halfW); doc.text(bnl, ml, ty); ty += bnl.length*5;
  }
  if (building?.strata_number) { doc.text('Strata Plan '+building.strata_number, ml, ty); ty += 5; }
  const addrL = [building?.address,building?.city,building?.province].filter(Boolean).join(', ');
  if (addrL) { const al=doc.splitTextToSize(addrL,halfW); doc.text(al,ml,ty); }

  // Right col: value + service wording + detail
  const rx = ml + halfW + 12;
  let ry = ctTop + 4;

  // Annual value box
  setFill(doc, C.navy); doc.rect(rx, ry, halfW, 20, 'F');
  setTxt(doc, [140,158,185]); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
  doc.text('ANNUAL CONTRACT VALUE', rx+4, ry+6); 
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(17);
  doc.text(formatCurrency(annual), rx+halfW-4, ry+14, {align:'right'});
  ry += 24;

  setTxt(doc, C.charcoal); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  doc.text(formatCurrency(monthly)+' / month', rx+4, ry); ry += 7;

  setFill(doc, C.blue); doc.rect(rx, ry, halfW, 0.6, 'F'); ry += 5;

  // Service wording — client-facing (no Q1/Q2 labels)
  setTxt(doc, C.charcoal); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Service Programme:', rx+4, ry); ry += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  regimenLines.forEach(l => { doc.text('· '+l, rx+4, ry); ry += 5; });
  ry += 2;

  // Proposal detail rows
  const drows = [
    ['Proposal #', propNum],
    ['Date', formatDate(proposal.created_date)],
    ['Valid Until', formatDate(proposal.valid_until)],
    ['Payment', proposal.payment_terms||'Net 30'],
  ].filter(r=>r[1]);
  setTxt(doc, C.midgrey); doc.setFontSize(7.5);
  drows.forEach(([k,v]) => {
    doc.setFont('helvetica','bold'); doc.text(k+':', rx+4, ry);
    doc.setFont('helvetica','normal');
    const vl = doc.splitTextToSize(v, halfW-30);
    doc.text(vl, rx+halfW-2, ry, {align:'right'});
    ry += 5;
  });

  addFooter(doc, page.n, proposal);

  // ─── PAGE 2: INTRODUCTORY LETTER ─────────────────────────────────────────────
  doc.addPage(); page.n++;
  let y = addHeader(doc, 'PLANNED MAINTENANCE PROPOSAL', `#${propNum}`);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'});
  const attn    = building?.client_name || building?.client_company || 'Property Manager';
  const bldAddr = [building?.address, building?.city, building?.province, building?.postal_code].filter(Boolean).join(', ');
  const reStr   = [building?.name, building?.strata_number ? 'Strata Plan '+building.strata_number : '', building?.address].filter(Boolean).join(' – ');

  setTxt(doc, C.text); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);

  // Date
  doc.text(dateStr, ml, y); y += 8;

  // Attn block
  doc.setFont('helvetica','normal');
  doc.text('Attn: '+attn, ml, y); y += 5;
  if (building?.client_company && building?.client_name) { doc.text(building.client_company, ml, y); y += 5; }
  if (bldAddr) { const bal=doc.splitTextToSize(bldAddr,mr-ml-20); doc.text(bal,ml,y); y+=bal.length*5; }
  y += 4;

  // RE line
  doc.setFont('helvetica','bold');
  const reLabel = 'RE:  ';
  doc.text(reLabel, ml, y);
  const reLW = doc.getTextWidth(reLabel);
  doc.setFont('helvetica','normal');
  const reLines = doc.splitTextToSize(reStr, mr-ml-reLW-2);
  doc.text(reLines, ml+reLW, y); y += reLines.length*5 + 6;

  // Dear line
  const firstName = (building?.client_name||'').split(' ')[0] || attn;
  doc.text(`Dear ${firstName},`, ml, y); y += 8;

  // Body blurb — from settings, clean (strip any [CM] [JM] markers)
  const rawBlurb = co.company_blurb ||
    `Thank you for the opportunity to submit this Planned Maintenance proposal for ${building?.name||'your property'}. ${co.name||'MEC Mechanical Inc.'} provides comprehensive mechanical planned maintenance services for strata, commercial, and industrial properties throughout British Columbia.\n\nOur licensed technicians will perform detailed inspections, cleaning, lubrication, and adjustments on all covered equipment at each scheduled visit. Each visit is followed by a written field service report identifying work performed, equipment condition, and any deficiencies requiring attention.\n\nWe are committed to protecting your mechanical assets, reducing unplanned failures, and ensuring full regulatory compliance throughout the term of this agreement.`;
  const cleanBlurb = rawBlurb.replace(/\[[A-Z]{1,3}\d+\.\d+\]/g, '').trim();

  cleanBlurb.split('\n\n').forEach(para => {
    if (!para.trim()) return;
    y = chk(doc, y, 12, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
    const pl = doc.splitTextToSize(para.trim(), mr-ml);
    doc.text(pl, ml, y); y += pl.length * 5.2 + 5;
  });

  // Annual comprehensive — if selected
  if (hasAnnual) {
    y = chk(doc, y, 30, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
    y += 2;
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    setTxt(doc, C.charcoal);
    doc.text('Annual Comprehensive Maintenance', ml, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
    doc.text('In addition to quarterly visits, this proposal includes one Annual Comprehensive Maintenance visit per year, which encompasses:', ml, y); y += 7;
    ANNUAL_TASKS.forEach(t => {
      y = chk(doc, y, 6, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
      setFill(doc, C.blue); doc.rect(ml+2, y-2, 2, 2, 'F');
      doc.text(t, ml+7, y); y += 5.5;
    });
    y += 4;
  }

  // Included services
  y = chk(doc, y, 14, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
  y = sectionHead(doc, 'Services Included', y);
  const included = [
    regimenLines[0] || 'Quarterly System Reviews (Q1, Q2, Q3, Q4)',
    hasAnnual ? 'Annual Comprehensive Maintenance (teardown, cleaning, full tune-up)' : null,
    'Safety control testing and function verification to applicable codes',
    'Deficiency identification with written report and cost estimate',
    'Equipment performance logging and trend monitoring',
    '24-hour emergency service line access',
    'Detailed field service reports within 5 business days of each visit',
  ].filter(Boolean);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
  included.forEach(s => {
    y = chk(doc, y, 6, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
    setFill(doc, C.blue); doc.rect(ml+2, y-2, 2, 2, 'F');
    doc.text(s, ml+7, y); y += 5.5;
  });

  // Sign-off
  y = chk(doc, y, 30, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
  y += 8;
  doc.setFont('helvetica','normal'); doc.setFontSize(9); setTxt(doc, C.text);
  doc.text('We look forward to the opportunity to serve your property. Please do not hesitate to contact us with any questions.', ml, y);
  y += 9;
  doc.text('Sincerely,', ml, y); y += 12;
  const salesRep = proposal.owner || proposal.sales_rep || co.sales_person || null;
  if (salesRep) {
    doc.setFont('helvetica','bold'); doc.text(salesRep, ml, y); y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.midgrey);
    doc.text(co.sales_title || 'Service Sales', ml, y); y += 5;
    doc.text(co.name, ml, y);
  } else {
    doc.setFont('helvetica','normal'); doc.text(co.name, ml, y);
  }

  addFooter(doc, page.n, proposal);

  // ─── PAGE 3: PRICING & ACCEPTANCE ────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'PLANNED MAINTENANCE PROPOSAL', `#${propNum}`);

  // Building info bar
  setFill(doc, C.lightgrey); doc.rect(ml, y-4, mr-ml, 18, 'F');
  setFill(doc, C.blue); doc.rect(ml, y-4, 3, 18, 'F');
  y += 1;
  const bnFull = doc.splitTextToSize(building?.name||'—', (mr-ml)/2-10);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); setTxt(doc, C.charcoal);
  doc.text(bnFull, ml+8, y);
  const cnFull = doc.splitTextToSize(clientName, (mr-ml)/2-6);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); setTxt(doc, C.midgrey);
  doc.text(cnFull, ml+8, y+6);
  if (building?.strata_number) { doc.setFontSize(8.5); doc.text('Strata Plan '+building.strata_number, ml+100, y); }
  const a3 = [building?.address,building?.city,building?.province].filter(Boolean).join(', ');
  if (a3) { const a3l=doc.splitTextToSize(a3,(mr-ml)/2-6); doc.setFontSize(8.5); setTxt(doc,C.midgrey); doc.text(a3l,ml+100,y+6); }
  y += 22;

  // Service regimen bar
  setFill(doc, C.blueLight); doc.rect(ml, y-4, mr-ml, 14, 'F');
  setFill(doc, C.blue); doc.rect(ml, y-4, 3, 14, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('Service Programme:', ml+8, y+1);
  doc.setFont('helvetica','normal'); setTxt(doc, C.text);
  doc.text(regimenLines.join('  +  '), ml+52, y+1);
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('Service Area:', ml+8, y+7);
  doc.setFont('helvetica','normal'); setTxt(doc, C.text);
  doc.text(saFull(proposal.service_area_type), ml+40, y+7);
  y += 18;

  // ── PRICING BOX ─────────────────────────────────────────────────────────────
  // Never show subcontracted services as a client-facing line
  // Only show breakdown if manual items exist
  const manSubtot = manItems.reduce((s,m)=>s+(Number(m.value)||0)*(Number(m.qty)||1),0);

  let py = y + 8;
  setFill(doc, C.lightgrey); doc.rect(ml, y, mr-ml, manSubtot>0?50:38, 'F');
  setDraw(doc, C.blueLight); doc.setLineWidth(0.4); doc.rect(ml, y, mr-ml, manSubtot>0?50:38);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica','bold'); doc.setFontSize(8); setTxt(doc, C.midgrey);
  doc.text('CONTRACT BREAKDOWN', ml+6, py); py += 6;

  // Main PM labour — lump sum, no sub breakdown
  doc.setFont('helvetica','normal'); doc.setFontSize(9); setTxt(doc, C.charcoal);
  doc.text('Planned Maintenance Services — Annual Contract', ml+6, py);
  doc.setFont('helvetica','bold'); doc.text(formatCurrency(annual - manSubtot), mr-6, py, {align:'right'});
  py += 8;

  if (manSubtot > 0) {
    setDraw(doc, [210,218,230]); doc.line(ml+6, py-2, mr-6, py-2);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); setTxt(doc, C.charcoal);
    doc.text('Additional Services', ml+6, py);
    doc.setFont('helvetica','bold'); doc.text(formatCurrency(manSubtot), mr-6, py, {align:'right'});
    py += 8;
    manItems.forEach(m => {
      doc.setFont('helvetica','normal'); doc.setFontSize(8); setTxt(doc, C.midgrey);
      doc.text('  · '+(m.description||'Item'), ml+10, py);
      doc.text(formatCurrency((Number(m.value)||0)*(Number(m.qty)||1))+'/yr', mr-6, py, {align:'right'});
      py += 5;
    });
  }

  // Divider → ANNUAL VALUE box
  setDraw(doc, C.blue); doc.line(ml+6, py, mr-6, py); py += 4;
  setFill(doc, C.navy); doc.rect(ml, py-2, mr-ml, 16, 'F');
  setTxt(doc, [140,158,185]); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
  doc.text('ANNUAL CONTRACT VALUE', ml+6, py+4);
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text(formatCurrency(annual), mr-6, py+10, {align:'right'});
  py += 20;

  // Monthly
  setFill(doc, C.blueLight); doc.rect(ml, py-4, mr-ml, 12, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); setTxt(doc, C.charcoal);
  doc.text('Monthly Billing', ml+6, py+2);
  doc.setFont('helvetica','bold'); doc.setFontSize(13); setTxt(doc, C.blue);
  doc.text(formatCurrency(monthly), mr-6, py+3, {align:'right'});
  py += 12;
  y = py + 8;

  // Customer notes
  const noteText = [building?.notes, building?.building_notes, proposal?.notes].filter(Boolean).join('\n');
  if (noteText) {
    y = chk(doc, y, 20, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
    setFill(doc, C.lightgrey); doc.rect(ml, y-4, mr-ml, 4, 'F');
    setFill(doc, C.blue); doc.rect(ml, y-4, 3, 4, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); setTxt(doc, C.charcoal);
    doc.text('Customer Notes / Special Requirements', ml+6, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
    const nLines = doc.splitTextToSize(noteText, mr-ml-8);
    doc.text(nLines, ml+4, y); y += nLines.length*5+6;
  }

  // Prepared by
  const _salesRep = proposal.owner || proposal.sales_rep || co.sales_person || null;
  if (_salesRep) {
    y = chk(doc, y, 22, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
    y += 2;
    setFill(doc, C.lightgrey); doc.rect(ml, y-4, (mr-ml)/2-4, 20, 'F');
    setFill(doc, C.blue); doc.rect(ml, y-4, 3, 20, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); setTxt(doc, C.midgrey);
    doc.text('PREPARED BY', ml+8, y);
    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); setTxt(doc, C.charcoal);
    doc.text(_salesRep, ml+8, y+6);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.midgrey);
    doc.text(co.sales_title||'Service Sales', ml+8, y+11);
    doc.text(co.name, ml+8, y+16);
    setTxt(doc, C.text); y += 24;
  }

  // Signatures
  y = chk(doc, y, 72, page, proposal, 'PLANNED MAINTENANCE PROPOSAL');
  y += 4;
  y = sectionHead(doc, 'Acceptance & Authorized Signatures', y, C.charcoal);
  y += 2;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
  doc.text('By signing below, both parties agree to the terms and scope of work described in this proposal.', ml, y); y += 10;

  const sigColW = (mr-ml)/2 - 8;
  const signatoryName  = co.signatory || co.signatory_name || co.sales_manager || null;
  const signatoryTitle = (co.signatory_title || 'Authorized Signatory').replace(/[,;]+$/, '');
  const preparedForOrg = building?.client_company || building?.name || '';

  // Customer
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('CUSTOMER', ml, y); y += 7;
  let custY = y;
  [['Signature',''], ['Name & Title',''], ['Organization', preparedForOrg], ['Date','']].forEach(([lbl,pre])=>{
    setDraw(doc, C.charcoal); doc.setLineWidth(0.4);
    doc.line(ml, custY+9, ml+sigColW, custY+9); doc.setLineWidth(0.1);
    doc.setFont('helvetica','bold'); doc.setFontSize(7); setTxt(doc, C.midgrey);
    doc.text(lbl+':', ml, custY+3);
    if (pre) { doc.setFont('helvetica','normal'); doc.setFontSize(7.5); setTxt(doc,C.text); doc.text(pre, ml, custY+7.5); }
    custY += 14;
  });

  // MEC
  const mecX = ml + sigColW + 16;
  let mecHeadY = y - 7;
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text((co.name||'MEC MECHANICAL INC.').toUpperCase(), mecX, mecHeadY); 
  let mecY = y;
  [['Signature',''], ['Name', signatoryName||''], ['Title', signatoryTitle], ['Date','']].forEach(([lbl,pre])=>{
    setDraw(doc, C.blue); doc.setLineWidth(0.4);
    doc.line(mecX, mecY+9, mecX+sigColW, mecY+9); doc.setLineWidth(0.1);
    doc.setFont('helvetica','bold'); doc.setFontSize(7); setTxt(doc, C.midgrey);
    doc.text(lbl+':', mecX, mecY+3);
    if (pre) { doc.setFont('helvetica','normal'); doc.setFontSize(7.5); setTxt(doc,C.charcoal); doc.text(pre, mecX, mecY+7.5); }
    mecY += 14;
  });
  y = Math.max(custY, mecY) + 4;

  addFooter(doc, page.n, proposal);

  // ─── PAGE 4+: SCHEDULE A — EQUIPMENT LIST ────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule A: Equipment List', `#${propNum}`);

  setFill(doc, C.navy); doc.rect(ml, y-4, mr-ml, 8, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Tag', ml+2, y); doc.text('Type', ml+20, y);
  doc.text('Make / Model', ml+78, y); doc.text('Area', ml+132, y); doc.text('Qty', ml+162, y);
  setTxt(doc, C.text); y += 9;

  const saShort = {common_strata:'Common',commercial:'Commercial',residential_in_suite:'In-Suite',shared:'Shared',residential:'Residential'};
  const typeGroups = {}; const typeOrder = [];
  equipItems.forEach(item => {
    const t = item.equipment_type||'Other';
    if (!typeGroups[t]) { typeGroups[t]=[]; typeOrder.push(t); }
    typeGroups[t].push(item);
  });

  typeOrder.forEach(type => {
    const group = typeGroups[type];
    const totalQty = group.reduce((s,i)=>s+(Number(i.qty)||1),0);
    y = chk(doc, y, 14, page, proposal, 'Schedule A: Equipment List Contd.');
    y = typeHead(doc, type, totalQty, y);
    group.forEach((item, idx) => {
      y = chk(doc, y, 7, page, proposal, 'Schedule A: Equipment List Contd.');
      if (idx%2===0){setFill(doc,C.offwhite);doc.rect(ml,y-3.5,mr-ml,6.5,'F');}
      doc.setFont('helvetica','bold'); doc.setFontSize(8); setTxt(doc, C.charcoal);
      doc.text(item.tag||'—', ml+2, y);
      doc.setFont('helvetica','normal'); setTxt(doc, C.text);
      doc.text(item.equipment_type||'', ml+20, y);
      const mm=[item.manufacturer||item.make,item.model].filter(Boolean).join(' ');
      if(mm){setTxt(doc,C.midgrey);doc.text(mm,ml+78,y);setTxt(doc,C.text);}
      doc.text(saShort[item.service_area||'']||'—', ml+132, y);
      doc.text(String(item.qty||1), ml+164, y);
      y += 6;
    });
    y += 3;
  });

  // Count summary
  y = chk(doc, y, 16+typeOrder.length*5, page, proposal, 'Schedule A: Equipment List Contd.');
  y += 4; setDraw(doc, C.blueLight); doc.line(ml, y, mr, y); y += 5;
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  doc.text('EQUIPMENT COUNT BY TYPE', ml, y); y += 6;
  const colW2 = (mr-ml)/3;
  doc.setFont('helvetica','normal'); doc.setFontSize(8); setTxt(doc, C.text);
  typeOrder.forEach((t,idx) => {
    const col=idx%3; const row=Math.floor(idx/3);
    const qty=typeGroups[t].reduce((s,i)=>s+(Number(i.qty)||1),0);
    const x=ml+col*colW2; const yy=y+row*5;
    if(col===0) y=chk(doc,yy,5,page,proposal,'Schedule A: Equipment List Contd.');
    doc.text(t+':', x, yy);
    setTxt(doc,C.blue); doc.setFont('helvetica','bold');
    doc.text(qty+' unit'+(qty!==1?'s':''), x+colW2-8, yy, {align:'right'});
    setTxt(doc,C.text); doc.setFont('helvetica','normal');
  });
  const totalUnits = equipItems.reduce((s,i)=>s+(Number(i.qty)||1),0);
  y += Math.ceil(typeOrder.length/3)*5+4;
  y = chk(doc, y, 7, page, proposal, 'Schedule A: Equipment List Contd.');
  setFill(doc, C.navy); doc.rect(ml, y-3, mr-ml, 7, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text(`Total: ${totalUnits} units across ${typeOrder.length} equipment type${typeOrder.length!==1?'s':''}`, ml+4, y+1);

  addFooter(doc, page.n, proposal);

  // ─── PAGE 6+: SCHEDULE B — SERVICES ──────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule B: Services', `#${propNum}`);

  // Regimen banner
  setFill(doc, C.blueLight); doc.rect(ml, y-4, mr-ml, hasAnnual?20:14, 'F');
  setFill(doc, C.blue); doc.rect(ml, y-4, 3, hasAnnual?20:14, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); setTxt(doc, C.charcoal);
  doc.text('Service Programme:', ml+8, y+2);
  doc.setFont('helvetica','normal'); setTxt(doc, C.text);
  doc.text(regimenLines[0]||'Quarterly System Reviews', ml+56, y+2);
  if (hasAnnual && regimenLines[1]) { doc.text(regimenLines[1], ml+56, y+8); }
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
  const saLabelY = hasAnnual ? y+14 : y+8;
  doc.text('Service Area:', ml+8, saLabelY);
  doc.setFont('helvetica','normal'); setTxt(doc, C.text);
  doc.text(saFull(proposal.service_area_type), ml+40, saLabelY);
  y += hasAnnual ? 24 : 18;

  // Scope — one block per type
  const typeScope = _payload?.type_scope || (() => {
    const ts = {};
    equipItems.forEach(item => {
      const t = item.equipment_type||'Other';
      if (!ts[t]) ts[t] = { lines: item.scope_lines||[], qty:0, tags:[] };
      ts[t].qty += Number(item.qty)||1;
      if (item.tag) ts[t].tags.push(item.tag);
    });
    return ts;
  })();

  Object.entries(typeScope).forEach(([type, data]) => {
    y = chk(doc, y, 20, page, proposal, 'Schedule B: Services');
    setFill(doc, C.blueLight); doc.rect(ml, y-4, mr-ml, 12, 'F');
    setFill(doc, C.blue); doc.rect(ml, y-4, 3, 12, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); setTxt(doc, C.charcoal);
    doc.text(type, ml+8, y+2);
    setTxt(doc, C.blue); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
    doc.text('×'+data.qty+' unit'+(data.qty!==1?'s':''), mr-6, y+2, {align:'right'});
    if (data.tags?.length) {
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); setTxt(doc, C.midgrey);
      doc.text('Tags: '+data.tags.slice(0,10).join(', ')+(data.tags.length>10?' …':''), ml+8, y+7);
    }
    setTxt(doc, C.text); y += 14;

    const lines = data.lines||[];
    if (!lines.length) {
      doc.setFont('helvetica','italic'); doc.setFontSize(8.5); setTxt(doc, C.midgrey);
      doc.text('Scope to be confirmed.', ml+6, y); y += 7;
    } else {
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
      lines.forEach(line => {
        y = chk(doc, y, 7, page, proposal, 'Schedule B: Services');
        const w = doc.splitTextToSize(line, mr-ml-12);
        setFill(doc, C.blue); doc.rect(ml+4, y-1.5, 1.5, 1.5, 'F');
        doc.text(w, ml+9, y); y += w.length*4.5;
      });
    }
    // Annual tasks appended per-type if annual selected
    if (hasAnnual) {
      y = chk(doc, y, 10, page, proposal, 'Schedule B: Services');
      doc.setFont('helvetica','italic'); doc.setFontSize(8); setTxt(doc, C.blue);
      doc.text('Annual Comprehensive Maintenance tasks also apply — see general annual scope above.', ml+9, y); y += 5;
    }
    y += 5;
  });

  // Annual comprehensive scope block
  if (hasAnnual) {
    y = chk(doc, y, 20, page, proposal, 'Schedule B: Services');
    y = sectionHead(doc, 'Annual Comprehensive Maintenance — All Equipment Types', y, C.charcoal);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
    doc.text('The following additional scope applies during the Annual Comprehensive Maintenance visit:', ml, y); y += 7;
    ANNUAL_TASKS.forEach(t => {
      y = chk(doc, y, 6, page, proposal, 'Schedule B: Services');
      setFill(doc, C.blue); doc.rect(ml+2, y-2, 2, 2, 'F');
      doc.text(t, ml+7, y); y += 5.5;
    });
    y += 4;
  }

  // Subcontracted (internal, not client-facing pricing — show scope only)
  if (subItems.length) {
    y = chk(doc, y, 16, page, proposal, 'Schedule B: Services');
    y = sectionHead(doc, 'Subcontracted & Specialized Services', y, C.charcoal);
    subItems.forEach(item => {
      y = chk(doc, y, 12, page, proposal, 'Schedule B: Services');
      doc.setFont('helvetica','bold'); doc.setFontSize(9); setTxt(doc, C.charcoal);
      doc.text(item.equipment_type, ml+4, y); y += 5;
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
      (item.scope_lines||[]).forEach(line => {
        const w=doc.splitTextToSize(line,mr-ml-8); doc.text(w,ml+6,y); y+=w.length*4.5;
      });
      y += 3;
    });
  }

  addFooter(doc, page.n, proposal);

  // ─── SCHEDULE C — TERMS & CONDITIONS ────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule C: Terms and Conditions', `#${propNum}`);
  const termParts = defaultTerms(co).split('\n\n');
  termParts.forEach(para => {
    if (!para.trim()) return;
    y = chk(doc, y, 12, page, proposal, 'Schedule C: Terms and Conditions');
    const ci = para.indexOf(':');
    if (ci > -1 && ci < 25) {
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); setTxt(doc, C.charcoal);
      doc.text(para.slice(0,ci+1), ml, y);
      doc.setFont('helvetica','normal'); setTxt(doc, C.text);
      const rest = doc.splitTextToSize(para.slice(ci+1).trim(), mr-ml);
      doc.text(rest, ml, y+5); y += rest.length*4.5+7;
    } else {
      const lines=doc.splitTextToSize(para,mr-ml);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); setTxt(doc, C.text);
      doc.text(lines,ml,y); y+=lines.length*4.5+5;
    }
  });
  addFooter(doc, page.n, proposal);

  // ─── SCHEDULE D — RATE SHEET ─────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'Schedule D: Rate Sheet', `#${propNum}`);

  const yr = new Date().getFullYear();
  doc.setFont('helvetica','normal'); doc.setFontSize(9); setTxt(doc, C.text);
  doc.text(`${co.name||'MEC Mechanical Inc.'} — ${yr} Labour Rate Schedule`, ml, y); y += 7;
  const rateNote = 'All rates are exclusive of applicable taxes. Subject to annual review with 30 days written notice.';
  const rnl = doc.splitTextToSize(rateNote, mr-ml);
  setTxt(doc, C.midgrey); doc.setFontSize(8.5); doc.text(rnl, ml, y); y += rnl.length*4.5+8;

  // Main rate table
  y = sectionHead(doc, 'Hourly Rate Pricing Guide', y);

  // Header row
  setFill(doc, C.navy); doc.rect(ml, y-3, mr-ml, 8, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  const c1=ml+4, c2=ml+95, c3=ml+155;
  doc.text('Process', c1, y+1.5);
  doc.text('Weekdays 8AM – 5PM', c2, y+1.5);
  doc.text('Evenings, Weekends & Holidays', c3, y+1.5);
  setTxt(doc, C.text); y += 9;

  const mainRates = [
    ['Callout Fee Per Technician', '$270.00', '$540.00'],
    ['Hourly Rate Per Technician', '$135.00', '$270.00'],
  ];
  mainRates.forEach(([label,day,night],idx) => {
    if(idx%2===0){setFill(doc,C.lightgrey);doc.rect(ml,y-3,mr-ml,7,'F');}
    doc.setFont('helvetica','normal'); doc.setFontSize(9); setTxt(doc, C.charcoal);
    doc.text(label, c1, y);
    doc.setFont('helvetica','bold');
    doc.text(day,   c2, y);
    doc.text(night, c3, y);
    setTxt(doc, C.text); y += 7;
  });

  y += 8;
  y = sectionHead(doc, 'Requested Separate Pricing', y);

  setFill(doc, C.navy); doc.rect(ml, y-3, mr-ml, 8, 'F');
  setTxt(doc, C.white); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Item', c1, y+1.5);
  doc.text('Amount', mr-4, y+1.5, {align:'right'});
  setTxt(doc, C.text); y += 9;

  const sepPricing = [
    ['Regular-time service call (2 hours, 1 technician)', '$270.00 plus tax'],
    ['Site / operations meeting attendance (2 hours per month)', '$270.00 plus tax'],
  ];
  sepPricing.forEach(([label,amt],idx) => {
    if(idx%2===0){setFill(doc,C.lightgrey);doc.rect(ml,y-3,mr-ml,7,'F');}
    doc.setFont('helvetica','normal'); doc.setFontSize(9); setTxt(doc, C.charcoal);
    const ll = doc.splitTextToSize(label, mr-ml-60);
    doc.text(ll, c1, y);
    doc.setFont('helvetica','bold'); setTxt(doc, C.blue);
    doc.text(amt, mr-4, y, {align:'right'});
    setTxt(doc, C.text); y += Math.max(7, ll.length*5+2);
  });

  y += 8;
  if (co.tsb) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8); setTxt(doc, C.midgrey);
    doc.text('BC Contractors Licence / TSBC: '+co.tsb, ml, y); y += 5;
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
  setFill(doc, C.navy); doc.rect(0,0,pw,24,'F');
  setFill(doc, C.blue); doc.rect(0,24,pw,1.5,'F');
  const logoW = drawLogo(doc, co, ml, 4, 38, 16);
  if (!logoW) { setTxt(doc,C.white); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(co.name||'MEC Mechanical Inc.', ml, 15); }
  setTxt(doc,C.white); doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('DEFICIENCY QUOTE', pw/2, 13, {align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
  doc.text(`#${quote.quote_number||'DRAFT'}`, pw-ml, 19, {align:'right'});
  setTxt(doc, C.text);
  let y = 32;
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  const cn=doc.splitTextToSize(building?.client_name||building?.name||'—',100);
  doc.text(cn,ml,y); y+=cn.length*5+2;
  if(building?.address){doc.text(building.address,ml,y);y+=5;}
  y+=5;
  const qitems=quote.line_items||[];
  setFill(doc,C.navy);doc.rect(ml,y-3,mr-ml,7,'F');
  setTxt(doc,C.white);doc.setFont('helvetica','bold');doc.setFontSize(8);
  doc.text('Description',ml+3,y+1);doc.text('Total',pw-ml-3,y+1,{align:'right'});
  setTxt(doc,C.text);y+=8;
  qitems.forEach((item,i)=>{
    if(i%2===0){setFill(doc,C.lightgrey);doc.rect(ml,y-3,mr-ml,6.5,'F');}
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text(item.description||'—',ml+3,y);
    doc.setFont('helvetica','bold');doc.text(formatCurrency(item.total||0),pw-ml-3,y,{align:'right'});
    setTxt(doc,C.text);y+=7;
  });
  const total=quote.subtotal||0,tax=total*(CONFIG.TAX_RATE||0.05);
  y+=4;setDraw(doc,C.blue);doc.line(ml,y,pw-ml,y);y+=5;
  [['Subtotal',formatCurrency(total),false],['GST (5%)',formatCurrency(tax),false],['TOTAL',formatCurrency(total+tax),true]].forEach(([l,v,bold])=>{
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(bold?11:9);
    doc.text(l,ml+100,y);doc.text(v,pw-ml-3,y,{align:'right'});y+=bold?8:6;
  });
  const pg=doc.getNumberOfPages();
  for(let p=1;p<=pg;p++){doc.setPage(p);addFooter(doc,p,quote);}
  doc.save(`Quote-${quote.quote_number||'Draft'}.pdf`);
}
