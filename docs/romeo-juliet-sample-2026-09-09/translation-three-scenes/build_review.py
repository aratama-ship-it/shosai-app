"""Build the three-scene review without writing to the first meeting draft or app."""
from pathlib import Path
import copy
import hashlib
import html
import json
import re

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
source_bytes = (BASE / 'sources/gutenberg-1513-original.txt').read_bytes()
source_lines = source_bytes.decode('utf-8-sig').splitlines()
first_bytes = (BASE / 'translation-draft/draft.json').read_bytes()
first = json.loads(first_bytes)
new = json.loads((HERE / 'new-translations.json').read_text())
names = {'ROMEO':'ロミオ','JULIET':'ジュリエット','NURSE':'乳母','TYBALT':'ティボルト','MERCUTIO':'マーキューシオ','BENVOLIO':'ベンヴォーリオ'}
scenes = [{
    'id':'RJ-I-5', 'title':'出会い', 'scope':first['scope'], 'sourceRange':[1300,1341],
    'description':'二人が祈りと聖者の比喩を交わす出会い。ご本人が方向性を確認した初稿を収録しています。',
    'translationNotes':first['translationNotes'], 'blocks':copy.deepcopy(first['speeches']),
}, *new['scenes']]
all_blocks = []
for scene in scenes:
    for b in scene['blocks']:
        b['sceneId'] = scene['id']
        b.setdefault('kind','speech')
        r = b['sourceLines']
        if isinstance(r,list): b['sourceLines'] = {'start':r[0],'end':r[1]}
        start,end = b['sourceLines']['start'],b['sourceLines']['end']
        raw = '\n'.join(source_lines[start-1:end])
        if 'englishRaw' in b: assert b['englishRaw'] == raw
        b['englishRaw'] = raw
        b['userRevisionJa'] = None
        if b['kind'] == 'stage_direction':
            b['speaker'] = ''; b['speakerJa'] = 'ト書き'; b['englishDisplay'] = raw.strip()
        else:
            b['speakerJa'] = names[b['speaker']]
            if b.get('continuedSpeech'):
                b['englishDisplay'] = raw
            else:
                assert raw.splitlines()[0] == b['speaker'] + '.', b['id']
                b['englishDisplay'] = '\n'.join(raw.splitlines()[1:])
        all_blocks.append(b)
    expected = {i for i in range(scene['sourceRange'][0],scene['sourceRange'][1]+1) if source_lines[i-1].strip()}
    observed = []
    for b in scene['blocks']:
        observed += [i for i in range(b['sourceLines']['start'],b['sourceLines']['end']+1) if source_lines[i-1].strip()]
    assert len(observed) == len(set(observed)), scene['id']
    assert set(observed) == expected, (scene['id'], expected-set(observed))
assert len({b['id'] for b in all_blocks}) == len(all_blocks)

data = {
    'schema':'stage-sketch.translation-review.v2','draftId':'romeo-juliet-three-scenes-ja-v1',
    'title':'ロミオとジュリエット｜3場面の下訳','scope':'出会い／窓辺と名前／決闘と呪い・3場面の抜粋',
    'date':'2026-09-09','status':'ai_draft_for_user_revision','adopted':False,
    'styleRequest':first['styleRequest'],
    'userDirection':'現在の台詞の方向性で下訳を続ける。最終的な推敲は本人が行う。',
    'source':copy.deepcopy(first['source']),
    'baselineProvenance':{'firstMeetingDraft':'../translation-draft/draft.json','sha256':hashlib.sha256(first_bytes).hexdigest()},
    'scenes':[{k:v for k,v in s.items() if k!='blocks'} for s in scenes],
    'blocks':all_blocks,
}
assert data['source']['sha256'] == hashlib.sha256(source_bytes).hexdigest()

# These are proposed text anchors; no PDF coordinates, app imports or adoption.
cue_specs = [
 ('LX 11','lighting','RJ-I-5-D01','この不作法な手','If I profane','二人の手元へ光の中心を移す','after_quote'),
 ('SD 11','sound','RJ-I-5-D02','十分な口づけ','palmers’ kiss','周囲の音を引き、接触の瞬間に余白を作る','after_quote'),
 ('LX 12','lighting','RJ-I-5-D11','お母さまが','your mother craves','二人だけの光から周囲の人々へ戻す','after_quote'),
 ('LX 21','lighting','RJ-II-2-T02','ジュリエットが姿を見せる','Juliet appears above','窓側の光を入れる','observed_action_start'),
 ('SD 21','sound','RJ-II-2-D02','ジュリエットは太陽だ','Juliet is the sun','二人の声を残す薄い持続音へ移る','after_quote'),
 ('SD 31','sound','RJ-III-1-T01','二人、剣を交える','They fight.','決闘の動作開始を見て打楽器の層を入れる','observed_action_start'),
 ('LX 31','lighting','RJ-III-1-D05','両家とも、疫病に呑まれろ！','A plague o’ both','最初の呪いの台詞で群像の光を切り分ける','after_quote'),
 ('SD 32','sound','RJ-III-1-D09','両家とも、疫病に呑まれろ！','A plague o’ both','二度目の同じ言葉で打楽器を止める','after_quote'),
]
by_id = {b['id']:b for b in all_blocks}
def anchor(block, quote, language):
    key = 'aiDraftJa' if language=='ja' else 'englishRaw'
    text = block[key]
    assert text.count(quote)==1, (block['id'],quote)
    offset = text.index(quote)
    scene_blocks = [b for b in all_blocks if b['sceneId']==block['sceneId']]
    earlier = scene_blocks[:scene_blocks.index(block)]
    return {'blockId':block['id'],'quote':quote,
            'characterOffsetUtf16':len(text[:offset].encode('utf-16-le'))//2,
            'prefix':text[max(0,offset-32):offset],'suffix':text[offset+len(quote):offset+len(quote)+32],
            'occurrenceWithinScene':1+sum(b[key].count(quote) for b in earlier),
            'matchingOccurrencesInScene':sum(b[key].count(quote) for b in scene_blocks),
            'positionStatus':'proposed','pdfRectangle':None}
cues=[]
for number,kind,bid,ja,en,action,edge in cue_specs:
    b=by_id[bid]
    cues.append({'cueId':'rj-modern-'+number.lower().replace(' ','-'),
                 'basedOnCueId':'rj-cue-'+number.lower().replace(' ','-'),
                 'number':number,'kind':kind,'sceneId':b['sceneId'],'adoption':'proposal',
                 'contentJa':action,'triggerEdge':edge,'go':{'ja':anchor(b,ja,'ja'),'en':anchor(b,en,'en')},
                 'anchorState':'baseline_verified','timeSeconds':None,'stageActionRefs':[]})
cue_data={'schema':'stage-sketch.translation-cue-proposals.v1','appImportCompatible':False,
          'draftId':data['draftId'],'adoption':'proposal','cues':cues,
          'note':'本文の推敲後はキュー位置を再確認する。舞台機材・動作・秒数・PDF座標は未指定。'}
data['cueProposals']=cue_data

def dump(name,value): (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
dump('draft.json',data); dump('cue-proposals.json',cue_data)
txt=[data['title'],data['scope'],'原作：William Shakespeare','日本語：英語原文から作成したAI下訳／2026-09-09','状態：本人による最終推敲前・未採用','']
for s in scenes:
    txt += ['\n'+s['title'],s['scope'],'']
    for b in s['blocks']: txt += [b['speakerJa'],b['aiDraftJa'],'']
(HERE/'ai-draft-ja.txt').write_text('\n'.join(txt)+'\n')

esc=html.escape
sections=[]
for scene in scenes:
    rows=[]
    for i,b in enumerate(scene['blocks'],1):
        rows.append(f'''<article class="speech" id="{b['id']}"><h3 class="speaker"><span class="number">{i:02}</span> {esc(b['speakerJa'])} <span class="speaker-en" lang="en">{b['speaker']}</span></h3>
<div class="columns"><div class="english"><p class="label" lang="en">English original</p><p class="verse" lang="en">{esc(b['englishDisplay'])}</p><p class="source-ref">保存原文 {b['sourceLines']['start']}–{b['sourceLines']['end']} 行</p></div>
<div class="japanese"><label for="edit-{b['id']}">日本語 <span class="row-status">AI下訳</span></label><textarea id="edit-{b['id']}" data-id="{b['id']}" rows="{max(3,len(b['aiDraftJa'].splitlines()))}" spellcheck="false">{esc(b['aiDraftJa'])}</textarea>
<details class="baseline"><summary>最初のAI下訳を確認</summary><p class="verse">{esc(b['aiDraftJa'])}</p></details></div></div></article>''')
    notes=''.join(f'<li><strong>{esc(n["title"])}</strong><p>{esc(n["text"])}</p></li>' for n in scene['translationNotes'])
    sections.append(f'''<section class="scene" id="{scene['id']}"><div class="scene-heading"><h2>{esc(scene['title'])}</h2><p class="meta">{esc(scene['scope'])}</p><p>{esc(scene['description'])}</p><a class="inline-link" href="#contents">場面一覧へ</a></div>{''.join(rows)}<details class="notes"><summary>{esc(scene['title'])} — 訳の判断</summary><ol>{notes}</ol></details></section>''')
nav=''.join(f'<a class="inline-link" href="#{s["id"]}">{i}　{esc(s["title"])}</a>' for i,s in enumerate(scenes,1))
cue_rows=''.join(f'''<tr data-cue-block="{c['go']['ja']['blockId']}"><th scope="row">{c['number']}</th><td><a class="inline-link" href="#{c['go']['ja']['blockId']}">{esc(c['go']['ja']['quote'])}</a><br><span class="meta">{'動作の開始を見る' if c['triggerEdge']=='observed_action_start' else 'この言葉の直後'} · 場面内 {c['go']['ja']['occurrenceWithinScene']} 回目</span></td><td>{esc(c['contentJa'])}<br><span class="anchor-status meta">下訳上の位置を確認済み · 仮キュー</span></td></tr>''' for c in cues)

old_template=(BASE/'translation-draft/review-template.html').read_text()
css=re.search(r'<style>(.*?)</style>',old_template,re.S).group(1)
template=(HERE/'page-template.html').read_text()
page=template.replace('{{CSS}}',css).replace('{{SCENES}}','\n'.join(sections)).replace('{{NAV}}',nav).replace('{{CUES}}',cue_rows).replace('{{DATA}}',json.dumps(data,ensure_ascii=False).replace('<','\\u003c'))
(HERE/'index.html').write_text(page)
assert [b['aiDraftJa'] for b in all_blocks[:11]]==[s['aiDraftJa'] for s in first['speeches']]
dump('validation.json',{'englishSourceExact':True,'nonblankSourceCoverage':'complete in all three declared ranges','uniqueBlockIds':True,'firstMeetingBaselineUnchanged':True,'sceneCount':len(scenes),'speechCount':sum(b['kind']=='speech' for b in all_blocks),'standaloneDirectionCount':sum(b['kind']=='stage_direction' for b in all_blocks),'cueCount':len(cues),'repeatedCurseOccurrencesJa':3,'repeatedCurseOccurrencesEn':3,'sourceSha256':data['source']['sha256'],'indexSha256':hashlib.sha256((HERE/'index.html').read_bytes()).hexdigest()})
print(f'Built {len(scenes)} scenes, {len(all_blocks)} blocks, {len(cues)} cue proposals.')
