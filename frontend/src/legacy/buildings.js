import { setPageTitle }   from './app.js';
import { Buildings as DB, Equipment } from './db.js';
import { CONFIG }         from './config.js';
import { formatDate, statusBadge, exportCSV, today, isOverdue, isDueSoon } from './helpers.js';
import { openModal, closeModal, confirm, notify, filterTable, makeSortable, getFormData, selectOptions, spinner, emptyState } from './ui.js';
import { navigate }       from './router.js';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

const SA_LABELS = { common_strata:'Common Strata', commercial:'Commercial', residential_in_suite:'Residential / In-Suite' };
function sal(v){ return SA_LABELS[v]||v||'—'; }

export const Buildings = {

  async init(container) {
    setPageTitle('Buildings');
    container.innerHTML = `<div class="page-wrap">
      <div class="toolbar">
        <input type="search" id="bld-search" class="input" placeholder="Search buildings…" style="max-width:220px">
        <div class="toolbar-right">
          <button class="btn btn-secondary" id="bld-export">Export CSV</button>
          <button class="btn btn-primary"   id="bld-add">+ Add Building</button>
        </div>
      </div>
      <div class="card"><div id="bld-table-wrap">${spinner()}</div></div>
    </div>`;
    await this.loadTable();
    document.getElementById('bld-add').onclick    = () => this.openForm();
    document.getElementById('bld-search').oninput = e => {
      const tbl = document.querySelector('#bld-table-wrap table');
      if (tbl) filterTable(e.target, tbl);
    };
    document.getElementById('bld-export').onclick = () => this.exportData();
  },

  async loadTable() {
    const wrap = document.getElementById('bld-table-wrap');
    if (!wrap) return;
    try {
      const rows = await DB.getAll();
      if (!rows.length) { wrap.innerHTML = emptyState('No buildings yet. Click + Add Building.'); return; }
      wrap.innerHTML = `<div class="table-wrap"><table class="table" id="bld-table">
        <thead><tr>
          <th>Name</th><th>Client</th><th>Type</th><th>Address</th>
          <th>Equipment</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${rows.map(b=>`<tr>
          <td><a href="#/buildings/${b.id}" class="link-strong">${b.name}</a></td>
          <td>${b.client_name||'—'}</td>
          <td>${b.building_type||'—'}</td>
          <td style="color:var(--text-dim);font-size:12px">${[b.address,b.city].filter(Boolean).join(', ')||'—'}</td>
          <td><a href="#/equipment?building=${b.id}" class="btn btn-xs btn-ghost">View →</a></td>
          <td>${statusBadge(b.status||'active')}</td>
          <td class="actions">
            <button class="btn btn-xs btn-secondary" data-edit="${b.id}">Edit</button>
            <button class="btn btn-xs btn-danger"    data-del="${b.id}">Del</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`;
      makeSortable(document.getElementById('bld-table'));
      wrap.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>this.openForm(b.dataset.edit));
      wrap.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>this.deleteBuilding(b.dataset.del));
    } catch(err) {
      const hint = err.message?.includes('relation') || err.message?.includes('does not exist')
        ? `<div class="alert alert-warning" style="margin-top:10px">Database tables not found. Run <code>schema.sql</code> in your Supabase SQL Editor first.</div>` : '';
      wrap.innerHTML = `<div class="error-state">${err.message}</div>${hint}`;
    }
  },

  async detail(id, container) {
    container.innerHTML = spinner('Loading…');
    try {
      const b = await DB.getById(id);
      setPageTitle(b.name);
      const equip = await Equipment.getByBuilding(id).catch(()=>[]);
      container.innerHTML = `<div class="page-wrap">
        <div class="toolbar">
          <button class="btn btn-secondary" onclick="history.back()">← Back</button>
          <div class="toolbar-right">
            <button class="btn btn-secondary" id="bld-edit-btn">Edit</button>
            <button class="btn btn-danger"    id="bld-del-btn">Delete</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>${b.name}</h3>${statusBadge(b.status||'active')}</div>
          <div class="card-body detail-fields">
            ${df('Client',b.client_name)} ${df('Company',b.client_company)}
            ${df('Email',b.client_email)} ${df('Phone',b.client_phone)}
            ${df('Type',b.building_type)} ${df('Year Built',b.year_built)}
            ${df('Floors',b.floors)} ${df('Gross Area',b.gross_area_sqft?b.gross_area_sqft+' sqft':null)}
            ${df('Address',b.address)} ${df('City',b.city)}
            ${df('Province',b.province)} ${df('Postal',b.postal_code)}
          </div>
          ${b.notes?`<div class="card-body" style="border-top:1px solid var(--border);padding-top:12px"><div style="font-size:12.5px;color:var(--text-dim)">${b.notes}</div></div>`:''}
        </div>
        <div class="card" style="margin-top:14px">
          <div class="card-header">
            <h3>Equipment (${equip.length})</h3>
            <a href="#/equipment?building=${id}" class="btn btn-sm btn-secondary">Manage Equipment →</a>
          </div>
          ${equip.length?`<div class="card-body no-pad"><div class="table-wrap"><table class="table table-compact">
            <thead><tr><th>Tag</th><th>Type</th><th>Area</th><th>Status</th></tr></thead>
            <tbody>${equip.map(e=>`<tr>
              <td><strong>${e.tag||'—'}</strong></td>
              <td>${e.equipment_type||'—'}</td>
              <td>${sal(e.service_area)}</td>
              <td>${statusBadge(e.status||'active')}</td>
            </tr>`).join('')}</tbody>
          </table></div></div>`:`<div class="card-body"><p class="muted">No equipment yet.</p></div>`}
        </div>
      </div>`;
      document.getElementById('bld-edit-btn').onclick = ()=>this.openForm(id);
      document.getElementById('bld-del-btn').onclick  = ()=>this.deleteBuilding(id).then(()=>navigate('/buildings'));
    } catch(err) {
      container.innerHTML = `<div class="page-wrap error-state">${err.message}</div>`;
    }
  },

  openForm(id = null) {
    const modalBody = `
      <div id="bld-scanner-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-family:var(--font-cond);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)">Auto-Fill from Document</span>
          <span class="ai-badge">✦ OCR + AI</span>
        </div>
        <div class="drop-zone" id="bld-drop" style="padding:18px 16px">
          <span style="font-size:20px">📄</span>
          <div class="drop-zone-text" style="font-size:12.5px;margin:4px 0 2px">Drop a document, photo, or letterhead</div>
          <div class="drop-zone-sub">PNG · JPG · PDF · DOCX — extracts building name, address, client</div>
          <input type="file" id="bld-file-inp" accept=".pdf,.docx,.png,.jpg,.jpeg" style="display:none">
        </div>
        <div id="bld-scan-status" style="display:none;margin-top:8px">
          <div class="progress-bar"><div class="progress-fill" id="bld-scan-prog" style="width:0%"></div></div>
          <div id="bld-scan-msg" style="font-size:11.5px;color:var(--text-dim);margin-top:4px"></div>
        </div>
      </div>

      <div style="border-top:1px solid var(--border);margin:16px 0 14px;position:relative">
        <span style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:var(--bg2);padding:0 10px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted)">or fill manually</span>
      </div>

      <form id="bld-form">
        <div class="form-row">
          <div class="form-group">
            <label>Building Name *</label>
            <input name="name" id="bld-name" class="input" required placeholder="e.g. Harbour Centre">
          </div>
          <div class="form-group">
            <label>Building Type</label>
            <select name="building_type" class="input">
              <option value="">— Select —</option>
              ${(CONFIG.BUILDING_TYPES||[]).map(t=>`<option>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Client / Owner Name</label>
            <input name="client_name" id="bld-client-name" class="input">
          </div>
          <div class="form-group">
            <label>Client Company</label>
            <input name="client_company" id="bld-client-co" class="input">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input name="client_email" type="email" class="input">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input name="client_phone" class="input">
          </div>
        </div>
        <div class="form-group" style="position:relative">
          <label>Address <span style="color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0">— type to search</span></label>
          <input id="bld-addr-inp" name="address" class="input" autocomplete="off" placeholder="e.g. 1936 Powell Street">
          <div id="bld-addr-drop" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);box-shadow:var(--shadow-lg);max-height:200px;overflow-y:auto"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>City</label>
            <input name="city" id="bld-city" class="input" value="Vancouver">
          </div>
          <div class="form-group">
            <label>Province</label>
            <input name="province" id="bld-province" class="input" value="BC">
          </div>
          <div class="form-group">
            <label>Postal Code</label>
            <input name="postal_code" id="bld-postal" class="input">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Floors</label>
            <input name="floors" type="number" class="input">
          </div>
          <div class="form-group">
            <label>Year Built</label>
            <input name="year_built" type="number" class="input">
          </div>
          <div class="form-group">
            <label>Gross Area (sqft)</label>
            <input name="gross_area_sqft" type="number" class="input">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select name="status" class="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea name="notes" class="input" rows="2"></textarea>
        </div>
      </form>`;

    openModal({
      title: id ? 'Edit Building' : 'Add Building',
      size:  'lg',
      body:  modalBody,
      footer:`<button class="btn btn-secondary" id="bld-cancel-btn">Cancel</button>
              <button class="btn btn-primary"   id="bld-save-btn">${id?'Save Changes':'Add Building'}</button>`,
    });

    document.getElementById('bld-cancel-btn').onclick = closeModal;
    document.getElementById('bld-save-btn').onclick   = ()=>this.saveBuilding(id);

    // Load existing data
    if (id) {
      DB.getById(id).then(b=>{
        const f = document.getElementById('bld-form');
        if (!f) return;
        Object.entries(b).forEach(([k,v])=>{ if(f.elements[k]) f.elements[k].value = v??''; });
      }).catch(()=>{});
    }

    // Address autocomplete (Nominatim)
    wireAddressAutocomplete();

    // OCR / AI doc scanner
    wireBuildingScanner();
  },

  async saveBuilding(id) {
    const form = document.getElementById('bld-form');
    if (!form) return;
    const data = {};
    new FormData(form).forEach((v,k)=>{ data[k]=v; });
    data.floors          = data.floors          ? parseInt(data.floors)          : null;
    data.year_built      = data.year_built      ? parseInt(data.year_built)      : null;
    data.gross_area_sqft = data.gross_area_sqft ? parseInt(data.gross_area_sqft) : null;
    if (!data.name?.trim()) { notify.warn('Building name is required.'); return; }
    try {
      if (id) await DB.update(id, data);
      else    await DB.create(data);
      closeModal();
      notify.success(id?'Building updated.':'Building added.');
      await this.loadTable();
    } catch(err) { notify.error(err.message); }
  },

  async deleteBuilding(id) {
    if (!await confirm('Delete this building and all associated records?')) return;
    try { await DB.delete(id); notify.success('Deleted.'); await this.loadTable(); }
    catch(err) { notify.error(err.message); }
  },

  async exportData() {
    const rows = await DB.getAll().catch(()=>[]);
    exportCSV(rows.map(b=>({
      Name:b.name, Client:b.client_name, Company:b.client_company,
      Email:b.client_email, Phone:b.client_phone, Type:b.building_type,
      Address:b.address, City:b.city, Province:b.province, Postal:b.postal_code,
      Floors:b.floors, YearBuilt:b.year_built, Status:b.status,
    })), 'buildings.csv');
  },
};

// ─── Address autocomplete (Nominatim) ─────────────────────────────────────────
function wireAddressAutocomplete() {
  const inp  = document.getElementById('bld-addr-inp');
  const drop = document.getElementById('bld-addr-drop');
  if (!inp || !drop) return;
  let t;
  inp.addEventListener('input', ()=>{
    clearTimeout(t);
    const q = inp.value.trim();
    if (q.length < 4) { drop.style.display='none'; return; }
    t = setTimeout(async ()=>{
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=ca&limit=6&addressdetails=1`,
          {headers:{'Accept-Language':'en','User-Agent':'MEPC-Commander/1.0'}});
        const results = await r.json();
        if (!results.length) { drop.style.display='none'; return; }
        drop.innerHTML = results.map(res=>{
          const a = res.address||{};
          const street = [a.house_number,a.road||a.pedestrian||a.street].filter(Boolean).join(' ') || res.display_name.split(',')[0];
          const city   = a.city||a.town||a.village||a.municipality||'';
          const prov   = abbrevProv(a.state||'');
          const postal = a.postcode||'';
          return `<div style="padding:9px 14px;cursor:pointer;font-size:12.5px;border-bottom:1px solid var(--border)"
            onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''"
            data-s="${street}" data-c="${city}" data-p="${prov}" data-z="${postal}">
            ${res.display_name.split(',').slice(0,3).join(',')}
          </div>`;
        }).join('');
        drop.style.display='';
        drop.querySelectorAll('[data-s]').forEach(el=>{
          el.onclick=()=>{
            inp.value = el.dataset.s;
            const ci=document.getElementById('bld-city');
            const pr=document.getElementById('bld-province');
            const po=document.getElementById('bld-postal');
            if(ci&&el.dataset.c) ci.value=el.dataset.c;
            if(pr&&el.dataset.p) pr.value=el.dataset.p;
            if(po&&el.dataset.z) po.value=el.dataset.z;
            drop.style.display='none';
          };
        });
      } catch { drop.style.display='none'; }
    }, 350);
  });
  document.addEventListener('click', e=>{ if(!inp.contains(e.target)) drop.style.display='none'; }, {capture:true});
}

// ─── Building OCR + AI scanner ─────────────────────────────────────────────────
function wireBuildingScanner() {
  const dropZone = document.getElementById('bld-drop');
  const fileInp  = document.getElementById('bld-file-inp');
  if (!dropZone || !fileInp) return;

  dropZone.onclick = () => fileInp.click();
  fileInp.onchange = e => e.target.files[0] && scanDocument(e.target.files[0]);
  dropZone.ondragover  = e => { e.preventDefault(); dropZone.classList.add('drag-over'); };
  dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
  dropZone.ondrop = e => { e.preventDefault(); dropZone.classList.remove('drag-over'); e.dataTransfer.files[0] && scanDocument(e.dataTransfer.files[0]); };
}

async function scanDocument(file) {
  const statusEl = document.getElementById('bld-scan-status');
  const progEl   = document.getElementById('bld-scan-prog');
  const msgEl    = document.getElementById('bld-scan-msg');
  const setP = (pct, msg) => { if(progEl) progEl.style.width=pct+'%'; if(msgEl) msgEl.textContent=msg; };

  statusEl.style.display = '';
  setP(5, 'Reading file…');

  const ext = file.name.split('.').pop().toLowerCase();
  let text = '';

  try {
    if (['png','jpg','jpeg'].includes(ext)) {
      if (!window.Tesseract) throw new Error('Tesseract.js not loaded');
      setP(15, 'Initialising OCR engine…');
      let ocrWorker;
      try {
        ocrWorker = await Tesseract.createWorker('eng', 1, {
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
          langPath:   'https://tessdata.projectnaptha.com/4.0.0',
          corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
          logger: m => {
            if (m.status==='recognizing text') setP(20+Math.floor(m.progress*35), `OCR: ${Math.floor(m.progress*100)}%…`);
            else if (m.status==='loading language traineddata') setP(10+Math.floor(m.progress*8), 'Loading language data…');
          }
        });
        const { data } = await ocrWorker.recognize(file);
        text = data.text || '';
        await ocrWorker.terminate();
      } catch(ocrErr) {
        if (ocrWorker) await ocrWorker.terminate().catch(()=>{});
        const r = await Tesseract.recognize(file, 'eng');
        text = r.data?.text || '';
      }
    } else if (ext === 'pdf') {
      if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await window.pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
      setP(20, `Reading ${Math.min(pdf.numPages,5)} page(s)…`);
      for (let i=1; i<=Math.min(pdf.numPages,5); i++) {
        const pg = await pdf.getPage(i);
        const ct = await pg.getTextContent();
        text += ct.items.map(it=>it.str).join(' ') + '\n';
      }
    } else if (ext === 'docx') {
      if (!window.mammoth) throw new Error('Mammoth not loaded');
      const r = await mammoth.extractRawText({arrayBuffer: await file.arrayBuffer()});
      text = r.value;
    }

    if (!text.trim()) throw new Error('No text extracted from file');
    setP(60, 'Sending to AI for analysis…');

    const response = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You extract building and client information from documents. Return ONLY valid JSON, no explanation, no markdown.',
        messages: [{
          role: 'user',
          content: `Extract building/property information from this document text. Return ONLY a JSON object with these fields (use null if not found):
{
  "name": "building name or property name",
  "address": "street address only (no city/province/postal)",
  "city": "city name",
  "province": "2-letter province code e.g. BC",
  "postal_code": "postal code",
  "client_name": "owner or contact person name",
  "client_company": "owner company or strata corporation name",
  "client_email": "email address",
  "client_phone": "phone number",
  "building_type": "one of: Commercial, Strata / Residential, Industrial, Institutional, Mixed-Use, Highrise",
  "floors": "number of floors as integer",
  "year_built": "year built as integer"
}

Document text:
${text.slice(0, 6000)}`
        }]
      })
    });

    setP(90, 'Applying extracted data…');

    if (response.ok) {
      const data = await response.json();
      const raw  = (data.content||[]).find(b=>b.type==='text')?.text || '{}';
      try {
        const info = JSON.parse(raw.replace(/```json|```/g,'').trim());
        fillBuildingForm(info);
        setP(100, `Done — ${Object.values(info).filter(Boolean).length} field(s) populated`);
        notify.success('Building info extracted and applied.');
      } catch {
        setP(100, 'AI response could not be parsed — check fields manually');
      }
    } else {
      // Fallback: basic regex extraction
      const info = regexExtract(text);
      fillBuildingForm(info);
      setP(100, 'Basic extraction applied (AI unavailable)');
    }
  } catch(err) {
    setP(0, '');
    statusEl.style.display = 'none';
    notify.error(err.message || 'Scan failed');
  }
}

function fillBuildingForm(info) {
  const set = (id, val) => { if (val) { const el = document.getElementById(id)||document.querySelector(`[name="${id}"]`); if(el) el.value=val; } };
  set('bld-name',      info.name);
  set('bld-addr-inp',  info.address);
  set('bld-city',      info.city);
  set('bld-province',  info.province);
  set('bld-postal',    info.postal_code);
  set('bld-client-name', info.client_name);
  set('bld-client-co', info.client_company);
  // form elements by name
  const f = document.getElementById('bld-form');
  if (!f) return;
  ['client_email','client_phone','building_type','floors','year_built'].forEach(k=>{
    if (info[k] && f.elements[k]) f.elements[k].value = info[k];
  });
}

function regexExtract(text) {
  const phone   = text.match(/(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/)?.[1] || null;
  const email   = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)?.[0] || null;
  const postal  = text.match(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i)?.[0] || null;
  return { client_phone: phone, client_email: email, postal_code: postal };
}

function abbrevProv(full) {
  const m = {'British Columbia':'BC','Alberta':'AB','Saskatchewan':'SK','Manitoba':'MB','Ontario':'ON','Quebec':'QC','New Brunswick':'NB','Nova Scotia':'NS','Prince Edward Island':'PE','Newfoundland and Labrador':'NL','Northwest Territories':'NT','Nunavut':'NU','Yukon':'YT'};
  return m[full]||full;
}

function df(label, val) {
  if (val===null||val===undefined||val==='') return '';
  return `<div class="detail-field"><span class="detail-label">${label}</span><span class="detail-value">${val}</span></div>`;
}
