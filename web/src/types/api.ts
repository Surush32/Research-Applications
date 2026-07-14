export type ComparisonResponse = {
  aggregate: number;
  cosine: number;
  jaccard: number;
  lcs: number;
  signature: number;
  threshold: number;
  exceeds_threshold: boolean;
  recommendation: string;
};

export type ComparisonResult = ComparisonResponse & {
  fileA: string;
  fileB: string;
  executionMs: number;
};

export type HealthResponse = {
  status: string;
  message: string;
};
