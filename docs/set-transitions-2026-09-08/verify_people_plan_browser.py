"""Local fixture prototype only. No product storage or external network."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
URL = 'http://127.0.0.1:8936/people-plan-trial-2026-09-09.html'
checks = []
errors = []

def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    assert condition, name

def ready(page):
    page.goto(URL)
    page.wait_for_function("document.documentElement.dataset.state === 'ready'")

def set_value(page, field, value):
    page.locator('#' + field).fill(value)
    page.locator('#' + field).press('Tab')

def text(page, selector):
    return page.locator(selector).inner_text()

def reset(page):
    page.locator('#reset').click()

def row(page, activity):
    return page.locator('#activity-table [data-row="' + activity + '"]').text_content()

try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        ready(page)
        check('normal completion 15 and zero slack', text(page, '[data-metric=end]') == '15秒' and text(page, '[data-metric=comparison]') == '余裕 0秒')
        check('one source row for shared carry, two person bars', page.locator('#activity-table [data-row=carry]').count() == 1 and page.locator('#timeline [data-activity=carry]').count() == 2)
        check('three physical people', page.locator('#timeline [data-person="person-A"]').count() > 0 and page.locator('#timeline [data-person="person-B"]').count() > 0 and page.locator('#timeline [data-person="person-C"]').count() > 0)
        check('zero wait is not a work bar', '待機なし' in row(page, 'wait-C') and page.locator('#timeline [data-activity="wait-C"]').count() == 0)
        page.screenshot(path=str(ROOT / 'people-plan-desktop-normal-2026-09-09.png'), full_page=True)
        set_value(page, 'appearance', '4')
        check('late appearance propagates to 18 and 3 shortage', text(page, '[data-metric=end]') == '18秒' and '3秒不足' in text(page, '[data-metric=comparison]'))
        check('C holds occupation during 8-11 wait', '8〜11秒（3秒）' in row(page, 'wait-C') and page.locator('#timeline [data-activity="wait-C"][data-person="person-C"]').count() == 1)
        page.locator('[data-code=shortfall] button').click()
        check('warning links to critical source including appearance', page.locator('#selection').is_visible() and page.locator('#selection [data-row="appearance-A"]').count() == 1 and page.locator('#timeline .selected[data-activity="appearance-A"]').count() == 1)
        check('warning detail receives keyboard focus', page.evaluate("document.activeElement.id") == 'selection')
        page.locator('#clear-selection').click()
        check('clear selection returns to heading', page.locator('#selection').is_hidden() and page.locator('#timeline .selected').count() == 0 and page.evaluate('document.activeElement.id') == 'issues-title')
        set_value(page, 'deadline', '12')
        check('18 versus 12 gives 6 shortage', '6秒不足' in text(page, '[data-metric=comparison]'))
        page.locator('#undo').click()
        check('undo restores deadline but keeps appearance edit', page.locator('#deadline').input_value() == '15' and page.locator('#appearance').input_value() == '4')
        page.locator('[data-preset=overlap]').click()
        check('preset resets previous conditions', page.locator('#appearance').input_value() == '0' and page.locator('#extra').input_value() == 'person-A')
        check('fixed extra work conflicts with put, hold, pickup', page.locator('[data-code=overlap]').count() == 3 and all(label in text(page, '#issues') for label in ['机を置く', '担当を続けて', '持ち直す']))
        check('conflicts do not silently reschedule work or imply validity', '6〜9秒（3秒）' in row(page, 'extra') and text(page, '[data-metric=end]') == '15秒' and '計画の成立を判断できません' in text(page, '#summary'))
        page.locator('[data-code=overlap] button').nth(1).click()
        check('overlap link selects wait and extra', page.locator('#selection [data-row="hold-A"]').count() == 1 and page.locator('#selection [data-row="extra"]').count() == 1)
        page.screenshot(path=str(ROOT / 'people-plan-desktop-overlap-2026-09-09.png'), full_page=True)
        page.locator('#extra').select_option('person-C')
        check('switching extra crew moves conflicts and clears selection', 'C：' in text(page, '#issues') and 'A：' not in text(page, '#issues') and page.locator('#selection').is_hidden())
        page.locator('#extra').select_option('person-B')
        check('B assignment yields conflicts with B tasks', 'B：' in text(page, '#issues') and 'C：' not in text(page, '#issues'))
        page.locator('#extra').select_option('unresolved')
        check('unknown extra retains activity without inventing crew bar', '担当未定' in row(page, 'extra') and page.locator('#timeline [data-activity=extra]').count() == 0 and page.locator('[data-code=assignment]').count() > 0)
        reset(page)
        page.locator('#join').select_option('unresolved')
        check('unknown join cannot become established plan', page.locator('[data-code=assignment]').count() == 4 and '元のCの仮値' in text(page, '#trial-note') and '計画の成立を判断できません' in text(page, '#summary'))
        check('unknown join removes only corresponding C slots, retains A', page.locator('#timeline [data-activity=exit][data-person="person-C"]').count() == 0 and page.locator('#timeline [data-activity=exit][data-person="person-A"]').count() == 1 and page.locator('#timeline [data-activity=platform][data-person="person-C"]').count() == 1)
        page.locator('#extra').select_option('person-C')
        check('unknown join with extra C preserves one C approach conflict', page.locator('[data-code=overlap]').count() == 1 and 'C：' in text(page, '[data-code=overlap]') and '担当未定' in row(page, 'pickup'))
        page.locator('[data-preset=unknown]').click()
        check('unknown Q13 does not keep old valid result', text(page, '[data-metric=end]') == '未定' and text(page, '[data-metric=comparison]') == '比較は未確定')
        check('known work remains while unknown ending is not drawn', '5〜7秒（2秒）' in row(page, 'put') and '10秒〜終了未定' in row(page, 'cue-wait') and page.locator('#timeline [data-activity=exit]').count() == 0 and 'Q13' in text(page, '#unplaced'))
        set_value(page, 'q13', '20')
        check('late cue extends both assigned waiting people', text(page, '[data-metric=end]') == '25秒' and '10〜20秒（10秒）' in row(page, 'cue-wait') and page.locator('#timeline [data-activity="cue-wait"]').count() == 2)
        set_value(page, 'q13', '0')
        check('early cue still awaits pickup readiness', text(page, '[data-metric=end]') == '15秒' and '10〜15秒' in row(page, 'exit'))
        set_value(page, 'deadline', '')
        check('unknown deadline preserves completion but comparison unknown', text(page, '[data-metric=end]') == '15秒' and text(page, '[data-metric=comparison]') == '比較は未確定')
        reset(page)
        set_value(page, 'appearance', '')
        check('unknown appearance preserves C arrival and withholds dependent work', text(page, '[data-metric=end]') == '未定' and text(page, '[data-metric=comparison]') == '比較は未確定' and '0〜6秒（6秒）' in row(page, 'platform') and '6〜8秒（2秒）' in row(page, 'walk-C') and '8秒〜終了未定' in row(page, 'wait-C') and page.locator('#timeline [data-activity=carry]').count() == 0)
        reset(page)
        set_value(page, 'put', '')
        check('unknown work duration preserves preceding carry', text(page, '[data-metric=end]') == '未定' and '2〜5秒（3秒）' in row(page, 'carry'))
        reset(page)
        set_value(page, 'put', '6')
        check('placement time six gives 18 total', text(page, '[data-metric=end]') == '18秒')
        set_value(page, 'appearance', '1.2')
        check('decimal input remains precise', text(page, '[data-metric=end]') == '19.2秒')
        for value in ['abc', '-1', '21', '0.01', '1e1']:
            set_value(page, 'appearance', value)
            check('invalid input blocks old results: ' + value, page.locator('#results').is_hidden() and page.locator('#input-error').is_visible() and page.locator('#appearance').get_attribute('aria-invalid') == 'true')
        page.locator('#undo').click()
        check('undo invalid draft returns last accepted conditions', page.locator('#appearance').input_value() == '1.2' and text(page, '[data-metric=end]') == '19.2秒' and page.locator('#input-error').is_hidden())
        page.reload()
        page.wait_for_function("document.documentElement.dataset.state === 'ready'")
        check('reload clears local trial changes', page.locator('#appearance').input_value() == '0' and text(page, '[data-metric=end]') == '15秒' and page.locator('#undo').is_disabled())
        check('no product persistence keys or databases written', page.evaluate('localStorage.length') == 0 and page.evaluate('async () => (await indexedDB.databases()).length') == 0)
        page.locator('#all-activities summary').click()
        page.locator('#activity-table [data-row="wait-C"] button').click()
        check('zero wait has accessible source detail', page.locator('#selection').is_visible() and '待機なし' in text(page, '#selection'))
        for width in [390, 1440]:
            page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 900})
            page.locator('[data-preset=overlap]').click()
            page.locator('#all-activities').evaluate('(el) => el.open = true')
            check(f'no page overflow with expanded rows at {width}', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            targets = page.locator('button,input,select,summary,a.file').evaluate_all('(els) => els.filter(el => el.getClientRects().length).filter(el => el.getBoundingClientRect().height < 43.9).map(el => el.textContent)')
            check(f'visible controls meet 44px at {width}', not targets)
            uncovered = page.locator('button').evaluate_all('''(els) => els.filter(el => el.checkVisibility() && !el.disabled).map(el => {
                el.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
                const r=el.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
                return {label:el.getAttribute('aria-label')||el.textContent, passed:hit===el||el.contains(hit)};
            })''')
            check(f'expanded details and warning button centers uncovered at {width}', len(uncovered) >= 23 and all(item['passed'] for item in uncovered))
            page.locator('#timeline').evaluate('(el) => el.scrollLeft = 100')
            previous = page.locator('#timeline').evaluate('(el) => el.scrollLeft')
            page.locator('[data-code=overlap] button').first.click()
            check(f'warning selection preserves timeline scroll at {width}', page.locator('#timeline').evaluate('(el) => el.scrollLeft') == previous)
            check(f'person names remain fixed during horizontal scroll at {width}', page.locator('.person-rail').evaluate("el => Math.abs(el.getBoundingClientRect().left - document.getElementById('timeline').getBoundingClientRect().left)<1") and text(page, '.person-rail').split() == ['A','B','C'])
            if width == 390:
                page.screenshot(path=str(ROOT / 'people-plan-mobile-overlap-2026-09-09.png'), full_page=True)
                page.locator('#timeline').evaluate("el => el.scrollIntoView({block:'center',behavior:'instant'})")
                page.screenshot(path=str(ROOT / 'people-plan-mobile-timeline-2026-09-09.png'))
        check('no unhandled runtime errors in valid flows', not errors)
        context.close()
        for scenario in ['stale-core', 'fixture-http-failure', 'fixture-mismatch', 'ui-load-failure']:
            fault = browser.new_context(viewport={'width': 390, 'height': 844})
            fp = fault.new_page()
            if scenario == 'stale-core':
                core = (ROOT / 'people-plan-core-2026-09-09.mjs').read_text().replace("export const VERSION = 'people-plan-2026-09-09-r2'", "export const VERSION = 'old'")
                fp.route('**/people-plan-core-2026-09-09.mjs*', lambda route: route.fulfill(status=200, content_type='text/javascript', body=core))
            elif scenario == 'fixture-http-failure':
                fp.route('**/shared-contract-fixture-2026-09-09.json*', lambda route: route.fulfill(status=503, body='unavailable'))
            elif scenario == 'fixture-mismatch':
                fp.route('**/shared-contract-fixture-2026-09-09.json*', lambda route: route.fulfill(status=200, content_type='application/json', body='{}'))
            else:
                fp.route('**/people-plan-ui-2026-09-09.mjs*', lambda route: route.abort())
            fp.goto(URL)
            fp.wait_for_function("document.documentElement.dataset.state === 'failed'")
            check(scenario + ' blocks controls and results', fp.locator('#appearance').is_disabled() and fp.locator('#extra').is_disabled() and fp.locator('#reset').is_disabled() and fp.locator('#results').is_hidden() and '操作を止めています' in text(fp, '#load-status'))
            fault.close()
        browser.close()
finally:
    result = {'url': URL, 'checks': checks, 'passed': sum(c['passed'] for c in checks), 'total': len(checks), 'runtimeErrors': errors}
    (ROOT / 'people-plan-browser-checks-2026-09-09.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': result['passed'], 'total': result['total'], 'runtimeErrors': errors}, ensure_ascii=False))
