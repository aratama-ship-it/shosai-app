# 劇場・サーカス用語 対訳表（日 → 英・仏・簡・繁）

作成: 2026-08-28。舞台スケッチの UI・ピッチ生成条件の訳語を決めるための正本。
英語列は現行 stage-i18n.js の採用語（別セッションで精度向上中のため参考掲示）。

**確度の記号** … ◎=一次情報・専門資料で確認済み ／ ○=標準的用法として自信あり（複数資料で整合） ／
△=候補どまり。ネイティブの舞台関係者に確認するまで断定しない（各ドラフトの NEEDS_REVIEW に登録済み）。

---

## 0. 先に読む：言語間の罠

| # | 罠 | 中身 |
|---|---|---|
| 1 | **上/下の逆対応（日⇔中）** | 日本の**上手**＝客席から見て**右**。中国伝統の出入りは「左上右下」で、**上場門（上場口）が客席から見て左**、下場門が右。よって 上手＝**下場門側**、下手＝**上場門側**。漢字の見た目で対応させると左右が反転する ◎ |
| 2 | **台湾の上下は奥行き** | 台湾の劇場教育は英語式。**左舞台/右舞台＝俳優視点の左右**（左舞台=stage left=上手）、**上舞台=奥（upstage）／下舞台=手前（downstage）**。「上」の字が日本語の「上手（左右）」と衝突する ◎ |
| 3 | **フランス語の左右は cour/jardin** | 客席から見て右=**côté cour**（＝上手）、左=**côté jardin**（＝下手）。覚え方は客席から「J.C.」（左Jardin・右Cour）。現場で gauche/droite は視点が曖昧になるため使わない ◎ |
| 4 | **scène の多義（仏）** | 仏語 scène は「舞台」「シーン」両方を指しうる。本アプリでは **舞台＝plateau／シーン＝scène** で書き分け（現場語としても自然） ◎ |
| 5 | **地排光の誤射程（簡）** | 「転がし」（床置きで人物に当てる灯）は大陸では**流動光**（地面側光）。**地排光はホリゾント下端の列**専用。既存 stage-prompt-i18n.js の zh `lightKind.floor: 地排光` は流動光に直すのが正確 ◎ |
| 6 | **簡繁は字体変換では済まない** | 例: 保存↔儲存、导出↔匯出、设置↔設定、視頻↔影片、加载↔載入。UI動詞体系ごと別物。劇場語も 侧幕↔翼幕、观众席の呼び方など系統差がある ◎ |
| 7 | **「上舞台」を動詞に使わない（繁）** | 台湾では「上舞台」が upstage の名詞。日本語の「舞台へ出す」を繁体で「上舞台」と書くと奥行きの意味に化ける。動詞は「放上舞台／移下舞台」等で書く ○ |

---

## 1. 舞台の方位

| 日本語 | 英語（現行） | フランス語 | 簡体字（大陸） | 繁体字（台湾） | 確度・注記 |
|---|---|---|---|---|---|
| 上手 | stage left | côté cour | 下场门一侧 | 左舞台 | ◎ 罠1・2・3参照 |
| 下手 | stage right | côté jardin | 上场门一侧 | 右舞台 | ◎ 同上 |
| 上手袖 | Stage left wing | Coulisses côté cour（UI短縮: Côté cour） | 下场门侧台 | 左舞台側台 | ○ 側台=袖スペースは両岸共通 |
| 下手袖 | Stage right wing | Coulisses côté jardin（UI短縮: Côté jardin） | 上场门侧台 | 右舞台側台 | ○ |
| 奥（舞台奥） | Upstage | le lointain（au lointain） | 后区／舞台深处 | 上舞台 | ◎ 仏 lointain は Odéon 用語集で確認 |
| 手前（客席側） | Downstage | la face（à la face） | 前区／舞台前沿 | 下舞台 | ◎ |
| 袖（そで） | Wing | les coulisses | 侧台 | 側台 | ◎ |
| 舞台裏 | Backstage | les coulisses ／ en coulisses | 后台 | 後台 | ◎ |
| 舞台（板の上） | Stage | le plateau | 舞台 | 舞台 | ◎ 罠4 |
| 客席 | House | la salle | 观众席 | 觀眾席 | ◎ 仏「salle」は劇場現場の標準 |
| 奈落・舞台下 | （未使用） | les dessous | 台仓 | 舞台下層（台倉） | ◎ 仏・簡は専門資料で確認。繁△ |

## 2. 劇場の形式・部位

| 日本語 | 英語（現行） | フランス語 | 簡体字 | 繁体字 | 確度・注記 |
|---|---|---|---|---|---|
| プロセニアム | Proscenium | théâtre à l'italienne ／ cadre de scène（額縁） | 镜框式舞台 | 鏡框式舞台 | ◎ |
| 三方囲み（スラスト） | Thrust | plateau tri-frontal ／ scène en éperon | 伸出式舞台 | 三面式舞台（伸出式） | ○ 仏は tri-frontal が現代の現場語 |
| テント全周（アリーナ） | Big top | chapiteau（piste=リング） | 马戏大棚／环形观众席 | 馬戲帳篷 | ◎ 仏 chapiteau/piste は CNAC 用語集 |
| 野外ステージ | Outdoor stage | scène extérieure | 户外舞台 | 戶外舞台 | ○ |
| ブラックボックス | Black box | boîte noire | 黑匣子剧场（小剧场） | 黑盒子劇場（實驗劇場） | ◎ 簡繁で定訳が違う点に注意 |
| 間口 | Width（proscenium width） | ouverture（du cadre） | 台口宽度 | 舞台開口寬度（台口） | ◎ 簡「台口」=プロセニアム開口 |
| 奥行 | Depth | profondeur | 舞台进深 | 舞台深度 | ○ |
| 天井（高さ） | Ceiling | hauteur sous gril ／ plafond | 台塔净高／天花高度 | 天花板高度 | ○ 会場エディタは一般室内も指すので plafond/天花 でよい |
| すのこ・グリッド | （吊りの文脈） | le gril | 栅顶（葡萄架） | 頂棚（格柵） | ○ 簡「葡萄架」は現場俗語 |
| バトン | bar／batten | la porteuse（perche とも） | 吊杆 | 吊桿 | ◎ 仏 porteuse は Odéon・機構資料で確認 |
| 音響卓（FOH） | FOH desk | la régie | 音控台 | 音控台（控台） | ○ |
| 楽屋・搬入口 | Load-in door | accès décor／monte-charge | 装卸口（搬景门） | 卸貨入口 | △ 会場エディタの「搬入口」。要確認 |
| 客席（1階平土間） | Stalls | l'orchestre | 池座 | 一樓觀眾席 | ◎ 簡「池座」は標準。台湾は階数呼び |
| 2階席・バルコニー | Balcony | le balcon | 楼座（二层） | 二樓觀眾席 | ○ |
| 最前列 | Front row | le premier rang | 第一排 | 第一排 | ◎ |

## 3. 幕と舞台機構

| 日本語 | 英語（現行） | フランス語 | 簡体字 | 繁体字 | 確度・注記 |
|---|---|---|---|---|---|
| 幕（総称） | Curtain | rideau | 幕布 | 布幕 | ◎ |
| 前幕・引き割り | Front curtain / traveller | rideau d'avant-scène（à la grecque＝引き割り式） | 大幕（对开式） | 大幕（對開式） | ◎ 大幕=面幕=前幕。開閉様式: 对开/升降/蝶帐 |
| 中割り幕 | Mid-stage traveller | rideau de mi-plateau（à la grecque） | 二道幕 | 二道幕 | ◎ 簡「二道幕」は定訳。仏の短い呼びは△（rideau intermédiaire とも） |
| 振り落とし・昇降幕 | Drop / flying curtain | rideau à l'allemande（guillotine） | 升降幕 | 升降幕 | ◎ 仏は Odéon 用語集の分類（イタリア式/ギリシャ式/ドイツ式…）で確認 |
| 袖幕（レッグ） | Leg | pendrillon | 侧幕（侧条幕） | 翼幕 | ◎ 罠6: 簡=側幕、繁=翼幕 |
| 一文字幕（ボーダー） | （未使用） | frise | 檐幕（沿幕） | 沿幕 | ◎ 今後の追加に備え記載 |
| ホリゾント幕 | Cyclorama | cyclorama | 天幕 | 天幕 | ◎ |
| 紗幕 | （未使用） | tulle／rideau de gaze | 纱幕 | 紗幕 | ○ 将来用 |
| 黒の囲い（タッパ） | （未使用） | taps（tout en noir） | 黑箱围合 | 黑色翼沿幕組 | △ 将来用 |
| 盆・回り舞台 | Revolve | tournette（plateau tournant） | 转台 | 旋轉舞台（轉台） | ◎ 仏 tournette は Larousse・現場資料で確認 |
| せり | Stage lift | élévateur de scène（伝統語: tampon） | 升降台 | 升降舞台（升降台） | ◎ |
| せり上がり（床からの高さ） | Rise height | hauteur d'élévation | 升起高度 | 升起高度 | ○ |
| 可動デッキ・傾斜デッキ | Moving / tilting deck | praticable mobile / incliné | 车台（可倾斜台板） | 活動平台（可傾斜） | ◎ 簡「车台」は舞台機械の定訳。繁△ |
| 吊物（フライング） | Flown | (élément) suspendu | 悬吊物（吊景） | 懸吊物 | ○ 動詞「吊る」= appuyer は使わず suspendre |
| 地上高（トリム） | Trim height | hauteur de réglage（trim） | 悬挂高度（离地高度） | 懸掛高度（離地高度） | △ 仏の現場は英語 trim も通用 |
| 水面・可動プール床 | Water / moving pool floor | bassin / plancher de bassin mobile | 水池／可动水池台面 | 水池／可動水池台面 | ○ |
| 舞台機構 | Stage machinery | machinerie（scénique） | 舞台机械 | 舞台機械 | ◎ |

## 4. 照明

各言語とも「灯体の位置＋方向」で呼ぶ現場語がある。直訳ではなく**現地の灯位名**へ対応させる。

| 日本語（アプリ内） | 英語（現行） | フランス語 | 簡体字 | 繁体字 | 確度・注記 |
|---|---|---|---|---|---|
| 吊り（バトンから真下） | Overhead | la douche | 顶光 | 頂光 | ◎ 仏 douche=真上からの落とし。ADEC・照明資料で確認 |
| SS（袖から横切り） | Side light | le latéral | 侧光 | 側光 | ◎ 仏 latéral は「身体を彫る・ダンスで多用」と資料に明記 |
| 前明かり（客席上から顔へ） | Front light | la face | 面光 | 面光 | ◎ |
| 転がし（床置き） | Floor light | le rasant（au sol） | 流动光 | 地面側光（流動光） | ◎ 罠5。仏 rasant=床置きの舐め |
| 地明かり（ベース） | base wash | plein feu（général） | 基础光（铺光） | 基礎光 | △ 簡繁の「基础光」は説明的。現場語の揺れあり |
| バックライト・逆光 | back(light) | le contre | 逆光 | 逆光 | ◎ |
| トップサス（1人分） | Top special | douche（spéciale） | 定点光 | 定點光 | ○ 簡「定点光」は特定点の当たりの現場語 |
| フォロースポット | follow spot | la poursuite | 追光 | 追蹤燈（追光） | ◎ |
| フットライト | Footlights | rampe（jeux de rampe） | 脚光 | 腳燈 | ○ 仏 rampe=脚光列の伝統語 |
| ホリ染め | cyclorama wash | éclairage cyclo | 天排/地排（染色） | 天幕燈（染色） | ○ 簡: 天排=上列・地排=下列 |
| ライトカーテン | Light curtain | rideau de lumière | 光幕 | 光牆（光幕） | △ |
| 灯体 | fixture | le projecteur | 灯具（灯体） | 燈具 | ◎ |
| 当たり（プール） | pool | la tache／le rond | 光斑（光区） | 光區 | ○ |
| 明かりを組む | build a rig | implanter（implantation） | 布光 | 布光（掛燈） | ◎ 仏「implantation lumière」=仕込み図の定訳 |
| キューシート | cue sheet | conduite lumière | 灯光cue表 | 燈光Cue表 | ◎ 仏 conduite は超定番。中華圏は英語 cue が現場標準 |
| きっかけ（キュー） | Trigger | le top（cue） | 提示（cue点） | Cue點 | ○ 仏現場は「au top」と言う |

## 5. サーカス器具・技（アプリの「出るもの」）

| 日本語 | 英語（現行） | フランス語 | 簡体字 | 繁体字 | 確度・注記 |
|---|---|---|---|---|---|
| トラピーズ | Trapeze | trapèze（fixe/ballant/volant） | 吊杠（高空秋千） | 高空鞦韆（吊槓） | ○ 簡は静止=吊杠が通りやすい。CNAC で仏3分類確認 |
| エアリアルティシュー | Aerial silks | tissu aérien | 绸吊 | 綢吊（空中絲帶） | ◎ 簡「绸吊」は清代の皮条から続く定訳 |
| シルホイール | Cyr wheel | roue Cyr | Cyr轮（大环） | Cyr輪（大環） | ○ 仏◎（考案者Daniel Cyr、fr.wikipedia）。中華圏は定訳未満→NEEDS_REVIEW |
| チャイニーズポール | Chinese pole | mât chinois | 爬杆（中国杆） | 中國竿（爬竿） | ◎ 簡「爬杆」は伝統杂技の演目名 |
| ティーターボード | Teeterboard | bascule（coréenne） | 跷板（弹板） | 蹺蹺板（韓式跳板） | △ 仏は planche coréenne とも（既存NEEDS_REVIEW維持）。中華圏も要確認 |
| 綱渡り | Tightwire | fil tendu（fil de fer） | 走钢丝 | 走鋼索 | ◎ 仏 fildefériste は CNAC 確認。簡「走钢丝」定訳 |
| ハンドバランス用cane | Handbalancing canes | cannes d'équilibre | 手倒立杆（顶技道具） | 倒立桿 | △ 中華圏の現場語要確認 |
| ディアボロ | Diabolo | diabolo | 空竹 | 扯鈴 | ◎ **簡=空竹、繁=扯鈴で完全に別語**。台湾で空竹は通じにくい |
| ジャグリング | Juggling | jonglage（jonglerie） | 杂耍（抛接） | 雜耍 | ◎ CNAC で jonglage 確認 |
| トランポリン | Trampoline | trampoline | 蹦床 | 彈翻床 | ◎ 簡繁で別語（台湾の体操界は彈翻床） |
| シーソー（構成上の呼び） | Teeterboard | bascule | 跷跷板 | 蹺蹺板 | ○ 遊具の意味なら両岸ともこれ |
| 台・箱（箱馬） | Platform / box | praticable | 平台（台阶箱） | 平台（箱型平台） | ○ 仏 praticable◎。中華圏の「箱馬」相当は現場ごとに揺れ→NEEDS_REVIEW |
| 壁（パネル） | Wall | châssis | 墙片（景片） | 景片 | ◎ 簡繁とも「景片」=舞台の壁パネル |
| 小道具 | Props | accessoires | 道具 | 道具 | ◎ 仏 accessoiriste=小道具係 |
| 大道具・装置 | Set piece | élément de décor | 布景／装置 | 佈景／裝置 | ◎ |
| 一輪車 | Unicycle | monocycle | 独轮车 | 獨輪車 | ◎ |
| エアリアル（総称） | Aerial | aérien（les aériens） | 高空节目 | 空中項目 | ○ |

## 6. 稽古・進行・帳票

| 日本語 | 英語（現行） | フランス語 | 簡体字 | 繁体字 | 確度・注記 |
|---|---|---|---|---|---|
| シーン | Scene | scène | 场景 | 場景 | ◎ 罠4 |
| セクション | Section | section | 段落 | 段落 | ○ 幕(act)ではないので段落が安全 |
| 転換 | Transition | transition（changement） | 换场 | 換場 | ◎ 簡繁とも现场語 |
| 暗転 | Blackout | le noir | 暗场 | 暗場 | ◎ 仏「faire le noir」、中「暗场/明场」対 |
| 動線 | Route | trajet（déplacement） | 走位（路线） | 走位（路線） | ◎ 中華圏「走位」=ブロッキングの定訳 |
| 立ち位置 | position | placement | 站位 | 站位（定位） | ◎ |
| バミリ | Spike | marquage au sol（repères） | 定位标记（地标贴） | 定位標記（馬克） | ○ 台湾現場は英語 mark をそのまま使う人も多い |
| 香盤表（小道具） | Props plot | conduite accessoires | 分场道具表 | 分場道具表 | ○ 仏 conduite=進行表の定訳 |
| 稽古場 | Rehearsal room | salle de répétition | 排练厅 | 排練場 | ◎ |
| 通し稽古 | full run | filage | 连排（联排） | 整排 | ◎ 参考（UI未使用）。仏 filage は超定番 |
| ゲネプロ | （未使用） | générale | 彩排（带妆彩排） | 總彩排 | ◎ 参考 |
| プレゼン | Present | présentation | 演示 | 簡報（放映） | ○ 繁: 簡報=プレゼン。ここは上映モードなので放映も候補→採用は「簡報模式」△ |
| ショー | Show | spectacle | 演出 | 演出 | ◎ |
| 演者 | Performer | interprète | 演员 | 演員（表演者） | ◎ 仏: 現場は interprète / artiste。acteur は演劇に限る |
| 演出家・ディレクター | director | metteur en scène（cirque: directeur artistique） | 导演 | 導演 | ◎ |
| 照明担当者 | lighting staff | éclairagiste（régisseur lumière） | 灯光师 | 燈光設計（燈光師） | ◎ |

## 7. UI基本動詞・システム語（詳細は各 STYLE-*.md）

| 日本語 | 英語（現行） | フランス語 | 簡体字 | 繁体字 | 注記 |
|---|---|---|---|---|---|
| 保存（する） | Save | Enregistrer | 保存 | 儲存 | ◎ |
| 書き出す | Export | Exporter | 导出 | 匯出 | ◎ |
| 読み込む | Import / Load | Importer / Charger | 导入／加载 | 匯入／載入 | ◎ |
| 一つ戻す | Undo | Annuler | 撤销 | 復原 | ◎ 仏 Annuler が「取消」と衝突→取消は「Abandonner/Annuler l'opération」で回避（STYLE-fr参照） |
| やり直す | Redo | Rétablir | 重做 | 重做 | ◎ |
| 削除 | Delete | Supprimer | 删除 | 刪除 | ◎ |
| 複製 | Duplicate | Dupliquer | 复制副本（复制） | 複製 | ◎ 簡: コピー=复制と衝突しうる→副本を明示 |
| 名前を変える | Rename | Renommer | 重命名 | 重新命名 | ◎ |
| 設定 | Settings | Réglages | 设置 | 設定 | ◎ Apple仏はRéglages。Web一般はParamètresでも可（STYLE-frで決定） |
| 閉じる | Close | Fermer | 关闭 | 關閉 | ◎ |
| 全画面 | full screen | plein écran | 全屏 | 全螢幕 | ◎ |
| 印刷 | print | imprimer | 打印 | 列印 | ◎ |
| ファイル | file | fichier | 文件 | 檔案 | ◎ |
| クリック／タップ | click / tap | cliquer / toucher | 点按／轻点 | 按一下／點一下 | ◎ Apple各語ガイドの標準 |
| ドラッグ | drag | glisser | 拖动 | 拖曳 | ◎ |
| ログイン | Signed in | connecté | 登录 | 登入 | ◎ |
| ネットワーク | network | réseau | 网络 | 網路 | ◎ |
| 音源・音声 | audio | audio | 音频 | 音訊 | ◎ |
| 動画 | video | vidéo | 视频 | 影片 | ◎ |

---

## 出典

**フランス語**
- fr.wikipedia [Côté cour et côté jardin](https://fr.wikipedia.org/wiki/C%C3%B4t%C3%A9_cour_et_c%C3%B4t%C3%A9_jardin) — cour=客席から右、jardin=左、J.C.の覚え方
- [Odéon Théâtre de l'Europe – Lexique](https://www.theatre-odeon.eu/fr/mediatheque-et-archives/ressources-en-ligne/lexique/lexique_1) — rideau à l'italienne/grecque/allemande、pendrillon、frise、porteuse、cintres、gril、tournette、plateau、lointain、cyclorama
- [l'Agence culturelle d'Alsace – E-lexique machinerie](https://www.machinerie-spectacle.org/ressources/e-lexique-machinerie.html)、[dessous de scène](https://www.machinerie-spectacle.org/dessous-de-scene.html) — trappe/tampon/dessous、plateau élévateur
- [直射方向の資料（lumiere-spectacle.org ほか）](https://www.lumiere-spectacle.org/pratique/differentes-directions-lumiere.html)・[SONO MAG axes de faisceaux](https://sonomag.fr/leclairage-les-axes-de-faisceaux/)・[theatrons.com éclairage](http://www.theatrons.com/eclairage.php) — face/contre/latéral/douche/rasant/poursuite
- [BnF/CNAC Glossaire du cirque](https://cirque-cnac.bnf.fr/fr/infos/glossaire) — agrès、trapèze（fixe/ballant/volant）、fil、fildefériste、chapiteau、piste、jonglage（※アプリの構成テンプレートが既に出典にしているサイト）
- fr.wikipedia [Roue Cyr](https://fr.wikipedia.org/wiki/Roue_Cyr)・[Mât chinois](https://fr.wikipedia.org/wiki/M%C3%A2t_chinois)・[Bascule (cirque)](https://fr.wikipedia.org/wiki/Bascule_(cirque))・[Scène tournante](https://fr.wikipedia.org/wiki/Sc%C3%A8ne_tournante)、[Larousse tournette](https://www.larousse.fr/dictionnaires/francais/tournette/78740)

**簡体字（大陸）**
- [搜狐・舞台の呼称解説](https://www.sohu.com/a/200767984_508306)・[国家地理・出将入相](https://www.dili360.com/index.php/ch/article/p60360f21cbc4704.htm)・[知乎・下场口と座席選び](https://zhuanlan.zhihu.com/p/84635840) — 上场门=客席から左、「左上右下」
- [中国舞台美术学会・図解舞台灯光知识](https://www.cisd.org.cn/html/32/201603/6737.html)・[剧院剧场舞台灯光常用灯位设计](https://www.czlightings.com/news/17.html) — 面光/耳光/柱光/**流动光（地面侧光）**/顶光/脚光/逆光/天排/地排/追光
- [百度百科・舞台幕布](https://baike.baidu.com/item/%E8%88%9E%E5%8F%B0%E5%B9%95%E5%B8%83/7020883)ほか — 大幕（面幕・对开/升降）、二道幕、侧幕、檐幕、天幕、纱幕
- [知乎・舞台机械基本术语](https://zhuanlan.zhihu.com/p/385776970)ほか — 转台、车台、升降台、吊杆、台仓、假台口
- zh.wikipedia [空中絲帶（绸吊）](https://zh.wikipedia.org/wiki/%E7%A9%BA%E4%B8%AD%E7%B5%B2%E5%B8%B6)、[汉程・爬杆](https://ty.httpcn.com/baike/zaji_minjian_pagan.shtml)

**繁体字（台湾）**
- [台湾教育部芸術教育・劇場專有名詞（PDF）](https://ed.arte.gov.tw/ae/uploadfile/book/%E6%9C%83%E5%8B%95%E7%9A%84%E4%B8%89%E5%BA%A6%E7%A9%BA%E9%96%93/%E6%9C%83%E5%8B%95%E7%9A%84%E4%B8%89%E5%BA%A6%E7%A9%BA%E9%96%93105116(%E9%99%84%E9%8C%84).pdf)
- [劇場術語の解説記事（The News Lens 劇場黑話ほか検索結果）](https://www.thenewslens.com/article/67015)・[淡江大學實驗劇團・舞台六分法](https://tkul209.pixnet.net/blog/posts/7066816685) — 左舞台/右舞台=俳優視点、上舞台=奥/下舞台=手前
- [台湾の幕解説（Xuite 劇場基本設備-幕ほか）](https://blog.xuite.net/davidrosanna/twblog/126121834) — 大幕、翼幕（=側幕）、沿幕、天幕

**未確認・要ネイティブ確認（△）の代表**: 仏 rideau de mi-plateau の通称／簡繁の Cyr 輪・ティーター
ボード・箱馬・ハンドバランス cane／繁の綢吊 vs 空中絲帶の現場での通り／台湾での「簡報模式」の妥当性。
→ 各ドラフト末尾の NEEDS_REVIEW に鍵単位で列挙してある。
