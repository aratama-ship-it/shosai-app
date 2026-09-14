# 舞台配置レイヤー・メモ契約 v1

2026-09-09 / 受け手ビューの説明用fixtureから、実プロジェクトへ接続するための保存・公開範囲の設計メモ。製品保存形式には未接続。

## 現在のfixture

- シーンメモは `recipientId + sceneRef`、Qメモは `recipientId + cueId`、矢印・付箋は `recipientId + sceneRef` でブラウザのLocal Storageへ保存する。
- 矢印と付箋は正本の人物・大道具配置を変更せず、その上に表示する配置レイヤーである。
- `sharing: none` であり、共有、GO、実行記録、サーバー保存を表さない。

## 実プロジェクトへ接続するときの正規化案

```json
{
  "id": "markup-uuid",
  "projectId": "project-uuid",
  "sceneId": "scene-uuid",
  "authorParticipantId": "participant-uuid",
  "visibility": "private",
  "kind": "arrow",
  "geometry": {"from": [0.24, 0.62], "to": [0.68, 0.38]},
  "text": null,
  "revision": 1,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

- `kind: note` は `geometry: {"at": [x, y]}` と `text` を持つ。
- シーンメモは `sceneId`、Qメモは `cueId` を参照する別レコードにする。配置レイヤーと混ぜない。
- 座標は舞台面に対する0〜1の正規化値にし、表示サイズや端末に依存しない。
- 正本の人物配置・大道具配置・Q・台本anchorは参照だけにし、注釈編集で変更しない。

## 公開範囲の既定

| 範囲 | 作成者 | 閲覧者 | 編集者 | 状態 |
| --- | --- | --- | --- | --- |
| `private` | 自分 | 自分 | 自分 | 実装対象。fixtureはこの範囲だけ。 |
| `department` | 指定担当 | 指定部門 | 作成者、明示的な共同編集者 | 将来の共有候補。未実装。 |
| `team` | 指定担当 | プロジェクト参加者 | 作成者、明示的な共同編集者 | 将来の共有候補。未実装。 |

公開範囲を変更する操作は、誰に見えるかを文章で示してから確定する。サーバー同期では `revision` を使い、同じ注釈への同時編集は上書きせず競合として扱う。

### チーフの集約閲覧

- チーフは音響・照明の `department` 注釈と `team` 注釈を一括で閲覧できる。舞台付箋・矢印に加え、Qメモも同じ一覧で部門と種別を併記する。
- 音響・照明の `private` 注釈はチーフに表示しない。個人メモをチーフ権限で自動的に公開扱いにしない。
- 一覧と舞台上の矢印・付箋は、音響 `#315a70`、照明 `#644565`、制作 `#8f3e1e` を使う。色だけに依存せず、部門名・公開範囲・種別を文字で示す。

## 実装接続前の確認項目

1. 現行project export/importに `sceneMarkups` と `workflowNotes` を正規化して保持する経路を追加する。
2. 参加者IDと部門情報を製品の既存権限モデルから参照し、表示選択値を権限の根拠にしない。
3. privateのメモを部門・全体のQシート、CSV、印刷へ混入させない。
4. 矢印・付箋の新規作成、編集、消去、共有範囲変更、競合同期を別々にテストする。

## 現行の舞台スケッチ正本との接続境界

現行のMCP側のsceneには正本の `placements` があり、プロジェクト更新は `expectedRevision` によって保護されている。この仕組みは人物・大道具の正本配置を変更するためのものなので、現場の矢印・付箋を同じ配列やプロジェクトrevisionへ混ぜない。

- 注釈は `sceneMarkups` と `workflowNotes` を別リソースにし、注釈単位の `revision` で競合を判定する。
- 正本のscene配置を更新したときだけ既存のプロジェクトrevisionを更新する。注釈の作成・編集・消去で正本の版を進めない。
- 閲覧・編集権限はログイン済み参加者IDと部門情報から判定する。画面上の「見る人」切替は確認用であり、権限の根拠にしない。
- 同じ注釈の本文または座標が同時更新された場合は自動上書きをせず、作成者・時刻・双方の内容を示して解決する。

次のHTML fixtureは、この境界を前提に、各役割が見える注釈と公開範囲を切り替えて確認するためのもの。送信、サーバー保存、共同編集、実行記録、GOは実装しない。

## 読み取り接続slice（2026-09-09）

`workflow-annotation-bridge-2026-09-09.html` は、次の三つを別々に読み、同じ画面へ投影する実装前の接続確認である。

1. Stage Sketch browser export v4の `kind` / `version` / `project.id` / `project.scenes[].id`
2. companion workflowの `projectBinding`、Q、activityの `sceneRefs`
3. 別レイヤーの `sceneMarkups` と `workflowNotes`

project ID・v4・base snapshot hashの不一致、scene参照切れ、Qメモのcue参照切れは表示前に停止する。チーフ集約では、音響・照明の部門共有と制作チーム共有だけを表示し、privateは投影しない。注釈の更新はprojectのrevisionを進めない。

`baseSnapshotHash` は、UI状態や説明用のscopeを除いた `{kind, version, project, venues}` をキー順固定のJSONへして、UTF-8のSHA-256で算出する。fixtureではブラウザ読み込み時とNode validatorの両方で比較する。実project、既存ブラウザデータ、保存先、認証、共有、GO、実行記録には接続しない。検証は `node validate-workflow-annotation-bridge.mjs` で行う。
