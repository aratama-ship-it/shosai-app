# 発注書P: ログインしている人を画面に出し、別の人が入ったら初期状態で開く

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-28。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 本人指示（2026-08-28）

> ログインした際にログインした人の情報はゲスト番号であったりっていうのを画面内の
> どこかに表示しておいて欲しいです。まぁ誰がログインしていると言う情報が出るように
> してください。題のベタ板の右側あたりで大丈夫です。小さくて大丈夫です。
> また新しくログインした人、前回の設定が反映されていない状態、パネルは全て閉じた
> 状態で出してほしいです。

要するに2つ。**①いま誰で入っているかを小さく出す ②別の人が入ったら初期状態で開く。**

## Claudeが調べて確認済みの事実（再調査不要）

行番号は2026-08-28・commit `e927ca6` 時点。

### 1. 利用者名はサーバーだけが知っている（画面側からは読めない）

`worker.js:222` のクッキーは **`HttpOnly`** なので JavaScript から読めない。
`worker.js:621` 付近で `cookieUser`（＝`readSessionToken` の戻り＝利用者名）が
分かっているが、`serveAuthenticatedRequest(request, env)` へは渡していない。
**→ 利用者名を返す小さな入口をサーバーに足すのが唯一の筋。**
`HttpOnly` を外して画面から読ませる案は**採らないこと**（トークンを盗まれやすくなる）。

### 2. 認証を通る経路は2つある。どちらでも名前が要る

- ①クッキー（`worker.js:618-623`）→ `cookieUser`
- ②Basic認証（`worker.js:627-632`）→ `basicAccount[0]`

**両方の経路で同じ名前が返るようにすること。** 片方だけだとMCPやcurl経由で表示が消える。

### 3. 置き場所と意匠は既にお手本がある

`index.html:299` の題（`<h1 id="stage-sketch-title">`）の中に、
`.stage-session-guest-badge`（「ゲスト（閲覧＋矢印）」）が既にある。
CSSは `style.css:12113`。**11px・真鍮色・左に2pxの線・字間0.18em**。
2026-08-26に本人が「縁も影も持たせず、この画面の小さな標しの作法に揃える」と決めたもの。
**新しい表示もこの作法に合わせる**（別の見た目を発明しない）。
スマホの題の帯にも同じ要素が移される仕組みがある（`style.css:10863`）。

### 4. パネルの開閉と配置は `state.layout` にある

- `PANELS`（`stage-sketch.js:3075`）＝ 12枚のパネルのid
- `state.layout.collapsed[id]`（`:11901`）が開閉、`cols`/`order` が配置
- `defaultLayout()`（`:3077`）が既定値

### 5. ★localStorageの鍵。消してよいものといけないものが混ざっている

| 鍵 | 中身 | 別の人が入ったとき |
|---|---|---|
| `shosai-stage-sketch-v1`（`:1149`） | **いま開いているショー** | **消さない** |
| `shosai-stage-shows-v1`（`:1150`） | **端末に置いた全ショー** | **絶対に消さない** |
| `shosai-stage-shows-broken-v1` | 壊れた棚の退避 | 消さない |
| `shosai-stage-prefs-v1`（`:2823`） | 道具の設定（矢印の太さ等） | 初期化してよい |
| `shosai-stage-lang` | 言語 | **消さない**（英語の人が毎回日本語に戻る） |
| `shosai-stage-tour-v1` | 使い方ツアーの既読 | 初期化してよい |
| `shosai-stage-models-v1` | 作ったセットのモデル | 消さない |

**★ショーのデータを消すと本人の作業が失われる。この発注で消してよいのは
「見た目の設定」だけ。** 迷ったら消さない側へ倒すこと。

## P-1. サーバー: いま誰かを返す入口を足す（`worker.js`）

`GET /whoami` を認証の内側に作り、JSONで返す:

```json
{"user": "guest1"}
```

- `serveAuthenticatedRequest(request, env)` に**利用者名を引数で足す**
  （`serveAuthenticatedRequest(request, env, user)`）。呼び出し元2箇所
  （クッキー経路・Basic認証経路）の両方から渡す。
- `/whoami` は `handleSessionRequest` より前でも後でもよいが、
  **`env.ASSETS.fetch` へ落とす前に処理すること**。
- ヘッダに **`Cache-Control: no-store`** を必ず付ける
  （付けないとPWAやブラウザが古い利用者名を配り続ける）。
- `GET` と `HEAD` 以外は405で返す。
- **`stage-sw.js` の `APP_SHELL` へ入れないこと**（キャッシュさせない）。
- **公開リスト（`isPublicAppShellAsset`）へは絶対に足さないこと。**
  未ログインなら、いままでどおり401/302になるのが正しい。

## P-2. 画面: 誰で入っているかを題の右に出す

`index.html` の `<h1 id="stage-sketch-title">` の中、既存のゲスト目印の**隣**へ足す:

```html
<span class="stage-session-whoami" id="stage-session-whoami" role="status" hidden></span>
```

- 中身は **`guest1` のような利用者名そのもの**。前置きは短く付けてよい
  （例: `guest1 でログイン中`）。訳は `stage-i18n.js` へ足すこと。
- CSSは `.stage-session-guest-badge`（`style.css:12113`）と**同じ作法**で作る。
  11px・`var(--brass)`・左に2pxの線・字間0.18em・`white-space: nowrap`。
  **既存の規則をコピーして別クラスにする**（既存クラスを共用に書き換えない。
  ゲスト目印は出る条件が違うので、片方を変えるともう片方が巻き添えになる）。
- ゲスト目印と**並んだときに窮屈にならないこと**。両方出る場面がある
  （ゲストで参加中は「ゲスト（閲覧＋矢印）」と「guest1でログイン中」が並ぶ）。
- 取得できなかったとき（`/whoami` が失敗・オフライン）は **`hidden` のままにする。**
  「不明」等を出さない。出ないだけなら害がないが、誤った名前を出すと混乱する。
- スマホ・iPad PWAでも同じ要素が使われるので、
  `style.css:10863` 付近のスマホ題の帯の扱いに倣って収まるようにすること。

## P-3. 別の人が入ったら、初期状態で開く

**判定のしかた**: `localStorage` に「このブラウザで前回見ていた利用者名」を持つ。
新しい鍵 `shosai-stage-last-user-v1` を使う。

```
起動時に /whoami を取得
  ├ 取れなかった → 何もしない（いままでどおり）
  ├ 保存された名前が無い（初めて）→ 名前を保存するだけ。初期化はしない
  ├ 保存された名前と同じ → 何もしない
  └ 保存された名前と違う → ★初期化してから、新しい名前を保存
```

**「初期化」でやること（この3つだけ）**:

1. `state.layout` を `defaultLayout()` へ戻す。**結果としてパネルは全部閉じた状態にする**
   （`defaultLayout()` の `collapsed` が空なら「全部開く」になるので、
   **この初期化のときだけ `PANELS` 全部を `collapsed = true` にする**。
   本人指示の「パネルは全て閉じた状態」はこれ）。
2. `shosai-stage-prefs-v1` を消す（道具の設定が既定へ戻る）。
3. `shosai-stage-tour-v1` を消す（使い方ツアーを新しい人へ出す）。

**やってはいけないこと**:
- `shosai-stage-sketch-v1` / `shosai-stage-shows-v1` / `shosai-stage-shows-broken-v1` /
  `shosai-stage-models-v1` を消す、または書き換える。**ショーが失われる。**
- `shosai-stage-lang` を消す。
- `localStorage.clear()` を呼ぶ。**上の禁止をまとめて破ることになる。**

**タイミング**: 画面を組み立てる前に初期化を終えること。
一度描いてから閉じ直すと、パネルが開いた状態が一瞬見えてしまう。
`/whoami` は非同期なので、**取得を待ってから初回描画する**か、
初期化が要ると分かった時点で組み直すかのどちらかにする。どちらにしたか報告すること。

## 触ってはいけないもの

- `HttpOnly` クッキーの作り、トークンの署名・検証（`createSessionToken` / `readSessionToken`）
- `isPublicAppShellAsset`（公開の穴を広げない）
- `session-room.js` / `wrangler.toml` / `mac-app/` 配下（**ゼロ変更**）
- ショー・棚・モデルのデータ構造と保存経路
- 版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行。**発注元がやる。**

## 共通の制約

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。
- **版番号を直書きしているテストがある。版上げは発注元がやるので触らないこと。**

## 完了条件

1. `node --test tests/` 全通過（現状625件。**減らさない**）。
2. 回帰テストを新規 `tests/stage-whoami-badge.test.mjs` へ追加。最低限:
   - `/whoami` が `no-store` を付けて返す
   - `/whoami` が `APP_SHELL` に**入っていない**
   - `/whoami` が `isPublicAppShellAsset` に**入っていない**（未ログインで通らない）
   - `serveAuthenticatedRequest` が利用者名を受け取り、**呼び出し元2箇所の両方**が渡している
   - 初期化が消す鍵に `shosai-stage-shows-v1` / `shosai-stage-sketch-v1` /
     `shosai-stage-models-v1` / `shosai-stage-lang` が**含まれていない**
     （★この検査がいちばん大事。ショーの消失を防ぐ）
   - `localStorage.clear()` を呼んでいない
   - 初期化で `PANELS` 全部が `collapsed = true` になる
   - 取得失敗時は表示が `hidden` のまま
3. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が検証する）。

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- **P-3のタイミングをどちらの方式にしたか**（待ってから描く／組み直す）
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。**
