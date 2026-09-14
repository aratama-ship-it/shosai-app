// Standalone, fictional planning model. No product I/O or live cue execution.
export const VERSION = 'people-plan-2026-09-09-r2';
export const DEFAULTS = Object.freeze({appearanceEndMs:0,q13Ms:10000,deadlineMs:15000,putMs:2000,extra:'none',join:'person-C'});
const unique = xs => [...new Set(xs)];
const ms = n => Number.isSafeInteger(n) && Math.abs(n) <= 86400000;
const clone = value => structuredClone(value);

export function configurePlan(base, config) {
  const c = {...DEFAULTS,...config};
  for (const [key,lo,hi] of [['appearanceEndMs',0,20000],['q13Ms',0,60000],['deadlineMs',0,60000],['putMs',100,20000]]) {
    if (c[key] !== null && (!ms(c[key]) || c[key] < lo || c[key] > hi)) throw new Error(`Invalid input: ${key}`);
  }
  if (!['none','person-A','person-B','person-C','unresolved'].includes(c.extra) || !['person-C','unresolved'].includes(c.join)) throw new Error('Invalid assignment');
  const d = clone(base), point = id => d.points.find(p=>p.id===id);
  d.planContext.revision += 1;
  function setAnchor(id,value) {
    const p=point(id);p.revision+=1;
    p.expression=value===null?{kind:'unknown',reason:'入力が未定'}:{kind:'anchor',originId:'origin-q12',offsetMs:value};
  }
  setAnchor('appearance-end',c.appearanceEndMs);setAnchor('deadline',c.deadlineMs);
  const origin=d.origins.find(o=>o.id==='origin-q13');origin.offsetFromBaseMs=c.q13Ms;origin.revision+=1;
  const estimate=d.estimates.find(e=>e.id==='estimate-put-end');estimate.durationMs=c.putMs;estimate.revision+=1;
  if(c.putMs!==DEFAULTS.putMs) estimate.source='trial-manual-input';
  if(c.join==='unresolved') {
    const holding=d.activities.find(a=>a.id==='hold-A');holding.label='Aは机の担当を続けて交代相手を待つ';holding.revision+=1;
    for(const a of d.activities.filter(a=>['wait-C','pickup','cue-wait','exit'].includes(a.id))) {
      a.revision+=1;
      a.label=a.label.replaceAll('C','未定');
      for(const slot of a.assignments.filter(s=>s.personId==='person-C')) {slot.personId=null;slot.resolution='unresolved';}
    }
    d.trialNotes=['交代後の相手は未定です。到着条件と所要は元のCの仮値を残しています。担当・動線を確認した計画ではありません。'];
  }
  if(c.extra!=='none') {
    for(const [suffix,value] of [['start',6000],['end',9000]]) d.points.push({id:`extra-${suffix}`,revision:1,ownerRef:'extra',planContextId:d.planContext.id,expression:{kind:'anchor',originId:'origin-q12',offsetMs:value}});
    d.activities.push({id:'extra',revision:1,planContextId:d.planContext.id,owner:{kind:'personal',ownerId:'personal-demo',sourceUnitId:'extra'},kind:'work',label:'追加の別作業（6〜9秒に固定）',startPointId:'extra-start',endPointId:'extra-end',resourceMode:'exclusive',assignments:[{slotId:'extra-slot',personId:c.extra==='unresolved'?null:c.extra,resolution:c.extra==='unresolved'?'unresolved':'confirmed',sourceRef:null}]});
  }
  return d;
}

export function analyzePlan(doc) {
  const issues=[], issueKeys=new Set();
  const add=(code,message,activityIds=[],personIds=[],state='invalid')=>{
    const key=JSON.stringify([code,message,activityIds,personIds]);
    if(!issueKeys.has(key)){issueKeys.add(key);issues.push({id:`issue-${issues.length}`,code,message,activityIds:unique(activityIds),personIds:unique(personIds),state});}
  };
  const empty=()=>({rows:[],windows:[],issues,points:{},people:[],hasUncertainty:true});
  const collections=['points','activities','origins','estimates','people','cues','windows'];
  if(!doc || doc.kind!=='stage-people-time-contract-fixture' || doc.contractVersion!==1 || !doc.planContext?.id || collections.some(k=>!Array.isArray(doc[k])||doc[k].length>128)) {add('format','この試作で扱えない計画形式です。');return empty();}
  const context=doc.planContext.id, duplicate=new Set(), registry=new Map(), indexes={};
  for(const key of collections) {
    indexes[key]=new Map();
    for(const item of doc[key]) {
      if(!item || typeof item.id!=='string' || !item.id) {add('id','IDがない記録があります。');continue;}
      if(registry.has(item.id)){duplicate.add(item.id);add('duplicate',`IDが重複しています：${item.id}`,[item.id]);}
      registry.set(item.id,item);indexes[key].set(item.id,item);
    }
  }
  const {points,activities,origins,estimates,people,cues}=indexes;
  const get=(map,id)=>duplicate.has(id)?undefined:map.get(id);
  const owners=new Set([...activities.keys(),...origins.keys(),...indexes.windows.keys()]);
  const ownerActivities=id=>activities.has(id)?[id]:[];
  const badOrigins=new Set(), seenCues=new Map();
  for(const o of origins.values()) {
    if(!get(cues,o.cueId) || o.planContextId!==context || (o.offsetFromBaseMs!==null&&!ms(o.offsetFromBaseMs))) {badOrigins.add(o.id);add('origin',`合図の起点を確認できません：${o.id}`);}
    if(seenCues.has(o.cueId)) {badOrigins.add(o.id);badOrigins.add(seenCues.get(o.cueId));add('repeat-cue','同じ合図の反復は、この試作では扱えません。');}
    seenCues.set(o.cueId,o.id);
  }
  const base=get(origins,doc.planContext.baseOriginId);
  if(!base || base.offsetFromBaseMs!==0){for(const id of origins.keys())badOrigins.add(id);add('base-origin','基準の合図を0秒として確認できません。');}
  const cache=new Map(), visiting=new Set();
  const result=(value,state,reasons=[],criticalIds=[])=>({value,state,reasons:unique(reasons),criticalIds:unique(criticalIds)});
  const invalid=reason=>result(null,'invalid',[reason]);
  function resolve(id) {
    if(cache.has(id))return cache.get(id);
    const p=get(points,id);
    if(!p)return invalid(`時点の参照切れ：${id}`);
    if(visiting.has(id))return invalid(`時点が循環しています：${id}`);
    if(p.planContextId!==context)return invalid(`別の予定案の時点：${id}`);
    if(!owners.has(p.ownerRef)||duplicate.has(p.ownerRef))return invalid(`時点の所有元が未解決：${id}`);
    visiting.add(id);
    const e=p.expression||{},own=ownerActivities(p.ownerRef);let out;
    if(e.kind==='unknown') out=result(null,'unknown',[e.reason||'時点が未定']);
    else if(e.kind==='anchor') {
      const o=get(origins,e.originId);
      if(!o||badOrigins.has(e.originId)||!ms(e.offsetMs))out=invalid(`合図の起点・秒差が未解決：${id}`);
      else if(o.offsetFromBaseMs===null)out=result(null,'unknown',[`${get(cues,o.cueId)?.label||o.cueId}の時刻が未定`]);
      else out=result(o.offsetFromBaseMs+e.offsetMs,'known',[],own);
    } else if(e.kind==='after') {
      const source=resolve(e.pointId), est=get(estimates,e.estimateId);
      if(!est||est.planContextId!==context||!owners.has(est.ownerRef)||duplicate.has(est.ownerRef))out=invalid(`所要の参照が未解決：${id}`);
      else if(est.durationMs!==null&&(!ms(est.durationMs)||est.durationMs<0))out=invalid(`所要が無効：${id}`);
      else if(source.state==='invalid')out=source;
      else if(source.value===null||est.durationMs===null)out=result(null,'unknown',[...source.reasons,...(est.durationMs===null?['所要が未定']:[])]);
      else out=result(source.value+est.durationMs,'known',[],[...source.criticalIds,...own]);
    } else if(e.kind==='latest') {
      if(!Array.isArray(e.pointIds)||!e.pointIds.length||e.pointIds.length>128)out=invalid(`開始条件が無効：${id}`);
      else {
        const deps=e.pointIds.map(resolve);
        if(deps.some(d=>d.state==='invalid'))out=result(null,'invalid',deps.flatMap(d=>d.reasons));
        else if(deps.some(d=>d.value===null))out=result(null,'unknown',deps.flatMap(d=>d.reasons));
        else {const value=Math.max(...deps.map(d=>d.value));out=result(value,'known',[],[...deps.filter(d=>d.value===value).flatMap(d=>d.criticalIds),...own]);}
      }
    } else out=invalid(`時点の形式が無効：${id}`);
    if(out.value!==null&&!ms(out.value))out=invalid(`計算できる時刻の範囲を超えています：${id}`);
    visiting.delete(id);cache.set(id,out);return out;
  }
  const sourceUnits=new Set();
  const rows=doc.activities.filter(a=>a&&typeof a.id==='string').map(a=>{
    const start=resolve(a.startPointId),end=resolve(a.endPointId);
    let state=start.state==='invalid'||end.state==='invalid'?'invalid':start.value===null||end.value===null?'unknown':'known';
    const reasons=unique([...start.reasons,...end.reasons]);
    if(duplicate.has(a.id)||a.planContextId!==context){state='invalid';reasons.push('予定のIDまたは時間基準が未解決');}
    const source=JSON.stringify([a.owner?.kind,a.owner?.ownerId,a.owner?.sourceUnitId]);
    if(!a.owner?.kind||!a.owner?.ownerId||!a.owner?.sourceUnitId||sourceUnits.has(source)){state='invalid';reasons.push('予定の所有元が未解決または重複');}
    sourceUnits.add(source);
    if(start.value!==null&&end.value!==null&&(end.value<start.value||(end.value===start.value&&!['wait','note'].includes(a.kind)))){state='invalid';reasons.push('終了時刻または所要が無効');}
    const assignments=Array.isArray(a.assignments)?a.assignments:[],assigned=[],slotIds=new Set();let crewUnknown=false;
    if(!assignments.length){crewUnknown=true;add('assignment',`${a.label}：担当が未確定です。`,[a.id],[],'unknown');}
    for(const slot of assignments) {
      if(!slot?.slotId||slotIds.has(slot.slotId)){crewUnknown=true;add('slot',`${a.label}：担当枠が重複または未解決です。`,[a.id]);}
      slotIds.add(slot?.slotId);
      if(slot?.resolution!=='confirmed'||!get(people,slot?.personId)){crewUnknown=true;add('assignment',`${a.label}：担当が未確定です。`,[a.id],[],'unknown');continue;}
      if(assigned.includes(slot.personId)){crewUnknown=true;add('duplicate-person',`${a.label}：同じ人が2枠に入っています。`,[a.id],[slot.personId]);}
      assigned.push(slot.personId);
    }
    if(state!=='known')add('time',`${a.label}：${reasons.join(' / ')||'時刻が未定'}`,[a.id],unique(assigned),state);
    return {id:a.id,label:a.label,kind:a.kind,owner:a.owner,start:start.value,end:end.value,state,reasons,personIds:unique(assigned),crewUnknown,assignments,criticalIds:end.criticalIds,resourceMode:a.resourceMode};
  });
  // All mandatory branches must be valid, including earlier arrivals that do
  // not control a latest() time. Keep these separate from the critical path.
  function dependencyActivities(id,seen=new Set()) {
    if(seen.has(id))return [];seen.add(id);
    const p=get(points,id);if(!p)return [];
    const e=p.expression||{},ids=ownerActivities(p.ownerRef);
    if(e.kind==='after')ids.push(...dependencyActivities(e.pointId,seen),...ownerActivities(get(estimates,e.estimateId)?.ownerRef));
    if(e.kind==='latest'&&Array.isArray(e.pointIds))for(const pointId of e.pointIds)ids.push(...dependencyActivities(pointId,seen));
    return unique(ids);
  }
  const dependencies=new Map(doc.activities.filter(a=>a?.id).map(a=>[a.id,unique([...dependencyActivities(a.startPointId),...dependencyActivities(a.endPointId)])]));
  for(let pass=0;pass<rows.length;pass++) {
    let changed=false;
    for(const r of rows)if(r.state!=='invalid'&&rows.some(other=>other.id!==r.id&&other.state==='invalid'&&dependencies.get(r.id)?.includes(other.id))) {
      r.state='invalid';r.reasons.push('開始条件に無効な予定があります');changed=true;
      add('time',`${r.label}：開始条件に無効な予定があります。`,[r.id],r.personIds);
    }
    if(!changed)break;
  }
  if(doc.annotations!==undefined&&!Array.isArray(doc.annotations))add('annotation','台本の参照一覧が無効です。');
  for(const annotation of Array.isArray(doc.annotations)?doc.annotations:[])if(!get(activities,annotation?.activityRef))add('annotation','台本の予定参照が未解決です。',[annotation?.activityRef]);
  for(const person of people.values()) {
    const assigned=rows.filter(r=>r.personIds.includes(person.id));
    for(let i=0;i<assigned.length;i++)for(const other of assigned.slice(i+1)) {
      const a=assigned[i];
      if(a.state==='known'&&other.state==='known'&&Math.max(a.start,other.start)<Math.min(a.end,other.end)) {
        const exclusive=a.resourceMode==='exclusive'&&other.resourceMode==='exclusive';
        add(exclusive?'overlap':'compatibility',`${person.name}：${a.label} と ${other.label} が重なっています。`,[a.id,other.id],[person.id],exclusive?'conflict':'unknown');
      } else if(a.state!=='known'||other.state!=='known') {
        // Unknown intervals are never silently treated as free. Row issues identify them.
      }
    }
  }
  const windows=doc.windows.map(w=>{
    const start=resolve(w.startPointId),deadline=resolve(w.deadlinePointId),completions=Array.isArray(w.completionPointIds)?w.completionPointIds.map(resolve):[];
    const related=unique(completions.flatMap(c=>c.criticalIds));
    let state=[start,deadline,...completions].some(p=>p.state==='invalid')?'invalid':[start,deadline,...completions].some(p=>p.value===null)?'unknown':'known';
    if(!completions.length||duplicate.has(w.id)||(w.reserveMs!==null&&(!ms(w.reserveMs)||w.reserveMs<0)))state='invalid';
    if(start.value!==null&&deadline.value!==null&&deadline.value<start.value)state='invalid';
    // A timing graph alone cannot validate invalid activity intervals feeding it.
    const required=unique([w.startPointId,w.deadlinePointId,...(w.completionPointIds||[])].flatMap(id=>dependencyActivities(id)));
    if(rows.some(r=>required.includes(r.id)&&r.state==='invalid'))state='invalid';
    const end=state==='known'?Math.max(...completions.map(p=>p.value)):null;
    const slack=end===null?null:deadline.value-end;
    const shortfall=slack===null?null:Math.max(0,-slack);
    const reserveShortfall=slack===null||w.reserveMs===null?null:Math.max(0,w.reserveMs-Math.max(0,slack));
    if(state!=='known')add('window-unknown','転換枠との比較は未確定です。開始・締切・完了条件を確認してください。',related,[],state);
    else if(shortfall>0)add('shortfall',`入力した所要では${formatSeconds(shortfall)}秒不足しています。`,related,[],'shortfall');
    if(state==='known'&&reserveShortfall>0)add('reserve',`指定した予備時間が${formatSeconds(reserveShortfall)}秒不足しています。`,related,[],'shortfall');
    return {id:w.id,start:start.value,deadline:deadline.value,end,state,slack,shortfall,reserveShortfall,criticalIds:related,completionMeaning:w.completionMeaning};
  });
  return {rows,windows,issues,points:Object.fromEntries([...points.keys()].map(id=>[id,resolve(id)])),people:doc.people,hasUncertainty:issues.some(i=>!['shortfall','reserve'].includes(i.code))};
}

export function formatSeconds(value) {
  if(value===null||value===undefined)return '未定';
  return (value/1000).toLocaleString('ja-JP',{maximumFractionDigits:3,useGrouping:false});
}
