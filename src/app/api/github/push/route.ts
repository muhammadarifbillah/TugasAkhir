import { NextResponse } from "next/server";
import { z } from "zod";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { buildProjectFiles } from "@/lib/export-files";
import { validateCsrfRequest } from "@/lib/validate-csrf";

const bodySchema = z.object({
  projectId: z.string().min(1),
  repoName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid repository name"),
  visibility: z.enum(["public", "private"]).default("private"),
  commitMessage: z.string().max(200).optional(),
  pat: z.string().min(1).max(200).optional(),
  existingRepoUrl: z.string().url().optional(),
});

/** Resolves where to push: either an existing repo (owner/repo) or a freshly created one. */
async function resolveTarget(
  octokit: Octokit,
  opts: {
    existingRepoUrl?: string;
    repoName: string;
    visibility: string;
    projectName: string;
  },
): Promise<{ owner: string; repo: string; branch: string; baseSha: string | null; repoUrl: string }> {
  if (opts.existingRepoUrl?.trim()) {
    const url = new URL(opts.existingRepoUrl.trim());
    // Strip ".git" suffix and leading slash so "owner/repo.git" parses cleanly.
    const [owner, repo] = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/").slice(0, 2);
    if (!owner || !repo) throw new Error("Invalid GitHub repository URL.");
    const info = await octokit.rest.repos.get({ owner, repo });
    const branch = info.data.default_branch ?? "main";
    const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    return { owner, repo, branch, baseSha: ref.data.object.sha, repoUrl: info.data.html_url };
  }

  const me = await octokit.rest.users.getAuthenticated();
  const created = await octokit.rest.repos.createForAuthenticatedUser({
    name: opts.repoName,
    private: opts.visibility === "private",
    auto_init: false,
    description: `${opts.projectName} — generated with ShieldForge (NIST SP 800-218 / ISO 27001:2022).`,
  });
  return {
    owner: created.data.owner?.login ?? me.data.login,
    repo: created.data.name,
    branch: created.data.default_branch ?? "main",
    baseSha: null,
    repoUrl: created.data.html_url,
  };
}

async function pushFiles(
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

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/github/push");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
  }
  const { projectId, repoName, visibility, commitMessage, pat, existingRepoUrl } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const patProvided = Boolean(pat && pat.trim());

  let token: string;
  if (patProvided) {
    token = pat!.trim();
  } else if (user?.githubAccessTokenEncrypted) {
    try {
      token = decryptSecret(user.githubAccessTokenEncrypted);
    } catch {
      return NextResponse.json({ error: "Failed to decrypt GitHub token." }, { status: 500 });
    }
  } else {
    return NextResponse.json(
      { error: "GitHub account not linked and no Personal Access Token provided. Paste a PAT with repo scope in the panel below." },
      { status: 400 },
    );
  }

  try {
    const { project, files } = await buildProjectFiles(projectId, session.user.id);
    const octokit = new Octokit({ auth: token });

    const me = await octokit.rest.users.getAuthenticated();

    // Persist the PAT encrypted so future pushes don't require re-pasting it.
    if (patProvided) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          githubAccessTokenEncrypted: encryptSecret(token),
          githubUsername: me.data.login,
          githubAvatarUrl: me.data.avatar_url,
        },
      });
    }

    const target = await resolveTarget(octokit, {
      existingRepoUrl,
      repoName,
      visibility,
      projectName: project.name,
    });

    await pushFiles(
      octokit,
      target.owner,
      target.repo,
      target.branch,
      target.baseSha,
      files,
      commitMessage?.trim() ||
        `feat: ${target.baseSha ? `update` : `initial release`} ${project.currentVersion} via ShieldForge`,
    );
    const repoUrl = target.repoUrl;

    await prisma.deliverable.create({
      data: {
        projectId,
        type: "github_repo",
        title: `${existingRepoUrl ? `Pushed to` : `Created`} ${target.owner}/${target.repo}`,
        githubRepoUrl: repoUrl,
        version: project.currentVersion,
      },
    });

    await writeAudit(session.user.id, "PUSH_GITHUB", { projectId, repo: repoUrl }, requestIp(request));

    return NextResponse.json({ ok: true, repoUrl, owner: target.owner, repo: target.repo });
  } catch (err) {
    console.error("[api/github/push]", err);
    const message = err instanceof Error ? err.message : "GitHub push failed";
    const error = message.includes("already exists")
      ? "Repository name already exists on your GitHub."
      : /401|bad credentials|authentication/i.test(message)
        ? "GitHub authentication failed. Provide a valid Personal Access Token or reconnect GitHub."
        : /403|permission|forbidden/i.test(message)
          ? "GitHub denied write access to this repository. Check the token scope and repository permissions."
          : "GitHub push failed. Check the repository URL, token, and permissions.";
    return NextResponse.json(
      { error },
      { status: 400 },
    );
  }
}
