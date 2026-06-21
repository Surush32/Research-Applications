import ast
import hashlib
from collections import Counter
from pathlib import Path

from app.core.exceptions import (
    SourceFileNotFoundError,
    SourceInvalidExtensionError,
    SourceSyntaxError,
)


class AstAnalyzer:
    """Encapsulates AST parsing and feature extraction."""

    @staticmethod
    def load_file(filepath: str) -> ast.Module:
        path = Path(filepath)
        if not path.exists():
            raise SourceFileNotFoundError(f"File not found: {filepath}")
        if path.suffix != ".py":
            raise SourceInvalidExtensionError(
                f"Unsupported file extension for {filepath}: expected .py"
            )
        try:
            source = path.read_text(encoding="utf-8")
            return ast.parse(source, filename=filepath)
        except SyntaxError as exc:
            raise SourceSyntaxError(f"Syntax error in {filepath}: {exc}") from exc

    def node_sequence(self, tree: ast.Module) -> list[str]:
        return [type(node).__name__ for node in ast.walk(tree)]

    def node_counts(self, tree: ast.Module) -> Counter:
        return Counter(type(node).__name__ for node in ast.walk(tree))

    def function_signatures(self, tree: ast.Module) -> list[str]:
        sigs = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                arg_count = len(node.args.args)
                has_return = node.returns is not None
                sigs.append(f"{node.name}/{arg_count}/{'R' if has_return else 'N'}")
        return sorted(sigs)

    def class_names(self, tree: ast.Module) -> list[str]:
        return sorted(
            node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)
        )

    def import_fingerprint(self, tree: ast.Module) -> list[str]:
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
        literals = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant):
                literals.append(repr(node.value))
        return hashlib.sha256("||".join(sorted(literals)).encode()).hexdigest()


class AnalysisFeatures:
    def __init__(
        self,
        node_sequence: list[str],
        node_counts: Counter,
        function_signatures: list[str],
        class_names: list[str],
        import_fingerprint: list[str],
        literal_hash: str,
    ):
        self.node_sequence = node_sequence
        self.node_counts = node_counts
        self.function_signatures = function_signatures
        self.class_names = class_names
        self.import_fingerprint = import_fingerprint
        self.literal_hash = literal_hash

    @classmethod
    def from_tree(cls, tree: ast.Module, analyzer: AstAnalyzer | None = None):
        analyzer = analyzer or AstAnalyzer()
        return cls(
            node_sequence=analyzer.node_sequence(tree),
            node_counts=analyzer.node_counts(tree),
            function_signatures=analyzer.function_signatures(tree),
            class_names=analyzer.class_names(tree),
            import_fingerprint=analyzer.import_fingerprint(tree),
            literal_hash=analyzer.literal_hash(tree),
        )
