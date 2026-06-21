from app.models.request_models import ComparisonRequest
from app.models.response_models import ComparisonResponse, HealthResponse
from app.services.similarity_service import SimilarityService


class ComparisonController:
    """Controller responsible for coordinating API requests."""

    def __init__(self, service: SimilarityService | None = None) -> None:
        self.service = service or SimilarityService()

    def compare(self, request: ComparisonRequest) -> ComparisonResponse:
        return self.service.compare(request)

    def health(self) -> HealthResponse:
        return HealthResponse(
            status="ok",
            message="AST similarity checker is running.",
        )
