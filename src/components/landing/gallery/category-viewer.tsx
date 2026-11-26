"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, m } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { SiteArt } from "@/components/site-art/site-art";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { SITE_CATEGORIES, type SiteCategory } from "@/lib/site-categories";
import { EASE } from "../motion";
import { keyToAction, type PageIndex, type ViewerAction, type ViewerState } from "./gallery-logic";

type Labels = Dictionary["categories"];
type Copy = Dictionary["landing"]["gallery"];
type Item = { name: string; desc: string; pages: Record<string, string>; features: Record<string, string>; checks: Record<string, string> };

const PAGES = [0, 1, 2] as const;
const slide = {
  enter: (dir: 1 | -1) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: -dir * 40, opacity: 0 }),
};
const ARROW =
  "inline-flex size-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ViewerBody({
  category,
  page,
  dir,
  lang,
  appName,
  labels,
  copy,
  onPage,
  onNext,
  onPrev,
  slots,
}: {
  category: SiteCategory;
  page: PageIndex;
  dir: 1 | -1;
  lang: string;
  appName: string;
  labels: Labels;
  copy: Copy;
  onPage: (p: PageIndex) => void;
  onNext: () => void;
  onPrev: () => void;
  slots?: { Title?: React.ElementType; Description?: React.ElementType };
}) {
  const Title = slots?.Title ?? "h2";
  const Description = slots?.Description ?? "p";
  const item = labels.items[category.id] as unknown as Item;
  const pageNames = category.pages.map((p) => item.pages[p.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_96px] lg:gap-8">
      <div className="order-1">
        <button
          type="button"
          aria-label={copy.nextPage}
          onClick={onNext}
          className="block w-full overflow-hidden rounded-[1.5rem] border border-border shadow-[var(--fuse-shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <m.div
              key={page}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: EASE }}
            >
              <SiteArt category={category} pageIndex={page} labels={labels} className="block h-auto w-full" />
            </m.div>
          </AnimatePresence>
        </button>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button type="button" aria-label={copy.prevPage} onClick={onPrev} className={ARROW}>
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <p className="text-sm font-medium text-foreground">{fmt(copy.pageOf, { n: page + 1, total: 3 })}</p>
          <button type="button" aria-label={copy.nextPage} onClick={onNext} className={ARROW}>
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">{copy.pageHint}</p>
        <p className="mt-1 text-center text-xs text-muted-foreground">{labels.galleryLabel}</p>
      </div>

      <ul aria-label={copy.thumbsLabel} className="order-2 flex gap-3 overflow-x-auto lg:order-3 lg:flex-col lg:overflow-visible">
        {PAGES.map((i) => (
          <li key={i} className="w-28 shrink-0 lg:w-full">
            <button
              type="button"
              data-viewer-thumb=""
              aria-label={pageNames[i]}
              aria-current={i === page ? "true" : undefined}
              onClick={() => onPage(i)}
              className="block w-full overflow-hidden rounded-xl border border-border opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:border-[var(--fuse-accent-text)] aria-[current=true]:opacity-100"
            >
              <span aria-hidden="true">
                <SiteArt category={category} pageIndex={i} labels={labels} className="block h-auto w-full" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="order-3 lg:order-2">
        <Title className="font-wide text-2xl text-foreground md:text-3xl">{item.name}</Title>
        <Description className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</Description>
        <table className="mt-5 w-full text-left text-sm">
          <tbody>
            {[
              [copy.specPages, pageNames.join(" · ")],
              [copy.specFeatures, category.features.map((f) => item.features[f]).join(" · ")],
              [copy.specStack, category.stack.join(" · ")],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-border">
                <th scope="row" className="py-2 pr-3 align-top font-medium text-[var(--fuse-accent-text)]">
                  {k}
                </th>
                <td className="py-2 text-foreground">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section data-viewer-checks="" className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">{fmt(copy.checksTitle, { name: appName })}</h3>
          <ul className="mt-3 space-y-3">
            {category.checks.map((check) => (
              <li key={check.id} data-viewer-check="" className="text-sm text-foreground">
                {item.checks[check.id]}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {fmt(copy.checkCodes, { nist: check.nist, iso: check.iso })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{copy.scanned}</p>
        </section>

        <a className="clay-btn mt-6 inline-flex" href={`/${lang}/projects/new`}>
          {copy.start}
        </a>
      </div>
    </div>
  );
}

export function CategoryViewer({
  state,
  dispatch,
  lang,
  appName,
  labels,
  copy,
  onClosed,
}: {
  state: ViewerState;
  dispatch: React.Dispatch<ViewerAction>;
  lang: string;
  appName: string;
  labels: Labels;
  copy: Copy;
  onClosed: () => void;
}) {
  const category = SITE_CATEGORIES.find((c) => c.id === state.open);
  return (
    <DialogPrimitive.Root
      open={state.open !== null}
      onOpenChange={(o) => {
        if (!o) dispatch({ type: "close" });
      }}
    >
      {category && (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0A1931]/85 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            data-lenis-prevent=""
            onKeyDown={(e) => {
              const a = keyToAction(e.key);
              if (a) {
                e.preventDefault();
                dispatch({ type: a });
              }
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              onClosed();
            }}
            className="fixed inset-0 z-50 overflow-y-auto bg-card bg-[image:var(--fuse-card-bg)] shadow-[var(--fuse-shadow-soft),var(--fuse-sheen)] focus:outline-none lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[88vh] lg:w-[min(72rem,94vw)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[2rem]"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="relative p-5 pt-16 md:p-8 md:pt-16"
            >
              <DialogPrimitive.Close
                aria-label={copy.close}
                className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden="true" className="size-5" />
              </DialogPrimitive.Close>
              <ViewerBody
                category={category}
                page={state.page}
                dir={state.dir}
                lang={lang}
                appName={appName}
                labels={labels}
                copy={copy}
                onPage={(p) => dispatch({ type: "goto", page: p })}
                onNext={() => dispatch({ type: "next" })}
                onPrev={() => dispatch({ type: "prev" })}
                slots={{ Title: DialogPrimitive.Title, Description: DialogPrimitive.Description }}
              />
            </m.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}
