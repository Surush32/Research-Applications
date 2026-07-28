import Link from "next/link";
import { AzureResultsContent } from "@/components/AzureResultsContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function AzureResultsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-6 py-10">
        <p className="font-mono text-xs text-muted">
          <Link href="/dashboard" className="hover:text-foreground">
            Activity
          </Link>{" "}
          /{" "}
          <Link href="/github" className="hover:text-foreground">
            GitHub import
          </Link>{" "}
          / <span className="text-foreground">Azure check</span>
        </p>

        <div className="mt-6">
          <h1 className="font-serif-display text-4xl tracking-tight">
            Azure protected-material report
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Selected files were checked with Microsoft Azure AI Content Safety
            Protected Material for Code for matches against known GitHub
            material.
          </p>
        </div>

        <div className="mt-8">
          <AzureResultsContent />
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <Link href="/github" className="text-muted hover:text-foreground">
            ← Check more GitHub files
          </Link>
          <Link href="/help" className="text-muted hover:text-foreground">
            Help & how to fix
          </Link>
          <Link
            href="/check/scan-results"
            className="text-muted hover:text-foreground"
          >
            Corpus scan results
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
