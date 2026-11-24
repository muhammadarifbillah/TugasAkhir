import { z } from "zod";

export const chatPromptSchema = z.object({
  projectId: z.string().optional(),
  projectStageId: z.string().min(1, "projectStageId is required"),
  // Length and blank checks only: the prompt value itself is sent as typed.
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(8000, "Prompt too long")
    .refine((value) => value.trim().length > 0, "Prompt is required"),
});

export const createKeySchema = z.object({
  providerCode: z.string().min(1, "providerCode and apiKey are required"),
  apiKey: z.string().min(1, "providerCode and apiKey are required"),
  label: z.string().optional(),
});

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required (max 120 chars)")
    .max(120, "Project name is required (max 120 chars)"),
  description: z.string().optional(),
  template: z.string().optional(),
  scopeRequirements: z.string().optional(),
  uiPreferences: z.string().optional(),
  outputLanguage: z.string().optional(),
});

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON" }, { status: 400 }) };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
