# レーザー演出の可否確認・設計計画 — 作業記録（エージェント向け）

2026-09-15 ／ Claude Code（Fable 5.1）単独。判断用は同フォルダの `DECISION.html`。
このフォルダは `docs/light-rig-design-2026-09-11/laser-effects-2026-09-15/`（iCloud・パスに空白あり＝引用符必須）。

## 本人の依頼と前提

- レーザー演出（ビーム／ファン／シート／トンネル／リキッドスカイ／客席スキャン）を舞台スケッチの照明デザインで
  シミュレーションできるか確認し、できるなら設計計画を出す。実装は別セッションで合同。
- 追加指示（同日）: **細かい調整はできなくていい。雰囲気がつかめればOK。**

## 結論

できる。方式は「線と面の幾何」（DECISION §2 案A）。既存の投影 `P`・狙い点・パス・再生時計を流用し、
灯体に `kind:"laser"`、キューに `laser:{effect,spanDeg,vis}` を足すだけ。体積光（volume-light.js）は使わない。

## 読んだもの（事実）

- `shosai-app/AGENTS.md`・`BETA_UPDATE_SAFETY.md`・`docs/light-rig-design-2026-09-11/HANDOFF.md`
- 試作 `prototype/app.js`（4572行）: `drawBeam`(1358)・`spatialLight`/`compositeSpatial`(1147-1192)・
  `houseFarPoint`/`houseCutAtFront`/`beamEnd`(1791-1836)・`drawFront3D`(2033)・`BEAM_SOFT=1.26`・`VISUAL_GAIN=1.8`
- `prototype/rig-engine.js`: `newLightCue`(290)・`constrainPointToSurface`・`HOUSE_AHEAD_MAX=20`
- `prototype/volume-light.js`（108行）: もやは負荷対策で常に0（`haze=_cue=>0`）。トークン§21。
- `stage-sketch.js` の `LIGHT_KINDS`(3188): hang/ss/front/floor の4種。本体にレーザーは無い。
- 設計正本 `index.html` §4-8「光は線でなく広がる」: 本人が通常灯の線描きを「レーザーのよう」と指摘した経緯。

## 描画試験（使い捨て）

- `spike/index.html`: 単独HTML。簡易透視（目 y=D+10, z=3.2, F=1500, NEAR=0.6）。中ホール 12×9×8。
  奥バトン h=6.5 に 1〜8 台。線＝にじみ(9px α.10)＋芯(1.6px α.85)、合成 lighter。面＝多角形 α.16。
- `spike/measure.cjs`: Codexランタイムの Playwright
  (`/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`) で
  ヘッドレスChromium 1000×660。各効果 4台で fps（rAF 2秒）と `__SPIKE.ms`（CPU側の発行時間）を計測、PNGを `evidence/` へ。

| 効果 | 台数 | 線 | fps | ms(CPU) |
|---|---|---|---|---|
| beam | 4 | 4 | 50.3 | 0.08 |
| fan | 4 | 48 | 50.3 | 0.10 |
| sheet | 4 | 32 | 50.1 | 0.10 |
| tunnel | 4 | 144 | 50.3 | 0.10 |
| liquid | 4 | 36 | 50.3 | 0.11 |
| audience | 4 | 40 | 50.4 | 0.07 |
| 6種同時 | 8 | 608 | 24.6 | 0.43 |

- 落とし穴: Browser pane 内で rAF の fps を測ると 1〜2fps（パネルが非表示扱いで間引かれる）。
  fps は Playwright で測ること。`performance.now()` の差はGPU描画を含まない。
- 試験で見えた要修正: 線が天井を突き抜ける（製品では `dims.H` で止める）／演者の手前を通る線が体に乗る
  （製品では描き順で近似）。

## 安全の一次情報

- LASA安全講習テキスト2025（`lasa-info.jp`）: JIS C 6802:2014 JA.3.4 の引用（管理されていない区域はクラス1・2・可視3Rが望ましい、
  それ以外はリスク評価＋訓練を受けた操作員＋観客のMPE保護）。観客10秒・関係者0.25秒の露光時間。
- アプリは判定せず、客席スキャンのカードに「案」ラベルと一文だけ。

## 未実施

- 試作本体（app.js）への組み込み・実機GPUでの計測・Safari確認。
- 本体 stage-sketch.js への統合（範囲外）。

## 2026-09-15（続き）本人「OK」後の詰め（実装はまだ・別セッション待ち）

本人指示: 「アプリの方では他のことをやっている（app.js等は別セッションが同時編集中）ので、実装を伴うものは別として、
そこまでの分（設計）を詰めたい」。→ 共有ファイル（prototype/app.js・index.html・rig-engine.js）には一切触れず、
このフォルダ内の新規ファイルとdesign/トークンシートだけを更新。着手前後でapp.js/index.htmlのmtimeが動いているのを確認済み
（他セッションが実際に稼働中）。

### やったこと
- DECISION.html の3問を「OK」＝推奨案で確定として明記（§判断してほしいこと→確定、§9も確定事項に改題）。
- §5.5 UI文言を追加（カード名・つまみラベル・注意文の確定文言。実装セッションでの言い回し確認を省略できるように）。
- §8.5 テスト観点を追加（`tests/light-rig-laser.test.mjs` 用のケース一覧。関数の入出力を明示）。
- 4図確認の追加試験 `spike/multiview.html`＋`spike/measure-multiview.cjs`: トラス／床／前 の3か所×代表効果で
  平面・側面・正面2D・正面3D を同時表示。置き場所ごとに「中心方向ベクトル」だけ変え、線の生成ロジックは共通にできることを確認。
  - ★軸がほぼ鉛直（床置き上向き）でもローカル基底（右・上ベクトル）が縮退しないよう、`volume-light.js compile()` と同じ
    参照ベクトル切替（`|axis.z|<0.95` で分岐）を試験にも実装。
  - ★試験中に実際の不具合を再現: 光源が客席側（FOH・S.y≥D）にあるとき、「客席へ向かう光は正面図の手前端Dで切る」処理を
    ガード無しで当てると光源自体も切られて正面図が空白になった。本体の `houseCutAtFront` には最初からこのガード
    （`S.y >= D なら切らない`）が入っている＝**新規実装せず本体の関数をそのまま呼ぶ**という設計方針（§4）を裏付ける実例になった。
    修正後のスクリーンショットで正常表示を確認、`evidence/laser-4view-front-audience.png` に反映済み。
- トークンシートの `spanDeg` 既定値に「推測（実機の固定仕様ではない）」の注記を追加。追加調査
  （Pangolin "Understanding Scan Angles"）で「エンタメ用レーザーの実効スキャン角はおおむね40〜60°」という一般論のみ確認、
  効果ごとの標準角度という一次資料は見つからず→ファンの60°はその範囲に収めたが、他は見た目基準の推測と明記。

### 変わっていないこと
- 方式（線と面の幾何・体積光は使わない）・データ設計（`fixture.kind`/`light.laser`）・描画の描き順・安全の扱いは前回のまま。
- 試作本体（app.js等）への実装は依然として未着手。次に着手する側は DECISION.html §8（実装計画）と §8.5（テスト観点）から始められる。

## 引き継ぎプロンプト（2026-09-15）

`HANDOFF_PROMPT.md` を作成。実装セッションへそのまま貼れる自己完結の指示書。
要点: 設計はやり直さない／共有ファイル衝突を減らすため新規2ファイル（`laser-effects.js`＋`laser-effects-ui.js`）に寄せ、
app.js は `window.__RIG` への描画フック追加だけにする／`houseCutAtFront` は必ず本体のものを呼ぶ／
fps は Playwright で測る（Browser pane 内では間引かれる）／公開は本人の指示待ち。
★index.html の `?v=` 書式は現在 `20260915-N-ラベル`（UNIX秒形式ではない）。script は現在8本。

## 2026-09-15 実装結果

- 独立試作に `kind:"laser"` を追加し、ビーム／ファン／シート／トンネル／リキッドスカイ／客席スキャン（案）を平面・側面・正面2D・正面3Dへ描画した。
- 幾何と描画は `prototype/laser-effects.js`、確定UI語彙は `prototype/laser-effects-ui.js` に分離した。通常灯の `drawBeam` と体積光は通さず、レーザーは光だまり・暗転の穴を作らない。
- 配置入口、一覧の◆印、5色、広がり、速さ、見え方、強さ、客席スキャンの安全警告を実装。既存の狙い・再生時計を共有する。
- 「8人のサーカス」と `?example=back` に、ファンとトンネルのレーザーを各1台追加した。
- `tests/light-rig-laser.test.mjs` 8件を追加。関連回帰を合わせた72件、各JSの構文確認、Chromium実画面とコンソールを確認した。
- 本体 `stage-sketch.js`、生成物 `stage.html`、保存形式、ベータ配布物には触れていない。
