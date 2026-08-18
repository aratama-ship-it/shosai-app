// サイト全体をBasic認証で保護する（制作の書斎、全タブ共通）。
//
// Cloudflare Pages はどのリクエストも functions/_middleware.js を必ず通す。
// ここで正しい認証情報かを確認し、なければ401を返す。IDとパスワードは
// Cloudflare Pages の環境変数（Secret）SITE_USER / SITE_PASS に置き、
// このファイルやリポジトリには平文で残さない。
//
// 名簿タブの合言葉（scout_pass）とは別物。あちらはブラウザ内で名簿データを
// 復号するための鍵、こちらはサイトそのものへ入る前の関所。

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function onRequest(context) {
  const { request, env, next } = context;

  const expectedUser = env.SITE_USER;
  const expectedPass = env.SITE_PASS;

  // 一時診断: 値は返さず「設定されているか」だけを返す。
  // Cloudflareダッシュボードで設定した環境変数がPages Functionsまで
  // 届いているかを外から確認するため（2026-08-19、原因切り分け用。
  // 確認が終わったら削除する）。
  const url = new URL(request.url);
  if (url.searchParams.has("_debugauth")) {
    return new Response(JSON.stringify({
      hasUser: Boolean(expectedUser),
      hasPass: Boolean(expectedPass),
      envKeys: Object.keys(env),
    }), { headers: { "content-type": "application/json; charset=utf-8" } });
  }

  // 環境変数が未設定なら認証をかけない（設定忘れでロックアウトするより、
  // 意図的に外から確認しやすい状態を優先する）。デプロイ手順のREADMEで
  // 必ず設定するよう案内する。
  if (!expectedUser || !expectedPass) {
    return next();
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
      if (timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass)) {
        return next();
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
}
