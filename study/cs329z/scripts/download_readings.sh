#!/usr/bin/env bash
# 從 readings.md 抓出所有 arXiv 連結，把論文 PDF 下載到 readings/（已列在 .gitignore）。
# 部落格、規格文件等非 arXiv 來源請直接點 readings.md 裡的連結。
#
# 檔名格式：<週次>_<arXiv ID>.pdf，例如 W02_2005.11401.pdf
# 用法：./scripts/download_readings.sh [清單檔，預設 readings.md] [輸出資料夾，預設 readings]
set -euo pipefail

SRC="${1:-readings.md}"
OUT_DIR="${2:-readings}"
ARXIV_BASE="${ARXIV_BASE:-https://arxiv.org}"

mkdir -p "$OUT_DIR"

# 依 "## Wxx · ..." 標題記下目前週次，逐行擷取 arxiv.org/abs/<id>
pairs=$(awk '
  /^## W[0-9][0-9] / { week = $2 }
  {
    line = $0
    while (match(line, /arxiv\.org\/abs\/[0-9]+\.[0-9]+/)) {
      print week, substr(line, RSTART + 14, RLENGTH - 14)
      line = substr(line, RSTART + RLENGTH)
    }
  }
' "$SRC" | awk '!seen[$2]++')

new=0; failed=0
while read -r week id; do
  [[ -z "$id" ]] && continue
  dest="$OUT_DIR/${week}_${id}.pdf"
  if [[ -f "$dest" ]]; then
    echo "= ${week}_${id}.pdf（已存在）"
    continue
  fi
  code=$(curl -sL -w '%{http_code}' -o "$dest.tmp" "$ARXIV_BASE/pdf/$id") || code=000
  if [[ "$code" == 200 ]]; then
    mv "$dest.tmp" "$dest"; echo "✓ ${week}_${id}.pdf"; new=$((new + 1))
  else
    rm -f "$dest.tmp"; echo "! $id 下載失敗（HTTP $code）" >&2; failed=$((failed + 1))
  fi
  sleep 1  # 對 arXiv 客氣一點
done <<< "$pairs"

echo "完成：新下載 $new 篇，失敗 $failed 篇，存放在 $OUT_DIR/"
