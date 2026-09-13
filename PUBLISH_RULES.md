# 舞台スケッチ：公開（push）の手順

本人決定・2026-09-14（**案C＝用途で使い分ける**）。この文書が公開手順の**正本**。
既存ユーザー保護の規則は [AGENTS.md](AGENTS.md) と [BETA_UPDATE_SAFETY.md](BETA_UPDATE_SAFETY.md) が正本で、
この文書はそれを**弱めない**。ベータ配布には引き続き `tools/check-beta-update-safety.py` が要る。

決めた経緯と、この規則を作るきっかけになった事故の全数調査:
`docs/publish-audit-2026-09-14/index.html`。

## 前提：このリポジトリの事情

- **`aratama-ship-it/shosai-app` は公開（public）リポジトリ。** 出したものは誰でも読める。
- **複数のセッションが同じ作業ツリーを同時に編集している。** `git status` には常に
  自分と無関係な変更が並ぶ。他人の書きかけを巻き込む事故が起こりうる。
- **配信経路は2つある。** GitHub Pages（main の内容をそのまま配る）と
  Cloudflare Worker（β版。push では更新されない）。`.github/workflows` は Pages のビルド以外に無い。

## 共通ルール（経路A・Bとも必ず守る）

1. **公開に `rebase` を使わない。** `commit` と `push` だけで足りる。
   rebase は作業ツリーを一時的にベースコミットへ戻すので、その瞬間にファイルを読んだ
   並行セッションが「自分の変更が消えた」と誤認する。**2026-09-14 01:34 に実際に起きた。**
   `merge` `pull` `reset --hard` も同じ理由で使わない。
2. **push の親は必ず `git fetch origin main` 直後の `origin/main`。** 他セッションのコミットを巻き戻さない。
3. **JS/CSS を変えたら `?v=` を上げる。** 上げ忘れると利用者に古いキャッシュが出続ける。
4. **公開後は curl で実物を確認する。** ローカルHEAD＝公開版と決めつけない。
   Pages のビルド完了（`built`）を待ってから測る。
5. **`* 2.*`（iCloud の同期競合コピー）は消さない。** `.gitignore` で除外済みなので公開はされない。
   片付けは本人の承認を得てから。

## 経路A — 試作・docs の小さな反復（既定）

照明試作のように、**数ファイルを何度も出す**場合。作業ツリーとローカル main に一切触らない。

```bash
cd "<repo>"
git fetch origin main -q
D=docs/light-rig-design-2026-09-11/prototype
export GIT_INDEX_FILE=$(mktemp /tmp/rigidx.XXXXXX) && rm -f "$GIT_INDEX_FILE"
git read-tree origin/main
for f in app.js index.html rig-engine.js; do
  H=$(git hash-object -w "$D/$f"); git update-index --cacheinfo 100644,"$H","$D/$f"
done
TREE=$(git write-tree); PARENT=$(git rev-parse origin/main)
SHA=$(git commit-tree "$TREE" -p "$PARENT" -m "メッセージ")
REF="refs/heads/main"; git push origin "${SHA}:${REF}"
```

- **`"${SHA}:${REF}"` と必ず波括弧で書く。** Bashツールはzshなので `"$SHA:refs/..."` と書くと
  `:r` がzshの修飾子として食われ、`...efs/heads/main` になって push が失敗する（実際に踏んだ）。
- **変更したファイルだけ** `update-index` する。差分確認は
  `git hash-object <file>` と `git rev-parse origin/main:<path>` の比較で行う。
- Pages を起こしてポーリング:
  `gh api -X POST repos/aratama-ship-it/shosai-app/pages/builds` →
  `gh api repos/aratama-ship-it/shosai-app/pages/builds/latest --jq .status` が `built` になるまで。

## 経路B — 製品リリースなど、ファイル数が多い公開

1件ずつ `update-index` するのが現実的でない規模のとき。**作業ツリーを触るので、先に中身を確定させる。**

### 必ず先に実行する

```bash
bash tools/pre-publish-check.sh
```

読むだけで何も変更しない。次を出す。

| 節 | 見るもの |
|---|---|
| 0 | rebase / merge の途中でないか |
| 1 | **いま push すると出るファイルの全数と内訳**、配信物・製品本体の一覧 |
| 2 | **直近5分に更新されたファイル**＝他セッションが書き込み中の疑い |
| 3 | `.gitignore` の除外が破られていないか、競合コピーの件数 |
| 4 | 鍵・トークンらしき文字列の混入 |
| 5 | テストが通るか |

**`✗` が1つでも出たら push しない。**（終了コード1）。
`✗` の意味を潰してから、または該当ファイルを外してからやり直す。

> 2026-09-14 02:01 の実測では、この時点で一括publishすると **2,283ファイル**（うち未追跡2,279）が
> 出る状態だった。**「出るものを見てから出す」がこの経路の要**。

### 手順

```bash
git fetch origin main -q
# 出すものだけを明示して add する（git add -A は使わない）
git add <出すファイル…>
git status --short            # ここで最終確認
git commit -m "<何を出すかがわかるメッセージ>"
git push origin main          # rebase しない。失敗したら fetch し直して原因を見る
```

- **`git add -A` は使わない。** 未追跡2,000件超を巻き込む。
- **コミットメッセージは内容を書く。** `Publish latest Stage Sketch updates` のような
  汎用文だと、後から何を出したのか追えない。
- push が `non-fast-forward` で弾かれたら、**rebase せず**に `git fetch` して
  何が入ったかを読み、必要なら経路Aで出し直す。

### 製品本体・配信物を含む場合の追加

`pre-publish-check.sh` の節1が「配信物・製品本体」を挙げたら、
[AGENTS.md](AGENTS.md) / [BETA_UPDATE_SAFETY.md](BETA_UPDATE_SAFETY.md) の規則が効く。
本人へ互換性警告を出し、ベータへ反映する場合は
`tools/check-beta-update-safety.py` を通すまで配布しない。

## 迷ったとき

**経路Aを選ぶ。** 遅いが、他人の作業を壊さない。
経路Bは「経路Aだと明らかに非現実的な規模のとき」だけに使う。
