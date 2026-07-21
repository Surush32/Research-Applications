import { redirect } from "next/navigation";
import Link from "next/link";
import { GitHubRepoBrowser } from "@/components/GitHubRepoBrowser";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export default async function GitHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl flex-1 px-6 py-10">
        <p className="font-mono text-xs text-muted">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>{" "}
          / <span className="text-foreground">GitHub import</span>
        </p>

        <div className="mt-6">
          <h1 className="font-serif-display text-4xl tracking-tight">
            Import from GitHub
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Keep using your Lineage account. Paste a GitHub profile or repo URL,
            pick `.py` files, and scan them against the corpus — no GitHub login
            needed.
          </p>
        </div>

        <div className="mt-8">
          <GitHubRepoBrowser />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
