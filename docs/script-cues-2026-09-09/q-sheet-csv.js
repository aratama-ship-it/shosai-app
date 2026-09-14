'use strict';
(() => {
 const format='stage-q-sheet-csv-v1';
 const types=['照明','音響','映像','舞台転換','その他'];
 const fields=[['number','Q番号'],['type','種別'],['description','内容'],['trigger','きっかけ'],['assignee','担当'],['note','備考']];
 const headers=['形式','順番','キューID',...fields.map(x=>x[1]),'台本版','頁','台詞','割当状態'];
 const risky=s=>/^[\s]*[=+\-@]|^[\t\r\n']/.test(s);
 const protect=s=>risky(String(s))?"'"+s:String(s);
 const restore=s=>s.startsWith("'")&&risky(s.slice(1))?s.slice(1):s;
 const quote=s=>'"'+protect(s).replaceAll('"','""')+'"';
 function parse(text){
  text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',inside=false,closed=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(inside){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{inside=false;closed=true;}}else cell+=c;continue;}
   if(c===','){row.push(cell);cell='';closed=false;continue;}
   if(c==='\r'||c==='\n'){row.push(cell);rows.push(row);row=[];cell='';closed=false;if(c==='\r'&&text[i+1]==='\n')i++;continue;}
   if(closed)throw new Error('引用符の後にはカンマまたは改行が必要です。');
   if(c==='"'){if(cell)throw new Error('セル途中の引用符が不正です。');inside=true;}else cell+=c;
  }
  if(inside)throw new Error('閉じていない引用符があります。');
  if(cell||row.length||closed){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(c=>c!==''));
 }
 function validate(cues){
  if(cues.length>200)throw new Error('この試作は200行までです。');
  const ids=new Set(),numbers=new Set();
  cues.forEach((c,i)=>{
   if(!c.id||ids.has(c.id))throw new Error((i+1)+'行目：キューIDが空か重複しています。');ids.add(c.id);
   if(!c.number.trim())throw new Error((i+1)+'行目：Q番号を入力してください。');
   if(c.number.length>40)throw new Error((i+1)+'行目：Q番号は40文字までです。');
   if(numbers.has(c.number.trim()))throw new Error((i+1)+'行目：Q番号が重複しています。');numbers.add(c.number.trim());
   if(!types.includes(c.type))throw new Error((i+1)+'行目：種別を確認してください。');
   fields.forEach(([f])=>{if(typeof c[f]!=='string'||c[f].length>1000)throw new Error((i+1)+'行目：入力は各1000文字までです。');});
  });return cues;
 }
 function read(text,current){
  if(new TextEncoder().encode(text).length>1048576)throw new Error('CSVは1MiBまでです。');
  const rows=parse(text);if(rows.length<2)throw new Error('見出し行とQの行が必要です。');
  const head=rows.shift().map(s=>s.trim());
  if(new Set(head).size!==head.length)throw new Error('同じ列名が複数あります。');
  if(!head.includes('Q番号')||!head.includes('内容'))throw new Error('「Q番号」と「内容」の列が必要です。');
  const unknown=head.filter(h=>!headers.includes(h));if(unknown.length)throw new Error('未対応の列：'+unknown.join('、'));
  if(rows.length>200)throw new Error('この試作は200行までです。');
  let created=0,updated=0;const seen=new Set(),orders=new Set();
  const imported=rows.map((r,index)=>{
   if(r.length!==head.length)throw new Error((index+2)+'行目：列の数が見出しと一致しません。');
   const get=name=>{const n=head.indexOf(name);return n<0?'':r[n];};
   const marker=get('形式');if(marker&&marker!==format)throw new Error('未対応のCSV形式です。');
   const value=name=>marker===format?restore(get(name)):get(name);
   let id=value('キューID').trim();if(id&&seen.has(id))throw new Error((index+2)+'行目：キューIDが重複しています。');
   if(id&&!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new Error((index+2)+'行目：キューIDの形式を確認してください。');
   if(!id)id='fixture-cue-'+crypto.randomUUID();seen.add(id);
   const old=current.find(c=>c.id===id);old?updated++:created++;
   const c={id,key:old?.key||'cue-'+crypto.randomUUID()};
   fields.forEach(([f,label])=>{c[f]=head.includes(label)?value(label):(old?.[f]||'');});c.number=c.number.trim();if(!c.type)c.type='その他';
   let order=index+1;if(head.includes('順番')){const raw=value('順番');if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<1)throw new Error((index+2)+'行目：順番は正の整数にしてください。');order=Number(raw);if(orders.has(order))throw new Error('順番が重複しています。');orders.add(order);}
   return {c,order};
  });
  imported.sort((a,b)=>a.order-b.order);
  const merged=imported.map(x=>x.c).concat(current.filter(c=>!seen.has(c.id)));
  validate(merged);return {cues:merged,created,updated};
 }
 function write(cues,position){
  validate(cues);const rows=[headers];
  cues.forEach((c,index)=>{const p=position(c);rows.push([format,String(index+1),c.id,...fields.map(([f])=>c[f]),p.version,p.page,p.quote,p.status]);});
  const text='\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n';
  if(new TextEncoder().encode(text).length>1048576)throw new Error('CSVは1MiBまでです。行数や文字数を減らしてください。');return text;
 }
 globalThis.QSheetCSV=Object.freeze({types,fields,headers,format,parse,read,write,validate});
})();
