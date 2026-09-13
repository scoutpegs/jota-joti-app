/* Standalone JOTA-JOTI admin client.
   No sign-in is required. This calls the openAdmin* actions in Code.gs.

   Transport note:
   Apps Script ContentService intentionally redirects its response from
   script.google.com to a one-time script.googleusercontent.com URL.
   The admin client therefore uses ordinary cross-origin fetch(): GET for
   read-only calls and a CORS-safelisted form POST for preview/send. This
   avoids JSONP script execution and avoids iframe framing restrictions.
*/
const API_URL='https://script.google.com/macros/s/AKfycbwa3R5odIbwsPRQHHSedx4mbwRrsAE3tWLcfZX1d4Nq_QNBBDozp2TFX1jfq1eSCLwP/exec';
const SKIP_PAGE_URL = new URL('skip', window.location.href).href;
const TAGS=['{{childFirstName}}','{{childLastName}}','{{childFullName}}','{{parentName}}','{{username}}','{{pin}}','{{participantID}}','{{youthSection}}','{{ageYear}}','{{ageGroup}}','{{email}}','{{youthEmail}}','{{parentEmail}}'];
let users=[],sections=[],categories=[],groups=[],selected=[],allSelected=[],focusEl=null;
const $=id=>document.getElementById(id);
function showMsg(id,text,ok){const e=$(id);e.textContent=text;e.className='message '+(ok?'ok':'err')}
function b64url(obj){
  const s=JSON.stringify(obj);
  const bytes=new TextEncoder().encode(s);
  let bin='';
  bytes.forEach(b=>bin+=String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

const FETCH_TIMEOUT_MS=20000;
let requestCounter=0;

function makeRequestId(){
  requestCounter=(requestCounter+1)%1000000;
  return 'admin_'+Date.now().toString(36)+'_'+requestCounter.toString(36)+'_'+Math.random().toString(36).slice(2,10);
}

function normaliseApiResult(data, action){
  if(!data || typeof data!=='object') throw new Error('Apps Script '+action+' returned an invalid JSON response.');
  if(data.success===false) throw new Error(data.error||('Apps Script '+action+' failed.'));
  return data;
}

function requestUrl(action, params={}){
  const q=new URLSearchParams();
  q.set('action',action);
  Object.keys(params||{}).forEach(k=>{
    const v=params[k];
    if(v!==undefined && v!==null) q.set(k,String(v));
  });
  return API_URL+'?'+q.toString();
}

async function fetchWithTimeout(url, options={}, action='request'){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS);
  try{
    const response=await fetch(url,Object.assign({
      redirect:'follow',
      cache:'no-store',
      credentials:'omit',
      signal:controller.signal
    },options,{signal:controller.signal}));

    const text=await response.text();
    let data=null;
    try{data=JSON.parse(text);}catch(parseErr){
      const preview=text.replace(/\s+/g,' ').trim().slice(0,240);
      throw new Error(
        'Apps Script '+action+' returned non-JSON data (HTTP '+response.status+'). '+
        (preview?('Response started with: '+preview):'The response body was empty.')
      );
    }

    if(!response.ok){
      throw new Error('Apps Script '+action+' returned HTTP '+response.status+'. '+(data.error||data.message||''));
    }
    return normaliseApiResult(data,action);
  }catch(err){
    if(err && err.name==='AbortError'){
      throw new Error('Apps Script '+action+' timed out after '+Math.round(FETCH_TIMEOUT_MS/1000)+' seconds.');
    }
    if(err instanceof TypeError){
      throw new Error('The browser could not read the Apps Script response. Check that the Web App is deployed as "Execute as Me" and "Anyone", then try again. ('+err.message+')');
    }
    throw err;
  }finally{clearTimeout(timer)}
}

async function fetchGet(action,params={}){
  return fetchWithTimeout(requestUrl(action,params),{method:'GET'},action);
}

async function fetchPost(action,params={}){
  // application/x-www-form-urlencoded is a CORS-safelisted request type,
  // which avoids an OPTIONS preflight that Apps Script web apps are not
  // designed to answer. ContentService follows its normal redirect to
  // script.googleusercontent.com; fetch explicitly follows that redirect.
  const body=new URLSearchParams();
  body.set('action',action);
  Object.keys(params||{}).forEach(k=>{
    const v=params[k];
    if(v!==undefined && v!==null) body.set(k,String(v));
  });
  return fetchWithTimeout(API_URL,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:body.toString()
  },action);
}

async function call(action,params={}){
  // Reads stay GET so they are easy to inspect directly in a new browser tab.
  // Preview and Send use POST because their base64 HTML/email payloads can be
  // much larger than a practical URL length.
  if(action==='openAdminPreview' || action==='openAdminSend'){
    return fetchPost(action,params);
  }
  return fetchGet(action,params);
}

async function loadAll(){
  try{
    await call('adminPing');
    await call('health');
  }catch(e){
    throw new Error('Apps Script connection check failed: '+e.message);
  }

  let u=[];
  try{u=await call('openAdminUsers');}
  catch(e){throw new Error('Users API failed after a healthy Apps Script check: '+e.message)}
  users=Array.isArray(u)?u:(Array.isArray(u.users)?u.users:(Array.isArray(u.data)?u.data:[]));

  try{const r=await call('openAdminSections');sections=Array.isArray(r)?r:(r.sections||r.data||[]);}
  catch(e){sections=[];console.warn('Sections API failed:',e);}

  try{const r=await call('openAdminCategories');categories=Array.isArray(r)?r:(r.categories||r.data||[]);}
  catch(e){categories=[];console.warn('Categories API failed:',e);}

  try{const r=await call('openAdminGroups');groups=Array.isArray(r)?r:(r.groups||r.data||[]);}
  catch(e){groups=[];console.warn('Saved groups unavailable:',e);}

  let me={sender:'Admin',quota:'—'};
  try{me=await call('openAdminSender')||me;}
  catch(e){console.warn('Sender/quota endpoint unavailable:',e);}

  $('senderBadge').textContent=(me.sender||'Admin')+' · '+(me.quota??'—')+' emails left today';
  renderStats(me.quota);
  renderPeople();
  renderGroups();
  renderCategories();
  renderSavedGroups();
  refreshPreview();
}
function activeUsers(){return users.filter(u=>String(u.Status||'').toLowerCase()!=='disabled')}
function renderStats(q){const a=activeUsers();$('userCount').textContent=a.length;$('parentCount').textContent=a.filter(u=>validEmail(u.ParentEmail)).length;$('youthCount').textContent=a.filter(u=>validEmail(u.Email)).length;$('quota').textContent=q??'—'}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim())}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._-]+/g,' ').trim()}
function matches(u,q){if(!q)return true;const n=norm(q);return [u.Name,u.Username,u.PIN,u.ParticipantID,u.ParentName,u.ParentEmail,u.Email,u.AgeGroup,u.AgeYear,u.YouthSection].some(v=>norm(v).includes(n))}
function optionHTML(u,i){return `<div class="option" data-i="${i}"><b>${esc(u.Name||'(no name)')}</b><span>${esc(u.YouthSection||u.AgeYear||'section not set')} · parent ${esc(u.ParentEmail||'none')} · youth ${esc(u.Email||'none')}</span></div>`}
function esc(v){const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML}
function renderPeople(){const q=$('personSearch').value;const chosen=new Set(selected.map(x=>String(x.ParticipantID)));const list=activeUsers().filter(u=>!chosen.has(String(u.ParticipantID))&&matches(u,q)).sort((a,b)=>String(a.Name).localeCompare(String(b.Name))).slice(0,100);const box=$('personOptions');box.innerHTML=list.map((u,i)=>optionHTML(u,i)).join('')||'<div class="option"><span>No matching active users</span></div>';box._matches=list;box.style.display='block'}
function renderChips(){const html=selected.map(u=>`<span class="chip">${esc(u.Name||u.PIN)} <button data-remove="${esc(u.ParticipantID)}">×</button></span>`).join('');$('chips').innerHTML=html;$('allChips').innerHTML=html}
function renderGroups(){const box=$('sectionOptions');box.innerHTML=sections.map((x,i)=>`<div class="option" data-i="${i}"><b>${esc(x.label||x.value)}</b><span>${x.count} active user(s)</span></div>`).join('');box._matches=sections;$('sectionCards').innerHTML=sections.map(x=>`<button class="group-button" data-section="${esc(x.value)}"><b>${esc(x.label)}</b><span>${x.count} active users</span></button>`).join('')}
function renderSavedGroups(){const box=$('groupOptions');box.innerHTML=groups.length?groups.map((x,i)=>`<div class="option" data-i="${i}"><b>${esc(x.GroupName||x.GroupKey)}</b><span>${x.ParticipantIDs.length} participant(s)</span></div>`).join(''):'<div class="option"><span>No saved groups. Add rows to EmailGroups in the spreadsheet.</span></div>';box._matches=groups}
function renderCategories(){const box=$('activityOptions');box.innerHTML=categories.map((x,i)=>`<div class="option" data-i="${i}"><b>${esc(x.Title||x.CategoryKey)}</b><span>${esc(x.CategoryKey||'')}</span></div>`).join('');box._matches=categories;$('categoryCards').innerHTML=categories.map(x=>`<button class="group-button" data-category="${esc(x.CategoryKey)}"><b>${esc(x.Title||x.CategoryKey)}</b><span>${esc(x.CategoryKey)}</span></button>`).join('')}
function targetType(){return document.querySelector('input[name=targetType]:checked').value}
function scope(){return document.querySelector('input[name=scope]:checked').value}
function recipientEmails(u){const t=targetType(),a=[];if((t==='parent'||t==='both')&&validEmail(u.ParentEmail))a.push(u.ParentEmail);if((t==='youth'||t==='both')&&validEmail(u.Email))a.push(u.Email);return [...new Set(a.map(x=>String(x).toLowerCase()))]}
function scopedUsers(){const s=scope();if(s==='selected')return selected;if(s==='all')return selected.length?selected:activeUsers();if(s==='section'){const v=$('sectionSearch').dataset.value;return activeUsers().filter(u=>(u.YouthSection||u.AgeYear)===v)}if(s==='activity'){const k=($('activitySearch').dataset.value||'').toLowerCase();const all=categories.map(x=>String(x.CategoryKey||'').toLowerCase());return activeUsers().filter(u=>{const raw=String(u.AllowedCategories||'').trim();if(!raw||raw==='*')return all.includes(k);return raw.split(',').map(x=>x.trim().toLowerCase()).includes(k)})}if(s==='group'){const key=($('groupSearch').dataset.value||'').toLowerCase();const g=groups.find(x=>String(x.GroupKey||'').toLowerCase()===key);const ids=g?g.ParticipantIDs.map(String):[];return activeUsers().filter(u=>ids.includes(String(u.ParticipantID)))}return []}
function refreshPreview(){const us=scopedUsers();const n=us.reduce((t,u)=>t+recipientEmails(u).length,0);const missing=us.filter(u=>!recipientEmails(u).length).length;$('preview').textContent=us.length?`Selected: ${us.length} user(s) · ${n} individual email(s) · ${missing} missing email(s)`:'Choose recipients to see the live recipient count.'}
function setScopeUI(){const s=scope();[['selected','select...'],['section','select...'],['activity','select...'],['group','select...'],['all','select...']].forEach(()=>{});['selectedBox','sectionBox','activityBox','groupBox','allBox'].forEach(id=>$(id).classList.add('hidden'));const map={selected:'selectedBox',section:'sectionBox',activity:'activityBox',group:'groupBox',all:'allBox'};$(map[s]).classList.remove('hidden');refreshPreview()}
function choosePerson(i){const u=$('personOptions')._matches?.[i];if(!u)return;if(!selected.some(x=>String(x.ParticipantID)===String(u.ParticipantID)))selected.push(u);$('personSearch').value='';$('personOptions').style.display='none';renderChips();refreshPreview()}
function chooseSection(i){const x=$('sectionOptions')._matches?.[i];if(!x)return;$('sectionSearch').value=x.label||x.value;$('sectionSearch').dataset.value=x.value;$('sectionOptions').style.display='none';refreshPreview()}
function chooseCategory(i){const x=$('activityOptions')._matches?.[i];if(!x)return;$('activitySearch').value=x.Title||x.CategoryKey;$('activitySearch').dataset.value=x.CategoryKey;$('activityOptions').style.display='none';refreshPreview()}
function payload(){const subject=$('subject').value.trim(),body=$('body').value.trim(),s=scope(),t=targetType();if(!subject)throw Error('Enter a subject.');if(!body)throw Error('Write an HTML message.');if(subject.length>180)throw Error('Subject is too long.');if(body.length>60000)throw Error('Keep the HTML message under 60,000 characters.');const us=scopedUsers();if(!us.length)throw Error('No active users are selected.');const p={subject,htmlBody:body,scope:s,targetType:t};if(s==='selected'||s==='all')p.participantIds=us.map(u=>u.ParticipantID);if(s==='section'){if(!$('sectionSearch').dataset.value)throw Error('Choose a youth section.');p.ageGroup=$('sectionSearch').dataset.value}if(s==='activity'){if(!$('activitySearch').dataset.value)throw Error('Choose an activity category.');p.categoryKey=$('activitySearch').dataset.value}if(s==='group'){if(!$('groupSearch').dataset.value)throw Error('Choose a saved group.');p.groupKey=$('groupSearch').dataset.value}const drive=$('driveAttachment').value.trim();if(drive)p.attachments=[{driveUrl:drive}];p.certificate={placement:$('certificatePlacement').value||'none',title:$('certificateTitle').value.trim(),subtitle:$('certificateSubtitle').value.trim(),message:$('certificateMessage').value.trim(),footer:$('certificateFooter').value.trim()};return p}
async function preview(){try{const p=payload();showMsg('emailMsg','Checking the live Users sheet…',true);const r=await call('openAdminPreview',{payload:b64url(p)});$('preview').textContent=`Ready: ${r.totalRecipients} individual email(s) · ${r.matchedUsers} matched user(s) · ${r.missingEmails} missing email(s)${r.warnings?.length?'\n'+r.warnings.join('\n'):''}`;showMsg('emailMsg','No email has been sent.',true)}catch(e){showMsg('emailMsg',e.message,false)}}
async function send(){try{const p=payload();if(!confirm('Send this email now to the live recipient list?'))return;showMsg('emailMsg','Sending… please wait. Do not press Send again.',true);const r=await call('openAdminSend',{payload:b64url(p)});let text=`Sent ${r.sent} of ${r.total} email(s).\nMatched users: ${r.matchedUsers}.`;if(r.missingEmails)text+=`\nMissing emails: ${r.missingEmails}.`;if(r.failed?.length)text+='\nFailures:\n'+r.failed.join('\n');showMsg('emailMsg',text,r.failed?.length===0);await loadAll()}catch(e){showMsg('emailMsg',e.message,false)}}
function clearComposer(){['subject','body','driveAttachment'].forEach(id=>$(id).value='');$('certificatePlacement').value='none';$('certificateTitle').value='CERTIFICATE OF COMPLETION';$('certificateSubtitle').value='JOTA-JOTI 2026';$('certificateMessage').value='This certifies that {{childFullName}} has successfully taken part in JOTA-JOTI 2026 with Boulder Scout Group.';$('certificateFooter').value='Issued by Boulder Scout Group';selected=[];allSelected=[];$('personSearch').value='';$('sectionSearch').value='';$('activitySearch').value='';$('groupSearch').value='';delete $('sectionSearch').dataset.value;delete $('activitySearch').dataset.value;delete $('groupSearch').dataset.value;document.querySelector('input[name=scope][value=selected]').checked=true;setScopeUI();renderChips();$('emailMsg').className='message';refreshPreview()}
function insertTag(tag){const el=focusEl||$('body'),a=el.selectionStart||el.value.length,b=el.selectionEnd||el.value.length;el.value=el.value.slice(0,a)+tag+el.value.slice(b);el.focus();el.selectionStart=el.selectionEnd=a+tag.length}
async function findScout(q){const n=norm(q);const list=activeUsers().filter(u=>matches(u,n)).slice(0,8);const box=$('findOptions');box.innerHTML=list.map((u,i)=>optionHTML(u,i)).join('')||'<div class="option"><span>No matching active users</span></div>';box._matches=list;box.style.display='block'}
function showScout(u){$('findResult').classList.remove('hidden');$('findResult').innerHTML=`<b>${esc(u.Name||'Scout')}</b><br>PIN: ${esc(u.PIN||'—')}<br>Username: ${esc(u.Username||'—')}<br>Section: ${esc(u.YouthSection||u.AgeYear||'—')}<br>Youth email: ${esc(u.Email||'—')}<br>Parent: ${esc(u.ParentName||'—')} · ${esc(u.ParentEmail||'—')}<br><br><button class="ghost" id="useScout">Use this scout for email</button>`;$('useScout').onclick=()=>{selected=[u];document.querySelector('input[name=scope][value=selected]').checked=true;setScopeUI();renderChips();refreshPreview()}}
function setupEvents(){
 $('refreshBtn').onclick=async()=>{try{await loadAll();showMsg('emailMsg','Live Users data refreshed.',true)}catch(e){showMsg('emailMsg',e.message,false)}};$('previewBtn').onclick=preview;$('sendBtn').onclick=send;$('clearBtn').onclick=clearComposer;
 document.querySelectorAll('input[name=scope]').forEach(e=>e.onchange=setScopeUI);document.querySelectorAll('input[name=targetType]').forEach(e=>e.onchange=refreshPreview);
 $('personSearch').onfocus=renderPeople;$('personSearch').oninput=renderPeople;$('personOptions').onmousedown=e=>{const x=e.target.closest('.option');if(x&&$('personOptions')._matches[x.dataset.i])choosePerson(Number(x.dataset.i))};$('chips').onclick=e=>{const id=e.target.dataset.remove;if(id){selected=selected.filter(u=>String(u.ParticipantID)!==String(id));renderChips();refreshPreview()}};
 $('sectionSearch').onfocus=()=>{$('sectionOptions').style.display='block'};$('sectionSearch').oninput=()=>{delete $('sectionSearch').dataset.value;const q=norm($('sectionSearch').value);const m=sections.filter(x=>norm(x.label||x.value).includes(q));$('sectionOptions').innerHTML=m.map((x,i)=>`<div class="option" data-i="${i}"><b>${esc(x.label||x.value)}</b><span>${x.count} active user(s)</span></div>`).join('');$('sectionOptions')._matches=m};$('sectionOptions').onmousedown=e=>{const x=e.target.closest('.option');if(x)chooseSection(Number(x.dataset.i))};
 $('groupSearch').onfocus=()=>{$('groupOptions').style.display='block'};$('groupSearch').oninput=()=>{delete $('groupSearch').dataset.value;const q=norm($('groupSearch').value);const m=groups.filter(x=>norm(x.GroupName||x.GroupKey).includes(q));$('groupOptions').innerHTML=m.map((x,i)=>`<div class="option" data-i="${i}"><b>${esc(x.GroupName||x.GroupKey)}</b><span>${x.ParticipantIDs.length} participant(s)</span></div>`).join('')||'<div class="option"><span>No saved groups</span></div>';$('groupOptions')._matches=m};$('groupOptions').onmousedown=e=>{const x=e.target.closest('.option');if(x&&$('groupOptions')._matches[x.dataset.i]){const g=$('groupOptions')._matches[x.dataset.i];$('groupSearch').value=g.GroupName||g.GroupKey;$('groupSearch').dataset.value=g.GroupKey;$('groupOptions').style.display='none';refreshPreview()}};
 $('activitySearch').onfocus=()=>{$('activityOptions').style.display='block'};$('activitySearch').oninput=()=>{delete $('activitySearch').dataset.value;const q=norm($('activitySearch').value);const m=categories.filter(x=>norm(x.Title||x.CategoryKey).includes(q)||norm(x.CategoryKey).includes(q));$('activityOptions').innerHTML=m.map((x,i)=>`<div class="option" data-i="${i}"><b>${esc(x.Title||x.CategoryKey)}</b><span>${esc(x.CategoryKey)}</span></div>`).join('');$('activityOptions')._matches=m};$('activityOptions').onmousedown=e=>{const x=e.target.closest('.option');if(x)chooseCategory(Number(x.dataset.i))};
 $('allSearch').onclick=()=>{$('allOptions').innerHTML='<div class="option"><b>All active users</b><span>Every active row in Users</span></div>';$('allOptions').style.display='block'};$('allOptions').onmousedown=()=>{allSelected=activeUsers().slice();selected=allSelected.slice();$('allOptions').style.display='none';renderChips();refreshPreview()};
 $('findSearch').onfocus=()=>findScout($('findSearch').value);$('findSearch').oninput=()=>findScout($('findSearch').value);$('findOptions').onmousedown=e=>{const x=e.target.closest('.option');if(x&&$('findOptions')._matches[x.dataset.i]){$('findOptions').style.display='none';showScout($('findOptions')._matches[x.dataset.i])}};
 document.addEventListener('click',e=>{['personOptions','sectionOptions','activityOptions','allOptions','findOptions','groupOptions'].forEach(id=>{if(!$(id).contains(e.target)&&!$(id).previousElementSibling?.contains(e.target))$(id).style.display='none'})});
 TAGS.forEach(tag=>{const b=document.createElement('button');b.className='tag';b.type='button';b.textContent=tag;b.onclick=()=>insertTag(tag);$('tags').appendChild(b)});$('subject').onfocus=()=>focusEl=$('subject');$('body').onfocus=()=>focusEl=$('body');
 $('sectionCards').onclick=e=>{const b=e.target.closest('[data-section]');if(b){document.querySelector('input[name=scope][value=section]').checked=true;setScopeUI();$('sectionSearch').value=b.dataset.section;$('sectionSearch').dataset.value=b.dataset.section;refreshPreview()}};$('categoryCards').onclick=e=>{const b=e.target.closest('[data-category]');if(b){document.querySelector('input[name=scope][value=activity]').checked=true;setScopeUI();$('activitySearch').value=b.dataset.category;$('activitySearch').dataset.value=b.dataset.category;refreshPreview()}};
}
function setupPreviewLink(){
  const link=SKIP_PAGE_URL;
  const input=$('previewLink');
  if(!input)return;
  input.value=link;
  $('openPreviewLink').href=link;
  $('copyPreviewLink').onclick=async()=>{
    try{await navigator.clipboard.writeText(link);showMsg('previewMsg','Link copied.',true)}
    catch(e){input.select();showMsg('previewMsg','Could not auto-copy — the link is selected, press Ctrl/Cmd+C.',false)}
  };
}
async function boot(){setupEvents();setupPreviewLink();try{await loadAll();showMsg('emailMsg','Standalone admin loaded. Connected to Apps Script with normal fetch().',true)}catch(e){showMsg('emailMsg',e.message,false)}}
boot();
