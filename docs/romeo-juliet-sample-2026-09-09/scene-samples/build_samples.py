"""Build short, source-backed excerpts for the twelve-part sample outline."""
from pathlib import Path
import hashlib
import html
import json
import re

HERE=Path(__file__).resolve().parent
BASE=HERE.parent
source=(BASE/'sources/gutenberg-1513-original.txt').read_bytes()
lines=source.decode('utf-8-sig').splitlines()
outline=json.loads((BASE/'scene-outline/outline.json').read_text())
choices=json.loads((HERE/'selections.json').read_text())
meeting=json.loads((BASE/'translation-draft/draft.json').read_text())
assert hashlib.sha256(source).hexdigest()==meeting['source']['sha256']
names={'ROMEO':'ロミオ','JULIET':'ジュリエット','NURSE':'乳母','BENVOLIO':'ベンヴォーリオ','TYBALT':'ティボルト','MERCUTIO':'マーキューシオ','FRIAR LAWRENCE':'ロレンス修道士','FRIAR JOHN':'ジョン修道士','CAPULET':'キャピュレット','MONTAGUE':'モンタギュー','STAGE':'ト書き'}
known_speakers={key+'.':key for key in names if key!='STAGE'}
samples=[]
for c in choices['scenes']:
    part=outline['scenes'][c['outlineId']-1]
    segments=c['segments'].copy()
    if c.get('reuseMeetingIds'):
        for sid in c['reuseMeetingIds']:
            b=next(b for b in meeting['speeches'] if b['id']==sid)
            segments.append({'speaker':b['speaker'],'range':[b['sourceLines']['start'],b['sourceLines']['end']],'ja':b['aiDraftJa'].splitlines(),'reusedFrom':sid})
    ja_lines=[]; gap_log=[]; previous_end=None
    for i,s in enumerate(segments,1):
        a,b=s['range']; raw='\n'.join(lines[a-1:b])
        if s['speaker']!='STAGE':
            if s.get('speakerLabelInSource',True): assert raw.splitlines()[0]==s['speaker']+'.', (c['outlineId'],a)
            else:
                nearest=next(known_speakers[t.strip()] for t in reversed(lines[:a-1]) if t.strip() in known_speakers)
                assert nearest==s['speaker'],(c['outlineId'],a,nearest)
        if previous_end is not None:
            assert a>previous_end
            gap=[n for n in range(previous_end+1,a) if lines[n-1].strip()]
            if gap:
                assert s.get('omissionBefore'),(c['outlineId'],gap)
                gap_log.append({'beforeSegment':i,'sourceRange':[previous_end+1,a-1],'label':s['omissionBefore']})
        previous_end=b
        s['id']=f'RJ-SAMPLE-{c["outlineId"]:02}-P{i:02}'
        s['englishRaw']=raw; s['speakerJa']=names[s['speaker']]
        for j,t in enumerate(s['ja']):
            assert t and '\n' not in t
            ja_lines.append((names[s['speaker']]+'　' if s['speaker']!='STAGE' and j==0 else '　' if s['speaker']!='STAGE' else '')+t)
    min_lines,max_lines=c.get('lineRange',[8,12])
    assert min_lines<=len(ja_lines)<=max_lines,(c['outlineId'],len(ja_lines),[min_lines,max_lines])
    samples.append({'id':f'RJ-SAMPLE-{c["outlineId"]:02}','outlineId':c['outlineId'],'title':part['title'],'sceneContext':part['event'],'excerptFocus':c['moment'],'sourceActScene':c['sourceActScene'],'lineCount':len(ja_lines),'lineCountConvention':'Japanese dialogue/direction lines; natural display wrapping and separate omission notes are not counted','jaDraft':'\n'.join(ja_lines),'userRevisionJa':None,'segments':segments,'omissions':gap_log,'note':c.get('note','')})
assert [s['outlineId'] for s in samples]==list(range(1,13))
data={'schema':'stage-sketch.short-script-samples.v1','title':'ロミオとジュリエット｜12シーンの短い抜粋','date':'2026-09-09','style':choices['style'],'status':'ai_draft_for_user_revision','adopted':False,'appImportCompatible':False,'source':meeting['source'],'selectionPolicy':'Selected passages translated from the English original. Context summaries and omission notes are separate from quoted dialogue. This is not a continuous abridged play.','samples':samples}
(HERE/'draft.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
text=[data['title'],'英語原文からのAI下訳／本人の最終推敲前','各シーン約10行の抜粋。第5場面は台詞を抑え、行動で因果関係を見せています。場面の説明と台詞を分けています。','']
for s in samples:
    text.extend([f'{s["outlineId"]:02}　{s["title"]}',f'場面：{s["sourceActScene"]}',f'抜粋箇所：{s["excerptFocus"]}',''])
    for i,seg in enumerate(s['segments']):
        if seg.get('omissionBefore'):text.append('［編集注：'+seg['omissionBefore']+'］')
        for j,t in enumerate(seg['ja']): text.append((seg['speakerJa']+'　' if seg['speaker']!='STAGE' and j==0 else '　' if seg['speaker']!='STAGE' else '')+t)
    if s['note']:text.extend(['','編集注：'+s['note']])
    text.extend(['',''])
(HERE/'ai-draft-ja.txt').write_text('\n'.join(text))
esc=html.escape
sections=[]
for s in samples:
    english=''.join((f'<p class="omission">［編集注：{esc(seg["omissionBefore"])}］</p>' if seg.get('omissionBefore') else '')+f'<div class="source-piece"><p class="verse" lang="en">{esc(seg["englishRaw"].strip())}</p><p class="meta">保存原文 {seg["range"][0]}–{seg["range"][1]} 行</p></div>' for seg in s['segments'])
    gap_notes=''.join(f'<p class="omission">編集注：この抜粋は「{esc(s["segments"][g["beforeSegment"]-1]["ja"][0])}」の前で、{esc(g["label"])}しています。</p>' for g in s['omissions'])
    note=f'<p class="meta">{esc(s["note"])}</p>' if s['note'] else ''
    sections.append(f'''<section class="sample" id="{s['id']}"><h2><span class="number">{s['outlineId']:02}</span> {esc(s['title'])}</h2><p class="meta">{esc(s['sourceActScene'])} · 台詞・ト書き {s['lineCount']}行</p><p class="focus">{esc(s['excerptFocus'])}</p><details class="context"><summary>場面全体の状況</summary><p>{esc(s['sceneContext'])}</p></details>
<label for="edit-{s['id']}">日本語の短い抜粋 <span class="row-status">AI下訳</span></label><textarea id="edit-{s['id']}" data-id="{s['id']}" rows="{s['lineCount']}" spellcheck="false">{esc(s['jaDraft'])}</textarea>{gap_notes}{note}
<details class="baseline"><summary>最初のAI下訳を確認</summary><p class="verse">{esc(s['jaDraft'])}</p></details><details class="english-source"><summary>対応する英語原文</summary>{english}</details><a class="inline-link" href="#contents">場面一覧へ</a></section>''')
nav=''.join(f'<a class="inline-link" href="#{s["id"]}">{s["outlineId"]:02}　{esc(s["title"])}</a>' for s in samples)
old=(BASE/'translation-draft/review-template.html').read_text()
css=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
page=(HERE/'page-template.html').read_text().replace('{{CSS}}',css).replace('{{NAV}}',nav).replace('{{SAMPLES}}','\n'.join(sections)).replace('{{DATA}}',json.dumps(data,ensure_ascii=False).replace('<','\\u003c'))
(HERE/'index.html').write_text(page)
validation={'scenes':len(samples),'japaneseLinesPerScene':[s['lineCount'] for s in samples],'totalJapaneseLines':sum(s['lineCount'] for s in samples),'sourceSlicesExact':True,'speakerAttributionVerified':True,'allNonblankInternalGapsDisclosed':True,'reusedMeetingBaselineUnchanged':True,'sourceSha256':hashlib.sha256(source).hexdigest(),'indexSha256':hashlib.sha256((HERE/'index.html').read_bytes()).hexdigest()}
(HERE/'validation.json').write_text(json.dumps(validation,indent=2)+'\n')
print(json.dumps(validation,ensure_ascii=False))
