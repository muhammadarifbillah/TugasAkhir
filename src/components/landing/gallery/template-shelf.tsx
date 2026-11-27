"use client";

import { ArrowRight } from "lucide-react";
import { useId, useState } from "react";
import { CategoryIcon } from "@/components/site-art/category-icon";
import { SiteArt } from "@/components/site-art/site-art";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { PALETTE } from "@/lib/palette";
import { SITE_CATEGORIES, type ShelfId, type SiteCategory } from "@/lib/site-categories";
import { groupByShelf, searchCategories, visibleCategories } from "./gallery-logic";
import { useGallery } from "./gallery-provider";

type Copy = Dictionary["landing"]["shelf"];

const TAB =
  "min-h-11 rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background";
const ROW = "flex snap-x items-end gap-5 overflow-x-auto px-2 pt-4";

/** Template shelf: books grouped per shelf (or all in a grid), filtered client-side; each book opens the viewer. */
export function TemplateShelf({ copy }: { copy: Copy }) {
  const gallery = useGallery();
  const [view, setView] = useState<"shelves" | "all">("shelves");
  const [shelf, setShelf] = useState<ShelfId | null>(null);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const results = searchCategories(SITE_CATEGORIES, query, gallery.labels);
  const visible = visibleCategories(results, view, shelf);

  const book = (c: SiteCategory, wide = false) => {
    const name = (gallery.labels.items[c.id] as { name: string }).name;
    return (
      <li key={c.id} className={wide ? "" : "shrink-0 snap-start lg:min-w-0 lg:shrink"}>
        <button
          type="button"
          data-shelf-cover=""
          aria-label={fmt(gallery.copy.openPanel, { category: name })}
          onClick={(e) => gallery.open(c.id, e.currentTarget)}
          className="flex w-full flex-col rounded-md text-left transition-transform duration-300 hover:-translate-y-2 hover:-rotate-2 focus-visible:-translate-y-2 focus-visible:-rotate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0 motion-reduce:focus-visible:translate-y-0 motion-reduce:focus-visible:rotate-0"
        >
          <span
            data-book=""
            className={`relative block aspect-[2/3] rounded-l-sm rounded-r-md shadow-[6px_10px_18px_-6px_rgb(10_25_49/0.55)] ${wide ? "w-full" : "w-[8.5rem] max-w-full sm:w-[12.5rem]"}`}
          >
            <span
              className="absolute inset-y-0 left-0 right-1 flex flex-col items-center gap-3 overflow-hidden rounded-l-sm rounded-r-md bg-card pl-4 pr-2 pt-4"
              style={{ backgroundImage: `linear-gradient(160deg, ${PALETTE[c.tone.hero[0]]}, ${PALETTE[c.tone.hero[1]]})` }}
            >
              <CategoryIcon id={c.id} className="size-6 text-[var(--fuse-snow)]" />
              <span className="flex aspect-square w-full items-center overflow-hidden rounded-sm border-2 border-[var(--fuse-snow)] bg-[var(--fuse-snow)]">
                <SiteArt category={c} pageIndex={0} labels={gallery.labels} className="block h-auto w-[160%] max-w-none -translate-x-[18.75%]" />
              </span>
            </span>
            <span data-book-spine="" className="absolute inset-y-0 left-0 w-2.5 rounded-l-sm bg-[linear-gradient(90deg,rgb(10_25_49/0.5),rgb(10_25_49/0.2))]" />
            <span className="absolute inset-y-1 right-0 w-1 rounded-r-sm bg-[var(--fuse-snow)]" />
          </span>
          <span data-book-title="" className="mt-3 block text-sm font-medium text-foreground">
            {name}
          </span>
          <span className="block text-xs text-muted-foreground">{copy.pagesCount}</span>
        </button>
      </li>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label={copy.tabsLabel} className="flex gap-1 rounded-full border border-border p-1">
          <button
            type="button"
            aria-pressed={view === "shelves"}
            onClick={() => {
              setView("shelves");
              setShelf(null);
            }}
            className={TAB}
          >
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
          {fmt(copy.count, { n: visible.length })}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">{fmt(copy.empty, { q: query.trim() })}</p>
      ) : view === "shelves" ? (
        <div className="mt-10 grid gap-x-10 gap-y-12 lg:grid-cols-2">
          {groupByShelf(results).map((g) => {
            const name = gallery.labels.shelves[g.shelf];
            return (
              <section key={g.shelf} data-shelf="" className="min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="min-w-0 font-wide text-lg">{name}</h3>
                  <button
                    type="button"
                    data-see-all=""
                    aria-label={fmt(copy.seeAllShelf, { shelf: name })}
                    onClick={() => {
                      setView("all");
                      setShelf(g.shelf);
                    }}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium text-[var(--fuse-accent-text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copy.seeAll}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <div className="w-fit max-w-full">
                  <ul className={ROW}>{g.items.map((c) => book(c))}</ul>
                  <div
                    aria-hidden="true"
                    data-shelf-plank=""
                    className="h-3.5 w-full rounded-sm bg-card bg-[image:linear-gradient(180deg,rgb(246_250_253/0.14),transparent)] shadow-[0_16px_22px_-12px_rgb(10_25_49/0.6),inset_0_1px_0_rgb(246_250_253/0.18)]"
                  />
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          {shelf && (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <p className="text-sm text-foreground">{fmt(copy.shelfOnly, { shelf: gallery.labels.shelves[shelf] })}</p>
              <button
                type="button"
                onClick={() => setShelf(null)}
                className="min-h-11 rounded-full border border-border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copy.allShelves}
              </button>
            </div>
          )}
          <ul className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
            {visible.map((c) => book(c, true))}
          </ul>
        </>
      )}
    </div>
  );
}
