import type { KeyboardEvent } from "react";

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
  let next = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % items.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + items.length) % items.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = items.length - 1;
  if (next < 0) return;
  e.preventDefault();
  select(items[next]);
  const container = e.currentTarget;
  requestAnimationFrame(() => {
    container.querySelectorAll<HTMLElement>('[role="tab"],[role="radio"]')[next]?.focus();
  });
}
