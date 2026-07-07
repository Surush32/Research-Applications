import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Navbar email={user?.email} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Research Applications
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            AST-based code similarity detection
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Compare Python source files for structural similarity using abstract
            syntax trees. Create an account to manage your profile and access
            your dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
