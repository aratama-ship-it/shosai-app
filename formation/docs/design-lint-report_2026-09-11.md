# design-lint レポート — 127.0.0.1/formation/prototype/record-from-video.html

- URL: http://127.0.0.1:8941/formation/prototype/record-from-video.html?v=53
- 測定時刻: 2026-09-11T23:58:36+09:00
- ビューポート: 1440×900
- User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36
- Service Worker / キャッシュ: `service_workers="block"` の新規BrowserContextで測定
- 備考: formation v38 鍵3状態・緑のドラッグ・向きの三角
- 総合: NG 0件 / WARN 0件 / 測定不可 0件

## 判定サマリ — 1440×900

| ID | 項目 | 判定 | 実測 | 基準 | 出典 |
|---|---|---|---|---|---|
| C1 | 文字と背景のコントラスト比 | OK | 最悪 3.45:1／実数測定 73件／WARN 0件／無効UI部品 2件は対象外 | 本文 4.5:1以上／大きい文字・UI部品 3:1以上 | §12-16 |
| C2 | 本文の純黒 | OK | 純黒 0件／本文 9件 | 本文に #000000 を使わない | §12-19 |
| C3 | 色だけに頼ったリンク表現 | OK | 手がかりなし 0件／本文中リンク 0件 | 本文中リンクに色以外の手がかり | §12-17 |
| T1 | 行送り | OK | 1.60〜1.60／normal等の数値化不可 0件 | line-height / font-size = 1.5〜2.0 | §12-15 |
| T2 | 行長 | 情報 | 1.5〜22.5字/行（近似）／範囲外 8件 | 1行 30〜50字（全角換算・近似値） | §12-15 |
| T3 | ジャンプ率 | 情報 | 1.38倍（18.0px / 本文 13.0px） | 最大見出し / 本文 ≒ 2倍 | §12-15 |
| T4 | 書体の種類数 | OK | 1種類: Hiragino Sans | 1〜2種類 | §12-18 |
| U1 | タップ対象の大きさ | OK | 44px未満 0件／対象 46件 | 44×44px以上 | §12-21 |
| U2 | ナビゲーション項目数 | 情報 | ナビゲーションなし | 4〜5以内 | §12-24 |
| U3 | アイコンのみボタンの aria-label | OK | 欠落 0件／アイコンのみ 4件 | aria-label 必須 | design-policy「多言語前提のUI表現はアイコン基本」 |
| U4 | ボタンの被覆 | OK | 被覆 0件／ボタン 41件 | 中心点で自分または子要素を取得できる | UI_AUDIT実績 |
| U5 | 同一ラベルの重複 | 情報 | 「記録」×2 | 同一画面の重複ラベルを観測 | UI_AUDIT実績 |
| M1 | prefers-reduced-motion 対応 | OK | 通常 42要素/最大120ms → reduce 0要素/最大0ms; 要素別対応 42/42 | 動きがある場合は分岐必須 | A_design §5 |
| E1 | モノクロ化スクリーンショット | 情報 | full.png, gray.png | 人が見て判断する証拠 | §12-20 |

## NG の詳細

該当なし。

## WARN（判定不能）の詳細

該当なし。

## 測定不可の詳細

該当なし。

## 証拠

- [full.png](./full.png) — 1440×900 全画面
- [gray.png](./gray.png) — 1440×900 モノクロ化（§12-20）
