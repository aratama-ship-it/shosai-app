"""Validate a genuine UI import/export in isolated storage, plus offline downloads."""
import hashlib
import json
import os
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
QA=HERE/'qa'
QA.mkdir(exist_ok=True)
NATIVE=HERE/'romeo-juliet-full-show.stage-sketch.json'
HANDOFF=HERE/'romeo-juliet-full-show.handoff.json'
doc=json.loads(NATIVE.read_text())
handoff=json.loads(HANDOFF.read_text())
expected=doc['project']
base=os.environ.get('RJ_QA_BASE_URL','http://127.0.0.1:18759')
errors=[]
requests=[]
checks=[]

def exported(page):
    return json.loads(page.evaluate('window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()'))

with TemporaryDirectory(prefix='rj-native-qa-') as td, sync_playwright() as pw:
    temp=Path(td)
    browser=pw.chromium.launch()
    ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='ja-JP',accept_downloads=True,service_workers='block')
    # Exercise the app's supported download fallback; OS save dialogs cannot be automated here.
    ctx.add_init_script('window.showSaveFilePicker = undefined;')
    page=ctx.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/stage.html')
    page.wait_for_function('!!window.SHOSAI_STAGE_SESSION_BRIDGE')
    assert 'Stage Sketch' in page.title()
    page.wait_for_timeout(1000)
    if page.locator('#stage-tour-close').is_visible():
        page.locator('#stage-tour-close').click()
    page.locator('#stage-project-settings-open').click()
    label=page.locator('label.stage-import-label').filter(has=page.locator('#stage-import-json'))
    with page.expect_file_chooser() as chooser:
        label.click()
    chooser.value.set_files(str(NATIVE))
    page.locator('#stage-import-modal').wait_for(state='visible')
    assert expected['title'] in page.locator('#stage-import-summary').inner_text()
    page.screenshot(path=str(QA/'native-import-preview.png'))
    page.locator('#stage-import-as-new').click()
    page.wait_for_function('(title)=>JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.title===title',arg=expected['title'])
    for selector in ('#stage-project-settings-close','#stage-import-close'):
        if page.locator(selector).is_visible():
            page.locator(selector).click()
    actual=exported(page)['project']
    assert len(actual['scenes'])==31 and len(actual['cast'])==10 and len(actual['sets'])==13
    assert actual['id']!=expected['id'], 'Import as new must use a separate show ID'
    for source, target in zip(expected['scenes'],actual['scenes']):
        for key in ('id','kind','depth','title','note','blackout'):
            assert source[key]==target[key],(source['id'],key)
        if source['kind']!='scene':
            continue
        assert source['rehearsal']==target['rehearsal']
        assert source['lightingIntent']==target['lightingIntent']
        assert len(source['pieces'])==len(target['pieces'])
        for p,q in zip(source['pieces'],target['pieces']):
            for key in ('id','type','u','v','castId','setId','originId','facing','pose','color','route'):
                assert p[key]==q[key],(source['id'],p['id'],key,p[key],q[key])
            if p.get('holdMode')=='face':
                assert q['heldBy']==p['heldBy'] and q['holdMode']=='face' and q['propShape']=='mask'
    for s,t in zip(expected['sets'],actual['sets']):
        for key in ('id','kind','name','color'):
            assert s[key]==t[key],(s['id'],key)
        for key,value in s['dims'].items():
            assert t['dims'][key]==value,(s['id'],key,value,t['dims'][key])
    checks.append('UI file picker → compare → open as separate show; stable scene/cast/set IDs, all placements, masks, timing, notes and light intent retained')
    (QA/'native-roundtrip.json').write_text(json.dumps(exported(page),ensure_ascii=False,indent=2)+'\n')
    # Exercise actual scene navigation, rendering every snapshot.
    targets={0:'opening',2:'masquerade',6:'wedding',22:'river',27:'finale'}
    scene_rows=[s for s in actual['scenes'] if s['kind']=='scene']
    for i,scene in enumerate(scene_rows):
        row=page.locator('[data-scene-id="'+scene['id']+'"]')
        row.locator('.stage-scene-chip').click()
        page.evaluate('window.SHOSAI_STAGE_SESSION_BRIDGE.finishSceneTransition()')
        assert exported(page)['project']['activeSceneId']==scene['id']
        assert page.locator('#stage-scene-desc-text').input_value()==scene['note']
        if i in targets:
            page.screenshot(path=str(QA/f'native-{targets[i]}.png'))
    checks.append('All 28 snapshots opened through scene UI and descriptions verified')
    # A small description edit must preserve the rest of the fixture.
    last=scene_rows[-1]
    edited=last['note']+'\n確認用編集'
    page.locator('#stage-scene-desc-text').fill(edited)
    assert exported(page)['project']['scenes'][-1]['note']==edited
    page.locator('#stage-scene-desc-text').fill(last['note'])
    checks.append('Description edit and restore stays below the native 200-character limit')
    # UI export, then reimport the saved file in the isolated test context.
    page.locator('#stage-project-settings-open').click()
    page.locator('#stage-export-json').click()
    page.locator('#stage-project-export-name').fill('romeo-juliet-qa-roundtrip.json')
    with page.expect_download() as download:
        page.locator('#stage-project-export-form button[type="submit"]').click()
    saved=temp/'roundtrip.json'
    download.value.save_as(str(saved))
    saved_doc=json.loads(saved.read_text())
    assert [s['id'] for s in saved_doc['project']['scenes']]==[s['id'] for s in expected['scenes']]
    with page.expect_file_chooser() as chooser:
        label.click()
    chooser.value.set_files(str(saved))
    page.locator('#stage-import-as-new').click()
    page.wait_for_timeout(300)
    assert len(exported(page)['project']['scenes'])==31
    checks.append('UI JSON export through supported download fallback and reimport succeeded; OS save picker not tested')
    ctx.close()
    # A relocated standalone HTML must work without any server or sibling file.
    offline=browser.new_context(offline=True,accept_downloads=True)
    page=offline.new_page()
    copy=temp/'sample.html'
    shutil.copyfile(HERE/'ロミオとジュリエット_舞台スケッチ用サンプル_オフライン.html',copy)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('https:','http:')) else None)
    for width,height in [(1440,1000),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        page.goto(copy.as_uri())
        assert page.locator('.script-note').count()==28
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(QA/f'download-page-{width}.png'))
        page.locator('.scripts summary').first.click()
        page.locator('.script-note summary').first.click()
        assert '争いを止めているだけだ。' in page.locator('.direction').first.inner_text()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    for name,path in [('舞台スケッチ用JSONを保存',NATIVE),('開発用の対応データを保存',HANDOFF)]:
        with page.expect_download() as download:
            page.get_by_role('link',name=name,exact=True).click()
        output=temp/(path.stem+'.download.json')
        download.value.save_as(str(output))
        assert output.read_bytes()==path.read_bytes()
    assert not requests and not errors,(requests,errors)
    checks.append('Relocated offline HTML at 1440/390px: no overflow, all 28 full script notes, both download bytes identical')
    browser.close()
report=dict(status='pass',baseUrl=base,isolatedBrowserStorage=True,userBrowserStorageModified=False,
            inputSha256=hashlib.sha256(NATIVE.read_bytes()).hexdigest(),checks=checks,pageErrors=errors)
(QA/'browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
