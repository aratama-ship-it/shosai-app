# B-6 同名関数の中身比較（2026-09-09）

名前が同じ関数の本文を比べ、本当に重複コードかを判定した。

| 関数 | stage-sketch.js | 相手 | 相手ファイル | 一致率 | 判定 |
|---|---|---|---|---|---|
| `drawPerformer` | 6757行〜（32行） | 1531行〜（126行） | stage-first-person.js | 0.04 | 別物（同名のみ） |
| `onKeyDown` | 19544行〜（35行） | 2609行〜（34行） | stage-first-person.js | 0.12 | 別物（同名のみ） |
| `onPointerDown` | 19016行〜（279行） | 2473行〜（52行） | stage-first-person.js | 0.03 | 別物（同名のみ） |
| `onPointerMove` | 19346行〜（196行） | 2527行〜（48行） | stage-first-person.js | 0.03 | 別物（同名のみ） |
| `render` | 10648行〜（69行） | 948行〜（15行） | stage-venue-editor.js | 0.01 | 別物（同名のみ） |
| `finishPointer` | 18828行〜（75行） | 1431行〜（61行） | stage-venue-editor.js | 0.05 | 別物（同名のみ） |
| `onKeyDown` | 19544行〜（35行） | 395行〜（5行） | stage-set-builder.js | 0.07 | 別物（同名のみ） |

一致率は difflib.SequenceMatcher（文字列の類似度）。0.6 未満は別物とみなし、統合対象にしない。
