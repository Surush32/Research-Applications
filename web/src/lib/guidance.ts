export type GuidanceSeverity = "clear" | "review" | "warning";

export type RemediationGuide = {
  severity: GuidanceSeverity;
  title: string;
  summary: string;
  steps: string[];
  helpTopics: { label: string; href: string }[];
};

function severityFromScore(aggregate: number, threshold: number, flagged: boolean): GuidanceSeverity {
  if (!flagged) return "clear";
  if (aggregate >= Math.min(0.9, threshold + 0.15)) return "warning";
  return "review";
}

export function buildRemediationGuide(input: {
  flagged: boolean;
  aggregate: number;
  threshold: number;
  corpusTitle?: string;
  corpusLicense?: string;
  recommendation?: string;
}): RemediationGuide {
  const severity = severityFromScore(
    input.aggregate,
    input.threshold,
    input.flagged
  );

  if (severity === "clear") {
    return {
      severity,
      title: "No action required",
      summary:
        "Similarity stayed below your threshold. Keep documenting sources when you reuse open-source ideas.",
      steps: [
        "Keep a short note of any libraries or tutorials you used.",
        "Re-scan after major edits so new matches are caught early.",
      ],
      helpTopics: [
        { label: "How scoring works", href: "/help#scoring" },
        { label: "When to re-scan", href: "/help#rescan" },
      ],
    };
  }

  const matched = input.corpusTitle
    ? ` Closest match: ${input.corpusTitle}${
        input.corpusLicense ? ` (${input.corpusLicense})` : ""
      }.`
    : "";

  if (severity === "warning") {
    return {
      severity,
      title: "High similarity — fix before submitting",
      summary: `${
        input.recommendation ??
        "This file looks structurally very similar to reference code."
      }${matched}`,
      steps: [
        "Compare your file side-by-side with the matched reference and list overlapping functions/classes.",
        "Rewrite the overlapping logic in your own structure (different control flow, helpers, and naming).",
        "If you intentionally reused open-source code, keep the required license/copyright notice and cite the source.",
        "Remove unused copied sections, then run the scan again to confirm the score drops.",
        "If this is coursework, ask your instructor whether citation alone is enough or a full rewrite is required.",
      ],
      helpTopics: [
        { label: "How to rewrite safely", href: "/help#rewrite" },
        { label: "License & attribution basics", href: "/help#attribution" },
        { label: "Ask for help", href: "/help#contact" },
      ],
    };
  }

  return {
    severity,
    title: "Possible match — review recommended",
    summary: `${
      input.recommendation ??
      "This file is similar enough to deserve a manual review."
    }${matched}`,
    steps: [
      "Open the matched reference and check whether the same algorithms/structure were reused.",
      "Keep independently written parts; rewrite sections that mirror the reference AST shape.",
      "Add attribution comments if you adapted an open-source example.",
      "Lower risk by changing function boundaries and data-flow, not only variable names.",
      "Re-run the corpus scan after edits.",
    ],
    helpTopics: [
      { label: "How scoring works", href: "/help#scoring" },
      { label: "How to rewrite safely", href: "/help#rewrite" },
      { label: "Ask for help", href: "/help#contact" },
    ],
  };
}
