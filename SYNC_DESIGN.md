# 舞台スケッチ オンライン同期・共同制作 設計書

- 作成: 2026-07-28（Claude）
- 状態: 設計のみ。実装は Supabase プロジェクト作成後
- 前提資料: `show-creative-ideas/docs/stage-sketch/2026-07-28_舞台スケッチ_改善議論まとめ_Claude×Codex.md`

## 決めごと（本人と合意済みの方針）

- 本人自身が複数端末で使い、共同制作もしたいので作る（テスター向け一般公開は後）
- **ローカルファーストは維持**。ログインしなくても全機能が使える。
  クラウドは「控え・端末間の持ち運び・共有」の追加レイヤー
- 認証はメール＋パスワード（Supabase Auth）

## 技術上の制約（重要）

**Supabase の JS SDK は使わない。** 書斎アプリには
「外部スクリプト（CDN・解析タグ・AI SDK）を持ち込まない」という実装制約がある
（名簿タブが暗号化データを扱うため。`project_shosai_app` メモリ参照）。
Supabase は素の REST で全部できるので、`fetch` で直接叩く:

- 認証: `POST {URL}/auth/v1/signup`, `POST {URL}/auth/v1/token?grant_type=password`
  → `access_token`（JWT）を localStorage に保持、`POST /auth/v1/token?grant_type=refresh_token` で更新
- データ: PostgREST `GET/POST/PATCH {URL}/rest/v1/stage_shows?...`
  ヘッダ `apikey: {anon}` と `Authorization: Bearer {access_token}`

anon key は公開してよい設計のキー（RLSが防壁）。静的ページに置ける。

## データモデル

ローカルの正本は今までどおり localStorage。クラウド側は1ショー=1行。

```
stage_shows
  id          uuid PK            -- project.id とは別。クラウド側の名前
  owner       uuid → auth.users
  title       text
  data        jsonb              -- { kind:"shosai-stage-sketch", version:3, project:{...} } 丸ごと
  revision    integer            -- 楽観ロック。push のたびに +1
  updated_at  timestamptz
  updated_by  uuid

stage_show_members                -- 共同制作
  show_id     uuid → stage_shows
  user_id     uuid → auth.users
  role        text ('editor')     -- 当面 editor のみ。owner は stage_shows.owner
  PK (show_id, user_id)

stage_invites                     -- メール招待（相手が未登録でも招待できる）
  id          uuid PK
  show_id     uuid → stage_shows
  email       text                -- 小文字化して保存
  invited_by  uuid
  created_at  timestamptz
```

RLS（詳細は setup.sql）:
- stage_shows: owner または members に入っている人だけ select/update。insert は本人。delete は owner のみ
- stage_show_members: show の owner だけが insert/delete。本人は自分の行を select/delete（退出）
- stage_invites: owner が insert。**ログイン時に自分のメール宛の招待を自分で受理**
  （`accept_my_invites()` RPC が invites → members へ移す。security definer）

## 同期の振る舞い（Phase 1: 手動 pull/push）

競合解決は MCP と同じ思想「自動マージしない。revisionで止めて人が選ぶ」。

- 保存パネルに「オンライン」欄を追加:
  - 未ログイン: メール・パスワード欄＋「登録/ログイン」
  - ログイン済み: 「このショーをクラウドへ保存（push）」「クラウドのショー一覧（pull）」「共有…」
- push: ローカルが覚えている `cloudRevision` を `PATCH ... &revision=eq.{n}` の条件付き更新で送る。
  0行更新＝誰かが先に更新 → 「別の端末（または共同制作者）が更新しています。
  ①相手の版を開く ②自分の版を別名で保存」の二択。黙って上書きしない
- pull: 一覧から選んで開く。ローカルに未pushの変更があれば同じ二択
- ローカル state に持つ追加フィールド: `cloudId / cloudRevision / lastPushAt`（棚と一緒に保存）
- 書き出し勧め帯（editsSinceExport）はクラウド保存でもリセットしてよい
  （「ファイルかクラウドか、どちらかに控えがある」が趣旨のため）

## 共同制作（Phase 1.5）

- 「共有…」でメールを入力 → stage_invites へ。相手がログインすると自動受理で members 入り
- 同時編集はしない。編集は pull → 作業 → push。revision 衝突時は上記の二択
- 場面単位の部分マージは、Codex議論の「提案レビュー」層ができてからそこに載せる
  （共有相手の版を"提案"として読み込み、場面ごとに採用——実装済みの下書き分離思想と同じ）

## Phase 2（必要になったら）

- Supabase Realtime での「相手が更新した」通知（ポーリングでも足りる）
- 提案レビュー層での場面単位マージ
- テスター一般開放（その時はレート制限・容量制限を見直す）

## 実装手順（プロジェクト作成後）

1. Supabase ダッシュボード → SQL Editor で `supabase-setup.sql` を実行
2. Authentication → Providers → Email: 有効（Confirm email はまず OFF が楽）
3. `stage-sync.js`（新規・fetchのみ・依存ゼロ）を書き、index.html / build_stage.py へ組み込み
4. URL と anon key は `stage-sync-config.js`（1行）に置く。リポジトリに入れてよい
5. 動作確認: 2ブラウザ（通常/シークレット）で push→pull→競合の三通り

## 本人にお願いすること

1. https://supabase.com でプロジェクト作成（無料枠・リージョンは Tokyo）
2. Project Settings → API から **Project URL** と **anon public key** を私へ
3. （共同制作相手が決まっていれば）相手のメールアドレス
