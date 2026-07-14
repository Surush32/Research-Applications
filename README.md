# Catching the Copy: Abstract Syntax Tree-Based Detection of Structural Similarities in AI-Generated Python Code

## Overview

This project implements an AST-based Python source similarity and licence checker. It compares two Python files by parsing each into an abstract syntax tree (AST), extracting structural features, and calculating similarity scores to detect potential copied or closely related code.

## Features

- Parses Python source into ASTs using Python's `ast` module
- Extracts structural features like:
  - AST node sequence
  - AST node counts
  - function signatures
  - class names
  - import fingerprint
  - literal hash
- Computes similarity using multiple metrics:
  - cosine similarity of AST node frequencies
  - Jaccard similarity of AST node types
  - longest common subsequence of AST node sequence
  - overlap of function signatures
- Produces a terminal report with a weighted aggregate similarity score and a review recommendation

## Project structure

- `AST/AST/license_checker.py` — main checker implementation
- `AST/AST/original.py` — example/original source file for comparison
- `AST/AST/suspect.py` — example/suspect source file for comparison
- `AST/AST/tests/` — unit tests for the checker
- `AST/AST/tests/fixtures/` — fixture files used by tests
- `web/` — Next.js web app with user login, signup, and profile management
- `supabase/` — database migrations and setup guide for Supabase
- `scripts/` — Part E shell scripts for test automation and batch comparisons

## Requirements

- Python 3.10+ (the code uses modern type annotations and `ast` features)

## Usage

From the `AST/AST` directory, run:

```bash
python license_checker.py
```

Then enter the path to the first file and the second file when prompted.

Example:

```bash
Enter path to first file:  original.py
Enter path to second file: suspect.py
```

If the files are strongly similar, the checker prints a warning or critical result and exits with a non-zero status.

## Web app (user accounts)

The `web/` directory contains a Next.js app with Supabase authentication:

- **Sign up** and **log in** with email/password
- **Dashboard** for authenticated users
- **Profile editing** (name, username, bio, avatar, website)

See [supabase/README.md](supabase/README.md) for database setup instructions.

```bash
cd web
cp .env.local.example .env.local   # then add your Supabase keys
npm install
npm run dev
```

## Shell scripts (Part E)

Automated development tasks live in `scripts/`:

```bash
# Run all Python unit tests with filtered summary
bash scripts/run-tests.sh

# Batch-compare sample file pairs and export results
bash scripts/batch-compare.sh 0.75 report.csv

# Verify Render-deployed API is healthy
bash scripts/check-api.sh
```

See [scripts/README.md](scripts/README.md) for full documentation.

## Testing

From `AST/AST`, run:

```bash
python -m unittest discover -s tests -v
```

This executes the unit tests for feature extraction, similarity metrics, exception handling, and the checker facade.

## Notes

- Input files must use the `.py` extension.
- The checker is intended for structural similarity analysis, not exact text matching.
- This repository is organized as a course project for research applications in software development.
