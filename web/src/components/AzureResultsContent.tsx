"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import {
  buildAzureCheckReport,
  downloadJsonReport,
  downloadTextReport,
  reportFilename,
} from "@/lib/report";
import type { AzureCheckResult } from "@/types/azure";

function subscribe() {
  return () => {};
}

function getAzureSnapshot() {
  return sessionStorage.getItem("lineage-azure-results");
}

function getServerSnapshot() {
  return null;
}

export function AzureResultsContent() {
  const raw = useSyncExternalStore(
    subscribe,
    getAzureSnapshot,
    getServerSnapshot
  );

  const results = useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AzureCheckResult;
    } catch {
      return null;
    }
  }, [raw]);

  if (!results) {
    return (
      <p className="text-sm text-muted">
        No Azure check results found.{" "}
        <a href="/github" className="text-accent underline">
          Check GitHub files with Azure
        </a>
      </p>
    );
  }

  const flagged = results.summary.detectedFiles > 0;

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
              ? "Protected material may be present"
              : "No protected-material matches found"}
          </p>
          <p className="mt-1 text-sm text-white/85">
            Checked {results.summary.scannedFiles} file
            {results.summary.scannedFiles === 1 ? "" : "s"} with{" "}
            {results.provider}
            {results.repo ? ` · ${results.repo}` : ""}.
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/30 px-4 py-1.5 text-sm">
          {results.summary.detectedFiles} detected · {results.executionMs}ms
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Azure citations are guidance only. No match does not prove originality.
        </p>
        <DownloadReportButton
          onDownloadMarkdown={() =>
            downloadTextReport(
              reportFilename("azure-check", "md"),
              buildAzureCheckReport(results)
            )
          }
          onDownloadJson={() =>
            downloadJsonReport(reportFilename("azure-check", "json"), results)
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "scanned", value: String(results.summary.scannedFiles) },
          { label: "detected", value: String(results.summary.detectedFiles) },
          { label: "clear", value: String(results.summary.clearFiles) },
          {
            label: "skipped / errors",
            value: String(
              results.summary.skippedFiles + results.summary.errorFiles
            ),
          },
        ].map((item) => (
          <div key={item.label} className="lineage-card p-4 text-center">
            <p className="text-2xl font-semibold">{item.value}</p>
            <p className="mt-1 text-xs text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {results.files.map((file) => (
          <article key={file.path} className="lineage-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-medium">{file.name}</h2>
                <p className="mt-1 text-xs text-muted">{file.path}</p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                  file.status === "detected"
                    ? "bg-[#fff4f0] text-accent"
                    : file.status === "clear"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#f3f2ef] text-muted"
                }`}
              >
                {file.status}
              </span>
            </div>

            <p className="mt-3 text-sm text-foreground">{file.recommendation}</p>
            {file.message && (
              <p className="mt-2 text-xs text-muted">{file.message}</p>
            )}

            {file.citations.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Citations
                </p>
                {file.citations.map((citation, index) => (
                  <div
                    key={`${file.path}-${citation.license}-${index}`}
                    className="rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <p className="text-sm">
                      License:{" "}
                      <span className="font-medium">{citation.license}</span>
                    </p>
                    <ul className="mt-2 space-y-1">
                      {citation.sourceUrls.slice(0, 5).map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-xs text-accent underline underline-offset-2"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                      {citation.sourceUrls.length > 5 && (
                        <li className="text-xs text-muted">
                          +{citation.sourceUrls.length - 5} more URLs
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="mt-6 lineage-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Notes
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {results.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
