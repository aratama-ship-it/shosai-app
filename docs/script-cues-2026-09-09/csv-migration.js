'use strict';
(() => {
 const aliases={number:['q番号','cue','cue number','cue no','number','q'],type:['種別','type','department','dept','category'],description:['内容','description','name','action'],trigger:['きっかけ','trigger','when','line'],assignee:['担当','operator','assignee'],note:['備考','notes','note','comments']};
 const normalize=s=>s.trim().toLowerCase().replace(/[._-]/g,' ').replace(/\s+/g,' ');
 const departments={lx:'照明',lighting:'照明',light:'照明',sound:'音響',sfx:'音響',audio:'音響',sd:'音響',video:'映像',projection:'映像',transition:'舞台転換',deck:'舞台転換'};
 function inspect(text){
  const rows=QSheetCSV.parse(text);if(rows.length<2)throw new Error('見出しとQの行が必要です。');const header=rows.shift();
  if(header.length>40||rows.length>200)throw new Error('この試作は40列・200行までです。');
  if(header.some(h=>!h.trim())||new Set(header).size!==header.length)throw new Error('列名の空欄・重複を解消してください。');
  if(rows.some(r=>r.length!==header.length))throw new Error('列の数が見出しと一致しない行があります。');
  const mapping=Object.fromEntries(QSheetCSV.fields.map(([f])=>[f,header.findIndex(h=>aliases[f].includes(normalize(h)))]));return {header,rows,mapping};
 }
 function convert(source,mapping,current,filename,prefix=''){
  if(mapping.number<0||mapping.description<0)throw new Error('Q番号と内容の列を選んでください。');
  const assigned=Object.values(mapping).filter(n=>n>=0);if(new Set(assigned).size!==assigned.length)throw new Error('同じ列を複数の項目に割り当てないでください。');
  const unused=source.header.map((_,i)=>i).filter(i=>!assigned.includes(i));
  const additions=source.rows.map(row=>{
   const get=f=>mapping[f]>=0?row[mapping[f]]:'';const raw=get('type');const type=QSheetCSV.types.includes(raw)?raw:(departments[raw.trim().toLowerCase()]||'その他');
   const extra=unused.map(i=>source.header[i]+': '+row[i]);
   if(raw&&raw!==type)extra.unshift('元の種別: '+raw);
   return {id:'fixture-cue-'+crypto.randomUUID(),key:'cue-'+crypto.randomUUID(),number:prefix+get('number').trim(),type,description:get('description'),trigger:get('trigger'),assignee:get('assignee'),note:[get('note'),'移行元: '+filename,...extra].filter(Boolean).join('\n')};
  });QSheetCSV.validate(current.concat(additions));return {cues:current.concat(additions),additions,unused:unused.map(i=>source.header[i])};
 }
 const dialog=$('csv-map');let source,current,filename,callback,result;
 function refresh(){
  const mapping=Object.fromEntries(QSheetCSV.fields.map(([f])=>[f,Number($('map-'+f).value)]));const body=$('map-body');body.replaceChildren();result=null;
  try{
   result=convert(source,mapping,current,filename,$('map-prefix').value);
   $('map-message').textContent=result.additions.length+'件を新しいQとして追加します。既存Qを保持します。'+(result.unused.length?'備考に残す列：'+result.unused.join('、')+'。':'')+' 台本の位置は取込み後に割り当てます。';
   result.additions.forEach(c=>{const tr=document.createElement('tr');[c.number,c.type,c.description,c.note].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});body.append(tr);});
  }catch(e){$('map-message').textContent=e.message+' 番号が重複する場合は接頭辞で区別できます。';}
  $('map-apply').disabled=!result;
 }
 function close(){dialog.close();$('q-import').focus({preventScroll:true});source=current=callback=result=null;}
 function open(text,cues,name,done,encoding='UTF-8'){
  const data=inspect(text);source=data;current=structuredClone(cues);filename=name;callback=done;
  $('map-origin').textContent=name+' / '+encoding+' / '+data.rows.length+'行';$('map-prefix').value='';const box=$('map-fields');box.replaceChildren();
  QSheetCSV.fields.forEach(([f,label])=>{const wrap=document.createElement('label');wrap.textContent=label+(f==='number'||f==='description'?'（必須）':'');const select=document.createElement('select');select.id='map-'+f;select.append(new Option('割り当てない','-1'));data.header.forEach((h,i)=>select.append(new Option(h,String(i))));select.value=String(data.mapping[f]);select.onchange=refresh;wrap.append(select);box.append(wrap);});
  refresh();dialog.showModal();$('map-number').focus({preventScroll:true});
 }
 $('map-prefix').oninput=refresh;$('map-close').onclick=close;$('map-cancel').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 $('map-apply').onclick=()=>{if(!result)return;const fn=callback,value=result;close();fn(value);};
 globalThis.CSVMigration={inspect,convert,open};
})();
