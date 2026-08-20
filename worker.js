// サイト全体をBasic認証で保護する（制作の書斎、全タブ共通）。
//
// wrangler.toml の run_worker_first により、静的アセットより必ず先にここを通る。
// 正しければ env.ASSETS.fetch(request) で通常の静的ファイル配信へ渡す。
// IDとパスワードは Cloudflare の環境変数（Secret）SITE_USER / SITE_PASS に置き、
// このファイルやリポジトリには平文で残さない。
//
// 名簿タブの合言葉（scout_pass）とは別物。あちらはブラウザ内で名簿データを
// 復号するための鍵、こちらはサイトそのものへ入る前の関所。
//
// functions/_middleware.js（Cloudflare Pages Functions版）からの移植。
// このアカウントではPagesも内部的にWorkers化されており、静的アセットの配信が
// Pages Functionsより先に処理されて認証が一度も実行されなかったため、
// run_worker_firstを明示できるこちらの形式へ移した（2026-08-19）。

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export default {
  async fetch(request, env, ctx) {
    // 本人用（SITE_USER/SITE_PASS）とゲスト用（GUEST_USER/GUEST_PASS）の2組を受け付ける。
    // ゲスト用が未設定ならゲスト入口は存在しないのと同じ。
    const accounts = [
      [env.SITE_USER, env.SITE_PASS],
      [env.GUEST_USER, env.GUEST_PASS],
    ].filter(([u, p]) => u && p);

    // 環境変数が未設定なら認証をかけない（設定忘れでロックアウトするより、
    // 意図的に外から確認しやすい状態を優先する）。
    if (accounts.length === 0) {
      return env.ASSETS.fetch(request);
    }

    const authHeader = request.headers.get("Authorization") || "";
    const [scheme, encoded] = authHeader.split(" ");

    if (scheme === "Basic" && encoded) {
      let decoded = "";
      try {
        decoded = atob(encoded);
      } catch (error) {
        decoded = "";
      }
      const sep = decoded.indexOf(":");
      if (sep !== -1) {
        const user = decoded.slice(0, sep);
        const pass = decoded.slice(sep + 1);
        const ok = accounts.some(([expectedUser, expectedPass]) =>
          timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass));
        if (ok) {
          return env.ASSETS.fetch(request);
        }
      }
    }

    return new Response("認証が必要です。", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="制作の書斎", charset="UTF-8"',
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  },
};
