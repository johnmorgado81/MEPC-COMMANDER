// pm-engine.js — MEPC Commander PM Proposal Engine
// Single source of truth for all PM proposal math, normalization, and schedule generation.
// All other modules must import from here — do not duplicate this logic.

import { CONFIG, calcPMHours, calcPMSellPrice, calcSubSell, numberToWords } from './config.js';
import { EQUIPMASTER, findEquipType } from './equipmaster.js';
import { getScopeText } from './scope-library.js';

// ─── PM Service Structure Constants ──────────────────────────────────────────
// THREE quarterly visits + ONE annual service. NOT four quarterly.
export const PM_QUARTERLY_VISITS = 3;
export const PM_ANNUAL_VISITS    = 1;
export const PM_TOTAL_VISITS     = PM_QUARTERLY_VISITS + PM_ANNUAL_VISITS; // 4 total events but not 4×QH
export const PM_SELL_RATE        = 152.00;
export const PM_SUB_MARKUP       = 0.25;

// ─── Tag splitting ────────────────────────────────────────────────────────────
export function splitCombinedTags(tagString) {
  if (!tagString) return [''];
  const parts = String(tagString).split(/\s*[&\/,+]\s*/).map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [tagString.trim()];
}

// ─── Equipment match resolution ───────────────────────────────────────────────
export function resolveMatch(typeString) {
  if (!typeString) return null;
  return findEquipType(typeString) || (() => {
    const words = typeString.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    return words.length
      ? (EQUIPMASTER||[]).find(e => words.some(w => e.equipment_type.toLowerCase().includes(w))) || null
      : null;
  })();
}

export function resolveConfidence(typeString, match) {
  if (!match) return 'unknown';
  return match.equipment_type.toLowerCase() === (typeString||'').toLowerCase() ? 'exact'
       : (typeString||'').toLowerCase() === (match.equipment_type||'').toLowerCase() ? 'strong'
       : findEquipType(typeString) ? 'strong'
       : 'review';
}

// ─── Hours resolution — priority: override → equipment record → EQUIPMASTER → default+flag ─
export function resolveHours(item, match) {
  const qH = item.override_quarterly_hours != null ? Number(item.override_quarterly_hours)
           : item.quarterly_hours          != null ? Number(item.quarterly_hours)
           : match?.quarterly_hours        != null ? Number(match.quarterly_hours)
           : null;
  const aH = item.override_annual_hours != null ? Number(item.override_annual_hours)
           : item.annual_hours          != null ? Number(item.annual_hours)
           : match?.annual_hours        != null ? Number(match.annual_hours)
           : null;
  const overridden = (item.override_quarterly_hours != null || item.override_annual_hours != null);
  return {
    qH:         qH ?? 1.0,
    aH:         aH ?? 4.0,
    overridden,
    needsReview: (qH === null || aH === null),
  };
}

// ─── Core calculations (wrap config helpers for single import point) ──────────
export function annualHours(qH, aH, qty = 1) {
  return calcPMHours(qH, aH, qty);
}

export function annualSell(totalHours) {
  return calcPMSellPrice(totalHours);
}

export function monthlyAllocation(annualSellValue) {
  return +(annualSellValue / 12).toFixed(2);
}

export function subcontractSell(rawCost) {
  return calcSubSell(rawCost);
}

export function formatAnnualWords(amount) {
  return numberToWords(amount);
}

// ─── Normalize raw equipment row (from wizard intake) ─────────────────────────
export function normalizeEquipmentRow(raw, frequency) {
  const match    = resolveMatch(raw.type);
  const conf     = resolveConfidence(raw.type, match);
  const { qH, aH, overridden, needsReview } = resolveHours(raw, match);
  const category = raw.category || match?.category || 'Other';
  const totHrs   = annualHours(qH, aH, Number(raw.qty) || 1);
  return {
    ...raw,
    equipmaster:            match?.equipment_type || null,
    conf,
    category,
    qtrHrs:                 qH,
    annHrs:                 aH,
    override_quarterly_hours: overridden ? raw.override_quarterly_hours : undefined,
    override_annual_hours:    overridden ? raw.override_annual_hours    : undefined,
    annual_total_hours:     totHrs,
    annual_price:           annualSell(totHrs),
    frequency:              frequency || 'quarterly',
    _overridden:            overridden,
    _needsReview:           needsReview || conf === 'unknown',
  };
}

// ─── Normalize full raw equipment array (wizard step 3 input) ─────────────────
export function normalizeRawEquipment(rawRows, frequency) {
  return (rawRows || []).map(r => normalizeEquipmentRow(r, frequency));
}

// ─── Resolve hours for a scope item (detail view / proposals.js) ──────────────
export function resolveItemHours(item) {
  const match = resolveMatch(item.equipment_type);
  const { qH, aH } = resolveHours(item, match);
  return { qH, aH, totH: annualHours(qH, aH, Number(item.qty) || 1) };
}

export function resolveItemPrice(item) {
  return annualSell(resolveItemHours(item).totH);
}

// ─── Proposal summary ─────────────────────────────────────────────────────────
// Returns { equipAnnual, subAnnual, oneTime, recurring, tax, total, monthly, totalHours }
export function summarizeProposal(scopeItems, subcontractorItems) {
  const internalItems = (scopeItems || []).filter(i => i.category !== 'Subcontracted Services');
  const equipAnnual   = internalItems.reduce((s, i) => s + (Number(i.annual_price) || 0), 0);
  const totalHours    = internalItems.reduce((s, i) => {
    return s + (Number(i.annual_total_hours) || resolveItemHours(i).totH);
  }, 0);

  const subs         = subcontractorItems || [];
  const subAnnual    = subs.filter(s => s.recurring !== 'onetime')
    .reduce((s, i) => s + subcontractSell(Number(i.sub_cost) || 0), 0);
  const oneTime      = subs.filter(s => s.recurring === 'onetime')
    .reduce((s, i) => s + subcontractSell(Number(i.sub_cost) || 0), 0);

  const recurring    = +(equipAnnual + subAnnual).toFixed(2);
  const tax          = +(recurring * CONFIG.TAX_RATE).toFixed(2);
  const total        = +(recurring + tax).toFixed(2);
  const monthly      = +(recurring / 12).toFixed(2);

  return { equipAnnual, subAnnual, oneTime, recurring, tax, total, monthly, totalHours };
}

// ─── Schedule A rows ─────────────────────────────────────────────────────────
// Returns array of row objects for display/export
export function buildScheduleARows(scopeItems) {
  return (scopeItems || [])
    .filter(i => i.category !== 'Subcontracted Services')
    .map((item, idx) => {
      const match = resolveMatch(item.equipment_type);
      const { qH, aH, overridden } = resolveHours(item, match);
      const totH  = annualHours(qH, aH, Number(item.qty) || 1);
      const annV  = Number(item.annual_price) || annualSell(totH);
      const conf  = item.confidence || item.conf || resolveConfidence(item.equipment_type, match);
      return {
        idx,
        tag:            item.tag || '',
        equipment_type: item.equipment_type || '',
        category:       item.category || '',
        qty:            Number(item.qty) || 1,
        qH, aH,
        totH:           +totH.toFixed(2),
        annualPrice:    +annV.toFixed(2),
        monthly:        +(annV / 12).toFixed(2),
        conf,
        overridden,
        needsReview:    !match || conf === 'unknown' || conf === 'review',
        match,
      };
    });
}

// ─── Proposal save payload ────────────────────────────────────────────────────
// Builds the correct DB record from scope + subs + meta
// visits_per_year = 3 for quarterly PM (3 quarterly visits — annual is a separate event type)
export function buildSavePayload(meta, scopeItems, subcontractorItems) {
  const summary = summarizeProposal(scopeItems, subcontractorItems);

  // visits_per_year = 3 for quarterly (3 PM visits); annual service is embedded in hour calc
  const VPY_MAP = { quarterly: 3, 'semi-annual': 2, annual: 1, monthly: 12 };
  const visits_per_year = VPY_MAP[meta.frequency] || 3;

  return {
    ...meta,
    scope_items:         scopeItems,
    subcontractor_items: subcontractorItems,
    annual_value:        summary.recurring,       // recurring only — excludes one-time
    monthly_value:       summary.monthly,
    one_time_value:      summary.oneTime,
    total_annual_hours:  +summary.totalHours.toFixed(2),
    visits_per_year,
  };
}

// ─── Subcontract package summary ─────────────────────────────────────────────
export function summarizeSubcontractPackages(subcontractorItems) {
  return (subcontractorItems || []).map(s => ({
    label:      s.label || '',
    scope:      s.scope || '',
    recurring:  s.recurring !== 'onetime',
    sub_cost:   Number(s.sub_cost) || 0,
    sell:       subcontractSell(Number(s.sub_cost) || 0),
    markup_pct: PM_SUB_MARKUP,
  }));
}

// ─── Schedule B text builder ─────────────────────────────────────────────────
export function buildScheduleB(scopeItems, company) {
  const co    = company || CONFIG.COMPANY;
  const types = [...new Set((scopeItems || []).map(i => (i.equipment_type || '').toLowerCase()))];
  const has   = kw => types.some(t => t.includes(kw));
  const sec   = (title, items) => ({ title, items });

  const sections = [];

  sections.push(sec('Service Structure', [
    'Three (3) Quarterly Maintenance Visits per year',
    'One (1) Annual Comprehensive Service per year',
    'All visits performed during regular business hours — Monday to Friday, 7:30 am – 4:30 pm',
  ]));

  if (has('boiler')) sections.push(sec('Boiler Plant', [
    'Quarterly: inspect burner assembly, combustion controls, safety devices, flue connections, and operating limits',
    'Annual teardown: clean heat exchanger surfaces, inspect refractory and gaskets, test ignitors and flame safeguard, perform combustion analysis, document Technical Safety BC records where applicable',
    'Replace consumables (gaskets, ignitors, electrodes) as required',
    'Fresh air intake filter replacement or cleaning where applicable',
    'Record and log operating pressures, temperatures, and gas supply pressure at each visit',
  ]));

  if (has('pump') || has('circulation')) sections.push(sec('Pumping Systems', [
    'Semi-annual: lubricate bearings, inspect mechanical seals and impeller condition, verify shaft alignment',
    'Flush and clean strainers; verify flow rates and differential pressure',
    'Inspect flexible connectors, isolation valves, and gauges',
    'VFD parameter verification and inspection where applicable',
  ]));

  if (has('cooling tower')) sections.push(sec('Cooling Tower', [
    'Semi-annual: full inspection, clean basin, inspect fill media and drift eliminators',
    'Sanitize tower per ASHRAE 188 and WorkSafeBC Legionella control requirements',
    'Service make-up valve, float assembly, blowdown valve, fan motor, and drive belts',
    'Document and report Legionella risk management activities per regulatory requirements',
  ]));

  if (has('chiller')) sections.push(sec('Chiller Plant', [
    'Annual or semi-annual service per OEM requirements and contract scope',
    'Log operating data: suction/discharge pressures, temperatures, oil level, refrigerant charge',
    'Inspect economizer, purge unit, oil cooler, and refrigerant leak detection equipment',
    'OEM-certified work performed under separate subcontract package where applicable',
  ]));

  if (has('heat exchanger') || has('plate heat')) sections.push(sec('Heat Exchangers', [
    'Annual inspection for fouling, leakage, and performance degradation',
    'Torque plate pack bolts to manufacturer specification as required',
    'Record inlet/outlet temperatures and differential pressure across unit',
  ]));

  if (has('expansion tank')) sections.push(sec('Expansion Tanks', [
    'Annual inspection of pre-charge pressure and bladder/diaphragm condition',
    'Recharge nitrogen pre-charge to design pressure as required',
  ]));

  if (has('dhw') || has('domestic hot water') || has('water heater') || has('storage tank')) sections.push(sec('Domestic Hot Water', [
    'Inspect anode rod condition; replace as required',
    'Test temperature-pressure relief valve; verify setpoint and discharge piping condition',
    'Flush sediment where accessible; verify thermostat setpoint',
    'Record supply and recirculation temperatures at each annual visit',
  ]));

  if (has('backflow')) sections.push(sec('Backflow Prevention', [
    'Annual certified test by licensed tester per BCWWA requirements',
    'Submit test records to the authority having jurisdiction',
    'Repair or rebuild assembly as required — quoted and approved separately',
  ]));

  if (has('ahu') || has('air handling') || has('rtu') || has('rooftop') || has('mau') || has('make-up air') || has('fan coil') || has('fcu') || has('exhaust fan')) sections.push(sec('Air Handling / Ventilation', [
    'Quarterly: inspect filters, belts, bearings, coils, drain pans, and damper operation',
    'Replace filters per schedule (filter media supplied by others unless included)',
    'Annual: clean coil surfaces, check refrigerant charge where applicable, lubricate bearings, tension belts, verify damper actuators and economizer sequences',
    'Record airflows, static pressures, and supply/return temperatures',
  ]));

  if (has('ddc') || has('bas') || has('bms') || has('control')) sections.push(sec('DDC / Building Automation', [
    'Quarterly review of setpoints, control sequences, schedules, and active alarms',
    'Annual: trend data analysis, calibration checks, system performance report to property manager',
    'Alarm monitoring and emergency response as defined in controls subcontract scope',
    'Performed under separate subcontract package where applicable',
  ]));

  if (has('chemical') || has('water treatment')) sections.push(sec('Chemical Water Treatment', [
    'Monthly water quality testing and chemical dosing per treatment program',
    'Maintain treatment logs; provide monthly reports to property manager',
    'Cooling tower seasonal chemical treatment program where applicable',
    'Performed under separate subcontract package',
  ]));

  sections.push(sec('Program Deliverables', [
    'Written service reports delivered within 30 days of each visit',
    'Annual performance review meeting with property manager',
    'Deficiency identification and reporting; all repair work quoted separately for approval before proceeding',
    `24-hour emergency contact: ${co.phone || ''}`,
  ]));

  sections.push(sec('Exclusions', [
    'Replacement parts, components, and major materials (quoted separately)',
    'Repairs and corrective work beyond routine preventive maintenance scope',
    'Emergency or after-hours service (billed at Schedule D applicable rates)',
    'New equipment installation or commissioning',
    'Work inside residential suites or tenant spaces unless otherwise stated',
  ]));

  return sections;
}

// ─── Render Schedule B to HTML ────────────────────────────────────────────────
export function renderScheduleBHTML(scopeItems, company) {
  const sections = buildScheduleB(scopeItems, company);
  return sections.map(s =>
    `<div class="sched-b-header">${s.title}</div>
     <ul class="sched-b-list">${s.items.map(l => `<li>${l}</li>`).join('')}</ul>`
  ).join('\n');
}

// ─── Proposal validation ─────────────────────────────────────────────────────
export function validateProposal(scopeItems, subcontractorItems) {
  const issues = [];
  const rows = buildScheduleARows(scopeItems);
  rows.forEach(r => {
    if (r.needsReview) issues.push(`Row "${r.tag || r.equipment_type}": unmatched — hours need review`);
    if (r.overridden)  issues.push(`Row "${r.tag || r.equipment_type}": hours manually overridden`);
  });
  const summary = summarizeProposal(scopeItems, subcontractorItems);
  if (summary.recurring <= 0) issues.push('Recurring annual value is zero');
  return { valid: issues.length === 0, issues };
}
