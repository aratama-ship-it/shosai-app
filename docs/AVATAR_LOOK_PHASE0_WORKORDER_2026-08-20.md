# 発注書：演者アバターの見た目 段階0＝器だけを入れる（回帰0） 2026-08-20

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。**この文書だけを読んで着手できるように書く。**
設計の全体像は `docs/AVATAR_LOOK_DESIGN_2026-08-20.md`（第3版）。本発注書はその段階0。
**2026-08-20 本人承認済み**（「段階0を独立させる」「最初からスカートも含める」「髪は頭に固定」）。

## 何を作るか（1行）

演者の見た目（髪型・服装）を持つための**データ構造と純関数、描画関数の引数**だけを入れる。
**絵は1ピクセルも変わらない。**

## この段階の出口（合格条件）

1. 既存の全ショーJSONを読み込んで描いた絵が、変更前とまったく同じであること。
2. `node --test tests/*.mjs` が全通過し、新規テストが追加されていること。
3. `tools/check-object-on-performer.mjs` の検出件数が変わらないこと（新規0件）。
4. `look` に関するUIは**まだ1つも無い**こと（段階1aで作る）。

**絵を変える実装をここでしてはいけない。** 描き分けは段階1a以降。

## 前提となる既存コードの事実（読んでから書くこと）

| 対象 | 場所 | 事実 |
|---|---|---|
| 駒の正規化 | stage-sketch.js `normalizePiece`（2801行付近） | 保存JSONの駒を既定値へ均す |
| 名簿の正規化 | stage-sketch.js 3337行付近（`cast: Array.isArray(...)`） | `{id, name, color, heightCm, note, locked}` |
| 控えのキー | stage-sketch.js `STASH_KEYS`（3189行付近） | 「登録から引き直せない値だけ」を持つ方針 |
| 複製 | stage-sketch.js `duplicateSelected`（16531行付近） | `{ ...piece }` の**浅いコピー** |
| 2Dの体 | stage-sketch.js `paintBody(target, rig, color)`（5149行付近） | 呼び出しは `drawPerformer`（5346行・5366行）と姿勢見本 |
| 3Dの体 | stage-first-person.js `paintBody3d(ctx, body, P, rings, wheel, props, eyes, color)`（1341行付近） | 呼び出しは1335行の1箇所 |
| 3Dへの貸し出し | stage-sketch.js `window.SHOSAI_STAGE_BODY`（5328行付近） | 形の定数・関数を3Dへ貸す窓口 |
| 色の検証 | stage-sketch.js `validColor`（2421行） | `#rrggbb` 6桁のみ許す＝**すでに不透明限定**。そのまま使う |
| 補助 | stage-sketch.js `clamp`（2420行）／`finite`（2423行） | そのまま使う |
| テストの作法 | tests/stage-beat-templates.test.mjs | `vm.runInNewContext` で stage-sketch.js を読み、`window.SHOSAI_*` を取る |

## 実装内容

### 1. 見た目の語彙（一覧）を定義する

stage-sketch.js のモジュール内、`POSES` の定義群の後ろあたりに置く。
**この段階では形の数値（リング等）は使われない。id とラベルと既定値の枠だけを正しく作る。**

```js
/* 丈。腰の中点→両足首の中点を1とした軸の割合で持つ。
   ズボンでは色を塗り終える位置、スカートでは裾の位置を指す（同じ語彙で両方を表す）。 */
const LENGTHS = {
  mini:  { id: "mini",  label: "ミニ",   labelEn: "Mini",   t: 0.30 },
  knee:  { id: "knee",  label: "膝丈",   labelEn: "Knee",   t: 0.50 },
  midi:  { id: "midi",  label: "ミディ", labelEn: "Midi",   t: 0.72 },
  ankle: { id: "ankle", label: "足首丈", labelEn: "Ankle",  t: 1.00 },
  floor: { id: "floor", label: "床丈",   labelEn: "Floor",  t: 1.08 },
};

/* 袖丈。肩→手首を1とした軸の割合。 */
const SLEEVES = {
  none:         { id: "none",         label: "袖なし",   labelEn: "Sleeveless", t: 0.00 },
  short:        { id: "short",        label: "半袖",     labelEn: "Short",      t: 0.38 },
  threequarter: { id: "threequarter", label: "七分袖",   labelEn: "3/4",        t: 0.72 },
  long:         { id: "long",         label: "長袖",     labelEn: "Long",       t: 1.00 },
};

/* トップス。collar は胴の上塗りを始める位置（NECK_RINGS の s 値）。
   これより上（実際に目に見える首）は肌の色のまま残す。
   shells は「衣の殻」（設計書 判断11）。空なら色面だけの服。 */
const TOP_KINDS = {
  tshirt:  { id: "tshirt",  label: "Tシャツ",     labelEn: "T-shirt", collar: 0.28, sleeve: "short", shells: [] },
  longtee: { id: "longtee", label: "長袖シャツ",  labelEn: "Long sleeve", collar: 0.28, sleeve: "long", shells: [] },
  tank:    { id: "tank",    label: "タンクトップ", labelEn: "Tank top", collar: 0.20, sleeve: "none", shells: [] },
};

const BOTTOM_KINDS = {
  pants:  { id: "pants",  label: "長ズボン", labelEn: "Trousers", length: "ankle", shells: [] },
  shorts: { id: "shorts", label: "半ズボン", labelEn: "Shorts",   length: "mini",  shells: [] },
};

const HAIR_STYLES = {
  none:  { id: "none",  label: "なし",     labelEn: "None",  parts: [] },
  short: { id: "short", label: "ショート", labelEn: "Short", parts: [] },
};
```

- **段階0では上記の最小セットだけ**を置く。種類を増やすのは段階1a・1b・3。
- 一覧を引く関数 `topKindById(id)` / `bottomKindById(id)` / `hairStyleById(id)` /
  `lengthById(id)` / `sleeveById(id)` を作る。
  **未知のidを渡されたら既定を返すが、引数の値は書き換えない**（保存値は壊さない）。
  既定は順に `tshirt` / `pants` / `none` / `ankle` / `long`。

### 2. `normalizeLook(raw)` を新設

```js
function normalizeLook(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const hair = raw.hair && typeof raw.hair === "object" ? raw.hair : {};
  const top = raw.top && typeof raw.top === "object" ? raw.top : {};
  const bottom = raw.bottom && typeof raw.bottom === "object" ? raw.bottom : {};
  return {
    skin: validColor(raw.skin, DEFAULT_SKIN),
    hair: {
      // ★種類idは一覧照合せず、文字列ならそのまま持つ（前方互換。描画時に既定へ落とす）
      style: typeof hair.style === "string" ? hair.style.slice(0, 32) : "none",
      color: validColor(hair.color, DEFAULT_HAIR_COLOR),
    },
    top: {
      kind: typeof top.kind === "string" ? top.kind.slice(0, 32) : "tshirt",
      color: validColor(top.color, DEFAULT_TOP_COLOR),
      sleeve: typeof top.sleeve === "string" ? top.sleeve.slice(0, 32) : "short",
    },
    bottom: {
      kind: typeof bottom.kind === "string" ? bottom.kind.slice(0, 32) : "pants",
      color: validColor(bottom.color, DEFAULT_BOTTOM_COLOR),
      length: typeof bottom.length === "string" ? bottom.length.slice(0, 32) : "ankle",
    },
  };
}
```

- 既定色の定数を4つ置く: `DEFAULT_SKIN = "#d9b38c"`、`DEFAULT_HAIR_COLOR = "#2a2320"`、
  `DEFAULT_TOP_COLOR = "#a84b26"`、`DEFAULT_BOTTOM_COLOR = "#3a3f4a"`。
- **`raw` が無ければ null**。null は「見た目の設定なし＝現行の単色描画」を意味する。
- **色は `validColor` を通すので自動的に不透明（#rrggbb）限定**になる。これでよい。

### 3. `resolveLook(piece, cast)` を新設（3状態）

```js
/* その駒をいまどの見た目で描くか。null なら現行の単色シルエット。
   piece.lookMode の3状態:
     "cast"（既定）… 名簿の look に従う。名簿に look が無ければ単色
     "plain"       … この駒だけ単色に強制する（名簿に look があっても無視）
     "custom"      … piece.look を使う（場面ごとの衣装替え。UIは段階3） */
function resolveLook(piece, castList) {
  if (!piece || piece.type !== "performer") return null;
  const mode = piece.lookMode || "cast";
  if (mode === "plain") return null;
  if (mode === "custom") return piece.look || null;
  if (!piece.castId) return null;
  const member = (castList || []).find((item) => item.id === piece.castId);
  return (member && member.look) || null;
}
```

### 4. 正規化への追加

- **駒**（`normalizePiece` 2801行付近の `normalized` オブジェクト）へ2つ足す:
  ```js
  lookMode: ["cast", "plain", "custom"].includes(piece.lookMode) ? piece.lookMode : "cast",
  look: normalizeLook(piece && piece.look),
  ```
- **名簿**（3337行付近の cast の map）へ1つ足す:
  ```js
  look: normalizeLook(c && c.look),
  ```
- **`STASH_KEYS`**（3189行付近）へ `"lookMode"` と `"look"` を追加する。
  理由: `"plain"` と `"custom"` は登録側から引き直せないため。

### 5. 複製を深いコピーにする

`duplicateSelected`（16531行付近）の `{ ...piece, ... }` に、`look` の作り直しを足す:

```js
const copy = { ...piece, id: nextId(), heldBy: null,
  look: piece.look ? normalizeLook(piece.look) : null,
  u: clamp(piece.u + 0.06, 0, 1), v: clamp(piece.v + 0.04, 0, 1) };
```

`normalizeLook` は新しいオブジェクトを組み立てて返すので、これで参照の共有が切れる。

> **触らないこと**: 同じ箇所で `route` と `beam` も浅くコピーされているが、
> **本発注の対象外**。既存の別の穴として Claude が別途起票する。ここでは直さない
> （直すと「絵が変わらない」以外の変化が混ざり、段階0の検証が濁るため）。

### 6. 描画関数の引数を広げる（受け取るが、まだ使わない）

- `paintBody(target, rig, color)` → **`paintBody(target, rig, color, look)`**。
  呼び出し元（`drawPerformer` 5346行・5366行、姿勢見本の呼び出し）で
  `resolveLook(piece, state.project.cast)` の結果を渡す。
  **関数の中では `look` を一切参照しない**（段階1aで使う）。
- `paintBody3d(ctx, body, P, rings, wheel, props, eyes, color)` →
  末尾に `look` を足す。呼び出しは stage-first-person.js 1335行の1箇所。
  FPV側は `window.SHOSAI_STAGE_BODY.resolveLook(piece, ...)` を使って求める。
  FPVがアクセスできる名簿の在処が無ければ、**この段階では `null` を渡してよい**
  （段階1aで経路を通す。そのとき「FPVから名簿をどう引くか」を決める）。

### 7. 純関数をテスト用に露出する

`window.SHOSAI_STAGE_BODY`（5328行付近）へ次を追加する:

```js
normalizeLook, resolveLook,
topKindById, bottomKindById, hairStyleById, lengthById, sleeveById,
LENGTHS, SLEEVES, TOP_KINDS, BOTTOM_KINDS, HAIR_STYLES,
```

`Object.freeze` の中に足すこと。既存の貸し出し（`poseById` 等）と同じ扱い。

## テスト（新規ファイル `tests/stage-avatar-look.test.mjs`）

作法は `tests/stage-beat-templates.test.mjs` と同じ
（`vm.runInNewContext` で stage-sketch.js を読み、`window.SHOSAI_STAGE_BODY` を取る）。

1. `normalizeLook(undefined)` / `normalizeLook(null)` / `normalizeLook("x")` が **null** を返す。
2. 有効な look が往復して値を保つ。
3. **未知の種類id（例 `"kimono_v9"`）が保存値としてそのまま残る**（既定へ潰れない）。
4. 半透明色（`"#ffffff80"`、`"rgba(0,0,0,.5)"`）は既定色へ落ちる。
5. `topKindById("kimono_v9")` が既定（`tshirt`）を返し、**引数の文字列を書き換えない**。
6. `resolveLook` の3状態:
   - `lookMode` 未設定＋名簿に look あり → 名簿の look
   - `lookMode: "plain"`＋名簿に look あり → **null**
   - `lookMode: "custom"`＋`piece.look` あり → `piece.look`
   - `castId` なし → null
   - 演者でない駒 → null
7. `LENGTHS` / `SLEEVES` の全項目が `id / label / labelEn / t` を持ち、`t` が昇順。
8. `TOP_KINDS` / `BOTTOM_KINDS` / `HAIR_STYLES` の全項目が必須キーを持つ。
9. `STASH_KEYS` に `lookMode` と `look` が含まれる（ソース文字列の検査でよい）。

## Claudeが行う検証（Codexは実施しなくてよい）

- `node --test tests/*.mjs` 全通過。
- 既存ショーJSONを読み、変更前後で描画結果が同一であること。
- `tools/check-object-on-performer.mjs` の新規検出0件。
- ブラウザ実機で読み込みエラー0。

## 実装の作法

- **着手前バックアップ**: `stage-sketch_backup_2026-08-20-before-avatar-look.js` と
  `stage-first-person_backup_2026-08-20-before-avatar-look.js` を作る。
- **バージョン**: `index.html` の `stage-sketch.js?v=` と `stage-first-person.js?v=` を
  それぞれ+1する（着手時点の現在値は v280 / v15。**必ず自分で現在値を確認してから**上げる）。
  `stage-sw.js` の `CACHE_NAME` も+1する（着手時点 `stage-sketch-pwa-v122`）。
- **i18n**: この段階ではUIを作らないので stage-i18n.js は触らない。
- 既存のコメントの文体（「なぜそうしたか」を日本語で書く）に合わせる。
- **保存JSONの形は上記以外変えない。** 古いJSONはフィールドが無いだけでそのまま読める。
- **commit・pushはしない**（本人の判断を待つ）。

## 実施結果（2026-08-21・Codex実装／Claude検証）

**完了。commit・pushはしていない。**

- 変更: stage-sketch.js（v280→281）／stage-first-person.js（v15→16）／index.html／
  **stage.html**／stage-sw.js（CACHE v122→123）／tests/stage-venue-library.test.mjs（版番号の照合）
- 新規: `tests/stage-avatar-look.test.mjs`（9件）
- **`stage.html` は本発注書に書き漏らしていた**（index.html と同じスクリプトを読む別ページ）。
  Codexが気づいて更新した。**以後の発注書にはstage.htmlも必ず書く。**

### Claudeが自分で実行して確認したこと

- `node --test tests/*.mjs` → **809件全通過**（Codexの報告と一致）。
- `poseExtent` がバックアップ版と**バイト単位で一致**（許可リスト運用の防波堤が守られている）。
- `paintBody` / `paintBody3d` の**本体は1行も変わっていない**（引数が1つ増えただけで、
  中では `look` を参照していない）。よって絵は変わらない。
- `tools/check-object-on-performer.mjs` → 6件。これは PROJECT_NOTES.md 記載の
  **既知・本人判断待ちの6件**（継ぎ目の庭 r1）と一致。判定ロジックには一切触れていないため
  本作業とは無関係。
- ブラウザ実機（stage.html）でコンソールエラー **0件**。演者は従来どおり単色で描画。
- 実機で新関数の振る舞いを9項目テスト → **全通過**。特に
  **未知id（`kimono_v9`）が保存値として残り、描画時だけ既定へ落ちる**前方互換が動作。

### 段階1aへの申し送り（★重要）

1. **3Dの服は今のままでは描かれない。** FPV側は `body.resolveLook(piece, data.cast)` を
   呼んでいるが、**`data` に `cast` は存在しない**（`data` は `state.bridge.read()` の戻り値で
   `{pieces, venue, sceneIndex, sceneCount, lang}`）。段階0では `undefined` → null が返るので
   無害だが、**段階1aで必ず bridge に名簿を渡す経路を作ること**。
2. **保存容量**: 全演者駒に `"lookMode":"cast","look":null` が書き出される。実測で
   継ぎ目の庭（演者駒123個）＝約7KB、垂直線v3（同400個）＝約24KB の増加。
   `build_stage_shows_local.py` のコメントに **localStorage 5MB上限に16件で6.08MB到達**という
   実測記録があり、容量はすでに逼迫している。
   ただし既存コードも `pose:"stand"` や `facing:0` など既定値を保存する方針なので、
   **本作業だけ例外にはしていない**。容量対策をするなら全フィールド共通の課題として別途起票する。

## やらないこと（この段階の境界）

- 服・髪を描くこと（段階1a・1b・2）
- UIを作ること（段階1a）
- `route` / `beam` の浅いコピーを直すこと（別件）
- `poseExtent` を変えること（**絶対に変えない**。許可リスト運用の基準のため）
