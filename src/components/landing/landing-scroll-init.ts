import type { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

// A scene is the only way to add ScrollTriggers on the landing page; it reuses this Lenis, never a second one.
export type LandingScene = (deps: { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger }) => () => void;

// deps are injected so this module never pulls gsap/lenis into the static bundle.
export function initLandingScroll(
  deps: { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger; Lenis: typeof Lenis },
  main: HTMLElement,
  content: HTMLElement,
  scenes: readonly LandingScene[] = [],
): () => void {
  deps.gsap.registerPlugin(deps.ScrollTrigger);
  const lenis = new deps.Lenis({ wrapper: main, content, autoRaf: false, anchors: true });
  lenis.on("scroll", deps.ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  deps.gsap.ticker.add(tick);
  deps.gsap.ticker.lagSmoothing(0);
  // defaults() returns the same mutable object, so copy the old value before changing it.
  const previousScroller = deps.ScrollTrigger.defaults({})?.scroller;
  deps.ScrollTrigger.defaults({ scroller: main });
  const sceneCleanups = scenes.map((s) => s({ gsap: deps.gsap, ScrollTrigger: deps.ScrollTrigger }));
  return () => {
    [...sceneCleanups].reverse().forEach((c) => c());
    deps.gsap.ticker.remove(tick);
    deps.ScrollTrigger.getAll().forEach((t) => t.kill());
    deps.ScrollTrigger.defaults({ scroller: previousScroller });
    lenis.destroy();
  };
}
