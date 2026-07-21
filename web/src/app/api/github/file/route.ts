import { NextRequest, NextResponse } from "next/server";
import {
  getRequestGitHubToken,
  githubErrorMessage,
  githubFetch,
  parseGitHubRepoInput,
} from "@/lib/github";

function decodeGitHubContent(content: string) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repoInput = searchParams.get("repo");
  const branch = searchParams.get("branch");
  const path = searchParams.get("path");
  const parsed = repoInput ? parseGitHubRepoInput(repoInput) : null;

  if (!parsed || !branch || !path) {
    return NextResponse.json(
      { error: "repo, branch, and path query params are required." },
      { status: 400 }
    );
  }

  const token = getRequestGitHubToken(request);
  const res = await githubFetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.name}/contents/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}?ref=${encodeURIComponent(branch)}`,
    token
  );

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      {
        error: githubErrorMessage(res.status, "Failed to load file contents."),
        detail,
        clearToken: res.status === 401,
      },
      { status: res.status }
    );
  }

  const data = await res.json();

  if (Array.isArray(data) || typeof data.content !== "string") {
    return NextResponse.json(
      { error: "The selected path is not a file." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    path,
    name: path.split("/").at(-1) ?? path,
    content:
      data.encoding === "base64"
        ? decodeGitHubContent(data.content)
        : data.content,
  });
}
