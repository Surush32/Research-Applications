import ast
import sys
import argparse
import hashlib
from pathlib import Path
from collections import Counter


# ──────────────────────────────────────────────
# 1. AST FEATURE EXTRACTION - captures the shape of the code
# ──────────────────────────────────────────────

def load_ast(filepath: str) -> ast.Module:

    path = Path(filepath)
    if not path.exists():
        print(f"[ERROR] File not found: {filepath}")
        sys.exit(1)
    if path.suffix != ".py":
        print(f"[WARNING] {filepath} does not have a .py extension — proceeding anyway.")
    try:
        source = path.read_text(encoding="utf-8")
        return ast.parse(source, filename=filepath)
    except SyntaxError as e:
        print(f"[ERROR] Syntax error in {filepath}: {e}")
        sys.exit(1)


def extract_node_sequence(tree: ast.Module) -> list[str]:
    """
    Walk the AST and return an ordered list of node-type names.
    This captures the structural 'shape' of the code without
    caring about variable names or string values.
    """
    return [type(node).__name__ for node in ast.walk(tree)]


def extract_node_counts(tree: ast.Module) -> Counter:
    """Frequency map of each AST node type."""
    return Counter(type(node).__name__ for node in ast.walk(tree))


def extract_function_signatures(tree: ast.Module) -> list[str]:
    """
    Extract (name, arg_count, return_annotated) tuples for every
    function/method definition — useful to spot identical APIs.
    """
    sigs = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            arg_count = len(node.args.args)
            has_return = node.returns is not None
            sigs.append(f"{node.name}/{arg_count}/{'R' if has_return else 'N'}")
    return sorted(sigs)


def extract_class_names(tree: ast.Module) -> list[str]:
    """Return sorted list of class names defined in the file."""
    return sorted(
        node.name
        for node in ast.walk(tree)
        if isinstance(node, ast.ClassDef)
    )


def extract_import_fingerprint(tree: ast.Module) -> list[str]:
    """Normalised list of imported names (module + alias)."""
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            for alias in node.names:
                imports.append(f"{mod}.{alias.name}")
    return sorted(imports)


def literal_hash(tree: ast.Module) -> str:
    """
    SHA-256 of all string / numeric literals in the file.
    Identical literal sets are a strong indicator of copied content.
    """
    literals = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant):
            literals.append(repr(node.value))
    digest = hashlib.sha256("||".join(sorted(literals)).encode()).hexdigest()
    return digest


# ──────────────────────────────────────────────
# 2. SIMILARITY METRICS - checks the similaritry of the files
# ──────────────────────────────────────────────

def cosine_similarity(c1: Counter, c2: Counter) -> float:
    """
    Cosine similarity between two frequency Counter vectors.
    Returns a value in [0.0, 1.0].
    """
    all_keys = set(c1) | set(c2)
    if not all_keys:
        return 0.0
    dot = sum(c1[k] * c2[k] for k in all_keys)
    mag1 = sum(v ** 2 for v in c1.values()) ** 0.5
    mag2 = sum(v ** 2 for v in c2.values()) ** 0.5
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


def jaccard_similarity(seq1: list, seq2: list) -> float:
    """
    Jaccard index on the *set* of node types present in each file.
    Less sensitive to file size differences than cosine.
    """
    s1, s2 = set(seq1), set(seq2)
    if not s1 and not s2:
        return 1.0
    return len(s1 & s2) / len(s1 | s2)


def sequence_overlap(seq1: list[str], seq2: list[str]) -> float:
    """
    Longest-Common-Subsequence ratio as a structural similarity proxy.
    Uses a memory-efficient DP approach.
    Capped at 10 000 elements each to keep it fast in the terminal.
    """
    a, b = seq1[:10_000], seq2[:10_000]
    m, n = len(a), len(b)
    # single-row DP
    prev = [0] * (n + 1)
    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr
    lcs_len = prev[n]
    return (2 * lcs_len) / (m + n) if (m + n) > 0 else 0.0


def signature_overlap(sigs1: list[str], sigs2: list[str]) -> float:
    """Fraction of function signatures shared between both files."""
    s1, s2 = set(sigs1), set(sigs2)
    if not s1 and not s2:
        return 0.0
    return len(s1 & s2) / max(len(s1), len(s2), 1)


# ──────────────────────────────────────────────
# 3. AGGREGATE SCORE - combines the individual metrics into a single score
# ──────────────────────────────────────────────

WEIGHTS = {
    "cosine":    0.30,
    "jaccard":   0.15,
    "lcs":       0.30,
    "signature": 0.25,
}


def compute_similarity(tree_a: ast.Module, tree_b: ast.Module) -> dict:
    """Compute all individual scores and a weighted aggregate."""
    counts_a = extract_node_counts(tree_a)
    counts_b = extract_node_counts(tree_b)
    seq_a    = extract_node_sequence(tree_a)
    seq_b    = extract_node_sequence(tree_b)
    sigs_a   = extract_function_signatures(tree_a)
    sigs_b   = extract_function_signatures(tree_b)

    scores = {
        "cosine":    cosine_similarity(counts_a, counts_b),
        "jaccard":   jaccard_similarity(seq_a, seq_b),
        "lcs":       sequence_overlap(seq_a, seq_b),
        "signature": signature_overlap(sigs_a, sigs_b),
    }
    scores["aggregate"] = sum(scores[k] * WEIGHTS[k] for k in WEIGHTS)
    return scores


# ──────────────────────────────────────────────
# 4. REPORT RENDERING - prints a nice report to the terminal
# ──────────────────────────────────────────────

ANSI = {
    "red":    "\033[91m",
    "yellow": "\033[93m",
    "green":  "\033[92m",
    "cyan":   "\033[96m",
    "bold":   "\033[1m",
    "reset":  "\033[0m",
}

def c(text: str, *styles: str) -> str:
    """Wrap text in ANSI colour/style codes."""
    prefix = "".join(ANSI[s] for s in styles)
    return f"{prefix}{text}{ANSI['reset']}"


def bar(value: float, width: int = 30) -> str:
    """ASCII progress bar for a 0–1 float."""
    filled = int(round(value * width))
    return "[" + "█" * filled + "░" * (width - filled) + "]"


def severity_label(score: float, threshold: float) -> str:
    if score >= 0.90:
        return c("CRITICAL — Likely direct copy", "red", "bold")
    if score >= threshold:
        return c("WARNING  — High structural similarity", "yellow", "bold")
    return c("CLEAR    — Below threshold", "green", "bold")


def print_report(
    file_a: str,
    file_b: str,
    scores: dict,
    threshold: float,
    tree_a: ast.Module,
    tree_b: ast.Module,
):
    agg = scores["aggregate"]
    W = 60

    print()
    print(c("═" * W, "bold"))
    print(c("  LICENSE / PLAGIARISM CHECK REPORT", "bold", "cyan"))
    print(c("═" * W, "bold"))

    print(f"\n  {'File A':<10} {c(file_a, 'bold')}")
    print(f"  {'File B':<10} {c(file_b, 'bold')}")
    print(f"  {'Threshold':<10} {threshold:.0%}\n")

    print(c("  ── Similarity Scores ──────────────────────────", "bold"))
    labels = {
        "cosine":    "Node-freq cosine",
        "jaccard":   "Node-type Jaccard",
        "lcs":       "Structural LCS",
        "signature": "Function signatures",
    }
    for key, label in labels.items():
        v = scores[key]
        colour = "red" if v >= threshold else ("yellow" if v >= threshold * 0.8 else "green")
        print(f"  {label:<22} {bar(v)}  {c(f'{v:.1%}', colour)}")

    print()
    print(f"  {'Aggregate (weighted)':<22} {bar(agg)}  {c(f'{agg:.1%}', 'bold')}")
    print()
    print(f"  Status: {severity_label(agg, threshold)}")
    print()

    # ── Structural details ─────────────────────────────
    sigs_a = set(extract_function_signatures(tree_a))
    sigs_b = set(extract_function_signatures(tree_b))
    shared_sigs = sigs_a & sigs_b
    cls_a = set(extract_class_names(tree_a))
    cls_b = set(extract_class_names(tree_b))
    shared_cls = cls_a & cls_b
    imp_a = set(extract_import_fingerprint(tree_a))
    imp_b = set(extract_import_fingerprint(tree_b))
    shared_imp = imp_a & imp_b
    same_literals = literal_hash(tree_a) == literal_hash(tree_b)

    print(c("  ── Structural Details ─────────────────────────", "bold"))
    print(f"  Shared function signatures : {len(shared_sigs)}")
    if shared_sigs:
        for sig in sorted(shared_sigs)[:5]:
            name = sig.split("/")[0]
            print(f"    • {name}")
        if len(shared_sigs) > 5:
            print(f"    … and {len(shared_sigs) - 5} more")

    print(f"  Shared class names         : {len(shared_cls)}")
    if shared_cls:
        for cls in sorted(shared_cls)[:5]:
            print(f"    • {cls}")

    print(f"  Shared imports             : {len(shared_imp)}")
    print(f"  Identical literal sets     : {c('YES — strong copy signal', 'red', 'bold') if same_literals else c('No', 'green')}")

    print()

    # ── Recommendation ─────────────────────────────────
    print(c("  ── Recommendation ─────────────────────────────", "bold"))
    if agg >= 0.90:
        print(c("  ⚠  CRITICAL: The files are nearly identical at the structural\n"
                "     level. Manual review is strongly advised before shipping.\n"
                "     Verify that licences permit inclusion or that this is\n"
                "     intentional (e.g. a refactored copy of your own code).", "red"))
    elif agg >= threshold:
        print(c("  ⚠  WARNING: Structural similarity exceeds the set threshold.\n"
                "     Review shared functions/classes listed above and confirm\n"
                "     that any borrowed code carries the appropriate licence\n"
                "     header, attribution comment, or is your own work.", "yellow"))
    else:
        print(c("  ✔  No significant structural similarity detected.\n"
                "     The files appear to be independently authored.", "green"))

    print(c("═" * W, "bold"))
    print()


# ──────────────────────────────────────────────
# 5. ENTRY POINT
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="AST-based Python source similarity / licence checker."
    )
    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=0.75,
        help="Similarity threshold that triggers a warning (default: 0.75)",
    )
    args = parser.parse_args()

    file_a = input("Enter path to first file:  ").strip()
    file_b = input("Enter path to second file: ").strip()

    print(c(f"\nParsing {file_a} …", "cyan"))
    tree_a = load_ast(file_a)

    print(c(f"Parsing {file_b} …", "cyan"))
    tree_b = load_ast(file_b)

    print(c("Running similarity analysis …\n", "cyan"))
    scores = compute_similarity(tree_a, tree_b)

    print_report(file_a, file_b, scores, args.threshold, tree_a, tree_b)

    sys.exit(1 if scores["aggregate"] >= args.threshold else 0)


if __name__ == "__main__":
    main()


