"""Pack the visual book, diagrams and current scripts into one offline HTML.

Run after build_visuals.py and the two condensed-show builders. No source
dialogue/layout is changed. The output can be copied alone and opened locally.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
import base64
import html
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUTPUT = HERE / 'ロミオとジュリエット_舞台構成図_オフライン.html'
DOCS = {
    'condensed-show/index.html': '全体構成',
    'condensed-show/scene-02/index.html': '第2場面の台本',
}

def packed(value):
    return json.dumps(value, ensure_ascii=False).replace('<', '\\u003c')

def data_uri(path):
    mime = {'.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain'}[path.suffix]
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

def resolve(base, href):
    url = urlsplit(urljoin('https://offline.invalid/' + base, href))
    path = unquote(url.path.lstrip('/'))
    if path.endswith('/'):
        path += 'index.html'
    return path, unquote(url.fragment), url.netloc == 'offline.invalid'

class Embed(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=False)
        self.base, self.parts = base, []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img' and attrs.get('src'):
            path, _, local = resolve(self.base, attrs['src'])
            assert local and path.startswith('stage-visuals/svg/'), path
            attrs['src'] = data_uri(ROOT / path)
            attrs['loading'] = 'eager'
        if tag == 'a' and attrs.get('href'):
            href = attrs['href']
            path, fragment, local = resolve(self.base, href)
            if local and path == self.base and href.startswith('#'):
                pass
            elif local and path in DOCS:
                attrs.update(href='#saved-document', **{'data-offline-doc': path, 'data-fragment': fragment})
            elif local and path == 'stage-visuals/index.html':
                attrs.update(href='#stage-visual', **{'data-offline-visual': fragment})
            elif local and path.endswith(('.json', '.md')) and (ROOT / path).is_file():
                attrs.update(href=data_uri(ROOT / path), download=Path(path).name)
            else:
                attrs.pop('href', None)
                attrs['title'] = 'この保存版の収録外の資料です'
                attrs['aria-disabled'] = 'true'
        self.parts.append('<' + tag + ''.join(' ' + k + ('="' + html.escape(v, quote=True) + '"' if v is not None else '') for k, v in attrs.items()) + '>')

    def handle_endtag(self, tag): self.parts.append('</' + tag + '>')
    def handle_data(self, value): self.parts.append(value)
    def handle_entityref(self, value): self.parts.append('&' + value + ';')
    def handle_charref(self, value): self.parts.append('&#' + value + ';')
    def handle_decl(self, value): self.parts.append('<!' + value + '>')
    def handle_comment(self, value): self.parts.append('<!--' + value + '-->')

documents = {}
for path, title in DOCS.items():
    parser = Embed(path)
    parser.feed((ROOT / path).read_text())
    document = ''.join(parser.parts).replace('</head>', '<style>a[aria-disabled=true]{color:var(--muted);text-decoration:none;cursor:default}</style></head>')
    documents[path] = {'title': title, 'html': document}

assets = {p.name: data_uri(p) for p in sorted((HERE / 'svg').glob('*.svg'))}
source = (HERE / 'index.html').read_text()
parser = Embed('stage-visuals/index.html')
parser.feed(source)
source = ''.join(parser.parts)
old = 'function imageURL(){return `svg/${current().id}-${view}.svg`}'
assert old in source
source = source.replace(old, 'function imageURL(){return offlineAssets[`${current().id}-${view}.svg`]}')
source = source.replace("'use strict';", "'use strict';\nconst offlineAssets=JSON.parse(document.querySelector('#offline-assets').textContent);", 1)
source = source.replace('<title>ロミオとジュリエット｜舞台構成図</title>', '<title>ロミオとジュリエット｜舞台構成図・オフライン保存版</title>')
source = source.replace('3場面の配置と動きを、図でたどる', 'オフライン保存版 · 2026-09-11 · このHTMLだけで閲覧できます')
source = source.replace('data-artifact="RJ-VISUALS-01"', 'data-artifact="RJ-VISUALS-OFFLINE-01"')
style = '''<style>
#saved-document{width:min(1200px,96vw);height:92vh;max-width:96vw;max-height:92vh;padding:0;border:1px solid var(--line);background:var(--page);color:var(--ink)}
#saved-document[open]{display:flex;flex-direction:column}#saved-document::backdrop{background:rgb(43 38 32 / .45)}
.saved-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;border-bottom:1px solid var(--line)}
#saved-title{font:16px/1.8 var(--sans)}#saved-document iframe{flex:1;min-height:0;width:100%;border:0}a[aria-disabled=true]{color:var(--muted);text-decoration:none}
</style>'''
source = source.replace('</head>', style + '</head>')
payload = '<script type="application/json" id="offline-assets">' + packed(assets) + '</script>'
payload += '<script type="application/json" id="offline-docs">' + packed(documents) + '</script>'
source = source.replace('<script id="data"', payload + '<script id="data"', 1)
addon = '''
<dialog id="saved-document" aria-labelledby="saved-title"><div class="saved-toolbar"><h2 id="saved-title"></h2><button type="button" id="close-document">図に戻る</button></div><iframe title="保存した台本・全体構成"></iframe></dialog>
<script>
const savedDocs=JSON.parse(document.querySelector('#offline-docs').textContent);
const reader=document.querySelector('#saved-document'),readerFrame=reader.querySelector('iframe');
function openDocument(key,fragment=''){
 const doc=savedDocs[key];if(!doc)return;
 document.querySelector('#saved-title').textContent=doc.title+' · 保存版';
 readerFrame.dataset.ready='';
 readerFrame.onload=async()=>{
  const inside=readerFrame.contentDocument;
  inside.addEventListener('click',handleSavedLink);
  await Promise.all(Array.from(inside.images,img=>img.decode().catch(()=>{})));
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(readerFrame.contentDocument!==inside)return;
  if(fragment)inside.getElementById(fragment)?.scrollIntoView({behavior:'instant'});
  readerFrame.dataset.ready=key+'#'+fragment;
 };
 readerFrame.srcdoc=doc.html;if(!reader.open)reader.showModal();
}
function handleSavedLink(event){
 const a=event.target.closest('a');if(!a)return;
 if(a.hasAttribute('data-offline-doc')){event.preventDefault();openDocument(a.dataset.offlineDoc,a.dataset.fragment);}
 else if(a.hasAttribute('data-offline-visual')){event.preventDefault();reader.close();const id=a.dataset.offlineVisual;const index=data.frames.findIndex(f=>f.id===id||f.sceneId===id||f.cueId===id);go(index<0?0:index);}
}
document.addEventListener('click',handleSavedLink);
document.querySelector('#close-document').addEventListener('click',()=>reader.close());
document.querySelector('#script-link').addEventListener('click',event=>{
 event.preventDefault();const url=current().scriptUrl;const key=url.includes('/scene-02/')?'condensed-show/scene-02/index.html':'condensed-show/index.html';
 openDocument(key,url.split('#')[1]||'');
});
</script>'''
source = source.replace('</body>', addon + '</body>')
OUTPUT.write_text(source)
print(f'Created {OUTPUT.name}: {OUTPUT.stat().st_size:,} bytes, {len(assets)} diagrams, {len(documents)} documents.')
