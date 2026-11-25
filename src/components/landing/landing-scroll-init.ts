import type { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

// deps are injected so this module never pulls gsap/lenis into the static bundle.
export function initLandingScroll(
  deps: { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger; Lenis: typeof Lenis },
  main: HTMLElement,
  content: HTMLElement,
): () => void {
  deps.gsap.registerPlugin(deps.ScrollTrigger);
  const lenis = new deps.Lenis({ wrapper: main, content, autoRaf: false, anchors: true });
  lenis.on("scroll", deps.ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  deps.gsap.ticker.add(tick);
  deps.gsap.ticker.lagSmoothing(0);
  deps.ScrollTrigger.defaults({ scroller: main });
  return () => {
    deps.gsap.ticker.remove(tick);
    deps.ScrollTrigger.getAll().forEach((t) => t.kill());
    lenis.destroy();
  };
}
