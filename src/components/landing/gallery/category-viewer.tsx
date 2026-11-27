"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, m } from "motion/react";
import { useId, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FuseLockup } from "@/components/brand/fuse-lockup";
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
  "inline-flex size-11 items-center justify-center rounded-full border border-[#B3CFE5] text-[#0A1931] transition-colors hover:bg-[#B3CFE5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7]";
const PRIMARY =
  "inline-flex min-h-11 items-center rounded-full bg-[#1A3D63] px-4 text-sm font-semibold text-[#F6FAFD] transition-colors hover:bg-[#0A1931] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6FAFD]";

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
  onSeeAll,
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
  onSeeAll?: () => void;
  slots?: { Title?: React.ElementType; Description?: React.ElementType };
}) {
  const Title = slots?.Title ?? "h2";
  const Description = slots?.Description ?? "p";
  const specId = useId();
  const item = labels.items[category.id] as unknown as Item;
  const pageNames = category.pages.map((p) => item.pages[p.id]);
  const specs = [
    [copy.specPages, pageNames.join(" · "), copy.specFeatures, category.features.map((f) => item.features[f]).join(" · ")],
    [copy.specStack, category.stack.join(" · "), copy.specChecks, fmt(copy.checksCount, { n: category.checks.length })],
    [copy.specStandards, copy.standardsValue, copy.specScanner, copy.scannerValue],
  ];

  return (
    <div>
      <div data-viewer-bar="" className="flex items-center justify-between gap-4 border-b border-[#B3CFE5] pb-4 pr-14">
        <FuseLockup label={appName} className="h-5 w-auto text-[#0A1931]" />
        <p className="hidden text-sm text-[#1A3D63] sm:block">{copy.barTitle}</p>
        <a
          data-viewer-cta="bar"
          href={`/${lang}/projects/new`}
          className={PRIMARY}
        >
          {copy.start}
        </a>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_8.5rem] lg:gap-8">
        <div className="order-1 min-w-0">
          <div data-viewer-preview="" className="relative grid w-full max-w-full place-items-center py-6">
            <span
              data-viewer-circle=""
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 aspect-square w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B3CFE5]"
            />
            <button
              type="button"
              aria-label={copy.nextPage}
              onClick={onNext}
              className="relative block w-[80%] overflow-hidden rounded-[1.25rem] border border-[#B3CFE5] shadow-[0_24px_40px_-20px_rgb(10_25_49/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7]"
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
          </div>
          <p data-viewer-preview-hint="" className="relative z-10 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A3D63]">
            {copy.previewHint}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" aria-label={copy.prevPage} onClick={onPrev} className={ARROW}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <p className="relative z-10 rounded-full bg-[#F6FAFD] px-3 text-sm font-medium text-[#0A1931]">{fmt(copy.pageOf, { n: page + 1, total: 3 })}</p>
            <button type="button" aria-label={copy.nextPage} onClick={onNext} className={ARROW}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-[#1A3D63]">{copy.pageHint}</p>
          <p className="mt-1 text-center text-xs text-[#1A3D63]">{labels.galleryLabel}</p>
        </div>

        <div className="order-2 flex min-w-0 items-center gap-2 lg:order-3 lg:items-start">
          <ul aria-label={copy.thumbsLabel} className="flex min-w-0 flex-1 gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {PAGES.map((i) => (
              <li key={i} className="w-28 shrink-0 lg:w-full">
                <button
                  type="button"
                  data-viewer-thumb=""
                  aria-label={pageNames[i]}
                  aria-current={i === page ? "true" : undefined}
                  onClick={() => onPage(i)}
                  className="block w-full rounded-xl border border-transparent p-2 opacity-70 transition-[opacity,background-color] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7] aria-[current=true]:border-l-[3px] aria-[current=true]:border-l-[#4A7FA7] aria-[current=true]:bg-[#B3CFE5] aria-[current=true]:opacity-100"
                >
                  <span aria-hidden="true" className="block overflow-hidden rounded-lg">
                    <SiteArt category={category} pageIndex={i} labels={labels} className="block h-auto w-full" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-viewer-see-all=""
            onClick={onSeeAll}
            className="min-h-11 min-w-11 shrink-0 rounded-full px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1A3D63] transition-colors hover:bg-[#B3CFE5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7] lg:py-3 lg:[writing-mode:vertical-rl]"
          >
            {copy.seeAllTemplates}
          </button>
        </div>

        <div className="order-3 min-w-0 lg:order-2">
          <Title className="font-wide text-3xl text-[#0A1931] md:text-4xl">{item.name}</Title>
          <p data-viewer-byline="" className="mt-2 text-xs uppercase tracking-wide text-[#1A3D63]">
            {fmt(copy.byline, { name: appName, n: category.pages.length })}
          </p>
          <Description className="mt-4 text-base italic leading-relaxed text-[#1A3D63]">{item.desc}</Description>
          <p className="mt-3 text-sm leading-relaxed text-[#0A1931]">{copy.intro}</p>
          <hr className="mt-5 border-[#B3CFE5]" />
          {/* Below sm every label/value pair stacks full width; from sm it is a 2-pair × 3-row table. */}
          {/* Explicit roles: WebKit drops table semantics once display is changed by max-sm:block. */}
          <table data-viewer-specs="" role="table" className="mt-4 w-full table-fixed text-left max-sm:block sm:table">
            <tbody role="rowgroup" className="max-sm:block">
              {specs.map(([k1, v1, k2, v2], i) => (
                <tr key={k1} role="row" className="align-top max-sm:block">
                  <th scope="row" role="rowheader" id={`${specId}-${i}-a`} className="py-2 pr-2 text-[11px] font-semibold uppercase tracking-wide text-[#1A3D63] max-sm:block max-sm:pb-0">
                    {k1}
                  </th>
                  <td role="cell" headers={`${specId}-${i}-a`} className="py-2 pr-3 text-sm text-[#0A1931] max-sm:block max-sm:pt-0.5">{v1}</td>
                  <th scope="row" role="rowheader" id={`${specId}-${i}-b`} className="py-2 pr-2 text-[11px] font-semibold uppercase tracking-wide text-[#1A3D63] max-sm:block max-sm:pb-0">
                    {k2}
                  </th>
                  <td role="cell" headers={`${specId}-${i}-b`} className="py-2 text-sm text-[#0A1931] max-sm:block max-sm:pt-0.5">{v2}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section data-viewer-review="" className="mt-6 border-t border-[#B3CFE5] pt-5">
            <div className="flex items-center gap-3">
              <span
                data-viewer-avatar=""
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0A1931] text-[#F6FAFD]"
              >
                <FuseLockup markOnly label={appName} className="h-5 w-auto" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0A1931]">{fmt(copy.reviewedBy, { name: appName })}</p>
                <p className="text-xs text-[#1A3D63]">{copy.scannerValue}</p>
              </div>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#0A1931]">{fmt(copy.checksTitle, { name: appName })}</h3>
            <ul className="mt-3 space-y-3">
              {category.checks.map((check) => (
                <li key={check.id} data-viewer-check="" className="text-sm text-[#0A1931]">
                  {item.checks[check.id]}
                  <span className="mt-0.5 block text-xs text-[#1A3D63]">
                    {fmt(copy.checkCodes, { nist: check.nist, iso: check.iso })}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <a
            href={`/${lang}/projects/new`}
            className={`mt-6 ${PRIMARY}`}
          >
            {copy.start}
          </a>
        </div>
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
  const toShelf = useRef(false);
  const onSeeAll = () => {
    toShelf.current = true;
    dispatch({ type: "close" });
  };
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
            onKeyDown={(e) => {
              const a = keyToAction(e.key);
              if (a) {
                e.preventDefault();
                dispatch({ type: a });
              }
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (toShelf.current) {
                toShelf.current = false;
                const h = document.getElementById("rak-title");
                h?.setAttribute("tabindex", "-1");
                h?.focus();
              } else onClosed();
            }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F6FAFD] text-[#0A1931] shadow-[0_30px_80px_-30px_rgb(10_25_49/0.6)] focus:outline-none lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[88vh] lg:w-[min(72rem,94vw)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[2rem]"
          >
            <m.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.32, ease: EASE }}
              className="relative p-5 md:p-8"
            >
              <DialogPrimitive.Close
                aria-label={copy.close}
                className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full text-[#0A1931] transition-colors hover:bg-[#B3CFE5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7FA7]"
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
                onSeeAll={onSeeAll}
                slots={{ Title: DialogPrimitive.Title, Description: DialogPrimitive.Description }}
              />
            </m.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}
