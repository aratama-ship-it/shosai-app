# 【解決済み】再生を「再生／停止」のトグル1個にする（2026-09-14）

> ✅ **2026-09-14 01:39 に公開済み。このフォルダはもう不要（削除してよい）。**
> 公開コミットは `5fc1473`「Publish latest Stage Sketch updates」（204ファイルの一括publish）。
> live 実測で `最初へ` `停止` `0.0秒` `再生中` が消え、Space とクリックの両方でトグルすることを確認した。
> 以下は保留していた当時の記録。

**当時の状態: ローカルの `prototype/` には反映済み。GitHub Pages へは未公開。**
本人の指示（2026-09-14 01:29）で、**別セッションのバーンドア／カッターの作業が終わるまで公開を待った**。

## なぜ止めたか

公開直前に `origin/main` と比べたところ、`prototype/app.js` と `prototype/rig-engine.js` に
**私が書いていない未公開の変更**があった。内容は「バーンドア／カッター（2026-09-14 本人要望）」。
さらに `app.js` のサイズが 01:23（332,254B）→ 01:28（332,421B）と増え続けており、
**別セッションがその瞬間も書き込んでいた**。このまま push すると

- 書きかけの状態をそのまま公開してしまう
- HANDOFF.md に記載がなく、私が動作を検証していない他人の機能まで公開してしまう

ため、本人へ確認し「待つ」を選択いただいた。

## この変更の内容

`prototype/app.js` の3か所と `prototype/index.html`。詳細は `HANDOFF.md` の
「再生は『再生／停止』のトグル1個だけにした（2026-09-14 本人要望）」の節。

- `最初へ` `停止` `0.0秒` `再生中` を削除し、`#t-play` の1個だけにした
- Space の再生／停止は継続（二重発火を塞いだ）
- 幅が空いたので見出し行を2段から1段へ戻した（再生 → オン・オフ の並び）

検証済み: `node --check` OK ／ `node --test tests/stage-light-rig.test.mjs` 12/12 pass ／
ローカル実測（1440×900）で見出し34px・はみ出し0・コントラスト11.07:1・コンソールエラー0。

## ここに置いてあるもの

| ファイル | 中身 |
| --- | --- |
| `app.js.patch` | `origin/main` の `app.js` に対する私の3か所だけの差分（`patch -p0` 可） |
| `index.html.patch` | `origin/main` の `index.html` に対する差分 |
| `app.js.origin-plus-mine.js` | `origin/main` の `app.js` に3か所を当てた完成形（構文チェック済み） |

`prototype/app_backup_2026-09-14-before-transport-toggle.js` と
`index_backup_...html` は**編集前の控え**で、内容は当時の `origin/main` と完全一致していた。

## 公開するとき（別セッションの作業が終わってから）

1. **まず `app.js` に私の3か所がまだ生きているか確かめる**。別セッションが古いバッファで
   上書きしていると消えている:
   ```sh
   grep -c togglePlay prototype/app.js        # 3 なら生きている。0 なら下の patch を当て直す
   grep -c 't-home\|t-stop\|t-time' prototype/app.js   # 0 であること
   ```
2. 消えていたら `app.js.patch` を当て直す（バーンドアの変更とは行が離れているので衝突しにくい）。
3. `?v=` を上げ直す。**このフォルダの `index.html.patch` が持っている `?v=` の値は古い**ので、
   当てたあとに必ず `V=$(date +%s); sed -i '' "s/\.js?v=[0-9]*\"/.js?v=$V\"/g" index.html` を実行する。
4. 公開手順は `HANDOFF.md` §2 の**一時インデックス経由**を使う（作業ツリーとローカル main に触らない）。
   バーンドア／カッターを一緒に出すなら `rig-engine.js` も `update-index` の対象に入れる。
5. 公開後に curl で実物を確認する:
   ```sh
   curl -s "<公開URL>app.js?v=<V>" | grep -c togglePlay   # 1以上
   curl -s "<公開URL>index.html" | grep -c 't-home\|t-stop\|t-time'   # 0
   ```

公開が済んだらこのフォルダを消してよい。
