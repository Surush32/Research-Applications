from fastapi import APIRouter

from app.controllers.comparison_controller import ComparisonController
from app.models.request_models import ComparisonRequest
from app.models.response_models import ComparisonResponse, HealthResponse

router = APIRouter()
controller = ComparisonController()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return controller.health()


@router.post("/compare", response_model=ComparisonResponse)
def compare_files(payload: ComparisonRequest) -> ComparisonResponse:
    return controller.compare(payload)
