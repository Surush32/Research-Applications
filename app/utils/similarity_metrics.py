from abc import ABC, abstractmethod
from collections import Counter

from app.utils.ast_helpers import AnalysisFeatures


class SimilarityMetric(ABC):
    """Abstract strategy for similarity metrics."""

    name: str
    weight: float

    @abstractmethod
    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        """Return a similarity score in the range [0.0, 1.0]."""


class CosineMetric(SimilarityMetric):
    name = "cosine"
    weight = 0.30

    @staticmethod
    def compare_counters(c1: Counter, c2: Counter) -> float:
        all_keys = set(c1) | set(c2)
        if not all_keys:
            return 0.0
        dot = sum(c1[k] * c2[k] for k in all_keys)
        mag1 = sum(v ** 2 for v in c1.values()) ** 0.5
        mag2 = sum(v ** 2 for v in c2.values()) ** 0.5
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot / (mag1 * mag2)

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_counters(left.node_counts, right.node_counts)


class JaccardMetric(SimilarityMetric):
    name = "jaccard"
    weight = 0.15

    @staticmethod
    def compare_sequences(seq1: list, seq2: list) -> float:
        s1, s2 = set(seq1), set(seq2)
        if not s1 and not s2:
            return 1.0
        return len(s1 & s2) / len(s1 | s2)

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_sequences(left.node_sequence, right.node_sequence)


class SequenceOverlapMetric(SimilarityMetric):
    name = "lcs"
    weight = 0.30

    @staticmethod
    def compare_sequences(seq1: list[str], seq2: list[str]) -> float:
        a, b = seq1[:10_000], seq2[:10_000]
        m, n = len(a), len(b)
        prev = [0] * (n + 1)
        for i in range(1, m + 1):
            curr = [0] * (n + 1)
            for j in range(1, n + 1):
                if a[i - 1] == b[j - 1]:
                    curr[j] = prev[j - 1] + 1
                else:
                    curr[j] = max(prev[j], curr[j - 1])
            prev = curr
        lcs_len = prev[n]
        return (2 * lcs_len) / (m + n) if (m + n) > 0 else 0.0

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_sequences(left.node_sequence, right.node_sequence)


class SignatureOverlapMetric(SimilarityMetric):
    name = "signature"
    weight = 0.25

    @staticmethod
    def compare_signatures(sigs1: list[str], sigs2: list[str]) -> float:
        s1, s2 = set(sigs1), set(sigs2)
        if not s1 and not s2:
            return 0.0
        return len(s1 & s2) / max(len(s1), len(s2), 1)

    def compute(self, left: AnalysisFeatures, right: AnalysisFeatures) -> float:
        return self.compare_signatures(
            left.function_signatures, right.function_signatures
        )
