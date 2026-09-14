# B-3 `isEn() ? … : …` の出現一覧（stage-sketch.js・2026-09-09 抽出）

機械抽出。文字列リテラル同士の三項演算子 154 件を表にした。式を含むもの・複数行にまたがるもの 9 件は末尾に行番号だけ載せる（手で確認）。

置換方針: 日本語をそのまま TEXT の鍵にし、英語を値にする（stage-i18n.js の既存 TEXT と同じ流儀）。`announce()` 経由のものは SAY へ。

| 行 | 日本語（鍵候補） | 英語 |
|---|---|---|
| 2902 | シーン ${n} | Scene ${n} |
| 2906 | 無題のショー | Untitled show |
| 4256 | 楽曲 | Music |
| 4325 | 不明な楽曲 | Unknown track |
| 4326 | 音なし | No music |
| 4330 | （音源なし） | (file missing) |
| 4338 | 現在のシーンの曲を一時停止 | Pause the current scene's music |
| 4339 | 現在のシーンの曲を再生 | Play music for the current scene |
| 4355 | 再生しています。 | Playing. |
| 4458 | 中身のある音源ファイルを選んでください。 | Choose a non-empty audio file. |
| 4461 | 音源は150MB以下にしてください。 | Audio files must be 150 MB or smaller. |
| 4466 | MP3、M4A/AAC、WAVの音源を選んでください。 | Use an MP3, M4A/AAC or WAV file. |
| 4599 | 不明 | unknown |
| 4600 | 別の曲を選んでいる可能性があります。\n登録: ${existingTrack.title}（${oldDuration}）\n選択: ${candidateTitle}（${fo | This may be a different track.\nRegistered: ${existingTrack.title} (${oldDuration})\nSelec |
| 4711 | 音なし | No music |
| 4722 | 不明な楽曲（音源の再接続が必要） | Unknown track (reconnect required) |
| 4739 | 尺を確認中 | duration unknown |
| 4740 | ${duration}・${assigned}シーン | ${duration} · ${assigned} ${assigned === 1 ? "scene" : "scenes"} |
| 4753 | ${track.title}を外す | Remove ${track.title} |
| 4779 | ・現在は「${other.title}」 | · currently ${other.title} |
| 4910 | 同梱された固定SceneStudyはありません。 | No fixed SceneStudy is bundled. |
| 4918 | 固定スタディ / ${available.scope.targetDurationSeconds}秒 / ${available.scope.performers}人 | FIXED STUDY / ${available.scope.targetDurationSeconds}s / ${available.scope.performers} pe |
| 4925 | 8ビートを別ショーとして開く | Open the 8 beats as another show |
| 4930 | 現在のショーは一覧に残します。固定案は別ショーで開き、配置変更はこのブラウザ内だけに保存します。 | Your current show stays in All shows. The study opens separately and saves only in this br |
| 4934 | 何が固定されているか | What is fixed? |
| 4936 | 既存計画から | FROM THE EXISTING PLAN |
| 4939 | 同梱元: ${available.sourceJson} | Bundled from: ${available.sourceJson} |
| 4954 | 固定案 / ${study.scope.targetDurationSeconds}秒 / 配置は初期仮説 | FIXED STUDY / ${study.scope.targetDurationSeconds}s / PLACEMENT DRAFT |
| 4962 | スタディのビートを切り替える | Switch study beat |
| 4968 | 秒 | s |
| 4977 | このシーンは固定8ビートの外です。上の番号を押すとスタディへ戻れます。 | This scene is outside the fixed 8 beats. Choose a beat above to return. |
| 4983 | 秒 | s |
| 4988 | 行為 | ACTION |
| 4989 | 観客に見える規則 | VISIBLE RULE |
| 4990 | このビートで変わること | CHANGE |
| 4998 | 適用した演出カード（${activeBeat.appliedCardIds.length}件） | Direction cards (${activeBeat.appliedCardIds.length}) |
| 5012 | 事実・解釈・未決定 | Facts, interpretation, open choices |
| 5014 | 既存計画から | FROM THE EXISTING PLAN |
| 5017 | 今回の制作解釈 | CREATIVE INTERPRETATION |
| 5024 | 本人確認待ち | OPEN |
| 5029 | 番号を切り替えて配置差を見ます。各ビートは別シーンで、変更はこのブラウザ内へ自動保存されます。 | Switch beats to compare positions. Every beat is a separate scene; edits auto-save only in |
| 5763 | ファイルへの書き出しはまだありません。 | No file export yet. |
| 5769 | 最後のファイル書き出し: ${stamp}（それから${n}回の変更） | Last file export: ${stamp} (${n} ${n === 1 ? "change" : "changes"} since) |
| 5799 | 変更を保存しています… | Saving\u2026 |
| 5806 | 「${state.project.title}」は保存しました。ただしショー一覧の控えが壊れているため、一覧の更新を止めています（残っている他のショーを消さないためです）。ファイル | Saved \u201c${state.project.title}\u201d. The show shelf is damaged, so shelf updates are  |
| 5811 | 「${state.project.title}」を保存しましたが、ショー一覧の控えは容量不足で更新できていません。ファイルへ書き出してください。 | Saved \u201c${state.project.title}\u201d, but the show shelf is out of space \u2014 export |
| 5816 | 「${state.project.title}」を保存しました。 | Saved \u201c${state.project.title}\u201d. |
| 5824 | この端末へ保存できませんでした。ファイルへ書き出して残してください。 | Could not save on this device. Export the show to a file to keep your work. |
| 5992 | まだありません。言葉を入れて〈映す〉を押してください。 | No screen text yet. Type a word and press Project. |
| 6019 | この文字を消す | Remove this text |
| 8791 | リング 直径${dia}m | Ring — ${dia}m across |
| 8792 | 客席の広がりは方向の目安です（${limit.m}mで${limit.label}） | The house shows direction, not distance (${limit.m}m ≈ ${tx(limit.label)}) |
| 9996 | ja | en |
| 10524 | 演者 | Performer |
| 10527 | 演者 | Performer |
| 10645 | 小道具 | Props |
| 10645 | ／ | / |
| 10659 | 、 | , |
| 10674 | ${b.dataset.toggleView === "front" ? "正面" : "平面"}の絵を${open ? "閉じる" : "開く"} | ${open ? "Close" : "Open"} the ${b.dataset.toggleView === "front" ? "front" : "plan"} view |
| 10681 | ${v.label}（${size.label}）を${VENUES.seatById(state.seat).label}から見た正面図。${counts}。背景の線${sc() | Front view of ${venueName(v)} (${sizeName(size)}) from ${seatName(VENUES.seatById(state.se |
| 10687 | ${v.label}（${size.label}）を上から見た平面図。${counts}。 | Plan view of ${venueName(v)} (${sizeName(size)}) from above. ${counts}. |
| 10850 | ja | en |
| 10856 | ／ | / |
| 10864 | 0個 | 0 lights |
| 10869 |  |  |
| 10870 | ・ | , |
| 10871 | ${lights.length}個（${detail}） | ${lights.length} ${lights.length === 1 ? "light" : "lights"} (${detail}) |
| 11931 | ${el.dataset.title ｜｜ id}の説明を出す | About ${tx(el.dataset.title ｜｜ id)} |
| 12291 | まだ誰も登録していません。名前を入れて追加してください。 | No one registered yet. Enter a name and add them. |
| 12329 | ${member.name}のプロフィール（身長など） | ${member.name} — profile (height and notes) |
| 12330 | ${member.name}のプロフィールを開く | Open ${member.name}\u2019s profile |
| 12337 | ${member.name}を名簿から外す | Remove ${member.name} from the cast |
| 12365 | ${label}の色を変える | Change the colour of ${label} |
| 12374 | ${label}の色 | Colour of ${label} |
| 12450 | ${head}${n} | ${head} ${n} |
| 12611 | モデルがありません | Model unavailable |
| 12629 | まだ何も登録していません。名前と形を選んで追加してください。 | Nothing registered yet. Enter a name, pick a kind, and add it. |
| 12645 | まだ登録していません。種類を選び、名前を入れて追加してください。 | No lights yet. Pick a type, enter a name, and add it. |
| 12660 | プリセットの組 | Preset rigs |
| 12691 | この組を外す | Remove this rig |
| 12751 | ${groupTitle(groupId)}を外します。全てのシーンからこの組の明かりが消えます。 | Remove ${groupTitle(groupId)}? The lights disappear from every scene. |
| 12824 | ${item.name}の${what}を変える（いまは ${setDimLabel(item)}） | Change the ${light ? "pool diameter" : "size"} of ${item.name} (now ${setDimLabel(item)}) |
| 12827 | ${item.name}の${what}を開く | Open the size of ${item.name} |
| 12834 | ${item.name}を舞台セットから外す | Remove ${item.name} from the set list |
| 13253 | 光の意図: ${intent} — これは候補の一覧です。意図と一致する保証はありません。組んだあとも光の意図は残ります。 | Lighting intention: ${intent} — This is a list of candidates. It is not guaranteed to matc |
| 13365 | ${label}（${items.length}灯） | ${tx(label)} (${items.length} lights) |
| 13544 | ショー一覧を更新できなかったため、消していません。 | Could not update the show shelf, so nothing was deleted. |
| 13579 | 壊れたショー一覧をファイルへ書き出しました。ダウンロードを確認できましたか？ OKを押すと一覧を作り直し、端末内の壊れたデータを消します。キャンセルすると何も変更しません。 | The damaged show shelf was sent to your downloads. Did the file save correctly? Choose OK  |
| 13583 | 書き出せる壊れたデータは残っていません。ショー一覧を作り直しますか？ いま開いているショーは残ります。 | There is no damaged data left to export. Rebuild the show shelf? The show you have open no |
| 13594 | ショー一覧を作り直しました。 | Rebuilt the show shelf. |
| 13614 | ショー一覧の更新を止めています | Show shelf updates are paused |
| 13617 | 勝手に他のショーを消さないため、壊れた一覧には書き込みません。「ショー一覧を作り直す」を押すと、壊れた元データをファイルへ書き出してから消します。先に、開いているショーもファイルへ | To avoid deleting your other shows, nothing is written to the damaged shelf. “Rebuild show |
| 13624 | ショー一覧を作り直す | Rebuild show shelf |
| 13689 | 「${template.name}」から新しいショーを作りました。前のショーは一覧に残っています。 | Created a new show from “${tx(template.name)}”. The previous show is still in All shows. |
| 13717 | 生成 ${template.roles.length}シーン・D2目安 ${template.range} | Creates ${template.roles.length} scenes · D2 guide ${tx(template.range)} |
| 13730 | エネルギー ${template.energy.join("、")} | Energy ${template.energy.join(", ")} |
| 13983 | 先にセットを組んでください | Build a set first |
| 14174 | まだ残していません。並べ終えたら名前をつけて残してください。小道具や家具を一つずつ登録するのは「出るもの」からです。 | Nothing saved yet. Lay out the set, then save it under a name. To add a single prop or fur |
| 14533 | ${Math.round(seconds)}秒 | ${Math.round(seconds)} sec |
| 14534 | 約${Math.round(seconds / 60)}分 | ~${Math.round(seconds / 60)} min |
| 14625 | セクション ${count + 1} | Section ${count + 1} |
| 14817 | ${scene.title} の名前を変える | Rename ${scene.title} |
| 14850 | 音源の再接続が必要 | Audio file needs reconnecting |
| 14998 | ${p.branchReason ｜｜ "別バージョンとして複製"}（元の版から派生） | ${p.branchReason ｜｜ "Duplicated as another version"} (derived from an earlier version) |
| 15000 | このショーの最初の版です。 | The first version of this show. |
| 15097 | ${numberText} ${scene.title}、配置 ${scene.pieces.length}、開く | Open ${numberText} ${scene.title}, ${scene.pieces.length} placed |
| 15117 | 配置 ${scene.pieces.length} | ${scene.pieces.length} placed |
| 16186 | manual/quick.html | manual/quick-en.html |
| 16749 | セクション ${count + 1} | Section ${count + 1} |
| 17133 | 稽古用JSONの変換器を読み込めませんでした。 | The rehearsal JSON converter could not be loaded. |
| 17158 | 書き出し前に直す項目が${inspection.errors.length}件あります。 | ${inspection.errors.length} issue(s) must be fixed before export. |
| 17162 | ${inspection.missingTimingScenes.length}シーンの時間が未入力です。 | ${inspection.missingTimingScenes.length} scene(s) still need durations. |
| 17166 | 稽古用JSONの検査に通りました。 | The project passed the rehearsal JSON checks. |
| 17194 | 現在のショーで該当するものはありません。 | No omitted features are currently used in this show. |
| 17398 | ファイル:「${next.project.title}」（${next.project.versionLabel ｜｜ "v1"}） ／ いま開いているのは「${state.pro | File: “${next.project.title}” (${next.project.versionLabel ｜｜ "v1"}) — currently open: “${ |
| 17404 | シーン ${a.scenes}→${b.scenes} ／ 演者 ${a.cast}→${b.cast} ／ セット ${a.sets}→${b.sets} ／ 照明 ${a.li | Scenes ${a.scenes}→${b.scenes} · Cast ${a.cast}→${b.cast} · Sets ${a.sets}→${b.sets} · Lig |
| 17416 | ファイル側にだけあるシーン: ${added.join(" ／ ")} | New in file: ${added.join(" / ")} |
| 17424 | いまのショーにだけあるシーン（置き換えると消える）: ${lost.join(" ／ ")} | Only in the current show (lost if replaced): ${lost.join(" / ")} |
| 17443 | 指示 | Request |
| 17444 | 概要 | Summary |
| 17462 | 警告 | Warnings |
| 17688 | ja | en |
| 17742 | ja | en |
| 17986 | ${venueName(v)}（${venueShortName(v)}） | ${venueName(v)} (${venueShortName(v)}) |
| 18018 | 直径${s2.width}m | ⌀${s2.width}m |
| 18031 | 直径${size.width}m | ⌀${size.width}m |
| 18033 | 寸法を入れる | enter sizes |
| 18034 | カスタム | Custom |
| 18051 | 直径 | Diameter |
| 18052 | 間口 | Width |
| 18179 | カスタムにしました。寸法を入れてください。 | Custom sizes. Enter the numbers. |
| 18302 | 奥から${(v * depth).toFixed(1)}m | ${(v * depth).toFixed(1)} m from upstage |
| 18437 | 演者${performers.indexOf(piece) + 1} | Performer ${performers.indexOf(piece) + 1} |
| 18516 | 舞台裏： | Backstage: |
| 18715 | 秒 | s |
| 20638 | 秒 | s |
| 20853 | ${value}度 | ${value}° |
| 20854 | ${value} 度/秒 | ${value} °/s |
| 20855 | ${Math.round(value)}%開 | ${Math.round(value)}% open |
| 20881 | 前の場面: ${before} → この場面: ${after} | Previous scene: ${before} → this scene: ${after} |
| 20908 | 名前・色・寸法は「${registered.name}」で決めます（${setDimLabel(registered)}）。 | Name, colour and size come from \u201c${registered.name}\u201d (${setDimLabel(registered)} |
| 20911 | 名前・色・身長は「${member.name}」で決めます（${member.heightCm}cm）。 | Name, colour and height come from \u201c${member.name}\u201d (${member.heightCm}cm). |
| 21063 | およそ${kb}KB。ショーと一緒にこの端末へ保存されます。 | About ${kb} KB, kept in this browser with the show. |
| 21251 | ja | en |
| 21259 | EN | 日本語 |
| 21264 | ja | en |
| 21283 | 秒 | s |
| 21300 | en | ja |
| 21498 | はじめる | Done |
| 21499 | 次へ | Next |
| 21500 | 閉じる | Close |
| 21501 | 戻る | Back |
| 21528 | 感想の送り先（フォーム）はまだ用意できていません。いまは直接お知らせください。 | The feedback form is not set up yet. Please tell the maker directly for now. |
| 21935 | ja | en |

## 手で確認する行（式・複数行・テンプレート）

3122, 3325, 4270, 14117, 14132, 17122, 21230, 21241, 21491
