"""
license_checker.py — AST-based Python source similarity / licence checker.

OOP design:
  - AstAnalyzer: encapsulates AST feature extraction
  - SimilarityMetric (ABC): polymorphic similarity strategies
  - SimilarityEngine: aggregates weighted metric scores
  - ReportRenderer: encapsulates terminal report output
  - LicenseChecker: facade that orchestrates the full workflow
"""

from __future__ import annotations

import ast
import sys
import argparse
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from collections import Counter


# ──────────────────────────────────────────────
# 1. EXCEPTIONS
# ──────────────────────────────────────────────

class LicenseCheckerError(Exception):
    """Base exception for licence checker failures."""


class SourceFileNotFoundError(LicenseCheckerError):
    """Raised when a source file path does not exist."""


class SourceSyntaxError(LicenseCheckerError):
    """Raised when a source file contains invalid Python syntax."""


# ──────────────────────────────────────────────
# 2. AST FEATURE EXTRACTION
# ──────────────────────────────────────────────

class AstAnalyzer:
    """Encapsulates parsing and AST feature extraction."""

    @staticmethod
    def load_file(filepath: str) -> ast.Module:
        path = Path(filepath)
        if not path.exists():
            raise SourceFileNotFoundError(f"File not found: {filepath}")
        if path.suffix != ".py":
            print(
                f"[WARNING] {filepath} does not have a .py extension — proceeding anyway."
            )
        try:
            source = path.read_text(encoding="utf-8")
            return ast.parse(source, filename=filepath)
        except SyntaxError as exc:
            raise SourceSyntaxError(f"Syntax error in {filepath}: {exc}") from exc

    def node_sequence(self, tree: ast.Module) -> list[str]:
        """Ordered list of AST node-type names (structural shape)."""
        return [type(node).__name__ for node in ast.walk(tree)]

    def node_counts(self, tree: ast.Module) -> Counter:
        """Frequency map of each AST node type."""
        return Counter(type(node).__name__ for node in ast.walk(tree))

    def function_signatures(self, tree: ast.Module) -> list[str]:
        """Function/method signatures: name/arg_count/return_annotated."""
        sigs = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                arg_count = len(node.args.args)
                has_return = node.returns is not None
                sigs.append(f"{node.name}/{arg_count}/{'R' if has_return else 'N'}")
        return sorted(sigs)

    def class_names(self, tree: ast.Module) -> list[str]:
        """Sorted list of class names defined in the file."""
        return sorted(
            node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)
        )

    def import_fingerprint(self, tree: ast.Module) -> list[str]:
        """Normalised list of imported names (module + alias)."""
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                for alias in node.names:
                    imports.append(f"{mod}.{alias.name}")
        return sorted(imports)

    def literal_hash(self, tree: ast.Module) -> str:
        """SHA-256 of all string / numeric literals in the file."""
        literals = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant):
                literals.append(repr(node.value))
        return hashlib.sha256("||".join(sorted(literals)).encode()).hexdigest()


@dataclass(frozen=True)
class AnalysisFeatures:
    """Encapsulated AST features extracted from a single source file."""

    node_sequence: list[str]
    node_counts: Counter
    function_signatures: list[str]
    class_names: list[str]
    import_fingerprint: list[str]
    literal_hash: str

    @classmethod
    def from_tree(cls, tree: ast.Module, analyzer: AstAnalyzer | None = None) -> AnalysisFeatures:
        ast_analyzer = analyzer or AstAnalyzer()
        return cls(
            node_sequence=ast_analyzer.node_sequence(tree),
            node_counts=ast_analyzer.node_counts(tree),
            function_signatures=ast_analyzer.function_signatures(tree),
            class_names=ast_analyzer.class_names(tree),
            import_fingerprint=ast_analyzer.import_fingerprint(tree),
            literal_hash=ast_analyzer.literal_hash(tree),
        )


# ──────────────────────────────────────────────
# 3. SIMILARITY METRICS (Strategy pattern + polymorphism)
# ──────────────────────────────────────────────

class SimilarityMetric(ABC):
    """Abstract base for a weighted similarity strategy."""

    name: str
    weight: float

    @abstractmethod
    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        """Return a similarity score in [0.0, 1.0]."""


class CosineMetric(SimilarityMetric):
    name = "cosine"
    weight = 0.30

    @staticmethod
    def compare_counters(c1: Counter, c2: Counter) -> float:
        all_keys = set(c1) | set(c2)
        if not all_keys:
            return 0.0
        dot = sum(c1[k] * c2[k] for k in all_keys)
        mag1 = sum(v ** 2 for v in c1.values()) ** 0.5
        mag2 = sum(v ** 2 for v in c2.values()) ** 0.5
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot / (mag1 * mag2)

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_counters(left.node_counts, right.node_counts)


class JaccardMetric(SimilarityMetric):
    name = "jaccard"
    weight = 0.15

    @staticmethod
    def compare_sequences(seq1: list, seq2: list) -> float:
        s1, s2 = set(seq1), set(seq2)
        if not s1 and not s2:
            return 1.0
        return len(s1 & s2) / len(s1 | s2)

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_sequences(left.node_sequence, right.node_sequence)


class SequenceOverlapMetric(SimilarityMetric):
    name = "lcs"
    weight = 0.30

    @staticmethod
    def compare_sequences(seq1: list[str], seq2: list[str]) -> float:
        a, b = seq1[:10_000], seq2[:10_000]
        m, n = len(a), len(b)
        prev = [0] * (n + 1)
        for i in range(1, m + 1):
            curr = [0] * (n + 1)
            for j in range(1, n + 1):
                if a[i - 1] == b[j - 1]:
                    curr[j] = prev[j - 1] + 1
                else:
                    curr[j] = max(prev[j], curr[j - 1])
            prev = curr
        lcs_len = prev[n]
        return (2 * lcs_len) / (m + n) if (m + n) > 0 else 0.0

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_sequences(left.node_sequence, right.node_sequence)


class SignatureOverlapMetric(SimilarityMetric):
    name = "signature"
    weight = 0.25

    @staticmethod
    def compare_signatures(sigs1: list[str], sigs2: list[str]) -> float:
        s1, s2 = set(sigs1), set(sigs2)
        if not s1 and not s2:
            return 0.0
        return len(s1 & s2) / max(len(s1), len(s2), 1)

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_signatures(
            left.function_signatures, right.function_signatures
        )


DEFAULT_METRICS: tuple[SimilarityMetric, ...] = (
    CosineMetric(),
    JaccardMetric(),
    SequenceOverlapMetric(),
    SignatureOverlapMetric(),
)

WEIGHTS = {metric.name: metric.weight for metric in DEFAULT_METRICS}


class SimilarityEngine:
    """Runs polymorphic metrics and produces a weighted aggregate score."""

    def __init__(
        self,
        metrics: tuple[SimilarityMetric, ...] | None = None,
        analyzer: AstAnalyzer | None = None,
    ):
        self._metrics = metrics or DEFAULT_METRICS
        self._analyzer = analyzer or AstAnalyzer()

    def compare(self, tree_a: ast.Module, tree_b: ast.Module) -> dict[str, float]:
        features_a = AnalysisFeatures.from_tree(tree_a, self._analyzer)
        features_b = AnalysisFeatures.from_tree(tree_b, self._analyzer)

        scores: dict[str, float] = {}
        for metric in self._metrics:
            scores[metric.name] = metric.compute(features_a, features_b)

        scores["aggregate"] = sum(
            scores[metric.name] * metric.weight for metric in self._metrics
        )
        return scores


# ──────────────────────────────────────────────
# 4. REPORT RENDERING
# ──────────────────────────────────────────────

class ReportRenderer:
    """Encapsulates formatted terminal report output."""

    _ANSI = {
        "red": "\033[91m",
        "yellow": "\033[93m",
        "green": "\033[92m",
        "cyan": "\033[96m",
        "bold": "\033[1m",
        "reset": "\033[0m",
    }

    def __init__(self, analyzer: AstAnalyzer | None = None):
        self._analyzer = analyzer or AstAnalyzer()

    @classmethod
    def _colour(cls, text: str, *styles: str) -> str:
        prefix = "".join(cls._ANSI[s] for s in styles)
        return f"{prefix}{text}{cls._ANSI['reset']}"

    @staticmethod
    def bar(value: float, width: int = 30) -> str:
        filled = int(round(value * width))
        return "[" + "█" * filled + "░" * (width - filled) + "]"

    def severity_label(self, score: float, threshold: float) -> str:
        if score >= 0.90:
            return self._colour("CRITICAL — Likely direct copy", "red", "bold")
        if score >= threshold:
            return self._colour("WARNING  — High structural similarity", "yellow", "bold")
        return self._colour("CLEAR    — Below threshold", "green", "bold")

    def render(
        self,
        file_a: str,
        file_b: str,
        scores: dict[str, float],
        threshold: float,
        tree_a: ast.Module,
        tree_b: ast.Module,
    ) -> None:
        agg = scores["aggregate"]
        width = 60

        print()
        print(self._colour("═" * width, "bold"))
        print(self._colour("  LICENSE / PLAGIARISM CHECK REPORT", "bold", "cyan"))
        print(self._colour("═" * width, "bold"))

        print(f"\n  {'File A':<10} {self._colour(file_a, 'bold')}")
        print(f"  {'File B':<10} {self._colour(file_b, 'bold')}")
        print(f"  {'Threshold':<10} {threshold:.0%}\n")

        print(self._colour("  ── Similarity Scores ──────────────────────────", "bold"))
        labels = {
            "cosine": "Node-freq cosine",
            "jaccard": "Node-type Jaccard",
            "lcs": "Structural LCS",
            "signature": "Function signatures",
        }
        for key, label in labels.items():
            value = scores[key]
            colour = (
                "red"
                if value >= threshold
                else ("yellow" if value >= threshold * 0.8 else "green")
            )
            print(f"  {label:<22} {self.bar(value)}  {self._colour(f'{value:.1%}', colour)}")

        print()
        print(
            f"  {'Aggregate (weighted)':<22} {self.bar(agg)}  "
            f"{self._colour(f'{agg:.1%}', 'bold')}"
        )
        print()
        print(f"  Status: {self.severity_label(agg, threshold)}")
        print()

        sigs_a = set(self._analyzer.function_signatures(tree_a))
        sigs_b = set(self._analyzer.function_signatures(tree_b))
        shared_sigs = sigs_a & sigs_b
        cls_a = set(self._analyzer.class_names(tree_a))
        cls_b = set(self._analyzer.class_names(tree_b))
        shared_cls = cls_a & cls_b
        imp_a = set(self._analyzer.import_fingerprint(tree_a))
        imp_b = set(self._analyzer.import_fingerprint(tree_b))
        shared_imp = imp_a & imp_b
        same_literals = self._analyzer.literal_hash(tree_a) == self._analyzer.literal_hash(
            tree_b
        )

        print(self._colour("  ── Structural Details ─────────────────────────", "bold"))
        print(f"  Shared function signatures : {len(shared_sigs)}")
        if shared_sigs:
            for sig in sorted(shared_sigs)[:5]:
                name = sig.split("/")[0]
                print(f"    • {name}")
            if len(shared_sigs) > 5:
                print(f"    … and {len(shared_sigs) - 5} more")

        print(f"  Shared class names         : {len(shared_cls)}")
        if shared_cls:
            for cls_name in sorted(shared_cls)[:5]:
                print(f"    • {cls_name}")

        print(f"  Shared imports             : {len(shared_imp)}")
        literal_msg = (
            self._colour("YES — strong copy signal", "red", "bold")
            if same_literals
            else self._colour("No", "green")
        )
        print(f"  Identical literal sets     : {literal_msg}")

        print()
        print(self._colour("  ── Recommendation ─────────────────────────────", "bold"))
        if agg >= 0.90:
            print(
                self._colour(
                    "  ⚠  CRITICAL: The files are nearly identical at the structural\n"
                    "     level. Manual review is strongly advised before shipping.\n"
                    "     Verify that licences permit inclusion or that this is\n"
                    "     intentional (e.g. a refactored copy of your own code).",
                    "red",
                )
            )
        elif agg >= threshold:
            print(
                self._colour(
                    "  ⚠  WARNING: Structural similarity exceeds the set threshold.\n"
                    "     Review shared functions/classes listed above and confirm\n"
                    "     that any borrowed code carries the appropriate licence\n"
                    "     header, attribution comment, or is your own work.",
                    "yellow",
                )
            )
        else:
            print(
                self._colour(
                    "  ✔  No significant structural similarity detected.\n"
                    "     The files appear to be independently authored.",
                    "green",
                )
            )

        print(self._colour("═" * width, "bold"))
        print()


# ──────────────────────────────────────────────
# 5. FACADE — orchestrates the full workflow
# ──────────────────────────────────────────────

class LicenseChecker:
    """Facade: load sources, compare structure, render report."""

    def __init__(
        self,
        threshold: float = 0.75,
        engine: SimilarityEngine | None = None,
        renderer: ReportRenderer | None = None,
        analyzer: AstAnalyzer | None = None,
    ):
        self.threshold = threshold
        self._analyzer = analyzer or AstAnalyzer()
        self._engine = engine or SimilarityEngine(analyzer=self._analyzer)
        self._renderer = renderer or ReportRenderer(analyzer=self._analyzer)

    def run(self, file_a: str, file_b: str, *, render: bool = True) -> dict[str, float]:
        print(self._renderer._colour(f"\nParsing {file_a} …", "cyan"))
        tree_a = self._analyzer.load_file(file_a)

        print(self._renderer._colour(f"Parsing {file_b} …", "cyan"))
        tree_b = self._analyzer.load_file(file_b)

        print(self._renderer._colour("Running similarity analysis …\n", "cyan"))
        scores = self._engine.compare(tree_a, tree_b)

        if render:
            self._renderer.render(
                file_a, file_b, scores, self.threshold, tree_a, tree_b
            )
        return scores

    def exceeds_threshold(self, scores: dict[str, float]) -> bool:
        return scores["aggregate"] >= self.threshold


# ──────────────────────────────────────────────
# 6. MODULE-LEVEL API (backward compatible with tests)
# ──────────────────────────────────────────────

_default_analyzer = AstAnalyzer()
_default_engine = SimilarityEngine(analyzer=_default_analyzer)
_default_renderer = ReportRenderer(_default_analyzer)


def load_ast(filepath: str) -> ast.Module:
    return _default_analyzer.load_file(filepath)


def extract_node_sequence(tree: ast.Module) -> list[str]:
    return _default_analyzer.node_sequence(tree)


def extract_node_counts(tree: ast.Module) -> Counter:
    return _default_analyzer.node_counts(tree)


def extract_function_signatures(tree: ast.Module) -> list[str]:
    return _default_analyzer.function_signatures(tree)


def extract_class_names(tree: ast.Module) -> list[str]:
    return _default_analyzer.class_names(tree)


def extract_import_fingerprint(tree: ast.Module) -> list[str]:
    return _default_analyzer.import_fingerprint(tree)


def literal_hash(tree: ast.Module) -> str:
    return _default_analyzer.literal_hash(tree)


def cosine_similarity(c1: Counter, c2: Counter) -> float:
    return CosineMetric.compare_counters(c1, c2)


def jaccard_similarity(seq1: list, seq2: list) -> float:
    return JaccardMetric.compare_sequences(seq1, seq2)


def sequence_overlap(seq1: list[str], seq2: list[str]) -> float:
    return SequenceOverlapMetric.compare_sequences(seq1, seq2)


def signature_overlap(sigs1: list[str], sigs2: list[str]) -> float:
    return SignatureOverlapMetric.compare_signatures(sigs1, sigs2)


def compute_similarity(tree_a: ast.Module, tree_b: ast.Module) -> dict:
    return _default_engine.compare(tree_a, tree_b)


def c(text: str, *styles: str) -> str:
    return ReportRenderer._colour(text, *styles)


def bar(value: float, width: int = 30) -> str:
    return ReportRenderer.bar(value, width)


def severity_label(score: float, threshold: float) -> str:
    return _default_renderer.severity_label(score, threshold)


def print_report(
    file_a: str,
    file_b: str,
    scores: dict,
    threshold: float,
    tree_a: ast.Module,
    tree_b: ast.Module,
) -> None:
    _default_renderer.render(file_a, file_b, scores, threshold, tree_a, tree_b)


# ──────────────────────────────────────────────
# 7. ENTRY POINT
# ──────────────────────────────────────────────

def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        description="AST-based Python source similarity / licence checker."
    )
    parser.add_argument(
        "--threshold",
        "-t",
        type=float,
        default=0.75,
        help="Similarity threshold that triggers a warning (default: 0.75)",
    )
    args = parser.parse_args()

    file_a = input("Enter path to first file:  ").strip()
    file_b = input("Enter path to second file: ").strip()

    try:
        checker = LicenseChecker(threshold=args.threshold)
        scores = checker.run(file_a, file_b)
    except LicenseCheckerError as exc:
        print(f"[ERROR] {exc}")
        sys.exit(1)

    sys.exit(1 if checker.exceeds_threshold(scores) else 0)


if __name__ == "__main__":
    main()
