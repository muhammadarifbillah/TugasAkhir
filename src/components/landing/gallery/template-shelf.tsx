"use client";

import { useId, useState } from "react";
import { CategoryIcon } from "@/components/site-art/category-icon";
import { SiteArt } from "@/components/site-art/site-art";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { SITE_CATEGORIES, type SiteCategory } from "@/lib/site-categories";
import { groupByShelf, searchCategories } from "./gallery-logic";
import { useGallery } from "./gallery-provider";

type Copy = Dictionary["landing"]["shelf"];

const TAB =
  "min-h-11 rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background";
const ROW = "flex snap-x gap-4 overflow-x-auto px-1 pb-2 pt-4 lg:flex-wrap lg:overflow-visible";

/** Template shelf: covers grouped per shelf (or all in a grid), filtered client-side; each cover opens the viewer. */
export function TemplateShelf({ copy }: { copy: Copy }) {
  const gallery = useGallery();
  const [view, setView] = useState<"shelves" | "all">("shelves");
  const [query, setQuery] = useState("");
  const searchId = useId();
  const results = searchCategories(SITE_CATEGORIES, query, gallery.labels);

  const cover = (c: SiteCategory, wide = false) => {
    const name = (gallery.labels.items[c.id] as { name: string }).name;
    return (
      <li key={c.id} className={wide ? "" : "w-40 shrink-0 snap-start sm:w-44"}>
        <button
          type="button"
          data-shelf-cover=""
          aria-label={fmt(gallery.copy.openPanel, { category: name })}
          onClick={(e) => gallery.open(c.id, e.currentTarget)}
          className="clay-card flex aspect-[3/4] w-full flex-col gap-2 rounded-[1.25rem] p-3 text-left transition-transform duration-300 hover:-translate-y-2 hover:-rotate-2 focus-visible:-translate-y-2 focus-visible:-rotate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0 motion-reduce:focus-visible:translate-y-0 motion-reduce:focus-visible:rotate-0"
        >
          <CategoryIcon id={c.id} className="size-6 text-[var(--fuse-accent-text)]" />
          <span className="font-narrow text-sm uppercase tracking-wider text-foreground">{name}</span>
          <span className="mt-auto block overflow-hidden rounded-xl border border-border">
            <SiteArt category={c} pageIndex={0} labels={gallery.labels} className="block h-auto w-full" />
          </span>
          <span className="text-xs text-muted-foreground">{copy.pagesCount}</span>
        </button>
      </li>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label={copy.tabsLabel} className="flex gap-1 rounded-full border border-border p-1">
          <button type="button" aria-pressed={view === "shelves"} onClick={() => setView("shelves")} className={TAB}>
            {copy.tabShelves}
          </button>
          <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")} className={TAB}>
            {copy.tabAll}
          </button>
        </div>
        <label htmlFor={searchId} className="sr-only">
          {copy.searchLabel}
        </label>
        <input
          type="search"
          id={searchId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-transparent px-5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {fmt(copy.count, { n: results.length })}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">{fmt(copy.empty, { q: query.trim() })}</p>
      ) : view === "shelves" ? (
        groupByShelf(results).map((g) => (
          <section key={g.shelf} className="mt-10">
            <h3 className="font-wide text-lg">{gallery.labels.shelves[g.shelf]}</h3>
            <ul className={ROW}>{g.items.map((c) => cover(c))}</ul>
            <div aria-hidden="true" className="h-3 rounded-full bg-card bg-[image:var(--fuse-card-bg)] shadow-[0_10px_18px_-8px_rgb(0_0_0/0.45)]" />
          </section>
        ))
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{results.map((c) => cover(c, true))}</ul>
      )}
    </div>
  );
}
