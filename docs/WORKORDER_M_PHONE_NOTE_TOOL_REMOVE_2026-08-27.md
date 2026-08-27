# 発注書M: スマホ閲覧機から「メモ」の道具（図の上の付箋）を外す

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-27。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 本人指示（2026-08-27）

> （図の上の付箋をスマホから外すか） **これはスマホではいらない機能になったので削除**

2026-08-26に図の下へ「メモ」欄（`sc().note`）を新設した結果、図の上に付箋を貼る道具
（`tool === "note"` ／ `sc().notes`）は**スマホでは役割が重複**した、という経緯。

## ★何を消し、何を残すか（取り違えると情報が消える）

| 対象 | どうする |
|---|---|
| スマホ閲覧機の**「メモ」ボタン**と、そこから入る付箋モード | **消す**（本発注の対象） |
| **すでに貼られている付箋の表示**（`drawNotes` / `sc().notes`） | **残す。** 消さない。PCで貼った付箋がスマホで読めなくなるのは、本人の意図ではない（「いらない機能」＝入力の道具のこと） |
| 図の下の**メモ欄**（`sc().note`・2026-08-26新設） | **残す**（そのまま） |
| PC・iPadの付箋の道具 | **残す**（スマホだけの話） |
| `sc().notes` のデータ・書き出し・読み込み | **一切触らない** |

## Claudeが調べて確認済みの事実（再調査不要）

行番号は2026-08-27・commit `a464428` 時点。ずれていたら名前で探すこと。

### 消す対象（`stage-sketch.js`）

| 行 | 内容 |
|---|---|
| `:10955-10956` | `const noteToggle = makePhoneButton(tx("メモ"), tx("図にメモを追加する"), "stage-phone-note-toggle");` と `aria-pressed` の初期化 |
| `:10958` | `actions.append(load, projectName, infoToggle, noteToggle, viewToggle);` から `noteToggle` を外す |
| `:11134` | `phoneUi` に入れている `noteToggle` を外す |
| `:10781-10782` | `setPhoneButtonLang(phoneUi.noteToggle, …)`（言語切替） |
| `:10917-10918` | `phoneUi.noteToggle.textContent` / `aria-pressed` の更新 |
| `:11208` | `noteToggle.addEventListener("click", …)` |

### 道具の強制（2箇所。**条件を単純化する**）

| 行 | いま | あと |
|---|---|---|
| `:17754` | `if (phoneViewerActive && nextTool !== "note") nextTool = "select";` | `if (phoneViewerActive) nextTool = "select";` |
| `:18410` | `if (phoneViewerActive && tool !== "note") return;` | `if (phoneViewerActive) return;` |

`:18410` の直後にはゲストの矢印の分岐があるが、**この行が先に効くのでスマホの挙動は
いままでどおり変わらない**（スマホのゲストはもともと矢印を描けない）。
コメントの「付箋モードだけ下へ通す」も、実態に合わせて書き換えること。

### CSS（`style.css`）

| 行 | 内容 |
|---|---|
| `:10933` | `.stage-phone-note-toggle { grid-column: 6; }` → **規則ごと削除** |
| `:10940` | 段の指定の並びから `.stage-phone-note-toggle` を外す |
| `.stage-phone-toolbar` の `grid-template-columns` | `48px 44px minmax(0, 1fr) 44px 48px 60px` → **`48px 44px minmax(0, 1fr) 44px 48px`**（末尾の60pxを落とす） |

列1〜5の割り当て（`load`=1 / `scene-prev`=2 / `scene-current`=3 / `scene-next`=4 /
`info-toggle`=5）は**変えない**。空いた60pxは3列目（`minmax(0,1fr)` のシーン名）へ回り、
**シーン名が60px広く出る**。横向きの規則（`:11321` 以降のメディアクエリ）は
`.stage-phone-note-toggle` を参照していないので**影響しない**（Claudeが確認済み）。

### 対訳（`stage-i18n.js`）——★1つだけ残すこと

| 行 | 鍵 | どうする |
|---|---|---|
| `:129` | `"図にメモを追加する"` | **削除**（他に使い道が無いことを grep で確かめてから） |
| `:130` | `"メモ終了"` | **削除**（同上） |
| `:131` | `"メモを終了する"` | **削除**（同上） |
| `:783` | **`"メモ"`** | **★残す。消さないこと。** 図の下のメモ欄の見出し（`stage-sketch.js:10792` と `:11118` の `memoLabel.textContent = tx("メモ")`）と、付箋の既定文（`:8317`）が使っている |

## 触ってはいけないもの

- `drawNotes` / `normalizeNote` / `sc().notes` — 付箋の描画とデータ（**表示は残す**）
- 図の下のメモ欄（`memoInput` / `memoLabel` / `sc().note`）
- PC・iPad（`tabletPwaActive`）側の付箋の道具、ツールバー、`setTool` の他の分岐
- `stage-session.js` / `worker.js` / `mac-app/` 配下（**ゼロ変更**）
- 版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行。**発注元がやる。**

## 共通の制約

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。

## 完了条件

1. `node --test tests/` 全通過（現状586件）。
2. **既存テスト `tests/stage-phone-viewer.test.mjs` を直す**（消した機能を守っている
   ため、直さないと落ちる）。少なくとも次の箇所:
   - `:55` `noteToggle\.addEventListener\("click"` の照合 → **削除**
   - `:88-90` 対訳表の `"図にメモを追加する"` `"メモ終了"` `"メモを終了する"` → **削除**
   - `:250` `stage-phone-note-toggle \{ grid-row: 1; \}` の照合 → **削除**
   - `:254` `phoneViewerActive && nextTool !== "note"` → **新しい形へ**
   - `:255` `phoneViewerActive && tool !== "note"` → **新しい形へ**
   - `:295` `memoInput` の照合（メモ欄）→ **そのまま残す**（消さないこと）
3. **消えていないことのテストを足す**（`tests/stage-phone-viewer.test.mjs` へ追記）:
   - `tx("メモ")` の対訳が `stage-i18n.js` に**まだある**
   - `memoLabel` と `memoInput`（図の下のメモ欄）が**まだある**
   - `drawNotes` の呼び出しが**まだある**（付箋の表示は残っている）
   - ツールバーの列指定が**5列**になっている
4. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が検証する）。

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- `"メモ"` の対訳を残したことの確認
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。**
