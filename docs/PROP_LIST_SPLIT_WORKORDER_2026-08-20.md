# 発注書：「出るもの」一覧を 演者／舞台セット／小道具 に分ける 2026-08-20

Claudeが仕様を決め、Codexが実装し、Claudeが検証する。この文書だけで着手できるように書く。
前提: 小道具の登録・持たせ・形プリセットは実装済み
（PROP_HOLDING / PROP_SHAPES の各発注書。現在 stage-sketch v259・CACHE v90）。

## 背景（本人の指摘・2026-08-20）

小道具を登録すると「舞台セット」の一覧に家具・道具と混ざって並ぶ。
**「出るもの」の一覧を 演者／舞台セット／小道具 の3グループ表示に分けたい。**

## 既存の構造（ここに乗せる）

- index.html 339行付近: `stage-group-cast`（見出し「演者」＋ `stage-cast-list`）と
  `stage-group-sets`（見出し「舞台セット」＋「セットを組む」ボタン＋ `stage-set-list`）が
  `.stage-roster-group` として並ぶ。
- `renderSets()`（stage-sketch.js ~9996行〜）が `state.project.sets` の light 以外を
  `stage-set-list` へ描いている。照明は別パネル（変更しない）。

## やること

1. **index.html**: `stage-group-sets` の直後に小道具グループを追加。
   ```html
   <div class="stage-roster-group" id="stage-group-props" data-tablet-break-before>
     <p class="stage-roster-head">小道具</p>
     <div class="stage-cast-list" id="stage-prop-list"></div>
   </div>
   ```
2. **renderSets()**: light 以外の items を `kind === "prop"` とそれ以外に分け、
   prop は `stage-prop-list` へ、それ以外は従来どおり `stage-set-list` へ、
   **同じ行UI（色見本・名前・舞台上/舞台裏・錠・寸法・✕）のまま**描く。
   行を作る処理は関数に切り出して二つのリストで共用し、コピペで二重にしない。
3. **空のときの扱い**: 小道具が0件のときは `stage-group-props` を隠す（`hidden`）。
   演者・舞台セットの既存グループに空の扱いのロジックが既にあるなら、それに合わせる。
   無ければ「小道具だけ隠す」でよい（登録の入口は追加行なので、空見出しを常設しない）。
4. **見出しの英訳**: 「演者」「舞台セット」の見出しがどう英語化されているかを
   stage-i18n.js で確認し、**同じ仕組みで**「小道具」→ "Props" を足す。
   `tests/stage-i18n-coverage.test.mjs` が落ちないこと。
5. **テスト**: `tests/stage-prop-shapes.test.mjs` か新規ファイルに、
   - index.html に `stage-group-props` と `stage-prop-list` がある
   - renderSets が prop を `stage-prop-list` へ振り分けている
   のソースパターン検査を追加。
6. **版上げと再生成**: `stage-sketch.js?v=260`（index.html と stage-sw.js）、
   i18n を触ったら `stage-i18n.js?v=63`、`CACHE_NAME` を `stage-sketch-pwa-v91`。
   版をピンしているテスト（stage-venue-library / stage-pitch-export）の期待値を更新。
   `python3 build_stage.py` で stage.html を再生成。
7. 既存テスト全部が通る（`tests/` で `node --test index.mjs`）。

## 制約（必ず守る）

- ファイルの削除・移動・改名はしない。`*_backup_*` に触らない。
- 既存ファイルは編集前に必ず該当箇所を読む（iCloud共有ワークスペース）。
- 関係ないコードのリファクタ・整形をしない。行UIの見た目・機能を変えない。
- コメントは既存の流儀（日本語で「なぜ」）に合わせる。
