"""Build the current scene consolidation review page."""

from pathlib import Path
import html
import json


HERE = Path(__file__).resolve().parent
data = json.loads((HERE / "outline.json").read_text(encoding="utf-8"))
visuals = json.loads((HERE.parent / 'stage-visuals/layouts.json').read_text())
esc = html.escape

scenes = data["scenes"]
assert data["status"] == "user_direction_recorded"
assert len(scenes) == data["proposedSceneCount"] == 3
source_ids = [source for scene in scenes for source in scene["sourceScenes"]]
assert source_ids == list(range(1, data["sourceSceneCount"] + 1))
assert len({scene["id"] for scene in scenes}) == len(scenes)
assert [n for scene in scenes for n in scene["previousScenes"]] == list(range(1, 6))
assert all(scene["internalCues"] for scene in scenes)


def source_label(numbers):
    return " + ".join(f"{number:02}" for number in numbers)


mapping = "".join(
    f'<li><span>{esc(source_label(scene["previousScenes"]))}</span><b>→</b><strong>{scene["number"]}</strong></li>'
    for scene in scenes
)

articles = []
for scene in scenes:
    sources = "".join(
        f'<span class="source-chip">旧{number:02}｜{esc(title)}</span>'
        for number, title in zip(scene["sourceScenes"], scene["sourceTitles"])
    )
    cues = "".join(
        f'''<li id="{esc(cue['id'])}"><span class="cue-id">{esc(cue['label'])}</span><p>{esc(cue['action'])}</p></li>'''
        for cue in scene["internalCues"]
    )
    if scene.get("phaseGroups"):
        cue_by_id = {cue["id"]: cue for cue in scene["internalCues"]}
        phases = []
        for phase in scene["phaseGroups"]:
            detail = "".join(
                f'<li id="{esc(cid)}"><span class="cue-id">{esc(cue_by_id[cid]["label"])}</span><p>{esc(cue_by_id[cid]["action"])}</p></li>'
                for cid in phase["cueIds"]
            )
            phases.append(f'<section class="phase" id="{esc(phase["id"])}"><h4>{esc(phase["title"])}</h4><p>{esc(phase["summary"])}</p><p class="phase-transition">つなぎ：{esc(phase["transitionOut"])}</p><details><summary>{esc(phase["title"])}の内部キューを見る</summary><ol>{detail}</ol></details></section>')
        cue_content = "".join(phases)
    else:
        cue_content = f'<ol>{cues}</ol>'
    carry = "".join(f'<li>{esc(item)}</li>' for item in scene["stagingCarryover"])
    script_link = f'<p><a class="back" href="{esc(scene["scriptDraft"]["html"])}">第{scene["number"]}場面の台詞と動きを続けて読む →</a></p>' if scene.get('scriptDraft') else ''
    frames = [f for f in visuals['frames'] if f['sceneId'] == scene['id']]
    first = frames[0]
    visual = f'<figure class="stage-preview"><a href="../stage-visuals/#{esc(scene["id"])}"><img src="../stage-visuals/svg/{esc(first["id"])}-iso.svg" alt="{esc(first["title"])}。{esc(first["summary"])}" width="1100" height="680" loading="lazy"></a><figcaption><a href="../stage-visuals/#{esc(scene["id"])}">第{scene["number"]}場面の構成図を切り替えて見る（{len(frames)}図） →</a><br>図の位置・寸法は検討案です。</figcaption></figure>'
    articles.append(f'''<article class="scene" id="{esc(scene['id'])}">
      <aside class="scene-rail" aria-label="前の5場面案との対応"><span>前の5場面案</span><strong>{esc(source_label(scene['previousScenes']))}</strong></aside>
      <div class="scene-body">
        <header class="scene-head"><p class="scene-number">大場面 {scene['number']:02}</p><h2>{esc(scene['title'])}</h2><div class="source-chips">{sources}</div></header>
        <p class="change"><span>この場面で変わること</span>{esc(scene['dramaticChange'])}</p>
        {script_link}
        {visual}
        <section class="cue-section" aria-labelledby="cue-heading-{scene['number']}"><h3 id="cue-heading-{scene['number']}">場面内の流れ</h3>{cue_content}</section>
        <div class="scene-notes"><section><h3>引き継ぐ演出</h3><ul>{carry}</ul></section><section><h3>まとめられる理由</h3><p>{esc(scene['mergeReason'])}</p></section></div>
      </div>
    </article>''')

boundaries = "".join(
    f'<tr><th>旧{source_label(item["betweenSourceScenes"])}</th><td>{esc(item["replacement"])}</td></tr>'
    for item in data["removedBoundaries"]
)
preserved = "".join(f'<li>{esc(item)}</li>' for item in data["preserved"])
deferred = "".join(f'<li>{esc(item)}</li>' for item in data["deferred"])

page = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(data['title'])}</title>
<style>
:root{{--bg:#efe7d6;--page:#fffaf0;--ink:#2b2620;--muted:#6a604e;--accent:#8f3e1e;--line:#75664f;--soft:#f7f0e2;--s1:8px;--s2:12px;--s3:16px;--s4:24px;--s5:32px;--s6:48px;--tap:44px;--serif:"Hiragino Mincho ProN","Yu Mincho",serif;--sans:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.8 var(--sans)}}a{{color:var(--accent);text-underline-offset:3px}}h1,h2,h3,p{{margin-top:0}}h1,h2{{font-family:var(--serif);font-weight:600;letter-spacing:.03em}}h1{{font-size:clamp(38px,6vw,72px);line-height:1.16;margin-bottom:var(--s4)}}h2{{font-size:clamp(29px,4vw,46px);line-height:1.3;margin-bottom:var(--s3)}}h3{{font-size:17px;margin-bottom:var(--s2)}}main{{width:min(1180px,calc(100% - 32px));margin:32px auto;background:var(--page);border:1px solid var(--line);box-shadow:0 18px 60px rgba(43,38,32,.12)}}.masthead{{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:var(--s6);padding:72px 64px var(--s6);border-bottom:1px solid var(--line)}}.eyebrow,.scene-number{{color:var(--accent);font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}}.intro{{max-width:48em;font-family:var(--serif);font-size:20px;line-height:1.85}}.status{{align-self:start;padding:var(--s3);border-top:4px solid var(--accent);background:var(--soft)}}.status b,.status span{{display:block}}.status b{{font-family:var(--serif);font-size:22px}}.status span{{font-size:13px;color:var(--muted)}}.equation{{display:flex;align-items:baseline;gap:12px;margin-top:var(--s3);font-family:var(--serif)}}.equation strong{{font-size:54px;line-height:1;color:var(--accent)}}.equation b{{font-size:22px}}.equation span{{font-size:54px;line-height:1}}.toolbar{{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:var(--s2) var(--s4);align-items:center;min-height:56px;padding:6px 64px;background:rgba(255,250,240,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)}}.toolbar a{{display:inline-flex;align-items:center;min-height:var(--tap);font-size:14px}}.mapping{{padding:var(--s5) 64px;border-bottom:1px solid var(--line);background:var(--soft)}}.mapping h2{{font-size:24px}}.mapping ol{{display:grid;grid-template-columns:repeat(5,1fr);gap:var(--s2);list-style:none;margin:0;padding:0}}.mapping li{{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:var(--s2);min-height:60px;padding:var(--s2);border-top:2px solid var(--accent)}}.mapping li span{{font-variant-numeric:tabular-nums;color:var(--muted)}}.mapping li strong{{font:34px/1 var(--serif);color:var(--accent)}}.principle{{display:grid;grid-template-columns:1fr 2fr;gap:var(--s5);padding:var(--s5) 64px;border-bottom:1px solid var(--line)}}.principle h2{{font-size:26px}}.principle p{{margin:0}}.scene{{display:grid;grid-template-columns:150px minmax(0,1fr);border-bottom:1px solid var(--line);scroll-margin-top:72px}}.scene-rail{{padding:var(--s6) var(--s4);background:var(--soft);border-right:1px solid var(--line)}}.scene-rail span,.scene-rail strong{{display:block}}.scene-rail span{{font-size:12px;color:var(--muted);letter-spacing:.1em}}.scene-rail strong{{margin-top:var(--s1);font:30px/1.3 var(--serif);color:var(--accent);font-variant-numeric:tabular-nums}}.scene-body{{padding:var(--s6) 64px}}.scene-head{{border-bottom:1px solid var(--line);padding-bottom:var(--s3)}}.source-chips{{display:flex;flex-wrap:wrap;gap:var(--s1)}}.source-chip{{padding:4px var(--s2);border:1px solid var(--line);font-size:12px;color:var(--muted)}}.change{{margin:var(--s4) 0;font:18px/1.8 var(--serif)}}.change span{{display:block;margin-bottom:var(--s1);font:12px/1.5 var(--sans);font-weight:700;letter-spacing:.08em;color:var(--accent)}}.cue-section ol{{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}}.cue-section li{{display:grid;grid-template-columns:170px 1fr;gap:var(--s4);padding:var(--s3) 0;border-bottom:1px solid var(--line)}}.cue-section p{{margin:0}}.cue-id{{font-weight:700;color:var(--accent)}}.scene-notes{{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5);margin-top:var(--s4);padding:var(--s3);background:var(--soft)}}.scene-notes ul{{margin:0;padding-left:1.3em}}.scene-notes p{{margin:0}}.decision{{padding:var(--s6) 64px;background:var(--soft);border-bottom:1px solid var(--line)}}.decision-head{{display:grid;grid-template-columns:1fr 2fr;gap:var(--s5);margin-bottom:var(--s4)}}.decision h2{{font-size:30px}}.decision-head p{{margin:0}}table{{width:100%;border-collapse:collapse;background:var(--page)}}th,td{{padding:var(--s2) var(--s3);border-top:1px solid var(--line);text-align:left;vertical-align:top}}th{{width:150px;color:var(--accent)}}.audit{{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5);padding:var(--s6) 64px}}.audit ul{{padding-left:1.3em;margin:0}}.audit .pending{{border-left:3px solid var(--accent);padding-left:var(--s4)}}footer{{padding:var(--s5) 64px;border-top:1px solid var(--line)}}footer p{{max-width:56em;color:var(--muted)}}footer nav{{display:flex;flex-wrap:wrap;gap:var(--s2) var(--s4)}}footer a{{display:inline-flex;align-items:center;min-height:var(--tap)}}
@media(max-width:760px){{main{{width:100%;margin:0;border-left:0;border-right:0}}.masthead{{grid-template-columns:1fr;padding:var(--s5) var(--s3);gap:var(--s4)}}.toolbar{{position:static;padding:6px var(--s3)}}.mapping,.principle,.decision,.audit,footer{{padding-left:var(--s3);padding-right:var(--s3)}}.mapping ol{{grid-template-columns:1fr}}.principle,.decision-head,.audit{{grid-template-columns:1fr;gap:var(--s3)}}.scene{{grid-template-columns:1fr}}.scene-rail{{display:flex;align-items:baseline;gap:var(--s2);padding:var(--s2) var(--s3);border-right:0;border-bottom:1px solid var(--line)}}.scene-rail strong{{font-size:20px;margin:0}}.scene-body{{padding:var(--s5) var(--s3)}}.cue-section li{{grid-template-columns:1fr;gap:4px}}.scene-notes{{grid-template-columns:1fr;gap:var(--s3)}}th,td{{display:block;width:100%}}th{{padding-bottom:0}}td{{border-top:0;padding-top:4px}}}}
@media print{{body,main{{background:white}}main{{width:100%;margin:0;border:0;box-shadow:none}}.toolbar{{display:none}}.scene{{break-inside:avoid}}}}
.mapping ol{{grid-template-columns:repeat({len(scenes)},minmax(0,1fr))}}.phase{{padding:var(--s3) 0;border-top:1px solid var(--line)}}.phase h4{{font-size:18px;margin:0 0 var(--s2);color:var(--accent)}}.phase .phase-transition{{margin-top:var(--s2);color:var(--muted);font-size:14px}}.phase summary{{min-height:var(--tap);padding:var(--s2) 0;color:var(--accent);cursor:pointer}}@media(max-width:760px){{.mapping ol{{grid-template-columns:1fr}}}}@media(prefers-reduced-motion:reduce){{html{{scroll-behavior:auto}}}}
.stage-preview{{margin:24px 0}}.stage-preview img{{display:block;width:100%;height:auto;border:1px solid var(--line)}}.stage-preview figcaption{{font-size:14px;color:var(--muted);padding-top:8px}}.stage-preview figcaption a{{display:inline-flex;align-items:center;min-height:44px}}
</style></head><body><main>
<header class="masthead"><div><p class="eyebrow">ロミオとジュリエット · {esc(data['updated'])}</p><h1>5場面案を<br>3場面へ統合</h1><p class="intro">前の案の<strong>1を残し、2・3・4を一つにまとめ、5を終幕として残す</strong>構成です。新しい第2場面は、約束と結婚から、決闘と別れ、届かない手紙までを続けて見せます。</p></div><aside class="status"><b>3場面へ再編</b><span>指示を反映／つなぎは整理案</span><div class="equation"><strong>5</strong><b>→</b><span>3</span></div></aside></header>
<nav class="toolbar" aria-label="関連資料"><a href="../stage-visuals/">舞台構成図</a><a href="scene-02/">第2場面の台本</a><a href="../script-book/">12場面の通し台本</a><a href="../direction-notes/">演出ノート</a><a href="outline.json">構成JSON</a></nav>
<section class="mapping" aria-labelledby="mapping-heading"><h2 id="mapping-heading">前の5場面案 → 今回の3場面</h2><ol>{mapping}</ol></section>
<section class="principle"><h2>まとめ方</h2><p>{esc(data['premise'])}</p></section>
{''.join(articles)}
<section class="decision" id="transitions"><div class="decision-head"><h2>一つの場面としてつなぐ</h2><p>{esc(data['organizationReason'])}</p></div><table><thead><tr><th>元の12場面の境界</th><th>代わりに使うつなぎ</th></tr></thead><tbody>{boundaries}</tbody></table></section>
<section class="audit"><div><h2>残すもの</h2><ul>{preserved}</ul></div><div class="pending"><h2>次に決めること</h2><ul>{deferred}</ul></div></section>
<footer><p>第2場面は、台詞と動きを続けて読める構成稿を用意しました。追加したつなぎは本人推敲前の案です。第1・第3場面の台本化と、各場面の尺の設定はこれからです。元の12場面の台詞と前の5場面案も参照できます。Stage Sketchへは未取り込みです。</p><nav><a href="scene-02/">第2場面の構成稿を読む</a><a href="../script-book/">12場面の元台本へ戻る</a><a href="index-5-scenes-v1.html">前の5場面案（更新前）を見る</a></nav></footer>
</main></body></html>'''

(HERE / "index.html").write_text(page, encoding="utf-8")
print(f"Built condensed show proposal: {len(scenes)} scenes from {len(source_ids)} source scenes.")
