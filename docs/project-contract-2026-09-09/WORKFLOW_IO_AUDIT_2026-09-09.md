# workflow v1 読書き経路監査

2026-09-09 / 読み取り専用の設計監査。製品コード、既存プロジェクト、保存データは変更していない。

## 判定

現行の Stage Sketch project へ `workflow` を保存してはいけない。ブラウザの状態正規化は既知の project field を再構成するため、未知の `project.workflow` を保存・再読込・共有のいずれかで失う。workflow は、全経路が対応するまで `shosai-stage-workflow` の companion file として扱う。

`workflow-v1` を現行 v3 / v4 project に黙って混ぜる方式、未知 field を「たまたま通る」Mac / MCP の経路に依存する方式、PDF Blob を project JSON へ入れる方式は採らない。

## 監査範囲

舞台スケッチ本体の browser state / show shelf / file import-export / session bridge、MCP canonical store / app import-export、Mac project store、既存の音源 asset store、そして `docs/script-cues-2026-09-09` の台本キュー試作を読んだ。外部公開済み環境、iPad、共同編集サーバー、未作成のPDF asset storeは対象外である。

## 現行経路

| 経路 | 観測した読み書き | 現在の workflow-v1 判定 | 統合前に必要な変更 |
| --- | --- | --- | --- |
| Browser current state | `stage-sketch.js` の `STORAGE_KEY` へ current state を保存し、`normalizeState()` で既知 project field を組み直して復元する。 | **不可**。未知の `workflow` は normalizer で保持されない。 | workflow 対応の schema normalizer、明示的な feature gate、未対応版の安全な拒否を追加する。 |
| Browser show shelf | 同ファイルの `SHOWS_KEY` に project ごとの state clone を保存し、開く時も normalizer を通す。 | **不可**。current state と同じく失われる。 | current state と同じ schema / migration を shelf にも適用し、両方を同じ受入試験で確認する。 |
| Browser file export / import | export は `shosai-stage-sketch` v4。import は project clone の後に current state normalizer を通す。 | **不可**。v4 自体は workflow feature の対応を表さず、import 後に失われる。 | 新しい外部 version と `requiredFeatures:["workflow-v1"]` を導入し、asset package と companion metadata の整合を確認する。 |
| Browser AI / MCP import path | `stage-sketch.js` の AI import は `shosai-stage-sketch` v3 を明示的に要求する。 | **不可**。v4 workflow export を受け取れず、workflow validator もない。 | AI経路が扱う document version / feature を別途定義し、workflow は明示的に不対応として止めるか、新versionを検証する。 |
| Shared session | `stage-session.js` は `SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()` と `applyDocumentString()` を用いる。 | **不可**。bridge は browser export/import と同じ正規化へ渡る。 | protocol version と required feature の交渉、workflowを含む更新の原子的適用、未対応guestの拒否を実装する。 |
| MCP canonical store | `mcp-server/src/project-store.js` は read / mutate / history / export を持つ。`stage-model.js` は version 3 を検証する。 | **未対応**。現在の validator は workflow schemaを検証せず、v4は受理しない。 | project schemaの正本を拡張する場合は新version validator、全 mutation、history、exportを同じ contract に合わせる。companion fileを採る間は project storeと別の原子的保存単位を設計する。 |
| Mac project store | `StageSketchProjectStore.swift` は `shosai-stage-sketch` version 3 を受け取り、JSON objectをrevision付きで保存する。 | **通過する可能性はあるが採用不可**。未知 key を明示的に検証もfeature gateもしない。v4は拒否する。 | workflowを含む新versionを明示検証し、revision conflict時も project / workflow / asset metadata の関係を保つ。 |
| Local audio asset store | `stage-audio-store.js` は音源 Blob を `shosai-stage-audio` IndexedDB に置き、projectにはtrack metadataだけを置く。 | **参照例として適合**。PDF用storeはまだない。 | PDF専用store、assetId、欠損時の再接続表示、容量・削除・書出し方針を決める。音源storeを流用したとみなさない。 |
| 台本キュー試作 | `docs/script-cues-2026-09-09/script-cue-storage.js` は `stage-sketch-script-cues` IndexedDB に PDF File / Q / anchor / 割当を一件保存する。CSVはQ表だけを入出力する。 | **製品外の試作として可**。projectId binding、製品schema、同期、外部書出しはない。 | companion fileの fixture / validator を基に、製品統合用のID・revision・asset境界を実装する。試作の保存形式を製品形式に昇格させない。 |

## 観測根拠

- `stage-sketch.js:532-560`: project export は v4 document を作り、import は project clone へ戻す。
- `stage-sketch.js` の `normalizeState()` と `loadState()`、show shelf / project switch: known project field を再構成する。workflowは現行 field list にない。
- `stage-sketch.js:22665-22673`: session bridge は export documentを作り、受信documentをimport準備へ渡す。
- `stage-session.js:540-560, 639-682`: session は bridge の export / apply に依存する。
- `mcp-server/src/stage-model.js:540-579, 601-646`: canonical document は v3、validatorも v3 を要求する。
- `mac-app/Sources/StageSketchProjectStore.swift:56-111, 209-239`: Mac storeは v3 documentとrevisionを要求する。
- `stage-audio-store.js:4-10`: 音源の実体をJSON / localStorageと分離する。
- `docs/script-cues-2026-09-09/script-cue-storage.js:1-58`: 試作はPDF・Q・割当を端末内だけで保存・復元する。

## 実装着手条件

1. browser、shelf、file import-export、session、MCP、Macの全経路に、同じ feature gate と round-trip test を用意する。
2. projectとworkflowを一体の新versionにするか、companion workflowを第一級の保存単位にするかを一つに決める。両方を暗黙に混在させない。
3. PDF Blobはmetadataから分離し、asset欠損時も cue / anchor / activity / review を失わずに再接続を求める。
4. migration は古いprojectを無言で変更しない。互換性のない入力は明示的に拒否し、ユーザーが新しい版として保存する操作を選べるようにする。
5. 人物、cue、時間の意味は既存の `SHARED_PEOPLE_CUES_TIME_CONTRACT_2026-09-09.md` を正本とする。workflowのために別の所有元を作らない。

## 未確認を事実にしないために

- この監査はソースを読んだ結果であり、workflowを実際に混ぜて書込み試験はしていない。現行データを危険にさらさないためである。
- Mac / MCPの未知 key は現状の書込みで通過し得るが、featureの意味・version・参照整合を検証しないため「workflowを安全に保存できる」ことを意味しない。
- PDF asset store、パッケージ書出し、端末間同期の実装は存在しない。台本キュー試作の端末内保存は、その代替ではない。
