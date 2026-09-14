from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':1100});pg.goto('http://127.0.0.1:8937/script-cues-2026-09-09/assignment-trial.html?v=4');pg.wait_for_function('!!fixture')
 pg.locator('#open-pdf').click();pg.locator('#pdf-file').set_input_files('/private/tmp/pdf-import-qa-20260909/three-pages-rotated.pdf');pg.wait_for_function("!document.querySelector('#pdf-apply').disabled");pg.locator('#pdf-apply').click();pg.wait_for_selector('[data-pdf-surface]');pg.wait_for_timeout(220)
 pg.locator('#menu [data-source="lx12"]').click();pg.locator('[data-pdf-surface]').focus();pg.keyboard.press('Enter');pg.locator('#pdf-text-choice').select_option(label='［二人は立ち止まる］');pg.locator('#pdf-text-assign').click();pg.locator('#next').click();pg.wait_for_selector('[data-pdf-surface]');pg.locator('#open-q-sheet').click();pg.get_by_role('button',name='台本で見る',exact=True).click();pg.wait_for_selector('[data-pdf-surface]');pg.wait_for_timeout(200)
 assert pg.evaluate('state.page===0 && state.selected==="lx12"');checks.append('Q sheet jumps to imported PDF page')
 assert pg.locator('[data-pdf-surface]').evaluate('e=>e===document.activeElement');checks.append('Q jump focuses PDF after asynchronous page display')
 rect=pg.locator('#pdf-highlight').bounding_box();scroll=pg.locator('#script-scroll').bounding_box();assert rect['y']>=scroll['y'] and rect['y']+rect['height']<=scroll['y']+scroll['height'];checks.append('Q jump scrolls the highlighted anchor into view')
 assert pg.evaluate('state.scene===3');checks.append('Q jump does not perform stage GO')
 pg.locator('#app').screenshot(path=str(R/'pdf-q-jump.png'));b.close()
(R/'pdf-q-jump-checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2));print({'passed':len(checks)})
