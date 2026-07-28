export type AzureCitation = {
  license: string;
  sourceUrls: string[];
};

export type AzureFileResult = {
  path: string;
  name: string;
  status: "detected" | "clear" | "skipped" | "error";
  detected: boolean;
  citations: AzureCitation[];
  recommendation: string;
  message?: string;
};

export type AzureCheckResult = {
  mode: string;
  provider: string;
  summary: {
    scannedFiles: number;
    detectedFiles: number;
    clearFiles: number;
    skippedFiles: number;
    errorFiles: number;
  };
  files: AzureFileResult[];
  notes: string[];
};

const MIN_CODE_CHARS = 110;
const MAX_CODE_CHARS = 9999;

function chunkCode(code: string): string[] {
  if (code.length <= MAX_CODE_CHARS) {
    return [code];
  }
  const chunks: string[] = [];
  for (let i = 0; i < code.length; i += MAX_CODE_CHARS) {
    const piece = code.slice(i, i + MAX_CODE_CHARS);
    if (piece.trim().length >= MIN_CODE_CHARS) {
      chunks.push(piece);
    }
  }
  return chunks.length > 0 ? chunks : [code.slice(0, MAX_CODE_CHARS)];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAzureDirect(
  endpoint: string,
  key: string,
  code: string
): Promise<{ detected: boolean; citations: AzureCitation[] }> {
  const base = endpoint.replace(/\/$/, "");
  const url = `${base}/contentsafety/text:detectProtectedMaterialForCode?api-version=2024-09-15-preview`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });
  const data = (await res.json()) as {
    protectedMaterialAnalysis?: {
      detected?: boolean;
      codeCitations?: { license?: string; sourceUrls?: string[] }[];
    };
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(
      data.error?.message ?? `Azure check failed (${res.status})`
    );
  }
  const analysis = data.protectedMaterialAnalysis;
  return {
    detected: Boolean(analysis?.detected),
    citations: (analysis?.codeCitations ?? []).map((c) => ({
      license: c.license ?? "unknown",
      sourceUrls: c.sourceUrls ?? [],
    })),
  };
}

/** Prefer Lineage web app (keys stay on server). Falls back to direct Azure settings. */
export async function runAzureProtectedCheck(options: {
  webAppUrl?: string;
  azureEndpoint?: string;
  azureKey?: string;
  path: string;
  name: string;
  content: string;
}): Promise<AzureFileResult> {
  const webAppUrl = options.webAppUrl?.trim().replace(/\/$/, "");
  if (webAppUrl) {
    const res = await fetch(`${webAppUrl}/api/azure-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [
          {
            path: options.path,
            name: options.name,
            content: options.content,
          },
        ],
      }),
    });
    const data = (await res.json()) as AzureCheckResult & { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? `Azure check failed (${res.status})`);
    }
    const file = data.files?.[0];
    if (!file) {
      throw new Error("Azure check returned no file result.");
    }
    return file;
  }

  const endpoint = options.azureEndpoint?.trim();
  const key = options.azureKey?.trim();
  if (!endpoint || !key) {
    throw new Error(
      "Configure lineage.webAppUrl (recommended) or lineage.azureEndpoint + lineage.azureKey in Settings."
    );
  }

  const trimmed = options.content.trim();
  if (trimmed.length < MIN_CODE_CHARS) {
    return {
      path: options.path,
      name: options.name,
      status: "skipped",
      detected: false,
      citations: [],
      recommendation:
        "File is too short for Azure Protected Material for Code (needs more than 110 characters).",
      message: `Only ${trimmed.length} characters.`,
    };
  }

  let detected = false;
  const citations: AzureCitation[] = [];
  const chunks = chunkCode(trimmed);
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await sleep(1200);
    }
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const result = await callAzureDirect(endpoint, key, chunks[i]);
        detected = detected || result.detected;
        citations.push(...result.citations);
        lastError = null;
        break;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Unknown Azure error.");
        if (/rate limit|retry after/i.test(lastError.message) && attempt < 3) {
          await sleep(1200 * (attempt + 1));
          continue;
        }
        throw lastError;
      }
    }
    if (lastError) {
      throw lastError;
    }
  }

  return {
    path: options.path,
    name: options.name,
    status: detected ? "detected" : "clear",
    detected,
    citations,
    recommendation: detected
      ? "Possible protected material detected. Review citation URLs, attribute or rewrite before shipping."
      : "No protected-material match in Azure’s known GitHub index.",
  };
}

export function buildAzureCitationComment(result: AzureFileResult): string {
  const lines = [
    "# =============================================================================",
    "# LINEAGE WARNING — Azure Protected Material for Code",
    "# -----------------------------------------------------------------------------",
    `# Status: ${result.status.toUpperCase()}`,
    `# Recommendation: ${result.recommendation}`,
  ];

  if (result.citations.length === 0) {
    lines.push("# No citation URLs were returned.");
  } else {
    lines.push("# Review these original sources before using this code:");
    for (const citation of result.citations) {
      lines.push(`# License hint: ${citation.license}`);
      for (const url of citation.sourceUrls.slice(0, 8)) {
        lines.push(`# - ${url}`);
      }
    }
  }

  lines.push(
    "# Action: open the links above, confirm license/attribution, or rewrite the overlapping logic.",
    "# This comment is guidance only — not a legal determination.",
    "# =============================================================================",
    ""
  );

  return lines.join("\n");
}

export function formatAzureReport(result: AzureFileResult): string {
  const lines = [
    "Lineage Azure Protected Material Check",
    "======================================",
    `File: ${result.name}`,
    `Path: ${result.path}`,
    `Status: ${result.status}`,
    `Recommendation: ${result.recommendation}`,
  ];
  if (result.message) {
    lines.push(`Note: ${result.message}`);
  }
  if (result.citations.length > 0) {
    lines.push("", "Citations:");
    for (const citation of result.citations) {
      lines.push(`- License: ${citation.license}`);
      for (const url of citation.sourceUrls.slice(0, 8)) {
        lines.push(`  ${url}`);
      }
    }
  }
  return lines.join("\n");
}
