/**
 * CSRF validation helper for API routes.
 * Usage: Call validateCsrf(request) at the start of POST/PUT/PATCH/DELETE handlers.
 */
import { NextResponse } from "next/server";
import { validateCsrfToken, requiresCsrf, isCsrfExempt } from "@/lib/csrf";

/**
 * Rejects cross-origin state-changing requests by comparing the `Origin` header
 * with the request host. This is an independent second check: even if the
 * double-submit token were replayed, a browser sends `Origin` on cross-site
 * requests and the hosts will not match.
 *
 * A missing `Origin` is allowed — non-browser clients (curl, server-to-server,
 * tests) do not send it and are not subject to browser CSRF.
 */
function originMismatch(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false; // cannot verify; the token check still applies

  return originHost !== host;
}

/**
 * Validate CSRF token for the request. Returns null if valid, or NextResponse with error if invalid.
 * Skip validation for GET/HEAD/OPTIONS requests and exempt paths.
 */
export async function validateCsrfRequest(
  request: Request,
  pathname: string,
): Promise<NextResponse | null> {
  // Only validate state-changing methods
  if (!requiresCsrf(request.method)) return null;

  // Skip exempt paths
  if (isCsrfExempt(pathname)) return null;

  if (originMismatch(request)) {
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  }

  // In development, skip CSRF if no cookie is present (allows first-load requests)
  if (process.env.NODE_ENV !== "production") {
    const cookieHeader = request.headers.get("cookie") || "";
    const hasCsrfCookie = cookieHeader.split(";").some((c) => {
      const [key] = c.trim().split("=");
      return key === "csrf_token";
    });
    if (!hasCsrfCookie) return null;
  }

  const valid = await validateCsrfToken(request);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token" },
      { status: 403 },
    );
  }

  return null; // valid
}
