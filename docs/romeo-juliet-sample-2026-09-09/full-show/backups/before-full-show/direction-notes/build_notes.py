"""Render the human notebook from scene-notes.json; no app state is modified."""
from pathlib import Path
import html
import json

HERE = Path(__file__).resolve().parent
data = json.loads((HERE / "scene-notes.json").read_text(encoding="utf-8"))
script_data = json.loads((HERE.parent / "scene-samples/draft.json").read_text(encoding="utf-8"))
samples = {sample["id"]: sample for sample in script_data["samples"]}
assert len(samples) == len(script_data["samples"])
esc = html.escape
entries = {entry["id"]: entry for entry in data["entries"]}
assert len(entries) == len(data["entries"])
assert len({scene["id"] for scene in data["scenes"]}) == len(data["scenes"])
assert not data["appImportCompatible"] and not data["appliedToStageSketch"]

convention_articles = []
for convention in data.get("stagingConventions", []):
    for entry_id in convention["entryIds"]:
        assert entry_id in entries
    convention_history = "".join(
        f'<p class="meta">メモ {esc(entry_id)} · {esc(entries[entry_id]["date"])}</p><blockquote><p>{esc(entries[entry_id]["rawText"])}</p></blockquote>'
        for entry_id in convention["entryIds"]
    )
    convention_articles.append(f'''<article id="{esc(convention['id'])}">
      <h3>{esc(convention['title'])}</h3>
      <p class="lead">{esc(convention['text'])}</p>
      <dl><div><dt>適用する場面</dt><dd>{esc(convention['appliesTo'])}</dd></div>
      <div><dt>場面固有の指定</dt><dd>{esc(convention['overridePolicy'])}</dd></div></dl>
      <details><summary>話していただいた言葉・記録履歴</summary>{convention_history}</details>
    </article>''')
conventions_block = f'''<section class="conventions" aria-labelledby="conventions-heading">
  <h2 id="conventions-heading">演出全体の共通ルール</h2>{''.join(convention_articles)}
</section>''' if convention_articles else ""

css = """
:root{--paper:#efe7d6;--page:#fffaf0;--ink:#2b2620;--muted:#6a604e;--accent:#8f3e1e;--line:#75664f;--s1:8px;--s2:12px;--s3:16px;--s4:24px;--s5:32px;--body:16px;--lead:18px;--h1:32px;--h2:24px;--meta:14px;--width:1120px;--prose:48em;--tap:44px;--border:1px;--focus:3px;--labels:8em}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:var(--body)/1.8 "Hiragino Sans","Yu Gothic",system-ui,sans-serif}main{max-width:var(--width);margin:auto;padding:var(--s5);background:var(--page)}header,article,footer,.pending,.conventions{padding-block:var(--s4);border-bottom:var(--border) solid var(--line)}header{padding-top:0}h1{font-size:var(--h1);line-height:1.5;margin:var(--s1) 0 var(--s3)}h2{font-size:var(--h2);line-height:1.5;margin:0 0 var(--s3)}h3{font-size:var(--lead);line-height:1.5;margin:var(--s4) 0 var(--s2)}p{margin:0 0 var(--s3);max-width:var(--prose)}.meta{font-size:var(--meta);line-height:1.75;color:var(--muted)}.lead{font-size:var(--lead);line-height:1.8;max-width:var(--prose)}.number{color:var(--accent)}a{color:var(--accent);text-underline-offset:4px;display:inline-flex;align-items:center;min-height:var(--tap)}a:focus-visible,summary:focus-visible{outline:var(--focus) solid var(--accent);outline-offset:var(--focus)}.links{display:flex;flex-wrap:wrap;gap:var(--s1) var(--s4)}dl{max-width:var(--prose);margin:0}dl>div{display:grid;grid-template-columns:var(--labels) minmax(0,1fr);gap:var(--s3);border-top:var(--border) solid var(--line);padding:var(--s3) 0}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}ul{max-width:var(--prose);padding-left:var(--s4);margin:var(--s2) 0 var(--s4)}li{margin-bottom:var(--s1)}summary{min-height:var(--tap);padding:var(--s1) 0;cursor:pointer;color:var(--accent);line-height:1.75}details{margin-top:var(--s2)}blockquote{margin:var(--s2) 0 var(--s4);padding:var(--s2) var(--s3);border-left:var(--border) solid var(--line);max-width:var(--prose)}blockquote p{margin:0}.pending ul{list-style:none;padding:0}.pending li{padding:var(--s2) 0;border-bottom:var(--border) solid var(--line)}.pending .meta{display:block}footer{border:0}code{font-family:inherit;overflow-wrap:anywhere}
.scene-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s5)}.scene-columns>section{min-width:0}.script-content{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;padding:var(--s3) 0;border-block:var(--border) solid var(--line)}.script-omissions{border-left:var(--border) solid var(--line);padding-left:var(--s3)}.pending .number{display:inline}.pending details{margin:0}
.reference-section{max-width:none;margin-top:var(--s5);padding-top:var(--s4);border-top:var(--border) solid var(--line)}.recommendation{max-width:var(--prose);padding:var(--s3);border:var(--border) solid var(--accent);margin-bottom:var(--s4)}.recommendation h4,.reference-card h4{font-size:var(--lead);line-height:1.5;margin:0 0 var(--s2)}.reference-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s3)}.reference-card{min-width:0;padding:var(--s3);border:var(--border) solid var(--line)}.reference-card dl>div{grid-template-columns:5em minmax(0,1fr);gap:var(--s2);padding:var(--s2) 0}.status{display:inline-block;padding:2px var(--s1);border:var(--border) solid var(--line);color:var(--muted);font-size:var(--meta);line-height:1.5}.source-list{margin-bottom:0}.source-list a{display:inline;min-height:0}.source-list code{font-size:var(--meta)}
@media(max-width:800px){:root{--h1:28px;--h2:22px}main{padding:var(--s3)}dl>div{grid-template-columns:minmax(0,1fr);gap:var(--s1)}.scene-columns,.reference-grid{grid-template-columns:minmax(0,1fr);gap:var(--s3)}}
@media print{body,main{background:white}main{padding:0}.links,footer{display:none}article{break-inside:avoid}}
"""

articles = []
pending = []
for scene in data["scenes"]:
    number = f'{scene["outlineId"]:02}'
    title = esc(scene["title"])
    sample = samples[scene["scriptSampleId"]]
    assert sample["outlineId"] == scene["outlineId"]
    script_text = sample["userRevisionJa"] if sample.get("userRevisionJa") is not None else sample["jaDraft"]
    script_status = "保存済みの本人改稿" if sample.get("userRevisionJa") is not None else "AI下訳"
    omission_notes = "".join(f'<p class="meta script-omissions">編集注：{esc(note["label"])}（保存原文 {note["sourceRange"][0]}〜{note["sourceRange"][1]} 行）。台詞は抜粋した箇所をつないでいます。</p>' for note in sample.get("omissions", []))
    script_block = f'''<section class="script" aria-labelledby="script-heading-{esc(scene['id'])}">
      <h3 id="script-heading-{esc(scene['id'])}">この場面の短い台詞</h3>
      <p class="meta">{esc(sample['sourceActScene'])} · {esc(script_status)}／抜粋</p>
      {omission_notes}<p class="script-content" data-sample-id="{esc(sample['id'])}">{esc(script_text)}</p>
      <a href="../scene-samples/#{esc(scene['scriptSampleId'])}">下訳ページで読む・推敲する</a>
    </section>'''
    if not scene["entryIds"]:
        pending.append(f'<li id="{esc(scene["id"])}"><details><summary><span class="number">{number}</span> {title}</summary><p class="meta">演出メモはこれから</p>{script_block}</details></li>')
        continue
    for entry_id in scene["entryIds"]:
        assert entries[entry_id]["sceneId"] == scene["id"]
    rows = "".join(f'<div><dt>{esc(item["label"])}</dt><dd>{esc(item["text"])}</dd></div>' for item in scene["directionItems"])
    unknowns = "".join(f'<li>{esc(text)}</li>' for text in scene["unresolved"])
    history = "".join(f'<p class="meta">メモ {esc(eid)} · {esc(entries[eid]["date"])}</p><blockquote><p>{esc(entries[eid]["rawText"])}</p></blockquote>' for eid in scene["entryIds"])
    research_html = ""
    if scene.get("referenceOptions"):
        sources = {source["id"]: source for source in scene.get("researchSources", [])}
        assert len(sources) == len(scene.get("researchSources", []))
        recommendation = scene["referenceRecommendation"]
        recommendation_labels = {
            "assistant_research_option_unselected": "推奨する試作案／未採用",
            "user_direction_recorded_with_assistant_structure": "現在の演出方向／細部は未決定",
        }
        assert recommendation["status"] in recommendation_labels
        cards = []
        for option in scene["referenceOptions"]:
            assert option["status"] == "assistant_research_option_unselected"
            source_items = []
            for source_id in option["sourceRefs"]:
                source = sources[source_id]
                if source.get("url"):
                    source_label = f'<a href="{esc(source["url"], quote=True)}">{esc(source["label"])}</a>'
                else:
                    source_label = f'{esc(source["label"])} <code>{esc(source["path"])}</code>'
                source_items.append(f'<li>{source_label}<br><span class="meta">{esc(source["finding"])}</span></li>')
            cards.append(f'''<div class="reference-card" id="{esc(option['id'])}">
              <p class="meta"><span class="status">未採用の調査案</span> · 設備負担 {esc(option['load'])}</p>
              <h4>{esc(option['title'])}</h4>
              <dl><div><dt>仕組み</dt><dd>{esc(option['system'])}</dd></div>
              <div><dt>今回への転用</dt><dd>{esc(option['transfer'])}</dd></div>
              <div><dt>注意</dt><dd>{esc(option['watch'])}</dd></div></dl>
              <details><summary>参照した資料</summary><ul class="source-list">{''.join(source_items)}</ul></details>
            </div>''')
        research_intro = "人で表す方向を記録 · 下の舞台システム6案は補助または別案として未採用" if scene.get("humanBoundaryScore") else "舞台システムと制作の書斎から整理 · 全案未採用"
        research_heading = "非干渉領域の身体演出と参考案" if scene.get("humanBoundaryScore") else "非干渉領域の参考案"
        research_html = f'''<section class="reference-section" aria-labelledby="reference-heading-{esc(scene['id'])}">
          <p class="meta">{esc(research_intro)} · 参照確認 {esc(data['updated'])}</p>
          <h3 id="reference-heading-{esc(scene['id'])}">{esc(research_heading)}</h3>
          <div class="recommendation"><p class="meta"><span class="status">{esc(recommendation_labels[recommendation['status']])}</span></p>
            <h4>{esc(recommendation['title'])}</h4><p>{esc(recommendation['text'])}</p></div>
          <div class="reference-grid">{''.join(cards)}</div>
        </section>'''
    handoff = scene["stageSketchHandoff"]
    detail_heading = "物語上の整理" if scene.get("noteType") == "story_development" else "いま出ている演出"
    if handoff:
        script_link = handoff.get("scriptLink", {})
        cue_summary = script_link.get("cueSummaryJa")
        if cue_summary:
            script_alignment = f'{scene["scriptSampleId"]} · {script_link["exactCueAnchor"]}。{cue_summary}'
        else:
            script_alignment = f'{scene["scriptSampleId"]}。台詞のどの位置で動きや照明を始めるかは未定。'
        artifact = handoff.get("artifact")
        artifact_html = (
            f'<div><dt>Stage Sketch下書き</dt><dd><a href="{esc(artifact["path"], quote=True)}" download>'
            f'version {artifact["version"]} JSONを保存</a><br><span class="meta">生成・検証済み／未取り込み</span></dd></div>'
            if artifact else ""
        )
        handoff_html = f'''<details><summary>舞台スケッチに渡す内容</summary>
        <dl><div><dt>場面名</dt><dd>{esc(handoff['title'])}</dd></div>
        <div><dt>場面の説明</dt><dd>{esc(handoff['note'])}</dd></div>{rows}
        <div><dt>台詞との対応</dt><dd>{esc(script_alignment)}</dd></div>{artifact_html}</dl>
        <p class="meta">舞台スケッチへの取り込みは、これからです。</p>
      </details>'''
    else:
        handoff_html = '<p class="meta">物語の順序を整理中です。演出が決まってから、舞台スケッチ用の場面データを作ります。</p>'
    articles.append(f'''<article id="{esc(scene['id'])}">
      <p class="meta">ご本人の演出メモ · {esc(data['updated'])}</p>
      <h2><span class="number">{number}</span> {title}</h2>
      <p class="lead">{esc(scene['summary'])}</p>
      <div class="scene-columns">{script_block}<section aria-labelledby="direction-heading-{esc(scene['id'])}"><h3 id="direction-heading-{esc(scene['id'])}">{detail_heading}</h3><dl>{rows}</dl></section></div>
      {research_html}
      <h3>これから決めること</h3><ul>{unknowns}</ul>
      <details><summary>原作の場面を確認</summary>
        <p>{esc(scene['storyContext']['text'])}</p><p class="meta">既存の構成案にある出来事 · {esc(scene['sourceActScene'])}</p>
      </details>
      {handoff_html}
      <details><summary>話していただいた言葉・記録履歴</summary>{history}</details>
    </article>''')

page = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(data['title'])}</title><style>{css}</style></head>
<body><main><header><p class="meta">ロミオとジュリエット · ショー制作メモ</p><h1>演出ノート</h1>
<p>話していただいた演出を、12の場面ごとに積み重ねていきます。現在は{len(articles)}場面の演出を記録しています。</p>
<p class="meta">各場面の短い台詞も、このページで読めます。演出の追記や変更は、前の言葉も履歴に残して更新します。</p>
<div class="links"><a href="../condensed-show/scene-02/">統合した第2場面の構成稿</a><a href="../script-book/">12場面の通し台本を読む</a><a href="../scene-samples/">短い台詞を読む</a><a href="../scene-outline/">12場面の構成を見る</a></div></header>
{conventions_block}
{''.join(articles)}
<section class="pending"><h2>ほかの場面の台詞と演出メモ</h2><p class="meta">場面名を開くと、短い台詞を読めます。</p><ul>{''.join(pending)}</ul></section>
<footer><p>次の演出も、場面番号や名前と一緒に、そのまま話していただければ追記できます。</p>
<div class="links"><a href="scene-notes.json" download>演出メモのデータを保存</a><a href="TOKEN_SHEET.md">表示仕様</a></div></footer></main></body></html>'''
(HERE / "index.html").write_text(page, encoding="utf-8")
print(f'Built notebook: {len(articles)} noted scenes, {len(pending)} pending scenes, {len(entries)} retained user entries.')
