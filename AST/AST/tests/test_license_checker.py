"""
Unit tests for license_checker.py — Phase 2 Part D deliverable.
Run from the AST/AST directory: python -m unittest discover -s tests -v
"""

import ast
import sys
import unittest
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import license_checker as lc

FIXTURES = Path(__file__).resolve().parent / "fixtures"
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def parse_source(source: str) -> ast.Module:
    return ast.parse(source)


def parse_file(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


class TestSimilarityMetrics(unittest.TestCase):
    def test_cosine_identical_counters(self):
        c = Counter({"Module": 1, "FunctionDef": 2})
        self.assertAlmostEqual(lc.cosine_similarity(c, c), 1.0)

    def test_cosine_disjoint_counters(self):
        c1 = Counter({"Module": 1})
        c2 = Counter({"ClassDef": 1})
        self.assertAlmostEqual(lc.cosine_similarity(c1, c2), 0.0)

    def test_cosine_empty_counters(self):
        self.assertAlmostEqual(lc.cosine_similarity(Counter(), Counter()), 0.0)

    def test_jaccard_identical_sequences(self):
        seq = ["Module", "FunctionDef", "Return"]
        self.assertAlmostEqual(lc.jaccard_similarity(seq, seq), 1.0)

    def test_jaccard_disjoint_sequences(self):
        self.assertAlmostEqual(
            lc.jaccard_similarity(["Module"], ["ClassDef"]),
            0.0,
        )

    def test_jaccard_both_empty(self):
        self.assertAlmostEqual(lc.jaccard_similarity([], []), 1.0)

    def test_sequence_overlap_identical(self):
        seq = ["A", "B", "C", "D"]
        self.assertAlmostEqual(lc.sequence_overlap(seq, seq), 1.0)

    def test_sequence_overlap_no_shared_nodes(self):
        score = lc.sequence_overlap(["A", "B"], ["C", "D"])
        self.assertGreaterEqual(score, 0.0)
        self.assertLess(score, 0.5)

    def test_signature_overlap_shared_functions(self):
        sigs_a = ["run/1/N", "load/0/R"]
        sigs_b = ["run/1/N", "export/1/N"]
        self.assertAlmostEqual(lc.signature_overlap(sigs_a, sigs_b), 0.5)

    def test_signature_overlap_both_empty(self):
        self.assertAlmostEqual(lc.signature_overlap([], []), 0.0)


class TestAstExtraction(unittest.TestCase):
    def test_extract_function_signatures(self):
        tree = parse_source(
            "def alpha(x, y):\n    return x\n\nasync def beta():\n    pass\n"
        )
        sigs = lc.extract_function_signatures(tree)
        self.assertIn("alpha/2/N", sigs)
        self.assertIn("beta/0/N", sigs)

    def test_extract_class_names(self):
        tree = parse_source("class Widget:\n    pass\nclass Gadget:\n    pass\n")
        self.assertEqual(lc.extract_class_names(tree), ["Gadget", "Widget"])

    def test_extract_import_fingerprint(self):
        tree = parse_source("import os\nfrom json import dumps\n")
        imports = lc.extract_import_fingerprint(tree)
        self.assertIn("os", imports)
        self.assertIn("json.dumps", imports)

    def test_literal_hash_matches_for_same_literals(self):
        tree_a = parse_source('MSG = "hello"\nCOUNT = 42\n')
        tree_b = parse_source('LABEL = "hello"\nTOTAL = 42\n')
        self.assertEqual(lc.literal_hash(tree_a), lc.literal_hash(tree_b))

    def test_literal_hash_differs_for_different_literals(self):
        tree_a = parse_source('MSG = "hello"\n')
        tree_b = parse_source('MSG = "goodbye"\n')
        self.assertNotEqual(lc.literal_hash(tree_a), lc.literal_hash(tree_b))


class TestComputeSimilarity(unittest.TestCase):
    def test_scores_in_valid_range(self):
        tree_a = parse_file(PROJECT_ROOT / "original.py")
        tree_b = parse_file(PROJECT_ROOT / "suspect.py")
        scores = lc.compute_similarity(tree_a, tree_b)

        for key in ("cosine", "jaccard", "lcs", "signature", "aggregate"):
            self.assertIn(key, scores)
            self.assertGreaterEqual(scores[key], 0.0)
            self.assertLessEqual(scores[key], 1.0)

    def test_renamed_copy_scores_above_threshold(self):
        """original.py vs suspect.py should flag high structural similarity."""
        tree_a = parse_file(PROJECT_ROOT / "original.py")
        tree_b = parse_file(PROJECT_ROOT / "suspect.py")
        scores = lc.compute_similarity(tree_a, tree_b)
        self.assertGreaterEqual(scores["aggregate"], 0.75)

    def test_unrelated_files_score_below_threshold(self):
        tree_a = parse_file(FIXTURES / "distinct_a.py")
        tree_b = parse_file(FIXTURES / "distinct_b.py")
        scores = lc.compute_similarity(tree_a, tree_b)
        self.assertLess(scores["aggregate"], 0.75)

    def test_identical_file_perfect_similarity(self):
        tree = parse_file(PROJECT_ROOT / "original.py")
        scores = lc.compute_similarity(tree, tree)
        self.assertAlmostEqual(scores["aggregate"], 1.0)


class TestOopDesign(unittest.TestCase):
    def test_polymorphic_metrics_share_interface(self):
        left = lc.AnalysisFeatures.from_tree(parse_source("def f():\n    pass\n"))
        right = lc.AnalysisFeatures.from_tree(parse_source("def g():\n    pass\n"))
        for metric in lc.DEFAULT_METRICS:
            score = metric.compute(left, right)
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 1.0)

    def test_license_checker_facade_runs_comparison(self):
        checker = lc.LicenseChecker(threshold=0.75)
        scores = checker.run(
            str(PROJECT_ROOT / "original.py"),
            str(PROJECT_ROOT / "suspect.py"),
            render=False,
        )
        self.assertGreaterEqual(scores["aggregate"], 0.75)
        self.assertTrue(checker.exceeds_threshold(scores))


class TestExceptionHandling(unittest.TestCase):
    def test_load_ast_raises_for_missing_file(self):
        with self.assertRaises(lc.SourceFileNotFoundError):
            lc.load_ast("this_file_does_not_exist.py")

    def test_load_ast_raises_for_syntax_error(self):
        bad_file = FIXTURES / "syntax_error.py"
        bad_file.write_text("def broken(\n", encoding="utf-8")
        self.addCleanup(lambda: bad_file.unlink(missing_ok=True))
        with self.assertRaises(lc.SourceSyntaxError):
            lc.load_ast(str(bad_file))

    def test_load_ast_raises_for_invalid_extension(self):
        bad_file = FIXTURES / "wrong_extension.txt"
        bad_file.write_text("print('hello')\n", encoding="utf-8")
        self.addCleanup(lambda: bad_file.unlink(missing_ok=True))
        with self.assertRaises(lc.SourceInvalidExtensionError):
            lc.load_ast(str(bad_file))


class TestReportHelpers(unittest.TestCase):
    def test_bar_renders_full_and_empty(self):
        self.assertIn("█", lc.bar(1.0))
        self.assertNotIn("█", lc.bar(0.0))

    def test_severity_label_thresholds(self):
        low = lc.severity_label(0.5, 0.75)
        self.assertIn("CLEAR", low)
        high = lc.severity_label(0.95, 0.75)
        self.assertIn("CRITICAL", high)


if __name__ == "__main__":
    unittest.main()
