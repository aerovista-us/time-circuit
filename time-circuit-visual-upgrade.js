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
  const viz = document.getElementById('viz');

  // The hero cover is a permanent Time Circuit identity element.
  // Track-specific artwork belongs only inside the visualizer.
  if(cover){
    cover.src = './kids.will.love.it.png';
    cover.alt = 'Kids Will Love It artwork';
  }

  function syncVisualizerArtwork(){
    const key = lane?.textContent?.trim();
    const src = artBySignal[key];
    if(src && visualizerArt){
      visualizerArt.src = src;
      visualizerArt.alt = '';
    }
    const code = document.getElementById('vizTrackCode');
    const name = document.getElementById('vizTrackName');
    if(code) code.textContent = key || 'TC-00';
    if(name) name.textContent = title?.textContent?.trim() || 'RETROFLUX';
  }

  if(lane){
    new MutationObserver(syncVisualizerArtwork).observe(lane,{childList:true,subtree:true,characterData:true});
  }
  if(title){
    new MutationObserver(syncVisualizerArtwork).observe(title,{childList:true,subtree:true,characterData:true});
  }

  audio?.addEventListener('play',()=>{
    visualizerArt?.classList.add('playing');
    viz?.classList.add('is-playing');
  });
  audio?.addEventListener('pause',()=>{
    visualizerArt?.classList.remove('playing');
    viz?.classList.remove('is-playing');
  });
  audio?.addEventListener('ended',()=>{
    visualizerArt?.classList.remove('playing');
    viz?.classList.remove('is-playing');
  });

  // ------------------------------------------------------------------------
  // Time Signal Visualizer v2
  // ------------------------------------------------------------------------
  if(viz && !document.getElementById('tcSpectrumPath')){
    viz.insertAdjacentHTML('beforeend',`
      <div class="viz-perspective-grid" aria-hidden="true"></div>
      <div class="viz-lens-flare" aria-hidden="true"></div>
      <svg class="viz-aux" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="tcSpectrumGradient" x1="0" x2="1">
            <stop offset="0" stop-color="#52ecff"></stop>
            <stop offset=".50" stop-color="#ff44d6"></stop>
            <stop offset="1" stop-color="#ff9a4d"></stop>
          </linearGradient>
          <filter id="tcDeepGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="g"></feGaussianBlur>
            <feMerge><feMergeNode in="g"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
          </filter>
        </defs>
        <circle id="tcPulseOuter" cx="500" cy="180" r="82" fill="none" stroke="rgba(82,236,255,.46)" stroke-width="2" filter="url(#tcDeepGlow)"></circle>
        <circle id="tcPulseInner" cx="500" cy="180" r="48" fill="none" stroke="rgba(255,68,214,.60)" stroke-width="2"></circle>
        <circle id="tcOrbitA" cx="500" cy="180" r="118" fill="none" stroke="rgba(82,236,255,.26)" stroke-width="1.5" stroke-dasharray="16 9 3 11"></circle>
        <circle id="tcOrbitB" cx="500" cy="180" r="145" fill="none" stroke="rgba(255,154,77,.22)" stroke-width="1" stroke-dasharray="3 14 23 10"></circle>
        <path id="tcWaveGhostA" fill="none" stroke="rgba(255,68,214,.34)" stroke-width="6" opacity=".4" filter="url(#tcDeepGlow)"></path>
        <path id="tcWaveGhostB" fill="none" stroke="rgba(82,236,255,.28)" stroke-width="10" opacity=".24" filter="url(#tcDeepGlow)"></path>
        <path id="tcSpectrumPath" fill="none" stroke="url(#tcSpectrumGradient)" stroke-width="2.5" opacity=".9" filter="url(#tcDeepGlow)"></path>
      </svg>
      <div class="viz-track-readout" aria-hidden="true">
        <span id="vizTrackCode">TC-00</span>
        <strong id="vizTrackName">RETROFLUX</strong>
        <small>LIVE AUDIO MATRIX / 1985 → 3026</small>
      </div>
      <div class="viz-band-panel" aria-hidden="true">
        <div class="viz-band-row"><span>BASS</span><i><b id="vizBassMeter"></b></i><em id="vizBassValue">00</em></div>
        <div class="viz-band-row"><span>MID</span><i><b id="vizMidMeter"></b></i><em id="vizMidValue">00</em></div>
        <div class="viz-band-row"><span>AIR</span><i><b id="vizAirMeter"></b></i><em id="vizAirValue">00</em></div>
      </div>
      <div class="viz-energy-panel" aria-hidden="true">
        <span>SIGNAL ENERGY</span>
        <strong id="vizEnergyValue">00</strong>
        <small id="vizSignalState">STANDBY</small>
      </div>
      <div class="viz-beat-lamp" id="vizBeatLamp" aria-hidden="true"><span>TRANSIENT</span></div>
    `);
  }

  const feed = window.TimeCircuitFeed;
  const spectrumPath = document.getElementById('tcSpectrumPath');
  const ghostA = document.getElementById('tcWaveGhostA');
  const ghostB = document.getElementById('tcWaveGhostB');
  const pulseOuter = document.getElementById('tcPulseOuter');
  const pulseInner = document.getElementById('tcPulseInner');
  const orbitA = document.getElementById('tcOrbitA');
  const orbitB = document.getElementById('tcOrbitB');
  const bassMeter = document.getElementById('vizBassMeter');
  const midMeter = document.getElementById('vizMidMeter');
  const airMeter = document.getElementById('vizAirMeter');
  const bassValue = document.getElementById('vizBassValue');
  const midValue = document.getElementById('vizMidValue');
  const airValue = document.getElementById('vizAirValue');
  const energyValue = document.getElementById('vizEnergyValue');
  const signalState = document.getElementById('vizSignalState');
  const beatLamp = document.getElementById('vizBeatLamp');

  let localFreq = null;
  let localTime = null;
  let boundAnalyser = null;
  let lowSmooth = 0;
  let midSmooth = 0;
  let highSmooth = 0;
  let energySmooth = 0;
  let bassFloor = .06;
  let beatPulse = 0;
  let lastBeatAt = 0;

  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const smooth=(current,target,attack=.28,release=.075)=>current+(target-current)*(target>current?attack:release);

  function bindAnalyzer(){
    const analyser = feed?.analyser;
    if(!analyser || analyser===boundAnalyser) return analyser;
    boundAnalyser = analyser;
    localFreq = new Uint8Array(analyser.frequencyBinCount);
    localTime = new Uint8Array(analyser.fftSize);
    return analyser;
  }

  function binForHz(hz,analyser){
    const sampleRate = feed?.sampleRate || 48000;
    const binHz = sampleRate / analyser.fftSize;
    return clamp(Math.round(hz/binHz),0,analyser.frequencyBinCount-1);
  }

  function frequencyBand(minHz,maxHz,analyser){
    const start=binForHz(minHz,analyser),end=Math.max(start+1,binForHz(maxHz,analyser));
    let total=0,count=0;
    for(let i=start;i<=end && i<localFreq.length;i++){total+=localFreq[i]/255;count++;}
    return count?total/count:0;
  }

  function logSpectrumValue(t,analyser){
    const minHz=35,maxHz=15500;
    const hz=minHz*Math.pow(maxHz/minHz,t);
    const i=binForHz(hz,analyser);
    const a=localFreq[Math.max(0,i-1)]||0,b=localFreq[i]||0,c=localFreq[Math.min(localFreq.length-1,i+1)]||0;
    return (a+b*2+c)/(4*255);
  }

  function waveformPath(center,amplitude,phaseOffset=0){
    if(!localTime) return '';
    const points=92;
    let d='';
    for(let i=0;i<points;i++){
      const t=i/(points-1);
      const sourceIndex=Math.min(localTime.length-1,Math.floor(t*(localTime.length-1)));
      const sample=(localTime[sourceIndex]-128)/128;
      const x=t*1000;
      const phase=Math.sin(t*Math.PI*4+phaseOffset)*2.2;
      const y=center+sample*amplitude+phase;
      d+=(i?' L ':'M ')+x.toFixed(1)+' '+y.toFixed(1);
    }
    return d;
  }

  function spectrumLine(analyser){
    const points=104;
    let d='';
    for(let i=0;i<points;i++){
      const t=i/(points-1);
      const value=Math.pow(logSpectrumValue(t,analyser),.74);
      const x=35+t*930;
      const y=382-value*(92+energySmooth*34);
      d+=(i?' L ':'M ')+x.toFixed(1)+' '+y.toFixed(1);
    }
    return d;
  }

  function renderSignalFrame(now){
    requestAnimationFrame(renderSignalFrame);
    if(!viz) return;

    const analyser=bindAnalyzer();
    const playing=!!audio && !audio.paused && !audio.ended;

    let lowTarget=.035,midTarget=.025,highTarget=.018;
    if(analyser && localFreq && localTime){
      analyser.getByteFrequencyData(localFreq);
      analyser.getByteTimeDomainData(localTime);
      lowTarget=frequencyBand(28,180,analyser);
      midTarget=frequencyBand(180,2600,analyser);
      highTarget=frequencyBand(2600,14500,analyser);
      if(!playing){lowTarget*=.20;midTarget*=.18;highTarget*=.14;}
    }

    lowSmooth=smooth(lowSmooth,lowTarget,.34,.075);
    midSmooth=smooth(midSmooth,midTarget,.30,.07);
    highSmooth=smooth(highSmooth,highTarget,.26,.065);
    const energyTarget=clamp(lowSmooth*1.18+midSmooth*.82+highSmooth*.48);
    energySmooth=smooth(energySmooth,energyTarget,.30,.06);

    bassFloor=bassFloor*.968+lowSmooth*.032;
    const beatThreshold=Math.max(.145,bassFloor*1.36);
    if(playing && lowSmooth>beatThreshold && now-lastBeatAt>185){
      beatPulse=1;
      lastBeatAt=now;
    }else{
      beatPulse*=.86;
      if(beatPulse<.01)beatPulse=0;
    }

    const idleBreath=playing?0:(Math.sin(now/850)+1)*.012;
    const visualEnergy=clamp(energySmooth+idleBreath);
    viz.style.setProperty('--tc-low',lowSmooth.toFixed(3));
    viz.style.setProperty('--tc-mid',midSmooth.toFixed(3));
    viz.style.setProperty('--tc-high',highSmooth.toFixed(3));
    viz.style.setProperty('--tc-energy',visualEnergy.toFixed(3));
    viz.style.setProperty('--tc-beat',beatPulse.toFixed(3));

    if(spectrumPath && analyser) spectrumPath.setAttribute('d',spectrumLine(analyser));
    if(ghostA && localTime) ghostA.setAttribute('d',waveformPath(292,38+visualEnergy*56,.5));
    if(ghostB && localTime) ghostB.setAttribute('d',waveformPath(292,26+visualEnergy*40,2.1));

    const outerR=82+visualEnergy*34+beatPulse*18;
    const innerR=48+midSmooth*24+beatPulse*9;
    if(pulseOuter){pulseOuter.setAttribute('r',outerR.toFixed(1));pulseOuter.setAttribute('opacity',(.25+visualEnergy*.58+beatPulse*.15).toFixed(2));}
    if(pulseInner){pulseInner.setAttribute('r',innerR.toFixed(1));pulseInner.setAttribute('opacity',(.30+midSmooth*.55).toFixed(2));}
    if(orbitA) orbitA.setAttribute('transform',`rotate(${(now*.012)%360} 500 180)`);
    if(orbitB) orbitB.setAttribute('transform',`rotate(${(-now*.007)%360} 500 180)`);

    const bassPct=Math.round(clamp(lowSmooth*1.55)*100);
    const midPct=Math.round(clamp(midSmooth*1.75)*100);
    const airPct=Math.round(clamp(highSmooth*2.25)*100);
    const energyPct=Math.round(clamp(visualEnergy*1.35)*100);
    if(bassMeter) bassMeter.style.transform=`scaleX(${bassPct/100})`;
    if(midMeter) midMeter.style.transform=`scaleX(${midPct/100})`;
    if(airMeter) airMeter.style.transform=`scaleX(${airPct/100})`;
    if(bassValue) bassValue.textContent=String(bassPct).padStart(2,'0');
    if(midValue) midValue.textContent=String(midPct).padStart(2,'0');
    if(airValue) airValue.textContent=String(airPct).padStart(2,'0');
    if(energyValue) energyValue.textContent=String(energyPct).padStart(2,'0');

    if(signalState){
      signalState.textContent=!playing?'STANDBY':beatPulse>.58?'TRANSIENT LOCK':energyPct>70?'OVERDRIVE':energyPct>38?'SIGNAL LOCKED':'CRUISING';
    }
    if(beatLamp) beatLamp.classList.toggle('hot',beatPulse>.46);
    viz.classList.toggle('viz-beat',beatPulse>.58);
  }

  syncVisualizerArtwork();
  requestAnimationFrame(renderSignalFrame);

  // ------------------------------------------------------------------------
  // Time-Circuit Umami analytics.
  // Each in-app surface becomes a hash route so Umami records Listen, Archive,
  // and Store as separate pages. Visible dwell time is emitted separately so
  // background-tab time does not inflate engagement.
  // ------------------------------------------------------------------------
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