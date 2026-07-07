import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckUploader } from "@/components/CheckUploader";

export default function CheckPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl flex-1 px-6 py-12">
        <h1 className="font-serif-display text-4xl tracking-tight">
          Check your code
        </h1>
        <p className="mt-2 text-sm text-muted">
          Upload Python source files to scan for copyleft license dependencies.
        </p>
        <div className="mt-10">
          <CheckUploader />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
