// proposal-wizard.js — PM Proposal Intake Wizard
// 5-step: Sources → Building → Equipment → Normalize+Price → Review+Generate
// Draft-first: saves even with incomplete data. Never blocks on imperfect OCR.

import { Proposals as DB, Buildings as BuildingsDB, Equipment as EquipDB } from './db.js';
import { CONFIG, calcPMSellPrice } from './config.js';
import { EQUIPMASTER, findEquipType, getStdHours, CATEGORIES } from './equipmaster.js';
import { getScopeText } from './scope-library.js';
import { generateProposalPDFEnhanced } from './pdf-export.js';
import { formatCurrency, today, addDays, pad } from './helpers.js';
import { notify, spinner, openModal, closeModal } from './ui.js';
import { navigate } from './router.js';

// ─── Wizard state ─────────────────────────────────────────────────────────────
const S = {
  step: 1,
  sources: { screenshot: false, file: false, drawing: false, manual: false },
  screenshotFile: null,
  equipFile: null,
  drawingFile: null,

  // Building/customer (step 2)
  building: {
    name: '', client_name: '', client_company: '', address: '', city: '',
    province: 'BC', postal_code: '', client_email: '', client_phone: '',
    building_id: null, // set if linked to existing building
  },
  buildingConfidence: {}, // field → 'high'|'medium'|'low'

  // Raw extracted equipment (step 3)
  rawEquipment: [], // [{ type, tag, manufacturer, model, qty, location, source }]

  // Normalized (step 4)
  normalized: [], // [{ ...raw, equipmaster, confidence, category, qtrHrs, annHrs, qty, annual_price, frequency }]
  frequency: 'quarterly',

  // Proposal meta (step 5)
  title: '',
  notes: '',
  paymentTerms: 'Net 30',
  coverImageDataUrl: null,
  isDraft: true,

  // Existing buildings list (populated on init)
  buildingsList: [],
};

function resetState() {
  Object.assign(S, {
    step: 1, sources: { screenshot: false, file: false, drawing: false, manual: false },
    screenshotFile: null, equipFile: null, drawingFile: null,
    building: { name:'', client_name:'', client_company:'', address:'', city:'',
      province:'BC', postal_code:'', client_email:'', client_phone:'', building_id: null },
    buildingConfidence: {}, rawEquipment: [], normalized: [],
    frequency: 'quarterly', title: '', notes: '', paymentTerms: 'Net 30',
    coverImageDataUrl: null, isDraft: true,
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export const ProposalWizard = {
  async init(container) {
    resetState();
    try { S.buildingsList = await BuildingsDB.getAll(); } catch { S.buildingsList = []; }
    this._container = container;
    this._render();
  },

  _render() {
    const c = this._container;
    c.innerHTML = `
      <div class="wiz-wrap">
        ${_stepBar(S.step)}
        <div id="wiz-step-body"></div>
      </div>`;
    const body = document.getElementById('wiz-step-body');
    const steps = [null, _step1, _step2, _step3, _step4, _step5];
    steps[S.step]?.(body, this);
  },

  goTo(n) { S.step = n; this._render(); },
  next()   { this.goTo(S.step + 1); },
  back()   { this.goTo(S.step - 1); },
};

// ─── Step bar ─────────────────────────────────────────────────────────────────
function _stepBar(current) {
  const steps = ['Sources','Building','Equipment','Price','Generate'];
  return `<div class="wiz-steps">
    ${steps.map((s,i) => `<div class="wiz-step-dot ${i+1===current?'active':i+1<current?'done':''}">
      <span class="wiz-dot-num">${i+1<current?'✓':i+1}</span><span class="wiz-dot-label">${s}</span>
    </div>${i<steps.length-1?'<div class="wiz-step-line"></div>':''}`).join('')}
  </div>`;
}

// ─── Step 1 — Sources ─────────────────────────────────────────────────────────
function _step1(el, wiz) {
  el.innerHTML = `
    <div class="wiz-card">
      <h3>What are you starting from?</h3>
      <p class="text-muted" style="margin-bottom:1rem">Select all that apply. You can also skip straight to manual entry.</p>
      <div class="source-grid">
        <label class="source-opt ${S.sources.screenshot?'active':''}" id="src-screenshot">
          <input type="checkbox" ${S.sources.screenshot?'checked':''} data-src="screenshot">
          <span class="src-icon">📷</span><span class="src-label">Screenshot</span>
          <span class="src-sub">OCR customer/building info from a Service Fusion or Jobber screen</span>
        </label>
        <label class="source-opt ${S.sources.file?'active':''}" id="src-file">
          <input type="checkbox" ${S.sources.file?'checked':''} data-src="file">
          <span class="src-icon">📄</span><span class="src-label">Equipment File</span>
          <span class="src-sub">Upload .pdf, .docx, or .xlsx equipment list</span>
        </label>
        <label class="source-opt ${S.sources.drawing?'active':''}" id="src-drawing">
          <input type="checkbox" ${S.sources.drawing?'checked':''} data-src="drawing">
          <span class="src-icon">📐</span><span class="src-label">Mechanical Drawing</span>
          <span class="src-sub">Extract equipment from a PDF mechanical drawing</span>
        </label>
        <label class="source-opt ${S.sources.manual?'active':''}" id="src-manual">
          <input type="checkbox" ${S.sources.manual?'checked':''} data-src="manual">
          <span class="src-icon">✏️</span><span class="src-label">Manual Entry</span>
          <span class="src-sub">Enter equipment and building info by hand</span>
        </label>
      </div>

      <div id="source-uploads" style="margin-top:1.25rem"></div>

      <div class="wiz-actions">
        <button class="btn btn-secondary" onclick="navigate('/proposals')">Cancel</button>
        <button class="btn btn-primary" id="s1-next">Next: Building Info →</button>
      </div>
    </div>`;

  el.querySelectorAll('[data-src]').forEach(chk => {
    chk.addEventListener('change', () => {
      S.sources[chk.dataset.src] = chk.checked;
      chk.closest('.source-opt').classList.toggle('active', chk.checked);
      _renderUploadZones(document.getElementById('source-uploads'));
    });
  });
  _renderUploadZones(document.getElementById('source-uploads'));
  document.getElementById('s1-next').onclick = () => wiz.next();
}

function _renderUploadZones(el) {
  let html = '';
  if (S.sources.screenshot) html += _dropZone('screenshot', 'Screenshot image', 'image/*', S.screenshotFile?.name);
  if (S.sources.file)       html += _dropZone('equip-file',  'Equipment file (.pdf, .docx, .xlsx)', '.pdf,.docx,.xlsx', S.equipFile?.name);
  if (S.sources.drawing)    html += _dropZone('drawing-file','Mechanical drawing (.pdf)', '.pdf', S.drawingFile?.name);
  el.innerHTML = html;

  _wireDropZone(el, 'screenshot',   f => { S.screenshotFile = f; _renderUploadZones(el); });
  _wireDropZone(el, 'equip-file',   f => { S.equipFile = f;       _renderUploadZones(el); });
  _wireDropZone(el, 'drawing-file', f => { S.drawingFile = f;     _renderUploadZones(el); });
}

function _dropZone(id, label, accept, filename) {
  return `<div class="drop-zone-sm" id="dz-${id}">
    <strong>${label}</strong>
    ${filename ? `<span class="dz-file">✓ ${filename}</span>` : '<span class="dz-hint">Drop file here or click to select</span>'}
    <input type="file" id="fi-${id}" accept="${accept}" style="display:none">
  </div>`;
}

function _wireDropZone(parent, id, onFile) {
  const dz = parent.querySelector(`#dz-${id}`);
  const fi = parent.querySelector(`#fi-${id}`);
  if (!dz || !fi) return;
  dz.onclick = () => fi.click();
  fi.onchange = e => { if (e.target.files[0]) onFile(e.target.files[0]); };
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag-active'); };
  dz.ondragleave = () => dz.classList.remove('drag-active');
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove('drag-active'); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); };
}

// ─── Step 2 — Building / Customer ─────────────────────────────────────────────
async function _step2(el, wiz) {
  el.innerHTML = `<div class="wiz-card">
    <h3>Building & Customer Info</h3>
    ${S.screenshotFile ? `<div class="ocr-status" id="ocr-status"><span class="spinner-inline"></span> Running OCR on screenshot…</div>` : ''}
    <div class="form-row mb-8">
      <div class="form-group">
        <label>Link to Existing Building <span class="text-muted">(optional)</span></label>
        <select id="bld-link">
          <option value="">— Create new / enter manually —</option>
          ${S.buildingsList.map(b => `<option value="${b.id}" ${S.building.building_id===b.id?'selected':''}>${b.name}${b.client_name?' — '+b.client_name:''}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="bld-fields">
      ${_bldFields()}
    </div>
    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s2-back">← Back</button>
      <button class="btn btn-primary" id="s2-next">Next: Equipment →</button>
    </div>
  </div>`;

  document.getElementById('s2-back').onclick = () => wiz.back();
  document.getElementById('s2-next').onclick = () => { _saveBldFields(); wiz.next(); };

  document.getElementById('bld-link').onchange = async (e) => {
    const bid = e.target.value;
    if (bid) {
      const b = S.buildingsList.find(x => x.id === bid);
      if (b) {
        S.building = { name: b.name||'', client_name: b.client_name||'', client_company: b.client_company||'',
          address: b.address||'', city: b.city||'', province: b.province||'BC',
          postal_code: b.postal_code||'', client_email: b.client_email||'', client_phone: b.client_phone||'',
          building_id: bid };
        document.getElementById('bld-fields').innerHTML = _bldFields();
      }
    } else {
      S.building.building_id = null;
    }
  };

  if (S.screenshotFile) {
    try {
      const text = await _runOCR(S.screenshotFile);
      const extracted = _extractBuildingFields(text);
      // Only fill blanks — don't overwrite manually-linked building
      if (!S.building.building_id) {
        for (const [k, v] of Object.entries(extracted)) {
          if (v && !S.building[k]) { S.building[k] = v.value; S.buildingConfidence[k] = v.conf; }
        }
      }
      const statusEl = document.getElementById('ocr-status');
      if (statusEl) statusEl.innerHTML = `<span class="badge badge-success">OCR complete</span> Fields auto-filled where found. Yellow = review.`;
      document.getElementById('bld-fields').innerHTML = _bldFields();
    } catch (e) {
      const statusEl = document.getElementById('ocr-status');
      if (statusEl) statusEl.innerHTML = `<span class="badge badge-warn">OCR failed: ${e.message}</span> Enter manually below.`;
    }
  }
}

function _bldFields() {
  const f = S.building;
  const c = S.buildingConfidence;
  const field = (key, label, type='text') => `
    <div class="form-group">
      <label>${label} ${c[key] ? `<span class="conf-badge conf-${c[key]}">${c[key]}</span>` : ''}</label>
      <input type="${type}" class="bld-input ${c[key]==='low'?'input-review':''}" data-key="${key}" value="${f[key]||''}">
    </div>`;
  return `
    <div class="form-row">${field('name','Building Name')}${field('client_name','Client / Contact Name')}</div>
    <div class="form-row">${field('client_company','Company / Strata Plan')}${field('client_phone','Phone','tel')}</div>
    <div class="form-row">${field('client_email','Email','email')}${field('address','Street Address')}</div>
    <div class="form-row">${field('city','City')}${field('province','Province')}</div>`;
}

function _saveBldFields() {
  document.querySelectorAll('.bld-input').forEach(inp => {
    S.building[inp.dataset.key] = inp.value;
  });
}

async function _runOCR(file) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract not loaded');
  const worker = await Tesseract.createWorker('eng', 1, { logger: () => {} });
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  return text;
}

function _extractBuildingFields(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const joined = lines.join('\n');
  const result = {};
  const try_ = (patterns, conf) => {
    for (const p of patterns) { const m = joined.match(p); if (m) return { value: m[1]?.trim(), conf }; }
    return null;
  };
  result.client_name  = try_([/(?:client|customer|contact)\s*:?\s*(.+)/i, /(?:attn|attention)\s*:?\s*(.+)/i], 'medium');
  result.client_company = try_([/(?:company|strata|corp|inc|ltd)\s*:?\s*(.+)/i, /(?:strata plan)\s+([A-Z]{2,4}\d+)/i], 'medium');
  result.address      = try_([/(\d{3,6}\s+[\w\s]+(?:st|ave|blvd|rd|dr|way|pl|cres)[^\n]*)/i], 'medium');
  result.client_phone = try_([/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/], 'high');
  result.client_email = try_([/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/], 'high');
  result.name         = try_([/(?:building|property|site)\s*:?\s*(.+)/i, /(?:location)\s*:?\s*(.+)/i], 'low');
  // Remove nulls
  for (const k of Object.keys(result)) { if (!result[k] || !result[k].value) delete result[k]; }
  return result;
}

// ─── Step 3 — Equipment Extraction ───────────────────────────────────────────
async function _step3(el, wiz) {
  el.innerHTML = `<div class="wiz-card">
    <h3>Equipment List</h3>
    <div id="equip-parse-status"></div>
    <div id="equip-table-wrap">
      ${_renderRawEquipTable()}
    </div>
    <div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="btn btn-sm btn-secondary" id="add-equip-row">+ Add Row</button>
      ${S.equipFile || S.drawingFile ? `<button class="btn btn-sm btn-primary" id="parse-files-btn">⟳ Parse Uploaded Files</button>` : ''}
    </div>
    ${S.rfpScope.length ? `<div class="rfp-scope-block" style="margin-top:1rem">
      <div class="form-section-title">Program / RFP Scope Detected (${S.rfpScope.length} items)</div>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:.5rem">These will appear as structured scope items in the proposal. Uncheck to exclude.</p>
      <div id="rfp-checklist">${S.rfpScope.map((r,i) => `<label style="display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.4rem;cursor:pointer">
        <input type="checkbox" class="rfp-chk" data-i="${i}" checked style="margin-top:3px">
        <span><strong>${r.label}</strong><br><span style="font-size:12px;color:var(--text-muted)">${r.detail}</span></span>
      </label>`).join('')}</div>
    </div>` : ''}
    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s3-back">← Back</button>
      <button class="btn btn-primary" id="s3-next">Next: Price →</button>
    </div>
  </div>`;

  document.getElementById('s3-back').onclick = () => wiz.back();
  document.getElementById('s3-next').onclick = () => {
    _saveRawTable();
    // Save rfp checked state
    document.querySelectorAll('.rfp-chk').forEach(chk => {
      const i = Number(chk.dataset.i);
      if (S.rfpScope[i]) S.rfpScope[i]._excluded = !chk.checked;
    });
    wiz.next();
  };
  document.getElementById('add-equip-row').onclick = () => {
    _saveRawTable();
    S.rawEquipment.push({ type:'', tag:'', manufacturer:'', model:'', qty:1, location:'', source:'manual' });
    document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable();
    _bindRawTable();
  };
  _bindRawTable();

  const parseBtn = document.getElementById('parse-files-btn');
  if (parseBtn) {
    parseBtn.onclick = async () => {
      parseBtn.disabled = true; parseBtn.textContent = 'Parsing…';
      const status = document.getElementById('equip-parse-status');
      _saveRawTable();
      const extracted = [];
      try {
        if (S.equipFile)   extracted.push(...await _parseEquipFile(S.equipFile, status));
        if (S.drawingFile) extracted.push(...await _parseDrawingFile(S.drawingFile, status));
        // Dedupe by type+tag
        for (const item of extracted) {
          const dup = S.rawEquipment.find(e => e.type===item.type && e.tag===item.tag);
          if (!dup) S.rawEquipment.push(item);
        }
        document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable();
        _bindRawTable();
        if (status) status.innerHTML = `<div class="badge badge-success">Extracted ${extracted.length} items</div>`;
      } catch (err) {
        if (status) status.innerHTML = `<div class="badge badge-danger">Parse failed: ${err.message}</div>`;
      } finally {
        parseBtn.disabled = false; parseBtn.textContent = '⟳ Parse Uploaded Files';
      }
    };
  }
}

function _renderRawEquipTable() {
  if (!S.rawEquipment.length) return `<p class="text-muted">No equipment yet. Add rows manually or parse uploaded files.</p>`;
  return `<div class="table-scroll"><table class="table" id="raw-equip-table">
    <thead><tr><th>Type / Description</th><th>Tag</th><th>Make</th><th>Model</th><th style="width:60px">Qty</th><th>Location</th><th style="width:32px"></th></tr></thead>
    <tbody>${S.rawEquipment.map((e,i) => `<tr>
      <td><input class="raw-inp" data-i="${i}" data-f="type" value="${e.type||''}" placeholder="e.g. Hot Water Boiler"></td>
      <td><input class="raw-inp" data-i="${i}" data-f="tag"  value="${e.tag||''}"  placeholder="B-1" style="width:70px"></td>
      <td><input class="raw-inp" data-i="${i}" data-f="manufacturer" value="${e.manufacturer||''}" style="width:90px"></td>
      <td><input class="raw-inp" data-i="${i}" data-f="model" value="${e.model||''}" style="width:90px"></td>
      <td><input class="raw-inp" type="number" data-i="${i}" data-f="qty" value="${e.qty||1}" min="1" style="width:52px"></td>
      <td><input class="raw-inp" data-i="${i}" data-f="location" value="${e.location||''}"></td>
      <td><button class="btn btn-xs btn-danger raw-del" data-i="${i}">✕</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function _bindRawTable() {
  document.querySelectorAll('.raw-del').forEach(btn => {
    btn.onclick = () => { _saveRawTable(); S.rawEquipment.splice(Number(btn.dataset.i),1); document.getElementById('equip-table-wrap').innerHTML = _renderRawEquipTable(); _bindRawTable(); };
  });
}

function _saveRawTable() {
  document.querySelectorAll('.raw-inp').forEach(inp => {
    const i = Number(inp.dataset.i), f = inp.dataset.f;
    if (S.rawEquipment[i]) S.rawEquipment[i][f] = f === 'qty' ? Number(inp.value)||1 : inp.value;
  });
}

// ─── File parsers ─────────────────────────────────────────────────────────────
async function _getRawText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'docx') {
    if (!window.mammoth) return '';
    const buf = await file.arrayBuffer();
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return r.value;
  }
  if (ext === 'pdf') {
    if (!window.pdfjsLib) return '';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let txt = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const c = await page.getTextContent();
      txt += c.items.map(i => i.str).join(' ') + '\n';
    }
    return txt;
  }
  return '';
}

async function _parseEquipFile(file, statusEl) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return _parseXLSX(file);
  if (ext === 'docx')                  return _parseDOCX(file);
  if (ext === 'pdf')                   return _parsePDF(file, statusEl);
  throw new Error(`Unsupported file type: .${ext}`);
}

async function _parseDrawingFile(file, statusEl) {
  if (statusEl) statusEl.innerHTML = '<span class="text-muted">Scanning drawing for equipment references…</span>';
  return _parsePDF(file, statusEl, true);
}

async function _parseXLSX(file) {
  if (!window.XLSX) throw new Error('SheetJS not loaded');
  const buf  = await file.arrayBuffer();
  const wb   = XLSX.read(buf, { type: 'array' });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows.map(r => ({
    type:         r['Equipment Type'] || r['Type'] || r['equipment_type'] || r['Description'] || '',
    tag:          r['Tag'] || r['tag'] || r['ID'] || '',
    manufacturer: r['Make'] || r['Manufacturer'] || r['manufacturer'] || '',
    model:        r['Model'] || r['model'] || '',
    qty:          Number(r['Qty'] || r['Quantity'] || r['qty'] || 1),
    location:     r['Location'] || r['location'] || r['Area'] || '',
    source:       'xlsx',
  })).filter(r => r.type);
}

async function _parseDOCX(file) {
  if (!window.mammoth) throw new Error('Mammoth not loaded');
  const buf    = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return _extractEquipFromText(result.value, 'docx');
}

async function _parsePDF(file, statusEl, isDrawing = false) {
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
  return _extractEquipFromText(allText, isDrawing ? 'drawing' : 'pdf');
}

const EQUIP_VOCAB_RE = new RegExp(
  '(' + EQUIPMASTER.map(e => e.equipment_type).sort((a,b)=>b.length-a.length)
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')',
  'gi'
);
const TAG_RE = /\b([A-Z]{1,5}-?\d{1,3}[A-Z]?)\b/g;
const MFR_RE = /\b(Trane|Carrier|Daikin|York|Lennox|Viessmann|Lochinvar|Grundfos|Taco|Armstrong|Honeywell|Siemens|Johnson Controls|AO Smith|Bradford White|Rheem|Watts|Victaulic|Belimo|Pentair|Hayward)\b/gi;

function _extractEquipFromText(text, source) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [], seen = new Set();

  for (const line of lines) {
    // Pass 1: vocab match (high confidence)
    for (const m of line.matchAll(EQUIP_VOCAB_RE)) {
      const type = m[1];
      const tags = [...line.matchAll(TAG_RE)].map(t => t[1]).filter(t => !/^(AND|THE|FOR|WITH|FROM|UNIT|EACH|TYPE|SIZE|NOTE|SEE|REF|SHT|DWG|REV|DATE|MARK|ITEM)$/.test(t));
      const mfrs = [...line.matchAll(MFR_RE)].map(t => t[1]);
      // If line has explicit tag(s), create one item per tag
      if (tags.length > 0) {
        tags.forEach(tag => {
          const key = type.toLowerCase() + tag;
          if (seen.has(key)) return;
          seen.add(key);
          items.push({ type, tag, manufacturer: mfrs[0]||'', model:'', qty:1, location:'', source, conf:'strong' });
        });
      } else {
        // No tag — single item, detect quantity from text
        const qtyM = line.match(/\b(\d{1,2})\s*(?:no\.?|nr|qty|units?|ea\.?)\b/i) ||
                     line.match(/^(\d{1,2})\s+/);
        const qty = qtyM ? parseInt(qtyM[1]) : 1;
        const key = type.toLowerCase() + line.slice(0,20);
        if (seen.has(key)) return;
        seen.add(key);
        items.push({ type, tag:'', manufacturer: mfrs[0]||'', model:'', qty, location:'', source, conf:'medium' });
      }
    }

    // Pass 2: tag-only lines (e.g. "P-1, P-2, P-3 — Circulation Pump")
    const allTags = [...line.matchAll(TAG_RE)].map(t => t[1]).filter(t =>
      !/^(AND|THE|FOR|WITH|FROM|UNIT|EACH|TYPE|SIZE|NOTE|SEE|REF|SHT|DWG|REV|DATE|MARK|ITEM|HVAC|AHU|RTU|FCU|VFD|DDC|BAS|VAV|MUA|ERV|HRV)$/.test(t) &&
      t.length >= 2
    );
    // Only process if line isn't already captured by vocab and has a recognisable tag pattern (letter-number)
    if (allTags.length > 0 && !line.match(EQUIP_VOCAB_RE)) {
      // Try to extract type description from line (text after last tag)
      const lastTag = allTags[allTags.length - 1];
      const afterTag = line.slice(line.lastIndexOf(lastTag) + lastTag.length).replace(/^[\s,\-–—:]+/, '').split(/[,;]/)[0].trim();
      if (afterTag.length > 3) {
        allTags.forEach(tag => {
          const key = 'tagged:' + tag;
          if (seen.has(key)) return;
          seen.add(key);
          items.push({ type: afterTag.slice(0,60), tag, manufacturer:'', model:'', qty:1, location:'', source, conf:'review' });
        });
      }
    }
  }

  // Group items with same type and no tag into single rows with summed qty
  const grouped = [], groupSeen = {};
  items.forEach(item => {
    if (!item.tag) {
      const k = item.type.toLowerCase();
      if (groupSeen[k]) { groupSeen[k].qty += item.qty; return; }
      groupSeen[k] = item; grouped.push(item);
    } else {
      grouped.push(item);
    }
  });

  return grouped.slice(0, 200);
}

// ─── Step 4 — Normalize & Price ───────────────────────────────────────────────
async function _step4(el, wiz) {
  // Run normalization on first visit
  if (!S.normalized.length && S.rawEquipment.length) {
    S.normalized = S.rawEquipment.map(item => _normalizeItem(item));
  }

  el.innerHTML = `<div class="wiz-card">
    <h3>Normalize & Price</h3>
    <div class="form-row" style="align-items:center;margin-bottom:1rem">
      <div class="form-group">
        <label>Service Frequency</label>
        <select id="wiz-freq">
          ${CONFIG.FREQUENCIES.map(f => `<option value="${f.value}" ${S.frequency===f.value?'selected':''}>${f.label}</option>`).join('')}
        </select>
      </div>
      <div style="padding-top:1.5rem">
        <button class="btn btn-sm btn-secondary" id="recalc-btn">↻ Recalculate</button>
      </div>
    </div>

    ${!S.normalized.length ? `<div class="empty-state"><p>No equipment to normalize. Go back and add items.</p></div>` : ''}

    <div id="norm-table-wrap">${_renderNormTable()}</div>

    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s4-back">← Back</button>
      <button class="btn btn-primary" id="s4-next">Next: Review →</button>
    </div>
  </div>`;

  document.getElementById('s4-back').onclick = () => { _saveNormTable(); wiz.back(); };
  document.getElementById('s4-next').onclick = () => { _saveNormTable(); wiz.next(); };
  document.getElementById('wiz-freq').onchange = e => {
    S.frequency = e.target.value;
    S.normalized.forEach(n => { n.frequency = S.frequency; n.annual_price = _calcPrice(n); });
    document.getElementById('norm-table-wrap').innerHTML = _renderNormTable();
    _bindNormTable();
  };
  document.getElementById('recalc-btn').onclick = () => {
    _saveNormTable();
    S.normalized.forEach(n => { n.annual_price = _calcPrice(n); });
    document.getElementById('norm-table-wrap').innerHTML = _renderNormTable();
    _bindNormTable();
  };
  _bindNormTable();
}


// ─── RFP / Program scope extraction ─────────────────────────────────────────
const RFP_PATTERNS = [
  { re: /quarterly\s+(?:preventive\s+)?maintenance|quarterly\s+pm\s+program/i, label: 'Quarterly Preventive Maintenance Program', detail: 'Full PM visit performed quarterly per equipment schedule' },
  { re: /semi.?annual\s+(?:maintenance|pm)/i, label: 'Semi-Annual Preventive Maintenance', detail: 'Two scheduled PM visits per year' },
  { re: /annual\s+(?:maintenance|pm|service)/i, label: 'Annual Preventive Maintenance', detail: 'Annual full-service maintenance visit' },
  { re: /annual\s+report(?:ing)?/i, label: 'Annual Maintenance Report', detail: 'Written annual report delivered to property manager' },
  { re: /cooling\s+tower\s+(?:service|clean|inspect|treat)/i, label: 'Cooling Tower Service', detail: 'Clean, inspect, and chemically treat cooling tower per schedule' },
  { re: /boiler\s+(?:teardown|strip|annual|overhaul|inspection)/i, label: 'Boiler Annual Teardown & Inspection', detail: 'Annual boiler strip-down, combustion test, safety device inspection' },
  { re: /pump\s+(?:service|inspect|overhaul)/i, label: 'Pump Service & Inspection', detail: 'Inspect seals, bearings, impeller; verify flow and pressure' },
  { re: /expansion\s+tank\s+inspect/i, label: 'Expansion Tank Inspection', detail: 'Inspect pre-charge pressure and condition' },
  { re: /backflow\s+(?:test|inspect|certif)/i, label: 'Backflow Preventer Testing', detail: 'Annual certified test and reporting per BCWWA requirements' },
  { re: /ddc\s+(?:monitor|inspect|review)|bas\s+(?:review|monitor)/i, label: 'DDC / BAS Monitoring & Review', detail: 'Review control sequences, alarms, setpoints, and trend data' },
  { re: /filter\s+(?:change|replac|service)|air\s+filter/i, label: 'Air Filter Replacement Program', detail: 'Replace all air filters per schedule with specified filter media' },
  { re: /24.?hour\s+(?:emergency|response)|emergency\s+(?:line|service)/i, label: '24-Hour Emergency Response', detail: 'Emergency service line available 24/7; after-hours rates apply' },
  { re: /glycol\s+(?:test|check|inspect)|antifreeze/i, label: 'Glycol System Testing', detail: 'Test glycol concentration and inhibitor levels; top up as required' },
  { re: /chemical\s+(?:treatment|treat|program)|water\s+treatment/i, label: 'Chemical Water Treatment', detail: 'Monitor and maintain chemical treatment program for hydronic systems' },
  { re: /vibration\s+(?:analysis|test|monitor)/i, label: 'Vibration Analysis', detail: 'Assess rotating equipment for abnormal vibration signatures' },
  { re: /performance\s+review|annual\s+review\s+meeting/i, label: 'Annual Performance Review Meeting', detail: 'Annual meeting with property manager to review maintenance performance' },
];

function _extractRFPScope(text) {
  const found = [];
  const seen  = new Set();
  for (const p of RFP_PATTERNS) {
    if (p.re.test(text) && !seen.has(p.label)) {
      seen.add(p.label);
      found.push({ label: p.label, detail: p.detail });
    }
  }
  return found;
}

function _normalizeItem(raw) {
  const match = findEquipType(raw.type);
  let conf = 'unknown', qtrHrs = 1.0, annHrs = 4.0, category = 'Other', equipmaster = null;
  if (match) {
    equipmaster = match.equipment_type;
    category    = match.category || 'Other';
    qtrHrs      = match.quarterly_std_hours  || 1.0;
    annHrs      = match.annual_std_hours      || 4.0;
    conf = match.equipment_type.toLowerCase() === (raw.type||'').toLowerCase() ? 'exact' : 'strong';
  } else {
    // Partial match — scan for word overlap
    const words = (raw.type||'').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const partial = words.length
      ? EQUIPMASTER.find(e => words.some(w => e.equipment_type.toLowerCase().includes(w)))
      : null;
    if (partial) {
      equipmaster = partial.equipment_type; category = partial.category;
      qtrHrs = partial.quarterly_std_hours||1; annHrs = partial.annual_std_hours||4; conf = 'review';
    } else {
      // Unknown — use safe defaults so draft still generates cleanly
      equipmaster = null; category = 'Other'; qtrHrs = 1.0; annHrs = 4.0; conf = 'unknown';
    }
  }
  const n = { ...raw, equipmaster, conf, category, qtrHrs, annHrs, frequency: S.frequency };
  n.annual_price = _calcPrice(n);
  return n;
}

function _calcPrice(n) {
  const freqObj = CONFIG.FREQUENCIES.find(f => f.value === n.frequency) || { visits: 4 };
  const hrsPerVisit = n.frequency === 'annual' ? n.annHrs : n.frequency === 'semi-annual' ? (n.annHrs / 2) : n.qtrHrs;
  const totalHrs = hrsPerVisit * freqObj.visits * (n.qty || 1);
  return calcPMSellPrice(totalHrs);
}

function _renderNormTable() {
  if (!S.normalized.length) return '';
  const confBadge = c => ({
    exact: '<span class="badge badge-success">Exact</span>',
    strong: '<span class="badge badge-primary">Strong</span>',
    review: '<span class="badge badge-warn">Review</span>',
    unknown: '<span class="badge badge-muted">Unknown</span>',
  }[c] || '');

  const total = S.normalized.reduce((s,n) => s + Number(n.annual_price||0),0);
  return `<div class="table-scroll">
    <table class="table" id="norm-table">
      <thead><tr>
        <th>Type</th><th>Matched As</th><th>Conf</th><th>Cat</th>
        <th>Qty</th><th>Qtly Hrs</th><th>Ann Hrs</th>
        <th style="width:32px"></th>
      </tr></thead>
      <tbody>${S.normalized.map((n,i) => `<tr class="${n.conf==='unknown'?'row-review':''}">
        <td>${n.type}</td>
        <td>${n.equipmaster || `<select class="norm-match-sel" data-i="${i}" style="font-size:12px">`+
          `<option value="">— Select —</option>`+
          EQUIPMASTER.slice(0,50).map(e=>`<option value="${e.equipment_type}" ${n.equipmaster===e.equipment_type?'selected':''}>${e.equipment_type}</option>`).join('')+
          `</select>`}</td>
        <td>${confBadge(n.conf)}</td>
        <td><input class="norm-inp" data-i="${i}" data-f="category" value="${n.category||''}" style="width:80px;font-size:12px"></td>
        <td><input class="norm-inp" type="number" data-i="${i}" data-f="qty" value="${n.qty||1}" min="1" style="width:50px"></td>
        <td><input class="norm-inp" type="number" step="0.25" data-i="${i}" data-f="qtrHrs" value="${n.qtrHrs||''}" style="width:55px"></td>
        <td><input class="norm-inp" type="number" step="0.25" data-i="${i}" data-f="annHrs" value="${n.annHrs||''}" style="width:55px"></td>
        <td><button class="btn btn-xs btn-danger norm-del" data-i="${i}">✕</button></td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="6" style="text-align:right;font-weight:700">Total Annual (estimated)</td>
        <td style="font-weight:700">${formatCurrency(total)}</td></tr></tfoot>
    </table>
  </div>`;
}

function _bindNormTable() {
  document.querySelectorAll('.norm-del').forEach(btn => {
    btn.onclick = () => { _saveNormTable(); S.normalized.splice(Number(btn.dataset.i),1); document.getElementById('norm-table-wrap').innerHTML = _renderNormTable(); _bindNormTable(); };
  });
  document.querySelectorAll('.norm-match-sel').forEach(sel => {
    sel.onchange = () => {
      const i = Number(sel.dataset.i);
      _saveNormTable();
      const match = findEquipType(sel.value);
      if (match) { S.normalized[i].equipmaster = match.equipment_type; S.normalized[i].category = match.category||''; S.normalized[i].qtrHrs = match.quarterly_std_hours||1; S.normalized[i].annHrs = match.annual_std_hours||4; S.normalized[i].conf = 'strong'; S.normalized[i].annual_price = _calcPrice(S.normalized[i]); }
      document.getElementById('norm-table-wrap').innerHTML = _renderNormTable(); _bindNormTable();
    };
  });
}

function _saveNormTable() {
  document.querySelectorAll('.norm-inp').forEach(inp => {
    const i = Number(inp.dataset.i), f = inp.dataset.f;
    if (S.normalized[i]) S.normalized[i][f] = ['qty','qtrHrs','annHrs','annual_price'].includes(f) ? Number(inp.value)||0 : inp.value;
  });
}

// ─── Step 5 — Review & Generate ───────────────────────────────────────────────
async function _step5(el, wiz) {
  const annual  = S.normalized.reduce((s,n) => s + Number(n.annual_price||0), 0);
  const tax     = annual * CONFIG.TAX_RATE;
  const monthly = annual / 12;
  const freqObj = CONFIG.FREQUENCIES.find(f => f.value === S.frequency) || { visits: 4 };

  el.innerHTML = `<div class="wiz-card">
    <h3>Review & Generate Proposal</h3>

    <div class="review-summary">
      <div class="review-block">
        <h4>Building</h4>
        <p>${S.building.name || '<em>Not set</em>'}</p>
        <p class="text-muted">${S.building.client_name || ''} ${S.building.client_company ? '— '+S.building.client_company : ''}</p>
        <p class="text-muted">${S.building.address || ''}</p>
      </div>
      <div class="review-block">
        <h4>Scope</h4>
        <p>${S.normalized.length} equipment items</p>
        <p class="text-muted">${freqObj.label||S.frequency} maintenance</p>
        ${S.normalized.filter(n=>n.conf==='unknown').length ? `<p class="text-warn">⚠ ${S.normalized.filter(n=>n.conf==='unknown').length} unmatched items</p>` : ''}
      </div>
      <div class="review-block">
        <h4>Pricing</h4>
        <p class="price-big">${formatCurrency(annual)}<span class="text-muted">/yr</span></p>
        <p class="text-muted">${formatCurrency(monthly)}/mo + GST</p>
        <p class="text-muted">GST: ${formatCurrency(tax)}</p>
      </div>
    </div>

    <div class="form-row" style="margin-top:1rem">
      <div class="form-group">
        <label>Proposal Title</label>
        <input id="wiz-title" class="input" placeholder="e.g. Quarterly PM Agreement 2025" value="${S.title}">
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
      <label>Cover Image <span class="text-muted">(optional — used on PDF cover page)</span></label>
      <div class="cover-img-zone" id="cover-img-zone">
        ${S.coverImageDataUrl ? `<img src="${S.coverImageDataUrl}" style="max-height:120px;border-radius:4px">` : '<span class="dz-hint">Drop image or click to select</span>'}
        <input type="file" id="cover-img-input" accept="image/*" style="display:none">
      </div>
      ${S.coverImageDataUrl ? `<button class="btn btn-xs btn-secondary" id="clear-cover" style="margin-top:.25rem">✕ Remove image</button>` : ''}
    </div>

    <div class="wiz-actions">
      <button class="btn btn-secondary" id="s5-back">← Back</button>
      <button class="btn btn-secondary" id="s5-draft">💾 Save Draft</button>
      <button class="btn btn-primary"   id="s5-save">✓ Save & Export PDF</button>
    </div>
  </div>`;

  document.getElementById('s5-back').onclick = () => { _saveMeta(); wiz.back(); };
  document.getElementById('s5-draft').onclick = () => { _saveMeta(); _saveProposal(false); };
  document.getElementById('s5-save').onclick  = () => { _saveMeta(); _saveProposal(true); };

  const imgZone = document.getElementById('cover-img-zone');
  const imgInput = document.getElementById('cover-img-input');
  imgZone.onclick = () => imgInput.click();
  imgInput.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { S.coverImageDataUrl = ev.target.result; _step5(el, wiz); };
    reader.readAsDataURL(f);
  };
  imgZone.ondragover = e => { e.preventDefault(); imgZone.classList.add('drag-active'); };
  imgZone.ondragleave = () => imgZone.classList.remove('drag-active');
  imgZone.ondrop = e => {
    e.preventDefault(); imgZone.classList.remove('drag-active');
    const f = e.dataTransfer.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => { S.coverImageDataUrl = ev.target.result; _step5(el, wiz); };
    reader.readAsDataURL(f);
  };
  document.getElementById('clear-cover')?.addEventListener('click', e => {
    e.stopPropagation(); S.coverImageDataUrl = null; _step5(el, wiz);
  });
}

function _saveMeta() {
  S.title = document.getElementById('wiz-title')?.value || S.title;
  S.notes = document.getElementById('wiz-notes')?.value || S.notes;
  S.paymentTerms = document.getElementById('wiz-terms')?.value || S.paymentTerms;
}

async function _saveProposal(exportPdf) {
  const annual   = S.normalized.reduce((s,n) => s + Number(n.annual_price||0), 0);
  const freqObj  = CONFIG.FREQUENCIES.find(f => f.value === S.frequency) || { visits: 4, label: S.frequency };
  const num      = 'P-' + String(Date.now()).slice(-5);

  // Build scope_items from normalized
  const scopeItems = [
    // Equipment-based scope
    ...S.normalized.map(n => ({
      equipment_id:   null,
      tag:            n.tag || '',
      equipment_type: n.equipmaster || n.type || 'Unknown Equipment',
      frequency:      n.frequency || S.frequency,
      annual_price:   Number(n.annual_price) || 0,
      qty:            Number(n.qty) || 1,
      category:       n.category || 'Other',
      confidence:     n.conf,
      scope_lines:    getScopeText(n.equipmaster || n.type, n.frequency || S.frequency),
    })),
    // RFP / Program scope items (no pricing — included in annual total)
    ...S.rfpScope.filter(r => !r._excluded).map(r => ({
      equipment_id:   null,
      tag:            '',
      equipment_type: r.label,
      frequency:      S.frequency,
      annual_price:   0,
      qty:            1,
      category:       'Program Scope',
      confidence:     'rfp',
      scope_lines:    [r.detail],
    })),
  ];

  // Raw intake stored for audit trail
  const rawIntake = {
    building: S.building,
    rawEquipment: S.rawEquipment,
    frequency: S.frequency,
    coverImage: S.coverImageDataUrl ? 'stored' : null,
  };

  const rec = {
    proposal_number: num,
    title:           S.title || `PM Agreement — ${S.building.name || 'Draft'}`,
    status:          exportPdf ? 'draft' : 'draft',
    created_date:    today(),
    valid_until:     addDays(today(), CONFIG.PROPOSAL_VALID_DAYS),
    frequency:       S.frequency,
    visits_per_year: freqObj.visits,
    annual_value:    annual,
    monthly_value:   annual / 12,
    payment_terms:   S.paymentTerms || 'Net 30',
    scope_items:     scopeItems,
    notes:           S.notes,
    // Extra fields (require schema migration — see schema.sql)
    cover_image_url: null, // stored in raw_intake for now
    raw_intake:      rawIntake,
    is_draft:        !exportPdf,
  };

  // Link to existing building or create new one
  if (S.building.building_id) {
    rec.building_id = S.building.building_id;
  } else if (S.building.name) {
    try {
      const bldRec = {
        name: S.building.name, client_name: S.building.client_name,
        client_company: S.building.client_company, address: S.building.address,
        city: S.building.city, province: S.building.province,
        postal_code: S.building.postal_code, client_email: S.building.client_email,
        client_phone: S.building.client_phone, status: 'active',
      };
      const saved = await BuildingsDB.create(bldRec);
      rec.building_id = saved.id;
    } catch (e) { console.warn('Building create failed:', e.message); }
  }

  let saved;
  try {
    saved = await DB.create(rec);
    notify.success(`Proposal ${num} saved.`);
  } catch (e) {
    // If raw_intake / cover_image_url / is_draft columns don't exist yet, retry without them
    try {
      const { raw_intake, cover_image_url, is_draft, ...recBasic } = rec;
      saved = await DB.create(recBasic);
      notify.success(`Proposal ${num} saved (schema upgrade pending — see docs/schema.sql).`);
    } catch (e2) {
      notify.error('Save failed: ' + e2.message);
      return;
    }
  }

  if (exportPdf && saved) {
    try {
      const building = saved.building_id
        ? (S.buildingsList.find(b => b.id === saved.building_id) || S.building)
        : S.building;
      generateProposalPDFEnhanced(saved, building, S.coverImageDataUrl);
    } catch (e) {
      notify.warn('PDF export failed: ' + e.message + '. Proposal was saved.');
    }
  }

  navigate(`/proposals/${saved.id}`);
}
