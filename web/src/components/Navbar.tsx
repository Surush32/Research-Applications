"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Navbar({ email }: { email?: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href={email ? "/dashboard" : "/"}
          className="text-sm font-semibold tracking-tight"
        >
          Research Applications
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {email ? (
            <>
              <Link
                href="/dashboard"
                className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Profile
              </Link>
              <span className="hidden text-zinc-400 sm:inline">{email}</span>
              <button
                onClick={handleSignOut}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
