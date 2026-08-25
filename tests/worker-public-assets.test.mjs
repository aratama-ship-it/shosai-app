// 認証の外へ出した資源が、意図した範囲だけであることを守る回帰テスト。
//
// 背景（2026-08-23）: ホーム画面へ追加したPWAのアイコンが、黒地に「舞」の一文字を描いた
// 代替タイルになっていた。iOSがアイコンを取りに行くとき本体と同じ認証文脈を使えず、
// fail-closedのWorkerが401を返していたため。緞帳のロゴとアプリ名・色だけを認証の手前で返す
// ことにしたが、**ここは fail-closed の境界に開けた唯一の穴**なので、
// 広がっていないことを機械的に確かめる。
//
// 併せて、401に Cache-Control: no-store が付いていることも確かめる。
// 付け忘れていたせいでSafariが401を保存し、機内モードで「認証が必要です。」を再生していた。

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isPublicAppShellAsset } from "../worker.js";

const workerSource = await readFile(new URL("../worker.js", import.meta.url), "utf8");

const get = (path) => new Request(`https://example.com${path}`, { method: "GET" });

test("PWAの見た目に要る資源だけを認証の外で返す", () => {
  const allowed = [
    "/icons/stage-sketch-180.png",
    "/icons/stage-sketch-192.png",
    "/icons/stage-sketch-512.png",
    "/icons/stage-sketch-maskable-512.png",
    "/icons/stage-sketch-icon.svg",
    "/stage-sketch.webmanifest",
    "/shosai-app.webmanifest",
  ];
  for (const path of allowed) {
    assert.equal(isPublicAppShellAsset(get(path)), true, `${path} は認証なしで返せるべき`);
  }
});

test("中身のあるファイルは決して認証の外へ出さない", () => {
  const denied = [
    "/",
    "/index.html",
    "/stage.html",
    "/db.js",              // 資料棚のデータ
    "/roster.js",          // 名簿
    "/roster-crew.js",
    "/worker.js",
    "/wrangler.toml",
    "/style.css",
    "/stage-sketch.js",
    "/data.js",
    "/icons",              // ディレクトリそのもの
    "/icons/",
    "/overnight-runs/REPORT.md",
    "/docs/HANDOVER_2026-08-07.md",
  ];
  for (const path of denied) {
    assert.equal(isPublicAppShellAsset(get(path)), false, `${path} は認証の内側に留めるべき`);
  }
});

test("パスの細工で穴を広げられない", () => {
  const attacks = [
    "/icons/../worker.js",        // URLの正規化で /worker.js になる
    "/icons/../../etc/passwd",
    "/icons/%2e%2e/worker.js",    // 符号化した親ディレクトリ
    "/icons/%2E%2E%2Fworker.js",
    "/icons/sub/nested.png",      // 下の階層は許さない
    "/icons/worker.js",           // 拡張子が違う
    "/icons/db.js.png/../db.js",
    "/icons/stage-sketch-180.png/../../db.js",
    "/a/b.webmanifest",           // manifestは直下だけ
    "/icons/.env",
    "/icons/",
  ];
  for (const path of attacks) {
    assert.equal(isPublicAppShellAsset(get(path)), false, `${path} を通してはいけない`);
  }
});

test("読み取り以外の方法では認証の外を通さない", () => {
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    const request = new Request("https://example.com/icons/stage-sketch-180.png", { method });
    assert.equal(isPublicAppShellAsset(request), false, `${method} は通してはいけない`);
  }
  // GETとHEADだけは通す（HEADはブラウザが存在確認に使う）
  for (const method of ["GET", "HEAD"]) {
    const request = new Request("https://example.com/icons/stage-sketch-180.png", { method });
    assert.equal(isPublicAppShellAsset(request), true, `${method} は通すべき`);
  }
});

test("401は保存させない（機内モードで再生されないように）", () => {
  // 401を組み立てている箇所に no-store があること。
  const authChallenge = workerSource.slice(workerSource.indexOf('"認証が必要です。"'));
  assert.match(
    authChallenge.slice(0, 600),
    /"Cache-Control":\s*"no-store"/,
    "401に Cache-Control: no-store が要る（無いとSafariが保存し、機内モードで再生する）",
  );
});

test("認証チェックより手前で例外を判定している", () => {
  /* 公開する資源の判定は、どの認証よりも先に来ていなければならない。
     順番が入れ替わると、アイコンが401になって代替タイルへ戻る。
     ★認証の入口が増えても壊れないよう、fetch本体の中での並びで見る
       （以前は Authorization ヘッダの読み取り位置を見ていたが、
        その処理を matchBasicAuth() へ切り出した時点で成り立たなくなった）。 */
  const entry = workerSource.indexOf("async fetch(request, env, ctx)");
  assert.ok(entry > 0, "fetchの入口が見つかること");
  const body = workerSource.slice(entry);

  const exemption = body.indexOf("isPublicAppShellAsset(request)");
  assert.ok(exemption > 0, "fetchの中で例外判定を呼んでいること");

  for (const gate of ["readSessionToken(", "matchBasicAuth("]) {
    const at = body.indexOf(gate);
    assert.ok(at > 0, `${gate} がfetchの中にあること`);
    assert.ok(exemption < at, `例外判定は ${gate} より手前にあること`);
  }
});
