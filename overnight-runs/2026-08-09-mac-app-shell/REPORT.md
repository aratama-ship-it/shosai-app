# Morning Report

## Outcome

- Wave 1・2に加えて、本人が追加承認したWave 3を完了した。ブラウザとMacアプリで共通の
  端末データ書き出し／読み込みと、単独で実行できる移行手順書を追加した。
- 自己テスト6/6、ブラウザ側153/153、MCP側18/18が成功した。
- AI欄UI、commit、push、公開、配布、実データの移行、ファイルの削除・移動・改名は実施していない。

## Changes

- 新規 `mac-app/`: ビルドスクリプト、Info.plist、AppKit/WKWebViewアプリ、スキームハンドラ、設定、exportsストア、ブリッジ、FSEvents監視、自己テスト。
- `shosai://app/` は正規化・シンボリックリンク解決後にWebルート外を404にする。
- `window.stageSketchBridge` は `atDocumentStart` で注入し、`listEditExports` / `readExport` / `onEditAvailable` / `runAgent` を配線した。
- `runAgent` はUserDefaultsで設定された実行ファイルと引数を `Process` へ直接渡し、JS入力は末尾のプロンプト1引数だけとした。シェルは起動しない。600秒でTERM、応答しなければKILLする。
- exports監視はFSEventsと30秒ポーリングを併用し、新規JSONが `editSummary` を持つ場合だけ通知する。自動読込はしない。
- `stage-pwa.js`: `window.stageSketchBridge` がある場合のService Worker登録抑止。
- `.gitignore`: `mac-app/build/` を追加。
- 台帳検証用に `PLAN.md` へ既存日本語見出しの英語対応表だけを追記し、計画内容は変更していない。
- `storage-migration.js`: `stage-sketch.js` の既存5キーを起点に、実際のlocalStorageから
  `shosai` / `stage` 接頭辞のキーを走査する。値は文字列のまま一つのJSONへ保存する。
- 読み込みは `kind: "shosai-local-storage-backup"` / `version: 1`、entries、対象キー、文字列値を
  検証する。ファイルに無い既存キーは削除せず、復元・上書き・追加件数を確認してから書き込む。
- 入口はスクラップブックの既存ページ操作内へJSで追加した。Web側はMacブリッジで分岐しない。
- Mac殻には標準のWebダウンロードを `NSSavePanel` へつなぐ処理だけを追加した。
- `docs/MAC_APP_MIGRATION.md`: ブラウザからMacアプリへの手順と、`scout_pass` はオリジンごとに
  別で初回だけ再入力が必要なことを記載した。

## Verification

- `.app` ビルド:

  ```text
  $ bash mac-app/build.sh
  Building 制作の書斎.app
  Built: /Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/mac-app/build/制作の書斎.app
  exit 0
  ```

- `--self-test`: JSONの `ok` はtrue。項目1 index読込、2 title＋移行モデル＋書出／読込ボタン、
  3 bridge object、4 list＋read、5 stage読込＋bridge、6 ルート外404がすべてtrue、exit 0。
- `node --test tests/*.test.mjs`: tests 153 / pass 153 / fail 0 / exit 0。
  新規3件は、書出→読込の内容一致、壊れたJSON等の拒否、Mac専用ブリッジ非依存を検証した。
- `cd mcp-server && npm test`: tests 18 / pass 18 / fail 0 / exit 0。
- `plutil -lint mac-app/Resources/Info.plist`: OK。
- `git diff --check -- .gitignore stage-pwa.js`: 出力なし、exit 0。
- 成果物はarm64 Mach-O、`.app` は276KB。`git check-ignore` で `mac-app/build/` の除外を確認した。
- `overnight-project-runner` 台帳検証: `--final` でOK。

## Pre-existing State Preserved

- PLAN記載の保護対象のうち `index.html` 以外の7ファイルはWave 3開始時のGit blob hashと一致した。
  `index.html` は許可された版番号行だけ `app.js?v=47` から `v=48` へ変更し、その1箇所を戻して
  算出したhashがWave 3開始時の `865423e` と一致した。
- 開始時のその他の未コミット変更・未追跡ファイルにも本ランから変更を加えていない。
- `.stage-sketch-mcp/exports/` の既存4 JSONは読取りだけに使い、サイズとmtimeは開始時観測から変わっていない。
- preflightで報告済みの同期競合コピー候補11057件には触れていない。

## Unverified States

- 通常ウィンドウの目視操作、別端末、署名、公証、配布、公開は未検証。
- roster外部URLのCORSが `shosai://` から通るかは未検証。カスタムスキームによるローカルindex/stage読込は自己テスト済み。
- FSEventsの実ファイル生成通知は、保護対象exportsへ書き込まない条件を守るため未実行。FSEvents登録と30秒タイマーはコンパイル・差分監査済み。
- Macアプリで保存ダイアログを開き、本人の実データを実際に書き出し／読み込みする操作は未実施。
  WebKit内で移行モデルと両ボタンが読み込まれるところまでは自己テスト済み。

## Blockers

- None.

## Morning Decisions

- 通常起動の目視確認を行う場合は `open mac-app/build/制作の書斎.app` を本人の判断で実行する。
- 実移行は `docs/MAC_APP_MIGRATION.md` に沿って本人が行う。`scout_pass` は移行対象外なので、
  Macアプリの名簿を初めて開くときだけ入れ直す。

---

## Claudeによる独立検証（2026-08-09 03:39 JST）

Codexの報告を鵜呑みにせず、Claudeが自分で実行・確認した結果。

- `bash mac-app/build.sh` → ビルド成功
- `--self-test` → 6項目すべて成功、終了コード0。
  実データの `継ぎ目の庭…-舞台スケッチ_v1-r1.json` を列挙・読み取りできることを確認
- `node --test tests/*.test.mjs` → 153 passed / 0 failed
- `cd mcp-server && npm test` → 18 passed / 0 failed
- Git HEAD `210b6b9` のまま。commit・pushなし

### コードを読んで確認した安全性

- `AgentRunner.swift`: シェルを介さずプロセスを直接起動。実行ファイルと前段の引数は設定値で、
  JSから渡せるのはプロンプト文字列1つだけ。JSが任意コマンドを実行する経路はない
- `ShosaiSchemeHandler.swift` / `ExportStore.swift`: パス正規化とシンボリックリンク解決の後に
  ルート配下かを検査。範囲外は404。exports側はファイル名に `/` を含むものを拒否
- `storage-migration.js`: `removeItem` は書き込み失敗時のロールバックでのみ使用し、
  「読み込み前に存在しなかったキーを消す」用途に限定されている。
  **本人の既存データを消す経路はない**
- 移行対象キーは `shosai` / `stage` 接頭辞。`scout_pass` は接頭辞が違うため自動的に対象外

### 未検証（朝、本人と行う）

1. **ウィンドウの見た目**。無人では画面操作の許可が取れないため未確認
2. **名簿タブが `shosai://` から動くか**。公開URLのCORSは `access-control-allow-origin: *` を
   実測済みだが、WebKitがカスタムスキームのオリジンをCORSでどう扱うかは実機確認が必要。
   通らない場合の代替は `docs/MAC_APP_DESIGN.md` に記載済み
3. **FSEventsの通知**。実ファイル生成による通知は未検証（30秒ポーリングの併用で保険はある）
4. **実データの移行**。手順書はあるが、操作は本人が行う

### 残存リスク（設計上の性質。朝に共有する）

AI欄を作った後、`runAgent` は `codex exec --sandbox workspace-write` を起動する。
つまり**AI欄へ入力した内容は、作業ディレクトリのファイルを書き換えられる権限で動く**。
これは「AIに舞台スケッチを編集させる」という目的そのものなので想定内だが、
AI欄のUIを作る際に、実行前の確認をどう見せるかは本人と決める必要がある。
