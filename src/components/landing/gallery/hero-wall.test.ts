import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import { GalleryProvider } from "./gallery-provider";
import { HeroWall } from "./hero-wall";

type Json = Record<string, unknown>;
type ProviderProps = Parameters<typeof GalleryProvider>[0];

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const SRC = "src/components/landing/gallery/hero-wall.tsx";
const id = JSON.parse(read("src/dictionaries/id.json")) as { landing: Json; categories: Json; app: { name: string } };
const en = JSON.parse(read("src/dictionaries/en.json")) as { landing: Json };
const copy = id.landing.gallery as ProviderProps["copy"];
const labels = id.categories as unknown as ProviderProps["labels"];
const names = id.categories.items as Record<string, { name: string }>;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

const html = () =>
  renderToStaticMarkup(
    createElement(GalleryProvider, { lang: "id", appName: id.app.name, labels, copy } as ProviderProps, createElement(HeroWall)),
  );

/** Every <li> of the track; li never nest, so a lazy match is one item. */
const items = () => [...html().matchAll(/<li[^>]*>[\s\S]*?<\/li>/g)].map((m) => m[0]);
const openTag = (s: string) => s.slice(0, s.indexOf(">") + 1);
/** The real (focusable) set: the marquee clone is aria-hidden and inert. */
const real = () => items().filter((s) => !openTag(s).includes("inert"));
const clones = () => items().filter((s) => openTag(s).includes("inert"));
const buttonOf = (s: string) => s.match(/<button[^>]*data-gallery-panel[\s\S]*?<\/button>/)![0];
const reflectionOf = (s: string) => s.slice(s.lastIndexOf("<", s.indexOf("data-panel-reflection")));
const imgs = (s: string) => [...s.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
const srcOf = (tag: string) => decodeURIComponent(tag.match(/ src="([^"]*)"/)![1].replace(/&amp;/g, "&"));
const cls = (tag: string) => (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
const page = (i: number) => SITE_TEMPLATES[SITE_CATEGORIES[i].id][0].pages[0].src;

describe("hero wall (r28: wide media cards in a running row, download.jpeg)", () => {
  // 6A-1
  it("each card is a landscape 16/10 screenshot of the category's first template page, no browser bar", () => {
    const r = real();
    expect(r).toHaveLength(8);
    r.forEach((s, i) => {
      const b = buttonOf(s);
      const card = b.match(/<span[^>]*data-hero-card[^>]*>/)?.[0];
      expect(card, `${i} card`).toBeTruthy();
      for (const c of ["aspect-[16/10]", "w-[clamp(17rem,26vw,30rem)]", "overflow-hidden", "rounded-[10px]"]) expect(cls(card!), `${i} ${c}`).toContain(c);
      const [img] = imgs(b);
      expect(srcOf(img)).toContain(page(i));
      expect(img).toContain('alt=""');
      expect(img).toContain('draggable="false"');
      expect(img).toContain('sizes="(min-width:1024px) 30vw, 80vw"');
      expect(cls(img)).toEqual(expect.arrayContaining(["object-cover", "object-top"]));
    });
    const out = html();
    for (const s of ["data-browser-bar", "data-browser-dot", ".fuse.dev"]) expect(out, s).not.toContain(s);
  });

  // 6A-2
  it("an overlay inside the card holds an icon badge, the category name and a meta line", () => {
    real().forEach((s, i) => {
      const b = buttonOf(s);
      const c = SITE_CATEGORIES[i].id;
      const badge = b.indexOf("data-card-badge");
      const title = b.match(/<[a-z]+[^>]*data-card-title[^>]*>([^<]*)</);
      const meta = b.match(/<[a-z]+[^>]*data-card-meta[^>]*>([^<]*)</);
      expect(badge, `${i} badge`).toBeGreaterThan(-1);
      expect(b.slice(badge)).toContain("<svg");
      expect(title?.[1]).toBe(escape(names[c].name));
      expect(meta?.[1]).toBe(escape(fmt(copy.heroMeta, { n: SITE_TEMPLATES[c].length, license: SITE_TEMPLATES[c][0].license })));
      expect(cls(title![0])).toContain("line-clamp-2");
      expect(cls(meta![0])).toContain("truncate");
      // The overlay sits inside the card, after the screenshot.
      expect(badge).toBeGreaterThan(b.indexOf("<img"));
      expect(b.indexOf("data-hero-card")).toBeLessThan(b.indexOf("<img"));
    });
    expect(fmt(copy.heroMeta, { n: 3, license: "MIT" })).toBe("3 template · MIT");
  });

  // 6A-3
  it("the row runs on its own: a doubled track with an inert clone, a pause toggle and reduced-motion off", () => {
    const out = html();
    const track = out.match(/<ul[^>]*data-hero-track[^>]*>/)?.[0];
    expect(track).toBeTruthy();
    const t = cls(track!);
    for (const c of ["flex", "w-max", "gap-5", "motion-reduce:animate-none", "hover:[animation-play-state:paused]", "focus-within:[animation-play-state:paused]"])
      expect(t, c).toContain(c);
    expect(t.some((c) => /animate-\[fuse-marquee_\d+s_linear_infinite\]$/.test(c) && c.includes("lg:pointer-fine:motion-safe:"))).toBe(true);
    expect(clones()).toHaveLength(8);
    for (const s of clones()) {
      expect(openTag(s)).toContain('aria-hidden="true"');
      for (const img of imgs(s)) expect(img).toContain('loading="lazy"');
    }
    const css = read("src/components/landing/hero/hero.css");
    const kf = css.slice(css.indexOf("@keyframes fuse-marquee"));
    expect(kf).toMatch(/translate3d\(0,\s*0,\s*0\)[\s\S]*translate3d\(-50%,\s*0,\s*0\)/);
    const src = read(SRC);
    for (const s of ["data-hero-pause", "aria-pressed={paused}", "useAmbientMotion", "copy.heroPause", "copy.heroPlay", "[animation-play-state:paused]", "motion-reduce:overflow-x-auto", "snap-x", "snap-mandatory", "min-h-11", "min-w-11"])
      expect(src, s).toContain(s);
    for (const s of ["setInterval", "setTimeout", "requestAnimationFrame", "backdrop"]) expect(src, s).not.toContain(s);
    // The pause pill only exists where the row moves; the server snapshot renders none.
    expect(out).not.toContain("data-hero-pause");
  });

  // 6A-4
  it("the 3D wall and its pointer parallax are gone", () => {
    const src = read(SRC);
    for (const s of ["wallPose", "pointerTilt", "--tilt", "perspective", "data-browser-bar"]) expect(src, s).not.toContain(s);
    const logic = read("src/components/landing/gallery/gallery-logic.ts");
    for (const s of ["export function wallPose", "export function pointerTilt"]) expect(logic, s).not.toContain(s);
  });

  // 6A-5
  it("panels stay buttons that open the viewer, in category order, with a rippled reflection and at most three eager images", () => {
    const r = real();
    r.forEach((s, i) => {
      const tag = openTag(buttonOf(s));
      const name = names[SITE_CATEGORIES[i].id].name;
      expect(tag).toContain('type="button"');
      expect(tag).toContain(`aria-label="${escape(fmt(copy.openPanel, { category: name }))}"`);
      const refl = reflectionOf(s);
      const rt = openTag(refl);
      for (const c of ['aria-hidden="true"', "url(#hero-ripple)", "opacity-35", "mask-image"]) expect(rt, c).toContain(c);
      expect(refl).toContain("-scale-y-100");
      const [img] = imgs(refl);
      expect(srcOf(img)).toContain(page(i));
      expect(img).toContain('loading="lazy"');
    });
    const out = html();
    expect(out).toContain(`aria-label="${escape(copy.wallLabel)}"`);
    expect(out).toContain(`>${escape(copy.heroRecent)}<`);
    const all = items().flatMap((s) => imgs(s));
    const eager = all.filter((t) => !t.includes('loading="lazy"'));
    expect(eager.length).toBeGreaterThanOrEqual(1);
    expect(eager.length).toBeLessThanOrEqual(3);
    eager.forEach((t, i) => expect(t).toBe(imgs(buttonOf(r[i]))[0]));
    const src = read(SRC);
    expect(src).toContain("open(c.id, e.currentTarget)");
    expect(src).toContain("fmt(copy.openPanel");
  });

  // 6A-6
  it("both dictionaries carry the new hero copy", () => {
    for (const d of [id, en]) {
      const g = d.landing.gallery as Record<string, string>;
      for (const k of ["heroRecent", "heroPause", "heroPlay", "heroMeta"]) expect(g[k], k).toBeTruthy();
      expect(g.heroMeta).toContain("{n}");
      expect(g.heroMeta).toContain("{license}");
    }
    expect((id.landing.gallery as Record<string, string>).heroMeta).toBe("{n} template · {license}");
  });

  it("the scene files stay gone", () => {
    const src = read(SRC);
    for (const s of ["HeroScene", "SiteArt", "hero-scene", "moods"]) expect(src, s).not.toContain(s);
    for (const f of ["hero-scene.tsx", "moods.ts", "hero-scene.test.ts"])
      expect(existsSync(join(ROOT, "src/components/landing/hero", f)), f).toBe(false);
  });

  it("the carousel centre grows with a scroll-driven animation only when motion is allowed", () => {
    const css = read("src/app/globals.css");
    for (const s of ["@keyframes gallery-focus", "animation-timeline: view(inline)", "@supports (animation-timeline: view())", "prefers-reduced-motion: no-preference"])
      expect(css).toContain(s);
    expect(read(SRC)).toContain("gallery-carousel-item");
  });

  it("GalleryProvider re-enables interaction motion and throws outside", () => {
    const src = read("src/components/landing/gallery/gallery-provider.tsx");
    expect(src).toContain("skipAnimations={false}");
    expect(src).toContain("CategoryViewer");
    expect(() => renderToStaticMarkup(createElement(HeroWall))).toThrow();
  });

  // Owner decision 2026-11-27: the hero is HeroSection (which renders HeroWall) with one button, no shelf link.
  it("page.tsx renders the gallery hero and no longer the tape", () => {
    const pageSrc = read("src/app/[lang]/page.tsx");
    expect(pageSrc).not.toContain("HeroTape");
    for (const s of ["<GalleryProvider", "<HeroSection", "headline={l.gallery.headline}", "sub={l.gallery.sub}", "ctaHref={cta.href}", "ctaLabel={l[cta.label]}"])
      expect(pageSrc).toContain(s);
    expect(pageSrc).not.toContain('href="#rak"');
    expect(pageSrc.indexOf("<HeroSection")).toBeGreaterThan(pageSrc.indexOf("<GalleryProvider"));
    expect(pageSrc.indexOf("<HeroSection")).toBeLessThan(pageSrc.indexOf("</GalleryProvider>"));
    expect(pageSrc.match(/href=\{cta\.href\}/g) ?? []).toHaveLength(1);
  });
});
