# 発注書J: ゲストのアカウントを関係者ごとに持てるようにする（`GUEST_ACCOUNTS`）

発注元: Claude（仕様確定）。実装: Codex。検証: Claude。作成 2026-08-26。
本書はこれ単体で読んで実装できるように書く。**パスはすべて `shosai-app/` 起点。**

作業ディレクトリ:
`/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app`

## 背景（本人指示 2026-08-26）

ベータリリースでは、関係者ごとに `guest1` `guest2` `guest3` … とアカウントを分けたい。
**いま全員が同じ鍵（`GUEST_USER`/`GUEST_PASS`）を使っているため、一人だけ止められない。**

## Claudeが調べて確認済みの事実（再調査不要）

- **認証はすでに「アカウントの一覧」で動いている。** `worker.js:526` 付近で
  `accounts = [[SITE_USER, SITE_PASS], [GUEST_USER, GUEST_PASS]]` を作り、
  ログイン（`handleSignIn`）・クッキー検証（`readSessionToken`）・Basic認証
  （`matchBasicAuth`）の**すべてがこの配列を舐める**。
  トークンには利用者名が `claims.u` として入っており、`accounts.find(([user]) => user === claims.u)`
  で照合している。**アカウントを増やすだけなら、一覧の作り方を変えるだけで足りる。**
- **fail-closed の要**（P0-1）:
  - `misconfigured = pairs.some(([u, p]) => Boolean(u) !== Boolean(p))`
    ＝片方だけ設定された組は設定ミス。
  - `accounts.length === 0 || misconfigured` なら **503で止める**。
    ローカルのときだけ、かつ `misconfigured` でないときだけ素通しする。
  - **この性質を絶対に弱めないこと。** 設定ミスで「誰でも入れる」状態を作らない。

## J-1. `GUEST_ACCOUNTS` を読む

新しい Secret `env.GUEST_ACCOUNTS` を受け付ける。**中身はJSONの配列**:

```json
[
  {"user": "guest1", "pass": "……", "label": "◯◯さん"},
  {"user": "guest2", "pass": "……"}
]
```

- `user` と `pass` は**必須**。どちらも**空でない文字列**であること。
- `label` は**任意**。**このコミットでは読むだけで使わない**（将来、共有セッションの
  表示名の既定値に使う予定）。**存在しても存在しなくても正常。**
- 上記以外の項目があっても**無視してよい**（前方互換のため）。

### 設定ミスの扱い（★ここが肝。すべて「止める」側へ倒す）

`GUEST_ACCOUNTS` が**設定されているのに**次のいずれかなら、**`misconfigured` として扱う**
（＝503で止める。黙って無視して通さない）:

1. JSONとして読めない
2. 配列でない
3. 要素が0件
4. どれかの要素が オブジェクトでない／`user` か `pass` が欠けている／空文字列／文字列でない
5. **`user` が重複している**（どちらのパスワードが効くのか決められないため）
6. **`user` が `SITE_USER` と重複している**（本人用が上書きされうるため）

**未設定（`undefined` / 空文字列）は正常**——「その入口を使わない」を意味する。
既存の `GUEST_USER`/`GUEST_PASS` が両方空のときと同じ扱い。

## J-2. 既存の `GUEST_USER`/`GUEST_PASS` は残す（移行のため）

**★これを外すと、デプロイした瞬間に全員が入れなくなる。**
新しい Secret を入れる前にコードだけ先に出るため、**両方を受け付ける期間が要る。**

- `accounts` は **`SITE_*` → `GUEST_USER/GUEST_PASS`（あれば）→ `GUEST_ACCOUNTS` の各件**
  の順で並べる。
- `GUEST_USER`/`GUEST_PASS` の**片方だけ設定は、いままでどおり設定ミス**。
- `GUEST_USER` と `GUEST_ACCOUNTS` の中の `user` が**重複したら設定ミス**（J-1の5と同じ理由）。

## 触ってはいけないもの

- **fail-closed の判定と503の挙動**（弱めない。上記の設定ミスは全部503側へ倒す）
- `SITE_USER`/`SITE_PASS` の扱い、トークンの署名・期限、`readSessionToken` の照合の仕方
- ログイン画面のHTML・戻り先の検証（`next` の同一オリジン制限）
- 公開アセットの判定（`isPublicAppShellAsset`）
- `session-room.js` / `wrangler.toml` / `mac-app/` 配下（ゼロ変更）
- `stage-sketch.js` / `style.css` / `index.html` など画面側（**今回は画面を触らない**）

## 共通の制約（必ず守る）

- **既存ファイルは編集前に必ず読み直す。**
- **ファイルの削除・移動はしない。**
- **版上げ（`?v=`・`CACHE_NAME`）と `build_stage.py` の実行はしない。** 発注元がやる。
  （今回は画面side を触らないので、そもそも不要のはず）
- **秘密の値をコードやテストへ書かない。** テストはダミー文字列を使う。
- 既存テストを壊さない。落ちる場合は何を守っていたテストかを報告する。

## 完了条件

1. `node --test tests/` 全通過（現状566件。減らさない）。
2. 回帰テストを `tests/worker-session-login.test.mjs`（または新規ファイル）へ追加。最低限:
   - `GUEST_ACCOUNTS` の各アカウントで**ログインできる**／**クッキーのトークンが通る**／
     **Basic認証でも通る**
   - **一人のパスワードを変えると、その人のトークンだけが無効**になり、他の人は通る
     （既存テスト「パスワードを変えると、その口座のトークンだけが無効になる」と同じ形）
   - J-1の設定ミス6種**すべてで503**になること（1件ずつ確かめる）
   - `GUEST_ACCOUNTS` 未設定でも、いままでどおり `GUEST_USER`/`GUEST_PASS` で通ること
   - `GUEST_ACCOUNTS` と `GUEST_USER` の**両方**が設定されていて重複が無ければ、**両方通る**
   - `label` があってもなくても通ること／`label` 以外の余分な項目があっても通ること
3. ブラウザでの手動確認ができなければ「未実施」と明記（発注元が検証する）。

## 報告に含めること

- 変更したファイルと、各ファイルで何をしたか
- 完了条件それぞれの実行結果（コマンド出力を貼る）
- 設定ミス6種のうち、実装上どれが同じ経路にまとまったか
- 仕様に書かれておらず自分で判断した点
- **できなかったこと・不確かなことを隠さない。**

---

## 【発注書の外】本人が行う移行の手順（Claudeが検証しながら伴走する）

**順番を守ること。逆にすると全員が入れなくなる。**

1. このコードをデプロイする（この時点では `GUEST_ACCOUNTS` は未設定。**いままでどおり動く**）
2. `npx wrangler secret put GUEST_ACCOUNTS` でJSONを入れる
3. **新しいアカウントでログインできることを確認**（Claudeが公開URLで検証）
4. 確認できてから `npx wrangler secret delete GUEST_USER` / `GUEST_PASS`
5. **`SITE_PASS` も入れ替える**（2026-08-24に平文露出した件。ゲスト側を作り直しても
   本人用が露出したままなら意味がない）
6. 各端末で再ログイン。**Macアプリは401で自動的に聞き直す**
