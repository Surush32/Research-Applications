import Link from "next/link";

const footerLinks = {
  Product: [
    { href: "/check", label: "Check your code" },
    { href: "/#features", label: "Features" },
  ],
  Support: [
    { href: "/#docs", label: "Documentation" },
    { href: "/login", label: "Sign in" },
    { href: "/signup", label: "Create account" },
  ],
  Legal: [
    { href: "#", label: "Privacy" },
    { href: "#", label: "Terms" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div>
            <p className="font-serif-display text-lg">Lineage</p>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Catch copyleft dependencies before they reach production.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <p className="text-sm font-medium">{title}</p>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-xs text-muted">
          © {new Date().getFullYear()} Lineage. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
