from app.core.config import settings
from app.core.exceptions import LicenseCheckerError
from app.models.request_models import ComparisonRequest
from app.models.response_models import ComparisonResponse
from app.utils.ast_helpers import AstAnalyzer
from app.utils.similarity_engine import SimilarityEngine


class SimilarityService:
    """Service layer for running the AST similarity logic."""

    def __init__(self) -> None:
        self.analyzer = AstAnalyzer()
        self.engine = SimilarityEngine(analyzer=self.analyzer)

    def compare(self, request: ComparisonRequest) -> ComparisonResponse:
        try:
            tree_a = self.analyzer.load_file(request.file_a)
            tree_b = self.analyzer.load_file(request.file_b)
            scores = self.engine.compare(tree_a, tree_b)
        except LicenseCheckerError as exc:
            raise exc

        aggregate = scores["aggregate"]
        threshold = request.threshold if request.threshold is not None else settings.DEFAULT_THRESHOLD

        if aggregate >= 0.90:
            recommendation = "Manual review strongly advised. Files appear nearly identical."
        elif aggregate >= threshold:
            recommendation = "Review suspected similarities before use or redistribution."
        else:
            recommendation = "No significant structural similarity detected."

        return ComparisonResponse(
            aggregate=aggregate,
            cosine=scores["cosine"],
            jaccard=scores["jaccard"],
            lcs=scores["lcs"],
            signature=scores["signature"],
            threshold=threshold,
            exceeds_threshold=aggregate >= threshold,
            recommendation=recommendation,
        )
