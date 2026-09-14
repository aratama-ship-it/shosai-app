(function () {
  "use strict";
  const M = window.STAGE_LIGHT_PANEL_MIGRATION, R = window.__RIG;
  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent=text; if(cls)n.className=cls; return n; };
  const style = node("style"); style.textContent = `
    #migration-dialog{color:#efe7d6;background:#201b16;border:1px solid #9c823f;border-radius:4px;padding:24px;width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;font:14px/1.7 -apple-system,BlinkMacSystemFont,sans-serif}
    #migration-dialog::backdrop{background:rgba(0,0,0,.75)}
    #migration-dialog h2{font-size:22px;line-height:1.4;margin:0 44px 16px 0} #migration-dialog h3{font-size:16px;margin:20px 0 8px}
    #migration-dialog p{margin:8px 0} #migration-dialog button{min-height:44px;padding:8px 16px;color:#efe7d6;border:1px solid #9c823f;background:#302a21;border-radius:3px;font:inherit;cursor:pointer}
    #migration-dialog button.primary{background:#efe7d6;color:#201b16;border-color:#efe7d6} #migration-dialog button:focus-visible{outline:3px solid #efe7d6;outline-offset:3px}
    #migration-dialog .migration-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:20px} #migration-dialog .migration-close{position:absolute;right:12px;top:12px;width:44px;padding:0;font-size:24px}
    #migration-dialog li{margin:8px 0} #migration-dialog ul{padding-left:22px} #migration-dialog table{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0} #migration-dialog th,#migration-dialog td{text-align:left;border-bottom:1px solid #6d6657;padding:8px;overflow-wrap:anywhere}
    #migration-dialog input{color:#efe7d6;background:#302a21;border:1px solid #9c823f;padding:8px;font:inherit;width:110px} #migration-dialog label{display:inline-grid;gap:6px;margin:12px 16px 4px 0}
    #migration-error{color:#ffd18c;white-space:pre-wrap} .migration-entry{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.migration-entry h1{font-size:13px}.migration-entry button{font-size:12px;padding:7px 9px;white-space:nowrap}
    .head{grid-template-columns:minmax(230px,1fr) auto auto}.head-right button{white-space:nowrap;flex-shrink:0}.head-right .hist{display:flex}.head-right .dirty{min-width:0;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.migration-entry{max-width:350px}
    @media(max-width:760px){#migration-dialog{padding:20px}.migration-entry h1{display:none}}
  `; document.head.append(style);
  const dialog = node("dialog"); dialog.id="migration-dialog"; dialog.setAttribute("aria-label","照明データの移行"); document.body.append(dialog);
  dialog.addEventListener("click", e=>{ if(e.target===dialog){const b=dialog.getBoundingClientRect(); if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();} });
  // Keep the prototype's Space/Delete/Undo shortcuts out of the file review dialog.
  window.addEventListener("keydown", e=>{if(dialog.open && e.key!=="Escape") e.stopImmediatePropagation();}, true);
  const close = () => dialog.close();
  function button(text, fn, cls) { const b=node("button",text,cls);b.type="button";b.onclick=fn;return b; }
  function reset(title) {
    dialog.replaceChildren(); const x=button("×",close,"migration-close");x.setAttribute("aria-label","閉じる");dialog.append(x,node("h2",title));
    if(!dialog.open)dialog.showModal();
  }
  function error(message) { let p=document.getElementById("migration-error");if(!p){p=node("p");p.id="migration-error";p.setAttribute("role","alert");dialog.append(p);}p.textContent=message; }
  const picker=node("input");picker.type="file";picker.accept=".json,application/json";picker.hidden=true;picker.id="migration-file";document.body.append(picker);
  picker.onchange=async()=>{ const file=picker.files[0]; if(!file)return;
    try{if(file.size>50*1024*1024)throw new Error("50MBを超えるファイルです。原本は変更せず中止しました"); const source=await file.text();review(JSON.parse(source),source);}
    catch(e){if(!dialog.open)intro();error(e.message);}finally{picker.value="";}
  };
  function intro() {
    reset("旧照明パネルから引き継ぐ");
    dialog.append(node("p","舞台スケッチから書き出したショーのJSONを選ぶと、照明デザインモードで編集できるコピーを作れます。処理はこのブラウザ内で行います。"),node("p","元ファイルは変更しません。移行ファイルには、復元用の元ショー全体も含まれます。"));
    const actions=node("div",undefined,"migration-actions");actions.append(button("ショーのJSONを選ぶ",()=>picker.click(),"primary"),button("移行の見本を試す",async()=>{try{const response=await fetch("../sample-show.json",{cache:"no-store"});if(!response.ok)throw new Error("見本を読み込めません");const source=await response.text();review(JSON.parse(source),source);}catch(e){error(e.message);}}),button("閉じる",close));dialog.append(actions);
    dialog.append(node("p","これはローカルの移行確認版です。既存の照明パネルと見え方を比較してから、製品への統合を進めます。"));
  }
  function review(doc, source, explicitStage) {
    let design;
    try { design = M.migrate(doc, { sourceText:source, venues:window.LIGHT_MIGRATION_VENUES, ...(explicitStage?{stage:explicitStage}:{}) }); }
    catch(e) {
      reset("移行を進める前に確認");error(e.message);
      if(e.message.includes("寸法を確定")) {
        const form=node("form");const values={};
        for(const [key,label,min,max] of [["W","幅（m）",3,60],["D","奥行き（m）",3,60],["H","高さ（m）",2,40]]){const l=node("label",label),input=node("input");input.type="number";input.required=true;input.min=min;input.max=max;input.step="any";input.name=key;values[key]=input;l.append(input);form.append(l);}
        const submit=button("この寸法で移行内容を確認",()=>{},"primary");submit.type="submit";form.append(submit);form.onsubmit=e=>{e.preventDefault();review(doc,source,Object.fromEntries(Object.entries(values).map(([k,n])=>[k,Number(n.value)])));};dialog.append(form);
      }
      dialog.append(button("別のファイルを選ぶ",()=>picker.click()));return;
    }
    present(design, true);
  }
  function present(design, pending) {
    const report=design.migration?.report;
    if(!report){error("元ショーの移行記録がありません");return;}
    const before=R.snapshot();
    reset(pending?"引き継ぐ内容を確認":"移行内容と元のショー");
    dialog.append(node("p",design.name),node("p",`${report.scenes}場面・${report.registeredLights}件の照明登録 → ${report.fixtures}配置。点灯 ${report.on}件、消灯中の控え ${report.stashed}件、プリセット ${report.presets}件。`));
    dialog.append(node("p",`舞台寸法：幅 ${design.stage.W}m × 奥行き ${design.stage.D}m × 高さ ${design.stage.H}m`));
    dialog.append(node("h3","確認が必要な点"));const ul=node("ul");
    // Group repeated warnings without hiding the affected scenes in the detailed list.
    const grouped=new Map();for(const w of report.warnings){const k=w.message;let v=grouped.get(k);if(!v){v={message:k,scenes:new Set()};grouped.set(k,v);}if(w.sceneName)v.scenes.add(w.sceneName);}
    for(const v of grouped.values())ul.append(node("li",v.message+(v.scenes.size?`（${[...v.scenes].join("、")}）`:"")));dialog.append(ul);
    const details=node("details");details.append(node("summary","場面ごとの照明の対応を見る"));const table=node("table"),tr=node("tr");for(const h of ["場面","引き継ぐ灯","元の状態"])tr.append(node("th",h));table.append(tr);
    for(const m of design.migration.mappings){const row=node("tr"),f=design.rig.fixtures.find(f=>f.id===m.fixtureId);for(const t of [m.sceneName, f?`${f.no} ${f.name}`:m.fixtureId,{piece:"点灯",stash:"消灯・控えあり",preset:"消灯・プリセット"}[m.origin]||m.origin])row.append(node("td",t));table.append(row);}details.append(table);dialog.append(details);
    dialog.append(node("p","復元用の元ショー全体を移行ファイルに含めます。新モードで編集した内容は、移行前のショーには反映されません。"));
    const acts=node("div",undefined,"migration-actions");
    if(pending){acts.append(button("コピーを照明モードで開く",()=>{try{if(R.snapshot()!==before)throw new Error("確認中にデザインが変わりました。もう一度読み込んでください");R.applyDesign(design);close();update();}catch(e){error(e.message);}},"primary"),button("やめる",close));}
    acts.append(button("移行前のショーを書き出す",()=>{try{R.download(new Blob([M.originalText(design)],{type:"application/json"}),"移行前のショー.json");}catch(e){error(e.message);}}));
    if(!pending)acts.append(button("別のショーから移行",intro),button("閉じる",close,"primary"));dialog.append(acts);
  }
  const h1=document.querySelector(".head h1"),wrap=node("div",undefined,"migration-entry");h1.replaceWith(wrap);wrap.append(h1);
  const entry=button("旧ショーから移行",()=>R.state.migration?present(R.buildDesign(R.state.designName),false):intro(),"btn");entry.id="migration-entry";wrap.append(entry);
  function update(){entry.textContent=R.state.migration?"移行内容・元データ":"旧ショーから移行";}
  window.addEventListener("lighting-design-change",update);window.addEventListener("click",update);window.addEventListener("keyup",update);
  window.LIGHT_MIGRATION_UI=Object.freeze({review,intro});
  intro();
})();
