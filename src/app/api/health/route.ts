import { NextResponse } from "next/server";

/**
 * Liveness/readiness probe for container orchestration (Docker healthcheck,
 * Caddy, reverse proxies). Intentionally unauthenticated and dependency-free so
 * it stays fast and never fails because of an external service.
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
