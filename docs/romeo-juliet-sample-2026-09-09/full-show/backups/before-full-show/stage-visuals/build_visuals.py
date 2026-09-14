"""Build SVG stage diagrams and a self-contained, local visual scene book."""
from pathlib import Path
import json, math, html

HERE=Path(__file__).resolve().parent
data=json.loads((HERE/'layouts.json').read_text())
esc=html.escape
svg_dir=HERE/'svg'
svg_dir.mkdir(exist_ok=True)
INK='#2b2620'; RULE='#75664f'; PAPER='#fffaf0'; FLOOR='#ddd2bc'
BAR_TOP='#77563c'; BAR_FRONT='#9b7248'; BAR_SHELF='#4d3525'; BAR_BOTTLE='#d5b77d'
FAMILY_COLORS={
    role: side['color']
    for side in (data['familyPalette']['montagueSide'], data['familyPalette']['capuletSide'])
    for role in side['roles']
}

def display_color(person):
    """Use household colour only while the performer is the named character."""
    if person['roleMode']=='named':
        return FAMILY_COLORS.get(person['characterRoleId'], person['color'])
    return person['color']

def is_masquerade(frame):
    return frame['cueId'] in data['masqueradeInterior']['cueIds']

def svg(frame,view):
    def point(u,v):
        return (160+700*u+160*v,240-145*u+285*v) if view=='iso' else (140+820*u,105+440*v)
    def coords(points):return ' '.join(f'{x:.1f},{y:.1f}' for x,y in points)
    def poly(points,fill,extra=''):return f'<polygon points="{coords(points)}" fill="{fill}" {extra}/>'
    def text(x,y,value,size=19,color=INK,anchor='middle',extra=''):
        return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" text-anchor="{anchor}" {extra}>{esc(value)}</text>'
    corners=[point(0,0),point(1,0),point(1,1),point(0,1)]
    pieces=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="680" viewBox="0 0 1100 680" role="img" aria-labelledby="title description" data-frame="{frame["id"]}" data-view="{view}">',f'<title id="title">{esc(frame["title"])}／{"斜め図" if view=="iso" else "平面図"}</title>',f'<desc id="description">{esc(frame["summary"])} 位置は検討案。左は客席から見た左、下側は客席。</desc>',f'<rect width="1100" height="680" fill="{PAPER}"/>',f'<defs><clipPath id="floor"><polygon points="{coords(corners)}"/></clipPath><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1L9 5L0 9" fill="none" stroke="{RULE}" stroke-width="1.5"/></marker></defs>', '<g font-family="Hiragino Kaku Gothic ProN,Yu Gothic,sans-serif">']
    pieces.append(text(36,40,('斜め図' if view=='iso' else '平面図')+' · 配置検討',18,anchor='start'))
    if frame.get('flag'):pieces.append(text(1064,40,frame['flag'],18,'#8f3e1e','end',extra='font-weight="700"'))
    if view=='iso':
        for a,b in [(corners[0],corners[3]),(corners[3],corners[2])]:
            pieces.append(poly([a,b,(b[0],b[1]+24),(a[0],a[1]+24)],'#c5b79c',f'stroke="{RULE}" stroke-width="2"'))
    pieces.append(poly(corners,FLOOR,f'stroke="{RULE}" stroke-width="2"'))
    pieces.append('<g clip-path="url(#floor)">')
    for zone in frame['zones']:
        u,v,w,h=[zone[k] for k in ['u','v','w','h']]
        pts=[point(u,v),point(u+w,v),point(u+w,v+h),point(u,v+h)]
        pieces.append(poly(pts,'#ebe2d0',f'fill-opacity=".6" stroke="{RULE}" stroke-width="1.5" stroke-dasharray="6 7"'))
    for light in frame['lightPools']:
        pts=[point(light['u']+light['ru']*math.cos(i*math.tau/64),light['v']+light['rv']*math.sin(i*math.tau/64)) for i in range(64)]
        pieces.append(poly(pts,PAPER,'opacity=".7"'))
    pieces.append('</g>')
    if is_masquerade(frame):
        for set_piece in data['masqueradeInterior']['setPieces']:
            if set_piece['kind']!='bar_counter':
                raise ValueError(f'Unsupported set piece: {set_piece["kind"]}')
            u,v,w,h=[set_piece[key] for key in ['u','v','w','h']]
            bar=[point(u,v),point(u+w,v),point(u+w,v+h),point(u,v+h)]
            pieces.append(f'<g class="set-piece" data-kind="bar_counter"><title>{esc(set_piece["label"])}：{esc(set_piece["intent"])}</title>')
            shelf=[point(u+w*.18,v-h*.34),point(u+w*.82,v-h*.34),point(u+w*.82,v-h*.08),point(u+w*.18,v-h*.08)]
            pieces.append(poly(shelf,BAR_SHELF,f'stroke="{RULE}" stroke-width="1.5"'))
            for bottle in range(6):
                bx,by=point(u+w*(.25+bottle*.10),v-h*.20)
                pieces.append(f'<rect x="{bx-4:.1f}" y="{by-11:.1f}" width="8" height="14" rx="2" fill="{BAR_BOTTLE}"/>')
            if view=='iso':
                front=[bar[3],bar[2],(bar[2][0],bar[2][1]+18),(bar[3][0],bar[3][1]+18)]
                pieces.append(poly(front,BAR_FRONT,f'stroke="{RULE}" stroke-width="1.5"'))
            pieces.append(poly(bar,BAR_TOP,f'stroke="{RULE}" stroke-width="1.5"'))
            cx,cy=point(u+w*.5,v+h*.5)
            pieces.append(text(cx,cy+6,set_piece['label'],16,PAPER,extra='font-weight="700"'))
            pieces.append('</g>')
    # A thin downstage edge and audience mark keep left/right consistent in both projections.
    a,b=point(0,1),point(1,1)
    pieces.append(f'<path d="M{a[0]},{a[1]} L{b[0]},{b[1]}" stroke="{RULE}" stroke-width="4"/>')
    ax,ay=point(.5,1.27 if view=='iso' else 1.13)
    pieces.append(text(ax,ay+8,'客席側',23,extra='font-weight="700"'))
    pieces.append(text(60,588,'客席から見て左',16,anchor='start'))
    pieces.append(text(1040,588,'客席から見て右',16,anchor='end'))
    bx,by=point(.5,0)
    pieces.append(text(bx,by-56,'舞台奥',17))
    for zone in frame['zones']:
        if zone['kind']=='river':
            continue
        zx,zy=point(zone['u']+zone['w']/2,zone['v'])
        pieces.append(text(zx,zy-23,zone['label'],18,extra='font-weight="700"'))
    for p in frame['people']:
        route=p.get('route')
        if route:
            x,y=point(p['u'],p['v']); tx,ty=point(route['u'],route['v'])
            if 'bu' in route:
                cx,cy=point(route['bu'],route['bv']); path=f'M{x},{y} Q{cx},{cy} {tx},{ty}'
            else:path=f'M{x},{y} L{tx},{ty}'
            pieces.append(f'<path class="route" d="{path}" fill="none" stroke="{RULE}" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#arrow)"/>')
    for p in sorted(frame['people'],key=lambda p:point(p['u'],p['v'])[1]):
        x,y=point(p['u'],p['v']); color=display_color(p); pose=p['pose']
        masked=p.get('state')=='仮面' or is_masquerade(frame)
        state=p.get('state') or ('仮面' if masked else '')
        pieces.append(f'<g class="person" data-performer="{p["performerRoleId"]}" data-character="{p["characterRoleId"] or "ensemble"}" data-state="{state}" data-u="{p["u"]}" data-v="{p["v"]}" data-pose="{pose}"><title>{esc(p["name"]+("／"+state if state else ""))}</title>')
        if view=='iso':
            pieces.append(f'<ellipse cx="{x}" cy="{y+3}" rx="20" ry="7" fill="{INK}" opacity=".14"/>')
            if pose=='lie':
                hx,hy=x-12,y-7
                pieces.append(f'<path d="M{x+5},{y}L{x+35},{y+6} M{x+22},{y+3}L{x+25},{y-10} M{x+35},{y+6}L{x+50},{y} M{x+35},{y+6}L{x+44},{y+17}" fill="none" stroke="{color}" stroke-width="8" stroke-linecap="round"/>')
            else:
                lower=10 if pose in ['kneel','crouch'] else 0
                hx,hy=x,y-44+lower
                arms=f'M{x-17},{y-23+lower}L{x},{y-19+lower}L{x+17},{y-23+lower}' if pose in ['open','reach'] else f'M{x-13},{y-13}L{x},{y-21}L{x+13},{y-13}'
                pieces.append(f'<path d="M{x},{y-25+lower}L{x},{y-9} M{x},{y-9}L{x-9},{y+1} M{x},{y-9}L{x+9},{y+1} {arms}" stroke="{color}" stroke-width="8" fill="none" stroke-linecap="round"/>')
        else:hx,hy=x,y
        pieces.append(f'<circle cx="{hx}" cy="{hy}" r="21" fill="{color}" stroke="{PAPER}" stroke-width="3"/>')
        if masked:
            pieces.append(f'<path class="mask" d="M{hx-12:.1f},{hy-10:.1f} Q{hx:.1f},{hy-16:.1f} {hx+12:.1f},{hy-10:.1f} L{hx+9:.1f},{hy-2:.1f} Q{hx:.1f},{hy+2:.1f} {hx-9:.1f},{hy-2:.1f}Z" fill="{PAPER}" stroke="{INK}" stroke-width="1.2"/>')
            pieces.append(f'<circle cx="{hx-4:.1f}" cy="{hy-7:.1f}" r="1.7" fill="{INK}"/><circle cx="{hx+4:.1f}" cy="{hy-7:.1f}" r="1.7" fill="{INK}"/>')
        pieces.append(text(hx,hy+7,p['label'],19,PAPER,extra='font-weight="700"'))
        if pose=='back':pieces.append(text(hx,hy-30,'背',14))
        if pose!='lie':
            a=math.radians(p['facing']); dx,dy=point(p['u']+.07*math.sin(a),p['v']-.07*math.cos(a))
            vx,vy=dx-x,dy-y; length=math.hypot(vx,vy)
            vx,vy=vx/length,vy/length
            base=27 if view=='plan' else 10
            pieces.append(f'<path class="facing" d="M{x+vx*base},{y+vy*base}l{vx*12},{vy*12}" stroke="{color}" stroke-width="3" stroke-linecap="round"/>')
        pieces.append('</g>')
    if frame['offstageVoice']:
        pieces.append(f'<g class="crew-voice"><rect x="920" y="22" width="162" height="76" rx="2" fill="{PAPER}" stroke="{RULE}" stroke-width="2" stroke-dasharray="6 5"/>{text(1001,51,"大道具さん",18)}{text(1001,80,"袖から声／位置は仮",14)}<path d="M998 104q0 26 -30 43" stroke="{RULE}" fill="none" stroke-width="2"/></g>')
    pieces.append(text(36,643,'位置・舞台寸法は検討案。破線の矢印＝移動案／短い線＝向き。',16,anchor='start'))
    pieces.append(text(1064,643,f'舞台上 {len(frame["people"])}名',17,anchor='end'))
    pieces.append('</g></svg>')
    return ''.join(pieces)

for frame in data['frames']:
    assert len({p['performerRoleId'] for p in frame['people']})==len(frame['people'])<=10
    for view in ['iso','plan']:
        (svg_dir/f'{frame["id"]}-{view}.svg').write_text(svg(frame,view))

payload=json.dumps(data,ensure_ascii=False).replace('</','<\\/')
template=(HERE/'template.html').read_text()
(HERE/'index.html').write_text(template.replace('<!--LAYOUT_DATA-->',payload))
print(f'Built {len(data["frames"])} frames in two views and the visual scene book.')
