"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { compareFiles, scanAgainstCorpus } from "@/lib/api";
import type { GitHubImportedFile } from "@/types/github";

const SAMPLE_CODE = `import pandas as pd
from fast_statistics import mean

def analyze(data):
    return mean(data)`;

export function CheckUploader() {
  const router = useRouter();
  const importedGitHubFiles = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = sessionStorage.getItem("lineage-github-import");
    if (!raw) {
      return null;
    }

    try {
      const payload = JSON.parse(raw) as {
        repo: string;
        branch: string;
        files: GitHubImportedFile[];
      };

      return payload.files.length > 0 ? payload : null;
    } catch {
      return null;
    }
  }, []);

  const [fileA, setFileA] = useState<File | null>(() => {
    const first = importedGitHubFiles?.files[0];
    return first
      ? new File([first.content], first.name, { type: "text/x-python" })
      : null;
  });
  const [fileB, setFileB] = useState<File | null>(() => {
    const second = importedGitHubFiles?.files[1];
    return second
      ? new File([second.content], second.name, { type: "text/x-python" })
      : null;
  });
  const [preview, setPreview] = useState<string | null>(() => {
    return importedGitHubFiles?.files[0]?.content.slice(0, 600) ?? null;
  });
  const [dragging, setDragging] = useState(false);
  const [threshold, setThreshold] = useState(0.75);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceNote, setSourceNote] = useState<string | null>(() =>
    importedGitHubFiles
      ? `Loaded from GitHub: ${importedGitHubFiles.repo} (${importedGitHubFiles.branch})`
      : null
  );

  useEffect(() => {
    if (importedGitHubFiles) {
      sessionStorage.removeItem("lineage-github-import");
    }
  }, [importedGitHubFiles]);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const pyFiles = Array.from(fileList).filter((f) =>
      f.name.endsWith(".py")
    );
    if (pyFiles.length === 0) {
      setError("Please upload .py files only.");
      return;
    }

    setError(null);
    setSourceNote(null);
    setFileA(pyFiles[0] ?? null);
    setFileB(pyFiles[1] ?? null);

    if (pyFiles[0]) {
      const text = await pyFiles[0].text();
      setPreview(text.slice(0, 600));
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files);
  }

  async function runAnalysis() {
    if (!fileA || !fileB) {
      setError("Select two Python files to compare.");
      return;
    }

    setError(null);
    setLoading(true);
    const start = performance.now();

    try {
      const result = await compareFiles(fileA, fileB, threshold);

      sessionStorage.setItem(
        "lineage-results",
        JSON.stringify({
          ...result,
          fileA: fileA.name,
          fileB: fileB.name,
          executionMs: Math.round(performance.now() - start),
        })
      );

      router.push("/check/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runCorpusScan() {
    if (!fileA) {
      setError("Select at least one Python file to scan against the corpus.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const content = await fileA.text();
      const result = await scanAgainstCorpus({
        files: [
          {
            path: fileA.name,
            name: fileA.name,
            content,
          },
        ],
        threshold,
        topK: 3,
      });

      sessionStorage.setItem("lineage-scan-results", JSON.stringify(result));
      router.push("/check/scan-results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Corpus scan failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`lineage-dropzone flex min-h-55 flex-col items-center justify-center px-6 py-12 text-center transition ${
            dragging ? "lineage-dropzone-active" : ""
          }`}
        >
          <p className="text-sm font-medium">Drop .py files here</p>
          <p className="mt-1 text-xs text-muted">
            One file for corpus scan, or two files for pairwise compare
          </p>
          <label className="mt-4 cursor-pointer text-xs text-accent underline underline-offset-2">
            Choose files
            <input
              type="file"
              accept=".py"
              multiple
              className="hidden"
              onChange={onFileInput}
            />
          </label>
          {(fileA || fileB) && (
            <div className="mt-3 space-y-1 text-xs text-muted">
              {fileA && <p>File A: {fileA.name}</p>}
              {fileB && <p>File B: {fileB.name}</p>}
              {fileA && !fileB && (
                <p className="text-accent">
                  Ready for corpus scan — or add a second file to compare
                </p>
              )}
            </div>
          )}
          {sourceNote && (
            <p className="mt-3 text-xs text-muted">{sourceNote}</p>
          )}
        </div>

        <div className="lineage-card mt-4 overflow-hidden">
          <div className="border-b border-border px-4 py-2">
            <span className="text-xs text-muted">
              {fileA?.name ?? "original.py"}
            </span>
          </div>
          <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-5 text-foreground/85">
            <code>{preview ?? SAMPLE_CODE}</code>
          </pre>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <aside className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Similarity threshold
          </p>
          <div className="mt-3">
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <p className="mt-1 text-sm font-medium">{threshold.toFixed(2)}</p>
            <p className="text-xs text-muted">
              Scores above this trigger a warning
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted">
          <p className="font-medium text-foreground">Reference corpus</p>
          <p className="mt-1">
            Fingerprint shortlist + AST confirm against known Python samples.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={runCorpusScan}
            disabled={loading || !fileA}
            className="lineage-btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? "Working…" : "Scan against corpus"}
          </button>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading || !fileA || !fileB}
            className="lineage-btn-dark w-full px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? "Working…" : "Compare two files"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFileA(null);
              setFileB(null);
              setPreview(null);
              setError(null);
              setSourceNote(null);
            }}
            className="text-sm text-muted hover:text-foreground"
          >
            Clear
          </button>
        </div>
      </aside>
    </div>
  );
}
