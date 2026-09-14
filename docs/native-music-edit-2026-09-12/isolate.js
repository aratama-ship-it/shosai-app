// Executed before all original scripts. No reading/writing the owner's storage.
(() => {
  const memory=new Map([['shosai-stage-tour-v1','done'],['shosai-stage-prefs-v1',JSON.stringify({uiSkin:'warm-black'})]]);
  const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear(),key:i=>[...memory.keys()][i]??null,get length(){return memory.size;}};
  Object.defineProperty(window,'localStorage',{value:storage});
  Object.defineProperty(window,'sessionStorage',{value:storage});
  Object.defineProperty(window,'indexedDB',{value:undefined});
  window.fetch=async()=>new Response(JSON.stringify({user:null}),{headers:{'Content-Type':'application/json'}});
  window.open=()=>null;
  window.alert=()=>{};
  window.confirm=()=>false;
  if(!location.search.includes('seam-sample'))history.replaceState(null,'',location.pathname+'?seam-sample');
  window.__NATIVE_MUSIC_PREVIEW__={mode:'memory-only',audio:'none',ready:false};
})();
