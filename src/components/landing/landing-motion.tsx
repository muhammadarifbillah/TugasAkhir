"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";
import { shouldLoadLandingMotion } from "./motion";
import { initLandingScroll } from "./landing-scroll-init";

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
 * time; CSS-only motion is switched off in globals.css.
 */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const desktop = useDesktopMotion();

  // shortcut: the gate is read once at mount; resizing across 1024px neither loads nor unloads. Add a listener when M2 needs it.
  useEffect(() => {
    if (!shouldLoadLandingMotion(window.matchMedia.bind(window))) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis"), import("./hero-tape/hero-tape-live")])
      .then(([g, st, l, hero]) => {
        const main = document.getElementById("main");
        const content = document.getElementById("main-content");
        if (cancelled || !main || !content) return;
        cleanup = initLandingScroll(
          { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger, Lenis: l.default },
          main,
          content,
          [hero.heroTapeScene],
        );
      })
      // A chunk that fails to load leaves the poster in place and native scrolling working.
      .catch(() => {});
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return <MotionConfig skipAnimations={!desktop}>{children}</MotionConfig>;
}
