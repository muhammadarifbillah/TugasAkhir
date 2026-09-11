import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * Notes on the allowances, so they can be tightened deliberately rather than by
 * accident:
 * - `script-src` must allow `cdn.jsdelivr.net`: `@monaco-editor/react` pulls the
 *   editor bundle from the jsdelivr copy of monaco-editor (see the `paths.vs`
 *   default in the @monaco-editor/loader config). Self-hosting Monaco is the way
 *   to remove this third-party origin.
 * - `'unsafe-inline'` for scripts/styles is required by the inline bootstrap
 *   payload Next.js emits and by Mermaid's injected SVG styles. Moving to a
 *   nonce-based policy (proxy.ts can mint the nonce) is the follow-up.
 * - `worker-src blob:` is required by Monaco's web workers.
 * - `frame-ancestors 'none'` duplicates X-Frame-Options for modern browsers.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' https:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // `npm run typecheck` (tsc --noEmit) is the authoritative type gate and runs
  // before builds; Next's in-build worker duplicates it.
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
