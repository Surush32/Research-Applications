import type { AzureCodeCitation, AzureFileCheckResult } from "@/types/azure";

const MIN_CODE_CHARS = 110;
const MAX_CODE_CHARS = 9999;
const REQUEST_GAP_MS = 1200;
const MAX_RETRIES = 4;

type AzureProtectedMaterialResponse = {
  protectedMaterialAnalysis?: {
    detected?: boolean;
    codeCitations?: {
      license?: string;
      sourceUrls?: string[];
    }[];
  };
  error?: {
    code?: string;
    message?: string;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(message: string) {
  return /rate limit|retry after|exceeded call rate/i.test(message);
}

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

function mergeCitations(groups: AzureCodeCitation[]): AzureCodeCitation[] {
  const byLicense = new Map<string, Set<string>>();

  for (const citation of groups) {
    const license = citation.license || "unknown";
    const urls = byLicense.get(license) ?? new Set<string>();
    for (const url of citation.sourceUrls) {
      urls.add(url);
    }
    byLicense.set(license, urls);
  }

  return [...byLicense.entries()].map(([license, urls]) => ({
    license,
    sourceUrls: [...urls],
  }));
}

export function buildAzureRecommendation(
  detected: boolean,
  citations: AzureCodeCitation[]
): string {
  if (!detected) {
    return "No protected-material match in Azure’s known GitHub index. This does not prove the code is original — still review licenses and run an AST corpus scan.";
  }

  const licenses = [
    ...new Set(citations.map((c) => c.license).filter(Boolean)),
  ];
  const licenseNote =
    licenses.length > 0
      ? `Matched license label(s): ${licenses.join(", ")}.`
      : "Review the cited repositories for license terms.";

  return `Possible protected material detected. ${licenseNote} Open the citation URLs, confirm whether reuse is allowed, keep required attribution, or rewrite the overlapping logic before shipping.`;
}

async function callAzureOnce(code: string): Promise<{
  detected: boolean;
  citations: AzureCodeCitation[];
}> {
  const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT?.replace(
    /\/$/,
    ""
  );
  const key = process.env.AZURE_CONTENT_SAFETY_KEY;

  if (!endpoint || !key) {
    throw new Error(
      "Azure Content Safety is not configured. Set AZURE_CONTENT_SAFETY_ENDPOINT and AZURE_CONTENT_SAFETY_KEY."
    );
  }

  const url = `${endpoint}/contentsafety/text:detectProtectedMaterialForCode?api-version=2024-09-15-preview`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const data = (await res.json()) as AzureProtectedMaterialResponse;
  if (!res.ok) {
    throw new Error(
      data.error?.message ??
        `Azure protected-material check failed (${res.status})`
    );
  }

  const analysis = data.protectedMaterialAnalysis;
  const citations: AzureCodeCitation[] = (analysis?.codeCitations ?? []).map(
    (citation) => ({
      license: citation.license ?? "unknown",
      sourceUrls: citation.sourceUrls ?? [],
    })
  );

  return {
    detected: Boolean(analysis?.detected),
    citations,
  };
}

export async function checkProtectedMaterialForCode(code: string): Promise<{
  detected: boolean;
  citations: AzureCodeCitation[];
  chunksChecked: number;
}> {
  const chunks = chunkCode(code);
  let detected = false;
  const citationGroups: AzureCodeCitation[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await sleep(REQUEST_GAP_MS);
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await callAzureOnce(chunks[i]);
        detected = detected || result.detected;
        citationGroups.push(...result.citations);
        lastError = null;
        break;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Unknown Azure error.");
        if (isRateLimitError(lastError.message) && attempt < MAX_RETRIES - 1) {
          await sleep(REQUEST_GAP_MS * (attempt + 1));
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
    detected,
    citations: mergeCitations(citationGroups),
    chunksChecked: chunks.length,
  };
}

export async function evaluateFileForAzure(input: {
  path: string;
  name: string;
  content: string;
}): Promise<AzureFileCheckResult> {
  const trimmed = input.content.trim();

  if (trimmed.length < MIN_CODE_CHARS) {
    return {
      path: input.path,
      name: input.name,
      status: "skipped",
      detected: false,
      citations: [],
      recommendation:
        "File is too short for Azure Protected Material for Code (needs more than 110 characters).",
      message: `Only ${trimmed.length} characters.`,
    };
  }

  try {
    const result = await checkProtectedMaterialForCode(trimmed);
    const chunkNote =
      result.chunksChecked > 1
        ? ` Checked in ${result.chunksChecked} chunks (Azure max ~10k characters per request).`
        : "";

    return {
      path: input.path,
      name: input.name,
      status: result.detected ? "detected" : "clear",
      detected: result.detected,
      citations: result.citations,
      recommendation:
        buildAzureRecommendation(result.detected, result.citations) + chunkNote,
    };
  } catch (error) {
    return {
      path: input.path,
      name: input.name,
      status: "error",
      detected: false,
      citations: [],
      recommendation:
        "Azure check failed for this file. Retry later or run an AST corpus scan instead.",
      message: error instanceof Error ? error.message : "Unknown Azure error.",
    };
  }
}

/** Delay used between files to stay under Azure Free (F0) rate limits. */
export const AZURE_FILE_GAP_MS = REQUEST_GAP_MS;
