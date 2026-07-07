const logos = ["HashiCorp", "Northpass", "Cardinal", "Acme", "Globex"];

export function LogoRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-50 grayscale">
      {logos.map((name) => (
        <span
          key={name}
          className="text-sm font-medium tracking-wide text-foreground/70"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
