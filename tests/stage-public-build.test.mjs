import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tryHtml = await readFile(new URL("../try.html", import.meta.url), "utf8");
const stageHtml = await readFile(new URL("../stage.html", import.meta.url), "utf8");
const publicJs = await readFile(new URL("../stage-public.js", import.meta.url), "utf8");
const publicCss = await readFile(new URL("../stage-public.css", import.meta.url), "utf8");
const buildPublic = await readFile(new URL("../build_public.py", import.meta.url), "utf8");
const betaPage = await readFile(new URL("../public-beta.html", import.meta.url), "utf8");

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
  // 俯瞰図では v も渡す。正面図では undefined を渡して奥行きを変えない。
  assert.match(publicJs,
    /movePerformer\(selectedPerformerId, u, canvas\.id === "stage-plan-canvas" \? v : undefined\);/);
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
  // 会場の欄だけは開ける
  assert.match(publicJs, /if \(panel === venuePanel\) return;/);
  // 押しても本体の処理が走らないよう捕捉段階で止める
  assert.match(publicJs, /\["click", "pointerdown", "mousedown", "keydown"\]/);
  assert.match(publicJs, /addEventListener\(type,[\s\S]*?\}, true\);/);
  // 上部のボタン列も名指しではなく fail-closed（新しいボタンが素通りしないように）
  assert.match(publicJs, /"\.stage-history-actions button", "\.stage-history-actions a\[href\]",/);
  // 埋め込みには錠を出さない
  assert.match(publicJs, /if \(!embed\) \{\s*markPhoneSettings\(\);\s*applyLocks\(\);\s*watchPoseStrip\(\);\s*\}/);
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
  // 見出しは暗くせず、中身だけ暗くする
  assert.match(publicCss, /\[data-public-lock="panel"\] \{\s*opacity: 1;/);
  assert.match(publicCss, /\[data-public-lock="panel"\] > \.stage-panel-body \{\s*opacity: 0\.42;/);
});

test("製品版ベータの問い合わせは、上部から別ページへ送る", () => {
  assert.match(publicJs, /stage-public-beta-link/);
  assert.match(publicJs, /link\.href = "beta\.html";/);
  assert.match(publicJs, /betaLink: "製品版ベータ版はコチラからお問い合わせください"/);
  // 画面のいちばん上に置く
  assert.match(publicJs, /grid\.parentNode\.insertBefore\(link, grid\);/);
  // 配信フォルダへ運ばれる
  assert.match(buildPublic, /shutil\.copy2\(HERE \/ "public-beta\.html", DIST \/ "beta\.html"\)/);
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
  assert.match(publicJs, /PUBLIC_MAX_PERFORMERS = 6/);
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
  assert.match(publicJs, /if \(existing\) \{ existing\.textContent = text\.betaLink; return; \}/);
});
