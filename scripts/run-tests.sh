#!/usr/bin/env bash
# run-tests.sh — Automate Python unit test discovery and summarize results.
#
# Usage:
#   ./scripts/run-tests.sh              # run all tests
#   ./scripts/run-tests.sh -k cosine    # run tests whose names match "cosine"
#
# Requires: bash, python 3.10+, grep, awk, sed

set -euo pipefail

# ── Variables ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PYTHON_DIR="${PROJECT_ROOT}/AST/AST"
TEST_DIR="${PYTHON_DIR}/tests"
PATTERN="${1:-}"          # optional grep filter for test names
LOG_FILE="${PROJECT_ROOT}/scripts/.last-test-run.log"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# ── Preflight checks ─────────────────────────────────────────────────────────
if ! command -v python >/dev/null 2>&1; then
  echo "[ERROR] Python is not installed or not on PATH." >&2
  exit 1
fi

if [[ ! -d "${TEST_DIR}" ]]; then
  echo "[ERROR] Test directory not found: ${TEST_DIR}" >&2
  exit 1
fi

echo "══════════════════════════════════════════════════════════════"
echo "  AST Similarity Checker — Automated Test Run"
echo "  ${TIMESTAMP}"
echo "══════════════════════════════════════════════════════════════"
echo "  Project root : ${PROJECT_ROOT}"
echo "  Test suite   : ${TEST_DIR}"
echo ""

# ── Run tests and capture output ─────────────────────────────────────────────
cd "${PYTHON_DIR}"

RAW_OUTPUT="$(python -m unittest discover -s tests -v 2>&1)" || TEST_EXIT=$?
TEST_EXIT="${TEST_EXIT:-0}"
echo "${RAW_OUTPUT}" | tee "${LOG_FILE}"

# ── Filter with grep (show only failures, errors, and summary lines) ─────────
echo ""
echo "── Filtered results (grep: FAIL | ERROR | Ran | OK) ──"
echo "${RAW_OUTPUT}" \
  | grep -E '(^FAIL:|^ERROR:|^Ran [0-9]+ test|^OK$|^FAILED \()' \
  | sed 's/^/  /' || echo "  (no matching summary lines)"

# ── Summarize with awk ───────────────────────────────────────────────────────
SUMMARY="$(echo "${RAW_OUTPUT}" | awk '
  /^Ran /       { ran = $2 }
  /^OK$/        { ok = 1 }
  /^FAILED /    { failed = 1 }
  END {
    if (ran == "") { print "0 0 UNKNOWN"; exit }
    status = (ok && !failed) ? "PASSED" : "FAILED"
    fail_count = failed ? ran : 0
    print ran, fail_count, status
  }
')"

TOTAL="$(echo "${SUMMARY}" | awk '{ print $1 }')"
FAILED="$(echo "${SUMMARY}" | awk '{ print $2 }')"
STATUS="$(echo "${SUMMARY}" | awk '{ print $3 }')"

# Optional: filter log by test-name keyword using grep
if [[ -n "${PATTERN}" && "${PATTERN}" != "-k" ]]; then
  KEYWORD="${PATTERN}"
  if [[ "${PATTERN}" == "-k" && -n "${2:-}" ]]; then
    KEYWORD="${2}"
  fi
  echo ""
  echo "── Tests matching \"${KEYWORD}\" (grep) ──"
  echo "${RAW_OUTPUT}" \
    | grep -i "${KEYWORD}" \
    | sed 's/^/  /' || echo "  (no matches)"
fi

# ── Final report ─────────────────────────────────────────────────────────────
PASSED=$((TOTAL - FAILED))
echo ""
echo "── Summary (awk) ──"
echo "  Total tests : ${TOTAL}"
echo "  Passed      : ${PASSED}"
echo "  Failed      : ${FAILED}"
echo "  Status      : ${STATUS}"
echo "  Log saved   : ${LOG_FILE}"
echo ""

if [[ "${STATUS}" == "PASSED" && ${TEST_EXIT} -eq 0 ]]; then
  echo "✔ All tests passed."
  exit 0
else
  echo "✘ Tests failed. Review ${LOG_FILE} for details."
  exit 1
fi
