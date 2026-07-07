"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavLink = { href: string; label: string };

export function SiteHeaderClient({
  navLinks,
  email,
  isLoggedIn,
}: {
  navLinks: NavLink[];
  email: string | null;
  isLoggedIn: boolean;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-serif-display text-xl tracking-tight text-foreground"
        >
          Lineage
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="hidden text-sm text-muted hover:text-foreground sm:inline"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="hidden text-sm text-muted hover:text-foreground sm:inline"
              >
                Profile
              </Link>
              <span className="hidden max-w-[140px] truncate text-xs text-muted lg:inline">
                {email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-muted hover:text-foreground"
              >
                Sign out
              </button>
              <Link
                href="/check"
                className="lineage-btn-dark px-4 py-2 text-sm"
              >
                Check your code
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-muted hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/check"
                className="lineage-btn-dark px-4 py-2 text-sm"
              >
                Check your code
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
