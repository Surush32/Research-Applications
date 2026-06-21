import ast

from app.utils.ast_helpers import AnalysisFeatures, AstAnalyzer
from app.utils.similarity_metrics import (
    CosineMetric,
    JaccardMetric,
    SequenceOverlapMetric,
    SignatureOverlapMetric,
    SimilarityMetric,
)


class SimilarityEngine:
    """Aggregates weighted metric scores for two ASTs."""

    def __init__(
        self,
        metrics: tuple[SimilarityMetric, ...] | None = None,
        analyzer: AstAnalyzer | None = None,
    ):
        self._metrics = metrics or (
            CosineMetric(),
            JaccardMetric(),
            SequenceOverlapMetric(),
            SignatureOverlapMetric(),
        )
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
