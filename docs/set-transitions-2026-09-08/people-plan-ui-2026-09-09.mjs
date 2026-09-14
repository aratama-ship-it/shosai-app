import {VERSION,DEFAULTS,configurePlan,analyzePlan,formatSeconds} from './people-plan-core-2026-09-09.mjs?v=people-plan-2026-09-09-r2';
const UI_VERSION='people-plan-2026-09-09-r2';
const FIXTURE_HASH='5ed6105f7b35008a89223f038d34f807a99177a166225eae6aaa8a18ef5bb2e7';
const $=id=>document.getElementById(id), esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields=[['appearance','appearanceEndMs','Aの出番終了',0,20000],['put','putMs','机を置く所要',100,20000],['q13','q13Ms','Q13の予定時刻',0,60000],['deadline','deadlineMs','搬出の締切',0,60000]];
const shortNames={'appearance-A':'出番','walk-A':'歩く',carry:'運ぶ',put:'置く','hold-A':'待つ',platform:'平台','walk-C':'歩く',pickup:'持直し','cue-wait':'合図待ち',exit:'搬出','walk-B':'歩く','job-B':'別作業','wait-A':'待つ','wait-B':'待つ','wait-C':'待つ',extra:'追加'};
const ownerNames={script:'台本',transition:'転換',personal:'個人予定'};
const codes={overlap:'担当の重複',compatibility:'同時作業を要確認',shortfall:'入力上の不足',reserve:'予備時間の不足',assignment:'担当未定',time:'時刻を要確認','window-unknown':'転換時間は未確定'};
let fixture,current={...DEFAULTS},history=[],analysis,documentPlan,selected=[],invalidDraft=false;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const personName=id=>analysis.people.find(p=>p.id===id)?.name||id;
const crewText=r=>[...r.personIds.map(personName),...(r.crewUnknown?['担当未定']:[])].join(' / ')||'担当未定';
function intervalText(r) {
  if(r.state==='invalid')return '時刻を要確認';
  if(r.state!=='known')return `${r.start===null?'開始未定':`${formatSeconds(r.start)}秒`}〜${r.end===null?'終了未定':`${formatSeconds(r.end)}秒`}（未確定）`;
  const range=`${formatSeconds(r.start)}〜${formatSeconds(r.end)}秒`;
  return `${range}（${r.start===r.end&&r.kind==='wait'?'待機なし':`${formatSeconds(r.end-r.start)}秒`}）`;
}
const intervalMarkup=r=>esc(intervalText(r)).replace(/開始未定|終了未定|（未確定）/g,word=>`<span class="keep">${word}</span>`);
function writeFields(){for(const [id,key] of fields)$(id).value=current[key]===null?'':formatSeconds(current[key]);$('extra').value=current.extra;$('join').value=current.join;}
function parseFields() {
  const next={...current},errors=[];
  for(const [id,key,label,lo,hi] of fields) {
    const raw=$(id).value.trim();let value=null,error=false;
    if(raw!=='') {
      error=!/^\d+(?:\.\d)?$/.test(raw);value=Math.round(Number(raw)*1000);
      error=error||!Number.isSafeInteger(value)||value<lo||value>hi;
    }
    $(id).setAttribute('aria-invalid',String(error));
    if(error)errors.push(`${label}は${formatSeconds(lo)}〜${formatSeconds(hi)}秒を0.1秒単位で入力してください。空欄は未定です。`);
    else next[key]=value;
  }
  next.extra=$('extra').value;next.join=$('join').value;
  if(errors.length)throw new Error(errors.join(' '));
  return next;
}
function clearError(){invalidDraft=false;$('input-error').hidden=true;for(const [id] of fields)$(id).removeAttribute('aria-invalid');}
function commit(next,write=false) {
  if(!same(current,next)){history.push({...current});if(history.length>20)history.shift();current={...next};}
  clearError();selected=[];if(write)writeFields();render();
}
function update(){try{commit(parseFields());}catch(error){invalidDraft=true;document.documentElement.dataset.state='invalid-input';$('input-error').textContent=`入力を確認してください。予定図と判定を保留しています。${error.message}`;$('input-error').hidden=false;$('results').hidden=true;$('undo').disabled=false;}}
function table(rows,selectable=false) {
  return `<table class="steps"><thead><tr><th>予定</th><th>担当</th><th>時刻と所要（Q12基準）</th><th>元の予定</th></tr></thead><tbody>${rows.map(r=>`<tr data-row="${esc(r.id)}" class="${selected.includes(r.id)?'selected':''}"><td data-label="予定"><strong>${esc(r.label)}</strong>${selectable?`<br><button type="button" data-activity="${esc(r.id)}" aria-label="${esc(r.label)}の詳細を見る">詳細を見る</button>`:''}</td><td data-label="担当">${esc(crewText(r))}</td><td class="time" data-label="時刻と所要">${intervalMarkup(r)}${r.reasons.length?`<br><span class="hint">${esc(r.reasons.join(' / '))}</span>`:''}</td><td data-label="元の予定">${esc(ownerNames[r.owner?.kind]||'要確認')}</td></tr>`).join('')}</tbody></table>`;
}
function drawTimeline() {
  const scroll=$('timeline').scrollLeft,known=analysis.rows.filter(r=>r.state==='known'&&r.end>r.start);
  const markers=[['Q12',analysis.points.q12?.value],['Q13',analysis.points.q13?.value],['締切',analysis.points.deadline?.value]].filter(([,v])=>Number.isFinite(v));
  const min=Math.floor(Math.min(-4000,...known.map(r=>r.start))/5000)*5000;
  const max=Math.ceil(Math.max(15000,...known.map(r=>r.end),...markers.map(([,v])=>v))/5000)*5000;
  const x=t=>100+(t-min)*.048,width=Math.max(1000,x(max)+48),parts=[],groups=[],names=[];let y=48;
  for(const person of analysis.people) {
    const rows=known.filter(r=>r.personIds.includes(person.id)).sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id));
    const lanes=[];const entries=rows.map(r=>{let lane=lanes.findIndex(end=>end<=r.start);if(lane<0)lane=lanes.length;lanes[lane]=r.end;return {r,lane};});
    names.push(`<span style="position:absolute;right:16px;top:${y+8}px">${esc(person.name)}</span>`);
    for(const {r,lane} of entries) {
      const top=y+lane*52,rawWidth=x(r.end)-x(r.start),left=x(r.start)+1,w=Math.max(1,rawWidth-2),outline=r.kind==='travel'||r.kind==='wait',kind=outline?r.kind:'work',label=shortNames[r.id]||r.label;
      groups.push(`<g data-activity="${esc(r.id)}" data-person="${esc(person.id)}" class="${kind} ${selected.includes(r.id)?'selected':''}"><title>${esc(`${person.name}：${r.label} / ${intervalText(r)}`)}</title><rect class="selection" x="${left-4}" y="${top-4}" width="${w+8}" height="52" fill="none" stroke="#efe7d6" stroke-width="2"/><rect x="${left}" y="${top}" width="${w}" height="44" fill="${outline?'#201b16':'#efe7d6'}" stroke="#efe7d6" stroke-width="2"${r.kind==='wait'?' stroke-dasharray="4 4"':''}/>${w>=label.length*16+16?`<text x="${left+w/2}" y="${top+28}" text-anchor="middle">${esc(label)}</text>`:''}</g>`);
    }
    y+=Math.max(1,lanes.length)*52+24;
  }
  const height=y+32,step=max-min>40000?10000:5000;
  for(let t=min;t<=max;t+=step)parts.push(`<path d="M${x(t)} 38V${y}" stroke="#efe7d6" stroke-width="1" stroke-dasharray="2 6"/><text x="${x(t)}" y="26" text-anchor="middle">${formatSeconds(t)}秒</text>`);
  // Cue labels are outside the plot to avoid colliding with short-interval labels.
  for(const [label,t] of markers)parts.push(`<path d="M${x(t)} 38V${y}" stroke="#efe7d6" stroke-width="${label==='締切'?3:1}"${label==='締切'?'':' stroke-dasharray="8 6"'}/>`);
  $('timeline').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-description"><title id="chart-title">3人の予定、Q12からの秒数</title><desc id="chart-description">上からA、B、C。Aは演者兼裏方、BとCは裏方。作業、移動、担当を続けた待機を示します。重複する予定は別段に置き、全時刻は下の予定一覧から読めます。</desc>${parts.join('')}${groups.join('')}</svg><div class="person-rail" aria-hidden="true" style="position:sticky;left:0;width:92px;height:${height}px;margin-top:-${height}px;background:#201b16;pointer-events:none">${names.join('')}</div>`;
  $('timeline').scrollLeft=scroll;
}
function selectActivities(ids,message) {
  selected=ids.filter(id=>analysis.rows.some(r=>r.id===id));
  $('selection').innerHTML=`<h3>関連する予定</h3><p>${esc(message)}</p>${table(analysis.rows.filter(r=>selected.includes(r.id)))}<p class="hint">図では関連する帯を二重枠にしています。共同作業は各担当の行に同じ内容を表示します。</p><button type="button" id="clear-selection">選択を解除</button>`;
  $('selection').hidden=false;drawTimeline();$('activity-table').innerHTML=table(analysis.rows,true);
  $('clear-selection').addEventListener('click',()=>{selected=[];$('selection').hidden=true;drawTimeline();$('activity-table').innerHTML=table(analysis.rows,true);$('issues-title').setAttribute('tabindex','-1');$('issues-title').focus();});
  $('selection').focus();
}
function render() {
  documentPlan=configurePlan(fixture,current);analysis=analyzePlan(documentPlan);
  const w=analysis.windows[0],exit=analysis.rows.find(r=>r.id==='exit'),end=exit?.state==='known'?exit.end:null,deadline=analysis.points.deadline?.value??null;
  const comparison=w?.state!=='known'?'比較は未確定':w.shortfall>0?`入力上 ${formatSeconds(w.shortfall)}秒不足`:`余裕 ${formatSeconds(w.slack)}秒`;
  const conditional=analysis.hasUncertainty?'担当・時刻に確認事項があります。下の時間比較だけでは計画の成立を判断できません。':'表示した予定に担当の重複・未定はありません。実際の所要を確認した結果ではありません。';
  $('summary').innerHTML=`<dl class="metrics"><div><dt>机の搬出完了（Q12基準）</dt><dd data-metric="end">${formatSeconds(end)}${end===null?'':'秒'}</dd></div><div><dt>搬出の締切（Q12基準）</dt><dd data-metric="deadline">${formatSeconds(deadline)}${deadline===null?'':'秒'}</dd></div><div><dt>入力した所要だけの比較</dt><dd data-metric="comparison">${comparison}</dd></div></dl><p class="status">${conditional}</p><p class="hint">Q12＝0秒 / Q13＝${formatSeconds(analysis.points.q13?.value)}${analysis.points.q13?.value==null?'':'秒'}。余裕0秒は、予備時間がない状態です。</p>`;
  $('trial-note').hidden=!documentPlan.trialNotes?.length;$('trial-note').textContent=documentPlan.trialNotes?.join(' ')||'';
  drawTimeline();
  const unplaced=analysis.rows.filter(r=>r.state!=='known'||r.crewUnknown);
  $('unplaced').innerHTML=unplaced.length?`<h3>図だけでは確定できない予定</h3><ul class="small-list">${unplaced.map(r=>`<li><strong>${esc(r.label)}</strong>：${esc(crewText(r))} / ${intervalMarkup(r)}${r.crewUnknown?'。担当未定の枠は人物の行に置いていません。':''}</li>`).join('')}</ul>`:'';
  const issues=[...analysis.issues].sort((a,b)=>(a.code==='shortfall'?-1:0)-(b.code==='shortfall'?-1:0));
  $('issues').innerHTML=issues.length?`<ul class="issues">${issues.map(i=>`<li data-code="${esc(i.code)}"><p><span class="tag">${esc(codes[i.code]||'要確認')}</span><br>${esc(i.message)}</p>${i.activityIds.some(id=>analysis.rows.some(r=>r.id===id))?`<button type="button" data-issue="${esc(i.id)}" aria-label="${esc(i.message)} 関連する予定を見る">関連する予定を見る</button>`:''}</li>`).join('')}</ul>`:'<p>この入力では、不足・担当の重複・未定は見つかっていません。</p><p class="hint">上の「出番を4秒延ばす例」で不足、「Aの仕事が重なる例」で待機も含めた担当の重複を試せます。</p>';
  $('selection').hidden=true;$('activity-table').innerHTML=table(analysis.rows,true);
  $('undo').disabled=history.length===0;$('results').hidden=false;document.documentElement.dataset.state='ready';
}
export async function start() {
  if(VERSION!==UI_VERSION||document.documentElement.dataset.version!==UI_VERSION||typeof configurePlan!=='function'||typeof analyzePlan!=='function')throw new Error('Version mismatch');
  const response=await fetch(`./shared-contract-fixture-2026-09-09.json?v=${UI_VERSION}`,{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(`Fixture HTTP ${response.status}`);
  const bytes=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==FIXTURE_HASH)throw new Error('Fixture mismatch');
  fixture=JSON.parse(new TextDecoder().decode(bytes));
  if(analyzePlan(fixture).issues.length)throw new Error('Fixture invalid');
  for(const [id] of fields)$(id).addEventListener('change',update);
  for(const id of ['extra','join'])$(id).addEventListener('change',update);
  $('reset').addEventListener('click',()=>commit({...DEFAULTS},true));
  $('undo').addEventListener('click',()=>{if(invalidDraft){clearError();}else if(history.length)current=history.pop();selected=[];writeFields();render();});
  for(const button of document.querySelectorAll('[data-preset]'))button.addEventListener('click',()=>commit({...DEFAULTS,...({late:{appearanceEndMs:4000},overlap:{extra:'person-A'},unknown:{q13Ms:null}}[button.dataset.preset])},true));
  $('issues').addEventListener('click',event=>{const button=event.target.closest('[data-issue]');if(!button)return;const issue=analysis.issues.find(i=>i.id===button.dataset.issue);if(issue)selectActivities(issue.activityIds,issue.message);});
  $('activity-table').addEventListener('click',event=>{const button=event.target.closest('[data-activity]');if(button)selectActivities([button.dataset.activity],'選んだ予定の担当・時刻・記録元です。');});
  writeFields();render();$('load-status').hidden=true;$('editor').disabled=false;
}
