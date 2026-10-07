
const API_URL = (window.JOTA_CONFIG && window.JOTA_CONFIG.API_URL) || '';
const SITE_URL = (window.JOTA_CONFIG && window.JOTA_CONFIG.SITE_URL) || './';
const AUTH_TOKEN_KEY = 'jota_joti_admin_token_v2';
const AUTH_EXPIRY_KEY = 'jota_joti_admin_token_expiry_v2';
const FETCH_TIMEOUT_MS = 25000;
const TAGS = [
  '{{childFirstName}}','{{childLastName}}','{{childFullName}}','{{parentName}}',
  '{{username}}','{{pin}}','{{participantID}}','{{youthSection}}','{{ageYear}}',
  '{{ageGroup}}','{{email}}','{{youthEmail}}','{{parentEmail}}'
];

let adminToken = sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
let adminTokenExpiry = Number(sessionStorage.getItem(AUTH_EXPIRY_KEY) || 0);
let state = {
  users: [], categories: [], activities: [], links: [], media: [], settings: [], audit: [],
  sender: '', quota: null, lastRefresh: null
};
let currentPage = 'overview';
let pendingModalSave = null;
let inlineUploadCounter = 0;

const $ = id => document.getElementById(id);
const rootEl = document.documentElement;

function esc(value) {
  const d = document.createElement('div');
  d.textContent = value == null ? '' : String(value);
  return d.innerHTML;
}
function escAttr(value) {
  return esc(value).replace(/"/g, '&quot;');
}
function norm(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9@._-]+/g,' ').trim();
}
function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function isCompletePaperwork(value) { return ['complete','completed','done'].includes(norm(value)); }
function activeUsers() { return state.users.filter(u => norm(u.Status) !== 'disabled' && String(u.ParticipantID || '') !== 'guest'); }
function outstandingPaperworkUsers() {
  return activeUsers().filter(u => !isCompletePaperwork(u.PaperworkStatus) && isValidEmail(u.ParentEmail));
}
function categoryByKey(key) { return state.categories.find(c => norm(c.CategoryKey) === norm(key)); }
function categoryTitle(key) { return categoryByKey(key)?.Title || key || 'Uncategorised'; }
function mediaByKey(key) { return state.media.find(m => String(m.LogoKey) === String(key)); }
function mediaUrl(key, fallback) { return mediaByKey(key)?.LogoURL || fallback || ''; }
function toast(message, ok=true) {
  const el = $('toast'); if (!el) return;
  el.textContent = message;
  el.style.background = ok ? '#173447' : '#8c2832';
  el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 3000);
}
function showMessage(id, message, ok) {
  const el = $(id); if (!el) return;
  el.textContent = message || '';
  el.className = 'message ' + (ok ? 'ok' : 'err');
}
function hideMessage(id) {
  const el=$(id); if(el){el.textContent='';el.className='message';}
}

function b64url(value) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const bytes = new TextEncoder().encode(raw);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function request(action, params={}, method='GET', payloadData=null) {
  const maxAttempts = method === 'GET' ? 3 : 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      let url = API_URL;
      const cacheBust = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const requestParams = Object.assign({}, params || {});
      let options = {
        method,
        redirect: 'follow',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: {'Accept':'application/json'}
      };

      if (method === 'GET') {
        const query = new URLSearchParams({action});
        Object.entries(requestParams).forEach(([k,v]) => {
          if (v !== undefined && v !== null) query.set(k, String(v));
        });
        query.set('_cb', cacheBust);
        url += '?' + query.toString();
      } else {
        const body = new URLSearchParams();
        body.set('action', action);
        Object.entries(requestParams).forEach(([k,v]) => {
          if (v !== undefined && v !== null) body.set(k, String(v));
        });
        if (payloadData !== null) body.set('payload', b64url(payloadData));
        body.set('_cb', cacheBust);
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        options.body = body.toString();
      }

      const response = await fetch(url, options);
      const raw = await response.text();

      // Google Apps Script uses a redirected googleusercontent response for
      // web apps. A stale redirect can occasionally come back as 404 even
      // though a fresh request works. Retry the whole request in that case.
      let data = null;
      try { data = JSON.parse(raw); } catch (_) {
        if (attempt < maxAttempts && (response.status === 404 || /<!doctype html|<html/i.test(raw))) {
          lastError = new Error(`Apps Script ${action} returned non-JSON data (HTTP ${response.status}).`);
          await new Promise(resolve => setTimeout(resolve, 350 * attempt));
          continue;
        }
        throw new Error(`Apps Script ${action} returned non-JSON data (HTTP ${response.status}).`);
      }

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || data?.message || `Apps Script ${action} failed (HTTP ${response.status}).`);
      }

      return data;
    } catch (err) {
      lastError = err;
      if (err?.name === 'AbortError') {
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 350 * attempt));
          continue;
        }
        throw new Error(`${action} timed out after ${FETCH_TIMEOUT_MS/1000} seconds.`);
      }
      if (err instanceof TypeError) {
        throw new Error('The browser could not read Apps Script. Check that the web app is deployed as Execute as Me and accessible to the intended users.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error(`Apps Script ${action} failed.`);
}

const POST_ACTIONS = new Set([
  'adminUserSave','adminResendWelcome','adminCategorySave','adminCategoryDelete','adminActivitySave','adminActivityDelete',
  'adminLinkSave','adminLinkDelete','adminUploadAsset','adminMediaDelete','adminSettingsSave',
  'adminPreview','adminSend','adminPaperworkReminders','adminAccountPdf','adminRunSetup',
  'adminClearCache'
]);

async function call(action, params={}, payload=null) {
  if (POST_ACTIONS.has(action)) {
    const next = Object.assign({}, params, adminToken ? {token:adminToken} : {});
    return request(action, next, 'POST', payload);
  }
  const next = Object.assign({}, params, adminToken ? {token:adminToken} : {});
  return request(action, next, 'GET');
}

async function login(password) {
  const result = await request('adminLogin', {payload:b64url({password})});
  if (!result?.token) throw new Error('Admin sign-in failed.');
  adminToken = String(result.token);
  adminTokenExpiry = Date.now() + Math.max(60, Number(result.expiresInSeconds || 21600) - 60) * 1000;
  sessionStorage.setItem(AUTH_TOKEN_KEY, adminToken);
  sessionStorage.setItem(AUTH_EXPIRY_KEY, String(adminTokenExpiry));
  return result;
}

async function ensureAuth() {
  if (adminToken && adminTokenExpiry > Date.now()) return true;
  adminToken = ''; adminTokenExpiry = 0;
  sessionStorage.removeItem(AUTH_TOKEN_KEY); sessionStorage.removeItem(AUTH_EXPIRY_KEY);
  return false;
}

async function callProtected(action, params={}, payload=null) {
  if (!(await ensureAuth())) throw new Error('Admin sign-in required.');
  try {
    return await call(action, params, payload);
  } catch (err) {
    if (/admin sign-in required|admin session expired|invalid admin session/i.test(String(err?.message || err))) {
      adminToken = ''; adminTokenExpiry = 0;
      sessionStorage.removeItem(AUTH_TOKEN_KEY); sessionStorage.removeItem(AUTH_EXPIRY_KEY);
      showLogin();
      throw new Error('Your admin session expired. Sign in again.');
    }
    throw err;
  }
}

function showLogin(message='') {
  $('loginView').classList.remove('hidden');
  $('appView').classList.add('hidden');
  if (message) showMessage('loginMessage', message, false); else hideMessage('loginMessage');
  setTimeout(() => $('adminPassword')?.focus(), 50);
}
function showApp() {
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  setPage(currentPage);
}

async function loadAll() {
  $('connectionBadge').textContent = 'Refreshing…';
  $('connectionBadge').className = 'badge neutral';

  let map;
  try {
    // Preferred path: one protected request. This avoids Google Apps Script
    // redirect races caused by eight simultaneous executions.
    const bundle = await callProtected('adminBootstrap');
    map = {
      users: bundle.users || [],
      categories: bundle.categories || [],
      activities: bundle.activities || [],
      links: bundle.links || [],
      media: bundle.media || [],
      settings: bundle.settings || [],
      sender: {sender: bundle.sender || '', quota: bundle.quota ?? null},
      ping: {success: true, version: bundle.version || 'v18'}
    };
  } catch (bootstrapError) {
    // Compatibility fallback for an older deployed Apps Script. Requests are
    // deliberately sequential so we don't recreate the concurrency problem.
    const callOne = async action => callProtected(action);
    map = {
      ping: await callOne('adminPing'),
      users: await callOne('adminUsers'),
      categories: await callOne('adminCategories'),
      activities: await callOne('adminActivities'),
      links: await callOne('adminLinks'),
      media: await callOne('adminMedia'),
      settings: await callOne('adminSettings'),
      sender: await callOne('adminSender')
    };
  }

  state.users = Array.isArray(map.users) ? map.users : (map.users?.users || []);
  state.categories = Array.isArray(map.categories) ? map.categories : (map.categories?.categories || []);
  state.activities = Array.isArray(map.activities) ? map.activities : (map.activities?.activities || []);
  state.links = Array.isArray(map.links) ? map.links : (map.links?.links || []);
  state.media = Array.isArray(map.media) ? map.media : (map.media?.media || []);
  state.settings = Array.isArray(map.settings) ? map.settings : (map.settings?.settings || []);
  state.sender = map.sender?.sender || '';
  state.quota = map.sender?.quota ?? null;
  state.lastRefresh = new Date();

  $('connectionBadge').textContent = 'Connected';
  $('connectionBadge').className = 'badge good';
  $('systemApi').textContent = 'Online';
  $('systemSender').textContent = state.sender || 'Apps Script account';
  $('systemQuota').textContent = state.quota ?? '—';
  $('systemRefresh').textContent = state.lastRefresh.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

  renderAll();
  refreshReminderCount().catch(() => {});
  await loadAudit();
}

function renderAll() {
  renderOverview();
  if (window.renderEventPlanPage) window.renderEventPlanPage();
  renderParticipants();
  renderActivities();
  renderCategories();
  renderLinks();
  renderMedia();
  populateFilters();
  renderSettings();
  renderAudit();
}

function renderOverview() {
  const users = activeUsers();
  const pending = users.filter(u => norm(u.Status) === 'pending').length;
  const outstanding = users.filter(u => !isCompletePaperwork(u.PaperworkStatus)).length;
  const activeActivities = state.activities.filter(a => a.Active !== false).length;
  $('statUsers').textContent = users.length;
  $('statUsersSub').textContent = `${users.filter(u=>isValidEmail(u.ParentEmail)).length} with parent email`;
  $('statPending').textContent = pending;
  $('statPaperwork').textContent = outstanding;
  $('statActivities').textContent = activeActivities;
}

function matchesText(row, query, fields) {
  if (!query) return true;
  const q = norm(query);
  return fields.some(key => norm(row[key]).includes(q));
}

function renderParticipants() {
  const q = $('participantSearch')?.value || '';
  const status = $('participantStatusFilter')?.value || '';
  const paper = $('participantPaperworkFilter')?.value || '';
  const rows = state.users.filter(u => {
    if (status && String(u.Status) !== status) return false;
    if (paper && String(u.PaperworkStatus) !== paper) return false;
    return matchesText(u, q, ['Name','Username','PIN','ParticipantID','ParentName','ParentEmail','ParentPhone','Email','AgeYear','PaperworkStatus']);
  }).sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));

  $('participantsTable').innerHTML = rows.map((u,i) => {
    const paperBadge = isCompletePaperwork(u.PaperworkStatus) ? 'good' : 'warn';
    const statusBadge = norm(u.Status) === 'active' ? 'good' : norm(u.Status) === 'pending' ? 'warn' : 'bad';
    return `<tr>
      <td><strong>${esc(u.Name || '—')}</strong><span class="sub">${esc(u.ParticipantID || '')}</span></td>
      <td>${esc(u.AgeYear || u.AgeGroup || '—')}</td>
      <td class="password-cell">${esc(u.Username || '—')}</td>
      <td class="password-cell">${esc(u.Password || '—')} ${u.Password ? `<button class="copy-btn" data-copy="${escAttr(u.Password)}">Copy</button>`:''}</td>
      <td class="password-cell">${esc(u.PIN || '—')} ${u.PIN ? `<button class="copy-btn" data-copy="${escAttr(u.PIN)}">Copy</button>`:''}</td>
      <td>${esc(u.ParentName || '—')}<span class="sub">${esc(u.ParentEmail || '—')}</span></td>
      <td><span class="badge ${paperBadge}">${esc(u.PaperworkStatus || 'Not set')}</span></td>
      <td><span class="badge ${statusBadge}">${esc(u.Status || '—')}</span></td>
      <td><div class="row-actions"><button data-edit-user="${i}" data-user-id="${escAttr(u.ParticipantID)}">Edit</button><button class="ghost" data-resend-welcome="${escAttr(u.ParticipantID)}" ${u.ParentEmail?'':'disabled title="No parent email"'}>Resend</button></div></td>
    </tr>`;
  }).join('');

  $('participantEmpty').classList.toggle('hidden', rows.length > 0);
}

function renderActivities() {
  const q = norm($('activitySearch')?.value || '');
  const cat = $('activityCategoryFilter')?.value || '';
  const active = $('activityActiveFilter')?.value || '';
  const list = state.activities.filter(a => {
    if (cat && String(a.CategoryKey) !== cat) return false;
    if (active === 'true' && a.Active === false) return false;
    if (active === 'false' && a.Active !== false) return false;
    return !q || [a.Title,a.Description,a.CategoryKey,a.Duration,a.Difficulty,a.Participants,a.Equipment,a.Notes]
      .some(v=>norm(v).includes(q));
  }).sort((a,b)=>String(a.Title).localeCompare(String(b.Title)));

  $('activitiesGrid').innerHTML = list.length ? list.map((a)=> {
    const photo = a.PhotoURL || mediaUrl(a.PhotoKey,'');
    const activeBadge = a.Active === false ? '<span class="badge bad">Archived</span>' : '<span class="badge good">Active</span>';
    return `<article class="content-card">
      <div class="content-photo">${photo ? `<img src="${escAttr(photo)}" alt="">` : '<div class="placeholder">ACTIVITY</div>'}</div>
      <div class="content-body">
        <h3>${esc(a.Title || 'Untitled activity')}</h3>
        <div class="meta-row">
          <span class="pill">${esc(categoryTitle(a.CategoryKey))}</span>
          ${a.Duration ? `<span class="pill">${esc(a.Duration)}</span>`:''}
          ${a.Difficulty ? `<span class="pill">${esc(a.Difficulty)}</span>`:''}
          ${a.LeaderRequired ? '<span class="pill">Leader required</span>':''}
          ${activeBadge}
        </div>
        <p>${esc(a.Description || 'No description added yet.')}</p>
        <div class="card-actions">
          <button class="small-btn" data-edit-activity="${escAttr(a.ActivityID)}">Edit</button>
          <button class="small-btn archive" data-archive-activity="${escAttr(a.ActivityID)}">${a.Active === false ? 'Restore' : 'Archive'}</button>
        </div>
      </div>
    </article>`;
  }).join('') : '<div class="empty-state">No activities match the current filters.</div>';
}

function renderCategories() {
  const counts = {};
  state.links.forEach(l => { counts[l.CategoryKey] = (counts[l.CategoryKey] || 0) + (l.Active === false ? 0 : 1); });
  state.activities.forEach(a => { counts[a.CategoryKey] = (counts[a.CategoryKey] || 0) + (a.Active === false ? 0 : 1); });

  $('categoriesGrid').innerHTML = state.categories.length ? state.categories.map(c => {
    const photo = c.LogoURL || mediaUrl(c.LogoKey,'');
    return `<article class="content-card category-card">
      <div class="content-photo">${photo ? `<img src="${escAttr(photo)}" alt="">` : '<div class="placeholder">CATEGORY</div>'}</div>
      <div class="content-body">
        <h3>${esc(c.Title || 'Untitled')}</h3>
        <div class="meta-row"><span class="pill">${esc(c.CategoryKey)}</span><span class="pill">${counts[c.CategoryKey] || 0} items</span>${c.Active === false ? '<span class="badge bad">Archived</span>' : '<span class="badge good">Active</span>'}</div>
        <p>${esc(c.Description || 'No description.')}</p>
        <div class="card-actions"><button class="small-btn" data-edit-category="${escAttr(c.CategoryKey)}">Edit</button><button class="small-btn archive" data-archive-category="${escAttr(c.CategoryKey)}">${c.Active === false ? 'Restore' : 'Archive'}</button></div>
      </div>
    </article>`;
  }).join('') : '<div class="empty-state">No categories yet.</div>';
}

function renderLinks() {
  const q = norm($('linkSearch')?.value || '');
  const cat = $('linkCategoryFilter')?.value || '';
  const active = $('linkActiveFilter')?.value || '';
  const list = state.links.filter(l => {
    if (cat && String(l.CategoryKey) !== cat) return false;
    if (active === 'true' && l.Active === false) return false;
    if (active === 'false' && l.Active !== false) return false;
    return !q || [l.Title,l.CategoryKey,l.URL,l.Notes,l.BlockStatus].some(v=>norm(v).includes(q));
  }).sort((a,b)=>String(a.Title).localeCompare(String(b.Title)));

  $('linksTable').innerHTML = list.map(l => {
    const html = l.IsHTML || (!/^https?:\/\//i.test(String(l.URL || '').trim()));
    return `<tr>
      <td><strong>${esc(l.Title || '—')}</strong><span class="sub">${esc(l.LinkID || '')}</span></td>
      <td>${esc(categoryTitle(l.CategoryKey))}</td>
      <td><span class="badge neutral">${html ? 'HTML' : 'URL'}</span></td>
      <td>${l.CanEmbed ? '<span class="badge good">Yes</span>' : '<span class="badge neutral">No</span>'}</td>
      <td>${loginLabel(l.RequiresLogin)}</td>
      <td>${loginLabel(l.RequiresEmail)}</td>
      <td>${l.Active === false ? '<span class="badge bad">Archived</span>' : '<span class="badge good">Active</span>'}</td>
      <td><div class="row-actions"><button data-edit-link="${escAttr(l.LinkID)}">Edit</button><button class="archive" data-archive-link="${escAttr(l.LinkID)}">${l.Active === false ? 'Restore' : 'Archive'}</button></div></td>
    </tr>`;
  }).join('');
}
function loginLabel(v) {
  const n = String(v ?? '').trim();
  if (n === '3') return '<span class="badge warn">External</span>';
  if (n === '1' || /^(true|yes)$/i.test(n)) return '<span class="badge good">Saved</span>';
  return '<span class="badge neutral">None</span>';
}

function renderMedia() {
  $('mediaGrid').innerHTML = state.media.length ? state.media.map(m => `<article class="media-card">
    <div class="media-thumb">${m.LogoURL ? `<img src="${escAttr(m.LogoURL)}" alt="">` : '<div class="placeholder">IMAGE</div>'}</div>
    <div class="media-meta"><strong>${esc(m.Title || m.LogoKey)}</strong><small>${esc(m.LogoKey || '')}</small><div class="card-actions"><button class="small-btn" data-copy-media="${escAttr(m.LogoURL || '')}">Copy URL</button><button class="small-btn archive" data-archive-media="${escAttr(m.LogoKey || '')}">Hide</button></div></div>
  </article>`).join('') : '<div class="empty-state">No uploaded media yet. External logo URLs already saved in Categories/Links still work.</div>';
}

function populateFilters() {
  const catOpts = '<option value="">All categories</option>' + state.categories.filter(c=>c.Active !== false)
    .map(c=>`<option value="${escAttr(c.CategoryKey)}">${esc(c.Title || c.CategoryKey)}</option>`).join('');
  $('activityCategoryFilter').innerHTML = catOpts;
  $('linkCategoryFilter').innerHTML = catOpts;
}

function renderSettings() {
  $('settingsTable').innerHTML = state.settings.length ? state.settings.map((s,i) => `
    <div class="settings-row">
      <code>${esc(s.SettingKey || '')}</code>
      <input data-setting-value="${i}" value="${escAttr(s.SettingValue || '')}">
      <input data-setting-description="${i}" value="${escAttr(s.Description || '')}">
      <button class="small-btn" data-save-setting="${i}">Save</button>
    </div>`).join('') : '<div class="empty-state">No settings found.</div>';
}

function renderAudit() {
  const rows = state.audit || [];
  $('auditTable').innerHTML = rows.length ? rows.slice(0,100).map(x => `<tr><td>${esc(formatTime(x.Timestamp))}</td><td>${esc(x.Action)}</td><td>${esc(x.Target)}</td><td>${esc(x.Details)}</td><td>${esc(x.Status)}</td></tr>`).join('') : '<tr><td colspan="5">No recent admin activity.</td></tr>';
}

function formatTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

function setPage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  document.querySelector('.sidebar')?.classList.remove('open');
  if (page === 'system') loadAudit();
  if (page === 'eventplan' && window.renderEventPlanPage) window.renderEventPlanPage();
}

async function loadAudit() {
  try {
    const r = await callProtected('adminAudit');
    state.audit = r.entries || [];
    renderAudit();
  } catch (e) { /* dashboard can still work if audit read fails */ }
}

function closeModal() {
  $('modalBackdrop').classList.add('hidden');
  $('modalBody').innerHTML = '';
  $('modalFooter').innerHTML = '';
  pendingModalSave = null;
}
function openModal({eyebrow='',title='',subtitle='',body='',footer=''}) {
  $('modalEyebrow').textContent = eyebrow;
  $('modalTitle').textContent = title;
  $('modalSubtitle').textContent = subtitle || '';
  $('modalBody').innerHTML = body;
  $('modalFooter').innerHTML = footer;
  $('modalBackdrop').classList.remove('hidden');
}
function modalFooter(saveText='Save') {
  return `<button class="ghost" id="modalCancelBtn">Cancel</button><button class="primary" id="modalSaveBtn">${esc(saveText)}</button>`;
}
function selectedOpt(value, expected) { return String(value ?? '') === String(expected) ? ' selected' : ''; }
function boolChecked(v) { return v ? ' checked' : ''; }

function mediaSelect(name, selectedKey, selectedUrl, uploadTitle='JOTA-JOTI image', categoryKey='', itemKey='') {
  const options = ['<option value="">No image</option>']
    .concat(state.media.map(m => `<option value="${escAttr(m.LogoKey)}"${selectedOpt(selectedKey,m.LogoKey)}>${esc(m.Title || m.LogoKey)}</option>`));
  const fallback = selectedKey && !state.media.some(m => String(m.LogoKey) === String(selectedKey))
    ? `<option value="${escAttr(selectedKey)}" selected>${esc(selectedKey)}</option>` : '';
  return `<label>Photo / logo<select id="${name}" data-media-select="${name}">${fallback}${options.join('')}</select>
    <input id="${name}Upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="inline-upload">
    <div class="field-help">${selectedUrl ? `Current image: ${esc(selectedUrl)}` : 'Pick an existing image from the live Logos sheet, or upload a new image here.'}</div></label>`;
}

async function uploadInlineAsset(inputId, title, categoryKey='', itemKey='') {
  const input = $(inputId);
  const file = input?.files?.[0];
  if (!file) return null;
  if (file.size > 6 * 1024 * 1024) throw new Error('Keep each image under 6 MB.');
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
  if (!base64) throw new Error('Could not read the selected image.');
  const r = await callProtected('adminUploadAsset', {}, {
    base64, mimeType:file.type, filename:file.name, title:title || file.name, CategoryKey:categoryKey, ItemKey:itemKey
  });
  return r.asset || null;
}

function attachModalSave(handler, saveLabel) {
  pendingModalSave = handler;
  $('modalSaveBtn').textContent = saveLabel || 'Save';
  $('modalSaveBtn').onclick = async () => {
    const btn = $('modalSaveBtn'); if (!btn) return;
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await pendingModalSave();
      closeModal();
    } catch (e) {
      toast(e.message || String(e), false);
      btn.disabled = false; btn.textContent = saveLabel || 'Save';
    }
  };
  $('modalCancelBtn').onclick = closeModal;
}

function openUserModal(id) {
  const u = state.users.find(x => String(x.ParticipantID) === String(id));
  if (!u) return;
  openModal({
    eyebrow:'PARTICIPANT ACCOUNT',title:u.Name || 'Edit participant',
    subtitle:`${u.ParticipantID} · PIN ${u.PIN || '—'}`,
    body:`<div class="form-grid">
      <label>Name<input id="uName" value="${escAttr(u.Name)}"></label>
      <label>Age / section<input id="uAgeYear" value="${escAttr(u.AgeYear || u.AgeGroup || '')}"></label>
      <label>PIN<input id="uPin" inputmode="numeric" maxlength="4" value="${escAttr(u.PIN)}"></label>
      <label>Username<input id="uUsername" value="${escAttr(u.Username)}"></label>
      <label>Password<input id="uPassword" value="${escAttr(u.Password)}"></label>
      <label>Youth email<input id="uEmail" value="${escAttr(u.Email)}"></label>
      <label>Parent name<input id="uParentName" value="${escAttr(u.ParentName)}"></label>
      <label>Parent email<input id="uParentEmail" value="${escAttr(u.ParentEmail)}"></label>
      <label>Parent phone<input id="uParentPhone" value="${escAttr(u.ParentPhone || '')}"></label>
      <label>Status<select id="uStatus"><option${selectedOpt(u.Status,'Pending')}>Pending</option><option${selectedOpt(u.Status,'Active')}>Active</option><option${selectedOpt(u.Status,'Disabled')}>Disabled</option></select></label>
      <label>Paperwork status<select id="uPaperwork"><option${selectedOpt(u.PaperworkStatus,'Required')}>Required</option><option${selectedOpt(u.PaperworkStatus,'Not Started')}>Not Started</option><option${selectedOpt(u.PaperworkStatus,'Complete')}>Complete</option></select></label>
      <label>Allowed categories<input id="uAllowed" value="${escAttr(u.AllowedCategories)}"><div class="field-help">Use * for all configured categories or comma-separated keys.</div></label>
      <label class="full">Notes<textarea id="uNotes">${esc(u.Notes)}</textarea></label>
    </div>`,
    footer:modalFooter('Save account')
  });
  attachModalSave(async () => {
    const payload = {
      ParticipantID:id, Name:$('uName').value.trim(), AgeYear:$('uAgeYear').value.trim(),
      PIN:$('uPin').value.trim(), Username:$('uUsername').value.trim(), Password:$('uPassword').value.trim(),
      Email:$('uEmail').value.trim(), ParentName:$('uParentName').value.trim(),
      ParentEmail:$('uParentEmail').value.trim(), ParentPhone:$('uParentPhone').value.trim(), Status:$('uStatus').value,
      PaperworkStatus:$('uPaperwork').value, AllowedCategories:$('uAllowed').value.trim(),
      Notes:$('uNotes').value
    };
    const result = await callProtected('adminUserSave',{},payload);
    const updated = result.user;
    state.users = state.users.map(x => String(x.ParticipantID) === id ? updated : x);
    renderAll();
    toast('Participant updated.');
  },'Save account');
}

function openActivityModal(id='') {
  const a = state.activities.find(x=>String(x.ActivityID)===String(id)) || {
    ActivityID:'',Title:'',Description:'',CategoryKey:state.categories.find(c=>c.Active!==false)?.CategoryKey || '',
    Duration:'',Difficulty:'',Participants:'',Equipment:'',InstructionsURL:'',LeaderRequired:false,Active:true,PhotoURL:'',PhotoKey:'',CanEmbed:false,IsHTML:false,Notes:''
  };
  const contentType = a.IsHTML || (a.InstructionsURL && !/^https?:\/\//i.test(a.InstructionsURL)) ? 'html' : 'url';
  openModal({
    eyebrow:'ACTIVITY BUILDER',title:id?'Edit activity':'Add activity',
    subtitle:'Set the participant-facing activity details, content and image.',
    body:`<div class="form-grid">
      <label>Title<input id="aTitle" value="${escAttr(a.Title)}"></label>
      <label>Category<select id="aCategory">${state.categories.map(c=>`<option value="${escAttr(c.CategoryKey)}"${selectedOpt(a.CategoryKey,c.CategoryKey)}>${esc(c.Title || c.CategoryKey)}</option>`).join('')}</select></label>
      <label>Duration<input id="aDuration" placeholder="e.g. 30 minutes" value="${escAttr(a.Duration)}"></label>
      <label>Difficulty<select id="aDifficulty"><option value="">Not set</option><option${selectedOpt(a.Difficulty,'Easy')}>Easy</option><option${selectedOpt(a.Difficulty,'Medium')}>Medium</option><option${selectedOpt(a.Difficulty,'Hard')}>Hard</option></select></label>
      <label>Participants<input id="aParticipants" placeholder="e.g. 2–6" value="${escAttr(a.Participants)}"></label>
      <label>Equipment<input id="aEquipment" placeholder="e.g. Phones, paper, pens" value="${escAttr(a.Equipment)}"></label>
      ${mediaSelect('aPhotoKey',a.PhotoKey,a.PhotoURL,a.Title || 'Activity image',a.CategoryKey,a.ActivityID || '')}
      <label>Active<select id="aActive"><option value="true"${a.Active!==false?' selected':''}>Active</option><option value="false"${a.Active===false?' selected':''}>Archived</option></select></label>
      <div class="full">
        <label>Description<textarea id="aDescription" rows="5">${esc(a.Description)}</textarea></label>
      </div>
      <div class="full">
        <label>Instructions content type</label>
        <div class="radio-row">
          <label class="radio-chip"><input name="aContentType" type="radio" value="url"${contentType==='url'?' checked':''}> URL</label>
          <label class="radio-chip"><input name="aContentType" type="radio" value="html"${contentType==='html'?' checked':''}> HTML code</label>
        </div>
      </div>
      <div class="full">
        <label id="aInstructionsLabel">${contentType==='html'?'HTML code':'Instructions URL'}<textarea id="aInstructions" rows="7">${esc(a.InstructionsURL)}</textarea></label>
        <div class="field-help">HTML is rendered only in a sandboxed dashboard iframe when Embed is enabled.</div>
      </div>
      <div class="check-grid full">
        <div class="check-card"><label><input id="aLeaderRequired" type="checkbox"${boolChecked(a.LeaderRequired)}> Leader required</label></div>
        <div class="check-card"><label><input id="aCanEmbed" type="checkbox"${boolChecked(a.CanEmbed)}> Can embed</label></div>
      </div>
      <label class="full">Admin notes<textarea id="aNotes" rows="3">${esc(a.Notes)}</textarea></label>
      <div class="callout full"><strong>Photo upload:</strong> upload the image first in Photos &amp; Logos. It will then appear in this picker.</div>
    </div>`,
    footer:modalFooter(id?'Save activity':'Create activity')
  });

  document.querySelectorAll('input[name="aContentType"]').forEach(r => r.onchange = () => {
    $('aInstructionsLabel').firstChild.textContent = r.value === 'html' ? 'HTML code' : 'Instructions URL';
  });

  attachModalSave(async () => {
    let photoKey = $('aPhotoKey').value;
    let photo = mediaByKey(photoKey);
    if ($('aPhotoKeyUpload')?.files?.length) {
      photo = await uploadInlineAsset('aPhotoKeyUpload', $('aTitle').value.trim() || 'Activity image', $('aCategory').value, a.ActivityID || '');
      photoKey = photo?.LogoKey || '';
    }
    const isHtml = document.querySelector('input[name="aContentType"]:checked')?.value === 'html';
    const payload = {
      ActivityID:a.ActivityID, Title:$('aTitle').value.trim(), CategoryKey:$('aCategory').value,
      Duration:$('aDuration').value.trim(), Difficulty:$('aDifficulty').value,
      Participants:$('aParticipants').value.trim(), Equipment:$('aEquipment').value.trim(),
      Description:$('aDescription').value, InstructionsURL:$('aInstructions').value.trim(),
      LeaderRequired:$('aLeaderRequired').checked, CanEmbed:$('aCanEmbed').checked,
      IsHTML:isHtml, Active:$('aActive').value === 'true',
      PhotoKey:photoKey, PhotoURL:photo?.LogoURL || a.PhotoURL || '',
      Notes:$('aNotes').value
    };
    const result = await callProtected('adminActivitySave',{},payload);
    const saved = result.activity;
    state.activities = [...state.activities.filter(x=>String(x.ActivityID)!==String(saved.ActivityID)),saved];
    renderAll(); toast(id?'Activity updated.':'Activity created.');
  },id?'Save activity':'Create activity');
}

function openCategoryModal(key='') {
  const c = state.categories.find(x=>String(x.CategoryKey)===String(key)) || {
    CategoryKey:'',Title:'',Description:'',LogoKey:'',LogoURL:'',Active:true
  };
  openModal({
    eyebrow:'CATEGORY BUILDER',title:key?'Edit category':'Add category',
    subtitle:'Categories become the large cards participants see on the dashboard.',
    body:`<div class="form-grid">
      <label>Category key<input id="cKey" placeholder="e.g. online-chats" value="${escAttr(c.CategoryKey)}" ${key?'readonly':''}><div class="field-help">Stable key used by links and activities. Keep it short.</div></label>
      <label>Title<input id="cTitle" value="${escAttr(c.Title)}"></label>
      ${mediaSelect('cLogoKey',c.LogoKey,c.LogoURL,c.Title || 'Category logo',c.CategoryKey,'')}
      <label>Active<select id="cActive"><option value="true"${c.Active!==false?' selected':''}>Active</option><option value="false"${c.Active===false?' selected':''}>Archived</option></select></label>
      <label class="full">Description<textarea id="cDescription" rows="4">${esc(c.Description)}</textarea></label>
    </div>`,
    footer:modalFooter(key?'Save category':'Create category')
  });
  attachModalSave(async () => {
    let logo = mediaByKey($('cLogoKey').value);
    let logoKey = $('cLogoKey').value;
    if ($('cLogoKeyUpload')?.files?.length) {
      logo = await uploadInlineAsset('cLogoKeyUpload', $('cTitle').value.trim() || 'Category logo', $('cKey').value.trim(), '');
      logoKey = logo?.LogoKey || '';
    }
    const payload = {
      CategoryKey:$('cKey').value.trim(), Title:$('cTitle').value.trim(),
      LogoKey:logoKey, LogoURL:logo?.LogoURL || c.LogoURL || '',
      Description:$('cDescription').value, Active:$('cActive').value === 'true'
    };
    const result = await callProtected('adminCategorySave',{},payload);
    const saved=result.category;
    state.categories=[...state.categories.filter(x=>x.CategoryKey!==saved.CategoryKey),saved].sort((a,b)=>a.Title.localeCompare(b.Title));
    renderAll(); toast(key?'Category updated.':'Category created.');
  },key?'Save category':'Create category');
}

function openLinkModal(id='') {
  const l=state.links.find(x=>String(x.LinkID)===String(id)) || {
    LinkID:'',CategoryKey:state.categories.find(c=>c.Active!==false)?.CategoryKey||'',Title:'',URL:'',
    CanEmbed:false,RequiresLogin:'0',RequiresEmail:'0',ParentApproval:false,LeaderApproved:false,Moderated:false,
    Active:true,LogoKey:'',LogoURL:'',BlockStatus:'allow',Notes:'',IsHTML:false
  };
  const type = l.IsHTML || (l.URL && !/^https?:\/\//i.test(l.URL)) ? 'html' : 'url';
  openModal({
    eyebrow:'RESOURCE BUILDER',title:id?'Edit link':'Add link',
    subtitle:'Add a normal website or paste a complete HTML page/snippet.',
    body:`<div class="form-grid">
      <label>Title<input id="lTitle" value="${escAttr(l.Title)}"></label>
      <label>Category<select id="lCategory">${state.categories.map(c=>`<option value="${escAttr(c.CategoryKey)}"${selectedOpt(l.CategoryKey,c.CategoryKey)}>${esc(c.Title || c.CategoryKey)}</option>`).join('')}</select></label>
      <div class="full">
        <label>Content type</label>
        <div class="radio-row">
          <label class="radio-chip"><input name="lContentType" type="radio" value="url"${type==='url'?' checked':''}> URL</label>
          <label class="radio-chip"><input name="lContentType" type="radio" value="html"${type==='html'?' checked':''}> HTML code</label>
        </div>
      </div>
      <label class="full" id="lContentLabel">${type==='html'?'HTML code':'URL'}<textarea id="lContent" rows="8">${esc(l.URL)}</textarea></label>
      <label>Can embed<select id="lCanEmbed"><option value="true"${l.CanEmbed?' selected':''}>Yes</option><option value="false"${!l.CanEmbed?' selected':''}>No</option></select></label>
      <label>Login requirement<select id="lLogin"><option value="0"${selectedOpt(l.RequiresLogin,'0')}>None</option><option value="1"${selectedOpt(l.RequiresLogin,'1')}>Saved account</option><option value="3"${selectedOpt(l.RequiresLogin,'3')}>External site's own account</option></select></label>
      <label>Email requirement<select id="lEmail"><option value="0"${selectedOpt(l.RequiresEmail,'0')}>None</option><option value="1"${selectedOpt(l.RequiresEmail,'1')}>Saved email</option><option value="3"${selectedOpt(l.RequiresEmail,'3')}>External site's own email</option></select></label>
      ${mediaSelect('lLogoKey',l.LogoKey,l.LogoURL,l.Title || 'Resource logo',l.CategoryKey,l.LinkID || '')}
      <label>Block status<select id="lBlockStatus"><option value="allow"${selectedOpt(l.BlockStatus,'allow')}>Allow</option><option value="review"${selectedOpt(l.BlockStatus,'review')}>Review</option><option value="blocked"${selectedOpt(l.BlockStatus,'blocked')}>Blocked</option></select></label>
      <div class="check-grid full">
        <div class="check-card"><label><input id="lParentApproval" type="checkbox"${boolChecked(l.ParentApproval)}> Parent approval</label></div>
        <div class="check-card"><label><input id="lLeaderApproved" type="checkbox"${boolChecked(l.LeaderApproved)}> Leader approved</label></div>
        <div class="check-card"><label><input id="lModerated" type="checkbox"${boolChecked(l.Moderated)}> Moderated</label></div>
      </div>
      <label class="full">Active<select id="lActive"><option value="true"${l.Active!==false?' selected':''}>Active</option><option value="false"${l.Active===false?' selected':''}>Archived</option></select></label>
      <label class="full">Notes<textarea id="lNotes" rows="3">${esc(l.Notes)}</textarea></label>
    </div>`,
    footer:modalFooter(id?'Save link':'Create link')
  });

  document.querySelectorAll('input[name="lContentType"]').forEach(r => r.onchange = () => $('lContentLabel').firstChild.textContent = r.value === 'html' ? 'HTML code' : 'URL');

  attachModalSave(async () => {
    let logo=mediaByKey($('lLogoKey').value);
    let logoKey=$('lLogoKey').value;
    if ($('lLogoKeyUpload')?.files?.length) {
      logo=await uploadInlineAsset('lLogoKeyUpload', $('lTitle').value.trim() || 'Resource logo', $('lCategory').value, l.LinkID || '');
      logoKey=logo?.LogoKey || '';
    }
    const isHtml=document.querySelector('input[name="lContentType"]:checked')?.value==='html';
    const payload={
      LinkID:l.LinkID,CategoryKey:$('lCategory').value,Title:$('lTitle').value.trim(),URL:$('lContent').value.trim(),
      IsHTML:isHtml,CanEmbed:$('lCanEmbed').value==='true',RequiresLogin:$('lLogin').value,RequiresEmail:$('lEmail').value,
      ParentApproval:$('lParentApproval').checked,LeaderApproved:$('lLeaderApproved').checked,Moderated:$('lModerated').checked,
      Active:$('lActive').value==='true',LogoKey:logoKey,LogoURL:logo?.LogoURL||l.LogoURL||'',
      BlockStatus:$('lBlockStatus').value,Notes:$('lNotes').value
    };
    const result=await callProtected('adminLinkSave',{},payload);
    const saved=result.link;
    state.links=[...state.links.filter(x=>String(x.LinkID)!==String(saved.LinkID)),saved];
    renderAll();toast(id?'Link updated.':'Link created.');
  },id?'Save link':'Create link');
}

function printPasswordSheet() {
  const rows=state.users.filter(u=>String(u.ParticipantID)!=='guest').sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
  const win=window.open('','_blank','width=1100,height=800');
  if(!win){toast('Your browser blocked the print window.',false);return;}
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>JOTA-JOTI Account Passwords</title><style>
    body{font-family:Arial,sans-serif;padding:28px;color:#17232d}h1{margin:0 0 4px}p{margin:4px 0 18px;color:#60707a}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cfd8dd;padding:7px;text-align:left}th{background:#eef3f5}
    .warn{margin:16px 0;padding:10px;background:#fff2d8;border:1px solid #e6c98c}.pw{font-family:monospace;font-weight:bold}
    @media print{button{display:none}.warn{break-inside:avoid}body{padding:10px}}
  </style></head><body><h1>JOTA-JOTI Account List</h1><p>Boulder Scout Group · Generated ${esc(new Date().toLocaleString())}</p>
    <div class="warn"><strong>Private document.</strong> This sheet contains participant usernames, PINs and passwords. Keep it secure.</div>
    <table><thead><tr><th>Name</th><th>Section</th><th>Username</th><th>Password</th><th>PIN</th><th>Parent email</th><th>Paperwork</th><th>Status</th></tr></thead><tbody>
    ${rows.map(u=>`<tr><td>${esc(u.Name)}</td><td>${esc(u.AgeYear||u.AgeGroup)}</td><td class="pw">${esc(u.Username)}</td><td class="pw">${esc(u.Password)}</td><td class="pw">${esc(u.PIN)}</td><td>${esc(u.ParentEmail)}</td><td>${esc(u.PaperworkStatus)}</td><td>${esc(u.Status)}</td></tr>`).join('')}
    </tbody></table><button onclick="window.print()">Print</button></body></html>`);
  win.document.close();
  setTimeout(()=>win.print(),300);
}

function downloadAccountCsv() {
  const rows = state.users.filter(u => String(u.ParticipantID || '').toLowerCase() !== 'guest')
    .sort((a,b)=>String(a.Name).localeCompare(String(b.Name)));
  if (!rows.length) { toast('There are no participant accounts to export.', false); return; }
  const headers = ['ParticipantID','Name','Section','Username','Password','PIN','YouthEmail','ParentName','ParentEmail','ParentPhone','PaperworkStatus','Status'];
  const csvCell = value => '"' + String(value == null ? '' : value).replace(/"/g,'""') + '"';
  const lines = [headers.map(csvCell).join(',')];
  rows.forEach(u => lines.push([
    u.ParticipantID,u.Name,u.AgeYear || u.AgeGroup,u.Username,u.Password,u.PIN,
    u.Email,u.ParentName,u.ParentEmail,u.ParentPhone,u.PaperworkStatus,u.Status
  ].map(csvCell).join(',')));
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `JOTA-JOTI-account-list-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Account CSV downloaded. Keep it private.');
}

async function downloadPasswordPdf() {
  try {
    toast('Generating the private password PDF…');
    const r=await callProtected('adminAccountPdf',{},null);
    const pdf = r.pdf || r;
    if (pdf.base64) {
      const binary = atob(pdf.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {type: pdf.mimeType || 'application/pdf'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = pdf.filename || 'JOTA-JOTI-Account-List.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      toast('Password PDF downloaded. Keep it private.');
      return;
    }
    if(r.url) window.open(r.url,'_blank','noopener,noreferrer');
    toast('Password PDF generated.');
  } catch(e){toast(e.message,false);}
}

async function refreshReminderCount() {
  try {
    const r=await callProtected('adminPaperworkReminderPreview');
    $('reminderCountBadge').textContent=`${r.eligible} eligible`;
    $('reminderCountBadge').className=`badge ${r.eligible ? 'warn' : 'good'}`;
    return r;
  } catch(e) {
    $('reminderCountBadge').textContent='Unavailable';
    $('reminderCountBadge').className='badge bad';
  }
}

async function sendPaperworkReminders() {
  const preview=await refreshReminderCount();
  if(!preview?.eligible) { showMessage('reminderMessage','There are no eligible parent emails needing a reminder.',false); return; }
  if(!confirm(`Send ${preview.eligible} paperwork reminder email(s)? Completed paperwork is excluded again on the server immediately before sending.`)) return;
  try {
    showMessage('reminderMessage','Sending reminders… Do not press the button again.',true);
    const r=await callProtected('adminPaperworkReminders',{},{
      subject:$('reminderSubject').value.trim(),
      htmlBody:$('reminderBody').value.trim()
    });
    let msg=`Sent ${r.result?.sent || 0} reminder(s) out of ${r.result?.attempted || 0}.`;
    if(r.result?.failed?.length) msg+=`\nFailures:\n${r.result.failed.join('\n')}`;
    showMessage('reminderMessage',msg,!r.result?.failed?.length);
    toast('Reminder run finished.');
    await loadAll();
  } catch(e){showMessage('reminderMessage',e.message,false);}
}

function bulkPayload() {
  const scope=$('bulkScope').value, targetType=$('bulkTargetType').value;
  const payload={subject:$('bulkSubject').value.trim(),htmlBody:$('bulkBody').value.trim(),targetType,scope};
  if(!payload.subject) throw new Error('Enter a subject.');
  if(!payload.htmlBody) throw new Error('Write an HTML message.');
  if(scope==='section') payload.ageGroup=$('bulkScopeValue').value.trim();
  if(scope==='selected') payload.participantIds=$('bulkScopeValue').value.split(',').map(x=>x.trim()).filter(Boolean);
  return payload;
}
async function previewBulk() {
  try {
    const p=bulkPayload();
    const r=await callProtected('adminPreview',{},p);
    showMessage('bulkMessage',`Ready to send ${r.totalRecipients} email(s) to ${r.matchedUsers} matched user(s). Missing emails: ${r.missingEmails}.`,true);
  } catch(e){showMessage('bulkMessage',e.message,false);}
}
async function sendBulk() {
  try {
    const p=bulkPayload();
    const r1=await callProtected('adminPreview',{},p);
    if(!confirm(`Send this message to ${r1.totalRecipients} email(s)?`)) return;
    showMessage('bulkMessage','Sending… Do not press Send again.',true);
    const r=await callProtected('adminSend',{},p);
    let msg=`Sent ${r.sent} of ${r.total} email(s).`;
    if(r.failed?.length) msg+=`\nFailures:\n${r.failed.join('\n')}`;
    showMessage('bulkMessage',msg,!r.failed?.length);
    await loadAll();
  } catch(e){showMessage('bulkMessage',e.message,false);}
}

function updateBulkScopeHint() {
  const s=$('bulkScope').value;
  $('bulkScopeValueWrap').classList.toggle('hidden',s==='all');
  const field=$('bulkScopeValue');
  field.placeholder=s==='section' ? 'e.g. Scout, Cub, Joey, Vent or your saved AgeYear label' : 'Comma-separated ParticipantIDs';
}

async function normalizeContent() {
  const msg = $('systemMessage');
  try {
    if (!confirm('Import and repair the live sheet content now? Existing rows will be kept; the system will fill missing logo URLs, photo URLs, HTML flags and Active values from the live data.')) return;
    showMessage('systemMessage','Repairing live spreadsheet content…',true);
    const r = await callProtected('adminNormalizeContent');
    const x = r.result || {};
    showMessage('systemMessage',`Done. Repaired ${x.categoriesFixed || 0} category/link/media defaults and ${x.linksFixed || 0} links / ${x.activitiesFixed || 0} activities.`,true);
    await loadAll(); await loadAudit();
    toast('Live sheet content repaired.');
  } catch(e) { showMessage('systemMessage',e.message,false); }
}

async function loadSettings() {
  try { const r=await callProtected('adminSettings'); state.settings=r.settings||[]; renderSettings(); }
  catch(e){toast('Could not load settings: '+e.message,false);}
}
async function saveSetting(index) {
  const s=state.settings[index];
  if(!s) return;
  try {
    const r=await callProtected('adminSettingsSave',{},{
      SettingKey:s.SettingKey,
      SettingValue:document.querySelector(`[data-setting-value="${index}"]`).value,
      Description:document.querySelector(`[data-setting-description="${index}"]`).value
    });
    state.settings[index]=r.settings || r.setting || s;
    renderSettings(); toast('Setting saved.');
  } catch(e){toast(e.message,false);}
}

async function runFullSetup() {
  if(!confirm('Run the full Apps Script spreadsheet setup? This can recreate missing headers/triggers and warm the cache.')) return;
  try {
    showMessage('systemMessage','Running setup…',true);
    const r=await callProtected('adminRunSetup');
    showMessage('systemMessage',String(r.result || 'Setup completed.'),true);
    toast('System setup completed.');
    await loadAll();
  } catch(e){showMessage('systemMessage',e.message,false);}
}
async function clearCache() {
  try {
    await callProtected('adminClearCache',{},null);
    showMessage('systemMessage','Public dashboard cache cleared.',true);
    toast('Cache cleared.');
  } catch(e){showMessage('systemMessage',e.message,false);}
}
async function uploadMedia() {
  const input=$('mediaUploadFile');
  const file=input?.files?.[0];
  if(!file){showMessage('mediaMessage','Choose an image first.',false);return;}
  if(file.size>6*1024*1024){showMessage('mediaMessage','Keep each image under 6 MB.',false);return;}
  const reader=new FileReader();
  reader.onload=async()=>{
    try{
      const base64=String(reader.result).split(',')[1]||'';
      if(!base64) throw new Error('Could not read that image.');
      showMessage('mediaMessage','Uploading…',true);
      const r=await callProtected('adminUploadAsset',{},{
        base64,mimeType:file.type,filename:file.name,title:$('mediaUploadTitle').value.trim()||file.name,
        CategoryKey:$('mediaUploadCategory').value.trim()
      });
      showMessage('mediaMessage','Upload complete. The image is now available in all media pickers.',true);
      $('mediaUploadFile').value=''; $('mediaUploadTitle').value=''; $('mediaUploadCategory').value='';
      await loadAll();
      if(r.asset?.LogoURL){ $('mediaUploadPreview').innerHTML=`<img src="${escAttr(r.asset.LogoURL)}" alt="">`; }
    }catch(e){showMessage('mediaMessage',e.message,false);}
  };
  reader.onerror=()=>showMessage('mediaMessage','Could not read the selected file.',false);
  reader.readAsDataURL(file);
}

function setupTags() {
  document.querySelectorAll('.tag-row').forEach(row=>{
    const target=row.dataset.target;
    row.innerHTML=TAGS.map(t=>`<button type="button" class="tag" data-insert-tag="${escAttr(t)}" data-tag-target="${escAttr(target)}">${esc(t)}</button>`).join('');
  });
}
function insertTag(targetId,tag) {
  const el=$(targetId); if(!el)return;
  const start=el.selectionStart ?? el.value.length, end=el.selectionEnd ?? el.value.length;
  el.value=el.value.slice(0,start)+tag+el.value.slice(end);
  el.focus(); el.selectionStart=el.selectionEnd=start+tag.length;
}

async function archiveOrRestore(type,id,currentlyActive) {
  const action = type==='activity' ? 'adminActivityDelete' : type==='category' ? 'adminCategoryDelete' : 'adminLinkDelete' ;
  if(currentlyActive && !confirm(`Archive this ${type}? It will disappear from the public dashboard but remain in the sheet.`)) return;
  if(!currentlyActive){
    // Restore is handled by saving the full existing row.
    try{
      if(type==='activity'){
        const a=state.activities.find(x=>String(x.ActivityID)===String(id)); if(!a)return;
        a.Active=true; await callProtected('adminActivitySave',{},a);
      } else if(type==='category'){
        const c=state.categories.find(x=>String(x.CategoryKey)===String(id)); if(!c)return;
        c.Active=true; await callProtected('adminCategorySave',{},c);
      } else {
        const l=state.links.find(x=>String(x.LinkID)===String(id)); if(!l)return;
        l.Active=true; await callProtected('adminLinkSave',{},l);
      }
      await loadAll(); toast(`${type[0].toUpperCase()+type.slice(1)} restored.`);
    }catch(e){toast(e.message,false);}
    return;
  }
  try {
    await callProtected(action,{}, type==='activity'?{ActivityID:id}:type==='category'?{CategoryKey:id}:{LinkID:id});
    await loadAll();
    toast(`${type[0].toUpperCase()+type.slice(1)} archived.`);
  }catch(e){toast(e.message,false);}
}

async function archiveMedia(key) {
  if(!confirm('Hide this image from the admin media picker? It will not be deleted from Drive.'))return;
  try{await callProtected('adminMediaDelete',{}, {LogoKey:key});await loadAll();toast('Media item hidden.');}
  catch(e){toast(e.message,false);}
}

function previewUploadImage() {
  const file=$('mediaUploadFile')?.files?.[0]; const box=$('mediaUploadPreview'); if(!box)return;
  if(!file){box.innerHTML='';return;}
  const url=URL.createObjectURL(file); box.innerHTML=`<img src="${url}" alt="">`;
}

function setupEvents() {
  $('loginForm').onsubmit=async e=>{
    e.preventDefault();
    hideMessage('loginMessage');
    const btn=$('loginBtn');btn.disabled=true;btn.textContent='Signing in…';
    try{
      const result=await login($('adminPassword').value.trim());
      $('adminPassword').value='';
      showApp();
      await loadAll();
      toast(`Signed in${result.sender ? ' as '+result.sender : ''}.`);
    }catch(err){showMessage('loginMessage',err.message,false);}
    finally{btn.disabled=false;btn.textContent='Sign in';}
  };
  $('togglePassword').onclick=()=>{
    const p=$('adminPassword');const shown=p.type==='text';p.type=shown?'password':'text';$('togglePassword').textContent=shown?'Show':'Hide';
  };
  $('logoutBtn').onclick=()=>{adminToken='';adminTokenExpiry=0;sessionStorage.removeItem(AUTH_TOKEN_KEY);sessionStorage.removeItem(AUTH_EXPIRY_KEY);showLogin('Signed out.');};
  $('mobileMenuBtn').onclick=()=>document.querySelector('.sidebar')?.classList.toggle('open');
  $('mobileRefreshBtn').onclick=()=>loadAll().catch(e=>toast(e.message,false));
  $('mainNav').onclick=e=>{const b=e.target.closest('.nav-btn');if(b)setPage(b.dataset.page);};
  document.addEventListener('click',async e=>{
    const copy=e.target.closest('[data-copy]'); if(copy){try{await navigator.clipboard.writeText(copy.dataset.copy);toast('Copied.');}catch(_){toast('Could not copy automatically.',false)}}
    const act=e.target.closest('[data-action]'); if(act){if(act.dataset.action==='newActivity'){setPage('activities');openActivityModal();}if(act.dataset.action==='newCategory'){setPage('categories');openCategoryModal();}if(act.dataset.action==='passwordPdf')downloadPasswordPdf();if(act.dataset.action==='reminders'){setPage('emails');refreshReminderCount();}}
    const editUser=e.target.closest('[data-edit-user]'); if(editUser)openUserModal(editUser.dataset.userId);
    const resend=e.target.closest('[data-resend-welcome]');
    if(resend){
      const id=String(resend.dataset.resendWelcome||'');
      const user=state.users.find(x=>String(x.ParticipantID)===id);
      if(!user) return;
      if(!confirm(`Resend the welcome/account email to ${user.ParentEmail || 'the parent'}?`)) return;
      try{
        resend.disabled=true; resend.textContent='Sending…';
        await callProtected('adminResendWelcome',{}, {ParticipantID:id});
        toast('Welcome email resent.');
        await loadAll();
      }catch(e){toast(e.message,false);resend.disabled=false;resend.textContent='Resend';}
    }
    const editActivity=e.target.closest('[data-edit-activity]'); if(editActivity)openActivityModal(editActivity.dataset.editActivity);
    const editCategory=e.target.closest('[data-edit-category]'); if(editCategory)openCategoryModal(editCategory.dataset.editCategory);
    const editLink=e.target.closest('[data-edit-link]'); if(editLink)openLinkModal(editLink.dataset.editLink);
    const arcA=e.target.closest('[data-archive-activity]'); if(arcA){const a=state.activities.find(x=>String(x.ActivityID)===String(arcA.dataset.archiveActivity));archiveOrRestore('activity',arcA.dataset.archiveActivity,a?.Active!==false);}
    const arcC=e.target.closest('[data-archive-category]'); if(arcC){const c=state.categories.find(x=>String(x.CategoryKey)===String(arcC.dataset.archiveCategory));archiveOrRestore('category',arcC.dataset.archiveCategory,c?.Active!==false);}
    const arcL=e.target.closest('[data-archive-link]'); if(arcL){const l=state.links.find(x=>String(x.LinkID)===String(arcL.dataset.archiveLink));archiveOrRestore('link',arcL.dataset.archiveLink,l?.Active!==false);}
    const arcM=e.target.closest('[data-archive-media]'); if(arcM)archiveMedia(arcM.dataset.archiveMedia);
    const cm=e.target.closest('[data-copy-media]'); if(cm){navigator.clipboard?.writeText(cm.dataset.copyMedia).then(()=>toast('Image URL copied.')).catch(()=>toast('Could not copy URL.',false));}
    const saveSettingBtn=e.target.closest('[data-save-setting]'); if(saveSettingBtn)saveSetting(Number(saveSettingBtn.dataset.saveSetting));
    const tag=e.target.closest('[data-insert-tag]'); if(tag)insertTag(tag.dataset.tagTarget,tag.dataset.insertTag);
  });

  $('modalClose').onclick=closeModal;
  $('modalBackdrop').onclick=e=>{if(e.target===$('modalBackdrop'))closeModal();};

  $('refreshOverviewBtn').onclick=()=>loadAll().catch(e=>toast(e.message,false));
  $('refreshParticipantsBtn').onclick=()=>loadAll().catch(e=>toast(e.message,false));
  $('printPasswordsBtn').onclick=printPasswordSheet;
  $('downloadPasswordCsvBtn').onclick=downloadAccountCsv;
  $('downloadPasswordPdfBtn').onclick=downloadPasswordPdf;

  ['participantSearch','participantStatusFilter','participantPaperworkFilter'].forEach(id=>$(id).addEventListener('input',renderParticipants));
  ['participantStatusFilter','participantPaperworkFilter'].forEach(id=>$(id).addEventListener('change',renderParticipants));

  $('newActivityBtn').onclick=()=>openActivityModal();
  $('activitySearch').oninput=renderActivities;$('activityCategoryFilter').onchange=renderActivities;$('activityActiveFilter').onchange=renderActivities;
  $('newCategoryBtn').onclick=()=>openCategoryModal();
  $('newLinkBtn').onclick=()=>openLinkModal();
  $('linkSearch').oninput=renderLinks;$('linkCategoryFilter').onchange=renderLinks;$('linkActiveFilter').onchange=renderLinks;

  $('uploadMediaBtn').onclick=uploadMedia;$('mediaUploadFile').onchange=previewUploadImage;
  $('refreshEmailCountsBtn').onclick=refreshReminderCount;$('previewReminderBtn').onclick=refreshReminderCount;$('sendReminderBtn').onclick=sendPaperworkReminders;
  $('bulkScope').onchange=updateBulkScopeHint;$('previewBulkBtn').onclick=previewBulk;$('sendBulkBtn').onclick=sendBulk;

  $('runSetupBtn').onclick=runFullSetup;
  $('clearCacheBtn').onclick=clearCache;
  $('normalizeContentBtn').onclick=normalizeContent;
  $('systemPdfBtn').onclick=downloadPasswordPdf;
  $('refreshSettingsBtn').onclick=loadSettings;
  $('refreshAuditBtn').onclick=loadAudit;
}

async function boot() {
  setupEvents(); setupTags(); updateBulkScopeHint();
  $('publicSiteLink').href=SITE_URL;
  $('publicSiteLink').textContent=SITE_URL;
  if (await ensureAuth()) {
    showApp();
    try { await loadAll(); await loadAudit(); } catch(e) { showLogin(e.message); }
  } else {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded',boot);
