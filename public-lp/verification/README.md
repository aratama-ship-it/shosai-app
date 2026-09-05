# 所有権の確認ファイルを置く場所

ここに置いたファイルは、`python3 build_public.py` が **配信フォルダの直下**へそのまま運びます。
`public-lp/verification/googleabc123.html` → 本番の `https://…/googleabc123.html`

## 何に使うか

Google Search Console などが「このサイトはあなたのものか」を確かめるために、
指定した名前のファイルをサイトの直下に置くよう求めることがあります。
その指定ファイルをここへ入れて、ビルドしてデプロイすれば確認が通ります。

## Search Console の手順（URLプレフィックス プロパティ）

1. https://search.google.com/search-console で「プロパティを追加」→「URL プレフィックス」
2. `https://stagesketch-try.juggler-arata.workers.dev/` を入力
3. 確認方法から「**HTML ファイル**」を選び、`google〜.html` をダウンロード
4. そのファイルをこのフォルダへ置く
5. `python3 build_public.py` → `npx wrangler deploy -c wrangler.public.toml`
6. Search Console の「確認」を押す
7. 通ったら「サイトマップ」→ `sitemap.xml` を送信

★ 確認が通ったあともファイルは消さないこと（Googleは定期的に再確認する）。

## 置いてよいもの

`.html` と `.txt` だけ。ビルドはそれ以外の拡張子で止まります。
機密情報は置かないこと（ここのファイルは誰でも読める場所へ出ます）。
