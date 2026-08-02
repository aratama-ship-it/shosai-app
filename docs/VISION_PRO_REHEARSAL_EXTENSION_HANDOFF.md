# 舞台スケッチ × Vision Pro 実寸稽古拡張 — 引き継ぎ資料

- 作成日: 2026-07-30
- 対象:
  - 舞台スケッチ: `show-creative-ideas/shosai-app`
  - 既存Vision Pro試作: `apps/visionpro/show-staging-planner`
- 状態: **統合方針と実装契約の引き継ぎ。統合コードは未実装**
- 読者: 舞台スケッチ／visionOSを引き継ぐ本人、Codex、Claude Code、開発協力者

## 0. 最初に読む要約

この統合では、**舞台スケッチを制作データの正本**、既存のVision Proアプリを
**実寸・一人称で立ち位置を稽古するコンパニオン**として扱う。

第一段階では、Swiftコードを舞台スケッチへ移植したり、Web上でVision Pro体験を再現したりしない。
舞台スケッチに「Vision Pro稽古用JSONを書き出す」機能を追加し、そのJSONをiCloud Drive経由で
Vision Proアプリへ読み込ませる。

```text
舞台スケッチ version 3 JSON（制作の正本）
        │
        │ 決定的な変換。元データは変更しない
        ▼
StageDocument schemaVersion 2 JSON（稽古用の派生成果物）
        │
        │ iCloud Drive／ファイル選択
        ▼
Vision Proアプリ（本人役を選び、一人称・実寸で再生）
```

この境界なら、舞台スケッチの場面・道具・照明・メモを失わず、Vision Pro側は現在の
軽量な稽古機能を維持できる。二つのアプリが同じ作品を別々に編集する「二重の正本」も避けられる。

## 1. 統合の目的

### 解く問題

舞台スケッチで作った場面の並びと演者配置を、演者本人が本番前に一人称・実寸で体験する。
特に次の二点を助ける。

1. 次の行動に迷わない。
2. 仲間がどこにいて、どこへ動くかを予測できる。

既存Vision Pro試作の価値は、2Dの俯瞰図をもう一つ見せることではない。
「いま自分が舞台上のこの位置にいて、周囲がこう見え、次にここへ進む」という視覚的な手がかりを、
本番に近い視野で先に経験できることにある。

### 非目標

- 実際の舞台稽古、専門家の安全確認、振付の筋肉記憶を代替しない。
- ゴーグルを装着したまま激しいダンス、ジャグリング、アクロバットを行わせない。
- 動線が衝突しないこと、リギング・荷重・落下防止・救助手順を保証しない。
- 第一段階では、舞台スケッチの大道具、空中器具、照明、背景、姿勢をすべて3D化しない。
- 第一段階ではリアルタイム共同編集やVision Proからの逆編集を行わない。

## 2. 現在の二つのシステム

### 2.1 舞台スケッチ

確認した正本形式:

```json
{
  "kind": "shosai-stage-sketch",
  "version": 3,
  "project": {
    "id": "...",
    "title": "...",
    "versionLabel": "v1",
    "venue": "proscenium",
    "venueSize": "mid",
    "venueDims": null,
    "cast": [],
    "sets": [],
    "rigs": [],
    "scenes": []
  }
}
```

現在あるもの:

- `Project → Scene → Piece` の構造
- プロセニアム、スラスト、円形、屋外、ブラックボックスの劇場形式
- プリセット寸法とカスタム寸法
- 演者名簿、身長、色
- 場面ごとの演者・装置・照明配置
- 演者の向き、姿勢、場面間の曲線動線
- 正面図／平面図、客席位置、PNG書き出し
- ブラウザ内保存、version 3 JSON入出力
- ローカルMCPの下書き・履歴・revision競合拒否

現在ないもの:

- 作品データとして保存される場面ごとの滞在時間・移動時間
- BPM、拍、小節、タイムコードを持つ稽古タイムライン
- 作品へ関連付けた音源の受け渡し
- Vision Pro用JSONの書き出し

`sceneAnimMs` はブラウザで場面を切り替える表示速度であり、ショーの時間情報ではない。
Vision Pro用の移動時間として流用しない。

### 2.2 Show Staging Planner（Vision Pro試作）

場所:

`apps/visionpro/show-staging-planner`

現在あるもの:

- `StageDocument schemaVersion 2` JSONの読込と検証
- 実寸舞台、マーレー床、前方約50cmの木部、客席、劇場シェル
- 床校正、舞台中央・客席方向の校正
- 本人役の選択
- 他演者の軽量マーカー、名前、身体の向き
- 次の立ち位置を示す足元矢印
- キューの前後移動と暗転ジャンプ
- 全キューの連続再生、ステイ、移動、一時停止、再開
- 0.25／0.5／1.0倍速
- 頭部・視線はVision Proの追跡を維持し、カメラ姿勢を上書きしない
- 連続移動中の弱い周辺ビネット
- 操作盤の手元／頭上切替
- 内蔵音源 `River Train Blues` の音程維持再生

現在の入力形式:

```json
{
  "schemaVersion": 2,
  "id": "show-id",
  "title": "Show title",
  "stage": {
    "widthMeters": 16,
    "depthMeters": 12,
    "floorHeightMeters": 0,
    "platformHeightMeters": 0
  },
  "environment": {
    "presetName": "preShowFullHouse"
  },
  "performers": [],
  "formations": [],
  "cues": [],
  "timeline": {
    "primaryMode": "ordered"
  }
}
```

重要な制限:

- 現在の劇場3Dは実質的にプロセニアム用。舞台スケッチの5形式を再現しない。
- 演者の身長は舞台スケッチにあるが、Vision Proマーカーは現在固定高。
- Vision Pro側は直線＋smoothstepで移動し、舞台スケッチの曲線動線をまだ読まない。
- 姿勢、大道具、照明、背景、場面メモは現在の`StageDocument`に入らない。
- 音源はアプリ同梱の固定ファイルで、読み込んだJSONに音源情報はない。

## 3. 採用する責務分担

| 項目 | 正本／責任を持つ側 | 備考 |
|---|---|---|
| ショー名、版、場面順 | 舞台スケッチ | Vision Pro側で編集しない |
| 演者名簿、色、身長 | 舞台スケッチ | 身長のVR反映は将来 |
| 立ち位置、身体の向き | 舞台スケッチ | Vision Proへ変換する |
| 曲線動線 | 舞台スケッチ | 初期変換では終点のみ使用 |
| ステイ・移動時間 | 舞台スケッチへ新設 | 表示用`sceneAnimMs`と分離 |
| 音源との関連 | 舞台スケッチへ新設 | バイナリ配送は別工程 |
| 実床の高さ、原点、客席方向 | Vision Proの実行時 | 作品JSONへ保存しない |
| 本人役、再生速度、パネル位置 | Vision Proの稽古設定 | ショーの恒久データにしない |
| 3D Entity生成、快適性処理 | Vision Pro | StageCore／visionOS側 |
| 稽古用JSON | 舞台スケッチから生成 | 派生成果物。正本にしない |

現在別にある`editor-web/`のFormation Deskは、統合後に第三の正本として残さない。
必要な編集機能が舞台スケッチへ入った段階で、Formation Deskはデモ／検証用へ格下げするか、
変換テストのfixtureとして残す。

## 4. 座標変換

### 舞台スケッチ

- `u = 0`: 上手側
- `u = 1`: 下手側
- `v = 0`: 舞台奥
- `v = 1`: 客席側／舞台前方
- `facing = 0°`: 客席
- `facing = 90°`: 上手
- `facing = 180°`: 舞台奥
- `facing = 270°`: 下手

### Vision Pro

- 単位: 1.0 = 1m
- 原点: 舞台中央・床面
- `+X`: 上手
- `-Z`: 客席方向／舞台前方
- `yawDegrees = 0°`: 客席方向

### 変換式

```js
const x = (0.5 - piece.u) * stageWidthMeters;
const z = (0.5 - piece.v) * stageDepthMeters;
const y = 0;
const yawDegrees = piece.facing;
```

向きの0度と回転方向は両システムで一致するため、`facing`をそのまま`yawDegrees`へ渡す。

確認例:

| 舞台スケッチ | Vision Pro |
|---|---|
| `u=0, v=0.5`（上手中央） | `x=+width/2, z=0` |
| `u=1, v=0.5`（下手中央） | `x=-width/2, z=0` |
| `u=0.5, v=0`（舞台奥中央） | `x=0, z=+depth/2` |
| `u=0.5, v=1`（舞台前中央） | `x=0, z=-depth/2` |

この4点は変換器の固定テストにする。左右反転・前後反転を画面の見た目だけで判定しない。

## 5. version 3 → schemaVersion 2 の変換契約

### 5.1 プロジェクト

| 舞台スケッチ | 稽古用JSON |
|---|---|
| `project.id` | `id` |
| `project.title` | `title` |
| 選択劇場の`width` | `stage.widthMeters` |
| 選択劇場の`depth` | `stage.depthMeters` |
| なし | `stage.floorHeightMeters = 0` |
| なし | `stage.platformHeightMeters = 0` |
| `project.venue`が`proscenium` | `environment.presetName = "preShowFullHouse"` |

`floorHeightMeters`は歴史的な互換フィールドであり、現実床の校正値を入れない。
舞台スケッチの劇場`height`も台高ではないので`platformHeightMeters`へ入れない。

第一段階では`proscenium`以外を黙ってプロセニアムへ変換しない。
「Vision Pro側がこの劇場形式に未対応」と明示して書き出しを止めるか、本人が
「仮のプロセニアムとして確認する」と選んだ場合だけ警告付きで続ける。

### 5.2 演者

```js
performers = project.cast.map((member) => ({
  id: member.id,
  name: member.name,
  role: "member",
  colorHex: member.color,
  markerStyle: "directional"
}));
```

- `cast.id`をそのまま安定IDとして使う。
- `role`は舞台スケッチにまだないため、初期値は`member`。
- 本人役はVision Proで稽古開始時に選ぶ。`lead`を恒久的に焼き込まない。
- `heightCm`は元データに残すが、現行VR形式には書き出さない。

### 5.3 場面、配置、キュー

- `project.scenes`のうち`kind === "scene"`だけを順番に使用する。
- `kind === "section"`は編集上の見出しであり、キューにしない。
- 各sceneからformationを1件、cueを1件作る。
- `piece.type === "performer"`かつ有効な`castId`を持つpieceだけをplacementへ変換する。

推奨する安定ID:

```js
formation.id = `formation-${scene.id}`;
cue.id = `cue-${scene.id}`;
cue.formationID = formation.id;
cue.orderKey = String((sceneIndex + 1) * 100).padStart(6, "0");
```

同じ場面を書き出し直したときにIDを作り直さない。場面への注釈や将来のキューシートが
参照を維持できるようにする。

### 5.4 人物の在／不在

- そのsceneに人物pieceがある: formationへ含める。
- 次sceneにだけ人物がいる: 到着時までVR上で非表示。
- 現sceneにいて次sceneにいない: 現行VRは到着時まで元位置へ残し、その後非表示。

明示的な入場・退場経路は現行VR形式にない。袖への動線を正確に見せるのは将来対応とする。

### 5.5 現在は変換しないデータ

次は舞台スケッチの正本へ残し、初期の稽古用JSONでは落とす。ただし削除はしない。

- `sets`、`rigs`
- 照明pieceとbeam
- 背景、写真、描画stroke
- 演者の`pose`
- pieceの`size`
- sceneのメモと付箋
- 曲線動線の制御点
- 客席視点と画面レイアウト

「変換されない」ことを、書き出し完了画面の警告として表示する。

## 6. 舞台スケッチへ追加する最小データ

以下は**実装提案**であり、現行version 3にはまだ存在しない。

### 6.1 場面ごとの稽古時間

制作時に理解しやすいよう、各sceneへ次を追加する。

```json
{
  "rehearsal": {
    "holdDurationSeconds": 2.0,
    "transitionToNextSeconds": 3.2
  }
}
```

意味:

- `holdDurationSeconds`: この場面へ到着後、留まる時間
- `transitionToNextSeconds`: この場面から次の場面へ移動する時間

Vision Proの`transitionDurationSeconds`は「到着先のcue」に付くため、変換時は次のようにずらす。

```js
cue[i].holdDurationSeconds = scene[i].rehearsal.holdDurationSeconds;
cue[0].transitionDurationSeconds = 0;
cue[i].transitionDurationSeconds =
  scene[i - 1].rehearsal.transitionToNextSeconds; // i > 0
```

未入力時に勝手な本番時間を作らない。初回書き出しでは未入力場面を一覧表示し、
本人が共通初期値を適用するか、場面ごとに入力する。

### 6.2 プロジェクト単位の稽古設定

将来拡張を散らさないため、`project.rehearsal`を一か所だけ追加する案:

```json
{
  "rehearsal": {
    "version": 1,
    "primaryMode": "ordered",
    "soundtrack": null
  }
}
```

`normalizeState()`、JSON入出力、MCPの`stage-model.js`のすべてでこのフィールドを保持する。
ブラウザ版だけが保存し、MCP読み込みで消える状態を作らない。

BPM、小節、台詞キュー、Qシートはこの領域を将来拡張するが、第一段階では`ordered`だけにする。

## 7. 音源の扱い

### 確認済みの現状

- `River Train Blues`はVision Proアプリのbundleに固定で入っている。
- `AVAudioEngine`、`AVAudioPlayerNode`、`AVAudioUnitTimePitch`を使用する。
- 0.25／0.5／1.0倍で音程を保つ設計。
- 再生中は音源の消費時刻を舞台タイムラインの主時計にする。
- JSONは音源ファイル名や参照を持たない。

### 第一段階

Stage SketchのJSON書き出し統合を先に完成させる。
音源は「内蔵デモを使う／音なし」の明示選択とし、舞台スケッチのJSONへ
このMacだけで有効な絶対パスを保存しない。

### 第二段階

任意音源を渡す場合は、単一JSONではなく次のような移送単位を設計する。

```text
ShowName.stage-rehearsal/
  document.json
  manifest.json
  audio/
    soundtrack.mp3
```

`manifest.json`には少なくともファイル名、MIME type、長さ、SHA-256を持たせる。
Vision Pro側はパッケージ全体を読み込み、ハッシュ、形式、長さを検査する。

未決定事項:

- 音源がタイムラインより短い場合に、停止、無音継続、ループのどれにするか
- クラウド同期時の容量上限と権利確認
- 音源差し替え時のrevisionとキャッシュ無効化

これらを決めるまで、音源バイナリを舞台スケッチのlocalStorageやversion 3 JSONへ埋め込まない。

## 8. 推奨する実装順

### Milestone 1 — 純粋な変換器

舞台スケッチ側に、DOMやlocalStorageへ依存しない変換モジュールを追加する。

推奨ファイル:

```text
shosai-app/
  stage-rehearsal-export.js
  tests/
    stage-rehearsal-export.test.mjs
```

入力: 舞台スケッチversion 3の`project`

出力:

```js
{
  document, // StageDocument schemaVersion 2
  warnings,
  omittedFeatures
}
```

変換器は入力projectを変更しない。

必須テスト:

1. 上手・下手・奥・前の4点変換
2. `facing`と`yawDegrees`の一致
3. sectionを飛ばしたscene順
4. cast ID、formation ID、cue IDの安定性
5. sceneにいない人物の扱い
6. 重複cast配置の拒否
7. 不正数値、0以下の舞台寸法の拒否
8. proscenium以外の警告／拒否
9. 滞在時間と移動時間の1場面ずらし
10. 入力projectが変化していないこと

### Milestone 2 — 舞台スケッチUI

- 各場面に「留まる」「次へ移動」を追加
- 保存パネルに「Vision Pro稽古用JSON」を追加
- 書き出し前の検査結果を表示
- 変換しない要素を明示
- ファイル名は例として`ShowName-v1.rehearsal.json`

通常の「このショーを書き出す」はversion 3の正本を出し続ける。
Vision Pro用書き出しで置き換えない。

### Milestone 3 — Vision Proで一周

1. Macの舞台スケッチで2〜3場面、2〜3人の小さなショーを作る。
2. Vision Pro稽古用JSONを書き出す。
3. iCloud Driveへ保存する。
4. Vision Proアプリの「JSONを読み込む」から選ぶ。
5. 本人役を選び、床・中央・客席方向を校正する。
6. 暗転ジャンプと連続再生を試す。
7. 左右、前後、身体の向き、移動矢印、ステイ時間を照合する。

### Milestone 4 — 曲線、身長、Qシート

第一段階の一周が実機で合格した後に追加する。

- 曲線動線／経由点
- 演者身長
- 場面メモ、次の行動、注意事項を表示する個人Qシート
- BPM／小節／台詞／タイムコードのアンカー
- 任意音源パッケージ
- 照明と軽量客席モニター

## 9. 受け入れ条件

統合の第一段階は、次をすべて満たしたときに完了とする。

- 舞台スケッチversion 3が引き続き正本として保存・読込できる。
- 同じprojectから、同じIDと数値の稽古用JSONを何度でも生成できる。
- 変換器が入力projectを変更しない。
- 四隅の座標と0／90／180／270度の向きがVision Proで一致する。
- 場面順、人物の在／不在、ステイ、移動時間が一致する。
- Vision Proで本人役を切り替えられる。
- 一時停止／再開で位置が飛ばない。
- 退出後に音、移動Task、古いWorldTrackingProviderが残らない。
- 非対応の劇場、装置、照明、姿勢、曲線が黙って「対応済み」に見えない。
- 実機テスト結果を、ビルド成功と分けて記録する。

## 10. 現時点の検証状態

### 確認済み

- 2026-07-30に舞台スケッチMCPの6テストを再実行し、6件成功・失敗0。
- 2026-07-30にStageCoreのモデル、検証、タイムラインを再テストし、24件成功・失敗0。
- visionOSの署名なしビルドは成功記録がある。
- 全5配置の連続再生と周辺視野軽減は、2026-07-21の実機確認で本人評価
  「完璧」「だいぶいい」と記録され、実用上合格扱い。
- JSONの手動読込UIは実装済み。
- 再入場時に停止済み`WorldTrackingProvider`を再利用していたクラッシュ原因は修正済み。

### 最終記録では未判定

- 足元矢印が実際の次移動方向を示すか
- 操作盤の頭上位置
- 舞台前端のちらつき修正
- 0.25／0.5／1.0倍の実機体感
- `River Train Blues`の可聴同期、低速音質、実機負荷
- 舞台スケッチversion 3からの実変換

ビルド成功、Simulator確認、実機確認、本人の体感評価を混同しない。

## 11. 安全・プライバシー・同期

- Vision Pro稽古時は約1mを片付け、立った状態で床校正し、その場から歩かない。
- 強い移動感、酔い、床ずれ、フリーズがあれば直ちに一時停止またはDigital Crownで現実へ戻る。
- 舞台スケッチとVision Proは衝突回避、安全距離、技の成立を保証しない。
- 演者名、役割、Qシートは個人・制作情報になり得る。公開カタログや`db.js`へ混ぜない。
- 舞台スケッチはローカルファーストを維持する。
- オンライン同期を導入しても、現在のversion 3正本を丸ごと保存する設計を維持し、
  稽古用JSONは必要時に再生成する。
- Supabase JS SDKや外部スクリプトを安易に追加しない。既存の名簿タブのプライバシー境界を守る。

## 12. 参照する正本ファイル

### 舞台スケッチ

- `README.md`
- `stage-sketch.js`
- `stage-venues.js`
- `SYNC_DESIGN.md`
- `mcp-server/README.md`
- `mcp-server/src/stage-model.js`
- `mcp-server/src/schemas.js`
- `mcp-server/src/project-store.js`

### Vision Pro

- `docs/DESIGN.md`
- `PROJECT_NOTES.md`
- `docs/PHASE_3_DEVICE_TEST.md`
- `app/StageCore/Sources/StageCore/Model/StageDocument.swift`
- `app/StageCore/Sources/StageCore/Model/StageCoordinateConvention.swift`
- `app/StageCore/Sources/StageCore/Model/RehearsalDocumentValidator.swift`
- `app/StageCore/Sources/StageCore/Model/RehearsalPlaybackTimeline.swift`
- `app/StageCore/Sources/StageCore/Scene/PerformerMarkerBuilder.swift`
- `app/visionOS/VisionStageSession.swift`
- `app/visionOS/RehearsalSoundtrackPlayer.swift`
- `app/visionOS/StartView.swift`

## 13. 開発確認コマンド

舞台スケッチMCP:

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/mcp-server"
npm test
```

StageCore:

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/apps/visionpro/show-staging-planner/app/StageCore"
swift test
```

visionOS署名なしビルド:

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/apps/visionpro/show-staging-planner"
xcodebuild -project app/ShowStagingPlanner.xcodeproj \
  -scheme ShowStagingPlanner \
  -configuration Debug \
  -destination 'generic/platform=visionOS' \
  -derivedDataPath /tmp/show-staging-derived \
  CODE_SIGNING_ALLOWED=NO build
```

署名なしビルドは実機での起動、音、快適性、安全境界を証明しない。

## 14. 実装開始前に本人へ確認する三点

1. 第一段階のVision Pro対象劇場をプロセニアムだけに限定してよいか。
2. 場面時間を「この場面に留まる時間／次へ移動する時間」の二欄で持つか。
3. 初回は固定音源または音なしでJSON連携を完成させ、任意音源パッケージを第二段階へ分けてよいか。

この三点以外は、上記の変換器とテストから安全に着手できる。
