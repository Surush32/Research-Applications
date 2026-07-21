#!/usr/bin/env python3
"""
original.py — User analytics pipeline (original implementation)
"""

import os
import json
import csv
from pathlib import Path
from datetime import datetime


class UserRecord:
    def __init__(self, user_id: int, name: str, email: str, score: float):
        self.user_id = user_id
        self.name = name
        self.email = email
        self.score = score
        self.created_at = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return {
            "id": self.user_id,
            "name": self.name,
            "email": self.email,
            "score": self.score,
            "created_at": self.created_at,
        }

    def is_high_value(self, threshold: float = 80.0) -> bool:
        return self.score >= threshold


class AnalyticsPipeline:
    def __init__(self, input_path: str, output_path: str):
        self.input_path = input_path
        self.output_path = output_path
        self.records: list[UserRecord] = []
        self.errors: list[str] = []

    def load_csv(self) -> int:
        with open(self.input_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    record = UserRecord(
                        user_id=int(row["id"]),
                        name=row["name"],
                        email=row["email"],
                        score=float(row["score"]),
                    )
                    self.records.append(record)
                except (KeyError, ValueError) as e:
                    self.errors.append(f"Row skipped: {e}")
        return len(self.records)

    def filter_high_value(self, threshold: float = 80.0) -> list[UserRecord]:
        return [r for r in self.records if r.is_high_value(threshold)]

    def compute_stats(self) -> dict:
        if not self.records:
            return {}
        scores = [r.score for r in self.records]
        return {
            "count": len(scores),
            "mean": sum(scores) / len(scores),
            "max": max(scores),
            "min": min(scores),
        }

    def export_json(self, subset: list[UserRecord] | None = None) -> None:
        data = [r.to_dict() for r in (subset or self.records)]
        Path(self.output_path).write_text(json.dumps(data, indent=2), encoding="utf-8")

    def run(self, threshold: float = 80.0) -> dict:
        count = self.load_csv()
        high_value = self.filter_high_value(threshold)
        stats = self.compute_stats()
        self.export_json(high_value)
        return {
            "loaded": count,
            "exported": len(high_value),
            "stats": stats,
            "errors": self.errors,
        }


def summarise(result: dict) -> None:
    print(f"Records loaded : {result['loaded']}")
    print(f"Records exported: {result['exported']}")
    print(f"Score stats    : {result['stats']}")
    if result["errors"]:
        print(f"Errors ({len(result['errors'])}):")
        for err in result["errors"]:
            print(f"  - {err}")


if __name__ == "__main__":
    pipeline = AnalyticsPipeline("users.csv", "high_value.json")
    output = pipeline.run(threshold=75.0)
    summarise(output)
