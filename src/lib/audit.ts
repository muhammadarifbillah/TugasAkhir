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
 * Resolves the client IP for the audit trail.
 *
 * `x-forwarded-for` is only trusted when the app runs behind a trusted proxy
 * (`TRUSTED_PROXY=1`); otherwise header values are spoofable and the audit row
 * is recorded without a source address rather than with a forgeable one.
 */
export function requestIp(request: Request): string | null {
  const trustProxy = process.env.TRUSTED_PROXY === "1";
  // `x-real-ip` is as attacker-controlled as `x-forwarded-for`, so it must not be
  // consulted unless a trusted proxy is in front of the app; otherwise a client
  // can forge the IP recorded in its own audit rows.
  if (!trustProxy) return null;

  const forwarded = request.headers.get("x-forwarded-for");
  const raw = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (!raw) return null;

  // Keep the stored value bounded and free of control characters.
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 64);
  return cleaned.length > 0 ? cleaned : null;
}