# 舞台スケッチ P1-9: 壊れたショー棚を空として扱わない 発注書

- 起票日: 2026-08-22
- 起票: Claude（仕様確定）／実装: Codex／検証: Claude
- 元資料: `docs/STAGE_SKETCH_RELEASE_REVIEW_2026-08-22.md` の P1 #9
- 先行作業: `docs/RELEASE_P0_DATALOSS_WORKORDER_2026-08-22.md`（P0-1/2/3）が**完了している前提**

この発注書は単体で読めるように書いている。

## 何が起きるか（Claudeがコードで確認済み）

`readShows()` は `localStorage` の `shosai-stage-shows-v1` を `JSON.parse` し、
**失敗すると黙って `{}` を返す**。壊れた文字列も、配列や数値が入っていた場合も同じ。

そのあと `shelveCurrent()` が `readShows()` の結果（＝`{}`）に現在のショー1本を足して
`writeShows()` で**書き戻す**。つまり:

> 棚のJSONが1文字でも壊れると、次の自動保存で**端末上の他の全ショーが消えて、
> いま開いている1本だけの棚に置き換わる。**

自動保存は `persistSoon()` から180msごとに走るので、**利用者が何も操作しなくても起きる。**
`renderShows()` も `shelveCurrent()` を呼ぶため、ショー一覧を開いただけでも成立する。

### 押さえておくべき構造（調査済み）

- `SHOWS_KEY` へ**書き込む経路は `writeShows()` の1箇所だけ**（`stage-sketch.js:3688`）。
  ここを止めれば全経路を止められる。
- `readShows()` の呼び出し元は10箇所。
- 既に良い前例がある: `liveAudioTrackIdsForGc()` は棚が壊れているとき `null` を返し、
  呼び出し元が音源の掃除を見送る（「棚が壊れている時は、そこだけに残る音源を誤って消さない」）。
  **今回もこの考え方に揃える。**
- 「壊れている」と「空」は違う。初回利用（キーが無い）や `"{}"` は**正常な空**であり、
  壊れ扱いにしてはいけない。ここを取り違えると、初回利用者の棚が永久に凍る。

## やること

### 1. 検出と隔離（`readShows` の書き換え）

`SHOWS_KEY` の定義の近く（982行目付近）に退避先キーを足す。

```js
  const SHOWS_BROKEN_KEY = "shosai-stage-shows-broken-v1"; // 壊れた棚の原文の退避先
```

棚まわり（3645行目付近）に状態を持たせる。

```js
  /* 棚のJSONが壊れていると分かったら true。以後、棚への書き込みを全部止める。
     ★黙って {} に落として書き直すと、読めなかった他のショーが
       いま開いている1本で置き換わって消える。それを防ぐための関所。 */
  let shelfCorrupt = false;
  let shelfBrokenSaved = false;   // 壊れた原文を退避できたか（できなくても停止は続ける）

  function markShelfCorrupt(rawText) {
    if (shelfCorrupt) return;
    shelfCorrupt = true;
    /* 原文は一度だけ退避する。既に退避済みなら上書きしない
       （最初に壊れたときの原文が一番価値がある）。 */
    try {
      if (localStorage.getItem(SHOWS_BROKEN_KEY) === null) {
        localStorage.setItem(SHOWS_BROKEN_KEY, rawText);
      }
      shelfBrokenSaved = true;
    } catch (_) {
      shelfBrokenSaved = false;   // 容量不足など。退避できなくても書き込み停止は続ける
    }
  }

  function readShows() {
    let rawText = null;
    try { rawText = localStorage.getItem(SHOWS_KEY); }
    catch (_) { return {}; }                        // localStorage自体が読めない。壊れ扱いにはしない
    if (rawText === null || rawText === "") return {};  // 初回。正常な空
    let raw;
    try { raw = JSON.parse(rawText); }
    catch (_) { markShelfCorrupt(rawText); return {}; }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      markShelfCorrupt(rawText);
      return {};
    }
    return raw;
  }
```

**注意**: `localStorage.getItem` 自体が投げるケース（プライベートブラウズ等）は壊れ扱いにしない。
棚が「読めない」のと「壊れている」のは別。前者で書き込みを止めると、正常な端末で使えなくなる。

### 2. 書き込みを止める（`writeShows`）

```js
  function writeShows(shows) {
    /* 棚が壊れているときは絶対に書かない。ここで書くと、読めなかったショーが
       いま開いている1本で置き換わって消える。 */
    if (shelfCorrupt) return false;
    try {
      localStorage.setItem(SHOWS_KEY, JSON.stringify(shows));
      shelfFailed = false;
      return true;
    } catch (_) {
      shelfFailed = true;
      return false;
    }
  }
```

これで `shelveCurrent()` が `false` を返すため、**P0-3で入れたセッション参加前の判定が
そのまま効き、壊れた状態でのゲスト参加も止まる**（意図した連動。壊さないこと）。

**現在開いているショー（`STORAGE_KEY`）の自動保存は止めないこと。** 別のキーであり、
利用者がいま作っている本体である。止めるのは棚（`SHOWS_KEY`）だけ。

### 3. `deleteShow` が嘘をつかないようにする

`deleteShow()`（12620行目付近）は `writeShows(shows)` の戻り値を見ずに
「消しました」と告知する。棚が壊れていると**消えていないのに消したと言う**。

```js
    delete shows[id];
    if (!writeShows(shows)) {
      renderShows();
      announce(isEn()
        ? "Could not update the show shelf, so nothing was deleted."
        : "ショー一覧を更新できなかったため、消していません。");
      return;
    }
    renderShows();
    announce(`${info.title}を消しました。`);
```

### 4. 利用者へ正直に伝える（`persistSoon`）

`persistSoon()`（5275行目付近）の保存後メッセージに、`shelfFailed` の**前に** `shelfCorrupt` の枝を足す。
既存の `shelfFailed`（容量不足）の枝は残すこと。原因が違うので文言を分ける。

- 日本語: `「{title}」は保存しました。ただしショー一覧の控えが壊れているため、一覧の更新を止めています（残っている他のショーを消さないためです）。ファイルへ書き出してから、ショー一覧で作り直してください。`
- 英語: `Saved “{title}”. The show shelf is damaged, so shelf updates are paused to avoid deleting your other shows. Export to a file, then rebuild the shelf from the show list.`

文言は既存に倣い `isEn()` の三項演算子で直書きする（`persistSoon` は既にその流儀。
`stage-i18n.js` の辞書には足さない）。

### 5. 復旧導線（ショー一覧に警告と作り直しボタン）

`renderShows()`（12637行目付近）で、`shelfCorrupt` のときは一覧の先頭に警告を出す。
棚が壊れていると一覧は**空に見える**ので、利用者がまず来るのはここになる。

含める内容:

- 一覧の更新を止めていること（勝手に消さないため）
- 壊れた原文を退避できたかどうか（`shelfBrokenSaved`）で文面を変える
  - 退避できた: `壊れた元データは端末内に別途取ってあります。`
  - できなかった: `★壊れた元データは退避できませんでした。作り直すと元データは戻せません。`
- 先にファイルへ書き出すよう促す
- 「ショー一覧を作り直す」ボタン

ボタンの処理:

```js
  function rebuildShelf() {
    const warn = shelfBrokenSaved
      ? (isEn()
        ? "Rebuild the show shelf? The damaged original is kept separately on this device. The show you have open now is preserved."
        : "ショー一覧を作り直します。壊れた元データは端末内に別途取ってあります。いま開いているショーは残ります。続けますか？")
      : (isEn()
        ? "Rebuild the show shelf? The damaged original could NOT be backed up and will be lost. Export your work to a file first. Continue?"
        : "ショー一覧を作り直します。★壊れた元データは退避できていないため、この操作で失われます。先にファイルへ書き出してください。続けますか？");
    if (!window.confirm(warn)) return;
    try { localStorage.removeItem(SHOWS_KEY); } catch (_) { /* 消せなくても続ける */ }
    shelfCorrupt = false;
    shelfBrokenSaved = false;
    shelveCurrent();      // いま開いているショーを起点に作り直す
    renderShows();
    announce(isEn() ? "Rebuilt the show shelf." : "ショー一覧を作り直しました。");
  }
```

見た目は既存のショー一覧の作法（`stage-show-row` 等のクラス、`style.css` の既存変数）に
合わせる。**新しい配色やコンポーネントを持ち込まないこと。**
警告であることが分かる既存の表現があればそれを使う。無ければ最小限のクラスを1つ足し、
`style.css` に既存変数だけで書く。

## テスト（新規追加）

`tests/stage-shelf-corrupt.test.mjs` を新規作成する。
**静的な文字列検査ではなく、動作テストにすること。**
`tests/stage-avatar-look.test.mjs` が `vm.runInNewContext` で `stage-sketch.js` を
DOM・`localStorage` スタブごと動かしている。**その harness をそのまま流用する。**

内部関数は露出していないが、`window.SHOSAI_STAGE_SESSION_BRIDGE.shelveNow()` が
`shelveCurrent()` → `readShows()` / `writeShows()` を通る。**ここを入口に使えば
新しいテスト用の出口を作らずに動作を検証できる。**（`shelveNow()` はP0-3で
`shelveCurrent()` の戻り値を返すようになっている前提。）

最低この5件を入れる。

1. **壊れた棚**: `shosai-stage-shows-v1` に `"{ broken"` を入れて起動 →
   `shelveNow()` が `false` を返し、`shosai-stage-shows-v1` の中身が**1文字も変わっていない**。
2. **隔離**: 上記のあと `shosai-stage-shows-broken-v1` に元の壊れた文字列が入っている。
3. **上書きしない**: `shosai-stage-shows-broken-v1` に既に別の値があるときは上書きされない。
4. **正常な空を壊れ扱いしない（★重要な偽陽性防止）**: キー無し／`""`／`"{}"` の3通りで
   `shelveNow()` が `true` を返し、`shosai-stage-shows-broken-v1` が作られない。
5. **配列が入っていた場合**も壊れ扱いになり、書き込みが止まる。

**通っているように見えて何も検査していないテストを書かないこと。**
（元資料にある「古いアセット番号を探して常に成功していたテスト」の再発防止。）
各テストで、期待する値が**実際に変わった／変わらなかった**ことを assert すること。

`deleteShow` と `rebuildShelf` の動作テストが同じ harness で書けるなら追加する。
書けない場合は理由を報告する。

## 版番号とキャッシュ（★忘れやすい）

`stage-sketch.js` を変更する。`style.css` も触るなら両方上げる。
**P0発注書で既に上げているので、その値からさらに1つ上げること。**
着手時点の実際の値を `index.html` で確認してから決める。

- `stage-sketch.js?v=<現在値>` → `+1`（`index.html` と **`stage.html` の両方**）
- `style.css?v=<現在値>` → `+1`（触った場合のみ。同じく両方）
- `stage-sw.js` の `stage-sketch-pwa-v<現在値>` → `+1`
- `tests/stage-venue-library.test.mjs` が版番号の整合を照合している。必要なら期待値も更新する。

**`stage.html` は `index.html` から生成される。** 手で両方を直さず、
`index.html` を直してから `python3 build_stage.py` で再生成し、
`python3 build_stage.py --check` が通ることを確認する。

## 完了条件

すべて満たしてから「完了」と報告すること。

- [ ] `node --test tests/*.test.mjs` が全通過（追加分だけ件数が増えていること）
- [ ] `npm test -- --test-reporter=spec` が全通過
- [ ] `python3 build_stage.py --check` が成功
- [ ] `node --check stage-sketch.js` が成功
- [ ] `git diff --check` が成功
- [ ] `git status --short` に、この発注書で触ると書いていないファイルの**新たな**変更が無い

## 報告に必ず含めること

- 変更したファイルと行数
- 追加したテストの件数と、**5件それぞれが何を検査しているか**
- テストの実行結果（件数を数字で）
- `deleteShow` / `rebuildShelf` の動作テストを書けたか、書けなかったなら理由
- 判断に迷って別解にした箇所と、その理由
- **commitはしていないこと**

## やらないこと（この作業の境界）

- commit・push・deploy
- 壊れたJSONからショーを部分的に救い出すこと（別起票。今回は「壊さない」ことだけ）
- `STORAGE_KEY`（現在開いているショー）の保存経路の変更
- P0-4（Mac AI編集のrevision競合検出）／P1の他7項目
- **`build_db.py` と `db.js`** — 2026-08-22 11:51にDBジャンル分類の変更が入っている。
  別作業のものなので触らない。
- `build_stage_shows_local.py` と `tests/stage-local-shows.test.mjs`（無関係な未commit変更）
- `poseExtent` の変更（許可リスト運用の基準。絶対に触らない）
