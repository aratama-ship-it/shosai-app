'use strict';
(() => {
 const docs=new Map(),dialog=$('pdf-import'),main=document.querySelector('main');
 const base='./vendor/pdfjs-5.6.205/';
 let library,epoch=0,candidate=null,loadingTask=null,viewEpoch=0,cache=new Map(),pendingReveal=null;
 const lib=()=>library||(library=import(base+'pdf.min.mjs').then(m=>{m.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';return m;}).catch(e=>{library=null;throw e;}));
 const status=(s)=>{$('pdf-message').textContent=s;};
 function ensureUi(){
  if(!$('pdf-analysis')){
   const box=document.createElement('section'),title=document.createElement('strong'),detail=document.createElement('p');
   box.id='pdf-analysis';box.className='pdf-analysis';box.hidden=true;box.setAttribute('aria-live','polite');title.id='pdf-analysis-title';detail.id='pdf-analysis-detail';box.append(title,detail);$('pdf-message').insertAdjacentElement('afterend',box);
  }
  if(!$('pdf-position-controls')){
   const box=document.createElement('section'),detail=document.createElement('p'),button=document.createElement('button');
   box.id='pdf-position-controls';box.className='pdf-position-controls';box.hidden=true;detail.textContent='キューを選び、紙面を押して位置へ置きます。';button.id='pdf-position-assign';button.type='button';button.textContent='このページの中央へ置く';box.append(detail,button);$('pdf-page-help').insertAdjacentElement('afterend',box);
  }
 }
 function exclusionText(analysis){
  return [analysis.unreadableCount&&'読めない文字 '+analysis.unreadableCount+'件',analysis.incidentalCount&&'頁番号などの補助文字 '+analysis.incidentalCount+'件'].filter(Boolean).join('・');
 }
 function setImportAnalysis(analysis){
  const box=$('pdf-analysis');if(!analysis){box.hidden=true;return;}
  const exclusion=exclusionText(analysis);box.hidden=false;
  if(analysis.textAssignable){
   $('pdf-analysis-title').textContent='本文候補：'+analysis.candidateCount+'行 / '+analysis.candidateChars+'文字';
   $('pdf-analysis-detail').textContent='本文の文字を選んで割り当てられます。余白を押すと紙面の位置に割り当てます。'+(exclusion?' '+exclusion+'は候補から除外しました。':'');
  }else{
   $('pdf-analysis-title').textContent='位置指定で取り込むPDF';
   $('pdf-analysis-detail').textContent='本文の文字は割当候補にしません。'+(exclusion?exclusion+'を候補から除外しました。':'本文として使える文字が十分にありません。')+' キューを選んで紙面の位置へ置けます。';
  }
 }
 function setPageMode(analysis){
  const textAssignable=analysis?.textAssignable===true,help=$('pdf-page-help');help.hidden=false;help.classList.toggle('position-only',!textAssignable);$('pdf-text-controls').hidden=!textAssignable;$('pdf-position-controls').hidden=textAssignable;
  if(!textAssignable)$('pdf-text-controls').open=false;
  help.textContent=textAssignable?'文字へ置くと本文に、余白へ置くとページ内の位置に割り当てます。':'本文の文字を候補にしないページです。キューを選び、紙面を押すと位置に割り当てます。';
  return textAssignable;
 }
 const discardCandidate=()=>{if(candidate){URL.revokeObjectURL(candidate.first.image);candidate.pdf.destroy();candidate=null;}};
 const close=()=>{epoch++;discardCandidate();loadingTask?.destroy();loadingTask=null;$('pdf-password').value='';$('pdf-preview').removeAttribute('src');setImportAnalysis(null);main.inert=false;dialog.close();$('open-pdf').focus({preventScroll:true});};
 function open(){
  if(!fixture)return;clearPending();epoch++;candidate=null;$('pdf-file').value='';$('pdf-preview').hidden=true;$('pdf-apply').disabled=true;$('pdf-password').value='';
  setImportAnalysis(null);
  status('PDFを選ぶと、先頭ページを確認できます。今の台本と割当はそのまま残ります。');main.inert=true;dialog.showModal();$('pdf-file').focus();
 }
 function textData(content,viewport,m){
  const out=[],analysis={sourceCount:0,unreadableCount:0,incidentalCount:0,candidateCount:0,candidateChars:0,textAssignable:false};
  for(const [i,item] of content.items.entries()){
   const raw=item.str?.trim();if(!raw)continue;analysis.sourceCount++;
   if(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/u.test(raw)){analysis.unreadableCount++;continue;}
   const text=raw.replace(/\s+/gu,' ').trim();
   if(/^page(?:\s*(?:no\.?|number))?\s*[:#]?\s*\d+$/iu.test(text)){analysis.incidentalCount++;continue;}
   const t=m.Util.transform(viewport.transform,item.transform),font=content.styles[item.fontName]||{};
   const h=Math.hypot(t[2],t[3]),angle=Math.atan2(t[1],t[0])+(font.vertical?Math.PI/2:0),w=item.width*viewport.scale;
   const asc=h*(font.ascent||1+font.descent||.8),extent=asc+Math.max(h-asc,h*.3),ux=Math.cos(angle),uy=Math.sin(angle);
   const x=t[4]+uy*asc,y=t[5]-ux*asc;
   const pts=[[x,y],[x+ux*w,y+uy*w],[x-uy*extent,y+ux*extent],[x+ux*w-uy*extent,y+uy*w+ux*extent]];
   const clamp=v=>Math.max(0,Math.min(1,v));
   const rect=[clamp(Math.min(...pts.map(p=>p[0]))/viewport.width),clamp(Math.min(...pts.map(p=>p[1]))/viewport.height),clamp(Math.max(...pts.map(p=>p[0]))/viewport.width),clamp(Math.max(...pts.map(p=>p[1]))/viewport.height)];
   if(rect[2]>rect[0]&&rect[3]>rect[1])out.push({id:'text-'+i,text,rect});
  }
  analysis.candidateCount=out.length;analysis.candidateChars=out.reduce((total,row)=>total+row.text.length,0);analysis.textAssignable=analysis.candidateCount>=2&&analysis.candidateChars>=12;
  return {rows:analysis.textAssignable?out:[],analysis};
 }
 async function loadPage(pdf,n){
  const m=await lib(),p=await pdf.getPage(n+1),natural=p.getViewport({scale:1});
  const scale=Math.min(2,Math.sqrt(2000000/(natural.width*natural.height))),viewport=p.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await p.render({canvasContext:canvas.getContext('2d'),viewport,annotationMode:m.AnnotationMode.ENABLE}).promise;
  const content=await p.getTextContent(),blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('ページ画像を作成できませんでした。'))));
  const text=textData(content,natural,m),result={image:URL.createObjectURL(blob),width:natural.width,height:natural.height,rows:text.rows,analysis:text.analysis};
  canvas.width=canvas.height=0;p.cleanup();return result;
 }
 async function prepare(){
  const file=$('pdf-file').files[0];if(!file)return;
  const token=++epoch;discardCandidate();loadingTask?.destroy();loadingTask=null;
  $('pdf-preview').hidden=true;$('pdf-apply').disabled=true;setImportAnalysis(null);
  if(file.size>50*1024*1024){status('この試作では50MiBまでのPDFを選んでください。');return;}
  if(docs.size>=8||Array.from(docs.values()).reduce((n,d)=>n+d.file.size,0)+file.size>100*1024*1024){status('この試作の上限（8版・合計100MiB）に達します。');return;}
  status('PDFを読み込んでいます。取消しても今の台本は変わりません。');
  let pdf,first;
  try{
   const [m,bytes]=await Promise.all([lib(),file.arrayBuffer()]);if(token!==epoch)return;
   const task=m.getDocument({data:new Uint8Array(bytes),password:$('pdf-password').value,cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/',isEvalSupported:false,enableXfa:false,stopAtErrors:true});loadingTask=task;
   pdf=await task.promise;if(token!==epoch){pdf.destroy();return;}
   if(pdf.numPages>300)throw new Error('この試作では300頁までのPDFを選んでください。');
   first=await loadPage(pdf,0);if(token!==epoch){URL.revokeObjectURL(first.image);pdf.destroy();return;}
   candidate={pdf,file,first};loadingTask=null;$('pdf-preview').src=first.image;$('pdf-preview').hidden=false;$('pdf-apply').disabled=false;setImportAnalysis(first.analysis);
   status(file.name+' / '+pdf.numPages+'頁。反映すると以前の割当 '+state.annotations.length+'件は「要付替え」に残ります。');
  }catch(e){
   if(token!==epoch)return;pdf?.destroy();loadingTask?.destroy();loadingTask=null;
   status(e.name==='PasswordException'?'パスワードが必要、または一致しません。下の欄に入力して「再読込み」を押してください。':'PDFを読み込めません：'+e.message+' 今の台本は変更していません。');
  }
 }
 function commit(){
  if(!candidate)return;const d=candidate;candidate=null;const id='pdf-'+crypto.randomUUID();registerDocument(id,d);
  history.push(snapshot());state.version=id;state.page=0;state.mode='with';state.right=true;state.side='right';state.selected=null;state.pending=null;
  close();lastPage='';render();TrialState.changed('pdf-import');say('PDFを新しい版として読み込みました。以前の台本と割当は残しています。');
 }
 function registerDocument(id,d,label){
  docs.set(id,d);cached(id+':0',d.first);fixture.versions[id]={label:label||'版'+docs.size+'：'+d.file.name,local:true,pages:Array.from({length:d.pdf.numPages},()=>({rows:[],ready:false}))};Object.assign(fixture.versions[id].pages[0],d.first,{ready:true});
  const opt=document.createElement('option');opt.value=id;opt.textContent=fixture.versions[id].label;$('version').append(opt);
 }
 function cached(key,data){
  cache.set(key,data);while(cache.size>3){const first=cache.keys().next().value;URL.revokeObjectURL(cache.get(first).image);cache.delete(first);}
 }
 async function hydrateAsset(record){
  if(!record||typeof record.id!=='string'||!record.file||typeof record.file.size!=='number')throw new Error('保存されたPDFの情報が読めません。');
  const file=record.file instanceof File?record.file:new File([record.file],record.name||'台本.pdf',{type:record.type||'application/pdf',lastModified:record.lastModified||Date.now()});
  if(file.size>50*1024*1024)throw new Error('保存されたPDFが上限を超えています。');
  const [m,bytes]=await Promise.all([lib(),file.arrayBuffer()]),task=m.getDocument({data:new Uint8Array(bytes),cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/',isEvalSupported:false,enableXfa:false,stopAtErrors:true});
  let pdf;try{pdf=await task.promise;if(pdf.numPages>300)throw new Error('保存されたPDFが頁数上限を超えています。');const first=await loadPage(pdf,0);return {pdf,file,first};}catch(error){pdf?.destroy();task.destroy();throw error;}
 }
 async function restoreAssets(records){
  const result={restored:0,failed:0};if(!Array.isArray(records)||records.length>8)return result;let total=0;
  for(const record of records){
   if(!record||docs.has(record.id)||fixture.versions[record.id])continue;
   if(typeof record.file?.size!=='number'||record.file.size>50*1024*1024||total+record.file.size>100*1024*1024){result.failed++;continue;}total+=record.file.size;
   try{const d=await hydrateAsset(record);registerDocument(record.id,d,typeof record.label==='string'?record.label:'');result.restored++;}catch(error){result.failed++;console.warn('saved script PDF could not be restored',error);}
  }
  return result;
 }
 async function display(id,n){
 const token=++viewEpoch,key=id+':'+n,paper=$('paper');paper.classList.add('local-pdf');$('page-image').hidden=true;$('row-overlay').replaceChildren();$('marks').replaceChildren();$('pdf-text-controls').hidden=true;$('pdf-position-controls').hidden=true;$('pdf-page-help').hidden=false;$('pdf-page-help').textContent='ページを読み込んでいます…';
  try{
   let data=cache.get(key);if(!data){data=await loadPage(docs.get(id).pdf,n);cached(key,data);}
   Object.assign(fixture.versions[id].pages[n],data,{ready:true});
   if(token!==viewEpoch||state.version!==id||state.page!==n)return;
   $('page-image').src=data.image;$('page-image').hidden=false;$('page-image').alt=fixture.versions[id].label+' '+(n+1)+'頁';paper.style.aspectRatio=data.width+'/'+data.height;
   const textAssignable=setPageMode(data.analysis),b=document.createElement('button');b.className='pdf-surface';b.setAttribute('aria-label',textAssignable?'PDFの割当先を選ぶ。本文の文字またはページ内の位置を押す':'PDFの位置へ割り当てる。キューを選んで紙面を押す');b.dataset.pdfSurface='true';
   b.onclick=e=>{
    if(!state.pending){say('割当道具からシーンかQを選んでください。');return;}
    if(e.detail===0){
     if(textAssignable){$('pdf-text-controls').open=true;$('pdf-text-choice').focus();}
     else{say('紙面の位置をマウスまたは指で押して置けます。「このページの中央へ置く」も使えます。');$('pdf-position-assign').focus();}
     return;
    }
    const anchor=hit(e.clientX,e.clientY);if(anchor)assign(state.pending,anchor);
   };$('row-overlay').append(b);
   const select=$('pdf-text-choice');select.replaceChildren();const placeholder=new Option('本文から割当先を選ぶ','');select.append(placeholder);
   data.rows.forEach(r=>select.append(new Option(r.text,r.id)));select.append(new Option('このページの中央（位置指定）','point-center'));
   renderMarks();renderHealth();if(pendingReveal)reveal(pendingReveal);
  }catch(e){if(token!==viewEpoch||state.version!==id||state.page!==n)return;$('pdf-page-help').textContent='この頁を表示できませんでした。別の頁・版へ移動できます。割当は保持しています。';say('PDFの頁を表示できません：'+e.message);}
 }
 function point(x,y){const rect=[Math.max(0,x-.015),Math.max(0,y-.008),Math.min(1,x+.015),Math.min(1,y+.008)];return {id:'point-'+crypto.randomUUID(),text:'ページ内の位置（横'+Math.round(x*100)+'%・縦'+Math.round(y*100)+'%）',rect,kind:'point'};}
 function hit(x,y){
  const r=$('page-image').getBoundingClientRect(),nx=(x-r.left)/r.width,ny=(y-r.top)/r.height;
  if(nx<0||nx>1||ny<0||ny>1)return null;
  return rows().filter(r=>r.rect[0]<=nx&&r.rect[2]>=nx&&r.rect[1]<=ny&&r.rect[3]>=ny).sort((a,b)=>Math.abs((a.rect[1]+a.rect[3])/2-ny)-Math.abs((b.rect[1]+b.rect[3])/2-ny))[0]||point(nx,ny);
 }
 function marks(){
  const box=$('marks');box.replaceChildren();const current=state.annotations.filter(a=>a.anchor.version===state.version&&a.anchor.page===state.page);
  if(!current.length)return;const label=document.createElement('p');label.textContent='この頁の割当';box.append(label);
  current.forEach(a=>{const b=document.createElement('button');b.className='pin';b.dataset.source=a.key;b.textContent=catalog[a.key].label+' · '+a.anchor.quote;b.title=b.textContent;b.setAttribute('aria-label',catalog[a.key].label+'の割当先を変更');b.setAttribute('aria-pressed',String(state.selected===a.key));box.append(b);});
  highlight(entry(state.selected)?.anchor.version===state.version&&entry(state.selected)?.anchor.page===state.page?entry(state.selected).anchor.rect:null);
 }
 function highlight(rect){const el=$('pdf-highlight');el.hidden=!rect;if(rect){el.style.left=rect[0]*100+'%';el.style.top=rect[1]*100+'%';el.style.width=(rect[2]-rect[0])*100+'%';el.style.height=(rect[3]-rect[1])*100+'%';}}
 function reveal(key){
  const a=entry(key);pendingReveal=null;
  if(!a||state.selected!==key||a.anchor.version!==state.version||a.anchor.page!==state.page||document.querySelector('dialog[open]'))return;
  if($('page-image').hidden){pendingReveal=key;return;}
  const scroll=$('script-scroll'),image=$('page-image').getBoundingClientRect(),frame=scroll.getBoundingClientRect();
  scroll.scrollTop+=image.top-frame.top+(a.anchor.rect[1]+a.anchor.rect[3])/2*image.height-frame.height/2;
  document.querySelector('[data-pdf-surface]')?.focus({preventScroll:true});highlight(a.anchor.rect);
 }
 ensureUi();$('open-pdf').onclick=open;$('pdf-close').onclick=close;$('pdf-cancel').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});$('pdf-file').onchange=prepare;$('pdf-retry').onclick=prepare;$('pdf-apply').onclick=commit;
 $('pdf-text-assign').onclick=()=>{if(!state.pending){say('先に割当道具から項目を選んでください。');return;}const id=$('pdf-text-choice').value,row=id==='point-center'?point(.5,.5):rows().find(r=>r.id===id);if(row){const key=state.pending;assign(key,row);$('pdf-text-controls').open=false;reveal(key);}};
 $('pdf-position-assign').onclick=()=>{if(!state.pending){say('先に割当道具から項目を選んでください。');return;}const key=state.pending;assign(key,point(.5,.5));reveal(key);};
 globalThis.LocalPDF={display,hit,marks,highlight,reveal,restoreAssets,assets(){return Array.from(docs.entries(),([id,d])=>({id,label:fixture.versions[id]?.label||d.file.name,name:d.file.name,type:d.file.type,lastModified:d.file.lastModified,file:d.file}));},reset(){viewEpoch++;pendingReveal=null;$('paper').classList.remove('local-pdf');$('paper').style.aspectRatio='420/595';$('page-image').hidden=false;$('pdf-page-help').hidden=true;$('pdf-page-help').classList.remove('position-only');$('pdf-text-controls').hidden=true;$('pdf-position-controls').hidden=true;highlight(null);}};
 if(!document.querySelector('script[data-script-cue-storage]')){
  const storage=document.createElement('script');
  storage.src='script-cue-storage.js?v=1';
  storage.dataset.scriptCueStorage='true';
  document.head.append(storage);
 }
})();
