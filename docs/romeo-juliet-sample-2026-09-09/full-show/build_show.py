"""Build the full performance proposal and its standalone, offline reading book.

Run from any directory. score.json is the authoring source; show.json and the
two HTML files are generated. Existing dialogue, layouts and app state are read
only. All new blocking/timing remains an assistant proposal.
"""
from pathlib import Path
import base64
import copy
import hashlib
import html
import importlib.util
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

def read(path):
    return json.loads((ROOT / path).read_text())

score = read('full-show/score.json')
outline = read('condensed-show/outline.json')
script = read('condensed-show/scene-02/script.json')
visuals = read('stage-visuals/layouts.json')
samples = {s['id']: s for s in read('scene-samples/draft.json')['samples']}
roles = {r['id']: r['name'] for r in script['roles']}
roles['CREW'] = '大道具さん'
source_lines = {l['id']: l for c in script['cues'] for l in c['lines']}
outline_cues = {c['id']: (s, c) for s in outline['scenes'] for c in s['internalCues']}
assert list(outline_cues) == [c['id'] for c in score['cues']]
assert len(outline_cues) == 19 and len(outline['scenes']) == 3

spec = importlib.util.spec_from_file_location('rj_visual_renderer', ROOT/'stage-visuals/build_visuals.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
compiled = copy.deepcopy(score)
compiled.update(appImportCompatible=False, appliedToStageSketch=False,
                durationStatus='proposal_not_measured', performerCount=10,
                roles=script['roles'], curtainCallProposalSeconds=60)
compiled['sourceHashes'] = {
    p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
    for p in ['full-show/score.json', 'condensed-show/outline.json',
              'condensed-show/scene-02/script.json', 'scene-samples/draft.json',
              'stage-visuals/layouts.json', 'direction-notes/scene-notes.json']
}

all_ids = set()
def reserve(identifier):
    assert identifier not in all_ids, identifier
    all_ids.add(identifier)
    return identifier

clock = 0
for q, cue in enumerate(compiled['cues'], 1):
    reserve(cue['id'])
    scene, original = outline_cues[cue['id']]
    cue.update(number=q, title=original['label'], sceneId=scene['id'], sceneNumber=scene['number'],
               inheritedDirection=original['action'],
               startProposalSeconds=clock,
               endProposalSeconds=clock+cue['durationProposalSeconds'],
               nextCueId=compiled['cues'][q]['id'] if q<len(compiled['cues']) else None)
    clock = cue['endProposalSeconds']
    cue['frames'] = copy.deepcopy([f for f in visuals['frames'] if f['cueId']==cue['id']])
    assert cue['frames']
    for f in cue['frames']:
        f['sourceFrameId'] = f['id']
        f['layoutStatus'] = 'assistant_full_show_proposal'
        if f['cueId']=='RJ-COND-02-B':
            f['title'] = '見ない背中と中央のロレンス'
        if f['cueId']=='RJ-COND-02-C':
            for p in f['people']:
                if p['characterRoleId']=='ROMEO': p['facing']=90
                if p['characterRoleId']=='JULIET': p['facing']=270
        if f['cueId']=='RJ-COND-05-D':
            f['summary'] = ('中央のロレンスに乳母が最初に近づく。左の二人は動かない。'
                            if f['id'].endswith('-01') else
                            '乳母、ベンヴォーリオ、ジョン、両父親、二人の匿名の街の人が一人ずつ集まった後の配置。')
            for p in f['people']:
                if p['performerRoleId'] in ['NURSE','BENVOLIO','FRIAR_JOHN']:
                    rid=p['performerRoleId']
                    p.update(characterRoleId=rid,roleMode='named',name=roles[rid],
                             label={'NURSE':'Nu','BENVOLIO':'Be','FRIAR_JOHN':'Jo'}[rid])
        assert len({p['performerRoleId'] for p in f['people']}) == len(f['people']) <= 10
        occupied = {p['performerRoleId'] for p in f['people']}
        f['offstageRoleIds'] = [r['id'] for r in script['roles'] if r['id'] not in occupied]
    for b, beat in enumerate(cue['beats'], 1):
        beat['id'] = reserve(f'{cue["id"]}-FULL-B{b:02}')
        beat['status'] = 'assistant_staging_proposal'
        if beat.get('frameId'):
            assert beat['frameId'] in {f['id'] for f in cue['frames']}
        resolved = []
        for lid in beat.pop('sourceLines', []):
            original_line = source_lines[lid]
            assert original_line['kind']=='dialogue', lid
            resolved.append(dict(speakerRoleId=original_line.get('speakerRoleId') or 'CREW',
                                 text=original_line['text'],
                                 origin='existing_script', sourceLineId=lid,
                                 sourceProvenance=original_line['provenance']))
        for excerpt in beat.pop('excerpts', []):
            sample=samples[excerpt['sampleId']]
            ja=sample.get('userRevisionJa') or sample['jaDraft']
            a,z=excerpt['range']
            selected=ja.splitlines()[a-1:z]
            assert len(selected)==z-a+1
            speaker=roles[excerpt['speakerRoleId']]
            words=[]
            for line in selected:
                words.append(re.sub('^'+re.escape(speaker)+'[　 ]*', '', line).lstrip('　 '))
            resolved.append(dict(speakerRoleId=excerpt['speakerRoleId'],text='\n'.join(words),
                                 origin='existing_excerpt',sourceSampleId=excerpt['sampleId'],
                                 sourceLineRange=[a,z]))
        for line in beat.pop('dialogue', []):
            assert line['speakerRoleId'] in roles
            resolved.append(dict(**line, origin='new_dialogue_proposal'))
        for n,line in enumerate(resolved,1):
            line['id']=reserve(beat['id']+f'-D{n:02}')
            line['speaker']=roles[line['speakerRoleId']]
        beat['dialogue']=resolved

compiled['durationProposalSeconds']=clock
compiled['scenes']=[]
for scene in outline['scenes']:
    group=[c for c in compiled['cues'] if c['sceneId']==scene['id']]
    compiled['scenes'].append(dict(id=scene['id'],number=scene['number'],title=scene['title'],
                                  summary=scene['dramaticChange'],cueIds=[c['id'] for c in group],
                                  durationProposalSeconds=sum(c['durationProposalSeconds'] for c in group)))
assert len([f for c in compiled['cues'] for f in c['frames']])==28
assert len(compiled['roles'])==compiled['performerCount']==10
(HERE/'show.json').write_text(json.dumps(compiled,ensure_ascii=False,indent=2)+'\n')

e = html.escape
def words(value):
    escaped=e(value)
    for name in sorted(set(roles.values())|{'マントヴァ','ヴェローナ'},key=len,reverse=True):
        escaped=escaped.replace(name,f'<span class="name">{name}</span>')
    return escaped.replace('\n','<br>')
def time(sec):
    return f'{sec//60:02}:{sec%60:02}'
def items(seq):
    return '<ul>'+''.join(f'<li>{words(s)}</li>' for s in seq)+'</ul>'
def svg_uri(frame,view):
    svg=renderer.svg(frame,view).encode()
    return 'data:image/svg+xml;base64,'+base64.b64encode(svg).decode()

overview=''.join(f'<li><a href="#{s["id"]}"><strong>第{s["number"]}場面　{e(s["title"])}</strong><span>仮尺 {time(s["durationProposalSeconds"])}</span></a><p>{words(s["summary"])}</p></li>' for s in compiled['scenes'])
table_rows=''.join(f'<tr><th scope="row"><a href="#{c["id"]}">Q{c["number"]:02} {e(c["title"])}</a></th><td>{time(c["startProposalSeconds"])}–{time(c["endProposalSeconds"])}</td><td>{words(c["purpose"])}</td></tr>' for c in compiled['cues'])
parts=[]
for s in compiled['scenes']:
    cues_html=[]
    for c in [c for c in compiled['cues'] if c['sceneId']==s['id']]:
        beats_html=[]
        for b in c['beats']:
            dialogue=[]
            for l in b['dialogue']:
                tag={'new_dialogue_proposal':'補筆案','existing_script':'既存構成稿','existing_excerpt':'既存下訳の抜粋'}[l['origin']]
                cls='romeo' if l['speakerRoleId'] in ['ROMEO','BENVOLIO','MERCUTIO','MONTAGUE'] else 'juliet' if l['speakerRoleId'] in ['JULIET','TYBALT','CAPULET','NURSE'] else ''
                dialogue.append(f'<div class="dialogue" id="{l["id"]}" data-origin="{l["origin"]}"><p class="speaker {cls}">{words(l["speaker"])}<small>{tag}</small></p><p>{words(l["text"])}</p></div>')
            beats_html.append(f'<div class="beat" id="{b["id"]}"><p class="action"><span class="label">動き・つなぎ案</span>{words(b["action"])}</p>{"".join(dialogue)}</div>')
        diagrams=[]
        for f in c['frames']:
            cast='、'.join((roles[p['performerRoleId']]+'担当〈群〉') if p['roleMode']=='ensemble' else roles[p['characterRoleId']] for p in f['people'])
            off='、'.join(roles[r] for r in f['offstageRoleIds']) or 'なし'
            diagrams.append(f'<figure id="figure-{f["id"]}"><img src="{svg_uri(f,"iso")}" data-iso="{svg_uri(f,"iso")}" data-plan="{svg_uri(f,"plan")}" width="1100" height="680" alt="{e(f["title"])}。{e(f["summary"])}"><figcaption><strong>{words(f["title"])}</strong><br>舞台上 {len(f["people"])}名：{words(cast)}<br>この瞬間は袖：{words(off)}</figcaption></figure>')
        labels={'light':'照明案','music':'音楽・音案','body':'身体表現案','props':'小道具・兼任'}
        technique=''.join(f'<div><dt>{label}</dt><dd>{words(c["technical"][key])}</dd></div>' for key,label in labels.items())
        cues_html.append(f'<article class="cue" id="{c["id"]}" aria-labelledby="h-{c["id"]}"><header><p class="meta">Q{c["number"]:02} · 仮の経過 {time(c["startProposalSeconds"])}–{time(c["endProposalSeconds"])} · {time(c["durationProposalSeconds"])}<span class="cue-id">{c["id"]}</span></p><h3 id="h-{c["id"]}">{words(c["title"])}</h3><p class="purpose">{words(c["purpose"])}</p></header><div class="beats">{"".join(beats_html)}</div><p class="next"><strong>次へ進む合図</strong>{words(c["exit"])}</p><details class="technical"><summary>照明・音楽・小道具の案</summary><dl>{technique}</dl><p class="meta">土台にした演出：{words(c["inheritedDirection"])}</p></details><details class="diagrams"><summary>構成図と10名の居場所（{len(c["frames"])}図）</summary>{"".join(diagrams)}</details></article>')
    parts.append(f'<section class="scene" id="{s["id"]}"><header class="scene-heading"><p class="meta">第{s["number"]}場面 · 仮尺 {time(s["durationProposalSeconds"])}</p><h2>{words(s["title"])}</h2><p>{words(s["summary"])}</p></header>{"".join(cues_html)}</section>')

music_rows=''.join(f'<tr><th scope="row">{e(m["id"])} {e(m["name"])}</th><td>{words(m["idea"])}</td></tr>' for m in compiled['musicPlan'])
props_rows=''.join(f'<tr><th scope="row">{words(p["name"])}</th><td>{words(p["track"])}</td></tr>' for p in compiled['props'])
cast_rows=[]
for role in compiled['roles']:
    rid=role['id']
    if rid=='NURSE':
        note='約束・結婚は群衆または袖。名前のある乳母は仮死の発見・葬送・最後の集合。'
    elif rid in ['TYBALT','MERCUTIO']:
        note='決闘で死亡後、袖で役の小物を外す。第3場面では匿名の川と街の人。'
    elif rid=='BENVOLIO':
        note='制止、友人の支え、裁きの伝達、死の知らせ。墓所では川を兼任し、終幕で本人へ戻る。'
    elif rid=='FRIAR_JOHN':
        note='手紙を受け取り、届かず持ち帰る。終幕ではロレンスの右から一人ずつの集合へ。'
    else:
        note='名前のある役を演じていない時は群衆を兼任。各キューの構成図欄にその瞬間の役割を記載。'
    cast_rows.append(f'<tr><th scope="row">{words(role["name"])}</th><td>{words(note)}</td></tr>')
data_json=json.dumps(compiled,ensure_ascii=False).replace('<','\\u003c')
page=f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(compiled["title"])}</title>
<style>
:root{{--bg:#efe7d6;--paper:#fffaf0;--ink:#2b2620;--muted:#6a604e;--rule:#75664f;--soft:#f7f0e2;--red:#8f3e1e;--blue:#245963;--sans:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;--serif:"Hiragino Mincho ProN","Yu Mincho",serif;--body:17px;--small:14px;--h1:32px;--h2:26px;--h3:22px;--tap:44px;--gap:24px;--pagewidth:1120px;--pad:48px;--prose:48em}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:var(--body)/1.8 var(--sans)}}main{{max-width:var(--pagewidth);margin:auto;background:var(--paper);padding:var(--pad)}}h1,h2,h3{{font-family:var(--serif);line-height:1.5;margin:8px 0 16px}}h1{{font-size:var(--h1)}}h2{{font-size:var(--h2)}}h3{{font-size:var(--h3)}}h4{{font-size:18px;line-height:1.5}}p{{margin:12px 0;max-width:var(--prose)}}a{{color:var(--red);text-decoration:underline;text-underline-offset:4px;display:inline-flex;align-items:center;min-height:var(--tap)}}button,select{{font:16px/1.8 var(--sans);min-height:var(--tap);min-width:var(--tap);border:1px solid var(--rule);background:var(--paper);color:var(--ink);padding:8px 12px;cursor:pointer}}button[aria-pressed=true]{{background:var(--red);color:var(--paper)}}button:focus-visible,a:focus-visible,summary:focus-visible{{outline:3px solid var(--red);outline-offset:3px}}.name{{white-space:nowrap;display:inline-block}}.meta,small,figcaption{{font-size:var(--small);color:var(--muted);line-height:1.8}}.lede{{border-left:3px solid var(--red);padding:12px 16px;background:var(--soft)}}nav,.tools{{display:flex;gap:12px 24px;flex-wrap:wrap;padding:16px 0;border-block:1px solid var(--rule);margin:24px 0}}.tools{{gap:8px 12px}}.overview{{list-style:none;margin:24px 0;padding:0}}.overview li{{border-bottom:1px solid var(--rule);padding:16px 0}}.overview a{{display:flex;gap:16px;justify-content:space-between}}.overview a span{{white-space:nowrap;font-size:var(--small)}}.scene{{margin-top:48px}}.scene-heading{{border-top:3px solid var(--rule);padding-top:24px}}.cue{{margin-top:32px;padding-top:24px;border-top:1px solid var(--rule)}}.cue-id{{display:block;font-size:var(--small)}}.purpose{{color:var(--muted)}}.action{{padding:12px 16px;background:var(--soft);font-size:16px;margin:24px 0}}.label{{font-size:var(--small);display:block;color:var(--muted);margin-bottom:8px}}.dialogue{{display:grid;grid-template-columns:8em minmax(0,1fr);gap:24px;margin:24px 0}}.dialogue p{{margin:0}}.speaker{{font-weight:600}}.speaker small{{display:block;font-weight:400}}.romeo{{color:var(--red)}}.juliet{{color:var(--blue)}}.next{{border-left:3px solid var(--rule);padding:12px 16px;margin:24px 0}}.next strong{{display:block}}summary{{cursor:pointer;min-height:var(--tap);padding:8px 0;color:var(--red)}}details{{border-top:1px solid var(--rule);margin:12px 0}}dl>div{{display:grid;grid-template-columns:8em minmax(0,1fr);gap:16px;margin:16px 0}}dt{{font-weight:600}}dd{{margin:0}}figure{{margin:24px 0}}img{{display:block;width:100%;height:auto;border:1px solid var(--rule)}}figcaption{{margin-top:12px}}table{{border-collapse:collapse;width:100%;font-size:var(--small);table-layout:fixed}}td,th{{border-bottom:1px solid var(--rule);padding:12px;text-align:left;vertical-align:top;overflow-wrap:anywhere}}th{{font-weight:600}}table th:first-child{{width:30%}}.run-table th:first-child{{width:28%}}.run-table td:nth-child(2){{width:20%;white-space:nowrap}}.run-table a{{display:inline-flex}}li{{margin-bottom:12px}}.appendix{{margin-top:48px;border-top:3px solid var(--rule);padding-top:24px}}footer{{margin-top:32px;border-top:1px solid var(--rule);padding-top:24px}}[hidden]{{display:none!important}}body[data-mode=dialogue] .action,body[data-mode=dialogue] .next,body[data-mode=dialogue] .technical,body[data-mode=dialogue] .diagrams,body[data-mode=dialogue] .purpose{{display:none}}body[data-mode=run] #script{{display:none}}
@media(max-width:720px){{:root{{--pad:16px;--h1:28px;--h2:24px}}.dialogue,dl>div{{grid-template-columns:minmax(0,1fr);gap:8px}}.speaker small{{display:inline;margin-left:12px}}.overview a{{display:block}}.overview a span{{display:block}}.run-table th:first-child{{width:39%}}.run-table td:nth-child(2){{width:25%;white-space:normal}}td,th{{padding:8px}}.tools button{{flex:1 1 auto}}.overview p{{font-size:16px}}}}
@media print{{:root{{--body:11pt;--small:9pt;--pad:0px}}body,main{{background:white}}.tools,nav,.overview,#running-order,.appendix,footer,.diagrams,.technical{{display:none!important}}body[data-mode=run] #script{{display:block}}body[data-mode=dialogue] .action,body[data-mode=dialogue] .next{{display:block}}.scene+.scene{{break-before:page}}.dialogue,.action,.next{{break-inside:avoid}}h2,h3,header{{break-after:avoid}}.dialogue{{grid-template-columns:8em 1fr}}}}
details:not([open]) > :not(summary){{display:none}}
</style></head><body data-mode="all"><main data-artifact="RJ-FULL-SHOW-01" data-revision="{compiled["revision"]}">
<header><p class="meta">演出検討用 · 2026-09-11 · 本人推敲前</p><h1>ロミオとジュリエット<br>通し上演稿</h1><p>{words(compiled["premise"])}</p><p><strong><span class="name">3場面</span> / <span class="name">10名</span> / <span class="name">本編の仮尺 {time(clock)}</span> / <span class="name">休憩なし</span></strong></p><p class="lede">{words(compiled["readingPolicy"])}</p><p class="meta">{words(compiled["durationPolicy"])}</p></header>
<nav aria-label="3場面への移動">{''.join(f'<a href="#{s["id"]}">第{s["number"]}場面</a>' for s in compiled['scenes'])}<a href="#production">制作メモ</a></nav>
<div class="tools" role="group" aria-label="読むための操作"><button data-mode="all" aria-pressed="true">通しで読む</button><button data-mode="dialogue" aria-pressed="false">台詞だけ</button><button data-mode="run" aria-pressed="false">進行表</button><button id="notes-toggle" aria-pressed="false">技術メモを開く</button><button id="view-toggle" aria-pressed="false">図を平面に切替</button><button id="print">印刷</button><button id="download">構成JSONを保存</button><span id="status" role="status"></span></div>
<ol class="overview">{overview}</ol>
<details id="running-order"><summary>19キューの進行と仮尺</summary><p class="meta">累積時刻は尺の配分案。実際のGOは各キュー末尾の「次へ進む合図」に合わせます。</p><table class="run-table"><thead><tr><th>キュー</th><th>仮の経過</th><th>変化の狙い</th></tr></thead><tbody>{table_rows}</tbody></table></details>
<div id="script">{"".join(parts)}</div>
<section class="appendix" id="production"><h2>制作メモ</h2><p>{words(compiled["spatialConvention"])}</p>{items(compiled["productionNotes"])}<details><summary>音楽を通してつなぐ7つのモチーフ</summary><table><tbody>{music_rows}</tbody></table></details><details><summary>小道具と大道具の出入り</summary><table><tbody>{props_rows}</tbody></table></details><details><summary>10名の兼任と役への戻り方</summary><table><tbody>{''.join(cast_rows)}</tbody></table><p>舞台上の人数は各キューの構成図欄で確認できます。大道具担当の袖の声と設営作業は、俳優10名とは別のスタッフ業務です。</p></details><details><summary>原作・既存稿からの省略と脚色</summary>{items(compiled["adaptations"])}</details></section>
<footer><p>このHTMLだけで、台詞・動き・技術案・全28図の斜め／平面表示・JSON保存を利用できます。音源は未制作、舞台スケッチへの実取り込みは未実施です。</p><a href="../stage-visuals/">既存の舞台構成図帳へ</a></footer>
</main><script id="show-data" type="application/json">{data_json}</script><script>
const buttons=[...document.querySelectorAll('button[data-mode]')];
function mode(value){{document.body.dataset.mode=value;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===value)));if(value==='run')document.getElementById('running-order').open=true;}}
buttons.forEach(b=>b.addEventListener('click',()=>mode(b.dataset.mode)));
document.querySelectorAll('a[href^="#RJ-COND"]').forEach(a=>a.addEventListener('click',()=>{{if(document.body.dataset.mode==='run')mode('all');}}));
const notes=[...document.querySelectorAll('.technical')],toggle=document.getElementById('notes-toggle');
toggle.addEventListener('click',()=>{{const open=!notes.every(n=>n.open);notes.forEach(n=>n.open=open);toggle.textContent=open?'技術メモを閉じる':'技術メモを開く';toggle.setAttribute('aria-pressed',String(open));}});
let plan=false;document.getElementById('view-toggle').addEventListener('click',event=>{{plan=!plan;document.querySelectorAll('img[data-plan]').forEach(img=>img.src=img.dataset[plan?'plan':'iso']);event.target.textContent=plan?'図を斜めに切替':'図を平面に切替';event.target.setAttribute('aria-pressed',String(plan));}});
document.getElementById('print').addEventListener('click',()=>window.print());
document.getElementById('download').addEventListener('click',()=>{{const data=JSON.parse(document.getElementById('show-data').textContent);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{{type:'application/json'}}));const a=document.createElement('a');a.href=url;a.download='romeo-juliet-full-show-proposal.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById('status').textContent='構成JSONの保存を開始しました';}});
</script></body></html>'''
(HERE/'index.html').write_text(page)
(HERE/'ロミオとジュリエット_通し上演稿_オフライン.html').write_text(page)
print(f'Built full show: {len(compiled["scenes"])} scenes, {len(compiled["cues"])} cues, '
      f'{sum(len(c["beats"]) for c in compiled["cues"])} beats, 28 paired diagrams, {time(clock)} proposed.')
