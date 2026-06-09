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
