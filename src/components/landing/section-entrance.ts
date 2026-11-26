import type { LandingScene } from "./landing-scroll-init";

/** Fades each section H2 in once. The carrier already gated this (desktop, fine pointer, motion allowed); without JS the heading is never hidden. */
export function entranceScene(deps: Parameters<LandingScene>[0], root: { querySelectorAll(s: string): ArrayLike<Element> } = document): () => void {
  const els = Array.from(root.querySelectorAll("[data-entrance]"));
  const tweens = els.map((el) =>
    deps.gsap.from(el, { opacity: 0, y: 16, duration: 0.4, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 80%", once: true } }),
  );
  return () => {
    tweens.forEach((t) => t.kill());
    els.forEach((el) => deps.gsap.set(el, { clearProps: "opacity,transform" }));
  };
}
