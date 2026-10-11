#!/usr/bin/env bash
# 下載 Stanford CS329Z 已釋出的投影片。
# - 還沒釋出的講次（404）會自動跳過
# - 已下載過的檔案只有在遠端更新時才會重抓（If-Modified-Since）
#
# 用法：./scripts/download_slides.sh [輸出資料夾，預設 slides] [最大講次，預設 20]
set -euo pipefail

BASE_URL="${CS329Z_SLIDES_URL:-https://web.stanford.edu/class/cs329z/slides}"
OUT_DIR="${1:-slides}"
MAX="${2:-20}"

mkdir -p "$OUT_DIR"
new=0

for n in $(seq 1 "$MAX"); do
  name="lecture$(printf '%02d' "$n").pdf"
  dest="$OUT_DIR/$name"
  tmp="$dest.tmp"

  if [[ -f "$dest" ]]; then
    code=$(curl -sL -z "$dest" -w '%{http_code}' -o "$tmp" "$BASE_URL/$name") || code=000
  else
    code=$(curl -sL -w '%{http_code}' -o "$tmp" "$BASE_URL/$name") || code=000
  fi

  case "$code" in
    200) mv "$tmp" "$dest"; echo "✓ $name"; new=$((new + 1)) ;;
    304) rm -f "$tmp"; echo "= $name（未變更）" ;;
    404) rm -f "$tmp" ;;  # 尚未釋出，安靜跳過
    *)   rm -f "$tmp"; echo "! $name 下載失敗（HTTP $code）" >&2 ;;
  esac
done

echo "完成：$new 份新下載或更新，存放在 $OUT_DIR/"
