import Link from "next/link";
import { ResultsContent } from "@/components/ResultsContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ResultsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-6 py-10">
        <p className="font-mono text-xs text-muted">
          <Link href="/dashboard" className="hover:text-foreground">
            Activity
          </Link>{" "}
          / <Link href="/check" className="hover:text-foreground">New check</Link>
          {"   "}
          <span className="text-foreground">Report</span>
        </p>

        <div className="mt-6">
          <ResultsContent />
        </div>

        <div className="mt-10">
          <Link href="/check" className="text-sm text-muted hover:text-foreground">
            ← Run another scan
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
