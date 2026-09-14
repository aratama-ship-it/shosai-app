"""Reproducible native Stage Sketch v3 export; never writes app code or browser storage."""
import base64
from copy import deepcopy
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REPO = ROOT.parent.parent
NATIVE = 'romeo-juliet-full-show.stage-sketch.json'
HANDOFF = 'romeo-juliet-full-show.handoff.json'
STAMP = '2026-09-11T00:00:00+09:00'

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def slug(value):
    return value.lower().replace('_', '-')

def mmss(value):
    return f'{value // 60}:{value % 60:02d}'

def base_scene(id, title, kind='scene'):
    return dict(id=id, title=title, kind=kind, depth=0 if kind == 'section' else 1,
                note='', background='#40362d', pieces=[], notes=[], strokes=[], arrows=[],
                studyBeatId=None, beat=None, rehearsal=None, lightingIntent=None,
                cueSeconds=None, audioTrackId=None, blackout=False)

def base_piece(id, type, u, v, color):
    return dict(id=id, type=type, u=u, v=v, color=color, size=100, name='',
                castId=None, setId=None, originId=None, facing=0, pose='stand',
                dims=None, route=None, base=0, supportId=None, beam=None, locked=False)

show = read(ROOT / 'full-show/show.json')
layouts = read(ROOT / 'stage-visuals/layouts.json')
for name, expected in show['sourceHashes'].items():
    assert sha(ROOT / name) == expected, f'Stale full-show source: {name}; rebuild the full show first.'
assert show['performerCount'] == 10 and len(show['scenes']) == 3 and len(show['cues']) == 19
roles = {r['id']: r['name'] for r in show['roles']}
cast_ids = {r: 'rj-cast-' + slug(r) for r in roles}
palette = layouts['familyPalette']
colors = {r: '#556044' if r == 'FRIAR_LAWRENCE' else '#655b4c' for r in roles}
for family in ('montagueSide', 'capuletSide'):
    for r in palette[family]['roles']:
        colors[r] = palette[family]['color']

cast = [dict(id=cast_ids[r], name=f'{i:02d} {name}担当', color=colors[r], heightCm=165,
             note='実演者未割当。名前は担当役の識別。匿名群衆も兼ねる。165cmは表示用仮値、実測ではない。'
                  + ('赤はロミオの友人側。モンタギュー家の血族ではない。' if r == 'MERCUTIO' else ''),
             locked=False)
        for i, (r, name) in enumerate(roles.items(), 1)]

sets = []
def add_set(id, name, kind, dims, color, shape=None):
    item = dict(id=id, name=name, kind=kind, dims=dims, color=color, note='演出図からの表示用仮寸法。実物未決定。',
                locked=False, flown=False, framed=False, estimated=True, confidence='unverified',
                sourceNote='RJ-FULL-SHOW-01 の仮案から変換。実物の測定値ではない。')
    if shape:
        item['propShape'] = shape
    sets.append(item)
    return id

bar_id = add_set('rj-set-bar', 'バー・カウンター（仮）', 'block', {'w':10.08,'d':0.65,'h':1.0}, '#8a7050')
shelf_id = add_set('rj-set-bar-shelf', '背面棚の見立て（仮）', 'wall', {'w':10.08,'d':0.3,'h':2.2}, '#655b4c')
bench_id = add_set('rj-set-low-seat', '低い腰掛け／墓所（仮）', 'bench', {'w':1.8,'d':0.65,'h':0.3}, '#8b98a1')
mask_ids = {r: add_set('rj-mask-'+slug(r), f'仮面 {i:02d}', 'prop', {'w':0.18,'d':0.08,'h':0.24}, '#efe7d6', 'mask')
            for i, r in enumerate(roles, 1)}
sets_by_id = {s['id']:s for s in sets}

def place_set(scene, set_id, u, v, holder=None):
    asset = sets_by_id[set_id]
    p = base_piece(scene['id']+'-'+set_id, asset['kind'], u, v, asset['color'])
    p.update(setId=set_id, originId=set_id, dims=deepcopy(asset['dims']), name=asset['name'])
    if asset.get('propShape'):
        p.update(propShape=asset['propShape'])
    if holder:
        p.update(heldBy=holder, holdMode='face', holdSide='R')
    scene['pieces'].append(p)

project = dict(id='romeo-juliet-full-show-sample', title='ロミオとジュリエット｜ショー全体サンプル',
               versionLabel='通しサンプル v1・要推敲', parentVersionId=None, sectionsNested=True,
               branchReason='2026-09-11時点の通し稿から、他システム開発用に書き出した編集可能な仮案。',
               createdAt=STAMP, venue='proscenium', venueSize='mid',
               venueDims={'width':12,'depth':9}, rehearsal={'version':1,'primaryMode':'ordered','soundtrack':None},
               audioTracks=[], cast=cast, sets=sets, rigs=[], scenes=[], activeSceneId=None)

mapping = []
script_blocks = []
native_cues = []
section_map = []
clock = 0
for dramatic in show['scenes']:
    section_id = 'rj-section-'+dramatic['id'].lower()
    section = base_scene(section_id, f"第{dramatic['number']}場面｜{dramatic['title']}", 'section')
    section['note'] = (dramatic['summary']+'\n12m×9m・身長165cmは表示用仮値。寸法・尺・転換は未稽古の提案。'
                       '\n担当者名で10名を固定識別。各配置の説明に、その場で演じる人物または匿名群衆を記録。')
    project['scenes'].append(section)
    section_map.append(dict(sourceSceneId=dramatic['id'], nativeSectionId=section_id,
                            number=dramatic['number'], title=dramatic['title'], nativeSceneIds=[]))
    for c in (x for x in show['cues'] if x['sceneId'] == dramatic['id']):
        buckets = {f['id']:[] for f in c['frames']}
        active_frame = c['frames'][0]['id']
        for beat in c['beats']:
            active_frame = beat.get('frameId', active_frame)
            assert active_frame in buckets
            buckets[active_frame].append(beat)
        count = len(c['frames'])
        # Split cue time in proportion to existing action blocks, retaining the exact cue total.
        weights = [max(1, len(buckets[f['id']])) for f in c['frames']]
        boundaries = [round(c['durationProposalSeconds']*sum(weights[:i])/sum(weights)) for i in range(count+1)]
        cue_scene_ids = []
        for i, frame in enumerate(c['frames']):
            sid = 'rj-frame-'+frame['id'].lower()
            scene = base_scene(sid, f"Q{c['number']:02d}"+(f'.{i+1}' if count>1 else '')+'｜'+frame['title'])
            frame_beats = buckets[frame['id']]
            seconds = boundaries[i+1]-boundaries[i]
            scene['beat'] = dict(role=c['purpose'], energy=None)
            scene['rehearsal'] = dict(holdDurationSeconds=seconds, transitionToNextSeconds=0)
            # Native facing is 0=audience, whereas source sketches use 0=upstage.
            for person in frame['people']:
                rid = person['performerRoleId']
                p = base_piece(sid+'-'+slug(rid), 'performer', person['u'], person['v'],
                               colors[rid] if person['roleMode']=='named' else palette['anonymousEnsemble'])
                p.update(castId=cast_ids[rid], originId=rid, name=person['name'][:24],
                         facing=(180-person['facing'])%360,
                         pose={'back':'stand','lie':'supine'}.get(person['pose'],person['pose']),
                         lookMode='plain', route=deepcopy(person.get('route')))
                if p['route']:
                    p['route'].setdefault('bu',round((p['u']+p['route']['u'])/2,6))
                    p['route'].setdefault('bv',round((p['v']+p['route']['v'])/2,6))
                scene['pieces'].append(p)
            if c['id'] in layouts['masqueradeInterior']['cueIds']:
                place_set(scene,bar_id,.5,.12)
                place_set(scene,shelf_id,.5,.025)
                for p in list(scene['pieces']):
                    if p['type']=='performer':
                        place_set(scene,mask_ids[p['originId']],p['u'],p['v'],p['id'])
            if c['id'] in ('RJ-COND-04-C',):
                place_set(scene,bench_id,.78,.63)
            if dramatic['number']==3:
                # Fixed tomb furniture, even when the source actors shift slightly at the end.
                place_set(scene,bench_id,.26,.77)
            scene['lightingIntent'] = dict(version=1,objective=c['purpose'],audienceFocus=frame['summary'],
                layers={'performer':{'intent':'separate','note':c['technical']['light']},
                        'background':{'intent':'unspecified','note':''},
                        'space':{'intent':'unspecified','note':''}},
                transition={'triggerType':'action','triggerNote':c['exit'],
                            'change':'blackout' if c['id']=='RJ-COND-01-B' else 'unknown',
                            'tempo':'instant' if c['id']=='RJ-COND-01-B' else 'unspecified'},
                mood='',referenceNote=c['id']+' / '+frame['id'],
                implementationNote='光の意図を保存。機材は未割当。光域はhandoff.jsonに元の相対座標で保存。',
                safetyStatus='not-assessed',sourceRefs=[])
            # Native blackout means an arrival blackout, so it belongs to the banquet entry.
            scene['blackout'] = c['id']=='RJ-COND-01-C' and i==0
            lines = [f"【推敲前のサンプル】第{dramatic['number']}場面／{c['id']}／配置{i+1}/{count}",
                     f"【今回の役】"+'、'.join(f"{list(roles).index(p['performerRoleId'])+1:02d}="+
                        ('匿名群衆' if p['roleMode']=='ensemble' else roles[p['performerRoleId']]) for p in frame['people']),
                     '【袖待機】'+('、'.join(roles[r]+'担当' for r in frame['offstageRoleIds']) or 'なし'),
                     '【図の時点】'+frame['summary']]
            for b in frame_beats:
                lines.append('〈動作案〉'+b['action'])
                for speech in b['dialogue']:
                    lines.append(('〈台詞・追加案〉' if speech['origin']=='new_dialogue_proposal' else '〈台詞・既存下訳〉')+
                                 speech['speaker']+'「'+speech['text']+'」')
                script_blocks.append(dict(id=b['id'],cueId=c['id'],nativeSceneId=sid,
                                          action=b['action'],status=b['status'],dialogue=deepcopy(b['dialogue'])))
            lines += ['【照明】'+c['technical']['light'],'【音楽案】'+c['technical']['music'],
                      '【身体】'+c['technical']['body'],'【道具】'+c['technical']['props'],
                      '【次へ】'+(c['exit'] if i==count-1 else '同一キュー内の次の配置へ。説明欄の動作でつなぐ。'),
                      f'【仮尺】{seconds}秒。キュー全体{c["durationProposalSeconds"]}秒を動作ブロック数で仮配分。転換は含む。',
                      '【座標】12m×9m基準・身長165cmは仮値。仮面以外の小道具と音源・灯体は未配置。',
                      '【原図ID】'+frame['id']]
            full_note='\n'.join(lines)
            anonymous=[f"{list(roles).index(p['performerRoleId'])+1:02d}" for p in frame['people'] if p['roleMode']=='ensemble']
            scene['note']=(f"【仮案】{frame['summary']}\n"+
                           ('匿名群衆='+ '/'.join(anonymous)+'。他は担当役。\n' if anonymous else '登場者は担当役。\n')+
                           f"{frame['id']}／仮{seconds}秒\n詳細台本・技術メモは付属HTML・対応JSON。")
            assert len(scene['note'])<=200, (sid,len(scene['note']))
            project['scenes'].append(scene)
            cue_scene_ids.append(sid)
            section_map[-1]['nativeSceneIds'].append(sid)
            mapping.append(dict(nativeSceneId=sid,nativeSectionId=section_id,sourceFrameId=frame['id'],
                                sourceCueId=c['id'],sourceSceneId=dramatic['id'],
                                startProposalSeconds=clock,endProposalSeconds=clock+seconds,
                                durationProposalSeconds=seconds,sourceBeatIds=[b['id'] for b in frame_beats],
                                fullDirectionNote=full_note,
                                offstageRoleIds=frame['offstageRoleIds'],
                                roleAssignments=[dict(performerRoleId=p['performerRoleId'],castId=cast_ids[p['performerRoleId']],
                                                      nativePieceId=sid+'-'+slug(p['performerRoleId']),
                                                      characterRoleId=p['characterRoleId'],roleMode=p['roleMode'],state=p.get('state'),
                                                      nativeColor=colors[p['performerRoleId']] if p['roleMode']=='named' else palette['anonymousEnsemble'])
                                                 for p in frame['people']]))
            clock+=seconds
        native_cues.append(dict(id=c['id'],displayNumber=c['number'],title=c['title'],sourceSceneId=c['sceneId'],
                               nativeSceneIds=cue_scene_ids,scriptBlockIds=[b['id'] for b in c['beats']],
                               startProposalSeconds=c['startProposalSeconds'],endProposalSeconds=c['endProposalSeconds'],
                               technical=c['technical'],exit=c['exit']))
assert clock==show['durationProposalSeconds']==1745
assert len(mapping)==28 and len(script_blocks)==74
project['activeSceneId']=mapping[0]['nativeSceneId']
doc=dict(kind='shosai-stage-sketch',version=3,project=project)
dump(HERE/NATIVE,doc)

handoff=dict(schema='romeo-juliet.stage-sketch-handoff.v1',revision=1,sampleId='RJ-STAGE-SAMPLE-FULL-01',
    status='editable_sample_not_final_staging',createdDate='2026-09-11',nativeFile=NATIVE,nativeSha256=sha(HERE/NATIVE),
    sourceRequest='他の関連で先に舞台スケッチのものとして書き出して準備をしたいです。後々また変えるかもしれませんが、舞台スケッチ上でのショーサンプルが他のシステム開発に現在必要なため',
    sourceHashes={str(p.relative_to(ROOT)):sha(p) for p in (ROOT/'full-show/show.json',ROOT/'stage-visuals/layouts.json')},
    nativeCodeHashes={n:sha(REPO/n) for n in ('stage-sketch.js','stage-venues.js','mcp-server/src/stage-model.js')},
    contract={
        'nativeFormat':'shosai-stage-sketch version 3; native app import JSON only',
        'hierarchy':'3 dramatic scenes are section rows at depth 0; 28 snapshots are editable scene rows at depth 1. 19 narrative cues remain here, not project.cues.',
        'scriptStorage':'Native scene.note stays <=200 characters because the current app edit handler truncates at 200. All 74 action blocks and 47 speech blocks, their provenance, and full direction notes remain in this handoff and the companion HTML.',
        'scriptAnchors':'Stable block IDs and source speech IDs retained here. No guessed PDF/page/character anchors; native script cue linkage is not implemented in this sample.',
        'coordinates':{'u':'0=audience left,1=audience right','v':'0=upstage,1=downstage','sourceFacing':'0=upstage,90=right,180=audience,270=left','nativeFacing':'0=audience,90=right,180=upstage,270=left','facingTransform':'(180-sourceFacing)%360'},
        'dimensions':{'referenceStageM':{'width':12,'depth':9},'measuredStageM':None,'actorHeightsMeasured':False,'displayHeightCm':165,'setDimensionsStatus':'display_proposal','venueHeight':'inherited preset 8m, not measured'},
        'timing':'1745s cue proposal, split by action block count with rounded cumulative boundaries. transitionToNextSeconds=0 is accounting, not zero physical transition. cueSeconds remains null (UI interpolation is separate).',
        'identity':'castId identifies one performer slot across all frames. characterRoleId may be null for anonymous ensemble. piece IDs differ by frame. Import as new changes project.id; map by stable scene IDs.',
        'labels':'Native canvas labels use registered cast.name, not per-scene character names. Numbered names identify the performer slot; scene.note states current role.',
        'poses':'back→stand+facing180; lie→supine (current browser enum; the older MCP placement enum calls this lie_back). Source poses retained in sourceShow.',
        'colors':'Native piece color applies familyPalette. Old raw colors in sourceShow.frames are archival input and must not be rendered without this palette. Ensemble uses neutral regardless of performer cast color.',
        'routes':'Straight source routes receive an explicit midpoint control point; otherwise the app inserts control coordinates 0.5/0.5 and changes the curve. Existing curve controls are retained.',
        'props':'13 native assets: 10 wearable masks, counter, shelf proxy, low bench. Swords, vial, letter, cup, dagger remain notes and props tracks; no holder assignments invented.',
        'lighting':'Intent only; no fixture pieces. Source lightPools retained. blackout flag is arrival only; banquet entry follows the opening exit blackout.',
        'audio':'No music files; audioTracks=[], soundtrack=null. Seven music concepts retained.',
        'ownership':'Import into a separate show. Edit/export from Stage Sketch for downstream work; rebuilding from authoring sources does not merge later app edits. Preserve exported edits before regeneration.',
        'roundTrip':'Unsupported custom project fields are dropped by native normalization. Always retain handoff.json with the native file; it is not imported into the app.',
        'implementationStatus':'Sample data only. No app code change, actual operator assignments, script cue product implementation, public distribution, or physical rehearsal validation.'},
    sections=section_map,cues=native_cues,frames=mapping,scriptBlocks=script_blocks,
    castMap=[dict(performerRoleId=r,castId=cast_ids[r],roleName=roles[r],actualPerformer=None) for r in roles],
    familyPalette=palette,sourceShow=show)
dump(HERE/HANDOFF,handoff)

# Reuse the established diagram renderer, without rebuilding its source documents.
spec=importlib.util.spec_from_file_location('rj_visuals',ROOT/'stage-visuals/build_visuals.py')
visuals=importlib.util.module_from_spec(spec)
spec.loader.exec_module(visuals)
E=html.escape
chunks=[]
for s in show['scenes']:
    related=[m for m in mapping if m['sourceSceneId']==s['id']]
    first=next(c['frames'][0] for c in show['cues'] if c['sceneId']==s['id'])
    rows=''.join(f'<tr><td>{mmss(m["startProposalSeconds"])}</td><td>{E(next(x["title"] for x in project["scenes"] if x["id"]==m["nativeSceneId"]))}</td><td>{m["durationProposalSeconds"]}秒</td></tr>' for m in related)
    scripts=''.join(f'<details class="script-note" id="{E(m["sourceFrameId"])}"><summary>{E(next(x["title"] for x in project["scenes"] if x["id"]==m["nativeSceneId"]))} の台本・演出</summary><div class="inside direction">{E(m["fullDirectionNote"])}</div></details>' for m in related)
    chunks.append(f'<section><h2>第{s["number"]}場面　{E(s["title"])}</h2><p>{E(s["summary"])}</p>'
                  f'<p class="meta">{len(related)}配置 · 仮尺 {mmss(s["durationProposalSeconds"])}</p>'
                  f'<details><summary>配置の一覧と参考図を見る</summary><div class="inside">{visuals.svg(first,"plan")}'
                  '<p class="meta">参考図は通し稿の原図。実際の舞台スケッチの画面では担当者名を表示します。</p>'
                  f'<div class="table"><table><thead><tr><th>仮の開始</th><th>配置</th><th>仮尺</th></tr></thead><tbody>{rows}</tbody></table></div></div></details>'
                  f'<details class="scripts"><summary>この場面の台詞と演出メモを読む</summary><div class="inside">{scripts}</div></details></section>')
data=lambda p:base64.b64encode(p.read_bytes()).decode()
page=f'''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ロミオとジュリエット｜舞台スケッチ用サンプル</title><style>
:root{{--bg:#efe7d6;--paper:#fffaf0;--ink:#2b2620;--muted:#6a604e;--line:#75664f;--red:#8f3e1e;--blue:#245963;--s:8px}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:17px/1.8 'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif}}
main{{max-width:1120px;margin:32px auto;padding:48px;background:var(--paper)}}h1,h2{{font-family:'Hiragino Mincho ProN','Yu Mincho',serif;line-height:1.5}}h1{{font-size:32px;margin:0 0 24px}}h2{{font-size:26px;margin:0 0 16px}}p{{max-width:48em}}section{{margin-top:32px;padding-top:24px;border-top:1px solid var(--line)}}
.meta{{font-size:14px;color:var(--muted)}}.stats{{display:flex;gap:24px;flex-wrap:wrap}}.stats span{{white-space:nowrap}}nav{{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}}
a,button,summary{{color:var(--blue)}}a{{text-decoration:underline;text-underline-offset:3px}}nav a,button,summary{{min-height:44px;padding:12px 16px;border:1px solid var(--line);font:inherit;background:var(--paper);cursor:pointer}}nav a:first-child{{background:var(--blue);color:var(--paper)}}:focus-visible{{outline:3px solid var(--red);outline-offset:3px}}
details:not([open])>:not(summary){{display:none}}details+details{{margin-top:12px}}summary{{font-weight:600}}.inside{{padding-top:16px}}.direction{{white-space:pre-wrap;max-width:48em;overflow-wrap:anywhere}}svg{{display:block;width:100%;height:auto}}.table{{overflow-x:auto}}table{{border-collapse:collapse;width:100%;font-size:14px}}th,td{{text-align:left;padding:12px;border-bottom:1px solid var(--line)}}th:first-child,td:first-child{{white-space:nowrap}}code{{overflow-wrap:anywhere;font-size:14px}}li{{margin:8px 0}}.red{{color:var(--red)}}.blue{{color:var(--blue)}}
@media(max-width:720px){{main{{margin:0;padding:24px 16px}}h1{{font-size:26px}}h2{{font-size:22px}}nav{{flex-direction:column}}.stats{{gap:12px 24px}}}}
</style><main><p class="meta">2026年9月11日時点 · 編集可能な開発用サンプル v1</p>
<h1>ロミオとジュリエット<br>舞台スケッチ用サンプル</h1>
<p>現在の通し稿を、舞台スケッチで読み込んで変更できる形式にまとめました。下のJSONを保存して、舞台スケッチの「読み込む」から開けます。</p>
<p class="stats"><span><b>3</b> 大場面</span><span><b>19</b> キュー</span><span><b>28</b> 配置</span><span><b>10</b> 名</span><span>仮尺 <b>29:05</b></span></p>
<nav aria-label="ファイルの保存"><a download="{NATIVE}" href="data:application/json;base64,{data(HERE/NATIVE)}">舞台スケッチ用JSONを保存</a><a download="{HANDOFF}" href="data:application/json;base64,{data(HERE/HANDOFF)}">開発用の対応データを保存</a></nav>
<p class="meta">このHTMLにも2つのJSONを埋め込んであります。サーバーやネット接続なしで保存できます。</p>
<section><h2>読み込み方</h2><ol><li>「舞台スケッチ用JSONを保存」を押します。</li><li>舞台スケッチで「ショー」の「読み込む」から、そのJSONを選びます。</li><li>比較画面の「別のショーとして開く」を選びます。</li></ol>
<p>3つの大場面はセクションとしてまとまり、その中に28枚の配置があります。物語を28場面に増やしたわけではなく、動きの要所を編集するための配置です。アプリ内には短い場面説明を入れ、台詞47ブロック・動作74ブロックはこのHTMLと開発用JSONに収録しています。</p>
<p><span class="red">赤＝ロミオ側</span>、<span class="blue">青＝ジュリエット側</span>。匿名群衆は中立色。10名は番号と担当役で固定し、その配置での役を説明欄に記録しています。</p></section>
{''.join(chunks)}
<section><h2>今回入っているもの</h2><p>人物の位置・向き・姿勢・既存の動線、舞踏会の仮面10枚、バーと背面棚、低い腰掛けを配置しました。背中の列、人の川、ロレンスを中心に集まる終幕も引き継いでいます。</p>
<p>照明はアプリの演出意図欄へ保存。音楽の7つの構想、薬・手紙・杯・剣などの扱いは、このHTMLと開発用データに残しています。音源・灯体と、仮面以外の小道具の駒は未配置です。</p>
<p>12m×9mの舞台、身長165cm、道具寸法は表示用の仮値です。29:05は未稽古の提案で、各配置への配分も仮置き。細かな転換と最終推敲は後から変更できます。</p></section>
<section><h2>開発へ渡すとき</h2><p>2つのJSONを一緒に渡してください。読み込み用JSONは舞台スケッチの現行形式。対応データは、元の3場面・19キュー・28配置・台詞のIDと出典を結びます。</p>
<details><summary>データの扱いと未実装の範囲</summary><div class="inside"><p>現行アプリの説明欄は編集時200文字までです。そこで短い説明だけをアプリに入れ、台詞とキューの構造は別添に保持しています。台本キューの専用機能は今回のサンプルには実装していません。アプリでの再書き出しには別添データは入りません。</p>
<p>「別のショーとして開く」ではショーIDが新しくなります。連携では保持される配置IDと人物のcastIdを使ってください。アプリ上で直した版をJSONで保存してから、元稿の再生成との差分を確認します。自動マージは行いません。</p>
<p>既存の台詞は改変せず、追加の台詞・動作は提案状態を継承。構成図の向きとアプリの向きは定義が違うため、角度を変換しています。実際の稽古尺と自動補間の再生秒数は分離しています。</p></div></details></section>
<p class="meta">正本参照：full-show/show.json、stage-visuals/layouts.json。再生成手順と検証結果は同じフォルダのREADME.md・QA.md。</p></main></html>'''
(HERE/'index.html').write_text(page,encoding='utf-8')
(HERE/'ロミオとジュリエット_舞台スケッチ用サンプル_オフライン.html').write_text(page,encoding='utf-8')
print(json.dumps({'native':NATIVE,'sections':3,'cues':19,'frames':len(mapping),'cast':len(cast),'sets':len(sets),
                  'durationSeconds':clock,'actionBlocks':len(script_blocks),
                  'speechBlocks':sum(len(b['dialogue']) for b in script_blocks),
                  'maxNativeNoteLength':max(len(s['note']) for s in project['scenes'])},ensure_ascii=False))
