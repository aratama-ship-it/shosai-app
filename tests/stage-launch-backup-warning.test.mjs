import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("stage.html", root), "utf8");
const source = await readFile(new URL("stage-sketch.js", root), "utf8");
const style = await readFile(new URL("style.css", root), "utf8");
const i18n = await readFile(new URL("stage-i18n.js", root), "utf8");

test("起動時警告は保存データを取る行動を最初のモーダルに示す", () => {
  assert.match(html, /id="stage-launch-backup-warning"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /保存データの控えを取ってください/);
  assert.match(html, /舞台スケッチのβ版は、更新の影響でこの端末に保存したショーを開けなくなる可能性があります。定期的にファイルへ書き出してください。/);
  assert.doesNotMatch(html, /作業を始める前に|この警告は起動するたびに表示されます/);
  assert.match(html, /id="stage-launch-backup-export">いま保存データを書き出す/);
  assert.match(html, /id="stage-launch-backup-continue">確認して作業を始める/);
  assert.match(html, /id="stage-launch-backup-close"[\s\S]*?aria-label="この知らせを閉じる">×<\/button>/);
  assert.doesNotMatch(html, /stage-launch-backup[^>]*(?:二度と表示しない|次回から表示しない)/);
  assert.match(i18n, /"保存データの控えを取ってください": "Export a copy of your saved data"/);
  assert.match(i18n, /"舞台スケッチのβ版は、更新の影響でこの端末に保存したショーを開けなくなる可能性があります。定期的にファイルへ書き出してください。"/);
});

test("管理用guest1だけを除外し、本人不明時もfail-closedで表示する", () => {
  assert.match(source, /MANAGED_BACKUP_WARNING_EXEMPT_USER = "guest1"/);
  assert.match(source, /signedInUser !== MANAGED_BACKUP_WARNING_EXEMPT_USER/);
  assert.doesNotMatch(source, /if \(!signedInUser\) return false/);
  assert.match(source, /Boolean\(document\.querySelector\("\.stage-beta"\)\)/);
});

test("警告は記憶せず毎回表示し、閉じるまで背後とEscapeを止める", () => {
  const warningBlock = source.slice(
    source.indexOf("const MANAGED_BACKUP_WARNING_EXEMPT_USER"),
    source.indexOf("function updateWhoamiBadge()"),
  );
  assert.match(warningBlock, /stageView\.inert = true/);
  assert.match(warningBlock, /event\.key === "Escape"[\s\S]*?preventDefault\(\)[\s\S]*?stopImmediatePropagation\(\)/);
  assert.doesNotMatch(warningBlock, /localStorage|sessionStorage/);
  assert.match(source, /const launchWarningShown = openLaunchBackupWarning\(\)/);
  assert.match(source, /if \(launchBackupWarningOpen\) return/);
});

test("保存操作は警告を閉じて既存のプロジェクト書き出しへ接続する", () => {
  assert.match(source, /launchBackupExport\.addEventListener\("click", \(\) => \{[\s\S]*?closeLaunchBackupWarning\(false\);[\s\S]*?exportProject\(\)/);
});

test("右上の×とポップアップ外側のクリックで警告を閉じる", () => {
  assert.match(source, /launchBackupClose\.addEventListener\("click", \(\) => closeLaunchBackupWarning\(true\)\)/);
  assert.match(source, /launchBackupBackdrop\.addEventListener\("click", \(\) => closeLaunchBackupWarning\(true\)\)/);
  assert.match(source, /\[els\.launchBackupClose, els\.launchBackupExport, els\.launchBackupContinue\]/);
});

test("警告面は最前面かつモバイルで操作を縦に並べる", () => {
  assert.match(style, /\.stage-launch-backup-backdrop \{[\s\S]*?z-index: 10000/);
  assert.match(style, /\.stage-modal\.stage-launch-backup-warning \{[\s\S]*?width: min\(560px, calc\(100% - 32px\)\)[\s\S]*?z-index: 10001/);
  assert.match(style, /\.stage-launch-backup-actions button \{[\s\S]*?min-height: 44px/);
  assert.match(style, /\.stage-launch-backup-close \{[\s\S]*?width: 44px;[\s\S]*?height: 44px/);
  assert.match(style, /@media \(max-width: 520px\)[\s\S]*?\.stage-launch-backup-actions \{ flex-direction: column; \}/);
});
