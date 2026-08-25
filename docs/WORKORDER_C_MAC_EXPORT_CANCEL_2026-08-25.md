# 発注書C: Macの書き出しキャンセルを「成功」として数えない（P1-10）

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-25。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 背景（なぜ直すか）

リリース前レビュー P1-10。**Save Panelでキャンセルしても、書き出せたことにされる。**

実際の作りは次のとおり（2026-08-25 に確認済み）。

**Swift側は正しい。** `mac-app/Sources/WebDownloadCoordinator.swift`（75行付近）は
`NSSavePanel` の結果を見て、OK以外なら `completionHandler(nil)` を渡している。
キャンセルを正しく扱っており、**ここは直す必要がない。**

**壊れているのはJS側。** `stage-sketch.js` の `downloadBlob()` は
`link.click()` を呼ぶだけで、保存先が決まったかを一切知らない。
そして `writeProjectExport()`（16011行付近）が、その直後に無条件で:

```js
state.lastExportAt = nowIso();
state.editsSinceExport = 0;
```

を実行する。つまり**キャンセルしても「いま書き出した／未書き出しの変更は0件」になる。**

これが困るのは、`updateBackupNote()` が「最後のファイル書き出し」と
「それから何回の変更」を出しており、**利用者はこの表示を見て控えの有無を判断する**ため。
嘘の表示は、控えを取り損ねる事故に直結する。

## やること

### C-1. ネイティブ側から確定結果を返す

Macアプリの中でだけ、**保存先が決まったかどうか**をページへ知らせる。

- `WebDownloadCoordinator` の `decideDestinationUsing` で、
  `response == .OK` かどうかを**ページ側へ伝える**。
- 伝え方は既存のブリッジの作法に合わせること。
  `mac-app/Sources/StageSketchBridge.swift` が
  `WKUserContentController` 経由でメッセージを扱っているので、**その仕組みを流用する**。
  新しい通信路を発明しない。`notifyEditAvailable(_:)`（172行付近）が
  ネイティブ→ページの通知の実例なので、これに倣う。
- ページ側では `window.stageSketchBridge` に生えるものとして受け取る。

**★命名と形は既存に合わせること。** 迷ったら `StageSketchBridge.swift` の
既存メッセージと同じ形にする。

### C-2. 確定してから状態を更新する

`stage-sketch.js` を、**保存先が決まったときだけ**状態を更新する形へ変える。

現在:
```js
downloadBlob(blob, `${safe}-${version}.json`);
state.lastExportAt = nowIso();
state.editsSinceExport = 0;
persistSoon();
updateBackupNote();
announce(...);
```

変更後の考え方:
- `downloadBlob()` が**保存されたかどうかを返す**形にする（Macアプリでは確定を待ち、
  それ以外の環境では従来どおり成功とみなす）
- **成功したときだけ** `lastExportAt` / `editsSinceExport` を更新し、成功の文言を出す
- **キャンセルされたら状態を変えない。** 文言も「書き出しました」にしない
  （「書き出しをやめました。」程度でよい。**エラー扱いにはしない**——利用者が自分で選んだ操作なので）

**★ブラウザ（Macアプリ以外）の挙動を変えないこと。** ブラウザには
「保存先が決まったか」を知る手段が無い。`window.stageSketchBridge` が無ければ
**従来どおり成功として扱う**。ここを変えると全環境の書き出しが壊れる。

### C-3. 対象となる呼び出し

`downloadBlob()` を使っている箇所すべてで、上の判定が効くようにする。
**まず `grep -n "downloadBlob(" stage-sketch.js` で全箇所を洗い出し、
それぞれで状態更新の有無を確認すること。** 少なくとも次は対象:

- `writeProjectExport()`（16011行付近）＝ ショーのJSON書き出し。**本命**
- 画像の書き出し・稽古用JSONなど、`lastExportAt` を触るものがあれば同様に

`lastExportAt` を触らない書き出し（一時的な画像など）は、成功判定を足すだけでよい。

### C-4. 触ってはいけないもの

- `NSSavePanel` の扱い自体（既に正しい）
- `downloadDidFinish` / `didFailWithError` の既存処理
- ブリッジの認証・Origin制限（P0で入れたもの）
- ブラウザでの書き出し経路

## 共通の制約（必ず守る）

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- **版上げと `build_stage.py` の実行はしない。** 発注元がやる。`index.html` を触ったら報告する。
- 日本語UI文字列を足したら **`stage-i18n.js` へ英語も登録する**
  （`tests/stage-i18n-coverage.test.mjs` が落ちる）。
- 既存テストを壊さない。落ちる場合は**そのテストが何を守っていたのかを報告する**。

## 完了条件

1. `node --test tests/` 全通過（現状513件）。
2. Macアプリがビルドでき、セルフテストが通ること
   （`mac-app` のビルド手順は既存の発注書 `docs/FPV_*_WORKORDER_*.md` を参照）。
3. 回帰テストを追加すること。最低限:
   - ブリッジが無いとき（＝ブラウザ）は従来どおり成功として扱うこと
   - キャンセルされたとき `lastExportAt` / `editsSinceExport` を変えないこと
4. 手で確かめる（Macアプリ）:
   - 書き出し → 保存 → 「最後のファイル書き出し」が更新され、未書き出しが0になる
   - 書き出し → **キャンセル** → **表示が変わらない**（ここが本題）
   - ブラウザで書き出し → 従来どおり動く

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- ネイティブ→ページの通知に、既存のどの仕組みを流用したか
- **できなかったこと・不確かなことを隠さない。**
