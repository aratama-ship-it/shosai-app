"""Rebuild local, unpublished test materials from the two saved public-domain sources.
Run with Python + reportlab + pypdf. No network access is performed.
Outputs are sample fixtures, not Stage Sketch project import documents.
"""
from pathlib import Path
import hashlib, html, json, re, zipfile
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'sources'
OUT = ROOT / 'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path('/System/Library/Fonts/Supplemental/Arial Unicode.ttf')
if not FONT.is_file():
    raise SystemExit('Set FONT to a local Japanese-capable TrueType font before rebuilding on another Mac.')
pdfmetrics.registerFont(TTFont('Sample', str(FONT)))
CMAP = pdfmetrics.getFont('Sample').face.charToGlyph
INK, MUTED, ACCENT = '#2b2620', '#6a604e', '#8f3e1e'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save_json(name, data): (ROOT/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

with zipfile.ZipFile(SRC/'aozora-42773-original.zip') as z:
    ja_raw = z.read('03romeo_to_juliet.txt').decode('shift_jis')
(SRC/'romeo-juliet-ja-aozora-utf8.txt').write_text(ja_raw, encoding='utf-8', newline='')
en_raw = (SRC/'gutenberg-1513-original.txt').read_text(encoding='utf-8')
ja_lines, en_lines = ja_raw.splitlines(), en_raw.splitlines()
start = re.search(r'\*\*\* START OF THE PROJECT GUTENBERG EBOOK[^\n]*\n', en_raw)
end = re.search(r'\*\*\* END OF THE PROJECT GUTENBERG EBOOK', en_raw)
assert start and end
en_body = en_raw[start.end():end.start()].strip()+'\n'
assert 'Gutenberg' not in en_body
(SRC/'romeo-juliet-en-body.txt').write_text(en_body, encoding='utf-8')

GAIJI = {'濁点付き片仮名ヲ、1-7-85':'ヺ', '濁点付き片仮名ヱ、1-7-84':'ヹ', '「廴＋囘」、第4水準2-12-11':'廻', '「鼬」の「由」に代えて「奚」、第4水準2-94-69':'鼷'}
def clean_ja(s):
    # Preserve old spelling. Ruby/layout markup alone is removed in the derived excerpt.
    s = re.sub(r'《[^》]*》', '', s).replace('｜', '')
    # Resolve only these four explicit source character descriptions; retain unknowns.
    s = re.sub(r'※［＃([^］]+)］', lambda m: GAIJI.get(m[1], '※（'+m[1]+'）'), s)
    return re.sub(r'［＃[^］]+］', '', s).strip()

scenes = [
 {'id':'RJ-I-5','act':1,'scene':5,'title':{'ja':'出会いと手の接触','en':'The first meeting'}, 'ranges':{'ja':[448,474],'en':[1300,1342]}},
 {'id':'RJ-II-2','act':2,'scene':2,'title':{'ja':'窓辺のジュリエット','en':'Juliet at the window'}, 'ranges':{'ja':[571,580],'en':[1525,1568]}},
 {'id':'RJ-III-1','act':3,'scene':1,'title':{'ja':'決闘と反復する言葉','en':'The duel and a repeated curse'}, 'ranges':{'ja':[921,943],'en':[2700,2756]}},
]
for page,s in enumerate(scenes,1):
    s['pdfPageNumber']=page
    s['blocks']={}
    for lang,lines in [('ja',ja_lines),('en',en_lines)]:
        a,b=s['ranges'][lang]
        blocks=[]
        for line_no in range(a,b+1):
            raw=lines[line_no-1]
            txt=clean_ja(raw) if lang=='ja' else raw.strip().replace('_','')
            if not txt: continue
            blocks.append({'id':f'{s["id"]}-{lang}-L{line_no}', 'sourceLine':line_no, 'text':txt,'raw':raw})
        s['blocks'][lang]=blocks

# These are proposals for calling points. Timings, positioning and adoption are unset.
cue_specs=[
 ('rj-cue-lx-11','LX 11','lighting',0,'此賤しい手','If I profane',0,'二人の手元へ光の中心を移す','Focus the light on the two lovers’ hands.'),
 ('rj-cue-sd-11','SD 11','sound',0,'接吻禮','palmers’ kiss',0,'群舞の音を引き、接触の瞬間に余白を作る','Ease the ensemble sound back to leave space for the touch.'),
 ('rj-cue-lx-12','LX 12','lighting',0,'お母さまがお話','your mother craves',0,'二人だけの光から周囲の人々へ戻す','Restore the surrounding ensemble to the light.'),
 ('rj-cue-lx-21','LX 21','lighting',1,'此時ヂュリエット','Juliet appears above',0,'窓側の光を入れる','Bring up the window light.'),
 ('rj-cue-sd-21','SD 21','sound',1,'太陽ぢゃ','Juliet is the sun',0,'二人の呼吸を残す薄い持続音へ移る','Move into a sparse sustained sound, leaving the performers’ breathing audible.'),
 ('rj-cue-sd-31','SD 31','sound',2,'チッバルトとマーキューシオーと鬪ふ','They fight.',0,'決闘の動作開始を見て打楽器の層を入れる','Add a percussion layer on the observed start of the duel.'),
 ('rj-cue-lx-31','LX 31','lighting',2,'畜生、兩方の奴等め！','A plague o’ both',0,'最初の呪いの台詞で群像の光を切り分ける','Separate the ensemble in light at the first curse.'),
 ('rj-cue-sd-32','SD 32','sound',2,'畜生、兩方の奴等め！','A plague o’ both',1,'二度目の同じ言葉で打楽器を止める','Stop the percussion at the second occurrence of the curse.'),
]
def locate(si,lang,quote,occurrence=0):
    hits=[]
    for block in scenes[si]['blocks'][lang]:
        pos=0
        while True:
            pos=block['text'].find(quote,pos)
            if pos<0: break
            hits.append({'blockId':block['id'],'sourceLine':block['sourceLine'],'quote':quote,'prefix':block['text'][max(0,pos-36):pos], 'suffix':block['text'][pos+len(quote):pos+len(quote)+36], 'characterOffset':pos})
            pos+=len(quote)
    assert len(hits)>occurrence,(si,lang,quote,len(hits))
    return {**hits[occurrence], 'occurrenceWithinScene':occurrence+1, 'matchingOccurrencesInExcerpt':len(hits), 'pdfPageNumber':si+1, 'positionStatus':'proposed', 'triggerEdge':'after_quote_or_observed_action_start', 'pdfRectangle':None}
cues=[]
for cid,number,kind,si,jq,eq,n,jact,eact in cue_specs:
    cues.append({'cueId':cid,'number':number,'kind':kind,'sceneId':scenes[si]['id'],'adoption':'proposal','content':{'ja':jact,'en':eact}, 'go':{lang:locate(si,lang,q,n) for lang,q in [('ja',jq),('en',eq)]},'timeSeconds':None,'stageActionRefs':[]})
annotations=[
 {'annotationId':'rj-note-standby-lx21','role':'standby','cueId':'rj-cue-lx-21','anchor':{lang:locate(0,lang,q) for lang,q in [('ja','お母さまがお話'),('en','your mother craves')]},'note':{'ja':'次の抜粋に備えるテスト用の待機注記。GOではない。原作ではこの間に省略部分がある。','en':'Test standby for the next excerpt, not a GO. The original play contains omitted material between these excerpts.'}},
 {'annotationId':'rj-note-window-plan','role':'blocking_reference','cueId':None,'anchor':{lang:locate(1,lang,q) for lang,q in [('ja','頬を掌へ'),('en','leans her cheek')]},'note':{'ja':'視線と窓の位置を結ぶ配置図の参照候補。舞台図は未作成。','en':'Proposed reference to a plan of the window and sightline. No stage plan has been created.'}},
]
fixture={'format':'stage-sketch-research-fixture/1','appImportCompatible':False,'created':'2026-09-09','status':'local_test_material_and_unadopted_direction_proposals','work':'Romeo and Juliet','sourceLanguages':['ja','en'],'alignment':'Act/scene and selected dramatic passages; not a critical parallel edition or word-for-word alignment.', 'coordinateContract':'No PDF coordinates assigned. sourceLine is a one-based physical line of the saved source, not a Shakespeare verse number. characterOffset counts Python Unicode code points, not JS UTF-16; convert before using in an app.', 'scenes':scenes,'cues':cues,'annotations':annotations}
save_json('sample-fixture.json',fixture)

def wrap(text,width,size,lang):
    words=list(text) if lang=='ja' else text.split(' ')
    join='' if lang=='ja' else ' '
    rows=[]; line=''
    for word in words:
        candidate=line+(join if line else '')+word
        if pdfmetrics.stringWidth(candidate,'Sample',size)>width and line and not (lang=='ja' and word in '、。，．！？：；）］｝〉》」』】ァィゥェォッャュョー'):
            rows.append(line); line=word
        else: line=candidate
    if line: rows.append(line)
    return rows

pdf_results=[]
for lang in ['ja','en']:
    p=OUT/f'romeo-juliet-excerpts-{lang}-v1.pdf'
    c=canvas.Canvas(str(p),pagesize=(595.28,841.89),pageCompression=1)
    c.setTitle('ロミオとジュリエット 台本抜粋 v1' if lang=='ja' else 'Romeo and Juliet - Script excerpts v1')
    c.setAuthor('William Shakespeare / Shoyo Tsubouchi (Japanese translation); sample layout: Codex')
    page_checks=[]
    for s in scenes:
        for b in s['blocks'][lang]:
            missing={ch for ch in b['text'] if not ch.isspace() and ord(ch) not in CMAP}
            assert not missing,('missing glyph',missing,b['id'])
        c.setFillColor(HexColor(INK)); c.setFont('Sample',17)
        c.drawString(44,797,'ロミオとジュリエット' if lang=='ja' else 'Romeo and Juliet')
        c.setFont('Sample',10)
        subtitle=f'第{s["act"]}幕 第{s["scene"]}場 / {s["title"][lang]}' if lang=='ja' else f'Act {s["act"]}, Scene {s["scene"]} / {s["title"][lang]}'
        c.drawString(44,777,subtitle)
        c.setFillColor(HexColor(MUTED)); c.setFont('Sample',8)
        c.drawString(44,759,'抜粋・再組版 / 旧字旧仮名・ルビ省略 / v1 / 2026-09-09' if lang=='ja' else 'Selected passages / newly typeset / v1 / 2026-09-09')
        c.setStrokeColor(HexColor('#c6bba7')); c.line(442,122,442,741)
        c.drawString(458,724,'キュー記入欄' if lang=='ja' else 'Cue notes')
        y=724
        size,lead=(11,17) if lang=='ja' else (10.5,13)
        for b in s['blocks'][lang]:
            text=b['text']
            # English verse line breaks are retained; long prose lines wrap at words.
            for row in wrap(text,378,size,lang):
                assert y>=122,('page overflow',lang,s['id'],y)
                c.setFillColor(HexColor(INK)); c.setFont('Sample',size); c.drawString(44,y,row); y-=lead
            y-=4 if lang=='ja' else (3 if re.fullmatch(r'[A-Z ]+\.',text) else 0)
        c.setStrokeColor(HexColor('#c6bba7')); c.line(44,101,551,101)
        footer=(['原作 William Shakespeare / 日本語訳 坪内逍遙','底本: 新修シェークスピヤ全集 第25卷、中央公論社、1933年。','出典: 青空文庫 No.42773 / 入力 osawa・校正 土屋隆 / 2010年11月9日修正。','原文の一部を抜粋。ルビ・組版注記を省略、外字4種は対応するUnicode文字へ。原文・由来は付属資料へ。'] if lang=='ja' else ['By William Shakespeare. Source acknowledgement: Project Gutenberg eBook #1513.','Source: https://www.gutenberg.org/ebooks/1513 (retrieved 2026-09-09).','Selected passages; original line breaks retained where possible. This is a new sample layout.','Cue proposals are separate from the play. The Japanese edition has different stage directions.'])
        c.setFillColor(HexColor(MUTED)); c.setFont('Sample',8)
        for i,line in enumerate(footer):c.drawString(44,86-12*i,line)
        c.drawRightString(552,23,f'{lang.upper()} / {s["pdfPageNumber"]} of 3')
        c.linkURL('https://www.aozora.gr.jp/cards/000264/card42773.html' if lang=='ja' else 'https://www.gutenberg.org/ebooks/1513',(44,49,550,65),relative=0)
        page_checks.append({'page':s['pdfPageNumber'],'lowestBodyBaseline':y,'bodyCharacters':sum(len(b['text']) for b in s['blocks'][lang])})
        c.showPage()
    c.save()
    reader=PdfReader(p); assert len(reader.pages)==3
    for page,s in zip(reader.pages,scenes):
        extracted=re.sub(r'\s','',page.extract_text())
        for b in s['blocks'][lang]:assert re.sub(r'\s','',b['text']) in extracted,('text missing',b['id'])
    pdf_results.append({'path':str(p.relative_to(ROOT)),'pages':3,'sha256':sha(p),'textExtractionMatchesEveryBlock':True,'fontGlyphCoverage':True,'layout':page_checks})

sources=[
 {'id':'ja','url':'https://www.aozora.gr.jp/cards/000264/files/42773_ruby_38390.zip','catalog':'https://www.aozora.gr.jp/cards/000264/card42773.html','sourceFile':'sources/aozora-42773-original.zip','sha256':sha(SRC/'aozora-42773-original.zip'),'author':'William Shakespeare (d. 1616)','translator':'坪内逍遙 (1859-1935)','edition':'新修シェークスピヤ全集 第二十五卷、中央公論社、1933-10-30','credits':'入力 osawa / 校正 土屋隆 / 作成2010-07-23 / 修正2010-11-09','rightsAssessment':'Public domain text and translation in Japan; conclusion from dates and Japanese term rules. This is not a clearance of modern adaptations or third-party media.','metadataLicense':'Bibliographic data attributed to 青空文庫, CC BY 4.0; the underlying public-domain play is a separate layer.','transformations':['ZIP retained unchanged','Full text decoded Shift_JIS to UTF-8 with ruby and provenance retained','PDF excerpts remove ruby and layout annotations; old spelling unchanged; four gaiji descriptions mapped to Unicode; mapping recorded separately']},
 {'id':'en','url':'https://www.gutenberg.org/cache/epub/1513/pg1513.txt','catalog':'https://www.gutenberg.org/ebooks/1513','sourceFile':'sources/gutenberg-1513-original.txt','sha256':sha(SRC/'gutenberg-1513-original.txt'),'author':'William Shakespeare (1564-1616)','edition':'eBook #1513; file header Last Updated September 18, 2025','credits':'the PG Shakespeare Team','rightsAssessment':'Catalog marks Public domain in the USA. Shakespeare text is also out of copyright in Japan.','transformations':['Original download retained with full license','Body-only UTF-8 copy removes the ebook wrapper and license, retained separately in original','PDF is a newly typeset excerpt with source acknowledgement; not branded as a Project Gutenberg edition']}
]
save_json('source-manifest.json',{'retrieved':'2026-09-09','rightsScope':'Japan for Japanese text/translation; USA catalog statement for English plus Japan text assessment; other distribution territories not individually reviewed','sources':sources,'rules':['https://www.aozora.gr.jp/guide/kijyunn.html','https://www.bunka.go.jp/seisaku/chosakuken/hokaisei/kantaiheiyo_chosakuken/1411890.html','https://www.gutenberg.org/policy/license.html'],'pdfs':pdf_results,'gaijiMappingInDerivedExcerpts':GAIJI,'sourceIntegrityNote':'SHA-256 pins local downloaded bytes; it is not proof of textual accuracy against a print facsimile.'})

e=html.escape
scene_html=''
for s in scenes:
    parts=[]
    for lang in ['ja','en']:
        body=''.join(f'<p lang="{lang}" id="{b["id"]}">{e(b["text"])}</p>' for b in s['blocks'][lang])
        parts.append(f'<div><h3>{"日本語 / 坪内逍遙訳" if lang=="ja" else "English / Shakespeare"}</h3>{body}</div>')
    scene_html+=f'<details><summary>第{s["act"]}幕 第{s["scene"]}場 — {e(s["title"]["ja"])} / {e(s["title"]["en"])}</summary><div class="parallel">'+''.join(parts)+'</div></details>'
cue_html=''
for q in cues:
    ja,en=q['go']['ja'],q['go']['en']
    cue_html+=f'<article class="cue"><h3>{q["number"]} <small>{q["sceneId"]} / PDF {ja["pdfPageNumber"]}頁</small></h3><div class="parallel"><p>「{e(ja["quote"])}」<br><small>抜粋内 {ja["occurrenceWithinScene"]}回目 / 元テキスト {ja["sourceLine"]}行</small></p><p lang="en">“{e(en["quote"])}”<br><small>Occurrence {en["occurrenceWithinScene"]} / source line {en["sourceLine"]}</small></p></div><p>{e(q["content"]["ja"])}<br><small lang="en">{e(q["content"]["en"])}</small></p></article>'
page='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ロミオとジュリエット｜舞台スケッチ テスト資料</title>
<style>:root{--paper:#efe7d6;--page:#fffaf0;--ink:#2b2620;--muted:#6a604e;--accent:#8f3e1e;--line:#75664f;--s1:8px;--s2:16px;--s3:24px;--s4:32px;--s5:48px}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.8 "Hiragino Sans","Yu Gothic",system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:var(--s4)}header,section{background:var(--page);padding:var(--s4);margin-bottom:var(--s3)}h1{font-size:32px;line-height:1.4;margin:8px 0 16px}h2{font-size:24px;line-height:1.5;margin:0 0 16px}h3{font-size:18px;line-height:1.5;margin:0 0 8px}p{margin:8px 0 16px;max-width:44em}small,.label{font-size:14px;line-height:1.75;color:var(--muted)}a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}a,summary{min-height:44px;display:inline-flex;align-items:center;padding:8px 0}a:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.downloads{display:flex;gap:16px;flex-wrap:wrap}.downloads a{padding:12px 16px;border:1px solid var(--line)}.parallel{display:grid;grid-template-columns:1fr 1fr;gap:32px}.parallel>div{min-width:0}.cue,details{padding:24px 0;border-top:1px solid var(--line)}summary{display:list-item;cursor:pointer;font-weight:600;padding:12px 0}summary::marker{color:var(--accent)}.cue h3 small{display:inline-block;margin-left:12px}.steps li{margin:12px 0}strong{font-weight:700}.state{border-left:4px solid var(--accent);padding-left:16px}code{overflow-wrap:anywhere}footer{padding:0 16px 32px}li{max-width:50em}@media(max-width:800px){main{padding:16px}header,section{padding:24px 16px}.parallel{grid-template-columns:1fr;gap:16px}h1{font-size:28px}.downloads{display:grid}.cue h3 small{display:block;margin:8px 0}}@media print{body{background:white}main{padding:0}.downloads{display:none}header,section{padding:16px 0}details{break-inside:avoid}a{color:inherit}}@media(prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important}}</style>
<main><header><div class="label">舞台スケッチ / 台本キュー用素材 / 2026-09-09 / ローカル・未公開</div><h1>ロミオとジュリエット</h1><p>日英の全文と、キューを付けて試す3場面。最初は「出会い」の1頁で、台詞と動作にキューを置く感触を確かめてください。</p><div class="downloads"><a href="output/pdf/romeo-juliet-excerpts-ja-v1.pdf">日本語 PDF · 3頁</a><a href="output/pdf/romeo-juliet-excerpts-en-v1.pdf" lang="en">English PDF · 3 pages</a></div><p class="state">このPDFは古典の抜粋を新しく組版したテスト資料です。日本語は坪内逍遙訳の旧字旧仮名。日英は同じ場面に対応しますが、ト書きや文の区切りが異なるため、逐語対訳ではありません。演出案は未採用で、製品への取込み・保存・公開は行っていません。</p></header>
<section><h2>使える版と全文</h2><div class="parallel"><div><h3>日本語：坪内逍遙訳</h3><p>青空文庫『ロミオとヂュリエット』。底本は中央公論社『新修シェークスピヤ全集』第25卷、1933年。訳者は1935年没。日本で保護期間が満了した訳文として利用する版をここに固定します。</p><a href="sources/romeo-juliet-ja-aozora-utf8.txt">全文 TXT（UTF-8・ルビと由来付き）</a><br><a href="sources/aozora-42773-original.zip">青空文庫から取得した原ZIP</a><br><a href="https://www.aozora.gr.jp/cards/000264/card42773.html">青空文庫の図書カード</a></div><div><h3 lang="en">English: William Shakespeare</h3><p>Project Gutenberg eBook #1513。英語の作品本文はパブリックドメイン。配布元は米国での権利状態を表示しているため、日本語訳の確認とは分けて記録しました。</p><a href="sources/romeo-juliet-en-body.txt" lang="en">Full play TXT (UTF-8, text only)</a><br><a href="sources/gutenberg-1513-original.txt" lang="en">Original download with its licence</a><br><a href="https://www.gutenberg.org/ebooks/1513">Project Gutenberg の書誌</a></div></div><details><summary>権利・出典・加工内容</summary><p>シェイクスピアは1616年没、坪内逍遙は1935年没。これらの年代と日本の保護期間の規則から、今回の作品本文と訳文は日本で保護期間が満了したものと判断しました。2018年の延長は既に切れた権利を復活させません。現代の別訳、映画・ミュージカル版の脚本、音楽、録音、写真はこの判断に含みません。日本以外での日本語訳の配布は国ごとに未確認です。</p><a href="https://www.bunka.go.jp/seisaku/chosakuken/hokaisei/kantaiheiyo_chosakuken/1411890.html">文化庁：保護期間 Q&amp;A（問2・4・5・10）</a><p>青空文庫は保護期間の切れた収録作品について複製・再配布・実演・翻案等の利用を案内しています。書誌データは青空文庫に帰属を表示し、CC BY 4.0の対象として作品本文と区別します。</p><a href="https://www.aozora.gr.jp/guide/kijyunn.html">青空文庫：収録ファイルの取り扱い規準</a><br><a href="https://creativecommons.org/licenses/by/4.0/">書誌データ：CC BY 4.0</a><p>日本語全文は元ZIPを保持し、Shift_JISからUTF-8へ変換。入力 osawa、校正 土屋隆、作成2010年7月23日、修正2010年11月9日。抜粋PDFと下の本文だけ、ルビと組版注記を取り除きました。旧字旧仮名は維持し、外字4種だけを説明に対応するUnicode文字（ヺ・ヹ・廻・鼷）へ置換しています。対応表は出典台帳に記録しました。現代語訳ではありません。底本紙面との一字ずつの校合は未実施です。</p><p>英語の原ダウンロードはライセンスを含めて保持。本文用TXTは電子書籍の前後の配布文を除去。PDFは新規組版し、出典を謝辞として記載しています。配布元の名称を商品のブランドにせず、改変版の配布時にはその商標条件も区別して扱います。</p><a href="https://www.gutenberg.org/policy/license.html">Project Gutenberg：本文と商標・ライセンスの区別</a><br><a href="source-manifest.json">取得URL・SHA-256・加工履歴</a></details></section>
<section><h2>テスト用の3場面</h2><p>各PDFは1場面1頁。右側に書込み用の余白を残しています。元テキストの行番号はこの保存ファイル上の位置で、シェイクスピアの標準詩行番号でも、出版物の頁番号でもありません。</p>SCENES</section>
<section><h2>8つのキュー案</h2><p>呼ぶ箇所と内容を試すための提案です。所要秒数・出演者・舞台位置は未設定。同じ言葉でも別の場面／話者／前後文なら同じ位置と扱わず、下の2つの呪いは別cueIdを持たせています。</p>CUES<details><summary>GO以外の2つの注記とデータ</summary><p>① 乳母が呼ぶ箇所に次場の LX 21 の待機注記。これはGOを発火しません。② 窓辺で頬を手に預ける箇所に、視線・配置図への参照候補。こちらはcueを作りません。場面間は抜粋により省略されており、原作の連続進行時間は表しません。</p><a href="sample-fixture.json">抜粋・8キュー・2注記のJSON</a><p>このJSONは設計検証用の独立資料で、現行の舞台スケッチへ直接インポートする形式ではありません。PDF上の座標、転換作業への実参照、本人の採用状態は未設定です。英語版と日本語版の位置はそれぞれ別に持ちます。</p></details></section>
<section><h2>ショーへ育てる方向案</h2><p class="state">以下は原作にない演出提案です。作品としての採否、尺、人数、道具、結末の扱いは未決定。</p><p><strong>「触れる → 届く → 受け渡しが途切れる」</strong>を繰り返し、ジャグリングや身体の受け渡しで関係の変化を見せる案。技が起きたことで、相手への信頼や二つの家の距離が変わる構成にします。</p><ol class="steps"><li><strong>二つの家：</strong>同じ道具を使う二組が、互いに交わらない軌道を持つ。原作の対立を空間で示す。</li><li><strong>出会い：</strong>周囲では相手を替えながら受け渡す群舞。二人だけが同じ道具を返し続け、やがて手の接触へ変わる。最初に作り込む候補。</li><li><strong>窓辺：</strong>上下・遠近の隔たりを視線と物の受け渡しで見せる。空中演技は選択肢だが、まず床上の配置でも成立する場面にする。</li><li><strong>決闘：</strong>遊びだった応酬が、相手を支配するやり取りへ変質する。原作のマーキューシオーの傷と反復する言葉で、冒頭のリズムが戻れなくなる。</li><li><strong>届かない知らせ：</strong>手紙の行き違いを、客には見えている受け渡し経路の断絶として示す。原作の知らせが届かない出来事を身体表現へ置き換える。</li><li><strong>終幕：</strong>二人がいた場所の不在を残し、二つの家が初めて同じものを支える。原作の悲劇と和解を保つ案。結末の変更は別の採用判断にする。</li></ol><p>最初の完成単位は第1幕第5場の短いデュエット。台詞中心の演劇としても、要所の言葉を残すサーカスとしても比較できます。安全な実施方法やリギングの設計を示す資料ではありません。</p></section>
<section><h2>確認できたこと・次に試すこと</h2><p>原配布ファイル2件を保存。日英PDF各3頁を生成し、すべての抜粋ブロックのテキスト抽出一致、フォントの文字収録、8つのキュー位置と同一台詞の複数出現を機械確認しました。</p><p>台本キュー機能への取込み、PDF改訂後のアンカー維持、実タブレット操作、演出の試演、ショー全編の制作はこれからです。続きは、まず日本語PDFの1頁に LX 11・SD 11・LX 12 を置き、配置と1回の転換に結び付ける検証が小さな一歩になります。</p><a href="QA.md">検証記録と未確認項目</a><br><a href="TOKEN_SHEET.md">組版・画面のトークン</a></section><footer><small>ローカルのテスト資料。原作・翻訳の出典と、Codexによる抜粋選定・組版・演出案を区別して記録。自動公開や既存ショーデータへの書込みなし。</small></footer></main></html>'''
(ROOT/'index.html').write_text(page.replace('SCENES',scene_html).replace('CUES',cue_html),encoding='utf-8')
save_json('validation.json',{'date':'2026-09-09','sourceFiles':2,'scenes':3,'cues':8,'nonGoAnnotations':2,'pdfs':pdf_results,'uniqueCueIds':len({x['cueId'] for x in cues})==8,'everyAnchorResolved':True,'repeatedPhraseAnchorsSeparated':cues[-2]['go']['ja']['sourceLine']!=cues[-1]['go']['ja']['sourceLine'],'browserImportTest':'not_performed','pdfVisualCheck':'see QA.md'})
print(json.dumps({'pdfs':pdf_results,'cues':len(cues),'annotations':len(annotations)},ensure_ascii=False))
