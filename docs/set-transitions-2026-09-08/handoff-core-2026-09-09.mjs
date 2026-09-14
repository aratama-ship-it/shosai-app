// Standalone design trial. No product storage, network, or real cue input.
export const VERSION='handoff-2026-09-09-r3';
export const PEOPLE={A:'A',B:'B',C:'C',D:'D'};
export const DEFAULTS={left:'A',right:'C',mode:'placed',returnB:false,platformSeconds:6,travelSeconds:2,putSeconds:2,pickupSeconds:2,conflict:false,cycle:false};
export const PRESETS={
 normal:{}, slow:{travelSeconds:6}, missing:{right:''}, candidate:{right:'candidate'},
 conflict:{conflict:true}, cycle:{cycle:true}, return:{right:'B',returnB:true}, full:{left:'D'}, direct:{mode:'direct'}
};
const unique=a=>[...new Set(a)];
const validPerson=p=>Object.hasOwn(PEOPLE,p);
export function makePlan(input={}){
 const c={...DEFAULTS,...input};
 for(const k of ['platformSeconds','travelSeconds','putSeconds','pickupSeconds'])if(c[k]!==null&&(!Number.isFinite(c[k])||c[k]<0.1||c[k]>60||Math.abs(c[k]*10-Math.round(c[k]*10))>1e-6))throw new Error(`${({platformSeconds:'平台の所要',travelSeconds:'担当の移動',putSeconds:'机を置く所要',pickupSeconds:'持ち直し・受渡しの所要'})[k]}は、0.1〜60秒（0.1秒刻み）か空欄にしてください。`);
 if(!['placed','direct'].includes(c.mode))throw new Error('Unknown handoff mode');
 if(c.returnB&&c.mode==='direct')throw new Error('Bが離れて戻る例は、置いて待つ設定で試してください。');
 const post=[c.left,c.right], old=['A','B'], returning=c.returnB&&post.includes('B');
 if(c.returnB&&!post.includes('B'))throw new Error('戻るBを再開後の担当に入れてください。');
 const keep=c.mode==='direct'?old:old.filter(p=>post.includes(p)&&!(p==='B'&&returning));
 const incoming=unique(post.filter(p=>!keep.includes(p)));
 const nodes=[];
 function add(id,label,people,seconds,deps=[],extra={}){nodes.push({id,label,people,ms:seconds===null?null:Math.round(seconds*1000),deps,kind:'timed',...extra});}
 add('table-in','机を途中位置へ運ぶ',old,3,[],{target:'table',motion:[380,250]});
 if(c.mode==='placed')add('put','机を置く',old,c.putSeconds,['table-in'],{target:'table'});
 const boundary=c.mode==='placed'?'put':'table-in';
 add('platform','平台を運んで置く',['C'],c.platformSeconds,c.cycle?['table-out']:[],{target:'platform',motion:[825,500]});
 const arrivals=[];
 for(const p of incoming){
  const id=`arrive-${p||'unknown'}`;arrivals.push(id);
  if(p==='B'&&returning){
   add('B-away','Bが別作業へ移動',['B'],1,[c.mode==='direct'?'handover':'put']);
   add('B-job','Bの別作業',['B'],4,['B-away']);
   add(id,'Bが机へ戻る',['B'],c.travelSeconds,['B-job']);
  }else if(p==='C')add(id,'Cが平台から机へ移動',['C'],c.travelSeconds,['platform']);
  else if(p==='D'){
   add('D-job','Dの前作業',['D'],7,[]);
   add(id,'Dが机へ移動',['D'],1,['D-job']);
  }else add(id,`${validPerson(p)?p:'未定の担当'}が机へ参加`,[p],c.travelSeconds,[boundary]);
 }
 // Waiting segments carry the exact continuing people, including an empty list
 // when the object is placed and nobody stays. These are not missing slots.
 add('old-wait',c.mode==='direct'?'旧担当が机を持って待つ':'机を置いて待つ',keep,0,[boundary],{kind:'wait',until:arrivals,target:'table'});
 const waits=['old-wait'];
 for(let i=0;i<incoming.length;i++){
  const p=incoming[i],id=`new-wait-${i}`;waits.push(id);
  add(id,`${validPerson(p)?p:'未定の担当'}が机で合流を待つ`,[p],0,[arrivals[i]],{kind:'wait',until:[boundary,...arrivals]});
 }
 const prepare=c.mode==='direct'?'handover':'pickup';
 add(prepare,c.mode==='direct'?'机の担当を受け渡す':'机を持ち直す',c.mode==='direct'?unique([...old,...post]):post,c.pickupSeconds,waits,{target:'table',assignmentIssue:post[0]===post[1]});
 add('cue','Q13を待つ',post,0,[prepare],{kind:'cue',cueId:'cue-13',target:'table'});
 add('table-out','机を下手袖へ運ぶ',post,5,['cue'],{target:'table',motion:[250,75]});
 for(const p of old.filter(p=>!post.includes(p))){
  const end=c.mode==='direct'?'handover':'put';
  add(`${p}-away`,`${p}が別作業へ移動`,[p],1,[end]);
  add(`${p}-job`,`${p}の別作業`,[p],4,[`${p}-away`]);
 }
 if(c.conflict)add('C-extra','Cの別の作業',['C'],4,['platform']);
 // A returning B in direct mode already stays until handover; do not silently
 // route a person away while also retaining them at the same object.
 const diagnostics=[];
 if(post.some(p=>!validPerson(p)))diagnostics.push({kind:'assignment',text:post.includes('candidate')?'再開後の担当候補（BまたはC）が未確定です。':'再開後の担当が未定です。'});
 if(post[0]===post[1]&&validPerson(post[0]))diagnostics.push({kind:'assignment',text:`${post[0]}が再開後の2枠に入っています。`});
 const plan={config:c,nodes,diagnostics};
 for(const cycle of findCycles(nodes))diagnostics.push({kind:'cycle',text:'互いに待っている：'+cycle.map(id=>nodes.find(n=>n.id===id)?.label||id).join(' → ')});
 return plan;
}
export function findCycles(nodes){
 const by=new Map(nodes.map(n=>[n.id,n])), color=new Map(),stack=[],cycles=[];
 function visit(id){if(color.get(id)===2)return;if(color.get(id)===1){cycles.push([...stack.slice(stack.indexOf(id)),id]);return;}color.set(id,1);stack.push(id);
  const n=by.get(id);if(!n)throw new Error('Unresolved dependency '+id);
  for(const dep of unique([...n.deps,...(n.until||[])]))visit(dep);
  stack.pop();color.set(id,2);
 }
 for(const n of nodes)visit(n.id);return cycles;
}
const nameOf=n=>n.people.map(p=>validPerson(p)?p:p==='candidate'?'候補B/C':'未定').join('・')||'担当は離れる';
export class Trial{
 constructor(plan){this.plan=plan;this.by=new Map(plan.nodes.map(n=>[n.id,n]));this.reset();}
 reset(){this.time=0;this.started=false;this.paused=false;this.passed=new Set();this.log=[];this.blocked=[];this.conflicts=new Map();this.conflictedNodes=new Set();this.status=Object.fromEntries(this.plan.nodes.map(n=>[n.id,{state:'pending',start:null,end:null}]));}
 start(){if(this.started)return;this.started=true;this.settle();}
 finished(id){return this.status[id]?.state==='done';}
 missing(n){return n.deps.filter(id=>!this.finished(id));}
 invalid(n){return n.assignmentIssue||n.people.some(p=>!validPerson(p))||unique(n.people).length!==n.people.length||(n.kind==='timed'&&n.ms===null);}
 settle(){if(!this.started||this.paused)return;
  // At a boundary finish old intervals before starting new ones. No positive
  // time passes between consecutive segments of the same person's work.
  for(let pass=0;pass<this.plan.nodes.length*3;pass++){
   let changed=false;this.blocked=[...this.conflicts.values()];
   for(const n of this.plan.nodes){const s=this.status[n.id];if(s.state!=='active')continue;
    if((n.kind==='timed'&&this.time>=s.start+n.ms)||(n.kind==='wait'&&(n.until||[]).every(id=>this.finished(id)))||(n.kind==='cue'&&this.passed.has(n.id))){s.state='done';s.end=this.time;changed=true;}
   }
   if(changed)continue;
   const ready=this.plan.nodes.filter(n=>this.status[n.id].state==='pending'&&!this.missing(n).length);
   const allowed=ready.filter(n=>{if(this.conflictedNodes.has(n.id))return false;if(!this.invalid(n))return true;const reasons=[];if(n.ms===null)reasons.push('所要が未定です');if(n.people.some(p=>!validPerson(p)))reasons.push('担当が未定です');if(n.assignmentIssue||unique(n.people).length!==n.people.length)reasons.push('同じ人が複数枠に入っています');this.blocked.push({kind:'unknown',ids:[n.id],text:`${n.label}：${reasons.join('。')}。`});return false;});
   const active=this.plan.nodes.filter(n=>this.status[n.id].state==='active');
   const collisions=new Set();
   for(const n of allowed){for(const other of [...active,...allowed]){if(other.id===n.id)continue;
    const people=unique(n.people.filter(p=>other.people.includes(p)));if(!people.length)continue;
    collisions.add(n.id);this.conflictedNodes.add(n.id);if(allowed.includes(other)){collisions.add(other.id);this.conflictedNodes.add(other.id);}
    const ids=[n.id,other.id].sort(),key=ids.join('|');if(!this.conflicts.has(key)){const issue={kind:'conflict',ids,text:`担当が重なる：${people.join('・')} / ${n.label} と ${other.label}。設定を直して試し直してください。`};this.conflicts.set(key,issue);this.blocked.push(issue);}
   }}
   for(const n of allowed){if(collisions.has(n.id))continue;const s=this.status[n.id];s.state='active';s.start=this.time;changed=true;}
   if(!changed)break;
  }
 }
 advance(seconds=1){if(!this.started||this.paused||this.done)return;
  if(!Number.isFinite(seconds)||seconds<0||seconds>3600||Math.abs(seconds*1000-Math.round(seconds*1000))>1e-6)throw new Error('Advance must use whole milliseconds');
  const target=Math.min(3600000,this.time+Math.round(seconds*1000));this.settle();
  while(this.time<target&&!this.done){const ends=this.plan.nodes.filter(n=>n.kind==='timed'&&this.status[n.id].state==='active').map(n=>this.status[n.id].start+n.ms).filter(t=>t>this.time);this.time=Math.min(target,...ends);this.settle();}
 }
 next(){if(!this.started||this.paused||this.done)return;
  const ends=this.plan.nodes.filter(n=>n.kind==='timed'&&this.status[n.id].state==='active').map(n=>this.status[n.id].start+n.ms).filter(t=>t>this.time);
  if(ends.length)this.advance((Math.min(...ends)-this.time)/1000);
 }
 cue(){if(!this.started||this.paused||this.done||this.passed.has('cue'))return false;
  const active=this.plan.nodes.filter(n=>n.kind==='cue'&&this.status[n.id].state==='active'&&!this.passed.has(n.id));
  if(!active.length){const reason=this.cueReason();this.log.push({time:this.time,kind:'early',text:`Q13を想定：進めず。${reason}`});return false;}
  for(const n of active)this.passed.add(n.id);
  this.log.push({time:this.time,kind:'pass',text:'準備が揃ったとして、この試しを再開。机を下手袖へ。'});this.settle();return true;
 }
 cueReason(){if(this.finished('cue'))return 'この試しでは既に再開しています。';
  const prepare=this.plan.config.mode==='direct'?'handover':'pickup';
  if(this.status[prepare].state==='active')return this.plan.config.mode==='direct'?'担当の受渡し中です。':'まだ持ち直し中です。';
  const incoming=this.plan.nodes.filter(n=>n.id.startsWith('arrive-')&&!this.finished(n.id));
  if(incoming.length)return incoming.map(n=>`${nameOf(n)}が机への参加準備を終えていません。`).join(' ');
  if(!this.finished('table-in'))return '机が途中位置に着いていません。';
  if(this.plan.config.mode==='placed'&&!this.finished('put'))return '机を置く工程が終わっていません。';
  return '再開前の工程が終わっていません。';
 }
 get done(){return this.started&&this.plan.nodes.every(n=>this.finished(n.id));}
 get ready(){return this.status.cue.state==='active'&&!this.passed.has('cue');}
 positions(){const out={table:380,platform:825};for(const n of this.plan.nodes){if(!n.motion)continue;const s=this.status[n.id];if(s.state==='pending')continue;const f=s.state==='done'?1:Math.min(1,(this.time-s.start)/n.ms);out[n.target]=n.motion[0]+(n.motion[1]-n.motion[0])*f;}return out;}
 personRows(){return Object.keys(PEOPLE).map(person=>{const active=this.plan.nodes.filter(n=>n.people.includes(person)&&this.status[n.id].state==='active');const pending=this.plan.nodes.filter(n=>n.people.includes(person)&&this.status[n.id].state==='pending');const relevant=this.blocked.filter(b=>b.ids.some(id=>this.by.get(id)?.people.includes(person)));return{person,active:active.map(n=>n.label),next:pending.map(n=>n.label),issues:relevant.map(b=>b.text)};});}
 snapshot(){return{time:this.time,started:this.started,paused:this.paused,done:this.done,ready:this.ready,positions:this.positions(),statuses:structuredClone(this.status),issues:[...this.plan.diagnostics,...this.blocked],log:structuredClone(this.log),people:this.personRows()};}
}
