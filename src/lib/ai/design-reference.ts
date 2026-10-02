/** Max characters of the approved mockups injected into the Development prompt. */
export const MAX_DESIGN_REFERENCE_CHARS = 40000;

/**
 * Reference to the designs the user kept in the Design Studio, injected into the
 * Development stage so the generated code matches every approved mockup. All kept
 * screens are included until the character budget is exhausted.
 */
export function approvedDesignReference(globalSpec: unknown): string | null {
  const design =
    ((globalSpec as Record<string, unknown> | null)?.design as Record<string, unknown> | null) ?? {};
  const screens = Array.isArray(design.designScreens) ? design.designScreens : [];

  const valid = screens.filter(
    (s): s is Record<string, unknown> =>
      Boolean(s) && typeof s === "object" && typeof (s as Record<string, unknown>).html === "string",
  );
  if (valid.length === 0) return null;

  const parts: string[] = [
    "Approved UI design(s) from the Design Studio — reproduce these layouts and visual styles in the generated code:",
  ];
  let used = parts[0].length;
  for (const screen of valid) {
    const name = typeof screen.name === "string" ? screen.name : "Approved screen";
    const html = String(screen.html);
    const block = `\n\n### "${name}"\n${html}`;
    // Prefer whole screens; only fall back to a clearly-marked truncation when
    // even the last available screen cannot fit in full.
    if (used + block.length <= MAX_DESIGN_REFERENCE_CHARS) {
      parts.push(block);
      used += block.length;
      continue;
    }
    const remaining = MAX_DESIGN_REFERENCE_CHARS - used;
    if (remaining > 200) {
      const marker = "\n<!-- truncated: remaining design omitted for context budget -->";
      parts.push(
        `\n\n### "${name}"\n${html.slice(0, Math.max(0, remaining - marker.length))}${marker}`,
      );
      used = MAX_DESIGN_REFERENCE_CHARS;
    }
    break;
  }
  return parts.join("");
}
