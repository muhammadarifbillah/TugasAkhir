import type { AuditAction } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeAudit(
  userId: string | null,
  action: AuditAction,
  details?: Record<string, unknown>,
  ipAddress?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: (details as object) ?? {},
        ipAddress: ipAddress ?? null,
      },
    });
  } catch {
    // Audit logging must never break the main flow.
  }
}

/**
 * Resolves the client IP for the audit trail. `x-forwarded-for` is only
 * trusted when the app runs behind a trusted proxy (TRUSTED_PROXY=1);
 * otherwise header values are spoofable and we fall back to the direct
 * connection address.
 */
export function requestIp(request: Request): string | null {
  const trustProxy = process.env.TRUSTED_PROXY === "1";
  if (trustProxy) {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}