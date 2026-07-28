import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const sections = [
  {
    id: "scoring",
    title: "How scoring works",
    body: [
      "Lineage compares structural AST features (node shapes, signatures, overlap metrics), not just identical text.",
      "An aggregate score above your threshold means the file looks unusually similar to known reference code and should be reviewed.",
      "Fingerprint shortlisting finds likely matches first; the AST API then confirms with cosine, Jaccard, LCS, and signature scores.",
    ],
  },
  {
    id: "rewrite",
    title: "How to rewrite safely",
    body: [
      "Do not only rename variables. Change the control flow, helper functions, and how data moves through the program.",
      "Re-implement the idea from scratch after understanding it, instead of editing a copied file line by line.",
      "After rewriting, run another corpus scan. The goal is for flagged scores to fall below your threshold.",
    ],
  },
  {
    id: "attribution",
    title: "License & attribution basics",
    body: [
      "If you intentionally reused open-source code, keep the license/copyright notice the author requires.",
      "Add a short comment citing the source (project name, URL, and license) near the reused section.",
      "For school work, ask whether citation is enough. Some courses require fully original implementations.",
    ],
  },
  {
    id: "rescan",
    title: "When to re-scan",
    body: [
      "Re-scan after major edits, before submitting coursework, and before merging a pull request.",
      "Scan both local uploads and GitHub imports so newly added files are checked.",
    ],
  },
  {
    id: "ai-explain",
    title: "AI explanations",
    body: [
      "On flagged results, click “Explain with AI” for a plain-English summary of the scores and next steps.",
      "If OPENAI_API_KEY is set in the server environment, Lineage calls an LLM. If not, it uses a local explanation built from your scan scores.",
      "AI text is guidance only — it does not prove legal copyright infringement.",
    ],
  },
  {
    id: "azure-check",
    title: "Azure protected-material check",
    body: [
      "On GitHub import, choose “Azure protected check” to scan up to 20 Python files with Microsoft Azure AI Content Safety.",
      "Azure looks for matches against a known protected GitHub material index and may return citation URLs and license labels.",
      "No Azure match does not prove originality. Combine it with AST corpus scans when possible.",
    ],
  },
  {
    id: "download-report",
    title: "Download a report",
    body: [
      "On comparison, corpus-scan, or Azure results, use “Download report” for a Markdown summary, or “Download JSON” for the raw data.",
      "Share the Markdown file with an instructor or teammate when you need a written record of flagged files.",
      "Reports stay on your device — Lineage does not upload them to a server.",
    ],
  },
  {
    id: "contact",
    title: "Ask for help",
    body: [
      "Coursework: contact your instructor or TA with the scan report and the matched corpus title.",
      "Team projects: share the flagged file path, similarity score, and what you already tried to rewrite.",
      "For this school demo, open a GitHub issue on your project repo and paste the scan summary.",
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-6 py-10">
        <p className="font-mono text-xs text-muted">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>{" "}
          / <span className="text-foreground">Help</span>
        </p>

        <h1 className="mt-6 font-serif-display text-4xl tracking-tight">
          Help & remediation guide
        </h1>
        <p className="mt-2 text-sm text-muted">
          Use this page when a scan flags warnings. It explains what the scores
          mean and how to fix or escalate issues.
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="lineage-card scroll-mt-24 p-6"
            >
              <h2 className="font-medium">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                {section.body.map((paragraph) => (
                  <li key={paragraph}>{paragraph}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/check" className="text-muted hover:text-foreground">
            ← Back to check
          </Link>
          <Link href="/github" className="text-muted hover:text-foreground">
            GitHub import
          </Link>
          <Link
            href="/check/scan-results"
            className="text-muted hover:text-foreground"
          >
            Latest corpus report
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
