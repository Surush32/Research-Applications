import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="font-serif-display text-4xl tracking-tight">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your account dashboard. Run scans and manage your profile.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/check"
            className="lineage-card p-6 transition hover:shadow-sm"
          >
            <h2 className="font-medium">Check your code</h2>
            <p className="mt-2 text-sm text-muted">
              Upload Python files and scan for copyleft dependencies.
            </p>
          </Link>

          <Link
            href="/profile"
            className="lineage-card p-6 transition hover:shadow-sm"
          >
            <h2 className="font-medium">Edit profile</h2>
            <p className="mt-2 text-sm text-muted">
              Update your name, username, bio, and links.
            </p>
          </Link>

          <Link
            href="/github"
            className="lineage-card p-6 transition hover:shadow-sm"
          >
            <h2 className="font-medium">Import from GitHub</h2>
            <p className="mt-2 text-sm text-muted">
              Scan repo files against the reference corpus, or import two files
              for pairwise compare.
            </p>
          </Link>
        </div>

        <section className="lineage-card mt-8 p-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
            Account details
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Username</dt>
              <dd className="font-medium">{profile?.username ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted">Member since</dt>
              <dd className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
