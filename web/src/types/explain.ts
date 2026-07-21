export type ExplainRequest = {
  suspectName: string;
  suspectPath?: string;
  corpusTitle?: string;
  corpusLicense?: string;
  corpusFilename?: string;
  recommendation?: string;
  threshold: number;
  scores: {
    aggregate: number;
    cosine?: number;
    jaccard?: number;
    lcs?: number;
    signature?: number;
    fingerprintScore?: number;
  };
};

export type ExplainResponse = {
  explanation: string;
  source: "llm" | "local";
};
