export function HeroDemo() {
  return (
    <div className="lineage-card overflow-hidden shadow-sm">
      <div className="grid md:grid-cols-2">
        <div className="border-b border-border p-4 md:border-b-0 md:border-r">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 text-xs text-muted">main.py</span>
          </div>
          <pre className="overflow-x-auto font-mono text-[11px] leading-5 text-foreground/90">
            <code>{`import pandas as pd
from fast_statistics import mean

def analyze(data):
    return mean(data)

# ... 42 more lines`}</code>
          </pre>
          <div className="mt-3 rounded-md bg-[#fff4f0] px-3 py-2 text-xs">
            <span className="text-accent">⚠ copyleft detected</span>
            <span className="text-muted"> — fast_statistics → GPL-3.0</span>
          </div>
        </div>

        <div className="p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Dependency graph
          </p>
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="rounded-md border border-border bg-background px-3 py-1.5 text-xs">
              main.py
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="rounded-md border border-border bg-background px-3 py-1.5 text-xs">
              fast_statistics
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="rounded-md border border-accent bg-[#fff4f0] px-3 py-1.5 text-xs text-accent">
              GPL-3.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
