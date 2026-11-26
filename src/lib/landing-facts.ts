import { STAGE_DEFINITIONS } from "@/lib/stages";
import { SCORE_WEIGHTS } from "@/lib/scanner/score";

/**
 * Every number and standard code the landing page shows comes from here, so
 * the copy cannot drift from the product. landing-facts.test.ts pins each value
 * to the code it describes (stages, seed, scanner, providers, locales).
 */
export const AI_PROVIDERS = ["OpenAI", "Anthropic", "Gemini", "DeepSeek", "OpenRouter", "Ollama", "OmniRoute"] as const;

export { SCORE_WEIGHTS };

export const LANDING_FACTS = {
  stages: STAGE_DEFINITIONS.length,
  nistTasks: 42, // unique NIST SSDF task codes seeded in prisma/seed.ts
  subSteps: STAGE_DEFINITIONS.reduce((sum, s) => sum + s.steps.length, 0),
  providers: AI_PROVIDERS.length,
  languages: 2,
} as const;

export type TemperColour = "straw" | "brown" | "purple" | "blue" | "grey";

/** Steel temper colours in physical order (Wikipedia "Tempering (metallurgy)", citing ASM). */
export const TEMPER: readonly { stage: 1 | 2 | 3 | 4 | 5; celsius: number; colour: TemperColour }[] = [
  { stage: 1, celsius: 205, colour: "straw" },
  { stage: 2, celsius: 260, colour: "brown" },
  { stage: 3, celsius: 282, colour: "purple" },
  { stage: 4, celsius: 310, colour: "blue" },
  { stage: 5, celsius: 371, colour: "grey" },
];

/**
 * Gate-level crosswalk shown on the landing page (rail, coupons, mapping
 * table): one SSDF task per gate with its ISO 27001 Annex A controls, taken
 * from the NIST → ISO crosswalk in prisma/seed.ts. Sub-step detail still comes
 * from STAGE_DEFINITIONS via gateFacts().
 */
export const GATE_MAPPING: readonly { nist: string; iso: string[] }[] = [
  { nist: "PO.1.1", iso: ["A.5.1", "A.5.8"] },
  { nist: "PW.1.1", iso: ["A.8.26", "A.8.27"] },
  { nist: "PW.5.1", iso: ["A.8.28"] },
  { nist: "PW.8.1", iso: ["A.8.29"] },
  { nist: "PS.3.1", iso: ["A.8.13", "A.8.10"] },
];

export interface GateFact {
  code: string;
  order: number;
  nist: string[];
  iso: string[];
  steps: { id: string; nist: string[]; iso: string[] }[];
}

const union = (lists: string[][]) => [...new Set(lists.flat())].sort();

/** The five gates with their sub-steps; a gate's codes are the union of its sub-steps' codes. */
export function gateFacts(): GateFact[] {
  return [...STAGE_DEFINITIONS]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s) => ({
      code: s.code,
      order: s.orderIndex,
      nist: union(s.steps.map((st) => st.nistTasks)),
      iso: union(s.steps.map((st) => st.isoControls)),
      steps: s.steps.map((st) => ({ id: st.id, nist: [...st.nistTasks], iso: [...st.isoControls] })),
    }));
}
