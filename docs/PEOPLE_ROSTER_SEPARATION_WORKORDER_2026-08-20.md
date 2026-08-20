# 制作の書斎 — 資料棚と人物名簿の役割分離

作成日: 2026-08-20  
用途: Claude Codeへそのまま渡す実装プロンプト  
対象リポジトリ: `/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

---

## Claude Codeへ渡すプロンプト

以下を一つの実装タスクとして進めてください。

### 目的

「制作の書斎」の人物情報の置き場所を整理したいです。

- **資料棚**は、作品そのものの内容、構造、演出、装置、観客体験、出典などを読む場所に集中させる。
- **名簿**は、人を探す場所にする。
- 名簿の中で、現在の暗号化されたスカウティング名簿を「アーティスト」として維持する。
- それとは混ぜずに、作品クレジットから確認できる音響、照明、舞台美術、大道具・小道具、舞台監督、技術監督、リギング等を「制作・技術スタッフ」として別に閲覧できるようにする。

この依頼でいう「資料棚はショーの内容を扱う」は、登録済みの作品・映画・舞台・式典等を削る意味ではありません。**作品を入口に読む画面と、人を入口に読む画面を分離する**という意味です。

### 最初に必ず行う確認

1. リポジトリ直下の `AGENTS.md` / `CLAUDE.md` と `README.md` を読む。
2. `git status --short` と `git rev-parse --show-toplevel` を確認する。
3. 次のファイルを読む。
   - `index.html`
   - `app.js`
   - `roster.js`
   - `style.css`
   - `build_db.py`
   - `tests/roster-passphrase-regressions.test.mjs`
   - `tests/db-shelves.test.mjs`
   - `build_stage.py`
4. 既存の未コミット変更を保護対象として扱う。今回と無関係な差分を戻したり、上書きしたりしない。
5. 実装前に、変更予定ファイルと実装方針を短く報告する。

現時点の観測値は、作品2,663件・人物1,331人です。ただし件数をUIやテストへ固定値として埋め込まず、作業開始時に現在値を再確認してください。

---

## 1. 資料棚の変更

資料棚を「作品から読む場所」に戻してください。

### 必須変更

- `index.html` の詳細フィルター見出しを、
  - 現在: `会社・人物・調査レベル・並び順`
  - 変更後: `会社・調査レベル・並び順`
  とする。
- `#db-person` の人物絞り込みを資料棚から外す。
- `app.js` の `dbState.person`、人物フィルター構築、人物フィルターのbind、人物による `dbFilter()` 分岐を外す。
- 資料棚の全文検索インデックスから人物名・人物クレジットを外す。人名を検索して作品を逆引きする機能は名簿側へ移す。
- 作品詳細の独立した `人（N）` セクションを資料棚から外す。
- 調査レベルの詳細表示にある `人物 N` は表示しない。

### 守ること

- `w.people` や `SHOSAI_DB.persons` 自体は削除しない。名簿の制作・技術スタッフ索引が使用する。
- `show-reference/data/*.json` は変更しない。
- 生成物 `db.js` を手編集しない。
- 作品クレジットを正本から削除しない。今回はUI上の入口を分離するだけ。
- 調査レベルの既存スコア体系を、このタスクだけで全面再設計しない。
- 会社、ジャンル、調査レベル、並び順、演出レンズ、関連作品・関連表現は維持する。

---

## 2. 名簿の情報設計

`#roster` の中に、次の二つの明確に分かれた入口を設けてください。

1. **アーティスト**
   - 現在のスカウティングレポート由来の暗号化名簿。
   - 人・グループ、スキル、写真、SNS、連絡先等を扱う。
   - 現在の合言葉による解錠、暗号化、読み取り専用という境界を一切弱めない。

2. **制作・技術スタッフ**
   - `SHOSAI_DB.persons` と `SHOSAI_DB.works[*].people` から、その場で組み立てる作品クレジット索引。
   - 作品クレジットに確認できる氏名、職種、担当作品、クレジット表記、確信度だけを表示する。
   - 連絡先、SNS、写真、依頼可否、現在の所属は表示・推測しない。

入口は単なる設定用ピルではなく、「人の索引を二冊に分けて読む」感覚が分かる見た目にしてください。既存の書斎・紙・索引の意匠を継承し、青紫グラデーション、ガラス風カード、Bento UIなど別サービスにも使える一般的なAI風UIにはしないでください。

推奨文言:

- kicker: `PEOPLE INDEX`
- 見出し: `名簿から、人をたどる`
- 説明: `舞台に立つ人と、舞台を成立させる人を、別の索引として読む。`
- 入口: `アーティスト` / `制作・技術スタッフ`
- 制作・技術スタッフ側の注意書き:
  `作品クレジットで確認できた範囲を収録しています。現在の所属、連絡先、依頼可否を示すものではありません。`

### 重要な配置

- 二つの入口は、合言葉ゲートより上に置く。
- 合言葉ゲートは「アーティスト」を選んだときだけ表示する。
- 「制作・技術スタッフ」は、すでに `db.js` で配信されている公開クレジット情報だけを使うため、`scout_pass` を要求しない。
- アーティスト名簿と制作・技術スタッフを、名前一致だけで自動統合しない。同姓同名・別表記・グループ名があり得るため、別データとして保持する。

---

## 3. 制作・技術スタッフ索引の仕様

### データの組み立て

- 人物ID単位で重複をまとめる。
- `SHOSAI_DB.persons[person_id]` から以下を使う。
  - `name`
  - `name_ja`
  - `roles`
- `SHOSAI_DB.works[*].people[]` を走査し、以下の作品別クレジットを人物へ逆引きする。
  - `work.id`
  - `work.title`
  - `work.company`
  - `work.year`
  - `people[].role`
  - `people[].credit_label`
  - `people[].source`
  - `people[].confidence`
- 同じ人物・同じ作品・同じクレジット表記の重複は一つにまとめる。
- 作品リンクは既存の `#db/<work_id>` を使用し、クリック後は資料棚の作品内容へ移動できるようにする。

### 職種グループ

職種の判定表は、一か所の定数へまとめてください。少なくとも次を将来追加可能な形で用意します。

1. `舞台進行・制作`
   - `stage_manager`
   - `production_manager`
   - `technical_director`
   - `production_consultant`
   - `company_manager`
   - `producer`

2. `舞台美術・大道具・小道具`
   - `set_designer`
   - `theatre_designer`
   - `scenic_designer`
   - `scenic_fabricator`
   - `stage_carpenter`
   - `props_master`
   - `property_master`
   - `prop_designer`
   - `puppet_designer`

3. `照明`
   - `lighting_designer`
   - `lighting_programmer`
   - `lighting_operator`
   - `lighting_system_engineer`

4. `音響`
   - `sound_designer`
   - `sound_engineer`
   - `sound_operator`
   - `system_engineer`
   - `audio_system_engineer`
   - `network_audio_engineer`
   - `spatial_audio_engineer`
   - `acoustician`
   - `structural_acoustician`

5. `映像・投影`
   - `projection_designer`
   - `video_designer`
   - `projectionist`
   - `media_server_programmer`
   - `video_operator`

6. `リギング・機構・自動化`
   - `rigging_designer`
   - `rigger`
   - `automation_designer`
   - `automation_programmer`
   - `automation_operator`
   - `stage_machinery_engineer`

7. `衣装・ヘア・メイク`
   - `costume_designer`
   - `wardrobe_supervisor`
   - `makeup_designer`
   - `hair_designer`
   - `fashion_designer`

8. `特殊効果・専門設計`
   - `special_effects_designer`
   - `pyrotechnician`
   - `magic_designer`
   - `aerial_designer`
   - `acrobatic_designer`
   - `stage_safety_manager`

一人が複数グループに属してよいものとし、無理に一つの主職種へ固定しないでください。

### 既存データの役職ずれへの対応

現行の正本では、舞台監督が `director`、Props Masterが `set_designer`、Technical Directorが `lighting_designer` 等へ暫定対応されている例があります。

このUIタスクでは正本のroleを書き換えません。代わりに、作品別の `credit_label` に次のような職名が**明記されている場合だけ**、該当グループにも表示してください。

- `舞台監督` / `Stage Manager`
- `技術監督` / `Technical Director`
- `制作監督` / `Production Manager` / `Production Consultant`
- `大道具` / `Scenic` / `Carpenter` / `Fabrication`
- `小道具` / `Props Master` / `Property Master`
- `照明` / `Lighting`
- `音響` / `Sound Designer` / `Sound Engineer` / `Audio`
- `映像` / `Projection` / `Video`
- `リギング` / `Rigging`
- `自動化` / `Automation`
- `衣装` / `Wardrobe` / `Costume`
- `特殊効果` / `Special Effects` / `Pyro`

判定はroleまたは明示的なcredit_labelだけに限定し、人物ノート、名前、会社、作品ジャンルから職種を推測しないでください。元のroleは上書きせず、詳細では公式掲載に近い `credit_label` を優先表示します。

### 除外

次のroleしか持たず、技術系credit_labelもない人物は「制作・技術スタッフ」に入れません。

- `performer`
- `clown`
- `director`
- `writer`
- `creative_director`
- `artistic_director`
- `choreographer`
- `composer`
- `lyricist`
- `music_director`

ただし、同じ人物が上記に加えて技術職を持つ場合、または作品別credit_labelに技術職が明記される場合は掲載します。

### 一覧・検索・詳細

制作・技術スタッフ側には次を実装してください。

- 部門で絞り込む索引。各部門の人数を動的に表示する。
- 名前、日本語名、原綴り、職種、クレジット表記、作品名、会社名を対象とする全文検索。
- 並び順:
  - 名前順
  - 担当作品数の多い順
  - 部門順
- 一覧行:
  - 日本語名と原綴り
  - 職種
  - 索引済み担当作品数
- 詳細:
  - 氏名
  - 職種／部門
  - 作品別の正確なクレジット表記
  - 作品名、会社、年
  - confidence
  - 作品ページへのリンク
- 情報が無い項目を推測で補完しない。
- `high` / `medium` / `low` 等は分かりやすい日本語表示にしてよいが、元値は失わない。

「大道具」と「舞台美術」は同じ職種として断定しないでください。同じ索引グループ内に置いても、個別の職種表示では `set_designer=舞台美術`、`stage_carpenter=大道具・舞台作業` 等を区別します。同様に、`sound_designer` と `sound_operator`、`lighting_designer` と `lighting_operator` も区別します。

---

## 4. アーティスト名簿の保護条件

次を回帰させないでください。

- `DATA_URL` は既存の暗号化 `data.enc` のまま。
- AES-256-GCM / PBKDF2-SHA256の復号方式を変更しない。
- `PASS_KEY = "scout_pass"` を変更しない。
- アーティスト名簿は読み取り専用のまま。
- 復号後データを別ファイル、`db.js`、ログ、テストfixtureへ書き出さない。
- 外部スクリプト、CDN、解析タグを追加しない。
- 制作・技術スタッフの索引へ、アーティスト名簿の連絡先、写真、SNS、調査文を混ぜない。
- 技術スタッフのプロフィールに、連絡可能・依頼可能・現役・所属中などの状態を推定表示しない。

---

## 5. UIとアクセシビリティ

- 現在の資料棚・名簿の二ペイン構成、紙の質感、タイポグラフィを継承する。
- 入口の選択状態を色だけに頼らず、文字、罫線、`aria-pressed` または適切なtab semanticsで示す。
- キーボードだけで入口、部門、検索、一覧、詳細へ移動できる。
- タッチ対象は44px程度を確保する。
- 390×844では一覧と詳細を一列にし、選択後に詳細へ到達できる。
- 1440×900では一覧と詳細を同時に読める。
- 空状態、検索0件、制作・技術データが読めない場合を表示する。
- 人数表記は、アーティスト側では既存どおり「組」、制作・技術側では「人」を使用する。

---

## 6. 実装対象と非対象

主な変更候補:

- `index.html`
- `app.js`
- `roster.js`
- `style.css`
- `README.md`
- `tests/*.test.mjs`

必要が無ければ `build_db.py` と `db.js` は変更しないでください。現在の `SHOSAI_DB.persons` と作品別peopleクレジットだけで実装できる設計を優先します。

非対象:

- 新しい人物の調査・登録
- `show-reference/data/*.json` のrole語彙拡張
- 連絡先収集
- アーティストと技術スタッフの自動同一人物統合
- 名簿の編集機能
- 公開、デプロイ、push、DNS、認証設定の変更
- 舞台スケッチ機能の変更

---

## 7. テスト

新しい回帰テストを追加し、少なくとも次を検証してください。

### 資料棚

- `#db-person` が存在しない。
- `dbState.person` と人物フィルターbindが残っていない。
- 全文検索へ人物名を入れる処理が残っていない。
- 作品詳細に独立した `人（N）` セクションが出ない。
- `w.people` と `SHOSAI_DB.persons` は名簿用途のため残っている。

### 制作・技術スタッフ

- `lighting_designer` は「照明」に分類される。
- `sound_designer` は「音響」に分類される。
- `director` だけの人物は掲載されない。
- `director` でもcredit_labelに「舞台監督」が明記される場合は「舞台進行・制作」に掲載され、元roleは書き換えない。
- 同じ人物・作品・クレジットが重複しない。
- 一人が複数部門へ所属できる。
- 担当作品リンクが `#db/<work_id>` を指す。
- 技術スタッフ詳細にcontact、SNS、photo等のアーティスト専用項目が混ざらない。

### 既存名簿

- `tests/roster-passphrase-regressions.test.mjs` が通る。
- 保存済み合言葉の自動解錠条件、表示切替、`scout_pass` が変わっていない。
- 合言葉なしでアーティストの中身は表示されない。
- 合言葉なしでも制作・技術スタッフ索引は表示できる。

依存パッケージを新規追加せず、既存のNodeテスト方式に合わせてください。

実行する検証:

```bash
node --check app.js
node --check roster.js
python3 build_stage.py --check
node --test tests/*.test.mjs
git diff --check
```

`index.html` は現在ほかの舞台スケッチ作業でも変更され得ます。`build_stage.py` が今回と無関係な `stage.html` 差分を生む場合は、勝手に上書き・整合化せず、差分を調べて報告してください。既存の未コミット変更を巻き戻してはいけません。

### ブラウザ確認

ローカルHTTPサーバーから確認してください。`file://` だけで完了扱いにしないでください。

- `#db`
  - 人物フィルターが無い。
  - 人名検索が人物逆引きとして働かない。
  - 作品内容、演出、装置、出典の閲覧は維持される。
- `#roster`
  - 合言葉入力前に「アーティスト」「制作・技術スタッフ」を選べる。
  - 「制作・技術スタッフ」は解錠なしで閲覧できる。
  - 音響、照明、舞台美術等の部門絞り込みが動く。
  - 作品リンクから資料棚へ戻れる。
  - 「アーティスト」側の暗号化ゲートが維持される。
- 390×844と1440×900の両方で確認する。

実在する合言葉をテストコード、スクリーンショット、ログへ残さないでください。アーティスト名簿の実データを表示したスクリーンショットも成果物へ含めないでください。

---

## 8. 完了報告

最後に次を分けて報告してください。

1. 変更したファイル
2. 資料棚から外した人物入口
3. 名簿へ追加した制作・技術スタッフの分類と現在表示できる人数
4. 暗号化されたアーティスト名簿をどう保護したか
5. テスト結果
6. ブラウザ確認結果
7. 未確認・今後の別タスク
   - 舞台監督、大道具、オペレーター等の新規一次情報収集
   - 正本role語彙の拡張
   - 既存の暫定role対応の見直し
8. ローカル確認URL

公開・push・deployは行わず、ローカル変更として止めてください。

