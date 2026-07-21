"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  function linkClass(href: string) {
    const active =
      href === pathname || (href !== "/" && pathname.startsWith(href));
    return [
      "text-sm transition",
      active ? "text-foreground font-medium" : "text-muted hover:text-foreground",
    ].join(" ");
  }

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="shrink-0 font-serif-display text-xl tracking-tight text-foreground"
        >
          Lineage
        </Link>

        <nav className="ml-2 hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {isLoggedIn ? (
            <div className="hidden items-center gap-4 border-l border-border pl-4 md:flex">
              <Link href="/profile" className={linkClass("/profile")}>
                Profile
              </Link>
              {email && (
                <span
                  className="hidden max-w-36 truncate text-xs text-muted xl:inline"
                  title={email}
                >
                  {email}
                </span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm text-muted transition hover:text-foreground"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-muted transition hover:text-foreground sm:inline"
              >
                Sign in
              </Link>
              <Link
                href="/check"
                className="lineage-btn-dark px-4 py-2 text-sm"
              >
                Check code
              </Link>
            </>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${linkClass(link.href)} rounded-md px-2 py-2`}
              >
                {link.label}
              </Link>
            ))}

            {isLoggedIn ? (
              <>
                <div className="my-2 border-t border-border" />
                <Link
                  href="/profile"
                  className={`${linkClass("/profile")} rounded-md px-2 py-2`}
                >
                  Profile
                </Link>
                {email && (
                  <p className="truncate px-2 py-1 text-xs text-muted">{email}</p>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md px-2 py-2 text-left text-sm text-muted transition hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="mt-1 rounded-md px-2 py-2 text-sm text-muted transition hover:text-foreground sm:hidden"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
