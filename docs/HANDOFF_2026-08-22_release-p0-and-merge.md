# 引き継ぎ資料 2026-08-22: リリース阻止項目P0封鎖・Mac miniとのマージ・push

このファイル単体で、別マシン・別セッションのエージェントが状況を引き継げるように書いている。
実行環境依存の情報には「このMacでは」と明記する。

## 結論（3行で）

1. **リリース前システムレビューのP0（リリース阻止）全4件は封鎖・検証済み・push済み。**
2. **Mac miniから先行push済みだった35コミットとの乖離を、衝突12件を精査してマージ・push済み。**
3. **P1の残り7項目と実機QA全般は未着手。** レビューの結論は「本番リリース不可」のまま。

pushは完了しているので、GitHub Pages（`https://aratama-ship-it.github.io/shosai-app/`）には
今日の内容が反映されている。**Cloudflare Workerへの`wrangler deploy`は別操作でまだ実行していない。**

## 今の状態（引き継ぎ時点）

- ブランチ: `main`。**`HEAD` == `origin/main`**（commit `9356f95`）。push済みでこれ以上の作業は無い。
- 未commitの変更が作業ツリーに4ファイルだけ残っている（下記「保留中の判断」参照）。
- Macアプリ（`mac-app/build/制作の書斎.app`）はビルド済み・セルフテスト24件通過の状態。
  ただし**ビルド成果物は`.gitignore`対象**なので、別マシンでは`bash mac-app/build.sh`から。
- 版番号: `stage-sketch.js?v=287` / `stage-session.js?v=3` / `style.css?v=193` /
  `stage-i18n.js?v=74` / Service Worker cache `stage-sketch-pwa-v132`。

## 今日やったこと（時系列）

### 1. リリース前システムレビューの検証と対応

Codexが今朝書いた`docs/STAGE_SKETCH_RELEASE_REVIEW_2026-08-22.md`（楽曲MVP・レスポンシブUI修正の
総括。リリース判定「保留」、P0が4件、P1が8件）を、Claudeが鵜呑みにせずコードで裏取りしてから対応した。

- **P0-1**: `worker.js`がSecret未設定時に認証をかけない仕様（fail-open）だった。
  → **本番のみfail-closed**（本人判断）。ローカルは今までどおり通す。
  片側だけのSecret設定はローカルでも503にする（Claudeが発注時に追加した判断）。
- **P0-2**: `?fresh`が確認なしで端末上の全ショーを削除していた。
  → **localhost/`file://`限定＋確認ダイアログ**（本人判断）。公開URLでは何も消えなくなった。
- **P0-3**: セッション参加前の退避失敗ガードが、`writeShows`が例外ではなく`false`を返すため
  **一度も発火しない死んだコード**だった（レビューの記述より悪化していた）。
  → 戻り値を`shelveNow()`まで伝播させ、`!== false`で判定するよう修正。
- **P1-9**: 棚（ショー一覧）のJSONが壊れると、他の全ショーが現在の1件で上書きされる。
  → 壊れ検出と「正常な空（初回利用）」の厳密な区別、書き込みの全面停止。
- **P1-9追補**: 上記の実装後にClaudeが自分の発注書の設計不備2つを発見
  （退避コピーを消す経路が無い／2回目の破損で退避表示が嘘になる）。
  → `rebuildShelf`を「ファイルへ書き出す→確認→両キーを消す」に作り替えて解消（本人判断で案2採用）。
- **P0-4**: Macブリッジ（`mac-app/Sources/`）が、外部サイトへ遷移した状態でも
  `runAgent`（`codex exec --sandbox workspace-write`）等の全操作を呼べる状態だった。
  **レビューでは4番目の項目だったが、実害はこちらが最優先**とClaudeが判断し直した。
  3層で封鎖:
  - 層1: `shosai://`以外のメインフレーム遷移を禁止。本人がクリックしたhttp(s)リンクだけ
    `NSWorkspace.shared.open`で外部ブラウザへ渡す。
  - 層2: `message.frameInfo.securityOrigin.protocol == "shosai"`によるブリッジの関所
    （WebKitが持つ実オリジンなのでページ側から偽装できない）。
  - 層3: MCP（Node）側は`locks/`の排他ロックと`expectedRevision`必須化が既にあったが、
    Swift側だけがそれを迂回していた。Nodeと同じ作法に揃え、`expectedRevision`不一致は
    **書かずに中止して読み直しを促す**（本人判断）。`state.mcpRevision`は`state.project`ではなく
    `state`直下に持つ（正本の`project`に紛れ込むと`validateDocument`に弾かれるため）。

各段階でCodexに実装させ、**Claudeが自分でビルド・テストを実行して検証**した
（Codexの報告を鵜呑みにしない方針）。

### 2. push時にMac miniとの35コミット乖離が判明、マージ

pushしようとしたところ`rejected`。`git fetch`すると、Mac miniから既に35コミットがpush済みだった
（3Dカメラ演者編集・舞台機構段階2/3・小道具・会場ライブラリ・名簿/スタッフ分離・
リアルタイムセッション・Basic認証ゲスト口座等）。うち2件は
「並行作業スナップショット（作業中）」という commit メッセージで、テスト3件が未解決のまま
途中状態を退避した記録だった。本人に確認し、**Mac miniは今動いていない**ことを確認してから進めた。

- 安全のため退避ブランチを作成（`--no-commit`の試験マージで衝突範囲を先に把握してから本番実施）。
- **衝突12件を1件ずつ中身を読んで解決**（自動解決に丸投げしていない）:
  `.gitignore` / `worker.js` / `stage-sketch.js`(11箇所) / `stage-session.js` / `stage-i18n.js` /
  `stage-first-person.js`(2箇所) / `stage-sw.js`(2箇所) / `index.html`(4箇所) /
  `tools/check-object-on-performer.mjs` / テスト3件。
- `worker.js`・`stage-session.js`はリモート側が**今回の修正より前のコード**だったため
  こちら側を採用。音楽MVP・アバター段階0関連はリモートに対応がない純粋加算だったため採用。
  **マージ後の`stage-sketch.js`はHEAD単体と全文0行差を確認**＝リモート固有の内容は
  すべて衝突箇所に含まれていたと裏取り済み。
- `stage.html`は手動解決せず、`index.html`確定後に`python3 build_stage.py`で再生成した。
- `roster-crew.js`等、両側の内容が完全一致していたファイルは実質衝突なし
  （iCloud同期で同一の作業ファイルが別々のgit履歴に記録されていたと判断。過去にも同種の事例がある
  → メモリ `project-shosai-git-icloud-divergence`）。
- マージコミット後、Node 447件・MCPサーバー39件・Macセルフテスト24件、全通過を確認してpush。
- 退避ブランチは、pushしてHEAD==origin/mainを確認したあとに削除済み（マージコミットの親として
  履歴には残っているので内容は失われていない）。

### 3. 除外した4ファイルの診断（今回のcommitには未反映）

以下4ファイルは、今回の一連のcommit（P0/P1修正・マージ）から意図的に除外し、
作業ツリーに未commitのまま残してある。

#### `build_db.py` / `db.js`（DBジャンル分類）

- 内容: `build_db.py`に6行追加。`physical_comedy`キーワードを「コント・お笑い」へ、
  `self_help_cabaret`を「バラエティ・キャバレー」へ確実分類するガードを追加。
  `db.js`はその結果として再生成された自動生成物（1行のJSON全体）。
- 舞台スケッチの作業とは無関係（別のDB収録作業由来と思われる）。
- **診断結果: 小さく自己完結しており、commitして問題ない。**

#### `build_stage_shows_local.py` / `tests/stage-local-shows.test.mjs`（「身に覚えのない」変更）

- 2026-08-21未明にClaudeが「身に覚えのない未commit変更」として検出し、以来ずっと
  「本人確認待ち」のまま触らずにいたもの。
- **今回診断した結果、実は身に覚えがない変更ではないと判明した**:
  手書き`SOURCES`リストから、フォルダを自動走査する`SCAN_GLOBS`方式への書き換え。
  容量逼迫（16件で6.08MB到達）を踏まえた`BUNDLE_IDS`による同梱選別、重複ID検出、
  除外リスト、目録（`SHOWS_INVENTORY.md`）自動生成を追加している。
- **この未commitスクリプトを実際に実行し、生成される`SHOWS_INVENTORY.md`が、
  既にpush済みの`SHOWS_INVENTORY.md`と完全一致することを確認した。**
  つまり今のリポジトリは「生成物（`SHOWS_INVENTORY.md`）だけが既にcommit・push済みで、
  その生成元スクリプト自体が未commit」という不整合状態にある。
- 構文チェック・対応テスト（`tests/stage-local-shows.test.mjs`）9件も全通過。
- **診断結果: 実質的には以前の作業のcommit忘れ。内容に問題はない。commitして問題ない。**

**この2組について、本人へ「commitしてよいか」を提示したところで外出となり、
まだ返答をもらっていない。次に本人と話すときはここから再開する。**

提案していた進め方（本人未承認）:
- commit A: DBジャンル分類の追加（`build_db.py`/`db.js`）
- commit B: ショー一覧生成をSCAN_GLOBS方式へ書き換え（`build_stage_shows_local.py`/`tests/stage-local-shows.test.mjs`）

## 残っている作業（未着手）

- **P1の残り7項目**（`docs/STAGE_SKETCH_RELEASE_REVIEW_2026-08-22.md`のP1セクション参照）:
  `stage-shows.local.js`の配信仕様が環境ごとに異なる／iPadの機能到達性／スマホの保護操作が隠れる／
  importが確認前に会場ライブラリを書き換える／等。
- **実機QA全般**（未実施）: 物理iPad/iPhoneのSafari、ホーム画面PWA起動、Split View、
  オフライン初回起動、長時間再生・画面ロック、Wrangler bundle dry-run、公開URLでのremote確認。
  レビューの推奨順序では、これが終わるまで**本番リリース不可**。
- **`mac-app/Sources/AppConfiguration.swift:36-38`の旧ユーザー名問題**（別起票・未修正）:
  `defaultWebRootPath`/`defaultAgentCommand`が`/Users/arata/...`を指しており、このMac
  （`/Users/arataurawa/`）では`UserDefaults`で上書きしない限り既定値で動かない。
  「動かないから安全」ではなく単なる設定ミスなので、直す前提で扱うこと。

## 引き継ぐ人が最初に読むべきファイル

- `docs/STAGE_SKETCH_RELEASE_REVIEW_2026-08-22.md` — 元になったリリース前レビュー全文
- `docs/MAC_BRIDGE_P0_4_DESIGN_2026-08-22.md` — P0-4の設計判断の根拠
- `docs/RELEASE_P0_DATALOSS_WORKORDER_2026-08-22.md` / `SHELF_CORRUPT_GUARD_WORKORDER_2026-08-22.md` /
  `SHELF_BROKEN_EXPORT_WORKORDER_2026-08-22.md` / `MAC_BRIDGE_ORIGIN_WORKORDER_2026-08-22.md` /
  `MAC_BRIDGE_REVISION_WORKORDER_2026-08-22.md` — 各修正の発注内容（実装済み）
- `PROJECT_NOTES.md`（`show-creative-ideas/`直下）— 今日の一連の作業ログの正式な記録先。
  本ファイルより詳しい経緯と判断根拠がすべてそこにある。

## このMacで再現・検証するコマンド

```bash
cd "shosai-app"
node --test tests/*.test.mjs                 # 447件全通過するはず
(cd mcp-server && npm test -- --test-reporter=spec)  # 39件全通過するはず
python3 build_stage.py --check                # stage.htmlとindex.htmlの整合確認
bash mac-app/build.sh                         # 約4分かかる。失敗ではない
ROOT="$(pwd)"
"mac-app/build/制作の書斎.app/Contents/MacOS/ShosaiDesk" --self-test \
  -WebRootPath "$ROOT" -AgentCommand "$(command -v codex)"   # 24件全通過するはず
```
