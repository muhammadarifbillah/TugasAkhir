"use client";

import { useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";

/** Landing animations are a desktop feature; below this width the page is static. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

export const isDesktop = () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches;

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** Live desktop flag. The server snapshot is "desktop" so SSR markup never differs. */
export function useDesktopMotion() {
  return useSyncExternalStore(subscribe, isDesktop, () => true);
}

/**
 * Skips every Motion animation on the landing page below 1024px (values jump
 * to their final state). Effects that start timers check `isDesktop()` at run
 * time; CSS-only motion, including the H2 heading entrance, lives in globals.css.
 */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const desktop = useDesktopMotion();
  return <MotionConfig skipAnimations={!desktop}>{children}</MotionConfig>;
}
