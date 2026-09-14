# 発注書 WO-A4/A5: サインインの試行制限とフレーム埋め込み防止（2026-09-09・判断待ち→実装）

最初に `AGENTS.md`（`claude code files/AGENTS.md`）を読むこと。対象 `shosai-app/worker.js`。

## 事実（2026-09-09 読解）

- `handleSignIn`（worker.js）は POST の `user`/`pass` を `timingSafeEqual` で照合し、誤りなら同じ画面を再表示する。
  試行回数・待機・ロックの実装は無い（`attempt`/`429`/`lock`/`CF-Connecting-IP` いずれも0件）。
- 応答ヘッダに `X-Frame-Options`／`Content-Security-Policy`／`Permissions-Policy` は無い。`X-Content-Type-Options: nosniff` はサインイン画面のみ。
- セッションCookie: `Secure; HttpOnly; SameSite=Lax; Max-Age=90日`（適切）。
- CSP の障害になりうる実装（棚卸し）: HTML の `style=` 属性 8箇所（index.html／stage.html 各）、stage.html に `<style>` 1つ（build_stage.py が埋める）、
  JS からの `.style.xxx =` 59箇所（これは CSP の `style-src` に**抵触しない**。抵触するのは `style` 属性の文字列代入と `<style>`）、
  `cssText` 1箇所、`createObjectURL` 4箇所（blob:）、`"data:` 1箇所、`WebSocket` 2箇所（wss: 同一ホスト）、`eval`/`new Function` 0件、
  外部スクリプト 0件（公開体験版だけ Cloudflare Web Analytics の beacon を `build_public.py` が付ける）、外部フォント 0件。
  外部リンク（cnac.fr 等）は `href` なので CSP と無関係。

## 本人が決めること（実装前）

| 判断 | 選択肢 | 推奨 |
|---|---|---|
| D1 試行制限の置き場所 | (a) Cloudflare ダッシュボードの Rate Limiting ルール（コード変更なし） (b) Worker 内で Durable Object にIP別失敗回数 (c) 両方 | **(a)** をまず。β規模ならこれで足りる。(b) はテスト可能で環境非依存だが DO を1つ増やす |
| D2 閾値 | 例: 同一IP 10回/分で 1分ブロック（サインインPOSTのみ） | 10回/分 |
| D3 frame-ancestors | 認証内の全応答に `X-Frame-Options: DENY`（互換）＋ CSP `frame-ancestors 'none'` | 先行して入れてよい（低リスク） |
| D4 CSP 本体 | Report-Only で1週間観察 → 強制 | 観察から。`style-src 'unsafe-inline'` は当面許す（`style=` 8箇所と `<style>` のため） |

## 仕様（D1=(a) の場合、コード側）

1. `worker.js` の認証内応答（`authenticatedAssetResponse` と `htmlResponse`）に次を付ける:
   `X-Frame-Options: DENY`、`Content-Security-Policy: frame-ancestors 'none'`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: same-origin`（既にある箇所はそのまま）。
   公開体験版 Worker（`wrangler.public.toml`・Worker コード無し）は静的配信のため対象外。必要なら `public-dist/_headers` 相当は Workers Assets では使えないので、別途 Worker を足す判断になる（今回は対象外）。
2. `Content-Security-Policy-Report-Only` を認証内 HTML に付ける（観察用）:
   `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss:; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
   report-uri は付けない（受け口を作らない）。観察はブラウザの Console で行う（C-2 の実機確認と同時に）。
3. D1=(b) を選んだ場合のみ: `SignInGuard` DO（キー＝`CF-Connecting-IP`、失敗回数と最初の失敗時刻、TTL 1分）。閾値超過で 429＋`Retry-After: 60`、
   成功時にカウンタを消す。`wrangler.toml` に binding と migration を追加（`v3-sign-in-guard`）。

## テスト（完了条件）

- `tests/worker-session-login.test.mjs` に: 認証内応答に `X-Frame-Options: DENY` と `frame-ancestors 'none'` が付く／サインイン画面にも付く／`/whoami`・`/beta-status` の JSON にも付く。
- D1=(b) のときは `tests/worker-sign-in-guard.test.mjs` 新規: 10回失敗で 429、60秒後に解除、成功でリセット、別IPは影響なし。
- `node tests/index.mjs` 全件緑。`wrangler dev` で `/stage` を開き Console に CSP 違反が出ないことを目視（Report-Only）。

## デプロイ

`wrangler deploy`（`wrangler.toml`）。デプロイ前に A-1 のコミットが済んでいること。D1=(a) はダッシュボードで本人が設定する（AIは触らない）。
