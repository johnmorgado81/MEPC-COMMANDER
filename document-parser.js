// document-parser.js — Parse PDFs, Word docs, spreadsheets, and mechanical drawings
// Uses: PDF.js (CDN), SheetJS (CDN), mammoth.js (CDN)
// All parsing is client-side — no server required.

import { notify } from './ui.js';
import { DB } from '../db.js';

// ─────────────────────────────────────────────
// Main Render
// ─────────────────────────────────────────────
export async function renderDocumentParser(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Document Parser</h1>
      <p class="page-sub">Import equipment lists, maintenance reports, deficiencies, or quote data from external files.</p>
    </div>

    <div class="parser-grid">
      <div class="parser-card" data-type="pdf">
        <div class="parser-icon">PDF</div>
        <div class="parser-title">PDF Report</div>
        <div class="parser-desc">Extract text from maintenance reports, proposals, or service records.</div>
      </div>
      <div class="parser-card" data-type="word">
        <div class="parser-icon">DOC</div>
        <div class="parser-title">Word Document</div>
        <div class="parser-desc">Extract text from .docx scopes of work, specs, or reports.</div>
      </div>
      <div class="parser-card" data-type="spreadsheet">
        <div class="parser-icon">XLS</div>
        <div class="parser-title">Spreadsheet</div>
        <div class="parser-desc">Import equipment lists, pricing matrices, or deficiency logs from .xlsx/.csv files.</div>
      </div>
      <div class="parser-card" data-type="drawing">
        <div class="parser-icon">DWG</div>
        <div class="parser-title">Mechanical Drawing</div>
        <div class="parser-desc">Preview and annotate uploaded mechanical drawings (PDF format).</div>
      </div>
    </div>

    <div id="parser-workspace" class="parser-workspace hidden"></div>
  `;

  container.querySelectorAll('.parser-card').forEach(card => {
    card.addEventListener('click', () => openParserWorkspace(card.dataset.type));
  });
}

// ─────────────────────────────────────────────
// Workspace router
// ─────────────────────────────────────────────
function openParserWorkspace(type) {
  const ws = document.getElementById('parser-workspace');
  ws.classList.remove('hidden');
  ws.scrollIntoView({ behavior: 'smooth' });

  const configs = {
    pdf:         { label: 'PDF Report',      accept: '.pdf',                  handler: parsePDF },
    word:        { label: 'Word Document',   accept: '.docx',                 handler: parseWord },
    spreadsheet: { label: 'Spreadsheet',     accept: '.xlsx,.xls,.csv',       handler: parseSpreadsheet },
    drawing:     { label: 'Mechanical Drawing (PDF)', accept: '.pdf',         handler: parseDrawing },
  };

  const cfg = configs[type];

  ws.innerHTML = `
    <div class="parser-ws-header">
      <h2>${cfg.label}</h2>
    </div>
    <div class="drop-zone" id="drop-zone">
      <p>Drag & drop a file here, or</p>
      <label class="btn btn-primary">
        Select File
        <input type="file" id="file-input" accept="${cfg.accept}" style="display:none">
      </label>
      <p class="drop-hint">Accepted: ${cfg.accept}</p>
    </div>
    <div id="parse-result" class="parse-result hidden"></div>
  `;

  setupDropZone('drop-zone', 'file-input', cfg.handler);
}

// ─────────────────────────────────────────────
// Drop zone / file input wiring
// ─────────────────────────────────────────────
function setupDropZone(zoneId, inputId, handler) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  input.addEventListener('change', e => {
    if (e.target.files[0]) handler(e.target.files[0]);
  });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-active'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-active');
    if (e.dataTransfer.files[0]) handler(e.dataTransfer.files[0]);
  });
}

// ─────────────────────────────────────────────
// PDF Parser
// ─────────────────────────────────────────────
async function parsePDF(file) {
  const el = document.getElementById('parse-result');
  el.classList.remove('hidden');
  el.innerHTML = '<div class="parse-loading">Parsing PDF...</div>';

  try {
    if (typeof pdfjsLib === 'undefined') {
      el.innerHTML = errorMsg('PDF.js library not loaded. Check your internet connection.');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(s => s.str).join(' ') + '\n';
    }

    const equipment = extractEquipmentFromText(fullText);
    const deficiencies = extractDeficienciesFromText(fullText);

    el.innerHTML = `
      <div class="parse-section">
        <h3>Extracted Text (${pdf.numPages} pages)</h3>
        <textarea class="parse-text-preview" rows="10" readonly>${fullText.slice(0, 3000)}${fullText.length > 3000 ? '\n\n[truncated — ' + fullText.length + ' chars total]' : ''}</textarea>
      </div>
      ${equipment.length > 0 ? renderExtractedEquipment(equipment) : ''}
      ${deficiencies.length > 0 ? renderExtractedDeficiencies(deficiencies) : ''}
      <div class="parse-actions">
        <button class="btn btn-secondary" onclick="copyToClipboard()">Copy Text</button>
      </div>
    `;

    window._parsedText = fullText;
    window.copyToClipboard = () => {
      navigator.clipboard.writeText(fullText).then(() => notify('Text copied to clipboard', 'success'));
    };

    bindImportHandlers();
  } catch (e) {
    el.innerHTML = errorMsg('Failed to parse PDF: ' + e.message);
  }
}

// ─────────────────────────────────────────────
// Word Parser
// ─────────────────────────────────────────────
async function parseWord(file) {
  const el = document.getElementById('parse-result');
  el.classList.remove('hidden');
  el.innerHTML = '<div class="parse-loading">Parsing Word document...</div>';

  try {
    if (typeof mammoth === 'undefined') {
      el.innerHTML = errorMsg('Mammoth.js library not loaded. Check your internet connection.');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    const equipment = extractEquipmentFromText(text);
    const deficiencies = extractDeficienciesFromText(text);

    el.innerHTML = `
      <div class="parse-section">
        <h3>Extracted Text</h3>
        <textarea class="parse-text-preview" rows="10" readonly>${text.slice(0, 3000)}${text.length > 3000 ? '\n\n[truncated]' : ''}</textarea>
      </div>
      ${equipment.length > 0 ? renderExtractedEquipment(equipment) : ''}
      ${deficiencies.length > 0 ? renderExtractedDeficiencies(deficiencies) : ''}
    `;

    bindImportHandlers();
  } catch (e) {
    el.innerHTML = errorMsg('Failed to parse Word file: ' + e.message);
  }
}

// ─────────────────────────────────────────────
// Spreadsheet Parser
// ─────────────────────────────────────────────
async function parseSpreadsheet(file) {
  const el = document.getElementById('parse-result');
  el.classList.remove('hidden');
  el.innerHTML = '<div class="parse-loading">Parsing spreadsheet...</div>';

  try {
    if (typeof XLSX === 'undefined') {
      el.innerHTML = errorMsg('SheetJS (XLSX) library not loaded. Check your internet connection.');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetNames = workbook.SheetNames;
    let html = `<div class="parse-section"><h3>Sheets Found: ${sheetNames.join(', ')}</h3></div>`;

    // Process first sheet by default
    const sheet = workbook.Sheets[sheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      el.innerHTML = html + '<p>No data found in first sheet.</p>';
      return;
    }

    const headers = Object.keys(rows[0]);
    const detectedType = detectSpreadsheetType(headers);

    html += `
      <div class="parse-section">
        <h3>Data Preview (${rows.length} rows detected — ${detectedType})</h3>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.slice(0, 20).map(row =>
                `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </div>
        ${rows.length > 20 ? `<p class="parse-hint">Showing 20 of ${rows.length} rows.</p>` : ''}
      </div>
    `;

    if (detectedType === 'equipment') {
      html += renderSpreadsheetImport('equipment', rows, 'Import as Equipment');
    } else if (detectedType === 'deficiencies') {
      html += renderSpreadsheetImport('deficiencies', rows, 'Import as Deficiencies');
    } else if (detectedType === 'pricing') {
      html += renderSpreadsheetImport('pricing', rows, 'Import as Pricing Matrix');
    } else {
      html += `<div class="parse-actions">
        <p class="parse-hint">Column headers don't match a known import type. You can still review and copy the data.</p>
      </div>`;
    }

    el.innerHTML = html;
    bindSpreadsheetImport(detectedType, rows);
  } catch (e) {
    el.innerHTML = errorMsg('Failed to parse spreadsheet: ' + e.message);
  }
}

// ─────────────────────────────────────────────
// Drawing Viewer (PDF-based)
// ─────────────────────────────────────────────
async function parseDrawing(file) {
  const el = document.getElementById('parse-result');
  el.classList.remove('hidden');
  el.innerHTML = '<div class="parse-loading">Loading drawing...</div>';

  try {
    if (typeof pdfjsLib === 'undefined') {
      el.innerHTML = errorMsg('PDF.js not loaded. Required for drawing preview.');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    el.innerHTML = `
      <div class="parse-section">
        <h3>${file.name} — ${pdf.numPages} page(s)</h3>
        <div class="drawing-nav">
          <button class="btn btn-sm" id="prev-page">◀ Prev</button>
          <span id="page-indicator">Page 1 of ${pdf.numPages}</span>
          <button class="btn btn-sm" id="next-page">Next ▶</button>
        </div>
        <canvas id="drawing-canvas" class="drawing-canvas"></canvas>
        <div class="parse-hint">DWG/DXF native rendering is not supported. Upload as PDF for best results.</div>
      </div>
    `;

    let currentPage = 1;

    const renderPage = async (num) => {
      const page = await pdf.getPage(num);
      const canvas = document.getElementById('drawing-canvas');
      const ctx = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.4 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      document.getElementById('page-indicator').textContent = `Page ${num} of ${pdf.numPages}`;
    };

    document.getElementById('prev-page').addEventListener('click', () => {
      if (currentPage > 1) renderPage(--currentPage);
    });
    document.getElementById('next-page').addEventListener('click', () => {
      if (currentPage < pdf.numPages) renderPage(++currentPage);
    });

    renderPage(1);
  } catch (e) {
    el.innerHTML = errorMsg('Failed to load drawing: ' + e.message);
  }
}

// ─────────────────────────────────────────────
// Text extraction helpers
// Vocabulary driven by EQUIPMASTER.xlsx (174 types across 13 categories)
// ─────────────────────────────────────────────

// All known equipment type strings from EQUIPMASTER — matched case-insensitively
const EQUIP_VOCAB = [
  'air handling unit','ahu','rooftop unit','rtu','fan coil unit','fcu',
  'make-up air unit','mau','heat recovery ventilator','hrv','energy recovery ventilator','erv',
  'variable air volume','vav','unit ventilator','uv','split system','dx unit','vrf',
  'hot water boiler','steam boiler','condensing boiler','boiler',
  'chiller','cooling tower','condenser',
  'plate heat exchanger','shell and tube','heat exchanger',
  'circulation pump','domestic water pump','sump pump','duplex sump pump',
  'storm pump','condensate pump','booster pump','pump',
  'expansion tank','bladder tank','pressure tank',
  'backflow preventer','rpz','dcva','pvb',
  'pressure reducing valve','prv','pressure relief valve',
  'domestic hot water heater','storage tank','indirect water heater','dhw','water heater',
  'exhaust fan','supply fan','ahu fan','belt drive fan','direct drive fan','fan',
  'bas controller','ddc','bas panel','network controller','thermostat','vfd',
  'generator','transfer switch','ups','fuel oil tank','day tank','fuel transfer pump',
  'chemical feeder','side stream filter','conductivity controller','water treatment',
  'pool pump','pool filter','pool heater',
  'snow melt pump','radiant pump','manifold',
  'air compressor','air dryer','air receiver',
  'pressure gauge','temperature gauge','flow meter',
  'ball valve','butterfly valve','check valve','gate valve','control valve','solenoid valve',
  'grease interceptor','sand interceptor','sewage ejector','lift station',
  'irrigation pump','irrigation controller','irrigation backflow',
  'condensate drain','trap','strainer','y-strainer',
];

// Build a single regex from vocab (longest first to avoid partial matches)
const EQUIP_REGEX = new RegExp(
  '(' + EQUIP_VOCAB.sort((a,b) => b.length - a.length).map(e =>
    e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|') + ')',
  'gi'
);

// Tag prefix patterns (from EQUIPMASTER tag_prefix column)
const TAG_PATTERN = /\b([A-Z]{1,4})-?\d{1,3}[A-Z]?\b/g;

// Manufacturer names (partial list from EQUIPMASTER manufacturers column)
const MFR_VOCAB = [
  'trane','carrier','daikin','york','lennox','aaon','temtrol','engineered air',
  'viessmann','lochinvar','raypak','cleaver-brooks','weil-mclain','nti','ibc','aerco',
  'grundfos','taco','armstrong','bell gossett','b&g','xylem','goulds','armstrong',
  'honeywell','siemens','johnson controls','schneider','delta controls','distech','alerton',
  'ao smith','bradford white','rheem','navien','rinnai','noritz','bosch','john wood',
  'pentair','hayward','sta-rite','watts','wilkins','febco','apollo','victaulic',
  'belimo','johnson','danfoss','spirax','armstrong','amtrol','wessels',
];
const MFR_REGEX = new RegExp('\\b(' + MFR_VOCAB.join('|') + ')\\b', 'gi');

function extractEquipmentFromText(text) {
  const lines   = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  const seen    = new Set();

  for (const line of lines) {
    // Find equipment type matches
    const typeMatches = [...line.matchAll(EQUIP_REGEX)];
    for (const match of typeMatches) {
      const type = match[1];
      // Find tag on same line
      const tags = [...line.matchAll(TAG_PATTERN)].map(m => m[0]);
      // Find manufacturer on same line
      const mfrs = [...line.matchAll(MFR_REGEX)].map(m => m[1]);
      // Clean location: text after type mention, up to punctuation
      const afterType = line.slice(match.index + type.length).replace(/^[\s\-:,]+/, '').split(/[,;.]/)[0].trim();
      const location  = afterType.length > 3 && afterType.length < 60 ? afterType : '';

      const key = (type + tags[0] + location).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        raw:          line.slice(0, 120),
        type:         type,
        tag:          tags[0] || '',
        manufacturer: mfrs[0] || '',
        location:     location,
        confidence:   typeMatches.length === 1 && (tags.length > 0 || mfrs.length > 0)
                      ? 'high' : tags.length > 0 ? 'medium' : 'low',
      });
    }
  }

  return results.slice(0, 100);
}

function extractDeficienciesFromText(text) {
  const results = [];
  const patterns = [
    /deficien[a-z]*/i, /recommend[a-z]*/i, /repair[a-z]*/i, /replace[a-z]*/i,
    /leak/i, /fault/i, /fail/i, /broken/i, /damaged/i, /corroded/i, /worn/i,
    /seized/i, /noise/i, /vibrat/i, /overheating/i, /tripping/i, /locked out/i,
  ];
  const lines = text.split('\n');
  lines.forEach(line => {
    if (patterns.some(p => p.test(line)) && line.trim().length > 10 && line.trim().length < 300) {
      results.push(line.trim());
    }
  });
  return [...new Set(results)].slice(0, 30);
}

// ─────────────────────────────────────────────
// Spreadsheet type detection
// ─────────────────────────────────────────────
function detectSpreadsheetType(headers) {
  const h = headers.map(x => x.toLowerCase().replace(/[\s_-]/g, ''));
  if (h.some(x => x.includes('equipmenttype') || x.includes('serialnumber') || x.includes('make'))) return 'equipment';
  if (h.some(x => x.includes('deficiency') || x.includes('priority') || x.includes('repair'))) return 'deficiencies';
  if (h.some(x => x.includes('price') || x.includes('frequency') || x.includes('margin'))) return 'pricing';
  return 'unknown';
}

// ─────────────────────────────────────────────
// Render helpers
// ─────────────────────────────────────────────
function renderExtractedEquipment(items) {
  const confBadge = c => c === 'high'
    ? `<span class="badge badge-success">High</span>`
    : c === 'medium'
    ? `<span class="badge badge-warn">Medium</span>`
    : `<span class="badge badge-muted">Low</span>`;

  return `
    <div class="parse-section">
      <h3>Equipment Detected (${items.length} items)</h3>
      <p class="text-muted" style="font-size:12px;margin-bottom:10px">
        Review before importing. Low-confidence items should be verified manually.
      </p>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Confidence</th><th>Type</th><th>Tag</th><th>Manufacturer</th><th>Location</th></tr></thead>
          <tbody>
            ${items.map(e => `<tr>
              <td>${confBadge(e.confidence)}</td>
              <td>${e.type}</td>
              <td class="text-muted">${e.tag || '—'}</td>
              <td class="text-muted">${e.manufacturer || '—'}</td>
              <td class="text-muted">${e.location || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="parse-hint" style="margin-top:8px">
        ⚠ Uncertain fields shown as — . Do not import without verifying.
      </p>
    </div>
  `;
}

function renderExtractedDeficiencies(items) {
  return `
    <div class="parse-section">
      <h3>Potential Deficiencies / Recommendations (${items.length} found)</h3>
      <ul class="parse-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>
  `;
}

function renderSpreadsheetImport(type, rows, label) {
  return `
    <div class="parse-actions">
      <button class="btn btn-primary" id="spreadsheet-import-btn" data-type="${type}">
        ${label} (${rows.length} rows)
      </button>
    </div>
  `;
}

// ─────────────────────────────────────────────
// Import handlers
// ─────────────────────────────────────────────
function bindImportHandlers() {
  const equipBtn = document.getElementById('import-equipment-btn');
  if (equipBtn) {
    equipBtn.addEventListener('click', async () => {
      notify('Equipment import: select a building in the Equipment module and add entries manually, or use the spreadsheet importer for bulk import.', 'info');
    });
  }
}

function bindSpreadsheetImport(type, rows) {
  const btn = document.getElementById('spreadsheet-import-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (type === 'pricing') {
      await importPricingRows(rows, btn);
    } else {
      notify('For equipment and deficiency imports, map columns to a building first using the Equipment or Deficiencies module.', 'info');
    }
  });
}

async function importPricingRows(rows, btn) {
  btn.disabled = true;
  btn.textContent = 'Importing...';
  let count = 0;
  let errors = 0;
  for (const row of rows) {
    const equipType = row['equipment_type'] || row['Equipment Type'] || row['EquipmentType'];
    const frequency = row['service_frequency'] || row['Frequency'] || row['frequency'];
    const sellPrice = parseFloat(row['sell_price'] || row['Sell Price'] || row['Price'] || 0);
    if (!equipType || !frequency || !sellPrice) { errors++; continue; }
    try {
      await DB.PricingMatrix.upsert({ equipment_type: equipType, service_frequency: frequency, sell_price: sellPrice, active: true });
      count++;
    } catch { errors++; }
  }
  notify(`Imported ${count} pricing rows. ${errors > 0 ? errors + ' skipped (missing fields).' : ''}`, count > 0 ? 'success' : 'error');
  btn.disabled = false;
  btn.textContent = 'Import Complete';
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────
function errorMsg(msg) {
  return `<div class="error-msg">${msg}</div>`;
}
