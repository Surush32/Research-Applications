import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckUploader } from "@/components/CheckUploader";

export default function CheckPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-6 py-10">
        <p className="font-mono text-xs text-muted">
          <Link href="/dashboard" className="hover:text-foreground">
            Activity
          </Link>{" "}
          / <Link href="/check" className="hover:text-foreground">New check</Link>
          <span className="text-foreground"> New check</span>
        </p>

        <p className="mt-6 font-mono text-xs uppercase tracking-wide text-muted">
          Step 1 of 2
        </p>
        <h1 className="mt-2 font-serif-display text-4xl tracking-tight">
          Check your code
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Compare two files pairwise, or upload one file and scan it against
          the reference corpus for possible copyright matches.
        </p>

        <div className="mt-4 rounded-lg border border-border bg-white/60 p-4 text-sm">
          <p className="font-medium">Prefer GitHub?</p>
          <p className="mt-1 text-muted">
            Open GitHub import to select repo files and run a corpus scan
            without downloading them locally.
          </p>
          <Link
            href="/github"
            className="mt-3 inline-flex text-sm font-medium text-accent underline underline-offset-4"
          >
            Open GitHub import
          </Link>
        </div>

        <div className="mt-10">
          <CheckUploader />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
