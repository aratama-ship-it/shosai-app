# design-lint レポート — 127.0.0.1/full-show

- URL: http://127.0.0.1:18748/full-show/
- 測定時刻: 2026-09-11T01:01:30+09:00, 2026-09-11T01:01:34+09:00
- ビューポート: 390×844, 1440×900
- User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36
- Service Worker / キャッシュ: `service_workers="block"` の新規BrowserContextで測定
- 備考: Full performance proposal; existing Romeo and Juliet typography and colours. Three scenes, 19 cues, offline reading book.
- 総合: NG 0件 / WARN 1086件 / 測定不可 0件

## 判定サマリ — 390×844

| ID | 項目 | 判定 | 実測 | 基準 | 出典 |
|---|---|---|---|---|---|
| C1 | 文字と背景のコントラスト比 | WARN | 最悪 5.45:1／実数測定 1684件／WARN 263件 | 本文 4.5:1以上／大きい文字・UI部品 3:1以上 | §12-16 |
| C2 | 本文の純黒 | OK | 純黒 0件／本文 1823件 | 本文に #000000 を使わない | §12-19 |
| C3 | 色だけに頼ったリンク表現 | OK | 手がかりなし 0件／本文中リンク 22件 | 本文中リンクに色以外の手がかり | §12-17 |
| T1 | 行送り | OK | 1.80〜1.80／normal等の数値化不可 0件 | line-height / font-size = 1.5〜2.0 | §12-15 |
| T2 | 行長 | 情報 | 1.0〜21.5字/行（近似）／範囲外 562件 | 1行 30〜50字（全角換算・近似値） | §12-15 |
| T3 | ジャンプ率 | 情報 | 1.65倍（28.0px / 本文 17.0px） | 最大見出し / 本文 ≒ 2倍 | §12-15 |
| T4 | 書体の種類数 | OK | 2種類: Hiragino Kaku Gothic ProN, Hiragino Mincho ProN | 1〜2種類 | §12-18 |
| U1 | タップ対象の大きさ | OK | 44px未満 0件／対象 77件 | 44×44px以上 | §12-21 |
| U2 | ナビゲーション項目数 | 情報 | nav:nth-of-type(1): 4項目 | 4〜5以内 | §12-24 |
| U3 | アイコンのみボタンの aria-label | OK | 欠落 0件／アイコンのみ 0件 | aria-label 必須 | design-policy「多言語前提のUI表現はアイコン基本」 |
| U4 | ボタンの被覆 | OK | 被覆 0件／ボタン 7件 | 中心点で自分または子要素を取得できる | UI_AUDIT実績 |
| U5 | 同一ラベルの重複 | 情報 | 重複なし | 同一画面の重複ラベルを観測 | UI_AUDIT実績 |
| M1 | prefers-reduced-motion 対応 | OK | animation/transition なし | 動きがある場合は分岐必須 | A_design §5 |
| E1 | モノクロ化スクリーンショット | 情報 | full_390x844.png, gray_390x844.png | 人が見て判断する証拠 | §12-20 |

## 判定サマリ — 1440×900

| ID | 項目 | 判定 | 実測 | 基準 | 出典 |
|---|---|---|---|---|---|
| C1 | 文字と背景のコントラスト比 | WARN | 最悪 5.45:1／実数測定 1181件／WARN 823件 | 本文 4.5:1以上／大きい文字・UI部品 3:1以上 | §12-16 |
| C2 | 本文の純黒 | OK | 純黒 0件／本文 1823件 | 本文に #000000 を使わない | §12-19 |
| C3 | 色だけに頼ったリンク表現 | OK | 手がかりなし 0件／本文中リンク 22件 | 本文中リンクに色以外の手がかり | §12-17 |
| T1 | 行送り | OK | 1.80〜1.80／normal等の数値化不可 0件 | line-height / font-size = 1.5〜2.0 | §12-15 |
| T2 | 行長 | 情報 | 1.0〜49.0字/行（近似）／範囲外 499件 | 1行 30〜50字（全角換算・近似値） | §12-15 |
| T3 | ジャンプ率 | 情報 | 1.88倍（32.0px / 本文 17.0px） | 最大見出し / 本文 ≒ 2倍 | §12-15 |
| T4 | 書体の種類数 | OK | 2種類: Hiragino Kaku Gothic ProN, Hiragino Mincho ProN | 1〜2種類 | §12-18 |
| U1 | タップ対象の大きさ | OK | 44px未満 0件／対象 77件 | 44×44px以上 | §12-21 |
| U2 | ナビゲーション項目数 | 情報 | nav:nth-of-type(1): 4項目 | 4〜5以内 | §12-24 |
| U3 | アイコンのみボタンの aria-label | OK | 欠落 0件／アイコンのみ 0件 | aria-label 必須 | design-policy「多言語前提のUI表現はアイコン基本」 |
| U4 | ボタンの被覆 | OK | 被覆 0件／ボタン 7件 | 中心点で自分または子要素を取得できる | UI_AUDIT実績 |
| U5 | 同一ラベルの重複 | 情報 | 重複なし | 同一画面の重複ラベルを観測 | UI_AUDIT実績 |
| M1 | prefers-reduced-motion 対応 | OK | animation/transition なし | 動きがある場合は分岐必須 | A_design §5 |
| E1 | モノクロ化スクリーンショット | 情報 | full_1440x900.png, gray_1440x900.png | 人が見て判断する証拠 | §12-20 |

## NG の詳細

該当なし。

## WARN（判定不能）の詳細

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `tr:nth-of-type(13) > td:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死に見える眠りと、それを知らせる手紙とい
- スクリーンショット上の位置: x=272.8, y=3350.0, w=84.0, h=139.9px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `tr:nth-of-type(14) > th:nth-of-type(1) > a:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q14 仮死と葬送
- スクリーンショット上の位置: x=24.0, y=3527.6, w=106.3, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `tr:nth-of-type(14) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 18:30–20:15
- スクリーンショット上の位置: x=163.6, y=3518.2, w=87.3, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `tr:nth-of-type(14) > td:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 本人の決意が、家族と
- スクリーンショット上の位置: x=272.8, y=3518.2, w=70.0, h=39.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `tr:nth-of-type(14) > td:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=272.8, y=3568.5, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `tr:nth-of-type(14) > td:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: には死として見える。
- スクリーンショット上の位置: x=272.8, y=3593.7, w=83.2, h=39.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 全体の明かりと中央の穏やかなスポット。点
- スクリーンショット上の位置: x=16.0, y=3389.6, w=357.0, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=3497.3, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M01。足音の密度を減らし、最後は中央二
- スクリーンショット上の位置: x=16.0, y=3535.9, w=344.4, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=3613.1, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q02 · 仮の経過 03:00–03:
- スクリーンショット上の位置: x=16.0, y=3461.6, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-01-B
- スクリーンショット上の位置: x=16.0, y=3486.8, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-01-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 制止への挑発と暗転
- スクリーンショット上の位置: x=16.0, y=3523.9, w=198.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 平和へ向かいかけた空気を、
- スクリーンショット上の位置: x=16.0, y=3573.9, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=237.0, y=3573.9, w=84.5, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の一歩が断ち切る。
- スクリーンショット上の位置: x=16.0, y=3573.9, w=356.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 挑発を合図に即暗転。完了報告を受けて宴の
- スクリーンショット上の位置: x=16.0, y=4528.6, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=4605.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 一度無音。M01の拍をM02の宴の拍へ変
- スクリーンショット上の位置: x=16.0, y=4644.4, w=348.8, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=4721.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 止める手と、挑発の一歩。戦闘の見せ場には
- スクリーンショット上の位置: x=16.0, y=4760.2, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q03 · 仮の経過 03:20–05:
- スクリーンショット上の位置: x=16.0, y=4600.6, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-01-C
- スクリーンショット上の位置: x=16.0, y=4625.8, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-01-C`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 仮面の宴
- スクリーンショット上の位置: x=16.0, y=4663.0, w=88.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 群れの中で、二人だけが同じ速度になる。
- スクリーンショット上の位置: x=16.0, y=4713.0, w=322.2, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 右手前の二人へ柔らかいスポット。バーは室
- スクリーンショット上の位置: x=16.0, y=6445.9, w=356.5, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=6553.7, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M02。掌が合う時に二音の旋律。台詞中は
- スクリーンショット上の位置: x=16.0, y=6592.3, w=344.4, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=6669.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q04 · 仮の経過 05:50–06:
- スクリーンショット上の位置: x=16.0, y=6517.9, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-01-D
- スクリーンショット上の位置: x=16.0, y=6543.1, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-01-D`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 敵の名
- スクリーンショット上の位置: x=16.0, y=6580.3, w=66.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 触れ合った相手が、敵の家の子だと知る。
- スクリーンショット上の位置: x=16.0, y=6630.3, w=323.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 室内の暖かさが消え、右手前だけを残す。幕
- スクリーンショット上の位置: x=16.0, y=7732.2, w=355.3, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=7809.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M02の宴の拍を消し、二音だけを残してM
- スクリーンショット上の位置: x=16.0, y=7848.0, w=347.8, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=7925.1, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 群れの引く力に対して、二人が再び手を伸ば
- スクリーンショット上の位置: x=16.0, y=7963.7, w=338.3, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 第2場面 · 仮尺 15:55
- スクリーンショット上の位置: x=16.0, y=7822.2, w=136.7, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > h2:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人の約束から、届かない手紙へ
- スクリーンショット上の位置: x=16.0, y=7860.4, w=336.0, h=60.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 秘密の結婚で結ばれた二人が、決闘と追放に
- スクリーンショット上の位置: x=16.0, y=7948.4, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 右手前のスポットを保ち、退いた後に中央へ
- スクリーンショット上の位置: x=16.0, y=9541.9, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=9619.1, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M03の独奏。探す声の直前に余韻だけにし
- スクリーンショット上の位置: x=16.0, y=9657.7, w=344.4, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=9734.9, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小さな重心の預け合い→指先が離れる。高低
- スクリーンショット上の位置: x=16.0, y=9773.5, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q06 · 仮の経過 08:05–08:
- スクリーンショット上の位置: x=16.0, y=9613.9, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-02-B
- スクリーンショット上の位置: x=16.0, y=9639.1, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-02-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 背中の列と中央のロレンス
- スクリーンショット上の位置: x=16.0, y=9676.3, w=263.1, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 夜から翌日へ、秘密を見ていない人々の背中
- スクリーンショット上の位置: x=16.0, y=9726.3, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 暗転せず右手前から中央へ。色温度をわずか
- スクリーンショット上の位置: x=16.0, y=10528.4, w=356.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=10605.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M03の二音を長く引き伸ばす。七名の呼吸
- スクリーンショット上の位置: x=16.0, y=10644.2, w=342.7, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=10721.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 背中の列は物理的な壁ではなく、秘密を見な
- スクリーンショット上の位置: x=16.0, y=10760.0, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q07 · 仮の経過 08:35–10:
- スクリーンショット上の位置: x=16.0, y=10600.4, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-02-C
- スクリーンショット上の位置: x=16.0, y=10625.6, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-02-C`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 秘密の結婚
- スクリーンショット上の位置: x=16.0, y=10662.8, w=110.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人の結婚を短い幸福の頂点とし、その手を
- スクリーンショット上の位置: x=16.0, y=10712.8, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 中央の柔らかい光。婚姻後、広い街路の光へ
- スクリーンショット上の位置: x=16.0, y=12442.5, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=12519.7, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M03の二音が初めて重なる。手が離れると
- スクリーンショット上の位置: x=16.0, y=12558.3, w=343.9, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=12635.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 手を重ねる形を観客の記憶に残す。背中の列
- スクリーンショット上の位置: x=16.0, y=12674.1, w=355.3, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q08 · 仮の経過 10:15–11:
- スクリーンショット上の位置: x=16.0, y=12514.5, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-A
- スクリーンショット上の位置: x=16.0, y=12539.7, w=104.4, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-03-A`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 追跡と見失い
- スクリーンショット上の位置: x=16.0, y=12576.9, w=132.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=16.0, y=12626.9, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が争いを避けたことを、追跡の始まりとして
- スクリーンショット上の位置: x=16.0, y=12626.9, w=356.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 一つの街路の明かり。舞台の左右を両家に分
- スクリーンショット上の位置: x=16.0, y=13668.0, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=13745.1, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 足音がM04の短い反復へ。見失った所で一
- スクリーンショット上の位置: x=16.0, y=13783.7, w=344.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=13860.9, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 直線→曲線→空振りの追跡。
- スクリーンショット上の位置: x=16.0, y=13899.5, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=237.0, y=13899.5, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は振り向いて戦わない。
- スクリーンショット上の位置: x=16.0, y=13899.5, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=16.0, y=14061.9, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=128.0, y=14061.9, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は
- スクリーンショット上の位置: x=170.0, y=14061.9, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=184.0, y=14061.9, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を無視して去る。
- スクリーンショット上の位置: x=253.6, y=14061.9, w=111.2, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=16.0, y=14087.1, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は追うが見失う。
- スクリーンショット上の位置: x=85.6, y=14087.1, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q09 · 仮の経過 11:00–12:
- スクリーンショット上の位置: x=16.0, y=13740.0, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-B
- スクリーンショット上の位置: x=16.0, y=13765.1, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `h3:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=16.0, y=13802.3, w=153.1, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-03-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の決闘
- スクリーンショット上の位置: x=169.1, y=13802.3, w=66.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 軽い挑発が引き返せない争いへ変わる。
- スクリーンショット上の位置: x=16.0, y=13852.3, w=306.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人が見える街路の明かりを固定。殺陣の途
- スクリーンショット上の位置: x=16.0, y=14710.2, w=356.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=14787.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M04。
- スクリーンショット上の位置: x=16.0, y=14826.0, w=55.5, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=71.5, y=14826.0, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の曲線に跳ねる音を添え、最後に低い拍へ収
- スクリーンショット上の位置: x=16.0, y=14826.0, w=343.8, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=14903.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 説明台詞を足さず、機転と直情の違いを動き
- スクリーンショット上の位置: x=16.0, y=14941.8, w=355.3, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q10 · 仮の経過 12:00–13:
- スクリーンショット上の位置: x=16.0, y=14782.2, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-C
- スクリーンショット上の位置: x=16.0, y=14807.4, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-03-C`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死と即時の報復
- スクリーンショット上の位置: x=16.0, y=14844.6, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 止めようとした
- スクリーンショット上の位置: x=16.0, y=14894.6, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=135.0, y=14894.6, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の手が、報復へ変わる。
- スクリーンショット上の位置: x=186.0, y=14894.6, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 負傷と報復が見える光を維持し、終わってか
- スクリーンショット上の位置: x=16.0, y=16165.8, w=356.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=16243.0, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 負傷の一打から空白、即時の報復に短い拍。
- スクリーンショット上の位置: x=16.0, y=16281.6, w=357.0, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=16389.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=16.0, y=16590.4, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=128.0, y=16590.4, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が戻って止めに入り、その腕の下から
- スクリーンショット上の位置: x=16.0, y=16590.4, w=349.6, h=39.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=58.0, y=16615.5, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の刃が
- スクリーンショット上の位置: x=127.6, y=16615.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=169.6, y=16615.5, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: に届く。
- スクリーンショット上の位置: x=267.0, y=16615.5, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=323.0, y=16615.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は傷を見た瞬間に報復する。
- スクリーンショット上の位置: x=16.0, y=16640.7, w=182.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=198.0, y=16640.7, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が倒れ、
- スクリーンショット上の位置: x=267.6, y=16640.7, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=16.0, y=16665.9, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: も力を失う。
- スクリーンショット上の位置: x=113.5, y=16665.9, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q11 · 仮の経過 13:00–15:
- スクリーンショット上の位置: x=16.0, y=16237.8, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-D
- スクリーンショット上の位置: x=16.0, y=16263.0, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-03-D`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 追放から夜明けへ
- スクリーンショット上の位置: x=16.0, y=16300.2, w=176.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 追放の意味を、妻のそばに残れば死ぬという
- スクリーンショット上の位置: x=16.0, y=16350.2, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=16.0, y=16660.6, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=146.2, y=16663.6, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 大公の裁きが出た。
- スクリーンショット上の位置: x=16.0, y=16699.2, w=153.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=169.0, y=16699.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=220.0, y=16699.2, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ヴェローナ
- スクリーンショット上の位置: x=237.0, y=16699.2, w=84.2, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: から追放だ。
- スクリーンショット上の位置: x=16.0, y=16699.2, w=356.2, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=16.0, y=17038.3, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=128.8, y=17041.3, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: もう行ってしまうの？ まだ夜明けには早い
- スクリーンショット上の位置: x=16.0, y=17076.9, w=356.5, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 裁き→夜の右手前→夜明けの順。明るくなる
- スクリーンショット上の位置: x=16.0, y=18640.5, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=18717.7, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M04の余韻を消しM03へ。朝を告げる短
- スクリーンショット上の位置: x=16.0, y=18756.3, w=348.9, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=18833.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 再会は支え合う重心、別れは指先から。平舞
- スクリーンショット上の位置: x=16.0, y=18872.0, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：判決を短い声または群れの
- スクリーンショット上の位置: x=16.0, y=19034.4, w=336.0, h=64.4px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q12 · 仮の経過 15:30–16:
- スクリーンショット上の位置: x=16.0, y=18712.5, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-A
- スクリーンショット上の位置: x=16.0, y=18737.7, w=104.4, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-04-A`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人だけの圧力
- スクリーンショット上の位置: x=16.0, y=18774.9, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 娘の意思が聞かれない家を、二人だけの距離
- スクリーンショット上の位置: x=16.0, y=18824.9, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=16.0, y=19106.4, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=128.8, y=19109.4, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 結婚相手を選んでくれたことには感謝します
- スクリーンショット上の位置: x=16.0, y=19145.0, w=353.6, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: でも、望まない結婚を喜ぶことはできません
- スクリーンショット上の位置: x=16.0, y=19175.6, w=357.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=16.0, y=19230.2, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=147.0, y=19233.2, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 客席右の家の領域のみ。父を大きな影にする
- スクリーンショット上の位置: x=16.0, y=20361.4, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=20438.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音を薄くし、足音と台詞の圧力を使う。父の
- スクリーンショット上の位置: x=16.0, y=20477.2, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=20554.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 父の直線と娘の逃げ道。人数を増やして圧力
- スクリーンショット上の位置: x=16.0, y=20593.0, w=356.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q13 · 仮の経過 16:45–18:
- スクリーンショット上の位置: x=16.0, y=20433.4, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-B
- スクリーンショット上の位置: x=16.0, y=20458.6, w=103.9, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-04-B`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 薬と計画
- スクリーンショット上の位置: x=16.0, y=20495.8, w=88.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死に見える眠りと、それを知らせる手紙とい
- スクリーンショット上の位置: x=16.0, y=20545.8, w=356.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 中央の瓶、次に手紙へ焦点を渡し、最後に右
- スクリーンショット上の位置: x=16.0, y=22370.9, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=22448.1, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M05。『手紙』にだけ小さな反復音を添え
- スクリーンショット上の位置: x=16.0, y=22486.7, w=352.9, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=22563.9, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 結婚で重ねた手が、瓶を渡す手に変わる。ロ
- スクリーンショット上の位置: x=16.0, y=22602.5, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：中央の
- スクリーンショット上の位置: x=16.0, y=22795.5, w=154.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=170.0, y=22795.5, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が仮死の薬と手紙の段取りを示す。
- スクリーンショット上の位置: x=16.0, y=22795.5, w=348.6, h=39.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=140.6, y=22820.7, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は追放先にいて不在。
- スクリーンショット上の位置: x=182.6, y=22820.7, w=139.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q14 · 仮の経過 18:30–20:
- スクリーンショット上の位置: x=16.0, y=22442.9, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-C
- スクリーンショット上の位置: x=16.0, y=22468.1, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-04-C`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 仮死と葬送
- スクリーンショット上の位置: x=16.0, y=22505.3, w=110.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 本人の決意が、家族と
- スクリーンショット上の位置: x=16.0, y=22555.3, w=170.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=186.0, y=22555.3, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: には死として見える。
- スクリーンショット上の位置: x=16.0, y=22555.3, w=356.2, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=16.0, y=22808.1, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=128.8, y=22811.1, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: さようなら。次にいつ会えるかは、神さまだ
- スクリーンショット上の位置: x=16.0, y=22846.7, w=356.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 冷たい恐れが、血の中を駆け上がってくる。
- スクリーンショット上の位置: x=16.0, y=22907.9, w=338.3, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 命のぬくもりまで、凍りつきそう。
- スクリーンショット上の位置: x=16.0, y=22938.5, w=270.3, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 呼び戻そうか。
- スクリーンショット上の位置: x=16.0, y=22969.0, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 一人の夜→発見の朝→葬送の上半身へ。大暗
- スクリーンショット上の位置: x=16.0, y=24508.4, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=24585.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M05。宴の拍を遅くした形を使い、発見で
- スクリーンショット上の位置: x=16.0, y=24624.2, w=344.4, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=24701.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 本人には再会への策、家族には死。葬送は支
- スクリーンショット上の位置: x=16.0, y=24740.0, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=16.0, y=24933.0, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=128.0, y=24933.0, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が薬を飲んで仮死状態になる。祝いへ向かう
- スクリーンショット上の位置: x=16.0, y=24933.0, w=350.0, h=64.4px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q15 · 仮の経過 20:15–22:
- スクリーンショット上の位置: x=16.0, y=24580.4, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-D
- スクリーンショット上の位置: x=16.0, y=24605.6, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-04-D`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 届かない知らせ
- スクリーンショット上の位置: x=16.0, y=24642.8, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 間違った知らせは届き、本当の手紙だけが届
- スクリーンショット上の位置: x=16.0, y=24692.8, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=16.0, y=24945.6, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=146.2, y=24948.6, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=16.0, y=24984.2, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が亡くなった。墓所へ送られるのを見た。
- スクリーンショット上の位置: x=16.0, y=24984.2, w=355.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 旅路の動きが見える全体光から、左の墓所と
- スクリーンショット上の位置: x=16.0, y=26301.2, w=356.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=26378.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M06。二つの同形フレーズを半拍ずらす。
- スクリーンショット上の位置: x=16.0, y=26417.0, w=356.7, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=26494.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 直接相手を追う喜劇ではなく、別の目的で急
- スクリーンショット上の位置: x=16.0, y=26532.8, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は再登場までに墓所の杯を受け取る。
- スクリーンショット上の位置: x=16.0, y=26679.1, w=356.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：手紙を届ける人と
- スクリーンショット上の位置: x=16.0, y=26756.3, w=223.6, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=239.6, y=26756.3, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が入れ違う。追いかけっこの感触を、ジャグ
- スクリーンショット上の位置: x=16.0, y=26756.3, w=349.6, h=64.4px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 第3場面 · 仮尺 06:35
- スクリーンショット上の位置: x=16.0, y=26391.2, w=136.7, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > header:nth-of-type(1) > h2:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 墓所、二人の死、残された和解
- スクリーンショット上の位置: x=16.0, y=26429.4, w=336.0, h=24.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 再会の時間が合わず二人は死ぬ。その不在を
- スクリーンショット上の位置: x=16.0, y=26481.4, w=356.5, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-05-A`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 同時にある二つの場所
- スクリーンショット上の位置: x=16.0, y=26703.5, w=220.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二つの場所で起こることが、見えていても互
- スクリーンショット上の位置: x=16.0, y=26753.5, w=355.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 左墓所と右別場所を同時に保つ。台詞を話す
- スクリーンショット上の位置: x=16.0, y=28297.9, w=357.0, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=28405.7, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M06の反復を低く。川の呼吸を土台にし、
- スクリーンショット上の位置: x=16.0, y=28444.3, w=344.4, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=28521.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q17 · 仮の経過 24:10–26:
- スクリーンショット上の位置: x=16.0, y=28369.9, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-B
- スクリーンショット上の位置: x=16.0, y=28395.1, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-05-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 時間のすれ違い
- スクリーンショット上の位置: x=16.0, y=28432.3, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ほんの少しの時間差で、会えたはずの二人が
- スクリーンショット上の位置: x=16.0, y=28482.3, w=355.3, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の死の後も暗転しない。目覚めの微細な動き
- スクリーンショット上の位置: x=16.0, y=30138.5, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `div:nth-of-type(1) > dd:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=118.0, y=30169.1, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が沈んだ後に左右の光を同じ静けさへそろえ
- スクリーンショット上の位置: x=16.0, y=30169.1, w=355.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=30246.3, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=16.0, y=30284.9, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の杯で一方の反復が消える。目覚めは無音寄
- スクリーンショット上の位置: x=16.0, y=30284.9, w=356.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `div:nth-of-type(2) > dd:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=84.0, y=30315.5, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の死で最後の反復も止まる。
- スクリーンショット上の位置: x=16.0, y=30315.5, w=355.5, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 杯と短剣は死を識別する記号。血や写実的な
- スクリーンショット上の位置: x=16.0, y=30547.0, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=16.0, y=30624.2, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=128.0, y=30624.2, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が
- スクリーンショット上の位置: x=170.0, y=30624.2, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=184.0, y=30624.2, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の目覚め前に死ぬ。
- スクリーンショット上の位置: x=16.0, y=30624.2, w=348.8, h=39.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=44.0, y=30649.4, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が目覚め、
- スクリーンショット上の位置: x=126.8, y=30649.4, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=196.8, y=30649.4, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の死を知って後を追う。
- スクリーンショット上の位置: x=16.0, y=30649.4, w=348.3, h=39.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q18 · 仮の経過 26:20–27:
- スクリーンショット上の位置: x=16.0, y=30210.5, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-C
- スクリーンショット上の位置: x=16.0, y=30235.7, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-05-C`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 川がほどける
- スクリーンショット上の位置: x=16.0, y=30272.9, w=131.3, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 隔てていた身体が、自分の意思で境界をやめ
- スクリーンショット上の位置: x=16.0, y=30322.9, w=340.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 中央の境界を消し、中央のロレンスと左の二
- スクリーンショット上の位置: x=16.0, y=31378.9, w=355.3, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=31456.1, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M07。川の足音が止まり、無音の間を残す
- スクリーンショット上の位置: x=16.0, y=31494.7, w=342.7, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=16.0, y=31541.3, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 境界を人が解く。誰かが川を突破して解決す
- スクリーンショット上の位置: x=16.0, y=31579.9, w=356.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q19 · 仮の経過 27:05–29:
- スクリーンショット上の位置: x=16.0, y=31450.9, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-D
- スクリーンショット上の位置: x=16.0, y=31476.1, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `#h-RJ-COND-05-D`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンスを中心に集まる
- スクリーンショット上の位置: x=16.0, y=31513.3, w=241.1, h=22.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 悲しみが一人ずつ中央へ人を引き寄せ、真相
- スクリーンショット上の位置: x=16.0, y=31563.3, w=357.0, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 中央のロレンスを軸に、近づく人が一人ずつ
- スクリーンショット上の位置: x=16.0, y=33627.8, w=357.0, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=16.0, y=33735.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 集合の途中は足音と呼吸。父親の手が重なっ
- スクリーンショット上の位置: x=16.0, y=33774.2, w=356.5, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 戻った手紙をロレンスが保持。左の杯・短剣
- スクリーンショット上の位置: x=16.0, y=34036.3, w=355.3, h=47.6px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=16.0, y=34113.5, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=128.0, y=34113.5, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を中央に置く。悲しみの中で一人ずつ人が集
- スクリーンショット上の位置: x=16.0, y=34113.5, w=348.6, h=64.4px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > h2:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 制作メモ
- スクリーンショット上の位置: x=16.0, y=33714.8, w=96.0, h=24.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 左右は客席から見た方向。家を表すときは左
- スクリーンショット上の位置: x=16.0, y=33766.8, w=356.5, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=16.0, y=33797.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、右が
- スクリーンショット上の位置: x=118.0, y=33797.4, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=169.0, y=33797.4, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 。街路・旅路は両家の陣地に分けず、終幕は
- スクリーンショット上の位置: x=16.0, y=33797.4, w=357.0, h=78.2px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明の基本は全体、中央、右手前、左墓所、
- スクリーンショット上の位置: x=56.0, y=34071.2, w=306.0, h=139.4px

### C1 文字と背景のコントラスト比 — 390×844

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: バーは舞台奥の中立色のカウンターと背面棚
- スクリーンショット上の位置: x=56.0, y=34236.1, w=306.0, h=139.4px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(18) > th:nth-of-type(1) > a:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q18 川がほどける
- スクリーンショット上の位置: x=220.0, y=2593.2, w=119.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(18) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 26:20–27:05
- スクリーンショット上の位置: x=506.7, y=2583.8, w=87.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(18) > td:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 隔てていた身体が、自分の意思で境界をやめ
- スクリーンショット上の位置: x=875.4, y=2583.8, w=308.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(19) > th:nth-of-type(1) > a:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q19 ロレンスを中心に集まる
- スクリーンショット上の位置: x=220.0, y=2662.2, w=189.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(19) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 27:05–29:05
- スクリーンショット上の位置: x=506.7, y=2652.8, w=87.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(19) > td:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 悲しみが一人ずつ中央へ人を引き寄せ、真相
- スクリーンショット上の位置: x=875.4, y=2652.8, w=335.5, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=2564.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M01。足音の密度を減らし、最後は中央二
- スクリーンショット上の位置: x=360.0, y=2564.5, w=461.7, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=2611.1, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 四隅の相互反応と、中央の静かな対峙の対比
- スクリーンショット上の位置: x=360.0, y=2611.1, w=357.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=2657.7, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 八名の群衆には家の色を割り振らない。中央
- スクリーンショット上の位置: x=360.0, y=2657.7, w=561.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：10名全員。四隅で四組が
- スクリーンショット上の位置: x=208.0, y=2704.3, w=382.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=590.4, y=2704.3, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は争いを止めようとし、ティーボルトはその
- スクリーンショット上の位置: x=208.0, y=2704.3, w=661.3, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q02 · 仮の経過 03:00–03:
- スクリーンショット上の位置: x=208.0, y=2628.5, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-01-B
- スクリーンショット上の位置: x=208.0, y=2653.7, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-01-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 制止への挑発と暗転
- スクリーンショット上の位置: x=208.0, y=2690.9, w=198.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 平和へ向かいかけた空気を、
- スクリーンショット上の位置: x=208.0, y=2740.9, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=429.0, y=2740.9, w=84.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の一歩が断ち切る。
- スクリーンショット上の位置: x=513.5, y=2740.9, w=153.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=208.0, y=2905.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存下訳の抜粋
- スクリーンショット上の位置: x=208.0, y=2935.1, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 剣を抜いておいて、平和だと？ その言葉が
- スクリーンショット上の位置: x=368.0, y=2905.5, w=423.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=3483.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 一度無音。M01の拍をM02の宴の拍へ変
- スクリーンショット上の位置: x=360.0, y=3483.2, w=552.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=3529.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 止める手と、挑発の一歩。戦闘の見せ場には
- スクリーンショット上の位置: x=360.0, y=3529.8, w=442.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=3576.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 全員の仮面、バーを準備。冒頭の武器は袖へ
- スクリーンショット上の位置: x=360.0, y=3576.4, w=356.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：最後の一組が止まり、
- スクリーンショット上の位置: x=208.0, y=3623.0, w=252.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=460.0, y=3623.0, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が制止へ踏み出す。ティーボルトがその動き
- スクリーンショット上の位置: x=208.0, y=3623.0, w=669.5, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q03 · 仮の経過 03:20–05:
- スクリーンショット上の位置: x=208.0, y=3547.2, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-01-C
- スクリーンショット上の位置: x=208.0, y=3572.4, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-01-C`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 仮面の宴
- スクリーンショット上の位置: x=208.0, y=3609.6, w=88.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 群れの中で、二人だけが同じ速度になる。
- スクリーンショット上の位置: x=208.0, y=3659.6, w=322.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=3991.7, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存下訳の抜粋
- スクリーンショット上の位置: x=208.0, y=4021.3, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この不作法な手で、この聖堂を汚したのなら
- スクリーンショット上の位置: x=368.0, y=3991.7, w=356.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: どうか、唇に償わせてください。
- スクリーンショット上の位置: x=368.0, y=4022.3, w=254.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この唇も、祈るようにあなたへ近づき、
- スクリーンショット上の位置: x=368.0, y=4052.9, w=305.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: やさしい口づけで、手の無礼を清めたいので
- スクリーンショット上の位置: x=368.0, y=4083.5, w=371.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=4913.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M02。掌が合う時に二音の旋律。台詞中は
- スクリーンショット上の位置: x=360.0, y=4913.2, w=497.4, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=4959.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 宴は円運動、二人は小さな鏡の動き。仮面を
- スクリーンショット上の位置: x=360.0, y=4959.8, w=527.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=5006.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: バーと仮面のみで場所を示す。杯を使う案は
- スクリーンショット上の位置: x=360.0, y=5006.4, w=642.4, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：暗転の中で全員が仮面へ移
- スクリーンショット上の位置: x=208.0, y=5053.0, w=392.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=600.0, y=5053.0, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: と
- スクリーンショット上の位置: x=642.0, y=5053.0, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=656.0, y=5053.0, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: のスポットを作り、ほかの8名は別の場所で
- スクリーンショット上の位置: x=208.0, y=5053.0, w=670.8, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q04 · 仮の経過 05:50–06:
- スクリーンショット上の位置: x=208.0, y=4977.2, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-01-D
- スクリーンショット上の位置: x=208.0, y=5002.4, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-01-D`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 敵の名
- スクリーンショット上の位置: x=208.0, y=5039.6, w=66.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 触れ合った相手が、敵の家の子だと知る。
- スクリーンショット上の位置: x=208.0, y=5089.6, w=323.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=5282.9, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 補筆案
- スクリーンショット上の位置: x=208.0, y=5312.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=368.0, y=5282.9, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の人なのか。
- スクリーンショット上の位置: x=487.0, y=5282.9, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=5362.7, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 補筆案
- スクリーンショット上の位置: x=208.0, y=5392.3, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: あなたが、
- スクリーンショット上の位置: x=368.0, y=5362.7, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=453.0, y=5362.7, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の
- スクリーンショット上の位置: x=555.0, y=5362.7, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=572.0, y=5362.7, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 。
- スクリーンショット上の位置: x=623.0, y=5362.7, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=5940.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M02の宴の拍を消し、二音だけを残してM
- スクリーンショット上の位置: x=360.0, y=5940.4, w=381.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=5987.0, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 群れの引く力に対して、二人が再び手を伸ば
- スクリーンショット上の位置: x=360.0, y=5987.0, w=370.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=6033.6, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: バー撤去完了を窓辺へのGO条件にする。仮
- スクリーンショット上の位置: x=360.0, y=6033.6, w=484.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：二人が互いの家名を知る。
- スクリーンショット上の位置: x=208.0, y=6080.2, w=602.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 第2場面 · 仮尺 15:55
- スクリーンショット上の位置: x=208.0, y=6022.4, w=136.7, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > h2:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人の約束から、届かない手紙へ
- スクリーンショット上の位置: x=208.0, y=6060.6, w=390.0, h=26.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 秘密の結婚で結ばれた二人が、決闘と追放に
- スクリーンショット上の位置: x=208.0, y=6115.6, w=509.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=717.5, y=6115.6, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は再会のために仮死の策を選ぶが、手紙が届
- スクリーンショット上の位置: x=208.0, y=6115.6, w=814.0, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=377.5, y=6146.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は死を信じて墓所へ向かう。
- スクリーンショット上の位置: x=428.5, y=6146.2, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q05 · 仮の経過 06:35–08:
- スクリーンショット上の位置: x=208.0, y=6244.8, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-02-A
- スクリーンショット上の位置: x=208.0, y=6270.0, w=104.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-02-A`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人だけの窓辺
- スクリーンショット上の位置: x=208.0, y=6307.2, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 家名を知った上で、結婚を自分たちの意思と
- スクリーンショット上の位置: x=208.0, y=6357.2, w=423.1, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=6550.6, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=6580.2, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=368.0, y=6550.6, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、あと少しだけ。それで、本当におやすみ。
- スクリーンショット上の位置: x=419.0, y=6550.6, w=337.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(1) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: あなたの愛が誠実で、
- スクリーンショット上の位置: x=368.0, y=6581.2, w=169.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=7337.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M03の独奏。探す声の直前に余韻だけにし
- スクリーンショット上の位置: x=360.0, y=7337.6, w=530.9, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=7384.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小さな重心の預け合い→指先が離れる。高低
- スクリーンショット上の位置: x=360.0, y=7384.2, w=561.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=7430.8, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 袖の声は大道具担当。俳優を一人増やさない
- スクリーンショット上の位置: x=360.0, y=7430.8, w=357.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：第1場面と同じ右斜め手前
- スクリーンショット上の位置: x=208.0, y=7477.4, w=499.2, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=707.2, y=7477.4, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: と
- スクリーンショット上の位置: x=749.2, y=7477.4, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=763.2, y=7477.4, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: だけが残る。約束の終わりに、舞台袖から
- スクリーンショット上の位置: x=208.0, y=7477.4, w=666.0, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 大道具さん
- スクリーンショット上の位置: x=446.0, y=7502.6, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が
- スクリーンショット上の位置: x=516.0, y=7502.6, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=530.0, y=7502.6, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を大声で探す。人物は登場せず、その声を受
- スクリーンショット上の位置: x=208.0, y=7502.6, w=667.4, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=362.0, y=7527.8, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は客席右の袖へ、
- スクリーンショット上の位置: x=444.8, y=7527.8, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=556.8, y=7527.8, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は客席左の暗がりへ別々に退く。暗転は使わ
- スクリーンショット上の位置: x=208.0, y=7527.8, w=670.8, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q06 · 仮の経過 08:05–08:
- スクリーンショット上の位置: x=208.0, y=7401.6, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-02-B
- スクリーンショット上の位置: x=208.0, y=7426.8, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-02-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 背中の列と中央のロレンス
- スクリーンショット上の位置: x=208.0, y=7464.0, w=263.1, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 夜から翌日へ、秘密を見ていない人々の背中
- スクリーンショット上の位置: x=208.0, y=7514.0, w=475.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > p:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 次へ進む合図
- スクリーンショット上の位置: x=227.0, y=7939.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 列がそろい、ロレンスの両手が開いたことを
- スクリーンショット上の位置: x=227.0, y=7970.0, w=490.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=8147.7, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M03の二音を長く引き伸ばす。七名の呼吸
- スクリーンショット上の位置: x=360.0, y=8147.7, w=461.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=8194.3, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 背中の列は物理的な壁ではなく、秘密を見な
- スクリーンショット上の位置: x=360.0, y=8194.3, w=645.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=8240.9, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: バーはすでに撤去済み。祭壇や大きな装置は
- スクリーンショット上の位置: x=360.0, y=8240.9, w=441.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：暗転せず中央へ焦点を移す
- スクリーンショット上の位置: x=208.0, y=8287.5, w=292.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=500.6, y=8287.5, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が先に中央で待つ。ほかの7名は客席へ背中
- スクリーンショット上の位置: x=208.0, y=8287.5, w=664.4, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q07 · 仮の経過 08:35–10:
- スクリーンショット上の位置: x=208.0, y=8211.7, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-02-C
- スクリーンショット上の位置: x=208.0, y=8236.9, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-02-C`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 秘密の結婚
- スクリーンショット上の位置: x=208.0, y=8274.1, w=110.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人の結婚を短い幸福の頂点とし、その手を
- スクリーンショット上の位置: x=208.0, y=8324.1, w=491.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=8517.5, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=8547.1, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=368.0, y=8517.5, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、あなたも私と同じほど喜んでいて、
- スクリーンショット上の位置: x=468.5, y=8517.5, w=286.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: それを私よりうまく言えるなら、
- スクリーンショット上の位置: x=368.0, y=8548.1, w=254.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: その声で、この空気まで甘くしてほしい。
- スクリーンショット上の位置: x=368.0, y=8578.7, w=321.1, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 今、二人が分かち合う幸せを、音楽のように
- スクリーンショット上の位置: x=368.0, y=8609.3, w=424.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=8663.9, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=8693.5, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 言葉より豊かな想いは、飾りで大きく見せた
- スクリーンショット上の位置: x=368.0, y=8663.9, w=425.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 数えられるうちは、まだ乏しいのでしょう。
- スクリーンショット上の位置: x=368.0, y=8694.5, w=340.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 私の愛はもう、その半分さえ数えきれない。
- スクリーンショット上の位置: x=368.0, y=8725.0, w=340.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=9562.7, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M03の二音が初めて重なる。手が離れると
- スクリーンショット上の位置: x=360.0, y=9562.7, w=618.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=9609.3, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 手を重ねる形を観客の記憶に残す。背中の列
- スクリーンショット上の位置: x=360.0, y=9609.3, w=593.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=9655.9, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 婚姻は手で示す。指輪を追加しなくても成立
- スクリーンショット上の位置: x=360.0, y=9655.9, w=406.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=208.0, y=9702.5, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=320.0, y=9702.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は客席左斜め、
- スクリーンショット上の位置: x=362.0, y=9702.5, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=460.0, y=9702.5, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は客席右斜めから別々に中央へ入り、ロレン
- スクリーンショット上の位置: x=208.0, y=9702.5, w=669.4, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q08 · 仮の経過 10:15–11:
- スクリーンショット上の位置: x=208.0, y=9626.7, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-A
- スクリーンショット上の位置: x=208.0, y=9651.9, w=104.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-03-A`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 追跡と見失い
- スクリーンショット上の位置: x=208.0, y=9689.1, w=132.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=9739.1, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が争いを避けたことを、追跡の始まりとして
- スクリーンショット上の位置: x=259.0, y=9739.1, w=406.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=208.0, y=9932.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=9962.1, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=368.0, y=9932.5, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 。おまえを呼ぶ名は、一つしかない――悪党
- スクリーンショット上の位置: x=419.0, y=9932.5, w=373.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=10510.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 足音がM04の短い反復へ。見失った所で一
- スクリーンショット上の位置: x=360.0, y=10510.2, w=412.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=10556.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 直線→曲線→空振りの追跡。
- スクリーンショット上の位置: x=360.0, y=10556.8, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=581.0, y=10556.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は振り向いて戦わない。
- スクリーンショット上の位置: x=632.0, y=10556.8, w=186.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=10603.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=360.0, y=10603.4, w=84.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の武器は挑発の延長として持つ。
- スクリーンショット上の位置: x=444.5, y=10603.4, w=254.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=208.0, y=10650.0, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=320.0, y=10650.0, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は
- スクリーンショット上の位置: x=362.0, y=10650.0, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=376.0, y=10650.0, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を無視して去る。
- スクリーンショット上の位置: x=445.6, y=10650.0, w=111.2, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=556.8, y=10650.0, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は追うが見失う。
- スクリーンショット上の位置: x=626.4, y=10650.0, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > strong:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=11920.3, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を見失う
- スクリーンショット上の位置: x=250.0, y=11920.3, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 舞台上 1名：
- スクリーンショット上の位置: x=208.0, y=11945.5, w=83.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=291.9, y=11945.5, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この瞬間は袖：
- スクリーンショット上の位置: x=208.0, y=11970.7, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=306.0, y=11970.7, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=348.0, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=362.0, y=11970.7, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=444.8, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=458.8, y=11970.7, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=555.4, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=569.4, y=11970.7, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=666.7, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=680.7, y=11970.7, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=778.1, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(7)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=792.1, y=11970.7, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=820.1, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(8)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=834.1, y=11970.7, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=932.1, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(9)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=946.1, y=11970.7, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=1030.1, y=11970.7, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(10)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジョン修道士
- スクリーンショット上の位置: x=1044.1, y=11970.7, w=83.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q09 · 仮の経過 11:00–12:
- スクリーンショット上の位置: x=208.0, y=10574.2, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-B
- スクリーンショット上の位置: x=208.0, y=10599.4, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `h3:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=208.0, y=10636.6, w=153.1, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-03-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の決闘
- スクリーンショット上の位置: x=361.1, y=10636.6, w=66.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 軽い挑発が引き返せない争いへ変わる。
- スクリーンショット上の位置: x=208.0, y=10686.6, w=306.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明・音楽・小道具の案
- スクリーンショット上の位置: x=226.0, y=11275.7, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明案
- スクリーンショット上の位置: x=208.0, y=11331.3, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人が見える街路の明かりを固定。殺陣の途
- スクリーンショット上の位置: x=360.0, y=11331.3, w=560.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=11377.9, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=11377.9, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M04。
- スクリーンショット上の位置: x=360.0, y=11377.9, w=55.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M04。
- スクリーンショット上の位置: x=360.0, y=11377.9, w=55.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=415.5, y=11377.9, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=415.5, y=11377.9, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の曲線に跳ねる音を添え、最後に低い拍へ収
- スクリーンショット上の位置: x=533.8, y=11377.9, w=374.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の曲線に跳ねる音を添え、最後に低い拍へ収
- スクリーンショット上の位置: x=533.8, y=11377.9, w=374.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=11424.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=11424.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 説明台詞を足さず、機転と直情の違いを動き
- スクリーンショット上の位置: x=360.0, y=11424.5, w=709.9, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 説明台詞を足さず、機転と直情の違いを動き
- スクリーンショット上の位置: x=360.0, y=11424.5, w=709.9, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=11471.1, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=11471.1, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=360.0, y=11471.1, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=360.0, y=11471.1, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の武器をこの入口で見せる。
- スクリーンショット上の位置: x=478.3, y=11471.1, w=220.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の武器をこの入口で見せる。
- スクリーンショット上の位置: x=478.3, y=11471.1, w=220.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：そこへ
- スクリーンショット上の位置: x=208.0, y=11517.7, w=153.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：そこへ
- スクリーンショット上の位置: x=208.0, y=11517.7, w=153.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=361.3, y=11517.7, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=361.3, y=11517.7, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が現れ、
- スクリーンショット上の位置: x=458.8, y=11517.7, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が現れ、
- スクリーンショット上の位置: x=458.8, y=11517.7, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=514.8, y=11517.7, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=514.8, y=11517.7, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: と戦う。台詞を絞り、追跡と戦いを行動で見
- スクリーンショット上の位置: x=208.0, y=11517.7, w=670.4, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: と戦う。台詞を絞り、追跡と戦いを行動で見
- スクリーンショット上の位置: x=208.0, y=11517.7, w=670.4, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(5) > details:nth-of-type(2) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 構成図と10名の居場所（1図）
- スクリーンショット上の位置: x=226.0, y=11335.3, w=237.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q10 · 仮の経過 12:00–13:
- スクリーンショット上の位置: x=208.0, y=11441.9, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q10 · 仮の経過 12:00–13:
- スクリーンショット上の位置: x=208.0, y=11441.9, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-C
- スクリーンショット上の位置: x=208.0, y=11467.1, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-C
- スクリーンショット上の位置: x=208.0, y=11467.1, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-03-C`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死と即時の報復
- スクリーンショット上の位置: x=208.0, y=11504.3, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-03-C`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死と即時の報復
- スクリーンショット上の位置: x=208.0, y=11504.3, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 止めようとした
- スクリーンショット上の位置: x=208.0, y=11554.3, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 止めようとした
- スクリーンショット上の位置: x=208.0, y=11554.3, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=327.0, y=11554.3, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=327.0, y=11554.3, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の手が、報復へ変わる。
- スクリーンショット上の位置: x=378.0, y=11554.3, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の手が、報復へ変わる。
- スクリーンショット上の位置: x=378.0, y=11554.3, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=208.0, y=11747.6, w=118.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=208.0, y=11747.6, w=118.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=11777.2, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=11777.2, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(2) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 両家とも、疫病に呑まれろ。
- スクリーンショット上の位置: x=368.0, y=11747.6, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 両家とも、疫病に呑まれろ。
- スクリーンショット上の位置: x=368.0, y=11747.6, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=11966.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=11995.8, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=368.0, y=11966.2, w=84.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(5) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、おまえか私か、どちらかがあいつと行く。
- スクリーンショット上の位置: x=452.5, y=11966.2, w=340.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=12543.9, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 負傷の一打から空白、即時の報復に短い拍。
- スクリーンショット上の位置: x=360.0, y=12543.9, w=748.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=12590.5, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 制止→負傷→報復→空白を明確に。死は身体
- スクリーンショット上の位置: x=360.0, y=12590.5, w=492.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=12637.1, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 武器はこの後の焦点移動で袖へ収める。
- スクリーンショット上の位置: x=360.0, y=12637.1, w=306.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=208.0, y=12683.7, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=320.0, y=12683.7, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が戻って止めに入り、その腕の下から
- スクリーンショット上の位置: x=362.0, y=12683.7, w=237.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=599.6, y=12683.7, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の刃が
- スクリーンショット上の位置: x=669.2, y=12683.7, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=711.2, y=12683.7, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: に届く。
- スクリーンショット上の位置: x=808.6, y=12683.7, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=12708.9, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は傷を見た瞬間に報復する。
- スクリーンショット上の位置: x=250.0, y=12708.9, w=182.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=432.0, y=12708.9, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が倒れ、
- スクリーンショット上の位置: x=501.6, y=12708.9, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=557.6, y=12708.9, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(6) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: も力を失う。
- スクリーンショット上の位置: x=655.0, y=12708.9, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人が倒れる
- スクリーンショット上の位置: x=208.0, y=14699.4, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 舞台上 4名：
- スクリーンショット上の位置: x=208.0, y=14724.6, w=83.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=291.9, y=14724.6, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=389.4, y=14724.6, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=403.4, y=14724.6, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=500.7, y=14724.6, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=514.7, y=14724.6, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=556.7, y=14724.6, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=570.7, y=14724.6, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この瞬間は袖：
- スクリーンショット上の位置: x=208.0, y=14749.8, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=306.0, y=14749.8, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=388.8, y=14749.8, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=402.8, y=14749.8, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=499.4, y=14749.8, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(7)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=513.4, y=14749.8, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=541.4, y=14749.8, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(8)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=555.4, y=14749.8, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=653.4, y=14749.8, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(9)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=667.4, y=14749.8, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=751.4, y=14749.8, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `figure:nth-of-type(3) > figcaption:nth-of-type(1) > span:nth-of-type(10)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジョン修道士
- スクリーンショット上の位置: x=765.4, y=14749.8, w=83.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q11 · 仮の経過 13:00–15:
- スクリーンショット上の位置: x=208.0, y=12607.9, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-03-D
- スクリーンショット上の位置: x=208.0, y=12633.1, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-03-D`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 追放から夜明けへ
- スクリーンショット上の位置: x=208.0, y=12670.3, w=176.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 追放の意味を、妻のそばに残れば死ぬという
- スクリーンショット上の位置: x=208.0, y=12720.3, w=458.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=208.0, y=12913.7, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=12943.3, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 大公の裁きが出た。
- スクリーンショット上の位置: x=368.0, y=12913.7, w=153.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=521.0, y=12913.7, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=572.0, y=12913.7, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ヴェローナ
- スクリーンショット上の位置: x=589.0, y=12913.7, w=84.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: から追放だ。
- スクリーンショット上の位置: x=673.2, y=12913.7, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=13161.0, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=13190.6, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: もう行ってしまうの？ まだ夜明けには早い
- スクリーンショット上の位置: x=368.0, y=13161.0, w=728.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=13326.0, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=13355.6, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 朝よ。行って。あの鳥の声が、私たちを引き
- スクリーンショット上の位置: x=368.0, y=13326.0, w=439.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(4) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=13405.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(4) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=13435.4, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(4) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 光が増すほど、私たちの悲しみは暗くなる。
- スクリーンショット上の位置: x=368.0, y=13405.8, w=340.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=13624.3, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=13653.9, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 窓よ、朝を入れて。代わりに、私の命を外へ
- スクリーンショット上の位置: x=368.0, y=13624.3, w=404.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=13704.1, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=13733.7, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: さらば。最後に口づけを。それから降りる。
- スクリーンショット上の位置: x=368.0, y=13704.1, w=340.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(3) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=13783.9, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(3) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=13813.5, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(3) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: また会えると思う？
- スクリーンショット上の位置: x=368.0, y=13783.9, w=152.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(4) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=13863.7, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(4) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=13893.3, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(4) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(6) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: きっと会える。今日の悲しみも、いつか昔話
- スクリーンショット上の位置: x=368.0, y=13863.7, w=407.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=14053.5, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=14083.0, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 嫌な予感がする。今のあなたが、墓の底にい
- スクリーンショット上の位置: x=368.0, y=14053.5, w=509.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > p:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 次へ進む合図
- スクリーンショット上の位置: x=227.0, y=14145.2, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=227.0, y=14175.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が見えなくなった後、右の
- スクリーンショット上の位置: x=278.0, y=14175.8, w=204.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=482.0, y=14175.8, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の背後へ父だけが現れる。
- スクリーンショット上の位置: x=582.5, y=14175.8, w=204.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明・音楽・小道具の案
- スクリーンショット上の位置: x=226.0, y=14251.4, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明案
- スクリーンショット上の位置: x=208.0, y=14307.0, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 裁き→夜の右手前→夜明けの順。明るくなる
- スクリーンショット上の位置: x=360.0, y=14307.0, w=476.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=14353.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=14353.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M04の余韻を消しM03へ。朝を告げる短
- スクリーンショット上の位置: x=360.0, y=14353.6, w=687.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M04の余韻を消しM03へ。朝を告げる短
- スクリーンショット上の位置: x=360.0, y=14353.6, w=687.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=14400.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=14400.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 再会は支え合う重心、別れは指先から。平舞
- スクリーンショット上の位置: x=360.0, y=14400.2, w=578.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 再会は支え合う重心、別れは指先から。平舞
- スクリーンショット上の位置: x=360.0, y=14400.2, w=578.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=14446.8, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=14446.8, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死亡二役の武器と色小物を袖で回収。
- スクリーンショット上の位置: x=360.0, y=14446.8, w=289.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死亡二役の武器と色小物を袖で回収。
- スクリーンショット上の位置: x=360.0, y=14446.8, w=289.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：判決を短い声または群れの
- スクリーンショット上の位置: x=208.0, y=14493.4, w=670.2, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：判決を短い声または群れの
- スクリーンショット上の位置: x=208.0, y=14493.4, w=670.2, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 構成図と10名の居場所（2図）
- スクリーンショット上の位置: x=226.0, y=14311.0, w=237.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 一夜を過ごした二人の別れ
- スクリーンショット上の位置: x=208.0, y=15763.7, w=168.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 舞台上 2名：
- スクリーンショット上の位置: x=208.0, y=15788.9, w=83.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=291.9, y=15788.9, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=333.9, y=15788.9, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=347.9, y=15788.9, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この瞬間は袖：
- スクリーンショット上の位置: x=208.0, y=15814.1, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=306.0, y=15814.1, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=402.6, y=15814.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=416.6, y=15814.1, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=513.9, y=15814.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=527.9, y=15814.1, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=597.5, y=15814.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=611.5, y=15814.1, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=709.0, y=15814.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(7)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=723.0, y=15814.1, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=751.0, y=15814.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(8)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=765.0, y=15814.1, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=863.0, y=15814.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(9)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=877.0, y=15814.1, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=961.0, y=15814.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(10)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジョン修道士
- スクリーンショット上の位置: x=975.0, y=15814.1, w=83.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q12 · 仮の経過 15:30–16:
- スクリーンショット上の位置: x=208.0, y=14417.6, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q12 · 仮の経過 15:30–16:
- スクリーンショット上の位置: x=208.0, y=14417.6, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-A
- スクリーンショット上の位置: x=208.0, y=14442.8, w=104.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-A
- スクリーンショット上の位置: x=208.0, y=14442.8, w=104.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-04-A`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人だけの圧力
- スクリーンショット上の位置: x=208.0, y=14480.0, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-04-A`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人だけの圧力
- スクリーンショット上の位置: x=208.0, y=14480.0, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img figure:nth-of-type(3) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 娘の意思が聞かれない家を、二人だけの距離
- スクリーンショット上の位置: x=208.0, y=14530.0, w=406.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 娘の意思が聞かれない家を、二人だけの距離
- スクリーンショット上の位置: x=208.0, y=14530.0, w=406.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=14723.4, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=14753.0, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 結婚相手を選んでくれたことには感謝します
- スクリーンショット上の位置: x=368.0, y=14723.4, w=353.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: でも、望まない結婚を喜ぶことはできません
- スクリーンショット上の位置: x=368.0, y=14754.0, w=357.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=208.0, y=14808.5, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=14838.1, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 何だ、その理屈は。感謝するだの、誇れない
- スクリーンショット上の位置: x=368.0, y=14808.5, w=391.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 木曜日にはパリスと教会へ行け。
- スクリーンショット上の位置: x=368.0, y=14839.1, w=253.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 嫌なら、引きずってでも連れていく。
- スクリーンショット上の位置: x=368.0, y=14869.7, w=286.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=208.0, y=15148.3, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=15177.9, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この聞き分けのない、親不孝者め！
- スクリーンショット上の位置: x=368.0, y=15148.3, w=272.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 木曜に教会へ行くか、二度と私の前に顔を出
- スクリーンショット上の位置: x=368.0, y=15178.9, w=391.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 口を開くな。言い返すな。
- スクリーンショット上の位置: x=368.0, y=15209.5, w=204.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > p:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 次へ進む合図
- スクリーンショット上の位置: x=227.0, y=15414.9, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=227.0, y=15445.5, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が父と反対の中央へ一歩を出し、助けを求め
- スクリーンショット上の位置: x=327.5, y=15445.5, w=425.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明・音楽・小道具の案
- スクリーンショット上の位置: x=226.0, y=15521.0, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明案
- スクリーンショット上の位置: x=208.0, y=15576.6, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 客席右の家の領域のみ。父を大きな影にする
- スクリーンショット上の位置: x=360.0, y=15576.6, w=476.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=15623.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=15623.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音を薄くし、足音と台詞の圧力を使う。父の
- スクリーンショット上の位置: x=360.0, y=15623.2, w=531.4, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音を薄くし、足音と台詞の圧力を使う。父の
- スクリーンショット上の位置: x=360.0, y=15623.2, w=531.4, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=15669.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=15669.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 父の直線と娘の逃げ道。人数を増やして圧力
- スクリーンショット上の位置: x=360.0, y=15669.8, w=458.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 父の直線と娘の逃げ道。人数を増やして圧力
- スクリーンショット上の位置: x=360.0, y=15669.8, w=458.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=15716.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=15716.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: パリスの人物を追加しない。名前は台詞で伝
- スクリーンショット上の位置: x=360.0, y=15716.4, w=390.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: パリスの人物を追加しない。名前は台詞で伝
- スクリーンショット上の位置: x=360.0, y=15716.4, w=390.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=208.0, y=15763.0, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=320.0, y=15763.0, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: と
- スクリーンショット上の位置: x=402.8, y=15763.0, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=416.8, y=15763.0, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の二人だけ。客席右の
- スクリーンショット上の位置: x=514.8, y=15763.0, w=139.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=654.1, y=15763.0, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 側で、望まない結婚を迫る。
- スクリーンショット上の位置: x=208.0, y=15763.0, w=669.4, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(8) > details:nth-of-type(2) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 構成図と10名の居場所（1図）
- スクリーンショット上の位置: x=226.0, y=15580.6, w=237.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q13 · 仮の経過 16:45–18:
- スクリーンショット上の位置: x=208.0, y=15687.2, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q13 · 仮の経過 16:45–18:
- スクリーンショット上の位置: x=208.0, y=15687.2, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(7) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-B
- スクリーンショット上の位置: x=208.0, y=15712.4, w=103.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-B
- スクリーンショット上の位置: x=208.0, y=15712.4, w=103.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-04-B`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 薬と計画
- スクリーンショット上の位置: x=208.0, y=15749.6, w=88.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 死に見える眠りと、それを知らせる手紙とい
- スクリーンショット上の位置: x=208.0, y=15799.6, w=558.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=208.0, y=15993.0, w=117.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=16022.6, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: その借り物の死の姿は、四十二時間続く。
- スクリーンショット上の位置: x=368.0, y=15993.0, w=323.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: それから、心地よい眠りから覚めるように目
- スクリーンショット上の位置: x=368.0, y=16023.6, w=423.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 朝、花婿が迎えに来たとき、皆はおまえが死
- スクリーンショット上の位置: x=368.0, y=16054.2, w=442.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 晴れ着のまま、覆いもかけず棺台に乗せられ
- スクリーンショット上の位置: x=368.0, y=16084.8, w=357.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=368.0, y=16115.4, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 家の眠る古い墓所へ運ばれるだろう。
- スクリーンショット上の位置: x=487.0, y=16115.4, w=289.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: それまでに、
- スクリーンショット上の位置: x=368.0, y=16146.0, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=470.0, y=16146.0, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: には手紙で計画を知らせる。
- スクリーンショット上の位置: x=521.0, y=16146.0, w=220.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 私と
- スクリーンショット上の位置: x=368.0, y=16176.5, w=34.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=402.0, y=16176.5, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: で目覚めを待ち、その夜、彼が
- スクリーンショット上の位置: x=453.0, y=16176.5, w=238.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `p:nth-of-type(2) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マントヴァ
- スクリーンショット上の位置: x=691.0, y=16176.5, w=84.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: へ連れ出す。
- スクリーンショット上の位置: x=775.5, y=16176.5, w=100.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: これで今の苦境から抜け出せる。
- スクリーンショット上の位置: x=368.0, y=16207.1, w=253.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(8) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ただし、気まぐれや恐れに、決意をくじかれ
- スクリーンショット上の位置: x=368.0, y=16237.7, w=441.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=17059.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M05。『手紙』にだけ小さな反復音を添え
- スクリーンショット上の位置: x=360.0, y=17059.8, w=510.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=17106.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 結婚で重ねた手が、瓶を渡す手に変わる。ロ
- スクリーンショット上の位置: x=360.0, y=17106.4, w=659.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=17153.0, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 仮死の小瓶→
- スクリーンショット上の位置: x=360.0, y=17153.0, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=462.0, y=17153.0, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 。封書→ジョン。低い腰掛けを右に準備。
- スクリーンショット上の位置: x=562.5, y=17153.0, w=321.1, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：中央の
- スクリーンショット上の位置: x=208.0, y=17199.6, w=154.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=362.0, y=17199.6, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が仮死の薬と手紙の段取りを示す。
- スクリーンショット上の位置: x=458.6, y=17199.6, w=222.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=681.2, y=17199.6, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(9) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は追放先にいて不在。
- スクリーンショット上の位置: x=723.2, y=17199.6, w=139.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q14 · 仮の経過 18:30–20:
- スクリーンショット上の位置: x=208.0, y=17123.8, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-C
- スクリーンショット上の位置: x=208.0, y=17149.0, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-04-C`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 仮死と葬送
- スクリーンショット上の位置: x=208.0, y=17186.2, w=110.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 本人の決意が、家族と
- スクリーンショット上の位置: x=208.0, y=17236.2, w=170.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=378.0, y=17236.2, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: には死として見える。
- スクリーンショット上の位置: x=496.2, y=17236.2, w=168.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=17429.6, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=17459.2, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: さようなら。次にいつ会えるかは、神さまだ
- スクリーンショット上の位置: x=368.0, y=17429.6, w=475.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 冷たい恐れが、血の中を駆け上がってくる。
- スクリーンショット上の位置: x=368.0, y=17460.2, w=338.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 命のぬくもりまで、凍りつきそう。
- スクリーンショット上の位置: x=368.0, y=17490.8, w=270.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 呼び戻そうか。
- スクリーンショット上の位置: x=368.0, y=17521.3, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: そばにいてもらえば、落ち着ける。
- スクリーンショット上の位置: x=368.0, y=17551.9, w=270.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=368.0, y=17582.5, w=34.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ！――でも、ここにいて何ができるの？
- スクリーンショット上の位置: x=402.0, y=17582.5, w=305.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この悲しい場面は、私一人で演じなくては。
- スクリーンショット上の位置: x=368.0, y=17613.1, w=340.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: さあ、この小瓶を。
- スクリーンショット上の位置: x=368.0, y=17643.7, w=153.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=17698.3, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=368.0, y=17698.3, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=419.0, y=17698.3, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=436.0, y=17698.3, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=487.0, y=17698.3, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > p:nth-of-type(2) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=504.0, y=17698.3, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 。あなたのために、飲みます。
- スクリーンショット上の位置: x=555.0, y=17698.3, w=236.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=208.0, y=18055.7, w=34.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 補筆案
- スクリーンショット上の位置: x=208.0, y=18085.2, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: お嬢さま。……
- スクリーンショット上の位置: x=368.0, y=18055.7, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=487.0, y=18055.7, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(9) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ？
- スクリーンショット上の位置: x=587.5, y=18055.7, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=18721.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M05。宴の拍を遅くした形を使い、発見で
- スクリーンショット上の位置: x=360.0, y=18721.6, w=616.4, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=18768.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 本人には再会への策、家族には死。葬送は支
- スクリーンショット上の位置: x=360.0, y=18768.2, w=473.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=18814.8, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小瓶を
- スクリーンショット上の位置: x=360.0, y=18814.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=411.0, y=18814.8, w=34.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が回収。腰掛けは旅路の焦点外で左へ移す。
- スクリーンショット上の位置: x=445.0, y=18814.8, w=338.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=208.0, y=18861.3, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=320.0, y=18861.3, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が薬を飲んで仮死状態になる。祝いへ向かう
- スクリーンショット上の位置: x=208.0, y=18861.3, w=669.8, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 葬送を見かける
- スクリーンショット上の位置: x=208.0, y=20131.7, w=97.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 舞台上 4名：
- スクリーンショット上の位置: x=208.0, y=20156.9, w=83.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=291.9, y=20156.9, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=374.7, y=20156.9, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=388.7, y=20156.9, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=416.7, y=20156.9, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=430.7, y=20156.9, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=528.7, y=20156.9, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=542.7, y=20156.9, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この瞬間は袖：
- スクリーンショット上の位置: x=208.0, y=20182.1, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=306.0, y=20182.1, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=348.0, y=20182.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=362.0, y=20182.1, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=458.6, y=20182.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(7)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=472.6, y=20182.1, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=542.2, y=20182.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(8)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=556.2, y=20182.1, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=653.7, y=20182.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(9)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=667.7, y=20182.1, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=751.7, y=20182.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(10)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジョン修道士
- スクリーンショット上の位置: x=765.7, y=20182.1, w=83.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q15 · 仮の経過 20:15–22:
- スクリーンショット上の位置: x=208.0, y=18785.6, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-04-D
- スクリーンショット上の位置: x=208.0, y=18810.8, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-04-D`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 届かない知らせ
- スクリーンショット上の位置: x=208.0, y=18847.9, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 間違った知らせは届き、本当の手紙だけが届
- スクリーンショット上の位置: x=208.0, y=18897.9, w=408.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=208.0, y=19091.3, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存構成稿
- スクリーンショット上の位置: x=208.0, y=19120.9, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=368.0, y=19091.3, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が亡くなった。墓所へ送られるのを見た。
- スクリーンショット上の位置: x=468.5, y=19091.3, w=323.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > p:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 次へ進む合図
- スクリーンショット上の位置: x=227.0, y=19824.6, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 左に戻る
- スクリーンショット上の位置: x=227.0, y=19855.2, w=68.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=295.0, y=19855.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、右へ戻るジョン、中央に集まる六名の三方
- スクリーンショット上の位置: x=346.0, y=19855.2, w=553.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明・音楽・小道具の案
- スクリーンショット上の位置: x=226.0, y=19930.8, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明案
- スクリーンショット上の位置: x=208.0, y=19986.4, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 旅路の動きが見える全体光から、左の墓所と
- スクリーンショット上の位置: x=360.0, y=19986.4, w=543.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=20033.0, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=20033.0, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M06。二つの同形フレーズを半拍ずらす。
- スクリーンショット上の位置: x=360.0, y=20033.0, w=610.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M06。二つの同形フレーズを半拍ずらす。
- スクリーンショット上の位置: x=360.0, y=20033.0, w=610.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=20079.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=20079.6, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 直接相手を追う喜劇ではなく、別の目的で急
- スクリーンショット上の位置: x=360.0, y=20079.6, w=696.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 直接相手を追う喜劇ではなく、別の目的で急
- スクリーンショット上の位置: x=360.0, y=20079.6, w=696.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=20126.2, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 封書は常にジョン。ボールを使う場合は袖か
- スクリーンショット上の位置: x=360.0, y=20126.2, w=539.9, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=899.9, y=20126.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は再登場までに墓所の杯を受け取る。
- スクリーンショット上の位置: x=360.0, y=20126.2, w=845.9, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：手紙を届ける人と
- スクリーンショット上の位置: x=208.0, y=20203.4, w=223.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=431.6, y=20203.4, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が入れ違う。追いかけっこの感触を、ジャグ
- スクリーンショット上の位置: x=208.0, y=20203.4, w=671.2, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(10) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 構成図と10名の居場所（2図）
- スクリーンショット上の位置: x=226.0, y=19990.4, w=237.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この瞬間は袖：
- スクリーンショット上の位置: x=208.0, y=21493.5, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=306.0, y=21493.5, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=388.8, y=21493.5, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=402.8, y=21493.5, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=499.4, y=21493.5, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=513.4, y=21493.5, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=610.7, y=21493.5, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=624.7, y=21493.5, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=694.3, y=21493.5, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(7)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=708.3, y=21493.5, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=805.7, y=21493.5, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(8)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=819.7, y=21493.5, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=847.7, y=21493.5, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(9)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=861.7, y=21493.5, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=959.7, y=21493.5, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(10)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=973.7, y=21493.5, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 第3場面 · 仮尺 06:35
- スクリーンショット上の位置: x=208.0, y=20115.0, w=136.7, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > header:nth-of-type(1) > h2:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 墓所、二人の死、残された和解
- スクリーンショット上の位置: x=208.0, y=20153.2, w=364.0, h=26.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 再会の時間が合わず二人は死ぬ。その不在を
- スクリーンショット上の位置: x=208.0, y=20208.2, w=730.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q16 · 仮の経過 22:30–24:
- スクリーンショット上の位置: x=208.0, y=20306.8, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-A
- スクリーンショット上の位置: x=208.0, y=20332.0, w=104.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-05-A`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 同時にある二つの場所
- スクリーンショット上の位置: x=208.0, y=20369.1, w=220.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二つの場所で起こることが、見えていても互
- スクリーンショット上の位置: x=208.0, y=20419.1, w=457.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジョン修道士
- スクリーンショット上の位置: x=208.0, y=20890.1, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 補筆案
- スクリーンショット上の位置: x=208.0, y=20919.7, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 会えませんでした。私が着いた時には、もう
- スクリーンショット上の位置: x=368.0, y=20890.1, w=440.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=208.0, y=20969.9, w=117.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 補筆案
- スクリーンショット上の位置: x=208.0, y=20999.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 手紙を読まずに……。目覚める時刻だ。墓所
- スクリーンショット上の位置: x=368.0, y=20969.9, w=442.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=208.0, y=21188.4, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(1) > small:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 補筆案
- スクリーンショット上の位置: x=208.0, y=21218.0, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=368.0, y=21188.4, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 。君を置いて、もうどこへも行かない。
- スクリーンショット上の位置: x=468.5, y=21188.4, w=303.1, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > p:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 次へ進む合図
- スクリーンショット上の位置: x=227.0, y=21280.2, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 右でロレンスが急ごうとするのと同時に、左
- スクリーンショット上の位置: x=227.0, y=21310.8, w=355.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=582.3, y=21310.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が杯を持つ。二つの動きは届かない。
- スクリーンショット上の位置: x=633.3, y=21310.8, w=289.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(11) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明・音楽・小道具の案
- スクリーンショット上の位置: x=226.0, y=21386.4, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=21519.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M06の反復を低く。川の呼吸を土台にし、
- スクリーンショット上の位置: x=360.0, y=21519.2, w=514.4, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=21565.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 川は人を押し返す壁ではない。左右は物語上
- スクリーンショット上の位置: x=360.0, y=21565.8, w=595.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=21612.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 封書はロレンスへ戻る。左の杯は毒、
- スクリーンショット上の位置: x=360.0, y=21612.4, w=287.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=647.3, y=21612.4, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の小瓶は既に袖。
- スクリーンショット上の位置: x=747.8, y=21612.4, w=136.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：舞台左に墓所、右に別の場
- スクリーンショット上の位置: x=208.0, y=21659.0, w=670.8, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q17 · 仮の経過 24:10–26:
- スクリーンショット上の位置: x=208.0, y=21552.6, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-B
- スクリーンショット上の位置: x=208.0, y=21577.8, w=103.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-05-B`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 時間のすれ違い
- スクリーンショット上の位置: x=208.0, y=21615.0, w=154.0, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ほんの少しの時間差で、会えたはずの二人が
- スクリーンショット上の位置: x=208.0, y=21665.0, w=423.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=208.0, y=22107.1, w=100.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(1) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 何、この杯。愛しい人の手に……。
- スクリーンショット上の位置: x=368.0, y=22107.1, w=272.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=22918.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=360.0, y=22918.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の杯で一方の反復が消える。目覚めは無音寄
- スクリーンショット上の位置: x=411.0, y=22918.2, w=373.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > dd:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=784.5, y=22918.2, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の死で最後の反復も止まる。
- スクリーンショット上の位置: x=885.0, y=22918.2, w=221.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=22964.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 同時に倒れない。
- スクリーンショット上の位置: x=360.0, y=22964.8, w=136.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=496.0, y=22964.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の静止→二つの波→目覚め→認識→
- スクリーンショット上の位置: x=547.0, y=22964.8, w=272.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(3) > dd:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=819.0, y=22964.8, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の死の順。
- スクリーンショット上の位置: x=919.5, y=22964.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=23011.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 杯と短剣は死を識別する記号。血や写実的な
- スクリーンショット上の位置: x=360.0, y=23011.4, w=476.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=208.0, y=23058.0, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=320.0, y=23058.0, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が
- スクリーンショット上の位置: x=362.0, y=23058.0, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=376.0, y=23058.0, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の目覚め前に死ぬ。
- スクリーンショット上の位置: x=458.8, y=23058.0, w=126.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=584.8, y=23058.0, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が目覚め、
- スクリーンショット上の位置: x=667.5, y=23058.0, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=737.5, y=23058.0, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の死を知って後を追う。
- スクリーンショット上の位置: x=208.0, y=23058.0, w=669.1, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人の死
- スクリーンショット上の位置: x=208.0, y=24322.9, w=56.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 舞台上 10名：
- スクリーンショット上の位置: x=208.0, y=24348.1, w=93.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=301.1, y=24348.1, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=343.1, y=24348.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=357.1, y=24348.1, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=439.8, y=24348.1, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=453.8, y=24348.1, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 担当〈群〉、
- スクリーンショット上の位置: x=551.1, y=24348.1, w=77.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=628.1, y=24348.1, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 担当〈群〉、
- スクリーンショット上の位置: x=697.7, y=24348.1, w=77.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=774.7, y=24348.1, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 担当〈群〉、
- スクリーンショット上の位置: x=872.2, y=24348.1, w=77.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=949.2, y=24348.1, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 担当〈群〉、
- スクリーンショット上の位置: x=977.2, y=24348.1, w=77.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(7)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=1054.2, y=24348.1, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 担当〈群〉、
- スクリーンショット上の位置: x=1152.2, y=24348.1, w=77.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(8)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=208.0, y=24373.3, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 担当〈群〉、
- スクリーンショット上の位置: x=292.0, y=24373.3, w=77.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(9)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=369.0, y=24373.3, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、
- スクリーンショット上の位置: x=465.6, y=24373.3, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1) > span:nth-of-type(10)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジョン修道士
- スクリーンショット上の位置: x=479.6, y=24373.3, w=83.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > figcaption:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: この瞬間は袖：なし
- スクリーンショット上の位置: x=208.0, y=24398.5, w=126.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q18 · 仮の経過 26:20–27:
- スクリーンショット上の位置: x=208.0, y=22951.6, w=243.1, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-C
- スクリーンショット上の位置: x=208.0, y=22976.8, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-05-C`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 川がほどける
- スクリーンショット上の位置: x=208.0, y=23014.0, w=131.3, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 隔てていた身体が、自分の意思で境界をやめ
- スクリーンショット上の位置: x=208.0, y=23064.0, w=374.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > p:nth-of-type(1) > strong:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 次へ進む合図
- スクリーンショット上の位置: x=227.0, y=23656.9, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 中央のロレンスが静まり、最初の一人である
- スクリーンショット上の位置: x=227.0, y=23687.5, w=338.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=565.3, y=23687.5, w=34.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が袖から近づく。
- スクリーンショット上の位置: x=599.3, y=23687.5, w=136.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明・音楽・小道具の案
- スクリーンショット上の位置: x=226.0, y=23763.1, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明案
- スクリーンショット上の位置: x=208.0, y=23818.7, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(1) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 中央の境界を消し、中央のロレンスと左の二
- スクリーンショット上の位置: x=360.0, y=23818.7, w=557.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=23865.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=23865.2, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M07。川の足音が止まり、無音の間を残す
- スクリーンショット上の位置: x=360.0, y=23865.2, w=342.7, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M07。川の足音が止まり、無音の間を残す
- スクリーンショット上の位置: x=360.0, y=23865.2, w=342.7, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=23911.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=23911.8, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 境界を人が解く。誰かが川を突破して解決す
- スクリーンショット上の位置: x=360.0, y=23911.8, w=492.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 境界を人が解く。誰かが川を突破して解決す
- スクリーンショット上の位置: x=360.0, y=23911.8, w=492.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=23958.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=23958.4, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 両父親の赤青小物を戻す時間を確保。左の二
- スクリーンショット上の位置: x=360.0, y=23958.4, w=527.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 両父親の赤青小物を戻す時間を確保。左の二
- スクリーンショット上の位置: x=360.0, y=23958.4, w=527.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：二人の死の後、人の川が止
- スクリーンショット上の位置: x=208.0, y=24005.0, w=601.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：二人の死の後、人の川が止
- スクリーンショット上の位置: x=208.0, y=24005.0, w=601.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 構成図と10名の居場所（1図）
- スクリーンショット上の位置: x=226.0, y=23822.7, w=237.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q19 · 仮の経過 27:05–29:
- スクリーンショット上の位置: x=208.0, y=23929.2, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: Q19 · 仮の経過 27:05–29:
- スクリーンショット上の位置: x=208.0, y=23929.2, w=243.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-D
- スクリーンショット上の位置: x=208.0, y=23954.4, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: RJ-COND-05-D
- スクリーンショット上の位置: x=208.0, y=23954.4, w=104.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-05-D`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンスを中心に集まる
- スクリーンショット上の位置: x=208.0, y=23991.6, w=241.1, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#h-RJ-COND-05-D`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンスを中心に集まる
- スクリーンショット上の位置: x=208.0, y=23991.6, w=241.1, h=22.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img article:nth-of-type(2) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 悲しみが一人ずつ中央へ人を引き寄せ、真相
- スクリーンショット上の位置: x=208.0, y=24041.6, w=594.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > header:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 悲しみが一人ずつ中央へ人を引き寄せ、真相
- スクリーンショット上の位置: x=208.0, y=24041.6, w=594.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=208.0, y=24512.6, w=117.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `article:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > p:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(3) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人は、私の前で夫婦になりました。
- スクリーンショット上の位置: x=368.0, y=24512.6, w=289.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽・音案
- スクリーンショット上の位置: x=208.0, y=25603.4, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(2) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 集合の途中は足音と呼吸。父親の手が重なっ
- スクリーンショット上の位置: x=360.0, y=25603.4, w=789.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 身体表現案
- スクリーンショット上の位置: x=208.0, y=25650.0, w=85.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(3) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 一人ずつ集まる。真相→沈黙→相手の子を見
- スクリーンショット上の位置: x=360.0, y=25650.0, w=711.8, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dt:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具・兼任
- スクリーンショット上の位置: x=208.0, y=25696.6, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > dl:nth-of-type(1) > div:nth-of-type(4) > dd:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 戻った手紙をロレンスが保持。左の杯・短剣
- スクリーンショット上の位置: x=360.0, y=25696.6, w=559.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 土台にした演出：
- スクリーンショット上の位置: x=208.0, y=25743.2, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=320.0, y=25743.2, w=96.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を中央に置く。悲しみの中で一人ずつ人が集
- スクリーンショット上の位置: x=208.0, y=25743.2, w=670.6, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > h2:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 制作メモ
- スクリーンショット上の位置: x=208.0, y=25651.8, w=104.0, h=26.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 左右は客席から見た方向。家を表すときは左
- スクリーンショット上の位置: x=208.0, y=25706.8, w=356.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=564.5, y=25706.8, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 、右が
- スクリーンショット上の位置: x=666.5, y=25706.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=717.5, y=25706.8, w=119.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 。街路・旅路は両家の陣地に分けず、終幕は
- スクリーンショット上の位置: x=208.0, y=25706.8, w=815.5, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽は選曲・制作前の方向性。曲名・録音・
- スクリーンショット上の位置: x=248.0, y=25785.0, w=968.5, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 照明の基本は全体、中央、右手前、左墓所、
- スクリーンショット上の位置: x=248.0, y=25858.2, w=968.5, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: バーは舞台奥の中立色のカウンターと背面棚
- スクリーンショット上の位置: x=248.0, y=25931.4, w=968.2, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 舞踏会では10名全員が仮面を着ける。窓辺
- スクリーンショット上の位置: x=248.0, y=26004.5, w=973.0, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 10名の担当役は固定、空いている時だけ匿
- スクリーンショット上の位置: x=248.0, y=26077.7, w=530.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(5) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=778.6, y=26077.7, w=84.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: と
- スクリーンショット上の位置: x=863.1, y=26077.7, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(5) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=880.1, y=26077.7, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は死後いったん袖へ出てから群衆に戻る。死
- スクリーンショット上の位置: x=248.0, y=26077.7, w=971.5, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(6)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(1) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 実際の殺陣、接触、倒れ方、身体の支持、器
- スクリーンショット上の位置: x=248.0, y=26150.9, w=983.3, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(8)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存の構成図は各キュー内の瞬間。画像の人
- スクリーンショット上の位置: x=248.0, y=26297.3, w=967.3, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 音楽を通してつなぐ7つのモチーフ
- スクリーンショット上の位置: x=226.0, y=26384.5, w=262.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(1) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M01 街の拍
- スクリーンショット上の位置: x=220.0, y=26434.1, w=80.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(1) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乾いた足音と低い打音。四隅は少しずれたリ
- スクリーンショット上の位置: x=527.2, y=26434.1, w=461.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(2) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M02 室内の宴
- スクリーンショット上の位置: x=220.0, y=26484.3, w=94.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(2) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M01の拍を柔らかな低音と擦弦へ移す。円
- スクリーンショット上の位置: x=527.2, y=26484.3, w=688.2, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M03 二人の旋律
- スクリーンショット上の位置: x=220.0, y=26534.5, w=108.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 宴の二音を間隔の広い独奏へ。窓辺、結婚、
- スクリーンショット上の位置: x=527.2, y=26534.5, w=475.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M04 争いの再来
- スクリーンショット上の位置: x=220.0, y=26584.6, w=108.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M01の拍が詰まり、呼吸を追い越す。負傷
- スクリーンショット上の位置: x=527.2, y=26584.6, w=618.2, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(5) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M05 決意と仮死
- スクリーンショット上の位置: x=220.0, y=26634.8, w=108.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(5) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 低い持続音。瓶を受け取る時だけ二音の一方
- スクリーンショット上の位置: x=527.2, y=26634.8, w=684.2, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M06 届かない時間
- スクリーンショット上の位置: x=220.0, y=26685.0, w=122.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二つの短い音型が同じ形を時間差で繰り返す
- スクリーンショット上の位置: x=527.2, y=26685.0, w=670.0, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: M07 残る呼吸
- スクリーンショット上の位置: x=220.0, y=26760.4, w=94.4, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 二人の死で反復を止める。最後の集合は足音
- スクリーンショット上の位置: x=527.2, y=26760.4, w=671.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `section:nth-of-type(1) > details:nth-of-type(2) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 小道具と大道具の出入り
- スクリーンショット上の位置: x=226.0, y=26444.1, w=187.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(1) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 仮面10枚
- スクリーンショット上の位置: x=220.0, y=26493.7, w=61.9, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(1) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 冒頭の暗転で着用→宴・家名で全員着用→宴
- スクリーンショット上の位置: x=527.2, y=26493.7, w=685.2, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(2) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: バー・カウンターと背面棚
- スクリーンショット上の位置: x=220.0, y=26569.0, w=167.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(2) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 開演前は奥で待機→冒頭暗転・宴の立上がり
- スクリーンショット上の位置: x=527.2, y=26569.0, w=671.2, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 殺陣用の剣の表現
- スクリーンショット上の位置: x=220.0, y=26644.4, w=112.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 冒頭はベンと
- スクリーンショット上の位置: x=527.2, y=26644.4, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(3) > td:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=611.2, y=26644.4, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: →宴までに袖へ→決闘で
- スクリーンショット上の位置: x=680.8, y=26644.4, w=154.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(3) > td:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=834.8, y=26644.4, w=69.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ・
- スクリーンショット上の位置: x=904.4, y=26644.4, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(3) > td:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=918.4, y=26644.4, w=97.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ・
- スクリーンショット上の位置: x=1015.8, y=26644.4, w=14.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `td:nth-of-type(1) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=1029.8, y=26644.4, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: →死亡場面後に担当者と袖へ。終幕の短剣と
- スクリーンショット上の位置: x=527.2, y=26644.4, w=684.6, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=220.0, y=26719.8, w=83.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の仮死の小瓶
- スクリーンショット上の位置: x=303.0, y=26719.8, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンスが示す→
- スクリーンショット上の位置: x=527.2, y=26719.8, w=110.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(4) > td:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=637.8, y=26719.8, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が受け取る→一人で飲む演技→身体の脇へ置
- スクリーンショット上の位置: x=720.5, y=26719.8, w=364.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(4) > td:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=1084.5, y=26719.8, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 担当が引き取る。
- スクリーンショット上の位置: x=527.2, y=26719.8, w=669.4, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(4) > td:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=555.2, y=26745.0, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の毒とは別物。
- スクリーンショット上の位置: x=597.2, y=26745.0, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(5) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 封じた手紙1通
- スクリーンショット上の位置: x=220.0, y=26795.2, w=94.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(5) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンスが書いて封をする→ジョンに託す→
- スクリーンショット上の位置: x=527.2, y=26795.2, w=680.8, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(5) > td:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=692.4, y=26820.4, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(5) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: には渡らない。
- スクリーンショット上の位置: x=734.4, y=26820.4, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=220.0, y=26870.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の毒を示す杯
- スクリーンショット上の位置: x=262.0, y=26870.5, w=84.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 墓所への再登場時に
- スクリーンショット上の位置: x=527.2, y=26870.5, w=126.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(6) > td:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=653.2, y=26870.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が持つ。入手過程は上演上省略→
- スクリーンショット上の位置: x=695.2, y=26870.5, w=210.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(6) > td:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=905.2, y=26870.5, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が飲む演技→身体の脇→
- スクリーンショット上の位置: x=947.2, y=26870.5, w=154.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(6) > td:nth-of-type(1) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=1101.2, y=26870.5, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が気づく。仮死の小瓶と混同しない形。
- スクリーンショット上の位置: x=527.2, y=26870.5, w=684.8, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > th:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 終幕の短剣を示す小道具
- スクリーンショット上の位置: x=220.0, y=26945.9, w=154.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > td:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=527.2, y=26945.9, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の衣装側にある記号的な小道具→
- スクリーンショット上の位置: x=569.2, y=26945.9, w=210.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(7) > td:nth-of-type(1) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=779.2, y=26945.9, w=82.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(2) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が気づく→刃の接触を見せず、手の動きと身
- スクリーンショット上の位置: x=527.2, y=26945.9, w=682.8, h=39.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 10名の兼任と役への戻り方
- スクリーンショット上の位置: x=226.0, y=26503.7, w=209.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(1) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=220.0, y=26553.3, w=42.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(1) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 名前のある役を演じていない時は群衆を兼任
- スクリーンショット上の位置: x=527.2, y=26553.3, w=587.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(2) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=220.0, y=26603.5, w=83.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(2) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 名前のある役を演じていない時は群衆を兼任
- スクリーンショット上の位置: x=527.2, y=26603.5, w=587.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(3) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロレンス修道士
- スクリーンショット上の位置: x=220.0, y=26653.6, w=97.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 名前のある役を演じていない時は群衆を兼任
- スクリーンショット上の位置: x=527.2, y=26653.6, w=587.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=220.0, y=26703.8, w=97.3, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(4) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 制止、友人の支え、裁きの伝達、死の知らせ
- スクリーンショット上の位置: x=527.2, y=26703.8, w=559.6, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(5) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ティボルト
- スクリーンショット上の位置: x=220.0, y=26754.0, w=70.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(5) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 決闘で死亡後、袖で役の小物を外す。第3場
- スクリーンショット上の位置: x=527.2, y=26754.0, w=441.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=220.0, y=26804.2, w=97.2, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(6) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 決闘で死亡後、袖で役の小物を外す。第3場
- スクリーンショット上の位置: x=527.2, y=26804.2, w=441.8, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(7) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=220.0, y=26854.4, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 約束・結婚は群衆または袖。名前のある
- スクリーンショット上の位置: x=527.2, y=26854.4, w=252.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > td:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 乳母
- スクリーンショット上の位置: x=779.2, y=26854.4, w=28.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(7) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は仮死の発見・葬送・最後の集合。
- スクリーンショット上の位置: x=807.2, y=26854.4, w=224.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(8) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: キャピュレット
- スクリーンショット上の位置: x=220.0, y=26904.6, w=98.0, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(8) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 名前のある役を演じていない時は群衆を兼任
- スクリーンショット上の位置: x=527.2, y=26904.6, w=587.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `tr:nth-of-type(9) > th:nth-of-type(1) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=220.0, y=26954.8, w=83.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(9) > td:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 名前のある役を演じていない時は群衆を兼任
- スクリーンショット上の位置: x=527.2, y=26954.8, w=587.5, h=14.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > summary:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 原作・既存稿からの省略と脚色
- スクリーンショット上の位置: x=226.0, y=26563.3, w=238.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 第1場面の短い台詞は既存下訳から選ぶが、
- スクリーンショット上の位置: x=248.0, y=26618.9, w=959.3, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(2) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=248.0, y=26692.0, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が追放の裁きを伝え、後にはバルサザーに代
- スクリーンショット上の位置: x=366.2, y=26692.0, w=728.6, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(2) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ベンヴォーリオ
- スクリーンショット上の位置: x=1094.8, y=26692.0, w=118.2, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ではない。既存の構成稿から継承した配役集
- スクリーンショット上の位置: x=248.0, y=26692.0, w=981.9, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 追跡で
- スクリーンショット上の位置: x=248.0, y=26765.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(3) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=299.0, y=26765.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を見失ってから
- スクリーンショット上の位置: x=350.0, y=26765.2, w=118.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(3) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=468.5, y=26765.2, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が現れ、
- スクリーンショット上の位置: x=586.8, y=26765.2, w=68.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(3) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=654.8, y=26765.2, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 介入→負傷→即時報復へ至る順を維持する。
- スクリーンショット上の位置: x=705.8, y=26765.2, w=340.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(3) > span:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: マーキューシオ
- スクリーンショット上の位置: x=1045.8, y=26765.2, w=118.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: は
- スクリーンショット上の位置: x=1164.2, y=26765.2, w=17.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(3) > span:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: モンタギュー
- スクリーンショット上の位置: x=248.0, y=26795.8, w=102.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 家の血縁ではなく
- スクリーンショット上の位置: x=350.0, y=26795.8, w=136.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(3) > span:nth-of-type(6)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=486.0, y=26795.8, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の友人。赤は味方側の視覚上の整理。
- スクリーンショット上の位置: x=537.0, y=26795.8, w=289.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 手紙の不達は使者と
- スクリーンショット上の位置: x=248.0, y=26838.4, w=153.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(4) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=401.0, y=26838.4, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: の入れ違いへ簡略化する。ジョンは
- スクリーンショット上の位置: x=452.0, y=26838.4, w=271.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(4) > span:nth-of-type(2)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=723.5, y=26838.4, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: を見つけられず戻る。薬の計画を聞く場面と
- スクリーンショット上の位置: x=774.5, y=26838.4, w=356.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `li:nth-of-type(4) > span:nth-of-type(3)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ロミオ
- スクリーンショット上の位置: x=1130.8, y=26838.4, w=51.0, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(4)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: が死を信じる場面は別。
- スクリーンショット上の位置: x=248.0, y=26838.4, w=967.8, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 終幕では人の川で隔てた二地点を貫くため、
- スクリーンショット上の位置: x=248.0, y=26911.6, w=797.3, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(5) > span:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: ジュリエット
- スクリーンショット上の位置: x=1045.3, y=26911.6, w=100.5, h=17.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `details:nth-of-type(4) > ul:nth-of-type(1) > li:nth-of-type(5)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: がロレンスへ『行ってください』と言う箇所
- スクリーンショット上の位置: x=248.0, y=26911.6, w=981.1, h=78.2px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `footer:nth-of-type(1) > p:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: このHTMLだけで、台詞・動き・技術案・
- スクリーンショット上の位置: x=208.0, y=26670.9, w=814.0, h=47.6px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `footer:nth-of-type(1) > a:nth-of-type(1)`
- 理由: 背後がラスター画像 (img section:nth-of-type(3) > article:nth-of-type(4) > details:nth-of-type(2) > figure:nth-of-type(2) > img:nth-of-type(1)) で画素色を一意に決められない
- 該当テキスト冒頭20字: 既存の舞台構成図帳へ
- スクリーンショット上の位置: x=208.0, y=26750.8, w=170.0, h=17.0px

## 測定不可の詳細

該当なし。

## 証拠

- [full_390x844.png](./full_390x844.png) — 390×844 全画面
- [gray_390x844.png](./gray_390x844.png) — 390×844 モノクロ化（§12-20）
- [full_1440x900.png](./full_1440x900.png) — 1440×900 全画面
- [gray_1440x900.png](./gray_1440x900.png) — 1440×900 モノクロ化（§12-20）
