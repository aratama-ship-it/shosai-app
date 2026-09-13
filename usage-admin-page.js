export function usageAdminResponse(english = false) {
  const t = english ? {
    lang: "en", title: "Stage Sketch · Usage", back: "Back to Stage Sketch", heading: "Who is using Stage Sketch?",
    intro: "Beta accounts · Private to the owner", period: "Period", periods: ["7 days", "30 days", "90 days"],
    self: "Include my own activity", refresh: "Refresh", loading: "Loading usage…", table: "Usage by account",
    user: "Account", days: "Days used", active: "Active time (estimate)", last: "Last use (JST, within 90 days)",
    empty: "No recorded usage in this view. This does not prove that nobody used the app.",
    fail: "Usage could not be loaded. Check your connection and owner sign-in, then refresh.",
    signIn: "Sign in again", disabled: "Recording is currently disabled. Previously recorded activity is shown.",
    note: "Days used count calendar days in Japan when the app reports an opening or foreground activity. Active time counts only a focused, visible app and up to 60 seconds after an action. Hidden tabs, long suspension and failed transmissions are excluded. Overlapping reports from the same account are not added twice. These are estimates, not attendance records.",
    boundary: "Only records received after measurement began are available. Accounts without records are not listed. An account is not necessarily one person; shared logins are combined. Daily records expire after 90 days. Show contents and typed text are not collected.",
    sampled: "Last updated", started: "Recording began", pending: "Awaiting first record", own: "(you)",
    people: "accounts used", totalDays: "account-days", totalTime: "total active time", zero: "0 min", short: "under 1 min", min: "min", hour: "h",
  } : {
    lang: "ja", title: "舞台スケッチ · 利用状況", back: "舞台スケッチへ戻る", heading: "誰が、どれくらい使っているか",
    intro: "β版のアカウント別集計 · 管理者だけに表示", period: "集計期間", periods: ["7日間", "30日間", "90日間"],
    self: "自分の利用を含める", refresh: "更新する", loading: "利用状況を読み込んでいます…", table: "アカウントごとの利用状況",
    user: "アカウント", days: "利用日数", active: "操作時間（概算）", last: "最終利用（JST・90日以内）",
    empty: "表示対象の利用記録はまだありません。利用されていないことを示すものではありません。",
    fail: "利用状況を取得できませんでした。通信と管理者のログインを確認してから更新してください。",
    signIn: "ログインし直す", disabled: "現在は計測を停止しています。記録済みの利用状況を表示しています。",
    note: "利用日数は、画面の起動または手前での操作が届いた日数です（日本時間）。操作時間は、画面が手前にあり、最後の操作から60秒以内の時間を概算します。別タブ・長い休止・送信失敗分は含みません。同じアカウントの重なる時間は二重加算しません。出欠や勤務時間を示す数値ではありません。",
    boundary: "計測開始後に届いた記録だけを表示します。記録がないアカウントは一覧に出ません。共用アカウントの利用はひとまとめになり、実人数とは一致しません。日別記録は90日後に失効します。作品や入力した文章は収集しません。",
    sampled: "取得日時", started: "計測開始", pending: "最初の記録を待っています", own: "（自分）",
    people: "利用アカウント", totalDays: "延べ利用日数", totalTime: "合計操作時間", zero: "0分", short: "1分未満", min: "分", hour: "時間",
  };
  const nonce = crypto.randomUUID();
  const html = `<!doctype html><html lang="${t.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.title}</title><style nonce="${nonce}">
:root { --paper:#f5f1e8; --ink:#302a24; --muted:#67594c; --accent:#88432e; --light:#fffaf0; --line:#897a6a;
 --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s6:24px; --s8:32px; --small:14px; --body:16px; --h1:30px; --h2:20px;
 --width:1040px; --control:44px; --radius:4px; --border:1px; --focus:3px; }
* { box-sizing:border-box; } [hidden] { display:none!important; }
body { margin:0; color:var(--ink); background:var(--paper); font:var(--body)/1.65 system-ui,-apple-system,sans-serif; }
main { max-width:var(--width); margin:auto; padding:var(--s8) var(--s6); }
a { color:var(--ink); text-decoration:underline; } nav { display:flex; justify-content:space-between; gap:var(--s4); flex-wrap:wrap; }
nav a { display:inline-flex; align-items:center; min-height:var(--control); }
header { padding:var(--s6) 0; border-bottom:var(--border) solid var(--line); }
h1 { font-size:var(--h1); line-height:1.3; margin:var(--s2) 0 var(--s4); } h2 { font-size:var(--h2); line-height:1.3; }
p { max-width:70ch; } .phrase { display:inline-block; } .muted, small { color:var(--muted); } small { font-size:var(--small); }
.controls { display:flex; align-items:center; flex-wrap:wrap; gap:var(--s4); padding:var(--s6) 0; }
.controls label { display:flex; align-items:center; gap:var(--s2); min-height:var(--control); }
select,button { font:inherit; min-height:var(--control); padding:var(--s2) var(--s3); border:var(--border) solid var(--line); border-radius:var(--radius); color:var(--ink); background:var(--paper); }
button { cursor:pointer; color:var(--light); background:var(--accent); border-color:var(--accent); } button:disabled { cursor:wait; }
input { accent-color:var(--accent); } :focus-visible { outline:var(--focus) solid var(--accent); outline-offset:var(--focus); }
.totals { display:flex; flex-wrap:wrap; gap:var(--s4) var(--s8); margin:0 0 var(--s6); }
.totals div { display:flex; align-items:baseline; gap:var(--s2); } .totals strong { font-size:var(--h2); }
.table-wrap { overflow:auto; } table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
caption { text-align:left; font-weight:600; margin-bottom:var(--s3); } th,td { text-align:left; padding:var(--s4) var(--s3); border-bottom:var(--border) solid var(--line); overflow-wrap:anywhere; }
th { font-size:var(--small); } th:first-child,td:first-child { padding-left:0; } .number { text-align:right; white-space:nowrap; }
footer { margin-top:var(--s8); padding-top:var(--s4); border-top:var(--border) solid var(--line); font-size:var(--small); }
#status { min-height:var(--s6); } #range { margin-top:0; }
@media (max-width:600px) { main { padding:var(--s4); } h1 { font-size:var(--h1); }
 thead { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
 table,tbody,tr,td,caption { display:block; } caption { width:100%; } tr { padding:var(--s3) 0; border-bottom:var(--border) solid var(--line); }
 td,td:first-child { padding:var(--s1) 0; border:0; } td:first-child { font-weight:600; }
 td[data-label] { display:flex; justify-content:space-between; gap:var(--s3); text-align:right; }
 td[data-label]:before { content:attr(data-label); text-align:left; color:var(--muted); font-size:var(--small); } }
</style></head><body><main>
<nav><a href="/stage.html${english ? "?lang=en" : ""}">${t.back}</a><a href="/usage${english ? "" : "?lang=en"}" lang="${english ? "ja" : "en"}">${english ? "日本語" : "English"}</a></nav>
<header><small>${t.intro}</small><h1>${(english ? ["Who is using", "Stage Sketch?"] : ["誰が、", "どれくらい", "使っているか"]).map(phrase => `<span class="phrase">${phrase}</span>`).join(english ? " " : "")}</h1><p class="muted" id="range"></p><small id="start"></small></header>
<div class="controls"><label for="period">${t.period}<select id="period"><option value="7">${t.periods[0]}</option><option value="30" selected>${t.periods[1]}</option><option value="90">${t.periods[2]}</option></select></label>
<label><input id="self" type="checkbox">${t.self}</label><button id="refresh" type="button">${t.refresh}</button></div>
<p role="status" id="status">${t.loading}</p><a id="sign-in" href="/sign-in?next=${encodeURIComponent(english ? "/usage?lang=en" : "/usage")}" hidden>${t.signIn}</a>
<section id="result" hidden><div class="totals" id="totals"></div><p id="empty" hidden>${t.empty}</p>
<div class="table-wrap"><table id="table"><caption>${t.table}</caption><thead><tr><th scope="col">${t.user}</th><th scope="col" class="number">${t.days}</th><th scope="col" class="number">${t.active}</th><th scope="col">${t.last}</th></tr></thead><tbody id="rows"></tbody></table></div></section>
<footer><h2>${english ? "How to read these numbers" : "数字の読み方"}</h2><p>${t.note}</p><p>${t.boundary}</p><small id="updated"></small></footer>
</main><script nonce="${nonce}">
const t = ${JSON.stringify(t)};
const el = (id) => document.getElementById(id);
let report = null, revision = 0;
const date = (ms) => new Intl.DateTimeFormat(t.lang === 'en' ? 'en-GB' : 'ja-JP', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
function duration(ms) {
 if (!ms) return t.zero;
 const minutes = Math.floor(ms/60000);
 if (!minutes) return t.short;
 return minutes < 60 ? minutes+' '+t.min : Math.floor(minutes/60)+' '+t.hour+' '+(minutes%60)+' '+t.min;
}
function draw() {
 if (!report) return;
 const rows = report.rows.filter(row => el('self').checked || row.user !== report.owner);
 el('rows').replaceChildren(); el('totals').replaceChildren();
 for (const [value,label] of [[rows.filter(row=>row.activeDays>0).length,t.people],[rows.reduce((n,row)=>n+row.activeDays,0),t.totalDays],[duration(rows.reduce((n,row)=>n+row.activeMs,0)),t.totalTime]]) {
  const item=document.createElement('div'),number=document.createElement('strong'),name=document.createElement('span');
  number.textContent=value; name.textContent=label; item.append(number,name); el('totals').append(item);
 }
 for (const row of rows) {
  const tr=document.createElement('tr');
  [row.user+(row.user===report.owner?' '+t.own:''),row.activeDays,duration(row.activeMs),date(row.lastSeen)].forEach((value,index)=>{
   const td=document.createElement('td'); td.textContent=value;
   if(index) td.dataset.label=[t.user,t.days,t.active,t.last][index];
   if(index===1 || index===2) td.className='number'; tr.append(td);
  }); el('rows').append(tr);
 }
 el('empty').hidden=rows.length>0; el('table').hidden=rows.length===0; el('result').hidden=false;
 el('range').textContent=report.from+' – '+report.to+' · JST';
 el('start').textContent=report.startedAt?t.started+': '+date(report.startedAt)+' JST':t.pending;
 el('updated').textContent=t.sampled+': '+date(report.asOf)+' JST';
 el('status').textContent=report.enabled?'':t.disabled;
}
async function load() {
 const current=++revision; report=null; el('result').hidden=true; el('refresh').disabled=true;
 el('status').textContent=t.loading; el('sign-in').hidden=true; el('updated').textContent=''; el('range').textContent=''; el('start').textContent='';
 try {
  const response=await fetch('/usage/report?days='+el('period').value,{credentials:'same-origin',cache:'no-store',redirect:'error'});
  if(!response.ok) throw new Error('unavailable');
  const value=await response.json();
  if(!Array.isArray(value.rows)) throw new Error('invalid');
  if(current!==revision) return; report=value; draw();
 } catch(_) { if(current===revision) {el('status').textContent=t.fail;el('sign-in').hidden=false;} }
 finally { if(current===revision) el('refresh').disabled=false; }
}
el('period').addEventListener('change',load); el('self').addEventListener('change',draw); el('refresh').addEventListener('click',load); load();
</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization", "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` } });
}
