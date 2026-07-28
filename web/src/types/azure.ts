export type AzureCodeCitation = {
  license: string;
  sourceUrls: string[];
};

export type AzureFileCheckResult = {
  path: string;
  name: string;
  status: "detected" | "clear" | "skipped" | "error";
  detected: boolean;
  citations: AzureCodeCitation[];
  recommendation: string;
  message?: string;
};

export type AzureCheckResult = {
  mode: "azure-protected-material";
  provider: "Azure AI Content Safety";
  repo?: string;
  branch?: string;
  executionMs: number;
  summary: {
    scannedFiles: number;
    detectedFiles: number;
    clearFiles: number;
    skippedFiles: number;
    errorFiles: number;
  };
  files: AzureFileCheckResult[];
  notes: string[];
};
