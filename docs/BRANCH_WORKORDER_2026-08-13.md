# 作業指示書: 派生の最小構造（設計書6.5節）（2026-08-13・第5便）

発注: Claude（仕様は設計計画書6.5節で確定済み）／実装: Codex／検証: Claude
前便: docs/VISUALS_ABC_WORKORDER_2026-08-13.md まで4便（実装・検証済み）
対象: index.html + app.js + style.css の書斎側。**stage-*.js / stage.html に触れない。git commit しない。**
基準: 第4便完了時点の作業ツリー（git diff で第4便分と混ざるので、このファイル記載の範囲だけ変更）

## 設計書6.5節の要点（正本の要約）

- 目的は「**なぜこの枝へ来たか」を数日後に復元できること**。Gitのような完全な版管理は作らない
- 通常の編集は上書きでよい。**明示的に「枝分かれ」を選んだときだけ、新しいIDを作る**
- 派生時に記録するのは4項目のみ: id / parentId / branchReason（一行の理由）/ branchedAt
- 派生した瞬間の親は、その時点のスナップショットとして保持する
- 表示は「案Aから派生｜身体性を強めるため」程度の一行で足りる

本実装では、問い・場面スタディ・ブリーフを束ねる**プロジェクト単位で枝分かれ**する
（Step 8の「場面案そのものがA/Bへ分岐する場合」を含めてこの単位で表せる）。

## データ

project レコードへ追加（normalizeDeskProject で防御。旧レコードは null）:

```js
branchOrigin: {
  parentId: string,
  parentTitle: string,        // 親が後で削除されても一行表示できるよう保持
  branchReason: string,       // 一行の理由
  branchedAt: ISO文字列,
  parentSnapshot: object,     // 派生した瞬間の親の正規化済みレコード（素のJSONで保持。UIはまだ無くてよい）
} | null
```

- 純関数 `buildBranchProject(parent, reason)` を作りAPIへ公開:
  親の正規化済みレコードを深いコピーし、`id` を新規採番（clipId("proj")）、
  `createdAt`/`updatedAt` を現在時刻、`branchOrigin` を上記4項目＋parentSnapshot
  （親レコードの深いコピー）で設定して返す。**親レコードは変更しない**。
  placed / decisions / directions / visualMeta / sceneLineHistory も引き継ぐ
  （枝は親と同じ状態から始まり、以後独立に育つ）。

## 画像の引き継ぎ

- 枝分かれ実行時、`SHOSAI_DESK_MEDIA` にある親の画像（A/B/C）を読み出して
  新プロジェクトIDのキーへコピーする（get→put。失敗しても枝分かれ自体は成立させ、
  「画像は引き継げませんでした」と通知欄に出す）。

## UI（kind "new" のみ）

### 枝分かれの実行

- 紙面（#sheet）の「書き込む」ボタンの並びに「**枝分かれ**」ボタンを追加。
- 押すとその場に小フォーム（モーダル禁止・既存 .sheet-field 様式）:
  - 一行の理由（input・**必須**。placeholder「例: 身体性を強めるため」。
    空のまま実行しようとしたら「枝の理由を一行だけ書いてください」と促して実行しない。
    ※4項目の記録こそがこの機能の目的のため、ここだけは必須とする）
  - 「枝を作る」「やめる」
- 実行で `buildBranchProject` →保存（deskProjects先頭へ）→画像コピー→**新しい枝を開く**。

### 派生の一行表示

- 紙面上部（問いの変化の下）に、branchOrigin があれば一行:
  「**<parentTitle>から派生｜<branchReason>**」
  親が deskProjects に現存すればクリックで親を開くリンクにする。
  居なければプレーンテキスト（「（親は削除済み）」を小さく添える）。
- 机ホームの「進行中の問い」カードにも、branchOrigin があれば同じ一行を小さく出す。

### 削除との関係

- 親を削除しても枝は残る（parentTitle で一行表示が生き続ける）。確認ダイアログの文言は
  現行のままでよい。

## 完了条件

- `app.js?v=` を現在値（55）を読み直してから+1。
- API へ `buildBranchProject` と branchOrigin の normalize を追加公開。
- `tests/branch.test.mjs` 新設（既存様式）:
  - branchOrigin の normalize（型違い・欠損・旧レコード互換）
  - `buildBranchProject`: 新IDの採番／親の不変性／scene・brief・directions・decisions の引き継ぎ／
    branchOrigin の4項目＋parentSnapshot が親の派生時点の内容と一致すること／
    deep copy であること（枝側の変更が親とparentSnapshotに波及しない）
  - 保存→読込ラウンドトリップ
- `node --test tests/*.mjs` 全通過。
- このファイル末尾へ「## 実装報告(Codex)」を追記（変更ファイル一覧・テスト結果）。

## 実装報告(Codex)

変更ファイル:
- app.js
- style.css
- index.html
- tests/branch.test.mjs
- docs/BRANCH_WORKORDER_2026-08-13.md

実装内容:
- project.branchOrigin の normalize と公開API normalizeBranchOrigin / buildBranchProject を追加。
- kind "new" の紙面に枝分かれフォームを追加し、理由必須・保存・親画像A/B/Cコピー・新枝オープンを実装。
- 紙面上部と机ホームの進行中カードに派生元一行表示を追加。親が残っている場合は紙面から親を開ける。
- index.html の app.js クエリを v=56 へ更新。

テスト結果:
- `node --test tests/*.mjs`
- 229 tests / 229 pass

## 検証報告（Claude・2026-08-13）

- `node --test tests/*.mjs` を自分で実行し **229/229 pass** を確認（Codex報告と一致）。
- 実装コード精読（normalizeBranchOrigin / buildBranchProject / branchOriginHtml / 枝分かれフォーム）。
  仕様乖離なし。
- ブラウザ実機検証（localhost・v=56）:
  - 空理由で「枝の理由を一行だけ書いてください」と促し実行しない／理由ありで枝が作られ即開く
  - 派生の一行「〜から派生｜身体性を強めるため」を紙面と机カードの両方で確認
  - 場面の一行・画像（IndexedDBコピー）の引き継ぎ、branchOriginの4項目＋parentSnapshotの内容一致
  - **枝を編集しても親とparentSnapshotが不変**であること（deep copy）
  - 親リンクで親が開く／親を削除しても枝の一行が「（親は削除済み）」付きで残る
  - 検証データは削除済み。
- 留意点（設計どおりだが記録）: 枝の枝を作ると parentSnapshot が入れ子で保持され、
  世代が深いほどレコードが大きくなる。テキストのみなので実用上は問題にならない想定。
  肥大が見えたら「snapshotは1世代のみ保持」への変更で対処できる。
