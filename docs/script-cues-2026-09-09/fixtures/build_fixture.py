from pathlib import Path
import json, subprocess
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import pdfplumber
ROOT=Path(__file__).resolve().parents[1]
FONT='/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
pdfmetrics.registerFont(TTFont('FixtureJP', FONT))
W,H=420,595
ROWS={
 'original':[
 [('door','アキ　あの扉を開けて。'),('walk','［二人が舞台中央へ歩く］'),('bell','レン　遠くで鐘が聞こえる。'),('wait','［二人は立ち止まる］')],
 [('look','［扉が開き、二人は奥を見る］'),('go','アキ　あちらへ行こう。'),('step','［静かに一歩進む］'),('end','レン　もう大丈夫。')]],
 'revised':[
 [('pause','アキ　少し待って。'),('door','アキ　あの扉を開けて。'),('face','［互いに顔を見合わせる］'),('walk','［二人が舞台中央へ歩く］')],
 [('bell','レン　遠くで鐘が聞こえる。'),('look','［扉が開き、二人は奥を見る］'),('go','アキ　あちらへ行こう。'),('step','［静かに一歩進む］')]]}
manifest={'kind':'stage-script-assignment-fixture','version':1,'width':W,'height':H,'versions':{}}
for version,pages in ROWS.items():
 name='旧版' if version=='original' else '改訂版'
 path=ROOT/'output/pdf'/f'fixture-script-{version}.pdf'
 c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
 c.setTitle('扉の向こう - '+name+'（検証用の架空台本）');c.setAuthor('Stage Sketch prototype')
 for num,rows in enumerate(pages,1):
  c.setFillColor(HexColor('#fffaf0'));c.rect(0,0,W,H,fill=1,stroke=0)
  c.setFillColor(HexColor('#2b2620'));c.setFont('FixtureJP',22);c.drawString(36,H-53,'扉の向こう')
  c.setFont('FixtureJP',11);c.drawString(36,H-78,f'検証用の架空台本 / {name} / {num}頁')
  c.setStrokeColor(HexColor('#75664f'));c.line(36,H-93,384,H-93)
  c.setFont('FixtureJP',18)
  for i,(_,line) in enumerate(rows):c.drawString(36,H-(140+i*100),line)
  c.setFont('FixtureJP',11);c.setFillColor(HexColor('#6a604e'));c.drawString(36,35,'操作確認用の仮素材。作品の原稿ではありません。')
  c.showPage()
 c.save()
 subprocess.run(['/opt/homebrew/bin/pdftoppm','-r','144','-png',str(path),str(ROOT/'fixtures'/version)],check=True)
 entry={'label':name,'pdf':str(path.relative_to(ROOT)),'pages':[]}
 with pdfplumber.open(path) as pdf:
  for index,p in enumerate(pdf.pages):
   chars=[x for x in p.chars if abs(x['size']-18)<.01]
   ys=sorted(set(round(x['top'],2) for x in chars))
   assert len(ys)==4,(version,ys)
   extracted=[]
   for y,(rid,expected) in zip(ys,pages[index]):
    row=sorted([x for x in chars if abs(x['top']-y)<.1],key=lambda x:x['x0'])
    text=''.join(x['text'] for x in row)
    assert text==expected,(text,expected)
    extracted.append({'id':rid,'text':text,'rect':[min(x['x0'] for x in row)/W,min(x['top'] for x in row)/H,max(x['x1'] for x in row)/W,max(x['bottom'] for x in row)/H]})
   entry['pages'].append({'image':f'fixtures/{version}-{index+1}.png','rows':extracted})
 manifest['versions'][version]=entry
(ROOT/'fixtures/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'pdfs':2,'pages':4,'verified_rows':16,'font':'embedded Arial Unicode subset'},ensure_ascii=False))
