// pm-engine.js — Canonical deterministic calculation engine
// Single source of truth for all hours, pricing, and regimen logic.
// All editors (equipment registry, proposal wizard, saved proposal editor)
// and the PDF renderer must consume this module exclusively.
//
// Renderer contract:
//   buildProposalPayload(proposal, building, company) → canonical renderer input
//   All PDF/output functions consume only the payload returned here.

import { CONFIG, calcPMSellPrice } from './config.js';
import { findEquipType } from './equipmaster.js';

// ─── Rate helpers ─────────────────────────────────────────────────────────────
export function getSellRate()    { return CONFIG.LABOUR_RATES?.pm_hourly  || 152; }
export function getOverheadPct() { return CONFIG.PM_OVERHEAD_PCT           || 0.30; }
export function getMarginPct()   { return CONFIG.PM_MARGIN_PCT             || 0.20; }

export function sellFromHours(hrs) {
  if (!hrs || hrs <= 0) return 0;
  const cost = hrs * getSellRate();
  return +((cost * (1 + getOverheadPct())) / (1 - getMarginPct())).toFixed(2);
}

// ─── EQUIPMASTER defaults ─────────────────────────────────────────────────────
export function stdHours(equipmentType) {
  const m = findEquipType(equipmentType);
  return {
    quarterly_hours: m?.quarterly_hours || 0,
    annual_hours:    m?.annual_hours    || 0,
    semi_annual_hours: m?.semi_annual_hours || 0,
    monthly_hours:   m?.monthly_hours   || 0,
    category:        m?.category        || 'Other',
  };
}

// ─── Regimen helpers ──────────────────────────────────────────────────────────
// quarterVisits: { q1, q2, q3, q4, annual_clean }
export function deriveVisitCount(quarterVisits) {
  if (!quarterVisits) return 4;
  return [quarterVisits.q1, quarterVisits.q2, quarterVisits.q3, quarterVisits.q4].filter(Boolean).length || 4;
}

export function regimenLabel(quarterVisits) {
  if (!quarterVisits) return 'Q1, Q2, Q3, Q4 (4 visits/yr)';
  const labels = ['Q1','Q2','Q3','Q4'].filter((_,i) => [quarterVisits.q1,quarterVisits.q2,quarterVisits.q3,quarterVisits.q4][i]);
  const n = labels.length;
  const clean = quarterVisits.annual_clean ? ' + Annual Cleaning' : '';
  return `${labels.join(', ')} (${n} visit${n!==1?'s':''}/yr)${clean}`;
}

// ─── Row-level calculation ────────────────────────────────────────────────────
//
// asset: { equipment_type, qty, override_quarterly_hours, quarterly_hours,
//          annual_cleaning_enabled, override_annual_hours, annual_hours }
// regimen: { quarterVisits, rateProfile } — can be null to use asset-level fields
//
export function calcRow(asset, quarterVisits) {
  const qty   = parseInt(asset.qty) || 1;
  const qh    = parseFloat(asset.override_quarterly_hours ?? asset.quarterly_hours ?? 0) || 0;
  const clean = (asset.annual_cleaning_enabled)
    ? (parseFloat(asset.override_annual_hours ?? asset.annual_hours ?? 0) || 0)
    : 0;
  const visits = deriveVisitCount(quarterVisits);
  const totalHrs = (qh * visits * qty) + (clean * qty);
  const sell = sellFromHours(totalHrs);
  return {
    effQtrHrs:   qh,
    effCleanHrs: clean,
    visitCount:  visits,
    rowTotalHrs: totalHrs,
    rowSell:     sell,
    qty,
  };
}

// ─── Proposal-level aggregation ───────────────────────────────────────────────
//
// scopeItems: normalized scope items from saved proposal (have annual_price, qty, equipment_type, etc.)
// manualItems: [{ value, qty, include, client_facing }]
// subItems: scope items with category === 'Subcontracted Services'
//
export function calcProposalTotals(scopeItems, manualItems, quarterVisits) {
  const equipItems = (scopeItems||[]).filter(i => i.category !== 'Subcontracted Services' && i.category !== 'Manual Items');
  const subItems   = (scopeItems||[]).filter(i => i.category === 'Subcontracted Services');
  const manActive  = (manualItems||[]).filter(m => m.include !== false);

  const equipSubtot = equipItems.reduce((s,i) => s + Number(i.annual_price||0), 0);
  const subSubtot   = subItems.reduce((s,i)   => s + Number(i.annual_price||0), 0);
  const manSubtot   = manActive.reduce((s,m)  => s + (Number(m.value)||0)*(Number(m.qty)||1), 0);
  const annual      = equipSubtot + subSubtot + manSubtot;
  const monthly     = annual / 12;
  const visits      = deriveVisitCount(quarterVisits);

  // Counts by type (using qty field)
  const typeCounts = {};
  equipItems.forEach(it => {
    const k = it.equipment_type || 'Other';
    typeCounts[k] = (typeCounts[k]||0) + (Number(it.qty)||1);
  });

  // Counts by service area
  const areaCounts = {};
  equipItems.forEach(it => {
    const k = it.service_area || 'common_strata';
    areaCounts[k] = (areaCounts[k]||0) + (Number(it.qty)||1);
  });

  // Grouped maintenance descriptions (one per type)
  const typeScope = {};
  equipItems.forEach(item => {
    const t = item.equipment_type || 'Other';
    if (!typeScope[t]) {
      typeScope[t] = {
        lines: item.scope_lines || [],
        qty:   0,
        make:  item.manufacturer || item.make || '',
        tags:  [],
        annCleanHrs: item.annCleanHrs || 0,
      };
    }
    typeScope[t].qty  += Number(item.qty) || 1;
    typeScope[t].make  = typeScope[t].make || item.manufacturer || item.make || '';
    if (item.tag) typeScope[t].tags.push(item.tag);
  });

  return {
    equipSubtot,
    subSubtot,
    manSubtot,
    annual,
    monthly,
    visits,
    typeCounts,
    areaCounts,
    typeScope,
    totalUnits: Object.values(typeCounts).reduce((s,n)=>s+n, 0),
  };
}

// ─── Canonical proposal payload builder ──────────────────────────────────────
// Produces the single data structure consumed by pdf-export.js renderer.
// Call this before invoking generateProposalPDFEnhanced.
//
export function buildProposalPayload(proposal, building, company) {
  const qv        = proposal.quarter_visits || { q1:true,q2:true,q3:true,q4:true,annual_clean:false };
  const scope     = proposal.scope_items   || [];
  const manual    = proposal.manual_items  || [];
  const totals    = calcProposalTotals(scope, manual, qv);
  const co        = { ...CONFIG.COMPANY, ...(company||{}) };
  const showGST   = co.show_gst === true;
  const taxRate   = co.tax_rate || CONFIG.TAX_RATE || 0.05;
  const tax       = showGST ? totals.annual * taxRate : 0;

  return {
    // Identity
    proposal_number:  proposal.proposal_number,
    title:            proposal.title,
    status:           proposal.status,
    created_date:     proposal.created_date,
    valid_until:      proposal.valid_until,
    payment_terms:    proposal.payment_terms,
    notes:            proposal.notes,

    // Regimen
    quarter_visits:   qv,
    visit_count:      totals.visits,
    regimen_label:    regimenLabel(qv),
    service_area_type: proposal.service_area_type || 'shared',
    frequency:        proposal.frequency,

    // Building (never truncate — pass full objects)
    building: {
      name:           building?.name            || '',
      client_name:    building?.client_name     || '',
      client_company: building?.client_company  || '',
      strata_number:  building?.strata_number   || '',
      address:        building?.address         || '',
      city:           building?.city            || '',
      province:       building?.province        || '',
      postal_code:    building?.postal_code     || '',
      client_email:   building?.client_email    || '',
      client_phone:   building?.client_phone    || '',
      photo_url:      building?.photo_url       || null,
      notes:          building?.notes           || building?.building_notes || '',
    },

    // Company
    company: co,

    // Pricing (lump sum — no per-item)
    equip_subtot: totals.equipSubtot,
    sub_subtot:   totals.subSubtot,
    man_subtot:   totals.manSubtot,
    annual:       totals.annual,
    monthly:      totals.monthly,
    show_gst:     showGST,
    tax_rate:     taxRate,
    tax:          tax,
    total_with_tax: totals.annual + tax,

    // Equipment data (internal — itemized, no per-item pricing exposed)
    scope_items:    scope,
    manual_items:   manual,
    type_counts:    totals.typeCounts,
    area_counts:    totals.areaCounts,
    type_scope:     totals.typeScope,   // grouped by type for maintenance section
    total_units:    totals.totalUnits,

    // Cover
    cover_image_url: proposal.cover_image_url || building?.photo_url || null,

    // Raw for edit continuity
    subcontractor_items: proposal.subcontractor_items || [],
    raw_intake:          proposal.raw_intake          || {},
    is_draft:            proposal.is_draft            !== false,
  };
}

// ─── Scope normalization helper ───────────────────────────────────────────────
// Converts a raw equipment record (from registry) into a scope item for proposal.
// Call this when building the scope_items array for a new proposal.
//
export function assetToScopeItem(asset, quarterVisits, getScopeTextFn) {
  const std    = stdHours(asset.equipment_type);
  const qh     = parseFloat(asset.override_quarterly_hours ?? std.quarterly_hours) || std.quarterly_hours || 1;
  const ah     = parseFloat(asset.override_annual_hours    ?? std.annual_hours)    || std.annual_hours    || 0;
  const qty    = parseInt(asset.qty) || 1;
  const visits = deriveVisitCount(quarterVisits);
  const clean  = quarterVisits?.annual_clean ? ah : 0;
  const hrs    = (qh * visits * qty) + (clean * qty);
  const sell   = sellFromHours(hrs);
  const lines  = getScopeTextFn
    ? (getScopeTextFn(asset.equipment_type, 'quarterly') || [])
    : [];

  return {
    equipment_id:   asset.id,
    tag:            asset.tag            || '',
    equipment_type: asset.equipment_type || 'Other',
    manufacturer:   asset.manufacturer   || asset.make || '',
    make:           asset.manufacturer   || asset.make || '',
    model:          asset.model          || '',
    qty,
    service_area:   asset.service_area   || 'common_strata',
    location:       asset.location       || '',
    category:       asset.category       || std.category || 'Other',
    frequency:      'quarterly',
    qtrHrs:         qh,
    annCleanHrs:    ah,
    annual_price:   sell,
    scope_lines:    lines,
    confidence:     asset.match_confidence || 'manual',
    ocr_raw:        asset.ocr_raw         || '',
  };
}
