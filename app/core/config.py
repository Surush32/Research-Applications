from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    APP_TITLE: str = "AST Similarity Checker"
    APP_VERSION: str = "1.0.0"
    DEFAULT_THRESHOLD: float = 0.75


settings = Settings()
