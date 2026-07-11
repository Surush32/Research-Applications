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
          Give Lineage something to parse. It compiles every file to its
          syntax tree, walks the imports, and resolves each one to a license
          — nothing is uploaded to a server.
        </p>

        <div className="mt-10">
          <CheckUploader />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
