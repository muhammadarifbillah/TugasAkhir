import { NextResponse } from "next/server";
import { z } from "zod";
import { Octokit } from "octokit";
import { auth } from "@/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { pushFiles, resolveTarget } from "@/lib/github-push";
import { githubPushError } from "@/lib/github-push-error";
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
        `feat: ${target.created ? `initial release` : `update`} ${project.currentVersion} via ShieldForge`,
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
    return NextResponse.json(
      { error: githubPushError(err) },
      { status: 400 },
    );
  }
}
