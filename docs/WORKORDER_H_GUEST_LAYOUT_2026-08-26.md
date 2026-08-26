# 発注書H: ゲスト画面に「出るもの」一覧を戻し、パネルを左へ集約して図を大きくする

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-26。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 背景

発注書G-3でゲスト画面から11パネルを隠した結果、実機（Safari）で本人が確認し、次の2点を指示した。

1. **「出るもの」は見せたい。** ゲストが「誰が・何が出ているか」を見られるようにする。
2. **パネルの総量が減ったので、残りを全部左列へまとめ、舞台の図を大きく見せたい。**

**重要な制約**: 発注書E-3で「ゲストの操作はポインタと矢印のみ／駒移動は送受信の両側で遮断」が
本人確定済み。**この方針は変えない。** よって「出るもの」は**一覧の閲覧のみ**を戻し、
編集操作は出さない（本人が2026-08-26に「一覧だけ見せる」を選択）。

## 現状の構造（Claudeが確認済み。再調査不要）

- 3列グリッド `.stage-sketch-grid`（`style.css:1703`付近）:
  `grid-template-columns: 268px minmax(420px, 1fr) 268px;`
  `grid-template-areas: "tools board inspector";`
- 左列 `#stage-col-left`(`.stage-toolbox`, grid-area: tools): ショー/音楽/**出るもの**/舞台機構/セット登録/照明/背景
- 中央 `#stage-col-center`(`.stage-board-column`, grid-area: board): 舞台面（正面・平面のcanvas）＋シーン
- 右列 `#stage-col-right`(`.stage-inspector`, grid-area: inspector): 選んだもの/保存/AI指示
- **ゲストで唯一残る右列の中身は `#stage-session-panel`**（`<details>`。`index.html:1160`。
  保存パネルの `.stage-panel-body` 直下にある）。G-3のCSSが、保存パネルのうち
  この要素だけを残している（`style.css:11843-11844`）。
- ゲント判定クラス `body.stage-session-guest` は `stage-session.js:627` と `:832` の2箇所で付く。
  **外す経路は存在しない**（ゲストはページを閉じる／再読み込みで抜ける）。
- 「出るもの」の各行 `.stage-cast-row` の構成（`stage-sketch.js:11592` renderCast ほか、
  セット一覧・小道具一覧も同じクラスを使う）:
  `.stage-kind-swatch`（色。中に `input.stage-kind-input`）/ `.stage-cast-name`（名前ボタン）/
  `.stage-cast-status`（舞台上・舞台裏の切替ボタン）/ `.stage-cast-lock`（錠）/
  `.stage-cast-profile`（…）/ `.stage-cast-remove`（✕）
- パネル上部: `.stage-cast-hint`（説明文）/ `.stage-cast-add.stage-roster-add`（追加フォーム）/
  `#stage-model-open`（セットを組む）

## H-1. ゲストに「出るもの」パネルを戻す（一覧のみ）

`style.css` のG-3ルール（`body.stage-session-guest` 群、11828行付近）から
`.stage-panel[data-panel="cast"]` の行を**取り除く**。そのうえで、パネル内の編集操作を隠す。

**`body.stage-session-guest` 配下で display:none にするもの**:

- `.stage-cast-hint`（「まとめてここに登録します」はゲストには事実と違う）
- `.stage-cast-add`（名前入力・種類・追加ボタン一式）
- `#stage-model-open`（セットを組む）
- `.stage-cast-lock` / `.stage-cast-profile` / `.stage-cast-remove`

**見えたまま、押せなくするもの**（情報としては要る）:

- `.stage-kind-swatch`: 色と記号は見える。`.stage-kind-input` を `pointer-events: none`
  にし、`.stage-kind-swatch` の `cursor` を既定へ戻す
- `.stage-cast-name`: 名前は読める。`pointer-events: none`、ボタンらしい見た目
  （下線・hover・cursor:pointer）を消して**ただの文字**に見せる
- `.stage-cast-status`（舞台上／舞台裏）: 文字は残す。`pointer-events: none` にし、
  ボタンの縁・hoverを消して**状態ラベル**に見せる。`.is-on`/`.is-off` の色分けは残す

見出し（`.stage-roster-head` の「演者」「舞台セット」「小道具」）と空表示は残す。

**押せなくするのは見た目だけでなく実効も伴わせること**: `pointer-events: none` だけだと
キーボードのTabで到達してEnterで押せてしまう。上記3種はゲスト時に
`tabindex="-1"` と `disabled`（button要素のもの）を付けるか、
または `body.stage-session-guest` 時にクリックハンドラを素通りさせる。
**どちらでもよいが、キーボードからも発火しないことをテストで示すこと。**

## H-2. 残ったパネルを左列へ集約し、中央を広げる

ゲスト時の目標レイアウト（**2列**）:

```
┌──────────┬────────────────────────────────┐
│ セッション   │                                │
│（接続状態・   │      舞台面（正面・平面）         │
│ 最新を取り直す）│      ＋ シーン一覧（閲覧）        │
├──────────┤                                │
│ 出るもの     │                                │
│（一覧のみ）   │                                │
└──────────┴────────────────────────────────┘
```

1. **`#stage-session-panel` を左列へ移す。** `stage-session.js` に移動処理を足す。
   - ゲストになった時（`stage-session.js:627` と `:832` の両方。共通関数にすること）、
     `#stage-session-panel` を `#stage-col-left` の**先頭の子**として挿入する。
   - 移す前に**元の親と元の次兄弟を保持**し、`restoreSessionPanelHome()` で戻せるようにする
     （実行時に退出経路は無いが、テストで往復を確認するために必要）。
   - `<details>` は**開いた状態**で移すこと（ゲストは接続状態を常に見たい）。
   - **保存パネル自体はG-3どおり非表示のまま。** セッション欄が抜けても壊れないこと。
2. **右列を消し、グリッドを2列にする。** `style.css` に追加:
   - `body.stage-session-guest .stage-inspector { display: none; }`
   - `body.stage-session-guest .stage-sketch-grid {
        grid-template-columns: 268px minmax(420px, 1fr);
        grid-template-areas: "tools board";
      }`
   - これで中央が **268px + gap 18px = 286px** 広がる。
3. 移設後のセッション欄は左列で浮かないよう、**既存の左列パネルと同じ余白・枠**に見えるように
   整える（新しい装飾を発明しない。`.stage-panel` 系の既存の見た目に合わせる）。

## 触ってはいけないもの

- `session-room.js` / `worker.js` / `wrangler.toml` / `mac-app/` 配下（ゼロ変更）
- **ホスト側・非セッション時の見た目**（3列のまま。`body.stage-session-guest` が付いた時だけ変わること）
- E-3の権限制御（ポインタ＋矢印のみ／駒移動の送受信遮断）。**弱めない**
- G-3で隠した他10パネル（ショー・音楽・舞台機構・セット登録・照明・背景・選んだもの・
  保存・AI指示・プレゼンボタン）は隠したまま
- **タブレット/PWA用レイアウト**（`.stage-tablet-panel-page`・`TABLET_MENU_GROUPS` 系）は今回の対象外。
  ただし**壊さないこと**。既存のタブレット向けテストが通ること
- `stage.html`（生成物。`index.html` を触ったら報告する）

## 共通の制約（必ず守る）

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- **版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行はしない。** 発注元がやる。
- 日本語UI文字列を足したら **`stage-i18n.js` へ英訳も登録する**。
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。

## 完了条件

1. `node --test tests/` 全通過（現状547件。減らさない）。
2. 回帰テストを追加。最低限:
   - ゲスト時に「出るもの」パネルが**表示される**（G-3の非表示リストから外れている）
   - ゲスト時に 追加フォーム・セットを組む・錠・プロフィール・✕ が**隠れる**
   - 名前・舞台上/舞台裏・色スウォッチは**見えるが、クリックでもキーボードでも発火しない**
   - `#stage-session-panel` がゲスト時に `#stage-col-left` の先頭へ移り、
     `restoreSessionPanelHome()` で元の親・元の位置へ**正確に戻る**
   - ゲスト時に右列が消え、グリッドが2列（`"tools board"`）になる／
     クラスが無いときは3列のまま
3. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が実機検証する）。

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- H-1の「押せなくする」をどの方式で実装したか（pointer-events / disabled / ハンドラ側）
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。**
