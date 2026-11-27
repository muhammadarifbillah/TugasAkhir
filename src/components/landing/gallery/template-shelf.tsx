"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { CategoryIcon } from "@/components/site-art/category-icon";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { SITE_CATEGORIES, type ShelfId, type SiteCategory } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import { groupByShelf, searchCategories, visibleCategories } from "./gallery-logic";
import { useGallery } from "./gallery-provider";

type Copy = Dictionary["landing"]["shelf"];

const TAB =
  "min-h-11 rounded-full px-4 text-sm sm:px-5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background";

// Steel (#4A7FA7) is left out: small names on steel fail AA (4.1:1), so it stays an accent colour only.
const TONE_ORDER = ["ink", "deep", "mist", "snow"] as const;
const COVER_TONES: Record<(typeof TONE_ORDER)[number], { cover: string; edge: string }> = {
  ink: { cover: "bg-[#0A1931] text-[#F6FAFD]", edge: "bg-[#F6FAFD]" },
  // The dark panel is #1A3D63 too, so a mist ring keeps deep covers apart from it.
  deep: { cover: "bg-[#1A3D63] text-[#F6FAFD] dark:ring-1 dark:ring-[#B3CFE5]", edge: "bg-[#F6FAFD]" },
  mist: { cover: "bg-[#B3CFE5] text-[#0A1931]", edge: "bg-[#F6FAFD]" },
  snow: { cover: "bg-[#F6FAFD] text-[#0A1931] ring-1 ring-[#B3CFE5]", edge: "bg-[#B3CFE5]" },
};

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
    const tone = TONE_ORDER[SITE_CATEGORIES.indexOf(c) % TONE_ORDER.length];
    return (
      <li key={c.id} className={wide ? "" : "shrink-0 snap-start"}>
        <button
          type="button"
          data-shelf-cover=""
          aria-label={fmt(gallery.copy.openPanel, { category: name })}
          onClick={(e) => gallery.open(c.id, e.currentTarget)}
          className="flex w-full flex-col rounded-md text-left transition-transform duration-300 hover:-translate-y-2 hover:-rotate-2 focus-visible:-translate-y-2 focus-visible:-rotate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0 motion-reduce:focus-visible:translate-y-0 motion-reduce:focus-visible:rotate-0"
        >
          <span
            data-book=""
            data-cover-tone={tone}
            className={`relative block aspect-[2/3] rounded-l-sm rounded-r-md shadow-[4px_8px_14px_-6px_rgb(10_25_49/0.6)] ${wide ? "w-full" : "w-24 sm:w-28"}`}
          >
            <span
              className={`absolute inset-y-0 left-0 right-1 flex flex-col items-center gap-1.5 overflow-hidden rounded-l-sm rounded-r-md pb-3 pl-3.5 pr-1.5 pt-3 ${COVER_TONES[tone].cover}`}
            >
              <Image
                src={SITE_TEMPLATES[c.id][0].mobile}
                alt=""
                fill
                sizes="(min-width:640px) 7rem, 6rem"
                draggable={false}
                className="object-cover object-top"
              />
              {/* Ink at 85% under the name: snow text stays about 10.9:1 even over a white screenshot (the test computes it). */}
              <span
                aria-hidden="true"
                data-cover-scrim=""
                className="absolute inset-0 bg-[linear-gradient(180deg,rgb(10_25_49/0.85)_0%,rgb(10_25_49/0.85)_55%,rgb(10_25_49/0)_85%)]"
              />
              <CategoryIcon id={c.id} className="relative size-4 shrink-0 text-[#F6FAFD]" />
              <span data-book-title="" className="relative line-clamp-3 text-center text-[11px] font-semibold leading-tight text-[#F6FAFD]">
                {name}
              </span>
            </span>
            <span data-book-spine="" className="absolute inset-y-0 left-0 w-2.5 rounded-l-sm bg-[linear-gradient(90deg,rgb(10_25_49/0.5),rgb(10_25_49/0.2))]" />
            <span className={`absolute inset-y-1 right-0 w-1 rounded-r-sm ${COVER_TONES[tone].edge}`} />
          </span>
        </button>
      </li>
    );
  };

  return (
    <div
      data-shelf-panel=""
      className="rounded-[2rem] border border-[#B3CFE5] bg-[#F6FAFD] p-4 shadow-[0_24px_60px_-30px_rgb(26_61_99/0.35)] md:p-8 dark:border-transparent dark:bg-[#1A3D63]"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div data-shelf-toolbar="" className="flex min-w-0 flex-1 basis-full items-center sm:basis-auto gap-1 rounded-full border border-border p-1">
          <div role="group" aria-label={copy.tabsLabel} className="flex shrink-0 gap-1">
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
            className="min-h-11 min-w-[10rem] flex-1 border-0 bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {fmt(copy.count, { n: visible.length })}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">{fmt(copy.empty, { q: query.trim() })}</p>
      ) : view === "shelves" ? (
        <div className="mt-8 grid gap-y-10">
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
                <div data-shelf-scroll="" className="overflow-x-auto snap-x pb-5">
                  <div className="w-max min-w-full">
                    <ul className="flex items-end gap-4 px-3 pt-4 md:gap-6">{g.items.map((c) => book(c))}</ul>
                    <div
                      aria-hidden="true"
                      data-shelf-plank=""
                      className="h-3 w-full rounded-sm bg-[#B3CFE5] shadow-[0_14px_20px_-10px_rgb(10_25_49/0.55)] dark:bg-[#F6FAFD]"
                    />
                  </div>
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
