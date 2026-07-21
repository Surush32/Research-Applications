import { NextRequest, NextResponse } from "next/server";
import {
  getRequestGitHubToken,
  githubErrorMessage,
  githubFetch,
  parseGitHubRepoInput,
} from "@/lib/github";
import type { GitHubTreeEntry } from "@/types/github";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repoInput = searchParams.get("repo");
  const branch = searchParams.get("branch");
  const parsed = repoInput ? parseGitHubRepoInput(repoInput) : null;

  if (!parsed || !branch) {
    return NextResponse.json(
      { error: "repo and branch query params are required." },
      { status: 400 }
    );
  }

  const token = getRequestGitHubToken(request);
  const res = await githubFetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.name}/git/trees/${encodeURIComponent(
      branch
    )}?recursive=1`,
    token
  );

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      {
        error: githubErrorMessage(res.status, "Failed to load repository tree."),
        detail,
        clearToken: res.status === 401,
      },
      { status: res.status }
    );
  }

  const data = await res.json();
  const files = ((data.tree ?? []) as GitHubTreeEntry[]).filter(
    (entry) => entry.type === "blob" && entry.path.endsWith(".py")
  );

  return NextResponse.json({
    repo: parsed.full_name,
    branch,
    files,
    truncated: Boolean(data.truncated),
  });
}
