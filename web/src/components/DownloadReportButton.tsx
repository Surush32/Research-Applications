"use client";

type Props = {
  onDownloadMarkdown: () => void;
  onDownloadJson: () => void;
};

export function DownloadReportButton({
  onDownloadMarkdown,
  onDownloadJson,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onDownloadMarkdown}
        className="lineage-btn-dark px-4 py-2 text-sm"
      >
        Download report
      </button>
      <button
        type="button"
        onClick={onDownloadJson}
        className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted transition hover:text-foreground"
      >
        Download JSON
      </button>
    </div>
  );
}
