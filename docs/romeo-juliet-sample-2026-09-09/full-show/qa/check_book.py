"""Offline user-flow check; does not touch source dialogue or app state."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import json
import shutil
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent.parent
book=ROOT/'full-show/ロミオとジュリエット_通し上演稿_オフライン.html'
visual=ROOT/'stage-visuals/ロミオとジュリエット_舞台構成図_オフライン.html'
data=json.loads((ROOT/'full-show/show.json').read_text())
errors=[]
requests=[]
checks=[]
with TemporaryDirectory(prefix='rj-full-show-') as temp, sync_playwright() as pw:
    temp=Path(temp)
    copy=temp/book.name
    shutil.copy2(book,copy)
    saved=temp/visual.name
    shutil.copy2(visual,saved)
    browser=pw.chromium.launch()
    ctx=browser.new_context(offline=True,accept_downloads=True)
    page=ctx.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    allowed={copy.as_uri(),saved.as_uri()}
    page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http:','https:')) or (r.url.startswith('file:') and r.url.split('#')[0] not in allowed) else None)
    for width,height in [(1440,1000),(390,844)]:
        page.set_viewport_size(dict(width=width,height=height))
        page.goto(copy.as_uri())
        assert page.locator('.scene').count()==3
        assert page.locator('.cue').count()==19
        assert page.locator('.beat').count()==74
        assert page.locator('.dialogue').count()==47
        assert page.locator('img').count()==28
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(HERE/f'book-top-{width}.png'),full_page=False)
        # All internal cue destinations remain present and readable.
        for cue in data['cues']:
            assert page.locator('#'+cue['id']).count()==1
        page.get_by_role('button',name='台詞だけ',exact=True).click()
        assert not page.locator('.action').first.is_visible()
        assert page.locator('.dialogue').first.is_visible()
        page.get_by_role('button',name='進行表',exact=True).click()
        assert page.locator('.run-table').is_visible()
        page.locator('.run-table a').last.click()
        assert page.locator('#script').is_visible()
        page.get_by_role('button',name='技術メモを開く',exact=True).click()
        assert page.locator('.technical[open]').count()==19
        for detail in page.locator('.diagrams').all():
            detail.evaluate('(d)=>d.open=true')
        for img in page.locator('img').all():
            img.evaluate('(img)=>img.decode()')
        page.get_by_role('button',name='図を平面に切替',exact=True).click()
        for img in page.locator('img').all():
            img.evaluate('(img)=>img.decode()')
            assert img.evaluate('(img)=>img.src===img.dataset.plan')
        page.get_by_role('button',name='図を斜めに切替',exact=True).click()
        page.locator('#figure-RJ-COND-05-D-02').scroll_into_view_if_needed()
        page.screenshot(path=str(HERE/f'book-finale-{width}.png'),full_page=False)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.emulate_media(media='print')
        assert page.locator('.scene').count()==3
        assert page.locator('.action').first.is_visible()
        page.emulate_media(media='screen')
        checks.append(dict(width=width,cues=19,beats=74,dialogues=47,pairedDiagrams=28,overflow=False))
    with page.expect_download() as event:
        page.get_by_role('button',name='構成JSONを保存',exact=True).click()
    output=Path(event.value.path())
    exported=json.loads(output.read_text())
    assert exported['id']==data['id'] and exported['durationProposalSeconds']==1745
    assert exported==data
    # The old visual-book file now contains all three reading documents.
    page.goto(saved.as_uri())
    assert page.locator('[data-offline-doc="full-show/index.html"]').count()==1
    page.locator('[data-offline-doc="full-show/index.html"]').click()
    page.wait_for_function('document.querySelector("#saved-document iframe").dataset.ready==="full-show/index.html#"')
    inside=page.frame_locator('#saved-document iframe')
    assert inside.locator('.cue').count()==19
    assert inside.locator('.beat').count()==74
    assert page.locator('#saved-document iframe').evaluate('(f)=>f.contentDocument.documentElement.scrollWidth<=f.contentWindow.innerWidth')
    inside.get_by_role('button',name='台詞だけ',exact=True).click()
    assert not inside.locator('.action').first.is_visible()
    inside.get_by_role('button',name='通しで読む',exact=True).click()
    inside.get_by_role('link',name='第3場面',exact=True).click()
    assert inside.locator('#RJ-COND-05 h2').is_visible()
    inside.get_by_role('link',name='既存の舞台構成図帳へ',exact=True).click()
    assert not page.locator('#saved-document').is_visible()
    for frame in json.loads((ROOT/'stage-visuals/layouts.json').read_text())['frames']:
        for view in ['iso','plan']:
            page.evaluate('(args)=>{view=args[1];go(data.frames.findIndex(f=>f.id===args[0]));}',[frame['id'],view])
            page.locator('#stage-image').evaluate('(img)=>img.decode()')
    assert not errors,errors
    assert not requests,requests
    browser.close()

result=dict(status='PASS',bookSha256=hashlib.sha256(book.read_bytes()).hexdigest(),
            visualBookSha256=hashlib.sha256(visual.read_bytes()).hexdigest(),
            viewports=checks,networkDisabled=True,externalRequests=requests,jsErrors=errors,
            fullShowJsonExport='passed',embeddedFullShow='passed',
            legacy56Diagrams='passed',printScriptVisibility='passed')
(HERE/'browser-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('PASS: standalone book, 19 cues / 74 beats / 47 dialogue blocks, all diagram views, reading modes, JSON export, embedded book, print visibility and offline requests.')
