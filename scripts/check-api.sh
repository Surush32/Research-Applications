#!/usr/bin/env bash
# check-api.sh — Verify the Render-deployed AST Similarity API is healthy and responding.
#
# Usage:
#   ./scripts/check-api.sh
#   ./scripts/check-api.sh https://catching-the-copy-bo.onrender.com
#
# Requires: bash, curl, grep, awk, sed

set -euo pipefail

# ── Variables ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PYTHON_DIR="${PROJECT_ROOT}/AST/AST"
API_URL="${1:-${NEXT_PUBLIC_API_URL:-https://catching-the-copy-bo.onrender.com}}"
THRESHOLD="${THRESHOLD:-0.75}"
LOG_FILE="${PROJECT_ROOT}/scripts/.last-api-check.log"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

FILE_A="${PYTHON_DIR}/original.py"
FILE_B="${PYTHON_DIR}/suspect.py"

# ── Preflight ────────────────────────────────────────────────────────────────
if ! command -v curl >/dev/null 2>&1; then
  echo "[ERROR] curl is required but not installed." >&2
  exit 1
fi

echo "══════════════════════════════════════════════════════════════"
echo "  AST Similarity API — Render Backend Check"
echo "  ${TIMESTAMP}"
echo "══════════════════════════════════════════════════════════════"
echo "  API URL : ${API_URL}"
echo "  Docs    : ${API_URL}/docs"
echo ""

# ── Step 1: Health check (GET /health) ───────────────────────────────────────
echo "── Step 1: Health check (GET /health) ──"

HEALTH_RAW="$(curl -sS -w '\nHTTP_CODE:%{http_code}' "${API_URL}/health" 2>&1)" || {
  echo "  ✘ Could not reach ${API_URL}" >&2
  echo "  Tip: Render free tier may need ~30s to wake up. Try again." >&2
  exit 1
}

HTTP_CODE="$(echo "${HEALTH_RAW}" | grep 'HTTP_CODE:' | sed 's/HTTP_CODE://')"
HEALTH_BODY="$(echo "${HEALTH_RAW}" | sed '/HTTP_CODE:/d' | tr -d '\r')"

echo "${HEALTH_BODY}" | tee "${LOG_FILE}"

STATUS="$(echo "${HEALTH_BODY}" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/' || true)"
MESSAGE="$(echo "${HEALTH_BODY}" | grep -o '"message"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/' || true)"

if [[ "${HTTP_CODE}" != "200" || "${STATUS}" != "ok" ]]; then
  echo ""
  echo "  ✘ Health check failed (HTTP ${HTTP_CODE})"
  exit 1
fi

echo ""
echo "  ✔ API is healthy — ${MESSAGE}"

# ── Step 2: Compare files (POST /compare) ────────────────────────────────────
echo ""
echo "── Step 2: Live comparison (POST /compare) ──"

if [[ ! -f "${FILE_A}" || ! -f "${FILE_B}" ]]; then
  echo "  [SKIP] Sample files not found for live compare." >&2
  exit 0
fi

echo "  Comparing: $(basename "${FILE_A}") vs $(basename "${FILE_B}")"
echo "  Threshold: ${THRESHOLD}"
echo ""

COMPARE_RAW="$(curl -sS -w '\nHTTP_CODE:%{http_code}' \
  -X POST "${API_URL}/compare" \
  -F "file_a=@${FILE_A}" \
  -F "file_b=@${FILE_B}" \
  -F "threshold=${THRESHOLD}" 2>&1)" || {
  echo "  ✘ Compare request failed" >&2
  exit 1
}

COMPARE_HTTP="$(echo "${COMPARE_RAW}" | grep 'HTTP_CODE:' | sed 's/HTTP_CODE://')"
COMPARE_BODY="$(echo "${COMPARE_RAW}" | sed '/HTTP_CODE:/d' | tr -d '\r')"

echo "${COMPARE_BODY}" >> "${LOG_FILE}"

if [[ "${COMPARE_HTTP}" != "200" ]]; then
  echo "  ✘ Compare failed (HTTP ${COMPARE_HTTP})"
  echo "${COMPARE_BODY}" | sed 's/^/  /'
  exit 1
fi

# ── Parse JSON response with grep/sed/awk ────────────────────────────────────
AGG="$(echo "${COMPARE_BODY}" | grep -o '"aggregate"[[:space:]]*:[[:space:]]*[0-9.]*' | awk -F: '{ print $2 }' | tr -d ' ')"
EXCEEDS="$(echo "${COMPARE_BODY}" | grep -o '"exceeds_threshold"[[:space:]]*:[[:space:]]*[a-z]*' | awk -F: '{ print $2 }' | tr -d ' ')"
REC="$(echo "${COMPARE_BODY}" | grep -o '"recommendation"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')"

PCT="$(echo "${AGG}" | awk '{ printf "%.1f%%", $1 * 100 }')"

echo "  Aggregate score : ${PCT}"
echo "  Exceeds threshold: ${EXCEEDS}"
echo "  Recommendation  : ${REC}"
echo ""

# ── Score breakdown: grep + awk per field ────────────────────────────────────
echo "── Score breakdown (grep + awk) ──"
for FIELD in cosine jaccard lcs signature; do
  VAL="$(echo "${COMPARE_BODY}" \
    | grep -o "\"${FIELD}\"[[:space:]]*:[[:space:]]*[0-9.]*" \
    | awk -F: '{ print $2 }' \
    | tr -d ' \r')"
  FIELD_PCT="$(echo "${VAL}" | awk '{ printf "%.1f%%", $1 * 100 }')"
  printf "  %-14s %s\n" "${FIELD}" "${FIELD_PCT}"
done

echo ""
echo "  Log saved: ${LOG_FILE}"

if [[ "${EXCEEDS}" == "true" ]]; then
  echo ""
  echo "⚠ High similarity detected via Render API (expected for original vs suspect)."
  exit 0
fi

echo ""
echo "✔ Render API check complete."
exit 0
