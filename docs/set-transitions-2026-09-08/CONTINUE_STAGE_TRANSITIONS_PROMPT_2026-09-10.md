# 引き継ぎ用プロンプト

以下を次のCodexタスクへ、そのまま貼り付けてください。

```text
舞台スケッチの「セット転換・担当交代・人物別予定・時間不足警告」の設計を続けてください。

主担当はCodex Astraです。Claude Code Fableは、節目で必要な場合の読み取り専用の独立レビュー役です。Fableへ新しい実公演資料や個人情報を渡す場合は、既存の許可範囲を確認し、対象が増えるなら先に私へ確認してください。代替モデルをFableとして扱わないでください。

最初に次を全文読んでください。

1. /Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/AGENTS.md
2. /Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/_claude-rules/dev-preferences.md
3. /Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/set-transitions-2026-09-08/HANDOFF_STAGE_TRANSITIONS_2026-09-10.md
4. /Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/set-transitions-2026-09-08/SHARED_PEOPLE_CUES_TIME_CONTRACT_2026-09-09.md
5. /Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app/docs/set-transitions-2026-09-08/FIELD_CASE_PREPARATION_2026-09-09.md

作業場所のGitルートは次です。
/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app

現在の段階は、実際の転換1件を使った照合です。まだ実例は指定されていません。最初に、私から「作品・場面と短い段取り」または参照資料の場所を受け取ってください。所要時間が未定でも構いません。既存の企画提案・デモ・架空fixtureを実例だとみなさず、分からないことを創作しないでください。

実例を受け取ったら、次を行ってください。

- 実際の人物と、前後の出番・移動・着替え・別作業を整理する。演者と裏方を兼ねる同一人物は一人として扱う。
- 工程ごとの担当、開始条件、同時進行、途中待機、担当を保持するか離れるか、交代条件、合図、完了条件を整理する。
- 見積り、稽古での実測、未確認を分ける。未定を0秒や空き時間へ変えない。
- 共通契約v1とpeople-plan r2へ対応付け、人物の重複、待機中の拘束、転換枠に対する不足または余裕を確認する。
- 数値警告には根拠工程を付ける。見積りに基づく不足を物理的不可能と断定しない。
- 今の試作で表せない現場の条件を列挙し、製品へ接続する最小範囲と、本番用UI・UXに必要な操作を提案する。

既存のローカル試作:

- people-plan-2026-09-09-r2
  http://127.0.0.1:8936/people-plan-trial-2026-09-09.html?v=people-plan-2026-09-09-r2
- 実例確認シート
  http://127.0.0.1:8936/field-case-2026-09-09.html?v=field-case-2026-09-09-r1

ローカルサーバーが止まっている場合は、Gitルートで次を実行してください。
python3 -m http.server 8936 --bind 127.0.0.1 --directory docs/set-transitions-2026-09-08

確認済みの証拠:

- people-plan r2: Node 26/26、ブラウザ54/54、実行時エラー0。
- 実例確認シート: ブラウザ29/29、design-lint NG 0 / WARN 0。
- Fableのレビュー対象はpeople-plan r1。指摘をr2へ反映してAstra側で再検証済みだが、Fableはr2を再レビューしていない。
- これらは固定fixtureとローカルChromiumの結果。実例、稽古、実機、本番公開の証拠ではない。

重要な境界:

- 現在のHTMLは仕様・計算・警告を確かめる仮UI。本番用UI・UXの作り込みは実例照合の後。
- テスト実装は可能。本番公開、push、deploy、実公演データの変更は、私が明示するまで行わない。
- 現場GOの送受信・自動実行を追加しない。担当や工程を自動で最適化しない。
- 共通契約v1とfixtureを、製品の保存schemaとして勝手に採用しない。
- stage.htmlは生成物なので直接編集しない。
- ワークツリーには別作業の多数の未コミット変更がある。編集前に再読し、他の差分を巻き戻さない。今回の既存成果はdocs/set-transitions-2026-09-08/に閉じている。

まず現在のファイルとdirty状態を確認してください。実例の情報がまだ無ければ、製品実装へ進まず、作品・場面と短い段取りを私に1問だけ聞いてください。実例の情報を受け取れるまでにできるのは、既存成果の読み取りと準備確認までです。

この段階の完了条件は、実例1件について、人物・担当・合図・交代・所要・完了条件を確認済み／見積り／未確認に分け、重複や不足の読み方を私と照合し、製品接続の最小範囲を提案できたことです。製品実装、本番UI・UX、本番公開は次の判断として残してください。
```

