"use client";

import { useEffect, useState } from "react";

type Results = {
  filesParsed: number;
  importsResolved: number;
  copyleftFound: number;
  executionMs: number;
  fileName: string;
};

export function ResultsContent() {
  const [results, setResults] = useState<Results | null>(null);
  const [tab, setTab] = useState<"findings" | "broken" | "obligations">(
    "findings"
  );

  useEffect(() => {
    const raw = sessionStorage.getItem("lineage-results");
    if (raw) setResults(JSON.parse(raw));
  }, []);

  const stats = results ?? {
    filesParsed: 14,
    importsResolved: 63,
    copyleftFound: 1,
    executionMs: 214,
    fileName: "main.py",
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-xl bg-accent px-6 py-4 text-white">
        <p className="font-medium">Copyleft detected</p>
        <button className="rounded-full border border-white/30 px-4 py-1.5 text-sm hover:bg-white/10">
          Export reports
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "files parsed", value: stats.filesParsed },
          { label: "imports resolved", value: stats.importsResolved },
          {
            label: "copyleft found",
            value: stats.copyleftFound,
            highlight: true,
          },
          { label: "total time", value: `${stats.executionMs}ms` },
        ].map((s) => (
          <div key={s.label} className="lineage-card p-4 text-center">
            <p
              className={`text-2xl font-semibold ${
                s.highlight ? "text-accent" : ""
              }`}
            >
              {s.value}
            </p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 border-b border-border">
        {(
          [
            ["findings", "Findings"],
            ["broken", "Broken links"],
            ["obligations", "Obligations"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`mr-6 border-b-2 pb-3 text-sm transition ${
              tab === key
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "findings" && (
        <div className="mt-6 space-y-4">
          <div className="lineage-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">fast_statistics</p>
                <p className="mt-1 text-xs text-muted">
                  {stats.fileName} → line 2
                </p>
              </div>
              <span className="rounded-full bg-[#fff4f0] px-3 py-1 text-xs font-medium text-accent">
                GPL-3.0
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 py-2">
              <div className="rounded-md border border-border bg-background px-4 py-2 text-xs">
                {stats.fileName}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>import</span>
                <div className="h-px w-8 bg-border" />
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-2 text-xs">
                fast_statistics
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>depends on</span>
                <div className="h-px w-8 bg-border" />
              </div>
              <div className="rounded-md border border-accent bg-[#fff4f0] px-4 py-2 text-xs text-accent">
                GPL-3.0
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "broken" && (
        <p className="mt-6 text-sm text-muted">No broken import links found.</p>
      )}

      {tab === "obligations" && (
        <div className="lineage-card mt-6 p-6">
          <h3 className="font-medium">What GPL-3.0 asks of you</h3>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
            <li>• Disclose source code when distributing the software</li>
            <li>• License derivative works under GPL-3.0</li>
            <li>• Include copyright and license notices</li>
            <li>• Document changes made to the original code</li>
          </ul>
        </div>
      )}
    </>
  );
}
