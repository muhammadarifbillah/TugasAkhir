import { test } from "vitest";
import assert from "node:assert/strict";

import { interactiveDocument } from "./design-screen";

const NONCE = "abc123+/=";

test("interactiveDocument stamps the nonce on every inline script", () => {
  const doc = interactiveDocument(
    "<html><head><script>window.x = 1;</script></head><body><a href='/x'>x</a></body></html>",
    NONCE,
  );
  const scripts = doc.match(/<script[^>]*>/gi) ?? [];
  assert.equal(scripts.length, 2);
  for (const tag of scripts) assert.ok(tag.includes(`nonce="${NONCE}"`), tag);
  assert.ok(doc.includes('Content-Security-Policy'));
  assert.ok(doc.includes("fuse-mockup"));
});

test("interactiveDocument keeps existing nonces and external scripts", () => {
  const doc = interactiveDocument(
    '<html><head><script nonce="keep">a()</script><script src="x.js"></script></head></html>',
    NONCE,
  );
  assert.ok(doc.includes('<script nonce="keep">'));
  assert.ok(doc.includes('<script src="x.js">'));
  assert.equal(doc.match(/nonce="abc123\+\/="/g)?.length, 1);
});

test("interactiveDocument wraps fragments that have no html or head tag", () => {
  const doc = interactiveDocument("<a href='/y'>y</a>", NONCE);
  assert.ok(doc.startsWith("<!doctype html>"));
  assert.ok(doc.includes(`nonce="${NONCE}"`));
});
