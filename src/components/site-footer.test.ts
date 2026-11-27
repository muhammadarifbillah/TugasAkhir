import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";

let pathname = "/en";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const { SiteFooter } = await import("./site-footer");
const render = () => renderToStaticMarkup(createElement(SiteFooter, { name: "FUSE", label: "FUSE footer" }));

describe("SiteFooter", () => {
  beforeEach(() => {
    pathname = "/en";
  });

  it("links to the example templates page in the current language", () => {
    for (const [lang, d] of [["en", en], ["id", id]] as const) {
      pathname = `/${lang}/dashboard`;
      const html = render();
      expect(html).toMatch(new RegExp(`<a[^>]*href="/${lang}/credits"[^>]*>${d.footer.credits}</a>`));
      expect(html).toContain("FUSE footer");
    }
    expect(en.footer.credits).toBe("Example templates");
    expect(id.footer.credits).toBe("Contoh template");
  });

  it("falls back to the default language for unknown paths and stays hidden in the studio", () => {
    pathname = "/zz/whatever";
    expect(render()).toContain('href="/en/credits"');
    pathname = "/id/studio/p1/design";
    expect(render()).toBe("");
  });
});
