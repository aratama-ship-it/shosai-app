"""Render the second consolidated scene from its reviewable authoring draft."""
from pathlib import Path
import html
import json

HERE = Path(__file__).resolve().parent
data = json.loads((HERE / 'script.json').read_text())
visuals = json.loads((HERE.parent.parent / 'stage-visuals/layouts.json').read_text())
esc = html.escape
roles = {r['id']: r['name'] for r in data['roles']}
cues = {c['id']: c for c in data['cues']}
assert len(cues) == 11
assert len(roles) == data['performerCount'] == 10
assert data['sourceScenes'] == list(range(3, 11))
assert not data['appImportCompatible'] and not data['appliedToStageSketch']
assert [cid for phase in data['phaseGroups'] for cid in phase['cueIds']] == list(cues)
assert all(len(set(c['namedRoleIds'] + c['ensemblePerformerRoleIds'] + c['offstageVoiceRoleIds'])) <= 10 for c in cues.values())

def names(ids):
    return '、'.join(roles[i] for i in ids) or 'なし'

def keep_phrases(text):
    rendered = esc(text)
    for phrase in sorted(set(roles.values()) | {'マントヴァ', 'ヴェローナ', '一つの大場面', '四十二時間'}, key=len, reverse=True):
        rendered = rendered.replace(phrase, f'<span class="phrase">{phrase}</span>')
    return rendered

def render_line(line):
    text = '<br>'.join(keep_phrases(t) for t in line['text'].splitlines())
    attrs = f'id="{esc(line["id"])}" data-provenance="{esc(line["provenance"]["kind"])}"'
    if line['kind'] == 'action':
        return f'<p class="action" {attrs}>{text}</p>'
    label = {'assistant_bridge_dialogue': '補筆案', 'user_directed_dialogue_draft': '台詞案'}.get(line['provenance']['kind'])
    tag = f'<span class="addition">{label}</span>' if label else ''
    return f'<div class="dialogue" {attrs}><p class="speaker">{esc(line["speaker"])}{tag}</p><p class="words">{text}</p></div>'

parts = []
for number, phase in enumerate(data['phaseGroups'], 1):
    blocks = []
    for cid in phase['cueIds']:
        cue = cues[cid]
        sources = sorted({l['provenance']['sourceSampleId'] for l in cue['lines'] if l['provenance']['kind'] == 'existing_japanese_excerpt'})
        links = ' / '.join(f'<a href="../../scene-samples/#{sid}">旧{int(sid[-2:]):02}の下訳</a>' for sid in sources)
        if not links:
            links = '今回組み立てたつなぎのト書き'
        ensemble = f'<p>背を向ける七名：{esc(names(cue["ensemblePerformerRoleIds"]))}の各担当者。ここでは匿名の人々。</p>' if cue['ensemblePerformerRoleIds'] else ''
        if cue.get('ensembleDisplayNote'):
            ensemble = f'<p>{esc(cue["ensembleDisplayNote"])}</p>'
        voice = f'<p>舞台外の声：{esc(names(cue["offstageVoiceRoleIds"]))}</p>' if cue['offstageVoiceRoleIds'] else ''
        for offstage in cue.get('offstageVoices', []):
            assert set(offstage['performerPoolRoleIds']) <= set(roles)
            assert not set(offstage['performerPoolRoleIds']) & set(cue['namedRoleIds'])
            assignment = offstage.get('assignmentNote', '発声担当は既存出演者から選ぶ（未定）。')
            voice += f'<p>舞台外の声：{esc(offstage["label"])}。{esc(offstage["delivery"])} {esc(assignment)}</p>'
        frames = [f for f in visuals['frames'] if f['cueId'] == cid]
        first = frames[0]
        figure = f'<figure class="stage-preview"><a href="../../stage-visuals/#{esc(first["id"])}"><img src="../../stage-visuals/svg/{esc(first["id"])}-iso.svg" alt="{esc(first["title"])}。{esc(first["summary"])}" width="1100" height="680" loading="lazy"></a><figcaption><a href="../../stage-visuals/#{esc(first["id"])}">この配置を大きく見る・平面図へ（{len(frames)}図） →</a><br>{esc(first["title"])}／位置は検討案</figcaption></figure>'
        blocks.append(f'''<section class="cue" id="{esc(cid)}" aria-labelledby="heading-{esc(cid)}">
<header class="cue-head"><h3 id="heading-{esc(cid)}">{esc(cue['title'])}</h3><p class="place">{esc(cue['place'])}</p></header>
{figure}
<div class="script-lines">{''.join(render_line(l) for l in cue['lines'])}</div>
<details class="direction"><summary>演出メモ・登場人物</summary><div class="note-content">
<p>{esc(cue['directorNote'])}</p><p>この流れに登場：{esc(names(cue['namedRoleIds']))}。出入りの順はト書きに従う。</p>{ensemble}{voice}
<dl><div><dt>始める合図</dt><dd>{esc(cue['trigger'])}</dd></div><div><dt>次へ進む合図</dt><dd>{esc(cue['nextTrigger'])}</dd></div></dl>
<p class="source-links">{links}</p></div></details></section>''')
    parts.append(f'''<section class="movement" id="{esc(phase['id'])}"><header class="movement-head"><p class="eyebrow">第2場面の流れ · {number} / 3</p><h2>{esc(phase['title'])}</h2></header>{''.join(blocks)}</section>''')

phase_links = ''.join(f'<a href="#{esc(p["id"])}">{esc(p["title"])}</a>' for p in data['phaseGroups'])
proposals = ''.join(f'<li>{esc(p)}</li>' for p in data['newProposals'])
updates = ''.join(f'<li>{esc(item["direction"])}<br>{esc(item["draftNote"])}</li>' for item in data.get('directionUpdates', []))
updates_section = f'<h2>今回反映した演出</h2><ul>{updates}</ul>' if updates else ''
corrections = ''.join(f'<li>{esc(p)}</li>' for p in data['continuityCorrections'])
pending = ''.join(f'<li>{esc(p)}</li>' for p in data['pending'])

page = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>第2場面｜二人の約束から、届かない手紙へ</title>
<style>
:root{--bg:#efe7d6;--page:#fffaf0;--ink:#2b2620;--muted:#6a604e;--accent:#8f3e1e;--line:#75664f;--soft:#f7f0e2;--sans:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;--serif:"Hiragino Mincho ProN","Yu Mincho",serif;--tap:44px}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.85 var(--sans)}main{width:min(1000px,calc(100% - 32px));margin:32px auto;background:var(--page);border:1px solid var(--line)}a{color:var(--accent);text-underline-offset:4px}button,a,summary{-webkit-tap-highlight-color:transparent}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px}h1,h2,h3,p{margin:0}h1,h2,h3{font-family:var(--serif);font-weight:600}h1{font-size:clamp(29px,4.4vw,46px);line-height:1.55;margin:16px 0 24px}h1 span{display:inline-block}h2{font-size:clamp(26px,3.5vw,34px);line-height:1.5}h3{font-size:22px;line-height:1.6}.masthead{padding:48px 64px 32px}.back{display:inline-flex;align-items:center;min-height:var(--tap);font-size:14px}.eyebrow{font:700 13px/1.6 var(--sans);letter-spacing:.08em;color:var(--accent)}.masthead .eyebrow{margin-top:24px}.intro{font:19px/1.9 var(--serif);max-width:40em}.status{font-size:14px;color:var(--muted);margin-top:16px}.toolbar{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;padding:8px 64px;border-block:1px solid var(--line);background:var(--soft)}.toolbar a,.toolbar button{min-height:var(--tap);display:inline-flex;align-items:center;font-size:14px}.toolbar button{font-family:var(--sans);color:var(--accent);background:transparent;border:1px solid var(--line);padding:4px 12px;cursor:pointer}.phase-nav{display:flex;flex-wrap:wrap;gap:8px 24px;padding:16px 64px;border-bottom:1px solid var(--line)}.phase-nav a{display:inline-flex;align-items:center;min-height:var(--tap);font-weight:600;font-size:14px}.reading-note{padding:24px 64px;color:var(--muted);font-size:14px;border-bottom:1px solid var(--line)}.movement{padding:40px 64px 16px;scroll-margin-top:24px}.movement+.movement{border-top:2px solid var(--line)}.movement-head{margin-bottom:24px}.movement-head .eyebrow{margin-bottom:8px}.cue{padding-bottom:24px;scroll-margin-top:24px}.cue+.cue{padding-top:24px;border-top:1px solid var(--line)}.cue-head{margin-bottom:24px}.place{color:var(--muted);font-size:14px;margin-top:8px}.dialogue{display:grid;grid-template-columns:8em minmax(0,1fr);gap:24px;margin:24px 0}.speaker{font-size:14px;font-weight:700;line-height:1.85}.words{font:18px/1.95 var(--serif);line-break:strict;overflow-wrap:break-word}.action{margin:16px 0;padding:12px 16px;background:var(--soft);border-left:2px solid var(--line);font-size:15px;line-height:1.9}.addition{display:block;width:fit-content;margin-top:4px;font-size:12px;font-weight:400;color:var(--accent)}.direction{margin-top:16px;font-size:14px}.direction summary{min-height:var(--tap);padding:10px 0;cursor:pointer;color:var(--accent)}.note-content{padding:16px;background:var(--soft);border:1px solid var(--line)}.note-content p+p{margin-top:12px}.note-content dl{margin:16px 0}.note-content dl>div{display:grid;grid-template-columns:7em minmax(0,1fr);gap:16px;border-top:1px solid var(--line);padding:12px 0}.note-content dt{font-weight:700}.note-content dd{margin:0}.source-links a{display:inline-flex;min-height:var(--tap);align-items:center}.editorial{padding:32px 64px;border-top:1px solid var(--line);background:var(--soft)}.editorial>h2{font-size:24px}.editorial ul{padding-left:1.4em;margin:12px 0 24px}.editorial li+li{margin-top:8px}.editorial h3{font-size:18px;margin-top:24px}.editorial>p{font-size:14px;margin:16px 0}.editorial details{font-size:14px}.editorial summary{min-height:var(--tap);padding:10px 0;color:var(--accent);cursor:pointer}footer{padding:32px 64px;border-top:1px solid var(--line)}footer p{color:var(--muted);font-size:14px}footer nav{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:16px}footer a{display:inline-flex;align-items:center;min-height:var(--tap)}
@media(max-width:700px){main{width:100%;margin:0;border:0}.masthead{padding:24px 20px}.toolbar,.phase-nav{padding:12px 20px;gap:8px 16px}.reading-note,.editorial,footer{padding:24px 20px}.movement{padding:32px 20px 8px}.dialogue{grid-template-columns:minmax(0,1fr);gap:8px;margin:24px 0}.speaker{font-size:14px}.addition{display:inline;margin-left:12px}.words{font-size:17px}.action{padding:12px;font-size:14px}.note-content dl>div{grid-template-columns:1fr;gap:4px}.cue-head{margin-bottom:16px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{body,main{background:white}main{width:100%;margin:0;border:0}.back,.toolbar,.phase-nav,.direction,.editorial,footer{display:none}.masthead,.reading-note,.movement{padding:16px 0}.movement-head,.cue-head{break-after:avoid}.dialogue,.action{break-inside:avoid}.dialogue{grid-template-columns:8em 1fr}.words{font-size:12pt}.action,.speaker{font-size:10pt}.movement+.movement{break-before:page}}
.phrase{display:inline-block;white-space:nowrap}
.stage-preview{margin:16px 0 24px}.stage-preview img{display:block;width:100%;height:auto;border:1px solid var(--line)}.stage-preview figcaption{font-size:14px;color:var(--muted);padding-top:8px}.stage-preview figcaption a{display:inline-flex;align-items:center;min-height:44px}
</style></head><body><main data-artifact="RJ-COND-02-SCRIPT" data-version="2026-09-11-v5">
'''
page += f'''<header class="masthead"><a class="back" href="../#RJ-COND-02">← 3場面の統合構成へ</a><p class="eyebrow">ロミオとジュリエット / 第2場面</p><h1><span>二人の約束から、</span><span>届かない手紙へ</span></h1><p class="intro">{keep_phrases(data['premise'])}</p><p class="status">構成稿 · 本人推敲前 · 10名 · 上演尺は未設定<br>元の12場面の「3〜10」を、一つの大場面として読む台本です。</p></header>
<nav class="toolbar" aria-label="読むための操作"><button id="notes-toggle" type="button" aria-pressed="false">演出メモをすべて開く</button><button id="print-button" type="button">印刷する</button><a href="../../stage-visuals/#RJ-COND-02">舞台構成図</a><a href="script.json">構成データ</a><a href="../../direction-notes/">元の演出ノート</a></nav>
<nav class="phase-nav" aria-label="第2場面の三つの流れ">{phase_links}</nav>
<p class="reading-note">台詞は既存の下訳をもとに、演出指示に合わせて調整しています。「補筆案」「台詞案」は新しく用意した文言です。灰色がかった地の文章は動きとつなぎのト書きです。三つの見出しは、同じ場面の中での流れを示します。</p>
{''.join(parts)}
<section class="editorial">{updates_section}<h2>つなぐために補ったこと</h2><ul>{proposals}</ul><p>{esc(data['spatialConvention'])}</p><details><summary>元の資料との対応・これから決めること</summary><p>{esc(data['editorialPolicy'])}</p><h3>整合をそろえた箇所</h3><ul>{corrections}</ul><h3>これから決めること</h3><ul>{pending}</ul><p>内部キューは元の番号を保持しています。構成データに元の台詞の行番号と追加案の区別を記録しています。</p></details></section>
<footer><p>この台本は演出検討用の構成稿です。Stage Sketchへ取り込むための配置・秒数の設定はこれから行います。</p><nav><a href="../#RJ-COND-05">続き：第3場面「墓所と残された人々」</a><a href="../../script-book/">元の12場面の台本</a></nav></footer>
</main><script>
const toggle = document.querySelector('#notes-toggle');
const notes = [...document.querySelectorAll('.direction')];
function syncToggle() {{const allOpen = notes.every(note => note.open); toggle.setAttribute('aria-pressed', String(allOpen)); toggle.textContent = allOpen ? '演出メモをすべて閉じる' : '演出メモをすべて開く';}}
toggle.addEventListener('click', () => {{const open = !notes.every(note => note.open); notes.forEach(note => note.open = open); syncToggle();}});
notes.forEach(note => note.addEventListener('toggle', syncToggle));
document.querySelector('#print-button').addEventListener('click', () => window.print());
</script></body></html>'''
(HERE / 'index.html').write_text(page, encoding='utf-8')
print(f'Built scene 2: {len(cues)} internal cues, {len(data["phaseGroups"])} movements.')
