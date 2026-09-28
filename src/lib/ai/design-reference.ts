/** Max characters of the approved mockups injected into the Development prompt. */
export const MAX_DESIGN_REFERENCE_CHARS = 12000;

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
    const remaining = MAX_DESIGN_REFERENCE_CHARS - used;
    if (remaining <= 0) break;
    const name = typeof screen.name === "string" ? screen.name : "Approved screen";
    const html = String(screen.html).slice(0, remaining);
    const block = `\n\n### "${name}"\n${html}`;
    parts.push(block);
    used += block.length;
  }
  return parts.join("");
}
