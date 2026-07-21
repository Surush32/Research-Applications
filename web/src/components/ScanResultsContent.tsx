"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { RemediationPanel } from "@/components/RemediationPanel";
import { buildRemediationGuide } from "@/lib/guidance";
import {
  buildCorpusScanReport,
  downloadJsonReport,
  downloadTextReport,
  reportFilename,
} from "@/lib/report";
import type { CorpusScanResult } from "@/types/api";

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function subscribe() {
  return () => {};
}

function getScanSnapshot() {
  return sessionStorage.getItem("lineage-scan-results");
}

function getServerSnapshot() {
  return null;
}

export function ScanResultsContent() {
  const raw = useSyncExternalStore(
    subscribe,
    getScanSnapshot,
    getServerSnapshot
  );

  const results = useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CorpusScanResult;
    } catch {
      return null;
    }
  }, [raw]);

  if (!results) {
    return (
      <p className="text-sm text-muted">
        No corpus scan results found.{" "}
        <a href="/github" className="text-accent underline">
          Scan GitHub files
        </a>
      </p>
    );
  }

  const flagged = results.summary.flaggedFiles > 0;
  const matchScores = results.files.flatMap((file) =>
    file.matches.map((match) => match.aggregate)
  );
  const overviewGuide = buildRemediationGuide({
    flagged,
    aggregate: flagged && matchScores.length > 0 ? Math.max(...matchScores) : 0,
    threshold: results.threshold,
  });

  const worstFile = flagged
    ? results.files
        .filter((file) => file.exceeds_threshold && file.bestMatch)
        .sort(
          (a, b) =>
            (b.bestMatch?.aggregate ?? 0) - (a.bestMatch?.aggregate ?? 0)
        )[0]
    : null;

  return (
    <>
      <div
        className={`flex flex-col gap-2 rounded-xl px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between ${
          flagged ? "bg-accent" : "bg-emerald-600"
        }`}
      >
        <div>
          <p className="font-medium">
            {flagged
              ? "Possible copyright matches found"
              : "No high-similarity corpus matches"}
          </p>
          <p className="mt-1 text-sm text-white/85">
            Scanned {results.summary.scannedFiles} file
            {results.summary.scannedFiles === 1 ? "" : "s"} against the reference
            corpus
            {results.repo ? ` from ${results.repo}` : ""}.
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/30 px-4 py-1.5 text-sm">
          {results.summary.flaggedFiles} flagged · {results.executionMs}ms
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Download a report of these scanned files for class or team review.
        </p>
        <DownloadReportButton
          onDownloadMarkdown={() =>
            downloadTextReport(
              reportFilename("corpus-scan", "md"),
              buildCorpusScanReport(results)
            )
          }
          onDownloadJson={() =>
            downloadJsonReport(reportFilename("corpus-scan", "json"), results)
          }
        />
      </div>

      <RemediationPanel
        guide={overviewGuide}
        explainRequest={
          worstFile?.bestMatch
            ? {
                suspectName: worstFile.suspectName,
                suspectPath: worstFile.suspectPath,
                corpusTitle: worstFile.bestMatch.corpusTitle,
                corpusLicense: worstFile.bestMatch.corpusLicense,
                corpusFilename: worstFile.bestMatch.corpusFilename,
                recommendation: worstFile.bestMatch.recommendation,
                threshold: results.threshold,
                scores: {
                  aggregate: worstFile.bestMatch.aggregate,
                  cosine: worstFile.bestMatch.cosine,
                  jaccard: worstFile.bestMatch.jaccard,
                  lcs: worstFile.bestMatch.lcs,
                  signature: worstFile.bestMatch.signature,
                  fingerprintScore: worstFile.bestMatch.fingerprintScore,
                },
              }
            : undefined
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "files scanned",
            value: String(results.summary.scannedFiles),
          },
          {
            label: "flagged files",
            value: String(results.summary.flaggedFiles),
            highlight: flagged,
          },
          {
            label: "threshold",
            value: results.threshold.toFixed(2),
          },
          {
            label: "top candidates",
            value: String(results.topK),
          },
        ].map((stat) => (
          <div key={stat.label} className="lineage-card p-4 text-center">
            <p
              className={`text-2xl font-semibold ${
                stat.highlight ? "text-accent" : ""
              }`}
            >
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {results.files.map((file) => {
          const best = file.bestMatch;
          const fileGuide = buildRemediationGuide({
            flagged: file.exceeds_threshold,
            aggregate: best?.aggregate ?? 0,
            threshold: results.threshold,
            corpusTitle: best?.corpusTitle,
            corpusLicense: best?.corpusLicense,
            recommendation: best?.recommendation,
          });

          return (
            <section key={file.suspectPath} className="lineage-card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-medium">{file.suspectName}</h2>
                  <p className="mt-1 text-xs text-muted">{file.suspectPath}</p>
                </div>
                <span
                  className={`text-xs font-medium ${
                    file.exceeds_threshold ? "text-accent" : "text-emerald-700"
                  }`}
                >
                  {file.exceeds_threshold
                    ? "Above threshold"
                    : "No strong match"}
                </span>
              </div>

              <RemediationPanel
                guide={fileGuide}
                explainRequest={
                  best
                    ? {
                        suspectName: file.suspectName,
                        suspectPath: file.suspectPath,
                        corpusTitle: best.corpusTitle,
                        corpusLicense: best.corpusLicense,
                        corpusFilename: best.corpusFilename,
                        recommendation: best.recommendation,
                        threshold: results.threshold,
                        scores: {
                          aggregate: best.aggregate,
                          cosine: best.cosine,
                          jaccard: best.jaccard,
                          lcs: best.lcs,
                          signature: best.signature,
                          fingerprintScore: best.fingerprintScore,
                        },
                      }
                    : undefined
                }
              />

              <div className="mt-4 space-y-3">
                {file.matches.map((match) => (
                  <div
                    key={`${file.suspectPath}-${match.corpusId}`}
                    className="rounded-lg border border-border bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">{match.corpusTitle}</p>
                        <p className="mt-1 text-xs text-muted">
                          {match.corpusFilename} · {match.corpusLicense}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatPct(match.aggregate)}
                      </p>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full ${
                          match.exceeds_threshold
                            ? "bg-accent"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${match.aggregate * 100}%` }}
                      />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-5">
                      <div>
                        <dt>fingerprint</dt>
                        <dd className="font-medium text-foreground">
                          {formatPct(match.fingerprintScore)}
                        </dd>
                      </div>
                      <div>
                        <dt>cosine</dt>
                        <dd className="font-medium text-foreground">
                          {formatPct(match.cosine)}
                        </dd>
                      </div>
                      <div>
                        <dt>jaccard</dt>
                        <dd className="font-medium text-foreground">
                          {formatPct(match.jaccard)}
                        </dd>
                      </div>
                      <div>
                        <dt>lcs</dt>
                        <dd className="font-medium text-foreground">
                          {formatPct(match.lcs)}
                        </dd>
                      </div>
                      <div>
                        <dt>signature</dt>
                        <dd className="font-medium text-foreground">
                          {formatPct(match.signature)}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-xs text-muted">
                      {match.recommendation} · source: {match.corpusSource}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
