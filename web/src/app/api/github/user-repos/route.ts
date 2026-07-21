import { NextRequest, NextResponse } from "next/server";
import {
  getRequestGitHubToken,
  githubHeaders,
  parseGitHubUserInput,
} from "@/lib/github";
import type { GitHubRepo } from "@/types/github";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("user") ?? "";
  const username = parseGitHubUserInput(input);

  if (!username) {
    return NextResponse.json(
      {
        error:
          "Enter a GitHub username or profile URL like https://github.com/Surush32",
      },
      { status: 400 }
    );
  }

  const token = getRequestGitHubToken(request);
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(
      username
    )}/repos?per_page=100&sort=updated&type=owner`,
    {
      headers: githubHeaders(token),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    const message =
      res.status === 404
        ? "GitHub user not found."
        : "Failed to load repositories for this user.";
    return NextResponse.json({ error: message, detail }, { status: res.status });
  }

  const repos = (await res.json()) as GitHubRepo[];

  return NextResponse.json({
    username,
    repos: repos
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
  });
}
