'use strict';
const $=id=>document.getElementById(id);
const sceneCatalog={scene4:{label:'シーン4',detail:'二人が中央へ',subject:{kind:'sceneRef',id:'fixture-scene-4'}}};
let catalog={};
const initialCues=[{id:'fixture-cue-lx-12',key:'lx12',number:'LX 12',type:'照明',description:'照明を落とす',trigger:'',assignee:'',note:''}];
const state={cues:structuredClone(initialCues),attentionOnly:false,version:'original',page:0,annotations:[],selected:null,pending:null,mode:'with',left:true,right:true,side:'right',zoom:false,scene:3};
let fixture,history=[],lastPage='',drag=null,suppressClick=false;
const snapshot=()=>structuredClone({cues:state.cues,version:state.version,page:state.page,annotations:state.annotations,selected:state.selected});
const say=text=>{$('status').textContent=text;};
const entry=key=>state.annotations.find(a=>a.key===key);
const rows=()=>fixture.versions[state.version].pages[state.page].rows;
function assignmentStatus(key){
 const a=entry(key);if(!a)return 'missing';
 const page=fixture.versions[state.version].pages[a.anchor.page];
 return a.anchor.version===state.version&&page?.rows.some(r=>r.id===a.anchor.rowId)?'assigned':'review';
}
function renderHealth(){
 const keys=Object.keys(catalog),missing=keys.filter(k=>assignmentStatus(k)==='missing'),review=keys.filter(k=>assignmentStatus(k)==='review');
 const unresolved=missing.length+review.length,health=$('assignment-health');health.hidden=state.mode!=='with';health.classList.toggle('has-issues',unresolved>0);
 $('health-icon').hidden=!unresolved;
 const summary=unresolved?[missing.length?'未割当 '+missing.length+'件':'',review.length?'要付替え '+review.length+'件':''].filter(Boolean).join(' / '):'割当済み '+keys.length+' / '+keys.length+'件';
 if($('health-summary').textContent!==summary)$('health-summary').textContent=summary;
 $('check-missing').disabled=!unresolved;$('check-missing').setAttribute('aria-label','未割当・要付替えの対象を見る');
 $('attention-filter').setAttribute('aria-pressed',String(state.attentionOnly));$('no-missing').hidden=!(state.attentionOnly&&!unresolved);
 document.querySelectorAll('#menu [data-source]').forEach(b=>{const needs=assignmentStatus(b.dataset.source)!=='assigned';b.hidden=state.attentionOnly&&!needs;b.classList.toggle('needs-attention',needs);});
 $('count').textContent='割当対象 '+keys.length+'件';
}
function syncCatalog(){
 catalog={...sceneCatalog,...Object.fromEntries(state.cues.map(c=>[c.key,{label:c.number,detail:c.description,subject:{kind:'cueRef',id:c.id}}]))};
 const box=$('tool-items');const wanted=Object.keys(catalog);
 box.querySelectorAll('[data-source]').forEach(b=>{if(!wanted.includes(b.dataset.source))b.remove();});
 for(const [index,key] of wanted.entries()){let b=Array.from(box.children).find(b=>b.dataset.source===key);if(!b){b=document.createElement('button');b.className='source';b.dataset.source=key;b.append(document.createElement('strong'),document.createElement('span'),document.createElement('small'));b.lastChild.dataset.assigned=key;}
 b.querySelector('strong').textContent=catalog[key].label;b.querySelector('span').textContent=catalog[key].detail;if(box.children[index]!==b)box.insertBefore(b,box.children[index]||null);}
}
function render(){if(!fixture)return;syncCatalog();layout();renderPage();renderMarks();renderHealth();syncSelection();$('undo').disabled=!history.length;$('version').value=state.version;$('open-q-sheet').disabled=false;document.dispatchEvent(new Event('fixture-render'));
 const active=document.activeElement;if($('app').contains(active)&&!active.getClientRects().length)(!$('script').hidden?$('close-script'):$('open-tools')).focus({preventScroll:true});
}
function layout(){
 const w=$('workspace').clientWidth,small=w<760,rw=Math.min(500,Math.max(380,innerWidth*.34));
 let left=state.left,right=state.mode==='with'&&state.right;
 if(left&&right&&w<72+240+rw+360){if(state.side==='left')right=false;else left=false;}
 const hideStage=small&&(left||right),handle=state.mode==='with'&&!right&&!small;
 $('menu').hidden=!left;$('script').hidden=!right;$('stage').hidden=hideStage;$('right-handle').hidden=!handle;
 $('tool-instruction').textContent=left&&right?'すぐ右の台詞へドラッグ、または項目を選択。':'項目を選ぶと台本が開きます。';
 $('workspace').style.setProperty('--lw',left?(small?w-72:240)+'px':'0px');$('workspace').style.setProperty('--rw',right?(small?w-72:rw)+'px':handle?'44px':'0px');
 $('workspace').classList.toggle('single-left',small&&left);$('workspace').classList.toggle('single-right',small&&right);
 $('mode-with').setAttribute('aria-pressed',String(state.mode==='with'));$('mode-without').setAttribute('aria-pressed',String(state.mode==='without'));
 $('open-tools').setAttribute('aria-expanded',String(left));$('open-script').setAttribute('aria-expanded',String(right));
 $('workspace-state').textContent=(state.mode==='with'?'台本あり':'台本なし')+' / 押出式';
 const active=document.activeElement;if($('app').contains(active)&&!active.getClientRects().length)(right?$('close-script'):$('open-tools')).focus({preventScroll:true});
}
function renderPage(){
 const k=state.version+':'+state.page;$('paper').classList.toggle('zoom',state.zoom);$('zoom').setAttribute('aria-pressed',String(state.zoom));$('zoom').textContent=state.zoom?'標準幅':'拡大';
 $('page-label').textContent=(state.page+1)+' / 2頁';$('previous').disabled=state.page===0;$('next').disabled=state.page===1;
 if(k===lastPage)return;lastPage=k;
 $('page-image').src=fixture.versions[state.version].pages[state.page].image;
 $('page-image').alt=fixture.versions[state.version].label+' '+(state.page+1)+'頁。本文は各行のボタンでも読めます。';
 $('row-overlay').replaceChildren();
 rows().forEach(row=>{const b=document.createElement('button');b.className='row-target';b.dataset.row=row.id;b.setAttribute('aria-label','割当先：'+row.text);b.style.top=(row.rect[1]*100)+'%';b.onclick=()=>{if(state.pending)assign(state.pending,row);else say('先に割当道具のシーンかキューを選ぶと、この台詞へ割り当てられます。');};$('row-overlay').append(b);});
 $('script-scroll').scrollTop=0;$('script-scroll').scrollLeft=0;
}
function renderMarks(){
 $('marks').replaceChildren();
 rows().forEach(row=>{const a=state.annotations.filter(a=>a.anchor.version===state.version&&a.anchor.page===state.page&&a.anchor.rowId===row.id);if(!a.length)return;
 const group=document.createElement('div');group.className='row-labels';group.style.top='calc('+row.rect[3]*100+'% + 16px)';
 a.forEach(a=>{const b=document.createElement('button');b.className='pin';b.dataset.source=a.key;b.dataset.annotation=a.id;b.textContent=catalog[a.key].label;b.title=catalog[a.key].label;b.setAttribute('aria-label',catalog[a.key].label+'の割当先を変更');b.setAttribute('aria-pressed',String(state.selected===a.key));group.append(b);});$('marks').append(group);});
 const unresolved=state.annotations.filter(a=>assignmentStatus(a.key)==='review'),tray=$('review-tray');tray.hidden=!unresolved.length;tray.replaceChildren();
 if(unresolved.length){const p=document.createElement('p');p.textContent='要付替え '+unresolved.length+'件。項目を選び、新しい台詞へ置きます。';tray.append(p);const div=document.createElement('div');div.className='tools';unresolved.forEach(a=>{const b=document.createElement('button');b.dataset.source=a.key;b.className='pin';b.textContent=catalog[a.key].label;b.title='元の位置：'+fixture.versions[a.anchor.version].label+' '+(a.anchor.page+1)+'頁 '+a.anchor.quote;div.append(b);});tray.append(div);}
 document.querySelectorAll('[data-assigned]').forEach(el=>{const a=entry(el.dataset.assigned);el.textContent=a?(assignmentStatus(a.key)==='assigned'?'割当済み：'+(a.anchor.page+1)+'頁':'要付替え：'+fixture.versions[a.anchor.version].label+'の位置'):'未割当';});
}
function syncSelection(){
 document.querySelectorAll('[data-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.source===state.selected)));
 const a=entry(state.selected),item=catalog[state.selected];let label=item?item.label+'「'+item.detail+'」':'シーンやキューを台詞に割り当てます。';
 if(a)label+=' / '+(a.anchor.version===state.version?'割当先：':'元の割当先：')+(a.anchor.page+1)+'頁「'+a.anchor.quote+'」';
 $('selected-detail').textContent=label;$('left-detail').textContent=item?label:'同じ項目をもう一度置くと、割当先を変更します。';
 $('show-scene').hidden=state.selected!=='scene4';$('show-scene-left').hidden=state.selected!=='scene4';
 $('pending').hidden=!state.pending;$('pending-label').textContent=state.pending?catalog[state.pending].label+'を持っています。台詞を押して置く。':'';
 $('paper').classList.toggle('armed',!!state.pending||!!(drag&&drag.active));
}
function choose(key){cancelDrag();state.selected=key;state.pending=key;state.mode='with';state.right=true;state.side='right';render();say(catalog[key].label+'の割当先を選んでください。台詞を押すか、ドラッグして置けます。');}
function assign(key,row){
 const old=entry(key);if(old&&old.anchor.version===state.version&&old.anchor.page===state.page&&old.anchor.rowId===row.id){state.pending=null;syncSelection();say('同じ台詞です。割当はそのままです。');return;}
 history.push(snapshot());const annotation={id:old?.id||crypto.randomUUID(),key,subject:structuredClone(catalog[key].subject),anchor:{version:state.version,page:state.page,rowId:row.id,quote:row.text,rect:[...row.rect]},meaningReview:'unconfirmed'};
 if(old)state.annotations=state.annotations.map(a=>a.id===old.id?annotation:a);else state.annotations.push(annotation);
 state.selected=key;state.pending=null;render();say(catalog[key].label+'を「'+row.text+'」へ'+(old?'付け直しました。':'割り当てました。')+' 元に戻すことができます。');
}
function cancelDrag(message){
 if(!drag)return;const d=drag;drag=null;try{if(d.source.hasPointerCapture(d.id))d.source.releasePointerCapture(d.id);}catch{}
 $('ghost').hidden=true;$('workspace').classList.remove('dragging');document.querySelectorAll('.candidate').forEach(el=>el.classList.remove('candidate'));syncSelection();if(d.active&&message)say(message);
}
function clearPending(){cancelDrag('ドラッグを取り消しました。割当は変わりません。');state.pending=null;syncSelection();}
function setMode(mode){clearPending();state.mode=mode;if(mode==='with'){state.right=true;state.side='right';}render();say(mode==='with'?'台本へ戻りました。割当と頁を保持しています。':'台本を隠しました。割当は保持しています。');}
function showScene(){clearPending();state.scene=4;$('scene-title').textContent='シーン4：二人が中央へ';$('people').setAttribute('transform','translate(0 0)');$('stage-title').textContent='二人が舞台中央に立つ仮の配置';$('scene-strip').innerHTML='表示中<strong>シーン4</strong>二人が中央へ';if($('workspace').clientWidth<760){state.left=false;state.right=false;}render();say('シーン4を舞台で表示しました。合図の実行はありません。');}
$('attention-filter').onclick=()=>{clearPending();state.attentionOnly=!state.attentionOnly;render();};
$('check-missing').onclick=()=>{clearPending();state.attentionOnly=true;state.left=true;state.side='left';render();const first=document.querySelector('#menu [data-source]:not([hidden])');first?.focus({preventScroll:true});say('未割当・要付替えの項目を表示しています。項目を台詞へ置いてください。');};
$('mode-with').onclick=()=>setMode('with');$('mode-without').onclick=()=>setMode('without');$('left-without').onclick=()=>setMode('without');
$('open-tools').onclick=()=>{clearPending();state.left=$('menu').hidden;state.side='left';render();};
$('close-menu').onclick=()=>{clearPending();state.left=false;state.side='right';render();$('open-tools').focus();};
function openScript(){clearPending();state.mode='with';state.right=true;state.side='right';render();}
$('open-script').onclick=openScript;$('right-handle').onclick=openScript;
$('close-script').onclick=()=>{clearPending();state.right=false;if($('menu').hidden)state.left=false;render();$('open-script').focus();say('台本を畳みました。割当は保持しています。');};
$('view-stage').onclick=()=>{clearPending();state.left=false;state.right=false;render();say('現在の舞台を表示しています。');};
$('cancel-pick').onclick=()=>{clearPending();say('項目の選択を取り消しました。割当は変わりません。');};
$('show-scene').onclick=showScene;$('show-scene-left').onclick=showScene;
$('version').onchange=e=>{clearPending();const version=e.target.value;if(version===state.version)return;history.push(snapshot());state.version=version;render();say(fixture.versions[version].label+'を表示しました。以前の割当は要付替えとして残ります。');};
$('zoom').onclick=()=>{cancelDrag('表示変更のためドラッグを取り消しました。');state.zoom=!state.zoom;render();};
function page(n){cancelDrag('頁変更のためドラッグを取り消しました。');state.page=n;render();}
$('previous').onclick=()=>page(0);$('next').onclick=()=>page(1);
$('undo').onclick=()=>{clearPending();const old=history.pop();if(!old)return;Object.assign(state,old);render();say('直前の割当・付替え・版の変更を戻しました。');};
document.addEventListener('click',e=>{const source=e.target.closest('[data-source]');if(!source)return;if(suppressClick){e.preventDefault();return;}choose(source.dataset.source);});
document.addEventListener('pointerdown',e=>{
 const source=e.target.closest('[data-source]');if(!source||e.button!==0||!e.isPrimary||$('script').hidden)return;
 drag={source,id:e.pointerId,key:source.dataset.source,x:e.clientX,y:e.clientY,active:false,candidate:null};source.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId)return;const d=drag;
 if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<6)return;
 if(!d.active){d.active=true;$('workspace').classList.add('dragging');syncSelection();}
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-row]');d.candidate=target?.dataset.row||null;
 document.querySelectorAll('[data-row]').forEach(b=>b.classList.toggle('candidate',b===target));
 const ghost=$('ghost');ghost.hidden=false;ghost.textContent=catalog[d.key].label+(d.candidate?' → '+rows().find(r=>r.id===d.candidate).text:' → 台詞へ置く');
 ghost.style.left=Math.max(8,Math.min(e.clientX+16,innerWidth-ghost.offsetWidth-8))+'px';ghost.style.top=Math.max(8,Math.min(e.clientY+16,innerHeight-ghost.offsetHeight-8))+'px';
});
document.addEventListener('pointerup',e=>{
 if(!drag||drag.id!==e.pointerId)return;const d=drag;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-row]');const row=rows().find(r=>r.id===target?.dataset.row);
 if(d.active){suppressClick=true;setTimeout(()=>suppressClick=false,0);}cancelDrag();if(d.active){if(row)assign(d.key,row);else say('台詞の外なので取り消しました。割当は変わりません。');}
});
document.addEventListener('pointercancel',()=>cancelDrag('ドラッグを取り消しました。割当は変わりません。'));
document.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)cancelDrag('ドラッグを取り消しました。割当は変わりません。');});
document.addEventListener('keydown',e=>{if(e.isComposing||$('q-sheet')?.open)return;if(e.key==='Escape'){if(drag||state.pending){clearPending();say('取り消しました。割当は変わりません。');}return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey&&!e.target.closest('input,textarea,select')){e.preventDefault();$('undo').click();}});
window.addEventListener('blur',()=>cancelDrag('画面を離れたためドラッグを取り消しました。'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDrag();});
window.addEventListener('resize',()=>{cancelDrag('幅が変わったためドラッグを取り消しました。');layout();});
fetch('fixtures/manifest.json').then(r=>{if(!r.ok)throw new Error('fixture');return r.json();}).then(data=>{fixture=data;$('people').setAttribute('transform','translate(0 55)');render();say('割当道具のシーンかキューを台詞へ置いてみてください。');}).catch(()=>{say('仮台本を読み込めませんでした。ローカルサーバーから開き直してください。');document.querySelectorAll('button,select').forEach(b=>b.disabled=true);});
