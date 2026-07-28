import { NextRequest, NextResponse } from "next/server";
import { AZURE_FILE_GAP_MS, evaluateFileForAzure } from "@/lib/azure";
import type { AzureCheckResult } from "@/types/azure";

type ScanFileInput = {
  path: string;
  name: string;
  content: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.AZURE_CONTENT_SAFETY_ENDPOINT ||
      !process.env.AZURE_CONTENT_SAFETY_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "Azure Content Safety is not configured on the server. Add AZURE_CONTENT_SAFETY_ENDPOINT and AZURE_CONTENT_SAFETY_KEY.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      files?: ScanFileInput[];
      repo?: string;
      branch?: string;
    };

    const files = body.files ?? [];
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one Python file to check." },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: "Check up to 20 files at a time." },
        { status: 400 }
      );
    }

    const start = performance.now();
    const fileResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.content?.trim()) {
        return NextResponse.json(
          { error: `File ${file.name} is empty.` },
          { status: 400 }
        );
      }

      if (i > 0) {
        await sleep(AZURE_FILE_GAP_MS);
      }

      fileResults.push(await evaluateFileForAzure(file));
    }

    const summary = {
      scannedFiles: fileResults.length,
      detectedFiles: fileResults.filter((f) => f.status === "detected").length,
      clearFiles: fileResults.filter((f) => f.status === "clear").length,
      skippedFiles: fileResults.filter((f) => f.status === "skipped").length,
      errorFiles: fileResults.filter((f) => f.status === "error").length,
    };

    const result: AzureCheckResult = {
      mode: "azure-protected-material",
      provider: "Azure AI Content Safety",
      repo: body.repo,
      branch: body.branch,
      executionMs: Math.round(performance.now() - start),
      summary,
      files: fileResults,
      notes: [
        "Azure checks code against a known protected GitHub material index.",
        "No detection does not prove originality.",
        "Free F0 tier is rate-limited; Lineage spaces requests and retries automatically.",
        "Files over ~10k characters are checked in chunks.",
        "This is guidance for review, not a legal copyright determination.",
      ],
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Azure protected-material check failed.",
      },
      { status: 502 }
    );
  }
}
