"use client";

import { ViewTransition } from "react";

const TYPES = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" };

/**
 * Wraps a page so route changes animate: typed navigations slide in their
 * direction, untyped ones crossfade. `default="none"` keeps updates such as
 * `router.refresh()` static.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={TYPES} exit={TYPES} default="none">
      {children}
    </ViewTransition>
  );
}
