import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tryHtml = await readFile(new URL("../try.html", import.meta.url), "utf8");
const stageHtml = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const publicJs = await readFile(new URL("../stage-public.js", import.meta.url), "utf8");
const publicCss = await readFile(new URL("../stage-public.css", import.meta.url), "utf8");
const buildPublic = await readFile(new URL("../build_public.py", import.meta.url), "utf8");
const betaPage = await readFile(new URL("../public-beta.html", import.meta.url), "utf8");
const lpPage = await readFile(new URL("../public-lp/index.html", import.meta.url), "utf8");

test("公開体験版はPWAにならない（SW・manifest・アイコンを持たない）", () => {
  // βの stage.html には有る。公開版には無い、という対比で守る。
  assert.match(stageHtml, /stage-pwa\.js/);
  assert.doesNotMatch(tryHtml, /stage-pwa\.js/);
  assert.doesNotMatch(tryHtml, /rel="manifest"/);
  assert.doesNotMatch(tryHtml, /apple-touch-icon/);
});

test("公開体験版は共有セッションを読み込まない（認証の無いホストで /whoami が404になる）", () => {
  assert.match(stageHtml, /<script src="stage-session\.js/);
  assert.doesNotMatch(tryHtml, /<script src="stage-session\.js/);
});

test("公開体験版は is-public を付け、専用のCSSとJSを最後に読む", () => {
  assert.match(tryHtml, /<body class="is-standalone is-public">/);
  assert.match(tryHtml, /stage-public\.css\?v=\d+/);
  assert.match(tryHtml, /stage-public\.js\?v=\d+/);
  assert.ok(
    tryHtml.indexOf("stage-public.js") > tryHtml.indexOf("stage-sketch.js"),
    "stage-public.js は stage-sketch.js より後に読む",
  );
});

test("保存は残さない（2つの保存キーを消し、書き込みも止める）", () => {
  assert.match(publicJs, /STORAGE_KEYS = new Set\(\["shosai-stage-sketch-v1", "shosai-stage-shows-v1"\]\)/);
  assert.match(publicJs, /storageProto\.setItem = function/);
});

test("体験版の下地は手で組み立てず、書き出した文書を直して戻す", () => {
  // 手組みの文書は audioTracks 等が欠けて applyDocumentString がその場で落ちる（2026-09-03）。
  assert.match(publicJs, /function resetPreview\(\) \{\s*const documentValue = readDocument\(\);/);
  assert.doesNotMatch(publicJs, /kind: "shosai-stage-sketch"/);
  // 場面は3つ（切替と転換の動きを見せる）。駒のidは場面間で同じ（転換アニメが同じ人を動かす）
  assert.match(publicJs, /project\.scenes = \[scene, second, third\];/);
  assert.match(publicJs, /copy = JSON\.parse\(JSON\.stringify\(scene\)\)/);
  assert.match(publicJs, /\.slice\(0, 3\)/);
});

test("自動デモは画面に見えてから再生する", () => {
  // 背面のタブや画面外の iframe では rAF が進まず、利用者が見る前に終わってしまう。
  assert.match(publicJs, /function whenVisible\(run\)/);
  assert.match(publicJs, /IntersectionObserver/);
  assert.match(publicJs, /visibilitychange/);
  assert.match(publicJs, /whenVisible\(\(\) => playDemo\(\)\)/);
});

test("正面図のタップは左右だけ動かし、演者を宙に浮かせない", () => {
  // 俯瞰図では u,v とも動かす。正面図では u だけ渡し、奥行き(v)は変えない。
  assert.match(publicJs, /if \(mapped\) movePerformer\(selectedPerformerId, mapped\.u, mapped\.v\);/);
  assert.match(publicJs, /if \(u !== null\) movePerformer\(selectedPerformerId, u, undefined\);/);
  // 二指の最中は動かさない（ピンチを妨げない）
  assert.match(publicJs, /touches\.size >= 2/);
});

test("画面を畳むのは埋め込み（LPの帯）だけ。体験版そのものは製品版と同じ画面を見せる", () => {
  // 本人決定 2026-09-03: 使えない機能は隠さず、錠を掛けて「ある」と伝える。
  for (const selector of ["#stage-col-left", "#stage-col-right", "#stage-scene-bar", ".stage-phone-info"]) {
    const line = publicCss.split("\n").find((row) => row.includes(selector));
    assert.ok(line, `${selector} の指定がある`);
    assert.ok(line.includes("is-public-embed"), `${selector} を畳むのは埋め込みのときだけ`);
  }
});

test("二つの図は埋め込みの広い画面で横に並ぶ（連動が同時に見えることが帯の核）", () => {
  assert.match(publicCss, /@media \(min-width: 900px\)[\s\S]*?body\.is-public-embed \.stage-canvas-stack \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/);
});

test("錠は許可した操作以外へ掛ける（fail-closed）", () => {
  assert.match(publicJs, /const UNLOCKED_IDS = new Set\(\[/);
  assert.match(publicJs, /function applyLocks\(\)/);
  // 欄ごとに掛けるのが基本（一つずつ暗くすると画面全体が灰色になる）
  assert.match(publicJs, /root\.querySelectorAll\("\.stage-panel"\)/);
  // 開ける欄（会場・出るもの・選んだもの）以外へ掛ける
  assert.match(publicJs, /if \(openPanels\.has\(panel\)\) return;/);
  // 押しても本体の処理が走らないよう捕捉段階で止める
  assert.match(publicJs, /\["click", "pointerdown", "mousedown", "keydown"\]/);
  assert.match(publicJs, /addEventListener\(type,[\s\S]*?\}, true\);/);
  // 上部のボタン列も名指しではなく fail-closed（新しいボタンが素通りしないように）
  assert.match(publicJs, /"\.stage-history-actions button", "\.stage-history-actions a\[href\]",/);
  // 埋め込みには錠を出さない
  assert.match(publicJs, /if \(!embed\) \{\s*markPhoneSettings\(\);\s*watchPhoneSettings\(\);\s*applyLocks\(\);\s*watchPoseStrip\(\);\s*watchRosterLimits\(\);\s*\}/);
});

test("★個人データは公開版へ載せない（2026-09-03 公開直前に発見）", () => {
  // stage-shows.local.js は本人の実制作ショー618KB。認証の内側だから積めていた。
  assert.match(buildPublic, /"stage-shows\.local\.js"/);
  assert.match(buildPublic, /"roster-key\.local\.js"/);
  assert.doesNotMatch(tryHtml, /<script src="stage-shows\.local\.js/);
  assert.doesNotMatch(tryHtml, /<script src="roster-key\.local\.js/);
});

test("★配信フォルダは「集めたものだけを配る」形にする（許可リストに頼らない）", () => {
  // wrangler の directory を . にすると、名簿・設計文書・SQLまで配ってしまう。
  assert.match(buildPublic, /DIST = HERE \/ "public-dist"/);
  assert.match(buildPublic, /shutil\.rmtree\(DIST\)/);
  assert.match(buildPublic, /def collect_dist/);
});

test("体験版の内部処理は自分の錠を踏まない", () => {
  // タップで演者を選ぶとき、左列の名前ボタンを押して選択を同期している。
  // その左列は錠の対象なので、素通しにしないと舞台を触っただけで
  //「製品版で使えます」が出る（2026-09-03 実機確認で発見）。
  assert.match(publicJs, /let internalClick = false;/);
  assert.match(publicJs, /internalClick = true;\s*try \{ castButtons\[castIndex\]\.click\(\); \}\s*finally \{ internalClick = false; \}/);
  assert.match(publicJs, /const swallow = \(event\) => \{\s*if \(internalClick\) return;/);
});

test("公開版は「体験版」であることを明示し、「β版」とは名乗らない", () => {
  // 「β版」は招待制の製品版を指す言葉。誰でも開ける公開版に出ていると取り違えのもと。
  assert.match(publicJs, /function markAsPreview\(\)/);
  assert.match(publicJs, /\.stage-beta, \.stage-phone-title-beta/);
  assert.match(publicJs, /badge: "体験版"/);
  assert.match(publicJs, /badge: "Preview"/);
  assert.match(publicJs, /document\.title = text\.title;/);
  // 埋め込みでも札を出す（iframeを切り取った絵にも残るように）
  assert.match(publicJs, /stage-public-badge-chip/);
  // 共有の i18n には足さない（版上げがβのテスターまで波及するため）
  assert.doesNotMatch(publicJs, /SHOSAI_STAGE_I18N/);
  assert.ok(publicCss.includes(".stage-public-badge"), "札の見た目がある");
  // 「これは体験版です」の一行は出さない（本人指示 2026-09-03）。札とリンクで足りる
  assert.doesNotMatch(publicJs, /stage-public-note/);
});

test("姿勢は5つだけ開ける（本体は41種）", () => {
  assert.match(publicJs, /const PUBLIC_POSES = new Set\(\["stand", "walk", "kneel", "seiza", "lie"\]\);/);
  // 姿勢の帯は演者を選ぶたび作り直されるので、掛け直しを見張る
  assert.match(publicJs, /function watchPoseStrip\(\)/);
  assert.match(publicJs, /new MutationObserver\(\(\) => lockPoseTiles\(strip\)\)/);
});

test("錠の掛かった欄でも見出しを押して開け閉めできる", () => {
  // 本人指示 2026-09-03。欄の名前が読めることで製品版の広さも伝わる。
  assert.match(publicJs, /"\.stage-panel-head",/);
  assert.match(publicJs, /if \(event\.target\.closest\("\.stage-panel-head"\)\) return;/);
  /* ★2026-09-04 実測: 左右の列ごと inert にしていたため、見出しまで死んでいて
       どの欄も畳めなかった。列ごとの inert はやめ、錠の掛かった欄の「本文だけ」を inert にする。 */
  assert.doesNotMatch(publicJs, /column\.inert = true/);
  assert.match(publicJs, /const body = panel\.querySelector\("\.stage-panel-body"\);\s*\n\s*if \(body\) body\.inert = true;/);
  // 見出しは暗くせず、中身だけ暗くする
  assert.match(publicCss, /\[data-public-lock="panel"\] \{\s*opacity: 1;/);
  assert.match(publicCss, /\[data-public-lock="panel"\] > \.stage-panel-body \{\s*opacity: 0\.42;/);
});

test("「出るもの」と「選んだもの」は体験版でも使える", () => {
  /* 本人指示 2026-09-04。この二つが開いていれば
     「人を足す → 舞台の上で選ぶ → 姿勢と向きを決める」が一周そのまま試せる。 */
  assert.match(publicJs, /root\.querySelector\('\.stage-panel\[data-panel="cast"\]'\)/);
  assert.match(publicJs, /root\.querySelector\('\.stage-panel\[data-panel="inspector"\]'\)/);
  // ★「この人の視界」は stage-first-person.js が要る。配信から外しているので錠のまま
  assert.match(publicJs, /"#stage-fpv-open"/);
  assert.match(buildPublic, /"stage-first-person\.js",/);
  // 姿勢は5つのままにする（欄を開けても増やさない）
  assert.match(publicJs, /const PUBLIC_POSES = new Set\(\["stand", "walk", "kneel", "seiza", "lie"\]\)/);
});

test("体験版で置けるのは演者3人・舞台セット2つまで", () => {
  // 本人指示 2026-09-04。「出るもの」を開けたので、そこからいくらでも足せてしまう。
  assert.match(publicJs, /const PUBLIC_MAX_PERFORMERS = 3;/);
  assert.match(publicJs, /const PUBLIC_MAX_SETS = 2;/);
  // ① 押す前に止める（なぜ足せないかを出す）
  assert.match(publicJs, /add\.addEventListener\("click", guardRosterAdd, true\)/);
  assert.match(publicJs, /function pendingRosterGroup\(\)/);
  // ② すり抜けたら戻す。★行の✕は window.confirm を出すので使えない（2026-09-04 実測）
  assert.match(publicJs, /const undo = document\.getElementById\("stage-undo"\);/);
  assert.doesNotMatch(publicJs, /querySelector\("\.stage-cast-remove"\)/);
  // 数えるのは名簿。舞台裏にいる人も一人として数える
  assert.match(publicJs, /\(project\.cast \|\| \[\]\)\.length >= PUBLIC_MAX_PERFORMERS/);
  // 小道具には上限を置かない（指示になかったため）
  assert.match(publicJs, /if \(shape && !shape\.hidden\) return "props";/);
});

test("錠の掛かった欄は畳んだ状態で始める（開くことはできる）", () => {
  // 本人指示 2026-09-04
  /* ★is-collapsed を直接付けない。畳んでいるかは本体が state.layout.collapsed で持っていて、
       クラスだけ付けると次に見出しを押しても何も起きない。本体の見出しを押して畳ませる。 */
  assert.match(publicJs, /if \(head && !panel\.classList\.contains\("is-collapsed"\)\) \{/);
  assert.doesNotMatch(publicJs, /panel\.classList\.add\("is-collapsed"\)/);
});

test("製品版ベータの問い合わせは、上部から別ページへ送る", () => {
  assert.match(publicJs, /stage-public-beta-link/);
  assert.match(publicJs, /link\.href = "beta\.html";/);
  assert.match(publicJs, /betaLink: "製品版ベータ版はコチラからお問い合わせください"/);
  // 題（舞台スケッチ／体験版）のすぐ右へ、紹介ページと組にして置く（本人指示 2026-09-04）
  assert.match(publicJs, /const title = head\.firstElementChild;/);
  assert.match(publicJs, /if \(title\) title\.after\(links\); else head\.append\(links\);/);
  /* ★寄せは組（.stage-public-links）側の margin-right:auto。見出しの帯は
       justify-content: space-between なので、ばらばらに足すと間が勝手に開いて散らばる。 */
  assert.match(publicCss, /\.stage-public-links \{[^}]*margin: 0 auto 0 0;/);
  /* ★帯は既定で折り返さない。幅が足りないと操作の列ごと画面の外へ出る。体験版だけ折り返す。 */
  assert.match(publicCss, /body\.is-public:not\(\.is-public-embed\) \.stage-sketch-head \{ flex-wrap: wrap;/);
  // 配信フォルダへ運ばれる
  assert.match(buildPublic, /shutil\.copy2\(HERE \/ "public-beta\.html", DIST \/ "beta\.html"\)/);
});

test("体験版から紹介ページ（LP）へ戻れる", () => {
  // 本人指示 2026-09-04。体験版へ直接来た人には、これが何なのかを知る場所が要る。
  assert.match(publicJs, /overview\.className = "stage-public-lp-link";/);
  assert.match(publicJs, /lpLink: "紹介ページ"/);
  assert.match(publicJs, /lpLink: "Overview"/);
  /* ★いま見ている言語を持って行く。LPは ?lang= が無いと端末の言語で決めるので、
       日本語の端末で英語の体験版を見ていた人が、押した先で日本語へ戻ってしまう。 */
  assert.match(publicJs, /return `\.\/\?lang=\$\{document\.documentElement\.lang === "en" \? "en" : "ja"\}`;/);
  /* ★スマホは見出しの帯ごと出さない（実測: .stage-sketch-head が display:none）。
       上の口が届かないので、最初に出る「PCを勧める」帯にも置く。 */
  assert.match(publicJs, /overview\.className = "stage-public-phone-notice-link";/);
  assert.match(publicCss, /\.stage-public-phone-notice-link \{/);
});

test("紹介ページはβ期間中が無償であることを書き、正式版の形は未定と断る", () => {
  assert.match(betaPage, /ベータ期間中は無償です/);
  assert.match(betaPage, /正式版の提供形態は未定です/);
  assert.match(betaPage, /Free during the beta/);
  // 技術図面ではない・安全を保証しないという断りを外さない
  assert.match(betaPage, /技術図面ではなく、安全を検証したり保証したりするものでもありません/);
  // 連絡先（本人決定 2026-09-03）。pygmix.com の既存フォームへ送る。
  // ★新しいフォームを作らない——設計書 pygmix-home/CONTACT_FORM_DESIGN.md に
  //   「ツール・アプリの問い合わせ導線は /contact?category=tool&subject=... に統一する」とある。
  assert.match(betaPage, /https:\/\/pygmix\.com\/contact\?category=tool/);
  assert.match(betaPage, /<span class="contact-to">ARATA URAWA \/ PYGMIX<\/span>/);
  // フォームが開けないときの逃げ道としてアドレスも残す
  assert.match(betaPage, /mailto:info@pygmix\.com/);
  // mailto に表示名を埋め込まない（対応しないメールソフトがある）
  assert.doesNotMatch(betaPage, /mailto:[^"]*%3C/);
  assert.doesNotMatch(betaPage, /★ここに連絡先を入れてください/);
});

test("スマホの体験版では姿勢の帯を正面図の上端に出す（床の演者を隠さない）", () => {
  assert.match(publicCss, /html\.stage-phone-viewer body\.is-public \.stage-pose-strip \{\s*top: 0;\s*bottom: auto;/);
});

test("スマホ体験版: 人を足す・客席の位置・場面の切替と転換は開け、場面の追加は閉じる", () => {
  assert.match(publicJs, /function addPerformer\(\)/);
  assert.match(publicJs, /PUBLIC_MAX_PERFORMERS = 3/);
  // スマホ本体は会場の種類でなく「客席からの見え方」の帯（本人指示 2026-09-03）
  assert.match(publicJs, /function addPhoneSeatBar\(\)/);
  assert.doesNotMatch(publicJs, /function addPhoneTools\(\)/);
  assert.match(publicJs, /: phoneLike \? addPhoneSeatBar\(\)/);
  // 右上の席の地図は外す／縦にスクロールできるようにする
  assert.match(publicJs, /function hideSeatMapOnPhone\(\)/);
  assert.match(publicCss, /html\.stage-phone-viewer body\.is-public:not\(\.is-public-embed\) \{\s*position: static;/);
  assert.match(publicJs, /"stage-scene-prev", "stage-scene-next", "stage-scene-replay",/);
  assert.match(publicJs, /"\.stage-phone-scene-prev", "\.stage-phone-scene-next", "\.stage-phone-scene-current",/);
  // 場面の帯は中身を個別に錠（足す・消す・複製が開かないように）
  assert.match(publicJs, /"#stage-scene-bar button", "#stage-scene-bar select", "#stage-scene-bar input",/);
  // スマホの「ショー」「情報」は場面帯の外。名指しで閉じる
  assert.match(publicJs, /"\.stage-phone-load", "\.stage-phone-info-toggle",/);
  // スマホ設定の中身も錠（言語と閉じるだけ .stage-public-lang で残す）
  assert.match(publicJs, /"\.stage-phone-settings button",/);
  assert.match(publicJs, /function markPhoneSettings\(\)/);
  assert.doesNotMatch(publicJs, /UNLOCKED_IDS = new Set\(\[[^\]]*stage-scene-add/);
});

test("スマホ体験版では、帯を固定していたころの余白を残さない", () => {
  // 会場の帯の固定と、その分の padding は埋め込み（LP）だけ
  assert.doesNotMatch(publicCss, /html\.stage-phone-viewer body\.is-public \.stage-canvas-stack \{\s*padding-top: 54px;/);
  assert.match(publicCss, /is-public-embed \.stage-public-venue-bar \{\s*position: fixed;/);
});

test("設定は開ける。中身は錠だが、言語の切替と閉じるだけ使える", () => {
  // 本人指示 2026-09-03: 設定画面自体は錠にしない。日英の切替を残す。
  assert.match(publicJs, /"stage-prefs-btn", "stage-prefs-close", "stage-lang",/);
  assert.doesNotMatch(publicJs, /\["#stage-export", "#stage-present-btn", "#stage-prefs-btn"/);
  assert.match(publicCss, /body\.is-public \.stage-modal:not\(#stage-prefs-modal\)/);
  // 項目の一覧は本体がJSで組むので、組み直しを見張って掛け直す
  assert.match(publicJs, /new MutationObserver\(lockInside\)\.observe\(prefs, \{ childList: true, subtree: true \}\)/);
});

test("言語を切り替えたら、体験版で足した札とリンクも貼り直す", () => {
  assert.match(publicJs, /function watchLanguage\(\)/);
  assert.match(publicJs, /attributeFilter: \["lang"\]/);
  assert.match(publicJs, /if \(beta\) beta\.textContent = text\.betaLink;/);
  assert.match(publicJs, /if \(overview\) \{ overview\.textContent = text\.lpLink; overview\.href = lpHref\(\); \}/);
});

test("スマホへ最初に出す「PCを勧める」帯は、日本語と英語を並べて出す", () => {
  // この帯は言語の切替へ触れる前に出るので、端末の言語だけで選ばない（本人指示 2026-09-03）
  assert.match(publicJs, /const JA = "この体験版はスマホでは操作が限られます。PCでのご利用をお勧めします。";/);
  assert.match(publicJs, /const EN = "This preview is limited on phones\. We recommend using a computer\.";/);
  assert.match(publicJs, /notice\.append\(message, sub, close, overview\);/);
  assert.match(publicJs, /close\.textContent = english \? "Continue ／ 続ける" : "続ける ／ Continue";/);
});

test("スマホ設定は 日本語 / English / ✕ の一列にし、「端末による違い」は出さない", () => {
  // 本人指示 2026-09-03
  assert.match(publicJs, /close\.textContent = "✕";/);
  assert.match(publicJs, /el\.classList\.add\("stage-public-off"\);/);
  assert.match(publicCss, /\.stage-public-off \{ display: none !important; \}/);
  // 本体は言語切替のたび札を貼り直すので、掛け直しが要る
  assert.match(publicJs, /markAsPreview\(\);\s*\/\/[^\n]*\n\s*markPhoneSettings\(\);/);
});

test("平面図のタップは床の矩形（本体の planFit と同じ式）で u,v に換算する", () => {
  // 2026-09-03 本人指摘: canvas 全体の比率のままだと思ったところへ動かない
  assert.match(publicJs, /function publicPlanFit\(input\)/);
  assert.match(publicJs, /function planUVFromClient\(canvas, clientX, clientY, documentValue\)/);
  // 本体の planFit と同じ定数
  const stageSource = publicJs; // 比較は下の別テストで本体側と突き合わせる
  assert.match(stageSource, /const M = 24;/);
  assert.match(stageSource, /PUBLIC_WING_M = 2\.5/);
});

test("正面図のタップは、駒ごとの既存の奥行き(v)での擬似パース幅で u に換算する", () => {
  // 2026-09-03 本人指摘: 端でずれる。本体 layout() の front 枝と同じ式で幅を出す
  assert.match(publicJs, /function publicFrontHalfWidth\(canvas, documentValue\)/);
  assert.match(publicJs, /function publicFrontU\(canvas, clientX, v, documentValue\)/);
  // ★v はタップのY座標から逆算しない（駒の既存v）。理由: 客席が近い席（floorY〜bottomYが
  //   狭い）ではCSS 1pxのタップのぶれがvを大きく動かし、実測でuが最大3%以上ずれた
  assert.doesNotMatch(publicJs, /function publicFrontU\(canvas, clientX, clientY, documentValue\)/);
  assert.doesNotMatch(publicJs, /const untilt = \(y\) =>/);
  // 選択は候補ごとにその駒のvでuを出し直す（単一uを全員へ当てはめない）
  assert.match(publicJs, /const frontUFor = \(v\) => publicFrontU\(canvas, event\.clientX, v, documentValue\);/);
  assert.match(publicJs, /const u = frontUFor\(piece\.v\);/);
  // 移動は選ばれた駒自身のvを使い、奥行きは変えない
  assert.match(publicJs, /const u = frontUFor\(selected\.v\);/);
  assert.match(publicJs, /if \(u !== null\) movePerformer\(selectedPerformerId, u, undefined\);/);
});

test("正面図の幅の式は本体 layout() の front 枝と一致する（ずれたら換算が狂う）", async () => {
  // ★体験版は clientY から v を逆算しない設計（駒の既存vを使う）なので、
  //   本体にある焦点距離・傾け(tilt/untilt/focal/horizon)の行は意図的に持たない。
  //   backW/panRange は本体では書き方が違う（backWは返り値オブジェクトのプロパティ、
  //   panRangeはtilt計算の直前）ので、この2つだけは個別に式の中身を確認する。
  const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
  const normalize = (row) => row
    .replace(/\/\/.*$/, "")           // 行末コメントを外す
    .replace(/\bW\b/g, "PUBLIC_W")     // 変数名の違いを吸収
    .trim();
  const pick = (src, name) => {
    const m = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n  \\}`));
    assert.ok(m, `${name} がある`);
    return m[1].split("\n").map(normalize)
      .filter((row) => / = /.test(row) && !/===/.test(row) && /^const (span|headroom|byWidth|byHeight|pxPerM|frontW) =/.test(row))
      .join("\n");
  };
  const publicSide = pick(publicJs, "publicFrontHalfWidth");
  const stageStart = stageSource.indexOf("    // 正面図: 奥のラインと手前のラインの間で擬似パースを作る。");
  const stageEnd = stageSource.indexOf("\n    return {", stageStart);
  assert.ok(stageStart > 0 && stageEnd > stageStart, "本体の front 枝が見つかる");
  const stageSeg = stageSource.slice(stageStart, stageEnd).split("\n").map(normalize)
    .filter((row) => / = /.test(row) && !/===/.test(row) && /^const (span|headroom|byWidth|byHeight|pxPerM|frontW) =/.test(row))
    .join("\n");
  assert.equal(publicSide, stageSeg);

  // backW と panRange は個別に（式の意味が一致すること）
  assert.match(publicJs, /const backW = frontW \/ span;/);
  assert.match(stageSource, /backW: frontW \/ span,/);
  assert.match(publicJs, /const panRange = Math\.max\(0, \(frontW - PUBLIC_W\) \/ 2\);/);
  assert.match(stageSource, /const panRange = Math\.max\(0, \(frontW - W\) \/ 2\);/);
});

test("体験版の planFit は本体の planFit と式が一致する（ずれたら換算が狂う）", async () => {
  const stageSource = await readFile(new URL("../stage-sketch.js", import.meta.url), "utf8");
  const pick = (src, name) => {
    const m = src.match(new RegExp(`function ${name}\\(input\\) \\{([\\s\\S]*?)\\n  \\}`));
    assert.ok(m, `${name} がある`);
    // 返り値の形だけ違う（本体は {stage, pxPerM}、体験版は stage そのもの）。式の部分だけ比べる
    // 宣言の書き方（let を1行にまとめる等）は違ってよい。代入の式だけを比べる
    return m[1].split("\n").map((row) => row.trim())
      .filter((row) => / = /.test(row) && !/===/.test(row) && /sw|top|bottom|byWidth|byHeight|outside|ratio|M = 24/.test(row))
      .join("\n");
  };
  assert.equal(pick(publicJs, "publicPlanFit"), pick(stageSource, "planFit"));
});

test("スマホ横向きでは、リンクと道具列を出さず、右レールに ＋人・客席・設定 を置く", () => {
  // 2026-09-03 本人指摘: 横向きで上下が切れる／下の帯は右のメニューへまとめる
  assert.match(publicCss, /@media \(orientation: landscape\) \{[\s\S]*?\.stage-public-links \{ display: none; \}/);
  assert.match(publicCss, /@media \(orientation: landscape\) \{[\s\S]*?\.stage-public-phone-tools \{ display: none; \}/);
  assert.match(publicCss, /\.stage-public-rail \{ display: none; \}/);
  assert.match(publicJs, /function addPhoneRail\(\)/);
  assert.match(publicJs, /toolbar\.insertBefore\(rail, sceneBar\)/);
  // 客席は選択肢（ポップオーバー）、設定は本体の歯車を裏で押す
  assert.match(publicJs, /popover\.className = "stage-public-popover";/);
  assert.match(publicJs, /document\.querySelector\("\.stage-phone-title-settings"\)/);
  assert.match(publicJs, /"\.stage-public-rail",/);
});

test("LPが入口、体験版は /try.html。動画も配信フォルダへ運ぶ", () => {
  // 2026-09-04: LPを作ったので入口を入れ替えた
  assert.match(buildPublic, /shutil\.copy2\(HERE \/ "public-lp" \/ "index\.html", DIST \/ "index\.html"\)/);
  assert.match(buildPublic, /shutil\.copy2\(OUT, DIST \/ "try\.html"\)/);
  assert.match(buildPublic, /for name in \("hero-ja\.mp4", "hero-ja\.webm", "hero-poster\.jpg"\)/);
  // 動画が無ければビルドを止める（黙って欠けたまま配らない）
  assert.match(buildPublic, /raise SystemExit\(f"！LPの動画がない/);
});

test("LPは承認済みの文言を使い、詩的な見出しを足さない", () => {
  assert.match(lpPage, /正面と真上、<br>\s*二つの図が連動します。/);
  assert.match(lpPage, /分けているのは舞台の形ではなく、<br>\s*客席がどこにあるかです。/);
  assert.match(lpPage, /技術図面ではなく、安全を検証したり保証したりするものでもありません/);
  assert.match(lpPage, /PC用のアプリです/);
  // 触れるデモは体験版の埋め込みモード
  assert.match(lpPage, /src="\/try\.html\?embed=1"/);
});

test("LPのいちばん上に製品の名前を大きく出す", () => {
  // 本人指示 2026-09-04。名前が小さな添え字のままだと、何のページか最初に読めない。
  assert.match(lpPage, /<h1 class="hero-name"><span data-ja>舞台スケッチ<\/span><span data-en>Stage Sketch<\/span><\/h1>/);
  assert.match(lpPage, /--fs-title:64px;/);
  assert.match(lpPage, /:root\{ --fs-title:40px;/);          // 760px以下
  // 冠はアプリ本体の見出しと同じ字にする（LPと道具で名乗りを揃える）
  assert.match(lpPage, /<p class="eyebrow">STAGE IMAGE STUDY<\/p>/);
  // h1 は名前。説明の一文は h1 ではなくする
  assert.match(lpPage, /<p class="hero-line">/);
  assert.doesNotMatch(lpPage, /<h1 class="hero-line">/);
  /* ★説明の一文は36px、右の欄は470px。40px×420pxだと日本語は「す。」が、
       英語は "Two views of one stage," が三行に割れた（2026-09-04 実測）。 */
  assert.match(lpPage, /--fs-hero:36px;/);
  assert.match(lpPage, /minmax\(0,1fr\) minmax\(0,470px\)/);
});

test("LPの名前の下に「誰が、何に使うか」を置く", () => {
  // 本人指示 2026-09-04。読む人が自分の側を見つけられるように、役どころを先に出す。
  // 一行目は「誰のためか」（本人指示 2026-09-04: This is for your team, more creativity, more training）
  assert.match(lpPage, /class="uses-lead"><span data-ja>あなたのチームのために。創る時間も、トレーニングの時間も、もっと。<\/span>/);
  assert.match(lpPage, /<span data-en>This is for your team — making time for more creativity, more training\.<\/span>/);
  assert.doesNotMatch(lpPage, /使い方は、ひとつではありません。/);
  assert.match(lpPage, /<dt><span data-ja>ディレクター<\/span><span data-en>Director<\/span><\/dt>/);
  assert.match(lpPage, /<dt><span data-ja>アーティスト<\/span><span data-en>Artist<\/span><\/dt>/);
  assert.match(lpPage, /頭の中にある絵を、目に見える形に。そのまま演者へ渡せます。/);
  assert.match(lpPage, /立ち位置は、稽古の前に。稽古場の時間を、もっと繊細なところへ使えます。/);
  /* ★二列に並べて高さを抑える。縦に積むとデモの帯が画面の外へ落ちる（2026-09-04 実測）。
     動画も 66vh→56vh へ詰めてある。 */
  assert.match(lpPage, /@media \(min-width:760px\)\{\n\s*\.uses-list\{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/);
  assert.match(lpPage, /\.hero-video video\{ max-height:56vh; \}/);
});

test("LPの出現アニメーションは、JSが動かなくても中身が見える形にする", () => {
  // 2026-09-04 実測: 非表示のタブでは IntersectionObserver が発火せず全帯が opacity 0 だった。
  // 隠すのはJSが .will-reveal を付けたときだけにし、保険の時間切れも入れる。
  assert.match(lpPage, /\.will-reveal\{ opacity:0;/);
  assert.doesNotMatch(lpPage, /\.reveal\{ opacity:0;/);
  assert.match(lpPage, /els\.forEach\(function \(el\) \{ el\.classList\.add\("will-reveal"\); \}\);/);
  assert.match(lpPage, /window\.setTimeout\(function \(\) \{ els\.forEach\(show\); \}, 2000\);/);
});

test("触れるデモの高さは中身に合わせる（画面の高さで決め打ちしない）", () => {
  // 2026-09-04 実測: iframe を height:78vh にしていたため、1280x900 でも下に191px、
  // 縦長のウィンドウではもっと大きな空白が出た。中身の高さは画面の高さではなく“幅”で決まる。
  assert.doesNotMatch(lpPage, /\.demo-frame iframe\{[^}]*height:\s*\d+vh/);
  assert.match(lpPage, /\.demo-frame iframe\{\n\s*display:block; width:100%; aspect-ratio:9\/4;/);
  // JSで実寸に合わせる。測るのは body ではなく .stage-sketch
  //（bodyの高さはiframeの高さと同じになるので、測っても今の値を読み返すだけになる）
  assert.match(lpPage, /doc\.querySelector\("\.stage-sketch"\)/);
  assert.doesNotMatch(lpPage, /frame\.style\.height = (?:doc|d)\.body\.scrollHeight/);
  // スマホ表示は体験版が画面いっぱいに広がる作りなので、合わせにいかない
  assert.match(lpPage, /doc\.documentElement\.classList\.contains\("stage-phone-viewer"\)/);
  // 幅が変わると中身の高さも変わる
  assert.match(lpPage, /window\.addEventListener\("resize", fit\);/);
});

test("LPは日英を持ち、承認済みの英語確定稿の文言を使う", () => {
  // 2026-09-04: 英語版。?lang=en / 端末の言語で切り替える（紹介ページと同じ考え方）
  assert.match(lpPage, /\[lang="en"\] \[data-ja\], \[lang="ja"\] \[data-en\]\{ display:none; \}/);
  assert.match(lpPage, /Two views of one stage,<br>moving together\./);
  assert.match(lpPage, /Formats are defined by where the audience sits,<br>not by the shape of the stage\./);
  assert.match(lpPage, /Stage Sketch is not a technical drawing, and it does not verify or guarantee safety\./);
  assert.match(lpPage, /Made for desktop/);
  // 日英の対の数が合っている（片方だけ足すと表示が欠ける）
  const ja = (lpPage.match(/data-ja/g) || []).length;
  const en = (lpPage.match(/data-en/g) || []).length;
  assert.equal(ja, en, `data-ja(${ja}) と data-en(${en}) の数が一致する`);
});

test("LPは言語をリンクと埋め込みへ引き継ぐ", () => {
  // 引き継がないと、英語で読んでいた人が「体験する」の先で日本語に戻る
  assert.match(lpPage, /var asked = new URLSearchParams\(location\.search\)\.get\("lang"\);/);
  assert.match(lpPage, /document\.documentElement\.lang = lang;/);
  assert.match(lpPage, /a\[href\$="\.html"\], a\[href\^="\/try"\]/);
  assert.match(lpPage, /frame\.setAttribute\("src", frame\.getAttribute\("src"\) \+ "&lang=" \+ lang\);/);
});
