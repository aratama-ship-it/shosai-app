#!/bin/bash
# ゲスト口座（GUEST_ACCOUNTS）を作って Cloudflare へ投入する。
#
# なぜこの形か:
#   パスワードを人やAIの目・会話ログ・コマンド履歴へ一度も出さないため。
#   このスクリプトの中でパスワードを作り、そのまま wrangler の標準入力へ流す。
#   画面に出るのは利用者名だけで、パスワードはデスクトップの控えにしか書かれない。
#   （2026-08-24 に curl の %{redirect_url} で本人のパスワードが会話ログへ
#     平文露出した事故がある。同じ轍を踏まない。）
#
# 使い方:
#   cd "<このリポジトリ>" && bash tools/put-guest-accounts.sh 3
#   最後の数字が作る口座の数（省略すると3）。
#
# 前提:
#   wrangler にログイン済みであること。切れていたら先に `npx wrangler login`。
#
# 安全側の作り:
#   ・--name shosai-app で対象Workerを直接指定する（別Workerへ入らない）
#   ・投入前に JSON として読めるかを自分で検証する
#     （壊れた JSON を入れるとサイト全体が503で止まる fail-closed 設計のため）
#   ・既存の GUEST_ACCOUNTS があれば、上書き前に確認を求める

set -euo pipefail

COUNT="${1:-3}"
WORKER_NAME="shosai-app"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"
OUT="$HOME/Desktop/shosai-guest-accounts-${STAMP}.txt"

if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [ "$COUNT" -lt 1 ] || [ "$COUNT" -gt 50 ]; then
  echo "口座の数は 1〜50 の数字で指定してください（例: bash tools/put-guest-accounts.sh 3）" >&2
  exit 1
fi

cd "$HERE"

if [ ! -f wrangler.toml ]; then
  echo "wrangler.toml が見つかりません。リポジトリの中で実行してください。" >&2
  exit 1
fi

echo "▸ Worker: ${WORKER_NAME}"
echo "▸ 作る口座: guest1 〜 guest${COUNT}"
echo "▸ パスワードの控え: ${OUT}"
echo

# --- 既存設定の確認（あれば上書きになる） ---
if npx wrangler secret list --name "$WORKER_NAME" 2>/dev/null | grep -q '"GUEST_ACCOUNTS"'; then
  echo "！ GUEST_ACCOUNTS はすでに設定されています。続けると全部作り直しになり、"
  echo "  いま配ってある口座は使えなくなります。"
  read -r -p "  続けますか？ [yes/N]: " ANSWER
  [ "$ANSWER" = "yes" ] || { echo "中止しました。"; exit 1; }
  echo
fi

# --- 口座を作る。パスワードは画面へ出さない ---
# 記号は入れない（口頭やメッセージで渡すときに読み違えないため）。
JSON="$(COUNT="$COUNT" python3 - <<'PY'
import json, os, secrets, string
alphabet = string.ascii_lowercase + string.ascii_uppercase + string.digits
count = int(os.environ["COUNT"])
rows = [{"user": f"guest{i}", "pass": "".join(secrets.choice(alphabet) for _ in range(20))}
        for i in range(1, count + 1)]
print(json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
PY
)"

# --- 投入前に自分で検証する（壊れたJSONは全体を503で止めるため） ---
printf '%s' "$JSON" | python3 -c '
import json, sys
rows = json.load(sys.stdin)
assert isinstance(rows, list) and rows, "配列でないか空"
users = set()
for r in rows:
    assert isinstance(r, dict), "要素がオブジェクトでない"
    u, p = r.get("user"), r.get("pass")
    assert isinstance(u, str) and u, "userが空"
    assert isinstance(p, str) and p, "passが空"
    assert u not in users, "userが重複"
    users.add(u)
print("検証OK: %d 口座" % len(rows), file=sys.stderr)
'

# --- 控えを先に書く（投入が成功したのに手元に無い、を避ける） ---
umask 077
{
  echo "舞台スケッチ β版 ゲスト口座（${STAMP} 作成）"
  echo "URL: https://shosai-app.juggler-arata.workers.dev/stage"
  echo
  printf '%s' "$JSON" | python3 -c '
import json, sys
for r in json.load(sys.stdin):
    print("%s\t%s" % (r["user"], r["pass"]))
'
  echo
  echo "※このファイルは共有フォルダへ置かないこと。渡し終えたら消してよい。"
} > "$OUT"
chmod 600 "$OUT"
echo "▸ 控えを書きました: ${OUT}"

# --- 投入。値は標準入力から渡すので、履歴にもログにも残らない ---
echo "▸ Cloudflare へ投入します…"
printf '%s' "$JSON" | npx wrangler secret put GUEST_ACCOUNTS --name "$WORKER_NAME"

# --- 投入直後の生死確認。ここが要。
#     設定が不正だと fail-closed でサイト全体が503になる。
#     こちらから中身は読めない（SITE_USER と同じ名前を選んでしまった等は
#     事前に検出できない）ので、入れてから実際の応答で確かめる。 ---
echo
echo "▸ サイトの生死を確認します…"
sleep 3
CODE=""
for i in 1 2 3 4 5; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' https://shosai-app.juggler-arata.workers.dev/sign-in || echo "000")"
  [ "$CODE" = "200" ] && break
  sleep 3
done

if [ "$CODE" = "200" ]; then
  echo "▸ 正常です（/sign-in が 200）。"
  echo
  echo "  次にやること:"
  echo "   1. ${OUT} の口座で実際にログインできるか、1件試す"
  echo "   2. 旧 GUEST_USER / GUEST_PASS を消すかを決める"
  echo "      （残している間は「一人だけ止める」ができません）"
  echo "        npx wrangler secret delete GUEST_USER --name ${WORKER_NAME}"
  echo "        npx wrangler secret delete GUEST_PASS --name ${WORKER_NAME}"
else
  echo "！！ サイトが正常に応答していません（/sign-in が ${CODE}）。"
  echo "  設定が不正で fail-closed が働いた可能性が高いです。"
  echo "  下の一行で投入前の状態へ戻せます（旧 GUEST_USER/GUEST_PASS での運用に復帰）:"
  echo
  echo "    npx wrangler secret delete GUEST_ACCOUNTS --name ${WORKER_NAME}"
  echo
  echo "  戻したうえで、この画面をそのままClaudeへ伝えてください。"
  exit 1
fi
