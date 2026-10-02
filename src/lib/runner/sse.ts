/**
 * Frames a byte stream as Server-Sent Events (`data: <line>\n\n`), buffering
 * partial lines across chunk boundaries and decoding multi-byte characters
 * correctly. Used to stream `docker logs -f` to the run terminal.
 */
export function sseFrameStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let carry = "";

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      carry += decoder.decode(chunk, { stream: true });
      const lines = carry.split(/\r?\n/);
      // The final element is an incomplete line (or "" when the chunk ended on
      // a newline); keep it for the next chunk.
      carry = lines.pop() ?? "";
      for (const line of lines) {
        if (line.length > 0) controller.enqueue(encoder.encode(`data: ${line}\n\n`));
      }
    },
    flush(controller) {
      carry += decoder.decode();
      if (carry.length > 0) controller.enqueue(encoder.encode(`data: ${carry}\n\n`));
    },
  });
}
