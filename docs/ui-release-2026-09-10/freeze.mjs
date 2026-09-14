import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const repo='/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app';
const dir='/tmp/stage-ui-release-20260910';
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
fs.mkdirSync(dir+'/beta',{recursive:true});
fs.cpSync(repo+'/public-dist',dir+'/public/public-dist',{recursive:true});
fs.copyFileSync(repo+'/wrangler.public.toml',dir+'/public/wrangler.public.toml');
let html=read('stage.html').replace(/<script src="\/?(?:stage-study-owner|stage-usage)\.js[^"<>]*"><\/script>\n/g,'');
html=html.replace(/    <section class="stage-share-channel stage-share-study"[\s\S]*?<\/section>\n/,'');
html=html.replace('id="stage-share-panel-hint"','id="stage-share-panel-hint" hidden');
let sw=read('stage-sw.js').replace(/^  "\.\/(?:stage-study-owner\.js|stage-study\.css|stage-usage\.js)[^"\n]*",\n/gm,'').replace('stage-sketch-pwa-v238','stage-sketch-pwa-v238-ui20260910');
const files=new Set(['stage.html','stage-sw.js']);
for(const m of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))(?:\?[^"<>]*)?"/g)){
 const p=m[1].replace(/^\//,'');
 if(p!=='stage-shows.local.js')files.add(p);
}
for(const m of sw.matchAll(/"\.\/([^"?]+\.(?:js|css|html))(?:\?[^"<>]*)?"/g))files.add(m[1]);
const assets={};const manifest=[];
for(const p of files){
 const data=p==='stage.html'?html:p==='stage-sw.js'?sw:read(p);
 assert(!p.startsWith('stage-study')&&!p.startsWith('stage-usage'),'Unreleased backend dependency');
 const type=p.endsWith('.js')?'application/javascript; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';
 const target=path.join(dir,'beta',p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);
 assets['/'+p]=[type,data];if(p.endsWith('.html'))assets['/'+p.slice(0,-5)]=assets['/'+p];
 manifest.push({path:p,bytes:Buffer.byteLength(data),sha256:sha(data)});
}
let worker=fs.readFileSync(dir+'/production-worker.js','utf8');
const start=worker.indexOf('  // 2026-09-09: 実在3会場');const end=worker.indexOf('  if (request.method === "GET" && response.status === 200 && GUEST_STAGE_DOCUMENTS',start);
assert(start>0&&end>start);worker=worker.slice(0,start)+worker.slice(end);
// Chinese UI dictionaries are public app assets, with the same authentication as other JS.
worker=worker.replace('  "/stage-i18n.js",','  "/stage-i18n.js",\n  "/stage-i18n.zh-Hans.js",\n  "/stage-i18n.zh-Hant.js",');
const marker='var worker_default = {\n  async fetch(request, env, ctx) {';assert(worker.includes(marker));
worker=worker.replace(marker,marker+'\n    env = uiReleaseEnv(env);');
const adapter=`\nconst UI_RELEASE_ASSETS = ${JSON.stringify(assets)};\nfunction uiReleaseEnv(env) {\n  const originalAssets = env.ASSETS;\n  return { ...env, ASSETS: { async fetch(request) {\n    const item = (request.method === 'GET' || request.method === 'HEAD') && UI_RELEASE_ASSETS[new URL(request.url).pathname];\n    if (!item) return originalAssets.fetch(request);\n    return new Response(request.method === 'HEAD' ? null : item[1], {headers: {'Content-Type':item[0], 'X-Stage-UI-Release':'20260910', 'Cache-Control':'no-cache'}});\n  } } };\n}\n`;
worker=adapter+worker;
fs.writeFileSync(dir+'/release-bundle.mjs',worker);
fs.writeFileSync(dir+'/manifest.json',JSON.stringify({release:'ui-20260910',assets:manifest,excludedUnreleasedFeatures:['study-owner backend UI','usage telemetry'],preserved:'Current production Worker auth, SessionRoom, secrets and complete existing static asset set',bundleBytes:Buffer.byteLength(worker),bundleGzipBytes:zlib.gzipSync(worker).length,bundleSha256:sha(worker)},null,2));
console.log(JSON.stringify({assets:manifest.length,bundleBytes:Buffer.byteLength(worker),gzipBytes:zlib.gzipSync(worker).length,publicFiles:44}));
