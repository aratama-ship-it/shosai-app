const {chromium,webkit}=require('playwright');const fs=require('fs/promises');const path=require('path');const assert=require('assert/strict');
const out=path.join(__dirname,'evidence-b');
const root='http://127.0.0.1:8797/';
(async()=>{await fs.mkdir(out,{recursive:true});const report={};
for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});const records={};report[name]=records;
 try{for(const version of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1800,height:1300}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+(version==='baseline'?'prototype/':'backlight-redesign/prototype-b/'));await page.waitForFunction(()=>window.__RIG?.hooks);
  records[version]={};
  for(const scenario of ['floor','wall','floor-selected','wall-selected','mixed0','mixed35','mixed70','back35','head35']){
   const result=await page.evaluate(({scenario})=>{
    const {state:s,E,hooks:h,SECS,secBox}=window.__RIG;h.stop();s.mode='move';s.front3d=false;s.dim=100;s.sel.clear();s.dims={W:12,D:8,H:8};
    s.show={...s.show,blackout:true,pieces:true,names:false,fixtures:false,grid:false,border:false};
    const pc={id:'p',kind:'performer',u:.5,v:.5,hM:1.75,facing:0,pose:'stand',color:'#d8cdb6',name:'確認'};
    h.scene().pieces=[pc];h.scene().lxEditing=null;h.scene().lxq=[];
    s.rig.trusses=[{id:'r',v:.1,h:3}];s.rig.fixtures=[E.newFixture('r',1,{type:'truss',trussId:'r',u:.5},'','fixed',30),E.newFixture('f',2,{type:'front',u:.5,ahead:4,h:3},'','fixed',45)];
    const surface=scenario.startsWith('floor')?'floor':scenario.startsWith('wall')?'back':'air';
    const pt={u:.5,v:surface==='back'?0:.5,hM:surface==='floor'?0:1.3};
    const light=(on)=>E.newLightCue({on,surface,color:'#ffffff',path:{kind:'still',a:pt}});
    h.scene().cue={lights:{r:light(true),f:light(!scenario.startsWith('back')&&!scenario.startsWith('head'))},groups:[],environment:{haze:Number(scenario.match(/\d+/)?.[0]??35)},futureField:{retain:'yes'}};
    if(scenario.startsWith('head')){h.cue().lights.r.surface='house';h.cue().lights.r.path.a={u:.5,v:1,aheadM:6,hM:4};s.rig.trusses[0].h=6;}
    if(scenario.endsWith('-selected'))s.sel.add('r');const save=JSON.stringify(h.scene().cue);h.renderAll();h.draw();
    const hashes={},pngs={};let frontPixel;
    for(const view of ['plan','front','front3d','shimote','kamite']){
     s.front3d=view==='front3d';if(view==='shimote'||view==='kamite')document.querySelector(`[data-side="${view}"]`).click();h.draw();h.draw();
     const pcv=document.getElementById('plan');const sec=view==='plan'?{cv:pcv,ctx:pcv.getContext('2d')}:SECS.find(x=>x.kind===(view==='front3d'?'front':view));let hash=2166136261;for(const n of sec.ctx.getImageData(0,0,sec.cv.width,sec.cv.height).data)hash=Math.imul(hash^n,16777619)>>>0;hashes[view]=hash;
     if(view==='front'){const B=secBox(sec.cv,'front'),P=E.makeFrontProjector(s.dims,B),p=P({x:0,y:4,z:.9});frontPixel=[...sec.ctx.getImageData(Math.round(p.X),Math.round(p.Y),1,1).data].slice(0,3).reduce((a,b)=>a+b,0);pngs[view]=sec.cv.toDataURL();}
    }
    return {hashes,frontPixel,pngs,unchanged:save===JSON.stringify(h.scene().cue)};
   },{scenario});
   for(const [view,data] of Object.entries(result.pngs))if(name==='chromium')await fs.writeFile(path.join(out,`${version}-${scenario}-${view}.png`),Buffer.from(data.split(',')[1],'base64'));delete result.pngs;
   assert(result.unchanged,'render mutates cue');records[version][scenario]=result;
  }
  if(version==='candidate'){
   const storage=await page.evaluate(()=>{const {state:s,hooks:h}=window.__RIG;h.scene().cue.environment={haze:17,unknown:'keep'};h.scene().cue.futureField={retained:[1,2]};h.scene().lxq=[{id:'a',seq:1,cue:structuredClone(h.cue())},{id:'b',seq:2,cue:{...structuredClone(h.cue()),environment:{haze:82}}}];h.scene().lxEditing='a';h.commit();const initial=h.buildDesign('trial');h.applyDesign(initial);const again=h.buildDesign('trial');const same=JSON.stringify(initial.scenes)===JSON.stringify(again.scenes);h.lxEnterCue(0,'b');const b=h.cue().environment.haze;h.lxEnterCue(0,'a');return {same,b,a:h.cue().environment.haze,unknown:h.cue().futureField.retained};});
   assert.deepEqual(storage,{same:true,b:82,a:17,unknown:[1,2]});records.storage=storage;
   // The dedicated cue slider is reachable through the existing adjustment tab.
   await page.evaluate(()=>{const {hooks:h}=window.__RIG;h.renderAll();});
   const before=await page.evaluate(()=>JSON.stringify(window.__RIG.hooks.cue().lights));
   const hazeNumber=page.locator('.option-b-controls input[type=number]');await hazeNumber.fill('65');await hazeNumber.press('Enter');
   assert.equal(await page.evaluate(()=>window.__RIG.hooks.cue().environment.haze),65);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__RIG.hooks.cue().lights)),before);
   await page.evaluate(()=>window.__RIG.hooks.undo());assert.equal(await page.evaluate(()=>window.__RIG.hooks.cue().environment.haze),17);
   const b=page.locator('.option-b-controls button').filter({hasText:'距離表示'});await b.click();assert.equal(await page.evaluate(()=>window.__RIG.hooks.getDistanceMetric()),true);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__RIG.hooks.cue().lights)),before);await b.click();
   records.ui={haze:true,undo:true,displayDoesNotAim:true};
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 for(const scene of ['floor','wall','floor-selected','wall-selected'])assert.deepEqual(records.baseline[scene].hashes,records.candidate[scene].hashes,scene+' pixels changed');
 assert(records.candidate.mixed35.frontPixel>300,'front light disappeared');
 assert.notEqual(records.candidate.mixed0.hashes.front,records.candidate.mixed70.hashes.front,'haze has no effect');
 console.log(name,'passed',JSON.stringify(records.ui));
 }finally{await browser.close();await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));}
}
})().catch(e=>{console.error(e);process.exitCode=1;});
