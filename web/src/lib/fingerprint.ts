export type CodeFingerprint = {
  identifiers: string[];
  imports: string[];
  functions: string[];
  classes: string[];
  tokens: Record<string, number>;
  defCount: number;
  classCount: number;
  lineCount: number;
};

const KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "while",
  "with",
  "yield",
]);

function stripNoise(source: string) {
  return source
    .replace(/('''[\s\S]*?'''|"""[\s\S]*?""")/g, " ")
    .replace(/#.*$/gm, " ")
    .replace(/('[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*")/g, " ");
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

export function fingerprintPython(source: string): CodeFingerprint {
  const cleaned = stripNoise(source);
  const identifiers = [...cleaned.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)]
    .map((m) => m[0])
    .filter((token) => !KEYWORDS.has(token));

  const imports = [
    ...cleaned.matchAll(/^\s*import\s+([A-Za-z0-9_.,\s]+)/gm),
    ...cleaned.matchAll(/^\s*from\s+([A-Za-z0-9_.]+)\s+import\s+/gm),
  ].flatMap((match) =>
    match[1]
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean)
  );

  const functions = [
    ...cleaned.matchAll(/^\s*(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm),
  ].map((m) => m[1]);

  const classes = [
    ...cleaned.matchAll(/^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*[:(]/gm),
  ].map((m) => m[1]);

  const tokens: Record<string, number> = {};
  for (const token of identifiers) {
    tokens[token] = (tokens[token] ?? 0) + 1;
  }

  return {
    identifiers: uniqueSorted(identifiers),
    imports: uniqueSorted(imports),
    functions: uniqueSorted(functions),
    classes: uniqueSorted(classes),
    tokens,
    defCount: functions.length,
    classCount: classes.length,
    lineCount: source.split(/\r?\n/).length,
  };
}

function jaccard(a: string[], b: string[]) {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const value of setA) {
    if (setB.has(value)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function cosine(a: Record<string, number>, b: Record<string, number>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const key of keys) {
    const va = a[key] ?? 0;
    const vb = b[key] ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Fast candidate score used to shortlist corpus entries before full AST compare. */
export function fingerprintSimilarity(
  left: CodeFingerprint,
  right: CodeFingerprint
) {
  const identifierScore = jaccard(left.identifiers, right.identifiers);
  const importScore = jaccard(left.imports, right.imports);
  const functionScore = jaccard(left.functions, right.functions);
  const classScore = jaccard(left.classes, right.classes);
  const tokenScore = cosine(left.tokens, right.tokens);

  return (
    tokenScore * 0.4 +
    identifierScore * 0.25 +
    functionScore * 0.2 +
    classScore * 0.1 +
    importScore * 0.05
  );
}
