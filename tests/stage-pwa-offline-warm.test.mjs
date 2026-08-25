// ホーム画面PWAのオフラインを守る回帰テスト（2026-08-24）。
//
// 背景: 実機のiPadで、ホーム画面へ追加したPWAだけオフラインが効かなかった。
//   ・同じ端末のSafariタブでは機内モードでも表示できた
//   ・PWAでは起動時に認証を聞かれた（＝Safariとは別の認証文脈を持っている）
//   ・PWAでも認証を入れればページは表示できた（＝ページ文脈の取得には認証が効いている）
// ここから、Service Worker文脈の取得にだけ認証が乗らず、install中の
// cache.addAll(APP_SHELL) が全件401で拒否され、SWのインストールごと落ちていたと判断した。
// addAll は1件でも失敗すると全体を捨てるため、部分的な失敗が全損になる。
//
// 対処: installでは取れたものだけ保存し、足りない分をページ側（認証が効く文脈）が補う。
// このテストは、その構造がのちの改修で元に戻らないよう固定する。

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const swSource = await readFile(new URL("stage-sw.js", root), "utf8");
const pwaSource = await readFile(new URL("stage-pwa.js", root), "utf8");

/* コメントを外してから中身を見る。
   経緯を説明するコメントの中に addAll の名が出てくるため、素のまま検索すると
   「戻していない」ことを確かめられない（実際にこのテスト自身が最初それで落ちた）。 */
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const swCode = withoutComments(swSource);

test("installでcache.addAll(APP_SHELL)へ戻していない", () => {
  // addAll は1件でも失敗すると全体を拒否する。ここが元に戻るとオフラインが再び死ぬ。
  assert.ok(
    !/cache\.addAll\(/.test(swCode),
    "cache.addAll は使わない（1件の401で全損するため）",
  );
  // 説明を消した人が意図まで消さないよう、経緯のコメント自体も残っていることを見る
  assert.match(swSource, /addAll/, "なぜaddAllを避けるのかの説明を残すこと");
});

test("installは取れたものだけ保存し、失敗しても完了する", () => {
  assert.match(
    swSource,
    /Promise\.allSettled\(APP_SHELL\.map\(\(url\) => putCleanCopy\(cache, url\)\)\)/,
    "APP_SHELLを1件ずつ入れ、失敗を握り潰して先へ進むこと",
  );
  assert.match(swSource, /skipWaiting\(\)/);
});

test("保存物からリダイレクトの印を剥がしている", () => {
  /* ★実機で起きた「キャッシュは有るのに開けない」の再発防止（2026-08-24）。
     配信層は /stage.html を /stage へ307で送る。この経路の応答をそのまま保存すると
     redirected の印が付き、ブラウザは画面遷移への応答に印付きの保存物を使うことを
     仕様で拒む——結果、オフラインで「ページを開けません」になる。
     保存する側（SWのinstallとページ側の充填）の両方で印を剥がすこと。 */
  for (const [name, source] of [["stage-sw.js", swSource], ["stage-pwa.js", pwaSource]]) {
    assert.match(source, /response\.redirected/, `${name}: redirected を確認していること`);
    assert.match(
      source,
      /new Response\(body, \{\s*status: 200,/,
      `${name}: 印を剥がした写しを作っていること`,
    );
  }
  // navigate経由の保存も、印の無い応答だけに限ること
  assert.match(swCode, /response\.ok && !response\.redirected/);
});

test("リダイレクト後の /stage も同じ画面として扱う", () => {
  // 入口は /stage.html だが、307で /stage に変わった後の再訪も拾えるようにする
  assert.match(swCode, /STAGE_PATHS/);
  assert.match(swCode, /new URL\("\.\/stage", self\.location\.href\)\.pathname/);
});

test("navigateはnavigator.onLineで判定しない", () => {
  /* ★これは実際に2回起こした不具合の再発防止（同じ場所で2種類の壊し方をした）。
     ①常に横取り: 401をそのまま返しブラウザの認証UIの機会を奪った（クッキー移行前）。
     ②self.navigator.onLine で判定: このAPIは実際の通信可否を保証しない。iOS実機で、
       Wi-Fiを繋いだままの機内モードでは動いたが、Wi-Fiまで切った本当のオフラインでは
       true のままと判定され、Service Workerが何もせずブラウザの標準オフライン画面が出て、
       PWAが開かなくなった（2026-08-24、本人の実機検証で発覚）。
     navigator.onLine を使わず、実際にfetchを試みて結果で判断すること。 */
  const navigateBlock = swCode.slice(
    swCode.indexOf('request.mode === "navigate"'),
    swCode.indexOf("APP_SHELL_URLS.has(request.url)"),
  );
  assert.ok(navigateBlock.length > 0, "navigateの分岐が見つかること");
  assert.ok(
    !/navigator\.onLine/.test(navigateBlock),
    "navigator.onLine で通信可否を判定しないこと",
  );
  // まずネットワークを試し、届いた応答（200でもクッキー未認証時の302→200でも）をそのまま返す
  assert.match(navigateBlock, /fetch\(request\)\.then\(/, "まずネットワークを試すこと");
  // ネットワークが本当に届かない（fetch自体が失敗する）ときだけ保存版へ落ちる
  assert.match(
    navigateBlock,
    /\.catch\(\(\) => caches\.match\("\.\/stage\.html"\)\)/,
    "fetch失敗時だけ保存版から返すこと",
  );
});

test("画面本体はページ側が毎回入れ直す", () => {
  // stage.html には版番号が付かない。SWがオンライン時に更新しなくなったぶん、
  // ここで入れ直さないと保存版が古いままになる。
  assert.match(pwaSource, /const alwaysRefresh = url === "\.\/stage\.html";/);
  assert.match(pwaSource, /if \(!alwaysRefresh && await cache\.match\(url\)\) continue;/);
});

test("Service Workerが保存先と一覧をページへ渡せる", () => {
  // 一覧をページ側へ書き写すと版がずれるので、出どころはstage-sw.jsひとつに保つ。
  assert.match(swSource, /addEventListener\("message"/);
  assert.match(swSource, /type !== "app-shell"/);
  assert.match(swSource, /postMessage\(\{ cacheName: CACHE_NAME, urls: APP_SHELL \}\)/);
});

test("ページ側が登録のあとにキャッシュを補う", () => {
  assert.match(pwaSource, /async function warmAppShellCache\(\)/);
  assert.match(
    pwaSource,
    /register\("\.\/stage-sw\.js", \{ scope: "\.\/" \}\)\s*\.then\(\(\) => warmAppShellCache\(\)\)/,
    "登録が済んでから充填すること",
  );
});

test("ページ側の取得は認証が乗る形で行う", () => {
  assert.match(pwaSource, /navigator\.serviceWorker\.ready/);
  assert.match(pwaSource, /new MessageChannel\(\)/);
  assert.match(
    pwaSource,
    /fetch\(url, \{ credentials: "same-origin" \}\)/,
    "同一オリジンの資格情報を付けて取ること",
  );
  assert.match(pwaSource, /if \(!response\.ok\) continue;/, "失敗した応答を保存しないこと");
});

test("充填が止まらないよう守りが入っている", () => {
  // 返事が来ない環境で待ち続けないための時間切れ
  assert.match(pwaSource, /setTimeout\(\(\) => resolve\(null\), \d+\)/);
  // 1件の失敗で残りを止めない
  assert.match(pwaSource, /catch \(_\) \{/);
  // すでにあるものは取り直さない（画面本体だけは例外。別のテストで見ている）
  assert.match(pwaSource, /await cache\.match\(url\)\) continue;/);
});

test("APP_SHELLの版がstage.htmlの読み込みと揃っている", async () => {
  // 版がずれると、保存したものと実際に要求されるものが食い違い、オフラインで欠ける。
  const stageHtml = await readFile(new URL("stage.html", root), "utf8");
  const shell = new Map();
  for (const [name, ver] of swSource.matchAll(/"\.\/([^"?]+)(?:\?v=(\d+))?"/g)) {
    shell.set(name, ver);
  }
  const mismatches = [];
  for (const [name, ver] of stageHtml.matchAll(/(?:src|href)="([^"?]+)(?:\?v=(\d+))?"/g)) {
    if (!/\.(?:js|css)$/.test(name)) continue;
    if (!shell.has(name)) continue;          // APP_SHELL未収録は別の判断（stage-shows.local.js）
    if (shell.get(name) !== ver) mismatches.push(`${name}: html=${ver} sw=${shell.get(name)}`);
  }
  assert.deepEqual(mismatches, [], `版の不一致: ${mismatches.join(" / ")}`);
});
