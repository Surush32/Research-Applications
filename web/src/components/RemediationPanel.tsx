import Link from "next/link";
import { AiExplanationButton } from "@/components/AiExplanationButton";
import type { RemediationGuide } from "@/lib/guidance";
import type { ExplainRequest } from "@/types/explain";

export function RemediationPanel({
  guide,
  explainRequest,
}: {
  guide: RemediationGuide;
  explainRequest?: ExplainRequest;
}) {
  const tone =
    guide.severity === "warning"
      ? "border-accent/40 bg-[#fff4f0]"
      : guide.severity === "review"
        ? "border-amber-200 bg-amber-50"
        : "border-emerald-200 bg-emerald-50";

  const titleTone =
    guide.severity === "warning"
      ? "text-accent"
      : guide.severity === "review"
        ? "text-amber-800"
        : "text-emerald-800";

  return (
    <div className={`mt-4 rounded-lg border p-4 ${tone}`}>
      <p className={`text-sm font-medium ${titleTone}`}>{guide.title}</p>
      <p className="mt-2 text-sm leading-6 text-foreground/85">{guide.summary}</p>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
        What to do next
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-foreground/90">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-3">
        {guide.helpTopics.map((topic) => (
          <Link
            key={topic.href}
            href={topic.href}
            className="text-xs font-medium text-accent underline underline-offset-2"
          >
            {topic.label}
          </Link>
        ))}
      </div>

      {explainRequest && guide.severity !== "clear" && (
        <AiExplanationButton request={explainRequest} />
      )}
    </div>
  );
}
