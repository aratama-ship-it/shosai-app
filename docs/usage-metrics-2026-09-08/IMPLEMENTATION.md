# β版のアカウント別利用計測

2026-09-08 / Codex。実装済み、未コミット・未公開。本番への計測追加はまだ行っていない。
本人向け入口は [index.html](index.html)。確認用HTMLの数字は架空アカウントのローカル検証値。

## 仕様

- 対象は認証付きβ本体（shosai-app Worker）。公開体験版のCloudflare Web Analyticsとは別。
- 7・30・90日。日本時間の今日を含む暦日単位。最終利用は保持範囲90日での最後の起動／操作受信時刻。
- 利用日は起動または操作の報告が届いた日。起動だけなら操作時間は0。
- 操作時間は、舞台画面が開いていて文書がvisible・focusあり、最後の入力から60秒以内の経過時間。
  5秒周期のサンプルで計測し、30秒以内のバッチで送る。タイマー間隔が10秒を超えた休止は加算しない。
  pointerdown、押下中pointermove、keydown、wheel、touchmoveの発生だけを見る。内容は読まない。
- 非表示／blur／画面終了で残量を送る。既知のoffline・online境界でメーターをリセットする。
  通信失敗分は再送・永続保存しない。ネットワーク状態を完全に復元できず、時間は概算・過少計測の可能性がある。
- 受信時刻へactiveMsをそろえ、同一アカウントの重複時間を切り落とす。直近64件のIDを重複除外する。
  精密な時系列や利用証明ではなく、本人が使い方の傾向を知るための集計。
- 90日より前の日別値は集計から外す。日次alarmで物理削除するため、期限から実削除まで最大約1日ある。
  初回計測日時（アカウントを含まないmeta）は継続保持。
- 共用アカウントはひとまとめ。記録なしのアカウントは一覧に出ない。計測前の履歴は復元できない。
- 管理者自身の記録は保存するが、管理画面では既定で除外する。

## 認証とデータ境界

- `GET /usage/config`: 認証必須。自分の利用者名・有効状態・管理者かを返す。
- `POST /usage/event`: 認証必須、同一OriginのJSON、2KB以下。userは認証結果と一致する場合のみ受理。
  転送内容はv・user・id・kind・activeMsだけ。余分な作品名等のフィールドは捨てる。
- `GET /usage`、`GET /usage/report?days=7|30|90`: SITE_USERのみ。ゲストは403、未認証APIは401。
  未認証の画面遷移は既存のログイン画面へ。ローカル認証省略モードでも集計APIは匿名へ出さない。
- reportと管理画面はno-store。管理画面はnonce付きCSP、frame-ancestors none。文字列はtextContentで表示。
- 新しい `UsageMetrics` Durable Object / `USAGE_METRICS` binding。既存の共有セッションとは独立。
- 正本 `index.html` が `stage-usage.js?v=2` を読み、`build_stage.py` がstage.htmlを生成する。
  PWA shell v198にクライアントだけを追加。管理画面・APIはキャッシュしない。
- `build_public.py` のPUBLIC_SKIP_JSにstage-usage.jsを追加。公開体験版の配信物は変更されない。

## 検証

- `node --test tests/*.mjs`: 1609 passed / 0 failed（既存index.mjsによる重複ロードを含む実行結果）。
- 追加した11テスト: 認証・なりすまし・Origin・payload制限・アカウント変更・停止状態・ストレージ障害・
  重複／並行送信・再起動・JST日またぎ・保持期限・clientの実際の送信・放置／背景／offline。
- `build_stage.py --check`、`build_public.py --check`、`git diff --check`: 成功。
- Wrangler 4.129.1のlocal workerdで、実際のDurable Objectへの記録と重複除外、owner閲覧、guest/anonymous拒否を確認。
- ローカルブラウザの実操作からreview-ownerのactiveMsが増えることを確認。日英のUIと計測説明、更新、期間切替を確認。
- design-lint: 日英 × 390×844 / 1440×900でNG 0・WARN 0・測定不可0。画像も確認。
- Safari・実機iPad・本番Workerは未確認。公開許可後に本番の接続と計測受信を検証する。

## このMacで再確認

```sh
cd '/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app'
node --test tests/usage-metrics.test.mjs
python3 build_stage.py --check
python3 build_public.py --check
node docs/usage-metrics-2026-09-08/build-review.mjs
```

検証中の実行環境は `127.0.0.1:8796`、確認資料は `127.0.0.1:8797`（どちらも検証後に停止済み）。
検証用Wrangler設定と保存領域は `/tmp/stage-usage-local-20260908/`。本番のSecretを使っていない。
これらが消えた場合、確認用HTMLは単体で開ける。実環境検証を作り直すときは、同じbindingを持つlocal設定を
一時ディレクトリに作り、.dev.varsを空にし、架空のSITE_USER/GUEST_USERだけを使用する。

## 本番反映時

本人の公開承認後のみ行う。対象はwrangler.tomlのshosai-app。別Workerのwrangler.public.tomlをデプロイする必要はない。
既存のdirty変更を同梱しないよう、公開済み資材と今回の差分を照合してから反映する。
新しいv2-usage-metrics migrationとbindingを追加する。既存v1-session-roomは維持する。
`STAGE_USAGE_ENABLED=false`で新規受付を停止できる。共有セッションや記録済み閲覧は継続する。
反映後、owner/guest拒否境界、stage-usage v2、PWA更新、実際のイベント受信と集計を確認する。

公式仕様: https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/
