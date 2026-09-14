'use strict';
(() => {
 const DB_NAME='stage-sketch-script-cues',DB_VERSION=1,STORE='workspace',RECORD_ID='current';
 let dbPromise=null,started=false,ready=false,saving=false,dirty=false,timer=0;
 function saveStatus(){
  let el=$('save-state');if(el)return el;
  el=document.createElement('span');el.id='save-state';el.className='small';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.textContent='この端末にはまだ作業を保存していません。';$('count').insertAdjacentElement('afterend',el);
  const notice=document.querySelector('.howto .notice');if(notice)notice.textContent='PDF・CSVはブラウザ内で処理します。この試作はPDF・Q・割当をこの端末のブラウザへ自動保存します。別の端末への移行やファイル書出しはまだありません。';
  const scope=[...document.querySelectorAll('.howto p')].find(p=>p.textContent.includes('再読込みすると初期化'));if(scope)scope.textContent='初期表示は架空台本です。左の「PDF読込み」から手元のPDFを読み込めます。PDF・CSVはブラウザ内で処理します。試作のPDF・Q・割当は、この端末・このブラウザで再読込み後も復元します。製品データ、保存、実際のGOには接続していません。';
  const importScope=[...document.querySelectorAll('.import-body .small')].find(p=>p.textContent.includes('この試作は再読込みで初期化'));if(importScope)importScope.textContent='50MiB・300頁まで。既存PDFの注釈は参照表示で、編集できるQへは自動変換しません。試作のPDF・Q・割当は、この端末・このブラウザで再読込み後も復元します。';
  const limits=document.querySelector('.q-limits');if(limits)limits.textContent='仮データの試作です。Q・台本位置はこの端末へ自動保存します。CSVはQの一覧用で、台本の編集用バックアップではありません。';
  return el;
 }
 function status(text,warning=false){const el=saveStatus();el.textContent=text;el.classList.toggle('needs-attention',warning);}
 function open(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
   if(!('indexedDB' in window)){reject(new Error('IndexedDB is unavailable'));return;}
   const request=indexedDB.open(DB_NAME,DB_VERSION);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
   request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onerror=()=>reject(request.error||new Error('IndexedDB could not open'));
  });
  return dbPromise;
 }
 async function read(){
  const db=await open();return new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).get(RECORD_ID);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error||new Error('Saved workspace could not be read'));});
 }
 async function write(record){
  const db=await open();return new Promise((resolve,reject)=>{const transaction=db.transaction(STORE,'readwrite');transaction.objectStore(STORE).put(record);transaction.oncomplete=resolve;transaction.onabort=()=>reject(transaction.error||new Error('Saved workspace could not be written'));transaction.onerror=()=>reject(transaction.error||new Error('Saved workspace could not be written'));});
 }
 function stamp(){return new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit'}).format(new Date());}
 function record(){return {id:RECORD_ID,schema:1,savedAt:new Date().toISOString(),workspace:TrialState.capture(),assets:LocalPDF.assets()};}
 async function flush(){
  timer=0;if(!ready||saving||!dirty)return;saving=true;dirty=false;status('この端末へ保存しています…');
  try{const value=record();await write(value);status('この端末に保存済み '+stamp()+'。PDF・Q・割当をこのブラウザで復元できます。');}
  catch(error){console.warn('script cue workspace could not be saved',error);status('この端末へ保存できません。いまの画面上の作業は残っています。',true);}
  finally{saving=false;if(dirty)queue();}
 }
 function queue(){
  dirty=true;if(timer||saving)return;timer=window.setTimeout(flush,120);
 }
 async function restore(){
  status('この端末に保存した作業を確認しています…');
  let value;try{value=await read();}catch(error){console.warn('script cue workspace could not be read',error);ready=true;status('この端末の保存を読めません。新しい試作として始めます。',true);return;}
  if(!value){ready=true;status('この端末にはまだ作業を保存していません。');return;}
  if(value.schema!==1||!value.workspace){ready=true;status('この端末の保存形式を確認できません。新しい試作として始めます。',true);return;}
  status('保存したPDF・Q・割当を復元しています…');
  let assets={restored:0,failed:0};try{assets=await LocalPDF.restoreAssets(value.assets);}catch(error){console.warn('saved script PDFs could not be restored',error);assets.failed=Array.isArray(value.assets)?value.assets.length:0;}
  const restored=TrialState.restore(value.workspace);ready=true;
  if(!restored){status('保存した作業を安全に読めません。新しい試作として始めます。',true);return;}
  const suffix=assets.failed?' PDF '+assets.failed+'版は読めず、要付替えとして残しています。':' PDF '+assets.restored+'版を含めて復元しました。';status('この端末に保存した作業を復元しました。'+suffix);
 }
 function start(){
  if(started||!globalThis.TrialState?.ready?.()||!globalThis.LocalPDF)return;started=true;restore();
 }
 document.addEventListener('trial-workspace-change',queue);document.addEventListener('trial-ready',start);window.addEventListener('pagehide',()=>{if(dirty)flush();});queueMicrotask(start);
 globalThis.ScriptCuePersistence={flush,restore};
})();
