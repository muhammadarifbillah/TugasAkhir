/**
 * The generated app runs on its own origin and the studio preview embeds it in
 * an <iframe>. A strict framing policy — `frame-ancestors 'none'` (CSP) or
 * `X-Frame-Options: DENY` — makes the browser refuse to render the app, so the
 * preview would just be blank.
 *
 * We relax only the framing directives on the copy of the project written to the
 * sandbox workdir. The saved artifacts keep their secure defaults, so the
 * delivered source stays hardened while the local preview remains usable.
 */
const ALLOWED_ANCESTORS = "'self' http://localhost:* http://127.0.0.1:*";

export function relaxFramingForPreview(content: string): string {
  if (!content || (!content.includes("frame-ancestors") && !content.includes("X-Frame-Options"))) {
    return content;
  }

  let out = content;

  // CSP: 'none' and 'self' are the only single-token values that block a
  // cross-origin parent, so widen just those.
  out = out.replace(
    /frame-ancestors\s+(?:'none'|"none"|'self'|"self"|none|self)(?=['";,\s]|$)/gi,
    `frame-ancestors ${ALLOWED_ANCESTORS}`,
  );

  // X-Frame-Options: DENY/SAMEORIGIN both block cross-origin framing. Remove the
  // header in its common shapes (Next.js headers() object, plain object, pair)
  // plus imperative forms (res.setHeader(...), headers.set(...)).
  out = out.replace(
    /\{\s*key:\s*(['"])X-Frame-Options\1\s*,\s*value:\s*(['"])(?:DENY|SAMEORIGIN)\2\s*\},?\s*/gi,
    "",
  );
  out = out.replace(/(['"])X-Frame-Options\1\s*:\s*(['"])(?:DENY|SAMEORIGIN)\2\s*,?\s*/gi, "");
  out = out.replace(
    /\[\s*(['"])X-Frame-Options\1\s*,\s*(['"])(?:DENY|SAMEORIGIN)\2\s*\],?\s*/gi,
    "",
  );
  // Capture the whole receiver so removing the call cannot merge `response.headers`
  // with the next statement (which previously produced `response.headersresponse…`
  // and crashed the generated middleware). Replace with a valid no-op instead.
  out = out.replace(
    /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\.\s*(?:set|append|setHeader)\s*\(\s*(['"])X-Frame-Options\2\s*,\s*(['"])(?:DENY|SAMEORIGIN)\3\s*\)/gi,
    "void 0",
  );
  out = out.replace(
    /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\[\s*(['"])X-Frame-Options\2\s*\]\s*=\s*(['"])(?:DENY|SAMEORIGIN)\3/gi,
    "void 0",
  );

  return out;
}
