from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];checks=[]
def ok(n,c):
 assert c,n
 checks.append(n)
with sync_playwright() as p:
 b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':844});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto('http://127.0.0.1:8937/script-cues-2026-09-09/assignment-trial.html?v=4');pg.wait_for_function('!!fixture')
 # Close immediately after file selection; assert that no later completion commits a document.
 pg.route('**/pdf.worker.min.mjs',lambda route:route.fulfill(status=200,content_type='text/javascript',body=(R/'vendor/pdfjs-5.6.205/pdf.worker.min.mjs').read_bytes()))
 pg.locator('#open-pdf').click();pg.locator('#pdf-file').set_input_files(str(R/'output/pdf/fixture-script-original.pdf'));pg.locator('#pdf-cancel').click();pg.wait_for_timeout(600)
 ok('cancel in-flight PDF load cannot commit later',pg.evaluate("state.version==='original' && !document.querySelector('#pdf-import').open"))
 pg.locator('#open-pdf').click();pg.locator('#pdf-file').set_input_files(str(R/'output/pdf/fixture-script-original.pdf'));pg.wait_for_function("!document.querySelector('#pdf-apply').disabled");pg.locator('#pdf-apply').click();pg.wait_for_selector('[data-pdf-surface]');pg.wait_for_timeout(180)
 pg.locator('#check-missing').click();pg.locator('#menu [data-source="lx12"]').click();pg.wait_for_timeout(220)
 pg.locator('[data-pdf-surface]').focus();pg.keyboard.press('Enter');pg.locator('#pdf-text-choice').select_option(label='あの扉を開けて。');pg.locator('#pdf-text-assign').click();ok('phone PDF text can be assigned with keyboard alternative',pg.evaluate('entry("lx12").anchor.quote')=='あの扉を開けて。');pg.locator('#app').screenshot(path=str(R/'pdf-import-mobile.png'))
 ok('phone imported PDF stays inside horizontally scrollable pane',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 pg.locator('#open-q-sheet').click();data='番号,部門,説明,元メモ\r\n88,LX,照明調整,削除しない\r\n';pg.locator('#q-file').set_input_files({'name':'sjis.csv','mimeType':'text/csv','buffer':data.encode('shift_jis')});pg.wait_for_function("document.querySelector('#csv-map').open")
 ok('Japanese Shift_JIS CSV detected explicitly','Shift_JIS' in pg.locator('#map-origin').inner_text());pg.locator('#map-number').select_option('0');pg.locator('#map-description').select_option('2');pg.locator('#map-type').select_option('1');ok('nonstandard Japanese headers can be mapped manually',pg.locator('#map-apply').is_enabled());pg.locator('#csv-map').screenshot(path=str(R/'csv-migration-mobile.png'));pg.locator('#map-apply').click();pg.locator('#q-apply').click();ok('unmapped field preserved after application',pg.evaluate('state.cues[1].note.includes("元メモ: 削除しない")'))
 results=pg.evaluate('''() => {
 const result=[];const rejects=(name,fn)=>{try{fn();throw Error('expected rejection '+name);}catch(e){if(e.message.startsWith('expected'))throw e;result.push(name);}};
 rejects('ragged CSV rejected',()=>CSVMigration.inspect('Cue,Description\\n3'));
 rejects('duplicate headers rejected',()=>CSVMigration.inspect('Cue,Cue\\n3,4'));
 rejects('empty headers rejected',()=>CSVMigration.inspect('Cue,\\n3,4'));
 rejects('unclosed quote rejected',()=>CSVMigration.inspect('Cue,Description\\n3,"x'));
 rejects('row limit enforced',()=>CSVMigration.inspect('Cue,Description\\n'+Array.from({length:201},(_,i)=>i+',x').join('\\n')));
 const s=CSVMigration.inspect('Cue,Description,Department,Hidden\\n77,test,UNKNOWN,keep');
 rejects('required number mapping enforced',()=>CSVMigration.convert(s,{...s.mapping,number:-1},[],'x.csv'));
 rejects('duplicate source mapping rejected',()=>CSVMigration.convert(s,{...s.mapping,description:0},[],'x.csv'));
 const c=CSVMigration.convert(s,s.mapping,[],'x.csv').additions[0];
 if(c.type!=='その他'||!c.note.includes('元の種別: UNKNOWN')||!c.note.includes('Hidden: keep'))throw Error('unknown lost');result.push('unknown type and column preserved');
 const f=CSVMigration.inspect('Cue,Description\\n=1+1,@formula');const cue=CSVMigration.convert(f,f.mapping,[],'x.csv').additions[0];const output=QSheetCSV.write([cue],()=>({version:'',page:'',quote:'',status:'未割当'}));if(!output.includes("'=1+1")||!output.includes("'@formula"))throw Error('formula unsafe');result.push('migrated formula-like strings escaped on export');
 return result;
}''');checks+=results
 # selected a valid result then malformed input must not retain previous apply availability
 pg.locator('#open-pdf').click();pg.locator('#pdf-file').set_input_files(str(R/'output/pdf/fixture-script-revised.pdf'));pg.wait_for_function("!document.querySelector('#pdf-apply').disabled");pg.locator('#pdf-file').set_input_files({'name':'broken.pdf','mimeType':'application/pdf','buffer':b'invalid'});pg.wait_for_function("document.querySelector('#pdf-message').textContent.includes('読み込めません')");ok('failed replacement selection clears stale preview candidate',pg.locator('#pdf-apply').is_disabled());pg.locator('#pdf-cancel').click()
 ok('extra flows have no JavaScript errors',not errors);b.close()
(R/'pdf-migration-extra-checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2));print({'passed':len(checks),'errors':errors})
