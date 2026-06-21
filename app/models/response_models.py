from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    message: str


class ComparisonResponse(BaseModel):
    aggregate: float = Field(..., ge=0.0, le=1.0)
    cosine: float = Field(..., ge=0.0, le=1.0)
    jaccard: float = Field(..., ge=0.0, le=1.0)
    lcs: float = Field(..., ge=0.0, le=1.0)
    signature: float = Field(..., ge=0.0, le=1.0)
    threshold: float
    exceeds_threshold: bool
    recommendation: str
