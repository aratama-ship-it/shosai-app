# Qシート配布・書き出し契約 v1

2026-09-09 / 説明用fixtureの契約。製品保存形式には未接続。

## 目的

一つのQ・台本anchor・転換activity・担当データから、全体、部門、個人の各Qシートを導出する。書き出し先ごとにQを複製して保存しない。

## 出力先

| 種別 | 例 | 出力に含めるもの |
| --- | --- | --- |
| 全体 | 舞台監督・全カンパニー | 全Q、相対順、転換activity、未割当警告 |
| 部門 | 照明、音響、演者、進行 | 自部門の操作Qと、直前・直後の参考Q |
| 個人 | 演者A、照明オペ | 自分の操作Qと、その前後関係 |

## 正本と導出

- `distribution.recipients` は出力先の種類と表示名だけを持つ。
- `distribution.cueAssignments` は cueId と recipientRefs、操作メモを持つ。
- 表示・CSV・印刷用HTMLは、cueAssignmentsからその都度導出する。
- `contextPolicy.includeAdjacentCues` が真なら、操作Qの直前・直後は「前後参照」として同じ出力に加える。
- 台本anchorがないQは、紙面位置・activity・担当・所要を補完しない。割当先があっても未割当警告を出す。

## 出力形式

- `print-html`: 現場で印刷できる一枚のHTML。操作Qと前後参照を区別し、未割当警告を残す。
- `csv`: `表示種別 / 相対時刻 / Q / 種別 / 内容 / 操作メモ / 台本状態 / 転換activity / 担当 / 関係` の列を持つ。

## Web閲覧

- `webViewer.stageStates` はQごとの舞台状況と架空の配置を持つ。配布用Qを複製しない。
- 受け手画面は役割とQを切り替え、左に舞台状況、右に自分の操作と前後Qを同時に表示する。
- 確認欄は `checkPolicy.persist: false` の画面内補助である。GO、共有、実行済み、他者への通知として保存しない。
- シーンメモとQメモは `notePolicy` に従い、見る人・sceneRef・cueIdごとにブラウザ内へ保存する。fixture段階では共有、GO、実行記録、サーバー保存を行わない。
- 矢印と付箋は `annotationPolicy` に従い、見る人・sceneRefごとの舞台配置レイヤーとして保存する。配置の正本を動かさず、シーンに重ねて表示する。
- 台本anchorまたはactivityがないQは、受け手画面でも未割当を表示し、欠けた情報を補完しない。

PDF、Blob、Data URL、Object URL、外部共有先はこの契約へ保存しない。製品へ接続するときは、project export/importの正規化処理が `distribution` を保持することを別途テストで確認する。
