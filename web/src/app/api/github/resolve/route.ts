import { NextRequest, NextResponse } from "next/server";
import {
  getRequestGitHubToken,
  githubErrorMessage,
  githubFetch,
  parseGitHubRepoInput,
  parseGitHubUserInput,
} from "@/lib/github";
import type { GitHubRepo } from "@/types/github";

/**
 * Resolves either:
 * - a profile URL / username  -> { type: "user", username, repos }
 * - a repo URL / owner/name   -> { type: "repo", repo }
 */
export async function GET(request: NextRequest) {
  const input = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!input) {
    return NextResponse.json(
      {
        error:
          "Paste a GitHub profile (https://github.com/Surush32) or repo (Surush32/Research-Applications).",
      },
      { status: 400 }
    );
  }

  const token = getRequestGitHubToken(request);
  const asRepo = parseGitHubRepoInput(input);
  const asUser = parseGitHubUserInput(input);

  if (asUser) {
    const res = await githubFetch(
      `https://api.github.com/users/${encodeURIComponent(
        asUser
      )}/repos?per_page=100&sort=updated&type=owner`,
      token
    );

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        {
          error: githubErrorMessage(
            res.status,
            `Failed to load repositories for ${asUser}.`
          ),
          detail,
          clearToken: res.status === 401,
        },
        { status: res.status }
      );
    }

    const repos = ((await res.json()) as GitHubRepo[])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    if (repos.length === 0) {
      return NextResponse.json(
        {
          error: `No public repositories found for ${asUser}.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      type: "user",
      username: asUser,
      repos,
    });
  }

  if (asRepo) {
    const res = await githubFetch(
      `https://api.github.com/repos/${asRepo.owner}/${asRepo.name}`,
      token
    );

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        {
          error: githubErrorMessage(
            res.status,
            `Failed to load repository ${asRepo.full_name}.`
          ),
          detail,
          clearToken: res.status === 401,
        },
        { status: res.status }
      );
    }

    const repo = (await res.json()) as GitHubRepo;
    return NextResponse.json({ type: "repo", repo });
  }

  return NextResponse.json(
    {
      error:
        "Could not understand that GitHub link. Try https://github.com/Surush32 or Surush32/Research-Applications.",
    },
    { status: 400 }
  );
}
