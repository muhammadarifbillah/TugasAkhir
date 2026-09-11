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

  const existingCsrf = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const needsCsrf = !existingCsrf;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // Fast path: already localised and the CSRF cookie is present.
  if (pathnameHasLocale && !needsCsrf) return NextResponse.next();

  let response: NextResponse;

  if (pathnameHasLocale) {
    response = NextResponse.next();
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
