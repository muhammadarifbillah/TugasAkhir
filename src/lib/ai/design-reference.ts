/** Max characters of the approved mockup injected into the Development prompt. */
export const MAX_DESIGN_REFERENCE_CHARS = 12000;

/**
 * Reference to the design the user kept in the Design Studio, injected into the
 * Development stage so the generated code matches the approved mockup.
 */
export function approvedDesignReference(globalSpec: unknown): string | null {
  const design =
    ((globalSpec as Record<string, unknown> | null)?.design as Record<string, unknown> | null) ?? {};
  const screens = Array.isArray(design.designScreens) ? design.designScreens : [];
  const screen = screens.find(
    (s) => s && typeof s === "object" && typeof (s as Record<string, unknown>).html === "string",
  ) as Record<string, unknown> | undefined;
  if (!screen) return null;
  const html = String(screen.html).slice(0, MAX_DESIGN_REFERENCE_CHARS);
  const name = typeof screen.name === "string" ? screen.name : "Approved screen";
  return `Approved UI design "${name}" — reproduce this layout and visual style in the generated code:\n${html}`;
}
