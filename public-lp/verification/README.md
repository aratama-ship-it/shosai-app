# 所有権の確認ファイルを置く場所

ここに置いたファイルは、`python3 build_public.py` が **配信フォルダの直下**へそのまま運びます。
`public-lp/verification/foo.txt` → 本番の `https://…/foo.txt`

## ★ .html の確認ファイルは、このホストでは使えない（2026-09-05 実測）

Cloudflare の静的配信は `.html` を拡張子なしURLへ **307 リダイレクト**します
（`/beta.html` → `/beta` と同じ規則）。実際に試した結果:

| リクエスト | 応答 |
|---|---|
| `/googletest0000000000.html` | **307** → `/googletest0000000000` |
| `/googletest0000000000.html?nc=…` | **404** |
| `/robots.txt` | 200（リダイレクトなし） |
| `/sitemap.xml` | 200（リダイレクトなし） |

確認する側は「指定した正確なURLがそのまま200を返すこと」を見るので、307が挟まると
失敗しうる。**`.html` を求められたら、そのサービスの別方式を使うこと。**

この規則を消す（`html_handling = "none"`）のは駄目。`/beta` と `/try` が404になり、
canonical と sitemap に載せた6URLが全部壊れる。

**置けるのは実質 `.txt` だけ**（リダイレクトされない）。ビルドは `.html` と `.txt` を
通すが、`.html` を置いても上の理由で確認は通らない。

## Google Search Console の場合 → 「HTMLタグ」方式を使う

ファイルではなく、トップページの `<head>` に1行入れる方式。リダイレクトの影響を受けない。

1. https://search.google.com/search-console で「プロパティを追加」→「URL プレフィックス」
2. `https://stagesketch-try.juggler-arata.workers.dev/` を入力
3. 確認方法から「**HTMLタグ**」を選ぶ。次のような1行が表示される
   `<meta name="google-site-verification" content="◯◯◯◯" />`
4. その `content="◯◯◯◯"` の中身を `public-lp/index.html` の `<head>` へ足す
   （このファイルが本番の `/`。英語版 `/en/` にも自動で入る）
5. `python3 build_public.py` → `npx wrangler deploy -c wrangler.public.toml`
6. 本番の `/` にそのタグが出ることを確認してから、Search Console の「確認」を押す
7. 通ったら「サイトマップ」→ `sitemap.xml` を送信

★ 確認が通ったあともタグは消さないこと（Googleは定期的に再確認する）。
★ このトークンは秘密ではない（ページのソースに出る）。ただし他人のトークンを入れないこと。

## 置いてよいもの

`.html` と `.txt` だけ。それ以外の拡張子ではビルドが止まる。
機密情報は置かないこと（ここのファイルは誰でも読める場所へ出る）。
