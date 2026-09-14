# 舞台スケッチ「AI作成マニュアル」設計ドラフト（Claude案・Astraレビュー前）

- 作成: 2026-09-11 / 作成者: Claude（Fable 5.1）/ 状態: ドラフト（本人未承認）
- 目的: 各ユーザーが自分の使うAI（ChatGPT・Claude.ai・Gemini・ローカルLLM等）にマニュアルを読ませ、
  舞台スケッチの「保存 > 読み込む」で開けるショーJSONを吐かせられるようにする。
- 前提: 既存のローカルMCP（`mcp-server/`）は本人・開発者向けとして残す。今回はMCPを配布しない。
  マニュアル方式とMCPは別物（マニュアル＝文書。検証・履歴・ロックは持たない）。

## 0. 調査で確定した事実（2026-09-11 コード確認）

| 事実 | 根拠 |
|---|---|
| ブラウザの読み込みは寛容。`{project:{scenes:[...]}}` または `project` 素の形を受理し、`version` は検証しない（v4のときだけ `venues` を取り込む） | `stage-sketch.js` importProject（L18149〜）、prepareProjectImportDocument（L697〜） |
| 読み込んだ project は `normalizeState` を通る。未知フィールドは落ち、範囲外の数値は clamp、不正な色は既定色、`type` 不明は `performer` に化ける | normalizeScene（L4001〜）、normalizePiece（L3669〜） |
| 読み込み後は差分プレビューのモーダルが出て、既定は「別のショーとして開く」（現在のショーを壊さない）。スマホ閲覧では即保存 | importProject 内コメント、L18324 |
| ブラウザの書き出しは `kind:"shosai-stage-sketch", version:4, project, venues[]`。MCPは version 3 を生成・検証 | L693、`mcp-server/src/stage-model.js` |
| 駒 `piece` の種類（PIECE_TYPES）: performer block table chair bench stool wall trapeze cyrwheel diabolo pole teeter tissue wire suitcase trampoline cane car seri revolve deck curtain pool sphere prop model light | L1366 |
| 姿勢（POSES）: stand walk reach open sit crouch kneel handstand lie_back lie_front lie_side | stage-model.js |
| 会場: proscenium thrust arena endstage blackbox × small mid large | 同上 |
| 高リスク装置（警告対象）: trapeze cyrwheel pole teeter tissue wire trampoline | HIGH_RISK_KINDS |
| 既知の落とし穴: `pieces` 配列で低い什器を演者より**後**に置くと、什器が演者の頭上に「乗って」浮く（supportId は読込時に前方のみ探索） | メモリ／`tools/check-object-on-performer.mjs` |
| 最小のv4見本がすでにある（説明用・製品未検証） | `docs/project-contract-2026-09-09/stage-sketch-v4-binding-fixture-2026-09-09.json` |
| AI向けの変換規則（紙面→ビート表→シーン）はPLAYBOOKが正本 | `mcp-server/PLAYBOOK.md` |

## 1. 成果物（P1で作るもの）

```
shosai-app/docs/ai-json-manual/            ← 正本フォルダ（仮）
  AI_MANUAL_ja.md      AIに貼る本文（1ファイル・自己完結・6,000〜9,000字目安）
  sample-minimal.json  1演者・2場面（読み込み動作確認用）
  sample-standard.json 4演者・8場面・セクション1・照明2〜3・beat付き
  SELF_CHECK_ja.md     AIが出力後に自分で通す点検表（マニュアル末尾にも同梱）
  schema/stage-sketch-ai-subset.schema.json  JSON Schema（機械検証用・任意）
```

マニュアル本文の章立て（案）:
1. これは何か／何をしないか（完成品を出さない・動線を引かない・安全を保証しない）
2. 出力の骨格（`kind`/`version`/`project`）と最小例
3. 登録（`cast`・`sets`）と駒（`pieces`）の関係。id は `cast-a` のような短い文字列でよい
4. 座標契約: u=0左〜1右（客席から見て）、v=0奥〜1前。facing 0=客席。粗くてよい
5. 場面の書き方: `title`・`note`（行為/規則/変化）・`background`・`beat{role,energy}`・`kind:"section"` で章立て
6. 照明: `type:"light"` の駒＋`lightKind`（hang/ss/front/floor）。energy→照明の既定表（PLAYBOOKから転記）
7. 駒の並び順の規則（什器→演者の順。既知バグ回避）
8. 高リスク装置の扱い（`note` に「安全未確認」を明記、`flown`・`wires` はAIが書かない）
9. 自己点検表
10. 読み込み手順（ユーザー向け・「別のショーとして開く」を既定に）

## 2. AIに書かせる範囲（サブセット）

書かせる: `project.title/venue/venueSize`、`cast[{id,name,color?,heightCm?,note?}]`、
`sets[{id,kind,name,color?,note?}]`、`scenes[{id?,kind,depth?,title,note,background?,beat?,lightingIntent?,
pieces[{id?,type,castId|setId,u,v,facing?,pose?,size?,lightKind?}]}]`

書かせない（本人・ユーザーの領分、または内部状態）: `route`（動線）、`strokes/arrows/notes/photo/screenTexts`、
`heldBy/holdSide`、`base/supportId`、`beam`、舞台機構の値（seri/revolve/deck/curtain/pool）、`stashed`、`locked`、
`flown/wires`、`venues[]`（同梱会場）、`rehearsal` の秒数

## 3. 判断が要る点（本人へ）

- **D1 対象フォーマット**: (A) ブラウザが読む素の project 形をそのまま書かせる（推奨。変換層不要・v4 fixture と同型）
  (B) MCP入力形（`placements`+`assetName`）を書かせ、ブラウザ側に変換層を足す（AIは書きやすいが実装が増える）
- **D2 配布形態**: (A) 公開サイトに「AIに作らせる」ページ1枚（本文コピー＋見本DL）＋アプリの保存パネルからリンク（推奨）
  (B) リポジトリ docs のみ（開発者以外に届かない）
- **D3 検証の置き場**: P1は文書の自己点検表のみ。読み込み時の「AI JSON点検表示」（未知フィールドの破棄・参照切れの警告）は
  通し試験の結果を見てから判断（推奨: 先送り）
- **D4 正本の一本化**: マニュアル正本は `docs/ai-json-manual/`。MCPの GUIDE・PLAYBOOK とは「食い違ったらマニュアルを直し、
  MCP側にはリンクだけ」のルールで運用（生成スクリプトはP1では作らない）
- **D5 version の値**: マニュアルは `version: 4`・`venues: []` を書かせる（ブラウザの現行書き出しと同じ）。
  MCPの v3 とは別系統と明記
- **D6 言語**: P1は日本語のみ。英語版はP3（既存の en UI と用語を揃える）

## 4. 段階

| 段階 | 内容 | 担当（案） | 完了条件 |
|---|---|---|---|
| P1 | マニュアル本文・見本2本・自己点検表・（任意）JSON Schema | Codex（仕様確定済み委譲・medium） | 見本2本を本番 stage.html で読み込み、差分プレビュー→「別のショーとして開く」まで通る。`check-object-on-performer.mjs` が0件 |
| P2 | 通し試験: 外部AI3種（ChatGPT / Claude.ai / Gemini）× 課題2種（8場面サーカス／3場面ダンス）で生成→読み込み。失敗・修正回数を台帳化 | 本人＋Claude | 6本中の成功率と「AIが間違えやすい箇所」の一覧 |
| P3 | 公開ページ＋保存パネルからのリンク＋英語版 | Codex | 公開URLで本文コピー・見本DLができる |
| P4（条件付き） | 読み込みモーダルに「AI JSON点検」表示 | 判断待ち | P2で参照切れ・未知フィールド起因の失敗が2件以上出た場合のみ |

## 5. リスク・未確認

- 未知フィールドが黙って落ちるため、AIが独自フィールドを足しても気づけない（→自己点検表とP2で計測）
- `type` 不明値が `performer` に化ける（`diabolo` 等はあるが `ring` は `sphere` に読み替え）。マニュアルに種類一覧を厳密に載せる
- 公開ページに載せる＝AI各社に本文が送られる。本人の未発表演目を含めない（見本は架空題材）
- Mac版・共有セッション経路は今回対象外（ファイル読み込みのみ）
