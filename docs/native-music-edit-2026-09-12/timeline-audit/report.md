# design-lint レポート — 127.0.0.1/docs/native-music-edit-2026-09-12/preview.html

- URL: http://127.0.0.1:8941/docs/native-music-edit-2026-09-12/preview.html?seam-sample
- 測定時刻: 2026-09-12T20:33:30+09:00
- ビューポート: 1440×1000
- User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36
- Service Worker / キャッシュ: `service_workers="block"` の新規BrowserContextで測定
- 備考: Timeline-only preview; native controls retained unchanged; awaiting sample initialization
- 総合: NG 199件 / WARN 0件 / 測定不可 0件

## 判定サマリ — 1440×1000

| ID | 項目 | 判定 | 実測 | 基準 | 出典 |
|---|---|---|---|---|---|
| C1 | 文字と背景のコントラスト比 | OK | 最悪 3.33:1／実数測定 370件／WARN 0件／無効UI部品 5件は対象外 | 本文 4.5:1以上／大きい文字・UI部品 3:1以上 | §12-16 |
| C2 | 本文の純黒 | OK | 純黒 0件／本文 35件 | 本文に #000000 を使わない | §12-19 |
| C3 | 色だけに頼ったリンク表現 | OK | 手がかりなし 0件／本文中リンク 0件 | 本文中リンクに色以外の手がかり | §12-17 |
| T1 | 行送り | NG | 1.00〜1.80／normal等の数値化不可 0件 | line-height / font-size = 1.5〜2.0 | §12-15 |
| T2 | 行長 | 情報 | 2.0〜75.5字/行（近似）／範囲外 34件 | 1行 30〜50字（全角換算・近似値） | §12-15 |
| T3 | ジャンプ率 | 情報 | 3.14倍（33.0px / 本文 10.5px） | 最大見出し / 本文 ≒ 2倍 | §12-15 |
| T4 | 書体の種類数 | OK | 2種類: Hiragino Kaku Gothic ProN, Hiragino Mincho ProN | 1〜2種類 | §12-18 |
| U1 | タップ対象の大きさ | NG | 44px未満 187件／対象 222件 | 44×44px以上 | §12-21 |
| U2 | ナビゲーション項目数 | 情報 | ナビゲーションなし | 4〜5以内 | §12-24 |
| U3 | アイコンのみボタンの aria-label | OK | 欠落 0件／アイコンのみ 76件 | aria-label 必須 | design-policy「多言語前提のUI表現はアイコン基本」 |
| U4 | ボタンの被覆 | NG | 被覆 5件／ボタン 201件 | 中心点で自分または子要素を取得できる | UI_AUDIT実績 |
| U5 | 同一ラベルの重複 | 情報 | 「add」×2; 「on stage」×8; 「🔓」×19; 「…」×19; 「✕」×20; 「off stage」×7; 「?」×3; 「off」×3; 「note」×2 | 同一画面の重複ラベルを観測 | UI_AUDIT実績 |
| M1 | prefers-reduced-motion 対応 | OK | 通常 22要素/最大150ms → reduce 22要素/最大0ms; 要素別対応 22/22 | 動きがある場合は分岐必須 | A_design §5 |
| E1 | モノクロ化スクリーンショット | 情報 | full.png, gray.png | 人が見て判断する証拠 | §12-20 |

## NG の詳細

### T1 行送り — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > label:nth-of-type(1) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Lights
- スクリーンショット上の位置: x=947.9, y=387.3, w=34.3, h=10.5px

### T1 行送り — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > label:nth-of-type(3) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Seat map
- スクリーンショット上の位置: x=1007.2, y=387.3, w=52.8, h=10.5px

### T1 行送り — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(1) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Lights
- スクリーンショット上の位置: x=935.2, y=891.0, w=34.3, h=10.5px

### T1 行送り — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(2) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Cast routes
- スクリーンショット上の位置: x=994.5, y=891.0, w=65.3, h=10.5px

### T1 行送り — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(3) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Light routes
- スクリーンショット上の位置: x=1084.8, y=891.0, w=68.2, h=10.5px

### T1 行送り — 1440×1000

- セレクタ: `div:nth-of-type(1) > label:nth-of-type(4) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Set routes
- スクリーンショット上の位置: x=1178.0, y=891.0, w=58.5, h=10.5px

### T1 行送り — 1440×1000

- セレクタ: `div:nth-of-type(1) > label:nth-of-type(5) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Flown
- スクリーンショット上の位置: x=1261.5, y=891.0, w=32.0, h=10.5px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-release-open`
- 実測値: 32.0×44.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Update history (new)
- スクリーンショット上の位置: x=416.1, y=93.6, w=32.0, h=44.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-prefs-btn`
- 実測値: 34.0×44.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Settings
- スクリーンショット上の位置: x=1144.6, y=59.8, w=34.0, h=44.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(1) > div:nth-of-type(3)`
- 実測値: 18.0×1179.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Left panel width
- スクリーンショット上の位置: x=336.0, y=174.6, w=18.0, h=1179.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Show
- スクリーンショット上の位置: x=68.0, y=175.6, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(3) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Cast & set
- スクリーンショット上の位置: x=68.0, y=270.6, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-roster-name`
- 実測値: 268.0×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Name
- スクリーンショット上の位置: x=68.0, y=306.6, w=268.0, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-roster-kind`
- 実測値: 217.2×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Performer ▸
- スクリーンショット上の位置: x=68.0, y=349.6, w=217.2, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-roster-add`
- 実測値: 45.8×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add
- スクリーンショット上の位置: x=290.2, y=349.6, w=45.8, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Keeper
- スクリーンショット上の位置: x=96.0, y=419.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=421.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Keeper (it stop
- スクリーンショット上の位置: x=262.0, y=422.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Keeper’s profil
- スクリーンショット上の位置: x=288.0, y=422.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Keeper from t
- スクリーンショット上の位置: x=314.0, y=422.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Spill
- スクリーンショット上の位置: x=96.0, y=451.1, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=453.1, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Spill (it stops
- スクリーンショット上の位置: x=262.0, y=454.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Spill’s profile
- スクリーンショット上の位置: x=288.0, y=454.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Spill from th
- スクリーンショット上の位置: x=314.0, y=454.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Hand A
- スクリーンショット上の位置: x=96.0, y=483.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=485.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Hand A (it stop
- スクリーンショット上の位置: x=262.0, y=486.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Hand A’s profil
- スクリーンショット上の位置: x=288.0, y=486.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Hand A from t
- スクリーンショット上の位置: x=314.0, y=486.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Hand B
- スクリーンショット上の位置: x=96.0, y=515.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=517.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Hand B (it stop
- スクリーンショット上の位置: x=262.0, y=518.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Hand B’s profil
- スクリーンショット上の位置: x=288.0, y=518.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Hand B from t
- スクリーンショット上の位置: x=314.0, y=518.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-model-open`
- 実測値: 80.1×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Build a set
- スクリーンショット上の位置: x=255.9, y=553.1, w=80.1, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — left side
- スクリーンショット上の位置: x=96.0, y=596.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=598.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — left si
- スクリーンショット上の位置: x=262.0, y=599.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=599.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — left 
- スクリーンショット上の位置: x=314.0, y=599.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — right side
- スクリーンショット上の位置: x=96.0, y=628.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=630.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — right s
- スクリーンショット上の位置: x=262.0, y=631.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=631.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — right
- スクリーンショット上の位置: x=314.0, y=631.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — top
- スクリーンショット上の位置: x=96.0, y=660.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=662.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — top (it
- スクリーンショット上の位置: x=262.0, y=663.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=663.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — top f
- スクリーンショット上の位置: x=314.0, y=663.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — bottom
- スクリーンショット上の位置: x=96.0, y=692.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=694.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — bottom 
- スクリーンショット上の位置: x=262.0, y=695.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=695.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — botto
- スクリーンショット上の位置: x=314.0, y=695.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(5) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Cloth A (position ma
- スクリーンショット上の位置: x=96.0, y=724.1, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=726.1, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Cloth A (positi
- スクリーンショット上の位置: x=262.0, y=727.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Clo
- スクリーンショット上の位置: x=288.0, y=727.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Cloth A (posi
- スクリーンショット上の位置: x=314.0, y=727.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(6) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Cloth B (position ma
- スクリーンショット上の位置: x=96.0, y=756.1, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=758.1, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Cloth B (positi
- スクリーンショット上の位置: x=262.0, y=759.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Clo
- スクリーンショット上の位置: x=288.0, y=759.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Cloth B (posi
- スクリーンショット上の位置: x=314.0, y=759.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Archive suitcase
- スクリーンショット上の位置: x=96.0, y=788.1, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=790.1, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Archive suitcas
- スクリーンショット上の位置: x=262.0, y=791.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Arc
- スクリーンショット上の位置: x=288.0, y=791.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Archive suitc
- スクリーンショット上の位置: x=314.0, y=791.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Record ball 1
- スクリーンショット上の位置: x=96.0, y=820.1, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=822.1, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Record ball 1 (
- スクリーンショット上の位置: x=262.0, y=823.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Rec
- スクリーンショット上の位置: x=288.0, y=823.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Record ball 1
- スクリーンショット上の位置: x=314.0, y=823.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Record ball 2
- スクリーンショット上の位置: x=96.0, y=852.1, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=854.1, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Record ball 2 (
- スクリーンショット上の位置: x=262.0, y=855.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Rec
- スクリーンショット上の位置: x=288.0, y=855.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Record ball 2
- スクリーンショット上の位置: x=314.0, y=855.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Record ball 3
- スクリーンショット上の位置: x=96.0, y=884.1, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=886.1, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Record ball 3 (
- スクリーンショット上の位置: x=262.0, y=887.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Rec
- スクリーンショット上の位置: x=288.0, y=887.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Record ball 3
- スクリーンショット上の位置: x=314.0, y=887.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(11) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Blank record sheet (
- スクリーンショット上の位置: x=96.0, y=916.1, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=918.1, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Blank record sh
- スクリーンショット上の位置: x=262.0, y=919.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Bla
- スクリーンショット上の位置: x=288.0, y=919.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Blank record 
- スクリーンショット上の位置: x=314.0, y=919.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(3) > button:nth-of-type(2)`
- 実測値: 18.0×18.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: About Cast & set
- スクリーンショット上の位置: x=296.0, y=280.6, w=18.0, h=18.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Lights
- スクリーンショット上の位置: x=68.0, y=881.1, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-light-name`
- 実測値: 268.0×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Light name
- スクリーンショット上の位置: x=68.0, y=917.1, w=268.0, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-light-kind`
- 実測値: 217.2×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Light type
- スクリーンショット上の位置: x=68.0, y=960.1, w=217.2, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-light-add`
- 実測値: 45.8×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add
- スクリーンショット上の位置: x=290.2, y=960.1, w=45.8, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-light-preset-open`
- 実測値: 268.0×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Build from preset ▸
- スクリーンショット上の位置: x=68.0, y=1007.1, w=268.0, h=38.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 121.9×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: White work light
- スクリーンショット上の位置: x=96.0, y=1122.6, w=121.9, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 36.1×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ON
- スクリーンショット上の位置: x=221.9, y=1124.6, w=36.1, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock White work ligh
- スクリーンショット上の位置: x=262.0, y=1125.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Whi
- スクリーンショット上の位置: x=288.0, y=1125.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove White work li
- スクリーンショット上の位置: x=314.0, y=1125.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 116.7×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Archive pin
- スクリーンショット上の位置: x=96.0, y=1154.6, w=116.7, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 41.3×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: OFF
- スクリーンショット上の位置: x=216.7, y=1156.6, w=41.3, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Archive pin (it
- スクリーンショット上の位置: x=262.0, y=1157.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Arc
- スクリーンショット上の位置: x=288.0, y=1157.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Archive pin f
- スクリーンショット上の位置: x=314.0, y=1157.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 116.7×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Seam side light
- スクリーンショット上の位置: x=96.0, y=1223.1, w=116.7, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 41.3×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: OFF
- スクリーンショット上の位置: x=216.7, y=1225.1, w=41.3, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Seam side light
- スクリーンショット上の位置: x=262.0, y=1226.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Sea
- スクリーンショット上の位置: x=288.0, y=1226.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Seam side lig
- スクリーンショット上の位置: x=314.0, y=1226.1, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 116.7×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Light that includes 
- スクリーンショット上の位置: x=96.0, y=1291.6, w=116.7, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 41.3×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: OFF
- スクリーンショット上の位置: x=216.7, y=1293.6, w=41.3, h=24.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Light that incl
- スクリーンショット上の位置: x=262.0, y=1294.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Lig
- スクリーンショット上の位置: x=288.0, y=1294.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Light that in
- スクリーンショット上の位置: x=314.0, y=1294.6, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(6) > button:nth-of-type(2)`
- 実測値: 18.0×18.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: About Lights
- スクリーンショット上の位置: x=296.0, y=891.1, w=18.0, h=18.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-prev`
- 実測値: 92.6×31.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ◀ Previous
- スクリーンショット上の位置: x=365.0, y=184.1, w=92.6, h=31.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-next`
- 実測値: 69.4×31.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Next ▶
- スクリーンショット上の位置: x=631.1, y=184.1, w=69.4, h=31.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-replay`
- 実測値: 95.6×31.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Replay the transitio
- スクリーンショット上の位置: x=708.5, y=184.1, w=95.6, h=31.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-bar-grid`
- 実測値: 30.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the scene grid
- スクリーンショット上の位置: x=814.1, y=182.6, w=30.0, h=34.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-desc-text`
- 実測値: 628.3×37.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Scene description
- スクリーンショット上の位置: x=475.7, y=224.6, w=628.3, h=37.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-undo`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Undo
- スクリーンショット上の位置: x=364.0, y=285.6, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-redo`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Redo
- スクリーンショット上の位置: x=404.0, y=285.6, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Move objects
- スクリーンショット上の位置: x=454.0, y=285.6, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Move lights
- スクリーンショット上の位置: x=494.0, y=285.6, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Draw an arrow
- スクリーンショット上の位置: x=548.0, y=285.6, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-freecam-open`
- 実測値: 37.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3D Camera
- スクリーンショット上の位置: x=598.0, y=285.6, w=37.0, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-view-select`
- 実測値: 88.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 表示する図
- スクリーンショット上の位置: x=666.5, y=285.6, w=88.0, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-show-names`
- 実測値: 128.8×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=764.5, y=285.6, w=128.8, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-show-set-names`
- 実測値: 94.3×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=903.3, y=285.6, w=94.3, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-show-light-names`
- 実測値: 97.4×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1007.6, y=285.6, w=97.4, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-anim-scenes`
- 実測値: 80.9×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=364.0, y=322.6, w=80.9, h=27.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 71.0×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Front row
- スクリーンショット上の位置: x=406.9, y=375.6, w=71.0, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 85.5×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Stalls centre
- スクリーンショット上の位置: x=481.8, y=375.6, w=85.5, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 73.2×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Stalls rear
- スクリーンショット上の位置: x=571.4, y=375.6, w=73.2, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 73.1×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Stalls side
- スクリーンショット上の位置: x=648.6, y=375.6, w=73.1, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 61.0×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Balcony
- スクリーンショット上の位置: x=725.7, y=375.6, w=61.0, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-front-note`
- 実測値: 48.7×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add a note
- スクリーンショット上の位置: x=874.2, y=379.6, w=48.7, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-front-lights`
- 実測値: 51.3×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=930.9, y=386.6, w=51.3, h=12.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-show-seatmap`
- 実測値: 69.8×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=990.2, y=386.6, w=69.8, h=12.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 36.0×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Close the front view
- スクリーンショット上の位置: x=1068.0, y=378.6, w=36.0, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-plan-route`
- 実測値: 52.0×29.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Draw route
- スクリーンショット上の位置: x=486.1, y=881.8, w=52.0, h=29.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-plan-derive-route`
- 実測値: 50.3×39.5px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Draw routes from the
- スクリーンショット上の位置: x=546.1, y=876.5, w=50.3, h=39.5px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-arrange-select`
- 実測値: 112.0×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Line up selected ite
- スクリーンショット上の位置: x=741.5, y=883.2, w=112.0, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-plan-note`
- 実測値: 48.7×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add a note
- スクリーンショット上の位置: x=861.5, y=883.2, w=48.7, h=26.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-plan-lights`
- 実測値: 51.3×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=918.2, y=890.2, w=51.3, h=12.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-plan-routes-cast`
- 実測値: 82.3×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=977.5, y=890.2, w=82.3, h=12.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-plan-routes-light`
- 実測値: 85.2×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1067.8, y=890.2, w=85.2, h=12.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-plan-routes-set`
- 実測値: 75.5×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1161.0, y=890.2, w=75.5, h=12.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-show-flown`
- 実測値: 49.0×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1244.5, y=890.2, w=49.0, h=12.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(6)`
- 実測値: 36.0×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the plan view
- スクリーンショット上の位置: x=1301.5, y=882.2, w=36.0, h=28.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(2) > div:nth-of-type(1)`
- 実測値: 18.0×834.7px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Right panel width
- スクリーンショット上の位置: x=1115.0, y=174.6, w=18.0, h=834.7px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(2) > section:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Scenes
- スクリーンショット上の位置: x=1133.0, y=174.6, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-grid-open`
- 実測値: 34.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the scene grid
- スクリーンショット上の位置: x=1133.0, y=210.6, w=34.0, h=34.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-section`
- 実測値: 34.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: New section
- スクリーンショット上の位置: x=1171.0, y=210.6, w=34.0, h=34.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `#stage-scene-add`
- 実測値: 34.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: New scene
- スクリーンショット上の位置: x=1209.0, y=210.6, w=34.0, h=34.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 192.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-1 1-1 The Back of 
- スクリーンショット上の位置: x=1171.0, y=331.6, w=192.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 実測値: 28.0×28.2px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: More scene actions
- スクリーンショット上の位置: x=1367.0, y=337.4, w=28.0, h=28.2px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 62.8×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=489.7, w=62.8, h=34.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-2 1-2 Calibrating 
- スクリーンショット上の位置: x=1171.0, y=556.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(4) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-3 1-3 Repetition T
- スクリーンショット上の位置: x=1171.0, y=615.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-4 1-4 The Blank Th
- スクリーンショット上の位置: x=1171.0, y=674.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(7) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-1 2-1 Inspecting t
- スクリーンショット上の位置: x=1171.0, y=808.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(8) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-2 2-2 A Hand Beyon
- スクリーンショット上の位置: x=1171.0, y=867.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(9) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-3 2-3 A Throw Outs
- スクリーンショット上の位置: x=1171.0, y=926.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(10) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-4 2-4 The First Sh
- スクリーンショット上の位置: x=1171.0, y=985.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(12) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-1 3-1 Instruction 
- スクリーンショット上の位置: x=1171.0, y=1119.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(13) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-2 3-2 It Will Not 
- スクリーンショット上の位置: x=1171.0, y=1178.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(14) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-3 3-3 Corrections 
- スクリーンショット上の位置: x=1171.0, y=1237.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(15) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-4 3-4 Success Thro
- スクリーンショット上の位置: x=1171.0, y=1296.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(17) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-1 4-1 “Place” Beco
- スクリーンショット上の位置: x=1171.0, y=1430.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(18) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-2 4-2 “Stray” Beco
- スクリーンショット上の位置: x=1171.0, y=1489.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(19) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-3 4-3 “Return” Bec
- スクリーンショット上の位置: x=1171.0, y=1548.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(20) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-4 4-4 One Happy Ru
- スクリーンショット上の位置: x=1171.0, y=1607.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(22) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-1 5-1 Measuring th
- スクリーンショット上の位置: x=1171.0, y=1741.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(23) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-2 5-2 Fixing the S
- スクリーンショット上の位置: x=1171.0, y=1800.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(24) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-3 5-3 The Thread P
- スクリーンショット上の位置: x=1171.0, y=1859.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(25) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-4 5-4 The Step Lef
- スクリーンショット上の位置: x=1171.0, y=1918.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(27) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-1 6-1 A Throw With
- スクリーンショット上の位置: x=1171.0, y=2052.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(28) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-2 6-2 The Chain Co
- スクリーンショット上の位置: x=1171.0, y=2111.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(29) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-3 6-3 The Thing or
- スクリーンショット上の位置: x=1171.0, y=2170.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(30) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-4 6-4 Breath After
- スクリーンショット上の位置: x=1171.0, y=2229.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(32) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-1 7-1 The Supporti
- スクリーンショット上の位置: x=1171.0, y=2363.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(33) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-2 7-2 Trading the 
- スクリーンショット上の位置: x=1171.0, y=2422.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(34) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-3 7-3 One Body 12
- スクリーンショット上の位置: x=1171.0, y=2481.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(35) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-4 7-4 The Lead Mov
- スクリーンショット上の位置: x=1171.0, y=2540.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(37) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-1 8-1 The Eight Mo
- スクリーンショット上の位置: x=1171.0, y=2674.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(38) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-2 8-2 Leaving the 
- スクリーンショット上の位置: x=1171.0, y=2733.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(39) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-3 8-3 The Frame Fa
- スクリーンショット上の位置: x=1171.0, y=2792.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `div:nth-of-type(40) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-4 8-4 The Edge of 
- スクリーンショット上の位置: x=1171.0, y=2851.6, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(2) > section:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Selection
- スクリーンショット上の位置: x=1133.0, y=959.2, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×1000

- セレクタ: `aside:nth-of-type(2) > section:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 18.0×18.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: About Selection
- スクリーンショット上の位置: x=1361.0, y=969.2, w=18.0, h=18.0px

### U4 ボタンの被覆 — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(6)`
- 実測値: 中心点の最前面: div:nth-of-type(8) > div:nth-of-type(1) > button:nth-of-type(1) > span:nth-of-type(2)
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: Open the plan view
- スクリーンショット上の位置: x=1301.5, y=461.2, w=36.0, h=28.0px

### U4 ボタンの被覆 — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=375.7, w=62.8, h=57.0px

### U4 ボタンの被覆 — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=432.7, w=62.8, h=57.0px

### U4 ボタンの被覆 — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=489.7, w=62.8, h=34.0px

### U4 ボタンの被覆 — 1440×1000

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=523.7, w=62.8, h=117.0px

## WARN（判定不能）の詳細

該当なし。

## 測定不可の詳細

該当なし。

## 証拠

- [full.png](./full.png) — 1440×1000 全画面
- [gray.png](./gray.png) — 1440×1000 モノクロ化（§12-20）
