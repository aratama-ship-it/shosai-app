# フランス語スタイルガイド（舞台スケッチUI）

作成: 2026-08-28。`stage-i18n.fr.draft.js` の訳はすべて本書の決定に従う。

## 1. 声と文体

- **vous（vouvoiement）で統一。** tu は使わない。命令形は vous 形（Exportez…ではなく不定詞、下記）。
- **ボタン・メニューは不定詞。** 仏語UIの標準（Apple/Microsoft共通）: Exporter / Importer / Fermer / Annuler。
  名詞でもよい場面（見出し）は名詞: Réglages, Sauvegarde。
- **説明文は現在形・短文・具体物。** 日本語原文の「道具の手ざわり」を保つ。
  直訳調の «Veuillez…» の乱発を避け、案内は «…, puis appuyez sur X» のような自然な指示文にする。
- **劇場の現場語を使う**（GLOSSARY準拠）: plateau / salle / lointain / face / cour / jardin /
  coulisses / conduite / implantation / noir。素人向け言い換えはしない（このアプリの使い手は現場の人）。
- 英語借用は現場で定着しているものだけ許可: **cue** は仏では **top** を優先。**spike** は marquage。

## 2. 綴りと組版（重要）

- **句読点前の空白**: `:` `;` `!` `?` の前に**ノーブレークスペース（U+00A0）**を置く
  （狭い U+202F が理想だがフォント事情により U+00A0 で統一。既存 stage-prompt-i18n.js の仏文も
  «Remarque :» 形式で空白入りにしている——ただし通常スペースなので、実装時に U+00A0 へ揃えると折返し事故がなくなる）。
- **引用符**: « … »（内側に U+00A2 ではなく U+00A0）。UI要素名の引用も « Exporter » の形。
  日本語の「」・英語の " " をそのまま残さない。アポストロフィは ' (U+2019)。
- **数値**: 小数は**カンマ**（1,2 m）。数値と単位の間に U+00A0（5 m／30 %）。範囲は 8–12（enダッシュ）。
- **大文字**: 文頭のみ大文字（Title Case禁止）。見出しも Sentence case: «Plan de salle»。
  月・言語名は小文字（le français）。
- **省略記号**: … (U+2026)。

## 3. 統一訳（アプリ固有の言い回し）

| 原文の考え方 | 採用 | 退けた案と理由 |
|---|---|---|
| 舞台スケッチ（製品名） | **Stage Sketch**（無変換） | «Croquis de plateau» は説明としては良いが製品名が割れる。英名維持が仏圏アプリの通例。※本人判断待ちの箇所 |
| 書斎 | **Le Bureau** | «Cabinet» は診療室・トイレの連想。Bureau は机と書斎の両義でアプリの比喩と合う |
| 机／稽古場／手元 | le bureau / la salle de répétition / à la main | 三段の運び「机→稽古場→現場」を bureau → répétition → sur place, à la main で保つ |
| ショー | le spectacle | show は口語すぎる |
| シーン | la scène | 舞台=plateau と書き分け（GLOSSARY罠4） |
| 出るもの | Interprètes & décor | 直訳 «Ce qui apparaît» は不自然 |
| 書き出す／読み込む | Exporter / Importer | ファイル選択の文脈のみ Charger |
| 一つ戻す／やり直す | Annuler / Rétablir | 標準UI語。「中止」系の Annuler と衝突するため、**操作の中止は Abandonner** を使う |
| 控えを取る | garder une copie | «backup» は使わない |
| 暗転 | le noir（faire le noir） | blackout は英語のまま使わない |
| 転換 | la transition | changement de décor は装置転換に限定される |
| 動線 | le trajet | «route» は道路の連想 |
| バミリ図 | les marquages au sol | — |
| 明かりのキューシート | la conduite lumière | 定訳 |
| 小道具の香盤表 | la conduite accessoires | 定訳 |
| 見る位置の図 | le plan de salle | 定訳（座席表） |
| プレゼン（モード） | le mode présentation | — |
| 吊物 | suspendu(e)(s) | flown の直訳 «volé» は誤訳になる |
| 共有セッション | la session partagée | — |
| ゲスト／ホスト | invité / hôte | — |
| せり | l'élévateur（de scène） | tampon は正しいが通じる層が狭い。tooltip等の長文では併記可 |

## 4. 文法の運用ルール（SAYテンプレの肝）

SAY は「$1」に**名前（性が不明な名詞）**が入るため、性数一致が問題になる。方針:

1. **一致を要しない構文を優先する。**
   - ◎ «Suppression de « $1 ».» ではやや事務的すぎるので、
     **暗黙の élément（男性名詞）に一致させる**書き方を標準とする: «« $1 » est supprimé.»
   - 人物と分かっている文（演者だけが主語になる文）も、UI表示名への一致は男性形で統一し、
     STYLE註として «accord neutre sur l'élément affiché» と明記（仏語UIの一般慣行）。
2. **語順の自然さを優先し、直訳の «a été 〜» 連発を避ける。** 完了の報告は現在形か過去分詞単独:
   «Itinéraire effacé.» «Session terminée.»
3. **数の一致**: $1 が数値の文は複数形で書く（«$1 trajets tracés.»）。1の場合に単数へ切り替える機構は
   現行に無いので、**数詞+名詞の複数表記で通す**（1 でも «1 trajets» とならないよう、
   語順を «Trajets tracés : $1.» 型に逃がす手も各文で選択済み）。
4. **冠詞と前置詞の縮約**: à/de + 名前 の縮約事故を避けるため、名前は必ず « » で包む。

## 5. フォント・表示

- 仏語はアクセント付き大文字を正とする（É, À, Ç…。«Édition» を «Edition» にしない）。
- 長さ: 日本語比 1.3〜2 倍。ボタン要注意リスト: 「見る位置の図→Plan de salle」「整列→Aligner」
  「持たせる…→Donner un objet…」。実装時に fr で全パネルを目視。

## 6. NEEDS_REVIEW の考え方

- 仏語ドラフトの △ は「誤りかもしれない」ではなく「**現場の多数派か未確認**」の意味。
  優先確認先: 劇場のrégisseur経験者、またはCNAC/FEDEC系の学校出身者。
- 特に: rideau de mi-plateau（中割り幕の短い呼び）、bascule coréenne vs planche coréenne、
  trim の仏語現場での言い方、開発者の言葉（このアプリについて）の文学的トーン。
