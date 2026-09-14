// Isolated synthetic rigs. Compare the same app with old/new volume modules.
const {chromium,webkit}=require('playwright');
const fs=require('fs/promises'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const base='http://127.0.0.1:8797/backlight-redesign/prototype-b/';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function rig(page){
 await page.evaluate(()=>{
  const {state:s,hooks:h,E}=window.__RIG;h.stop();s.mode='move';s.dims={W:12,D:8,H:8};s.dim=100;
  s.show={...s.show,blackout:true,border:false,names:false,grid:false,fixtures:false,pieces:true};s.sel.clear();
  s.rig={trusses:[{id:'r',v:.2,h:6}],fixtures:Array.from({length:8},(_,i)=>E.newFixture('r'+i,i+1,{type:'truss',trussId:'r',u:.15+i*.1},'','moving',18))};
  h.scene().pieces=Array.from({length:8},(_,i)=>({id:'p'+i,kind:'performer',u:.15+i*.1,v:.5+(i%2)*.15,hM:1.7,pose:'stand',color:'#d8cdb6'}));
  h.scene().lxEditing=null;h.scene().cue={lights:Object.fromEntries(s.rig.fixtures.map((f,i)=>[f.id,E.newLightCue({on:true,surface:'house',color:i%2?'#ffd27a':'#7ab8ff',path:{kind:'still',a:{u:.15+i*.1,v:1,aheadM:6,hM:2.5}}})])),groups:[],environment:{haze:70}};
  h.renderAll();
 });
}
(async()=>{
 const original=await fs.readFile(path.join(__dirname,'volume-light.before-optimization-20260914.js'),'utf8');
 const old=original.replace('steps=quick?12:18,width=quick?96:192','steps=quick?10:18,width=quick?72:192');
 const current=await fs.readFile(path.join(__dirname,'prototype-b/volume-light.js'),'utf8');
 const report={at:new Date().toISOString(),oldModule:hash(old),matchedSampling:'72x10 interactive; 192x18 precise',newModule:hash(current),engines:{}};
 for(const [engine,type] of Object.entries({chromium,webkit})){
  const browser=await type.launch({headless:true});const r=report.engines[engine]={version:browser.version()};
  try{
   for(const version of ['before','after']){
    const page=await browser.newPage({viewport:{width:1800,height:1300}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.__collectRaster=false;window.__raster=[];const put=CanvasRenderingContext2D.prototype.putImageData;CanvasRenderingContext2D.prototype.putImageData=function(...args){if(window.__collectRaster){let h=2166136261;for(const v of args[0].data)h=Math.imul(h^v,16777619)>>>0;window.__raster.push(h);}return put.apply(this,args);};});
    if(version==='before')await page.route('**/volume-light.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:old}));
    await page.goto(base);await page.waitForFunction(()=>window.__RIG?.hooks);await rig(page);
    r[version]=await page.evaluate((version)=>{
     const {state:s,hooks:h,SECS}=window.__RIG;const cases={},rasters={},stable={},performanceResults={};
     const frame=n=>{for(let i=0;i<8;i++){const l=h.cue().lights['r'+i];l.path.a.u=.5+.4*Math.sin(n*.09+i*.7);l.path.a.hM=2.5+1.8*Math.cos(n*.07+i);}};
     for(const quick of [false,true])for(const haze of [0,35,70])for(const n of [0,8,19]){
      s.play.on=quick;h.cue().environment.haze=haze;frame(n);
      for(const view of ['plan','front','front3d','shimote','kamite']){
       s.front3d=view==='front3d';if(view==='shimote'||view==='kamite')document.querySelector(`[data-side="${view}"]`).click();window.__raster=[];window.__collectRaster=true;h.draw();window.__collectRaster=false;
       const cv=view==='plan'?document.getElementById('plan'):SECS.find(sec=>sec.kind===(view==='front3d'?'front':view)).cv;
       let hash=2166136261;for(const v of cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data)hash=Math.imul(hash^v,16777619)>>>0;
       const key=[quick,haze,n,view].join('/');cases[key]=hash;rasters[key]=window.__raster;
       if(version==='after'){h.draw();let again=2166136261;for(const v of cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data)again=Math.imul(again^v,16777619)>>>0;stable[key]=hash===again;}
      }
     }
     s.front3d=false;document.querySelector('[data-side="shimote"]').click();h.cue().environment.haze=70;
     for(const quick of [false,true]){
      s.play.on=quick;const timings=[];
      for(let n=0;n<50;n++){frame(n);const t=performance.now();h.draw();const elapsed=performance.now()-t;if(n>=20)timings.push(elapsed);}
      timings.sort((a,b)=>a-b);performanceResults[quick?'moving':'precise']={medianMs:timings[15],p95Ms:timings[28],samples:30,warmup:20};
     }
     s.play.on=false;
     return {cases,rasters,stable,performance:performanceResults,lamps:8,people:8,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};
    },version);
    assert.deepEqual(errors,[]);await page.close();
   }
   assert.deepEqual(r.before.rasters,r.after.rasters,engine+' light buffers differ');assert(Object.values(r.after.stable).every(Boolean),engine+' repeated final pixels differ');if(engine==='chromium')assert.deepEqual(r.before.cases,r.after.cases,engine+' optimized pixels differ');r.identicalRasterCases=Object.keys(r.after.cases).length;r.stableFinalCases=Object.values(r.after.stable).filter(Boolean).length;r.identicalCases=Object.keys(r.after.cases).filter(k=>r.before.cases[k]===r.after.cases[k]).length;
   console.log(engine,JSON.stringify({identicalCases:r.identicalCases,identicalRasterCases:r.identicalRasterCases,stableFinalCases:r.stableFinalCases,before:r.before.performance,after:r.after.performance}));
  }finally{await browser.close();await fs.writeFile(path.join(__dirname,'evidence-b/optimization.json'),JSON.stringify(report,null,2));}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
