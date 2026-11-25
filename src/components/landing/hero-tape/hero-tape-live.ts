import type { LandingScene } from "../landing-scroll-init";
import { applyFrame, frameOf, type FrameNode } from "./figure/frame";
import { POSTER_POSE, poseOf } from "./model";

interface HeroNode extends FrameNode {
  getAttribute(n: string): string | null;
}

type Deps = Parameters<LandingScene>[0];

/** Pins the hero (stage + caption) and scrubs the poster SVG through poseOf; returns a cleanup that restores the poster. */
export function setupHeroTape(deps: Deps, root: { querySelector(s: string): unknown } = document): () => void {
  const pin = root.querySelector("[data-hero-pin]") as HeroNode | null;
  const stage = root.querySelector("[data-hero-stage]") as HeroNode | null;
  const caption = root.querySelector("[data-hero-step]") as HeroNode | null;
  if (!pin || !stage || !caption) return () => {};
  const steps = JSON.parse(caption.getAttribute("data-steps") ?? "[]") as string[];

  const show = (p: number) => {
    const pose = poseOf(p);
    applyFrame(stage, frameOf(pose));
    caption.textContent = steps[pose.step] ?? caption.textContent;
  };
  const mark = (s: string) => stage.setAttribute("data-pose", s);
  mark("idle");
  show(0);

  // Tween a proxy so scrub smooths the progress that poseOf reads.
  const state = { p: 0 };
  const tween = deps.gsap.to(state, {
    p: 1,
    ease: "none",
    onUpdate: () => show(state.p),
    scrollTrigger: {
      trigger: pin as unknown as Element,
      pin: true,
      scrub: 0.6,
      start: "center center",
      end: "+=1600",
      onEnter: () => mark("scrub"),
      onLeave: () => mark("done"),
      onEnterBack: () => mark("scrub"),
      onLeaveBack: () => mark("idle"),
    },
  });

  return () => {
    tween.kill();
    mark("poster");
    applyFrame(stage, frameOf(POSTER_POSE));
    caption.textContent = steps[POSTER_POSE.step] ?? caption.textContent;
  };
}

export const heroTapeScene: LandingScene = (deps) => setupHeroTape(deps);
