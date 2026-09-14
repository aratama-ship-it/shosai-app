# 公開体験版のアクセス計測

2026-09-08、本人の「導入します」という承認によりCloudflare Web Analyticsを導入・公開。

- 対象: https://stagesketch-try.juggler-arata.workers.dev
- 集計画面: https://dash.cloudflare.com/802917588735d979244a77332421e90c/web-analytics/overview/visits?siteTag~in=c6e82f9937054605a3159c1a4768de25&excludeBots=Yes
- 管理画面: https://dash.cloudflare.com/802917588735d979244a77332421e90c/web-analytics/edit/c6e82f9937054605a3159c1a4768de25
- 公開バージョン: `953ac9ca-74cd-42ef-8163-9bc37d1666da`

## 実装と再ビルド

`build_public.py` の `PUBLIC_ANALYTICS` / `with_public_analytics()` が、`collect_dist()` で書き出す日英6ページに公式タグを1つずつ追加する。
対象は `/`、`/try`、`/beta` とそれぞれの `/en/` 版。`.html` 付きのURLも同じ配信物を読む。
公開計測用tokenは認証鍵ではない。本体の `index.html` / `stage.html`、ローカル版、所有権確認HTMLには追加しない。
タグの二重追加やbody末尾の欠落はビルド時に停止する。

```sh
cd '/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app'
python3 build_public.py
python3 build_public.py --check
node --test tests/stage-public-build.test.mjs
# 以下は公開操作。将来の実行にも、その変更の公開承認が必要。
npx wrangler deploy --config wrangler.public.toml
```

`wrangler.public.toml` の配信先は `public-dist`。プロジェクトルートを配信先にしない。
2026-09-08の作業開始時点にあった未コミット変更は維持し、commit/pushは行っていない。

## 数字の読み方

- Visits（アクセス数）は外部サイトや直接リンクからの訪問回数。1回の訪問に複数ページの表示が含まれる。重複のない実人数ではない。
- Page views（ページの表示数）はページの閲覧回数。
- この導入より前のアクセス人数・閲覧数を復元するものではない。
- 動作確認のアクセスも計測に含まれる可能性がある。導入直後の小さい数字を一般利用者の人数とみなさない。

公式定義: https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/
公式導入手順: https://developers.cloudflare.com/web-analytics/get-started/

## 2026-09-08の検証

- 更新前: 公開42ファイルすべてが手元の配信物とSHA-256一致。
- 変更範囲: 日英6HTMLへの計測タグ追加のみ。タグを除いた本文と残り36ファイルは更新前と同一。
- ローカル: 生成物チェック、`git diff --check`、公開ビルドの既存71テストが成功。
- 更新後: 公開42ファイルすべてが計測タグ追加後の配信物とSHA-256一致。6HTMLは各1タグ。
- ブラウザ: 日英LPの表示、正しい計測token、計測スクリプトと `https://cloudflareinsights.com/cdn-cgi/rum` への通信を確認。確認時のconsole error/warnなし。
- 2026-09-08 18:45 JST、集計画面でアクセス数1を確認（過去24時間、対象サイト指定、ボット除外Yes）。確認用ブラウザの閲覧後に受信が反映された。一般利用者1人と解釈しない。
