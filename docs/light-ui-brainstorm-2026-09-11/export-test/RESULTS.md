# 順0 動画書き出しテスト — 結果（2026-09-11）

テストページ: `export-test/index.html`（製品コードとは無関係の単体ページ）。

## 確認済み（Claude・アプリ内ブラウザ Chromium 152 / macOS）
- `canvas.captureStream(0)` ＋ `track.requestFrame()` ＋ `MediaRecorder(video/mp4;codecs=avc1)` で **MP4 生成・即時再生 OK**（38KB、3.03s、960×540、duration 正常）。
- 対応形式（isTypeSupported）: mp4(avc1) / mp4 / webm(vp9) / webm(vp8) / webm。
- **落とし穴1**: 最初の実装（requestAnimationFrame 駆動＋`captureStream(30)`）は、ブラウザペインが非表示のとき **0バイト**（rAF停止でフレームが供給されない）。製品では時刻 t を引数に取る描画関数を固定ステップで回し、`requestFrame()` で手動供給する（rAF に依存しない）。
- **落とし穴2**: 非表示タブでは `setInterval` も 1秒に絞られ、4秒で5フレームしか入らなかった（動画は成立するがカクつく）。書き出し中は画面を前面に保つ案内が要る。または OffscreenCanvas + Worker で描画（次段階で検討）。
- `navigator.share`（LINE等への直接共有）は macOS のアプリ内ブラウザでは不可（想定内）。ダウンロードは可。

## 未確認（本人の実機で）
- **iPad Safari** で同ページを開き「● 4秒録画」→ 再生・ダウンロード・「共有（LINE等）」→ **iPhone/Android の LINE で再生**。
  - LAN URL（このMacで `python3 -m http.server 8992` を切り離し起動中・同じWi-Fi内のみ）: `http://192.168.3.67:8992/`
  - 注意: `navigator.share` はHTTPS（安全な文脈）が必要。LAN の http では **共有ボタンは不可の表示になる見込み**。共有まで試すには HTTPS の置き場（公開URL）が要る＝本人判断。
  - iOS Safari の MediaRecorder は 14.5 以降で利用可（一般知識・要実機確認）。出力は mp4 になる見込み。
- iPad で `ダウンロード` した動画が「ファイル」アプリに入るか、写真アプリへ保存できるか。

## 製品実装への反映（spec.html §6 書き出し要件へ追記する事項）
1. 描画は `frame(tMs)` の純関数。再生・書き出しの両方が同じ関数を使う（画面と動画の不一致を防ぐ）。
2. 書き出しは `captureStream(0)` + 固定ステップ（33ms）+ `requestFrame()`。rAF に依存しない。
3. 形式は isTypeSupported の順序で試し、0バイトなら次へ。最終的に採用するのは実機で再生確認できたものだけ。
4. 書き出し中はモーダルで「画面をこのまま」と表示（タブ非表示のフレーム欠落対策）。
5. 共有は HTTPS 配信時のみ有効化。それ以外はダウンロードを既定。
