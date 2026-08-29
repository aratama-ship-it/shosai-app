# 舞台スケッチ 多言語化の事前準備（中国語簡体字・繁体字・フランス語）

作成: 2026-08-28（Claude／Fable 5）。実装は後日。**このフォルダは準備物の置き場で、
アプリからは一切読み込まれない**（index.html / stage.html から参照されず、キャッシュにも乗らない。
したがって版上げ〈?v= と stage-sw.js の CACHE_NAME〉は不要。実装で本体JSを触る日に初めて必要になる）。

英語版の精度向上は別セッションで進行中のため、**このフォルダの外にある既存ファイルには一切手を
入れていない**。stage-i18n.js / stage-prompt-i18n.js は読み取りのみ。

---

## 1. 成果物一覧

| ファイル | 内容 |
|---|---|
| `README.md` | 本書。全体方針・実装手順・未カバー範囲 |
| `GLOSSARY.md` | 劇場・サーカス用語の対訳表（日英仏・簡体・繁体）。根拠URL・確度付き。**言語間の「罠」一覧を含む** |
| `STYLE-fr.md` | フランス語の文体・組版・UI慣習の決定事項 |
| `STYLE-zh-Hans.md` | 簡体字中国語（大陸）の同上 |
| `STYLE-zh-Hant.md` | 繁体字中国語（台湾正体）の同上 |
| `stage-i18n.fr.draft.js` | UI辞書ドラフト（フランス語）。stage-i18n.js と同じ TEXT / MAPS / SAY 構造 |
| `stage-i18n.zh-Hans.draft.js` | UI辞書ドラフト（簡体字） |
| `stage-i18n.zh-Hant.draft.js` | UI辞書ドラフト（繁体字・台湾） |
| `stage-prompt-i18n.zh-Hant.draft.js` | ピッチ生成条件の繁体字ブロック（既存5言語への追加分）＋既存 zh への修正提案 |

各ドラフトJSは `window.SHOSAI_I18N_DRAFT_*` に入れてあり、既存のグローバルと衝突しない。
ファイル末尾に **NEEDS_REVIEW**（ネイティブ確認が要る鍵の一覧）を持つ。
これは stage-prompt-i18n.js の同名の仕組みに合わせた。

## 2. 対象言語と変種の決定

| コード | 変種 | 決定理由 |
|---|---|---|
| `fr` | 標準フランス語（fr-FR基準） | 劇場用語はフランス・ベルギー・ケベックでほぼ共通。サーカス語彙はケベック（シルク・ドゥ・ソレイユ、モントリオール国立サーカス学校）でも同じ語（roue Cyr, mât chinois, bascule）が使われるため一本でよい。差が出る箇所は GLOSSARY に注記 |
| `zh-Hans` | 大陸（中国）簡体字 | 劇場の現場語（面光・耳光・走位・暗场など）は大陸の舞台美術の標準語彙に合わせた |
| `zh-Hant` | 台湾正体 | 台湾はUI語彙（儲存/匯出/設定）も劇場語彙（左舞台/翼幕/沿幕）も大陸と別系統。香港はUI語彙が台湾に近く劇場語彙が大陸に近い混合で、今回は台湾に統一（香港差分は GLOSSARY 注記のみ） |

## 3. いちばん大事な発見（訳語の罠）

詳細は GLOSSARY.md 冒頭。要点だけ:

1. **日本語「上手/下手」と中国語「上場門/下場門」は上下の文字が逆対応。**
   日本の上手＝客席から見て右。中国の伝統は「左上右下」＝上場門が客席から見て**左**。
   つまり 上手＝下場門側、下手＝上場門側。文字面で訳すと左右が反転する。
2. **台湾の「上舞台/下舞台」は左右ではなく奥行き**（上舞台=奥/upstage、下舞台=手前）。
   日本語の「上手」と混線しやすい。台湾の左右は俳優視点の「左舞台/右舞台」（＝英語 stage left/right と同じ）。
3. **フランス語は左右を cour / jardin で呼ぶ**（客席から見て右=cour=上手、左=jardin=下手）。
   「gauche/droite」で書くのは素人くさく、かつ視点が曖昧になるので使わない。
4. **「転がし」の簡体字は「流動光」**（地面側光）。既存 stage-prompt-i18n.js の「地排光」は
   ホリゾント下端列の意味なので、NEEDS_REVIEW どおり要修正（提案は `stage-prompt-i18n.zh-Hant.draft.js` 末尾）。
5. シーン（scène）と舞台（フランス語で同じく scène になりがち）の衝突は、
   **舞台＝plateau、シーン＝scène** で書き分けて解消（現場の言い方でもある）。

## 4. 現行の仕組み（読み取り結果の要約）

- `stage-i18n.js` … UIの二言語辞書。`TEXT`（日本語文そのものが鍵→英訳）、`MAPS`（id鍵の組み立て名）、
  `SAY`（操作後の一言。日本語文への正規表現→英語テンプレ。**上から最初に合った一つだけ使われる**ので順序に意味がある）。
- `stage-sketch.js` … `lang`（"ja"/"en" の二値）、`isEn()`、`tx(ja)`、`tm(group,id,ja)`。
  初期言語は `resolveInitialStageLanguage(openLang, storage, navigator)`（?lang= → localStorage
  "shosai-stage-lang" → navigator.language、jaで始まればja、それ以外はen）。
  生成名 `sceneTitle(n)`（「シーン n」/"Scene n"）と `untitledShow()` は**作成時の言語で焼き付く**仕様。
- `stage-prompt-i18n.js` … ピッチ書き出しの生成条件。**すでに ja/en/fr/zh/ko の5言語**。
  UIとは独立に言語選択される。`NEEDS_REVIEW` の仕組みはここ発祥。

## 5. 実装時の設計提案（後日の作業指示に使える粒度で）

現行の「英語なら辞書を引き、なければ日本語キーをそのまま出す」構造は多言語にそのまま拡張できる。

1. **辞書をパック化する。** 案:
   ```js
   // stage-i18n.js 側（または言語ごとに別ファイルにして index.html で読み込み）
   window.SHOSAI_I18N_PACKS = {
     en: { text, maps, say },          // 既存 SHOSAI_I18N の中身
     fr: { ... },                       // stage-i18n.fr.draft.js の中身
     "zh-Hans": { ... },
     "zh-Hant": { ... },
   };
   ```
   ドラフトの中身はこの形にそのまま流用できる（グローバル名だけ変える）。
2. **stage-sketch.js の置き換え点。**
   - `let lang` の値域を `"ja" | "en" | "fr" | "zh-Hans" | "zh-Hant"` に。
   - `isEn()` 依存を `pack()`（現在言語の辞書 or null）に置き換え:
     `const tx = (ja) => (pack() && pack().text[ja]) || ja;` `tm` も同様。
     SAYの適用関数も `pack().say` を見る。
   - `resolveInitialStageLanguage` の判定表を拡張:
     `zh-TW / zh-Hant / zh-HK / zh-MO → zh-Hant`、`zh / zh-CN / zh-Hans / zh-SG → zh-Hans`、
     `fr* → fr`、`ja* → ja`、他 → en。保存値も同じ正規化を通す（旧保存値 "en"/"ja" はそのまま有効）。
   - `sceneTitle(n)` / `untitledShow()` を言語表引きに（各ドラフトの `generated` 節に訳を用意済み）。
   - 設定モーダルの言語トグル（日英2択）→ 5択のセレクトへ。スマホ閲覧機の
     `setPhoneButtonLang`（日本語/English の2ボタン）も同様に拡張。
   - 説明文「画面の文字を日本語と英語で切り替えます。」の文言更新（TEXT鍵も5言語分ある）。
3. **フォント。** 中国語はシステムフォント指定を確認する
   （Apple: PingFang SC / TC、Windows: Microsoft YaHei / JhengHei、他: Noto Sans SC / TC）。
   現行CSSが日本語前提のフォントスタックなら `:lang(zh-Hans)` / `:lang(zh-Hant)` で分岐。
   `<html lang>` も言語切替に追従させる（スクリーンリーダー・約物・禁則に効く）。
4. **レイアウト伸縮。** フランス語は日本語比で1.5〜2倍に伸びるボタンがある（例: 書き出す→Exporter は同等だが、
   「見る位置の図→Plan de salle」等はみ出し候補あり）。中国語は逆に短くなる。実装時に主要パネルを
   fr で目視確認する工程を1つ入れる。
5. **版上げ。** 実装当日は通例どおり: index.html の `?v=`、stage-sw.js の `CACHE_NAME`、
   `build_stage.py` 再実行（stage.html は生成物）、版ピンテスト。

## 6. 今回カバーしていないもの（実装計画時に判断）

- **使いかたの冊子・クイックガイド**（manual/ 以下、10章35節。日英二言語化が2026-08-28に完了したばかり）。
  仏中への展開は文量が多く、UIより後回しでよい。UIだけ先行多言語化した場合、
  「使い方をさがす」検索は日英の冊子に当たる旨をどこかで示す必要がある。
- **AIパネル**（Macアプリ内のAI指示）… 指示は自由文なので辞書対象外。UI枠のみ本ドラフトに含む。
- **開発者の言葉（このアプリについて）** … 本人の一人称の文章。ドラフト訳は作ったが、
  公開前に本人がトーンを確認すべき（NEEDS_REVIEWに明記）。
- **音声なし・法務なし**: 対象外の周辺物なし。

## 7. 検証の計画（実装前にやること）

1. **ネイティブチェック**: 各ドラフト末尾の NEEDS_REVIEW を、その言語の舞台関係者
   （劇場勤務者・サーカス学校出身者が理想）に見せる。UI全文より先に用語集（GLOSSARY.md）を
   見せると効率がよい。
2. **機械チェック**: 実装時に「TEXT の鍵集合が ja 原本と一致するか」「SAY の正規表現が原本と
   同一か」を diff で確認（ドラフトは原本の並び・コメント区切りを保ってあるので diff しやすい）。
3. **表示確認**: fr のはみ出し、zh の行間・フォント、« » と 「」 の描画。

## 8. 出典（主要なもの。詳細は GLOSSARY.md の各行）

- 仏: fr.wikipedia「Côté cour et côté jardin」、Odéon 劇場公式 Lexique、
  l'Agence culturelle d'Alsace（machinerie-spectacle.org / lumiere-spectacle.org）、
  BnF/CNAC サーカス用語集（cirque-cnac.bnf.fr）
- 中（大陸）: 中国舞台美術学会・舞台照明灯位解説（面光/耳光/流動光ほか）、舞台幕布（大幕/二道幕/側幕/天幕）解説各種
- 中（台湾）: 台湾教育部芸術教育資料「劇場專有名詞」、劇場術語解説記事（左舞台/右舞台/上舞台/下舞台、翼幕/沿幕）
