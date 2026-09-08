(() => {
  'use strict';

  const signalThemes = {
    'TC-00': { id:'retroflux', label:'RETROFLUX', color:'#52ecff' },
    'TC-01': { id:'rebel', label:'REBEL 88', color:'#62e9ff' },
    'TC-02': { id:'bruiser', label:'BRUISER', color:'#ff5e8a' },
    'TC-03': { id:'flux', label:'FLUX CORE', color:'#9b68ff' },
    'TC-04': { id:'paradox', label:'PARADOX', color:'#ff67db' },
    'TC-05': { id:'kids', label:'KIDS SIGNAL', color:'#ffc56b' },
    'TC-06': { id:'swamp', label:'SWAMP 1955', color:'#63f5a8' },
    'TC-07': { id:'fracture', label:'FRACTURE', color:'#8a7dff' },
    'TC-08': { id:'rebel', label:'REBEL ALT A', color:'#62e9ff' },
    'TC-09': { id:'rebel', label:'REBEL ALT B', color:'#62e9ff' },
    'ARC-01': { id:'kids', label:'ARCHIVE / KIDS', color:'#ffc56b' },
    'ARC-02': { id:'swamp', label:'ARCHIVE / 1955', color:'#63f5a8' },
    'ARC-03': { id:'fracture', label:'ARCHIVE / FRACTURE', color:'#8a7dff' },
    'ALT-01A': { id:'rebel', label:'ALT / REBEL A', color:'#62e9ff' },
    'ALT-01B': { id:'rebel', label:'ALT / REBEL B', color:'#62e9ff' }
  };

  const lane = document.getElementById('badgeLane');
  const brandCopy = document.querySelector('.brand-copy');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let lastTheme = '';

  function signalCode(){
    return lane?.textContent?.trim() || 'TC-00';
  }

  function applySignalTheme(){
    const code = signalCode();
    const theme = signalThemes[code] || signalThemes['TC-00'];
    const root = document.documentElement;
    root.dataset.signalTheme = theme.id;
    document.body.dataset.signalTheme = theme.id;
    document.body.dataset.signalCode = code;
    if(brandCopy) brandCopy.dataset.signalLabel = `${theme.label} / ${code}`;
    if(themeMeta) themeMeta.setAttribute('content', theme.color);

    if(theme.id !== lastTheme){
      document.body.classList.remove('theme-shift');
      void document.body.offsetWidth;
      document.body.classList.add('theme-shift');
      window.setTimeout(()=>document.body.classList.remove('theme-shift'), 520);
      lastTheme = theme.id;
    }
  }

  function syncActiveView(){
    const view = document.querySelector('.view.active[data-view-panel]')?.dataset.viewPanel || 'listen';
    document.body.dataset.timeView = view;
  }

  if(lane){
    new MutationObserver(applySignalTheme).observe(lane,{childList:true,subtree:true,characterData:true});
  }
  document.querySelectorAll('.view[data-view-panel]').forEach(panel=>{
    new MutationObserver(syncActiveView).observe(panel,{attributes:true,attributeFilter:['class']});
  });

  applySignalTheme();
  syncActiveView();
})();
