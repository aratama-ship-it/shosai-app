from pathlib import Path
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from pypdf.annotations import FreeText
R=Path(__file__).resolve().parents[1];D=Path('/private/tmp/pdf-import-qa-20260909');D.mkdir(exist_ok=True)
pdf=R/'output/pdf/fixture-script-original.pdf'
c=canvas.Canvas(str(D/'scan.pdf'),pagesize=(420,595));c.drawImage(str(R/'fixtures/original-1.png'),0,0,width=420,height=595);c.save()
r=PdfReader(pdf);w=PdfWriter();w.add_page(r.pages[0]);w.add_page(r.pages[1]);w.add_page(r.pages[0]);w.pages[1].rotate(90);w.pages[2].cropbox.lower_left=(20,20);w.write(D/'three-pages-rotated.pdf')
w=PdfWriter();w.append(pdf);w.encrypt('test-stage');w.write(D/'password.pdf')
w=PdfWriter();w.append(pdf);w.add_annotation(page_number=0,annotation=FreeText(text='LX 22 - imported note',rect=(40,385,360,420),font_size='16pt',font_color='000000',background_color='FFFFAA'));w.write(D/'annotated.pdf')
print('4 temporary PDF QA inputs created; no original modified.')
