"use client";

import { useState } from "react";
import type { ExplainRequest, ExplainResponse } from "@/types/explain";

export function AiExplanationButton({
  request,
  disabled = false,
}: {
  request: ExplainRequest;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResponse | null>(null);

  async function handleExplain() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = (await res.json().catch(() => null)) as
        | ExplainResponse
        | { error?: string }
        | null;

      if (!res.ok || !data || !("explanation" in data)) {
        throw new Error(
          data && "error" in data && data.error
            ? data.error
            : "Could not generate explanation."
        );
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explanation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border/70 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExplain}
          disabled={disabled || loading}
          className="lineage-btn-dark px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {loading ? "Asking AI…" : result ? "Regenerate AI explanation" : "Explain with AI"}
        </button>
        {result && (
          <span className="text-xs text-muted">
            Source: {result.source === "llm" ? "LLM" : "local fallback"}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-700">{error}</p>
      )}

      {result && (
        <div className="mt-3 rounded-lg border border-border bg-background/80 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            AI explanation
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {result.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
