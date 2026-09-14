from pathlib import Path
import json,subprocess,hashlib,concurrent.futures,datetime
root=Path(__file__).resolve().parent
m=json.loads((root/'release.json').read_text());base='https://aratama-ship-it.github.io/shosai-app/'
files=m['files'][:]
for name in ['rig-engine.js','stage-figure.js','light-presets.js','light-presets-ui.js']:
 files.append({'source':str(root/'candidate'/name),'path':'docs/light-rig-design-2026-09-11/prototype/'+name,'sha256':hashlib.sha256((root/'candidate'/name).read_bytes()).hexdigest()})
def verify(f):
 url=base+f['path'];data=subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','45',url]);sha=hashlib.sha256(data).hexdigest()
 return {**f,'url':url,'liveSha256':sha,'matches':sha==f['sha256']}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:results=list(ex.map(verify,files))
m.update({'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pagesStatus':'built','live':results,'allMatch':all(f['matches'] for f in results)})
(root/'release.json').write_text(json.dumps(m,ensure_ascii=False,indent=2));print(json.dumps({'commit':m['commit'],'allMatch':m['allMatch'],'files':len(results)}));assert m['allMatch']
