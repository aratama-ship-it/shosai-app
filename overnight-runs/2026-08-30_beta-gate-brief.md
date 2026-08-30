# 舞台スケッチ ベータ起動時ゲート実装指示（2026-08-30）

対象ディレクトリ: このファイルがある `overnight-runs/` の一つ上（shosai-app 直下）。
このファイル自体は編集しないこと。ここに書かれたファイル以外は触らないこと。
削除・移動は一切しないこと。既存ファイルは編集前に必ず読み直すこと。

★このワークスペースは並行作業が常態。現在 index.html / stage.html / style.css に
  別セッション由来と思われる未コミットの変更（style.css を v220→v221 に上げるデザイン
  修正、20行弱）がすでにある。これは今回の指示と無関係なので、**そのまま残すこと**。
  index.html と style.css はこの指示では一切変更しない（stage.html だけは下の
  「変更4」の手順で build_stage.py により再生成されるが、その際も index.html の
  現在の内容がそのまま引き継がれるだけで、既存の変更を壊さない）。
★git のコミットやステージング（git add / git commit）は一切行わないこと。
  ファイルの編集と、指定されたコマンドの実行（python3 build_stage.py / node --test）
  だけを行う。

## 背景（読むだけでよい。判断はすでに確定済み）

舞台スケッチ（stage.html、公開ベータ配布用）は PWA としてホーム画面に入れると
Service Worker がオフラインキャッシュする。このままだと製品版を出したあとも
テスターがベータ版をオフラインで使い続けられてしまう。そこで、**起動のたびに
一度だけサーバーへ生死確認**し、ベータが終了扱いならブロック画面を出す方式にする
（常時オンライン必須にはしない＝オフライン中の継続利用そのものは今まで通り可）。

書斎本体（index.html を直接開く、本人・身内用のタブ群）には一切影響させない。
stage-pwa.js は index.html には読み込まれず、build_stage.py が作る stage.html
だけに載る単独ページ専用スクリプトなので、ここに実装すれば自動的にスコープが
舞台スケッチの公開ベータだけに閉じる。

## 変更1: worker.js

`handleWhoamiRequest` 関数の直後（`serveAuthenticatedRequest` 関数の手前）に、
以下の関数をそのまま追加する。

```js
/* ベータ版の生死確認。起動時に一度だけ stage-pwa.js から呼ばれる想定。
   本人が製品版を出したら env.STAGE_BETA_ACTIVE を "false" にして
   wrangler deploy し直すだけで、既にホーム画面へ入っているベータ版も
   次回起動時にブロックできる。未設定時は事故で全員締め出さないよう
   active 扱いにする（fail-open。ここはセキュリティ境界ではなく製品の
   ライフサイクル切り替えなので、設定忘れで壊れる側より事故が軽い側に倒す）。 */
function handleBetaStatusRequest(request, env) {
  const { pathname } = new URL(request.url);
  if (pathname !== "/beta-status") return null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: {
        "Allow": "GET, HEAD",
        "Cache-Control": "no-store",
      },
    });
  }

  const betaActive = env.STAGE_BETA_ACTIVE !== "false";
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  return jsonResponse({
    ok: true,
    betaActive,
    message: (!betaActive && env.STAGE_BETA_MESSAGE) ? env.STAGE_BETA_MESSAGE : null,
    productUrl: (!betaActive && env.STAGE_BETA_PRODUCT_URL) ? env.STAGE_BETA_PRODUCT_URL : null,
  });
}
```

そのうえで `serveAuthenticatedRequest` 関数を次のように変更する（`whoamiResponse` の
チェックの直後、`sessionResponse` のチェックより前に差し込む）。

変更前:
```js
async function serveAuthenticatedRequest(request, env, user) {
  const whoamiResponse = handleWhoamiRequest(request, user);
  if (whoamiResponse) return whoamiResponse;
  const sessionResponse = await handleSessionRequest(request, env);
  if (sessionResponse) return sessionResponse;
  return env.ASSETS.fetch(request);
}
```

変更後:
```js
async function serveAuthenticatedRequest(request, env, user) {
  const whoamiResponse = handleWhoamiRequest(request, user);
  if (whoamiResponse) return whoamiResponse;
  const betaStatusResponse = handleBetaStatusRequest(request, env);
  if (betaStatusResponse) return betaStatusResponse;
  const sessionResponse = await handleSessionRequest(request, env);
  if (sessionResponse) return sessionResponse;
  return env.ASSETS.fetch(request);
}
```

このエンドポイントは既存の `/whoami` と同じ経路（Cookie/Basic認証を通った後）で
配信されるので、認証まわりのコードは一切追加しない。既存の認証ロジックに触らない。

## 変更2: wrangler.toml

ファイル末尾（`[[migrations]]` ブロックの後）に、以下をそのまま追記する。

```toml

# 舞台スケッチのベータ提供スイッチ（2026-08-30 追加）。
# 製品版を出したら STAGE_BETA_ACTIVE を "false" にして wrangler deploy し直す。
# STAGE_BETA_PRODUCT_URL に製品版のURLを入れておくと、締め出し画面にリンクが出る
# （空でもよい。その場合はリンクなしのメッセージだけになる）。
[vars]
STAGE_BETA_ACTIVE = "true"
```

## 変更3: stage-pwa.js

既存の早期リターン（`if (window.stageSketchBridge || !("serviceWorker" in navigator)
|| window.location.protocol === "file:") return;`）の直後、`window.addEventListener("load", ...)`
の呼び出しより前に、以下の2関数と呼び出しをそのまま追加する。

```js
  /* ベータ版の締め出し。起動のたびに一度だけサーバーへ確認する
     （常時オンライン必須にはしない。製品版が出たあともホーム画面のPWAが
     オフラインキャッシュだけで動き続けるのを防ぐのが目的なので、起動時の
     確認さえ通ればそのあとはこれまで通りオフラインで使える。2026-08-30決定）。 */
  function showBetaGate({ heading, message, productUrl, retry }) {
    let box = document.getElementById("stage-beta-gate");
    if (!box) {
      box = document.createElement("div");
      box.id = "stage-beta-gate";
      box.setAttribute("role", "alertdialog");
      box.setAttribute("aria-modal", "true");
      box.style.cssText = "position:fixed;inset:0;z-index:200;display:flex;"
        + "align-items:center;justify-content:center;padding:24px;"
        + "background:rgba(8,7,6,.92);color:#f2ece4;text-align:center;";
      document.body.appendChild(box);
    }
    box.textContent = "";
    const inner = document.createElement("div");
    inner.style.cssText = "max-width:min(440px,calc(100vw - 48px));";
    const h = document.createElement("p");
    h.style.cssText = "font-size:16px;font-weight:600;margin:0 0 10px;";
    h.textContent = heading;
    const p = document.createElement("p");
    p.style.cssText = "font-size:13px;line-height:1.7;margin:0 0 18px;color:#cfc3b6;";
    p.textContent = message;
    inner.appendChild(h);
    inner.appendChild(p);
    if (productUrl) {
      const a = document.createElement("a");
      a.href = productUrl;
      a.textContent = "製品版はこちら";
      a.style.cssText = "display:inline-block;padding:10px 20px;background:#f2ece4;"
        + "color:#191512;text-decoration:none;font-size:13px;font-weight:600;";
      inner.appendChild(a);
    }
    if (retry) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "再試行";
      btn.style.cssText = "margin-left:10px;padding:10px 20px;background:transparent;"
        + "color:#f2ece4;border:1px solid #6b6156;font-size:13px;cursor:pointer;";
      btn.addEventListener("click", () => { box.remove(); checkBetaStatus(); });
      inner.appendChild(btn);
    }
    box.appendChild(inner);
  }

  function checkBetaStatus() {
    const controller = ("AbortController" in window) ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    fetch("/beta-status", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller ? controller.signal : undefined,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`beta-status ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (data && data.betaActive === false) {
          showBetaGate({
            heading: "ベータ版の提供は終了しました",
            message: data.message || "ここまでご協力ありがとうございました。製品版をご利用ください。",
            productUrl: data.productUrl || null,
            retry: false,
          });
        }
      })
      .catch(() => {
        showBetaGate({
          heading: "オンライン接続が必要です",
          message: "舞台スケッチのベータ版は、起動時にネット接続を確認できないと使えません。"
            + "接続を確認してもう一度お試しください。",
          productUrl: null,
          retry: true,
        });
      })
      .finally(() => { if (timer) clearTimeout(timer); });
  }

  checkBetaStatus();
```

（`window.addEventListener("load", ...)` によるService Worker登録の処理はそのまま残す。
今回追加する `checkBetaStatus()` の呼び出しは、その `addEventListener` 呼び出しより
**前** に置く＝ページ読み込み完了を待たずにすぐ確認を始める。）

## 変更4: バージョン番号を上げる（JSを直したので必須）

以下5箇所を機械的に置換する。

1. `build_stage.py` 93行目: `'<script src="stage-pwa.js?v=6"></script>'`
   → `'<script src="stage-pwa.js?v=7"></script>'`
2. `stage-sw.js` 1行目: `const CACHE_NAME = "stage-sketch-pwa-v182";`
   → `const CACHE_NAME = "stage-sketch-pwa-v183";`
3. `tests/stage-pwa.test.mjs` 141行目: `assert.ok(swSource.includes("./stage-pwa.js?v=6"));`
   → `assert.ok(swSource.includes("./stage-pwa.js?v=7"));`
4. `tests/stage-manual-help.test.mjs` 134行目:
   `assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v182";/);`
   → `assert.match(swSource, /const CACHE_NAME = "stage-sketch-pwa-v183";/);`
5. `tests/stage-session-shelve.test.mjs` 48行目:
   `assert.match(serviceWorkerSource, /const CACHE_NAME = "stage-sketch-pwa-v182";/);`
   → `assert.match(serviceWorkerSource, /const CACHE_NAME = "stage-sketch-pwa-v183";/);`

上記1を変更したあと、必ず以下を実行して `stage.html` を作り直す。

```
python3 build_stage.py
```

「足りない id はありません」と出て終了コード0になることを確認する。差分が
`stage.html` にも反映されていることを確認する（build_stage.py が自動生成するので
stage.html を手で編集しない）。

## 変更5: 新規テストを追加する

`tests/worker-beta-status.test.mjs` を新規作成する。既存の `tests/worker-session-login.test.mjs`
の冒頭にある `env` の組み立て方（`SITE_USER`/`SITE_PASS`、`ASSETS.fetch` のダミー実装）を
参考にし、同じ書き方に揃える。最低限、以下をカバーする:

- Cookie/Basic認証を通した状態で `GET /beta-status` を叩くと、`env.STAGE_BETA_ACTIVE` が
  未設定のとき `{ ok: true, betaActive: true, message: null, productUrl: null }` が返る。
- `env.STAGE_BETA_ACTIVE = "false"` のとき `betaActive: false` になり、
  `env.STAGE_BETA_MESSAGE` / `env.STAGE_BETA_PRODUCT_URL` を設定していればその値が
  `message` / `productUrl` にそのまま入る。
- 未認証（Cookieも Basic認証もなし）で `GET /beta-status` を叩くと、既存の認証境界の
  挙動どおり401になる（＝この新エンドポイントが認証をすり抜けないことの確認）。

`tests/stage-pwa.test.mjs` には、既存の他のテストと同じ「ソースコードに期待する記述が
含まれているか」を確認する形式（`assert.match(pwaSource, /.../)`）で、以下を確認する
テストを追記する:

- `checkBetaStatus` 関数が定義されている
- `fetch("/beta-status"` という呼び出しが存在する
- `showBetaGate` 関数が定義されている

## 完了条件

以下がすべて満たされること。

1. `python3 build_stage.py` が終了コード0で成功し、`stage.html` が更新されている。
2. `node --test tests/` を shosai-app 直下で実行し、新規・既存テストがすべて通る
   （既存テストを壊していないこと）。
3. 追加・変更したファイルは worker.js / wrangler.toml / stage-pwa.js / build_stage.py /
   stage-sw.js / stage.html / tests/worker-beta-status.test.mjs（新規） /
   tests/stage-pwa.test.mjs / tests/stage-manual-help.test.mjs /
   tests/stage-session-shelve.test.mjs の10個のみ。他のファイルは変更しない。
4. 完了したら、変更したファイル一覧と `node --test tests/` の実行結果（成功件数）を
   簡潔に報告する。
