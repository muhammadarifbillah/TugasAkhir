import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getLocaleFromAcceptLanguage,
  getLocaleFromCookie,
  isLocale,
  locales,
} from "@/lib/i18n";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_TOKEN_MAX_AGE = 60 * 60; // 1 hour in seconds

/**
 * Issues the double-submit CSRF token. Runs in the Proxy (formerly
 * `middleware`) runtime, so Web Crypto is used instead of `node:crypto`.
 */
function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Per-request script nonce (base64) so inline scripts can be allow-listed. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * CSP with a nonce for `script-src` (replacing `'unsafe-inline'`). `'unsafe-eval'`
 * is still required by Monaco's AMD loader; `style-src` keeps `'unsafe-inline'`
 * for Mermaid's injected SVG styles.
 */
function buildCsp(nonce: string): string {
  // The Docker "Run" preview embeds the generated app at http://localhost:<port>,
  // which is only available in development (Run is disabled on the prod stack).
  const frameSrc =
    process.env.NODE_ENV === "production"
      ? "frame-src 'self'"
      : "frame-src 'self' http://localhost:* http://127.0.0.1:*";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    frameSrc,
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    // The browser only talks to our own origin (AI calls are server-side).
    "connect-src 'self'",
    "manifest-src 'self'",
  ].join("; ");
}

function extractLocale(pathname: string): string | null {
  const segment = pathname.split("/")[1];
  return segment && isLocale(segment) ? segment : null;
}

/** Mirrors `githubConfigured` in src/auth.ts without importing the auth stack. */
function isGithubOAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
}

export function proxy(request: NextRequest) {
  // Fail closed: a production deployment without GitHub OAuth has no usable
  // sign-in provider (the credential-less dev provider is disabled there), so
  // refusing clearly beats serving an app nobody can authenticate against.
  if (process.env.NODE_ENV === "production" && !isGithubOAuthConfigured()) {
    return new NextResponse(
      "Authentication is not configured. Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET " +
        "in the production environment, then redeploy.\n",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const { pathname, search } = request.nextUrl;

  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the nonce from this request header and stamps its inline scripts.
  requestHeaders.set("Content-Security-Policy", csp);

  const existingCsrf = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const needsCsrf = !existingCsrf;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  let response: NextResponse;

  if (pathnameHasLocale) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    const locale =
      extractLocale(pathname) ??
      getLocaleFromCookie(request.headers.get("cookie")) ??
      getLocaleFromAcceptLanguage(request.headers.get("accept-language"));

    const redirectTo = new URL(
      `/${locale}${pathname === "/" ? "" : pathname}${search}`,
      request.url,
    );
    response = NextResponse.redirect(redirectTo);
  }

  response.headers.set("Content-Security-Policy", csp);

  if (needsCsrf) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false, // the client must echo it in the X-CSRF-Token header
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CSRF_TOKEN_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  // Skip internal (_next), api, assets, and files with extensions
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
