import { describe, expect, it, vi } from "vitest";
import { initLandingScroll } from "./landing-scroll-init";

const main = { id: "main" } as unknown as HTMLElement;
const content = { id: "main-content" } as unknown as HTMLElement;

function makeDeps() {
  class FakeLenis {
    static last: FakeLenis | undefined;
    options: unknown;
    on = vi.fn();
    raf = vi.fn();
    destroy = vi.fn();

    constructor(options: unknown) {
      this.options = options;
      FakeLenis.last = this;
    }
  }

  const t1 = { kill: vi.fn() };
  const t2 = { kill: vi.fn() };
  const gsap = {
    registerPlugin: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
  };
  const ScrollTrigger = {
    update: vi.fn(),
    defaults: vi.fn(),
    getAll: () => [t1, t2],
  };

  const deps = { gsap, ScrollTrigger, Lenis: FakeLenis } as unknown as Parameters<
    typeof initLandingScroll
  >[0];

  return { deps, FakeLenis, gsap, ScrollTrigger, t1, t2 };
}

describe("initLandingScroll", () => {
  it("creates Lenis on #main with #main-content, autoRaf false, anchors true", () => {
    const { deps, FakeLenis } = makeDeps();
    initLandingScroll(deps, main, content);
    expect(FakeLenis.last?.options).toEqual({
      wrapper: main,
      content,
      autoRaf: false,
      anchors: true,
    });
  });

  it("registers ScrollTrigger and sets scroller default to #main", () => {
    const { deps, gsap, ScrollTrigger } = makeDeps();
    initLandingScroll(deps, main, content);
    expect(gsap.registerPlugin).toHaveBeenCalledWith(ScrollTrigger);
    expect(ScrollTrigger.defaults).toHaveBeenCalledWith({ scroller: main });
  });

  it("syncs Lenis scroll to ScrollTrigger.update", () => {
    const { deps, FakeLenis, ScrollTrigger } = makeDeps();
    initLandingScroll(deps, main, content);
    expect(FakeLenis.last?.on).toHaveBeenCalledWith("scroll", ScrollTrigger.update);
  });

  it("drives Lenis from gsap.ticker in milliseconds with lagSmoothing(0)", () => {
    const { deps, FakeLenis, gsap } = makeDeps();
    initLandingScroll(deps, main, content);

    const tick = gsap.ticker.add.mock.calls[0][0] as (time: number) => void;
    expect(typeof tick).toBe("function");
    tick(1.5);

    expect(FakeLenis.last?.raf).toHaveBeenCalledWith(1500);
    expect(gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0);
  });

  it("cleanup removes the ticker callback, kills every trigger and destroys Lenis", () => {
    const { deps, FakeLenis, gsap, t1, t2 } = makeDeps();
    const cleanup = initLandingScroll(deps, main, content);
    cleanup();

    const tick = gsap.ticker.add.mock.calls[0][0];
    expect(gsap.ticker.remove).toHaveBeenCalledWith(tick);
    expect(t1.kill).toHaveBeenCalledTimes(1);
    expect(t2.kill).toHaveBeenCalledTimes(1);
    expect(FakeLenis.last?.destroy).toHaveBeenCalledTimes(1);
  });
});
