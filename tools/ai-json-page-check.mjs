#!/usr/bin/env node
/* file:// acceptance. No files written unless --screenshots <directory> is given. */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.indexOf("--screenshots"), out = outArg >= 0 ? process.argv[outArg + 1] : null;
if (outArg >= 0 && (!out || out.startsWith("--"))) throw new Error("--screenshots needs a directory");
const pwPath = process.env.STUDY_PLAYWRIGHT || "/Users/arata/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js";
const loaded = await import(pathToFileURL(pwPath)), { chromium } = loaded.default || loaded;
const pageUrl = pathToFileURL(path.join(root, "public/ai-json/index.html")).href;
const read = name => readFile(path.join(root, name), "utf8");
const manual = await read("docs/ai-json-manual/AI_MANUAL_ja.md");
const good = await read("docs/ai-json-manual/samples/sample-minimal.json");
const chatgpt = await read("docs/ai-json-manual-2026-09-11/p2-runs/chatgpt-1-1.json");
const gemini = await read("docs/ai-json-manual-2026-09-11/p2-runs/gemini-1-1.json");
let checks = 0, failures = 0, browser;
const record = (name, ok, detail = "") => { checks++; if (!ok) failures++; console.log((ok ? "OK " : "NG ") + name + (detail ? " — " + detail : "")); };
if (out) await mkdir(out, { recursive: true });
try {
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage();
    const errors = [], external = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", r => { if (/^(https?|wss?):/.test(r.url())) external.push(r.url()); });
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
    await page.goto(pageUrl);
    await page.waitForFunction(() => Boolean(window.ShodaiAiJsonCheck));
    const fillCheck = async text => { await page.locator("#json-input").fill(text); await page.locator("#check-json").click(); };
    const state = () => page.locator("#check-status").getAttribute("data-state");
    record(width + " 製品名を表示", await page.locator("h1").innerText() === "AI showwright\nfor StageSketch");
    const betaStatus = await page.locator(".beta-status").innerText();
    record(width + " AI showwrightとStageSketchをβ版と表示", betaStatus.includes("AI showwright β") && betaStatus.includes("StageSketch β") && betaStatus.includes("AI showwright for StageSketchは現在β版です"));
    record(width + " プロンプト配布導線", await page.getByRole("link", { name: "プロンプトをダウンロード（.md）" }).isVisible() && await page.getByRole("button", { name: "プロンプトをコピー" }).isVisible());
    record(width + " 手順1が利用者自身のAIエージェントを指定", (await page.locator(".step").first().innerText()).includes("ご自身でお使いのAIエージェントに貼る"));
    const privacyWarning = page.getByRole("note", { name: "機密情報をAIへ渡す前に" });
    const privacyText = await privacyWarning.innerText();
    record(width + " 機密情報の注意を表示", await privacyWarning.isVisible() && privacyText.includes("そのまま送信しないでください") && privacyText.includes("ローカルLLM") && privacyText.includes("実際の通信先と保存先を確認"));
    record(width + " 本文が正本と一致", await page.locator("#manual-fallback").inputValue() === manual);
    await page.locator("#copy-manual").click();
    record(width + " 本文コピー拒否時の案内と退避", await page.locator("#manual-fallback").isVisible() && (await page.locator("#manual-status").innerText()).includes("手動"));
    await page.evaluate(() => document.getElementById("manual-fallback").classList.add("hidden"));
    await fillCheck(good);
    record(width + " 見本は点検OK", await state() === "ok");
    await page.locator("#json-input").fill("{");
    record(width + " 入力変更で古いOKが消える", await state() === "unchecked" && await page.locator(".result.ok").count() === 0);
    for (const [name, text, figureExpected, contractExpected] of [["ChatGPT", chatgpt, 6, 0], ["Gemini", gemini, 37, 2]]) {
      await fillCheck(text);
      record(width + " " + name + " 分類と件数", await page.locator(".result.figure li").count() === figureExpected && await page.locator(".result.contract li").count() === contractExpected);
    }
    await fillCheck(chatgpt); await page.locator("#copy-fix").click();
    const expected = await page.evaluate(() => {
      const C = window.ShodaiAiJsonCheck;
      return C.buildFixRequest(C.checkJsonText(document.getElementById("json-input").value, C.enums).errors);
    });
    record(width + " 修正依頼コピー拒否時の全文退避", await page.locator("#fix-fallback").inputValue() === expected && await page.locator("#fix-fallback").isVisible());
    if (out) {
      await page.locator("#check-json").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, "issues-" + width + ".png") });
    }
    await page.locator("#json-input").fill(good);
    record(width + " 古い修正依頼と退避を無効化", !(await page.locator("#copy-fix").isVisible()) && !(await page.locator("#fix-fallback").isVisible()) && await page.locator("#fix-fallback").inputValue() === "");
    await fillCheck('{\n"a": nope,\n"b": 1\n}');
    const syntax = await page.locator("#syntax-error").innerText();
    record(width + " 構文エラーの実位置か取得不能を表示", await state() === "uncheckable" && (syntax.includes("行 2") || syntax.includes("位置は取得できません")) && !syntax.includes("行 4"), syntax);
    const malformed = JSON.parse(good); malformed.project.cast[0] = "bad";
    await fillCheck(JSON.stringify(malformed));
    record(width + " 不正要素でページが例外にならない", await state() === "invalid" && await page.locator(".result.figure li").count() > 0);
    await fillCheck(good.replace('"version": 4', '"version": 1, "version": 4'));
    record(width + " キー重複を検出", await state() === "invalid" && (await page.locator("#check-results").innerText()).includes("重複"));
    await page.locator("#json-file").setInputFiles({ name: "draft.json", mimeType: "application/json", buffer: Buffer.from(good) });
    await page.waitForFunction(() => document.getElementById("json-input").value.includes("二つの距離"));
    record(width + " ファイル選択後も未点検", await state() === "unchecked");
    await page.locator("#check-json").click();
    record(width + " ファイル経路も点検OK", await state() === "ok");
    await page.evaluate(async () => {
      await document.getElementById("json-file").onchange({ target: { files: [{ size: 10, text: async () => { throw new Error("read failed"); } }] } });
    });
    record(width + " ファイル読み取り失敗は点検不能", await state() === "uncheckable" && !(await page.locator("#copy-fix").isVisible()));
    const didRead = await page.evaluate(async () => {
      let read = false;
      await document.getElementById("json-file").onchange({ target: { files: [{ size: 2097153, text: async () => { read = true; return "{}"; } }] } });
      return read;
    });
    record(width + " 容量超過は読み取り前に停止", !didRead && await state() === "uncheckable");
    await page.evaluate(async () => {
      let resolve;
      const pending = document.getElementById("json-file").onchange({ target: { files: [{ size: 10, text: () => new Promise(r => { resolve = r; }) }] } });
      const input = document.getElementById("json-input"); input.value = "新しい手入力"; input.dispatchEvent(new Event("input"));
      resolve("古いファイル"); await pending;
    });
    record(width + " 遅いファイル読み取りで新入力を上書きしない", await page.locator("#json-input").inputValue() === "新しい手入力");
    await fillCheck(chatgpt);
    await page.evaluate(() => { navigator.clipboard.writeText = () => new Promise((_, reject) => { window.rejectCopy = reject; }); });
    await page.locator("#copy-fix").click(); await page.locator("#json-input").fill(good);
    await page.evaluate(() => window.rejectCopy(new Error("late denial")));
    record(width + " 遅いコピー失敗で旧退避が復活しない", !(await page.locator("#fix-fallback").isVisible()) && await page.locator("#fix-fallback").inputValue() === "");
    await page.evaluate(() => {
      window.savedCheck = window.ShodaiAiJsonCheck.checkJsonText;
      window.ShodaiAiJsonCheck.checkJsonText = () => { throw new Error("test"); };
    });
    await page.locator("#check-json").click();
    record(width + " 検査器例外は点検不能", await state() === "uncheckable" && await page.locator(".result.ok").count() === 0);
    await page.evaluate(() => {
      window.ShodaiAiJsonCheck.checkJsonText = window.savedCheck;
      navigator.clipboard.writeText = async text => { window.copiedText = text; };
    });
    await fillCheck(chatgpt); await page.locator("#copy-fix").click();
    record(width + " コピー成功を通知", (await page.locator("#fix-status").innerText()).includes("コピーしました") && await page.evaluate(() => window.copiedText.includes("完全JSON")));
    await fillCheck(good);
    record(width + " ページ横溢れなし", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    record(width + " ボタン高44px以上", await page.locator("button:visible").evaluateAll(els => els.every(e => e.getBoundingClientRect().height >= 44)));
    record(width + " 退避欄は読み取り専用", await page.locator("#fix-fallback").getAttribute("readonly") !== null);
    if (out) {
      await page.locator("#check-json").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, "ok-" + width + ".png") });
    }
    record(width + " 外部通信なし", external.length === 0);
    record(width + " ページエラーなし", errors.length === 0, errors.join(" / "));
    await context.close();
  }
} catch (e) { record("ブラウザ検証の実行", false, e.message); }
finally { if (browser) await browser.close(); }
console.log("RESULT: " + (checks - failures) + "/" + checks + " passed; " + failures + " failed");
process.exitCode = failures ? 1 : 0;
