#!/usr/bin/env python3
"""
suspect.py — Customer scoring engine
"""

import os
import json
import csv
from pathlib import Path
from datetime import datetime


class CustomerEntry:
    def __init__(self, cid: int, full_name: str, contact: str, rating: float):
        self.user_id = cid
        self.name = full_name
        self.email = contact
        self.score = rating
        self.created_at = datetime.now().isoformat()

    def is_high_value(self, cutoff: float = 80.0) -> bool:
        return self.score >= cutoff

    def to_dict(self) -> dict:
        return {
            "id": self.user_id,
            "name": self.name,
            "email": self.email,
            "score": self.score,
            "created_at": self.created_at,
        }


class ScoringEngine:
    def __init__(self, src: str, dest: str):
        self.input_path = src
        self.output_path = dest
        self.records: list[CustomerEntry] = []
        self.errors: list[str] = []

    def load_csv(self) -> int:
        with open(self.input_path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                try:
                    entry = CustomerEntry(
                        cid=int(row["id"]),
                        full_name=row["name"],
                        contact=row["email"],
                        rating=float(row["score"]),
                    )
                    self.records.append(entry)
                except (KeyError, ValueError) as exc:
                    self.errors.append(f"Row skipped: {exc}")
        return len(self.records)

    def compute_stats(self) -> dict:
        if not self.records:
            return {}
        scores = [e.score for e in self.records]
        return {
            "count": len(scores),
            "mean": sum(scores) / len(scores),
            "max": max(scores),
            "min": min(scores),
        }

    def filter_high_value(self, cutoff: float = 80.0) -> list[CustomerEntry]:
        return [e for e in self.records if e.is_high_value(cutoff)]

    def export_json(self, subset: list[CustomerEntry] | None = None) -> None:
        payload = [e.to_dict() for e in (subset or self.records)]
        Path(self.output_path).write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def run(self, cutoff: float = 80.0) -> dict:
        total = self.load_csv()
        top_customers = self.filter_high_value(cutoff)
        stats = self.compute_stats()
        self.export_json(top_customers)
        return {
            "loaded": total,
            "exported": len(top_customers),
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
    engine = ScoringEngine("customers.csv", "top_customers.json")
    output = engine.run(cutoff=75.0)
    summarise(output)
