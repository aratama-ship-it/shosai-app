# 本人判断シート — QA記録

実施日: 2026-09-11

## 対象

- `index.html`
- 判断項目: 21件
- 選択肢: 各4件（推奨、別案2件、保留）
- 表示幅: 390×844 / 1440×900

## 結果

- HTML内JavaScriptの構文確認: PASS
- 初期状態が0 / 21、初期選択なし: PASS
- 未回答へ推奨案を一括入力し、既存の本人選択を保持: PASS
- 未回答だけ表示／全件表示: PASS
- 選択、補足、制作条件のlocalStorage保存と再読込: PASS
- 機械可読データの21件、schema、適用前状態、参照元ハッシュ: PASS
- 回答JSONのダウンロードと再読込: PASS
- 会話へ貼る日本語回答のコピー: PASS
- 390px / 1440pxで横スクロールなし: PASS
- `file://`で21件を表示し、外部リクエストなし: PASS
- ブラウザ内JavaScriptエラー: 0件
- design-lint: NG 0件 / WARN 0件 / 測定不可 0件

## 証拠

- `qa/browser-checks.json`: ブラウザ操作結果
- `qa/sample-export.json`: JSON保存の検証用出力（本人回答ではない）
- `qa/interaction-desktop.png`: 回答済み状態の1440×900表示
- `qa/interaction-mobile.png`: 回答済み状態の390×844表示
- `qa/design-lint/report.md`: 自動デザイン検査
- `qa/design-lint/full_390x844.png`
- `qa/design-lint/full_1440x900.png`
- `qa/design-lint/gray_390x844.png`
- `qa/design-lint/gray_1440x900.png`

## 境界

- 本人の回答はまだありません。QA用の選択は隔離されたブラウザで作成し、本人のHTML内保存領域へは入りません。
- シート上の選択だけでは、通し上演稿、Stage Sketchサンプル、引継ぎJSONは変更されません。
- 会場寸法、出演者の身体条件、利用可能なサーカス技術、照明・音響・稽古条件は本人入力または現場確認が必要です。
