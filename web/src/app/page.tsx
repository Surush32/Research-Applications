import Link from "next/link";
import { HeroDemo } from "@/components/HeroDemo";
import { LogoRow } from "@/components/LogoRow";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const features = [
  {
    title: "Point it at your code",
    description:
      "Drop a .py file or zipped package. Lineage reads your source — no git access required.",
  },
  {
    title: "Parse, don't grep",
    description:
      "AST-based import resolution finds real dependencies, not string matches in comments.",
  },
  {
    title: "Read your obligations",
    description:
      "Each finding links to the license text and a plain-English summary of what it means.",
  },
];

const darkFeatures = [
  { title: "Real import graph", desc: "Follows `import` and `from … import` statements" },
  { title: "Transitive depth", desc: "Traces dependencies up to 3 levels deep" },
  { title: "Line-level evidence", desc: "Every finding points to the exact source line" },
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
              <h1 className="font-serif-display text-5xl leading-[1.1] tracking-tight sm:text-6xl">
                Catch the{" "}
                <em className="text-accent not-italic">copyleft</em>
                <br />
                before you ship.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-muted">
                Scan your Python codebase for GPL, LGPL, and other copyleft
                licenses — before they become a compliance problem.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/check" className="lineage-btn-primary px-6 py-2.5 text-sm">
                  Add GitHub check
                </Link>
                <Link
                  href="#docs"
                  className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
                >
                  Read the docs
                </Link>
              </div>
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
        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center font-serif-display text-3xl tracking-tight">
            Three steps from source file to a license verdict
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="lineage-card p-6">
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dark block */}
        <section id="how-it-works" className="bg-dark py-20 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-serif-display text-3xl tracking-tight">
              How Lineage finds what grep misses
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
              Most tools search for license strings in file names. Lineage parses
              your Python AST, resolves imports, and checks each dependency against
              a curated license database.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {darkFeatures.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-6"
                >
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="docs" className="border-t border-border py-16">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-serif-display text-2xl tracking-tight">Documentation</h2>
            <p className="mt-3 text-sm text-muted">
              See the project README for CLI usage and AST similarity details.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
