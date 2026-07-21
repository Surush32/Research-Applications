const GITHUB_API_VERSION = "2022-11-28";

export function githubHeaders(token?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "lineage-school-project",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function getRequestGitHubToken(request: Request) {
  const headerToken = request.headers.get("x-github-token");
  if (headerToken?.trim()) return headerToken.trim();

  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return null;
}

/** Fetch GitHub API; if a bad token causes 401, retry without it for public data. */
export async function githubFetch(url: string, token?: string | null) {
  const first = await fetch(url, {
    headers: githubHeaders(token),
    cache: "no-store",
  });

  if (first.status === 401 && token) {
    return fetch(url, {
      headers: githubHeaders(null),
      cache: "no-store",
    });
  }

  return first;
}

export function githubErrorMessage(status: number, fallback: string) {
  if (status === 401) {
    return "GitHub rejected the request (unauthorized). Clear the optional token field — a bad token blocks even public repos.";
  }
  if (status === 403) {
    return "GitHub rate limit hit. Wait a minute, or paste a valid personal access token.";
  }
  if (status === 404) {
    return "Not found on GitHub. Check the URL, or add a token if the repo is private.";
  }
  return fallback;
}

export function parseGitHubRepoInput(input: string) {
  const trimmed = input.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/github\.com[/:]([^/]+)\/([^/#?\s]+)/i);
  if (urlMatch) {
    const owner = urlMatch[1];
    const name = urlMatch[2].replace(/\.git$/i, "");
    const reserved = new Set([
      "settings",
      "pulls",
      "issues",
      "marketplace",
      "explore",
      "topics",
      "notifications",
      "login",
      "signup",
      "orgs",
    ]);
    if (reserved.has(owner.toLowerCase())) return null;
    return {
      owner,
      name,
      full_name: `${owner}/${name}`,
    };
  }

  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    const owner = shortMatch[1];
    const name = shortMatch[2].replace(/\.git$/i, "");
    return {
      owner,
      name,
      full_name: `${owner}/${name}`,
    };
  }

  return null;
}

/** Accepts https://github.com/username or just username */
export function parseGitHubUserInput(input: string) {
  const trimmed = input
    .trim()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
  if (!trimmed) return null;

  if (parseGitHubRepoInput(trimmed)) return null;

  const urlMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/#?\s]+)$/i
  );
  if (urlMatch) {
    const username = urlMatch[1];
    const reserved = new Set([
      "settings",
      "pulls",
      "issues",
      "marketplace",
      "explore",
      "topics",
      "notifications",
      "login",
      "signup",
      "orgs",
    ]);
    if (reserved.has(username.toLowerCase())) return null;
    return username;
  }

  if (
    !trimmed.includes("/") &&
    !trimmed.includes("@") &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(trimmed) &&
    trimmed.length <= 39
  ) {
    return trimmed;
  }

  return null;
}
