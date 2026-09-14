import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const indexSource = await readFile(new URL("stage.html", root), "utf8");
const stageSource = await readFile(new URL("stage-sketch.js", root), "utf8");
const styleSource = await readFile(new URL("style.css", root), "utf8");
const englishSource = await readFile(new URL("stage-i18n.js", root), "utf8");
const simplifiedSource = await readFile(new URL("stage-i18n.zh-Hans.js", root), "utf8");
const traditionalSource = await readFile(new URL("stage-i18n.zh-Hant.js", root), "utf8");

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `${start} が見つからない`);
  assert.ok(to > from, `${end} が見つからない`);
  return source.slice(from, to);
}

test("常設ショーパネルは現在のタイトル・版・詳細設定だけを表示する", () => {
  const panel = sourceBetween(
    indexSource,
    '<section class="stage-panel stage-project-section"',
    '<section class="stage-panel stage-venue-panel"',
  );

  assert.match(panel, /id="stage-project-summary-title"/);
  assert.match(panel, /id="stage-project-summary-version"/);
  assert.match(panel, /id="stage-project-settings-open"[^>]*aria-haspopup="dialog"[^>]*aria-controls="stage-project-settings-modal"/);
  for (const detailId of [
    "stage-project-title",
    "stage-version-label",
    "stage-shows-open",
    "stage-export-json",
    "stage-venue-select",
  ]) {
    assert.doesNotMatch(panel, new RegExp(`id="${detailId}"`));
  }
  assert.match(styleSource, /\.stage-project-summary \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*?gap: 8px;/);
  assert.match(styleSource, /\.stage-project-summary-copy strong \{[\s\S]*?font-size: 13px;/);
  assert.match(styleSource, /\.stage-project-summary-copy span \{[\s\S]*?font-size: 10px;/);
  assert.match(styleSource, /\.stage-project-section \.stage-project-summary \.stage-minor-action \{[\s\S]*?min-height: 44px;/);
});

test("ショー設定と入出力は詳細設定モーダルに残し、劇場設定は分離する", () => {
  const modal = sourceBetween(
    indexSource,
    '<div class="stage-modal stage-project-settings-modal"',
    '<div class="stage-modal-backdrop" id="stage-shows-backdrop"',
  );

  assert.match(modal, /role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(modal, /id="stage-project-settings-title">ショーの詳細設定</);
  for (const detailId of [
    "stage-project-title",
    "stage-version-label",
    "stage-version-copy",
    "stage-shows-open",
    "stage-show-new",
    "stage-export-json",
    "stage-import-json",
  ]) {
    assert.match(modal, new RegExp(`id="${detailId}"`));
  }
  for (const venueId of [
    "stage-venue-select",
    "stage-venue-custom-open",
    "stage-size-select",
    "stage-venue-library-export",
    "stage-venue-library-import",
  ]) {
    assert.doesNotMatch(modal, new RegExp(`id="${venueId}"`));
  }
});

test("劇場パネルから制作画面へ入り、制作画面の冒頭でプリセットを選べる", () => {
  const panel = sourceBetween(
    indexSource,
    '<section class="stage-panel stage-venue-panel"',
    '<section class="stage-panel stage-music-panel"',
  );
  const editor = sourceBetween(
    indexSource,
    '<div class="stage-modal stage-venue-editor-modal"',
    '<div class="stage-modal-backdrop" id="stage-venue-import-backdrop"',
  );

  assert.match(panel, /data-panel="venue"[^>]*data-title="劇場"/);
  assert.match(panel, /id="stage-venue-summary-title"/);
  assert.match(panel, /id="stage-venue-summary-size"/);
  assert.match(styleSource,
    /\.stage-venue-summary \{[\s\S]*?display: flex;[\s\S]*?align-items: baseline;[\s\S]*?gap: 6px;[\s\S]*?line-height: 1\.25;/);
  assert.match(styleSource,
    /\.stage-venue-summary span \{[\s\S]*?flex: 0 0 auto;/);
  assert.match(panel,
    /id="stage-venue-custom-open"[^>]*aria-haspopup="dialog"[^>]*aria-controls="stage-venue-editor-modal">劇場セットアップ</);
  assert.match(indexSource,
    /id="stage-venue-editor-title">劇場セットアップ[\s\S]*?class="stage-project-venue stage-venue-section stage-venue-editor-presets"[\s\S]*?id="stage-venue-select-label"[\s\S]*?id="stage-venue-select"[\s\S]*?id="stage-size-select"/);
  assert.match(editor,
    /id="stage-venue-editor-canvas"[\s\S]*?class="stage-venue-editor-actions stage-venue-library-footer"[\s\S]*?class="stage-io-row stage-venue-library-actions"[\s\S]*?id="stage-venue-editor-save">ライブラリに保存[\s\S]*?id="stage-venue-library-export">劇場を書き出す[\s\S]*?id="stage-venue-library-import"[\s\S]*?id="stage-venue-editor-apply">この劇場を反映する/);
  assert.doesNotMatch(editor,
    /class="stage-venue-editor-presets"[\s\S]*?class="stage-venue-library-actions"[\s\S]*?class="stage-venue-editor-workspace"/);
  assert.match(styleSource,
    /\.stage-venue-choice-row \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(styleSource,
    /\.stage-venue-library-actions \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(styleSource,
    /\.stage-venue-library-actions \{[\s\S]*?width: min\(100%, 640px\);[\s\S]*?margin-left: auto;/);
  assert.match(styleSource,
    /\.stage-venue-library-actions > button,[\s\S]*?color: var\(--milk\);[\s\S]*?font-family: var\(--sans\);[\s\S]*?font-size: 14px;/);
  assert.match(styleSource,
    /@media \(max-width: 640px\)[\s\S]*?\.stage-venue-library-actions \{ grid-template-columns: 1fr; \}/);
  assert.match(styleSource, /\.stage-panel\.stage-venue-panel \.stage-venue-custom-open \{[\s\S]*?min-height: 38px;/);
  assert.match(styleSource, /\.stage-venue-editor-presets \{[\s\S]*?padding: 12px;[\s\S]*?border: 3px solid var\(--paper\);/);
  assert.match(indexSource,
    /id="stage-venue-editor-shape-title">2\. メインの形を選択してください[\s\S]*?data-venue-editor-shape="rectangle"[^>]*>[\s\S]*?<span>長方形<\/span>[\s\S]*?data-venue-editor-shape="freeform"[^>]*>[\s\S]*?<span>カスタム<\/span>/);
  assert.match(styleSource, /\.stage-modal\.stage-project-settings-modal \{ width: min\(620px, calc\(100vw - 40px\)\); \}/);
});

test("詳細設定は開閉でき、変更したタイトルと版を要約へ同期する", () => {
  assert.match(stageSource, /function syncProjectSummary\(\) \{[\s\S]*?projectSummaryTitle\.textContent = title;[\s\S]*?projectSummaryVersion\.textContent = version;/);
  assert.match(stageSource, /function openProjectSettings\(\) \{[\s\S]*?projectSettingsModal\.hidden = false;[\s\S]*?projectTitle\.focus\(\);/);
  assert.match(stageSource, /function closeProjectSettings\(\) \{[\s\S]*?projectSettingsModal\.hidden = true;[\s\S]*?target\.focus\(\{ preventScroll: true \}\);/);
  assert.match(stageSource, /projectSettingsOpen\.addEventListener\("click", openProjectSettings\)/);
  assert.match(stageSource, /\[els\.projectSettingsClose, els\.projectSettingsBackdrop\][\s\S]*?addEventListener\("click", closeProjectSettings\)/);
  assert.match(stageSource, /els\.projectSettingsModal\.addEventListener\("keydown"[\s\S]*?event\.key !== "Escape"[\s\S]*?closeProjectSettings\(\)/);
  assert.match(stageSource, /state\.project\.title = e\.target\.value\.slice\(0, 60\);\s*syncProjectSummary\(\);/);
  assert.match(stageSource, /state\.project\.versionLabel = e\.target\.value\.slice\(0, 16\);\s*syncProjectSummary\(\);/);
});

test("ショー詳細と劇場パネルの新しい文言は英語・簡体字・繁体字に揃う", () => {
  for (const source of [englishSource, simplifiedSource, traditionalSource]) {
    assert.match(source, /"詳細設定":/);
    assert.match(source, /"ショーの詳細設定":/);
    assert.match(source, /"劇場":/);
    assert.match(source, /"劇場形式を選び、カスタムステージを制作する":/);
  }
});
