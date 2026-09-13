# NEEDS_REVIEW

## 2026-09-09 製品名を英名に置換した鍵

簡体字・繁体字の実装パックで、次の9鍵の値にある製品名を `Stage Sketch` へ置換した。
ドラフトは変更していない。

- `ここには二つの道具があります。舞台スケッチは、これから広く使ってもらうためのアプリ。書斎は、資料棚と名簿と制作机を置いた、こちらの手元だけの机です。同じ画面から行き来できますが、配るのは舞台スケッチのほうだけです。`
- `調べたショーの資料棚、アーティストと制作スタッフの名簿、企画を書く制作机。ここは配りません。舞台スケッチもこの中から使えますが、人へ渡すときは上の単独版のほうを渡します。`
- `舞台スケッチを使う`
- `タブレット版・スマホ版は、舞台スケッチをホーム画面へ追加するか、渡されたリンクを開くと使えます。`
- `舞台スケッチ`
- `私が舞台スケッチを作ろうと思った始まりは、ディレクターの意向や、チームの中での自分の役割を、視覚的に把握できるものが欲しかったことでした。`
- `私は劇場に入るたびに客席を歩き回り、それぞれの場所から自分がどのように見えるかをイメージします。舞台スケッチの俯瞰図では、人や物の位置と全体のバランスを第三者の目で捉えられます。正面図では、お客さんやディレクターから舞台がどう見えるかを考えられます。自分の内側からの見え方とは別に、客席側から自分や舞台を眺める、より客観的な視点を加えるための図です。`
- `舞台スケッチは技術図面ではなく、安全を検証したり保証したりするものでもありません。ディレクターとアーティストの意思疎通を円滑にし、良いショーを作る時間を増やすためのスケッチです。これを通して、出来の良いショーが世の中にたくさん増えていくことを楽しみにしています。`
- `舞台スケッチのオフライン準備に失敗しました。`

## 2026-09-09 孤児鍵（ドラフトにだけ残る）

- `整列（一列・円・V字）` はアプリ本体から削除済みで、現在の英語パックには存在しない。中国語ドラフトを無変更で保持するため、簡体字・繁体字パックから削除せず、zh 固有鍵の唯一の許容例外としてテストへ明示した。

## 2026-09-09 英語側で削除済みの id（ドラフトにだけ残る）

- MAPS `venueNote` の `proscenium` / `thrust` / `arena` / `outdoor` / `blackbox` は、2026-09-04 の本人指示で英語側から削除済みだが、中国語ドラフトには残っている。ドラフトを変更しないためパックから削除せず、zh 固有 id の許容例外としてテストへ群・idを明示した。日本語原文の `v.note` が空なら他言語パックの説明も表示しない。

## 2026-09-09 同一群内の同訳（ネイティブ確認へ）

- zh-Hans の MAPS `dimBy.pole.h` と `dimBy.cane.h` は、どちらも `杆高`。訳文を変更せず、この1組だけを衝突テストの許容例外として明示した。zh-Hant では `dimBy.pole.h` が `竿高`、`dimBy.cane.h` が `桿高` で区別されているため、簡体字でも区別が必要かネイティブ確認する。

## 2026-09-09 追加鍵（未訳）

WO-B3 で `stage-i18n.js` の `TEXT` に追加した鍵。フランス語・簡体字・繁体字の既存ドラフトには未反映。

- `楽曲`
- `不明な楽曲`
- `（音源なし）`
- `現在のシーンの曲を一時停止`
- `再生しています。`
- `中身のある音源ファイルを選んでください。`
- `音源は150MB以下にしてください。`
- `MP3、M4A/AAC、WAVの音源を選んでください。`
- `不明な楽曲（音源の再接続が必要）`
- `尺を確認中`
- `同梱された固定SceneStudyはありません。`
- `8ビートを別ショーとして開く`
- `現在のショーは一覧に残します。固定案は別ショーで開き、配置変更はこのブラウザ内だけに保存します。`
- `何が固定されているか`
- `既存計画から`
- `スタディのビートを切り替える`
- `このシーンは固定8ビートの外です。上の番号を押すとスタディへ戻れます。`
- `行為`
- `観客に見える規則`
- `このビートで変わること`
- `事実・解釈・未決定`
- `今回の制作解釈`
- `本人確認待ち`
- `番号を切り替えて配置差を見ます。各ビートは別シーンで、変更はこのブラウザ内へ自動保存されます。`
- `ファイルへの書き出しはまだありません。`
- `変更を保存しています…`
- `この端末へ保存できませんでした。ファイルへ書き出して残してください。`
- `この文字を消す`
- ` ／ `
- `、`
- `0個`
- `・`
- `まだ誰も登録していません。名前を入れて追加してください。`
- `モデルがありません`
- `まだ何も登録していません。名前と形を選んで追加してください。`
- `まだ登録していません。種類を選び、名前を入れて追加してください。`
- `プリセットの組`
- `この組を外す`
- `壊れたショー一覧をファイルへ書き出しました。ダウンロードを確認できましたか？ OKを押すと一覧を作り直し、端末内の壊れたデータを消します。キャンセルすると何も変更しません。`
- `書き出せる壊れたデータは残っていません。ショー一覧を作り直しますか？ いま開いているショーは残ります。`
- `ショー一覧の更新を止めています`
- `勝手に他のショーを消さないため、壊れた一覧には書き込みません。「ショー一覧を作り直す」を押すと、壊れた元データをファイルへ書き出してから消します。先に、開いているショーもファイルへ書き出しておくと安全です。`
- `ショー一覧を作り直す`
- `先にセットを組んでください`
- `まだ残していません。並べ終えたら名前をつけて残してください。小道具や家具を一つずつ登録するのは「出るもの」からです。`
- `音源の再接続が必要`
- `このショーの最初の版です。`
- `稽古用JSONの変換器を読み込めませんでした。`
- `稽古用JSONの検査に通りました。`
- `現在のショーで該当するものはありません。`
- `指示`
- `概要`
- `警告`
- `寸法を入れる`
- `カスタム`
- `舞台裏：`
- `はじめる`
- `感想の送り先（フォーム）はまだ用意できていません。いまは直接お知らせください。`

## 2026-09-09 追加 SAY 文型（未訳）

WO-B3 で `stage-i18n.js` の `SAY` に追加した文型。フランス語・簡体字・繁体字の既存ドラフトにはありません。

| # | 正規表現の source | 英語テンプレート／変換関数 |
|---:|---|---|
| 1 | <code>^ショー一覧を更新できなかったため、消していません。$</code> | <code>Could not update the show shelf, so nothing was deleted.</code> |
| 2 | <code>^ショー一覧を作り直しました。$</code> | <code>Rebuilt the show shelf.</code> |
| 3 | <code>^カスタムにしました。寸法を入れてください。$</code> | <code>Custom sizes. Enter the numbers.</code> |
| 4 | <code>^シーン (\d+)$</code> | <code>Scene $1</code> |
| 5 | <code>^別の曲を選んでいる可能性があります。\n登録: ([\s\S]*?)（([\s\S]*?)）\n選択: ([\s\S]*?)（([\s\S]*?)）\nこのファイルで接続しますか？$</code> | <code>This may be a different track.\nRegistered: $1 ($2)\nSelected: $3 ($4)\nReconnect using this file?</code> |
| 6 | <code>^「([\s\S]*?)」をこのショーから外します([\s\S]*?)。ページを閉じるまでは「一つ戻す」で戻せます。$</code> | <code>(match, title, assigned) =&gt; { const count = Number((assigned.match(/(\d+)/) &#124;&#124; [])[1] &#124;&#124; 0); return `Remove “${title}” from this show${count ? ` and ${count} assigned ${count === 1 ? "scene" : "scenes"}` : ""}? You can undo this until the page is closed.`; }</code> |
| 7 | <code>^([\s\S]*?)・([\s\S]*?)シーン$</code> | <code>(match, duration, assigned) =&gt; `${duration} · ${assigned} ${Number(assigned) === 1 ? "scene" : "scenes"}`</code> |
| 8 | <code>^([\s\S]*?)を外す$</code> | <code>Remove $1</code> |
| 9 | <code>^・現在は「([\s\S]*?)」$</code> | <code> · currently $1</code> |
| 10 | <code>^固定スタディ \/ ([\s\S]*?)秒 \/ ([\s\S]*?)人$</code> | <code>FIXED STUDY / $1s / $2 performer</code> |
| 11 | <code>^同梱元: ([\s\S]*?)$</code> | <code>Bundled from: $1</code> |
| 12 | <code>^固定案 \/ ([\s\S]*?)秒 \/ 配置は初期仮説$</code> | <code>FIXED STUDY / $1s / PLACEMENT DRAFT</code> |
| 13 | <code>^適用した演出カード（([\s\S]*?)件）$</code> | <code>Direction cards ($1)</code> |
| 14 | <code>^最後のファイル書き出し: ([\s\S]*?)（それから([\s\S]*?)回の変更）$</code> | <code>(match, stamp, count) =&gt; `Last file export: ${stamp} (${count} ${Number(count) === 1 ? "change" : "changes"} since)`</code> |
| 15 | <code>^「([\s\S]*?)」は保存しました。ただしショー一覧の控えが壊れているため、一覧の更新を止めています（残っている他のショーを消さないためです）。ファイルへ書き出してから、ショー一覧で作り直してください。$</code> | <code>Saved “$1”. The show shelf is damaged, so shelf updates are paused to avoid deleting your other shows. Export to a file, then rebuild the shelf from the show list.</code> |
| 16 | <code>^「([\s\S]*?)」を保存しましたが、ショー一覧の控えは容量不足で更新できていません。ファイルへ書き出してください。$</code> | <code>Saved “$1”, but the show shelf is out of space — export to a file to keep a copy.</code> |
| 17 | <code>^「([\s\S]*?)」を保存しました。$</code> | <code>Saved “$1”.</code> |
| 18 | <code>^リング 直径([\s\S]*?)m$</code> | <code>Ring — $1m across</code> |
| 19 | <code>^客席の広がりは方向の目安です（([\s\S]*?)mで([\s\S]*?)）$</code> | <code>(match, metres, label) =&gt; `The house shows direction, not distance (${metres}m ≈ ${translateSayTerm(label)})`</code> |
| 20 | <code>^([\s\S]*?)の絵を([\s\S]*?)$</code> | <code>(match, view, action) =&gt; `${translateSayTerm(action)} the ${translateSayTerm(view).toLowerCase()} view`</code> |
| 21 | <code>^([\s\S]*?)（([\s\S]*?)）を([\s\S]*?)から見た正面図。([\s\S]*?)。背景の線([\s\S]*?)本。$</code> | <code>(match, venue, size, seat, counts, strokes) =&gt; `Front view of ${translateSayTerm(venue)} (${translateSayTerm(size)}) from ${translateSayTerm(seat)}. ${counts}. ${strokes} backdrop strokes.`</code> |
| 22 | <code>^([\s\S]*?)（([\s\S]*?)）を上から見た平面図。([\s\S]*?)。$</code> | <code>(match, venue, size, counts) =&gt; `Plan view of ${translateSayTerm(venue)} (${translateSayTerm(size)}) from above. ${counts}.`</code> |
| 23 | <code>^([\s\S]*?)個（([\s\S]*?)）$</code> | <code>(match, count, detail) =&gt; `${count} ${Number(count) === 1 ? "light" : "lights"} (${detail})`</code> |
| 24 | <code>^([\s\S]*?)の説明を出す$</code> | <code>(match, title) =&gt; `About ${translateSayTerm(title)}`</code> |
| 25 | <code>^([\s\S]*?)のプロフィール（身長など）$</code> | <code>$1 — profile (height and notes)</code> |
| 26 | <code>^([\s\S]*?)のプロフィールを開く$</code> | <code>Open $1’s profile</code> |
| 27 | <code>^([\s\S]*?)を名簿から外す$</code> | <code>Remove $1 from the cast</code> |
| 28 | <code>^([\s\S]*?)の色を変える$</code> | <code>Change the colour of $1</code> |
| 29 | <code>^([\s\S]*?)の色$</code> | <code>Colour of $1</code> |
| 30 | <code>^(.+?)(\d+)$</code> | <code>(match, head, count) =&gt; `${head} ${count}`</code> |
| 31 | <code>^([\s\S]*?)を外します。全てのシーンからこの組の明かりが消えます。$</code> | <code>Remove $1? The lights disappear from every scene.</code> |
| 32 | <code>^([\s\S]*?)の([\s\S]*?)を変える（いまは ([\s\S]*?)）$</code> | <code>(match, name, what, dimensions) =&gt; `Change the ${what === "直径" ? "pool diameter" : "size"} of ${name} (now ${dimensions})`</code> |
| 33 | <code>^([\s\S]*?)の([\s\S]*?)を開く$</code> | <code>Open the size of $1</code> |
| 34 | <code>^([\s\S]*?)を舞台セットから外す$</code> | <code>Remove $1 from the set list</code> |
| 35 | <code>^光の意図: ([\s\S]*?) — これは候補の一覧です。意図と一致する保証はありません。組んだあとも光の意図は残ります。$</code> | <code>Lighting intention: $1 — This is a list of candidates. It is not guaranteed to match the intention. The intention stays after you build.</code> |
| 36 | <code>^([\s\S]*?)（([\s\S]*?)灯）$</code> | <code>(match, label, count) =&gt; `${translateSayTerm(label)} (${count} lights)`</code> |
| 37 | <code>^「([\s\S]*?)」から新しいショーを作りました。前のショーは一覧に残っています。$</code> | <code>(match, name) =&gt; `Created a new show from “${translateSayTerm(name)}”. The previous show is still in All shows.`</code> |
| 38 | <code>^生成 ([\s\S]*?)シーン・D2目安 ([\s\S]*?)$</code> | <code>(match, count, range) =&gt; `Creates ${count} scenes · D2 guide ${translateSayTerm(range)}`</code> |
| 39 | <code>^エネルギー ([\s\S]*?)$</code> | <code>(match, energy) =&gt; `Energy ${energy.replace(/、/g, ", ")}`</code> |
| 40 | <code>^([\d.]+)秒$</code> | <code>$1 sec</code> |
| 41 | <code>^約([\s\S]*?)分$</code> | <code>~$1 min</code> |
| 42 | <code>^セクション ([\s\S]*?)$</code> | <code>Section $1</code> |
| 43 | <code>^([\s\S]*?) の名前を変える$</code> | <code>Rename $1</code> |
| 44 | <code>^([\s\S]*?)（元の版から派生）$</code> | <code>(match, reason) =&gt; `${reason === "別バージョンとして複製" ? "Duplicated as another version" : reason} (derived from an earlier version)`</code> |
| 45 | <code>^([\s\S]*?) ([\s\S]*?)、配置 ([\s\S]*?)、開く$</code> | <code>Open $1 $2, $3 placed</code> |
| 46 | <code>^配置 ([\s\S]*?)$</code> | <code>$1 placed</code> |
| 47 | <code>^書き出し前に直す項目が([\s\S]*?)件あります。$</code> | <code>$1 issue(s) must be fixed before export.</code> |
| 48 | <code>^([\s\S]*?)シーンの時間が未入力です。$</code> | <code>$1 scene(s) still need durations.</code> |
| 49 | <code>^ファイル:「([\s\S]*?)」（([\s\S]*?)） ／ いま開いているのは「([\s\S]*?)」$</code> | <code>File: “$1” ($2) — currently open: “$3”</code> |
| 50 | <code>^シーン ([\s\S]*?)→([\s\S]*?) ／ 演者 ([\s\S]*?)→([\s\S]*?) ／ セット ([\s\S]*?)→([\s\S]*?) ／ 照明 ([\s\S]*?)→([\s\S]*?)$</code> | <code>Scenes $1→$2 · Cast $3→$4 · Sets $5→$6 · Lights $7→$8</code> |
| 51 | <code>^ファイル側にだけあるシーン: ([\s\S]*?)$</code> | <code>(match, names) =&gt; `New in file: ${names.replace(/ ／ /g, " / ")}`</code> |
| 52 | <code>^いまのショーにだけあるシーン（置き換えると消える）: ([\s\S]*?)$</code> | <code>(match, names) =&gt; `Only in the current show (lost if replaced): ${names.replace(/ ／ /g, " / ")}`</code> |
| 53 | <code>^直径([\s\S]*?)m$</code> | <code>⌀$1m</code> |
| 54 | <code>^奥から([\s\S]*?)m$</code> | <code>$1 m from upstage</code> |
| 55 | <code>^演者(\d+)$</code> | <code>Performer $1</code> |
| 56 | <code>^([\s\S]*?)度$</code> | <code>$1°</code> |
| 57 | <code>^([\s\S]*?) 度\/秒$</code> | <code>$1 °/s</code> |
| 58 | <code>^([\s\S]*?)%開$</code> | <code>$1% open</code> |
| 59 | <code>^前の場面: ([\s\S]*?) → この場面: ([\s\S]*?)$</code> | <code>Previous scene: $1 → this scene: $2</code> |
| 60 | <code>^名前・色・寸法は「([\s\S]*?)」で決めます（([\s\S]*?)）。$</code> | <code>Name, colour and size come from “$1” ($2).</code> |
| 61 | <code>^名前・色・身長は「([\s\S]*?)」で決めます（([\s\S]*?)cm）。$</code> | <code>Name, colour and height come from “$1” ($2cm).</code> |
| 62 | <code>^およそ([\s\S]*?)KB。ショーと一緒にこの端末へ保存されます。$</code> | <code>About $1 KB, kept in this browser with the show.</code> |
| 63 | <code>^([^:：（）]+)（([^（）]+)）$</code> | <code>$1 ($2)</code> |

## 2026-09-09 追加 MAPS 群 setBuilder（未訳）

Set Builder 固有の英語38語を `stage-i18n.js` の `MAPS.setBuilder` に追加した。フランス語・簡体字・繁体字の既存ドラフトには未収録。

- セットビルダー
- 閉じる
- モデル
- 新規
- 複製
- 名前変更
- 削除
- JSONで書き出す
- 読み込む
- 覚え書き
- プレビュー
- 部品
- 追加
- 上へ
- 下へ
- 種類
- 位置
- 寸法
- 幅
- 奥行き
- 高さ
- 直径
- 回転
- 段数
- 明暗
- 選択した部品はありません
- このモデルを削除しますか？
- 部品を削除しますか？
- モデル名
- 読み込めるセットモデルがありません。
- 新しいセット
- の複製
- 箱
- パネル
- 円柱
- 球
- 階段
- 斜面
