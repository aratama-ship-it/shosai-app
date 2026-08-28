#!/bin/bash
# ゲスト口座（GUEST_ACCOUNTS）を新しく作り、CSVの名簿を書いて Cloudflare へ投入する。
#
# ★これは「作り直し」の道具。すでに配ってある口座は全部使えなくなる。
#   誰に渡したかを書き足す／一人だけ止める、は tools/sync-guest-accounts.sh のほう。
#
# なぜこの形か:
#   パスワードを人やAIの目・会話ログ・コマンド履歴へ一度も出さないため。
#   このスクリプトの中で作り、そのまま wrangler の標準入力へ流す。
#   画面に出るのは利用者名だけで、値は名簿CSVにしか書かれない。
#   （2026-08-24 に curl の %{redirect_url} で本人のパスワードが会話ログへ
#     平文露出した事故がある。同じ轍を踏まない。）
#
# ★名簿の置き場所について:
#   このMacは「デスクトップとDocumentsをiCloudに同期」が有効で、そこへ置くと
#   パスワードがiCloud（＝他の端末やCodexからも見える場所）へ載る。
#   そのためホーム直下の ~/shosai-guest-accounts/ に置く。ここは同期されない。
#
# 使い方:
#   cd "<このリポジトリ>" && bash tools/put-guest-accounts.sh 50
#   最後の数字が作る口座の数（省略すると3）。
#
# 前提: wrangler にログイン済み。切れていたら先に `npx wrangler login`。

set -euo pipefail

COUNT="${1:-3}"
WORKER_NAME="shosai-app"
SITE_URL="https://shosai-app.juggler-arata.workers.dev"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"
VAULT="$HOME/shosai-guest-accounts"
CSV="$VAULT/guest-accounts-${STAMP}.csv"
LATEST="$VAULT/guest-accounts-latest.csv"

if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [ "$COUNT" -lt 1 ] || [ "$COUNT" -gt 200 ]; then
  echo "口座の数は 1〜200 の数字で指定してください（例: bash tools/put-guest-accounts.sh 50）" >&2
  exit 1
fi

cd "$HERE"
[ -f wrangler.toml ] || { echo "wrangler.toml が見つかりません。リポジトリの中で実行してください。" >&2; exit 1; }

echo "▸ Worker: ${WORKER_NAME}"
echo "▸ 作る口座: guest1 〜 guest${COUNT}"
echo "▸ 名簿: ${CSV}"
echo

if npx wrangler secret list --name "$WORKER_NAME" 2>/dev/null | grep -q '"GUEST_ACCOUNTS"'; then
  echo "！ GUEST_ACCOUNTS はすでに設定されています。続けると全部作り直しになり、"
  echo "  いま配ってある口座は使えなくなります。"
  echo "  「誰に渡したか」を書き足すだけなら中止して、名簿CSVを直接編集してください。"
  read -r -p "  それでも作り直しますか？ [yes/N]: " ANSWER
  [ "$ANSWER" = "yes" ] || { echo "中止しました。"; exit 1; }
  echo
fi

mkdir -p "$VAULT"
chmod 700 "$VAULT"
umask 077

# --- 口座を作り、名簿CSVと投入用JSONを同時に書く。値は画面へ出さない ---
# 記号は入れない（口頭やメッセージで渡すときに読み違えないため）。
JSON_TMP="$(mktemp)"
trap 'rm -f "$JSON_TMP"' EXIT

COUNT="$COUNT" CSV_PATH="$CSV" SITE_URL="$SITE_URL" JSON_PATH="$JSON_TMP" python3 <<'PY'
import csv, json, os, secrets, string

alphabet = string.ascii_lowercase + string.ascii_uppercase + string.digits
count = int(os.environ["COUNT"])
rows = [{"user": f"guest{i}", "pass": "".join(secrets.choice(alphabet) for _ in range(20))}
        for i in range(1, count + 1)]

# 投入用JSON（labelは将来の表示名用。いまは空で置く）
with open(os.environ["JSON_PATH"], "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))

# 名簿CSV。Excel/Numbersのどちらでも文字化けしないよう BOM 付きUTF-8。
# ★列を増やすのは自由だが、先頭2列（利用者名・パスワード）の位置は変えないこと。
#   tools/sync-guest-accounts.sh が名前で引くので、見出しの文字列も変えないこと。
with open(os.environ["CSV_PATH"], "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["利用者名", "パスワード", "渡した相手", "渡した日", "状態", "メモ"])
    for r in rows:
        w.writerow([r["user"], r["pass"], "", "", "未配布", ""])
print(f"検証OK: {len(rows)} 口座 / JSON {os.path.getsize(os.environ['JSON_PATH'])} バイト")
PY

chmod 600 "$CSV"
ln -sf "$CSV" "$LATEST"

# --- 投入前の自前検証（壊れたJSONは全体を503で止めるため） ---
python3 - "$JSON_TMP" <<'PY'
import json, sys
rows = json.load(open(sys.argv[1], encoding="utf-8"))
assert isinstance(rows, list) and rows, "配列でないか空"
users = set()
for r in rows:
    assert isinstance(r, dict), "要素がオブジェクトでない"
    u, p = r.get("user"), r.get("pass")
    assert isinstance(u, str) and u, "userが空"
    assert isinstance(p, str) and p, "passが空"
    assert u not in users, "userが重複"
    users.add(u)
PY

SIZE="$(wc -c < "$JSON_TMP" | tr -d ' ')"
if [ "$SIZE" -gt 4000 ]; then
  echo "！ 投入する値が ${SIZE} バイトあります。Cloudflareの上限に近い可能性があります。"
  echo "  この後の生死確認で503になったら、口座の数を減らして作り直してください。"
fi

echo "▸ 名簿を書きました: ${CSV}"
echo "  （最新版への近道: ${LATEST}）"

# --- 投入。値は標準入力から渡すので、履歴にもログにも残らない ---
echo "▸ Cloudflare へ投入します…"
npx wrangler secret put GUEST_ACCOUNTS --name "$WORKER_NAME" < "$JSON_TMP"

# --- 投入直後の生死確認。設定が不正だと fail-closed でサイト全体が503になる。
#     SITE_USER と同じ名前を選んでしまった等は事前に検出できないので、実応答で確かめる ---
echo
echo "▸ サイトの生死を確認します…"
sleep 3
CODE=""
for _ in 1 2 3 4 5; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "${SITE_URL}/sign-in" || echo "000")"
  [ "$CODE" = "200" ] && break
  sleep 3
done

if [ "$CODE" = "200" ]; then
  echo "▸ 正常です（/sign-in が 200）。"
  echo
  echo "  次にやること:"
  echo "   1. 名簿を開いて、渡した相手を書き込む:"
  echo "        open \"${LATEST}\""
  echo "   2. 名簿の口座で実際にログインできるか、1件試す"
  echo "   3. 誰かを止めたくなったら、名簿の「状態」を 停止 にして:"
  echo "        bash tools/sync-guest-accounts.sh"
  open -R "$CSV" 2>/dev/null || true
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
