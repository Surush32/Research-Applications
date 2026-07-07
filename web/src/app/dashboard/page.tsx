import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
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
      <Navbar email={user.email} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Your account is set up. From here you can manage your profile and
            access research tools.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/profile"
            className="rounded-xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <h2 className="font-medium">Edit profile</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Update your name, username, bio, and links.
            </p>
          </Link>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-medium">Code similarity checker</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Run the AST-based license checker from the CLI in{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
                AST/AST
              </code>
              . Web integration coming soon.
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Account details
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Username</dt>
              <dd className="font-medium">{profile?.username ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Member since</dt>
              <dd className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">User ID</dt>
              <dd className="truncate font-mono text-xs">{user.id}</dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}
