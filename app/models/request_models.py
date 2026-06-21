from pydantic import BaseModel, Field


class ComparisonRequest(BaseModel):
    file_a: str = Field(..., description="Path to the first Python source file.")
    file_b: str = Field(..., description="Path to the second Python source file.")
    threshold: float = Field(0.75, ge=0.0, le=1.0)
