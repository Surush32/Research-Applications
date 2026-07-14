#!/usr/bin/env bash
# batch-compare.sh — Batch-run AST similarity comparisons on predefined file pairs.
#
# Usage:
#   ./scripts/batch-compare.sh                    # default threshold 0.75
#   ./scripts/batch-compare.sh 0.80               # custom threshold
#   ./scripts/batch-compare.sh 0.75 results.csv   # write CSV report
#
# Requires: bash, python 3.10+, grep, awk, sed

set -euo pipefail

# ── Variables ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PYTHON_DIR="${PROJECT_ROOT}/AST/AST"
THRESHOLD="${1:-0.75}"
OUTPUT_CSV="${2:-}"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
REPORT_FILE="${PROJECT_ROOT}/scripts/.last-compare-report.txt"

# File pairs: file_a|file_b|label (paths relative to PYTHON_DIR)
PAIRS=(
  "original.py|suspect.py|original_vs_suspect"
  "original.py|tests/fixtures/distinct_a.py|original_vs_distinct_a"
  "tests/fixtures/distinct_a.py|tests/fixtures/distinct_b.py|distinct_a_vs_distinct_b"
)

# ── Preflight ────────────────────────────────────────────────────────────────
if ! command -v python >/dev/null 2>&1; then
  echo "[ERROR] Python is not installed or not on PATH." >&2
  exit 1
fi

cd "${PYTHON_DIR}"
: > "${REPORT_FILE}"

echo "══════════════════════════════════════════════════════════════"
echo "  AST Similarity Checker — Batch Comparison"
echo "  ${TIMESTAMP}"
echo "  Threshold: ${THRESHOLD}"
echo "══════════════════════════════════════════════════════════════"
echo ""

if [[ -n "${OUTPUT_CSV}" ]]; then
  echo "pair,aggregate,cosine,jaccard,lcs,signature,exceeds_threshold,recommendation" \
    > "${OUTPUT_CSV}"
fi

EXCEEDED=0

# ── Process each pair ────────────────────────────────────────────────────────
for ENTRY in "${PAIRS[@]}"; do
  IFS='|' read -r FILE_A FILE_B LABEL <<< "${ENTRY}"

  if [[ ! -f "${FILE_A}" || ! -f "${FILE_B}" ]]; then
    echo "[SKIP] ${LABEL}: missing file(s) — ${FILE_A}, ${FILE_B}" >&2
    continue
  fi

  RESULT="$(python -c "
import license_checker as lc
checker = lc.LicenseChecker(threshold=${THRESHOLD})
tree_a = lc.load_ast('${FILE_A}')
tree_b = lc.load_ast('${FILE_B}')
scores = lc.compute_similarity(tree_a, tree_b)
flag = checker.exceeds_threshold(scores)
rec = 'HIGH' if flag else 'LOW'
print('{:.4f}|{:.4f}|{:.4f}|{:.4f}|{:.4f}|{}|{}'.format(
    scores['aggregate'], scores['cosine'], scores['jaccard'],
    scores['lcs'], scores['signature'], int(flag), rec))
" 2>&1 | tr -d '\r')" || {
    echo "[ERROR] ${LABEL}: comparison failed" >&2
    echo "${RESULT}" | sed 's/^/  /' >&2
    continue
  }

  AGG="$(echo "${RESULT}" | awk -F'|' '{ print $1 }')"
  COS="$(echo "${RESULT}" | awk -F'|' '{ print $2 }')"
  JAC="$(echo "${RESULT}" | awk -F'|' '{ print $3 }')"
  LCS="$(echo "${RESULT}" | awk -F'|' '{ print $4 }')"
  SIG="$(echo "${RESULT}" | awk -F'|' '{ print $5 }')"
  FLAG="$(echo "${RESULT}" | awk -F'|' '{ print $6 }')"
  REC="$(echo "${RESULT}" | awk -F'|' '{ print $7 }')"

  MARKER="ok"
  if [[ "${FLAG}" == "1" ]]; then
    MARKER="WARN"
    EXCEEDED=$((EXCEEDED + 1))
  fi

  PCT="$(echo "${AGG}" | awk '{ printf "%.1f%%", $1 * 100 }')"

  printf "  [%s] %-28s aggregate=%-7s (cos=%s jacc=%s lcs=%s sig=%s)\n" \
    "${MARKER}" "${LABEL}" "${PCT}" "${COS}" "${JAC}" "${LCS}" "${SIG}"

  printf '%s|%s|%s|%s|%s\n' "${LABEL}" "${AGG}" "${REC}" "${FILE_A}" "${FILE_B}" \
    >> "${REPORT_FILE}"

  if [[ -n "${OUTPUT_CSV}" ]]; then
    echo "${LABEL},${AGG},${COS},${JAC},${LCS},${SIG},${FLAG},${REC}" >> "${OUTPUT_CSV}"
  fi
done

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "── Summary ──"
awk -F'|' '
  { total++; if ($3 == "HIGH") high++ }
  END {
    printf "  Comparisons run : %d\n", total + 0
    printf "  Above threshold : %d\n", high + 0
    printf "  Below threshold : %d\n", total - high
  }
' "${REPORT_FILE}"

HIGH_PAIRS="$(grep '|HIGH|' "${REPORT_FILE}" | awk -F'|' '{ printf "  - %s (%s)\n", $1, $2 }' || true)"
if [[ -n "${HIGH_PAIRS}" ]]; then
  echo ""
  echo "── High similarity (grep HIGH) ──"
  echo "${HIGH_PAIRS}"
fi

[[ -n "${OUTPUT_CSV}" ]] && echo "  CSV report    : ${OUTPUT_CSV}"
echo "  Text report   : ${REPORT_FILE}"
echo ""

if [[ ${EXCEEDED} -gt 0 ]]; then
  echo "⚠ ${EXCEEDED} pair(s) exceeded threshold ${THRESHOLD}."
  exit 1
fi

echo "✔ All pairs below threshold."
exit 0
