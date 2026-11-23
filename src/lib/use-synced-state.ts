"use client";

import { useState } from "react";

/**
 * Local state seeded from a server prop that resets whenever the prop
 * reference changes (e.g. after `router.refresh()`), so optimistic client
 * updates never drift from fresh server data. Uses the "adjust state during
 * render" pattern instead of an effect to avoid a stale intermediate render.
 */
export function useSyncedState<T>(prop: T) {
  const [state, setState] = useState(prop);
  const [prev, setPrev] = useState(prop);
  if (prev !== prop) {
    setPrev(prop);
    setState(prop);
  }
  return [prev !== prop ? prop : state, setState] as const;
}
