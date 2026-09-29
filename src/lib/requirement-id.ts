/**
 * Stable display id for a security requirement by position, e.g. 0 → "REQ-SEC-001".
 * Kept dependency-free so it can be unit-tested and reused anywhere.
 */
export function requirementIdFor(index: number): string {
  return `REQ-SEC-${String(index + 1).padStart(3, "0")}`;
}
