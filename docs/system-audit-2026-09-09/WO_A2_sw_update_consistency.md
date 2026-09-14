# 発注書 WO-A2: PWA更新で「新HTML＋旧JS」の版ずれを起こさない（2026-09-09・未着手）

最初に `AGENTS.md`（ワークスペース直下 `claude code files/AGENTS.md`）を読むこと。対象は `shosai-app/`。

## 事実（再現済み）

`docs/system-audit-2026-09-09/repro-a2-sw-mixed-version.mjs` を `stage-sw.js` の実ソースに対して実行した結果（2026-09-09）:

| 条件 | オフライン時に返る stage.html | 新JS `?v=319` | 判定 |
|---|---|---|---|
| `caches.keys()` が作成順（旧キャッシュが先） | 旧HTML（`?v=318` を参照） | 無し（旧JSはある） | 整合。起動できる |
| `caches.keys()` で新キャッシュが先 | **新HTML（`?v=319` を参照）** | **無し** | **起動不能** |

経路: 旧shell完備 → 新SWが install で資材取得に全失敗（`skipWaiting` は正しく抑止される）→ タブ全閉じで activate
→ 通信復帰時の navigate で `fetch` 成功 → **`stage.html` だけが新 `CACHE_NAME` へ put される**（fetch ハンドラの navigate 分岐）
→ 再びオフライン → `cachedAppShellResponse` は `caches.keys()` の列挙順で最初に見つかった stage.html を返す。

仕様上 `CacheStorage.keys()` は作成順なので**現状のブラウザでは顕在化しにくい**。ただし設計が列挙順に依存しており、
9/7 追加レビューが求めた「旧HTMLと対応するJS/CSSがセットで残ることの検証」はまだ無い。

## 変更するもの

- `stage-sw.js` のみ（＋テスト1本）。`stage-pwa.js` は変更しない。
- `CACHE_NAME` と `APP_SHELL` の `?v=` は**触らない**（版上げは編集完了後に別途。先に上げると旧内容をプリキャッシュする事故になる）。

## 仕様

1. **navigate 分岐の put を条件付きにする。** 新 `CACHE_NAME` の shell が `hasCompleteAppShell()` で揃っている時だけ `./stage.html` を put する。
   揃っていない時は put しない（旧キャッシュには触らない）。
2. **`cachedAppShellResponse(request, { stageDocument: true })` は「揃っているキャッシュ」を優先する。**
   `stage-sketch-pwa-` で始まるキャッシュを列挙し、`hasCompleteAppShell(cache)` が真のものから先に探す。
   揃ったものが無ければ従来どおり列挙順で最初に見つかったものを返す（何も返さないより良い）。
   `hasCompleteAppShell` は現在 `APP_SHELL` 固定なので、**旧キャッシュに対しては旧版の一覧で判定できない**点に注意。
   旧キャッシュの完全性は「`./stage.html` があり、その本文が参照する `?v=` 付き URL がすべて同キャッシュにある」で判定する
   （HTML本文を `text()` で読み `src="…?v=N"`／`href="style.css?v=N"` を正規表現で拾う。`APP_SHELL_PATHS` に含まれるパスだけ照合すればよい）。
3. 資材の分岐（非 navigate）は現状維持。ただし `cachedAppShellResponse(request)` の完全一致探索は、2 で選んだ「揃っているキャッシュ」を先に見る。

## テスト（必須・完了条件）

`tests/stage-pwa-offline-warm.test.mjs` に1本追加。`repro-a2-sw-mixed-version.mjs` の手順をそのまま移し、
`caches.keys` のモックを**新キャッシュが先に列挙される順**にして:

- オフラインの navigate が返す本文が**旧HTML**であること（新JSが無い間は新HTMLを返さない）
- その旧HTMLが参照する `stage-sketch.js?v=(N-1)` を資材分岐で要求すると**応答がある**こと
- 旧キャッシュが残っていること・`skipWaiting` が呼ばれていないこと
- 逆に、新shellが揃った後（`putCleanCopy` 成功を模擬）は新HTMLと新JSが返ること

既存の4テストと `tests/stage-pwa.test.mjs` が落ちないこと。`node tests/index.mjs` 全件緑。

## 完了後（実装セッションが行う）

版上げ3点セット（`index.html` の `?v=`、`stage-sw.js` の `CACHE_NAME`＋`APP_SHELL`、`python3 build_stage.py`）
→ `docs/system-audit-2026-09-09/C2_ipad_pwa_update_checklist.md` の実機確認 → デプロイ。
**実機確認前に「直った」と書かない。**
