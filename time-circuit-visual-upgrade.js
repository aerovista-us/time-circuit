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

  function syncArtwork(){
    const key = lane?.textContent?.trim();
    const src = artBySignal[key];
    if(!src) return;
    const label = `${title?.textContent?.trim() || key} artwork`;
    if(cover){ cover.src = src; cover.alt = label; }
    if(visualizerArt){ visualizerArt.src = src; visualizerArt.alt = ''; }
  }

  if(lane){
    new MutationObserver(syncArtwork).observe(lane,{childList:true,subtree:true,characterData:true});
  }
  if(title){
    new MutationObserver(syncArtwork).observe(title,{childList:true,subtree:true,characterData:true});
  }

  audio?.addEventListener('play',()=>visualizerArt?.classList.add('playing'));
  audio?.addEventListener('pause',()=>visualizerArt?.classList.remove('playing'));
  audio?.addEventListener('ended',()=>visualizerArt?.classList.remove('playing'));

  syncArtwork();
})();
