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

(async()=>{const out={};for(const [engine,type] of Object.entries({chromium,webkit})){const browser=await type.launch({headless:true});out[engine]={};try{for(const version of ['before','after']){const page=await browser.newPage({viewport:{width:1800,height:1300}});if(version==='before')await page.route('**/volume-light.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:require('fs').readFileSync(path.join(__dirname,'volume-light.before-optimization-20260914.js'),'utf8')}));await page.goto(base);await page.waitForFunction(()=>window.__RIG?.hooks);await rig(page);out[engine][version]=await page.evaluate(()=>{const {state:s,hooks:h}=window.__RIG;s.play.on=true;const timings=[];for(let n=0;n<50;n++){for(let i=0;i<8;i++){const l=h.cue().lights['r'+i];l.path.a.u=.5+.4*Math.sin(n*.09+i*.7);l.path.a.hM=2.5+1.8*Math.cos(n*.07+i);}const t=performance.now();h.draw();if(n>=20)timings.push(performance.now()-t);}s.play.on=false;timings.sort((a,b)=>a-b);return {medianMs:timings[15],p95Ms:timings[28],samples:30,warmup:20,lamps:8,people:8,haze:70,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};});await page.close();}console.log(engine,JSON.stringify(out[engine]));}finally{await browser.close();await fs.writeFile(path.join(__dirname,'evidence-b/performance-final.json'),JSON.stringify(out,null,2));}}})().catch(e=>{console.error(e);process.exitCode=1;});
