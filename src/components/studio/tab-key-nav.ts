import type { KeyboardEvent } from "react";

/**
 * Next roving index for a horizontal/vertical group, or -1 when the key is not
 * a navigation key (or the group is empty).
 */
export function rovingIndex(key: string, current: number, length: number): number {
  if (length <= 0) return -1;
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % length;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return -1;
}

/**
 * Roving-focus keyboard handler for a `role="tablist"` / `role="radiogroup"`
 * container: Arrow keys move (wrapping), Home/End jump. Attach to the container.
 */
export function tabKeyNav<T extends string>(
  e: KeyboardEvent<HTMLElement>,
  items: readonly T[],
  current: T,
  select: (value: T) => void,
) {
  const i = items.indexOf(current);
  const next = rovingIndex(e.key, i, items.length);
  if (next < 0) return;
  e.preventDefault();
  select(items[next]);
  const container = e.currentTarget;
  requestAnimationFrame(() => {
    container.querySelectorAll<HTMLElement>('[role="tab"],[role="radio"]')[next]?.focus();
  });
}

/**
 * Arrow/Home/End focus movement inside a `role="menu"` container. Attach to
 * the menu element; Left/Right are left alone for menus.
 */
export function menuKeyNav(e: KeyboardEvent<HTMLElement>): void {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
  );
  let current = items.indexOf(document.activeElement as HTMLElement);
  if (current < 0 && e.key === "ArrowUp") current = 0;
  const next = rovingIndex(e.key, current, items.length);
  if (next < 0) return;
  e.preventDefault();
  items[next].focus();
}
