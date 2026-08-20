# 発注書: 一人称「視界」モードの本体統合（2026-08-16）

- 発注: Claude（仕様・検証担当）→ Codex（実装担当）
- 対象アプリ: `shosai-app/stage.html`（舞台スケッチ）
- 参照実装: `shosai-app/.stage-sketch-mcp/prototypes/first-person/index.html`
  （動作確認済みプロトタイプ。**このファイルは変更しない。** 描画ロジックの移植元として読む）
- 本人決定（2026-08-16）: 入り口は**演者の「選んだもの」パネル**。初回統合に
  **ミニマップ・動線矢印・客席視点チップを含める**。プレゼンモード対応は**含めない**。

## 1. 何を作るか（1段落）

場面にいる演者を選ぶと「選んだもの」パネルに「この人の視界」ボタンが出る。押すと全画面の
オーバーレイが開き、その演者の目の高さから舞台を透視図で見られる。ドラッグで見回し、
画面下のチップで視点の演者を替え、場面送りもできる。✕またはEscで元の画面へ戻る。
閲覧専用であり、**ショーのデータは一切変更しない**。

## 2. ファイル構成

| ファイル | やること |
|---|---|
| `stage-first-person.js`（新規） | 視界モード本体。IIFEで `window.SHOSAI_STAGE_FPV` を公開 |
| `stage.html` | `#stage-selection-controls` 内にボタン1個、`<script src="stage-first-person.js?v=1">` を追加（stage-i18n.jsより後、stage-sketch.jsより前） |
| `stage-sketch.js` | ボタンの表示制御と `SHOSAI_STAGE_FPV.open(ctx)` 呼び出しのみ（編集は最小限に） |
| `stage-i18n.js` | 新規文言のTEXT追加 |
| `stage-sw.js` | `APP_SHELL` へ新ファイル追加、`CACHE_NAME` を v63 へ |
| `tests/stage-first-person.test.mjs`（新規） | 後述の必須テスト |

バージョン番号: `stage.html` の `stage-sketch.js?v=` と `stage-i18n.js?v=` を+1、
新ファイルは `?v=1`。

## 3. UI仕様

### 3.1 入り口

- `#stage-selection-controls` の「姿勢」ボタンの直後に:
  `<button type="button" id="stage-fpv-open" class="btn-quiet">この人の視界</button>`
- 表示条件: 選択中の駒が `type === "performer"`。それ以外（装置・照明等）では `hidden`。
- 押すと `SHOSAI_STAGE_FPV.open(ctx)`（ctxは5節）。

### 3.2 オーバーレイ（プロトタイプと同じ見た目・配色）

- `position: fixed; inset: 0` の全画面。背景 `#0d0a08`。z-indexは既存のプレゼン
  オーバーレイ（`.stage-present-close` 周辺の実装を読んで合わせる）より上。
- 構成要素（プロトタイプの index.html からCSSごと移植してよい。ID接頭辞は `stage-fpv-` に統一）:
  - 全画面canvas（描画は7節）
  - 左上: ショー名（小）／幕タイトル（小）／場面タイトル（大）
  - 右上: ミニマップcanvas 176×150（平面小図・客席が下・視点の白点と視野の扇・駒のドット）
  - 左下: 「◯◯の視界 身長◯cm・目の高さ◯m」の1行（空中時は「・空中 ◯m」を付ける）
  - その下: 視点チップ列（場面にいる演者＋最後に「客席」）。現在の視点はハイライト
  - 右下: 「◀ 前の場面」「n / N」「次の場面 ▶」
  - 中央下: 「ドラッグで見回す」ヒント（初ドラッグでフェードアウト）
  - 右上角（ミニマップよりさらに右上）: 閉じる `✕`（`aria-label="視界を閉じる"`）
- 操作: ドラッグ=見回し（世界をつかむ向き、下ドラッグ=見上げ、ピッチ±58/62°制限、
  慣性補間 `cur += (target-cur)*0.24`）。←→キー=場面送り。Esc=閉じる。
  タッチも同じ（pointer events）。
- 場面送り: 140msの黒フェードを挟む。**連打対策の pendingScene ガードをプロトタイプから
  そのまま移植する**（過去に連打でindexが壊れるバグがあった）。
- 視点の演者がその場面にいない場合: 客席視点へ落とし、トースト
  「◯◯はこの場面にいません — 客席から見ています」を2.6秒出す。
- 閉じたら: オーバーレイDOMを非表示にし、rAFループを止める（閉じたまま回し続けない）。
  再度開いたら前回の視点は引き継がなくてよい（選んだ演者で開き直す）。

### 3.3 文言とi18n

`stage-i18n.js` の TEXT へ日本語キーで追加（英訳は現場語彙で）:

- 「この人の視界」→ "View from here"
- 「視界を閉じる」→ "Close view"
- 「客席」→ 既存訳があれば再利用（`stage-i18n.js` を先に検索する）
- 「前の場面」「次の場面」→ 既存訳を再利用（プレゼン用にあるはず。無ければ追加）
- 「ドラッグで見回す」→ "Drag to look around"
- 「の視界」（名前の後置）→ " — view"（英語時は「Tower Keeper — view」の形にする）
- 「身長」「目の高さ」「空中」→ "height" / "eye height" / "in the air"
- 「はこの場面にいません — 客席から見ています」→ " is not in this scene — viewing from the house"
- 「1階中央・5列目」→ "Stalls centre, row 5"

`tests/stage-i18n-coverage.test.mjs` が拾う書き方の作法に従う（先に該当テストを読む）。

## 4. 座標系と幾何（プロトタイプ準拠・テスト対象）

- ワールド: `x = (u - 0.5) * W`、`y = 床からの高さ(m)`、`z = (v - 0.5) * D`。
  W/Dは選択中劇場の実寸（m）。天井高 `CEIL` は劇場の `height`。
- 客席カメラは `z = D/2 + 6.2`, `y = 1.35`, yaw=180（舞台向き）。
  **客席から見て u=1 が画面右**（本体の正面図と同じ向き。ここを反転させない）。
- yaw: `facing` と同じ規約。0°=客席（+z）向き、90°=上手。
  `forward = (-sin(yaw), 0, cos(yaw))`、`RIGHT = cross(forward, worldUp) = (-fz, 0, fx)`
  （**符号に注意。プロトタイプ開発時、ここの符号ミスで上下左右が反転した**）。
- 透視投影: 水平FOV 86°、`focal = (canvasW/2)/tan(fov/2)`、near面 z=0.12 で
  ポリゴン・線分をクリップ（Sutherland-Hodgman。プロトタイプの `clipPoly`/`line3` を移植）。
- 目の高さ: `eye = piece.base + H * eyeRel`。H は本体の `pieceHeightM(piece) * size/100`。
  eyeRel: 立ち/歩き/reach=0.93、sit/kneel=0.68、crouch=0.55、lie_back=0.25、
  handstand=0.3、ぶら下がり(hang)=0.85。

## 5. 本体との接続（ctx契約）

`stage-sketch.js` 側は次の形の ctx を渡す。**FPV側から本体の内部関数を直接呼ばない**
（IIFE境界を保つ。必要な値はすべてctx経由）。

```js
SHOSAI_STAGE_FPV.open({
  initialPieceId,                 // 「この人の視界」を押した駒のid
  read() => ({                    // 毎フレーム呼ばれる。現在の状態を返す
    pieces,                       // 現在場面の駒。piece.base は本体の refreshBases 計算済みの値
    sceneTitle, actTitle,         // actは属する幕（sectionタイトル）。無ければ ""
    sceneIndex, sceneCount,       // 幕見出しを除いた場面の番号
    venue: { width, depth, height },
    lang,                         // "ja" | "en"
  }),
  heightMOf(piece),               // 本体の pieceHeightM×size を包んだ関数
  labelOf(piece),                 // 表示名（本体の名前解決を使う）
  stepScene(dir),                 // ±1。幕見出しは飛ばして場面を移動（本体側で実装）
  onClose(),                      // 閉じたときに本体へ通知
})
```

- `piece.base` と `piece.supportId` は本体が既に計算している（`refreshBases`）。
  **FPV側で高さ計算を再実装しない。** ぶら下がり姿勢の判定は
  supportId が指す駒の type（tissue / trapeze / pole）と `trapMode` から行う:
  tissue または trapMode==="hang" のトラピーズで base>0 → hang 姿勢、
  trapMode==="sit" のトラピーズ → sitBar 姿勢、pole → 立ち姿勢のまま（人間旗は将来）。
- 場面切替は必ず `stepScene` 経由（本体の状態を正とする）。FPV内でsceneIndexを持たない。
- 転換アニメ中の中間座標は考えない（`piece.u/v` の最終値で描いてよい）。

## 6. 描画内容（プロトタイプから移植）

劇場の箱（床・壁・天井・1mグリッド・地明かり・舞台前端と立ち上がり・額縁）、
客席（勾配つきドット13列・中央通路）、駒:
wall/block/suitcase/trampoline/teeter=箱、table=天板+脚、chair=座面+背、
sphere=球、pole=縦線、wire=支柱2本+線、tissue=吊り線+リボン2本、
trapeze=ロープ2本+バー、cyrwheel=輪、cane=縦棒2本、light=床の明かりプール+弱いビーム、
performer=8姿勢+hang/sitBarの線画シルエット+接地影。
名前チップ（演者は常時・装置は13m以内）、動線矢印（routeの二次ベジェを床に破線+矢頭。
視点演者のは本人色で太く、他は白の15%）、弱い周辺ビネット。
描画順: 客席→（舞台内カメラ時）額縁→劇場の箱→明かりプール→動線→駒を遠い順→
（客席カメラ時）額縁→ラベル→ビネット。視点演者自身は描かない。

プロトタイプとの差分はID接頭辞・ctx経由のデータ取得・i18n対応のみに留める。
**見た目やパラメータ（色・太さ・FOV・減衰）は変えない。**

## 7. 劇場形式の扱い（初回の割り切り）

- 描画する箱・額縁・客席ドットは**プロセニアム前提**のまま全形式に使ってよい。
  ただし `venue !== "proscenium"` のときは左上タイトル下に小さく
  「劇場の箱は仮にプロセニアムで描いています」/ "Shell drawn as proscenium (approx.)"
  を出す（黙って正しく見せない。HANDOFFの方針）。
- 円形・スラストの客席配置の正確な再現は次段階。

## 8. 必須テスト（`tests/stage-first-person.test.mjs` 新規）

既存テストの流儀（vmでロードして `window.SHOSAI_STAGE_FPV` を取る）で:

1. 4点変換の固定テスト: u=0,v=0.5 → x=-W/2, z=0 ／ u=1,v=0.5 → x=+W/2 ／
   u=0.5,v=0 → z=-D/2 ／ u=0.5,v=1 → z=+D/2
2. yaw規約: facing=0 の forward が +z、facing=90 の forward が (-1,0,0)
3. RIGHTベクトル: yaw=180（客席カメラ）で RIGHT=(+1,0,0)（=u=1が画面右）
4. near面クリップ: 全点が手前の多角形は空、跨ぐ線分は交点で切られる
5. 目の高さ: base=0/立ち→0.93H、base=4.5/hang→base+0.85H
6. 開閉のライフサイクル: open→closeでrAFが止まりDOMが非表示（rAFはモックでよい）

そのため `SHOSAI_STAGE_FPV` は `open/close` に加え、テスト用に
`_geom = { toWorld, yawForward, rightOf, clipPolyNear, eyeHeight }` を公開する。

加えて **既存テストを全て通す**: `node --test tests/*.test.mjs`
（i18n coverage・sw関連のテストが新ファイル・新文言で落ちないこと）。

## 9. 制約（必ず守る）

- 既存ファイルは**編集前に必ず読み直す**（他エージェントが同じワークスペースを触る）。
- ファイルの削除・移動・リネームはしない。`.stage-sketch-mcp/` 配下は一切変更しない。
- version 3 スキーマ・保存データ・localStorage を変更しない（閲覧専用）。
- 外部ライブラリを追加しない。ネットワークへ出ない。
- `stage-sketch.js` の既存関数の挙動を変えない（追加のみ）。
- バックアップコピー（`*_backup_*`）は作らない・触らない。

## 10. 完了条件

1. `node --test tests/*.test.mjs` 全通過（新規6テスト含む）。
2. 実施内容の報告に、変更ファイル一覧・追加した文言キー・テスト結果の生出力を含める。
3. 報告とは別に、Claudeが後で照合するため、変更ファイルには余計な整形
   （既存行のインデント変更等）を混ぜない。
