// Isolated, reproducible design preview. Never writes outside this directory.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url)), root=resolve(dir,'../..');
const source=async p=>readFile(resolve(root,p),'utf8');
const hashes={};
const assets=['style.css','stage-venues.js','stage-venue-lines.js','stage-i18n.js','stage-i18n.zh-Hans.js','stage-i18n.zh-Hant.js','stage-prompt-i18n.js','stage-rehearsal-export.js','stage-samples/index.js','stage-set-model.js','stage-machinery.js','stage-light-motion.js','stage-sketch.js'];
for(const file of assets){const s=await source(file);hashes[file]=createHash('sha256').update(s).digest('hex');await mkdir(dirname(resolve(dir,'source',file)),{recursive:true});await writeFile(resolve(dir,'source',file),s);}
let html=await source('stage.html');hashes['stage.html']=createHash('sha256').update(html).digest('hex');
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
html=html.replace(/<title>.*?<\/title>/,'<title>舞台スケッチ — タイムライン追加のみ・UI確認用</title>');
html=html.replace('<meta charset="utf-8">',`<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"><link rel="icon" href="data:,"><link rel="stylesheet" href="source/style.css"><link rel="stylesheet" href="timeline-only.css"><script src="isolate.js"></script>`);
html=html.replace('</body>',assets.filter(p=>p.endsWith('.js')).map(p=>`<script src="source/${p}"></script>`).join('\n')+'<script src="timeline-only.js"></script></body>');
await writeFile(resolve(dir,'preview.html'),html);
await writeFile(resolve(dir,'sources.json'),JSON.stringify({created:new Date().toISOString(),mode:'design-only, memory-only',source:'stage.html (current canonical HTML)',hashes},null,2)+'\n');
console.log('Built isolated preview: '+dir);
