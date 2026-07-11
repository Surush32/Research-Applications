import Link from "next/link";
import { HeroDemo } from "@/components/HeroDemo";
import { LogoRow } from "@/components/LogoRow";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const steps = [
  {
    n: "01",
    title: "Point it at your code",
    description:
      "Drop in files, paste a snippet, or hand it a repo. Single modules and full packages both work.",
    snippet: "$ lineage scan ./payments",
  },
  {
    n: "02",
    title: "Parse, don't grep",
    description:
      "Each file is compiled to its AST. Lineage walks every Import and ImportFrom node, resolving each one.",
    snippet: "ast.walk(tree) → resolve()",
  },
  {
    n: "03",
    title: "Read your obligations",
    description:
      "A verdict with every copyleft hit, the exact line it came in on, and plain guidance on each license.",
    snippet: "report.export(--sarif)",
  },
];

const darkFeatures = [
  {
    title: "Real import graph",
    desc: "Resolves aliased, conditional, and nested imports regex quietly misses.",
  },
  {
    title: "Transitive depth",
    desc: "Follows dependencies of dependencies, so deep GPL code can't hide.",
  },
  {
    title: "Line-level evidence",
    desc: "Every finding points to file, line, and AST node — not a vague list.",
  },
  {
    title: "Plain obligations",
    desc: "GPL, LGPL, AGPL, MPL, MIT — each as what you must do, not boilerplate.",
  },
  {
    title: "CI-ready output",
    desc: "Export SARIF or JSON and fail a build when new copyleft code lands.",
  },
  {
    title: "Runs local",
    desc: "Parsing happens on your machine. Your source is never uploaded.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                <span className="rounded-full bg-dark px-1.5 py-0.5 text-[9px] font-medium text-white">
                  New
                </span>
                Transitive dependency scanning
              </span>

              <h1 className="mt-5 font-serif-display text-5xl leading-[1.1] tracking-tight sm:text-6xl">
                Catch the{" "}
                <em className="bg-[#fff0e9] px-1 text-accent not-italic">
                  copyleft
                </em>
                <br />
                before you ship.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-muted">
                Lineage parses your Python through its abstract syntax tree —
                not a text search — to trace every import back to its
                license. See exactly where GPL and other copyleft code enters
                your project, and what it obligates you to do.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/check" className="lineage-btn-primary px-6 py-2.5 text-sm">
                  Run a license check
                </Link>
                <Link
                  href="#docs"
                  className="lineage-card px-6 py-2.5 text-sm font-medium hover:border-foreground/30"
                >
                  Read the docs
                </Link>
              </div>
              <p className="mt-4 font-mono text-xs text-muted">
                No sign-up · code never leaves your machine
              </p>
            </div>
            <HeroDemo />
          </div>
        </section>

        {/* Social proof */}
        <section className="border-y border-border py-10">
          <div className="mx-auto max-w-6xl px-6">
            <LogoRow />
          </div>
        </section>

        {/* Features */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">
            How it works
          </p>
          <h2 className="mt-2 max-w-xl font-serif-display text-3xl tracking-tight">
            Three steps from source file to a license verdict.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            No license headers required. Lineage reads what your code
            actually pulls in.
          </p>
          <div id="features" className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="lineage-card p-6">
                <p className="font-mono text-[11px] text-accent">STEP {s.n}</p>
                <h3 className="mt-3 font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {s.description}
                </p>
                <div className="mt-5 border-t border-dashed border-border pt-3">
                  <code className="font-mono text-[11px] text-muted">
                    {s.snippet}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dark block */}
        <section id="licenses" className="bg-dark py-20 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <p className="font-mono text-xs uppercase tracking-wide text-white/40">
              Why AST
            </p>
            <h2 className="mt-2 max-w-xl font-serif-display text-3xl tracking-tight">
              A text search finds the word &ldquo;license.&rdquo; Lineage
              finds the dependency.
            </h2>
            <div className="mt-10 grid gap-x-6 gap-y-8 md:grid-cols-3">
              {darkFeatures.map((f) => (
                <div key={f.title}>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <h3 className="font-medium">{f.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="docs" className="border-t border-border py-16">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-serif-display text-2xl tracking-tight">
              Documentation
            </h2>
            <p className="mt-3 text-sm text-muted">
              See the project README for CLI usage and AST similarity
              details.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
