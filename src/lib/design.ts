import { z } from "zod";

/**
 * AI-generated, high-fidelity UI mockup (a self-contained HTML document).
 * Produced by the Design Studio and rendered in a sandboxed iframe.
 */

export const designScreenSchema = z.object({
  id: z.string(),
  name: z.string().default("Screen"),
  device: z.enum(["desktop", "tablet", "mobile"]).default("desktop"),
  html: z.string().min(1),
  prompt: z.string().optional(),
  createdAt: z.string().optional(),
});

export const designScreensSchema = z.array(designScreenSchema);

export type DesignScreen = z.infer<typeof designScreenSchema>;

/** Safety caps so a runaway model cannot bloat the project's JSON. */
export const MAX_SCREEN_HTML = 200 * 1024;
export const MAX_SCREENS = 12;

/** True when an HTML document has visible content (text or media), not just an empty shell. */
export function hasVisibleContent(html: string): boolean {
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "");
  const text = visible
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 || /<(img|svg|canvas|video|picture)\b/i.test(visible);
}

/** Tolerant JSON parse from a model reply (direct, fenced, or first {...}/[...] region). */
function tryParseJson(text: string): unknown | null {
  const t = text.trim();
  const parse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };
  const direct = parse(t);
  if (direct) return direct;
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) {
    const parsed = parse(fence[1]);
    if (parsed) return parsed;
  }
  const objStart = t.indexOf("{");
  const objEnd = t.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    const parsed = parse(t.slice(objStart, objEnd + 1));
    if (parsed) return parsed;
  }
  const arrStart = t.indexOf("[");
  const arrEnd = t.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    const parsed = parse(t.slice(arrStart, arrEnd + 1));
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Parses one or many mockups from a design reply: a JSON `{ screens: [...] }`
 * or array of `{ name, html }`, falling back to raw `<html>…</html>` blocks.
 */
export function parseDesignScreens(text: string): { name?: string; html: string }[] {
  const json = tryParseJson(text);
  const arr = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as Record<string, unknown>).screens)
      ? ((json as Record<string, unknown>).screens as unknown[])
      : null;

  if (arr) {
    const out: { name?: string; html: string }[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const html = typeof s.html === "string" ? s.html.trim() : "";
      if (!html) continue;
      out.push({ name: typeof s.name === "string" ? s.name : undefined, html });
    }
    if (out.length > 0) return out;
  }

  const out: { name?: string; html: string }[] = [];
  const re = /<!doctype html[\s\S]*?<\/html>|<html[\s\S]*?<\/html>/gi;
  for (const match of text.matchAll(re)) out.push({ html: match[0].trim() });
  return out;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createScreen(input: {
  name?: string;
  device?: DesignScreen["device"];
  html: string;
  prompt?: string;
}): DesignScreen {
  return designScreenSchema.parse({
    id: uid("scr"),
    name: input.name ?? "Screen",
    device: input.device ?? "desktop",
    html: input.html,
    prompt: input.prompt,
    createdAt: new Date().toISOString(),
  });
}

/** Best-effort normalisation of stored/AI screens, dropping empty/oversized ones. */
export function normalizeScreens(input: unknown): DesignScreen[] {  const parsed = designScreensSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data
      .filter((s) => s.html.trim().length > 0 && s.html.length <= MAX_SCREEN_HTML)
      .slice(0, MAX_SCREENS);
  }
  if (!Array.isArray(input)) return [];

  const screens: DesignScreen[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    if (typeof s.html !== "string" || s.html.trim().length === 0) continue;
    if (s.html.length > MAX_SCREEN_HTML) continue;
    screens.push(
      designScreenSchema.parse({
        id: typeof s.id === "string" ? s.id : uid("scr"),
        name: typeof s.name === "string" ? s.name : "Screen",
        device: s.device === "tablet" || s.device === "mobile" ? s.device : "desktop",
        html: s.html,
        prompt: typeof s.prompt === "string" ? s.prompt : undefined,
        createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
      }),
    );
    if (screens.length >= MAX_SCREENS) break;
  }
  return screens;
}
