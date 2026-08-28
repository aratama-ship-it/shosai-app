# R1 既存インテーク状態の可視化

`research_intake.json` を取得せずに集計した。これは資料の来歴を棚で混同しないための表示候補であり、作品の質・現行上演・読解完了を順位付けるものではない。

| 既存状態 | 件数 | 資料棚での扱い候補 |
| --- | ---: | --- |
| `official_page_read` | 192 | 個別公式ページを読んだローカル記録。ただし本文にない版・現行性・技術・安全は補わない。 |
| `official_page_read_existing_canonical` | 13 | 既存正本と同一制作を公式の制作主体・年・credit・固有説明から照合した記録。 |
| `official_page_checked_minimal` | 12 | 本文が不足し、正本化できなかった最小確認。 |
| `official_linked_unread` | 61 | 個別URLはあるが本文未読。読解済み・要素化済みとは表示しない。 |
| `catalog_shared_unread` | 19 | 共有カタログ本文の入口。個別作品の根拠にしない。 |

## 未読状態の内訳

- `official_linked_unread` 61件: Cirque du Soleil 12、Fidget Feet 20、Race Horse Company 29。
- `catalog_shared_unread` 19件: Cirque du Soleilの共有カタログ由来。

## 表示上のガードレール

1. URLがあることと、作品本文を読んだことを分ける。
2. 共有カタログの文を個別作品の根拠に見せない。
3. 状態ラベルを「情報の厚み」や上演中の表示に転用しない。
4. 状態の変更・正本化は、資料棚の操作ではなく一次資料を伴う別レビューでのみ行う。

構造化した集計は [r1-intake-status-visibility.json](r1-intake-status-visibility.json) にある。
