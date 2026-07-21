import Link from "next/link";
import { ScanResultsContent } from "@/components/ScanResultsContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ScanResultsPage() {
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
          <span className="text-foreground">Corpus scan</span>
        </p>

        <div className="mt-6">
          <h1 className="font-serif-display text-4xl tracking-tight">
            Corpus scan report
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Each selected file was fingerprinted, matched to the nearest
            reference samples, then confirmed with the AST similarity API.
          </p>
        </div>

        <div className="mt-8">
          <ScanResultsContent />
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <Link href="/github" className="text-muted hover:text-foreground">
            ← Scan more GitHub files
          </Link>
          <Link href="/help" className="text-muted hover:text-foreground">
            Help & how to fix
          </Link>
          <Link href="/check" className="text-muted hover:text-foreground">
            Pairwise compare
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
