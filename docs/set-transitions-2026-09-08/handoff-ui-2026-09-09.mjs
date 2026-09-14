import {VERSION,DEFAULTS,PRESETS,Trial,makePlan,PEOPLE} from './handoff-core-2026-09-09.mjs?v=handoff-2026-09-09-r3';
const $=id=>document.getElementById(id),EXPECTED='handoff-2026-09-09-r3';
if(VERSION!==EXPECTED||document.documentElement.dataset.version!==EXPECTED)throw new Error('版が揃っていません。再読み込みしてください。');
let config={...DEFAULTS},trial=new Trial(makePlan(config)),undo=[],error='',priorPrintOpen=false;
const fields={'after-left':'left','after-right':'right','handoff-mode':'mode','platform-seconds':'platformSeconds','travel-seconds':'travelSeconds','put-seconds':'putSeconds','pickup-seconds':'pickupSeconds','return-B':'returnB'};
const personName=p=>PEOPLE[p]|| (p==='candidate'?'候補B/C（未確定）':'未定');
const sec=ms=>(ms/1000).toLocaleString('ja-JP',{maximumFractionDigits:1})+'秒';
const names=people=>people.length?people.map(personName).join('・'):'担当は離れる';
function create(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
function syncFields(){for(const [id,key] of Object.entries(fields)){const el=$(id);if(el.type==='checkbox')el.checked=config[key];else el.value=config[key]??'';}}
function change(next,preset='custom'){try{const newTrial=new Trial(makePlan(next));undo.push({config:{...config},preset:$('preset').dataset.active||'normal'});config={...next};trial=newTrial;error='';$('preset').value=preset;$('preset').dataset.active=preset;syncFields();render();}catch(e){error=e.message;render();}}
function summary(){if(!trial.started)return'開始前';if(trial.paused)return'全体を一時停止';if(trial.done)return'今回の試し：全作業が終了';if(trial.ready)return'担当の準備完了 / 明示的な再開待ち';if(trial.snapshot().issues.some(i=>i.kind==='conflict'||i.kind==='cycle'||i.kind==='unknown'))return'進めない工程があります';return'試し進行中';}
function render(){const snap=trial.snapshot();$('configuration-error').hidden=!error;$('configuration-error').textContent=error;
 $('scenario-description').textContent=config.mode==='direct'?`A・Bが机を持って待ち、${names([config.left,config.right])}へ担当を渡します。`:`机を置いた後は、${names([config.left,config.right])}が運ぶ例です。`;
 $('handoff-time').value=sec(trial.time);$('handoff-status').textContent=summary();$('start-handoff').disabled=!!error||trial.started;$('start-handoff').textContent=trial.started?'Q12で開始済み':'Q12を想定して開始';
 const disabled=!!error||!trial.started||trial.paused||trial.done;
 $('plus-one').disabled=disabled;$('next-boundary').disabled=disabled||!trial.plan.nodes.some(n=>n.kind==='timed'&&trial.status[n.id].state==='active');$('pause-handoff').disabled=!!error||!trial.started||trial.done;$('pause-handoff').textContent=trial.paused?'全体の一時停止を解除':'全体を一時停止';$('try-cue').disabled=disabled||trial.finished('cue');$('undo-config').disabled=!undo.length;
 $('return-B').disabled=config.mode==='direct'||![config.left,config.right].includes('B');$('put-seconds').disabled=config.mode==='direct';
 const attempted=trial.log.some(l=>l.kind==='early');$('try-cue').textContent=trial.ready?(attempted?'条件が揃ったとして試しを再開':'Q13を想定して試しを再開'):'Q13が来たとしてみる';
 $('cue-reason').textContent=!trial.started?'Q12を想定して開始してください。':trial.paused?'時計と合図操作を止めています。':trial.finished('cue')?'この試しでは机の後半を開始済みです。':trial.ready?(attempted?'準備が揃いました。早い合図では自動再開せず、ここで試しの再開を選びます。':'担当とセットの準備が揃いました。Q13を想定すると机の後半が始まります。'):trial.cueReason();
 const activeTable=trial.plan.nodes.filter(n=>n.target==='table'&&trial.status[n.id].state==='active');
 const tableText=!trial.started?'机：開始前':trial.finished('table-out')?'机：下手袖へ到着':activeTable.length?'机：'+activeTable.map(n=>n.label).join(' / '):'机：次の工程を確認中';
 $('table-state').textContent=tableText+(trial.paused?'（全体一時停止）':'');
 const crew=[...new Set(activeTable.flatMap(n=>n.people))];
 $('table-crew-label').textContent=!trial.started?'A・B':trial.finished('table-out')?'この工程は終了':crew.length?names(crew):activeTable.some(n=>n.id==='old-wait')?'担当は離れる':'工程を確認中';
 $('moving-table').setAttribute('transform',`translate(${snap.positions.table} 125)`);$('moving-platform').setAttribute('transform',`translate(${snap.positions.platform} 225)`);
 $('trial-estimate').textContent=trial.done?`今回の試しは${sec(trial.time)}で終了`:trial.plan.nodes.some(n=>n.ms===null)?'所要未定の工程と、合図待ちを含みます。':'合図待ちの長さは未定です。';
 $('trial-issues').hidden=!snap.issues.length;$('issue-list').replaceChildren(...snap.issues.map(i=>create('li',i.text)));
 const filter=$('person-view').value;$('print-scope').textContent='表示範囲：'+(filter==='all'?'全員':filter);
 $('person-list').replaceChildren(...snap.people.filter(r=>filter==='all'||r.person===filter).map(row=>{const box=create('div','', 'person');box.dataset.person=row.person;box.append(create('h3',row.person));
  const hasWork=trial.plan.nodes.some(n=>n.people.includes(row.person));const current=!hasWork?'この例では登録作業なし':row.active.length?row.active.join(' / '):row.issues.length?'進めない担当作業あり':!trial.started?'開始前':row.next.length?'次の登録作業を待つ':'今回の登録作業は終了';
  box.append(create('p',current+(trial.paused&&row.active.length?'（全体一時停止）':'')));
  if(row.next.length)box.append(create('p','次：'+row.next[0],'small muted'));else box.append(create('p','他の予定は未確認','small muted'));
  if(row.issues.length)box.append(create('p',row.issues.join(' '),'small'));return box;
 }));
 $('cue-log').replaceChildren(...(trial.log.length?trial.log.map(l=>create('li',sec(l.time)+' / '+l.text)):[create('li','まだ合図を想定していません。')]));
 $('sequence-condition').textContent=trial.done?'今回の登録作業がすべて終了。次の手順へ進める状態です。':'机の準備と合図を確認してから後半へ。全作業が終わるまでは次の手順へ進みません。';
 const label=id=>trial.by.get(id)?.label||'参照先なし';
 $('segment-rows').replaceChildren(...trial.plan.nodes.filter(n=>filter==='all'||n.people.includes(filter)||n.people.some(p=>!PEOPLE[p])).map(n=>{const s=trial.status[n.id],row=document.createElement('tr');row.dataset.segment=n.id;if(s.state==='active')row.className='active';
  const condition=(n.deps.length?n.deps.map(label).join(' ＋ ')+' の終了後':'Q12で開始')+(n.kind==='wait'?' / 待つ先：'+(n.until.length?n.until.map(label).join(' ＋ '):'なし'):n.kind==='cue'?' / Q13を想定して明示的に再開':'');
  const blocked=snap.issues.filter(i=>i.ids?.includes(n.id)).map(i=>i.text);const state=s.state==='done'?`終了 ${sec(s.end)}`:s.state==='active'?(trial.paused?'全体一時停止 / ':'')+(n.kind==='cue'?'Q13待ち':n.kind==='wait'?'待機中':'進行中'):`未開始${blocked.length?' / '+blocked.join(' '):''}`;
  const values=[n.label,names(n.people),condition,n.kind==='timed'?(n.ms===null?'未定':sec(n.ms)):n.kind==='cue'?'合図待ち：未定':'前提工程が終わるまで',state];
  values.forEach((value,i)=>{const td=create('td',value);td.dataset.label=['工程','担当','始まる条件 / 待つ先','仮の所要','今回の状態'][i];row.append(td);});return row;
 }));
}
for(const [id,key] of Object.entries(fields))$(id).addEventListener('change',()=>{const el=$(id),next={...config};next[key]=el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?null:Number(el.value)):el.value;if(next.mode==='direct'||![next.left,next.right].includes('B'))next.returnB=false;change(next);});
$('preset').addEventListener('change',()=>change({...DEFAULTS,...PRESETS[$('preset').value]},$('preset').value));
$('undo-config').onclick=()=>{if(!undo.length)return;const old=undo.pop();config=old.config;trial=new Trial(makePlan(config));error='';$('preset').value=old.preset;$('preset').dataset.active=old.preset;syncFields();render();};
$('start-handoff').onclick=()=>{if(!error){trial.start();render();}};$('plus-one').onclick=()=>{trial.advance(1);render();};$('next-boundary').onclick=()=>{trial.next();render();};$('try-cue').onclick=()=>{trial.cue();render();};$('reset-handoff').onclick=()=>{trial.reset();render();};$('pause-handoff').onclick=()=>{if(trial.started&&!trial.done){trial.paused=!trial.paused;render();}};$('person-view').onchange=render;
window.addEventListener('beforeprint',()=>{priorPrintOpen=$('sequence').open;$('sequence').open=true;});window.addEventListener('afterprint',()=>{$('sequence').open=priorPrintOpen;});$('print-handoff').onclick=()=>window.print();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&trial.started&&!trial.done){trial.paused=true;render();}});
for(const el of document.querySelectorAll('button,select,input'))el.disabled=false;
$('preset').dataset.active='normal';syncFields();$('load-error').hidden=true;render();
