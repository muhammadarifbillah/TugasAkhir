import { test } from "vitest";
import assert from "node:assert/strict";

import { relaxFramingForPreview } from "./framing";

test("widens a blocking frame-ancestors CSP directive", () => {
  const out = relaxFramingForPreview(
    `const csp = "default-src 'self'; frame-ancestors 'none'; base-uri 'self'";`,
  );
  assert.match(out, /frame-ancestors 'self' http:\/\/localhost:\*/);
  assert.ok(!out.includes("frame-ancestors 'none'"));
  // Unrelated directives are untouched.
  assert.match(out, /default-src 'self'/);
  assert.match(out, /base-uri 'self'/);
});

test("handles double-quoted and bare frame-ancestors values", () => {
  assert.ok(!relaxFramingForPreview(`"frame-ancestors \"none\""`).includes("none"));
  assert.match(relaxFramingForPreview("frame-ancestors self"), /localhost/);
  assert.match(relaxFramingForPreview('frame-ancestors "self"'), /localhost/);
});

test("removes X-Frame-Options DENY in Next.js headers() shape", () => {
  const src = [
    "const securityHeaders = [",
    "  { key: 'X-Content-Type-Options', value: 'nosniff' },",
    "  { key: 'X-Frame-Options', value: 'DENY' },",
    "  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },",
    "];",
  ].join("\n");
  const out = relaxFramingForPreview(src);
  assert.ok(!out.includes("X-Frame-Options"));
  assert.match(out, /X-Content-Type-Options/);
  assert.match(out, /Referrer-Policy/);
});

test("removes X-Frame-Options in object and array shapes", () => {
  const obj = relaxFramingForPreview(`headers: { "X-Frame-Options": "SAMEORIGIN", "X-Frame-Options": "DENY" }`);
  assert.ok(!obj.includes("X-Frame-Options"));
  const arr = relaxFramingForPreview(`headers.push(['X-Frame-Options', 'DENY']);`);
  assert.ok(!arr.includes("X-Frame-Options"));
});

test("removes X-Frame-Options set via header setters and assignment", () => {
  const set = relaxFramingForPreview(`response.headers.set('X-Frame-Options', 'DENY');`);
  assert.ok(!set.includes("X-Frame-Options"));
  const setHeader = relaxFramingForPreview(`res.setHeader("X-Frame-Options", "SAMEORIGIN");`);
  assert.ok(!setHeader.includes("X-Frame-Options"));
  const assign = relaxFramingForPreview(`headers["X-Frame-Options"] = "DENY";`);
  assert.ok(!assign.includes("X-Frame-Options"));
  // A setter for a different header is left alone.
  const other = relaxFramingForPreview(`res.setHeader('X-Content-Type-Options', 'nosniff');`);
  assert.match(other, /X-Content-Type-Options/);
});

test("is a no-op when no framing directives are present", () => {
  const src = `export default function Page() { return <h1>Hello</h1>; }`;
  assert.equal(relaxFramingForPreview(src), src);
});

test("removes imperative X-Frame-Options without merging the next statement", () => {
  const src = [
    "response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');",
    "response.headers.set('X-Frame-Options', 'DENY');",
    "response.headers.set('Permissions-Policy', 'camera=()');",
  ].join("\n");
  const out = relaxFramingForPreview(src);
  assert.ok(!out.includes("X-Frame-Options"));
  assert.ok(!/headersresponse/.test(out));
  assert.match(out, /response\.headers\.set\('Referrer-Policy'/);
  assert.match(out, /response\.headers\.set\('Permissions-Policy'/);
  assert.match(out, /void 0;/);
});
