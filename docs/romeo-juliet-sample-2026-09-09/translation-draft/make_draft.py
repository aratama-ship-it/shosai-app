"""Build only the independent, unadopted translation review files in this directory."""
from pathlib import Path
import hashlib
import html
import json

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "sources/gutenberg-1513-original.txt"
raw = SOURCE.read_bytes()
lines = raw.decode("utf-8-sig").splitlines()

# Each range includes the speaker label; these are physical lines in the saved file.
drafts = [
    (1300, 1304, "ROMEO", "ロミオ", "（ジュリエットに）\nこの不作法な手で、この聖堂を汚したのなら、\nどうか、唇に償わせてください。\nこの唇も、祈るようにあなたへ近づき、\nやさしい口づけで、手の無礼を清めたいのです。"),
    (1306, 1310, "JULIET", "ジュリエット", "その手を、そんなに責めないで。\nこんなにも礼を尽くして触れてくださったのに。\n聖者にも手があり、祈る人はその手に触れるもの。\n手のひらを合わせる――それで十分な口づけです。"),
    (1312, 1313, "ROMEO", "ロミオ", "聖者にも唇はあるでしょう。祈る人にも。"),
    (1315, 1316, "JULIET", "ジュリエット", "ええ。けれど、祈るための唇です。"),
    (1318, 1320, "ROMEO", "ロミオ", "ならば、私の聖者さま。\n手に許したことを、唇にもお許しください。\n唇が祈っています。どうか、聞き届けて。\n信じる心が、絶望に変わらぬように。"),
    (1322, 1323, "JULIET", "ジュリエット", "祈りを聞き届けても、聖者は動きません。"),
    (1325, 1328, "ROMEO", "ロミオ", "では、そのままで。\n祈りの答えを、私が受け取ります。\n（口づけする）\nこれで、あなたの唇が、私の罪をぬぐってくれた。"),
    (1330, 1331, "JULIET", "ジュリエット", "では、あなたの唇の罪は、私の唇へ移ったのね。"),
    (1333, 1335, "ROMEO", "ロミオ", "私の唇から、あなたの唇へ？\nなんて甘いおとがめでしょう。\nでは、私の罪を返してください。"),
    (1337, 1338, "JULIET", "ジュリエット", "口づけも、お手本どおりなのね。"),
    (1340, 1341, "NURSE", "乳母", "お嬢さま。お母さまが、少し話をしたいと。"),
]

notes = [
    {"id": "pilgrim-revision", "title": "比喩の言葉を調整", "text": "ご本人の違和感を受け、pilgrim / palmer を日本語の呼び名として使わず、「祈る人」と行為で表す台詞へ修正しました。聖者・祈り・手から唇へ移るやり取りは残しています。修正前の下訳は wording-revision-01.json と wording-revision-02.json に保存しています。"},
    {"id": "address-revision", "title": "呼びかけの調整", "text": "ご本人の違和感を受け、ジュリエットの呼びかけを省き、相手の言葉へ直接応じる台詞に修正しました。"},
    {"id": "voice", "title": "声に出せる言葉と、舞台の張り", "text": "現代の日本語で話せる語順を使い、聖堂・祈り・罪の比喩を残しました。ロミオが近づこうとするたび、ジュリエットが同じ比喩で切り返します。日本語の改行は息と応答の単位で、英語の各詩行との一対一対応ではありません。"},
    {"id": "palm", "title": "手から唇へ", "text": "palm と palmer の音の重なりは日本語では再現していません。「手のひらを合わせる」「十分な口づけ」をつなぎ、手に許された接触を唇へ広げようとするやり取りを残しました。"},
    {"id": "gentle-sin", "title": "冒頭の償い", "text": "保存した英語本文は gentle sin です。英語はそのまま載せ、日本語では前後の動作に沿い、手の無礼を唇で償う申し出として訳しました。「償わせてください」は解釈を含む下訳です。"},
    {"id": "direction", "title": "口づけのト書き", "text": "英語の Kissing her. は罪が清められたという台詞の後にあります。日本語では動作と台詞の順序を読み取りやすくするため、「祈りの答えを、私が受け取ります」の直後へ移しました。二度目の口づけは、この英語抜粋には明示されたト書きがないため、追加していません。"},
    {"id": "by-the-book", "title": "最後の一言の余地", "text": "「お手本どおり」は、ほめ言葉にも、手慣れた相手への軽いからかいにも聞こえる言葉として選びました。照れる、笑う、皮肉っぽく、といった演技指定は加えていません。"},
]

data = {
    "schema": "stage-sketch.translation-review.v1",
    "draftId": "romeo-juliet-I-5-meeting-ja-v1",
    "title": "ロミオとジュリエット｜出会い",
    "scope": "第1幕 第5場・最初の対話から乳母の呼びかけまで（抜粋）",
    "date": "2026-09-09",
    "status": "ai_draft_for_user_revision",
    "adopted": False,
    "styleRequest": "現代の日本語を使いながら、劇であるというニュアンスを残す。",
    "source": {
        "work": "Romeo and Juliet", "author": "William Shakespeare",
        "url": "https://www.gutenberg.org/ebooks/1513",
        "localFile": "../sources/gutenberg-1513-original.txt",
        "sha256": hashlib.sha256(raw).hexdigest(),
        "lineNumberConvention": "1-based physical lines in the saved source file; not published verse numbers",
    },
    "translationMethod": "New AI rough translation directly from the saved English excerpt. User revisions are kept separately from the AI baseline.",
    "translationNotes": notes,
    "speeches": [],
}
for i, (start, end, speaker, name, ja) in enumerate(drafts, 1):
    excerpt = "\n".join(lines[start - 1:end])
    assert excerpt.splitlines()[0] == speaker + ".", (start, speaker)
    data["speeches"].append({
        "id": f"RJ-I-5-D{i:02}", "speaker": speaker, "speakerJa": name,
        "sourceLines": {"start": start, "end": end},
        "englishRaw": excerpt, "aiDraftJa": ja, "userRevisionJa": None,
    })

def script_text():
    heading = [data["title"], data["scope"], "原作：William Shakespeare", "日本語：英語原文から作成したAI下訳 v1／2026-09-09", "状態：ご本人の改稿前・未採用", ""]
    body = [f'{s["speakerJa"]}\n{s["aiDraftJa"]}' for s in data["speeches"]]
    return "\n".join(heading) + "\n" + "\n\n".join(body) + "\n"

(HERE / "draft.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(HERE / "ai-draft-ja.txt").write_text(script_text(), encoding="utf-8")

rows = []
for i, s in enumerate(data["speeches"], 1):
    sid = s["id"]
    en = "\n".join(s["englishRaw"].splitlines()[1:])
    ja = html.escape(s["aiDraftJa"])
    rows.append(f'''<article class="speech" id="{sid}">
      <h2><span class="number">{i:02}</span> {html.escape(s["speakerJa"])} <span class="speaker-en" lang="en">{s["speaker"]}</span></h2>
      <div class="columns">
        <div class="english"><h3 lang="en">English original</h3><p class="verse" lang="en">{html.escape(en)}</p><p class="source-ref">保存原文 {s["sourceLines"]["start"]}–{s["sourceLines"]["end"]} 行</p></div>
        <div class="japanese"><label for="edit-{sid}">日本語 <span class="row-status">AI下訳</span></label><textarea id="edit-{sid}" data-id="{sid}" rows="{len(s['aiDraftJa'].splitlines()) + 2}" spellcheck="false">{ja}</textarea>
          <details class="baseline"><summary>最初のAI下訳を確認</summary><p class="verse">{ja}</p></details>
        </div>
      </div>
    </article>''')
notes_html = "".join(f'<li><strong>{html.escape(n["title"])}</strong><p>{html.escape(n["text"])}</p></li>' for n in notes)
embedded = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
template = (HERE / "review-template.html").read_text(encoding="utf-8")
page = template.replace("{{SPEECHES}}", "\n".join(rows)).replace("{{NOTES}}", notes_html).replace("{{DATA}}", embedded)
(HERE / "index.html").write_text(page, encoding="utf-8")
print(f"Built {len(rows)} aligned speeches; source SHA256: {data['source']['sha256']}")
