# Morning Report

## Outcome

**release: block**

P0-1〜P0-3の既知経路は現行コードとNode回帰テストで修正済みを確認した。P0-4もコード上はrevision競合・共通lock・origin/navigation制限が実装済みである。一方、Swift Self Testが一時コピーで終了コード134となり、物理iPad/iPhone・PWA・公開環境の検証もない。加えて監査中に既存tracked diffの内容指紋が変化したため、リリースを許可できない。

## Changes

- `PLAN.md`、`STATE.md`、`REPORT.md`、`BASELINE_GIT_STATUS.txt` を本runディレクトリ内に作成・更新した。
- アプリ、JSON、設定、Git履歴、正本、生成物、公開先は変更していない。

## Verification

- P0-1 Worker認証: `worker.js:32-42,101-122`。公開hostのSecret全未設定/片側設定を503、両方未設定のlocalhostだけ許可する分岐を確認。Node suite内の4件のWorker認証回帰テストが通過。**判定: changed**（前回レビュー時のfail-openからコードが変化）。
- P0-2 `?fresh`: `stage-sketch.js:998-1027`。localhost/file相当だけ、確認承認時に限って6キーを削除し、公開URLではwarnのみ。Node suite内の4件のfresh回帰テストが通過。**判定: changed**。
- P0-3 セッション退避: `stage-sketch.js:3779-3785`, `stage-sketch.js:21499`, `stage-session.js:522-527`。`writeShows`の戻り値を返し、false/例外時にguest role変更前で中止する。Node suiteの静的・QuotaExceededError回帰テストが通過。**判定: changed**。
- P0-4 Mac AI編集: `StageSketchProjectStore.swift:56-147` にexpected revision、競合返却、プロジェクト別lockの排他とarchiveを確認。`StageSketchBridge.swift:75-87` はmain frameかつ`shosai` origin以外を拒否し、`WebDownloadCoordinator.swift:15-57` は外部遷移をcancel/通常ブラウザへ渡す。ブラウザ側revisionテストは通過。**判定: changed**。ただしSwift Self Testは一時コピーで終了コード134のため、ネイティブ実行確認は**要確認**。
- Node: `node --test --test-reporter=spec tests/*.test.mjs` — 447 pass / 0 fail / 0 skip。
- MCP: `mcp-server/`で`npm test -- --test-reporter=spec` — 34 pass / 0 fail。
- `python3 build_stage.py --check` — 成功。`node --check worker.js stage-sketch.js stage-session.js stage-sw.js`、`git diff --check` — 成功。
- Mac build: `mac-app/build.sh` は、既存module cacheを含む一時コピーではcache path不一致で失敗したが、`mac-app/build`を除外した新規一時コピーでは成功。続く同コピーのSelf Testは終了コード134・JSON出力なし。
- 配置スキャン: `SHOWS_INVENTORY.md`の16 JSONを明示指定して`node tools/check-object-on-performer.mjs --all …`。新規0、既知allowlist 18、終了コード0。前回の2件（スタンドインのカメラ/ミット）は現在も存在するが既知allowlist内である。

## Pre-existing State Preserved

- 開始時の42行のdirty状態を `BASELINE_GIT_STATUS.txt` と指紋で保護した。run ledgerを除外したporcelain状態は開始時と一致（SHA-256 `b3c6688c3cfac3864ae5735d70a54e8084d12b244a7f68710a70ae4f856ee014`）。
- ただしtracked diffの指紋は開始時`ca1eea3867808ae598749cac0e442becafe620961e15f50bcde9883904ead617`から、監査終盤`59952a18f63a3ed3384f1410128669048698ba22cb47a244b1df72293a66ca94`へ変化した。既存変更のファイル名だけでは内容変化を特定できず、監査では原因を帰属しない。

## Unverified States

- Swift Self Testの異常終了（134）の原因は未特定。物理iPad/iPhone Safari、ホーム画面PWA、回転、Split View、Mac再起動後、実Worker統合、Wrangler bundle dry-run、公開revision・公開URLはいずれも未確認。
- P1は範囲を広げず、コード根拠の存在だけを確認した。`stage-shows.local.js`はHTMLで参照され`.gitignore`対象、venue import・壊れた棚退避キー・IndexedDB音源保存の実装根拠は存在する。各P1の解消判定はしていない。

## Blockers

- dirty tracked diffの内容指紋が変化したため、追加の書込みを伴う検証を停止した。

## Morning Decisions

- Swift Self Testを、保護された別の一時環境で再現・原因分類するか判断が必要。
- 物理端末と公開/Worker環境のQAを実施するまで、リリース判定を変えない。
