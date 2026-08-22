# 舞台スケッチ リリース阻止項目 P0-1／P0-2／P0-3 修正 発注書

- 起票日: 2026-08-22
- 起票: Claude（仕様確定）／実装: Codex／検証: Claude
- 元資料: `docs/STAGE_SKETCH_RELEASE_REVIEW_2026-08-22.md`（同日Codex作成のリリース前システムレビュー）
- 本人判断: 2026-08-22 に取得済み（下記の各項に明記）

この発注書は単体で読めるように書いている。別マシンのエージェントが引き継ぐ場合も、
このファイルと元資料だけで作業できる。

## 前提（作業前に必ず確認）

- 作業ツリーには**今回の作業と無関係な未commit変更が多数ある**。
  `build_stage_shows_local.py` と `tests/stage-local-shows.test.mjs` は
  身に覚えのない変更として `PROJECT_NOTES.md` に記録されている。**触らないこと。**
- **一括commitしないこと。** commit・pushは本人の判断待ち。この発注書ではcommitしない。
- 着手前に `git status --short` を確認する。他ツールの変更を巻き戻さない。

## やること（3件）

---

### P0-1: Worker を「本番のみ fail-closed」にする

**現状**: `worker.js` の `fetch` で、`SITE_USER`/`SITE_PASS` と `GUEST_USER`/`GUEST_PASS` の
どちらの組も揃っていない場合（`accounts.length === 0`）、**認証をかけずに配信する**。
直上のコメントに「設定忘れでロックアウトするより外から確認しやすい方を優先する」とあり、
これは意図的な選択である。

**本人判断（2026-08-22）**: **本番のみ fail-closed。ローカルは今までどおり認証なしで通す。**
「設定忘れでロックアウトしたくない」という当初の意図はローカルで残す。

**実装**

1. `worker.js` にホスト判定のヘルパーを追加する。

```js
/* ローカル開発かどうか。Secret未設定でも通すのはここだけ。
   本番（workers.dev・独自ドメイン）では設定不備を503で止める。 */
function isLocalHost(request) {
  let hostname = "";
  try { hostname = new URL(request.url).hostname; } catch (_) { return false; }
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname === "[::1]"
    || hostname.endsWith(".localhost");
}
```

2. **片方だけ設定されている組を「設定不備」として検出する。**
   現状の `.filter(([u, p]) => u && p)` は、片方だけの組を黙って捨てる。
   例: `SITE_PASS` を設定し忘れ、`GUEST_*` だけ揃っている場合、
   本人用が消えてゲスト用だけで開く状態になり、事故に気づけない。

```js
const pairs = [
  [env.SITE_USER, env.SITE_PASS],
  [env.GUEST_USER, env.GUEST_PASS],
];
// 片方だけ入っている組は設定ミス。両方空（＝その入口を使わない）は正常。
const misconfigured = pairs.some(([u, p]) => Boolean(u) !== Boolean(p));
const accounts = pairs.filter(([u, p]) => u && p);
```

3. `accounts.length === 0 || misconfigured` のとき:
   - `isLocalHost(request) === true` かつ `misconfigured === false` → 今までどおり
     `serveAuthenticatedRequest(request, env)` で通す。
   - それ以外 → **503 を返す**。本文は日本語、`Cache-Control: no-store` を付ける。
     設定不備の内容（どのSecretが欠けているか）は**本文に書かない**（外へ晒さない）。

```js
return new Response("認証設定が未完了のため停止しています。", {
  status: 503,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  },
});
```

   ※ `misconfigured` はローカルでも503にする。設定ミスは開発中に気づけた方がよいため。
     「両方とも未設定」だけがローカルの許容ケース。

4. 既存コメント（8〜18行目、93〜94行目）を、新しい挙動に合わせて書き直す。
   「意図的にfail-openにしている」という記述が残ると誤解のもとになる。

**やらないこと**: Secretのローテーション、非公開アセットの分離、preflightへの検査追加
（元資料の対応案のうち、この3つは別起票）。

---

### P0-2: `?fresh` を localhost 限定＋確認ダイアログにする

**現状**: `stage-sketch.js` の 949 行目付近。`?fresh` を付けて開くと、
確認なしに `STAGE_KEYS` の5キーを `localStorage.removeItem` する。
うち `shosai-stage-shows-v1` は**端末上の全ショー**。
GETで開くだけで発動するため、誤リンク・共有URL・ブラウザの先読みでも消えうる。

**本人判断（2026-08-22）**: **localhost限定＋確認ダイアログ。**
コメントにある「チュートリアルの通し確認」「人に見せる前の仕切り直し」の用途は残す。

**実装**

`if (openArgs.has("fresh")) { ... }` のブロックを次の順序に変える。

1. **ローカルでなければ、消さずに無視する。** 通常どおり読み込みを続ける
   （`return` もリダイレクトもしない）。`console.warn` を1行出すだけにする。
   判定は `worker.js` と同じ考え方でクライアント側に持つ:

```js
/* ?fresh は端末の全ショーを消す。公開URLでは誤クリック・共有リンク・先読みで
   発動しうるので、ローカルでしか効かないようにする。
   file:// で開いた単独版（stage.html）は hostname が空になるのでローカル扱い。 */
const freshAllowed = (() => {
  const h = window.location.hostname;
  return h === "" || h === "localhost" || h === "127.0.0.1"
    || h === "::1" || h === "[::1]" || h.endsWith(".localhost");
})();
```

2. ローカルなら、**削除前に `window.confirm` を1回出す。**
   `openLang === "en"` のときは英語、それ以外は日本語。
   （この時点では `stage-i18n.js` の辞書に頼らない。初期化前に走るため。）

   - 日本語: `この端末に保存した舞台スケッチのショーをすべて消して、初回と同じ状態で開き直します。書き出していないショーは戻せません。続けますか？`
   - 英語: `This will delete every stage sketch show saved on this device and reopen as a first-time visit. Shows you have not exported cannot be recovered. Continue?`

3. **キャンセルされたら消さない。** リダイレクトもせず、通常どおり読み込みを続ける
   （`?fresh` が付いたまま開くが、次に読み直しても再び確認が出るだけで害はない）。

4. OKのときだけ、現在の削除＋リダイレクト処理をそのまま実行する
   （`carry` による `lang` / `sample` / `seam-sample` の持ち越しは**現状のまま維持**。
   ここを壊すと `?fresh&sample` が素の舞台で開く既知の踏み抜きが再発する）。

---

### P0-3: セッション参加前の退避失敗を必ず検出する（★最重要）

**現状（Claudeがコードで確認済み）**:

- `writeShows(shows)` は `localStorage.setItem` の失敗を `catch` して
  **`false` を返す（例外を投げない）**。
- `shelveCurrent()` はその戻り値を**捨てている**（`writeShows(shows);` で終わり）。
- `SHOSAI_STAGE_SESSION_BRIDGE.shelveNow()` は `shelveCurrent()` を呼ぶだけで
  やはり戻り値を返さない（`undefined`）。
- `stage-session.js:522` の `try { bridge.shelveNow(); } catch (_) { ...参加を止める... }` は、
  **容量超過では絶対に発火しない**。ガードは書かれているが死んでいる。

結果、**localStorageが一杯のときにゲスト参加すると、退避されていない作業を
ホスト文書で丸ごと上書きする。**

**実装**

1. `stage-sketch.js` の `shelveCurrent()` を、`writeShows` の戻り値をそのまま返すように変える。

```js
  // いまのショーを棚へ書き戻す。保存のたびに呼ぶので、一覧は常に最新になる。
  // ★戻り値は「棚へ確かに書けたか」。容量超過では false が返る（例外は飛ばない）。
  //   セッション参加前の退避判定がこれを見ている（stage-session.js）。捨てないこと。
  function shelveCurrent() {
    const shows = readShows();
    shows[state.project.id] = {
      savedAt: nowIso(),
      state: JSON.parse(snapshot()),
    };
    return writeShows(shows);
  }
```

   ※ `shelveCurrent()` の呼び出し元は14箇所あるが、いずれも戻り値を使っていない。
     値を返すだけなので既存挙動は変わらない。**呼び出し元は変更しないこと。**

2. `SHOSAI_STAGE_SESSION_BRIDGE.shelveNow()` が戻り値を返すようにする。

```js
    shelveNow() { return shelveCurrent(); },
```

3. `stage-session.js` のゲスト参加処理（522行目付近）を、**false も失敗として扱う**形に変える。

```js
      let shelved = false;
      try { shelved = bridge.shelveNow() !== false; }
      catch (_) { shelved = false; }
      if (!shelved) {
        setStatus("現在の作業を退避できなかったため、参加を止めました。ショーを書き出すか、使っていないショーを整理してから、もう一度お試しください。", true);
        return;
      }
```

   `role = "guest"` へ進む経路はこの1箇所だけであることを確認済み。

---

## テスト（新規追加）

`tests/stage-session-shelve.test.mjs` を新規作成し、**最低この3件**を入れる。
既存テストの流儀（`node --test`、`stage-sketch.js` をテキストとして読む静的検査 or
既存の DOM スタブ方式）に合わせること。既存 `tests/*.test.mjs` を先に読んで方式を揃える。

1. `shelveCurrent` が `writeShows` の戻り値を返している（`return writeShows(` を含む）。
2. `shelveNow()` が `return shelveCurrent()` になっている。
3. `stage-session.js` のゲスト参加が `!== false` で失敗判定し、失敗時に `return` している。

**容量不足の再現テスト**が既存の枠組みで書けるなら、そちらを優先する
（`localStorage.setItem` が `QuotaExceededError` を投げるスタブを差し、
参加処理が中止されることを確認する）。書けない場合は上記の静的検査でよい。
**どちらにしたかを報告に明記すること。**

`worker.js` と `?fresh` についても、既存テストの方式で書けるなら追加する。
書けない場合は「書けなかった理由」を報告する。**通っているように見えて何も検査していない
テストは書かないこと**（元資料の「古いアセット番号を探して常に成功していたテスト」の再発防止）。

## 版番号とキャッシュ（★忘れやすい）

`stage-sketch.js` と `stage-session.js` の両方を変更するので、**両方**上げる。

- `stage-sketch.js?v=283` → `?v=284`（`index.html` と **`stage.html` の両方**）
- `stage-session.js?v=2` → `?v=3`（`index.html` と **`stage.html` の両方**）
- `stage-sw.js` の `stage-sketch-pwa-v128` → `v129`
- `tests/stage-venue-library.test.mjs` が版番号の整合を照合しているので、
  必要なら同ファイルの期待値も更新する。

**`stage.html` は `index.html` から生成される。** 手で両方を直すのではなく、
`index.html` を直したうえで `python3 build_stage.py` を実行して再生成し、
`python3 build_stage.py --check` が通ることを確認する。

## 完了条件

すべて満たしてから「完了」と報告すること。

- [ ] `node --test tests/*.test.mjs` が全通過（現在415件。追加分だけ増えていること）
- [ ] `npm test -- --test-reporter=spec`（MCPサーバーテスト34件）が全通過
- [ ] `python3 build_stage.py --check` が成功
- [ ] `node --check stage-sketch.js` / `node --check stage-session.js` / `node --check worker.js` が成功
- [ ] `git diff --check` が成功
- [ ] `git status --short` に、**この発注書で触ると書いていないファイルの新たな変更が無い**

## 報告に必ず含めること

- 変更したファイルと行数
- 追加したテストの件数と、**容量不足の再現テストを書けたか／静的検査に留めたか**
- テストの実行結果（件数を数字で）
- 判断に迷って別解にした箇所があれば、その理由
- **commitはしていないこと**（この発注書ではcommitしない）

## やらないこと（この作業の境界）

- commit・push・deploy
- P0-4（Mac AI編集のrevision競合検出）— 設計が要るので別起票
- P1の8項目 — 別起票
- 音楽機能の拡張
- `build_stage_shows_local.py` と `tests/stage-local-shows.test.mjs`（無関係な未commit変更）
- `poseExtent` の変更（許可リスト運用の基準。絶対に触らない）
