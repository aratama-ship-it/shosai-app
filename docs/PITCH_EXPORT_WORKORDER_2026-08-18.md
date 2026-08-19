# 発注書：ピッチ書き出し（一枚絵＋生成条件） 2026-08-18

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。**この文書だけを読んで着手できるように書く。**

## 背景（別マシンのエージェントでも分かるように）

`shosai-app/` は依存なしの静的Webアプリ。舞台スケッチの本体は `stage-sketch.js`、
画面のHTMLは `index.html`（`stage.html` はそこから `python3 build_stage.py` で生成する派生物）。

本人（元サーカスアーティスト・ショー制作者）の要望：

> 舞台スケッチは制作者・クリエイティブチーム・演者のために作ってきたが、
> **ピッチング（外部への売り込み）の場では少し荒く感じる。**
> CGでいいので、ワンプロンプトないしは簡易的に、それっぽい雰囲気の一枚絵にしたい。

### 「荒い」の正体（発注者の分析）

現在の書き出し `runExport()`（`stage-sketch.js:17237`）は、正面図・平面図を **1280×720 の等倍PNG**で
落とすだけで、**作図用の描画がそのまま焼き付く**。グリッド、寸法、席の線、駒の名前ラベル、動線、
自由矢印、付箋、せり警告の破線、座席マップ。つまり解像度の問題ではなく、
**「図面の語彙で描かれた絵を、図面を読まない相手に見せている」**ことが荒さの正体である。

ピッチで要るのは、情報の網羅ではなく **一つの視点・一つの瞬間・空気**、そして
**「この場面が観客に何を起こすか」の一行**。したがって本機能は、既存の書き出しを綺麗にするのではなく、
**目的の違う第二の出口**として作る。

### 使える素材（すでにある。新規に作らない）

| 素材 | 場所 | ピッチ書き出しでの用途 |
|---|---|---|
| 16:9のキャンバス | `index.html:771` `width="1280" height="720"` | 解像度を上げるだけで比率変換が不要 |
| 解像度非依存の描画 | `drawStage()` `stage-sketch.js:7733`。冒頭で `S = target.canvas.width / W` を掛ける | 出力キャンバスを大きくするだけで等比に刷れる |
| 光の帯と落ちる円 | `stage-sketch.js:5719` 付近。`globalCompositeOperation = "screen"` で既に加算合成 | 空気感の土台。強度を上げて流用する |
| 縁の落ち | `stage-sketch.js:7876` の `edgeShade` | ビネットの土台 |
| 光の意図カード | `scene.lightingIntent`。仕様は `docs/LIGHT_INTENT_CARD_SPEC.md` | 画風の効かせ方と、プロンプト本文の中身 |
| プレゼン中フラグ | `presenting`（module-level） | 「作図注記を焼き付けない」判定の既存の前例 |

### 守る既存原則（勝手に変えない）

1. **持ち込み型。アプリ内に画像生成APIを持ち込まない。**
   本人判断として `docs/VISUALS_ABC_WORKORDER_2026-08-13.md` で確定済み。
   アプリは生成条件（プロンプト）の書き出しと受け皿に徹する。**外部APIを叩くコードを書かない。**
2. **AIの要約・意訳・脚色を挟まない**（設計書6.4「AIの提案を本人の決定へ自動昇格させない」）。
   プロンプトへ載せてよいのは、**本人が書いた文字そのまま**と、**機械的に読み取れる事実**
   （会場形式・寸法・演者の人数と位置と姿勢・道具・照明駒の色）だけ。空欄は空欄のまま出さない。
3. **端末ごとの設定はショーのデータへ入れない**（`stage-sketch.js:2101`）。
   ピッチ書き出しの設定（画風・解像度・文字の有無・プロンプトの言語）は `PREFS_KEY` 側へ置く。

---

## やること

### 1. 書き出しモーダルに「ピッチとして」を足す

`index.html:1245` の `#stage-export-modal` の本文の**先頭**に、目的を選ぶ2択を置く。

```html
<label class="stage-control-label">何のために</label>
<div class="stage-tool-grid" role="group" aria-label="何のために書き出すか">
  <button type="button" data-export-purpose="draft" aria-pressed="true">作図として</button>
  <button type="button" data-export-purpose="pitch" aria-pressed="false">ピッチとして</button>
</div>
```

- 「作図として」＝ 既存の挙動そのまま（正面/平面/両方 × いまのシーン/セクション/全部）。**一切変えない。**
- 「ピッチとして」＝ 既存の「どの絵を」「どのシーンを」の2ブロックを `hidden` にし、
  代わりにピッチ用の欄（下記2〜4）を出す。**ピッチは常にいまのシーン1枚**。
  複数シーンの一括ピッチ書き出しは**作らない**（構図と画風を選ぶ行為はバッチに向かない）。
- モーダルの見出し `#stage-export-title` は目的に応じて「画像を書き出す」／「ピッチ用に書き出す」へ差し替える。
- 「書き出す」ボタン `#stage-export-run` は共用。押したときに目的で分岐する。

### 2. 画風を選ぶ（本人の指定で選択式。4つ）

```html
<label class="stage-control-label">画風</label>
<div class="stage-tool-grid" role="group" aria-label="ピッチ画像の画風">
  <button type="button" data-pitch-style="theatre" aria-pressed="true">暗い劇場の一瞬</button>
  <button type="button" data-pitch-style="paper" aria-pressed="false">紙の上のスケッチ</button>
  <button type="button" data-pitch-style="poster" aria-pressed="false">ポスター</button>
  <button type="button" data-pitch-style="render" aria-pressed="false">生成AIで仕上げる</button>
</div>
<p class="stage-profile-hint" id="stage-pitch-style-note"></p>
```

選んだ画風は `#stage-pitch-style-note` に一行で説明を出す（下表の「説明文」）。

| キー | 表示名 | 説明文（そのままUIへ） |
|---|---|---|
| `theatre` | 暗い劇場の一瞬 | 客席から見た暗い箱。演者は輪郭と縁の光だけ、床に光の帯と反射、空中に埃。 |
| `paper` | 紙の上のスケッチ | 紙の地に墨で落とした一枚。まだ決まっていない絵として見せる。 |
| `poster` | ポスター | 場面名と一行を大きく組み、絵はその下地にする。デッキの扉ページ向き。 |
| `render` | 生成AIで仕上げる | アプリからは参照画像と生成条件を出す。仕上げは外部の生成AIで行う。 |

**`render` の絵は `theatre` と同一**（参照画像として使うため）。違うのは後述のプロンプト本文だけ。
UIでその旨を上記説明文で明示する（同じ絵が出るのに違うと期待させない）。

### 3. 解像度と文字

```html
<label class="stage-control-label">大きさ</label>
<div class="stage-tool-grid" role="group" aria-label="ピッチ画像の大きさ">
  <button type="button" data-pitch-size="2" aria-pressed="true">1920×1080</button>
  <button type="button" data-pitch-size="1" aria-pressed="false">1280×720</button>
  <button type="button" data-pitch-size="3" aria-pressed="false">3840×2160</button>
</div>
<label class="stage-check">
  <input type="checkbox" id="stage-pitch-caption" checked>
  <span>絵に文字を入れる（ショー名・場面名・光の意図の一行）</span>
</label>
```

`data-pitch-size` は倍率。3 のときだけ 3840×2160（1280×3=3840、720×3=2160）。

### 3-2. プロンプトの言語（複数選べる）

```html
<label class="stage-control-label">生成条件の言語</label>
<div class="stage-tool-grid" role="group" aria-label="生成条件を出す言語">
  <button type="button" data-pitch-lang="ja" aria-pressed="true">日本語</button>
  <button type="button" data-pitch-lang="en" aria-pressed="false">English</button>
  <button type="button" data-pitch-lang="fr" aria-pressed="false">Français</button>
  <button type="button" data-pitch-lang="zh" aria-pressed="false">中文</button>
  <button type="button" data-pitch-lang="ko" aria-pressed="false">한국어</button>
</div>
```

- **複数選択**（画風・大きさは単一選択、ここだけ複数）。選んだ言語のぶんだけ `.txt` を落とす。
- 既定は、いまのUI言語（`stage-i18n.js` の切り替え状態）に合わせて `ja` か `en` を1つだけ入れる。
- 全部外したときは `ja` を選び直す（0個で書き出させない）。
- 一覧は `window.SHOSAI_PROMPT_I18N.langs` から組む。**HTMLへ言語をベタ書きせず**、
  言語を足したらこのボタン列が自動で伸びるようにする。

### 4. 書き出すもの

「書き出す」を押すと、続けて3つ落とす（既存 `runExport()` と同じく `setTimeout` で 220ms ずつずらす）。

1. `{ショー名}-pitch-{場面名}-{stamp}.png` — 一枚絵（1枚）
2. `{ショー名}-pitch-{場面名}-{stamp}-{lang}.txt` — 生成条件（選んだ言語ごとに1つ）
3. 選んだ言語が1つのときだけ、その内容を `navigator.clipboard.writeText()` でクリップボードへも入れる。
   複数のときは入れない（どれが入ったか分からない状態を作らない）。
   失敗しても無視してよい。`announce()` でコピー成否を伝える。

`safeName()` と `stampNow()` は既存のものを流用する。

---

## 一枚絵の作り方（実装の中身）

### 5. 焼き落とすもの／残すもの

module-level に `let pitchStyle = null;` を置く。ピッチ描画の間だけ画風キーが入る。
`drawStage()` とその下請けの中で、**次を `pitchStyle` が真のとき描かない**。

| 落とす | 場所の目印 |
|---|---|
| 駒の名前ラベル | `drawStage()` 内 `if (state.showNames \|\| state.showSetNames \|\| state.showLightNames)` のブロック |
| 動線 | 同 `drawRoutes(...)` の呼び出し |
| 自由矢印 | 同 `drawArrows(target, L)` |
| 付箋 | 同 `drawNotes(target, L, view, showSelection)` |
| せり警告の赤い破線 | 同 `seriStraddlers(...)` のブロック |
| 高所の下の注意 | 同 `featureOn("highwarn")` のブロック |
| 座席マップ | 同 `drawSeatMap(target, L)` |
| 光の意図の作図注記 | `drawLightIntentOverlay()`。既に `target !== ctx` で抜けるので追加対応は不要（確認だけする） |
| グリッド・目盛・寸法の線 | `drawFrontVenue()` の中。床の目盛線・センターライン・寸法表示を `pitchStyle` で抜く |

**残すもの**: 会場の形（プロセニアム枠・床・袖・バトン・壁）、演者、装置、光そのもの。
**演者の体・道具の描画には手を入れない**（実測に基づく肉付けが正本。メモリ
`performer-flesh-source-of-truth` の通り、ここを目分量で変えない）。

### 6. 後処理パイプライン

`drawStage()` で描き終えた出力キャンバスに対して、順に掛ける。

1. `beamHaze` — 照明駒から降りる帯を、`screen` 合成でもう一度、より広く薄く重ねる（空気中の埃）
2. `floorSheen` — 床面の帯に、演者と装置を上下反転させたものを薄く合成（濡れた床の反射）
3. `bloom` — 輝度がしきい値を超える画素を抜き出し、ぼかして加算合成
4. `grade` — シャドウを寒色へ、ハイライトを暖色へ寄せるカラーグレード
5. `vignette` — 四隅を落とす
6. `grain` — 粒子
7. `caption` — 文字を焼き込む（4のチェックが入っているときだけ）

#### 画風ごとのパラメータ

| | beamHaze | floorSheen | bloom | grade | vignette | grain |
|---|---|---|---|---|---|---|
| `theatre` / `render` | 0.9 | 0.35 | 0.60 | teal-amber | 0.55 | 0.04（細） |
| `paper` | 0.25 | 0.00 | 0.15 | — | 0.20 | 0.14（粗） |
| `poster` | 0.9 | 0.35 | 0.60 | teal-amber | 0.70 | 0.04（細） |

#### `paper` だけの特別処理（3〜6の代わりに掛ける）

暗い舞台の絵を紙のスケッチへ変える。手順を固定する。

1. 全画素の**輝度を反転**する（光が当たっている所ほど薄く、暗い所ほど濃い墨になる）
2. 反転した輝度を**墨の濃さ**として、紙色 `#e8e0cf` の地へ `multiply` で乗せる
3. 濃さに `0.82` を掛けて全体を軽くする（真っ黒を作らない）
4. 粗い粒子（下記）を `multiply` で重ねる
5. 画面の縁 24px（倍率前）を、外へ向かって紙色へ溶かす（にじみ）

#### 粒子は決定的にする（重要）

**`Math.random()` を使わない。** 同じ場面・同じ画風・同じ大きさなら**毎回まったく同じ絵**が出ること。
これがピッチ書き出しの価値の半分である（ピッチは何度も刷り直す。刷るたびに絵が変わってはいけない）。

シードは `scene.id + pitchStyle + 倍率` の文字列から作る。実装は mulberry32 でよい。

```js
function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 7. 文字の焼き込み

`caption` チェックが入っているときだけ。倍率に比例して大きさを変える。

- **`theatre` / `render`** — 画面下端から 44px（倍率前）の位置。左寄せ。
  1行目に **場面名**（20px・字間 0.08em）、2行目に **ショー名**（12px・不透明度 0.55）。
  右下に `lightingIntent.objective` があればそれを1行（14px・不透明度 0.8・最大44字で末尾を「…」）。
  **帯や箱を敷かない**（下端は元から暗い。箱を敷くと図面に戻る）。
- **`paper`** — 同じ配置。色は墨（`#3a352c`）。
- **`poster`** — 文字が主役。上から 1/3 の帯を文字に使い、絵は下 2/3 に縮めて配置する。
  場面名（72px・中央）、その下に `objective`（22px・中央・2行まで）、
  最下段にショー名（14px・中央・不透明度 0.5）。
  絵を縮めるぶんの上部余白は、画風の地色（`theatre` 系なら `#0d0c0b`）で埋める。

`objective` が空のときは、その行を出さない（空行の予約もしない）。

---

## プロンプト（生成条件）の作り方

### 8. 原則

- **語彙表は `stage-prompt-i18n.js` を使う。** この作業で新設済み（`window.SHOSAI_PROMPT_I18N`）。
  **Codexが訳語を書き足したり書き換えたりしない。** 足りない語があれば実装を止めて報告する。
- プロンプトは**2層**でできている。この分離を崩さない。

  | 層 | 中身 | 言語の扱い |
  |---|---|---|
  | 層1：機械的な事実 | 会場・カメラ・演者の人数と位置と姿勢・装置・灯りの種別と色・入れないもの | 選んだ言語の**語彙表から組み立てる**。翻訳処理ではないので意訳が起きない |
  | 層2：本人の言葉 | `lightingIntent` の `objective` `audienceFocus` 各レイヤーの `note` `mood` | **日本語の原文のまま引用する。訳さない** |

- 層2の直前に、選んだ言語で `head[lang].ownWords` の一行を必ず置く
  （「以下は演出家自身の言葉（日本語の原文）。この意図を尊重して描くこと。」の各言語版）。
  **本人の文は `「」` で囲んで入れる。**前後に語を足さない。
- 値が空の項目は**行ごと出さない**。空行の予約もしない。
- 「幻想的」「美しい」のような、**本人が書いていない形容をこちらで足さない。**

### 8-2. なぜ訳さないのか（実装者向けの理由）

既存の設計原則（設計書6.4）は「AIの提案を本人の決定へ自動昇格させない」。
本人が日本語で書いた演出意図をAIが英語や中国語へ訳した時点で、
**訳者としてのAIの解釈が本人の決定へ混ざる。** 一度混ざると、
本人はどこが自分の言葉でどこがAIの言葉か区別できなくなる。
画像生成モデルは多言語混在のプロンプトを扱えるので、原文のまま渡してよい。

なお、TXTで落ちるので、**本人やチームが訳を持っているときは層2を手で差し替えられる。**
そのために層2を独立した節として分けておくこと（層1の中に混ぜ込まない）。

### 9. 形（この順で組む。見出しは `head[lang]` から引く）

```
【{style}】{画風の定型文}

【{venue}】{会場名}／{venue[lang][形式]}／間口{W}m × 奥行{D}m × 高さ{H}m

【{camera}】{head[lang].camera1}

【{stage}】
- {performers}（{N}）: {一人ずつ「{名前} — {側}・{奥行き}、{姿勢}」}
- {sets}: {装置名}（{側}・{奥行き}）…

【{light}】
- {colors}: {照明駒の色を重複なく}
- {灯りごとに「{lightKind} — {lightNote}」}

【{head[lang].ownWords}】
- {objective}: 「{本人の原文}」
- {focus}: 「{本人の原文}」
- {layerPerformer}: {intent[lang][値]}「{本人の原文の補足}」
- {layerBackground}: {intent[lang][値]}「{本人の原文の補足}」
- {layerSpace}: {intent[lang][値]}「{本人の原文の補足}」
- {mood}: 「{本人の原文}」

【{avoid}】{head[lang].avoid1}
```

`render` のときだけ、末尾に `head[lang].refNote` の一行を足す。

#### 位置の言い方（最重要）

`u`（0=下手 → 1=上手）と `v`（0=奥 → 1=手前）から作る。

- `u < 0.34` → `side[lang].left`、`u > 0.66` → `side[lang].right`、それ以外 → `side[lang].center`
- `v < 0.34` → `depth[lang].back`、`v > 0.66` → `depth[lang].front`、それ以外 → `depth[lang].mid`

**舞台用語の「下手／上手」「stage right／stage left」を絶対に使わない。**
下手 = stage right = 客席から見て左であり、言語をまたぐと必ず取り違える。
語彙表の `side` はすべて「客席から見て」の言い方で書いてある。ここを崩さない。

高さ（`base`）が 0.3m を超える演者には、位置のあとに高さを足す
（例 日本語「床から2.4mの高さ」）。空中にいることが絵の要になるため。

#### `intent` の内部値の訳

`layers.performer.intent` などの内部値（`reveal` `soften` `conceal` `silhouette` `separate`
`transform` `unspecified`）は `intent[lang]` から引く。
`unspecified` のレイヤーは**行ごと出さない**（「指定なし」と書いても絵の役に立たない）。

### 10. 画風ごとの定型文

`style[lang][画風キー]` から引く。4キー（`theatre` `paper` `poster` `render`）× 5言語が
`stage-prompt-i18n.js` に入っている。**この文をコード側に持たない。**

### 11. 訳語の確認が要るもの

`SHOSAI_PROMPT_I18N.needsReview` に、確度の低い訳語の id が言語ごとに入っている。
**この作業では何もしない**（UIに警告を出したりしない）。次便で扱う。実装者は中身を消さないこと。

### 12. 新しいファイルの読み込み口（忘れると動かない）

`stage-prompt-i18n.js` はこの発注と同時に**新規追加済み**。3か所へ登録する。

1. `index.html:1729` の `stage-i18n.js` の**次の行**へ
   `<script src="stage-prompt-i18n.js?v=1"></script>` を足す
   （`stage-sketch.js` より前。読み込み順が逆だと `SHOSAI_PROMPT_I18N` が未定義になる）
2. `stage-sw.js` の `APP_SHELL` 配列（`stage-sw.js:7` の隣）へ `"./stage-prompt-i18n.js?v=1",` を足す
   — **足さないとオフライン時にピッチ書き出しだけ落ちる**
3. `python3 build_stage.py` を走らせて `stage.html` へ反映する
   （`build_stage.py` はスクリプトタグを手で並べない作りなので、追記は不要のはず。
   `--check` が通ることで確認する）

## 触ってよい／いけない

- 触ってよい: `index.html` / `stage-sketch.js` / `style.css` / `stage-sw.js` / `tests/` / `docs/`
- **中身を書き換えない（読むだけ）**: `stage-prompt-i18n.js`。訳語はこの発注と同時に発注者が確定させた。
  足りない語・誤りに気づいたら**直さずに報告する**（サーカス・劇場の用語なので、実装判断で直さない）
- **触らない**: `stage-first-person.js`（自由カメラは別便。下記「今回やらないこと」）、
  `db.js`、`stage-apparatus-data.js`、`app.js`、`roster.js`
- **`git commit` しない。** 検証は発注者が行う。

## 今回やらないこと（次便）

- **自由カメラ（3Dカメラ）からのピッチ書き出し。** `stage-first-person.js` の `renderFrame()`
  （`stage-first-person.js:1202`）は `elements.canvas` へ直接描き、module-level の
  `canvasWidth/canvasHeight/pixelRatio` に依存している。任意のキャンバスへ高解像度で刷るには
  レンダラ側の受け皿の作り直しが要る。自由カメラ自体も 2026-08-18 に入ったばかりで未コミット。
  **まず正面図で一枚絵として成立させ、角度は次便で足す。**
  （正面図は「客席から見た絵」＝ピッチで見せたい視点そのものなので、第一便として理に適っている）
- 複数シーンの一括ピッチ書き出し
- 動画・転換アニメの書き出し

## 環境設定への登録

`stage-sketch.js:2103` 付近の `FEATURES` 配列へ足す。

```js
{ key: "pitchExport", label: "ピッチ書き出し", def: true,
  hint: "書き出しモーダルに「ピッチとして」が出る。作図の線を落とし、光と空気を効かせた一枚絵と、生成AI用の条件文を出す" },
```

`featureOn("pitchExport")` が偽のときは、モーダルの目的2択を出さず、既存の書き出しだけにする。

## i18n

新規のUI文字列はすべて `stage-i18n.js` へ追加する。
`node --test tests/stage-i18n-coverage.test.mjs` が通ること（未登録の日本語が画面に出ると落ちる）。

## テスト

`tests/stage-pitch-export.test.mjs` を新設し、最低限これを見る。

1. `mulberry32` / `seedFrom` が、同じ入力で同じ数列を返す（決定性）
2. プロンプト組み立て関数が、**5言語すべてで**
   - 空の項目の行を出さない
   - `lightingIntent` が無い場面でも例外を出さず、光の節ごと落とす
   - `render` のときだけ参照画像の一行（`head[lang].refNote`）が付く
   - **本人の日本語原文をそのまま含む**（前後に語を足していない・訳されていない）。
     `ja` 以外の言語でも原文が日本語のまま出ること
   - `intent` が `unspecified` のレイヤーの行が出ない
3. 画風パラメータ表の4キーがすべて引ける（未知のキーで例外にならず `theatre` へ落ちる）
4. **語彙表の網羅**（訳し漏れをここで捕まえる）
   - `SHOSAI_PROMPT_I18N` の `head` `style` `side` `depth` `venue` `pose` `piece`
     `lightKind` `lightNote` `intent` すべてに、`langs` の5言語のキーが揃っている
   - 各表で、5言語の**id集合が完全に一致**する（どれか1言語だけ id が欠けていない）
   - `pose` の id 集合が `stage-i18n.js` の `MAPS.pose` と一致する。
     `piece` も同じく `MAPS.pieceType` と一致する
     （舞台スケッチに姿勢や道具を足したとき、訳語を足し忘れたらここで落ちる）
5. 位置の言い方に、**舞台用語が混ざっていない**こと。
   `side` と `depth` の全言語の値に `stage right` / `stage left` / `下手` / `上手` /
   `jardin` / `cour` が現れない（左右反転事故の予防線）

**既存テストの全通過**: `node --test tests/*.test.mjs`

## 仕上げの手順（必ず全部やる）

1. `index.html` のHTMLを触ったので **`python3 build_stage.py` を走らせる**
   （`stage.html` は生成物。手で直さない）。揃っているかは `python3 build_stage.py --check`
2. **`index.html` の `?v=` を上げ、`stage-sw.js` の `CACHE_NAME` も上げる。**
   上げないとPWAが古いJSを配り続ける
3. `node --test tests/*.test.mjs` 全通過
4. 変更したファイルと、確認した内容を報告する。**`git commit` はしない**

## 完了条件

- 「ピッチとして」を選び、画風4つそれぞれで書き出すと、PNGとTXTが落ちる
- PNGに作図の線・ラベル・付箋・矢印・動線・座席マップが**一切写っていない**
- 同じ場面・同じ画風・同じ大きさで2回書き出すと、**バイト単位で同じPNG**が出る
- 言語を5つ全部選ぶと、PNG 1枚と TXT 5つが落ちる
- どの言語のTXTでも、本人が書いた `objective` などが**日本語の原文のまま・改変なしで**入っている
- どの言語のTXTにも「下手／上手」「stage right／stage left」が現れず、
  位置がすべて「客席から見て」の言い方になっている
- 「作図として」を選んだときの挙動が、この作業の前とまったく同じ
- `python3 build_stage.py --check` が通り、`?v=` と `CACHE_NAME` が上がっている
