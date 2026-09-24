import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { encryptSecret } from "@/lib/crypto";
import {
  removePersistentDatabase,
  startPersistentDatabase,
  supportedServices,
} from "@/lib/runner/database";
import { parseManifest } from "@/lib/runner/registry";

interface RouteProps {
  params: Promise<{ id: string }>;
}

interface DatabaseRecord {
  service: string;
  containerName: string;
  hostPort: number;
  status: string;
  urlEncrypted: string;
  createdAt: string;
}

function asRecord(value: unknown): DatabaseRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.containerName !== "string" || typeof record.service !== "string") return null;
  return record as unknown as DatabaseRecord;
}

export async function POST(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/database");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`database:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!project.finalizedAt) {
    return NextResponse.json(
      { error: "Mark the project as fixed before creating a database." },
      { status: 400 },
    );
  }

  const existing = asRecord(project.database);
  if (existing) {
    return NextResponse.json({ error: "A database already exists for this project." }, { status: 409 });
  }

  // Choose the service from the project's run manifest when present.
  const files =
    ((project.globalSpec as Record<string, unknown> | null)?.codeArtifacts as
      | Record<string, string>
      | null) ?? {};
  const manifest = parseManifest(files);
  const service =
    (manifest?.services ?? []).find((s) => supportedServices().includes(s)) ?? "postgres";

  try {
    const db = await startPersistentDatabase(service, id);
    if (!db) {
      return NextResponse.json({ error: `Unsupported database service: ${service}` }, { status: 400 });
    }

    const record: DatabaseRecord = {
      service: db.service,
      containerName: db.containerName,
      hostPort: db.hostPort,
      status: "ready",
      urlEncrypted: Buffer.from(encryptSecret(db.url)).toString("base64"),
      createdAt: new Date().toISOString(),
    };

    await prisma.project.update({
      where: { id },
      data: { database: record as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
    });

    await writeAudit(session.user.id, "UPDATE_PROJECT", {
      projectId: id,
      createdDatabase: db.service,
      hostPort: db.hostPort,
    }, requestIp(request));

    return NextResponse.json({
      ok: true,
      database: { service: db.service, hostPort: db.hostPort, url: db.url, status: "ready" },
    });
  } catch (err) {
    console.error("[api/projects/[id]/database]", err);
    const message = err instanceof Error ? err.message : "Failed to create database";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/database");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const record = asRecord(project.database);
  if (record) {
    await removePersistentDatabase(record.containerName);
    await prisma.project.update({
      where: { id },
      data: { database: Prisma.DbNull, updatedAt: new Date() },
    });
    await writeAudit(session.user.id, "UPDATE_PROJECT", {
      projectId: id,
      deletedDatabase: record.service,
    }, requestIp(request));
  }

  return NextResponse.json({ ok: true });
}
