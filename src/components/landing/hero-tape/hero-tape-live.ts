import type { LandingScene } from "../landing-scroll-init";
import { frameFromCore, writeFrame, type FrameNode, type Timeline } from "./figure/frame-dom";
import { poseCore } from "./pose";

interface HeroNode extends FrameNode {
  getAttribute(n: string): string | null;
}

type Deps = Parameters<LandingScene>[0];

/** Pins the hero (stage + caption) and scrubs the poster SVG through poseCore and the SSR timeline; returns a cleanup that restores the poster. */
export function setupHeroTape(deps: Deps, root: { querySelector(s: string): unknown } = document): () => void {
  const pin = root.querySelector("[data-hero-pin]") as HeroNode | null;
  const stage = root.querySelector("[data-hero-stage]") as HeroNode | null;
  const caption = root.querySelector("[data-hero-step]") as HeroNode | null;
  if (!pin || !stage || !caption) return () => {};
  const timeline = JSON.parse(stage.getAttribute("data-timeline") ?? "null") as Timeline | null;
  if (!timeline) return () => {};
  const steps = JSON.parse(caption.getAttribute("data-steps") ?? "[]") as string[];

  const show = (p: number) => {
    const core = poseCore(p);
    writeFrame(stage, frameFromCore(core, timeline), timeline.shoe);
    caption.textContent = steps[core.step] ?? caption.textContent;
  };
  const mark = (s: string) => stage.setAttribute("data-pose", s);
  mark("idle");
  show(0);

  // Tween a proxy so scrub smooths the progress that poseCore reads.
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
    // Same as the server POSTER_POSE: 50% with the stamp shown.
    const poster = { ...poseCore(0.5), stamp: true };
    writeFrame(stage, frameFromCore(poster, timeline), timeline.shoe);
    caption.textContent = steps[poster.step] ?? caption.textContent;
  };
}

export const heroTapeScene: LandingScene = (deps) => setupHeroTape(deps);
