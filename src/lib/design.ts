import { z } from "zod";

/**
 * AI-generated, high-fidelity UI mockup (a self-contained HTML document).
 * Produced by the Design Studio and rendered in a sandboxed iframe.
 */

/** Safety caps so a runaway model cannot bloat the project's JSON. */
export const MAX_SCREEN_HTML = 200 * 1024;
export const MAX_SCREENS = 80;
export const MAX_ROLES = 80;
export const MAX_PAGES_PER_ROLE = 80;

export const designScreenSchema = z.object({
  id: z.string(),
  name: z.string().default("Screen"),
  device: z.enum(["desktop", "tablet", "mobile"]).default("desktop"),
  // Bounded on write so a screen can never be stored larger than the read-side
  // normalizeScreens() accepts (otherwise it would silently disappear on load).
  html: z.string().min(1).max(MAX_SCREEN_HTML),
  prompt: z.string().max(4000).optional(),
  createdAt: z.string().optional(),
  // Plan linkage: which role/halaman of the design plan this mockup implements.
  role: z.string().max(80).optional(),
  planKey: z.string().max(160).optional(),
  planVersion: z.number().optional(),
});

export const designScreensSchema = z.array(designScreenSchema);

export type DesignScreen = z.infer<typeof designScreenSchema>;

/** The structured design plan: roles, and the pages each role needs. */
export const designPlanPageSchema = z.object({
  id: z.string(),
  name: z.string().default("Page"),
  description: z.string().optional(),
  route: z.string().optional(),
});

export const designPlanRoleSchema = z.object({
  id: z.string(),
  name: z.string().default("Role"),
  description: z.string().optional(),
  pages: z.array(designPlanPageSchema).default([]),
});

export const designPlanSchema = z.object({
  version: z.number().default(1),
  updatedAt: z.string().optional(),
  roles: z.array(designPlanRoleSchema).default([]),
});

export type DesignPlan = z.infer<typeof designPlanSchema>;
export type DesignPlanRole = z.infer<typeof designPlanRoleSchema>;
export type DesignPlanPage = z.infer<typeof designPlanPageSchema>;

/** Stable key tying a screen to a planned page ("<roleId>.<pageId>"). */
export function planPageKey(roleId: string, pageId: string): string {
  return `${roleId}.${pageId}`;
}

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
  role?: string;
  planKey?: string;
  planVersion?: number;
}): DesignScreen {
  return designScreenSchema.parse({
    id: uid("scr"),
    name: input.name ?? "Screen",
    device: input.device ?? "desktop",
    html: input.html,
    prompt: input.prompt,
    role: input.role,
    planKey: input.planKey,
    planVersion: input.planVersion,
    createdAt: new Date().toISOString(),
  });
}

/** Best-effort normalisation of stored/AI screens, dropping empty/oversized ones. */
export function normalizeScreens(input: unknown): DesignScreen[] {
  const parsed = designScreensSchema.safeParse(input);
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
        role: typeof s.role === "string" ? s.role : undefined,
        planKey: typeof s.planKey === "string" ? s.planKey : undefined,
        planVersion: typeof s.planVersion === "number" ? s.planVersion : undefined,
        createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
      }),
    );
    if (screens.length >= MAX_SCREENS) break;
  }
  return screens;
}

/**
 * De-duplicates screens by id (later entries win) so a React list never renders
 * two children with the same key when the same screen exists in both saved and
 * draft state.
 */
export function uniqueScreensById(screens: DesignScreen[]): DesignScreen[] {
  const byId = new Map<string, DesignScreen>();
  for (const screen of screens) byId.set(screen.id, screen);
  return [...byId.values()];
}

/** Best-effort normalisation of a stored/AI design plan, capping roles and pages. */
export function normalizePlan(input: unknown): DesignPlan {
  const root = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rawRoles = Array.isArray(root.roles) ? root.roles : [];

  const roles: DesignPlanRole[] = [];
  for (const rawRole of rawRoles.slice(0, MAX_ROLES)) {
    if (!rawRole || typeof rawRole !== "object") continue;
    const r = rawRole as Record<string, unknown>;
    const name =
      typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 80) : "Role";

    const pagesRaw = Array.isArray(r.pages) ? r.pages : [];
    const pages: DesignPlanPage[] = [];
    for (const rawPage of pagesRaw.slice(0, MAX_PAGES_PER_ROLE)) {
      if (!rawPage || typeof rawPage !== "object") continue;
      const p = rawPage as Record<string, unknown>;
      pages.push({
        id: typeof p.id === "string" && p.id ? p.id : uid("pg"),
        name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 80) : "Page",
        description: typeof p.description === "string" ? p.description.slice(0, 400) : undefined,
        route: typeof p.route === "string" ? p.route.slice(0, 200) : undefined,
      });
    }

    roles.push({
      id: typeof r.id === "string" && r.id ? r.id : uid("role"),
      name,
      description: typeof r.description === "string" ? r.description.slice(0, 400) : undefined,
      pages,
    });
  }

  const version =
    typeof root.version === "number" && root.version > 0 ? Math.floor(root.version) : 1;
  return {
    version,
    updatedAt: typeof root.updatedAt === "string" ? root.updatedAt : undefined,
    roles,
  };
}

/**
 * The design plan the Studio should use: the structured `design.uiPlan` combined
 * with the user roles identified earlier in Analysis (`analysis.roles`). Roles
 * from Analysis that are not yet in the plan are added as page-less roles, so
 * the plan stays connected to Stage 1 even before Stage 2 emits a plan.
 */
export function effectiveDesignPlan(globalSpec: unknown): DesignPlan {
  const spec = (globalSpec && typeof globalSpec === "object" ? globalSpec : {}) as Record<
    string,
    unknown
  >;
  const design = (spec.design as Record<string, unknown> | null) ?? {};
  const plan = normalizePlan(design.uiPlan);

  const analysis = (spec.analysis as Record<string, unknown> | null) ?? {};
  const roleNames = Array.isArray(analysis.roles)
    ? (analysis.roles as unknown[]).filter(
        (r): r is string => typeof r === "string" && r.trim().length > 0,
      )
    : [];
  if (roleNames.length === 0) return plan;

  const existing = new Set(plan.roles.map((r) => r.name.trim().toLowerCase()));
  const extra: DesignPlanRole[] = [];
  for (const name of roleNames) {
    const key = name.trim().toLowerCase();
    if (existing.has(key)) continue;
    existing.add(key);
    extra.push({ id: uid("role"), name: name.trim().slice(0, 80), pages: [] });
  }
  if (extra.length === 0) return plan;
  return { ...plan, roles: [...plan.roles, ...extra].slice(0, MAX_ROLES) };
}
