import { notify, openModal, closeModal, spinner } from './ui.js';
import { Buildings, Equipment as EquipDB } from './db.js';
import { CONFIG } from './config.js';
import { EQUIPMASTER } from './equipmaster.js';
import { Equipment } from './equipment.js';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

const EQUIP_TYPES = (() => {
  const s = new Set();
  (EQUIPMASTER||[]).forEach(e => e.equipment_type && s.add(e.equipment_type));
  CONFIG.EQUIPMENT_TYPES.forEach(t => s.add(t));
  return [...s].sort();
})();

// VRF / VRV aliases — normalize both directions
const TYPE_ALIASES = {
  'VRF System': ['VRF','VRV','Variable Refrigerant Flow','Variable Refrigerant Volume'],
  'VRV System': ['VRV','VRF','Variable Refrigerant Flow','Variable Refrigerant Volume'],
  'Air Handling Unit': ['AHU','Air Handler','DOAS'],
  'Rooftop Unit': ['RTU','Packaged Rooftop'],
  'Fan Coil Unit': ['FCU','Fan Coil'],
  'Make-Up Air Unit': ['MAU','Makeup Air'],
  'Heat Recovery Ventilator': ['HRV','Heat Recovery'],
  'Energy Recovery Ventilator': ['ERV','Energy Recovery'],
  'Hot Water Boiler': ['HWB','Heating Boiler','HW Boiler'],
  'Condensing Boiler': ['Condensing Boiler','Mod-Con'],
  'Chiller': ['CH','Chiller'],
  'Cooling Tower': ['CT','Cooling Tower'],
  'Circulation Pump': ['HWP','CWP','CHWP','Circulator','Pump'],
  'Domestic Water Heater': ['DHW','HWT','Water Heater','HW Tank'],
  'Exhaust Fan': ['EF','Exhaust Fan','EX Fan'],
  'Variable Frequency Drive': ['VFD','Variable Speed Drive','VSD'],
  'Plate Heat Exchanger': ['PHE','HX','Heat Exchanger','B&G'],
};

function normalizeType(raw) {
  if (!raw) return raw;
  const u = raw.trim().toUpperCase();
  for (const [canonical, aliases] of Object.entries(TYPE_ALIASES)) {
    if (aliases.some(a => u === a.toUpperCase() || u.includes(a.toUpperCase()))) return canonical;
  }
  const direct = EQUIP_TYPES.find(t => t.toLowerCase() === raw.toLowerCase().trim());
  if (direct) return direct;
  return raw.trim();
}

export async function renderDocumentParser(container) {
  let buildings = [];
  try { buildings = await Buildings.getAll(); } catch {}

  container.innerHTML = `
    <div class="page-wrap">
      <div class="toolbar">
        <div>
          <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)">Document Parser</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px">Extract equipment from mechanical schedules, drawings, service reports, and spreadsheets. AI reads tags, makes, models, sizes, and quantities.</div>
        </div>
        <div class="toolbar-right"><span class="ai-badge">✦ Claude AI</span></div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Upload Document</h3></div>
        <div class="card-body">
          <div class="drop-zone" id="drop-zone">
            <span class="drop-zone-icon">📂</span>
            <div class="drop-zone-text">Drop file here or click to browse</div>
            <div class="drop-zone-sub">PDF · DOCX · XLSX · CSV · PNG/JPG/JPEG (drawing scan or photo)</div>
            <input type="file" id="file-input" accept=".pdf,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg" style="display:none">
          </div>
          <div style="margin-top:12px;font-size:11.5px;color:var(--text-muted)">
            Works with: equipment schedules, mechanical drawings (PNG/JPG scans), PM reports, submittal sheets, cut sheets, tender specs
          </div>
        </div>
      </div>

      <div id="progress-card" style="display:none">
        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3 id="prog-title">Processing</h3>
            <span id="prog-ai-badge" class="ai-badge" style="display:none">✦ AI Analysis</span>
          </div>
          <div class="card-body">
            <div class="progress-bar"><div class="progress-fill" id="prog-fill" style="width:0%"></div></div>
            <div id="prog-msg" style="font-size:12px;color:var(--text-dim);margin-top:8px"></div>
          </div>
        </div>
      </div>

      <div id="results-section" style="display:none">
        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3>Extracted Equipment <span id="extract-count" style="color:var(--orange);margin-left:6px"></span></h3>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-sm btn-secondary" id="btn-reanalyze">✦ Re-analyze</button>
              <button class="btn btn-sm btn-secondary" id="btn-csv">Export CSV</button>
              <button class="btn btn-sm btn-primary"   id="btn-import">Import to Building</button>
            </div>
          </div>
          <div class="card-body no-pad"><div id="results-wrap"></div></div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3>Extracted Text</h3>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm btn-primary"   id="btn-manual-ai">✦ Re-run AI on Text</button>
              <button class="btn btn-sm btn-secondary" id="btn-edit-raw">Edit</button>
            </div>
          </div>
          <div class="card-body">
            <textarea id="raw-text" class="input" rows="8" readonly
              style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-dim)"></textarea>
          </div>
        </div>
      </div>
    </div>`;

  const state = { rawText: '', items: [], fileName: '' };
  setupDrop(state, buildings);
}

function setupDrop(state, buildings) {
  const zone = document.getElementById('drop-zone');
  const inp  = document.getElementById('file-input');
  zone.onclick = () => inp.click();
  inp.onchange = e => e.target.files[0] && processFile(e.target.files[0], state, buildings);
  zone.ondragover  = e => { e.preventDefault(); zone.classList.add('drag-over'); };
  zone.ondragleave = () => zone.classList.remove('drag-over');
  zone.ondrop = e => { e.preventDefault(); zone.classList.remove('drag-over'); e.dataTransfer.files[0] && processFile(e.dataTransfer.files[0], state, buildings); };
}

async function processFile(file, state, buildings) {
  state.fileName = file.name;
  const ext = file.name.split('.').pop().toLowerCase();
  showProg('Parsing Document'); setProg(10, `Reading ${file.name}…`);

  try {
    let text = '';
    if      (ext === 'pdf')                      text = await readPDF(file);
    else if (ext === 'docx')                     text = await readDOCX(file);
    else if (['xlsx','xls'].includes(ext))       text = await readXLSX(file);
    else if (ext === 'csv')                      text = await readCSV(file);
    else if (['png','jpg','jpeg'].includes(ext)) text = await readOCR(file);
    else throw new Error(`Unsupported file type: .${ext}`);

    state.rawText = text;
    setProg(60, 'Sending to Claude AI for analysis…');
    document.getElementById('prog-ai-badge').style.display = '';

    state.items = await aiExtract(text);
    setProg(100, `Found ${state.items.length} equipment item(s)`);
    setTimeout(() => showResults(state, buildings), 400);
  } catch (err) {
    document.getElementById('progress-card').style.display = 'none';
    notify.error(err.message || 'Parse failed');
  }
}

async function readPDF(file) {
  if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf   = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = Math.min(pdf.numPages, 80);
  let text = '';
  for (let i = 1; i <= pages; i++) {
    setProg(10 + Math.floor(i / pages * 40), `Reading page ${i} of ${pages}…`);
    const pg   = await pdf.getPage(i);
    const cont = await pg.getTextContent();
    // Preserve spatial layout — group items by vertical position
    const byY = {};
    cont.items.forEach(it => {
      const y = Math.round(it.transform[5] / 5) * 5;
      byY[y] = byY[y] ? byY[y] + ' ' + it.str : it.str;
    });
    const pageText = Object.keys(byY).sort((a,b) => b - a).map(y => byY[y]).join('\n');
    text += `\n=== PAGE ${i} ===\n${pageText}`;
  }
  if (text.trim().length < 80) throw new Error('PDF has no extractable text. For scanned drawings use PNG/JPG for OCR.');
  return text;
}

async function readDOCX(file) {
  if (!window.mammoth) throw new Error('Mammoth.js not loaded');
  const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  if (!r.value?.trim()) throw new Error('No text found in DOCX');
  return r.value;
}

async function readXLSX(file) {
  if (!window.XLSX) throw new Error('SheetJS not loaded');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  let text = '';
  wb.SheetNames.forEach(name => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
    text += `\n=== SHEET: ${name} ===\n` + rows.map(r => r.map(c => String(c)).join('\t')).join('\n');
  });
  return text;
}

function readCSV(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = () => rej(new Error('Failed to read CSV'));
    r.readAsText(file);
  });
}

async function readOCR(file) {
  if (!window.Tesseract) throw new Error('Tesseract.js not loaded — check CDN in index.html');
  setProg(15, 'Initialising OCR engine…');
  let worker;
  try {
    worker = await Tesseract.createWorker('eng', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      langPath:   'https://tessdata.projectnaptha.com/4.0.0',
      corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
      logger: m => {
        if (m.status === 'recognizing text')
          setProg(20 + Math.floor(m.progress * 35), `OCR: ${Math.floor(m.progress * 100)}%…`);
        else if (m.status === 'loading language traineddata')
          setProg(10 + Math.floor(m.progress * 8), 'Loading OCR language data…');
      }
    });
    setProg(55, 'Scanning image…');
    const { data } = await worker.recognize(file);
    await worker.terminate();
    if (!data.text?.trim()) throw new Error('OCR found no readable text');
    return data.text;
  } catch(e) {
    if (worker) await worker.terminate().catch(()=>{});
    // Fallback
    try {
      const r = await Tesseract.recognize(file, 'eng');
      const t = r.data?.text || '';
      if (!t.trim()) throw new Error('OCR returned no text');
      return t;
    } catch { throw new Error('OCR failed: ' + e.message); }
  }
}

async function aiExtract(rawText) {
  const truncated = rawText.slice(0, 16000);

  const systemPrompt = `You are a licensed mechanical engineer and estimator in British Columbia, Canada.
Your job is to read mechanical drawings, equipment schedules, PM service reports, tender specifications, and submittal sheets, then extract every piece of mechanical equipment listed.

Rules:
- Read tables, schedules, legends, and free text — extract ALL equipment items
- VRF and VRV are the same equipment type — normalize to "VRF System" 
- Expand abbreviations: AHU=Air Handling Unit, RTU=Rooftop Unit, FCU=Fan Coil Unit, MAU=Make-Up Air Unit, HRV=Heat Recovery Ventilator, ERV=Energy Recovery Ventilator, HWB=Hot Water Boiler, CH=Chiller, CT=Cooling Tower, HWP/CWP/CHWP=Circulation Pump, EF=Exhaust Fan, VFD=Variable Frequency Drive, PHE=Plate Heat Exchanger, DHW=Domestic Water Heater, PRV=Pressure Reducing Valve, BFP=Backflow Preventer
- Extract capacity/size information: CFM, MBH, tons, GPM, HP, kW, PSI, litres, pipe size, duct size
- Extract filter sizes when mentioned (e.g. 24x24x2, MERV 13)
- Extract refrigerant type when mentioned (R-410A, R-32, etc.)
- If a row in a schedule represents multiple identical units, set quantity accordingly
- Do NOT invent information not present in the document
- If a field is not found, use null`;

  const userPrompt = `Extract all mechanical equipment from this document.

Return ONLY a valid JSON array with no explanation, no markdown, no backticks.

Each object must have:
{
  "tag": "equipment tag or ID (e.g. AHU-1, B-2) or null",
  "equipment_type": "full type name (e.g. Air Handling Unit, Hot Water Boiler)",
  "make": "manufacturer name or null",
  "model": "model number or null",
  "serial_number": "serial number or null",
  "quantity": 1,
  "capacity": "size/capacity with units (e.g. 5000 CFM, 500 MBH, 20 tons) or null",
  "filter_size": "filter dimensions e.g. 24x24x2 MERV-13 or null",
  "location": "floor, room, or area or null",
  "voltage": "electrical supply e.g. 208V/3Ph or null",
  "refrigerant": "refrigerant type or null",
  "notes": "any other relevant spec info or null"
}

Document:
${truncated}`;

  let response;
  try {
    response = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
    });
  } catch { return fallback(rawText); }

  if (!response.ok) return fallback(rawText);

  let data;
  try { data = await response.json(); } catch { return fallback(rawText); }

  const content = (data.content||[]).find(b => b.type==='text')?.text || '[]';
  try {
    const clean  = content.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        ...item,
        equipment_type: normalizeType(item.equipment_type || ''),
        quantity: parseInt(item.quantity) || 1,
      }));
    }
  } catch {}

  return fallback(rawText);
}

function fallback(text) {
  const items = []; const seen = new Set();
  const tagRe = /\b([A-Z]{1,4}-?\d{1,4}[A-Z]?)\b/g;
  text.split('\n').map(l => l.trim()).filter(l => l.length > 4).forEach(line => {
    const ll = line.toLowerCase();
    const matched = EQUIP_TYPES.find(t =>
      t.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2).every(w => ll.includes(w))
    );
    if (!matched) return;
    const tag = ([...line.matchAll(tagRe)].map(m => m[1])[0]) || null;
    const key = `${matched}-${tag||line.slice(0,30)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ tag, equipment_type: normalizeType(matched), make: null, model: null, serial_number: null, quantity: 1, capacity: null, filter_size: null, location: null, voltage: null, refrigerant: null, notes: line.slice(0,120) });
  });
  return items.slice(0, 100);
}

function showProg(title) {
  document.getElementById('progress-card').style.display = '';
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('prog-title').textContent = title;
  document.getElementById('prog-ai-badge').style.display = 'none';
  setProg(5, 'Starting…');
}
function setProg(pct, msg) {
  const f = document.getElementById('prog-fill');
  const m = document.getElementById('prog-msg');
  if (f) f.style.width = pct + '%';
  if (m) m.textContent = msg;
}

function showResults(state, buildings) {
  document.getElementById('progress-card').style.display = 'none';
  document.getElementById('results-section').style.display = '';
  const ra = document.getElementById('raw-text');
  if (ra) ra.value = state.rawText;
  renderTable(state, buildings);
  document.getElementById('extract-count').textContent = `(${state.items.length})`;

  document.getElementById('btn-reanalyze').onclick = async () => {
    showProg('Re-analyzing'); document.getElementById('prog-ai-badge').style.display = '';
    setProg(30, 'Sending to Claude AI…');
    state.items = await aiExtract(state.rawText);
    setProg(100, `Found ${state.items.length} items`);
    setTimeout(() => { document.getElementById('progress-card').style.display='none'; document.getElementById('results-section').style.display=''; document.getElementById('extract-count').textContent=`(${state.items.length})`; renderTable(state, buildings); }, 300);
  };

  document.getElementById('btn-manual-ai').onclick = async () => {
    const text = document.getElementById('raw-text').value;
    if (!text.trim()) return;
    state.rawText = text;
    showProg('AI Extraction'); document.getElementById('prog-ai-badge').style.display = '';
    setProg(30, 'Sending to Claude AI…');
    state.items = await aiExtract(text);
    setProg(100, `Found ${state.items.length} items`);
    setTimeout(() => { document.getElementById('progress-card').style.display='none'; document.getElementById('results-section').style.display=''; document.getElementById('extract-count').textContent=`(${state.items.length})`; renderTable(state, buildings); }, 300);
  };

  const editBtn = document.getElementById('btn-edit-raw');
  editBtn.onclick = () => { const ta = document.getElementById('raw-text'); ta.readOnly = !ta.readOnly; editBtn.textContent = ta.readOnly ? 'Edit' : 'Lock'; };

  document.getElementById('btn-csv').onclick    = () => doExportCSV(state);
  document.getElementById('btn-import').onclick = () => showImportModal(state, buildings);
}

function renderTable(state, buildings) {
  const wrap = document.getElementById('results-wrap');
  if (!wrap) return;
  if (!state.items.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:32px"><p>No equipment found.</p><p style="font-size:11.5px;margin-top:4px">Try editing the raw text and clicking Re-run AI.</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <input type="search" id="tbl-search" class="input input-sm" placeholder="Filter…" style="max-width:180px">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;text-transform:none;letter-spacing:0;color:var(--text-dim);cursor:pointer">
        <input type="checkbox" id="chk-all" checked> Select All
      </label>
      <span id="sel-count" style="font-size:11.5px;color:var(--text-muted)"></span>
    </div>
    <div class="table-wrap">
    <table class="table" id="extract-tbl">
      <thead><tr>
        <th style="width:32px"></th>
        <th>Tag</th><th>Equipment Type</th><th>Make</th><th>Model</th>
        <th>Qty</th><th>Capacity/Size</th><th>Filter Size</th><th>Location</th><th>Notes</th>
        <th></th>
      </tr></thead>
      <tbody>
        ${state.items.map((item, i) => `<tr data-idx="${i}">
          <td><input type="checkbox" class="row-chk" data-idx="${i}" checked></td>
          <td><input class="input input-sm mono" data-f="tag" data-i="${i}" value="${x(item.tag)}" style="width:66px"></td>
          <td>
            <select class="input input-sm" data-f="equipment_type" data-i="${i}" style="min-width:160px">
              ${EQUIP_TYPES.map(t=>`<option value="${x(t)}"${t===item.equipment_type?' selected':''}>${x(t)}</option>`).join('')}
              ${!EQUIP_TYPES.includes(item.equipment_type)?`<option value="${x(item.equipment_type)}" selected>${x(item.equipment_type)}</option>`:''}
            </select>
          </td>
          <td><input class="input input-sm" data-f="make"      data-i="${i}" value="${x(item.make)}"       style="width:90px"></td>
          <td><input class="input input-sm" data-f="model"     data-i="${i}" value="${x(item.model)}"      style="width:90px"></td>
          <td><input class="input input-sm" data-f="quantity"  data-i="${i}" type="number" min="1" value="${item.quantity||1}" style="width:48px"></td>
          <td><input class="input input-sm" data-f="capacity"  data-i="${i}" value="${x(item.capacity)}"   style="width:100px"></td>
          <td><input class="input input-sm" data-f="filter_size" data-i="${i}" value="${x(item.filter_size)}" style="width:100px"></td>
          <td><input class="input input-sm" data-f="location"  data-i="${i}" value="${x(item.location)}"   style="width:100px"></td>
          <td style="max-width:160px;font-size:11.5px;color:var(--text-dim);white-space:normal">${x((item.notes||'').slice(0,80))}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-xs btn-secondary" data-form="${i}" title="Open intake form pre-filled">→ Form</button>
            <button class="btn btn-xs btn-danger" data-rm="${i}">✕</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;

  const tbody = wrap.querySelector('tbody');

  // Inline edit
  tbody.addEventListener('change', e => {
    if (!e.target.dataset.f) return;
    state.items[parseInt(e.target.dataset.i)][e.target.dataset.f] = e.target.value;
    updateSel();
  });

  // → Form (send single item to intake form)
  tbody.querySelectorAll('[data-form]').forEach(btn => {
    btn.onclick = async () => {
      const item = state.items[parseInt(btn.dataset.form)];
      let bldgs = [];
      try { bldgs = await Buildings.getAll(); } catch {}
      Equipment.openFormPrefill(item, bldgs);
    };
  });

  // Remove row
  tbody.querySelectorAll('[data-rm]').forEach(btn => {
    btn.onclick = () => {
      state.items.splice(parseInt(btn.dataset.rm), 1);
      document.getElementById('extract-count').textContent = `(${state.items.length})`;
      renderTable(state, buildings);
    };
  });

  // Select all
  const allChk = document.getElementById('chk-all');
  allChk.onchange = () => { wrap.querySelectorAll('.row-chk').forEach(c => c.checked = allChk.checked); updateSel(); };
  wrap.querySelectorAll('.row-chk').forEach(c => c.onchange = updateSel);

  document.getElementById('tbl-search').oninput = e => {
    const q = e.target.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach(tr => { tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  };

  updateSel();
  function updateSel() {
    const n = wrap.querySelectorAll('.row-chk:checked').length;
    const el = document.getElementById('sel-count');
    if (el) el.textContent = n ? `${n} selected` : '';
  }
}

function showImportModal(state, buildings) {
  const checked = [...document.querySelectorAll('.row-chk:checked')].map(c => parseInt(c.dataset.idx));
  if (!checked.length) { notify.warn('Select at least one item.'); return; }
  openModal('Import to Building', `
    <div class="form-group">
      <label>Building *</label>
      <select id="imp-bld" class="input">
        <option value="">— Select —</option>
        ${buildings.map(b=>`<option value="${b.id}">${x(b.name)}${b.client_name?' — '+x(b.client_name):''}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Service Area</label>
      <select id="imp-area" class="input">
        ${CONFIG.SERVICE_AREAS.map(a=>`<option value="${a.value}">${a.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Import Mode</label>
      <select id="imp-mode" class="input">
        <option value="append">Append — add to existing equipment</option>
        <option value="merge">Merge — skip if same tag already exists</option>
        <option value="replace">Replace — delete existing first, then import</option>
      </select>
    </div>
    <div class="alert alert-info" style="margin-top:10px">${checked.length} item(s) selected. Original OCR text will be preserved in records.</div>`,
    [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: `Import ${checked.length}`, class: 'btn-primary', onClick: () => runImport(state, checked) },
    ]
  );
}

async function runImport(state, indices) {
  const bid  = document.getElementById('imp-bld')?.value;
  const area = document.getElementById('imp-area')?.value;
  const mode = document.getElementById('imp-mode')?.value || 'append';
  if (!bid) { notify.warn('Select a building.'); return; }
  closeModal();

  // Replace mode: delete existing equipment first
  if (mode === 'replace') {
    try {
      const existing = await EquipDB.getByBuilding(bid);
      for (const ex of (existing||[])) { try { await EquipDB.delete(ex.id); } catch {} }
    } catch {}
  }

  // Merge mode: get existing tags for dedup
  let existingTags = new Set();
  if (mode === 'merge') {
    try {
      const ex = await EquipDB.getByBuilding(bid);
      existingTags = new Set((ex||[]).map(e => (e.tag||'').trim().toUpperCase()));
    } catch {}
  }

  const today = new Date().toISOString().slice(0,10);
  const batchId = Date.now().toString(36);
  let ok = 0, skip = 0, fail = 0;

  for (const i of indices) {
    const it = state.items[i];
    if (mode === 'merge' && it.tag && existingTags.has((it.tag||'').trim().toUpperCase())) { skip++; continue; }

    // Auto-fill std hours from EQUIPMASTER
    let qhrs = null, ahrs = null;
    try {
      const { findEquipType } = await import('./equipmaster.js');
      const std = findEquipType(it.equipment_type);
      if (std) { qhrs = std.quarterly_hours || null; ahrs = std.annual_hours || null; }
    } catch {}

    try {
      await EquipDB.create({
        building_id:    bid,
        tag:            it.tag || null,
        equipment_type: it.equipment_type || 'Other',
        manufacturer:   it.make || null,
        make:           it.make || null,
        model:          it.model || null,
        serial_number:  it.serial_number || null,
        service_area:   area || 'common_strata',
        status:         'active',
        qty:            parseInt(it.quantity) || 1,
        location:       it.location || null,
        capacity:       it.capacity || null,
        refrigerant:    it.refrigerant || null,
        notes:          [it.filter_size, it.voltage, it.notes].filter(Boolean).join(' | ') || null,
        ocr_raw:        it.notes || null,
        quarterly_hours: qhrs,
        annual_hours:    ahrs,
        review_status:   'needs-review',
        import_batch:    batchId,
        source_type:     'import',
        match_confidence: it.equipment_type && it.equipment_type !== 'Other' ? 'auto' : 'low',
        next_service_date: today,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      ok++;
    } catch { fail++; }
  }

  if (ok)   notify.success(`${ok} record(s) created.${skip?' '+skip+' skipped (merge)':''}${fail?' '+fail+' failed.':''}`);
  else if (skip) notify.info(`All ${skip} item(s) already exist (merge mode).`);
  else if (fail) notify.warn(`Import failed — check for schema issues.`);
}

function doExportCSV(state) {
  const hdr  = ['Tag','Type','Make','Model','Qty','Capacity','Filter Size','Location','Voltage','Refrigerant','Notes'];
  const rows = state.items.map(i=>[i.tag,i.equipment_type,i.make,i.model,i.quantity,i.capacity,i.filter_size,i.location,i.voltage,i.refrigerant,i.notes].map(v=>`"${String(v??'').replace(/"/g,'""')}"`));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([[hdr.join(','),...rows.map(r=>r.join(','))].join('\n')],{type:'text/csv'}));
  a.download = `equipment-extract-${Date.now()}.csv`;
  a.click();
  notify.success('CSV downloaded.');
}

function x(v) { return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
