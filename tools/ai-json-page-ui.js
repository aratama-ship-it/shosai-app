/* Inlined by the builder. Data is only rendered with textContent/value. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), C = window.ShodaiAiJsonCheck;
  const input = $("json-input"), results = $("check-results"), status = $("check-status");
  const notice = $("syntax-error"), fix = $("copy-fix"), fallback = $("fix-fallback");
  let revision = 0, fileTicket = 0, lastText = null, lastErrors = [];
  const hide = el => el.classList.add("hidden");
  const show = el => el.classList.remove("hidden");
  function invalidate(message = "入力が変わりました。未点検です。もう一度「点検する」を押してください。") {
    revision++; fileTicket++; lastText = null; lastErrors = [];
    results.replaceChildren(); hide(notice); notice.textContent = "";
    hide(fix); hide(fallback); fallback.value = ""; $("fix-status").textContent = "";
    status.textContent = message; status.dataset.state = "unchecked";
  }
  function cannotCheck(message) {
    status.textContent = "点検不能：合格ではありません。"; status.dataset.state = "uncheckable";
    notice.textContent = message; show(notice);
  }
  async function copy(text, target, feedback, isCurrent = () => true) {
    hide(target); feedback.textContent = "";
    try {
      await navigator.clipboard.writeText(text);
      if (isCurrent()) feedback.textContent = "コピーしました。AIへ貼り付けてください。";
    } catch (_) {
      if (!isCurrent()) return;
      target.value = text; show(target); target.focus(); target.select();
      feedback.textContent = "自動コピーできませんでした。下の選択済みテキストを手動でコピーしてください。";
    }
  }
  $("copy-manual").onclick = () => copy($("manual-fallback").value, $("manual-fallback"), $("manual-status"));
  input.addEventListener("input", () => { $("json-file").value = ""; invalidate(); });
  $("json-file").onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    invalidate("ファイルを読み取っています。まだ点検していません。");
    input.value = "";
    const ticket = fileTicket;
    if (!C || file.size > C.rules.maxBytes) { cannotCheck("点検用定義がないか、ファイルが2 MiBを超えています。"); return; }
    try {
      const text = await file.text();
      if (ticket !== fileTicket) return;
      input.value = text;
      status.textContent = "ファイルを読み取りました。未点検です。「点検する」を押してください。";
    } catch (_) {
      if (ticket === fileTicket) cannotCheck("ファイルを読み取れませんでした。iCloud等からダウンロード済みか確認し、選び直してください。");
    }
  };
  $("check-json").onclick = () => {
    const text = input.value;
    invalidate("点検しています。");
    let checked;
    try {
      if (!C || typeof C.checkJsonText !== "function") throw new Error("checker unavailable");
      checked = C.checkJsonText(text, C.enums);
      if (!checked || !Array.isArray(checked.errors) || !["ok", "invalid", "uncheckable"].includes(checked.status) ||
          (checked.status === "ok" && (!checked.complete || checked.errors.length))) throw new Error("invalid result");
    } catch (_) {
      cannotCheck("点検処理が正常に終わりませんでした。合格ではありません。正規の点検ページを開き直してください。"); return;
    }
    lastText = text; lastErrors = checked.errors;
    if (checked.status === "uncheckable") {
      cannotCheck(checked.errors.map(e => e.path + ": " + e.message).join("\n"));
    } else if (checked.status === "ok") {
      status.textContent = "点検済み：この入力には、検査対象の問題は見つかりませんでした。"; status.dataset.state = "ok";
      const d = document.createElement("div"); d.className = "result ok";
      d.textContent = "点検OK。機械検査の対象範囲での結果です。意図との一致・実施可能性・安全承認は保証しません。入力を変えたら再点検してください。";
      results.append(d);
    } else {
      status.textContent = "点検済み：修正が必要な問題があります。"; status.dataset.state = "invalid";
      for (const [kind, label] of Object.entries(C.rules.labels)) {
        const items = checked.errors.filter(e => e.severity === kind);
        if (!items.length) continue;
        const d = document.createElement("div"), h = document.createElement("h3"), ul = document.createElement("ul");
        d.className = "result " + (kind === "changes-figure" ? "figure" : "contract");
        h.textContent = label + "（" + items.length + "件）";
        for (const error of items) { const li = document.createElement("li"); li.textContent = error.path + ": " + error.message; ul.append(li); }
        d.append(h, ul); results.append(d);
      }
    }
    if (lastErrors.length) show(fix);
  };
  fix.onclick = () => {
    if (lastText === null || input.value !== lastText || !lastErrors.length) { invalidate(); return; }
    const ticket = revision, text = lastText;
    copy(C.buildFixRequest(lastErrors), fallback, $("fix-status"), () => ticket === revision && input.value === text);
  };
  if (!C) cannotCheck("点検プログラムを読み込めませんでした。ページと付属JSを同じフォルダに置いてください。");
})();
