/**
 * Deterministic guidance appended to a stage-result assistant message so the
 * user is pointed at the sub-steps (eye icon) where each result can be reviewed.
 * Kept dependency-free so it can be unit-tested.
 */

/** Localised "check the sub-steps" guidance for the given output language. */
export function stageGuidance(outputLanguage: string): string {
  const isIndonesian = (outputLanguage || "en").toLowerCase().startsWith("id");
  return isIndonesian
    ? "📌 Hasil di atas sudah tersimpan. Anda dapat memeriksa tiap bagian pada masing-masing sub-step di panel kiri — klik ikon mata (👁) pada sub-step yang bertanda untuk membuka hasilnya."
    : "📌 The results above are saved. Review each part in the sub-steps on the left panel — click the eye icon (👁) on a flagged sub-step to open its result.";
}

/**
 * Inserts `guidance` before the structured `stage_result` block (so it survives
 * the JSON-stripping in the chat view) and is idempotent. Falls back to
 * appending at the end when there is no JSON block.
 */
export function withGuidance(content: string, guidance: string): string {
  if (!guidance || content.includes(guidance)) return content;

  const fence = content.indexOf("```json");
  const brace = content.indexOf("\n{");
  const bareStart = content.trimStart().startsWith("{") ? content.indexOf("{") : -1;
  const candidates = [fence, brace >= 0 ? brace + 1 : -1, bareStart].filter((i) => i >= 0);
  const idx = candidates.length > 0 ? Math.min(...candidates) : -1;

  if (idx < 0) return `${content.trimEnd()}\n\n${guidance}`;
  return `${content.slice(0, idx).trimEnd()}\n\n${guidance}\n${content.slice(idx)}`;
}
