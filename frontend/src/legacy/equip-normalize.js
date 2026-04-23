/**
 * equip-normalize.js — Deterministic Equipment Normalization Layer v1.0
 *
 * Canonical registry maps imported tags/labels → one EQUIPMASTER asset class.
 * Precedence: exact_tag → exact_label → exact_alias → normalized_alias → manual_review
 * No fuzzy matching by default. Hard-stop review on ambiguity.
 */

// ─── Registry ──────────────────────────────────────────────────────────────────
const REGISTRY = [
  // HVAC_AIRSIDE
  { tag:'AHU',  label:'Air Handling Unit',          cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['AHU','Air Handler','Air Handling Unit'] },
  { tag:'RTU',  label:'Rooftop Unit',                cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['RTU','Rooftop Unit','Roof Top Unit','Rooftop'] },
  { tag:'FCU',  label:'Fan Coil Unit',               cat:'HVAC_AIRSIDE',       risk:'MEDIUM',   aliases:['FCU','Fan Coil','Fan Coil Unit'] },
  { tag:'VAV',  label:'Variable Air Volume Box',     cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['VAV','VAV Box','Variable Air Volume Box','VAV Terminal'] },
  { tag:'ERV',  label:'Energy Recovery Ventilator',  cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['ERV','Energy Recovery Ventilator'] },
  { tag:'HRV',  label:'Heat Recovery Ventilator',    cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['HRV','Heat Recovery Ventilator'] },
  { tag:'MUA',  label:'Make Up Air Unit',             cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['MUA','MAU','Make Up Air Unit','Make-Up Air Unit','Make Up Air'] },
  { tag:'EF',   label:'Exhaust Fan',                 cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['EF','Exhaust Fan','Ex Fan'] },
  { tag:'IF',   label:'Inline Fan',                  cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['IF','Inline Fan','In-Line Fan'] },
  { tag:'SF',   label:'Supply Fan',                  cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['SF','Supply Fan'] },
  { tag:'RF',   label:'Return Fan',                  cat:'HVAC_AIRSIDE',       risk:'MEDIUM',   aliases:['RF','Return Fan'] },
  { tag:'UH',   label:'Unit Heater',                 cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['UH','Unit Heater'] },
  { tag:'EH',   label:'Electric Heater',             cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['EH','Electric Heater','Electric Unit Heater'] },
  { tag:'CH',   label:'Chiller',                     cat:'HVAC_AIRSIDE',       risk:'MEDIUM',   aliases:['CH','Chiller','Chilled Water Chiller'] },  // CWC collapses here
  { tag:'CT',   label:'Cooling Tower',               cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['CT','Cooling Tower','Tower'] },
  { tag:'CU',   label:'Condensing Unit',             cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['CU','Condensing Unit','Outdoor Condensing Unit'] },
  { tag:'HP',   label:'Heat Pump',                   cat:'HVAC_AIRSIDE',       risk:'MEDIUM',   aliases:['HP','Heat Pump','Split Heat Pump'] },
  { tag:'VRF',  label:'VRF Outdoor Unit',            cat:'HVAC_AIRSIDE',       risk:'MEDIUM',   aliases:['VRF','VRF Outdoor','VRF Outdoor Unit','VRF Condenser'] },
  { tag:'IDU',  label:'VRF Indoor Unit',             cat:'HVAC_AIRSIDE',       risk:'MEDIUM',   aliases:['IDU','Indoor Unit','VRF Indoor Unit','Fan Coil Cassette','Ducted Indoor Unit'] },
  { tag:'CRAC', label:'CRAC Unit',                   cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['CRAC','CRAC Unit','Computer Room AC','Precision AC'] },
  { tag:'HUM',  label:'Humidifier',                  cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['HUM','Humidifier','Steam Humidifier'] },
  { tag:'DHUM', label:'Dehumidifier',                cat:'HVAC_AIRSIDE',       risk:'LOW',      aliases:['DHUM','Dehumidifier'] },
  { tag:'KEF',  label:'Kitchen Exhaust Fan',         cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['KEF','Kitchen Exhaust Fan','Kitchen EF','Hood Exhaust Fan'] },
  { tag:'KMUA', label:'Kitchen Make Up Air Unit',    cat:'HVAC_AIRSIDE',       risk:'MEDIUM',   aliases:['KMUA','Kitchen MUA','Kitchen MAU','Kitchen Make Up Air Unit'] },
  { tag:'SPF',  label:'Stair Pressurization Fan',    cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['SPF','Stair Press Fan','Stair Pressurization Fan','Stairwell Pressurization Fan'] },
  { tag:'SEF',  label:'Smoke Exhaust Fan',           cat:'HVAC_AIRSIDE',       risk:'HIGH',     aliases:['SEF','Smoke Exhaust Fan','Smoke Fan','Smoke Exhaust'] },
  // HYDRONIC_PLANT
  { tag:'BLR',  label:'Hot Water Boiler',            cat:'HYDRONIC_PLANT',     risk:'HIGH',     aliases:['BLR','Hot Water Boiler','HW Boiler','Boiler'] },
  { tag:'SBLR', label:'Steam Boiler',                cat:'HYDRONIC_PLANT',     risk:'HIGH',     aliases:['SBLR','Steam Boiler'] },
  { tag:'CBLR', label:'Condensing Boiler',           cat:'HYDRONIC_PLANT',     risk:'HIGH',     aliases:['CBLR','Condensing Boiler','Mod-Con Boiler'] },
  { tag:'HX',   label:'Plate Heat Exchanger',        cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['HX','Plate HX','Plate Heat Exchanger'] },
  { tag:'HE',   label:'Shell and Tube Heat Exchanger', cat:'HYDRONIC_PLANT',  risk:'MEDIUM',   aliases:['HE','Shell and Tube Heat Exchanger','Shell & Tube Heat Exchanger','Shell and Tube HX','Shell & Tube HX'] },
  { tag:'HWP',  label:'Heating Water Pump',          cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['HWP','Heating Water Pump','Htg Water Pump'] },
  { tag:'CHWP', label:'Chilled Water Pump',          cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['CHWP','Chilled Water Pump','CHW Pump'] },
  { tag:'CWP',  label:'Condenser Water Pump',        cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['CWP','Condenser Water Pump','Cond Water Pump'] },
  { tag:'SP',   label:'Secondary Pump',              cat:'HYDRONIC_PLANT',     risk:'CRITICAL', aliases:['SP','Secondary Pump','Secondary System Pump'] },
  { tag:'PP',   label:'Primary Pump',                cat:'HYDRONIC_PLANT',     risk:'HIGH',     aliases:['PP','Primary Pump','Primary System Pump'] },
  { tag:'BP',   label:'Booster Pump',                cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['BP','Booster Pump','Pressure Booster Pump'] },
  { tag:'P',    label:'Circulator Pump',             cat:'HYDRONIC_PLANT',     risk:'CRITICAL', aliases:['P','Circulator Pump','Circ Pump','Circulator'] },
  { tag:'ET',   label:'Expansion Tank',              cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['ET','Expansion Tank','Expansion Vessel'] },
  { tag:'CTK',  label:'Compression Tank',            cat:'HYDRONIC_PLANT',     risk:'HIGH',     aliases:['CTK','Compression Tank'] },
  { tag:'AS',   label:'Air Separator',               cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['AS','Air Separator','Air Sep'] },
  { tag:'DS',   label:'Dirt Separator',              cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['DS','Dirt Separator','Dirt Sep'] },
  { tag:'HS',   label:'Hydraulic Separator',         cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['HS','Hydraulic Separator','Hydro Separator','Low Loss Header'] },
  { tag:'BT',   label:'Buffer Tank',                 cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['BT','Buffer Tank','Buffer Vessel'] },
  { tag:'GF',   label:'Glycol Feeder',               cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['GF','Glycol Feeder','Glycol Fill Pot'] },
  { tag:'CF',   label:'Chemical Feeder',             cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['CF','Chemical Feeder','Chemical Pot','Chem Feeder'] },
  { tag:'PF',   label:'Pot Feeder',                  cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['PF','Pot Feeder'] },
  { tag:'MV',   label:'Mixing Valve',                cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['MV','Mixing Valve','Tempering Valve'] },
  { tag:'BV',   label:'Balancing Valve',             cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['BV','Balancing Valve','Balance Valve'] },
  { tag:'CV',   label:'Control Valve',               cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['CV','Control Valve','Automatic Control Valve'] },
  { tag:'ZV',   label:'Zone Valve',                  cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['ZV','Zone Valve'] },
  { tag:'TDV',  label:'Triple Duty Valve',           cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['TDV','Triple Duty Valve','Triple Duty'] },
  { tag:'STR',  label:'Strainer',                    cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['STR','Strainer','Y-Strainer','Basket Strainer'] },
  { tag:'LWCO', label:'Low Water Cutoff',            cat:'HYDRONIC_PLANT',     risk:'LOW',      aliases:['LWCO','Low Water Cutoff','Low-Water Cutoff'] },
  { tag:'CN',   label:'Condensate Neutralizer',      cat:'HYDRONIC_PLANT',     risk:'MEDIUM',   aliases:['CN','Condensate Neutralizer','Neutralizer'] },
  // PLUMBING_DRAINAGE — NOTE: Sump Pump tag is SMP (not SP)
  { tag:'SMP',  label:'Sump Pump',                   cat:'PLUMBING_DRAINAGE',  risk:'CRITICAL', aliases:['SMP','Sump Pump'] },
  { tag:'DSP',  label:'Duplex Sump Pump',            cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['DSP','Duplex Sump Pump','Duplex Sump','Lead-Lag Sump Pump'] },
  { tag:'STP',  label:'Storm Pump',                  cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['STP','Storm Pump','Stormwater Pump'] },
  { tag:'SWP',  label:'Sewage Pump',                 cat:'PLUMBING_DRAINAGE',  risk:'HIGH',     aliases:['SWP','Sewage Pump','Sanitary Pump','Sewage Ejector Pump'] },
  { tag:'SPP',  label:'Sewage Pump Package',         cat:'PLUMBING_DRAINAGE',  risk:'HIGH',     aliases:['SPP','Sewage Pump Package','Duplex Sewage Package','Sewage Package'] },
  { tag:'GP',   label:'Grinder Pump',                cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['GP','Grinder Pump'] },
  { tag:'LS',   label:'Lift Station',                cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['LS','Lift Station','Sewage Lift Station','Wastewater Lift Station'] },
  { tag:'SB',   label:'Sump Basin',                  cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['SB','Sump Basin','Sump Pit'] },
  { tag:'SEB',  label:'Sewage Basin',                cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['SEB','Sewage Basin','Sewage Pit','Sanitary Basin'] },
  { tag:'CB',   label:'Catch Basin',                 cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['CB','Catch Basin'] },
  { tag:'AD',   label:'Area Drain',                  cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['AD','Area Drain'] },
  { tag:'FD',   label:'Floor Drain',                 cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['FD','Floor Drain'] },
  { tag:'FS',   label:'Floor Sink',                  cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['FS','Floor Sink'] },
  { tag:'TD',   label:'Trench Drain',                cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['TD','Trench Drain','Linear Trench Drain'] },
  { tag:'SD',   label:'Slot Drain',                  cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['SD','Slot Drain'] },
  { tag:'CD',   label:'Channel Drain',               cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['CD','Channel Drain'] },
  { tag:'RD',   label:'Roof Drain',                  cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['RD','Roof Drain'] },
  { tag:'ORD',  label:'Overflow Roof Drain',         cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['ORD','Overflow Roof Drain','Overflow Drain','Emergency Roof Drain'] },
  { tag:'RL',   label:'Rainwater Leader',            cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['RL','Rainwater Leader','Leader','Storm Leader'] },
  { tag:'CO',   label:'Cleanout',                    cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['CO','Cleanout','Clean Out','C/O'] },
  { tag:'BWV',  label:'Backwater Valve',             cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['BWV','Backwater Valve','Sewer Backwater Valve'] },
  { tag:'OWS',  label:'Oil Water Separator',         cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['OWS','Oil Water Separator','O/W Separator','Oil Separator'] },
  { tag:'SOI',  label:'Sand Oil Interceptor',        cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['SOI','Sand Oil Interceptor','Sand/Oil Interceptor'] },
  { tag:'NB',   label:'Neutralization Basin',        cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['NB','Neutralization Basin','Acid Neutralization Basin'] },
  { tag:'SWS',  label:'Storm Separator',             cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['SWS','Storm Separator','Stormwater Separator'] },
  { tag:'RWT',  label:'Rainwater Tank',              cat:'PLUMBING_DRAINAGE',  risk:'LOW',      aliases:['RWT','Rainwater Tank','Harvest Tank','Rainwater Storage Tank'] },
  { tag:'CP',   label:'Condensate Pump',             cat:'PLUMBING_DRAINAGE',  risk:'HIGH',     aliases:['CP','Condensate Pump','Cond Pump','Condensate Lift Pump'] },
  { tag:'DLS',  label:'Drainage Lift Station',       cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['DLS','Drainage Lift Station','Drain Lift Station'] },
  { tag:'PS',   label:'Manhole Pump Station',        cat:'PLUMBING_DRAINAGE',  risk:'MEDIUM',   aliases:['PS','Manhole Pump Station','Pump Station','Site Pump Station'] },
];

// ─── Red-flag tags ─────────────────────────────────────────────────────────────
const RED_FLAG_TAGS = new Set([
  'SP','SMP','P','PP','BP','CT','CTK','EF','IF','SF','SPF','SEF','KEF',
  'CU','FCU','CH','BLR','CBLR','SBLR','SWP','SPP','CP',
]);

// Generic trigger words that force review without exact match
const GENERIC_PUMP_RE = /\bpump\b/i;
const GENERIC_FAN_RE  = /\bfan\b/i;
const GENERIC_BOILER_RE = /\bboiler\b/i;

const OCR_CONFIDENCE_THRESHOLD = 0.70;

// ─── Normalized alias helpers ─────────────────────────────────────────────────
function normalizeAlias(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ');
}

// Pre-build lookup maps for O(1) resolution
const _byTag      = new Map();  // canonical tag -> entry
const _byLabel    = new Map();  // exact canonical label (lowercase) -> entry
const _byAlias    = new Map();  // exact alias (original case, trimmed) -> entry[]
const _byNormAlias = new Map(); // normalized alias -> entry[]

for (const entry of REGISTRY) {
  _byTag.set(entry.tag, entry);
  _byLabel.set(entry.label.toLowerCase(), entry);
  for (const alias of entry.aliases) {
    const trimmed = alias.trim();
    if (!_byAlias.has(trimmed)) _byAlias.set(trimmed, []);
    _byAlias.get(trimmed).push(entry);
    const norm = normalizeAlias(trimmed);
    if (!_byNormAlias.has(norm)) _byNormAlias.set(norm, []);
    _byNormAlias.get(norm).push(entry);
  }
}

// ─── Result builder ───────────────────────────────────────────────────────────
function resolved(entry, method) {
  return {
    canonicalTag:   entry.tag,
    canonicalLabel: entry.label,
    category:       entry.cat,
    risk:           entry.risk,
    resolutionMethod: method,
    manualReview:   false,
    reviewReasons:  [],
  };
}

function review(...reasons) {
  return {
    canonicalTag:   null,
    canonicalLabel: null,
    category:       null,
    risk:           null,
    resolutionMethod: 'manual_review',
    manualReview:   true,
    reviewReasons:  reasons,
  };
}

function mergeReview(base, ...extraReasons) {
  return { ...base, manualReview: true, resolutionMethod: 'manual_review',
    canonicalTag: null, canonicalLabel: null, category: null, risk: null,
    reviewReasons: [...(base.reviewReasons||[]), ...extraReasons] };
}

// ─── Legacy migration helper ──────────────────────────────────────────────────
/**
 * migrateLegacySumpPump
 * Rewrites legacy SP/Sump Pump imports to SMP/Sump Pump.
 * Returns updated { rawTag, rawLabel } if migration applied, or null.
 */
export function migrateLegacySumpPump({ rawTag, rawLabel }) {
  const tagUp   = (rawTag||'').trim().toUpperCase();
  const labelLo = (rawLabel||'').toLowerCase().trim();
  const isSumpLabel = /sump\s*pump/i.test(rawLabel||'');
  if (tagUp === 'SP' && isSumpLabel) {
    return { rawTag: 'SMP', rawLabel: rawLabel, _migrated: true };
  }
  return null;
}

// ─── Main resolver ────────────────────────────────────────────────────────────
/**
 * resolveEquipment({ rawTag, rawLabel, ocrConfidence })
 * Returns a structured resolution result.
 */
export function resolveEquipment({ rawTag, rawLabel, ocrConfidence } = {}) {
  const reasons = [];

  // Step 0: OCR confidence gate
  if (ocrConfidence != null && ocrConfidence < OCR_CONFIDENCE_THRESHOLD) {
    reasons.push('low_ocr_confidence');
  }

  const tagStr   = (rawTag||'').trim();
  const labelStr = (rawLabel||'').trim();
  const tagUp    = tagStr.toUpperCase();

  // Step 0b: Apply legacy Sump Pump migration before resolution
  const migrated = migrateLegacySumpPump({ rawTag: tagStr, rawLabel: labelStr });
  const effectiveTag   = migrated ? migrated.rawTag   : tagStr;
  const effectiveLabel = migrated ? migrated.rawLabel : labelStr;

  // Step 1: Exact canonical tag match
  if (effectiveTag) {
    const entry = _byTag.get(effectiveTag.toUpperCase());
    if (entry) {
      // Tag matched — but check red-flag for extra validation
      let result = resolved(entry, 'exact_tag');
      if (migrated) result._migrated = true;
      if (reasons.length) return mergeReview(result, ...reasons);
      // Validate label agrees (if provided) — conflict check
      if (effectiveLabel && entry.label.toLowerCase() !== effectiveLabel.toLowerCase()) {
        // Check if label matches this same entry's aliases
        const labelMatches = entry.aliases.some(a => a.trim().toLowerCase() === effectiveLabel.toLowerCase())
          || normalizeAlias(entry.label) === normalizeAlias(effectiveLabel);
        if (!labelMatches) {
          return review('conflicting_tag_and_label', `Tag "${effectiveTag}" resolves to "${entry.label}" but label says "${effectiveLabel}"`);
        }
      }
      return result;
    }
    // Tag present but no match — red-flag check
    if (RED_FLAG_TAGS.has(tagUp)) {
      return review('tag_in_red_flag_tags', `Tag "${tagUp}" is red-flagged and has no exact canonical match`);
    }
  }

  // Step 2: Exact canonical label match
  if (effectiveLabel) {
    const entry = _byLabel.get(effectiveLabel.toLowerCase());
    if (entry) {
      if (reasons.length) return mergeReview(resolved(entry, 'exact_label'), ...reasons);
      return resolved(entry, 'exact_label');
    }
  }

  // Step 3: Exact alias match (original case, trimmed)
  if (effectiveLabel) {
    const hits = _byAlias.get(effectiveLabel.trim()) || [];
    if (hits.length === 1) {
      if (reasons.length) return mergeReview(resolved(hits[0], 'exact_alias'), ...reasons);
      return resolved(hits[0], 'exact_alias');
    }
    if (hits.length > 1) {
      return review('multiple_canonical_matches', `"${effectiveLabel}" matches ${hits.map(h=>h.label).join(', ')}`);
    }
  }

  // Step 4: Normalized alias match
  if (effectiveLabel) {
    const normLabel = normalizeAlias(effectiveLabel);
    const hits = _byNormAlias.get(normLabel) || [];
    const unique = [...new Map(hits.map(h=>[h.tag,h])).values()]; // dedupe by tag
    if (unique.length === 1) {
      if (reasons.length) return mergeReview(resolved(unique[0], 'normalized_alias'), ...reasons);
      return resolved(unique[0], 'normalized_alias');
    }
    if (unique.length > 1) {
      return review('multiple_canonical_matches', `Normalized "${normLabel}" matches ${unique.map(h=>h.label).join(', ')}`);
    }
  }

  // Step 5: Generic trigger words — force review without exact match
  const combined = (effectiveTag + ' ' + effectiveLabel).toLowerCase();
  if (GENERIC_PUMP_RE.test(combined)) {
    reasons.push('pump_or_fan_detected_without_exact_tag_or_alias');
    return review(...reasons, `"pump" detected in input but no exact tag/alias match`);
  }
  if (GENERIC_FAN_RE.test(combined)) {
    reasons.push('pump_or_fan_detected_without_exact_tag_or_alias');
    return review(...reasons, `"fan" detected in input but no exact tag/alias match`);
  }
  if (GENERIC_BOILER_RE.test(combined)) {
    reasons.push('boiler_detected_without_subtype');
    return review(...reasons, `"boiler" detected in input but no subtype match`);
  }

  // Step 5b: generic_label_only — single-word or empty
  const labelWords = effectiveLabel.trim().split(/\s+/).filter(Boolean);
  if (labelWords.length <= 1 && !effectiveTag) {
    reasons.push('generic_label_only');
  }

  // Unresolved
  return review(...reasons, `No canonical match for tag="${effectiveTag}" label="${effectiveLabel}"`);
}

// ─── Batch resolver ───────────────────────────────────────────────────────────
/**
 * resolveEquipmentBatch(rows) — resolve an array of raw rows
 * Each row: { rawTag, rawLabel, ocrConfidence, ...rest }
 * Returns array of { ...row, resolution }
 */
export function resolveEquipmentBatch(rows) {
  return rows.map(row => ({
    ...row,
    resolution: resolveEquipment({
      rawTag:        row.rawTag,
      rawLabel:      row.rawLabel,
      ocrConfidence: row.ocrConfidence,
    }),
  }));
}

// ─── Registry accessors ───────────────────────────────────────────────────────
export function getRegistryEntry(canonicalTag) {
  return _byTag.get(canonicalTag) || null;
}
export function getAllCanonicalTags() {
  return REGISTRY.map(e => e.tag);
}
export { REGISTRY as CANONICAL_REGISTRY };
