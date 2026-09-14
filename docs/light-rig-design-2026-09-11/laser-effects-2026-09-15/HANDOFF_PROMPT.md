# 引き継ぎプロンプト — 照明デザイン試作に「レーザー演出」を実装する

2026-09-15 作成（設計セッション → 実装セッションへの引き継ぎ）。
**このファイルの下の「引き継ぎプロンプト本文」をそのまま新しいセッションへ貼れば着手できる。**
設計は完了済み・本人承認済み。実装だけが残っている。

---

## 引き継ぎプロンプト本文（ここから下をコピーして新セッションへ貼る）

舞台スケッチの照明デザイン試作に「レーザー演出」（ビーム／ファン／シート／トンネル／リキッドスカイ／
客席スキャン）を実装してください。**設計は2026-09-15に完了し、本人の承認も取れています。あなたの仕事は
設計どおりに実装することです。設計をやり直さないでください。**

### 0. 最初に読むもの（この順で・全文）

作業場所は iCloud 上。パスに空白があるので**コマンドでは必ず引用符**を付けてください。

```
/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/
```

1. `AGENTS.md` と `BETA_UPDATE_SAFETY.md` — 舞台スケッチの既存ユーザー保護規則（本人指示・必読）
2. `docs/light-rig-design-2026-09-11/HANDOFF.md` — 照明試作そのものの引き継ぎ書（運用ルール・公開手順・落とし穴）
3. **`docs/light-rig-design-2026-09-11/laser-effects-2026-09-15/DECISION.html`** ← 今回の設計の正本。
   §3（データ設計）・§4（幾何と描画）・§5＋§5.5（UIと確定文言）・§8（実装計画）・§8.5（テスト観点）が仕様です。
4. `docs/light-rig-design-2026-09-11/laser-effects-2026-09-15/notes.md` — 設計時の作業記録と既知の落とし穴
5. `design/TOKEN_SHEET_laser-effects_2026-09-15.md` — 色・線の太さ・α・効果ごとの定数（数値の正本）

動く参考物（使い捨ての試作。**製品コードではないので写経せず、考え方だけ見る**）:
- `laser-effects-2026-09-15/spike/index.html` — 6効果の描画と負荷試験
- `laser-effects-2026-09-15/spike/multiview.html` — 4図×3か所の置き場所
- `laser-effects-2026-09-15/evidence/*.png` — 上の2つのスクリーンショット

### 1. 絶対に守る運用ルール

- **別セッションが同じリポジトリの `prototype/app.js`・`index.html` を同時編集しています。**
  着手前と編集直前に `stat -f '%Sm %z'` で更新時刻とサイズを確認し、**読み込み→編集→書き込みを1回で**
  済ませてください（書き込み途中のファイルを読むと壊れた内容を掴みます。2026-09-14に実際に起きました）。
- **禁止**: `git add -A` ／ 素の `git commit` ／ `git merge` ／ `git pull` ／ `git reset --hard` ／ **`git rebase`**
- 公開する場合は `PUBLISH_RULES.md` と `HANDOFF.md` §2 の**経路A（一時インデックス）**のみ。
  ただし**公開は本人の指示があってからです。勝手に push しないでください。**
- JS を変えたら `index.html` の `?v=` を上げます。**現在の書式は `?v=20260915-N-ラベル`**
  （例: `app.js?v=20260915-23-aim-labels`）。昔のUNIX秒形式に戻さないでください。
- 本人へは日本語で報告してください。

### 2. 実装するもの（設計の要点・詳細は DECISION.html）

**方式**: レーザーは「もや（体積光）」ではなく**線と面の幾何**として描きます。
`volume-light.js`（体積光）は使いません。既存の `drawBeam` も通しません（別関数にします）。

**データ**（既存の2層に足すだけ・新しい概念を作らない）:
```js
fixture = { id, kind: "laser", mount: { type: "truss"|"floor"|"front", ... } }  // kind 未設定＝従来の灯体
cue.lights[fid] = {
  on, level, color,                         // 既存
  surface: "air"|"floor"|"back"|"house",    // 既存。中心方向＝光源S→狙い点
  path, periodSec,                          // 既存（往復・円・鏡・組・速さがそのまま効く）
  laser: { effect: "beam"|"fan"|"sheet"|"tunnel"|"liquid"|"audience", spanDeg: 60, vis: 60 }
}
```
中心方向・動き・時計は**既存のものを流用**します。レーザー専用の狙い点UIや動きUIは作りません。

**幾何**（`rig-engine.js` に純関数として追加・テスト対象）:
- `laserRays(effect, S, axis, spanDeg, phase, dims)` → 方向ベクトルの配列
- `laserLanding(S, d, dims, reach)` → `{ world, on: "floor"|"back"|"ceil"|null }`
  **天井（`dims.H`）で止める分岐は新規**です（既存 `beamLanding` は床と奥壁のみ）。
- 中心方向がほぼ鉛直（床置きの上向き）でローカル基底が壊れないよう、`volume-light.js` の `compile()` と
  **同じ参照ベクトル切替**（`|axis.z| < 0.95` で分岐）を使ってください。自分で考案しないこと。

**描画**（4図共通の1関数 `drawLaser`）:
- 線＝にじみ（太・薄）＋芯（細・濃）の2ストローク、合成は `lighter`。面＝多角形の薄塗り。数値はトークンシート§2。
- 描き順: ホリゾント → **レーザー** → 演者・セット → 通常の光 → 暗転マスク → **レーザーをもう一度薄く（α×0.35）**
- 暗転（室内灯を消す）の穴は**作りません**（レーザーは光だまりを作らないので `litSpots` へ積まない）。
- **客席へ向かう光の扱いは、本体の `houseCutAtFront` と `houseFarPoint` をそのまま呼んでください。**
  自分で書き直すと、光源自体が客席側（FOH位置・`S.y >= D`）にあるときのガードが抜けて
  正面図が空白になります（設計時の試験で実際に踏んだ不具合。DECISION.html §1.5）。

**UI**: 灯体情報パネル内に見本カード6枚（**切り替え式**。押すとそれだけになる）＋色5色チップ＋広がり＋速さ＋見え方。
**文言は DECISION.html §5.5 の表をそのまま使ってください**（本人確認済みの確定文言です）。
客席スキャンのカードには常時「案」ラベルと注意文を出します。**アプリは安全判定をしません。数値（距離・出力）も書きません。**

### 3. 共有ファイルの衝突を減らす構成（推奨・2026-09-14 の「あるある」で実績あり）

`app.js` への変更を最小にするため、次の分け方を推奨します。

- 新規 `prototype/laser-effects.js` — 純関数（`laserRays` / `laserLanding` / 効果ごとの定数）
- 新規 `prototype/laser-effects-ui.js` — カードとつまみのUI
- `rig-engine.js` — 幾何を置く場合はここでも可（`RIG_ENGINE` の凍結オブジェクトへ追加）
- `app.js` への変更は**描画フックの追加だけ**に絞る:
  既存の窓口 `window.__RIG`（`app.js` 末尾・`hooks` に内部関数を貸している）に**描画フックを1つ足し**、
  4つの描画関数（`drawPlan` / `drawSide` / `drawFront` / `drawFront3D`）と暗転後の重ねパスから呼ぶ。
  これで `app.js` の変更は5か所程度の小さな挿入で済み、並行編集との衝突面が最小になります。
- `index.html` へは `<script>` を2本足すだけ（現在8本あります）。

この構成が難しいと判断したら、理由を添えて本人に相談してから変えてください。

### 4. 実装順（DECISION.html §8）

1. 幾何 `laserRays` / `laserLanding` ＋テスト（**テストのケース一覧は DECISION.html §8.5 にあります。そのまま使ってください**）
2. 描画 `drawLaser` を4図へ。描き順・暗転の上の薄重ね・光源のまぶしさ（既存 `drawGlare` を level×0.6）
3. UI（カード6枚・つまみ・一覧の印 ◇・注意文）
4. 見本データ: 「8人のサーカス」の1場面にレーザー2台（奥バトン中央にファン、床にトンネル）
5. 検証（下記§5）
6. 記録: 設計正本 `docs/light-rig-design-2026-09-11/index.html` に §4-21 として追記、
   トークンシートと `HANDOFF.md` も更新

目安は全体で1.5日。1〜2は仕様が確定しているので手を動かす作業です。

### 5. 検証（やり方が決まっています）

```bash
# 構文
node --check "<prototype>/app.js" && node --check "<prototype>/laser-effects.js"

# テスト（既存が壊れていないことも確認する）
cd "<shosai-app>" && node --test tests/stage-light-rig.test.mjs        # 現在 12/12 pass
cd "<shosai-app>" && node --test tests/light-rig-proto-frame.test.mjs  # 現在 7/7 pass
cd "<shosai-app>" && node --test tests/light-rig-laser.test.mjs        # 新規

# ローカルサーバ（ターンをまたぐと落ちるので nohup で切り離す）
cd "<prototype>" && nohup python3 -m http.server 8791 >/dev/null 2>&1 &
```

- ブラウザ確認は Browser pane（`http://localhost:8791`）。
- **見た目の主張は画素で実測してから報告**してください（HANDOFF.md の「落とし穴」）。
- スクリーンショットの証拠は Playwright で撮ります。ランタイムはここにあります:
  `/Users/arata/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`
  （書き方の例は `laser-effects-2026-09-15/spike/measure-multiview.cjs`）
- **fps を測るときは Playwright を使ってください。** Browser pane 内で `requestAnimationFrame` を数えると
  非表示扱いで間引かれ、1〜2fps という誤った値が出ます（設計時に踏みました）。
- 負荷の確認: 画面上部の「描画 ms／回」で、レーザー2台を足す前後を比べます。目安は **+1ms 以内**。
  設計時の使い捨て試験では、4台で1コマ0.1ms前後・約50fps、6種×8台（線608本）で24.6fps でした
  （ヘッドレスChromium・GPUなし）。

### 6. 既知の落とし穴（設計時に実際に踏んだもの）

- 客席側に光源がある状態で「手前端で切る」処理をガード無しに当てると正面図が空になる
  → 本体の `houseCutAtFront` をそのまま呼ぶ（§2参照）
- 線が会場の天井を突き抜けて図の外へ出る → `dims.H` で止める（`laserLanding` の `ceil` 分岐）
- 床置きで中心方向がほぼ鉛直になるとローカル基底が壊れる → `volume-light.js compile()` と同じ切替
- 演者の手前を通る線が体の上に乗る → 描き順で近似（レーザーを演者より先に描く）。
  奥バトンからの投射が主なので実用上は十分、というのが設計時の判断です。
- Safari は `ctx.filter` が既定で無効ですが、今回は使わないので影響しません（`lighter` 合成は使えます）。

### 7. 完了条件

- 6効果 × 3か所（トラス・床・前）が4図すべてで破綻なく描ける
- 既存テストが通り、新規テストも通る
- レーザーを置いていない既存データが従来どおり描ける（`fixture.kind` 未設定の互換）
- 描画msの増加が目安内
- 証拠画像と数値を添えて日本語で報告し、**未確認の項目は「未確認」と書く**

### 8. 本人への確認が要ること

- **公開（push）は本人の指示を待つ**
- UI文言（DECISION.html §5.5）を変えたくなった場合
- 設計の方式そのものを変える必要が出た場合（その場合は理由と代案を示す）

実装の範囲外: 本体（`stage-sketch.js`）への統合、ベータ配布物への反映。これらは別途の判断が要ります。

---

## 補足（引き継ぎプロンプトには含めない管理情報）

- 設計セッション: 2026-09-15、Claude Code（Fable 5.1 → Sonnet 5）。Codexは未使用。
- 本人の前提指示: 「細かい調整はできなくていい。雰囲気がつかめればOK」「実装はまた別セッションで合同」
- 関連メモリ: `project_stage_sketch_light_motion`（レーザーの節は2026-09-15の2つ）
- 推奨モデル: 順1〜2（幾何・描画）は仕様確定済みなので Sonnet。順3のUIと最終の見た目判断は上位モデル。
