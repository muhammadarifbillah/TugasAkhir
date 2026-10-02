import { test } from "vitest";
import assert from "node:assert/strict";

import { sseFrameStream } from "./sse";

async function run(chunks: Uint8Array[]): Promise<string> {
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const reader = rs.pipeThrough(sseFrameStream()).getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

const bytes = (s: string) => new TextEncoder().encode(s);

test("frames complete lines", async () => {
  assert.equal(await run([bytes("a\n"), bytes("b\n")]), "data: a\n\ndata: b\n\n");
});

test("buffers a line split across chunks", async () => {
  assert.equal(await run([bytes("hel"), bytes("lo\n")]), "data: hello\n\n");
});

test("drops empty lines and keeps content", async () => {
  assert.equal(await run([bytes("\n\nx\n")]), "data: x\n\n");
});

test("flushes a trailing line without a newline", async () => {
  assert.equal(await run([bytes("tail")]), "data: tail\n\n");
});

test("decodes a multi-byte character split across chunks", async () => {
  const full = bytes("caf\u00e9\n");
  assert.equal(await run([full.slice(0, 4), full.slice(4)]), "data: caf\u00e9\n\n");
});
