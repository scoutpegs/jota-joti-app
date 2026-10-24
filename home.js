/* Lightweight local-first media for the Boulder Scouts homepage and section pages. */
(function(){
  const MAX_SLIDES=10;
  const ROTATE_MS=3000;
    const prefersReduced=()=>!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const activeTimers=new WeakMap();
  const remoteCache=new Map();
  const remoteRequests=new Map();
  // Remember missing media for this visit so absent local files aren't requested on every route or slide.
  const failedImageAssets=new Set();
  const failedVideoSources=new Set();
  const REMOTE_CACHE_TTL=5*60*1000;
  const VIDEO_EXT=/\.(?:mp4|webm|ogv|ogg|mov)(?:$|[?#])/i;
  function sectionLabel(k){return ({joeys:'Joey Scouts',cubs:'Cub Scouts',scouts:'Scouts',venturers:'Venturer Scouts'})[k]||'Boulder Scout Group'}
  function slotSet(cfg,section,kind){const p=cfg&&cfg.photoSlots||{};if(kind==='hero')return section==='all'?(p.homeHero||[]):((p.sectionHero&&p.sectionHero[section])||[]);return section==='all'?(p.homeAlbum||[]):((p.sectionAlbum&&p.sectionAlbum[section])||[])}
  function allowedAsset(value){const url=String(value||'').trim();return (/^(https:\/\/|\/|\.\/)/i.test(url)||/^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif|gif|svg|mp4|webm|ogv|ogg|mov)(?:[?#].*)?$/i.test(url))?url:''}
  function normalisePhotos(photos){
    const seen=new Set();
    return (Array.isArray(photos)?photos:[]).map(p=>({
      url:allowedAsset(p&&(p.url||p.file)),
      alt:String(p&&(p.alt||p.title)||'Boulder Scout Group activity'),
      title:String(p&&(p.title||p.caption)||''),
      caption:String(p&&(p.caption||p.title)||''),
      isSlot:!!(p&&p.isSlot),note:String(p&&p.note||''),sourceUrl:String(p&&p.sourceUrl||'')
    })).filter(p=>p.url&&!seen.has(p.url)&&seen.add(p.url)).slice(0,MAX_SLIDES);
  }
  function slotsAsSlides(slots){return (Array.isArray(slots)?slots:[]).filter(s=>s&&s.file).map(s=>({url:s.file,alt:s.alt||s.title||'Boulder Scout Group photo',title:s.title||'Photo to add',caption:s.title||'',isSlot:true,note:s.note||'Add an approved group photograph at this path.',sourceUrl:s.sourceUrl||''}))}
  function localPhotos(cfg,section){
    const list=Array.isArray(cfg.photos)?cfg.photos:[];
    return list.filter(p=>{if(!p||typeof p.url!=='string'||!p.url.trim())return false;const url=p.url.trim();if(!allowedAsset(url))return false;const tag=String(p.section||'all').toLowerCase();return section==='all'||tag==='all'||tag===section}).map(p=>({url:p.url.trim(),alt:String(p.alt||p.title||sectionLabel(section)+' activity'),title:String(p.title||p.caption||''),caption:String(p.caption||p.title||'')}));
  }
  function stopTimer(target){const timer=target&&activeTimers.get(target);if(timer)clearInterval(timer);if(target)activeTimers.delete(target)}
  function disposeCarousel(target){const shell=target&&target.querySelector('.live-photo-carousel');if(!shell)return;stopTimer(shell);if(shell._carouselObserver){shell._carouselObserver.disconnect();shell._carouselObserver=null}}
  function dropVideo(video){if(!video)return;if(video._coverObserver){video._coverObserver.disconnect();video._coverObserver=null}try{video.pause()}catch(_){}video.remove()}
  function setCoverImage(banner,url,source){
    if(!banner||!banner.isConnected||banner.dataset.coverPhotoSource==='api')return;
    banner.style.setProperty('--cover-image',`url(${JSON.stringify(url)})`);
    banner.dataset.localBannerPhoto='true';banner.dataset.coverPhotoSource=source||'local';
  }
  function loadImageCandidate(banner,url,source,onFail){
    if(failedImageAssets.has(url)){if(typeof onFail==='function')onFail();return}
    const image=new Image();let settled=false;let timer;
    const finish=(ok)=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;if(ok)setCoverImage(banner,url,source);else{failedImageAssets.add(url);if(typeof onFail==='function')onFail()}};
    image.decoding='async';image.onload=()=>finish(true);image.onerror=()=>finish(false);
    timer=setTimeout(()=>finish(false),4500);image.src=url;
    if(image.complete)finish(image.naturalWidth>0);
  }
  function mountHeroMedia(target,section,slots,cfg){
    if(!target)return;target.hidden=true;
    const banner=target.closest('[data-cover]');if(!banner||banner.dataset.coverPhotoSource==='api')return;
    const configured=allowedAsset(cfg.coverMedia&&cfg.coverMedia[section]);
    const legacy=allowedAsset(cfg.coverPhotos&&cfg.coverPhotos[section]);
    const poster=allowedAsset(cfg.coverPosters&&cfg.coverPosters[section]);
    const localSlots=(Array.isArray(slots)?slots:[]).filter(x=>x&&allowedAsset(x.file));
    const candidates=[];
    if(configured)candidates.push({url:configured,source:'configured'});
    if(legacy&&legacy!==configured)candidates.push({url:legacy,source:'legacy-config'});
    localSlots.forEach(s=>{if(!candidates.some(c=>c.url===s.file))candidates.push({url:s.file,source:'named-photo-slot'})});
    const oldVideo=banner.querySelector(':scope > .cover-media-video');if(oldVideo)dropVideo(oldVideo);
    banner.style.setProperty('--cover-image','none');delete banner.dataset.localBannerPhoto;delete banner.dataset.coverPhotoSource;
    let index=0,token=0;
    const next=()=>{
      if(!banner.isConnected||index>=candidates.length){banner.style.setProperty('--cover-image','none');return}
      const candidate=candidates[index++],url=candidate.url,myToken=++token;
      if(VIDEO_EXT.test(url)){
        if(failedVideoSources.has(url)){if(poster){loadImageCandidate(banner,poster,'poster',next)}else next();return}
        const saveData=!!(navigator.connection&&navigator.connection.saveData);
        if(prefersReduced()||saveData){if(poster){loadImageCandidate(banner,poster,'poster',next)}else next();return}
        const video=document.createElement('video');video.className='cover-media-video';video.muted=true;video.defaultMuted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.preload='metadata';video.tabIndex=-1;video.setAttribute('aria-hidden','true');video.setAttribute('disablepictureinpicture','');if(poster)video.poster=poster;
        let settled=false,videoTimer;
        const failed=()=>{if(settled)return;settled=true;clearTimeout(videoTimer);failedVideoSources.add(url);dropVideo(video);if(poster){loadImageCandidate(banner,poster,'poster',next)}else next()};
        const ready=()=>{if(settled||!banner.isConnected)return;settled=true;clearTimeout(videoTimer);banner.dataset.localBannerPhoto='true';banner.dataset.coverPhotoSource='local-video';video.play().catch(()=>{});};
        video.addEventListener('loadeddata',ready,{once:true});video.addEventListener('error',failed,{once:true});
        banner.insertBefore(video,banner.firstChild);video.src=url;videoTimer=setTimeout(failed,6000);video.load();
        if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{const entry=entries[0];if(!entry)return;if(entry.isIntersecting&&!document.hidden&&!prefersReduced()&&!(navigator.connection&&navigator.connection.saveData)){video.play().catch(()=>{})}else video.pause()},{rootMargin:'80px'});observer.observe(banner);video._coverObserver=observer;}
        return;
      }
      if(failedImageAssets.has(url)){next();return}
      loadImageCandidate(banner,url,candidate.source,()=>{if(myToken===token)next()});
    };
    next();
  }
  function addPlaceholderText(container,photo,section){
    container.replaceChildren();container.className='carousel-missing-slot';container.hidden=false;
    const title=document.createElement('strong');title.textContent='Photos coming soon';
    const note=document.createElement('p');note.textContent='Approved group photos will appear here once families have given permission.';
    container.append(title,note);
  }
  function renderAutoCarousel(target,section,slides){
    if(!target)return;disposeCarousel(target);
    let photos=normalisePhotos(slides);
    const shell=document.createElement('div');shell.className='album-shell live-photo-carousel';shell.setAttribute('role','region');shell.setAttribute('aria-label',sectionLabel(section)+' photo slideshow. Photos change automatically every three seconds.');shell.tabIndex=0;
    const stage=document.createElement('figure');stage.className='album-stage';
    const imgs=[0,1].map(()=>{const img=document.createElement('img');img.alt='';img.decoding='async';img.loading='lazy';img.fetchPriority='auto';img.style.opacity='0';img.hidden=true;return img});
    const caption=document.createElement('figcaption');caption.hidden=true;
    const placeholder=document.createElement('div');placeholder.className='carousel-missing-slot';placeholder.hidden=true;
    const empty=document.createElement('div');empty.className='auto-photo-empty';empty.hidden=true;empty.textContent='Approved group photos will appear here when added.';
    stage.append(...imgs,caption,placeholder,empty);shell.appendChild(stage);target.appendChild(shell);
    if(!photos.length){imgs.forEach(img=>img.hidden=true);empty.hidden=false;return}
    let index=-1,front=-1,paint=0,plannedIndex=0;
    const closeToViewport=()=>{const rect=shell.getBoundingClientRect();return rect.top<window.innerHeight*1.45&&rect.bottom>-window.innerHeight*.35};
    let nearView=closeToViewport();
    const chooseDifferent=(except)=>{if(photos.length<2)return Math.max(0,except);let n=Math.floor(Math.random()*(photos.length-1));if(n>=except)n++;return n};
    const warmNext=()=>{if(photos.length<2)return;plannedIndex=chooseDifferent(index);if(!nearView||document.hidden)return;const item=photos[plannedIndex];if(item&&!(item.isSlot&&failedImageAssets.has(item.url))){const warm=new Image();warm.decoding='async';if(item.isSlot)warm.onerror=()=>failedImageAssets.add(item.url);warm.src=item.url}};
    const showPlaceholder=(photo)=>{stage.classList.add('is-missing-slot');imgs.forEach(img=>{img.hidden=true;img.style.opacity='0';img.onload=null;img.onerror=null});front=-1;caption.hidden=true;empty.hidden=true;addPlaceholderText(placeholder,photo,section)};
    const showEmpty=(message)=>{stage.classList.add('is-missing-slot');imgs.forEach(img=>{img.hidden=true;img.onload=null;img.onerror=null});front=-1;caption.hidden=true;placeholder.hidden=true;empty.hidden=false;empty.textContent=message};
    const show=(nextIndex,failed=0)=>{
      if(!photos.length)return;
      index=((nextIndex%photos.length)+photos.length)%photos.length;const photo=photos[index];
      if(photo.isSlot&&failedImageAssets.has(photo.url)){++paint;showPlaceholder(photo);warmNext();return}
      const myPaint=++paint,back=front===0?1:0,candidate=imgs[back];
      warmNext();let settled=false;candidate.onload=null;candidate.onerror=null;candidate.alt=photo.alt||sectionLabel(section)+' activity';candidate.decoding='async';candidate.hidden=false;candidate.style.opacity='0';
      placeholder.hidden=true;empty.hidden=true;
      candidate.onload=()=>{
        if(settled||myPaint!==paint)return;settled=true;
        const previous=front;candidate.hidden=false;candidate.style.opacity='1';front=back;stage.classList.remove('is-missing-slot');caption.textContent=photo.caption||'';caption.hidden=!photo.caption;
        if(previous>=0&&previous!==back){const old=imgs[previous];old.style.opacity='0';setTimeout(()=>{if(front!==previous){old.hidden=true}},260)}
        placeholder.hidden=true;empty.hidden=true;
      };
      candidate.onerror=()=>{
        if(settled||myPaint!==paint)return;settled=true;
        if(photo.isSlot){failedImageAssets.add(photo.url);showPlaceholder(photo);return}
        if(failed+1<photos.length){show((index+1)%photos.length,failed+1);return}
        showEmpty('Photos could not be loaded. Check the file paths or reconnect the optional photo service.');
      };
      candidate.src=photo.url;
      if(candidate.complete&&candidate.naturalWidth>0)candidate.onload();
    };
    const start=()=>{stopTimer(shell);if(photos.length>1&&nearView&&!prefersReduced()&&!document.hidden&&!shell.matches(':hover')&&!shell.matches(':focus-within')){const timer=setInterval(()=>{if(!shell.isConnected){stopTimer(shell);return}if(document.hidden||!nearView||shell.matches(':hover')||shell.matches(':focus-within'))return;show(plannedIndex)},ROTATE_MS);activeTimers.set(shell,timer)}};
    shell.addEventListener('mouseenter',()=>stopTimer(shell));shell.addEventListener('mouseleave',start);shell.addEventListener('focusin',()=>stopTimer(shell));shell.addEventListener('focusout',()=>{if(!shell.matches(':focus-within'))start()});shell.addEventListener('boulder-start-carousel',start);
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{const entry=entries[0];if(!entry||!shell.isConnected){observer.disconnect();return}nearView=entry.isIntersecting;if(nearView){if(index>=0)warmNext();start()}else stopTimer(shell)},{rootMargin:'260px 0px'});observer.observe(shell);shell._carouselObserver=observer}
    
    shell.addPhotos=additions=>{const hadReal=photos.some(p=>!p.isSlot);const existingReal=photos.filter(p=>!p.isSlot),existingSlots=photos.filter(p=>p.isSlot);photos=normalisePhotos([...existingReal,...(Array.isArray(additions)?additions:[]),...existingSlots]);if(photos.length&&(!hadReal&&photos.some(p=>!p.isSlot))){show(photos.findIndex(p=>!p.isSlot));start()}else warmNext()};
    const configuredPhotoIndex=photos.findIndex(p=>!p.isSlot);
    const hallSlotIndex=section==='all'?photos.findIndex(p=>p.isSlot&&p.url==='home-gallery-hall.jpg'&&p.title==='Around the hall'):-1;
    const initialIndex=configuredPhotoIndex>=0?configuredPhotoIndex:(hallSlotIndex>=0?hallSlotIndex:Math.floor(Math.random()*photos.length));
    show(initialIndex);start();
  }
  function renderAlbum(target,section,photos,cfg,slots){
    if(!target)return;disposeCarousel(target);target.hidden=false;target.setAttribute('aria-busy','false');
    const title=section==='all'?'More from Boulder Scouts':sectionLabel(section)+' photo album';
    const intro=section==='all'?'A shuffle of up to ten group photos, changing every three seconds.':`A shuffle of up to ten ${sectionLabel(section)} photos, changing every three seconds.`;
    const wrapper=document.createElement('section');wrapper.className='photo-album';
    const heading=document.createElement('div');heading.className='photo-album-heading';const h2=document.createElement('h2');h2.textContent=title;const p=document.createElement('p');p.className='album-intro';p.textContent=intro;heading.append(h2,p);wrapper.appendChild(heading);target.replaceChildren(wrapper);
    renderAutoCarousel(wrapper,section,[...photos,...slotsAsSlides(slots)]);
    const api=String(cfg&&cfg.apiBase||'').replace(/\/$/,'');if(api){const row=document.createElement('p');row.className='photo-rss-row';const a=document.createElement('a');a.className='photo-rss-link';a.href=api+'/api/feed/photos/'+(section==='all'?'all':section)+'.xml';a.textContent='Subscribe to '+(section==='all'?'group':sectionLabel(section))+' photos RSS';row.appendChild(a);wrapper.appendChild(row)}
  }
  async function requestRemotePhotos(cfg,section){
    const base=String(cfg&&cfg.apiBase||'').trim().replace(/\/+$/,'');if(!/^https:\/\//i.test(base))return[];
    const cached=remoteCache.get(section);if(cached&&Date.now()-cached.savedAt<REMOTE_CACHE_TTL)return cached.photos;
    if(remoteRequests.has(section))return remoteRequests.get(section);
    const task=(async()=>{let timer;const controller=new AbortController();timer=setTimeout(()=>controller.abort(),4000);try{const response=await fetch(base+'/api/photos?section='+encodeURIComponent(section),{headers:{Accept:'application/json'},signal:controller.signal});if(!response.ok)throw new Error('Photo service returned '+response.status);const body=await response.json();const parsed=Array.isArray(body.photos)?body.photos.filter(p=>p&&typeof p.url==='string'&&allowedAsset(p.url.trim())).map(p=>({url:p.url.trim(),alt:String(p.alt||p.title||sectionLabel(section)+' activity'),title:String(p.title||p.caption||''),caption:String(p.caption||p.title||'')})):[];remoteCache.set(section,{savedAt:Date.now(),photos:parsed});return parsed}catch(error){return[]}finally{clearTimeout(timer)}})();
    // Optional Cloudflare media never blocks the first local slide.
    remoteRequests.set(section,task);return task.finally(()=>remoteRequests.delete(section));
  }
  async function loadGallery(){
    const cfg=window.BOULDER_CONFIG;if(!cfg)return;const app=document.getElementById('app');if(!app)return;
    const homeHero=app.querySelector('#live-home-hero-gallery'),home=app.querySelector('#live-home-gallery');
    const lower=app.querySelector('[id^="live-section-gallery-"]'),sectionHero=app.querySelector('[id^="live-section-hero-gallery-"]');
    if(!homeHero&&!home&&!lower&&!sectionHero)return;
    const isHome=!!(homeHero||home);
    const section=isHome?'all':((lower||sectionHero).id.match(/(?:live-section-gallery-|live-section-hero-gallery-)(joeys|cubs|scouts|venturers)$/)||[])[1]||(document.body.dataset.page||'joeys');
    const bannerKey=isHome?'home':section;
    const heroTarget=homeHero||sectionHero,albumTarget=home||lower,heroSlots=slotSet(cfg,section,'hero'),albumSlots=slotSet(cfg,section,'album');
    if(heroTarget)mountHeroMedia(heroTarget,bannerKey,heroSlots,cfg);
    const local=localPhotos(cfg,section);
    if(albumTarget)renderAlbum(albumTarget,section,local,cfg,albumSlots); // Local slides render immediately; remote photos are optional.
    if(albumTarget&&cfg.apiBase){
      void requestRemotePhotos(cfg,section).then(remote=>{
        if(!remote.length||!albumTarget.isConnected||!document.getElementById('app')?.contains(albumTarget))return;
        const carousel=albumTarget.querySelector('.live-photo-carousel');if(carousel&&typeof carousel.addPhotos==='function')carousel.addPhotos(remote);
      });
    }
  }
  function syncMediaState(){
    document.querySelectorAll('.live-photo-carousel').forEach(shell=>{if(document.hidden||prefersReduced()||shell.matches(':hover')||shell.matches(':focus-within'))stopTimer(shell);else if(!activeTimers.has(shell))shell.dispatchEvent(new Event('boulder-start-carousel'))});
    document.querySelectorAll('video.cover-media-video').forEach(video=>{const saveData=!!(navigator.connection&&navigator.connection.saveData);if(document.hidden||prefersReduced()||saveData)video.pause();else video.play().catch(()=>{})});
  }
  document.addEventListener('visibilitychange',syncMediaState);
  const motionPreference=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');if(motionPreference&&motionPreference.addEventListener)motionPreference.addEventListener('change',syncMediaState);
  function cleanupPageMedia(){
    document.querySelectorAll('.live-photo-carousel').forEach(shell=>{stopTimer(shell);if(shell._carouselObserver){shell._carouselObserver.disconnect();shell._carouselObserver=null}});
    document.querySelectorAll('video.cover-media-video').forEach(dropVideo);
  }
  window.BoulderSiteModules=window.BoulderSiteModules||{};window.BoulderSiteModules.routeHooks=window.BoulderSiteModules.routeHooks||[];window.BoulderSiteModules.routeHooks.push(loadGallery);window.BoulderSiteModules.onLeave=cleanupPageMedia;
  document.addEventListener('DOMContentLoaded',loadGallery);
})();
