import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../..");
const data = JSON.parse(await readFile(path.join(dir, "requirements.json"), "utf8"));
const ids = new Set(data.requirements.map(r => r.id));
const REQUIREMENT_COUNT = 38;
if (ids.size !== REQUIREMENT_COUNT || data.requirements.length !== REQUIREMENT_COUNT) throw new Error(`R01〜R${REQUIREMENT_COUNT}の重複/欠落を確認してください`);
for (let i = 1; i <= REQUIREMENT_COUNT; i++) if (!ids.has("R" + String(i).padStart(2, "0"))) throw new Error("ID欠落");
for (const r of data.requirements) {
  for (const field of ["title", "quote", "spec", "current"]) if (!r[field]) throw new Error(r.id + " " + field);
  if (!data.statusLegend[r.status] || !r.accept.length || !data.groups.includes(r.group)) throw new Error(r.id + " 分類/受入条件");
  for (const dep of r.deps) if (!ids.has(dep) || dep === r.id) throw new Error(r.id + " 依存先");
  for (const file of r.files) await access(path.resolve(root, file));
}
const phaseIds = data.phases.flatMap(p => p.ids);
if (phaseIds.length !== REQUIREMENT_COUNT || new Set(phaseIds).size !== REQUIREMENT_COUNT || phaseIds.some(id => !ids.has(id))) throw new Error("実装順に欠落/重複");
const order = new Map(phaseIds.map((id, i) => [id, i]));
for (const r of data.requirements) for (const dep of r.deps) {
  if (order.get(dep) >= order.get(r.id)) throw new Error(r.id + " の前に " + dep + " が必要です");
}
const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const relativeLink = file => encodeURI(path.relative(dir, path.resolve(root, file))).replace(/'/g, "%27");
const sourceFiles = [...new Set(data.requirements.flatMap(r => r.files))];
const hashes = {};
for (const file of sourceFiles) hashes[file] = createHash("sha256").update(await readFile(path.resolve(root, file))).digest("hex");
const baseline = {
  capturedAt: new Date().toISOString(),
  note: "資料生成時点のソース識別用。各要件の検証時刻・公開反映の証明ではない。",
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding:"utf8"}).trim(),
  dirty: Boolean(execFileSync("git", ["status", "--porcelain"], {cwd: root, encoding:"utf8"}).trim()),
  hashes,
};
await writeFile(path.join(dir, "baseline.json"), JSON.stringify(baseline, null, 2) + "\n");
const counts = Object.fromEntries(Object.keys(data.statusLegend).map(k => [k, data.requirements.filter(r => r.status === k).length]));
const progress = data.progressUpdate;
const listHtml = values => `<ul>${values.map(value => `<li>${esc(value)}</li>`).join("")}</ul>`;
const progressHtml = progress ? `<section id="progress"><h2>${esc(progress.asOf)} 時点の進捗と引き継ぎ</h2>
<p>${esc(progress.summary)}</p>
<div class="check-grid">
<article><h3>ローカル実装・確認済み</h3>${listHtml(progress.implemented)}</article>
<article><h3>残っている実装</h3>${listHtml(progress.remaining)}</article>
</div>
<p class="notice"><strong>最終確認待ち:</strong> ${esc(progress.review.join("／"))}</p>
<h3>次セッション用プロンプト</h3><pre class="handoff-prompt">${esc(progress.nextPrompt)}</pre>
</section>` : "";
const phaseHtml = data.phases.map(p => `<li><strong>${esc(p.id)} · ${esc(p.title)}</strong><p>${esc(p.done)}</p><p class="refs">${p.ids.map(id => `<a href="#${id}">${id}</a>`).join(" · ")}</p></li>`).join("\n");
const reqHtml = data.requirements.map(r => `<details class="requirement" id="${r.id}" data-status="${r.status}" data-group="${esc(r.group)}">
<summary><span class="rid">${r.id}</span><strong>${esc(r.title)}</strong><span class="status">${esc(data.statusLegend[r.status])}</span></summary>
<div class="detail-body"><p class="group">対象: ${esc(r.group)}</p><blockquote>発言の抜粋: 「${esc(r.quote)}」</blockquote>
<h3>実装する内容</h3><p>${esc(r.spec)}</p>
<h3>現行コードの確認</h3><p>${esc(r.current)}</p>
<h3>完了条件</h3><ul>${r.accept.map(a => `<li>${esc(a)}</li>`).join("")}</ul>
${r.notes ? `<p class="note"><strong>補足・実装案:</strong> ${esc(r.notes)}</p>` : ""}
${r.deps.length ? `<p>先に必要: ${r.deps.map(id => `<a href="#${id}">${id}</a>`).join(" / ")}</p>` : ""}
<p class="file-links">関連ファイル: ${r.files.map(file => `<a href="${relativeLink(file)}">${esc(file)}</a>`).join(" / ")}</p>
</div></details>`).join("\n");
const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.title)} | 2026-09-10</title>
<style>
:root{--bg:#efe7d6;--paper:#faf6ee;--ink:#2b2620;--muted:#6a604e;--accent:#8f3e1e;--line:#6a604e;--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--hit:44px;--body:16px;--small:14px;--h1:32px;--h2:24px;--leading:1.7;--heading-leading:1.4;--width:1120px}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:var(--body)/var(--leading) "Hiragino Sans","Yu Gothic",sans-serif}
main{width:min(var(--width),calc(100% - var(--s6)));margin:var(--s6) auto var(--s7)}h1{font-size:var(--h1);line-height:var(--heading-leading);margin:var(--s2) 0 var(--s4)}
h2{font-size:var(--h2);line-height:var(--heading-leading);margin:0 0 var(--s4)}h3{font-size:var(--body);margin:var(--s5) 0 var(--s2)}p{max-width:50em;margin:var(--s2) 0 var(--s4)}
a{color:var(--accent);text-underline-offset:var(--s1);overflow-wrap:anywhere}button,input,select{font:inherit;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:0;min-height:var(--hit);padding:var(--s2) var(--s3);max-width:100%}
button{cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.kicker,.group,.file-links,.small{font-size:var(--small);color:var(--muted)}.intro{border-bottom:1px solid var(--line);padding-bottom:var(--s5)}
.metrics{display:flex;gap:var(--s5);flex-wrap:wrap;margin:var(--s5) 0}.metrics p{margin:0}.metrics b{font-size:var(--h2)}
.links,.filters,.refs{display:flex;flex-wrap:wrap;gap:var(--s2) var(--s4);align-items:center}.links a{display:inline-flex;align-items:center;min-height:var(--hit)}section{margin-top:var(--s7)}
.notice,.note{padding:var(--s4);background:var(--paper);border-left:var(--s1) solid var(--accent)}
.phases{padding-left:var(--s5)}.phases>li{padding:var(--s3) 0;border-bottom:1px solid var(--line)}.phases p{margin:var(--s2) 0}
.refs a{display:inline-block;min-height:var(--hit);padding:var(--s2) 0}.filters{align-items:end;margin-bottom:var(--s4)}.filters label{display:grid;gap:var(--s1)}.filters .search{flex:1;min-width:0}.filters input{width:100%}
.requirement{border-top:1px solid var(--line);scroll-margin-top:var(--s5)}.requirement:last-child{border-bottom:1px solid var(--line)}summary{display:flex;align-items:center;gap:var(--s3);padding:var(--s4) 0;cursor:pointer;min-height:var(--hit)}
summary::before{content:"＋";color:var(--accent)}details[open]>summary::before{content:"−"}summary strong{flex:1;min-width:0}.rid{font-variant-numeric:tabular-nums;color:var(--muted)}.status{font-size:var(--small);color:var(--muted)}
.detail-body{padding:0 var(--s5) var(--s5)}blockquote{margin:var(--s4) 0;padding-left:var(--s4);border-left:1px solid var(--line);color:var(--muted)}li{margin:var(--s2) 0}ul{padding-left:var(--s5)}
.check-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5)}.check-grid article{border-top:1px solid var(--line);padding-top:var(--s3)}[hidden]{display:none!important}
.handoff-prompt{max-width:72em;overflow:auto;margin:var(--s2) 0;padding:var(--s4);white-space:pre-wrap;background:var(--paper);border:1px solid var(--line);font:var(--small)/var(--leading) ui-monospace,SFMono-Regular,Menlo,monospace}
footer{border-top:1px solid var(--line);margin-top:var(--s7);padding-top:var(--s4)}
@media(max-width:700px){h1{font-size:var(--h2)}.check-grid{grid-template-columns:1fr}.filters label{width:100%}summary{flex-wrap:wrap;gap:var(--s2)}summary strong{flex-basis:70%}.status{padding-left:var(--s5)}.detail-body{padding-left:0;padding-right:0}.metrics{gap:var(--s4)}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
@media print{.filters,button{display:none!important}main{width:100%;margin:0}body{background:var(--paper)}details{break-inside:avoid}a{color:var(--ink)}}
</style></head><body><main>
<header class="intro"><p class="kicker">舞台スケッチ / UI改善 / ${esc(data.date)}</p>
<h1>ここまでの要望を、実装へ渡す</h1>
<p>会話の変更要望を${REQUIREMENT_COUNT}項目に整理しました。項目を開くと、実装内容・現状・完了条件・関連ファイルを確認できます。実装順と、設計を具体化する箇所も記録しています。</p>
<div class="metrics"><p><b>${REQUIREMENT_COUNT}</b> 要望</p><p><b>${counts.review}</b> 本人確認待ち</p><p><b>${counts.local}</b> 確認済み</p><p><b>${counts.pending + counts.partial + counts.design}</b> 未着手・改修中</p></div>
<p class="small">v0.3.5を土台に1件ずつローカル確認し、全件の確認後にv0.3.6へまとめます。公開はこの確認工程に含みません。</p>
<nav class="links" aria-label="資料内の移動">${progress ? '<a href="#progress">進捗と引き継ぎ</a>' : ""}<a href="#requirements">${REQUIREMENT_COUNT}項目を確認</a><a href="#sequence">実装順</a><a href="#open-decisions">設計の未確定点</a><a href="HANDOFF.md">実装引き継ぎ</a><a href="TOKENS.md">数値基準</a><a href="requirements.json" download>要件JSON</a></nav>
</header>
${progressHtml}
<section id="open-decisions"><h2>先に押さえる設計のつながり</h2>
<div class="check-grid">
<article><h3>複数選択 → 選択対象のみ整列</h3><p>選択集合を土台にして、整列時に全員が動く状態を解消します。選択外の位置が変わらないことを完了条件にします。</p></article>
<article><h3>フォルダー → シーン操作群</h3><p>旧4アイコンを外した後も、作成・改名・投入・取り出しができる入口を用意します。既存の「＋シーン」メニュー案は採用未確認です。</p><a href="../ui-scene-panel-information-architecture-2026-09-10.html">既存のシーン操作案を見る</a></article>
<article><h3>追加の3分類 → カスタム・JSON</h3><p>演者／舞台セット／小道具を最初に選び、名前と種類をモーダルで決めます。既存のセットビルダーとJSON入出力を再利用します。</p></article>
<article><h3>前の動線 ↔ 次の立ち位置</h3><p>現在の自動追従処理も含めて整理し、対象ごとの優先選択と一括指定を実装します。適用前の確認とUndoを同じ変更単位にします。</p></article>
</div>
<p class="notice">具体化する2テーマは、フォルダーの操作とシーン作成メニューです。画像保存方式・選択操作の細部・訳語などの実装判断は、各項目と引き継ぎに「案」として残しています。Vision Pro用JSONは別途検討です。</p>
</section>
<section id="sequence"><h2>依存関係を考慮した実装順</h2><ol class="phases">${phaseHtml}</ol></section>
<section id="requirements"><h2>実装チェックリスト</h2><p class="small">${esc(data.statusNote)}</p>
<div class="filters"><label class="search">要望を検索<input id="query" type="search" placeholder="例: 動線、カスタム、R10" autocomplete="off"></label>
<label>対象<select id="group"><option value="">すべて</option>${data.groups.map(g=>`<option>${esc(g)}</option>`).join("")}</select></label>
<label>状態<select id="status"><option value="">すべて</option>${Object.entries(data.statusLegend).map(([k,v])=>`<option value="${k}">${esc(v)}（${counts[k]}）</option>`).join("")}</select></label>
<button type="button" id="expand" aria-pressed="false">表示中の詳細を開く</button></div>
<p id="result" role="status">${REQUIREMENT_COUNT} / ${REQUIREMENT_COUNT}項目を表示</p>
<div id="items">${reqHtml}</div>
</section>
<section id="verification"><h2>確認済みと、実装時に確認すること</h2>
<p>今回、生成ファイルの同期確認と、About・準備中項目・更新履歴に関する既存6テストが通りました。右上の高さ共通化、ベルの既読処理などを現行コードで照合しています。</p>
<p>アプリの表示・実機iPad・1Password有効環境・公開反映は、この資料作成では確認していません。ローカルURLを開く既存経路は環境ポリシーにより使えないため、資料の描画確認も未実施です。</p>
<p>実装時は1列左/右・2列・iPad表示、日英中4言語、名前の長い例、Undo・JSON往復・選択外不変を確認してください。詳細なケースは実装引き継ぎに記載しています。</p>
</section>
<footer><p class="small">正本: requirements.json。生成: build.mjs。参照ソースの識別: <a href="baseline.json">生成時点のハッシュ</a>。資料の編集は製品反映や公開ではありません。</p></footer>
</main>
<script>
const rows=[...document.querySelectorAll(".requirement")], query=document.querySelector("#query"), group=document.querySelector("#group"), status=document.querySelector("#status"), expand=document.querySelector("#expand");
function sync(){
 const q=query.value.trim().toLocaleLowerCase();
 let n=0;
 rows.forEach(row=>{row.hidden=Boolean((group.value&&row.dataset.group!==group.value)||(status.value&&row.dataset.status!==status.value)||(q&&!row.textContent.toLocaleLowerCase().includes(q)));if(!row.hidden)n++;});
 document.querySelector("#result").textContent=n+" / ${REQUIREMENT_COUNT}項目を表示";
 const visible=rows.filter(row=>!row.hidden), all=visible.length>0&&visible.every(row=>row.open);
 expand.disabled=!visible.length;expand.setAttribute("aria-pressed",String(all));expand.textContent=all?"表示中の詳細を閉じる":"表示中の詳細を開く";
}
[query,group,status].forEach(el=>el.addEventListener("input",sync));
expand.addEventListener("click",()=>{const open=expand.getAttribute("aria-pressed")!=="true";rows.filter(row=>!row.hidden).forEach(row=>row.open=open);sync();});
rows.forEach(row=>row.addEventListener("toggle",sync));
document.querySelectorAll('a[href^="#R"]').forEach(link=>link.addEventListener("click",()=>{query.value="";group.value="";status.value="";sync();document.querySelector(link.getAttribute("href")).open=true;}));
let printed=null;
window.addEventListener("beforeprint",()=>{printed=rows.map(row=>row.open);rows.filter(row=>!row.hidden).forEach(row=>row.open=true);});
window.addEventListener("afterprint",()=>{if(printed)rows.forEach((row,i)=>row.open=printed[i]);printed=null;sync();});
sync();
</script></body></html>
`;
await writeFile(path.join(dir, "index.html"), html);
console.log(JSON.stringify({requirements:REQUIREMENT_COUNT, counts, filesChecked:sourceFiles.length, generated:"index.html", baseline:"baseline.json"}, null, 2));
