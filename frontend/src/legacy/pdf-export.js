import { CONFIG } from './config.js';
import { formatCurrency, formatDate } from './helpers.js';

function getjsPDF() { return window.jspdf.jsPDF; }

// ─── Shared helpers ────────────────────────────────────────────────────────────
function getCompany() {
  return { ...CONFIG.COMPANY };
}

function addFooter(doc, page, proposal) {
  const co = getCompany();
  doc.setFontSize(7.5); doc.setTextColor(140);
  doc.text(`${co.name}  |  ${co.address}, ${co.city}, ${co.province}  |  ${co.phone}`, 14, 285);
  if (proposal?.proposal_number) doc.text(`Proposal #${proposal.proposal_number}  |  Page ${page}`, 215.9 - 14, 285, { align:'right' });
  doc.setTextColor(0);
}

function addHeader(doc, title, sub = '') {
  const co = getCompany();
  doc.setFillColor(15, 25, 45); doc.rect(0, 0, 215.9, 20, 'F');
  doc.setFillColor(59, 130, 246); doc.rect(0, 20, 215.9, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text(co.name, 14, 13);
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  doc.text(`${co.phone}  ·  ${co.email}  ·  ${co.website}`, 14, 18);
  doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text(title, 215.9-14, 12, { align:'right' });
  if (sub) { doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(sub, 215.9-14, 18, { align:'right' }); }
  doc.setTextColor(0);
  return 28;
}

function checkPage(doc, y, need, page, proposal) {
  if (y + need > 272) { addFooter(doc, page.n, proposal); doc.addPage(); page.n++; y = addHeader(doc, 'PREVENTIVE MAINTENANCE PROPOSAL', `#${proposal?.proposal_number||'DRAFT'}`); }
  return y;
}

function sectionHead(doc, text, y, ml, mr) {
  doc.setFillColor(15,25,45); doc.rect(ml, y-4, mr-ml, 8, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text(text.toUpperCase(), ml+4, y);
  doc.setTextColor(0);
  return y + 8;
}

// ─── Main enhanced PDF ─────────────────────────────────────────────────────────
export function generateProposalPDFEnhanced(proposal, building, coverImageDataUrl) {
  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit:'mm', format:'letter' });
  const co    = getCompany();
  const pw    = 215.9, ml = 14, mr = pw - ml;
  const page  = { n: 1 };

  const annual   = Number(proposal.annual_value) || 0;
  const monthly  = Number(proposal.monthly_value) || annual / 12;
  const showGST  = co.show_gst === true;
  const tax      = showGST ? annual * (co.tax_rate || CONFIG.TAX_RATE || 0.05) : 0;
  const items    = proposal.scope_items || [];
  const manItems = (proposal.manual_items || []).filter(m => m.include !== false && m.client_facing);
  const freq     = proposal.frequency || 'quarterly';
  const qv       = proposal.quarter_visits || { q1:true, q2:true, q3:true, q4:true, annual_clean:false };
  const visitCount = [qv.q1,qv.q2,qv.q3,qv.q4].filter(Boolean).length || 4;
  const visitLabels = ['Q1','Q2','Q3','Q4'].filter((_,i)=>[qv.q1,qv.q2,qv.q3,qv.q4][i]).join(', ');

  // ── PAGE 1: COVER ──────────────────────────────────────────────────────────
  // Header band
  doc.setFillColor(15,25,45); doc.rect(0, 0, pw, 44, 'F');
  doc.setFillColor(59,130,246); doc.rect(0, 42, pw, 2, 'F');

  // Logo if available
  if (co.logo_data) {
    try {
      const lt = co.logo_data.match(/data:image\/(\w+)/)?.[1]?.toUpperCase()||'PNG';
      doc.addImage(co.logo_data, lt, ml, 6, 40, 14, undefined, 'FAST');
    } catch {}
  }

  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text(co.name, pw-ml, 14, { align:'right' });
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  doc.text(`${co.phone}  ·  ${co.email}  ·  ${co.website}`, pw-ml, 21, { align:'right' });
  doc.text(`${co.address}, ${co.city}, ${co.province} ${co.postal||''}`, pw-ml, 27, { align:'right' });
  doc.setTextColor(0);

  // Cover image
  const coverImg = coverImageDataUrl || building?.photo_url;
  let imgBottom = 46;
  if (coverImg) {
    try {
      const it = coverImg.match(/data:image\/(\w+)/)?.[1]?.toUpperCase()||'JPEG';
      let iw = pw, ih = 68;
      try {
        const p = doc.getImageProperties(coverImg);
        const r = Math.min(pw/p.width, 68/p.height);
        iw = p.width*r; ih = p.height*r;
      } catch {}
      doc.addImage(coverImg, it, (pw-iw)/2, 46, iw, ih, undefined, 'FAST');
      imgBottom = 46 + ih;
    } catch {}
  }

  // Title bar
  const ty = imgBottom + 2;
  doc.setFillColor(59,130,246); doc.rect(0, ty, pw, 13, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('PREVENTIVE MAINTENANCE PROPOSAL', ml, ty + 9);
  doc.setTextColor(0);

  // Two-column info block
  const iy = ty + 18;
  const hw = (mr-ml)/2 - 4;

  // Left: prepared for
  doc.setFillColor(245,248,255); doc.rect(ml, iy, hw, 72, 'F');
  doc.setDrawColor(210); doc.rect(ml, iy, hw, 72);
  let ly = iy + 7;
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(100);
  doc.text('PREPARED FOR', ml+4, ly); ly += 6;
  doc.setTextColor(0); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  const cname = (building?.client_name || building?.name || 'To Be Confirmed');
  const clines = doc.splitTextToSize(cname, hw-8);
  doc.text(clines, ml+4, ly); ly += clines.length * 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  if (building?.client_company) { const cl = doc.splitTextToSize(building.client_company, hw-8); doc.text(cl, ml+4, ly); ly+=cl.length*5; }
  if (building?.name && building.name !== cname) { const nl = doc.splitTextToSize(building.name, hw-8); doc.text(nl, ml+4, ly); ly+=nl.length*5; }
  const addr = [building?.address, building?.city, building?.province].filter(Boolean).join(', ');
  if (addr) { const al = doc.splitTextToSize(addr, hw-8); doc.text(al, ml+4, ly); ly+=5; }
  if (building?.client_email) { const _el=doc.splitTextToSize(building.client_email,hw-8); doc.text(_el[0],ml+4,ly); ly+=5; }
  if (building?.client_phone) doc.text(building.client_phone, ml+4, ly);

  // Right: proposal details
  const rx = ml+hw+8;
  doc.setFillColor(15,25,45); doc.rect(rx, iy, hw, 72, 'F');
  let ry = iy + 7;
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(130,160,210);
  doc.text('PROPOSAL DETAILS', rx+4, ry); ry+=6;
  [
    ['Proposal #', proposal.proposal_number||'DRAFT'],
    ['Date', formatDate(proposal.created_date)],
    ['Valid Until', formatDate(proposal.valid_until)],
    ['Service Visits', `${visitLabels} (${visitCount}/yr)`],
    qv.annual_clean ? ['Annual Cleaning', 'Included'] : null,
    ['Annual Value', formatCurrency(annual)],
    ['Monthly Billing', formatCurrency(monthly)],
  ].filter(Boolean).forEach(([k,v]) => {
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(130,160,210);
    doc.text(k, rx+4, ry);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(255,255,255);
    doc.text(String(v), rx+hw-4, ry, { align:'right' });
    ry += 7;
  });
  doc.setTextColor(0);

  addFooter(doc, page.n, proposal);

  // ── PAGE 2: COMPANY INTRO ──────────────────────────────────────────────────
  doc.addPage(); page.n++;
  let y = addHeader(doc, 'ABOUT US', `#${proposal.proposal_number||'DRAFT'}`);

  if (co.company_blurb) {
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const blurb = doc.splitTextToSize(co.company_blurb, mr-ml);
    doc.text(blurb, ml, y); y += blurb.length * 5.5 + 8;
  } else {
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const defaultBlurb = `${co.name} is a full-service mechanical contracting company providing preventive maintenance, service, and installation for commercial, strata, and industrial properties in British Columbia. Our licensed mechanical technicians deliver scheduled maintenance programs designed to protect your building assets, reduce lifecycle costs, and maintain regulatory compliance.`;
    const bl = doc.splitTextToSize(defaultBlurb, mr-ml);
    doc.text(bl, ml, y); y += bl.length * 5.5 + 8;
  }

  // Scope of services bullet list
  doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('Services Included in This Program:', ml, y); y += 7;
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  const services = [
    'Scheduled preventive maintenance at agreed visit intervals',
    'Comprehensive equipment inspection, cleaning, lubrication, and adjustment',
    'Safety control testing and verification',
    'Deficiency identification with written reports and cost estimates',
    'Equipment performance logging and trending',
    'Emergency service line access',
    'Annual performance review with building management',
  ];
  services.forEach(s => { doc.text(`•  ${s}`, ml+4, y); y+=5.5; });

  addFooter(doc, page.n, proposal);

  // ── PAGE 3: PRICING / ACCEPTANCE ──────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'PROPOSAL — PRICING & ACCEPTANCE', `#${proposal.proposal_number||'DRAFT'}`);

  // Building + client reminder
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(`Building: ${building?.name||'—'}`, ml, y);
  doc.text(`Client: ${building?.client_name||building?.client_company||'—'}`, ml+100, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  if (building?.strata_number) { doc.text('Strata Plan ' + building.strata_number, ml, y); y+=5; }
  const addr2 = [building?.address,building?.city,building?.province].filter(Boolean).join(', ');
  if (addr2) { doc.text(addr2, ml, y); y+=5; }
  y += 4;

  // Service regimen
  doc.setFillColor(235,243,255); doc.rect(ml, y-4, mr-ml, 16, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text('Service Schedule:', ml+4, y);
  doc.setFont('helvetica','normal');
  doc.text(`${visitLabels} — ${visitCount} visit${visitCount!==1?'s':''}/year${qv.annual_clean?' + Annual Cleaning/Teardown':''}`, ml+40, y); y+=6;
  const saMap = {shared:'Shared Residential & Commercial',commercial:'Commercial Common Areas',residential:'Residential Common Areas',mixed:'Mixed — see equipment list'};
  doc.text(`Service Area: ${saMap[proposal.service_area_type||'shared']||'—'}`, ml+4, y); y+=10;

  // Pricing table — lump sum
  y = sectionHead(doc, 'Contract Pricing — Annual Lump Sum', y, ml, mr); y += 2;

  const equipSubtot = items.filter(i=>i.category!=='Subcontracted Services').reduce((s,i)=>s+Number(i.annual_price||0),0);
  const subSubtot   = items.filter(i=>i.category==='Subcontracted Services').reduce((s,i)=>s+Number(i.annual_price||0),0);
  const manSubtot   = manItems.reduce((s,m)=>s+(Number(m.value)||0)*(Number(m.qty)||1),0);
  const subtot      = equipSubtot + subSubtot + manSubtot;

  const priceRows = [
    ['Preventive Maintenance Labour', formatCurrency(equipSubtot)],
    subSubtot > 0 ? ['Subcontracted Services', formatCurrency(subSubtot)] : null,
    manSubtot > 0 ? ['Additional Services', formatCurrency(manSubtot)] : null,
  ].filter(Boolean);

  priceRows.forEach(([l,v], i) => {
    if (i%2===0) { doc.setFillColor(248,250,255); doc.rect(ml, y-4, mr-ml, 6.5, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(l, ml+4, y); doc.text(v, mr-4, y, {align:'right'}); y+=7;
  });

  if (priceRows.length > 1) {
    doc.setDrawColor(180); doc.line(ml, y-2, mr, y-2);
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text('Subtotal', ml+4, y+3); doc.text(formatCurrency(subtot), mr-4, y+3, {align:'right'}); y+=10;
  }

  if (showGST && tax > 0) {
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(`GST (${((co.tax_rate||CONFIG.TAX_RATE||0.05)*100).toFixed(0)}%)  ${co.gst||''}`, ml+4, y);
    doc.text(formatCurrency(tax), mr-4, y, {align:'right'}); y+=7;
  }

  // Total highlighted box
  doc.setFillColor(15,25,45); doc.rect(ml, y-2, mr-ml, 12, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('ANNUAL CONTRACT VALUE', ml+4, y+6);
  doc.text(formatCurrency(showGST ? subtot+tax : subtot) + (showGST?' (incl. tax)':''), mr-4, y+6, {align:'right'});
  doc.setTextColor(0); y+=16;

  // Monthly
  doc.setFillColor(235,243,255); doc.rect(ml, y-2, mr-ml, 10, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(10);
  doc.text('Monthly Billing', ml+4, y+5);
  doc.text(formatCurrency(showGST?(subtot+tax)/12:subtot/12) + (showGST?' incl. tax':''), mr-4, y+5, {align:'right'});
  doc.setTextColor(0); y+=14;

  // Customer requests / notes
  if (building?.notes || proposal?.notes) {
    const noteText = [building?.notes, proposal?.notes].filter(Boolean).join('\n');
    y = checkPage(doc, y, 20, page, proposal);
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Customer Notes / Special Requirements:', ml, y); y+=6;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const nl = doc.splitTextToSize(noteText, mr-ml-4);
    doc.text(nl, ml+4, y); y += nl.length*4.5+6;
  }

  // Manual items breakdown (client-facing)
  if (manItems.length) {
    y = checkPage(doc, y, 10+manItems.length*6, page, proposal);
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Additional Services:', ml, y); y+=6;
    manItems.forEach(m => {
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      doc.text(`•  ${m.description||'Item'}${m.qty>1?' ×'+m.qty:''}`, ml+4, y);
      if (m.value>0) doc.text(formatCurrency(m.value*(m.qty||1))+'/yr', mr-4, y, {align:'right'});
      y+=5;
    });
    y+=4;
  }

  // Signatures
  y = checkPage(doc, y, 40, page, proposal);
  y += 4;
  doc.setFillColor(245,248,255); doc.rect(ml, y-4, mr-ml, 36, 'F');
  doc.setDrawColor(180); doc.rect(ml, y-4, mr-ml, 36);
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text('Acceptance — Upon Signature This Proposal Becomes a Binding Agreement', ml+4, y); y+=8;

  const sw = (mr-ml)/3 - 4;
  ['Customer Signature', 'Print Name & Title', 'Date'].forEach((l,i) => {
    const x = ml + i*(sw+4);
    doc.line(x, y+10, x+sw, y+10);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text(l, x, y+14);
  });
  y += 20;

  const sigName = [co.signatory, co.signatory_title].filter(Boolean).join(', ');
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text(`Authorized for ${co.name}:`, ml, y); y+=6;
  ['Authorized Signature', `${sigName||'Authorized Representative'}`, 'Date'].forEach((l,i) => {
    const x = ml + i*(sw+4);
    doc.line(x, y+10, x+sw, y+10);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text(l, x, y+14);
  });

  addFooter(doc, page.n, proposal);

  // ── PAGE 4: EQUIPMENT LIST ─────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'EQUIPMENT SCHEDULE', `#${proposal.proposal_number||'DRAFT'}`);
  y = sectionHead(doc, 'Equipment in Scope', y, ml, mr); y+=2;

  doc.setFillColor(15,25,45); doc.rect(ml, y-4, mr-ml, 7, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('Tag', ml+2, y); doc.text('Equipment Type', ml+22, y);
  doc.text('Make / Model', ml+90, y); doc.text('Area', ml+140, y);
  doc.text('Qty', ml+165, y);
  doc.setTextColor(0); y+=7;

  const saLabels = {common_strata:'Common',commercial:'Commercial',residential_in_suite:'In-Suite',shared:'Shared'};
  const equipItems = items.filter(i=>i.category!=='Subcontracted Services'&&i.category!=='Manual Items');

  // Type counts
  const typeCounts = {};
  equipItems.forEach(it => { const k=it.equipment_type||'Other'; typeCounts[k]=(typeCounts[k]||0)+(Number(it.qty)||1); });

  equipItems.forEach((item,idx) => {
    y = checkPage(doc, y, 7, page, proposal);
    if (idx%2===0) { doc.setFillColor(248,250,255); doc.rect(ml, y-4, mr-ml, 6.5, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(item.tag||'—', ml+2, y);
    doc.text((item.equipment_type||'').slice(0,30), ml+22, y);
    const mm=[item.manufacturer||item.make,item.model].filter(Boolean).join(' ').slice(0,26);
    if(mm) doc.text(mm, ml+90, y);
    doc.text(saLabels[item.service_area||'']||'—', ml+140, y);
    doc.text(String(item.qty||1), ml+168, y);
    y+=6;
  });

  // Count summary
  y = checkPage(doc, y, 12+Object.keys(typeCounts).length*4.5, page, proposal);
  y+=4; doc.setDrawColor(180); doc.line(ml, y, mr, y); y+=5;
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text('Summary by Type:', ml, y); y+=5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).forEach(([t,n])=>{
    doc.text(`${t}:`, ml+4, y);
    doc.text(`${n} unit${n!==1?'s':''}`, ml+100, y);
    y+=4.5;
  });
  doc.text(`Total: ${equipItems.reduce((s,i)=>s+(Number(i.qty)||1),0)} units across ${equipItems.length} items`, ml+4, y); y+=6;

  addFooter(doc, page.n, proposal);

  // ── PAGE 5: MAINTENANCE DESCRIPTIONS (grouped by equipment TYPE) ───────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'MAINTENANCE SCOPE OF WORK', `#${proposal.proposal_number||'DRAFT'}`);
  y = sectionHead(doc, `Service Regimen — ${visitLabels}${qv.annual_clean?' + Annual Cleaning':''}`, y, ml, mr); y+=3;

  // Group scope by equipment_type — one entry per type, not per asset
  const typeScope = {};
  equipItems.forEach(item => {
    const t = item.equipment_type || 'Other';
    if (!typeScope[t]) {
      typeScope[t] = { lines: item.scope_lines||[], qty: 0, make:'', examples:[] };
    }
    typeScope[t].qty += Number(item.qty)||1;
    if (item.manufacturer||item.make) typeScope[t].make = item.manufacturer||item.make;
    if (item.tag) typeScope[t].examples.push(item.tag);
  });

  Object.entries(typeScope).forEach(([type, data]) => {
    y = checkPage(doc, y, 18, page, proposal);
    doc.setFillColor(235,243,255); doc.rect(ml, y-4, mr-ml, 10, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(`${type}  ×${data.qty}`, ml+4, y);
    if (data.examples.length) {
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(100);
      doc.text(`(${data.examples.slice(0,6).join(', ')}${data.examples.length>6?'…':''})`, ml+4, y+5);
      doc.setTextColor(0);
    }
    y+=10;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    (data.lines||[]).forEach(line => {
      y = checkPage(doc, y, 6, page, proposal);
      const wrapped = doc.splitTextToSize(`•  ${line}`, mr-ml-8);
      doc.text(wrapped, ml+5, y);
      y += wrapped.length * 4.2;
    });
    y+=4;
  });

  // Subcontracted scope
  const subItems = items.filter(i=>i.category==='Subcontracted Services');
  if (subItems.length) {
    y = checkPage(doc, y, 14, page, proposal);
    y = sectionHead(doc, 'Subcontracted & Third-Party Services', y, ml, mr); y+=3;
    subItems.forEach(item => {
      y = checkPage(doc, y, 10, page, proposal);
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(item.equipment_type, ml+4, y); y+=5;
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      (item.scope_lines||[]).forEach(line => {
        const w=doc.splitTextToSize(`•  ${line}`, mr-ml-8); doc.text(w, ml+5, y); y+=w.length*4.2;
      });
      y+=3;
    });
  }

  addFooter(doc, page.n, proposal);

  // ── PAGE 6: TERMS & CONDITIONS ─────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'TERMS & CONDITIONS', `#${proposal.proposal_number||'DRAFT'}`);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  const terms = _defaultTerms();
  const termLines = doc.splitTextToSize(terms, mr-ml);
  doc.text(termLines, ml, y);
  addFooter(doc, page.n, proposal);

  // ── PAGE 7: RATE SHEET ─────────────────────────────────────────────────────
  doc.addPage(); page.n++;
  y = addHeader(doc, 'SCHEDULE D — LABOUR RATE SHEET', `#${proposal.proposal_number||'DRAFT'}`);
  const yr = new Date().getFullYear();
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(`${co.name} — Prevailing Labour Rates ${yr}`, ml, y); y+=7;

  const lr = CONFIG.LABOUR_RATES || {};
  const rateRows = [
    ['Weekday Service Call (minimum)', formatCurrency(lr.weekday_callout||145)],
    ['Weekday Hourly Rate', formatCurrency(lr.weekday_hourly||115) + ' / hr'],
    ['Saturday / After-Hours Call', formatCurrency(lr.weekend_callout||260)],
    ['Saturday / After-Hours Hourly', formatCurrency(lr.weekend_hourly||230) + ' / hr'],
    ['PM Contract Hourly Rate', formatCurrency(lr.pm_hourly||115) + ' / hr'],
    ['Emergency / Holiday Callout', 'By quotation'],
  ];
  rateRows.forEach(([l,v], i) => {
    y = checkPage(doc, y, 7, page, proposal);
    if (i%2===0) { doc.setFillColor(248,250,255); doc.rect(ml, y-4, mr-ml, 6.5, 'F'); }
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(l, ml+4, y);
    doc.setFont('helvetica','normal'); doc.text(v, mr-4, y, {align:'right'}); y+=7;
  });

  y+=5;
  doc.setFont('helvetica','italic'); doc.setFontSize(8);
  doc.text('Rates subject to annual review. All rates exclude applicable taxes. Materials billed at cost plus markup per Schedule C.', ml, y); y+=6;
  if (co.tsb) { doc.text(`BC Contractors Licence / TSB: ${co.tsb}`, ml, y); y+=5; }
  if (showGST && co.gst) { doc.text(`GST Registration: ${co.gst}`, ml, y); }

  addFooter(doc, page.n, proposal);

  doc.save(`Proposal-${proposal.proposal_number||'Draft'}.pdf`);
}

// ── Simple proposal PDF (basic, from list view) ────────────────────────────────
export function generateProposalPDF(proposal, building) {
  const coverImg = building?.photo_url || null;
  generateProposalPDFEnhanced(proposal, building, coverImg);
}

// ── Quote PDF ──────────────────────────────────────────────────────────────────
export function generateQuotePDF(quote, building) {
  const jsPDF = getjsPDF();
  const doc   = new jsPDF({ unit:'mm', format:'letter' });
  const co    = getCompany();
  let y       = addHeader(doc, 'DEFICIENCY QUOTE', `#${quote.quote_number}`);
  doc.setFontSize(9); doc.setFont('helvetica','bold');
  doc.text('Prepared For:', 14, y); doc.setFont('helvetica','normal'); y+=5;
  doc.text(building?.client_name||building?.name||'—', 14, y); y+=5;
  if (building?.address) { doc.text(building.address, 14, y); y+=5; }
  y+=6;
  const items = quote.line_items || [];
  items.forEach((item, i) => {
    if (y>255) { doc.addPage(); y=20; }
    if (i%2===0) { doc.setFillColor(248,250,255); doc.rect(14, y-4, 187.9, 6.5, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(item.description||'—', 16, y);
    doc.text(formatCurrency(item.total||0), 201.9, y, {align:'right'});
    y+=7;
  });
  const total = (quote.subtotal||0); const tax = total*(CONFIG.TAX_RATE||0.05);
  y+=4; doc.setDrawColor(180); doc.line(14, y, 201.9, y); y+=5;
  [['Subtotal',formatCurrency(total)],[`GST (5%)`,formatCurrency(tax)],['Total',formatCurrency(total+tax)]].forEach(([l,v],i)=>{
    doc.setFont('helvetica',i===2?'bold':'normal'); doc.setFontSize(i===2?11:9);
    doc.text(l, 130, y); doc.text(v, 201.9, y, {align:'right'}); y+=i===2?9:6;
  });
  const pg = doc.getNumberOfPages();
  for (let p=1;p<=pg;p++) { doc.setPage(p); addFooter(doc, p, quote); }
  doc.save(`Quote-${quote.quote_number||'Draft'}.pdf`);
}

function _defaultTerms() {
  return `PAYMENT TERMS: Net 30 days from invoice date. Accounts past due are subject to interest at 2% per month (24% per annum).

SCOPE: This proposal covers only the preventive maintenance services described herein. Repairs, parts replacements, emergency callouts, and any work outside the described scope are not included and will be quoted separately.

EXCLUSIONS: Replacement parts and components; repairs beyond routine maintenance; emergency or after-hours labour; equipment commissioning or new installation; work required due to owner-caused damage; water treatment chemicals unless specified.

ACCESS: Client agrees to provide reasonable access to all equipment areas during scheduled visits. Inaccessible equipment may result in additional charges or rescheduling.

CONTRACT TERM: Initial term of one (1) year from the date of acceptance. Automatically renews for successive one-year terms unless either party provides 30 days written notice of cancellation.

RATE ADJUSTMENTS: Labour rates are subject to annual adjustment with 30 days written notice.

LIMITATION OF LIABILITY: ${getCompany().name||'Contractor'} shall not be liable for consequential or indirect damages arising from the performance of this contract.

GOVERNING LAW: This agreement is governed by the laws of British Columbia, Canada.`;
}
