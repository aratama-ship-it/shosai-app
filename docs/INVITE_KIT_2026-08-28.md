# テスター招待キット（招待文の下書き＋GUEST_ACCOUNTS投入手順）

2026-08-28・Claude作成。**招待文はコピーして使う下書き**（LINE・メールどちらでも）。
【 】の中だけ差し替える。添付するPDFは
`manual/クイックガイド_2026-08-28.pdf`（日本語）／`manual/QuickGuide_2026-08-28.pdf`（英語）。

---

## 1. 招待文（日本語）

---

【お名前】さん

いま作っている舞台の道具「舞台スケッチ」のβ版を、先に触ってみてもらえませんか。
舞台の一場面を、客席から見た絵と真上から見た図で描くアプリです。

▼ 開く場所
https://stagesketch.pygmix.com/stage.html

▼ 入るための名前とパスワード（あなた専用です）
名前: 【guest名】
パスワード: 【パスワード】

はじめて開くと、短い案内がそのまま最初の一場面を作ってくれます。
添付の「クイックガイド」（90秒で読めます）だけ先に眺めてもらえたら十分です。

ひとつだけお願いがあります。描いたものは**あなたの端末の中にだけ**保存されます。
区切りのいいところで〈書き出す〉を押して、ファイルの控えを残してください。

iPadの方へ: SafariでURLを開いて、共有ボタン→〈ホーム画面に追加〉が快適です。
以後は電波のない稽古場でも開けます。

まだ作っている途中なので、うまく動かないところが必ずあります。
「ここで迷った」のひとことが一番ありがたいです。アプリの〈設定〉→〈感想を送る〉から送れます。
急ぎのとき（描いたものが消えた等）は、直接ご連絡ください。

【署名】

---

## 2. 招待文（英語）

---

Hi 【Name】,

I've been building a stage tool called Stage Sketch, and I'd love for you to try
the beta before anyone else. It draws a stage scene two ways at once — as the
house sees it, and from directly above.

▼ Where to open it
https://stagesketch.pygmix.com/stage.html

▼ Your personal sign-in
Name: 【guest name】
Password: 【password】

The first time you open it, a short built-in tour walks you through making your
first scene. The attached Quick Guide takes about 90 seconds to read — that's
all the preparation you need.

One favour: everything you draw is saved **only on your device**. Whenever you
reach a good stopping point, press Export and keep a copy as a file.

On an iPad: open the URL in Safari, then Share → "Add to Home Screen".
After that it opens even with no signal.

It's still a work in progress, so some things will misbehave. A single line like
"I got lost here" is the most useful thing you can send — Settings → "Send
feedback" inside the app. If something urgent happens (like losing your work),
message me directly.

【Signature】

---

## 3. GUEST_ACCOUNTS の投入手順（本人操作・Claudeが伴走確認）

**worker.js の検証は all-or-nothing。JSONがどこか一つでも不正だと
`misconfigured` としてサイト全体が503で止まる。** 手順の順番を守ること。

### 3-1. 名簿のJSONを作る

形式（`label` は認証に使われない将来用のメモ。表示名の既定値になる宿題B-2あり）:

```json
[
  { "user": "guest1", "pass": "＜生成した値＞", "label": "【誰に渡したか】" },
  { "user": "guest2", "pass": "＜生成した値＞", "label": "【誰に渡したか】" }
]
```

守ること（workerの検証仕様そのまま）:
- `user`・`pass` とも**空文字不可**
- `user` の**重複不可**。**本人用（SITE_USER）や旧 `GUEST_USER` と同じ名前も不可**
- 配列が空だと不正扱い

パスワードの生成はこのMacで（1件ごとに実行。**Claudeには値を見せない**）:

```bash
openssl rand -base64 12 | tr -d '+/=' | cut -c1-14
```

### 3-2. 投入する

```bash
cd "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app" && npx wrangler secret put GUEST_ACCOUNTS
```

プロンプトに**JSON全体を1行で**貼り付ける（ログに残らない）。

### 3-3. 直後の確認（ここからClaude）

投入したら「入れた」と一言ください。Claudeが即座に確認します:
1. `/sign-in` が **503になっていない**こと（JSON不正の即検知）
2. でたらめな資格情報が**正しく弾かれる**こと
3. 境界401が崩れていないこと

そのうえで、**新しいguestの1件でご本人がログイン確認**（Claudeはパスワードを
扱わないため、この1手だけお願いします）。

### 3-4. 後片付け（任意・確認が取れてから）

- 旧ゲスト口座を止める: `npx wrangler secret delete GUEST_USER` と `GUEST_PASS`
  （残す間は「一人だけ止める」ができない。発注書J手順4）
- `SITE_PASS` の入れ替えは**2026-08-27に「しない」と本人判定済み**（判定資料）。
  ここでは求めない。

### 3-5. 運用メモ

- 一人を止めたいとき: JSONからその行を消して 3-2 を再実行（全体を入れ直す方式）
- 名簿の控えは**パスワードを含めてリポジトリに置かない**。1Password等へ
