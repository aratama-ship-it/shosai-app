"""Build a standalone copy of the local Stage Write reference guide."""
from pathlib import Path
import base64
import mimetypes
import re

root = Path(__file__).resolve().parents[1]
html = (root / "stagewrite-guide.html").read_text()

def embed(match):
    attr, relative = match.groups()
    path = root / relative
    media = mimetypes.guess_type(path.name)[0]
    if not media or not media.startswith("image/"):
        return match.group(0)
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f'{attr}="data:{media};base64,{data}"'

html = re.sub(r'(src|href)="(stagewrite-guide-assets/[^"#]+)"', embed, html)
html = re.sub(r'<a [^>]*data-offline[^>]*>.*?</a>',
              '<span>画像を含む単体保存版です。</span>', html)

def local_link(match):
    attributes, href, label = match.groups()
    if href.startswith(("#", "data:", "https:", "http:")):
        return match.group(0)
    return f'<span>{label}（通常版から参照）</span>'

html = re.sub(r'<a ([^>]*?)href="([^"]+)"[^>]*>(.*?)</a>', local_link, html)
(root / "stagewrite-guide-offline.html").write_text(html)
print("Standalone HTML:", len(html.encode()), "bytes")
