#!/bin/bash
# 名簿CSVを正本として、GUEST_ACCOUNTS を作り直す。
#
# これが「一人だけ止める」ための道具。
#   名簿の「状態」列を 停止 にした人だけが、次に入れなくなる。
#   パスワードは作り直さないので、他の人は今までどおり使える。
#
# ★パスワードは画面に出さない。CSVから読んで、そのまま wrangler の標準入力へ流す。
#
# 使い方:
#   cd "<このリポジトリ>" && bash tools/sync-guest-accounts.sh
#     → ~/shosai-guest-accounts/guest-accounts-latest.csv を使う
#   cd "<このリポジトリ>" && bash tools/sync-guest-accounts.sh <CSVのパス>
#     → 指定したCSVを使う
#
# 名簿の「状態」列の決まり:
#   停止           … この口座を無効にする（GUEST_ACCOUNTS から外す）
#   それ以外の値   … 有効のまま（未配布・配布済・空欄、なんでもよい）
#
# 前提: wrangler にログイン済み。切れていたら先に `npx wrangler login`。

set -euo pipefail

WORKER_NAME="shosai-app"
SITE_URL="https://stagesketch.pygmix.com"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="$HOME/shosai-guest-accounts"
CSV="${1:-$VAULT/guest-accounts-latest.csv}"

cd "$HERE"
[ -f wrangler.toml ] || { echo "wrangler.toml が見つかりません。リポジトリの中で実行してください。" >&2; exit 1; }

if [ ! -f "$CSV" ]; then
  echo "名簿が見つかりません: ${CSV}" >&2
  echo "まだ作っていなければ: bash tools/put-guest-accounts.sh 50" >&2
  exit 1
fi

echo "▸ 名簿: ${CSV}"
echo "▸ Worker: ${WORKER_NAME}"
echo

umask 077
JSON_TMP="$(mktemp)"
trap 'rm -f "$JSON_TMP"' EXIT

# --- CSVを読んで投入用JSONを作る。ここで内容も検証する ---
# 壊れた名簿をそのまま入れると fail-closed でサイト全体が503になるため、
# 手前で止めるほうが安全。
CSV_PATH="$CSV" JSON_PATH="$JSON_TMP" python3 <<'PY'
import csv, json, os, sys

path = os.environ["CSV_PATH"]
with open(path, encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

if not rows:
    sys.exit("名簿が空です。")

need = {"利用者名", "パスワード", "状態"}
missing = need - set(rows[0].keys())
if missing:
    sys.exit("名簿に必要な列がありません: " + "、".join(sorted(missing))
             + "\n（見出しの文字は変えないでください）")

accounts, users, stopped, blank = [], set(), [], 0
for i, r in enumerate(rows, start=2):          # 2 = 見出しの次の行
    user = (r.get("利用者名") or "").strip()
    password = (r.get("パスワード") or "").strip()
    state = (r.get("状態") or "").strip()
    if not user and not password:
        blank += 1
        continue
    if not user or not password:
        sys.exit(f"{i}行目: 利用者名かパスワードが空です。")
    if user in users:
        sys.exit(f"{i}行目: 利用者名 {user} が重複しています。")
    users.add(user)
    if state == "停止":
        stopped.append(user)
        continue
    accounts.append({"user": user, "pass": password})

if not accounts:
    sys.exit("有効な口座が1つもありません。全員を停止にすると誰も入れなくなるため中止します。\n"
             "（ゲストの入口ごと閉じたいなら: npx wrangler secret delete GUEST_ACCOUNTS --name shosai-app）")

with open(os.environ["JSON_PATH"], "w", encoding="utf-8") as f:
    json.dump(accounts, f, ensure_ascii=False, separators=(",", ":"))

print(f"▸ 有効: {len(accounts)} 口座")
if stopped:
    print(f"▸ 停止: {len(stopped)} 口座（{'、'.join(stopped[:8])}{' ほか' if len(stopped) > 8 else ''}）")
if blank:
    print(f"▸ 空行 {blank} 行は読み飛ばしました")
print(f"▸ 投入する値: {os.path.getsize(os.environ['JSON_PATH'])} バイト")
PY

echo
read -r -p "この内容で入れ替えますか？ [yes/N]: " ANSWER
[ "$ANSWER" = "yes" ] || { echo "中止しました。"; exit 1; }

echo "▸ Cloudflare へ投入します…"
npx wrangler secret put GUEST_ACCOUNTS --name "$WORKER_NAME" < "$JSON_TMP"

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
  echo "▸ 正常です（/sign-in が 200）。停止にした人は、次のログインから入れなくなります。"
  echo "  ★すでにログイン中の人は、クッキーの有効期限が切れるまでは見られます。"
  echo "    すぐ締め出したいときは SITE_PASS ごと変えるしかない（全員の再ログインが要る）。"
else
  echo "！！ サイトが正常に応答していません（/sign-in が ${CODE}）。"
  echo "  下の一行で、ゲストの入口を閉じて復旧できます:"
  echo
  echo "    npx wrangler secret delete GUEST_ACCOUNTS --name ${WORKER_NAME}"
  echo
  echo "  戻したうえで、この画面をそのままClaudeへ伝えてください。"
  exit 1
fi
