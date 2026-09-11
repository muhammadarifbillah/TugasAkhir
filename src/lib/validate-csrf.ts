/**
 * CSRF validation helper for API routes.
 * Usage: Call validateCsrf(request) at the start of POST/PUT/PATCH/DELETE handlers.
 */
import { NextResponse } from "next/server";
import { validateCsrfToken, requiresCsrf, isCsrfExempt } from "@/lib/csrf";

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

  // Skip CSRF for development credentials login (no token set yet)
  if (
    pathname === "/api/auth/callback/credentials" &&
    process.env.NODE_ENV !== "production"
  ) {
    return null;
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
