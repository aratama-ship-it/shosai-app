from pathlib import Path
import json, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch()
    report=[]
    for w,h in [(1440,900),(390,844)]:
        page=browser.new_page(viewport={'width':w,'height':h},service_workers='block')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        response=page.goto('http://127.0.0.1:18743/')
        assert response.status==200
        assert page.title()=='ロミオとジュリエット｜舞台スケッチ テスト資料'
        assert page.locator('h1').inner_text()=='ロミオとジュリエット'
        page.screenshot(path=str(ROOT/f'qa/overview-{w}.png'))
        summaries=page.locator('summary')
        for i in range(summaries.count()):
            summaries.nth(i).click()
            assert summaries.nth(i).evaluate('(e)=>e.parentElement.open')
        overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth')
        assert not overflow
        assert page.locator('[lang=en]').count()>20
        page.get_by_text('第1幕 第5場 — 出会いと手の接触 / The first meeting',exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(ROOT/f'qa/excerpt-{w}.png'))
        for i in range(summaries.count()):
            summaries.nth(i).click()
            assert not summaries.nth(i).evaluate('(e)=>e.parentElement.open')
        assert not errors
        report.append({'viewport':[w,h],'titleAndMarkerVerified':True,'detailsOpenClose':summaries.count(),'openDetailsOverflow':overflow,'pageErrors':errors})
        page.close()
    api=browser.new_context().request
    for rel in ['index.html','output/pdf/romeo-juliet-excerpts-ja-v1.pdf','output/pdf/romeo-juliet-excerpts-en-v1.pdf','sample-fixture.json']:
        r=api.get('http://127.0.0.1:18743/'+rel)
        assert r.ok and hashlib.sha256(r.body()).hexdigest()==hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()
    browser.close()
(ROOT/'qa/browser-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
