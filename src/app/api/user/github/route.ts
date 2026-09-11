import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { validateCsrfRequest } from "@/lib/validate-csrf";

/** Unlinks the GitHub account: clears the stored OAuth/PAT token & profile. */
export async function DELETE(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/user/github");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      githubAccessTokenEncrypted: null,
      githubUsername: null,
      githubAvatarUrl: null,
    },
  });

  await writeAudit(session.user.id, "UPDATE_PROJECT", { action: "disconnect_github" }, requestIp(request));

  return NextResponse.json({ ok: true });
}
