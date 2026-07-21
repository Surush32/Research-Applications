import { NextRequest, NextResponse } from "next/server";
import {
  getRequestGitHubToken,
  githubHeaders,
  parseGitHubRepoInput,
} from "@/lib/github";
import type { GitHubRepo } from "@/types/github";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("repo") ?? "";
  const parsed = parseGitHubRepoInput(input);

  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Enter a GitHub repo as owner/name or https://github.com/owner/name",
      },
      { status: 400 }
    );
  }

  const token = getRequestGitHubToken(request);
  const res = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.name}`,
    {
      headers: githubHeaders(token),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    const message =
      res.status === 404
        ? "Repository not found. If it is private, add a GitHub token."
        : "Failed to load repository.";
    return NextResponse.json({ error: message, detail }, { status: res.status });
  }

  const repo = (await res.json()) as GitHubRepo;
  return NextResponse.json({ repo });
}
