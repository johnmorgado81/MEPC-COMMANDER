// document-parser.js — AI-assisted mechanical equipment extraction
import { notify, spinner, openModal, closeModal } from './ui.js';
import { Buildings, Equipment } from './db.js';
import { CONFIG } from './config.js';
import { EQUIPMASTER } from './equipmaster.js';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

const EQUIP_TYPES_LIST = (() => {
  const types = new Set();
  (EQUIPMASTER || []).forEach(e => { if (e.equipment_type) types.add(e.equipment_type); });
  CONFIG.EQUIPMENT_TYPES.forEach(t => types.add(t));
  return [...types].sort();
})();

export async function renderDocumentParser(container) {
  let buildings = [];
  try { buildings = await Buildings.getAll(); } catch {}

  container.innerHTML = `
    <div class="page-wrap">
      <div class="toolbar">
        <div>
          <div style="font-family:var(--font-cond);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)">Document Parser</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px">Extract equipment from PDFs, drawings, spreadsheets, and service reports. AI-assisted MEPC vocabulary matching.</div>
        </div>
        <div class="toolbar-right"><span class="ai-badge">✦ Claude AI</span></div>
      </div>

      <div class="card" id="upload-card">
        <div class="card-header"><h3>Upload Document</h3></div>
        <div class="card-body">
          <div class="drop-zone" id="drop-zone">
            <span class="drop-zone-icon">📂</span>
            <div class="drop-zone-text">Drop file here or click to browse</div>
            <div class="drop-zone-sub">PDF · DOCX · XLSX · CSV · PNG/JPG (OCR)</div>
            <input type="file" id="file-input" accept=".pdf,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg" style="display:none">
          </div>
        </div>
      </div>

      <div id="parse-progress-card" style="display:none">
        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3 id="progress-title">Processing</h3>
            <span id="progress-badge" class="ai-badge" style="display:none">✦ AI Analysis</span>
          </div>
          <div class="card-body">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
            <div id="progress-msg" style="font-size:12px;color:var(--text-dim);margin-top:8px"></div>
          </div>
        </div>
      </div>

      <div id="results-section" style="display:none">
        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3>Extracted Equipment <span id="extract-count" style="color:var(--orange);margin-left:6px"></span></h3>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-sm btn-secondary" id="ai-reanalyze-btn">✦ Re-analyze with AI</button>
              <button class="btn btn-sm btn-secondary" id="export-csv-btn">Export CSV</button>
              <button class="btn btn-sm btn-primary" id="import-btn">Import to Building</button>
            </div>
          </div>
          <div class="card-body no-pad"><div id="results-table-wrap"></div></div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3>Raw Extracted Text</h3>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm btn-primary" id="manual-ai-btn">✦ Run AI on This Text</button>
              <button class="btn btn-sm btn-secondary" id="edit-raw-btn">Edit</button>
            </div>
          </div>
          <div class="card-body">
            <textarea id="raw-text-area" class="input" rows="8" style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-dim)" readonly></textarea>
          </div>
        </div>
      </div>
    </div>`;

  const state = { rawText: '', items: [], fileName: '' };
  setupDropZone(state, buildings);
}

function setupDropZone(state, buildings) {
  const zone = document.getElementById('drop-zone');
  const inp  = document.getElementById('file-input');
  zone.onclick = () => inp.click();
  inp.onchange = e => e.target.files[0] && processFile(e.target.files[0], state, buildings);
  zone.ondragover  = e => { e.preventDefault(); zone.classList.add('drag-over'); };
  zone.ondragleave = () => zone.classList.remove('drag-over');
  zone.ondrop = e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) processFile(f, state, buildings);
  };
}

async function processFile(file, state, buildings) {
  state.fileName = file.name;
  const ext = file.name.split('.').pop().toLowerCase();
  showProgress('Parsing Document');
  setProgress(10, `Reading ${file.name}…`);

  try {
    let text = '';
    if (ext === 'pdf')                 text = await extractPDF(file);
    else if (ext === 'docx')           text = await extractDOCX(file);
    else if (['xlsx','xls'].includes(ext)) text = await extractXLSX(file);
    else if (ext === 'csv')            text = await extractCSV(file);
    else if (['png','jpg','jpeg'].includes(ext)) text = await extractOCR(file);
    else throw new Error(`Unsupported file type: .${ext}`);

    state.rawText = text;
    setProgress(60, 'Running AI equipment extraction…');
    document.getElementById('progress-badge').style.display = '';

    const items = await aiExtract(text);
    state.items = items;
    setProgress(100, `Found ${items.length} equipment item(s)`);
    setTimeout(() => showResults(state, buildings), 400);
  } catch (err) {
    document.getElementById('parse-progress-card').style.display = 'none';
    notify.error(err.message || 'Parse failed');
  }
}

async function extractPDF(file) {
  if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const ab  = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
  const pages = Math.min(pdf.numPages, 80);
  let text = '';
  for (let i = 1; i <= pages; i++) {
    setProgress(10 + Math.floor((i / pages) * 40), `Reading page ${i} of ${pages}…`);
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += `\n--- PAGE ${i} ---\n` + content.items.map(it => it.str).join(' ');
  }
  if (text.trim().length < 80) throw new Error('PDF has no extractable text. Use a PNG/JPG for OCR on scanned documents.');
  return text;
}

async function extractDOCX(file) {
  if (!window.mammoth) throw new Error('Mammoth.js not loaded');
  const ab = await file.arrayBuffer();
  const r  = await mammoth.extractRawText({ arrayBuffer: ab });
  if (!r.value || r.value.trim().length < 10) throw new Error('No text found in DOCX');
  return r.value;
}

async function extractXLSX(file) {
  if (!window.XLSX) throw new Error('SheetJS not loaded');
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });
  let text = '';
  wb.SheetNames.forEach(name => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
    text += `\n=== SHEET: ${name} ===\n` + rows.map(r => r.map(c => String(c)).join('\t')).join('\n');
  });
  return text;
}

function extractCSV(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = () => rej(new Error('Failed to read CSV'));
    r.readAsText(file);
  });
}

async function extractOCR(file) {
  if (!window.Tesseract) throw new Error('Tesseract.js not loaded');
  setProgress(20, 'Running OCR — may take 30–60 seconds…');
  const result = await Tesseract.recognize(file, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text')
        setProgress(20 + Math.floor(m.progress * 35), `OCR: ${Math.floor(m.progress * 100)}%…`);
    }
  });
  if (!result.data.text?.trim()) throw new Error('OCR found no readable text');
  return result.data.text;
}

async function aiExtract(rawText) {
  const truncated = rawText.slice(0, 14000);
  const typeList  = EQUIP_TYPES_LIST.slice(0, 80).join(', ');
  let response;
  try {
    response = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a mechanical systems expert. Extract all mechanical equipment items from the document text.

Return ONLY a valid JSON array. No explanation, no markdown, no backticks. Just raw JSON.

Each object: { tag, equipment_type, location, make, model, quantity, notes }
Match equipment_type to: ${typeList}
Use "—" for any field not found. Default quantity to 1.

If nothing found, return: []

Document:
${truncated}`
        }]
      })
    });
  } catch { return fallbackExtract(rawText); }

  if (!response.ok) return fallbackExtract(rawText);

  let data;
  try { data = await response.json(); } catch { return fallbackExtract(rawText); }

  const content = (data.content || []).find(b => b.type === 'text')?.text || '[]';
  try {
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}

  return fallbackExtract(rawText);
}

function fallbackExtract(text) {
  const items = [];
  const seenTags = new Set();
  const tagRe = /\b([A-Z]{1,4}-?\d{1,4}[A-Z]?)\b/g;

  text.split('\n').map(l => l.trim()).filter(l => l.length > 3).forEach(line => {
    const ll = line.toLowerCase();
    const matched = EQUIP_TYPES_LIST.find(t =>
      t.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2).every(w => ll.includes(w))
    );
    if (!matched) return;
    const tags = [...line.matchAll(tagRe)].map(m => m[1]);
    const tag  = tags[0] || '—';
    const key  = `${matched}-${tag}`;
    if (seenTags.has(key)) return;
    seenTags.add(key);
    items.push({ tag, equipment_type: matched, location: '—', make: '—', model: '—', quantity: 1, notes: line.slice(0, 120) });
  });

  return items.slice(0, 100);
}

function showProgress(title) {
  document.getElementById('parse-progress-card').style.display = '';
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('progress-title').textContent = title;
  document.getElementById('progress-badge').style.display = 'none';
  setProgress(5, 'Starting…');
}
function setProgress(pct, msg) {
  const f = document.getElementById('progress-fill');
  const m = document.getElementById('progress-msg');
  if (f) f.style.width = pct + '%';
  if (m) m.textContent = msg;
}

function showResults(state, buildings) {
  document.getElementById('parse-progress-card').style.display = 'none';
  document.getElementById('results-section').style.display = '';
  const ra = document.getElementById('raw-text-area');
  if (ra) ra.value = state.rawText;
  renderTable(state);
  document.getElementById('extract-count').textContent = `(${state.items.length})`;

  document.getElementById('ai-reanalyze-btn').onclick = async () => {
    showProgress('Re-analyzing');
    document.getElementById('progress-badge').style.display = '';
    setProgress(30, 'Sending to Claude AI…');
    state.items = await aiExtract(state.rawText);
    setProgress(100, `Found ${state.items.length} items`);
    setTimeout(() => {
      document.getElementById('parse-progress-card').style.display = 'none';
      document.getElementById('results-section').style.display = '';
      document.getElementById('extract-count').textContent = `(${state.items.length})`;
      renderTable(state);
    }, 300);
  };

  document.getElementById('manual-ai-btn').onclick = async () => {
    const text = document.getElementById('raw-text-area').value;
    if (!text.trim()) return;
    state.rawText = text;
    showProgress('AI Extraction');
    document.getElementById('progress-badge').style.display = '';
    setProgress(30, 'Sending to Claude AI…');
    state.items = await aiExtract(text);
    setProgress(100, `Found ${state.items.length} items`);
    setTimeout(() => {
      document.getElementById('parse-progress-card').style.display = 'none';
      document.getElementById('results-section').style.display = '';
      document.getElementById('extract-count').textContent = `(${state.items.length})`;
      renderTable(state);
    }, 300);
  };

  document.getElementById('edit-raw-btn').onclick = () => {
    const ta = document.getElementById('raw-text-area');
    ta.readOnly = !ta.readOnly;
    document.getElementById('edit-raw-btn').textContent = ta.readOnly ? 'Edit' : 'Lock';
  };

  document.getElementById('export-csv-btn').onclick = () => exportCSV(state);
  document.getElementById('import-btn').onclick = () => showImportModal(state, buildings);
}

function renderTable(state) {
  const wrap = document.getElementById('results-table-wrap');
  if (!wrap) return;

  if (!state.items.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:32px">
      <p>No equipment found.</p>
      <p style="font-size:11.5px;margin-top:4px">Edit raw text above and re-run AI extraction.</p>
    </div>`;
    return;
  }

  wrap.innerHTML = `
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
      <input type="search" id="result-search" class="input input-sm" placeholder="Filter…" style="max-width:200px">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;text-transform:none;letter-spacing:0;color:var(--text-dim);cursor:pointer">
        <input type="checkbox" id="select-all-chk" checked> Select All
      </label>
      <span id="sel-count" style="font-size:11.5px;color:var(--text-muted)"></span>
    </div>
    <div class="table-wrap">
    <table class="table" id="results-table">
      <thead><tr>
        <th style="width:36px"></th><th>Tag</th><th>Equipment Type</th><th>Location</th><th>Make</th><th>Model</th><th>Qty</th><th></th>
      </tr></thead>
      <tbody>
        ${state.items.map((item, i) => `<tr data-idx="${i}">
          <td><input type="checkbox" class="row-chk" data-idx="${i}" checked></td>
          <td><input class="input input-sm mono" data-field="tag" data-idx="${i}" value="${esc(item.tag)}" style="width:68px"></td>
          <td>
            <select class="input input-sm" data-field="equipment_type" data-idx="${i}" style="min-width:170px">
              ${EQUIP_TYPES_LIST.map(t => `<option value="${esc(t)}"${t===item.equipment_type?' selected':''}>${esc(t)}</option>`).join('')}
            </select>
          </td>
          <td><input class="input input-sm" data-field="location" data-idx="${i}" value="${esc(item.location)}" style="width:110px"></td>
          <td><input class="input input-sm" data-field="make" data-idx="${i}" value="${esc(item.make)}" style="width:90px"></td>
          <td><input class="input input-sm" data-field="model" data-idx="${i}" value="${esc(item.model)}" style="width:90px"></td>
          <td><input class="input input-sm" data-field="quantity" data-idx="${i}" type="number" min="1" value="${item.quantity||1}" style="width:50px"></td>
          <td><button class="btn btn-xs btn-danger" data-remove="${i}">✕</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;

  const tbody = wrap.querySelector('tbody');

  tbody.addEventListener('change', e => {
    if (!e.target.dataset.field) return;
    const idx = parseInt(e.target.dataset.idx);
    state.items[idx][e.target.dataset.field] = e.target.value;
    updateSel();
  });

  tbody.querySelectorAll('[data-remove]').forEach(btn => {
    btn.onclick = () => {
      state.items.splice(parseInt(btn.dataset.remove), 1);
      document.getElementById('extract-count').textContent = `(${state.items.length})`;
      renderTable(state);
    };
  });

  const allChk = document.getElementById('select-all-chk');
  allChk.onchange = () => { wrap.querySelectorAll('.row-chk').forEach(c => c.checked = allChk.checked); updateSel(); };
  wrap.querySelectorAll('.row-chk').forEach(c => c.onchange = updateSel);

  document.getElementById('result-search').oninput = e => {
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
  if (!checked.length) { notify.warn('Select at least one item to import.'); return; }

  openModal('Import to Building', `
    <div class="form-group">
      <label>Target Building *</label>
      <select id="import-bld" class="input">
        <option value="">— Select —</option>
        ${buildings.map(b => `<option value="${b.id}">${esc(b.name)}${b.client_name ? ' — ' + esc(b.client_name) : ''}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Service Area</label>
      <select id="import-area" class="input">
        ${CONFIG.SERVICE_AREAS.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
      </select>
    </div>
    <div class="alert alert-info" style="margin-top:10px">${checked.length} item(s) will be imported.</div>`,
    [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: `Import ${checked.length} Items`, class: 'btn-primary', onClick: () => runImport(state, checked) },
    ]
  );
}

async function runImport(state, indices) {
  const bid  = document.getElementById('import-bld')?.value;
  const area = document.getElementById('import-area')?.value;
  if (!bid) { notify.warn('Select a building.'); return; }
  closeModal();

  const today = new Date().toISOString().slice(0, 10);
  let ok = 0, fail = 0;

  for (const idx of indices) {
    const item = state.items[idx];
    try {
      await Equipment.create({
        building_id:    bid,
        tag:            item.tag === '—' ? null : item.tag,
        equipment_type: item.equipment_type,
        location:       item.location === '—' ? null : item.location,
        make:           item.make === '—' ? null : item.make,
        model:          item.model === '—' ? null : item.model,
        service_area:   area || 'common_strata',
        status:         'active',
        quantity:       parseInt(item.quantity) || 1,
        notes:          item.notes || null,
        next_service_date: today,
        created_at:     new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      });
      ok++;
    } catch { fail++; }
  }

  if (ok)   notify.success(`${ok} equipment record(s) created.`);
  if (fail) notify.warn(`${fail} item(s) failed — check for duplicate tags.`);
}

function exportCSV(state) {
  const hdr  = ['Tag','Equipment Type','Location','Make','Model','Quantity','Notes'];
  const rows = state.items.map(i => [i.tag,i.equipment_type,i.location,i.make,i.model,i.quantity,i.notes||''].map(v=>`"${String(v).replace(/"/g,'""')}"`));
  const csv  = [hdr.join(','),...rows.map(r=>r.join(','))].join('\n');
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `equipment-extract-${Date.now()}.csv`;
  a.click();
  notify.success('CSV downloaded.');
}

function esc(v) {
  return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
