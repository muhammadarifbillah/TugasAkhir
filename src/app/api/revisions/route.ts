import { NextResponse } from "next/server";
import { z } from "zod";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { requestIp, writeAudit } from "@/lib/audit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { buildProjectFiles } from "@/lib/export-files";
import { githubRevisionWarning } from "@/lib/github-push-error";
import { ensureBranch } from "@/lib/github-push";

const bodySchema = z.object({
  projectId: z.string().min(1),
  summary: z.string().max(500).optional(),
  targetStageKey: z.string().optional(),
});

function bumpVersion(currentVersion: string): string {
  const match = /^v(\d+)\.(\d+)$/.exec(currentVersion.trim());
  if (!match) return "v1.1";
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return `v${major}.${minor + 1}`;
}

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/revisions");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { projectId, summary, targetStageKey } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.status !== "completed") {
    return NextResponse.json(
      { error: "Only completed projects can be revised." },
      { status: 400 },
    );
  }

  const nextVersion = bumpVersion(project.currentVersion);
  const active = await prisma.projectRevision.findFirst({
    where: { projectId, status: "in_progress" },
  });
  if (active) {
    return NextResponse.json(
      { error: "A revision is already in progress" },
      { status: 409 },
    );
  }

  // Resolve the stage this revision should re-open.
  const targetStage = targetStageKey
    ? await prisma.stage.findUnique({ where: { code: targetStageKey } })
    : await prisma.stage.findFirst({ orderBy: { orderIndex: "asc" } });
  if (!targetStage) {
    return NextResponse.json({ error: "Invalid target stage" }, { status: 400 });
  }

  const revision = await prisma.projectRevision.create({
    data: {
      projectId,
      version: nextVersion,
      revisionSummary: summary ?? `Revision ${nextVersion}`,
      targetStageKey: targetStage.code,
      status: "in_progress",
    },
  });

  // Re-open the target stage and point the project at it. `currentVersion` is
  // only bumped when the revision is merged — cancelling must not advance it.
  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: {
        status: "in_revision",
        currentStageIndex: targetStage.orderIndex,
        updatedAt: new Date(),
      },
    }),
    prisma.projectStage.updateMany({
      where: { projectId, stageId: targetStage.id },
      data: { status: "not_started", completionPercentage: 0 },
    }),
  ]);

  // If the user has a linked GitHub repo, open a release branch + PR that
  // actually contains the current generated code.
  let githubBranch: string | null = null;
  let githubPrUrl: string | null = null;
  let githubWarning: string | null = null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const deliverable = await prisma.deliverable.findFirst({
    where: { projectId, githubRepoUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (user?.githubAccessTokenEncrypted && deliverable?.githubRepoUrl) {
    try {
      const { files } = await buildProjectFiles(projectId, session.user.id);
      const octokit = new Octokit({ auth: decryptSecret(user.githubAccessTokenEncrypted) });
      const url = new URL(deliverable.githubRepoUrl);
      const [owner, repo] = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/").slice(0, 2);
      const branchName = `release/${nextVersion}`;

      const baseRepo = await octokit.rest.repos.get({ owner, repo });
      const defaultBranch = baseRepo.data.default_branch;
      const baseRef = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });
      const baseSha = baseRef.data.object.sha;

      await ensureBranch(octokit, owner, repo, branchName, baseSha);

      // Push the current generated code onto the release branch.
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
        message: `feat: release ${nextVersion} via Saksi`,
        tree: tree.data.sha,
        parents: [baseSha],
      });
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha: commit.data.sha,
      });
      githubBranch = branchName;

      const pr = await octokit.rest.pulls.create({
        owner,
        repo,
        title: `Release ${nextVersion} — ${project.name}`,
        head: branchName,
        base: defaultBranch,
        body: revision.revisionSummary,
      });
      githubPrUrl = pr.data.html_url;

      await prisma.projectRevision.update({
        where: { id: revision.id },
        data: { githubBranch, githubPrUrl, status: "in_progress" },
      });
    } catch (err) {
      console.error("[api/revisions] github branch/pr", err);
      githubWarning = githubRevisionWarning(err);
    }
  }

  await writeAudit(session.user.id, "START_REVISION", {
    projectId,
    version: nextVersion,
    githubPrUrl,
    githubWarning,
  }, requestIp(request));

  return NextResponse.json({
    ok: true,
    revision: { ...revision, githubBranch, githubPrUrl },
    nextVersion,
    prUrl: githubPrUrl,
    githubWarning,
  });
}
