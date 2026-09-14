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

(async()=>{const {PNG}=require('pngjs'),browser=await webkit.launch({headless:true});const samples=[];try{for(const version of ['before','after','before-repeat','after-repeat']){const page=await browser.newPage({viewport:{width:1800,height:1300}});await page.addInitScript(()=>{window.__raster=[];const put=CanvasRenderingContext2D.prototype.putImageData;CanvasRenderingContext2D.prototype.putImageData=function(...args){let h=2166136261;for(const v of args[0].data)h=Math.imul(h^v,16777619)>>>0;window.__raster.push(h);return put.apply(this,args);};});if(version.startsWith('before'))await page.route('**/volume-light.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:require('fs').readFileSync(path.join(__dirname,'volume-light.before-optimization-20260914.js'),'utf8')}));await page.goto(base);await page.waitForFunction(()=>window.__RIG?.hooks);await rig(page);const src=await page.evaluate(()=>{const {hooks:h,state:s}=window.__RIG;s.front3d=false;window.__raster=[];h.draw();return {png:document.getElementById('secF').toDataURL(),raster:window.__raster};});const buffer=Buffer.from(src.png.split(',')[1],'base64');await fs.writeFile(path.join(__dirname,'evidence-b/pixel-'+version+'.png'),buffer);samples.push({...PNG.sync.read(buffer),raster:src.raster});await page.close();}const stats=[];for(const [a,b] of [[0,1],[0,2],[1,3]]){const x=samples[a],y=samples[b];assert.equal(x.width,y.width);assert.equal(x.height,y.height);let changed=0,max=0,sum=0;const hist={};for(let i=0;i<x.data.length;i++){const d=Math.abs(x.data[i]-y.data[i]);if(d){changed++;sum+=d;max=Math.max(max,d);hist[d]=(hist[d]||0)+1;}}stats.push({a,b,rasterEqual:JSON.stringify(x.raster)===JSON.stringify(y.raster),changed,max,mean:sum/x.data.length,hist});}console.log(JSON.stringify(stats));await fs.writeFile(path.join(__dirname,'evidence-b/pixel-diagnostic.json'),JSON.stringify(stats,null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
