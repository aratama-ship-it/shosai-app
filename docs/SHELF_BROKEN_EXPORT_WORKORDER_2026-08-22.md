# 舞台スケッチ P1-9 追補: 壊れた棚をファイルへ書き出してから消す 発注書

- 起票日: 2026-08-22
- 起票: Claude（仕様確定）／実装: Codex／検証: Claude
- 先行作業: `docs/SHELF_CORRUPT_GUARD_WORKORDER_2026-08-22.md`（P1-9本体）が**完了している前提**
- 本人判断: 2026-08-22 に「案2（作り直しに書き出しを組み込む）」で取得済み

この発注書は単体で読めるように書いている。

## なぜ追補が要るのか（P1-9本体で残った穴2つ）

Claudeが実装後に検証して見つけた、**発注書側の設計不備**である。Codexの実装ミスではない。

### 穴1: 退避した壊れデータを消す経路が1つもない

`shosai-stage-shows-broken-v1` は書き込まれるだけで、どこからも削除されない。
`STAGE_KEYS`（`?fresh` が消す5キー）にも入っていない。UIにも削除手段がない。
一度壊れると、棚まるごとのコピー（数MBになりうる）が**永久にlocalStorageに居座る**。
`build_stage_shows_local.py` のコメントに「16件で6.08MB到達」という実測があり、
5MB上限に対して既に逼迫している。**この居残りが、P0-3で守ろうとしている容量超過そのものを誘発しうる。**

### 穴2: 2回目の破損で「退避済み」の表示が嘘になる

`markShelfCorrupt` は既存の退避キーがあれば上書きしない（1回目が一番価値がある、という指定）。
`rebuildShelf` 後に**再び**壊れると `shelfBrokenSaved = true` になるが、
中身は**前回の破損時のコピー**である。UIは「壊れた元データは端末内に別途取ってあります」と出すが、
それは今回の壊れデータではない。

## 設計の見直し（ここが今回の肝）

**退避コピーは、実はほぼ冗長になっていた。**

P1-9本体で `writeShows()` が `shelfCorrupt` のとき全書き込みを止めるようにしたので、
**壊れた原文は `SHOWS_KEY` にそのまま安全に残っている。**
それを破壊するのは `rebuildShelf`（利用者が明示的に押す）だけである。

したがって、守るべき一点は「**作り直す前に、壊れた原文をファイルへ逃がす**」であり、
そこを押さえれば穴1と穴2が同時に塞がる。
localStorage内の退避コピーは、別タブの旧版コードなど手の届かない経路への
**保険（多重防御）として黙って持つだけ**にし、**利用者向けの文言からは外す**。

## やること

### 1. 退避状態を利用者向けの文言から外す

`shelfBrokenSaved` を**UIの文言分岐に使うのをやめる**。
（変数自体は残してよいが、`renderShows` の警告文と `rebuildShelf` の確認文からは外す。
使わなくなるなら削除してよい。どちらにしたか報告すること。）

理由: 「端末内に取ってある／取れていない」は、作り直し時に必ずファイルへ書き出す設計にした以上、
利用者が判断に使う情報ではなくなった。しかも穴2のとおり**嘘になりうる**。

### 2. `renderShows` の警告文を1本化する

`renderShows()` 内の `if (shelfCorrupt) { ... }` ブロック（12703行目付近）の
`detail.textContent` を、`shelfBrokenSaved` による出し分けをやめて次の1本にする。

- 日本語: `勝手に他のショーを消さないため、壊れた一覧には書き込みません。「ショー一覧を作り直す」を押すと、壊れた元データをファイルへ書き出してから消します。先に、開いているショーもファイルへ書き出しておくと安全です。`
- 英語: `To avoid deleting your other shows, nothing is written to the damaged shelf. “Rebuild show shelf” exports the damaged data to a file before removing it. Exporting the show you have open is a good idea first.`

`title`（見出し）とDOM構造・クラス（`stage-show-row is-current` / `stage-show-open` /
`stage-show-title` / `stage-show-meta` / `stage-minor-action`）は**現状のまま変えない**。
`role="alert"` も維持する。ボタンは増やさない（作り直し1つのまま）。

### 3. `rebuildShelf` を「書き出してから消す」に作り替える

現在の `rebuildShelf()`（12686行目付近）を次の流れにする。

```js
  function rebuildShelf() {
    /* 壊れた原文は SHOWS_KEY にそのまま残っている（壊れている間は書き込みを止めているため）。
       ここが唯一それを消す場所なので、消す前に必ずファイルへ逃がす。 */
    let payload = null;
    try { payload = localStorage.getItem(SHOWS_KEY); } catch (_) { payload = null; }
    if (payload === null || payload === "") {
      // SHOWS_KEY が読めない・空なら、保険で取ってある退避コピーを使う。
      try { payload = localStorage.getItem(SHOWS_BROKEN_KEY); } catch (_) { payload = null; }
    }

    let ask;
    if (payload !== null && payload !== "") {
      downloadBlob(
        new Blob([payload], { type: "application/json" }),
        `舞台スケッチ-壊れたショー一覧-${stampNow()}.json`,
      );
      ask = isEn()
        ? "The damaged show shelf was sent to your downloads. Did the file save correctly? Choose OK to rebuild the shelf and remove the damaged data from this device. Choose Cancel to change nothing."
        : "壊れたショー一覧をファイルへ書き出しました。ダウンロードを確認できましたか？ OKを押すと一覧を作り直し、端末内の壊れたデータを消します。キャンセルすると何も変更しません。";
    } else {
      ask = isEn()
        ? "There is no damaged data left to export. Rebuild the show shelf? The show you have open now is preserved."
        : "書き出せる壊れたデータは残っていません。ショー一覧を作り直しますか？ いま開いているショーは残ります。";
    }
    if (!window.confirm(ask)) return;

    try { localStorage.removeItem(SHOWS_KEY); } catch (_) { /* 消せなくても続ける */ }
    try { localStorage.removeItem(SHOWS_BROKEN_KEY); } catch (_) { /* 同上 */ }
    shelfCorrupt = false;
    shelfBrokenSaved = false;          // 変数を残す場合のみ
    shelveCurrent();                   // いま開いているショーを起点に作り直す
    renderShows();
    announce(isEn() ? "Rebuilt the show shelf." : "ショー一覧を作り直しました。");
  }
```

**重要な設計上の注意（実装時に守ること）**

- **ブラウザのダウンロードは成否を確認できない。** `downloadBlob` は `a.click()` するだけで、
  利用者が実際に保存できたかはコードから分からない。だから
  **「書き出しました」ではなく「ダウンロードを確認できましたか？」と聞き、
  OKのときだけ消す。** ここを「書き出した→即消す」にしないこと。
- **キャンセルされたら1バイトも消さない。** `SHOWS_KEY` も `SHOWS_BROKEN_KEY` も残す。
- `SHOWS_BROKEN_KEY` も**一緒に消す**。これで退避枠が空き、次に壊れたときは
  今回の原文を正しく退避し直せる（穴2の解消）。容量も戻る（穴1の解消）。
- `downloadBlob` は 20914行目付近、`stampNow` も同じIIFE内にある関数宣言なので
  `rebuildShelf` から呼べる。**実際に同じスコープにあることを確認してから使うこと。**
- ファイル名は既存の書き出しに倣う（`${safe}-${version}.json` 等）。
  上記の `舞台スケッチ-壊れたショー一覧-${stampNow()}.json` でよいが、
  既存に日本語ファイル名の前例が無ければ既存の流儀に合わせて英数字にしてよい。
  **どちらにしたか報告すること。**

### 4. `?fresh` の消去対象に退避キーを足す

`STAGE_KEYS`（938行目付近）に `"shosai-stage-shows-broken-v1"` を足す。
`?fresh` は「初回とまったく同じ状態」を作る導線なので、退避コピーが残るのは筋が通らない。
P0-2でlocalhost限定＋確認ダイアログにしたので、誤爆の心配はない。

```js
  const STAGE_KEYS = [
    "shosai-stage-sketch-v1", "shosai-stage-shows-v1",
    "shosai-stage-tour-v1", "shosai-stage-lang", "shosai-stage-venues-v1",
    // ★SHOWS_BROKEN_KEY と同じ値。あちらは後で定義されるのでここは文字列で書く。
    //   片方だけ変えないこと。
    "shosai-stage-shows-broken-v1",
  ];
```

## テスト

`tests/stage-shelf-corrupt.test.mjs` に追加する（新規ファイルは作らない）。
既存7件の harness をそのまま使う。**最低この5件**を足す。

1. **作り直しは、消す前に壊れた原文をダウンロードへ流す** —
   `downloadBlob` が使う `document.createElement("a")` / `link.click()` を捕まえ、
   `click` が1回起き、`download` 属性にファイル名が入り、Blobの中身が
   **壊れた原文と一致する**ことを確認する。
2. **確認をキャンセルすると1バイトも消えない** — `window.confirm` が `false` を返す設定で、
   `SHOWS_KEY` と `SHOWS_BROKEN_KEY` の両方が**変わっていない**こと、
   `shelfCorrupt` が解除されていない（＝ `shelveNow()` がまだ `false`）ことを確認する。
3. **OKすると両方消えて棚が作り直される** — `SHOWS_KEY` が現在のショー1件になり、
   `SHOWS_BROKEN_KEY` が**無くなっている**こと。
4. **作り直し後に再び壊れると、今回の原文を正しく退避し直せる**（穴2の回帰防止）—
   作り直し → 改めて壊れた値を入れて読み直し → `SHOWS_BROKEN_KEY` に
   **2回目の壊れた原文**が入っていること（1回目のものが残っていないこと）。
5. **`?fresh` が退避キーも消す** — `STAGE_KEYS` に退避キーが含まれ、
   ローカルで確認を承認したときに実際に消えること。
   （既存の `?fresh` テストは `tests/stage-session-shelve.test.mjs` にある。
   そちらの期待キー数を直す必要があれば直すこと。）

**通っているように見えて何も検査していないテストを書かないこと。**
各テストで、期待する値が実際に変わった／変わらなかったことを assert する。

## 版番号とキャッシュ（★忘れやすい）

着手時点の実際の値を `index.html` で確認してから、そこから1つ上げる
（先行作業の完了時点では `stage-sketch.js?v=285` / CACHE `v130`）。

- `stage-sketch.js?v=<現在値>` → `+1`（`index.html` と **`stage.html` の両方**）
- `stage-sw.js` の `stage-sketch-pwa-v<現在値>` → `+1`
- `style.css` を触った場合のみ、そちらも `+1`（触らずに済むはず）
- `tests/stage-venue-library.test.mjs` の版番号照合の期待値も更新する

**`stage.html` は `index.html` から生成される。** 手で両方を直さず、
`index.html` を直してから `python3 build_stage.py` で再生成し、
`python3 build_stage.py --check` が通ることを確認する。

## 完了条件

- [ ] `node --test tests/*.test.mjs` が全通過（現在435件。追加分だけ増えていること）
- [ ] `mcp-server` 側のテストが全通過（先行作業と同じ実行方法）
- [ ] `python3 build_stage.py --check` が成功
- [ ] `node --check stage-sketch.js` が成功
- [ ] `git diff --check` が成功
- [ ] `git status --short` に、この発注書で触ると書いていないファイルの**新たな**変更が無い

## 報告に必ず含めること

- 変更したファイルと行数
- 追加したテストの件数と、5件それぞれが何を検査しているか
- テストの実行結果（件数を数字で）
- `shelfBrokenSaved` を残したか削除したか
- ファイル名を日本語にしたか英数字にしたか、その理由
- 判断に迷って別解にした箇所と、その理由
- **commitはしていないこと**

## やらないこと（この作業の境界）

- commit・push・deploy
- 壊れたJSONからショーを部分的に救い出すこと（別起票）
- 退避コピーを複数世代持つこと（1世代のまま）
- ボタンを増やすこと（警告UIは「作り直す」1つのまま）
- P0-4／P1の他項目
- **`build_db.py` と `db.js`**（別作業の未commit変更。触らない）
- `build_stage_shows_local.py` と `tests/stage-local-shows.test.mjs`（同上）
- `poseExtent` の変更（許可リスト運用の基準。絶対に触らない）
