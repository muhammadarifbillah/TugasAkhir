import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { CategoryIcon } from "./category-icon";

describe("CategoryIcon", () => {
  it("CategoryIcon renders an aria-hidden svg for all eight categories", () => {
    for (const c of SITE_CATEGORIES) {
      const html = renderToStaticMarkup(createElement(CategoryIcon, { id: c.id }));
      expect(html.startsWith("<svg"), c.id).toBe(true);
      expect(html).toContain('aria-hidden="true"');
    }
  });
});
