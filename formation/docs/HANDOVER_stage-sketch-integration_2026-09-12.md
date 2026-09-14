# 引き継ぎ: フォーメーションアプリを舞台スケッチへ組み込む

作成 2026-09-12。前セッション（試作 v1〜v49）からの引き継ぎ。
このファイルだけ読めば着手できるように書いてある。別マシンのエージェントでも同じ。

---

## 0. 最初にやること

1. この文書を最後まで読む。
2. `show-creative-ideas/shosai-app/formation/docs/M1_DESIGN_PACK_2026-09-11.html` を開く
   （v1〜v49 の設計判断と、踏んだ罠が全部書いてある。ブラウザで読む）。
3. 共有メモリ `project_formation_app.md` と `project_shosai_stage_sketch_notes.md` を読む。
4. **`stage-sketch.js` を別セッションが編集中でないか本人に確認する。**
   前セッションでは「M4まで本体に触らない」という取り決めだった。解除されたかを必ず聞く。

---

## 1. 本人が描いている最終形（本人の言葉）

> このフォーメーションのアプリ自体がそもそも舞台スケッチ上で開くものであって、
> どちらから動かしてもそのシーンにおける人のデータがいじれる

> この画面自体は舞台スケッチ上でモーダルのように起動することをブラウザ版では考えています。
> セクションの欄から、フォーメーションアプリを起動して、そこでフォーメーションという名のシーンを
> 組んでいきます。舞台スケッチに戻ったらフォーメーションがシーンとしてそのまま立ち位置まで
> 反映されているイメージです。また舞台スケッチ側でも楽曲もセクションのところで再生すると
> 演者が楽曲に合わせて動くイメージです。

> セットそのものがこちらにも表示される必要があります。

つまり4つ。

1. 舞台スケッチの**セクションの欄**から、モーダルでフォーメーションアプリを開く。
2. そこで作った**フォーメーションが、舞台スケッチのシーンとして立ち位置まで反映**される。
3. 舞台スケッチ側で**楽曲を再生すると演者が動く**。
4. フォーメーションアプリにも**セットが表示**される（いまは演者だけ）。

---

## 2. いまあるもの

### 試作（単体で動く）

`show-creative-ideas/shosai-app/formation/prototype/record-from-video.html`
単体HTML 1枚・約2900行。ローカルサーバーで開く。

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app" && nohup python3 -m http.server 8941 >/dev/null 2>&1 &
```
→ http://127.0.0.1:8941/formation/prototype/record-from-video.html

バックアップは同じフォルダの `record-from-video_backup_2026-09-12-v*.html`。
**大きく書き換える前に必ず新しいバックアップを取る。**

### できること（v49 時点）

- 音源を読み、**カウントの地図**（合わせ直しの点＝ anchors）で時間とカウントを対応づける。
  曲がぴったり一定テンポでなくてもよい。メトロノームは曲と同じ時計（Web Audio）で鳴る。
- 平面図で演者を動かすと、**その場が新しいフォーメーションになる**（番号は自動、⌘Zで取り消せる）。
- フォーメーションの帯（タイムライン）。頭の移動・長さ・**緑の転換区間**をドラッグで編集。
- **動き出しラグ**（演者ごとに出発・到着を前倒し／遅らせる。カウントで保存、秒表示は換算）。
- **導線**（次のフォーメーションへの移動を平面図に破線で。曲線も。つまみで曲げる）。
- **正面図**（舞台スケッチの人体モデルを移植。単色シルエット・立ち姿のみ）。
- **前後反転**（平面図を180度。見え方だけで記録は不変）。
- **演者の登録**（舞台スケッチの cast と同じ項目。★下記の制約を参照）。
- **楽曲の複数読み込み**（曲ごとに配置とフォーメーション。演者と舞台は共通）。
- カウント表の書き出し、舞台スケッチ向けの書き出し（下記）。

### データの形（試作）

```js
doc = {
  schemaVersion, formationId,
  sync: { documentId, revisionId, baseRevisionId, tombstones },
  stage: { widthM, depthM },                 // 曲をまたいで共通
  cast: [ { id, name, color, heightCm, note, locked,
            look: { skin, hair{style,color}, top{kind,color,sleeve}, bottom{kind,color,length} } } ],
  songs: [ { id, track, frames, scenePlan, heroCount } ],   // 曲ごと
  songId,                                     // いま開いている曲
  // ↓ いま開いている曲の中身。songs の該当項と同じものを指す
  track: { name, countBpm, firstCountSec, firstSet, firstLocked, anchors, meters, phrases },
  frames: [ { id, count, poses: { castId: { u, v, facing, cu?, cv?, lead?, early? } }, note, travel } ],
  scenePlan: { segments: [ { id, fromFrameId, title, note } ], endCount, upgradedToPerFrame },
  heroCount,
}
```

- `anchors = [{count, sec, locked}]` が**時間の地図**。点の間は線形に按分する。
- `poses[].cu/cv` は移動経路の控え点（2次ベジェ）。無ければ直線。
- `poses[].lead/early` は動き出しラグ（カウント）。
- **`syncActiveSong()` が、いま開いている曲の中身を `songs` へ写す。**
  保存と履歴の入口で呼んでいる。曲の中身を触る新しい経路を足したら、ここを通すこと。

### 舞台スケッチ向けの書き出し（すでにある）

`buildStageExport()` が返す形。組み込みでもこの形を土台にしてよい。

```js
{
  format: "stage-sketch-formation", version: 1,
  source: { formationId, revision },
  track: { name, countBpm, firstCountSec, anchors, meters },
  stage: { widthM, depthM },
  cast: [...],
  scenes: [ {
    sourceSegmentId, sourceFrameId, title,
    arrivalCount, cueStartCount, cueSeconds, startSec, endCount, endSec,
    poses: { castId: {u, v, facing} }, note,
    motion: { heroCount, keyframes: [ { sourceFrameId, trackCount, sec, travel, poses, note } ] },
  } ],
}
```

---

## 3. 舞台スケッチ側の実装で押さえること

`show-creative-ideas/shosai-app/stage-sketch.js`。巨大なIIFE（約26000行）。

### 読むべき場所

| 何 | 行のあたり | 備考 |
|---|---|---|
| `BASE_JOINTS` / `makePose` / `POSES` | 2824〜2900 | 人体の骨格と姿勢30種 |
| `smoothClosedPath` / `torsoOutline` / `taperedChain` | 3505〜3580 | 体の外周の描き方 |
| `TORSO_RINGS` / `NECK_RINGS` / `LIMB_TAPER` | 3665〜3712 | 断面と手足の太さ |
| `SHOULDER_RATIO` / `BODY_DEPTH_RATIO` | 3648・3650 | ★実寸比率。描画専用の物差しを作らない |
| `normalizeLook` / `resolveLook` | 4364〜4398 | 見た目の登録 |
| `normalizePiece` | 4897〜 | 駒（シーン上の演者・セット）の全項目 |
| `newScene` / `kind:"section"` | 4651〜 | シーンとセクション |
| `cast` / `sets` の復元 | 5448〜5490 | 登録の全項目 |
| `buildRig` | 7887〜 | 骨格を組む |
| `performerRig` / `paintBody` / `drawPerformer` | 8005〜8300 | 体を塗る |
| `addPiece` / `addCastMember` / `placeCastPiece` | 21843・14751 | 駒と登録を足す |

### 用語と対応

| 舞台スケッチ | フォーメーション試作 |
|---|---|
| `project.cast[]`（登録） | `doc.cast[]` |
| `scene.pieces[]`（シーン上の駒） | `frame.poses{}` |
| `piece.u` / `piece.v` / `piece.facing` | `pose.u` / `pose.v` / `pose.facing` |
| `piece.route`（動線。u,v と bu,bv の控え点） | `pose.cu` / `pose.cv` |
| `scene`（場面） | フォーメーション（= `scenePlan.segments[]`） |
| `scene.kind === "section"`（入れ物） | 曲（`doc.songs[]`）に相当しうる |
| `project.sets[]` / `piece.setId` | **まだ無い。今回の課題** |

★**左右の呼び方**: 舞台スケッチは `u > 0.6` が**上手**（`stage-sketch.js` 12271行）。
向き90度＝上手＝画面の右。前セッションで試作の表記が左右逆だったのを直した。
新しい表示を足すときも、必ずこの実装を読んで合わせること。

---

## 4. 今回やること（提案する順番）

### 段階1: セットをフォーメーションアプリに出す（本人の最新の要望）

いまフォーメーション側は演者しか知らない。舞台スケッチの `project.sets[]` と、
シーン上の `piece.setId` を持つ駒を、**読むだけ**で平面図と正面図に描く。

- 平面図: 床に占める面積（`pieceFootprint`）の矩形／円で描く。動かせない（薄く表示）。
- 正面図: すでに移植した擬似パースの上に、実寸の箱として描く。
- **セットはフォーメーション側から編集しない**（演者の登録と同じ扱い。下記の制約）。
- セットが場面ごとに動く（転換する）ことをどう扱うかは本人に確認が要る。
  いまのフォーメーションは「そのカウントの断面」なので、
  「このフォーメーションの間はセットがここにある」という持ち方になるはず。

### 段階2: モーダルとして開く

- 舞台スケッチのセクションの欄に「フォーメーションを組む」を足す。
- 試作のHTMLを**そのまま iframe で開く**か、**同じIIFEの中の1画面として取り込む**かを決める。
  - iframe: 試作の資産をそのまま使える。`postMessage` でデータを渡す。分離が明確。
  - 取り込み: 状態を共有できるが、2900行を26000行へ足すことになる。
  - ★**本人に判断を仰ぐこと。** 前セッションでは決めていない。
- 渡すもの: `project.cast`・`project.sets`・`venue`（舞台の大きさ）・そのセクションの既存シーン。
- 返すもの: フォーメーションの並びと各フォーメーションの `poses`。

### 段階3: フォーメーション → 舞台スケッチのシーン

- フォーメーション1つ = シーン1つ。`scenes[]` の `poses` を `scene.pieces[]` の u/v/facing へ入れる。
- **姿勢・高さ・支持物・持ち物は舞台スケッチ側の持ち物**。再取込で**上書きしない**。
  結び付けの鍵は `formationId + sourceSegmentId`（シーン側）と `sourceFrameId`（駒側）。
- 平面で動かした結果、台から外れる等の食い違いが出たら、
  **自動で下ろさず「合わない」と伝えて舞台側で選ばせる**（v24で決めた方針）。

### 段階4: セクションで楽曲を再生すると演者が動く

- 時間の地図（`anchors`）と `poseAt()` の補間（曲線・動き出しラグつき）を舞台スケッチへ移す。
- 試作の `poseAt()` は移植しやすい形にしてある。依存は `framesAround` / `travelOf` /
  `ctrlOf` / `bezAt` / `leadOf` / `earlyOf` / `shortestTurn` だけ。
- ★**音は1つの時計に乗せる**（v18の教訓）。曲を audio 要素、クリックを Web Audio にすると必ずずれる。
  舞台スケッチ側の再生も、同じ AudioContext の時計で駒を動かすこと。

---

## 5. 守る制約（本人が決めたこと）

- ★**演者の登録はフォーメーション側から変えられない。舞台スケッチ側でのみ変える。**
  試作には `castEditable` があり、`?cast=locked` で読むだけの状態を試せる。
  **組み込み版はこの状態で動かす。** セットも同じ扱いにするのが自然（本人に確認）。
- ★**姿勢（立つ・座る等）と高さは舞台スケッチの持ち物。** フォーメーションは平面の立ち位置と向きだけ。
- ★**映像面（スクリーン）は別案件。** `docs/SCREEN_SURFACE_WORKORDER_2026-09-11.md` は保留のまま。
- ★**`?v=` と `CACHE_NAME` を上げる**（JSを変えたとき）。2026-09-12以降は `stage.html` が舞台スケッチの正本で、`build_stage.py` は派生Viewer更新と分離検証を担う。
- ★並行セッションがあるときは `git add -A` を使わない。

---

## 6. 踏むと痛い罠（前セッションで実際に踏んだもの）

- **`Number(null) === 0` は有限判定を通る。** 「未設定」を null で表す値は専用の関数を通して読む。
  `b && b.cu` も b が null のとき null を返すので同じ罠。**2回踏んだ。**
- **範囲置換の目印が一意か確かめる。** 似た処理は書き出しも似るので、別の関数の同じ行に当たる。
  取り出した範囲にその場所だけの語が含まれることを assert する。**構文チェックは通ってしまう。**
  終了タグは**開始位置より後ろから**探す（`s.index(終了, 開始)`）。
- **入力のたびに欄を作り直さない。** 開いた欄も入力中のカーソルも消える。
- **イベントの中では対象を id から引き直す。** オブジェクトを掴むと、正規化で作り直された瞬間に
  古い器へ書き込んで、2つ目以降の変更が黙って消える。
- **design-lint のレポートは日付フォルダに出る。** 日付をまたぐとパスが変わる。
  実行が出力したパスをそのまま読み、`stat` の時刻と本文の `備考` を突き合わせる。
  **出力を `/dev/null` に捨てない**（実行の失敗に気づけなくなる）。前セッションで2回誤報告した。
- **`stage-sketch.js` は巨大なIIFE。** 起動時に参照される定数はファイル先頭に置く
  （後方の `const` は TDZ でモジュールごと落ち、パネルだけ出て中身が空になる）。
- **場面の実体は `state.project.scenes`。** `state.scenes` は undefined。
- **例外が握り潰される描画経路がある。** 平面図が真っ黒でもエラーは出ない。
  変更後は canvas の画素を数えて検証する。
- 検証は毎回 `localStorage.removeItem('shosai-stage-sketch-v1')`（試作は `formation-proto-v1`）から始める。

---

## 7. 検証のやり方（前セッションのやり方をそのまま使う）

- ブラウザの JavaScript から `window.__proto` を叩いて実測する（試作にはテスト用の口が開けてある）。
  `doc` / `render` / `poseAt` / `sceneBars` / `planEnd` / `buildStageExport` など。
- 操作は本物の `PointerEvent` を投げて確かめる（当たり判定のズレはこれでしか出ない）。
- 画面の見た目は `design_lint.py` で監査する。**NG 0・WARN 0 を維持している。**

```bash
~/.venvs/design-lint/bin/python web-projects/design-lint/design_lint.py \
  "http://127.0.0.1:8941/formation/prototype/record-from-video.html?v=NN" \
  --viewport 1440x900 --note "何を変えたか"
```

---

## 8. 本人に確認すべきこと（着手前に聞く）

1. **`stage-sketch.js` に触ってよいか**（別セッションの作業が終わったか）。
2. **モーダルの作り**: iframe で試作をそのまま使うか、本体へ取り込むか。
3. **セットの扱い**: フォーメーション側では読むだけでよいか。
   フォーメーションごとにセットが動く（転換する）ことを持たせるか。
4. **セクションと曲の対応**: 舞台スケッチのセクション1つ＝曲1つ、でよいか。
5. **既存シーンとの関係**: すでにあるシーンにフォーメーションを流し込むのか、
   フォーメーションから新しいシーンを作るのか。

---

## 9. 置き場所

- 試作: `show-creative-ideas/shosai-app/formation/prototype/`
- 設計パック（v1〜v49の判断と検証）: `formation/docs/M1_DESIGN_PACK_2026-09-11.html`
- トークンシート（配色）: `formation/design/TOKEN_SHEET.md`
- 監査の結果: `formation/docs/design-lint-report_2026-09-12.md` と `lint_desktop_1440x900.png`
- 計画の判断用HTML: `_reviews/2026-09-11_formation-app-plan/index.html`
- 共有メモリ: `project_formation_app.md` / `project_shosai_stage_sketch_notes.md`
- 開発の方針: `_claude-rules/dev-preferences.md`（作業前に一読）
