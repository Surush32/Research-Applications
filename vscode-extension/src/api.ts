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

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatComparisonReport(
  fileA: string,
  fileB: string,
  result: ComparisonResponse
): string {
  const status = result.exceeds_threshold
    ? "FLAGGED — high structural similarity"
    : "CLEAR — below similarity threshold";

  return [
    "Lineage Copy Check",
    "==================",
    `File A: ${fileA}`,
    `File B: ${fileB}`,
    `Status: ${status}`,
    `Recommendation: ${result.recommendation}`,
    "",
    `Aggregate:  ${pct(result.aggregate)}  (threshold ${result.threshold})`,
    `Cosine:     ${pct(result.cosine)}`,
    `Jaccard:    ${pct(result.jaccard)}`,
    `LCS:        ${pct(result.lcs)}`,
    `Signature:  ${pct(result.signature)}`,
    "",
    "Notes:",
    "- Scores measure structural AST similarity, not legal certainty.",
    "- If flagged: rewrite control flow, or keep required attribution/license notices.",
  ].join("\n");
}

export async function comparePythonFiles(options: {
  apiUrl: string;
  threshold: number;
  fileAName: string;
  fileAContent: string;
  fileBName: string;
  fileBContent: string;
}): Promise<ComparisonResponse> {
  const base = options.apiUrl.replace(/\/$/, "");
  const form = new FormData();
  form.append(
    "file_a",
    new Blob([options.fileAContent], { type: "text/x-python" }),
    options.fileAName
  );
  form.append(
    "file_b",
    new Blob([options.fileBContent], { type: "text/x-python" }),
    options.fileBName
  );
  form.append("threshold", String(options.threshold));

  const res = await fetch(`${base}/compare`, {
    method: "POST",
    body: form,
  });

  const data = (await res.json()) as ComparisonResponse & {
    detail?: { msg?: string }[] | string;
  };

  if (!res.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : data.detail?.[0]?.msg ?? `Comparison failed (${res.status})`;
    throw new Error(detail);
  }

  return data;
}
