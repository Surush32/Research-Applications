export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
  updated_at: string;
};

export type GitHubTreeEntry = {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
};

export type GitHubImportedFile = {
  path: string;
  name: string;
  content: string;
};
