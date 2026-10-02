/**
 * Builds the `{{PROJECT_CONTEXT}}` payload from the project's accumulated spec.
 *
 * Two blobs already reach the model through dedicated prompt slots and must not
 * be repeated here:
 * - `codeArtifacts` is injected via `{{LATEST_CODE}}` (summarised separately),
 * - `design.designScreens` is injected via the approved-design reference.
 *
 * Leaving them in would duplicate large HTML/code strings and truncate the rest
 * of the context mid-document, reducing fidelity for every other field.
 */
export function projectContext(globalSpec: unknown): unknown {
  if (!globalSpec || typeof globalSpec !== "object" || Array.isArray(globalSpec)) {
    return globalSpec ?? null;
  }
  const spec = { ...(globalSpec as Record<string, unknown>) };
  delete spec.codeArtifacts;
  if (spec.design && typeof spec.design === "object" && !Array.isArray(spec.design)) {
    const design = { ...(spec.design as Record<string, unknown>) };
    delete design.designScreens;
    spec.design = design;
  }
  return spec;
}
