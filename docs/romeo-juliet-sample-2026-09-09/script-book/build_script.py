"""Build a sequential reading copy from the canonical short script and direction notes."""

from pathlib import Path
import html
import json


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
samples_data = json.loads((ROOT / "scene-samples" / "draft.json").read_text(encoding="utf-8"))
notes_data = json.loads((ROOT / "direction-notes" / "scene-notes.json").read_text(encoding="utf-8"))
cast_data = json.loads((HERE / "cast.json").read_text(encoding="utf-8"))
samples = {sample["id"]: sample for sample in samples_data["samples"]}
scenes = sorted(notes_data["scenes"], key=lambda scene: scene["outlineId"])

assert len(samples) == 12
assert len(scenes) == 12
assert len({scene["id"] for scene in scenes}) == 12
assert all(scene["scriptSampleId"] in samples for scene in scenes)
assert all(samples[scene["scriptSampleId"]]["outlineId"] == scene["outlineId"] for scene in scenes)
assert not notes_data["appImportCompatible"] and not notes_data["appliedToStageSketch"]
cast_roles = [role for group in cast_data["groups"] for role in group["roles"]]
roles_by_id = {role["id"]: role for role in cast_roles}
assert cast_data["summary"]["performerCount"] == len(cast_roles) == cast_data["summary"]["namedRoles"] == 10
assert len({role["id"] for role in cast_roles}) == len(cast_roles)
assert sum(bool(role["dialogueScenes"]) for role in cast_roles) == cast_data["summary"]["speakingRoles"] == 9
assert all(1 <= number <= 12 for role in cast_roles for number in role["scenes"])
assert cast_data["summary"]["actorAssignments"] is None
assert cast_data["summary"]["dedicatedEnsembleCount"] == 0
assert cast_data["summary"]["ensemblePerformedByNamedCast"] is True
assert cast_data["summary"]["namedRoleDoublingRequired"] is False

esc = html.escape
noted_count = sum(bool(scene["entryIds"]) for scene in scenes)


def scene_numbers(numbers):
    return "・".join(f"{number:02}" for number in numbers) if numbers else "なし"


def cue_clock(seconds):
    minutes, remainder = divmod(seconds, 60)
    return f"{minutes}:{remainder:02d}"


cast_groups = []
for group in cast_data["groups"]:
    cards = []
    for role in group["roles"]:
        note = f'<p class="role-note">{esc(role["performanceNote"])}</p>' if role.get("performanceNote") else ""
        cards.append(f'''<article class="cast-card">
          <h3>{esc(role['name'])}</h3><p class="affiliation">{esc(role['affiliation'])}</p>
          <p>{esc(role['function'])}</p>
          <dl><div><dt>登場場面</dt><dd>{scene_numbers(role['scenes'])}</dd></div>
          <div><dt>台詞あり</dt><dd>{scene_numbers(role['dialogueScenes'])}</dd></div>
          <div><dt>動きのみ</dt><dd>{scene_numbers(role['actionOnlyScenes'])}</dd></div></dl>{note}
        </article>''')
    cast_groups.append(f'<section class="cast-group"><h3>{esc(group["label"])}</h3><div class="cast-grid">{"".join(cards)}</div></section>')

ensemble = cast_data["ensemble"]
ensemble_functions = "".join(f'<li>{esc(item)}</li>' for item in ensemble["functions"])
uncast_items = "".join(
    f'<li><strong>{esc(item["name"])}</strong><span>{esc(item["note"])}</span></li>'
    for item in cast_data["notCurrentlyCast"]
)
cast_block = f'''<section class="cast" id="cast" aria-labelledby="cast-heading">
  <div class="cast-heading"><div><p class="eyebrow">現在の役柄</p><h2 id="cast-heading">配役一覧</h2></div>
  <p>上演人数は<strong>{cast_data['summary']['performerCount']}名</strong>です。10名が名前のある10役を一人一役で担当し、その場面で名前のある役を演じていない人がアンサンブルを兼任します。台詞のある役は{cast_data['summary']['speakingRoles']}役、動きだけの役は{cast_data['summary']['silentNamedRoles']}役です。俳優名と役の割当は未決定です。</p></div>
  {''.join(cast_groups)}
  <section class="ensemble-card"><h3>{esc(ensemble['name'])}</h3><p class="status">10名が場面ごとに兼任 · 専任アンサンブル0名</p><ul>{ensemble_functions}</ul></section>
  <details class="uncast"><summary>現在は独立した配役にしていない原作人物</summary><ul>{uncast_items}</ul></details>
</section>'''

toc = "".join(
    f'<li><a href="#{esc(scene["id"])}"><span>{scene["outlineId"]:02}</span>{esc(scene["title"])}</a></li>'
    for scene in scenes
)

articles = []
for scene in scenes:
    sample = samples[scene["scriptSampleId"]]
    script_text = sample["userRevisionJa"] if sample.get("userRevisionJa") is not None else sample["jaDraft"]
    script_status = "本人の保存済み改稿" if sample.get("userRevisionJa") is not None else "AI下訳／最終推敲前"
    if scene["entryIds"]:
        direction_rows = "".join(
            f'<div><dt>{esc(item["label"])}</dt><dd>{esc(item["text"])}</dd></div>'
            for item in scene["directionItems"]
        )
        unresolved = "".join(f'<li>{esc(item)}</li>' for item in scene["unresolved"])
        unresolved_block = (
            f'<details class="unresolved"><summary>これから決めること</summary><ul>{unresolved}</ul></details>'
            if unresolved
            else ""
        )
        direction_panel = f'''<aside class="direction-panel" aria-label="第{scene['outlineId']}場面の演出メモ">
          <p class="status">現在の演出メモ</p>
          <p class="direction-summary">{esc(scene['summary'])}</p>
          <details class="direction-details"><summary>演出の詳細</summary><dl>{direction_rows}</dl></details>
          {unresolved_block}
        </aside>'''
    else:
        direction_panel = '''<aside class="direction-panel direction-pending">
          <p class="status">演出メモはこれから</p>
          <p>短い台詞と場面の状況だけを掲載しています。</p>
        </aside>'''
    blocking_html = ""
    if (scene.get("stageSketchHandoff") or {}).get("blockingPlanRef"):
        plan_path = ROOT / "direction-notes" / scene["stageSketchHandoff"]["blockingPlanRef"]
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        assert plan["sceneId"] == scene["id"]
        assert plan["status"] == "assistant_decision_authorized_by_user_unrehearsed"
        assert len(plan["cornerPairs"]) == 4 and len(plan["cueSnapshots"]) == 4
        cue_a = plan["cueSnapshots"][0]
        assert cue_a["id"] == "RJ01-A" and len(cue_a["positions"]) == 10
        palette = {item["roleId"]: item for item in plan["castPalette"]}
        markers = []
        position_rows = []
        for position in cue_a["positions"]:
            role_id = position["roleId"]
            role = roles_by_id[role_id]
            color = palette[role_id]["color"]
            assert 0 <= position["u"] <= 1 and 0 <= position["v"] <= 1
            assert len(color) == 7 and color.startswith("#")
            x_m = (position["u"] - 0.5) * plan["referenceStage"]["widthM"]
            y_m = (position["v"] - 0.5) * plan["referenceStage"]["depthM"]
            x_label = f"客席左 {abs(x_m):.2f}m" if x_m < 0 else f"客席右 {x_m:.2f}m" if x_m > 0 else "中央"
            y_label = f"舞台奥 {abs(y_m):.2f}m" if y_m < 0 else f"舞台前 {y_m:.2f}m" if y_m > 0 else "奥行中央"
            markers.append(
                f'<span class="stage-marker" style="--u:{position["u"] * 100:.0f}%;--v:{position["v"] * 100:.0f}%;--marker:{color}" '
                f'aria-label="{esc(role["name"])}役の俳優、u={position["u"]:.2f}、v={position["v"]:.2f}" title="{esc(role["name"])}役の俳優">'
                f'{esc(palette[role_id]["shortLabel"])}</span>'
            )
            position_rows.append(
                f'<tr><th scope="row">{esc(role["name"])}</th><td>{position["u"]:.2f} / {position["v"]:.2f}</td><td>{esc(x_label)} / {esc(y_label)}</td></tr>'
            )
        pair_cards = []
        for pair in plan["cornerPairs"]:
            names = " × ".join(roles_by_id[role_id]["name"] + "役" for role_id in pair["roleHolders"])
            minutes, seconds = divmod(pair["endAtSeconds"], 60)
            pair_cards.append(f'''<article class="pair-card">
              <p class="pair-region">{esc(pair['regionLabel'])} · {minutes}:{seconds:02d}ごろ</p>
              <h4>{esc(names)}</h4>
              <p><strong>{esc(pair['outcomeLabel'])}</strong>。{esc(pair['resolution'])}</p>
              <p class="meta">{esc(pair['movementQuality'])}</p>
            </article>''')
        timeline_items = ""
        for beat in plan["timing"]["beats"]:
            start = cue_clock(beat["fromSeconds"])
            end = cue_clock(beat["toSeconds"])
            clock = start if start == end else f"{start}〜{end}"
            timeline_items += f'<li><strong>{clock}</strong><span>{esc(beat["label"])}</span></li>'
        artifact = scene["stageSketchHandoff"]["artifact"]
        blocking_html = f'''<section class="blocking-plan" aria-labelledby="blocking-heading-{esc(scene['id'])}">
          <div class="blocking-heading"><div><p class="eyebrow">第1場面の仮ブロッキング</p><h3 id="blocking-heading-{esc(scene['id'])}">四隅4組と中央2名</h3></div>
          <p><strong>約3分</strong>の仮配分／AI整理・未稽古。中央二役以外の役名は俳優枠の識別で、この場面では匿名の群衆役です。</p></div>
          <div class="blocking-layout">
            <figure class="stage-figure"><div class="stage-map" role="img" aria-label="12メートル掛ける9メートルの基準舞台。四隅に二人ずつ、中央にベンヴォーリオとティボルト。">
              <span class="stage-edge upstage">舞台奥</span><span class="stage-edge audience">舞台前・客席</span>
              <span class="stage-zone ul">奥・客席左</span><span class="stage-zone ur">奥・客席右</span>
              <span class="stage-zone dl">手前・客席左</span><span class="stage-zone dr">手前・客席右</span>
              <span class="focus-zone" aria-hidden="true"></span>{''.join(markers)}
            </div><figcaption>A｜0:00の配置。uは客席左から右、vは舞台奥から前へ0〜1。</figcaption></figure>
            <div class="highlight-summary"><p class="highlight-lead">四隅を同時に動かし、三組が順に収束。最後に中央だけが動きます。</p>
              <ol class="blocking-timeline">{timeline_items}</ol></div>
          </div>
          <details class="pair-details"><summary>四隅4組の内訳を見る</summary><div class="pair-grid">{''.join(pair_cards)}</div></details>
          <details class="position-details"><summary>10名の基準座標を見る</summary><div class="position-table-wrap"><table><thead><tr><th>俳優枠</th><th>u / v</th><th>12m×9m換算</th></tr></thead><tbody>{''.join(position_rows)}</tbody></table></div></details>
          <p class="blocking-note">3:00、最後の一組が止まる瞬間に中央の最初の一手を出し、即ブラックアウト。座標と動線は検討用です。</p>
          <a class="artifact-link" href="{esc(artifact['path'], quote=True)}" download>Stage Sketch v{artifact['version']} 下書きJSONを保存</a>
          <p class="meta">生成・スキーマ検証済み／Stage Sketchには未取り込み</p>
        </section>'''
    articles.append(f'''<article class="scene" id="{esc(scene['id'])}">
      <header class="scene-heading">
        <p class="scene-number">場面 {scene['outlineId']:02}</p>
        <h2>{esc(scene['title'])}</h2>
        <p class="source-scene">{esc(scene['sourceActScene'])}</p>
      </header>
      <p class="scene-context"><strong>状況</strong>{esc(scene['storyContext']['text'])}</p>
      <div class="scene-grid">
        <section class="script-panel" aria-labelledby="script-{esc(scene['id'])}">
          <div class="script-heading"><h3 id="script-{esc(scene['id'])}">台本</h3><p>{esc(script_status)} · 台詞・ト書き {sample['lineCount']}行</p></div>
          <pre class="script-text">{esc(script_text)}</pre>
        </section>
        {direction_panel}
      </div>
      {blocking_html}
      <a class="back-link" href="#contents">場面一覧へ戻る</a>
    </article>''')

css = """
:root{--paper:#efe7d6;--page:#fffaf0;--ink:#2b2620;--muted:#6a604e;--accent:#8f3e1e;--line:#75664f;--soft:#f7f0e2;--s1:8px;--s2:12px;--s3:16px;--s4:24px;--s5:32px;--s6:48px;--body:16px;--lead:18px;--h1:36px;--h2:28px;--h3:18px;--meta:14px;--width:1180px;--tap:44px}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:var(--body)/1.8 "Hiragino Sans","Yu Gothic",system-ui,sans-serif}main{max-width:var(--width);margin:auto;background:var(--page);min-height:100vh}.book-header{padding:var(--s6) var(--s5) var(--s5);border-bottom:1px solid var(--line)}.eyebrow,.meta,.source-scene,.script-heading p{font-size:var(--meta);line-height:1.75;color:var(--muted)}h1{font-size:var(--h1);line-height:1.4;margin:var(--s1) 0 var(--s3)}h2{font-size:var(--h2);line-height:1.45;margin:0}h3{font-size:var(--h3);line-height:1.5;margin:0}.intro{font-size:var(--lead);max-width:46em;margin:0 0 var(--s3)}.notice{max-width:52em;padding:var(--s3);border-left:3px solid var(--accent);background:var(--soft)}a{color:var(--accent);text-underline-offset:4px}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.toolbar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2);padding:var(--s2) var(--s5);border-bottom:1px solid var(--line);background:rgba(255,250,240,.97)}button{min-height:var(--tap);padding:8px 14px;border:1px solid var(--line);border-radius:0;background:var(--page);color:var(--ink);font:inherit;cursor:pointer}button[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);font-weight:700}.toolbar a{display:inline-flex;align-items:center;min-height:var(--tap)}.toolbar a:last-child{margin-left:auto}.cast{padding:var(--s5);border-bottom:1px solid var(--line);scroll-margin-top:72px}.cast-heading{display:grid;grid-template-columns:minmax(14em,.55fr) minmax(0,1fr);gap:var(--s5);align-items:end;margin-bottom:var(--s4)}.cast-heading p{margin:0;max-width:44em}.cast-group{margin-top:var(--s4)}.cast-group>h3{margin-bottom:var(--s2);color:var(--muted)}.cast-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s3)}.cast-card{padding:var(--s3);border:1px solid var(--line)}.cast-card h3{font-size:20px}.cast-card p{margin:var(--s1) 0 var(--s2)}.cast-card .affiliation{font-size:var(--meta);color:var(--muted)}.cast-card dl>div{display:grid;grid-template-columns:5.5em 1fr;gap:var(--s2);padding:var(--s1) 0}.cast-card .role-note{font-size:var(--meta);color:var(--muted)}.ensemble-card{margin-top:var(--s4);padding:var(--s3);border:1px solid var(--accent)}.ensemble-card .status{display:inline-block;margin:var(--s1) 0;padding:2px var(--s1);border:1px solid var(--line);color:var(--muted);font-size:var(--meta)}.ensemble-card ul{columns:2;column-gap:var(--s5);padding-left:var(--s4)}.ensemble-card li{break-inside:avoid;margin-bottom:var(--s1)}.uncast{margin-top:var(--s3);border-top:1px solid var(--line)}.uncast ul{list-style:none;padding:0}.uncast li{display:grid;grid-template-columns:12em 1fr;gap:var(--s3);padding:var(--s2) 0;border-top:1px solid var(--line)}.contents{padding:var(--s5);border-bottom:1px solid var(--line)}.contents h2{font-size:22px;margin-bottom:var(--s3)}.contents ol{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s1) var(--s4);list-style:none;margin:0;padding:0}.contents a{display:grid;grid-template-columns:2.4em 1fr;align-items:center;min-height:var(--tap);text-decoration:none;border-bottom:1px solid var(--line)}.contents a span{color:var(--accent);font-variant-numeric:tabular-nums}.scene{padding:var(--s6) var(--s5);border-bottom:1px solid var(--line);scroll-margin-top:72px}.scene-heading{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:var(--s3);margin-bottom:var(--s3)}.scene-number{margin:0;color:var(--accent);font-weight:700}.source-scene{margin:0}.scene-context{max-width:52em;margin:0 0 var(--s4);color:var(--muted)}.scene-context strong{color:var(--ink);margin-right:var(--s2)}.scene-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.8fr);gap:var(--s5);align-items:start}.script-panel,.direction-panel{min-width:0}.script-heading{display:flex;justify-content:space-between;align-items:baseline;gap:var(--s3);padding-bottom:var(--s2);border-bottom:1px solid var(--line)}.script-heading p{margin:0}.script-text{margin:0;padding:var(--s4) 0;white-space:pre-wrap;overflow-wrap:anywhere;font:18px/2 "Hiragino Mincho ProN","Yu Mincho",serif}.direction-panel{padding:var(--s3);background:var(--soft);border:1px solid var(--line)}.direction-panel p{margin:0 0 var(--s3)}.direction-panel .status{display:inline-block;padding:2px var(--s1);border:1px solid var(--line);color:var(--muted);font-size:var(--meta)}.direction-summary{font-weight:600}.direction-panel details{border-top:1px solid var(--line)}summary{min-height:var(--tap);padding:var(--s2) 0;cursor:pointer;color:var(--accent)}dl{margin:0}dl>div{padding:var(--s2) 0;border-top:1px solid var(--line)}dt{font-weight:700}dd{margin:var(--s1) 0 0}.unresolved ul{padding-left:var(--s4);margin:0 0 var(--s3)}.unresolved li{margin-bottom:var(--s1)}.direction-pending{background:transparent;border-style:dashed}.back-link{display:inline-flex;align-items:center;min-height:var(--tap);margin-top:var(--s4);font-size:var(--meta)}.book-footer{padding:var(--s5);background:var(--soft)}.book-footer p{max-width:52em}.book-footer nav{display:flex;flex-wrap:wrap;gap:var(--s2) var(--s4)}.book-footer a{display:inline-flex;align-items:center;min-height:var(--tap)}body.script-only .direction-panel,body.script-only .scene-context{display:none}body.script-only .scene-grid{grid-template-columns:minmax(0,46em)}
.blocking-plan{margin-top:var(--s5);padding:var(--s4);border:1px solid var(--line);background:var(--soft)}.blocking-heading{display:grid;grid-template-columns:minmax(14em,.55fr) minmax(0,1fr);gap:var(--s4);align-items:end;margin-bottom:var(--s4)}.blocking-heading p{margin:0}.blocking-layout{display:grid;grid-template-columns:minmax(360px,1.05fr) minmax(0,1fr);gap:var(--s4);align-items:start}.stage-figure{margin:0}.stage-map{position:relative;aspect-ratio:4/3;margin:var(--s2) 0;border:2px solid var(--line);background:var(--page);overflow:hidden}.stage-map:before,.stage-map:after{content:"";position:absolute;background:var(--line);opacity:.28}.stage-map:before{left:50%;top:0;width:1px;height:100%}.stage-map:after{left:0;top:50%;width:100%;height:1px}.stage-edge{position:absolute;z-index:3;left:50%;transform:translateX(-50%);padding:0 var(--s1);background:var(--page);font-size:12px;color:var(--muted)}.stage-edge.upstage{top:2px}.stage-edge.audience{bottom:2px}.stage-zone{position:absolute;z-index:1;font-size:11px;color:var(--muted)}.stage-zone.ul{left:8px;top:24px}.stage-zone.ur{right:8px;top:24px}.stage-zone.dl{left:8px;bottom:24px}.stage-zone.dr{right:8px;bottom:24px}.focus-zone{position:absolute;z-index:0;left:39%;top:38%;width:22%;height:24%;border:1px solid var(--accent);border-radius:50%}.stage-marker{position:absolute;z-index:2;left:var(--u);top:var(--v);display:grid;place-items:center;width:34px;height:34px;transform:translate(-50%,-50%);border:2px solid var(--ink);border-radius:50%;background:var(--marker);color:#fff;font-size:12px;font-weight:700;text-shadow:0 1px 1px #000}.stage-figure figcaption{font-size:var(--meta);color:var(--muted)}.highlight-lead{font-size:var(--lead);line-height:1.7;margin:0 0 var(--s3)}.pair-details,.position-details{border-top:1px solid var(--line)}.pair-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s2);padding-bottom:var(--s3)}.pair-card{padding:var(--s2);border-top:2px solid var(--accent);background:var(--page)}.pair-card h4{font-size:16px;line-height:1.5;margin:var(--s1) 0}.pair-card p{margin:0 0 var(--s1)}.pair-region{font-size:var(--meta);color:var(--muted)}.blocking-timeline{display:grid;grid-template-columns:1fr;gap:var(--s1);list-style:none;padding:0;margin:0}.blocking-timeline li{padding:var(--s2);border-top:1px solid var(--line)}.blocking-timeline strong,.blocking-timeline span{display:block}.blocking-timeline span{font-size:var(--meta)}.position-table-wrap{overflow-x:auto}.position-details table{width:100%;border-collapse:collapse;font-size:var(--meta)}.position-details th,.position-details td{padding:var(--s1);border-top:1px solid var(--line);text-align:left;white-space:nowrap}.blocking-note{max-width:52em}.artifact-link{display:inline-flex;align-items:center;min-height:var(--tap)}body.script-only .blocking-plan{display:none}
@media(max-width:800px){:root{--h1:30px;--h2:24px}.book-header,.cast,.contents,.scene,.book-footer{padding:var(--s4) var(--s3)}.toolbar{position:static;padding:var(--s1) var(--s3)}.toolbar a:last-child{width:100%;margin-left:0}.cast-heading,.cast-grid{grid-template-columns:1fr;gap:var(--s3)}.cast-card dl>div,.uncast li{grid-template-columns:1fr;gap:var(--s1)}.ensemble-card ul{columns:1}.contents ol{grid-template-columns:1fr}.scene-heading{grid-template-columns:auto 1fr}.source-scene{grid-column:2}.scene-grid{grid-template-columns:1fr;gap:var(--s4)}.script-heading{display:block}.script-heading p{margin-top:var(--s1)}.script-text{font-size:17px;line-height:1.95}.direction-panel{padding:var(--s3)}.blocking-heading,.blocking-layout{grid-template-columns:1fr;gap:var(--s3)}.blocking-plan{padding:var(--s3)}.pair-grid,.blocking-timeline{grid-template-columns:1fr}.stage-marker{width:30px;height:30px;font-size:11px}}
@media(max-width:480px){.stage-zone{font-size:0}.stage-zone:after{font-size:10px}.stage-zone.ul:after{content:"奥左"}.stage-zone.ur:after{content:"奥右"}.stage-zone.dl:after{content:"手前左"}.stage-zone.dr:after{content:"手前右"}}
@media print{html{scroll-behavior:auto}body,main{background:white}.toolbar,.contents,.back-link,.book-footer{display:none}.book-header{padding:0 0 var(--s4)}.cast{padding:var(--s4) 0}.scene{padding:var(--s4) 0;break-before:page}.scene-grid{grid-template-columns:1.35fr .8fr}.direction-panel{background:white}.script-text{font-size:14px;line-height:1.75}details:not([open])>*:not(summary){display:block}summary{font-weight:700;color:var(--ink)}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
"""

page = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ロミオとジュリエット｜12場面 通し台本</title><style>{css}</style></head>
<body><main>
  <header class="book-header">
    <p class="eyebrow">舞台スケッチ · 現在稿 · {esc(notes_data['updated'])}</p>
    <h1>ロミオとジュリエット<br>12場面 通し台本</h1>
    <p class="intro">これまで作った短い台詞と演出メモを、場面1から12まで上演順にまとめました。</p>
    <p class="notice">全訳ではありません。各場面から約10行を選んだ、最終推敲前のAI下訳です。場面間の出来事は省略されています。現在、12場面のうち{noted_count}場面に演出メモがあります。</p>
  </header>
  <nav class="toolbar" aria-label="表示切り替え">
    <button type="button" data-mode="full" aria-pressed="true">台本＋演出</button>
    <button type="button" data-mode="script" aria-pressed="false">台本のみ</button>
    <button type="button" id="print">印刷</button>
    <a href="#cast">配役一覧</a>
    <a href="../condensed-show/">3場面の統合構成</a>
    <a href="../direction-notes/">演出ノートを開く</a>
  </nav>
  {cast_block}
  <nav class="contents" id="contents" aria-labelledby="contents-heading"><h2 id="contents-heading">場面一覧</h2><ol>{toc}</ol></nav>
  {''.join(articles)}
  <footer class="book-footer"><p>台詞は scene-samples/draft.json、演出は direction-notes/scene-notes.json から生成しています。ブラウザ内の未保存編集は含みません。このHTMLは確認用で、Stage Sketchへは取り込まれていません。</p><nav><a href="../condensed-show/">3場面の統合構成を見る</a><a href="../scene-samples/">短い下訳を推敲する</a><a href="../direction-notes/">演出ノートを見る</a><a href="../scene-outline/">12場面の原構成を見る</a></nav></footer>
</main><script>
const buttons=[...document.querySelectorAll('[data-mode]')];
buttons.forEach(button=>button.addEventListener('click',()=>{{
  const scriptOnly=button.dataset.mode==='script';
  document.body.classList.toggle('script-only',scriptOnly);
  buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
}}));
document.getElementById('print').addEventListener('click',()=>window.print());
</script></body></html>'''

(HERE / "index.html").write_text(page, encoding="utf-8")
print(f"Built script book: {len(scenes)} scenes, {noted_count} with direction notes.")
