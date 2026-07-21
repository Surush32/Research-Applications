"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { RemediationPanel } from "@/components/RemediationPanel";
import { buildRemediationGuide } from "@/lib/guidance";
import type { ComparisonResult } from "@/types/api";

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function subscribe() {
  return () => {};
}

function getResultsSnapshot() {
  return sessionStorage.getItem("lineage-results");
}

function getServerSnapshot() {
  return null;
}

export function ResultsContent() {
  const [tab, setTab] = useState<"scores" | "fix" | "recommendation">(
    "scores"
  );

  const raw = useSyncExternalStore(
    subscribe,
    getResultsSnapshot,
    getServerSnapshot
  );

  const results = useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ComparisonResult;
    } catch {
      return null;
    }
  }, [raw]);

  if (!results) {
    return (
      <p className="text-sm text-muted">
        No results found.{" "}
        <a href="/check" className="text-accent underline">
          Run a comparison
        </a>
      </p>
    );
  }

  const bannerClass = results.exceeds_threshold
    ? "bg-accent"
    : "bg-emerald-600";

  const bannerText = results.exceeds_threshold
    ? "High similarity detected"
    : "No significant similarity";

  const guide = buildRemediationGuide({
    flagged: results.exceeds_threshold,
    aggregate: results.aggregate,
    threshold: results.threshold,
    recommendation: results.recommendation,
  });

  return (
    <>
      <div
        className={`flex items-center justify-between rounded-xl px-6 py-4 text-white ${bannerClass}`}
      >
        <p className="font-medium">{bannerText}</p>
        <span className="rounded-full border border-white/30 px-4 py-1.5 text-sm">
          {results.recommendation}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "aggregate score",
            value: formatPct(results.aggregate),
            highlight: results.exceeds_threshold,
          },
          { label: "cosine", value: formatPct(results.cosine) },
          { label: "jaccard", value: formatPct(results.jaccard) },
          { label: "analysis time", value: `${results.executionMs}ms` },
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

      <div className="mt-4 lineage-card px-5 py-4 text-sm">
        <span className="text-muted">Compared </span>
        <span className="font-medium">{results.fileA}</span>
        <span className="text-muted"> vs </span>
        <span className="font-medium">{results.fileB}</span>
        <span className="text-muted"> · threshold {results.threshold}</span>
      </div>

      <div className="mt-8 border-b border-border">
        {(
          [
            ["scores", "Similarity scores"],
            ["fix", "How to fix"],
            ["recommendation", "Recommendation"],
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

      {tab === "scores" && (
        <div className="mt-6 space-y-3">
          {(
            [
              ["Aggregate", results.aggregate],
              ["Cosine", results.cosine],
              ["Jaccard", results.jaccard],
              ["LCS overlap", results.lcs],
              ["Signature overlap", results.signature],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="lineage-card p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-medium">{formatPct(value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className={`h-full rounded-full ${
                    value >= results.threshold ? "bg-accent" : "bg-emerald-500"
                  }`}
                  style={{ width: `${value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "fix" && (
        <div className="mt-2">
          <RemediationPanel
            guide={guide}
            explainRequest={{
              suspectName: results.fileA,
              corpusTitle: results.fileB,
              recommendation: results.recommendation,
              threshold: results.threshold,
              scores: {
                aggregate: results.aggregate,
                cosine: results.cosine,
                jaccard: results.jaccard,
                lcs: results.lcs,
                signature: results.signature,
              },
            }}
          />
        </div>
      )}

      {tab === "recommendation" && (
        <div className="lineage-card mt-6 p-6">
          <h3 className="font-medium">Analysis verdict</h3>
          <p className="mt-4 text-sm leading-6 text-muted">
            {results.recommendation}
          </p>
          {results.exceeds_threshold ? (
            <p className="mt-4 text-sm text-accent">
              The aggregate similarity score exceeds the configured threshold of{" "}
              {results.threshold}. Manual review is recommended.
            </p>
          ) : (
            <p className="mt-4 text-sm text-emerald-700">
              The files appear to be independently authored based on structural
              AST analysis.
            </p>
          )}
        </div>
      )}
    </>
  );
}
