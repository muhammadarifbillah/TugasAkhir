import { STAGE_DEFINITIONS } from "@/lib/stages";

/**
 * Every number the landing page shows comes from here, so the marketing copy
 * cannot drift from the product. landing-facts.test.ts pins each value to the
 * code it describes.
 */
export const AI_PROVIDERS = ["OpenAI", "Anthropic", "Gemini", "DeepSeek", "OpenRouter", "Ollama"] as const;

export const LANDING_FACTS = {
  stages: STAGE_DEFINITIONS.length,
  nistTasks: 42, // unique NIST SSDF task codes seeded in prisma/seed.ts
  subSteps: STAGE_DEFINITIONS.reduce((sum, s) => sum + s.steps.length, 0),
  providers: AI_PROVIDERS.length,
  languages: 2,
} as const;
