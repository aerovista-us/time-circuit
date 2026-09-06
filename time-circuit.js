(() => {
  'use strict';

  const tracks = [
    { number:'TC-01', title:'Eighty-Eight Rebel', subtitle:"Future's Past // numbered archive", src:'./01 — EIGHTY-EIGHT REBEL.mp3', art:'./images/marty.png', bpm:'88 BPM', lane:'numbered', playable:true, description:'The first numbered Time Circuit transmission: 88 BPM with one foot in 1985 and the other somewhere past 3026.' },
    { number:'TC-02', title:'Full Cab Bruiser', subtitle:"Future's Past // master slot", art:'./images/biff.png', bpm:'88 BPM', lane:'numbered', playable:false, description:'The bruiser slot is wired and waiting for its numbered audio master.' },
    { number:'TC-03', title:'Flux Professor', subtitle:"Future's Past // master slot", art:'./images/flux.png', bpm:'88 BPM', lane:'numbered', playable:false, description:'The Professor slot is wired and waiting for its numbered audio master.' },
    { number:'TC-04', title:'Paradox Queen', subtitle:"Future's Past // numbered archive", src:'./04 — PARADOX QUEEN.mp3', art:'./images/chick.png', bpm:'88 BPM', lane:'numbered', playable:true, description:"Same girl. Different timeline. The fourth numbered transmission closes the current Future's Past circuit at 88 BPM." },
    { number:'ARC-01', title:'Kids Will Love It', subtitle:'Original Time Circuit drop', src:'./kids-will-love-it.mp3', art:'./kids.will.love.it.png', bpm:'90.25 halftime', lane:'archive', playable:true, description:'The original cinematic quote-slam and halftime SwampHop drop that opened the early Time Circuit experiment.' },
    { number:'ARC-02', title:'Flux Swamp (1955)', subtitle:'Analog swamp intro', src:'./FLUX_SWAMP_(1955).mp3', art:'./images/doc.png', bpm:'~90 groove', lane:'archive', playable:true, description:'Tape hiss, swamp night, clean guitar, and an earlier time-travel experiment.' },
    { number:'ARC-03', title:'Momento × LowFreq × New Sound', subtitle:'SwampTime Flux mashup', src:'./momentoxLowFreqxNEW_SOUND.mp3', art:'./images/www.png', bpm:'Archive cut', lane:'archive', playable:true, description:'A low-frequency side-channel transmission from the Time Circuit source archive.' },
    { number:'ALT-01A', title:'Eighty-Eight Rebel — Alternate 1', subtitle:'TC-01 source render', src:'./01 — EIGHTY-EIGHT REBEL (1).mp3', art:'./images/marty.png', bpm:'88 BPM', lane:'alternate', playable:true, description:'Alternate source render for TC-01. It remains outside the numbered sequence.' },
    { number:'ALT-01B', title:'Eighty-Eight Rebel — Alternate 2', subtitle:'TC-01 source render', src:'./01 — EIGHTY-EIGHT REBEL (2).mp3', art:'./images/marty.png', bpm:'88 BPM', lane:'alternate', playable:true, description:'Second alternate source render for TC-01. It remains outside the numbered sequence.' }
  ];

  const $ = id => document.getElementById(id);
  const els = {
    audio:$('audio'), heroArt:$('heroArt'), ambientArt:$('ambientArt'), artStage:$('artStage'), visualizer:$('visualizer'),
    trackNumber:$('trackNumber'), trackBpm:$('trackBpm'), trackTitle:$('trackTitle'), trackSubtitle:$('trackSubtitle'), trackDescription:$('trackDescription'),
    playbackStatus:$('playbackStatus'), transportCard:$('transportCard'), currentTime:$('currentTime'), duration:$('duration'), seek:$('seek'),
    playButton:$('playButton'), playIcon:$('playIcon'), prevButton:$('prevButton'), nextButton:$('nextButton'), shuffleButton:$('shuffleButton'), repeatButton:$('repeatButton'),
    trackList:$('trackList'), archiveGrid:$('archiveGrid'), shareButton:$('shareButton'), toast:$('toast')
  };

  const PLAYER_KEY = 'time_circuit_player_v2';
  const state = { index:0, shuffle:false, repeat:'all', playing:false, audioCtx:null, source:null, analyser:null, frame:0 };

  function escapeHtml(value){return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function formatTime(value){if(!Number.isFinite(value)||value<0)return '0:00';const m=Math.floor(value/60),s=Math.floor(value%60);return `${m}:${String(s).padStart(2,'0')}`;}
  function currentTrack(){return tracks[state.index] || tracks[0];}
  function playableIndexes(){return tracks.map((track,index)=>track.playable?index:-1).filter(index=>index>=0);}

  function toast(message){
    if(!els.toast) return;
    els.toast.textContent=message;els.toast.hidden=false;
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>{els.toast.hidden=true;},2800);
  }

  function setView(view){
    document.querySelectorAll('[data-view-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.viewPanel===view));
    document.querySelectorAll('.section-nav [data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderNumbered(){
    const numbered=tracks.filter(track=>track.lane==='numbered');
    els.trackList.innerHTML=numbered.map(track=>{
      const index=tracks.indexOf(track);
      return `<div class="track-row ${index===state.index?'active':''} ${track.playable?'':'pending'}" data-track-index="${index}" role="button" tabindex="0" aria-label="${track.playable?'Play':'Open'} ${escapeHtml(track.title)}">
        <span class="track-num">${escapeHtml(track.number)}</span>
        <img class="track-thumb" src="${escapeHtml(track.art)}" alt="" loading="lazy">
        <span class="track-meta"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.subtitle)}</span></span>
        <span class="track-state ${track.playable?'ready':''}">${track.playable?(index===state.index&&state.playing?'PLAYING':'MASTER READY'):'MASTER PENDING'}</span>
      </div>`;
    }).join('');
    els.trackList.querySelectorAll('[data-track-index]').forEach(row=>{
      const activate=()=>selectTrack(Number(row.dataset.trackIndex),false);
      row.addEventListener('click',activate);
      row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
    });
  }

  function renderArchive(){
    const archive=tracks.filter(track=>track.lane!=='numbered');
    els.archiveGrid.innerHTML=archive.map(track=>{
      const index=tracks.indexOf(track);
      const kind=track.lane==='alternate'?'SOURCE RENDER':'ARCHIVE CUT';
      return `<article class="archive-card" data-track-index="${index}" tabindex="0" role="button" aria-label="Listen to ${escapeHtml(track.title)}">
        <img src="${escapeHtml(track.art)}" alt="${escapeHtml(track.title)} artwork" loading="lazy">
        <div><p class="eyebrow">${escapeHtml(track.number)} / ${kind}</p><h2>${escapeHtml(track.title)}</h2><p>${escapeHtml(track.description)}</p></div>
        <span class="archive-state">PLAY MASTER ↗</span>
      </article>`;
    }).join('');
    els.archiveGrid.querySelectorAll('[data-track-index]').forEach(card=>{
      const activate=()=>{selectTrack(Number(card.dataset.trackIndex),true);setView('listen');};
      card.addEventListener('click',activate);
      card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
    });
  }

  function applyTrack(track){
    els.heroArt.src=track.art;els.heroArt.alt=`${track.title} artwork`;
    els.ambientArt.style.backgroundImage=`url("${track.art}")`;
    els.trackNumber.textContent=track.number;els.trackBpm.textContent=track.bpm;els.trackTitle.textContent=track.title;els.trackSubtitle.textContent=track.subtitle;els.trackDescription.textContent=track.description;
    document.title=`${track.title} — The Time Circuit | EchoVerse Audio`;
    if(track.playable){
      const resolved=new URL(track.src,document.baseURI).href;
      if(els.audio.currentSrc!==resolved){els.audio.src=track.src;els.audio.load();}
      setStatus('READY','ready');
    }else{
      els.audio.pause();els.audio.removeAttribute('src');els.audio.load();state.playing=false;setPlayState(false);setStatus('MASTER PENDING','error');
    }
    if('mediaSession' in navigator && track.playable){
      try{navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:'AeroVista',album:"The Time Circuit — Future's Past",artwork:[{src:new URL(track.art,document.baseURI).href}]});}catch{}
    }
    renderNumbered();savePlayer();
  }

  function selectTrack(index,autoplay){
    if(index<0||index>=tracks.length)return;
    const resume=Boolean(autoplay||state.playing||!els.audio.paused);
    if(!els.audio.paused)els.audio.pause();
    const track=tracks[index];state.index=index;applyTrack(track);
    if(!track.playable){toast(`${track.title}: numbered master is not loaded yet.`);return;}
    if(resume) playCurrent();
  }

  function setStatus(label,mode){els.playbackStatus.textContent=label;els.transportCard.dataset.playbackState=mode||'ready';}
  function setPlayState(on){state.playing=on;els.playIcon.textContent=on?'Ⅱ':'▶';els.playButton.setAttribute('aria-label',on?'Pause':'Play');els.artStage.classList.toggle('playing',on);setStatus(on?'PLAYING':'PAUSED',on?'playing':'paused');renderNumbered();}

  async function ensureAudioGraph(){
    if(state.audioCtx){if(state.audioCtx.state==='suspended')await state.audioCtx.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{
      state.audioCtx=new AC();state.source=state.audioCtx.createMediaElementSource(els.audio);state.analyser=state.audioCtx.createAnalyser();state.analyser.fftSize=256;state.analyser.smoothingTimeConstant=.82;state.source.connect(state.analyser).connect(state.audioCtx.destination);await state.audioCtx.resume();drawVisualizer();
    }catch(error){console.info('Visualizer unavailable; native audio remains active.',error);}
  }

  async function playCurrent(){
    const track=currentTrack();if(!track.playable){toast(`${track.title}: master pending.`);return;}
    await ensureAudioGraph();
    try{await els.audio.play();}catch(error){console.info(error);toast('Playback needs a tap or the MP3 source is unavailable.');}
  }

  function nextTrack(direction=1){
    const available=playableIndexes();if(!available.length)return;
    if(state.shuffle){const choices=available.filter(index=>index!==state.index);selectTrack(choices[Math.floor(Math.random()*choices.length)] ?? available[0],true);return;}
    let pos=available.indexOf(state.index);if(pos<0)pos=0;pos=(pos+direction+available.length)%available.length;selectTrack(available[pos],true);
  }

  function drawVisualizer(){
    const canvas=els.visualizer,ctx=canvas.getContext('2d');if(!ctx||!state.analyser)return;
    const data=new Uint8Array(state.analyser.frequencyBinCount);
    const render=()=>{
      state.frame=requestAnimationFrame(render);const ratio=window.devicePixelRatio||1;const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);}
      ctx.clearRect(0,0,w,h);if(!state.playing)return;state.analyser.getByteFrequencyData(data);const bars=36,gap=3,bw=Math.max(2,(w-gap*(bars-1))/bars);for(let i=0;i<bars;i++){const v=data[Math.floor(i*data.length/bars)]/255;const bh=Math.max(2,v*h*.24);const x=i*(bw+gap);const grad=ctx.createLinearGradient(0,h-bh,0,h);grad.addColorStop(0,'rgba(90,200,255,.9)');grad.addColorStop(1,'rgba(255,153,88,.55)');ctx.fillStyle=grad;ctx.fillRect(x,h-bh,bw,bh);}
    };render();
  }

  function savePlayer(){try{localStorage.setItem(PLAYER_KEY,JSON.stringify({index:state.index,shuffle:state.shuffle,repeat:state.repeat}));}catch{}}
  function loadPlayer(){try{const saved=JSON.parse(localStorage.getItem(PLAYER_KEY)||'{}');state.index=Number.isInteger(saved.index)&&tracks[saved.index]?saved.index:0;state.shuffle=Boolean(saved.shuffle);state.repeat=['all','one','off'].includes(saved.repeat)?saved.repeat:'all';}catch{}}

  document.querySelectorAll('.section-nav [data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  document.querySelectorAll('[data-view-target]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.viewTarget)));
  els.playButton.addEventListener('click',()=>els.audio.paused?playCurrent():els.audio.pause());
  els.prevButton.addEventListener('click',()=>nextTrack(-1));els.nextButton.addEventListener('click',()=>nextTrack(1));
  els.shuffleButton.addEventListener('click',()=>{state.shuffle=!state.shuffle;els.shuffleButton.setAttribute('aria-pressed',String(state.shuffle));savePlayer();toast(state.shuffle?'Shuffle armed.':'Shuffle off.');});
  els.repeatButton.addEventListener('click',()=>{state.repeat=state.repeat==='all'?'one':state.repeat==='one'?'off':'all';els.repeatButton.dataset.mode=state.repeat;els.repeatButton.textContent=state.repeat==='one'?'↻1':'↻';savePlayer();toast(`Repeat ${state.repeat}.`);});
  els.audio.addEventListener('play',()=>setPlayState(true));els.audio.addEventListener('pause',()=>{if(!els.audio.ended)setPlayState(false);});
  els.audio.addEventListener('loadedmetadata',()=>{els.duration.textContent=formatTime(els.audio.duration);setStatus('READY','ready');});
  els.audio.addEventListener('timeupdate',()=>{els.currentTime.textContent=formatTime(els.audio.currentTime);if(Number.isFinite(els.audio.duration)&&els.audio.duration>0)els.seek.value=String(Math.round(els.audio.currentTime/els.audio.duration*1000));});
  els.seek.addEventListener('input',()=>{if(Number.isFinite(els.audio.duration)&&els.audio.duration>0)els.audio.currentTime=Number(els.seek.value)/1000*els.audio.duration;});
  els.audio.addEventListener('ended',()=>{if(state.repeat==='one'){els.audio.currentTime=0;playCurrent();}else if(state.repeat==='all'||state.shuffle)nextTrack(1);else setPlayState(false);});
  els.audio.addEventListener('error',()=>{setPlayState(false);setStatus('SOURCE ERROR','error');});
  els.shareButton.addEventListener('click',async()=>{const data={title:'The Time Circuit — EchoVerse Audio',text:"88 BPM transmissions from 1985 to 3026.",url:location.href};if(navigator.share){try{await navigator.share(data);return;}catch(error){if(error?.name==='AbortError')return;}}try{await navigator.clipboard.writeText(data.url);toast('Time Circuit link copied.');}catch{toast('Copy the address from your browser.');}});

  if('mediaSession' in navigator){navigator.mediaSession.setActionHandler?.('play',playCurrent);navigator.mediaSession.setActionHandler?.('pause',()=>els.audio.pause());navigator.mediaSession.setActionHandler?.('previoustrack',()=>nextTrack(-1));navigator.mediaSession.setActionHandler?.('nexttrack',()=>nextTrack(1));}

  loadPlayer();els.shuffleButton.setAttribute('aria-pressed',String(state.shuffle));els.repeatButton.dataset.mode=state.repeat;renderArchive();applyTrack(currentTrack());
})();
