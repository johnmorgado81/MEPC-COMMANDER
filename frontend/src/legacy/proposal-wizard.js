// proposal-wizard.js — PM Quote MVP
// Steps: Building → Equipment → Price + Subcontractors → Generate
import { Proposals as DB, Buildings as BuildingsDB, Equipment as EquipmentDB } from './db.js';
import { CONFIG } from './config.js';
import { sellFromHours, stdHours, deriveVisitCount as _engineVisitCount, assetToScopeItem } from './pm-engine.js';
import { EQUIPMASTER, EQUIPMASTER_MANUFACTURERS, findEquipType, getStdHours, CATEGORIES } from './equipmaster.js';
import { resolveEquipment, migrateLegacySumpPump } from './equip-normalize.js';
import { getScopeText } from './scope-library.js';
import { generateProposalPDFEnhanced } from './pdf-export.js';
import { formatCurrency, today, addDays, pad } from './helpers.js';
import { notify, spinner, openModal, closeModal } from './ui.js';
import { navigate } from './router.js';

// ─── Subcontractor slot definitions ──────────────────────────────────────────
const SUB_SLOTS = [
  { key: 'hvac_sub',      label: 'HVAC Maintenance (Subcontractor)' },
  { key: 'pool_sub',      label: 'Pool Maintenance' },
  { key: 'fountain_sub',  label: 'Fountain Maintenance' },
  { key: 'ddc_sub',       label: 'DDC / Controls Contractor' },
  { key: 'chemical_sub',  label: 'Chemical Water Treatment' },
  { key: 'fire_sub',      label: 'Fire Suppression Maintenance' },
  { key: 'backflow_sub',  label: 'Backflow Preventer Testing' },
  { key: 'chiller_sub',   label: 'Chiller Contractor' },
  { key: 'boiler_sub',    label: 'Boiler Contractor' },
];

// ─── Wizard state ─────────────────────────────────────────────────────────────
const S = {
  step: 1,
  sources: { file: false, manual: false },
  equipFile: null,

  building: {
    building_id: null,
    name: '', strata_number: '',
    client_company: '', client_name: '', client_email: '', client_phone: '',
    concierge_name: '', concierge_phone: '', concierge_email: '', concierge_coffee: '',
    address: '', city: '', province: 'BC', postal_code: '',
    building_type: '', building_notes: '',
  },

  rawEquipment: [],
  normalized: [],
  frequency: 'quarterly',
  quarterVisits: { q1:true, q2:true, q3:true, q4:true, annual_clean:false },
  serviceAreaType: 'shared',

  // Subcontractor slots: key → { sub_cost, markup_pct }
  subSlots: {},

  title: '',
  notes: '',
  paymentTerms: 'Net 30',
  coverImageDataUrl: null,
  rfpScope: [],
  manualItems: [],
  buildingsList: [],
  _dirty: false,
};


// ─── Draft persistence ────────────────────────────────────────────────────────
const DRAFT_KEY = 'mepc_proposal_draft';
function _saveDraft() {
  try {
    const { buildingsList, coverImageDataUrl, ...save } = S;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(save));
  } catch {}
}
function _loadDraft() {
  try { const v = localStorage.getItem(DRAFT_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
function _clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

function resetState() {
  Object.assign(S, {
    step: 1,
    sources: { file: false, manual: false },
    equipFile: null,
    building: {
      building_id: null, name: '', strata_number: '',
      client_company: '', client_name: '', client_email: '', client_phone: '',
      concierge_name: '', concierge_phone: '', concierge_email: '', concierge_coffee: '',
      address: '', city: '', province: 'BC', postal_code: '',
      building_type: '', building_notes: '',
    },
    rawEquipment: [], normalized: [], frequency: 'quarterly',
    quarterVisits: { q1:true, q2:true, q3:true, q4:true, annual_clean:false },
    serviceAreaType: 'shared',
    subSlots: {}, title: '', notes: '', paymentTerms: 'Net 30',
    coverImageDataUrl: null, rfpScope: [], manualItems: [], _dirty: false,
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export const ProposalWizard = {
  async init(container) {
    // Restore draft from localStorage if present
    const draft = _loadDraft();
    if (draft && (draft.rawEquipment?.length || draft.building?.name)) {
      const useDraft = await new Promise(res => {
        const d = document.createElement('div');
        d.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:2000;display:flex;align-items:center;justify-content:center';
        d.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:28px 32px;max-width:400px;text-align:center">
          <div style="font-size:15px;font-weight:600;margin-bottom:8px">Unsaved Draft Found</div>
          <div style="font-size:13px;color:var(--text-dim);margin-bottom:20px">You have a proposal in progress for <strong>${draft.building?.name||'unnamed building'}</strong> (${draft.rawEquipment?.length||0} items). Continue or start fresh?</div>
          <div style="display:flex;gap:10px;justify-content:center">
            <button id="draft-fresh" class="btn btn-secondary">Start Fresh</button>
            <button id="draft-restore" class="btn btn-primary">Resume Draft</button>
          </div>
        </div>`;
        document.body.appendChild(d);
        d.querySelector('#draft-fresh').onclick   = () => { d.remove(); res(false); };
        d.querySelector('#draft-restore').onclick = () => { d.remove(); res(true); };
      });
      if (useDraft) {
        Object.assign(S, draft);
      } else {
        resetState();
        _clearDraft();
      }
    } else {
      resetState();
    }
    try { S.buildingsList = await BuildingsDB.getAll(); } catch { S.buildingsList = []; }
    this._container = container;
    this._render();
  },

  _render() {
    const c = this._container;
    c.innerHTML = `<div class="wiz-wrap">${_stepBar(S.step)}<div id="wiz-step-body"></div></div>`;
    const body = document.getElementById('wiz-step-body');
    const steps = [null, _step1, _step2, _step3, _step4];
    steps[S.step]?.(body, this);
  },

  goTo(n) { S.step = n; _saveDraft(); this._render(); },
  next()   { this.goTo(S.step + 1); },
  back()   { this.goTo(S.step - 1); },
};

// ─── Step bar ─────────────────────────────────────────────────────────────────
function _stepBar(current) {
  const steps = ['Building','Equipment','Pricing','Generate'];
  return `<div class="wiz-steps">
    ${steps.map((s,i) => `<div class="wiz-step-dot ${i+1===current?'active':i+1<current?'done':''}">
      <span class="wiz-dot-num">${i+1<current?'✓':i+1}</span>
      <span class="wiz-dot-label">${s}</span>
    </div>${i<steps.length-1?'<div class="wiz-step-line"></div>':''}`).join('')}
  </div>`;
}

// ─── Step 1 — Building / Customer ────────────────────────────────────────────
async function _step1(el, wiz) {
  el.innerHTML = `<div class="wiz-card">
    <h3>Building & Customer Info</h3>

    <div class="form-row mb-8">
      <div class="form-group full-width">
        <label>Link to Existing Building <span class="text-muted">(optional — loads saved data)</span></label>
        <select id="bld-link" class="input">
          <option value="">— New building / enter manually —</option>
          ${S.buildingsList.map(b => `<option value="${b.id}" ${S.building.building_id===b.id?'selected':''}>${b.name}${b.strata_number?' ('+b.strata_number+')':''}${b.client_company?' — '+b.client_company:''}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="bld-fields">${_bldFields()}</div>

    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s1-cancel">Cancel</button>
      <button class="btn btn-primary" id="s1-next">Next: Equipment →</button>
    </div>
  </div>`;

  document.getElementById('s1-cancel').onclick = async () => {
    if ((S.rawEquipment.length || S.building.name) && !await _confirmDiscard()) return;
    _clearDraft(); resetState(); navigate('/proposals');
  };
  document.getElementById('s1-next').onclick = () => { _saveBldFields(); wiz.next(); };

  document.getElementById('bld-link').onchange = async (e) => {
    const bid = e.target.value;
    if (bid) {
      const b = S.buildingsList.find(x => x.id === bid);
      if (b) {
        // Auto-use building photo as cover if not already set
        if (b.photo_url && !S.coverImageDataUrl) S.coverImageDataUrl = b.photo_url;
        S.building = {
          building_id: bid,
          name: b.name||'', strata_number: b.strata_number||'',
          client_company: b.client_company||'', client_name: b.client_name||'',
          client_email: b.client_email||'', client_phone: b.client_phone||'',
          concierge_name: b.concierge_name||'', concierge_phone: b.concierge_phone||'',
          concierge_email: b.concierge_email||'', concierge_coffee: b.concierge_coffee||'',
          address: b.address||'', city: b.city||'', province: b.province||'BC',
          postal_code: b.postal_code||'', building_type: b.building_type||'',
          building_notes: b.building_notes||b.notes||'',
        };
        document.getElementById('bld-fields').innerHTML = _bldFields();
      }
    } else {
      S.building.building_id = null;
    }
  };
}

function _bldFields() {
  const f = S.building;
  const inp = (key, label, type='text', placeholder='') => `
    <div class="form-group">
      <label>${label}</label>
      <input type="${type}" class="bld-input input" data-key="${key}" value="${f[key]||''}" placeholder="${placeholder}">
    </div>`;
  const sel = (key, label, opts) => `
    <div class="form-group">
      <label>${label}</label>
      <select class="bld-input input" data-key="${key}">
        <option value="">— Select —</option>
        ${opts.map(o => `<option value="${o}" ${f[key]===o?'selected':''}>${o}</option>`).join('')}
      </select>
    </div>`;
  const ta = (key, label, placeholder='') => `
    <div class="form-group full-width">
      <label>${label}</label>
      <textarea class="bld-input input" data-key="${key}" rows="2" placeholder="${placeholder}">${f[key]||''}</textarea>
    </div>`;

  return `
    <div class="form-section-label">Building</div>
    <div class="form-row">
      ${inp('name','Building Name *','text','e.g. The Regent')}
      ${inp('strata_number','Strata Plan #','text','e.g. BCS1234')}
    </div>
    <div class="form-row">
      ${sel('building_type','Building Type', CONFIG.BUILDING_TYPES)}
      ${inp('address','Street Address')}
    </div>
    <div class="form-row">
      ${inp('city','City','text','Vancouver')}
      ${inp('province','Province','text','BC')}
      ${inp('postal_code','Postal Code')}
    </div>

    <div class="form-section-label" style="margin-top:1rem">Management / Client</div>
    <div class="form-row">
      ${inp('client_company','Management Company','text','e.g. FirstService Residential')}
      ${inp('client_name','Primary Contact Name')}
    </div>
    <div class="form-row">
      ${inp('client_email','Primary Contact Email','email')}
      ${inp('client_phone','Primary Contact Phone','tel')}
    </div>

    <div class="form-section-label" style="margin-top:1rem">Concierge</div>
    <div class="form-row">
      ${inp('concierge_name','Concierge Name')}
      ${inp('concierge_phone','Concierge Phone','tel')}
    </div>
    <div class="form-row">
      ${inp('concierge_email','Concierge Email','email')}
      ${inp('concierge_coffee','Coffee Order','text','e.g. Large dark roast, black')}
    </div>

    <div class="form-section-label" style="margin-top:1rem">Notes</div>
    ${ta('building_notes','Building Notes / Access Info','Access codes, parking, site-specific notes…')}
  `;
}

function _saveBldFields() {
  document.querySelectorAll('.bld-input').forEach(inp => {
    S.building[inp.dataset.key] = inp.value;
  });
}

// ─── Step 2 — Equipment ───────────────────────────────────────────────────────
async function _step2(el, wiz) {
  const hasSavedBuilding = !!S.building.building_id;
  el.innerHTML = `<div class="wiz-card">
    <h3>Equipment List</h3>
    <p class="text-muted" style="margin-bottom:.75rem">Enter all equipment in scope. Type matches EQUIPMASTER for automatic time estimates.</p>
    ${hasSavedBuilding ? `<div class="alert" style="background:var(--bg3);border:1px solid var(--blue);border-radius:var(--radius);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:12px">
      <span style="font-size:12.5px">Building <strong>${S.building.name||''}</strong> has a saved equipment registry.</span>
      <button class="btn btn-sm btn-primary" id="load-registry-btn">📋 Load from Registry</button>
    </div>` : ''}
    <div id="equip-parse-status"></div>
    <div id="equip-table-wrap">${_renderRawEquipTable()}</div>
    <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
      <button class="btn btn-sm btn-secondary" id="add-equip-row">+ Add Row</button>
      <label class="btn btn-sm btn-secondary" style="cursor:pointer;margin:0">
        📄 Upload Equipment File
        <input type="file" id="equip-file-inp" accept=".pdf,.docx,.xlsx,.xls" style="display:none">
      </label>
      <button class="btn btn-sm btn-primary" id="parse-files-btn" style="display:none">⟳ Parse File</button>
      <button class="btn btn-sm btn-secondary" id="save-to-registry-btn" title="Save extracted rows to building registry before proposal generation">💾 Save to Registry</button>
      <span id="file-name-label" class="text-muted" style="font-size:12px"></span>
    </div>
    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s2-back">← Back</button>
      <button class="btn btn-primary" id="s2-next">Next: Pricing →</button>
    </div>
  </div>`;

  document.getElementById('s2-back').onclick = () => { _saveRawTable(); wiz.back(); };
  document.getElementById('s2-next').onclick = () => { _saveRawTable(); S.normalized = []; wiz.next(); };

  document.getElementById('load-registry-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('load-registry-btn');
    btn.disabled = true; btn.textContent = 'Loading…';
    try {
      const assets = await EquipmentDB.getByBuilding(S.building.building_id);
      if (!assets?.length) { document.getElementById('equip-parse-status').innerHTML = '<div class="badge badge-warn">No equipment found in registry for this building.</div>'; return; }
      _saveRawTable();
      let added = 0;
      // Prefer verified/proposal_ready rows; include all if none are verified
      const readyStatuses = new Set(['verified','proposal_ready','normalized','ok']);
      const verifiedSet = assets.filter(a => readyStatuses.has(a.ingestion_status) || (a.review_status !== 'needs-review'));
      const sourceSet   = verifiedSet.length ? verifiedSet : assets;
      for (const a of sourceSet) {
        const tag  = a.tag || '';
        const type = a.equipment_type || 'Other';
        const dup  = S.rawEquipment.find(e => e.tag === tag && e.type === type);
        if (!dup) {
          S.rawEquipment.push({
            type,
            raw_type:     a.equipment_type_raw || type,
            tag,
            manufacturer: a.manufacturer || a.make || '',
            model:        a.model || '',
            serial:       a.serial_number || '',
            qty:          parseInt(a.qty) || 1,
            location:     a.location || '',
            service_area: a.service_area || 'common_strata',
            category:     a.category || '',
            source:       'registry',
            equipment_id: a.id,
            ingestion_status: a.ingestion_status || 'normalized',
            _review:      a.review_status === 'needs-review',
          });
          added++;
        }
      }
      document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable();
      _bindRawTable();
      document.getElementById('equip-parse-status').innerHTML = `<div class="badge badge-success">Loaded ${added} equipment item${added!==1?'s':''} from registry.${assets.length-added>0?' '+( assets.length-added)+' already present.':''}</div>`;
    } catch(err) {
      document.getElementById('equip-parse-status').innerHTML = `<div class="badge badge-danger">Registry load failed: ${err.message}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📋 Load from Registry'; }
    }
  });

  document.getElementById('add-equip-row').onclick = () => {
    _saveRawTable();
    S.rawEquipment.push({ type:'', tag:'', manufacturer:'', model:'', qty:1, location:'', source:'manual' });
    document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable();
    _bindRawTable();
  };

  const fileInp = document.getElementById('equip-file-inp');
  fileInp.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    S.equipFile = f;
    document.getElementById('file-name-label').textContent = f.name;
    document.getElementById('parse-files-btn').style.display = '';
  };

  document.getElementById('parse-files-btn').onclick = async () => {
    const btn    = document.getElementById('parse-files-btn');
    const status = document.getElementById('equip-parse-status');
    if (!S.equipFile) { if (status) status.innerHTML = `<div class="badge badge-warn">No file selected.</div>`; return; }
    btn.disabled = true; btn.textContent = 'Parsing…';
    _saveRawTable();
    try {
      const raw = await _parseEquipFile(S.equipFile, status);
      const extracted = Array.isArray(raw) ? raw : [];
      const reviewNeeded = extracted.filter(e => e._review).length;
      for (const item of extracted) {
        const dup = S.rawEquipment.find(e =>
          e.type === item.type && e.tag === item.tag &&
          (item._review ? e._rowHint === item._rowHint : true)
        );
        if (!dup) {
          // Normalize type through aliases before adding — prevents type drift to Step 3
          // Apply legacy tag migration before pushing
          const migrated = migrateLegacySumpPump({ rawTag: item.tag, rawLabel: item.type });
          if (migrated) { item.tag = migrated.rawTag; item._migrated = true; }
          const resolved = _resolveType(item.type, item.tag);
          if (resolved && item.type && !item._review) {
            item.type_raw = item.type;
            item.type = resolved.equipment_type;
          }
          S.rawEquipment.push(item);
        }
      }
      document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable();
      _bindRawTable();
      if (status) {
        if (!extracted.length) {
          status.innerHTML = `<div class="badge badge-warn">No equipment found in file. Check that the file has equipment data and try again, or add rows manually.</div>`;
        } else {
          const reviewMsg = reviewNeeded ? ` &nbsp;⚠ ${reviewNeeded} need review (type missing).` : '';
          status.innerHTML = `<div class="badge badge-success">Extracted ${extracted.length} items.${reviewMsg}</div>`;
        }
      }
    } catch (err) {
      if (status) status.innerHTML = `<div class="badge badge-danger">Parse failed: ${err.message}</div>`;
    } finally { btn.disabled = false; btn.textContent = '⟳ Parse File'; }
  };

  _bindRawTable();

  // Save to Registry — persist extracted rows to DB before proposal
  document.getElementById('save-to-registry-btn').onclick = async () => {
    const bid = S.building.building_id;
    if (!bid) { notify && notify.warn && notify.warn('Select a building first to save to registry.'); return; }
    _saveRawTable();
    const rows = S.rawEquipment;
    if (!rows.length) { notify && notify.warn && notify.warn('No equipment to save.'); return; }
    const btn = document.getElementById('save-to-registry-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    let saved = 0;
    const batchId = Date.now().toString(36);
    try {
      for (const item of rows) {
        if (item.source === 'registry' && item.equipment_id) continue; // already in DB
        const mig = migrateLegacySumpPump({ rawTag: item.tag||'', rawLabel: item.type||'' });
        const eTag = mig ? mig.rawTag : (item.tag||null);
        const normRes = resolveEquipment({ rawTag: eTag||'', rawLabel: item.type||'' });
        const normType  = (!normRes.manualReview && normRes.canonicalLabel) ? normRes.canonicalLabel : (item.type||'Other');
        const needsRev  = normRes.manualReview || item._review;
        const { findEquipType } = await import('./equipmaster.js');
        const std = findEquipType(normType);
        await EquipmentDB.create({
          building_id:          bid,
          tag:                  eTag||null,
          equipment_type:       normType,
          equipment_type_raw:   item.raw_type || item.type || normType,
          manufacturer:         item.manufacturer || null,
          model:                item.model         || null,
          serial_number:        item.serial         || null,
          qty:                  parseInt(item.qty)||1,
          location:             item.location       || null,
          service_area:         item.service_area   || 'common_strata',
          notes:                item.notes          || null,
          source_type:          item.source         || 'import',
          source_file:          item.source_file    || null,
          ocr_raw:              item._rowHint       || null,
          match_confidence:     normRes.resolutionMethod === 'exact_tag' ? 'high'
                                : normRes.resolutionMethod === 'exact_label' ? 'high'
                                : normRes.resolutionMethod === 'exact_alias' ? 'medium'
                                : normRes.resolutionMethod === 'normalized_alias' ? 'medium' : 'low',
          review_status:        needsRev ? 'needs-review' : 'ok',
          ingestion_status:     needsRev ? 'needs_review' : 'normalized',
          quarterly_hours:      std?.quarterly_hours || null,
          annual_hours:         std?.annual_hours    || null,
          import_batch:         batchId,
          status:               'active',
        });
        saved++;
      }
      const status = document.getElementById('equip-parse-status');
      if (status) status.innerHTML = `<div class="badge badge-success">✓ Saved ${saved} row${saved!==1?'s':''} to equipment registry.</div>`;
      // Reload from registry to get DB IDs and refresh source flags
      const loaded = await EquipmentDB.getByBuilding(bid);
      S.rawEquipment = (loaded||[]).map(a => ({
        type: a.equipment_type, raw_type: a.equipment_type_raw||a.equipment_type,
        tag: a.tag||'', manufacturer: a.manufacturer||a.make||'', model: a.model||'',
        qty: parseInt(a.qty)||1, location: a.location||'', service_area: a.service_area||'common_strata',
        category: a.category||'', source: 'registry', equipment_id: a.id, _review: a.review_status==='needs-review',
      }));
      document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable();
      _bindRawTable();
    } catch(err) {
      const status = document.getElementById('equip-parse-status');
      if (status) status.innerHTML = `<div class="badge badge-danger">Save failed: ${err.message}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = '💾 Save to Registry';
    }
  };
}

function _renderRawEquipTable() {
  if (!S.rawEquipment.length) return `<p class="text-muted" style="margin:.5rem 0">No equipment yet. Add rows manually or upload a file.</p>`;
  const reviewCount = S.rawEquipment.filter(e => e._review).length;
  const reviewBanner = reviewCount
    ? `<div class="badge badge-warn" style="margin-bottom:.5rem;display:inline-block">⚠ ${reviewCount} row${reviewCount>1?'s':''} need review — type is missing or uncertain. Set the Equipment Type before proceeding.</div>`
    : '';
  return `${reviewBanner}<div class="table-scroll"><table class="table" id="raw-equip-table">
    <thead><tr>
      <th>Equipment Type</th><th>Tag</th><th>Category</th><th>Make</th><th>Model</th>
      <th style="width:60px">Qty</th><th>Location</th><th style="width:32px"></th>
    </tr></thead>
    <tbody>${S.rawEquipment.map((e,i) => {
      const cats = (CATEGORIES||[]);
      const catOpts = cats.map(c => `<option value="${c}" ${e.category===c?'selected':''}>${c}</option>`).join('');
      return `<tr style="${e._review ? 'background:#fffbeb;' : ''}">
      <td>
        ${e._review && e._rowHint ? `<div style="font-size:10px;color:#92400e;margin-bottom:2px" title="${(e._rowHint||'').replace(/"/g,'&quot;')}">⚠ ${(e._rowHint||'').slice(0,50)}</div>` : ''}
        <input class="raw-inp input" data-i="${i}" data-f="type" value="${(e.type||'').replace(/"/g,'&quot;')}" placeholder="Select or type equipment type" list="wiz-type-dl" autocomplete="off" style="${e._review&&!e.type?'border-color:#f59e0b;':''}">
      </td>
      <td><input class="raw-inp input" data-i="${i}" data-f="tag" value="${(e.tag||'').replace(/"/g,'&quot;')}" placeholder="B-1" style="width:70px"></td>
      <td>
        <select class="raw-inp input" data-i="${i}" data-f="category" style="font-size:12px;width:110px">
          <option value="">— Category —</option>
          ${catOpts}
        </select>
      </td>
      <td><input class="raw-inp input" data-i="${i}" data-f="manufacturer" value="${(e.manufacturer||'').replace(/"/g,'&quot;')}" style="width:90px" list="wiz-mfr-dl" autocomplete="off"></td>
      <td><input class="raw-inp input" data-i="${i}" data-f="model" value="${(e.model||'').replace(/"/g,'&quot;')}" style="width:90px"></td>
      <td><input class="raw-inp input" type="number" data-i="${i}" data-f="qty" value="${e.qty||1}" min="1" style="width:52px"></td>
      <td><input class="raw-inp input" data-i="${i}" data-f="location" value="${(e.location||'').replace(/"/g,'&quot;')}"></td>
      <td><button class="btn btn-xs btn-danger raw-del" data-i="${i}">✕</button></td>
    </tr>`;}).join('')}</tbody>
  </table></div>
  <datalist id="wiz-type-dl">${(EQUIPMASTER||[]).map(e => `<option value="${e.equipment_type}">`).join('')}</datalist>
  <datalist id="wiz-mfr-dl">${(EQUIPMASTER_MANUFACTURERS||[]).slice(0,200).map(m => `<option value="${m}">`).join('')}</datalist>`;
}

function _bindRawTable() {
  document.querySelectorAll('.raw-del').forEach(btn => {
    btn.onclick = () => {
      _saveRawTable();
      S.rawEquipment.splice(Number(btn.dataset.i), 1);
      document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable();
      _bindRawTable();
    };
  });
  // Auto-fill category when type is chosen from datalist
  document.querySelectorAll('.raw-inp[data-f="type"]').forEach(inp => {
    inp.addEventListener('change', () => {
      const i = Number(inp.dataset.i);
      const match = findEquipType(inp.value);
      if (match && S.rawEquipment[i] && !S.rawEquipment[i].category) {
        S.rawEquipment[i].type     = inp.value;
        S.rawEquipment[i].category = match.category || '';
        S.rawEquipment[i]._review  = false;
        // Update the category select in the same row without full re-render
        const row = inp.closest('tr');
        const catSel = row?.querySelector('select[data-f="category"]');
        if (catSel) catSel.value = match.category || '';
      }
    });
  });
}

function _saveRawTable() {
  document.querySelectorAll('.raw-inp').forEach(inp => {
    const i = Number(inp.dataset.i), f = inp.dataset.f;
    if (!S.rawEquipment[i]) return;
    S.rawEquipment[i][f] = f === 'qty' ? Number(inp.value)||1 : inp.value;
    // Clear review flag once the user has set a type
    if (f === 'type' && inp.value.trim()) S.rawEquipment[i]._review = false;
  });
}

// ─── File parsers (xlsx + docx + pdf) ────────────────────────────────────────
async function _parseEquipFile(file, statusEl) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return _parseXLSX(file);
  if (ext === 'docx') return _parseDOCX(file);
  if (ext === 'pdf')  return _parsePDF(file, statusEl);
  throw new Error(`Unsupported file type: .${ext}`);
}

// ─── Flexible column detection for XLSX ──────────────────────────────────────
// Normalises a header string: lowercase, strip punctuation/spaces
function _normHeader(h) { return String(h||'').toLowerCase().replace(/[^a-z0-9]/g,''); }

// Score a normalised header against a concept's known aliases
const COL_ALIASES = {
  // raw_equipment_type — raw contractor list headers first
  type:         ['equipmenttype','item','type','equipment','description','desc','equip','equiptype',
                 'unittype','assettype','name','itemdescription','service','servicedescription'],
  // tag — "UNIT TAG" / "TAG NO" style headers
  tag:          ['unittag','tagno','tagnumber','tag','unitno','unitid','equipid','assetid','equiptag','label','id'],
  manufacturer: ['manufacturer','brand','make','mfr','mfg','vendor','maker','supplier'],
  model:        ['model','modelnumber','modelno','series','partnumber'],
  serial:       ['serial','serialnumber','serialno','sn'],
  qty:          ['qty','quantity','count','units','num','amount'],
  location:     ['location','level','floor','room','zone','space','site','position','where','loc','area'],
  notes:        ['notes','note','comments','comment','remark','remarks','filtersize','filters','belts','attributes'],
  service_area: ['servicearea','service area','area type','areatype'],
  // raw hours from spec sheets
  std_hours:    ['time','stdtime','standardhours','stdhours','hours','hrs'],
};

function _detectColumns(headers) {
  const norm = headers.map(h => _normHeader(h));
  const map = {};
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    // Exact alias match first
    let idx = norm.findIndex(n => aliases.includes(n));
    // Partial match fallback
    if (idx === -1) idx = norm.findIndex(n => aliases.some(a => n.includes(a) || a.includes(n)));
    if (idx !== -1 && !(idx in Object.values(map))) map[field] = headers[idx];
  }
  return map;
}

function _xlsxCellVal(row, key) {
  if (!key) return '';
  // Try exact key, then case-insensitive scan
  if (row[key] !== undefined) return String(row[key]);
  const kl = key.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === kl) return String(row[k]);
  }
  return '';
}

// Detect the real header row — skip preamble rows that lack a type/tag column.
// Returns { rows, headerRowIdx } where rows is sheet_to_json output from the header row.
function _detectHeaderRow(ws) {
  const sheetRows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
  // Score each row: header rows tend to have short, keyword-matching cells
  const scoreRow = (cells) => {
    const normed = cells.map(c => _normHeader(String(c||'')));
    let score = 0;
    for (const aliases of Object.values(COL_ALIASES)) {
      if (normed.some(n => aliases.includes(n))) score++;
    }
    return score;
  };
  let bestIdx = 0, bestScore = 0;
  // Only scan first 20 rows for header
  for (let i = 0; i < Math.min(20, sheetRows.length); i++) {
    const s = scoreRow(sheetRows[i]);
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  }
  if (bestScore === 0) return null; // no recognizable header
  // Re-parse from the detected header row
  const dataRows = XLSX.utils.sheet_to_json(ws, { defval: '', range: bestIdx });
  return { rows: dataRows, headerRowIdx: bestIdx };
}

async function _parseXLSX(file) {
  if (!window.XLSX) throw new Error('SheetJS not loaded');
  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, { type: 'array' });

  // Pick best sheet: most data rows with a detected header
  let bestRows = [], bestSheet = '';
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const detected = _detectHeaderRow(ws);
    if (detected && detected.rows.length > bestRows.length) {
      bestRows = detected.rows; bestSheet = sheetName;
    }
  }
  // Fallback: plain json from largest sheet
  if (!bestRows.length) {
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const r  = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (r.length > bestRows.length) bestRows = r;
    }
  }
  if (!bestRows.length) return [];

  const headers = Object.keys(bestRows[0]);
  const colMap  = _detectColumns(headers);

  return bestRows
    .map((r, rowIdx) => {
      const type    = colMap.type         ? _xlsxCellVal(r, colMap.type).trim()         : '';
      const tag     = colMap.tag          ? _xlsxCellVal(r, colMap.tag).trim()          : '';
      const mfr     = colMap.manufacturer ? _xlsxCellVal(r, colMap.manufacturer).trim() : '';
      const model   = colMap.model        ? _xlsxCellVal(r, colMap.model).trim()        : '';
      const serial  = colMap.serial       ? _xlsxCellVal(r, colMap.serial).trim()       : '';
      const loc     = colMap.location     ? _xlsxCellVal(r, colMap.location).trim()     : '';
      const notes   = colMap.notes        ? _xlsxCellVal(r, colMap.notes).trim()        : '';
      const svcArea = colMap.service_area ? _xlsxCellVal(r, colMap.service_area).trim() : '';
      const qtyRaw  = colMap.qty          ? _xlsxCellVal(r, colMap.qty)                 : '1';
      const qty     = Math.max(1, parseInt(qtyRaw, 10) || 1);

      const allVals = [type, tag, mfr, model, loc].join('').trim();
      if (!allVals) return null;

      const needsReview = !type;
      const typeVal = type || [tag, mfr, model, loc].find(v => v.length > 2) || '';

      return {
        type: typeVal,
        raw_type: typeVal,          // preserve raw label
        tag, manufacturer: mfr, model, serial, qty, location: loc,
        notes: notes || undefined,
        service_area: svcArea || undefined,
        source: 'xlsx',
        source_file: file.name,
        _review: needsReview || false,
        _rowHint: needsReview ? `Row ${rowIdx + 2}: ${allVals.slice(0,60)}` : '',
      };
    })
    .filter(Boolean);
}

async function _parseDOCX(file) {
  if (!window.mammoth) throw new Error('Mammoth not loaded');
  const buf    = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return _extractEquipFromText(result.value, 'docx');
}

async function _parsePDF(file, statusEl) {
  if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let allText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    allText += content.items.map(i => i.str).join(' ') + '\n';
    if (statusEl) statusEl.innerHTML = `<span class="text-muted">Reading page ${p}/${pdf.numPages}…</span>`;
  }
  return _extractEquipFromText(allText, 'pdf');
}

const EQUIP_VOCAB_RE = (() => {
  const types = (EQUIPMASTER||[]).map(e => e.equipment_type)
    .sort((a,b) => b.length - a.length)
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  return types.length ? new RegExp('(' + types.join('|') + ')', 'gi') : /(?!)/g;
})();
const TAG_RE = /\b([A-Z]{1,5}-?\d{1,3}[A-Z]?)\b/g;

// Common mechanical keywords used for partial-match fallback
const MECH_KEYWORDS = /\b(boiler|chiller|pump|fan|unit|coil|ahu|rtu|fcu|vfd|bas|ddc|heater|tank|valve|compressor|condenser|tower|exchanger|ventilat|exhaust|makeup|make-up|hydronic|backflow|preventer|fireplace|generator|snowmelt|pool|irrigation|separator|strainer|controller|thermostat|actuator|damper)\b/i;

function _extractEquipFromText(text, source) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [], seen = new Set();
  for (const line of lines) {
    let matched = false;
    // Pass 1: EQUIPMASTER vocabulary match (high confidence)
    for (const m of line.matchAll(EQUIP_VOCAB_RE)) {
      matched = true;
      const type = m[1];
      const tags = [...line.matchAll(TAG_RE)].map(t => t[1]).filter(t => !/^(AND|THE|FOR|WITH|FROM|UNIT|EACH|TYPE|NOTE|SEE|REF)$/.test(t));
      if (tags.length > 0) {
        tags.forEach(tag => {
          const key = type.toLowerCase() + ':' + tag;
          if (seen.has(key)) return;
          seen.add(key);
          items.push({ type, tag, manufacturer:'', model:'', qty:1, location:'', source, _review:false });
        });
      } else {
        const key = 'untagged:' + type.toLowerCase();
        const existing = items.find(i => i.type.toLowerCase()===type.toLowerCase() && !i.tag);
        if (existing) { existing.qty++; }
        else if (!seen.has(key)) { seen.add(key); items.push({ type, tag:'', manufacturer:'', model:'', qty:1, location:'', source, _review:false }); }
      }
    }
    // Pass 2: mechanical keyword fallback — surface for review even if not in EQUIPMASTER
    if (!matched && MECH_KEYWORDS.test(line) && line.length < 200) {
      const tags = [...line.matchAll(TAG_RE)].map(t => t[1]).filter(t => !/^(AND|THE|FOR|WITH|FROM|UNIT|EACH|TYPE|NOTE|SEE|REF)$/.test(t));
      const key = 'partial:' + line.slice(0,40).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          type: '',
          tag: tags[0] || '',
          manufacturer: '', model: '', qty: 1, location: '',
          source, _review: true,
          _rowHint: line.slice(0, 80),
        });
      }
    }
  }
  return items.slice(0, 200);
}

// ─── Step 3 — Pricing (equipment + subcontractors) ────────────────────────────
async function _step3(el, wiz) {
  if (!S.normalized.length && S.rawEquipment.length) {
    S.normalized = S.rawEquipment.map(item => _normalizeItem(item));
  }

  el.innerHTML = `<div class="wiz-card">
    <h3>Pricing</h3>

    <div style="margin-bottom:1rem;display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
      <div>
        <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:8px">Service Visits</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${['q1','q2','q3','q4'].map(q => `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;font-weight:500">
            <input type="checkbox" class="wiz-q-chk" id="wiz-${q}" data-q="${q}" ${S.quarterVisits[q]?'checked':''}> ${q.toUpperCase()}
          </label>`).join('')}
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;font-weight:500;margin-left:8px;padding-left:8px;border-left:1px solid var(--border)">
            <input type="checkbox" class="wiz-q-chk" id="wiz-annual-clean" data-q="annual_clean" ${S.quarterVisits.annual_clean?'checked':''}> Ann. Cleaning
          </label>
        </div>
        <div id="wiz-visit-summary" style="font-size:11.5px;color:var(--text-dim);margin-top:5px"></div>
      </div>
      <div>
        <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:8px">Service Area Type</div>
        <select id="wiz-area-type" class="input input-sm" style="min-width:220px">
          <option value="shared"       ${S.serviceAreaType==='shared'?'selected':''}>Shared Residential/Commercial</option>
          <option value="commercial"   ${S.serviceAreaType==='commercial'?'selected':''}>Commercial Common Areas</option>
          <option value="residential"  ${S.serviceAreaType==='residential'?'selected':''}>Residential Common Areas</option>
          <option value="mixed"        ${S.serviceAreaType==='mixed'?'selected':''}>Mixed (separate breakdowns)</option>
        </select>
      </div>
      <div style="padding-top:1.5rem">
        <button class="btn btn-sm btn-secondary" id="recalc-btn">↻ Recalculate</button>
      </div>
    </div>

    <div class="form-section-label">Equipment — Labour-Based PM Pricing</div>
    <div id="norm-table-wrap">${_renderNormTable()}</div>

    <div class="form-section-label" style="margin-top:1.5rem">Additional / Manual Line Items</div>
    <p class="text-muted" style="font-size:12px;margin-bottom:.75rem">Custom items, allowances, or additional scope. Toggle client-facing or internal-only.</p>
    <div id="manual-items-wrap">${_renderManualItems()}</div>
    <button class="btn btn-sm btn-secondary" id="add-manual-btn" style="margin-bottom:1rem">+ Add Line Item</button>

    <div class="form-section-label" style="margin-top:1.5rem">Subcontractor / Third-Party Maintenance</div>
    <p class="text-muted" style="font-size:12px;margin-bottom:.75rem">
      Enter your subcontractor cost and markup. The marked-up sell price rolls into the proposal total.
      Subcontractor costs are internal only and do not appear on the client-facing PDF.
    </p>
    <div id="sub-slots-wrap">${_renderSubSlots()}</div>

    <div id="pricing-totals" style="margin-top:1.5rem">${_renderPricingTotals()}</div>

    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s3-back">← Back</button>
      <button class="btn btn-primary" id="s3-next">Next: Generate →</button>
    </div>
  </div>`;

  document.getElementById('s3-back').onclick = () => { _saveNormTable(); _saveSubSlots(); wiz.back(); };
  document.getElementById('s3-next').onclick = () => { _saveNormTable(); _saveSubSlots(); wiz.next(); };

  // Frequency now driven by Q1-Q4 checkboxes above

  // Update visit summary on load
  _updateVisitSummary();

  // Q checkboxes
  document.querySelectorAll('.wiz-q-chk').forEach(chk => {
    chk.onchange = () => {
      S.quarterVisits[chk.dataset.q] = chk.checked;
      S.frequency = _deriveFrequency();
      _updateVisitSummary();
      _saveNormTable();
      S.normalized.forEach(n => { n.frequency = S.frequency; n.annual_price = _calcPrice(n); });
      document.getElementById('norm-table-wrap').innerHTML = _renderNormTable();
      _bindNormTable();
      _refreshTotals();
    };
  });

  document.getElementById('wiz-area-type').onchange = e => { S.serviceAreaType = e.target.value; };

  document.getElementById('recalc-btn').onclick = () => {
    _saveNormTable();
    S.normalized.forEach(n => { n.annual_price = _calcPrice(n); });
    document.getElementById('norm-table-wrap').innerHTML = _renderNormTable();
    _bindNormTable();
    _refreshTotals();
  };

  document.getElementById('add-manual-btn').onclick = () => {
    _saveNormTable();
    if (!S.manualItems) S.manualItems = [];
    S.manualItems.push({ description: '', qty: 1, value: 0, notes: '', include: true, client_facing: true });
    document.getElementById('manual-items-wrap').innerHTML = _renderManualItems();
    _bindManualItems();
    _refreshTotals();
  };

  _bindNormTable();
  _bindSubSlots();
  _bindManualItems();
}

// ─── Equipment pricing table ──────────────────────────────────────────────────
// Explicit type aliases for common OCR/import variations that elude EQUIPMASTER lookup
const WIZ_TYPE_ALIASES = {
  'Hot Water Boiler':       ['hwb','hw boiler','heating boiler','gas boiler','fire tube','low pressure boiler','cast iron boiler','boiler','htg boiler'],
  'Condensing Boiler':      ['condensing boiler','mod con','modcon','condensing gas boiler','high eff boiler','condensing hwb'],
  'Steam Boiler':           ['steam boiler','high pressure boiler','lp steam'],
  'Circulator Pump':        ['circ pump','circulator','circulat','circ.','circulators'],
  'Heating Water Pump':     ['hwp','hhwp','heating pump','hw pump','hx pump','primary pump','secondary pump','system pump','heating water pump','boiler pump'],
  'Condenser Water Pump':   ['cwp','cond pump','condenser pump','cond water pump'],
  'Chilled Water Pump':     ['chwp','chw pump','chilled pump','chilled water pump'],
  'DHW Recirculation Pump': ['dhwp','dhw pump','hw recirc','recirc pump','hot water recirculation','dhw recirc'],
  'Domestic Booster Pump':  ['domestic booster','db pump','pressure booster','boost pump'],
  'Heat Pump':              ['hp unit','geothermal pump','water source heat pump','wshp'],
  'Air Handling Unit':    ['ahu','air handler','air handling','doas unit'],
  'Rooftop Unit':         ['rtu','packaged rooftop','rooftop'],
  'Fan Coil Unit':        ['fcu','fan coil'],
  'Make-Up Air Unit':     ['mau','makeup air','make up air','make-up air'],
  'Chiller':              ['ch-','chiller unit','water chiller','air cooled chiller','centrifugal chiller'],
  'Cooling Tower':        ['ct-','cooling tower','evaporative cooler'],
  'Plate Heat Exchanger': ['phe','heat exchanger','b&g','plate exchanger','hx'],
  'Exhaust Fan':          ['ef-','exhaust fan','ex fan'],
  'Variable Frequency Drive': ['vfd','variable speed','vsd'],
  'Backflow Preventer':   ['bfp','backflow','rp device'],
  'Domestic Water Heater': ['dhw heater','water heater','hwt','hot water tank'],
  'Expansion Tank':       ['exp tank','expansion vessel','bladder tank'],
};

function _resolveType(rawType, rawTag) {
  if (!rawType && !rawTag) return null;
  // Use canonical normalization layer (deterministic, no fuzzy matching)
  const result = resolveEquipment({ rawTag: rawTag||'', rawLabel: rawType||'' });
  if (!result.manualReview && result.canonicalLabel) {
    return findEquipType(result.canonicalLabel) || null;
  }
  // Fallback to direct EQUIPMASTER lookup for manual-review cases
  return findEquipType(rawType) || null;
}

function _normalizeItem(raw) {
  const match = _resolveType(raw.type, raw.tag);
  let conf = 'unknown', qtrHrs = 1.0, annHrs = 4.0, category = raw.category || 'Other', equipmaster = null;
  // Also run through normalize layer for review flags
  const _normResult = resolveEquipment({ rawTag: raw.tag||'', rawLabel: raw.type||'' });
  if (_normResult.manualReview) raw._review = true;
  if (match) {
    equipmaster = match.equipment_type;
    category    = raw.category || match.category || 'Other';
    qtrHrs      = match.quarterly_hours || 1.0;
    annHrs      = match.annual_hours    || 4.0;
    conf = match.equipment_type.toLowerCase() === (raw.type||'').toLowerCase() ? 'exact' : 'strong';
  } else {
    // Score-ranked partial — avoid single short words like "unit" silently matching "Condensing Unit"
    const words = (raw.type||'').toLowerCase().split(/[\s\-_\/]+/).filter(w => w.length > 4);
    let bestMatch = null, bestScore = 0;
    if (words.length) {
      (EQUIPMASTER||[]).forEach(e => {
        const et = e.equipment_type.toLowerCase();
        let score = 0;
        words.forEach(w => {
          if (et === w) score += 10;
          else if (et.startsWith(w + ' ') || et.endsWith(' ' + w)) score += 6;
          else if (et.includes(' ' + w + ' ')) score += 6;
          else if (et.includes(w) && w.length > 5) score += 2;
        });
        if (score > bestScore) { bestScore = score; bestMatch = e; }
      });
    }
    if (bestMatch && bestScore >= 6) {
      equipmaster = bestMatch.equipment_type;
      category    = raw.category || bestMatch.category || 'Other';
      qtrHrs = bestMatch.quarterly_hours||1; annHrs = bestMatch.annual_hours||4; conf = 'review';
    }
  }
  const annCleanHrs = match ? (match.annual_hours || 0) : (qtrHrs * 2);
  const n = { ...raw, equipmaster, conf, category, qtrHrs, annHrs, annCleanHrs, frequency: S.frequency,
    manufacturer: raw.manufacturer || '', model: raw.model || '',
    type_raw: raw.type || '',  // preserve original parsed text
    // Per-row visit controls — default from global S.quarterVisits
    itemQV: { ...S.quarterVisits } };
  n.annual_price = _calcPrice(n);
  return n;
}

function _calcPrice(n) {
  const qty      = Number(n.qty) || 1;
  const qh       = Number(n.qtrHrs) || 0;
  // Per-item annual cleaning: only include if item's own flag is set
  const qv       = n.itemQV || S.quarterVisits;
  const visits   = [qv.q1,qv.q2,qv.q3,qv.q4].filter(Boolean).length || 4;
  const cleanHrs = qv.annual_clean ? (Number(n.annCleanHrs) || 0) : 0;
  const totalHrs = (qh * visits * qty) + (cleanHrs * qty);
  return sellFromHours(totalHrs);
}

// ─── Quarter visit helpers ─────────────────────────────────────────────────────
function _deriveFrequency() {
  const v = S.quarterVisits;
  const count = [v.q1,v.q2,v.q3,v.q4].filter(Boolean).length;
  if (count === 4) return 'quarterly';
  if (count === 2) return 'semi-annual';
  if (count === 1) return 'annual';
  if (count === 3) return 'quarterly'; // 3-quarter = near-quarterly
  return 'quarterly';
}

function _deriveVisitCount() { return _engineVisitCount(S.quarterVisits); }
function _updateVisitSummary() {
  const el = document.getElementById('wiz-visit-summary');
  if (!el) return;
  const count = _deriveVisitCount();
  const labels = ['Q1','Q2','Q3','Q4'].filter((_,i) => S.quarterVisits[['q1','q2','q3','q4'][i]]);
  const clean = S.quarterVisits.annual_clean ? ' + Annual Cleaning' : '';
  el.textContent = `${count} visit${count!==1?'s':''}/yr (${labels.join(', ')})${clean}`;
}

function _renderNormTable() {
  if (!S.normalized.length) return `<p class="text-muted">No equipment. Go back and add items.</p>`;
  const confBadge = c => ({ exact:'<span class="badge badge-success">Exact</span>', strong:'<span class="badge badge-primary">Strong</span>', review:'<span class="badge badge-warn">Review</span>', unknown:'<span class="badge badge-muted">Unknown</span>' }[c]||'');
  return `<div class="table-scroll">
    <table class="table" id="norm-table">
      <thead><tr>
        <th>Type / Make</th><th>Matched As</th><th>Conf</th><th>Qty</th>
        <th title="Quarterly hours per visit">Qtr Hrs</th>
        <th title="Annual cleaning hours (from EQUIPMASTER — added once/year)">Ann.Clean Hrs</th>
        <th>Annual Price</th><th></th>
      </tr></thead>
      <tbody>${S.normalized.map((n,i) => {
        const stdMatch = findEquipType(n.equipmaster||n.type);
        const stdClean = stdMatch ? (stdMatch.annual_hours||0) : 0;
        const isCleanOvr = Number(n.annCleanHrs) !== stdClean;
        return `<tr class="${n.conf==='unknown'?'row-review':''}">
        <td style="font-size:12px">
          <div>${n.type}${n.tag?' <span class="text-muted">('+n.tag+')</span>':''}</div>
          ${n.manufacturer||n.model ? `<div style="font-size:11px;color:var(--text-dim)">${[n.manufacturer,n.model].filter(Boolean).join(' ')}</div>` : ''}
          <div style="display:flex;gap:4px;margin-top:3px">
            <input class="norm-make input input-sm" data-i="${i}" placeholder="Make" value="${n.manufacturer||''}" style="width:80px;font-size:11px">
            <input class="norm-model input input-sm" data-i="${i}" placeholder="Model" value="${n.model||''}" style="width:80px;font-size:11px">
          </div>
        </td>
        <td><input class="norm-match-inp input" data-i="${i}" style="font-size:12px;width:160px" list="wiz-norm-dl" autocomplete="off" value="${n.equipmaster||''}" placeholder="${n.conf==='unknown'?'⚠ Select type':n.equipmaster||''}"></td>
        <td>${confBadge(n.conf)}</td>
        <td><input class="norm-inp input" type="number" data-i="${i}" data-f="qty" value="${n.qty||1}" min="1" style="width:50px"></td>
        <td>
          <input class="norm-inp input" type="number" step="0.25" data-i="${i}" data-f="qtrHrs" value="${n.qtrHrs||''}" style="width:55px" title="Std: ${stdMatch?.quarterly_hours||'?'} hrs/visit">
        </td>
        <td>
          <input class="norm-inp input" type="number" step="0.25" data-i="${i}" data-f="annCleanHrs" value="${n.annCleanHrs!=null?n.annCleanHrs:stdClean}" style="width:62px;${isCleanOvr?'border-color:var(--orange);':''}" title="Std from EQUIPMASTER: ${stdClean} hrs/yr — toggles annual cleaning visit">
          ${stdClean ? `<div style="font-size:10px;color:var(--text-muted)">std:${stdClean}</div>` : ''}
        </td>
        <td><input class="norm-price input" type="number" step="1" data-i="${i}" value="${(n.annual_price||0).toFixed(0)}" style="width:80px"></td>
        <td>
          <button class="btn btn-xs btn-ghost norm-reset" data-i="${i}" title="Reset to EQUIPMASTER standard">↺</button>
          <button class="btn btn-xs btn-danger norm-del" data-i="${i}">✕</button>
        </td>
      </tr>
      <tr data-qv="${i}" style="background:var(--bg3);border-bottom:1px solid var(--border2)">
        <td colspan="2" style="padding:4px 12px 6px;font-size:11px;color:var(--text-muted)">Visits:</td>
        <td colspan="6" style="padding:4px 8px 6px">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${['q1','q2','q3','q4'].map(q => `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11.5px">
              <input type="checkbox" class="item-qv-chk" data-i="${i}" data-q="${q}" ${(n.itemQV||S.quarterVisits)[q]?'checked':''}>
              <span>${q.toUpperCase()}</span></label>`).join('')}
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:11.5px;margin-left:8px;padding-left:8px;border-left:1px solid var(--border2)">
              <input type="checkbox" class="item-qv-chk" data-i="${i}" data-q="annual_clean" ${(n.itemQV||S.quarterVisits).annual_clean?'checked':''}>
              <span style="color:var(--orange)">Ann. Cleaning (${stdClean||'?'} hrs)</span></label>
            <span style="font-size:10.5px;color:var(--text-muted);margin-left:6px">${
              (() => { const v=n.itemQV||S.quarterVisits; const c=[v.q1,v.q2,v.q3,v.q4].filter(Boolean).length; return c+' visit'+(c!==1?'s':'')+'/yr'+(v.annual_clean?'+Clean':''); })()
            }</span>
          </div>
        </td>
      </tr>`;}).join('')}</tbody>
    </table>
    <datalist id="wiz-norm-dl">${(EQUIPMASTER||[]).map(e => `<option value="${e.equipment_type}">${e.equipment_type} (${e.category})</option>`).join('')}</datalist>
  </div>`;
}

function _bindNormTable() {
  const rerender = () => {
    _saveNormTable();
    document.getElementById('norm-table-wrap').innerHTML = _renderNormTable();
    _bindNormTable();
    _refreshTotals();
  };

  document.querySelectorAll('.norm-del').forEach(btn => {
    btn.onclick = () => { _saveNormTable(); S.normalized.splice(Number(btn.dataset.i), 1); rerender(); };
  });

  // Reset row to EQUIPMASTER standard
  document.querySelectorAll('.norm-reset').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.i); _saveNormTable();
      const match = findEquipType(S.normalized[i].equipmaster || S.normalized[i].type);
      if (match) {
        S.normalized[i].qtrHrs          = match.quarterly_hours || 1;
        S.normalized[i].qtrHrsStd       = match.quarterly_hours || 1;
        S.normalized[i].annCleanHrs     = match.annual_hours    || 0;
        S.normalized[i].annCleanHrsStd  = match.annual_hours    || 0;
        S.normalized[i].annHrs          = match.annual_hours    || 4;
        S.normalized[i]._qhOverride     = false;
        S.normalized[i]._achOverride    = false;
        S.normalized[i].annual_price    = _calcPrice(S.normalized[i]);
      }
      rerender();
    };
  });

  // Type change: re-match and update hours + scope
  document.querySelectorAll('.norm-match-inp').forEach(inp => {
    inp.addEventListener('change', () => {
      const i = Number(inp.dataset.i); _saveNormTable();
      const match = findEquipType(inp.value);
      if (match) {
        const isQHOvr  = S.normalized[i]._qhOverride;
        const isACHOvr = S.normalized[i]._achOverride;
        Object.assign(S.normalized[i], {
          equipmaster:     match.equipment_type,
          category:        match.category || '',
          qtrHrs:          isQHOvr  ? S.normalized[i].qtrHrs     : (match.quarterly_hours || 1),
          qtrHrsStd:       match.quarterly_hours || 1,
          annHrs:          match.annual_hours    || 4,
          annCleanHrs:     isACHOvr ? S.normalized[i].annCleanHrs : (match.annual_hours || 0),
          annCleanHrsStd:  match.annual_hours || 0,
          conf:            'strong',
          scope_lines:     getScopeText(match.equipment_type, S.frequency || 'quarterly') || [],
        });
        S.normalized[i].annual_price = _calcPrice(S.normalized[i]);
      }
      rerender();
    });
  });

  // Live recalc on hours/qty change
  document.querySelectorAll('.norm-inp').forEach(inp => {
    inp.oninput = () => {
      const i = Number(inp.dataset.i); const f = inp.dataset.f;
      if (!S.normalized[i]) return;
      S.normalized[i][f] = ['qty','qtrHrs','annHrs','annCleanHrs'].includes(f) ? Number(inp.value)||0 : inp.value;
      if (f === 'qtrHrs')      S.normalized[i]._qhOverride  = true;
      if (f === 'annCleanHrs') S.normalized[i]._achOverride = true;
      // Recalculate price immediately
      if (['qty','qtrHrs','annHrs','annCleanHrs'].includes(f)) {
        S.normalized[i].annual_price = _calcPrice(S.normalized[i]);
        // Update price input in same row without full rerender
        const priceInp = document.querySelector(`.norm-price[data-i="${i}"]`);
        if (priceInp) priceInp.value = S.normalized[i].annual_price.toFixed(0);
        _refreshTotals();
      }
    };
  });

  // Make/model fields
  document.querySelectorAll('.norm-make').forEach(inp => {
    inp.oninput = () => { const i = Number(inp.dataset.i); if (S.normalized[i]) S.normalized[i].manufacturer = inp.value; };
  });
  document.querySelectorAll('.norm-model').forEach(inp => {
    inp.oninput = () => { const i = Number(inp.dataset.i); if (S.normalized[i]) S.normalized[i].model = inp.value; };
  });

  document.querySelectorAll('.norm-price').forEach(inp => {
    inp.oninput = () => { S.normalized[Number(inp.dataset.i)].annual_price = Number(inp.value)||0; _refreshTotals(); };
  });

  // Per-row visit checkboxes
  document.querySelectorAll('.item-qv-chk').forEach(chk => {
    chk.onchange = () => {
      const i = Number(chk.dataset.i);
      if (!S.normalized[i]) return;
      if (!S.normalized[i].itemQV) S.normalized[i].itemQV = { ...S.quarterVisits };
      S.normalized[i].itemQV[chk.dataset.q] = chk.checked;
      // Recalc this row immediately
      S.normalized[i].annual_price = _calcPrice(S.normalized[i]);
      const priceInp = document.querySelector(`.norm-price[data-i="${i}"]`);
      if (priceInp) priceInp.value = S.normalized[i].annual_price.toFixed(0);
      // Update visit summary label in same QV row
      const v = S.normalized[i].itemQV;
      const cnt = [v.q1,v.q2,v.q3,v.q4].filter(Boolean).length;
      const sumEl = document.querySelector(`tr[data-qv="${i}"] span:last-child`);
      if (sumEl) sumEl.textContent = cnt+' visit'+(cnt!==1?'s':'')+'/yr'+(v.annual_clean?'+Clean':'');
      _refreshTotals();
    };
  });
}

function _saveNormTable() {
  document.querySelectorAll('.norm-inp').forEach(inp => {
    const i = Number(inp.dataset.i), f = inp.dataset.f;
    if (S.normalized[i]) S.normalized[i][f] = ['qty','qtrHrs','annHrs','annCleanHrs'].includes(f) ? Number(inp.value)||0 : inp.value;
  });
  document.querySelectorAll('.norm-price').forEach(inp => {
    if (S.normalized[Number(inp.dataset.i)]) S.normalized[Number(inp.dataset.i)].annual_price = Number(inp.value)||0;
  });
  document.querySelectorAll('.norm-make').forEach(inp => {
    if (S.normalized[Number(inp.dataset.i)]) S.normalized[Number(inp.dataset.i)].manufacturer = inp.value;
  });
  document.querySelectorAll('.norm-model').forEach(inp => {
    if (S.normalized[Number(inp.dataset.i)]) S.normalized[Number(inp.dataset.i)].model = inp.value;
  });
  // Persist per-row itemQV from checkboxes
  document.querySelectorAll('.item-qv-chk').forEach(chk => {
    const i = Number(chk.dataset.i);
    if (!S.normalized[i]) return;
    if (!S.normalized[i].itemQV) S.normalized[i].itemQV = { ...S.quarterVisits };
    S.normalized[i].itemQV[chk.dataset.q] = chk.checked;
  });
}


// ─── Manual line items ────────────────────────────────────────────────────────
function _renderManualItems() {
  if (!S.manualItems?.length) return `<p class="text-muted" style="font-size:12px">No additional line items.</p>`;
  return `<div class="table-scroll"><table class="table"><thead><tr>
    <th>Description</th><th style="width:50px">Qty</th><th style="width:80px">Value/yr</th>
    <th>Notes</th><th style="width:80px">Include</th><th style="width:90px">Client-Facing</th><th style="width:32px"></th>
  </tr></thead><tbody>
    ${S.manualItems.map((m,i) => `<tr>
      <td><input class="mi-inp input input-sm" data-mi="${i}" data-mf="description" value="${m.description||''}" placeholder="e.g. Nitrogen, Consumables allowance"></td>
      <td><input class="mi-inp input input-sm" data-mi="${i}" data-mf="qty" type="number" min="1" value="${m.qty||1}" style="width:48px"></td>
      <td><input class="mi-inp input input-sm" data-mi="${i}" data-mf="value" type="number" min="0" step="10" value="${m.value||0}" style="width:76px"></td>
      <td><input class="mi-inp input input-sm" data-mi="${i}" data-mf="notes" value="${m.notes||''}" placeholder="Internal notes"></td>
      <td style="text-align:center"><input type="checkbox" class="mi-chk" data-mi="${i}" data-mf="include" ${m.include!==false?'checked':''}></td>
      <td style="text-align:center"><input type="checkbox" class="mi-chk" data-mi="${i}" data-mf="client_facing" ${m.client_facing?'checked':''}></td>
      <td><button class="btn btn-xs btn-danger mi-del" data-mi="${i}">✕</button></td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function _bindManualItems() {
  document.querySelectorAll('.mi-del').forEach(btn => {
    btn.onclick = () => {
      S.manualItems.splice(Number(btn.dataset.mi), 1);
      document.getElementById('manual-items-wrap').innerHTML = _renderManualItems();
      _bindManualItems(); _refreshTotals();
    };
  });
  document.querySelectorAll('.mi-inp').forEach(inp => {
    inp.oninput = () => {
      const i = Number(inp.dataset.mi), f = inp.dataset.mf;
      if (!S.manualItems[i]) return;
      S.manualItems[i][f] = f === 'qty' || f === 'value' ? Number(inp.value)||0 : inp.value;
      if (f === 'value' || f === 'qty') _refreshTotals();
    };
  });
  document.querySelectorAll('.mi-chk').forEach(chk => {
    chk.onchange = () => {
      const i = Number(chk.dataset.mi), f = chk.dataset.mf;
      if (S.manualItems[i]) { S.manualItems[i][f] = chk.checked; if (f === 'include') _refreshTotals(); }
    };
  });
}

function _manualTotal() {
  return (S.manualItems||[]).filter(m => m.include !== false).reduce((s,m) => s + (Number(m.value)||0) * (Number(m.qty)||1), 0);
}

// ─── Subcontractor slots ──────────────────────────────────────────────────────
const DEFAULT_MARKUP = 15; // %

function _renderSubSlots() {
  return `<table class="table" id="sub-table">
    <thead><tr>
      <th>Service</th>
      <th style="width:120px">Sub Cost / yr</th>
      <th style="width:90px">Markup %</th>
      <th style="width:110px">Sell Price / yr</th>
    </tr></thead>
    <tbody>${SUB_SLOTS.map(slot => {
      const saved = S.subSlots[slot.key] || {};
      const cost    = saved.sub_cost   || '';
      const markup  = saved.markup_pct != null ? saved.markup_pct : DEFAULT_MARKUP;
      const sell    = cost ? +(Number(cost) * (1 + markup/100)).toFixed(2) : 0;
      return `<tr>
        <td style="font-size:13px">${slot.label}</td>
        <td><input class="sub-inp input" type="number" min="0" step="10" data-key="${slot.key}" data-f="sub_cost" value="${cost}" placeholder="0.00"></td>
        <td><input class="sub-inp input" type="number" min="0" step="1" data-key="${slot.key}" data-f="markup_pct" value="${markup}" style="width:70px"></td>
        <td class="sub-sell" data-key="${slot.key}" style="font-weight:600;padding-top:.5rem">${sell > 0 ? formatCurrency(sell) : '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function _bindSubSlots() {
  document.querySelectorAll('.sub-inp').forEach(inp => {
    inp.oninput = () => {
      _saveSubSlots();
      // Update sell price cell live
      const key    = inp.dataset.key;
      const saved  = S.subSlots[key] || {};
      const cost   = Number(saved.sub_cost || 0);
      const markup = Number(saved.markup_pct != null ? saved.markup_pct : DEFAULT_MARKUP);
      const sell   = cost > 0 ? +(cost * (1 + markup/100)).toFixed(2) : 0;
      const cell   = document.querySelector(`.sub-sell[data-key="${key}"]`);
      if (cell) cell.textContent = sell > 0 ? formatCurrency(sell) : '—';
      _refreshTotals();
    };
  });
}

function _saveSubSlots() {
  document.querySelectorAll('.sub-inp').forEach(inp => {
    const key = inp.dataset.key, f = inp.dataset.f;
    if (!S.subSlots[key]) S.subSlots[key] = {};
    S.subSlots[key][f] = Number(inp.value) || 0;
  });
}

function _subTotal() {
  return SUB_SLOTS.reduce((sum, slot) => {
    const s = S.subSlots[slot.key];
    if (!s || !s.sub_cost) return sum;
    const markup = s.markup_pct != null ? s.markup_pct : DEFAULT_MARKUP;
    return sum + +(Number(s.sub_cost) * (1 + markup/100)).toFixed(2);
  }, 0);
}

function _equipTotal() {
  return S.normalized.reduce((s,n) => s + Number(n.annual_price||0), 0) + _manualTotal();
}

function _renderPricingTotals() {
  const equip = _equipTotal();
  const sub   = _subTotal();
  const total = equip + sub;
  const tax   = total * CONFIG.TAX_RATE;
  const freqObj = CONFIG.FREQUENCIES.find(f => f.value === S.frequency) || { visits: 4 };
  return `<div class="totals-grid" style="max-width:380px;border:1px solid var(--border);border-radius:6px;padding:.75rem">
    <div class="totals-row"><span>Equipment PM (Labour)</span><strong>${formatCurrency(equip)}</strong></div>
    <div class="totals-row"><span>Subcontracted Services</span><strong>${formatCurrency(sub)}</strong></div>
    <div class="totals-row totals-row-bold"><span>Subtotal (Annual)</span><strong>${formatCurrency(total)}</strong></div>
    <div class="totals-row"><span>GST (5%)</span><strong>${formatCurrency(tax)}</strong></div>
    <div class="totals-row totals-row-bold"><span>Total Annual (incl. GST)</span><strong>${formatCurrency(total + tax)}</strong></div>
    <div class="totals-row"><span>Monthly Billing (incl. GST)</span><strong>${formatCurrency((total + tax)/12)}</strong></div>
    <div class="totals-row"><span>Per Visit (${freqObj.visits} visits/yr)</span><strong>${formatCurrency(freqObj.visits > 0 ? total/freqObj.visits : 0)}</strong></div>
  </div>`;
}

function _refreshTotals() {
  const el = document.getElementById('pricing-totals');
  if (el) el.innerHTML = _renderPricingTotals();
}

// ─── Step 4 — Review & Generate ───────────────────────────────────────────────
async function _step4(el, wiz) {
  const equip = _equipTotal();
  const sub   = _subTotal();
  const total = equip + sub;
  const tax   = total * CONFIG.TAX_RATE;
  const freqObj = CONFIG.FREQUENCIES.find(f => f.value === S.frequency) || { visits: 4 };

  el.innerHTML = `<div class="wiz-card">
    <h3>Review & Generate Proposal</h3>

    <div class="review-summary">
      <div class="review-block">
        <h4>Building</h4>
        <p><strong>${S.building.name || '<em>Not set</em>'}</strong></p>
        ${S.building.strata_number ? `<p class="text-muted">Strata Plan ${S.building.strata_number}</p>` : ''}
        <p class="text-muted">${S.building.client_company || S.building.client_name || ''}</p>
        <p class="text-muted">${[S.building.address, S.building.city].filter(Boolean).join(', ')}</p>
      </div>
      <div class="review-block">
        <h4>Scope</h4>
        <p>${S.normalized.length} equipment item${S.normalized.length !== 1 ? 's' : ''}</p>
        <p class="text-muted">${freqObj.label||S.frequency} — ${freqObj.visits} visit${freqObj.visits !== 1 ? 's' : ''}/yr</p>
        ${S.normalized.filter(n=>n.conf==='unknown').length ? `<p class="text-warn">⚠ ${S.normalized.filter(n=>n.conf==='unknown').length} unmatched items</p>` : ''}
        ${_subTotal() > 0 ? `<p class="text-muted">${SUB_SLOTS.filter(s => S.subSlots[s.key]?.sub_cost > 0).length} subcontracted service${SUB_SLOTS.filter(s => S.subSlots[s.key]?.sub_cost > 0).length !== 1 ? 's' : ''}</p>` : ''}
      </div>
      <div class="review-block">
        <h4>Pricing</h4>
        <p class="price-big">${formatCurrency(total)}<span class="text-muted">/yr</span></p>
        <p class="text-muted">${formatCurrency((total+tax)/12)}/mo incl. GST</p>
      </div>
    </div>

    <div class="form-row" style="margin-top:1rem">
      <div class="form-group">
        <label>Proposal Title</label>
        <input id="wiz-title" class="input" placeholder="e.g. Quarterly PM Agreement 2025" value="${S.title || (_buildDefaultTitle())}">
      </div>
      <div class="form-group">
        <label>Payment Terms</label>
        <input id="wiz-terms" class="input" value="${S.paymentTerms}">
      </div>
    </div>
    <div class="form-group">
      <label>Notes / Special Conditions</label>
      <textarea id="wiz-notes" class="input" rows="3">${S.notes}</textarea>
    </div>
    <div class="form-group">
      <label>Cover Image <span class="text-muted">(optional)</span></label>
      <div class="cover-img-zone" id="cover-img-zone">
        ${S.coverImageDataUrl ? `<img src="${S.coverImageDataUrl}" style="max-height:120px;border-radius:4px">` : '<span class="dz-hint">Drop image or click to select</span>'}
        <input type="file" id="cover-img-input" accept="image/*" style="display:none">
      </div>
      ${S.coverImageDataUrl ? `<button class="btn btn-xs btn-secondary" id="clear-cover" style="margin-top:.25rem">✕ Remove</button>` : ''}
    </div>

    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s4-back">← Back</button>
      <button class="btn btn-secondary" id="s4-draft">💾 Save Draft</button>
      <button class="btn btn-primary" id="s4-save">✓ Save & Export PDF</button>
    </div>
  </div>`;

  document.getElementById('s4-back').onclick  = () => { _saveMeta(); wiz.back(); };
  document.getElementById('s4-draft').onclick = () => { _saveMeta(); _saveProposal(false); };
  document.getElementById('s4-save').onclick  = () => { _saveMeta(); _saveProposal(true); };

  const imgZone  = document.getElementById('cover-img-zone');
  const imgInput = document.getElementById('cover-img-input');
  imgZone.onclick = () => imgInput.click();
  imgInput.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { S.coverImageDataUrl = ev.target.result; _step4(el, wiz); };
    reader.readAsDataURL(f);
  };
  imgZone.ondragover = e => { e.preventDefault(); imgZone.classList.add('drag-active'); };
  imgZone.ondragleave = () => imgZone.classList.remove('drag-active');
  imgZone.ondrop = e => {
    e.preventDefault(); imgZone.classList.remove('drag-active');
    const f = e.dataTransfer.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { S.coverImageDataUrl = ev.target.result; _step4(el, wiz); };
    reader.readAsDataURL(f);
  };
  document.getElementById('clear-cover')?.addEventListener('click', e => {
    e.stopPropagation(); S.coverImageDataUrl = null; _step4(el, wiz);
  });
}


function _confirmDiscard() {
  return new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:2000;display:flex;align-items:center;justify-content:center';
    d.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:24px 28px;max-width:360px;text-align:center">
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">Discard draft?</div>
      <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:16px">Your unsaved proposal data will be lost.</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button id="dc-cancel" class="btn btn-secondary">Keep editing</button>
        <button id="dc-ok" class="btn btn-danger">Discard</button>
      </div>
    </div>`;
    document.body.appendChild(d);
    d.querySelector('#dc-cancel').onclick = () => { d.remove(); res(false); };
    d.querySelector('#dc-ok').onclick     = () => { d.remove(); res(true); };
  });
}

function _buildDefaultTitle() {
  const freqObj = CONFIG.FREQUENCIES.find(f => f.value === S.frequency);
  const freq = freqObj ? freqObj.label : S.frequency;
  const year = new Date().getFullYear();
  return `${freq} PM Agreement ${year}${S.building.name ? ' — ' + S.building.name : ''}`;
}

function _saveMeta() {
  S.title        = document.getElementById('wiz-title')?.value  || S.title;
  S.notes        = document.getElementById('wiz-notes')?.value  || S.notes;
  S.paymentTerms = document.getElementById('wiz-terms')?.value  || S.paymentTerms;
}

// ─── Save proposal ────────────────────────────────────────────────────────────
async function _saveProposal(exportPdf) {
  const equipAnnual = _equipTotal();
  const subAnnual   = _subTotal();
  const annual      = equipAnnual + subAnnual;
  const freqObj     = CONFIG.FREQUENCIES.find(f => f.value === S.frequency) || { visits: 4, label: S.frequency };
  const num         = 'P-' + String(Date.now()).slice(-5);
  if (!S.building.name) S.building.name = 'Draft — ' + today();

  // Build subcontractor_items (internal record — never shown on client PDF)
  const subcontractorItems = SUB_SLOTS
    .filter(slot => S.subSlots[slot.key]?.sub_cost > 0)
    .map(slot => {
      const s = S.subSlots[slot.key];
      const markup = s.markup_pct != null ? s.markup_pct : DEFAULT_MARKUP;
      const sell   = +(Number(s.sub_cost) * (1 + markup/100)).toFixed(2);
      return { key: slot.key, label: slot.label, sub_cost: Number(s.sub_cost), markup_pct: markup, sell_price: sell };
    });

  // Equipment-based scope items for PDF
  const scopeItems = S.normalized.map(n => ({
    equipment_id:   null,
    tag:            n.tag || '',
    equipment_type: n.equipmaster || n.type || 'Equipment',
    frequency:      n.frequency || S.frequency,
    annual_price:   Number(n.annual_price) || 0,
    qty:            Number(n.qty) || 1,
    item_qv:        n.itemQV || S.quarterVisits,
    category:       n.category || 'Other',
    confidence:     n.conf,
    manufacturer:   n.manufacturer || '',
    model:          n.model        || '',
    make:           n.manufacturer || '',
    qtrHrs:         Number(n.qtrHrs)      || 0,
    annCleanHrs:    Number(n.annCleanHrs) || 0,
    service_area:   n.service_area || 'common_strata',
    scope_lines: (() => {
      const lines = getScopeText(n.equipmaster || n.type, n.frequency || S.frequency);
      if (lines && lines.length) return lines;
      return [
        `Inspect ${n.equipmaster || n.type || 'equipment'} for proper operation and condition`,
        'Check all connections, fasteners, and mounting hardware',
        'Clean accessible components and note any deficiencies',
        'Record equipment readings and report concerns to property manager',
      ];
    })(),
  }));

  // Subcontracted services as scope items (sell price only — no cost/markup)
  const subScopeItems = subcontractorItems.map(s => ({
    equipment_id:   null,
    tag:            '',
    equipment_type: s.label,
    frequency:      S.frequency,
    annual_price:   s.sell_price,
    qty:            1,
    category:       'Subcontracted Services',
    confidence:     'manual',
    scope_lines:    [`${s.label} — included in contract scope at quoted schedule`],
  }));

  const rec = {
    proposal_number:     num,
    title:               S.title || _buildDefaultTitle(),
    status:              'draft',
    created_date:        today(),
    valid_until:         addDays(today(), CONFIG.PROPOSAL_VALID_DAYS),
    frequency:           S.frequency,
    quarter_visits:      S.quarterVisits,
    service_area_type:   S.serviceAreaType,
    visits_per_year:     freqObj.visits,
    annual_value:        annual,
    monthly_value:       annual / 12,
    payment_terms:       S.paymentTerms || 'Net 30',
    scope_items:         [...scopeItems, ...subScopeItems],
    manual_items:        (S.manualItems||[]).filter(m=>m.include!==false),
    notes:               S.notes,
    subcontractor_items: subcontractorItems,   // internal — not shown on PDF
    cover_image_url:     null,
    raw_intake:          { building: S.building, rawEquipment: S.rawEquipment, frequency: S.frequency },
    is_draft:            !exportPdf,
  };

  // Upsert building record
  if (S.building.building_id) {
    rec.building_id = S.building.building_id;
    // Update building with any edited concierge/contact fields
    try {
      await BuildingsDB.update(S.building.building_id, {
        strata_number: S.building.strata_number,
        concierge_name: S.building.concierge_name, concierge_phone: S.building.concierge_phone,
        concierge_email: S.building.concierge_email, concierge_coffee: S.building.concierge_coffee,
        client_name: S.building.client_name, client_company: S.building.client_company,
        client_email: S.building.client_email, client_phone: S.building.client_phone,
        building_notes: S.building.building_notes,
      });
    } catch (e) { console.warn('Building update failed:', e.message); }
  } else if (S.building.name) {
    try {
      const saved = await BuildingsDB.create({
        name: S.building.name, strata_number: S.building.strata_number,
        building_type: S.building.building_type,
        client_name: S.building.client_name, client_company: S.building.client_company,
        client_email: S.building.client_email, client_phone: S.building.client_phone,
        concierge_name: S.building.concierge_name, concierge_phone: S.building.concierge_phone,
        concierge_email: S.building.concierge_email, concierge_coffee: S.building.concierge_coffee,
        address: S.building.address, city: S.building.city,
        province: S.building.province, postal_code: S.building.postal_code,
        building_notes: S.building.building_notes, status: 'active',
      });
      rec.building_id = saved.id;
    } catch (e) { console.warn('Building create failed:', e.message); }
  }

  let saved;
  try {
    saved = await DB.create(rec);
    notify.success(`Proposal ${num} saved.`);
  } catch (e) {
    // Retry without v1.2+ columns if schema not yet migrated
    try {
      const { subcontractor_items, raw_intake, cover_image_url, is_draft, ...recBasic } = rec;
      saved = await DB.create(recBasic);
      notify.success(`Proposal ${num} saved (run schema-pm-mvp-migration.sql to unlock all fields).`);
    } catch (e2) {
      notify.error('Save failed: ' + e2.message);
      return;
    }
  }

  if (exportPdf && saved) {
    try {
      const building = S.building.building_id
        ? (S.buildingsList.find(b => b.id === S.building.building_id) || S.building)
        : S.building;
      generateProposalPDFEnhanced(saved, building, S.coverImageDataUrl);
    } catch (e) {
      notify.warn('PDF export failed: ' + e.message + '. Proposal was saved.');
    }
  }

  _clearDraft();
  navigate(`/proposals/${saved.id}`);
}
