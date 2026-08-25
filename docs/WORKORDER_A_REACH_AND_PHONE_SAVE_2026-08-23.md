# 発注書A: iPad入口の補完・スマホ保存の手当て・機能一覧UI（2026-08-23）

発注元: Claude（仕様確定担当）。実装: Codex。検証: Claude。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 前提（これを踏まえないと判断を誤る）

このリポジトリには**二つの別製品**がある。

- **舞台スケッチ**（`stage.html` 単独版）＝ 将来の**汎用リリースアプリ。配る。**
  ブラウザ／タブレット（ホーム画面へ追加したPWA）／スマホの3版。
- **書斎**（`index.html`）＝ 資料棚・名簿・制作机。**限定的な身内用途。配らない。**

**`index.html` が正本、`stage.html` は生成物。** `index.html` を触ったら
`python3 build_stage.py` で作り直す必要があるが、**その実行と版上げ（`?v=` と
`stage-sw.js` の `CACHE_NAME`）は発注元がやる。Codexは触らないこと。**

端末の判定は画面幅ではなく次の3つで決まる（`stage-sketch.js:928-946`）。

- `tabletPwaActive` … `stage.html` をホーム画面PWAで起動、短辺600px以上
- `phoneViewerActive` … `stage.html` を短辺600px以下のタッチ端末で開いた（閲覧機モード）
- どちらでもない … 通常のブラウザ表示

## 共通の制約（必ず守る）

- **既存ファイルは編集前に必ず読み直す。** 他のエージェントや別PCが同じファイルを触っている前提。
- **ファイルの削除・移動はしない。**
- **版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行はしない。** 発注元がやる。
- `stage.html` を直接編集しない（生成物のため）。
- 既存の Node テストを壊さない。完了時に `node --test tests/` が全通過すること。
- 日本語UI文字列を追加したら、`stage-i18n.js` の英語対応が必要か確認する
  （`tests/stage-i18n-coverage.test.mjs` が拾う可能性がある）。

---

## 課題1: iPad PWAに「舞台機構」と「3Dカメラ」の入口を足す 〜〜**取り下げ・実装しない**〜〜

> **★2026-08-25 本人確定: 実装しない。以下は実施せず、記録として残す。**
>
> **判断が三度動いた項目なので、経緯を残す。同じ調査と同じ提案を繰り返さないため。**
>
> 1. **現状維持**（08-23）… 「iPadは現場での確認機、機構編集はPCで」という役割分担として
> 2. **入口を足す**（08-23）… 「舞台スケッチは汎用リリースアプリ」という前提が示され、
>    「外部の利用者はPC前提を共有していない」という理由で覆った
> 3. **実装しない**（08-25・確定）… iPad実機QAで本人が実際に触り、**「問題ない」**と判断
>
> **2と3は矛盾していない。** 2は「配る製品としての建前」、3は「実際に使った感触」。
> 実機で触った3のほうが強い根拠として採用された。
>
> **今後この2件を「欠落」として再提起しないこと。** 機能表でも タブレット列は `—` のまま。

### 背景（当時の分析。実装はしない）

iPad PWA専用メニューは 2026-08-06 に作られ、当時の機能で固定された。
その後 2026-08-20 に追加された「舞台機構」と「3Dカメラ」がメニューへ登録されておらず、
**iPad PWAからは到達する手段が無い。** 舞台スケッチは配る製品なので、
「うちはPCでやる」という前提を利用者と共有できない。よって入口を足す。

### 1-A. 舞台機構パネルをiPadメニューへ登録

**対象**: `stage-sketch.js` の `TABLET_MENU_GROUPS`（10796行付近）

現在:
```js
{ id: "cast", icon: "●", label: "出演・装置", panels: ["cast", "rigs"] },
```
これを次にする（`machinery` を追加）:
```js
{ id: "cast", icon: "●", label: "出演・装置", panels: ["cast", "rigs", "machinery"] },
```

- 新しいグループは作らない。左レールは既に7ボタンあり、これ以上増やすと窮屈になるため。
- ラベル「出演・装置」は舞台機構も含意するので変更しない。
- パネル本体（`index.html` の `data-panel="machinery"`）は既存のものをそのまま使う。
  `prepareTabletPanelPages()` が自動でドロワーへ移すので、追加実装は不要なはず。
- **確認**: 登録後、iPad PWAプレビューで「出演・装置」を開き、ページ送り（前へ／次へ）で
  舞台機構のページへ到達できること。

### 1-B. 3Dカメラボタンをタブレット上部へ退避させる

**対象**: `stage-sketch.js` の `setupTabletWorkspace()`（10979行付近）

`#stage-freecam-open` は `.stage-center-bar` の中にあるが、
`style.css:10413` の `html.stage-pwa-tablet .stage-center-bar { display: none; }` で
親ごと消えるため、iPad PWAでは押せない。

現在、上部へ退避しているのは次の2つだけ:
```js
const topControls = document.createElement("div");
topControls.className = "stage-tablet-top-controls";
if (toolGrid) topControls.append(toolGrid);
if (historyActions) topControls.append(historyActions);
header.append(topControls);
```

ここに 3Dカメラボタンも加える。取得は `centerBar` から行うこと（`document` 全体からではなく、
既存コードが `centerBar.querySelector(...)` を使っている流儀に合わせる）:

```js
const freecamOpen = centerBar && centerBar.querySelector("#stage-freecam-open");
```
そして `toolGrid` の後、`historyActions` の前に `topControls.append(freecamOpen)` する
（道具の並びの直後に置き、書き出し等の操作より前にする）。

- **`appendChild` はノードを移動するだけなので、既存のクリックリスナーは維持される。**
  リスナーを付け直さないこと（二重登録になる）。
- `freecamOpen` が見つからない場合は何もしない（`if` で守る）。
- 見た目は `.stage-tablet-top-controls button` の既存指定が効くので、
  **新しいCSSは原則不要。** 実機幅で確認し、明らかに崩れる場合のみ最小限の追加に留める。

---

## 課題2: スマホで保存の失敗が無言で進む問題を塞ぐ

### 背景（なぜ直すか）

スマホ閲覧機モードでも**メモは編集でき、`persistSoon()` が端末内へ保存する**
（書き換えられるのはメモだけ。駒・明かり・背景・矢印は `stage-sketch.js:17933` で塞いである）。
しかし保存の状態・警告の書き込み先である `#stage-save-status` は
`index.html:1148`＝「保存」パネルの中にあり、閲覧機モードのCSS（`style.css:10625`付近）で
隠れている。**そのため容量不足や棚の破損が起きても画面には何も出ず、無言で失敗する。**
さらにスマホのツールバーには読み込みはあるが**書き出しが無く、控えを取り出せない。**

方針: **端末内保存はこのまま続ける。** 直すのは「失敗を知らせること」と「逃がす道を用意すること」。

### 2-A. 保存状態の書き込みを一本化する

**対象**: `stage-sketch.js`

現在 `els.saveStatus.textContent = ...` へ直接代入している箇所が4つある
（**編集前に実際の行を読んで確認すること。行番号はずれている可能性がある**）:
`5356` / `5362` / `5373` / `20401` 付近。

これを次の関数経由へ置き換える。関数は `persistSoon()` の直前あたりに置く。

```js
/* 保存の状態は、机の「保存」パネルとスマホの閲覧機の両方へ届ける必要がある。
   閲覧機ではパネルごと隠れているため、直接代入すると警告が誰にも見えない。 */
function setSaveStatus(text, options) {
  const level = (options && options.level) || "info";   // "info" | "warn"
  if (els.saveStatus) els.saveStatus.textContent = text;
  syncPhoneSaveNotice(text, level);
}
```

置き換えるとき、**どれが警告でどれが通常かを取り違えないこと**:

| 箇所 | 内容 | level |
|---|---|---|
| 5356付近 | 「変更を保存しています…」 | `info` |
| 5362付近 | `shelfCorrupt` の分岐（棚が壊れている） | `warn` |
| 5362付近 | `shelfFailed` の分岐（棚が容量不足） | `warn` |
| 5362付近 | 上記以外（「〜を保存しました」） | `info` |
| 5373付近 | catch節（この端末へ保存できませんでした） | `warn` |
| 20401付近 | 既存の用途を読んで判断する。不明なら `info` | — |

`shelfCorrupt` / `shelfFailed` / catch は三項演算子でまとまっているので、
**文言を組み立ててから level を決めて1回呼ぶ**形に整理してよい。文言自体は変えないこと。

### 2-B. スマホに警告帯と書き出しボタンを足す

**対象**: `stage-sketch.js` の `setupPhoneViewer()`（10618行付近）と `style.css`

**設計意図（変えないこと）**: 普段は何も出さない。失敗したときだけ、見逃せない形で出す。
そして**警告のすぐ隣に逃がす道（書き出し）を置く。** 気づいても取り出せないのでは意味がないため。

#### (1) 書き出しボタン

`phoneUi` のツールバーには既に読み込み（`load` → `sourcePanel` 内の `fileButton`）がある。
**その対になる位置**に書き出しを足す。`sourcePanel` の中、`fileButton` の隣が自然。

- ラベル: `ファイルへ書き出す`
- クリックで既存の `exportProject()` を呼ぶ（新しい書き出し処理を作らないこと）。
- 押したら `phoneUi.sourceOpen = false; syncPhoneViewer();` でパネルを閉じる。
- `exportProject()` は会場データが internal-only のときモーダルを開くが、
  そのモーダルは `stage.html` にも存在し閲覧機CSSでも隠れないので**そのままで動く**。

#### (2) 警告帯

`phoneUi` に新しい要素を1つ足す。`board.prepend()` する既存の並び
（`sourcePanel` → `infoPanel` → `musicBar` → `toolbar`）に対し、
**`toolbar` より後に prepend して最上段へ出す**（＝ `board.prepend(saveNotice)` を最後に呼ぶ）。

構造:
```
<div class="stage-phone-save-notice" hidden role="status" aria-live="polite">
  <p class="stage-phone-save-notice-text"></p>
  <div class="stage-phone-save-notice-actions">
    <button type="button">ファイルへ書き出す</button>
    <button type="button" aria-label="この知らせを閉じる">閉じる</button>
  </div>
</div>
```

- 「ファイルへ書き出す」は `exportProject()` を呼ぶ。
- 「閉じる」は帯を `hidden = true` にするだけ（状態は消さない。次に警告が出れば再び出す）。
- `phoneUi` オブジェクトへ `saveNotice`, `saveNoticeText` を持たせる。

#### (3) `syncPhoneSaveNotice(text, level)` を実装する

```js
function syncPhoneSaveNotice(text, level) {
  if (!phoneUi || !phoneUi.saveNotice) return;
  if (level !== "warn") return;              // 通常の保存では何も出さない
  phoneUi.saveNoticeText.textContent = text;
  phoneUi.saveNotice.hidden = false;
}
```

- **`level === "info"` のときに帯を隠さないこと。** 「保存しています…」→「保存しました」と
  流れる過程で警告が上書きされて消えてしまうため。閉じるのは利用者の操作だけにする。
- `phoneUi` が未生成（＝スマホ以外）のときは何もしない。

#### (4) CSS

`style.css` の閲覧機モードの節（`html.stage-phone-viewer` が並ぶあたり）へ追加する。

- 暗い図の上に出るので、**紙の色（`--paper`）を地にし、`--rust` の枠で囲む。**
  机の配色の中で「紙が差し込まれた」ように見せる。
- 文字色は `--ink`。ボタンは既存の `.stage-phone-*` のボタン寸法に合わせ、
  **指で押せるよう最低44px** を確保する（この節の既存指定と揃える）。
- `position` は既存の board のグリッドに従う。**`position: fixed` を新規に使わないこと**
  （閲覧機は `100dvh` のグリッドで組んであり、fixed を足すと回転時に崩れる）。
- 縦横両方（`orientation: portrait` / `landscape`）で図を潰さないか確認する。

---

## 課題2.5: 音楽機能をPC（ブラウザ／アプリ）専用にする

### 背景（本人判断・2026-08-24）

**楽曲機能はPC版のみとする。** タブレット・スマホでは提供しない。

長時間再生・画面ロック・バックグラウンド復帰・Bluetooth出力切替といった
モバイル固有の failure mode を抱え込まないための線引き。
**「あるのに保証しない」状態が一番わかりにくい**ため、UIごと取り除く（本人が選択）。

### やること

`stage-sketch.js` から、**タブレット専用UIとスマホ閲覧機の音楽UIだけ**を取り除く。
**PC（通常のブラウザ表示）の音楽機能には一切触れないこと。**

**★これは削除を伴う作業。既存の動作を壊しやすいので、下記を厳守すること。**

#### 2.5-A. タブレット専用UI（`tabletPwaActive` 側）

- `TABLET_MENU_GROUPS`（10796行付近）から `{ id: "music", ... }` の行を削除
- `setupTabletWorkspace()` のシーンバーから `musicToggle` と `musicOpen` の
  生成・`append`・イベント登録を削除（11048行付近）
- `tabletUi` オブジェクトから `musicToggle` / `musicOpen` を削除
- 音声状態の同期（3957〜3965行付近）の `if (tabletUi && tabletUi.musicToggle) { ... }`
  ブロックを削除

#### 2.5-B. スマホ閲覧機（`phoneViewerActive` 側）

- `setupPhoneViewer()` から `musicBar` / `musicToggle` / `musicTitle` / `musicTime` /
  `musicFileInput` の生成・`append`・`prepend`・イベント登録を削除（10649行付近〜）
- `phoneUi` オブジェクトから上記5つを削除
- 音声状態の同期（3931行、3967〜3976行付近）の `phoneUi` を参照する部分を削除

#### 2.5-C. 触ってはいけないもの（PC側。壊すと楽曲MVPが死ぬ）

- `els.musicToggle` / `els.musicTime`（2239・2243行）＝ **PC用のDOM参照。残す**
- 3946〜3955行の `if (els.musicToggle) { ... }` ＝ **PC用の同期。残す**
- 4453行の `els.musicToggle.addEventListener` ＝ **PC用。残す**
- `index.html` の `data-panel="music"` パネル本体 ＝ **残す**（PCで使う）
- `stage-audio-store.js`、音源の保存・読み込み・割り当ての処理 ＝ **すべて残す**
- 単独版でPCブラウザから開いた場合（`tabletPwaActive` も `phoneViewerActive` も false）
  ＝ **従来どおり音楽が使えること**

#### 2.5-D. CSS

`style.css` の `.stage-phone-music-*` と `.stage-tablet-music-*` の指定は、
参照が消えるので削除してよい。**ただし `.stage-music-panel` など
PC側で使っているものは残すこと。** 消す前に必ず `grep` で参照を確認する。

### 完了条件（課題2.5）

- PCのブラウザで `index.html` と `stage.html` を開き、**音楽の割り当てと再生が従来どおり動く**
- `?tablet-pwa-preview` で開き、レールに「♪音楽」が無く、シーンバーに再生ボタンが無い
- `?phone-viewer-preview` で開き、音楽バーが出ない
- コンソールエラー0件（消し忘れた参照が `undefined` を触っていないこと）
- `node --test tests/` 全通過。音楽関連のテストが落ちる場合は、
  **テストが何を守っていたのかを報告すること**（勝手に消さない）

---

## 課題3: 機能一覧「どこで何ができるか」を設定から見られるようにする

### 背景

利用者（と本人）が「この端末で何ができるか」を事前に把握できるようにする。
**第一案のHTML・CSSは `docs/feature-matrix-preview.html` に完成済み。**
デスクトップ880px・スマホ375pxの両方で表示確認済み。**このデザインを変えないこと。**

### 3-A. 置き場所

`index.html` の「保存」パネル（`data-panel="save"`、1145行付近）の中、
`stage-session-panel` の `<details>` の**後ろ**に、同じ `<details>` の作法で置く。

```html
<details class="stage-reach-panel" id="stage-reach-panel">
  <summary>どこで何ができるか</summary>
  <div class="stage-reach-body">
    <!-- docs/feature-matrix-preview.html の <div class="reach-sheet"> の中身を移植 -->
  </div>
</details>
```

- 保存パネルはiPad PWAでは「保存・設定」グループに入るので、**設定から見られる**要件を満たす。
- 既定は閉じた状態（`open` を付けない）。保存の導線を押し下げないため。

### 3-B. 移植のしかた

- `docs/feature-matrix-preview.html` の `<style>` の中身を `style.css` の末尾へ移す。
  **ただし `:root` の変数定義と `body` の指定は移さない**（本体に既にあるため衝突する）。
  セレクタは `.reach-sheet` 配下に閉じているのでそのまま使えるが、
  念のため `.stage-reach-body` を前置してスコープを狭めてよい。
- HTMLは `<div class="reach-sheet">` の中身をそのまま `.stage-reach-body` の中へ入れる。
- **表の内容（●○—の値）を勝手に変えないこと。** 事実確認済みの値である。

### 3-C. 書斎ブロックは配布版で隠す

**配る製品（`stage.html`）の利用者に、持っていない書斎機能の一覧を見せない。**

`stage-sketch.js` には既に `standaloneStagePage`（`.topnav` の有無で判定、938行付近）がある。
これを使い、初期化時に次を行う:

```js
// 書斎の一覧は、書斎の中でだけ見せる。単独配布版では持っていない機能の表になるため。
if (standaloneStagePage) {
  const inhouse = document.querySelector(".stage-reach-body .block-inhouse");
  if (inhouse) inhouse.hidden = true;
}
```

- 併せて、冒頭の導入文（「ここには二つの道具があります…」）は
  **書斎ブロックが隠れると意味が通らなくなる。**
  導入文を2つ用意し、単独版では舞台スケッチだけを説明する文へ差し替えること。
  - 書斎の中: 既存の文（二つの道具の説明）
  - 単独版: `舞台を組み、光を置き、シーンを並べるための道具です。机で組み立て、稽古場へ持ち出し、現場では手元で確かめる——左から右へ、つくるが机に残り、確かめるが手元へ移ります。`
  - 実装は、両方をHTMLに置いて `hidden` で出し分けるのが簡単。

### 3-D. 課題2が終わったら表を更新する

課題2でスマホに保存警告と書き出しが付くので、機能表の該当セルを変える。
**課題2の実装が完了し、動作を確認してから変えること。**

| 行 | 列 | 変更 |
|---|---|---|
| 保存の警告が目に入る | スマホ | `—`（`m-none`）→ `●`（`m-full`） |
| ファイルへ書き出す | スマホ | `—`（`m-none`）→ `●`（`m-full`） |

**★変えてはいけないセル（確定済み。実装しないので `—` のまま）**:

| 行 | 列 | 理由 |
|---|---|---|
| 舞台機構 | タブレット | 課題1を取り下げたため（本人確定・2026-08-25） |
| 3Dカメラ・この人の視界 | タブレット | 同上 |
| 曲を割り当てる | タブレット・スマホ | 楽曲はPC版のみ（課題2.5で取り除く） |
| 曲を再生する | タブレット・スマホ | 同上 |

`docs/feature-matrix-preview.html` 側も同じように更新して、両者を一致させること。
（楽曲の4セルは2026-08-24に更新済み。）

---

## 完了条件（すべて満たすこと）

1. `node --test tests/` が全通過する（現状447件。減っていないこと）。
2. `python3 build_stage.py --check` を実行し、**「作り直しが要る」と出ること**
   （＝ `index.html` を変更したので当然そうなる。**Codexは作り直しを実行しない**）。
3. ブラウザで `index.html` を開き、コンソールエラー0件。
4. `index.html` に `?tablet-pwa-preview` を付けてlocalhostで開き（iPad PWA相当）、
   - 「出演・装置」から舞台機構のページへ到達できる
   - 3Dカメラボタンが上部に見え、押すと3Dカメラが開く
5. `stage.html` に `?phone-viewer-preview` を付けてlocalhostで開き（スマホ相当）、
   - 読み込みパネルに「ファイルへ書き出す」があり、押すとJSONが落ちてくる
   - 警告帯は通常時に出ていない
6. 「保存」パネルに「どこで何ができるか」が畳まれた状態であり、開くと表が出る。
   狭い幅（375px）でも4列／3列／2列が崩れずに並ぶ。

## 報告に含めること

- 変更したファイルの一覧と、各ファイルで何をしたか。
- 上の完了条件それぞれの実行結果（コマンドの出力を貼る）。
- 仕様に書かれておらず自分で判断した点があれば、必ず明記する。
- **できなかったこと・不確かなことを隠さない。** 発注元が検証するので、
  「できました」だけの報告は受け取れない。
