# P1-5: `stage-shows.local.js` 配信実態レポート（2026-08-23）

読み取り専用調査。判断は本人へ。

## 事実

- **HTML参照**: `index.html:1993` と `stage.html:1553` の両方に
  `<script src="stage-shows.local.js?v=1"></script>` がある。**古典的scriptタグ**
  （`type="module"` も `defer` も無い）で、`stage-first-person.js` の直後・
  `stage-audio-store.js`/`stage-sketch.js` の直前に置かれている。
- **Service WorkerのAPP_SHELLに含まれない**（`stage-sw.js` の `APP_SHELL` 配列に
  `stage-shows.local.js` は無い）。PWAオフラインキャッシュの `cache.addAll` 失敗要因にはならない。
- **`.gitignore`**: 除外対象（`stage-shows.local.js` 単体名で指定）。**GitHub Pagesには存在しない**
  →そのURLへのリクエストは404になる。
- **`.assetsignore`**: 除外**されていない**。**Cloudflare Workerへは配信される**
  （今回の1回目デプロイ差分で新規アップロードを確認済み）。これは`.gitignore`のコメント
  「Cloudflare（Basic認証の内側）へだけ配信し、公開リポジトリには残さない」と**一致する意図的な設計**。
- **生成元**: `build_stage_shows_local.py`（未commit・本人確認待ち）。個人用ショーをSCAN_GLOBSで
  自動走査し、`window.SHOSAI_STAGE_LOCAL_SHOWS` へ配列を書き出す。
- **読み込み側の防御**: `stage-sketch.js:5026` の `syncLocalShows()` は
  `Array.isArray(window.SHOSAI_STAGE_LOCAL_SHOWS) ? … : []` で**未定義でも空配列にフォールバック**する。

## 環境ごとの挙動（実測ではなくコード根拠からの結論）

| 環境 | ファイルの有無 | 結果 |
|---|---|---|
| GitHub Pages | 無し（404） | scriptタグの読み込みがコンソールに1件のエラーを出すが、`defer`/`module`ではないため**後続scriptの実行はブロックされない**。`syncLocalShows()`が空配列で処理し、機能的な破綻は無い。 |
| Cloudflare Worker（Basic認証内） | 有り（200） | 個人用ショーが一覧へ自動追加される。意図通り。 |
| ローカル（`file://`/localhost） | ビルド次第（`python3 build_stage_shows_local.py`を実行していれば有り） | 同上。 |

## 結論・選択肢

レビューが懸念した「配信仕様が環境ごとに異なる」は**事実だが、意図的な設計であり、
現状のコードは404を安全に吸収できている**。GitHub Pages側で機能欠落や破損は起きない。

対応不要とする場合の根拠:
- 404は個人用ショーの非表示という想定通りの結果であり、データ破損や機能停止を伴わない。
- コンソールに404が1件出る点だけが気になる場合は、`fetch` の事前存在確認や
  `onerror` ハンドラでの無音化が考えられるが、実害のない見た目上の問題。

対応する場合の選択肢:
1. **現状維持**（推奨）: 意図通りに機能しているため、コンソール404の見た目を許容する。
2. **`onerror`で無音化**: scriptタグに `onerror="this.remove()"` 相当を足し、404を握りつぶす
   （体感上の変化なし。コンソールログだけ静かになる）。
3. **build手順を分離**: 「公開用ビルド」と「Cloudflare用ビルド」を明示的なフラグで分け、
   公開用では最初からscriptタグ自体を出さない（変更範囲が最も大きい）。

**本人判断待ち**: 1〜3のどれを採るか。実害が無いため、リリースのブロッカーにはならない
と判断してよいと考えられる（P1格下げ候補）。
