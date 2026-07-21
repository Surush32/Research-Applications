import { NextRequest, NextResponse } from "next/server";
import { loadCorpus, rankCorpusCandidates } from "@/lib/corpus";
import type { ComparisonResponse, CorpusMatch, ScanFileResult } from "@/types/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://catching-the-copy-bo.onrender.com";

type ScanFileInput = {
  path: string;
  name: string;
  content: string;
};

async function compareAgainstCorpus(
  suspect: ScanFileInput,
  corpusContent: string,
  corpusName: string,
  threshold: number
): Promise<ComparisonResponse> {
  const form = new FormData();
  form.append(
    "file_a",
    new File([suspect.content], suspect.name, { type: "text/x-python" })
  );
  form.append(
    "file_b",
    new File([corpusContent], corpusName, { type: "text/x-python" })
  );
  form.append("threshold", String(threshold));

  const res = await fetch(`${API_URL}/compare`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    const message =
      data?.detail?.[0]?.msg ?? `Comparison failed (${res.status})`;
    throw new Error(message);
  }

  return data as ComparisonResponse;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      files?: ScanFileInput[];
      threshold?: number;
      topK?: number;
      repo?: string;
      branch?: string;
    };

    const files = body.files ?? [];
    const threshold = body.threshold ?? 0.75;
    const topK = Math.min(Math.max(body.topK ?? 3, 1), 5);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one Python file to scan." },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: "Scan up to 20 files at a time for the school demo." },
        { status: 400 }
      );
    }

    const start = performance.now();
    const corpus = await loadCorpus();
    const fileResults: ScanFileResult[] = [];

    for (const file of files) {
      if (!file.content?.trim()) {
        return NextResponse.json(
          { error: `File ${file.name} is empty.` },
          { status: 400 }
        );
      }

      const candidates = rankCorpusCandidates(file.content, corpus, topK);
      const matches: CorpusMatch[] = [];

      for (const candidate of candidates) {
        const comparison = await compareAgainstCorpus(
          file,
          candidate.entry.content,
          candidate.entry.filename,
          threshold
        );

        matches.push({
          ...comparison,
          corpusId: candidate.entry.id,
          corpusTitle: candidate.entry.title,
          corpusFilename: candidate.entry.filename,
          corpusLicense: candidate.entry.license,
          corpusSource: candidate.entry.source,
          fingerprintScore: Number(candidate.fingerprintScore.toFixed(4)),
        });
      }

      matches.sort((a, b) => b.aggregate - a.aggregate);
      const bestMatch = matches[0] ?? null;

      fileResults.push({
        suspectPath: file.path,
        suspectName: file.name,
        matches,
        bestMatch,
        exceeds_threshold: Boolean(bestMatch?.exceeds_threshold),
      });
    }

    const flaggedFiles = fileResults.filter((f) => f.exceeds_threshold).length;
    const totalMatches = fileResults.reduce(
      (sum, f) => sum + f.matches.filter((m) => m.exceeds_threshold).length,
      0
    );

    return NextResponse.json({
      mode: "corpus-scan",
      repo: body.repo,
      branch: body.branch,
      threshold,
      topK,
      executionMs: Math.round(performance.now() - start),
      files: fileResults,
      summary: {
        scannedFiles: fileResults.length,
        flaggedFiles,
        totalMatches,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Corpus scan failed.",
      },
      { status: 502 }
    );
  }
}
