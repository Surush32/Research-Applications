"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { checkWithAzure, scanAgainstCorpus } from "@/lib/api";
import type {
  GitHubImportedFile,
  GitHubRepo,
  GitHubTreeEntry,
} from "@/types/github";

type ScanMode = "corpus" | "azure" | "pairwise";

type ResolveResponse =
  | { type: "user"; username: string; repos: GitHubRepo[] }
  | { type: "repo"; repo: GitHubRepo };

type RepoTreeResponse = {
  repo: string;
  branch: string;
  files: GitHubTreeEntry[];
  truncated: boolean;
};

type FileResponse = GitHubImportedFile;

const MAX_CORPUS_FILES = 20;
const TOKEN_KEY = "lineage-github-token";
const LAST_QUERY_KEY = "lineage-github-last-query";
const DEFAULT_REPO = "https://github.com/Surush32/Research-Applications";

function authHeaders(token: string) {
  return token ? { "x-github-token": token } : undefined;
}

export function GitHubRepoBrowser() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("corpus");
  const [repoInput, setRepoInput] = useState(DEFAULT_REPO);
  const [token, setToken] = useState("");
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [files, setFiles] = useState<GitHubTreeEntry[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState(0.75);

  // Clear any stale token from a previous session (no setState — avoids hydration issues).
  useEffect(() => {
    sessionStorage.removeItem(TOKEN_KEY);
  }, []);

  const maxFiles = mode === "pairwise" ? 2 : MAX_CORPUS_FILES;

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return files.filter((file) =>
      query ? file.path.toLowerCase().includes(query) : true
    );
  }, [files, search]);

  function switchMode(nextMode: ScanMode) {
    setMode(nextMode);
    const nextMax = nextMode === "pairwise" ? 2 : MAX_CORPUS_FILES;
    setSelectedPaths((current) => current.slice(0, nextMax));
  }

  async function runAzureCheck() {
    if (!selectedRepo || selectedPaths.length < 1) {
      setError("Pick at least one Python file to check with Azure.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const orderedFiles = await fetchSelectedFiles();
      const result = await checkWithAzure({
        files: orderedFiles.map((file) => ({
          path: file.path,
          name: file.name,
          content: file.content,
        })),
        repo: selectedRepo.full_name,
        branch: selectedRepo.default_branch,
      });

      sessionStorage.setItem("lineage-azure-results", JSON.stringify(result));
      router.push("/check/azure-results");
      router.refresh();
    } catch (azureError) {
      setError(
        azureError instanceof Error ? azureError.message : "Azure check failed."
      );
    } finally {
      setWorking(false);
    }
  }

  function saveToken(next: string) {
    setToken(next);
    if (next.trim()) {
      sessionStorage.setItem(TOKEN_KEY, next.trim());
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  function clearToken() {
    saveToken("");
  }

  function maybeClearBadToken(payload: { clearToken?: boolean } | null) {
    if (payload?.clearToken) {
      clearToken();
    }
  }

  async function loadRepoTree(repo: GitHubRepo) {
    setTreeLoading(true);
    setSelectedPaths([]);
    setFiles([]);
    setSelectedRepo(repo);
    setError(null);

    try {
      const treeParams = new URLSearchParams({
        repo: repo.full_name,
        branch: repo.default_branch,
      });
      const treeRes = await fetch(`/api/github/tree?${treeParams.toString()}`, {
        cache: "no-store",
        headers: authHeaders(token.trim()),
      });
      const treeData = (await treeRes.json().catch(() => null)) as
        | (RepoTreeResponse & { clearToken?: boolean })
        | { error?: string; clearToken?: boolean }
        | null;

      maybeClearBadToken(treeData);

      if (!treeRes.ok) {
        if (treeRes.status === 404 || treeRes.status === 409) {
          setFiles([]);
          setError(
            `${repo.full_name} has no browsable files yet (empty repo), or the default branch could not be read.`
          );
          return;
        }
        throw new Error(
          treeData && "error" in treeData && treeData.error
            ? treeData.error
            : "Failed to load repository files."
        );
      }

      const nextFiles =
        treeData && "files" in treeData && Array.isArray(treeData.files)
          ? treeData.files
          : [];
      setFiles(nextFiles);
      if (nextFiles.length === 0) {
        setError(
          `No .py files found in ${repo.full_name}. Pick another repo from the list.`
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load repository files."
      );
    } finally {
      setTreeLoading(false);
    }
  }

  async function loadRepository(e?: React.FormEvent) {
    e?.preventDefault();
    setLoadingRepo(true);
    setError(null);
    setSelectedPaths([]);
    setFiles([]);
    setSelectedRepo(null);
    setUserRepos([]);

    try {
      const query = repoInput.trim();
      sessionStorage.setItem(LAST_QUERY_KEY, query);

      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/github/resolve?${params.toString()}`, {
        cache: "no-store",
        headers: authHeaders(token.trim()),
      });
      const data = (await res.json().catch(() => null)) as
        | (ResolveResponse & { clearToken?: boolean })
        | { error?: string; clearToken?: boolean }
        | null;

      maybeClearBadToken(data);

      if (!res.ok || !data || !("type" in data)) {
        throw new Error(
          data && "error" in data && data.error
            ? data.error
            : "Failed to resolve that GitHub link."
        );
      }

      if (data.type === "user") {
        setUserRepos(data.repos);
        await loadRepoTree(data.repos[0]);
        return;
      }

      setUserRepos([]);
      await loadRepoTree(data.repo);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load repo."
      );
    } finally {
      setLoadingRepo(false);
    }
  }

  function togglePath(path: string) {
    setSelectedPaths((current) => {
      if (current.includes(path)) {
        return current.filter((item) => item !== path);
      }
      if (current.length >= maxFiles) return current;
      return [...current, path];
    });
  }

  async function fetchSelectedFiles() {
    if (!selectedRepo) throw new Error("Load a repository first.");

    const orderedFiles: GitHubImportedFile[] = [];

    for (const path of selectedPaths) {
      const params = new URLSearchParams({
        repo: selectedRepo.full_name,
        branch: selectedRepo.default_branch,
        path,
      });

      const res = await fetch(`/api/github/file?${params.toString()}`, {
        cache: "no-store",
        headers: authHeaders(token.trim()),
      });
      const data = (await res.json().catch(() => null)) as
        | FileResponse
        | { error?: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        throw new Error(
          data && typeof data === "object" && "error" in data && data.error
            ? data.error
            : "Failed to load a file."
        );
      }

      orderedFiles.push(data as GitHubImportedFile);
    }

    return orderedFiles;
  }

  async function runCorpusScan() {
    if (!selectedRepo || selectedPaths.length < 1) {
      setError("Pick at least one Python file to scan against the corpus.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const orderedFiles = await fetchSelectedFiles();
      const result = await scanAgainstCorpus({
        files: orderedFiles.map((file) => ({
          path: file.path,
          name: file.name,
          content: file.content,
        })),
        threshold,
        topK: 3,
        repo: selectedRepo.full_name,
        branch: selectedRepo.default_branch,
      });

      sessionStorage.setItem("lineage-scan-results", JSON.stringify(result));
      router.push("/check/scan-results");
      router.refresh();
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : "Corpus scan failed."
      );
    } finally {
      setWorking(false);
    }
  }

  async function importForPairwise() {
    if (!selectedRepo || selectedPaths.length !== 2) {
      setError("Pick exactly two Python files for pairwise compare.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const orderedFiles = await fetchSelectedFiles();
      sessionStorage.setItem(
        "lineage-github-import",
        JSON.stringify({
          repo: selectedRepo.full_name,
          branch: selectedRepo.default_branch,
          files: orderedFiles,
        })
      );
      router.push("/check");
      router.refresh();
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Import failed."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4">
        <div className="lineage-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Scan mode
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => switchMode("corpus")}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                mode === "corpus"
                  ? "border-accent bg-[#fff4f0]"
                  : "border-border"
              }`}
            >
              <span className="font-medium">Corpus scan</span>
              <span className="mt-1 block text-xs text-muted">
                Compare selected files to known reference code
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("azure")}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                mode === "azure"
                  ? "border-accent bg-[#fff4f0]"
                  : "border-border"
              }`}
            >
              <span className="font-medium">Azure protected check</span>
              <span className="mt-1 block text-xs text-muted">
                Check up to 20 files with Microsoft Azure Content Safety
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("pairwise")}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                mode === "pairwise"
                  ? "border-accent bg-[#fff4f0]"
                  : "border-border"
              }`}
            >
              <span className="font-medium">Pairwise compare</span>
              <span className="mt-1 block text-xs text-muted">
                Pick two files and compare them to each other
              </span>
            </button>
          </div>
        </div>

        <form onSubmit={loadRepository} className="lineage-card space-y-3 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            GitHub source
          </p>
          <input
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="https://github.com/Surush32/Research-Applications"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-muted">
            Your project repo works:{" "}
            <span className="font-medium text-foreground">
              Surush32/Research-Applications
            </span>
          </p>
          <div>
            <label className="text-xs text-muted">
              Optional token (leave blank for public repos)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => saveToken(e.target.value)}
              placeholder="Only needed for private repos"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            {token && (
              <button
                type="button"
                onClick={clearToken}
                className="mt-2 text-xs text-accent underline underline-offset-2"
              >
                Clear token
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loadingRepo || !repoInput.trim()}
            className="lineage-btn-dark w-full py-2 text-sm disabled:opacity-50"
          >
            {loadingRepo ? "Loading…" : "Load from GitHub"}
          </button>

          {userRepos.length > 0 && (
            <div>
              <label className="text-xs text-muted">Choose a repository</label>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={selectedRepo?.full_name ?? ""}
                onChange={(e) => {
                  const repo = userRepos.find(
                    (item) => item.full_name === e.target.value
                  );
                  if (repo) void loadRepoTree(repo);
                }}
              >
                {userRepos.map((repo) => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedRepo && (
            <p className="text-xs text-muted">
              Loaded{" "}
              <span className="font-medium text-foreground">
                {selectedRepo.full_name}
              </span>{" "}
              · branch {selectedRepo.default_branch}
            </p>
          )}
        </form>

        {mode === "corpus" && (
          <div className="lineage-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Similarity threshold
            </p>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-3 w-full accent-accent"
            />
            <p className="mt-1 text-sm font-medium">{threshold.toFixed(2)}</p>
          </div>
        )}

        <div className="lineage-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Selected files
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {selectedPaths.length === 0 ? (
              <li className="text-muted">
                {mode === "corpus"
                  ? `Choose 1–${MAX_CORPUS_FILES} .py files.`
                  : "Choose exactly two .py files."}
              </li>
            ) : (
              selectedPaths.map((path) => (
                <li key={path} className="truncate">
                  {path}
                </li>
              ))
            )}
          </ul>
          {(mode === "corpus" || mode === "azure") && files.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setSelectedPaths(
                  files.slice(0, MAX_CORPUS_FILES).map((file) => file.path)
                )
              }
              className="mt-3 text-xs text-accent underline underline-offset-2"
            >
              Select all .py files ({Math.min(files.length, MAX_CORPUS_FILES)})
            </button>
          )}
          <button
            type="button"
            onClick={
              mode === "corpus"
                ? runCorpusScan
                : mode === "azure"
                  ? runAzureCheck
                  : importForPairwise
            }
            disabled={
              working ||
              (mode === "pairwise"
                ? selectedPaths.length !== 2
                : selectedPaths.length < 1)
            }
            className="lineage-btn-dark mt-4 w-full py-2 text-sm disabled:opacity-50"
          >
            {working
              ? mode === "corpus"
                ? "Scanning corpus…"
                : mode === "azure"
                  ? "Checking with Azure…"
                  : "Importing…"
              : mode === "corpus"
                ? "Scan against corpus"
                : mode === "azure"
                  ? "Check with Azure"
                  : "Use selected files"}
          </button>
        </div>
      </aside>

      <section className="lineage-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium">Repository files</h2>
            <p className="mt-1 text-sm text-muted">
              Only `.py` files are listed (AST scanner). Your GitHub repo
              currently has these Python files under{" "}
              <span className="font-medium text-foreground">AST/</span>.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files"
            className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-72"
          />
        </div>

        {treeLoading ? (
          <p className="mt-6 text-sm text-muted">Loading repository files...</p>
        ) : (
          <div className="mt-6 space-y-2">
            {filteredFiles.length === 0 ? (
              <p className="text-sm text-muted">
                {selectedRepo
                  ? "No Python files found in this repository."
                  : "Load a repository to see its `.py` files."}
              </p>
            ) : (
              filteredFiles.map((file) => {
                const checked = selectedPaths.includes(file.path);
                const canSelect = checked || selectedPaths.length < maxFiles;

                return (
                  <label
                    key={`${file.sha}-${file.path}`}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                      checked ? "border-accent bg-[#fff4f0]" : "border-border"
                    } ${canSelect ? "cursor-pointer" : "opacity-50"}`}
                  >
                    <span className="truncate pr-3">{file.path}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canSelect}
                      onChange={() => togglePath(file.path)}
                      className="accent-accent"
                    />
                  </label>
                );
              })
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
