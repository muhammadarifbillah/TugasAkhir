import type { Octokit } from "octokit";

/** Resolves where to push: either an existing repo (owner/repo) or a freshly created one. */
export async function resolveTarget(
  octokit: Octokit,
  opts: {
    existingRepoUrl?: string;
    repoName: string;
    visibility: string;
    projectName: string;
  },
  waitMs = 1000,
): Promise<{ owner: string; repo: string; branch: string; baseSha: string | null; repoUrl: string; created: boolean }> {
  if (opts.existingRepoUrl?.trim()) {
    const url = new URL(opts.existingRepoUrl.trim());
    // Strip ".git" suffix and leading slash so "owner/repo.git" parses cleanly.
    const [owner, repo] = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/").slice(0, 2);
    if (!owner || !repo) throw new Error("Invalid GitHub repository URL.");
    const info = await octokit.rest.repos.get({ owner, repo });
    const branch = info.data.default_branch ?? "main";
    const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    return { owner, repo, branch, baseSha: ref.data.object.sha, repoUrl: info.data.html_url, created: false };
  }

  const me = await octokit.rest.users.getAuthenticated();
  // The Git database API answers 409 on an empty repository, so let GitHub create the
  // first commit and build on top of it.
  const created = await octokit.rest.repos.createForAuthenticatedUser({
    name: opts.repoName,
    private: opts.visibility === "private",
    auto_init: true,
    description: `${opts.projectName} — generated with Saksi (NIST SP 800-218 / ISO 27001:2022).`,
  });
  const owner = created.data.owner?.login ?? me.data.login;
  const repo = created.data.name;
  const branch = created.data.default_branch ?? "main";
  return {
    owner,
    repo,
    branch,
    baseSha: await initialHead(octokit, owner, repo, branch, waitMs),
    repoUrl: created.data.html_url,
    created: true,
  };
}

/** A just-created repository answers 404/409 until GitHub finishes initialising it. */
async function initialHead(octokit: Octokit, owner: string, repo: string, branch: string, waitMs: number) {
  for (let attempt = 1; ; attempt++) {
    try {
      const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
      return ref.data.object.sha;
    } catch (err) {
      const status = (err as { status?: unknown }).status;
      if (attempt >= 10 || (status !== 404 && status !== 409)) throw err;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export async function pushFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  baseSha: string | null,
  files: Record<string, string>,
  message: string,
): Promise<string> {
  const treeItems = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const blob = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(content, "utf8").toString("base64"),
        encoding: "base64",
      });
      return { path, sha: blob.data.sha, mode: "100644" as const, type: "blob" as const };
    }),
  );

  const tree = await octokit.rest.git.createTree({ owner, repo, tree: treeItems });
  const commit = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.data.sha,
    parents: baseSha ? [baseSha] : [],
  });
  const sha = commit.data.sha;
  await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha });
  return sha;
}

/** Points `branch` at `sha`, replacing a release branch left behind by a cancelled revision. */
export async function ensureBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
): Promise<void> {
  try {
    await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha });
  } catch (err) {
    if ((err as { status?: unknown }).status !== 422) throw err;
    // Retrying the same version after a cancel would otherwise fail forever.
    await octokit.rest.git.deleteRef({ owner, repo, ref: `heads/${branch}` });
    await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha });
  }
}
