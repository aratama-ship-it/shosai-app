#!/bin/bash
# 夜間の反復スキャン。種（--seed）を変えて小道具の注入パターンを変えながら、
# 07:00 まで繰り返す。並行セッションが本体アプリを編集中のため、
# 回すこと自体が「その時点の本体に対する退行検査」にもなる。
# 書き込むのは overnight-runs/2026-08-20-prop-render-scan/ 配下だけ。
set -u
APP="/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app"
DIR="$APP/overnight-runs/2026-08-20-prop-render-scan"
SEEDS_DIR="$DIR/seeds"
mkdir -p "$SEEDS_DIR"
LOG="$DIR/logs/night-loop.log"
DEADLINE=$(date -j -f "%Y-%m-%d %H:%M:%S" "2026-08-20 07:00:00" "+%s")

seed=43
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  for spec in "b high ja" "b high en" "b low ja" "a low ja" "a low en" "b low en"; do
    set -- $spec
    wave=$1; density=$2; lang=$3
    {
      now=$(date +%s)
      [ "$now" -ge "$DEADLINE" ] && break 2
      stamp=$(date "+%H%M%S")
      out="$SEEDS_DIR/seed${seed}-${wave}-${density}-${lang}.md"
      echo "[$(date '+%H:%M:%S')] seed=$seed wave=$wave 密度=$density lang=$lang 開始" >> "$LOG"
      cd "$APP" || exit 1
      node tools/scan-prop-render.mjs --wave "$wave" --lang "$lang" --hold-density "$density" --seed "$seed" --out "$out" >> "$LOG" 2>&1
      code=$?
      head3=$(head -2 "$out" 2>/dev/null | tr '\n' ' ')
      echo "[$(date '+%H:%M:%S')] seed=$seed wave=$wave 密度=$density lang=$lang 終了 exit=$code :: $head3" >> "$LOG"
      # 本体アプリが並行セッションで変わったかを毎回記録する（結果の解釈に要る）
      shasum -a 256 "$APP/stage-sketch.js" "$APP/stage.html" "$APP/index.html" >> "$DIR/logs/app-hash-timeline.log"
      echo "  ^ $(date '+%H:%M:%S') seed=$seed" >> "$DIR/logs/app-hash-timeline.log"
    }
  done
  seed=$((seed + 1))
done
echo "[$(date '+%H:%M:%S')] 07:00 到達。夜間ループ終了。最後の種=$seed" >> "$LOG"
