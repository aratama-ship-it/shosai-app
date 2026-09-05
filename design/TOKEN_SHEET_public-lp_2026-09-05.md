# 舞台スケッチ 公開版LP — デザイントークンシート（2026-09-05 改訂）

**このシートが正。** 初版は `docs/stage-sketch/2026-09-03_舞台スケッチ_公開版LP_参照ブリーフと実装計画.html` の6節。
本人指示で値が動いたぶんをここで引き継ぐ。値を変えるときはコードより先にここを直す。
コントラストは `.claude/skills/design-web/tools/contrast.mjs` で実測（2026-09-03／09-05）。

## 0. コンセプト1行
暗い机の上に、紙の舞台が一枚だけ置いてある。触ると動く。——アプリ本体の意匠の延長。

## 1. 配色（変更なし・アプリ本体 :root を継承）
| トークン | 値 | 役割 | 対desk 実測 |
|---|---|---|---|
| --desk | #191512 | 背景 | — |
| --desk-2 | #201b16 | 枠の中・注意点の地 | — |
| --line-dark | #382f25 | 罫（★文字には使わない。1.38:1） | 1.38:1 |
| --paper | #efe7d6 | 本文・名前 | 14.75:1 |
| --paper-line | #d8c9ab | 役どころ・機能の本文 | 11.11:1 |
| --ink-soft-sm | #93856c | 注釈・リンク・区切り記号 | 5.02:1 |
| --brass | #9c823f | 札・小見出し・下線 | 4.91:1 |
| --rust-ink | #df6433 | 暗い背景の上の強調リンク | 5.19:1 |
| --rust | #a84b26 | 見出しの左罫・ボタンの縁（大きい面のみ） | 3.20:1 |

## 2. タイポグラフィ（PC / 760px以下）
| 用途 | サイズ | 行間 | 字間 | 書体 |
|---|---|---|---|---|
| 名前（h1） | 84px / 44px | 1.15 | .08em | 明朝 |
| 一行（uses-lead） | 28px / 20px | 1.6 | .04em | 明朝 |
| 帯の見出し（h2） | 25px / 20px | 1.5 | .03em | 明朝 |
| 機能の見出し（h3） | 25px / 20px | 1.5 | .03em | 明朝 |
| 本文 | 16px | 1.8 | .02em | 明朝 |
| **このアプリについて 本文** | **17px / 16px** | **1.95** | .02em | 明朝 |
| 役どころ・機能の本文 | 17px / 15px | 1.85 | — | ゴシック |
| 注釈・リンク | 13px | 1.7 | — | ゴシック |
| 札・番号 | 11〜12px | — | .12〜.28em | ゴシック |

行長: 「このアプリについて」の本文列は **最大 720px ＝ 17pxで約42字**（A_design §3: 30〜50字）。
ジャンプ率 84/16 = 5.25倍は「見る」ページとして本人が選んだ値。読む帯（このアプリについて）は 25/17 = 1.5倍で落とす。

## 3. 余白・レイアウト
- 余白スケール: 4 / 8 / 16 / 24 / 40 / 64 / 96（--space-1〜7）
- **コンテナ最大幅: 全帯 1320px（--wide）で端を揃える。** ★2026-09-05: それまで hero 1180／機能 1400／読み物 680 と帯ごとに違い、「このアプリについて」だけが細く見えた（本人指摘）。同レベルの帯は同じ枠に揃える（A_design §11）。
- 「このアプリについて」: 2列。左 = 見出し＋リンク（1fr）、右 = 本文（最大720px）。900px未満は1列。帯の上下は --space-7、上に 1px の罫。
- 13の機能: 列 8fr:4fr（偶数回は入れ替え）、画像は列の66%、機能どうしの間 120px。
- ブレークポイント: 560px（iPhoneフレームの横並び）／760px（文字サイズ）／900px（2列）
- **タップ対象: 44px以上。** 上部リンク・言語切替・フッターのリンクは padding-block で高さを確保する（design-lint U1: 25px・13px を検出）。

## 4. 形状・素材（変更なし）
角丸 4 / 10 / 16px。影 0 2px 10px rgba(0,0,0,.35)。罫 1px --line-dark。iPhoneフレーム: 角丸34px・ベゼル10px・画面角丸24px。

## 5. モーション（変更なし）
--motion-ui 180ms ease-out／--motion-reveal 320ms ease-out 12px／prefers-reduced-motion: reduce で無効。

## 追記 2026-09-05（マーケ見直し・第1弾）
- `.btn-main` の地: rgba(168,75,38,**.12**)。.18 だと合成後 #321F16 に対し文字 #DF6433 が 4.46:1 で 4.5 を割る（design-lint C1 実測）。.12 で #2A1C14・4.72:1。
- `prefers-reduced-motion: reduce` では animation に加えて transition も止める（ボタンの hover 180ms が最初の画面に入ったため）。
- ヒーローの動画上限 56vh→50vh（名前の下に「何のツールか」の一文 18px/1.7 と二つの入口を足したため）。1440×900 で動画の上端 496px。

## 追記 2026-09-05（第2弾・証拠帯／OGP）
- 証拠帯 `.proof`: hero直後。見出し無し・4項目・太字14px（--paper）＋注記13px（--ink-soft-sm）。上下罫 --line-dark。900px以上で4列、未満で2列。
- 帯の順: hero → 証拠帯 → 13の機能 → このアプリについて → CTA（作者の話は13の機能の後ろへ・本人承認）。
- OGP画像: 1200×630（実体2400×1260 JPEG q90・約210KB）。左に名前84px/明朝・一文24px、右に hero-poster の切り抜き。元は public-lp/og/og-source.html、生成は build_og.py。

## 追記 2026-09-05（第3弾・英語版を別URLに分離）
- **英語の入口は `/en/`（静的ページ）。** 題・説明・OGPはJSで書き換えない。SNSのクローラーとGoogleはJSを実行せず、Accept-Language も送らないため、サーバー側の出し分けでも英語カードは出せない。`/` と `/en/` に `hreflang`（ja / en / x-default）を相互に張り、`canonical` と `og:url` は各ページ自身を指す。
- HTMLは二重に持たない。`public-lp/index.html`（日本語版）が正本で、`/en/index.html` は `build_public.py` の `english_lp()` が meta だけ差し替えて生成する。差し替えが1件でも当たらなければビルドを止める。
- `/en/` は1階層下なので、`media/` `icons/` `beta.html` の相対パスを生成時に絶対パス化する。`/en/` では言語を `"en"` に固定し、端末の言語や `?lang=` で上書きしない。
- 画面の言語リンクは `?lang=` から `/`・`/en/` に変更（共有されたURLがそのまま言語を表すため）。`?lang=` は既存の共有URL向けにJS側で受け続ける。
- **`.lang-switch a`（フッターの言語リンク）: `display:inline-block; padding:12px 4px;`。** 「日本語」は文字幅40pxで、inline のままだと幅が44pxに届かない（design-lint U1・実測 40.0×50.1px）。★これまでのlintは `?lang=ja` で測っており、日本語表示ではこのリンクが隠れるため検出できていなかった。以後は日本語版・英語版の両方を測る。

## 追記 2026-09-05（第3弾-2・英語のSNSカードと /beta・/try の日英meta）
- **英語のSNSカード画像: `media/og-1200x630-en.jpg`。** 元は日本語版と同じ `public-lp/og/og-source.html` 1枚で、`?lang=en` で英語になる（CSSと絵を二重に持たない）。`build_og.py` が2枚とも書き出す。
- カード内の英語の寸法（実測して決めた値）: `[lang="en"] .name` **74px**（日本語84pxのままでは名前12文字が列幅536pxに収まらない。74pxで実幅512px）。`[lang="en"] .what` **22px / max-width 500px**。`[lang="en"] .foot` **15px / gap 18px**（16px・gap22pxでは自然幅568pxで枠536pxを超え、語の途中で折り返していた）。
- **`.foot > *{ white-space:nowrap; }` を必ず併用する。** 折り返せる状態だと、はみ出しても見た目が崩れず静かに切れた絵が出る。`build_og.py` が毎回 `scrollWidth > clientWidth` で測り、超えたら書き出さずに止める（guard が実際に効くことを 84px・gap22px で確認済み）。
- **`/beta` と `/try` にも日英の description・OGP を入れた。** URLは `/beta`・`/en/beta`・`/try`・`/en/try`。canonical と og:url は各ページ自身、hreflang は3本とも日英で同じ。カード画像は英語版だけ `-en.jpg`。
- `/en/try.html` は本体（stage-sketch.js）が `?lang=` を見て開く言語を決めるため、本体が読み込まれる前に `history.replaceState` で `lang=en` をURLへ足す。これが無いと端末が日本語の人には日本語で開き、英語のURLとして人に渡せない。
- **`public-beta.html` の `.lang-switch a{padding-inline:4px}`。** 「日本語」は文字幅41pxで、上下の余白（`.small a` の `padding-block:12px`）だけでは幅が44pxに届かない（design-lint U1・実測 41.3×48.8px）。LPの `.lang-switch` と同型の問題で、英語表示のときしか出ないリンクのため日本語版だけを測っていた間は見つからなかった。

## 追記 2026-09-05（第3弾-3・英語の用語統一と sitemap）
- **英語の用語の正本は製品UI**（`stage-i18n.js` と `stage-venues.js`）。LP・紹介ページ・体験版の英語はそこに合わせる。使わない言い方（`full beta version` / `full version (beta)` / `beta version` / `trial version` / `introduction page`）はテストで検査して弾く。
- **書き分け**: 「製品版」= *the full version* ／「製品版（β）」「製品版ベータ」= *the full beta* ／「体験版」= *the preview*。片方に寄せない（LP・紹介ページ・アプリで同じ書き分けをしている）。
- **★会場名の訳語が別の実体と衝突していた。** LPの英語が シャピトー を "big top" と訳していたが、アプリの "Big top" は別の会場（`arena`・日本語「ビッグトップ」）。読んだ人がアプリで違う会場を選ぶ。LPを "a big top in the round, or a touring chapiteau." に修正し、体験版の会場の帯（`?embed=1` 時のみ表示）も「アリーナ」/"Arena" → 「ビッグトップ」/"Big top" に統一。
- 錠の `aria-label` は括弧も言語で変える（英語に全角の（）が混じると読み上げが崩れる。実機で `Seat（full version）` を確認・46か所）。
- **`sitemap.xml`（日英6URL・hreflang付き）と `robots.txt` を配信に追加。** URLは各ページが宣言している `canonical` から生成し、ページ側の `hreflang` と食い違えばビルドを止める（一覧を二重に持たない）。`<lastmod>` は入れない（ビルド日時＝毎回全更新の申告になり実態と違う）。
