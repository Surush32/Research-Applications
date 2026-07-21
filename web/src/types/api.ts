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

export type CorpusMatch = ComparisonResponse & {
  corpusId: string;
  corpusTitle: string;
  corpusFilename: string;
  corpusLicense: string;
  corpusSource: string;
  fingerprintScore: number;
};

export type ScanFileResult = {
  suspectPath: string;
  suspectName: string;
  matches: CorpusMatch[];
  bestMatch: CorpusMatch | null;
  exceeds_threshold: boolean;
};

export type CorpusScanResult = {
  mode: "corpus-scan";
  repo?: string;
  branch?: string;
  threshold: number;
  topK: number;
  executionMs: number;
  files: ScanFileResult[];
  summary: {
    scannedFiles: number;
    flaggedFiles: number;
    totalMatches: number;
  };
};
