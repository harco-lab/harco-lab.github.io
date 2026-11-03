/**
 * Minimal GitHub REST client: just enough to check paths and open a pull
 * request whose single commit adds a set of files on top of the base branch.
 */

const API_ROOT = "https://api.github.com";

export class GitHubError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface RepoFile {
  path: string;
  content: string | Uint8Array;
}

export interface PullRequestOptions {
  base: string;
  branch: string;
  title: string;
  body: string;
  commitMessage: string;
  files: RepoFile[];
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export class GitHubClient {
  constructor(private readonly token: string, private readonly repo: string) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${API_ROOT}/repos/${this.repo}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new GitHubError(
        response.status,
        `GitHub ${method} ${path} failed (${response.status}): ${detail}`,
      );
    }
    return await response.json() as T;
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await this.request("GET", path);
      return true;
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return false;
      throw error;
    }
  }

  pathExists(path: string, ref: string): Promise<boolean> {
    return this.exists(
      `/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
    );
  }

  branchExists(branch: string): Promise<boolean> {
    return this.exists(`/git/ref/heads/${encodePath(branch)}`);
  }

  async openPullRequest(
    options: PullRequestOptions,
  ): Promise<{ url: string; number: number }> {
    const baseRef = await this.request<{ object: { sha: string } }>(
      "GET",
      `/git/ref/heads/${encodePath(options.base)}`,
    );
    const baseSha = baseRef.object.sha;
    const baseCommit = await this.request<{ tree: { sha: string } }>(
      "GET",
      `/git/commits/${baseSha}`,
    );

    const entries = await Promise.all(options.files.map(async (file) => {
      const blob = await this.request<{ sha: string }>(
        "POST",
        "/git/blobs",
        typeof file.content === "string"
          ? { content: file.content, encoding: "utf-8" }
          : { content: encodeBase64(file.content), encoding: "base64" },
      );
      return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
    }));

    const tree = await this.request<{ sha: string }>("POST", "/git/trees", {
      base_tree: baseCommit.tree.sha,
      tree: entries,
    });
    const commit = await this.request<{ sha: string }>(
      "POST",
      "/git/commits",
      { message: options.commitMessage, tree: tree.sha, parents: [baseSha] },
    );
    await this.request("POST", "/git/refs", {
      ref: `refs/heads/${options.branch}`,
      sha: commit.sha,
    });
    const pr = await this.request<{ html_url: string; number: number }>(
      "POST",
      "/pulls",
      {
        title: options.title,
        head: options.branch,
        base: options.base,
        body: options.body,
      },
    );
    return { url: pr.html_url, number: pr.number };
  }
}
