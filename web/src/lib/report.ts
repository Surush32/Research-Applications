import type { ComparisonResult, CorpusScanResult } from "@/types/api";
import type { AzureCheckResult } from "@/types/azure";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function stamp() {
  return new Date().toISOString();
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildComparisonReport(results: ComparisonResult): string {
  const status = results.exceeds_threshold
    ? "FLAGGED — high similarity detected"
    : "CLEAR — no significant similarity";

  return [
    "# Lineage comparison report",
    "",
    `Generated: ${stamp()}`,
    `Status: ${status}`,
    `Recommendation: ${results.recommendation}`,
    "",
    "## Files",
    `- File A: ${results.fileA}`,
    `- File B: ${results.fileB}`,
    `- Threshold: ${results.threshold}`,
    `- Analysis time: ${results.executionMs}ms`,
    "",
    "## Scores",
    `| Metric | Score |`,
    `| --- | --- |`,
    `| Aggregate | ${pct(results.aggregate)} |`,
    `| Cosine | ${pct(results.cosine)} |`,
    `| Jaccard | ${pct(results.jaccard)} |`,
    `| LCS overlap | ${pct(results.lcs)} |`,
    `| Signature overlap | ${pct(results.signature)} |`,
    "",
    "## Notes",
    "- Lineage compares structural AST features, not only identical text.",
    "- This report is guidance for review; it is not a legal determination.",
    "",
  ].join("\n");
}

export function buildCorpusScanReport(results: CorpusScanResult): string {
  const status =
    results.summary.flaggedFiles > 0
      ? "FLAGGED — possible copyright matches found"
      : "CLEAR — no high-similarity corpus matches";

  const lines = [
    "# Lineage corpus scan report",
    "",
    `Generated: ${stamp()}`,
    `Status: ${status}`,
    results.repo ? `Repository: ${results.repo}` : null,
    results.branch ? `Branch: ${results.branch}` : null,
    `Threshold: ${results.threshold}`,
    `Top-K candidates: ${results.topK}`,
    `Analysis time: ${results.executionMs}ms`,
    "",
    "## Summary",
    `- Scanned files: ${results.summary.scannedFiles}`,
    `- Flagged files: ${results.summary.flaggedFiles}`,
    `- Total matches returned: ${results.summary.totalMatches}`,
    "",
    "## Per-file results",
  ].filter((line): line is string => line != null);

  for (const file of results.files) {
    const fileStatus = file.exceeds_threshold ? "FLAGGED" : "clear";
    lines.push("", `### ${file.suspectName} (${fileStatus})`);
    lines.push(`Path: \`${file.suspectPath}\``);

    if (!file.bestMatch) {
      lines.push("No corpus matches above the shortlist.");
      continue;
    }

    lines.push(
      `Best match: ${file.bestMatch.corpusTitle} (\`${file.bestMatch.corpusFilename}\`)`,
      `License: ${file.bestMatch.corpusLicense}`,
      `Source: ${file.bestMatch.corpusSource}`,
      `Recommendation: ${file.bestMatch.recommendation}`,
      "",
      `| Metric | Score |`,
      `| --- | --- |`,
      `| Aggregate | ${pct(file.bestMatch.aggregate)} |`,
      `| Cosine | ${pct(file.bestMatch.cosine)} |`,
      `| Jaccard | ${pct(file.bestMatch.jaccard)} |`,
      `| LCS overlap | ${pct(file.bestMatch.lcs)} |`,
      `| Signature overlap | ${pct(file.bestMatch.signature)} |`,
      `| Fingerprint score | ${pct(file.bestMatch.fingerprintScore)} |`
    );

    if (file.matches.length > 1) {
      lines.push("", "Other candidates:");
      for (const match of file.matches.slice(1)) {
        lines.push(
          `- ${match.corpusTitle} (\`${match.corpusFilename}\`) — aggregate ${pct(match.aggregate)}, license ${match.corpusLicense}`
        );
      }
    }
  }

  lines.push(
    "",
    "## Notes",
    "- Lineage compares structural AST features, not only identical text.",
    "- This report is guidance for review; it is not a legal determination.",
    ""
  );

  return lines.join("\n");
}

export function buildAzureCheckReport(results: AzureCheckResult): string {
  const status =
    results.summary.detectedFiles > 0
      ? "FLAGGED — protected material may be present"
      : "CLEAR — no protected-material matches in Azure index";

  const lines = [
    "# Lineage Azure protected-material report",
    "",
    `Generated: ${stamp()}`,
    `Provider: ${results.provider}`,
    `Status: ${status}`,
    results.repo ? `Repository: ${results.repo}` : null,
    results.branch ? `Branch: ${results.branch}` : null,
    `Analysis time: ${results.executionMs}ms`,
    "",
    "## Summary",
    `- Scanned files: ${results.summary.scannedFiles}`,
    `- Detected: ${results.summary.detectedFiles}`,
    `- Clear: ${results.summary.clearFiles}`,
    `- Skipped: ${results.summary.skippedFiles}`,
    `- Errors: ${results.summary.errorFiles}`,
    "",
    "## Per-file results",
  ].filter((line): line is string => line != null);

  for (const file of results.files) {
    lines.push("", `### ${file.name} (${file.status})`);
    lines.push(`Path: \`${file.path}\``);
    lines.push(`Recommendation: ${file.recommendation}`);
    if (file.message) {
      lines.push(`Note: ${file.message}`);
    }
    if (file.citations.length > 0) {
      lines.push("", "Citations:");
      for (const citation of file.citations) {
        lines.push(`- License: ${citation.license}`);
        for (const url of citation.sourceUrls.slice(0, 8)) {
          lines.push(`  - ${url}`);
        }
      }
    }
  }

  lines.push("", "## Notes");
  for (const note of results.notes) {
    lines.push(`- ${note}`);
  }
  lines.push("");

  return lines.join("\n");
}

export function downloadTextReport(filename: string, content: string) {
  downloadBlob(filename, content, "text/markdown;charset=utf-8");
}

export function downloadJsonReport(filename: string, data: unknown) {
  downloadBlob(
    filename,
    `${JSON.stringify(data, null, 2)}\n`,
    "application/json;charset=utf-8"
  );
}

export function reportFilename(prefix: string, ext: "md" | "json") {
  const day = new Date().toISOString().slice(0, 10);
  return `lineage-${prefix}-${day}.${ext}`;
}
