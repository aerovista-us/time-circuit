(() => {
  'use strict';

  const artBySignal = {
    'TC-00':'./images/flux.png',
    'TC-01':'./images/marty.png',
    'TC-02':'./images/biff.png',
    'TC-03':'./images/flux.png',
    'TC-04':'./images/chick.png',
    'TC-05':'./kids.will.love.it.png',
    'TC-06':'./images/doc.png',
    'TC-07':'./images/www.png',
    'TC-08':'./images/marty.png',
    'TC-09':'./images/marty.png',
    'ARC-01':'./kids.will.love.it.png',
    'ARC-02':'./images/doc.png',
    'ARC-03':'./images/www.png',
    'ALT-01A':'./images/marty.png',
    'ALT-01B':'./images/marty.png'
  };

  const lane = document.getElementById('badgeLane');
  const title = document.getElementById('trackTitle');
  const cover = document.getElementById('coverImg');
  const visualizerArt = document.getElementById('visualizerArt');
  const audio = document.getElementById('audio');

  // The hero cover is a permanent Time Circuit identity element.
  // Track-specific artwork belongs only inside the visualizer.
  if(cover){
    cover.src = './kids.will.love.it.png';
    cover.alt = 'Kids Will Love It artwork';
  }

  function syncVisualizerArtwork(){
    const key = lane?.textContent?.trim();
    const src = artBySignal[key];
    if(!src || !visualizerArt) return;
    visualizerArt.src = src;
    visualizerArt.alt = '';
  }

  if(lane){
    new MutationObserver(syncVisualizerArtwork).observe(lane,{childList:true,subtree:true,characterData:true});
  }
  if(title){
    new MutationObserver(syncVisualizerArtwork).observe(title,{childList:true,subtree:true,characterData:true});
  }

  audio?.addEventListener('play',()=>visualizerArt?.classList.add('playing'));
  audio?.addEventListener('pause',()=>visualizerArt?.classList.remove('playing'));
  audio?.addEventListener('ended',()=>visualizerArt?.classList.remove('playing'));

  syncVisualizerArtwork();

  // Time-Circuit Umami analytics.
  // Each in-app surface becomes a hash route so Umami records Listen, Archive,
  // and Store as separate pages. Visible dwell time is emitted separately so
  // background-tab time does not inflate engagement.
  const UMAMI_SRC = 'https://stats.aerocoreos.com/script.js';
  const UMAMI_WEBSITE_ID = '504bd7ad-9e98-46b4-b84e-122fdba69bb0';
  const VIEW_NAMES = new Set(['listen','archive','store']);
  const eventQueue = [];
  let analyticsReady = false;
  let activeView = null;
  let visibleStartedAt = null;
  let visibleMs = 0;

  function currentView(){
    return document.querySelector('.view.active[data-view-panel]')?.dataset.viewPanel || 'listen';
  }

  function requestedView(){
    const value = location.hash.replace(/^#/,'').toLowerCase();
    return VIEW_NAMES.has(value) ? value : null;
  }

  function activateRequestedView(){
    const requested = requestedView();
    if(!requested || requested === currentView()) return;
    document.querySelector(`[data-view="${requested}"]`)?.click();
  }

  function routeFor(view){
    return `#${view}`;
  }

  function emit(name,data){
    if(analyticsReady && window.umami?.track){
      try{ window.umami.track(name,data); }catch{}
      return;
    }
    eventQueue.push([name,data]);
  }

  function flushQueue(){
    if(!window.umami?.track) return;
    analyticsReady = true;
    while(eventQueue.length){
      const [name,data] = eventQueue.shift();
      try{ window.umami.track(name,data); }catch{}
    }
  }

  function startVisibleClock(){
    if(document.visibilityState !== 'visible' || visibleStartedAt !== null) return;
    visibleStartedAt = performance.now();
  }

  function stopVisibleClock(){
    if(visibleStartedAt === null) return;
    visibleMs += performance.now() - visibleStartedAt;
    visibleStartedAt = null;
  }

  function flushDuration(reason){
    if(!activeView) return;
    stopVisibleClock();
    const duration = visibleMs;
    visibleMs = 0;
    if(duration >= 1000){
      emit('time-circuit-view-duration',{
        view: activeView,
        seconds: Math.round(duration / 100) / 10,
        reason
      });
    }
  }

  function beginView(view){
    activeView = view;
    visibleMs = 0;
    visibleStartedAt = null;
    startVisibleClock();
  }

  function syncViewRoute(){
    const nextView = currentView();
    if(nextView === activeView) return;

    if(activeView) flushDuration('view-change');

    if(location.hash !== routeFor(nextView)){
      history.pushState({timeCircuitView:nextView},'',routeFor(nextView));
    }
    beginView(nextView);
  }

  activateRequestedView();
  activeView = currentView();
  if(location.hash !== routeFor(activeView)){
    history.replaceState({timeCircuitView:activeView},'',routeFor(activeView));
  }
  beginView(activeView);

  // Load the dedicated Time-Circuit Umami property only after the canonical
  // hash route is established, preventing a stray root-page view on startup.
  const tracker = document.createElement('script');
  tracker.defer = true;
  tracker.src = UMAMI_SRC;
  tracker.setAttribute('data-website-id',UMAMI_WEBSITE_ID);
  tracker.addEventListener('load',flushQueue,{once:true});
  tracker.addEventListener('error',()=>{ analyticsReady = false; },{once:true});
  document.head.appendChild(tracker);

  document.querySelectorAll('.view[data-view-panel]').forEach(panel=>{
    new MutationObserver(syncViewRoute).observe(panel,{attributes:true,attributeFilter:['class']});
  });

  function applyHistoryView(){
    const requested = requestedView();
    if(!requested || requested === currentView()) return;
    document.querySelector(`[data-view="${requested}"]`)?.click();
  }

  window.addEventListener('popstate',applyHistoryView);
  window.addEventListener('hashchange',applyHistoryView);

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState === 'hidden') flushDuration('hidden');
    else startVisibleClock();
  });

  window.addEventListener('pagehide',()=>flushDuration('pagehide'));
})();
