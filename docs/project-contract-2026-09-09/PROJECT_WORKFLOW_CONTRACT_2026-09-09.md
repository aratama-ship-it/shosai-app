# 台本・転換を結ぶ project workflow 契約 v1

2026-09-09 / 設計提案。人間向け入口は `project-contract-2026-09-09.html`。

## 状態と範囲

これは、台本PDF/Q/紙面アンカーと、人物・転換・時間計画を同じショーへ安全に結び付けるための保存契約である。製品コード、既存の `shosai-stage-sketch` 書出し、localStorage、MCP、Macアプリ、共有セッションは変更しない。

既存の製品書出しは browser 側で `kind:"shosai-stage-sketch" / version:4`、MCP側には version:3 の経路がある。browser の `normalizeState` は既知の `project` フィールドを組み直すため、現時点で未知の `workflow` を project JSON に足すと、保存経路によって消える可能性がある。よって v1 は **論理モデルを固定し、実ファイルは companion workflow として扱う**。本体へ統合するのは全読書き経路の監査後だけにする。

## 今回の決定

1. Stage Sketchの平面図・場面・演者・セットは既存 project が正本のまま保持する。workflow は scene/cast/set をIDで参照し、配置や動線を複製しない。
2. 台本PDFのバイナリは project JSON や workflow JSON へ埋め込まない。metadata と assetId だけを保存し、端末内のBlobは別のasset storeへ置く。別端末でBlobがなければ `missing-local` と表示し、アンカーやQを消さずに再接続を求める。
3. Q定義の `cueId`、紙面の `scriptAnchor`、転換・出番・個人予定の `activityId` を別IDにする。PDF座標だけからactivity、人物、所要、GOを自動生成しない。
4. script anchor は一つの cue または scene を対象にする。activity との関係は0件以上の明示参照で表し、一つのQを複数箇所へ置く場合はanchorを分ける。
5. 表示名・Q番号の変更は意味の確認を失効させない。合図の意味、予定の開始・完了、担当、所要、時間基準の変更は、関係する確認記録だけを `needs-review` にする。未解決を0秒や空きに変えない。

## ファイルと保存の境界

### 現段階: companion workflow

```json
{
  "kind": "shosai-stage-workflow",
  "version": 1,
  "projectBinding": {
    "projectId": "proj-…",
    "baseExportKind": "shosai-stage-sketch",
    "baseExportVersion": 4,
    "baseSnapshotHash": "sha256:…"
  },
  "workflowRevision": 1
}
```

`baseSnapshotHash` は、workflowを結び付けた時点の正規化済み project export から生成する。projectIdだけが一致してもhashが違えば自動適用しない。読み込み側は「要照合」と表示し、基礎project、workflow、各参照切れを並べて人が採用する。

companion workflow は既存のv4 project exportを変えない。旧クライアントがv4を開いて保存してもworkflow fileは別に残る。ただし二つのファイルを一つの最新状態として扱うことはできないため、v1ではファイル組の編集・自動同期・配布を実装しない。

### 将来の製品統合

全ての browser / show shelf / file import-export / Mac / session / MCP の読書きが `workflow-v1` を検証・保持できた後だけ、論理モデルを `project.workflow` へ統合できる。統合ファイルは新しい外部versionと `requiredFeatures:["workflow-v1"]` を持つ。未対応読込は正規化前に中止し、未知情報を落とした保存を許可しない。

metadataは一つのproject snapshotとして保存する。PDFなどのassetは先に別storeへ保存し、成功したassetIdだけをmetadataへ参照追加する。asset保存に失敗した場合は既存metadataを置換しない。不要になったassetの削除は、参照監査と利用者の明示操作を経るまで行わない。

## 論理モデル

| 領域 | 正本 | 主なID | 参照するもの | 保存しないもの |
| --- | --- | --- | --- | --- |
| 基礎project | Stage Sketch | projectId / sceneId / castId / setId | workflowから参照される | activity、PDF座標の複製 |
| Qと台本 | workflow.script | cueId / documentId / anchorId | assetId、sceneId、activityId | PDF Blob、描画キャッシュ |
| 人物・転換・予定 | workflow.coordination | personId / activityId / pointId / windowId | cueId、sceneId、anchorId | 人物別表の計算済み複製 |
| asset registry | workflow.assets | assetId | documentId | Blob本体、Data URL |
| 確認記録 | workflow.reviews | reviewId | 対象IDとrevision | 古い「確認済み」の無条件流用 |

### `workflow.script`

- `documents[]`: `documentId`、表示名、`assetId`、頁数、`revision`、旧版/現行の状態。
- `cues[]`: `cueId`、Q番号、種別、内容、任意の元CSV ID、`displayRevision` と `semanticRevision`。
- `anchors[]`: `anchorId`、`documentId`、0始まりの`pageIndex`、正規化矩形 `[left, top, right, bottom]`、引用断片、`target`、`activityRefs[]`、意味の状態、`revision`。
- `target` は `{kind:"cue", id:cueId}` または `{kind:"scene", id:sceneId}`。anchorの移動はtargetの意味変更ではない。

### `workflow.coordination`

人物・担当枠・activity・planContext・origin・point・estimate・window の意味は、`../set-transitions-2026-09-08/SHARED_PEOPLE_CUES_TIME_CONTRACT_2026-09-09.md` v1をそのまま用いる。

- activityのownerは `script` / `transition` / `personal` のいずれか。一つの実作業に一つのactivityIdだけを与える。
- `cueId` は合図定義、`origin` は計画上の時点、`point` は時刻式であり、Q番号やPDF順から時間を作らない。
- `assignment.personId:null` は担当未確定。仮の人物で不足を埋めない。
- activityがscene/cast/setを参照しても、平面図の座標やrouteをworkflowへコピーしない。空間的な確認はその参照のrevisionを記録する。

### `workflow.assets`

assetは `assetId`、kind、ファイル名、MIME、byteLength、ページ数、任意のhash、`localStatus` を持つ。`localStatus` は `available` / `missing-local` / `unreadable`。workflow JSONへ `blob`、Data URL、Object URL、PDF.js cache、canvas画像を入れない。

## 改訂と確認の扱い

| 操作 | 保持 | `needs-review` にする対象 |
| --- | --- | --- |
| Q番号・人物名・PDF表示名 | IDと意味・時間条件 | なし。表示を更新 |
| PDFの紙面位置だけを移動し、意味が同じと確認 | cue/activityの意味、時間条件 | 位置確認だけ |
| PDF版を追加 | 旧documentと旧anchor | 新版への付替え候補。旧anchorを削除しない |
| cueの意味、主GO、activityの開始/完了 | 元データと旧review | 依存するpoint、estimate、window、人物重複確認 |
| 担当・手順・所要・scene/cast/set参照 | 無関係なanchor | 関係activityと空間/時間確認 |
| PDF assetが端末にない | anchor、Q、activity、過去の位置 | asset読込みと位置確認。時間を0にしない |
| binding hashが違う | companion workflow全体 | projectとworkflowの照合。自動マージしない |

review record は対象IDごとの入力revisionを保存する。対象のsemanticRevisionが違えばreviewは自動で `needs-review` に変わる。数値の計算結果と、人が確認した条件は別の値として持つ。

## 読込み・書出しの安全条件

1. 基礎projectを正規化し、ID・hash・対応versionを確認する。
2. workflowを構造検証する。参照先がない場合はentryを消さず `unresolved` にする。
3. bindingが一致する場合だけ、台本・転換・人物の参照を有効化する。不一致なら照合画面で止める。
4. workflowを含む将来のprojectを未対応クライアントへ渡すときは、明示的に「基礎projectだけを書出す」か「対応クライアントで開く」を選ばせる。黙ってworkflowを落としたファイルは書き出さない。
5. 書出しは基礎project、workflow metadata、再接続が必要なasset一覧を分けて示す。assetの収集・zip化・クラウド同期は別の明示設計にする。

## 実装の順序と合否

1. 入出力監査: browser normalizer、shelf、file import/export、Mac、session、MCPの全経路で未知情報の扱いを記録する。
2. workflow validatorとfixture: ID重複、参照切れ、page/rect、review revision、asset非埋込みを検証する。
3. 読み取り専用のworkflow表示: Q→紙面→activity→転換表をたどる。保存はまだ有効にしない。
4. 同一端末保存: metadataとasset参照の失敗時に以前の状態を残す。asset欠損表示と再接続を確認する。
5. 明示的なファイル組の書出し/読込み: binding不一致、旧クライアント、PDF欠損、改訂版追加を確認する。

合格条件は、PDF差替えで既存anchorを失わない、PDF座標だけで時間・担当を作らない、同一activityを二重計上しない、asset欠損を空き/0秒へ変えない、未対応経路がworkflowを黙って保存しない、である。

## 対象外

実iPad、他端末同期、共同編集、assetの自動収集、競合アプリ独自形式の完全変換、OCR、GO送信、転換所要の自動見積り、本体schemaへの実装はこの契約に含めない。

