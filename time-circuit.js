(() => {
  'use strict';

  const numberedTracks = [
    {number:'TC-00',displayLabel:'TC-00-RetroFlux',title:'RetroFlux',subtitle:"Future's Past // opening transmission",src:'./RetroFlux.mp3',art:'./images/flux.png',bpm:'88 BPM',lane:'TC-00',playable:true,description:'RetroFlux opens the Time Circuit: the TC-00 transmission that feeds directly into the numbered Future\'s Past archive.'},
    {number:'TC-01',title:'Eighty-Eight Rebel',subtitle:"Future's Past // numbered archive",src:'./01 — EIGHTY-EIGHT REBEL.mp3',art:'./images/marty.png',bpm:'88 BPM',lane:'TC-01',playable:true,description:'The first numbered Time Circuit transmission: 88 BPM with one foot in 1985 and the other somewhere past 3026.'},
    {number:'TC-02',title:'Full Cab Bruiser',subtitle:"Future's Past // numbered archive",src:'./02 — FULL CAB BRUISER.mp3',art:'./images/biff.png',bpm:'88 BPM',lane:'TC-02',playable:true,description:"The second Future's Past transmission: heavy-cabinet attitude, rewired through the Time Circuit at 88 BPM."},
    {number:'TC-03',title:'Flux Professor',subtitle:"Future's Past // numbered archive",src:'./03 — FLUX PROFESSOR.mp3',art:'./images/flux.png',bpm:'88 BPM',lane:'TC-03',playable:true,description:'The Professor takes control of the circuit: 88 BPM where 1985 artifacts collide with a 3026 signal path.'},
    {number:'TC-04',title:'Paradox Queen',subtitle:"Future's Past // numbered archive",src:'./04 — PARADOX QUEEN.mp3',art:'./images/chick.png',bpm:'88 BPM',lane:'TC-04',playable:true,description:"Same girl. Different timeline. The fourth numbered transmission closes the current Future's Past circuit at 88 BPM."}
  ];

  const archiveTracks = [
    {number:'ARC-01',title:'Kids Will Love It',subtitle:'Original Time-Circuit drop',src:'./kids-will-love-it.mp3',art:'./kids.will.love.it.png',bpm:'90.25 halftime',lane:'Archive',playable:true,description:'The original cinematic quote-slam and halftime SwampHop drop that opened the Time Circuit.'},
    {number:'ARC-02',title:'Flux Swamp (1955)',subtitle:'Analog swamp intro',src:'./FLUX_SWAMP_(1955).mp3',art:'./images/doc.png',bpm:'~90 groove',lane:'Archive',playable:true,description:'Tape hiss, swamp night, clean guitar, and the older time-travel experiment.'},
    {number:'ARC-03',title:'Momento × LowFreq × New Sound',subtitle:'SwampTime Flux mashup',src:'./momentoxLowFreqxNEW_SOUND.mp3',art:'./images/www.png',bpm:'variable',lane:'Archive',playable:true,description:'A multi-era mashup moving from nostalgia bounce through swamp-western fracture into the future.'},
    {number:'ALT-01A',title:'Eighty-Eight Rebel — Alt 1',subtitle:'TC-01 alternate render',src:'./01 — EIGHTY-EIGHT REBEL (1).mp3',art:'./images/marty.png',bpm:'88 BPM',lane:'Alternate',playable:true,description:'Alternate render of TC-01. Kept outside the numbered canon until deliberately promoted.'},
    {number:'ALT-01B',title:'Eighty-Eight Rebel — Alt 2',subtitle:'TC-01 alternate render',src:'./01 — EIGHTY-EIGHT REBEL (2).mp3',art:'./images/marty.png',bpm:'88 BPM',lane:'Alternate',playable:true,description:'Second alternate render of TC-01. Kept outside the numbered canon until deliberately promoted.'}
  ];

  const $ = id => document.getElementById(id);
  const audio=$('audio'),title=$('trackTitle'),description=$('trackDescription'),badgeBpm=$('badgeBpm'),badgeLane=$('badgeLane');
  const btnPrev=$('btnPrev'),btnPlay=$('btnPlay'),btnNext=$('btnNext'),btnRestart=$('btnRestart'),btnSample=$('btnSample'),seek=$('seek'),vol=$('vol'),tCur=$('tCur'),tDur=$('tDur');
  const mode=$('mode'),hook=$('hook'),dest=$('dest'),flux=$('flux'),playlistEl=$('playlist'),nowPlaying=$('nowPlayingLabel'),trackCount=$('trackCount'),archiveGrid=$('archiveGrid');
  const wave=$('wave'),tri=$('tri'),core=$('core'),bolt=$('bolt'),barsG=$('bars');
  const sampleAudio=new Audio('./kids.gonnaLoveit.mp3');sampleAudio.preload='metadata';
  const SAMPLE_GAIN=1.75*1.777142857;
  let current=numberedTracks[0],ctx,analyser,sourceNode,data,freq;
  let sampleCtx,sampleSource,sampleGain,sampleLimiter;
  const bars=[];const BAR_COUNT=48,W=920,H=120,gap=6,bw=(W-(BAR_COUNT-1)*gap)/BAR_COUNT;

  const fmt=s=>{if(!Number.isFinite(s))return'0:00';const sec=Math.max(0,Math.floor(s));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  for(let i=0;i<BAR_COUNT;i++){
    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',i*(bw+gap));rect.setAttribute('y','-2');rect.setAttribute('width',bw);rect.setAttribute('height','2');rect.setAttribute('rx','2');rect.setAttribute('fill','rgba(146,222,255,.68)');rect.setAttribute('opacity','.9');barsG.appendChild(rect);bars.push(rect);
  }

  function ensureAudio(){
    if(ctx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC){hook.textContent='Visualizer unavailable';return false;}
    try{ctx=new AC();analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.85;data=new Uint8Array(analyser.fftSize);freq=new Uint8Array(analyser.frequencyBinCount);sourceNode=ctx.createMediaElementSource(audio);sourceNode.connect(analyser);analyser.connect(ctx.destination);return true;}
    catch(err){console.warn('WebAudio analyzer disabled:',err);hook.textContent='Visualizer unavailable';return false;}
  }

  function ensureSampleAudio(){
    if(sampleCtx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    try{
      sampleCtx=new AC();sampleSource=sampleCtx.createMediaElementSource(sampleAudio);sampleGain=sampleCtx.createGain();sampleLimiter=sampleCtx.createDynamicsCompressor();
      sampleGain.gain.value=SAMPLE_GAIN;
      sampleLimiter.threshold.value=-4;sampleLimiter.knee.value=2;sampleLimiter.ratio.value=20;sampleLimiter.attack.value=.002;sampleLimiter.release.value=.2;
      sampleSource.connect(sampleGain);sampleGain.connect(sampleLimiter);sampleLimiter.connect(sampleCtx.destination);return true;
    }catch(err){console.warn('Sample gain stage unavailable:',err);sampleCtx=null;return false;}
  }

  async function playCurrent(){
    if(!current.playable||!current.src){mode.textContent='MASTER PENDING';hook.textContent='No numbered master loaded';return;}
    ensureAudio();if(ctx?.state==='suspended'){try{await ctx.resume();}catch{}}
    try{await audio.play();}catch(err){console.warn(err);hook.textContent='Tap Play to start audio';}
  }

  function updateMediaSession(){
    if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
    try{navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:'AeroVista',album:"The Time Circuit — Future's Past",artwork:[{src:new URL(current.art,document.baseURI).href}]});}catch{}
  }

  function updateTrackUI(){
    title.textContent=current.title.toUpperCase();description.textContent=current.description;badgeBpm.textContent=current.bpm;badgeLane.textContent=current.number;
    const n=numberedTracks.indexOf(current);nowPlaying.textContent=n>=0?`Now playing: ${current.number}`:`Archive playback: ${current.number}`;trackCount.textContent=n>=0?`${n+1} / ${numberedTracks.length}`:'ARCHIVE';
    document.title=`${current.title} — The Time Circuit | EchoVerse Audio`;updateMediaSession();renderPlaylist();
  }

  function loadTrack(track,autoplay=false){
    if(!track)return;audio.pause();current=track;seek.value='0';tCur.textContent='0:00';tDur.textContent='0:00';
    if(track.playable&&track.src){audio.src=track.src;audio.load();mode.textContent='IDLE';hook.textContent='ARMING...';flux.textContent='ARMED';}
    else{audio.removeAttribute('src');audio.load();mode.textContent='MASTER PENDING';hook.textContent='Waiting for real master';flux.textContent='STANDBY';}
    updateTrackUI();if(autoplay&&track.playable)playCurrent();
  }

  function numberedPlayable(){return numberedTracks.filter(t=>t.playable);}
  function nextNumbered(step){const list=numberedPlayable();let idx=list.indexOf(current);if(idx<0)idx=step>0?-1:0;return list[(idx+step+list.length)%list.length];}
  function moveNumbered(step,autoplay=!audio.paused){loadTrack(nextNumbered(step),autoplay);}

  function renderPlaylist(){
    playlistEl.innerHTML=numberedTracks.map(track=>`<button type="button" class="track-button ${track===current?'active ':''}${track.playable?'':'pending'}" data-number="${track.number}" ${track.playable?'':'disabled'}><strong>${escapeHtml(track.displayLabel||`${track.number} — ${track.title}`)}</strong><span class="sub">${escapeHtml(track.subtitle)} · ${escapeHtml(track.bpm)}${track.playable?'':' · MASTER PENDING'}</span></button>`).join('');
    playlistEl.querySelectorAll('[data-number]').forEach(btn=>btn.addEventListener('click',()=>{const track=numberedTracks.find(t=>t.number===btn.dataset.number);if(track?.playable)loadTrack(track,true);}));
  }

  function renderArchive(){
    archiveGrid.innerHTML=archiveTracks.map((track,i)=>`<article class="archive-card" data-archive="${i}" tabindex="0" role="button"><img src="${escapeHtml(track.art)}" alt=""><div><div class="eyebrow">${escapeHtml(track.number)} / ${escapeHtml(track.bpm)}</div><h2>${escapeHtml(track.title)}</h2><p>${escapeHtml(track.description)}</p></div><span class="archive-state">Play ↗</span></article>`).join('');
    archiveGrid.querySelectorAll('[data-archive]').forEach(card=>{const activate=()=>{loadTrack(archiveTracks[Number(card.dataset.archive)],true);setView('listen');};card.addEventListener('click',activate);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});});
  }

  function setView(name){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));document.querySelectorAll('[data-view-panel]').forEach(p=>p.classList.toggle('active',p.dataset.viewPanel===name));window.scrollTo({top:0,behavior:'smooth'});}
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));document.querySelectorAll('[data-view-target]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.viewTarget));

  btnPlay.addEventListener('click',()=>audio.paused?playCurrent():audio.pause());btnPrev.addEventListener('click',()=>moveNumbered(-1));btnNext.addEventListener('click',()=>moveNumbered(1));btnRestart.addEventListener('click',()=>{audio.currentTime=0;if(!audio.paused)playCurrent();});
  btnSample?.addEventListener('click',async()=>{try{if(sampleAudio.paused){const boosted=ensureSampleAudio();if(boosted&&sampleCtx?.state==='suspended')await sampleCtx.resume();sampleAudio.currentTime=0;await sampleAudio.play();btnSample.textContent='Stop Sample';}else{sampleAudio.pause();sampleAudio.currentTime=0;btnSample.textContent='Play Sample';}}catch(err){console.error('Sample playback failed:',err);btnSample.textContent='Sample Error';}});sampleAudio.addEventListener('ended',()=>{if(btnSample)btnSample.textContent='Play Sample';});
  seek.addEventListener('input',()=>{if(audio.duration)audio.currentTime=(Number(seek.value)/1000)*audio.duration;});vol.addEventListener('input',()=>audio.volume=Number(vol.value));audio.volume=Number(vol.value);
  audio.addEventListener('loadedmetadata',()=>{tDur.textContent=fmt(audio.duration);hook.textContent='READY';});audio.addEventListener('timeupdate',()=>{tCur.textContent=fmt(audio.currentTime);if(audio.duration)seek.value=String((audio.currentTime/audio.duration)*1000);});
  audio.addEventListener('play',()=>{btnPlay.textContent='Pause';mode.textContent='PLAYING';hook.textContent='SIGNAL LOCKED';flux.textContent='ENGAGED';});audio.addEventListener('pause',()=>{btnPlay.textContent='Play';if(!audio.ended){mode.textContent=current.playable?'PAUSED':'MASTER PENDING';flux.textContent=current.playable?'ARMED':'STANDBY';}});audio.addEventListener('ended',()=>moveNumbered(1,true));audio.addEventListener('error',()=>{mode.textContent='LOAD ERROR';hook.textContent='Audio source unavailable';flux.textContent='FAULT';});

  $('shareButton')?.addEventListener('click',async()=>{const share={title:'The Time Circuit — EchoVerse Audio',text:"Listen to Future's Past and explore the Time Circuit.",url:location.href};if(navigator.share){try{await navigator.share(share);return;}catch(err){if(err?.name==='AbortError')return;}}try{await navigator.clipboard.writeText(location.href);toast('Time Circuit link copied.');}catch{toast('Share this page: '+location.href);}});
  function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,2600);}

  if('mediaSession' in navigator){try{navigator.mediaSession.setActionHandler('play',playCurrent);navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('previoustrack',()=>moveNumbered(-1));navigator.mediaSession.setActionHandler('nexttrack',()=>moveNumbered(1));}catch{}}

  function animate(){
    requestAnimationFrame(animate);if(!analyser)return;analyser.getByteTimeDomainData(data);analyser.getByteFrequencyData(freq);let low=0,mid=0,high=0;const n=freq.length;
    for(let i=0;i<n;i++){const v=freq[i]/255;if(i<n*.12)low+=v;else if(i<n*.45)mid+=v;else high+=v;}low/=n*.12;mid/=n*.33;high/=n*.55;const intensity=clamp(low*1.2+mid*.9+high*.6,0,1);
    let d='M0 300';const points=64;for(let i=0;i<points;i++){const idx=Math.floor((i/(points-1))*(data.length-1));const t=(data[idx]-128)/128;const x=(i/(points-1))*1000;const y=300+t*(40+intensity*55);d+=` L ${x.toFixed(1)} ${y.toFixed(1)}`;}wave.setAttribute('d',d);
    for(let i=0;i<BAR_COUNT;i++){const bin=Math.floor((i/BAR_COUNT)*(n-1));const v=freq[bin]/255;const h=2+v*H*(.55+intensity*.75);bars[i].setAttribute('y',String(-h));bars[i].setAttribute('height',String(h));bars[i].setAttribute('fill',i>BAR_COUNT*.72?'rgba(255,165,98,.72)':'rgba(146,222,255,.68)');}
    tri.style.transform=`scale(${(1+intensity*.08).toFixed(3)})`;tri.style.transformOrigin='center';core.setAttribute('r',String(10+intensity*13));core.setAttribute('opacity',String(.55+intensity*.42));bolt.setAttribute('opacity',String(.45+high*.5));dest.textContent=String(Math.round(88+low*11));
  }

  renderPlaylist();renderArchive();loadTrack(numberedTracks[0],false);animate();
})();
