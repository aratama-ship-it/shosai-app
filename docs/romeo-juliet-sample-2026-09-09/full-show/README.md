# ロミオとジュリエット・通し上演稿

本人の「細かいところまでアイデアを入れてショー全体をつなぐ」という依頼（RJ-NOTE-0036）に基づく、3場面・10名の通し案。

- 人間向け入口：index.html / ロミオとジュリエット_通し上演稿_オフライン.html（内容は同一、単体閲覧可能）。
- 正本：score.json。追加の動き・転換・音楽・照明・仮尺はAI提案。本人の既決定と混同しない。
- 生成物：show.json（台詞参照を解決済み、キューとビートに安定ID、図の位置・役割・袖の担当を含む）。直接Stage Sketchへ取り込める形式ではない。
- 台詞は ../condensed-show/scene-02/script.json と ../scene-samples/draft.json から参照。追加台詞は new_dialogue_proposal。
- 図は既存28図を継承。結婚の二人の向きと終幕の役への戻り方だけ、本稿の別コピー上で整合。既存 layouts.json は変更しない。
- 仮尺29:05、カーテンコール案60秒は別。実測ではない。冒頭の乱戦3分の後、暗転と宴の支度20秒の案を加える。

## 再生成

このフォルダから `python3 build_show.py`。サンプルのルートからは次の順序。

1. `python3 full-show/build_show.py`
2. `python3 stage-visuals/build_visuals.py`
3. `python3 stage-visuals/build_offline.py`

舞台構成図の従来の単体HTMLには、全体構成・第2場面台本・通し上演稿の3資料が入る。
このMacのブラウザ確認には `/Users/arata/.venvs/design-lint/bin/python` と Playwright を利用。
公開・デプロイ・製品コードへの取り込みなし。小道具・照明・身体の支持や技の実装は稽古で本人が推敲する。

バックアップは backups/before-full-show/。旧稿・旧台詞・旧図を消さず保存する。
