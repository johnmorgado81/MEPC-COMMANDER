// dispatch-ocr.js — Screenshot-based dispatch intake
// Uploads a screenshot from Service Fusion or Jobber dispatch screen,
// runs Tesseract.js OCR, and maps extracted text to dispatch/job fields.
//
// LIMITATIONS (v1.1):
//   - OCR accuracy depends on screenshot quality and font rendering
//   - Works best on high-DPI screenshots with clear text (not handwriting)
//   - Pattern matching is heuristic — uncertain fields are flagged for review
//   - Does not support rotated, blurry, or compressed screenshots well
//   - DWG/DXF not supported

import { notify } from './ui.js';
import { Buildings, DB as _db } from '../db.js';

// Field extraction patterns tuned for Service Fusion and Jobber UI layouts
const PATTERNS = {
  job_number:   [/#([A-Z0-9\-]+)/, /job\s*#?\s*:?\s*([A-Z0-9\-]+)/i, /WO[#:\s]*([0-9]+)/i],
  client_name:  [/client\s*:?\s*(.+)/i, /customer\s*:?\s*(.+)/i, /account\s*:?\s*(.+)/i],
  address:      [/(\d+\s+[\w\s]+(?:St|Ave|Blvd|Rd|Dr|Way|Pl|Cres|Court|Ct|Lane|Ln|Hwy)[^\n]*)/i,
                 /address\s*:?\s*(.+)/i, /location\s*:?\s*(.+)/i],
  phone:        [/(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/],
  description:  [/description\s*:?\s*(.+)/i, /problem\s*:?\s*(.+)/i,
                 /complaint\s*:?\s*(.+)/i, /scope\s*:?\s*(.+)/i, /issue\s*:?\s*(.+)/i],
  scheduled:    [/schedul(?:ed|ing)\s*:?\s*(.+)/i, /date\s*:?\s*(.+)/i,
                 /appt\s*:?\s*(.+)/i, /appointment\s*:?\s*(.+)/i],
  technician:   [/tech(?:nician)?\s*:?\s*(.+)/i, /assigned\s*(?:to)?\s*:?\s*(.+)/i,
                 /dispatch(?:ed)?\s*to\s*:?\s*(.+)/i],
  priority:     [/priority\s*:?\s*(urgent|high|medium|low|emergency|normal)/i,
                 /(urgent|emergency|high\s*priority)/i],
};

// Confidence: CERTAIN = matched cleanly, REVIEW = guessed or partial, MISSING = not found
const CONF = { CERTAIN: 'certain', REVIEW: 'review', MISSING: 'missing' };

export const DispatchOCR = {
  async init(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1>Dispatch Intake — Screenshot OCR</h1>
        <p class="page-sub">
          Upload a screenshot from Service Fusion, Jobber, or any dispatch screen.
          Text is extracted automatically and mapped to job fields.
        </p>
      </div>
      <div class="ocr-layout">
        <div class="ocr-left">
          <div class="drop-zone" id="ocr-drop-zone">
            <p>Drag &amp; drop a screenshot here, or</p>
            <label class="btn btn-primary">
              Select Image
              <input type="file" id="ocr-file-input" accept="image/*" style="display:none">
            </label>
            <p class="drop-hint">PNG, JPG, WEBP. Higher resolution = better accuracy.</p>
          </div>
          <div id="ocr-image-preview" class="ocr-image-preview hidden"></div>
        </div>
        <div class="ocr-right" id="ocr-result-panel">
          <div class="empty-state">
            <p>Upload a screenshot to begin.</p>
          </div>
        </div>
      </div>
      <div class="ocr-tips">
        <strong>Tips for better results:</strong>
        Take screenshots at full resolution. Avoid partially obscured fields.
        Zoom in on the job/dispatch detail view before screenshotting.
        Crop to the relevant section if the screen is busy.
      </div>
    `;

    this._bindEvents();
  },

  _bindEvents() {
    const input = document.getElementById('ocr-file-input');
    const zone  = document.getElementById('ocr-drop-zone');

    input?.addEventListener('change', e => {
      if (e.target.files[0]) this._processFile(e.target.files[0]);
    });

    zone?.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-active'); });
    zone?.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
    zone?.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-active');
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) this._processFile(f);
    });
  },

  async _processFile(file) {
    const preview = document.getElementById('ocr-image-preview');
    const panel   = document.getElementById('ocr-result-panel');

    // Show image preview
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" alt="screenshot" class="ocr-preview-img">
      <p class="text-muted" style="font-size:11px;margin-top:4px">${file.name} (${(file.size/1024).toFixed(0)} KB)</p>`;
    preview.classList.remove('hidden');

    // Show progress
    panel.innerHTML = `
      <div class="ocr-progress">
        <div class="ocr-progress-bar" id="ocr-bar" style="width:0%"></div>
      </div>
      <p id="ocr-status" class="text-muted" style="margin-top:8px;font-size:13px">Initializing OCR engine…</p>
    `;

    try {
      const text = await this._runOCR(file, panel);
      const fields = this._extractFields(text);
      this._renderResults(fields, text, panel);
    } catch (err) {
      panel.innerHTML = `<div class="error-msg">
        OCR failed: ${err.message}<br>
        <small>Check that Tesseract.js is loaded (requires internet on first use).</small>
      </div>`;
    }
  },

  async _runOCR(file, panel) {
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js not loaded. Check internet connection or CDN in index.html.');
    }

    const setStatus = (msg, pct) => {
      const bar = document.getElementById('ocr-bar');
      const txt = document.getElementById('ocr-status');
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = msg;
    };

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          setStatus('Recognizing text… ' + Math.round(m.progress * 100) + '%', m.progress * 90);
        } else if (m.status === 'loading tesseract core') {
          setStatus('Loading OCR engine…', 10);
        } else if (m.status === 'loading language traineddata') {
          setStatus('Loading English language model…', 25);
        }
      },
    });

    setStatus('Running recognition…', 85);
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    setStatus('Done', 100);
    return text;
  },

  _extractFields(rawText) {
    const lines  = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const joined = lines.join('\n');
    const results = {};

    for (const [field, patterns] of Object.entries(PATTERNS)) {
      let found = null;
      let conf  = CONF.MISSING;

      for (let i = 0; i < patterns.length; i++) {
        const m = joined.match(patterns[i]);
        if (m) {
          found = m[1]?.trim() ?? m[0]?.trim();
          // First pattern match = more confident; later patterns = review
          conf  = i === 0 ? CONF.CERTAIN : CONF.REVIEW;
          break;
        }
      }

      // Clean up common OCR artifacts
      if (found) {
        found = found
          .replace(/\|/g, 'I')        // pipe → I
          .replace(/[^\x20-\x7E]/g, '') // strip non-ASCII
          .replace(/\s{2,}/g, ' ')     // collapse spaces
          .trim();
        if (found.length < 2) { found = null; conf = CONF.MISSING; }
      }

      results[field] = { value: found, confidence: conf };
    }

    return results;
  },

  _renderResults(fields, rawText, panel) {
    const reviewCount = Object.values(fields).filter(f => f.confidence === CONF.REVIEW).length;
    const missingCount = Object.values(fields).filter(f => f.confidence === CONF.MISSING).length;

    const confBadge = (conf) => {
      if (conf === CONF.CERTAIN)  return `<span class="badge badge-success">Extracted</span>`;
      if (conf === CONF.REVIEW)   return `<span class="badge badge-warn">Review</span>`;
      return `<span class="badge badge-muted">Not found</span>`;
    };

    const fieldLabels = {
      job_number:  'Job / WO #',
      client_name: 'Client Name',
      address:     'Address',
      phone:       'Phone',
      description: 'Description / Complaint',
      scheduled:   'Scheduled Date/Time',
      technician:  'Assigned Technician',
      priority:    'Priority',
    };

    panel.innerHTML = `
      <div class="ocr-summary">
        ${reviewCount > 0 ? `<span class="badge badge-warn">${reviewCount} fields need review</span>` : ''}
        ${missingCount > 0 ? `<span class="badge badge-muted">${missingCount} fields not found</span>` : ''}
        ${reviewCount === 0 && missingCount === 0 ? `<span class="badge badge-success">All fields extracted</span>` : ''}
      </div>

      <form id="ocr-dispatch-form">
        ${Object.entries(fields).map(([key, {value, confidence}]) => `
          <div class="form-group ocr-field ${confidence === CONF.REVIEW ? 'ocr-review' : confidence === CONF.MISSING ? 'ocr-missing' : ''}">
            <label>
              ${fieldLabels[key] || key}
              ${confBadge(confidence)}
              ${confidence === CONF.REVIEW ? '<span class="ocr-flag">⚠ Verify this value</span>' : ''}
            </label>
            <input type="text" name="${key}" value="${value || ''}"
              placeholder="${confidence === CONF.MISSING ? 'Not detected — enter manually' : ''}"
              ${confidence === CONF.MISSING ? 'class="input-missing"' : ''}>
          </div>
        `).join('')}

        <div class="form-group">
          <label>Notes / Additional Info</label>
          <textarea name="notes" rows="3" placeholder="Any additional context…"></textarea>
        </div>

        <div class="form-group">
          <label>Link to Building</label>
          <select name="building_id" id="ocr-building-select">
            <option value="">— Select building (optional) —</option>
          </select>
        </div>

        <div class="ocr-actions">
          <button type="button" class="btn btn-secondary" id="ocr-copy-btn">Copy as Text</button>
          <button type="button" class="btn btn-secondary" id="ocr-raw-btn">Show Raw OCR Text</button>
          <button type="submit" class="btn btn-primary">Save as Service Record Draft</button>
        </div>
      </form>

      <div id="ocr-raw-panel" class="hidden">
        <div class="form-section-title mt-16">Raw OCR Output</div>
        <textarea class="parse-text-preview" rows="8" readonly>${rawText}</textarea>
      </div>
    `;

    // Load buildings for dropdown
    this._loadBuildings();

    // Raw text toggle
    document.getElementById('ocr-raw-btn')?.addEventListener('click', () => {
      document.getElementById('ocr-raw-panel').classList.toggle('hidden');
    });

    // Copy as text
    document.getElementById('ocr-copy-btn')?.addEventListener('click', () => {
      const form   = document.getElementById('ocr-dispatch-form');
      const fd     = new FormData(form);
      const lines  = [];
      for (const [k, v] of fd.entries()) {
        if (v) lines.push(`${fieldLabels[k] || k}: ${v}`);
      }
      navigator.clipboard.writeText(lines.join('\n'))
        .then(() => notify('Copied to clipboard', 'success'));
    });

    // Save as draft PM record
    document.getElementById('ocr-dispatch-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd  = new FormData(e.target);
      const rec = {};
      for (const [k, v] of fd.entries()) rec[k] = v;

      // Build a draft service record
      const draft = {
        building_id:  rec.building_id || null,
        service_date: new Date().toISOString().split('T')[0],
        technician:   rec.technician || '',
        service_type: 'Service Call',
        notes: [
          rec.description ? `Complaint: ${rec.description}` : '',
          rec.job_number  ? `Job #: ${rec.job_number}` : '',
          rec.scheduled   ? `Scheduled: ${rec.scheduled}` : '',
          rec.notes       ? `Notes: ${rec.notes}` : '',
        ].filter(Boolean).join('\n'),
        status: 'incomplete',
        equipment_serviced: [],
        deficiencies: [],
        parts_used: [],
        total_hours: 0,
      };

      try {
        // Import PMRecords dynamically to avoid circular dep
        const { PMRecords: DB_PM } = await import('../db.js');
        // Use nextSequence from db
        const { nextSequence } = await import('../db.js');
        const seq = await nextSequence('record');
        draft.record_number = `SR-${seq}`;
        // We only have the basic CRUD here — push to pm_records with incomplete status
        const { getClient } = await import('../db.js');
        const sb = getClient();
        const { data, error } = await sb.from('pm_records').insert(draft).select().single();
        if (error) throw error;
        notify('Saved as draft service record SR-' + seq, 'success');
        // Navigate to the record detail
        window.location.hash = `/pm-records/${data.id}`;
      } catch (err) {
        notify('Save failed: ' + err.message, 'error');
      }
    });
  },

  async _loadBuildings() {
    try {
      const { Buildings: DB_B } = await import('../db.js');
      const buildings = await DB_B.getAll();
      const sel = document.getElementById('ocr-building-select');
      if (!sel) return;
      buildings.forEach(b => {
        const o = document.createElement('option');
        o.value = b.id;
        o.textContent = b.name + (b.address ? ` — ${b.address}` : '');
        sel.appendChild(o);
      });
    } catch (e) {
      // Buildings load failure is non-fatal
    }
  },
};
