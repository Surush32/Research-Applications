"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const SAMPLE_CODE = `import pandas as pd
from fast_statistics import mean

def analyze(data):
    return mean(data)

class Report:
    def __init__(self, title):
        self.title = title

    def render(self):
        return f"Report: {self.title}"`;

export function CheckUploader() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [followTransitive, setFollowTransitive] = useState(true);
  const [generateSarif, setGenerateSarif] = useState(false);
  const [loading, setLoading] = useState(false);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const pyFiles = Array.from(fileList).filter((f) =>
      f.name.endsWith(".py")
    );
    if (pyFiles.length === 0) return;

    setFiles(pyFiles);
    const text = await pyFiles[0].text();
    setPreview(text.slice(0, 600));
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
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    sessionStorage.setItem(
      "lineage-results",
      JSON.stringify({
        filesParsed: files.length || 14,
        importsResolved: 63,
        copyleftFound: 1,
        executionMs: 214,
        followTransitive,
        generateSarif,
        fileName: files[0]?.name ?? "main.py",
      })
    );

    router.push("/check/results");
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
          className={`lineage-dropzone flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center transition ${
            dragging ? "lineage-dropzone-active" : ""
          }`}
        >
          <p className="text-sm font-medium">Drop .py files here</p>
          <p className="mt-1 text-xs text-muted">or click to browse</p>
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
          {files.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        <div className="lineage-card mt-4 overflow-hidden">
          <div className="border-b border-border px-4 py-2">
            <span className="text-xs text-muted">
              {files[0]?.name ?? "main.py"}
            </span>
          </div>
          <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-5 text-foreground/85">
            <code>{preview ?? SAMPLE_CODE}</code>
          </pre>
        </div>
      </div>

      <aside className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Scan settings
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Python 3.10", "Python 3.11", "Python 3.12"].map((v, i) => (
              <span
                key={v}
                className={`rounded-full border px-3 py-1 text-xs ${
                  i === 1
                    ? "border-accent bg-[#fff4f0] text-accent"
                    : "border-border text-muted"
                }`}
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={followTransitive}
            onChange={(e) => setFollowTransitive(e.target.checked)}
            className="accent-accent"
          />
          Follow transitive imports
        </label>

        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={generateSarif}
            onChange={(e) => setGenerateSarif(e.target.checked)}
            className="accent-accent"
          />
          Generate SARIF report
        </label>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => {
              setFiles([]);
              setPreview(null);
            }}
            className="text-sm text-muted hover:text-foreground"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="lineage-btn-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Run analysis"}
          </button>
        </div>
      </aside>
    </div>
  );
}
