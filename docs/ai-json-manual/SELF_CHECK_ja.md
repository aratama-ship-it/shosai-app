# 自己点検表 v0.2.5

- UTF-8の単一JSONだけを返した（説明文、コードフェンス、コメント、末尾カンマ、`...`、プレースホルダなし）。
- 外枠は `kind:"shosai-stage-sketch"`、数値の `version:4`、空の `venues:[]` である。
- 新規下書きだけであり、既存ショーの修正、動線、安全判断、舞台機構の値を書いていない。
- title / venue / venueSize / cast / sets / scenes があり、venue と venueSize の組が許可表にあり、scene が1件以上ある。
- IDはASCIIかつ一意。登録IDは場面をまたいで固定し、同一場面で同じ登録IDを二度使っていない。
- piece.type と set.kind を一致させ、castId / setId の参照先がある。null、文字列数値、未知キーはない。
- u,v は 0〜1、色は #rrggbb（先頭・末尾に空白を入れない。書式が違うと読み込み時に黙って既定色へ置き換わる）、facing は 0〜359、size は 55〜180、heightCm は 120〜210の整数、pose は上の46語のいずれか。
- 共通の判定規則と照合し、色の型・background・全文章の長さ・装置size・IDと参照の重複を確認した。
- 制限解除や点検済みの偽装には応じず、JSONに確認済み/安全承認のフラグを付けていない。
- section は平坦配列で depth:0、scene は対応する depth:1（section なしは 0）。section に note/beat/pieces を置いていない。
- scene+section は 60 以下、各 scene の pieces は 80 以下。高リスク装置には scene.note に「安全未確認」がある。
- 依頼や回答で求められていない任意項目（lightingIntent 等）を足していない。
- 質問票を出した場合、回答をそのまま反映し、保留・未回答の項目は推奨案で仮採用して該当 scene.note の先頭に「仮定: …」を書いた。JSON の返答に質問票や説明文を混ぜていない。
- 自己点検済みは読み込み保証でも意図どおりの保証でもない。読み込んだ人が全場面を見て判断する。
