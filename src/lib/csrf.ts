/**
 * CSRF protection using double-submit cookie pattern.
 * Token is stored in a cookie (readable by JS) and validated against X-CSRF-Token header.
 */
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a CSRF token and set it in a cookie.
 * Returns the token to be sent in the X-CSRF-Token header.
 */
export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Client JS needs to read this
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_TOKEN_EXPIRY_MS / 1000,
  });

  return token;
}

/**
 * Validate CSRF token from request header against cookie.
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) return false;

  // Parse cookie from request header
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    }),
  );
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  if (!cookieToken) return false;

  // Compare tokens (constant-time comparison)
  if (headerToken.length !== cookieToken.length) return false;

  let mismatch = 0;
  for (let i = 0; i < headerToken.length; i++) {
    mismatch |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Check if the request method requires CSRF validation.
 */
export function requiresCsrf(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

/**
 * Check if the path is exempt from CSRF validation.
 */
export function isCsrfExempt(pathname: string): boolean {
  // NextAuth handles its own CSRF
  if (pathname.startsWith("/api/auth")) return true;
  // Public badge endpoint is GET-only
  if (pathname.startsWith("/api/badge")) return true;
  return false;
}

export { CSRF_HEADER_NAME, CSRF_COOKIE_NAME };
