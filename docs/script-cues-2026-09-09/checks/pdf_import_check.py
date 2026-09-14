from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];D=Path('/private/tmp/pdf-import-qa-20260909');checks=[]
def ok(name,condition):
 assert condition,name
 checks.append(name)
with sync_playwright() as p:
 b=p.chromium.launch();ctx=b.new_context(viewport={'width':1440,'height':1100});pg=ctx.new_page();errors=[];external=[]
 pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:8937/','blob:','data:')) else None)
 pg.goto('http://127.0.0.1:8937/script-cues-2026-09-09/assignment-trial.html?v=4');pg.wait_for_function('!!fixture')
 def click(id):pg.locator('#'+id).click();pg.wait_for_timeout(180)
 def prepare(path):
  click('open-pdf');pg.locator('#pdf-file').set_input_files(str(path));pg.wait_for_function("!document.querySelector('#pdf-apply').disabled",timeout=30000)
 def commit():
  click('pdf-apply');pg.wait_for_selector('[data-pdf-surface]');pg.wait_for_timeout(200)
 def text_place(key,text):
  pg.locator('#menu [data-source="'+key+'"]').click();pg.locator('[data-pdf-surface]').focus();pg.keyboard.press('Enter');pg.locator('#pdf-text-choice').select_option(label=text);click('pdf-text-assign')
 pg.locator('#menu [data-source="lx12"]').click();pg.locator('[data-row="door"]').click();old=pg.evaluate('JSON.stringify(state.annotations)')
 prepare(R/'output/pdf/fixture-script-original.pdf');ok('PDF preview does not mutate old state',pg.evaluate("state.version==='original' && JSON.stringify(state.annotations)=== "+json.dumps(old)))
 click('pdf-cancel');ok('cancel PDF preview preserves cues and version',pg.evaluate("state.version==='original' && JSON.stringify(state.annotations)=== "+json.dumps(old)))
 prepare(R/'output/pdf/fixture-script-original.pdf');pg.locator('#pdf-import').screenshot(path=str(R/'pdf-import-preview.png'));commit();version=pg.evaluate('state.version')
 ok('actual PDF parsed with text and dynamic page count',pg.evaluate('rows().some(r=>r.text.includes("あの扉"))') and pg.locator('#page-label').inner_text()=='1 / 2頁')
 ok('PDF replacement keeps old assignment identity for review',pg.evaluate('JSON.stringify(state.annotations)')==old and '要付替え 1件' in pg.locator('#health-summary').inner_text())
 text_place('lx12','あの扉を開けて。');ok('keyboard text assignment preserves cue and annotation IDs',pg.evaluate('state.annotations[0].id')==json.loads(old)[0]['id'] and pg.evaluate('state.annotations[0].anchor.quote')=='あの扉を開けて。')
 # Pointer drag to exact extracted text bounds, scrolling target into view first.
 pg.locator('#pdf-text-controls').evaluate('e=>e.open=false');pg.locator('#page-image').scroll_into_view_if_needed();pg.locator('#script-scroll').evaluate('e=>e.scrollTop=0')
 rect=pg.evaluate('rows().find(r=>r.text.includes("二人が舞台中央")).rect');image=pg.locator('#page-image').bounding_box();dst=(image['x']+(rect[0]+rect[2])/2*image['width'],image['y']+(rect[1]+rect[3])/2*image['height'])
 src=pg.locator('#menu [data-source="scene4"]').bounding_box();pg.mouse.move(src['x']+30,src['y']+30);pg.mouse.down();pg.mouse.move(*dst,steps=12)
 ok('PDF drag preview does not assign until drop',pg.evaluate('state.annotations.length')==1);pg.mouse.up();pg.wait_for_timeout(200)
 ok('PDF drop attaches to text fragment',pg.evaluate('entry("scene4").anchor.quote')=='［二人が舞台中央へ歩く］')
 pg.locator('#app').screenshot(path=str(R/'pdf-import-desktop.png'))
 assigned=pg.evaluate('JSON.stringify(state.annotations)');click('next');ok('next page uses actual PDF second page',pg.locator('#page-label').inner_text()=='2 / 2頁');pg.wait_for_selector('[data-pdf-surface]');ok('page 2 text loaded',pg.evaluate('rows().some(r=>r.text.includes("あちら"))'))
 prepare(D/'three-pages-rotated.pdf');commit();ok('three-page PDF count not hardcoded',pg.locator('#page-label').inner_text()=='1 / 3頁');click('next');pg.wait_for_selector('[data-pdf-surface]');ok('rotated page uses rotated viewport',pg.evaluate('fixture.versions[state.version].pages[1].width>fixture.versions[state.version].pages[1].height'))
 pg.locator('#app').screenshot(path=str(R/'pdf-import-rotated.png'));click('next');pg.wait_for_selector('[data-pdf-surface]');ok('third page with crop box loads',pg.locator('#page-label').inner_text()=='3 / 3頁' and pg.locator('#next').is_disabled())
 pg.locator('#version').select_option('original');ok('switch to shorter PDF clamps page index',pg.evaluate('state.page===1'));click('undo');pg.wait_for_selector('[data-pdf-surface]');ok('undo restores third page of prior PDF',pg.evaluate('state.page===2'))
 pg.locator('#version').select_option(version);pg.wait_for_selector('[data-pdf-surface]');ok('old PDF version reuses preserved anchors',pg.evaluate('JSON.stringify(state.annotations)')==assigned and '割当済み' in pg.locator('#health-summary').inner_text())
 prepare(D/'scan.pdf');commit();ok('scanned PDF has no fabricated text',pg.evaluate('rows().length===0') and '文字を取得できない' in pg.locator('#pdf-page-help').inner_text())
 pg.locator('#menu [data-source="lx12"]').click();pg.locator('[data-pdf-surface]').click(position={'x':180,'y':100});ok('image PDF accepts page-coordinate anchor',pg.evaluate('entry("lx12").anchor.kind')=='point');point=pg.evaluate('JSON.stringify(entry("lx12"))');click('mode-without');click('mode-with');ok('coordinate anchor survives without-script mode',pg.evaluate('JSON.stringify(entry("lx12"))')==point)
 click('open-pdf');pg.locator('#pdf-file').set_input_files({'name':'bad.pdf','mimeType':'application/pdf','buffer':b'broken PDF'});pg.wait_for_function("document.querySelector('#pdf-message').textContent.includes('読み込めません')");ok('bad PDF cannot commit or change existing data',pg.locator('#pdf-apply').is_disabled() and pg.evaluate('JSON.stringify(entry("lx12"))')==point);click('pdf-cancel')
 click('open-pdf');pg.locator('#pdf-file').set_input_files(str(D/'password.pdf'));pg.wait_for_function("document.querySelector('#pdf-message').textContent.includes('パスワードが必要')");ok('protected PDF reports password without partial import',pg.locator('#pdf-apply').is_disabled());pg.locator('#pdf-import summary').click();pg.locator('#pdf-password').fill('test-stage');click('pdf-retry');pg.wait_for_function("!document.querySelector('#pdf-apply').disabled");commit();ok('correct password enables PDF import',pg.locator('#page-label').inner_text()=='1 / 2頁')
 prepare(D/'annotated.pdf');commit();pg.locator('#page-image').screenshot(path=str(R/'pdf-import-annotated.png'));ok('PDF annotations do not become extra executable cues',pg.evaluate('state.cues.length===1'))
 click('open-q-sheet');data='Cue,Department,Description,Trigger,Operator,Page,Source ID\r\nLX 33,LX,"灯り, 暗く",Bell,Aki,3,external-1\r\nSFX 7,Sound,鐘,GO,Ren,4,external-2\r\n';pg.locator('#q-file').set_input_files({'name':'other-app.csv','mimeType':'text/csv','buffer':data.encode()});pg.wait_for_function("document.querySelector('#csv-map').open")
 ok('generic CSV suggests matching English columns',pg.locator('#map-number').input_value()=='0' and pg.locator('#map-description').input_value()=='2');ok('CSV migration preserves unknown columns in preview', 'Source ID: external-1' in pg.locator('#map-body').inner_text() and 'Page: 3' in pg.locator('#map-body').inner_text());pg.locator('#csv-map').screenshot(path=str(R/'csv-migration-desktop.png'))
 click('map-apply');ok('mapped import is still an unapplied Q draft',pg.evaluate('state.cues.length===1') and pg.locator('#q-body tr').count()==3);click('q-apply');ok('applying migration adds IDs without changing old anchors',pg.evaluate('state.cues.length===3 && state.annotations.length===2'))
 click('open-q-sheet');pg.locator('#q-file').set_input_files({'name':'same.csv','mimeType':'text/csv','buffer':data.encode()});pg.wait_for_function("document.querySelector('#csv-map').open");ok('duplicate Q numbers are blocked before merge',pg.locator('#map-apply').is_disabled());pg.locator('#map-prefix').fill('旧-');ok('prefix resolves numbering collision with preview',pg.locator('#map-apply').is_enabled());click('map-cancel');click('q-close')
 for w,h in [(390,844),(844,390),(1440,900)]:
  pg.set_viewport_size({'width':w,'height':h});click('open-pdf');ok('PDF dialog fits viewport '+str(w),pg.locator('#pdf-import').bounding_box()['width']<=w and pg.evaluate('document.documentElement.scrollWidth<=innerWidth'));pg.locator('#pdf-import').screenshot(path=str(R/('pdf-import-modal-'+str(w)+'.png')));click('pdf-cancel')
 ok('no external file upload or dependency requests',not external);ok('no JavaScript page errors',not errors);b.close()
(R/'pdf-migration-checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'externalRequests':external},ensure_ascii=False,indent=2));print(json.dumps({'passed':len(checks),'errors':errors}))
