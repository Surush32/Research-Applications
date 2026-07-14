# Part E: Shell Scripting for Automation

This folder contains shell scripts that automate common development tasks for the **Catching the Copy** project. Each script uses **variables**, **pipes**, and text-processing filters (**grep**, **awk**, **sed**).

## Assignment checklist (Part E)

| Requirement | How we meet it |
|-------------|----------------|
| At least **two** shell scripts | **Three** scripts: `run-tests.sh`, `batch-compare.sh`, `check-api.sh` |
| Automate development tasks | Test runs, batch comparisons, deployed API verification |
| Use **grep, awk, sed** | All three scripts use these filters (see per-script tables below) |
| Use **pipes** and **variables** | All scripts set paths/URLs as variables and chain commands with `\|` |
| **Document** each script | This README explains what each script automates and how it works |

---

## Requirements (to run the scripts)

- **Bash** (Git Bash on Windows, or WSL/macOS/Linux)
- **Python 3.10+** (for the AST checker and unit tests)

Make scripts executable (once):

```bash
chmod +x scripts/run-tests.sh scripts/batch-compare.sh scripts/check-api.sh
```

On Windows with Git Bash:

```bash
bash scripts/run-tests.sh
bash scripts/batch-compare.sh
bash scripts/check-api.sh
```

**PowerShell note:** `bash` in PowerShell uses WSL, which may not be installed. Use one of these instead:

```powershell
# Option 1: double-click or run the .bat launchers
scripts\check-api.bat
scripts\run-tests.bat
scripts\batch-compare.bat

# Option 2: call Git Bash directly
& "C:\Program Files\Git\bin\bash.exe" scripts/check-api.sh
```

---

## Script 1: `run-tests.sh`

### Task it automates

Runs the full Python unit test suite under `AST/AST/tests/` and produces a filtered summary — so you don't have to manually scan verbose unittest output after every code change.

### Usage

```bash
./scripts/run-tests.sh           # run all tests
./scripts/run-tests.sh -k cosine # show lines matching "cosine" in output
```

### How it works

| Step | What happens |
|------|----------------|
| 1 | Sets **variables** (`PROJECT_ROOT`, `PYTHON_DIR`, `TEST_DIR`, `LOG_FILE`, `TIMESTAMP`) to locate the project |
| 2 | Changes into `AST/AST/` and runs `python -m unittest discover -s tests -v` |
| 3 | **Pipes** full output through `tee` to save `scripts/.last-test-run.log` |
| 4 | **grep** filters the log for `FAIL:`, `ERROR:`, `Ran N tests`, and `OK` lines |
| 5 | **sed** indents filtered lines for readable output |
| 6 | **awk** parses the "Ran N tests" line and determines pass/fail status |
| 7 | Exits with code `0` if all tests pass, `1` if any fail |

### Filters demonstrated

- **grep** — extract failure and summary lines from test output
- **awk** — count total tests and determine overall status
- **sed** — format/indented display of filtered lines
- **Pipes** — chain `echo \| grep \| sed` and `echo \| awk`

---

## Script 2: `batch-compare.sh`

### Task it automates

Runs AST similarity comparisons on multiple predefined Python file pairs in one command — useful for regression checks before a demo or after changing the checker logic.

### Default pairs compared

| Label | File A | File B | Expected |
|-------|--------|--------|----------|
| `original_vs_suspect` | `original.py` | `suspect.py` | High similarity (~98%) |
| `original_vs_distinct_a` | `original.py` | `distinct_a.py` | Mixed |
| `distinct_a_vs_distinct_b` | `distinct_a.py` | `distinct_b.py` | Low similarity (~55%) |

### Usage

```bash
./scripts/batch-compare.sh                      # threshold 0.75
./scripts/batch-compare.sh 0.80                 # custom threshold
./scripts/batch-compare.sh 0.75 report.csv        # export CSV results
```

### How it works

| Step | What happens |
|------|----------------|
| 1 | Sets **variables** (`THRESHOLD`, `PYTHON_DIR`, `PAIRS`, `REPORT_FILE`) |
| 2 | Loops over each `file_a\|file_b\|label` pair defined in the `PAIRS` heredoc |
| 3 | Calls `LicenseChecker.run()` via **Python** with `render=False` (no interactive prompts) |
| 4 | Python prints pipe-delimited scores; **awk** parses each field (`aggregate`, `cosine`, etc.) |
| 5 | **grep** checks for `\|1\|` flag to detect pairs exceeding the threshold |
| 6 | **awk** formats aggregate score as a percentage for display |
| 7 | Appends each result to `.last-compare-report.txt` via **pipe** redirect |
| 8 | Final **awk** summary counts HIGH vs LOW pairs; **grep** lists only HIGH pairs |
| 9 | Exits `1` if any pair exceeds threshold (useful for CI-style gating) |

### Filters demonstrated

- **awk** — field parsing (`-F'|'`), percentage formatting, summary counts
- **grep** — detect high-similarity flag; filter HIGH pairs from report
- **sed** — indent error messages
- **Pipes** — `echo "${RESULT}" \| awk`, report file processing

---

## Script 3: `check-api.sh`

### Task it automates

Verifies the **Render-deployed backend** ([catching-the-copy-bo.onrender.com](https://catching-the-copy-bo.onrender.com)) is online and returns live comparison results — useful before a demo or after a deployment.

### Usage

```bash
./scripts/check-api.sh
./scripts/check-api.sh https://catching-the-copy-bo.onrender.com
```

### How it works

| Step | What happens |
|------|----------------|
| 1 | Sets **variables** (`API_URL`, `FILE_A`, `FILE_B`, `THRESHOLD`, `LOG_FILE`) |
| 2 | **curl** sends `GET /health` to the Render API |
| 3 | **grep** + **sed** extract `status` and `message` from the JSON response |
| 4 | **curl** sends `POST /compare` with `original.py` and `suspect.py` as multipart form data |
| 5 | **grep** + **awk** parse `aggregate`, `exceeds_threshold`, and `recommendation` from JSON |
| 6 | **grep** filters score fields; **sed** + **awk** format the breakdown table |
| 7 | Saves full response to `scripts/.last-api-check.log` |

### Filters demonstrated

- **grep** — extract JSON fields (`status`, `aggregate`, score keys)
- **awk** — parse field values, format percentages and table columns
- **sed** — strip HTTP metadata lines, clean JSON for display
- **Pipes** — chain `curl \| grep \| sed \| awk` throughout

### Architecture covered

| Layer | Script |
|-------|--------|
| Local Python tests | `run-tests.sh` |
| Local CLI comparisons | `batch-compare.sh` |
| **Render API (backend)** | **`check-api.sh`** |

---

## Example output

### run-tests.sh

```
══════════════════════════════════════════════════════════════
  AST Similarity Checker — Automated Test Run
══════════════════════════════════════════════════════════════
...
── Filtered results (grep: FAIL | ERROR | Ran | OK) ──
  Ran 24 tests in 0.012s
  OK
── Summary (awk) ──
  Total tests : 24
  Passed      : 24
  Failed      : 0
  Status      : PASSED
✔ All tests passed.
```

### batch-compare.sh

```
══════════════════════════════════════════════════════════════
  AST Similarity Checker — Batch Comparison
  Threshold: 0.75
══════════════════════════════════════════════════════════════

  [WARN] original_vs_suspect          aggregate=98.3%  (cos=1.0000 jacc=1.0000 ...)
  [ok]   original_vs_distinct_a      aggregate=72.1%  (...)
  [ok]   distinct_a_vs_distinct_b    aggregate=55.0%  (...)

── High similarity (grep HIGH) ──
  - original_vs_suspect (0.9826)

⚠ 1 pair(s) exceeded threshold 0.75.
```

### check-api.sh

```
══════════════════════════════════════════════════════════════
  AST Similarity API — Render Backend Check
══════════════════════════════════════════════════════════════
  API URL : https://catching-the-copy-bo.onrender.com

── Step 1: Health check (GET /health) ──
{"status":"ok","message":"AST similarity checker is running."}
  ✔ API is healthy — AST similarity checker is running.

── Step 2: Live comparison (POST /compare) ──
  Aggregate score : 98.3%
  Exceeds threshold: true
  Recommendation  : Manual review strongly advised...

✔ Render API check complete.
```

---

## Generated files (gitignored)

| File | Created by |
|------|------------|
| `scripts/.last-test-run.log` | `run-tests.sh` |
| `scripts/.last-compare-report.txt` | `batch-compare.sh` |
| `scripts/.last-api-check.log` | `check-api.sh` |

These are local run artifacts and are not committed to the repository.
