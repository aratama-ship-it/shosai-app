'use strict';
(() => {
 const dialog=$('q-sheet'),body=$('q-body'),main=document.querySelector('main');
 let draft=[],base='',rowDrag=null,epoch=0,loading=false,autoOpened=false;
 const dirty=()=>JSON.stringify(draft)!==base;
 function message(text,error=false){$('q-message').textContent=text;$('q-message').classList.toggle('error',error);}
 function position(c){
  const a=entry(c.key);if(!a)return {version:'',page:'',quote:'',status:'未割当'};
  return {version:fixture.versions[a.anchor.version]?.label||a.anchor.version,page:String(a.anchor.page+1),quote:a.anchor.quote,status:assignmentStatus(c.key)==='assigned'?'割当済み':'要付替え'};
 }
 function refreshDirty(){
  $('q-count').textContent=draft.length+' Q';$('q-edit-state').textContent=loading?'CSVを読み込んでいます。':dirty()?'変更あり・台本側には未反映':'変更なし';
  $('q-apply').disabled=loading||!dirty();$('q-export').disabled=loading;$('q-import').disabled=loading;$('q-add').disabled=loading||draft.length>=200;
 }
 function renderBody(focusKey){
  body.replaceChildren();
  draft.forEach((c,index)=>{
   const tr=document.createElement('tr');tr.dataset.cueId=c.id;
   const orderCell=document.createElement('td'),controls=document.createElement('div');controls.className='q-order';
   const grip=document.createElement('button');grip.className='q-grip';grip.textContent=(index+1)+' ↕';grip.draggable=true;grip.dataset.grip=c.id;grip.setAttribute('aria-label',(index+1)+'行目をドラッグで並べ替え');
   grip.addEventListener('dragstart',e=>{rowDrag=c.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.id);});
   grip.addEventListener('dragend',clearRowDrag);controls.append(grip);
   for(const [step,label,symbol] of [[-1,'上へ','↑'],[1,'下へ','↓']]){const button=document.createElement('button');button.textContent=symbol;button.setAttribute('aria-label',(index+1)+'行目を'+label);button.disabled=index+step<0||index+step>=draft.length;button.onclick=()=>move(c.id,draft[index+step].id);controls.append(button);}
   orderCell.append(controls);tr.append(orderCell);
   QSheetCSV.fields.forEach(([field,label])=>{
    const td=document.createElement('td');let input;
    if(field==='type'){input=document.createElement('select');QSheetCSV.types.forEach(t=>{const opt=document.createElement('option');opt.value=t;opt.textContent=t;input.append(opt);});}
    else if(['description','trigger','note'].includes(field))input=document.createElement('textarea');
    else input=document.createElement('input');
    input.className='q-input';input.value=c[field];input.dataset.field=field;input.dataset.cueId=c.id;input.setAttribute('aria-label',(index+1)+'行目 '+label);if(field!=='type')input.maxLength=field==='number'?40:1000;
    input.addEventListener('input',()=>{c[field]=input.value;refreshDirty();});input.addEventListener('change',()=>{c[field]=input.value;refreshDirty();});td.append(input);tr.append(td);
   });
   const td=document.createElement('td');td.className='q-position';const p=position(c),info=document.createElement('p');info.textContent=p.status+(p.page?' / '+p.version+' '+p.page+'頁\n'+p.quote:'');td.append(info);
   const jump=document.createElement('button');jump.textContent=p.status==='割当済み'?'台本で見る':'台本に割り当てる';jump.onclick=()=>jumpToScript(c);td.append(jump);tr.append(td);
   tr.addEventListener('dragover',e=>{if(!rowDrag)return;e.preventDefault();document.querySelectorAll('.q-drop').forEach(n=>n.classList.remove('q-drop'));tr.classList.add('q-drop');});
   tr.addEventListener('drop',e=>{if(!rowDrag)return;e.preventDefault();const from=rowDrag;clearRowDrag();move(from,c.id);});body.append(tr);
  });refreshDirty();
  if(focusKey)Array.from(body.querySelectorAll('[data-grip]')).find(b=>b.dataset.grip===focusKey)?.focus({preventScroll:true});
 }
 function clearRowDrag(){rowDrag=null;document.querySelectorAll('.q-drop').forEach(n=>n.classList.remove('q-drop'));}
 function move(from,to){
  const a=draft.findIndex(c=>c.id===from),b=draft.findIndex(c=>c.id===to);if(a<0||b<0||a===b)return;
  const [item]=draft.splice(a,1);draft.splice(b,0,item);renderBody(from);message('表の順番を変更しました。台本の位置は変わりません。');
 }
 function open(){
  if(!fixture||dialog.open)return;clearPending();epoch++;loading=false;draft=structuredClone(state.cues);base=JSON.stringify(draft);$('q-confirm').hidden=true;
  message('表の順番は表示順です。合図の実行は行いません。');renderBody();main.inert=true;dialog.showModal();$('q-close').focus({preventScroll:true});
 }
 function close(){epoch++;loading=false;clearRowDrag();main.inert=false;dialog.close();$('open-q-sheet').focus({preventScroll:true});}
 function requestClose(){if(dirty()){$('q-confirm').hidden=false;$('q-continue').focus({preventScroll:true});}else close();}
 function apply(){
  if(loading)return;try{QSheetCSV.validate(draft);}catch(e){message(e.message,true);return;}
  if(!dirty()){close();return;}
  history.push(snapshot());state.cues=structuredClone(draft);close();render();say('Qシートの変更を反映しました。台本との接続を保持し、元に戻すこともできます。');
 }
 function jumpToScript(c){
  if(dirty()){message('先に「変更を反映」してください。反映後に台本へ移れます。',true);return;}
  const a=entry(c.key),valid=a&&assignmentStatus(c.key)==='assigned';close();
  if(!valid){choose(c.key);return;}
  state.mode='with';state.right=true;state.side='right';state.page=a.anchor.page;state.selected=c.key;state.pending=null;render();
  setTimeout(()=>{const row=Array.from(document.querySelectorAll('[data-row]')).find(b=>b.dataset.row===a.anchor.rowId);row?.focus({preventScroll:true});row?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});},180);
  say(c.number+'の台本位置を表示しています。');
 }
 $('open-q-sheet').onclick=open;$('q-close').onclick=requestClose;dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
 $('q-discard').onclick=close;$('q-continue').onclick=()=>{$('q-confirm').hidden=true;body.querySelector('input,textarea,select')?.focus();};$('q-apply').onclick=apply;
 $('q-add').onclick=()=>{if(draft.length>=200)return;let n=1;while(draft.some(c=>c.number==='Q '+n))n++;
  const c={id:'fixture-cue-'+crypto.randomUUID(),key:'cue-'+crypto.randomUUID(),number:'Q '+n,type:'その他',description:'',trigger:'',assignee:'',note:''};draft.push(c);renderBody();body.lastChild.querySelector('[data-field="number"]').focus();message('新しいQを追加しました。内容を入力して反映してください。');};
 $('q-import').onclick=()=>{$('q-file').value='';$('q-file').click();};
 $('q-file').onchange=async()=>{
  const file=$('q-file').files[0];if(!file)return;if(file.size>1048576){message('CSVは1MiBまでです。',true);return;}
  const token=++epoch;loading=true;refreshDirty();
  try{const text=await file.text();if(token!==epoch||!dialog.open)return;const result=QSheetCSV.read(text,draft);draft=result.cues;renderBody();message('CSVの候補：追加 '+result.created+'件 / 更新 '+result.updated+'件。表で確認して反映してください。CSVにないQと台本位置は保持します。');}
  catch(e){if(token===epoch&&dialog.open)message('読込みできません：'+e.message,true);}
  finally{if(token===epoch){loading=false;refreshDirty();}}
 };
 $('q-export').onclick=()=>{
  try{const text=QSheetCSV.write(draft,position),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='stage-sketch-q-sheet.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   message(dirty()?'表の編集候補をCSVに保存しました。台本側には未反映です。':'QシートをCSVに保存しました。');}
  catch(e){message(e.message,true);}
 };
 function autoOpen(){if(!autoOpened&&fixture&&new URLSearchParams(location.search).get('sheet')==='open'){autoOpened=true;open();}}
 document.addEventListener('fixture-render',()=>{if(!autoOpened)queueMicrotask(autoOpen);});autoOpen();
})();
