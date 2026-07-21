import type { ExplainRequest } from "@/types/explain";

export function buildLocalExplanation(input: ExplainRequest): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const flagged = input.scores.aggregate >= input.threshold;
  const matched = input.corpusTitle
    ? `"${input.corpusTitle}"${
        input.corpusLicense ? ` (${input.corpusLicense})` : ""
      }`
    : "a reference corpus sample";

  if (!flagged) {
    return [
      `${input.suspectName} stayed under the similarity threshold (${pct(
        input.threshold
      )}).`,
      "No urgent rewrite is required. Keep citing sources if you reused ideas, and re-scan after big edits.",
    ].join(" ");
  }

  const parts = [
    `${input.suspectName} looks structurally similar to ${matched}.`,
    `Aggregate similarity is ${pct(input.scores.aggregate)} (threshold ${pct(
      input.threshold
    )}).`,
  ];

  if (input.scores.signature != null) {
    parts.push(
      `Function-signature overlap is ${pct(
        input.scores.signature
      )}, which often means similar method shapes even if names differ.`
    );
  }
  if (input.scores.lcs != null) {
    parts.push(
      `AST sequence overlap (LCS) is ${pct(
        input.scores.lcs
      )}, suggesting similar control-flow structure.`
    );
  }

  parts.push(
    "To reduce risk: rewrite overlapping helpers with different control flow (not just renamed variables), keep required license/attribution if you intentionally reused open-source code, then re-scan."
  );

  if (input.recommendation) {
    parts.push(`Scanner note: ${input.recommendation}`);
  }

  return parts.join(" ");
}

export function buildExplainPrompt(input: ExplainRequest): string {
  return [
    "You are a teaching assistant for a school code-similarity tool called Lineage.",
    "Explain the scan result in plain English for a student developer.",
    "Do NOT claim legal certainty about copyright infringement.",
    "Be concise (120-180 words), practical, and actionable.",
    "Include: what the scores suggest, why it may be flagged, and 3 concrete next steps.",
    "",
    `Suspect file: ${input.suspectName}${
      input.suspectPath ? ` (${input.suspectPath})` : ""
    }`,
    `Matched corpus: ${input.corpusTitle ?? "unknown"}${
      input.corpusFilename ? ` / ${input.corpusFilename}` : ""
    }`,
    `Corpus license: ${input.corpusLicense ?? "unknown"}`,
    `Threshold: ${input.threshold}`,
    `Scores JSON: ${JSON.stringify(input.scores)}`,
    `Scanner recommendation: ${input.recommendation ?? "n/a"}`,
  ].join("\n");
}
