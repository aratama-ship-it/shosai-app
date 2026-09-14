# design-lint レポート — 127.0.0.1/stage.html

- URL: http://127.0.0.1:8941/stage.html?seam-sample&timeline-controls=24
- 測定時刻: 2026-09-13T15:49:45+09:00
- ビューポート: 1440×900
- User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36
- Service Worker / キャッシュ: `service_workers="block"` の新規BrowserContextで測定
- 備考: 共通ヘッダーへ移動した108px音量フェーダーの配置確認
- 総合: NG 203件 / WARN 4件 / 測定不可 0件

## 判定サマリ — 1440×900

| ID | 項目 | 判定 | 実測 | 基準 | 出典 |
|---|---|---|---|---|---|
| C1 | 文字と背景のコントラスト比 | WARN | 最悪 3.33:1／実数測定 341件／WARN 4件／無効UI部品 5件は対象外 | 本文 4.5:1以上／大きい文字・UI部品 3:1以上 | §12-16 |
| C2 | 本文の純黒 | OK | 純黒 0件／本文 19件 | 本文に #000000 を使わない | §12-19 |
| C3 | 色だけに頼ったリンク表現 | OK | 手がかりなし 0件／本文中リンク 0件 | 本文中リンクに色以外の手がかり | §12-17 |
| T1 | 行送り | NG | 1.00〜1.80／normal等の数値化不可 0件 | line-height / font-size = 1.5〜2.0 | §12-15 |
| T2 | 行長 | 情報 | 2.5〜75.5字/行（近似）／範囲外 19件 | 1行 30〜50字（全角換算・近似値） | §12-15 |
| T3 | ジャンプ率 | 情報 | 3.14倍（33.0px / 本文 10.5px） | 最大見出し / 本文 ≒ 2倍 | §12-15 |
| T4 | 書体の種類数 | OK | 2種類: Hiragino Kaku Gothic ProN, Hiragino Mincho ProN | 1〜2種類 | §12-18 |
| U1 | タップ対象の大きさ | NG | 44px未満 189件／対象 216件 | 44×44px以上 | §12-21 |
| U2 | ナビゲーション項目数 | 情報 | #stage-workspace-tabs: 3項目 | 4〜5以内 | §12-24 |
| U3 | アイコンのみボタンの aria-label | OK | 欠落 0件／アイコンのみ 76件 | aria-label 必須 | design-policy「多言語前提のUI表現はアイコン基本」 |
| U4 | ボタンの被覆 | NG | 被覆 7件／ボタン 193件 | 中心点で自分または子要素を取得できる | UI_AUDIT実績 |
| U5 | 同一ラベルの重複 | 情報 | 「add」×2; 「on stage」×8; 「🔓」×19; 「…」×19; 「✕」×20; 「off stage」×7; 「?」×3; 「off」×3; 「note」×2; 「▾」×2 | 同一画面の重複ラベルを観測 | UI_AUDIT実績 |
| M1 | prefers-reduced-motion 対応 | OK | 通常 24要素/最大1500ms → reduce 24要素/最大0ms; 要素別対応 24/24 | 動きがある場合は分岐必須 | A_design §5 |
| E1 | モノクロ化スクリーンショット | 情報 | full.png, gray.png | 人が見て判断する証拠 | §12-20 |

## NG の詳細

### T1 行送り — 1440×900

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > label:nth-of-type(1) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Lights
- スクリーンショット上の位置: x=947.9, y=371.8, w=34.3, h=10.5px

### T1 行送り — 1440×900

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > label:nth-of-type(3) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Seat map
- スクリーンショット上の位置: x=1007.2, y=371.8, w=52.8, h=10.5px

### T1 行送り — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(1) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Lights
- スクリーンショット上の位置: x=935.2, y=873.4, w=34.3, h=10.5px

### T1 行送り — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(2) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Cast routes
- スクリーンショット上の位置: x=994.5, y=873.4, w=65.3, h=10.5px

### T1 行送り — 1440×900

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > label:nth-of-type(3) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Light routes
- スクリーンショット上の位置: x=1084.8, y=873.4, w=68.2, h=10.5px

### T1 行送り — 1440×900

- セレクタ: `div:nth-of-type(1) > label:nth-of-type(4) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Set routes
- スクリーンショット上の位置: x=1178.0, y=873.4, w=58.5, h=10.5px

### T1 行送り — 1440×900

- セレクタ: `div:nth-of-type(1) > label:nth-of-type(5) > span:nth-of-type(1)`
- 実測値: 1.00
- 基準値: line-height / font-size = 1.5〜2.0
- 該当テキスト冒頭20字: Flown
- スクリーンショット上の位置: x=1261.5, y=873.4, w=32.0, h=10.5px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-release-open`
- 実測値: 32.0×44.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Update history (new)
- スクリーンショット上の位置: x=416.1, y=78.0, w=32.0, h=44.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-prefs-btn`
- 実測値: 34.0×44.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Settings
- スクリーンショット上の位置: x=1160.9, y=78.0, w=34.0, h=44.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-panels-toggle`
- 実測値: 34.0×44.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Panels
- スクリーンショット上の位置: x=1200.9, y=78.0, w=34.0, h=44.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(1) > div:nth-of-type(3)`
- 実測値: 18.0×1179.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Left panel width
- スクリーンショット上の位置: x=336.0, y=159.0, w=18.0, h=1179.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Show
- スクリーンショット上の位置: x=68.0, y=160.0, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(3) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Cast & set
- スクリーンショット上の位置: x=68.0, y=255.0, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-roster-name`
- 実測値: 268.0×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Name
- スクリーンショット上の位置: x=68.0, y=291.0, w=268.0, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-roster-kind`
- 実測値: 217.2×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Performer ▸
- スクリーンショット上の位置: x=68.0, y=334.0, w=217.2, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-roster-add`
- 実測値: 45.8×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add
- スクリーンショット上の位置: x=290.2, y=334.0, w=45.8, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Keeper
- スクリーンショット上の位置: x=96.0, y=403.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=405.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Keeper (it stop
- スクリーンショット上の位置: x=262.0, y=406.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Keeper’s profil
- スクリーンショット上の位置: x=288.0, y=406.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Keeper from t
- スクリーンショット上の位置: x=314.0, y=406.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Spill
- スクリーンショット上の位置: x=96.0, y=435.5, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=437.5, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Spill (it stops
- スクリーンショット上の位置: x=262.0, y=438.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Spill’s profile
- スクリーンショット上の位置: x=288.0, y=438.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Spill from th
- スクリーンショット上の位置: x=314.0, y=438.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Hand A
- スクリーンショット上の位置: x=96.0, y=467.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=469.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Hand A (it stop
- スクリーンショット上の位置: x=262.0, y=470.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Hand A’s profil
- スクリーンショット上の位置: x=288.0, y=470.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Hand A from t
- スクリーンショット上の位置: x=314.0, y=470.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Hand B
- スクリーンショット上の位置: x=96.0, y=499.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=501.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Hand B (it stop
- スクリーンショット上の位置: x=262.0, y=502.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open Hand B’s profil
- スクリーンショット上の位置: x=288.0, y=502.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Hand B from t
- スクリーンショット上の位置: x=314.0, y=502.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-model-open`
- 実測値: 80.1×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Build a set
- スクリーンショット上の位置: x=255.9, y=537.5, w=80.1, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — left side
- スクリーンショット上の位置: x=96.0, y=580.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=582.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — left si
- スクリーンショット上の位置: x=262.0, y=583.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=583.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — left 
- スクリーンショット上の位置: x=314.0, y=583.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — right side
- スクリーンショット上の位置: x=96.0, y=612.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=614.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — right s
- スクリーンショット上の位置: x=262.0, y=615.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=615.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — right
- スクリーンショット上の位置: x=314.0, y=615.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — top
- スクリーンショット上の位置: x=96.0, y=644.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=646.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — top (it
- スクリーンショット上の位置: x=262.0, y=647.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=647.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — top f
- スクリーンショット上の位置: x=314.0, y=647.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Frame — bottom
- スクリーンショット上の位置: x=96.0, y=676.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=678.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Frame — bottom 
- スクリーンショット上の位置: x=262.0, y=679.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Fra
- スクリーンショット上の位置: x=288.0, y=679.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Frame — botto
- スクリーンショット上の位置: x=314.0, y=679.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(5) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Cloth A (position ma
- スクリーンショット上の位置: x=96.0, y=708.5, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=710.5, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Cloth A (positi
- スクリーンショット上の位置: x=262.0, y=711.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Clo
- スクリーンショット上の位置: x=288.0, y=711.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(5) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Cloth A (posi
- スクリーンショット上の位置: x=314.0, y=711.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(6) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Cloth B (position ma
- スクリーンショット上の位置: x=96.0, y=740.5, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=742.5, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Cloth B (positi
- スクリーンショット上の位置: x=262.0, y=743.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Clo
- スクリーンショット上の位置: x=288.0, y=743.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(6) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Cloth B (posi
- スクリーンショット上の位置: x=314.0, y=743.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(1)`
- 実測値: 87.2×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Archive suitcase
- スクリーンショット上の位置: x=96.0, y=772.5, w=87.2, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(2)`
- 実測値: 70.8×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: On stage
- スクリーンショット上の位置: x=187.2, y=774.5, w=70.8, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Archive suitcas
- スクリーンショット上の位置: x=262.0, y=775.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Arc
- スクリーンショット上の位置: x=288.0, y=775.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(7) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Archive suitc
- スクリーンショット上の位置: x=314.0, y=775.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Record ball 1
- スクリーンショット上の位置: x=96.0, y=804.5, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=806.5, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Record ball 1 (
- スクリーンショット上の位置: x=262.0, y=807.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Rec
- スクリーンショット上の位置: x=288.0, y=807.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(8) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Record ball 1
- スクリーンショット上の位置: x=314.0, y=807.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Record ball 2
- スクリーンショット上の位置: x=96.0, y=836.5, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=838.5, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Record ball 2 (
- スクリーンショット上の位置: x=262.0, y=839.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Rec
- スクリーンショット上の位置: x=288.0, y=839.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(9) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Record ball 2
- スクリーンショット上の位置: x=314.0, y=839.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Record ball 3
- スクリーンショット上の位置: x=96.0, y=868.5, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=870.5, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Record ball 3 (
- スクリーンショット上の位置: x=262.0, y=871.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Rec
- スクリーンショット上の位置: x=288.0, y=871.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(10) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Record ball 3
- スクリーンショット上の位置: x=314.0, y=871.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(11) > button:nth-of-type(1)`
- 実測値: 84.4×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Blank record sheet (
- スクリーンショット上の位置: x=96.0, y=900.5, w=84.4, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(2)`
- 実測値: 73.6×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Off stage
- スクリーンショット上の位置: x=184.4, y=902.5, w=73.6, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Blank record sh
- スクリーンショット上の位置: x=262.0, y=903.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Bla
- スクリーンショット上の位置: x=288.0, y=903.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(11) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Blank record 
- スクリーンショット上の位置: x=314.0, y=903.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(3) > button:nth-of-type(2)`
- 実測値: 18.0×18.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: About Cast & set
- スクリーンショット上の位置: x=296.0, y=265.0, w=18.0, h=18.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(6) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Lights
- スクリーンショット上の位置: x=68.0, y=865.5, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-light-name`
- 実測値: 268.0×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Light name
- スクリーンショット上の位置: x=68.0, y=901.5, w=268.0, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-light-kind`
- 実測値: 217.2×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Light type
- スクリーンショット上の位置: x=68.0, y=944.5, w=217.2, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-light-add`
- 実測値: 45.8×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add
- スクリーンショット上の位置: x=290.2, y=944.5, w=45.8, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-light-preset-open`
- 実測値: 268.0×38.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Build from preset ▸
- スクリーンショット上の位置: x=68.0, y=991.5, w=268.0, h=38.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 121.9×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: White work light
- スクリーンショット上の位置: x=96.0, y=1107.0, w=121.9, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 36.1×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ON
- スクリーンショット上の位置: x=221.9, y=1109.0, w=36.1, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock White work ligh
- スクリーンショット上の位置: x=262.0, y=1110.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Whi
- スクリーンショット上の位置: x=288.0, y=1110.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove White work li
- スクリーンショット上の位置: x=314.0, y=1110.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 116.7×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Archive pin
- スクリーンショット上の位置: x=96.0, y=1139.0, w=116.7, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 41.3×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: OFF
- スクリーンショット上の位置: x=216.7, y=1141.0, w=41.3, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Archive pin (it
- スクリーンショット上の位置: x=262.0, y=1142.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Arc
- スクリーンショット上の位置: x=288.0, y=1142.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Archive pin f
- スクリーンショット上の位置: x=314.0, y=1142.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 116.7×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Seam side light
- スクリーンショット上の位置: x=96.0, y=1207.5, w=116.7, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 41.3×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: OFF
- スクリーンショット上の位置: x=216.7, y=1209.5, w=41.3, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Seam side light
- スクリーンショット上の位置: x=262.0, y=1210.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Sea
- スクリーンショット上の位置: x=288.0, y=1210.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Seam side lig
- スクリーンショット上の位置: x=314.0, y=1210.5, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 116.7×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Light that includes 
- スクリーンショット上の位置: x=96.0, y=1276.0, w=116.7, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 41.3×24.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: OFF
- スクリーンショット上の位置: x=216.7, y=1278.0, w=41.3, h=24.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Lock Light that incl
- スクリーンショット上の位置: x=262.0, y=1279.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the size of Lig
- スクリーンショット上の位置: x=288.0, y=1279.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 22.0×22.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Remove Light that in
- スクリーンショット上の位置: x=314.0, y=1279.0, w=22.0, h=22.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(6) > button:nth-of-type(2)`
- 実測値: 18.0×18.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: About Lights
- スクリーンショット上の位置: x=296.0, y=875.5, w=18.0, h=18.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-prev`
- 実測値: 92.6×31.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ◀ Previous
- スクリーンショット上の位置: x=365.0, y=168.5, w=92.6, h=31.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-next`
- 実測値: 69.4×31.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Next ▶
- スクリーンショット上の位置: x=631.1, y=168.5, w=69.4, h=31.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-replay`
- 実測値: 95.6×31.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Replay the transitio
- スクリーンショット上の位置: x=708.5, y=168.5, w=95.6, h=31.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-bar-grid`
- 実測値: 30.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the scene grid
- スクリーンショット上の位置: x=814.1, y=167.0, w=30.0, h=34.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-desc-text`
- 実測値: 628.3×37.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Scene description
- スクリーンショット上の位置: x=475.7, y=209.0, w=628.3, h=37.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-undo`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Undo
- スクリーンショット上の位置: x=364.0, y=270.0, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-redo`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Redo
- スクリーンショット上の位置: x=404.0, y=270.0, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Move objects
- スクリーンショット上の位置: x=454.0, y=270.0, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Move lights
- スクリーンショット上の位置: x=494.0, y=270.0, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 40.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Draw an arrow
- スクリーンショット上の位置: x=548.0, y=270.0, w=40.0, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-view-select`
- 実測値: 88.0×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: View to show. Both 1
- スクリーンショット上の位置: x=666.5, y=270.0, w=88.0, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-show-names`
- 実測値: 128.8×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=764.5, y=270.0, w=128.8, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-show-set-names`
- 実測値: 94.3×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=903.3, y=270.0, w=94.3, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-show-light-names`
- 実測値: 97.4×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1007.6, y=270.0, w=97.4, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-anim-scenes`
- 実測値: 80.9×27.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=364.0, y=307.0, w=80.9, h=27.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 71.0×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Front row
- スクリーンショット上の位置: x=406.9, y=360.0, w=71.0, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 85.5×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Stalls centre
- スクリーンショット上の位置: x=481.8, y=360.0, w=85.5, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 73.2×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Stalls rear
- スクリーンショット上の位置: x=571.4, y=360.0, w=73.2, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 73.1×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Stalls side
- スクリーンショット上の位置: x=648.6, y=360.0, w=73.1, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(5)`
- 実測値: 61.0×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Balcony
- スクリーンショット上の位置: x=725.7, y=360.0, w=61.0, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-front-note`
- 実測値: 48.7×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add a note
- スクリーンショット上の位置: x=874.2, y=364.0, w=48.7, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-front-lights`
- 実測値: 51.3×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=930.9, y=371.0, w=51.3, h=12.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-show-seatmap`
- 実測値: 69.8×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=990.2, y=371.0, w=69.8, h=12.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(3)`
- 実測値: 36.0×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Close the front view
- スクリーンショット上の位置: x=1068.0, y=363.0, w=36.0, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-route`
- 実測値: 52.0×29.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Draw route
- スクリーンショット上の位置: x=486.1, y=864.2, w=52.0, h=29.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-derive-route`
- 実測値: 50.3×39.5px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Draw routes from the
- スクリーンショット上の位置: x=546.1, y=858.9, w=50.3, h=39.5px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-arrange-select`
- 実測値: 112.0×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Line up selected ite
- スクリーンショット上の位置: x=741.5, y=865.7, w=112.0, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-note`
- 実測値: 48.7×26.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Add a note
- スクリーンショット上の位置: x=861.5, y=865.7, w=48.7, h=26.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-lights`
- 実測値: 51.3×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=918.2, y=872.7, w=51.3, h=12.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-routes-cast`
- 実測値: 82.3×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=977.5, y=872.7, w=82.3, h=12.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-routes-light`
- 実測値: 85.2×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1067.8, y=872.7, w=85.2, h=12.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-routes-set`
- 実測値: 75.5×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1161.0, y=872.7, w=75.5, h=12.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-show-flown`
- 実測値: 49.0×12.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: on
- スクリーンショット上の位置: x=1244.5, y=872.7, w=49.0, h=12.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(6)`
- 実測値: 36.0×28.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Close the plan view
- スクリーンショット上の位置: x=1301.5, y=864.7, w=36.0, h=28.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-zoom-in`
- 実測値: 34.0×44.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Zoom into the plan
- スクリーンショット上の位置: x=1068.0, y=1226.4, w=34.0, h=44.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-plan-zoom-out`
- 実測値: 34.0×44.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Zoom out of the plan
- スクリーンショット上の位置: x=1068.0, y=1275.4, w=34.0, h=44.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(2) > div:nth-of-type(1)`
- 実測値: 18.0×768.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Right panel width
- スクリーンショット上の位置: x=1115.0, y=159.0, w=18.0, h=768.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(2) > section:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Scenes
- スクリーンショット上の位置: x=1133.0, y=159.0, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-grid-open`
- 実測値: 34.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: Open the scene grid
- スクリーンショット上の位置: x=1133.0, y=195.0, w=34.0, h=34.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-section`
- 実測値: 34.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: New section
- スクリーンショット上の位置: x=1171.0, y=195.0, w=34.0, h=34.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `#stage-scene-add`
- 実測値: 34.0×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: New scene
- スクリーンショット上の位置: x=1209.0, y=195.0, w=34.0, h=34.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 192.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-1 1-1 The Back of 
- スクリーンショット上の位置: x=1171.0, y=316.0, w=192.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > summary:nth-of-type(1)`
- 実測値: 28.0×28.2px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: More scene actions
- スクリーンショット上の位置: x=1367.0, y=321.9, w=28.0, h=28.2px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 62.8×34.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=474.1, w=62.8, h=34.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-2 1-2 Calibrating 
- スクリーンショット上の位置: x=1171.0, y=541.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(4) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-3 1-3 Repetition T
- スクリーンショット上の位置: x=1171.0, y=600.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 1-4 1-4 The Blank Th
- スクリーンショット上の位置: x=1171.0, y=659.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(7) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-1 2-1 Inspecting t
- スクリーンショット上の位置: x=1171.0, y=793.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(8) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-2 2-2 A Hand Beyon
- スクリーンショット上の位置: x=1171.0, y=852.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(9) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-3 2-3 A Throw Outs
- スクリーンショット上の位置: x=1171.0, y=911.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(10) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 2-4 2-4 The First Sh
- スクリーンショット上の位置: x=1171.0, y=970.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(12) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-1 3-1 Instruction 
- スクリーンショット上の位置: x=1171.0, y=1104.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(13) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-2 3-2 It Will Not 
- スクリーンショット上の位置: x=1171.0, y=1163.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(14) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-3 3-3 Corrections 
- スクリーンショット上の位置: x=1171.0, y=1222.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(15) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 3-4 3-4 Success Thro
- スクリーンショット上の位置: x=1171.0, y=1281.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(17) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-1 4-1 “Place” Beco
- スクリーンショット上の位置: x=1171.0, y=1415.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(18) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-2 4-2 “Stray” Beco
- スクリーンショット上の位置: x=1171.0, y=1474.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(19) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-3 4-3 “Return” Bec
- スクリーンショット上の位置: x=1171.0, y=1533.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(20) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 4-4 4-4 One Happy Ru
- スクリーンショット上の位置: x=1171.0, y=1592.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(22) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-1 5-1 Measuring th
- スクリーンショット上の位置: x=1171.0, y=1726.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(23) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-2 5-2 Fixing the S
- スクリーンショット上の位置: x=1171.0, y=1785.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(24) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-3 5-3 The Thread P
- スクリーンショット上の位置: x=1171.0, y=1844.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(25) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 5-4 5-4 The Step Lef
- スクリーンショット上の位置: x=1171.0, y=1903.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(27) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-1 6-1 A Throw With
- スクリーンショット上の位置: x=1171.0, y=2037.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(28) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-2 6-2 The Chain Co
- スクリーンショット上の位置: x=1171.0, y=2096.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(29) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-3 6-3 The Thing or
- スクリーンショット上の位置: x=1171.0, y=2155.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(30) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 6-4 6-4 Breath After
- スクリーンショット上の位置: x=1171.0, y=2214.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(32) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-1 7-1 The Supporti
- スクリーンショット上の位置: x=1171.0, y=2348.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(33) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-2 7-2 Trading the 
- スクリーンショット上の位置: x=1171.0, y=2407.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(34) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-3 7-3 One Body 12
- スクリーンショット上の位置: x=1171.0, y=2466.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(35) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 7-4 7-4 The Lead Mov
- スクリーンショット上の位置: x=1171.0, y=2525.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(37) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-1 8-1 The Eight Mo
- スクリーンショット上の位置: x=1171.0, y=2659.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(38) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-2 8-2 Leaving the 
- スクリーンショット上の位置: x=1171.0, y=2718.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(39) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-3 8-3 The Frame Fa
- スクリーンショット上の位置: x=1171.0, y=2777.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `div:nth-of-type(40) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 220.0×40.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: 8-4 8-4 The Edge of 
- スクリーンショット上の位置: x=1171.0, y=2836.0, w=220.0, h=40.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `aside:nth-of-type(2) > section:nth-of-type(2) > button:nth-of-type(1)`
- 実測値: 268.0×36.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: ⠿ Selection
- スクリーンショット上の位置: x=1133.0, y=877.0, w=268.0, h=36.0px

### U1 タップ対象の大きさ — 1440×900

- セレクタ: `section:nth-of-type(2) > button:nth-of-type(2)`
- 実測値: 18.0×18.0px
- 基準値: 44×44px以上
- 該当テキスト冒頭20字: About Selection
- スクリーンショット上の位置: x=1361.0, y=887.0, w=18.0, h=18.0px

### U4 ボタンの被覆 — 1440×900

- セレクタ: `aside:nth-of-type(1) > section:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 中心点の最前面: body:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1)
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: ⠿ Show
- スクリーンショット上の位置: x=68.0, y=160.0, w=268.0, h=36.0px

### U4 ボタンの被覆 — 1440×900

- セレクタ: `#stage-project-settings-open`
- 実測値: 中心点の最前面: #stage-tour-next
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: Details
- スクリーンショット上の位置: x=274.4, y=196.0, w=61.6, h=44.0px

### U4 ボタンの被覆 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(6)`
- 実測値: 中心点の最前面: aside:nth-of-type(2) > section:nth-of-type(2) > button:nth-of-type(1)
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: Close the plan view
- スクリーンショット上の位置: x=1301.5, y=864.7, w=36.0, h=28.0px

### U4 ボタンの被覆 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=360.1, w=62.8, h=57.0px

### U4 ボタンの被覆 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(2)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=417.1, w=62.8, h=57.0px

### U4 ボタンの被覆 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(3)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=474.1, w=62.8, h=34.0px

### U4 ボタンの被覆 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(4)`
- 実測値: 中心点の最前面: #view-stage
- 基準値: 中心点で自分または子要素を取得できる
- 該当テキスト冒頭20字: なし
- スクリーンショット上の位置: x=1373.0, y=508.1, w=62.8, h=117.0px

## WARN（判定不能）の詳細

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1)`
- 理由: 背後が動的に変わる要素 (canvas #stage-plan-canvas)。文字色だけでなく暗い帯（座布団）などで背景を固定する
- 該当テキスト冒頭20字: Upstage
- スクリーンショット上の位置: x=368.0, y=916.4, w=44.8, h=8.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#stage-plan-zoom-in`
- 理由: 背後が動的に変わる要素 (canvas #stage-plan-canvas)。文字色だけでなく暗い帯（座布団）などで背景を固定する
- 該当テキスト冒頭20字: ＋
- スクリーンショット上の位置: x=1077.0, y=1240.4, w=16.0, h=16.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `#stage-plan-zoom-out`
- 理由: 背後が動的に変わる要素 (canvas #stage-plan-canvas)。文字色だけでなく暗い帯（座布団）などで背景を固定する
- 該当テキスト冒頭20字: −
- スクリーンショット上の位置: x=1079.8, y=1289.4, w=10.5, h=16.0px

### C1 文字と背景のコントラスト比 — 1440×900

- セレクタ: `div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3)`
- 理由: 背後が動的に変わる要素 (canvas #stage-plan-canvas)。文字色だけでなく暗い帯（座布団）などで背景を固定する
- 該当テキスト冒頭20字: Downstage (house)
- スクリーンショット上の位置: x=368.0, y=1311.5, w=104.2, h=8.0px

## 測定不可の詳細

該当なし。

## 証拠

- [full.png](./full.png) — 1440×900 全画面
- [gray.png](./gray.png) — 1440×900 モノクロ化（§12-20）
