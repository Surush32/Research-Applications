import type { ComparisonResponse, HealthResponse } from "@/types/api";

export async function checkApiHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("API health check failed");
  return res.json();
}

export async function compareFiles(
  fileA: File,
  fileB: File,
  threshold = 0.75
): Promise<ComparisonResponse> {
  const form = new FormData();
  form.append("file_a", fileA);
  form.append("file_b", fileB);
  form.append("threshold", String(threshold));

  const res = await fetch("/api/compare", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message =
      err?.detail?.[0]?.msg ?? `Comparison failed (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}
