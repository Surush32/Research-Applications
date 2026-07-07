import Link from "next/link";
import { ResultsContent } from "@/components/ResultsContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ResultsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-6 py-10">
        <ResultsContent />
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
